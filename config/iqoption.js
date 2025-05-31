//AI-Server/config/iqoption.js - ไฟล์ config สำหรับ IQ Option
module.exports = {
    credentials: {
      username: process.env.IQ_OPTION_USERNAME || "your_email@example.com",
      password: process.env.IQ_OPTION_PASSWORD || "your_password"
    },
    
    // Mapping คู่เงิน
    symbolMapping: {
      'EUR/USD': 'EURUSD-OTC',
      'GBP/USD': 'GBPUSD-OTC', 
      'USD/JPY': 'USDJPY-OTC',
      'USD/CHF': 'USDCHF-OTC',
      'AUD/USD': 'AUDUSD-OTC',
      'NZD/USD': 'NZDUSD-OTC',
      'USD/CAD': 'USDCAD-OTC',
      'EUR/GBP': 'EURGBP-OTC',
      'EUR/JPY': 'EURJPY-OTC',
      'GBP/JPY': 'GBPJPY-OTC',
      'BTC/USD': 'BTCUSD',
      'GOLD': 'GOLD'
    },
    
    settings: {
      candleSize: 300, // 5 minutes
      maxRounds: 7,
      timeZone: 'Asia/Bangkok'
    }
  };