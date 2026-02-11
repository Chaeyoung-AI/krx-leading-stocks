/**
 * 히스토리 & 비교 모듈
 * 종목의 최근 순위 변화, NEW 표시, 연속 출현 배지
 */

/**
 * 종목의 최근 N일 순위 히스토리 조회
 * @param {Array} recentData - 최근 일별 데이터 배열 (최신 먼저)
 * @param {string} ticker - 종목코드
 * @param {string} market - 'kospi' | 'kosdaq'
 * @returns {Array} [{date, rank, trading_value}]
 */
export function getTickerHistory(recentData, ticker, market) {
  const history = [];
  for (const dayData of recentData) {
    const list = dayData[market] || [];
    const found = list.find(s => s.ticker === ticker);
    history.push({
      date: dayData.date,
      rank: found ? found.rank : null,
      trading_value: found ? found.trading_value : null,
      close: found ? found.close : null,
      change_pct: found ? found.change_pct : null,
    });
  }
  return history;
}

/**
 * NEW 종목 판별: 어제 없다가 오늘 새로 진입
 * @param {Array} recentData - 최근 일별 데이터 (최신 먼저, 최소 2일)
 * @param {string} ticker
 * @param {string} market
 */
export function isNew(recentData, ticker, market) {
  if (recentData.length < 2) return false;
  const today = recentData[0][market] || [];
  const yesterday = recentData[1][market] || [];
  const inToday = today.some(s => s.ticker === ticker);
  const inYesterday = yesterday.some(s => s.ticker === ticker);
  return inToday && !inYesterday;
}

/**
 * 연속 출현 횟수 계산: 최근 N일 중 TOP50에 몇 일 있었는지
 * @param {Array} recentData
 * @param {string} ticker
 * @param {string} market
 * @returns {object} {count, total} e.g. {count: 8, total: 10}
 */
export function getStreakCount(recentData, ticker, market) {
  const total = recentData.length;
  let count = 0;
  for (const dayData of recentData) {
    const list = dayData[market] || [];
    if (list.some(s => s.ticker === ticker)) {
      count++;
    }
  }
  return { count, total };
}

/**
 * 히스토리 미니 테이블 HTML 생성
 */
export function renderHistoryMini(history) {
  if (!history || history.length === 0) return '<p class="no-data">히스토리 없음</p>';

  let html = '<table class="history-table"><thead><tr>';
  html += '<th>날짜</th><th>순위</th><th>거래대금</th><th>종가</th><th>등락률</th>';
  html += '</tr></thead><tbody>';

  for (const h of history) {
    const rank = h.rank !== null ? h.rank : '-';
    const tv = h.trading_value !== null
      ? formatValueCompact(h.trading_value)
      : '-';
    const close = h.close !== null ? h.close.toLocaleString() : '-';
    const pct = h.change_pct !== null
      ? ((h.change_pct > 0 ? '+' : '') + h.change_pct.toFixed(2) + '%')
      : '-';
    const pctClass = h.change_pct > 0 ? 'price-up' : h.change_pct < 0 ? 'price-down' : '';

    html += `<tr>`;
    html += `<td>${h.date.slice(5)}</td>`;
    html += `<td>${rank}</td>`;
    html += `<td>${tv}</td>`;
    html += `<td>${close}</td>`;
    html += `<td class="${pctClass}">${pct}</td>`;
    html += `</tr>`;
  }

  html += '</tbody></table>';
  return html;
}

function formatValueCompact(value) {
  if (value >= 1_0000_0000_0000) {
    return (value / 1_0000_0000_0000).toFixed(1) + '조';
  }
  if (value >= 1_0000_0000) {
    return Math.round(value / 1_0000_0000).toLocaleString() + '억';
  }
  return Math.round(value / 1_0000).toLocaleString() + '만';
}
