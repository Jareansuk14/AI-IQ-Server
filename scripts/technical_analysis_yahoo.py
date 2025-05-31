# -*- coding: utf-8 -*-
# AI-Server/scripts/technical_analysis_yahoo.py
"""
Technical Analysis Script using Yahoo Finance
ดึงข้อมูล OHLCV และคำนวณ EMA + Bollinger Bands + Stochastic
"""

import sys
import io
import json
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings

# ปิด warnings
warnings.filterwarnings('ignore')

# ทำให้รองรับ utf-8 บน Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    try:
        # รับ parameters จาก Node.js
        if len(sys.argv) < 2:
            print(json.dumps({
                "error": "❌ ต้องระบุ symbol เช่น: python script.py EURUSD"
            }, ensure_ascii=False))
            sys.exit(1)
        
        symbol = sys.argv[1]  # เช่น "EURUSD" หรือ "BTC/USD"
        
        print(f"🔍 Analyzing {symbol} with Technical Indicators...", file=sys.stderr)
        
        # แปลง symbol เป็น Yahoo Finance format
        yahoo_symbol = convert_to_yahoo_symbol(symbol)
        print(f"📈 Yahoo symbol: {yahoo_symbol}", file=sys.stderr)
        
        # ดึงข้อมูลจาก Yahoo Finance
        data = fetch_yahoo_data(yahoo_symbol)
        
        if data is None or len(data) < 50:
            print(json.dumps({
                "error": "❌ ไม่สามารถดึงข้อมูลเพียงพอสำหรับการวิเคราะห์"
            }, ensure_ascii=False))
            sys.exit(1)
        
        print(f"📊 Got {len(data)} data points", file=sys.stderr)
        
        # คำนวณ Technical Indicators
        indicators = calculate_technical_indicators(data)
        
        # วิเคราะห์และให้สัญญาณ
        signal_analysis = analyze_signals(indicators, data)
        
        # สร้างผลลัพธ์
        result = {
            "symbol": symbol,
            "yahoo_symbol": yahoo_symbol,
            "timestamp": datetime.now().isoformat(),
            "current_price": float(data['Close'].iloc[-1]),
            "previous_close": float(data['Close'].iloc[-2]),
            "change": float(data['Close'].iloc[-1] - data['Close'].iloc[-2]),
            "change_percent": float(((data['Close'].iloc[-1] - data['Close'].iloc[-2]) / data['Close'].iloc[-2]) * 100),
            
            # Technical Indicators
            "technical_indicators": {
                "ema_14": round(float(indicators['EMA_14'].iloc[-1]), 5),
                "ema_50": round(float(indicators['EMA_50'].iloc[-1]), 5),
                "bb_upper": round(float(indicators['BB_Upper'].iloc[-1]), 5),
                "bb_middle": round(float(indicators['BB_Middle'].iloc[-1]), 5),
                "bb_lower": round(float(indicators['BB_Lower'].iloc[-1]), 5),
                "stoch_k": round(float(indicators['Stoch_K'].iloc[-1]), 2),
                "stoch_d": round(float(indicators['Stoch_D'].iloc[-1]), 2),
                "bb_position": signal_analysis['bb_position'],
                "stoch_signal": signal_analysis['stoch_signal'],
                "ema_trend": signal_analysis['ema_trend']
            },
            
            # Signal Analysis
            "signal_analysis": {
                "technical_score": signal_analysis['score'],
                "bullish_signals": signal_analysis['bullish_signals'],
                "bearish_signals": signal_analysis['bearish_signals'],
                "recommendation": signal_analysis['recommendation'],
                "confidence": signal_analysis['confidence'],
                "reasoning": signal_analysis['reasoning']
            },
            
            # Final Signal
            "signal": signal_analysis['recommendation'],
            "source": "Yahoo Finance + Technical Analysis"
        }
        
        print(f"✅ Analysis complete. Signal: {result['signal']}", file=sys.stderr)
        
        # ส่งผลลัพธ์กลับให้ Node.js
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(f"❌ Error in main: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "error": f"❌ เกิดข้อผิดพลาด: {str(e)}"
        }, ensure_ascii=False))
        sys.exit(1)

