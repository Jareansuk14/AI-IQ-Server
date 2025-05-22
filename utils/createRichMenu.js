const fs = require('fs');
const path = require('path');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

// ฟังก์ชันสร้าง Rich Menu
const createRichMenu = async () => {
  try {
    // ตั้งค่า Rich Menu แบบ 3 ปุ่ม
    const richMenuData = {
      size: {
        width: 2500,
        height: 1686
      },
      selected: true,
      name: "เมนูหลัก",
      chatBarText: "เมนูหลัก",
      areas: [
        {
          bounds: {
            x: 0,
            y: 0,
            width: 833,
            height: 1686
          },
          action: {
            type: "message",
            text: "เครดิต"
          }
        },
        {
          bounds: {
            x: 833,
            y: 0,
            width: 834,
            height: 1686
          },
          action: {
            type: "message",
            text: "เติมเครดิต"
          }
        },
        {
          bounds: {
            x: 1667,
            y: 0,
            width: 833,
            height: 1686
          },
          action: {
            type: "message",
            text: "แชร์"
          }
        }
      ]
    };

    // ลบ Rich Menu เดิม (ถ้ามี)
    try {
      const existingMenus = await client.getRichMenuList();
      for (const menu of existingMenus) {
        await client.deleteRichMenu(menu.richMenuId);
        console.log('Deleted existing Rich Menu:', menu.richMenuId);
      }
    } catch (error) {
      console.log('No existing Rich Menu to delete or error deleting:', error.message);
    }

    // สร้าง Rich Menu ใหม่
    const richMenuId = await client.createRichMenu(richMenuData);
    console.log('Rich Menu created with ID:', richMenuId);

    // อัปโหลดรูปภาพสำหรับ Rich Menu
    const imagePath = path.join(__dirname, '..', 'public', 'rich-menu.png');
    
    if (!fs.existsSync(imagePath)) {
      console.error('Rich Menu image not found. Please create a rich-menu.png in the public folder.');
      console.log('Expected path:', imagePath);
      console.log('The image should be 2500x1686 pixels and divided into 3 sections:');
      console.log('- Left (0-833px): เช็คเครดิต');
      console.log('- Middle (833-1667px): เติมเครดิต');
      console.log('- Right (1667-2500px): แชร์เพื่อรับเครดิต');
      return;
    }
    
    const bufferImage = fs.readFileSync(imagePath);
    await client.setRichMenuImage(richMenuId, bufferImage);
    console.log('Rich Menu image uploaded');

    // ตั้ง Rich Menu เป็นค่าเริ่มต้นสำหรับผู้ใช้ทุกคน
    await client.setDefaultRichMenu(richMenuId);
    console.log('Default Rich Menu set');

    console.log('✅ Rich Menu created and set successfully');
    console.log('Rich Menu includes:');
    console.log('1. เช็คเครดิต - ดูเครดิตคงเหลือ');
    console.log('2. เติมเครดิต - แสดงแพ็คเกจเติมเครดิต');
    console.log('3. แชร์เพื่อรับเครดิต - ดูรหัสแนะนำและแชร์');
    
  } catch (error) {
    console.error('❌ Error creating Rich Menu:', error);
    
    if (error.message.includes('Invalid richMenu size')) {
      console.log('💡 Hint: Make sure your rich-menu.png is exactly 2500x1686 pixels');
    }
    
    if (error.message.includes('The rich menu image must be')) {
      console.log('💡 Hint: Check if the image file format is PNG and file size is under 1MB');
    }
  }
};

// เรียกใช้ฟังก์ชัน
createRichMenu();