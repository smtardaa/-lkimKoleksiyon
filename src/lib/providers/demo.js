/**
 * Demo envanteri. Görsel adresleri burada alt yolla birleştirilir;
 * sayfalar ve katalog verisi hep bu kayıtları kullanır.
 */
import rawProducts from '../../data/demo/products.json';
import categories from '../../data/demo/categories.json';
import collections from '../../data/demo/collections.json';
import { u } from '../paths.js';
import { localCandidates } from '../home-sections.js';

export const products = rawProducts.map((p) => ({
  ...p,
  images: p.images.map((i) => ({ ...i, src: u(i.src), srcSmall: u(i.srcSmall) })),
}));

/** Ana sayfa slider adayları: bölüm başına yalnızca istenen kadar ürün (varsayılan sıra home-sections.js içinde). */
export function getHomeSections(requests) {
  return Object.fromEntries(requests.map((r) => {
    const meta = r.type === 'category'
      ? categories.find((c) => c.path === r.key)
      : collections.find((c) => c.handle === r.key);
    return [r.id, { title: meta?.title ?? null, description: meta?.description ?? null, products: localCandidates(products, r) }];
  }));
}

export { categories, collections };
