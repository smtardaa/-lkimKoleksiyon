/**
 * Alt yol desteği. Bütün iç adresler buradan geçer; alt yol koda yazılmaz,
 * derleme ortamındaki BASE_PATH değerinden (Astro `base`) gelir.
 * Hem sunucu tarafı derlemede hem tarayıcıda çalışır.
 */

/** @param {string} base ör. "/depo-adi" veya "" */
export function createPaths(base) {
  const root = String(base ?? '').replace(/\/+$/, '');
  /**
   * Site içi yolu yayın adresine çevirir: u('/urunler?tur=madeni') → '/depo/urunler/?tur=madeni'.
   * Dosya olmayan yollara sondaki eğik çizgi eklenir (dist'teki dizin biçimi).
   */
  const u = (path) => {
    const [, pathname, suffix = ''] = String(path).match(/^([^?#]*)(.*)$/);
    const last = pathname.split('/').pop();
    const clean = pathname.endsWith('/') || last.includes('.') ? pathname : `${pathname}/`;
    return `${root}${clean}${suffix}`;
  };
  return { base: root, u };
}

const env = import.meta.env ?? {};
const paths = createPaths(env.BASE_URL ?? '');

export const BASE = paths.base;
export const u = paths.u;
