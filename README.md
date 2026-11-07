# İlkim Koleksiyon — statik önizleme

İlkim Koleksiyon sitesinin GitHub Pages'te yayınlanabilen, sunucusuz önizleme sürümü.
Amaç, siteyi gerçek yayına almadan telefonda ve başka cihazlarda incelemektir.
Gerçek mağaza kodu bu depoda değildir; bu sürüm ana projenin kopyasından türetilmiştir ve ona bağlı değildir.

> **GitHub Pages sitesi herkese açıktır; depo özel olsa bile adresi bilen herkes açabilir.**
> Sayfalar `noindex` olsa da bu bir erişim koruması değildir. Ürün görselleri, adları ve fiyatları
> eskiparamarket.com'dan alınmış örnek envanterdir ve İlkim Koleksiyon'a ait değildir. Bu içeriği herkese açık
> yayınlamadan önce kullanım hakkını değerlendirin; gerçek yayında envanter tamamen değiştirilecektir.

## Ana sürümden farklar

| Konu | Ana sürüm | Bu önizleme |
|---|---|---|
| Çalışma biçimi | Astro SSR + Node sunucu | Bütün sayfalar derlemede dosya olarak üretilir (`output: 'static'`) |
| Veri | Demo veya Shopify Storefront API | Yalnızca demo envanter |
| Arama, filtre, sıralama, sayfalama | Sunucuda | Tarayıcıda; aynı motor (`src/lib/search/engine.js`) ve `data/catalog.json` |
| Filtre durumu | Adreste | Adreste; her filtre normal sayfa geçişidir, geri/ileri ve paylaşılan bağlantı çalışır |
| Sepet doğrulama | Sunucu API'si | Tarayıcıda aynı kurallar (`src/lib/cart-core.js`) |
| Ödeme | Shopify Checkout | Yok; “sipariş oluşturulmadı” açıklaması gösterilir |
| Teklif formu | Sunucuda doğrulama, gerçek gönderim | Tarayıcıda doğrulama; “Demo teklif oluşturuldu, işletmeye gönderilmedi.” |
| İndeksleme | Yayın ayarına bağlı | Her zaman kapalı: her sayfada `noindex`, `robots.txt` → `Disallow: /` |

Kaldırılanlar: `@astrojs/node` adaptörü, `/api/*` uçları, middleware, Shopify sağlayıcısı, bellek önbelleği,
teklif gönderim kanalları ve sınırlayıcılar, `astro:env` şeması, `sharp`.

## Önizlemede çalışmayan işlevler

Bunlar sunucu gerektirir; sahte başarı gösterilmez, sitede açıklaması bulunur.

- **Gerçek ödeme ve sipariş:** Ödeme adımı yalnızca bilgilendirme gösterir.
- **Teklif iletimi:** Form doğrulanır ama teklif işletmeye gitmez ve kaydedilmez. E-posta, webhook, kalıcı kayıt yoktur.
- **Teklif aşırı gönderim sınırları:** Sunucu olmadığı için yoktur (gönderim de yapılmadığından zararsızdır).
- **İletişim formu:** Ana sürümde de bir gönderim hizmetine bağlı değildir; devre dışıdır.
- **Üyelik:** Hiçbir sürümde yoktur.
- **Shopify canlı verisi, webhook, sağlık ucu (`/api/health`).**

Sepet ve favoriler yalnızca kullanılan tarayıcıda saklanır; cihazlar arasında taşınmaz.

## GitHub'da yayınlama

1. GitHub'da yeni bir depo oluşturun.
2. Bu klasörü o depoya gönderin (`main` dalı).
3. Depo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. `Actions` sekmesinden `GitHub Pages` iş akışının bittiğini izleyin. Adres iş akışı çıktısında görünür:
   proje sitesinde `https://kullanici.github.io/depo-adi/`.

Adres ve alt yol `actions/configure-pages` çıktısından otomatik alınır; depo adı koda yazılmaz.
`kullanici.github.io` adlı depoda alt yolsuz çalışır.

