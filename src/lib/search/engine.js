/**
 * Katalog arama + filtre + sıralama + sayfalama motoru.
 *
 * Her zaman BÜTÜN veri kümesi üzerinde çalışır (sağlayıcının döndürdüğü tam
 * ürün listesi). Sayfalama en son uygulanır; sonuç sayısı ve filtre sayımları
 * tüm katalogdan hesaplanır. Demo ve Shopify modunda aynı motor kullanılır
 * (Shopify modunda tam katalog sunucu önbelleğinde tutulur; bkz. README).
 */
import { normalizeText, parseQuery } from './normalize.js';

/** @typedef {import('../types.js').Product} Product */

// ---------------------------------------------------------------------------
// Parametre şeması (URL'de Türkçe ve kısa adlar)
// ---------------------------------------------------------------------------
export const SORTS = [
  { value: 'onerilen', label: 'Önerilen' },
  { value: 'yeni', label: 'En yeni' },
  { value: 'fiyat-artan', label: 'Fiyat: düşükten yükseğe' },
  { value: 'fiyat-azalan', label: 'Fiyat: yüksekten düşüğe' },
  { value: 'yil-artan', label: 'Yıl: eskiden yeniye' },
  { value: 'yil-azalan', label: 'Yıl: yeniden eskiye' },
  { value: 'ad', label: 'Ada göre (A–Z)' },
];

const STOCK_LABELS = { stokta: 'Stokta', tukendi: 'Stokta yok', satildi: 'Satıldı' };
const KIND_LABELS = { banknot: 'Kâğıt para (banknot)', madeni: 'Madeni para', set: 'Para seti', malzeme: 'Koleksiyon malzemesi', madalya: 'Madalya', obje: 'Obje', pul: 'Pul', antika: 'Antika' };

/**
 * Faset tanımları. `get` bir ürün için [{value,label}] döndürür.
 * Değeri olmayan ürünler o fasette sayılmaz; bilinmeyen değer tahmin edilmez.
 */
export const FACETS = [
  { key: 'tur', label: 'Tür', get: (p) => one(p.specs.kind, KIND_LABELS[p.specs.kind]) },
  { key: 'ulke', label: 'Ülke', get: (p) => one(p.specs.countrySlug, p.specs.country), searchable: true },
  { key: 'donem', label: 'Dönem / hükümdar', get: (p) => [
      ...one(p.specs.rulerSlug, p.specs.ruler),
      ...one(p.specs.periodSlug, p.specs.period),
    ] },
  { key: 'emisyon', label: 'Emisyon', get: (p) => one(p.specs.emission != null ? String(p.specs.emission) : null, p.specs.emission != null ? `${p.specs.emission}. Emisyon` : null), sort: 'numeric' },
  { key: 'birim', label: 'Para birimi', get: (p) => one(p.specs.denomination?.unitSlug, p.specs.denomination?.unit), searchable: true },
  { key: 'nominal', label: 'Nominal değer', get: (p) => one(p.specs.denomination ? `${p.specs.denomination.value}-${p.specs.denomination.unitSlug}` : null, p.specs.denomination?.label), searchable: true, sort: 'denomination' },
  { key: 'kondisyon', label: 'Kondisyon', get: (p) => one(p.specs.condition?.slug, p.specs.condition?.label) },
  { key: 'sertifika', label: 'Sertifika kuruluşu', get: (p) => one(p.specs.certification?.service?.toLowerCase(), p.specs.certification?.service) },
  { key: 'derece', label: 'Sertifika derecesi', get: (p) => one(p.specs.certification?.grade != null ? String(p.specs.certification.grade) : null, p.specs.certification?.grade != null ? `${p.specs.certification.service} ${p.specs.certification.grade}` : null), sort: 'numeric' },
  { key: 'metal', label: 'Metal', get: (p) => one(p.specs.metalSlug, p.specs.metal) },
  { key: 'stok', label: 'Stok durumu', get: (p) => one(stockKey(p), STOCK_LABELS[stockKey(p)]) },
];

function one(value, label) {
  return value ? [{ value, label: label ?? value }] : [];
}
export function stockKey(p) {
  return p.availability.status === 'sold' ? 'satildi' : p.availability.status === 'in_stock' ? 'stokta' : 'tukendi';
}

