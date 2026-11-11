# 模块1-相机管理交互说明

当前基线：2026-11-10；业务正文见[需求 V2.0](../requirements/module01-camera-management-v2_0.md)，实现见[Demo](../demos/module01/README.md)。

模块下四个并列页面：位点信息、生境调查、操作记录、布设周期。页面名称不当作平台模块编号，源码 location/habitat/operation/deployment 标识保持稳定。

沿用最新 React/Ant Design 表单的导航、轻量分区和桌面四栏／平板两栏／手机单栏布局。工作组来自全局上下文；错误靠近字段显示，保存失败保留输入。位点在位状态只读、可按日期查询；调查历史从位点进入，也可独立填写。操作记录按安装、检查、撤回切换条件字段；周期支持多段故障与时间校准。

字段和业务规则只维护在需求正文，不再以旧低保真原型的 Excel 向导代替四表单设计。Excel 批量导入的正式交互仍待后续设计。

遵循[Ant Design 使用基准](ant-design.md)。界面只展示业务字段、必要校验和操作反馈，开发说明与评审信息留在文档中。旧[交互草案](../archive/module01-legacy/design/module01-interaction-v0_1.md)仅供追溯。
