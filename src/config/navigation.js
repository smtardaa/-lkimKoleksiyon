/**
 * Menü ve ana sayfa vitrin ayarları.
 * Kategori yolları hem demo verisinde hem Shopify'da (ilkim.category_path
 * metafield'ı) aynı tutulmalıdır. Ayrıntılı hiyerarşi katalog ve filtrelerde yer alır;
 * burada yalnızca üst seviye gruplar bulunur.
 */
import { u } from '../lib/paths.js';

const withBase = (items) => items.map((item) => ({ ...item, href: u(item.href) }));

export const topCategories = [
  { path: 'tc-kagit-paralar', title: 'T.C. Kâğıt Paraları' },
  { path: 'tc-madeni-paralar', title: 'T.C. Madeni Paraları' },
  { path: 'tc-hatira-paralari', title: 'T.C. Hatıra Paraları' },
  { path: 'osmanli-paralari', title: 'Osmanlı Paraları' },
  { path: 'yabanci-paralar', title: 'Yabancı Paralar' },
  { path: 'pul-ve-koleksiyon-malzemeleri', title: 'Pul ve Koleksiyon Malzemeleri' },
  { path: 'madalya-ve-objeler', title: 'Madalya ve Objeler' },
  { path: 'antika-ve-diger', title: 'Antika ve Diğer Koleksiyon Ürünleri' },
];

export const mainNav = withBase([
  { href: '/urunler', label: 'Mağaza' },
  { href: '/kategori', label: 'Kategoriler', dropdown: true },
  { href: '/koleksiyonlar', label: 'Koleksiyonlar' },
  { href: '/yeni-gelenler', label: 'Yeni Gelenler' },
  { href: '/teklif-ver', label: 'Teklif Ver' },
  { href: '/iletisim', label: 'İletişim' },
]);

export const footerNav = {
  magaza: withBase([
    { href: '/urunler', label: 'Tüm ürünler' },
    { href: '/yeni-gelenler', label: 'Yeni gelenler' },
    { href: '/koleksiyonlar', label: 'Koleksiyon seçkileri' },
    { href: '/teklif-ver', label: 'Teklif ver' },
    { href: '/kategori', label: 'Bütün kategoriler' },
    { href: '/favoriler', label: 'Favorilerim' },
  ]),
  bilgi: withBase([
    { href: '/koleksiyon-rehberi', label: 'Koleksiyon rehberi' },
    { href: '/sss', label: 'Sıkça sorulan sorular' },
    { href: '/hakkimizda', label: 'Hakkımızda' },
    { href: '/iletisim', label: 'İletişim' },
  ]),
  yasal: withBase([
    { href: '/bilgi/kargo-ve-teslimat', label: 'Kargo ve teslimat' },
    { href: '/bilgi/iade-ve-cayma', label: 'İade ve cayma hakkı' },
    { href: '/bilgi/odeme-secenekleri', label: 'Ödeme seçenekleri' },
    { href: '/bilgi/mesafeli-satis-sozlesmesi', label: 'Mesafeli satış sözleşmesi' },
    { href: '/bilgi/on-bilgilendirme-formu', label: 'Ön bilgilendirme formu' },
    { href: '/bilgi/gizlilik-ve-kvkk', label: 'Gizlilik ve KVKK' },
    { href: '/bilgi/cerez-politikasi', label: 'Çerez politikası' },
  ]),
};

/**
 * Ana sayfa “Koleksiyonunu seç” kartları. Görseller çalışma anında katalogdan
 * (ilgili gruptaki stoktaki ürünlerin ilk görselleri) seçilir; uydurma görsel yoktur.
 */
export const homeCards = {
  big: { title: 'Kâğıt Paralar', text: 'T.C., Osmanlı ve dünya banknotları', href: u('/urunler?tur=banknot'), match: { kind: 'banknot' } },
  coins: { title: 'Madeni Paralar', text: 'Tedavül, hatıra ve Osmanlı sikkeleri', href: u('/urunler?tur=madeni'), match: { kind: 'madeni' } },
  cert: { title: 'Sertifikalı Paralar', text: 'Derecelendirilmiş ve belgeli parçalar', href: u('/koleksiyonlar/sertifikali-paralar'), match: { collection: 'sertifikali-paralar' } },
  dark: { title: 'Koleksiyon Seçkileri', text: 'Gümüş paralar, setler ve özel seçkiler', href: u('/koleksiyonlar'), match: { collection: 'gumus-paralar' } },
};
