const express = require('express');
const router = express.Router();
const PaymentTransaction = require('../models/paymentTransaction');
const qrCodeService = require('../services/qrCodeService');
const axios = require('axios'); // เปลี่ยนจาก node-fetch เป็น axios
require('dotenv').config();

// แสดงหน้า QR Code สำหรับการชำระเงิน
router.get('/qr/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // ค้นหารายการชำระเงิน
    const payment = await PaymentTransaction.findById(paymentId).populate('user');
    
    if (!payment) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ไม่พบรายการชำระเงิน</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                   text-align: center; padding: 50px; background-color: #f5f5f5; }
            .error { color: #e74c3c; font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="error">❌ ไม่พบรายการชำระเงิน</div>
          <p>รายการนี้อาจถูกลบหรือไม่มีอยู่ในระบบ</p>
        </body>
        </html>
      `);
    }
    
    // ตรวจสอบสถานะและอายุ
    if (payment.status !== 'pending') {
      let statusText = '';
      let statusColor = '';
      
      switch (payment.status) {
        case 'completed':
          statusText = '✅ ชำระเงินเรียบร้อยแล้ว';
          statusColor = '#27ae60';
          break;
        case 'expired':
          statusText = '⏰ หมดอายุแล้ว';
          statusColor = '#e74c3c';
          break;
        case 'cancelled':
          statusText = '❌ ยกเลิกแล้ว';
          statusColor = '#95a5a6';
          break;
        default:
          statusText = '❓ สถานะไม่ชัดเจน';
          statusColor = '#f39c12';
      }
      
      return res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>สถานะการชำระเงิน</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                   text-align: center; padding: 50px; background-color: #f5f5f5; }
            .status { color: ${statusColor}; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .info { background: white; padding: 20px; border-radius: 10px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="info">
            <div class="status">${statusText}</div>
            <p>จำนวนเงิน: ${payment.totalAmount.toFixed(2)} บาท</p>
            <p>เครดิต: ${payment.credits} เครดิต</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // ตรวจสอบว่าหมดอายุหรือไม่
    if (payment.isExpired()) {
      // อัปเดตสถานะเป็นหมดอายุ
      payment.status = 'expired';
      await payment.save();
      
      return res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>หมดอายุแล้ว</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                   text-align: center; padding: 50px; background-color: #f5f5f5; }
            .expired { color: #e74c3c; font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="expired">⏰ รายการนี้หมดอายุแล้ว</div>
          <p>กรุณาสร้างรายการใหม่เพื่อเติมเครดิต</p>
        </body>
        </html>
      `);
    }
    
    // สร้าง QR Code
    const promptPayPhone = process.env.PROMPTPAY_PHONE || '0812345678';
    const qrResult = await qrCodeService.generatePromptPayQR(payment.totalAmount, promptPayPhone);
    
    // คำนวณเวลาที่เหลือ
    const timeLeft = payment.expiresAt.getTime() - Date.now();
    const minutesLeft = Math.floor(timeLeft / 60000);
    const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
    
    // สร้างหน้าเว็บแสดง QR Code
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ชำระเงินด้วย QR Code</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 400px;
            width: 100%;
            overflow: hidden;
          }
          .header {
            background: linear-gradient(45deg, #42A5F5, #1E88E5);
            color: white;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
          }
          .content {
            padding: 30px 20px;
            text-align: center;
          }
          .qr-container {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
            border: 3px dashed #42A5F5;
          }
          .qr-code {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
          }
          .amount {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin: 20px 0;
          }
          .package-info {
            background: #e8f4fd;
            border-radius: 10px;
            padding: 15px;
            margin: 15px 0;
          }
          .timer {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 10px;
            margin: 15px 0;
            font-weight: bold;
            color: #856404;
          }
          .instructions {
            text-align: left;
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin: 15px 0;
          }
          .instructions h3 {
            margin-top: 0;
            color: #495057;
          }
          .instructions ol {
            padding-left: 20px;
          }
          .instructions li {
            margin: 8px 0;
            color: #6c757d;
          }
          .btn {
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            cursor: pointer;
            margin: 5px;
            transition: all 0.3s;
            font-weight: bold;
          }
          .btn-primary {
            background: #42A5F5;
            color: white;
          }
          .btn-primary:hover:not(:disabled) {
            background: #1E88E5;
            transform: translateY(-1px);
          }
          .btn-success {
            background: #4CAF50;
            color: white;
          }
          .btn-warning {
            background: #ff9800;
            color: white;
          }
          .btn:disabled {
            background: #cccccc;
            color: #666666;
            cursor: not-allowed;
            transform: none;
          }
          .status-message {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-weight: bold;
            display: none;
          }
          .status-success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
          }
          .status-error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
          }
          .status-info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
          }
          .button-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 20px;
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #42A5F5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @media (max-width: 480px) {
            .container {
              margin: 10px;
            }
            .amount {
              font-size: 28px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 ชำระเงินด้วย QR Code</h1>
          </div>
          
          <div class="content">
            <div class="package-info">
              <strong>📦 แพ็คเกจ:</strong> ${payment.credits} เครดิต
            </div>
            
            <div class="amount">
              💰 ${payment.totalAmount.toFixed(2)} บาท
            </div>
            
            <div class="timer" id="timer">
              ⏰ เหลือเวลา: <span id="time-left">${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}</span>
            </div>
            
            <div class="status-message" id="status-message">
              <!-- ข้อความสถานะจะแสดงที่นี่ -->
            </div>
            
            <div class="qr-container">
              <img src="${qrResult.qrCodeDataURL}" alt="QR Code" class="qr-code" />
            </div>
            
            <div class="instructions">
              <h3>📱 วิธีการชำระเงิน:</h3>
              <ol>
                <li>เปิดแอปธนาคารของคุณ</li>
                <li>เลือก "สแกน QR" หรือ "พร้อมเพย์"</li>
                <li>สแกน QR Code ด้านบน</li>
                <li>ตรวจสอบจำนวนเงิน <strong>${payment.totalAmount.toFixed(2)} บาท</strong></li>
                <li>ยืนยันการโอนเงิน</li>
                <li>กดปุ่ม "ตรวจสอบการชำระเงิน" ด้านล่าง</li>
              </ol>
            </div>
            
            <div class="button-container">
              <button class="btn btn-success" onclick="checkPayment()" id="check-btn">
                🔍 ตรวจสอบการชำระเงิน
              </button>
              
              <button class="btn btn-primary" onclick="window.location.reload()">
                🔄 รีเฟรชหน้า
              </button>
            </div>
          </div>
        </div>
        
        <script>
          let canCheck = true;
          let checkInterval;
          
          // ตัวจับเวลาแบบเรียลไทม์
          function updateTimer() {
            const expiresAt = new Date('${payment.expiresAt.toISOString()}');
            const now = new Date();
            const timeLeft = expiresAt.getTime() - now.getTime();
            
            if (timeLeft <= 0) {
              document.getElementById('time-left').textContent = 'หมดอายุแล้ว';
              document.getElementById('timer').style.backgroundColor = '#f8d7da';
              document.getElementById('timer').style.color = '#721c24';
              document.getElementById('check-btn').disabled = true;
              setTimeout(() => {
                window.location.reload();
              }, 2000);
              return;
            }
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            document.getElementById('time-left').textContent = 
              minutes + ':' + seconds.toString().padStart(2, '0');
          }
          
          // แสดงข้อความสถานะ
          function showStatus(message, type) {
            const statusDiv = document.getElementById('status-message');
            statusDiv.textContent = message;
            statusDiv.className = 'status-message status-' + type;
            statusDiv.style.display = 'block';
          }
          
          // ซ่อนข้อความสถานะ
          function hideStatus() {
            document.getElementById('status-message').style.display = 'none';
          }
          
          // ตรวจสอบการชำระเงิน
          async function checkPayment() {
            if (!canCheck) {
              showStatus('กรุณารออีก ' + Math.ceil((nextCheckTime - Date.now()) / 1000) + ' วินาที', 'warning');
              return;
            }
            
            const checkBtn = document.getElementById('check-btn');
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<span class="loading"></span>กำลังตรวจสอบ...';
            
            try {
              // เรียก API ตรวจสอบการชำระเงิน
              const response = await fetch('/api/payment/manual-check/${payment._id}', {
                method: 'POST'
              });
              
              const result = await response.json();
              
              if (result.success) {
                if (result.paymentCompleted) {
                  // ชำระเงินสำเร็จ
                  showStatus('🎉 ชำระเงินสำเร็จ! เครดิตได้ถูกเพิ่มแล้ว', 'success');
                  checkBtn.innerHTML = '✅ ชำระเงินสำเร็จ';
                  checkBtn.disabled = true;
                  
                  // รีไดเรกต์หลัง 3 วินาที
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                } else {
                  // ยังไม่พบการชำระเงิน
                  showStatus('ยังไม่พบการชำระเงิน กรุณาลองอีกครั้งใน 30 วินาที', 'info');
                  
                  // ปิดการใช้งานปุ่มเป็นเวลา 30 วินาที
                  canCheck = false;
                  nextCheckTime = Date.now() + 30000;
                  
                  let countdown = 30;
                  checkBtn.innerHTML = '⏰ รอ ' + countdown + ' วินาที';
                  
                  const countdownInterval = setInterval(() => {
                    countdown--;
                    if (countdown > 0) {
                      checkBtn.innerHTML = '⏰ รอ ' + countdown + ' วินาที';
                    } else {
                      clearInterval(countdownInterval);
                      canCheck = true;
                      checkBtn.disabled = false;
                      checkBtn.innerHTML = '🔍 ตรวจสอบการชำระเงิน';
                      hideStatus();
                    }
                  }, 1000);
                }
              } else {
                showStatus('เกิดข้อผิดพลาด: ' + result.message, 'error');
                checkBtn.disabled = false;
                checkBtn.innerHTML = '🔍 ตรวจสอบการชำระเงิน';
              }
            } catch (error) {
              console.error('Error checking payment:', error);
              showStatus('เกิดข้อผิดพลาดในการตรวจสอบ กรุณาลองใหม่', 'error');
              checkBtn.disabled = false;
              checkBtn.innerHTML = '🔍 ตรวจสอบการชำระเงิน';
            }
          }
          
          // อัปเดตทุกวินาที
          setInterval(updateTimer, 1000);
          
          // เก็บเวลาที่สามารถเช็คครั้งถัดไปได้
          let nextCheckTime = 0;
        </script>
      </body>
      </html>
    `;
    
    res.send(htmlContent);
  } catch (error) {
    console.error('Error displaying QR Code:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>เกิดข้อผิดพลาด</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                 text-align: center; padding: 50px; background-color: #f5f5f5; }
          .error { color: #e74c3c; font-size: 24px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="error">❌ เกิดข้อผิดพลาด</div>
        <p>ไม่สามารถแสดง QR Code ได้ กรุณาลองใหม่อีกครั้ง</p>
      </body>
      </html>
    `);
  }
});

