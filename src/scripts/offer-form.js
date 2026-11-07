/**
 * Teklif formu: alan doğrulama, hata özeti, yükleniyor ve sonuç durumları.
 * Statik önizlemede sunucu yoktur: teklif hiçbir yere iletilmez ve kaydedilmez,
 * sonuç olarak yalnızca demo açıklaması gösterilir. “Gönderildi” denmez.
 */
import { validateOffer } from '../lib/offers/validate.js';
import { submitDemoOffer } from '../lib/offers/demo-submit.js';
import { loadCatalogData } from './catalog-data.js';

const form = document.querySelector('[data-offer-form]');
if (form) {
  const FIELDS = ['name', 'email', 'phone', 'amount', 'message'];
  const summary = form.querySelector('[data-offer-summary]');
  const statusEl = form.querySelector('[data-offer-status]');
  const submitBtn = form.querySelector('[data-offer-submit]');
  const result = document.querySelector('[data-offer-result]');
  let busy = false;

  const input = (name) => form.elements[name];
  const errorEl = (name) => document.getElementById(`of-${name}-err`);

  function setFieldError(name, message) {
    const el = input(name);
    errorEl(name).textContent = message ?? '';
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }

  function showErrors(errors) {
    FIELDS.forEach((f) => setFieldError(f, errors[f]));
    const names = FIELDS.filter((f) => errors[f]);
    if (!names.length) {
      summary.hidden = true;
      summary.textContent = '';
      return;
    }
    summary.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = 'Lütfen şu alanları düzeltin:';
    const list = document.createElement('ul');
    for (const n of names) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#of-${n}`;
      a.textContent = errors[n];
      a.addEventListener('click', (e) => { e.preventDefault(); input(n).focus(); });
      li.append(a);
      list.append(li);
    }
    summary.append(title, list);
    summary.hidden = false;
    summary.focus();
  }

  function setStatus(text, tone = '') {
    statusEl.textContent = text;
    statusEl.dataset.tone = tone;
  }

  function setBusy(on) {
    busy = on;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.textContent = on ? 'Gönderiliyor…' : 'Teklifi gönder';
  }

  const values = () => Object.fromEntries(FIELDS.map((f) => [f, input(f).value]));

  // Hata gösterilen alanı, kullanıcı düzelttikçe ve alandan çıkınca yeniden kontrol et
  for (const f of FIELDS) {
    const recheck = () => {
      setFieldError(f, validateOffer(values()).errors[f]);
      // Bütün hatalar düzeltildiyse eski özet ekranda kalmasın
      if (!form.querySelector('[aria-invalid="true"]')) summary.hidden = true;
    };
    input(f).addEventListener('input', () => {
      if (input(f).getAttribute('aria-invalid') === 'true') recheck();
    });
    input(f).addEventListener('blur', () => {
      if (input(f).value.trim()) recheck();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    setStatus('');
    const { ok, errors } = validateOffer(values());
    if (!ok) {
      showErrors(errors);
      return;
    }
    showErrors({});
    setBusy(true);
    setStatus('Teklifiniz gönderiliyor…');
    let data = null;
    try {
      const { findProduct } = await loadCatalogData();
      ({ body: data } = submitDemoOffer({ ...values(), productId: input('productId').value, website: input('website').value }, findProduct));
    } catch {
      setBusy(false);
      setStatus('Bağlantı kurulamadı. Teklifiniz gönderilmedi; lütfen tekrar deneyin.', 'error');
      return;
    }
    setBusy(false);

    if (data?.ok) {
      setStatus('');
      form.hidden = true;
      result.querySelector('[data-offer-result-title]').textContent = 'Demo tamamlandı';
      result.querySelector('[data-offer-result-text]').textContent = data.message;
      result.hidden = false;
      result.focus();
      return;
    }
    if (data?.fieldErrors) {
      setStatus('');
      showErrors(data.fieldErrors);
      return;
    }
    setStatus(data?.message ?? 'Teklifiniz gönderilemedi. Lütfen tekrar deneyin.', 'error');
    // Ürün artık teklif kabul etmiyorsa form yeniden gönderilemesin
    if (['closed', 'sold', 'out_of_stock', 'not_offer', 'not_found'].includes(data?.code)) {
      form.querySelector('fieldset').disabled = true;
    }
  });
}
