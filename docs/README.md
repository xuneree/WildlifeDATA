# 文档目录

先读[项目当前状态](PROJECT_STATUS.md)，再按[需求目录](requirements/README.md)进入业务正文。协作规则见[AGENTS.md](../AGENTS.md)。

维护文档仅提供 Markdown。需求、数据库及设计目录只保留当前有效内容；历史资料集中归档，不在原路径留“已归档”占位文件。

| 目录 / 文件 | 内容 |
| --- | --- |
| [requirements](requirements) | 总体需求及相机管理、物种识别、个体识别三个模块需求；导航和文档依据关系 |
| [database](database) | 数据库设计 V1.5（相机管理 V2.0 结构已对齐）和用户维护的数据库 guide；其余待衔接范围见设计首页 |
| [design](design) | Ant Design 基准、列表规范、相机交互说明及使用场景 |
| [demos/integrated](demos/integrated) | 三模块统一导航、运行和源码来源；独立模块仍在 demos/module01—03 维护 |
| [source](source) | 当前字段依据：V4.2 野外记录表原件，保留原格式 |
| [archive](archive/README.md) | 历史需求、旧数据库设计、旧 guide/交互草案、旧原型、旧原始附件及历史验证；只供追溯 |
| [implementation.md](implementation.md) | 正式实现能力、缺口和开发约束 |
| [validation.md](validation.md) | 当前验证范围及本轮文档检查；旧验证移入归档 |

归档采用移动：保留一份历史正文，更新引用后删除旧路径。重复生成的 Word 和无用生成脚本删除，Git 历史仍可恢复。唯一原始附件、评审原件及旧原型资产保留原格式，区别于重复维护的文档副本。

当前 Demo 源码、测试、样例与构建所需整合快照仍属于有效工程文件，不因文档归档而删除。文档整理不表示正式应用、数据库迁移或线上部署已更新。
