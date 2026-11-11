# module02 · 物种识别 Demo

本目录是独立交互原型。依据本次用户确认的“Excel 导入、列表查看、筛选和下载”范围、[Ant Design 使用基准](../../design/ant-design.md)及附件 `物种识别数据样例.xlsx` 制作。业务对象参考[总体需求 V1.4](../../requirements/platform-requirements-v1_4.md)、[数据库设计 guide](../../database/database_design_guide.md)和[数据库设计 V1.5](../../database/wildlife_database_design_v1_5.md)。没有新建需求版本；本次源码基于主仓库 `1f9838a`，后续修改由 Git 提交区分。

[在线预览](https://wildlife-module02-demo.golden-reed-8427.chatgpt.site) · [源码 ZIP](module02-demo.zip)

本原型不改正式 `frontend`，不代表生产数据库、工作组权限、物种字典服务或媒体播放已接入。解析与保存发生在当前浏览器，沿用上次原型的本地存储键，旧记录可继续查看。文件不上传服务器；清除浏览器数据会清除导入记录。存储写入失败时不显示导入成功。

## 运行

Node.js 24，React 19.1.1、Ant Design 6.7.0、图标库 6.3.4、Day.js 1.11.13、SheetJS 0.18.5；实际依赖由锁文件固定。

```bash
npm ci
npm run dev
npm test
npm run build
```

## 页面与交互

- 主页面：导航 → 标题及导入/下载 → 记录概况 → 筛选 → 列表，主要动作只有“导入 Excel”。
- 筛选：关键词（文件名、原始路径、标签、位点、相机）、物种/标签、位点、相机、回收时段、拍摄日期区间、独立拍摄；组合条件即时生效，支持重置与无结果状态。
- 列表：分页、拍摄日期时间排序、跨页勾选、文件夹列展开；详情抽屉完整展示 9 个原始字段，返回保留筛选与分页。
- 导入：选择/拖拽文件 → 首个工作表预检 → 确认 → 实际结果。支持 .xls/.xlsx、20 MB 上限、模板下载。首行为全部 9 个中文表头，可调换顺序。编号按文本保留前导零；日期兼容 Excel 1900/1904 序列和 YYYY-MM-DD，时间兼容 Excel 小数和 HH:mm[:ss]。问题按 Excel 行号、字段和原值显示；有任一问题则整批不新增。
- 下载：全部、当前筛选结果、跨页已选记录或单条记录。输出真实 .xlsx，按附件顺序保留 9 个字段，日期为 YYYY-MM-DD 文本，独立拍摄 0 与空值不混淆。

附件为 200 条记录、17 个物种及其他标签、4 个位点；独立拍摄 133 条为 1、67 条为空。17 个标签包含工作人员、空拍等，不能称为 17 个生物物种。独立拍摄为空显示“未判定”，不转成否。统计卡仅汇总导入标记，不计算 RAI 或独立事件次数；文件夹字段保留附件中的原始完整路径。

## 设计符合性

| 约定 | 本次实现与核验 |
| --- | --- |
| 官方组件与中文语言 | ConfigProvider → Ant Design App → 业务组件；中文 locale 与 Day.js 中文 locale；反馈取自 App.useApp() |
| 统一主题 | `src/theme.ts` 集中配置默认蓝色、14px 字号、32px 控件和圆角；业务布局消费 theme.useToken()，不覆盖 `.ant-*` 内部样式 |
| 组件选型 | Layout/Menu/Breadcrumb、Form/Input/Select/DatePicker、Table、Upload.Dragger/Steps/Result、Descriptions/Drawer/Modal、Statistic/Tag/Alert/Empty |
| 匹配版本 API | 实现前查阅官方 6.7.0 tag 的 Upload/Table/Modal/Drawer/App/ConfigProvider 文档及安装包类型；使用 destroyOnHidden、mask.closable、Drawer.size、Statistic.styles 等现行接口 |
| 界面只呈现业务 | 无 DEMO/审阅编号、guide 说明、示例填充按钮、浏览器存储说明、开发架构或虚构工作组/账号；实现边界只放本文 |
| 反馈与可访问性 | 错误有文字与行号；忙碌防重复提交；对话框焦点约束、Esc、关闭后焦点恢复；窄屏侧栏收起，表格内部滚动 |

## 源码入口

`src/workspace.tsx` 为组件与交互；`src/theme.ts` 为唯一主题入口；`src/data.ts` 为字段、校验和存储；`src/excel.ts` 为延迟加载的 Excel 读取及下载；`src/sample.json` 为附件逐行转换的初始数据。`tests/data.test.mjs` 包含 7 项数据行为回归测试。截图在 `screenshots/`。

## 验证

TypeScript 检查与 Vite 生产构建通过；7 项数据回归测试通过。浏览器验证覆盖真实附件重复导入、组合与日期筛选、空值筛选、跨页选择、9 字段 Excel 下载、缺失表头/非法日期时间拦截、成功导入和刷新保留、导入记录、详情返回、无结果、存储写入失败、键盘焦点及桌面/390px 布局。截图核对真实 Ant Design 控件、默认主题色和无开发文案；不将本地校验等同于后端权限/事务验收。

## 待同步与待确认

已确认：本次一期 Demo 采用 Excel。总体需求 V1.4 的物种导入仍写 XMP，本次不回退用户最新要求，也不直接修改用户维护的 guide。建议用户同步的文字：

> module02 物种识别一期先支持 Excel 导入已有识别结果，按样例提供列表查看、组合筛选和 Excel 下载；XMP 接入范围另行确认。

原型暂定规则：以“完整路径 + 文件名 + 物种标签”识别同一条记录，完全一致跳过；同键内容不同则阻止导入并保留原记录，不自动覆盖。可用标签以附件已有集合代替正式字典，未知标签报错，不自动建字典。其他 8 字段必填，独立拍摄允许 1/0/空值。这些是可评审的原型规则，尚未成为已确认的正式入库契约；正式接入前确认唯一键、必填性、物种/人员/空拍分类及更正追溯策略。

工作组和下载权限需由正式服务端实现；当前原型只用于查看附件与交互评审，不据此宣称已有真实权限隔离或并发事务保证。
