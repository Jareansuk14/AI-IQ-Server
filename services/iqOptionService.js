// AI-Server/services/iqOptionService.js - Pure Node.js Version
const axios = require('axios');

class IQOptionService {
  constructor() {
    // ไม่ต้องใช้ Python script อีกต่อไป
    this.baseURL = 'https://query1.finance.yahoo.com';
    this.timeout = 30000; // 30 วินาที
  }

  // 🔥 ดึงสีแท่งเทียนจาก Yahoo Finance โดยตรง (Pure Node.js)
  async getCandleColor(pair, entryTime, round) {
    try {
      console.log(`🌐 Calling Yahoo Finance API directly for ${pair} at ${entryTime}, round ${round}`);

      // แปลง pair เป็น Yahoo Finance symbol
      const yahooSymbol = this.convertPairToYahooSymbol(pair);
      console.log(`📊 Yahoo symbol: ${yahooSymbol}`);

      // คำนวณ timestamp เป้าหมาย
      const targetTimestamp = this.calculateTargetTime(entryTime, round);
      if (!targetTimestamp) {
        throw new Error('ไม่สามารถคำนวณเวลาได้');
      }

      console.log(`⏰ Target timestamp: ${targetTimestamp}`);

      // ดึงข้อมูลจาก Yahoo Finance
      const candleData = await this.getYahooFinanceData(yahooSymbol, targetTimestamp);
      
      if (!candleData) {
        throw new Error('ไม่สามารถดึงข้อมูลจาก Yahoo Finance ได้');
      }

      // วิเคราะห์สีแท่งเทียน
      const { open, close, timestamp, volume } = candleData;
      
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

      // สร้าง timestamp แสดงผล
      const candleTime = new Date(timestamp * 1000);
      const displayTime = candleTime.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Bangkok'
      });

