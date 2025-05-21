const express = require('express');
const line = require('@line/bot-sdk');
const router = express.Router();
const { handleEvent } = require('../controllers/lineController');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// เส้นทางสำหรับการตรวจสอบว่า webhook ทำงานหรือไม่
router.get('/', (req, res) => {
  res.status(200).send('Webhook is working!');
});

// สร้าง middleware สำหรับตรวจสอบลายเซ็นด้วยตัวเอง
const validateSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-line-signature'];
    // ถ้าไม่ใช่การเรียกจาก LINE ให้ตอบกลับปกติ
    if (!signature) {
      return res.status(200).send('Hello LINE Bot!');
    }
    
    next();
  } catch (error) {
    console.error('Signature validation error:', error);
    res.status(200).end(); // ส่ง 200 เสมอกลับไปที่ LINE
  }
};

// ใช้ express.json() ก่อน line.middleware()
router.post('/', express.json(), validateSignature, line.middleware(config), async (req, res) => {
  try {
    console.log('Webhook called with valid signature');
    
    const events = req.body.events;
    
    // ถ้าไม่มีอีเวนต์ให้ตอบกลับทันที
    if (!events || events.length === 0) {
      return res.status(200).end();
    }
    
    // แสดงข้อมูลอีเวนต์ในคอนโซล (สำหรับการดีบัก)
    console.log('Received events:', JSON.stringify(events));
    
    // ประมวลผลแต่ละอีเวนต์
    await Promise.all(events.map(event => {
      console.log('Processing event:', event.type);
      return handleEvent(event);
    }));
    
    res.status(200).end();
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).end(); // ส่ง 200 เสมอกลับไปที่ LINE
  }
});

// เส้นทางสำรองสำหรับกรณีที่การส่ง POST request ไม่ผ่าน middleware
router.post('/backup', express.json(), async (req, res) => {
  console.log('Backup webhook called');
  console.log('Request body:', req.body);
  res.status(200).end();
});

module.exports = router;