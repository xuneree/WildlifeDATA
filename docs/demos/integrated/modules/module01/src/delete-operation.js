import {deriveCycles} from './cycles.js';
const hasFacts=p=>p.details_recorded||p.fault_intervals?.length||p.first_recorded||p.first_actual||p.time_calibration!=null;
export function prepareOperationDeletion(snapshot,id,{group='山西',actor='demo-user',now=new Date().toISOString(),auditId=crypto.randomUUID(),expected}={}){
 const target=snapshot.operations.find(r=>r.id===id&&r.group===group);
 if(!target)throw Error('该操作记录已删除或不存在，请刷新列表');
 if(expected&&JSON.stringify(expected)!==JSON.stringify(target))throw Error('该操作记录已更新，请刷新后重新删除');
 const operations=snapshot.operations.filter(r=>r!==target);
 const deployments=deriveCycles(operations,snapshot.deployments).flatMap(p=>{
  if(p.start_operation_id!==target.id||p.relation_status==='linked')return [p];
  return hasFacts(p)?[{...p,needs_review:true,source:'operation_deleted',deleted_operation_id:target.id,review_reason:'起始操作已删除，保留已填写的周期信息'}]:[];
 });
 const before={operation:target,deployments:snapshot.deployments.filter(p=>p.start_operation_id===id||p.end_operation_id===id)};
 const audit=[...snapshot.audit,{id:auditId,group,entity_type:'camera_operation',entity_id:id,action:'delete_operation_and_cycles',actor_id:actor,created_at:now,before}];
 return {operations,deployments,audit};
}
