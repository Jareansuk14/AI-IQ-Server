//AI-Server/utils/flexMessages.js - ตัดฟังก์ชันสถิติออก
function createCreditPackagesMessage() {
  return {
    type: "flex",
    altText: "💎 แพ็คเกจเติมเครดิต AI",
    contents: {
      type: "carousel",
      contents: [
        // แพ็คเกจ 1 เครดิต - Starter
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🚀 STARTER",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "1 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#177ddc",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "10",
                weight: "bold",
                size: "xxl",
                color: "#177ddc",
                align: "center"
              },
              {
                type: "text",
                text: "บาท",
                size: "md",
                color: "#177ddc",
                align: "center",
                margin: "none"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "เหมาะสำหรับทดลองใช้",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🎯 เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=1_credit"
                },
                color: "#177ddc"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },
        // แพ็คเกจ 10 เครดิต - Popular
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "⭐ POPULAR",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "10 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#49aa19",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "100",
                weight: "bold",
                size: "xxl",
                color: "#49aa19",
                align: "center"
              },
              {
                type: "text",
                text: "บาท",
                size: "md",
                color: "#49aa19",
                align: "center",
                margin: "none"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "✨ ยอดนิยม! คุ้มค่าที่สุด",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🎯 เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=10_credit"
                },
                color: "#49aa19"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },
        // แพ็คเกจ 20 เครดิต - Value
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💎 VALUE",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "20 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#1890ff",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "200",
                weight: "bold",
                size: "xxl",
                color: "#1890ff",
                align: "center"
              },
              {
                type: "text",
                text: "บาท",
                size: "md",
                color: "#1890ff",
                align: "center",
                margin: "none"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "💰 คุ้มค่าดีเยี่ยม",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🎯 เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=20_credit"
                },
                color: "#1890ff"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },
        // แพ็คเกจ 50 เครดิต - Pro
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🔥 PRO",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "50 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#d89614",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "500",
                weight: "bold",
                size: "xxl",
                color: "#d89614",
                align: "center"
              },
              {
                type: "text",
                text: "บาท",
                size: "md",
                color: "#d89614",
                align: "center",
                margin: "none"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "🚀 สำหรับผู้ใช้งานหนัก",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🎯 เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=50_credit"
                },
                color: "#d89614"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },
        // แพ็คเกจ 100 เครดิต - Ultimate
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "👑 ULTIMATE",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "100 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#722ed1",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "1,000",
                weight: "bold",
                size: "xxl",
                color: "#722ed1",
                align: "center"
              },
              {
                type: "text",
                text: "บาท",
                size: "md",
                color: "#722ed1",
                align: "center",
                margin: "none"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "👑 พรีเมียม สูงสุด!",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🎯 เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=100_credit"
                },
                color: "#722ed1"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        }
      ]
    }
  };
}

