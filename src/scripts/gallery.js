/**
 * Ürün galerisi: küçük görsel seçimi, tam ekran büyütme (dialog),
 * klavye ile gezinme (←/→/Esc), yakınlaştırma ve adet seçici.
 */
const root = document.querySelector('[data-gallery]');
if (root) {
  const images = JSON.parse(root.querySelector('[data-gallery-images]')?.textContent ?? '[]');
  const main = root.querySelector('[data-main]');
  const thumbs = [...root.querySelectorAll('[data-thumb]')];
  const lb = document.getElementById('lightbox');
  const lbImg = lb?.querySelector('[data-lb-img]');
  const lbCap = lb?.querySelector('[data-lb-caption]');
  const stage = lb?.querySelector('[data-stage]');
  const zoomBtn = lb?.querySelector('[data-lb-zoom]');
  let current = 0;

  const show = (i) => {
    current = (i + images.length) % images.length;
    const im = images[current];
    if (main && im) { main.src = im.src; main.alt = im.alt; main.width = im.w; main.height = im.h; }
    thumbs.forEach((t, k) => t.setAttribute('aria-current', String(k === current)));
    if (lb?.open) renderLb();
  };
  const renderLb = () => {
    const im = images[current];
    if (!im || !lbImg) return;
    lbImg.src = im.src; lbImg.alt = im.alt;
    if (lbCap) lbCap.textContent = `${im.alt} (${current + 1}/${images.length})`;
    stage?.classList.remove('zoomed');
    zoomBtn?.setAttribute('aria-pressed', 'false');
  };

  thumbs.forEach((t, i) => t.addEventListener('click', () => show(i)));
  root.querySelector('[data-zoom]')?.addEventListener('click', () => { if (!lb) return; renderLb(); lb.showModal(); });
  lb?.querySelector('[data-lb-close]')?.addEventListener('click', () => lb.close());
  lb?.querySelector('[data-lb-prev]')?.addEventListener('click', () => show(current - 1));
  lb?.querySelector('[data-lb-next]')?.addEventListener('click', () => show(current + 1));
  const toggleZoom = () => {
    const on = !stage.classList.contains('zoomed');
    stage.classList.toggle('zoomed', on);
    zoomBtn?.setAttribute('aria-pressed', String(on));
  };
  zoomBtn?.addEventListener('click', toggleZoom);
  lbImg?.addEventListener('click', toggleZoom);
  lb?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
  });
  lb?.addEventListener('close', () => root.querySelector('[data-zoom]')?.focus());
}

// Adet seçici
document.querySelectorAll('[data-qty]').forEach((box) => {
  const input = box.querySelector('input');
  const clamp = () => {
    const max = parseInt(input.max || '99', 10);
    const v = Math.max(1, Math.min(max, parseInt(input.value, 10) || 1));
    input.value = String(v);
  };
  box.querySelectorAll('[data-qty-step]').forEach((b) => b.addEventListener('click', () => {
    input.value = String((parseInt(input.value, 10) || 1) + Number(b.dataset.qtyStep));
    clamp();
  }));
  input.addEventListener('change', clamp);
});
