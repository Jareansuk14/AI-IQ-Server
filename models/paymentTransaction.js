//AI-Server/models/paymentTransaction.js
const mongoose = require('mongoose');

const PaymentTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lineUserId: {
    type: String,
    required: true
  },
  packageType: {
    type: String,
    enum: ['1_credit', '10_credit', '20_credit', '50_credit', '100_credit'],
    required: true
  },
  credits: {
    type: Number,
    required: true
  },
  baseAmount: {
    type: Number,
    required: true // จำนวนเงินพื้นฐาน (เช่น 100.00)
  },
  decimalAmount: {
    type: Number,
    required: true // เศษทศนิยม (เช่น 0.37)
  },
  totalAmount: {
    type: Number,
    required: true // รวมทั้งหมด (เช่น 100.37)
  },
  qrCodeData: {
    type: String // ข้อมูล QR Code หรือ URL
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date
  },
  emailMatchId: {
    type: String // ID ของอีเมลที่ตรงกัน
  }
});

// Index สำหรับการค้นหาที่เร็วขึ้น
PaymentTransactionSchema.index({ totalAmount: 1, status: 1 });
PaymentTransactionSchema.index({ lineUserId: 1, status: 1 });
PaymentTransactionSchema.index({ expiresAt: 1 });

// ฟังก์ชันสำหรับตรวจสอบว่าหมดอายุหรือไม่
PaymentTransactionSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// ฟังก์ชันสำหรับตรวจสอบว่าเวลาอยู่ในช่วงที่กำหนดหรือไม่ (10 นาที)
PaymentTransactionSchema.methods.isWithinTimeWindow = function(transactionDateTime) {
  const timeDiff = Math.abs(transactionDateTime - this.createdAt);
  const tenMinutesInMs = 10 * 60 * 1000; // 10 นาทีในหน่วยมิลลิวินาที
  return timeDiff <= tenMinutesInMs;
};

module.exports = mongoose.model('PaymentTransaction', PaymentTransactionSchema);