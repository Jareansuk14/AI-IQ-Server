//AI-Server/models/tradingSession.js - Database Model สำหรับติดตามผล
const mongoose = require('mongoose');

const TradingSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lineUserId: {
    type: String,
    required: true
  },
  pair: {
    type: String,
    required: true // EUR/USD, GBP/USD, etc.
  },
  prediction: {
    type: String,
    enum: ['CALL', 'PUT'],
    required: true
  },
  entryTime: {
    type: String,
    required: true // "13:45"
  },
  entryDate: {
    type: Date,
    required: true
  },
  currentRound: {
    type: Number,
    default: 1
  },
  maxRounds: {
    type: Number,
    default: 7
  },
  status: {
    type: String,
    enum: ['tracking', 'won', 'lost', 'cancelled'],
    default: 'tracking'
  },
  results: [{
    round: Number,
    checkTime: String, // "13:50"
    candleColor: String, // "green", "red", "gray"
    openPrice: Number,
    closePrice: Number,
    correct: Boolean,
    checkedAt: Date
  }],
  finalResult: {
    won: Boolean,
    totalRounds: Number,
    winRound: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Index สำหรับการค้นหาที่เร็วขึ้น
TradingSessionSchema.index({ lineUserId: 1, status: 1 });
TradingSessionSchema.index({ status: 1, entryDate: 1 });

// Method สำหรับเช็คว่าถึงเวลาเช็คผลหรือยัง
TradingSessionSchema.methods.getNextCheckTime = function() {
  const entryDateTime = new Date(this.entryDate);
  const nextCheckTime = new Date(entryDateTime.getTime() + (this.currentRound * 5 * 60 * 1000));
  return nextCheckTime;
};

// Method สำหรับเช็คว่าผลถูกต้องหรือไม่
TradingSessionSchema.methods.isCorrectPrediction = function(candleColor) {
  if (this.prediction === 'CALL') {
    return candleColor === 'green';
  } else if (this.prediction === 'PUT') {
    return candleColor === 'red';
  }
  return false;
};

module.exports = mongoose.model('TradingSession', TradingSessionSchema);