// สร้าง Flex Message สำหรับแสดงข้อมูลการชำระเงิน (Dark Sci-Fi Theme)
function createPaymentInfoMessage(paymentTransaction, qrCodeURL) {
  const packageNames = {
    '1_credit': '1 เครดิต',
    '10_credit': '10 เครดิต',
    '20_credit': '20 เครดิต',
    '50_credit': '50 เครดิต',
    '100_credit': '100 เครดิต'
  };

  const packageIcons = {
    '1_credit': '🚀',
    '10_credit': '⭐',
    '20_credit': '💎',
    '50_credit': '🔥',
    '100_credit': '👑'
  };

  const expiresAt = new Date(paymentTransaction.expiresAt);
  const expiresTime = expiresAt.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Bangkok'
  });

  // คำนวณเวลาที่เหลือ (แก้ไขให้แม่นยำ)
  const timeLeft = Math.max(0, expiresAt.getTime() - Date.now());
  const timeLeftMinutes = Math.floor(timeLeft / 60000);
  const timeLeftText = timeLeft > 0 ? `⏰ เหลือ ${timeLeftMinutes} นาที` : '⚠️ หมดอายุแล้ว';

  // ตรวจสอบและแก้ไข URL ให้เป็น /api/payment
  let correctedURL = qrCodeURL;
  if (qrCodeURL && !qrCodeURL.includes('/api/payment/')) {
    correctedURL = qrCodeURL.replace('/payment/', '/api/payment/');
  }

  return {
    type: "flex",
    altText: `💳 การชำระเงิน ${packageNames[paymentTransaction.packageType]}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "💳",
                size: "xl",
                color: "#ffffff",
                flex: 0
              },
              {
                type: "text",
                text: "การชำระเงิน AI",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                flex: 4,
                margin: "md"
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: packageIcons[paymentTransaction.packageType],
                size: "sm",
                color: "#ffffff",
                flex: 0
              },
              {
                type: "text",
                text: packageNames[paymentTransaction.packageType],
                color: "#ffffff",
                size: "md",
                flex: 4,
                margin: "sm"
              }
            ],
            margin: "md"
          }
        ],
        backgroundColor: "#177ddc",
        paddingAll: "20px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          // จำนวนเงิน
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: `${paymentTransaction.totalAmount.toFixed(2)}`,
                weight: "bold",
                size: "xxl",
                color: "#177ddc",
                align: "center"
              },
              {
                type: "text",
                text: "บาท",
                size: "lg",
                color: "#177ddc",
                align: "center",
                margin: "none"
              }
            ],
            spacing: "none",
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          // รายละเอียด
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "📦",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "แพ็คเกจ:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: packageNames[paymentTransaction.packageType],
                    weight: "bold",
                    color: "#ffffff",
                    size: "sm",
                    flex: 3
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "⏰",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "หมดอายุ:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: expiresTime,
                    weight: "bold",
                    color: timeLeftMinutes > 5 ? "#d89614" : timeLeftMinutes > 0 ? "#d89614" : "#a61d24",
                    size: "sm",
                    flex: 3
                  }
                ],
                margin: "md"
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "🕐",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "สถานะ:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: timeLeftText,
                    weight: "bold",
                    color: timeLeftMinutes > 0 ? "#49aa19" : "#a61d24",
                    size: "sm",
                    flex: 3
                  }
                ],
                margin: "md"
              }
            ],
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          // คำแนะนำ
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📱 วิธีการชำระเงิน:",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              },
              {
                type: "text",
                text: "• กดปุ่มดู QR Code ชำระเงินด้านล่าง\n• เปิดแอปธนาคารของคุณ\n• สแกน QR Code เพื่อชำระเงิน\n• ยืนยันการโอนเงิน",
                color: "#8c8c8c",
                size: "xs",
                wrap: true,
                margin: "sm"
              }
            ],
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "uri",
              label: "📱 ดู QR Code ชำระเงิน",
              uri: correctedURL
            },
            color: "#177ddc",
            height: "md"
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "❌ ยกเลิก",
              data: `action=cancel_payment&payment_id=${paymentTransaction._id}`
            },
            height: "sm",
            margin: "sm"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

// สร้าง Flex Message แสดงสถานะการชำระเงินสำเร็จ
function createPaymentSuccessMessage(paymentData, totalCredits) {
  const packageNames = {
    '1_credit': '1 เครดิต',
    '10_credit': '10 เครดิต', 
    '20_credit': '20 เครดิต',
    '50_credit': '50 เครดิต',
    '100_credit': '100 เครดิต'
  };

  return {
    type: "flex",
    altText: "🎉 ชำระเงินสำเร็จ!",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🎉",
            size: "xxl",
            align: "center",
            color: "#ffffff"
          },
          {
            type: "text",
            text: "ชำระเงินสำเร็จ!",
            weight: "bold",
            color: "#ffffff",
            size: "xl",
            align: "center",
            margin: "md"
          }
        ],
        backgroundColor: "#49aa19",
        paddingAll: "25px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: `+${paymentData.credits}`,
                weight: "bold",
                size: "xxl",
                color: "#49aa19",
                align: "center"
              },
              {
                type: "text",
                text: "เครดิต",
                size: "lg",
                color: "#49aa19",
                align: "center",
                margin: "none"
              }
            ],
            spacing: "none",
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "📦",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "แพ็คเกจ:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: packageNames[paymentData.packageType],
                    weight: "bold",
                    color: "#ffffff",
                    size: "sm",
                    flex: 3
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "💰",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "จำนวนเงิน:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: `${paymentData.totalAmount.toFixed(2)} บาท`,
                    weight: "bold",
                    color: "#ffffff",
                    size: "sm",
                    flex: 3
                  }
                ],
                margin: "md"
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "💎",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "เครดิตรวม:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: `${totalCredits} เครดิต`,
                    weight: "bold",
                    color: "#177ddc",
                    size: "lg",
                    flex: 3
                  }
                ],
                margin: "md"
              }
            ],
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "text",
            text: "✨ ขอบคุณที่ใช้บริการ!\nสามารถใช้เครดิตในการวิเคราะห์รูปภาพด้วย AI ได้ทันที",
            color: "#8c8c8c",
            size: "sm",
            wrap: true,
            align: "center",
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

// ฟังก์ชันสร้างเมนูคู่เงิน AI-Auto
function createForexPairsMessage() {
  return {
    type: "flex",
    altText: "📈 AI-Auto คู่เงิน Forex",
    contents: {
      type: "carousel",
      contents: [
        // EUR/USD - Major Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🔥 MAJOR",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "EUR/USD",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#177ddc",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇪🇺🇺🇸",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "Euro vs US Dollar",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=EUR/USD"
                },
                color: "#177ddc"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // GBP/USD - Major Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🔥 MAJOR",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "GBP/USD",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#177ddc",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇬🇧🇺🇸",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "British Pound vs US Dollar",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=GBP/USD"
                },
                color: "#177ddc"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // USD/JPY - Major Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🔥 MAJOR",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "USD/JPY",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#177ddc",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇺🇸🇯🇵",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "US Dollar vs Japanese Yen",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=USD/JPY"
                },
                color: "#177ddc"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // USD/CHF - Major Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🔥 MAJOR",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "USD/CHF",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#177ddc",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇺🇸🇨🇭",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "US Dollar vs Swiss Franc",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=USD/CHF"
                },
                color: "#177ddc"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // AUD/USD - Cross Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "⭐ CROSS",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "AUD/USD",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#49aa19",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇦🇺🇺🇸",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "Australian Dollar vs US Dollar",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=AUD/USD"
                },
                color: "#49aa19"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // NZD/USD - Cross Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "⭐ CROSS",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "NZD/USD",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#49aa19",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇳🇿🇺🇸",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "New Zealand Dollar vs US Dollar",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=NZD/USD"
                },
                color: "#49aa19"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // USD/CAD - Cross Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "⭐ CROSS",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "USD/CAD",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#49aa19",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇺🇸🇨🇦",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "US Dollar vs Canadian Dollar",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=USD/CAD"
                },
                color: "#49aa19"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // EUR/GBP - Cross Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "⭐ CROSS",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "EUR/GBP",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#49aa19",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇪🇺🇬🇧",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "Euro vs British Pound",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=EUR/GBP"
                },
                color: "#49aa19"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // EUR/JPY - Special Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💎 SPECIAL",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "EUR/JPY",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#1890ff",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇪🇺🇯🇵",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "Euro vs Japanese Yen",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=EUR/JPY"
                },
                color: "#1890ff"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // GBP/JPY - Special Pair
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💎 SPECIAL",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "GBP/JPY",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#1890ff",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🇬🇧🇯🇵",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "British Pound vs Japanese Yen",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=GBP/JPY"
                },
                color: "#1890ff"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // BTC/USD - Crypto
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🔥 CRYPTO",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "BTC/USD",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#d89614",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "₿💰",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "Bitcoin vs US Dollar",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=BTC/USD"
                },
                color: "#d89614"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        },

        // GOLD - Commodity
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "👑 PREMIUM",
                weight: "bold",
                color: "#ffffff",
                size: "xs",
                align: "center"
              },
              {
                type: "text",
                text: "GOLD",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                align: "center"
              }
            ],
            backgroundColor: "#722ed1",
            paddingTop: "15px",
            paddingAll: "12px",
            paddingBottom: "15px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🥇✨",
                size: "xxl",
                align: "center",
                margin: "md"
              },
              {
                type: "separator",
                margin: "md",
                color: "#303030"
              },
              {
                type: "text",
                text: "Gold vs US Dollar",
                size: "xs",
                color: "#8c8c8c",
                wrap: true,
                align: "center",
                margin: "md"
              }
            ],
            spacing: "xs",
            paddingAll: "15px",
            backgroundColor: "#1f1f1f"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "🦾 Auto ",
                  data: "action=forex_analysis&pair=GOLD"
                },
                color: "#722ed1"
              }
            ],
            spacing: "sm",
            paddingAll: "12px",
            backgroundColor: "#1f1f1f"
          }
        }
      ]
    }
  };
}

// ฟังก์ชันคำนวณเวลา 5 นาทีข้างหน้า (ปัดขึ้นไปที่ 5 นาทีถัดไป)
function calculateNextTimeSlot() {
  const now = new Date();
  const currentMinutes = now.getMinutes();
  const currentHours = now.getHours();
  
  // หาจำนวนนาทีที่ต้องเพิ่มเพื่อไปถึง 5 นาทีถัดไป
  let targetMinutes;
  if (currentMinutes < 5) {
    targetMinutes = 5;
  } else if (currentMinutes < 10) {
    targetMinutes = 10;
  } else if (currentMinutes < 15) {
    targetMinutes = 15;
  } else if (currentMinutes < 20) {
    targetMinutes = 20;
  } else if (currentMinutes < 25) {
    targetMinutes = 25;
  } else if (currentMinutes < 30) {
    targetMinutes = 30;
  } else if (currentMinutes < 35) {
    targetMinutes = 35;
  } else if (currentMinutes < 40) {
    targetMinutes = 40;
  } else if (currentMinutes < 45) {
    targetMinutes = 45;
  } else if (currentMinutes < 50) {
    targetMinutes = 50;
  } else if (currentMinutes < 55) {
    targetMinutes = 55;
  } else {
    // ถ้าเกิน 55 นาที ให้ไปชั่วโมงถัดไปที่ 00 นาที
    targetMinutes = 0;
  }
  
  const targetTime = new Date();
  
  if (targetMinutes === 0 && currentMinutes >= 55) {
    // ไปชั่วโมงถัดไป
    targetTime.setHours(currentHours + 1);
    targetTime.setMinutes(0);
  } else {
    targetTime.setMinutes(targetMinutes);
  }
  
  targetTime.setSeconds(0);
  targetTime.setMilliseconds(0);
  
  // ส่งกลับในรูปแบบ HH:MM
  return targetTime.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok'
  });
}

function createContinueTradeMessage() {
  return {
    type: "flex",
    altText: "🎯 เทรดต่อหรือไม่?",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🎯",
            size: "xxl",
            align: "center",
            color: "#ffffff"
          },
          {
            type: "text",
            text: "เทรดต่อไหม?",
            weight: "bold",
            color: "#ffffff",
            size: "xl",
            align: "center",
            margin: "md"
          }
        ],
        backgroundColor: "#177ddc",
        paddingAll: "25px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🚀 พร้อมสำหรับการเทรดครั้งถัดไป?",
            weight: "bold",
            size: "lg",
            color: "#ffffff",
            align: "center",
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💰 เลือกคู่เงินใหม่เพื่อวิเคราะห์",
                color: "#8c8c8c",
                size: "sm",
                align: "center",
                margin: "lg"
              },
              {
                type: "text",
                text: "🎯 ระบบ AI พร้อมให้คำแนะนำ",
                color: "#8c8c8c",
                size: "sm",
                align: "center",
                margin: "sm"
              },
              {
                type: "text",
                text: "📈 ติดตามผลแบบ Real-time",
                color: "#8c8c8c",
                size: "sm",
                align: "center",
                margin: "sm"
              }
            ],
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "🚀 เทรดต่อ!",
              data: "action=continue_trading"
            },
            color: "#49aa19",
            height: "md",
            margin: "sm"
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "🛑 พักก่อน",
              data: "action=stop_trading"
            },
            height: "sm",
            margin: "sm"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

// 🎯 การ์ดแสดงรหัสแนะนำของตัวเอง (เพิ่มปุ่ม LIFF Share)
function createReferralShareMessage(referralCode, totalReferred = 0, totalEarned = 0) {
  // ⭐ เปลี่ยนจาก BASE_URL เป็น LIFF URL โดยตรง
  const liffUrl = `https://liff.line.me/2007512451-RBO1MpYy?code=${referralCode}`;
  const lineUrl = `https://line.me/R/oaMessage/@033mebpp/?%20CODE:${referralCode}`;
  
  return {
    type: "flex",
    altText: "🎁 แชร์เพื่อรับเครดิต",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "🎁",
                size: "xl",
                color: "#ffffff",
                flex: 0
              },
              {
                type: "text",
                text: "แชร์เพื่อรับเครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                flex: 4,
                margin: "md"
              }
            ]
          },
          {
            type: "text",
            text: "รหัสแนะนำของคุณ",
            color: "#ffffff",
            size: "sm",
            align: "center",
            margin: "md"
          }
        ],
        backgroundColor: "#722ed1",
        paddingAll: "20px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          // รหัสแนะนำ
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: referralCode,
                weight: "bold",
                size: "xxl",
                color: "#722ed1",
                align: "center",
                decoration: "none"
              },
              {
                type: "text",
                text: "คัดลอกแล้วแชร์ให้เพื่อน",
                size: "xs",
                color: "#8c8c8c",
                align: "center",
                margin: "sm"
              }
            ],
            spacing: "sm",
            margin: "lg",
            action: {
              type: "clipboard",
              clipboardText: referralCode
            }
          },
          // คำแนะนำ
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🎯 วิธีการแชร์:",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              },
              {
                type: "text",
                text: "• กดปุ่ม \"🎁 แชร์ให้เพื่อน\" เพื่อส่งการ์ดเชิญ\n• หรือคัดลอกรหัสด้านบนแล้วส่งเอง\n• เพื่อนพิมพ์ \"CODE:" + referralCode + "\"\n• คุณได้ 10 เครดิต เพื่อนได้ 5 เครดิต",
                color: "#8c8c8c",
                size: "xs",
                wrap: true,
                margin: "sm"
              }
            ],
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "uri",
              label: "🎁 แชร์ให้เพื่อน",
              uri: liffUrl  // ⭐ ใช้ LIFF URL แทน
            },
            color: "#722ed1",
            height: "md"
          },
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

