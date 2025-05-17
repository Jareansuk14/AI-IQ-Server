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
      console.log('Processing image with OpenAI API...');
      console.log('Image size:', (imageBuffer.length / 1024 / 1024).toFixed(2), 'MB');
      
      // แปลงรูปภาพเป็น base64
      const base64Image = imageBuffer.toString('base64');
      
      console.log('Sending request to OpenAI API...');
      
      // เปลี่ยนโมเดลเป็น gpt-4o ซึ่งเป็นโมเดลปัจจุบันที่รองรับการวิเคราะห์รูปภาพ
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // เปลี่ยนจาก gpt-4-vision-preview เป็น gpt-4o
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: command },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "low" // สามารถใช้ "low" ถ้าต้องการลดการใช้โควต้า
                }
              }
            ]
          }
        ],
        max_tokens: 200
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
      
      // จัดการกรณีโมเดลถูกเลิกใช้งาน
      if (error.message && error.message.includes('deprecated')) {
        console.error('Model deprecated error. Trying with gpt-4 as fallback...');
        
        // ลองใช้โมเดลอื่นเป็นทางเลือกสำรอง
        try {
          const base64Image = imageBuffer.toString('base64');
          
          // ใช้โมเดลทางเลือก
          const fallbackResponse = await this.openai.chat.completions.create({
            model: "gpt-4", // ลองใช้ gpt-4 ทั่วไป (อาจไม่รองรับรูปภาพเต็มรูปแบบ)
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: command },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                      detail: "low"
                    }
                  }
                ]
              }
            ],
            max_tokens: 200
          });
          
          console.log('Fallback model successful');
          return fallbackResponse.choices[0].message.content;
        } catch (fallbackError) {
          console.error('Fallback attempt also failed:', fallbackError);
          throw new Error('ไม่สามารถวิเคราะห์รูปภาพได้: โมเดลปัจจุบันไม่รองรับ กรุณาตรวจสอบเอกสาร OpenAI สำหรับโมเดลล่าสุดที่รองรับการวิเคราะห์รูปภาพ');
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