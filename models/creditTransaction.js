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
    enum: ['use', 'initial', 'referral', 'referred', 'purchase', 'admin_add'], // เพิ่ม 'admin_add'
    required: true
  },
  description: {
    type: String
  },
  paymentTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentTransaction' // อ้างอิงถึงรายการชำระเงิน
  },
  // === ฟิลด์ใหม่สำหรับการเพิ่มโดยแอดมิน ===
  addedByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // อ้างอิงถึงแอดมินที่เพิ่มเครดิต
    required: function() {
      return this.type === 'admin_add';
    }
  },
  // เพิ่มข้อมูลเพิ่มเติมสำหรับการติดตาม
  metadata: {
    ipAddress: String, // IP ของแอดมินที่ทำรายการ
    userAgent: String, // Browser ที่ใช้
    reason: String,    // เหตุผลเพิ่มเติม
    category: {        // หมวดหมู่การเพิ่มเครดิต
      type: String,
      enum: ['manual_add', 'system_compensation', 'promotion', 'customer_service', 'bug_fix', 'other'],
      default: 'manual_add'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// === Indexes สำหรับการค้นหาที่เร็วขึ้น ===
CreditTransactionSchema.index({ user: 1, createdAt: -1 });
CreditTransactionSchema.index({ type: 1, createdAt: -1 });
CreditTransactionSchema.index({ addedByAdmin: 1, createdAt: -1 });

// === Virtual Fields ===
CreditTransactionSchema.virtual('isAdminTransaction').get(function() {
  return this.type === 'admin_add' && this.addedByAdmin;
});

CreditTransactionSchema.virtual('isPositive').get(function() {
  return this.amount > 0;
});

CreditTransactionSchema.virtual('displayAmount').get(function() {
  return this.amount > 0 ? `+${this.amount}` : `${this.amount}`;
});

// === Static Methods ===

// หาธุรกรรมที่แอดมินเพิ่มในช่วงเวลาที่กำหนด
CreditTransactionSchema.statics.findAdminTransactions = function(startDate, endDate, adminId = null) {
  const match = {
    type: 'admin_add',
    createdAt: { $gte: startDate, $lte: endDate }
  };
  
  if (adminId) {
    match.addedByAdmin = adminId;
  }
  
  return this.find(match)
    .populate('user', 'displayName lineUserId credits')
    .populate('addedByAdmin', 'username name')
    .sort({ createdAt: -1 });
};

// สถิติการเพิ่มเครดิตโดยแอดมิน
CreditTransactionSchema.statics.getAdminStats = function(adminId = null) {
  const match = { type: 'admin_add' };
  if (adminId) {
    match.addedByAdmin = adminId;
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalCreditsAdded: { $sum: '$amount' },
        avgCreditsPerTransaction: { $avg: '$amount' },
        maxCreditsInTransaction: { $max: '$amount' },
        minCreditsInTransaction: { $min: '$amount' }
      }
    }
  ]);
};

// รายงานการเพิ่มเครดิตรายวัน
CreditTransactionSchema.statics.getDailyAdminReport = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        type: 'admin_add',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          admin: '$addedByAdmin'
        },
        transactionCount: { $sum: 1 },
        totalCreditsAdded: { $sum: '$amount' }
      }
    },
    {
      $lookup: {
        from: 'admins',
        localField: '_id.admin',
        foreignField: '_id',
        as: 'adminInfo'
      }
    },
    {
      $unwind: '$adminInfo'
    },
    {
      $project: {
        date: '$_id.date',
        adminName: '$adminInfo.name',
        adminUsername: '$adminInfo.username',
        transactionCount: 1,
        totalCreditsAdded: 1
      }
    },
    {
      $sort: { date: -1, totalCreditsAdded: -1 }
    }
  ]);
};

// === Instance Methods ===

CreditTransactionSchema.methods.getDisplayInfo = function() {
  const typeLabels = {
    'use': 'ใช้งาน',
    'initial': 'เครดิตเริ่มต้น',
    'referral': 'แนะนำเพื่อน',
    'referred': 'ถูกแนะนำ',
    'purchase': 'ซื้อเครดิต',
    'admin_add': 'เพิ่มโดยแอดมิน'
  };
  
  return {
    id: this._id,
    type: this.type,
    typeLabel: typeLabels[this.type] || this.type,
    amount: this.amount,
    displayAmount: this.displayAmount,
    description: this.description,
    isPositive: this.isPositive,
    isAdminTransaction: this.isAdminTransaction,
    createdAt: this.createdAt,
    metadata: this.metadata
  };
};

// === Pre/Post Hooks ===

// บันทึก metadata เพิ่มเติมก่อนบันทึกธุรกรรมแอดมิน
CreditTransactionSchema.pre('save', function(next) {
  if (this.type === 'admin_add' && !this.metadata) {
    this.metadata = {
      category: 'manual_add',
      reason: this.description || 'เพิ่มเครดิตโดยแอดมิน'
    };
  }
  next();
});

// === Export Model ===
module.exports = mongoose.model('CreditTransaction', CreditTransactionSchema);