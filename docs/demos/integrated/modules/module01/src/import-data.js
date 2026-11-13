import {PROJECTS} from './catalog.js';
import {coordinate,CAMERA_MODES,CAMERA_STATUSES,OPERATION_ACTIONS,CAMERA_ISSUES,includesPhoto,includesVideo,hasSidePir} from './field-v42.js';
import {presenceAfter} from './site-state.js';
const col=(title,key,type='text',required=false,extra={})=>({title,key,type,required,...extra});
export const importSchemas={
 locations:{title:'导入位点',sheet:'位点',columns:[
 col('位点编号','loc_code','text',true),col('别名','loc_alias'),col('区域','loc_region','text',true,{options:['和顺','榆社','左权','其他区域']}),col('小地名','loc_place'),col('网格编号','loc_grid_code'),col('项目','loc_projects','list',false,{options:PROJECTS}),col('设置人员','loc_people','text',true),col('记录人员','loc_recorder'),col('首次布设日期','loc_date','date',true),col('经度','loc_lon','number',true,{min:-180,max:180}),col('纬度','loc_lat','number',true,{min:-90,max:90}),col('海拔（m）','loc_elevation','number',true),col('生境类型','loc_habitat','text',true,{options:['针阔混交林','落叶阔叶林','针叶林','灌丛','草丛','农田','其他']}),col('其他生境类型','loc_habitat_other'),col('地形位置','loc_terrain','text',true,{options:['山脊','上部','中部','下部','沟谷','平地']}),col('坡向','loc_aspect','text',true,{options:['北','东','南','西','无坡向']}),col('坡度（°）','loc_slope','number',true,{min:0,max:90}),col('水源距离','loc_water','text',true,{options:['＜100 m','＞100 m']}),col('备注','loc_notes')
 ]},
 operations:{title:'导入操作记录',sheet:'操作记录',columns:[
 col('位点编号','op_site','text',true),col('相机编号','op_camera','text',true),col('操作批次','op_batch'),col('操作日期','op_date','date',true),col('操作类型','op_type','text',true,{options:['安装','检查','撤回']}),col('操作人员','op_people','text',true),col('记录人员','op_recorder','text',false),col('相机状态','op_status','text',false,{options:CAMERA_STATUSES}),col('操作内容','op_actions','list',false,{options:OPERATION_ACTIONS}),col('其他相机状态','op_status_other'),col('相机设置与拍摄情况','op_issues','list',false,{options:CAMERA_ISSUES}),col('相机设置有误说明','op_settings_notes'),col('触发异常说明','op_trigger_notes'),col('其他情况说明','op_issue_notes'),col('其他操作说明','op_action_other'),col('撤回原因','op_withdraw_reason'),col('相机型号','op_model'),col('相机条形码','op_barcode'),col('拍摄模式','op_mode','text',false,{options:CAMERA_MODES}),col('录制时长（秒）','op_video_seconds','number'),col('连拍张数','op_photo_count','number'),col('拍摄间隔（秒）','op_interval_seconds','number'),col('灵敏度','op_sensitivity','text',false,{options:['高','中','低']}),col('侧边PIR是否打开（A323）','op_side_pir','text',false,{options:['是','否']}),col('备注','op_notes')
 ]}
};
const empty=v=>v===null||v===undefined||v==='';
const split=v=>Array.isArray(v)?v:String(v??'').split(/[、,，;；|\n]/).map(s=>s.trim()).filter(Boolean);
function dateOnly(value){if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString().slice(0,10):null;const s=String(value).trim().replaceAll('/','-');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:null;}
function normalise(kind,row){const data={},errors=[...(row.parseErrors||[])];for(const c of importSchemas[kind].columns){const value=row.data[c.key];let v=c.type==='list'?split(value):empty(value)?null:c.type==='date'?dateOnly(value):c.type==='number'?Number(value):String(value).trim();if(c.type==='list')v=[...new Set(v)];data[c.key]=v;
 if(c.required&&(empty(v)||Array.isArray(v)&&!v.length))errors.push(c.title+'不能为空');
 if(!empty(value)&&c.type==='date'&&!v)errors.push(c.title+'须为有效的 YYYY-MM-DD 日期');
 if(!empty(v)&&c.type==='number'&&(!Number.isFinite(v)||c.min!==undefined&&v<c.min||c.max!==undefined&&v>c.max))errors.push(c.title+'数值超出允许范围');
 if(c.options&&!empty(v)){const values=Array.isArray(v)?v:[v];if(values.some(x=>!c.options.includes(x)))errors.push(c.title+'包含不支持的选项：'+values.filter(x=>!c.options.includes(x)).join('、'));}
 }return {rowNumber:row.rowNumber,data,errors};}