def convert_to_yahoo_symbol(symbol):
    """แปลง symbol เป็น Yahoo Finance format"""
    
    symbol_map = {
        # Forex pairs
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
        'GBP/JPY': 'GBPJPY=X',
        
        # Crypto pairs
        'BTCUSD': 'BTC-USD',
        'BTC/USD': 'BTC-USD',
        'ETHUSD': 'ETH-USD',
        'ETH/USD': 'ETH-USD',
        'LTCUSD': 'LTC-USD',
        'LTC/USD': 'LTC-USD',
        'ADAUSD': 'ADA-USD',
        'ADA/USD': 'ADA-USD',
        
        # Commodities
        'GOLD': 'GC=F',
        'XAUUSD': 'GC=F',
        'SILVER': 'SI=F',
        'OIL': 'CL=F'
    }
    
    return symbol_map.get(symbol, symbol)

def fetch_yahoo_data(yahoo_symbol, period="1d", interval="5m"):
    """ดึงข้อมูลจาก Yahoo Finance"""
    try:
        print(f"🔄 Fetching data for {yahoo_symbol}...", file=sys.stderr)
        
        # สร้าง ticker object
        ticker = yf.Ticker(yahoo_symbol)
        
        # ดึงข้อมูล (1 วัน = ~78 แท่งเทียน 5 นาที)
        data = ticker.history(period=period, interval=interval)
        
        if data.empty:
            print(f"❌ No data returned for {yahoo_symbol}", file=sys.stderr)
            return None
        
        # ทำความสะอาดข้อมูล
        data = data.dropna()
        
        print(f"📈 Fetched {len(data)} candles for {yahoo_symbol}", file=sys.stderr)
        
        return data
        
    except Exception as e:
        print(f"❌ Error fetching data: {str(e)}", file=sys.stderr)
        return None

def calculate_ema(prices, period):
    """คำนวณ Exponential Moving Average"""
    return prices.ewm(span=period, adjust=False).mean()

def calculate_bollinger_bands(prices, period=20, std_dev=2):
    """คำนวณ Bollinger Bands"""
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    
    upper = sma + (std * std_dev)
    lower = sma - (std * std_dev)
    
    return upper, sma, lower

def calculate_stochastic(high, low, close, k_period=14, d_period=3):
    """คำนวณ Stochastic Oscillator"""
    # คำนวณ %K
    lowest_low = low.rolling(window=k_period).min()
    highest_high = high.rolling(window=k_period).max()
    
    k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
    
    # คำนวณ %D (SMA ของ %K)
    d_percent = k_percent.rolling(window=d_period).mean()
    
    return k_percent, d_percent

def calculate_technical_indicators(data):
    """คำนวณ Technical Indicators ทั้งหมด"""
    try:
        indicators = pd.DataFrame(index=data.index)
        
        # 📈 EMA
        indicators['EMA_14'] = calculate_ema(data['Close'], 14)
        indicators['EMA_50'] = calculate_ema(data['Close'], 50)
        
        # 📊 Bollinger Bands
        bb_upper, bb_middle, bb_lower = calculate_bollinger_bands(data['Close'], 20, 2)
        indicators['BB_Upper'] = bb_upper
        indicators['BB_Middle'] = bb_middle
        indicators['BB_Lower'] = bb_lower
        
        # ⚡ Stochastic
        stoch_k, stoch_d = calculate_stochastic(data['High'], data['Low'], data['Close'], 14, 3)
        indicators['Stoch_K'] = stoch_k
        indicators['Stoch_D'] = stoch_d
        
        print(f"✅ Technical indicators calculated", file=sys.stderr)
        
        return indicators
        
    except Exception as e:
        print(f"❌ Error calculating indicators: {str(e)}", file=sys.stderr)
        raise

