/**
 * Katalog görünümü HTML'i — TEK KAYNAK: filtre paneli, araç çubuğu, ızgara, sayfalama.
 * Derleme sırasında varsayılan durum için, tarayıcıda ise adresteki filtrelerle aynı fonksiyon çalışır.
 * Filtreler GET formuyla adrese yazılır; geri/ileri ve paylaşılabilir bağlantılar doğal olarak çalışır.
 */
import { SORTS, FACETS, stateToParams, hasFilters } from '../search/engine.js';
import { formatNumber } from '../format.js';
import { iconSvg } from '../icons.js';
import { u } from '../paths.js';
import { renderCard, esc } from './product-card.js';

export function renderCatalog({ basePath, state, result, omitCategoryParam = false, showSearchBox = true, emptyTitle, emptyText, subcategories = [] }) {
  const href = (overrides) => {
    const qs = stateToParams(state, { ...overrides, __omitCategory: omitCategoryParam }).toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const facetLabel = (key, value) => result.facets.find((x) => x.key === key)?.options.find((o) => o.value === value)?.label ?? value;
  const facetTitle = (key) => FACETS.find((f) => f.key === key)?.label ?? key;

  // Aktif filtre etiketleri (her biri tek tıkla kaldırılabilir)
  const chips = [];
  if (state.q) chips.push({ label: `“${state.q}”`, href: href({ q: '', page: 1 }) });
  for (const [k, vals] of Object.entries(state.facets)) {
    for (const v of vals) chips.push({ label: `${facetTitle(k)}: ${facetLabel(k, v)}`, href: href({ page: 1, facets: { [k]: vals.filter((x) => x !== v) } }) });
  }
  if (state.yearMin != null || state.yearMax != null) chips.push({ label: `Yıl${state.calendar === 'hicri' ? ' (Hicrî)' : ''}: ${state.yearMin ?? '…'}–${state.yearMax ?? '…'}`, href: href({ yearMin: null, yearMax: null, page: 1 }) });
  if (state.priceMin != null || state.priceMax != null) chips.push({ label: `Fiyat: ${state.priceMin ?? 0}–${state.priceMax ?? '…'} ₺`, href: href({ priceMin: null, priceMax: null, page: 1 }) });
  if (state.catalogNo) chips.push({ label: `Katalog no: ${state.catalogNo}`, href: href({ catalogNo: '', page: 1 }) });
  const clearHref = state.q && showSearchBox ? `${basePath}?q=${encodeURIComponent(state.q)}` : basePath;

  // Sayfa numaraları (kısaltılmış)
  const pages = [];
  const { page, pageCount } = result;
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap');
  }
  const from = result.total === 0 ? 0 : (page - 1) * result.pageSize + 1;
  const to = Math.min(result.total, page * result.pageSize);

  const hidden = (name, value) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`;
  const preserved = [
    state.q ? hidden('q', state.q) : '',
    state.category && !omitCategoryParam ? hidden('kategori', state.category) : '',
    state.sort !== 'onerilen' ? hidden('siralama', state.sort) : '',
  ].join('');

  const facetGroups = result.facets.map((f) => {
    const open = f.options.some((o) => o.selected) || ['tur', 'stok', 'ulke', 'emisyon'].includes(f.key);
    const search = f.searchable && f.options.length > 8
      ? `<input class="facet-search" type="search" placeholder="${esc(f.label)} içinde ara" aria-label="${esc(f.label)} seçeneklerinde ara" data-facet-search="fo-${f.key}">`
      : '';
    const options = f.options.map((o) => `<li><label${o.count === 0 ? ' class="zero"' : ''}><input type="checkbox" name="${f.key}" value="${esc(o.value)}"${o.selected ? ' checked' : ''}><span>${esc(o.label)}</span><span class="count">${o.count}</span></label></li>`).join('');
    return `<details class="filter-group"${open ? ' open' : ''}><summary>${esc(f.label)}</summary>${search}<ul class="filter-options" id="fo-${f.key}">${options}</ul></details>`;
  }).join('');

  const y = result.bounds.year;
  const pr = result.bounds.price;
  const filters = `<aside class="filters" id="filters" data-open="false" aria-label="Filtreler">
    <div class="filters-head"><h2>Filtrele</h2><button type="button" class="icon-btn" data-filters-close aria-label="Filtreleri kapat">${iconSvg('close')}</button></div>
    <form method="get" action="${esc(basePath)}">
      ${preserved}
      ${facetGroups}
      <details class="filter-group"${state.yearMin != null || state.yearMax != null ? ' open' : ''}>
        <summary>Yıl aralığı</summary>
        <div class="range">
          <label>En erken<input type="number" name="yil_min" inputmode="numeric" min="1000" max="2100" value="${esc(state.yearMin ?? '')}" placeholder="${esc(y?.[0] ?? '')}"></label>
          <label>En geç<input type="number" name="yil_max" inputmode="numeric" min="1000" max="2100" value="${esc(state.yearMax ?? '')}" placeholder="${esc(y?.[1] ?? '')}"></label>
        </div>
        <label class="small" style="display:grid;gap:4px;margin-bottom:10px">Takvim
          <select class="select" name="takvim">
            <option value=""${state.calendar !== 'hicri' ? ' selected' : ''}>Miladî</option>
            <option value="hicri"${state.calendar === 'hicri' ? ' selected' : ''}>Hicrî (Osmanlı sikkelerinde cülus yılı)</option>
          </select>
        </label>
        <p class="small muted" style="margin:0 0 10px">Miladî ve hicrî tarihler ayrı tutulur; yalnızca seçilen takvimdeki yıllar karşılaştırılır.</p>
      </details>
      <details class="filter-group"${state.priceMin != null || state.priceMax != null ? ' open' : ''}>
        <summary>Fiyat aralığı (₺)</summary>
        <div class="range">
          <label>En az<input type="number" name="fiyat_min" inputmode="numeric" min="0" step="1" value="${esc(state.priceMin ?? '')}" placeholder="${pr ? Math.floor(pr[0]) : ''}"></label>
          <label>En çok<input type="number" name="fiyat_max" inputmode="numeric" min="0" step="1" value="${esc(state.priceMax ?? '')}" placeholder="${pr ? Math.ceil(pr[1]) : ''}"></label>
        </div>
      </details>
      <details class="filter-group"${state.catalogNo ? ' open' : ''}>
        <summary>Katalog numarası</summary>
        <label style="display:grid;gap:4px;margin-bottom:10px" class="small">Pick / KM numarası
          <input class="field" type="text" name="katalog" value="${esc(state.catalogNo)}" placeholder="ör. P-173a">
        </label>
      </details>
      <div class="actions">
        <button class="btn btn--lime btn--sm" type="submit">Uygula</button>
        <a class="btn btn--outline btn--sm" href="${esc(clearHref)}">Temizle</a>
      </div>
    </form>
  </aside>`;

  const subcats = subcategories.length
    ? `<ul class="subcats" aria-label="Alt kategoriler">${subcategories.map((s) => `<li><a href="${esc(s.href)}">${esc(s.title)} <span class="count">${s.count}</span></a></li>`).join('')}</ul>`
    : '';

  const sortHidden = [...stateToParams(state, { sort: 'onerilen', page: 1, __omitCategory: omitCategoryParam }).entries()].map(([k, v]) => hidden(k, v)).join('');
  const toolbar = `<div class="toolbar">
    <p class="result-count" role="status">${result.total > 0 ? `${formatNumber(result.total)} ürün <span class="muted small">(${from}–${to} gösteriliyor)</span>` : 'Sonuç bulunamadı'}</p>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button type="button" class="btn btn--outline btn--sm filter-toggle" data-filters-open aria-controls="filters" aria-expanded="false">${iconSvg('filter')} Filtreler${chips.length > 0 ? ` (${chips.length})` : ''}</button>
      <form method="get" action="${esc(basePath)}">
        ${sortHidden}
        <label class="visually-hidden" for="sort-select">Sıralama</label>
        <select id="sort-select" class="select" name="siralama" data-autosubmit>
          ${SORTS.map((s) => `<option value="${s.value}"${state.sort === s.value ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
        </select>
        <noscript><button class="btn btn--sm btn--outline" type="submit">Sırala</button></noscript>
      </form>
    </div>
  </div>`;

  const chipList = chips.length
    ? `<ul class="active-filters" aria-label="Uygulanan filtreler">${chips.map((c) => `<li><a href="${esc(c.href)}" aria-label="Filtreyi kaldır: ${esc(c.label)}">${esc(c.label)} <span aria-hidden="true">×</span></a></li>`).join('')}${chips.length > 1 || hasFilters(state) ? `<li><a class="clear" href="${esc(clearHref)}">Tüm filtreleri temizle</a></li>` : ''}</ul>`
    : '';

  let body;
  if (result.total > 0) {
    const grid = `<div class="product-grid">${result.items.map((p, i) => renderCard(p, { eager: i < 4, headingLevel: 'h2' })).join('')}</div>`;
    const nav = pageCount > 1
      ? `<nav aria-label="Sayfalar"><ul class="pagination">
          ${page > 1 ? `<li><a href="${esc(href({ page: page - 1 }))}" rel="prev" aria-label="Önceki sayfa">${iconSvg('chevron-left')}</a></li>` : ''}
          ${pages.map((n) => (n === 'gap'
            ? '<li><span class="gap" aria-hidden="true">…</span></li>'
            : `<li>${n === page ? `<span aria-current="page">${n}</span>` : `<a href="${esc(href({ page: n }))}" aria-label="Sayfa ${n}">${n}</a>`}</li>`)).join('')}
          ${page < pageCount ? `<li><a href="${esc(href({ page: page + 1 }))}" rel="next" aria-label="Sonraki sayfa">${iconSvg('chevron-right')}</a></li>` : ''}
        </ul></nav>`
      : '';
    body = grid + nav;
  } else {
    body = `<div class="empty-state">
      <h2>${esc(emptyTitle ?? 'Bu ölçütlere uyan ürün bulunamadı')}</h2>
      <p class="muted">${esc(emptyText ?? 'Bazı filtreleri kaldırmayı veya farklı bir ifadeyle aramayı deneyin.')}</p>
      <div class="actions">
        ${chips.length > 0 ? `<a class="btn btn--lime" href="${esc(clearHref)}">Filtreleri temizle</a>` : ''}
        <a class="btn btn--outline" href="${esc(u('/urunler'))}">Bütün ürünlere göz at</a>
      </div>
    </div>`;
  }

  return `<div class="catalog">${filters}<div>${subcats}${toolbar}${chipList}${body}</div></div>`;
}
