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

// เส้นทางสำหรับคำสั่ง
router.get('/commands', commandController.getCommands);
router.post('/commands', commandController.createCommand);
router.put('/commands/:id', commandController.updateCommand);
router.patch('/commands/:id/toggle-active', commandController.toggleCommandActive);
router.delete('/commands/:id', commandController.deleteCommand);

// === เส้นทางใหม่สำหรับจัดการเครดิต ===

// เพิ่มเครดิตให้ผู้ใช้ (โดยแอดมิน)
router.post('/credits/add/:userId', adminController.addCreditToUser);

// ดูประวัติเครดิตของผู้ใช้
router.get('/credits/history/:userId', adminController.getUserCreditHistory);

// ดูรายการปรับเครดิตทั้งหมดโดยแอดมิน
router.get('/credits/transactions', adminController.getCreditTransactions);

// ดูสถิติเครดิตรวมของระบบ
router.get('/credits/stats', adminController.getCreditStats);

// ปรับเครดิตหลายคนพร้อมกัน (bulk operation)
router.post('/credits/bulk-add', adminController.bulkAddCredits);

// ตั้งค่าเครดิตเริ่มต้นสำหรับผู้ใช้ใหม่
router.post('/credits/default-setting', adminController.setDefaultCredits);

module.exports = router;