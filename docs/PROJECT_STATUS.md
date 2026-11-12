# 项目当前状态

更新：2026-11-12。新会话按用户提出的新任务开展，以下仅提供最新资料和进展。

## 当前文档

| 内容 | 入口 |
| --- | --- |
| 业务依据 | [数据库设计 guide](database/database_design_guide.md) · [使用场景](design/scenario.md) |
| 总体需求 | [V1.4](requirements/platform-requirements-v1_4.md)（同目录含 Word） |
| 数据库设计 | [V1.5](database/wildlife_database_design_v1_5.md)（同目录含 Word） |
| 模块1需求 | [相机管理 V2.0](requirements/module01-camera-management-v2_0.md)（同目录含 Word） |
| 模块1 demo | [说明、在线预览及源码](demos/module01/README.md)（当前目录已统一 module01；线上 V18 尚未同步本次命名） |
| 模块2 demo | [物种识别：说明、在线预览及源码](demos/module02/README.md)（Excel 导入、列表、筛选和下载；独立原型） |
| 正式实现 | [实施状态](implementation.md) · [验证记录](validation.md) |

## 当前进展

- 模块1统一称相机管理，包含位点信息、生境调查、操作记录、布设周期；旧 module01 资料已完整归档，后续以当前模块需求和 demo 源码开展。
- 已完成四张野外表单、动态在位状态和选填网格编号；已取消历史补录模式并清理非业务提示，尚未接入正式后端。
- 物种识别独立原型已使用 React 19 / Ant Design 6，实现 Excel 预检、列表、筛选和下载；正式应用仍为旧模型初版，尚未按最新设计升级。

## 待同步

- guide 中的位点手填状态描述待用户同步为操作推导；当前需求和数据库设计已按确认规则修订。
- 表单已审阅规则与 guide/设计的其他差异见 [demo 说明末节](demos/module01/README.md#建议用户补入-guide-的已确认需求)。

- 已确认 module02 使用 Excel 导入，独立拍摄空值为非独立拍摄；统计随筛选更新并弱化展示；总体需求现有 XMP 描述及正式入库规则待同步，建议文字见 [module02 说明](demos/module02/README.md#待同步与待确认)。
