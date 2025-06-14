class DexScreenerService {
  constructor() {
    this.baseUrl = 'https://api.dexscreener.com/latest';
  }

  async makeApiCall(url, operation) {
    try {
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
      return data;
    } catch (error) {
      console.error(`DexScreener API error (${operation}):`, error);
      throw error;
    }
  }

  async getTokenPrice(tokenAddress, network = 'ethereum') {
    try {
      const url = `${this.baseUrl}/dex/tokens/${tokenAddress}`;
      const data = await this.makeApiCall(url, 'token-price');

      if (!data.pairs || data.pairs.length === 0) {
        return {
          address: tokenAddress,
          priceUsd: null,
          priceChange24h: null,
          error: 'No trading pairs found'
        };
      }

      // Filter pairs by network and get the most liquid one
      const networkPairs = data.pairs.filter(pair => {
        if (network === 'ethereum') return pair.chainId === 'ethereum';
        if (network === 'base') return pair.chainId === 'base';
        return true;
      });

      if (networkPairs.length === 0) {
        return {
          address: tokenAddress,
          priceUsd: null,
          priceChange24h: null,
          error: `No pairs found for ${network}`
        };
      }

      // Get highest volume pair
      const bestPair = networkPairs.reduce((best, current) => {
        const currentVolume = parseFloat(current.volume?.h24 || 0);
        const bestVolume = parseFloat(best.volume?.h24 || 0);
        return currentVolume > bestVolume ? current : best;
      });

      return {
        address: tokenAddress,
        priceUsd: parseFloat(bestPair.priceUsd) || null,
        priceChange24h: parseFloat(bestPair.priceChange?.h24) || null,
        volume24h: parseFloat(bestPair.volume?.h24) || null,
        dexId: bestPair.dexId,
        pairAddress: bestPair.pairAddress
      };

    } catch (error) {
      console.error(`Failed to get price for ${tokenAddress}:`, error);
      return {
        address: tokenAddress,
        priceUsd: null,
        priceChange24h: null,
        error: error.message
      };
    }
  }

  formatUsdValue(value) {
    if (!value || value === 0) return '$0.00';
    
    if (value < 0.01) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${(value / 1000000).toFixed(2)}M`;
  }
}

module.exports = new DexScreenerService();
