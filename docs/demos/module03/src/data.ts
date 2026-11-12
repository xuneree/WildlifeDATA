import {matchesSiteContext} from './locations.ts';
import type {SiteDirectory,SiteContextFilters} from './locations.ts';
export const sourceFields = [
 ['folder','文件夹'],['file','文件名'],['camera','相机编号'],['site','位点'],
 ['date','拍摄日期'],['time','拍摄时间'],['quantity','视频中豹个体数量'],['position','位置描述'],
 ['identifiable','可识别性'],['angle','角度'],['adult','是否成年'],['sex','性别'],
 ['individual','个体编号'],['reviewNotes','复核备注'],['injury','受伤情况'],['multiBehavior','多只豹情况下的行为'],
 ['reproduction','繁殖情况'],['behavior','行为'],['observer','识别人'],['confidence','确信度'],
 ['notes','备注'],['period','回收批次'],['independent','个体独立拍摄'],['dateSuspect','拍摄日期可能有误'],
 ['correctedDate','校正后拍摄日期'],['previousTime','上一次拍摄时间'],
] as const;
export const fields=[...sourceFields,['reviewer','复核人'],['reviewStatus','复核状态']] as const;
export type DataField=typeof fields[number][0];
export type RecordRow=Record<DataField,string>&{id:string};
export type ImportIssue={id:string;row:number;field:string;value:string;reason:string};
export type ImportPreview={additions:RecordRow[];duplicates:number;total:number;issues:ImportIssue[];mediaCount:number};
export type ImportBatch={id:string;name:string;count:number;skipped:number;time:string};
export type Dataset={rows:RecordRow[];history:ImportBatch[]};
// Keep the former snapshot/cache untouched; replacement data has its own namespace.
export const storageKey='wildlifedata-module03-reviewed-202606-v2';
export const defaultReviewer='CS';
export const labels:Partial<Record<DataField,Record<string,string>>>={
 identifiable:{'1':'可识别','2':'不可识别','3':'待识别'},
 adult:{'1':'成年','2':'未成年','3':'无法确认'},
 sex:{M:'雄性',F:'雌性',U:'未知',male:'雄性',female:'雌性',unknown:'未知'},
 angle:{'左':'左侧','右':'右侧','正':'正面','背':'背面'},
 multiBehavior:{'1':'育幼','2':'兄弟姐妹','3':'一公一母尾随','4':'交配','5':'未知关系同框','-':'不适用'},
 reviewStatus:{reviewed:'已复核',unreviewed:'未复核'},
};
export function fieldText(key:DataField,value:string):string{
 if(!value)return key==='individual'?'未知个体':'未填写';
 if(key==='independent')return value==='1'?'是':value==='0'?'否':value;
 if(key==='dateSuspect')return value==='1'?'可能有误':value==='0'?'否':value;
 if(key==='reproduction')return value==='否'||value==='0'?'否':/^\d+$/.test(value)?`繁殖数量 ${value}`:value;
 if(key==='angle')return value.split('、').map(x=>labels.angle?.[x]||x).join('、');
 return labels[key]?.[value]||value;
}
export const effectiveDate=(row:RecordRow)=>row.correctedDate||row.date;
export const uniqueValues=(rows:RecordRow[],field:DataField)=>[...new Set(rows.map(r=>r[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
export const fingerprint=(row:RecordRow)=>JSON.stringify(fields.map(([key])=>row[key]));
export const mediaKey=(r:RecordRow)=>JSON.stringify([r.folder,r.file,r.camera,r.site,r.period]);
export const isUnknown=(r:RecordRow)=>!r.individual||r.individual==='unknown_individual';
export const individualLabel=(r:RecordRow)=>isUnknown(r)?'未知个体':r.individual;
export const knownKey=(r:RecordRow)=>!isUnknown(r)?JSON.stringify([mediaKey(r),r.individual]):null;
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

const sourceHeaderKeys:Record<string,DataField>={
  "文件夹": "folder",
  "文件名": "file",
  "相机编号": "camera",
  "位点名称": "site",
  "拍摄日期": "date",
  "拍摄时间": "time",
  "数量（视频中豹个体的数量）": "quantity",
  "位置描述（若只有一只可忽略本条，出场的第几只，左数第几只，或按照可懂的描述方式;若为1只标注\"-\"）": "position",
  "可识别性(1：可识别；2：不可识别；3：待识别）": "identifiable",
  "角度(左；右；正；背；多个角度时用‘、’连接）": "angle",
  "是否成年(1:是；2:否；3:无法确认)": "adult",
  "性别": "sex",
  "个体编号复核": "individual",
  "复核备注": "reviewNotes",
  "受伤情况": "injury",
  "多只豹情况下的行为（1:育幼；2:兄弟姐妹；3:一公一母尾随；4:交配；5:未知关系的豹同框出现；非多只豹填写为\"-\"）": "multiBehavior",
  "繁殖情况（否；繁殖数量）": "reproduction",
  "行为（根据视频描述）": "behavior",
  "识别人": "observer",
  "确信度": "confidence",
  "备注(不清晰但可识别时写明辨识点;若根据对拍识别，请注明)": "notes",
  "数据期号": "period",
  "独立拍摄(对同一只豹连续拍摄的首张照片标注1)": "independent",
  "拍摄日期是否可能有误(1为可能有误)": "dateSuspect",
  "校正后拍摄日期（用于数据统计）": "correctedDate",
  "上一次拍摄时间": "previousTime"
};
const extraAliases:Record<string,DataField>={'数量':'quantity','可识别':'identifiable','是否成体':'adult','复核后个体编号':'individual','独立拍摄':'independent'};
export const normalizeHeader=(values:unknown[])=>values.map(v=>{const name=String(v??'').trim();const key=sourceHeaderKeys[name]||extraAliases[name];return key?fields.find(f=>f[0]===key)![1]:name;});
export function validateGrid(grid:unknown[][],existing:RecordRow[],date1904=false):ImportPreview{
 const rawHeader=(grid[0]||[]).map(v=>String(v??'').trim());
 const reviewedSheet=rawHeader.includes('个体编号复核')||rawHeader.includes('复核后个体编号');
 const header=normalizeHeader(rawHeader);
 const missing=sourceFields.filter(([,name])=>!header.includes(name));
 if(missing.length)throw new Error(`缺少表头：${missing.map(f=>f[1]).join('、')}。请使用新版导入模板。`);
 if(new Set(header.filter(Boolean)).size!==header.filter(Boolean).length)throw new Error('表头重复，同一字段只能保留一列。');
 const extras=header.filter(h=>h&&!fields.some(([,name])=>name===h));
 if(extras.length)throw new Error(`存在额外字段：${extras.join('、')}。请核对字段，避免遗漏数据。`);
 const additions:RecordRow[]=[],issues:ImportIssue[]=[];
 const exact=new Set(existing.map(fingerprint));
 const known=new Map(existing.filter(r=>!isUnknown(r)).map(r=>[knownKey(r),r]));
 const media=new Map(existing.map(r=>[mediaKey(r),r]));
 const mediaSet=new Set<string>();
 let duplicates=0,total=0;
 for(let i=1;i<grid.length;i++){
  const line=grid[i];if(!line||line.every(v=>v==null||v===''))continue;total++;
  const row=Object.fromEntries(fields.map(([key,label])=>[key,String(line[header.indexOf(label)]??'').trim()])) as RecordRow;
  row.id=`record-${crypto.randomUUID()}`;
  for(const key of ['date','correctedDate'] as const)row[key]=dateText(line[header.indexOf(fields.find(f=>f[0]===key)![1])],date1904);
  for(const key of ['time','previousTime'] as const)row[key]=timeText(line[header.indexOf(fields.find(f=>f[0]===key)![1])]);
  row.reviewer=row.reviewer||defaultReviewer;
  row.reviewStatus=({'已复核':'reviewed','未复核':'unreviewed'} as Record<string,string>)[row.reviewStatus]||row.reviewStatus||(reviewedSheet?'reviewed':'unreviewed');
  const issue=(key:DataField|'conflict',value:string,reason:string)=>issues.push({id:`${i}-${issues.length}`,row:i+1,field:key==='conflict'?'记录冲突':fields.find(f=>f[0]===key)![1],value,reason});
  for(const key of ['folder','file','site','camera','date','time','quantity','period'] as const)if(!row[key])issue(key,'','不能为空');
  for(const key of ['date','correctedDate'] as const)if(row[key]&&!validDate(row[key]))issue(key,row[key],'日期无效，请使用 YYYY-MM-DD 或 Excel 日期');
  for(const key of ['time','previousTime'] as const)if(row[key]&&!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(row[key]))issue(key,row[key],'请使用 HH:mm:ss');
  if(row.quantity&&!/^[1-9]\d*$/.test(row.quantity))issue('quantity',row.quantity,'视频中豹个体数量应为正整数');
  if(row.period&&!/^\d{4}(0[1-9]|1[0-2])$/.test(row.period))issue('period',row.period,'请使用 YYYYMM');
  for(const key of ['identifiable','adult'] as const)if(row[key]&&!['1','2','3'].includes(row[key]))issue(key,row[key],'仅支持 1、2、3 或空值，请参照模板说明');
  if(row.angle&&row.angle.split('、').some(v=>!['左','右','正','背'].includes(v)))issue('angle',row.angle,'使用左、右、正、背，多角度用“、”连接');
  if(row.sex&&!['M','F','U'].includes(row.sex))issue('sex',row.sex,'使用 M（雄性）、F（雌性）、U（未知）或空值');
  if(row.multiBehavior&&!['1','2','3','4','5','-'].includes(row.multiBehavior))issue('multiBehavior',row.multiBehavior,'使用 1–5、- 或空值');
  if(row.reproduction&&!['否','-'].includes(row.reproduction)&&!/^\d+$/.test(row.reproduction))issue('reproduction',row.reproduction,'使用“否”或繁殖数量');
  if(row.independent&&!['0','1'].includes(row.independent))issue('independent',row.independent,'仅支持 1、0 或空值');
  if(row.dateSuspect&&!['0','1'].includes(row.dateSuspect))issue('dateSuspect',row.dateSuspect,'仅支持 1、0 或空值');
  if(!['reviewed','unreviewed'].includes(row.reviewStatus))issue('reviewStatus',row.reviewStatus,'使用已复核/未复核或 reviewed/unreviewed');
  const mk=mediaKey(row);mediaSet.add(mk);const previousMedia=media.get(mk);
  if(previousMedia){for(const key of ['date','time','quantity','correctedDate','dateSuspect'] as const)if(previousMedia[key]!==row[key])issue(key,row[key],'同一媒体的拍摄信息或视频内数量不一致，请核对');}else media.set(mk,row);
  const sig=fingerprint(row),key=knownKey(row);
  if(exact.has(sig)){duplicates++;continue;}
  if(key&&known.has(key)){issue('conflict',row.file,'同媒体同个体的内容或复核信息不同，请核对更正；不会直接覆盖原记录');continue;}
  exact.add(sig);if(key)known.set(key,row);additions.push(row);
 }
 if(!total)throw new Error('工作表中没有可导入的数据。');
 return {additions,duplicates,total,issues,mediaCount:mediaSet.size};
}
export function loadDataset(seed:RecordRow[]):Dataset{
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
 if(saved&&Array.isArray(saved.rows)&&saved.rows.every((r:RecordRow)=>typeof r.id==='string'&&fields.every(([k])=>typeof r[k]==='string'))&&Array.isArray(saved.history))return saved;
 }catch{/* Fall back to the replacement snapshot; do not load the previous schema. */}
 return {rows:seed,history:[]};
}
export function persistDataset(dataset:Dataset){localStorage.setItem(storageKey,JSON.stringify(dataset));}
export type Filters=SiteContextFilters & {keyword?:string;individual?:string;site?:string;period?:string;reviewStatus?:string;startDate?:string;endDate?:string};
export function filterRecords(rows:RecordRow[],f:Filters,directory:SiteDirectory={sites:[],projects:[]}){return rows.filter(r=>{
 if(!matchesSiteContext(r,f,directory))return false;
 if(f.keyword&&!fields.some(([key])=>`${r[key]} ${fieldText(key,r[key])}`.toLowerCase().includes(f.keyword!.trim().toLowerCase())))return false;
 for(const key of ['individual','site','period','reviewStatus'] as const)if(f[key]&&r[key]!==f[key])return false;
 const date=effectiveDate(r);if(f.startDate&&date<f.startDate||f.endDate&&date>f.endDate)return false;
 return true;
});}
// Explicit design projection: source observations are not new permanent profile fields.
export function databaseProjection(row:RecordRow){
 return {
  media:{storage_path:row.folder,filename:row.file,captured_date:row.date,captured_time:row.time,time_correction_date:row.correctedDate||null,individual_annotation_status:'annotated'},
  occurrence:isUnknown(row)?null:{individual_code:row.individual,annotated_by:row.observer||null,review_status:row.reviewStatus,reviewed_by:row.reviewer,reviewed_at:null,source_type:'excel_import'},
  unknown_individual:isUnknown(row),
  source_snapshot:Object.fromEntries(sourceFields.map(([key])=>[key,row[key]])),
 };
}
