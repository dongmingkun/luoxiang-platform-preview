# 络象经纬 · 平台工作台（Gitea）

这是按队长要求拆出的**平台仓库**：只放 Web/Unity 平台、研究工具、部署与答辩材料，**不包含人体模型**。

人体模型（GLB/FBX/Blender/Rhino/经络数据）在 GitHub 独立仓库：

> <https://github.com/dongmingkun/tcm-human-model>（private，需团队授权）

两个仓库**不自动关联、不加 submodule、不自动拉取**。队长从 GitHub 取模型后，手动放入本平台对应目录并本地整合；平台仓库不提交模型。

## 平台页面

| 页面 | 本地地址 | 内容 |
|---|---|---|
| 人体结构图谱 | `/structure.html` | 系统分层、透明度、器官聚焦、分离展示、本机 GLB 载入 |
| 主 3D 演示 | `/` | 教学推演、男/女切换、真实/全息、气血流、经典方作用方向演示；答辩用 `/index.html?demo=1` |
| 教师端 / 教学控制台 | `/teacher.html` | 教学内容事实卡、标准案例、10 个方剂的教学知识表、本机打开记录、JSON/CSV 导出 |
| 阳气运行 | `/yangqi.html` | 昼夜卫阳、督脉/三阳/三阴、脏腑升降、2D 升降图 |
| 数据推演 | `/dataset.html` | CSV/TSV/JSON → 案例/时间轴/曲线/用药事件 → 3D |
| 药材资料 | `/herbs.html` | 50,854 条原文记录检索、性/归经包含筛选、分页与原行号；来源/许可/内容待核 |
| 研究模式 | `/research.html` | 知情同意、匿名前后测、用药推理、SUS/临场感/TAM、101 列 CSV |
| 评委速览 / 答辩任务台 | `/judge.html#defense-workbench` | 四任务点击导览、往届作品来源、证据边界、研究设计、A4 打印 |

表中路径以本机预览 `http://127.0.0.1:8020/` 为基准。答辩/评委演示建议使用 `http://127.0.0.1:8020/index.html?demo=1`：只显示标准案例，隐藏自由症状输入，避免被误解为诊断或智能开方。

教师端可直接打开指定标准案例，例如 `/index.html?demo=1&case=kidneyYang`（阳虚怕冷案）。`case` 支持 `kidneyYang`、`liverStag`、`yinDef`、`spleenDef`，仅在 `demo=1` 时生效；未知值显示提示并保留答辩首页，普通模式忽略此参数。

教师端知识表直接读取 `web/src/knowledge.js`，来源均标为“教材整理/待核”。6 类证型、10 个经典方示例、22 个症状标签按教学代码统计；14 器官、26 经络沿用既有模型整合记录口径，实际版本待现场核对。所有教学参数均为教学演示，不是生理测量/诊断/处方。

“本机演示记录”只记录从教师端打开标准案例的操作，使用独立 localStorage 键；展示/导出时间、案例、证型、方剂，无个人信息，不是研究数据。首次打开显示空状态，不生成虚构记录；清理站点数据后记录消失，存储不可用时明确提示。JSON/CSV 导出不包含研究模式问卷内容。

## 中草药资料

用户提供的 JSON/CSV 已逐行核对并原样存于 `datasets/herbs/originals/`（网页根目录外）。资料页只加载约 6.86 MB 的字段投影，按名称/原文功效检索，保留同名差异，不展示用法剂量、不接入自动诊断或荐药。50,854 是记录数，36,726 是名称数，均不等于独立药材物种数。原始出处、许可和内容待核实；这些资料不随代码自动适用 MIT 许可。来源、哈希、缺失/重复检查与重建方法见 [`datasets/herbs/README.md`](datasets/herbs/README.md)。

## 大挑获奖材料

