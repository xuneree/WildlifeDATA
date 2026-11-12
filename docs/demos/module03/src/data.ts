export const fields = [
 ['folder','文件夹'],['file','文件名'],['camera','相机编号'],['site','位点'],
 ['date','拍摄日期'],['time','拍摄时间'],['quantity','数量'],['position','位置描述'],
 ['identifiable','可识别'],['angle','角度'],['adult','是否成体'],['sex','性别'],
 ['individual','个体编号'],['injury','受伤情况'],['multiBehavior','多只豹情况下的行为'],
 ['reproduction','繁殖情况'],['behavior','行为'],['observer','识别人'],['confidence','确信度'],
 ['notes','备注'],['period','回收批次'],['independent','独立拍摄'],
] as const;
export type DataField=typeof fields[number][0];
export type RecordRow=Record<DataField,string>&{id:string};
export type ImportIssue={id:string;row:number;field:string;value:string;reason:string};
export type ImportPreview={additions:RecordRow[];duplicates:number;total:number;issues:ImportIssue[]};
export type ImportBatch={id:string;name:string;count:number;skipped:number;time:string};
export type Dataset={rows:RecordRow[];history:ImportBatch[]};
export const storageKey='wildlifedata-module03-demo-v1';
export const normalizeHeader=(values:unknown[])=>values.map(v=>{const s=String(v??'').trim();return ({'位点名称':'位点','数据期号':'回收批次'} as Record<string,string>)[s]||s;});
export const uniqueValues=(rows:RecordRow[],field:DataField)=>[...new Set(rows.map(r=>r[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
export const fingerprint=(row:RecordRow)=>JSON.stringify(fields.map(([key])=>row[key]));
export const knownKey=(r:RecordRow)=>r.individual?JSON.stringify([r.folder,r.file,r.individual]):null;
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
export function validateGrid(grid:unknown[][],existing:RecordRow[],date1904=false):ImportPreview{
 const header=normalizeHeader(grid[0]||[]);
 const missing=fields.filter(([,name])=>!header.includes(name));
 if(missing.length)throw new Error(`缺少表头：${missing.map(f=>f[1]).join('、')}。请使用导入模板。`);
 if(new Set(header.filter(Boolean)).size!==header.filter(Boolean).length)throw new Error('表头重复，同一字段的新旧名称只能保留一列。');
 const extras=header.filter(h=>h&&!fields.some(([,name])=>name===h));
 if(extras.length)throw new Error(`存在额外字段：${extras.join('、')}。请使用标准模板，避免遗漏数据。`);
 const additions:RecordRow[]=[],issues:ImportIssue[]=[];
 const exact=new Set(existing.map(fingerprint));
 const known=new Map(existing.filter(r=>r.individual).map(r=>[knownKey(r),r]));
 let duplicates=0,total=0;
 for(let i=1;i<grid.length;i++){
  const line=grid[i];if(!line||line.every(v=>v==null||v===''))continue;total++;
  const row=Object.fromEntries(fields.map(([key,label])=>[key,String(line[header.indexOf(label)]??'').trim()])) as RecordRow;
  row.id=`record-${crypto.randomUUID()}`;
  row.date=dateText(line[header.indexOf('拍摄日期')],date1904);row.time=timeText(line[header.indexOf('拍摄时间')]);
  const issue=(field:string,value:string,reason:string)=>issues.push({id:`${i}-${issues.length}`,row:i+1,field,value,reason});
  for(const key of ['folder','file','site','camera','date','time','quantity','observer','period'])if(!row[key as DataField])issue(fields.find(f=>f[0]===key)![1],'','不能为空');
  if(row.date&&!validDate(row.date))issue('拍摄日期',row.date,'日期无效，请使用 YYYY-MM-DD 或 Excel 日期');
  if(row.time&&!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(row.time))issue('拍摄时间',row.time,'请使用 HH:mm:ss');
  if(row.quantity&&!/^[1-9]\d*$/.test(row.quantity))issue('数量',row.quantity,'应为正整数');
  if(row.period&&!/^\d{4}(0[1-9]|1[0-2])$/.test(row.period))issue('回收批次',row.period,'请使用 YYYYMM');
  if(row.independent&&!['0','1'].includes(row.independent))issue('独立拍摄',row.independent,'仅支持 1、0 或空值');
  const sig=fingerprint(row),key=knownKey(row);
  if(exact.has(sig)){duplicates++;continue;}
  if(key&&known.has(key)){issue('记录冲突',row.file,'相同文件路径与个体编号的内容不同，请核对；不会覆盖已有记录');continue;}
  exact.add(sig);if(key)known.set(key,row);additions.push(row);
 }
 if(!total)throw new Error('工作表中没有可导入的数据。');
 return {additions,duplicates,total,issues};
}
export function loadDataset(seed:RecordRow[]):Dataset{
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
 if(saved&&Array.isArray(saved.rows)&&saved.rows.every((r:RecordRow)=>typeof r.id==='string'&&fields.every(([k])=>typeof r[k]==='string'))&&Array.isArray(saved.history))return saved;
 }catch{/* Fall back to supplied sample if cache is unavailable. */}
 return {rows:seed,history:[]};
}
export function persistDataset(dataset:Dataset){localStorage.setItem(storageKey,JSON.stringify(dataset));}
export type Filters={keyword?:string;individual?:string;site?:string;camera?:string;period?:string;angle?:string;sex?:string;identifiable?:string;adult?:string;observer?:string;numbered?:string;startDate?:string;endDate?:string;independentOnly?:boolean};
export function filterRecords(rows:RecordRow[],f:Filters){return rows.filter(r=>{
 if(f.keyword&&!fields.some(([key])=>r[key].toLowerCase().includes(f.keyword!.trim().toLowerCase())))return false;
 for(const key of ['individual','site','camera','period','angle','sex','identifiable','adult','observer'] as const)if(f[key]&&r[key]!==f[key])return false;
 if(f.numbered==='yes'&&!r.individual||f.numbered==='no'&&r.individual)return false;
 if(f.startDate&&r.date<f.startDate||f.endDate&&r.date>f.endDate)return false;
 return !f.independentOnly||r.independent==='1';
});}
