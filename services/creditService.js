//AI-Server/services/creditService.js - โค้ดทั้งหมดพร้อม Referral System
const User = require('../models/user');
const CreditTransaction = require('../models/creditTransaction');
const lineService = require('./lineService');

class CreditService {
  // ตรวจสอบเครดิตของผู้ใช้
  async checkCredit(userId) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }
      return user.credits;
    } catch (error) {
      console.error('Error checking credit:', error);
      throw error;
    }
  }

  // เพิ่มหรือหักเครดิต
  async updateCredit(userId, amount, type, description) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      user.credits += amount;
      // ป้องกันไม่ให้เครดิตติดลบ
      if (user.credits < 0) {
        user.credits = 0;
      }
      
      await user.save();

      // บันทึกธุรกรรม
      await CreditTransaction.create({
        user: user._id,
        amount,
        type,
        description
      });

      return user.credits;
    } catch (error) {
      console.error('Error updating credit:', error);
      throw error;
    }
  }

  // === ฟังก์ชันใหม่สำหรับแอดมิน ===

  // เพิ่มเครดิตโดยแอดมิน (รองรับการหักเครดิตด้วย)
  async addCreditByAdmin(userId, amount, reason, adminId) {
    try {
      console.log(`Admin ${adminId} ${amount > 0 ? 'adding' : 'subtracting'} ${Math.abs(amount)} credits to user ${userId}`);
      
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      const previousCredits = user.credits;
      user.credits += amount;
      
      // ป้องกันเครดิตติดลบ (safety net)
      if (user.credits < 0) {
        user.credits = 0;
      }
      
      await user.save();

      // === กำหนดประเภทธุรกรรม ===
      const transactionType = amount > 0 ? 'admin_add' : 'admin_subtract';

      // บันทึกธุรกรรมพร้อมระบุว่าเป็นการเพิ่มโดยแอดมิน
      await CreditTransaction.create({
        user: user._id,
        amount,
        type: transactionType, // ใช้ type ใหม่
        description: reason,
        addedByAdmin: adminId
      });

      console.log(`Credits updated: ${previousCredits} -> ${user.credits} for user ${userId}`);

      // === ส่งการแจ้งเตือนไปยัง LINE (ปรับข้อความ) ===
      try {
        const actionText = amount > 0 ? 'ได้รับเครดิตเพิ่ม' : 'เครดิตถูกหัก';
        const emoji = amount > 0 ? '🎁' : '📉';
        const amountText = Math.abs(amount);
        
        const message = {
          type: 'text',
          text: `${emoji} ${actionText} ${amountText} เครดิต\n\n💎 เครดิตปัจจุบัน: ${user.credits} เครดิต\n📝 หมายเหตุ: ${reason}\n\n${amount > 0 ? '✨ ขอบคุณที่ใช้บริการ!' : '⚠️ กรุณาตรวจสอบการใช้งาน'}`
        };

        await lineService.pushMessage(userId, message);
        console.log(`Notification sent to user ${userId}: ${actionText} ${amountText} credits`);
      } catch (notificationError) {
        console.error('Error sending credit notification:', notificationError);
        // ไม่ throw error เพราะการเพิ่ม/หักเครดิตสำเร็จแล้ว
      }

      return user.credits;
    } catch (error) {
      console.error('Error managing credit by admin:', error);
      throw error;
    }
  }

  // ดูประวัติการใช้เครดิตของผู้ใช้
  async getCreditHistory(userId, limit = 50) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      const history = await CreditTransaction.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('addedByAdmin', 'username name'); // เพิ่ม populate สำหรับข้อมูลแอดมิน

      return {
        user: {
          id: user._id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          currentCredits: user.credits
        },
        history
      };
    } catch (error) {
      console.error('Error getting credit history:', error);
      throw error;
    }
  }

  // ดูสถิติเครดิตของผู้ใช้
  async getUserCreditStats(userId) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      // เครดิตที่ได้รับทั้งหมด
      const totalReceived = await CreditTransaction.aggregate([
        { 
          $match: { 
            user: user._id,
            amount: { $gt: 0 }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } }}
      ]);

      // เครดิตที่ใช้ไปแล้ว
      const totalUsed = await CreditTransaction.aggregate([
        { 
          $match: { 
            user: user._id,
            type: 'use',
            amount: { $lt: 0 }
          }
        },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } }}
      ]);

      // เครดิตที่ได้จากการแนะนำ
      const fromReferral = await CreditTransaction.aggregate([
        { 
          $match: { 
            user: user._id,
            type: { $in: ['referral', 'referred'] }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } }}
      ]);

      // เครดิตที่แอดมินเพิ่มให้
      const fromAdmin = await CreditTransaction.aggregate([
        { 
          $match: { 
            user: user._id,
            type: 'admin_add'
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } }}
      ]);

      return {
        user: {
          id: user._id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          currentCredits: user.credits
        },
        stats: {
          totalReceived: totalReceived[0]?.total || 0,
          totalUsed: totalUsed[0]?.total || 0,
          fromReferral: fromReferral[0]?.total || 0,
          fromAdmin: fromAdmin[0]?.total || 0,
          initialCredits: 10 // เครดิตเริ่มต้น (hardcode หรือดึงจาก config)
        }
      };
    } catch (error) {
      console.error('Error getting user credit stats:', error);
      throw error;
    }
  }

  // ค้นหาผู้ใช้ตามเงื่อนไขเครดิต
  async findUsersByCredit(condition = 'all', limit = 100) {
    try {
      let matchCondition = {};
      
      switch (condition) {
        case 'no-credits':
          matchCondition = { credits: { $lte: 0 } };
          break;
        case 'low-credits':
          matchCondition = { credits: { $gt: 0, $lte: 5 } };
          break;
        case 'high-credits':
          matchCondition = { credits: { $gt: 50 } };
          break;
        case 'medium-credits':
          matchCondition = { credits: { $gt: 5, $lte: 50 } };
          break;
        default:
          matchCondition = {}; // ทั้งหมด
      }

      const users = await User.find(matchCondition)
        .sort({ credits: condition === 'high-credits' ? -1 : 1 })
        .limit(limit)
        .select('lineUserId displayName credits lastInteraction');

      return users;
    } catch (error) {
      console.error('Error finding users by credit:', error);
      throw error;
    }
  }

  // ตรวจสอบผู้ใช้ที่ควรได้รับการแจ้งเตือนเครดิตหมด
  async getUsersNeedingCreditAlert() {
    try {
      // หาผู้ใช้ที่เครดิตหมดและมีการใช้งานใน 7 วันที่ผ่านมา
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const users = await User.find({
        credits: { $lte: 0 },
        lastInteraction: { $gte: sevenDaysAgo }
      }).select('lineUserId displayName credits lastInteraction');

      return users;
    } catch (error) {
      console.error('Error getting users needing credit alert:', error);
      throw error;
    }
  }

  // === ฟังก์ชันเดิมสำหรับ Referral System ===

  // ใช้รหัสแนะนำ
  async applyReferralCode(userId, referralCode) {
    try {
      // ตรวจสอบผู้ใช้ปัจจุบัน
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      // ตรวจสอบว่าเคยใช้รหัสแนะนำแล้วหรือไม่
      if (user.referredBy) {
        throw new Error('คุณเคยใช้รหัสแนะนำแล้ว');
      }

      // ตรวจสอบว่ารหัสแนะนำตรงกับของตัวเองหรือไม่
      if (user.referralCode === referralCode) {
        throw new Error('ไม่สามารถใช้รหัสแนะนำของตัวเองได้');
      }

      // ค้นหาผู้ใช้ที่มีรหัสแนะนำตรงกับที่ระบุ
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        throw new Error('รหัสแนะนำไม่ถูกต้อง');
      }

      // อัปเดตข้อมูลผู้ถูกแนะนำ
      user.referredBy = referralCode;
      user.credits += 5; // ผู้ถูกแนะนำได้รับเพิ่ม 5 เครดิต
      await user.save();

      // บันทึกธุรกรรมสำหรับผู้ถูกแนะนำ
      await CreditTransaction.create({
        user: user._id,
        amount: 5,
        type: 'referred',
        description: `ได้รับเพิ่มจากการใช้รหัสแนะนำ ${referralCode}`
      });

      // อัปเดตเครดิตสำหรับผู้แนะนำ
      referrer.credits += 10;
      await referrer.save();

      // บันทึกธุรกรรมสำหรับผู้แนะนำ
      await CreditTransaction.create({
        user: referrer._id,
        amount: 10,
        type: 'referral',
        description: `ได้รับเครดิตจากการแนะนำผู้ใช้ ${user.displayName || user.lineUserId}`
      });

      // ส่งการแจ้งเตือนไปยังผู้ถูกแนะนำ
      await lineService.pushMessage(user.lineUserId, {
        type: 'text',
        text: `🎁 ขอบคุณที่ใช้รหัสแนะนำ!\nคุณได้รับเพิ่ม 5 เครดิต\nตอนนี้คุณมีเครดิตทั้งหมด ${user.credits} เครดิตแล้ว`
      });

      // ส่งการแจ้งเตือนไปยังผู้แนะนำ
      await lineService.pushMessage(referrer.lineUserId, {
        type: 'text',
        text: `🎉 ยินดีด้วย! ${user.displayName || 'เพื่อน'} ได้ใช้รหัสแนะนำของคุณแล้ว\nคุณได้รับ 10 เครดิตฟรี\nตอนนี้คุณมีเครดิตทั้งหมด ${referrer.credits} เครดิตแล้ว`
      });

      return {
        credits: user.credits,
        referred: true
      };
    } catch (error) {
      console.error('Error applying referral code:', error);
      throw error;
    }
  }

  // รับรหัสแนะนำของผู้ใช้
  async getReferralCode(userId) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }
      return user.referralCode;
    } catch (error) {
      console.error('Error getting referral code:', error);
      throw error;
    }
  }

  // === ฟังก์ชันใหม่สำหรับ Referral System Cards ===

  // ดึงสถิติการแนะนำแบบสรุป (สำหรับการ์ดแชร์)
  async getReferralSummary(userId) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      // นับจำนวนคนที่แนะนำ
      const totalReferred = await User.countDocuments({ 
        referredBy: user.referralCode 
      });

      // คำนวณเครดิตที่ได้จากการแนะนำ
      const earnedFromReferrals = await CreditTransaction.aggregate([
        { 
          $match: { 
            user: user._id,
            type: 'referral'
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } }}
      ]);
      const totalEarned = earnedFromReferrals[0]?.total || 0;

      return {
        referralCode: user.referralCode,
        totalReferred,
        totalEarned
      };
    } catch (error) {
      console.error('Error getting referral summary:', error);
      throw error;
    }
  }

  // ดึงสถิติการแนะนำแบบละเอียด (สำหรับการ์ดสถิติ)
  async getReferralDetailedStats(userId) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      const referralCode = user.referralCode;

      // สถิติพื้นฐาน
      const totalReferred = await User.countDocuments({ 
        referredBy: referralCode 
      });

      const earnedFromReferrals = await CreditTransaction.aggregate([
        { 
          $match: { 
            user: user._id,
            type: 'referral'
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } }}
      ]);
      const totalEarned = earnedFromReferrals[0]?.total || 0;

      // ดึงเพื่อนที่แนะนำล่าสุด 5 คน
      const recentReferrals = await User.find({ referredBy: referralCode })
        .sort({ firstInteraction: -1 })
        .limit(5)
        .select('displayName firstInteraction lineUserId');

      // สถิติรายเดือน
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const thisMonthCount = await User.countDocuments({
        referredBy: referralCode,
        firstInteraction: { $gte: thisMonth }
      });

      const lastMonthCount = await User.countDocuments({
        referredBy: referralCode,
        firstInteraction: { $gte: lastMonth, $lt: thisMonth }
      });

      // คำนวณอันดับ (จากผู้ใช้ที่แนะนำมากสุด)
      const topReferrers = await User.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'referralCode',
            foreignField: 'referredBy',
            as: 'referredUsers'
          }
        },
        {
          $addFields: {
            referralCount: { $size: '$referredUsers' }
          }
        },
        {
          $sort: { referralCount: -1 }
        },
        {
          $group: {
            _id: null,
            users: { $push: { userId: '$lineUserId', count: '$referralCount' } }
          }
        }
      ]);

      let ranking = 0;
      if (topReferrers[0]) {
        const userIndex = topReferrers[0].users.findIndex(u => u.userId === userId);
        ranking = userIndex >= 0 ? userIndex + 1 : 0;
      }

      // การเติบโตรายสัปดาห์ (7 วันที่ผ่านมา)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyGrowth = await User.countDocuments({
        referredBy: referralCode,
        firstInteraction: { $gte: sevenDaysAgo }
      });

      return {
        referralCode,
        totalReferred,
        totalEarned,
        recentReferrals: recentReferrals.map(r => ({
          name: r.displayName || 'เพื่อน',
          date: r.firstInteraction.toLocaleDateString('th-TH', {
            year: '2-digit',
            month: '2-digit', 
            day: '2-digit'
          }),
          lineUserId: r.lineUserId
        })),
        monthlyStats: {
          thisMonth: thisMonthCount,
          lastMonth: lastMonthCount
        },
        ranking: ranking > 0 ? ranking : null,
        weeklyGrowth,
        // เพิ่มข้อมูลเพื่อการแสดงผล
        growthRate: lastMonthCount > 0 ? 
          ((thisMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1) : 
          (thisMonthCount > 0 ? '100' : '0')
      };
    } catch (error) {
      console.error('Error getting detailed referral stats:', error);
      throw error;
    }
  }

  // ดึงรายการผู้ใช้ที่แนะนำมากสุด (สำหรับ admin หรือ leaderboard)
  async getTopReferrers(limit = 10) {
    try {
      const topReferrers = await User.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'referralCode',
            foreignField: 'referredBy',
            as: 'referredUsers'
          }
        },
        {
          $addFields: {
            referralCount: { $size: '$referredUsers' }
          }
        },
        {
          $match: {
            referralCount: { $gt: 0 }
          }
        },
        {
          $sort: { referralCount: -1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            lineUserId: 1,
            displayName: 1,
            referralCode: 1,
            referralCount: 1,
            credits: 1,
            firstInteraction: 1
          }
        }
      ]);

      return topReferrers;
    } catch (error) {
      console.error('Error getting top referrers:', error);
      throw error;
    }
  }

  // ตรวจสอบความถูกต้องของรหัสแนะนำ (ก่อนใช้)
  async validateReferralCode(userId, referralCode) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        return { valid: false, reason: 'ไม่พบผู้ใช้' };
      }

      // ตรวจสอบว่าเคยใช้รหัสแล้วหรือไม่
      if (user.referredBy) {
        return { valid: false, reason: 'คุณเคยใช้รหัสแนะนำแล้ว' };
      }

      // ตรวจสอบว่าเป็นรหัสของตัวเองหรือไม่
      if (user.referralCode === referralCode.toUpperCase()) {
        return { valid: false, reason: 'ไม่สามารถใช้รหัสแนะนำของตัวเองได้' };
      }

      // ตรวจสอบว่ารหัสมีอยู่จริงหรือไม่
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (!referrer) {
        return { valid: false, reason: 'รหัสแนะนำไม่ถูกต้องหรือไม่มีอยู่' };
      }

      return { 
        valid: true, 
        referrer: {
          lineUserId: referrer.lineUserId,
          displayName: referrer.displayName,
          referralCode: referrer.referralCode
        }
      };
    } catch (error) {
      console.error('Error validating referral code:', error);
      return { valid: false, reason: 'เกิดข้อผิดพลาดในการตรวจสอบรหัส' };
    }
  }

  // สร้างรายงานระบบแนะนำ (สำหรับ admin)
  async getReferralSystemReport() {
    try {
      // สถิติทั้งหมด
      const totalUsers = await User.countDocuments();
      const usersWithReferrals = await User.countDocuments({ referredBy: { $exists: true, $ne: null } });
      const activeReferrers = await User.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'referralCode',
            foreignField: 'referredBy',
            as: 'referredUsers'
          }
        },
        {
          $match: {
            'referredUsers.0': { $exists: true }
          }
        },
        {
          $count: 'count'
        }
      ]);

      // เครดิตที่แจกจากระบบแนะนำ
      const totalCreditsFromReferrals = await CreditTransaction.aggregate([
        {
          $match: {
            type: { $in: ['referral', 'referred'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      // การเติบโตรายเดือน
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyGrowth = await User.aggregate([
        {
          $match: {
            referredBy: { $exists: true, $ne: null },
            firstInteraction: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$firstInteraction' },
              month: { $month: '$firstInteraction' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      return {
        overview: {
          totalUsers,
          usersWithReferrals,
          activeReferrers: activeReferrers[0]?.count || 0,
          referralRate: totalUsers > 0 ? (usersWithReferrals / totalUsers * 100).toFixed(2) : 0
        },
        credits: {
          totalDistributed: totalCreditsFromReferrals[0]?.total || 0,
          averagePerUser: usersWithReferrals > 0 ? 
            ((totalCreditsFromReferrals[0]?.total || 0) / usersWithReferrals).toFixed(2) : 0
        },
        growth: monthlyGrowth.map(m => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          count: m.count
        })),
        topReferrers: await this.getTopReferrers(5)
      };
    } catch (error) {
      console.error('Error generating referral system report:', error);
      throw error;
    }
  }

  // === ฟังก์ชันเพิ่มเติมสำหรับ Analytics ===

  // ดูการเติบโตของ referral รายวัน
  async getReferralDailyGrowth(days = 30) {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const dailyStats = await User.aggregate([
        {
          $match: {
            referredBy: { $exists: true, $ne: null },
            firstInteraction: { $gte: daysAgo }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$firstInteraction' } }
            },
            newReferrals: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      return dailyStats.map(stat => ({
        date: stat._id.date,
        count: stat.newReferrals
      }));
    } catch (error) {
      console.error('Error getting referral daily growth:', error);
      throw error;
    }
  }

  // ดูผู้ใช้ที่ยังไม่เคยใช้รหัสแนะนำ (potential targets)
  async getUsersWithoutReferrals(limit = 50) {
    try {
      const usersWithoutReferrals = await User.find({
        referredBy: { $exists: false },
        firstInteraction: { $exists: true }
      })
      .sort({ firstInteraction: -1 })
      .limit(limit)
      .select('lineUserId displayName firstInteraction credits');

      return usersWithoutReferrals;
    } catch (error) {
      console.error('Error getting users without referrals:', error);
      throw error;
    }
  }

  // คำนวณ conversion rate ของระบบแนะนำ
  async getReferralConversionRate() {
    try {
      const totalUsers = await User.countDocuments();
      const usersWithReferrals = await User.countDocuments({ 
        referredBy: { $exists: true, $ne: null } 
      });
      
      const conversionRate = totalUsers > 0 ? (usersWithReferrals / totalUsers * 100).toFixed(2) : 0;

      // ดูการ conversion ในแต่ละเดือน
      const monthlyConversion = await User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$firstInteraction' },
              month: { $month: '$firstInteraction' }
            },
            totalUsers: { $sum: 1 },
            referredUsers: {
              $sum: {
                $cond: [{ $ne: ['$referredBy', null] }, 1, 0]
              }
            }
          }
        },
        {
          $addFields: {
            conversionRate: {
              $multiply: [
                { $divide: ['$referredUsers', '$totalUsers'] },
                100
              ]
            }
          }
        },
        {
          $sort: { '_id.year': -1, '_id.month': -1 }
        },
        {
          $limit: 12
        }
      ]);

      return {
        overall: {
          totalUsers,
          usersWithReferrals,
          conversionRate: parseFloat(conversionRate)
        },
        monthly: monthlyConversion.map(m => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          totalUsers: m.totalUsers,
          referredUsers: m.referredUsers,
          conversionRate: parseFloat(m.conversionRate.toFixed(2))
        }))
      };
    } catch (error) {
      console.error('Error calculating referral conversion rate:', error);
      throw error;
    }
  }
}

module.exports = new CreditService();