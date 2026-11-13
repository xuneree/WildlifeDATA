import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleRecords,migrateTypicalSample} from '../src/samples.js';
const prefix='wildlifedata-field-demo-v03-';
test('typical sample migrates both stores once and preserves custom records and cycle facts',()=>{
 const samples=sampleRecords();assert.equal(samples.operations.filter(r=>r.site_code==='DEMO-701').length,12);
 const locations=samples.locations.map(r=>r.id==='sample-location-701'?{...r,data:{...r.data,loc_alias:'L01',loc_projects:['和顺常规监测','X337道路监测']}}:r);
 const extra={id:'sample-extra-location-0',data:{loc_code:'DEMO-801',loc_alias:''}},custom={id:'mine',data:{loc_code:'MY',loc_alias:'自定义'}};locations.push(extra,custom);
 const old=samples.operations.filter(r=>!/^sample-operation-(9|1[0-7])$/.test(r.id));
 const user={id:'user-operation',site_code:'DEMO-701',data:{op_notes:'保留'}};old.push(user);
 const ledger={operations:old,deployments:[{id:'keep',fault_intervals:[{reason:'保留'}]}],audit:[{id:'audit'}]};
 const map=new Map([[prefix+'location-records',JSON.stringify(locations)],[prefix+'operation-records',JSON.stringify(old)],[prefix+'camera-ledger-v1',JSON.stringify(ledger)]]),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 migrateTypicalSample(storage);const rows=JSON.parse(map.get(prefix+'location-records')),next=JSON.parse(map.get(prefix+'camera-ledger-v1'));
 assert.equal(rows[0].data.loc_alias,'');assert.deepEqual(rows[0].data.loc_projects,['和顺常规监测']);assert.equal(rows.at(-2).data.loc_alias,'L01');assert.deepEqual(rows.at(-1),custom);
 assert.equal(next.operations.filter(r=>r.site_code==='DEMO-701').length,13);assert.deepEqual(next.operations.find(r=>r.id===user.id),user);assert.deepEqual(next.deployments,ledger.deployments);assert.deepEqual(next.audit,ledger.audit);assert.deepEqual(next.operations,JSON.parse(map.get(prefix+'operation-records')));
 const snapshot=[...map];migrateTypicalSample(storage);assert.deepEqual([...map],snapshot);
});
