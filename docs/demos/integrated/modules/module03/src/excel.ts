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
 const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'个体识别');
 const instructions=[
 ['字段','说明'],
 ['个体编号','附件“个体编号复核”为已复核后的编号。unknown_individual 或空值表示未知，不创建虚拟档案；其他编号完整保留。'],
 ['识别人 / 复核人','识别人为原标注人；缺少复核人或为空时填 CS。复核状态与复核人分开保存。'],
 ['复核状态','reviewed=已复核，unreviewed=未复核。无该列时：个体编号复核表头表示已复核，普通个体编号表头为未复核。'],
 ['视频中豹个体数量','整段视频中豹的数量，不是本行个体数量，也不是可求和的独立个体数。'],
 ['可识别性','1=可识别，2=不可识别，3=待识别'],
 ['是否成年','1=成年，2=未成年，3=无法确认。仅为此次拍摄观察，不推算出生年份。'],
 ['性别','M=雄性，F=雌性，U=未知。此次观察不直接覆盖个体档案。'],
 ['角度','左、右、正、背；多角度用“、”连接。'],
 ['多只豹情况下的行为','1=育幼，2=兄弟姐妹，3=一公一母尾随，4=交配，5=未知关系同框，-=不适用；空值保留。'],
 ['繁殖情况','否或繁殖数量；不据此创建繁殖事件。'],
 ['个体独立拍摄','针对同一只豹连续拍摄的首张标 1；0 和空值原样保留，不写入文件级/物种级独立标记。'],
 ['拍摄日期可能有误','1=可能有误；空值不等于已确认日期正确。'],
 ['校正后拍摄日期','只提供日期校正；筛选日期优先采用此列，保留原始拍摄日期与拍摄时间。不伪造新的校正时刻或时区。'],
 ['上一次拍摄时间','原表的辅助计算值，00:00:00 也保留；不据此推算日期、上一次媒体或独立事件。'],
 ['确信度','A、B 等原始分级保留；不换算为数值概率。'],
 ['复核备注 / 备注','分别保留，导出保留全部 26 个源字段，加复核人和复核状态。'],
 ];
 const guide=XLSX.utils.aoa_to_sheet(instructions);guide['!cols']=[{wch:28},{wch:115}];XLSX.utils.book_append_sheet(workbook,guide,'字段说明');return workbook;
}
export function downloadExcel(rows:RecordRow[],filename:string){XLSX.writeFile(makeWorkbook(rows),filename);}
