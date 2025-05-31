//AI-Server/utils/flexMessages.js
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

// สร้างการ์ดเชิญชวน
function createInvitationCard(referralCode, inviterName = 'เพื่อน') {
  return {
    type: "flex",
    altText: `🎁 คำเชิญจาก ${inviterName} - รับเครดิตฟรี!`,
    contents: {
      type: "bubble",
      size: "mega",
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
                size: "xxl",
                color: "#ffffff",
                flex: 0,
                margin: "none"
              },
              {
                type: "text",
                text: "คำเชิญพิเศษ!",
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
            text: `จาก ${inviterName}`,
            color: "#ffffff",
            size: "sm",
            margin: "sm",
            align: "center"
          }
        ],
        backgroundColor: "#ff6b6b",
        paddingAll: "20px",
        paddingBottom: "16px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          // คำเชิญชวน
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🚀 ขอเชิญใช้บริการ AI วิเคราะห์รูปภาพ",
                weight: "bold",
                size: "lg",
                color: "#2c2c2c",
                wrap: true,
                align: "center"
              },
              {
                type: "text",
                text: "✨ รับเครดิตฟรีเมื่อสมัครด้วยรหัสเชิญ!",
                size: "md",
                color: "#666666",
                wrap: true,
                align: "center",
                margin: "sm"
              }
            ],
            margin: "lg"
          },
          
          {
            type: "separator",
            margin: "xl",
            color: "#e0e0e0"
          },
          
          // รหัสเชิญและวิธีใช้
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🎯 รหัสเชิญของคุณ",
                weight: "bold",
                size: "md",
                color: "#2c2c2c"
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: referralCode,
                    weight: "bold",
                    size: "xxl",
                    color: "#ff6b6b",
                    align: "center"
                  }
                ],
                backgroundColor: "#fff5f5",
                cornerRadius: "8px",
                paddingAll: "12px",
                margin: "sm"
              },
              
              // วิธีใช้
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "📝 วิธีใช้ง่ายๆ เพียง 3 ขั้นตอน:",
                    weight: "bold",
                    size: "sm",
                    color: "#2c2c2c",
                    margin: "md"
                  },
                  {
                    type: "text",
                    text: "1️⃣ เพิ่มเพื่อน LINE Bot\n2️⃣ พิมพ์: รหัส:" + referralCode + "\n3️⃣ รับเครดิตฟรี 5 เครดิตทันที!",
                    size: "xs",
                    color: "#666666",
                    wrap: true,
                    margin: "sm"
                  }
                ]
              }
            ],
            margin: "lg"
          },
          
          {
            type: "separator",
            margin: "xl",
            color: "#e0e0e0"
          },
          
          // ข้อมูลเพิ่มเติม
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🎁 สิทธิพิเศษที่คุณจะได้รับ:",
                weight: "bold",
                size: "sm",
                color: "#2c2c2c"
              },
              {
                type: "text",
                text: "• เครดิตฟรี 5 เครดิต (มูลค่า 50 บาท)\n• เครดิตเริ่มต้น 10 เครดิต\n• AI วิเคราะห์รูปภาพได้ทันที\n• วิเคราะห์ Forex แบบ Real-time",
                size: "xs",
                color: "#666666",
                wrap: true,
                margin: "sm"
              }
            ],
            margin: "lg"
          },
          
          // คำแนะนำการแชร์
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💡 เมื่อคุณสมัครแล้ว คุณจะได้รหัสแชร์ของคุณเอง!",
                weight: "bold",
                size: "xs",
                color: "#ff6b6b",
                wrap: true,
                align: "center"
              },
              {
                type: "text",
                text: "แชร์ให้เพื่อนแล้วรับ 10 เครดิตฟรีต่อคน!",
                size: "xs",
                color: "#666666",
                wrap: true,
                align: "center",
                margin: "xs"
              }
            ],
            backgroundColor: "#fff5f5",
            cornerRadius: "8px",
            paddingAll: "12px",
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#ffffff"
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
              label: "🚀 เพิ่มเพื่อน LINE Bot",
              uri: "https://line.me/R/ti/p/@033mebpp"
            },
            color: "#ff6b6b",
            height: "sm"
          },
          {
            type: "text",
            text: "หลังจากเพิ่มเพื่อนแล้ว พิมพ์: รหัส:" + referralCode,
            size: "xs",
            color: "#999999",
            align: "center",
            margin: "sm"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#ffffff"
      }
    }
  };
}

// สร้างข้อความพร้อม Share Target Picker
function createShareMessage(referralCode, userName = 'คุณ') {
  return {
    type: "flex",
    altText: `แชร์รหัสเชิญ ${referralCode} ให้เพื่อน`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🎁 แชร์ให้เพื่อน",
            weight: "bold",
            color: "#ffffff",
            size: "lg",
            align: "center"
          },
          {
            type: "text",
            text: "รับ 10 เครดิตต่อการแนะนำ!",
            color: "#ffffff",
            size: "sm",
            align: "center",
            margin: "sm"
          }
        ],
        backgroundColor: "#4ecdc4",
        paddingAll: "20px"
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
                text: "รหัสแนะนำของคุณ",
                weight: "bold",
                size: "md",
                color: "#2c2c2c",
                align: "center"
              },
              {
                type: "text",
                text: referralCode,
                weight: "bold",
                size: "xxl",
                color: "#4ecdc4",
                align: "center",
                margin: "sm"
              }
            ],
            backgroundColor: "#f0ffff",
            cornerRadius: "8px",
            paddingAll: "16px",
            margin: "lg"
          },
          {
            type: "text",
            text: "💡 เลือกวิธีแชร์ที่ต้องการ:",
            weight: "bold",
            size: "sm",
            color: "#2c2c2c",
            margin: "lg"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#ffffff"
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
              label: "📤 แชร์ให้เพื่อนใน LINE",
              data: `action=share_invitation&referral_code=${referralCode}&type=line_share`
            },
            color: "#4ecdc4",
            height: "sm"
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "📋 คัดลอกข้อความเชิญ",
              data: `action=copy_invitation&referral_code=${referralCode}`
            },
            height: "sm",
            margin: "sm"
          },
          {
            type: "text",
            text: "💰 ทุกการแนะนำสำเร็จ = 10 เครดิตฟรี",
            size: "xs",
            color: "#999999",
            align: "center",
            margin: "md"
          }
        ],
        spacing: "sm",
        paddingAll: "20px",
        backgroundColor: "#ffffff"
      }
    }
  };
}

// อัปเดต module.exports
module.exports = {
  createCreditPackagesMessage,
  createPaymentInfoMessage,
  createPaymentSuccessMessage,
  createForexPairsMessage,
  calculateNextTimeSlot,
  createContinueTradeMessage,
  createInvitationCard,        // ← เพิ่มใหม่
  createShareMessage           // ← เพิ่มใหม่
};