// 🔧 การ์ดกรอกรหัสแนะนำ
function createReferralInputMessage() {
  return {
    type: "flex",
    altText: "💎 ใช้รหัสแนะนำ",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "💎",
            size: "xxl",
            align: "center",
            color: "#ffffff"
          },
          {
            type: "text",
            text: "ใช้รหัสแนะนำ",
            weight: "bold",
            color: "#ffffff",
            size: "xl",
            align: "center",
            margin: "md"
          }
        ],
        backgroundColor: "#177ddc",
        paddingAll: "25px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🎁 รับเครดิตฟรี 5 เครดิต",
            weight: "bold",
            size: "lg",
            color: "#177ddc",
            align: "center",
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📝 วิธีการใช้:",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              },
              {
                type: "text",
                text: "1️⃣ ขอรหัสแนะนำจากเพื่อน\n2️⃣ พิมพ์ในแชทนี้ตามรูปแบบ:\n    CODE:ABCDEF\n3️⃣ รับเครดิตฟรี 5 เครดิตทันที!",
                color: "#8c8c8c",
                size: "sm",
                wrap: true,
                margin: "sm"
              }
            ],
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💡 ตัวอย่าง:",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "CODE:A1B2C3",
                    weight: "bold",
                    size: "md",
                    color: "#49aa19",
                    align: "center",
                    decoration: "none",
                    backgroundColor: "#262626",
                    paddingAll: "12px"
                  }
                ],
                margin: "sm",
                cornerRadius: "8px",
                backgroundColor: "#262626"
              },
              {
                type: "text",
                text: "⚠️ ใช้ได้เพียงครั้งเดียวเท่านั้น",
                color: "#d89614",
                size: "xs",
                align: "center",
                margin: "sm"
              }
            ],
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "❓ ไม่มีรหัส? ขอจากเพื่อน",
              data: "action=share_to_get_referral"
            },
            color: "#177ddc",
            height: "md"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

