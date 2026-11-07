// Teklif özelliği testleri — `npm test`
// Ana sürümdeki sunucu testleri burada tarayıcı akışına (submitDemoOffer) uyarlanmıştır.
// Gerçek iletim kanalları, sınırlayıcılar ve Shopify eşlemesi bu sürümde yoktur.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { offerStatus, acceptingOffers, isOfferOnly, OFFER_DISCLAIMER } from '../src/lib/offers/status.js';
import { validateOffer, parseAmount } from '../src/lib/offers/validate.js';
import { submitDemoOffer } from '../src/lib/offers/demo-submit.js';
import { runQuery, parseState } from '../src/lib/search/engine.js';

const products = JSON.parse(readFileSync(new URL('../src/data/demo/products.json', import.meta.url), 'utf8'));

const base = (o = {}) => ({
  id: 'p1', variantId: 'v1', handle: 'urun-1', title: 'Örnek Ürün', price: { amount: 1000, currencyCode: 'TRY' },
  availability: { status: 'in_stock', availableForSale: true, quantity: 1 },
  offersEnabled: true, offersClosed: false, ...o,
});
const FORM = { productId: 'v1', name: 'Ayşe Yılmaz', email: 'ayse@ornek.test', phone: '0532 000 00 00', amount: '12.500,50', message: 'Merhaba', website: '' };
const submit = (product, body = {}) => submitDemoOffer({ ...FORM, ...body }, () => product);

describe('teklif durumu yalnızca offersEnabled alanından okunur', () => {
  test('fiyat sıfır, stok yok veya başlıkta “teklif” geçmesi ürünü teklife açmaz', () => {
    for (const p of [
      base({ offersEnabled: false, price: { amount: 0, currencyCode: 'TRY' } }),
      base({ offersEnabled: false, title: 'Teklif Ver Ürünü (teklife açık)' }),
      base({ offersEnabled: false, availability: { status: 'out_of_stock', availableForSale: false, quantity: 0 } }),
    ]) {
      assert.equal(offerStatus(p).accepting, false);
      assert.equal(offerStatus(p).code, 'not_offer');
    }
  });
  test('durum kodları', () => {
    assert.equal(offerStatus(base()).code, 'accepting');
    assert.equal(offerStatus(base({ offersClosed: true })).code, 'closed');
    assert.equal(offerStatus(base({ availability: { status: 'sold' } })).code, 'sold');
    assert.equal(offerStatus(base({ availability: { status: 'out_of_stock' } })).code, 'out_of_stock');
    assert.equal(offerStatus(null).code, 'not_offer');
  });
});

describe('demo verisi', () => {
  test('yalnızca birkaç ürün teklife açık; alan her üründe boolean', () => {
    for (const p of products) { assert.equal(typeof p.offersEnabled, 'boolean'); assert.equal(typeof p.offersClosed, 'boolean'); }
    const on = products.filter((p) => p.offersEnabled);
    assert.ok(on.length >= 4 && on.length <= 10, `etkin ürün: ${on.length}`);
    assert.equal(products.filter((p) => p.offersClosed && !p.offersEnabled).length, 0);
  });
  test('liste normal, kapalı ve satılmış ürünleri içermez', () => {
    const list = acceptingOffers(products);
    assert.ok(list.length >= 3);
    for (const p of list) {
      assert.equal(p.offersEnabled, true);
      assert.equal(p.offersClosed, false);
      assert.equal(p.availability.status, 'in_stock');
    }
    assert.ok(products.some((p) => p.offersEnabled && p.offersClosed), 'kapalı örnek olmalı');
    assert.ok(products.some((p) => p.offersEnabled && p.availability.status === 'sold'), 'satılmış örnek olmalı');
  });
});

describe('katalogda teklif ürünleri', () => {
  const run = (qs) => runQuery(products, parseState(new URLSearchParams(qs)), { categoryTitles: () => [], soldVisibility: 'visible', pageSize: 100000 });
  test('fiyat aralığı filtresine girmez', () => {
    const r = run('fiyat_min=1000&fiyat_max=999999');
    assert.ok(r.total > 0);
    assert.equal(r.items.filter(isOfferOnly).length, 0);
  });
  test('fiyat sıralamasında açık fiyatlı ürünlerden sonra gelir', () => {
    const r = run('siralama=fiyat-azalan').items.filter((p) => p.availability.status === 'in_stock');
    const firstOffer = r.findIndex(isOfferOnly);
    assert.ok(firstOffer > 0);
    assert.ok(r.slice(firstOffer).every(isOfferOnly));
  });
});

