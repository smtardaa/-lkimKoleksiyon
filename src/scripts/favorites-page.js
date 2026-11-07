/** Favoriler sayfası: yerel listedeki ürünler güncel durumlarıyla sunucudan alınır. */
import { favorites } from './store.js';
import { loadCatalogData } from './catalog-data.js';
import { favoriteItems } from '../lib/favorites.js';

const root = document.querySelector('[data-fav-root]');
const grid = root.querySelector('[data-fav-grid]');
const statusEl = root.querySelector('[data-fav-status]');
const empty = root.querySelector('[data-fav-empty]');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HEART = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-8.7C1.3 8.2 3 4.8 6.3 4.5c2-.2 3.6.9 4.6 2.3h2.2c1-1.4 2.6-2.5 4.6-2.3 3.3.3 5 3.7 3.5 6.8C19 15.6 12 20 12 20Z"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14"/></svg>';

function card(p) {
  const badge = p.status === 'sold' ? '<span class="status-badge status-badge--sold">Satıldı</span>'
    : p.status === 'out_of_stock' ? '<span class="status-badge status-badge--oos">Stokta yok</span>' : '';
  const btn = p.offerOnly
    ? (p.offerAccepting ? `<a class="btn btn--lime btn--sm offer-cta" href="${esc(p.offerUrl)}" aria-label="Teklif ver: ${esc(p.title)}">Teklif Ver</a>` : '')
    : p.status === 'in_stock'
      ? `<button type="button" class="add" data-add-to-cart="${esc(p.variantId)}" aria-label="Sepete ekle: ${esc(p.title)}">${PLUS}</button>`
      : `<button type="button" class="add" disabled aria-label="${esc(p.statusText)}: ${esc(p.title)}">${MINUS}</button>`;
  const price = p.offerOnly
    ? `<span class="offer-tag${p.offerAccepting ? '' : ' offer-tag--off'}">${p.offerAccepting ? 'Teklife açık' : 'Teklif alımı kapalı'}</span>`
    : `<span class="price">${esc(p.priceText)}</span>`;
  return `<article class="p-card${p.status === 'sold' ? ' is-sold' : ''}">
    <a class="media" href="${esc(p.url)}" tabindex="-1" aria-hidden="true">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" width="360" height="360" />` : ''}</a>
    ${badge}
    <button type="button" class="fav-btn" data-fav-toggle="${esc(p.id)}" data-title="${esc(p.title)}" aria-pressed="true" aria-label="Favorilerden çıkar: ${esc(p.title)}">${HEART}</button>
    <div class="body">
      <h2 class="title"><a href="${esc(p.url)}">${esc(p.title)}</a></h2>
      ${p.meta ? `<p class="meta">${esc(p.meta)}</p>` : ''}
      <div class="foot${p.offerOnly ? ' foot--offer' : ''}">${price}${btn}</div>
    </div>
  </article>`;
}

async function render() {
  const ids = favorites.ids();
  if (!ids.length) { grid.innerHTML = ''; statusEl.textContent = ''; empty.hidden = false; return; }
  empty.hidden = true;
  try {
    const { products } = await loadCatalogData();
    const data = favoriteItems(ids, products);
    if (data.missing?.length) favorites.set(ids.filter((id) => !data.missing.includes(id)));
    statusEl.textContent = `${data.items.length} favori ürün${data.missing?.length ? ` · ${data.missing.length} ürün artık katalogda olmadığı için listeden çıkarıldı` : ''}`;
    grid.innerHTML = data.items.map(card).join('');
  } catch {
    statusEl.textContent = 'Favori ürün bilgileri şu anda alınamadı.';
  }
}

window.addEventListener('ilkim:store', (e) => { if (String(e.detail?.key ?? '').includes('favorites')) render(); });
render();
