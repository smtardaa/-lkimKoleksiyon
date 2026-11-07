/**
 * Teklif formu doğrulaması — tarayıcı ve sunucu AYNI kuralları kullanır.
 * Tarayıcıdaki sonuç yalnızca kolaylık içindir; karar sunucudadır.
 * Saf JS: Node'a özgü modül içe aktarmaz.
 */
export const OFFER_LIMITS = {
  nameMin: 3,
  nameMax: 100,
  emailMax: 254,
  phoneMinDigits: 10,
  phoneMaxDigits: 15,
  messageMax: 1000,
  amountMax: 100_000_000, // yazım hatalarını yakalamak için üst sınır (₺)
};

/** Kontrol karakterlerini atar, boşlukları sadeleştirir. */
const cleanLine = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
const cleanText = (v) => String(v ?? '')
  .replace(/\r\n?/g, '\n')
  .replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

/**
 * Türkçe yazımdaki tutarı sayıya çevirir: “12.500”, “12.500,50”, “12500,5”, “₺1.000 TL”.
 * Belirsiz veya bozuk yazımda null döner (tahmin edilmez).
 * @returns {number|null}
 */
export function parseAmount(input) {
  const raw = String(input ?? '').replace(/ /g, ' ').trim().replace(/\s*(₺|tl|try)\s*/gi, '').replace(/\s+/g, '');
  if (!raw) return null;
  let intPart;
  let decPart = '';
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw)) { // 12.500 · 1.250.000,50
    [intPart, decPart = ''] = raw.replace(/\./g, '').split(',');
  } else if (/^\d+,\d{1,2}$/.test(raw) || /^\d+\.\d{1,2}$/.test(raw)) { // 12500,5 · 12500.50
    [intPart, decPart] = raw.split(/[.,]/);
  } else if (/^\d+$/.test(raw)) {
    intPart = raw;
  } else {
    return null;
  }
  const n = Number(`${intPart}.${decPart || '0'}`);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} input ham form alanları
 * @returns {{ok:boolean, errors:Record<string,string>, values:{name:string,email:string,phone:string|null,amount:number|null,message:string|null}}}
 */
export function validateOffer(input) {
  const L = OFFER_LIMITS;
  const errors = {};
  const name = cleanLine(input?.name);
  const email = cleanLine(input?.email).toLowerCase();
  const phone = cleanLine(input?.phone);
  const message = cleanText(input?.message);
  const amount = parseAmount(input?.amount);

  if (!name) errors.name = 'Ad soyad zorunludur.';
  else if (name.length < L.nameMin || !/\p{L}/u.test(name)) errors.name = 'Geçerli bir ad soyad yazın.';
  else if (name.length > L.nameMax) errors.name = `Ad soyad en fazla ${L.nameMax} karakter olabilir.`;

  if (!email) errors.email = 'E-posta adresi zorunludur.';
  else if (email.length > L.emailMax || !/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(email)) errors.email = 'Geçerli bir e-posta adresi yazın (ör. ad@alanadi.com).';

  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (!/^[+\d\s().-]+$/.test(phone) || digits.length < L.phoneMinDigits || digits.length > L.phoneMaxDigits) {
      errors.phone = 'Geçerli bir telefon numarası yazın veya bu alanı boş bırakın.';
    }
  }

  if (!String(input?.amount ?? '').trim()) errors.amount = 'Teklif tutarı zorunludur.';
  else if (amount == null) errors.amount = 'Tutarı rakamla yazın (ör. 12.500 veya 12500,50).';
  else if (amount <= 0) errors.amount = 'Teklif tutarı sıfırdan büyük olmalıdır.';
  else if (amount > L.amountMax) errors.amount = 'Teklif tutarı çok yüksek görünüyor; lütfen kontrol edin.';

  if (message.length > L.messageMax) errors.message = `Mesaj en fazla ${L.messageMax} karakter olabilir.`;

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values: { name, email, phone: phone || null, amount, message: message || null },
  };
}