// 🎉 การ์ดแจ้งเตือนการแนะนำสำเร็จ
function createReferralSuccessMessage(referrerData, referredData) {
  return {
    type: "flex",
    altText: "🎉 แนะนำเพื่อนสำเร็จ!",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🎉",
            size: "xxl",
            align: "center",
            color: "#ffffff"
          },
          {
            type: "text",
            text: "แนะนำเพื่อนสำเร็จ!",
            weight: "bold",
            color: "#ffffff",
            size: "xl",
            align: "center",
            margin: "md"
          }
        ],
        backgroundColor: "#49aa19",
        paddingAll: "25px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "+10",
                weight: "bold",
                size: "xxl",
                color: "#49aa19",
                align: "center"
              },
              {
                type: "text",
                text: "เครดิต",
                size: "lg",
                color: "#49aa19",
                align: "center",
                margin: "none"
              }
            ],
            spacing: "none",
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "👤",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "เพื่อนใหม่:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: referredData.name || "เพื่อน",
                    weight: "bold",
                    color: "#ffffff",
                    size: "sm",
                    flex: 3
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "💎",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "เครดิตรวม:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: `${referrerData.totalCredits} เครดิต`,
                    weight: "bold",
                    color: "#177ddc",
                    size: "lg",
                    flex: 3
                  }
                ],
                margin: "md"
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "👥",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "แนะนำแล้ว:",
                    color: "#8c8c8c",
                    size: "sm",
                    flex: 2,
                    margin: "sm"
                  },
                  {
                    type: "text",
                    text: `${referrerData.totalReferred} คน`,
                    weight: "bold",
                    color: "#ffffff",
                    size: "sm",
                    flex: 3
                  }
                ],
                margin: "md"
              }
            ],
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "text",
            text: "🌟 ยิ่งแชร์มาก ยิ่งได้เครดิตเยอะ!\nแชร์ต่อเพื่อรับเครดิตเพิ่มอีก",
            color: "#8c8c8c",
            size: "sm",
            wrap: true,
            align: "center",
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

