# 红外相机数据管理平台数据库设计文档

V1.3  |  2026年10月15日  |  PostgreSQL + PostGIS

已确认业务要求与数据库实现建议分层表达。供项目评审、Codex 建模及后续迁移脚本开发使用。

## 1. 文档定位与范围

版本：V1.3（模块 01 审阅同步版）；日期：2026-10-15。技术基线为 PostgreSQL + PostGIS。模块 01 以已审阅详细需求 V1.0 为准；本次仅修订设计文档，未执行数据库迁移，现有程序仍可能使用 V1.2 字段。原始 V1.2 文档保留作为来源归档。

当前业务链：野外相机拍摄 → 每约两个月维护及取回数据 → 本地完成视频/图片的物种标注和复核 → 导出 XMP → 平台导入 → 第一期 Excel 个体标签导入、第二期平台内人工豹个体标注（两期均不含 AI） → 个体管理、繁殖记录和空间可视化。视频占多数；XMP 仅表示文件级物种标签，不含数量、帧时间或检测框。

版本边界：本文的‘确定’表示用户已确认的业务原则；‘实现建议’表示推荐但可在落地时调整的数据库细节；‘待验证’表示需用真实样例检验。

## 2. 核心设计决定

① 平台采用统一业务数据库，按相机监测（含两级区域与固定选项字典）、媒体管理、物种标注、个体管理、繁殖管理和系统审计划分业务模块。

② camera_deployment 记录每个位点、每台相机在一个已结束工作周期中的实际运行情况，以及周期结束时的维护和数据回收信息；回收批次对应本次取回的影像。

③ 位点按 region_level1 → region_level2 → camera_site 归属，一级区域内 site_code 唯一；位点必须属于二级区域。camera_site 记录经纬度、首次布设日期、默认单侧布设类型及启用/停用状态。

④ media_asset 通过 camera_deployment_id 归属具体工作与回收周期；captured_at 在首次导入时取原始文件修改时间，校准值保存在可空的 time_corrected_at。

⑤ 物种标注通过 XMP 批量导入，记录标注人员、复核状态、复核人员和导入时间；再次导入时更新相应文件的当前有效物种标签，并保留导入历史。

⑥ individual_occurrence 记录已确认身份的媒体级个体出现情况；未知个体使用系统标签 unknown_individual。individual_annotation_status 取值为 unannotated 或 annotated。

⑦ 每只豹使用稳定的 individual.id；幼崽独立后更新 individual_code，并将原编号保存至 individual_alias 作为历史编号。

⑧ individual.profile_id 关联 individual_profile.id，表示当前选用的人工整理或拼合的个体代表性图像。

## 3. 命名、类型与约束约定

命名：表名为单数 snake_case；主键 id；外键 <目标业务对象>_id；业务编号 _code；时间点 _at；时间点时段 _start_at/_end_at；仅日期字段 _date、日期区间 _start_date/_end_date；状态 _status；类型 _type；数量 _count；文件大小 _bytes；备注统一 notes。复用词根：数据回收全部 data_retrieval_*；相机标识 device_code、型号 device_type；个体主编号 individual_code。

时间：明确时间点使用 TIMESTAMPTZ；仅日期或日期区间使用 DATE。模块 01 的首次布设、工作起止及数据取回使用 DATE，不附加虚构的午夜时刻或时区；媒体拍摄和系统审计仍保存时间点。原始文件的‘修改时间’作为拍摄时间的数据来源属于业务约定，不代表天然可靠；首次导入后不得静默重写。

UUID 主键由数据库或应用生成。外键缺失数据需显式定义处理规则，不伪造关联。代码字段以 VARCHAR 表示，业务代码是否全局唯一由约束明确。

版本策略：初期先采用直接查询和必要索引；缓存、物化视图、派生的‘独立探测事件’和家域估计不纳入基础事实表。

## 4. 整体设计思路与基础数据表

平台采用统一数据库、分业务模块组织的结构。以相机位点和工作回收周期为监测背景，以视频/图片为原始数据载体，以物种标注和个体出现记录为两层识别结果，再以个体档案、亲缘关系和繁殖事件组织长期监测信息。空间可视化和生态统计通过关联基础记录获取数据，不另建一套重复的影像与标注数据。

### 4.1 基础数据表及职责

