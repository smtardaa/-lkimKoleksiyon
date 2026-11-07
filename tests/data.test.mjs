// Demo veri bütünlüğü testleri — `npm test`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const products = read('src/data/demo/products.json');
const categories = read('src/data/demo/categories.json');
const collections = read('src/data/demo/collections.json');
const catPaths = new Set(categories.map((c) => c.path));

test('Ürün kimlikleri ve adresleri benzersiz', () => {
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
  assert.equal(new Set(products.map((p) => p.handle)).size, products.length);
  for (const p of products) assert.match(p.handle, /^[a-z0-9-]+$/);
});

test('Her ürünün kategori yolları tanımlı kategorilere işaret eder', () => {
  for (const p of products) for (const c of p.categoryPaths) assert.ok(catPaths.has(c), `${p.handle}: ${c}`);
});

test('Kategori ağacı tutarlı (her ebeveyn mevcut)', () => {
  for (const c of categories) if (c.parent) assert.ok(catPaths.has(c.parent), c.path);
});

test('Görsel dosyaları diskte var ve ölçüleri tanımlı', () => {
  for (const p of products) for (const i of p.images) {
    assert.ok(existsSync(new URL(`../public${i.src}`, import.meta.url)), i.src);
    assert.ok(existsSync(new URL(`../public${i.srcSmall}`, import.meta.url)), i.srcSmall);
    assert.ok(i.width > 0 && i.height > 0);
    assert.ok(i.alt && i.alt.length > 3);
  }
});

test('Fiyatlar pozitif ve TRY', () => {
  for (const p of products) { assert.ok(p.price.amount > 0, p.handle); assert.equal(p.price.currencyCode, 'TRY'); }
});

test('Hicrî tarihler takvim bilgisiyle saklanır', () => {
  const hijri = products.filter((x) => x.specs.calendar === 'hicri');
  assert.ok(hijri.length > 0);
  for (const p of hijri) {
    assert.ok(p.specs.yearFrom < 1400, p.title);
    assert.ok(p.specs.yearText, p.title);
  }
});

test('Kaynak kaydı her demo üründe var', () => {
  for (const p of products) { assert.match(p.source.url, /^https:\/\/eskiparamarket\.com\//); assert.ok(p.source.fetchedAt); }
});

test('Antika ve madalya kategorilerine doğrulanmamış ürün atanmadı', () => {
  const bad = products.filter((p) => p.categoryPaths.some((c) => c.startsWith('madalya-ve-objeler') || c.startsWith('antika-ve-diger/antika')));
  assert.equal(bad.length, 0);
});

test('Seçkiler ürün çoğaltmaz (aynı kimlik tek kayıt)', () => {
  for (const c of collections) {
    const ids = products.filter((p) => p.collections.includes(c.handle)).map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, c.productCount);
  }
});

test('Demo senaryoları açıkça işaretli', () => {
  const scenario = products.filter((x) => x.availability.status !== 'in_stock');
  assert.ok(scenario.length > 0);
  for (const p of scenario) assert.ok(p.demoScenario, p.handle);
});
