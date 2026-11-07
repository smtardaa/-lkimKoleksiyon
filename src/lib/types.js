/**
 * ORTAK VERİ MODELİ (JSDoc)
 * Demo sağlayıcısı ve Shopify sağlayıcısı bu biçimde ürün döndürür;
 * bütün arayüz bileşenleri yalnızca bu modeli tanır.
 *
 * @typedef {{ amount: number, currencyCode: string }} Money
 *
 * @typedef {Object} ProductImage
 * @property {string} src        — büyük görsel (galeri/büyütme)
 * @property {string} [srcSmall] — liste kartı için küçük görsel
 * @property {number} width
 * @property {number} height
 * @property {string} alt
 *
 * @typedef {Object} Availability
 * @property {'in_stock'|'out_of_stock'|'sold'} status
 *   - in_stock: satın alınabilir
 *   - out_of_stock: stok yok (tekrar gelebilir; satıldığı bilinmiyor)
 *   - sold: açıkça “satıldı” olarak işaretlenmiş tekil ürün (Shopify: ilkim.sale_status = "sold")
 * @property {boolean} availableForSale
 * @property {number|null} quantity — bilinmiyorsa null
 *
 * @typedef {Object} ProductSpecs  — bilinmeyen alanlar null; tahmin edilmez
 * @property {'banknot'|'madeni'|'set'|'malzeme'|'madalya'|'obje'|'pul'|'antika'|null} kind
 * @property {string|null} country
 * @property {string|null} countrySlug
 * @property {number|null} yearFrom
 * @property {number|null} yearTo
 * @property {'miladi'|'hicri'|null} calendar — yıl hangi takvime göre yazıldı
 * @property {string|null} yearText — ürün üzerindeki/kaynaktaki yazımıyla
 * @property {{value:number, unit:string, unitSlug:string, label:string}|null} denomination
 * @property {number|null} emission — T.C. banknot emisyonu
 * @property {string|null} ruler — hükümdar (Osmanlı)
 * @property {string|null} rulerSlug
 * @property {string|null} period — dönem (ör. “1924–1957 Dönemi”)
 * @property {string|null} periodSlug
 * @property {{label:string, slug:string, scale:string|null}|null} condition
 * @property {string|null} catalogNumber — ör. “Pick P-173a”
 * @property {{service:string, grade:number|null, label:string|null}|null} certification
 * @property {string|null} metal
 * @property {string|null} metalSlug
 *
 * @typedef {Object} Product
 * @property {string} id           — sağlayıcıya özgü kimlik
 * @property {string} variantId    — sepete eklenen satılabilir birim (Shopify: ProductVariant GID)
 * @property {string} handle       — URL parçası (/urun/{handle})
 * @property {string} title
 * @property {string} summary      — kısa açıklama (düz metin)
 * @property {string|null} descriptionHtml
 * @property {string|null} sku
 * @property {string[]} categoryPaths    — ör. ["tc-kagit-paralar/6-emisyon/5-lira"]
 * @property {string|null} primaryCategory
 * @property {string[]} collections      — seçki tanıtıcıları (çoğaltma olmadan ilişki)
 * @property {string[]} [collectionTitles]
 * @property {Money} price
 * @property {Money|null} compareAtPrice
 * @property {Availability} availability
 * @property {ProductImage[]} images
 * @property {ProductSpecs} specs
 * @property {string|null} createdAt  — ISO; demo'da bilinmiyorsa null
 * @property {number} order           — yeni→eski sıralama yedeği (büyük = yeni)
 * @property {string|null} seoTitle
 * @property {string|null} seoDescription
 * @property {string|null} deliveryNote — ürün özel teslimat notu (Shopify metafield)
 * @property {{url:string, fetchedAt:string, sourceId:string, priceText:string|null, stockText:string|null}|null} source — yalnızca demo
 * @property {string|null} demoScenario — yalnızca demo (ör. 'sold'), dokümante edilir
 * @property {boolean} offersEnabled — ürün teklif usulüyle satılır; sabit fiyatlı satın alma kapalıdır.
 *   Yalnızca bu alandan okunur; fiyat, stok veya başlıktan ÇIKARILMAZ. (Shopify: ilkim.offers_enabled)
 * @property {boolean} offersClosed — teklif ürünü için alım geçici/kalıcı kapatıldı; ürün normal satışa dönmez.
 *   (Shopify: ilkim.offers_closed)
 *
 * @typedef {Object} Category
 * @property {string} path      — “tc-kagit-paralar/6-emisyon”
 * @property {string} title
 * @property {string|null} parent
 * @property {string|null} description
 * @property {number} productCount — alt kategoriler dahil
 * @property {string|null} [sourceUrl]
 *
 * @typedef {Object} Collection
 * @property {string} handle
 * @property {string} title
 * @property {string|null} description
 * @property {string|null} rule — demo seçkisinin hangi kuralla oluştuğu
 * @property {number} productCount
 *
 * @typedef {{ variantId: string, productId?: string, quantity: number }} CartLineInput
 */
export {};