// เพิ่มในไฟล์ AI-Server/utils/flexMessages.js

// 🎊 สร้าง Welcome Card สำหรับผู้ใช้ใหม่
function createWelcomeMessage(referralCode, displayName = 'เพื่อน') {
  return {
    type: "flex",
    altText: "🎊 ยินดีต้อนรับสู่ AI Bot!",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "🎊",
                size: "xxl",
                color: "#ffffff",
                flex: 0
              },
              {
                type: "text",
                text: "ยินดีต้อนรับ!",
                weight: "bold",
                color: "#ffffff",
                size: "xl",
                flex: 4,
                margin: "md"
              }
            ]
          },
          {
            type: "text",
            text: `สวัสดี ${displayName} 👋`,
            color: "#ffffff",
            size: "md",
            align: "center",
            margin: "md"
          }
        ],
        backgroundColor: "#722ed1",
        paddingAll: "25px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          // เครดิตฟรี
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🎁 ของขวัญต้อนรับ",
                weight: "bold",
                size: "lg",
                color: "#49aa19",
                align: "center"
              },
              {
                type: "text",
                text: "+10",
                weight: "bold",
                size: "xxl",
                color: "#49aa19",
                align: "center",
                margin: "sm"
              },
              {
                type: "text",
                text: "เครดิตฟรี",
                size: "md",
                color: "#49aa19",
                align: "center",
                margin: "none"
              }
            ],
            spacing: "none",
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          // รหัสแนะนำ
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🏷️ รหัสแนะนำของคุณ",
                weight: "bold",
                color: "#ffffff",
                size: "sm",
                align: "center"
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: referralCode,
                    weight: "bold",
                    size: "xl",
                    color: "#177ddc",
                    align: "center",
                    decoration: "none"
                  }
                ],
                backgroundColor: "#262626",
                cornerRadius: "8px",
                paddingAll: "12px",
                margin: "sm",
                action: {
                  type: "clipboard",
                  clipboardText: referralCode
                }
              },
              {
                type: "text",
                text: "👆 แตะเพื่อคัดลอก",
                size: "xs",
                color: "#8c8c8c",
                align: "center",
                margin: "sm"
              }
            ],
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          // ฟีเจอร์
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "✨ สิ่งที่คุณทำได้:",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "📸",
                        size: "sm",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "ส่งรูปภาพให้ AI วิเคราะห์",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm",
                        wrap: true
                      }
                    ]
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "📈",
                        size: "sm",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "ใช้ AI-Auto สำหรับ Forex",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm",
                        wrap: true
                      }
                    ],
                    margin: "sm"
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "👥",
                        size: "sm",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "แนะนำเพื่อนรับ 10 เครดิต/คน",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm",
                        wrap: true
                      }
                    ],
                    margin: "sm"
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "💎",
                        size: "sm",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "ใช้รหัสเพื่อนรับ 5 เครดิต",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm",
                        wrap: true
                      }
                    ],
                    margin: "sm"
                  }
                ],
                margin: "sm"
              }
            ],
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          // เริ่มใช้งาน
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🚀 พร้อมเริ่มต้นแล้ว!",
                weight: "bold",
                color: "#ffffff",
                size: "sm",
                align: "center"
              },
              {
                type: "text",
                text: "ส่งรูปภาพเพื่อให้ AI วิเคราะห์ หรือพิมพ์ \"AI-Auto\" เพื่อเทรด Forex",
                color: "#8c8c8c",
                size: "xs",
                wrap: true,
                align: "center",
                margin: "sm"
              }
            ],
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "🎁 แชร์รหัสแนะนำ",
              data: "action=view_referral_share"
            },
            color: "#722ed1",
            height: "md"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

