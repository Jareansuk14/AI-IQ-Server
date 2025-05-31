//AI-Server/services/trackingService.js - แก้ไขการคำนวณเวลา

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

      // แปลงเวลาเข้าเทรดเป็น Date object
      const entryTime = this.parseTargetTime(targetTime);

      // สร้าง tracking session ใหม่
      const session = new TrackingSession({
        user: user._id,
        lineUserId,
        pair,
        prediction,
        entryTime,
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

      // กำหนดเวลาเช็คครั้งแรก
      this.scheduleFirstCheck(session);

      return session;
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // แปลงเวลา targetTime เป็น Date object
  parseTargetTime(targetTime) {
    const [hour, minute] = targetTime.split(':');
    const now = new Date();
    const entryTime = new Date();
    
    entryTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    // ถ้าเวลาเข้าเทรดผ่านไปแล้ว ให้ใช้วันถัดไป
    if (entryTime <= now) {
      entryTime.setDate(entryTime.getDate() + 1);
    }
    
    return entryTime;
  }

  // กำหนดเวลาเช็คครั้งแรก (รอจนถึงเวลาเข้าเทรด + 5 นาที)
  scheduleFirstCheck(session) {
    const entryTime = new Date(session.entryTime);
    const firstCheckTime = new Date(entryTime.getTime() + (5 * 60 * 1000)); // +5 นาที
    
    const waitTime = firstCheckTime.getTime() - Date.now();
    
    console.log(`📅 เวลาเข้าเทรด: ${entryTime.toLocaleTimeString('th-TH')}`);
    console.log(`📅 เช็คครั้งแรกเวลา: ${firstCheckTime.toLocaleTimeString('th-TH')}`);
    console.log(`📅 รอเวลาอีก: ${Math.round(waitTime/1000)} วินาที (${Math.round(waitTime/60000)} นาที)`);
    
    if (waitTime > 0) {
      setTimeout(() => {
        this.checkSessionResult(session._id);
      }, waitTime);
    } else {
      // ถ้าเวลาผ่านไปแล้ว ให้เช็คทันที
      console.log(`⏰ เวลาผ่านไปแล้ว เช็คทันที`);
      this.checkSessionResult(session._id);
    }
  }

  // กำหนดเวลาเช็คครั้งถัดไป (300 วินาทีหลังจากการเช็คครั้งก่อน)
  scheduleNextCheck(session) {
    const waitTime = 5 * 60 * 1000; // 300 วินาที = 5 นาที
    
    console.log(`📅 กำหนดเช็ครอบที่ ${session.currentRound} ในอีก ${waitTime/1000} วินาที (5 นาที)`);
    
    setTimeout(() => {
      this.checkSessionResult(session._id);
    }, waitTime);
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

      // คำนวณเวลาที่ต้องเช็ค (เวลาเข้าเทรด + (รอบ * 5 นาที))
      const entryTime = new Date(session.entryTime);
      const checkTime = new Date(entryTime.getTime() + (session.currentRound * 5 * 60 * 1000));
      const checkTimeString = checkTime.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      console.log(`🕐 เช็คข้อมูลแท่งเทียนเวลา: ${checkTimeString}`);

      // ดึงข้อมูลแท่งเทียน
      const candleData = await candleChecker.checkCandle(session.pair, checkTimeString);
      
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

      if (isCorrect) {
        // ชนะแล้ว!
        session.status = 'won';
        session.winRound = session.currentRound;
        session.completedAt = new Date();
        
        await session.save();
        await this.sendWinMessage(session, candleData);
        this.activeTracking.delete(session.lineUserId);
        
      } else if (session.isMaxRoundsReached()) {
        // แพ้ครบ 7 รอบแล้ว
        session.status = 'lost';
        session.completedAt = new Date();
        
        await session.save();
        await this.sendLoseMessage(session, candleData);
        this.activeTracking.delete(session.lineUserId);
        
      } else {
        // ยังไม่ชนะ ทำรอบต่อไป
        session.currentRound += 1;
        await session.save();
        
        await this.sendContinueMessage(session, candleData);
        this.scheduleNextCheck(session); // ใช้ scheduleNextCheck แทน scheduleFirstCheck
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
  async sendWinMessage(session, candleData) {
    const expectation = session.prediction === 'CALL' ? 'แท่งเขียว (ขึ้น)' : 'แท่งแดง (ลง)';
    const actualColor = candleData.color === 'green' ? 'เขียว (ขึ้น)' : candleData.color === 'red' ? 'แดง (ลง)' : 'โดจิ';
    
    const winText = `🎉 ยินดีด้วย! ทำนายถูกต้อง!\n\n📊 ${session.pair} ${session.prediction}\n🏆 ชนะในรอบที่: ${session.winRound}/7\n⏰ เวลาที่ชนะ: ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\n\n💹 แท่งเทียนปิดสี: ${actualColor}\n🎯 ต้องการ: ${expectation}\n📈 Open: ${candleData.open}\n📉 Close: ${candleData.close}\n\n✨ การทำนายของคุณแม่นยำ!`;

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
    const expectation = session.prediction === 'CALL' ? 'แท่งเขียว (ขึ้น)' : 'แท่งแดง (ลง)';
    const actualColor = candleData.color === 'green' ? 'เขียว (ขึ้น)' : candleData.color === 'red' ? 'แดง (ลง)' : 'โดจิ';
    
    const loseText = `😔 การติดตามผลสิ้นสุดแล้ว\n\n📊 ${session.pair} ${session.prediction}\n📉 ไม่พบผลลัพธ์ที่ถูกต้องใน 7 รอบ\n⏰ เวลาสิ้นสุด: ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\n\n💹 แท่งเทียนรอบสุดท้ายปิดสี: ${actualColor}\n🎯 ต้องการ: ${expectation}\n📈 Open: ${candleData.open}\n📉 Close: ${candleData.close}\n\n💪 ไม่เป็นไร ลองใหม่ในครั้งต่อไป!`;

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
    
    const continueText = `📊 ผลรอบที่ ${session.currentRound - 1}\n\n💹 ${session.pair}: แท่งปิดสี${actualColor}\n🎯 ต้องการ: ${expectation}\n📈 Open: ${candleData.open}\n📉 Close: ${candleData.close}\n\n⏳ ยังไม่ถูก ติดตามต่อรอบที่ ${session.currentRound}/7\n⏰ จะเช็คอีกครั้งในอีก 5 นาที`;

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

  // ฟังก์ชันเพื่อจัดการ sessions ที่ค้างอยู่เมื่อ restart server
  async resumeActiveSessions() {
    try {
      const activeSessions = await TrackingSession.find({ status: 'tracking' });
      
      console.log(`🔄 พบ ${activeSessions.length} sessions ที่ยังไม่เสร็จสิ้น`);
      
      for (const session of activeSessions) {
        // คำนวณว่าควรเช็คเมื่อไหร่
        const entryTime = new Date(session.entryTime);
        const nextCheckTime = new Date(entryTime.getTime() + (session.currentRound * 5 * 60 * 1000));
        const waitTime = nextCheckTime.getTime() - Date.now();
        
        if (waitTime > 0) {
          console.log(`📅 Resume session ${session._id}: รอ ${Math.round(waitTime/1000)} วินาที`);
          this.activeTracking.set(session.lineUserId, session._id);
          
          setTimeout(() => {
            this.checkSessionResult(session._id);
          }, waitTime);
        } else {
          // เวลาผ่านไปแล้ว เช็คทันที
          console.log(`⏰ Session ${session._id} เวลาผ่านไปแล้ว เช็คทันที`);
          this.checkSessionResult(session._id);
        }
      }
    } catch (error) {
      console.error('Error resuming active sessions:', error);
    }
  }
}

module.exports = new TrackingService();