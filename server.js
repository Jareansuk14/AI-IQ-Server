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

// เส้นทาง
app.use('/webhook', require('./routes/webhook'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/payment', require('./routes/payment')); // เพิ่มเส้นทางสำหรับการชำระเงิน

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

// Serve static assets for the admin dashboard
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.resolve(__dirname, 'client', 'build');
  
  // ตรวจสอบว่าโฟลเดอร์ client/build มีอยู่จริงหรือไม่
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    
    app.get('*', (req, res) => {
      // ยกเว้นเส้นทางสำหรับ API และ webhook
      if (req.path.startsWith('/api/') || req.path.startsWith('/webhook') || req.path.startsWith('/payment')) {
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
    });
  });

// จัดการการปิดโปรแกรมอย่างสะอาด
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await paymentChecker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await paymentChecker.stop();
  process.exit(0);
});