// เพิ่มในไฟล์ AI-Server/utils/flexMessages.js

// 💎 สร้าง Credit Status Card พร้อมปุ่มติดต่อซัพพอร์ต
function createCreditStatusMessage(credits, displayName = 'คุณ') {
  // คำนวณสถานะเครดิต
  let statusText = '';
  let statusColor = '';
  let statusIcon = '';
  
  if (credits <= 0) {
    statusText = 'หมดเครดิต';
    statusColor = '#a61d24';
    statusIcon = '⚠️';
  } else if (credits <= 5) {
    statusText = 'เหลือน้อย';
    statusColor = '#d89614';
    statusIcon = '🔥';
  } else if (credits <= 20) {
    statusText = 'ปกติ';
    statusColor = '#49aa19';
    statusIcon = '✅';
  } else {
    statusText = 'เยอะมาก';
    statusColor = '#722ed1';
    statusIcon = '💎';
  }

  return {
    type: "flex",
    altText: `💎 เครดิตคงเหลือ ${credits} เครดิต`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "💎",
                size: "xl",
                color: "#ffffff",
                flex: 0
              },
              {
                type: "text",
                text: "สถานะเครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "lg",
                flex: 4,
                margin: "md"
              }
            ]
          },
          {
            type: "text",
            text: `ของ ${displayName}`,
            color: "#ffffff",
            size: "sm",
            align: "center",
            margin: "md"
          }
        ],
        backgroundColor: "#177ddc",
        paddingAll: "20px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          // เครดิตปัจจุบัน
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: `${credits}`,
                weight: "bold",
                size: "xxl",
                color: "#177ddc",
                align: "center"
              },
              {
                type: "text",
                text: "เครดิต",
                size: "lg",
                color: "#177ddc",
                align: "center",
                margin: "none"
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: statusIcon,
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: statusText,
                    weight: "bold",
                    color: statusColor,
                    size: "sm",
                    flex: 1,
                    margin: "sm",
                    align: "center"
                  }
                ],
                margin: "md",
                justifyContent: "center"
              }
            ],
            spacing: "none",
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          // ข้อมูลเพิ่มเติม
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📊 วิธีรับเครดิตเพิ่ม:",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "🎁",
                        size: "xs",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "แชร์รหัสแนะนำ = +10 เครดิต/คน",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm",
                        wrap: true
                      }
                    ]
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "💰",
                        size: "xs",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "ซื้อแพ็คเกจ = ราคาเริ่มต้น 10 บาท",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm",
                        wrap: true
                      }
                    ],
                    margin: "sm"
                  }
                ],
                margin: "sm"
              }
            ],
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "🎁 แชร์รหัสแนะนำ",
              data: "action=view_referral_share"
            },
            color: "#49aa19",
            height: "sm"
          },
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "💰 เติมเครดิต",
              data: "action=buy_credit_menu"
            },
            color: "#177ddc",
            height: "sm",
            margin: "sm"
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "🎧 ติดต่อซัพพอร์ต",
              data: "action=contact_support"
            },
            height: "sm",
            margin: "sm"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

