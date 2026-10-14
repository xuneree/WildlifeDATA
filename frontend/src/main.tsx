import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Row = Record<string, string | number | boolean | null>;
type User = {display_name: string; username: string; role: string};
type Dashboard = {site_count: number; deployment_count: number; media_count: number; sites: Row[]; note: string};
type Field = {key: string; label: string; type?: string; options?: string[]; optional?: boolean};
const modules: Record<string, {label: string; columns: string[]; fields: Field[]}> = {
  sites: {label: '相机位点', columns: ['site_code', 'region', 'deployment_type', 'longitude', 'latitude'], fields: [
    {key: 'site_code', label: '位点编号'}, {key: 'region', label: '所属区域'},
    {key: 'deployment_type', label: '布设类型', options: ['single', 'paired']},
    {key: 'longitude', label: '经度', type: 'number', optional: true},
    {key: 'latitude', label: '纬度', type: 'number', optional: true}, {key: 'notes', label: '备注', optional: true}]},
  deployments: {label: '工作与回收周期', columns: ['site_id', 'device_code', 'data_retrieval_batch', 'data_retrieval_status'], fields: [
    {key: 'site_id', label: '位点'}, {key: 'device_code', label: '相机编号（如 701A）'},
    {key: 'device_type', label: '相机型号', optional: true}, {key: 'data_retrieval_batch', label: '回收批次（如 202608）'},
    {key: 'data_retrieval_status', label: '回收状态', options: ['retrieved', 'not_retrieved']},
    {key: 'work_start_at', label: '工作开始时间', type: 'datetime-local', optional: true},
    {key: 'work_end_at', label: '工作结束时间', type: 'datetime-local', optional: true},
    {key: 'maintenance_by', label: '维护人员', optional: true}]},
  species: {label: '物种字典', columns: ['species_code', 'common_name', 'scientific_name'], fields: [
    {key: 'species_code', label: '物种代码'}, {key: 'common_name', label: '中文名'},
    {key: 'scientific_name', label: '学名', optional: true}]},
  individuals: {label: '个体档案', columns: ['individual_code', 'species_id', 'sex', 'life_status'], fields: [
    {key: 'individual_code', label: '当前个体编号'}, {key: 'species_id', label: '物种'},
    {key: 'sex', label: '性别', options: ['unknown', 'female', 'male']},
    {key: 'life_status', label: '生存状态', options: ['unknown', 'alive', 'confirmed_dead']},
    {key: 'birth_date_from', label: '估计出生区间下界', type: 'date', optional: true},
    {key: 'birth_date_to', label: '估计出生区间上界', type: 'date', optional: true},
    {key: 'notes', label: '备注', optional: true}]},
};
const labels: Record<string, string> = Object.fromEntries(Object.values(modules).flatMap(m => m.fields.map(f => [f.key, f.label])));
const optionsLabel: Record<string, string> = {single: '单侧', paired: '对拍', retrieved: '已回收', not_retrieved: '未回收',
  unknown: '未知', male: '雄性', female: '雌性', alive: '存活', confirmed_dead: '确认死亡'};