| 业务模块 | 底表 | 主要作用 |
| --- | --- | --- |
| 相机监测 | camera_site | 位点基础信息、坐标、生境、首次布设日期、布设类型与启用/停用状态 |
| 相机监测 | camera_deployment | 逐相机、逐回收批次保存工作时段、维护、取回数据和异常信息 |
| 媒体管理 | media_asset | 保存原始视频和图片的索引、拍摄时间及所属工作回收周期 |
| 媒体管理 | media_derivative | 保存代理视频、缩略图和代表帧等派生文件 |
| 媒体管理 | tag | 定义素材标签和系统保留的 unknown_individual 标签 |
| 媒体管理 | media_tag | 建立媒体文件与标签的多对多关联 |
| 物种标注 | species | 维护物种编码、中文名和学名 |
| 物种标注 | annotation_import | 记录每次 XMP 批量导入的人员、状态与统计信息 |
| 物种标注 | annotation_import_item | 逐文件记录 XMP 导入匹配结果及覆盖前后内容 |
| 物种标注 | species_annotation | 保存媒体文件当前有效的物种标签 |
| 个体管理 | individual | 保存豹等已建立身份的个体档案与当前编号 |
| 个体管理 | individual_profile | 保存人工整理或拼合的个体代表性图像 |
| 个体管理 | individual_alias | 保存同一个体的历史编号 |
| 个体管理 | individual_occurrence | 保存已确认个体与视频/图片的对应关系 |
| 个体管理 | individual_relationship | 保存亲缘及其他个体关系 |
| 繁殖管理 | breeding_event | 记录以母兽及繁殖事件为单位的繁殖信息 |
| 繁殖管理 | breeding_offspring | 记录繁殖事件内每只幼崽的身份和独立、生存情况 |
| 繁殖管理 | breeding_evidence | 将繁殖判断关联至原始影像证据 |
| 系统管理 | app_user | 保存平台账号与状态 |
| 系统管理 | audit_log | 记录身份更正、标注覆盖和编号变更等关键操作 |
| 区域与系统支撑 | region_level1 | 一级区域 |
| 区域与系统支撑 | region_level2 | 二级区域及父级归属 |
| 区域与系统支撑 | terrain_option | 地形固定选项 |
| 区域与系统支撑 | vegetation_option | 植被固定选项 |
| 区域与系统支撑 | environment_option | 环境属性固定选项 |
| 区域与系统支撑 | app_user_region_scope | 账号的一/二级区域授权 |

### 4.2 表间关联与数据流

相机与媒体：camera_site.id → camera_deployment.site_id → media_asset.camera_deployment_id。一处位点可以对应多个相机工作回收周期；一条周期记录可以关联多段视频或多张图片。对拍时通过 camera_deployment.device_code 区分 A/B 相机。

物种标注：media_asset.id → species_annotation.media_id，species_annotation.species_id → species.id；annotation_import 和 annotation_import_item 追溯 XMP 批次及单文件覆盖历史。一个媒体文件允许多个物种标签。

个体识别：media_asset.id → individual_occurrence.media_id，individual_occurrence.individual_id → individual.id。一个文件可关联多个已确认个体；未知个体通过 tag 与 media_tag 标注，不生成虚拟个体档案。

个体档案：individual_profile.individual_id → individual.id；individual.profile_id → individual_profile.id，仅指向该个体当前选中的人工制作代表图。individual_alias 与 individual_relationship 分别记录历史编号和个体间关系。

繁殖数据：breeding_event 关联母兽、可选父兽和出生位点；breeding_offspring 关联繁殖事件及可选的已建档幼崽；breeding_evidence 关联繁殖事件与媒体证据。

生态分析：物种探测通过 species_annotation → media_asset → camera_deployment → camera_site 定位；个体探测通过 individual_occurrence → media_asset → camera_deployment → camera_site 定位。时间分析优先使用校准后的拍摄时间，无法校准时使用原始拍摄时间。

### 4.3 数据一致性原则

所有关联使用不随业务编号变化的 UUID 主键；原始媒体文件与人工拼合代表图分开保存；XMP 重传只更新成功匹配文件的当前物种标注并保留历史；已有个体身份及繁殖判断须有可追溯记录。系统可以按模块分阶段实现，但上述外键和数据归属规则应从第一阶段保持一致。

### 5.1 camera_site｜相机位点

相对固定的地理和生境属性；单侧/对拍是位点布设设计，默认 single。层级为一级区域—二级区域—位点；二级区域不是保护区。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| site_code | VARCHAR(20) | 必填 | — | 位点业务编号；一级区域内唯一；文本保存，保留前导零 |
| region_level1_id | UUID | 必填 | — | FK → region_level1.id；与二级区域父级一致 |
| region_level2_id | UUID | 必填 | — | FK → region_level2.id；位点不得跳过二级区域 |
| first_deployed_date | DATE | 可空 | — | 首次布设日期，仅日期 |
| deployment_type | VARCHAR(20) | 必填 | single | single / paired；默认单侧 |
| site_status | VARCHAR(20) | 必填 | active | active / inactive；启用 / 停用 |
| longitude | DOUBLE PRECISION | 可空 | — | WGS84 经度；-180 到 180 |
| latitude | DOUBLE PRECISION | 可空 | — | WGS84 纬度；-90 到 90，与经度一起填或一起为空 |
| elevation_m | NUMERIC(8,2) | 可空 | — | 海拔（米）；允许合法负值 |
| terrain_type | VARCHAR(20) | 可空 | — | FK → terrain_option.option_code；固定选项 |
| vegetation_type | VARCHAR(20) | 可空 | — | FK → vegetation_option.option_code；固定选项 |
| environment_type | VARCHAR(20) | 可空 | — | FK → environment_option.option_code；固定选项 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：UNIQUE(region_level1_id, site_code)，包括停用位点；不同二级区域但同一一级区域不能重号。region_level2 设置 UNIQUE(region_level1_id,id)，camera_site 用复合外键 (region_level1_id,region_level2_id) 保证父子一致；两个区域外键均必填。CHECK deployment_type IN ('single','paired')；CHECK site_status IN ('active','inactive')。坐标必须同时为空或同时填写并满足范围。terrain_type、vegetation_type、environment_type 仅接受对应固定选项字典的 option_code，均最长 20 字符；空值允许，不接受自由文本或未定义词表值。词表具体值待补齐，不预设业务枚举。空间分析使用 WGS84 PostGIS 表达式及 GiST 索引。真实迁移新建 ID/编号；停用/启用不改历史关联。

