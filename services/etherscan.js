const { sleep } = require('../utils/helpers');

// Import DexScreener service (będzie utworzony osobno)
let dexScreenerService;
try {
  dexScreenerService = require('./dexscreener');
} catch (error) {
  console.warn('DexScreener service not available, using fallback mode');
  dexScreenerService = null;
}

const NETWORK_CONFIGS = {
  ethereum: {
    name: 'Ethereum Mainnet',
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  base: {
    name: 'Base Mainnet', 
    apiUrl: 'https://api.basescan.org/api',
    apiKey: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY
  }
};

// Lokalna baza tokenów - rozszerzona
const TOKEN_DATABASE = {
  ethereum: {
    // Stablecoins
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    '0xa0b86a33e6441466f4f0c9bb6eb6a5e40f3df8ab': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    '0x6b175474e89094c44da98b954eedeeac495271d0f': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    '0x4fabb145d64652a948d72533023f6e7a623c7c53': { symbol: 'BUSD', name: 'Binance USD', decimals: 18 },
    
    // Major tokens
    '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': { symbol: 'SHIB', name: 'SHIBA INU', decimals: 18 },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { symbol: 'UNI', name: 'Uniswap', decimals: 18 },
    '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK', name: 'Chainlink', decimals: 18 },
    '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
    
    // DeFi tokens
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': { symbol: 'AAVE', name: 'Aave Token', decimals: 18 },
    '0xc00e94cb662c3520282e6f5717214004a7f26888': { symbol: 'COMP', name: 'Compound', decimals: 18 },
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': { symbol: 'MKR', name: 'Maker', decimals: 18 }
  },
  base: {
    // Base tokens
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    '0x940181a94a35a4569e4529a3cdfb74e38fd98631': { symbol: 'AERO', name: 'Aerodrome Finance', decimals: 18 }
  }
};

class EtherscanService {
  constructor() {
    if (!process.env.ETHERSCAN_API_KEY) {
      throw new Error('ETHERSCAN_API_KEY is required');
    }
    
    // Cache dla token info
    this.tokenInfoCache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
  }

