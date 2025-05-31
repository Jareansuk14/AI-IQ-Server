//AI-Server/services/iqOptionService.js - Updated for Yahoo Finance
const { exec } = require('child_process');
const path = require('path');

class IQOptionService {
  constructor() {
    // 🔄 เปลี่ยนเป็น Yahoo Finance script
    this.pythonScriptPath = path.join(__dirname, '../scripts/yahoo_candle_checker.py');
  }

  // ดึงสีแท่งเทียนจาก Yahoo Finance (แทน IQ Option)
  async getCandleColor(pair, entryTime, round) {
    return new Promise((resolve) => {
      try {
        console.log(`🐍 Calling Yahoo Finance API for ${pair} at ${entryTime}, round ${round}`);

        // ไม่ต้องแปลง pair format - Yahoo script จะจัดการเอง
        const targetPair = pair;
        
        // สร้างคำสั่ง Python พร้อม parameters
        const command = `python "${this.pythonScriptPath}" "${targetPair}" "${entryTime}" ${round}`;
        
        console.log(`🔧 Command: ${command}`);

        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Python execution error: ${error.message}`);
            resolve({
              error: `ไม่สามารถเชื่อมต่อ Yahoo Finance ได้: ${error.message}`,
              pair: targetPair,
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
              console.error(`❌ Yahoo Finance API error: ${result.error}`);
              resolve({
                error: result.error,
                pair: targetPair,
                entryTime,
                round
              });
              return;
            }

            console.log(`✅ Successfully got candle data from Yahoo Finance:`, result);
            
            resolve({
              pair: result.symbol || targetPair,
              time: result.time,
              candleSize: result.candle_size,
              open: result.open,
              close: result.close,
              color: result.color, // 'green', 'red', หรือ 'doji'
              round,
              entryTime,
              timestamp: new Date().toISOString(),
              source: result.source || 'Yahoo Finance'
            });

          } catch (parseError) {
            console.error(`❌ JSON parse error: ${parseError.message}`);
            console.log(`📝 Raw stdout:`, stdout);
            
            resolve({
              error: `ไม่สามารถแปลงข้อมูลได้: ${parseError.message}`,
              rawOutput: stdout,
              pair: targetPair,
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

  // ไม่ต้องแปลงชื่อคู่เงิน - Yahoo script จะจัดการเอง
  convertPairToIQFormat(pair) {
    // คงไว้เพื่อ backward compatibility
    return pair;
  }

  // ทดสอบการเชื่อมต่อ Yahoo Finance
  async testConnection() {
    try {
      console.log('🧪 Testing Yahoo Finance connection...');
      
      const testResult = await this.getCandleColor('EUR/USD', '09:00', 1);
      
      if (testResult.error) {
        return {
          success: false,
          error: testResult.error,
          message: 'การเชื่อมต่อ Yahoo Finance ล้มเหลว'
        };
      }

      return {
        success: true,
        message: 'เชื่อมต่อ Yahoo Finance สำเร็จ',
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
        
        // รอ 1 วินาทีระหว่างการเรียก (ถึงแม้ Yahoo ไม่จำกัด)
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

  // ตรวจสอบว่าตลาดเปิดหรือไม่ (Yahoo มีข้อมูล 24/7 สำหรับ crypto)
  isMarketOpen() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Yahoo Finance มีข้อมูลตลอดเวลา
    // แต่ Forex หลักจะปิดสุดสัปดาห์
    if (day === 0 || day === 6) {
      return {
        forex: false, // Forex ปิดสุดสัปดาห์
        crypto: true  // Crypto เปิดตลอด
      };
    }
    
    return {
      forex: true,
      crypto: true
    };
  }

  // ดูสถิติการใช้งาน
  getUsageStats() {
    return {
      pythonScriptPath: this.pythonScriptPath,
      dataSource: 'Yahoo Finance',
      marketStatus: this.isMarketOpen(),
      supportedPairs: [
        // Forex
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
        'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP',
        'EUR/JPY', 'GBP/JPY',
        // Crypto  
        'BTC/USD', 'ETH/USD', 'LTC/USD', 'ADA/USD',
        // Commodities
        'GOLD'
      ],
      features: [
        '✅ ฟรี 100% ไม่จำกัด',
        '✅ ไม่ต้อง API Key',
        '✅ Forex + Crypto + Commodities',
        '✅ Real-time data',
        '✅ Historical data',
        '✅ 5-minute candlesticks'
      ],
      lastChecked: new Date().toISOString()
    };
  }
}

module.exports = new IQOptionService();