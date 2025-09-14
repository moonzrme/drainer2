const ethers = require('ethers');
const ERC20_ABI = require('../config/abis/erc20.json');
const ERC721_ABI = require('../config/abis/erc721.json');
const { SUPPORTED_NETWORKS } = require('../config/networks');
const TokenListService = require('./tokenListService');
const { calculateGasPrice } = require('../utils/gasUtils');

class WalletScanner {
  constructor() {
    this.providers = {};
    this.tokenListService = new TokenListService();
    this.initializeProviders();
  }

  initializeProviders() {
    for (const network of SUPPORTED_NETWORKS) {
      this.providers[network.chainId] = new ethers.providers.JsonRpcProvider(network.rpc);
    }
  }

  async scanWallet(address) {
    const results = [];
    const errors = [];
    
    for (const network of SUPPORTED_NETWORKS) {
      try {
        const balance = await this.providers[network.chainId].getBalance(address);
        
        if (balance.gt(0)) {
          const [tokens, nfts] = await Promise.all([
            this.getTokens(address, network.chainId),
            this.getNFTs(address, network.chainId)
          ]);

          const totalValue = await this.calculateTotalValue(balance, tokens, network.chainId);
          
          if (totalValue.gt(0) || tokens.length > 0 || nfts.length > 0) {
            results.push({
              network: network.name,
              chainId: network.chainId,
              nativeBalance: {
                raw: balance.toString(),
                formatted: ethers.utils.formatEther(balance),
                currency: network.currency
              },
              totalValueUSD: totalValue.toString(),
              tokens: tokens.map(t => ({
                ...t,
                valueUSD: this.calculateTokenValue(t)
              })),
              nfts,
              gasPrice: await this.getGasPrice(network.chainId)
            });
          }
        }
      } catch (error) {
        errors.push({
          network: network.name,
          error: error.message
        });
      }
    }

    // Sort by total value descending
    results.sort((a, b) => 
      ethers.BigNumber.from(b.totalValueUSD).sub(ethers.BigNumber.from(a.totalValueUSD))
    );

    return {
      walletAddress: address,
      networks: results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: Date.now()
    };
  }

  async getGasPrice(chainId) {
    try {
      const provider = this.providers[chainId];
      const gasPrice = await provider.getGasPrice();
      return {
        wei: gasPrice.toString(),
        gwei: ethers.utils.formatUnits(gasPrice, 'gwei')
      };
    } catch (error) {
      return null;
    }
  }

  async fetchTokenList(chainId) {
    return await TokenListService.fetchTokenList(chainId);
  }

  async fetchNFTList(chainId) {
    return await TokenListService.fetchNFTList(chainId);
  }

  async getTokens(address, chainId) {
    try {
      const tokens = await this.fetchTokenList(chainId);
      const tokenBalances = [];
      const multicallContract = await this.getMulticallContract(chainId);

      // Batch balance checks using multicall
      const balanceCalls = tokens.map(token => ({
        target: token.address,
        callData: ethers.utils.defaultAbiCoder.encode(
          ['function balanceOf(address)'],
          [address]
        )
      }));

      const balances = await multicallContract.callStatic.aggregate(balanceCalls);

      for (let i = 0; i < tokens.length; i++) {
        const balance = ethers.BigNumber.from(balances.returnData[i]);
        if (balance.gt(0)) {
          tokenBalances.push({
            ...tokens[i],
            balance: balance.toString(),
            formattedBalance: ethers.utils.formatUnits(balance, tokens[i].decimals)
          });
        }
      }

      // Get prices for tokens with non-zero balance
      const prices = await TokenListService.getPrices(tokenBalances, chainId);
      
      return tokenBalances.map(token => ({
        ...token,
        priceUSD: prices[token.address] || '0'
      }));
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return [];
    }
  }

  async getNFTs(address, chainId) {
    try {
      // This would typically use an API like Moralis/Alchemy to get NFT holdings
      const nftContracts = await this.fetchNFTList(chainId);
      const nftHoldings = [];

      for (const nftContract of nftContracts) {
        const contract = new ethers.Contract(
          nftContract.address,
          ERC721_ABI,
          this.providers[chainId]
        );

        const balance = await contract.balanceOf(address);
        if (balance.gt(0)) {
          // Get token IDs owned by address
          const tokenIds = await this.getOwnedTokenIds(contract, address, balance);
          
          nftHoldings.push({
            address: nftContract.address,
            name: await contract.name(),
            symbol: await contract.symbol(),
            tokenIds,
            balance: balance.toString()
          });
        }
      }

      return nftHoldings;
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  }

  async getOwnedTokenIds(contract, address, balance) {
    const tokenIds = [];
    const totalSupply = await contract.totalSupply().catch(() => ethers.BigNumber.from(0));
    
    // Using binary search to find owned tokens
    for (let i = 0; i < totalSupply.toNumber() && tokenIds.length < balance; i++) {
      try {
        const owner = await contract.ownerOf(i);
        if (owner.toLowerCase() === address.toLowerCase()) {
          tokenIds.push(i);
        }
      } catch (error) {
        continue;
      }
    }
    
    return tokenIds;
  }

  async calculateTotalValue(nativeBalance, tokens, chainId) {
    let total = ethers.BigNumber.from(nativeBalance);
    
    for (const token of tokens) {
      if (token.priceUSD) { // If we have price data
        const tokenValue = ethers.utils
          .parseUnits(token.formattedBalance, token.decimals)
          .mul(ethers.utils.parseUnits(token.priceUSD, 18));
        total = total.add(tokenValue);
      }
    }
    
    return total;
  }

  calculateTokenValue(token) {
    if (token.priceUSD) {
      const value = ethers.utils
        .parseUnits(token.formattedBalance, token.decimals)
        .mul(ethers.utils.parseUnits(token.priceUSD, 18));
      return value.toString();
    }
    return '0';
  }
}

module.exports = new WalletScanner();