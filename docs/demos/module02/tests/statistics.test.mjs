import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import {fields,loadDataset,normalizeRecordLabel,normalizeSpeciesLabel,storageKey,validateGrid} from '../src/data.ts';
import {makeWorkbook} from '../src/excel.ts';
import {filterRecords,refineByLabel,summarizeRecords,summarizeLabels} from '../src/statistics.ts';
const sample=JSON.parse(fs.readFileSync(new URL('../src/sample.json',import.meta.url)));
const raw=sample.map((row,i)=>({...row,id:`sample-${i}`}));
const rows=raw.map(normalizeRecordLabel);
const directory=JSON.parse(fs.readFileSync(new URL('../src/site-context.json',import.meta.url)));
const humanSources=['工作人员','其他人','采药人','伐木人'];
test('human-related labels consolidate into one category without changing record or independent totals',()=>{
 assert.deepEqual(summarizeRecords(rows),{records:200,independent:133,sites:4,labels:14});
 const labels=summarizeLabels(rows);
 assert.equal(labels.reduce((sum,item)=>sum+item.count,0),200);
 assert.equal(labels.find(item=>item.label==='人类干扰').count,19);
 assert.ok(labels.every(item=>!humanSources.includes(item.label)));
 assert.equal(rows.filter(row=>row.sourceSpecies&&humanSources.includes(row.sourceSpecies)).length,19);
 assert.equal(new Set(raw.map(row=>row.species)).size,17);
 for(const label of humanSources)assert.equal(normalizeSpeciesLabel(label),'人类干扰');
 assert.equal(normalizeSpeciesLabel('其他鸟类'),'其他鸟类');
});
test('independent checkbox uses checked=true for only independent rows and unchecked=false for all',()=>{
 assert.equal(filterRecords(rows,{independentOnly:false},directory).length,200);
 assert.equal(filterRecords(rows,{independentOnly:true},directory).length,133);
 const humanIndependent=filterRecords(rows,{independentOnly:true,species:'人类干扰'},directory);
 assert.equal(humanIndependent.length,raw.filter(row=>humanSources.includes(row.species)&&row.independent==='1').length);
 assert.equal(filterRecords(rows,{region:'区域一',project:'demo-project-special',site:'103',camera:'103',period:'202608',species:'豹猫'},directory).length,2);
 assert.equal(filterRecords(rows,{startDate:'2026-07-01',endDate:'2026-07-31'},directory).length,raw.filter(row=>row.date>='2026-07-01'&&row.date<='2026-07-31').length);
});
test('label drill-down narrows totals but preserves the base distribution for switching or clearing',()=>{
 const base=filterRecords(rows,{region:'区域一'},directory);
 const counts=summarizeLabels(base);
 const leopard=refineByLabel(base,'豹猫');
 assert.equal(leopard.length,2);
 assert.deepEqual(summarizeRecords(leopard),{records:2,independent:1,sites:1,labels:1});
 const human=refineByLabel(base,'人类干扰');
 assert.equal(human.length,counts.find(item=>item.label==='人类干扰').count);
 assert.deepEqual(summarizeLabels(base),counts);
 assert.equal(refineByLabel(base,undefined).length,base.length);
 assert.deepEqual(summarizeRecords([]),{records:0,independent:0,sites:0,labels:0});
 assert.deepEqual(summarizeLabels([]),[]);
});
test('legacy cache, legacy Excel and exports use the same merged category while preserving source provenance',()=>{
 const previous=globalThis.localStorage;
 const json=JSON.stringify({rows:raw,history:[]});
 globalThis.localStorage={getItem:key=>key===storageKey?json:null};
 try{
  const restored=loadDataset(raw);
  assert.equal(restored.rows.filter(row=>row.species==='人类干扰').length,19);
  assert.ok(restored.rows.filter(row=>row.species==='人类干扰').every(row=>row.sourceSpecies));
  assert.equal(globalThis.localStorage.getItem(storageKey),json);
  const grid=[fields.map(f=>f[1]),...raw.map(row=>fields.map(([key])=>row[key]))];
  const parsed=validateGrid(grid,restored.rows,[...new Set(raw.map(row=>row.species))]);
  assert.equal(parsed.issues.length,0);assert.equal(parsed.duplicates,200);assert.equal(parsed.additions.length,0);
  const newHuman={...raw.find(row=>row.species==='工作人员'),folder:'T:/new/human.mp4',file:'human.mp4'};
  const added=validateGrid([fields.map(f=>f[1]),fields.map(([key])=>newHuman[key])],restored.rows,['人类干扰']);
  assert.equal(added.issues.length,0);assert.equal(added.additions[0].species,'人类干扰');assert.equal(added.additions[0].sourceSpecies,'工作人员');
  const book=makeWorkbook(restored.rows);const output=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:''});
  assert.equal(output.slice(1).filter(row=>row[6]==='人类干扰').length,19);
  assert.equal(output.slice(1).filter(row=>humanSources.includes(row[6])).length,0);
 }finally{globalThis.localStorage=previous;}
});
