class DexScreenerService {
  constructor() {
    this.baseUrl = 'https://api.dexscreener.com/latest';
    this.tokenInfoCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  }

  async makeApiCall(url, operation) {
    try {
      console.log(`🎯 DexScreener API call: ${operation}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WalletAnalyzer/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ DexScreener API success: ${operation}`);
      return data;
    } catch (error) {
      console.error(`❌ DexScreener API error (${operation}):`, error);
      throw error;
    }
  }

  // NOWA FUNKCJA: Pobierz informacje o tokenie (nazwa + cena)
  async getTokenInfo(tokenAddress, network = 'ethereum') {
    const cacheKey = `${network}-${tokenAddress.toLowerCase()}`;
    
    // Sprawdź cache
    const cached = this.tokenInfoCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      console.log(`📋 Using cached DexScreener data for ${tokenAddress}`);
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/dex/tokens/${tokenAddress}`;
      const data = await this.makeApiCall(url, `token-info-${tokenAddress.substring(0, 8)}`);

      if (!data.pairs || data.pairs.length === 0) {
        console.log(`❌ No DexScreener data for ${tokenAddress} on ${network}`);
        return {
          address: tokenAddress,
          symbol: null,
          name: null,
          priceUsd: null,
          priceChange24h: null,
          source: 'dexscreener',
          error: 'No trading pairs found'
        };
      }

      // Filtruj pary dla odpowiedniej sieci
      const networkPairs = data.pairs.filter(pair => {
        if (network === 'ethereum') return pair.chainId === 'ethereum';
        if (network === 'base') return pair.chainId === 'base';
        return true;
      });

      if (networkPairs.length === 0) {
        console.log(`❌ No ${network} pairs found for ${tokenAddress}`);
        return {
          address: tokenAddress,
          symbol: null,
          name: null,
          priceUsd: null,
          priceChange24h: null,
          source: 'dexscreener',
          error: `No pairs found for ${network}`
        };
      }

      // Znajdź najlepszą parę (najwięcej volume)
      const bestPair = networkPairs.reduce((best, current) => {
        const currentVolume = parseFloat(current.volume?.h24 || 0);
        const bestVolume = parseFloat(best.volume?.h24 || 0);
        return currentVolume > bestVolume ? current : best;
      });

      // Znajdź nasz token w parze (base lub quote)
      let tokenInfo = null;
      
      if (bestPair.baseToken.address.toLowerCase() === tokenAddress.toLowerCase()) {
        tokenInfo = bestPair.baseToken;
      } else if (bestPair.quoteToken.address.toLowerCase() === tokenAddress.toLowerCase()) {
        tokenInfo = bestPair.quoteToken;
      } else {
        // Spróbuj pierwszy dostępny
        tokenInfo = bestPair.baseToken;
      }

      const result = {
        address: tokenAddress,
        symbol: tokenInfo.symbol || null,
        name: tokenInfo.name || null,
        priceUsd: parseFloat(bestPair.priceUsd) || null,
        priceChange24h: parseFloat(bestPair.priceChange?.h24) || null,
        volume24h: parseFloat(bestPair.volume?.h24) || null,
        dexId: bestPair.dexId,
        pairAddress: bestPair.pairAddress,
        source: 'dexscreener',
        network: network
      };

      // Cache result
      this.tokenInfoCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`✅ DexScreener token info retrieved:`, {
        symbol: result.symbol,
        name: result.name,
        price: result.priceUsd,
        source: result.source
      });

      return result;

    } catch (error) {
      console.error(`❌ Failed to get DexScreener token info for ${tokenAddress}:`, error);
      return {
        address: tokenAddress,
        symbol: null,
        name: null,
        priceUsd: null,
        priceChange24h: null,
        source: 'dexscreener',
        error: error.message
      };
    }
  }

  // STARA FUNKCJA: Tylko cena (zachowana dla kompatybilności)
  async getTokenPrice(tokenAddress, network = 'ethereum') {
    const tokenInfo = await this.getTokenInfo(tokenAddress, network);
    
    return {
      address: tokenAddress,
      priceUsd: tokenInfo.priceUsd,
      priceChange24h: tokenInfo.priceChange24h,
      volume24h: tokenInfo.volume24h,
      dexId: tokenInfo.dexId,
      pairAddress: tokenInfo.pairAddress,
      source: tokenInfo.source,
      error: tokenInfo.error
    };
  }

  // NOWA FUNKCJA: Pobierz info o wielu tokenach jednocześnie
  async getMultipleTokenInfo(tokenAddresses, network = 'ethereum') {
    console.log(`🎯 Fetching DexScreener info for ${tokenAddresses.length} tokens on ${network}`);
    
    const results = [];
    
    // Przetwarzaj sekwencyjnie żeby uniknąć rate limitów
    for (let i = 0; i < tokenAddresses.length; i++) {
      const tokenAddress = tokenAddresses[i];
      
      try {
        const tokenInfo = await this.getTokenInfo(tokenAddress, network);
        results.push(tokenInfo);
        
        console.log(`✅ DexScreener ${i + 1}/${tokenAddresses.length}: ${tokenInfo.symbol || 'Unknown'}`);
        
        // Rate limiting między calls
        if (i < tokenAddresses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
        
      } catch (error) {
        console.error(`❌ DexScreener failed for ${tokenAddress}:`, error);
        results.push({
          address: tokenAddress,
          symbol: null,
          name: null,
          priceUsd: null,
          source: 'dexscreener',
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Utility functions (zachowane)
  calculateUsdValue(balance, priceUsd) {
    if (!balance || !priceUsd || priceUsd === 0) return 0;
    
    try {
      const balanceFloat = parseFloat(balance.toString().replace(/,/g, ''));
      const priceFloat = parseFloat(priceUsd);
      
      if (isNaN(balanceFloat) || isNaN(priceFloat)) {
        return 0;
      }
      
      const usdValue = balanceFloat * priceFloat;
      return !isFinite(usdValue) || usdValue < 0 ? 0 : usdValue;
    } catch (error) {
      console.error(`Error calculating USD value:`, error);
      return 0;
    }
  }

  formatUsdValue(usdValue) {
    if (!usdValue || usdValue === 0 || !isFinite(usdValue)) return '$0.00';
    
    try {
      const value = Math.abs(usdValue);
      
      if (value < 0.000001) return '$0.00';
      if (value < 0.01) return `$${value.toFixed(6)}`;
      if (value < 1) return `$${value.toFixed(4)}`;
      if (value < 1000) return `$${value.toFixed(2)}`;
      if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
      if (value < 1000000000) return `$${(value / 1000000).toFixed(2)}M`;
      return `$${(value / 1000000000).toFixed(2)}B`;
    } catch (error) {
      console.error(`Error formatting USD value:`, error);
      return '$0.00';
    }
  }

  // Clear cache method
  clearCache() {
    this.tokenInfoCache.clear();
    console.log('🗑️ DexScreener cache cleared');
  }
}

module.exports = new DexScreenerService();
