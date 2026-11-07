// @ts-check
import { defineConfig } from 'astro/config';

// Statik önizleme sürümü. Bütün sayfalar derleme sırasında dosya olarak üretilir; sunucu yoktur.
//
// SITE_URL  : sitenin kökü (origin), ör. https://kullanici.github.io
// BASE_PATH : alt yol, ör. /depo-adi. Kullanıcı sitesinde (kullanici.github.io) boş bırakılır.
// GitHub Actions bu değerleri actions/configure-pages çıktısından verir; alt yol koda yazılmaz.
const SITE_URL = process.env.SITE_URL || 'http://localhost:5510';
const BASE_PATH = (process.env.BASE_PATH ?? '').trim().replace(/\/+$/, '');

if (BASE_PATH && !BASE_PATH.startsWith('/')) {
  throw new Error(`BASE_PATH "/" ile başlamalı, gelen değer: ${BASE_PATH}. Git Bash kullanıyorsanız MSYS_NO_PATHCONV=1 ekleyin.`);
}

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH || undefined,
  output: 'static',
  // /urunler/ → urunler/index.html: GitHub Pages'te yönlendirmesiz ve sorgu dizesini koruyan tek biçim
  trailingSlash: 'always',
  build: { format: 'directory' },
  server: { port: 5510, host: '127.0.0.1' },
  devToolbar: { enabled: false },
});
