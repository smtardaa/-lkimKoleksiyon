/**
 * Ürün slider'ları: önceki/sonraki okları, baş ve sondaki pasif durum, fareyle sürükleme.
 * Dokunmatik kaydırma ve klavye (odaklı şeritte ok tuşları, Tab ile kartlar) tarayıcının
 * kendi yatay kaydırmasıyla çalışır. Otomatik kayma yoktur.
 */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const DRAG_THRESHOLD = 6;
const EDGE = 4; // baş/son algısında piksel payı

function initSlider(root) {
  const track = root.querySelector('[data-slider-track]');
  const nav = root.querySelector('[data-slider-nav]');
  const prev = root.querySelector('[data-slider-prev]');
  const next = root.querySelector('[data-slider-next]');
  if (!track || !nav || !prev || !next) return;

  const maxScroll = () => track.scrollWidth - track.clientWidth;

  function update() {
    const max = maxScroll();
    const overflow = max > EDGE;
    nav.hidden = !overflow; // bütün ürünler sığıyorsa oklar gizlenir
    const atStart = track.scrollLeft <= EDGE;
    const atEnd = track.scrollLeft >= max - EDGE;
    // Odaktaki ok pasifleşecekse odağı diğer oka taşı (klavye kullanıcısı odağını kaybetmesin)
    if (atStart && document.activeElement === prev && !atEnd) next.focus();
    if (atEnd && document.activeElement === next && !atStart) prev.focus();
    prev.disabled = atStart;
    next.disabled = atEnd;
  }

  /** Görünen tam kart sayısı kadar kaydırır. */
  function step(direction) {
    const first = track.firstElementChild;
    if (!first) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const unit = first.getBoundingClientRect().width + gap;
    const count = Math.max(1, Math.floor((track.clientWidth + gap) / unit));
    track.scrollBy({ left: direction * unit * count, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);

  // Fareyle sürükleme (dokunmatikte tarayıcının kendi kaydırması kullanılır).
  let startX = 0;
  let startLeft = 0;
  let pointerId = null;
  let dragging = false;
  let suppressClick = false;

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    dragging = false;
  });
  track.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return; // küçük hareket tıklama sayılır
      dragging = true;
      track.classList.add('is-dragging');
      track.setPointerCapture(pointerId);
    }
    track.scrollLeft = startLeft - dx;
  });
  const endDrag = (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    // Sürükleme sonundaki tıklama karta/sepete gitmesin
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('click', (e) => {
    if (!suppressClick) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClick = false;
  }, true);
  // Görsel/bağlantı sürükleme hayaleti kaydırmayı bozmasın
  track.addEventListener('dragstart', (e) => e.preventDefault());

  update();
}

document.querySelectorAll('[data-slider]').forEach(initSlider);
