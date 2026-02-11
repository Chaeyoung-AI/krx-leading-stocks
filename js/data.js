/**
 * 데이터 fetch & 캐싱
 * GitHub Pages에서 정적 JSON 파일을 로드
 */

const cache = new Map();

function getBaseUrl() {
  const loc = window.location;
  // GitHub Pages or local
  return loc.origin + loc.pathname.replace(/\/[^/]*$/, '');
}

export async function fetchIndex() {
  const key = 'index';
  if (cache.has(key)) return cache.get(key);

  const url = `${getBaseUrl()}/data/index.json`;
  const res = await fetch(url);
  if (!res.ok) return { dates: [] };
  const data = await res.json();
  cache.set(key, data);
  return data;
}

export async function fetchDaily(date) {
  const key = `daily-${date}`;
  if (cache.has(key)) return cache.get(key);

  const url = `${getBaseUrl()}/data/daily/${date}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  cache.set(key, data);
  return data;
}

export async function fetchLatest() {
  const key = 'latest';
  if (cache.has(key)) return cache.get(key);

  const url = `${getBaseUrl()}/data/latest.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  cache.set(key, data);
  return data;
}

/**
 * 최근 N일 데이터를 한번에 로드 (히스토리 비교용)
 */
export async function fetchRecentDays(dates, count = 10) {
  const recent = dates.slice(0, count);
  const results = await Promise.all(recent.map(d => fetchDaily(d)));
  return results.filter(Boolean);
}

export function clearCache() {
  cache.clear();
}
