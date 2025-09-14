const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userFingerprint: String,
  network: String,
  fromAddress: String,
  toAddress: String,
  amount: String,
  tokenAddress: String,
  tokenType: {
    type: String,
    enum: ['ERC20', 'ERC721', 'NATIVE']
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING'
  },
  promoCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode'
  },
  country: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);