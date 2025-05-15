// utils/seedCommands.js
const mongoose = require('mongoose');
const Command = require('../models/command');
require('dotenv').config();

// เชื่อมต่อกับฐานข้อมูล
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// คำสั่งเริ่มต้น
const seedCommands = [
  {
    text: 'อธิบายสิ่งที่เห็นในรูปภาพนี้',
    category: 'general',
    isActive: true
  },
  {
    text: 'ถ้าต้องเขียนบทความเกี่ยวกับรูปภาพนี้ จะเขียนอย่างไร?',
    category: 'creative',
    isActive: true
  },
  {
    text: 'นี่คือรูปของสถานที่ไหน? อธิบายข้อมูลเกี่ยวกับสถานที่นี้',
    category: 'location',
    isActive: true
  },
  {
    text: 'มีอะไรน่าสังเกตหรือน่าสนใจเป็นพิเศษในรูปภาพนี้ไหม?',
    category: 'analysis',
    isActive: true
  },
  {
    text: 'รูปภาพนี้เล่าเรื่องราวอะไร?',
    category: 'storytelling',
    isActive: true
  },
  {
    text: 'เล่าตำนานหรือเรื่องแต่งที่เกี่ยวข้องกับรูปภาพนี้',
    category: 'creative',
    isActive: true
  },
  {
    text: 'ถ้ารูปนี้เป็นโปสเตอร์ภาพยนตร์ จะเป็นหนังแนวไหนและมีเนื้อเรื่องอย่างไร?',
    category: 'creative',
    isActive: true
  },
  {
    text: 'ช่วยวิเคราะห์องค์ประกอบศิลป์ในรูปภาพนี้',
    category: 'art',
    isActive: true
  },
  {
    text: 'รูปนี้ถ่ายในฤดูอะไร และมีเหตุผลสนับสนุนอย่างไร?',
    category: 'analysis',
    isActive: true
  },
  {
    text: 'รูปภาพนี้สื่อถึงอารมณ์หรือความรู้สึกอะไร และทำไม?',
    category: 'emotion',
    isActive: true
  }
];

// เพิ่มคำสั่งลงในฐานข้อมูล
const seedDB = async () => {
  try {
    // ลบคำสั่งเดิมทั้งหมด (ถ้าต้องการ)
    await Command.deleteMany({});
    
    // เพิ่มคำสั่งใหม่
    await Command.insertMany(seedCommands);
    
    console.log('Database seeded!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
};

seedDB();