//AI-Server/services/trackingService.js - อัปเดตแก้ไขการจัดการวันที่และเวลา
const TrackingSession = require('../models/trackingSession');
const User = require('../models/user');
const candleChecker = require('./candleChecker');
const lineService = require('./lineService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class TrackingService {
  constructor() {
    this.activeTracking = new Map(); // เก็บ session ที่กำลัง track
  }

  // เริ่มการติดตามผล
  async startTracking(lineUserId, pair, prediction, targetTime) {
    try {
      // ตรวจสอบว่ามี session ที่กำลังติดตามอยู่หรือไม่
      const existingSession = await TrackingSession.findOne({
        lineUserId,
        status: 'tracking'
      });

      if (existingSession) {
        throw new Error('คุณมีการติดตามผลอยู่แล้ว กรุณารอให้เสร็จสิ้นก่อน');
      }

      // หา user
      const user = await User.findOne({ lineUserId });
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      // สร้างวันที่และเวลาปัจจุบัน (เวลาไทย)
      const now = new Date();
      const thaiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      const entryDate = thaiTime.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log(`📅 Creating tracking session:`);
      console.log(`   Entry Date: ${entryDate}`);
      console.log(`   Target Time: ${targetTime}`);
      console.log(`   Prediction: ${prediction}`);
      console.log(`   Pair: ${pair}`);
      console.log(`   Current Thai Time: ${thaiTime.toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}`);

      // สร้าง tracking session ใหม่
      const session = new TrackingSession({
        user: user._id,
        lineUserId,
        pair,
        prediction,
        entryTime: thaiTime,
        entryDate,
        targetTime,
        timezone: 'Asia/Bangkok',
        debugInfo: {
          originalTargetTimestamp: thaiTime.getTime(),
          scheduleInfo: []
        }
      });

      await session.save();

      // เพิ่มเข้า active tracking
      this.activeTracking.set(lineUserId, session._id);

      // ส่งข้อความแจ้งว่ากำลังติดตาม
      await lineService.pushMessage(lineUserId, {
        type: 'text',
        text: `🔍 กำลังติดตามผล ${pair}\n\n📊 การทำนาย: ${prediction}\n📅 วันที่เข้าเทรด: ${entryDate}\n⏰ เวลาเข้าเทรด: ${targetTime}\n🎯 รอบที่: 1/7\n\n💡 ระบบจะตรวจสอบผลทุก 5 นาที\n⌛ กรุณารอสักครู่...`
      });

      // กำหนดเวลาเช็คครั้งแรก (5 นาทีหลังจากเวลาเข้าเทรด)
      this.scheduleNextCheck(session);

      return session;
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // กำหนดเวลาเช็คครั้งถัดไป - 🔧 แก้ไขการคำนวณเวลา
  scheduleNextCheck(session) {
    try {
      const checkInfo = session.getCheckDateAndTime();
      const nextCheckTime = checkInfo.fullDateTime;
      
      console.log(`📅 Schedule Info for Round ${session.currentRound}:`);
      console.log(`   Check Date: ${checkInfo.date}`);
      console.log(`   Check Time: ${checkInfo.time}`);
      console.log(`   Is Next Day: ${checkInfo.isNextDay}`);
      console.log(`   Full DateTime: ${nextCheckTime.toISOString()}`);

      // คำนวณเวลาที่ต้องรอ
      const waitTime = nextCheckTime.getTime() - Date.now();
      
      // 🔧 เพิ่มการ debug เพื่อหาสาเหตุ
      console.log(`⏰ Debug Time Calculation:`);
      console.log(`   Next Check Time (timestamp): ${nextCheckTime.getTime()}`);
      console.log(`   Current Time (timestamp): ${Date.now()}`);
      console.log(`   Next Check Time (readable): ${nextCheckTime.toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}`);
      console.log(`   Current Time (readable): ${new Date().toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}`);
      console.log(`   Wait Time (ms): ${waitTime}`);
      console.log(`   Wait Time (minutes): ${Math.round(waitTime/60000)}`);

      // 🛡️ ป้องกันการรอนานเกินไป (ไม่ควรเกิน 30 นาที)
      if (waitTime > 30 * 60 * 1000) { // 30 นาที
        console.error(`❌ Wait time too long: ${Math.round(waitTime/60000)} minutes`);
        console.error(`❌ This indicates a timezone or calculation error`);
        
        // ใช้เวลาจริงแทน (5 นาทีจากตอนนี้)
        const correctedWaitTime = 5 * 60 * 1000; // 5 นาที
        
        console.log(`🔧 Using corrected wait time: ${Math.round(correctedWaitTime/60000)} minutes`);
        
        setTimeout(() => {
          this.checkSessionResult(session._id);
        }, correctedWaitTime);
        
        return;
      }

      // 🛡️ ป้องกันเวลาติดลบมากเกินไป (เกิน 10 นาที)
      if (waitTime < -10 * 60 * 1000) {
        console.error(`❌ Wait time too negative: ${Math.round(waitTime/60000)} minutes`);
        
        // เช็คทันทีถ้าเวลาผ่านไปแล้วมาก
        setTimeout(() => {
          this.checkSessionResult(session._id);
        }, 1000);
        
        return;
      }

      // บันทึกข้อมูล debug
      if (!session.debugInfo) session.debugInfo = { scheduleInfo: [] };
      session.debugInfo.scheduleInfo.push({
        round: session.currentRound,
        scheduledFor: nextCheckTime,
        actualCheckTime: null,
        timeDifference: waitTime
      });
      session.save(); // บันทึกข้อมูล debug

      if (waitTime > 0) {
        console.log(`⏰ กำหนดเช็ครอบที่ ${session.currentRound} ในอีก ${Math.round(waitTime/1000)} วินาที (${Math.round(waitTime/60000)} นาที)`);
        
        setTimeout(() => {
          this.checkSessionResult(session._id);
        }, waitTime);
      } else {
        // ถ้าเวลาผ่านไปแล้ว ให้เช็คทันที (แต่อาจจะหาข้อมูลไม่เจอ)
        console.log(`⚠️ เวลาผ่านไปแล้ว ${Math.abs(Math.round(waitTime/1000))} วินาที - เช็คทันที`);
        setTimeout(() => {
          this.checkSessionResult(session._id);
        }, 1000); // รอ 1 วินาทีเพื่อให้แน่ใจว่าข้อมูลพร้อม
      }
    } catch (error) {
      console.error('Error scheduling next check:', error);
      
      // Fallback: เช็คใน 5 นาที
      console.log('🔧 Using fallback: checking in 5 minutes');
      setTimeout(() => {
        this.checkSessionResult(session._id);
      }, 5 * 60 * 1000);
    }
  }

  // ตรวจสอบผลของ session
  async checkSessionResult(sessionId) {
    try {
      const session = await TrackingSession.findById(sessionId);
      if (!session || session.status !== 'tracking') {
        console.log(`❌ Session ${sessionId} ไม่พบหรือไม่ได้อยู่ในสถานะ tracking`);
        return;
      }

      console.log(`🔍 กำลังเช็คผล session ${sessionId} รอบที่ ${session.currentRound}`);

      // คำนวณวันที่และเวลาที่ต้องเช็ค
      const checkInfo = session.getCheckDateAndTime();
      
      console.log(`📊 Check Details:`);
      console.log(`   Target Date: ${checkInfo.date}`);
      console.log(`   Target Time: ${checkInfo.time}`);
      console.log(`   Is Cross Day: ${checkInfo.isNextDay}`);

      // อัปเดตข้อมูล debug
      const debugIndex = session.debugInfo.scheduleInfo.length - 1;
      if (debugIndex >= 0) {
        session.debugInfo.scheduleInfo[debugIndex].actualCheckTime = new Date();
      }

      // ดึงข้อมูลแท่งเทียน
      const candleData = await candleChecker.checkCandle(session.pair, checkInfo.date, checkInfo.time);
      
      // ตรวจสอบความถูกต้องของข้อมูลที่ได้รับ
      if (!candleData || !candleData.color) {
        throw new Error(`ไม่พบข้อมูลแท่งเทียนสำหรับ ${session.pair} วันที่ ${checkInfo.date} เวลา ${checkInfo.time}`);
      }
      
      // บันทึกผลลัพธ์
      const isCorrect = session.isCorrectPrediction(candleData.color);
      
      session.results.push({
        round: session.currentRound,
        checkTime: new Date(),
        checkDate: checkInfo.date,
        expectedTime: checkInfo.time,
        actualTime: candleData.time || checkInfo.time,
        candleColor: candleData.color,
        openPrice: candleData.open,
        closePrice: candleData.close,
        isCorrect,
        candleTimestamp: candleData.timestamp
      });

      if (isCorrect) {
        // ชนะแล้ว!
        session.status = 'won';
        session.winRound = session.currentRound;
        session.completedAt = new Date();
        
        await session.save();
        await this.sendWinMessage(session, candleData);
        this.activeTracking.delete(session.lineUserId);
        
        console.log(`🎉 Session ${sessionId} WON in round ${session.currentRound}!`);
        
      } else if (session.isMaxRoundsReached()) {
        // แพ้ครบ 7 รอบแล้ว
        session.status = 'lost';
        session.completedAt = new Date();
        
        await session.save();
        await this.sendLoseMessage(session, candleData);
        this.activeTracking.delete(session.lineUserId);
        
        console.log(`😔 Session ${sessionId} LOST after ${session.maxRounds} rounds`);
        
      } else {
        // ยังไม่ชนะ ทำรอบต่อไป
        session.currentRound += 1;
        await session.save();
        
        await this.sendContinueMessage(session, candleData, checkInfo);
        this.scheduleNextCheck(session);
        
        console.log(`⏳ Session ${sessionId} continues to round ${session.currentRound}`);
      }

    } catch (error) {
      console.error(`❌ Error checking session ${sessionId}:`, error);
      
      // แจ้งเตือนผู้ใช้ว่าเกิดข้อผิดพลาด
      try {
        const session = await TrackingSession.findById(sessionId);
        if (session) {
          await lineService.pushMessage(session.lineUserId, {
            type: 'text',
            text: `❌ เกิดข้อผิดพลาดในการตรวจสอบผลรอบที่ ${session.currentRound}\n\n🔍 รายละเอียด: ${error.message}\n\n💡 กรุณาลองใหม่อีกครั้ง`
          });
          
          // ยกเลิก session ที่มีปัญหา
          session.status = 'cancelled';
          session.completedAt = new Date();
          await session.save();
          
          this.activeTracking.delete(session.lineUserId);
        }
      } catch (notifyError) {
        console.error('Error sending error notification:', notifyError);
      }
    }
  }

  // ส่งข้อความเมื่อชนะ
  async sendWinMessage(session, candleData) {
    const checkInfo = session.getCheckDateAndTime();
    const actualColor = candleData.color === 'green' ? 'เขียว (ขึ้น)' : candleData.color === 'red' ? 'แดง (ลง)' : 'โดจิ';
    
    const winText = `🎉 ยินดีด้วย! ทำนายถูกต้อง!\n\n📊 ${session.pair} ${session.prediction}\n🏆 ชนะในรอบที่: ${session.winRound}/7\n📅 วันที่เช็ค: ${checkInfo.date}\n⏰ เวลาที่ชนะ: ${checkInfo.time}\n🕯️ แท่งเทียน: ${actualColor}\n📈 Open: ${candleData.open}\n📉 Close: ${candleData.close}\n\n✨ การทำนายของคุณแม่นยำ!`;

    await lineService.pushMessage(session.lineUserId, [
      {
        type: 'text',
        text: winText
      },
      createContinueTradeMessage()
    ]);
  }

  // ส่งข้อความเมื่อแพ้
  async sendLoseMessage(session, candleData) {
    const checkInfo = session.getCheckDateAndTime();
    const actualColor = candleData.color === 'green' ? 'เขียว (ขึ้น)' : candleData.color === 'red' ? 'แดง (ลง)' : 'โดจิ';
    
    const loseText = `😔 การติดตามผลสิ้นสุดแล้ว\n\n📊 ${session.pair} ${session.prediction}\n📉 ไม่พบผลลัพธ์ที่ถูกต้องใน ${session.maxRounds} รอบ\n📅 วันที่สิ้นสุด: ${checkInfo.date}\n⏰ เวลาสิ้นสุด: ${checkInfo.time}\n🕯️ แท่งสุดท้าย: ${actualColor}\n\n💪 ไม่เป็นไร ลองใหม่ในครั้งต่อไป!`;

    await lineService.pushMessage(session.lineUserId, [
      {
        type: 'text',
        text: loseText
      },
      createContinueTradeMessage()
    ]);
  }

  // ส่งข้อความเมื่อยังไม่ชนะ
  async sendContinueMessage(session, candleData, checkInfo) {
    const expectation = session.prediction === 'CALL' ? 'แท่งเขียว (ขึ้น)' : 'แท่งแดง (ลง)';
    const actualColor = candleData.color === 'green' ? 'เขียว (ขึ้น)' : candleData.color === 'red' ? 'แดง (ลง)' : 'โดจิ';
    
    const continueText = `📊 ผลรอบที่ ${session.currentRound - 1}\n\n💹 ${session.pair}: แท่งปิดสี${actualColor}\n🎯 ต้องการ: ${expectation}\n📅 วันที่เช็ค: ${checkInfo.date}\n⏰ เวลาเช็ค: ${checkInfo.time}\n📈 Open: ${candleData.open}\n📉 Close: ${candleData.close}\n\n⏳ ยังไม่ถูก ติดตามต่อรอบที่ ${session.currentRound}/${session.maxRounds}\n⏰ จะเช็คอีกครั้งใน 5 นาที`;

    await lineService.pushMessage(session.lineUserId, {
      type: 'text',
      text: continueText
    });
  }

  // ตรวจสอบว่าผู้ใช้กำลังติดตามอยู่หรือไม่
  async isUserTracking(lineUserId) {
    const session = await TrackingSession.findOne({
      lineUserId,
      status: 'tracking'
    });
    return !!session;
  }

  // ยกเลิกการติดตาม
  async cancelTracking(lineUserId) {
    try {
      const session = await TrackingSession.findOne({
        lineUserId,
        status: 'tracking'
      });

      if (session) {
        session.status = 'cancelled';
        session.completedAt = new Date();
        await session.save();
        
        this.activeTracking.delete(lineUserId);
        
        await lineService.pushMessage(lineUserId, {
          type: 'text',
          text: '✅ ยกเลิกการติดตามผลแล้ว\n\n💡 สามารถเริ่มการวิเคราะห์ใหม่ได้'
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error cancelling tracking:', error);
      throw error;
    }
  }

  // ดูสถิติการติดตาม
  async getTrackingStats(lineUserId) {
    try {
      const stats = await TrackingSession.aggregate([
        { $match: { lineUserId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgWinRound: { $avg: '$winRound' }
          }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Error getting tracking stats:', error);
      throw error;
    }
  }

  // ดูรายละเอียดการติดตามที่กำลังดำเนินการ
  async getActiveTrackingInfo(lineUserId) {
    try {
      const session = await TrackingSession.findOne({
        lineUserId,
        status: 'tracking'
      });

      if (!session) return null;

      const checkInfo = session.getCheckDateAndTime();
      
      return {
        pair: session.pair,
        prediction: session.prediction,
        currentRound: session.currentRound,
        maxRounds: session.maxRounds,
        entryDate: session.entryDate,
        entryTime: session.targetTime,
        nextCheckDate: checkInfo.date,
        nextCheckTime: checkInfo.time,
        isNextDay: checkInfo.isNextDay,
        results: session.results
      };
    } catch (error) {
      console.error('Error getting active tracking info:', error);
      throw error;
    }
  }

  // 🔧 เพิ่มฟังก์ชันเช็คและทำความสะอาด sessions ที่ค้าง
  async cleanupStuckSessions() {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 ชั่วโมงที่แล้ว
      
      const stuckSessions = await TrackingSession.find({
        status: 'tracking',
        createdAt: { $lt: cutoffTime }
      });

      if (stuckSessions.length > 0) {
        console.log(`🧹 Found ${stuckSessions.length} stuck sessions, cleaning up...`);
        
        await TrackingSession.updateMany(
          {
            status: 'tracking',
            createdAt: { $lt: cutoffTime }
          },
          {
            $set: {
              status: 'cancelled',
              completedAt: new Date()
            }
          }
        );

        // ลบจาก activeTracking
        for (const session of stuckSessions) {
          this.activeTracking.delete(session.lineUserId);
        }

        console.log(`✅ Cleaned up ${stuckSessions.length} stuck sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up stuck sessions:', error);
    }
  }

  // 🔧 เพิ่มฟังก์ชันตรวจสอบสุขภาพของ tracking service
  async healthCheck() {
    try {
      const activeCount = await TrackingSession.countDocuments({ status: 'tracking' });
      const memoryActiveCount = this.activeTracking.size;
      
      console.log(`📊 Tracking Service Health Check:`);
      console.log(`   Active sessions in DB: ${activeCount}`);
      console.log(`   Active sessions in memory: ${memoryActiveCount}`);
      
      // ถ้าจำนวนไม่ตรงกัน ให้ sync
      if (activeCount !== memoryActiveCount) {
        console.log(`⚠️ Mismatch detected, syncing...`);
        await this.syncActiveTracking();
      }

      return {
        dbActiveCount: activeCount,
        memoryActiveCount: memoryActiveCount,
        isHealthy: activeCount === memoryActiveCount
      };
    } catch (error) {
      console.error('Error in health check:', error);
      return { error: error.message };
    }
  }

  // 🔧 Sync active tracking map กับ database
  async syncActiveTracking() {
    try {
      const activeSessions = await TrackingSession.find({ status: 'tracking' });
      
      // ล้าง memory
      this.activeTracking.clear();
      
      // เพิ่มกลับเข้าไป
      for (const session of activeSessions) {
        this.activeTracking.set(session.lineUserId, session._id);
      }
      
      console.log(`🔄 Synced ${activeSessions.length} active sessions`);
    } catch (error) {
      console.error('Error syncing active tracking:', error);
    }
  }
}

module.exports = new TrackingService();