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

# รับพารามิเตอร์จาก command line
if len(sys.argv) < 3:
    print(json.dumps({"error": "ต้องระบุ symbol และ target_time"}, ensure_ascii=False))
    sys.exit()

symbol = sys.argv[1]  # เช่น EURUSD
target_time_str = sys.argv[2]  # เช่น 13:45

candle_size = 300  # 5 นาที = 300 วินาที

try:
    # ✅ เชื่อมต่อ IQ Option
    I_want_money = IQ_Option(USERNAME, PASSWORD)
    I_want_money.connect()
    if not I_want_money.check_connect():
        print(json.dumps({"error": "❌ ไม่สามารถเชื่อมต่อบัญชี IQ Option ได้"}, ensure_ascii=False))
        sys.exit()

    # 🕒 แปลง target_time เป็น timestamp
    hour, minute = target_time_str.split(':')
    now = datetime.now()
    target_time = now.replace(hour=int(hour), minute=int(minute), second=0, microsecond=0)
    
    # ถ้าเวลาที่ระบุยังไม่ถึง ให้ใช้ของเมื่อวาน
    if target_time > now:
        target_time -= timedelta(days=1)

    target_timestamp = int(time.mktime(target_time.timetuple()))

    # 📈 ดึงข้อมูลแท่งเทียน
    candles = I_want_money.get_candles(symbol, candle_size, 100, target_timestamp)

    # 🔍 หาแท่งที่ตรงกับเวลาที่ระบุ
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
            "time": target_time.strftime("%H:%M"),
            "candle_size": "5min",
            "open": round(open_price, 5),
            "close": round(close_price, 5),
            "color": color,
            "timestamp": target_timestamp
        }
    else:
        result = {"error": f"ไม่พบแท่งเทียนที่เวลา {target_time_str}"}

except Exception as e:
    result = {"error": f"เกิดข้อผิดพลาด: {str(e)}"}

# ✅ ส่งผลลัพธ์กลับให้ Node.js
print(json.dumps(result, ensure_ascii=False))