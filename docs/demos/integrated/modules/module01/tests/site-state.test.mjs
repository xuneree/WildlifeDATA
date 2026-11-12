import test from 'node:test';
import assert from 'node:assert/strict';
import {siteState,presenceAfter} from '../src/site-state.js';
const row=(camera,date,present,sequence=1,extra={})=>({group:'山西',site_code:'701',camera_code:camera,operation_date:date,is_deployed_after:present,sequence,...extra});
const state=(rows,date='2026-11-10')=>siteState(rows,'山西','701',date);

test('empty, single, paired and withdrawn states',()=>{
 const records=[row('A','2026-01-01',true),row('B','2026-02-01',true),row('A','2026-03-01',false),row('B','2026-04-01',false)];
 for(const [date,count,type,status] of [['2025-12-31',0,'none','inactive'],['2026-01-01',1,'single','active'],['2026-02-01',2,'paired','active'],['2026-03-01',1,'single','active'],['2026-04-01',0,'none','inactive']]){
  assert.deepEqual(state(records,date),{as_of:date,camera_count:count,deployment_type:type,location_status:status});
 }
});
test('faults and card collection still mean physically present',()=>{
 for(const status of ['正常','关机','损坏'])assert.equal(presenceAfter({op_type:'检查',op_status:status,op_actions:['收卡换卡']}),true);
 assert.equal(presenceAfter({op_type:'检查',op_status:'丢失'}),false);
 assert.equal(presenceAfter({op_type:'检查',op_status:'丢失',op_actions:['丢失后补装']}),true);
 assert.equal(presenceAfter({op_type:'安装'}),true);
 assert.equal(presenceAfter({op_type:'撤回'}),false);
 assert.equal(presenceAfter({op_type:'检查'}),null);
});
test('same-cycle replacement and duplicate inspections do not produce paired state',()=>{
 assert.equal(state([row('old','2026-01-01',true),row('old','2026-02-01',false),row('new','2026-02-01',true),row('new','2026-03-01',true)]).camera_count,1);
});
test('backdated input sorts by event date and same-day sequence',()=>{
 assert.equal(state([row('A','2026-02-01',false,2),row('A','2026-01-01',true),row('A','2026-02-01',true,1)]).camera_count,0);
});
test('future, other group/site and incomplete records do not change observed presence',()=>{
 assert.equal(state([row('A','2026-01-01',true),row('B','2099-01-01',true),row('C','2026-01-01',true,1,{group:'西北'}),row('D','2026-01-01',true,1,{site_code:'702'}),row('E',null,true),row('A','2026-02-01',null)]).camera_count,1);
});
test('more than two cameras keep enabled state without silently classifying as paired',()=>{
 assert.equal(state(['A','B','C'].map(c=>row(c,'2026-01-01',true))).deployment_type,'unclassified');
 assert.equal(state(['A','B','C'].map(c=>row(c,'2026-01-01',true))).location_status,'active');
});
