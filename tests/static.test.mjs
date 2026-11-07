// Statik sürüme özgü testler: alt yol, katalog verisi, tarayıcıdaki sepet ve şablonlar — `npm test`
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPaths } from '../src/lib/paths.js';
import { buildPayload, toClientProduct } from '../src/lib/catalog-payload.js';
import { validateLines, demoCheckout, purchaseLimit } from '../src/lib/cart-core.js';
import { favoriteItems } from '../src/lib/favorites.js';
import { makeCategoryTitles } from '../src/lib/urls.js';
import { renderCard } from '../src/lib/render/product-card.js';
import { renderCatalog } from '../src/lib/render/catalog-view.js';
import { runQuery, parseState, recentProducts } from '../src/lib/search/engine.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../src/data/demo/${p}`, import.meta.url), 'utf8'));
const products = read('products.json');
const categories = read('categories.json');
const payload = buildPayload({ products, categories });
const findIn = (list) => (id) => list.find((p) => p.variantId === id);

const normal = products.find((p) => !p.offersEnabled && p.availability.status === 'in_stock' && p.specs.kind === 'banknot');
const offer = products.find((p) => p.offersEnabled && !p.offersClosed && p.availability.status === 'in_stock');
const sold = products.find((p) => !p.offersEnabled && p.availability.status === 'sold');
const supply = products.find((p) => p.specs.kind === 'malzeme' && p.availability.status === 'in_stock');

describe('alt yol', () => {
  test('proje sitesi', () => {
    const { u } = createPaths('/depo-adi');
    assert.equal(u('/'), '/depo-adi/');
    assert.equal(u('/urunler'), '/depo-adi/urunler/');
    assert.equal(u('/urunler?tur=madeni&sayfa=2'), '/depo-adi/urunler/?tur=madeni&sayfa=2');
    assert.equal(u('/urunler#x'), '/depo-adi/urunler/#x');
    assert.equal(u('/kategori/a/b/'), '/depo-adi/kategori/a/b/');
    assert.equal(u('/brand/og-default.jpg'), '/depo-adi/brand/og-default.jpg');
    assert.equal(u('/data/catalog.json'), '/depo-adi/data/catalog.json');
  });
  test('kullanıcı sitesi ve sondaki eğik çizgi', () => {
    assert.equal(createPaths('').u('/urunler'), '/urunler/');
    assert.equal(createPaths('/').u('/'), '/');
    assert.equal(createPaths('/depo/').u('/sepet'), '/depo/sepet/');
  });
});

describe('katalog verisi', () => {
  test('bütün ürünler var; kaynak kaydı ve ek alanlar yok', () => {
    assert.equal(payload.products.length, products.length);
    assert.ok(payload.products.length > 900);
    assert.equal(payload.categories.length, categories.length);
    const text = JSON.stringify(payload);
    for (const banned of ['"source"', '"extra"', 'eskiparamarket', 'originalTitle', 'sourceUrl']) assert.ok(!text.includes(banned), banned);
  });
  test('teklif ürününün fiyatı yazılmaz; normal ürünün fiyatı korunur', () => {
    assert.equal(toClientProduct(offer).price.amount, 0);
    assert.equal(toClientProduct(offer).compareAtPrice, null);
    assert.ok(offer.price.amount > 0);
    assert.deepEqual(toClientProduct(normal).price, normal.price);
  });
  test('veri küçültme arama ve filtre sonucunu değiştirmez', () => {
    const titlesSrc = makeCategoryTitles(categories);
    const titlesOut = makeCategoryTitles(payload.categories);
    const queries = ['q=lira', 'q=almanya mark', 'tur=madeni', 'ulke=turkiye&siralama=yil-artan', 'q=gumus&siralama=ad', 'emisyon=5&sayfa=2', 'fiyat_min=1000&fiyat_max=5000&siralama=fiyat-azalan', 'katalog=P-173a', 'yil_min=1200&yil_max=1400&takvim=hicri'];
    let compared = 0;
    for (const qs of queries) {
      const state = parseState(new URLSearchParams(qs));
      const a = runQuery(products, state, { categoryTitles: titlesSrc, soldVisibility: 'visible' });
      const b = runQuery(payload.products, state, { categoryTitles: titlesOut, soldVisibility: 'visible' });
      assert.equal(b.total, a.total, qs);
      assert.ok(a.total > 0, `boş sonuç: ${qs}`);
      assert.deepEqual(b.items.map((p) => p.id), a.items.map((p) => p.id), qs);
      compared++;
    }
    assert.equal(compared, queries.length);
  });
  test('yeni gelenler alt kümesi', () => {
    const list = recentProducts(products);
    assert.equal(list.length, 96);
    assert.ok(list.every((p) => p.availability.status === 'in_stock'));
    assert.ok(list[0].order >= list[95].order);
  });
});