export const snapshotRevision=s=>JSON.stringify([s.locations,s.operations,s.deployments,s.audit]);
const operationKey=d=>JSON.stringify([d.op_site,d.op_camera,d.op_date,d.op_type]);
export function prepareImport(kind,rawRows,snapshot,{now=new Date().toISOString(),newId=()=>crypto.randomUUID()}={}){
 if(!importSchemas[kind])throw Error('请选择导入类型');if(!rawRows.length)throw Error('工作表中没有数据，请填写模板后上传');if(rawRows.length>1000)throw Error('每批最多导入 1000 条记录');
 const group='山西',batchId=newId(),rows=rawRows.map(r=>normalise(kind,r));const seen=new Map();
 for(const row of rows){if(kind==='locations'){for(const key of ['loc_lon','loc_lat'])if(Number.isFinite(row.data[key]))row.data[key]=coordinate(row.data[key]);if(row.data.loc_habitat==='其他'&&!row.data.loc_habitat_other)row.errors.push('选择其他生境类型时须填写说明');}const key=kind==='locations'?row.data.loc_code:operationKey(row.data);if(seen.has(key)){row.errors.push('与本批第 '+seen.get(key).rowNumber+' 行重复');seen.get(key).errors.push('与本批第 '+row.rowNumber+' 行重复');}else seen.set(key,row);}
 const newLocations=[],newOperations=[];
 if(kind==='locations')for(const row of rows){const d=row.data;if(snapshot.locations.some(r=>r.group===group&&r.data.loc_code===d.loc_code))row.errors.push('位点编号已存在，本次导入不覆盖已有位点');if(d.loc_code?.length>50)row.errors.push('位点编号最多 50 个字符');if(d.loc_grid_code?.length>50)row.errors.push('网格编号最多 50 个字符');if(!row.errors.length)newLocations.push({id:newId(),group,data:{...d,loc_group:group},created_at:now,updated_at:now,import_batch_id:batchId,created_by:'demo-user'});}
 if(kind==='operations'){
  const working=[...snapshot.operations];
  for(const row of [...rows].sort((a,b)=>(a.data.op_date||'').localeCompare(b.data.op_date||'')||a.rowNumber-b.rowNumber)){
   const d=row.data;
   if(!snapshot.locations.some(r=>r.group===group&&!r.deleted_at&&r.data.loc_code===d.op_site))row.errors.push('位点不存在或已删除，请先建立有效位点');
   if(snapshot.operations.some(r=>r.group===group&&operationKey({op_site:r.site_code,op_camera:r.camera_code,op_date:r.operation_date,op_type:r.operation_type})===operationKey(d)))row.errors.push('该相机同日同类型记录已存在，请核对，导入不覆盖');
   const previous=working.filter(r=>r.group===group&&r.site_code===d.op_site&&r.camera_code===d.op_camera&&r.operation_date<=d.op_date).sort((a,b)=>b.operation_date.localeCompare(a.operation_date)||(b.sequence||0)-(a.sequence||0))[0];
   const install=d.op_type==='安装',inspection=d.op_type==='检查',withdraw=d.op_type==='撤回',device=install||inspection&&d.op_actions.some(v=>v==='更换相机'||v==='丢失重补'),config=install||inspection&&d.op_actions.includes('参数调整');
   if(!install&&!previous)row.errors.push('未找到此前相机信息，请先建立或导入安装记录');
   if(install&&(d.op_status||d.op_actions.length||d.op_issues.length||d.op_settings_notes||d.op_trigger_notes||d.op_status_other||d.op_issue_notes||d.op_notes))row.errors.push('安装不填写现场状态、异常、操作内容或备注');
   if(!install&&!d.op_status)row.errors.push('检查和撤回必须填写相机状态');
   if(!inspection&&(d.op_actions.length||d.op_action_other||d.op_notes))row.errors.push('操作内容、其他操作说明和备注仅用于检查');
   if(withdraw&&!d.op_withdraw_reason)row.errors.push('撤回必须填写撤回原因');
   if(!withdraw&&d.op_withdraw_reason)row.errors.push('撤回原因仅用于撤回');
   if(d.op_actions.includes('其他')&&!d.op_action_other)row.errors.push('选择其他操作时须填写其他操作说明');
   if(d.op_status==='其他'&&!d.op_status_other)row.errors.push('请选择其他相机状态时填写说明');for(const [v,key]of [['相机设置有误','op_settings_notes'],['触发异常','op_trigger_notes'],['其他','op_issue_notes']])if(d.op_issues.includes(v)&&!d[key])row.errors.push('请填写'+v+'说明');if(d.op_issues.includes('无问题')&&d.op_issues.length>1)row.errors.push('无问题不能与其他情况同时选择');
   if(!device&&((d.op_model&&d.op_model!==previous?.data.op_model)||(d.op_barcode&&d.op_barcode!==previous?.data.op_barcode)))row.errors.push('修改型号或条形码须选择更换相机或丢失重补');
   d.op_model=install?d.op_model:device?d.op_model||previous?.data.op_model:previous?.data.op_model;d.op_barcode=install?d.op_barcode:device?d.op_barcode||previous?.data.op_barcode:previous?.data.op_barcode;
   if(device&&!d.op_model)row.errors.push('安装或更换相机须填写相机型号');
   const prior=previous?.data.configuration_snapshot;const base=install?{mode:'视频',video_seconds:15,photo_count:1,interval_seconds:10,sensitivity:'中',side_pir:null}:prior||{};
   const supplied={mode:d.op_mode,video_seconds:d.op_video_seconds,photo_count:d.op_photo_count,interval_seconds:d.op_interval_seconds,sensitivity:d.op_sensitivity,side_pir:d.op_side_pir==='是'?true:d.op_side_pir==='否'?false:null};
   if(!config&&Object.entries(supplied).some(([k,v])=>!empty(v)&&v!==base[k]&&!(k==='side_pir'&&device)))row.errors.push('修改拍摄参数须选择参数调整');
   const cfg=config?Object.fromEntries(Object.entries({side_pir:null,...base}).map(([k,v])=>[k,empty(supplied[k])?v:supplied[k]])):prior?{...prior}:null;
   if(config){if(!CAMERA_MODES.includes(cfg.mode))row.errors.push('请填写拍摄模式');if(!['高','中','低'].includes(cfg.sensitivity))row.errors.push('请填写灵敏度');if(!Number.isFinite(cfg.interval_seconds)||cfg.interval_seconds<0)row.errors.push('拍摄间隔须为非负数');if(includesVideo(cfg.mode)&&(!Number.isInteger(cfg.video_seconds)||cfg.video_seconds<1||cfg.video_seconds>3600))row.errors.push('录制时长须为 1～3600 秒的整数');if(includesPhoto(cfg.mode)&&![1,2,3,5].includes(cfg.photo_count))row.errors.push('连拍张数须为 1、2、3 或 5');}
   if(device&&cfg)cfg.side_pir=supplied.side_pir;if((config||device)&&hasSidePir(d.op_model)&&typeof cfg?.side_pir!=='boolean')row.errors.push('A323 相机须填写侧边PIR是否打开');if(cfg){if(!hasSidePir(d.op_model))cfg.side_pir=null;if(!includesPhoto(cfg.mode))cfg.photo_count=null;if(!includesVideo(cfg.mode))cfg.video_seconds=null;cfg.source=install?'initial_defaults':config?'changed':'previous_record';}
   d.op_side_pir=cfg?.side_pir===true?'是':cfg?.side_pir===false?'否':null;d.configuration_snapshot=cfg;d.previous_record_date=install?null:previous?.operation_date||null;d.device_source=device?'entered_after_operation':'previous_record';d.op_group=group;d.cycle_action=install?'open':withdraw?'close':'close_and_open';d.is_deployed_after=presenceAfter(d);
   for(const [key,k]of Object.entries({op_mode:'mode',op_video_seconds:'video_seconds',op_photo_count:'photo_count',op_interval_seconds:'interval_seconds',op_sensitivity:'sensitivity'}))d[key]=cfg?.[k]??null;
   if(!row.errors.length){const id=newId();d._operation_id=id;const sequence=1+Math.max(0,...working.filter(r=>r.group===group&&r.site_code===d.op_site&&r.camera_code===d.op_camera&&r.operation_date===d.op_date).map(r=>r.sequence||0));const record={id,group,site_code:d.op_site,camera_code:d.op_camera,operation_date:d.op_date,operation_type:d.op_type,sequence,is_deployed_after:d.is_deployed_after,data:{...d},created_at:now,updated_at:now,import_batch_id:batchId};working.push(record);newOperations.push(record);}
  }
 }
 return {kind,batchId,revision:snapshotRevision(snapshot),rows,validCount:rows.filter(r=>!r.errors.length).length,errorCount:rows.filter(r=>r.errors.length).length,newLocations,newOperations};
}
