// AI-Server/controllers/lineController.js - โค้ดทั้งหมดพร้อม Referral Cards และ Credit/Support Cards

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
  // Referral Cards
  createReferralShareMessage,
  createReferralInputMessage,
  createReferralSuccessMessage,
  // Welcome & UI Cards
  createWelcomeMessage,
  createCreditStatusMessage,
  createSupportContactMessage
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

// ส่งข้อความต้อนรับสำหรับผู้ใช้ใหม่ - อัปเดตเป็น Flex Card
const sendWelcomeMessage = async (userId, referralCode, profile = null) => {
  try {
    const displayName = profile?.displayName || 'เพื่อน';
    
    // 🎊 ใช้ Welcome Flex Card แทนข้อความธรรมดา
    const welcomeCard = createWelcomeMessage(referralCode, displayName);
    
    await lineService.pushMessage(userId, welcomeCard);
    
    console.log(`✅ Welcome card sent to user: ${userId} (${displayName})`);
    return true;
  } catch (error) {
    console.error('Error sending welcome card:', error);
    
    // 📝 Fallback เป็นข้อความธรรมดาในกรณีที่ Flex Card ไม่ทำงาน
    try {
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `🎊 ยินดีต้อนรับสู่บริการวิเคราะห์รูปภาพ AI!\n\n✨ คุณได้รับ 10 เครดิตเริ่มต้นฟรี\n\n📝 รหัสแนะนำของคุณคือ: ${referralCode}\n\n💡 ใช้รหัสแนะนำจากเพื่อนเพื่อรับเพิ่มอีก 5 เครดิต หรือแนะนำเพื่อนเพื่อรับ 10 เครดิตต่อการแนะนำ 1 คน\n\n📸 ส่งรูปภาพเพื่อให้ AI วิเคราะห์ได้เลย!\n\n💎 เติมเครดิตเพิ่มได้ที่เมนูด้านล่าง`
      });
      console.log(`✅ Fallback welcome text sent to user: ${userId}`);
      return true;
    } catch (fallbackError) {
      console.error('Error sending fallback welcome message:', fallbackError);
      return false;
    }
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

