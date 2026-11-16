# 项目当前状态

更新：2026-11-16。新会话按用户当次任务开展，以下只提供当前入口、进展与必要待办。

## 当前文档

| 内容 | 入口 |
| --- | --- |
| 业务依据 | 用户维护的[数据库 guide](database/database_design_guide.md)及[使用场景](design/scenario.md)；已确认待同步规则见模块需求 |
| 文档分工及模块映射 | [需求目录](requirements/README.md) |
| 总体需求及导航 | [V1.4](requirements/platform-requirements-v1_4.md)；导航和页面关系见第 2.1 节 |
| 相机管理需求 | [V2.0](requirements/module01-camera-management-v2_0.md)及[交互说明](design/module01-camera-management.md) |
| 物种识别需求 | [V1.0](requirements/module04-species-recognition-v1_0.md)（含页面流转） |
| 个体识别需求 | [V1.0](requirements/module05-individual-recognition-v1_0.md)（含页面流转） |
| 相机管理 Demo | [说明、源码和预览](demos/module01/README.md) |
| 物种识别 Demo | [说明、源码和预览](demos/module04/README.md) |
| 个体识别 Demo | [说明、源码和预览](demos/module05/README.md) |
| 整合 Demo | [统一导航、来源和运行](demos/integrated/README.md) · [公开体验](https://wildlife-integrated-demo.golden-reed-8427.chatgpt.site) |
| 数据库设计 | [V1.5 结构草案](database/wildlife_database_design_v1_5.md)，首页列明与当前业务的待衔接范围 |
| 正式实现 | [实施状态](implementation.md)及[验证记录](validation.md) |

## 当前进展

- 相机管理、物种识别、个体识别已完成当前范围的交互 Demo 并整合导航。数据在浏览器，正式后端、权限、媒体播放及跨模块稳定关联尚未按当前需求接入。
- 三模块需求与总体需求已接收最新确认规则；物种按 Excel 推进，两个识别入口均以记录为主体，导入和历史用页内弹窗。具体规则及已确认/暂定/待设计边界集中在模块正文，Demo README 维护实现和验证说明。
- 相机需求已同步 V4.2 字段、秒参数、六位坐标、可选记录人员、位点详情层次、自动周期、删除保留和位点/操作 Excel。物种与个体需求保留各自筛选、标签/复核及源观察规则，不将 Demo 防重键当正式契约。
- Demo 与需求文件按总体需求 V1.4 统一编号：物种识别 module04，个体识别 module05；独立及整合源码、构建和文档引用同步更新，浏览器存储键兼容原值。公开站点尚未重新部署，验证范围见 Demo README。
- 当前需求、设计文档只维护 Markdown；历史版本、旧原件、旧原型和历史验证已集中到[归档目录](archive/README.md)，旧路径占位与重复 Word 已删除。

## 必要待办

- 用户维护的 guide 尚需补入各模块需求末尾的建议文字；这些规则已确认，不因 guide 未回写而退回旧描述。
- 正式数据/接口设计需衔接相机 V4.2、别名、安装/检查/撤回、自动周期、保留历史的删除与媒体引用；故障和有效工作量、其余批量模板仍待落实。
- 物种 Excel 的稳定匹配、人员/非动物标签、映射权限、更正事务，以及个体源观察、日期级校正、独立标记和档案匹配仍待正式设计。XMP 范围另行确认，不列为当前必验功能。
- 后续按导航逐模块推进；影像文件管理、个体档案、查询统计和工作组/系统管理的详细设计尚未完成。权限、稳定 ID 和跨模块关系在正式开发前共同核对。
