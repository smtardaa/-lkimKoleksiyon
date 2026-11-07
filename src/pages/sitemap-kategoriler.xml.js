import { loadCatalog, categoryUrl, collectionUrl } from '../lib/catalog.js';
import { urlset } from '../lib/sitemap.js';

// Boş kategoriler haritaya girmez
export async function GET() {
  const c = await loadCatalog();
  return urlset([
    ...c.categories.filter((x) => x.productCount > 0).map((x) => ({ loc: categoryUrl(x.path) })),
    ...c.collections.filter((x) => x.productCount > 0).map((x) => ({ loc: collectionUrl(x.handle) })),
  ]);
}
