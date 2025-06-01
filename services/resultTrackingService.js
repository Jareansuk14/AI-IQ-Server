// AI-Server/services/resultTrackingService.js - Fixed Version (ยึดเวลาผู้ใช้เข้าเทรดเป็นหลัก)
const lineService = require('./lineService');
const iqOptionService = require('./iqOptionService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class ResultTrackingService {
  constructor() {
    this.trackingSessions = new Map(); // เก็บข้อมูล session การติดตาม
    this.blockedUsers = new Set(); // เก็บ users ที่ถูก block
  }

  // 🇹🇭 Helper: สร้าง Date object ใน Asia/Bangkok timezone
  getBangkokTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
  }

  // 🇹🇭 Helper: แปลง Date เป็น Bangkok time string
  formatBangkokTime(date, options = { hour: '2-digit', minute: '2-digit' }) {
    return date.toLocaleTimeString('th-TH', options);
  }

  // 🎯 เริ่มติดตามผล (แก้ไขแล้ว - ยึดเวลาผู้ใช้เข้าเทรดเป็นหลัก)
  async startTracking(userId, prediction, pair, entryTime) {
    try {
      console.log(`🎯 Starting tracking for user ${userId}`);
      console.log(`📊 ${pair} ${prediction} at ${entryTime}`);

      // Block user จากการใช้คำสั่งอื่น
      this.blockedUsers.add(userId);

      // สร้าง session แบบง่าย
      const session = {
        userId,
        pair,
        prediction, // CALL หรือ PUT
        entryTime,  // เช่น "14:05"
        round: 1,
        maxRounds: 7,
        isActive: true,
        startedAt: this.getBangkokTime(), // Bangkok timezone
        results: []
      };

      this.trackingSessions.set(userId, session);

      // ส่งข้อความแจ้งให้เข้าเทรด
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🚀 เข้าเทรดเลย!\n\n📊 คู่เงิน: ${pair}\n💡 สัญญาณ: ${prediction}\n⏰ เข้าเทรดตอน: ${entryTime}\n\n⏳ ระบบจะเช็คผลในอีก 5 นาที...\n🎯 รอบที่: 1/7`
      });

      // 🎯 คำนวณเวลาให้ถูกต้อง - ยึดเวลาผู้ใช้เข้าเทรดเป็นหลัก
      const delayMs = this.calculateCheckDelay(entryTime);
      
      console.log(`🕐 Will check result at: ${this.getCheckTimeDisplay(entryTime)}`);
      console.log(`⏳ Delay: ${Math.round(delayMs / 1000)} seconds`);

      // ตั้งเวลาเช็คผลให้ถูกต้อง
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

  // 🧮 คำนวณเวลาที่ต้องรอก่อนเช็คผล (ใช้ Asia/Bangkok ทั้งหมด)
  calculateCheckDelay(entryTime) {
    try {
      // 🇹🇭 ใช้ Asia/Bangkok timezone ทั้งหมด
      const bangkokNow = this.getBangkokTime();
      const currentTime = this.formatBangkokTime(bangkokNow);
      
      console.log(`📊 Current time (Bangkok): ${currentTime}`);
      console.log(`⏰ Entry time: ${entryTime}`);
      
      // แปลง entryTime เป็น Date object ใน Bangkok timezone
      const [entryHour, entryMinute] = entryTime.split(':').map(Number);
      
      // สร้าง entryDateTime ใน Bangkok timezone
      const entryDateTime = new Date(bangkokNow);
      entryDateTime.setHours(entryHour, entryMinute, 0, 0);
      
      // ถ้าเวลาเข้าเทรดผ่านไปแล้วในวันนี้ ให้เลื่อนไปวันถัดไป
      if (entryDateTime <= bangkokNow) {
        entryDateTime.setDate(entryDateTime.getDate() + 1);
        console.log(`📅 Entry time moved to next day: ${this.formatBangkokTime(entryDateTime, { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`);
      }
      
      // คำนวณเวลาเช็คผล (entryTime + 5 นาที) ใน Bangkok timezone
      const checkDateTime = new Date(entryDateTime.getTime() + 5 * 60 * 1000);
      
      // คำนวณระยะเวลาที่ต้องรอ
      let delayMs = checkDateTime.getTime() - bangkokNow.getTime();
      
      console.log(`🕐 Entry DateTime (Bangkok): ${this.formatBangkokTime(entryDateTime)}`);
      console.log(`🔍 Check DateTime (Bangkok): ${this.formatBangkokTime(checkDateTime)}`);
      console.log(`⏳ Raw delay: ${delayMs} ms (${Math.round(delayMs / 1000)} seconds)`);
      
      // ถ้าเวลาผ่านไปแล้ว ให้เช็คใน 5 วินาที
      if (delayMs <= 0) {
        console.log('⚠️ Check time has passed, will check in 5 seconds');
        delayMs = 5000;
      }
      
      return delayMs;
    } catch (error) {
      console.error('❌ Error calculating delay:', error);
      // ถ้าเกิด error ให้เช็คใน 5 นาที (default)
      return 5 * 60 * 1000;
    }
  }

  // 🕐 แสดงเวลาที่จะเช็คผล (ใช้ Asia/Bangkok ทั้งหมด)
  getCheckTimeDisplay(entryTime) {
    try {
      // 🇹🇭 ใช้ Asia/Bangkok timezone ทั้งหมด
      const bangkokNow = this.getBangkokTime();
      
      const [entryHour, entryMinute] = entryTime.split(':').map(Number);
      
      // สร้าง entryDateTime ใน Bangkok timezone
      const entryDateTime = new Date(bangkokNow);
      entryDateTime.setHours(entryHour, entryMinute, 0, 0);
      
      // ถ้าเวลาเข้าเทรดผ่านไปแล้วในวันนี้ ให้เลื่อนไปวันถัดไป
      if (entryDateTime <= bangkokNow) {
        entryDateTime.setDate(entryDateTime.getDate() + 1);
      }
      
      // คำนวณเวลาเช็คผล (entryTime + 5 นาที)
      const checkDateTime = new Date(entryDateTime.getTime() + 5 * 60 * 1000);
      
      return this.formatBangkokTime(checkDateTime);
    } catch (error) {
      return 'Unknown';
    }
  }

  // 🔍 เช็คผลแบบเรียบง่าย (ไม่เปลี่ยน)
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
        time: this.getBangkokTime(), // Bangkok timezone
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

  // 🎉 จัดการเมื่อชนะ (ไม่เปลี่ยน)
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

  // ❌ จัดการเมื่อแพ้ (แก้ไขการคำนวณเวลา)
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

      // 🎯 รอบถัดไป - คำนวณเวลาใหม่จากเวลาปัจจุบัน + 5 นาที
      const nextCheckDelay = 5 * 60 * 1000; // 5 นาทีเต็ม
      
      console.log(`🔄 Next check in ${nextCheckDelay / 1000} seconds`);
      
      setTimeout(() => {
        this.checkResult(userId);
      }, nextCheckDelay);

    } catch (error) {
      console.error('Error handling lose:', error);
    }
  }

  // 💀 จัดการเมื่อแพ้ครบ 7 รอบ (ไม่เปลี่ยน)
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

  // 📈 ดูสถิติการติดตาม (เพิ่มข้อมูลเวลาเช็คผล)
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
        entryTime: session.entryTime,
        nextCheckTime: session.entryTime ? this.getCheckTimeDisplay(session.entryTime) : 'Unknown'
      }))
    };
  }

  // 🚫 จัดการคำสั่งจาก user ระหว่างติดตาม (เหมือนเดิม)
  async handleBlockedUserMessage(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      const nextCheckTime = this.getCheckTimeDisplay(session.entryTime);
      return lineService.pushMessage(userId, {
        type: 'text',
        text: `🚫 คุณกำลังติดตามผลอยู่\n\n📊 ${session.pair} รอบที่ ${session.round}/${session.maxRounds}\n💡 คาดการณ์: ${session.prediction}\n⏰ เข้าเทรดตอน: ${session.entryTime}\n🔍 เช็คผลตอน: ${nextCheckTime}\n\n⏳ กรุณารอจนกว่าการติดตามจะเสร็จสิ้น\n\n💡 หากต้องการยกเลิก พิมพ์ "ยกเลิกติดตาม"`
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

  // 🔧 Helper method สำหรับ debug (เพิ่มข้อมูลเวลา)
  async debugTracking(userId) {
    try {
      console.log(`🔧 Debug tracking for user ${userId}`);
      
      const session = this.trackingSessions.get(userId);
      if (!session) {
        console.log('❌ No session found');
        return { error: 'No session found' };
      }

      const nextCheckTime = this.getCheckTimeDisplay(session.entryTime);
      const delayMs = this.calculateCheckDelay(session.entryTime);
      
      console.log(`📊 Session data:`, JSON.stringify(session, null, 2));
      console.log(`🕐 Next check time: ${nextCheckTime}`);
      console.log(`⏳ Delay: ${Math.round(delayMs / 1000)} seconds`);
      
      return {
        session,
        nextCheckTime,
        delaySeconds: Math.round(delayMs / 1000),
        isBlocked: this.isUserBlocked(userId)
      };
    } catch (error) {
      console.error('Debug error:', error);
      return { error: error.message };
    }
  }
}

module.exports = new ResultTrackingService();