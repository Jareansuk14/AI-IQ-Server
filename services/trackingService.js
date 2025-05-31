//AI-Server/services/trackingService.js - Service หลักสำหรับจัดการการติดตาม
const TrackingSession = require('../models/trackingSession');
const iqOptionService = require('./iqOptionService');
const lineService = require('./lineService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class TrackingService {
  
  // เริ่มต้นการติดตามผล
  async startTracking(userId, lineUserId, pair, prediction, entryTime, entryTimeString) {
    try {
      // ตรวจสอบว่ามี session ที่ active อยู่หรือไม่
      const existingSession = await TrackingSession.findOne({
        lineUserId,
        status: 'tracking'
      });

      if (existingSession) {
        throw new Error('มีการติดตามผลอยู่แล้ว กรุณารอให้เสร็จสิ้นก่อน');
      }

      // สร้าง session ใหม่
      const session = new TrackingSession({
        user: userId,
        lineUserId,
        pair,
        prediction,
        entryTime: new Date(entryTime),
        entryTimeString,
        symbol: iqOptionService.convertPairToSymbol(pair)
      });

      // คำนวณเวลาเช็คครั้งแรก (หลัง 5 นาที)
      session.calculateNextCheckTime();
      await session.save();

      console.log(`🎯 Started tracking: ${pair} ${prediction} at ${entryTimeString}`);
      
      // ส่งข้อความแจ้งเริ่มติดตาม
      const trackingMessage = this.createTrackingStartMessage(session);
      await lineService.pushMessage(lineUserId, trackingMessage);

      return session;
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // เช็คผลการเทรด
  async checkTrackingResults() {
    try {
      const now = new Date();
      console.log(`🔍 Checking tracking results at ${now.toISOString()}`);

      // หา sessions ที่ต้องเช็คผล
      const sessionsToCheck = await TrackingSession.find({
        status: 'tracking',
        nextCheckTime: { $lte: now }
      }).populate('user');

      console.log(`📊 Found ${sessionsToCheck.length} sessions to check`);

      for (const session of sessionsToCheck) {
        await this.processSession(session);
      }

    } catch (error) {
      console.error('Error checking tracking results:', error);
    }
  }

  // ประมวลผล session แต่ละตัว
  async processSession(session) {
    try {
      console.log(`🔄 Processing session: ${session.pair} ${session.prediction} Round ${session.currentRound}`);

      // คำนวณเวลาที่ต้องเช็ค (entry time + current round * 5 minutes)
      const checkTime = new Date(session.entryTime);
      checkTime.setMinutes(checkTime.getMinutes() + (session.currentRound - 1) * 5);
      
      const timeString = checkTime.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok'
      });
      
      const dateString = checkTime.toISOString().split('T')[0];

      // ดึงข้อมูลแท่งเทียนจาก IQ Option
      const candleData = await iqOptionService.getCandleData(
        session.pair, 
        timeString, 
        dateString
      );

      // เพิ่มผลลัพธ์
      const isCorrect = session.addResult(candleData);
      
      if (isCorrect) {
        // ถูก! จบการติดตาม
        await this.completeSession(session, 'win');
      } else if (session.currentRound >= session.maxRounds) {
        // ครบ 7 ตา แล้ว
        await this.completeSession(session, 'max_rounds_reached');
      } else {
        // ผิด ทำต่อ
        await this.continueSession(session);
      }

    } catch (error) {
      console.error(`Error processing session ${session._id}:`, error);
      
      // ส่งข้อความแจ้งข้อผิดพลาด
      await lineService.pushMessage(session.lineUserId, {
        type: 'text',
        text: `❌ เกิดข้อผิดพลาดในการติดตามผล ${session.pair}\n\nError: ${error.message}\n\n💡 กรุณาลองเทรดใหม่อีกครั้ง`
      });

      // หยุดการติดตาม
      await this.completeSession(session, 'failed');
    }
  }

  // ทำต่อไปยัง round ถัดไป
  async continueSession(session) {
    session.currentRound += 1;
    session.calculateNextCheckTime();
    await session.save();

    const lastResult = session.results[session.results.length - 1];
    const continueMessage = this.createContinueMessage(session, lastResult);
    
    await lineService.pushMessage(session.lineUserId, continueMessage);
    console.log(`➡️ Continue tracking: ${session.pair} Round ${session.currentRound}`);
  }

  // จบการติดตาม
  async completeSession(session, finalResult) {
    session.status = 'completed';
    session.finalResult = finalResult;
    session.completedAt = new Date();
    await session.save();

    const completionMessage = this.createCompletionMessage(session);
    await lineService.pushMessage(session.lineUserId, completionMessage);
    
    console.log(`✅ Completed tracking: ${session.pair} Result: ${finalResult}`);
  }

  // ตรวจสอบว่าผู้ใช้มี active tracking หรือไม่
  async hasActiveTracking(lineUserId) {
    const activeSession = await TrackingSession.findOne({
      lineUserId,
      status: 'tracking'
    });
    return !!activeSession;
  }

  // ยกเลิกการติดตาม (ถ้าต้องการ)
  async cancelTracking(lineUserId) {
    const session = await TrackingSession.findOne({
      lineUserId,
      status: 'tracking'
    });

    if (session) {
      session.status = 'completed';
      session.finalResult = 'cancelled';
      session.completedAt = new Date();
      await session.save();
      return true;
    }
    return false;
  }

  // สร้างข้อความเริ่มติดตาม
  createTrackingStartMessage(session) {
    const nextCheckTime = session.nextCheckTime.toLocaleString('th-TH', { 
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    });

    return {
      type: 'text',
      text: `🎯 เริ่มติดตามผล\n\n📊 ${session.pair} (M5)\n🎲 ทำนาย: ${session.prediction}\n⏰ เข้าเทรด: ${session.entryTimeString}\n🔍 เช็คผลครั้งแรก: ${nextCheckTime}\n\n📈 ระบบจะติดตามผลอัตโนมัติและแจ้งให้ทราบ\n⚠️ ระหว่างนี้ไม่สามารถเลือกคู่เงินใหม่ได้`
    };
  }

  // สร้างข้อความทำต่อ
  createContinueMessage(session, lastResult) {
    const wrongResultText = session.prediction === 'CALL' ? 
      `แท่งเทียนปิดสีแดง (ลง) ≠ CALL` : 
      `แท่งเทียนปิดสีเขียว (ขึ้น) ≠ PUT`;

    const nextAction = session.prediction === 'CALL' ? 'CALL' : 'PUT';
    const nextTime = session.nextCheckTime.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok'
    });

    return {
      type: 'text',
      text: `📊 ${session.pair} (M5) - Round ${session.currentRound - 1}\n\n❌ ผลยังไม่ถูกต้อง\n${wrongResultText}\n\n🔄 ทำต่อ ${nextAction} เวลา ${nextTime}\n📈 เช็คผลรอบถัดไป: ${session.nextCheckTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n\n⏳ รอบ ${session.currentRound}/${session.maxRounds}`
    };
  }

  // สร้างข้อความจบการติดตาม
  createCompletionMessage(session) {
    if (session.finalResult === 'win') {
      const lastResult = session.results[session.results.length - 1];
      const correctResultText = session.prediction === 'CALL' ? 
        `แท่งเทียนปิดสีเขียว (ขึ้น) = CALL ถูกต้อง! 🎯` : 
        `แท่งเทียนปิดสีแดง (ลง) = PUT ถูกต้อง! 🎯`;

      return [
        {
          type: 'text',
          text: `🎉 ยินดีด้วย! ชนะแล้ว!\n\n📊 ${session.pair} (M5)\n✅ ${correctResultText}\n🏆 ชนะในรอบที่ ${session.currentRound}\n\n🎯 การทำนายของ AI แม่นยำ!`
        },
        createContinueTradeMessage()
      ];
    } else {
      return [
        {
          type: 'text',
          text: `😔 เสียใจด้วย ครบ ${session.maxRounds} รอบแล้ว\n\n📊 ${session.pair} (M5)\n❌ ไม่สามารถทำนายถูกต้องได้\n\n💡 ลองเทรดคู่เงินอื่นดูไหม?`
        },
        createContinueTradeMessage()
      ];
    }
  }

  // รายงานสถิติ
  async getTrackingStats(lineUserId) {
    const stats = await TrackingSession.aggregate([
      { $match: { lineUserId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ["$finalResult", "win"] }, 1, 0] } },
          loses: { $sum: { $cond: [{ $ne: ["$finalResult", "win"] }, 1, 0] } },
          avgRounds: { $avg: "$currentRound" }
        }
      }
    ]);
    
    return stats[0] || { totalSessions: 0, wins: 0, loses: 0, avgRounds: 0 };
  }
}

module.exports = new TrackingService();