import React,{useState} from 'react';
import {Button,Input,Select,Table,Tag,Space,Modal,Checkbox,Radio,Steps,Empty,Typography,Grid,List,Dropdown,Card,Form,Alert,ConfigProvider,App as AntApp} from 'antd';
import {PlusOutlined,DownloadOutlined,ArrowLeftOutlined,DownOutlined,UploadOutlined,MoreOutlined,DeleteOutlined,SearchOutlined} from '@ant-design/icons';
import dayjs from 'dayjs';
import {LIST_THEME,ListValue,recordInteraction,useListPagination} from './list-ui';
import {siteState} from './site-state';
import {exportSites} from './export';
import {SiteDetail} from './detail';
import {useCurrentDate} from './current-date';
import {ImportDialog} from './import-dialog';
function ProjectSummary({projects=[]}){
 const values=Array.isArray(projects)?projects:[];if(!values.length)return <span className="muted">—</span>;
 return <div className="project-summary" title={values.join('、')}>{values.slice(0,2).map((name,i)=><div className="project-line" key={name}><span className="project-name">{name}</span>{i===1&&values.length>2&&<Tag className="project-more">+{values.length-2}</Tag>}</div>)}</div>;
}
export function Manager({engine,view,go,active,version,message}){
 const {modal}=AntApp.useApp();
 const date=useCurrentDate(),screens=Grid.useBreakpoint();const [query,setQuery]=useState(''),[region,setRegion]=useState(),[status,setStatus]=useState(),[place,setPlace]=useState(),[project,setProject]=useState(),[selected,setSelected]=useState([]),[exportOpen,setExportOpen]=useState(false),[types,setTypes]=useState(['locations']),[format,setFormat]=useState('kml'),[busy,setBusy]=useState(false),[importKind,setImportKind]=useState(null);
 const records=engine?.getRecords()||{locations:[],operations:[],deployments:[],habitats:[]};
 const rows=records.locations.map(r=>({...r,key:r.id,...r.data,state:siteState(records.operations,'山西',r.data.loc_code,date)}));
 const current=rows.find(r=>r.id===view.id),list=view.kind==='list';
 const filtered=rows.filter(r=>(!query||[r.loc_code,r.loc_alias,r.loc_place].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))&&(!region||r.loc_region===region)&&(!status||r.state.location_status===status)&&(!place||r.loc_place===place)&&(!project||(r.loc_projects||[]).includes(project)));
 const pagination=useListPagination(filtered.length,JSON.stringify([query,region,status,place,project]),'个');
 async function download(){setBusy(true);try{
  const name='相机位点_'+dayjs().format('YYYYMMDD_HHmmss')+'.zip';
  const handle=window.showSaveFilePicker?await window.showSaveFilePicker({suggestedName:name,types:[{description:'ZIP 压缩包',accept:{'application/zip':['.zip']}}]}):null;
  const blob=await exportSites(rows.filter(r=>selected.includes(r.id)),types,format);
  if(handle){const stream=await handle.createWritable();try{await stream.write(blob);await stream.close();}catch(e){await stream.abort().catch(()=>{});throw e;}}
  else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  message.success('位点压缩包已生成');setExportOpen(false);
 }catch(e){if(e.name!=='AbortError')message.error(e.message||'导出失败，请重试');}finally{setBusy(false);}}
 async function open(row){try{await engine.openLocation(row.id);go({kind:'detail',id:row.id});}catch{message.error('读取位点资料失败，请重试');}}
 async function addOperation(row){if(!row)return;try{await engine.openLocation(row.id);engine.newRecord('operation');go({kind:'edit',id:row.id,page:'operation'});}catch{message.error('无法打开操作表单，请重试');}}
 async function edit(page,recordId){try{
  if(page==='deployment'&&!recordId)return;
  if(page==='location')await engine.openLocation(current.id);
  else if(recordId){if(page==='operation')engine.editOperation(recordId);if(page==='deployment')engine.editDeployment(recordId);if(page==='habitat')engine.editHabitat(recordId);}
  else engine.newRecord(page);
  go({kind:'edit',id:current.id,page,recordId,returnKind:view.kind==='site-info'?'site-info':'detail'});
 }catch{message.error('无法打开记录，请重试');}}
 function removeCurrent(){
  const target=current;if(!target)return;
  const operations=records.operations.filter(r=>r.site_code===target.loc_code).length,periods=records.deployments.filter(r=>r.site_code===target.loc_code).length,habitats=records.habitats.filter(r=>r.site_code===target.loc_code).length;
  modal.confirm({title:`删除位点 ${target.loc_code}？`,content:<><p>位点将从列表移除，不能再新增记录。</p><p>保留 {operations} 条操作、{periods} 个周期、{habitats} 条调查及全部附件；此操作不代表现场撤机，编号不再复用。</p></>,okText:'删除位点',cancelText:'取消',okButtonProps:{danger:true},onOk:close=>{try{engine.deleteLocation(target.id);close();setSelected(ids=>ids.filter(id=>id!==target.id));go({kind:'list'});message.success('位点已删除，历史记录已保留');}catch(e){message.error(e.message);}}});
 }
 const editTitle=view.kind==='edit'?view.page==='deployment'?'补充故障与时间校准':`${view.recordId?'修改':'新增'}${({location:'位点信息',habitat:'生境调查',operation:'操作'})[view.page]}`:null;
 const rowInteraction=row=>recordInteraction(()=>open(row),`查看位点 ${row.loc_code}`);
 const latest=row=>records.operations.filter(r=>r.site_code===row.loc_code&&r.operation_date<=date).sort((a,b)=>b.operation_date.localeCompare(a.operation_date)||b.sequence-a.sequence)[0];
 return <ConfigProvider theme={list||['detail','site-info'].includes(view.kind)?LIST_THEME:undefined}><div className={list?'site-list-view monitoring-list':['detail','site-info'].includes(view.kind)?'monitoring-list':undefined}><div className="manager-heading redesigned-heading"><div>{list?<Typography.Title level={3} style={{margin:0}}>相机位点</Typography.Title>:<><Typography.Text type="secondary">野外监测 / 相机位点{current?` / ${current.loc_code}`:''}</Typography.Text><h1>{list?'相机位点':view.kind==='create'?'新建位点':editTitle||(view.kind==='site-info'?`${current?.loc_code} · 位点信息`:current?.loc_code)}</h1><p className="manager-sub">{list?`${rows.length} 个位点 · ${rows.filter(r=>r.state.camera_count).length} 个启用 · ${rows.reduce((n,r)=>n+r.state.camera_count,0)} 台相机在位`:current?[current.loc_alias,current.loc_region,current.loc_place].filter(Boolean).join(' · '):'填写位点信息，完成首次安装登记'}</p></>}</div>
 <Space wrap>{list?<><Dropdown menu={{items:[{key:'locations',label:'导入位点'},{key:'operations',label:'导入操作记录'}],onClick:({key})=>setImportKind(key)}} trigger={['click']}><Button icon={<UploadOutlined/>}>批量导入 <DownOutlined/></Button></Dropdown><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{engine.newLocation();go({kind:'create',step:0});}}>新建位点</Button></>:view.kind==='site-info'?<><Button aria-label="返回位点详情" icon={<ArrowLeftOutlined/>} onClick={()=>go({kind:'detail',id:current.id})}>返回位点详情</Button><Button onClick={()=>edit('location',current.id)}>修改位点信息</Button></>:view.kind==='detail'?<><Button icon={<ArrowLeftOutlined/>} onClick={()=>go({kind:'list'})}>位点列表</Button><Button type="primary" icon={<PlusOutlined/>} onClick={()=>addOperation(current)}>新增操作</Button><Dropdown trigger={['click']} menu={{items:[{key:'delete',label:'删除位点',danger:true,icon:<DeleteOutlined/>}],onClick:removeCurrent}}><Button icon={<MoreOutlined/>} aria-label="更多位点操作"/></Dropdown></>:<><Button onClick={()=>engine.fillExample()} hidden={view.kind!=='create'}>填入演示数据</Button><Button onClick={()=>go(view.kind==='edit'?{kind:view.returnKind||'detail',id:view.id}:{kind:'list'})}>取消</Button></>}</Space></div>
 {list&&<section className="site-list-panel">
 <Card size="small" title="筛选条件" className="site-filter-card" extra={<Button type="link" size="small" disabled={!(query||region||status||place||project)} onClick={()=>{setQuery('');setRegion();setStatus();setPlace();setProject();}}>重置筛选</Button>}>
 <Form layout="vertical" component={false}><div className="site-filter-grid manager-filters">
 <Form.Item label="区域"><Select aria-label="筛选区域" placeholder="全部区域" allowClear showSearch value={region} onChange={setRegion} options={[...new Set(rows.map(r=>r.loc_region))].map(value=>({value,label:value}))}/></Form.Item>
 <Form.Item label="小地名"><Select aria-label="筛选小地名" showSearch optionFilterProp="label" placeholder="全部小地名" allowClear value={place} onChange={setPlace} options={[...new Set(rows.map(r=>r.loc_place).filter(Boolean))].sort().map(value=>({value,label:value}))}/></Form.Item>
 <Form.Item label="项目"><Select aria-label="筛选项目" showSearch optionFilterProp="label" placeholder="全部项目" allowClear value={project} onChange={setProject} options={[...new Set(rows.flatMap(r=>r.loc_projects||[]))].map(value=>({value,label:value}))}/></Form.Item>
 <Form.Item label="关键词" className="site-filter-keyword"><Input aria-label="搜索位点" prefix={<SearchOutlined/>} placeholder="编号、别名、小地名…" allowClear value={query} onChange={e=>setQuery(e.target.value)}/></Form.Item>
 <Form.Item label="状态"><Select aria-label="筛选状态" placeholder="全部状态" allowClear value={status} onChange={setStatus} options={[{value:'active',label:'启用'},{value:'inactive',label:'停用'}]}/></Form.Item>
 </div></Form></Card>
 <Card size="small" className="site-record-card" title={<Space size={6}>位点记录<Typography.Text type="secondary">{filtered.length} 个</Typography.Text></Space>} extra={<Button size="small" icon={<DownloadOutlined/>} disabled={!selected.length} onClick={()=>setExportOpen(true)}>导出{selected.length?`（${selected.length}）`:''}</Button>}>
 {selected.length>0&&<Alert type="info" showIcon className="site-selection-alert" message={<div className="site-selection-summary"><span>已选择 {selected.length} 个位点</span><Button type="link" size="small" onClick={()=>setSelected([])}>取消选择</Button></div>}/>}
 {screens.md===false?<List className="mobile-sites" dataSource={filtered} rowKey="id" pagination={{...pagination,size:'small'}} locale={{emptyText:'没有符合条件的位点'}} renderItem={r=><List.Item><article className="mobile-site" {...rowInteraction(r)}><div className="mobile-record-heading"><Checkbox aria-label={'选择位点 '+r.loc_code} checked={selected.includes(r.id)} onChange={e=>setSelected(e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}/><Button type="link" onClick={()=>open(r)}>{r.loc_code}</Button><Tag color={r.state.camera_count?'green':'default'}>{r.state.camera_count?'启用':'停用'}</Tag></div><p className="manager-sub site-location" title={[r.loc_region,r.loc_place].filter(Boolean).join(' - ')}>{[r.loc_region,r.loc_place].filter(Boolean).join(' - ')||'—'}</p>{r.loc_alias&&<p className="manager-sub">{r.loc_alias}</p>}<div className="mobile-projects"><span className="muted">项目</span><ProjectSummary projects={r.loc_projects}/></div><div className="mobile-site-footer"><span>{({none:'无布设',single:'单侧',paired:'对拍',unclassified:'待核查'})[r.state.deployment_type]}</span><Button type="link" onClick={()=>addOperation(r)}>新增记录</Button></div></article></List.Item>}/>:<Table className="site-proportional-table" size="small" onRow={rowInteraction} tableLayout="fixed" style={{width:'100%'}} dataSource={filtered} rowKey="id" rowSelection={{selectedRowKeys:selected,onChange:setSelected,columnWidth:'4%'}} pagination={pagination} locale={{emptyText:<Empty description={rows.length?'没有符合条件的位点':'暂无位点，点击“新建位点”开始'}/>}} columns={[
 {title:'位点',dataIndex:'loc_code',width:'15%',render:(text,row)=><><Button className="site-code-link" type="link" onClick={()=>open(row)}><ListValue>{text}</ListValue></Button>{row.loc_alias&&<small className="cell-sub">{row.loc_alias}</small>}</>},
 {title:'位置',width:'18%',render:(_,r)=><span className="site-location" title={[r.loc_region,r.loc_place].filter(Boolean).join(' - ')}>{[r.loc_region,r.loc_place].filter(Boolean).join(' - ')||'—'}</span>},
 {title:'项目',width:'20%',render:(_,r)=><ProjectSummary projects={r.loc_projects}/>},
 {title:'当前状态',width:'15%',render:(_,r)=><><Tag color={r.state.camera_count?'green':'default'}>{r.state.camera_count?'启用':'停用'}</Tag><span>{({none:'无布设',single:'单侧',paired:'对拍',unclassified:'待核查'})[r.state.deployment_type]}</span></>},
 {title:'最近操作',width:'14%',render:(_,r)=>{const op=latest(r);return op?<><ListValue>{op.operation_date}</ListValue><small className="cell-sub">{op.operation_type} · {op.data.op_people}</small></>:<span className="muted">暂无操作</span>;}},
 {title:'操作',width:'14%',render:(_,r)=><Space wrap size={4}><Button type="link" onClick={()=>addOperation(r)}>新增记录</Button></Space>}
 ]}/>}</Card></section>}
 {view.kind==='create'&&<Steps className="create-steps" size="small" current={view.step} items={[{title:'位点信息'},{title:'首次安装'},{title:'完成'}]}/>}
 {['detail','site-info'].includes(view.kind)&&current&&<SiteDetail key={current.id} row={current} records={records} onEdit={edit} version={version} mode={view.kind==='site-info'?'full':'summary'} onOpenSite={()=>go({kind:'site-info',id:current.id})}/>}
 {importKind&&<ImportDialog key={importKind} kind={importKind} engine={engine} onClose={()=>setImportKind(null)}/>}
 <Modal title="导出位点" open={exportOpen} onCancel={()=>setExportOpen(false)} onOk={download} confirmLoading={busy} okButtonProps={{disabled:!types.length}} okText="生成并下载 ZIP" cancelText="取消"><p>已选择 {selected.length} 个位点</p><Checkbox.Group value={types} onChange={setTypes} options={[{value:'locations',label:'位点坐标'},{value:'tracks',label:'轨迹原文件'},{value:'photos',label:'照片原文件'}]}/>{types.includes('locations')&&<div className="export-format"><p>位点坐标格式</p><Radio.Group value={format} onChange={e=>setFormat(e.target.value)} options={[{value:'kml',label:'KML'},{value:'kmz',label:'KMZ'}]}/><p className="manager-sub">KML 是地理标记文件；KMZ 是压缩后的 KML。</p></div>}<p className="manager-sub">轨迹和照片保持原文件格式，按位点分文件夹打包。</p></Modal></div></ConfigProvider>;
}
