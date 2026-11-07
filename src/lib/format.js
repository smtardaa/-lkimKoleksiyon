const fmtCache = new Map();
function nf(currency, fraction) {
  const k = currency + fraction;
  if (!fmtCache.has(k)) {
    fmtCache.set(k, new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency, minimumFractionDigits: fraction, maximumFractionDigits: 2,
    }));
  }
  return fmtCache.get(k);
}

/** ₺1.850 / ₺12,50 */
export function formatMoney(money) {
  if (!money || money.amount == null) return '';
  const a = Number(money.amount);
  return nf(money.currencyCode || 'TRY', Number.isInteger(a) ? 0 : 2).format(a);
}

export function formatNumber(n) {
  return new Intl.NumberFormat('tr-TR').format(n);
}

export const KIND_LABEL = {
  banknot: 'Kâğıt para', madeni: 'Madeni para', set: 'Para seti', malzeme: 'Koleksiyon malzemesi',
  madalya: 'Madalya', obje: 'Obje', pul: 'Pul', antika: 'Antika',
};

export const STATUS_LABEL = { in_stock: 'Stokta', out_of_stock: 'Stokta yok', sold: 'Satıldı' };

export function truncate(s, n = 155) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}
