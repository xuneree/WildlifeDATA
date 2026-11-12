import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fields,sourceFields,validateGrid,filterRecords,fingerprint,loadDataset,persistDataset,fieldText,effectiveDate,databaseProjection,storageKey,mediaKey} from '../src/data.ts';
import {readExcel,makeWorkbook} from '../src/excel.ts';
import XLSX from 'xlsx';
const sample=JSON.parse(fs.readFileSync(new URL('../src/sample.json',import.meta.url))).map((r,i)=>({...r,id:`s${i}`}));
const source=fs.readFileSync(new URL('./fixtures/个体识别数据样例.xlsx',import.meta.url));
const grid=rows=>[fields.map(f=>f[1]),...rows.map(r=>fields.map(([k])=>r[k]))];
test('新版实际 Excel：36 条有效记录、9 个编号、24 条独立标记，忽略 226 行空白',()=>{
 const r=readExcel(source,[]);assert.equal(r.total,36);assert.equal(r.mediaCount,36);assert.equal(r.issues.length,0);assert.equal(r.additions.length,36);
 assert.equal(new Set(sample.map(r=>r.individual)).size,9);assert.equal(sample.filter(r=>r.independent==='1').length,24);
 assert.deepEqual(r.additions.map(fingerprint),sample.map(fingerprint));
});
test('复核编号列对应已复核，原识别人保留，所有记录补 CS，不造复核时间',()=>{
 const r=readExcel(source,[]);assert(r.additions.every(r=>r.reviewer==='CS'&&r.reviewStatus==='reviewed'));
 assert.equal(r.additions[0].observer,'MY/QF');const db=databaseProjection(r.additions[0]);
 assert.equal(db.occurrence.annotated_by,'MY/QF');assert.equal(db.occurrence.reviewed_by,'CS');assert.equal(db.occurrence.reviewed_at,null);assert.equal(db.occurrence.review_status,'reviewed');
});
test('复核人不等于复核状态：普通编号未复核、显式状态优先、原复核人可保留',()=>{
 const withoutReview=[sourceFields.map(f=>f[1]),sourceFields.map(([k])=>sample[0][k])];
 const r=validateGrid(withoutReview,[]);assert.equal(r.additions[0].reviewer,'CS');assert.equal(r.additions[0].reviewStatus,'unreviewed');
 const explicit={...sample[0],reviewer:'AB',reviewStatus:'unreviewed'};assert.equal(validateGrid(grid([explicit]),[]).additions[0].reviewer,'AB');
});
test('表头编码对应业务含义，同时保留原码导出，不把确信度转概率',()=>{
 for(const [key,value,expected] of [['identifiable','1','可识别'],['identifiable','2','不可识别'],['identifiable','3','待识别'],['adult','2','未成年'],['adult','3','无法确认'],['sex','F','雌性'],['angle','左、正','左侧、正面'],['multiBehavior','1','育幼'],['multiBehavior','4','交配']])assert.equal(fieldText(key,value),expected);
 assert.equal(fieldText('confidence','A'),'A');assert.equal(fieldText('independent',''),'未填写');assert.equal(fieldText('independent','0'),'否');
 const invalid=validateGrid(grid([{...sample[0],adult:'9',identifiable:'9'}]),[]);assert.equal(invalid.issues.length,2);
});
test('校正日期优先筛选和排序，原日期时刻保持，00:00:00 不丢弃',()=>{
 const r={...sample[0],correctedDate:'2026-05-02',previousTime:'00:00:00'};
 assert.equal(effectiveDate(r),'2026-05-02');assert.equal(filterRecords([r],{startDate:'2026-05-02',endDate:'2026-05-02'}).length,1);
 assert.equal(filterRecords([r],{endDate:'2026-05-01'}).length,0);const db=databaseProjection(r);assert.equal(db.media.captured_date,'2026-05-01');assert.equal(db.source_snapshot.previousTime,'00:00:00');
 assert(!('time_corrected_at' in db.media));assert(!('is_independent_capture' in db.media));
});
test('同媒体多个个体逐行保留，视频数量不求和；同媒体元信息矛盾报错',()=>{
 const a={...sample[0],quantity:'2'},b={...a,individual:'OTHER001',position:'第二只'};
 const r=validateGrid(grid([a,b]),[]);assert.equal(r.additions.length,2);assert.equal(r.mediaCount,1);assert.equal(r.issues.length,0);
 const bad=validateGrid(grid([a,{...b,quantity:'3'}]),[]);assert(bad.issues.some(i=>i.field==='视频中豹个体数量'));
 assert.equal(mediaKey(a),mediaKey(b));
});
test('未知个体不产生虚拟档案，不从含 unknown 的正常编号猜身份',()=>{
 const unknown=databaseProjection({...sample[0],individual:'unknown_individual'});assert.equal(unknown.occurrence,null);assert.equal(unknown.unknown_individual,true);
 assert.equal(databaseProjection({...sample[0],individual:''}).unknown_individual,true);
 const cub=sample.find(r=>r.individual==='HSunknowncub2603F');assert(cub);assert.equal(databaseProjection(cub).occurrence.individual_code,'HSunknowncub2603F');assert.equal(databaseProjection(cub).unknown_individual,false);
});
test('整表重导幂等；复核元信息变化视为冲突，不能静默覆盖',()=>{
 const r=readExcel(source,sample);assert.equal(r.duplicates,36);assert.equal(r.additions.length,0);assert.equal(r.issues.length,0);
 const changed={...sample[0],reviewNotes:'更正说明'};assert(validateGrid(grid([changed]),sample).issues.some(i=>i.field==='记录冲突'));
});
test('长表头和标准表头可换序，重复及额外字段拦截',()=>{
 assert.equal(validateGrid(grid([sample[0]]).map(r=>[...r].reverse()),[]).additions.length,1);
 assert.throws(()=>validateGrid([['文件名']],[]),/缺少表头/);
 assert.throws(()=>validateGrid([fields.map(f=>f[1]).concat('个体编号复核')],[]),/重复/);
 assert.throws(()=>validateGrid([fields.map(f=>f[1]).concat('额外')],[]),/额外字段/);
});
test('真实 Excel 往返完整保留 26 源字段、复核人和复核状态',()=>{
 const r=readExcel(XLSX.write(makeWorkbook(sample),{type:'array',bookType:'xlsx'}),[]);assert.equal(fields.length,28);assert.equal(r.issues.length,0);assert.deepEqual(r.additions.map(fingerprint),sample.map(fingerprint));
 assert.equal(makeWorkbook(sample).SheetNames[1],'字段说明');
});
test('1904 日期系统、Excel 时间小数、编号前导零、原值行号',()=>{
 const wb=makeWorkbook([sample[0]]),s=wb.Sheets[wb.SheetNames[0]];s.D2={t:'n',v:7,z:'000'};s.E2={t:'n',v:1};s.F2={t:'n',v:0.5};wb.Workbook={WBProps:{date1904:true}};
 const r=readExcel(XLSX.write(wb,{type:'array',bookType:'xlsx'}),[]);assert.equal(r.additions[0].site,'007');assert.equal(r.additions[0].date,'1904-01-02');assert.equal(r.additions[0].time,'12:00:00');
 const bad=validateGrid(grid([sample[0],{...sample[1],date:'2026-02-30',time:'25:00:00'}]),[]);assert(bad.issues.every(i=>i.row===3));
});
test('复核、观察条件与关键词组合筛选，包含多角度',()=>{
 assert.equal(filterRecords(sample,{reviewer:'CS',reviewStatus:'reviewed'}).length,36);assert.equal(filterRecords(sample,{independentOnly:true}).length,24);
 assert.equal(filterRecords(sample,{individual:'HS2405M'}).length,7);assert.equal(filterRecords(sample,{adult:'2'}).length,1);
 assert.equal(filterRecords(sample,{reviewStatus:'unreviewed'}).length,0);assert.equal(filterRecords([{...sample[0],angle:'左、正'}],{angle:'正'}).length,1);
 assert(filterRecords(sample,{keyword:'雌性'}).length>0);
});
test('旧缓存不污染新样例、不删除旧缓存；保存失败抛错',()=>{
 const values=new Map([['wildlifedata-module03-demo-v1',JSON.stringify({rows:[{id:'old'}],history:[]})]]);
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(loadDataset(sample).rows.length,36);assert(values.has('wildlifedata-module03-demo-v1'));assert.notEqual(storageKey,'wildlifedata-module03-demo-v1');
 persistDataset({rows:sample,history:[]});assert.equal(loadDataset([]).rows.length,36);globalThis.localStorage.setItem=()=>{throw new Error('quota')};assert.throws(()=>persistDataset({rows:sample,history:[]}),/quota/);
});