### 5.2 camera_deployment｜工作周期、维护与数据回收

每行 = 同一位点、同一相机编号、同一次取回数据所对应的上一工作周期。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| site_id | UUID | 必填 | — | FK → camera_site.id |
| device_code | VARCHAR(20) | 必填 | — | 同位点相机编号，例如 701A / 701B |
| device_type | VARCHAR(20) | 可空 | — | 该周期相机型号 |
| work_start_date | DATE | 可空 | — | 有效工作开始日期 |
| work_end_date | DATE | 可空 | — | 有效工作结束日期，不自动等于回收日期 |
| maintenance_by | TEXT | 可空 | — | 维护工作人员；姓名文本，保留此字段，不设维护日期 |
| data_retrieval_date | DATE | 可空 | — | 实际数据取回日期；已取回空卡/损坏文件仍记已回收 |
| data_retrieval_batch | VARCHAR(20) | 必填 | — | 回收批次，例如 202608；原限长不变 |
| data_retrieval_status | VARCHAR(20) | 必填 | — | retrieved / not_retrieved |
| issue_type | VARCHAR(50) | 可空 | — | 异常主类型，正常为空；原限长不变 |
| notes | TEXT | 可空 | — | 异常与回收说明；空卡/文件损坏写入此处，不增数据质量字段 |

约束与说明：FK(site_id)；CHECK(work_end_date >= work_start_date)（两值不为空时）；CHECK(data_retrieval_status IN ('retrieved','not_retrieved'))；UNIQUE(site_id,device_code,data_retrieval_batch)，已确认每批次只回收一次，不增加批次内序号。已取回但空卡、没有影像或文件损坏仍为 retrieved，异常仅写 notes，不新增数据质量字段。删除 maintenance_at，保留 maintenance_by，数据取回日期不代替工作结束日期。问题主类型仍可用 sd_card_lost/camera_lost/camera_damaged/battery_depleted/other，正常为空；issue_type 保持 VARCHAR(50)，不是此次限长修改的字段。

### 5.3 media_asset｜原始视频与图片

文件级记录；一条文件属于一条明确的 camera_deployment。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| camera_deployment_id | UUID | 必填 | — | FK → camera_deployment.id |
| media_type | VARCHAR(10) | 必填 | — | video / image |
| filename | TEXT | 必填 | — | 原始文件名 |
| storage_path | TEXT | 必填 | — | 平台管理的文件路径或存储键 |
| file_size_bytes | BIGINT | 可空 | — | 文件字节数 |
| file_hash | VARCHAR(64) | 可空 | — | SHA-256 文件哈希，支持一致性核验 |
| captured_at | TIMESTAMPTZ | 可空 | — | 首次从原始文件修改时间读入；保留原值 |
| time_corrected_at | TIMESTAMPTZ | 可空 | — | 人工校准后的拍摄时间 |
| duration_seconds | NUMERIC(12,3) | 可空 | — | 视频时长，图片为空 |
| width | INTEGER | 可空 | — | 宽度像素 |
| height | INTEGER | 可空 | — | 高度像素 |
| codec | VARCHAR(50) | 可空 | — | 视频编码 |
| individual_annotation_status | VARCHAR(20) | 必填 | unannotated | unannotated / annotated |
| created_at | TIMESTAMPTZ | 必填 | now() | 首次纳入平台时间 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：约束：FK(camera_deployment_id)；CHECK(media_type IN('video','image'))；CHECK individual_annotation_status；视频时长及尺寸为非负；同一路径宜 UNIQUE(storage_path)，跨目录哈希相同只提示不直接删除。有效拍摄时间可用 COALESCE(time_corrected_at,captured_at) 查询计算。

### 5.4 media_derivative｜代理视频与预览图

存储播放代理、缩略图或抽帧，不覆盖原视频。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| media_id | UUID | 必填 | — | FK → media_asset.id |
| derivative_type | VARCHAR(30) | 必填 | — | proxy_video / thumbnail / frame_capture |
| filename | TEXT | 可空 | — | 派生文件名 |
| storage_path | TEXT | 必填 | — | 派生文件存储键 |
| created_at | TIMESTAMPTZ | 必填 | now() | 创建时间 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：建议索引 (media_id,derivative_type)。代理视频可删除重建，原始视频原则上只读。

### 5.5 species｜物种字典

