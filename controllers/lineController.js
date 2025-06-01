// AI-Server/controllers/lineController.js - อัปเดตใช้ Compact Flex

const lineService = require('../services/lineService');
const aiService = require('../services/aiService');
const creditService = require('../services/creditService');
const paymentService = require('../services/paymentService');
const qrCodeService = require('../services/qrCodeService');
const resultTrackingService = require('../services/resultTrackingService');
const { 
  createCreditPackagesMessage, 
  createPaymentInfoMessage,
  createForexPairsMessage,
  calculateNextTimeSlot,
  createContinueTradeMessage,
  createCompactShareTargetMessage,   // 🔄 เปลี่ยนเป็น Compact
  createCompactInviteCard,           // 🔄 เปลี่ยนเป็น Compact
  createSharePreviewMessage          // 🆕 เพิ่มใหม่
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
      
      await user.save();
      
      await CreditTransaction.create({
        user: user._id,
        amount: 10,
        type: 'initial',
        description: 'เครดิตเริ่มต้นสำหรับผู้ใช้ใหม่'
      });
    } else {
      user.lastInteraction = new Date();
      user.interactionCount += 1;
      
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
      text: `🎊 ยินดีต้อนรับสู่บริการวิเคราะห์รูปภาพ AI!\n\n✨ คุณได้รับ 10 เครดิตเริ่มต้นฟรี\n\n📝 รหัสแนะนำของคุณคือ: ${referralCode}\n\n💡 ใช้รหัสแนะนำจากเพื่อนเพื่อรับเพิ่มอีก 5 เครดิต หรือแนะนำเพื่อนเพื่อรับ 10 เครดิตต่อการแนะนำ 1 คน\n\n📸 ส่งรูปภาพเพื่อให้ AI วิเคราะห์ได้เลย!\n\n💎 เติมเครดิตเพิ่มได้ที่เมนูด้านล่าง`
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

// ฟังก์ชันสำหรับตรวจสอบคำสั่งพิเศษ
const handleSpecialCommand = async (event) => {
  const text = event.message.text.trim().toLowerCase();
  const userId = event.source.userId;
  
  try {
    if (resultTrackingService.isUserBlocked(userId)) {
      if (text === 'ยกเลิกติดตาม' || text === 'cancel' || text === 'stop') {
        const cancelled = await resultTrackingService.cancelTracking(userId);
        if (cancelled) {
          return true;
        }
      }
      
      await resultTrackingService.handleBlockedUserMessage(userId);
      return true;
    }

    if (text === 'เครดิต' || text === 'credit' || text === 'เช็คเครดิต') {
      const credits = await creditService.checkCredit(userId);
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: `💎 คุณมีเครดิตคงเหลือ ${credits} เครดิต\n\n🔄 สามารถแนะนำเพื่อนเพื่อรับเครดิตเพิ่มได้โดยกดที่ปุ่ม "แชร์เพื่อรับเครดิต"\n\n💰 หรือเติมเครดิตโดยกดปุ่ม "เติมเครดิต" ด้านล่าง`
      });
    }
    
    if (text === 'เติมเครดิต' || text === 'topup' || text === 'เติม') {
      const flexMessage = createCreditPackagesMessage();
      return lineService.replyMessage(event.replyToken, flexMessage);
    }
    
    if (text === 'ai-auto' || text === 'aiauto' || text === 'forex' || text === 'เทรด') {
      const forexMessage = createForexPairsMessage();
      return lineService.replyMessage(event.replyToken, forexMessage);
    }
    
    // 🔄 อัปเดตส่วนแชร์ใหม่ - ใช้ Compact Flex
    if (text === 'รหัสแนะนำ' || text === 'referral' || text === 'แชร์' || text === 'share') {
      try {
        // ดึงข้อมูลผู้ใช้
        const profile = await lineService.getUserProfile(userId);
        const referralCode = await creditService.getReferralCode(userId);
        const userName = profile?.displayName || 'เพื่อน';
        
        console.log(`🔄 Creating compact share message for ${userName} with code ${referralCode}`);
        
        // 🆕 สร้างข้อความทั้ง 3 แบบ
        const previewMessage = createSharePreviewMessage(referralCode, userName);
        const shareMessage = createCompactShareTargetMessage(referralCode, userName);
        
        // ส่งข้อความทั้งสอง
        return lineService.replyMessage(event.replyToken, [
          previewMessage,  // แสดงตัวอย่างก่อน
          shareMessage     // ตามด้วยปุ่มแชร์
        ]);
      } catch (error) {
        console.error('Error creating compact share message:', error);
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการสร้างข้อความแชร์ กรุณาลองใหม่อีกครั้ง'
        });
      }
    }
    
    // 🆕 เพิ่มคำสั่งดูตัวอย่างการ์ด
    if (text === 'ตัวอย่าง' || text === 'preview' || text === 'demo') {
      try {
        const profile = await lineService.getUserProfile(userId);
        const referralCode = await creditService.getReferralCode(userId);
        const userName = profile?.displayName || 'เพื่อน';
        
        // สร้างการ์ดตัวอย่าง
        const demoCard = createCompactInviteCard(referralCode, userName);
        
        return lineService.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: '👀 นี่คือการ์ดเชิญที่เพื่อนจะได้รับ:'
          },
          demoCard
        ]);
      } catch (error) {
        console.error('Error creating demo card:', error);
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการสร้างตัวอย่าง'
        });
      }
    }
    
    // 🆕 เพิ่มคำสั่งดูรหัสแนะนำพร้อมสถิติ
    if (text === 'รหัส' || text === 'code' || text === 'mycode') {
      try {
        const referralCode = await creditService.getReferralCode(userId);
        const stats = await creditService.getReferralStats(userId);
        
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `🎯 รหัสแนะนำของคุณ: ${referralCode}\n\n📊 สถิติการแนะนำ:\n• จำนวนคนที่แนะนำ: ${stats.referredCount} คน\n• เครดิตที่ได้รับ: ${stats.totalCreditsEarned} เครดิต\n\n📝 เพื่อนสามารถพิมพ์:\n"รหัส:${referralCode}" เพื่อรับ 5 เครดิตฟรี\n\n🎁 คุณจะได้รับ 10 เครดิตทุกครั้งที่มีคนใช้รหัสของคุณ\n\n📤 กด "แชร์" เพื่อส่งการ์ดเชิญให้เพื่อน\n👀 กด "ตัวอย่าง" เพื่อดูการ์ดที่เพื่อนจะได้รับ`
        });
      } catch (error) {
        console.error('Error getting referral info:', error);
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลรหัสแนะนำ'
        });
      }
    }
    
    // ระบบใช้รหัสแนะนำ (เหมือนเดิม)
    if (text.startsWith('code:') || text.startsWith('รหัส:')) {
      const referralCode = text.split(':')[1].trim();
      
      if (!referralCode) {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ รูปแบบรหัสไม่ถูกต้อง\nกรุณาระบุในรูปแบบ "CODE:ABCDEF" หรือ "รหัส:ABCDEF"'
        });
      }
      
      try {
        const result = await creditService.applyReferralCode(userId, referralCode.toUpperCase());
        
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ ใช้รหัสแนะนำสำเร็จ!\n🎁 คุณได้รับเพิ่ม 5 เครดิต\n💎 เครดิตคงเหลือ: ${result.credits} เครดิต\n\n🎉 ขอบคุณที่ใช้รหัสแนะนำจาก ${result.referrerName || 'เพื่อน'}!`
        });
      } catch (error) {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `❌ ไม่สามารถใช้รหัสแนะนำได้: ${error.message}`
        });
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error handling special command:', error);
    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลคำสั่ง'
    });
  }
};

// 🔥 ฟังก์ชันจัดการ Postback Events (เหมือนเดิม)
const handlePostbackEvent = async (event) => {
  try {
    const data = event.postback.data;
    const params = new URLSearchParams(data);
    const action = params.get('action');
    const userId = event.source.userId;
    
    console.log('Handling postback event:', action, data);
    
    if (resultTrackingService.isUserBlocked(userId) && 
        !['continue_trading', 'stop_trading'].includes(action)) {
      await resultTrackingService.handleBlockedUserMessage(userId);
      return;
    }
    
    switch (action) {
      case 'buy_credit':
        const packageType = params.get('package');
        
        try {
          const paymentTransaction = await paymentService.createPaymentTransaction(
            userId, 
            packageType
          );
          
          const baseURL = process.env.BASE_URL || 'http://localhost:3000';
          const qrCodeURL = `${baseURL}/api/payment/qr/${paymentTransaction._id}`;
          
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
          await paymentService.cancelPayment(paymentId, userId);
          
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

      // 🔥 การวิเคราะห์ Forex ด้วย Technical Analysis (เหมือนเดิม)
      case 'forex_analysis':
        const forexPair = params.get('pair');
        
        try {
          console.log(`🔍 Processing technical analysis for pair: ${forexPair}`);
          
          // ส่งข้อความ "กำลังประมวลผล..." ทันที
          await lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: `🔄 กำลังวิเคราะห์ ${forexPair}...\n\n📊 ระบบกำลังวิเคราะห์ข้อมูลทางเทคนิค\n⏳ กรุณารอสักครู่`
          });
          
          // ตรวจสอบเครดิต
          const profile = await lineService.getUserProfile(userId);
          const { user } = await saveOrUpdateUser(userId, profile);
          
          if (user.credits <= 0) {
            return lineService.pushMessage(userId, {
              type: 'text',
              text: '⚠️ เครดิตของคุณหมดแล้ว\n\n💎 เติมเครดิตโดยกดปุ่ม "เติมเครดิต" ด้านล่าง\n🎁 หรือแนะนำเพื่อนเพื่อรับเครดิตฟรี\n\n✨ แนะนำเพื่อน 1 คน = 10 เครดิตฟรี!'
            });
          }

          // 🔥 ใช้ Technical Analysis แทน AI
          console.log('🔍 Starting technical analysis...');
          
          const analysisResult = await aiService.processForexQuestion(`วิเคราะห์คู่เงิน ${forexPair}`);
          
          console.log('📊 Technical analysis result:', {
            signal: analysisResult.signal,
            confidence: analysisResult.confidence,
            winChance: analysisResult.winChance
          });
          
          // คำนวณเวลา 5 นาทีข้างหน้า
          const targetTime = calculateNextTimeSlot();
          
          // หักเครดิต
          await creditService.updateCredit(userId, -1, 'use', `ใช้เครดิตในการวิเคราะห์ ${forexPair}`);
          
          // ตรวจสอบเครดิตคงเหลือ
          const remainingCredits = await creditService.checkCredit(userId);
          
          // 🆕 สร้างข้อความแบบใหม่ด้วย Technical Analysis
          const responseText = aiService.formatForexResponse(
            analysisResult,
            forexPair,
            targetTime,
            remainingCredits
          );
          
          console.log('📤 Sending technical analysis response');
          
          // URL ของรูปภาพตามการทำนาย
          const baseURL = process.env.BASE_URL || 'http://localhost:3000';
          const imageFileName = analysisResult.signal === 'CALL' ? 'call-signal.jpg' : 'put-signal.jpg';
          const imageUrl = `${baseURL}/images/${imageFileName}`;
          
          // ส่งผลลัพธ์ (ใช้ pushMessage เพราะ replyToken ใช้ไปแล้ว)
          await lineService.pushMessage(userId, [
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

          // เริ่มระบบติดตามผล
          await resultTrackingService.startTracking(userId, analysisResult.signal, forexPair, targetTime);
          
          return;
          
        } catch (error) {
          console.error('❌ Error in technical analysis:', error);
          
          return lineService.pushMessage(userId, {
            type: 'text',
            text: '❌ ขออภัย เกิดข้อผิดพลาดในการวิเคราะห์ทางเทคนิค\n\n💡 กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ'
          });
        }

      case 'continue_trading':
        try {
          const forexMessage = createForexPairsMessage();
          return lineService.replyMessage(event.replyToken, forexMessage);
        } catch (error) {
          console.error('Error showing forex pairs:', error);
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ เกิดข้อผิดพลาดในการแสดงเมนูคู่เงิน'
          });
        }

      case 'stop_trading':
        try {
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '👋 ขอบคุณที่ใช้บริการ AI-Auto!\n\n🎯 หวังว่าจะได้เจอกันใหม่\n💪 โชคดีในการเทรดครั้งต่อไป!\n\n✨ พิมพ์ "AI-Auto" เมื่อพร้อมเทรดอีกครั้ง'
          });
        } catch (error) {
          console.error('Error handling stop trading:', error);
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '👋 ขอบคุณที่ใช้บริการ!'
          });
        }
        
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

// 🆕 ฟังก์ชันจัดการเมื่อมีคนเพิ่มเพื่อนผ่านลิงก์แชร์ (เหมือนเดิม)
const handleFollowWithReferral = async (userId, referralCode) => {
  try {
    console.log(`New user ${userId} followed via referral code: ${referralCode}`);
    
    // ดึงข้อมูลโปรไฟล์
    const profile = await lineService.getUserProfile(userId);
    
    // สร้างหรืออัปเดตผู้ใช้
    const { user, isNewUser } = await saveOrUpdateUser(userId, profile);
    
    if (isNewUser && referralCode) {
      // ถ้าเป็นผู้ใช้ใหม่และมีรหัสแนะนำ
      try {
        // ใช้รหัสแนะนำอัตโนมัติ
        await creditService.applyReferralCode(userId, referralCode);
        
        // ส่งข้อความต้อนรับพิเศษ
        await lineService.pushMessage(userId, {
          type: 'text',
          text: `🎊 ยินดีต้อนรับสู่ AI Bot!\n\n🎁 คุณได้รับเครดิตพิเศษ!\n• เครดิตเริ่มต้น: 10 เครดิต\n• โบนัสจากเพื่อน: 5 เครดิต\n💎 รวมทั้งหมด: 15 เครดิต\n\n✨ ขอบคุณที่มาจากการแนะนำของเพื่อน!\n\n📸 ส่งรูปภาพเพื่อให้ AI วิเคราะห์ได้เลย!\n💰 หรือพิมพ์ "AI-Auto" เพื่อวิเคราะห์ Forex`
        });
        
        return true;
      } catch (error) {
        console.error('Error applying referral code on follow:', error);
        // ถ้าใช้รหัสไม่ได้ ก็ส่งข้อความต้อนรับปกติ
        await sendWelcomeMessage(userId, user.referralCode);
        return true;
      }
    } else {
      // ผู้ใช้เก่าหรือไม่มีรหัสแนะนำ
      if (isNewUser) {
        await sendWelcomeMessage(userId, user.referralCode);
      }
      return true;
    }
  } catch (error) {
    console.error('Error handling follow with referral:', error);
    return false;
  }
};

// ฟังก์ชันจัดการเหตุการณ์ follow (เพิ่มเพื่อน) (เหมือนเดิม)
const handleFollowEvent = async (event) => {
  try {
    console.log('Handling follow event:', event);
    
    const userId = event.source.userId;
    
    // ตรวจสอบว่ามี referral code จาก URL parameter หรือไม่
    let referralCode = null;
    
    // หา referral code จาก source link params (ถ้ามี)
    if (event.source.type === 'user' && event.link) {
      const urlParams = new URLSearchParams(event.link.split('?')[1] || '');
      referralCode = urlParams.get('ref');
    }
    
    if (referralCode) {
      return handleFollowWithReferral(userId, referralCode);
    } else {
      const profile = await lineService.getUserProfile(userId);
      const { user, isNewUser } = await saveOrUpdateUser(userId, profile);
      
      if (isNewUser) {
        await sendWelcomeMessage(userId, user.referralCode);
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error handling follow event:', error);
    return false;
  }
};

// ฟังก์ชันหลักสำหรับการจัดการข้อความ (เหมือนเดิม)
const handleEvent = async (event) => {
  console.log('Event type:', event.type);
  
  if (event.type === 'follow') {
    return handleFollowEvent(event);
  }
  
  if (event.type === 'postback') {
    return handlePostbackEvent(event);
  }
  
  if (event.type === 'message' && event.message.type === 'text') {
    const handled = await handleSpecialCommand(event);
    if (handled) return;
  }
  
  if (event.type !== 'message' || event.message.type !== 'image') {
    if (resultTrackingService.isUserBlocked(event.source.userId)) {
      return resultTrackingService.handleBlockedUserMessage(event.source.userId);
    }

    return lineService.replyMessage(event.replyToken, {
      type: 'text',
      text: '📸 กรุณาส่งรูปภาพเพื่อให้ฉันวิเคราะห์\n\n💡 หรือใช้คำสั่งต่างๆ เช่น:\n• "เครดิต" - ดูเครดิตคงเหลือ\n• "เติมเครดิต" - ซื้อเครดิตเพิ่ม\n• "แชร์" - แชร์ให้เพื่อนรับเครดิต\n• "ตัวอย่าง" - ดูการ์ดที่เพื่อนจะได้รับ\n• "AI-Auto" - วิเคราะห์คู่เงิน Forex'
    });
  }

  if (resultTrackingService.isUserBlocked(event.source.userId)) {
    return resultTrackingService.handleBlockedUserMessage(event.source.userId);
  }

  const startTime = Date.now();
  
  try {
    const profile = await lineService.getUserProfile(event.source.userId);
    
    const { user } = await saveOrUpdateUser(event.source.userId, profile);
    
    if (user.credits <= 0) {
      return lineService.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ เครดิตของคุณหมดแล้ว\n\n💎 เติมเครดิตโดยกดปุ่ม "เติมเครดิต" ด้านล่าง\n🎁 หรือแนะนำเพื่อนเพื่อรับเครดิตฟรี โดยกดปุ่ม "แชร์เพื่อรับเครดิต"\n\n✨ แนะนำเพื่อน 1 คน = 10 เครดิตฟรี!'
      });
    }
    
    const stream = await lineService.getMessageContent(event.message.id);
    const imageBuffer = await streamToBuffer(stream);
    
    const command = await getRandomCommand();
    
    const aiResponse = await aiService.processImage(imageBuffer, command.text);
    
    const processingTime = Date.now() - startTime;
    
    await saveInteraction(user, command, event.message.id, aiResponse, processingTime);
    
    await creditService.updateCredit(event.source.userId, -1, 'use', 'ใช้เครดิตในการวิเคราะห์รูปภาพ');
    
    const remainingCredits = await creditService.checkCredit(event.source.userId);
    
    let responseText = aiResponse;
    
    if (remainingCredits <= 3 && remainingCredits > 0) {
      responseText += `\n\n⚠️ เหลือเครดิตอีก ${remainingCredits} เครดิต\n💎 เติมเครดิตหรือแนะนำเพื่อนเพื่อใช้งานต่อได้จากเมนูด้านล่าง`;
    } else if (remainingCredits === 0) {
      responseText += '\n\n⚠️ นี่เป็นเครดิตสุดท้ายของคุณแล้ว\n💎 เติมเครดิตหรือแนะนำเพื่อนเพื่อใช้งานต่อได้จากเมนูด้านล่าง';
    } else {
      responseText += `\n\n💎 เครดิตคงเหลือ: ${remainingCredits} เครดิต`;
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

module.exports = { 
  handleEvent,
  handleFollowWithReferral  // เพิ่มเพื่อใช้ในการทดสอบ
};