# 项目当前状态

更新：2026-11-10。新会话按用户提出的新任务开展，以下仅提供最新资料和进展。

## 当前文档

| 内容 | 入口 |
| --- | --- |
| 业务依据 | [数据库设计 guide](database/database_design_guide.md) · [使用场景](design/scenario.md) |
| 总体需求 | [V1.4](requirements/platform-requirements-v1_4.md)（同目录含 Word） |
| 数据库设计 | [V1.5](database/wildlife_database_design_v1_5.md)（同目录含 Word） |
| 表单 demo | [说明、在线预览及源码](demos/field-forms/README.md)（用户审阅称呼 V13） |
| 正式实现 | [实施状态](implementation.md) · [验证记录](validation.md) |

## 当前进展

- 已完成野外记录表单 demo，包含位点、生境调查、相机操作和布设周期；尚未接入正式后端。
- 正式应用仍为旧模型初版，尚未按最新设计升级。

## 待同步

- 已确认位点布设类型和启用状态按时间点的在位相机数自动计算：0 台停用/无布设，1 台启用/单侧，2 台启用/对拍，故障仍算在位；尚未同步到当前文档及表单 demo。
- 表单已审阅规则与 guide/设计的其他差异见 [demo 说明末节](demos/field-forms/README.md#建议用户补入-guide-的已确认需求)。V13 与线上部署版本的对应关系待核对。
