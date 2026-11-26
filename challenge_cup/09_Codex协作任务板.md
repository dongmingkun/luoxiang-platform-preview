# Codex 协作任务板

## STRUCTURE-20261103 — DONE（claimed_by: codex）

- 用户本次明确授权：模型与展示一起优化；模型仓与平台仓分别工作，均为 `codex/luoxiang-structure` 本地分支，不推送，不访问完整开发仓。
- 平台范围：当前品牌更名、`web/structure.html` / CSS / JS、导航、文档和工程验证；不改问卷/匿名/CSV 逻辑，不加入模型。
- 模型范围：Rhino+GPT 结构教学版的参数化肺、独立图层、标注、原位/分离 `.3dm`、教学 GLB、生成脚本和说明；只放模型仓。
- 验收：JS/Python 检查、男女文件、两仓边界、结构交互、桌面/390 布局、本地处理；Rhino GUI 审阅待实际 Rhino 环境。

## AWARD-OPT — DONE（2026-11-02，claimed_by: codex）

- 本次用户授权优先于下文历史完整仓路径：只在平台仓 `tcm-platform-gitea` 的 `codex/award-opt` 分支优化，不访问完整仓或模型仓，不推送。
- 认领：`challenge_cup/award/`、`web/judge.html`、`web/judge.css`、任务/状态和 `evidence/` 工程记录。
- 分仓验收发现旧 Unity 经络 JSON 被跟踪；在本分支移除该文件/元文件并补 `.gitignore`，不改其数据契约或 Git 历史。
- 仅本地提交；不创建远端 PR。研究逻辑、数据与模型契约不变。完成记录见 `codex/STATUS.md`。

> 读取顺序：`AGENTS.md` → `challenge_cup/README.md` → 本文件。  
> 输出目录：`challenge_cup/codex/`。源代码目录不要直接改；如确需改，先在任务板认领并在 PR 说明。

## 0. 当前情况

- Codex 当前打开的项目若是 `计算机挑战 / glaucoma_first`，**不是本仓库**。请先 Open Folder 到 `tcm-yinyang-body`。
- 本项目已有可运行 Web 原型、**研究模式 `web/research.html`**、Unity 原型、Blender 解剖资产与挑战杯研究设计 01–08。
- 目标赛道：**B2 哲学社会科学类社会调查报告（C 文化组）**，备选 B3 科技发明制作。
- 合规红线：不代写最终报告、不伪造数据、不把模拟参数当实验结论。
- 最新交接：`challenge_cup/codex/CURRENT_HANDOFF.md`；状态：`challenge_cup/codex/STATUS.md`。

## 1. 角色边界

| 角色 | 可以做 | 不可以做 |
|---|---|---|
| Codex | 代码审阅、测试、PPT/海报骨架、数据看板、图表、合规清单、可用性脚本 | 代写调查报告、编造数据/访谈、改解剖契约、删免责声明 |
| ZCode | 3D/Web/Unity 原型、研究设计、问卷、分析脚本、申报素材 | 代替团队采集数据、代替团队写最终报告 |
| 团队 | 真实数据采集、最终报告、签字提交、伦理/导师确认 | 把 AI 产出直接当自己的学术写作 |

## 2. 任务队列

状态：`TODO` / `CLAIMED` / `DONE` / `BLOCKED`。认领时把 `claimed_by` 改成 `codex` 并注明日期。

### C1 — Web 原型独立代码审阅

- 优先级：高
- 输入：`web/index.html`、`web/research.html`、`web/dataset.html`、`web/styles.css`、`web/research.css`、`web/dataset.css`、`web/src/*.js`、`web/data/*`、`docs/数据接入规范.md`、`web/README.md`
- 工作：
  1. 在本地 `python -m http.server 8000`，用 1280×720 与 390×844 两个视口检查。
  2. 审阅 3D 资源释放、事件监听、重复渲染、移动端布局、可访问性、错误处理。
  3. **重点审阅研究模式**：前后测校验、sessionStorage 恢复、CSV 101 列与模板对齐、组别条件题、重置/导出、无后端隐私声明。
  4. **重点审阅数据推演**：CSV/JSON 解析、字段别名、缺失/未知脏腑经络/重复天数/坏文件提示、时间轴插值、曲线点击、事件点、3D 状态映射、100 例/大文件性能。
  5. 按 P0/P1/P2 列问题，附文件:行、复现步骤、修复建议；不要直接改源文件。
- 输出：`challenge_cup/codex/C1_code_review.md`
- 验收：至少覆盖 3D 加载失败、重复播放、快速切换症状、移动端滚动/点击、内存/监听泄漏、研究模式两条流程、数据推演 CSV+JSON 两条导入路径。
- 分支：`codex/c1-review`

### C2 — 答辩 PPT 骨架

- 优先级：高
- 输入：`challenge_cup/06_答辩与展示脚本.md`、`docs/web_agent_preview.png`、`docs/unity_runtime_preview.png`
- 工作：用 python-pptx 生成 10 页深色学术风 PPT 骨架：问题、现状、研究问题/假设、方法、原型、实验设计、预期结果、创新、社会价值、团队/计划。**只放事实与占位符，不写最终报告段落。**
- 输出：`challenge_cup/codex/TCM_ChallengeCup_Deck.pptx` + `C2_notes.md`（待团队改写处）
- 验收：16:9；中文字体可读；所有数字标“待采集/模拟参数”；不出现“治愈/疗效保证”。
- 分支：`codex/c2-ppt`