文件级 XMP 物种值应规范映射到该字典。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| species_code | VARCHAR(50) | 必填 | — | 稳定物种代码 |
| common_name | VARCHAR(100) | 必填 | — | 显示名称 |
| scientific_name | VARCHAR(200) | 可空 | — | 拉丁学名 |
| notes | TEXT | 可空 | — | 分类变化及其他备注 |

约束与说明：UNIQUE(species_code)；分类名称可能变化，既有标注仅关联稳定 id。

### 5.6 annotation_import｜XMP 导入批次

一次批量导入的操作记录；保存来源信息和结果统计。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| imported_at | TIMESTAMPTZ | 必填 | now() | 导入执行时间 |
| imported_by | VARCHAR(100) | 可空 | — | 执行上传的人员 |
| annotated_by | VARCHAR(100) | 可空 | — | 该批原始物种标注人员 |
| review_status | VARCHAR(20) | 必填 | unreviewed | unreviewed / reviewed |
| reviewed_by | VARCHAR(100) | 可空 | — | 该批复核人员 |
| total_file_count | INTEGER | 必填 | 0 | 本次处理的 XMP 数量 |
| success_file_count | INTEGER | 必填 | 0 | 成功文件数 |
| failed_file_count | INTEGER | 必填 | 0 | 失败文件数 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：导入批次级人员字段是默认元信息，如一个批次包含不同标注/复核人，导入流程必须支持文件级覆盖或分批导入。以上统计非负且 success+failed ≤ total。

### 5.7 species_annotation｜当前生效的物种标签

同一个媒体可有多个物种；XMP 不含数量/帧/检测框。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| media_id | UUID | 必填 | — | FK → media_asset.id |
| species_id | UUID | 必填 | — | FK → species.id |
| annotated_by | VARCHAR(100) | 可空 | — | 物种标注人 |
| review_status | VARCHAR(20) | 必填 | unreviewed | unreviewed / reviewed |
| reviewed_by | VARCHAR(100) | 可空 | — | 复核人 |
| annotation_import_id | UUID | 必填 | — | FK → annotation_import.id |
| imported_at | TIMESTAMPTZ | 必填 | — | 该标注最后生效的导入时间 |

约束与说明：UNIQUE(media_id,species_id)，保证一组当前生效标签不重复。替换文件级全部标签需事务化；仅替换明确本次上传且正确匹配的文件。旧结果应另存导入历史快照。

### 5.8 annotation_import_item｜每文件 XMP 结果与覆盖历史【实现建议】

为可追溯的覆盖操作新增最小记录：记录各文件解析与替换情况，避免只保留汇总数字。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| annotation_import_id | UUID | 必填 | — | FK → annotation_import.id |
| media_id | UUID | 可空 | — | 成功匹配时关联媒体；失败时可空 |
| source_filename | TEXT | 必填 | — | 被导入的 XMP 或匹配文件名 |
| import_status | VARCHAR(20) | 必填 | — | success / failed / skipped |
| species_codes | JSONB | 可空 | — | 此次解析的物种代码数组快照 |
| previous_species_codes | JSONB | 可空 | — | 替换前的物种代码数组快照 |
| error_message | TEXT | 可空 | — | 失败原因 |

约束与说明：这是为“重新上传覆盖且仍可追溯”所推荐的最小实现。若采用独立审计事件表，也可以不单独建本表，但必须保存同等信息。

### 5.9 tag｜标签字典

系统标签和素材自定义标签共用字典，unknown_individual 为系统保留 code。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| tag_code | VARCHAR(50) | 必填 | — | 唯一标识，如 unknown_individual |
| tag_name | VARCHAR(100) | 必填 | — | 显示名称 |
| tag_type | VARCHAR(30) | 可空 | — | 标签分组，例如 individual / material |
| description | TEXT | 可空 | — | 标签说明 |

约束与说明：UNIQUE(tag_code)。unknown_individual 仅表示媒体存在无法判定身份的豹，不代表唯一真实个体，也不代表数量。

### 5.10 media_tag｜媒体标签关联

支持同一媒体上的多个素材标签与系统特殊标签。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| media_id | UUID | 必填 | — | FK → media_asset.id |
| tag_id | UUID | 必填 | — | FK → tag.id |
| tagged_by | VARCHAR(100) | 可空 | — | 添加标签的人员 |
| tagged_at | TIMESTAMPTZ | 必填 | now() | 加入标签时间 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：UNIQUE(media_id,tag_id)；标注完成但无已知个体也可保存为 annotated，须由工作流明确触发。

### 5.11 individual｜豹个体档案

内部 id 不随历史编号变化；profile_id 指当前选择的人工整理代表性拼合图。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| individual_code | VARCHAR(50) | 必填 | — | 当前个体编号 |
| species_id | UUID | 必填 | — | FK → species.id |
| profile_id | UUID | 可空 | — | FK → individual_profile.id，当前代表图 |
| sex | VARCHAR(20) | 必填 | unknown | male / female / unknown |
| birth_date_from | DATE | 可空 | — | 推测出生日期下界 |
| birth_date_to | DATE | 可空 | — | 推测出生日期上界 |
| life_status | VARCHAR(30) | 必填 | unknown | alive / confirmed_dead / unknown |
| notes | TEXT | 可空 | — | 档案备注 |
| created_at | TIMESTAMPTZ | 必填 | now() | 建档时间 |

