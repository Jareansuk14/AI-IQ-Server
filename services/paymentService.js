const PaymentTransaction = require('../models/paymentTransaction');
const User = require('../models/user');
const creditService = require('./creditService');

class PaymentService {
  // แพ็คเกจเครดิตที่มีอยู่
  static packages = {
    '1_credit': { credits: 1, amount: 10 },
    '10_credit': { credits: 10, amount: 100 },
    '20_credit': { credits: 20, amount: 200 },
    '50_credit': { credits: 50, amount: 500 },
    '100_credit': { credits: 100, amount: 1000 }
  };

  // สุ่มเศษทศนิยมที่ไม่ซ้ำใน 10 นาที
  async generateUniqueDecimal() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    // หาเศษทศนิยมที่ใช้แล้วใน 10 นาทีที่ผ่านมา
    const usedDecimals = await PaymentTransaction.find({
      createdAt: { $gte: tenMinutesAgo },
      status: { $in: ['pending', 'completed'] }
    }).distinct('decimalAmount');

    let decimal;
    let attempts = 0;
    const maxAttempts = 100; // ป้องกัน infinite loop

    do {
      // สุ่มเศษทศนิยม 0.01 - 0.99
      decimal = Math.floor(Math.random() * 99) + 1;
      decimal = decimal / 100; // แปลงเป็น 0.01 - 0.99
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error('ไม่สามารถสร้างเศษทศนิยมที่ไม่ซ้ำได้ กรุณาลองใหม่อีกครั้ง');
      }
    } while (usedDecimals.includes(decimal));

    return decimal;
  }

  // สร้างรายการชำระเงิน
  async createPaymentTransaction(lineUserId, packageType) {
    try {
      // ตรวจสอบแพ็คเกจ
      if (!PaymentService.packages[packageType]) {
        throw new Error('แพ็คเกจไม่ถูกต้อง');
      }

      // หาข้อมูลผู้ใช้
      const user = await User.findOne({ lineUserId });
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }

      // ตรวจสอบว่ามีรายการรอชำระเงินที่ยังไม่หมดอายุหรือไม่
      const existingPending = await PaymentTransaction.findOne({
        lineUserId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });

      if (existingPending) {
        throw new Error('คุณมีรายการรอชำระเงินอยู่แล้ว กรุณาชำระเงินหรือรอให้หมดอายุก่อน');
      }

      const packageInfo = PaymentService.packages[packageType];
      const baseAmount = packageInfo.amount;
      const decimalAmount = await this.generateUniqueDecimal();
      const totalAmount = baseAmount + decimalAmount;

      // สร้างรายการชำระเงิน
      const paymentTransaction = new PaymentTransaction({
        user: user._id,
        lineUserId,
        packageType,
        credits: packageInfo.credits,
        baseAmount,
        decimalAmount,
        totalAmount,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // หมดอายุใน 10 นาที
      });

      await paymentTransaction.save();
      return paymentTransaction;
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      throw error;
    }
  }

  // ตรวจสอบการชำระเงินจากข้อมูลอีเมล
  async checkPaymentFromEmail(emailData) {
    try {
      console.log('\n🔍 === STARTING PAYMENT MATCHING ===');
      console.log('📧 Email ID:', emailData.id);
      console.log('📅 Email received at:', emailData.receivedAt);
      
      // ตรวจสอบว่าเป็นเงินเข้าหรือไม่
      if (!emailData.transactionData || emailData.transactionData.transactionType !== 'เงินเข้า') {
        console.log('❌ Not income transaction:', emailData.transactionData?.transactionType || 'No transaction data');
        return null;
      }

      const amount = emailData.transactionData.amount;
      const emailDate = emailData.transactionData.date;
      const emailTime = emailData.transactionData.time;
      const reference = emailData.transactionData.reference;

      console.log('💰 Transaction details from email:');
      console.log(`   Amount: ${amount} บาท`);
      console.log(`   Date: ${emailDate}`);
      console.log(`   Time: ${emailTime}`);
      console.log(`   Reference: ${reference}`);
      console.log(`   Type: ${emailData.transactionData.transactionType}`);

      // แปลงวันที่และเวลาจากอีเมลเป็น Date object
      const transactionDateTime = this.parseEmailDateTime(emailDate, emailTime);
      if (!transactionDateTime) {
        console.log('❌ Cannot parse date/time:', emailDate, emailTime);
        return null;
      }

      console.log('📅 Parsed transaction datetime:', transactionDateTime.toISOString());
      console.log('🌏 Local time:', transactionDateTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));

      // หารายการรอชำระเงินที่ตรงกับจำนวนเงิน
      const pendingPayments = await PaymentTransaction.find({
        totalAmount: amount,
        status: 'pending'
      }).populate('user');

      console.log(`\n🔎 Found ${pendingPayments.length} pending payment(s) with amount ${amount} บาท`);

      if (pendingPayments.length === 0) {
        console.log('❌ No pending payments found with this amount');
        
        // แสดงรายการ pending ทั้งหมดเพื่อ debug
        const allPending = await PaymentTransaction.find({ status: 'pending' });
        console.log('\n📋 All pending payments:');
        allPending.forEach((p, index) => {
          console.log(`   ${index + 1}. Amount: ${p.totalAmount}, Created: ${p.createdAt.toISOString()}, User: ${p.lineUserId}`);
        });
        
        return null;
      }

      for (const [index, payment] of pendingPayments.entries()) {
        console.log(`\n🔍 Checking payment ${index + 1}/${pendingPayments.length}:`);
        console.log(`   Payment ID: ${payment._id}`);
        console.log(`   User: ${payment.lineUserId}`);
        console.log(`   Amount: ${payment.totalAmount} บาท`);
        console.log(`   Created: ${payment.createdAt.toISOString()}`);
        console.log(`   Expires: ${payment.expiresAt.toISOString()}`);
        console.log(`   Package: ${payment.packageType} (${payment.credits} credits)`);

        // ตรวจสอบว่าหมดอายุหรือไม่
        const isExpired = payment.isExpired();
        console.log(`   🕐 Is Expired: ${isExpired ? '❌ YES' : '✅ NO'}`);
        
        if (isExpired) {
          console.log('   ⏰ Payment expired, skipping...');
          continue;
        }

        // ตรวจสอบช่วงเวลา
        const timeDiff = Math.abs(transactionDateTime.getTime() - payment.createdAt.getTime());
        const timeDiffMinutes = timeDiff / (1000 * 60);
        const isWithinTimeWindow = payment.isWithinTimeWindow(transactionDateTime);
        
        console.log(`   📊 Time comparison:`);
        console.log(`      Transaction time: ${transactionDateTime.toISOString()}`);
        console.log(`      Payment created:  ${payment.createdAt.toISOString()}`);
        console.log(`      Time difference:  ${timeDiffMinutes.toFixed(2)} minutes`);
        console.log(`      Within 10min window: ${isWithinTimeWindow ? '✅ YES' : '❌ NO'}`);

        if (isWithinTimeWindow) {
          console.log('✅ PAYMENT MATCH FOUND!');
          console.log('🔄 Updating payment status to completed...');
          
          // อัปเดตสถานะเป็นสำเร็จ
          payment.status = 'completed';
          payment.paidAt = transactionDateTime;
          payment.emailMatchId = emailData.id;
          await payment.save();

          console.log('💳 Adding credits to user...');
          
          // เพิ่มเครดิตให้ผู้ใช้
          await creditService.updateCredit(
            payment.lineUserId, 
            payment.credits, 
            'purchase', 
            `ซื้อเครดิต ${payment.credits} เครดิต (${payment.packageType})`
          );

          console.log('🎉 PAYMENT PROCESSING COMPLETED!');
          console.log(`   User: ${payment.lineUserId}`);
          console.log(`   Amount: ${amount} บาท`);
          console.log(`   Credits: ${payment.credits}`);
          console.log(`   Reference: ${reference}`);
          console.log('=== END PAYMENT MATCHING ===\n');
          
          return payment;
        } else {
          console.log('❌ Time window check failed');
          if (timeDiffMinutes > 10) {
            console.log(`   ⏰ Time difference (${timeDiffMinutes.toFixed(2)} min) exceeds 10 minutes`);
          }
        }
      }

      console.log('❌ No matching payment found');
      console.log('=== END PAYMENT MATCHING ===\n');
      return null;
    } catch (error) {
      console.error('❌ Error checking payment from email:', error);
      console.log('=== END PAYMENT MATCHING (ERROR) ===\n');
      throw error;
    }
  }

  // แปลงวันที่และเวลาจากอีเมลเป็น Date object (เวลาไทย UTC+7)
  parseEmailDateTime(dateStr, timeStr) {
    try {
      console.log(`\n📅 Parsing date/time: "${dateStr}" "${timeStr}"`);
      
      // ตัวอย่าง: dateStr = "22/05/68", timeStr = "09:22"
      if (!dateStr || !timeStr) {
        console.log('❌ Missing date or time string');
        return null;
      }

      // แยกวันที่
      const [day, month, year] = dateStr.split('/');
      if (!day || !month || !year) {
        console.log('❌ Invalid date format, expected DD/MM/YY');
        return null;
      }

      // แยกเวลา
      const [hours, minutes] = timeStr.split(':');
      if (!hours || !minutes) {
        console.log('❌ Invalid time format, expected HH:MM');
        return null;
      }

      console.log(`   Raw parts: day=${day}, month=${month}, year=${year}, hours=${hours}, minutes=${minutes}`);

      // แปลงปี (68 -> 2568 -> 2025)
      let fullYear = parseInt(year);
      if (fullYear < 100) {
        fullYear = fullYear + 2500; // แปลงจาก พ.ศ. เป็นค.ศ.
        if (fullYear > 2500) {
          fullYear = fullYear - 543; // แปลงจาก พ.ศ. เป็น ค.ศ.
        }
      }

      console.log(`   Converted year: ${year} -> ${fullYear}`);

      // สร้าง Date object ในเวลาไทย (UTC+7)
      // เนื่องจากเวลาจากอีเมลเป็นเวลาไทย ต้องลบ 7 ชั่วโมงเพื่อแปลงเป็น UTC
      const localDate = new Date(
        fullYear,
        parseInt(month) - 1, // เดือนใน JavaScript เริ่มจาก 0
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        0
      );

      if (isNaN(localDate.getTime())) {
        console.log('❌ Invalid local date created');
        return null;
      }

      // แปลงจากเวลาไทยเป็น UTC โดยลบ 7 ชั่วโมง
      const utcDate = new Date(localDate.getTime() - (7 * 60 * 60 * 1000));

      console.log(`✅ Local date (Thai time): ${localDate.toISOString()}`);
      console.log(`✅ UTC date for comparison: ${utcDate.toISOString()}`);
      console.log(`   Bangkok time: ${utcDate.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      
      return utcDate;
    } catch (error) {
      console.error('❌ Error parsing email date time:', error);
      return null;
    }
  }

  // ตรวจสอบรายการที่หมดอายุและอัปเดตสถานะ
  async expireOldTransactions() {
    try {
      const result = await PaymentTransaction.updateMany(
        {
          status: 'pending',
          expiresAt: { $lte: new Date() }
        },
        {
          status: 'expired'
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`Expired ${result.modifiedCount} old payment transactions`);
      }

      return result.modifiedCount;
    } catch (error) {
      console.error('Error expiring old transactions:', error);
      throw error;
    }
  }

  // ดึงข้อมูลรายการชำระเงินของผู้ใช้
  async getUserPayments(lineUserId, limit = 10) {
    try {
      const payments = await PaymentTransaction.find({ lineUserId })
        .sort({ createdAt: -1 })
        .limit(limit);

      return payments;
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  }

  // ยกเลิกรายการชำระเงิน
  async cancelPayment(paymentId, lineUserId) {
    try {
      const payment = await PaymentTransaction.findOne({
        _id: paymentId,
        lineUserId,
        status: 'pending'
      });

      if (!payment) {
        throw new Error('ไม่พบรายการชำระเงินหรือไม่สามารถยกเลิกได้');
      }

      payment.status = 'cancelled';
      await payment.save();

      return payment;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();