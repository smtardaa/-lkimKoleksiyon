/**
 * Sepet doğrulaması (statik önizleme). Ana sürümde sunucuda çalışan kurallar burada saf fonksiyondur;
 * tarayıcı, derlemede üretilen katalog verisiyle aynı kuralları uygular.
 * Önizlemede ödeme ve sipariş yoktur.
 */
import { productUrl } from './urls.js';
import { formatMoney } from './format.js';
import { isOfferOnly, offerUrl } from './offers/status.js';

/** Kaynakta adet yayınlanmadığı için satır başına üst sınır (demo politikası, stok iddiası değildir). */
export const UNKNOWN_QTY_LIMIT = { default: 1, malzeme: 5 };

export function purchaseLimit(p) {
  // Teklif ürünleri sepete veya ödemeye giremez.
  if (isOfferOnly(p) || p.availability.status !== 'in_stock') return 0;
  if (typeof p.availability.quantity === 'number') return Math.max(0, p.availability.quantity);
  return p.specs.kind === 'malzeme' ? UNKNOWN_QTY_LIMIT.malzeme : UNKNOWN_QTY_LIMIT.default;
}

/**
 * @param {{variantId:string, quantity:number}[]} lines
 * @param {(variantId:string)=>import('./types.js').Product|undefined} findProduct
 */
export function validateLines(lines, findProduct) {
  const clean = (Array.isArray(lines) ? lines : [])
    .filter((l) => l && typeof l.variantId === 'string' && l.variantId.length < 200)
    .slice(0, 100)
    .map((l) => ({ variantId: l.variantId, quantity: Math.max(1, Math.min(999, parseInt(l.quantity, 10) || 1)) }));

  let subtotal = 0;
  let currencyCode = 'TRY';
  const out = clean.map((l) => {
    const p = findProduct(l.variantId);
    if (!p) return { variantId: l.variantId, ok: false, removed: true, quantity: 0, message: 'Ürün artık satışta değil veya bulunamadı.' };
    const limit = purchaseLimit(p);
    const status = p.availability.status;
    const offerOnly = isOfferOnly(p);
    const buyable = status === 'in_stock' && !offerOnly;
    const quantity = Math.min(l.quantity, limit);
    let message = null;
    if (offerOnly) message = 'Bu ürün sabit fiyatla satılmaz; yalnızca teklif alınır.';
    else if (status === 'sold') message = 'Bu ürün satıldı; satın alınamaz.';
    else if (status !== 'in_stock') message = 'Bu ürün şu anda stokta yok.';
    else if (l.quantity > limit) message = `Bu üründen en fazla ${limit} adet alınabilir; adet güncellendi.`;
    if (buyable) { subtotal += p.price.amount * quantity; currencyCode = p.price.currencyCode; }
    return {
      variantId: l.variantId,
      ok: buyable && quantity > 0,
      quantity: buyable ? quantity : 0,
      requested: l.quantity,
      maxQuantity: limit,
      message,
      product: {
        id: p.id,
        handle: p.handle,
        url: productUrl(p),
        title: p.title,
        price: offerOnly ? null : p.price,
        priceText: offerOnly ? '' : formatMoney(p.price),
        offerOnly,
        offerUrl: offerOnly ? offerUrl(p) : null,
        status,
        image: p.images[0]?.srcSmall ?? p.images[0]?.src ?? null,
        imageAlt: p.images[0]?.alt ?? p.title,
      },
    };
  });
  return {
    mode: 'demo',
    lines: out,
    subtotal: { amount: subtotal, currencyCode },
    subtotalText: formatMoney({ amount: subtotal, currencyCode }),
    checkedAt: new Date().toISOString(),
  };
}

/** Ödeme adımı: önizlemede hiçbir zaman ödeme veya sipariş oluşturmaz. */
export function demoCheckout(validation) {
  if (!validation.lines.length) return { ok: false, message: 'Sepet boş.' };
  const blocked = validation.lines.filter((l) => !l.ok || l.quantity !== l.requested);
  if (blocked.length) {
    return { ok: false, validation, message: 'Sepetteki bazı ürünlerin stok veya adet durumu değişti. Lütfen sepeti kontrol edin.' };
  }
  return { ok: false, demo: true, message: 'Bu bir demo mağazadır. Demo ürünler gerçek ödemeye gönderilmez; sipariş oluşturulmadı.' };
}
