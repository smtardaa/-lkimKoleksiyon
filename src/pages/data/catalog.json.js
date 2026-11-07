/** Tarayıcıdaki arama, filtre, sepet ve teklif akışlarının tek veri kaynağı. */
import { loadCatalog } from '../../lib/catalog.js';
import { buildPayload } from '../../lib/catalog-payload.js';

export async function GET() {
  return new Response(JSON.stringify(buildPayload(await loadCatalog())), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