/** URLSearchParams → filtre durumu */
export function parseState(searchParams) {
  const sp = searchParams;
  const state = {
    q: (sp.get('q') ?? '').trim().slice(0, 120),
    sort: SORTS.some((s) => s.value === sp.get('siralama')) ? sp.get('siralama') : 'onerilen',
    page: Math.max(1, Math.min(500, parseInt(sp.get('sayfa') ?? '1', 10) || 1)),
    yearMin: toInt(sp.get('yil_min')),
    yearMax: toInt(sp.get('yil_max')),
    calendar: sp.get('takvim') === 'hicri' ? 'hicri' : 'miladi',
    priceMin: toNum(sp.get('fiyat_min')),
    priceMax: toNum(sp.get('fiyat_max')),
    catalogNo: (sp.get('katalog') ?? '').trim().slice(0, 40),
    category: (sp.get('kategori') ?? '').trim(),
    facets: {},
  };
  for (const f of FACETS) {
    const vals = sp.getAll(f.key).map((v) => v.trim()).filter(Boolean);
    if (vals.length) state.facets[f.key] = [...new Set(vals)].slice(0, 30);
  }
  return state;
}
function toInt(v) { const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null; }
function toNum(v) { if (v == null || v === '') return null; const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; }

/** Filtre durumu → URL sorgu dizesi (boş değerler atılır, sıra sabittir) */
export function stateToParams(state, overrides = {}) {
  const s = { ...state, ...overrides, facets: { ...state.facets, ...(overrides.facets ?? {}) } };
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.category && !overrides.__omitCategory) p.set('kategori', s.category);
  for (const f of FACETS) for (const v of s.facets[f.key] ?? []) p.append(f.key, v);
  if (s.yearMin != null) p.set('yil_min', String(s.yearMin));
  if (s.yearMax != null) p.set('yil_max', String(s.yearMax));
  if ((s.yearMin != null || s.yearMax != null) && s.calendar === 'hicri') p.set('takvim', 'hicri');
  if (s.priceMin != null) p.set('fiyat_min', String(s.priceMin));
  if (s.priceMax != null) p.set('fiyat_max', String(s.priceMax));
  if (s.catalogNo) p.set('katalog', s.catalogNo);
  if (s.sort && s.sort !== 'onerilen') p.set('siralama', s.sort);
  if (s.page && s.page > 1) p.set('sayfa', String(s.page));
  return p;
}

/** Filtre uygulanmış mı? (q hariç; sıralama/sayfa filtre sayılmaz) */
export function hasFilters(state) {
  return Object.keys(state.facets).length > 0 || state.yearMin != null || state.yearMax != null
    || state.priceMin != null || state.priceMax != null || !!state.catalogNo || !!state.category;
}

// ---------------------------------------------------------------------------
// İndeks
// ---------------------------------------------------------------------------
const indexCache = new WeakMap();

/** Ürün için aranabilir belge üretir (ürün nesnesine bağlı önbellekte tutulur). */
function docFor(p, categoryTitles) {
  let d = indexCache.get(p);
  if (d) return d;
  const s = p.specs;
  const parts = [
    p.title,
    p.summary,
    ...(p.categoryPaths ?? []).flatMap((c) => categoryTitles(c)),
    ...(p.collectionTitles ?? []),
    s.country, s.ruler, s.period, s.metal, s.kind && KIND_LABELS[s.kind],
    s.denomination?.label, s.denomination?.unit,
    s.emission != null ? `${s.emission} emisyon` : null,
    s.catalogNumber, s.condition?.label,
    s.certification ? `${s.certification.service} ${s.certification.grade ?? ''} sertifikali` : null,
    s.yearText, p.sku,
  ].filter(Boolean);
  const text = normalizeText(parts.join(' | '));
  const titleText = normalizeText(p.title);
  d = {
    text,
    tokens: new Set(text.split(' ')),
    titleTokens: new Set(titleText.split(' ')),
    catalog: normalizeText(s.catalogNumber ?? ''),
  };
  indexCache.set(p, d);
  return d;
}

function yearOf(p, calendar) {
  const s = p.specs;
  if (!s.yearFrom) return null;
  if ((s.calendar ?? 'miladi') !== calendar) return null;
  return [s.yearFrom, s.yearTo ?? s.yearFrom];
}

