# 模块2 · 影像文件管理 Demo

实现对象是独立 React 原型 `docs/demos/module02`，并以快照接入[整合 Demo](../integrated/README.md) 的 `#/media`。基于 GitHub main `d724f77b0707201e6795460a879b404dd8d08032`；依据 [模块2需求 V1.0](../../requirements/module02-media-management-v1_0.md)、总体需求 V1.4、数据库 guide 和使用场景。不是旧版正式 `frontend` 的媒体接口实现。

## 运行和审阅

Node.js 22 以上版本（直接执行 TypeScript 测试需要 Node.js 22.18 以上）：

```bash
npm ci
npm run dev -- --port 5174
npm test
npm run build
```

浏览器访问 `http://localhost:5174`。先看目录列表，点击整行进入只读详情，点击“校准拍摄时间”进入表单，预览后写入。取消不改数据，关闭保留筛选与分页；关联目录在页内弹窗完成，结果页返回对应批次。独立版内置 5 个目录、94 份媒体元数据，包括未校准、零偏移和周期外示例，不包含真实影像。

扫描真实目录时，填写实际批次根路径，选择批次文件夹；目录内部是位点/相机/媒体。浏览器读取真实 File.lastModified、大小、名称和相对路径，不发送媒体上传请求；绝对路径需用户填写核对。支持 MP4/MOV/AVI/JPG/JPEG/PNG。未匹配周期阻断提交，相同路径、大小及修改时间一致时幂等跳过，大小或修改时间不同报冲突，不覆盖原值。已设置的周期校准在关联时应用，新文件继承本模块最近的周期校准。

整合版从相机 Demo 的已结束、已关联周期读取稳定 ID、结束操作批次、日期及已有校准；内置相机示例可产生媒体元数据供审阅，自建相机不凭空生成媒体。源周期变更不会自动按编号或时间重新挂接旧媒体；失去匹配时显示“周期待核对”。

## Ant Design 符合性

- 按 [Ant Design 基准](../../design/ant-design.md) 和[列表规范](../../design/list-ui-guidelines.md)实现，依赖锁定 `antd 6.7.0`、`@ant-design/icons 6.3.4`、React 19.1.1；使用官方 v6 API，核对同版本 Upload 文档及 Drawer/Form/Table/DatePicker 类型声明。
- ConfigProvider 统一中文 locale 和 `#1677ff` 主色，Ant Design App 提供 message 上下文；默认圆角、控制高度与相邻模块一致，字号和表格密度通过 Token 管理。dayjs 中文 locale 已配置，业务时间统一解释为 UTC+8。
- 实际组件包括 Layout/Menu/Breadcrumb、Card/Statistic、Table、Descriptions/Drawer、Form/Input/Select/DatePicker、Upload.Dragger、Steps、Modal/Result、Tag/Alert/Empty 和 message；没有自绘替代这些控件。
- CSS 仅处理业务布局、14px 编号日期/12px 次要信息、行焦点和窄屏；不批量覆盖 Ant Design 内部 DOM。界面仅放业务字段、校验及反馈，开发/存储/权限边界在本说明维护。
- 周期边界只读，目录行可用键盘进入；查看和修改分开，取消返回已保存详情；新关联前预检、预览与确认分开。根表单具有独立 name，避免字段 `root` 与页面挂载节点同名导致标签失效。

## 验证

14 项模型测试覆盖目录解析、前导零、mtime 保留、路径及时间异常、周期匹配、防重/冲突和批次原子提交、周期统一校准、正/负/零偏移、再次校准不叠加、历史单文件值优先和持久化损坏提示。

浏览器检查运行：

```bash
CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs
```

脚本优先使用已安装的 Playwright（整合版工作区提供），也可通过 `PLAYWRIGHT_MODULE` 指向 playwright-core 的 package.json。验证实际 Ant Design 组件、键盘进入只读详情、预览/保存/取消、存储失败保留输入及重试、刷新保留、筛选与范围导出、真实目录扫描/重复跳过、不上传媒体、390px 无页面溢出。桌面、详情、校准、目录预检和手机截图在 `screenshots/`。

整合版另验证导航到影像模块、相机周期 ID 关联及模块切换保留；其他模块回归范围见整合 README。构建和交互检查不替代生产媒体服务、权限及真实拍摄样例验收。

## 实现边界

数据及操作记录保存到本浏览器的独立键 `wildlifedata-media-module02-v1`。一次保存同写媒体索引、当前校准和操作历史；存储失败保留原数据和输入。导出 JSON 含周期 ID、路径、首次拍摄时间及独立校准时间，时间点使用 ISO 8601。

写入的是媒体索引的校准时间，不改源文件 mtime、EXIF 或视频容器元数据；尚无后端/NAS写入、哈希和鉴权播放。新校准尚未反写相机管理台账，不把前端存储模拟称作跨模块事务或正式审计。日期级周期只检查是否越出首末日期，不能判定同维护日内的精确边界。详细待设计范围集中在模块需求，不重复建立第二套业务规则。
