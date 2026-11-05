## keyword
| keyword | 中文名 | 定义 | 示例 |
| --- | --- | --- | --- |
| region | 区域 | 独立管理数据的区域 | 如山西、西北、河北&北京（写死） |
| project | 项目 | 有明确目标的监测项目，挂靠region | 如和顺常规监测、和顺X337 |
| location | 位点 | 地理上一个监测位置，挂靠region，可关联多个project | 如701 |
| camera | 相机 | 位点内的机位编号，非实体设备，挂靠location | 如701A、701B |
| retrieval | 回收 | 相机在特定时间点的一次回收记录，挂靠camera | 如701A_retrieved_20261001 |
| deployment | 布设 | 相机两次回收期间的布设周期，挂靠camera | 如701A_deployed_20260801~20260930 |
| media | 媒体文件 | 相机在某个布设周期中拍摄的媒体文件，挂靠deployment | 如IMG00001.MP4 |
| event | 独立事件 | 相机在特定时间间隔内的连续拍摄形成的独立事件，挂靠deployment | / |
| annotation | 标注 | 关联media与species或individual的标注信息 | 如IMG00001.MP4-leopard |
| species | 物种 | 全系统通用的物种字典 | 如1-leopard |
| individual | 个体 | 每只豹/兔狲个体的档案信息 | 如LEO_HS1905F |

## 基础数据表
| 底表 | 中文名 | 主要字段 |
| --- | --- | --- |
| project_info | 项目信息表 | 项目编号、区域、项目名称、项目类型、备注*、负责人 |
| project_location | 项目-位点关联表 | 项目编号、位点编号 |
| location_info | 相机位点表 | 位点编号、历史编号*、布设类型、区域、项目、经度、纬度、海拔、生境类型、地形、停启用状态、轨迹文件* |
| camera_visit | 相机操作记录表 | 操作日期、位点编号、相机编号、操作类型（安装/回收/停用）、回收批次、相机型号（操作后的）、相机工作状态、异常问题、维护内容 |
| camera_deployment | 布设周期表 | 位点编号、相机编号、起始操作id、结束操作id、相机型号、布设日期、回收日期、有效工作开始日期、有效工作结束日期、时间校准（加或减xxx秒，对该周期内所有媒体生效）|
| media_info | 媒体文件表 | 文件名称、文件类型、存储路径、回收批次、拍摄时间、校准时间 （以及其他基础信息）|
| media_derivative | 代理视频与预览图 | |







| 媒体管理 | media_asset | 保存原始视频和图片的索引、拍摄时间及所属工作回收周期 |
| 媒体管理 | media_derivative | 保存代理视频、缩略图和代表帧等派生文件 |
| 媒体管理 | tag | 一期提供 unknown_individual 系统标签；素材自定义标签能力待定 |
| 媒体管理 | media_tag | 建立媒体文件与标签的多对多关联 |
| 物种标注 | species | 维护物种编码、中文名和学名 |
| 物种标注 | annotation_import | 记录每次 XMP 批量导入的人员、状态与统计信息 |
| 物种标注 | annotation_import_item | 逐文件记录 XMP 导入匹配结果及覆盖前后内容 |
| 物种标注 | species_annotation | 保存媒体文件当前有效的物种标签 |
| 个体管理 | individual | 保存豹等已建立身份的个体档案与当前编号 |
| 个体管理 | individual_profile | 保存人工整理或拼合的个体代表性图像 |
| 个体管理 | individual_alias | 保存同一个体的历史编号 |
| 个体管理 | individual_occurrence | 保存已确认个体与视频/图片的对应关系 |
| 个体管理 | individual_relationship | 一期保存档案亲缘关系，不依赖二期繁殖事件 |
| 繁殖管理 | breeding_event | 二期记录以母兽及繁殖事件为单位的繁殖信息 |
| 繁殖管理 | breeding_offspring | 二期记录繁殖事件内每只幼崽的身份和独立、生存情况 |
| 繁殖管理 | breeding_evidence | 二期将繁殖判断关联至原始影像证据 |
| 系统管理 | app_user | 保存平台账号与状态 |
| 系统管理 | audit_log | 记录身份更正、标注覆盖和编号变更等关键操作 |
| 区域与系统支撑 | region_level1 | 一级区域 |
| 区域与系统支撑 | region_level2 | 二级区域及父级归属 |
| 区域与系统支撑 | terrain_option | 地形固定选项 |
| 区域与系统支撑 | vegetation_option | 植被固定选项 |
| 区域与系统支撑 | environment_option | 环境属性固定选项 |
| 区域与系统支撑 | app_user_region_scope | 账号的一/二级区域授权 |


需求待明确：
相机是否需要做库存管理？
位点是否需要历史编号？
一个布设周期内有相机故障又修复的情况吗？





reference:
https://cran.r-project.org/web/packages/camtrapR/index.html
