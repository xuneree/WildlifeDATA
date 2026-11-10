import React,{useState,useRef,useEffect,useCallback,memo} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {Layout,Menu,ConfigProvider,App as AntApp,Form,Input,InputNumber,Select,AutoComplete,DatePicker,Checkbox,Radio,Button,Upload,Modal,Table,Alert,Breadcrumb,Tag,Typography,Image,Grid} from 'antd';
import {EnvironmentOutlined,CameraOutlined,ExperimentOutlined,FieldTimeOutlined,UploadOutlined,PlusOutlined,DeleteOutlined,MenuOutlined} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'antd/dist/reset.css';
import './style.css';
import shell from './shell.json';
import {startEngine} from './engine';
dayjs.locale('zh-cn');
const {Header,Sider,Content}=Layout;
const ids=new WeakMap();let sequence=0;const urls=new WeakMap();const fileIds=new WeakMap();
function keyFor(el){if(!ids.has(el))ids.set(el,'control-'+(++sequence));return ids.get(el)}
function urlFor(file){if(!urls.has(file))urls.set(file,URL.createObjectURL(file));return urls.get(file)}
function isUI(el){return !!el.closest('[data-antd-host]')}
function emit(el,type='change'){el.dispatchEvent(new Event(type,{bubbles:true}))}
function optionText(input){const label=input.closest('label');return label?label.textContent.trim():input.value}
const StaticShell=memo(()=> <div id="engine-surface" dangerouslySetInnerHTML={{__html:shell}}/>);
function hostFor(el,anchor=el){let host=el._antdHost;if(!host||!host.isConnected){host=document.createElement('span');host.dataset.antdHost=keyFor(el);host.className='antd-control-host';anchor.after(host);el._antdHost=host;}return host}
function Adapter({item,refresh,invalid,batches}){
 const [batchOpen,setBatchOpen]=useState(false);
 const {kind,el,host}=item;const id='antd_'+(el.id||keyFor(el));const finish=()=>refresh();
 const change=(value,type='change')=>{if(el.type==='checkbox'||el.type==='radio')el.checked=!!value;else el.value=value??'';emit(el,type);finish();};
 const common={id,disabled:el.disabled,status:invalid===el?'error':undefined};
 let node;
 if(kind==='output'){node=<Typography.Text strong id={id}>{el.textContent}</Typography.Text>;
 }else if(kind==='batch'){node=<AutoComplete {...common} defaultActiveFirstOption={false} onInputKeyDown={e=>{if(e.key==='Tab'){e.stopPropagation();setBatchOpen(false)}}} style={{width:'100%'}} value={el.value} options={batches.map(value=>({value,label:value}))} filterOption={false} open={batchOpen} onOpenChange={setBatchOpen} onFocus={()=>setBatchOpen(true)} onBlur={()=>{setBatchOpen(false);emit(el);finish()}} onChange={value=>change(value,'input')} onSelect={value=>{change(value);setBatchOpen(false)}} allowClear/>;
 }else if(kind==='projects'){
  const checks=[...el.querySelectorAll('input[name=loc_projects]')];node=<Select id="antd_projectToggle" mode="multiple" allowClear value={checks.filter(c=>c.checked).map(c=>c.value)} options={checks.map(c=>({value:c.value,label:optionText(c)}))} maxTagCount="responsive" style={{width:'100%'}} onChange={values=>{checks.forEach(c=>c.checked=values.includes(c.value));emit(checks[0]);finish()}} aria-label="关联项目"/>;
 }else if(kind==='select'){
  const options=[...el.options].filter(o=>o.value!=='').map(o=>({value:o.value,label:o.textContent,disabled:o.disabled}));node=<Select {...common} value={el.value||undefined} options={options} allowClear style={{width:'100%'}} onChange={value=>change(value)} aria-label={el.labels?.[0]?.textContent.replace('*','').trim()}/>;
 }else if(kind==='group'){
  const inputs=[...el.querySelectorAll('input')].filter(e=>!isUI(e));const radio=inputs[0]?.type==='radio';const entries=inputs.filter(i=>!i.closest('label')?.hidden);const options=entries.map((i,index)=>({label:optionText(i),value:keyFor(i),disabled:i.disabled}));const selected=entries.filter(i=>i.checked).map(keyFor);const update=values=>{inputs.forEach(i=>i.checked=values.includes(keyFor(i)));emit(entries.find(i=>i.checked)||entries[0]||inputs[0]);finish();};
  node=radio?<Radio.Group value={selected[0]} options={options} onChange={e=>update([e.target.value])}/>:<Checkbox.Group value={selected} options={options} onChange={update}/>;
 }else if(kind==='checkbox'){
  node=<Checkbox id={id} checked={el.checked} disabled={el.disabled} onChange={e=>change(e.target.checked)}>{optionText(el)}</Checkbox>;
 }else if(kind==='button'){
  const cls=el.className;const link=cls.includes('textbtn')||cls.includes('alias-link')||cls.includes('upload-delete');const type=cls.includes('primary')?'primary':link?'link':'default';
  node=<Button id={id} type={type} danger={cls.includes('danger')} disabled={el.disabled} className={link?'compact-link':''} onClick={()=>{el.click();finish()}}>{el.textContent}</Button>;
 }else if(kind==='upload'){
  const files=[...el.querySelector('input[type=file]').files];const input=el.querySelector('input[type=file]');const photo=input.id==='loc_photos';const fileList=files.map(file=>{if(!fileIds.has(file))fileIds.set(file,keyFor(file));return{uid:fileIds.get(file),name:file.name,status:'done',originFileObj:file,...(photo?{thumbUrl:urlFor(file),url:urlFor(file)}:{})}});
  node=<Upload accept={input.accept} multiple showUploadList={{removeIcon:<DeleteOutlined aria-label="删除文件"/>}} fileList={fileList} listType={photo?'picture':'text'} beforeUpload={(file,batch)=>{if(file===batch[0]){const transfer=new DataTransfer();batch.forEach(f=>transfer.items.add(f));input.files=transfer.files;emit(input);finish();}return Upload.LIST_IGNORE}} onRemove={file=>{const index=files.indexOf(file.originFileObj);const button=el.querySelector(`[data-file-index="${index}"]`);button?.click();finish();return false;}} onPreview={photo?file=>Modal.info({title:file.name,icon:null,content:<Image src={file.url} alt={file.name}/>,okText:'关闭',width:620}):undefined}>
   <Button icon={<UploadOutlined/>}>选择文件</Button>
  </Upload>;
 }else if(kind==='history'){
  const data=[...el.querySelectorAll('[data-open-habitat]')].map(button=>{const spans=button.querySelectorAll('span');return{key:button.dataset.openHabitat,date:spans[0]?.textContent,people:spans[1]?.textContent,summary:spans[2]?.textContent,button}});
  node=<Table size="small" dataSource={data} pagination={false} locale={{emptyText:'暂无调查记录'}} columns={[{title:'调查日期',dataIndex:'date',width:130,render:(text,row)=><Button type="link" className="compact-link" onClick={()=>{row.button.click();finish()}}>{text}</Button>},{title:'调查人员',dataIndex:'people',width:150},{title:'调查概况',dataIndex:'summary'}]} onRow={row=>({onClick:e=>{if(!e.target.closest('button')){row.button.click();finish()}},style:{cursor:'pointer'}})} scroll={{x:500}}/>;
 }else if(el.tagName==='TEXTAREA'){
  node=<Input.TextArea {...common} value={el.value} rows={3} onChange={e=>change(e.target.value,'input')} onBlur={()=>{emit(el);finish()}}/>;
 }else if(el.type==='number'){
  node=<InputNumber {...common} value={el.value===''?null:Number(el.value)} min={el.min===''?undefined:Number(el.min)} max={el.max===''?undefined:Number(el.max)} controls={false} style={{width:'100%'}} onChange={value=>change(value,'input')} onBlur={()=>{emit(el);finish()}}/>;
 }else if(el.type==='date'||el.type==='datetime-local'){
  const time=el.type==='datetime-local';node=<DatePicker {...common} value={el.value?dayjs(el.value):null} placeholder="" format={time?'YYYY-MM-DD HH:mm:ss':'YYYY-MM-DD'} showTime={time?{format:'HH:mm:ss'}:false} style={{width:'100%'}} onChange={date=>change(date?date.format(time?'YYYY-MM-DDTHH:mm:ss':'YYYY-MM-DD'):'')}/>;
 }else{
  node=<Input {...common} value={el.value} readOnly={el.readOnly} maxLength={el.maxLength>0?el.maxLength:undefined} onChange={e=>change(e.target.value,'input')} onBlur={()=>{emit(el);finish()}}/>;
 }
 return createPortal(<Form.Item noStyle>{node}</Form.Item>,host,keyFor(el));
}
function collectControls(){
 const surface=document.getElementById('engine-surface');if(!surface)return[];let items=[];const add=(kind,el,anchor=el)=>{const host=hostFor(el,anchor);host.hidden=el.hidden;items.push({kind,el,host});return host};
 // Composite controls own their native descendants, preserving the exact original control values.
 for(const el of surface.querySelectorAll('.options,#loc_projects,.uploads,#habitatHistory')){
  if(isUI(el)||el.closest('dialog')||el.closest('#legacyNavigation'))continue;
  if(el.classList.contains('options')&&el.closest('#loc_projects'))continue;
  const kind=el.id==='loc_projects'?'projects':el.id==='habitatHistory'?'history':el.classList.contains('uploads')?'upload':'group';
  if(kind==='group'&&!el.querySelector('input'))continue;
  el.style.display='none';add(kind,el);
 }
 for(const el of surface.querySelectorAll('input,select,textarea,button,output')){
  if(isUI(el)||el.closest('#legacyNavigation,dialog,.options,#loc_projects,.uploads,#habitatHistory'))continue;
  if(el.type==='file')continue;
  if(el.tagName==='INPUT'&&(el.type==='checkbox'||el.type==='radio')){const label=el.closest('label');if(label){label.style.display='none';add('checkbox',el,label);continue;}}
  el.style.display='none';const kind=el.tagName==='OUTPUT'?'output':el.id==='op_batch'?'batch':el.tagName==='SELECT'?'select':el.tagName==='BUTTON'?'button':'input';const host=add(kind,el);
  if(el.id){const label=surface.querySelector(`label[for="${CSS.escape(el.id)}"]`);if(label)label.htmlFor='antd_'+el.id;}
 }
 return items;
}
function Demo(){
 const [items,setItems]=useState([]),[active,setActive]=useState('location'),[aliasOpen,setAliasOpen]=useState(false),[tick,setTick]=useState(0),[invalid,setInvalid]=useState(null),[collapsed,setCollapsed]=useState(false);const engine=useRef(null),queued=useRef(false),ready=useRef(false),confirmBypass=useRef(false);const {message,modal}=AntApp.useApp();const screens=Grid.useBreakpoint();useEffect(()=>{if(screens.md===false)setCollapsed(true)},[screens.md]);
 const refresh=useCallback(()=>{if(!ready.current||queued.current)return;queued.current=true;queueMicrotask(()=>{queued.current=false;if(!ready.current)return;setItems(collectControls());setActive(engine.current.getState().active);setTick(t=>t+1);});},[]);
 useEffect(()=>{
  engine.current=startEngine({onUpdate:refresh,onToast:text=>message.open({key:'engine-toast',type:'info',content:text,duration:4.2}),onDialog:setAliasOpen,onInvalid:el=>{setInvalid(el);message.warning('请填写'+(el.closest('.field')?.querySelector('label,legend')?.textContent.replace('*','').trim()||'必填信息'));setTimeout(()=>document.getElementById('antd_'+el.id)?.focus(),0)}});
  ready.current=true;refresh();
  const change=e=>{if(isUI(e.target)||!document.getElementById('engine-surface').contains(e.target))return;setInvalid(null);refresh()};document.addEventListener('change',change);document.addEventListener('input',change);
  const confirmHandler=e=>{const button=e.target.closest('button');if(!button||isUI(button)||!['resetPage','deleteHabitat'].includes(button.id)||confirmBypass.current)return;e.preventDefault();e.stopImmediatePropagation();modal.confirm({title:button.id==='deleteHabitat'?'删除这条生境调查记录？':'清空本页内容？',content:button.id==='deleteHabitat'?'删除后，该记录将从当前浏览器的历史列表中移除。':'其他页面和已保存的调查历史不受影响。',okText:button.id==='deleteHabitat'?'删除':'清空',okButtonProps:{danger:true},cancelText:'取消',onOk:()=>{const original=window.confirm;confirmBypass.current=true;window.confirm=()=>true;try{button.click()}finally{window.confirm=original;confirmBypass.current=false}refresh()}})};
  document.addEventListener('click',confirmHandler,true);
  return()=>{ready.current=false;document.removeEventListener('change',change);document.removeEventListener('input',change);document.removeEventListener('click',confirmHandler,true)};
 },[]);
 const menu=[{key:'location',icon:<EnvironmentOutlined/>,label:'位点信息'},{key:'habitat',icon:<ExperimentOutlined/>,label:'生境调查'},{key:'operation',icon:<CameraOutlined/>,label:'操作记录'},{key:'deployment',icon:<FieldTimeOutlined/>,label:'布设周期'}];
 const alias=document.getElementById('loc_alias');
 return <Layout className="app-layout"><Sider width={208} collapsedWidth={screens.md?72:0} collapsed={collapsed} className="app-sider" theme="light"><div className="app-brand"><CameraOutlined/>{!collapsed&&<span>WildlifeDATA<small>野外监测管理</small></span>}</div><Menu mode="inline" selectedKeys={[active]} items={menu} onClick={({key})=>{engine.current?.navigate(key);refresh();if(!screens.md)setCollapsed(true)}}/><div className="sider-bottom">{!collapsed&&<>模块1-相机管理<br/><Tag color="blue">野外监测</Tag></>}</div></Sider><Layout className="main-layout" style={{marginLeft:collapsed?(screens.md?72:0):208}}><Header className="app-header"><Button type="text" icon={<MenuOutlined/>} aria-label="切换导航" onClick={()=>setCollapsed(!collapsed)}/><Breadcrumb items={[{title:'监测管理'},{title:'模块1-相机管理'}]}/><Tag color="blue">工作组：山西</Tag></Header><Content className="app-content"><Form component={false} layout="vertical"><StaticShell/>{items.map(item=><Adapter key={keyFor(item.el)} item={item} refresh={refresh} invalid={invalid} batches={engine.current?.getRecentBatches()||[]}/>)}</Form></Content></Layout>
  <Modal title="别名" open={aliasOpen} onOk={()=>{document.getElementById('saveAlias')?.click();refresh()}} onCancel={()=>{document.getElementById('cancelAlias')?.click();refresh()}} okText="完成" cancelText="取消" width={420}><Form layout="vertical"><Form.Item label="别名"><Input id="antd_alias_editor" value={alias?.value||''} onChange={e=>{alias.value=e.target.value;emit(alias,'input');refresh()}} onPressEnter={()=>document.getElementById('saveAlias')?.click()}/></Form.Item></Form></Modal>
 </Layout>;
}
const theme={token:{colorPrimary:'#1677ff',borderRadius:6,fontSize:13,controlHeight:32,colorBgLayout:'#f5f6f8'},components:{Menu:{itemHeight:42,itemMarginInline:10},Form:{itemMarginBottom:16},Button:{fontWeight:500}}};
createRoot(document.getElementById('root')).render(<ConfigProvider locale={zhCN} theme={theme}><AntApp><Demo/></AntApp></ConfigProvider>);
