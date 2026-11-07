/**
 * Site ayarları (statik önizleme).
 * Bu sürüm her zaman demo envanterle çalışır ve arama motorlarına kapalıdır.
 */
const siteOrigin = new URL(import.meta.env.SITE ?? 'http://localhost:5510').origin;

export const storeMode = 'demo';
export const isDemo = true;
export const indexingEnabled = false;
/** Satılmış ürünler listelerde “Satıldı” etiketiyle görünür. */
export const soldVisibility = 'visible';

export const site = {
  name: 'İlkim Koleksiyon',
  shortName: 'İlkim',
  locale: 'tr_TR',
  lang: 'tr',
  currency: 'TRY',
  defaultDescription:
    'İlkim Koleksiyon — T.C. ve Osmanlı kâğıt paraları, madeni paralar, hatıra paraları, yabancı paralar ve koleksiyon malzemeleri.',
  defaultOgImage: '/brand/og-default.jpg',
  demoNotice: 'Statik önizleme — ürünler ve fiyatlar örnek envanterden alınmıştır.',
  pageSize: 24,
};

/** Alt yolu içeren site içi adresi (u(...) çıktısı) mutlak adrese çevirir. */
export function absoluteUrl(path = '/') {
  if (/^https?:\/\//.test(path)) return path;
  return siteOrigin + (path.startsWith('/') ? path : `/${path}`);
}
