//AI-Server/services/creditService.js - โค้ดทั้งหมด

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

  // === ฟังก์ชันระบบแชร์ใหม่ ===

  // 🆕 ติดตามการคลิกลิงก์แชร์
  async trackReferralClick(referralCode, clickerInfo = {}) {
    try {
      console.log(`📊 Tracking referral click for code: ${referralCode}`);
      
      // หาเจ้าของรหัส
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        console.log(`❌ Referral code ${referralCode} not found`);
        return null;
      }

      // บันทึกการคลิก (อาจจะสร้าง model ReferralClick แยก)
      console.log(`✅ Referral click tracked: ${referralCode} by ${clickerInfo.ip || 'unknown'}`);
      
      return {
        referrer: {
          lineUserId: referrer.lineUserId,
          displayName: referrer.displayName
        },
        clickTimestamp: new Date()
      };
    } catch (error) {
      console.error('Error tracking referral click:', error);
      return null;
    }
  }

  // 🆕 ใช้รหัสแนะนำผ่านลิงก์ (สำหรับผู้ใช้ใหม่)
  async applyReferralCodeFromLink(userId, referralCode) {
    try {
      console.log(`🔗 Applying referral from link: ${userId} using ${referralCode}`);
      
      // ตรวจสอบผู้ใช้ปัจจุบัน
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }

      // ตรวจสอบว่าเป็นผู้ใช้ใหม่หรือไม่ (สร้างไม่เกิน 5 นาที)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (user.firstInteraction < fiveMinutesAgo) {
        console.log('❌ User is not new, referral code from link rejected');
        throw new Error('รหัสแนะนำใช้ได้เฉพาะผู้ใช้ใหม่เท่านั้น');
      }

      // ใช้ฟังก์ชันเดิม
      return await this.applyReferralCode(userId, referralCode);
    } catch (error) {
      console.error('Error applying referral code from link:', error);
      throw error;
    }
  }

  // 🆕 สร้างลิงก์แชร์พร้อม tracking
  generateShareLink(referralCode, platform = 'line') {
    const botLineId = '@033mebpp'; // LINE Bot ID ของคุณ
    const baseUrl = process.env.BASE_URL || 'https://yourbot.com';
    
    const shareLinks = {
      line: `https://line.me/R/ti/p/${botLineId}?from=invite&ref=${referralCode}`,
      direct: `${baseUrl}/invite?ref=${referralCode}`,
      qr: `${baseUrl}/api/referral/qr/${referralCode}`
    };
    
    return shareLinks[platform] || shareLinks.line;
  }

  // 🆕 สถิติการแชร์
  async getReferralStats(userId) {
    try {
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      // จำนวนคนที่ใช้รหัสแนะนำ
      const referredCount = await User.countDocuments({ 
        referredBy: user.referralCode 
      });

      // เครดิตที่ได้จากการแนะนำ
      const referralCredits = await CreditTransaction.aggregate([
        { 
          $match: { 
            user: user._id,
            type: 'referral'
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } }}
      ]);

      // รายชื่อคนที่แนะนำ (5 คนล่าสุด)
      const referredUsers = await User.find({ 
        referredBy: user.referralCode 
      })
      .select('displayName firstInteraction')
      .sort({ firstInteraction: -1 })
      .limit(5);

      return {
        referralCode: user.referralCode,
        referredCount,
        totalCreditsEarned: referralCredits[0]?.total || 0,
        recentReferrals: referredUsers,
        shareLink: this.generateShareLink(user.referralCode)
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      throw error;
    }
  }

  // 🆕 ตรวจสอบความถูกต้องของรหัสแนะนำ
  async validateReferralCode(referralCode) {
    try {
      const owner = await User.findOne({ referralCode });
      
      if (!owner) {
        return {
          valid: false,
          reason: 'รหัสแนะนำไม่ถูกต้อง'
        };
      }

      return {
        valid: true,
        owner: {
          displayName: owner.displayName,
          lineUserId: owner.lineUserId
        }
      };
    } catch (error) {
      console.error('Error validating referral code:', error);
      return {
        valid: false,
        reason: 'เกิดข้อผิดพลาดในการตรวจสอบ'
      };
    }
  }

  // 🆕 สร้าง QR Code สำหรับแชร์
  async generateReferralQR(referralCode) {
    try {
      const shareLink = this.generateShareLink(referralCode);
      
      // ใช้ qrCodeService แต่แทนที่จะเป็น PromptPay ให้เป็น URL
      const QRCode = require('qrcode');
      
      const qrCodeDataURL = await QRCode.toDataURL(shareLink, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512
      });

      return {
        qrCodeDataURL,
        shareLink,
        referralCode
      };
    } catch (error) {
      console.error('Error generating referral QR:', error);
      throw error;
    }
  }

  // ใช้รหัสแนะนำ (อัปเดตใหม่)
  async applyReferralCode(userId, referralCode) {
    try {
      console.log(`📝 Applying referral code: ${userId} using ${referralCode}`);
      
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

      console.log(`✅ Referral success: ${user.lineUserId} (+5) via ${referrer.lineUserId} (+10)`);

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
        referred: true,
        referrerName: referrer.displayName
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