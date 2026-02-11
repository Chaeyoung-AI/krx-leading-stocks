"""
KRX 거래대금 상위 종목 일일 수집 스크립트
pykrx로 코스피/코스닥 전종목 OHLCV 조회 후 거래대금 상위 50종목 추출
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from pykrx import stock


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DAILY_DIR = DATA_DIR / "daily"

TOP_N = 50


def get_trading_date(date_str=None):
    """거래일 문자열 반환. None이면 오늘 날짜."""
    if date_str:
        return date_str.replace("-", "")
    now = datetime.now()
    return now.strftime("%Y%m%d")


def fetch_market_data(date_str, market):
    """특정 시장의 OHLCV 데이터 조회 후 거래대금 상위 N종목 반환."""
    df = stock.get_market_ohlcv(date_str, market=market)
    if df.empty:
        return []

    # 거래대금 기준 내림차순 정렬, 상위 N종목
    df = df.sort_values("거래대금", ascending=False).head(TOP_N)

    results = []
    for ticker, row in df.iterrows():
        name = stock.get_market_ticker_name(ticker)
        change_pct = float(row["등락률"]) if "등락률" in row.index else 0.0

        results.append({
            "rank": len(results) + 1,
            "ticker": ticker,
            "name": name,
            "close": int(row["종가"]),
            "open": int(row["시가"]),
            "high": int(row["고가"]),
            "low": int(row["저가"]),
            "volume": int(row["거래량"]),
            "trading_value": int(row["거래대금"]),
            "change_pct": round(change_pct, 2),
        })

    return results


def fetch_daily(date_str=None):
    """코스피/코스닥 거래대금 상위 종목 수집 & JSON 저장."""
    raw_date = get_trading_date(date_str)
    formatted_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"

    print(f"[{formatted_date}] 데이터 수집 시작...")

    # 코스피
    print("  코스피 조회 중...")
    kospi = fetch_market_data(raw_date, "KOSPI")
    time.sleep(1)

    # 코스닥
    print("  코스닥 조회 중...")
    kosdaq = fetch_market_data(raw_date, "KOSDAQ")

    if not kospi and not kosdaq:
        print(f"  [{formatted_date}] 데이터 없음 (공휴일/휴장일). 스킵.")
        return False

    data = {
        "date": formatted_date,
        "kospi": kospi,
        "kosdaq": kosdaq,
        "updated_at": datetime.now().isoformat(),
    }

    # 디렉토리 생성
    DAILY_DIR.mkdir(parents=True, exist_ok=True)

    # 일별 파일 저장
    daily_path = DAILY_DIR / f"{formatted_date}.json"
    with open(daily_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  저장: {daily_path}")

    # latest.json 업데이트
    latest_path = DATA_DIR / "latest.json"
    with open(latest_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  저장: {latest_path}")

    # index.json 업데이트 (날짜 목록)
    index_path = DATA_DIR / "index.json"
    if index_path.exists():
        with open(index_path, "r", encoding="utf-8") as f:
            index_data = json.load(f)
    else:
        index_data = {"dates": []}

    if formatted_date not in index_data["dates"]:
        index_data["dates"].append(formatted_date)
        index_data["dates"].sort(reverse=True)

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    print(f"  저장: {index_path}")

    print(f"[{formatted_date}] 완료! 코스피 {len(kospi)}종목, 코스닥 {len(kosdaq)}종목")
    return True


if __name__ == "__main__":
    date_arg = sys.argv[1] if len(sys.argv) > 1 else None
    fetch_daily(date_arg)
