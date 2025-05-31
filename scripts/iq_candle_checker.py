# AI-Server/scripts/iq_candle_checker.py
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
        
        # ✅ เชื่อมต่อ IQ Option
        I_want_money = IQ_Option(USERNAME, PASSWORD)
        I_want_money.connect()
        
        if not I_want_money.check_connect():
            print(json.dumps({
                "error": "❌ ไม่สามารถเชื่อมต่อบัญชี IQ Option ได้"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # 🕒 คำนวณเวลาที่ต้องเช็ค
        target_timestamp = calculate_target_time(entry_time_str, round_num)
        
        if target_timestamp is None:
            print(json.dumps({
                "error": "❌ ไม่สามารถคำนวณเวลาได้"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # 📈 ดึงข้อมูลแท่งเทียน
        candles = I_want_money.get_candles(symbol, candle_size, 100, target_timestamp)
        
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
        
        # 📊 วิเคราะห์แท่งเทียน
        open_price = candle_at_target['open']
        close_price = candle_at_target['close']
        
        # กำหนดสีแท่งเทียน
        if close_price > open_price:
            color = "green"  # แท่งเขียว (ราคาขึ้น)
        elif close_price < open_price:
            color = "red"    # แท่งแดง (ราคาลง)
        else:
            color = "doji"   # แท่งเท่ากัน
        
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
        
        # ✅ ส่งผลลัพธ์กลับให้ Node.js
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({
            "error": f"❌ เกิดข้อผิดพลาด: {str(e)}"
        }, ensure_ascii=False))
        sys.exit(1)

def calculate_target_time(entry_time_str, round_num):
    """คำนวณเวลาที่ต้องเช็คแท่งเทียน"""
    try:
        print(f"🔢 Calculating target time for {entry_time_str}, round {round_num}", file=sys.stderr)
        
        # แปลง entry_time_str เป็น datetime
        # เช่น "17:45" -> datetime object
        hours, minutes = map(int, entry_time_str.split(':'))
        
        now = datetime.now()
        print(f"🕐 Current time: {now.strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
        
        # สร้างเวลาเข้าเทรดสำหรับวันนี้
        entry_time = now.replace(hour=hours, minute=minutes, second=0, microsecond=0)
        print(f"🎯 Entry time: {entry_time.strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
        
        # ถ้าเวลาเข้าเทรดเลยไปแล้วในวันนี้ ให้ใช้วันถัดไป (เฉพาะรอบ 1)
        if round_num == 1 and entry_time < now:
            entry_time = entry_time + timedelta(days=1)
            print(f"⏭️ Entry time moved to next day: {entry_time.strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
        
        # คำนวณเวลาปิดแท่งเทียนสำหรับรอบนั้นๆ
        # รอบ 1 = entry_time + 5 นาที
        # รอบ 2 = entry_time + 10 นาที
        # รอบ 3 = entry_time + 15 นาที
        # ... และอื่นๆ
        target_time = entry_time + timedelta(minutes=5 * round_num)
        print(f"⏰ Target candle time for round {round_num}: {target_time.strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
        
        # แปลงเป็น timestamp
        timestamp = int(time.mktime(target_time.timetuple()))
        print(f"📅 Target timestamp: {timestamp}", file=sys.stderr)
        
        return timestamp
        
    except Exception as e:
        print(f"❌ Error calculating target time: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    main()