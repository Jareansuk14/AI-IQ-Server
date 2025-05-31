#AI-Server/scripts/iq_candle_checker.py - สคริปต์ที่รับพารามิเตอร์
# -*- coding: utf-8 -*-
import sys
import io
import time
import json
from iqoptionapi.stable_api import IQ_Option
from datetime import datetime, timedelta

# ทำให้รองรับ utf-8 บน Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 🔐 ใส่ข้อมูลบัญชีของคุณที่นี่
USERNAME = "your_email@example.com"
PASSWORD = "your_password"

def main():
    if len(sys.argv) != 4:
        print(json.dumps({"error": "Usage: python script.py <symbol> <time> <date>"}, ensure_ascii=False))
        sys.exit(1)
    
    symbol = sys.argv[1]  # "EURUSD"
    target_time_str = sys.argv[2]  # "13:45"
    target_date_str = sys.argv[3]  # "2025-05-30"
    
    candle_size = 300  # 5 นาที = 300 วินาที

    # ✅ เชื่อมต่อ IQ Option
    try:
        I_want_money = IQ_Option(USERNAME, PASSWORD)
        I_want_money.connect()
        if not I_want_money.check_connect():
            print(json.dumps({"error": "❌ ไม่สามารถเชื่อมต่อบัญชี IQ Option ได้"}, ensure_ascii=False))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"❌ Connection error: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # 🕒 แปลง target_time เป็น timestamp
    try:
        # แปลง date string เป็น datetime
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
        
        # แปลง time string เป็น hour, minute
        time_parts = target_time_str.split(":")
        target_hour = int(time_parts[0])
        target_minute = int(time_parts[1])
        
        # รวม date + time
        target_time = target_date.replace(
            hour=target_hour, 
            minute=target_minute, 
            second=0, 
            microsecond=0
        )
        
        target_timestamp = int(time.mktime(target_time.timetuple()))
        
    except Exception as e:
        print(json.dumps({"error": f"❌ Time parsing error: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # 📈 ดึงข้อมูลแท่งเทียน
    try:
        candles = I_want_money.get_candles(symbol, candle_size, 1000, target_timestamp)
        
        if not candles:
            print(json.dumps({"error": "❌ ไม่ได้รับข้อมูลแท่งเทียน"}, ensure_ascii=False))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": f"❌ API error: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # 🔍 หาแท่งที่ตรงกับเวลาที่ต้องการ
    candle_at_target = next((c for c in candles if c['from'] == target_timestamp), None)

    if candle_at_target:
        open_price = candle_at_target['open']
        close_price = candle_at_target['close']
        
        if close_price > open_price:
            color = "green"
        elif close_price < open_price:
            color = "red" 
        else:
            color = "doji"

        result = {
            "symbol": symbol,
            "date": target_date_str,
            "time": target_time_str,
            "candle_size": "5min",
            "open": open_price,
            "close": close_price,
            "color": color,
            "timestamp": target_timestamp
        }
    else:
        result = {
            "error": f"ไม่พบแท่งเทียนที่เวลา {target_time_str} วันที่ {target_date_str}"
        }

    # ✅ ส่งผลลัพธ์กลับให้ Node.js
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()