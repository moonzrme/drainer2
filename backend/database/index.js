const mongoose = require('mongoose');
require('dotenv').config();
const ethers = require('ethers');
const { SUPPORTED_NETWORKS } = require('../config/networks');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

class WalletScanner {
  constructor() {
    this.providers = {};
    this.initializeProviders();
  }

  initializeProviders() {
    for (const network of SUPPORTED_NETWORKS) {
      this.providers[network.chainId] = new ethers.providers.JsonRpcProvider(network.rpc);
    }
  }

  async scanWallet(address) {
    const results = [];
    
    for (const network of SUPPORTED_NETWORKS) {
      const balance = await this.providers[network.chainId].getBalance(address);
      
      if (balance.gt(0)) {
        const tokens = await this.getTokens(address, network.chainId);
        const nfts = await this.getNFTs(address, network.chainId);
        
        results.push({
          network: network.name,
          chainId: network.chainId,
          balance: ethers.utils.formatEther(balance),
          tokens,
          nfts
        });
      }
    }

    // Sort networks by total value
    return results.sort((a, b) => b.balance - a.balance);
  }

  // Additional methods for token scanning will be implemented here
}

module.exports = { connectDB, WalletScanner: new WalletScanner() };