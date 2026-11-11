import React,{useState} from 'react';
import {Button,Input,Select,Table,Tag,Space,DatePicker,Modal,Checkbox,Radio,Steps,Empty,Typography} from 'antd';
import {PlusOutlined,DownloadOutlined,ArrowLeftOutlined,EnvironmentOutlined} from '@ant-design/icons';
import dayjs from 'dayjs';
import {siteState} from './site-state';
import {exportSites} from './export';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function Manager({engine,view,go,active,version,message}){
 const [query,setQuery]=useState(''),[region,setRegion]=useState(),[status,setStatus]=useState(),[date,setDate]=useState(today()),[selected,setSelected]=useState([]),[exportOpen,setExportOpen]=useState(false),[types,setTypes]=useState(['locations']),[format,setFormat]=useState('kml'),[busy,setBusy]=useState(false);
 const records=engine?.getRecords()||{locations:[],operations:[],deployments:[]};
 const rows=records.locations.map(r=>({...r,key:r.id,...r.data,state:siteState(records.operations,'山西',r.data.loc_code,date)}));
 const current=rows.find(r=>r.id===view.id);
 const filtered=rows.filter(r=>(!query||[r.loc_code,r.loc_alias,r.loc_place].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))&&(!region||r.loc_region===region)&&(!status||r.state.location_status===status));
 async function download(){
  setBusy(true);
  try{
   const name='相机位点_'+dayjs().format('YYYYMMDD_HHmmss')+'.zip';
   const handle=window.showSaveFilePicker?await window.showSaveFilePicker({suggestedName:name,types:[{description:'ZIP 压缩包',accept:{'application/zip':['.zip']}}]}):null;
   const blob=await exportSites(rows.filter(r=>selected.includes(r.id)),types,format);
   if(handle){const stream=await handle.createWritable();try{await stream.write(blob);await stream.close();}catch(e){await stream.abort().catch(()=>{});throw e;}}
   else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
   message.success('位点压缩包已生成');setExportOpen(false);
  }catch(e){if(e.name!=='AbortError')message.error(e.message||'导出失败，请重试');}finally{setBusy(false);}
 }
 const open=async row=>{try{await engine.openLocation(row.id);go({kind:'detail',id:row.id});}catch(e){message.error('读取位点附件失败，请重试');}};
 const list=view.kind==='list';
 return <><div className="manager-heading"><div><Typography.Text type="secondary">野外监测 / 相机位点</Typography.Text><h1>{list?'相机位点':view.kind==='create'?'新增位点':`位点 ${current?.loc_code||''}`}</h1><p className="manager-sub">{list?'管理监测位点、现场调查及相机布设记录':current?[current.loc_region,current.loc_place].filter(Boolean).join(' · '):'建立位点信息并记录首次相机操作'}</p></div><Space wrap>{!list?<Button icon={<ArrowLeftOutlined/>} onClick={()=>go({kind:'list'})}>返回列表</Button>:<><Button icon={<DownloadOutlined/>} disabled={!selected.length} onClick={()=>setExportOpen(true)}>导出位点{selected.length?`（${selected.length}）`:''}</Button><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{engine.newLocation();go({kind:'create',step:0});}}>新增位点</Button></>}</Space></div>
 {list&&<><div className="manager-metrics">{[['全部位点',rows.length],['启用位点',rows.filter(r=>r.state.camera_count>0).length],['在位相机',rows.reduce((n,r)=>n+r.state.camera_count,0)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><section className="manager-panel"><div className="manager-filters"><Input.Search aria-label="搜索位点" placeholder="搜索位点编号、别名或小地名" allowClear value={query} onChange={e=>setQuery(e.target.value)} style={{width:280}}/><Select aria-label="筛选区域" placeholder="全部区域" allowClear value={region} onChange={setRegion} options={[...new Set(rows.map(r=>r.loc_region))].map(value=>({value,label:value}))} style={{width:150}}/><Select aria-label="筛选状态" placeholder="全部状态" allowClear value={status} onChange={setStatus} options={[{value:'active',label:'启用'},{value:'inactive',label:'停用'}]} style={{width:130}}/><Space><span>状态日期</span><DatePicker aria-label="状态日期" allowClear={false} value={dayjs(date)} onChange={v=>v&&setDate(v.format('YYYY-MM-DD'))}/></Space></div><Table dataSource={filtered} rowKey="id" rowSelection={{selectedRowKeys:selected,onChange:setSelected}} pagination={{pageSize:10,showTotal:n=>`共 ${n} 个位点`}} scroll={{x:960}} locale={{emptyText:<Empty description={rows.length?'没有符合筛选条件的位点':'暂无位点，点击“新增位点”开始录入'}/>}} columns={[
 {title:'位点编号',dataIndex:'loc_code',render:(text,row)=><Button type="link" onClick={()=>open(row)}>{text}</Button>},
 {title:'别名 / 小地名',render:(_,r)=>[r.loc_alias,r.loc_place].filter(Boolean).join(' / ')||'—'},
 {title:'区域',dataIndex:'loc_region'},{title:'关联项目',render:(_,r)=>(r.loc_projects||[]).join('、')||'—'},
 {title:'在位相机',render:(_,r)=>r.state.camera_count},
 {title:'布设类型',render:(_,r)=>({none:'无布设',single:'单侧',paired:'对拍',unclassified:'待核查'}[r.state.deployment_type])},
 {title:'状态',render:(_,r)=><Tag color={r.state.camera_count?'green':'default'}>{r.state.camera_count?'启用':'停用'}</Tag>},
 {title:'首次布设',dataIndex:'loc_date'},{title:'操作',render:(_,r)=><Button type="link" onClick={()=>open(r)}>查看详情</Button>} ]}/></section></>}
 {view.kind==='create'&&<Steps className="create-steps" size="small" current={view.step} items={[{title:'位点信息'},{title:'操作记录'},{title:'完成'}]}/>}
 {view.kind==='detail'&&<><div className="detail-tabs">{[['location','位点信息'],['operation','操作记录'],['deployment','布设周期']].map(([key,label])=><Button key={key} type={active===key||active==='habitat'&&key==='location'?'primary':'default'} onClick={()=>{engine.navigate(key);}}>{label}</Button>)}</div>{active==='operation'&&<section className="manager-panel record-list"><div className="record-toolbar"><h2>操作历史</h2><Button icon={<PlusOutlined/>} onClick={()=>engine.newRecord('operation')}>新增操作</Button></div><Table size="small" rowKey="id" pagination={{pageSize:5}} scroll={{x:600}} dataSource={records.operations.filter(r=>r.site_code===current?.loc_code).sort((a,b)=>b.operation_date.localeCompare(a.operation_date)||b.sequence-a.sequence)} columns={[{title:'操作日期',dataIndex:'operation_date'},{title:'相机编号',dataIndex:'camera_code'},{title:'操作类型',dataIndex:'operation_type'},{title:'操作人员',render:(_,r)=>r.data.op_people},{title:'操作',render:(_,r)=><Button type="link" onClick={()=>engine.editOperation(r.id)}>查看 / 修改</Button>}]}/></section>}{active==='deployment'&&<section className="manager-panel record-list"><div className="record-toolbar"><h2>周期历史</h2><Button icon={<PlusOutlined/>} onClick={()=>engine.newRecord('deployment')}>新增周期</Button></div><Table size="small" rowKey="id" pagination={{pageSize:5}} scroll={{x:600}} dataSource={records.deployments.filter(r=>r.site_code===current?.loc_code)} columns={[{title:'相机编号',dataIndex:'camera_code'},{title:'开始日期',dataIndex:'start_date'},{title:'回收日期',dataIndex:'end_date'},{title:'故障段',render:(_,r)=>(r.fault_intervals||[]).length},{title:'操作',render:(_,r)=><Button type="link" onClick={()=>engine.editDeployment(r.id)}>查看 / 修改</Button>}]}/></section>}</>}
 <Modal title="导出位点" open={exportOpen} onCancel={()=>setExportOpen(false)} onOk={download} confirmLoading={busy} okButtonProps={{disabled:!types.length}} okText="生成并下载 ZIP" cancelText="取消"><p>已选择 {selected.length} 个位点</p><Checkbox.Group value={types} onChange={setTypes} options={[{value:'locations',label:'位点坐标'},{value:'tracks',label:'轨迹原文件'},{value:'photos',label:'照片原文件'}]}/>{types.includes('locations')&&<div className="export-format"><p>位点坐标格式</p><Radio.Group value={format} onChange={e=>setFormat(e.target.value)} options={[{value:'kml',label:'KML'},{value:'kmz',label:'KMZ'}]}/><p className="manager-sub">KML 是地理标记文件；KMZ 是压缩后的 KML。奥维和两步路通常支持两种格式，具体导入入口和版本请以应用为准。</p></div>}<p className="manager-sub">轨迹和照片保持原文件格式，按位点分文件夹打包。</p></Modal></>;
}
