/**
 * Tarayıcı tarafı sepet ve favori deposu (localStorage).
 * - Sepette yalnızca varyant kimliği + adet + görüntüleme kopyası tutulur;
 *   fiyat ve stok her gösterimde ve ödeme öncesinde sunucudan doğrulanır.
 * - Favoriler demo aşamasında yalnızca bu tarayıcıda saklanır (üyelik yok).
 */
import { validateLines, demoCheckout } from '../lib/cart-core.js';
import { loadCatalogData } from './catalog-data.js';

const CART_KEY = 'ilkim.cart.v1';
const FAV_KEY = 'ilkim.favorites.v1';

function read(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* depolama kapalı olabilir */ }
  window.dispatchEvent(new CustomEvent('ilkim:store', { detail: { key } }));
}

export const cart = {
  lines() { return read(CART_KEY, []).filter((l) => l && l.variantId && l.quantity > 0); },
  count() { return this.lines().reduce((n, l) => n + l.quantity, 0); },
  get(variantId) { return this.lines().find((l) => l.variantId === variantId) ?? null; },
  set(lines) { write(CART_KEY, lines.filter((l) => l.quantity > 0)); },
  upsert(line) {
    const lines = this.lines();
    const i = lines.findIndex((l) => l.variantId === line.variantId);
    if (i >= 0) lines[i] = { ...lines[i], ...line }; else lines.push(line);
    this.set(lines);
  },
  remove(variantId) { this.set(this.lines().filter((l) => l.variantId !== variantId)); },
  clear() { this.set([]); },
};

export const favorites = {
  ids() { return read(FAV_KEY, []).filter((x) => typeof x === 'string'); },
  has(id) { return this.ids().includes(id); },
  toggle(id) {
    const ids = this.ids();
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    write(FAV_KEY, next);
    return next.includes(id);
  },
  set(ids) { write(FAV_KEY, ids); },
};

/** Fiyat ve stok doğrulaması: derlemede üretilen katalog verisiyle yapılır */
export async function validate(lines) {
  const { findProduct } = await loadCatalogData();
  return validateLines(lines, findProduct);
}

/** Ödeme adımı: önizlemede ödeme veya sipariş oluşmaz */
export async function checkout(lines) {
  return demoCheckout(await validate(lines));
}

/** Sepete ekle: önce güncel stok/fiyat doğrulanır */
export async function addToCart(variantId, qty = 1) {
  const existing = cart.get(variantId);
  const wanted = (existing?.quantity ?? 0) + qty;
  const data = await validate([{ variantId, quantity: wanted }]);
  const line = data.lines[0];
  if (!line || !line.ok) {
    return { ok: false, message: line?.message ?? 'Ürün sepete eklenemedi.' };
  }
  cart.upsert({
    variantId,
    productId: line.product.id,
    quantity: line.quantity,
    max: line.maxQuantity,
    title: line.product.title,
    url: line.product.url,
    image: line.product.image,
    priceText: line.product.priceText,
  });
  const capped = line.quantity < wanted;
  return {
    ok: true,
    capped,
    message: capped ? line.message : `“${line.product.title}” sepete eklendi.`,
  };
}
