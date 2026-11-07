/**
 * robots.txt: önizleme arama motorlarına kapalıdır (sayfalardaki noindex ile birlikte).
 * Not: Proje sitesinde bu dosya /depo-adi/robots.txt adresindedir ve tarayıcılar yalnızca alan
 * kökündeki robots.txt dosyasını okur; orada asıl koruma her sayfadaki noindex etiketidir.
 */
export function GET() {
  return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
