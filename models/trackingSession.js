//AI-Server/models/trackingSession.js - Model ใหม่สำหรับติดตามผล
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
  // ข้อมูลการเทรด
  pair: {
    type: String,
    required: true // EUR/USD, BTC/USD, etc.
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
  entryTimeString: {
    type: String,
    required: true // "13:45" สำหรับแสดงผล
  },
  
  // สถานะการติดตาม
  status: {
    type: String,
    enum: ['tracking', 'completed', 'failed'],
    default: 'tracking'
  },
  currentRound: {
    type: Number,
    default: 1
  },
  maxRounds: {
    type: Number,
    default: 7
  },
  
  // ผลลัพธ์
  results: [{
    round: Number,
    checkTime: Date,
    checkTimeString: String, // "13:50"
    candleColor: String, // "green", "red", "doji"
    openPrice: Number,
    closePrice: Number,
    isCorrect: Boolean,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // สถานะสุดท้าย
  finalResult: {
    type: String,
    enum: ['win', 'lose', 'max_rounds_reached']
  },
  completedAt: Date,
  
  // ข้อมูลเพิ่มเติม
  nextCheckTime: Date, // เวลาที่ต้องเช็คครั้งถัดไป
  symbol: String, // สำหรับ IQ Option API (EURUSD, BTCUSD)
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index สำหรับการค้นหา
TrackingSessionSchema.index({ lineUserId: 1, status: 1 });
TrackingSessionSchema.index({ nextCheckTime: 1, status: 1 });
TrackingSessionSchema.index({ status: 1, nextCheckTime: 1 });

// Methods
TrackingSessionSchema.methods.isActive = function() {
  return this.status === 'tracking';
};

TrackingSessionSchema.methods.addResult = function(candleData) {
  const isCorrect = this.checkPrediction(candleData.color);
  
  this.results.push({
    round: this.currentRound,
    checkTime: new Date(),
    checkTimeString: new Date().toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok'
    }),
    candleColor: candleData.color,
    openPrice: candleData.open,
    closePrice: candleData.close,
    isCorrect
  });
  
  return isCorrect;
};

TrackingSessionSchema.methods.checkPrediction = function(candleColor) {
  if (this.prediction === 'CALL') {
    return candleColor === 'green';
  } else { // PUT
    return candleColor === 'red';
  }
};

TrackingSessionSchema.methods.calculateNextCheckTime = function() {
  const next = new Date(this.entryTime);
  next.setMinutes(next.getMinutes() + (this.currentRound + 1) * 5);
  this.nextCheckTime = next;
  return next;
};

TrackingSessionSchema.methods.getStatusText = function() {
  if (this.status === 'completed') {
    return this.finalResult === 'win' ? '🎉 ชนะแล้ว!' : '😔 แพ้แล้ว';
  }
  return `🔄 ติดตามผล (${this.currentRound}/${this.maxRounds})`;
};

module.exports = mongoose.model('TrackingSession', TrackingSessionSchema);
