const { models } = require('../database');
const User = models.User;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  telegramId: String,
  isTraffer: {
    type: Boolean,
    default: false
  },
  wallet: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);