import { loadCatalog, productUrl } from '../lib/catalog.js';
import { urlset } from '../lib/sitemap.js';

export async function GET() {
  const c = await loadCatalog();
  return urlset(c.products.map((p) => ({
    loc: productUrl(p),
    images: p.images.map((i) => ({ loc: i.src })),
  })));
}
