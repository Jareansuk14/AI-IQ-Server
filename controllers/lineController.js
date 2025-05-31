//AI-Server/controllers/lineController.js
const lineService = require('../services/lineService');
const aiService = require('../services/aiService');
const creditService = require('../services/creditService');
const paymentService = require('../services/paymentService');
const qrCodeService = require('../services/qrCodeService');
const trackingService = require('../services/trackingService');
const { 
  createCreditPackagesMessage, 
  createPaymentInfoMessage,
  createForexPairsMessage,
  calculateNextTimeSlot,
  createContinueTradeMessage
} = require('../utils/flexMessages');
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
      text: `🎊 ยินดีต้อนรับสู่บริการวิเคราะห์รูปภาพ AI!\n\n✨ คุณได้รับ 10 เครดิตเริ่มต้นฟรี\n\n📝 รหัสแนะนำของคุณคือ: ${referralCode}\n\n💡 ใช้รหัสแนะนำจากเพื่อนเพื่อรับเพิ่มอีก 5 เครดิต หรือแนะนำเพื่อนเพื่อรับ 10 เครดิตต่อการแนะนำ 1 คน\n\n📸 ส่งรูปภาพเพื่อให้ AI วิเคราะห์ได้เลย!\n💎 เติมเครดิตเพิ่มได้ที่เมนูด้านล่าง\n🎯 หรือใช้ AI-Auto เพื่อเทรด Forex!`
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

