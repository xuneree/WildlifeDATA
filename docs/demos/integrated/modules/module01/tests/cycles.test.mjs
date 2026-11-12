import test from 'node:test';import assert from 'node:assert/strict';import {deriveCycles} from '../src/cycles.js';
const op=(id,date,type,present,extra={})=>({id,group:'山西',site_code:'701',camera_code:'701A',operation_date:date,operation_type:type,is_deployed_after:present,sequence:1,...extra});
test('installation opens, check closes and reopens, withdrawal only closes',()=>{
 let operations=[op('install','2026-09-01','安装',true)];let cycles=deriveCycles(operations);assert.equal(cycles.length,1);assert.equal(cycles[0].end_date,null);assert.equal(cycles[0].start_operation_id,'install');
 operations.push(op('check','2026-10-01','检查',true));cycles=deriveCycles(operations,cycles);assert.equal(cycles.length,2);assert.equal(cycles[0].end_operation_id,'check');assert.equal(cycles[1].start_operation_id,'check');
 operations.push(op('withdraw','2026-11-01','撤回',false));cycles=deriveCycles(operations,cycles);assert.equal(cycles.filter(r=>r.relation_status==='linked').length,2);assert(cycles.every(r=>r.end_date));assert.equal(cycles[1].end_operation_id,'withdraw');
});
test('stable IDs preserve metadata when backdated boundaries change',()=>{
 const operations=[op('a','2026-09-01','安装',true),op('b','2026-11-01','检查',true)];let records=deriveCycles(operations);records[0].fault_intervals=[{start:'2026-10-01',end:'2026-10-05',reason:'电池'}];records[0].time_calibration={offset_seconds:90};
 const id=records[0].id;operations[0].operation_date='2026-10-03';records=deriveCycles(operations,records);assert.equal(records[0].id,id);assert.equal(records[0].time_calibration.offset_seconds,90);assert.equal(records[0].fault_intervals.length,1);assert.equal(records[0].needs_review,true);
});
test('lost-without-replacement stops; multiple cameras and groups are separate',()=>{
 const rows=[op('a','2026-09-01','安装',true),op('b','2026-10-01','检查',false),op('c','2026-09-01','安装',true,{camera_code:'701B'}),op('d','2026-09-01','安装',true,{group:'河北'})];const cycles=deriveCycles(rows);assert.equal(cycles.length,3);assert.equal(cycles.filter(r=>!r.end_date).length,2);assert.equal(cycles.find(r=>r.start_operation_id==='a').end_operation_id,'b');
});
test('legacy facts migrate once, unmatched records remain preserved',()=>{
 const operations=[op('a','2026-09-01','安装',true),op('b','2026-11-01','检查',true)];const previous=[{id:'legacy',group:'山西',site_code:'701',camera_code:'701A',start_date:'2026-09-01',end_date:'2026-11-01',fault_intervals:[{start:'2026-10-01',end:'2026-10-02'}]},{id:'unmatched',group:'山西',site_code:'701',camera_code:'701A',start_date:'2020-01-01',end_date:'2020-02-01'}];const cycles=deriveCycles(operations,previous);assert.equal(cycles[0].id,'legacy');assert.equal(cycles[0].start_operation_id,'a');assert.equal(cycles.find(r=>r.id==='unmatched').relation_status,'unlinked');assert.deepEqual(deriveCycles(operations,cycles),cycles);
});
