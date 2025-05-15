// controllers/authController.js
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// สร้าง token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// สมัครสมาชิกแอดมิน
const register = async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    
    // ตรวจสอบว่ามีผู้ใช้นี้อยู่แล้วหรือไม่
    const existingUser = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' });
    }
    
    // สร้างผู้ใช้ใหม่
    const admin = await Admin.create({
      username,
      password,
      name,
      email
    });
    
    // สร้าง token
    const token = signToken(admin._id);
    
    res.status(201).json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
};

// เข้าสู่ระบบ
const login = async (req, res) => {
  try {
    console.log('Login request:', req.body);
    
    const { username, password } = req.body;
    
    // ตรวจสอบว่ามีการส่งข้อมูลมาครบหรือไม่
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }
    
    // ค้นหาผู้ใช้
    const admin = await Admin.findOne({ username });
    console.log('Found admin:', admin ? admin.username : 'None');
    
    if (!admin) {
      console.log('Admin not found');
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    // ตรวจสอบรหัสผ่าน
    const isMatch = await admin.matchPassword(password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    // สร้าง token
    const token = signToken(admin._id);
    
    console.log('Login successful, sending response');
    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
};

// ป้องกันเส้นทาง
const protect = async (req, res, next) => {
  try {
    let token;
    
    // ตรวจสอบว่ามี token ในส่วนหัวของ request หรือไม่
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบเพื่อเข้าถึงข้อมูลนี้' });
    }
    
    // ตรวจสอบ token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ค้นหาผู้ใช้จาก token
    const currentAdmin = await Admin.findById(decoded.id);
    if (!currentAdmin) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้ที่เกี่ยวข้องกับ token นี้' });
    }
    
    // เพิ่มข้อมูลผู้ใช้ลงใน request
    req.admin = currentAdmin;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'ไม่ได้รับอนุญาตให้เข้าถึงข้อมูลนี้' });
  }
};

module.exports = {
  register,
  login,
  protect
};