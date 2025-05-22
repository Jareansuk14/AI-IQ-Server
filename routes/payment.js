const express = require('express');
const router = express.Router();
const PaymentTransaction = require('../models/paymentTransaction');
const qrCodeService = require('../services/qrCodeService');
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
    const promptPayPhone = process.env.PROMPTPAY_PHONE || '0123456789';
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
          .refresh-btn {
            background: #42A5F5;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 15px;
            transition: background-color 0.3s;
          }
          .refresh-btn:hover {
            background: #1E88E5;
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
                <li>รอการอัปเดตเครดิตใน LINE (1-3 นาที)</li>
              </ol>
            </div>
            
            <button class="refresh-btn" onclick="window.location.reload()">
              🔄 รีเฟรชหน้า
            </button>
          </div>
        </div>
        
        <script>
          // ตัวจับเวลาแบบเรียลไทม์
          function updateTimer() {
            const expiresAt = new Date('${payment.expiresAt.toISOString()}');
            const now = new Date();
            const timeLeft = expiresAt.getTime() - now.getTime();
            
            if (timeLeft <= 0) {
              document.getElementById('time-left').textContent = 'หมดอายุแล้ว';
              document.getElementById('timer').style.backgroundColor = '#f8d7da';
              document.getElementById('timer').style.color = '#721c24';
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
          
          // อัปเดตทุกวินาที
          setInterval(updateTimer, 1000);
          
          // ตรวจสอบสถานะการชำระเงินทุก 30 วินาที
          setInterval(() => {
            fetch('/api/payment/status/${paymentId}')
              .then(response => response.json())
              .then(data => {
                if (data.status === 'completed') {
                  alert('🎉 ชำระเงินสำเร็จ! เครดิตได้ถูกเพิ่มในบัญชีของคุณแล้ว');
                  window.location.reload();
                }
              })
              .catch(error => {
                console.log('Error checking payment status:', error);
              });
          }, 30000);
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