// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ลงทะเบียนแอดมิน
router.post('/register', authController.register);

// เข้าสู่ระบบ
router.post('/login', authController.login);

// เส้นทางทดสอบ
router.get('/test', (req, res) => {
  res.json({ message: 'Auth API is working!' });
});

module.exports = router;