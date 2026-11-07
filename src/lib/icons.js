/** Satır içi SVG ikonlar. Derlenen sayfalar ve tarayıcıda çizilen listeler aynı kaynağı kullanır. */
const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M12 20s-7-4.4-9.2-8.7C1.3 8.2 3 4.8 6.3 4.5c2-.2 3.6.9 4.6 2.3h2.2c1-1.4 2.6-2.5 4.6-2.3 3.3.3 5 3.7 3.5 6.8C19 15.6 12 20 12 20Z"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1.2-1.2 1.8.8c-.2 1-1 1.7-2 1.7-3.4 0-6.8-3.4-6.8-6.8 0-1 .7-1.8 1.7-2l.8 1.8L9 9.5Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
};

export function iconSvg(name, cls = 'icon', size) {
  const dim = size ? ` width="${size}" height="${size}"` : '';
  return `<svg class="${cls}"${dim} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name] ?? ''}</svg>`;
}
