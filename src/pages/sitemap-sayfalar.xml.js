import { urlset } from '../lib/sitemap.js';
import { u } from '../lib/paths.js';

const PAGES = ['/', '/urunler', '/kategori', '/koleksiyonlar', '/yeni-gelenler', '/teklif-ver', '/hakkimizda', '/iletisim', '/koleksiyon-rehberi', '/sss'];

export function GET() {
  return urlset(PAGES.map((p) => ({ loc: u(p) })));
}
