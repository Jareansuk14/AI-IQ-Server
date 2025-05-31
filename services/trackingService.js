//AI-Server/services/trackingService.js
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

      // สร้าง tracking session ใหม่
      const session = new TrackingSession({
        user: user._id,
        lineUserId,
        pair,
        prediction,
        entryTime: new Date(),
        targetTime
      });

      await session.save();

      // เพิ่มเข้า active tracking
      this.activeTracking.set(lineUserId, session._id);

      // ส่งข้อความแจ้งว่ากำลังติดตาม
      await lineService.pushMessage(lineUserId, {
        type: 'text',
        text: `🔍 กำลังติดตามผล ${pair}\n\n📊 การทำนาย: ${prediction}\n⏰ เวลาเข้าเทรด: ${targetTime}\n🎯 รอบที่: 1/7\n\n💡 ระบบจะตรวจสอบผลทุก 5 นาที\n⌛ กรุณารอสักครู่...`
      });

      // กำหนดเวลาเช็คครั้งแรก (5 นาทีหลังจากเวลาเข้าเทรด)
      this.scheduleNextCheck(session);

      return session;
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // กำหนดเวลาเช็คครั้งถัดไป
  scheduleNextCheck(session) {
    try {
      const [hour, minute] = session.targetTime.split(':');
      
      // ใช้เวลาปัจจุบันที่ปรับ timezone แล้ว (ลบ 7 ชั่วโมง)
      const now = new Date();
      const adjustedNow = new Date(now.getTime() - (7 * 60 * 60 * 1000));
      
      // สร้างเวลาเช็คครั้งถัดไป
      const nextCheckTime = new Date(adjustedNow);
      const checkMinute = parseInt(minute) + (session.currentRound * 5);
      
      nextCheckTime.setHours(parseInt(hour));
      nextCheckTime.setMinutes(checkMinute);
      nextCheckTime.setSeconds(0);
      nextCheckTime.setMilliseconds(0);
      
      console.log(`📅 Current time (adjusted): ${adjustedNow.toISOString()}`);
      console.log(`📅 Next check time: ${nextCheckTime.toISOString()}`);
      console.log(`📅 Session ${session._id} round ${session.currentRound}`);
      
      // คำนวณเวลาที่ต้องรอ
      const waitTime = nextCheckTime.getTime() - adjustedNow.getTime();
      
      console.log(`⏳ Wait time: ${waitTime}ms (${Math.round(waitTime/1000)} seconds)`);
      
      if (waitTime > 0) {
        console.log(`📅 กำหนดเช็ครอบที่ ${session.currentRound} ในอีก ${Math.round(waitTime/1000)} วินาที`);
        
        setTimeout(() => {
          this.checkSessionResult(session._id);
        }, waitTime);
      } else {
        // ถ้าเวลาผ่านไปแล้ว ให้เช็คทันที
        console.log(`⏰ เวลาผ่านไปแล้ว เช็คทันที (wait time: ${waitTime}ms)`);
        setTimeout(() => {
          this.checkSessionResult(session._id);
        }, 5000); // รอ 5 วินาทีแล้วเช็ค
      }
    } catch (error) {
      console.error('Error scheduling next check:', error);
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
  
      // คำนวณเวลาที่ต้องเช็ค (ปรับ timezone)
      const [hour, minute] = session.targetTime.split(':');
      const checkMinute = parseInt(minute) + ((session.currentRound - 1) * 5);
      
      // ปรับชั่วโมงถ้าจำนวนนาทีเกิน 60
      let checkHour = parseInt(hour);
      let adjustedCheckMinute = checkMinute;
      
      if (checkMinute >= 60) {
        checkHour += Math.floor(checkMinute / 60);
        adjustedCheckMinute = checkMinute % 60;
      }
      
      const checkTime = `${checkHour.toString().padStart(2, '0')}:${adjustedCheckMinute.toString().padStart(2, '0')}`;
      
      console.log(`🕐 Checking candle at time: ${checkTime}`);
      console.log(`🎯 Original target: ${session.targetTime}, Current round: ${session.currentRound}`);
  
      // ดึงข้อมูลแท่งเทียน
      const candleData = await candleChecker.checkCandle(session.pair, checkTime);
      
      // บันทึกผลลัพธ์
      const isCorrect = session.isCorrectPrediction(candleData.color);
      
      session.results.push({
        round: session.currentRound,
        checkTime: new Date(),
        candleColor: candleData.color,
        openPrice: candleData.open,
        closePrice: candleData.close,
        isCorrect
      });
  
      console.log(`📊 Round ${session.currentRound} result:`, {
        pair: session.pair,
        prediction: session.prediction,
        candleColor: candleData.color,
        isCorrect,
        open: candleData.open,
        close: candleData.close
      });
  
      if (isCorrect) {
        // ชนะแล้ว!
        session.status = 'won';
        session.winRound = session.currentRound;
        session.completedAt = new Date();
        
        await session.save();
        await this.sendWinMessage(session);
        this.activeTracking.delete(session.lineUserId);
        
        console.log(`🎉 Session ${sessionId} WON in round ${session.currentRound}!`);
        
      } else if (session.isMaxRoundsReached()) {
        // แพ้ครบ 7 รอบแล้ว
        session.status = 'lost';
        session.completedAt = new Date();
        
        await session.save();
        await this.sendLoseMessage(session);
        this.activeTracking.delete(session.lineUserId);
        
        console.log(`😔 Session ${sessionId} LOST after ${session.maxRounds} rounds`);
        
      } else {
        // ยังไม่ชนะ ทำรอบต่อไป
        session.currentRound += 1;
        await session.save();
        
        await this.sendContinueMessage(session, candleData);
        this.scheduleNextCheck(session);
        
        console.log(`🔄 Session ${sessionId} continues to round ${session.currentRound}`);
      }
  
    } catch (error) {
      console.error(`❌ Error checking session ${sessionId}:`, error);
      
      // แจ้งเตือนผู้ใช้ว่าเกิดข้อผิดพลาด
      try {
        const session = await TrackingSession.findById(sessionId);
        if (session) {
          await lineService.pushMessage(session.lineUserId, {
            type: 'text',
            text: '❌ เกิดข้อผิดพลาดในการตรวจสอบผล\n\n💡 กรุณาลองใหม่อีกครั้ง'
          });
        }
      } catch (notifyError) {
        console.error('Error sending error notification:', notifyError);
      }
    }
  }

  // ส่งข้อความเมื่อชนะ
  async sendWinMessage(session) {
    const winText = `🎉 ยินดีด้วย! ทำนายถูกต้อง!\n\n📊 ${session.pair} ${session.prediction}\n🏆 ชนะในรอบที่: ${session.winRound}/7\n⏰ เวลาที่ชนะ: ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\n\n✨ การทำนายของคุณแม่นยำ!`;

    await lineService.pushMessage(session.lineUserId, [
      {
        type: 'text',
        text: winText
      },
      createContinueTradeMessage()
    ]);
  }

  // ส่งข้อความเมื่อแพ้
  async sendLoseMessage(session) {
    const loseText = `😔 การติดตามผลสิ้นสุดแล้ว\n\n📊 ${session.pair} ${session.prediction}\n📉 ไม่พบผลลัพธ์ที่ถูกต้องใน 7 รอบ\n⏰ เวลาสิ้นสุด: ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\n\n💪 ไม่เป็นไร ลองใหม่ในครั้งต่อไป!`;

    await lineService.pushMessage(session.lineUserId, [
      {
        type: 'text',
        text: loseText
      },
      createContinueTradeMessage()
    ]);
  }

  // ส่งข้อความเมื่อยังไม่ชนะ
  async sendContinueMessage(session, candleData) {
    const expectation = session.prediction === 'CALL' ? 'แท่งเขียว (ขึ้น)' : 'แท่งแดง (ลง)';
    const actualColor = candleData.color === 'green' ? 'เขียว (ขึ้น)' : candleData.color === 'red' ? 'แดง (ลง)' : 'โดจิ';
    
    const continueText = `📊 ผลรอบที่ ${session.currentRound - 1}\n\n💹 ${session.pair}: แท่งปิดสี${actualColor}\n🎯 ต้องการ: ${expectation}\n📈 Open: ${candleData.open}\n📉 Close: ${candleData.close}\n\n⏳ ยังไม่ถูก ติดตามต่อรอบที่ ${session.currentRound}/7\n⏰ จะเช็คอีกครั้งใน 5 นาที`;

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
}

module.exports = new TrackingService();