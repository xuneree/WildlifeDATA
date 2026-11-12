import {loadLocationFiles,saveLocationFiles} from './files.js';
const STORE='wildlifedata-field-demo-v03';
const MARKER=STORE+'-samples-v1';
export const chinaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function exampleLocation(code='DEMO-705'){
 return {loc_code:code,loc_group:'山西',loc_region:'和顺',loc_place:'上北舍',loc_grid_code:'001A',loc_projects:['和顺常规监测','X337道路监测'],loc_people:'调查员甲、调查员乙',loc_date:chinaToday(),loc_alias:'',loc_lon:'113.2500',loc_lat:'37.3500',loc_elevation:'1280',loc_habitat:'落叶阔叶林',loc_terrain:'中部',loc_aspect:'北',loc_slope:'25',loc_water:'≤100 m',loc_notes:''};
}
export function exampleOperation(code,date=chinaToday(),type='安装',camera=code+'A'){
 return {op_site:code,op_camera:camera,op_group:'山西',op_batch:'202610',op_date:date,op_type:type,op_people:'调查员甲',op_recorder:'记录员乙',op_model:'Ltl-6210',op_barcode:'SAMPLE-'+camera,op_mode:'视频',op_video_seconds:15,op_photo_count:1,op_interval:10,op_sensitivity:'中',op_status:type==='安装'?null:'正常',op_actions:type==='检查'?['收卡换卡','更换电池']:[],op_withdraw_reason:type==='撤回'?'调整监测方案，撤回机位':null,configuration_snapshot:{mode:'视频',video_seconds:15,photo_count:null,interval_minutes:10,sensitivity:'中'}};
}
export function exampleHabitat(code){return {hab_site:code,hab_group:'山西',hab_date:chinaToday(),hab_people:'调查员甲',hab_tree_height:'10–19',hab_tree_cover:'60–79% · 密林',hab_origin:'次生',hab_shrub_height:'1–3',hab_shrub_cover:'25–49%',hab_grass_type:'非禾本科为主',hab_grass_cover:'50–74%',hab_vegetation_unobserved:false,hab_animal_unobserved:false,hab_disturb_unobserved:false,hab_disturb:['放牧'],animals:[{species:'狍',signs:['足迹','粪便']}]};}
export function exampleFiles(code){
 const kml=`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${code} 轨迹</name><Placemark><name>上山路线</name><LineString><coordinates>113.248,37.348,0 113.249,37.349,0 113.250,37.350,0</coordinates></LineString></Placemark></Document></kml>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#e6f4ff"/><path d="M0 290L150 85 285 260 410 110 640 290V360H0" fill="#95c5a0"/><path d="M0 340L220 170 410 330 540 230 640 320V360H0" fill="#46755b"/><circle cx="518" cy="70" r="28" fill="#ffd666"/><rect x="248" y="222" width="144" height="64" rx="8" fill="#fff"/><text x="320" y="250" font-size="18" text-anchor="middle" fill="#244b37">${code}</text><text x="320" y="274" font-size="14" text-anchor="middle" fill="#244b37">位点示意图</text></svg>`;
 return {loc_tracks:[new File([kml],'轨迹.kml',{type:'application/vnd.google-earth.kml+xml'})],loc_photos:[new File([svg],'位点示意图.svg',{type:'image/svg+xml'})]};
}
export function sampleRecords(){
 const created_at='2026-11-01T04:00:00.000Z',group='山西';
 const locations=['701','702','703','704'].map((n,i)=>({id:'sample-location-'+n,group,created_at,updated_at:created_at,data:{...exampleLocation('DEMO-'+n),loc_date:'2026-09-01',loc_alias:i===0?'L01':'',loc_region:['和顺','榆社','左权','和顺'][i],loc_place:['上北舍','马坊乡','横岭','上北舍'][i],loc_projects:[['和顺常规监测','X337道路监测','和顺X337'],['X337道路监测'],['和顺常规监测','和顺X337'],['X337道路监测','和顺常规监测']][i],loc_lon:String(113.25+i*.01),loc_lat:String(37.35+i*.01)}}));
 const operations=[];
 function op(code,date,type,camera=code+'A',extra={}){const data={...exampleOperation(code,date,type,camera),...extra};const id='sample-operation-'+operations.length;data._operation_id=id;operations.push({id,group,site_code:code,camera_code:camera,operation_date:date,sequence:1,operation_type:type,is_deployed_after:type!=='撤回',data,created_at,updated_at:created_at});}
 for(const row of locations)op(row.data.loc_code,'2026-09-01','安装');
 op('DEMO-701','2026-09-01','安装','DEMO-701B');op('DEMO-701','2026-11-01','检查');op('DEMO-702','2026-11-01','检查');op('DEMO-703','2026-11-01','撤回');op('DEMO-704','2026-11-01','检查','DEMO-704A',{op_status:'关机',op_issue_notes:'电池耗尽'});
 const deployments=locations.map((row,i)=>({id:'sample-deployment-'+i,group,site_code:row.data.loc_code,camera_code:row.data.loc_code+'A',start_date:'2026-09-01',end_date:'2026-11-01',has_fault_time:i===3,status:i===3?'fault_recorded':'no_fault_recorded',fault_intervals:i===3?[{start:'2026-10-10',end:'2026-10-13',reason:'电池耗尽，更换电池后恢复'},{start:'2026-10-22',end:'2026-10-24',reason:'存储卡满，换卡后恢复'}]:[],first_recorded:'2026-09-01T09:00:00',first_actual:'2026-09-01T09:01:30',time_calibration:{offset_seconds:90},created_by:'demo-user',updated_by:'demo-user',created_at,updated_at:created_at}));
 const habitats=locations.map((row,i)=>({id:'sample-habitat-'+i,group,site_code:row.data.loc_code,data:{...exampleHabitat(row.data.loc_code),hab_date:'2026-11-01'},created_at,updated_at:created_at}));
 return {locations,operations,deployments,habitats};
}
export function migrateSampleAliases(storage){
 const key=STORE+'-sample-aliases-v2';if(storage.getItem(key))return;
 const rows=JSON.parse(storage.getItem(STORE+'-location-records')||'[]');if(!Array.isArray(rows))throw Error('Invalid stored records');
 const next=rows.map(r=>/^sample-location-70[1-4]$/.test(r.id)?{...r,data:{...r.data,loc_alias:r.id==='sample-location-701'?'L01':''}}:r);
 if(rows.length)storage.setItem(STORE+'-location-records',JSON.stringify(next));storage.setItem(key,'1');
}
export async function ensureSampleData(storage=localStorage,saveFiles=saveLocationFiles,loadFiles=loadLocationFiles){
 migrateSampleAliases(storage);await migrateDemoPresentation(storage,saveFiles,loadFiles);migrateDemoBatches(storage);normalizeOldDemoBatches(storage);if(storage.getItem(MARKER)){await ensureExtraSamples(storage,saveFiles);return;}
 const read=suffix=>{const value=JSON.parse(storage.getItem(STORE+'-'+suffix)||'[]');if(!Array.isArray(value))throw Error('Invalid stored records');return value;};
 const existing=read('location-records'),samples=sampleRecords();
 const additions=samples.locations.filter(r=>!existing.some(x=>x.id===r.id||x.group===r.group&&x.data.loc_code===r.data.loc_code));
 const allowed=new Set(additions.map(r=>r.data.loc_code));
 const next=[['location-records',[...existing,...additions]],['operation-records',[...read('operation-records'),...samples.operations.filter(r=>allowed.has(r.site_code))]],['deployment-records',[...read('deployment-records'),...samples.deployments.filter(r=>allowed.has(r.site_code))]],['habitat-records',[...read('habitat-records'),...samples.habitats.filter(r=>allowed.has(r.site_code))]]];
 for(const row of additions)await saveFiles(row.id,exampleFiles(row.data.loc_code));
 for(const [suffix,rows]of next)storage.setItem(STORE+'-'+suffix,JSON.stringify(rows));
 storage.setItem(MARKER,'1');await ensureExtraSamples(storage,saveFiles);
}

