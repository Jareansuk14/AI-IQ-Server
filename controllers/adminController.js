//AI-Server/controllers/adminController.js
const User = require('../models/user');
const Interaction = require('../models/interaction');
const Command = require('../models/command');
const CreditTransaction = require('../models/creditTransaction');
const creditService = require('../services/creditService');

// ดึงข้อมูลสรุปภาพรวม
const getDashboardSummary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalInteractions = await Interaction.countDocuments();
    
    // จำนวนผู้ใช้รายวันในช่วง 7 วันที่ผ่านมา
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyUsers = await Interaction.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { 
        _id: { 
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
        },
        count: { $addToSet: "$user" }
      }},
      { $project: { 
        date: "$_id",
        count: { $size: "$count" },
        _id: 0
      }},
      { $sort: { date: 1 } }
    ]);
    
    // เวลาเฉลี่ยในการประมวลผล
    const avgProcessingTime = await Interaction.aggregate([
      { $group: { 
        _id: null,
        avgTime: { $avg: "$processingTime" }
      }}
    ]);
    
    // จำนวนผู้ใช้ใหม่รายวัน
    const newUsers = await User.aggregate([
      { $match: { firstInteraction: { $gte: sevenDaysAgo } } },
      { $group: { 
        _id: { 
          $dateToString: { format: "%Y-%m-%d", date: "$firstInteraction" } 
        },
        count: { $sum: 1 }
      }},
      { $project: { 
        date: "$_id",
        count: 1,
        _id: 0
      }},
      { $sort: { date: 1 } }
    ]);

    // === สถิติเครดิตใหม่ ===
    
    // เครดิตรวมทั้งหมดในระบบ
    const totalCreditsResult = await User.aggregate([
      { $group: { _id: null, totalCredits: { $sum: "$credits" } }}
    ]);
    const totalCredits = totalCreditsResult[0]?.totalCredits || 0;

    // เครดิตที่ใช้ไปแล้ววันนี้
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const creditsUsedToday = await CreditTransaction.aggregate([
      { 
        $match: { 
          createdAt: { $gte: today, $lt: tomorrow },
          type: 'use',
          amount: { $lt: 0 }
        }
      },
      { $group: { _id: null, totalUsed: { $sum: { $abs: "$amount" } } }}
    ]);
    const todayCreditsUsed = creditsUsedToday[0]?.totalUsed || 0;

    // จำนวนผู้ใช้ที่เครดิตหมด
    const usersWithNoCredits = await User.countDocuments({ credits: { $lte: 0 } });

    // จำนวนผู้ใช้ที่เครดิตน้อย (≤ 5)
    const usersWithLowCredits = await User.countDocuments({ 
      credits: { $gt: 0, $lte: 5 } 
    });

    // การใช้เครดิตรายวันใน 7 วันที่ผ่านมา
    const dailyCreditUsage = await CreditTransaction.aggregate([
      { 
        $match: { 
          createdAt: { $gte: sevenDaysAgo },
          type: 'use',
          amount: { $lt: 0 }
        }
      },
      { $group: { 
        _id: { 
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
        },
        creditsUsed: { $sum: { $abs: "$amount" } }
      }},
      { $project: { 
        date: "$_id",
        count: "$creditsUsed",
        _id: 0
      }},
      { $sort: { date: 1 } }
    ]);
    
    res.json({
      // ข้อมูลเดิม
      totalUsers,
      totalInteractions,
      dailyUsers,
      newUsers,
      avgProcessingTime: avgProcessingTime[0]?.avgTime || 0,
      
      // ข้อมูลเครดิตใหม่
      creditStats: {
        totalCredits,
        creditsUsedToday: todayCreditsUsed,
        usersWithNoCredits,
        usersWithLowCredits,
        dailyCreditUsage
      }
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป' });
  }
};

