//AI-Server/services/iqOptionService.js
const { exec } = require('child_process');
const path = require('path');

class IQOptionService {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', 'scripts', 'iq_candle_checker.py');
  }

  // ดึงข้อมูลแท่งเทียนที่เวลาที่กำหนด
  async getCandleData(symbol, targetTime, targetDate = null) {
    return new Promise((resolve, reject) => {
      // แปลง symbol ให้เป็นรูปแบบของ IQ Option
      const iqSymbol = this.convertToIQSymbol(symbol);
      
      // สร้าง command สำหรับ Python
      const command = `python "${this.pythonScript}" "${iqSymbol}" "${targetTime}" "${targetDate || ''}"`;
      
      console.log(`🔍 Checking candle: ${symbol} at ${targetTime}`);
      console.log(`Command: ${command}`);
      
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Python error: ${error.message}`);
          reject(new Error(`Failed to get candle data: ${error.message}`));
          return;
        }
        
        if (stderr) {
          console.error(`⚠️ stderr: ${stderr}`);
        }

        try {
          const result = JSON.parse(stdout);
          console.log("✅ ได้ข้อมูลแท่งเทียน:", result);
          
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch (parseError) {
          console.error(`❌ แปลง JSON ไม่ได้: ${parseError}`);
          console.log("stdout:\n", stdout);
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });
  }

  // แปลงชื่อคู่เงินให้เป็นรูปแบบของ IQ Option
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
      'GOLD': 'XAUUSD'
    };
    
    return symbolMap[symbol] || symbol;
  }

  // ทดสอบการเชื่อมต่อ
  async testConnection() {
    try {
      const result = await this.getCandleData('BTC/USD', '09:00');
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new IQOptionService();