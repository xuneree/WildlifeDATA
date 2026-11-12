// A cycle belongs to its starting operation. Editing boundaries never silently drops its facts.
export function deriveCycles(operations,previous=[]){
 const groups=new Map();
 for(const row of operations){const key=JSON.stringify([row.group,row.site_code,row.camera_code]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const boundaries=[];
 for(const rows of groups.values()){
  rows.sort((a,b)=>a.operation_date.localeCompare(b.operation_date)||(a.sequence||0)-(b.sequence||0));
  let start=null;
  for(const end of rows){
   if(!['安装','检查','撤回'].includes(end.operation_type))continue;
   if(start)boundaries.push({start,end});
   start=end.is_deployed_after===true&&end.operation_type!=='撤回'?end:null;
  }
  if(start)boundaries.push({start,end:null});
 }
 const tuple=({start,end})=>JSON.stringify([start.group,start.site_code,start.camera_code,start.operation_date,end?.operation_date||null]);
 const counts=new Map();for(const b of boundaries)counts.set(tuple(b),(counts.get(tuple(b))||0)+1);
 const used=new Set();const records=boundaries.map(b=>{
  const {start,end}=b;let old=previous.find(r=>r.start_operation_id===start.id&&!used.has(r.id));
  if(!old&&counts.get(tuple(b))===1){const matches=previous.filter(r=>!r.start_operation_id&&!used.has(r.id)&&r.group===start.group&&r.site_code===start.site_code&&r.camera_code===start.camera_code&&r.start_date===start.operation_date&&(r.end_date||null)===(end?.operation_date||null));if(matches.length===1)old=matches[0];}
  if(old)used.add(old.id);
  const faults=old?.fault_intervals||[];
  const review=faults.some(f=>!end||f.start<start.operation_date||f.end>end.operation_date);
  return {...old,id:old?.id||'cycle-'+start.id,group:start.group,site_code:start.site_code,camera_code:start.camera_code,start_operation_id:start.id,end_operation_id:end?.id||null,start_date:start.operation_date,end_date:end?.operation_date||null,source:'operation',relation_status:'linked',details_recorded:old?.details_recorded??Boolean(old&&old.status!=='active'),status:end?(faults.length?'fault_recorded':'no_fault_recorded'):'active',fault_intervals:faults,needs_review:review,created_at:old?.created_at||start.created_at,updated_at:old?.updated_at||start.updated_at,created_by:old?.created_by||'demo-user',updated_by:old?.updated_by||'demo-user'};
 });
 return [...records,...previous.filter(r=>!used.has(r.id)&&!records.some(next=>next.id===r.id)).map(r=>({...r,relation_status:'unlinked'}))];
}