const cleanDemoValue=value=>typeof value==='string'?value.replace(/示例[：:·]?/g,''):Array.isArray(value)?value.map(cleanDemoValue):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[key,cleanDemoValue(v)])):value;
export async function migrateDemoPresentation(storage,saveFiles=saveLocationFiles,loadFiles=loadLocationFiles){
 const marker=STORE+'-presentation-v3';if(storage.getItem(marker))return;
 const read=suffix=>{const value=JSON.parse(storage.getItem(STORE+'-'+suffix)||'[]');if(!Array.isArray(value))throw Error('Invalid stored records');return value;};
 const rows=read('location-records'),defaults=sampleRecords().locations;
 const demo=r=>r.data?.loc_code==='DEMO-901'||/^sample-location-70[1-4]$/.test(r.id)||/^DEMO-\d+$/.test(r.data?.loc_code||'')&&(r.data?.loc_notes==='用于演示的虚构位点与坐标。'||r.data?.loc_people==='示例调查员甲、乙');
 const codes=new Set(rows.filter(demo).map(r=>r.data.loc_code));
 const now=new Date().toISOString();
 const next=rows.map(r=>{
  if(!demo(r))return r;
  const next=cleanDemoValue(r);const preset=defaults.find(d=>d.id===r.id);
  if(preset)next.data={...next.data,loc_place:preset.data.loc_place,loc_projects:preset.data.loc_projects,loc_notes:''};
  else{if(['北沟','示例·北沟'].includes(next.data.loc_place))next.data.loc_place='上北舍';next.data.loc_notes='';}
  if(r.data.loc_code==='DEMO-901')return {...next,deleted_at:r.deleted_at||now,deleted_by:'demo-user',deletion_reason:'移除演示位点'};
  return next;
 });
 const cleanRecord=r=>codes.has(r.site_code)?cleanDemoValue(r):r;
 const operations=read('operation-records').map(cleanRecord),deployments=read('deployment-records').map(cleanRecord),habitats=read('habitat-records').map(cleanRecord);
 const ledger=JSON.parse(storage.getItem(STORE+'-camera-ledger-v1')||'null');
 if(ledger){ledger.operations=ledger.operations.map(cleanRecord);ledger.deployments=ledger.deployments.map(cleanRecord);}
 for(const row of rows.filter(r=>demo(r)&&!r.deleted_at&&r.data.loc_code!=='DEMO-901')){
  const files=await loadFiles(row.id);let changed=false;const result={};
  for(const [key,list]of Object.entries(files)){result[key]=[];for(const file of list){let replacement=file;if(['示例轨迹.kml','示例位点示意图.svg'].includes(file.name)){const text=await file.text();if(text.includes('虚构演示路线')||text.includes('示例位点示意图')){replacement=new File([cleanDemoValue(text).replace('虚构演示路线','上山路线')],file.name.replace('示例',''),{type:file.type,lastModified:file.lastModified});changed=true;}}result[key].push(replacement);}}
  if(changed)await saveFiles(row.id,result);
 }
 if(rows.length)storage.setItem(STORE+'-location-records',JSON.stringify(next));
 for(const [suffix,value]of [['operation-records',operations],['deployment-records',deployments],['habitat-records',habitats]])if(value.length)storage.setItem(STORE+'-'+suffix,JSON.stringify(value));
 if(ledger)storage.setItem(STORE+'-camera-ledger-v1',JSON.stringify(ledger));
 const drafts=JSON.parse(storage.getItem(STORE)||'null');if(drafts){for(const [page,data]of Object.entries(drafts)){const code=data.loc_code||data.op_site||data.dep_site||data.hab_site;if(codes.has(code)){if(code==='DEMO-901')delete drafts[page];else drafts[page]=cleanDemoValue(data);}}storage.setItem(STORE,JSON.stringify(drafts));}
 storage.setItem(marker,'1');
}

