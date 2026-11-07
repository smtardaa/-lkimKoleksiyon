/** Favoriler sayfası için ürün özetleri (ana sürümdeki /api/products mantığı). */
import { formatMoney, STATUS_LABEL } from './format.js';
import { isOfferOnly, offerStatus, offerUrl } from './offers/status.js';
import { productUrl } from './urls.js';

export function favoriteItems(ids, products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = ids.map((id) => byId.get(id)).filter(Boolean).map((p) => ({
    id: p.id,
    variantId: p.variantId,
    title: p.title,
    url: productUrl(p),
    priceText: isOfferOnly(p) ? '' : formatMoney(p.price),
    offerOnly: isOfferOnly(p),
    offerAccepting: offerStatus(p).accepting,
    offerUrl: isOfferOnly(p) ? offerUrl(p) : null,
    status: p.availability.status,
    statusText: STATUS_LABEL[p.availability.status],
    image: p.images[0]?.srcSmall ?? p.images[0]?.src ?? null,
    meta: [p.specs.country, p.specs.yearText].filter(Boolean).join(' · '),
  }));
  return { items, missing: ids.filter((id) => !byId.has(id)) };
}
