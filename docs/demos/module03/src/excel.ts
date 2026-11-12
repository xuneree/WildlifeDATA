import * as XLSX from 'xlsx';
import {fields,normalizeHeader,validateGrid} from './data.ts';
import type {RecordRow} from './data.ts';
export function readExcel(buffer:ArrayBuffer,existing:RecordRow[]){
 const workbook=XLSX.read(buffer,{type:'array',cellDates:false,cellNF:true});
 const sheet=workbook.Sheets[workbook.SheetNames[0]];
 if(!sheet)throw new Error('Excel 中未找到工作表。');
 const grid=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',blankrows:true});
 const header=normalizeHeader(grid[0]||[]);
 for(const label of ['位点','相机编号','个体编号','回收批次']){
  const c=header.indexOf(label);if(c<0)continue;
  for(let r=1;r<grid.length;r++){const cell=sheet[XLSX.utils.encode_cell({r,c})];if(cell?.t==='n'&&/^0+$/.test(cell.z||''))grid[r][c]=XLSX.utils.format_cell(cell);}
 }
 return validateGrid(grid,existing,!!workbook.Workbook?.WBProps?.date1904);
}
export function makeWorkbook(rows:RecordRow[]){
 const sheet=XLSX.utils.aoa_to_sheet([fields.map(f=>f[1]),...rows.map(r=>fields.map(([key])=>key==='quantity'?Number(r[key]):key==='independent'&&r[key]!==''?Number(r[key]):r[key]))]);
 sheet['!cols']=fields.map(([k])=>({wch:k==='folder'?65:k==='file'?40:18}));
 const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'个体识别');return workbook;
}
export function downloadExcel(rows:RecordRow[],filename:string){XLSX.writeFile(makeWorkbook(rows),filename);}
