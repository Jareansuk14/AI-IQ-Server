// AI-Server/services/resultTrackingService.js - Simplified Version
const lineService = require('./lineService');
const iqOptionService = require('./iqOptionService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class ResultTrackingService {
  constructor() {
    this.trackingSessions = new Map(); // เก็บข้อมูล session การติดตาม
    this.blockedUsers = new Set(); // เก็บ users ที่ถูก block
  }

  // 🎯 เริ่มติดตามผล (แบบเรียบง่าย)
  async startTracking(userId, prediction, pair, entryTime) {
    try {
      console.log(`🎯 Starting simple tracking for user ${userId}`);
      console.log(`📊 ${pair} ${prediction} at ${entryTime}`);

      // Block user จากการใช้คำสั่งอื่น
      this.blockedUsers.add(userId);

      // สร้าง tracking session แบบง่าย
      const session = {
        userId,
        pair,
        prediction, // CALL หรือ PUT
        entryTime,  // เช่น "14:00"
        round: 1,
        maxRounds: 7,
        isActive: true,
        startedAt: new Date(),
        results: []
      };

      this.trackingSessions.set(userId, session);

      // ส่งข้อความแจ้งให้เข้าเทรด
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🚀 เข้าเทรดเลย!\n\n📊 คู่เงิน: ${pair}\n💡 สัญญาณ: ${prediction}\n⏰ เข้าเทรดตอน: ${entryTime}\n\n⏳ ระบบจะเช็คผลในอีก 5 นาที...\n🎯 รอบที่: 1/7`
      });

      // ตั้งเวลาเช็คผลใน 5 นาที (เรียบง่าย)
      setTimeout(() => {
        this.checkResult(userId);
      }, 5 * 60 * 1000); // 5 นาที = 300,000 ms

      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      // Remove block ถ้าเกิด error
      this.blockedUsers.delete(userId);
      this.trackingSessions.delete(userId);
      throw error;
    }
  }

  // 🔍 เช็คผลแบบเรียบง่าย
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

      // 🎯 เรียก API แบบง่าย - ดูแท่งเทียนปัจจุบัน
      const candleResult = await iqOptionService.getCurrentCandle(session.pair);

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
        time: new Date(),
        entryTime: session.entryTime,
        checkTime: candleResult.time
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

  // ✅ ตรวจสอบชนะ/แพ้ (เหมือนเดิม)
  checkWinLose(prediction, candleColor) {
    if (prediction === 'CALL' && candleColor === 'green') {
      return true; // ทำนาย CALL และแท่งเขียว = ชนะ
    }
    if (prediction === 'PUT' && candleColor === 'red') {
      return true; // ทำนาย PUT และแท่งแดง = ชนะ
    }
    return false; // อื่นๆ = แพ้
  }

  // 🎉 จัดการเมื่อชนะ
  async handleWin(userId, session, candleResult) {
    try {
      console.log(`🎉 User ${userId} WON at round ${session.round}`);

      // ปิด session
      session.isActive = false;
      this.blockedUsers.delete(userId);

      // คำนวณเวลาเข้าเทรดจริงและเวลาเช็คผล
      const entryTimeDisplay = session.entryTime;
      const checkTimeDisplay = candleResult.time;

      // ส่งข้อความแสดงความยินดี
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🎉 ยินดีด้วย! คุณชนะแล้ว!\n\n📊 ${session.pair} รอบที่ ${session.round}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${entryTimeDisplay}\n🕯️ แท่งเทียนปิดตอน: ${checkTimeDisplay}\n🎨 สีแท่งเทียน: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n\n🏆 ผลการเทรด: ชนะในรอบที่ ${session.round}`
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

  // ❌ จัดการเมื่อแพ้
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

      const entryTimeDisplay = session.entryTime;
      const checkTimeDisplay = candleResult.time;

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `❌ รอบที่ ${session.round - 1}: ไม่ถูกต้อง\n\n📊 ${session.pair}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${entryTimeDisplay}\n🕯️ แท่งเทียนปิดตอน: ${checkTimeDisplay}\n🎨 สีแท่งเทียน: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n\n🔄 ทำต่อรอบที่ ${session.round}/${session.maxRounds}\n⏳ ระบบจะเช็คผลในอีก 5 นาที...`
      });

      // 🎯 ตั้งเวลาสำหรับเช็ครอบถัดไป (อีก 5 นาที)
      setTimeout(() => {
        this.checkResult(userId);
      }, 5 * 60 * 1000); // 5 นาที

    } catch (error) {
      console.error('Error handling lose:', error);
    }
  }

  // 💀 จัดการเมื่อแพ้ครบ 7 รอบ
  async handleMaxRoundsReached(userId, session, candleResult) {
    try {
      console.log(`💀 User ${userId} LOST all 7 rounds`);

      // ปิด session
      session.isActive = false;
      this.blockedUsers.delete(userId);

      const entryTimeDisplay = session.entryTime;
      const checkTimeDisplay = candleResult.time;

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `💀 เสียใจด้วย แพ้ครบ 7 รอบแล้ว\n\n📊 ${session.pair}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${entryTimeDisplay}\n🕯️ รอบสุดท้ายปิดตอน: ${checkTimeDisplay}\n🎨 สีแท่งเทียน: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n\n📈 ลองใหม่ในครั้งหน้า!\n💪 อย่าท้อแท้ การเทรดต้องมีความอดทน`
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

  // 🚫 ตรวจสอบว่า user ถูก block หรือไม่ (เหมือนเดิม)
  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  // 📊 ดูข้อมูล session ปัจจุบัน (เหมือนเดิม)
  getSession(userId) {
    return this.trackingSessions.get(userId);
  }

  // 🛑 จบการติดตามแบบ force (เหมือนเดิม)
  forceStopTracking(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      session.isActive = false;
    }
    this.blockedUsers.delete(userId);
    this.trackingSessions.delete(userId);
    console.log(`🛑 Force stopped tracking for user ${userId}`);
  }

  // 📈 ดูสถิติการติดตาม (เหมือนเดิม)
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
        startedAt: session.startedAt,
        entryTime: session.entryTime
      }))
    };
  }

  // 🚫 จัดการคำสั่งจาก user ระหว่างติดตาม (เหมือนเดิม)
  async handleBlockedUserMessage(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      return lineService.pushMessage(userId, {
        type: 'text',
        text: `🚫 คุณกำลังติดตามผลอยู่\n\n📊 ${session.pair} รอบที่ ${session.round}/${session.maxRounds}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${session.entryTime}\n\n⏳ กรุณารอจนกว่าการติดตามจะเสร็จสิ้น\n\n💡 หากต้องการยกเลิก พิมพ์ "ยกเลิกติดตาม"`
      });
    }
  }

  // ✋ ยกเลิกการติดตาม (เหมือนเดิม)
  async cancelTracking(userId) {
    const session = this.trackingSessions.get(userId);
    if (session && session.isActive) {
      session.isActive = false;
      this.blockedUsers.delete(userId);
      this.trackingSessions.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `✅ ยกเลิกการติดตามผลแล้ว\n\n📊 ${session.pair} รอบที่ ${session.round}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${session.entryTime}\n\n💡 คุณสามารถใช้งานคำสั่งอื่นได้แล้ว`
      });

      return true;
    }
    return false;
  }
}

module.exports = new ResultTrackingService();