// AI-Server/services/iqOptionService.js - Complete Version + Market Hours Check
const axios = require('axios');
require('dotenv').config();

class IQOptionService {
  constructor() {
    this.baseURL = 'https://api.twelvedata.com';
    this.apiKey = process.env.TWELVE_DATA_API_KEY;
    this.timeout = 30000; // 30 วินาที
    this.requestCount = 0; // นับจำนวนการเรียก API
    this.dailyLimit = 800; // Free plan limit
  }

  // 🇹🇭 Helper: สร้าง Date object ใน Asia/Bangkok timezone
  getBangkokTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
  }

  // 🆕 ตรวจสอบว่าตลาดเปิดหรือไม่ (สำหรับ Weekend Rule)
  isMarketOpen(pair) {
    try {
      const bangkokNow = this.getBangkokTime();
      const day = bangkokNow.getDay(); // 0 = Sunday, 6 = Saturday
      
      console.log(`🕐 Checking market hours for ${pair} on day ${day} (Bangkok time)`);
      
      // Crypto เปิดตลอด 24/7
      if (pair === 'BTC/USD' || pair === 'ETH/USD' || pair === 'LTC/USD' || pair === 'ADA/USD') {
        console.log(`✅ ${pair} - Crypto market is always open`);
        return {
          isOpen: true,
          type: 'crypto',
          message: 'Cryptocurrency market is open 24/7'
        };
      }
      
      // Forex และ GOLD ปิดสุดสัปดาห์
      if (day === 0 || day === 6) { // วันอาทิตย์ หรือ วันเสาร์
        console.log(`❌ ${pair} - Forex/Gold market is closed on weekends`);
        return {
          isOpen: false,
          type: pair === 'GOLD' ? 'commodity' : 'forex',
          message: `${pair === 'GOLD' ? 'Gold' : 'Forex'} market is closed on weekends`
        };
      }
      
      // วันจันทร์-ศุกร์ ตลาด Forex/Gold เปิด
      console.log(`✅ ${pair} - Market is open on weekdays`);
      return {
        isOpen: true,
        type: pair === 'GOLD' ? 'commodity' : 'forex',
        message: `${pair === 'GOLD' ? 'Gold' : 'Forex'} market is open`
      };
      
    } catch (error) {
      console.error('❌ Error checking market hours:', error);
      // ถ้าเกิด error ให้ถือว่าตลาดเปิด (safe fallback)
      return {
        isOpen: true,
        type: 'unknown',
        message: 'Unable to determine market hours, assuming open'
      };
    }
  }

  // 🎯 ฟังก์ชันหลักใหม่: ดูแท่งเทียนปัจจุบัน (แก้ไขให้เลือกแท่งถูกต้อง)
  async getCurrentCandle(pair, entryTime = null) {
    try {
      console.log(`🔍 Getting current candle for ${pair}${entryTime ? ` (entry: ${entryTime})` : ''}`);

      // ตรวจสอบ API Key
      if (!this.apiKey) {
        throw new Error('❌ TWELVE_DATA_API_KEY ไม่ได้ตั้งค่าใน .env file');
      }

      // ตรวจสอบ daily limit
      if (this.requestCount >= this.dailyLimit) {
        throw new Error('❌ เกินขีดจำกัดการเรียก API วันนี้ (800 requests/day)');
      }

      // แปลง pair เป็น Twelve Data symbol
      const twelveSymbol = this.convertToTwelveDataSymbol(pair);
      console.log(`📊 Twelve Data symbol: ${twelveSymbol}`);

      // ดึงข้อมูลแท่งเทียนล่าสุด พร้อมส่ง entryTime ไปด้วย
      const candleData = await this.getLatestCandle(twelveSymbol, entryTime);
      
      if (!candleData) {
        throw new Error('ไม่สามารถดึงข้อมูลแท่งเทียนได้');
      }

      // วิเคราะห์สีแท่งเทียน
      const { open, close, datetime, high, low, volume } = candleData;
      
      console.log(`📊 Open: ${open}, Close: ${close}`);

      // กำหนดสีแท่งเทียน
      let color;
      if (close > open) {
        color = "green";  // แท่งเขียว (ราคาขึ้น)
      } else if (close < open) {
        color = "red";    // แท่งแดง (ราคาลง)
      } else {
        color = "doji";   // แท่งเท่ากัน
      }

      console.log(`🎯 Candle color: ${color}`);

      // สร้างเวลาแสดงผล (เวลาไทย)
      const candleTime = new Date(datetime);
      // 🇹🇭 แปลงเป็น Bangkok timezone
      const bangkokTime = new Date(candleTime.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      const displayTime = bangkokTime.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit'
      });

      const result = {
        pair: pair,
        symbol: twelveSymbol,
        time: displayTime,
        datetime: datetime,
        candleSize: "5min",
        open: parseFloat(open),
        close: parseFloat(close),
        high: parseFloat(high),
        low: parseFloat(low),
        volume: parseFloat(volume) || 0,
        color: color,
        source: "Twelve Data API",
        requestCount: this.requestCount,
        timestamp: this.getBangkokTime().toISOString() // Bangkok timezone
      };

      console.log(`✅ Current candle result:`, result);
      return result;

    } catch (error) {
      console.error(`❌ Error getting current candle: ${error.message}`);
      return {
        error: `ไม่สามารถดึงข้อมูลแท่งเทียนได้: ${error.message}`,
        pair: pair,
        timestamp: this.getBangkokTime().toISOString() // Bangkok timezone
      };
    }
  }

  // 🔍 หาแท่งเทียนที่ตรงกับเวลาที่ต้องการมากที่สุด
  findBestMatchCandle(candles, targetDateTime) {
    let bestMatch = null;
    let smallestDiff = Infinity;
    
    console.log(`🎯 Target time (Bangkok): ${this.formatBangkokTime(targetDateTime)}`);
    
    for (const candle of candles) {
      const candleTime = new Date(candle.datetime);
      // แปลงเป็น Bangkok time เพื่อเปรียบเทียบ
      const candleBangkok = new Date(candleTime.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      const timeDiff = Math.abs(candleBangkok.getTime() - targetDateTime.getTime());
      
      const candleTimeStr = this.formatBangkokTime(candleBangkok);
      console.log(`📊 Checking candle: ${candleTimeStr} (diff: ${Math.round(timeDiff / 1000)}s)`);
      
      // หาแท่งที่มีความต่างเวลาน้อยที่สุด
      if (timeDiff < smallestDiff) {
        smallestDiff = timeDiff;
        bestMatch = candle;
      }
    }
    
    // ถ้าความต่างมากกว่า 10 นาที ถือว่าไม่ตรงกัน
    if (smallestDiff > 10 * 60 * 1000) {
      console.log(`⚠️ Best match time difference too large: ${Math.round(smallestDiff / 1000)}s`);
      return null;
    }
    
    console.log(`🎯 Best match found with ${Math.round(smallestDiff / 1000)}s difference`);
    return bestMatch;
  }

  // 🇹🇭 Helper: แปลง Date เป็น Bangkok time string
  formatBangkokTime(date, options = { hour: '2-digit', minute: '2-digit' }) {
    return date.toLocaleTimeString('th-TH', options);
  }

  // 🌐 ดึงข้อมูลแท่งเทียนล่าสุดจาก Twelve Data (แก้ไขให้เลือกแท่งถูกต้อง)
  async getLatestCandle(twelveSymbol, entryTime = null) {
    try {
      const url = `${this.baseURL}/time_series`;
      
      const params = {
        symbol: twelveSymbol,
        interval: '5min',
        apikey: this.apiKey,
        outputsize: 10, // เพิ่มจาก 2 เป็น 10 เพื่อหาแท่งที่ถูกต้อง
        format: 'JSON'
      };

      console.log(`🔗 Fetching latest candle: ${url}`);
      console.log(`📊 Params:`, params);

      const response = await axios.get(url, {
        params,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TradingBot/1.0)',
          'Accept': 'application/json'
        }
      });

      // นับจำนวนการเรียก API
      this.requestCount++;
      console.log(`📈 API Request count: ${this.requestCount}/${this.dailyLimit}`);

      const data = response.data;
      
      if (data.status === 'error') {
        throw new Error(`Twelve Data API Error: ${data.message}`);
      }

      if (!data.values || data.values.length === 0) {
        throw new Error('ไม่พบข้อมูลแท่งเทียนใน Twelve Data');
      }

      console.log(`📊 Got ${data.values.length} candles from Twelve Data`);

      // 🎯 สำหรับ Binary Options: เลือกแท่งที่ถูกต้องตาม entryTime
      let targetCandle;
      
      if (entryTime) {
        // คำนวณเวลาที่ต้องการ (entryTime + 5 นาที)
        const [entryHour, entryMinute] = entryTime.split(':').map(Number);
        const bangkokNow = this.getBangkokTime();
        const entryDateTime = new Date(bangkokNow);
        entryDateTime.setHours(entryHour, entryMinute, 0, 0);
        
        // เวลาที่แท่งเทียนควรปิด (entryTime + 5 นาที)
        const targetDateTime = new Date(entryDateTime.getTime() + 5 * 60 * 1000);
        const targetTimeStr = this.formatBangkokTime(targetDateTime);
        
        console.log(`🎯 Looking for candle that closes at: ${targetTimeStr}`);
        
        // หาแท่งที่มีเวลาตรงกัน หรือใกล้เคียงที่สุด
        targetCandle = this.findBestMatchCandle(data.values, targetDateTime);
        
        if (targetCandle) {
          const candleTime = new Date(targetCandle.datetime);
          const candleBangkok = new Date(candleTime.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
          const candleTimeStr = this.formatBangkokTime(candleBangkok);
          console.log(`✅ Found matching candle: ${candleTimeStr}`);
        } else {
          console.log(`⚠️ No exact match found, using latest closed candle`);
          // ถ้าหาไม่เจอ ใช้แท่งก่อนหน้า (แท่งที่ปิดแล้ว)
          targetCandle = data.values.length >= 2 ? data.values[1] : data.values[0];
        }
      } else {
        // ถ้าไม่มี entryTime ใช้วิธีเดิม (แท่งก่อนหน้า)
        if (data.values.length >= 2) {
          targetCandle = data.values[1]; // แท่งก่อนหน้า (ปิดแล้ว)
          console.log(`🎯 Using previous candle (closed): ${targetCandle.datetime}`);
        } else {
          targetCandle = data.values[0]; // fallback
          console.log(`⚠️ Using current candle (may still be active): ${targetCandle.datetime}`);
        }
      }

      return {
        datetime: targetCandle.datetime,
        open: targetCandle.open,
        close: targetCandle.close,
        high: targetCandle.high,
        low: targetCandle.low,
        volume: targetCandle.volume
      };

    } catch (error) {
      console.error(`❌ Twelve Data API error: ${error.message}`);
      
      if (error.response) {
        console.error(`❌ Response status: ${error.response.status}`);
        console.error(`❌ Response data:`, error.response.data);
        
        // ตรวจสอบ error จาก API
        if (error.response.data?.message?.includes('API key')) {
          throw new Error('API Key ไม่ถูกต้องหรือหมดอายุ');
        }
        if (error.response.data?.message?.includes('limit')) {
          throw new Error('เกินขีดจำกัดการเรียก API');
        }
      }
      
      throw new Error(`ไม่สามารถดึงข้อมูลจาก Twelve Data ได้: ${error.message}`);
    }
  }

  // 🔄 ฟังก์ชันเดิม (สำหรับ backward compatibility)
  async getCandleColor(pair, entryTime, round) {
    try {
      console.log(`🔄 Legacy function called: ${pair}, ${entryTime}, round ${round}`);
      console.log(`⚠️ Using simplified getCurrentCandle() instead`);
      
      // ใช้ฟังก์ชันใหม่แทน (ส่ง entryTime ไปด้วย)
      const result = await this.getCurrentCandle(pair, entryTime);
      
      if (result.error) {
        return {
          error: result.error,
          pair: pair,
          entryTime: entryTime,
          round: round
        };
      }

      // แปลงผลลัพธ์ให้เข้ากับรูปแบบเดิม
      return {
        pair: result.pair,
        time: result.time,
        candleSize: result.candleSize,
        open: result.open,
        close: result.close,
        color: result.color,
        round: round,
        entryTime: entryTime,
        actualDateTime: result.datetime,
        volume: result.volume,
        source: result.source,
        timestamp: this.getBangkokTime().toISOString() // Bangkok timezone
      };

    } catch (error) {
      console.error(`❌ Error in legacy getCandleColor: ${error.message}`);
      return {
        error: `ไม่สามารถดึงข้อมูลแท่งเทียนได้: ${error.message}`,
        pair: pair,
        entryTime: entryTime,
        round: round
      };
    }
  }

  // 🔄 แปลงชื่อคู่เงินเป็น Twelve Data symbol (เหมือนเดิม)
  convertToTwelveDataSymbol(pair) {
    const symbolMap = {
      // Forex pairs
      'EUR/USD': 'EUR/USD',
      'EURUSD': 'EUR/USD',
      'GBP/USD': 'GBP/USD',
      'GBPUSD': 'GBP/USD',
      'USD/JPY': 'USD/JPY',
      'USDJPY': 'USD/JPY',
      'USD/CHF': 'USD/CHF',
      'USDCHF': 'USD/CHF',
      'AUD/USD': 'AUD/USD',
      'AUDUSD': 'AUD/USD',
      'NZD/USD': 'NZD/USD',
      'NZDUSD': 'NZD/USD',
      'USD/CAD': 'USD/CAD',
      'USDCAD': 'USD/CAD',
      'EUR/GBP': 'EUR/GBP',
      'EURGBP': 'EUR/GBP',
      'EUR/JPY': 'EUR/JPY',
      'EURJPY': 'EUR/JPY',
      'GBP/JPY': 'GBP/JPY',
      'GBPJPY': 'GBP/JPY',
      
      // Crypto pairs
      'BTC/USD': 'BTC/USD',
      'BTCUSD': 'BTC/USD',
      'ETH/USD': 'ETH/USD',
      'ETHUSD': 'ETH/USD',
      'LTC/USD': 'LTC/USD',
      'LTCUSD': 'LTC/USD',
      'ADA/USD': 'ADA/USD',
      'ADAUSD': 'ADA/USD',
      
      // Commodities
      'GOLD': 'XAU/USD',
      'XAUUSD': 'XAU/USD'
    };
    
    return symbolMap[pair] || 'EUR/USD';
  }

  // 🧪 ทดสอบการเชื่อมต่อ (เรียบง่าย)
  async testConnection() {
    try {
      console.log('🧪 Testing Twelve Data API connection...');
      
      if (!this.apiKey) {
        return {
          success: false,
          error: 'TWELVE_DATA_API_KEY ไม่ได้ตั้งค่าใน .env file',
          message: 'กรุณาเพิ่ม API Key ใน .env file',
          method: 'Twelve Data API (Simplified)'
        };
      }

      // ทดสอบด้วยการดูแท่งเทียนปัจจุบัน (ไม่ส่ง entryTime ในการทดสอบ)
      const testResult = await this.getCurrentCandle('EUR/USD');
      
      if (testResult.error) {
        return {
          success: false,
          error: testResult.error,
          message: 'การเชื่อมต่อ Twelve Data ล้มเหลว',
          method: 'Twelve Data API (Simplified)',
          requestCount: this.requestCount
        };
      }

      return {
        success: true,
        message: 'เชื่อมต่อ Twelve Data สำเร็จ (Simplified Version)',
        method: 'Twelve Data API - getCurrentCandle()',
        data: {
          pair: testResult.pair,
          time: testResult.time,
          color: testResult.color,
          price: testResult.close
        },
        requestCount: this.requestCount,
        remainingRequests: this.dailyLimit - this.requestCount
      };

    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'ไม่สามารถทดสอบการเชื่อมต่อได้',
        method: 'Twelve Data API (Simplified)',
        requestCount: this.requestCount
      };
    }
  }

  // 📊 ดึงข้อมูลแท่งเทียนหลายรอบ (สำหรับ testing)
  async getMultipleCandles(pair, entryTime, rounds) {
    const results = [];
    
    console.log(`🔍 Testing with simplified method - Getting current candle ${rounds} times`);
    
    for (let round = 1; round <= rounds; round++) {
      try {
        console.log(`📊 Test ${round}/${rounds} - Request count: ${this.requestCount}/${this.dailyLimit}`);
        
        // ตรวจสอบ daily limit
        if (this.requestCount >= this.dailyLimit) {
          results.push({
            error: 'เกินขีดจำกัดการเรียก API วันนี้',
            round,
            pair,
            entryTime,
            requestCount: this.requestCount
          });
          break;
        }
        
        // ใช้ฟังก์ชันใหม่ getCurrentCandle() (ส่ง entryTime สำหรับทดสอบ)
        const result = await this.getCurrentCandle(pair, entryTime);
        result.round = round; // เพิ่ม round number
        result.entryTime = entryTime; // เพิ่ม entry time
        results.push(result);
        
        // รอ 2 วินาทีระหว่างการเรียก
        if (round < rounds) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        results.push({
          error: error.message,
          round,
          pair,
          entryTime,
          requestCount: this.requestCount
        });
      }
    }
    
    return results;
  }

  // 📈 ดูสถิติการใช้งาน (อัปเดต + Market Hours)
  getUsageStats() {
    const remainingRequests = Math.max(0, this.dailyLimit - this.requestCount);
    const usagePercent = Math.round((this.requestCount / this.dailyLimit) * 100);
    const bangkokNow = this.getBangkokTime();
    const day = bangkokNow.getDay();

    return {
      method: 'Twelve Data API (Simplified)',
      mainFunction: 'getCurrentCandle()',
      dataSource: 'Twelve Data Financial API',
      apiEndpoint: this.baseURL,
      timeout: `${this.timeout / 1000} seconds`,
      apiKeyConfigured: !!this.apiKey,
      requestCount: this.requestCount,
      dailyLimit: this.dailyLimit,
      remainingRequests: remainingRequests,
      usagePercent: `${usagePercent}%`,
      marketStatus: {
        forex: !(day === 0 || day === 6),  // Forex ปิดสุดสัปดาห์
        crypto: true,                      // Crypto เปิดตลอด
        tradingHours: bangkokNow.getHours() >= 9 && bangkokNow.getHours() <= 17, // Trading hours 9-17
        currentDay: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][day],
        timestamp: bangkokNow.toISOString(),
        timezone: 'Asia/Bangkok'
      },
      supportedPairs: [
        // Forex
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
        'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP',
        'EUR/JPY', 'GBP/JPY',
        // Crypto  
        'BTC/USD', 'ETH/USD', 'LTC/USD', 'ADA/USD',
        // Commodities
        'XAU/USD (GOLD)'
      ],
      features: [
        '✅ Weekend Market Check',
        '✅ Simplified Logic',
        '✅ Current Candle Only',
        '✅ No Time Calculation',
        '✅ 800 requests/day (Free plan)',
        '✅ Real-time latest candle',
        '✅ Easy to understand',
        '✅ Rate limiting protection'
      ],
      advantages: [
        'เรียบง่ายกว่าเดิม 90%',
        'ไม่ต้องคำนวณเวลา',
        'ดูแท่งเทียนปัจจุบันเท่านั้น',
        'ลด complexity ลงอย่างมาก',
        'ง่ายต่อการ debug',
        'ใช้ API calls น้อยลง',
        'รองรับ Weekend Trading Rule'
      ],
      pricing: {
        free: '800 requests/day',
        basic: '$8/month - 5,000 requests/day',
        standard: '$24/month - 15,000 requests/day'
      },
      lastChecked: this.getBangkokTime().toISOString() // Bangkok timezone
    };
  }

  // 🔧 รีเซ็ต request counter (เหมือนเดิม)
  resetDailyCounter() {
    this.requestCount = 0;
    console.log('🔄 Daily request counter reset to 0');
  }

  // 💰 ตรวจสอบ quote แบบง่าย (เหมือนเดิม)
  async getQuote(pair) {
    try {
      if (!this.apiKey) {
        throw new Error('TWELVE_DATA_API_KEY ไม่ได้ตั้งค่า');
      }

      const symbol = this.convertToTwelveDataSymbol(pair);
      const url = `${this.baseURL}/quote`;
      
      const params = {
        symbol: symbol,
        apikey: this.apiKey
      };

      const response = await axios.get(url, { params, timeout: this.timeout });
      this.requestCount++;

      const data = response.data;

      if (data.status === 'error') {
        throw new Error(data.message);
      }

      return {
        symbol: data.symbol,
        price: parseFloat(data.close),
        change: parseFloat(data.change),
        percent_change: data.percent_change,
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        volume: parseFloat(data.volume) || 0,
        timestamp: data.datetime,
        source: 'Twelve Data',
        requestCount: this.requestCount,
        bangkokTime: this.getBangkokTime().toISOString() // Bangkok timezone
      };

    } catch (error) {
      console.error(`❌ Quote error: ${error.message}`);
      throw error;
    }
  }

  // 🔧 Helper method สำหรับ debug (อัปเดต - รองรับ entryTime + Market Hours)
  async debugCurrentCandle(pair, entryTime = null) {
    try {
      console.log(`🔧 Debug mode - getCurrentCandle() with market hours check`);
      console.log(`📊 Pair: ${pair}`);
      console.log(`⏰ Entry Time: ${entryTime || 'Not specified'}`);
      console.log(`🔑 API Key: ${this.apiKey ? 'Configured' : 'Not configured'}`);
      console.log(`📈 Request Count: ${this.requestCount}/${this.dailyLimit}`);

      // ตรวจสอบตลาดก่อน
      const marketStatus = this.isMarketOpen(pair);
      console.log(`🕐 Market Status:`, marketStatus);

      const twelveSymbol = this.convertToTwelveDataSymbol(pair);
      console.log(`🌐 Twelve Data Symbol: ${twelveSymbol}`);

      const result = await this.getCurrentCandle(pair, entryTime);
      
      console.log(`📊 Final Result:`, JSON.stringify(result, null, 2));
      
      return {
        marketStatus,
        result
      };
    } catch (error) {
      console.error('Debug error:', error);
      return { error: error.message };
    }
  }
}

module.exports = new IQOptionService();