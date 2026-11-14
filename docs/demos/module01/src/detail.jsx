import React,{useEffect,useState} from 'react';
import {Button,Descriptions,Space,Tag,Empty,Image,Alert,Table,Tabs,Drawer,Card,Select,Collapse,List,Grid} from 'antd';
import {PlusOutlined,EditOutlined,DownloadOutlined} from '@ant-design/icons';
import {coordinate,operationV42,habitatV42,hasSidePir} from './field-v42';
import {loadLocationFiles} from './files';
import {ListValue,recordInteraction,useListPagination} from './list-ui';
const text=v=>v===null||v===undefined||v===''?'—':Array.isArray(v)?v.join('、')||'—':String(v);
function Facts({items,column={xs:1,sm:2}}){return <Descriptions size="small" column={column} items={items.map(([label,children])=>({key:label,label,children:text(children)}))}/>;}
function Attachments({id,version}){
 const [state,setState]=useState({files:[],error:false});const [retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true,urls=[];loadLocationFiles(id).then(data=>{const files=Object.entries(data).flatMap(([kind,list])=>list.map(file=>{const url=URL.createObjectURL(file);urls.push(url);return{kind,file,url};}));if(alive)setState({files,error:false});else urls.forEach(URL.revokeObjectURL);}).catch(()=>{if(alive)setState({files:[],error:true});});return()=>{alive=false;urls.forEach(URL.revokeObjectURL);};},[id,version,retry]);
 if(state.error)return <Alert type="error" message="现场资料读取失败" action={<Button size="small" onClick={()=>setRetry(n=>n+1)}>重试</Button>}/>;
 return <div className="detail-attachments"><div><h3>轨迹文件</h3>{state.files.filter(r=>r.kind==='loc_tracks').map(({file,url})=><p key={url}><a href={url} download={file.name}><DownloadOutlined/> {file.name}</a></p>)}{!state.files.some(r=>r.kind==='loc_tracks')&&<p className="manager-sub">未上传轨迹</p>}</div><div><h3>位点照片</h3><div className="photo-strip"><Image.PreviewGroup>{state.files.filter(r=>r.kind==='loc_photos').map(({file,url})=><div key={url}><Image width={150} height={90} style={{objectFit:'cover'}} src={url} alt={file.name}/><a href={url} download={file.name}>{file.name}</a></div>)}</Image.PreviewGroup></div>{!state.files.some(r=>r.kind==='loc_photos')&&<p className="manager-sub">未上传照片</p>}</div></div>;
}
function PeriodFacts({record}){return <><Facts items={[
 ['故障时间',record.fault_intervals?.length?`${record.fault_intervals.length} 段`:'无已记录故障段'],
 ['时间校准',record.time_calibration?.offset_seconds!=null?`${record.time_calibration.offset_seconds>=0?'+':''}${record.time_calibration.offset_seconds} 秒`:'未填写'],
 ['首条视频相机时间',record.first_recorded?.replace('T',' ')],['实际时间',record.first_actual?.replace('T',' ')]
 ]}/>{record.fault_intervals?.map((f,i)=><div className="fault-fact" key={i}><Tag color="orange">故障 {i+1}</Tag><span>{f.start} → {f.end}</span><span>{f.reason||'—'}</span></div>)}</>;}
const stateColor={正常:'green',关机:'orange',损坏:'red',丢失:'red',倒了:'orange',其他:'orange'};
function OperationFacts({row}){const d=operationV42(row.data);return <><Facts items={[
 ['位点',row.site_code],['相机编号',row.camera_code],['操作类型',row.operation_type],['操作日期',row.operation_date],['操作批次',d.op_batch],['操作人员',d.op_people],['记录人员',d.op_recorder]
 ]}/>{row.operation_type==='安装'?<><h3 className="drawer-subtitle">相机信息</h3><Facts items={[
 ['相机型号',d.op_model],['条形码',d.op_barcode],['拍摄模式',d.configuration_snapshot?.mode||d.op_mode],['视频时长（秒）',d.configuration_snapshot?.video_seconds],['连拍张数',d.configuration_snapshot?.photo_count],['拍摄间隔（秒）',d.configuration_snapshot?.interval_seconds],['灵敏度',d.configuration_snapshot?.sensitivity],...(hasSidePir(d.op_model)?[['侧边PIR是否打开（A323型号相机）',d.configuration_snapshot?.side_pir==null?'未记录':d.configuration_snapshot.side_pir?'是':'否']]:[])
 ]}/></>:<><h3 className="drawer-subtitle">现场状态与操作</h3><Facts items={[
 ['相机状态',d.op_status],['其他相机状态',d.op_status_other],['相机设置与拍摄情况',d.op_issues],['相机设置有误说明',d.op_settings_notes],['触发异常说明',d.op_trigger_notes],['其他情况说明',d.op_issue_notes],...(row.operation_type==='检查'?[['操作内容',d.op_actions],['其他操作说明',d.op_action_other],['备注',d.op_notes]]:[['撤回原因',d.op_withdraw_reason]])
 ]}/></>}</>;}
