"""
과거 데이터 백필 스크립트
지정 기간의 KRX 거래대금 상위 종목 데이터를 일괄 수집
"""

import sys
import time
from datetime import datetime, timedelta

from fetch_daily import fetch_daily


def backfill(start_date, end_date):
    """start_date ~ end_date 범위의 데이터 백필."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    current = start
    success_count = 0
    skip_count = 0

    while current <= end:
        # 주말 스킵
        if current.weekday() >= 5:
            current += timedelta(days=1)
            continue

        date_str = current.strftime("%Y%m%d")
        result = fetch_daily(date_str)

        if result:
            success_count += 1
        else:
            skip_count += 1

        # KRX rate limiting
        time.sleep(2)
        current += timedelta(days=1)

    print(f"\n백필 완료: {success_count}일 수집, {skip_count}일 스킵")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("사용법: python backfill.py 2026-01-01 2026-02-11")
        sys.exit(1)

    backfill(sys.argv[1], sys.argv[2])
