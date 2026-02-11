/**
 * 앱 메인 로직
 * 날짜 선택, 탭 전환, 검색, 메모 관리
 */

import { fetchIndex, fetchDaily, fetchLatest, fetchRecentDays } from './data.js';
import { renderTable, resetSort } from './table.js';
import { getAllTags, getByTag, exportMemos, importMemos, getAllMemos } from './memo.js';

let dates = [];
let currentDateIdx = 0;
let currentMarket = 'kospi';
let currentData = null;
let recentData = [];

async function init() {
  try {
    // 날짜 목록 로드
    const index = await fetchIndex();
    dates = index.dates || [];

    if (dates.length === 0) {
      document.getElementById('table-container').innerHTML =
        '<p class="no-data">데이터가 없습니다. GitHub Actions가 실행되면 데이터가 추가됩니다.</p>';
      return;
    }

    // 날짜 드롭다운 구성
    buildDateSelector();

    // 최신 데이터 로드
    await loadDate(0);

    // 이벤트 바인딩
    bindEvents();
  } catch (e) {
    console.error('init error:', e);
    document.getElementById('table-container').innerHTML =
      `<p class="no-data">로드 실패: ${e.message}</p>`;
  }
}

function buildDateSelector() {
  const select = document.getElementById('date-select');
  select.innerHTML = '';
  for (const d of dates) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  }
}

async function loadDate(idx) {
  if (idx < 0 || idx >= dates.length) return;
  currentDateIdx = idx;
  const date = dates[idx];

  document.getElementById('date-select').value = date;
  document.getElementById('btn-prev').disabled = idx >= dates.length - 1;
  document.getElementById('btn-next').disabled = idx <= 0;

  // 로딩 표시
  document.getElementById('table-container').innerHTML =
    '<p class="loading">데이터 로딩 중...</p>';

  try {
    currentData = await fetchDaily(date);
  } catch (e) {
    console.error('fetchDaily error:', e);
  }

  if (!currentData) {
    document.getElementById('table-container').innerHTML =
      `<p class="no-data">${date} 데이터를 불러올 수 없습니다.</p>`;
    return;
  }

  // 최근 데이터 로드 (히스토리용)
  const recentDates = dates.slice(idx, idx + 10);
  recentData = await fetchRecentDays(recentDates, 10);

  resetSort();
  renderCurrentTable();
  updateInfo();
}

function renderCurrentTable() {
  if (!currentData) return;
  const stocks = currentData[currentMarket] || [];
  window.__currentStocks = stocks;
  const query = document.getElementById('search-input').value;
  renderTable(stocks, currentMarket, recentData, query);
}

function updateInfo() {
  if (!currentData) return;
  const dateEl = document.getElementById('current-date');
  dateEl.textContent = currentData.date;
  const updatedEl = document.getElementById('updated-at');
  if (currentData.updated_at) {
    updatedEl.textContent = '업데이트: ' + new Date(currentData.updated_at).toLocaleString('ko-KR');
  }
}

function bindEvents() {
  // 날짜 선택
  document.getElementById('date-select').addEventListener('change', (e) => {
    const idx = dates.indexOf(e.target.value);
    if (idx >= 0) loadDate(idx);
  });

  // 이전/다음 버튼
  document.getElementById('btn-prev').addEventListener('click', () => {
    loadDate(currentDateIdx + 1);
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    loadDate(currentDateIdx - 1);
  });

  // 마켓 탭
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMarket = btn.dataset.market;
      resetSort();
      renderCurrentTable();
    });
  });

  // 검색
  document.getElementById('search-input').addEventListener('input', () => {
    renderCurrentTable();
  });

  // 메모 관리 토글
  document.getElementById('btn-memo-mgmt').addEventListener('click', () => {
    const panel = document.getElementById('memo-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      renderMemoPanel();
    }
  });

  // 메모 export
  document.getElementById('btn-export').addEventListener('click', () => {
    const json = exportMemos();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'krx-memos.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // 메모 import
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importMemos(reader.result);
        alert('메모를 성공적으로 불러왔습니다.');
        renderCurrentTable();
        renderMemoPanel();
      } catch {
        alert('잘못된 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
  });
}

function renderMemoPanel() {
  const content = document.getElementById('memo-content');
  const byTag = getByTag();
  const allMemos = getAllMemos();
  const tags = Object.keys(byTag).sort();

  if (tags.length === 0 && Object.keys(allMemos).length === 0) {
    content.innerHTML = '<p class="no-data">저장된 메모가 없습니다.</p>';
    return;
  }

  let html = '';

  // 태그별 그룹
  for (const tag of tags) {
    html += `<div class="memo-group">`;
    html += `<h3 class="tag">${tag}</h3>`;
    html += '<ul>';
    for (const item of byTag[tag]) {
      html += `<li><strong>${item.ticker}</strong>`;
      if (item.note) html += ` - ${item.note}`;
      html += '</li>';
    }
    html += '</ul></div>';
  }

  // 태그 없는 메모
  const untagged = Object.entries(allMemos)
    .filter(([, m]) => (!m.tags || m.tags.length === 0) && m.note);
  if (untagged.length > 0) {
    html += '<div class="memo-group"><h3>태그 없음</h3><ul>';
    for (const [ticker, m] of untagged) {
      html += `<li><strong>${ticker}</strong> - ${m.note}</li>`;
    }
    html += '</ul></div>';
  }

  content.innerHTML = html;
}

// 앱 시작
document.addEventListener('DOMContentLoaded', init);