function HabitatFacts({row}){const d=habitatV42(row.data);return <><Facts items={[
 ['调查日期',d.hab_date],['调查人员',d.hab_people],['记录人员',d.hab_recorder]
 ]}/><h3 className="drawer-subtitle">植被信息</h3>{d.hab_vegetation_unobserved?<Tag>未调查</Tag>:<div className="vegetation-facts"><Facts column={{xs:1,sm:3}} items={[
 ['乔木层高度（m）',d.hab_tree_height],['乔木层郁闭度',d.hab_tree_cover],['森林起源',d.hab_origin]
 ]}/><Facts column={{xs:1,sm:3}} items={[
 ['灌木层高度（m）',d.hab_shrub_height],['灌木层盖度',d.hab_shrub_cover]
 ]}/><Facts column={{xs:1,sm:3}} items={[
 ['草本层高度（cm）',d.hab_grass_height],['草本层盖度',d.hab_grass_cover],['草本层类型',d.hab_grass_type]
 ]}/></div>}<h3 className="drawer-subtitle">动物痕迹</h3>{d.hab_animal_unobserved?<Tag>未调查</Tag>:(d.animals||[]).length?d.animals.map((a,i)=><p key={i}>{a.species} · {text(a.signs)}</p>):'未记录动物痕迹'}<h3 className="drawer-subtitle">人为干扰</h3>{d.hab_disturb_unobserved?<Tag>未调查</Tag>:<>{text(d.hab_disturb)}{d.hab_disturb_other?' · '+d.hab_disturb_other:''}</>}</>;}
