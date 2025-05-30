//AI-Server/services/iqOptionService.js - Python Integration Service
const { spawn } = require('child_process');
const path = require('path');

class IQOptionService {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, '../scripts/check_candle.py');
  }

  // เรียก Python script เพื่อเช็คแท่งเทียน
  async checkCandle(symbol, targetTime, targetDate = null) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Checking candle for ${symbol} at ${targetTime}`);
        
        const pythonArgs = [
          this.pythonScriptPath,
          symbol,
          targetTime
        ];
        
        if (targetDate) {
          pythonArgs.push(targetDate);
        }
        
        const pythonProcess = spawn('python3', pythonArgs);
        
        let outputData = '';
        let errorData = '';
        
        pythonProcess.stdout.on('data', (data) => {
          outputData += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          errorData += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              // Parse JSON output จาก Python script
              const result = JSON.parse(outputData.trim());
              console.log('Python result:', result);
              resolve(result);
            } catch (parseError) {
              console.error('Error parsing Python output:', parseError);
              reject(parseError);
            }
          } else {
            console.error('Python script error:', errorData);
            reject(new Error(`Python script failed with code ${code}: ${errorData}`));
          }
        });
        
      } catch (error) {
        console.error('Error executing Python script:', error);
        reject(error);
      }
    });
  }

  // แปลงชื่อคู่เงินจาก LINE Bot format เป็น IQ Option format
  formatPairForIQ(pair) {
    const pairMap = {
      'EUR/USD': 'EURUSD',
      'GBP/USD': 'GBPUSD',
      'USD/JPY': 'USDJPY',
      'USD/CHF': 'USDCHF',
      'AUD/USD': 'AUDUSD',
      'NZD/USD': 'NZDUSD',
      'USD/CAD': 'USDCAD',
      'EUR/GBP': 'EURGBP',
      'EUR/JPY': 'EURJPY',
      'GBP/JPY': 'GBPJPY',
      'BTC/USD': 'BTCUSD',
      'GOLD': 'XAUUSD'
    };
    
    return pairMap[pair] || pair.replace('/', '');
  }
}

module.exports = new IQOptionService();