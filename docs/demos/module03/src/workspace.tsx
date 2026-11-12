import React, {useMemo, useRef, useState} from 'react';
import {Alert,App,Breadcrumb,Button,Card,Checkbox,Col,DatePicker,Descriptions,Drawer,Empty,Flex,Form,Grid,Input,Layout,Menu,Modal,Radio,Result,Row,Select,Space,Spin,Statistic,Steps,Table,Tag,theme,Tooltip,Typography,Upload} from 'antd';
import type {TableColumnsType} from 'antd';
import {CameraOutlined,DownloadOutlined,FileExcelOutlined,FileTextOutlined,HistoryOutlined,InboxOutlined,MenuFoldOutlined,MenuUnfoldOutlined,SearchOutlined,TagsOutlined,TeamOutlined,UploadOutlined} from '@ant-design/icons';
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import sample from './sample.json';
import {fields,loadDataset,persistDataset,storageKey,uniqueValues,validateGrid,filterRecords} from './data';
import type {Dataset,ImportBatch,ImportIssue,ImportPreview,RecordRow,DataField,Filters as DataFilters} from './data';
const {Header,Sider,Content}=Layout;
const {Text,Title}=Typography;
const seed:RecordRow[]=sample.map((r,i)=>({...r,id:`sample-${i}`}));
type Filters=DataFilters & {dates?:[Dayjs,Dayjs]|null};
type Dialog='import'|'export'|'history'|null;

