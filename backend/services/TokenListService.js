const axios = require('axios');
const NodeCache = require('node-cache');
const { SUPPORTED_NETWORKS } = require('../config/networks');

class TokenListService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
    this.priceCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache for prices
  }

  async fetchTokenList(chainId) {
    const cacheKey = `tokenList_${chainId}`;
    let tokens = this.cache.get(cacheKey);

    if (!tokens) {
      tokens = await this.fetchFromAPI(chainId);
      this.cache.set(cacheKey, tokens);
    }

    return tokens;
  }

  async fetchNFTList(chainId) {
    const cacheKey = `nftList_${chainId}`;
    let nfts = this.cache.get(cacheKey);

    if (!nfts) {
      nfts = await this.fetchNFTsFromAPI(chainId);
      this.cache.set(cacheKey, nfts);
    }

    return nfts;
  }

  async fetchFromAPI(chainId) {
    const network = SUPPORTED_NETWORKS.find(n => n.chainId === chainId);
    if (!network) throw new Error('Unsupported network');

    try {
      // Using 1inch API as example
      const response = await axios.get(`https://api.1inch.io/v4.0/${chainId}/tokens`);
      return Object.values(response.data.tokens).map(token => ({
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        name: token.name
      }));
    } catch (error) {
      console.error(`Error fetching token list for chain ${chainId}:`, error);
      return [];
    }
  }

  async fetchNFTsFromAPI(chainId) {
    const network = SUPPORTED_NETWORKS.find(n => n.chainId === chainId);
    if (!network) throw new Error('Unsupported network');

    try {
      // Using Moralis API as example
      const response = await axios.get(
        `https://deep-index.moralis.io/api/v2/nft/collections`,
        {
          params: { chain: network.name.toLowerCase() },
          headers: { 'X-API-Key': process.env.MORALIS_API_KEY }
        }
      );

      return response.data.result.map(nft => ({
        address: nft.token_address,
        name: nft.name,
        symbol: nft.symbol
      }));
    } catch (error) {
      console.error(`Error fetching NFT list for chain ${chainId}:`, error);
      return [];
    }
  }

  async getPrices(tokens, chainId) {
    const prices = {};
    const uncachedTokens = [];

    // Check cache first
    for (const token of tokens) {
      const cacheKey = `price_${chainId}_${token.address}`;
      const cachedPrice = this.priceCache.get(cacheKey);
      
      if (cachedPrice) {
        prices[token.address] = cachedPrice;
      } else {
        uncachedTokens.push(token);
      }
    }

    if (uncachedTokens.length > 0) {
      try {
        // Using CoinGecko API as example
        const addresses = uncachedTokens.map(t => t.address).join(',');
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/token_price/${chainId}`,
          {
            params: {
              contract_addresses: addresses,
              vs_currencies: 'usd'
            }
          }
        );

        // Cache new prices
        for (const [address, priceData] of Object.entries(response.data)) {
          const price = priceData.usd;
          prices[address] = price;
          this.priceCache.set(`price_${chainId}_${address}`, price);
        }
      } catch (error) {
        console.error(`Error fetching prices for chain ${chainId}:`, error);
      }
    }

    return prices;
  }
}

module.exports = new TokenListService(); 