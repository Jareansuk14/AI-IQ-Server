const mongoose = require('mongoose');

const CreditTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true // ค่าเป็นบวกคือเพิ่มเครดิต ค่าเป็นลบคือใช้เครดิต
  },
  type: {
    type: String,
    enum: ['use', 'initial', 'referral', 'referred', 'purchase'], // เพิ่ม 'purchase'
    required: true
  },
  description: {
    type: String
  },
  paymentTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentTransaction' // อ้างอิงถึงรายการชำระเงิน
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CreditTransaction', CreditTransactionSchema);