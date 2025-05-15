// services/aiService.js - แก้ไขชื่อโมเดล
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
      
      // ใช้ชื่อโมเดลที่ถูกต้อง (ล่าสุด)
      const modelName = 'claude-3-opus-20240229'; // แนะนำให้ลองใช้โมเดลนี้ก่อน
      
      console.log(`Using Claude model: ${modelName}`);
      
      const message = await this.anthropic.messages.create({
        model: modelName,
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
      
      // ตรวจสอบข้อผิดพลาดเกี่ยวกับโมเดล
      if (error.status === 404 && error.error?.error?.message?.includes('model:')) {
        console.error('Model not found error. Available models may have changed.');
        
        // ลองใช้โมเดลอื่นโดยอัตโนมัติ (fallback)
        try {
          console.log('Attempting with alternate model: claude-3-haiku-20240307');
          
          const fallbackModel = 'claude-3-haiku-20240307';
          const base64Image = imageBuffer.toString('base64');
          
          const message = await this.anthropic.messages.create({
            model: fallbackModel,
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
          
          console.log('Fallback model successful');
          return message.content[0].text;
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError);
          throw new Error('ไม่สามารถใช้โมเดล Claude ที่มีอยู่ได้ กรุณาตรวจสอบโมเดลที่สามารถใช้งานได้');
        }
      }
      
      // จัดการข้อผิดพลาดอื่นๆ
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
}

module.exports = new AiService();