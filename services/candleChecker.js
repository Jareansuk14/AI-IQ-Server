//AI-Server/services/candleChecker.js
const { exec } = require('child_process');
const path = require('path');

class CandleChecker {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', 'scripts', 'iq_candle_checker.py');
  }

  // ดึงข้อมูลแท่งเทียนจาก IQ Option
  async checkCandle(symbol, targetTime) {
    return new Promise((resolve, reject) => {
      // แปลง symbol format
      const iqSymbol = this.convertToIQSymbol(symbol);
      
      // สร้าง command สำหรับเรียก Python
      const command = `python "${this.pythonScript}" "${iqSymbol}" "${targetTime}"`;
      
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
            reject(new Error(result.error));
            return;
          }
          
          console.log("✅ ได้ข้อมูลแท่งเทียน:", result);
          resolve(result);
        } catch (parseError) {
          console.error(`❌ แปลง JSON ไม่ได้: ${parseError}`);
          console.log("stdout:\n", stdout);
          reject(new Error(`JSON parse failed: ${parseError.message}`));
        }
      });
    });
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
}

module.exports = new CandleChecker();
