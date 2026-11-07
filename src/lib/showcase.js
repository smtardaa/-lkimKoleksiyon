/**
 * Vitrin seçimleri: ana sayfa görselleri katalogdaki gerçek ürünlerden seçilir.
 * Görsel uydurulmaz; seçilen ürünün görseli ve bağlantısı kullanılır.
 */
import { listable } from './catalog.js';

const aspect = (img) => (img ? img.width / img.height : 0);

/** Geniş (banknot) görselli stoktaki ürünler */
export function bannerNotes(products, n = 3, filter = () => true) {
  return listable(products)
    .filter((p) => p.availability.status === 'in_stock' && p.images[0] && aspect(p.images[0]) >= 1.6 && filter(p))
    .sort((a, b) => b.price.amount - a.price.amount)
    .slice(0, n);
}

/** Tek, yaklaşık daire biçimli (kare oranlı) madeni para görseli olan ürünler */
export function roundCoins(products, n = 2, filter = () => true) {
  return listable(products)
    .filter((p) => p.availability.status === 'in_stock' && p.specs.kind === 'madeni' && filter(p))
    .map((p) => ({ p, img: p.images.find((i) => Math.abs(aspect(i) - 1) < 0.08) }))
    .filter((x) => x.img)
    .sort((a, b) => b.p.price.amount - a.p.price.amount)
    .slice(0, n);
}

/** Koşula uyan ürünlerden görselli olanlar */
export function withImages(products, filter, n) {
  return listable(products).filter((p) => p.images[0] && p.availability.status !== 'sold' && filter(p)).slice(0, n);
}