export function IndividualWorkspace(){
 const {token}=theme.useToken();const {message,notification}=App.useApp();const screens=Grid.useBreakpoint();
 const [dataset,setDataset]=useState<Dataset>(()=>loadDataset(seed));const {history,rows}=dataset;
 const [independentOnly,setIndependentOnly]=useState(false);
 const [collapsed,setCollapsed]=useState(false),[navOpen,setNavOpen]=useState(false);
 const [form]=Form.useForm<Filters>();const [filters,setFilters]=useState<Filters>({});
 const [statIndividual,setStatIndividual]=useState<string>();
 const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[selection,setSelection]=useState<React.Key[]>([]);
 const [detail,setDetail]=useState<RecordRow|null>(null),[dialog,setDialog]=useState<Dialog>(null);
 const [step,setStep]=useState(0),[filename,setFilename]=useState(''),[preview,setPreview]=useState<ImportPreview|null>(null),[importError,setImportError]=useState('');
 const [reading,setReading]=useState(false),[saving,setSaving]=useState(false),[exporting,setExporting]=useState(false),[exportScope,setExportScope]=useState('filtered');
 const readGeneration=useRef(0),importLock=useRef(false);const tableRef=useRef<HTMLDivElement>(null);
 const baseRows=useMemo(()=>filterRecords(rows,{...filters,independentOnly,startDate:filters.dates?.[0]?.format('YYYY-MM-DD'),endDate:filters.dates?.[1]?.format('YYYY-MM-DD')}),[rows,filters,independentOnly]);
 const filtered=useMemo(()=>statIndividual?baseRows.filter(r=>(r.individual||'未编号')===statIndividual):baseRows,[baseRows,statIndividual]);
 const labelCounts=useMemo(()=>{const counts=new Map<string,number>();for(const r of baseRows){const label=r.individual||'未编号';counts.set(label,(counts.get(label)||0)+1);}return [...counts].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));},[baseRows]);
 function toggleStatLabel(label:string){setStatIndividual(current=>current===label?undefined:label);setPage(1);}
 function clearStatLabel(){setStatIndividual(undefined);setPage(1);}
 const activeFilters=Object.values(filters).filter(v=>v!=null&&v!=='').length+(statIndividual?1:0)+(independentOnly?1:0);
 const exportRows=exportScope==='all'?rows:exportScope==='selected'?rows.filter(r=>selection.includes(r.id)):filtered;
 function resetFilters(){form.resetFields();setFilters({});setIndependentOnly(false);setStatIndividual(undefined);setPage(1);}
 function openImport(){readGeneration.current++;setFilename('');setPreview(null);setImportError('');setStep(0);setReading(false);setDialog('import');}
 function closeDialog(){if(!reading&&!saving&&!exporting){readGeneration.current++;setDialog(null);}}
 async function download(records:RecordRow[],name:string){setExporting(true);try{const {downloadExcel}=await import('./excel');downloadExcel(records,name);void message.success(`已生成 Excel，共 ${records.length} 条记录`);return true;}catch{void message.error('文件生成失败，请重试。');return false;}finally{setExporting(false);}}
 async function inspectFile(file:File){if(reading)return;const generation=++readGeneration.current;setFilename(file.name);setImportError('');setPreview(null);setStep(0);if(!/\.xlsx?$/i.test(file.name)){setImportError('请选择 .xlsx 或 .xls 格式的文件。');return;}if(file.size>20*1024*1024){setImportError('文件不能超过 20 MB，请拆分后重新上传。');return;}setReading(true);try{const {readExcel}=await import('./excel');const result=readExcel(await file.arrayBuffer(),rows);if(generation===readGeneration.current){setPreview(result);setStep(1);}}catch(error){if(generation===readGeneration.current)setImportError(error instanceof Error?error.message:'文件读取失败，请检查文件是否损坏或加密。');}finally{if(generation===readGeneration.current)setReading(false);}}
 async function confirmImport(){if(!preview||preview.issues.length||!preview.additions.length||importLock.current)return;importLock.current=true;setSaving(true);setImportError('');try{const checked=validateGrid([fields.map(f=>f[1]),...preview.additions.map(r=>fields.map(([key])=>r[key]))],rows);if(checked.issues.length||checked.duplicates)throw new Error('数据在预检后发生变化，请重新选择文件并校验。');const stored=localStorage.getItem(storageKey);if(stored&&JSON.stringify((JSON.parse(stored) as Dataset).rows)!==JSON.stringify(rows))throw new Error('其他页面已更新数据，请刷新列表后重新导入。');const next:Dataset={rows:[...rows,...checked.additions],history:[{id:crypto.randomUUID(),name:filename,count:checked.additions.length,skipped:preview.duplicates,time:new Date().toISOString()},...history]};persistDataset(next);setDataset(next);setSelection([]);resetFilters();setStep(2);}catch(error){const text=error instanceof Error&&/数据|页面/.test(error.message)?error.message:'保存失败，未新增记录。请检查浏览器可用存储空间后重试。';setImportError(text);notification.error({title:'导入未完成',description:text});}finally{importLock.current=false;setSaving(false);}}
 const independentTag=(r:RecordRow)=><Text type="secondary">{r.independent==='1'?'是':r.independent==='0'?'否':'未填写'}</Text>;
 const columns:TableColumnsType<RecordRow>=[
  {title:'文件名',dataIndex:'file',key:'file',width:300,render:(value,r)=><Tooltip title={value}><Button type="link" onClick={()=>setDetail(r)} style={{padding:0,maxWidth:'100%',textAlign:'left'}}><FileTextOutlined/><span className="filename-text">{value}</span></Button></Tooltip>},
  {title:'个体编号',dataIndex:'individual',width:155,render:value=>value?<Tag color="blue">{value}</Tag>:<Text type="secondary">未编号</Text>},
  {title:'位点',dataIndex:'site',width:85},{title:'相机编号',dataIndex:'camera',width:95},
  {title:'拍摄时间',dataIndex:'date',key:'captured',width:160,sorter:(a,b)=>(a.date+a.time).localeCompare(b.date+b.time),render:(_,r)=><Flex vertical><Text>{r.date}</Text><Text type="secondary">{r.time}</Text></Flex>},
  {title:'回收批次',dataIndex:'period',width:100},{title:'角度',dataIndex:'angle',width:85,render:value=>value||'—'},{title:'性别',dataIndex:'sex',width:72,render:value=>value||'—'},{title:'识别人',dataIndex:'observer',width:80},{title:'独立拍摄',key:'independent',width:110,render:(_,r)=>independentTag(r)},
  {title:'操作',key:'actions',fixed:'right',width:72,render:(_,r)=><Button type="link" size="small" onClick={()=>setDetail(r)}>详情</Button>},
 ];
 const issueColumns:TableColumnsType<ImportIssue>=[{title:'Excel 行号',dataIndex:'row',width:100},{title:'字段',dataIndex:'field',width:110},{title:'原值',dataIndex:'value',width:140,ellipsis:true,render:v=>v||'（空值）'},{title:'问题',dataIndex:'reason',width:300}];
 const previewColumns:TableColumnsType<RecordRow>=[{title:'文件名',dataIndex:'file',width:300,ellipsis:true},{title:'个体编号',dataIndex:'individual',width:140,render:value=>value||'未编号'},{title:'位点',dataIndex:'site',width:80},{title:'拍摄时间',dataIndex:'date',width:170,render:(_,r)=>`${r.date} ${r.time}`}];
 const historyColumns:TableColumnsType<ImportBatch>=[{title:'导入文件',dataIndex:'name',ellipsis:true,width:260},{title:'导入时间',dataIndex:'time',width:180,render:value=>dayjs(value).isValid()?dayjs(value).format('YYYY-MM-DD HH:mm:ss'):value},{title:'新增',dataIndex:'count',width:75},{title:'跳过',dataIndex:'skipped',width:75}];
 const navigation=<Menu mode="inline" selectedKeys={['individuals']} items={[{key:'camera',icon:<CameraOutlined/>,label:'相机位点',disabled:true},{key:'species',icon:<TagsOutlined/>,label:'物种识别',disabled:true},{key:'individuals',icon:<TeamOutlined/>,label:'个体识别'}]} onClick={()=>setNavOpen(false)}/>;
 const filterOptions=(key:DataField)=>uniqueValues(rows,key).map(value=>({value,label:value}));
 const layoutStyle={'--workspace-border':token.colorBorderSecondary,'--workspace-bg':token.colorBgContainer} as React.CSSProperties;
 const importFooter=step===2?<Button type="primary" onClick={()=>{setDialog(null);tableRef.current?.scrollIntoView({block:'start'});}}>查看记录</Button>:<Space><Button onClick={closeDialog} disabled={reading||saving}>取消</Button>{step===1&&<Button type="primary" loading={saving} disabled={!!preview?.issues.length||!preview?.additions.length} onClick={()=>void confirmImport()}>确认导入 {preview?.additions.length||0} 条</Button>}</Space>;
 return <Layout className="workspace-layout" style={layoutStyle}>
  {screens.md&&<Sider className="workspace-sider" theme="light" width={208} collapsedWidth={72} collapsed={collapsed} breakpoint="lg" onBreakpoint={setCollapsed}><div className="workspace-brand"><CameraOutlined style={{color:token.colorPrimary,fontSize:25}}/>{!collapsed&&<div><strong>WildlifeDATA</strong><Text type="secondary" style={{display:'block',fontSize:token.fontSizeSM}}>野生动物监测</Text></div>}</div>{navigation}</Sider>}
  <Layout style={{marginLeft:screens.md?collapsed?72:208:0,minWidth:0}}>
   <Header className="workspace-header"><Button type="text" aria-label="切换导航" icon={collapsed||!screens.md?<MenuUnfoldOutlined/>:<MenuFoldOutlined/>} onClick={()=>screens.md?setCollapsed(v=>!v):setNavOpen(v=>!v)}/><Breadcrumb items={[{title:'监测管理'},{title:'个体识别'}]}/></Header>
   <Content className="workspace-content">
    <Flex justify="space-between" align="center" wrap gap={16} className="workspace-title"><div><Title level={3} style={{margin:0}}>个体识别</Title></div><Space><Button aria-label="下载数据" icon={<DownloadOutlined/>} onClick={()=>{setExportScope('filtered');setDialog('export');}}>下载数据</Button><Button type="primary" aria-label="导入 Excel" icon={<UploadOutlined/>} onClick={openImport}>导入 Excel</Button></Space></Flex>
    <Card title="筛选条件" size="small" extra={<Button type="link" size="small" disabled={!activeFilters} onClick={resetFilters}>重置筛选</Button>}>
     <Form form={form} layout="vertical" onValuesChange={(_,all:Filters)=>{setFilters(all);setStatIndividual(undefined);setPage(1);}}>
      <div className="filter-layout">
