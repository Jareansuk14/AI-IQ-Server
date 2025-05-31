# -*- coding: utf-8 -*-
# AI-Server/scripts/iq_candle_checker.py
import sys
import io
import time
import json
import os
from iqoptionapi.stable_api import IQ_Option
from datetime import datetime, timedelta

# ทำให้รองรับ utf-8 บน Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 🔐 ใส่ข้อมูลบัญชีของคุณที่นี่ (ใช้ Environment Variables)
USERNAME = os.getenv('IQ_USERNAME', 'gerbera.ville@gmail.com')
PASSWORD = os.getenv('IQ_PASSWORD', 'Thefinal14')

def main():
    try:
        # รับ parameters จาก Node.js
        if len(sys.argv) < 4:
            print(json.dumps({
                "error": "❌ ต้องระบุ parameters: symbol entryTime round"
            }, ensure_ascii=False))
            sys.exit(1)
        
        symbol = sys.argv[1]  # เช่น "EURUSD"
        entry_time_str = sys.argv[2]  # เช่น "13:45"
        round_num = int(sys.argv[3])  # เช่น 1
        
        candle_size = 300  # 5 นาที = 300 วินาที
        
        # Debug: แสดงข้อมูลเริ่มต้น
        print(f"Debug: Trying to connect with {USERNAME}", file=sys.stderr)
        print(f"Debug: Parameters - Symbol: {symbol}, Entry: {entry_time_str}, Round: {round_num}", file=sys.stderr)
        
        # ✅ เชื่อมต่อ IQ Option
        try:
            I_want_money = IQ_Option(USERNAME, PASSWORD)
            print(f"Debug: Created IQ_Option instance", file=sys.stderr)
            
            I_want_money.connect()
            print(f"Debug: Called connect()", file=sys.stderr)
            
            if not I_want_money.check_connect():
                print(f"Debug: Connection check failed", file=sys.stderr)
                print(json.dumps({
                    "error": "❌ ไม่สามารถเชื่อมต่อบัญชี IQ Option ได้ - ตรวจสอบ email/password"
                }, ensure_ascii=False))
                sys.exit(1)
            
            print(f"Debug: Successfully connected to IQ Option!", file=sys.stderr)
            
            # 🎯 เปลี่ยนเป็น Demo Account
            I_want_money.change_balance("PRACTICE")
            print(f"Debug: Switched to PRACTICE account", file=sys.stderr)
            
        except Exception as conn_error:
            print(f"Debug: Connection exception: {str(conn_error)}", file=sys.stderr)
            print(json.dumps({
                "error": f"❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: {str(conn_error)}"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # 🕒 คำนวณเวลาที่ต้องเช็ค
        target_timestamp = calculate_target_time(entry_time_str, round_num)
        
        if target_timestamp is None:
            print(json.dumps({
                "error": "❌ ไม่สามารถคำนวณเวลาได้"
            }, ensure_ascii=False))
            sys.exit(1)
        
        print(f"Debug: Target timestamp: {target_timestamp}", file=sys.stderr)
        
        # 📈 ดึงข้อมูลแท่งเทียน
        try:
            print(f"Debug: Getting candles for {symbol}", file=sys.stderr)
            candles = I_want_money.get_candles(symbol, candle_size, 100, target_timestamp)
            print(f"Debug: Retrieved {len(candles) if candles else 0} candles", file=sys.stderr)
            
        except Exception as candle_error:
            print(f"Debug: Candle retrieval error: {str(candle_error)}", file=sys.stderr)
            print(json.dumps({
                "error": f"❌ ไม่สามารถดึงข้อมูลแท่งเทียนได้: {str(candle_error)}"
            }, ensure_ascii=False))
            sys.exit(1)
        
        if not candles:
            print(json.dumps({
                "error": "❌ ไม่พบข้อมูลแท่งเทียน"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # 🔍 หาแท่งที่ตรงกับเวลาที่ต้องการ
        candle_at_target = None
        for candle in candles:
            if candle['from'] == target_timestamp:
                candle_at_target = candle
                break
        
        if not candle_at_target:
            # ถ้าไม่พบแท่งที่ตรงเวลา ให้หาแท่งที่ใกล้เคียงที่สุด
            closest_candle = min(candles, key=lambda x: abs(x['from'] - target_timestamp))
            candle_at_target = closest_candle
            print(f"Debug: Used closest candle instead of exact match", file=sys.stderr)
        
        # 📊 วิเคราะห์แท่งเทียน
        open_price = candle_at_target['open']
        close_price = candle_at_target['close']
        
        print(f"Debug: Open: {open_price}, Close: {close_price}", file=sys.stderr)
        
        # กำหนดสีแท่งเทียน
        if close_price > open_price:
            color = "green"  # แท่งเขียว (ราคาขึ้น)
        elif close_price < open_price:
            color = "red"    # แท่งแดง (ราคาลง)
        else:
            color = "doji"   # แท่งเท่ากัน
        
        print(f"Debug: Candle color: {color}", file=sys.stderr)
        
        # สร้าง timestamp แสดงผล
        candle_time = datetime.fromtimestamp(candle_at_target['from'])
        display_time = candle_time.strftime("%H:%M")
        
        result = {
            "symbol": symbol,
            "time": display_time,
            "candle_size": "5min",
            "open": round(open_price, 5),
            "close": round(close_price, 5),
            "color": color,
            "round": round_num,
            "entry_time": entry_time_str,
            "target_timestamp": target_timestamp,
            "actual_timestamp": candle_at_target['from'],
            "volume": candle_at_target.get('volume', 0)
        }
        
        print(f"Debug: Final result prepared", file=sys.stderr)
        
        # ✅ ส่งผลลัพธ์กลับให้ Node.js
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(f"Debug: Main exception: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "error": f"❌ เกิดข้อผิดพลาด: {str(e)}"
        }, ensure_ascii=False))
        sys.exit(1)

def calculate_target_time(entry_time_str, round_num):
    """คำนวณเวลาที่ต้องเช็คแท่งเทียน"""
    try:
        # แปลง entry_time_str เป็น datetime
        # เช่น "13:45" -> datetime object
        hours, minutes = map(int, entry_time_str.split(':'))
        
        now = datetime.now()
        entry_time = now.replace(hour=hours, minute=minutes, second=0, microsecond=0)
        
        # ถ้าเวลาเข้าเทรดเลยไปแล้ว ให้ใช้วันถัดไป
        if entry_time < now:
            entry_time = entry_time + timedelta(days=1)
        
        # คำนวณเวลาปิดแท่งเทียนสำหรับรอบนั้นๆ
        # รอบ 1 = entry_time + 5 นาที
        # รอบ 2 = entry_time + 10 นาที
        # รอบ 3 = entry_time + 15 นาที
        target_time = entry_time + timedelta(minutes=5 * round_num)
        
        # แปลงเป็น timestamp
        return int(time.mktime(target_time.timetuple()))
        
    except Exception as e:
        print(f"❌ Error calculating target time: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    main()