      const result = {
        pair: pair,
        time: displayTime,
        candleSize: "5min",
        open: Math.round(open * 100000) / 100000,
        close: Math.round(close * 100000) / 100000,
        color: color,
        round: round,
        entryTime: entryTime,
        targetTimestamp: targetTimestamp,
        actualTimestamp: timestamp,
        volume: volume || 0,
        source: "Yahoo Finance (Node.js)",
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
        timestamp: new Date().toISOString()
      };
    }
  }

  // 🌐 ดึงข้อมูลจาก Yahoo Finance API โดยตรง
  async getYahooFinanceData(yahooSymbol, targetTimestamp) {
    try {
      // คำนวณช่วงเวลาสำหรับดึงข้อมูล
      const endTime = targetTimestamp + (3600 * 24);   // +24 ชั่วโมง
      const startTime = targetTimestamp - (3600 * 24); // -24 ชั่วโมง

      const url = `${this.baseURL}/v8/finance/chart/${yahooSymbol}`;
      
      const params = {
        period1: startTime,
        period2: endTime,
        interval: '5m',
        includePrePost: false
      };

      console.log(`🔗 Fetching: ${url}`);
      console.log(`📊 Params:`, params);

      const response = await axios.get(url, {
        params,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const data = response.data;
      
      if (!data.chart?.result?.[0]) {
        throw new Error('ไม่พบข้อมูลจาก Yahoo Finance');
      }

      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const indicators = result.indicators.quote[0];

      const opens = indicators.open;
      const closes = indicators.close;
      const volumes = indicators.volume || [];

      console.log(`📊 Got ${timestamps.length} data points`);

      // หาแท่งเทียนที่ใกล้เคียงกับ target_timestamp ที่สุด
      let closestIndex = null;
      let minDiff = Infinity;

      for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i] && opens[i] !== null && closes[i] !== null) {
          const diff = Math.abs(timestamps[i] - targetTimestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }
      }

      if (closestIndex === null) {
        throw new Error('ไม่พบแท่งเทียนที่ตรงกับเวลาที่ต้องการ');
      }

      console.log(`🎯 Found closest candle at index ${closestIndex}, diff: ${minDiff} seconds`);

      // ส่งคืนข้อมูลแท่งเทียน
      return {
        timestamp: timestamps[closestIndex],
        open: opens[closestIndex],
        close: closes[closestIndex],
        volume: volumes[closestIndex] || 0
      };

    } catch (error) {
      console.error(`❌ Yahoo Finance API error: ${error.message}`);
      
      if (error.response) {
        console.error(`❌ Response status: ${error.response.status}`);
        console.error(`❌ Response data:`, error.response.data);
      }
      
      throw new Error(`ไม่สามารถดึงข้อมูลจาก Yahoo Finance ได้: ${error.message}`);
    }
  }

  // ⏰ คำนวณเวลาเป้าหมาย
  calculateTargetTime(entryTimeStr, round) {
    try {
      // แปลง entryTimeStr เป็น datetime
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
      
      // แปลงเป็น Unix timestamp
      return Math.floor(targetTime.getTime() / 1000);
      
    } catch (error) {
      console.error(`❌ Error calculating target time: ${error.message}`);
      return null;
    }
  }

  // 🔄 แปลงชื่อคู่เงินเป็น Yahoo Finance symbol
  convertPairToYahooSymbol(pair) {
    const symbolMap = {
      // Forex pairs
      'EUR/USD': 'EURUSD=X',
      'EURUSD': 'EURUSD=X',
      'GBP/USD': 'GBPUSD=X',
      'GBPUSD': 'GBPUSD=X',
      'USD/JPY': 'USDJPY=X',
      'USDJPY': 'USDJPY=X',
      'USD/CHF': 'USDCHF=X',
      'USDCHF': 'USDCHF=X',
      'AUD/USD': 'AUDUSD=X',
      'AUDUSD': 'AUDUSD=X',
      'NZD/USD': 'NZDUSD=X',
      'NZDUSD': 'NZDUSD=X',
      'USD/CAD': 'USDCAD=X',
      'USDCAD': 'USDCAD=X',
      'EUR/GBP': 'EURGBP=X',
      'EURGBP': 'EURGBP=X',
      'EUR/JPY': 'EURJPY=X',
      'EURJPY': 'EURJPY=X',
      'GBP/JPY': 'GBPJPY=X',
      'GBPJPY': 'GBPJPY=X',
      
      // Crypto pairs
      'BTC/USD': 'BTC-USD',
      'BTCUSD': 'BTC-USD',
      'ETH/USD': 'ETH-USD',
      'ETHUSD': 'ETH-USD',
      'LTC/USD': 'LTC-USD',
      'LTCUSD': 'LTC-USD',
      'ADA/USD': 'ADA-USD',
      'ADAUSD': 'ADA-USD',
      
      // Commodities
      'GOLD': 'GC=F',
      'XAUUSD': 'GC=F'
    };
    
    return symbolMap[pair] || 'EURUSD=X';
  }

  // 🧪 ทดสอบการเชื่อมต่อ Yahoo Finance
  async testConnection() {
    try {
      console.log('🧪 Testing Yahoo Finance connection (Node.js)...');
      
      const testResult = await this.getCandleColor('EUR/USD', '09:00', 1);
      
      if (testResult.error) {
        return {
          success: false,
          error: testResult.error,
          message: 'การเชื่อมต่อ Yahoo Finance ล้มเหลว',
          method: 'Pure Node.js'
        };
      }

      return {
        success: true,
        message: 'เชื่อมต่อ Yahoo Finance สำเร็จ (Pure Node.js)',
        method: 'Node.js HTTP Request',
        data: testResult
      };

    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'ไม่สามารถทดสอบการเชื่อมต่อได้',
        method: 'Pure Node.js'
      };
    }
  }

  // 📊 ดึงข้อมูลแท่งเทียนหลายรอบ
  async getMultipleCandles(pair, entryTime, rounds) {
    const results = [];
    
    for (let round = 1; round <= rounds; round++) {
      try {
        console.log(`🔍 Fetching candle for round ${round}/${rounds}`);
        
        const result = await this.getCandleColor(pair, entryTime, round);
        results.push(result);
        
        // รอ 1 วินาทีระหว่างการเรียก
        if (round < rounds) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
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

  // 🕐 ตรวจสอบว่าตลาดเปิดหรือไม่
  isMarketOpen() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    return {
      forex: day !== 0 && day !== 6,  // Forex ปิดสุดสัปดาห์
      crypto: true,                   // Crypto เปิดตลอด
      timestamp: now.toISOString()
    };
  }

  // 📈 ดูสถิติการใช้งาน
  getUsageStats() {
    return {
      method: 'Pure Node.js (No Python dependencies)',
      dataSource: 'Yahoo Finance HTTP API',
      apiEndpoint: this.baseURL,
      timeout: `${this.timeout / 1000} seconds`,
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
        '✅ Pure Node.js (No Python)',
        '✅ Direct HTTP API calls',
        '✅ ฟรี 100% ไม่จำกัด',
        '✅ ไม่ต้อง API Key',
        '✅ Forex + Crypto + Commodities',
        '✅ Real-time data',
        '✅ 5-minute candlesticks',
        '✅ No external dependencies'
      ],
      advantages: [
        'ไม่ต้องติดตั้ง Python',
        'ไม่ต้องจัดการ child process',
        'เร็วกว่า (ไม่ต้องผ่าน Python)',
        'ง่ายต่อการ debug',
        'น้อย dependencies',
        'เสถียรกว่า'
      ],
      lastChecked: new Date().toISOString()
    };
  }

  // 🔧 Helper method สำหรับ debug
  async debugCandleData(pair, entryTime, round) {
    try {
      console.log(`🔧 Debug mode - Fetching candle data`);
      console.log(`📊 Pair: ${pair}`);
      console.log(`⏰ Entry Time: ${entryTime}`);
      console.log(`🎯 Round: ${round}`);

      const yahooSymbol = this.convertPairToYahooSymbol(pair);
      const targetTimestamp = this.calculateTargetTime(entryTime, round);

      console.log(`🌐 Yahoo Symbol: ${yahooSymbol}`);
      console.log(`⏰ Target Timestamp: ${targetTimestamp}`);
      console.log(`📅 Target Date: ${new Date(targetTimestamp * 1000).toISOString()}`);

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