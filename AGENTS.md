# 平台仓库说明（Gitea）

> **最高优先级：队长两仓分离要求，详见 [`LEADER_REQUIREMENTS.md`](LEADER_REQUIREMENTS.md)。** 本仓库只放平台，不放人体模型；模型唯一来源是 GitHub `tcm-human-model`；两仓不关联，队长本地整合。

本仓库只放平台：Web/Unity 平台、研究工具、部署与答辩材料。**不含人体模型。**

- 人体模型唯一来源：GitHub `dongmingkun/tcm-human-model`（private）。
- 两仓不自动关联；不要加 submodule、不要在页面/CI 里自动拉模型。
- 不要把 `.glb`、`.fbx`、`.blend`、`.3dm`、`rhino/`、`blender/`、`unity/**/Models/` 提交到本仓库。
- 模型由队长从 GitHub 取用后，手动放入 `web/assets/` 或 Unity Models 目录；这些路径已 gitignore。
- 真实病例/研究原始数据只放 `challenge_cup/data/real/`（gitignore），不上传。
- 不写成“疗效/诊断”；教学参数不是生理测量。
- 页面/研究/评委证据的改动需保持 0 console error，并更新 `challenge_cup/evidence/`。

模型接入与验收：`INTEGRATION.md`、`model_manifest.json`。

## 本机预览（长期）

- 唯一预览地址：`http://127.0.0.1:8020/`；根目录是本仓库当前分支的 `web/`，改完刷新即生效。
- 启动/停止：`deploy/start_preview.ps1` / `deploy/stop_preview.ps1`；登录自动启动。
- 模型从同级 `tcm-human-model/web/assets/` 按文件名映射，平台 Git 仍不含模型；不再更新 `tcm-luoxiang-deploy/` 静态副本。
- 详细说明：`deploy/README.md`。

## 工单流程（长期）

- 每个平台任务先建 `work-orders/WO-PF-YYYYMMDD-NNN.md`，再建分支 `codex/<short-name>`。
- 提交分支到 Gitea，开 Issue/PR；工单正文贴到 PR/Issue，状态写“待验收”。
- 不直接改 `main`；评审通过后再合并。完成后更新 `work-orders/README.md` 状态表。
- 平台工单不得包含模型；模型任务去 GitHub `tcm-human-model` 开 `WO-MD-*`。
- 当前工单：`WO-PF-20261103-001` → Gitea PR #3。
