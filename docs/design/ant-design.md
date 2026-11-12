# Ant Design 使用基准

项目已确定采用 Ant Design 设计体系和官方 React 组件库 `antd`。本文由助手维护，供后续界面任务读取；业务需求仍以用户维护的 guide 和已确认需求为准，不复制官方完整文档。

## 设计原则

- 依据官方“自然、确定性、意义感、生长性”的设计价值观，强调任务清晰、操作可预期、反馈明确与组件复用。
- 页面保持一致的信息层级：导航、标题与主要操作、筛选、业务内容。工作组、项目、位点、相机操作和布设周期等名称与最新 guide 一致。
- 同一任务区域突出一个主要操作，其他动作降低视觉权重；状态用文字配合色彩表达。
- 采用响应式布局、统一栅格和间距尺度；优先沿用组件默认字体、尺寸、圆角及语义颜色。品牌色、密度等定制集中管理，不逐页自行定义。

## 组件选型

| 场景 | 优先组件与用法 |
| --- | --- |
| 页面框架与导航 | `Layout`、`Menu`、`Breadcrumb`、`Tabs`；按业务任务组织入口 |
| 数据列表 | `Table` 配合筛选、排序、分页；使用稳定业务 ID 作为 `rowKey`，大数据量与服务端查询配合 |
| 录入与校验 | `Form`、`Input`、`Select`、`InputNumber`、`DatePicker`；编号用文本保留前导零，只有实际数值使用数字输入 |
| 详情与编辑 | `Descriptions`、`Drawer`、`Modal`；复杂长流程使用独立页面，避免多层弹窗 |
| 文件与分步任务 | `Upload`、`Steps`、`Progress`、`Table`、`Result`；上传、预校验、确认提交和实际写入结果分别表达 |
| 状态与反馈 | `Tag`、`Alert`、`Empty`、`Spin`/`Skeleton`；短反馈使用 message，需持续关注的通知使用 notification |
| 风险操作 | `Popconfirm` 或确认弹窗；说明对象、范围和后果，不机械地为所有操作增加确认 |
| 图标与统计 | `@ant-design/icons`、`Statistic`；图标操作有可访问名称，地图与专业图表按需求另选工具 |

## 实现约定

- 当前前端为 React 19 + TypeScript + Vite，尚未安装 `antd`；正式接入优先评估官方 v6 稳定系列，安装时重新核对兼容性，以 `package.json` 和锁文件中的实际版本为准。
- v6 支持 React 19，不引入 v5 专用 React 19 补丁；图标库与 antd 主版本配套。按实际版本查阅 API，不混用旧版示例。
- 根层统一设置 `ConfigProvider` 的语言和主题，其下使用 Ant Design `App` 提供反馈上下文；业务根组件使用其他名称避免混淆。通过 `App.useApp()` 或官方 Hooks 获取反馈实例。
- 主色、圆角、字号和间距等通过 `theme.token`、组件 Token 及 `theme.useToken()` 统一使用。自定义 CSS 聚焦业务布局，避免依赖组件内部 DOM 或大量覆盖 `.ant-*`。
- 中文界面统一配置中文 locale；使用日期库时同步其 locale。现场日期与时间点分别处理，不因组件选型擅自改变业务时区或日期精度。
- `Upload` 不等于自动上传或业务入库，按接口设计控制上传时机。分页、排序、筛选及权限必须与服务端实际能力一致。
- 优先使用基础 `antd`；Ant Design Pro、Pro Components、图表库和移动组件按实际需求评估，不默认全部引入。

## 交付检查

- 核对需求字段、权限、术语和流程；旧模块 01 草案不得覆盖最新 guide。
- 区分加载、无记录、筛选无结果、无权限、失败与成功；提交结果不明时保留“待确认”，避免误报未写入或成功。
- 表单错误靠近字段，失败保留输入；提交时防重复操作。保留既定的批量原子性、并发冲突和审计要求。
- 检查键盘操作、焦点、标签、对比度及窄屏布局；不将未授权数据仅用样式隐藏。
- 实现页面时运行类型检查/构建，并按改动验证关键交互与页面截图；文档更新不冒充运行验证或迁移完成。

## 官方查阅入口

- [设计价值观](https://ant.design/docs/spec/values-cn/) · [布局](https://ant.design/docs/spec/layout-cn/)
- [React 介绍与兼容环境](https://ant.design/docs/react/introduce-cn/) · [组件总览](https://ant.design/components/overview-cn/)
- [主题与 Design Token](https://ant.design/docs/react/customize-theme-cn/) · [ConfigProvider](https://ant.design/components/config-provider-cn/) · [App](https://ant.design/components/app-cn/)
- [Table](https://ant.design/components/table-cn/) · [Form](https://ant.design/components/form-cn/) · [Upload](https://ant.design/components/upload-cn/)
- [国际化](https://ant.design/docs/react/i18n-cn/) · [v6 迁移与兼容性](https://ant.design/docs/react/migration-v6-cn/)

本文记录项目使用规则；组件的最新属性和限制以匹配安装版本的官方文档为准。

列表的文字分级、密度与查看/编辑、筛选、分页、勾选交互遵循[列表视觉与交互规范](list-ui-guidelines.md)。
