/**
 * İŞLETME BİLGİLERİ — TEK MERKEZ
 * ------------------------------------------------------------------
 * Bu dosyadaki bütün değerler İlkim Koleksiyon tarafından doğrulanıp
 * doldurulmalıdır. Bilinmeyen değerler bilerek `null` bırakılmıştır.
 *
 * - `null` olan alanlar sitede gösterilmez ya da “Doldurulacak” etiketiyle
 *   gösterilir (yalnızca bilgi sayfalarında, iskelet olduğunu belirtmek için).
 * - Telefon/WhatsApp/e-posta boşken bağlantı ÜRETİLMEZ.
 * - Organization yapılandırılmış verisine yalnızca dolu alanlar girer.
 *
 * Hiçbir değeri tahminle doldurmayın.
 */
export const business = {
  /** Marka adı (logoda yazan ad). */
  brandName: 'İlkim Koleksiyon',

  /** Ticari unvan, vergi dairesi/no, MERSİS — mesafeli satış sözleşmesi için gerekli. */
  legal: {
    companyTitle: null, // örn. “… Ltd. Şti.” — Doldurulacak
    taxOffice: null,
    taxNumber: null,
    mersisNumber: null,
    tradeRegistryNumber: null,
    kepAddress: null,
  },

  contact: {
    /** E.164 biçiminde: '+905xxxxxxxxx' */
    phone: null,
    /** Yalnızca rakamlar, ülke koduyla: '905xxxxxxxxx'. Boşsa WhatsApp bağlantısı gösterilmez. */
    whatsapp: null,
    email: null,
    /** Açık adres (fiziksel mağaza varsa). */
    address: null,
    city: null,
    district: null,
    postalCode: null,
    /** Harita bağlantısı (isteğe bağlı) */
    mapUrl: null,
    /** Çalışma saatleri, ör. [{ days: 'Pazartesi–Cuma', hours: '10:00–18:00' }] */
    openingHours: [],
  },

  /** Sosyal hesaplar — yalnızca gerçek hesap adresleri girilmeli. */
  social: {
    instagram: null,
    facebook: null,
    youtube: null,
    x: null,
    tiktok: null,
  },

  /** Ticari koşullar — kargo/iade sayfaları ve ürün detayındaki teslimat kutusu buradan beslenir. */
  commerce: {
    /** Kargo firması/firmaları */
    carriers: null,
    /** Kargo bedeli metni, ör. '₺… (… ₺ üzeri ücretsiz)' */
    shippingFee: null,
    /** Kargoya teslim süresi, ör. '… iş günü' */
    dispatchTime: null,
    /** Teslimat bölgesi, ör. 'Türkiye geneli' */
    shippingRegions: null,
    /** Paketleme bilgisi */
    packaging: null,
    /** Cayma/iade süresi ve koşulları — hukuki danışmanla birlikte yazılmalı */
    returnPolicySummary: null,
    /** Kabul edilen ödeme yöntemleri (Shopify Checkout'ta etkinleştirilenler) */
    paymentMethods: null,
    /** Fatura bilgisi (e-arşiv vb.) */
    invoiceInfo: null,
  },

  /**
   * İletişim formu gönderim adresi (ör. bir form servisi veya kendi API ucu).
   * `null` iken form devre dışı gösterilir ve gönderim başarılı mesajı VERİLMEZ.
   */
  contactFormEndpoint: null,

  /** Hakkımızda sayfasındaki işletmeye özgü bilgiler. */
  about: {
    foundedYear: null,
    founderNames: null,
    storeStory: null,
    expertise: null,
  },
};

/** Değer dolu mu? (boş dizi/obje/string de boş sayılır) */
export function filled(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export const PLACEHOLDER = 'Doldurulacak';

export function whatsappUrl() {
  const n = business.contact.whatsapp;
  if (!filled(n) || !/^\d{10,15}$/.test(n)) return null;
  return `https://wa.me/${n}`;
}

export function phoneUrl() {
  const p = business.contact.phone;
  if (!filled(p) || !/^\+\d{10,15}$/.test(p)) return null;
  return `tel:${p}`;
}

export function emailUrl() {
  const e = business.contact.email;
  if (!filled(e) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return null;
  return `mailto:${e}`;
}

export function socialLinks() {
  const labels = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', x: 'X', tiktok: 'TikTok' };
  return Object.entries(business.social)
    .filter(([, url]) => filled(url) && /^https:\/\//.test(url))
    .map(([key, url]) => ({ key, label: labels[key] ?? key, url }));
}
