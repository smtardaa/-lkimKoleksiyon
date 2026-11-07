/** Site haritası yardımcıları. `loc` değerleri alt yolu içeren adreslerdir. */
import { absoluteUrl } from '../config/site.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** @param {{loc:string, lastmod?:string|null, images?:{loc:string,title?:string}[]}[]} urls */
export function urlset(urls) {
  const body = urls.map((u) => {
    const img = (u.images ?? []).slice(0, 5).map((i) => `\n    <image:image><image:loc>${esc(absoluteUrl(i.loc))}</image:loc></image:image>`).join('');
    return `  <url><loc>${esc(absoluteUrl(u.loc))}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ''}${img}</url>`;
  }).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}

