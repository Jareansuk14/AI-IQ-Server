//AI-Server/services/iqOptionService.js
const { exec } = require('child_process');
const path = require('path');

class IQOptionService {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, '../scripts/iq_candle_checker.py');
  }

  // ดึงสีแท่งเทียนจาก IQ Option
  async getCandleColor(pair, entryTime, round) {
    return new Promise((resolve) => {
      try {
        console.log(`🐍 Calling Python script for ${pair} at ${entryTime}, round ${round}`);

        // แปลงชื่อคู่เงินให้ตรงกับ IQ Option format
        const iqPair = this.convertPairToIQFormat(pair);
        
        // สร้างคำสั่ง Python พร้อม parameters
        const command = `python3 "${this.pythonScriptPath}" "${iqPair}" "${entryTime}" ${round}`;
        
        console.log(`🔧 Command: ${command}`);

        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Python execution error: ${error.message}`);
            resolve({
              error: `ไม่สามารถเชื่อมต่อ IQ Option ได้: ${error.message}`,
              pair: iqPair,
              entryTime,
              round
            });
            return;
          }

          if (stderr) {
            console.error(`⚠️ Python stderr: ${stderr}`);
            // ถึงแม้จะมี stderr แต่อาจมี stdout ที่ใช้ได้
          }

          try {
            console.log(`📤 Python stdout:`, stdout);
            
            // แปลง JSON result
            const result = JSON.parse(stdout.trim());
            
            if (result.error) {
              console.error(`❌ IQ Option API error: ${result.error}`);
              resolve({
                error: result.error,
                pair: iqPair,
                entryTime,
                round
              });
              return;
            }

            console.log(`✅ Successfully got candle data:`, result);
            
            resolve({
              pair: result.symbol || iqPair,
              time: result.time,
              candleSize: result.candle_size,
              open: result.open,
              close: result.close,
              color: result.color, // 'green', 'red', หรือ 'doji'
              round,
              entryTime,
              timestamp: new Date().toISOString()
            });

          } catch (parseError) {
            console.error(`❌ JSON parse error: ${parseError.message}`);
            console.log(`📝 Raw stdout:`, stdout);
            
            resolve({
              error: `ไม่สามารถแปลงข้อมูลได้: ${parseError.message}`,
              rawOutput: stdout,
              pair: iqPair,
              entryTime,
              round
            });
          }
        });

      } catch (err) {
        console.error(`❌ Unexpected error in getCandleColor: ${err.message}`);
        resolve({
          error: `เกิดข้อผิดพลาดไม่คาดคิด: ${err.message}`,
          pair,
          entryTime,
          round
        });
      }
    });
  }

  // แปลงชื่อคู่เงินให้ตรงกับ IQ Option format
  convertPairToIQFormat(pair) {
    const pairMap = {
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

    return pairMap[pair] || pair.replace('/', '');
  }

  // ทดสอบการเชื่อมต่อ IQ Option
  async testConnection() {
    try {
      console.log('🧪 Testing IQ Option connection...');
      
      const testResult = await this.getCandleColor('EUR/USD', '09:00', 1);
      
      if (testResult.error) {
        return {
          success: false,
          error: testResult.error,
          message: 'การเชื่อมต่อ IQ Option ล้มเหลว'
        };
      }

      return {
        success: true,
        message: 'เชื่อมต่อ IQ Option สำเร็จ',
        data: testResult
      };

    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'ไม่สามารถทดสอบการเชื่อมต่อได้'
      };
    }
  }

  // ดึงข้อมูลแท่งเทียนหลายรอบ (สำหรับ debug)
  async getMultipleCandles(pair, entryTime, rounds) {
    const results = [];
    
    for (let round = 1; round <= rounds; round++) {
      try {
        const result = await this.getCandleColor(pair, entryTime, round);
        results.push(result);
        
        // รอ 1 วินาทีระหว่างการเรียก
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          error: error.message,
          round,
          pair,
          entryTime
        });
      }
    }
    
    return results;
  }

  // ตรวจสอบว่าตลาดเปิดหรือไม่
  isMarketOpen() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // ตลาด Forex เปิดตลอด 24 ชั่วโมง จันทร์-ศุกร์
    // ปิดสุดสัปดาห์ (เสาร์-อาทิตย์)
    if (day === 0 || day === 6) {
      return false; // ปิดสุดสัปดาห์
    }
    
    return true; // เปิดวันจันทร์-ศุกร์
  }

  // ดูสถิติการใช้งาน
  getUsageStats() {
    return {
      pythonScriptPath: this.pythonScriptPath,
      marketOpen: this.isMarketOpen(),
      supportedPairs: [
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
        'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP',
        'EUR/JPY', 'GBP/JPY', 'BTC/USD', 'GOLD'
      ],
      lastChecked: new Date().toISOString()
    };
  }
}

module.exports = new IQOptionService();