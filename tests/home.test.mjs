// Ana sayfa slider bölümleri testleri — `npm test`
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeSliders } from '../src/config/home.js';
import { sectionRequests, localCandidates, pickProducts, buildHomeSections, prioritize, isAvailable } from '../src/lib/home-sections.js';
import { acceptingOffers, offerStatus } from '../src/lib/offers/status.js';
import { inCategory } from '../src/lib/search/engine.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../src/data/demo/${p}`, import.meta.url), 'utf8'));
const products = read('products.json');
const categories = read('categories.json');
const collections = read('collections.json');

const urls = { categoryUrl: (p) => `/kategori/${p}`, collectionUrl: (h) => `/koleksiyonlar/${h}`, offersUrl: '/teklif-ver' };
/** Demo sağlayıcısının yaptığı işin aynısı (JSON içe aktarımı test ortamında yapılamadığı için burada kurulur). */
function demoFetch(config = homeSliders) {
  return Object.fromEntries(sectionRequests(config).map((r) => {
    const meta = r.type === 'category' ? categories.find((c) => c.path === r.key) : collections.find((c) => c.handle === r.key);
    return [r.id, { title: meta?.title ?? null, description: meta?.description ?? null, products: localCandidates(products, r) }];
  }));
}
const build = (config = homeSliders, extra = {}) => buildHomeSections({ config, fetched: demoFetch(config), offers: acceptingOffers(products), urls, ...extra });
const mk = (id, o = {}) => ({ id, title: id, order: 0, collections: [], categoryPaths: [], availability: { status: 'in_stock' }, offersEnabled: false, offersClosed: false, ...o });

describe('yapılandırma', () => {
  test('bölüm kimlikleri benzersiz, kaynaklar geçerli', () => {
    const ids = homeSliders.sections.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const s of homeSliders.sections) {
      assert.ok(['category', 'collection', 'offers'].includes(s.source.type), s.id);
      if (s.source.type === 'category') assert.ok(categories.some((c) => c.path === s.source.path && !c.parent), `ana kategori değil: ${s.source.path}`);
      if (s.source.type === 'collection') assert.ok(collections.some((c) => c.handle === s.source.handle), s.source.handle);
    }
    assert.ok(homeSliders.defaultLimit <= 10);
  });
  test('ürünü olan her ana kategorinin bir bölümü var', () => {
    const paths = new Set(homeSliders.sections.filter((s) => s.source.type === 'category').map((s) => s.source.path));
    for (const c of categories.filter((x) => !x.parent && x.productCount > 0)) assert.ok(paths.has(c.path), c.path);
  });
  test('istekler: bütün envanter değil, sınırlı sayıda aday', () => {
    const reqs = sectionRequests(homeSliders);
    assert.ok(reqs.length >= 6);
    for (const r of reqs) assert.ok(r.first >= 10 && r.first <= 30, `${r.id}: ${r.first}`);
    assert.ok(!reqs.some((r) => r.type === 'offers'));
  });
});

