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

  // เพิ่มเครดิตโดยแอดมิน
  async addCreditByAdmin(userId, amount, reason, adminId) {
    try {
      console.log(`Admin ${adminId} adding ${amount} credits to user ${userId}`);
      
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      const previousCredits = user.credits;
      user.credits += amount;
      await user.save();

      // บันทึกธุรกรรมพร้อมระบุว่าเป็นการเพิ่มโดยแอดมิน
      await CreditTransaction.create({
        user: user._id,
        amount,
        type: 'admin_add', // ประเภทใหม่สำหรับการเพิ่มโดยแอดมิน
        description: reason,
        addedByAdmin: adminId // เพิ่ม field ใหม่ในโมเดล
      });

      console.log(`Credits updated: ${previousCredits} -> ${user.credits} for user ${userId}`);

      // ส่งการแจ้งเตือนไปยัง LINE (ถ้ามี lineService)
      try {
        await lineService.pushMessage(userId, {
          type: 'text',
          text: `🎁 ยินดีด้วย! คุณได้รับเครดิตเพิ่ม ${amount} เครดิต\n\n💎 เครดิตปัจจุบัน: ${user.credits} เครดิต\n📝 หมายเหตุ: ${reason}\n\n✨ ขอบคุณที่ใช้บริการ!`
        });
        console.log(`Notification sent to user ${userId}`);
      } catch (notificationError) {
        console.error('Error sending credit notification:', notificationError);
        // ไม่ throw error เพราะการเพิ่มเครดิตสำเร็จแล้ว
        // แค่การส่งแจ้งเตือนที่ล้มเหลว
      }

      return user.credits;
    } catch (error) {
      console.error('Error adding credit by admin:', error);
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

  // === ฟังก์ชันเดิมที่มีอยู่แล้ว ===

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
}

module.exports = new CreditService();