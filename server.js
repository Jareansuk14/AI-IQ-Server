//AI-Server/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 
const { connectDB, checkConnection } = require('./config/db');
const paymentChecker = require('./services/paymentChecker');
const cronService = require('./services/cronService');
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
app.use('/api/payment', require('./routes/payment')); // เปลี่ยนจาก /payment เป็น /api/payment
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

// === เพิ่ม API endpoints สำหรับระบบติดตาม ===

// ทดสอบ IQ Option connection
app.get('/api/test/iqoption', async (req, res) => {
  try {
    const iqOptionService = require('./services/iqOptionService');
    const result = await iqOptionService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('IQ Option test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ดูการติดตามที่ active
app.get('/api/tracking/active', async (req, res) => {
  try {
    const TrackingSession = require('./models/trackingSession');
    const activeSessions = await TrackingSession.find({ status: 'tracking' })
      .populate('user', 'lineUserId displayName')
      .sort({ createdAt: -1 });
    
    res.json({
      count: activeSessions.length,
      sessions: activeSessions
    });
  } catch (error) {
    console.error('Error getting active tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

// ดูประวัติการติดตาม
app.get('/api/tracking/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const TrackingSession = require('./models/trackingSession');
    const User = require('./models/user');
    
    const user = await User.findOne({ lineUserId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const sessions = await TrackingSession.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      user: {
        lineUserId: user.lineUserId,
        displayName: user.displayName
      },
      sessions
    });
  } catch (error) {
    console.error('Error getting tracking history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check สำหรับระบบติดตาม
app.get('/api/health/tracking', async (req, res) => {
  try {
    const TrackingSession = require('./models/trackingSession');
    const iqOptionService = require('./services/iqOptionService');
    
    const activeCount = await TrackingSession.countDocuments({ status: 'tracking' });
    const iqTest = await iqOptionService.testConnection();
    
    res.json({
      service: 'tracking',
      status: 'running',
      activeSessions: activeCount,
      iqOptionConnection: iqTest.success,
      cronService: 'running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
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
      if (req.path.startsWith('/api/') || req.path.startsWith('/webhook') || req.path.startsWith('/payment') || req.path.startsWith('/images')) {
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
    
    // เริ่มระบบติดตามผล AI-Auto Trading
    setTimeout(() => {
      cronService.start();
      console.log('Trading tracking system started');
    }, 6000); // รอ 6 วินาทีให้ระบบพร้อม
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
      console.log(`Trading tracking system: Ready`);
    });
  });

// จัดการการปิดโปรแกรมอย่างสะอาด
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await paymentChecker.stop();
  cronService.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await paymentChecker.stop();
  cronService.stop();
  process.exit(0);
});