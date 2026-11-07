/**
 * dist çıktısı denetimi. Tekrar çalıştırılabilir; hata varsa çıkış kodu 1 olur.
 *
 * Kullanım (Git Bash):
 *   MSYS_NO_PATHCONV=1 SITE_URL=https://kullanici.github.io BASE_PATH=/depo-adi npm run check:static
 * BASE_PATH ve SITE_URL, derlemede kullanılan değerlerle aynı olmalıdır.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { findSecrets } from './secret-scan.mjs';

const DIST = join(process.cwd(), 'dist');
const BASE = (process.env.BASE_PATH ?? '').trim().replace(/\/+$/, '');
const SITE = (process.env.SITE_URL || 'http://localhost:5510').replace(/\/+$/, '');
const PREFIX = `${SITE}${BASE}`;
const GB = 1024 ** 3;
const SIZE_LIMIT = GB;

const errors = new Map();
const fail = (group, detail) => {
  if (!errors.has(group)) errors.set(group, []);
  errors.get(group).push(detail);
};
const read = (rel) => readFileSync(join(DIST, rel), 'utf8');
const dataFile = (name) => JSON.parse(readFileSync(join('src', 'data', 'demo', name), 'utf8'));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

if (!existsSync(DIST)) {
  console.error('dist klasörü yok; önce derleyin.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Dosya envanteri
// ---------------------------------------------------------------------------
const files = [];
let totalBytes = 0;
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const size = statSync(p).size;
      totalBytes += size;
      if (size >= 100 * 1024 ** 2) fail('Dosya boyutu', `${relative(DIST, p)} 100 MB üzerinde`);
      files.push(relative(DIST, p).split(sep).join('/'));
    }
  }
};
walk(DIST);
const fileSet = new Set(files);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

// ---------------------------------------------------------------------------
// Beklenen sayfalar (veriden hesaplanır; sabit sayı yazılmaz)
// ---------------------------------------------------------------------------
const products = dataFile('products.json');
const categories = dataFile('categories.json');
const collections = dataFile('collections.json');
const offerProducts = products.filter((p) => p.offersEnabled);
const STATIC_PAGES = ['', 'urunler', 'kategori', 'koleksiyonlar', 'yeni-gelenler', 'teklif-ver', 'arama', 'sepet', 'favoriler', 'hakkimizda', 'iletisim', 'koleksiyon-rehberi', 'sss',
  ...['kargo-ve-teslimat', 'iade-ve-cayma', 'odeme-secenekleri', 'mesafeli-satis-sozlesmesi', 'on-bilgilendirme-formu', 'gizlilik-ve-kvkk', 'cerez-politikasi'].map((s) => `bilgi/${s}`)];
const pageGroups = {
  'sabit sayfa': STATIC_PAGES,
  ürün: products.map((p) => `urun/${p.handle}`),
  kategori: categories.map((c) => `kategori/${c.path}`),
  seçki: collections.map((c) => `koleksiyonlar/${c.handle}`),
  'teklif formu': offerProducts.map((p) => `teklif-ver/${p.handle}`),
};
const expectedHtml = new Set(['404.html']);
const counts = {};
for (const [group, list] of Object.entries(pageGroups)) {
  const missing = list.filter((p) => !fileSet.has(p ? `${p}/index.html` : 'index.html'));
  counts[group] = `${list.length - missing.length}/${list.length}`;
  for (const m of missing) fail('Eksik sayfa', `${group}: ${m}`);
  for (const p of list) expectedHtml.add(p ? `${p}/index.html` : 'index.html');
}
for (const f of htmlFiles) if (!expectedHtml.has(f)) fail('Beklenmeyen sayfa', f);
if (htmlFiles.length !== expectedHtml.size) fail('Sayfa sayısı', `${htmlFiles.length} üretildi, ${expectedHtml.size} bekleniyordu`);

// ---------------------------------------------------------------------------
// İç bağlantı çözümleme
// ---------------------------------------------------------------------------
const checked = new Map();
function checkInternal(url, from) {
  const clean = decode(url).split('#')[0].split('?')[0];
  if (!clean) return;
  if (checked.has(clean)) {
    if (!checked.get(clean)) fail('Kırık bağlantı', `${clean} (${from})`);
    return;
  }
  let ok = true;
  if (BASE && clean !== `${BASE}/` && !clean.startsWith(`${BASE}/`)) {
    fail('Alt yolu atlayan adres', `${clean} (${from})`);
    ok = false;
  } else {
    let rel;
    try {
      rel = decodeURIComponent(clean.slice(BASE.length)).replace(/^\//, '');
    } catch {
      rel = clean;
    }
    const target = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel;
    if (!fileSet.has(target)) {
      ok = false;
      fail('Kırık bağlantı', `${clean} (${from})`);
    }
  }
  checked.set(clean, ok);
}

const ATTR = /\s(href|src|action)="([^"]*)"/g;
const SRCSET = /\ssrcset="([^"]*)"/g;
const external = new Set();
function checkUrl(raw, from) {
  const url = decode(raw).trim();
  if (!url || /^(#|mailto:|tel:|data:|javascript:)/.test(url)) return;
  if (url.startsWith(PREFIX + '/')) return checkInternal(url.slice(SITE.length), from);
  if (/^https?:\/\//.test(url) || url.startsWith('//')) {
    external.add(url);
    return undefined;
  }
  if (!url.startsWith('/')) return fail('Göreli adres', `${url} (${from})`);
  return checkInternal(url, from);
}

let linkCount = 0;
let ldCount = 0;
let hreflangCount = 0;
const expectedCanonical = (rel) => {
  const page = rel.replace(/index\.html$/, '');
  const offer = page.match(/^teklif-ver\/([^/]+)\/$/);
  return `${PREFIX}/${offer ? `urun/${offer[1]}/` : page}`;
};

for (const rel of htmlFiles) {
  const html = read(rel);
  const body = html.replace(/<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/g, '');
  for (const m of body.matchAll(ATTR)) { linkCount++; checkUrl(m[2], rel); }
  for (const m of body.matchAll(SRCSET)) for (const part of m[1].split(',')) { linkCount++; checkUrl(part.trim().split(/\s+/)[0], rel); }

  // data-config içindeki yollar da alt yollu olmalı
  const config = body.match(/data-config="([^"]*)"/)?.[1];
  if (config) {
    const parsed = JSON.parse(decode(config));
    checkUrl(parsed.basePath, rel);
    for (const s of parsed.subcategories) checkUrl(s.href, rel);
  }

  // noindex
  const robots = html.match(/<meta name="robots" content="([^"]*)"/g) ?? [];
  if (robots.length !== 1 || !robots[0].includes('noindex')) fail('noindex', rel);

  // canonical
  const canon = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => decode(m[1]));
  if (rel === '404.html') {
    if (canon.length) fail('canonical', '404 sayfasında canonical olmamalı');
  } else if (canon.length !== 1 || canon[0] !== expectedCanonical(rel)) {
    fail('canonical', `${rel}: ${canon.join(', ') || 'yok'} (beklenen ${expectedCanonical(rel)})`);
  }

  // hreflang: tek dilli sitede yoktur; varsa alt yollu ve gerçek olmalı
  for (const m of html.matchAll(/hreflang="[^"]*"[^>]*href="([^"]*)"/g)) { hreflangCount++; checkUrl(m[1], rel); }

  // Open Graph / Twitter mutlak adresleri
  for (const m of html.matchAll(/<meta (?:property|name)="(?:og:url|og:image|twitter:image)" content="([^"]*)"/g)) {
    if (!decode(m[1]).startsWith(`${PREFIX}/`)) fail('Open Graph', `${m[1]} (${rel})`);
    else checkUrl(m[1], rel);
  }

  // JSON-LD geçerli olmalı; site içi adresler alt yollu olmalı
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    ldCount++;
    let parsed;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      fail('JSON-LD', `geçersiz (${rel})`);
      continue;
    }
    const visit = (v) => {
      if (typeof v === 'string') {
        if (v.startsWith(SITE) && !v.startsWith(`${PREFIX}/`)) fail('JSON-LD', `alt yolsuz adres ${v} (${rel})`);
      } else if (v && typeof v === 'object') Object.values(v).forEach(visit);
    };
    visit(parsed);
  }
}

// ---------------------------------------------------------------------------
// Teklif ürünlerinin fiyatı hiçbir çıktıda görünmemeli
// ---------------------------------------------------------------------------
const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 });
for (const p of offerProducts) {
  const html = read(`urun/${p.handle}/index.html`);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('');
  if (ld.includes('"Offer"') || ld.includes('"price"')) fail('Teklif fiyatı', `şemada fiyat: ${p.handle}`);
  const main = html.slice(html.indexOf('class="pdp-info"'), html.indexOf('id="rel-title"') > 0 ? html.indexOf('id="rel-title"') : undefined);
  if (main.includes(money.format(p.price.amount))) fail('Teklif fiyatı', `detayda fiyat: ${p.handle}`);
}

// ---------------------------------------------------------------------------
// Katalog verisi
// ---------------------------------------------------------------------------
const payloadRaw = read('data/catalog.json');
const payload = JSON.parse(payloadRaw);
if (payload.products.length !== products.length) fail('Katalog verisi', `${payload.products.length}/${products.length} ürün`);
if (payload.categories.length !== categories.length) fail('Katalog verisi', 'kategori sayısı uyuşmuyor');
for (const p of payload.products) {
  if ('source' in p || 'extra' in p) fail('Katalog verisi', `kaynak kaydı çıktıda: ${p.handle}`);
  if (p.offersEnabled && (p.price.amount !== 0 || p.compareAtPrice)) fail('Teklif fiyatı', `katalog verisinde fiyat: ${p.handle}`);
  for (const i of p.images) { checkUrl(i.src, 'data/catalog.json'); checkUrl(i.srcSmall, 'data/catalog.json'); }
}

// ---------------------------------------------------------------------------
// Sitemap ve robots
// ---------------------------------------------------------------------------
const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decode(m[1]));
const parts = locs(read('sitemap.xml'));
if (parts.length !== 3) fail('Sitemap', `dizinde ${parts.length} parça var`);
const sitemapUrls = new Set();
for (const part of parts) {
  if (!part.startsWith(`${PREFIX}/`)) { fail('Sitemap', `alt yolsuz: ${part}`); continue; }
  const rel = part.slice(PREFIX.length + 1);
  if (!fileSet.has(rel)) { fail('Sitemap', `dosya yok: ${rel}`); continue; }
  for (const loc of locs(read(rel))) {
    if (!loc.startsWith(`${PREFIX}/`)) fail('Sitemap', `alt yolsuz: ${loc}`);
    else checkUrl(loc, rel);
    if (!/\.\w+$/.test(loc)) sitemapUrls.add(loc);
  }
  for (const m of read(rel).matchAll(/<image:loc>([^<]*)<\/image:loc>/g)) checkUrl(m[1], rel);
}
const page = (p) => `${PREFIX}/${p ? `${p}/` : ''}`;
const expectedSitemap = new Set([
  ...['', 'urunler', 'kategori', 'koleksiyonlar', 'yeni-gelenler', 'teklif-ver', 'hakkimizda', 'iletisim', 'koleksiyon-rehberi', 'sss'].map(page),
  ...products.map((p) => page(`urun/${p.handle}`)),
  ...categories.filter((c) => c.productCount > 0).map((c) => page(`kategori/${c.path}`)),
  ...collections.filter((c) => c.productCount > 0).map((c) => page(`koleksiyonlar/${c.handle}`)),
]);
for (const u of expectedSitemap) if (!sitemapUrls.has(u)) fail('Sitemap', `eksik: ${u}`);
for (const u of sitemapUrls) if (!expectedSitemap.has(u)) fail('Sitemap', `fazla: ${u}`);

const robotsTxt = read('robots.txt');
if (!/User-agent: \*/.test(robotsTxt) || !/Disallow: \/\s*$/m.test(robotsTxt)) fail('robots.txt', 'tarama kapalı değil');

