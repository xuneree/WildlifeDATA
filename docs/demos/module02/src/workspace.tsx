import React, {useMemo, useRef, useState} from 'react';
import {Alert,App,Breadcrumb,Button,Card,Checkbox,Col,DatePicker,Descriptions,Drawer,Empty,Flex,Form,Grid,Input,Layout,Menu,Modal,Radio,Result,Row,Select,Space,Spin,Statistic,Steps,Table,Tag,theme,Tooltip,Typography,Upload} from 'antd';
import type {TableColumnsType} from 'antd';
import {CameraOutlined,DownloadOutlined,FileExcelOutlined,FileTextOutlined,HistoryOutlined,InboxOutlined,MenuFoldOutlined,MenuUnfoldOutlined,SearchOutlined,SettingOutlined,TagsOutlined,TeamOutlined,UploadOutlined} from '@ant-design/icons';
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import sample from './sample.json';
import siteDirectory from './site-context.json';
import {siteContextOptions,siteForRecord} from './locations';
import type {SiteContextFilters} from './locations';
import {fields,isIndependentCapture,normalizeRecordLabel,loadDataset,persistDataset,storageKey,uniqueValues,validateGrid} from './data';
import {filterRecords,refineByLabel,summarizeRecords,summarizeLabels} from './statistics';
import type {Dataset,ImportBatch,ImportIssue,ImportPreview,RecordRow} from './data';
const {Header,Sider,Content}=Layout;
const {Text,Title}=Typography;
const seed:RecordRow[]=sample.map((r,i)=>normalizeRecordLabel({...r,id:`sample-${i}`}));
const knownLabels=uniqueValues(seed,'species');
type Filters=SiteContextFilters & {keyword?:string;species?:string;site?:string;camera?:string;period?:string;independent?:boolean;dates?:[Dayjs,Dayjs]|null};
type Dialog='import'|'export'|'history'|null;

