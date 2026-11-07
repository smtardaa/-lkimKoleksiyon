import { fold } from './search/normalize.js';

/** Türkçe metinden URL/filtre tanıtıcısı üretir: “Çekya / Çekoslovakya” → “cekya-cekoslovakya” */
export function slugify(s) {
  return fold(s ?? '')
    .replace(/½/g, '-5')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Türkçe harf içermeyen ama Türkçe olan, büyük “I” barındıran sık kelimeler
const TR_WORDS = new Set([
  'YIL', 'YILI', 'MISIR', 'KIBRIS', 'IRAK', 'ALTIN', 'KIZIL', 'BAKIR', 'HATIRA', 'PARASI', 'ANKARANIN', 'BATI',
  'ADALARI', 'KIRMIZI', 'SARI', 'ARALIK', 'TARIHI', 'SAYISI', 'TAKIMI', 'KIRIK', 'ORJINAL', 'BASKI', 'KALIP',
  'NADIR', 'MAKAMI', 'KAPAKLI', 'AYRI', 'ALBUM', 'DARPHANESI', 'ASKERI', 'HALKI', 'ADASI', 'KUTU', 'KITI', 'IRLANDA', 'ALTI', 'ÇILALTI', 'KALITE', 'DOKUZ', 'OTUZ', 'HAYKIRIŞ',
]);
const ROMAN = /^(I{1,3}|IV|V|VI{1,3}|IX|X{1,3})\.?$/;

/**
 * Büyük harfli kaynak metni başlık biçimine çevirir.
 * Büyük “I”, Türkçe bir kelimedeyse “ı”, yabancı kelimedeyse (Bolivianos, Cedis) “i” olur.
 */
export function titleCaseTr(s) {
  return String(s ?? '').split(/(\s+|[\/(),-])/).map((w) => {
    if (!w || /^\s+$/.test(w) || /^[\/(),-]$/.test(w)) return w;
    if (ROMAN.test(w)) return w;
    const turkish = /[İŞĞÜÖÇ]/.test(w) || TR_WORDS.has(w.replace(/[^A-ZÇĞİÖŞÜI]/g, ''));
    const lower = turkish
      ? w.toLocaleLowerCase('tr-TR')
      : w.replace(/İ/g, 'i').toLowerCase();
    return lower.replace(/^(\p{L})/u, (c) => c.toLocaleUpperCase(turkish ? 'tr-TR' : 'en'));
  }).join('');
}