/** Bir terim alternatifinin ürünle eşleşme puanı (0 = eşleşmedi) */
function matchAlt(alt, d, p) {
  if (alt.includes(' ')) return d.text.includes(alt) ? 1 : 0;
  if (/^\d+(\.\d+)?$/.test(alt)) {
    if (d.titleTokens.has(alt)) return 3;
    if (d.tokens.has(alt)) return 2;
    const n = Number(alt);
    // 4 haneli sayı → yıl aralığı içinde mi (ürünün kendi takvimine göre)
    if (n >= 1000 && n <= 2100 && p.specs.yearFrom) {
      const to = p.specs.yearTo ?? p.specs.yearFrom;
      if (n >= p.specs.yearFrom && n <= to) return 2;
    }
    return 0;
  }
  if (d.titleTokens.has(alt)) return 3;
  if (d.tokens.has(alt)) return 2;
  if (alt.length >= 2) {
    for (const t of d.titleTokens) if (t.startsWith(alt)) return 2;
    for (const t of d.tokens) if (t.startsWith(alt)) return 1;
  }
  return 0;
}

/** Sorgu puanı; herhangi bir terim eşleşmezse 0 (VE mantığı). */
export function scoreProduct(p, query, categoryTitles) {
  if (!query.terms.length) return 1;
  const d = docFor(p, categoryTitles);
  let score = 0;
  for (const alts of query.terms) {
    let best = 0;
    for (const a of alts) { best = Math.max(best, matchAlt(a, d, p)); if (best === 3) break; }
    if (!best) return 0;
    score += best;
  }
  if (query.raw && normalizeText(p.title).includes(query.raw)) score += 5; // tam ifade
  return score;
}

// ---------------------------------------------------------------------------
// Sorgu çalıştırma
// ---------------------------------------------------------------------------
/**
 * @param {Product[]} all — tam katalog
 * @param {object} state — parseState çıktısı
 * @param {object} opts
 * @param {(path:string)=>string[]} opts.categoryTitles — kategori yolunun başlıkları
 * @param {string|null} [opts.baseCategory] — kategori sayfasında sabit kategori
 * @param {string|null} [opts.baseCollection]
 * @param {'visible'|'unlisted'|'hidden'} [opts.soldVisibility]
 * @param {number} [opts.pageSize]
 */
export function runQuery(all, state, opts) {
  const pageSize = opts.pageSize ?? 24;
  const query = parseQuery(state.q);
  const categoryTitles = opts.categoryTitles ?? (() => []);

  // 1) Temel küme: görünürlük + sabit kategori/koleksiyon
  let base = all;
  if (opts.soldVisibility && opts.soldVisibility !== 'visible') base = base.filter((p) => p.availability.status !== 'sold');
  const cat = opts.baseCategory ?? (state.category || null);
  if (cat) base = base.filter((p) => inCategory(p, cat));
  if (opts.baseCollection) base = base.filter((p) => p.collections?.includes(opts.baseCollection));

  // 2) Metin araması
  const scored = new Map();
  if (query.terms.length) {
    base = base.filter((p) => {
      const sc = scoreProduct(p, query, categoryTitles);
      if (sc > 0) scored.set(p, sc);
      return sc > 0;
    });
  }

  // 3) Faset dışı filtreler
  const catalogQ = state.catalogNo ? normalizeText(state.catalogNo).replace(/\s/g, '') : '';
  const rangeFilter = (p) => {
    if (state.yearMin != null || state.yearMax != null) {
      const y = yearOf(p, state.calendar);
      if (!y) return false;
      if (state.yearMin != null && y[1] < state.yearMin) return false;
      if (state.yearMax != null && y[0] > state.yearMax) return false;
    }
    if (state.priceMin != null || state.priceMax != null) {
      if (p.offersEnabled) return false; // teklif ürününün açık fiyatı yoktur; fiyat aralığına girmez
      if (state.priceMin != null && p.price.amount < state.priceMin) return false;
      if (state.priceMax != null && p.price.amount > state.priceMax) return false;
    }
    if (catalogQ) {
      const c = docFor(p, categoryTitles).catalog.replace(/\s/g, '');
      if (!c || !c.includes(catalogQ)) return false;
    }
    return true;
  };
  base = base.filter(rangeFilter);

  // 4) Faset filtreleri + sayımlar (her faset kendi seçimi hariç sayılır)
  const active = Object.entries(state.facets);
  const matchFacet = (p, key, values) => {
    const f = FACETS.find((x) => x.key === key);
    if (!f) return true;
    const vals = f.get(p).map((v) => v.value);
    return values.some((v) => vals.includes(v));
  };
  const results = base.filter((p) => active.every(([k, v]) => matchFacet(p, k, v)));

  const facets = FACETS.map((f) => {
    const pool = base.filter((p) => active.every(([k, v]) => k === f.key || matchFacet(p, k, v)));
    const counts = new Map();
    for (const p of pool) for (const { value, label } of f.get(p)) {
      const c = counts.get(value) ?? { value, label, count: 0 };
      c.count++; counts.set(value, c);
    }
    const selected = state.facets[f.key] ?? [];
    for (const v of selected) if (!counts.has(v)) counts.set(v, { value: v, label: v, count: 0 });
    let options = [...counts.values()];
    options.sort(facetSorter(f.sort));
    return { key: f.key, label: f.label, searchable: !!f.searchable, options: options.map((o) => ({ ...o, selected: selected.includes(o.value) })) };
  }).filter((f) => f.options.length > 0);

  // 5) Sıralama
  const sorted = sortProducts(results, state.sort, scored);

  // 6) Sayfalama
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(state.page, pageCount);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Fiyat/yıl sınırları (filtre arayüzü için ipucu)
  const prices = base.filter((p) => !p.offersEnabled).map((p) => p.price.amount).filter((n) => n > 0);
  const years = base.map((p) => yearOf(p, state.calendar)).filter(Boolean).flat();
  const bounds = {
    price: prices.length ? [Math.min(...prices), Math.max(...prices)] : null,
    year: years.length ? [Math.min(...years), Math.max(...years)] : null,
  };

  return { items, total, page, pageCount, pageSize, facets, bounds, query: query.raw };
}