// API สำหรับตรวจสอบสถานะการชำระเงิน
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await PaymentTransaction.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'ไม่พบรายการชำระเงิน' });
    }
    
    res.json({
      status: payment.status,
      amount: payment.totalAmount,
      credits: payment.credits,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ' });
  }
});

module.exports = router;
router.post('/manual-check/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // ตรวจสอบ payment ที่มีอยู่
    const payment = await PaymentTransaction.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบรายการชำระเงิน' 
      });
    }
    
    // ตรวจสอบว่าชำระเงินแล้วหรือไม่
    if (payment.status === 'completed') {
      return res.json({ 
        success: true, 
        paymentCompleted: true,
        message: 'ชำระเงินเรียบร้อยแล้ว',
        credits: payment.credits
      });
    }
    
    // ตรวจสอบว่าหมดอายุหรือไม่
    if (payment.isExpired()) {
      payment.status = 'expired';
      await payment.save();
      
      return res.json({ 
        success: false, 
        message: 'รายการชำระเงินหมดอายุแล้ว' 
      });
    }
    
    console.log(`🔍 Manual payment check requested for payment: ${paymentId}`);
    console.log(`   Amount: ${payment.totalAmount}, User: ${payment.lineUserId}`);
    
    // ส่งคำขอไปยัง Gmail Integration server เพื่อตรวจสอบ email ใหม่
    try {
      const gmailResponse = await axios.post('https://gmail-mongodb-integration.onrender.com/check-emails', {}, {
        timeout: 10000, // 10 วินาที timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (gmailResponse.status === 200) {
        console.log('✅ Successfully triggered Gmail check');
      } else {
        console.log('⚠️ Gmail check request failed, but continuing with local check');
      }
    } catch (error) {
      console.log('⚠️ Error calling Gmail integration:', error.message);
      // ไม่ return error เพราะยังสามารถเช็คจาก local database ได้
    }
    
    // รอสักครู่เพื่อให้ Gmail integration ประมวลผล
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // ตรวจสอบการชำระเงินจาก local database
    const paymentService = require('../services/paymentService');
    
    // ดึงอีเมลล่าสุดที่ยังไม่ได้ประมวลผล
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    
    const recentEmails = await db.collection('emails').find({
      receivedAt: { $gte: oneMinuteAgo },
      'transactionData.transactionType': 'เงินเข้า',
      'transactionData.amount': payment.totalAmount
    }).sort({ receivedAt: -1 }).toArray();
    
    await client.close();
    
    console.log(`📧 Found ${recentEmails.length} recent emails with amount ${payment.totalAmount}`);
    
    // ตรวจสอบแต่ละอีเมล
    for (const email of recentEmails) {
      try {
        const matchedPayment = await paymentService.checkPaymentFromEmail(email);
        
        if (matchedPayment && matchedPayment._id.toString() === paymentId) {
          console.log('🎉 Payment matched in manual check!');
          
          // ส่งการแจ้งเตือนใน LINE
          const lineService = require('../services/lineService');
          const creditService = require('../services/creditService');
          
          // ดูเครดิตปัจจุบัน
          const currentCredits = await creditService.checkCredit(matchedPayment.lineUserId);
          
          const successMessage = {
            type: 'text',
            text: `🎉 ชำระเงินสำเร็จ!\n\n💰 จำนวนเงิน: ${matchedPayment.totalAmount.toFixed(2)} บาท\n💎 ได้รับเครดิต: ${matchedPayment.credits} เครดิต\n📊 เครดิตรวมทั้งหมด: ${currentCredits} เครดิต\n\nขอบคุณที่ใช้บริการ! ✨`
          };
          
          await lineService.pushMessage(matchedPayment.lineUserId, successMessage);
          
          return res.json({ 
            success: true, 
            paymentCompleted: true,
            message: 'ชำระเงินสำเร็จ',
            credits: matchedPayment.credits,
            totalCredits: currentCredits
          });
        }
      } catch (error) {
        console.error('Error checking email for payment:', error);
      }
    }
    
    // ยังไม่พบการชำระเงิน
    console.log('❌ No payment found in manual check');
    
    return res.json({ 
      success: true, 
      paymentCompleted: false,
      message: 'ยังไม่พบการชำระเงิน กรุณาลองอีกครั้งในภายหลัง'
    });
    
  } catch (error) {
    console.error('Error in manual payment check:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ: ' + error.message 
    });
  }
});