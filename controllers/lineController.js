// controllers/lineController.js
const lineService = require('../services/lineService');
const aiService = require('../services/aiService');
const User = require('../models/user');
const Interaction = require('../models/interaction');
const Command = require('../models/command');

// แปลง stream เป็น buffer
const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

// สุ่มคำสั่งจากฐานข้อมูล
const getRandomCommand = async () => {
  try {
    const count = await Command.countDocuments({ isActive: true });
    const random = Math.floor(Math.random() * count);
    const command = await Command.findOne({ isActive: true }).skip(random);
    return command || { text: 'อธิบายสิ่งที่เห็นในรูปภาพนี้' };
  } catch (error) {
    console.error('Error getting random command:', error);
    return { text: 'อธิบายสิ่งที่เห็นในรูปภาพนี้' };
  }
};

// บันทึกหรืออัปเดตข้อมูลผู้ใช้
const saveOrUpdateUser = async (lineUserId, profile) => {
  try {
    let user = await User.findOne({ lineUserId });
    
    if (!user) {
      user = new User({
        lineUserId,
        displayName: profile?.displayName,
        pictureUrl: profile?.pictureUrl
      });
    } else {
      user.lastInteraction = new Date();
      user.interactionCount += 1;
      
      // อัปเดตข้อมูลโปรไฟล์ถ้ามีการเปลี่ยนแปลง
      if (profile) {
        user.displayName = profile.displayName;
        user.pictureUrl = profile.pictureUrl;
      }
    }
    
    await user.save();
    return user;
  } catch (error) {
    console.error('Error saving/updating user:', error);
    throw error;
  }
};

// บันทึกข้อมูลการโต้ตอบ
const saveInteraction = async (user, command, imageId, aiResponse, processingTime) => {
  try {
    const interaction = new Interaction({
      user: user._id,
      command: command._id,
      commandText: command.text,
      imageId,
      aiResponse,
      processingTime
    });
    
    await interaction.save();
    return interaction;
  } catch (error) {
    console.error('Error saving interaction:', error);
    throw error;
  }
};

// ฟังก์ชันหลักสำหรับการจัดการข้อความ
const handleEvent = async (event) => {
  // หากไม่ใช่ข้อความรูปภาพให้ตอบกลับทันที
  if (event.type !== 'message' || event.message.type !== 'image') {
    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: 'กรุณาส่งรูปภาพเพื่อให้ฉันวิเคราะห์'
    });
  }

  const startTime = Date.now();
  
  try {
    // ดึงข้อมูลโปรไฟล์ของผู้ใช้
    const profile = await lineService.getUserProfile(event.source.userId);
    
    // บันทึกหรืออัปเดตข้อมูลผู้ใช้
    const user = await saveOrUpdateUser(event.source.userId, profile);
    
    // ดึงเนื้อหาของรูปภาพ
    const stream = await lineService.getMessageContent(event.message.id);
    const imageBuffer = await streamToBuffer(stream);
    
    // สุ่มคำสั่ง
    const command = await getRandomCommand();
    
    // ส่งรูปภาพไปยัง AI
    const aiResponse = await aiService.processImage(imageBuffer, command.text);
    
    // คำนวณเวลาที่ใช้ในการประมวลผล
    const processingTime = Date.now() - startTime;
    
    // บันทึกข้อมูลการโต้ตอบ
    await saveInteraction(user, command, event.message.id, aiResponse, processingTime);
    
    // ส่งคำตอบกลับไปยังผู้ใช้
    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: aiResponse
    });
  } catch (error) {
    console.error('Error processing image:', error);
    
    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลรูปภาพ'
    });
  }
};

module.exports = { handleEvent };