def analyze_signals(indicators, data):
    """วิเคราะห์สัญญาณจาก Technical Indicators"""
    try:
        current_price = data['Close'].iloc[-1]
        previous_price = data['Close'].iloc[-2]
        
        # ล่าสุดของแต่ละ indicator
        ema_14 = indicators['EMA_14'].iloc[-1]
        ema_50 = indicators['EMA_50'].iloc[-1]
        bb_upper = indicators['BB_Upper'].iloc[-1]
        bb_middle = indicators['BB_Middle'].iloc[-1]
        bb_lower = indicators['BB_Lower'].iloc[-1]
        stoch_k = indicators['Stoch_K'].iloc[-1]
        stoch_d = indicators['Stoch_D'].iloc[-1]
        
        bullish_signals = []
        bearish_signals = []
        score = 0
        
        # 🔍 EMA Analysis
        if current_price > ema_14 > ema_50:
            bullish_signals.append("Strong uptrend (Price > EMA14 > EMA50)")
            score += 3
        elif current_price > ema_14:
            bullish_signals.append("Price above EMA14")
            score += 1
        elif current_price < ema_14 < ema_50:
            bearish_signals.append("Strong downtrend (Price < EMA14 < EMA50)")
            score -= 3
        elif current_price < ema_14:
            bearish_signals.append("Price below EMA14")
            score -= 1
            
        ema_trend = "bullish" if current_price > ema_14 else "bearish"
        
        # 🔍 Bollinger Bands Analysis
        bb_position = ""
        if current_price >= bb_upper:
            bb_position = "above_upper"
            bearish_signals.append("Price at/above BB Upper (overbought)")
            score -= 2
        elif current_price <= bb_lower:
            bb_position = "below_lower" 
            bullish_signals.append("Price at/below BB Lower (oversold)")
            score += 2
        elif current_price > bb_middle:
            bb_position = "above_middle"
            bullish_signals.append("Price above BB Middle")
            score += 1
        else:
            bb_position = "below_middle"
            bearish_signals.append("Price below BB Middle")
            score -= 1
        
        # 🔍 Stochastic Analysis
        stoch_signal = ""
        if stoch_k >= 80 and stoch_d >= 80:
            stoch_signal = "overbought"
            bearish_signals.append(f"Stochastic overbought (%K:{stoch_k:.1f}, %D:{stoch_d:.1f})")
            score -= 2
        elif stoch_k <= 20 and stoch_d <= 20:
            stoch_signal = "oversold"
            bullish_signals.append(f"Stochastic oversold (%K:{stoch_k:.1f}, %D:{stoch_d:.1f})")
            score += 2
        elif stoch_k > stoch_d:
            stoch_signal = "bullish_crossover"
            bullish_signals.append("Stochastic %K above %D")
            score += 1
        else:
            stoch_signal = "bearish_crossover"
            bearish_signals.append("Stochastic %K below %D")
            score -= 1
        
        # 🎯 Final Decision
        if score >= 3:
            recommendation = "CALL"
            confidence = "HIGH" if score >= 5 else "MEDIUM"
        elif score <= -3:
            recommendation = "PUT"
            confidence = "HIGH" if score <= -5 else "MEDIUM"
        else:
            # ใช้ momentum เป็นตัวตัดสิน
            recommendation = "CALL" if current_price > previous_price else "PUT"
            confidence = "LOW"
        
        # สร้าง reasoning
        reasoning = f"Score: {score} | "
        if bullish_signals:
            reasoning += f"Bullish: {'; '.join(bullish_signals[:2])} | "
        if bearish_signals:
            reasoning += f"Bearish: {'; '.join(bearish_signals[:2])}"
        
        return {
            'score': score,
            'recommendation': recommendation,
            'confidence': confidence,
            'bullish_signals': bullish_signals,
            'bearish_signals': bearish_signals,
            'bb_position': bb_position,
            'stoch_signal': stoch_signal,
            'ema_trend': ema_trend,
            'reasoning': reasoning.strip(' | ')
        }
        
    except Exception as e:
        print(f"❌ Error analyzing signals: {str(e)}", file=sys.stderr)
        return {
            'score': 0,
            'recommendation': 'CALL',
            'confidence': 'LOW',
            'bullish_signals': [],
            'bearish_signals': [],
            'bb_position': 'unknown',
            'stoch_signal': 'unknown', 
            'ema_trend': 'unknown',
            'reasoning': 'Error in analysis'
        }

if __name__ == "__main__":
    main()