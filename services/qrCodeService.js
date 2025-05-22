const QRCode = require('qrcode');
const generatePayload = require('promptpay-qr');

class QRCodeService {
  // สร้าง QR Code สำหรับพร้อมเพย์
  async generatePromptPayQR(amount, phoneNumber = '0812345678') {
    try {
      console.log(`Generating PromptPay QR for phone: ${phoneNumber}, amount: ${amount}`);
      
      // สร้าง payload สำหรับ PromptPay โดยใช้ library promptpay-qr
      const payload = generatePayload(phoneNumber, { amount });
      
      console.log('Generated PromptPay payload:', payload);
      
      // สร้าง QR Code เป็น Data URL
      const qrCodeDataURL = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512
      });

      return {
        qrCodeDataURL,
        payload,
        amount,
        phoneNumber
      };
    } catch (error) {
      console.error('Error generating PromptPay QR Code:', error);
      throw new Error('ไม่สามารถสร้าง QR Code ได้: ' + error.message);
    }
  }

  // สร้าง QR Code แบบ Base64 (สำหรับแสดงในแชท)
  async generateQRCodeBase64(amount, phoneNumber = '0812345678') {
    try {
      const result = await this.generatePromptPayQR(amount, phoneNumber);
      
      // แปลง Data URL เป็น Base64
      const base64Data = result.qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      
      return {
        base64: base64Data,
        dataURL: result.qrCodeDataURL,
        payload: result.payload,
        amount,
        phoneNumber: result.phoneNumber
      };
    } catch (error) {
      console.error('Error generating QR Code Base64:', error);
      throw error;
    }
  }

  // สร้างลิงก์สำหรับแสดง QR Code (สำหรับเปิดในเบราว์เซอร์)
  generateQRDisplayLink(paymentId, baseURL = process.env.BASE_URL || 'http://localhost:3000') {
    return `${baseURL}/api/payment/qr/${paymentId}`;
  }

  // ตรวจสอบความถูกต้องของเบอร์โทรศัพท์
  validatePhoneNumber(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[-\s]/g, '');
    
    // ตรวจสอบเบอร์โทรไทย (เริ่มด้วย 0 และมี 10 หลัก หรือเริ่มด้วย 66 และมี 11 หลัก)
    const thaiPhonePattern = /^(0[0-9]{9}|66[0-9]{9})$/;
    
    return thaiPhonePattern.test(cleanPhone);
  }

  // ทดสอบ QR Code (สำหรับ debugging)
  async testQRCode(phoneNumber = '0812345678', amount = 100.50) {
    try {
      console.log('Testing PromptPay QR Code generation...');
      console.log('Input Phone:', phoneNumber);
      console.log('Input Amount:', amount);
      
      // ตรวจสอบเบอร์โทร
      if (!this.validatePhoneNumber(phoneNumber)) {
        throw new Error('เบอร์โทรศัพท์ไม่ถูกต้อง');
      }
      
      const result = await this.generatePromptPayQR(amount, phoneNumber);
      
      console.log('Generated Payload Length:', result.payload.length);
      console.log('Payload:', result.payload);
      
      // ตรวจสอบความถูกต้องของ payload
      if (result.payload && result.payload.length > 0) {
        console.log('✅ QR Code generation successful');
        
        // ตรวจสอบว่า payload เริ่มต้นด้วย format ที่ถูกต้อง
        if (result.payload.startsWith('00020101')) {
          console.log('✅ Payload format validation passed');
        } else {
          console.log('⚠️  Payload format might be incorrect');
        }
        
        return result;
      } else {
        throw new Error('Payload is empty or invalid');
      }
    } catch (error) {
      console.error('❌ QR Code test failed:', error);
      throw error;
    }
  }

  // สร้าง QR Code สำหรับการทดสอบโดยไม่มีจำนวนเงิน (เปิด amount)
  async generatePromptPayQROpenAmount(phoneNumber = '0812345678') {
    try {
      console.log(`Generating open amount PromptPay QR for phone: ${phoneNumber}`);
      
      // สร้าง payload โดยไม่ระบุ amount (ให้ผู้ใช้กรอกเอง)
      const payload = generatePayload(phoneNumber);
      
      console.log('Generated open amount PromptPay payload:', payload);
      
      // สร้าง QR Code เป็น Data URL
      const qrCodeDataURL = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512
      });

      return {
        qrCodeDataURL,
        payload,
        amount: null,
        phoneNumber
      };
    } catch (error) {
      console.error('Error generating open amount PromptPay QR Code:', error);
      throw new Error('ไม่สามารถสร้าง QR Code แบบเปิด amount ได้: ' + error.message);
    }
  }

  // สร้าง QR Code พร้อมเพย์โดยใช้เลขประจำตัวประชาชน (สำหรับกรณีที่ไม่ใช้เบอร์โทร)
  async generatePromptPayQRByNationalID(nationalId, amount) {
    try {
      console.log(`Generating PromptPay QR for National ID: ${nationalId}, amount: ${amount}`);
      
      // สร้าง payload สำหรับ PromptPay โดยใช้เลขประจำตัวประชาชน
      const payload = generatePayload(nationalId, { amount });
      
      console.log('Generated PromptPay payload with National ID:', payload);
      
      // สร้าง QR Code เป็น Data URL
      const qrCodeDataURL = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512
      });

      return {
        qrCodeDataURL,
        payload,
        amount,
        nationalId
      };
    } catch (error) {
      console.error('Error generating PromptPay QR Code with National ID:', error);
      throw new Error('ไม่สามารถสร้าง QR Code ด้วยเลขประจำตัวประชาชนได้: ' + error.message);
    }
  }

  // แสดงข้อมูลสำหรับการ debug
  async debugQRCode(phoneNumber, amount) {
    try {
      console.log('🔍 Debugging PromptPay QR Code');
      console.log('==============================');
      console.log('Phone Number:', phoneNumber);
      console.log('Amount:', amount);
      console.log('');
      
      // ทดสอบโดยไม่มี amount
      console.log('1. Testing without amount (open amount)...');
      const openResult = await this.generatePromptPayQROpenAmount(phoneNumber);
      console.log('   ✅ Open amount QR generated');
      console.log('   Payload:', openResult.payload);
      console.log('');
      
      // ทดสอบกับ amount
      console.log('2. Testing with fixed amount...');
      const fixedResult = await this.generatePromptPayQR(amount, phoneNumber);
      console.log('   ✅ Fixed amount QR generated');
      console.log('   Payload:', fixedResult.payload);
      console.log('');
      
      console.log('🎯 Both QR codes generated successfully!');
      console.log('📱 Test these QR codes with your mobile banking app');
      
      return {
        openAmount: openResult,
        fixedAmount: fixedResult
      };
    } catch (error) {
      console.error('❌ Debug failed:', error);
      throw error;
    }
  }
}

module.exports = new QRCodeService();