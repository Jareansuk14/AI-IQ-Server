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
    type: String,
    required: true // "13:45"
  },
  entryDate: {
    type: Date,
    required: true // วันที่เทรด
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
    candleColor: String, // "green", "red", "doji"
    openPrice: Number,
    closePrice: Number,
    isCorrect: Boolean,
    checkedAt: Date
  }],
  wonAt: Date,
  lostAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index สำหรับการค้นหา
TrackingSessionSchema.index({ lineUserId: 1, status: 1 });
TrackingSessionSchema.index({ status: 1, entryDate: 1 });

// Methods
TrackingSessionSchema.methods.getNextCheckTime = function() {
  const [hours, minutes] = this.entryTime.split(':').map(Number);
  const nextMinutes = minutes + (this.currentRound * 5);
  const nextHours = hours + Math.floor(nextMinutes / 60);
  const finalMinutes = nextMinutes % 60;
  
  return `${nextHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
};

TrackingSessionSchema.methods.isWinCondition = function(candleColor) {
  if (this.prediction === 'CALL' && candleColor === 'green') return true;
  if (this.prediction === 'PUT' && candleColor === 'red') return true;
  return false;
};

module.exports = mongoose.model('TrackingSession', TrackingSessionSchema);
