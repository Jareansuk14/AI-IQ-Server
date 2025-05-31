//AI-Server/models/trackingSession.js
const mongoose = require('mongoose');

const TrackingSessionSchema = new mongoose.Schema({
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
    type: Date,
    required: true // เวลาที่เข้าเทรด
  },
  targetTime: {
    type: String,
    required: true // เวลาในรูปแบบ HH:MM
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
    checkTime: Date,
    candleColor: String, // green, red, doji
    openPrice: Number,
    closePrice: Number,
    isCorrect: Boolean,
    timestamp: { type: Date, default: Date.now }
  }],
  winRound: Number, // รอบที่ชนะ (ถ้าชนะ)
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Index สำหรับการค้นหา
TrackingSessionSchema.index({ lineUserId: 1, status: 1 });
TrackingSessionSchema.index({ status: 1, entryTime: 1 });

// Method สำหรับตรวจสอบว่าถูกต้องหรือไม่
TrackingSessionSchema.methods.isCorrectPrediction = function(candleColor) {
  if (this.prediction === 'CALL') {
    return candleColor === 'green'; // CALL ต้องการแท่งเขียว (ขึ้น)
  } else if (this.prediction === 'PUT') {
    return candleColor === 'red'; // PUT ต้องการแท่งแดง (ลง)
  }
  return false;
};

// Method สำหรับตรวจสอบว่าครบรอบแล้วหรือไม่
TrackingSessionSchema.methods.isMaxRoundsReached = function() {
  return this.currentRound >= this.maxRounds;
};

module.exports = mongoose.model('TrackingSession', TrackingSessionSchema);
