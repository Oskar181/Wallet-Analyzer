const { sleep } = require('../utils/helpers');

const NETWORK_CONFIGS = {
  ethereum: {
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  base: {
    apiUrl: 'https://api.basescan.org/api',
    apiKey: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY
  }
};

class EtherscanService {
  constructor() {
    if (!process.env.ETHERSCAN_API_KEY) {
      throw new Error('ETHERSCAN_API_KEY is required');
    }
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

  async getTokenInfo(tokenAddress, network = 'ethereum') {
    const config = NETWORK_CONFIGS[network];
    
    try {
      // Get token name
      const nameUrl = `${config.apiUrl}?module=proxy&action=eth_call&to=${tokenAddress}&data=0x06fdde03&tag=latest&apikey=${config.apiKey}`;
      const nameData = await this.makeApiCall(nameUrl, 'token-name');
      
      // Get token symbol  
      const symbolUrl = `${config.apiUrl}?module=proxy&action=eth_call&to=${tokenAddress}&data=0x95d89b41&tag=latest&apikey=${config.apiKey}`;
      const symbolData = await this.makeApiCall(symbolUrl, 'token-symbol');
      
      // Get token decimals
      const decimalsUrl = `${config.apiUrl}?module=proxy&action=eth_call&to=${tokenAddress}&data=0x313ce567&tag=latest&apikey=${config.apiKey}`;
      const decimalsData = await this.makeApiCall(decimalsUrl, 'token-decimals');

      return {
        address: tokenAddress,
        name: this.hexToString(nameData.result) || `Token ${tokenAddress.substring(0, 6)}...`,
        symbol: this.hexToString(symbolData.result) || 'UNKNOWN',
        decimals: parseInt(decimalsData.result, 16) || 18
      };

    } catch (error) {
      console.error(`Failed to get token info for ${tokenAddress}:`, error);
      return {
        address: tokenAddress,
        name: `Token ${tokenAddress.substring(0, 6)}...`,
        symbol: 'UNKNOWN',
        decimals: 18
      };
    }
  }

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
}

module.exports = new EtherscanService();
