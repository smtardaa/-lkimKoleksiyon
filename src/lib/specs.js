/**
 * Ham alanlardan ortak `ProductSpecs` nesnesi üretir.
 * Hem demo veri dönüştürücüsü (scripts/build-demo-data.mjs) hem Shopify
 * eşleyicisi bunu kullanır; böylece filtre değerleri iki modda aynı biçimdedir.
 * Boş/bilinmeyen değerler null kalır.
 */
import { slugify } from './slug.js';

const nz = (v) => (v == null || (typeof v === 'string' && !v.trim()) ? null : v);
const num = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

export function formatDenominationValue(v) {
  if (v == null) return null;
  if (v % 1 === 0.5 && v > 1) return `${Math.floor(v)}½`;
  if (v === 0.5) return '½';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(v);
}

/**
 * @param {object} r
 * @returns {import('./types.js').ProductSpecs}
 */
export function buildSpecs(r) {
  const country = nz(r.country);
  const ruler = nz(r.ruler);
  const period = nz(r.period);
  const metal = nz(r.metal);
  const dv = num(r.denominationValue);
  const du = nz(r.denominationUnit);
  const yearFrom = num(r.yearFrom);
  const yearTo = num(r.yearTo);
  const certService = nz(r.certService);
  const certGrade = num(r.certGrade);
  const cond = nz(r.condition);
  return {
    kind: nz(r.kind),
    country,
    countrySlug: country ? slugify(country) : null,
    yearFrom,
    yearTo: yearTo && yearTo !== yearFrom ? yearTo : null,
    calendar: yearFrom ? (r.calendar === 'hicri' ? 'hicri' : 'miladi') : null,
    yearText: nz(r.yearText) ?? (yearFrom ? (yearTo && yearTo !== yearFrom ? `${yearFrom}–${yearTo}` : String(yearFrom)) : null),
    denomination: dv != null && du ? { value: dv, unit: du, unitSlug: slugify(du), label: `${formatDenominationValue(dv)} ${du}` } : null,
    emission: num(r.emission),
    ruler,
    rulerSlug: ruler ? slugify(ruler) : null,
    period,
    periodSlug: period ? slugify(period) : null,
    condition: cond ? { label: cond, slug: slugify(cond), scale: nz(r.conditionScale) } : null,
    catalogNumber: nz(r.catalogNumber),
    certification: certService ? { service: certService.toUpperCase(), grade: certGrade, label: nz(r.certNumber) } : null,
    metal,
    metalSlug: metal ? slugify(metal) : null,
  };
}