function migrateDemoBatches(storage){
 const marker=STORE+'-batch-demo-v4';if(storage.getItem(marker))return;
 const update=rows=>rows.map(row=>/^sample-operation-\d+$/.test(row.id)&&/^\d{6}(布设|回收)$/.test(row.data?.op_batch||'')?{...row,data:{...row.data,op_batch:'202610'}}:row);
 const key=STORE+'-operation-records',rows=JSON.parse(storage.getItem(key)||'[]');if(rows.length)storage.setItem(key,JSON.stringify(update(rows)));
 const ledgerKey=STORE+'-camera-ledger-v1',ledger=JSON.parse(storage.getItem(ledgerKey)||'null');if(ledger){ledger.operations=update(ledger.operations);storage.setItem(ledgerKey,JSON.stringify(ledger));}
 storage.setItem(marker,'1');
}

async function ensureExtraSamples(storage,saveFiles){
 const marker=STORE+'-extra-sites-v5';if(storage.getItem(marker))return;
 const read=suffix=>JSON.parse(storage.getItem(STORE+'-'+suffix)||'[]');
 const locations=read('location-records'),operations=[],habitats=[],additions=[];
 const occupied=new Set(locations.map(r=>r.data.loc_code));let number=801;
 const created_at='2026-11-01T04:00:00.000Z',group='山西';
 for(let i=0;i<25;i++){
  const id='sample-extra-location-'+i;if(locations.some(r=>r.id===id))continue;
  while(occupied.has('DEMO-'+number))number++;
  const code='DEMO-'+number++;occupied.add(code);
  const projects=i===8?['X337道路监测','和顺常规监测']:[['和顺常规监测','X337道路监测','和顺X337'][i%3]];
  additions.push({id,group,created_at,updated_at:created_at,data:{...exampleLocation(code),loc_date:'2026-09-01',loc_region:['和顺','榆社','左权'][i%3],loc_place:['上北舍','马坊乡','横岭'][Math.floor(i/3)%3],loc_projects:projects,loc_lon:(113.28+i*.003).toFixed(4),loc_lat:(37.38+i*.002).toFixed(4)}});
  function op(date,type,camera=code+'A'){
   const id=`sample-extra-operation-${i}-${operations.filter(r=>r.site_code===code).length}`;
   operations.push({id,group,site_code:code,camera_code:camera,operation_date:date,operation_type:type,is_deployed_after:type!=='撤回',sequence:1,data:{...exampleOperation(code,date,type,camera),_operation_id:id},created_at,updated_at:created_at});
  }
  op('2026-09-01','安装');if(i%7===0)op('2026-09-01','安装',code+'B');op('2026-11-01',i%7===3?'撤回':'检查');
  habitats.push({id:'sample-extra-habitat-'+i,group,site_code:code,data:{...exampleHabitat(code),hab_date:'2026-11-01'},created_at,updated_at:created_at});
 }
 for(const row of additions)await saveFiles(row.id,exampleFiles(row.data.loc_code));
 const ledgerKey=STORE+'-camera-ledger-v1',ledger=JSON.parse(storage.getItem(ledgerKey)||'null');
 if(ledger){ledger.operations=[...ledger.operations,...operations];storage.setItem(ledgerKey,JSON.stringify(ledger));}
 storage.setItem(STORE+'-operation-records',JSON.stringify(ledger?.operations||[...read('operation-records'),...operations]));
 storage.setItem(STORE+'-habitat-records',JSON.stringify([...read('habitat-records'),...habitats]));
 storage.setItem(STORE+'-location-records',JSON.stringify([...locations,...additions]));
 storage.setItem(marker,'1');
}