// ดึงรายการผู้ใช้ (เพิ่มข้อมูลเครดิต)
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // เพิ่ม filter สำหรับเครดิต
    const creditFilter = req.query.creditFilter;
    let matchCondition = {};
    
    if (creditFilter === 'no-credits') {
      matchCondition.credits = { $lte: 0 };
    } else if (creditFilter === 'low-credits') {
      matchCondition.credits = { $gt: 0, $lte: 5 };
    } else if (creditFilter === 'high-credits') {
      matchCondition.credits = { $gt: 50 };
    }

    const users = await User.find(matchCondition)
      .sort({ lastInteraction: -1 })
      .skip(skip)
      .limit(limit);
    
    // เพิ่มข้อมูลเครดิตที่ใช้ไปแล้วของแต่ละผู้ใช้
    const usersWithCreditInfo = await Promise.all(
      users.map(async (user) => {
        // คำนวณเครดิตที่ใช้ไปแล้ว
        const creditUsed = await CreditTransaction.aggregate([
          { 
            $match: { 
              user: user._id,
              type: 'use',
              amount: { $lt: 0 }
            }
          },
          { $group: { _id: null, totalUsed: { $sum: { $abs: "$amount" } } }}
        ]);

        // คำนวณเครดิตที่ได้รับทั้งหมด
        const creditReceived = await CreditTransaction.aggregate([
          { 
            $match: { 
              user: user._id,
              amount: { $gt: 0 }
            }
          },
          { $group: { _id: null, totalReceived: { $sum: "$amount" } }}
        ]);

        return {
          ...user.toObject(),
          creditsUsed: creditUsed[0]?.totalUsed || 0,
          creditsReceived: creditReceived[0]?.totalReceived || 0
        };
      })
    );
    
    const total = await User.countDocuments(matchCondition);
    
    res.json({
      users: usersWithCreditInfo,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
  }
};

// ดึงรายการการโต้ตอบ (เพิ่มข้อมูลประมวลผล)
const getInteractions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const interactions = await Interaction.find()
      .populate('user', 'lineUserId displayName credits')
      .populate('command', 'text category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Interaction.countDocuments();
    
    res.json({
      interactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting interactions:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการโต้ตอบ' });
  }
};

// ดึงข้อมูลเชิงลึก (เพิ่มสถิติเครดิต)
const getInsights = async (req, res) => {
  try {
    // คำสั่งที่ใช้บ่อยที่สุด
    const topCommands = await Interaction.aggregate([
      { $group: { 
        _id: "$commandText",
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // ช่วงเวลาที่มีการใช้งานมากที่สุด
    const hourlyUsage = await Interaction.aggregate([
      { $group: { 
        _id: { $hour: "$createdAt" },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // ผู้ใช้ที่มีการโต้ตอบมากที่สุด
    const topUsers = await User.find()
      .sort({ interactionCount: -1 })
      .limit(5)
      .select('displayName interactionCount credits');
    
    // อัตราการตอบกลับสำเร็จ vs ล้มเหลว
    const successRate = await Interaction.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        success: {
          $sum: {
            $cond: [{ $ne: ["$aiResponse", null] }, 1, 0]
          }
        }
      }},
      { $project: {
        _id: 0,
        successRate: { $multiply: [{ $divide: ["$success", "$total"] }, 100] }
      }}
    ]);

    // === สถิติเครดิตเพิ่มเติม ===
    
    // ผู้ใช้ที่ใช้เครดิตมากที่สุด
    const topCreditUsers = await CreditTransaction.aggregate([
      { 
        $match: { 
          type: 'use',
          amount: { $lt: 0 }
        }
      },
      { $group: { 
        _id: "$user",
        totalUsed: { $sum: { $abs: "$amount" } }
      }},
      { $sort: { totalUsed: -1 } },
      { $limit: 5 },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
        displayName: '$user.displayName',
        lineUserId: '$user.lineUserId',
        totalUsed: 1
      }}
    ]);

    // การใช้เครดิตตามช่วงเวลา
    const hourlyCreditUsage = await CreditTransaction.aggregate([
      { 
        $match: { 
          type: 'use',
          amount: { $lt: 0 }
        }
      },
      { $group: { 
        _id: { $hour: "$createdAt" },
        creditsUsed: { $sum: { $abs: "$amount" } }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      topCommands,
      hourlyUsage,
      topUsers,
      successRate: successRate[0]?.successRate || 0,
      // เพิ่มสถิติเครดิต
      topCreditUsers,
      hourlyCreditUsage
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเชิงลึก' });
  }
};

// === ฟังก์ชันใหม่สำหรับจัดการเครดิต ===

// เพิ่มเครดิตให้ผู้ใช้
// เพิ่มเครดิตให้ผู้ใช้ (รองรับการหักเครดิตด้วย)
const addCreditToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    const adminId = req.admin._id;

    // === ปรับ Validation ใหม่ให้รองรับค่าลบ ===
    if (amount === undefined || amount === null || amount === 0) {
      return res.status(400).json({ message: 'จำนวนเครดิตต้องไม่เป็น 0' });
    }

    // ตรวจสอบขีดจำกัด
    if (Math.abs(amount) > 1000) {
      return res.status(400).json({ message: 'จำนวนเครดิตต้องไม่เกิน 1000 ในแต่ละครั้ง' });
    }

    // หาผู้ใช้
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }

    // === ตรวจสอบการหักเครดิต ===
    if (amount < 0) {
      const newCredits = user.credits + amount; // amount เป็นค่าลบอยู่แล้ว
      if (newCredits < 0) {
        return res.status(400).json({ 
          message: `ไม่สามารถหักเครดิตได้ เครดิตจะติดลบ (${newCredits})`,
          currentCredits: user.credits,
          requestedDeduction: Math.abs(amount)
        });
      }
    }

    // เพิ่ม/หักเครดิตผ่าน creditService
    const newCredits = await creditService.addCreditByAdmin(
      user.lineUserId,
      parseInt(amount),
      reason || `${amount > 0 ? 'เพิ่ม' : 'หัก'}เครดิตโดยแอดมิน`,
      adminId
    );

    // === ปรับ Response Message ===
    const actionText = amount > 0 ? 'เพิ่ม' : 'หัก';
    const responseMessage = `${actionText}เครดิตสำเร็จ`;

    res.json({
      message: responseMessage,
      user: {
        id: user._id,
        displayName: user.displayName,
        lineUserId: user.lineUserId,
        previousCredits: user.credits,
        newCredits: newCredits,
        creditsChanged: Math.abs(amount),
        action: amount > 0 ? 'add' : 'subtract'
      }
    });
  } catch (error) {
    console.error('Error managing user credit:', error);
    res.status(500).json({ message: error.message || 'เกิดข้อผิดพลาดในการจัดการเครดิต' });
  }
};

// ดูประวัติเครดิตของผู้ใช้
const getUserCreditHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }

    const creditHistory = await CreditTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('addedByAdmin', 'username name');

    res.json({
      user: {
        id: user._id,
        displayName: user.displayName,
        lineUserId: user.lineUserId,
        currentCredits: user.credits
      },
      creditHistory
    });
  } catch (error) {
    console.error('Error getting user credit history:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติเครดิต' });
  }
};

