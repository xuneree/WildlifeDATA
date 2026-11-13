// Physical presence is independent of camera health and retrieval-cycle boundaries.
export function presenceAfter(data) {
  if (data.op_type === '安装') return true;
  if (data.op_type === '撤回') return false;
  if (data.op_type !== '检查') return null;
  if (data.op_status === '丢失') return (data.op_actions || []).some(v=>['丢失重补','丢失后补装'].includes(v));
  return data.op_status ? true : null;
}

export function siteState(records, group, site, date) {
  const latest = new Map();
  for (const row of [...records].sort((a, b) =>
    (a.operation_date || '').localeCompare(b.operation_date || '') ||
    (a.sequence || 0) - (b.sequence || 0))) {
    if (row.group !== group || row.site_code !== site || !row.camera_code ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.operation_date || '') ||
        row.operation_date > date || typeof row.is_deployed_after !== 'boolean') continue;
    latest.set(row.camera_code, row.is_deployed_after);
  }
  const count = [...latest.values()].filter(Boolean).length;
  return {as_of: date, camera_count: count,
    deployment_type: count === 0 ? 'none' : count === 1 ? 'single' : count === 2 ? 'paired' : 'unclassified',
    location_status: count > 0 ? 'active' : 'inactive'};
}