  async makeApiCall(url, operation) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== '1' && data.message === 'NOTOK') {
        throw new Error(data.result || 'API call failed');
      }

      return data;
    } catch (error) {
      console.error(`Etherscan API error (${operation}):`, error);
      throw error;
    }
  }

  async getTokenBalance(walletAddress, tokenAddress, network = 'ethereum') {
    const config = NETWORK_CONFIGS[network];
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const url = `${config.apiUrl}?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${walletAddress}&tag=latest&apikey=${config.apiKey}`;
    
    const data = await this.makeApiCall(url, 'tokenbalance');
    const rawBalance = data.result || '0';
    
    return {
      balance: this.formatTokenBalance(rawBalance),
      hasBalance: parseFloat(rawBalance) > 0,
      rawBalance
    };
  }

  // ==========================================
  // 🎯 NOWA getTokenInfo Z DEXSCREENER INTEGRATION
  // ==========================================
  async getTokenInfo(tokenAddress, network = 'ethereum', includePricing = true) {
    const cacheKey = `${network}-${tokenAddress.toLowerCase()}-${includePricing}`;
    
    // Sprawdź cache
    const cached = this.tokenInfoCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      console.log(`📋 Using cached token info for ${tokenAddress}`);
      return cached.data;
    }

    const config = NETWORK_CONFIGS[network];
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const lowerAddress = tokenAddress.toLowerCase();
    
    console.log(`🔍 Getting token info for ${tokenAddress} on ${config.name}`);
    
    let tokenInfo = null;
    let priceInfo = null;

    // ==========================================
    // KROK 1: 🗄️ Sprawdź lokalną bazę danych
    // ==========================================
    const localDatabase = TOKEN_DATABASE[network] || {};
    
    if (localDatabase[lowerAddress]) {
      console.log(`✅ [1/4] Token found in LOCAL database: ${localDatabase[lowerAddress].symbol}`);
      tokenInfo = {
        address: tokenAddress,
        ...localDatabase[lowerAddress],
        source: 'database',
        network: network,
        networkName: config.name
      };
    } else {
      console.log(`❌ [1/4] Token NOT found in local database`);
      
      // ==========================================
      // KROK 2: 🎯 Spróbuj DexScreener API
      // ==========================================
      if (dexScreenerService) {
        try {
          console.log(`🎯 [2/4] Trying DexScreener API...`);
          
          const dexData = await dexScreenerService.getTokenInfo(tokenAddress, network);
          
          if (dexData && dexData.symbol && !dexData.error) {
            console.log(`✅ [2/4] Token info from DexScreener: ${dexData.symbol} - ${dexData.name}`);
            
            tokenInfo = {
              address: tokenAddress,
              symbol: dexData.symbol,
              name: dexData.name,
              decimals: 18, // DexScreener nie zwraca decimals, użyj default
              source: 'dexscreener',
              network: network,
              networkName: config.name
            };

            // Mamy już ceny z DexScreener
            if (includePricing) {
              priceInfo = {
                priceUsd: dexData.priceUsd,
                priceChange24h: dexData.priceChange24h,
                volume24h: dexData.volume24h,
                dexId: dexData.dexId,
                pairAddress: dexData.pairAddress,
                priceSource: 'dexscreener'
              };
            }
          } else {
            console.log(`❌ [2/4] DexScreener failed: ${dexData?.error || 'No data'}`);
            throw new Error(dexData?.error || 'No DexScreener data');
          }
        } catch (dexError) {
          console.log(`❌ [2/4] DexScreener API failed: ${dexError.message}`);
          
          // ==========================================
          // KROK 3: 🔗 Spróbuj blockchain contract calls
          // ==========================================
          try {
            console.log(`🔗 [3/4] Trying blockchain contract calls...`);
            
            const [name, symbol, decimals] = await Promise.allSettled([
              this.getTokenName(tokenAddress, network),
              this.getTokenSymbol(tokenAddress, network),
              this.getTokenDecimals(tokenAddress, network)
            ]);
            
            const tokenName = name.status === 'fulfilled' ? name.value : null;
            const tokenSymbol = symbol.status === 'fulfilled' ? symbol.value : null;
            const tokenDecimals = decimals.status === 'fulfilled' ? decimals.value : 18;
            
            console.log(`📊 [3/4] Blockchain results:`, {
              name: tokenName || 'FAILED',
              symbol: tokenSymbol || 'FAILED', 
              decimals: tokenDecimals
            });
            
            if (tokenSymbol || tokenName) {
              console.log(`✅ [3/4] Token info from blockchain: ${tokenSymbol}`);
              
              tokenInfo = {
                address: tokenAddress,
                symbol: tokenSymbol || `TOKEN_${tokenAddress.substring(2, 8).toUpperCase()}`,
                name: tokenName || `Token: ${tokenAddress.substring(0, 10)}...${tokenAddress.slice(-4)}`,
                decimals: tokenDecimals,
                source: 'blockchain',
                network: network,
                networkName: config.name
              };
            } else {
              throw new Error('No blockchain data available');
            }
          } catch (blockchainError) {
            console.log(`❌ [3/4] Blockchain calls failed: ${blockchainError.message}`);
            
            // ==========================================
            // KROK 4: 📄 Fallback do podstawowych info
            // ==========================================
            console.log(`⚠️ [4/4] Using fallback token info`);
            
            tokenInfo = {
              address: tokenAddress,
              symbol: `UNKNOWN_${tokenAddress.substring(2, 8).toUpperCase()}`,
              name: `Unknown Token (${tokenAddress.substring(0, 10)}...${tokenAddress.slice(-4)})`,
              decimals: 18,
              source: 'fallback',
              network: network,
              networkName: config.name,
              error: `All sources failed: DexScreener(${dexError.message}), Blockchain(${blockchainError.message})`
            };
          }
        }
      } else {
        // Jeśli brak DexScreener, od razu idź do blockchain calls
        console.log(`⚠️ [2/4] DexScreener service not available, trying blockchain...`);
        
        try {
          const [name, symbol, decimals] = await Promise.allSettled([
            this.getTokenName(tokenAddress, network),
            this.getTokenSymbol(tokenAddress, network),
            this.getTokenDecimals(tokenAddress, network)
          ]);
          
          const tokenName = name.status === 'fulfilled' ? name.value : null;
          const tokenSymbol = symbol.status === 'fulfilled' ? symbol.value : null;
          const tokenDecimals = decimals.status === 'fulfilled' ? decimals.value : 18;
          
          if (tokenSymbol || tokenName) {
            tokenInfo = {
              address: tokenAddress,
              symbol: tokenSymbol || 'UNKNOWN',
              name: tokenName || `Token ${tokenAddress.substring(0, 6)}...`,
              decimals: tokenDecimals,
              source: 'blockchain',
              network: network,
              networkName: config.name
            };
          } else {
            throw new Error('No blockchain data available');
          }
        } catch (error) {
          tokenInfo = {
            address: tokenAddress,
            symbol: 'UNKNOWN',
            name: `Token ${tokenAddress.substring(0, 6)}...`,
            decimals: 18,
            source: 'fallback',
            network: network,
            networkName: config.name
          };
        }
      }
    }

    // ==========================================
    // KROK 5: 💰 Dodaj pricing jeśli nie mamy z DexScreener
    // ==========================================
    if (includePricing && !priceInfo && dexScreenerService) {
      console.log(`💰 Getting pricing info separately...`);
      try {
        const separatePriceData = await dexScreenerService.getTokenPrice(tokenAddress, network);
        
        if (separatePriceData && !separatePriceData.error) {
          priceInfo = {
            priceUsd: separatePriceData.priceUsd,
            priceChange24h: separatePriceData.priceChange24h,
            volume24h: separatePriceData.volume24h,
            dexId: separatePriceData.dexId,
            pairAddress: separatePriceData.pairAddress,
            priceSource: 'dexscreener'
          };
          console.log(`✅ Price info added: $${separatePriceData.priceUsd}`);
        } else {
          console.log(`❌ No separate price data available`);
        }
      } catch (priceError) {
        console.error(`❌ Separate price fetch failed:`, priceError);
      }
    }

    // Combine token info with price info
    const finalTokenInfo = {
      ...tokenInfo,
      ...(priceInfo || {
        priceUsd: null,
        priceChange24h: null,
        priceSource: null,
        priceError: 'Price data unavailable'
      })
    };

    // Cache result
    this.tokenInfoCache.set(cacheKey, {
      data: finalTokenInfo,
      timestamp: Date.now()
    });

    console.log(`🎉 Final token info for ${tokenAddress}:`, {
      symbol: finalTokenInfo.symbol,
      name: finalTokenInfo.name,
      source: finalTokenInfo.source,
      hasPrice: finalTokenInfo.priceUsd !== null,
      priceSource: finalTokenInfo.priceSource
    });

    return finalTokenInfo;
  }

  // ==========================================
  // HELPER METHODS FOR BLOCKCHAIN CALLS
  // ==========================================
  async getTokenName(tokenAddress, network = 'ethereum') {
    const config = NETWORK_CONFIGS[network];
    try {
      const nameUrl = `${config.apiUrl}?module=proxy&action=eth_call&to=${tokenAddress}&data=0x06fdde03&tag=latest&apikey=${config.apiKey}`;
      const nameData = await this.makeApiCall(nameUrl, 'token-name');
      return this.hexToString(nameData.result);
    } catch (error) {
      console.error(`Failed to get token name for ${tokenAddress}:`, error);
      return null;
    }
  }

  async getTokenSymbol(tokenAddress, network = 'ethereum') {
    const config = NETWORK_CONFIGS[network];
    try {
      const symbolUrl = `${config.apiUrl}?module=proxy&action=eth_call&to=${tokenAddress}&data=0x95d89b41&tag=latest&apikey=${config.apiKey}`;
      const symbolData = await this.makeApiCall(symbolUrl, 'token-symbol');
      return this.hexToString(symbolData.result);
    } catch (error) {
      console.error(`Failed to get token symbol for ${tokenAddress}:`, error);
      return null;
    }
  }

  async getTokenDecimals(tokenAddress, network = 'ethereum') {
    const config = NETWORK_CONFIGS[network];
    try {
      const decimalsUrl = `${config.apiUrl}?module=proxy&action=eth_call&to=${tokenAddress}&data=0x313ce567&tag=latest&apikey=${config.apiKey}`;
      const decimalsData = await this.makeApiCall(decimalsUrl, 'token-decimals');
      return parseInt(decimalsData.result, 16) || 18;
    } catch (error) {
      console.error(`Failed to get token decimals for ${tokenAddress}:`, error);
      return 18;
    }
  }

  // ==========================================
  // EXISTING HELPER METHODS (UNCHANGED)
  // ==========================================
  formatTokenBalance(rawBalance, decimals = 18) {
    const balance = parseFloat(rawBalance) / Math.pow(10, decimals);
    
    if (balance === 0) return '0';
    if (balance < 0.000001) return balance.toExponential(3);
    if (balance < 1) return balance.toFixed(6);
    return balance.toFixed(4);
  }

  hexToString(hex) {
    if (!hex || hex === '0x') return '';
    
    try {
      // Remove 0x prefix
      hex = hex.startsWith('0x') ? hex.slice(2) : hex;
      
      // Skip first 64 chars (offset), next 64 chars contain length
      if (hex.length >= 128) {
        const lengthHex = hex.substring(64, 128);
        const length = parseInt(lengthHex, 16) * 2;
        hex = hex.substring(128, 128 + length);
      }
      
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16);
        if (charCode >= 32 && charCode <= 126) {
          str += String.fromCharCode(charCode);
        }
      }
      
      return str.trim();
    } catch (error) {
      return '';
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================
  clearCache() {
    this.tokenInfoCache.clear();
    console.log('🗑️ Token info cache cleared');
  }

  getCacheStats() {
    return {
      size: this.tokenInfoCache.size,
      entries: Array.from(this.tokenInfoCache.keys())
    };
  }

  // Debug method - sprawdź dlaczego token ma unknown name
  async debugTokenInfo(tokenAddress, network = 'ethereum') {
    console.log(`🔍 DEBUGGING TOKEN INFO FOR: ${tokenAddress}`);
    console.log(`🌐 Network: ${network}`);
    
    const config = NETWORK_CONFIGS[network];
    console.log(`📡 API URL: ${config.apiUrl}`);
    console.log(`🔑 API Key: ${config.apiKey ? 'SET' : 'MISSING'}`);
    
    const results = {};
    
    // Test 1: Check local database
    const localDatabase = TOKEN_DATABASE[network] || {};
    const localToken = localDatabase[tokenAddress.toLowerCase()];
    
    if (localToken) {
      console.log(`✅ Found in local database:`, localToken);
      results.database = localToken;
    } else {
      console.log(`❌ NOT found in local database`);
      results.database = null;
    }
    
    // Test 2: Test DexScreener
    if (dexScreenerService) {
      try {
        console.log(`🎯 Testing DexScreener...`);
        const dexData = await dexScreenerService.getTokenInfo(tokenAddress, network);
        results.dexscreener = dexData;
        console.log(`DexScreener result:`, dexData);
      } catch (error) {
        console.log(`❌ DexScreener failed:`, error);
        results.dexscreener = { error: error.message };
      }
    } else {
      console.log(`⚠️ DexScreener service not available`);
      results.dexscreener = { error: 'Service not available' };
    }
    
    // Test 3: Test blockchain calls
    try {
      console.log(`🔗 Testing blockchain calls...`);
      
      const [name, symbol, decimals] = await Promise.allSettled([
        this.getTokenName(tokenAddress, network),
        this.getTokenSymbol(tokenAddress, network),
        this.getTokenDecimals(tokenAddress, network)
      ]);
      
      results.blockchain = {
        name: name.status === 'fulfilled' ? name.value : name.reason,
        symbol: symbol.status === 'fulfilled' ? symbol.value : symbol.reason,
        decimals: decimals.status === 'fulfilled' ? decimals.value : decimals.reason
      };
      
      console.log('📊 Blockchain results:', results.blockchain);
    } catch (error) {
      console.log('❌ Blockchain calls failed:', error);
      results.blockchain = { error: error.message };
    }
    
    return results;
  }
}

module.exports = new EtherscanService();
