/**
 * Ana sayfa slider bölümlerinin seçim mantığı (saf fonksiyonlar; sağlayıcıdan bağımsız, test edilebilir).
 *
 * Akış: sectionRequests(config) → provider.getHomeSections(istekler) → buildHomeSections(...)
 * Sağlayıcı, bölüm başına yalnızca gereken kadar aday döndürür; bütün envanter indirilmez.
 */
import { inCategory } from './search/engine.js';
import { isOfferOnly, offerStatus } from './offers/status.js';

/** Satışa açık (sepete eklenebilir) veya teklif almaya açık ürün */
export const isAvailable = (p) => (isOfferOnly(p) ? offerStatus(p).accepting : p.availability.status === 'in_stock');

const rank = (p) => (isAvailable(p) ? 0 : p.availability.status === 'sold' ? 2 : 1);

/** Kararlı sıralama: açık ürünler öne, satılmışlar sona; grup içi sıra (koleksiyon sırası) korunur. */
export function prioritize(products) {
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map((x) => x.p);
}

const limitOf = (config, section) => Math.max(1, Math.min(24, section.limit ?? config.defaultLimit ?? 10));
/** Öncelik ve tekrar önleme payı için sınırın iki katı aday istenir (en fazla 30). */
const fetchSize = (limit) => Math.min(limit * 2, 30);

/** Sağlayıcıya gönderilecek istekler: yalnızca görünür kategori/seçki bölümleri. */
export function sectionRequests(config) {
  return config.sections
    .filter((s) => s.visible !== false && (s.source.type === 'category' || s.source.type === 'collection'))
    .map((s) => ({
      id: s.id,
      type: s.source.type,
      key: s.source.type === 'category' ? s.source.path : s.source.handle,
      first: fetchSize(limitOf(config, s)),
    }));
}

/**
 * Yerel (demo) veri için adaylar. Koleksiyon içi elle sıralama bulunmadığından
 * varsayılan sıra: açık ürünler önce, sonra en yeni (order büyükten küçüğe).
 */
export function localCandidates(products, request) {
  const list = products.filter((p) => (request.type === 'category'
    ? inCategory(p, request.key)
    : p.collections?.includes(request.key)));
  const newest = [...list].sort((a, b) => (b.order ?? 0) - (a.order ?? 0) || a.title.localeCompare(b.title, 'tr'));
  return prioritize(newest).slice(0, request.first);
}

/**
 * Adaylardan bölümde gösterilecek ürünleri seçer.
 * - Aynı ürün bölüm içinde bir kez yer alır; sayı tamamlamak için çoğaltılmaz.
 * - Önceki bölümlerde gösterilmemiş ürünler tercih edilir.
 */
export function pickProducts(candidates, { limit, seen = new Set(), preferUniqueMin = 5, soldVisibility = 'visible' }) {
  const unique = [...new Map(candidates.map((p) => [p.id, p])).values()]
    .filter((p) => soldVisibility === 'visible' || p.availability.status !== 'sold');
  const ordered = prioritize(unique);
  const fresh = ordered.filter((p) => !seen.has(p.id));
  const enoughFresh = fresh.length >= Math.min(preferUniqueMin, limit);
  const pool = enoughFresh ? fresh : prioritize([...fresh, ...ordered.filter((p) => seen.has(p.id))]);
  return pool.slice(0, limit);
}

/**
 * @param {object} a
 * @param {object} a.config            homeSliders
 * @param {Record<string,{title?:string,description?:string|null,products:any[]}>} a.fetched  sağlayıcı yanıtı
 * @param {any[]} a.offers             teklif kabul eden ürünler (sıralı)
 * @param {{categoryUrl:Function, collectionUrl:Function, offersUrl:string}} a.urls
 * @param {'visible'|'unlisted'|'hidden'} [a.soldVisibility]
 * @returns {{id:string,title:string,description:string|null,href:string,tone:string,products:any[]}[]}
 */
export function buildHomeSections({ config, fetched, offers = [], urls, soldVisibility = 'visible' }) {
  const visible = config.sections.filter((s) => s.visible !== false);
  const seen = new Set();
  const picked = new Map();
  const pick = (section, candidates, opts = {}) => {
    const products = pickProducts(candidates, { limit: limitOf(config, section), seen, preferUniqueMin: config.preferUniqueMin, soldVisibility, ...opts });
    products.forEach((p) => seen.add(p.id));
    picked.set(section.id, products);
  };

  // Teklif bölümü önce seçilir: teklif ürünleri kategori slider'larında yeniden öne çıkmasın.
  for (const s of visible.filter((x) => x.source.type === 'offers')) {
    pick(s, offers.filter((p) => offerStatus(p).accepting), { seen: new Set() });
  }
  for (const s of visible.filter((x) => x.source.type !== 'offers')) {
    pick(s, fetched[s.id]?.products ?? []);
  }

  return visible
    .map((s) => {
      const data = fetched[s.id] ?? {};
      const href = s.source.type === 'category' ? urls.categoryUrl(s.source.path)
        : s.source.type === 'collection' ? urls.collectionUrl(s.source.handle)
          : urls.offersUrl;
      return {
        id: s.id,
        title: s.title ?? data.title ?? null,
        description: s.description ?? data.description ?? null,
        href,
        tone: s.tone ?? 'main',
        products: picked.get(s.id) ?? [],
      };
    })
    .filter((s) => s.title && s.products.length > 0);
}
