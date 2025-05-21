const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  lineUserId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String
  },
  pictureUrl: {
    type: String
  },
  firstInteraction: {
    type: Date,
    default: Date.now
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  interactionCount: {
    type: Number,
    default: 0
  },
  // ฟิลด์สำหรับระบบเครดิต
  credits: {
    type: Number,
    default: 10 // ผู้ใช้ใหม่จะได้รับฟรี 10 เครดิต
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: String,
    sparse: true
  }
});

// สร้างรหัสแนะนำเมื่อสร้างผู้ใช้ใหม่
UserSchema.pre('save', function(next) {
  if (!this.referralCode) {
    // สร้างรหัสแนะนำจาก lineUserId โดยใช้ 6 ตัวอักษรแบบสุ่ม
    this.referralCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);