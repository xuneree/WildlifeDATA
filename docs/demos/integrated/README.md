# WildlifeDATA 三模块整合 Demo

统一入口包含相机位点、物种识别、个体识别，另存于 `docs/demos/integrated`；本轮仅同步独立 module01 及其整合快照，其他独立 Demo 沿用原实现。

[可转发的公开体验链接](https://wildlife-integrated-demo.golden-reed-8427.chatgpt.site) · [整合源码与可运行静态包](https://wildlife-integrated-demo.golden-reed-8427.chatgpt.site/downloads/integrated-demo.zip)

## 运行

需要 Node.js 22 及以上版本。在本文件夹中执行：

```bash
npm ci
npm run dev
```

访问 `http://localhost:5173`。`dev` 会先构建三个模块，再启动统一预览服务。修改源码后重新运行即可。也可直接构建、验证和打包：

```bash
npm test
npm run build
DEMO_URL=http://localhost:5173 CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
node scripts/package.mjs
```

构建后的 `dist/` 是一份完整静态站点，支持部署到子目录。源码 ZIP 同时包含源码、锁文件、各模块样例/测试及 `dist/`，不包含依赖、浏览器数据或托管凭据。下载解压后也可不安装 Node，直接运行：

```bash
python3 -m http.server 5173 --directory dist
```

从 HTTP 地址打开，不能通过双击 `index.html` 的 file 协议加载模块。

## 内容和交互

- 相机位点：保留确认后的 29 个演示位点、10 条分页、组合筛选、位点摘要/完整信息页、两步新增、调查历史、操作和自动周期、附件及 Excel 导入导出。
- 物种识别：保留原 200 条样例、标签统计/映射、位点关联筛选、独立拍摄及 Excel 预检、导入和下载。
- 个体识别：保留新版 Excel 的 36 条记录、九项筛选、CS 复核信息、字段分组详情以及原始 26 字段和复核信息的导入下载。

共同左侧导航及顶栏由 Ant Design 提供；手机使用抽屉导航。地址片段 `#/camera`、`#/species`、`#/individual` 支持直接打开和浏览器前进/后退。已访问模块保持挂载，切换后保留筛选、分页和未提交表单；刷新时已保存记录恢复，未提交表单按原模块规则处理。

仅隐藏各模块重复的导航与顶栏，不移除业务按钮、表单或校验。模块内抽屉、弹窗、下载在当前内容视区工作。

## 实现与来源

`modules/` 包含三个独立 Demo 的源码快照，运行和构建不读取同级原目录。模块1保留 React 18 / Ant Design 5，模块2、3保留 React 19 / Ant Design 6。统一工作台采用 React 19 / Ant Design 6，各模块独立构建并在同源内容框架中显示，隔离组件版本与 CSS；module01 的 Vite 配置固定 React/ReactDOM 解析，避免 npm workspace 提升造成混用。

此为统一交互入口及完整交付包，并未把三个浏览器账本改为正式数据库。模块原存储键不同，互不覆盖；不按文件名或不同来源的位点编号猜测媒体外键，也不把 module03 样例强行归入 module01 的演示位点。跨模块正式关联及权限仍需后端实现。不同旧云端域名的浏览器缓存不会自动搬到整合站点。

| 文件 | 用途 |
| --- | --- |
| `src/main.jsx`、`src/style.css` | 共用导航、响应式布局、地址及模块状态保留 |
| `public/embedded.css` | 隐藏各模块重复的页面外框，不修改业务内容 |
| `modules/module01` | 相机位点管理及四类已确认表单 |
| `modules/module02` | 物种识别 |
| `modules/module03` | 个体识别及原始 Excel 测试样例 |
| `scripts/build.mjs`、`package.mjs` | 一次构建三个模块、打包统一静态站点 |
| `tests/integration.cjs` | 统一入口、模块切换、持久化、Excel 和手机端回归 |
| `sources.json` | 来源分支、提交及合并口径 |

本次从主分支 `8b21c51` 汇总全部远端分支。旧 `codex/module01-camera-management-demo` 由审阅版完整替代，合并时保留已确认实现；`fix/module02-ant-design` 已在主分支，保留原样；另外合入 `feat/module01-camera-management-review` 与 `codex/module03-individual-demo`。各分支提交已汇入 main；按用户要求清理已合并的远端分支，仅保留 main。来源分支名与 SHA 留在 sources.json 供追溯。

依据仓库 AGENTS、Ant Design 使用基准、列表视觉与交互规范、三个模块 README、页面及数据库 guide；用户维护的 guide 保持原文。界面保留 module01 的 13px 中文/14px 编号日期分级，模块2、3使用已确认的数字记录布局。统一外框使用官方 Layout/Menu/Breadcrumb/Drawer/Tag/Button，组件视觉沿用 ConfigProvider，适配 CSS 仅处理重复外框。

## 验证

本轮三模块76项单元/业务测试通过（43＋20＋13）；module02 和 module03 类型检查通过，四个构建均通过。整合浏览器检查覆盖导航、切换保留、位点完整信息、个体详情、真实 Excel 下载与重导、物种新增导入、刷新保留和手机导航；另验证新版相机两月批次、10＋2分页、简化头部与返回、删除取消／失败重试／审计／周期和状态同步／跨页编辑防恢复；本轮另验证列表不显示删除／“无问题”、固定可见的A323侧边PIR以及详情内删除；截图位于 `screenshots/`。验证结果不代表生产数据库、媒体服务或权限已接入。

当前 module01 以 GitHub main 为准，本次基于 `3e5ba8f` 增量调整，补齐 V4.2 字段、六位坐标、选填记录人员、两月批次、简化头部、相机统一筛选及详情内删除；列表隐藏删除和“无问题”，参数区固定展示A323侧边PIR开关。公开体验沿用本页原地址，`#/camera` 可直达更新后的相机管理。

派生ZIP通过公开站点的 downloads 链接分发，GitHub保留完整源码、锁文件、测试及打包脚本；本地可运行上述命令重新生成相同功能的静态包。
