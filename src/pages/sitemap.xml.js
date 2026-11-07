/** sitemap.xml — derlemede üretilen site haritası dizini. */
import { absoluteUrl } from '../config/site.js';
import { u } from '../lib/paths.js';

export function GET() {
  const parts = ['/sitemap-sayfalar.xml', '/sitemap-kategoriler.xml', '/sitemap-urunler.xml'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${parts.map((p) => `  <sitemap><loc>${absoluteUrl(u(p))}</loc></sitemap>`).join('\n')}
</sitemapindex>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
