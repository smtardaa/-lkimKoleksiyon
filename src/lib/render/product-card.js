/**
 * Ürün kartı HTML'i — TEK KAYNAK.
 * Derlenen sayfalardaki kartlar ve tarayıcıda filtre sonucu çizilen kartlar bu fonksiyondan çıkar;
 * böylece iki yerde ayrı şablon tutulmaz.
 */
import { formatMoney, KIND_LABEL } from '../format.js';
import { productUrl } from '../urls.js';
import { isOfferOnly, offerStatus, offerUrl } from '../offers/status.js';
import { iconSvg } from '../icons.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderCard(p, { eager = false, headingLevel = 'h3', categoryLabel = null } = {}) {
  const img = p.images[0];
  const status = p.availability.status;
  const url = esc(productUrl(p));
  const title = esc(p.title);
  const metaParts = [
    categoryLabel ?? (p.specs.kind ? KIND_LABEL[p.specs.kind] : null),
    p.specs.country,
    p.specs.yearText && p.specs.calendar === 'hicri' ? `H. ${p.specs.yearText}` : p.specs.yearText,
  ].filter(Boolean);
  const cert = p.specs.certification;
  const offer = isOfferOnly(p) ? offerStatus(p) : null;

  const media = img
    ? `<img src="${esc(img.srcSmall ?? img.src)}" alt="" width="${img.width > 600 ? 600 : img.width}" height="${img.width > 600 ? Math.round((600 * img.height) / img.width) : img.height}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
    : '<span class="muted small" style="display:grid;place-items:center;height:100%">Görsel yok</span>';

  let foot;
  if (offer) {
    foot = `<div class="foot foot--offer">${offer.accepting
      ? `<span class="offer-tag">Teklife açık</span><a class="btn btn--lime btn--sm offer-cta" href="${esc(offerUrl(p))}" aria-label="Teklif ver: ${title}">Teklif Ver</a>`
      : `<span class="offer-tag offer-tag--off">${status === 'sold' ? 'Satıldı' : 'Teklif alımı kapalı'}</span>`}</div>`;
  } else {
    const was = p.compareAtPrice && p.compareAtPrice.amount > p.price.amount ? `<s>${esc(formatMoney(p.compareAtPrice))}</s>` : '';
    const action = status === 'in_stock'
      ? `<button type="button" class="add" data-add-to-cart="${esc(p.variantId)}" aria-label="Sepete ekle: ${title}">${iconSvg('plus')}</button>`
      : `<button type="button" class="add" disabled aria-label="${status === 'sold' ? 'Satıldı' : 'Stokta yok'}: ${title}">${iconSvg('minus')}</button>`;
    foot = `<div class="foot"><span class="price">${was}<span class="visually-hidden">Fiyat: </span>${esc(formatMoney(p.price))}</span>${action}</div>`;
  }

  return `<article class="p-card${status === 'sold' ? ' is-sold' : ''}">
  <a class="media" href="${url}" tabindex="-1" aria-hidden="true">${media}</a>
  ${status === 'sold' ? '<span class="status-badge status-badge--sold">Satıldı</span>' : ''}${status === 'out_of_stock' ? '<span class="status-badge status-badge--oos">Stokta yok</span>' : ''}${cert ? `<span class="status-badge status-badge--cert" title="Sertifika">${esc(cert.service)}${cert.grade ? ` ${esc(cert.grade)}` : ''}</span>` : ''}
  <button type="button" class="fav-btn" data-fav-toggle="${esc(p.id)}" data-title="${title}" aria-pressed="false" aria-label="Favorilere ekle: ${title}">${iconSvg('heart')}</button>
  <div class="body">
    <${headingLevel} class="title"><a href="${url}">${title}</a></${headingLevel}>
    ${metaParts.length > 0 ? `<p class="meta">${esc(metaParts.join(' · '))}</p>` : ''}
    ${foot}
  </div>
</article>`;
}
