# 模块1：相机位点、维护与数据回收

对应需求 V1.2 §3.1。开发、接口联调与测试随功能一起完成，最后统一回归。

## 已实现

- 位点：完整字段新增、详情、编辑；编号/区域搜索、区域及单侧/对拍筛选、分页与筛选总数。
- 周期：位点下选择相机编号，完整记录型号、工作起止、维护时间/人员、回收时间/批次/状态、异常及备注；详情与纠错。
- 位点列表可直接进入该位点的周期列表；周期显示位点编号和区域，不要求用户填写 UUID。
- 未取得数据也可登记周期；批次为有效 YYYYMM。已结束周期的工作时间不得在未来；起止时间可缺省，以兼容历史资料。
- 输入按浏览器时区显示，提交携带时区；编辑只提交变化的字段，未修改的时间秒数和隐藏坐标保持原值。
- 区域隔离和精确坐标权限适用于列表、详情、筛选总数及统计；普通账号只能查看。
- 新增及编辑在同一事务内记录审计，编辑保存完整前后快照；校验或数据库约束失败时同时回滚。
- 位点已有周期时不直接修改区域；周期已有媒体时不直接修改位点、相机编号或批次，避免悄悄移动历史数据。其他字段可纠错。
- 不增加独立设备管理模块，按需求由周期上的 device_code 区分对拍相机；不提供历史记录硬删除。

## 接口约定

| 接口 | 功能 |
|---|---|
| GET /api/sites | 位点列表；q、region、deployment_type、limit、offset |
| POST /api/sites | 完整位点新增，管理员 |
| GET /api/sites/{id} | 位点详情 |
| PATCH /api/sites/{id} | 部分更新；显式 null 清空可空字段，管理员 |
| GET /api/deployments | 周期列表；q、region、deployment_type、site_id、batch、status、has_issue、limit、offset |
| POST /api/deployments | 完整周期新增，管理员 |
| GET /api/deployments/{id} | 周期详情 |
| PATCH /api/deployments/{id} | 部分更新，管理员 |
| GET /api/cameras/summary | 当前筛选范围周期统计，过滤条件与周期列表一致 |

列表保留数组响应，X-Total-Count 响应头返回过滤及权限处理后的总条数。limit 默认 25、最大 500；前端支持每页 10/25/50/100 条。周期表单的位点选项会读取全部分页，不截断在前 500 个。

## 展示和统计的边界

附带提供当前页可点击的 WGS84 经纬度分布示意图，**不是含地理底图的 GIS 地图**。完整底图、空间分析与导出属于 §3.6 的后续工作。

周期统计覆盖全部筛选结果，而非当前页，包括已回收、未回收、异常、时间不完整数量及记录周期时长。时长按（结束－开始）/24 小时累加，缺少任一时间则排除；没有扣除停机或合并同机重叠区间，**不得当作有效相机工作日**。有效工作日需要停机/复工明细和统计规则后才能实现。

## 可重复验证

后端使用真实 PostGIS 创建独立随机测试数据库，迁移后运行用例，结束时只删除该测试库：

```bash
python3 scripts/test-backend.py --env-file /workspace/.wildlife-data.env
backend/.venv/bin/ruff check backend
npm run build --prefix frontend
```

浏览器联调脚本同样创建独立测试库，启动测试 API/Vite，退出时停止服务并删除测试库。需要 Python Playwright、Chromium、已有 backend/.venv 和 frontend/node_modules；8000 端口须空闲，前端使用随机空闲端口：

```bash
python3 scripts/test-camera-ui.py --env-file /workspace/.wildlife-data.env
```

本地可使用 .env 文件；CI 可直接设置 TEST_DATABASE_URL。GitHub Actions 已配置 Playwright 1.62.0 和 Chromium 执行此脚本；已推送交付分支，远端执行结果以 GitHub Actions 页面为准。测试结果和合成测试数据截图写入 work/，不提交业务凭据。浏览器用例覆盖新增/编辑/详情、筛选与重置、分页、时区往返、无效时间提示、统计、只读账号、坐标隐藏、窄屏及浏览器异常。
