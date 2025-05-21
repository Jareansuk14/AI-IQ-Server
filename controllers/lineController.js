const lineService = require('../services/lineService');
const aiService = require('../services/aiService');
const creditService = require('../services/creditService');
const User = require('../models/user');
const Interaction = require('../models/interaction');
const Command = require('../models/command');
const CreditTransaction = require('../models/creditTransaction');

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
    let isNewUser = false;
    
    if (!user) {
      isNewUser = true;
      user = new User({
        lineUserId,
        displayName: profile?.displayName,
        pictureUrl: profile?.pictureUrl
      });
      
      // บันทึกผู้ใช้ใหม่
      await user.save();
      
      // สร้างธุรกรรมสำหรับเครดิตเริ่มต้น
      await CreditTransaction.create({
        user: user._id,
        amount: 10,
        type: 'initial',
        description: 'เครดิตเริ่มต้นสำหรับผู้ใช้ใหม่'
      });
    } else {
      user.lastInteraction = new Date();
      user.interactionCount += 1;
      
      // อัปเดตข้อมูลโปรไฟล์ถ้ามีการเปลี่ยนแปลง
      if (profile) {
        user.displayName = profile.displayName;
        user.pictureUrl = profile.pictureUrl;
      }
      
      await user.save();
    }
    
    return { user, isNewUser };
  } catch (error) {
    console.error('Error saving/updating user:', error);
    throw error;
  }
};