// ฟังก์ชันสำหรับตรวจสอบคำสั่งพิเศษ (เครดิต, แนะนำเพื่อน, เติมเครดิต, AI-Auto, สถิติ, ยกเลิกการติดตาม)
const handleSpecialCommand = async (event) => {
  const text = event.message.text.trim().toLowerCase();
  
  try {
    // ตรวจสอบว่ามีการติดตามผลอยู่หรือไม่
    const hasActiveTracking = await trackingService.hasActiveTracking(event.source.userId);
    
    // คำสั่งที่ถูกล็อคระหว่างติดตาม
    const blockedDuringTracking = ['ai-auto', 'aiauto', 'forex', 'เทรด'];
    if (hasActiveTracking && blockedDuringTracking.includes(text)) {
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ กำลังติดตามผลการเทรดอยู่\n\n🔄 กรุณารอให้การติดตามผลเสร็จสิ้นก่อน\n📊 จึงจะสามารถเลือกคู่เงินใหม่ได้\n\n⏳ โปรดอดทนรอผลลัพธ์\n\n💡 ใช้คำสั่ง "ยกเลิก" หากต้องการหยุดการติดตาม'
      });
    }
    
    // คำสั่งดูเครดิต
    if (text === 'เครดิต' || text === 'credit' || text === 'เช็คเครดิต') {
      const credits = await creditService.checkCredit(event.source.userId);
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: `💎 คุณมีเครดิตคงเหลือ ${credits} เครดิต\n\n🔄 สามารถแนะนำเพื่อนเพื่อรับเครดิตเพิ่มได้โดยกดที่ปุ่ม "แชร์เพื่อรับเครดิต"\n\n💰 หรือเติมเครดิตโดยกดปุ่ม "เติมเครดิต" ด้านล่าง`
      });
    }
    
    // คำสั่งเติมเครดิต
    if (text === 'เติมเครดิต' || text === 'topup' || text === 'เติม') {
      if (hasActiveTracking) {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '⚠️ กำลังติดตามผลการเทรดอยู่\n\nสามารถเติมเครดิตได้หลังจากการติดตามผลเสร็จสิ้น'
        });
      }
      const flexMessage = createCreditPackagesMessage();
      return lineService.replyMessage(event.replyToken, flexMessage);
    }
    
    // คำสั่ง AI-Auto
    if (text === 'ai-auto' || text === 'aiauto' || text === 'forex' || text === 'เทรด') {
      const forexMessage = createForexPairsMessage();
      return lineService.replyMessage(event.replyToken, forexMessage);
    }
    
    // เพิ่มคำสั่งดูสถิติการติดตาม
    if (text === 'สถิติ' || text === 'stats' || text === 'ผลงาน') {
      const stats = await trackingService.getTrackingStats(event.source.userId);
      const winRate = stats.totalSessions > 0 ? ((stats.wins / stats.totalSessions) * 100).toFixed(1) : 0;
      
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: `📊 สถิติการเทรดของคุณ\n\n🎯 การเทรดทั้งหมด: ${stats.totalSessions} ครั้ง\n✅ ชนะ: ${stats.wins} ครั้ง\n❌ แพ้: ${stats.loses} ครั้ง\n📈 อัตราชนะ: ${winRate}%\n⭐ เฉลี่ยรอบต่อการเทรด: ${stats.avgRounds.toFixed(1)} รอบ\n\n${stats.totalSessions === 0 ? '💡 เริ่มเทรดครั้งแรกด้วยคำสั่ง "AI-Auto"' : '🎯 เทรดต่อเพื่อเพิ่มสถิติ!'}`
      });
    }
    
    // คำสั่งยกเลิกการติดตาม (ฉุกเฉิน)
    if (text === 'ยกเลิก' || text === 'cancel' || text === 'หยุด') {
      if (hasActiveTracking) {
        const cancelled = await trackingService.cancelTracking(event.source.userId);
        if (cancelled) {
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '✅ ยกเลิกการติดตามผลแล้ว\n\n💡 สามารถเลือกคู่เงินใหม่ได้แล้ว\n🎯 พิมพ์ "AI-Auto" เพื่อเริ่มเทรดใหม่'
          });
        }
      } else {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ ไม่มีการติดตามผลที่ต้องยกเลิก\n\n💡 ใช้คำสั่ง "AI-Auto" เพื่อเริ่มเทรด'
        });
      }
    }
    
    // คำสั่งดูรหัสแนะนำ
    if (text === 'รหัสแนะนำ' || text === 'referral' || text === 'แชร์' || text === 'share') {
      const referralCode = await creditService.getReferralCode(event.source.userId);
      const lineUrl = `https://line.me/R/oaMessage/@033mebpp/?%20CODE:${referralCode}`;
      
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: `🎯 รหัสแนะนำของคุณคือ: ${referralCode}\n\n🎁 แชร์ให้เพื่อนเพื่อรับ 10 เครดิต!\n\n📝 เพื่อนของคุณสามารถพิมพ์:\nรหัส:${referralCode}\nเพื่อรับเพิ่ม 5 เครดิต\n\n🔗 หรือแชร์ลิงก์นี้:\n${lineUrl}\n\n💰 ยิ่งแชร์มาก ยิ่งได้เครดิตเยอะ!`
      });
    }
    
    // คำสั่งใช้รหัสแนะนำ (รูปแบบ CODE:ABCDEF)
    if (text.startsWith('code:') || text.startsWith('รหัส:')) {
      const referralCode = text.split(':')[1].trim();
      
      if (!referralCode) {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ รูปแบบรหัสไม่ถูกต้อง\nกรุณาระบุในรูปแบบ "CODE:ABCDEF" หรือ "รหัส:ABCDEF"'
        });
      }
      
      try {
        const result = await creditService.applyReferralCode(event.source.userId, referralCode.toUpperCase());
        
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ ใช้รหัสแนะนำสำเร็จ!\n🎁 คุณได้รับเพิ่ม 5 เครดิต\n💎 เครดิตคงเหลือ: ${result.credits} เครดิต\n\n🎉 ขอบคุณที่ใช้รหัสแนะนำ!`
        });
      } catch (error) {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `❌ ไม่สามารถใช้รหัสแนะนำได้: ${error.message}`
        });
      }
    }
    
    // เพิ่มคำสั่งช่วยเหลือ
    if (text === 'help' || text === 'ช่วยเหลือ' || text === 'คำสั่ง') {
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: `📚 คำสั่งที่ใช้ได้:\n\n🎯 การเทรด:\n• "AI-Auto" - เทรด Forex\n• "สถิติ" - ดูผลงานการเทรด\n• "ยกเลิก" - หยุดการติดตาม\n\n💎 เครดิต:\n• "เครดิต" - ดูเครดิตคงเหลือ\n• "เติมเครดิต" - ซื้อเครดิต\n\n👥 การแนะนำ:\n• "แชร์" - ดูรหัสแนะนำ\n• "รหัส:ABCDEF" - ใช้รหัสแนะนำ\n\n📸 การวิเคราะห์:\n• ส่งรูปภาพ - วิเคราะห์ด้วย AI`
      });
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

// ฟังก์ชันจัดการ Postback Events (สำหรับปุ่มใน Flex Message)
const handlePostbackEvent = async (event) => {
  try {
    const data = event.postback.data;
    const params = new URLSearchParams(data);
    const action = params.get('action');
    
    console.log('Handling postback event:', action, data);
    
    switch (action) {
      case 'buy_credit':
        // ตรวจสอบการติดตาม
        const hasActiveTracking = await trackingService.hasActiveTracking(event.source.userId);
        if (hasActiveTracking) {
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '⚠️ กำลังติดตามผลการเทรดอยู่\n\nสามารถเติมเครดิตได้หลังจากการติดตามผลเสร็จสิ้น'
          });
        }
        
        const packageType = params.get('package');
        
        try {
          // สร้างรายการชำระเงิน
          const paymentTransaction = await paymentService.createPaymentTransaction(
            event.source.userId, 
            packageType
          );
          
          // สร้าง URL สำหรับ QR Code
          const baseURL = process.env.BASE_URL || 'http://localhost:3000';
          const qrCodeURL = `${baseURL}/payment/qr/${paymentTransaction._id}`;
          
          // ส่ง Flex Message แสดงข้อมูลการชำระเงิน
          const paymentInfoMessage = createPaymentInfoMessage(paymentTransaction, qrCodeURL);
          
          return lineService.replyMessage(event.replyToken, paymentInfoMessage);
        } catch (error) {
          console.error('Error creating payment transaction:', error);
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: `❌ ไม่สามารถสร้างรายการชำระเงินได้: ${error.message}\n\n💡 โปรดลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ`
          });
        }
        
      case 'cancel_payment':
        const paymentId = params.get('payment_id');
        
        try {
          await paymentService.cancelPayment(paymentId, event.source.userId);
          
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '✅ ยกเลิกรายการชำระเงินเรียบร้อยแล้ว\n\n💎 คุณสามารถสร้างรายการใหม่ได้โดยกดปุ่ม "เติมเครดิต" ในเมนูด้านล่าง'
          });
        } catch (error) {
          console.error('Error cancelling payment:', error);
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: `❌ ไม่สามารถยกเลิกรายการได้: ${error.message}`
          });
        }

      // case สำหรับการวิเคราะห์ Forex พร้อมระบบติดตาม
      case 'forex_analysis':
        const forexPair = params.get('pair');
        
        try {
          console.log(`Processing forex analysis for pair: ${forexPair}`);
          
          // ตรวจสอบการติดตามที่ active
          const hasActiveTrackingForex = await trackingService.hasActiveTracking(event.source.userId);
          if (hasActiveTrackingForex) {
            return lineService.replyMessage(event.replyToken, {
              type: 'text',
              text: '⚠️ กำลังติดตามผลการเทรดอยู่\n\n🔄 กรุณารอให้การติดตามผลเสร็จสิ้นก่อน\n📊 จึงจะสามารถเลือกคู่เงินใหม่ได้\n\n💡 ใช้คำสั่ง "ยกเลิก" หากต้องการหยุดการติดตาม'
            });
          }
          
          // ส่งข้อความ "กำลังประมวลผล..." ทันทีหลังจากกดการ์ด
          await lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: `🔄 กำลังประมวลผล ${forexPair}...\n\n📊 AI กำลังวิเคราะห์ข้อมูลตลาด\n⏳ กรุณารอสักครู่`
          });
          
          // ตรวจสอบเครดิต
          const profile = await lineService.getUserProfile(event.source.userId);
          const { user } = await saveOrUpdateUser(event.source.userId, profile);
          
          if (user.credits <= 0) {
            return lineService.pushMessage(event.source.userId, {
              type: 'text',
              text: '⚠️ เครดิตของคุณหมดแล้ว\n\n💎 เติมเครดิตโดยกดปุ่ม "เติมเครดิต" ด้านล่าง\n🎁 หรือแนะนำเพื่อนเพื่อรับเครดิตฟรี\n\n✨ แนะนำเพื่อน 1 คน = 10 เครดิตฟรี!'
            });
          }

          // สร้างคำถามสำหรับ AI
          const aiQuestion = `ในคู่เงิน ${forexPair} ตอนนี้ควร CALL หรือ PUT ไปเช็คกราฟจากเว็บต่างๆให้หน่อย ตอบมาสั้นๆแค่ CALL หรือ PUT`;
          
          console.log('Sending forex question to AI:', aiQuestion);
          
          // ส่งคำถามไป AI 
          const aiResponse = await aiService.processForexQuestion(aiQuestion);
          console.log('AI Response received:', aiResponse);
          
          // คำนวณเวลา 5 นาทีข้างหน้า
          const targetTime = calculateNextTimeSlot();
          
          // ประมวลผลคำตอบ AI
          const prediction = aiResponse.toUpperCase().includes('CALL') ? 'CALL' : 'PUT';
          
          // หักเครดิต
          await creditService.updateCredit(event.source.userId, -1, 'use', `ใช้เครดิตในการวิเคราะห์ ${forexPair}`);
          
          // ตรวจสอบเครดิตคงเหลือ
          const remainingCredits = await creditService.checkCredit(event.source.userId);
          
          // สร้างข้อความตามรูปแบบที่ต้องการ
          const formattedPair = `${forexPair} (M5)`;
          const currentDate = new Date().toLocaleDateString('th-TH', { 
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          
          const responseText = `${formattedPair}\nผลการวิเคราะห์: ${prediction}\nเข้าเทรดตอน: ${targetTime}\nเครดิตคงเหลือ: ${remainingCredits} เครดิต\n\n📅 วันที่เทรด: ${currentDate}\n🕐 เช็คผลเมื่อ: ${targetTime} น. (+5 นาที)`;
          
          console.log('Sending response with image and text');
          
          // URL ของรูปภาพตามการทำนาย
          const baseURL = process.env.BASE_URL || 'http://localhost:3000';
          const imageFileName = prediction === 'CALL' ? 'call-signal.jpg' : 'put-signal.jpg';
          const imageUrl = `${baseURL}/images/${imageFileName}`;
          
          // ส่งผลลัพธ์ผ่าน pushMessage (เพราะ replyToken ใช้ไปแล้ว)
          await lineService.pushMessage(event.source.userId, [
            // ส่งรูปภาพก่อน
            {
              type: 'image',
              originalContentUrl: imageUrl,
              previewImageUrl: imageUrl
            },
            // ตามด้วยข้อความ
            {
              type: 'text',
              text: responseText
            }
          ]);
          
          // เริ่มการติดตามผล
          const entryTime = new Date();
          // ปัดเวลาไปที่ targetTime
          const [hours, minutes] = targetTime.split(':');
          entryTime.setHours(parseInt(hours));
          entryTime.setMinutes(parseInt(minutes));
          entryTime.setSeconds(0);
          entryTime.setMilliseconds(0);
          
          await trackingService.startTracking(
            user._id,
            event.source.userId,
            forexPair,
            prediction,
            entryTime,
            targetTime
          );
          
        } catch (error) {
          console.error('Error analyzing forex pair:', error);
          return lineService.pushMessage(event.source.userId, {
            type: 'text',
            text: '❌ ขออภัย เกิดข้อผิดพลาดในการวิเคราะห์คู่เงิน\n\n💡 กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ'
          });
        }
        break;

      // case ใหม่สำหรับการตอบคำถาม "เทรดต่อไหม?"
      case 'continue_trade':
        const choice = params.get('choice');
        
        if (choice === 'yes') {
          // เลือกเทรดต่อ - แสดงเมนูคู่เงิน
          const forexMessage = createForexPairsMessage();
          return lineService.replyMessage(event.replyToken, forexMessage);
        } else {
          // เลือกไม่เทรดต่อ - ส่งข้อความลาก่อน
          const stats = await trackingService.getTrackingStats(event.source.userId);
          const winRate = stats.totalSessions > 0 ? ((stats.wins / stats.totalSessions) * 100).toFixed(1) : 0;
          
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: `👋 ขอบคุณที่ใช้บริการ AI-Auto Trading!\n\n📊 สรุปสถิติของคุณ:\n• 🎯 เทรดทั้งหมด: ${stats.totalSessions} ครั้ง\n• ✅ ชนะ: ${stats.wins} ครั้ง\n• ❌ แพ้: ${stats.loses} ครั้ง\n• 📈 อัตราชนะ: ${winRate}%\n\n🎯 ลองมาเทรดใหม่อีกครั้งเมื่อไหร่ก็ได้!\n\n💡 พิมพ์ "AI-Auto" เพื่อเริ่มเทรดใหม่\n💎 พิมพ์ "เครดิต" เพื่อดูเครดิตคงเหลือ\n📊 พิมพ์ "สถิติ" เพื่อดูผลงาน\n\n✨ ขอให้โชคดีในการลงทุน!`
          });
        }
        break;
        
      default:
        console.log('Unknown postback action:', action);
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: 'ขออภัย ไม่เข้าใจคำสั่งนี้'
        });
    }
  } catch (error) {
    console.error('Error handling postback event:', error);
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
  
  // จัดการเหตุการณ์ postback (กดปุ่มใน Flex Message)
  if (event.type === 'postback') {
    return handlePostbackEvent(event);
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
      text: '📸 กรุณาส่งรูปภาพเพื่อให้ฉันวิเคราะห์\n\n💡 หรือใช้คำสั่งต่างๆ เช่น:\n• "เครดิต" - ดูเครดิตคงเหลือ\n• "เติมเครดิต" - ซื้อเครดิตเพิ่ม\n• "แชร์" - ดูรหัสแนะนำเพื่อน\n• "AI-Auto" - วิเคราะห์คู่เงิน Forex\n• "สถิติ" - ดูผลงานการเทรด\n• "help" - ดูคำสั่งทั้งหมด'
    });
  }

  const startTime = Date.now();
  
  try {
    // ตรวจสอบว่ามีการติดตามผลอยู่หรือไม่
    const hasActiveTracking = await trackingService.hasActiveTracking(event.source.userId);
    if (hasActiveTracking) {
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ กำลังติดตามผลการเทรดอยู่\n\n🔄 ไม่สามารถวิเคราะห์รูปภาพได้ในขณะนี้\n📊 กรุณารอให้การติดตามผลเสร็จสิ้นก่อน\n\n💡 ใช้คำสั่ง "ยกเลิก" หากต้องการหยุดการติดตาม'
      });
    }
    
    // ดึงข้อมูลโปรไฟล์ของผู้ใช้
    const profile = await lineService.getUserProfile(event.source.userId);
    
    // บันทึกหรืออัปเดตข้อมูลผู้ใช้
    const { user } = await saveOrUpdateUser(event.source.userId, profile);
    
    // ตรวจสอบเครดิต
    if (user.credits <= 0) {
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ เครดิตของคุณหมดแล้ว\n\n💎 เติมเครดิตโดยกดปุ่ม "เติมเครดิต" ด้านล่าง\n🎁 หรือแนะนำเพื่อนเพื่อรับเครดิตฟรี โดยกดปุ่ม "แชร์เพื่อรับเครดิต"\n\n✨ แนะนำเพื่อน 1 คน = 10 เครดิตฟรี!'
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
      responseText += `\n\n⚠️ เหลือเครดิตอีก ${remainingCredits} เครดิต\n💎 เติมเครดิตหรือแนะนำเพื่อนเพื่อใช้งานต่อได้จากเมนูด้านล่าง`;
    } else if (remainingCredits === 0) {
      responseText += '\n\n⚠️ นี่เป็นเครดิตสุดท้ายของคุณแล้ว\n💎 เติมเครดิตหรือแนะนำเพื่อนเพื่อใช้งานต่อได้จากเมนูด้านล่าง';
    } else {
      responseText += `\n\n💎 เครดิตคงเหลือ: ${remainingCredits} เครดิต\n🎯 ลองใช้ "AI-Auto" เพื่อเทรด Forex!`;
    }
    
    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: responseText
    });
  } catch (error) {
    console.error('Error processing image:', error);
    
    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ ขออภัย เกิดข้อผิดพลาดในการประมวลผลรูปภาพ\n\n💡 กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบหากปัญหายังคงมีอยู่'
    });
  }
};

module.exports = { handleEvent };