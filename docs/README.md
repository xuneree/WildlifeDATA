# 文档目录说明

本目录按文档用途组织。业务需求、数据库设计和界面设计分别维护；Markdown 便于在 GitHub 阅读和查看修改记录，Word 便于下载、批注及评审。同一版本的两种格式保持一致。

| 目录 | 用途 | 当前内容与后续存放规则 |
| --- | --- | --- |
| [source](source) | 项目创建时提供的原始资料 | 原始需求 V1.2、数据库设计 V1.2 及提取文本，保留原文件名与内容，后续修订不覆盖这里 |
| [requirements](requirements) | 持续维护的业务需求 | 全平台总体需求、各模块详细需求、功能分期与验收要求 |
| [database](database) | 数据库设计 | 表结构、字段、实体关系、约束、索引和迁移设计说明；保留历史版本并标明当前版本 |
| [design](design) | 交互与界面设计 | 交互规范、页面流程、线框稿、视觉设计稿及模块设计说明；后续设计稿按模块组织 |
| [prototypes](prototypes) | 可操作或可演示的原型 | 可打开的 HTML、原型打包文件、演示 PDF、页面截图及原型验证记录；当前为模块 01 低保真原型 |
| [reviews](reviews) | 评审与确认记录 | 用户批注、讨论结论、已确认决定及待办问题；保留当时的评审上下文 |
| [assets](assets) | 文档共用图件 | 业务逻辑图等被需求或其他文档引用的 PNG/SVG；模块专用页面设计稿放 design，原型截图放 prototypes |

当前需求入口：[总体需求 V1.3](requirements/platform-requirements-v1_3.md) · [Word](requirements/platform-requirements-v1_3.docx) · [模块 01 详细需求](requirements/01-camera-sites-and-retrieval.md)。

当前数据库入口：[数据库设计 V1.4](database/wildlife_database_design_v1_4.md) · [Word](database/wildlife_database_design_v1_4.docx)。V1.3 保留在 database 作为历史设计。

根目录的 [implementation.md](implementation.md) 记录已经实现的能力、与需求的差距及开发顺序；[validation.md](validation.md) 记录检查与验收情况。这些状态记录与需求目标分开维护。

数据库设计文档不等于运行数据库已经迁移。实际迁移脚本仍位于仓库的 backend/migrations，本次目录调整不变更数据库结构或业务功能。
