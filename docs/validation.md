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

尚未验证：浏览器端交互自动化、GitHub Actions 的远端运行、Dell WSL2/NAS 真实数据验收、云环境发布后的新任务恢复。
功能缺口见 implementation.md；当前不接收或导入生产影像，不提供 XMP/Excel 导入工作区。
