import { isIndependentCapture } from './data.ts';
import type { RecordRow } from './data.ts';
import { matchesSiteContext } from './locations.ts';
import type { SiteContextFilters, SiteDirectory } from './locations.ts';

export type RecordFilters = SiteContextFilters & {
  keyword?: string; species?: string; site?: string; camera?: string;
  period?: string; independentOnly?: boolean; startDate?: string; endDate?: string;
};
// Rows supplied here are already normalized with the active label mapping.
export function filterRecords(rows: RecordRow[], filters: RecordFilters, directory: SiteDirectory) {
  const query = filters.keyword?.toLocaleLowerCase().trim();
  return rows.filter(row =>
    (!query || [row.file, row.folder, row.species, row.sourceSpecies || '', row.site, row.camera].some(value => value.toLocaleLowerCase().includes(query))) &&
    (!filters.species || row.species === filters.species) &&
    (!filters.site || row.site === filters.site) && matchesSiteContext(row, filters, directory) &&
    (!filters.camera || row.camera === filters.camera) && (!filters.period || row.period === filters.period) &&
    (!filters.independentOnly || isIndependentCapture(row.independent)) &&
    (!filters.startDate || row.date >= filters.startDate) && (!filters.endDate || row.date <= filters.endDate),
  );
}
export function refineByLabel(rows: RecordRow[], label?: string) {
  return label ? rows.filter(row => row.species === label) : rows;
}
export function summarizeRecords(rows: RecordRow[]) {
  return {
    records: rows.length,
    independent: rows.filter(row => isIndependentCapture(row.independent)).length,
    sites: new Set(rows.map(row => row.site)).size,
    labels: new Set(rows.map(row => row.species)).size,
  };
}
export function summarizeLabels(rows: RecordRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = row.species;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'));
}