- 评审自查/7 天行动：`challenge_cup/award/B3_AWARD_PLAYBOOK.md`
- 10 页 PPT 大纲、5 分钟演示、12 个评委问答、证据矩阵、对比框架、技术报告结构：`challenge_cup/award/`
- 入口：`challenge_cup/award/README.md`
- 往届参照与真实补证协议：`WINNING_PROJECT_BENCHMARKS.md`、`VALIDATION_PROTOCOL.md`（均在上述材料包内）；主站“答辩任务台”直达四任务导览，不产生验收或研究记录。

## 络象经纬 · 人体结构图谱（2026-11-03）

当前展示名称已更为“络象经纬”。新结构图谱独立于问卷/推演逻辑；模型仍在独立模型仓。模型仓的 `rhino/output/structure_atlas/` 提供 Rhino+GPT 结构教学版（男女原位/分离 `.3dm` 与 GLB）。在结构页点击“载入本机 GLB 模型”选择文件即可查看，不复制模型进平台 Git、不上传、不自动跨仓下载。具体操作与验证见 [docs/结构图谱与新命名.md](docs/结构图谱与新命名.md)。

## 本机预览（8020）

唯一预览地址：<http://127.0.0.1:8020/>。服务直接读取本仓库当前分支的 `web/`，后续平台改动刷新即可生效；模型只在请求时从同级 `tcm-human-model/web/assets/` 映射，不复制进平台仓。

```powershell
powershell -ExecutionPolicy Bypass -File deploy/start_preview.ps1
# http://127.0.0.1:8020/
```

启动方式、模型映射、停止命令和验收步骤见 [`deploy/README.md`](deploy/README.md)。登录会自动启动；端口被占用时不会重复启动。

## 模型接入（队长本地）

模型不在本仓库。结构页和主站需要以下四个文件：

- `anatomy_male.glb`
- `anatomy_female.glb`
- `meridians.json`
- `meridians_female.json`

文件大小与 SHA-256 见 [`model_manifest.json`](model_manifest.json)。本机预览默认从同级模型仓读取；若队长要在静态托管中整合，可手动放到 `web/assets/`（该路径已 gitignore，不会进入平台 Git）。

Unity：把 GitHub 模型仓库的 6 个 FBX 放到 `unity/TCMYinYang/Assets/Resources/Models/`，在 Unity 中重新导入/绑定；模型目录已 gitignore。

## 目录

```
web/                 平台页面、3D 代码、数据推演、研究模式、vendor
unity/               Unity 平台代码/场景（不含 Models）
challenge_cup/       研究设计、问卷、分析、Codex 任务、评委证据
deploy/              本地/域名部署配置
docs/                数据规范、阳气页、设计、许可
model_manifest.json  外部模型清单（大小/SHA），不是模型
```

## 边界

- 平台**无后端**；数据推演/研究作答只在本机浏览器处理。
- 真实病例/研究原始数据只放本地，不进 Git；`challenge_cup/data/real/` 已 gitignore。
- 页面不诊断、不处方、不预测疗效；教学参数不是生理测量。
- 模型许可与署名见 `docs/ASSET_LICENSES.md`；解剖资产 CC BY-SA 2.1 Japan，代码 MIT。
- 当前平台只有本地站点；没有公网域名/账号系统。

## 许可

- **代码**：MIT License。
- **中草药资料及其字段投影**：用户提供，原始来源/许可待核实，不推定适用代码 MIT 许可；详见 `datasets/herbs/README.md`。
- **解剖资产**：基于 BodyParts3D 4.0（Database Center for Life Science），按 CC BY-SA 2.1 Japan 提供；使用或再分发时须保留署名：
  > BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.

## 版本

v1.5 · 2026-11-03。8020 改由平台仓实时预览服务提供，模型从外部目录按需映射；平台与模型仍完全分离。

## 工单

平台任务统一走 `work-orders/`：模板、状态和当前工单见 [`work-orders/README.md`](work-orders/README.md)。当前 `WO-PF-20261103-001` 对应 Gitea PR #3。
