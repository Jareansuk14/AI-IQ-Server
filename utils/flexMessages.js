// สร้าง Flex Message สำหรับแสดงแพ็คเกจเติมเครดิต (Dark Sci-Fi Theme)
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

  // คำนวณเวลาที่เหลือ
  const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 60000));
  const timeLeftText = timeLeft > 0 ? `⏰ เหลือ ${timeLeft} นาที` : '⚠️ หมดอายุแล้ว';

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
                    color: timeLeft > 0 ? "#d89614" : "#a61d24",
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
                    color: timeLeft > 0 ? "#49aa19" : "#a61d24",
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

module.exports = {
  createCreditPackagesMessage,
  createPaymentInfoMessage,
  createPaymentSuccessMessage
};