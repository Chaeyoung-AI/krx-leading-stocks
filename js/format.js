/**
 * 숫자 포맷 유틸리티
 * 거래대금: 억/조 단위, 가격: 콤마, 등락률: +/-
 */

export function formatTradingValue(value) {
  if (value >= 1_0000_0000_0000) {
    return (value / 1_0000_0000_0000).toFixed(1) + '조';
  }
  if (value >= 1_0000_0000) {
    return Math.round(value / 1_0000_0000).toLocaleString() + '억';
  }
  if (value >= 1_0000) {
    return Math.round(value / 1_0000).toLocaleString() + '만';
  }
  return value.toLocaleString();
}

export function formatPrice(value) {
  return value.toLocaleString();
}

export function formatVolume(value) {
  if (value >= 1_0000_0000) {
    return (value / 1_0000_0000).toFixed(1) + '억';
  }
  if (value >= 1_0000) {
    return Math.round(value / 1_0000).toLocaleString() + '만';
  }
  return value.toLocaleString();
}

export function formatChangePct(pct) {
  const sign = pct > 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}

export function getChangeClass(pct) {
  if (pct > 0) return 'price-up';
  if (pct < 0) return 'price-down';
  return 'price-flat';
}
