//AI-Server/services/resultTrackingService.js
const lineService = require('./lineService');
const iqOptionService = require('./iqOptionService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class ResultTrackingService {
  constructor() {
    this.trackingSessions = new Map(); // เก็บข้อมูล session การติดตาม
    this.blockedUsers = new Set(); // เก็บ users ที่ถูก block
  }

  // เริ่มต้นการติดตามผล
  async startTracking(userId, prediction, pair, entryTime) {
    try {
      console.log(`🎯 Starting result tracking for user ${userId}`);
      console.log(`📊 ${pair} ${prediction} at ${entryTime}`);

      // Block user จากการใช้คำสั่งอื่น
      this.blockedUsers.add(userId);

      // สร้าง tracking session
      const session = {
        userId,
        pair,
        prediction, // CALL หรือ PUT
        entryTime,
        round: 1,
        maxRounds: 7,
        isActive: true,
        startedAt: new Date(),
        results: []
      };

      this.trackingSessions.set(userId, session);

      // ส่งข้อความแจ้งว่ากำลังติดตามผล
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🔍 กำลังติดตามผล ${pair}\n\n📊 คาดการณ์: ${prediction}\n⏰ เข้าเทรดตอน: ${entryTime}\n🎯 รอบที่: 1/7\n\n⏳ รอจนถึงเวลาปิดแท่งเทียน...`
      });

      // คำนวณเวลาที่ต้องเช็คผล
      const checkTime = this.calculateCheckTime(entryTime, 1);
      const delayMs = checkTime.getTime() - Date.now();

      console.log(`⏰ Will check result at: ${checkTime.toISOString()}`);
      console.log(`🌍 Local time: ${checkTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      console.log(`⏱️ Delay: ${Math.round(delayMs / 1000)} seconds`);

      // ตั้ง timeout เพื่อเช็คผลครั้งแรก
      setTimeout(() => {
        this.checkResult(userId);
      }, delayMs);

      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      // Remove block ถ้าเกิด error
      this.blockedUsers.delete(userId);
      this.trackingSessions.delete(userId);
      throw error;
    }
  }

  // คำนวณเวลาที่ต้องเช็คผล (ปรับปรุงใหม่)
  calculateCheckTime(entryTimeStr, round) {
    try {
      const now = new Date();
      
      // สำหรับรอบแรก: ใช้เวลาปัจจุบัน + 5 นาที
      // สำหรับรอบถัดไป: ใช้เวลาปัจจุบัน + (5 * รอบ) นาที
      const delayMinutes = 5 * round;
      const checkTime = new Date(now.getTime() + (delayMinutes * 60 * 1000));
      
      console.log(`🕐 Current time: ${now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      console.log(`🎯 Check time (Bangkok): ${checkTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      console.log(`⏱️ Delay: ${delayMinutes} minutes`);
      
      return checkTime;
      
    } catch (error) {
      console.error('Error calculating check time:', error);
      // Fallback: ใช้เวลาปัจจุบัน + 5 นาที
      return new Date(Date.now() + (5 * 60 * 1000));
    }
  }

  // เช็คผลจาก IQ Option
  async checkResult(userId) {
    try {
      const session = this.trackingSessions.get(userId);
      if (!session || !session.isActive) {
        console.log(`❌ Session not found or inactive for user ${userId}`);
        return;
      }

      console.log(`🔍 Checking result for user ${userId}, round ${session.round}`);

      // ส่งข้อความแจ้งว่ากำลังเช็คผล
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🔍 กำลังเช็คผลรอบที่ ${session.round}...\n⏳ กรุณารอสักครู่`
      });

      // สร้าง datetime string สำหรับ Python script
      const targetDateTime = this.createTargetDateTime(session.entryTime, session.round);

      // เรียก IQ Option API เพื่อดูแท่งเทียน
      const candleResult = await iqOptionService.getCandleColor(
        session.pair,
        targetDateTime, // ส่ง full datetime แทน
        session.round
      );

      console.log(`📊 Candle result:`, candleResult);

      if (candleResult.error) {
        throw new Error(candleResult.error);
      }

      // ตรวจสอบผลว่าชนะหรือแพ้
      const isWin = this.checkWinLose(session.prediction, candleResult.color);
      
      // บันทึกผล
      session.results.push({
        round: session.round,
        candleColor: candleResult.color,
        prediction: session.prediction,
        isWin,
        time: new Date()
      });

      if (isWin) {
        // ชนะ - จบการติดตาม
        await this.handleWin(userId, session, candleResult);
      } else {
        // แพ้ - ตรวจสอบว่าจะทำต่อหรือไม่
        await this.handleLose(userId, session, candleResult);
      }

    } catch (error) {
      console.error(`❌ Error checking result for user ${userId}:`, error);
      
      // ส่งข้อความแจ้งข้อผิดพลาด
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `❌ เกิดข้อผิดพลาดในการเช็คผล\n\n💡 ${error.message}\n\n🔄 กำลังลองใหม่ในอีก 30 วินาที...`
      });

      // ลองใหม่ในอีก 30 วินาที
      setTimeout(() => {
        this.checkResult(userId);
      }, 30000);
    }
  }

  // สร้าง target datetime string สำหรับ Python script
  createTargetDateTime(entryTimeStr, round) {
    try {
      const now = new Date();
      
      // สำหรับการเช็คผล: ใช้เวลาปัจจุบัน + (5 * รอบ) นาที
      const delayMinutes = 5 * round;
      const targetTime = new Date(now.getTime() + (delayMinutes * 60 * 1000));
      
      // แปลงเป็นเวลาไทย
      const bangkokTime = new Date(targetTime.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      
      // Format เป็น string ในรูปแบบ "YYYY-MM-DD HH:MM"
      const year = bangkokTime.getFullYear();
      const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
      const day = String(bangkokTime.getDate()).padStart(2, '0');
      const hour = String(bangkokTime.getHours()).padStart(2, '0');
      const minute = String(bangkokTime.getMinutes()).padStart(2, '0');
      
      const targetDateTime = `${year}-${month}-${day} ${hour}:${minute}`;
      
      console.log(`🎯 Target datetime for round ${round}: ${targetDateTime} (Bangkok time)`);
      
      return targetDateTime;
      
    } catch (error) {
      console.error('Error creating target datetime:', error);
      // Fallback: ใช้เวลาปัจจุบัน
      const now = new Date();
      const bangkokTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      return bangkokTime.toISOString().slice(0, 16).replace('T', ' ');
    }
  }

  // ตรวจสอบชนะ/แพ้
  checkWinLose(prediction, candleColor) {
    if (prediction === 'CALL' && candleColor === 'green') {
      return true; // ทำนาย CALL และแท่งเขียว = ชนะ
    }
    if (prediction === 'PUT' && candleColor === 'red') {
      return true; // ทำนาย PUT และแท่งแดง = ชนะ
    }
    return false; // อื่นๆ = แพ้
  }

  // จัดการเมื่อชนะ
  async handleWin(userId, session, candleResult) {
    try {
      console.log(`🎉 User ${userId} WON at round ${session.round}`);

      // ปิด session
      session.isActive = false;
      this.blockedUsers.delete(userId);

      // ส่งข้อความแสดงความยินดี
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🎉 ยินดีด้วย! คุณชนะแล้ว!\n\n📊 ${session.pair} รอบที่ ${session.round}\n🎯 คาดการณ์: ${session.prediction}\n🕯️ แท่งเทียนปิด: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n⏰ เวลา: ${candleResult.time}\n\n🏆 ผลการเทรด: ชนะในรอบที่ ${session.round}`
      });

      // ส่งการ์ดถามว่าจะเทรดต่อหรือไม่
      const continueMessage = createContinueTradeMessage();
      await lineService.pushMessage(userId, continueMessage);

      // ลบ session หลังจาก 1 ชั่วโมง (cleanup)
      setTimeout(() => {
        this.trackingSessions.delete(userId);
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('Error handling win:', error);
    }
  }

  // จัดการเมื่อแพ้
  async handleLose(userId, session, candleResult) {
    try {
      console.log(`❌ User ${userId} LOST at round ${session.round}`);

      // ตรวจสอบว่าครบ 7 รอบหรือยัง
      if (session.round >= session.maxRounds) {
        // แพ้ครบ 7 รอบ - จบการติดตาม
        await this.handleMaxRoundsReached(userId, session, candleResult);
        return;
      }

      // ยังไม่ครบ 7 รอบ - ทำต่อ
      session.round++;

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `❌ รอบที่ ${session.round - 1}: ไม่ถูกต้อง\n\n📊 ${session.pair}\n🎯 คาดการณ์: ${session.prediction}\n🕯️ แท่งเทียนปิด: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n\n🔄 ทำต่อรอบที่ ${session.round}/${session.maxRounds}\n⏳ รอแท่งเทียนถัดไป...`
      });

      // คำนวณเวลาสำหรับรอบถัดไป
      const nextCheckTime = this.calculateCheckTime(session.entryTime, session.round);
      const delayMs = nextCheckTime.getTime() - Date.now();

      console.log(`⏰ Next check in ${Math.round(delayMs / 1000)} seconds`);

      // ตั้งเวลาสำหรับเช็ครอบถัดไป
      setTimeout(() => {
        this.checkResult(userId);
      }, delayMs);

    } catch (error) {
      console.error('Error handling lose:', error);
    }
  }

  // จัดการเมื่อแพ้ครบ 7 รอบ
  async handleMaxRoundsReached(userId, session, candleResult) {
    try {
      console.log(`💀 User ${userId} LOST all 7 rounds`);

      // ปิด session
      session.isActive = false;
      this.blockedUsers.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `💀 เสียใจด้วย แพ้ครบ 7 รอบแล้ว\n\n📊 ${session.pair}\n🎯 คาดการณ์: ${session.prediction}\n🕯️ รอบสุดท้าย: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n\n📈 ลองใหม่ในครั้งหน้า!\n💪 อย่าท้อแท้ การเทรดต้องมีความอดทน`
      });

      // ส่งการ์ดถามว่าจะเทรดต่อหรือไม่
      const continueMessage = createContinueTradeMessage();
      await lineService.pushMessage(userId, continueMessage);

      // ลบ session
      setTimeout(() => {
        this.trackingSessions.delete(userId);
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('Error handling max rounds:', error);
    }
  }

  // ตรวจสอบว่า user ถูก block หรือไม่
  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  // ดูข้อมูล session ปัจจุบัน
  getSession(userId) {
    return this.trackingSessions.get(userId);
  }

  // จบการติดตามแบบ force (กรณีเกิดปัญหา)
  forceStopTracking(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      session.isActive = false;
    }
    this.blockedUsers.delete(userId);
    this.trackingSessions.delete(userId);
    console.log(`🛑 Force stopped tracking for user ${userId}`);
  }

  // ดูสถิติการติดตาม
  getTrackingStats() {
    return {
      activeSessions: this.trackingSessions.size,
      blockedUsers: this.blockedUsers.size,
      sessions: Array.from(this.trackingSessions.values()).map(session => ({
        userId: session.userId,
        pair: session.pair,
        prediction: session.prediction,
        round: session.round,
        isActive: session.isActive,
        startedAt: session.startedAt
      }))
    };
  }

  // จัดการคำสั่งจาก user ระหว่างติดตาม
  async handleBlockedUserMessage(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      return lineService.pushMessage(userId, {
        type: 'text',
        text: `🚫 คุณกำลังติดตามผลอยู่\n\n📊 ${session.pair} รอบที่ ${session.round}/${session.maxRounds}\n🎯 คาดการณ์: ${session.prediction}\n\n⏳ กรุณารอจนกว่าการติดตามจะเสร็จสิ้น\n\n💡 หากต้องการยกเลิก พิมพ์ "ยกเลิกติดตาม"`
      });
    }
  }

  // ยกเลิกการติดตาม (user request)
  async cancelTracking(userId) {
    const session = this.trackingSessions.get(userId);
    if (session && session.isActive) {
      session.isActive = false;
      this.blockedUsers.delete(userId);
      this.trackingSessions.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `✅ ยกเลิกการติดตามผลแล้ว\n\n📊 ${session.pair} รอบที่ ${session.round}\n🎯 คาดการณ์: ${session.prediction}\n\n💡 คุณสามารถใช้งานคำสั่งอื่นได้แล้ว`
      });

      return true;
    }
    return false;
  }
}

module.exports = new ResultTrackingService();