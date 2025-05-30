# AI-Server/scripts/check_candle.py - Updated with better error handling
import sys
import json
import os
from datetime import datetime, timedelta

def check_candle(symbol, target_time, target_date=None):
    try:
        # ตรวจสอบว่ามี dependencies หรือไม่
        try:
            from iqoptionapi.stable_api import IQ_Option
        except ImportError as e:
            return {
                "success": False, 
                "error": f"Missing Python dependencies: {str(e)}. Please install: pip install iqoptionapi requests websocket-client"
            }
        
        # อ่าน credentials จาก environment
        email = os.getenv('IQ_EMAIL')
        password = os.getenv('IQ_PASSWORD')
        
        if not email or not password:
            return {
                "success": False, 
                "error": "IQ Option credentials not found. Please set IQ_EMAIL and IQ_PASSWORD environment variables."
            }
        
        # ตรวจสอบว่า credentials ไม่ใช่ default values
        if email == 'your_email@example.com' or password == 'your_password':
            return {
                "success": False,
                "error": "Please update IQ_EMAIL and IQ_PASSWORD with real credentials"
            }
        
        print(f"Attempting to connect to IQ Option with email: {email}", file=sys.stderr)
        
        # ล็อกอิน IQ Option
        api = IQ_Option(email, password)
        connect_result = api.connect()
        
        print(f"Connection result: {connect_result}", file=sys.stderr)
        
        if not api.check_connect():
            return {
                "success": False, 
                "error": "Failed to connect to IQ Option. Please check your credentials and internet connection."
            }
        
        print("Successfully connected to IQ Option", file=sys.stderr)
        
        # คำนวณ timestamp
        if target_date:
            try:
                target_datetime = datetime.strptime(f"{target_date} {target_time}", "%Y-%m-%d %H:%M")
            except ValueError:
                return {"success": False, "error": f"Invalid date format: {target_date}"}
        else:
            now = datetime.now()
            try:
                hour, minute = target_time.split(':')
                target_datetime = now.replace(
                    hour=int(hour), 
                    minute=int(minute), 
                    second=0, 
                    microsecond=0
                )
            except ValueError:
                return {"success": False, "error": f"Invalid time format: {target_time}"}
            
            # ถ้าเวลาที่ต้องการยังไม่มาถึง ให้ไปดูของเมื่อวาน
            if target_datetime > now:
                target_datetime -= timedelta(days=1)
        
        target_timestamp = int(target_datetime.timestamp())
        
        print(f"Fetching candle data for {symbol} at {target_datetime}", file=sys.stderr)
        
        # ดึงข้อมูลแท่งเทียน (5 นาที = 300 วินาที)
        try:
            candles = api.get_candles(symbol, 300, 1, target_timestamp)
        except Exception as api_error:
            return {
                "success": False, 
                "error": f"Error fetching candle data: {str(api_error)}"
            }
        
        if not candles or len(candles) == 0:
            return {
                "success": False, 
                "error": f"No candle data found for {symbol} at {target_datetime}. The market might be closed or the symbol might be invalid."
            }
        
        candle = candles[0]
        open_price = float(candle.get('open', 0))
        close_price = float(candle.get('close', 0))
        
        if open_price == 0 or close_price == 0:
            return {
                "success": False,
                "error": "Invalid price data received from IQ Option"
            }
        
        # กำหนดสีแท่งเทียน
        if close_price > open_price:
            color = "green"
        elif close_price < open_price:
            color = "red"
        else:
            color = "gray"
        
        print(f"Candle analysis: Open={open_price}, Close={close_price}, Color={color}", file=sys.stderr)
        
        return {
            "success": True,
            "candleColor": color,
            "openPrice": open_price,
            "closePrice": close_price,
            "timestamp": target_timestamp,
            "datetime": target_datetime.isoformat(),
            "symbol": symbol
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"Unexpected error: {error_msg}", file=sys.stderr)
        
        return {
            "success": False, 
            "error": f"Unexpected error: {error_msg}"
        }

def main():
    if len(sys.argv) < 3:
        result = {
            "success": False, 
            "error": "Usage: python check_candle.py <SYMBOL> <TIME> [DATE]"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    symbol = sys.argv[1]
    target_time = sys.argv[2]
    target_date = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Validate inputs
    if not symbol or not target_time:
        result = {
            "success": False,
            "error": "Symbol and time are required"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Check time format
    try:
        hour, minute = target_time.split(':')
        if not (0 <= int(hour) <= 23 and 0 <= int(minute) <= 59):
            raise ValueError("Invalid time range")
    except ValueError:
        result = {
            "success": False,
            "error": "Time must be in HH:MM format (24-hour)"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    result = check_candle(symbol, target_time, target_date)
    print(json.dumps(result))

if __name__ == "__main__":
    main()