### C3 — 问卷数据看板（无数据也能跑）

- 优先级：中
- 输入：`challenge_cup/data/templates/survey_template.csv`、`experiment_template.csv`、`04_数据分析方案.py`
- 工作：做一个本地 Streamlit 或纯 HTML 看板；读取 CSV；展示样本结构、前后测对比、信效度、效应量；没有数据时显示“请导入真实数据”，**不得内置伪造样本**。
- 输出：`challenge_cup/codex/dashboard/` + README
- 验收：不含真实个人信息；不生成假数据；能被 04 的列名直接读取。
- 分支：`codex/c3-dashboard`

### C4 — A1 海报/图表

- 优先级：中
- 输入：`docs/web_agent_preview.png`、`docs/unity_runtime_preview.png`、`challenge_cup/01_选题与赛道定位.md`
- 工作：A1 竖版 PDF/SVG 海报骨架，含标题、问题、方法、原型四图、创新点、社会价值、二维码占位（仓库/演示）。保留 BodyParts3D 署名。
- 输出：`challenge_cup/codex/TCM_Poster_A1.pdf`
- 验收：文字不溢出；图像有授权说明；不写实证结论。
- 分支：`codex/c4-poster`

### C5 — 可用性测试脚本与记录模板

- 优先级：中
- 工作：为 8 名同学设计 20 分钟可用性测试：任务脚本（用标准案例，不让受试者输入自己的症状）、观察记录表、SUS/开放式问题、知情同意模板、匿名编号规则。
- 输出：`challenge_cup/codex/C5_usability_protocol.md` + `C5_observation_template.csv`
- 验收：不采集个人健康信息；不伪造结果；符合 `08_合规与授权.md`。
- 分支：`codex/c5-usability`

### C6 — 合规与授权审计

- 优先级：高
- 输入：`challenge_cup/08_合规与授权.md`、`docs/ASSET_LICENSES.md`、`docs/数据接入规范.md`、`web/research.html`、`web/dataset.html`、`web/data/*`、官方负面清单摘要
- 工作：逐条检查：AI 代写风险、模拟参数是否被误写为结论、BodyParts3D CC BY-SA 署名/ShareAlike、Three.js MIT、医学免责声明、数据隐私、图片/视频授权、软著材料、**研究模式是否真的不采集个人健康信息/不上传**、**数据推演是否显示来源/许可/非临床标识、是否把演示数据误当真实病例**。输出“通过/风险/待办”。
- 输出：`challenge_cup/codex/C6_compliance_audit.md`
- 验收：至少 10 项检查；每项有证据位置和整改建议。
- 分支：`codex/c6-compliance`

### C7 — 研究模式页面（已完成，由 ZCode 实现）

- 状态：**DONE**
- 输出：`web/research.html`、`web/research.css`、`web/src/research.js`
- 功能：知情同意、主持者编号/组别、前测 A 卷、3D/图文学习、后测 B 卷、SUS/临场感/TAM、开放题、CSV 下载/复制、sessionStorage 恢复。
- 验收：实验组与对照组均已浏览器实测；CSV 101 列与 `experiment_items_template.csv` 对齐；无后端。
- 待 Codex：把研究模式纳入 C1 代码审阅与 C6 合规审计。

## 3. 通用验收

- Web：控制台 0 error；1280×720 与移动端可用；GLB 加载失败有提示。
- 数据：没有真实数据就不产出结果图；模拟参数必须标注“模拟”。
- 报告：不生成 15000 字成稿；只做提纲、事实核对、格式/引用检查。
- 授权：BodyParts3D 署名保留；Three.js MIT 头保留；医学免责声明保留。
- Git：分支 `codex/<task-id>`；输出只进 `challenge_cup/codex/`；不提交真实数据/官方 DOCX/`Library/`。

## 4. 状态记录

完成一个任务后，在 `challenge_cup/codex/STATUS.md` 追加：

```md
## C1 — DONE
- 输出：C1_code_review.md
- 验证：python -m http.server 8000; 1280×720 + 390×844
- 证据：screenshots/...
- 未决：...
```

## 5. 交接给团队

Codex 只提供审阅/工具/骨架；团队需要：
- 用真实问卷与实验数据替换占位；
- 由本人撰写报告与申报书正文；
- 与导师确认赛道、伦理、推荐意见；
- 检查所有数字与引用后提交。

### C8 — 大挑 B3 评审审计（BLOCKED）

- 优先级：高
- 输入：`challenge_cup/07`、`08`、`01`、`02`、`web/*`、`rhino/README.md`
- 工作：评分缺口、架构/数据流、评委页规格、测试计划、竞品对比框架、答辩追问。
- 输出：`challenge_cup/codex/judge-audit/C8_*.md`
- 约束：只写 `judge-audit/`；不编造实验/竞品数据；不改源文件。
- 状态：2026-11-02 Codex provider 模型刷新超时，任务文件已持久化；见 `judge-audit/STATUS.md`。
