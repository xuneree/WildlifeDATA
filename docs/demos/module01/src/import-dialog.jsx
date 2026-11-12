import React,{useRef,useState} from 'react';
import {Modal,Button,Upload,Steps,Alert,Table,Tag,Space,Result,Typography} from 'antd';
import {UploadOutlined,DownloadOutlined} from '@ant-design/icons';
import {importSchemas} from './import-data';
import {readImportWorkbook,templateBuffer,downloadBytes} from './excel';
export function ImportDialog({kind,engine,onClose}){
 const schema=importSchemas[kind];const [file,setFile]=useState(null),[preview,setPreview]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[complete,setComplete]=useState(null),[templateBusy,setTemplateBusy]=useState(false);const raw=useRef([]),working=useRef(false);
 async function check(rows){try{setPreview(engine.previewImport(kind,rows));setError('');}catch(e){setError(e.message);setPreview(null);}}
 async function upload(file){if(working.current)return Upload.LIST_IGNORE;if(!file.name.toLowerCase().endsWith('.xlsx')){setError('请选择 .xlsx 格式的 Excel 文件');setPreview(null);raw.current=[];setFile(file);return Upload.LIST_IGNORE;}working.current=true;setBusy(true);setError('');setPreview(null);setComplete(null);setFile(file);raw.current=[];try{const rows=await readImportWorkbook(kind,file);raw.current=rows;await check(rows);}catch(e){setError(e.message||'文件读取失败，请重新上传');}finally{working.current=false;setBusy(false);}return Upload.LIST_IGNORE;}
 async function commit(){if(working.current||!preview||preview.errorCount)return;working.current=true;setBusy(true);setError('');try{const result=engine.commitImport(kind,raw.current,preview.revision);setComplete(result);}catch(e){setError(e.message||'导入失败，记录未写入，请重试');}finally{working.current=false;setBusy(false);}}
 async function template(){setTemplateBusy(true);try{downloadBytes(await templateBuffer(kind),schema.sheet+'导入模板.xlsx');}catch{setError('模板生成失败，请重试');}finally{setTemplateBusy(false);}}
 return <Modal open title={schema.title} width={920} onCancel={()=>{if(!busy)onClose();}} maskClosable={!busy} closable={!busy} footer={complete?<Button type="primary" onClick={onClose}>完成</Button>:<Space><Button disabled={busy} onClick={onClose}>取消</Button>{raw.current.length>0&&<Button disabled={busy} onClick={()=>check(raw.current)}>重新校验</Button>}<Button type="primary" loading={busy} disabled={!preview||preview.errorCount>0} onClick={commit}>确认导入{preview?` ${preview.validCount} 条`:''}</Button></Space>}>
 <Steps size="small" current={complete?2:preview?1:0} items={[{title:'上传 Excel'},{title:'预校验'},{title:'完成'}]} style={{margin:'20px 0 24px'}}/>
 {complete?<Result status="success" title={`成功导入 ${complete.count} 条${kind==='locations'?'位点':'操作记录'}`} subTitle={kind==='operations'?'操作记录及关联布设周期已同步。':'位点已加入列表，可继续导入操作记录。'}/>:<>
 <Space wrap style={{marginBottom:16}}><Button icon={<DownloadOutlined/>} loading={templateBusy} onClick={template}>下载 Excel 模板</Button><Upload accept=".xlsx" maxCount={1} showUploadList={false} beforeUpload={upload} disabled={busy}><Button icon={<UploadOutlined/>} loading={busy}>选择 Excel 文件</Button></Upload><Typography.Text type="secondary">{file?.name||'支持 .xlsx，最多 1000 条 / 10MB'}</Typography.Text></Space>
 <p className="manager-sub">{kind==='locations'?'按模板填写位点字段，项目可多选；轨迹和照片在位点资料中上传。':'位点须已存在；相机信息与条件字段按操作表单规则填写。导入后自动生成周期。'} 不覆盖已有记录，全部通过预校验后整批导入。</p>
 {error&&<Alert type="error" showIcon message={error} style={{margin:'16px 0'}}/>}
 {preview&&<><Alert type={preview.errorCount?'warning':'success'} showIcon message={`${preview.validCount} 条通过，${preview.errorCount} 条错误${preview.errorCount?'；请修正 Excel 后重新上传':'；确认后开始导入'}`} style={{margin:'16px 0'}}/><Table size="small" rowKey="rowNumber" scroll={{x:680}} pagination={{pageSize:8,showSizeChanger:false}} dataSource={preview.rows} columns={[
 {title:'Excel 行',dataIndex:'rowNumber',width:90},{title:'位点编号',render:(_,r)=>r.data.loc_code||r.data.op_site,width:145},kind==='locations'?{title:'区域',render:(_,r)=>r.data.loc_region,width:100}:{title:'相机 / 类型',render:(_,r)=>`${r.data.op_camera||'—'} · ${r.data.op_type||'—'}`,width:180},
 {title:'日期',width:120,render:(_,r)=>r.data.loc_date||r.data.op_date},
 {title:'结果',width:90,render:(_,r)=><Tag color={r.errors.length?'red':'green'}>{r.errors.length?'错误':'可导入'}</Tag>},{title:'校验说明',render:(_,r)=>r.errors.length?r.errors.join('；'):'通过'}
 ]}/></>}
 </>}
 </Modal>;
}
