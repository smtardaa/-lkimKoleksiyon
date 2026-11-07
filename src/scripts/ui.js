/**
 * Genel arayüz davranışları (çerçeve kullanılmadan):
 * menü, kategori açılır menüsü, arama diyaloğu, sekmeler, sepete ekleme,
 * favori butonları, sayaçlar, bildirim (toast), filtre paneli.
 */
import { cart, favorites, addToCart } from './store.js';
import { u } from '../lib/paths.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- Sayaçlar ----------
export function renderCounts() {
  const c = cart.count();
  const f = favorites.ids().length;
  $$('[data-cart-count]').forEach((el) => { el.textContent = String(c); el.hidden = c === 0; });
  $$('[data-fav-count]').forEach((el) => { el.textContent = String(f); el.hidden = f === 0; });
  $$('[data-fav-toggle]').forEach((btn) => {
    const on = favorites.has(btn.dataset.favToggle);
    btn.setAttribute('aria-pressed', String(on));
    const name = btn.dataset.title ?? 'ürün';
    btn.setAttribute('aria-label', on ? `Favorilerden çıkar: ${name}` : `Favorilere ekle: ${name}`);
  });
}
window.addEventListener('ilkim:store', renderCounts);
window.addEventListener('storage', renderCounts);

// ---------- Toast ----------
let toastTimer;
export function toast(message, { link } = {}) {
  let el = $('#toast');
  if (!el) return;
  el.innerHTML = '';
  el.append(document.createTextNode(message));
  if (link) {
    const a = document.createElement('a');
    a.href = link.href; a.textContent = ` ${link.label}`;
    el.append(a);
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

// ---------- Mobil menü ----------
function initMenu() {
  const toggle = $('[data-menu-toggle]');
  const nav = $('#main-nav');
  if (!toggle || !nav) return;
  const set = (open) => {
    nav.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  };
  toggle.addEventListener('click', () => set(nav.dataset.open !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.dataset.open === 'true') { set(false); toggle.focus(); } });
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) set(false); });
}

// ---------- Kategori açılır menüsü ----------
function initDropdown() {
  $$('[data-dropdown-toggle]').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); panel.hidden = !open; };
    btn.addEventListener('click', (e) => { e.stopPropagation(); set(panel.hidden); });
    document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target)) set(false); });
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(false); btn.focus(); } });
    btn.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    panel.addEventListener('focusout', (e) => { if (!panel.contains(e.relatedTarget) && e.relatedTarget !== btn) set(false); });
  });
}

// ---------- Arama diyaloğu ----------
function initSearch() {
  const dlg = $('#search-dialog');
  if (!dlg) return;
  $$('[data-search-open]').forEach((b) => b.addEventListener('click', () => {
    dlg.showModal();
    $('input[name=q]', dlg)?.focus();
  }));
  $$('[data-search-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName ?? '') && !dlg.open) {
      e.preventDefault(); dlg.showModal(); $('input[name=q]', dlg)?.focus();
    }
  });
}

// ---------- Sekmeler (WAI-ARIA tabs) ----------
function initTabs() {
  $$('[role=tablist]').forEach((list) => {
    const tabs = $$('[role=tab]', list);
    const activate = (tab, focus = false) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => activate(t));
      t.addEventListener('keydown', (e) => {
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowLeft') {
          e.preventDefault();
          activate(tabs[(i + (k === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length], true);
        } else if (k === 'Home') { e.preventDefault(); activate(tabs[0], true); }
        else if (k === 'End') { e.preventDefault(); activate(tabs[tabs.length - 1], true); }
      });
    });
  });
}

// ---------- Sepete ekle / favori (olay delegasyonu) ----------
function initActions() {
  document.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      e.preventDefault();
      if (addBtn.disabled || addBtn.getAttribute('aria-busy') === 'true') return;
      const qtyInput = addBtn.dataset.qtyInput ? document.getElementById(addBtn.dataset.qtyInput) : null;
      const qty = Math.max(1, parseInt(qtyInput?.value ?? '1', 10) || 1);
      const msgEl = addBtn.dataset.msg ? document.getElementById(addBtn.dataset.msg) : null;
      addBtn.setAttribute('aria-busy', 'true');
      try {
        const r = await addToCart(addBtn.dataset.addToCart, qty);
        if (msgEl) { msgEl.textContent = r.message; msgEl.dataset.tone = r.ok && !r.capped ? 'ok' : 'error'; }
        toast(r.message, r.ok ? { link: { href: u('/sepet'), label: 'Sepete git →' } } : undefined);
      } catch (err) {
        const m = 'Stok ve fiyat doğrulanamadı; ürün sepete eklenmedi. Lütfen tekrar deneyin.';
        if (msgEl) { msgEl.textContent = m; msgEl.dataset.tone = 'error'; }
        toast(m);
      } finally {
        addBtn.removeAttribute('aria-busy');
      }
      return;
    }
    const favBtn = e.target.closest('[data-fav-toggle]');
    if (favBtn) {
      e.preventDefault();
      const on = favorites.toggle(favBtn.dataset.favToggle);
      toast(on ? 'Favorilere eklendi (bu tarayıcıda saklanır).' : 'Favorilerden çıkarıldı.', on ? { link: { href: u('/favoriler'), label: 'Favoriler →' } } : undefined);
    }
  });
}

// ---------- Filtre paneli ----------
export function initFilters() {
  const panel = $('#filters');
  if (!panel) return;
  const form = $('form', panel);
  const openBtn = $('[data-filters-open]');
  const closeBtn = $('[data-filters-close]', panel);
  const set = (open) => {
    panel.dataset.open = String(open);
    openBtn?.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open && matchMedia('(max-width: 920px)').matches ? 'hidden' : '';
    if (open) closeBtn?.focus(); else openBtn?.focus();
  };
  openBtn?.addEventListener('click', () => set(true));
  closeBtn?.addEventListener('click', () => set(false));
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.dataset.open === 'true') set(false); });

  // Masaüstünde onay kutusu değişince otomatik uygula; mobilde “Uygula” butonuyla.
  form?.addEventListener('change', (e) => {
    if (e.target.matches('input[type=checkbox]') && matchMedia('(min-width: 921px)').matches) form.requestSubmit();
  });
  // Boş alanları URL'ye taşıma
  form?.addEventListener('submit', () => {
    $$('input, select', form).forEach((el) => { if (!el.value && el.name) el.disabled = true; });
  });
  // Uzun faset listelerinde hızlı süzme
  $$('[data-facet-search]').forEach((input) => {
    const list = document.getElementById(input.dataset.facetSearch);
    const norm = (s) => s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
    input.addEventListener('input', () => {
      const q = norm(input.value.trim());
      $$('li', list).forEach((li) => { li.hidden = q && !norm(li.textContent).includes(q); });
    });
  });
  // Sıralama seçimi
  $$('[data-autosubmit]').forEach((sel) => sel.addEventListener('change', () => sel.form?.requestSubmit()));
}

renderCounts();
initMenu();
initDropdown();
initSearch();
initTabs();
initActions();
initFilters();