约束与说明：UNIQUE(individual_code)，出生区间边界检查。profile_id 只能指向属于同一 individual 的代表图，需用应用校验或数据库约束/触发器保证；不允许指向另一只豹的拼合图。首末拍日期由确认个体出现记录计算，不在此表重复保存。

### 5.12 individual_profile｜人工整理的个体代表性图像

独立于红外相机原始媒体文件，可一只个体多张拼合代表图。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| individual_id | UUID | 必填 | — | FK → individual.id |
| filename | TEXT | 必填 | — | 拼合图文件名 |
| storage_path | TEXT | 必填 | — | 拼合图存储位置 |
| created_at | TIMESTAMPTZ | 必填 | now() | 存入时间 |
| notes | TEXT | 可空 | — | 说明 |

约束与说明：individual.profile_id 是当前代表图选择，不是个体档案标识；实现双向 FK 时可先创建 individual（稍后添加 profile_id FK），再建 individual_profile，最后补 FK。

### 5.13 individual_alias｜历史编号

包括幼崽时期使用的编号及所有曾用编号，不进行类型分类。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| individual_id | UUID | 必填 | — | FK → individual.id |
| alias_code | VARCHAR(50) | 必填 | — | 历史编号 |
| changed_at | TIMESTAMPTZ | 可空 | — | 停用/变更时间 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：推荐 UNIQUE(alias_code) 避免旧号被不同个体复用；改号需同一事务保存 alias 和修改 current code。

### 5.14 individual_occurrence｜已确认个体出现

媒体级关联；未知个体只记录特殊标签，不进入本表。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| media_id | UUID | 必填 | — | FK → media_asset.id |
| individual_id | UUID | 必填 | — | FK → individual.id |
| annotated_by | VARCHAR(100) | 可空 | — | 人工确认人员 |
| annotated_at | TIMESTAMPTZ | 必填 | now() | 标注时间 |
| review_status | VARCHAR(20) | 必填 | unreviewed | unreviewed / reviewed |
| reviewed_by | VARCHAR(100) | 可空 | — | 复核人员 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：UNIQUE(media_id,individual_id)。一视频同一已确认豹仅保存一条媒体级出现记录；不同豹可多条。未知身份数量无法由标签推导。

### 5.15 individual_relationship｜个体关系

记录有方向的亲缘及社会关系，需要证据和置信度。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| individual_id | UUID | 必填 | — | 关系主体 |
| related_individual_id | UUID | 必填 | — | 关系客体 |
| relationship_type | VARCHAR(30) | 必填 | — | 如 mother_of / father_of / sibling_of |
| confidence_level | VARCHAR(20) | 可空 | — | confirmed / inferred 等 |
| notes | TEXT | 可空 | — | 证据说明 |
| created_at | TIMESTAMPTZ | 必填 | now() | 创建时间 |

约束与说明：CHECK(individual_id <> related_individual_id)。反向与对称关系由应用逻辑管理，不自动认为共同出现即可确认亲缘。

### 5.16 breeding_event｜繁殖事件

母兽与幼崽群的繁殖记录；按事件而不是按单只幼崽组织。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| event_code | VARCHAR(100) | 必填 | — | 繁殖业务编号，不以其作为主键 |
| mother_id | UUID | 必填 | — | FK → individual.id |
| father_id | UUID | 可空 | — | FK → individual.id |
| breeding_year | INTEGER | 可空 | — | 繁殖年度 |
| birth_date_from | DATE | 可空 | — | 推测出生日期下界 |
| birth_date_to | DATE | 可空 | — | 推测出生日期上界 |
| first_observed_at | TIMESTAMPTZ | 可空 | — | 首次发现幼崽的影像时间 |
| cub_count_observed | INTEGER | 可空 | — | 观察到的幼崽数量，不等于总出生数量 |
| birth_site_id | UUID | 可空 | — | FK → camera_site.id；推测出生点位 |
| maternal_solo_activity_at | TIMESTAMPTZ | 可空 | — | 母兽产崽后首次观察到独立活动的时间 |
| breeding_status | VARCHAR(30) | 可空 | — | 繁殖事件状态；具体取值待定 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：UNIQUE(event_code)，推测区间边界及观察数量 ≥ 0；不应将‘产仔地点’过度解释为确切巢穴位置。

### 5.17 breeding_offspring｜幼崽成员

每个繁殖事件可记录多只幼崽及独立结果。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| breeding_event_id | UUID | 必填 | — | FK → breeding_event.id |
| individual_id | UUID | 可空 | — | 已建立个体档案则关联 individual.id |
| temporary_cub_code | VARCHAR(50) | 可空 | — | 事件内历史幼崽编号 |
| independence_at | TIMESTAMPTZ | 可空 | — | 推测独立日期 |
| last_observed_at | TIMESTAMPTZ | 可空 | — | 幼崽最后观察日期 |
| survival_status | VARCHAR(20) | 可空 | — | alive / confirmed_dead / unknown |
| territory_established_status | VARCHAR(20) | 可空 | — | confirmed / unconfirmed / unknown |
| territory_established_at | TIMESTAMPTZ | 可空 | — | 确认建立领地的时间 |
| notes | TEXT | 可空 | — | 备注 |