// ---------------------------------------------------------------------------
// Sunucu çağrısı, alt yol ve gizli değer taraması
// ---------------------------------------------------------------------------
const textFiles = files.filter((f) => /\.(html|js|mjs|css|json|xml|txt|map)$/.test(f));
const SERVER = [
  [/["'`(]\/api\//, 'API adresi'],
  [/\bXMLHttpRequest\b|\bsendBeacon\b|new WebSocket|new EventSource/, 'ağ çağrısı'],
];
let baseInBundle = !BASE;
let fetchCalls = 0;
for (const f of textFiles) {
  const text = read(f);
  for (const name of findSecrets(text, SITE)) fail('Gizli değer', `${name}: ${f}`);
  for (const [re, name] of SERVER) if (re.test(text)) fail('Sunucu çağrısı', `${name}: ${f}`);
  if (f.endsWith('.js')) {
    fetchCalls += (text.match(/\bfetch\(/g) ?? []).length;
    if (BASE && text.includes(JSON.stringify(BASE).slice(1, -1))) baseInBundle = true;
    if (/\bfetch\(/.test(text) && !text.includes('/data/catalog.json')) fail('Sunucu çağrısı', `katalog dışı fetch: ${f}`);
  }
  if (f.endsWith('.css')) {
    for (const m of text.matchAll(/url\(["']?(\/[^"')]+)/g)) checkUrl(m[1], f);
  }
}
if (!baseInBundle) fail('Alt yol', 'istemci paketinde alt yol bulunamadı');
for (const secretFile of ['.env', '.env.local']) if (fileSet.has(secretFile)) fail('Gizli değer', `${secretFile} çıktıda`);
if (!fileSet.has('404.html')) fail('404', '404.html yok');
if (totalBytes >= SIZE_LIMIT) fail('Boyut', `${(totalBytes / GB).toFixed(2)} GB, sınır 1 GB`);
if (external.size) fail('Dış bağlantı', [...external].slice(0, 10).join(', '));

// ---------------------------------------------------------------------------
// Rapor
// ---------------------------------------------------------------------------
const mb = (totalBytes / 1024 ** 2).toFixed(1);
console.log(`Alt yol: ${BASE || '(yok)'} · Site: ${SITE}`);
console.log(`HTML: ${htmlFiles.length} · Dosya: ${files.length} · Boyut: ${mb} MB (sınır 1024 MB)`);
console.log(`Sayfalar: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`Denetlenen bağlantı: ${linkCount} (benzersiz ${checked.size}) · JSON-LD: ${ldCount} · hreflang: ${hreflangCount} (tek dilli site) · Sitemap adresi: ${sitemapUrls.size} · fetch çağrısı: ${fetchCalls}`);
if (errors.size) {
  console.error('\nHATALAR:');
  for (const [group, list] of errors) {
    console.error(`- ${group}: ${list.length}`);
    for (const item of list.slice(0, 8)) console.error(`    ${item}`);
  }
  process.exit(1);
}
console.log('Bütün denetimler geçti.');
