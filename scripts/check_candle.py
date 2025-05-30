# AI-Server/scripts/check_candle.py - Python Script สำหรับเช็คแท่งเทียน
import sys
import json
from iqoptionapi.stable_api import IQ_Option
from datetime import datetime, timedelta
import os

def check_candle(symbol, target_time, target_date=None):
    try:
        # อ่าน credentials จาก environment
        email = os.getenv('IQ_EMAIL', 'your_email@example.com')
        password = os.getenv('IQ_PASSWORD', 'your_password')
        
        # ล็อกอิน IQ Option
        api = IQ_Option(email, password)
        api.connect()
        
        if not api.check_connect():
            return {"success": False, "error": "Failed to connect to IQ Option"}
        
        # คำนวณ timestamp
        if target_date:
            target_datetime = datetime.strptime(f"{target_date} {target_time}", "%Y-%m-%d %H:%M")
        else:
            now = datetime.now()
            target_datetime = now.replace(
                hour=int(target_time.split(':')[0]), 
                minute=int(target_time.split(':')[1]), 
                second=0, 
                microsecond=0
            )
            
            # ถ้าเวลาที่ต้องการยังไม่มาถึง ให้ไปดูของเมื่อวาน
            if target_datetime > now:
                target_datetime -= timedelta(days=1)
        
        target_timestamp = int(target_datetime.timestamp())
        
        # ดึงข้อมูลแท่งเทียน (5 นาที = 300 วินาที)
        candles = api.get_candles(symbol, 300, 1, target_timestamp)
        
        if not candles:
            return {"success": False, "error": "No candle data found"}
        
        candle = candles[0]
        open_price = candle['open']
        close_price = candle['close']
        
        # กำหนดสีแท่งเทียน
        if close_price > open_price:
            color = "green"
        elif close_price < open_price:
            color = "red"
        else:
            color = "gray"
        
        return {
            "success": True,
            "candleColor": color,
            "openPrice": open_price,
            "closePrice": close_price,
            "timestamp": target_timestamp,
            "datetime": target_datetime.isoformat()
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments"}))
        sys.exit(1)
    
    symbol = sys.argv[1]
    target_time = sys.argv[2]
    target_date = sys.argv[3] if len(sys.argv) > 3 else None
    
    result = check_candle(symbol, target_time, target_date)
    print(json.dumps(result))