约束与说明：同一事件的 temporary_cub_code 若填写，应在事件内唯一；不能将“未观察到”视为“已经死亡”。

### 5.18 breeding_evidence｜繁殖证据

关联支持繁殖判断的视频或图片。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| breeding_event_id | UUID | 必填 | — | FK → breeding_event.id |
| media_id | UUID | 必填 | — | FK → media_asset.id |
| evidence_type | VARCHAR(50) | 可空 | — | 影像证据类型 |
| notes | TEXT | 可空 | — | 证据解释 |
| created_at | TIMESTAMPTZ | 必填 | now() | 登记时间 |

约束与说明：UNIQUE(breeding_event_id,media_id) 作为默认建议；一个视频可以支持多个繁殖事件判断。

### 5.19 app_user｜平台账号【最小系统表】

避免 PostgreSQL 中 user 命名歧义；与历史标注人员纯文本并存。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| username | VARCHAR(100) | 必填 | — | 登录名 |
| display_name | VARCHAR(100) | 可空 | — | 展示姓名 |
| is_active | BOOLEAN | 必填 | true | 账号是否启用 |
| created_at | TIMESTAMPTZ | 必填 | now() | 创建时间 |
| password_hash | TEXT | 必填 | — | 安全密码哈希，非明文 |
| role | VARCHAR(20) | 必填 | viewer | admin / operator / viewer |
| can_view_coordinates | BOOLEAN | 必填 | false | 只读账号的精确坐标授权；管理员与工作人员按角色和范围决定坐标权限 |

约束与说明：password_hash 仅保存安全密码哈希，不保存明文。role 为 admin/operator/viewer。管理员访问全部区域及精确坐标；区域工作人员在 app_user_region_scope 授权范围内可录入、修改、查看精确坐标，并删除其有新建权限范围内未被任何业务引用的误建位点；只读账号不可写入，坐标显示由 can_view_coordinates 独立授权且受区域范围限制。原 regions JSON 在实现迁移时映射为明确区域 ID 授权，不继续依赖区域名称字符串。无引用的误建周期删除仍依模块需求限定管理员，不因位点删除规则自动扩大。

### 5.20 audit_log｜关键操作日志【最小系统表】

保存身份更正、编号变化和 XMP 覆盖等关键变动。

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| actor_id | UUID | 可空 | — | 操作账号，FK → app_user.id；历史外部导入允许为空 |
| action | VARCHAR(100) | 必填 | — | 动作代码 |
| entity_type | VARCHAR(100) | 必填 | — | 业务实体类型 |
| entity_id | UUID | 可空 | — | 对象 id |
| before_data | JSONB | 可空 | — | 变更前的关键字段快照 |
| after_data | JSONB | 可空 | — | 变更后的关键字段快照 |
| created_at | TIMESTAMPTZ | 必填 | now() | 操作发生时间 |

约束与说明：记录本模块新增、修改、删除、停用/启用及跨区域调整的操作者、时间与前后快照；业务与审计同一事务。日志中的精确坐标同样受角色/区域/坐标权限约束，不通过日志泄露无权访问的位置；不写入密码、凭据或不必要的影像内容。

## 6. 关系与索引总览

主要外键：camera_deployment.site_id → camera_site.id；media_asset.camera_deployment_id → camera_deployment.id；species_annotation.media_id/species_id/annotation_import_id → media_asset/species/annotation_import；individual_occurrence.media_id/individual_id → media_asset/individual；individual.profile_id → individual_profile.id；individual_profile.individual_id → individual.id；breeding_event.mother_id/father_id → individual.id，birth_site_id → camera_site.id；breeding_offspring.breeding_event_id/individual_id → breeding_event/individual。

推荐索引：camera_site(region_level1_id,site_code) 唯一；camera_deployment(site_id,device_code,data_retrieval_batch) 唯一（已确认）；media_asset(camera_deployment_id,captured_at)；media_asset(individual_annotation_status)；species_annotation(species_id,media_id)；individual_occurrence(individual_id,media_id)；breeding_event(mother_id,breeding_year)；camera_site 若采用空间表达式，可加 GiST 索引。

删除策略：已被媒体或证据引用的相机周期、位点、个体禁止级联删除；派生文件允许按策略清理；审核及导入记录原则上保留。

## 7. 数据导入与覆盖事务规则

A. 原始媒体：导入时选择或自动识别相机周期；以路径与哈希辅助匹配并进行预览；先校验 camera_deployment，再创建 media_asset。原始文件建议只读。

B. XMP：本地识别与复核工作完成后，上传 XMP；导入界面填写标注人员、审核状态和审核人员；按稳定文件匹配规则（相对路径/文件名及必要的哈希或目录上下文）匹配 media_asset。

