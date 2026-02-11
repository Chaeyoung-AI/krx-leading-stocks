/**
 * 테이블 렌더링 모듈
 * 코스피/코스닥 거래대금 상위 종목 테이블
 */

import { formatTradingValue, formatPrice, formatVolume, formatChangePct, getChangeClass } from './format.js';
import { getMemo, setNote, addTag, removeTag } from './memo.js';
import { getTickerHistory, isNew, getStreakCount, renderHistoryMini } from './history.js';

let currentSort = { column: 'rank', asc: true };
let expandedTicker = null;

/**
 * 테이블 렌더링
 * @param {Array} stocks - 종목 배열
 * @param {string} market - 'kospi' | 'kosdaq'
 * @param {Array} recentData - 최근 일별 데이터 (히스토리용)
 * @param {string} searchQuery - 검색 필터
 */
export function renderTable(stocks, market, recentData = [], searchQuery = '') {
  const container = document.getElementById('table-container');
  if (!stocks || stocks.length === 0) {
    container.innerHTML = '<p class="no-data">데이터가 없습니다.</p>';
    return;
  }

  // 검색 필터
  let filtered = stocks;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = stocks.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.ticker.includes(q) ||
      getMemo(s.ticker).tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // 정렬
  filtered = sortStocks([...filtered], currentSort);

  let html = '<table class="stock-table">';
  html += renderHeader();
  html += '<tbody>';

  for (const stock of filtered) {
    const memo = getMemo(stock.ticker);
    const newBadge = isNew(recentData, stock.ticker, market);
    const streak = getStreakCount(recentData, stock.ticker, market);

    html += renderRow(stock, memo, newBadge, streak);

    // 확장 행
    if (expandedTicker === stock.ticker) {
      html += renderExpandedRow(stock, market, memo, recentData);
    }
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  // 이벤트 바인딩
  bindTableEvents(market, recentData, searchQuery);
}

function renderHeader() {
  const columns = [
    { key: 'rank', label: '#' },
    { key: 'name', label: '종목명' },
    { key: 'close', label: '종가' },
    { key: 'change_pct', label: '등락률' },
    { key: 'volume', label: '거래량' },
    { key: 'trading_value', label: '거래대금' },
    { key: 'tags', label: '메모/태그' },
  ];

  let html = '<thead><tr>';
  for (const col of columns) {
    const arrow = currentSort.column === col.key
      ? (currentSort.asc ? ' ▲' : ' ▼')
      : '';
    const sortable = col.key !== 'tags' ? 'sortable' : '';
    html += `<th class="${sortable}" data-sort="${col.key}">${col.label}${arrow}</th>`;
  }
  html += '</tr></thead>';
  return html;
}

function renderRow(stock, memo, isNewEntry, streak) {
  const changeClass = getChangeClass(stock.change_pct);
  const isExpanded = expandedTicker === stock.ticker;

  let badges = '';
  if (isNewEntry) {
    badges += '<span class="badge badge-new">NEW</span> ';
  }
  if (streak.total >= 2 && streak.count >= 2) {
    badges += `<span class="badge badge-streak">${streak.count}/${streak.total}</span> `;
  }

  let tags = '';
  if (memo.tags.length > 0) {
    tags = memo.tags.map(t => `<span class="tag">${t}</span>`).join(' ');
  }
  if (memo.note) {
    tags += ' <span class="has-note" title="' + escapeHtml(memo.note) + '">📝</span>';
  }

  return `<tr class="stock-row ${isExpanded ? 'expanded' : ''}" data-ticker="${stock.ticker}">
    <td class="center">${badges}${stock.rank}</td>
    <td class="name-cell">${stock.name}<span class="ticker">${stock.ticker}</span></td>
    <td class="right">${formatPrice(stock.close)}</td>
    <td class="right ${changeClass}">${formatChangePct(stock.change_pct)}</td>
    <td class="right">${formatVolume(stock.volume)}</td>
    <td class="right">${formatTradingValue(stock.trading_value)}</td>
    <td>${tags}</td>
  </tr>`;
}

function renderExpandedRow(stock, market, memo, recentData) {
  const history = getTickerHistory(recentData, stock.ticker, market);
  const historyHtml = renderHistoryMini(history);

  const tagsHtml = memo.tags.map(t =>
    `<span class="tag removable" data-ticker="${stock.ticker}" data-tag="${t}">${t} ×</span>`
  ).join(' ');

  return `<tr class="expanded-row">
    <td colspan="7">
      <div class="expanded-content">
        <div class="expanded-left">
          <h4>최근 순위 변화</h4>
          ${historyHtml}
        </div>
        <div class="expanded-right">
          <h4>메모</h4>
          <div class="tag-area">
            ${tagsHtml}
            <input type="text" class="tag-input" data-ticker="${stock.ticker}"
                   placeholder="태그 추가 (Enter)" />
          </div>
          <textarea class="note-input" data-ticker="${stock.ticker}"
                    placeholder="메모를 입력하세요...">${memo.note || ''}</textarea>
        </div>
      </div>
    </td>
  </tr>`;
}

function sortStocks(stocks, sort) {
  if (sort.column === 'tags') return stocks;

  return stocks.sort((a, b) => {
    let va = a[sort.column];
    let vb = b[sort.column];
    if (typeof va === 'string') {
      va = va.toLowerCase();
      vb = vb.toLowerCase();
    }
    if (va < vb) return sort.asc ? -1 : 1;
    if (va > vb) return sort.asc ? 1 : -1;
    return 0;
  });
}

function bindTableEvents(market, recentData, searchQuery) {
  // 행 클릭: 확장/축소
  document.querySelectorAll('.stock-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.tag-input, .note-input, .tag.removable')) return;
      const ticker = row.dataset.ticker;
      expandedTicker = expandedTicker === ticker ? null : ticker;
      // 현재 데이터를 기반으로 다시 렌더링
      const stocks = window.__currentStocks;
      if (stocks) renderTable(stocks, market, recentData, searchQuery);
    });
  });

  // 컬럼 정렬 클릭
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (currentSort.column === col) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort = { column: col, asc: col === 'name' };
      }
      const stocks = window.__currentStocks;
      if (stocks) renderTable(stocks, market, recentData, searchQuery);
    });
  });

  // 태그 추가 (Enter)
  document.querySelectorAll('.tag-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.stopPropagation();
        addTag(input.dataset.ticker, input.value.trim());
        const stocks = window.__currentStocks;
        if (stocks) renderTable(stocks, market, recentData, searchQuery);
      }
    });
    input.addEventListener('click', e => e.stopPropagation());
  });

  // 태그 삭제
  document.querySelectorAll('.tag.removable').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTag(tag.dataset.ticker, tag.dataset.tag);
      const stocks = window.__currentStocks;
      if (stocks) renderTable(stocks, market, recentData, searchQuery);
    });
  });

  // 메모 저장 (blur)
  document.querySelectorAll('.note-input').forEach(textarea => {
    textarea.addEventListener('blur', () => {
      setNote(textarea.dataset.ticker, textarea.value);
    });
    textarea.addEventListener('click', e => e.stopPropagation());
  });
}

export function resetSort() {
  currentSort = { column: 'rank', asc: true };
  expandedTicker = null;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
