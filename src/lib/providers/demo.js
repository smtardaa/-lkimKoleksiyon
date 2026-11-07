/**
 * Demo envanteri. Görsel adresleri burada alt yolla birleştirilir;
 * sayfalar ve katalog verisi hep bu kayıtları kullanır.
 */
import rawProducts from '../../data/demo/products.json';
import categories from '../../data/demo/categories.json';
import collections from '../../data/demo/collections.json';
import { u } from '../paths.js';

export const products = rawProducts.map((p) => ({
  ...p,
  images: p.images.map((i) => ({ ...i, src: u(i.src), srcSmall: u(i.srcSmall) })),
}));

export { categories, collections };
