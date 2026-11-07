/**
 * Teklif durumu — TEK KARAR NOKTASI.
 * Bir ürünün teklife açık olması YALNIZCA `offersEnabled` alanına bağlıdır;
 * fiyatın sıfır olmasından, stok durumundan veya başlıktaki kelimelerden çıkarılmaz.
 * Sunucu ve şablonlar aynı fonksiyonu kullanır; bu dosya saf JS'tir.
 */

import { u } from '../paths.js';

/** Teklif ürünü: sabit fiyatlı satın alma kapalıdır (teklif alımı kapalı olsa bile). */
export const isOfferOnly = (p) => !!p?.offersEnabled;

const MESSAGES = {
  not_offer: 'Bu ürün teklife açık değil.',
  sold: 'Bu ürün satıldı; yeni teklif alınmıyor.',
  closed: 'Bu ürün için teklif alımı kapatıldı.',
  out_of_stock: 'Bu ürün şu anda stokta olmadığı için teklif alınmıyor.',
};

/**
 * @param {import('../types.js').Product} p
 * @returns {{accepting:boolean, code:'accepting'|'not_offer'|'sold'|'closed'|'out_of_stock', message:string|null}}
 */
export function offerStatus(p) {
  let code = 'accepting';
  if (!isOfferOnly(p)) code = 'not_offer';
  else if (p.availability?.status === 'sold') code = 'sold';
  else if (p.offersClosed) code = 'closed';
  else if (p.availability?.status !== 'in_stock') code = 'out_of_stock';
  return { accepting: code === 'accepting', code, message: MESSAGES[code] ?? null };
}

export const offerUrl = (p) => u(`/teklif-ver/${encodeURIComponent(p.handle)}`);

/** /teklif-ver listesi: yalnızca şu anda teklif kabul eden ürünler */
export const acceptingOffers = (products) => products.filter((p) => offerStatus(p).accepting);

/** Sorumluluk metni: formda ve listede aynen gösterilir. */
export const OFFER_DISCLAIMER = 'Teklifiniz işletmenin değerlendirmesine sunulur. Teklif göndermek satın alma veya rezervasyon oluşturmaz.';