describe('form doğrulama', () => {
  test('tutar yazımları', () => {
    const cases = [['12500', 12500], ['12.500', 12500], ['12.500,50', 12500.5], ['1.250.000', 1250000], ['12500,5', 12500.5], ['12500.50', 12500.5], ['₺ 1.000 TL', 1000], ['0,50', 0.5]];
    for (const [input, expected] of cases) assert.equal(parseAmount(input), expected, input);
    for (const bad of ['abc', '12,5,5', '1.25.000', '-500', '12e5', '1,2345', '']) assert.equal(parseAmount(bad), null, bad);
  });
  test('zorunlu alanlar ve Türkçe mesajlar', () => {
    const { ok, errors } = validateOffer({});
    assert.equal(ok, false);
    assert.deepEqual(Object.keys(errors).sort(), ['amount', 'email', 'name']);
    assert.match(errors.email, /zorunlu/);
  });
  test('tutar pozitif ve makul olmalı', () => {
    for (const amount of ['0', '0,00', '-5', 'on bin', '999999999999']) assert.ok(validateOffer({ ...FORM, amount }).errors.amount, amount);
  });
  test('e-posta ve telefon biçimi', () => {
    for (const email of ['ayse', 'ayse@', '@x.com', 'a b@x.com', 'a@b']) assert.ok(validateOffer({ ...FORM, email }).errors.email, email);
    for (const phone of ['123', 'abc1234567890', '1'.repeat(16)]) assert.ok(validateOffer({ ...FORM, phone }).errors.phone, phone);
    assert.equal(validateOffer({ ...FORM, phone: '' }).ok, true);
    assert.equal(validateOffer({ ...FORM, phone: '+90 (532) 000-00-00' }).ok, true);
  });
  test('kontrol karakterleri temizlenir, mesaj sınırı uygulanır', () => {
    assert.equal(validateOffer({ ...FORM, name: 'Ayşe\r\nBcc: x@y.z' }).values.name, 'Ayşe Bcc: x@y.z');
    assert.ok(validateOffer({ ...FORM, message: 'x'.repeat(1001) }).errors.message);
  });
});

describe('önizlemede teklif gönderimi', () => {
  let fetched = 0;
  const realFetch = globalThis.fetch;
  beforeEach(() => { fetched = 0; globalThis.fetch = async () => { fetched++; throw new Error('ağ çağrısı olmamalı'); }; });
  afterEach(() => { globalThis.fetch = realFetch; });

  test('başarı yalnızca demo açıklamasıdır; hiçbir ağ çağrısı yapılmaz', () => {
    const r = submit(base());
    assert.equal(r.body.ok, true);
    assert.equal(r.body.demo, true);
    assert.equal(r.body.message, 'Demo teklif oluşturuldu, işletmeye gönderilmedi.');
    assert.doesNotMatch(r.body.message, /Teklifiniz (gönderildi|iletildi)/);
    assert.equal(r.body.reference, undefined);
    assert.equal(fetched, 0);
  });
  test('teklife kapalı ürün reddedilir', () => {
    const r = submit(base({ offersEnabled: false }));
    assert.equal(r.status, 403);
    assert.equal(r.body.ok, false);
    assert.equal(r.body.code, 'not_offer');
  });
  test('satılmış, kapalı, stokta olmayan, bulunmayan', () => {
    for (const [product, status, code] of [
      [base({ availability: { status: 'sold' } }), 409, 'sold'],
      [base({ offersClosed: true }), 409, 'closed'],
      [base({ availability: { status: 'out_of_stock' } }), 409, 'out_of_stock'],
      [undefined, 404, 'not_found'],
    ]) {
      const r = submit(product);
      assert.equal(r.status, status, code);
      assert.equal(r.body.code, code);
      assert.equal(r.body.ok, false);
    }
  });
  test('geçersiz alanlar alan bazlı hata döner', () => {
    const r = submit(base(), { amount: '-1', email: 'x' });
    assert.equal(r.status, 422);
    assert.ok(r.body.fieldErrors.amount && r.body.fieldErrors.email);
  });
  test('tuzak alanı dolu istek reddedilir, başarı gösterilmez', () => {
    assert.equal(submit(base(), { website: 'http://spam' }).body.ok, false);
  });
  test('ürün kimliği eksikse işlem yapılmaz', () => {
    assert.equal(submit(base(), { productId: '' }).status, 400);
    assert.equal(submitDemoOffer(null, () => base()).status, 400);
  });
  test('demo verisindeki gerçek kayıtlarla', () => {
    const find = (id) => products.find((p) => p.variantId === id);
    const pick = (fn) => products.find(fn).variantId;
    const send = (productId) => submitDemoOffer({ ...FORM, productId }, find).body;
    assert.equal(send(pick((p) => offerStatus(p).accepting)).ok, true);
    assert.equal(send(pick((p) => !p.offersEnabled)).code, 'not_offer');
    assert.equal(send(pick((p) => p.offersClosed)).code, 'closed');
    assert.equal(send(pick((p) => p.offersEnabled && p.availability.status === 'sold')).code, 'sold');
  });
});

test('sorumluluk metni istenen anlamı taşır', () => {
  assert.equal(OFFER_DISCLAIMER, 'Teklifiniz işletmenin değerlendirmesine sunulur. Teklif göndermek satın alma veya rezervasyon oluşturmaz.');
});
