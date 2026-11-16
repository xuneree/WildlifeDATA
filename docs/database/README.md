# 数据库设计

本目录保存实体关系、业务表、字段、约束、索引和迁移设计，旧版保留归档。

当前：[数据库设计 V1.5 Markdown](wildlife_database_design_v1_5.md) · [Word](wildlife_database_design_v1_5.docx)，对应[总体需求 V1.4](../requirements/platform-requirements-v1_4.md)和[设计指南](database_design_guide.md)。

V1.5 当前是结构草案，首页明确与三个最新模块的待衔接范围。相机 V4.2/自动周期/删除、物种 Excel 及非动物标签、个体源观察和日期级校正尚待正式数据/接口设计；业务以[当前模块需求](../requirements/README.md)为准。本次对齐不表示数据库结构已全部修订或可直接迁移。

2026-11-06 同步：工作组承担数据归属与成员授权，项目继承组权限；新增注册申请与分级审批、坐标和下载能力；补齐生境历史、维护后参数及多段有效工作区间。维护、媒体独立拍摄标记及字段固定选项规则保留。当前模型含 27 张基础/支撑表及 1 张可选统计快照表，共 28 张设计表。

历史：[V1.4 Markdown](wildlife_database_design_v1_4.md) · [Word](wildlife_database_design_v1_4.docx)；[V1.3 Markdown](wildlife_database_design_v1_3.md) · [Word](wildlife_database_design_v1_3.docx)。原始附件见 [../source](../source)。

设计更新不表示运行数据库已迁移，实施状态见 [../implementation.md](../implementation.md)。
