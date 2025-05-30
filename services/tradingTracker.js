//AI-Server/services/tradingTracker.js - Main Tracking Service
const TradingSession = require('../models/tradingSession');
const iqOptionService = require('./iqOptionService');
const lineService = require('./lineService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class TradingTracker {
  constructor() {
    this.checkInterval = null;
  }

  // เริ่มติดตามผลการเทรดใหม่
  async startTracking(lineUserId, pair, prediction, entryTime) {
    try {
      console.log(`Starting tracking for ${lineUserId}: ${pair} ${prediction} at ${entryTime}`);
      
      // ตรวจสอบว่าผู้ใช้มี session ที่กำลังติดตามอยู่หรือไม่
      const existingSession = await TradingSession.findOne({
        lineUserId,
        status: 'tracking'
      });
      
      if (existingSession) {
        throw new Error('คุณมีการติดตามผลอยู่แล้ว กรุณารอจนกว่าจะเสร็จสิ้น');
      }
      
      // สร้าง session ใหม่
      const session = new TradingSession({
        lineUserId,
        pair,
        prediction,
        entryTime,
        entryDate: new Date()
      });
      
      await session.save();
      
      // ส่งข้อความแจ้งว่าเริ่มติดตามผล
      await lineService.pushMessage(lineUserId, {
        type: 'text',
        text: `🔍 เริ่มติดตามผลการเทรด\n\n📊 ${pair} ${prediction}\n⏰ เข้าตอน: ${entryTime}\n\n📈 ระบบจะเช็คผลทุก 5 นาที\n🚫 ระหว่างนี้ไม่สามารถเลือกคู่เงินใหม่ได้`
      });
      
      // เริ่ม scheduler สำหรับเช็คผล
      this.startScheduler();
      
      return session;
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // เริ่ม scheduler สำหรับเช็คผลทุก 1 นาที
  startScheduler() {
    if (this.checkInterval) {
      return; // มี scheduler รันอยู่แล้ว
    }
    
    console.log('Starting trading tracker scheduler...');
    this.checkInterval = setInterval(async () => {
      await this.checkAllActiveSessions();
    }, 60000); // เช็คทุก 1 นาที
  }

  // หยุด scheduler
  stopScheduler() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Trading tracker scheduler stopped');
    }
  }

  // เช็คผล session ที่กำลังติดตามทั้งหมด
  async checkAllActiveSessions() {
    try {
      const activeSessions = await TradingSession.find({ status: 'tracking' });
      
      for (const session of activeSessions) {
        const nextCheckTime = session.getNextCheckTime();
        const now = new Date();
        
        // ถ้าถึงเวลาเช็คผลลัพธ์
        if (now >= nextCheckTime) {
          await this.checkSessionResult(session);
        }
      }
    } catch (error) {
      console.error('Error checking active sessions:', error);
    }
  }

  // เช็คผลลัพธ์ของ session เดียว
  async checkSessionResult(session) {
    try {
      console.log(`Checking result for session: ${session._id}`);
      
      const iqSymbol = iqOptionService.formatPairForIQ(session.pair);
      const checkTime = this.formatCheckTime(session.entryTime, session.currentRound);
      
      // เรียก Python script เพื่อเช็คแท่งเทียน
      const candleResult = await iqOptionService.checkCandle(iqSymbol, checkTime);
      
      if (!candleResult.success) {
        console.error('Failed to get candle data:', candleResult.error);
        return;
      }
      
      const { candleColor, openPrice, closePrice } = candleResult;
      const isCorrect = session.isCorrectPrediction(candleColor);
      
      // บันทึกผลลัพธ์
      session.results.push({
        round: session.currentRound,
        checkTime,
        candleColor,
        openPrice,
        closePrice,
        correct: isCorrect,
        checkedAt: new Date()
      });
      
      console.log(`Round ${session.currentRound}: ${candleColor} - ${isCorrect ? 'Correct' : 'Incorrect'}`);
      
      if (isCorrect) {
        // ถูกต้อง - จบการติดตาม
        await this.completeSession(session, true);
      } else if (session.currentRound >= session.maxRounds) {
        // ครบ 7 ตาแล้วยังไม่ถูก - แพ้
        await this.completeSession(session, false);
      } else {
        // ยังไม่ถูก - ติดตามต่อ
        session.currentRound += 1;
        await session.save();
        
        // แจ้งผลรอบนี้และทำต่อ
        await this.sendRoundResult(session, candleColor, isCorrect);
      }
      
    } catch (error) {
      console.error('Error checking session result:', error);
    }
  }

  // คำนวณเวลาที่ต้องเช็ค
  formatCheckTime(entryTime, round) {
    const [hours, minutes] = entryTime.split(':');
    const entryMinutes = parseInt(hours) * 60 + parseInt(minutes);
    const checkMinutes = entryMinutes + (round * 5);
    
    const checkHours = Math.floor(checkMinutes / 60) % 24;
    const checkMins = checkMinutes % 60;
    
    return `${checkHours.toString().padStart(2, '0')}:${checkMins.toString().padStart(2, '0')}`;
  }

  // ส่งผลลัพธ์แต่ละรอบ
  async sendRoundResult(session, candleColor, isCorrect) {
    const colorText = candleColor === 'green' ? '🟢 เขียว (ขึ้น)' : 
                     candleColor === 'red' ? '🔴 แดง (ลง)' : '⚪ เทา (เท่าเดิม)';
    
    const resultText = isCorrect ? '✅ ถูกต้อง' : '❌ ยังไม่ถูก';
    const continueText = session.prediction === 'CALL' ? 'รอแท่งเขียว' : 'รอแท่งแดง';
    
    await lineService.pushMessage(session.lineUserId, {
      type: 'text',
      text: `📊 ผลรอบที่ ${session.currentRound}\n\n${session.pair} ตอน ${session.results[session.results.length - 1].checkTime}\nแท่งเทียน: ${colorText}\n\nผลการทำนาย: ${resultText}\n\n🔄 ${continueText} ต่อไป...\nรอบถัดไป: ${this.formatCheckTime(session.entryTime, session.currentRound + 1)}`
    });
  }

  // จบการติดตาม (ชนะหรือแพ้)
  async completeSession(session, won) {
    try {
      session.status = won ? 'won' : 'lost';
      session.finalResult = {
        won,
        totalRounds: session.currentRound,
        winRound: won ? session.currentRound : null
      };
      session.completedAt = new Date();
      
      await session.save();
      
      // ส่งข้อความแสดงผลสุดท้าย
      await this.sendFinalResult(session, won);
      
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }

  // ส่งผลลัพธ์สุดท้าย
  async sendFinalResult(session, won) {
    const lastResult = session.results[session.results.length - 1];
    const colorText = lastResult.candleColor === 'green' ? '🟢 เขียว (ขึ้น)' : 
                     lastResult.candleColor === 'red' ? '🔴 แดง (ลง)' : '⚪ เทา (เท่าเดิม)';
    
    if (won) {
      // ชนะ
      await lineService.pushMessage(session.lineUserId, {
        type: 'text',
        text: `🎉 ยินดีด้วย! ทำนายถูกต้อง\n\n📊 ${session.pair} ${session.prediction}\n⏰ รอบที่ ${session.currentRound} - ${lastResult.checkTime}\nแท่งเทียน: ${colorText}\n\n✅ ผลการทำนายถูกต้อง!\n🏆 ชนะในรอบที่ ${session.currentRound}/${session.maxRounds}`
      });
      
      // ส่งการ์ดถามว่าต้องการเทรดต่อไหม
      const continueCard = createContinueTradeMessage();
      await lineService.pushMessage(session.lineUserId, continueCard);
      
    } else {
      // แพ้
      await lineService.pushMessage(session.lineUserId, {
        type: 'text',
        text: `😔 เสียใจด้วย การทำนายไม่ถูกต้อง\n\n📊 ${session.pair} ${session.prediction}\n⏰ ครบ ${session.maxRounds} รอบแล้ว\nแท่งสุดท้าย: ${colorText}\n\n❌ ไม่มีแท่งที่ตรงกับการทำนาย\n💪 ลองใหม่ครั้งหน้านะครับ!`
      });
      
      // ส่งการ์ดถามว่าต้องการเทรดต่อไหม
      const continueCard = createContinueTradeMessage();
      await lineService.pushMessage(session.lineUserId, continueCard);
    }
  }

  // เช็คว่าผู้ใช้กำลังติดตามผลอยู่หรือไม่
  async isUserTracking(lineUserId) {
    const session = await TradingSession.findOne({
      lineUserId,
      status: 'tracking'
    });
    
    return !!session;
  }

  // ยกเลิกการติดตาม
  async cancelTracking(lineUserId) {
    try {
      const session = await TradingSession.findOne({
        lineUserId,
        status: 'tracking'
      });
      
      if (session) {
        session.status = 'cancelled';
        session.completedAt = new Date();
        await session.save();
        
        await lineService.pushMessage(lineUserId, {
          type: 'text',
          text: '✅ ยกเลิกการติดตามผลเรียบร้อยแล้ว\n\n💡 ตอนนี้สามารถเลือกคู่เงินใหม่ได้แล้ว'
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error cancelling tracking:', error);
      throw error;
    }
  }
}

module.exports = new TradingTracker();