İş akışı sırası: kurulum (`npm ci`) → `npm test` → `npm run build` → `npm run check:static` → yayın.
Denetim başarısız olursa yayın yapılmaz.

## Yerelde çalıştırma

Gereksinim: Node.js 22.12 veya üzeri.

```bash
npm ci
```

Alt yolsuz geliştirme sunucusu (http://localhost:5510):

```bash
npm run dev
```

Alt yolla derleme ve GitHub Pages benzeri yerel sunum (http://127.0.0.1:5510/ilkim-koleksiyon/):

```bash
MSYS_NO_PATHCONV=1 SITE_URL=https://kullanici.github.io BASE_PATH=/ilkim-koleksiyon npm run build
```

```bash
MSYS_NO_PATHCONV=1 BASE_PATH=/ilkim-koleksiyon PORT=5510 npm run preview
```

`MSYS_NO_PATHCONV=1` Windows Git Bash içindir; olmazsa `/ilkim-koleksiyon` bir Windows yoluna çevrilir.
PowerShell ve Linux'ta gerekmez. Ana proje 5500 portunu kullanır; bu sürüm 5510'dadır.

## Kontrol komutları

```bash
npm test
```

```bash
MSYS_NO_PATHCONV=1 SITE_URL=https://kullanici.github.io BASE_PATH=/ilkim-koleksiyon npm run check:static
```

`check:static` çıktıyı denetler ve hata varsa 1 ile çıkar: beklenen sayfa sayısı (veriden hesaplanır), her iç bağlantı ve
görselin gerçek dosyaya karşılık gelmesi, alt yolu atlayan adres olmaması, canonical, Open Graph, JSON-LD, noindex,
robots.txt, sitemap kapsamı, sunucu çağrısı ve gizli değer kalmaması, teklif fiyatının sızmaması, 1 GB sınırı.
`SITE_URL` ve `BASE_PATH`, derlemedeki değerlerle aynı olmalıdır.

Site tek dillidir (Türkçe); dil değiştirici ve `hreflang` yoktur.

## Yapı

```
src/lib/paths.js            alt yol: bütün iç adresler u() ile üretilir
src/lib/search/             arama ve filtre motoru (ana sürümle aynı)
src/lib/render/             kart ve katalog HTML'i (derleme ve tarayıcı aynı şablonu kullanır)
src/lib/cart-core.js        sepet kuralları
src/lib/offers/             teklif durumu, doğrulama, demo sonucu
src/lib/catalog-payload.js  tarayıcıya giden veri: kaynak kaydı ve teklif fiyatı yazılmaz
src/pages/data/catalog.json.js  data/catalog.json üretimi
src/scripts/catalog-client.js   adresteki filtreleri uygular
scripts/check-static.mjs    çıktı denetimi
scripts/serve-dist.mjs      GitHub Pages benzeri yerel sunucu
```

## Depoya alınmayanlar

Ana proje klasöründen şunlar kopyalanmadı: `node_modules`, `dist`, `.astro`, `.git`, `.env`, `.claude`, `ilerleme.md`,
başka markayı (Eski Para Market) gösteren tasarım taslağı, logonun özgün PNG'si, ham tarama kayıtları (`demo-kaynak/`),
`scripts/` altındaki veri ve görsel üreticileri, `docs/` (Shopify ve PayTR kurulum belgeleri).
Marka görsellerinin türetilmiş sürümleri `public/brand/` altındadır.

`src/data/demo/products.json` derleme girdisidir: kaynak adresleri ve teklif ürünlerinin kaynak fiyatını içerir.
Bu alanlar yayın çıktısına girmez, ancak depo herkese açıksa kaynak dosyada görünür; depoyu özel tutmanız önerilir.

## robots.txt notu

Proje sitesinde `robots.txt` dosyası `/depo-adi/robots.txt` adresindedir; arama motorları yalnızca alan adı kökündeki dosyayı
okuduğu için orada etkisizdir. Asıl koruma her sayfadaki `noindex` etiketidir. Sunucu olmadığından `X-Robots-Tag` başlığı gönderilemez.
