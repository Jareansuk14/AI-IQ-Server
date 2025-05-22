const { MongoClient } = require('mongodb');
const paymentService = require('./paymentService');
const lineService = require('./lineService');
require('dotenv').config();

class PaymentChecker {
  constructor() {
    this.mongoClient = null;
    this.isChecking = false;
  }

  // เชื่อมต่อกับ MongoDB Gmail Integration
  async connectToEmailDB() {
    try {
      if (this.mongoClient) return this.mongoClient.db();
      
      this.mongoClient = new MongoClient(process.env.MONGODB_URI);
      await this.mongoClient.connect();
      console.log('PaymentChecker: Connected to MongoDB for email checking');
      return this.mongoClient.db();
    } catch (error) {
      console.error('PaymentChecker: Error connecting to MongoDB:', error);
      throw error;
    }
  }

  // ตรวจสอบอีเมลใหม่และจับคู่กับการชำระเงิน
  async checkNewEmails() {
    if (this.isChecking) {
      console.log('PaymentChecker: Already checking emails, skipping...');
      return;
    }

    this.isChecking = true;
    console.log('PaymentChecker: Starting email check for payments...');
    
    try {
      const db = await this.connectToEmailDB();
      const emailCollection = db.collection('emails');
      
      // หาอีเมลที่ยังไม่ได้ประมวลผลสำหรับการชำระเงิน
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const unprocessedEmails = await emailCollection.find({
        receivedAt: { $gte: fiveMinutesAgo },
        paymentProcessed: { $ne: true }, // ยังไม่ได้ประมวลผลสำหรับการชำระเงิน
        'transactionData.transactionType': 'เงินเข้า',
        'transactionData.amount': { $exists: true }
      }).sort({ receivedAt: -1 }).toArray();

      console.log(`PaymentChecker: Found ${unprocessedEmails.length} unprocessed emails`);

      let processedCount = 0;
      
      for (const email of unprocessedEmails) {
        try {
          // ตรวจสอบและจับคู่การชำระเงิน
          const matchedPayment = await paymentService.checkPaymentFromEmail(email);
          
          if (matchedPayment) {
            console.log(`PaymentChecker: Payment matched! User: ${matchedPayment.lineUserId}, Amount: ${matchedPayment.totalAmount}, Credits: ${matchedPayment.credits}`);
            
            // ส่งการแจ้งเตือนให้ผู้ใช้
            await this.notifyPaymentSuccess(matchedPayment);
            
            processedCount++;
          }
          
          // อัปเดตสถานะว่าประมวลผลแล้ว
          await emailCollection.updateOne(
            { _id: email._id },
            { 
              $set: { 
                paymentProcessed: true,
                paymentProcessedAt: new Date()
              }
            }
          );
          
        } catch (error) {
          console.error(`PaymentChecker: Error processing email ${email._id}:`, error);
          
          // อัปเดตสถานะว่าเกิดข้อผิดพลาด
          await emailCollection.updateOne(
            { _id: email._id },
            { 
              $set: { 
                paymentProcessed: true,
                paymentProcessError: error.message,
                paymentProcessedAt: new Date()
              }
            }
          );
        }
      }

      // ตรวจสอบและหมดอายุรายการที่เก่า
      await paymentService.expireOldTransactions();

      console.log(`PaymentChecker: Processed ${processedCount} payments from ${unprocessedEmails.length} emails`);
      
    } catch (error) {
      console.error('PaymentChecker: Error in checkNewEmails:', error);
    } finally {
      this.isChecking = false;
    }
  }

  // ส่งการแจ้งเตือนเมื่อชำระเงินสำเร็จ
  async notifyPaymentSuccess(paymentTransaction) {
    try {
      const packageNames = {
        '1_credit': '1 เครดิต',
        '10_credit': '10 เครดิต',
        '20_credit': '20 เครดิต',
        '50_credit': '50 เครดิต',
        '100_credit': '100 เครดิต'
      };

      const message = {
        type: 'text',
        text: `🎉 ชำระเงินสำเร็จ!\n\n💰 จำนวนเงิน: ${paymentTransaction.totalAmount.toFixed(2)} บาท\n💎 ได้รับเครดิต: ${paymentTransaction.credits} เครดิต\n📦 แพ็คเกจ: ${packageNames[paymentTransaction.packageType]}\n\nเครดิตได้ถูกเพิ่มเข้าบัญชีของคุณแล้ว ขอบคุณที่ใช้บริการ! ✨`
      };

      await lineService.pushMessage(paymentTransaction.lineUserId, message);
      console.log(`PaymentChecker: Notification sent to user ${paymentTransaction.lineUserId}`);
      
    } catch (error) {
      console.error('PaymentChecker: Error sending payment notification:', error);
    }
  }

  // เริ่มต้นระบบตรวจสอบอัตโนมัติ
  startAutoCheck(intervalMinutes = 2) {
    console.log(`PaymentChecker: Starting auto-check every ${intervalMinutes} minutes`);
    
    // ตรวจสอบทันที
    this.checkNewEmails();
    
    // ตั้งค่าให้ตรวจสอบทุกๆ X นาที
    setInterval(() => {
      this.checkNewEmails();
    }, intervalMinutes * 60 * 1000);
  }

  // หยุดการตรวจสอบและปิดการเชื่อมต่อ
  async stop() {
    try {
      if (this.mongoClient) {
        await this.mongoClient.close();
        this.mongoClient = null;
        console.log('PaymentChecker: MongoDB connection closed');
      }
    } catch (error) {
      console.error('PaymentChecker: Error closing MongoDB connection:', error);
    }
  }

  // ตรวจสอบการชำระเงินแบบ manual (สำหรับ testing)
  async manualCheck() {
    console.log('PaymentChecker: Starting manual check...');
    await this.checkNewEmails();
    console.log('PaymentChecker: Manual check completed');
  }

  // ดูสถิติการทำงาน
  async getCheckStats() {
    try {
      const db = await this.connectToEmailDB();
      const emailCollection = db.collection('emails');
      
      const stats = {
        totalEmails: await emailCollection.countDocuments(),
        processedEmails: await emailCollection.countDocuments({ paymentProcessed: true }),
        errorEmails: await emailCollection.countDocuments({ paymentProcessError: { $exists: true } }),
        recentEmails: await emailCollection.countDocuments({ 
          receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
        })
      };
      
      return stats;
    } catch (error) {
      console.error('PaymentChecker: Error getting stats:', error);
      return null;
    }
  }
}

module.exports = new PaymentChecker();