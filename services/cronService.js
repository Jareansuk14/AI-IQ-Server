//AI-Server/services/cronService.js - Service สำหรับ Scheduler
const cron = require('node-cron');
const trackingService = require('./trackingService');

class CronService {
  
  start() {
    console.log('🕐 Starting tracking cron jobs...');
    
    // เช็คผลทุก 1 นาที (จะกรองเฉพาะที่ถึงเวลาแล้ว)
    cron.schedule('*/1 * * * *', async () => {
      try {
        await trackingService.checkTrackingResults();
      } catch (error) {
        console.error('Cron tracking error:', error);
      }
    });
    
    console.log('✅ Tracking cron jobs started');
  }
  
  stop() {
    cron.destroy();
    console.log('⏹️ Tracking cron jobs stopped');
  }
}

module.exports = new CronService();