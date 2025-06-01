// AI-Server/services/resultTrackingService.js - Two Phase Fixed Version
const lineService = require('./lineService');
const iqOptionService = require('./iqOptionService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class ResultTrackingService {
  constructor() {
    this.trackingSessions = new Map(); // เก็บข้อมูล session การติดตาม
    this.blockedUsers = new Set(); // เก็บ users ที่ถูก block
    this.pendingSessions = new Map(); // เก็บ session ที่รอเข้าเทรด
  }

  // 🎯 เริ่มติดตามผล (แบบ 2 Phase - แยกการส่งสัญญาณกับการติดตาม)
  async startTracking(userId, prediction, pair, entryTime) {
    try {
      console.log(`🎯 Starting TWO-PHASE tracking for user ${userId}`);
      console.log(`📊 ${pair} ${prediction} at ${entryTime}`);

      // สร้าง pending session (ยังไม่เริ่ม tracking)
      const pendingSession = {
        userId,
        pair,
        prediction,
        entryTime,
        createdAt: new Date()
      };

      this.pendingSessions.set(userId, pendingSession);

      // ส่งข้อความแจ้งสัญญาณ (ไม่ block user)
      const nextEntryTime = this.getNextTradeTime(entryTime);
      const checkTime = this.getCheckTime(nextEntryTime);
      
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🚀 สัญญาณ Binary Options\n\n📊 คู่เงิน: ${pair}\n💡 สัญญาณ: ${prediction}\n⏰ เข้าเทรดตอน: ${nextEntryTime}\n🔍 เช็คผลตอน: ${checkTime}\n\n⏳ บอทจะเริ่มติดตามผลเมื่อถึงเวลา...\n🎯 รอบที่: 1/7`
      });

      // คำนวณเวลารอจนถึงเวลาเข้าเทรด
      const waitTime = this.calculateWaitTime(nextEntryTime);
      
      console.log(`⏰ Entry time: ${nextEntryTime}`);
      console.log(`🕐 Check time: ${checkTime}`);
      console.log(`⏳ Wait time: ${Math.round(waitTime / 1000)} seconds`);

      if (waitTime > 0) {
        // Phase 1: รอจนถึงเวลาเข้าเทรด
        setTimeout(() => {
          this.startActualTracking(userId, nextEntryTime);
        }, waitTime);
      } else {
        // ถ้าเวลาผ่านไปแล้ว เริ่ม tracking ทันที
        console.log('⚠️ Entry time has passed, starting tracking immediately');
        this.startActualTracking(userId, nextEntryTime);
      }

      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      this.pendingSessions.delete(userId);
      throw error;
    }
  }

  // 📅 หาเวลาเข้าเทรดถัดไป (ถ้าเวลาผ่านไปแล้วให้ใช้รอบถัดไป)
  getNextTradeTime(entryTime) {
    try {
      const [hour, minute] = entryTime.split(':').map(Number);
      const now = new Date();
      const entryDateTime = new Date();
      entryDateTime.setHours(hour, minute, 0, 0);

      // ถ้าเวลาเข้าเทรดผ่านไปแล้ว ให้เลื่อนไปรอบถัดไป (+ 5 นาที)
      if (entryDateTime <= now) {
        entryDateTime.setMinutes(entryDateTime.getMinutes() + 5);
      }

      return entryDateTime.toTimeString().slice(0, 5); // "HH:MM"
    } catch (error) {
      console.error('Error calculating next trade time:', error);
      return entryTime;
    }
  }

  // 🕐 คำนวณเวลาเช็คผล (entryTime + 5 นาที)
  getCheckTime(entryTime) {
    try {
      const [hour, minute] = entryTime.split(':').map(Number);
      const entryDateTime = new Date();
      entryDateTime.setHours(hour, minute, 0, 0);
      
      // เพิ่ม 5 นาที
      const checkDateTime = new Date(entryDateTime.getTime() + 5 * 60 * 1000);
      
      return checkDateTime.toTimeString().slice(0, 5); // "HH:MM"
    } catch (error) {
      console.error('Error calculating check time:', error);
      return 'Unknown';
    }
  }

  // ⏳ คำนวณเวลาที่ต้องรอจนถึงเวลาเข้าเทรด
  calculateWaitTime(entryTime) {
    try {
      const [hour, minute] = entryTime.split(':').map(Number);
      const now = new Date();
      const entryDateTime = new Date();
      entryDateTime.setHours(hour, minute, 0, 0);

      // ถ้าเวลาข้ามวัน
      if (entryDateTime < now) {
        entryDateTime.setDate(entryDateTime.getDate() + 1);
      }

      const waitMs = entryDateTime.getTime() - now.getTime();
      return Math.max(0, waitMs);
    } catch (error) {
      console.error('Error calculating wait time:', error);
      return 5000; // default 5 วินาที
    }
  }

  // 🚀 เริ่ม tracking จริง (Phase 2 - เมื่อถึงเวลาเข้าเทรด)
  async startActualTracking(userId, entryTime) {
    try {
      const pendingSession = this.pendingSessions.get(userId);
      if (!pendingSession) {
        console.log(`❌ No pending session found for user ${userId}`);
        return;
      }

      console.log(`🚀 Starting ACTUAL tracking for user ${userId} at ${entryTime}`);

      // Block user และสร้าง active session
      this.blockedUsers.add(userId);
      
      const session = {
        userId: pendingSession.userId,
        pair: pendingSession.pair,
        prediction: pendingSession.prediction,
        entryTime,
        round: 1,
        maxRounds: 7,
        isActive: true,
        startedAt: new Date(),
        results: []
      };

      this.trackingSessions.set(userId, session);
      this.pendingSessions.delete(userId);

      // ส่งข้อความแจ้งเริ่ม tracking
      const checkTime = this.getCheckTime(entryTime);
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🎯 เริ่มติดตามผลแล้ว!\n\n📊 ${session.pair} ${session.prediction}\n⏰ เข้าเทรดตอน: ${entryTime}\n🔍 จะเช็คผลตอน: ${checkTime}\n\n⏳ รอผลในอีก 5 นาที...\n🎯 รอบที่: ${session.round}/${session.maxRounds}`
      });

      // ตั้งเวลาเช็คผลอีก 5 นาที
      setTimeout(() => {
        this.checkResult(userId);
      }, 5 * 60 * 1000); // 5 นาทีเต็ม

    } catch (error) {
      console.error('Error starting actual tracking:', error);
      this.pendingSessions.delete(userId);
      this.blockedUsers.delete(userId);
    }
  }

  // 🔍 เช็คผล (ไม่เปลี่ยนแปลง)
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

      // เรียก API ดูแท่งเทียน
      const candleResult = await iqOptionService.getCurrentCandle(session.pair);

      console.log(`📊 Candle result:`, candleResult);

      if (candleResult.error) {
        throw new Error(candleResult.error);
      }

      // ตรวจสอบผล
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
        await this.handleWin(userId, session, candleResult);
      } else {
        await this.handleLose(userId, session, candleResult);
      }

    } catch (error) {
      console.error(`❌ Error checking result for user ${userId}:`, error);
      
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `❌ เกิดข้อผิดพลาดในการเช็คผล\n\n💡 ${error.message}\n\n🔄 กำลังลองใหม่ในอีก 30 วินาที...`
      });

      setTimeout(() => {
        this.checkResult(userId);
      }, 30000);
    }
  }

  // ✅ ตรวจสอบชนะ/แพ้
  checkWinLose(prediction, candleColor) {
    if (prediction === 'CALL' && candleColor === 'green') {
      return true;
    }
    if (prediction === 'PUT' && candleColor === 'red') {
      return true;
    }
    return false;
  }

  // 🎉 จัดการเมื่อชนะ
  async handleWin(userId, session, candleResult) {
    try {
      console.log(`🎉 User ${userId} WON at round ${session.round}`);

      session.isActive = false;
      this.blockedUsers.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🎉 ยินดีด้วย! คุณชนะแล้ว!\n\n📊 ${session.pair} รอบที่ ${session.round}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${session.entryTime}\n🕯️ แท่งเทียนปิดตอน: ${candleResult.time}\n🎨 สีแท่งเทียน: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n\n🏆 ผลการเทรด: ชนะในรอบที่ ${session.round}`
      });

      const continueMessage = createContinueTradeMessage();
      await lineService.pushMessage(userId, continueMessage);

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

      if (session.round >= session.maxRounds) {
        await this.handleMaxRoundsReached(userId, session, candleResult);
        return;
      }

      session.round++;

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `❌ รอบที่ ${session.round - 1}: ไม่ถูกต้อง\n\n📊 ${session.pair}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${session.entryTime}\n🕯️ แท่งเทียนปิดตอน: ${candleResult.time}\n🎨 สีแท่งเทียน: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n\n🔄 ทำต่อรอบที่ ${session.round}/${session.maxRounds}\n⏳ ระบบจะเช็คผลในอีก 5 นาที...`
      });

      // รอบถัดไป - เช็คอีก 5 นาที
      setTimeout(() => {
        this.checkResult(userId);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Error handling lose:', error);
    }
  }

  // 💀 จัดการเมื่อแพ้ครบ 7 รอบ
  async handleMaxRoundsReached(userId, session, candleResult) {
    try {
      console.log(`💀 User ${userId} LOST all 7 rounds`);

      session.isActive = false;
      this.blockedUsers.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `💀 เสียใจด้วย แพ้ครบ 7 รอบแล้ว\n\n📊 ${session.pair}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${session.entryTime}\n🕯️ รอบสุดท้ายปิดตอน: ${candleResult.time}\n🎨 สีแท่งเทียน: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n\n📈 ลองใหม่ในครั้งหน้า!\n💪 อย่าท้อแท้ การเทรดต้องมีความอดทน`
      });

      const continueMessage = createContinueTradeMessage();
      await lineService.pushMessage(userId, continueMessage);

      setTimeout(() => {
        this.trackingSessions.delete(userId);
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('Error handling max rounds:', error);
    }
  }

  // 🚫 ตรวจสอบว่า user ถูก block หรือไม่
  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  // 📊 ดูข้อมูล session ปัจจุบัน
  getSession(userId) {
    return this.trackingSessions.get(userId);
  }

  // 📋 ดูข้อมูล pending session
  getPendingSession(userId) {
    return this.pendingSessions.get(userId);
  }

  // 🛑 จบการติดตามแบบ force
  forceStopTracking(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      session.isActive = false;
    }
    this.blockedUsers.delete(userId);
    this.trackingSessions.delete(userId);
    this.pendingSessions.delete(userId);
    console.log(`🛑 Force stopped tracking for user ${userId}`);
  }

  // 📈 ดูสถิติการติดตาม
  getTrackingStats() {
    return {
      activeSessions: this.trackingSessions.size,
      pendingSessions: this.pendingSessions.size,
      blockedUsers: this.blockedUsers.size,
      sessions: Array.from(this.trackingSessions.values()).map(session => ({
        userId: session.userId,
        pair: session.pair,
        prediction: session.prediction,
        round: session.round,
        isActive: session.isActive,
        startedAt: session.startedAt,
        entryTime: session.entryTime
      })),
      pending: Array.from(this.pendingSessions.values()).map(session => ({
        userId: session.userId,
        pair: session.pair,
        prediction: session.prediction,
        entryTime: session.entryTime,
        createdAt: session.createdAt
      }))
    };
  }

  // 🚫 จัดการคำสั่งจาก user ระหว่างติดตาม
  async handleBlockedUserMessage(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      const checkTime = this.getCheckTime(session.entryTime);
      return lineService.pushMessage(userId, {
        type: 'text',
        text: `🚫 คุณกำลังติดตามผลอยู่\n\n📊 ${session.pair} รอบที่ ${session.round}/${session.maxRounds}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${session.entryTime}\n🔍 เช็คผลตอน: ${checkTime}\n\n⏳ กรุณารอจนกว่าการติดตามจะเสร็จสิ้น\n\n💡 หากต้องการยกเลิก พิมพ์ "ยกเลิกติดตาม"`
      });
    }

    // ตรวจสอบ pending session
    const pendingSession = this.pendingSessions.get(userId);
    if (pendingSession) {
      const nextEntryTime = this.getNextTradeTime(pendingSession.entryTime);
      const checkTime = this.getCheckTime(nextEntryTime);
      return lineService.pushMessage(userId, {
        type: 'text',
        text: `⏳ รอเวลาเข้าเทรด\n\n📊 ${pendingSession.pair}\n💡 คาดการณ์: ${pendingSession.prediction}\n⏰ เข้าเทรดตอน: ${nextEntryTime}\n🔍 เช็คผลตอน: ${checkTime}\n\n💡 บอทจะเริ่มติดตามผลเมื่อถึงเวลา\n\n💡 หากต้องการยกเลิก พิมพ์ "ยกเลิกติดตาม"`
      });
    }
  }

  // ✋ ยกเลิกการติดตาม
  async cancelTracking(userId) {
    const session = this.trackingSessions.get(userId);
    const pendingSession = this.pendingSessions.get(userId);
    
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

    if (pendingSession) {
      this.pendingSessions.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `✅ ยกเลิกการรอเข้าเทรดแล้ว\n\n📊 ${pendingSession.pair}\n💡 คาดการณ์: ${pendingSession.prediction}\n⏰ เข้าเทรดตอน: ${pendingSession.entryTime}\n\n💡 คุณสามารถใช้งานคำสั่งอื่นได้แล้ว`
      });

      return true;
    }
    
    return false;
  }

  // 🔧 Helper method สำหรับ debug
  async debugTracking(userId) {
    try {
      console.log(`🔧 Debug tracking for user ${userId}`);
      
      const session = this.trackingSessions.get(userId);
      const pendingSession = this.pendingSessions.get(userId);
      
      return {
        session,
        pendingSession,
        isBlocked: this.isUserBlocked(userId),
        currentTime: new Date().toLocaleTimeString('th-TH', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Bangkok'
        })
      };
    } catch (error) {
      console.error('Debug error:', error);
      return { error: error.message };
    }
  }
}

module.exports = new ResultTrackingService();