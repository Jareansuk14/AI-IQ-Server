const QRCode = require('qrcode');

class QRCodeService {
  // สร้าง QR Code สำหรับพร้อมเพย์
  async generatePromptPayQR(amount, phoneNumber = '0123456789') {
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
        amount
      };
    } catch (error) {
      console.error('Error generating PromptPay QR Code:', error);
      throw new Error('ไม่สามารถสร้าง QR Code ได้');
    }
  }

  // สร้างข้อมูล PromptPay สำหรับ QR Code
  createPromptPayData(phoneNumber, amount) {
    try {
      // ลบเครื่องหมาย - และ space ออกจากเบอร์โทร
      const cleanPhoneNumber = phoneNumber.replace(/[-\s]/g, '');
      
      // แปลงเบอร์โทรเป็นรูปแบบสำหรับ PromptPay
      let promptPayPhone = cleanPhoneNumber;
      if (promptPayPhone.startsWith('0')) {
        promptPayPhone = '66' + promptPayPhone.substring(1);
      }

      // สร้างข้อมูล QR Code ตาม PromptPay Standard
      let qrData = '00020101021129370016A000000677010111';
      
      // เพิ่มเบอร์โทรศัพท์
      qrData += '01' + ('0' + promptPayPhone.length).slice(-2) + promptPayPhone;
      
      // เพิ่มรหัสประเทศไทย
      qrData += '5802TH';
      
      // เพิ่มจำนวนเงิน
      if (amount && amount > 0) {
        const amountStr = amount.toFixed(2);
        qrData += '54' + ('0' + amountStr.length).slice(-2) + amountStr;
      }
      
      // เพิ่ม CRC (Checksum) ท้ายสุด
      qrData += '6304';
      const crc = this.calculateCRC16(qrData);
      qrData += crc;

      return qrData;
    } catch (error) {
      console.error('Error creating PromptPay data:', error);
      throw error;
    }
  }

  // คำนวณ CRC16 สำหรับ PromptPay
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
      }
    }

    crc = crc & 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // สร้าง QR Code แบบ Base64 (สำหรับแสดงในแชท)
  async generateQRCodeBase64(amount, phoneNumber = '0123456789') {
    try {
      const result = await this.generatePromptPayQR(amount, phoneNumber);
      
      // แปลง Data URL เป็น Base64
      const base64Data = result.qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      
      return {
        base64: base64Data,
        dataURL: result.qrCodeDataURL,
        amount
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
}

module.exports = new QRCodeService();