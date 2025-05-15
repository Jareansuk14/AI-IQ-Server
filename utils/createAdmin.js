// utils/createAdmin.js
const mongoose = require('mongoose');
const Admin = require('../models/admin');
require('dotenv').config();

// เชื่อมต่อกับฐานข้อมูล
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// สร้างแอดมินเริ่มต้น
const createAdmin = async () => {
  try {
    // ตรวจสอบว่ามีแอดมินอยู่แล้วหรือไม่
    const adminExists = await Admin.findOne({ username: 'admin' });
    
    if (adminExists) {
      console.log('Admin already exists');
      mongoose.connection.close();
      return;
    }
    
    // สร้างแอดมินใหม่
    const admin = new Admin({
      username: 'admintest',
      password: 'admin@example.com', // รหัสผ่านจะถูกเข้ารหัสโดยอัตโนมัติในโมเดล
      name: 'System Administrator',
      email: 'admin@example.com',
      role: 'superadmin'
    });
    
    await admin.save();
    
    console.log('Admin created successfully');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating admin:', error);
    mongoose.connection.close();
  }
};

createAdmin();