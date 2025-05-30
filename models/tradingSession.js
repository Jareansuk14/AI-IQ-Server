//AI-Server/models/tradingSession.js - แก้ไขเพื่อรองรับการสร้างด้วย lineUserId อย่างเดียว
const mongoose = require('mongoose');

const TradingSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // เปลี่ยนเป็น false เพื่อให้สร้างได้ก่อน แล้วค่อยอัปเดตทีหลัง
  },
  lineUserId: {
    type: String,
    required: true,
    index: true // เพิ่ม index เพื่อค้นหาเร็วขึ้น
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
    required: true,
    default: Date.now
  },
  currentRound: {
    type: Number,
    default: 1,
    min: 1,
    max: 10 // เพิ่มขีดจำกัด
  },
  maxRounds: {
    type: Number,
    default: 7,
    min: 1,
    max: 10
  },
  status: {
    type: String,
    enum: ['tracking', 'won', 'lost', 'cancelled', 'error'],
    default: 'tracking'
  },
  results: [{
    round: {
      type: Number,
      required: true
    },
    checkTime: {
      type: String,
      required: true // "13:50"
    },
    candleColor: {
      type: String,
      enum: ['green', 'red', 'gray'],
      required: true
    },
    openPrice: {
      type: Number,
      required: true
    },
    closePrice: {
      type: Number,
      required: true
    },
    correct: {
      type: Boolean,
      required: true
    },
    checkedAt: {
      type: Date,
      default: Date.now
    }
  }],
  finalResult: {
    won: Boolean,
    totalRounds: Number,
    winRound: Number
  },
  // เพิ่มฟิลด์สำหรับการจัดการ error
  errorInfo: {
    message: String,
    code: String,
    timestamp: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// อัปเดต updatedAt ทุกครั้งที่มีการแก้ไข
TradingSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index สำหรับการค้นหาที่เร็วขึ้น
TradingSessionSchema.index({ lineUserId: 1, status: 1 });
TradingSessionSchema.index({ status: 1, entryDate: 1 });
TradingSessionSchema.index({ createdAt: -1 });

// Virtual field สำหรับดึงข้อมูล user
TradingSessionSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'lineUserId',
  foreignField: 'lineUserId',
  justOne: true
});

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

// Method สำหรับเช็คว่า session หมดอายุหรือไม่ (เกิน 2 ชั่วโมง)
TradingSessionSchema.methods.isExpired = function() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return this.createdAt < twoHoursAgo;
};

// Method สำหรับ populate user data
TradingSessionSchema.methods.populateUser = async function() {
  if (!this.user && this.lineUserId) {
    const User = mongoose.model('User');
    const user = await User.findOne({ lineUserId: this.lineUserId });
    if (user) {
      this.user = user._id;
      await this.save();
    }
  }
  return this;
};

// Static method สำหรับหา active sessions
TradingSessionSchema.statics.findActiveSessions = function() {
  return this.find({ status: 'tracking' }).sort({ createdAt: -1 });
};

// Static method สำหรับ cleanup expired sessions
TradingSessionSchema.statics.cleanupExpiredSessions = async function() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const result = await this.updateMany(
    { 
      status: 'tracking',
      createdAt: { $lt: twoHoursAgo }
    },
    { 
      status: 'cancelled',
      completedAt: new Date(),
      'errorInfo.message': 'Session expired due to timeout',
      'errorInfo.timestamp': new Date()
    }
  );
  return result.modifiedCount;
};

// Static method สำหรับหา session ของ user
TradingSessionSchema.statics.findUserActiveSession = function(lineUserId) {
  return this.findOne({ 
    lineUserId,
    status: 'tracking'
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('TradingSession', TradingSessionSchema);