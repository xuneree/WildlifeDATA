# 项目当前状态

更新：2026-11-10。新会话按用户提出的新任务开展，以下仅提供最新资料和进展。

## 当前文档

| 内容 | 入口 |
| --- | --- |
| 业务依据 | [数据库设计 guide](database/database_design_guide.md) · [使用场景](design/scenario.md) |
| 总体需求 | [V1.4](requirements/platform-requirements-v1_4.md)（同目录含 Word） |
| 数据库设计 | [V1.5](database/wildlife_database_design_v1_5.md)（同目录含 Word） |
| 表单 demo | [说明、在线预览及源码](demos/field-forms/README.md)（基于 V13 修订，线上发布 V17） |
| 正式实现 | [实施状态](implementation.md) · [验证记录](validation.md) |

## 当前进展

- 已完成野外记录表单 demo；本次按 GitHub V13 修订位点动态状态，支持操作保存、历史日期查询和刷新恢复；新增选填网格编号，尚未接入正式后端。
- 正式应用仍为旧模型初版，尚未按最新设计升级。

## 待同步

- guide 中的位点手填状态描述待用户同步为操作推导；当前需求和数据库设计已按确认规则修订。
- 表单已审阅规则与 guide/设计的其他差异见 [demo 说明末节](demos/field-forms/README.md#建议用户补入-guide-的已确认需求)。
