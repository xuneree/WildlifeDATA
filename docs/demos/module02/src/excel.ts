import * as XLSX from 'xlsx';
import { fields, validateGrid } from './data.ts';
import type { RecordRow } from './data.ts';

export function readExcel(buffer: ArrayBuffer, existing: RecordRow[], labels: string[]) {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, cellNF: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Excel 中未找到工作表。');
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: true });
  const header = (grid[0] || []).map(v => String(v ?? '').trim());
  // Number identifiers with an explicit zero-padding format retain their visible zeros.
  for (const label of ['位点名称', '相机编号', '回收时段']) {
    const column = header.indexOf(label);
    if (column < 0) continue;
    for (let r = 1; r < grid.length; r++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: column })];
      if (cell?.t === 'n' && /^0+$/.test(cell.z || '')) grid[r][column] = XLSX.utils.format_cell(cell);
    }
  }
  return validateGrid(grid, existing, labels, !!workbook.Workbook?.WBProps?.date1904);
}
export function makeWorkbook(rows: RecordRow[]) {
  const sheet = XLSX.utils.aoa_to_sheet([fields.map(f => f[1]), ...rows.map(r => fields.map(([key]) => key === 'independent' && r[key] !== '' ? Number(r[key]) : r[key]))]);
  sheet['!cols'] = fields.map(([key]) => ({ wch: key === 'folder' ? 65 : key === 'file' ? 40 : 16 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '物种识别');
  return workbook;
}
export function downloadExcel(rows: RecordRow[], filename: string) {
  XLSX.writeFile(makeWorkbook(rows), filename);
}
