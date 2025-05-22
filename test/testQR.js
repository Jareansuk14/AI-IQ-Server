const qrCodeService = require('../services/qrCodeService');
require('dotenv').config();

async function testPromptPayQR() {
  try {
    console.log('🧪 Testing PromptPay QR Code with promptpay-qr library');
    console.log('====================================================');
    
    // ข้อมูลทดสอบ
    const testPhone = process.env.PROMPTPAY_PHONE || '0812345678';
    const testAmount = 100.37;
    
    console.log(`📱 Testing with phone: ${testPhone}`);
    console.log(`💰 Testing with amount: ${testAmount} บาท`);
    console.log('');
    
    // ตรวจสอบเบอร์โทร
    console.log('🔍 Validating phone number...');
    const isValidPhone = qrCodeService.validatePhoneNumber(testPhone);
    if (isValidPhone) {
      console.log('✅ Phone number format is valid');
    } else {
      console.log('❌ Phone number format is invalid');
      console.log('💡 Please use format: 0812345678 or 66812345678');
      return;
    }
    console.log('');
    
    // ทดสอบการสร้าง QR Code แบบกำหนด amount
    console.log('1️⃣ Testing fixed amount QR Code...');
    try {
      const fixedResult = await qrCodeService.testQRCode(testPhone, testAmount);
      console.log('✅ Fixed amount QR Code generated successfully');
      console.log(`📏 Payload length: ${fixedResult.payload.length} characters`);
      console.log(`🔗 Payload: ${fixedResult.payload}`);
      console.log('');
    } catch (error) {
      console.log('❌ Fixed amount QR Code failed:', error.message);
      console.log('');
    }
    
    // ทดสอบการสร้าง QR Code แบบเปิด amount
    console.log('2️⃣ Testing open amount QR Code...');
    try {
      const openResult = await qrCodeService.generatePromptPayQROpenAmount(testPhone);
      console.log('✅ Open amount QR Code generated successfully');
      console.log(`📏 Payload length: ${openResult.payload.length} characters`);
      console.log(`🔗 Payload: ${openResult.payload}`);
      console.log('');
    } catch (error) {
      console.log('❌ Open amount QR Code failed:', error.message);
      console.log('');
    }
    
    // ทดสอบการสร้าง QR Code แบบ Base64
    console.log('3️⃣ Testing Base64 QR Code generation...');
    try {
      const base64Result = await qrCodeService.generateQRCodeBase64(testAmount, testPhone);
      console.log('✅ Base64 QR Code generated successfully');
      console.log(`📏 Base64 length: ${base64Result.base64.length} characters`);
      console.log(`🖼️  Base64 preview: ${base64Result.base64.substring(0, 50)}...`);
      console.log('');
    } catch (error) {
      console.log('❌ Base64 QR Code failed:', error.message);
      console.log('');
    }
    
    // ข้อมูลสำหรับการทดสอบ
    console.log('📋 Testing Instructions:');
    console.log('========================');
    console.log('1. Copy any payload above');
    console.log('2. Generate QR Code using any online QR generator');
    console.log('3. Test scan with these apps:');
    console.log('   📱 Mobile Banking Apps (KBank, SCB, BBL, etc.)');
    console.log('   💳 True Money Wallet');
    console.log('   🐰 Rabbit LINE Pay');
    console.log('   🛒 ShopeePay');
    console.log('   💰 Any PromptPay compatible app');
    console.log('');
    
    console.log('🔧 Expected Results:');
    console.log('===================');
    console.log('✅ App should open PromptPay transfer screen');
    console.log(`✅ Recipient phone: ${testPhone}`);
    console.log(`✅ Amount (if fixed): ${testAmount} บาท`);
    console.log('✅ Ready to confirm payment');
    console.log('');
    
    console.log('🚨 If QR Code doesn\'t work:');
    console.log('===========================');
    console.log('1. Check if phone number is correct in .env file');
    console.log('2. Make sure phone number is registered with PromptPay');
    console.log('3. Try with a different mobile banking app');
    console.log('4. Check if promptpay-qr library is installed correctly');
    console.log('');
    
    // Debug information
    console.log('🔍 Debug Information:');
    console.log('====================');
    console.log(`Environment PROMPTPAY_PHONE: ${process.env.PROMPTPAY_PHONE || 'Not set'}`);
    console.log(`Using phone number: ${testPhone}`);
    console.log(`Using amount: ${testAmount}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('===================');
    console.log('1. Make sure you installed: npm install promptpay-qr qrcode');
    console.log('2. Check your .env file has PROMPTPAY_PHONE set');
    console.log('3. Verify phone number format (0812345678)');
    console.log('4. Restart the application after installing packages');
  }
}

// เรียกใช้ฟังก์ชันทดสอบ
testPromptPayQR();