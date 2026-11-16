# 当前云实例验证记录

日期：2026-10-14。范围：项目初版；不代表第一期全功能验收。

- Python 3.12、Node.js 24、uv 0.12.23；依赖冻结安装成功。
- PostgreSQL 16 + PostGIS 3.5 的真实数据库迁移成功；集成测试中重复升级成功。
- 12 项集成测试通过：认证、位点/周期建档、区域隔离、坐标隐藏、唯一性/外键/时间约束、代表图归属、审计回滚和凭据不进入响应/审计。
- 测试创建随机独立数据库；业务数据库不受测试清空影响。
- Ruff 通过；TypeScript 检查与 Vite 生产构建通过。
- Docker Compose 数据库/API/前端构建和 readiness 通过。
- 经部署的 Nginx 检查前端 HTML/资源引用、PostGIS health、管理员登录和授权概览响应成功。
- cloud-install.sh 已重复执行；密码文件保持不变，数据库迁移和管理员创建保持幂等。
- 依赖下载使用平台受信任 CA 与现有代理；保持 TLS 和包校验，不使用 insecure/trusted-host 绕过。
- 测试存在一项 Starlette 提示：未来应将 TestClient 的 httpx 依赖迁移至 httpx2；本次 12 项测试均实际执行并通过。

初版当时尚未验证：浏览器端交互自动化、GitHub Actions 的远端运行、Dell WSL2/NAS 真实数据验收、云环境发布后的新任务恢复。
功能缺口见 implementation.md；当前不接收或导入生产影像，不提供 XMP/Excel 导入工作区。


## 本轮模块1验证

- 真实 PostGIS 后端测试 29 项全部通过（含原有 12 项）；新增覆盖编辑前后审计、失败回滚、部分更新/显式清空、过滤分页总数、完整维护回收字段、统计、非法批次/时间、区域及坐标权限、历史归属保护。
- Python Ruff、TypeScript 与 Vite 生产构建通过。
- Chromium + Playwright 实际浏览器联调通过：位点新增/编辑/点位示意、周期新增/纠错/详情、上海时区往返、无效时间反馈、筛选重置、统计、分页、只读账号、坐标隐藏、390px 窄屏；无浏览器 JavaScript 异常。
- 浏览器测试使用独立随机数据库和合成数据，测试后删除临时库并停止测试 API/Vite；不清空业务数据库。
- Docker Compose 更新构建成功，数据库/API/Web 均通过 readiness；经 Nginx 的只读 smoke 验证通过。
- 已将独立数据库浏览器回归步骤加入 GitHub Actions 配置；本轮未推送或触发远端 Actions，不能视为远端执行通过。
- `scripts/test-camera-ui.py` 可重复执行，截图和日志位于被忽略的 work/；运行方式见 camera-management.md。
- 尚需 Dell WSL2 上的真实巡检数据验收。GIS 底图和扣除停机的有效工作日未纳入 §3.1 完成声明；当前分别提供当前页经纬度示意图、带明确口径的周期时长。
