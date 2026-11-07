// Gizli değer taraması testleri — `npm test`
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { findSecrets } from '../scripts/secret-scan.mjs';

const SITE = 'https://smtardaa.github.io';
const has = (text, name, site = SITE) => findSecrets(text, site).includes(name);

describe('yayın adresi istisnası', () => {
  test('yayın adresi tek başına uyarı vermez (GitHub Actions hatasının gerileme testi)', () => {
    const samples = [
      `<link rel="canonical" href="${SITE}/-lkimKoleksiyon/sss/">`,
      `<meta property="og:image" content="${SITE}/-lkimKoleksiyon/brand/og-default.jpg">`,
      `<loc>${SITE}/-lkimKoleksiyon/urun/x/</loc>`,
      `{"item":"${SITE}/-lkimKoleksiyon/"}`,
      'const e={BASE_URL:`/-lkimKoleksiyon/`,SITE:`https://smtardaa.github.io`,SSR:!1}',
    ];
    for (const s of samples) assert.deepEqual(findSecrets(s, SITE), [], s);
  });
  test('kullanıcı adı adres dışında geçerse yine yakalanır', () => {
    for (const s of ['smtardaa1905@gmail.com', 'İletişim: smtardaa', 'github.com/smtardaa/depo', `${SITE}/ smtardaa`, 'https://smtardaa.github.com/x']) {
      assert.ok(has(s, 'kişisel bilgi'), s);
    }
  });
  test('adres listesi dışındaki site adresi istisna sayılmaz', () => {
    assert.ok(has(`<a href="${SITE}/">`, 'kişisel bilgi', 'https://kullanici.github.io'));
    assert.ok(findSecrets(`<a href="${SITE}/">`).includes('kişisel bilgi'), 'yayın adresi verilmezse istisna yoktur');
  });
  test('yalın olmayan adres istisnayı açmaz', () => {
    const site = `${SITE}/?token=smtardaa`;
    assert.ok(has(`<a href="${site}">`, 'kişisel bilgi', site));
  });
  test('istisna diğer kuralları etkilemez', () => {
    assert.ok(has(`${SITE}/shpat_abc123`, 'Shopify Admin token'));
    assert.ok(has(`${SITE}/eskiparamarket`, 'kaynak site kaydı'));
  });
});

describe('gizli değer kuralları', () => {
  test('her kural gerçek örneği yakalar', () => {
    const cases = [
      ['shpat_0123456789abcdef', 'Shopify Admin token'],
      ['re_AbCdEfGh1234567890', 'Resend anahtarı'],
      ['-----BEGIN RSA PRIVATE KEY-----', 'özel anahtar'],
      ['SHOPIFY_STOREFRONT_PRIVATE_TOKEN', 'ortam değişkeni adı'],
      ['OFFER_EMAIL_API_KEY', 'ortam değişkeni adı'],
      ['merchant_salt', 'PayTR anahtarı'],
      ['foren@example.com', 'kişisel bilgi'],
      ['C:\\Users\\foren\\Desktop', 'kişisel bilgi'],
      ['C:\\\\Users\\\\foren', 'kişisel bilgi'],
      ['https://eskiparamarket.com/urun', 'kaynak site kaydı'],
    ];
    for (const [text, name] of cases) assert.ok(has(text, name), text);
  });
  test('herkese açık politika metinleri uyarı vermez', () => {
    for (const s of ['Gizlilik ve KVKK aydınlatma metni', 'Çerez politikası', 'ilkim.cart.v1', 'Geçerli bir e-posta adresi yazın (ör. ad@alanadi.com).']) {
      assert.deepEqual(findSecrets(s, SITE), [], s);
    }
  });
});
