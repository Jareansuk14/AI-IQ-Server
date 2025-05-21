// utils/createRichMenu.js
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
    // ตั้งค่า Rich Menu
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
            width: 1250,
            height: 1686
          },
          action: {
            type: "message",
            text: "เครดิต"
          }
        },
        {
          bounds: {
            x: 1250,
            y: 0,
            width: 1250,
            height: 1686
          },
          action: {
            type: "message",
            text: "แชร์"
          }
        }
      ]
    };

    // สร้าง Rich Menu
    const richMenuId = await client.createRichMenu(richMenuData);
    console.log('Rich Menu created with ID:', richMenuId);

    // อัปโหลดรูปภาพสำหรับ Rich Menu
    const imagePath = path.join(__dirname, '..', 'public', 'rich-menu.png');
    
    if (!fs.existsSync(imagePath)) {
      console.error('Rich Menu image not found. Please create a rich-menu.png in the public folder.');
      return;
    }
    
    const bufferImage = fs.readFileSync(imagePath);
    await client.setRichMenuImage(richMenuId, bufferImage);
    console.log('Rich Menu image uploaded');

    // ตั้ง Rich Menu เป็นค่าเริ่มต้นสำหรับผู้ใช้ทุกคน
    await client.setDefaultRichMenu(richMenuId);
    console.log('Default Rich Menu set');

    console.log('Rich Menu created and set successfully');
  } catch (error) {
    console.error('Error creating Rich Menu:', error);
  }
};

// เรียกใช้ฟังก์ชัน
createRichMenu();