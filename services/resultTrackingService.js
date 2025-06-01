// AI-Server/services/resultTrackingService.js - Clean Version

const lineService = require('./lineService');
const iqOptionService = require('./iqOptionService');
const { createContinueTradeMessage } = require('../utils/flexMessages');

class ResultTrackingService {
  constructor() {
    this.trackingSessions = new Map();
    this.blockedUsers = new Set();
  }

  async startTracking(userId, prediction, pair, entryTime) {
    try {
      console.log(`Starting result tracking for user ${userId}`);
      console.log(`${pair} ${prediction} at ${entryTime}`);

      this.blockedUsers.add(userId);

      const session = {
        userId,
        pair,
        prediction,
        originalEntryTime: entryTime,
        currentEntryTime: entryTime,
        round: 1,
        maxRounds: 7,
        isActive: true,
        startedAt: new Date(),
        results: []
      };

      this.trackingSessions.set(userId, session);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `กำลังติดตามผล ${pair}\n\nคาดการณ์: ${prediction}\nเข้าเทรดตอน: ${entryTime}\nรอบที่: 1/7\n\nรอจนถึงเวลาปิดแท่งเทียน...`
      });

      const delayMs = this.calculateRoundDelay(session.currentEntryTime, session.round);

      console.log(`Round ${session.round}: Will check at ${this.addMinutes(session.currentEntryTime, 5)}`);
      console.log(`Delay: ${Math.round(delayMs / 1000)} seconds`);

