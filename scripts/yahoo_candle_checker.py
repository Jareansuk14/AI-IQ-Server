# -*- coding: utf-8 -*-
# AI-Server/scripts/yahoo_candle_checker.py
import sys
import io
import json
import requests
from datetime import datetime, timedelta
import time

# ทำให้รองรับ utf-8 บน Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    try:
        # รับ parameters จาก Node.js
        if len(sys.argv) < 4:
            print(json.dumps({
                "error": "❌ ต้องระบุ parameters: symbol entryTime round [expectedTimestamp]"
            }, ensure_ascii=False))
            sys.exit(1)
        
        symbol = sys.argv[1]  # เช่น "EURUSD"
        entry_time_str = sys.argv[2]  # เช่น "13:45"
        round_num = int(sys.argv[3])  # เช่น 1
        expected_timestamp = None
        
        # รับ expected timestamp ถ้ามีการส่งมา (optional parameter)
        if len(sys.argv) >= 5:
            try:
                expected_timestamp = int(sys.argv[4])
                print(f"Debug: Expected timestamp received: {expected_timestamp}", file=sys.stderr)
            except ValueError:
                print(f"Debug: Invalid expected timestamp: {sys.argv[4]}", file=sys.stderr)
        
        print(f"Debug: Yahoo Finance API - Symbol: {symbol}, Entry: {entry_time_str}, Round: {round_num}", file=sys.stderr)
        
        # แปลง symbol เป็น Yahoo Finance format
        yahoo_symbol = convert_to_yahoo_symbol(symbol)
        print(f"Debug: Yahoo symbol: {yahoo_symbol}", file=sys.stderr)
        
        # คำนวณ timestamp สำหรับรอบนั้นๆ
        target_timestamp = calculate_target_time(entry_time_str, round_num)
        if target_timestamp is None:
            print(json.dumps({
                "error": "❌ ไม่สามารถคำนวณเวลาได้"
            }, ensure_ascii=False))
            sys.exit(1)
        
        print(f"Debug: Calculated target timestamp: {target_timestamp}", file=sys.stderr)
        if expected_timestamp:
            print(f"Debug: Expected timestamp: {expected_timestamp}", file=sys.stderr)
            print(f"Debug: Timestamp difference: {abs(target_timestamp - expected_timestamp)} seconds", file=sys.stderr)
        
        # ดึงข้อมูลจาก Yahoo Finance
        candle_data = get_yahoo_candle_data(yahoo_symbol, target_timestamp, expected_timestamp)
        
        if candle_data is None:
            print(json.dumps({
                "error": "❌ ไม่สามารถดึงข้อมูลจาก Yahoo Finance ได้"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # วิเคราะห์สีแท่งเทียน
        open_price = candle_data['open']
        close_price = candle_data['close']
        
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
        candle_time = datetime.fromtimestamp(candle_data['timestamp'])
        display_time = candle_time.strftime("%H:%M")
        
        # คำนวณความแม่นยำของเวลา
        time_accuracy = calculate_time_accuracy(candle_data['timestamp'], expected_timestamp or target_timestamp)
        
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
            "expected_timestamp": expected_timestamp,
            "actual_timestamp": candle_data['timestamp'],
            "time_accuracy": time_accuracy,
            "volume": candle_data.get('volume', 0),
            "source": "Yahoo Finance",
            "candle_datetime": candle_time.isoformat(),
            "candle_datetime_bkk": candle_time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        print(f"Debug: Final result prepared with time accuracy", file=sys.stderr)
        
        # ✅ ส่งผลลัพธ์กลับให้ Node.js
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(f"Debug: Main exception: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "error": f"❌ เกิดข้อผิดพลาด: {str(e)}"
        }, ensure_ascii=False))
        sys.exit(1)

def calculate_time_accuracy(actual_timestamp, expected_timestamp):
    """คำนวณความแม่นยำของเวลา"""
    if expected_timestamp is None:
        return {
            "difference_seconds": 0,
            "difference_minutes": 0,
            "is_accurate": True,
            "note": "No expected timestamp provided"
        }
    
    diff_seconds = abs(actual_timestamp - expected_timestamp)
    diff_minutes = diff_seconds / 60
    is_accurate = diff_seconds <= 300  # ยอมรับความผิดพลาด 5 นาที
    
    return {
        "difference_seconds": diff_seconds,
        "difference_minutes": round(diff_minutes, 2),
        "is_accurate": is_accurate,
        "note": f"Actual vs Expected: {diff_seconds}s difference"
    }

def convert_to_yahoo_symbol(symbol):
    """แปลง symbol เป็น Yahoo Finance format"""
    
    # Forex pairs mapping
    forex_map = {
        'EURUSD': 'EURUSD=X',
        'EUR/USD': 'EURUSD=X',
        'GBPUSD': 'GBPUSD=X', 
        'GBP/USD': 'GBPUSD=X',
        'USDJPY': 'USDJPY=X',
        'USD/JPY': 'USDJPY=X',
        'USDCHF': 'USDCHF=X',
        'USD/CHF': 'USDCHF=X',
        'AUDUSD': 'AUDUSD=X',
        'AUD/USD': 'AUDUSD=X',
        'NZDUSD': 'NZDUSD=X',
        'NZD/USD': 'NZDUSD=X',
        'USDCAD': 'USDCAD=X',
        'USD/CAD': 'USDCAD=X',
        'EURGBP': 'EURGBP=X',
        'EUR/GBP': 'EURGBP=X',
        'EURJPY': 'EURJPY=X',
        'EUR/JPY': 'EURJPY=X',
        'GBPJPY': 'GBPJPY=X',
        'GBP/JPY': 'GBPJPY=X'
    }
    
    # Crypto pairs mapping  
    crypto_map = {
        'BTCUSD': 'BTC-USD',
        'BTC/USD': 'BTC-USD',
        'ETHUSD': 'ETH-USD',
        'ETH/USD': 'ETH-USD',
        'LTCUSD': 'LTC-USD',
        'LTC/USD': 'LTC-USD',
        'ADAUSD': 'ADA-USD',
        'ADA/USD': 'ADA-USD'
    }
    
    # Special cases
    special_map = {
        'GOLD': 'GC=F',  # Gold futures
        'XAUUSD': 'GC=F'
    }
    
    # ตรวจสอบแต่ละ mapping
    if symbol in forex_map:
        return forex_map[symbol]
    elif symbol in crypto_map:
        return crypto_map[symbol]
    elif symbol in special_map:
        return special_map[symbol]
    else:
        # ถ้าไม่พบ ลองใช้ตัวเดิม
        return symbol

def get_yahoo_candle_data(yahoo_symbol, target_timestamp, expected_timestamp=None):
    """ดึงข้อมูลแท่งเทียนจาก Yahoo Finance พร้อมตรวจสอบความแม่นยำของเวลา"""
    try:
        # ใช้ expected_timestamp ถ้ามี, ถ้าไม่มีใช้ target_timestamp
        reference_timestamp = expected_timestamp or target_timestamp
        
        # คำนวณช่วงเวลาสำหรับดึงข้อมูล - ขยายช่วงออกไปเพื่อความแน่ใจ
        end_time = reference_timestamp + (3600 * 12)    # +12 ชั่วโมง
        start_time = reference_timestamp - (3600 * 12)  # -12 ชั่วโมง
        
        # สร้าง URL สำหรับ Yahoo Finance API
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}"
        
        params = {
            'period1': start_time,
            'period2': end_time,
            'interval': '5m',  # 5 นาที
            'includePrePost': 'false'
        }
        
        print(f"Debug: Fetching from Yahoo API: {url}", file=sys.stderr)
        print(f"Debug: Time range: {datetime.fromtimestamp(start_time)} to {datetime.fromtimestamp(end_time)}", file=sys.stderr)
        print(f"Debug: Reference timestamp: {reference_timestamp} ({datetime.fromtimestamp(reference_timestamp)})", file=sys.stderr)
        
        # เรียก API
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        print(f"Debug: Got response from Yahoo", file=sys.stderr)
        
        # ตรวจสอบ response structure
        if 'chart' not in data or not data['chart']['result']:
            print(f"Debug: Invalid response structure", file=sys.stderr)
            return None
        
        result = data['chart']['result'][0]
        
        # ดึงข้อมูล timestamps และ prices
        timestamps = result['timestamp']
        indicators = result['indicators']['quote'][0]
        
        opens = indicators['open']
        closes = indicators['close']
        volumes = indicators.get('volume', [0] * len(timestamps))
        
        print(f"Debug: Got {len(timestamps)} data points", file=sys.stderr)
        
        # หาแท่งเทียนที่ใกล้เคียงกับ reference_timestamp ที่สุด
        closest_index = None
        min_diff = float('inf')
        
        for i, ts in enumerate(timestamps):
            if ts is None or opens[i] is None or closes[i] is None:
                continue
                
            diff = abs(ts - reference_timestamp)
            if diff < min_diff:
                min_diff = diff
                closest_index = i
        
        if closest_index is None:
            print(f"Debug: No valid candle found", file=sys.stderr)
            return None
        
        actual_timestamp = timestamps[closest_index]
        time_diff_minutes = min_diff / 60
        
        print(f"Debug: Found closest candle at index {closest_index}", file=sys.stderr)
        print(f"Debug: Time difference: {min_diff} seconds ({time_diff_minutes:.2f} minutes)", file=sys.stderr)
        print(f"Debug: Reference time: {datetime.fromtimestamp(reference_timestamp)}", file=sys.stderr)
        print(f"Debug: Actual candle time: {datetime.fromtimestamp(actual_timestamp)}", file=sys.stderr)
        
        # เตือนถ้าความแตกต่างของเวลามากเกินไป
        if time_diff_minutes > 5:
            print(f"Warning: Large time difference detected: {time_diff_minutes:.2f} minutes", file=sys.stderr)
        
        # ส่งคืนข้อมูลแท่งเทียน
        return {
            'timestamp': actual_timestamp,
            'open': opens[closest_index],
            'close': closes[closest_index],
            'volume': volumes[closest_index] if volumes[closest_index] is not None else 0,
            'time_difference_seconds': min_diff,
            'time_difference_minutes': time_diff_minutes
        }
        
    except requests.RequestException as e:
        print(f"Debug: Network error: {str(e)}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Debug: Yahoo API error: {str(e)}", file=sys.stderr)
        return None

def calculate_target_time(entry_time_str, round_num):
    """คำนวณเวลาที่ต้องเช็คแท่งเทียน"""
    try:
        # แปลง entry_time_str เป็น datetime
        hours, minutes = map(int, entry_time_str.split(':'))
        
        now = datetime.now()
        entry_time = now.replace(hour=hours, minute=minutes, second=0, microsecond=0)
        
        # ถ้าเวลาเข้าเทรดเลยไปแล้ว ให้ปรับให้เป็นช่วงเวลาที่เหมาะสม
        if entry_time > now:
            entry_time = entry_time - timedelta(days=1)
        
        # คำนวณเวลาปิดแท่งเทียนสำหรับรอบนั้นๆ
        target_time = entry_time + timedelta(minutes=5 * round_num)
        
        # แปลงเป็น timestamp
        target_timestamp = int(time.mktime(target_time.timetuple()))
        
        print(f"Debug: Entry time: {entry_time}", file=sys.stderr)
        print(f"Debug: Target time for round {round_num}: {target_time}", file=sys.stderr)
        print(f"Debug: Target timestamp: {target_timestamp}", file=sys.stderr)
        
        return target_timestamp
        
    except Exception as e:
        print(f"❌ Error calculating target time: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    main()