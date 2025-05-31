//AI-Server/services/trackingService.js
const TrackingSession = require('../models/trackingSession');
const iqOptionService = require('./iqOptionService');
const lineService = require('./lineService');
const { createTrackingResultMessage, createContinueTradingMessage } = require('../utils/flexMessages');

class TrackingService {
  constructor() {
    this.activeChecks = new Map(); // เก็บ setTimeout IDs
  }

  // เริ่มติดตามผลการเทรด
  async startTracking(userId, pair, prediction, entryTime) {
    try {
      console.log(`🎯 Starting tracking for ${userId}: ${pair} ${prediction} at ${entryTime}`);
      
      // ตรวจสอบว่ามีการติดตามอยู่แล้วหรือไม่
      const existingSession = await TrackingSession.findOne({
        lineUserId: userId,
        status: 'tracking'
      });

      if (existingSession) {
        throw new Error('คุณมีการติดตามผลอยู่แล้ว กรุณารอจนกว่าจะเสร็จสิ้น');
      }

      // สร้าง tracking session ใหม่
      const session = new TrackingSession({
        lineUserId: userId,
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

  // ตั้งเวลาเช็คผลครั้งถัดไป
  scheduleNextCheck(session) {
    const nextCheckTime = session.getNextCheckTime();
    const now = new Date();
    const [hours, minutes] = nextCheckTime.split(':').map(Number);
    
    const checkDate = new Date(session.entryDate);
    checkDate.setHours(hours, minutes, 0, 0);
    
    // ถ้าเวลาที่จะเช็คผ่านไปแล้ว ให้เช็คทันที
    const delay = Math.max(0, checkDate.getTime() - now.getTime());
    
    console.log(`⏰ Next check scheduled for ${nextCheckTime} (in ${delay/1000} seconds)`);
    
    const timeoutId = setTimeout(() => {
      this.checkResult(session._id);
    }, delay);

    this.activeChecks.set(session._id.toString(), timeoutId);
  }

  // เช็คผลการเทรด
  async checkResult(sessionId) {
    try {
      const session = await TrackingSession.findById(sessionId);
      if (!session || session.status !== 'tracking') {
        console.log(`Session ${sessionId} not found or not tracking`);
        return;
      }

      const checkTime = session.getNextCheckTime();
      console.log(`🔍 Checking result for ${session.pair} at ${checkTime}`);

      // ดึงข้อมูลแท่งเทียนจาก IQ Option
      const candleData = await iqOptionService.getCandleData(
        session.pair, 
        session.entryTime,
        session.entryDate.toISOString().split('T')[0]
      );

      const isCorrect = session.isWinCondition(candleData.color);
      
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

        await this.sendWinMessage(session);
      } else if (session.currentRound >= session.maxRounds) {
        // แพ้ครบ 7 ตาแล้ว
        session.status = 'lost';
        session.lostAt = new Date();
        await session.save();

        await this.sendLoseMessage(session);
      } else {
        // ยังไม่ชนะ ต้องเช็คต่อ
        session.currentRound += 1;
        await session.save();

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
      }
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
    
    const message = `📊 ผลตา ${session.currentRound}/${session.maxRounds}\n\n${session.pair} ${session.prediction}\n🕐 เวลา: ${session.getNextCheckTime()}\n📈 แท่งเทียน: ${candleText}\n💰 ราคา: ${candleData.open} → ${candleData.close}\n\n${isCorrect ? '✅ ถูกต้อง - ชนะแล้ว!' : '❌ ยังไม่ถูก - ' + prediction + ' ต่อ'}\n\n⏳ ${isCorrect ? 'เสร็จสิ้น' : `เช็คต่อในตาที่ ${session.currentRound + 1}`}`;

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