<Form.Item className="filter-individual" style={{marginBottom:token.marginXS}} label="个体编号" name="individual"><Select aria-label="个体编号" allowClear showSearch placeholder="全部个体" options={filterOptions('individual')}/></Form.Item>
<Form.Item className="filter-site" style={{marginBottom:token.marginXS}} label="位点" name="site"><Select aria-label="位点" allowClear showSearch placeholder="全部位点" options={filterOptions('site')}/></Form.Item>
<Form.Item className="filter-camera" style={{marginBottom:token.marginXS}} label="相机编号" name="camera"><Select aria-label="相机编号" allowClear showSearch placeholder="全部相机" options={filterOptions('camera')}/></Form.Item>
<Form.Item className="filter-period" style={{marginBottom:token.marginXS}} label="回收批次" name="period"><Select aria-label="回收批次" allowClear showSearch placeholder="全部批次" options={filterOptions('period')}/></Form.Item>
<Form.Item className="filter-dates" style={{marginBottom:token.marginXS}} label="拍摄时间" name="dates"><DatePicker.RangePicker placeholder={['开始日期','结束日期']} format="YYYY-MM-DD" style={{width:'100%'}}/></Form.Item>
<Form.Item className="filter-keyword" style={{marginBottom:token.marginXS}} label="关键词" name="keyword"><Input aria-label="关键词" allowClear prefix={<SearchOutlined/>} placeholder="文件名、个体编号、行为、备注…"/></Form.Item>
<Form.Item className="filter-angle" style={{marginBottom:token.marginXS}} label="角度" name="angle"><Select aria-label="角度" allowClear placeholder="全部角度" options={filterOptions('angle')}/></Form.Item>
<Form.Item className="filter-sex" style={{marginBottom:token.marginXS}} label="性别" name="sex"><Select aria-label="性别" allowClear placeholder="全部性别" options={filterOptions('sex')}/></Form.Item>
<Form.Item className="filter-numbered" style={{marginBottom:token.marginXS}} label="编号情况" name="numbered"><Select aria-label="编号情况" allowClear placeholder="全部记录" options={[{value:'yes',label:'有编号'},{value:'no',label:'未编号'}]}/></Form.Item>
<Form.Item className="filter-observer" style={{marginBottom:token.marginXS}} label="识别人" name="observer"><Select aria-label="识别人" allowClear showSearch placeholder="全部识别人" options={filterOptions('observer')}/></Form.Item>
      </div>
     </Form>
    </Card>
    <div ref={tableRef} className="workspace-table-section" style={{marginTop:token.marginSM}}><Card size="small" title={<Space size={6}>识别记录<Text type="secondary">{filtered.length} 条</Text></Space>} extra={<Space wrap><Button type="text" size="small" aria-label="导入记录" icon={<HistoryOutlined/>} onClick={()=>setDialog('history')}>{screens.md?'导入记录':null}</Button><Checkbox checked={independentOnly} onChange={event=>{setIndependentOnly(event.target.checked);clearStatLabel();}}>仅独立拍摄</Checkbox></Space>}>
     {labelCounts.length>0&&<Flex wrap gap={8} aria-label="个体编号筛选" className="record-label-filters" style={{marginBottom:token.marginSM}}>{labelCounts.map(item=><Button key={item.label} size="small" type={statIndividual===item.label?'primary':'default'} aria-pressed={statIndividual===item.label} aria-label={`筛选个体编号 ${item.label}，${item.count}`} onClick={()=>toggleStatLabel(item.label)}>{item.label}<span style={{opacity:.75}}>{item.count}</span></Button>)}{statIndividual&&<Button type="link" size="small" aria-label="清除标签筛选" onClick={clearStatLabel}>清除</Button>}</Flex>}
     {selection.length>0&&<Alert type="info" showIcon title={<Flex align="center" justify="space-between" wrap gap={8}><span>已选择 {selection.length} 条记录</span><Space><Button type="link" size="small" onClick={()=>setSelection([])}>取消选择</Button><Button size="small" aria-label="下载已选" icon={<DownloadOutlined/>} onClick={()=>{setExportScope('selected');setDialog('export');}}>下载已选</Button></Space></Flex>} style={{marginBottom:token.margin}}/>}
     <Table<RecordRow> rowKey="id" columns={columns} dataSource={filtered} size="small" scroll={{x:1510}} rowSelection={{selectedRowKeys:selection,onChange:setSelection,preserveSelectedRowKeys:true}} pagination={{current:page,pageSize,total:filtered.length,showSizeChanger:true,pageSizeOptions:[10,20,50],showTotal:(total,range)=>total?`共 ${total} 条，显示 ${range[0]}–${range[1]} 条`:'共 0 条',onChange:(next,size)=>{setPage(size!==pageSize?1:next);setPageSize(size);}}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={activeFilters?'没有符合条件的记录':'暂无识别记录'}>{activeFilters?<Button onClick={resetFilters}>重置筛选</Button>:<Button type="primary" onClick={openImport}>导入 Excel</Button>}</Empty>}}/>
    </Card></div>
   </Content>
  </Layout>
  <Drawer title="数据管理" open={navOpen&&!screens.md} placement="left" size={240} onClose={()=>setNavOpen(false)}>{navigation}</Drawer>
  <Drawer title="识别记录详情" open={!!detail} size={screens.md?520:'100%'} onClose={()=>setDetail(null)} focusable={{trap:true,focusTriggerAfterClose:true}} extra={<Button aria-label="下载此记录" icon={<DownloadOutlined/>} loading={exporting} onClick={()=>detail&&void download([detail],'个体识别_单条记录.xlsx')}>下载此记录</Button>}>
   {detail&&<Descriptions column={1} bordered size="small" items={fields.map(([key,label])=>({key,label,children:key==='independent'?independentTag(detail):key==='folder'?<Text copyable style={{wordBreak:'break-all'}}>{detail[key]}</Text>:<span style={{wordBreak:'break-all'}}>{detail[key]||'—'}</span>}))}/>}

  </Drawer>
  <Modal title="导入个体识别数据" open={dialog==='import'} width={screens.md?820:'100%'} onCancel={closeDialog} closable={!reading&&!saving} keyboard={!reading&&!saving} mask={{closable:false}} focusable={{trap:true,focusTriggerAfterClose:true}} destroyOnHidden footer={importFooter}>
   <Steps current={step} size="small" items={[{title:'选择文件'},{title:'数据预检'},{title:'导入结果'}]} style={{marginBlock:token.marginLG}}/>
   {step===0&&<Flex vertical gap={16}><Upload.Dragger accept=".xlsx,.xls" multiple={false} showUploadList={false} disabled={reading} beforeUpload={file=>{void inspectFile(file);return Upload.LIST_IGNORE;}}><InboxOutlined style={{fontSize:40,color:token.colorPrimary}}/><Title level={5}>点击选择或拖拽 Excel 文件</Title><Text type="secondary">支持 .xlsx、.xls，单个文件不超过 20 MB</Text></Upload.Dragger>{reading&&<Space><Spin size="small"/><Text>正在读取并校验 {filename}…</Text></Space>}<Flex justify="space-between" align="center" wrap gap={8}><Text type="secondary">使用标准表头导入，首行为字段名。</Text><Button icon={<DownloadOutlined/>} loading={exporting} onClick={()=>void download([],'个体识别_导入模板.xlsx')}>下载导入模板</Button></Flex><Text type="secondary">字段：{fields.map(f=>f[1]).join('、')}。位点兼容旧表头“位点名称”，回收批次兼容“数据期号”；个体编号允许为空，其他编码保留原值。</Text></Flex>}
   {step===1&&preview&&<Flex vertical gap={16}><Flex justify="space-between" align="center" gap={12}><Space><FileExcelOutlined style={{color:token.colorSuccess,fontSize:24}}/><Text strong>{filename}</Text></Space><Button onClick={()=>{setStep(0);setImportError('');}} disabled={saving}>重新选择</Button></Flex><Row gutter={16}><Col span={8}><Statistic title="待新增记录" value={preview.additions.length} suffix="条"/></Col><Col span={8}><Statistic title="重复记录" value={preview.duplicates} suffix="条"/></Col><Col span={8}><Statistic title="校验问题" value={preview.issues.length} suffix="项" styles={{content:preview.issues.length?{color:token.colorError}:undefined}}/></Col></Row>{preview.issues.length?<><Alert type="error" showIcon title="校验未通过，本批记录尚未导入" description="请根据行号与字段修正原文件，重新选择后校验。"/><Table rowKey="id" size="small" columns={issueColumns} dataSource={preview.issues} pagination={{pageSize:5,showSizeChanger:false,showTotal:total=>`共 ${total} 项问题`}} scroll={{x:650}}/></>:<><Alert type={preview.additions.length?'success':'info'} showIcon title={preview.additions.length?'预检通过，确认后新增记录':'全部记录已存在，无需重复导入'} description={`共读取 ${preview.total} 条，重复 ${preview.duplicates} 条将跳过。不会覆盖已有记录。`}/>{preview.additions.length>0&&<><Text type="secondary">待新增记录预览（前 5 条）</Text><Table rowKey="id" size="small" columns={previewColumns} dataSource={preview.additions.slice(0,5)} pagination={false} scroll={{x:610}}/></>}</>}</Flex>}
   {step===2&&preview&&<Result status="success" title="导入完成" subTitle={`成功新增 ${preview.additions.length} 条记录，跳过 ${preview.duplicates} 条重复记录。`}/>}
   {importError&&<Alert type="error" showIcon role="alert" title="未能完成导入" description={importError} style={{marginTop:token.margin}}/>}
  </Modal>
  <Modal title="下载识别数据" open={dialog==='export'} onCancel={closeDialog} okText={`下载 ${exportRows.length} 条记录`} okButtonProps={{disabled:!exportRows.length,icon:<DownloadOutlined/>}} confirmLoading={exporting} mask={{closable:!exporting}} keyboard={!exporting} closable={!exporting} onOk={async()=>{if(await download(exportRows,`个体识别_${exportScope==='all'?'全部':exportScope==='selected'?'已选':'筛选结果'}_${dayjs().format('YYYYMMDD')}.xlsx`))setDialog(null);}}><Form layout="vertical" style={{marginTop:token.marginLG}}><Form.Item label="下载范围"><Radio.Group value={exportScope} onChange={e=>setExportScope(e.target.value)}><Flex vertical gap={16}><Radio value="filtered">当前筛选结果（{filtered.length} 条）</Radio><Radio value="selected" disabled={!selection.length}>已选择的记录（{selection.length} 条）</Radio><Radio value="all">全部识别记录（{rows.length} 条）</Radio></Flex></Radio.Group></Form.Item><Text type="secondary">Excel 文件包含全部 22 个字段，空值保持为空。</Text></Form></Modal>
  <Modal title="导入记录" open={dialog==='history'} onCancel={closeDialog} footer={<Button onClick={closeDialog}>关闭</Button>} width={screens.md?760:'100%'}><Table rowKey="id" size="small" columns={historyColumns} dataSource={history} pagination={{pageSize:5,showSizeChanger:false}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无导入记录"/>}} scroll={{x:600}}/></Modal>
 </Layout>;
}