function App() {
  // Token stays in memory; refresh requires login, and logout discards it.
  const [token, setToken] = useState('');
  const generation = useRef(0);
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState('dashboard');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [sites, setSites] = useState<Row[]>([]);
  const [species, setSpecies] = useState<Row[]>([]);

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch('/api/' + path, {...options, headers: {
      'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {}), ...options.headers}});
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && token) {logout();}
      throw new Error(typeof data.detail === 'string' ? data.detail : '提交失败，请检查必填项、编号和字段格式');
    }
    return data;
  }
  function logout() {
    generation.current += 1;
    setToken(''); setUser(null); setDashboard(null); setRows([]); setSites([]); setSpecies([]); setBusy(false);
  }
  async function load() {
    const request = ++generation.current;
    setBusy(true); setError('');
    try {
      if (page === 'dashboard') {
        const data = await api('dashboard');
        if (request === generation.current) setDashboard(data);
      } else {
        const data = await api(page);
        const related = page === 'deployments' ? await api('sites?limit=500') :
          page === 'individuals' ? await api('species?limit=500') : [];
        if (request === generation.current) {
          setRows(data);
          if (page === 'deployments') setSites(related);
          if (page === 'individuals') setSpecies(related);
        }
      }
    } catch (e) {if (request === generation.current) setError((e as Error).message);}
    finally {if (request === generation.current) setBusy(false);}
  }
  useEffect(() => {if (token) {setRows([]); void load();}}, [token, page]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('auth/login', {method: 'POST', body: JSON.stringify(Object.fromEntries(form))});
      generation.current += 1; setDashboard(null); setRows([]);
      setUser(result.user); setToken(result.token); setPage('dashboard');
    } catch (e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const element = event.currentTarget;
    const form = new FormData(element);
    const body: Record<string, unknown> = {};
    for (const field of modules[page].fields) {
      const value = String(form.get(field.key) ?? '');
      if (value === '' && field.optional) continue;
      body[field.key] = field.type === 'number' ? Number(value) :
        field.type === 'datetime-local' ? new Date(value).toISOString() : value;
    }
    try {await api(page, {method: 'POST', body: JSON.stringify(body)}); element.reset(); await load();}
    catch (e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  if (!user) return <main className="login"><div className="brand">WILDLIFE DATA · 野生动物监测</div>
    <h1>红外相机数据管理平台</h1><p>统一管理监测位点、数据回收和个体档案。</p>
    <form onSubmit={login}><label>用户名<input name="username" autoComplete="username" required /></label>
      <label>密码<input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>{busy ? '登录中…' : '登录平台'}</button></form>
    {error && <p role="alert" className="error">{error}</p>}<small>第一期项目初版 · 请使用管理员创建的账号</small></main>;

  const module = modules[page];
  return <div className="layout"><aside><div className="brand">WILDLIFE DATA</div><h2>红外相机<br/>数据管理平台</h2>
    <nav>{[['dashboard', '监测概览'], ...Object.entries(modules).filter(([key]) => key !== 'individuals' || user.role === 'admin')
      .map(([key, value]) => [key, value.label])].map(([key, title]) =>
        <button className={page === key ? 'active' : ''} key={key} onClick={() => setPage(key)}>{title}</button>)}</nav>
    <div className="account">{user.display_name || user.username}<button onClick={logout}>退出登录</button></div>
  </aside><main><header><div><p className="eyebrow">华北豹长期监测 · 第一期初版</p><h1>{page === 'dashboard' ? '监测概览' : module.label}</h1></div>
    <button className="secondary" disabled={busy} onClick={() => void load()}>刷新</button></header>
    {error && <p className="error" role="alert">{error}</p>}{busy && <p role="status">正在处理…</p>}
    {page === 'dashboard' && dashboard && <><div className="stats">{[
      ['监测位点', dashboard.site_count], ['工作与回收周期', dashboard.deployment_count], ['媒体文件', dashboard.media_count]
    ].map(([title, count]) => <section key={title}><span>{title}</span><strong>{count}</strong></section>)}</div>
      <section className="panel"><h2>当前可访问位点</h2><Table rows={dashboard.sites} columns={modules.sites.columns}/></section>
      <p className="notice">{dashboard.note}</p><p className="notice">当前版本提供基础建档和权限。媒体导入、XMP / Excel 导入、地图与繁殖工作区尚未实现。</p></>}
    {module && <><section className="panel"><h2>记录列表 <small>（最多显示 100 条）</small></h2>
      <Table rows={rows} columns={module.columns}/></section>
      {user.role === 'admin' && <section className="panel"><h2>新增{module.label}</h2><form className="fields" onSubmit={create}>
        {module.fields.map(field => <label key={field.key}>{field.label}{field.optional ? '（可选）' : ''}
          {field.key === 'site_id' || field.key === 'species_id' ? <select name={field.key} required>
            <option value="">请选择</option>{(field.key === 'site_id' ? sites : species).map(row =>
              <option key={String(row.id)} value={String(row.id)}>{String(row.site_code || row.common_name)}{row.region ? ` · ${row.region}` : ''}</option>)}
          </select> : field.options ? <select name={field.key}>{field.options.map(o => <option key={o} value={o}>{optionsLabel[o] || o}</option>)}</select> :
          <input name={field.key} type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} required={!field.optional}/>}
        </label>)}<div className="actions"><button disabled={busy}>保存记录</button></div></form></section>}</>}
    <footer>坐标按账号权限显示 · 所有新增业务记录保留审计日志</footer></main></div>;
}
function Table({rows, columns}: {rows: Row[]; columns: string[]}) {
  if (!rows.length) return <p className="empty">暂无记录。管理员可通过下方表单建立基础档案。</p>;
  return <div className="table-wrap"><table><thead><tr>{columns.map(c => <th key={c}>{labels[c] || c}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={String(row.id ?? i)}>{columns.map(c => <td key={c}>{row[c] == null ? '—' : optionsLabel[String(row[c])] || String(row[c])}</td>)}</tr>)}</tbody></table></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
