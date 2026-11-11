/**
 * ANA SAYFA ÜRÜN SLIDER'LARI — MERKEZİ YAPILANDIRMA
 * Bölümlerin sırası, görünürlüğü ve ürün sınırı buradan yönetilir.
 * Ürünler HTML'e yazılmaz; her bölüm veri sağlayıcısından (demo / Shopify) beslenir.
 *
 * source.type:
 *  - 'category'   : kategori yolu (Shopify'da ilkim.category_path değeri bu yol olan koleksiyon)
 *  - 'collection' : seçki tanıtıcısı (Shopify koleksiyon handle'ı)
 *  - 'offers'     : şu anda teklif kabul eden ürünler
 *
 * title / description verilmezse kategori veya koleksiyonun kendi başlığı ve açıklaması kullanılır.
 * tone: 'minor' bölümler sayfanın altında, daha düşük görsel öncelikle gösterilir.
 * Ürünü olmayan bölüm ana sayfada hiç gösterilmez.
 */
export const homeSliders = {
  /** Bölüm başına en fazla ürün (bölümde `limit` ile ezilebilir) */
  defaultLimit: 10,
  /**
   * Aynı ürün birden fazla bölümde tekrar etmesin: bir bölümde, önceki bölümlerde gösterilmemiş
   * en az bu kadar ürün varsa yalnızca onlar gösterilir; yoksa tekrar eden ürünlerle tamamlanır.
   */
  preferUniqueMin: 5,
  sections: [
    { id: 'tc-kagit', source: { type: 'category', path: 'tc-kagit-paralar' }, visible: true },
    { id: 'tc-madeni', source: { type: 'category', path: 'tc-madeni-paralar' }, visible: true },
    { id: 'tc-hatira', source: { type: 'category', path: 'tc-hatira-paralari' }, visible: true },
    { id: 'osmanli', source: { type: 'category', path: 'osmanli-paralari' }, visible: true },
    { id: 'yabanci', source: { type: 'category', path: 'yabanci-paralar' }, visible: true },
    {
      id: 'sertifikali',
      source: { type: 'collection', handle: 'sertifikali-paralar' },
      description: 'Derecelendirilmiş ve belgeli parçalar.',
      visible: true,
    },
    {
      id: 'teklif',
      source: { type: 'offers' },
      title: 'Teklif Ver',
      description: 'Sabit fiyatla satılmayan, teklif alınan seçili parçalar.',
      visible: true,
    },
    { id: 'malzeme', source: { type: 'category', path: 'pul-ve-koleksiyon-malzemeleri' }, tone: 'minor', visible: true },
    { id: 'madalya', source: { type: 'category', path: 'madalya-ve-objeler' }, tone: 'minor', visible: true },
    { id: 'antika', source: { type: 'category', path: 'antika-ve-diger' }, tone: 'minor', visible: true },
  ],
};
