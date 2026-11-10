# 红外相机数据管理平台 · WildlifeDATA

继续已有任务前，先核对远端并读取 [协作约定](AGENTS.md) 和 [当前基线与交接](docs/PROJECT_STATUS.md)。

面向野生动物监测的第一期项目初版，采用 React + TypeScript、FastAPI、PostgreSQL + PostGIS、Docker Compose。
最新总体需求为[需求 V1.4（工作组及指南同步版）](docs/requirements/platform-requirements-v1_4.md)，提供[总体需求 Word V1.4](docs/requirements/platform-requirements-v1_4.docx)。
`docs/source` 仅保留创建项目时提供的原始文档；后续需求修订放在 `docs/requirements`，数据库设计修订放在 `docs/database`，交互及界面设计稿放在 `docs/design`。
最新[数据库设计 V1.5](docs/database/wildlife_database_design_v1_5.md)及[Word](docs/database/wildlife_database_design_v1_5.docx)已同步[设计指南](docs/database/database_design_guide.md)及用户确认：工作组承担数据归属和人员管理，项目继承组权限；普通账号申请工作组及等级，工作/只读由组管理员审批，管理由系统管理员审批。新增生境历史、相机参数、坐标/下载控制及多段有效工作区间，保留维护、媒体独立拍摄标记和字段固定选项。

一期设计包括工作组/项目、共享位点与机位、生境、维护及布设、影像、标签导入、豹/兔狲档案和查询统计；一期不含个体关系或实体相机库存。二期沿用人工个体标注、繁殖、可视化与报告规划；素材库和物种 AI 另定。

以上为设计目标；以下仍记录当前旧模型的实现能力，本轮未改动应用或执行迁移。原始附件、历史需求 V1.3 及旧数据库设计保留追溯。

当前可以完成：管理员登录 → 建立相机位点 → 记录工作与回收周期 → 建立物种和个体档案 → 查看监测概览。
支持新增/列表 API、区域只读账号、精确坐标权限和新增操作审计。
20 张业务表已建立，但**建表不表示对应功能已实现**。第一期完整验收闭环尚未完成。

文档目录的用途和最新版本入口见 [docs 目录说明](docs/README.md)。

## 在 Dell / WSL2 或本地启动

需要 Docker Engine / Docker Desktop（启用 WSL2），Docker Compose v2 和 Python 3.12。

```bash
python3 scripts/create-local-env.py
# 在本机安全地查看或编辑 .env 中的账号配置；不要把密码发到聊天或提交到 Git。
docker compose up -d --build --wait
```

创建脚本只在 `.env` 不存在时写入随机密码和签名密钥；不会覆盖现有配置。
管理员用户名默认 `admin`，首次密码在本机 `.env` 的 `ADMIN_PASSWORD` 中。
API 首次启动执行 Alembic 迁移并创建管理员；重启不修改已有管理员密码。
若修改数据库密码，已有数据库卷的密码不会自动改变，请使用 PostgreSQL 正式改密流程。

网站仅绑定本机 8080 端口；数据库和 API 不发布公网端口。
本地验收时使用浏览器访问本机 8080 端口。API 文档在 `/api` 对应的 FastAPI 服务 `/docs`，可通过 Docker 网络或本地开发服务查看。
远程部署须另外配置受信任 TLS 和安全网络连接；此初版尚未具备生产级限流、账号恢复、密码重置和完整运维能力。

```bash
# 内部 readiness 检查
curl --fail http://127.0.0.1:8080/api/health
# 停止服务并保留数据库卷
docker compose stop
# 再次启动并检查 readiness
docker compose up -d --wait
```

请勿在有数据时运行 `docker compose down -v`；该命令会删除数据库卷。

## 开发与自动化检查

Python 3.12；Node.js 24；uv 0.12.23。依赖通过 uv.lock / package-lock.json 固定。

```bash
cd backend
uv sync --frozen
# 先设置 DATABASE_URL 和 AUTH_SECRET（不要将值提交到仓库）
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

```bash
cd frontend
npm ci
npm run dev
# Vite 将 /api 转发给本机 8000 端口的后端
npm run build
```

测试使用真实 PostGIS；每次创建独立随机数据库，并对其进行迁移与测试，不清空业务数据库。
测试账号须具备建库/删测试库权限，仅用于开发/CI。

```bash
# 从仓库根目录执行；仅开发环境发布本机 55432 数据库端口
docker compose -f compose.yaml -f compose.test.yaml up -d db --wait
# 读取本机 .env，构造测试连接，不输出密码
python3 scripts/test-backend.py --env-file .env
backend/.venv/bin/ruff check backend
npm run build --prefix frontend
```

CI 运行 PostGIS 集成测试、Ruff 和前端生产构建。数据文档中的 `region` 用作当前访问隔离边界；
`UNIQUE(region, site_code)` 允许不同区域复用编号。普通查看账号只能读取授权区域的位点、周期和概览，
默认隐藏坐标；物种字典可共享读取，个体档案暂时只对管理员开放，避免未经设计的跨区域身份泄露。
账号通过管理员调用 `POST /api/users` 创建，权限管理界面尚未实现。

## 云环境

每个 Codex 云任务已有独立环境，使用 `/workspace/WildlifeDATA` 现有 checkout；不要创建额外 worktree。

```bash
bash scripts/cloud-install.sh
python3 scripts/cloud-compose.py up -d --wait
python3 scripts/test-backend.py --env-file /workspace/.wildlife-data.env
```

云环境密码和签名密钥保存在仓库外的 `/workspace/.wildlife-data.env`（0600），不提交到 Git。
`cloud-compose.py` 动态解析已有平台代理、通过 BuildKit secret 挂载平台受信任 CA；不关闭 TLS 验证，
不把代理值或证书复制到仓库。普通 Dell/WSL2 部署不需要此云专用辅助脚本。
运行进程不会随环境快照保留，未来任务须重新启动服务。云初始化不是生产部署或生产数据验收。

## 下一步

具体功能状态、文档冲突与待验证事项见 [实施清单](docs/implementation.md)。
下一阶段优先实现原始媒体索引与播放、XMP 和 Excel 导入，并用真实样例验证匹配规则与事务覆盖。

## 模块 01 设计评审

[低保真原型与使用说明](docs/prototypes/module01/README.md)提供可离线打开的单文件 HTML、九页 PDF 和页面截图。原型使用示例数据，不连接正式业务 API。