// ส่งข้อความต้อนรับสำหรับผู้ใช้ใหม่
const sendWelcomeMessage = async (userId, referralCode) => {
  try {
    await lineService.pushMessage(userId, {
      type: 'text',
      text: `🎊 ยินดีต้อนรับสู่บริการวิเคราะห์รูปภาพ AI!\n\n✨ คุณได้รับ 10 เครดิตเริ่มต้นฟรี\n\n📝 รหัสแนะนำของคุณคือ: ${referralCode}\n\n💡 ใช้รหัสแนะนำจากเพื่อนเพื่อรับเพิ่มอีก 5 เครดิต หรือแนะนำเพื่อนเพื่อรับ 10 เครดิตต่อการแนะนำ 1 คน\n\n📸 ส่งรูปภาพเพื่อให้ AI วิเคราะห์ได้เลย!`
    });
    return true;
  } catch (error) {
    console.error('Error sending welcome message:', error);
    return false;
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

// ฟังก์ชันสำหรับตรวจสอบคำสั่งพิเศษ (เครดิต, แนะนำเพื่อน)
const handleSpecialCommand = async (event) => {
  const text = event.message.text.trim().toLowerCase();
  
  try {
    // คำสั่งดูเครดิต
    if (text === 'เครดิต' || text === 'credit' || text === 'เช็คเครดิต') {
      const credits = await creditService.checkCredit(event.source.userId);
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: `คุณมีเครดิตคงเหลือ ${credits} เครดิต\n\nสามารถแนะนำเพื่อนเพื่อรับเครดิตเพิ่มได้โดยกดที่ปุ่ม "แชร์เพื่อรับเครดิต" ด้านล่าง`
      });
    }
    
    // คำสั่งดูรหัสแนะนำ
    if (text === 'รหัสแนะนำ' || text === 'referral' || text === 'แชร์' || text === 'share') {
      const referralCode = await creditService.getReferralCode(event.source.userId);
      const lineUrl = `https://line.me/R/oaMessage/@033mebpp/?%20CODE:${referralCode}`;
      
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: `รหัสแนะนำของคุณคือ: ${referralCode}\n\nแชร์ให้เพื่อนเพื่อรับ 10 เครดิต!\n\nเพื่อนของคุณสามารถพิมพ์:\nรหัส:${referralCode}\nเพื่อรับเพิ่ม 5 เครดิต\n\nหรือแชร์ลิงก์นี้:\n${lineUrl}`
      });
    }
    
    // คำสั่งใช้รหัสแนะนำ (รูปแบบ CODE:ABCDEF)
    if (text.startsWith('code:') || text.startsWith('รหัส:')) {
      const referralCode = text.split(':')[1].trim();
      
      if (!referralCode) {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: 'รูปแบบรหัสไม่ถูกต้อง กรุณาระบุในรูปแบบ "CODE:ABCDEF" หรือ "รหัส:ABCDEF"'
        });
      }
      
      try {
        const result = await creditService.applyReferralCode(event.source.userId, referralCode.toUpperCase());
        
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ ใช้รหัสแนะนำสำเร็จ!\nคุณได้รับเพิ่ม 5 เครดิต\nเครดิตคงเหลือ: ${result.credits} เครดิต`
        });
      } catch (error) {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `❌ ไม่สามารถใช้รหัสแนะนำได้: ${error.message}`
        });
      }
    }
    
    return false; // ไม่ใช่คำสั่งพิเศษ
  } catch (error) {
    console.error('Error handling special command:', error);
    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลคำสั่ง'
    });
  }
};

// ฟังก์ชันจัดการเหตุการณ์ follow (เพิ่มเพื่อน)
const handleFollowEvent = async (event) => {
  try {
    console.log('Handling follow event:', event);
    
    // ดึงข้อมูลโปรไฟล์ของผู้ใช้
    const profile = await lineService.getUserProfile(event.source.userId);
    
    // บันทึกหรืออัปเดตข้อมูลผู้ใช้
    const { user, isNewUser } = await saveOrUpdateUser(event.source.userId, profile);
    
    // ส่งข้อความต้อนรับและแจ้งเครดิตเริ่มต้น
    await sendWelcomeMessage(event.source.userId, user.referralCode);
    
    return true;
  } catch (error) {
    console.error('Error handling follow event:', error);
    return false;
  }
};

// ฟังก์ชันหลักสำหรับการจัดการข้อความ
const handleEvent = async (event) => {
  console.log('Event type:', event.type);
  
  // จัดการเหตุการณ์ follow (เพิ่มเพื่อน)
  if (event.type === 'follow') {
    return handleFollowEvent(event);
  }
  
  // ตรวจสอบข้อความคำสั่ง
  if (event.type === 'message' && event.message.type === 'text') {
    const handled = await handleSpecialCommand(event);
    if (handled) return;
  }
  
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
    const { user } = await saveOrUpdateUser(event.source.userId, profile);
    
    // ตรวจสอบเครดิต
    if (user.credits <= 0) {
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ เครดิตของคุณหมดแล้ว กรุณาแนะนำเพื่อนหรือเติมเครดิตเพื่อใช้งานต่อ\n\nแนะนำเพื่อนโดยกดที่ปุ่ม "แชร์เพื่อรับเครดิต" ด้านล่าง'
      });
    }
    
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
    
    // หักเครดิต (เฉพาะเมื่อ AI ตอบกลับสำเร็จ)
    await creditService.updateCredit(event.source.userId, -1, 'use', 'ใช้เครดิตในการวิเคราะห์รูปภาพ');
    
    // ตรวจสอบเครดิตคงเหลือ
    const remainingCredits = await creditService.checkCredit(event.source.userId);
    
    // ส่งคำตอบกลับไปยังผู้ใช้
    let responseText = aiResponse;
    
    // เพิ่มข้อความแจ้งเตือนเมื่อเครดิตเหลือน้อย
    if (remainingCredits <= 3 && remainingCredits > 0) {
      responseText += `\n\n⚠️ เหลือเครดิตอีก ${remainingCredits} เครดิต กรุณาแนะนำเพื่อนหรือเติมเครดิตเพื่อใช้งานต่อ`;
    } else if (remainingCredits === 0) {
      responseText += '\n\n⚠️ นี่เป็นเครดิตสุดท้ายของคุณแล้ว กรุณาแนะนำเพื่อนหรือเติมเครดิตเพื่อใช้งานต่อ';
    }
    
    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: responseText
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