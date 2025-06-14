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

    // Perform analysis with new etherscan service
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

// GET /api/debug/token/:address - Debug endpoint for token info
router.get('/debug/token/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { network = 'ethereum' } = req.query;
    
    console.log(`🔍 Debug request for token: ${address} on ${network}`);
    
    const debugInfo = await etherscanService.debugTokenInfo(address, network);
    
    res.json({
      success: true,
      tokenAddress: address,
      network: network,
      debugInfo: debugInfo
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      error: 'Debug failed', 
      message: error.message 
    });
  }
});

// Core analysis function - UPDATED FOR NEW ETHERSCAN SERVICE
async function analyzeWallets(wallets, tokens, network) {
  const results = {
    allTokens: [],
    someTokens: [],
    noTokens: []
  };

  console.log(`🔍 Starting analysis: ${wallets.length} wallets × ${tokens.length} tokens on ${network}`);

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    
    try {
      console.log(`📁 [${i + 1}/${wallets.length}] Analyzing wallet: ${wallet}`);
      const walletTokens = [];
      
      // Check each token in this wallet
      for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j];
        
        try {
          console.log(`  🪙 [${j + 1}/${tokens.length}] Checking token: ${token}`);
          
          // Get token balance
          const balance = await etherscanService.getTokenBalance(wallet, token, network);
          
          if (balance.hasBalance) {
            console.log(`  ✅ Token found! Balance: ${balance.balance}`);
            
            // NOWA WERSJA: Użyj nowej metody getTokenInfo z pricing
            const tokenInfo = await etherscanService.getTokenInfo(token, network, true);
            
            // Calculate USD value using proper decimals
            const rawBalance = parseFloat(balance.rawBalance);
            const decimals = tokenInfo.decimals || 18;
            const formattedBalance = rawBalance / Math.pow(10, decimals);
            const usdValue = tokenInfo.priceUsd ? (formattedBalance * tokenInfo.priceUsd) : null;
            
            console.log(`  💰 Token info: ${tokenInfo.symbol} (${tokenInfo.source}) - Price: $${tokenInfo.priceUsd}`);
            
            walletTokens.push({
              address: token,
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              balance: balance.balance,
              decimals: tokenInfo.decimals,
              priceUsd: tokenInfo.priceUsd,
              priceChange24h: tokenInfo.priceChange24h,
              usdValue: usdValue,
              dataSource: tokenInfo.source,
              priceSource: tokenInfo.priceSource || null
            });
          } else {
            console.log(`  ❌ Token not found in wallet`);
          }

          // Rate limiting between token checks
          await sleep(300);
          
        } catch (tokenError) {
          console.error(`  ❌ Error checking token ${token} for wallet ${wallet}:`, tokenError);
          // Continue with next token instead of failing entire wallet
        }
      }

      // Categorize wallet based on found tokens
      const walletResult = {
        walletAddress: wallet,
        foundTokens: walletTokens,
        totalUsdValue: walletTokens.reduce((sum, token) => sum + (token.usdValue || 0), 0)
      };

      console.log(`📊 Wallet ${wallet}: Found ${walletTokens.length}/${tokens.length} tokens, Total value: $${walletResult.totalUsdValue.toFixed(2)}`);

      if (walletTokens.length === 0) {
        results.noTokens.push(walletResult);
      } else if (walletTokens.length === tokens.length) {
        results.allTokens.push(walletResult);
      } else {
        results.someTokens.push(walletResult);
      }

      // Rate limiting between wallets
      if (i < wallets.length - 1) {
        await sleep(1000); // 1 second between wallets
      }

    } catch (walletError) {
      console.error(`❌ Error analyzing wallet ${wallet}:`, walletError);
      results.noTokens.push({
        walletAddress: wallet,
        foundTokens: [],
        totalUsdValue: 0,
        error: walletError.message
      });
    }
  }

  console.log(`🎉 Analysis complete! Results: ${results.allTokens.length} perfect, ${results.someTokens.length} partial, ${results.noTokens.length} empty`);
  
  return results;
}

module.exports = router;
