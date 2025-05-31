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
  
        // 🎭 MOCK DATA สำหรับทดสอบ
        if (process.env.NODE_ENV === 'production' || process.env.USE_MOCK === 'true') {
          console.log(`🎭 Using MOCK data for testing`);
          
          // สุ่มสีแท่งเทียน
          const colors = ['green', 'red'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          
          // สุ่มราคา
          const basePrice = pair === 'BTCUSD' ? 103000 : 1.0900;
          const variance = pair === 'BTCUSD' ? 100 : 0.0050;
          const open = basePrice + (Math.random() - 0.5) * variance;
          const close = randomColor === 'green' 
            ? open + Math.random() * (variance/2)
            : open - Math.random() * (variance/2);
  
          // คำนวณเวลาแสดงผล
          const [hours, minutes] = entryTime.split(':').map(Number);
          const resultTime = new Date();
          resultTime.setHours(hours, minutes + (5 * round), 0, 0);
          const displayTime = resultTime.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
  
          const mockResult = {
            pair: this.convertPairToIQFormat(pair),
            time: displayTime,
            candleSize: "5min",
            open: Number(open.toFixed(pair === 'BTCUSD' ? 3 : 5)),
            close: Number(close.toFixed(pair === 'BTCUSD' ? 3 : 5)),
            color: randomColor,
            round,
            entryTime,
            timestamp: new Date().toISOString(),
            isMock: true // ระบุว่าเป็น mock data
          };
  
          console.log(`🎭 Mock result:`, mockResult);
          
          // รอ 2 วินาที เพื่อจำลองการประมวลผล
          setTimeout(() => {
            resolve(mockResult);
          }, 2000);
          
          return;
        }
  
        // โค้ดเดิมสำหรับเรียก Python (ถ้าไม่ใช่ production)
        const iqPair = this.convertPairToIQFormat(pair);
        const command = `/opt/render/project/src/.venv/bin/python "${this.pythonScriptPath}" "${iqPair}" "${entryTime}" ${round}`;
        
        console.log(`🔧 Command: ${command}`);

        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
            console.log(`🔍 Debug Info:`);
            console.log(`📂 Working Dir: ${process.cwd()}`);
            console.log(`🐍 Python Path: ${this.pythonScriptPath}`);
            console.log(`✅ File Exists: ${require('fs').existsSync(this.pythonScriptPath)}`);
            
            if (error) {
              console.error(`❌ Error Code: ${error.code}`);
              console.error(`❌ Error Signal: ${error.signal}`);
              console.error(`❌ Error Message: ${error.message}`);
              
              // ทดสอบ Python version และ location
              exec('python --version', (err, out) => {
                console.log(`🐍 Python Version: ${out || err}`);
              });
              
              exec('which python', (err, out) => {
                console.log(`📍 Python Location: ${out || err}`);
              });
              
              resolve({
                error: `ไม่สามารถเชื่อมต่อ IQ Option ได้: ${error.message}`,
                pair: iqPair,
                entryTime,
                round
              });
              return;
            }
          
            if (stderr) {
              console.error(`⚠️ Python stderr (รายละเอียด): ${stderr}`);
              // ถึงแม้จะมี stderr แต่อาจมี stdout ที่ใช้ได้
            }
          
            console.log(`📤 Python stdout: "${stdout}"`);
          
            try {
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
              console.log(`📝 Raw stdout: "${stdout}"`);
              
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