C. 每个成功匹配的媒体，在同一事务中：保存前一组物种标签快照 → 删除/停用当前有效标签 → 插入新标签 → 记录 annotation_import_item 结果。对于未出现在本次批次中的媒体，不变更。

D. 如 XMP 无标签，默认不等同于‘清空旧标注’；应要求上传者明确选择清空策略。错误匹配、未知物种代码和解析失败不得覆盖原结果。

E. 物种变更与已确认个体的物种不一致时应阻断或提示人工审核，不能静默删除个体出现。

F. 重复导入相同文件和同一组标签应幂等，不产生重复 species_annotation；但可记录实际导入操作历史。

## 8. 未知个体与已标注的业务判定

individual_annotation_status 只有 unannotated、annotated 两值。已确认身份按每个 (media_id,individual_id) 记录于 individual_occurrence，已标注但身份未知的豹只向 media_tag 添加 unknown_individual 标签。标注界面要支持同一媒体‘L001 + 未知个体’并存。

‘已标注’表示标注流程已完成，不表示全部豹都有正式 ID。一个媒体没有 individual_occurrence，也没有 unknown_individual 标签，仍可能是人工审核后确认无需个体记录的完成状态。请在交互界面显式设置‘完成标注’，而不是仅凭有无记录推断状态。

未知个体标签不提供未知豹数量及跨视频追踪，且不能据此建立家域或个体数量统计。

## 9. 数据可视化与分析边界

物种分布：species_annotation → media_asset → camera_deployment → camera_site；可按物种、区域、时间与回收批次过滤。

个体分布：individual_occurrence → media_asset → camera_deployment → camera_site；可展示已确认豹的探测点、首末拍和时间线。

工作量：work_start_date/work_end_date 给出简化工作周期，适合基础统计；遇到周期内反复停机或记录不确定，不应把整个周期当作有效相机工作日。

独立探测事件、MCP、KDE 和占域推断均为基于基础事实数据的后续计算任务，应保存算法、阈值、数据范围及版本；相机探测点不可直接当作连续轨迹或严格的真实家域。

## 10. 实施顺序与待验证事项

优先级 P0：camera_site、camera_deployment、media_asset、species、annotation_import、species_annotation、annotation_import_item、individual、individual_alias、individual_profile、individual_occurrence、tag、media_tag；最小登录及关键审计。

优先级 P1：media_derivative 与视频代理播放、繁殖事件及成员、个体关系、证据链；地图可视化。

优先级 P2：独立探测事件、精细工作日和高级生态分析及繁殖/家域统计；不包含 AI 个体识别。

待验证事项：真实 XMP 结构；媒体修改时间与时区；周期内停机复工；代表图格式；文件级标注人员；繁殖词表；地形/植被/环境固定选项具体值。已确认：两级区域、一级区域内位点编号唯一、每相机每批次一次回收、现场日期精度、区域工作人员写入/坐标权限及只读账号独立坐标授权，不再列为未定问题。

## 11. 模块 01 支撑结构与业务约束（V1.3 新增设计）

以下为落地已审阅需求的实现设计，未执行迁移。区域名称与固定选项字典的长度为设计建议，并非擅自把模块其他字段全部缩短为 20。固定选项具体值尚待业务提供，不预填假定词表。

### 11.1 region_level1｜一级区域

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| region_name | VARCHAR(100) | 必填 | — | 一级区域名，例如山西；唯一 |

UNIQUE(region_name)。一级区域改名不改变 ID；被二级区域、位点或账号授权引用时禁止直接删除。

### 11.2 region_level2｜二级区域

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| region_level1_id | UUID | 必填 | — | FK → region_level1.id |
| region_name | VARCHAR(100) | 必填 | — | 二级区域名，例如和顺；不是保护区 |

UNIQUE(region_level1_id,region_name)；另设 UNIQUE(region_level1_id,id) 支持复合外键。位点必须归属二级区域，不允许悬空或跨父级关联。变更父级会影响位点编号唯一性及数据权限，只能经管理员专门流程校验和审计，不直接级联移动历史归属。

### 11.3 terrain_option｜地形固定选项

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| option_code | VARCHAR(20) | 必填 | — | 主键；固定选项编码，不由录入人员自由添加 |
| option_name | VARCHAR(20) | 必填 | — | 固定选项显示值；具体词表待提供 |

camera_site.terrain_type 外键关联本字典。选项由明确词表初始化；手工录入和 Excel 使用相同字典，未知值拒绝，不静默截断或自动创造选项。已被位点引用的选项不可直接删除。

### 11.4 vegetation_option｜植被固定选项

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| option_code | VARCHAR(20) | 必填 | — | 主键；固定选项编码，不由录入人员自由添加 |
| option_name | VARCHAR(20) | 必填 | — | 固定选项显示值；具体词表待提供 |

camera_site.vegetation_type 外键关联本字典。选项由明确词表初始化；手工录入和 Excel 使用相同字典，未知值拒绝，不静默截断或自动创造选项。已被位点引用的选项不可直接删除。