// ฟังก์ชันสำหรับตรวจสอบคำสั่งพิเศษ - อัปเดตพร้อม Credit Card และ Referral Cards
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

    // 💎 อัปเดตการเช็คเครดิตให้ใช้ Flex Card
    if (text === 'เครดิต' || text === 'credit' || text === 'เช็คเครดิต') {
      try {
        const credits = await creditService.checkCredit(userId);
        const profile = await lineService.getUserProfile(userId);
        const displayName = profile?.displayName || 'คุณ';
        
        // 🎨 ใช้ Credit Status Card แทนข้อความธรรมดา
        const creditCard = createCreditStatusMessage(credits, displayName);
        return lineService.replyMessage(event.replyToken, creditCard);
      } catch (error) {
        console.error('Error creating credit status card:', error);
        
        // 📝 Fallback เป็นข้อความธรรมดา
        const credits = await creditService.checkCredit(userId);
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `💎 คุณมีเครดิตคงเหลือ ${credits} เครดิต\n\n🔄 สามารถแนะนำเพื่อนเพื่อรับเครดิตเพิ่มได้โดยกดที่ปุ่ม "แชร์เพื่อรับเครดิต"\n\n💰 หรือเติมเครดิตโดยกดปุ่ม "เติมเครดิต" ด้านล่าง`
        });
      }
    }
    
    // หลังส่วนนี้
    if (text === 'เติมเครดิต' || text === 'topup' || text === 'เติม') {
      const flexMessage = createCreditPackagesMessage();
      return lineService.replyMessage(event.replyToken, flexMessage);
    }

    // 🎧 เพิ่มส่วนนี้
    if (text === 'support' || text === 'ซัพพอร์ต' || text === 'ติดต่อ' || 
        text === 'ติดต่อซัพพอร์ต' || text === 'help' || text === 'ช่วยเหลือ' || 
        text === 'admin' || text === 'แอดมิน' || text === 'customer service' || 
        text === 'cs' || text === 'แจ้งปัญหา' || text === 'ปัญหา') {
      try {
        const supportCard = createSupportContactMessage();
        return lineService.replyMessage(event.replyToken, supportCard);
      } catch (error) {
        console.error('Error creating support contact card:', error);
        
        // 📝 Fallback เป็นข้อความธรรมดา
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '🎧 ติดต่อทีมซัพพอร์ต\n\n💬 แอดเพื่อน: @Lovebest14\n⏰ เวลาทำการ: 09:00-18:00 น.\n📅 จันทร์-เสาร์\n⚡ ตอบกลับเร็วภายใน 1 ชั่วโมง\n\n🔧 ช่วยเหลือ:\n• ปัญหาการใช้งานบอท\n• การชำระเงินและเครดิต\n• ข้อสงสัยเกี่ยวกับ AI-Auto\n• การแนะนำและใช้รหัส'
        });
      }
    }

    // ก่อนส่วนนี้
    if (text === 'ai-auto' || text === 'aiauto' || text === 'forex' || text === 'เทรด') {
      const forexMessage = createForexPairsMessage();
      return lineService.replyMessage(event.replyToken, forexMessage);
    }
    
    // 🆕 อัปเดตการจัดการรหัสแนะนำให้ใช้การ์ด
    if (text === 'รหัสแนะนำ' || text === 'referral' || text === 'แชร์' || text === 'share') {
      try {
        // ดึงข้อมูลสถิติการแนะนำ
        const referralStats = await creditService.getReferralSummary(userId);
        
        // สร้างและส่งการ์ด
        const referralCard = createReferralShareMessage(
          referralStats.referralCode, 
          referralStats.totalReferred, 
          referralStats.totalEarned
        );
        return lineService.replyMessage(event.replyToken, referralCard);
      } catch (error) {
        console.error('Error creating referral share card:', error);
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการแสดงข้อมูลการแนะนำ'
        });
      }
    }
    
    // 🆕 เพิ่มคำสั่งใหม่สำหรับใช้รหัสแนะนำ
    if (text === 'ใช้รหัส' || text === 'กรอกรหัส' || text === 'รหัสเพื่อน' || text === 'ป้อนรหัส') {
      const inputCard = createReferralInputMessage();
      return lineService.replyMessage(event.replyToken, inputCard);
    }
    
    // การใช้รหัสแนะนำ - อัปเดตให้ใช้การ์ดตอบกลับ
    if (text.startsWith('code:') || text.startsWith('รหัส:')) {
      const referralCode = text.split(':')[1].trim();
      
      if (!referralCode) {
        return lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ รูปแบบรหัสไม่ถูกต้อง\nกรุณาระบุในรูปแบบ "CODE:ABCDEF" หรือ "รหัส:ABCDEF"'
        });
      }
      
      try {
        // ตรวจสอบความถูกต้องก่อน
        const validation = await creditService.validateReferralCode(userId, referralCode);
        if (!validation.valid) {
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: `❌ ${validation.reason}`
          });
        }
        
        const user = await User.findOne({ lineUserId: userId });
        const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
        
        const result = await creditService.applyReferralCode(userId, referralCode.toUpperCase());
        
        // 🆕 ส่งการ์ดแจ้งเตือนสำเร็จ
        const successCard = createReferralSuccessMessage(
          {
            totalCredits: referrer.credits + 10, // เครดิตหลังได้รับรางวัล
            totalReferred: await User.countDocuments({ referredBy: referrer.referralCode }) + 1
          },
          {
            name: user.displayName
          }
        );
        
        // ส่งข้อความสำเร็จให้ผู้ใช้รหัส
        await lineService.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ ใช้รหัสแนะนำสำเร็จ!\n🎁 คุณได้รับเพิ่ม 5 เครดิต\n💎 เครดิตคงเหลือ: ${result.credits} เครดิต\n\n🎉 ขอบคุณที่ใช้รหัสแนะนำ!`
        });
        
        // ส่งการ์ดแจ้งเตือนให้ผู้แนะนำ
        await lineService.pushMessage(referrer.lineUserId, successCard);
        
        return true;
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

// ฟังก์ชันจัดการ Postback Events - อัปเดตพร้อม Support และ Credit Menu
const handlePostbackEvent = async (event) => {
  try {
    const data = event.postback.data;
    const params = new URLSearchParams(data);
    const action = params.get('action');
    const userId = event.source.userId;
    
    console.log('Handling postback event:', action, data);
    
    if (resultTrackingService.isUserBlocked(userId) && 
        !['continue_trading', 'stop_trading', 'view_referral_share', 'contact_support', 'buy_credit_menu'].includes(action)) {
      await resultTrackingService.handleBlockedUserMessage(userId);
      return;
    }
    
    switch (action) {
      // 🎧 Support Contact
      case 'contact_support':
        try {
          const supportCard = createSupportContactMessage();
          return lineService.replyMessage(event.replyToken, supportCard);
        } catch (error) {
          console.error('Error showing support contact:', error);
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '🎧 ติดต่อทีมซัพพอร์ต\n\n💬 แอดเพื่อน: @support123\n⏰ เวลาทำการ: 09:00-18:00 น.\n📅 จันทร์-เสาร์'
          });
        }

      // 💰 Credit Menu (แยกจาก buy_credit เพื่อความชัดเจน)
      case 'buy_credit_menu':
        try {
          const flexMessage = createCreditPackagesMessage();
          return lineService.replyMessage(event.replyToken, flexMessage);
        } catch (error) {
          console.error('Error showing credit packages:', error);
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '💎 เติมเครดิต\n\n📦 แพ็คเกจ:\n• 1 เครดิต = 10 บาท\n• 10 เครดิต = 100 บาท\n• 20 เครดิต = 200 บาท\n• 50 เครดิต = 500 บาท\n• 100 เครดิต = 1,000 บาท'
          });
        }

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

      // การวิเคราะห์ Forex ด้วย Technical Analysis
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

          // ใช้ Technical Analysis
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
          
          // สร้างข้อความแบบใหม่ด้วย Technical Analysis
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
          await lineService.replyMessage(replyToken, [
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
        
      // 🆕 เคสใหม่สำหรับ Referral System
      case 'view_referral_share':
        try {
          const referralStats = await creditService.getReferralSummary(userId);
          const referralCard = createReferralShareMessage(
            referralStats.referralCode, 
            referralStats.totalReferred, 
            referralStats.totalEarned
          );
          return lineService.replyMessage(event.replyToken, referralCard);
        } catch (error) {
          console.error('Error showing referral share:', error);
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ เกิดข้อผิดพลาดในการแสดงข้อมูลการแนะนำ'
          });
        }
        
      case 'share_to_get_referral':
        try {
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '📢 วิธีขอรหัสแนะนำจากเพื่อน:\n\n1️⃣ ส่งข้อความนี้ให้เพื่อน:\n"ขอรหัสแนะนำ AI Bot หน่อย 🙏"\n\n2️⃣ ให้เพื่อนพิมพ์ "แชร์" ใน Bot นี้\n\n3️⃣ เพื่อนจะได้รหัส 6 ตัวอักษร\n\n4️⃣ เอารหัสมาพิมพ์ในรูปแบบ:\n"รหัส:ABCDEF"\n\n🎁 คุณจะได้ 5 เครดิต เพื่อนได้ 10 เครดิต!'
          });
        } catch (error) {
          console.error('Error showing share instruction:', error);
          return lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ เกิดข้อผิดพลาด'
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

// ฟังก์ชันจัดการเหตุการณ์ follow (เพิ่มเพื่อน) - อัปเดตให้ส่ง profile
const handleFollowEvent = async (event) => {
  try {
    console.log('Handling follow event:', event);
    
    const profile = await lineService.getUserProfile(event.source.userId);
    
    const { user, isNewUser } = await saveOrUpdateUser(event.source.userId, profile);
    
    // 🆕 ส่ง profile ไปด้วยเพื่อให้ Welcome Card แสดงชื่อได้
    await sendWelcomeMessage(event.source.userId, user.referralCode, profile);
    
    console.log(`Follow event handled for user: ${profile?.displayName || event.source.userId}`);
    return true;
  } catch (error) {
    console.error('Error handling follow event:', error);
    return false;
  }
};

// ฟังก์ชันหลักสำหรับการจัดการข้อความ
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
      text: '📸 กรุณาส่งรูปภาพเพื่อให้ฉันวิเคราะห์\n\n💡 หรือใช้คำสั่งต่างๆ เช่น:\n• "เครดิต" - ดูเครดิตคงเหลือ\n• "เติมเครดิต" - ซื้อเครดิตเพิ่ม\n• "แชร์" - ดูรหัสแนะนำเพื่อน\n• "AI-Auto" - วิเคราะห์คู่เงิน Forex'
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

module.exports = { handleEvent };