export const CAMERA_MODES=['照片','视频','照片+视频'];
export const CAMERA_STATUSES=['正常','关机','损坏','丢失','倒了','其他'];
export const OPERATION_ACTIONS=['收卡换卡','更换电池','调整角度','更换相机','丢失重补','移动位置','参数调整','其他'];
export const CAMERA_ISSUES=['无问题','空拍多','电池没电','相机设置有误','触发异常','其他'];
export const coordinate=value=>value===null||value===undefined||String(value).trim()===''||!Number.isFinite(Number(value))?null:Number(value).toFixed(6);
export const includesPhoto=mode=>mode==='照片'||mode==='照片+视频';
export const includesVideo=mode=>mode==='视频'||mode==='照片+视频';
export const hasSidePir=model=>/A323/i.test(model||'');
export function operationV42(data){
 const d={...data},old=d.configuration_snapshot;
 d.op_actions=(d.op_actions||[]).map(v=>({'调整参数':'参数调整','丢失后补装':'丢失重补'}[v]||v));
 if(d.op_interval_seconds==null)d.op_interval_seconds=old?.interval_seconds??(d.op_interval!=null?Number(d.op_interval)*60:old?.interval_minutes!=null?Number(old.interval_minutes)*60:null);
 if(old){d.configuration_snapshot={...old,interval_seconds:old.interval_seconds??(old.interval_minutes!=null?Number(old.interval_minutes)*60:null),side_pir:old.side_pir??null};delete d.configuration_snapshot.interval_minutes;}
 if(!Array.isArray(d.op_issues)){
  const settings=d.op_settings_issues||[],photos=d.op_photo_issues||[];d.op_issues=[];
  if(photos.includes('空拍多'))d.op_issues.push('空拍多');
  if(settings.length){d.op_issues.push('相机设置有误');d.op_settings_notes=d.op_settings_notes||settings.join('、');}
  const others=photos.filter(v=>v!=='空拍多');if(others.length||d.op_issue_notes){d.op_issues.push('其他');d.op_issue_notes=[...others,d.op_issue_notes].filter(Boolean).join('、');}
 }
 return d;
}
export function habitatV42(data){
 const d={...data};
 if(Array.isArray(d.disturbances)&&d.disturbances.length){d.hab_disturb=[...new Set(d.disturbances.flatMap(r=>r.types||[]))];d.hab_disturb_other=[...new Set(d.disturbances.map(r=>r.other).filter(Boolean))].join('、')||null;}
 return d;
}
export function migrateFieldV42(storage=localStorage){
 const base='wildlifedata-field-demo-v03',marker=base+'-field-v42';if(storage.getItem(marker))return;
 const location=d=>({...d,loc_lon:coordinate(d.loc_lon),loc_lat:coordinate(d.loc_lat),loc_habitat:d.loc_habitat==='草地'?'草丛':d.loc_habitat});
 for(const [suffix,convert]of [['location-records',location],['operation-records',operationV42],['habitat-records',habitatV42]]){
  const key=base+'-'+suffix,rows=JSON.parse(storage.getItem(key)||'null');if(Array.isArray(rows))storage.setItem(key,JSON.stringify(rows.map(r=>({...r,data:convert(r.data)}))));
 }
 const ledgerKey=base+'-camera-ledger-v1',ledger=JSON.parse(storage.getItem(ledgerKey)||'null');if(ledger){ledger.operations=ledger.operations.map(r=>({...r,data:operationV42(r.data)}));storage.setItem(ledgerKey,JSON.stringify(ledger));storage.setItem(base+'-operation-records',JSON.stringify(ledger.operations));}
 const draft=JSON.parse(storage.getItem(base)||'null');if(draft){if(draft.location)draft.location=location(draft.location);if(draft.operation)draft.operation=operationV42(draft.operation);if(draft.habitat)draft.habitat=habitatV42(draft.habitat);storage.setItem(base,JSON.stringify(draft));}
 storage.setItem(marker,'1');
}