### 11.5 environment_option｜环境属性固定选项

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| option_code | VARCHAR(20) | 必填 | — | 主键；固定选项编码，不由录入人员自由添加 |
| option_name | VARCHAR(20) | 必填 | — | 固定选项显示值；具体词表待提供 |

camera_site.environment_type 外键关联本字典。选项由明确词表初始化；手工录入和 Excel 使用相同字典，未知值拒绝，不静默截断或自动创造选项。已被位点引用的选项不可直接删除。

### 11.6 app_user_region_scope｜账号区域授权

| 字段 | SQL 类型 | 要求 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | UUID | 必填 | — | 主键 |
| app_user_id | UUID | 必填 | — | FK → app_user.id |
| region_level1_id | UUID | 必填 | — | FK → region_level1.id |
| region_level2_id | UUID | 可空 | — | 为空授权整个一级区域；非空授权该一级区域下指定二级区域 |

非空二级授权使用复合外键 (region_level1_id,region_level2_id) → region_level2(region_level1_id,id)。一级授权以 (app_user_id,region_level1_id) 在二级为空时建立部分唯一索引；二级授权以 (app_user_id,region_level2_id) 在二级非空时建立部分唯一索引。管理员无需逐区域授权；其他角色无授权则不可访问。多个授权取并集，父级授权包含其下位点，但单个二级授权不扩展到兄弟区域。

### 11.7 停用、删除与历史归属

site_status 默认 active；停用为 inactive。停用继续占用一级区域内的原编号，不删除周期/媒体；原位置恢复启用沿用 ID 和编号。新位置建立新 ID/编号，旧影像不改挂。允许停用位点历史补录，普通新增周期选择默认隐藏停用位点；当前状态不能推导历史有效工作日。状态变更在 audit_log 保存操作者、真实时间点及前后状态。

位点删除：在授权范围内具备新建位点权限的账号可删除未被引用的误建位点，不限定管理员；任何周期、繁殖出生位点或其他外键引用均阻止直接删除。数据库外键维持 RESTRICT/NO ACTION，无业务级联删除；权限检查由后端执行。编号、区域、坐标纠错保留审计。

### 11.8 Excel 导入事务

位点、周期分别提供模板。先预校验，不立即写库；按区域授权、固定选项、20 字符限制、日期与唯一键逐行校验。已有相同内容跳过；同键不同内容报冲突，不覆盖。未知区域不自动创建；周期必须匹配已有位点。整批有错先修正，确认后在提交时重验并发冲突；新增记录和审计同事务，失败整批回滚，不产生部分写入。重复上传不增加重复事实。导入结果与错误表也受区域/坐标权限限制。

## 12. V1.3 修订与实现迁移边界

本版设计文档完整保留其他模块的业务表。模块 01 新增两张区域表、三张固定选项表和一张授权表，共六张支撑表；其余模块除与日期/归属关联的说明及已确认不含 AI 的边界外，不扩大需求。

删除 camera_deployment.maintenance_at，不改名保留替代字段；maintenance_by 保留。旧维护日期若已存在，应在实施迁移前检查并归档，不能直接丢弃历史值。

site_code：50 → 20；terrain_type：50 → 20；vegetation_type：100 → 20；environment_type：100 → 20；device_code：50 → 20；device_type：100 → 20。其他字段（如 data_retrieval_batch VARCHAR(20)、issue_type VARCHAR(50)、maintenance_by TEXT）保持各自定义，不做全局限长替换。

first_deployed_at → first_deployed_date；work_start_at → work_start_date；work_end_at → work_end_date；data_retrieval_at → data_retrieval_date，均为 DATE。原 TIMESTAMPTZ 数据转换需先明确原业务时区/来源，核验日历日期，禁止直接按数据库默认时区截断。媒体 captured_at/time_corrected_at 和系统审计 TIMESTAMPTZ 不改变。

region 自由文本替换为明确两级区域 ID；迁移前确认原值映射，不从地区名称猜测父级。位点唯一键升级为 (region_level1_id,site_code)，对同一级区域下不同二级区域重号先反馈，不自动改号。

布设默认 single，新增 site_status 默认 active；地形/植被/环境使用固定选项字典。历史自由文本要先映射合法词表，不能静默裁剪或转换为新选项。

管理员全部坐标可见；operator 在授权范围内可写入并查看坐标；viewer 按范围读取且坐标独立授权。区域工作人员可删除授权范围内未被引用的误建位点。

实施时新增版本化迁移，不改写已执行的初始迁移；先检查超长值、编号冲突、区域映射、字典未知值和日期，给出处理清单并备份。本次没有修改 backend/app/schema.json、SQLAlchemy 模型、API 或数据库实例。

## 13. 文档来源与版本

需求基线：docs/requirements/01-camera-sites-and-retrieval.md V1.0；用户审阅原件：docs/requirements/module01-reviewed-2026-10-15.md。初始数据库设计 V1.2 原件保留在 docs/source，不覆盖历史附件。V1.3 的 Markdown 与 Word 从同一修订内容生成。地形/植被/环境固定选项词表仍需补齐；此项不等于业务表设计或代码实现已完成。
