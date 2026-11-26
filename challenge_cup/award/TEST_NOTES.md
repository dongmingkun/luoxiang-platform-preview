# AWARD-OPT 工程验证记录

日期：2026-11-02（Asia/Shanghai）。仅在平台仓运行；不访问完整开发仓或模型仓，不拉模型、不生成受试者作答、不推送远端。

## 环境与证据

- Windows x64；Node v24.19.0；Python 3.14.6 静态服务器；Playwright + 本机 Edge 156.0.0.0，headless、deviceScaleFactor=1。
- 本地服务：`python -m http.server 8765 --bind 127.0.0.1 --directory web`。8765 只用于本次 QA，现场脚本使用 8000。
- 数据源：源码/模板/静态页面；`web/assets/` 只有 README，无模型。以基线提交 `2fd4b6c` 对照本次工作树。
- 原始工程记录：[checks.json](../evidence/award_opt_2026-11-02/checks.json)；[桌面全页](../evidence/award_opt_2026-11-02/judge-1280.png)、[手机全页](../evidence/award_opt_2026-11-02/judge-390.png)、[手机图例](../evidence/award_opt_2026-11-02/legend-390.png)、[手机比较表](../evidence/award_opt_2026-11-02/comparison-390.png)。不含模型或受试者数据。

## 已执行与结果

| 检查 | 实测结果 | 覆盖边界 |
|---|---|---|
| `node --check web/src/*.js`（逐文件执行） | 9/9 通过 | 语法检查，不代替运行时交互 |
| 评委页内联脚本、`verify_award.mjs` 语法 | 通过 | 保留打印按钮逻辑 |
| 五页 HTTP | `/`、`/yangqi.html`、`/dataset.html`、`/research.html`、`/judge.html` 均为 200 / text/html | HTML 200 不代表模型加载成功 |
| 1280×720 | innerWidth/clientWidth/document.scrollWidth/body.scrollWidth = 1280/1280/1280/1280 | 无横向溢出、无越界元素 |
| 390×844 | 同四项为 390/390/390/390 | 无横向溢出、无越界元素；不是裁掉溢出内容来通过 |
| 滚动与内容 | 两视口均能滚至页尾；10 个 section、3 个图例、3 行比较表 | 修复继承的 body 隐藏滚动；状态含文字，不只靠颜色 |
| 评委页运行时 | 两视口 console error=0、pageerror=0、requestfailed=0、外部请求=0 | 仅评委页；不宣称全站 3D 运行无错 |
| 打印按钮 | 两视口点击均调用 window.print() 1 次（测试时用计数替身，避免弹系统窗口） | 另用真实打印引擎生成 PDF 快照 |
| A4 | Edge 打印 PDF 为 6 页；594.96×841.92 pt（A4），12mm 页边距；导航隐藏，白底黑字，三状态文字可辨 | Poppler 渲染六页检查；无裁切/乱码；修复摘要背景、评分表头和边界强调文字的打印对比度 |
| 研究结构 | 源码 COLUMNS 与 experiment_items_template.csv 逐列顺序一致，共 101 列 | 只核表头，不填假问卷、不生成作答 CSV、不声称量表已验证 |
| 证据 CSV | Python csv.DictReader 成功；30 行，6 列且非空；13 verified / 14 pending / 3 not_claimable；本地证据路径存在 | 台账，不是实验数据；按工程/研究/应用/不可声称前缀区分 |
| 保护范围 | web/research.html、research.css、整个 web/src/、web/data/、model_manifest.json、INTEGRATION.md 相对基线无改动 | 未改匿名、sessionStorage、无后端与导出逻辑；未跑新的完整两组研究流程 |
| 分仓 | 当前 Git 索引无 GLB/FBX/BLEND/3DM、经络 JSON、rhino/、blender/、Unity Models 内容；无 .gitmodules / gitlink；真实数据目录未跟踪 | 原有 Unity 经络 JSON 与 .meta 已移除并补忽略规则；不改写历史 |
| git diff --check | 通过 | LF/CRLF 提示是本机换行配置提示，无空白错误 |

