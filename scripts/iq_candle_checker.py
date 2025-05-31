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

# รับพารามิเตอร์จาก command line
if len(sys.argv) < 4:
    print(json.dumps({
        "error": "ต้องระบุ symbol, target_date และ target_time", 
        "usage": "python script.py <SYMBOL> <YYYY-MM-DD> <HH:MM>"
    }, ensure_ascii=False))
    sys.exit()

symbol = sys.argv[1]  # เช่น EURUSD
target_date_str = sys.argv[2]  # เช่น 2024-05-30
target_time_str = sys.argv[3]  # เช่น 13:45

candle_size = 300  # 5 นาที = 300 วินาที

try:
    # ตรวจสอบรูปแบบวันที่และเวลา
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        target_time_parts = target_time_str.split(':')
        hour = int(target_time_parts[0])
        minute = int(target_time_parts[1])
        
        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            raise ValueError("Invalid time range")
            
    except ValueError as ve:
        print(json.dumps({
            "error": f"รูปแบบวันที่หรือเวลาไม่ถูกต้อง: {ve}",
            "expected_date": "YYYY-MM-DD",
            "expected_time": "HH:MM"
        }, ensure_ascii=False))
        sys.exit()

    # ✅ เชื่อมต่อ IQ Option
    I_want_money = IQ_Option(USERNAME, PASSWORD)
    I_want_money.connect()
    if not I_want_money.check_connect():
        print(json.dumps({
            "error": "❌ ไม่สามารถเชื่อมต่อบัญชี IQ Option ได้",
            "details": "กรุณาตรวจสอบ username และ password"
        }, ensure_ascii=False))
        sys.exit()

    # 🕒 สร้าง datetime object จากวันที่และเวลาที่ระบุ
    target_datetime = datetime.combine(target_date, datetime.min.time().replace(hour=hour, minute=minute))
    
    # แปลงเป็น timestamp (UTC)
    target_timestamp = int(time.mktime(target_datetime.timetuple()))
    
    print(json.dumps({
        "debug": {
            "symbol": symbol,
            "target_date": target_date_str,
            "target_time": target_time_str,
            "target_datetime": target_datetime.isoformat(),
            "target_timestamp": target_timestamp
        }
    }, ensure_ascii=False), file=sys.stderr)

    # 📈 ดึงข้อมูลแท่งเทียน (ขยายช่วงเวลาเพื่อให้แน่ใจว่าจะเจอข้อมูล)
    candles = I_want_money.get_candles(symbol, candle_size, 200, target_timestamp)

    if not candles:
        print(json.dumps({
            "error": f"ไม่พบข้อมูลแท่งเทียนสำหรับ {symbol}",
            "target_date": target_date_str,
            "target_time": target_time_str
        }, ensure_ascii=False))
        sys.exit()

    # 🔍 หาแท่งที่ใกล้เคียงกับเวลาที่ระบุมากที่สุด
    best_match = None
    min_time_diff = float('inf')
    
    for candle in candles:
        candle_timestamp = candle['from']
        time_diff = abs(candle_timestamp - target_timestamp)
        
        if time_diff < min_time_diff:
            min_time_diff = time_diff
            best_match = candle

    if best_match:
        open_price = best_match['open']
        close_price = best_match['close']
        
        if close_price > open_price:
            color = "green"
        elif close_price < open_price:
            color = "red"
        else:
            color = "doji"

        # แปลง timestamp กลับเป็นวันที่และเวลา
        candle_datetime = datetime.fromtimestamp(best_match['from'])
        candle_date = candle_datetime.strftime("%Y-%m-%d")
        candle_time = candle_datetime.strftime("%H:%M")
        
        # คำนวณความแตกต่างของเวลา
        time_diff_minutes = min_time_diff // 60

        result = {
            "symbol": symbol,
            "requested_date": target_date_str,
            "requested_time": target_time_str,
            "date": candle_date,
            "time": candle_time,
            "candle_size": "5min",
            "open": round(open_price, 5),
            "close": round(close_price, 5),
            "color": color,
            "timestamp": best_match['from'],
            "time_difference_minutes": int(time_diff_minutes),
            "is_exact_match": time_diff_minutes == 0
        }
        
        # เตือนหากเวลาไม่ตรงพอดี
        if time_diff_minutes > 0:
            result["warning"] = f"ไม่พบแท่งเทียนที่เวลาที่ระบุ ใช้แท่งที่ใกล้เคียงที่สุด (ห่าง {time_diff_minutes} นาที)"
            
    else:
        result = {
            "error": f"ไม่พบแท่งเทียนสำหรับ {symbol} ในช่วงเวลาที่ระบุ",
            "target_date": target_date_str,
            "target_time": target_time_str,
            "candles_found": len(candles)
        }

except Exception as e:
    result = {
        "error": f"เกิดข้อผิดพลาด: {str(e)}",
        "symbol": symbol if 'symbol' in locals() else "unknown",
        "target_date": target_date_str if 'target_date_str' in locals() else "unknown",
        "target_time": target_time_str if 'target_time_str' in locals() else "unknown"
    }

# ✅ ส่งผลลัพธ์กลับให้ Node.js
print(json.dumps(result, ensure_ascii=False))