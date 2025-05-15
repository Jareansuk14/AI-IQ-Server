// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const commandController = require('../controllers/commandController');

// ตรวจสอบการเข้าถึง
router.use(authController.protect);

// เส้นทางสำหรับแดชบอร์ด
router.get('/dashboard', adminController.getDashboardSummary);

// เส้นทางสำหรับผู้ใช้
router.get('/users', adminController.getUsers);

// เส้นทางสำหรับการโต้ตอบ
router.get('/interactions', adminController.getInteractions);

// เส้นทางสำหรับข้อมูลเชิงลึก
router.get('/insights', adminController.getInsights);

router.get('/commands', commandController.getCommands);
router.post('/commands', commandController.createCommand);
router.put('/commands/:id', commandController.updateCommand);
router.patch('/commands/:id/toggle-active', commandController.toggleCommandActive);
router.delete('/commands/:id', commandController.deleteCommand);

module.exports = router;