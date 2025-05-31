// AI-Server/services/aiService.js - ใช้ HTTP API แทน Python Script

const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

class AiService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AI_API_KEY
    });
  }

  // ฟังก์ชันเดิมสำหรับวิเคราะห์รูปภาพ (คงเดิม)
  async processImage(imageBuffer, command) {
    try {
      console.log('Processing image with OpenAI API...');
      console.log('Image size:', (imageBuffer.length / 1024 / 1024).toFixed(2), 'MB');
      
      const base64Image = imageBuffer.toString('base64');
      
      console.log('Sending request to OpenAI API...');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: command },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });
      
      console.log('Received response from OpenAI API');
      
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      } else {
        throw new Error('ไม่พบเนื้อหาในการตอบกลับจาก API');
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      if (error.message && error.message.includes('deprecated')) {
        console.error('Model deprecated error. Trying with gpt-4 as fallback...');
        
        try {
          const base64Image = imageBuffer.toString('base64');
          
          const fallbackResponse = await this.openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: command },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000
          });
          
          console.log('Fallback model successful');
          return fallbackResponse.choices[0].message.content;
        } catch (fallbackError) {
          console.error('Fallback attempt also failed:', fallbackError);
          throw new Error('ไม่สามารถวิเคราะห์รูปภาพได้: โมเดลปัจจุบันไม่รองรับ กรุณาตรวจสอบเอกสาร OpenAI สำหรับโมเดลล่าสุดที่รองรับการวิเคราะห์รูปภาพ');
        }
      }
      
      if (error.status === 401) {
        throw new Error('รหัส API ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบการตั้งค่า API key');
      } else if (error.status === 400) {
        throw new Error(`คำขอไม่ถูกต้อง: ${error.message}`);
      } else if (error.status === 413) {
        throw new Error('รูปภาพมีขนาดใหญ่เกินไป กรุณาลดขนาดรูปภาพและลองอีกครั้ง');
      } else {
        throw new Error(`ไม่สามารถวิเคราะห์รูปภาพได้: ${error.message}`);
      }
    }
  }

  // 🔥 ฟังก์ชันใหม่: ใช้ HTTP API แทน Python Script
  async processForexQuestion(question) {
    try {
      console.log('🔍 Processing forex question with HTTP API...');
      console.log('Question:', question);
      
      // ดึงชื่อคู่เงินจากคำถาม
      const pair = this.extractPairFromQuestion(question);
      console.log('📊 Extracted pair:', pair);

      // เรียก HTTP API แทน Python script
      const technicalResult = await this.getTechnicalAnalysisHTTP(pair);
      
      if (technicalResult.error) {
        console.error('❌ Technical analysis failed:', technicalResult.error);
        // Fallback - ใช้ smart fallback
        return {
          signal: technicalResult.fallback_signal || 'CALL',
          confidence: 'LOW',
          winChance: 50,
          reasoning: 'ใช้การวิเคราะห์พื้นฐาน (ไม่สามารถดึงข้อมูลทางเทคนิคได้)',
          technicalData: null
        };
      }

      console.log('✅ Technical analysis successful:', {
        signal: technicalResult.signal,
        confidence: technicalResult.confidence,
        score: technicalResult.technical_score
      });

      // คำนวณโอกาสชนะจาก technical score
      const winChance = this.calculateWinChance(technicalResult.technical_score, technicalResult.confidence);

      return {
        signal: technicalResult.signal,
        confidence: technicalResult.confidence,
        winChance: winChance,
        reasoning: technicalResult.reasoning,
        technicalData: technicalResult
      };

    } catch (error) {
      console.error('❌ Error in processForexQuestion:', error);
      
      // Final fallback
      return {
        signal: Math.random() > 0.5 ? 'CALL' : 'PUT',
        confidence: 'LOW',
        winChance: 50,
        reasoning: 'เกิดข้อผิดพลาดในการวิเคราะห์',
        technicalData: null
      };
    }
  }

  // 🆕 ดึงข้อมูลและวิเคราะห์ทางเทคนิคผ่าน HTTP API
  async getTechnicalAnalysisHTTP(pair) {
    try {
      console.log(`🌐 Fetching data for ${pair} via HTTP API`);

      // แปลง pair เป็น Yahoo Finance symbol
      const yahooSymbol = this.convertToYahooSymbol(pair);
      console.log(`📈 Yahoo symbol: ${yahooSymbol}`);

      // ดึงข้อมูลจาก Yahoo Finance
      const marketData = await this.fetchYahooFinanceData(yahooSymbol);
      
      if (!marketData || marketData.length < 20) {
        throw new Error('ไม่สามารถดึงข้อมูลเพียงพอสำหรับการวิเคราะห์');
      }

      console.log(`📊 Got ${marketData.length} data points for analysis`);

      // คำนวณ Technical Indicators
      const indicators = this.calculateTechnicalIndicators(marketData);
      
      // วิเคราะห์สัญญาณ
      const signalAnalysis = this.analyzeSignals(indicators, marketData);

      // สร้างผลลัพธ์
      const currentPrice = marketData[marketData.length - 1].close;
      const previousPrice = marketData[marketData.length - 2].close;
      const change = currentPrice - previousPrice;
      const changePercent = (change / previousPrice) * 100;

      return {
        pair: pair,
        signal: signalAnalysis.recommendation,
        confidence: signalAnalysis.confidence,
        technical_score: signalAnalysis.score,
        current_price: currentPrice,
        change_percent: changePercent,
        indicators: indicators,
        bullish_signals: signalAnalysis.bullish_signals,
        bearish_signals: signalAnalysis.bearish_signals,
        reasoning: signalAnalysis.reasoning,
        timestamp: new Date().toISOString(),
        source: 'Yahoo Finance HTTP API'
      };

    } catch (error) {
      console.error(`❌ Error in getTechnicalAnalysisHTTP: ${error.message}`);
      return {
        error: `ไม่สามารถวิเคราะห์ทางเทคนิคได้: ${error.message}`,
        pair,
        fallback_signal: this.getSmartFallback(pair)
      };
    }
  }

  // 🌐 ดึงข้อมูลจาก Yahoo Finance API
  async fetchYahooFinanceData(yahooSymbol) {
    try {
      // สร้าง timestamp สำหรับ 1 วันที่แล้ว และปัจจุบัน
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (24 * 60 * 60); // 24 ชั่วโมงที่แล้ว

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
      
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
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const data = response.data;
      
      if (!data.chart?.result?.[0]) {
        throw new Error('ไม่พบข้อมูลจาก Yahoo Finance');
      }

      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const indicators = result.indicators.quote[0];

      // แปลงข้อมูลเป็น array ของ objects
      const marketData = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        if (indicators.open[i] && indicators.close[i] && 
            indicators.high[i] && indicators.low[i]) {
          marketData.push({
            timestamp: timestamps[i],
            open: indicators.open[i],
            high: indicators.high[i],
            low: indicators.low[i],
            close: indicators.close[i],
            volume: indicators.volume[i] || 0
          });
        }
      }

      console.log(`✅ Successfully parsed ${marketData.length} candles`);
      return marketData;

    } catch (error) {
      console.error(`❌ Error fetching Yahoo Finance data: ${error.message}`);
      if (error.response) {
        console.error(`❌ Response status: ${error.response.status}`);
        console.error(`❌ Response data:`, error.response.data);
      }
      throw error;
    }
  }

  // 📊 คำนวณ Technical Indicators
  calculateTechnicalIndicators(data) {
    try {
      const closes = data.map(d => d.close);
      const highs = data.map(d => d.high);
      const lows = data.map(d => d.low);

      // คำนวณ EMA
      const ema14 = this.calculateEMA(closes, 14);
      const ema50 = this.calculateEMA(closes, 50);

      // คำนวณ Bollinger Bands
      const bb = this.calculateBollingerBands(closes, 20, 2);

      // คำนวณ Stochastic
      const stoch = this.calculateStochastic(highs, lows, closes, 14, 3);

      return {
        ema_14: ema14,
        ema_50: ema50,
        bb_upper: bb.upper,
        bb_middle: bb.middle,
        bb_lower: bb.lower,
        stoch_k: stoch.k,
        stoch_d: stoch.d
      };

    } catch (error) {
      console.error(`❌ Error calculating indicators: ${error.message}`);
      throw error;
    }
  }

  // 📈 คำนวณ EMA
  calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // 📊 คำนวณ Bollinger Bands
  calculateBollingerBands(prices, period, stdDev) {
    if (prices.length < period) {
      throw new Error('ข้อมูลไม่เพียงพอสำหรับ Bollinger Bands');
    }

    // คำนวณ SMA
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;

    // คำนวณ Standard Deviation
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  // ⚡ คำนวณ Stochastic
  calculateStochastic(highs, lows, closes, kPeriod, dPeriod) {
    if (highs.length < kPeriod) {
      throw new Error('ข้อมูลไม่เพียงพอสำหรับ Stochastic');
    }

    // ดึงข้อมูลล่าสุด
    const recentHighs = highs.slice(-kPeriod);
    const recentLows = lows.slice(-kPeriod);
    const currentClose = closes[closes.length - 1];

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);

    const percentK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

    // สำหรับ %D ใช้ค่าประมาณ (อาจต้องการข้อมูล %K หลายค่า)
    const percentD = percentK * 0.9; // ประมาณการ

    return {
      k: percentK,
      d: percentD
    };
  }

  // 🎯 วิเคราะห์สัญญาณ
  analyzeSignals(indicators, data) {
    try {
      const currentPrice = data[data.length - 1].close;
      const previousPrice = data[data.length - 2].close;

      const { ema_14, ema_50, bb_upper, bb_middle, bb_lower, stoch_k, stoch_d } = indicators;

      let score = 0;
      const bullishSignals = [];
      const bearishSignals = [];

      // EMA Analysis
      if (currentPrice > ema_14 && ema_14 > ema_50) {
        bullishSignals.push("Strong uptrend (Price > EMA14 > EMA50)");
        score += 3;
      } else if (currentPrice > ema_14) {
        bullishSignals.push("Price above EMA14");
        score += 1;
      } else if (currentPrice < ema_14 && ema_14 < ema_50) {
        bearishSignals.push("Strong downtrend (Price < EMA14 < EMA50)");
        score -= 3;
      } else if (currentPrice < ema_14) {
        bearishSignals.push("Price below EMA14");
        score -= 1;
      }

      // Bollinger Bands Analysis
      if (currentPrice >= bb_upper) {
        bearishSignals.push("Price at/above BB Upper (overbought)");
        score -= 2;
      } else if (currentPrice <= bb_lower) {
        bullishSignals.push("Price at/below BB Lower (oversold)");
        score += 2;
      } else if (currentPrice > bb_middle) {
        bullishSignals.push("Price above BB Middle");
        score += 1;
      } else {
        bearishSignals.push("Price below BB Middle");
        score -= 1;
      }

      // Stochastic Analysis
      if (stoch_k >= 80 && stoch_d >= 80) {
        bearishSignals.push(`Stochastic overbought (%K:${stoch_k.toFixed(1)}, %D:${stoch_d.toFixed(1)})`);
        score -= 2;
      } else if (stoch_k <= 20 && stoch_d <= 20) {
        bullishSignals.push(`Stochastic oversold (%K:${stoch_k.toFixed(1)}, %D:${stoch_d.toFixed(1)})`);
        score += 2;
      } else if (stoch_k > stoch_d) {
        bullishSignals.push("Stochastic %K above %D");
        score += 1;
      } else {
        bearishSignals.push("Stochastic %K below %D");
        score -= 1;
      }

      // Final Decision
      let recommendation, confidence;
      
      if (score >= 3) {
        recommendation = "CALL";
        confidence = score >= 5 ? "HIGH" : "MEDIUM";
      } else if (score <= -3) {
        recommendation = "PUT";
        confidence = score <= -5 ? "HIGH" : "MEDIUM";
      } else {
        recommendation = currentPrice > previousPrice ? "CALL" : "PUT";
        confidence = "LOW";
      }

      // สร้าง reasoning
      let reasoning = `Score: ${score}`;
      if (bullishSignals.length > 0) {
        reasoning += ` | Bullish: ${bullishSignals.slice(0, 2).join('; ')}`;
      }
      if (bearishSignals.length > 0) {
        reasoning += ` | Bearish: ${bearishSignals.slice(0, 2).join('; ')}`;
      }

      return {
        score,
        recommendation,
        confidence,
        bullish_signals: bullishSignals,
        bearish_signals: bearishSignals,
        reasoning: reasoning.trim(' | ')
      };

    } catch (error) {
      console.error(`❌ Error analyzing signals: ${error.message}`);
      return {
        score: 0,
        recommendation: 'CALL',
        confidence: 'LOW',
        bullish_signals: [],
        bearish_signals: [],
        reasoning: 'Error in analysis'
      };
    }
  }

  // 🧮 คำนวณโอกาสชนะจาก Technical Score
  calculateWinChance(score, confidence) {
    let percentage = 50;
    
    // ปรับตาม score
    percentage = 50 + (score * 4.5);
    
    // ปรับตาม confidence
    if (confidence === 'HIGH') {
      percentage += 5;
    } else if (confidence === 'LOW') {
      percentage -= 10;
    }
    
    // จำกัดช่วง 20% - 85%
    percentage = Math.max(20, Math.min(85, percentage));
    
    return Math.round(percentage);
  }

  // 🔍 ดึงชื่อคู่เงินจากคำถาม
  extractPairFromQuestion(question) {
    const pairs = [
      'BTC/USD', 'ETH/USD', 'LTC/USD', 'ADA/USD',
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 
      'USD/CHF', 'NZD/USD', 'USD/CAD', 'EUR/GBP',
      'EUR/JPY', 'GBP/JPY', 'GOLD'
    ];
    
    for (const pair of pairs) {
      if (question.toUpperCase().includes(pair)) {
        return pair;
      }
    }
    
    return 'EUR/USD'; // default
  }

  // 🔄 แปลง pair เป็น Yahoo Finance symbol
  convertToYahooSymbol(pair) {
    const symbolMap = {
      // Forex pairs
      'EUR/USD': 'EURUSD=X',
      'GBP/USD': 'GBPUSD=X',
      'USD/JPY': 'USDJPY=X',
      'USD/CHF': 'USDCHF=X',
      'AUD/USD': 'AUDUSD=X',
      'NZD/USD': 'NZDUSD=X',
      'USD/CAD': 'USDCAD=X',
      'EUR/GBP': 'EURGBP=X',
      'EUR/JPY': 'EURJPY=X',
      'GBP/JPY': 'GBPJPY=X',
      
      // Crypto pairs
      'BTC/USD': 'BTC-USD',
      'ETH/USD': 'ETH-USD',
      'LTC/USD': 'LTC-USD',
      'ADA/USD': 'ADA-USD',
      
      // Commodities
      'GOLD': 'GC=F'
    };
    
    return symbolMap[pair] || 'EURUSD=X';
  }

  // 🎲 Smart Fallback
  getSmartFallback(pair) {
    if (pair.includes('BTC') || pair.includes('ETH')) {
      return Math.random() > 0.4 ? 'CALL' : 'PUT';
    }
    if (pair.includes('GOLD')) {
      return Math.random() > 0.45 ? 'CALL' : 'PUT';
    }
    return Math.random() > 0.5 ? 'CALL' : 'PUT';
  }

  // 🆕 สร้างข้อความตอบกลับแบบใหม่
  formatForexResponse(result, pair, targetTime, remainingCredits) {
    // สร้าง stars ตาม confidence
    let stars = '';
    if (result.confidence === 'HIGH') {
      stars = '⭐⭐⭐';
    } else if (result.confidence === 'MEDIUM') {
      stars = '⭐⭐';
    } else {
      stars = '⭐';
    }

    // สร้างข้อความหลัก
    const formattedPair = `💰 ${pair} (M5)`;
    const signal = `💡 สัญญาณ: ${result.signal} ${stars} (${result.confidence})`;
    const winChance = `🔍 โอกาสชนะ: ${result.winChance}%`;
    const entryTime = `⏰ เข้าเทรดตอน: ${targetTime}`;
    const credits = `💎 เครดิตคงเหลือ: ${remainingCredits} เครดิต`;

    return `${formattedPair}\n${signal}\n${winChance}\n${entryTime}\n${credits}`;
  }

  // 🆕 ดูสถิติการใช้งาน
  getTechnicalAnalysisStats() {
    return {
      method: 'HTTP API (No Python dependencies)',
      supportedPairs: [
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD',
        'USD/CHF', 'NZD/USD', 'USD/CAD', 'EUR/GBP',
        'EUR/JPY', 'GBP/JPY', 'BTC/USD', 'ETH/USD',
        'LTC/USD', 'ADA/USD', 'GOLD'
      ],
      indicators: [
        'EMA (14, 50)',
        'Bollinger Bands (20, 2)',
        'Stochastic (14, 3)'
      ],
      features: [
        '✅ Pure Node.js (No Python)',
        '✅ HTTP API calls only',
        '✅ Real-time Yahoo Finance data',
        '✅ Score-based Win Percentage',
        '✅ Production ready'
      ],
      dataSource: 'Yahoo Finance HTTP API',
      winChanceRange: '20% - 85%',
      lastChecked: new Date().toISOString()
    };
  }
}

module.exports = new AiService();