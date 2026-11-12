import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchesSiteContext,siteContextOptions,siteForRecord} from '../src/locations.ts';
const sample=JSON.parse(fs.readFileSync(new URL('../src/sample.json',import.meta.url)));
const directory=JSON.parse(fs.readFileSync(new URL('../src/site-context.json',import.meta.url)));
const select=filters=>sample.filter(row=>matchesSiteContext(row,filters,directory));
test('site-based region/locality/project association filters complete record sets without duplicating multi-project sites',()=>{
 const expected=sample.filter(row=>['103','106'].includes(row.site));
 assert.deepEqual(select({region:'区域一'}),expected);
 assert.deepEqual(select({locality:'小地名二'}),sample.filter(row=>row.site==='106'));
 assert.deepEqual(select({project:'demo-project-regular'}),expected);
 assert.deepEqual(select({project:'demo-project-special'}),sample.filter(row=>['103','107'].includes(row.site)));
 assert.deepEqual(select({region:'区域一',project:'demo-project-special'}),sample.filter(row=>row.site==='103'));
 assert.equal(select({region:'区域二',locality:'小地名二'}).length,0);
 assert.equal(select({}).length,200);
});
test('unknown or ambiguous sites do not borrow metadata; identifiers retain leading zeros; no-project sites remain in unfiltered results',()=>{
 const unknown={...sample[0],site:'00103'};
 assert.equal(siteForRecord(unknown,directory),undefined);
 assert.equal(matchesSiteContext(unknown,{},directory),true);
 assert.equal(matchesSiteContext(unknown,{region:'区域一'},directory),false);
 const duplicate={...directory,sites:[...directory.sites,{...directory.sites[0],id:'another'}]};
 assert.equal(siteForRecord(sample[0],duplicate),undefined);
 const noProject=sample.find(row=>row.site==='108');
 assert.equal(matchesSiteContext(noProject,{region:'区域二'},directory),true);
 assert.equal(matchesSiteContext(noProject,{project:'demo-project-special'},directory),false);
});
test('filter options derive from associated sites present in the records and project IDs, not copied fields on media rows',()=>{
 const only103=sample.filter(row=>row.site==='103');
 const options=siteContextOptions(only103,directory);
 assert.deepEqual(options.regions,[{value:'区域一',label:'区域一'}]);
 assert.deepEqual(options.localities,[{value:'小地名一',label:'小地名一'}]);
 assert.equal(options.projects.length,2);
 assert.deepEqual(siteContextOptions([],directory),{regions:[],localities:[],projects:[]});
});
