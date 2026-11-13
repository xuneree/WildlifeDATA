# 项目当前状态

更新：2026-11-12。新会话按用户提出的新任务开展，以下仅提供最新资料和进展。

## 当前文档

| 内容 | 入口 |
| --- | --- |
| 业务依据 | [数据库设计 guide](database/database_design_guide.md) · [使用场景](design/scenario.md) |
| 总体需求 | [V1.4](requirements/platform-requirements-v1_4.md)（同目录含 Word） |
| 数据库设计 | [V1.5](database/wildlife_database_design_v1_5.md)（同目录含 Word） |
| 模块1需求 | [相机管理 V2.0](requirements/module01-camera-management-v2_0.md)（同目录含 Word） |
| 模块1 demo | [说明、在线预览及源码](demos/module01/README.md)（相机位点管理完整演示；包含列表、完整信息、操作/自动周期及 Excel 导入） |
| 模块2 demo | [物种识别：说明、在线预览及源码](demos/module02/README.md)（Excel 导入、列表、筛选和下载；独立原型） |
| 模块3 demo | [个体识别：说明、在线预览及源码](demos/module03/README.md)（Excel 导入、列表、筛选和下载；独立原型） |
| 三模块整合 Demo | [统一导航、运行与整合包](demos/integrated/README.md)（另存目录，原三个 Demo 保留） |
| 正式实现 | [实施状态](implementation.md) · [验证记录](validation.md) |

## 当前进展

- 模块1统一称相机管理，包含位点信息、生境调查、操作记录、布设周期；旧 module01 资料已完整归档，后续以当前模块需求和 demo 源码开展。
- [相机位点管理 Demo](demos/module01/README.md) 已完成列表、位点摘要/完整信息页、两步新增、调查历史、操作与自动周期、附件导出及 Excel 模板/预校验/整批导入；已部署[私有云端预览](https://wildlife-camera-review-20261111.golden-reed-8427.chatgpt.site)，用户已确认同步 GitHub。数据仍在当前浏览器，尚未接入正式后端。
- 物种识别独立原型已使用 React 19 / Ant Design 6，实现 Excel 预检、列表、筛选和下载；正式应用仍为旧模型初版，尚未按最新设计升级。

- 个体识别独立原型已替换为新版 Excel 的 36 条有效记录和 26 个源字段，按数据库逻辑区分媒体、个体观察与复核；样例复核人补 CS、状态已复核，中文展示编码，导出保留源值并增加复核字段；筛选限用户指定九项，取消编号标签点选与额外筛选；正式媒体匹配及档案入库尚未接入。

- 三模块已在 `docs/demos/integrated` 汇成统一工作台，保留各模块业务实现与持久化；支持一次构建、源码/静态包和桌面/手机导航。已合并全部模块分支并清理已合并远端分支，仅保留 main；[公开体验链接](https://wildlife-integrated-demo.golden-reed-8427.chatgpt.site) 可直接转发。来源与合并口径见[整合说明](demos/integrated/README.md)。

## 待同步

- guide 中的位点手填状态描述待用户同步为操作推导；当前需求和数据库设计已按确认规则修订。
- 表单已审阅规则与 guide/设计的其他差异见 [Demo 说明](demos/module01/README.md)。

- 已确认 module02 使用 Excel 导入，独立拍摄空值为非独立拍摄；桌面筛选五列且拍摄时间一列、独立拍摄勾选位于记录工具栏，标签筛选项位于识别记录标题下方，不显示标签标题或位点数，人类标签在筛选中通过可维护映射归并为人类干扰、列表与下载保留具体标签，区域/小地名/项目通过位点关联（演示数据已获确认），回收批次导入兼容旧表头；总体需求现有 XMP 描述及正式入库规则待同步，建议文字见 [module02 说明](demos/module02/README.md#待同步与待确认)。

- module01 已确认而待同步 guide 的当前交互、自动周期与摘要/完整信息层次见 [Demo 说明](demos/module01/README.md)及[列表视觉与交互规范](design/list-ui-guidelines.md)，用户维护的 guide 保持原文。

- 已确认 module03 一期为 Excel 导入、列表、筛选、下载且与 module02 组件一致，采用本次新版表格，复核人统一补 CS，筛选仅区域/小地名/项目/位点/回收批次/拍摄时间/关键词/个体编号/复核状态，不加年龄、性别和标签点选；编码释义来自新表头，个体独立标记及日期级校正的正式入库规则待接入设计，建议文字见 [module03 说明](demos/module03/README.md)。
