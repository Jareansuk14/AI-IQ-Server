//AI-Server/services/trackingService.js - แก้ไขฟังก์ชัน startTracking

const TrackingSession = require('../models/trackingSession');
const iqOptionService = require('./iqOptionService');
const lineService = require('./lineService');
const User = require('../models/user'); // เพิ่มบรรทัดนี้
const { createTrackingResultMessage, createContinueTradingMessage } = require('../utils/flexMessages');

class TrackingService {
  constructor() {
    this.activeChecks = new Map(); // เก็บ setTimeout IDs
  }

  // เริ่มติดตามผลการเทรด (แก้ไขแล้ว)
  async startTracking(userId, pair, prediction, entryTime) {
    try {
      console.log(`🎯 Starting tracking for ${userId}: ${pair} ${prediction} at ${entryTime}`);
      
      // ค้นหาข้อมูลผู้ใช้จาก lineUserId
      const user = await User.findOne({ lineUserId: userId });
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ');
      }
      
      // ตรวจสอบว่ามีการติดตามอยู่แล้วหรือไม่
      const existingSession = await TrackingSession.findOne({
        lineUserId: userId,
        status: 'tracking'
      });

      if (existingSession) {
        throw new Error('คุณมีการติดตามผลอยู่แล้ว กรุณารอจนกว่าจะเสร็จสิ้น');
      }

      // สร้าง tracking session ใหม่ (แก้ไขให้ใส่ user ObjectId)
      const session = new TrackingSession({
        user: user._id,        // ใช้ ObjectId แทน
        lineUserId: userId,    // เก็บไว้เพื่อความสะดวก
        pair,
        prediction,
        entryTime,
        entryDate: new Date()
      });

      await session.save();

      // แจ้งผู้ใช้ว่าเริ่มติดตาม
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🎯 เริ่มติดตามผล ${pair} ${prediction}\n📊 เวลาเข้าเทรด: ${entryTime}\n⏰ จะเช็คผลทุก 5 นาที\n🎲 สูงสุด 7 ตา`
      });

      // ตั้งเวลาเช็คครั้งแรก (5 นาทีหลังจาก entry time)
      this.scheduleNextCheck(session);

      return session;
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // แก้ไขฟังก์ชัน scheduleNextCheck ให้คำนวณเวลาถูกต้อง
  scheduleNextCheck(session) {
    const nextCheckTime = session.getNextCheckTime();
    const now = new Date();
    
    console.log(`Current time: ${now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
    console.log(`Entry time: ${session.entryTime}`);
    console.log(`Next check time: ${nextCheckTime}`);
    console.log(`Current round: ${session.currentRound}`);
    
    // แปลงเวลาเช็คจาก string เป็น Date object
    const [hours, minutes] = nextCheckTime.split(':').map(Number);
    
    // ใช้วันที่ปัจจุบันสำหรับการเช็ค
    const checkDate = new Date();
    checkDate.setHours(hours, minutes, 0, 0);
    
    // ถ้าเวลาที่จะเช็คผ่านไปแล้วในวันนี้ ให้เช็คทันที
    let delay;
    if (checkDate <= now) {
      // ถ้าเวลาผ่านไปแล้ว ให้เช็คทันทีใน 10 วินาที
      delay = 10000;
      console.log(`⚠️ Check time ${nextCheckTime} has passed, checking in 10 seconds`);
    } else {
      delay = checkDate.getTime() - now.getTime();
    }
    
    // จำกัดเวลารอสูงสุด 1 ชั่วโมง (เผื่อมีปัญหาการคำนวณ)
    if (delay > 60 * 60 * 1000) {
      delay = 10000; // เช็คทันทีใน 10 วินาทีแทน
      console.log(`⚠️ Delay too long (${delay/1000}s), checking in 10 seconds instead`);
    }
    
    console.log(`⏰ Next check scheduled for ${nextCheckTime} (in ${(delay/1000).toFixed(1)} seconds)`);
    
    const timeoutId = setTimeout(() => {
      this.checkResult(session._id);
    }, delay);

    this.activeChecks.set(session._id.toString(), timeoutId);
  }

  // เช็คผลการเทรด (คงเดิม แต่ปรับ log ให้ชัดเจนขึ้น)
  async checkResult(sessionId) {
    try {
      const session = await TrackingSession.findById(sessionId);
      if (!session || session.status !== 'tracking') {
        console.log(`Session ${sessionId} not found or not tracking`);
        return;
      }

      const checkTime = session.getNextCheckTime();
      console.log(`🔍 Checking result for ${session.pair} at ${checkTime} (Round ${session.currentRound})`);

      // ดึงข้อมูลแท่งเทียนจาก IQ Option
      const candleData = await iqOptionService.getCandleData(
        session.pair, 
        session.entryTime,
        session.entryDate.toISOString().split('T')[0]
      );

      console.log(`📊 Candle data received:`, candleData);

      const isCorrect = session.isWinCondition(candleData.color);
      console.log(`🎯 Prediction: ${session.prediction}, Candle: ${candleData.color}, Correct: ${isCorrect}`);
      
      // บันทึกผลลัพธ์
      session.results.push({
        round: session.currentRound,
        checkTime,
        candleColor: candleData.color,
        openPrice: candleData.open,
        closePrice: candleData.close,
        isCorrect,
        checkedAt: new Date()
      });

      if (isCorrect) {
        // ชนะแล้ว!
        session.status = 'won';
        session.wonAt = new Date();
        await session.save();

        console.log(`🎉 User won! Session ${sessionId} completed`);
        await this.sendWinMessage(session);
      } else if (session.currentRound >= session.maxRounds) {
        // แพ้ครบ 7 ตาแล้ว
        session.status = 'lost';
        session.lostAt = new Date();
        await session.save();

        console.log(`😔 User lost after ${session.maxRounds} rounds. Session ${sessionId} completed`);
        await this.sendLoseMessage(session);
      } else {
        // ยังไม่ชนะ ต้องเช็คต่อ
        session.currentRound += 1;
        await session.save();

        console.log(`⏳ Round ${session.currentRound - 1} failed, continuing to round ${session.currentRound}`);
        await this.sendContinueMessage(session, candleData);
        
        // ตั้งเวลาเช็คครั้งถัดไป
        this.scheduleNextCheck(session);
      }

      // ลบ timeout ออกจาก map
      this.activeChecks.delete(sessionId.toString());

    } catch (error) {
      console.error('Error checking result:', error);
      
      // ส่งข้อความแจ้งข้อผิดพลาด
      const session = await TrackingSession.findById(sessionId);
      if (session) {
        await lineService.pushMessage(session.lineUserId, {
          type: 'text',
          text: `❌ เกิดข้อผิดพลาดในการเช็คผล\n💡 ${error.message}\n🔄 กรุณาลองใหม่อีกครั้ง`
        });
        
        // ยกเลิก session ที่เกิดข้อผิดพลาด
        session.status = 'cancelled';
        await session.save();
      }
      
      // ลบ timeout ออกจาก map
      this.activeChecks.delete(sessionId.toString());
    }
  }

  // ส่งข้อความเมื่อชนะ
  async sendWinMessage(session) {
    const lastResult = session.results[session.results.length - 1];
    const winMessage = `🎉 ยินดีด้วย! คุณชนะแล้ว!\n\n📊 ${session.pair} ${session.prediction}\n🕐 ตา ${session.currentRound}: ${lastResult.checkTime}\n📈 แท่งเทียน: ${lastResult.candleColor === 'green' ? '🟢 เขียว (ขึ้น)' : '🔴 แดง (ลง)'}\n💰 ราคา: ${lastResult.openPrice} → ${lastResult.closePrice}\n\n✅ การทำนายถูกต้อง!`;

    await lineService.pushMessage(session.lineUserId, {
      type: 'text',
      text: winMessage
    });

    // ส่งการ์ดถามว่าจะเทรดต่อหรือไม่
    const continueCard = createContinueTradingMessage();
    await lineService.pushMessage(session.lineUserId, continueCard);
  }

  // ส่งข้อความเมื่อแพ้
  async sendLoseMessage(session) {
    const loseMessage = `😔 เสียใจด้วย ครั้งนี้ไม่ถูกต้อง\n\n📊 ${session.pair} ${session.prediction}\n🎲 ครบ ${session.maxRounds} ตาแล้ว\n\n📈 ผลสรุป:\n${session.results.map((r, i) => 
      `ตา ${i+1}: ${r.candleColor === 'green' ? '🟢' : '🔴'} ${r.isCorrect ? '✅' : '❌'}`
    ).join('\n')}\n\n💪 อย่าท้อแท้ ลองใหม่ในครั้งหน้า!`;

    await lineService.pushMessage(session.lineUserId, {
      type: 'text',
      text: loseMessage
    });

    // ส่งการ์ดถามว่าจะเทรดต่อหรือไม่
    const continueCard = createContinueTradingMessage();
    await lineService.pushMessage(session.lineUserId, continueCard);
  }

  // ส่งข้อความระหว่างติดตาม
  async sendContinueMessage(session, candleData) {
    const prediction = session.prediction === 'CALL' ? 'ขึ้น' : 'ลง';
    const candleText = candleData.color === 'green' ? '🟢 เขียว (ขึ้น)' : candleData.color === 'red' ? '🔴 แดง (ลง)' : '⚪ doji';
    const isCorrect = session.isWinCondition(candleData.color);
    
    const message = `📊 ผลตา ${session.currentRound - 1}/${session.maxRounds}\n\n${session.pair} ${session.prediction}\n🕐 เวลา: ${session.results[session.results.length - 1].checkTime}\n📈 แท่งเทียน: ${candleText}\n💰 ราคา: ${candleData.open} → ${candleData.close}\n\n${isCorrect ? '✅ ถูกต้อง - ชนะแล้ว!' : '❌ ยังไม่ถูก - ' + prediction + ' ต่อ'}\n\n⏳ เช็คต่อในตาที่ ${session.currentRound} ในอีก 5 นาที`;

    await lineService.pushMessage(session.lineUserId, {
      type: 'text',
      text: message
    });
  }

  // ตรวจสอบว่าผู้ใช้มีการติดตามอยู่หรือไม่
  async isUserTracking(userId) {
    const session = await TrackingSession.findOne({
      lineUserId: userId,
      status: 'tracking'
    });
    return session !== null;
  }

  // ยกเลิกการติดตาม
  async cancelTracking(userId) {
    try {
      const session = await TrackingSession.findOne({
        lineUserId: userId,
        status: 'tracking'
      });

      if (!session) {
        throw new Error('ไม่พบการติดตามที่กำลังดำเนินการ');
      }

      session.status = 'cancelled';
      await session.save();

      // ยกเลิก scheduled check
      const timeoutId = this.activeChecks.get(session._id.toString());
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.activeChecks.delete(session._id.toString());
      }

      return session;
    } catch (error) {
      console.error('Error cancelling tracking:', error);
      throw error;
    }
  }

  // ดูสถิติการติดตาม
  async getTrackingStats(userId) {
    const stats = await TrackingSession.aggregate([
      { $match: { lineUserId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRounds: { $avg: '$currentRound' }
        }
      }
    ]);

    return {
      total: await TrackingSession.countDocuments({ lineUserId: userId }),
      won: stats.find(s => s._id === 'won')?.count || 0,
      lost: stats.find(s => s._id === 'lost')?.count || 0,
      cancelled: stats.find(s => s._id === 'cancelled')?.count || 0,
      tracking: stats.find(s => s._id === 'tracking')?.count || 0
    };
  }
}

module.exports = new TrackingService();