describe('demo verisiyle bölümler', () => {
  const sections = build();
  const byId = new Map(sections.map((s) => [s.id, s]));

  test('boş bölüm oluşmaz; her bölümde 1–10 ürün', () => {
    assert.ok(sections.length >= 6);
    for (const s of sections) assert.ok(s.products.length >= 1 && s.products.length <= 10, `${s.id}: ${s.products.length}`);
    assert.ok(!byId.has('madalya'), 'ürünü olmayan Madalya bölümü gösterilmemeli');
  });
  test('envanteri yeterli kategoride 5–10 ürün', () => {
    for (const id of ['tc-kagit', 'yabanci', 'tc-madeni']) assert.ok(byId.get(id).products.length >= 5, id);
    assert.equal(byId.get('yabanci').products.length, 10);
  });
  test('bölüm içinde tekrar yok; ürünler doğru kategoriye ait', () => {
    for (const s of sections) assert.equal(new Set(s.products.map((p) => p.id)).size, s.products.length, s.id);
    for (const cfg of homeSliders.sections.filter((x) => x.source.type === 'category')) {
      for (const p of byId.get(cfg.id)?.products ?? []) assert.ok(inCategory(p, cfg.source.path), `${cfg.id}: ${p.title}`);
    }
    for (const p of byId.get('sertifikali').products) assert.ok(p.collections.includes('sertifikali-paralar'));
  });
  test('bölümler arası tekrar önlenir (Madeni ve Hatıra aynı ürünleri paylaşıyor)', () => {
    const a = new Set(byId.get('tc-madeni').products.map((p) => p.id));
    const shared = byId.get('tc-hatira').products.filter((p) => a.has(p.id));
    assert.equal(shared.length, 0);
    assert.ok(byId.get('tc-hatira').products.length >= 5);
  });
  test('Teklif Ver bölümü yalnızca teklif alan ürünleri içerir', () => {
    const offer = byId.get('teklif');
    assert.equal(offer.href, '/teklif-ver');
    assert.equal(offer.products.length, acceptingOffers(products).length);
    for (const p of offer.products) assert.equal(offerStatus(p).accepting, true, p.title);
  });
  test('açık ürünler satılmış ve kapalı ürünlerden önce gelir', () => {
    for (const s of sections) {
      const flags = s.products.map(isAvailable);
      assert.deepEqual(flags, [...flags].sort((x, y) => Number(y) - Number(x)), s.id);
    }
  });
  test('bağlantılar, başlıklar ve sıra yapılandırmadan gelir', () => {
    assert.equal(byId.get('tc-kagit').href, '/kategori/tc-kagit-paralar');
    assert.equal(byId.get('tc-kagit').title, 'T.C. Kâğıt Paraları');
    assert.equal(byId.get('sertifikali').href, '/koleksiyonlar/sertifikali-paralar');
    const order = homeSliders.sections.map((s) => s.id).filter((id) => byId.has(id));
    assert.deepEqual(sections.map((s) => s.id), order);
    assert.ok(sections.filter((s) => s.tone === 'minor').every((s) => ['malzeme', 'madalya', 'antika'].includes(s.id)));
  });
  test('görünürlük, sınır ve sıra yapılandırmayla değişir', () => {
    const config = { ...homeSliders, sections: [
      { id: 'yabanci', source: { type: 'category', path: 'yabanci-paralar' }, limit: 4 },
      { id: 'tc-kagit', source: { type: 'category', path: 'tc-kagit-paralar' }, visible: false },
      { id: 'osmanli', source: { type: 'category', path: 'osmanli-paralari' } },
    ] };
    const out = build(config);
    assert.deepEqual(out.map((s) => s.id), ['yabanci', 'osmanli']);
    assert.equal(out[0].products.length, 4);
  });
  test('satılmış ürün görünürlüğü kapalıysa slider’a girmez', () => {
    const out = build(homeSliders, { soldVisibility: 'unlisted' });
    assert.ok(out.every((s) => s.products.every((p) => p.availability.status !== 'sold')));
  });
});

describe('seçim kuralları', () => {
  test('az ürün varsa olan gösterilir, çoğaltılmaz', () => {
    const picked = pickProducts([mk('a'), mk('b'), mk('a')], { limit: 10 });
    assert.deepEqual(picked.map((p) => p.id), ['a', 'b']);
  });
  test('öncelik: açık → stokta yok/kapalı → satılmış; grup içi sıra korunur', () => {
    const list = [mk('s', { availability: { status: 'sold' } }), mk('x'), mk('o', { availability: { status: 'out_of_stock' } }), mk('c', { offersEnabled: true, offersClosed: true }), mk('t', { offersEnabled: true }), mk('y')];
    assert.deepEqual(prioritize(list).map((p) => p.id), ['x', 't', 'y', 'o', 'c', 's']);
  });
  test('yeterli yeni ürün varsa görülmüşler alınmaz; yoksa onlarla tamamlanır', () => {
    const c = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => mk(id));
    assert.deepEqual(pickProducts(c, { limit: 10, seen: new Set(['a']), preferUniqueMin: 5 }).map((p) => p.id), ['b', 'c', 'd', 'e', 'f']);
    assert.deepEqual(pickProducts(c, { limit: 10, seen: new Set(['a', 'b', 'c']), preferUniqueMin: 5 }).map((p) => p.id), ['d', 'e', 'f', 'a', 'b', 'c']);
  });
  test('demo varsayılan sırası: en yeni önce ve istenen sayıda', () => {
    const list = localCandidates(products, { type: 'category', key: 'yabanci-paralar', first: 20 });
    assert.equal(list.length, 20);
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].order >= list[i].order);
  });
});

test('sağlayıcı sırası korunur; yalnızca açık ürünler öne alınır', () => {
  const fetched = { x: { title: 'X', products: [mk('3'), mk('1', { availability: { status: 'sold' } }), mk('2')] } };
  const out = buildHomeSections({ config: { defaultLimit: 10, sections: [{ id: 'x', source: { type: 'collection', handle: 'x' } }] }, fetched, urls });
  assert.deepEqual(out[0].products.map((p) => p.id), ['3', '2', '1']);
});