// ดูรายการปรับเครดิตทั้งหมดโดยแอดมิน
const getCreditTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type; // admin_add หรือ all

    let matchCondition = {};
    if (type === 'admin_add') {
      matchCondition = { 
        type: 'admin_add',
        addedByAdmin: { $exists: true }
      };
    }

    const transactions = await CreditTransaction.find(matchCondition)
      .populate('user', 'displayName lineUserId credits')
      .populate('addedByAdmin', 'username name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CreditTransaction.countDocuments(matchCondition);

    res.json({
      transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting credit transactions:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการธุรกรรม' });
  }
};

// ดูสถิติเครดิตรวม
const getCreditStats = async (req, res) => {
  try {
    // เครดิตรวมในระบบ
    const totalCreditsResult = await User.aggregate([
      { $group: { _id: null, totalCredits: { $sum: "$credits" } }}
    ]);
    const totalCredits = totalCreditsResult[0]?.totalCredits || 0;

    // เครดิตที่ใช้ไปทั้งหมด
    const totalUsedResult = await CreditTransaction.aggregate([
      { 
        $match: { 
          type: 'use',
          amount: { $lt: 0 }
        }
      },
      { $group: { _id: null, totalUsed: { $sum: { $abs: "$amount" } } }}
    ]);
    const totalUsed = totalUsedResult[0]?.totalUsed || 0;

    // เครดิตที่เพิ่มโดยแอดมินทั้งหมด
    const adminAddedResult = await CreditTransaction.aggregate([
      { 
        $match: { 
          type: 'admin_add',
          amount: { $gt: 0 }
        }
      },
      { $group: { _id: null, totalAdded: { $sum: "$amount" } }}
    ]);
    const addedByAdmin = adminAddedResult[0]?.totalAdded || 0;

    // === เพิ่มการคำนวณ "ใช้วันนี้" ===
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const usedTodayResult = await CreditTransaction.aggregate([
      { 
        $match: { 
          type: 'use',
          amount: { $lt: 0 },
          createdAt: {
            $gte: startOfToday,
            $lte: endOfToday
          }
        }
      },
      { $group: { _id: null, usedToday: { $sum: { $abs: "$amount" } } }}
    ]);
    const usedToday = usedTodayResult[0]?.usedToday || 0;

    // การแจกแจงผู้ใช้ตามจำนวนเครดิต
    const creditDistribution = await User.aggregate([
      {
        $bucket: {
          groupBy: "$credits",
          boundaries: [0, 1, 6, 21, 51, 101, 500, 1000],
          default: "1000+",
          output: {
            count: { $sum: 1 },
            users: { $push: { displayName: "$displayName", credits: "$credits" } }
          }
        }
      }
    ]);

    // แอดมินที่เพิ่มเครดิตมากที่สุด
    const topAdmins = await CreditTransaction.aggregate([
      { 
        $match: { 
          type: 'admin_add',
          addedByAdmin: { $exists: true }
        }
      },
      { $group: { 
        _id: "$addedByAdmin",
        totalAdded: { $sum: "$amount" },
        transactionCount: { $sum: 1 }
      }},
      { $sort: { totalAdded: -1 } },
      { $limit: 5 },
      { $lookup: {
        from: 'admins',
        localField: '_id',
        foreignField: '_id',
        as: 'admin'
      }},
      { $unwind: '$admin' },
      { $project: {
        adminName: '$admin.name',
        username: '$admin.username',
        totalAdded: 1,
        transactionCount: 1
      }}
    ]);

    // === ปรับ Response ให้ตรงกับ Frontend ===
    res.json({
      totalCredits,
      totalUsed,        // เปลี่ยนจาก totalCreditsUsed
      addedByAdmin,     // เปลี่ยนจาก totalAdminAdded
      usedToday,        // เพิ่มใหม่
      totalCreditsInCirculation: totalCredits + totalUsed,
      creditDistribution,
      topAdmins,
      usersCount: {
        noCredits: await User.countDocuments({ credits: { $lte: 0 } }),
        lowCredits: await User.countDocuments({ credits: { $gt: 0, $lte: 5 } }),
        mediumCredits: await User.countDocuments({ credits: { $gt: 5, $lte: 50 } }),
        highCredits: await User.countDocuments({ credits: { $gt: 50 } })
      }
    });
  } catch (error) {
    console.error('Error getting credit stats:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสถิติเครดิต' });
  }
};

