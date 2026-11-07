/**
 * Tarayıcıya gönderilen katalog verisi.
 * Yalnızca arama, filtre, kart ve sepet için gereken alanlar yazılır.
 * Kaynak kaydı (source) ve ek notlar çıktıya girmez; teklif ürünlerinin fiyatı yazılmaz.
 */
import { isOfferOnly } from './offers/status.js';

export function toClientProduct(p) {
  const offer = isOfferOnly(p);
  const img = p.images[0];
  return {
    id: p.id,
    variantId: p.variantId,
    handle: p.handle,
    title: p.title,
    summary: p.summary,
    sku: p.sku,
    categoryPaths: p.categoryPaths,
    primaryCategory: p.primaryCategory,
    collections: p.collections,
    collectionTitles: p.collectionTitles,
    price: offer ? { amount: 0, currencyCode: p.price.currencyCode } : p.price,
    compareAtPrice: offer ? null : p.compareAtPrice,
    availability: p.availability,
    images: img ? [{ src: img.src, srcSmall: img.srcSmall, width: img.width, height: img.height, alt: img.alt }] : [],
    specs: p.specs,
    createdAt: p.createdAt,
    order: p.order,
    offersEnabled: p.offersEnabled,
    offersClosed: p.offersClosed,
  };
}

export function buildPayload({ products, categories }) {
  return {
    products: products.map(toClientProduct),
    categories: categories.map((c) => ({ path: c.path, title: c.title })),
  };
}
