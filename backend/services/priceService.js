const axios = require('axios');
const NodeCache = require('node-cache');

class PriceService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
  }

  async getTokenPrice(tokenAddress, chainId) {
    const cacheKey = `price_${chainId}_${tokenAddress}`;
    let price = this.cache.get(cacheKey);

    if (!price) {
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/token_price/${chainId}`,
          {
            params: {
              contract_addresses: tokenAddress,
              vs_currencies: 'usd'
            }
          }
        );
        price = response.data[tokenAddress.toLowerCase()]?.usd || 0;
        this.cache.set(cacheKey, price);
      } catch {
        price = 0;
      }
    }

    return price;
  }
}

module.exports = new PriceService();