/**
 * Derlemede üretilen katalog verisini (data/catalog.json) bir kez yükler.
 * Sitenin tek veri isteği budur; sunucu çağrısı yoktur.
 */
import { u } from '../lib/paths.js';
import { makeCategoryTitles } from '../lib/urls.js';

let pending = null;

export function loadCatalogData() {
  pending ??= fetch(u('/data/catalog.json'))
    .then((res) => {
      if (!res.ok) throw new Error(`Katalog verisi alınamadı (${res.status})`);
      return res.json();
    })
    .then(({ products, categories }) => {
      const byVariant = new Map(products.map((p) => [p.variantId, p]));
      return {
        products,
        findProduct: (id) => byVariant.get(id),
        categoryTitles: makeCategoryTitles(categories),
      };
    })
    .catch((err) => {
      pending = null; // bir sonraki denemede yeniden istensin
      throw err;
    });
  return pending;
}