describe('tarayıcıdaki sepet', () => {
  const list = payload.products;
  test('normal ürün geçer, ara toplam hesaplanır', () => {
    const v = validateLines([{ variantId: normal.variantId, quantity: 1 }], findIn(list));
    assert.equal(v.lines[0].ok, true);
    assert.equal(v.subtotal.amount, normal.price.amount);
    assert.equal(demoCheckout(v).demo, true);
    assert.equal(demoCheckout(v).ok, false);
  });
  test('stok sınırı adet düşürür ve ödeme engellenir', () => {
    const v = validateLines([{ variantId: normal.variantId, quantity: 3 }], findIn(list));
    assert.equal(v.lines[0].quantity, 1);
    assert.match(v.lines[0].message, /en fazla 1 adet/);
    assert.ok(demoCheckout(v).validation);
  });
  test('malzeme ürününde üst sınır daha yüksektir', () => {
    assert.equal(purchaseLimit(supply), 5);
  });
  test('teklif ürünü sepete ve ödemeye giremez, fiyat dönmez', () => {
    const v = validateLines([{ variantId: offer.variantId, quantity: 1 }], findIn(list));
    assert.equal(v.lines[0].ok, false);
    assert.equal(v.lines[0].product.price, null);
    assert.equal(v.lines[0].product.priceText, '');
    assert.equal(v.subtotal.amount, 0);
    assert.ok(demoCheckout(v).validation);
    assert.equal(purchaseLimit(offer), 0);
  });
  test('satılmış, bulunmayan ve boş sepet', () => {
    const v = validateLines([{ variantId: sold.variantId, quantity: 1 }, { variantId: 'yok', quantity: 1 }], findIn(list));
    assert.equal(v.lines[0].ok, false);
    assert.match(v.lines[0].message, /satıldı/);
    assert.equal(v.lines[1].removed, true);
    assert.equal(demoCheckout(validateLines([], findIn(list))).message, 'Sepet boş.');
  });
});

describe('favoriler', () => {
  test('güncel durum, teklif fiyatı gizli, silinen kayıt raporlanır', () => {
    const { items, missing } = favoriteItems([normal.id, offer.id, 'yok'], payload.products);
    assert.equal(items.length, 2);
    assert.deepEqual(missing, ['yok']);
    assert.ok(items[0].priceText.includes('₺'));
    assert.equal(items[1].priceText, '');
    assert.equal(items[1].offerOnly, true);
    assert.ok(items[1].offerAccepting);
  });
});

describe('ortak şablon', () => {
  test('kart metni kaçışlanır', () => {
    const html = renderCard({ ...normal, title: 'A <b>"x"</b> & y' });
    assert.ok(html.includes('A &lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y'));
    assert.ok(!html.includes('<b>"x"'));
  });
  test('normal kartta sepet, teklif kartında Teklif Ver var; fiyat gizli', () => {
    const n = renderCard(normal);
    assert.ok(n.includes('data-add-to-cart') && n.includes('class="price"'));
    const o = renderCard(toClientProduct(offer));
    assert.ok(o.includes('Teklif Ver') && !o.includes('data-add-to-cart') && !o.includes('class="price"') && !o.includes('₺'));
  });
  test('katalog görünümü: filtre, sayfalama ve boş durum', () => {
    const state = parseState(new URLSearchParams('q=<script>&tur=banknot'));
    const empty = renderCatalog({ basePath: '/depo/urunler/', state, result: runQuery(products, state, { categoryTitles: () => [], soldVisibility: 'visible' }), emptyTitle: 'Yok' });
    assert.ok(empty.includes('Sonuç bulunamadı') && !empty.includes('<script>'));

    const s2 = parseState(new URLSearchParams('tur=banknot&sayfa=2'));
    const r2 = runQuery(products, s2, { categoryTitles: () => [], soldVisibility: 'visible', pageSize: 24 });
    const html = renderCatalog({ basePath: '/depo/urunler/', state: s2, result: r2 });
    assert.ok(html.includes('href="/depo/urunler/?tur=banknot&amp;sayfa=3"'), 'sonraki sayfa bağlantısı filtreyi korumalı');
    assert.ok(html.includes('aria-current="page">2<'));
    assert.equal((html.match(/class="p-card/g) ?? []).length, 24);
  });
});
