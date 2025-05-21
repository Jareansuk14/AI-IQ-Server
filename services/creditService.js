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
      user.credits += 5; // ผู้ถูกแนะนำได้รับเพิ่ม 5 เครดิต (รวมเป็น 15)
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