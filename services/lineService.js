//AI-Server/services/lineService.js
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

class LineService {
  constructor() {
    this.client = new line.Client(config);
  }

  // เพิ่มฟังก์ชัน delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ฟังก์ชันสำหรับดึงข้อมูลโปรไฟล์ของผู้ใช้
  async getUserProfile(userId) {
    try {
      return await this.client.getProfile(userId);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // ฟังก์ชันสำหรับดึงเนื้อหาของข้อความ (รูปภาพ)
  async getMessageContent(messageId) {
    return this.client.getMessageContent(messageId);
  }

  // ฟังก์ชันสำหรับตอบกลับข้อความ - เพิ่ม retry logic
  async replyMessage(replyToken, messages) {
    try {
      return await this.client.replyMessage(replyToken, messages);
    } catch (error) {
      console.error('Error replying message:', error);
      
      // ถ้าเป็น rate limit ให้รอแล้วลองใหม่
      if (error.statusCode === 429) {
        console.log('Reply message rate limited, waiting 3 seconds...');
        await this.delay(3000);
        
        try {
          return await this.client.replyMessage(replyToken, messages);
        } catch (retryError) {
          console.error('Retry reply message failed:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  // ฟังก์ชันสำหรับส่งข้อความแจ้งเตือน (push) - เพิ่ม delay และ retry
  async pushMessage(userId, messages) {
    try {
      // เพิ่ม delay 1.5 วินาทีก่อนส่ง
      await this.delay(1500);
      
      return await this.client.pushMessage(userId, messages);
    } catch (error) {
      console.error('Error pushing message:', error);
      
      // ถ้าเป็น rate limit ให้รอนานขึ้นและลองใหม่
      if (error.statusCode === 429) {
        console.log('Push message rate limited, waiting 5 seconds...');
        await this.delay(5000);
        
        try {
          return await this.client.pushMessage(userId, messages);
        } catch (retryError) {
          console.error('Retry push message failed:', retryError);
          
          // ถ้าติด rate limit อีกครั้ง ให้รอนานขึ้นและลองครั้งสุดท้าย
          if (retryError.statusCode === 429) {
            console.log('Still rate limited, waiting 10 seconds for final retry...');
            await this.delay(10000);
            
            try {
              return await this.client.pushMessage(userId, messages);
            } catch (finalError) {
              console.error('Final retry failed:', finalError);
              return null;
            }
          }
          
          return null;
        }
      }
      
      return null;
    }
  }

  // เพิ่มฟังก์ชันสำหรับส่งข้อความแบบ batch (ส่งหลายข้อความพร้อมกันแต่มี delay)
  async pushMultipleMessages(userId, messagesArray, delayBetween = 2000) {
    const results = [];
    
    for (let i = 0; i < messagesArray.length; i++) {
      try {
        if (i > 0) {
          // รอระหว่างการส่งข้อความแต่ละอัน (ยกเว้นข้อความแรก)
          await this.delay(delayBetween);
        }
        
        const result = await this.pushMessage(userId, messagesArray[i]);
        results.push(result);
        
        console.log(`✅ Message ${i + 1}/${messagesArray.length} sent successfully`);
        
      } catch (error) {
        console.error(`❌ Failed to send message ${i + 1}/${messagesArray.length}:`, error);
        results.push(null);
      }
    }
    
    return results;
  }
}

module.exports = new LineService();