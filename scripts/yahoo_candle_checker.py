# -*- coding: utf-8 -*-
# AI-Server/scripts/yahoo_candle_checker.py - แก้ไขใหม่ (รับเวลาเข้าเทรดที่เปลี่ยนทุกรอบ)

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
                "error": "❌ ต้องระบุ parameters: symbol entryTime round"
            }, ensure_ascii=False))
            sys.exit(1)
        
        symbol = sys.argv[1]          # เช่น "EUR/USD"
        entry_time_str = sys.argv[2]  # เช่น "15:15", "15:20", "15:25" (เปลี่ยนทุกรอบ)
        round_num = int(sys.argv[3])  # จะเป็น 1 เสมอ (เพราะ Node.js ส่งเวลาใหม่มาทุกรอบ)
        
        print(f"Debug: Yahoo Finance API - Symbol: {symbol}, Entry: {entry_time_str}, Round: {round_num}", file=sys.stderr)
        
        # แปลง symbol เป็น Yahoo Finance format
        yahoo_symbol = convert_to_yahoo_symbol(symbol)
        print(f"Debug: Yahoo symbol: {yahoo_symbol}", file=sys.stderr)
        
        # 🔥 คำนวณเวลาแบบง่าย: เวลาเข้าเทรด + 5 นาที = เวลาปิดแท่งเทียน
        target_timestamp = calculate_target_time_plus_5min(entry_time_str)
        if target_timestamp is None:
            print(json.dumps({
                "error": "❌ ไม่สามารถคำนวณเวลาได้"
            }, ensure_ascii=False))
            sys.exit(1)
        
        print(f"Debug: Target timestamp: {target_timestamp}", file=sys.stderr)
        print(f"Debug: Target time: {datetime.fromtimestamp(target_timestamp).strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
        
        # ดึงข้อมูลจาก Yahoo Finance
        candle_data = get_yahoo_candle_data(yahoo_symbol, target_timestamp)
        
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
            "actual_timestamp": candle_data['timestamp'],
            "volume": candle_data.get('volume', 0),
            "source": "Yahoo Finance"
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

def calculate_target_time_plus_5min(entry_time_str):
    """🔥 คำนวณเวลาแบบง่าย: เวลาเข้าเทรด + 5 นาที"""
    try:
        # แปลง "15:15" เป็น datetime
        hours, minutes = map(int, entry_time_str.split(':'))
        
        # คำนวณเวลาปิดแท่งเทียน = เวลาเข้าเทรด + 5 นาที
        target_minutes = minutes + 5
        target_hours = hours
        
        # จัดการกรณีที่นาทีเกิน 60
        if target_minutes >= 60:
            target_hours += target_minutes // 60
            target_minutes = target_minutes % 60
        
        # จัดการกรณีที่ชั่วโมงเกิน 24
        if target_hours >= 24:
            target_hours = target_hours % 24
        
        print(f"Debug: Entry {entry_time_str} + 5min = {target_hours:02d}:{target_minutes:02d}", file=sys.stderr)
        
        # สร้าง target time
        now = datetime.now()
        target_time = now.replace(hour=target_hours, minute=target_minutes, second=0, microsecond=0)
        
        # ถ้าเวลา target ยังไม่ถึง (ในอนาคต) ให้ใช้ย้อนหลัง 1 วัน
        if target_time > now:
            target_time = target_time - timedelta(days=1)
            print(f"Debug: Target in future, using yesterday: {target_time.strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
        
        # แปลงเป็น timestamp
        target_timestamp = int(time.mktime(target_time.timetuple()))
        
        print(f"Debug: Target time: {target_time.strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
        return target_timestamp
        
    except Exception as e:
        print(f"❌ Error calculating target time: {e}", file=sys.stderr)
        return None

def get_yahoo_candle_data(yahoo_symbol, target_timestamp):
    """ดึงข้อมูลแท่งเทียนจาก Yahoo Finance"""
    try:
        # คำนวณช่วงเวลาสำหรับดึงข้อมูล (ขยายช่วงเพื่อให้แน่ใจ)
        end_time = target_timestamp + (2 * 3600)    # +2 ชั่วโมง
        start_time = target_timestamp - (2 * 3600)  # -2 ชั่วโมง
        
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
        highs = indicators['high']
        lows = indicators['low']
        volumes = indicators.get('volume', [0] * len(timestamps))
        
        print(f"Debug: Got {len(timestamps)} data points", file=sys.stderr)
        
        # หาแท่งเทียนที่ใกล้เคียงกับ target_timestamp ที่สุด
        closest_index = None
        min_diff = float('inf')
        
        for i, ts in enumerate(timestamps):
            if (ts is None or opens[i] is None or closes[i] is None or 
                highs[i] is None or lows[i] is None):
                continue
                
            diff = abs(ts - target_timestamp)
            if diff < min_diff:
                min_diff = diff
                closest_index = i
        
        if closest_index is None:
            print(f"Debug: No valid candle found", file=sys.stderr)
            return None
        
        print(f"Debug: Found closest candle at index {closest_index}", file=sys.stderr)
        print(f"Debug: Time difference: {min_diff} seconds ({min_diff/60:.1f} minutes)", file=sys.stderr)
        
        # ส่งคืนข้อมูลแท่งเทียน
        return {
            'timestamp': timestamps[closest_index],
            'open': opens[closest_index],
            'high': highs[closest_index],
            'low': lows[closest_index],
            'close': closes[closest_index],
            'volume': volumes[closest_index] if volumes[closest_index] is not None else 0
        }
        
    except requests.RequestException as e:
        print(f"Debug: Network error: {str(e)}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Debug: Yahoo API error: {str(e)}", file=sys.stderr)
        return None

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

if __name__ == "__main__":
    main()