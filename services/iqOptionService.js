//AI-Server/services/iqOptionService.js - Service ใหม่สำหรับเรียก IQ Option API
const { exec } = require('child_process');
const path = require('path');

class IQOptionService {
  constructor() {
    this.pythonScript = path.join(__dirname, '../scripts/iq_candle_checker.py');
  }

  // แปลงชื่อคู่เงินเป็นรูปแบบของ IQ Option
  convertPairToSymbol(pair) {
    const mapping = {
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
    return mapping[pair] || pair;
  }

  // ดึงข้อมูลแท่งเทียน
  async getCandleData(pair, targetTime, targetDate = null) {
    return new Promise((resolve, reject) => {
      const symbol = this.convertPairToSymbol(pair);
      const timeString = targetTime; // "13:45"
      const dateString = targetDate || new Date().toISOString().split('T')[0]; // "2025-05-30"
      
      // สร้างคำสั่ง Python พร้อม arguments
      const command = `python "${this.pythonScript}" "${symbol}" "${timeString}" "${dateString}"`;
      
      console.log(`🐍 Executing Python: ${command}`);
      
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Python error: ${error.message}`);
          return reject(new Error(`Python execution failed: ${error.message}`));
        }
        
        if (stderr) {
          console.error(`⚠️ Python stderr: ${stderr}`);
        }

        try {
          const result = JSON.parse(stdout);
          console.log("✅ IQ Option API result:", result);
          
          if (result.error) {
            return reject(new Error(result.error));
          }
          
          resolve(result);
        } catch (parseError) {
          console.error(`❌ JSON parse error: ${parseError}`);
          console.log("Python stdout:", stdout);
          reject(new Error(`Failed to parse Python output: ${parseError.message}`));
        }
      });
    });
  }

  // ทดสอบการเชื่อมต่อ IQ Option
  async testConnection() {
    try {
      // ใช้ BTC/USD เวลาปัจจุบันเพื่อทดสอบ
      const now = new Date();
      const timeString = now.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok'
      });
      
      const result = await this.getCandleData('BTC/USD', timeString);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new IQOptionService();