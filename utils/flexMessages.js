// สร้าง Flex Message สำหรับแสดงแพ็คเกจเติมเครดิต
function createCreditPackagesMessage() {
  return {
    type: "flex",
    altText: "แพ็คเกจเติมเครดิต",
    contents: {
      type: "carousel",
      contents: [
        // แพ็คเกจ 1 เครดิต
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💎 1 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              }
            ],
            backgroundColor: "#FF6B6B",
            paddingTop: "19px",
            paddingAll: "12px",
            paddingBottom: "16px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "10 บาท",
                weight: "bold",
                size: "xxl",
                margin: "md"
              },
              {
                type: "text",
                text: "เหมาะสำหรับทดลองใช้",
                size: "xs",
                color: "#aaaaaa",
                wrap: true
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
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
                  label: "เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=1_credit"
                },
                color: "#FF6B6B"
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
          }
        },
        // แพ็คเกจ 10 เครดิต
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💎 10 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              }
            ],
            backgroundColor: "#4ECDC4",
            paddingTop: "19px",
            paddingAll: "12px",
            paddingBottom: "16px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "100 บาท",
                weight: "bold",
                size: "xxl",
                margin: "md"
              },
              {
                type: "text",
                text: "ยอดนิยม!",
                size: "xs",
                color: "#aaaaaa",
                wrap: true
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
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
                  label: "เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=10_credit"
                },
                color: "#4ECDC4"
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
          }
        },
        // แพ็คเกจ 20 เครดิต
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💎 20 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              }
            ],
            backgroundColor: "#45B7D1",
            paddingTop: "19px",
            paddingAll: "12px",
            paddingBottom: "16px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "200 บาท",
                weight: "bold",
                size: "xxl",
                margin: "md"
              },
              {
                type: "text",
                text: "คุ้มค่า",
                size: "xs",
                color: "#aaaaaa",
                wrap: true
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
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
                  label: "เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=20_credit"
                },
                color: "#45B7D1"
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
          }
        },
        // แพ็คเกจ 50 เครดิต
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💎 50 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              }
            ],
            backgroundColor: "#96CEB4",
            paddingTop: "19px",
            paddingAll: "12px",
            paddingBottom: "16px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "500 บาท",
                weight: "bold",
                size: "xxl",
                margin: "md"
              },
              {
                type: "text",
                text: "ประหยัด",
                size: "xs",
                color: "#aaaaaa",
                wrap: true
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
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
                  label: "เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=50_credit"
                },
                color: "#96CEB4"
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
          }
        },
        // แพ็คเกจ 100 เครดิต
        {
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💎 100 เครดิต",
                weight: "bold",
                color: "#ffffff",
                size: "sm"
              }
            ],
            backgroundColor: "#FECA57",
            paddingTop: "19px",
            paddingAll: "12px",
            paddingBottom: "16px"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "1,000 บาท",
                weight: "bold",
                size: "xxl",
                margin: "md"
              },
              {
                type: "text",
                text: "คุ้มที่สุด!",
                size: "xs",
                color: "#aaaaaa",
                wrap: true
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
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
                  label: "เลือกแพ็คเกจนี้",
                  data: "action=buy_credit&package=100_credit"
                },
                color: "#FECA57"
              }
            ],
            spacing: "sm",
            paddingAll: "13px"
          }
        }
      ]
    }
  };
}

// สร้าง Flex Message สำหรับแสดงข้อมูลการชำระเงิน
function createPaymentInfoMessage(paymentTransaction, qrCodeURL) {
  const packageNames = {
    '1_credit': '1 เครดิต',
    '10_credit': '10 เครดิต',
    '20_credit': '20 เครดิต',
    '50_credit': '50 เครดิต',
    '100_credit': '100 เครดิต'
  };

  const expiresAt = new Date(paymentTransaction.expiresAt);
  const expiresTime = expiresAt.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Bangkok'
  });

  return {
    type: "flex",
    altText: `การชำระเงิน ${packageNames[paymentTransaction.packageType]}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "💳 การชำระเงิน",
            weight: "bold",
            color: "#ffffff",
            size: "lg"
          }
        ],
        backgroundColor: "#42A5F5",
        paddingAll: "20px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "แพ็คเกจ:",
                color: "#666666",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: packageNames[paymentTransaction.packageType],
                weight: "bold",
                color: "#111111",
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
                text: "จำนวนเงิน:",
                color: "#666666",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: `${paymentTransaction.totalAmount.toFixed(2)} บาท`,
                weight: "bold",
                color: "#111111",
                size: "lg",
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
                text: "หมดอายุ:",
                color: "#666666",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: expiresTime,
                weight: "bold",
                color: "#FF5722",
                size: "sm",
                flex: 3
              }
            ]
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "text",
            text: "📱 กดปุ่มด้านล่างเพื่อเปิดหน้าชำระเงิน",
            color: "#666666",
            size: "sm",
            margin: "md",
            wrap: true
          }
        ],
        spacing: "sm",
        paddingAll: "20px"
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
              label: "เปิดหน้าชำระเงิน",
              uri: qrCodeURL
            },
            color: "#42A5F5"
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "ยกเลิก",
              data: `action=cancel_payment&payment_id=${paymentTransaction._id}`
            }
          }
        ],
        spacing: "sm",
        paddingAll: "20px"
      }
    }
  };
}

module.exports = {
  createCreditPackagesMessage,
  createPaymentInfoMessage
};