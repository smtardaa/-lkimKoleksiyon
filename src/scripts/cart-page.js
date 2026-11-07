/**
 * Sepet sayfası: satırlar sunucudan güncel fiyat/stok ile doğrulanarak çizilir.
 * Ödeme: /api/checkout — demo modunda ödeme oluşturulmaz; Shopify modunda
 * Storefront Cart API'den alınan checkoutUrl adresine yönlendirilir.
 */
import { cart, validate, checkout } from './store.js';

const root = document.querySelector('[data-cart-root]');
const linesEl = root.querySelector('[data-cart-lines]');
const statusEl = root.querySelector('[data-cart-status]');
const emptyEl = root.querySelector('[data-cart-empty]');
const summaryEl = root.querySelector('[data-cart-summary]');
const checkoutBtn = root.querySelector('[data-checkout]');
const coMsg = root.querySelector('[data-checkout-msg]');
let lastData = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function render() {
  const lines = cart.lines();
  if (!lines.length) {
    linesEl.innerHTML = '';
    statusEl.textContent = '';
    emptyEl.hidden = false;
    summaryEl.hidden = true;
    return;
  }
  statusEl.textContent = 'Fiyat ve stok doğrulanıyor…';
  let data;
  try {
    data = await validate(lines);
  } catch (e) {
    statusEl.textContent = 'Fiyat ve stok şu anda doğrulanamadı. Sayfayı yenileyin; doğrulama olmadan ödemeye geçilemez.';
    summaryEl.hidden = true;
    return;
  }
  lastData = data;
  // Sunucunun düzelttiği adetleri depoya yaz (stok sınırı / satılmış ürün)
  const next = lines.map((l) => {
    const v = data.lines.find((x) => x.variantId === l.variantId);
    if (!v || v.removed) return { ...l, unavailable: true };
    return { ...l, quantity: v.ok ? v.quantity : l.quantity, max: v.maxQuantity, title: v.product.title, url: v.product.url, image: v.product.image, priceText: v.product.priceText, unavailable: !v.ok };
  });
  cart.set(next.map(({ unavailable, ...l }) => l));

  emptyEl.hidden = true;
  summaryEl.hidden = false;
  const unavailableCount = data.lines.filter((l) => !l.ok).length;
  statusEl.textContent = `${data.lines.length} ürün${unavailableCount ? ` · ${unavailableCount} ürün satın alınamaz durumda` : ''}`;
  linesEl.innerHTML = data.lines.map((l) => {
    const p = l.product;
    if (!p) {
      return `<li class="cart-line"><div></div><div><h3>Bulunamayan ürün</h3><p class="warn">${esc(l.message)}</p></div>
        <div class="line-actions"><button type="button" class="link-btn" data-remove="${esc(l.variantId)}">Kaldır</button></div></li>`;
    }
    const qtyCtl = l.ok ? `
      <div class="qty" aria-label="Adet">
        <button type="button" data-step="-1" data-v="${esc(l.variantId)}" aria-label="Adedi azalt: ${esc(p.title)}">−</button>
        <input type="number" min="1" max="${l.maxQuantity}" value="${l.quantity}" data-qty="${esc(l.variantId)}" aria-label="Adet: ${esc(p.title)}" />
        <button type="button" data-step="1" data-v="${esc(l.variantId)}" aria-label="Adedi artır: ${esc(p.title)}" ${l.quantity >= l.maxQuantity ? 'disabled' : ''}>+</button>
      </div>` : '';
    return `<li class="cart-line">
      ${p.image ? `<img src="${esc(p.image)}" alt="" width="96" height="96" loading="lazy" />` : '<div></div>'}
      <div>
        <h3><a href="${esc(p.url)}">${esc(p.title)}</a></h3>
        <p class="line-meta">${p.offerOnly ? 'Teklif ürünü' : `${esc(p.priceText)} · ${l.ok ? `en fazla ${l.maxQuantity} adet` : (p.status === 'sold' ? 'Satıldı' : 'Stokta yok')}`}</p>
        ${l.message ? `<p class="warn">${esc(l.message)}${p.offerUrl ? ` <a href="${esc(p.offerUrl)}">Teklif ver</a>` : ''}</p>` : ''}
      </div>
      <div class="line-actions">${qtyCtl}<button type="button" class="link-btn" data-remove="${esc(l.variantId)}">Kaldır</button></div>
    </li>`;
  }).join('');

  root.querySelector('[data-subtotal]').textContent = data.subtotalText;
  root.querySelector('[data-total]').textContent = data.subtotalText;
  const t = new Date(data.checkedAt);
  root.querySelector('[data-checked-at]').textContent = `Fiyat ve stok ${t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} itibarıyla doğrulandı.`;
  checkoutBtn.disabled = unavailableCount > 0 || data.lines.every((l) => !l.ok);
  coMsg.textContent = unavailableCount > 0 ? 'Satın alınamayan ürünleri sepetten kaldırın.' : '';
  coMsg.dataset.tone = 'error';
}

linesEl.addEventListener('click', (e) => {
  const rm = e.target.closest('[data-remove]');
  if (rm) { cart.remove(rm.dataset.remove); render(); return; }
  const st = e.target.closest('[data-step]');
  if (st) {
    const line = cart.get(st.dataset.v);
    if (!line) return;
    const q = Math.max(1, Math.min(line.max ?? 99, line.quantity + Number(st.dataset.step)));
    cart.upsert({ ...line, quantity: q });
    render();
  }
});
linesEl.addEventListener('change', (e) => {
  const inp = e.target.closest('[data-qty]');
  if (!inp) return;
  const line = cart.get(inp.dataset.qty);
  if (!line) return;
  const q = Math.max(1, Math.min(line.max ?? 99, parseInt(inp.value, 10) || 1));
  cart.upsert({ ...line, quantity: q });
  render();
});

checkoutBtn.addEventListener('click', async () => {
  checkoutBtn.disabled = true;
  coMsg.textContent = 'Ödeme öncesi fiyat ve stok yeniden doğrulanıyor…';
  coMsg.dataset.tone = '';
  try {
    const data = await checkout(cart.lines());
    if (data.demo) {
      coMsg.textContent = '';
      document.getElementById('demo-checkout')?.showModal();
    } else {
      coMsg.textContent = data.message ?? 'Ödeme başlatılamadı. Lütfen tekrar deneyin.';
      coMsg.dataset.tone = 'error';
      if (data.validation) render();
    }
  } catch {
    coMsg.textContent = 'Sepet doğrulanamadı. Sipariş oluşturulmadı; lütfen tekrar deneyin.';
    coMsg.dataset.tone = 'error';
  }
  checkoutBtn.disabled = false;
});

window.addEventListener('storage', render);
render();
