const express = require('express');
const router = express.Router();
const etherscanService = require('../services/etherscan');
const dexscreenerService = require('../services/dexscreener');
const { validateAddresses, sleep } = require('../utils/helpers');

// POST /api/analyze - Main analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    const { wallets, tokens, network = 'ethereum' } = req.body;

    // Validation
    if (!wallets || !tokens || !Array.isArray(wallets) || !Array.isArray(tokens)) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        message: 'Wallets and tokens must be arrays' 
      });
    }

    if (wallets.length > 50 || tokens.length > 20) {
      return res.status(400).json({ 
        error: 'Too many addresses', 
        message: 'Max 50 wallets and 20 tokens allowed' 
      });
    }

    // Validate addresses
    const walletValidation = validateAddresses(wallets);
    const tokenValidation = validateAddresses(tokens);

    if (walletValidation.invalid.length > 0 || tokenValidation.invalid.length > 0) {
      return res.status(400).json({
        error: 'Invalid addresses found',
        invalidWallets: walletValidation.invalid,
        invalidTokens: tokenValidation.invalid
      });
    }

    // Perform analysis
    const results = await analyzeWallets(walletValidation.valid, tokenValidation.valid, network);

    res.json({
      success: true,
      network,
      analysis: {
        walletCount: walletValidation.valid.length,
        tokenCount: tokenValidation.valid.length
      },
      results
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
});

// POST /api/validate - Address validation
router.post('/validate', (req, res) => {
  try {
    const { addresses } = req.body;
    
    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        message: 'Addresses must be an array' 
      });
    }

    const validation = validateAddresses(addresses);
    
    res.json({
      success: true,
      valid: validation.valid,
      invalid: validation.invalid,
      summary: {
        total: addresses.length,
        validCount: validation.valid.length,
        invalidCount: validation.invalid.length
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ 
      error: 'Validation failed', 
      message: error.message 
    });
  }
});

// Core analysis function
async function analyzeWallets(wallets, tokens, network) {
  const results = {
    allTokens: [],
    someTokens: [],
    noTokens: []
  };

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    
    try {
      const walletTokens = [];
      
      // Check each token in this wallet
      for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j];
        
        try {
          const balance = await etherscanService.getTokenBalance(wallet, token, network);
          
          if (balance.hasBalance) {
            // Get token info with pricing
            const tokenInfo = await Promise.all([
              etherscanService.getTokenInfo(token, network),
              dexscreenerService.getTokenPrice(token, network)
            ]);

            const [basicInfo, priceInfo] = tokenInfo;
            
            walletTokens.push({
              address: token,
              symbol: basicInfo.symbol,
              name: basicInfo.name,
              balance: balance.balance,
              decimals: basicInfo.decimals,
              priceUsd: priceInfo.priceUsd,
              priceChange24h: priceInfo.priceChange24h,
              usdValue: priceInfo.priceUsd ? (parseFloat(balance.balance) * priceInfo.priceUsd) : null
            });
          }

          // Rate limiting
          await sleep(200);
          
        } catch (tokenError) {
          console.error(`Error checking token ${token} for wallet ${wallet}:`, tokenError);
        }
      }

      // Categorize wallet
      const walletResult = {
        walletAddress: wallet,
        foundTokens: walletTokens,
        totalUsdValue: walletTokens.reduce((sum, token) => sum + (token.usdValue || 0), 0)
      };

      if (walletTokens.length === 0) {
        results.noTokens.push(walletResult);
      } else if (walletTokens.length === tokens.length) {
        results.allTokens.push(walletResult);
      } else {
        results.someTokens.push(walletResult);
      }

      // Rate limiting between wallets
      if (i < wallets.length - 1) {
        await sleep(500);
      }

    } catch (walletError) {
      console.error(`Error analyzing wallet ${wallet}:`, walletError);
      results.noTokens.push({
        walletAddress: wallet,
        foundTokens: [],
        error: walletError.message
      });
    }
  }

  return results;
}

module.exports = router;
