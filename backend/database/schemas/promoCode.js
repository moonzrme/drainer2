const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  trafferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landingType: String,
  utmLink: String,
  customUtm: String,
  active: {
    type: Boolean,
    default: true
  },
  statistics: {
    visits: {
      type: Number,
      default: 0
    },
    successfulDrains: {
      type: Number,
      default: 0
    },
    totalDrainedAmount: {
      type: Number,
      default: 0
    }
  }
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);