/** Yeni gelenler: stoktaki en yeni ürünler */
export function recentProducts(products, limit = 96) {
  return products.filter((p) => p.availability.status === 'in_stock')
    .sort((a, b) => (Date.parse(b.createdAt ?? '') || b.order) - (Date.parse(a.createdAt ?? '') || a.order))
    .slice(0, limit);
}

export function inCategory(p, path) {
  return (p.categoryPaths ?? []).some((c) => c === path || c.startsWith(path + '/'));
}

function facetSorter(mode) {
  if (mode === 'numeric') return (a, b) => Number(a.value) - Number(b.value) || b.count - a.count;
  if (mode === 'denomination') return (a, b) => (parseFloat(a.value) - parseFloat(b.value)) || a.label.localeCompare(b.label, 'tr');
  return (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr');
}

const statusRank = (p) => (p.availability.status === 'in_stock' ? 0 : p.availability.status === 'out_of_stock' ? 1 : 2);
/** Fiyat sıralamasında teklif ürünleri, açık fiyatlı ürünlerin ardından gelir (fiyatı sızdırmaz). */
const priceRank = (p) => (p.offersEnabled ? 1 : 0);
const dateOf = (p) => Date.parse(p.createdAt ?? '') || p.order || 0; // demo: tarih yoksa kaynak kayıt sırası
const yearSort = (p) => p.specs.calendar === 'hicri' && p.specs.yearFrom ? Math.round(p.specs.yearFrom * 0.970229 + 621.5643) : (p.specs.yearFrom ?? null);

export function sortProducts(list, sort, scored = new Map()) {
  const arr = [...list];
  const tie = (a, b) => a.title.localeCompare(b.title, 'tr');
  switch (sort) {
    case 'yeni': return arr.sort((a, b) => dateOf(b) - dateOf(a) || tie(a, b));
    case 'fiyat-artan': return arr.sort((a, b) => statusRank(a) - statusRank(b) || priceRank(a) - priceRank(b) || (a.offersEnabled ? 0 : a.price.amount - b.price.amount) || tie(a, b));
    case 'fiyat-azalan': return arr.sort((a, b) => statusRank(a) - statusRank(b) || priceRank(a) - priceRank(b) || (a.offersEnabled ? 0 : b.price.amount - a.price.amount) || tie(a, b));
    case 'yil-artan': return arr.sort((a, b) => nullLast(yearSort(a), yearSort(b), 1) || tie(a, b));
    case 'yil-azalan': return arr.sort((a, b) => nullLast(yearSort(a), yearSort(b), -1) || tie(a, b));
    case 'ad': return arr.sort(tie);
    default:
      return arr.sort((a, b) => statusRank(a) - statusRank(b) || (scored.get(b) ?? 0) - (scored.get(a) ?? 0) || dateOf(b) - dateOf(a) || tie(a, b));
  }
}
function nullLast(a, b, dir) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * dir;
}
