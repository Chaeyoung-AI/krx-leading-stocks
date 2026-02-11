/**
 * 메모/태그 시스템 (localStorage)
 * 종목별 태그 + 메모를 로컬에 저장
 */

const STORAGE_KEY = 'krx-memos';

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getMemo(ticker) {
  const all = loadAll();
  return all[ticker] || { tags: [], note: '' };
}

export function setMemo(ticker, memo) {
  const all = loadAll();
  if (!memo.updatedAt) memo.updatedAt = new Date().toISOString();
  all[ticker] = memo;
  saveAll(all);
}

export function deleteMemo(ticker) {
  const all = loadAll();
  delete all[ticker];
  saveAll(all);
}

export function getAllMemos() {
  return loadAll();
}

export function addTag(ticker, tag) {
  const memo = getMemo(ticker);
  if (!memo.tags.includes(tag)) {
    memo.tags.push(tag);
    memo.updatedAt = new Date().toISOString();
    setMemo(ticker, memo);
  }
}

export function removeTag(ticker, tag) {
  const memo = getMemo(ticker);
  memo.tags = memo.tags.filter(t => t !== tag);
  setMemo(ticker, memo);
}

export function setNote(ticker, note) {
  const memo = getMemo(ticker);
  memo.note = note;
  memo.updatedAt = new Date().toISOString();
  setMemo(ticker, memo);
}

export function isMemoNew(memo) {
  if (!memo.updatedAt) return false;
  const updated = new Date(memo.updatedAt);
  const now = new Date();
  return (now - updated) < 24 * 60 * 60 * 1000;
}

export function getAllTags() {
  const all = loadAll();
  const tagSet = new Set();
  for (const memo of Object.values(all)) {
    for (const tag of memo.tags || []) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
}

/**
 * 태그별 종목 그룹핑
 */
export function getByTag() {
  const all = loadAll();
  const groups = {};
  for (const [ticker, memo] of Object.entries(all)) {
    for (const tag of memo.tags || []) {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push({ ticker, ...memo });
    }
  }
  return groups;
}

/**
 * JSON export
 */
export function exportMemos() {
  return JSON.stringify(loadAll(), null, 2);
}

/**
 * JSON import
 */
export function importMemos(jsonStr) {
  const data = JSON.parse(jsonStr);
  saveAll(data);
}
