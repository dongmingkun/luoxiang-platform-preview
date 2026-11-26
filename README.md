# 络象经纬 · Web 平台

这是平台仓库的 Web 部分：页面、3D 场景代码、数据推演、研究模式、评委速览与本地服务。

> **本仓库不含人体模型。** 模型来自 GitHub `dongmingkun/tcm-human-model`，由队长手动放入 `web/assets/`；两仓不自动关联。详见根目录 [`INTEGRATION.md`](../INTEGRATION.md) 与 [`model_manifest.json`](../model_manifest.json)。

## 页面

- `structure.html`：人体结构图谱，支持本机 GLB、按系统分层、透明度、器官搜索/聚焦/隔离、标准视图、分离/复位；不含模型数据。

- `index.html`：主 3D 演示 / 证候智能体 / 男女性别 / 真实-全息 / 气血流。
- `yangqi.html`：阳气运行（昼夜、督脉、三阳三阴、脏腑升降、2D 图）。
- `dataset.html`：数据推演（CSV/TSV/JSON → 时间轴/曲线/3D）。
- `herbs.html`：中草药资料只读检索，保留全部原始行号与同名差异；来源/许可/内容待核，不含用法剂量，不参与推演评分。
- `research.html`：研究模式（知情同意、匿名前后测、101 列 CSV）。
- `judge.html`：大挑评委速览（A4 打印）。
- `teacher.html`：教师端，标准案例、教学知识表、本机演示记录与 JSON/CSV 导出。记录不含个人信息，不是研究数据。
- `index.html?demo=1&case=kidneyYang`：答辩模式自动选择标准案例；另支持 `liverStag`、`yinDef`、`spleenDef`。普通模式忽略 `case`；未知值保留答辩首页并提示。

## 运行

```bash
cd web
python -m http.server 8000
# 主演示：http://127.0.0.1:8000
# 阳气：http://127.0.0.1:8000/yangqi.html
# 数据：http://127.0.0.1:8000/dataset.html
# 研究：http://127.0.0.1:8000/research.html
# 评委：http://127.0.0.1:8000/judge.html
```

需要通过本地 HTTP 服务打开；直接双击 HTML 会被模块/GLB 跨域策略拦截。

## 模型接入

把 GitHub 模型仓库的 4 个文件放入 `web/assets/`：

- `anatomy_male.glb`
- `anatomy_female.glb`
- `meridians.json`
- `meridians_female.json`

未放模型时，3D 页面会显示加载失败提示，这是预期行为。模型目录中的文件被 `.gitignore` 忽略，**不会提交到平台仓库**。

## 代码结构

- `src/scene3d.js`：Three.js 场景、GLB 加载、皮肤/器官/经络图层。
- `src/meridians.js`：经络/血脉管状网格与流光。
- `src/app.js`：主页面交互。
- `src/yangqi.js`：阳气页昼夜/分组/2D 图。
- `src/dataset.js`：数据导入、校验、时间轴、曲线、3D 映射。
- `src/research.js`：研究流程、计分、校验、CSV。
- `vendor/`：Three.js r160.1 本地文件。

## 边界

- 无后端；症状/数据/作答只在本机浏览器处理。
- 不诊断、不处方、不预测疗效；教学参数不是生理测量。
- 真实数据只放 `../challenge_cup/data/real/`（gitignore），不进平台仓库。
- 解剖资产 CC BY-SA 2.1 Japan；代码 MIT；保留署名。
