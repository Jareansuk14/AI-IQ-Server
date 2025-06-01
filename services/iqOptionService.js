// AI-Server/services/iqOptionService.js - Twelve Data API Version
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

  // 🔥 ดึงสีแท่งเทียนจาก Twelve Data API
  async getCandleColor(pair, entryTime, round) {
    try {
      console.log(`🌐 Calling Twelve Data API for ${pair} at ${entryTime}, round ${round}`);

      // ตรวจสอบ API Key
      if (!this.apiKey) {
        throw new Error('❌ TWELVE_DATA_API_KEY ไม่ได้ตั้งค่าใน .env file');
      }

      // ตรวจสอบ daily limit
      if (this.requestCount >= this.dailyLimit) {
        throw new Error('❌ เกินขีดจำกัดการเรียก API วันนี้ (800 requests/day)');
      }

      // แปลง pair เป็นรูปแบบ Twelve Data
      const twelveSymbol = this.convertToTwelveDataSymbol(pair);
      console.log(`📊 Twelve Data symbol: ${twelveSymbol}`);

      // คำนวณเวลาเป้าหมาย
      const targetDateTime = this.calculateTargetDateTime(entryTime, round);
      if (!targetDateTime) {
        throw new Error('ไม่สามารถคำนวณเวลาได้');
      }

      console.log(`⏰ Target datetime: ${targetDateTime.toISOString()}`);

      // ดึงข้อมูลจาก Twelve Data
      const candleData = await this.getTwelveDataCandle(twelveSymbol, targetDateTime);
      
      if (!candleData) {
        throw new Error('ไม่สามารถดึงข้อมูลจาก Twelve Data ได้');
      }

      // วิเคราะห์สีแท่งเทียน
      const { open, close, datetime, volume } = candleData;
      
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

      // สร้างเวลาแสดงผล
      const displayTime = new Date(datetime).toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Bangkok'
      });

      const result = {
        pair: pair,
        time: displayTime,
        candleSize: "5min",
        open: parseFloat(open),
        close: parseFloat(close),
        color: color,
        round: round,
        entryTime: entryTime,
        targetDateTime: targetDateTime.toISOString(),
        actualDateTime: datetime,
        volume: parseFloat(volume) || 0,
        source: "Twelve Data API",
        symbol: twelveSymbol,
        requestCount: this.requestCount,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Successfully got candle data:`, result);
      return result;

    } catch (error) {
      console.error(`❌ Error in getCandleColor: ${error.message}`);
      return {
        error: `ไม่สามารถดึงข้อมูลแท่งเทียนได้: ${error.message}`,
        pair: pair,
        entryTime: entryTime,
        round: round,
        requestCount: this.requestCount,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 🌐 ดึงข้อมูลจาก Twelve Data API
  async getTwelveDataCandle(symbol, targetDateTime) {
    try {
      // Method 1: ใช้ Time Series API เพื่อหาแท่งเทียนที่ใกล้เคียงที่สุด
      const endDate = new Date(targetDateTime.getTime() + (3600 * 1000 * 6)); // +6 ชั่วโมง
      const startDate = new Date(targetDateTime.getTime() - (3600 * 1000 * 6)); // -6 ชั่วโมง

      const url = `${this.baseURL}/time_series`;
      
      const params = {
        symbol: symbol,
        interval: '5min',
        apikey: this.apiKey,
        start_date: startDate.toISOString().split('T')[0] + ' ' + startDate.toTimeString().split(' ')[0],
        end_date: endDate.toISOString().split('T')[0] + ' ' + endDate.toTimeString().split(' ')[0],
        format: 'JSON',
        outputsize: 100 // จำกัดจำนวนข้อมูล
      };

      console.log(`🔗 Fetching from Twelve Data: ${url}`);
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

      // หาแท่งเทียนที่ใกล้เคียงกับเวลาเป้าหมายที่สุด
      let closestCandle = null;
      let minDiff = Infinity;

      for (const candle of data.values) {
        const candleTime = new Date(candle.datetime);
        const diff = Math.abs(candleTime.getTime() - targetDateTime.getTime());
        
        if (diff < minDiff) {
          minDiff = diff;
          closestCandle = candle;
        }
      }

      if (!closestCandle) {
        throw new Error('ไม่พบแท่งเทียนที่ตรงกับเวลาที่ต้องการ');
      }

      const diffMinutes = Math.round(minDiff / (1000 * 60));
      console.log(`🎯 Found closest candle, diff: ${diffMinutes} minutes`);

      return {
        datetime: closestCandle.datetime,
        open: closestCandle.open,
        close: closestCandle.close,
        high: closestCandle.high,
        low: closestCandle.low,
        volume: closestCandle.volume
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

  // ⏰ คำนวณเวลาเป้าหมาย (แก้ไขให้ใช้กับ Twelve Data)
  calculateTargetDateTime(entryTimeStr, round) {
    try {
      const [hours, minutes] = entryTimeStr.split(':').map(Number);
      
      const now = new Date();
      const entryTime = new Date();
      entryTime.setHours(hours, minutes, 0, 0);
      
      // ถ้าเวลาเข้าเทรดเลยไปแล้ว ให้ใช้วันก่อนหน้า
      if (entryTime > now) {
        entryTime.setDate(entryTime.getDate() - 1);
      }
      
      // คำนวณเวลาปิดแท่งเทียนสำหรับรอบนั้นๆ
      const targetTime = new Date(entryTime.getTime() + (5 * 60 * 1000 * round));
      
      return targetTime;
      
    } catch (error) {
      console.error(`❌ Error calculating target time: ${error.message}`);
      return null;
    }
  }

  // 🔄 แปลงชื่อคู่เงินเป็น Twelve Data symbol
  convertToTwelveDataSymbol(pair) {
    // Twelve Data ใช้รูปแบบเดียวกับ Forex standard
    const symbolMap = {
      // Forex pairs (Twelve Data ใช้ format เดียวกัน)
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
      
      // Commodities (Twelve Data format)
      'GOLD': 'XAU/USD',
      'XAUUSD': 'XAU/USD'
    };
    
    return symbolMap[pair] || 'EUR/USD';
  }

  // 🧪 ทดสอบการเชื่อมต่อ Twelve Data
  async testConnection() {
    try {
      console.log('🧪 Testing Twelve Data API connection...');
      
      if (!this.apiKey) {
        return {
          success: false,
          error: 'TWELVE_DATA_API_KEY ไม่ได้ตั้งค่าใน .env file',
          message: 'กรุณาเพิ่ม API Key ใน .env file',
          method: 'Twelve Data API'
        };
      }

      // ทดสอบด้วย Quote API (ใช้ request น้อยกว่า)
      const url = `${this.baseURL}/quote`;
      const params = {
        symbol: 'EUR/USD',
        apikey: this.apiKey
      };

      const response = await axios.get(url, { params, timeout: this.timeout });
      this.requestCount++;

      const data = response.data;

      if (data.status === 'error') {
        return {
          success: false,
          error: data.message,
          message: 'การเชื่อมต่อ Twelve Data ล้มเหลว',
          method: 'Twelve Data API',
          requestCount: this.requestCount
        };
      }

      return {
        success: true,
        message: 'เชื่อมต่อ Twelve Data สำเร็จ',
        method: 'Twelve Data API',
        data: {
          symbol: data.symbol,
          price: data.close,
          change: data.change,
          percent_change: data.percent_change
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
        method: 'Twelve Data API',
        requestCount: this.requestCount
      };
    }
  }

  // 📊 ดึงข้อมูลแท่งเทียนหลายรอบ
  async getMultipleCandles(pair, entryTime, rounds) {
    const results = [];
    
    console.log(`🔍 Fetching ${rounds} candles for ${pair}`);
    
    for (let round = 1; round <= rounds; round++) {
      try {
        console.log(`📊 Round ${round}/${rounds} - Request count: ${this.requestCount}/${this.dailyLimit}`);
        
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
        
        const result = await this.getCandleColor(pair, entryTime, round);
        results.push(result);
        
        // รอ 1 วินาทีระหว่างการเรียก (เพื่อไม่ให้ rate limit)
        if (round < rounds) {
          await new Promise(resolve => setTimeout(resolve, 1000));
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

  // 🕐 ตรวจสอบว่าตลาดเปิดหรือไม่
  isMarketOpen() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    
    return {
      forex: day !== 0 && day !== 6,  // Forex ปิดสุดสัปดาห์
      crypto: true,                   // Crypto เปิดตลอด
      tradingHours: hour >= 9 && hour <= 17, // Trading hours 9-17
      timestamp: now.toISOString(),
      timezone: 'Asia/Bangkok'
    };
  }

  // 📈 ดูสถิติการใช้งาน
  getUsageStats() {
    const remainingRequests = Math.max(0, this.dailyLimit - this.requestCount);
    const usagePercent = Math.round((this.requestCount / this.dailyLimit) * 100);

    return {
      method: 'Twelve Data API',
      dataSource: 'Twelve Data Financial API',
      apiEndpoint: this.baseURL,
      timeout: `${this.timeout / 1000} seconds`,
      apiKeyConfigured: !!this.apiKey,
      requestCount: this.requestCount,
      dailyLimit: this.dailyLimit,
      remainingRequests: remainingRequests,
      usagePercent: `${usagePercent}%`,
      marketStatus: this.isMarketOpen(),
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
        '✅ Official Financial Data API',
        '✅ High-quality real-time data',
        '✅ 800 requests/day (Free plan)',
        '✅ Forex + Stock + Crypto + Commodities',
        '✅ 1-minute to 1-month intervals',
        '✅ Technical indicators built-in',
        '✅ Professional-grade accuracy',
        '✅ Rate limiting protection'
      ],
      advantages: [
        'ข้อมูลแม่นยำกว่า Yahoo Finance',
        'Official API มี documentation ชัดเจน',
        'Support ทีมเป็นมืออาชีพ',
        'Rate limiting ป้องกัน API abuse',
        'ข้อมูล real-time ล่าช้าน้อย',
        'รองรับ Technical Indicators'
      ],
      pricing: {
        free: '800 requests/day',
        basic: '$8/month - 5,000 requests/day',
        standard: '$24/month - 15,000 requests/day',
        professional: '$49/month - 50,000 requests/day'
      },
      lastChecked: new Date().toISOString()
    };
  }

  // 🔧 รีเซ็ต request counter (สำหรับวันใหม่)
  resetDailyCounter() {
    this.requestCount = 0;
    console.log('🔄 Daily request counter reset to 0');
  }

  // 💰 ตรวจสอบ quote แบบง่าย (ใช้ request น้อย)
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
        requestCount: this.requestCount
      };

    } catch (error) {
      console.error(`❌ Quote error: ${error.message}`);
      throw error;
    }
  }

  // 🔧 Helper method สำหรับ debug
  async debugCandleData(pair, entryTime, round) {
    try {
      console.log(`🔧 Debug mode - Twelve Data API`);
      console.log(`📊 Pair: ${pair}`);
      console.log(`⏰ Entry Time: ${entryTime}`);
      console.log(`🎯 Round: ${round}`);
      console.log(`🔑 API Key: ${this.apiKey ? 'Configured' : 'Not configured'}`);
      console.log(`📈 Request Count: ${this.requestCount}/${this.dailyLimit}`);

      const twelveSymbol = this.convertToTwelveDataSymbol(pair);
      const targetDateTime = this.calculateTargetDateTime(entryTime, round);

      console.log(`🌐 Twelve Data Symbol: ${twelveSymbol}`);
      console.log(`⏰ Target DateTime: ${targetDateTime?.toISOString()}`);

      const result = await this.getCandleColor(pair, entryTime, round);
      
      console.log(`📊 Final Result:`, JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error('Debug error:', error);
      return { error: error.message };
    }
  }
}

module.exports = new IQOptionService();