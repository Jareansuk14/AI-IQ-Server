// AI-Server/routes/liff.js - API Routes สำหรับ LIFF Apps

const express = require('express');
const router = express.Router();
const creditService = require('../services/creditService');
const User = require('../models/user');
const path = require('path');
const fs = require('fs');

// Middleware สำหรับ CORS (สำหรับ LIFF Apps)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 📄 Serve LIFF App HTML
router.get('/referral-share', (req, res) => {
  try {
    const liffAppPath = path.join(__dirname, '..', 'public', 'liff-referral-share.html');
    
    // ตรวจสอบว่าไฟล์มีอยู่หรือไม่
    if (fs.existsSync(liffAppPath)) {
      res.sendFile(liffAppPath);
    } else {
      // ส่ง error page หากไม่พบไฟล์
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>LIFF App Not Found</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                    background: #f5f5f5; 
                }
                .error { 
                    text-align: center; 
                    padding: 40px; 
                    background: white; 
                    border-radius: 10px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
                }
                .error h1 { color: #e74c3c; margin-bottom: 10px; }
                .error p { color: #666; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>404 - LIFF App Not Found</h1>
                <p>LIFF Application file not found. Please check the installation.</p>
                <p><small>Path: ${liffAppPath}</small></p>
            </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error serving LIFF app:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>LIFF App Error</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { 
                  font-family: Arial, sans-serif; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh; 
                  margin: 0; 
                  background: #f5f5f5; 
              }
              .error { 
                  text-align: center; 
                  padding: 40px; 
                  background: white; 
                  border-radius: 10px; 
                  box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
              }
              .error h1 { color: #e74c3c; margin-bottom: 10px; }
              .error p { color: #666; }
          </style>
      </head>
      <body>
          <div class="error">
              <h1>500 - Server Error</h1>
              <p>Error loading LIFF Application.</p>
              <p><small>${error.message}</small></p>
          </div>
      </body>
      </html>
    `);
  }
});

// 📊 API: ดึงข้อมูลสถิติการแนะนำสำหรับ LIFF App
router.get('/referral-stats', async (req, res) => {
  try {
    const { referralCode } = req.query;
    
    console.log('LIFF API: Getting referral stats for code:', referralCode);
    
    if (!referralCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing referralCode parameter' 
      });
    }
    
    // ค้นหาผู้ใช้จากรหัสแนะนำ
    const user = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Referral code not found' 
      });
    }
    
    // ดึงสถิติการแนะนำ
    const stats = await creditService.getReferralSummary(user.lineUserId);
    
    console.log('LIFF API: Referral stats retrieved:', stats);
    
    res.json({
      success: true,
      data: {
        referralCode: stats.referralCode,
        totalReferred: stats.totalReferred,
        totalEarned: stats.totalEarned,
        userInfo: {
          displayName: user.displayName,
          credits: user.credits,
          lineUserId: user.lineUserId
        }
      }
    });
  } catch (error) {
    console.error('Error getting referral stats for LIFF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 👤 API: ดึงรหัสแนะนำของผู้ใช้จาก LINE User ID
router.get('/user-referral-code', async (req, res) => {
  try {
    const { userId } = req.query;
    
    console.log('LIFF API: Getting referral code for user:', userId);
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId parameter' 
      });
    }
    
    // ค้นหาผู้ใช้จาก LINE User ID
    const user = await User.findOne({ lineUserId: userId });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    console.log('LIFF API: User referral code found:', user.referralCode);
    
    res.json({
      success: true,
      referralCode: user.referralCode,
      userInfo: {
        displayName: user.displayName,
        credits: user.credits
      }
    });
  } catch (error) {
    console.error('Error getting user referral code for LIFF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📈 API: ดึงสถิติการแนะนำแบบละเอียด
router.get('/referral-detailed-stats', async (req, res) => {
  try {
    const { referralCode } = req.query;
    
    if (!referralCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing referralCode parameter' 
      });
    }
    
    // ค้นหาผู้ใช้จากรหัสแนะนำ
    const user = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Referral code not found' 
      });
    }
    
    // ดึงสถิติแบบละเอียด
    const detailedStats = await creditService.getReferralDetailedStats(user.lineUserId);
    
    res.json({
      success: true,
      data: detailedStats
    });
  } catch (error) {
    console.error('Error getting detailed referral stats for LIFF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🌐 API: สร้างเนื้อหาสำหรับแชร์ตามแพลตฟอร์ม
router.post('/generate-share-content', async (req, res) => {
  try {
    const { referralCode, platform, customMessage } = req.body;
    
    if (!referralCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing referralCode' 
      });
    }
    
    // ตรวจสอบว่ารหัสแนะนำมีอยู่จริง
    const user = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Referral code not found' 
      });
    }
    
    // สร้างเนื้อหาแชร์ตามแพลตฟอร์ม
    const shareContent = generateShareContent(referralCode, platform, customMessage);
    
    res.json({
      success: true,
      shareContent,
      shareUrl: `${req.protocol}://${req.get('host')}/liff/referral-share?referralCode=${referralCode}`,
      botUrl: 'https://line.me/R/ti/p/@033mebpp'
    });
  } catch (error) {
    console.error('Error generating share content:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📱 API: ตรวจสอบสถานะ LIFF App
router.get('/status', (req, res) => {
  try {
    const liffAppPath = path.join(__dirname, '..', 'public', 'liff-referral-share.html');
    const appExists = fs.existsSync(liffAppPath);
    
    res.json({
      success: true,
      status: 'active',
      timestamp: new Date().toISOString(),
      liffApp: {
        exists: appExists,
        path: liffAppPath
      },
      apis: {
        referralStats: '/api/liff/referral-stats',
        userReferralCode: '/api/liff/user-referral-code',
        detailedStats: '/api/liff/referral-detailed-stats',
        generateShareContent: '/api/liff/generate-share-content'
      }
    });
  } catch (error) {
    console.error('Error checking LIFF status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 🧪 API: ทดสอบ LIFF API
router.get('/test', async (req, res) => {
  try {
    // สร้างข้อมูลทดสอบ
    const testData = {
      timestamp: new Date().toISOString(),
      apis: {
        referralStats: {
          endpoint: '/api/liff/referral-stats',
          method: 'GET',
          parameters: ['referralCode'],
          example: '/api/liff/referral-stats?referralCode=ABCDEF'
        },
        userReferralCode: {
          endpoint: '/api/liff/user-referral-code',
          method: 'GET',
          parameters: ['userId'],
          example: '/api/liff/user-referral-code?userId=U1234567890'
        },
        generateShareContent: {
          endpoint: '/api/liff/generate-share-content',
          method: 'POST',
          body: {
            referralCode: 'ABCDEF',
            platform: 'line',
            customMessage: 'Custom message (optional)'
          }
        }
      },
      sampleResponse: {
        referralStats: {
          success: true,
          data: {
            referralCode: 'ABCDEF',
            totalReferred: 5,
            totalEarned: 50,
            userInfo: {
              displayName: 'Test User',
              credits: 100
            }
          }
        }
      }
    };
    
    res.json({
      success: true,
      message: 'LIFF API is working correctly',
      ...testData
    });
  } catch (error) {
    console.error('Error in LIFF test:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Test failed' 
    });
  }
});

// ฟังก์ชันสร้างเนื้อหาแชร์ตามแพลตฟอร์ม
function generateShareContent(referralCode, platform = 'default', customMessage = '') {
  const baseContent = {
    title: '🎁 รับเครดิตฟรี 5 เครดิต!',
    description: `ใช้รหัสแนะนำ: ${referralCode} ใน AI Bot`,
    hashtags: ['AI', 'Forex', 'เครดิตฟรี', 'LineBot']
  };
  
  const defaultText = `🎁 รับเครดิตฟรี 5 เครดิต!

🤖 AI Bot วิเคราะห์รูปภาพ & Forex
รหัสแนะนำ: ${referralCode}

🚀 วิธีรับเครดิต:
1️⃣ เพิ่มเพื่อน: https://line.me/R/ti/p/@033mebpp
2️⃣ พิมพ์: รหัส:${referralCode}
3️⃣ รับเครดิตฟรีทันที!

✨ ฟีเจอร์เด็ด:
📸 วิเคราะห์รูปภาพด้วย AI
📈 ทำนาย Forex CALL/PUT
💰 รับเครดิตจากการแนะนำ
🎯 แม่นยำสูงด้วยเทคโนโลยี AI`;

  // เพิ่มข้อความกำหนดเองถ้ามี
  const finalText = customMessage ? `${customMessage}\n\n${defaultText}` : defaultText;
  
  switch (platform) {
    case 'facebook':
      return {
        ...baseContent,
        text: finalText + '\n\n#AI #Forex #เครดิตฟรี #LineBot #TechInnovation',
        platform: 'Facebook'
      };
      
    case 'twitter':
      return {
        ...baseContent,
        text: `🎁 รับเครดิตฟรี 5 เครดิต! 🤖 AI Bot
รหัส: ${referralCode}
เพิ่มเพื่อน: https://line.me/R/ti/p/@033mebpp
#AI #Forex #Free #LineBot #Tech`,
        platform: 'Twitter'
      };
      
    case 'instagram':
      return {
        ...baseContent,
        text: finalText + '\n\n#AI #Forex #เครดิตฟรี #LineBot #Technology #Innovation #Thailand',
        platform: 'Instagram'
      };
      
    case 'line':
      return {
        ...baseContent,
        text: finalText,
        platform: 'LINE'
      };
      
    case 'whatsapp':
      return {
        ...baseContent,
        text: `🎁 *รับเครดิตฟรี 5 เครดิต!*\n\n🤖 AI Bot วิเคราะห์รูปภาพ & Forex\nรหัสแนะนำ: *${referralCode}*\n\n🚀 วิธีรับเครดิต:\n1️⃣ เพิ่มเพื่อน: https://line.me/R/ti/p/@033mebpp\n2️⃣ พิมพ์: รหัส:${referralCode}\n3️⃣ รับเครดิตฟรีทันที!\n\n✨ ฟีเจอร์เด็ด: AI วิเคราะห์รูปภาพ, ทำนาย Forex CALL/PUT`,
        platform: 'WhatsApp'
      };
      
    case 'telegram':
      return {
        ...baseContent,
        text: `🎁 **รับเครดิตฟรี 5 เครดิต!**\n\n🤖 AI Bot วิเคราะห์รูปภาพ & Forex\nรหัสแนะนำ: \`${referralCode}\`\n\n🚀 วิธีรับเครดิต:\n1️⃣ เพิ่มเพื่อน: https://line.me/R/ti/p/@033mebpp\n2️⃣ พิมพ์: รหัส:${referralCode}\n3️⃣ รับเครดิตฟรีทันที!`,
        platform: 'Telegram'
      };
      
    default:
      return {
        ...baseContent,
        text: finalText,
        platform: 'Universal'
      };
  }
}

module.exports = router;