// เพิ่มเครดิตหลายคนพร้อมกัน
const bulkAddCredits = async (req, res) => {
  try {
    const { userIds, amount, reason } = req.body;
    const adminId = req.admin._id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'กรุณาระบุรายการผู้ใช้' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'จำนวนเครดิตต้องมากกว่า 0' });
    }

    if (userIds.length > 100) {
      return res.status(400).json({ message: 'ไม่สามารถเพิ่มเครดิตให้ผู้ใช้เกิน 100 คนพร้อมกันได้' });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          errors.push({ userId, error: 'ไม่พบผู้ใช้' });
          continue;
        }

        const newCredits = await creditService.addCreditByAdmin(
          user.lineUserId,
          parseInt(amount),
          reason || 'เพิ่มเครดิตหลายคนโดยแอดมิน',
          adminId
        );

        results.push({
          userId: user._id,
          displayName: user.displayName,
          lineUserId: user.lineUserId,
          previousCredits: user.credits,
          newCredits: newCredits,
          creditsAdded: amount
        });
      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    res.json({
      message: `เพิ่มเครดิตสำเร็จ ${results.length} คน`,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error bulk adding credits:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มเครดิตหลายคน' });
  }
};

// ตั้งค่าเครดิตเริ่มต้น (ยังไม่ implement เต็มรูปแบบ - เป็น placeholder)
const setDefaultCredits = async (req, res) => {
  try {
    const { defaultAmount } = req.body;
    
    // TODO: บันทึกการตั้งค่าลงในตาราง settings หรือ config
    // ตอนนี้ return แค่ confirmation
    
    res.json({
      message: 'ตั้งค่าเครดิตเริ่มต้นสำเร็จ',
      defaultCredits: defaultAmount
    });
  } catch (error) {
    console.error('Error setting default credits:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตั้งค่า' });
  }
};

module.exports = {
  getDashboardSummary,
  getUsers,
  getInteractions,
  getInsights,
  // ฟังก์ชันเครดิตใหม่
  addCreditToUser,
  getUserCreditHistory,
  getCreditTransactions,
  getCreditStats,
  bulkAddCredits,
  setDefaultCredits
};