// 🎧 สร้าง Support Contact Card
function createSupportContactMessage() {
  return {
    type: "flex",
    altText: "🎧 ติดต่อทีมซัพพอร์ต",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🎧",
            size: "xxl",
            align: "center",
            color: "#ffffff"
          },
          {
            type: "text",
            text: "ติดต่อทีมซัพพอร์ต",
            weight: "bold",
            color: "#ffffff",
            size: "xl",
            align: "center",
            margin: "md"
          }
        ],
        backgroundColor: "#49aa19",
        paddingAll: "25px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "👋 สวัสดีครับ!",
            weight: "bold",
            size: "lg",
            color: "#49aa19",
            align: "center",
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💬 ทีมซัพพอร์ตพร้อมช่วยเหลือ:",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "⏰",
                        size: "sm",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "เวลาทำการ: 09:00 - 18:00 น.",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm"
                      }
                    ]
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "📅",
                        size: "sm",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "จันทร์ - เสาร์ (ปิดวันอาทิตย์)",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm"
                      }
                    ],
                    margin: "sm"
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    contents: [
                      {
                        type: "text",
                        text: "⚡",
                        size: "sm",
                        flex: 0
                      },
                      {
                        type: "text",
                        text: "ตอบกลับเร็วภายใน 1 ชั่วโมง",
                        color: "#8c8c8c",
                        size: "xs",
                        flex: 4,
                        margin: "sm"
                      }
                    ],
                    margin: "sm"
                  }
                ],
                margin: "sm"
              }
            ],
            margin: "lg"
          },
          {
            type: "separator",
            margin: "xl",
            color: "#303030"
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🔧 สิ่งที่เราช่วยได้:",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              },
              {
                type: "text",
                text: "• ปัญหาการใช้งานบอท\n• การชำระเงินและเครดิต\n• ข้อสงสัยเกี่ยวกับ AI-Auto\n• การแนะนำและใช้รหัส\n• ข้อเสนอแนะต่างๆ",
                color: "#8c8c8c",
                size: "xs",
                wrap: true,
                margin: "sm"
              }
            ],
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "uri",
              label: "💬 แอดเพื่อนซัพพอร์ต",
              uri: "https://line.me/ti/p/@318vttpx"  // เปลี่ยนเป็น LINE ID ซัพพอร์ตจริง
            },
            color: "#49aa19",
            height: "md"
          },
          {
            type: "text",
            text: "กดปุ่มด้านบนเพื่อเพิ่มเพื่อนซัพพอร์ต",
            color: "#8c8c8c",
            size: "xs",
            align: "center",
            margin: "md"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#1f1f1f"
      }
    }
  };
}

module.exports = {
  createCreditPackagesMessage,
  createPaymentInfoMessage,
  createPaymentSuccessMessage,
  createForexPairsMessage,
  calculateNextTimeSlot,
  createContinueTradeMessage,
  // Referral System Cards
  createReferralShareMessage,
  createReferralInputMessage,
  createReferralSuccessMessage,
  // Welcome & User Interface Cards
  createWelcomeMessage,
  createCreditStatusMessage,
  createSupportContactMessage
};