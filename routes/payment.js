const express = require('express');
const router = express.Router();
const PaymentTransaction = require('../models/paymentTransaction');
const qrCodeService = require('../services/qrCodeService');
const axios = require('axios');
require('dotenv').config();

// แสดงหน้า QR Code สำหรับการชำระเงิน (Dark Theme)
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
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #141414 0%, #1f1f1f 100%);
              color: #fff;
              min-height: 100vh;
            }
            .error { 
              color: #ff4d4f; 
              font-size: 24px; 
              font-weight: bold;
              text-shadow: 0 0 10px rgba(255, 77, 79, 0.3);
            }
            .container {
              background: rgba(31, 31, 31, 0.8);
              border-radius: 15px;
              padding: 40px;
              border: 1px solid #303030;
              max-width: 400px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌ ไม่พบรายการชำระเงิน</div>
            <p style="color: #bfbfbf;">รายการนี้อาจถูกลบหรือไม่มีอยู่ในระบบ</p>
          </div>
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
          statusColor = '#49aa19';
          break;
        case 'expired':
          statusText = '⏰ หมดอายุแล้ว';
          statusColor = '#ff4d4f';
          break;
        case 'cancelled':
          statusText = '❌ ยกเลิกแล้ว';
          statusColor = '#8c8c8c';
          break;
        default:
          statusText = '❓ สถานะไม่ชัดเจน';
          statusColor = '#d89614';
      }
      
      return res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>สถานะการชำระเงิน</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #141414 0%, #1f1f1f 100%);
              color: #fff;
              min-height: 100vh;
            }
            .status { 
              color: ${statusColor}; 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 20px;
              text-shadow: 0 0 10px ${statusColor}40;
            }
            .info { 
              background: rgba(31, 31, 31, 0.8); 
              padding: 30px; 
              border-radius: 15px; 
              border: 1px solid #303030;
              max-width: 400px; 
              margin: 0 auto;
            }
            .amount { color: #177ddc; font-weight: bold; }
            .credits { color: #49aa19; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="info">
            <div class="status">${statusText}</div>
            <p>จำนวนเงิน: <span class="amount">${payment.totalAmount.toFixed(2)} บาท</span></p>
            <p>เครดิต: <span class="credits">${payment.credits} เครดิต</span></p>
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
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #141414 0%, #1f1f1f 100%);
              color: #fff;
              min-height: 100vh;
            }
            .expired { 
              color: #ff4d4f; 
              font-size: 24px; 
              font-weight: bold;
              text-shadow: 0 0 10px rgba(255, 77, 79, 0.3);
            }
            .container {
              background: rgba(31, 31, 31, 0.8);
              border-radius: 15px;
              padding: 40px;
              border: 1px solid #303030;
              max-width: 400px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="expired">⏰ รายการนี้หมดอายุแล้ว</div>
            <p style="color: #bfbfbf;">กรุณาสร้างรายการใหม่เพื่อเติมเครดิต</p>
          </div>
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
    
    // สร้างหน้าเว็บแสดง QR Code (Dark Theme)
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>💳 ชำระเงินด้วย QR Code AI</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #141414 0%, #1f1f1f 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
          }
          .container {
            background: rgba(31, 31, 31, 0.95);
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(23, 125, 220, 0.1);
            max-width: 420px;
            width: 100%;
            overflow: hidden;
            border: 1px solid #303030;
          }
          .header {
            background: linear-gradient(45deg, #177ddc, #1890ff);
            color: white;
            padding: 25px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transform: translateX(-100%);
            animation: shimmer 2s infinite;
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: bold;
          }
          .header .subtitle {
            margin-top: 8px;
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 30px 25px;
            text-align: center;
          }
          .qr-container {
            background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
            border-radius: 20px;
            padding: 25px;
            margin: 25px 0;
            border: 2px solid #177ddc;
            box-shadow: 0 0 20px rgba(23, 125, 220, 0.2);
            position: relative;
          }
          .qr-container::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #177ddc, #1890ff, #177ddc);
            border-radius: 20px;
            z-index: -1;
            animation: border-glow 3s infinite;
          }
          @keyframes border-glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .qr-code {
            max-width: 100%;
            height: auto;
            border-radius: 15px;
            background: white;
            padding: 10px;
          }
          .amount {
            font-size: 36px;
            font-weight: bold;
            color: #177ddc;
            margin: 25px 0;
            text-shadow: 0 0 10px rgba(23, 125, 220, 0.3);
          }
          .package-info {
            background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid #303030;
          }
          .package-info strong {
            color: #49aa19;
          }
          .timer {
            background: linear-gradient(145deg, #2b2611, #1e1a08);
            border: 1px solid #d89614;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            font-weight: bold;
            color: #d89614;
            box-shadow: 0 0 10px rgba(216, 150, 20, 0.2);
          }
          .timer.expired {
            background: linear-gradient(145deg, #2b1619, #1e0e11);
            border-color: #ff4d4f;
            color: #ff4d4f;
            box-shadow: 0 0 10px rgba(255, 77, 79, 0.2);
          }
          .instructions {
            text-align: left;
            background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid #303030;
          }
          .instructions h3 {
            margin-top: 0;
            color: #fff;
            font-size: 16px;
          }
          .instructions ol {
            padding-left: 20px;
            margin: 15px 0;
          }
          .instructions li {
            margin: 10px 0;
            color: #bfbfbf;
            line-height: 1.5;
          }
          .instructions strong {
            color: #177ddc;
          }
          .btn {
            border: none;
            border-radius: 10px;
            padding: 15px 25px;
            font-size: 16px;
            cursor: pointer;
            margin: 8px;
            transition: all 0.3s ease;
            font-weight: bold;
            position: relative;
            overflow: hidden;
          }
          .btn-primary {
            background: linear-gradient(45deg, #177ddc, #1890ff);
            color: white;
            box-shadow: 0 4px 15px rgba(23, 125, 220, 0.3);
          }
          .btn-primary:hover:not(:disabled) {
            background: linear-gradient(45deg, #1890ff, #40a9ff);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(23, 125, 220, 0.4);
          }
          .btn-success {
            background: linear-gradient(45deg, #49aa19, #5cb027);
            color: white;
            box-shadow: 0 4px 15px rgba(73, 170, 25, 0.3);
          }
          .btn-success:hover:not(:disabled) {
            background: linear-gradient(45deg, #5cb027, #6bc72f);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(73, 170, 25, 0.4);
          }
          .btn:disabled {
            background: #404040;
            color: #8c8c8c;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          .status-message {
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
            font-weight: bold;
            display: none;
            border: 1px solid;
          }
          .status-success {
            background: linear-gradient(145deg, #162312, #0f1a09);
            border-color: #49aa19;
            color: #49aa19;
            box-shadow: 0 0 10px rgba(73, 170, 25, 0.2);
          }
          .status-error {
            background: linear-gradient(145deg, #2b1619, #1e0e11);
            border-color: #ff4d4f;
            color: #ff4d4f;
            box-shadow: 0 0 10px rgba(255, 77, 79, 0.2);
          }
          .status-info {
            background: linear-gradient(145deg, #1b2135, #0f1621);
            border-color: #177ddc;
            color: #177ddc;
            box-shadow: 0 0 10px rgba(23, 125, 220, 0.2);
          }
          .button-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 25px;
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top: 3px solid #177ddc;
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
            .content {
              padding: 20px 15px;
            }
          }
          .pulse {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(23, 125, 220, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(23, 125, 220, 0); }
            100% { box-shadow: 0 0 0 0 rgba(23, 125, 220, 0); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 ชำระเงินด้วย QR Code</h1>
            <div class="subtitle">AI Image Analysis Service</div>
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
            
            <div class="qr-container pulse">
              <img src="${qrResult.qrCodeDataURL}" alt="QR Code สำหรับชำระเงิน" class="qr-code" />
            </div>
            
            <div class="instructions">
              <h3>📱 วิธีการชำระเงิน:</h3>
              <ol>
                <li>กดปุ่ม <strong>"ตรวจสอบการชำระเงิน"</strong> ด้านล่าง</li>
                <li>เปิดแอปธนาคารของคุณ</li>
                <li>สแกน QR Code เพื่อชำระเงิน</li>
                <li>ยืนยันการโอนเงิน <strong>${payment.totalAmount.toFixed(2)} บาท</strong></li>
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
              const timer = document.getElementById('timer');
              timer.classList.add('expired');
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
              showStatus('กรุณารออีก ' + Math.ceil((nextCheckTime - Date.now()) / 1000) + ' วินาที', 'info');
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
                  checkBtn.classList.remove('btn-success');
                  checkBtn.style.background = 'linear-gradient(45deg, #49aa19, #5cb027)';
                  
                  // แสดงเอฟเฟกต์สำเร็จ
                  document.querySelector('.qr-container').classList.remove('pulse');
                  
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
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #141414 0%, #1f1f1f 100%);
            color: #fff;
            min-height: 100vh;
          }
          .error { 
            color: #ff4d4f; 
            font-size: 24px; 
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255, 77, 79, 0.3);
          }
          .container {
            background: rgba(31, 31, 31, 0.8);
            border-radius: 15px;
            padding: 40px;
            border: 1px solid #303030;
            max-width: 400px;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">❌ เกิดข้อผิดพลาด</div>
          <p style="color: #bfbfbf;">ไม่สามารถแสดง QR Code ได้ กรุณาลองใหม่อีกครั้ง</p>
        </div>
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

// API สำหรับตรวจสอบการชำระเงินแบบ manual
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

module.exports = router;