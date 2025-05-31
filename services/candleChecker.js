//AI-Server/services/candleChecker.js - อัปเดตเพิ่มการจัดการวันที่
const { exec } = require('child_process');
const path = require('path');

class CandleChecker {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', 'scripts', 'iq_candle_checker.py');
  }

  // ดึงข้อมูลแท่งเทียนจาก IQ Option พร้อมวันที่
  async checkCandle(symbol, targetDate, targetTime) {
    return new Promise((resolve, reject) => {
      // แปลง symbol format
      const iqSymbol = this.convertToIQSymbol(symbol);
      
      // ตรวจสอบรูปแบบวันที่
      if (!this.isValidDate(targetDate)) {
        reject(new Error(`Invalid date format: ${targetDate}. Expected YYYY-MM-DD`));
        return;
      }
      
      // ตรวจสอบรูปแบบเวลา
      if (!this.isValidTime(targetTime)) {
        reject(new Error(`Invalid time format: ${targetTime}. Expected HH:MM`));
        return;
      }
      
      // สร้าง command สำหรับเรียก Python
      const command = `python "${this.pythonScript}" "${iqSymbol}" "${targetDate}" "${targetTime}"`;
      
      console.log(`🔍 Checking candle: ${symbol} (${iqSymbol}) at ${targetDate} ${targetTime}`);
      console.log(`Executing: ${command}`);
      
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Python error: ${error.message}`);
          reject(new Error(`Python execution failed: ${error.message}`));
          return;
        }
        
        if (stderr) {
          console.error(`⚠️ stderr: ${stderr}`);
        }

        try {
          const result = JSON.parse(stdout);
          
          if (result.error) {
            console.error(`❌ Python script error: ${result.error}`);
            reject(new Error(result.error));
            return;
          }
          
          // เพิ่มข้อมูลการตรวจสอบ
          result.requestedDate = targetDate;
          result.requestedTime = targetTime;
          result.symbol = symbol;
          result.iqSymbol = iqSymbol;
          result.checkedAt = new Date().toISOString();
          
          console.log("✅ ได้ข้อมูลแท่งเทียน:", {
            symbol: result.symbol,
            date: result.date,
            time: result.time,
            color: result.color,
            open: result.open,
            close: result.close
          });
          
          resolve(result);
        } catch (parseError) {
          console.error(`❌ แปลง JSON ไม่ได้: ${parseError}`);
          console.log("stdout:\n", stdout);
          reject(new Error(`JSON parse failed: ${parseError.message}`));
        }
      });
    });
  }

  // ตรวจสอบรูปแบบวันที่ YYYY-MM-DD
  isValidDate(dateString) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
  }

  // ตรวจสอบรูปแบบเวลา HH:MM
  isValidTime(timeString) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(timeString);
  }

  // สร้างวันที่และเวลาสำหรับการเช็ค
  calculateCheckDateTime(entryDate, targetTime, roundNumber) {
    try {
      // สร้าง Date object จากวันที่และเวลาเข้าเทรด
      const entryDateTime = new Date(`${entryDate}T${targetTime}:00`);
      
      // เพิ่มเวลาตามจำนวนรอบ (แต่ละรอบ 5 นาที)
      const checkDateTime = new Date(entryDateTime);
      checkDateTime.setMinutes(checkDateTime.getMinutes() + ((roundNumber - 1) * 5));
      
      // แยกวันที่และเวลา
      const checkDate = checkDateTime.toISOString().split('T')[0];
      const checkTime = checkDateTime.toTimeString().slice(0, 5);
      
      return {
        date: checkDate,
        time: checkTime,
        fullDateTime: checkDateTime,
        isNextDay: checkDate !== entryDate,
        timestamp: checkDateTime.getTime()
      };
    } catch (error) {
      console.error('Error calculating check date time:', error);
      throw new Error(`Failed to calculate check date/time: ${error.message}`);
    }
  }

  // แปลง symbol จากรูปแบบของเราเป็นรูปแบบของ IQ Option
  convertToIQSymbol(symbol) {
    const symbolMap = {
      'EUR/USD': 'EURUSD',
      'GBP/USD': 'GBPUSD', 
      'USD/JPY': 'USDJPY',
      'USD/CHF': 'USDCHF',
      'AUD/USD': 'AUDUSD',
      'NZD/USD': 'NZDUSD',
      'USD/CAD': 'USDCAD',
      'EUR/GBP': 'EURGBP',
      'EUR/JPY': 'EURJPY',
      'GBP/JPY': 'GBPJPY',
      'BTC/USD': 'BTCUSD',
      'GOLD': 'GOLD'
    };
    
    return symbolMap[symbol] || symbol;
  }

  // ทดสอบการเชื่อมต่อ IQ Option
  async testConnection() {
    try {
      const testResult = await this.checkCandle('EUR/USD', '2024-01-01', '12:00');
      return { success: true, result: testResult };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CandleChecker();