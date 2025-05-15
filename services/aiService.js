// services/aiService.js
const axios = require('axios');
require('dotenv').config();

class AiService {
  async processImage(imageBuffer, command) {
    try {
      // แปลงรูปภาพเป็น base64
      const base64Image = imageBuffer.toString('base64');
      
      // ส่งไปยัง Claude API (หรือ AI API อื่นๆ)
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-sonnet-20240229',
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
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.AI_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });
      
      return response.data.content[0].text;
    } catch (error) {
      console.error('AI API error:', error);
      throw new Error('ไม่สามารถวิเคราะห์รูปภาพได้');
    }
  }
}

module.exports = new AiService();