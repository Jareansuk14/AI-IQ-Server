//AI-Server/services/resultTrackingService.js
const lineService = require('./lineService');
const iqOptionService = require('./iqOptionService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class ResultTrackingService {
  constructor() {
    this.trackingSessions = new Map(); // เก็บข้อมูล session การติดตาม
    this.blockedUsers = new Set(); // เก็บ users ที่ถูก block
  }

  // เริ่มต้นการติดตาม
  async startTracking(userId, prediction, pair, entryTime) {
    try {
      console.log(`🎯 Starting result tracking for user ${userId}`);
      console.log(`📊 ${pair} ${prediction} at ${entryTime}`);

      // Block user จากการใช้คำสั่งอื่น
      this.blockedUsers.add(userId);

      // คำนวณเวลาเข้าเทรดที่แน่นอน
      const entryDateTime = this.calculateEntryDateTime(entryTime);
      
      // สร้าง tracking session
      const session = {
        userId,
        pair,
        prediction, // CALL หรือ PUT
        entryTime,
        entryDateTime: entryDateTime.toISOString(), // เพิ่มวันเวลาที่แน่นอน
        entryTimestamp: Math.floor(entryDateTime.getTime() / 1000), // Unix timestamp
        round: 1,
        maxRounds: 7,
        isActive: true,
        startedAt: new Date(),
        timezone: 'Asia/Bangkok',
        results: [],
        roundTimestamps: [] // เก็บ timestamp ของแต่ละรอบ
      };

      this.trackingSessions.set(userId, session);

      // คำนวณเวลาเช็ครอบแรก
      const firstCheckTime = this.calculateCheckTime(entryDateTime, 1);
      session.roundTimestamps.push({
        round: 1,
        expectedTime: firstCheckTime.toISOString(),
        expectedTimestamp: Math.floor(firstCheckTime.getTime() / 1000)
      });

      // ส่งข้อความแจ้งว่ากำลังติดตามผล
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🔍 กำลังติดตามผล ${pair}\n\n📊 คาดการณ์: ${prediction}\n⏰ เข้าเทรดตอน: ${entryTime}\n📅 วันที่: ${entryDateTime.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}\n🕐 เวลาแน่นอน: ${entryDateTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n🎯 รอบที่: 1/7\n\n⏳ รอจนถึงเวลาปิดแท่งเทียน...`
      });

      const delayMs = firstCheckTime.getTime() - Date.now();

      console.log(`⏰ Entry DateTime: ${entryDateTime.toISOString()}`);
      console.log(`⏰ First Check Time: ${firstCheckTime.toISOString()}`);
      console.log(`🌍 Bangkok Time: ${firstCheckTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
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

  // คำนวณวันเวลาเข้าเทรดที่แน่นอน
  calculateEntryDateTime(entryTimeStr) {
    const [hours, minutes] = entryTimeStr.split(':').map(Number);
    
    const now = new Date();
    const entryTime = new Date();
    
    // ตั้งเวลาสำหรับวันนี้
    entryTime.setHours(hours, minutes, 0, 0);
    
    // ถ้าเวลาที่กำหนดเลยไปแล้ว ให้เลื่อนไปเป็นรอบถัดไป (5 นาทีข้างหน้า)
    if (entryTime <= now) {
      // หาช่วงเวลา 5 นาทีถัดไปที่ตรงกับเวลาที่กำหนด
      const diffMinutes = Math.ceil((now.getTime() - entryTime.getTime()) / (5 * 60 * 1000));
      entryTime.setMinutes(entryTime.getMinutes() + (diffMinutes * 5));
    }
    
    return entryTime;
  }

  // คำนวณเวลาที่ต้องเช็คผล
  calculateCheckTime(entryDateTime, round) {
    // เพิ่ม 5 นาที * รอบ สำหรับเวลาปิดแท่งเทียน
    const checkTime = new Date(entryDateTime.getTime() + (5 * 60 * 1000 * round));
    return checkTime;
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

      // คำนวณเวลาที่คาดหวังสำหรับรอบนี้
      const expectedCheckTime = this.calculateCheckTime(new Date(session.entryDateTime), session.round);
      const expectedTimestamp = Math.floor(expectedCheckTime.getTime() / 1000);

      // ส่งข้อความแจ้งว่ากำลังเช็คผล
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🔍 กำลังเช็คผลรอบที่ ${session.round}...\n📅 เวลาที่คาดหวัง: ${expectedCheckTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n⏳ กรุณารอสักครู่`
      });

      // เรียก IQ Option API เพื่อดูแท่งเทียน
      const candleResult = await iqOptionService.getCandleColor(
        session.pair,
        session.entryTime,
        session.round,
        expectedTimestamp // ส่ง expected timestamp ไปด้วย
      );

      console.log(`📊 Candle result:`, candleResult);

      if (candleResult.error) {
        throw new Error(candleResult.error);
      }

      // ตรวจสอบความแม่นยำของเวลา
      const timeDiff = Math.abs(candleResult.actual_timestamp - expectedTimestamp);
      const isTimeAccurate = timeDiff <= 300; // ยอมรับความผิดพลาด 5 นาที

      console.log(`⏰ Time accuracy check:`);
      console.log(`   Expected: ${expectedTimestamp} (${new Date(expectedTimestamp * 1000).toISOString()})`);
      console.log(`   Actual: ${candleResult.actual_timestamp} (${new Date(candleResult.actual_timestamp * 1000).toISOString()})`);
      console.log(`   Difference: ${timeDiff} seconds`);
      console.log(`   Accurate: ${isTimeAccurate}`);

      // ตรวจสอบผลว่าชนะหรือแพ้
      const isWin = this.checkWinLose(session.prediction, candleResult.color);
      
      // บันทึกผล
      const resultData = {
        round: session.round,
        candleColor: candleResult.color,
        prediction: session.prediction,
        isWin,
        time: new Date(),
        expectedTimestamp,
        actualTimestamp: candleResult.actual_timestamp,
        timeDiff,
        isTimeAccurate,
        candleData: {
          open: candleResult.open,
          close: candleResult.close,
          symbol: candleResult.symbol || session.pair
        }
      };
      
      session.results.push(resultData);

      if (isWin) {
        // ชนะ - จบการติดตาม
        await this.handleWin(userId, session, candleResult, resultData);
      } else {
        // แพ้ - ตรวจสอบว่าจะทำต่อหรือไม่
        await this.handleLose(userId, session, candleResult, resultData);
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
  async handleWin(userId, session, candleResult, resultData) {
    try {
      console.log(`🎉 User ${userId} WON at round ${session.round}`);

      // ปิด session
      session.isActive = false;
      this.blockedUsers.delete(userId);

      const actualTime = new Date(candleResult.actual_timestamp * 1000);
      const timeAccuracyText = resultData.isTimeAccurate ? 
        `✅ เวลาตรงตาม (ต่าง ${resultData.timeDiff}วิ)` : 
        `⚠️ เวลาไม่ตรงตาม (ต่าง ${Math.round(resultData.timeDiff/60)}นาที)`;

      // ส่งข้อความแสดงความยินดี
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🎉 ยินดีด้วย! คุณชนะแล้ว!\n\n📊 ${session.pair} รอบที่ ${session.round}\n🎯 คาดการณ์: ${session.prediction}\n🕯️ แท่งเทียนปิด: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n💰 ราคา: ${candleResult.open} → ${candleResult.close}\n⏰ เวลาจริง: ${actualTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n${timeAccuracyText}\n\n🏆 ผลการเทรด: ชนะในรอบที่ ${session.round}`
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
  async handleLose(userId, session, candleResult, resultData) {
    try {
      console.log(`❌ User ${userId} LOST at round ${session.round}`);

      // ตรวจสอบว่าครบ 7 รอบหรือยัง
      if (session.round >= session.maxRounds) {
        // แพ้ครบ 7 รอบ - จบการติดตาม
        await this.handleMaxRoundsReached(userId, session, candleResult, resultData);
        return;
      }

      // ยังไม่ครบ 7 รอบ - ทำต่อ
      session.round++;

      // คำนวณเวลาเช็ครอบถัดไป
      const nextCheckTime = this.calculateCheckTime(new Date(session.entryDateTime), session.round);
      const nextTimestamp = Math.floor(nextCheckTime.getTime() / 1000);
      
      session.roundTimestamps.push({
        round: session.round,
        expectedTime: nextCheckTime.toISOString(),
        expectedTimestamp: nextTimestamp
      });

      const actualTime = new Date(candleResult.actual_timestamp * 1000);
      const timeAccuracyText = resultData.isTimeAccurate ? 
        `✅ เวลาตรงตาม (ต่าง ${resultData.timeDiff}วิ)` : 
        `⚠️ เวลาไม่ตรงตาม (ต่าง ${Math.round(resultData.timeDiff/60)}นาที)`;

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `❌ รอบที่ ${session.round - 1}: ไม่ถูกต้อง\n\n📊 ${session.pair}\n🎯 คาดการณ์: ${session.prediction}\n🕯️ แท่งเทียนปิด: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n💰 ราคา: ${candleResult.open} → ${candleResult.close}\n⏰ เวลาจริง: ${actualTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n${timeAccuracyText}\n\n🔄 ทำต่อรอบที่ ${session.round}/${session.maxRounds}\n📅 เช็ครอบถัดไป: ${nextCheckTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n⏳ รอแท่งเทียนถัดไป...`
      });

      // ตั้งเวลาสำหรับเช็ครอบถัดไป
      const delayMs = nextCheckTime.getTime() - Date.now();
      setTimeout(() => {
        this.checkResult(userId);
      }, delayMs);

    } catch (error) {
      console.error('Error handling lose:', error);
    }
  }

  // จัดการเมื่อแพ้ครบ 7 รอบ
  async handleMaxRoundsReached(userId, session, candleResult, resultData) {
    try {
      console.log(`💀 User ${userId} LOST all 7 rounds`);

      // ปิด session
      session.isActive = false;
      this.blockedUsers.delete(userId);

      const actualTime = new Date(candleResult.actual_timestamp * 1000);
      const timeAccuracyText = resultData.isTimeAccurate ? 
        `✅ เวลาตรงตาม (ต่าง ${resultData.timeDiff}วิ)` : 
        `⚠️ เวลาไม่ตรงตาม (ต่าง ${Math.round(resultData.timeDiff/60)}นาที)`;

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `💀 เสียใจด้วย แพ้ครบ 7 รอบแล้ว\n\n📊 ${session.pair}\n🎯 คาดการณ์: ${session.prediction}\n🕯️ รอบสุดท้าย: ${candleResult.color === 'green' ? '🟢 เขียว' : '🔴 แดง'}\n💰 ราคา: ${candleResult.open} → ${candleResult.close}\n⏰ เวลาจริง: ${actualTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n${timeAccuracyText}\n\n📈 ลองใหม่ในครั้งหน้า!\n💪 อย่าท้อแท้ การเทรดต้องมีความอดทน`
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
        startedAt: session.startedAt,
        entryDateTime: session.entryDateTime,
        timezone: session.timezone,
        roundTimestamps: session.roundTimestamps
      }))
    };
  }

  // จัดการคำสั่งจาก user ระหว่างติดตาม
  async handleBlockedUserMessage(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      const nextRoundTime = session.roundTimestamps.find(r => r.round === session.round);
      const nextCheckText = nextRoundTime ? 
        `\n📅 เช็ครอบถัดไป: ${new Date(nextRoundTime.expectedTime).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` : '';
      
      return lineService.pushMessage(userId, {
        type: 'text',
        text: `🚫 คุณกำลังติดตามผลอยู่\n\n📊 ${session.pair} รอบที่ ${session.round}/${session.maxRounds}\n🎯 คาดการณ์: ${session.prediction}\n📅 เข้าเทรด: ${new Date(session.entryDateTime).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}${nextCheckText}\n\n⏳ กรุณารอจนกว่าการติดตามจะเสร็จสิ้น\n\n💡 หากต้องการยกเลิก พิมพ์ "ยกเลิกติดตาม"`
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
        text: `✅ ยกเลิกการติดตามผลแล้ว\n\n📊 ${session.pair} รอบที่ ${session.round}\n🎯 คาดการณ์: ${session.prediction}\n📅 เข้าเทรด: ${new Date(session.entryDateTime).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n\n💡 คุณสามารถใช้งานคำสั่งอื่นได้แล้ว`
      });

      return true;
    }
    return false;
  }
}

module.exports = new ResultTrackingService();