A4 渲染预览：[首页](../evidence/award_opt_2026-11-02/print-first.png)、[比较与研究页](../evidence/award_opt_2026-11-02/print-comparison.png)、[边界页](../evidence/award_opt_2026-11-02/print-boundaries.png)。临时 PDF 与完整六页渲染保存在本地 `.git/award-opt-qa/`，不作为研究成果。

## 复现命令

在平台仓根执行；Playwright 仅为 QA 工具，装在 .git/ 下，不修改应用依赖，不下载浏览器或模型：

```powershell
npm install --cache .git/award-opt-qa/npm-cache --prefix .git/award-opt-qa --no-package-lock --no-save playwright
# 另一个终端启动服务
python -m http.server 8765 --bind 127.0.0.1 --directory web
# 再运行核验；默认使用本机 Edge，可通过 AWARD_BROWSER 指向其他已安装 Chromium
node challenge_cup/award/verify_award.mjs http://127.0.0.1:8765 .git/award-opt-qa
node --check challenge_cup/award/verify_award.mjs
git diff --check
```

verify_award.mjs 不填研究表单，只执行语法/HTTP/字段/受保护文件/分仓/布局/打印检查并输出工程截图与 JSON。CSV 另外使用 Python 标准库读取，核对表头、状态、列数和文件路径。A4 用本机 Poppler pdfinfo、pdftoppm -scale-to 1400 -png 查看尺寸并渲染，逐页人工视觉核对。

## 发现与修正

- 首次分仓扫描发现基线仍跟踪 unity/TCMYinYang/Assets/StreamingAssets/tcm/meridians.json（189782 字节）及元文件；已从当前树移除。旧提交仍保留历史，本次不做历史重写。Unity 演示须由队长手动放同版本文件，见本包 README。
- 原评委页把历史模型/性能与全站“0 error”混列；改为标注验证范围和待复测，不将无模型环境描述为集成通过。
- 干净浏览器曾请求不存在的 favicon 导致 404；评委页增加空 data favicon 后复测无错误。打印视觉复核后修正低对比度样式并重测。
- 工作期间出现其他会话新增的本地提交，予以保留；本会话没有执行 push，不把其他会话动作计为本次测试或提交。

## 未验证 / 必须团队补充

- 本次无模型，没有重新测 3D、14/26 数量、男女/肺比例/骨盆隐私、GLB 体积/帧率、Unity。旧 evidence/performance_2026-11-02.* 与 test_record_2026-11-02.md 只是历史整合记录，未改动。
- 答辩机/投影、Safari/Firefox、真实低端手机、冷启动与完整交互/隐私审计均待验证；本次未复跑数据页所有正常/异常路径或研究两组全流程。
- 学习实验、问卷、访谈、专家意见、试点、竞品测评、成本与授权必须团队真实取得；无结果就维持“待采集/待验证”。
- 官方细分评分附件本次未通过验证码取得，权重沿用仓内 07 自查口径，待队长/导师复核。

## 2026-11-12 增量：往届参照与答辩任务台

- 基线 `ff65563`；预览 `http://127.0.0.1:8020/judge.html#defense-workbench`。资料与奖项核对只支持原文有限事实，不证明获奖原因或本项目效果。
- 浏览器 35 项通过：四任务切换/键盘/路径、八页面 200、无 JS 可读、打印展开四任务、1280/390 无横向溢出，console/page/HTTP error 与外部/写请求均为 0。
- 原教师端/答辩模式回归 39 项、Python 4 项、Node 4 项均通过；药材目录复核通过，原件不变；15 个模块/脚本语法及 CI YAML 结构检查通过。
- 实际 A4 导出 8 页，已渲染复核，四任务均包含，往届标题与案例同页。研究/匿名逻辑和 101 列未改，未采集参与者数据，未改模型仓或加入模型。
- 详细证据、截图、PDF 与复查命令见 [本次验收记录](../evidence/award_benchmark_2026-11-12/README.md)。完整研究全流程、资产、医学内容、实际学习效果与来源许可不在本次新增验证范围；远端 CI 另见 PR。
