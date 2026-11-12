export const fields = [
  ['folder', '文件夹'], ['file', '文件名'], ['site', '位点'],
  ['camera', '相机编号'], ['date', '拍摄日期'], ['time', '拍摄时间'],
  ['species', '物种标签'], ['period', '回收批次'], ['independent', '独立拍摄'],
] as const;
// New downloads use canonical headers; original user workbooks remain readable.
const headerAliases: Record<string, string> = { '位点名称': '位点', '物种': '物种标签', '回收时段': '回收批次' };
export const normalizeHeader = (values: unknown[]) => values.map(value => {
  const name = String(value ?? '').trim();
  return headerAliases[name] ?? name;
});
export type DataField = typeof fields[number][0];
export type RecordRow = Record<DataField, string> & { id: string };
export type ImportIssue = { id: string; row: number; field: string; value: string; reason: string };
export type ImportPreview = { additions: RecordRow[]; duplicates: number; total: number; issues: ImportIssue[] };
export type ImportBatch = { id: string; name: string; count: number; skipped: number; time: string };
export type Dataset = { rows: RecordRow[]; history: ImportBatch[] };
export const storageKey = 'wildlifedata-module02-demo-v1';
export const recordKey = (r: Pick<RecordRow, 'folder' | 'file' | 'species'>) => JSON.stringify([r.folder, r.file, r.species]);
// Excel import contract: 1 is independent; 0 and blank are non-independent.
export const isIndependentCapture = (value: string) => value === '1';
export const sameRecord = (a: RecordRow, b: RecordRow) => fields.every(([key]) => a[key] === b[key]);
export const uniqueValues = (rows: RecordRow[], field: DataField) => [...new Set(rows.map(r => r[field]))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function dateText(value: unknown, date1904 = false): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const days = Math.floor(value);
    if (!date1904 && days === 60) return '1900-02-29';
    if (days < 0 || days > 2958465) return String(value);
    const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, days < 60 ? 31 : 30);
    return new Date(epoch + days * 86400000).toISOString().slice(0, 10);
  }
  return String(value ?? '').trim().replace(/\//g, '-').replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (_, y, m, d) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
}
export function timeText(value: unknown): string {
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const seconds = Math.round(value * 86400) % 86400;
    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  }
  const text = String(value ?? '').trim();
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(text) ? text.split(':').concat(text.split(':').length === 2 ? ['00'] : []).map(n => n.padStart(2, '0')).join(':') : text;
}
export function validateGrid(grid: unknown[][], existing: RecordRow[], knownLabels: string[], date1904 = false): ImportPreview {
  const header = normalizeHeader(grid[0] || []);
  const missing = fields.filter(([, label]) => !header.includes(label)).map(f => f[1]);
  if (missing.length) throw new Error(`缺少表头：${missing.join('、')}。请使用导入模板。`);
  if (new Set(header.filter(Boolean)).size !== header.filter(Boolean).length) throw new Error('表头名称重复（包括同一字段的新旧名称），请每个字段只保留一列。');
  const additions: RecordRow[] = [], issues: ImportIssue[] = [];
  const seen = new Map(existing.map(r => [recordKey(r), r]));
  let duplicates = 0, total = 0;
  for (let i = 1; i < grid.length; i++) {
    const line = grid[i];
    if (!line || line.every(v => v === '' || v == null)) continue;
    total++;
    const row = Object.fromEntries(fields.map(([key, label]) => [key, String(line[header.indexOf(label)] ?? '').trim()])) as RecordRow;
    row.date = dateText(line[header.indexOf('拍摄日期')], date1904);
    row.time = timeText(line[header.indexOf('拍摄时间')]);
    row.id = `record-${crypto.randomUUID()}`;
    const addIssue = (field: string, value: string, reason: string) => issues.push({ id: `${i}-${issues.length}`, row: i + 1, field, value, reason });
    for (const [key, label] of fields) if (key !== 'independent' && !row[key]) addIssue(label, '', '不能为空');
    if (row.date && !validDate(row.date)) addIssue('拍摄日期', row.date, '日期无效，请使用 YYYY-MM-DD 或 Excel 日期');
    if (row.time && !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(row.time)) addIssue('拍摄时间', row.time, '时间无效，请使用 HH:mm:ss');
    if (row.period && !/^\d{4}(0[1-9]|1[0-2])$/.test(row.period)) addIssue('回收批次', row.period, '请使用 YYYYMM');
    if (!['', '0', '1'].includes(row.independent)) addIssue('独立拍摄', row.independent, '仅支持 1、0 或空值');
    if (row.species && !knownLabels.includes(row.species)) addIssue('物种标签', row.species, '未识别标签，请先核对物种字典');
    const previous = seen.get(recordKey(row));
    if (previous) {
      if (sameRecord(previous, row)) duplicates++;
      else addIssue('记录冲突', row.file, '相同文件路径与物种的记录内容不同，请核对；不会覆盖原记录');
    } else { seen.set(recordKey(row), row); additions.push(row); }
  }
  if (!total) throw new Error('工作表中没有可导入的数据。');
  return { additions, duplicates, total, issues };
}
export function loadDataset(seed: RecordRow[]): Dataset {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && Array.isArray(saved.rows) && saved.rows.every((r: RecordRow) => typeof r.id === 'string' && fields.every(([k]) => typeof r[k] === 'string')) && Array.isArray(saved.history)) {
      return { rows: saved.rows, history: saved.history.map((h: ImportBatch, i: number) => ({ ...h, id: h.id || `old-${i}` })) };
    }
  } catch { /* An unavailable or invalid cache does not discard the supplied seed. */ }
  return { rows: seed, history: [] };
}
export function persistDataset(dataset: Dataset) {
  // Persist once before updating UI: a storage failure must not be reported as success.
  localStorage.setItem(storageKey, JSON.stringify(dataset));
}
