/**
 * Katalog servisi — derleme sırasında sayfaların tek giriş noktası.
 * Tarayıcı aynı motoru data/catalog.json üzerinden çalıştırır.
 */
import { products, categories, collections } from './providers/demo.js';
import { soldVisibility } from '../config/site.js';
import { runQuery, inCategory, sortProducts } from './search/engine.js';
import { acceptingOffers } from './offers/status.js';
import { productUrl, categoryUrl, collectionUrl, makeCategoryTitles } from './urls.js';

/** @typedef {import('./types.js').Product} Product */

const catalog = {
  products,
  categories,
  collections,
  catMap: new Map(categories.map((c) => [c.path, c])),
  collMap: new Map(collections.map((c) => [c.handle, c])),
  categoryTitles: makeCategoryTitles(categories),
};

export async function loadCatalog() {
  return catalog;
}

/** Listelerde gösterilecek ürünler */
export function listable(items) {
  return soldVisibility === 'visible' ? items : items.filter((p) => p.availability.status !== 'sold');
}

export function search(cat, state, opts = {}) {
  return runQuery(cat.products, state, {
    categoryTitles: cat.categoryTitles,
    soldVisibility,
    ...opts,
  });
}

/** Kategori yolu için kırıntılar: [{title, href}] */
export function categoryTrail(cat, path) {
  const out = [];
  if (!path) return out;
  const parts = path.split('/');
  for (let i = 1; i <= parts.length; i++) {
    const p = parts.slice(0, i).join('/');
    const c = cat.catMap.get(p);
    if (c) out.push({ title: c.title, href: categoryUrl(p) });
  }
  return out;
}

export function childCategories(cat, path, { nonEmpty = true } = {}) {
  return cat.categories
    .filter((c) => c.parent === (path ?? null) && (!nonEmpty || c.productCount > 0))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.title.localeCompare(b.title, 'tr', { numeric: true }));
}

export function relatedProducts(cat, product, limit = 8) {
  const pool = listable(cat.products).filter((p) => p.id !== product.id && p.availability.status !== 'sold');
  const scored = pool.map((p) => {
    let s = 0;
    if (product.primaryCategory && p.primaryCategory === product.primaryCategory) s += 5;
    else if (product.primaryCategory && p.categoryPaths.some((c) => product.primaryCategory.startsWith(c.split('/')[0]))) s += 2;
    if (product.specs.country && p.specs.country === product.specs.country) s += 2;
    if (product.specs.emission && p.specs.emission === product.specs.emission) s += 2;
    if (product.specs.ruler && p.specs.ruler === product.specs.ruler) s += 2;
    if (p.collections.some((c) => product.collections.includes(c))) s += 1;
    return { p, s };
  }).filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s || b.p.order - a.p.order);
  return scored.slice(0, limit).map((x) => x.p);
}

export function newestProducts(cat, limit = 12, filter = () => true) {
  return sortProducts(listable(cat.products).filter((p) => p.availability.status === 'in_stock' && filter(p)), 'yeni').slice(0, limit);
}

/** /teklif-ver listesi: yalnızca şu anda teklif kabul edenler, en yeniden eskiye */
export function offerProducts(cat) {
  return sortProducts(acceptingOffers(listable(cat.products)), 'yeni');
}

export { productUrl, categoryUrl, collectionUrl, inCategory };
