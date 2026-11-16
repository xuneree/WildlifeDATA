# 业务需求文档

本目录按需求归属集中保存总体需求、模块详细需求及相关评审意见、业务逻辑图。后续需求修订及配套图件继续放在这里，项目创建时提供的原始附件保留在 [../source](../source)。

| 内容 | 文件 |
| --- | --- |
| 最新总体需求 | [V1.4 Markdown](platform-requirements-v1_4.md) · [V1.4 Word](platform-requirements-v1_4.docx) |
| 历史总体需求 | [V1.3 Markdown](platform-requirements-v1_3.md) · [V1.3 Word](platform-requirements-v1_3.docx) |
| 模块1-相机管理当前需求 | [V2.0 Markdown](module01-camera-management-v2_0.md) · [Word](module01-camera-management-v2_0.docx) |
| 物种识别当前需求 | [V1.0 Markdown](module02-species-recognition-v1_0.md) · [Word](module02-species-recognition-v1_0.docx) |
| 个体识别当前需求 | [V1.0 Markdown](module03-individual-recognition-v1_0.md) · [Word](module03-individual-recognition-v1_0.docx) |
| 模块1历史资料 | [旧需求、评审及原型归档](../archive/module01-legacy/README.md) |
| 平台业务逻辑图 | [PNG](platform-business-framework-v1_3.png) · [SVG](platform-business-framework-v1_3.svg) |

数据库设计及其图件、评审放在 [../database](../database)；交互与视觉设计及其图件、评审放在 [../design](../design)。


## 文档依据与维护分工

1. 用户最新明确确认的决定是修订依据；与旧文档冲突时接收新决定并及时写回，不长期依赖聊天记录判断。用户维护的 guide 保留原文，已确认待同步项提供建议文字，不因尚未写回 guide 而退回旧规则。
2. 总体需求维护分期、模块边界、权限和跨模块规则；模块需求维护该模块范围、字段语义、流程、异常与验收。具体已确认细化以当前模块正文为准；发现尚无确认依据的实质冲突时单列，不将推测当需求。
3. 交互说明和已确认 Demo 说明布局、入口出口、弹窗与抽屉；代码已实现不等于业务确认。暂定匹配键、演示数据和本地存储应标明边界，不能替代正式入库契约。
4. 数据库/接口设计解释关系与约束，结构草案尚未衔接的事项明确列出；不以旧字段否定新业务，正式接入前完成设计及迁移验证。
5. Demo README 维护运行、来源、样例、实现与验证限制，业务规则引用模块正文；PROJECT_STATUS 只维护当前入口、进展和必要待办。
6. Markdown 为正文，Word 同源生成。小修订用 Git 区分，不每次同步另建版本；新建评审基线才升版本并同步入口。旧材料仅供追溯。

当前总体、三模块及数据库适用范围说明的 Word 可在仓库根目录运行 `python3 scripts/render-current-docs.py` 重新生成（需要 Pandoc），沿用项目已有 Word 样式。

## 导航与模块标识

[总体需求第 2.1 节](platform-requirements-v1_4.md#21-按导航推进的模块与页面)维护全平台导航及页面关系。相机管理、影像文件管理、物种识别、个体识别、个体档案、查询与统计、工作组管理分别组织模块；账号申请及系统管理按角色提供入口。物种识别和个体识别独立导航，以记录为主，导入用页内弹窗，不设统一标签导入入口。

| 导航业务 | 现有源码/Demo 标识 | 原九模块分期表序号 | 当前入口 |
| --- | --- | --- | --- |
| 相机管理 | module01 / #/camera | 1 | 模块需求 V2.0及[交互说明](../design/module01-camera-management.md) |
| 物种识别 | module02 / #/species | 4 | 模块需求 V1.0，含页面流转 |
| 个体识别 | module03 / #/individual | 5 | 模块需求 V1.0，含页面流转 |
| 影像文件管理 | 当前无本轮统一标识 | 2 | 总体需求，详细模块设计待推进 |

导航顺序、历史功能序号和 Demo 标识分别记录，不将 module02 误称影像文件管理，也不因插入新菜单重命名已有目录。

## 每模块的最小配套材料

| 材料 | 内容与归属 |
| --- | --- |
| 模块需求 | 范围、业务规则、字段含义、权限、异常、页面/流转和验收，放 requirements |
| 页面说明 | 简单模块直接写需求；已有或较复杂交互放 design，引用业务正文，避免重复套件 |
| Demo 与 README | 源码、预览、样例/模板、运行与完成边界，放 demos/moduleXX；整合快照由整合 README 说明 |
| 数据/接口设计 | 正式开发前补稳定关系、校验、更正、事务、权限及文件访问；共用数据库设计，不每模块另造整套文档 |
| 验证材料 | 测试和关键样例验证随实现维护，正式结果见[验证记录](../validation.md)；原型验证与正式验收分开 |

按“模块需求和页面流转 → Demo → 已确认规则回写 → 正式数据/接口设计 → 开发验证”推进。当前三个 Demo 的交互范围已完成，正式后端、权限、媒体及跨模块关联尚未接入，详见[实施状态](../implementation.md)。
