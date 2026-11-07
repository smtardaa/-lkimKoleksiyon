/**
 * Teklif gönderimi (statik önizleme). Sunucu yoktur: teklif hiçbir yere iletilmez ve kaydedilmez.
 * Ana sürümdeki doğrulama sırası korunur; sonuç her zaman demo açıklamasıdır, “gönderildi” denmez.
 */
import { offerStatus } from './status.js';
import { validateOffer } from './validate.js';

const fail = (status, code, message, extra = {}) => ({ status, body: { ok: false, code, message, ...extra } });

/** @param {object} body form alanları @param {(id:string)=>any} findProduct */
export function submitDemoOffer(body, findProduct) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'bad_request', 'Geçersiz istek.');
  if (String(body.website ?? '').trim()) return fail(400, 'bad_request', 'Teklif gönderilemedi.');

  const variantId = typeof body.productId === 'string' ? body.productId.trim().slice(0, 200) : '';
  if (!variantId) return fail(400, 'bad_request', 'Ürün bilgisi eksik. Lütfen ürün sayfasından yeniden deneyin.');

  const { ok, errors } = validateOffer(body);
  if (!ok) return fail(422, 'invalid', 'Lütfen işaretli alanları düzeltin.', { fieldErrors: errors });

  const product = findProduct(variantId);
  if (!product) return fail(404, 'not_found', 'Ürün bulunamadı.');

  const state = offerStatus(product);
  if (!state.accepting) return fail(state.code === 'not_offer' ? 403 : 409, state.code, state.message);

  return { status: 200, body: { ok: true, demo: true, message: 'Demo teklif oluşturuldu, işletmeye gönderilmedi.' } };
}
