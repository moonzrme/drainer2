const mongoose = require('mongoose');

const scanResultSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    index: true
  },
  networks: [{
    network: String,
    chainId: Number,
    nativeBalance: {
      raw: String,
      formatted: String,
      currency: String
    },
    totalValueUSD: String,
    tokens: [{
      address: String,
      symbol: String,
      balance: String,
      valueUSD: String
    }],
    nfts: [{
      address: String,
      tokenId: String,
      name: String
    }]
  }],
  errors: [{
    network: String,
    error: String
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ScanResult', scanResultSchema);