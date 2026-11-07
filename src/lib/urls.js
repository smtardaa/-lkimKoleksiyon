/** Sayfa adresleri. Derlemede ve tarayıcıda aynı fonksiyonlar kullanılır. */
import { u } from './paths.js';

export const productUrl = (p) => u(`/urun/${encodeURIComponent(p.handle)}`);
export const categoryUrl = (path) => u(`/kategori/${path}`);
export const collectionUrl = (handle) => u(`/koleksiyonlar/${handle}`);

/** Kategori yolunun başlıklarını kökten yaprağa döndüren fonksiyon üretir. */
export function makeCategoryTitles(categories) {
  const titles = new Map(categories.map((c) => [c.path, c.title]));
  return (path) => {
    const parts = path.split('/');
    const out = [];
    for (let i = 1; i <= parts.length; i++) {
      const t = titles.get(parts.slice(0, i).join('/'));
      if (t) out.push(t);
    }
    return out;
  };
}
