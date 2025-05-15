// controllers/adminController.js
const User = require('../models/user');
const Interaction = require('../models/interaction');
const Command = require('../models/command');

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
    
    res.json({
      totalUsers,
      totalInteractions,
      dailyUsers,
      newUsers,
      avgProcessingTime: avgProcessingTime[0]?.avgTime || 0
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป' });
  }
};

// ดึงรายการผู้ใช้
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .sort({ lastInteraction: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments();
    
    res.json({
      users,
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

// ดึงรายการการโต้ตอบ
const getInteractions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const interactions = await Interaction.find()
      .populate('user', 'lineUserId displayName')
      .populate('command', 'text')
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

// ดึงข้อมูลเชิงลึกแบบอื่นๆ
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
      .select('displayName interactionCount');
    
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
    
    res.json({
      topCommands,
      hourlyUsage,
      topUsers,
      successRate: successRate[0]?.successRate || 0
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเชิงลึก' });
  }
};

module.exports = {
  getDashboardSummary,
  getUsers,
  getInteractions,
  getInsights
};