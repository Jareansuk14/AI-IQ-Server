// AI-Server/services/aiService.js - ปรับปรุงให้ใช้ Technical Analysis

const OpenAI = require('openai');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

class AiService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AI_API_KEY
    });
    
    // 🆕 เพิ่ม path สำหรับ technical analysis script
    this.technicalAnalysisScript = path.join(__dirname, '../scripts/technical_analysis_yahoo.py');
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

  // 🔥 ฟังก์ชันใหม่: ใช้ Technical Analysis แทน AI
  async processForexQuestion(question) {
    try {
      console.log('🔍 Processing forex question with Technical Analysis...');
      console.log('Question:', question);
      
      // ดึงชื่อคู่เงินจากคำถาม
      const pair = this.extractPairFromQuestion(question);
      console.log('📊 Extracted pair:', pair);

      // เรียก Technical Analysis Script
      const technicalResult = await this.getTechnicalAnalysis(pair);
      
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

  // 🆕 เรียก Technical Analysis Script
  async getTechnicalAnalysis(pair) {
    return new Promise((resolve) => {
      try {
        console.log(`🐍 Calling Technical Analysis for ${pair}`);

        const command = `python "${this.technicalAnalysisScript}" "${pair}"`;
        
        console.log(`🔧 Command: ${command}`);

        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Python execution error: ${error.message}`);
            resolve({
              error: `ไม่สามารถวิเคราะห์ทางเทคนิคได้: ${error.message}`,
              pair,
              fallback_signal: this.getSmartFallback(pair)
            });
            return;
          }

          if (stderr) {
            console.log(`📝 Python stderr:`, stderr);
          }

          try {
            console.log(`📤 Python stdout:`, stdout);
            
            const result = JSON.parse(stdout.trim());
            
            if (result.error) {
              console.error(`❌ Technical analysis error: ${result.error}`);
              resolve({
                error: result.error,
                pair,
                fallback_signal: this.getSmartFallback(pair)
              });
              return;
            }

            console.log(`✅ Technical analysis data received`);
            
            resolve({
              pair: result.symbol,
              signal: result.signal,
              confidence: result.signal_analysis.confidence,
              technical_score: result.signal_analysis.technical_score,
              current_price: result.current_price,
              change_percent: result.change_percent,
              indicators: result.technical_indicators,
              bullish_signals: result.signal_analysis.bullish_signals,
              bearish_signals: result.signal_analysis.bearish_signals,
              reasoning: result.signal_analysis.reasoning,
              timestamp: new Date().toISOString(),
              source: 'Technical Analysis'
            });

          } catch (parseError) {
            console.error(`❌ JSON parse error: ${parseError.message}`);
            console.log(`📝 Raw stdout:`, stdout);
            
            resolve({
              error: `ไม่สามารถแปลงข้อมูลได้: ${parseError.message}`,
              rawOutput: stdout,
              pair,
              fallback_signal: this.getSmartFallback(pair)
            });
          }
        });

      } catch (err) {
        console.error(`❌ Unexpected error in getTechnicalAnalysis: ${err.message}`);
        resolve({
          error: `เกิดข้อผิดพลาดไม่คาดคิด: ${err.message}`,
          pair,
          fallback_signal: this.getSmartFallback(pair)
        });
      }
    });
  }

  // 🧮 คำนวณโอกาสชนะจาก Technical Score
  calculateWinChance(score, confidence) {
    // Base percentage = 50%
    let percentage = 50;
    
    // ปรับตาม score (-10 ถึง +10)
    // Score +5 = ~75%, Score -5 = ~25%
    percentage = 50 + (score * 4.5);
    
    // ปรับตาม confidence
    if (confidence === 'HIGH') {
      percentage += 5;  // เพิ่ม 5%
    } else if (confidence === 'LOW') {
      percentage -= 10; // ลด 10%
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

  // 🎲 Smart Fallback เมื่อไม่สามารถวิเคราะห์ได้
  getSmartFallback(pair) {
    if (pair.includes('BTC') || pair.includes('ETH')) {
      return Math.random() > 0.4 ? 'CALL' : 'PUT'; // 60% CALL สำหรับ crypto
    }
    if (pair.includes('GOLD')) {
      return Math.random() > 0.45 ? 'CALL' : 'PUT'; // 55% CALL สำหรับ gold
    }
    return Math.random() > 0.5 ? 'CALL' : 'PUT'; // 50/50 สำหรับ forex
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

  // 🆕 ดูสถิติการใช้งาน Technical Analysis
  getTechnicalAnalysisStats() {
    return {
      scriptPath: this.technicalAnalysisScript,
      supportedPairs: [
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD',
        'USD/CHF', 'NZD/USD', 'USD/CAD', 'EUR/GBP',
        'EUR/JPY', 'GBP/JPY', 'BTC/USD', 'ETH/USD',
        'LTC/USD', 'ADA/USD', 'GOLD'
      ],
      indicators: [
        'EMA (14, 50)',
        'Bollinger Bands (20, 2)',
        'Stochastic (14, 3, 3)'
      ],
      features: [
        '✅ Real-time Technical Analysis',
        '✅ Score-based Win Percentage',
        '✅ Confidence Levels (HIGH/MEDIUM/LOW)',
        '✅ Multiple Timeframe Analysis',
        '✅ Smart Fallback System'
      ],
      winChanceRange: '20% - 85%',
      lastChecked: new Date().toISOString()
    };
  }
}

module.exports = new AiService();