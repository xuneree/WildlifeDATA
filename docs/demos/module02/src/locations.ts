import type { RecordRow } from './data.ts';

export type SiteContextFilters = { region?: string; locality?: string; project?: string };
export type SiteContext = { id: string; code: string; region: string; locality: string; projectIds: string[] };
export type SiteDirectory = { sites: SiteContext[]; projects: { id: string; name: string }[] };

// The isolated demo has one site-code namespace; production must resolve stable IDs
// within the authorized work group before applying these associations.
export function siteForRecord(row: RecordRow, directory: SiteDirectory) {
  const matches = directory.sites.filter(site => site.code === row.site);
  return matches.length === 1 ? matches[0] : undefined;
}
export function matchesSiteContext(row: RecordRow, filters: SiteContextFilters, directory: SiteDirectory) {
  if (!filters.region && !filters.locality && !filters.project) return true;
  const site = siteForRecord(row, directory);
  return !!site && (!filters.region || site.region === filters.region) &&
    (!filters.locality || site.locality === filters.locality) &&
    (!filters.project || site.projectIds.includes(filters.project));
}
export function siteContextOptions(rows: RecordRow[], directory: SiteDirectory) {
  const associated = new Map<string, SiteContext>();
  for (const row of rows) {
    const site = siteForRecord(row, directory);
    if (site) associated.set(site.id, site);
  }
  const sites = [...associated.values()];
  const strings = (values: string[]) => [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN')).map(value => ({ value, label: value }));
  const projectIds = new Set(sites.flatMap(site => site.projectIds));
  return {
    regions: strings(sites.map(site => site.region)),
    localities: strings(sites.map(site => site.locality)),
    projects: directory.projects.filter(project => projectIds.has(project.id))
      .map(project => ({ value: project.id, label: project.name })),
  };
}
