// Arama/filtre motoru testleri — `npm test`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeText, parseQuery, fold } from '../src/lib/search/normalize.js';
import { runQuery, parseState, stateToParams, FACETS, stockKey } from '../src/lib/search/engine.js';

const products = JSON.parse(readFileSync(new URL('../src/data/demo/products.json', import.meta.url), 'utf8'));
const categories = JSON.parse(readFileSync(new URL('../src/data/demo/categories.json', import.meta.url), 'utf8'));
const catMap = new Map(categories.map((c) => [c.path, c]));
const categoryTitles = (path) => {
  const parts = path.split('/'); const out = [];
  for (let i = 1; i <= parts.length; i++) { const c = catMap.get(parts.slice(0, i).join('/')); if (c) out.push(c.title); }
  return out;
};
const run = (qs, opts = {}) => runQuery(products, parseState(new URLSearchParams(qs)), { categoryTitles, soldVisibility: 'visible', pageSize: 24, ...opts });

test('Türkçe normalizasyon: büyük/küçük harf ve aksan', () => {
  assert.equal(fold('İSMET İNÖNÜ'), 'ismet inonu');
  assert.equal(fold('GÜMÜŞ'), fold('gumus'));
  assert.equal(fold('IRAK'), 'irak'); // ı → i katlanır
  assert.equal(normalizeText('  Çekya  /  Çekoslovakya '), 'cekya / cekoslovakya');
});

test('Sayı yazımları birleştirilir', () => {
  assert.equal(normalizeText('1.000.000 Lira'), '1000000 lira');
  assert.equal(normalizeText('1 000 000'), '1000000');
  assert.equal(normalizeText('10,000 rials'), '10000 rials');
  assert.equal(normalizeText('2 ½ Lira'), '2.5 lira');
  assert.equal(normalizeText('0,50 Riels'), '0.50 riels');
});

test('Katalog numarası biçimleri birleştirilir', () => {
  for (const s of ['Pick P-173a', 'PİK P-173A', 'p173a', 'P 173a', 'Pik 173a']) {
    assert.ok(normalizeText(s).includes('p173a'), s);
  }
});

test('Sorgu: “yeni türk lirası” → ytl', () => {
  const q = parseQuery('5 Yeni Türk Lirası');
  assert.deepEqual(q.terms.map((t) => t[0]), ['5', 'ytl']);
});

test('Arama bütün katalogda yapılır ve sayfalama sonuçtan bağımsız sayılır', () => {
  const r = run('q=lira');
  assert.ok(r.total > 24, `bütün katalog aranmalı, sonuç: ${r.total}`);
  assert.equal(r.items.length, 24);
  const manual = products.filter((p) => normalizeText(`${p.title} ${p.specs.denomination?.label ?? ''}`).includes('lira'));
  assert.ok(r.total >= manual.length, `motor ${r.total} < elle ${manual.length}`);
});

test('Büyük/küçük harf ve Türkçe karakter farkı sonucu değiştirmez', () => {
  const a = run('q=gümüş').total, b = run('q=GUMUS').total, c = run('q=Gümüş').total;
  assert.ok(a > 0);
  assert.equal(a, b); assert.equal(a, c);
});

test('Çok alanlı sorgu: ülke + nominal', () => {
  const r = run('q=almanya mark');
  assert.ok(r.total > 0);
  for (const p of r.items) assert.ok(/almanya/i.test(fold(p.specs.country ?? p.title)) && /mark/i.test(fold(p.title)), p.title);
});

test('Katalog numarasıyla arama', () => {
  const target = products.find((p) => p.specs.catalogNumber);
  const no = target.specs.catalogNumber.replace('Pick ', '');
  const r = run(`q=${encodeURIComponent(no)}`, { pageSize: 500 });
  assert.ok(r.items.some((p) => p.id === target.id), `${no} bulunamadı`);
});

test('Faset filtresi bütün veri kümesinde doğru sayar', () => {
  for (const f of FACETS) {
    const r = run('', { pageSize: 10000 });
    const facet = r.facets.find((x) => x.key === f.key);
    assert.ok(facet, `faset eksik: ${f.key}`);
    assert.ok(facet.options.length > 0, `faset boş: ${f.key}`);
    for (const opt of facet.options.slice(0, 5)) {
      const manual = products.filter((p) => f.get(p).some((v) => v.value === opt.value)).length;
      assert.equal(opt.count, manual, `${f.key}=${opt.value}`);
      const filtered = run(`${f.key}=${encodeURIComponent(opt.value)}`, { pageSize: 10000 });
      assert.equal(filtered.total, manual, `filtre sonucu ${f.key}=${opt.value}`);
    }
  }
});

test('Yıl aralığı yalnızca seçilen takvimde karşılaştırılır', () => {
  const r = run('yil_min=1900&yil_max=1950', { pageSize: 10000 });
  assert.ok(r.total > 0, 'miladî aralıkta sonuç olmalı');
  for (const p of r.items) {
    assert.equal(p.specs.calendar, 'miladi');
    assert.ok((p.specs.yearTo ?? p.specs.yearFrom) >= 1900 && p.specs.yearFrom <= 1950, p.title);
  }
  const h = run('yil_min=1200&yil_max=1400&takvim=hicri', { pageSize: 10000 });
  assert.ok(h.total > 0, 'hicrî aralıkta sonuç olmalı');
  for (const p of h.items) assert.equal(p.specs.calendar, 'hicri');
});

test('Fiyat aralığı ve sıralama', () => {
  const r = run('fiyat_min=1000&fiyat_max=5000&siralama=fiyat-artan', { pageSize: 10000 });
  assert.ok(r.total > 0);
  const inStock = r.items.filter((p) => p.availability.status === 'in_stock');
  for (let i = 1; i < inStock.length; i++) assert.ok(inStock[i - 1].price.amount <= inStock[i].price.amount);
  for (const p of r.items) assert.ok(p.price.amount >= 1000 && p.price.amount <= 5000);
});

test('Sonuç yok durumu', () => {
  const r = run('q=zzzxxyy-olmayan');
  assert.equal(r.total, 0);
  assert.equal(r.items.length, 0);
});

test('URL durumu gidiş-dönüş korunur', () => {
  const qs = 'q=lira&tur=banknot&emisyon=5&yil_min=1950&yil_max=1970&fiyat_max=9000&siralama=fiyat-azalan&sayfa=2';
  const back = stateToParams(parseState(new URLSearchParams(qs)));
  assert.deepEqual(Object.fromEntries(new URLSearchParams(qs)), Object.fromEntries(back));
});

test('Satılmış ürün görünürlük ayarı', () => {
  const sold = products.filter((p) => p.availability.status === 'sold');
  assert.ok(sold.length > 0, 'demo senaryosunda satılmış ürün olmalı');
  const visible = run('stok=satildi', { soldVisibility: 'visible' });
  assert.equal(visible.total, sold.length);
  const unlisted = run('', { soldVisibility: 'unlisted', pageSize: 10000 });
  assert.ok(unlisted.items.every((p) => stockKey(p) !== 'satildi'));
});
