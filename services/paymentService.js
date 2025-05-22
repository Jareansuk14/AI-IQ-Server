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
      // ตรวจสอบว่าเป็นเงินเข้าหรือไม่
      if (!emailData.transactionData || emailData.transactionData.transactionType !== 'เงินเข้า') {
        return null;
      }

      const amount = emailData.transactionData.amount;
      const emailDate = emailData.transactionData.date;
      const emailTime = emailData.transactionData.time;

      // แปลงวันที่และเวลาจากอีเมลเป็น Date object
      const transactionDateTime = this.parseEmailDateTime(emailDate, emailTime);
      if (!transactionDateTime) {
        console.log('ไม่สามารถแปลงวันที่และเวลาได้:', emailDate, emailTime);
        return null;
      }

      // หารายการรอชำระเงินที่ตรงกับจำนวนเงิน
      const pendingPayments = await PaymentTransaction.find({
        totalAmount: amount,
        status: 'pending'
      }).populate('user');

      for (const payment of pendingPayments) {
        // ตรวจสอบว่าอยู่ในช่วงเวลา 10 นาทีหรือไม่
        if (payment.isWithinTimeWindow(transactionDateTime) && !payment.isExpired()) {
          // อัปเดตสถานะเป็นสำเร็จ
          payment.status = 'completed';
          payment.paidAt = transactionDateTime;
          payment.emailMatchId = emailData.id;
          await payment.save();

          // เพิ่มเครดิตให้ผู้ใช้
          await creditService.updateCredit(
            payment.lineUserId, 
            payment.credits, 
            'purchase', 
            `ซื้อเครดิต ${payment.credits} เครดิต (${payment.packageType})`
          );

          console.log(`Payment completed for user ${payment.lineUserId}, amount: ${amount}, credits: ${payment.credits}`);
          return payment;
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking payment from email:', error);
      throw error;
    }
  }

  // แปลงวันที่และเวลาจากอีเมลเป็น Date object
  parseEmailDateTime(dateStr, timeStr) {
    try {
      // ตัวอย่าง: dateStr = "22/05/68", timeStr = "09:22"
      if (!dateStr || !timeStr) return null;

      // แยกวันที่
      const [day, month, year] = dateStr.split('/');
      if (!day || !month || !year) return null;

      // แยกเวลา
      const [hours, minutes] = timeStr.split(':');
      if (!hours || !minutes) return null;

      // แปลงปี (68 -> 2568 -> 2025)
      let fullYear = parseInt(year);
      if (fullYear < 100) {
        fullYear = fullYear + 2500; // แปลงจาก พ.ศ. เป็นค.ศ.
        if (fullYear > 2500) {
          fullYear = fullYear - 543; // แปลงจาก พ.ศ. เป็น ค.ศ.
        }
      }

      // สร้าง Date object
      const date = new Date(
        fullYear,
        parseInt(month) - 1, // เดือนใน JavaScript เริ่มจาก 0
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        0
      );

      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error('Error parsing email date time:', error);
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