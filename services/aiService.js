// services/aiService.js
const OpenAI = require('openai');
require('dotenv').config();

class AiService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AI_API_KEY
    });
  }

  async processImage(imageBuffer, command) {
    try {
      console.log('Processing image with OpenAI (ChatGPT) API...');
      console.log('Image size:', (imageBuffer.length / 1024 / 1024).toFixed(2), 'MB');
      
      // แปลงรูปภาพเป็น base64
      const base64Image = imageBuffer.toString('base64');
      
      console.log('Sending request to OpenAI API...');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview", // โมเดลที่รองรับการวิเคราะห์รูปภาพ
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: command },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high" // คุณสามารถใช้ "low", "high", หรือ "auto"
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });
      
      console.log('Received response from OpenAI API');
      
      // ดึงข้อความตอบกลับ
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      } else {
        throw new Error('ไม่พบเนื้อหาในการตอบกลับจาก API');
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // จัดการข้อผิดพลาดที่อาจเกิดขึ้น
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