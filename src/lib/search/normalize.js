/**
 * Türkçe arama normalizasyonu.
 * - Türkçe büyük/küçük harf dönüşümü (İ→i, I→ı) dil kurallarına göre yapılır,
 *   ardından eşleşme için aksanlar katlanır (ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c, â→a…).
 * - Sayı yazımları birleştirilir: “1.000.000”, “1 000 000”, “1,000,000” → “1000000”;
 *   “2½” / “2 ½” / “2,5” → “2.5”.
 * - Katalog numaraları: “P-173a”, “Pick 173A”, “P173a” → “p173a”.
 * Hem indeksleme hem sorgu aynı fonksiyonlardan geçer; davranış tutarlıdır.
 */

const FOLD = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u', é: 'e', è: 'e', ë: 'e', á: 'a', à: 'a', ä: 'a', ã: 'a', í: 'i', ó: 'o', ô: 'o', õ: 'o', ú: 'u', ñ: 'n', ß: 'ss', ø: 'o', å: 'a', æ: 'ae', œ: 'oe' };

export function trLower(s) {
  return String(s ?? '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');
}

export function fold(s) {
  return trLower(s)
    .normalize('NFC')
    .replace(/[ışğüöçâîûéèëáàäãíóôõúñßøåæœ]/g, (c) => FOLD[c] ?? c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Sayı yazımlarını tekilleştirir. */
export function normalizeNumbers(s) {
  return s
    // 2½, 2 ½ → 2.5 ; tek başına ½ → 0.5
    .replace(/(\d+)\s*½/g, (_, n) => `${n}.5`)
    .replace(/½/g, '0.5')
    // 2,5 (ondalık) → 2.5  (yalnızca virgülden sonra 1-2 hane varsa)
    .replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2')
    // Binlik ayırıcılar: 1.000.000 / 1,000,000 / 1 000 000 → 1000000
    .replace(/\b\d{1,3}(?:[.,\s]\d{3})+\b/g, (m) => m.replace(/[.,\s]/g, ''));
}

/** Katalog numarası biçimlerini birleştirir: “Pik P-173a” → “p173a”. */
export function normalizeCatalog(s) {
  return s
    .replace(/\bpick\s*no\.?\s*/g, 'p')
    .replace(/\b(?:pik|pick)\s*(?:p\s*[-.]?\s*)?(\d)/g, 'p$1')
    .replace(/\bp\s*[-.]?\s*(\d+[a-z]?)\b/g, 'p$1')
    .replace(/\bkm\s*#?\s*[-.]?\s*(\d+)/g, 'km$1');
}

/** Metni karşılaştırılabilir hale getirir. */
export function normalizeText(s) {
  let t = fold(s);
  t = normalizeNumbers(t);
  t = normalizeCatalog(t);
  t = t.replace(/[^\p{L}\p{N}.\/\s]/gu, ' ') // noktalama → boşluk (ondalık nokta ve / korunur)
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')    // sayı dışındaki noktalar
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

/** Eş anlamlılar: sorgu terimi → eklenecek alternatifler (hepsi normalize). */
const SYNONYMS = {
  ytl: ['yeni turk lirasi'],
  tl: ['lira'],
  lira: ['tl'],
  banknot: ['kagit'],
  kagit: ['banknot'],
  sikke: ['madeni'],
  madeni: ['sikke'],
  sertifikali: ['pmg', 'ngc', 'pcgs', 'sertifika'],
  osmanli: ['osmanli'],
  abd: ['amerika'],
  amerika: ['abd'],
  ingiltere: ['birlesik krallik'],
  gumus: ['gumus', 'ag'],
  altin: ['altin'],
  cil: ['10/10', 'unc'],
  unc: ['10/10', 'cil'],
};

/**
 * Sorguyu terimlere böler. “yeni türk lirası” gibi çok kelimeli eş anlamlılar
 * “ytl” terimine de genişletilir.
 * @returns {{ terms: string[][], raw: string }} — her terim için kabul edilen alternatifler
 */
export function parseQuery(q) {
  const norm = normalizeText(q ?? '');
  if (!norm) return { terms: [], raw: '' };
  let text = norm.replace(/\byeni turk lirasi\b/g, 'ytl');
  const tokens = text.split(' ').filter(Boolean);
  const terms = tokens.map((t) => [t, ...(SYNONYMS[t] ?? [])]);
  return { terms, raw: norm };
}
