// services/aiService.js
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

class AiService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.AI_API_KEY,
    });
  }

  async processImage(imageBuffer, command) {
    try {
      console.log('Processing image with Claude SDK...');
      console.log('Image size:', (imageBuffer.length / 1024 / 1024).toFixed(2), 'MB');
      
      // แปลงรูปภาพเป็น base64
      const base64Image = imageBuffer.toString('base64');
      
      console.log('Sending request to Claude API via SDK...');
      
      const message = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229', // หรือใช้รุ่นอื่นที่เหมาะสม
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: command },
              { 
                type: 'image', 
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ]
      });
      
      console.log('Received response from Claude API');
      return message.content[0].text;
    } catch (error) {
      console.error('Claude API error:', error);
      
      // จัดการข้อผิดพลาดอย่างมีประสิทธิภาพ
      if (error.status === 401) {
        console.error('Authentication error: Invalid API key');
        throw new Error('รหัส API ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบการตั้งค่า API key');
      } else if (error.status === 400) {
        console.error('Bad request:', error.message);
        throw new Error(`คำขอไม่ถูกต้อง: ${error.message}`);
      } else if (error.status === 413) {
        console.error('Content too large');
        throw new Error('รูปภาพมีขนาดใหญ่เกินไป กรุณาลดขนาดรูปภาพและลองอีกครั้ง');
      } else {
        throw new Error(`ไม่สามารถวิเคราะห์รูปภาพได้: ${error.message}`);
      }
    }
  }
}

module.exports = new AiService();