function normalizeOldDemoBatches(storage){
 const marker=STORE+'-batch-labels-v6';if(storage.getItem(marker))return;
 const old=value=>/^(?:\d{6})?(?:监测批次|和顺常规监测|布设|回收)$/.test(value||'');
 const update=rows=>rows.map(r=>(/^sample-(?:extra-)?operation-/.test(r.id)||r.data?.op_barcode?.startsWith('SAMPLE-')&&r.site_code?.startsWith('DEMO-'))&&old(r.data?.op_batch)?{...r,data:{...r.data,op_batch:'202610'}}:r);
 for(const suffix of ['operation-records','camera-ledger-v1']){const key=STORE+'-'+suffix,value=JSON.parse(storage.getItem(key)||'null');if(value)storage.setItem(key,JSON.stringify(Array.isArray(value)?update(value):{...value,operations:update(value.operations)}));}
 const drafts=JSON.parse(storage.getItem(STORE)||'null');if(drafts?.operation?.op_site?.startsWith('DEMO-')&&old(drafts.operation.op_batch)){drafts.operation.op_batch='202610';storage.setItem(STORE,JSON.stringify(drafts));}
 const key=STORE+'-recent-batches',recent=JSON.parse(storage.getItem(key)||'null');if(recent)storage.setItem(key,JSON.stringify(recent.map(row=>old(row.value)?{...row,value:'202610'}:row)));
 storage.setItem(marker,'1');
}