export function SpeciesWorkspace(){
 const {token}=theme.useToken();const {message,notification}=App.useApp();const screens=Grid.useBreakpoint();
 const [dataset,setDataset]=useState<Dataset>(()=>loadDataset(seed));const {rows,history}=dataset;
 const [collapsed,setCollapsed]=useState(false),[navOpen,setNavOpen]=useState(false);
 const [form]=Form.useForm<Filters>();const [filters,setFilters]=useState<Filters>({});
 const [statSpecies,setStatSpecies]=useState<string>();
 const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[selection,setSelection]=useState<React.Key[]>([]);
 const [detail,setDetail]=useState<RecordRow|null>(null),[dialog,setDialog]=useState<Dialog>(null);
 const [step,setStep]=useState(0),[filename,setFilename]=useState(''),[preview,setPreview]=useState<ImportPreview|null>(null),[importError,setImportError]=useState('');
 const [reading,setReading]=useState(false),[saving,setSaving]=useState(false),[exporting,setExporting]=useState(false),[exportScope,setExportScope]=useState('filtered'),[showFolder,setShowFolder]=useState(false);
 const readGeneration=useRef(0),importLock=useRef(false);const tableRef=useRef<HTMLDivElement>(null);
 const baseRows=useMemo(()=>filterRecords(rows,{...filters,independentOnly:filters.independent,startDate:filters.dates?.[0]?.format('YYYY-MM-DD'),endDate:filters.dates?.[1]?.format('YYYY-MM-DD')},siteDirectory),[rows,filters]);
 const filtered=useMemo(()=>refineByLabel(baseRows,statSpecies),[baseRows,statSpecies]);
 const summary=useMemo(()=>summarizeRecords(filtered),[filtered]);
 const labelCounts=useMemo(()=>summarizeLabels(baseRows),[baseRows]);
 function toggleStatLabel(label:string){setStatSpecies(current=>current===label?undefined:label);setPage(1);}
 function clearStatLabel(){setStatSpecies(undefined);setPage(1);}

 const contextOptions=useMemo(()=>siteContextOptions(rows,siteDirectory),[rows]);
 const detailSite=detail?siteForRecord(detail,siteDirectory):undefined;
 const activeFilters=Object.values(filters).filter(v=>v!=null&&v!==''&&v!==false).length+(statSpecies?1:0);
 const exportRows=exportScope==='all'?rows:exportScope==='selected'?rows.filter(r=>selection.includes(r.id)):filtered;
 function resetFilters(){form.resetFields();setFilters({});setStatSpecies(undefined);setPage(1);}
 function openImport(){readGeneration.current++;setFilename('');setPreview(null);setImportError('');setStep(0);setReading(false);setDialog('import');}
 function closeDialog(){if(!reading&&!saving&&!exporting){readGeneration.current++;setDialog(null);}}
 async function download(records:RecordRow[],name:string){setExporting(true);try{const {downloadExcel}=await import('./excel');downloadExcel(records,name);void message.success(`已生成 Excel，共 ${records.length} 条记录`);return true;}catch{void message.error('文件生成失败，请重试。');return false;}finally{setExporting(false);}}
 async function inspectFile(file:File){if(reading)return;const generation=++readGeneration.current;setFilename(file.name);setImportError('');setPreview(null);setStep(0);if(!/\.xlsx?$/i.test(file.name)){setImportError('请选择 .xlsx 或 .xls 格式的文件。');return;}if(file.size>20*1024*1024){setImportError('文件不能超过 20 MB，请拆分后重新上传。');return;}setReading(true);try{const {readExcel}=await import('./excel');const result=readExcel(await file.arrayBuffer(),rows,knownLabels);if(generation===readGeneration.current){setPreview(result);setStep(1);}}catch(error){if(generation===readGeneration.current)setImportError(error instanceof Error?error.message:'文件读取失败，请检查文件是否损坏或加密。');}finally{if(generation===readGeneration.current)setReading(false);}}
 async function confirmImport(){if(!preview||preview.issues.length||!preview.additions.length||importLock.current)return;importLock.current=true;setSaving(true);setImportError('');try{const checked=validateGrid([fields.map(f=>f[1]),...preview.additions.map(r=>fields.map(([key])=>key==='species'?(r.sourceSpecies||r.species):r[key]))],rows,knownLabels);if(checked.issues.length||checked.duplicates)throw new Error('数据在预检后发生变化，请重新选择文件并校验。');const stored=localStorage.getItem(storageKey);if(stored&&JSON.stringify((JSON.parse(stored) as Dataset).rows.map(normalizeRecordLabel))!==JSON.stringify(rows))throw new Error('其他页面已更新数据，请刷新列表后重新导入。');const next:Dataset={rows:[...rows,...checked.additions],history:[{id:crypto.randomUUID(),name:filename,count:checked.additions.length,skipped:preview.duplicates,time:new Date().toISOString()},...history]};persistDataset(next);setDataset(next);setSelection([]);resetFilters();setStep(2);}catch(error){const text=error instanceof Error&&/数据|页面/.test(error.message)?error.message:'保存失败，未新增记录。请检查浏览器可用存储空间后重试。';setImportError(text);notification.error({title:'导入未完成',description:text});}finally{importLock.current=false;setSaving(false);}}
 const independentTag=(r:RecordRow)=><Text type="secondary">{isIndependentCapture(r.independent)?'是':'否'}</Text>;
 const columns:TableColumnsType<RecordRow>=[
  {title:'文件名',dataIndex:'file',key:'file',width:300,render:(value,r)=><Tooltip title={value}><Button type="link" onClick={()=>setDetail(r)} style={{padding:0,maxWidth:'100%',textAlign:'left'}}><FileTextOutlined/><span className="filename-text">{value}</span></Button></Tooltip>},
  {title:'物种标签',dataIndex:'species',width:110,render:value=><Tag color={value==='豹'||value==='豹猫'?'blue':'default'}>{value}</Tag>},
  {title:'位点',dataIndex:'site',width:85},{title:'相机编号',dataIndex:'camera',width:95},
  {title:'拍摄时间',dataIndex:'date',key:'captured',width:160,sorter:(a,b)=>(a.date+a.time).localeCompare(b.date+b.time),render:(_,r)=><Flex vertical><Text>{r.date}</Text><Text type="secondary">{r.time}</Text></Flex>},
  {title:'回收批次',dataIndex:'period',width:100},{title:'独立拍摄',key:'independent',width:110,render:(_,r)=>independentTag(r)},
  ...(showFolder?[{title:'文件夹',dataIndex:'folder',key:'folder',width:320,ellipsis:true}]:[]),
  {title:'操作',key:'actions',fixed:'right',width:72,render:(_,r)=><Button type="link" size="small" onClick={()=>setDetail(r)}>详情</Button>},
 ];
 const issueColumns:TableColumnsType<ImportIssue>=[{title:'Excel 行号',dataIndex:'row',width:100},{title:'字段',dataIndex:'field',width:110},{title:'原值',dataIndex:'value',width:140,ellipsis:true,render:v=>v||'（空值）'},{title:'问题',dataIndex:'reason',width:300}];
 const previewColumns:TableColumnsType<RecordRow>=[{title:'文件名',dataIndex:'file',width:300,ellipsis:true},{title:'物种标签',dataIndex:'species',width:100},{title:'位点',dataIndex:'site',width:80},{title:'拍摄时间',dataIndex:'date',width:170,render:(_,r)=>`${r.date} ${r.time}`}];
 const historyColumns:TableColumnsType<ImportBatch>=[{title:'导入文件',dataIndex:'name',ellipsis:true,width:260},{title:'导入时间',dataIndex:'time',width:180,render:value=>dayjs(value).isValid()?dayjs(value).format('YYYY-MM-DD HH:mm:ss'):value},{title:'新增',dataIndex:'count',width:75},{title:'跳过',dataIndex:'skipped',width:75}];
 const navigation=<Menu mode="inline" selectedKeys={['species']} items={[{key:'camera',icon:<CameraOutlined/>,label:'相机位点',disabled:true},{key:'species',icon:<TagsOutlined/>,label:'物种识别'},{key:'individuals',icon:<TeamOutlined/>,label:'个体档案',disabled:true}]} onClick={()=>setNavOpen(false)}/>;
 const filterOptions=(key:'site'|'camera'|'period'|'species')=>uniqueValues(rows,key).map(value=>({value,label:value}));
 const layoutStyle={'--workspace-border':token.colorBorderSecondary,'--workspace-bg':token.colorBgContainer} as React.CSSProperties;
 const importFooter=step===2?<Button type="primary" onClick={()=>{setDialog(null);tableRef.current?.scrollIntoView({block:'start'});}}>查看记录</Button>:<Space><Button onClick={closeDialog} disabled={reading||saving}>取消</Button>{step===1&&<Button type="primary" loading={saving} disabled={!!preview?.issues.length||!preview?.additions.length} onClick={()=>void confirmImport()}>确认导入 {preview?.additions.length||0} 条</Button>}</Space>;
 return <Layout className="workspace-layout" style={layoutStyle}>
  {screens.md&&<Sider className="workspace-sider" theme="light" width={208} collapsedWidth={72} collapsed={collapsed} breakpoint="lg" onBreakpoint={setCollapsed}><div className="workspace-brand"><CameraOutlined style={{color:token.colorPrimary,fontSize:25}}/>{!collapsed&&<div><strong>WildlifeDATA</strong><Text type="secondary" style={{display:'block',fontSize:token.fontSizeSM}}>野生动物监测</Text></div>}</div>{navigation}</Sider>}
  <Layout style={{marginLeft:screens.md?collapsed?72:208:0,minWidth:0}}>
   <Header className="workspace-header"><Button type="text" aria-label="切换导航" icon={collapsed||!screens.md?<MenuUnfoldOutlined/>:<MenuFoldOutlined/>} onClick={()=>screens.md?setCollapsed(v=>!v):setNavOpen(v=>!v)}/><Breadcrumb items={[{title:'监测管理'},{title:'物种识别'}]}/></Header>
   <Content className="workspace-content">
    <Flex justify="space-between" align="center" wrap gap={16} className="workspace-title"><div><Title level={3} style={{margin:0}}>物种识别</Title></div><Space><Button aria-label="下载数据" icon={<DownloadOutlined/>} onClick={()=>{setExportScope('filtered');setDialog('export');}}>下载数据</Button><Button type="primary" aria-label="导入 Excel" icon={<UploadOutlined/>} onClick={openImport}>导入 Excel</Button></Space></Flex>
    <Card title="筛选条件" size="small" extra={<Button type="link" size="small" disabled={!activeFilters} onClick={resetFilters}>重置筛选</Button>}>
     <Form form={form} layout="vertical" onValuesChange={(_,all:Filters)=>{setFilters(all);setStatSpecies(undefined);setPage(1);}}>
      <div className="filter-layout">
       <section className="filter-group filter-geography" aria-label="区域与项目筛选">
        <div className="filter-fields filter-three">
         <Form.Item style={{marginBottom:token.marginXS}} label="区域" name="region"><Select aria-label="区域" allowClear showSearch placeholder="全部区域" options={contextOptions.regions}/></Form.Item>
         <Form.Item style={{marginBottom:token.marginXS}} label="小地名" name="locality"><Select aria-label="小地名" allowClear showSearch placeholder="全部小地名" options={contextOptions.localities}/></Form.Item>
         <Form.Item style={{marginBottom:token.marginXS}} label="项目" name="project"><Select aria-label="项目" allowClear showSearch placeholder="全部项目" options={contextOptions.projects}/></Form.Item>
        </div>
       </section>
       <section className="filter-group filter-devices" aria-label="位点与相机筛选">
        <div className="filter-fields filter-two">
         <Form.Item style={{marginBottom:token.marginXS}} label="位点" name="site"><Select aria-label="位点" allowClear showSearch placeholder="全部位点" options={filterOptions('site')}/></Form.Item>
         <Form.Item style={{marginBottom:token.marginXS}} label="相机编号" name="camera"><Select aria-label="相机编号" allowClear showSearch placeholder="全部相机" options={filterOptions('camera')}/></Form.Item>
        </div>
       </section>
       <section className="filter-group filter-content" aria-label="关键词与物种标签筛选">
        <div className="filter-fields filter-two">
         <Form.Item style={{marginBottom:token.marginXS}} label="关键词" name="keyword"><Input aria-label="关键词" allowClear prefix={<SearchOutlined/>} placeholder="文件名、物种标签、位点…"/></Form.Item>
         <Form.Item style={{marginBottom:token.marginXS}} label="物种标签" name="species"><Select aria-label="物种标签" allowClear showSearch placeholder="全部标签" options={filterOptions('species')}/></Form.Item>
        </div>
       </section>
       <section className="filter-group filter-capture" aria-label="批次与拍摄时间筛选">
        <div className="filter-fields filter-time">
         <Form.Item style={{marginBottom:token.marginXS}} label="回收批次" name="period"><Select aria-label="回收批次" allowClear placeholder="全部批次" options={filterOptions('period')}/></Form.Item>
         <Form.Item style={{marginBottom:token.marginXS}} label="拍摄时间" name="dates"><DatePicker.RangePicker placeholder={['开始日期','结束日期']} format="YYYY-MM-DD" style={{width:'100%'}}/></Form.Item>
        </div>
       </section>
       <section className="filter-group filter-independent" aria-label="独立拍摄筛选">
        <Form.Item style={{marginBottom:token.marginXS}} name="independent" valuePropName="checked"><Checkbox>仅独立拍摄</Checkbox></Form.Item>
       </section>
      </div>
     </Form>
    </Card>
    <section className="workspace-statistics" aria-label="数据统计" style={{marginBlock:token.marginSM}}>
     <Card size="small">
      <div className="statistics-label-row">
       <Flex align="center" gap={4} className="statistics-label-heading"><Tooltip title="数量基于上方筛选条件；点击标签可进一步筛选记录，再次点击取消"><Text type="secondary">物种标签（{labelCounts.length}）</Text></Tooltip>{statSpecies&&<Button type="link" size="small" aria-label="清除标签筛选" onClick={clearStatLabel}>清除</Button>}</Flex>
       {labelCounts.length?<Flex wrap gap={8} aria-label="物种标签数量" className="statistics-label-list">{labelCounts.map(item=><Button key={item.label} size="small" type={statSpecies===item.label?'primary':'default'} aria-pressed={statSpecies===item.label} aria-label={`筛选物种标签 ${item.label}，${item.count}`} onClick={()=>toggleStatLabel(item.label)}>{item.label}<span style={{opacity:.75}}>{item.count}</span></Button>)}</Flex>:<Text type="secondary">暂无数据</Text>}
      </div>
     </Card>
    </section>
    <div ref={tableRef} className="workspace-table-section"><Card size="small" title={<Space size={12}><Space size={6}>识别记录<Text type="secondary">{summary.records} 条</Text></Space><Text type="secondary">位点 {summary.sites} 个</Text></Space>} extra={<Space wrap><Button type="text" size="small" aria-label="导入记录" icon={<HistoryOutlined/>} onClick={()=>setDialog('history')}>{screens.md?'导入记录':null}</Button><Button type="text" size="small" aria-label={showFolder?'隐藏文件夹':'显示文件夹'} icon={screens.md?undefined:<SettingOutlined/>} onClick={()=>setShowFolder(v=>!v)}>{!screens.md?null:showFolder?'隐藏文件夹':'显示文件夹'}</Button></Space>}>
     {selection.length>0&&<Alert type="info" showIcon title={<Flex align="center" justify="space-between" wrap gap={8}><span>已选择 {selection.length} 条记录</span><Space><Button type="link" size="small" onClick={()=>setSelection([])}>取消选择</Button><Button size="small" aria-label="下载已选" icon={<DownloadOutlined/>} onClick={()=>{setExportScope('selected');setDialog('export');}}>下载已选</Button></Space></Flex>} style={{marginBottom:token.margin}}/>}
     <Table<RecordRow> rowKey="id" columns={columns} dataSource={filtered} size="small" scroll={{x:showFolder?1480:1160}} rowSelection={{selectedRowKeys:selection,onChange:setSelection,preserveSelectedRowKeys:true}} pagination={{current:page,pageSize,total:filtered.length,showSizeChanger:true,pageSizeOptions:[10,20,50],showTotal:(total,range)=>total?`共 ${total} 条，显示 ${range[0]}–${range[1]} 条`:'共 0 条',onChange:(next,size)=>{setPage(size!==pageSize?1:next);setPageSize(size);}}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={activeFilters?'没有符合条件的记录':'暂无识别记录'}>{activeFilters?<Button onClick={resetFilters}>重置筛选</Button>:<Button type="primary" onClick={openImport}>导入 Excel</Button>}</Empty>}}/>
    </Card></div>
   </Content>
  </Layout>
  <Drawer title="数据管理" open={navOpen&&!screens.md} placement="left" size={240} onClose={()=>setNavOpen(false)}>{navigation}</Drawer>
  <Drawer title="识别记录详情" open={!!detail} size={screens.md?520:'100%'} onClose={()=>setDetail(null)} focusable={{trap:true,focusTriggerAfterClose:true}} extra={<Button aria-label="下载此记录" icon={<DownloadOutlined/>} loading={exporting} onClick={()=>detail&&void download([detail],'物种识别_单条记录.xlsx')}>下载此记录</Button>}>
   {detail&&<Descriptions column={1} bordered size="small" items={[...fields.map(([key,label])=>({key,label,children:key==='independent'?independentTag(detail):key==='folder'?<Text copyable style={{wordBreak:'break-all'}}>{detail[key]}</Text>:<span style={{wordBreak:'break-all'}}>{detail[key]}</span>})),...(detail.sourceSpecies?[{key:'sourceSpecies',label:'原始标签',children:detail.sourceSpecies}]:[]),{key:'region',label:'区域',children:detailSite?.region||'未关联'},{key:'locality',label:'小地名',children:detailSite?.locality||'未填写'},{key:'project',label:'项目',children:detailSite?siteDirectory.projects.filter(p=>detailSite.projectIds.includes(p.id)).map(p=>p.name).join('、')||'未关联项目':'未关联'}]}/>}
  </Drawer>
  <Modal title="导入物种识别数据" open={dialog==='import'} width={screens.md?820:'100%'} onCancel={closeDialog} closable={!reading&&!saving} keyboard={!reading&&!saving} mask={{closable:false}} focusable={{trap:true,focusTriggerAfterClose:true}} destroyOnHidden footer={importFooter}>
   <Steps current={step} size="small" items={[{title:'选择文件'},{title:'数据预检'},{title:'导入结果'}]} style={{marginBlock:token.marginLG}}/>
   {step===0&&<Flex vertical gap={16}><Upload.Dragger accept=".xlsx,.xls" multiple={false} showUploadList={false} disabled={reading} beforeUpload={file=>{void inspectFile(file);return Upload.LIST_IGNORE;}}><InboxOutlined style={{fontSize:40,color:token.colorPrimary}}/><Title level={5}>点击选择或拖拽 Excel 文件</Title><Text type="secondary">支持 .xlsx、.xls，单个文件不超过 20 MB</Text></Upload.Dragger>{reading&&<Space><Spin size="small"/><Text>正在读取并校验 {filename}…</Text></Space>}<Flex justify="space-between" align="center" wrap gap={8}><Text type="secondary">使用标准表头导入，首行为字段名。</Text><Button icon={<DownloadOutlined/>} loading={exporting} onClick={()=>void download([],'物种识别_导入模板.xlsx')}>下载导入模板</Button></Flex><Text type="secondary">字段：{fields.map(f=>f[1]).join('、')}。独立拍摄：1 为是，0 或空值为否。回收批次兼容旧表头“回收时段”。</Text></Flex>}
   {step===1&&preview&&<Flex vertical gap={16}><Flex justify="space-between" align="center" gap={12}><Space><FileExcelOutlined style={{color:token.colorSuccess,fontSize:24}}/><Text strong>{filename}</Text></Space><Button onClick={()=>{setStep(0);setImportError('');}} disabled={saving}>重新选择</Button></Flex><Row gutter={16}><Col span={8}><Statistic title="待新增记录" value={preview.additions.length} suffix="条"/></Col><Col span={8}><Statistic title="重复记录" value={preview.duplicates} suffix="条"/></Col><Col span={8}><Statistic title="校验问题" value={preview.issues.length} suffix="项" styles={{content:preview.issues.length?{color:token.colorError}:undefined}}/></Col></Row>{preview.issues.length?<><Alert type="error" showIcon title="校验未通过，本批记录尚未导入" description="请根据行号与字段修正原文件，重新选择后校验。"/><Table rowKey="id" size="small" columns={issueColumns} dataSource={preview.issues} pagination={{pageSize:5,showSizeChanger:false,showTotal:total=>`共 ${total} 项问题`}} scroll={{x:650}}/></>:<><Alert type={preview.additions.length?'success':'info'} showIcon title={preview.additions.length?'预检通过，确认后新增记录':'全部记录已存在，无需重复导入'} description={`共读取 ${preview.total} 条，重复 ${preview.duplicates} 条将跳过。不会覆盖已有记录。`}/>{preview.additions.length>0&&<><Text type="secondary">待新增记录预览（前 5 条）</Text><Table rowKey="id" size="small" columns={previewColumns} dataSource={preview.additions.slice(0,5)} pagination={false} scroll={{x:610}}/></>}</>}</Flex>}
   {step===2&&preview&&<Result status="success" title="导入完成" subTitle={`成功新增 ${preview.additions.length} 条记录，跳过 ${preview.duplicates} 条重复记录。`}/>}
   {importError&&<Alert type="error" showIcon role="alert" title="未能完成导入" description={importError} style={{marginTop:token.margin}}/>}
  </Modal>
  <Modal title="下载识别数据" open={dialog==='export'} onCancel={closeDialog} okText={`下载 ${exportRows.length} 条记录`} okButtonProps={{disabled:!exportRows.length,icon:<DownloadOutlined/>}} confirmLoading={exporting} mask={{closable:!exporting}} keyboard={!exporting} closable={!exporting} onOk={async()=>{if(await download(exportRows,`物种识别_${exportScope==='all'?'全部':exportScope==='selected'?'已选':'筛选结果'}_${dayjs().format('YYYYMMDD')}.xlsx`))setDialog(null);}}><Form layout="vertical" style={{marginTop:token.marginLG}}><Form.Item label="下载范围"><Radio.Group value={exportScope} onChange={e=>setExportScope(e.target.value)}><Flex vertical gap={16}><Radio value="filtered">当前筛选结果（{filtered.length} 条）</Radio><Radio value="selected" disabled={!selection.length}>已选择的记录（{selection.length} 条）</Radio><Radio value="all">全部识别记录（{rows.length} 条）</Radio></Flex></Radio.Group></Form.Item><Text type="secondary">Excel 文件包含全部 9 个字段，空值保持为空。</Text></Form></Modal>
  <Modal title="导入记录" open={dialog==='history'} onCancel={closeDialog} footer={<Button onClick={closeDialog}>关闭</Button>} width={screens.md?760:'100%'}><Table rowKey="id" size="small" columns={historyColumns} dataSource={history} pagination={{pageSize:5,showSizeChanger:false}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无导入记录"/>}} scroll={{x:600}}/></Modal>
 </Layout>;
}
