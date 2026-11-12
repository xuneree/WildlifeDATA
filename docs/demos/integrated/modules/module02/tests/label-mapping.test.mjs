import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultLabelMapping,loadLabelMapping,saveLabelMapping,validateLabelMapping,labelMappingStorageKey} from '../src/label-mapping.ts';
import {normalizeRecordLabel,normalizeSpeciesLabel,sourceSpeciesLabel,validateGrid,fields} from '../src/data.ts';
import {summarizeLabels} from '../src/statistics.ts';
const row={id:'mapping-row',folder:'T:/new/r.mp4',file:'r.mp4',site:'103',camera:'103',date:'2026-07-11',time:'00:14:56',species:'工作人员',period:'202608',independent:'1'};
test('the same original label can be reassigned without losing the concrete list value or using stale grouping',()=>{
 const grouped=normalizeRecordLabel(row);
 assert.equal(grouped.species,'人类干扰');assert.equal(sourceSpeciesLabel(grouped),'工作人员');
 const ungrouped=normalizeRecordLabel(grouped,{humanInterference:[]});assert.equal(ungrouped.species,'工作人员');
 assert.deepEqual(summarizeLabels([ungrouped]),[{label:'工作人员',count:1}]);
 const regrouped=normalizeRecordLabel(ungrouped,defaultLabelMapping);assert.equal(regrouped.species,'人类干扰');assert.equal(sourceSpeciesLabel(regrouped),'工作人员');
});
test('maintained source aliases admit new concrete human labels without creating a new filter category',()=>{
 const mapping={humanInterference:[...defaultLabelMapping.humanInterference,'巡护人员']};
 const patrol={...row,species:'巡护人员'};
 const result=validateGrid([fields.map(f=>f[1]),fields.map(([key])=>patrol[key])],[],['人类干扰'],false,mapping);
 assert.equal(result.issues.length,0);assert.equal(result.additions[0].species,'人类干扰');assert.equal(sourceSpeciesLabel(result.additions[0]),'巡护人员');
 assert.equal(normalizeSpeciesLabel('巡护人员'),'巡护人员');
 assert.equal(normalizeSpeciesLabel('巡护人员',mapping),'人类干扰');
});
test('mapping edits trim and deduplicate aliases, persist separately from records and reject self-mapping',()=>{
 const old=globalThis.localStorage;const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 try{const mapping=saveLabelMapping({humanInterference:[' 工作人员 ','工作人员','巡护人员']});assert.deepEqual(mapping,{humanInterference:['工作人员','巡护人员']});assert.deepEqual(loadLabelMapping(),mapping);assert.ok(values.has(labelMappingStorageKey));assert.equal(values.size,1);assert.throws(()=>validateLabelMapping({humanInterference:['人类干扰']}),/自身/);}finally{globalThis.localStorage=old;}
});
test('invalid cache falls back to versioned defaults, and storage errors cannot be reported as saved',()=>{
 const old=globalThis.localStorage;globalThis.localStorage={getItem:()=>'{bad',setItem:()=>{throw new Error('storage full');}};
 try{assert.deepEqual(loadLabelMapping(),defaultLabelMapping);assert.throws(()=>saveLabelMapping({humanInterference:['巡护人员']}),/storage full/);}finally{globalThis.localStorage=old;}
});