      setTimeout(() => {
        this.checkResult(userId);
      }, delayMs);

      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      this.blockedUsers.delete(userId);
      this.trackingSessions.delete(userId);
      throw error;
    }
  }

  calculateRoundDelay(currentEntryTime, round) {
    try {
      const [hours, minutes] = currentEntryTime.split(':').map(Number);
      
      const now = new Date();
      let targetTime = new Date();
      
      let targetMinutes = minutes + 5;
      let targetHours = hours;
      
      if (targetMinutes >= 60) {
        targetHours += Math.floor(targetMinutes / 60);
        targetMinutes = targetMinutes % 60;
      }
      
      if (targetHours >= 24) {
        targetHours = targetHours % 24;
      }
      
      targetTime.setHours(targetHours, targetMinutes, 0, 0);
      
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const delayMs = targetTime.getTime() - now.getTime();
      
      console.log(`Round ${round}: Entry ${currentEntryTime} -> Check at ${targetHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')}`);
      console.log(`Delay: ${Math.round(delayMs / 1000)} seconds`);
      
      return Math.max(0, delayMs);
    } catch (error) {
      console.error('Error calculating delay:', error);
      return 5 * 60 * 1000;
    }
  }

  addMinutes(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    let newMinutes = mins + minutes;
    let newHours = hours;
    
    if (newMinutes >= 60) {
      newHours += Math.floor(newMinutes / 60);
      newMinutes = newMinutes % 60;
    }
    
    if (newHours >= 24) {
      newHours = newHours % 24;
    }
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }

  async checkResult(userId) {
    try {
      const session = this.trackingSessions.get(userId);
      if (!session || !session.isActive) {
        console.log(`Session not found or inactive for user ${userId}`);
        return;
      }

      console.log(`Checking result for user ${userId}, round ${session.round}`);
      console.log(`Using entry time: ${session.currentEntryTime}`);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `กำลังเช็คผลรอบที่ ${session.round}...\nเวลาเข้าเทรด: ${session.currentEntryTime}\nกรุณารอสักครู่`
      });

      console.log(`Executing: python yahoo_candle_checker.py "${session.pair}" "${session.currentEntryTime}" 1`);
      
      const candleResult = await iqOptionService.getCandleColor(
        session.pair,
        session.currentEntryTime,
        1
      );

      console.log(`Candle result:`, candleResult);

      if (candleResult.error) {
        throw new Error(candleResult.error);
      }

      const isWin = this.checkWinLose(session.prediction, candleResult.color);
      
      session.results.push({
        round: session.round,
        entryTime: session.currentEntryTime,
        candleColor: candleResult.color,
        prediction: session.prediction,
        isWin,
        time: new Date(),
        candleData: candleResult
      });

      if (isWin) {
        await this.handleWin(userId, session, candleResult);
      } else {
        await this.handleLose(userId, session, candleResult);
      }

    } catch (error) {
      console.error(`Error checking result for user ${userId}:`, error);
      
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `เกิดข้อผิดพลาดในการเช็คผล\n\n${error.message}\n\nกำลังลองใหม่ในอีก 30 วินาที...`
      });

      setTimeout(() => {
        this.checkResult(userId);
      }, 30000);
    }
  }

  checkWinLose(prediction, candleColor) {
    if (prediction === 'CALL' && candleColor === 'green') {
      return true;
    }
    if (prediction === 'PUT' && candleColor === 'red') {
      return true;
    }
    return false;
  }

  async handleWin(userId, session, candleResult) {
    try {
      console.log(`User ${userId} WON at round ${session.round}`);

      session.isActive = false;
      this.blockedUsers.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `ยินดีด้วย! คุณชนะแล้ว!\n\n${session.pair} รอบที่ ${session.round}\nเข้าเทรดตอน: ${session.currentEntryTime}\nคาดการณ์: ${session.prediction}\nแท่งเทียนปิด: ${candleResult.color === 'green' ? 'เขียว' : 'แดง'}\nเวลา: ${candleResult.time}\n\nผลการเทรด: ชนะในรอบที่ ${session.round}`
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

  async handleLose(userId, session, candleResult) {
    try {
      console.log(`User ${userId} LOST at round ${session.round}`);

      if (session.round >= session.maxRounds) {
        await this.handleMaxRoundsReached(userId, session, candleResult);
        return;
      }

      session.currentEntryTime = this.addMinutes(session.currentEntryTime, 5);
      session.round++;

      console.log(`Next round ${session.round}: Entry time updated to ${session.currentEntryTime}`);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `รอบที่ ${session.round - 1}: ไม่ถูกต้อง\n\n${session.pair}\nเข้าเทรดตอน: ${session.currentEntryTime}\nคาดการณ์: ${session.prediction}\nแท่งเทียนปิด: ${candleResult.color === 'green' ? 'เขียว' : 'แดง'}\n\nทำต่อรอบที่ ${session.round}/${session.maxRounds}\nรอแท่งเทียนถัดไป...`
      });

      const delayMs = this.calculateRoundDelay(session.currentEntryTime, session.round);
      
      console.log(`Next round ${session.round} will check in ${Math.round(delayMs / 1000)} seconds`);

      setTimeout(() => {
        this.checkResult(userId);
      }, delayMs);

    } catch (error) {
      console.error('Error handling lose:', error);
    }
  }

  async handleMaxRoundsReached(userId, session, candleResult) {
    try {
      console.log(`User ${userId} LOST all 7 rounds`);

      session.isActive = false;
      this.blockedUsers.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `เสียใจด้วย แพ้ครบ 7 รอบแล้ว\n\n${session.pair}\nคาดการณ์: ${session.prediction}\nรอบสุดท้าย: ${candleResult.color === 'green' ? 'เขียว' : 'แดง'}\n\nลองใหม่ในครั้งหน้า!\nอย่าท้อแท้ การเทรดต้องมีความอดทน`
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

  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  getSession(userId) {
    return this.trackingSessions.get(userId);
  }

  forceStopTracking(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      session.isActive = false;
    }
    this.blockedUsers.delete(userId);
    this.trackingSessions.delete(userId);
    console.log(`Force stopped tracking for user ${userId}`);
  }

  getTrackingStats() {
    return {
      activeSessions: this.trackingSessions.size,
      blockedUsers: this.blockedUsers.size,
      sessions: Array.from(this.trackingSessions.values()).map(session => ({
        userId: session.userId,
        pair: session.pair,
        prediction: session.prediction,
        round: session.round,
        originalEntryTime: session.originalEntryTime,
        currentEntryTime: session.currentEntryTime,
        isActive: session.isActive,
        startedAt: session.startedAt
      }))
    };
  }

  async handleBlockedUserMessage(userId) {
    const session = this.trackingSessions.get(userId);
    if (session) {
      return lineService.pushMessage(userId, {
        type: 'text',
        text: `คุณกำลังติดตามผลอยู่\n\n${session.pair} รอบที่ ${session.round}/${session.maxRounds}\nเข้าเทรดตอน: ${session.currentEntryTime}\nคาดการณ์: ${session.prediction}\n\nกรุณารอจนกว่าการติดตามจะเสร็จสิ้น\n\nหากต้องการยกเลิก พิมพ์ "ยกเลิกติดตาม"`
      });
    }
  }

  async cancelTracking(userId) {
    const session = this.trackingSessions.get(userId);
    if (session && session.isActive) {
      session.isActive = false;
      this.blockedUsers.delete(userId);
      this.trackingSessions.delete(userId);

      await lineService.pushMessage(userId, {
        type: 'text',
        text: `ยกเลิกการติดตามผลแล้ว\n\n${session.pair} รอบที่ ${session.round}\nเข้าเทรดตอน: ${session.currentEntryTime}\nคาดการณ์: ${session.prediction}\n\nคุณสามารถใช้งานคำสั่งอื่นได้แล้ว`
      });

      return true;
    }
    return false;
  }
}

module.exports = new ResultTrackingService();