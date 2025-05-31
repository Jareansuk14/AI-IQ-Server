//AI-Server/models/trackingSession.js - อัปเดตเพิ่มการเก็บวันที่
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
    required: true // เวลาที่เข้าเทรด (full timestamp)
  },
  entryDate: {
    type: String,
    required: true // วันที่เข้าเทรดในรูปแบบ YYYY-MM-DD
  },
  targetTime: {
    type: String,
    required: true // เวลาในรูปแบบ HH:MM
  },
  timezone: {
    type: String,
    default: 'Asia/Bangkok' // เก็บ timezone เพื่อความแม่นยำ
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
    checkDate: String, // วันที่เช็คในรูปแบบ YYYY-MM-DD
    expectedTime: String, // เวลาที่คาดว่าจะเช็ค HH:MM
    actualTime: String, // เวลาที่เช็คจริง HH:MM
    candleColor: String, // green, red, doji
    openPrice: Number,
    closePrice: Number,
    isCorrect: Boolean,
    candleTimestamp: Number, // timestamp ของแท่งเทียนที่เช็ค
    timestamp: { type: Date, default: Date.now }
  }],
  winRound: Number, // รอบที่ชนะ (ถ้าชนะ)
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  // เพิ่มข้อมูลสำหรับ debug
  debugInfo: {
    originalTargetTimestamp: Number,
    scheduleInfo: [{
      round: Number,
      scheduledFor: Date,
      actualCheckTime: Date,
      timeDifference: Number // milliseconds
    }]
  }
});

// Index สำหรับการค้นหา
TrackingSessionSchema.index({ lineUserId: 1, status: 1 });
TrackingSessionSchema.index({ status: 1, entryTime: 1 });
TrackingSessionSchema.index({ entryDate: 1, targetTime: 1 });

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

// Method สำหรับคำนวณวันที่และเวลาที่ต้องเช็คในรอบปัจจุบัน
TrackingSessionSchema.methods.getCheckDateAndTime = function() {
  const [hour, minute] = this.targetTime.split(':');
  const baseMinute = parseInt(minute);
  const checkMinute = baseMinute + ((this.currentRound - 1) * 5);
  
  // สร้าง Date object สำหรับการคำนวณ
  const entryDate = new Date(this.entryDate + 'T' + this.targetTime + ':00');
  entryDate.setMinutes(entryDate.getMinutes() + ((this.currentRound - 1) * 5));
  
  // หากเวลาข้ามไปวันถัดไป
  const checkDate = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const checkHour = entryDate.getHours().toString().padStart(2, '0');
  const checkMin = entryDate.getMinutes().toString().padStart(2, '0');
  const checkTime = `${checkHour}:${checkMin}`;
  
  return {
    date: checkDate,
    time: checkTime,
    fullDateTime: entryDate,
    isNextDay: checkDate !== this.entryDate
  };
};

module.exports = mongoose.model('TrackingSession', TrackingSessionSchema);