function AttachmentCounts({id,version}){
 const [counts,setCounts]=useState(null);
 useEffect(()=>{let alive=true;setCounts(null);loadLocationFiles(id).then(files=>{if(alive)setCounts({tracks:files.loc_tracks?.length||0,photos:files.loc_photos?.length||0});}).catch(()=>{if(alive)setCounts({error:true});});return()=>{alive=false;};},[id,version]);
 return <span aria-live="polite">{!counts?'读取中…':counts.error?'资料读取失败':`${counts.tracks} 个轨迹 · ${counts.photos} 张照片`}</span>;
}
export function SiteDetail({row,records,onEdit,version,mode='summary',onOpenSite,onDelete}){
 const d=row.data,screens=Grid.useBreakpoint();const [tab,setTab]=useState('operations');const [camera,setCamera]=useState();const [drawer,setDrawer]=useState(null);
 const operations=records.operations.filter(r=>r.site_code===d.loc_code).sort((a,b)=>b.operation_date.localeCompare(a.operation_date)||(b.sequence||0)-(a.sequence||0));
 const allPeriods=records.deployments.filter(r=>r.site_code===d.loc_code);
 const periods=allPeriods.filter(r=>r.relation_status==='linked'&&(!camera||r.camera_code===camera)).sort((a,b)=>b.start_date.localeCompare(a.start_date));
 const unlinked=allPeriods.filter(r=>r.relation_status!=='linked'&&(!camera||r.camera_code===camera));
 const habitats=records.habitats.filter(r=>r.site_code===d.loc_code).sort((a,b)=>b.data.hab_date.localeCompare(a.data.hab_date));
 const cameraOptions=[...new Set([...operations,...allPeriods].map(r=>r.camera_code))].sort().map(value=>({value,label:value}));
 const selected=drawer?.row;
 const edit=(page,id)=>{setDrawer(null);onEdit(page,id);};
 const remove=record=>onDelete(record,()=>setDrawer(null));
 const operationColumns=[
  {title:'操作日期',dataIndex:'operation_date',width:145,render:(v,r)=><><ListValue>{v}</ListValue><small className="cell-sub">批次：{r.data.op_batch||'未填写'}</small></>},
  {title:'相机',dataIndex:'camera_code',width:130,render:v=><ListValue>{v}</ListValue>},
  {title:'类型',dataIndex:'operation_type',width:80,render:v=><Tag color={v==='安装'?'blue':v==='撤回'?'default':'cyan'}>{v}</Tag>},
  {title:'相机状态',width:100,render:(_,r)=>r.operation_type==='安装'?<span className="muted">—</span>:<Tag color={stateColor[r.data.op_status]}>{r.data.op_status||'未记录'}</Tag>},
  {title:'操作内容 / 现场情况',render:(_,r)=><div className="action-summary">{r.operation_type==='安装'?<span>安装相机</span>:r.operation_type==='撤回'?<span>{r.data.op_withdraw_reason||'撤回相机'}</span>:<>{(r.data.op_actions||[]).map(v=><Tag key={v}>{v}</Tag>)}{!(r.data.op_actions||[]).length&&<span className="muted">未记录操作内容</span>}</>}{[...(r.data.op_issues||[]).filter(v=>v!=='无问题'),r.data.op_status_other,r.data.op_settings_notes,r.data.op_trigger_notes,r.data.op_issue_notes,r.data.op_action_other].filter(Boolean).length>0&&<small className="cell-warning">{[...(r.data.op_issues||[]).filter(v=>v!=='无问题'),r.data.op_status_other,r.data.op_settings_notes,r.data.op_trigger_notes,r.data.op_issue_notes,r.data.op_action_other].filter(Boolean).join('、')}</small>}</div>},
  {title:'操作人员',render:(_,r)=>r.data.op_people,width:130},
 ];
 const filteredOperations=operations.filter(r=>!camera||r.camera_code===camera);
 const operationPagination=useListPagination(filteredOperations.length,camera||'');
 const periodPagination=useListPagination(periods.length,camera||'');
 const surveyPagination=useListPagination(habitats.length);
 const viewRow=kind=>record=>recordInteraction(()=>setDrawer({kind,row:record}),`查看${kind==='operation'?'操作记录':kind==='period'?'布设周期':'生境调查'} ${record.operation_date||record.start_date||record.data?.hab_date}`);
 const periodColumns=[
  {title:'相机',dataIndex:'camera_code',width:125,render:v=><ListValue>{v}</ListValue>},
  {title:'布设起止',render:(_,r)=><><span><ListValue>{r.start_date}</ListValue> → <ListValue>{r.end_date||'至今'}</ListValue></span><small className="cell-sub">{r.end_date?'已结束':'等待下一次检查或撤回'}</small></>},
  {title:'周期状态',width:105,render:(_,r)=><Tag color={r.needs_review?'orange':r.end_date?'default':'green'}>{r.needs_review?'需核对':r.end_date?'已结束':'进行中'}</Tag>},
  {title:'故障记录',width:110,render:(_,r)=>r.fault_intervals?.length?<Tag color="orange">{r.fault_intervals.length} 段故障</Tag>:r.details_recorded?'无故障':'未补充'},
  {title:'时间校准',width:100,render:(_,r)=>r.time_calibration?.offset_seconds!=null?`${r.time_calibration.offset_seconds>=0?'+':''}${r.time_calibration.offset_seconds} 秒`:'—'},
 ];
 const detailDrawer=( <Drawer className="monitoring-list" open={!!drawer} onClose={()=>setDrawer(null)} width={660} title={drawer?.kind==='surveys'?'生境调查历史':drawer?.kind==='operation'?`${selected?.operation_date} · ${selected?.operation_type}`:drawer?.kind==='habitat'?'生境调查详情':'布设周期详情'} extra={drawer?.kind==='habitat'?<Space><Button onClick={()=>setDrawer({kind:'surveys'})}>返回调查列表</Button><Button onClick={()=>edit('habitat',selected.id)}>修改调查</Button></Space>:drawer?.kind==='operation'?<Space><Button danger onClick={()=>remove(selected)}>删除操作</Button><Button onClick={()=>edit('operation',selected.id)}>修改操作</Button></Space>:drawer?.kind==='period'&&selected?.end_date&&selected.relation_status==='linked'?<Button onClick={()=>edit('deployment',selected.id)}>补充故障与校准</Button>:null}>
 {drawer?.kind==='operation'&&selected&&<><OperationFacts row={selected}/><h3 className="drawer-subtitle">关联周期</h3>{periods.filter(r=>r.start_operation_id===selected.id||r.end_operation_id===selected.id).map(p=><div className="compact-cycle" key={p.id}><span>{p.start_date} → {p.end_date||'至今'}</span><Tag>{p.start_operation_id===selected.id?'由此操作开启':'由此操作结束'}</Tag><Button type="link" onClick={()=>setDrawer({kind:'period',row:p})}>查看周期</Button></div>)}</>}
 {drawer?.kind==='period'&&selected&&<><Facts items={[
 ['相机编号',selected.camera_code],['布设开始',selected.start_date],['回收日期',selected.end_date||'进行中'],['起始操作',operations.find(r=>r.id===selected.start_operation_id)?.operation_type],['结束操作',operations.find(r=>r.id===selected.end_operation_id)?.operation_type]
 ]}/>{selected.needs_review&&<Alert type="warning" showIcon message={selected.review_reason||"操作日期已变化，请核对故障段是否仍在周期范围内"}/>}<h3 className="drawer-subtitle">故障与时间校准</h3>{selected.details_recorded||selected.fault_intervals?.length?<PeriodFacts record={selected}/>:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={selected.end_date?'尚未补充周期信息':'周期进行中，结束后可补充故障与校准'}/>}</>}
 {drawer?.kind==='habitat'&&selected&&<HabitatFacts row={selected}/>}
 {drawer?.kind==='surveys'&&<><Button onClick={()=>edit('habitat')}>新增调查</Button><Table className="record-table survey-history" size="small" rowKey="id" onRow={viewRow('habitat')} pagination={surveyPagination} dataSource={habitats} columns={[{title:'调查日期',render:(_,r)=><ListValue>{r.data.hab_date}</ListValue>},{title:'调查人员',render:(_,r)=>r.data.hab_people}]} locale={{emptyText:<Empty description="暂无生境调查"/>}}/></>}

 </Drawer>);
 if(mode==='full')return <div className="site-full-information" data-testid="site-information">
 <Card size="small" title="布设信息"><Facts column={{xs:1,sm:2,lg:3}} items={[["位点编号",d.loc_code],["别名",d.loc_alias],["区域",d.loc_region],["小地名",d.loc_place],["网格编号",d.loc_grid_code],["关联项目",d.loc_projects],["设置人员",d.loc_people],["记录人员",d.loc_recorder],["首次布设日期",d.loc_date]]}/></Card>
 <Card size="small" title="地理信息"><Facts column={{xs:1,sm:2,lg:3}} items={[["经度（WGS84）",coordinate(d.loc_lon)],["纬度（WGS84）",coordinate(d.loc_lat)],["海拔（m）",d.loc_elevation],["生境类型",d.loc_habitat==='其他'?d.loc_habitat_other||'其他':d.loc_habitat],["地形位置",d.loc_terrain],["坡向",d.loc_aspect],["坡度（°）",d.loc_slope],["水源距离",d.loc_water]]}/></Card>
 <Card size="small" title="现场资料"><Attachments id={row.id} version={version}/><div className="site-info-note"><Facts column={1} items={[["备注",d.loc_notes]]}/></div></Card>
 <Card size="small" title="生境调查" extra={<Space wrap><Button size="small" onClick={()=>setDrawer({kind:'surveys'})}>查看调查历史</Button><Button size="small" onClick={()=>edit('habitat')}>新增调查</Button></Space>}>
 {habitats.length?<><p className="manager-sub latest-survey-caption">最近一次调查</p><HabitatFacts row={habitats[0]}/></>:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无调查记录"/>}
 </Card>{detailDrawer}</div>;
 return <div className="site-workspace" data-testid="site-detail">

 <div className="workspace-columns"><main className="activity-panel">
 <Tabs activeKey={tab} onChange={setTab} tabBarExtraContent={{right:<Select className="tab-camera-filter" aria-label="筛选相机" value={camera} allowClear placeholder="全部相机" options={cameraOptions} onChange={setCamera}/>}} items={[
  {key:'operations',label:`操作记录 ${filteredOperations.length}`,children:<>{screens.md===false?<List className="mobile-records" dataSource={filteredOperations} rowKey="id" pagination={{...operationPagination,size:'small'}} locale={{emptyText:'暂无操作记录'}} renderItem={r=><List.Item><article className="mobile-operation" {...viewRow('operation')(r)}><div className="mobile-record-heading"><ListValue>{r.operation_date}</ListValue><Tag color={r.operation_type==='安装'?'blue':'default'}>{r.operation_type}</Tag></div><small className="cell-sub">批次：{r.data.op_batch||'未填写'}</small><small className="cell-sub">{r.camera_code} · {r.data.op_people}</small><div className="mobile-operation-focus">{r.operation_type!=='安装'&&<Tag color={stateColor[r.data.op_status]}>{r.data.op_status||'未记录'}</Tag>}{operationColumns[4].render(null,r)}</div></article></List.Item>}/>:<Table className="record-table operation-table" onRow={viewRow('operation')} rowKey="id" size="small" pagination={operationPagination} scroll={{x:850}} dataSource={filteredOperations} columns={operationColumns} locale={{emptyText:<Empty description="暂无操作记录，点击右上角“新增操作”开始"/>}}/>}</>},
  {key:'periods',label:`布设周期 ${periods.length}`,children:<><p className="workspace-note">周期随安装、检查和撤回记录自动生成。选择已结束的周期，可补充故障时间和时间校准。</p><Table className="record-table period-table" onRow={viewRow('period')} rowKey="id" size="small" scroll={{x:800}} pagination={periodPagination} dataSource={periods} columns={periodColumns} locale={{emptyText:<Empty description="保存安装操作后，自动开始第一个周期"/>}}/>{unlinked.length>0&&<Collapse ghost items={[{key:'legacy',label:`待核对的周期记录 ${unlinked.length} 条`,children:<Table className="record-table" onRow={viewRow('period')} rowKey="id" size="small" scroll={{x:800}} dataSource={unlinked} columns={periodColumns}/>}]}/>}</>}
 ]}/></main>
 <aside className="site-context unified-site-context" aria-label="位点信息"><Card title="位点信息" size="small">
 <div className="site-summary-section"><h3>布设信息</h3><Facts column={1} items={[["区域",d.loc_region],["小地名",d.loc_place],["网格编号",d.loc_grid_code],["关联项目",d.loc_projects],["设置人员",d.loc_people],["记录人员",d.loc_recorder],["首次布设",d.loc_date]]}/></div>
 <div className="site-summary-section"><h3>地理信息</h3><Facts column={1} items={[["经纬度",[coordinate(d.loc_lon),coordinate(d.loc_lat)].filter(Boolean).join('，')],["海拔",d.loc_elevation!=null&&d.loc_elevation!==''?`${d.loc_elevation} m`:null],["生境类型",d.loc_habitat==='其他'?d.loc_habitat_other||'其他':d.loc_habitat],["地形 / 坡向",[d.loc_terrain,d.loc_aspect].filter(Boolean).join(' · ')],["坡度",d.loc_slope!=null&&d.loc_slope!==''?`${d.loc_slope}°`:null],["水源距离",d.loc_water]]}/></div>
 <div className="site-summary-brief"><p><span className="muted">现场资料</span><AttachmentCounts id={row.id} version={version}/></p><p><span className="muted">最近调查</span><ListValue>{habitats[0]?.data.hab_date||'暂无调查'}</ListValue></p></div>
 <div className="site-summary-footer"><Button type="link" size="small" onClick={onOpenSite}>查看全部</Button></div>
 </Card>
 </aside></div>
 {detailDrawer}</div>;
}
