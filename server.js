//AI-Server/server.js - โค้ดทั้งหมด

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 
const { connectDB, checkConnection } = require('./config/db');
const paymentChecker = require('./services/paymentChecker');
require('dotenv').config();

const app = express();

// ต้องจัดการ raw body ก่อนใช้ middleware อื่นๆ และเพิ่มขีดจำกัดขนาด
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
  limit: '50mb' // เพิ่มขีดจำกัดขนาด
}));

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// เพิ่มการตั้งค่า CORS ที่เฉพาะเจาะจงมากขึ้น
app.use(cors({
  origin: ['http://localhost:3001', 'https://your-frontend-url.com', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Line-Signature'],
  credentials: true
}));

// Serve static images for CALL/PUT signals (เพิ่มสำหรับ AI-Auto)
app.use('/images', express.static(path.join(__dirname, 'assets')));

// เส้นทาง
app.use('/webhook', require('./routes/webhook'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payment', require('./routes/payment'));
app.use('/payment', require('./routes/payment')); // เพิ่ม route เก่าเพื่อ backward compatibility

// เส้นทางสำหรับทดสอบว่าเซิร์ฟเวอร์ทำงานหรือไม่
app.get('/', (req, res) => {
  res.send('LINE Bot server is running!');
});

// เพิ่มเส้นทางสำหรับตรวจสอบสถานะระบบ
app.get('/api/status', (req, res) => {
  const dbConnected = checkConnection();
  res.json({
    server: 'running',
    database: dbConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// เพิ่ม API สำหรับตรวจสอบการชำระเงินแบบ manual (สำหรับ testing)
app.get('/api/payment/check', async (req, res) => {
  try {
    console.log('🔧 Manual payment check requested');
    await paymentChecker.manualCheck();
    res.json({ message: 'Payment check completed', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Manual payment check error:', error);
    res.status(500).json({ error: 'Payment check failed', details: error.message });
  }
});

// เพิ่ม API สำหรับดูสถิติการตรวจสอบ
app.get('/api/payment/stats', async (req, res) => {
  try {
    const stats = await paymentChecker.getCheckStats();
    res.json(stats);
  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({ error: 'Failed to get payment stats' });
  }
});

// เพิ่ม API สำหรับดูรายการ pending payments
app.get('/api/payment/pending', async (req, res) => {
  try {
    const PaymentTransaction = require('./models/paymentTransaction');
    const pendingPayments = await PaymentTransaction.find({ status: 'pending' })
      .populate('user', 'lineUserId displayName')
      .sort({ createdAt: -1 });
    
    const formattedPayments = pendingPayments.map(p => ({
      id: p._id,
      lineUserId: p.lineUserId,
      amount: p.totalAmount,
      credits: p.credits,
      packageType: p.packageType,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      isExpired: p.isExpired(),
      timeLeft: Math.max(0, Math.floor((p.expiresAt - new Date()) / 60000)) // minutes left
    }));
    
    res.json({
      count: pendingPayments.length,
      payments: formattedPayments
    });
  } catch (error) {
    console.error('Error getting pending payments:', error);
    res.status(500).json({ error: 'Failed to get pending payments' });
  }
});

// เพิ่ม API สำหรับดูอีเมลล่าสุด
app.get('/api/emails/recent', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    const recentEmails = await db.collection('emails')
      .find({})
      .sort({ receivedAt: -1 })
      .limit(10)
      .toArray();
    
    await client.close();
    
    const formattedEmails = recentEmails.map(email => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      receivedAt: email.receivedAt,
      processedBody: email.processedBody,
      transactionData: email.transactionData,
      paymentProcessed: email.paymentProcessed || false,
      paymentMatched: email.paymentMatched || false
    }));
    
    res.json({
      count: recentEmails.length,
      emails: formattedEmails
    });
  } catch (error) {
    console.error('Error getting recent emails:', error);
    res.status(500).json({ error: 'Failed to get recent emails' });
  }
});

// === เพิ่ม API endpoints สำหรับ AI-Auto ===

// API endpoint สำหรับทดสอบ AI-Auto
app.get('/api/test/forex', async (req, res) => {
  try {
    const { pair } = req.query;
    if (!pair) {
      return res.status(400).json({ error: 'Please provide pair parameter' });
    }
    
    const aiService = require('./services/aiService');
    const question = `ในคู่เงิน ${pair} ตอนนี้ควร CALL หรือ PUT ไปเช็คกราฟจากเว็บต่างๆให้หน่อย ตอบมาสั้นๆแค่ CALL หรือ PUT`;
    const result = await aiService.processForexQuestion(question);
    
    const { calculateNextTimeSlot } = require('./utils/flexMessages');
    const targetTime = calculateNextTimeSlot();
    
    res.json({
      pair: `${pair} (M5)`,
      prediction: result,
      targetTime,
      question,
      imageUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/images/${result.toLowerCase()}-signal.jpg`
    });
  } catch (error) {
    console.error('Test forex API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint สำหรับตรวจสอบรูปภาพ
app.get('/api/images/check', (req, res) => {
  try {
    const assetsPath = path.join(__dirname, 'assets');
    const callImagePath = path.join(assetsPath, 'call-signal.jpg');
    const putImagePath = path.join(assetsPath, 'put-signal.jpg');
    
    const callExists = fs.existsSync(callImagePath);
    const putExists = fs.existsSync(putImagePath);
    
    res.json({
      assetsPath,
      images: {
        call: {
          path: callImagePath,
          exists: callExists,
          url: callExists ? `${process.env.BASE_URL || 'http://localhost:3000'}/images/call-signal.jpg` : null
        },
        put: {
          path: putImagePath,
          exists: putExists,
          url: putExists ? `${process.env.BASE_URL || 'http://localhost:3000'}/images/put-signal.jpg` : null
        }
      },
      ready: callExists && putExists
    });
  } catch (error) {
    console.error('Image check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint สำหรับสร้างโฟลเดอร์ assets (หากยังไม่มี)
app.get('/api/setup/assets', (req, res) => {
  try {
    const assetsPath = path.join(__dirname, 'assets');
    
    // สร้างโฟลเดอร์ assets หากไม่มี
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
      console.log('Created assets directory');
    }
    
    res.json({
      message: 'Assets directory ready',
      path: assetsPath,
      note: 'Please upload call-signal.jpg and put-signal.jpg to this directory'
    });
  } catch (error) {
    console.error('Setup assets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับดูรายการคู่เงินที่รองรับ
app.get('/api/forex/pairs', (req, res) => {
  try {
    const forexPairs = [
      // Major Pairs
      { pair: 'EUR/USD', category: 'Major', flag: '🇪🇺🇺🇸' },
      { pair: 'GBP/USD', category: 'Major', flag: '🇬🇧🇺🇸' },
      { pair: 'USD/JPY', category: 'Major', flag: '🇺🇸🇯🇵' },
      { pair: 'USD/CHF', category: 'Major', flag: '🇺🇸🇨🇭' },
      
      // Cross Pairs
      { pair: 'AUD/USD', category: 'Cross', flag: '🇦🇺🇺🇸' },
      { pair: 'NZD/USD', category: 'Cross', flag: '🇳🇿🇺🇸' },
      { pair: 'USD/CAD', category: 'Cross', flag: '🇺🇸🇨🇦' },
      { pair: 'EUR/GBP', category: 'Cross', flag: '🇪🇺🇬🇧' },
      
      // Special Assets
      { pair: 'EUR/JPY', category: 'Special', flag: '🇪🇺🇯🇵' },
      { pair: 'GBP/JPY', category: 'Special', flag: '🇬🇧🇯🇵' },
      { pair: 'BTC/USD', category: 'Crypto', flag: '₿' },
      { pair: 'GOLD', category: 'Commodity', flag: '🥇' }
    ];
    
    res.json({
      totalPairs: forexPairs.length,
      pairs: forexPairs,
      categories: {
        Major: forexPairs.filter(p => p.category === 'Major').length,
        Cross: forexPairs.filter(p => p.category === 'Cross').length,
        Special: forexPairs.filter(p => p.category === 'Special').length,
        Crypto: forexPairs.filter(p => p.category === 'Crypto').length,
        Commodity: forexPairs.filter(p => p.category === 'Commodity').length
      }
    });
  } catch (error) {
    console.error('Error getting forex pairs:', error);
    res.status(500).json({ error: error.message });
  }
});

// === API endpoints สำหรับ Result Tracking System ===

// API สำหรับดูสถิติการติดตามผลทั้งหมด
app.get('/api/tracking/stats', (req, res) => {
  try {
    const resultTrackingService = require('./services/resultTrackingService');
    const stats = resultTrackingService.getTrackingStats();
    
    res.json({
      message: 'Tracking statistics',
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Error getting tracking stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับ force stop การติดตาม (admin)
app.post('/api/tracking/force-stop/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const resultTrackingService = require('./services/resultTrackingService');
    
    resultTrackingService.forceStopTracking(userId);
    
    res.json({
      message: `Force stopped tracking for user ${userId}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error force stopping tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับทดสอบการเชื่อมต่อ IQ Option
app.get('/api/iq-option/test', async (req, res) => {
  try {
    const iqOptionService = require('./services/iqOptionService');
    const testResult = await iqOptionService.testConnection();
    
    res.json({
      message: 'IQ Option connection test',
      timestamp: new Date().toISOString(),
      ...testResult
    });
  } catch (error) {
    console.error('Error testing IQ Option connection:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับดึงข้อมูลแท่งเทียนแบบ manual
app.get('/api/iq-option/candle', async (req, res) => {
  try {
    const { pair, time, round } = req.query;
    
    if (!pair || !time || !round) {
      return res.status(400).json({ 
        error: 'Missing required parameters: pair, time, round' 
      });
    }
    
    const iqOptionService = require('./services/iqOptionService');
    const result = await iqOptionService.getCandleColor(pair, time, parseInt(round));
    
    res.json({
      message: 'Candle data retrieved',
      timestamp: new Date().toISOString(),
      request: { pair, time, round: parseInt(round) },
      ...result
    });
  } catch (error) {
    console.error('Error getting candle data:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับดูสถิติ IQ Option service
app.get('/api/iq-option/stats', (req, res) => {
  try {
    const iqOptionService = require('./services/iqOptionService');
    const stats = iqOptionService.getUsageStats();
    
    res.json({
      message: 'IQ Option service statistics',
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Error getting IQ Option stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับดึงข้อมูลแท่งเทียนหลายรอบ (สำหรับ testing)
app.get('/api/iq-option/multiple-candles', async (req, res) => {
  try {
    const { pair, time, rounds } = req.query;
    
    if (!pair || !time || !rounds) {
      return res.status(400).json({ 
        error: 'Missing required parameters: pair, time, rounds' 
      });
    }
    
    const iqOptionService = require('./services/iqOptionService');
    const results = await iqOptionService.getMultipleCandles(pair, time, parseInt(rounds));
    
    res.json({
      message: 'Multiple candle data retrieved',
      timestamp: new Date().toISOString(),
      request: { pair, time, rounds: parseInt(rounds) },
      results
    });
  } catch (error) {
    console.error('Error getting multiple candle data:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับ admin ดูรายละเอียด session การติดตาม
app.get('/api/admin/tracking/sessions', (req, res) => {
  try {
    // ต้องมี middleware ตรวจสอบสิทธิ์ admin ที่นี่
    const resultTrackingService = require('./services/resultTrackingService');
    const stats = resultTrackingService.getTrackingStats();
    
    res.json({
      message: 'Active tracking sessions',
      timestamp: new Date().toISOString(),
      totalSessions: stats.activeSessions,
      totalBlockedUsers: stats.blockedUsers,
      sessions: stats.sessions.map(session => ({
        ...session,
        duration: new Date() - session.startedAt,
        durationMinutes: Math.round((new Date() - session.startedAt) / 60000)
      }))
    });
  } catch (error) {
    console.error('Error getting tracking sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// === API endpoints สำหรับระบบ Referral ใหม่ ===

// API สำหรับติดตามการคลิกลิงก์แชร์
app.get('/invite', async (req, res) => {
  try {
    const { ref } = req.query;
    
    if (!ref) {
      return res.status(400).json({ error: 'Missing referral code' });
    }
    
    // ติดตาม click
    const creditService = require('./services/creditService');
    const clickInfo = await creditService.trackReferralClick(ref, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    });
    
    if (!clickInfo) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }
    
    // Redirect ไปยัง LINE Bot
    const botLineId = '@033mebpp'; // เปลี่ยนเป็น LINE Bot ID ของคุณ
    const lineUrl = `https://line.me/R/ti/p/${botLineId}?from=web&ref=${ref}`;
    
    // ส่งหน้า HTML ที่มี auto-redirect และข้อมูลการ์ดเชิญ
    const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎁 เชิญใช้ AI Bot ฟรี!</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .card {
                background: white;
                border-radius: 20px;
                padding: 30px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            .icon { font-size: 60px; margin-bottom: 20px; }
            h1 { color: #333; margin: 0 0 10px 0; }
            p { color: #666; line-height: 1.6; }
            .btn {
                background: #177ddc;
                color: white;
                padding: 15px 30px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                margin: 20px 0;
                transition: all 0.3s;
            }
            .btn:hover { background: #1565c0; transform: translateY(-2px); }
            .code { 
                background: #f5f5f5; 
                padding: 10px; 
                border-radius: 5px; 
                font-family: monospace; 
                font-size: 18px;
                font-weight: bold;
                color: #177ddc;
                margin: 15px 0;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">🤖</div>
            <h1>เชิญใช้ AI Bot ฟรี!</h1>
            <p><strong>${clickInfo.referrer.displayName || 'เพื่อน'}</strong> เชิญคุณใช้ AI วิเคราะห์รูปภาพ</p>
            
            <div class="code">รหัส: ${ref}</div>
            
            <p>🎁 รับ <strong>5 เครดิตฟรี</strong> เมื่อเพิ่มเพื่อน</p>
            
            <a href="${lineUrl}" class="btn">
                🚀 เพิ่มเพื่อน & รับเครดิต
            </a>
            
            <p style="font-size: 12px; color: #999;">
                กำลังเปลี่ยนเส้นทางอัตโนมัติ...
            </p>
        </div>
        
        <script>
            // Auto redirect หลัง 3 วินาที
            setTimeout(() => {
                window.location.href = '${lineUrl}';
            }, 3000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error handling invite link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API สำหรับสร้าง QR Code แชร์
app.get('/api/referral/qr/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;
    
    const creditService = require('./services/creditService');
    
    // ตรวจสอบความถูกต้องของรหัส
    const validation = await creditService.validateReferralCode(referralCode);
    if (!validation.valid) {
      return res.status(404).json({ error: validation.reason });
    }
    
    // สร้าง QR Code
    const qrResult = await creditService.generateReferralQR(referralCode);
    
    // ส่งกลับเป็น image
    const base64Data = qrResult.qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="referral-${referralCode}.png"`);
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error generating referral QR:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// API สำหรับดูสถิติการแชร์
app.get('/api/referral/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const creditService = require('./services/creditService');
    const stats = await creditService.getReferralStats(userId);
    
    res.json({
      message: 'Referral statistics',
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับตรวจสอบรหัสแนะนำ
app.get('/api/referral/validate/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;
    
    const creditService = require('./services/creditService');
    const validation = await creditService.validateReferralCode(referralCode);
    
    res.json({
      referralCode,
      ...validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// API สำหรับ admin ดูรายงานการแชร์
app.get('/api/admin/referral/report', async (req, res) => {
  try {
    // ต้องมี middleware ตรวจสอบสิทธิ์ admin
    const User = require('./models/user');
    const CreditTransaction = require('./models/creditTransaction');
    
    // สถิติรวม
    const totalUsers = await User.countDocuments();
    const usersWithReferrals = await User.countDocuments({ referredBy: { $exists: true, $ne: null } });
    const totalReferralCredits = await CreditTransaction.aggregate([
      { $match: { type: { $in: ['referral', 'referred'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Top referrers
    const topReferrers = await CreditTransaction.aggregate([
      { $match: { type: 'referral' } },
      { $group: { _id: '$user', totalEarned: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          displayName: '$user.displayName',
          lineUserId: '$user.lineUserId',
          referralCode: '$user.referralCode',
          totalEarned: 1,
          referralCount: '$count'
        }
      }
    ]);
    
    res.json({
      summary: {
        totalUsers,
        usersWithReferrals,
        referralRate: ((usersWithReferrals / totalUsers) * 100).toFixed(2) + '%',
        totalReferralCredits: totalReferralCredits[0]?.total || 0
      },
      topReferrers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting referral report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// API สำหรับทดสอบระบบแชร์
app.get('/api/test/share/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;
    
    const creditService = require('./services/creditService');
    const { createInviteCardMessage } = require('./utils/flexMessages');
    
    // ตรวจสอบรหัส
    const validation = await creditService.validateReferralCode(referralCode);
    if (!validation.valid) {
      return res.status(404).json({ error: validation.reason });
    }
    
    // สร้างการ์ดเชิญ
    const inviteCard = createInviteCardMessage(referralCode, validation.owner.displayName);
    
    // สร้างลิงก์ต่างๆ
    const links = {
      inviteLink: creditService.generateShareLink(referralCode, 'direct'),
      lineLink: creditService.generateShareLink(referralCode, 'line'),
      qrLink: creditService.generateShareLink(referralCode, 'qr')
    };
    
    res.json({
      message: 'Share system test',
      referralCode,
      owner: validation.owner,
      inviteCard,
      links,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing share system:', error);
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับทดสอบทั้งระบบ (comprehensive test)
app.get('/api/test/full-system', async (req, res) => {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // ทดสอบ Forex pairs
    results.tests.forexPairs = {
      totalPairs: 12,
      supportedPairs: [
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
        'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP',
        'EUR/JPY', 'GBP/JPY', 'BTC/USD', 'GOLD'
      ]
    };
    
    // ทดสอบ AI Service
    try {
      const aiService = require('./services/aiService');
      const testResponse = await aiService.processForexQuestion('Test question for EUR/USD CALL or PUT');
      results.tests.aiService = {
        status: 'working',
        response: testResponse
      };
    } catch (error) {
      results.tests.aiService = {
        status: 'error',
        error: error.message
      };
    }
    
    // ทดสอบ IQ Option
    try {
      const iqOptionService = require('./services/iqOptionService');
      const iqTest = await iqOptionService.testConnection();
      results.tests.iqOption = iqTest;
    } catch (error) {
      results.tests.iqOption = {
        status: 'error',
        error: error.message
      };
    }
    
    // ทดสอบ Result Tracking
    const resultTrackingService = require('./services/resultTrackingService');
    const trackingStats = resultTrackingService.getTrackingStats();
    results.tests.resultTracking = {
      status: 'working',
      activeSessions: trackingStats.activeSessions,
      blockedUsers: trackingStats.blockedUsers
    };
    
    // ทดสอบ Images
    const callImageExists = fs.existsSync(path.join(__dirname, 'assets', 'call-signal.jpg'));
    const putImageExists = fs.existsSync(path.join(__dirname, 'assets', 'put-signal.jpg'));
    
    results.tests.images = {
      callSignal: callImageExists,
      putSignal: putImageExists,
      ready: callImageExists && putImageExists
    };
    
    // ทดสอบ Referral System
    try {
      const creditService = require('./services/creditService');
      const testCode = 'TEST123';
      const validation = await creditService.validateReferralCode(testCode);
      results.tests.referralSystem = {
        status: 'working',
        testValidation: validation.valid ? 'valid code found' : 'test code not found (normal)'
      };
    } catch (error) {
      results.tests.referralSystem = {
        status: 'error',
        error: error.message
      };
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error running full system test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static assets for the admin dashboard
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.resolve(__dirname, 'client', 'build');
  
  // ตรวจสอบว่าโฟลเดอร์ client/build มีอยู่จริงหรือไม่
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    
    app.get('*', (req, res) => {
      // ยกเว้นเส้นทางสำหรับ API และ webhook
      if (req.path.startsWith('/api/') || req.path.startsWith('/webhook') || req.path.startsWith('/payment') || req.path.startsWith('/images') || req.path.startsWith('/invite')) {
        return next();
      }
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.log('Client build folder not found. Skipping static file serving.');
    
    // เพิ่ม route สำหรับ root path เพื่อไม่ให้เกิด 404
    app.get('/', (req, res) => {
      res.json({ message: 'LINE Bot API is running!' });
    });
  }
} else {
  // เพิ่ม route สำหรับ root path ในโหมด development
  app.get('/', (req, res) => {
    res.json({ message: 'LINE Bot API is running in development mode!' });
  });
}

// ตั้งค่า error handler สำหรับการจัดการข้อผิดพลาดทั้งหมด
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 3000;

// เชื่อมต่อฐานข้อมูลก่อนเริ่มเซิร์ฟเวอร์ แต่ไม่รอจนกว่าจะเชื่อมต่อสำเร็จ
connectDB()
  .then(() => {
    console.log('Database connection attempt completed');
    
    // เพิ่มคำสั่งนี้เพื่อสร้าง Rich Menu (ใช้เฉพาะครั้งแรกหรือเมื่อต้องการอัปเดต Rich Menu)
    // ถ้าต้องการให้ทำงานเฉพาะเมื่อเริ่ม server ในครั้งแรก ให้ใส่เงื่อนไขตรวจสอบ
    if (process.env.CREATE_RICH_MENU === 'true') {
      require('./utils/createRichMenu');
    }
    
    // เริ่มระบบตรวจสอบการชำระเงินอัตโนมัติ
    setTimeout(() => {
      paymentChecker.startAutoCheck(2); // ตรวจสอบทุก 2 นาที
      console.log('Payment checker started');
    }, 5000); // รอ 5 วินาทีให้ระบบพร้อม
  })
  .catch(err => {
    console.error('Database connection attempt failed:', err);
  })
  .finally(() => {
    // เริ่มเซิร์ฟเวอร์ไม่ว่าผลลัพธ์ของการเชื่อมต่อฐานข้อมูลจะเป็นอย่างไร
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`AI-Auto images served from: ${path.join(__dirname, 'assets')}`);
      console.log(`Image URLs: ${process.env.BASE_URL || `http://localhost:${PORT}`}/images/`);
      console.log(`Result Tracking System: READY`);
      console.log(`IQ Option Integration: READY`);
      console.log(`Referral System: READY`);
      console.log(`Available API endpoints:`);
      console.log(`  - GET /api/test/full-system`);
      console.log(`  - GET /api/tracking/stats`);
      console.log(`  - GET /api/iq-option/test`);
      console.log(`  - GET /invite?ref=CODE (Referral landing page)`);
      console.log(`  - GET /api/referral/stats/:userId`);
      console.log(`  - GET /api/admin/referral/report`);
    });
  });

// จัดการการปิดโปรแกรมอย่างสะอาด
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  // หยุดระบบ payment checker
  await paymentChecker.stop();
  
  // หยุดระบบ result tracking (ถ้าจำเป็น)
  try {
    const resultTrackingService = require('./services/resultTrackingService');
    // Force stop ทุก session ที่ active
    const stats = resultTrackingService.getTrackingStats();
    for (const session of stats.sessions) {
      if (session.isActive) {
        resultTrackingService.forceStopTracking(session.userId);
      }
    }
    console.log('All tracking sessions stopped');
  } catch (error) {
    console.error('Error stopping tracking sessions:', error);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  
  // หยุดระบบ payment checker
  await paymentChecker.stop();
  
  // หยุดระบบ result tracking
  try {
    const resultTrackingService = require('./services/resultTrackingService');
    const stats = resultTrackingService.getTrackingStats();
    for (const session of stats.sessions) {
      if (session.isActive) {
        resultTrackingService.forceStopTracking(session.userId);
      }
    }
    console.log('All tracking sessions stopped');
  } catch (error) {
    console.error('Error stopping tracking sessions:', error);
  }
  
  process.exit(0);
});