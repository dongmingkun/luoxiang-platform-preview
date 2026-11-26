# 队长要求（长期有效）

> 2026-11-02 记录。以后所有 Agent/协作者按此执行；变更前先判断“模型还是平台”。

## 1. 两仓分离

| 仓库 | 放什么 | 不放什么 |
|---|---|---|
| **GitHub `dongmingkun/tcm-human-model`** | 你和钟完成的**人体建模模块**：男女 GLB/FBX、Blender/Rhino 源与脚本、经络数据、建模说明 | 平台页面、数据推演、研究模式、评委页、部署脚本 |
| **Gitea `cjh/Yang-Energy-Flow-Chart.profile-private`** | **平台**：Web/Unity 平台、数据推演、研究模式、部署、答辩/评委材料 | 任何人体模型：`.glb`、`.fbx`、`.blend`、`.3dm`、经络 JSON、`rhino/`、`blender/`、`unity/**/Models/` |

## 2. 不关联

- 不加 git submodule。
- 不在页面/CI 里自动从 GitHub 拉模型。
- 不把平台代码复制进模型仓库，也不把模型复制进平台仓库。
- 队长从 GitHub 取模型，手动放入平台目录，**由队长自己整合**。
- 队长的整合过程不上传；不要求队长 push。

## 3. 每次改动检查

1. 这是模型改动还是平台改动？
2. 模型改动 → 只提交到 `tcm-human-model`。
3. 平台改动 → 只提交到本 Gitea 平台仓库，且确认没有新增模型文件。
4. 真实病例/问卷/访谈原始数据 → 只放 `challenge_cup/data/real/`（gitignore），任何仓库都不提交。
5. 不写疗效/诊断承诺；教学参数不是生理测量；不伪造实验数据。

## 4. 已落实的产品要求

- 男女双模型、性别隐私处理、肺比例修正。
- Rhino + GPT 参数化 blockout（模型仓库）。
- 阳气运行页、数据推演、研究模式、大挑评委速览（平台仓库）。
- 平台无后端；数据/作答只在本机浏览器处理。

## 5. 当前状态

- 记录时 Gitea 平台 `main`：平台-only，当前树无模型。
- 记录时 GitHub 模型 `master`：模型-only，含两仓分离说明。
- 之后以各仓 `git log` 为准；不要根据本文件判断最新提交。
- 平台 `web/assets/` 只有 README；模型从 GitHub 取。
