/**
 * dist klasörünü GitHub Pages davranışına yakın biçimde yerelde sunar (bağımlılık yok).
 * - Site BASE_PATH altında çalışır; alt yol dışındaki istekler 404 alır.
 * - /sayfa → /sayfa/ yönlendirmesi, sorgu dizesi korunur; bulunamayan adres 404.html ile yanıtlanır.
 *
 * Kullanım (Git Bash): MSYS_NO_PATHCONV=1 BASE_PATH=/depo-adi PORT=5510 npm run preview
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const BASE = (process.env.BASE_PATH ?? '').trim().replace(/\/+$/, '');
const PORT = Number(process.env.PORT ?? 5510);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};

function send(res, file, status = 200) {
  res.writeHead(status, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
}

function notFound(res) {
  const page = join(DIST, '404.html');
  if (existsSync(page)) return send(res, page, 404);
  res.writeHead(404).end('404');
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://yerel');
  let path = decodeURIComponent(url.pathname);
  if (BASE) {
    if (path !== BASE && !path.startsWith(`${BASE}/`)) return notFound(res);
    path = path.slice(BASE.length) || '/';
  }
  const target = normalize(join(DIST, path));
  if (target !== DIST && !target.startsWith(DIST + sep)) return notFound(res);

  if (existsSync(target) && statSync(target).isDirectory()) {
    if (!url.pathname.endsWith('/')) {
      res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
      return undefined;
    }
    const index = join(target, 'index.html');
    return existsSync(index) ? send(res, index) : notFound(res);
  }
  return existsSync(target) ? send(res, target) : notFound(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`dist sunuluyor: http://127.0.0.1:${PORT}${BASE}/`);
});
