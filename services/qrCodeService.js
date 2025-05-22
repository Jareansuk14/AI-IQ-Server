const QRCode = require('qrcode');

class QRCodeService {
  // สร้าง QR Code สำหรับพร้อมเพย์
  async generatePromptPayQR(amount, phoneNumber = '0812345678') {
    try {
      // สร้างข้อมูล PromptPay QR Code
      const promptPayData = this.createPromptPayData(phoneNumber, amount);
      
      // สร้าง QR Code เป็น Data URL
      const qrCodeDataURL = await QRCode.toDataURL(promptPayData, {
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
        promptPayData,
        amount,
        phoneNumber
      };
    } catch (error) {
      console.error('Error generating PromptPay QR Code:', error);
      throw new Error('ไม่สามารถสร้าง QR Code ได้');
    }
  }

  // สร้างข้อมูล PromptPay สำหรับ QR Code ตามมาตรฐาน EMVCo
  createPromptPayData(phoneNumber, amount) {
    try {
      // ลบเครื่องหมาย - และ space ออกจากเบอร์โทร
      let cleanPhoneNumber = phoneNumber.replace(/[-\s]/g, '');
      
      // แปลงเบอร์โทรเป็นรูปแบบสำหรับ PromptPay (เติม 66 และตัด 0 หน้า)
      if (cleanPhoneNumber.startsWith('0')) {
        cleanPhoneNumber = '66' + cleanPhoneNumber.substring(1);
      } else if (!cleanPhoneNumber.startsWith('66')) {
        cleanPhoneNumber = '66' + cleanPhoneNumber;
      }

      // สร้างข้อมูล QR Code ตาม PromptPay Standard
      let qrData = '';
      
      // Payload Format Indicator (Tag 00)
      qrData += '00020';  // Tag 00, Length 02, Value 01
      qrData += '1';      // Static QR Code
      
      // Point of Initiation Method (Tag 01)
      qrData += '01021';  // Tag 01, Length 02, Value 12 (static)
      qrData += '2';      // Reusable QR Code
      
      // Merchant Account Information (Tag 29 for PromptPay)
      let merchantInfo = '';
      merchantInfo += '0016';  // Sub-tag 00, Length 16
      merchantInfo += 'A000000677010111';  // PromptPay ID
      merchantInfo += '01';    // Sub-tag 01
      merchantInfo += this.padLength(cleanPhoneNumber.length);
      merchantInfo += cleanPhoneNumber;
      
      qrData += '29';     // Tag 29
      qrData += this.padLength(merchantInfo.length);
      qrData += merchantInfo;
      
      // Merchant Category Code (Tag 52)
      qrData += '52041111';  // Tag 52, Length 04, Value 1111
      
      // Transaction Currency (Tag 53) - THB = 764
      qrData += '5303764';   // Tag 53, Length 03, Value 764
      
      // Transaction Amount (Tag 54) - เฉพาะเมื่อมีจำนวนเงิน
      if (amount && amount > 0) {
        const amountStr = amount.toFixed(2);
        qrData += '54';
        qrData += this.padLength(amountStr.length);
        qrData += amountStr;
      }
      
      // Country Code (Tag 58)
      qrData += '5802TH';    // Tag 58, Length 02, Value TH
      
      // Merchant Name (Tag 59) - Optional
      const merchantName = 'PromptPay';
      qrData += '59';
      qrData += this.padLength(merchantName.length);
      qrData += merchantName;
      
      // Merchant City (Tag 60) - Optional
      const merchantCity = 'Bangkok';
      qrData += '60';
      qrData += this.padLength(merchantCity.length);
      qrData += merchantCity;
      
      // CRC (Tag 63) - จะคำนวณทีหลัง
      qrData += '6304';
      
      // คำนวณและเพิ่ม CRC
      const crc = this.calculateCRC16(qrData);
      qrData += crc;

      console.log('Generated PromptPay QR Data:', qrData);
      console.log('Phone Number:', cleanPhoneNumber);
      console.log('Amount:', amount);
      
      return qrData;
    } catch (error) {
      console.error('Error creating PromptPay data:', error);
      throw error;
    }
  }

  // ฟังก์ชันช่วยสำหรับ padding length เป็น 2 หลัก
  padLength(length) {
    return length.toString().padStart(2, '0');
  }

  // คำนวณ CRC16 สำหรับ PromptPay ตามมาตรฐาน ISO/IEC 13239
  calculateCRC16(data) {
    const polynomial = 0x1021;
    let crc = 0xFFFF;

    for (let i = 0; i < data.length; i++) {
      crc ^= (data.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF; // Keep only 16 bits
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
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
    return `${baseURL}/payment/qr/${paymentId}`;
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
      
      const result = await this.generatePromptPayQR(amount, phoneNumber);
      
      console.log('Generated QR Data Length:', result.promptPayData.length);
      console.log('QR Data:', result.promptPayData);
      
      // ตรวจสอบว่า QR Code มีข้อมูลที่จำเป็น
      const requiredElements = [
        '00020', // Payload Format
        '01021', // Point of Initiation  
        '29',    // Merchant Account (PromptPay)
        '5802TH', // Country Code
        '6304'   // CRC placeholder
      ];
      
      const missingElements = requiredElements.filter(element => !result.promptPayData.includes(element));
      
      if (missingElements.length === 0) {
        console.log('✅ QR Code validation passed');
      } else {
        console.log('❌ QR Code validation failed. Missing:', missingElements);
      }
      
      return result;
    } catch (error) {
      console.error('❌ QR Code test failed:', error);
      throw error;
    }
  }
}

module.exports = new QRCodeService();