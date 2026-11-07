/**
 * Adresteki filtre, sıralama ve sayfa durumunu tarayıcıda uygular.
 * Ana sürümün sunucuda kullandığı motor (lib/search/engine.js) ve şablonun aynısı çalışır.
 * Filtre değişikliği normal bir sayfa geçişidir; geri/ileri ve paylaşılan bağlantılar buna dayanır.
 */
import { parseState, runQuery, recentProducts } from '../lib/search/engine.js';
import { renderCatalog } from '../lib/render/catalog-view.js';
import { loadCatalogData } from './catalog-data.js';
import { initFilters, renderCounts } from './ui.js';

const PAGE_SIZE = 24;
const root = document.querySelector('[data-catalog-root]');

async function apply() {
  const params = new URLSearchParams(location.search);
  if (!params.toString()) return; // varsayılan durum zaten derlenmiş sayfada

  const config = JSON.parse(root.dataset.config);
  const { scope } = config;
  const state = parseState(params);
  if (scope.recent && !params.has('siralama')) state.sort = 'yeni';
  if (scope.category) state.category = '';

  const { products, categoryTitles } = await loadCatalogData();
  const result = runQuery(scope.recent ? recentProducts(products) : products, state, {
    categoryTitles,
    soldVisibility: 'visible',
    pageSize: PAGE_SIZE,
    baseCategory: scope.category,
    baseCollection: scope.collection,
  });

  let { emptyTitle, emptyText } = config;
  if (scope.search) {
    emptyTitle = state.q ? `“${state.q}” için sonuç bulunamadı` : 'Aramak istediğiniz ifadeyi yazın';
    const heading = document.querySelector('[data-search-heading]');
    if (heading && state.q) heading.textContent = `“${state.q}” için sonuçlar`;
    const input = document.querySelector('[data-search-input]');
    if (input) input.value = state.q;
    if (state.q) document.title = `${state.q} — Arama | İlkim Koleksiyon`;
  }

  root.innerHTML = renderCatalog({ ...config, emptyTitle, emptyText, state, result });
  initFilters();
  renderCounts();
}

if (root) {
  apply()
    .catch((err) => {
      console.error('[katalog]', err);
      const box = document.createElement('p');
      box.className = 'notice notice--error';
      box.setAttribute('role', 'alert');
      box.textContent = 'Katalog verisi yüklenemedi; filtreler uygulanamadı. Lütfen sayfayı yenileyin.';
      root.prepend(box);
    })
    .finally(() => root.classList.remove('catalog-pending'));
}
