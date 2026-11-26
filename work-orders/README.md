# 平台工单（Gitea）

> 以后平台任务都用工单：一个任务 = 一个编号 + 一个分支 + 一个 Issue/PR + 一份验收记录。模型任务在 GitHub 模型仓单独开工单，不混在一起。

## 1. 编号

- 平台：`WO-PF-YYYYMMDD-NNN`
- 模型：`WO-MD-YYYYMMDD-NNN`
- 例：`WO-PF-20261103-001`

## 2. 状态

`待认领` → `进行中` → `待验收` → `已完成`
异常：`阻塞` / `已取消`

## 3. 必备字段

- 标题、编号、状态、负责人、评审人
- 仓库范围（平台 / 模型；绝不能同时包含两者）
- 分支 + 提交
- 目标与背景
- 改动文件
- 验证证据（页面 200 / 0 error / 截图 / 测试命令）
- 风险与边界（模型不进平台、真实数据不进 Git、不写疗效）
- 下一步
- 关联 Issue/PR/部署 URL

## 4. 流程

1. 从 `TEMPLATE.md` 复制成 `work-orders/WO-PF-YYYYMMDD-NNN.md`。
2. 建分支 `codex/<short-name>`；实现 + 测试。
3. 提交分支到 Gitea；开 Issue（工单）或 PR（代码评审）。
4. 在 Issue 里贴工单正文；状态改为 `待验收`。
5. 评审通过后合并 `main`；工单状态改 `已完成`，保留记录。

## 5. 平台仓硬边界

- 不放人体模型：`.glb/.fbx/.blend/.3dm`、经络 JSON、`rhino/`、`blender/`、Unity Models。
- 模型来自 GitHub `tcm-human-model`，队长手动取用并本地整合；平台不自动拉取。
- 真实病例/问卷/访谈原始数据不进 Git；只放本地 `challenge_cup/data/real/`。
- 不写疗效/诊断承诺；模拟参数不写成实验结论。

## 6. 工单列表

| 编号 | 标题 | 状态 | 分支/提交 | 评审 |
|---|---|---|---|---|
| WO-PF-20261103-001 | 络象经纬结构图谱与本地部署 | 待验收 | `codex/luoxiang-structure` / PR #3 head | 队长/钟 |
| WO-PF-20261108-001 | 教师端 / 教学控制台 | 待验收 | `codex/teacher-console` / 本地提交，Gitea 待网络恢复 | 队长 |
| WO-PF-20261108-002 | 中草药资料接入与只读检索 | 待验收 | `codex/herb-dataset` / `87f5d71` / [PR #4](http://10.8.50.242:3030/cjh/Yang-Energy-Flow-Chart.profile-private/pulls/4) | 队长 |
| WO-PF-20261112-001 | 往届作品参照与答辩任务台 | 待验收 | `codex/award-benchmark` / `7b68c40` / [PR #5](http://10.8.50.242:3030/cjh/Yang-Energy-Flow-Chart.profile-private/pulls/5) | 队长 |
| WO-PF-20261126-001 | 三维工作台前端与总览改版 | 待验收 | `codex/frontend-studio` / `ed9fd01`；预览 `codex/frontend-studio-preview` / `93a33aa` / [PR #1](https://github.com/dongmingkun/luoxiang-platform-preview/pull/1) | 队长 |
| WO-PF-20261126-002 | 深海蓝科技主题 | 待验收 | `codex/night-theme`；预览 `codex/frontend-studio-preview` / [PR #1](https://github.com/dongmingkun/luoxiang-platform-preview/pull/1) | 队长 |
| WO-PF-20261126-003 | 曜石黑与琥珀金配色 | 待验收 | `codex/night-theme`；预览 `codex/frontend-studio-preview` / [PR #1](https://github.com/dongmingkun/luoxiang-platform-preview/pull/1) | 队长 |
| WO-PF-20261126-004 | 石墨灰与信号橙 | 待验收 | `codex/night-theme`；预览 `codex/frontend-studio-preview` / [PR #1](https://github.com/dongmingkun/luoxiang-platform-preview/pull/1) | 队长 |
| WO-PF-20261126-005 | 明亮图谱配色 | 待验收 | `codex/night-theme`；预览 `codex/frontend-studio-preview` / [PR #1](https://github.com/dongmingkun/luoxiang-platform-preview/pull/1) | 队长 |
| WO-PF-20261126-006 | Vue 工作台与动态反馈 | 待验收 | `codex/vue-studio`；预览 `codex/frontend-studio-preview` / [PR #1](https://github.com/dongmingkun/luoxiang-platform-preview/pull/1) | 队长 |

当前唯一预览：<http://127.0.0.1:8020/>（平台仓实时服务；说明见 `deploy/README.md`）。
