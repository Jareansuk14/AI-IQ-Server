// AI-Server/services/lineService.js - อัปเดตพร้อม Rate Limiting
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

class LineService {
  constructor() {
    this.client = new line.Client(config);
    
    // ⚡ เพิ่มระบบจัดการ Rate Limiting
    this.messageQueue = [];
    this.isProcessing = false;
    this.lastMessageTime = 0;
    this.minDelayBetweenMessages = 1000; // 1 วินาที
  }

  // 🔧 ฟังก์ชันสำหรับ delay
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 🛡️ ฟังก์ชันสำหรับจัดการ Rate Limiting
  async sendWithRateLimit(apiCall, retryCount = 0) {
    const maxRetries = 3;
    
    try {
      // คำนวณเวลาที่ต้องรอ
      const now = Date.now();
      const timeSinceLastMessage = now - this.lastMessageTime;
      const delayNeeded = Math.max(0, this.minDelayBetweenMessages - timeSinceLastMessage);
      
      if (delayNeeded > 0) {
        console.log(`⏳ Waiting ${delayNeeded}ms before sending message...`);
        await this.delay(delayNeeded);
      }
      
      // ส่งข้อความ
      this.lastMessageTime = Date.now();
      const result = await apiCall();
      
      console.log('✅ Message sent successfully');
      return result;
      
    } catch (error) {
      console.error('❌ LINE API Error:', error.statusCode, error.statusMessage);
      
      // 🔄 หาก Rate Limited ให้ retry
      if (error.statusCode === 429 && retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 2000; // Exponential backoff
        console.log(`🔄 Rate limited. Retrying in ${retryDelay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
        
        await this.delay(retryDelay);
        return this.sendWithRateLimit(apiCall, retryCount + 1);
      }
      
      throw error;
    }
  }

  // 📤 ฟังก์ชันสำหรับดึงข้อมูลโปรไฟล์ของผู้ใช้
  async getUserProfile(userId) {
    try {
      return await this.client.getProfile(userId);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // 📁 ฟังก์ชันสำหรับดึงเนื้อหาของข้อความ (รูปภาพ)
  async getMessageContent(messageId) {
    return this.client.getMessageContent(messageId);
  }

  // 💬 ฟังก์ชันสำหรับตอบกลับข้อความ (ใช้ replyMessage เสมอเมื่อมี replyToken)
  async replyMessage(replyToken, messages) {
    return this.sendWithRateLimit(async () => {
      return this.client.replyMessage(replyToken, messages);
    });
  }

  // 📨 ฟังก์ชันสำหรับส่งข้อความแจ้งเตือน (push) - มี Rate Limiting
  async pushMessage(userId, messages) {
    return this.sendWithRateLimit(async () => {
      return this.client.pushMessage(userId, messages);
    });
  }

  // 🚀 ฟังก์ชันสำหรับส่งข้อความแบบ queue (สำหรับการส่งหลายข้อความ)
  async queueMessage(userId, messages) {
    this.messageQueue.push({ userId, messages, timestamp: Date.now() });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // ⚙️ ฟังก์ชันประมวลผล queue
  async processQueue() {
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const { userId, messages } = this.messageQueue.shift();
      
      try {
        await this.pushMessage(userId, messages);
        // เพิ่ม delay เพิ่มเติมระหว่างข้อความใน queue
        await this.delay(500);
      } catch (error) {
        console.error('❌ Queue processing error:', error);
        
        // หาก error ไม่ใช่ 429 ให้หยุด queue
        if (error.statusCode !== 429) {
          console.error('🛑 Non-rate-limit error, stopping queue processing');
          break;
        }
      }
    }
    
    this.isProcessing = false;
  }

  // 📊 ฟังก์ชันสำหรับดูสถิติการส่งข้อความ
  getMessageStats() {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      lastMessageTime: this.lastMessageTime,
      timeSinceLastMessage: Date.now() - this.lastMessageTime
    };
  }
}

module.exports = new LineService();