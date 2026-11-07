/**
 * Yayın çıktısında gizli değer ve kişisel bilgi taraması.
 *
 * Tek istisna: Yayın adresinin kendisi. GitHub Pages adresi depo sahibinin kullanıcı adını içerir
 * (https://kullanici.github.io) ve canonical, Open Graph, JSON-LD ve sitemap'te her sayfada bulunmak
 * zorundadır. Bu yüzden yalnızca “kişisel bilgi” kuralında ve yalnızca adresin TAM hali taramadan çıkarılır.
 * Kullanıcı adı başka bir bağlamda (e-posta, düz metin, başka bir alan adı) geçerse hata verir.
 */
export const SECRET_RULES = [
  { re: /shpat_[a-z0-9]+/i, name: 'Shopify Admin token' },
  { re: /\bre_[A-Za-z0-9]{16,}/, name: 'Resend anahtarı' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, name: 'özel anahtar' },
  { re: /\b(SHOPIFY_[A-Z_]+|OFFER_[A-Z_]+)\b/, name: 'ortam değişkeni adı' },
  { re: /merchant_(key|salt)/i, name: 'PayTR anahtarı' },
  { re: /smtardaa|foren@|[A-Z]:\\+Users\\+/i, name: 'kişisel bilgi', allowSiteUrl: true },
  { re: /eskiparamarket/i, name: 'kaynak site kaydı' },
];

/** İstisna yalnızca yol, sorgu veya kullanıcı bilgisi içermeyen yalın bir adres için geçerlidir. */
const isBareOrigin = (site) => /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(site ?? '');

/**
 * @param {string} text taranacak içerik
 * @param {string} [site] yayın adresi, ör. https://kullanici.github.io
 * @returns {string[]} eşleşen kuralların adları
 */
export function findSecrets(text, site) {
  const withoutSite = isBareOrigin(site) ? text.split(site).join('') : text;
  return SECRET_RULES
    .filter(({ re, allowSiteUrl }) => re.test(allowSiteUrl ? withoutSite : text))
    .map(({ name }) => name);
}
