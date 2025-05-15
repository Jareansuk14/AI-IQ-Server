// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // เพิ่มตัวเลือกการเชื่อมต่อเพื่อเพิ่มความน่าเชื่อถือ
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // เพิ่มเวลา timeout เป็น 30 วินาที
      socketTimeoutMS: 45000, // เพิ่มเวลา socket timeout เป็น 45 วินาที
      connectTimeoutMS: 30000, // เวลา timeout สำหรับการเชื่อมต่อเริ่มต้น
      // เพิ่มตัวเลือกอื่นๆ ที่จำเป็น
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    // ไม่ควรปิดการทำงานของเซิร์ฟเวอร์ในการผลิต
    return false;
  }
};

// เพิ่มฟังก์ชันสำหรับตรวจสอบการเชื่อมต่อ
const checkConnection = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

module.exports = { connectDB, checkConnection };
