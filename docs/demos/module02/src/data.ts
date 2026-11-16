export type Cycle = {id:string;group:string;site:string;camera:string;batch:string;start:string;end:string;offset:number|null;firstRecorded?:string;firstActual?:string;source:'camera'|'sample'};
export type Media = {id:string;name:string;path:string;type:'image'|'video';size:number;capturedAt:number;correctedAt:number|null;absoluteCorrectedAt?:number};
export type Directory = {id:string;cycleId:string;batch:string;site:string;camera:string;path:string;source:'sample'|'local';files:Media[];linkedAt:string};
export type Calibration = {cycleId:string;firstRecorded:string;firstActual:string;offset:number;at:string};
export type Dataset = {version:1;directories:Directory[];calibrations:Calibration[];history:{at:string;action:string;count:number;cycleId?:string}[]};
export type ScannedDirectory = {key:string;batch:string;site:string;camera:string;path:string;files:Media[];cycleId?:string};
export type FileInfo = {name:string;webkitRelativePath?:string;size:number;lastModified:number};
export const storageKey='wildlifedata-media-module02-v1';
export const chinaStamp=(value:string)=>Date.parse(value.replace(/(?:Z|[+-]\d{2}:\d{2})$/,'')+'+08:00');
export const formatTime=(value:number|null|undefined)=>value==null?'—':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));
export function outOfPeriod(value:number,cycle:Cycle){return value<chinaStamp(cycle.start+'T00:00:00')||value>=chinaStamp(cycle.end+'T00:00:00')+86400000;}
export const normalizePath=(value:string)=>value.replace(/\\/g,'/').replace(/\/+$/,'');
export const offsetText=(value:number|null)=>value==null?'未设置':value===0?'无需偏移（0 秒）':`${value>0?'加':'减'} ${Math.abs(value)} 秒`;
export function sampleCycles():Cycle[]{return [['701','701A',90],['701','701B',-60],['702','702A',0],['703','703A',null],['704','704A',125],['705','705A',0]].map(([site,camera,offset],i)=>({id:`media-cycle-${i}`,group:'山西',site:String(site),camera:String(camera),batch:'202610',start:'2026-08-01',end:'2026-10-01',offset:offset as number|null,firstRecorded:'2026-08-01T09:00:00',firstActual:offset===null?undefined:new Date(chinaStamp('2026-08-01T09:00:00')+Number(offset)*1000+8*3600000).toISOString().slice(0,19),source:'sample'}));}
export function cameraCycles(storage:Pick<Storage,'getItem'>):Cycle[] {
 const ledgerText=storage.getItem('wildlifedata-field-demo-v03-camera-ledger-v1');
 const cyclesText=storage.getItem('wildlifedata-field-demo-v03-deployment-records');
 if(!ledgerText&&!cyclesText)return sampleCycles();
 const ledger=ledgerText?JSON.parse(ledgerText):null;
 const deployments=ledger?.deployments||JSON.parse(cyclesText||'[]');
 const operations=ledger?.operations||JSON.parse(storage.getItem('wildlifedata-field-demo-v03-operation-records')||'[]');
 const locations=JSON.parse(storage.getItem('wildlifedata-field-demo-v03-location-records')||'[]');
 return deployments.filter((r:any)=>r.group==='山西'&&r.end_date&&r.relation_status==='linked'&&!locations.some((l:any)=>l.group===r.group&&l.data?.loc_code===r.site_code&&l.deleted_at)).map((r:any)=>{
  const end=operations.find((o:any)=>o.id===r.end_operation_id);return {id:r.id,group:r.group,site:r.site_code,camera:r.camera_code,batch:end?.data?.op_batch||'',start:r.start_date,end:r.end_date,offset:Number.isFinite(r.time_calibration?.offset_seconds)?r.time_calibration.offset_seconds:null,firstRecorded:r.first_recorded||undefined,firstActual:r.first_actual||undefined,source:/^(sample-|cycle-sample-)/.test(r.id)?'sample':'camera'};
 });
}
export function initialData(cycles:Cycle[]):Dataset {
 const directories=[...cycles].sort((a,b)=>b.end.localeCompare(a.end)).slice(0,5).map((cycle,index)=>{
  const batch=cycle.batch||'202610',path=`D:/红外相机数据/${batch}/${cycle.site}/${cycle.camera}`,count=[28,20,16,12,18][index];
  const files:Media[]=Array.from({length:count},(_,i)=>{const type=i%4===0?'image':'video',name=`DSCF${String(i+1).padStart(4,'0')}.${type==='image'?'JPG':'MP4'}`;
   const capturedAt=chinaStamp(cycle.start+'T09:00:00')+i*240000;return {id:`sample-${cycle.id}-${i}`,name,path:path+'/'+name,type,size:type==='image'?3540000:25560000,capturedAt,correctedAt:index===2&&cycle.offset!==null?capturedAt+cycle.offset*1000:null};});
  // Include one clock anomaly to exercise cycle checks without silently changing membership.
  if(index===3)files[0].capturedAt=chinaStamp(cycle.start+'T00:00:00')-86400000;
  return {id:`sample-dir-${cycle.id}`,cycleId:cycle.id,batch,site:cycle.site,camera:cycle.camera,path,source:'sample' as const,files,linkedAt:'2026-10-02T01:00:00Z'};
 });
 return {version:1,directories,calibrations:[],history:[]};
}
export function loadDataset(storage:Pick<Storage,'getItem'>,cycles:Cycle[]):Dataset {
 const text=storage.getItem(storageKey);if(!text)return initialData(cycles.filter(c=>c.source==='sample'));
 const value=JSON.parse(text);if(value.version!==1||!Array.isArray(value.directories)||!Array.isArray(value.calibrations)||!Array.isArray(value.history))throw Error('媒体索引读取失败，请保留现有数据后重试。');return value;
}
export function scanDirectory(files:FileInfo[],batch:string,root:string):{directories:ScannedDirectory[];skipped:number;errors:string[]} {
 if(!batch.trim()||!root.trim())throw Error('请填写回收批次及批次存储路径。');
 const base=normalizePath(root.trim());if(base.split('/').pop()!==batch)throw Error('存储路径最后一级应与回收批次一致。');
 const groups=new Map<string,ScannedDirectory>();const errors:string[]=[];const paths=new Set<string>();let skipped=0;
 for(const f of files){
  const ext=f.name.split('.').pop()?.toLowerCase();if(!['mp4','mov','avi','jpg','jpeg','png'].includes(ext||'')){skipped++;continue;}
  const parts=(f.webkitRelativePath||f.name).replace(/\\/g,'/').split('/');
  if(parts.length<4||parts[0]!==batch||parts.some(p=>!p||p==='.'||p==='..')){errors.push(`${f.name}：目录应为 ${batch} / 位点 / 相机 / 媒体文件`);continue;}
  if(!Number.isFinite(f.lastModified)||f.lastModified<=0){errors.push(`${f.name}：无法读取修改时间`);continue;}
  const [,site,camera]=parts,key=JSON.stringify([batch,site,camera]),path=base+'/'+parts.slice(1).join('/');
  if(paths.has(path)){errors.push(`${f.name}：同一次扫描出现重复路径`);continue;}paths.add(path);
  if(!groups.has(key))groups.set(key,{key,batch,site,camera,path:`${base}/${site}/${camera}`,files:[]});
  groups.get(key)!.files.push({id:path,name:f.name,path,type:['jpg','jpeg','png'].includes(ext!)?'image':'video',size:f.size,capturedAt:f.lastModified,correctedAt:null});
 }
 return {directories:[...groups.values()],skipped,errors};
}
export function linkPreview(scanned:ScannedDirectory[],cycles:Cycle[],dataset:Dataset){
 const errors:string[]=[];let duplicates=0;const additions:Directory[]=[];const now=new Date().toISOString();
 for(const dir of scanned){
  const cycle=cycles.find(c=>c.id===dir.cycleId);if(!cycle||cycle.site!==dir.site||cycle.camera!==dir.camera||(cycle.batch&&cycle.batch!==dir.batch)){errors.push(`${dir.camera}：请选择匹配的已结束布设周期`);continue;}
  const sameDir=dataset.directories.find(d=>d.path===dir.path&&d.source==='local');
  if(sameDir&&sameDir.cycleId!==cycle.id){errors.push(`${dir.camera}：此路径已关联其他布设周期，不能覆盖`);continue;}
  const prior=dataset.directories.filter(d=>d.source==='local').flatMap(d=>d.files);
  const newFiles=dir.files.filter(f=>{const old=prior.find(o=>o.path===f.path);if(!old)return true;if(old.size!==f.size||old.capturedAt!==f.capturedAt)errors.push(`${f.name}：已有路径的大小或修改时间发生变化`);else duplicates++;return false;});
  const calibration=dataset.calibrations.find(c=>c.cycleId===cycle.id);
  const offset=calibration?.offset??cycle.offset;
  additions.push({...dir,id:sameDir?.id||crypto.randomUUID(),cycleId:cycle.id,source:'local',linkedAt:now,files:newFiles.map(f=>({...f,correctedAt:offset==null?null:f.capturedAt+offset*1000}))});
 }
 return {errors,duplicates,additions,count:additions.reduce((sum,d)=>sum+d.files.length,0)};
}
export function commitLinks(dataset:Dataset,scanned:ScannedDirectory[],cycles:Cycle[]):Dataset {
 const preview=linkPreview(scanned,cycles,dataset);if(preview.errors.length)throw Error(preview.errors[0]);if(!preview.count)throw Error('没有可新增的文件，已关联文件保持原样。');
 const directories=dataset.directories.filter(d=>d.source!=='sample'||!preview.additions.some(a=>a.cycleId===d.cycleId));
 for(const addition of preview.additions){if(!addition.files.length)continue;const old=directories.find(d=>d.id===addition.id);if(old)directories[directories.indexOf(old)]={...old,files:[...old.files,...addition.files]};else directories.push(addition);}
 return {...dataset,directories,history:[...dataset.history,{at:new Date().toISOString(),action:'关联媒体目录',count:preview.count}]};
}
export function applyCalibration(dataset:Dataset,cycle:Cycle,firstRecorded:string,firstActual:string):Dataset {
 const recorded=chinaStamp(firstRecorded),actual=chinaStamp(firstActual),offset=(actual-recorded)/1000;
 if(!Number.isFinite(offset)||!Number.isInteger(offset)||Math.abs(offset)>31536000)throw Error('请填写有效的相机时间和实际时间，偏差不超过一年。');
 const files=dataset.directories.filter(d=>d.cycleId===cycle.id).flatMap(d=>d.files);if(!files.length)throw Error('该周期没有已关联媒体文件。');
 const at=new Date().toISOString();return {...dataset,directories:dataset.directories.map(d=>d.cycleId===cycle.id?{...d,files:d.files.map(f=>({...f,correctedAt:f.absoluteCorrectedAt??f.capturedAt+offset*1000}))}:d),calibrations:[...dataset.calibrations.filter(c=>c.cycleId!==cycle.id),{cycleId:cycle.id,firstRecorded,firstActual,offset,at}],history:[...dataset.history,{at,action:'写入校准时间',count:files.length,cycleId:cycle.id}]};
}
