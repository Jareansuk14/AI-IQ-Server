// controllers/commandController.js
const Command = require('../models/command');

// ดึงรายการคำสั่งทั้งหมด
const getCommands = async (req, res) => {
  try {
    const commands = await Command.find().sort({ category: 1, text: 1 });
    res.json(commands);
  } catch (error) {
    console.error('Error getting commands:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่ง' });
  }
};

// สร้างคำสั่งใหม่
const createCommand = async (req, res) => {
  try {
    const { text, category } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'กรุณากรอกข้อความคำสั่ง' });
    }
    
    const command = new Command({
      text,
      category: category || 'general',
      isActive: true
    });
    
    await command.save();
    res.status(201).json(command);
  } catch (error) {
    console.error('Error creating command:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างคำสั่ง' });
  }
};

// อัปเดตคำสั่ง
const updateCommand = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, category } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'กรุณากรอกข้อความคำสั่ง' });
    }
    
    const command = await Command.findByIdAndUpdate(
      id,
      { text, category },
      { new: true }
    );
    
    if (!command) {
      return res.status(404).json({ message: 'ไม่พบคำสั่ง' });
    }
    
    res.json(command);
  } catch (error) {
    console.error('Error updating command:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตคำสั่ง' });
  }
};

// เปลี่ยนสถานะการใช้งานของคำสั่ง
const toggleCommandActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const command = await Command.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );
    
    if (!command) {
      return res.status(404).json({ message: 'ไม่พบคำสั่ง' });
    }
    
    res.json(command);
  } catch (error) {
    console.error('Error toggling command active status:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะคำสั่ง' });
  }
};

// ลบคำสั่ง
const deleteCommand = async (req, res) => {
  try {
    const { id } = req.params;
    
    const command = await Command.findByIdAndDelete(id);
    
    if (!command) {
      return res.status(404).json({ message: 'ไม่พบคำสั่ง' });
    }
    
    res.json({ message: 'ลบคำสั่งเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting command:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบคำสั่ง' });
  }
};

module.exports = {
  getCommands,
  createCommand,
  updateCommand,
  toggleCommandActive,
  deleteCommand
};