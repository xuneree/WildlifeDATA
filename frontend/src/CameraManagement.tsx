import { useEffect, useRef, useState } from 'react';

type Row = Record<string, string | number | null>;
type Field = {key: string; label: string; type?: string; required?: boolean; options?: [string, string][]; max?: number};
type Filters = {q: string; region: string; deployment_type: string; site_id: string; batch: string; status: string; has_issue: string};
type Summary = {deployment_count: number; retrieved_count: number; not_retrieved_count: number; issue_count: number; incomplete_time_count: number; recorded_interval_days: number; note: string};
const siteFields: Field[] = [
  {key: 'site_code', label: '位点编号', required: true, max: 50},
  {key: 'region', label: '所属区域', required: true, max: 100},
  {key: 'deployment_type', label: '布设类型', required: true, options: [['single', '单侧'], ['paired', '对拍']]},
  {key: 'first_deployed_at', label: '首次布设时间', type: 'datetime-local'},
  {key: 'longitude', label: '经度（WGS84）', type: 'number'},
  {key: 'latitude', label: '纬度（WGS84）', type: 'number'},
  {key: 'elevation_m', label: '海拔（米）', type: 'number'},
  {key: 'terrain_type', label: '地形', max: 50},
  {key: 'vegetation_type', label: '植被', max: 100},
  {key: 'environment_type', label: '环境属性', max: 100},
  {key: 'notes', label: '备注', type: 'textarea'},
];
const cycleFields: Field[] = [
  {key: 'site_id', label: '位点', required: true},
  {key: 'device_code', label: '相机编号（如 701A / 701B）', required: true, max: 50},
  {key: 'device_type', label: '相机型号', max: 100},
  {key: 'data_retrieval_batch', label: '回收批次（YYYYMM，如 202608）', required: true, max: 6},
  {key: 'data_retrieval_status', label: '数据回收状态', required: true, options: [['retrieved', '已回收'], ['not_retrieved', '未回收']]},
  {key: 'work_start_at', label: '工作开始时间', type: 'datetime-local'},
  {key: 'work_end_at', label: '工作结束时间', type: 'datetime-local'},
  {key: 'maintenance_at', label: '维护时间', type: 'datetime-local'},
  {key: 'maintenance_by', label: '维护人员'},
  {key: 'data_retrieval_at', label: '数据回收时间', type: 'datetime-local'},
  {key: 'issue_type', label: '异常类型（正常留空）', max: 50},
  {key: 'notes', label: '异常及回收说明', type: 'textarea'},
];
const text: Record<string, string> = {single: '单侧', paired: '对拍', retrieved: '已回收', not_retrieved: '未回收'};
const blank: Filters = {q: '', region: '', deployment_type: '', site_id: '', batch: '', status: '', has_issue: ''};
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
function localInput(value: string | number | null | undefined, type?: string) {
  if (value == null) return '';
  if (type !== 'datetime-local') return String(value);
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CameraManagement({resource, token, isAdmin, canViewCoordinates, onUnauthorized, initialSiteId = '', onSiteCycles}: {
  resource: 'sites' | 'deployments'; token: string; isAdmin: boolean; canViewCoordinates: boolean;
  onUnauthorized: () => void; initialSiteId?: string; onSiteCycles: (id: string) => void;
}) {
  const initial = {...blank, site_id: resource === 'deployments' ? initialSiteId : ''};
  const [draftFilters, setDraftFilters] = useState<Filters>(initial);
  const [filters, setFilters] = useState<Filters>(initial);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [sites, setSites] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const fields = resource === 'sites' ? siteFields : cycleFields;
  const visibleFields = fields.filter(f => canViewCoordinates || !['longitude', 'latitude'].includes(f.key));

  async function request<T>(path: string, options: RequestInit = {}) {
    const response = await fetch('/api/' + path, {...options, headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
    }});
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) unauthorized.current();
      throw new Error(typeof data.detail === 'string' ? data.detail : '字段格式有误，请检查必填项和输入格式');
    }
    return {data: data as T, total: Number(response.headers.get('X-Total-Count') || 0)};
  }
  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    setLoading(true); setError(''); setDetail(null);
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ''));
    async function load() {
      try {
        const result = await request<Row[]>(`${resource}?${params}&limit=${size}&offset=${page * size}`, {signal: controller.signal});
        if (current !== generation.current) return;
        if (page > 0 && result.data.length === 0) {setPage(0); return;}
        setRows(result.data); setTotal(result.total);
        if (resource === 'deployments') {
          const stats = await request<Summary>(`cameras/summary?${params}`, {signal: controller.signal});
          if (current === generation.current) setSummary(stats.data);
        }
      } catch (e) {if (!controller.signal.aborted && current === generation.current) setError((e as Error).message);}
      finally {if (!controller.signal.aborted && current === generation.current) setLoading(false);}
    }
    void load();
    return () => {controller.abort(); generation.current += 1;};
  }, [resource, token, filters, page, size, refresh]);

  useEffect(() => {
    if (resource !== 'deployments') return;
    const controller = new AbortController();
    async function loadSites() {
      const all: Row[] = [];
      try {
        // Follow pagination so records beyond the first 500 remain selectable.
        while (!controller.signal.aborted) {
          const result = await request<Row[]>(`sites?limit=500&offset=${all.length}`, {signal: controller.signal});
          all.push(...result.data);
          if (all.length >= result.total || result.data.length === 0) break;
        }
        if (!controller.signal.aborted) setSites(all);
      } catch (e) {if (!controller.signal.aborted) setError((e as Error).message);}
    }
    void loadSites();
    return () => controller.abort();
  }, [resource, token, refresh]);

  function startEdit(row: Row | 'new') {
    setEditing(row); setFormError(''); setMessage('');
    setValues(Object.fromEntries(visibleFields.map(f => [f.key, row === 'new'
      ? f.key === 'site_id' ? filters.site_id : f.options?.[0][0] || '' : localInput(row[f.key], f.type)])));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setFormError(''); setSaving(true); setMessage('');
    const body: Record<string, unknown> = {};
    try {
      for (const field of visibleFields) {
        const value = (values[field.key] || '').trim();
        if (field.required && !value) throw new Error(`请填写${field.label}`);
        // Only changed fields are patched, preserving seconds and masked coordinates.
        if (editing !== 'new' && editing && value === localInput(editing[field.key], field.type)) continue;
        body[field.key] = value === '' ? null : field.type === 'number' ? Number(value) :
          field.type === 'datetime-local' ? new Date(value).toISOString() : value;
      }
      const effective = {...(editing === 'new' ? {} : editing), ...body};
      if (resource === 'sites' && canViewCoordinates) {
        const lon = effective.longitude, lat = effective.latitude;
        if ((lon == null) !== (lat == null)) throw new Error('经度和纬度须同时填写或同时留空');
        if (lon != null && (Number(lon) < -180 || Number(lon) > 180 || Number(lat) < -90 || Number(lat) > 90)) throw new Error('经纬度超出有效范围');
      }
      if (resource === 'deployments') {
        if (!/^[0-9]{4}(0[1-9]|1[0-2])$/.test(String(effective.data_retrieval_batch))) throw new Error('回收批次须为有效年月，例如 202608');
        if (effective.work_start_at && effective.work_end_at && new Date(String(effective.work_end_at)) < new Date(String(effective.work_start_at))) throw new Error('工作结束时间不能早于开始时间');
      }
      if (editing !== 'new' && Object.keys(body).length === 0) {setEditing(null); return;}
      const result = await request<Row>(resource + (editing === 'new' ? '' : `/${editing?.id}`), {
        method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify(body),
      });
      if (!mounted.current) return;
      setEditing(null); setDetail(result.data); setMessage('记录已保存'); setRefresh(n => n + 1);
    } catch (e) {if (mounted.current) setFormError((e as Error).message);}
    finally {if (mounted.current) setSaving(false);}
  }
  function siteName(id: unknown) {
    const row = sites.find(s => s.id === id);
    return row ? `${row.site_code} · ${row.region}` : String(id ?? '—');
  }
  function display(row: Row, key: string) {
    const value = row[key];
    if (value == null || value === '') return '—';
    if (key === 'site_id') return siteName(value);
    if (key.endsWith('_at')) return new Date(value).toLocaleString('zh-CN', {timeZoneName: 'short'});
    return text[String(value)] || String(value);
  }
  const columns = resource === 'sites' ? ['site_code', 'region', 'deployment_type', 'terrain_type', 'environment_type'] :
    ['site_id', 'device_code', 'data_retrieval_batch', 'data_retrieval_status', 'maintenance_by', 'issue_type'];
  return <>
    <section className="panel">
      <div className="section-heading"><h2>{resource === 'sites' ? '位点管理' : '周期与维护记录'}</h2><div className="button-row">
        <button className="secondary" disabled={loading || saving} onClick={() => setRefresh(n => n + 1)}>刷新记录</button>
        {isAdmin && <button disabled={saving} onClick={() => startEdit('new')}>{resource === 'sites' ? '新增位点' : '新增工作周期'}</button>}
      </div></div>
      <form className="camera-filters" onSubmit={e => {e.preventDefault(); setPage(0); setFilters({...draftFilters}); setMessage('');}}>
        <label>搜索<input value={draftFilters.q} maxLength={100} placeholder={resource === 'sites' ? '位点编号、区域' : '位点、相机编号、型号、维护人员'} onChange={e => setDraftFilters({...draftFilters, q: e.target.value})}/></label>
        <label>区域<input value={draftFilters.region} onChange={e => setDraftFilters({...draftFilters, region: e.target.value})}/></label>
        {resource === 'sites' ? <label>布设类型<select aria-label="布设类型" value={draftFilters.deployment_type} onChange={e => setDraftFilters({...draftFilters, deployment_type: e.target.value})}>
          <option value="">全部</option><option value="single">单侧</option><option value="paired">对拍</option></select></label> : <>
          <label>位点<select aria-label="位点" value={draftFilters.site_id} onChange={e => setDraftFilters({...draftFilters, site_id: e.target.value})}><option value="">全部位点</option>{sites.map(s => <option key={String(s.id)} value={String(s.id)}>{s.site_code} · {s.region}</option>)}</select></label>
          <label>回收批次<input placeholder="如 202608" value={draftFilters.batch} maxLength={20} onChange={e => setDraftFilters({...draftFilters, batch: e.target.value})}/></label>
          <label>回收状态<select aria-label="回收状态" value={draftFilters.status} onChange={e => setDraftFilters({...draftFilters, status: e.target.value})}><option value="">全部</option><option value="retrieved">已回收</option><option value="not_retrieved">未回收</option></select></label>
          <label>异常情况<select aria-label="异常情况" value={draftFilters.has_issue} onChange={e => setDraftFilters({...draftFilters, has_issue: e.target.value})}><option value="">全部</option><option value="true">有异常</option><option value="false">无异常</option></select></label>
        </>}
        <div className="button-row"><button disabled={loading}>查询</button><button type="button" className="secondary" disabled={loading} onClick={() => {setDraftFilters({...blank}); setFilters({...blank}); setPage(0);}}>重置</button></div>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      {message && <p role="status" className="success">{message}</p>}
      {loading ? <p role="status">正在加载记录…</p> : <>
        {rows.length === 0 ? <p className="empty">没有符合条件的记录。</p> : <div className="table-wrap"><table><thead><tr>{columns.map(k => <th key={k}>{fields.find(f => f.key === k)?.label}</th>)}<th>操作</th></tr></thead><tbody>
          {rows.map(row => <tr key={String(row.id)}>{columns.map(k => <td key={k}>{display(row, k)}</td>)}<td className="button-row">
            <button className="secondary compact" onClick={() => {setDetail(row); setEditing(null);}}>详情</button>
            {isAdmin && <button className="secondary compact" disabled={saving} onClick={() => startEdit(row)}>编辑</button>}
            {resource === 'sites' && <button className="secondary compact" onClick={() => onSiteCycles(String(row.id))}>查看周期</button>}
          </td></tr>)}
        </tbody></table></div>}
        <div className="pagination"><span>共 {total} 条 · 第 {page + 1} / {Math.max(1, Math.ceil(total / size))} 页</span><div className="button-row">
          <label className="inline-label">每页<select aria-label="每页条数" value={size} onChange={e => {setSize(Number(e.target.value)); setPage(0);}}>{[10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label>
          <button className="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页</button>
          <button className="secondary" disabled={(page + 1) * size >= total} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div></div>
      </>}
    </section>
    {resource === 'deployments' && summary && !loading && !error && <section className="panel"><h2>当前筛选范围统计</h2><div className="camera-stats">{[
      ['工作周期', summary.deployment_count], ['已回收', summary.retrieved_count], ['未回收', summary.not_retrieved_count], ['有异常', summary.issue_count], ['记录周期时长（天）', summary.recorded_interval_days], ['时间不完整', summary.incomplete_time_count],
    ].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div><p className="notice">{summary.note}</p></section>}
    {resource === 'sites' && !loading && !error && <SiteMap rows={rows} allowed={canViewCoordinates} onSelect={row => {setDetail(row); setEditing(null);}}/>}
    {detail && !editing && <section className="panel"><div className="section-heading"><h2>记录详情</h2><button className="secondary" onClick={() => setDetail(null)}>关闭详情</button></div>
      <dl className="details">{visibleFields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{display(detail, f.key)}</dd></div>)}</dl>
      {isAdmin && <button onClick={() => startEdit(detail)}>编辑此记录</button>}
    </section>}
    {editing && <section className="panel" aria-label="记录编辑表单"><h2>{editing === 'new' ? '新增' : '编辑'}{resource === 'sites' ? '位点' : '工作与回收周期'}</h2>
      <p className="notice">时间按当前浏览器时区 {zone} 输入和显示。{resource === 'deployments' && '每条记录对应一台相机的已结束周期；未取得数据也可以记录。'}</p>
      {formError && <p role="alert" className="error">{formError}</p>}
      <form className="fields" onSubmit={save}><fieldset className="camera-fieldset" disabled={saving}>{visibleFields.map(field => <label key={field.key}>{field.label}{field.required ? ' *' : '（可选）'}
        {field.key === 'site_id' ? <select aria-label={`${field.label} *`} required value={values[field.key] || ''} onChange={e => setValues({...values, [field.key]: e.target.value})}><option value="">请选择位点</option>{sites.map(s => <option key={String(s.id)} value={String(s.id)}>{s.site_code} · {s.region}</option>)}</select> : field.options ?
          <select aria-label={`${field.label}${field.required ? ' *' : '（可选）'}`} value={values[field.key] || ''} onChange={e => setValues({...values, [field.key]: e.target.value})}>{field.options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : field.type === 'textarea' ?
            <textarea value={values[field.key] || ''} onChange={e => setValues({...values, [field.key]: e.target.value})}/> :
            <input type={field.type || 'text'} required={field.required} maxLength={field.max} step={field.type === 'number' ? 'any' : undefined} value={values[field.key] || ''} onChange={e => setValues({...values, [field.key]: e.target.value})}/>}
      </label>)}</fieldset><div className="actions button-row"><button disabled={saving}>{saving ? '保存中…' : '保存记录'}</button><button type="button" disabled={saving} className="secondary" onClick={() => setEditing(null)}>取消编辑</button></div></form>
    </section>}
  </>;
}

function SiteMap({rows, allowed, onSelect}: {rows: Row[]; allowed: boolean; onSelect: (row: Row) => void}) {
  const points = rows.filter(row => row.longitude != null && row.latitude != null);
  if (!allowed) return <section className="panel"><h2>点位分布</h2><p className="notice">当前账号未获精确坐标查看权限。</p></section>;
  if (!points.length) return <section className="panel"><h2>点位分布</h2><p className="empty">当前页没有已填写坐标的位点。</p></section>;
  const longs = points.map(row => Number(row.longitude)), lats = points.map(row => Number(row.latitude));
  const minX = Math.min(...longs) - 0.01, maxX = Math.max(...longs) + 0.01;
  const minY = Math.min(...lats) - 0.01, maxY = Math.max(...lats) + 0.01;
  return <section className="panel"><h2>点位分布 · 当前页</h2><p className="notice">WGS84 经纬度示意图，无地理底图；显示本页 {points.length} 个位点，{rows.length - points.length} 个位点缺少坐标。点击位点查看详情。</p>
    <svg className="site-map" viewBox="0 0 800 360" role="img" aria-label="当前页位点经纬度分布">
      <rect x="75" y="20" width="650" height="285" fill="#f1f5ed"/>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="75" x2="725" y1={20 + i * 71.25} y2={20 + i * 71.25} stroke="#cad7c4"/><line x1={75 + i * 162.5} x2={75 + i * 162.5} y1="20" y2="305" stroke="#cad7c4"/>
        <text x="68" y={25 + i * 71.25} textAnchor="end">{(maxY - (maxY - minY) * i / 4).toFixed(3)}°</text><text x={75 + i * 162.5} y="330" textAnchor="middle">{(minX + (maxX - minX) * i / 4).toFixed(3)}°</text></g>)}
      {points.map(row => <g key={String(row.id)} role="button" tabIndex={0} aria-label={`位点 ${row.site_code} ${row.region}`} onClick={() => onSelect(row)} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); onSelect(row);}}}>
        <circle cx={75 + (Number(row.longitude) - minX) / (maxX - minX) * 650} cy={305 - (Number(row.latitude) - minY) / (maxY - minY) * 285} r="7" fill="#285b40" stroke="white" strokeWidth="2"/><title>{row.region} · {row.site_code}</title>
      </g>)}
      <text x="400" y="355" textAnchor="middle">经度（横轴） / 纬度（纵轴）</text>
    </svg>
  </section>;
}
