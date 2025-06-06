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
  
  // ฟังก์ชันสำหรับตอบกลับข้อความ
  async replyMessage(replyToken, messages) {
    return this.client.replyMessage(replyToken, messages);
  }
  
  // ฟังก์ชันสำหรับส่งข้อความแจ้งเตือน (push)
  async pushMessage(userId, messages) {
    try {
      return this.client.pushMessage(userId, messages);
    } catch (error) {
      console.error('Error pushing message:', error);
      return null;
    }
  }
}

module.exports = new LineService();