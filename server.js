//AI-Server/server.js - เพิ่มรองรับ LIFF Share Target Picker
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 
const { connectDB, checkConnection } = require('./config/db');
const paymentChecker = require('./services/paymentChecker'); // เพิ่มบรรทัดนี้
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

// ✅ เสิร์ฟ static files สำหรับ LIFF Apps
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve static images for CALL/PUT signals (เพิ่มสำหรับ AI-Auto)
app.use('/images', express.static(path.join(__dirname, 'assets')));

// ✅ เพิ่ม route สำหรับ LIFF Share App
app.get('/liff-share', (req, res) => {
  const liffHtmlPath = path.join(__dirname, 'public', 'liff-share.html');
  
  if (fs.existsSync(liffHtmlPath)) {
    res.sendFile(liffHtmlPath);
  } else {
    res.status(404).json({
      error: 'LIFF app not found',
      message: 'Please create public/liff-share.html file'
    });
  }
});

// เส้นทาง
app.use('/webhook', require('./routes/webhook'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payment', require('./routes/payment')); // เปลี่ยนจาก /payment เป็น /api/payment
app.use('/payment', require('./routes/payment')); // เพิ่ม route เก่าเพื่อ backward compatibility

// เส้นทางสำหรับทดสอบว่าเซิร์ฟเวอร์ทำงานหรือไม่
app.get('/', (req, res) => {
  res.send('LINE Bot server is running!');
});

// ✅ เพิ่ม API สำหรับส่ง LIFF config ไปยัง frontend
app.get('/api/liff/config', (req, res) => {
  res.json({
    liffId: process.env.LIFF_ID || null
  });
});

// ✅ เพิ่ม API สำหรับตรวจสอบ LIFF configuration
app.get('/api/liff/status', (req, res) => {
  const liffHtmlPath = path.join(__dirname, 'public', 'liff-share.html');
  const liffExists = fs.existsSync(liffHtmlPath);
  
  res.json({
    liffApp: {
      path: liffHtmlPath,
      exists: liffExists,
      url: liffExists ? `${process.env.BASE_URL || 'http://localhost:3000'}/liff-share` : null
    },
    environment: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      liffId: process.env.LIFF_ID || 'NOT_SET'
    },
    ready: liffExists && process.env.LIFF_ID
  });
});

// ✅ เพิ่ม API สำหรับทดสอบ Share Target Picker
app.get('/api/liff/test-share', (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({
      error: 'Missing referral code',
      usage: '/api/liff/test-share?code=ABC123'
    });
  }
  
  const testShareCard = {
    type: "flex",
    altText: `🎁 รับเครดิตฟรี! ใช้รหัส ${code}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🎁 รับเครดิตฟรี!",
            weight: "bold",
            color: "#ffffff",
            size: "lg",
            align: "center"
          }
        ],
        backgroundColor: "#722ed1",
        paddingAll: "20px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `รหัส: ${code}`,
            weight: "bold",
            size: "xl",
            color: "#722ed1",
            align: "center"
          },
          {
            type: "text",
            text: `พิมพ์ รหัส:${code}`,
            size: "sm",
            color: "#49aa19",
            align: "center",
            margin: "md"
          }
        ],
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "uri",
              label: "🚀 เริ่มใช้งาน",
              uri: "https://line.me/R/ti/p/@033mebpp"
            },
            color: "#722ed1"
          }
        ],
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
  
  res.json({
    message: 'Test share card generated',
    referralCode: code,
    shareCard: testShareCard,
    liffUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/liff-share?code=${code}`
  });
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

// ✅ เพิ่ม API สำหรับสร้างโฟลเดอร์ public (หากยังไม่มี)
app.get('/api/setup/liff', (req, res) => {
  try {
    const publicPath = path.join(__dirname, 'public');
    
    // สร้างโฟลเดอร์ public หากไม่มี
    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
      console.log('Created public directory');
    }
    
    res.json({
      message: 'Public directory ready for LIFF apps',
      path: publicPath,
      note: 'Please create liff-share.html in this directory and set LIFF_ID in environment variables',
      nextSteps: [
        '1. Create LIFF app in LINE Developers Console',
        '2. Set LIFF_ID in .env file',
        '3. Create public/liff-share.html file',
        '4. Test with /api/liff/status'
      ]
    });
  } catch (error) {
    console.error('Setup LIFF error:', error);
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
    
    // ✅ ทดสอบ LIFF
    const liffHtmlExists = fs.existsSync(path.join(__dirname, 'public', 'liff-share.html'));
    results.tests.liff = {
      htmlExists: liffHtmlExists,
      liffId: process.env.LIFF_ID ? 'SET' : 'NOT_SET',
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      ready: liffHtmlExists && process.env.LIFF_ID
    };
    
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
      if (req.path.startsWith('/api/') || req.path.startsWith('/webhook') || req.path.startsWith('/payment') || req.path.startsWith('/images') || req.path.startsWith('/public') || req.path.startsWith('/liff-')) {
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
      console.log(`LIFF Apps served from: ${path.join(__dirname, 'public')}`);
      console.log(`LIFF Share URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}/liff-share`);
      console.log(`Result Tracking System: READY`);
      console.log(`IQ Option Integration: READY`);
      console.log(`Available API endpoints:`);
      console.log(`  - GET /api/test/full-system`);
      console.log(`  - GET /api/liff/status`);
      console.log(`  - GET /api/setup/liff`);
      console.log(`  - GET /liff-share?code=ABC123`);
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

