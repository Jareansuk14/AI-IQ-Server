# -*- coding: utf-8 -*-
# AI-Server/scripts/yahoo_candle_checker.py
import sys
import os
import io
import json
import requests
from datetime import datetime
import time

# เพิ่ม path ของ scripts folder เพื่อใช้ pytz local
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pytz

# ทำให้รองรับ utf-8 บน Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    try:
        # รับ parameters จาก Node.js
        if len(sys.argv) < 4:
            print(json.dumps({
                "error": "❌ ต้องระบุ parameters: symbol targetDateTime round"
            }, ensure_ascii=False))
            sys.exit(1)
        
        symbol = sys.argv[1]  # เช่น "EUR/USD"
        target_datetime_str = sys.argv[2]  # เช่น "2025-05-31 23:05"
        round_num = int(sys.argv[3])  # เช่น 1
        
        print(f"Debug: Yahoo Finance API - Symbol: {symbol}, Target: {target_datetime_str}, Round: {round_num}", file=sys.stderr)
        
        # แปลง symbol เป็น Yahoo Finance format
        yahoo_symbol = convert_to_yahoo_symbol(symbol)
        print(f"Debug: Yahoo symbol: {yahoo_symbol}", file=sys.stderr)
        
        # ตั้งค่า timezone
        thai_tz = pytz.timezone("Asia/Bangkok")
        
        # แปลง target datetime string เป็น datetime object ในเขตเวลาไทย
        thai_dt = thai_tz.localize(datetime.strptime(target_datetime_str, "%Y-%m-%d %H:%M"))
        
        # แปลงเป็น UTC
        utc_dt = thai_dt.astimezone(pytz.utc)
        
        print(f"Debug: Thai time: {thai_dt}", file=sys.stderr)
        print(f"Debug: UTC time: {utc_dt}", file=sys.stderr)
        
        # ดึงข้อมูลจาก Yahoo Finance
        candle_data = get_yahoo_candle_data(yahoo_symbol, utc_dt, thai_tz)
        
        if candle_data is None:
            print(json.dumps({
                "error": "❌ ไม่สามารถดึงข้อมูลจาก Yahoo Finance ได้"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # วิเคราะห์สีแท่งเทียน
        open_price = float(candle_data['open'])
        close_price = float(candle_data['close'])
        
        print(f"Debug: Open: {open_price}, Close: {close_price}", file=sys.stderr)
        
        # กำหนดสีแท่งเทียน
        if close_price > open_price:
            color = "green"  # แท่งเขียว (ราคาขึ้น)
        elif close_price < open_price:
            color = "red"    # แท่งแดง (ราคาลง)
        else:
            color = "doji"   # แท่งเท่ากัน
        
        print(f"Debug: Candle color: {color}", file=sys.stderr)
        
        # สร้าง timestamp แสดงผล (เวลาไทย)
        candle_time_thai = candle_data['thai_time']
        
        result = {
            "symbol": symbol,
            "time": candle_time_thai,
            "candle_size": "5min",
            "open": round(open_price, 5),
            "close": round(close_price, 5),
            "color": color,
            "round": round_num,
            "target_datetime": target_datetime_str,
            "utc_datetime": utc_dt.strftime("%Y-%m-%d %H:%M"),
            "volume": candle_data.get('volume', 0),
            "source": "Yahoo Finance HTTP API"
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

def get_yahoo_candle_data(yahoo_symbol, utc_dt, thai_tz):
    """ดึงข้อมูลแท่งเทียนจาก Yahoo Finance ด้วย HTTP API"""
    try:
        print(f"Debug: Fetching data for {yahoo_symbol}", file=sys.stderr)
        
        # คำนวณช่วงเวลาสำหรับดึงข้อมูล (UTC timestamps)
        target_timestamp = int(utc_dt.timestamp())
        
        # ขยายช่วงเวลาออกไป เพื่อให้แน่ใจว่าได้ข้อมูล
        end_time = target_timestamp + (3600 * 12)  # +12 ชั่วโมง
        start_time = target_timestamp - (3600 * 12)  # -12 ชั่วโมง
        
        # สร้าง URL สำหรับ Yahoo Finance API
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}"
        
        params = {
            'period1': start_time,
            'period2': end_time,
            'interval': '5m',  # 5 นาที
            'includePrePost': 'false'
        }
        
        print(f"Debug: Fetching from Yahoo API: {url}", file=sys.stderr)
        print(f"Debug: Target timestamp: {target_timestamp}", file=sys.stderr)
        
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
        
        # หาแท่งเทียนที่เวลาตรงกับ target_timestamp ที่สุด
        closest_index = None
        min_diff = float('inf')
        
        for i, ts in enumerate(timestamps):
            if ts is None or opens[i] is None or closes[i] is None:
                continue
                
            diff = abs(ts - target_timestamp)
            if diff < min_diff:
                min_diff = diff
                closest_index = i
        
        if closest_index is None:
            print(f"Debug: No valid candle found", file=sys.stderr)
            return None
        
        print(f"Debug: Found closest candle at index {closest_index}, diff: {min_diff} seconds", file=sys.stderr)
        
        # แปลงเวลากลับเป็น timezone ไทย
        candle_timestamp = timestamps[closest_index]
        candle_utc = datetime.fromtimestamp(candle_timestamp, tz=pytz.utc)
        candle_thai = candle_utc.astimezone(thai_tz)
        
        print(f"Debug: Candle time (Thai): {candle_thai.strftime('%Y-%m-%d %H:%M')}", file=sys.stderr)
        
        # ส่งคืนข้อมูลแท่งเทียน
        return {
            'open': opens[closest_index],
            'close': closes[closest_index],
            'volume': volumes[closest_index] if volumes[closest_index] is not None else 0,
            'thai_time': candle_thai.strftime('%Y-%m-%d %H:%M'),
            'timestamp': candle_timestamp
        }
        
    except requests.RequestException as e:
        print(f"Debug: Network error: {str(e)}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Debug: Yahoo API error: {str(e)}", file=sys.stderr)
        return None

if __name__ == "__main__":
    main()