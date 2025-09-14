const mongoose = require('mongoose');

const statisticsSchema = new mongoose.Schema({
  utmCode: String,
  trafferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  visits: [{
    country: String,
    count: Number,
    timestamp: Date
  }],
  drains: [{
    network: String,
    amount: String,
    country: String,
    timestamp: Date
  }],
  networkStats: [{
    network: String,
    connections: Number,
    totalDrained: String,
    countryDistribution: [{
      country: String,
      connections: Number,
      drained: String
    }]
  }]
});