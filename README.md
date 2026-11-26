# 络象经纬 · 队长预览包

这是给队长临时查看的**平台预览包**，不是正式 Gitea 平台仓，也不替代模型仓。正式平台源码仍在 Gitea；本包只解决“队长暂时连不上校园网/Gitea”的查看问题。

## 当前包含

- `web/showcase.html`：新的演示总览/大屏入口，汇总 3D 教学、结构图谱、药材资料、教师端、研究模式；
- `web/index.html`：3D 教学主站，支持 `?demo=1` 答辩模式与 `?demo=1&case=kidneyYang` 指定标准案例；
- `web/teacher.html`：教师端，标准案例、方剂教学表、本机演示记录与 JSON/CSV 导出；
- `web/herbs.html`：中草药资料只读检索（目录约 6.6MB；不含原始 100MB 数据）；
- `web/structure.html`、`yangqi.html`、`dataset.html`、`research.html`、`judge.html`；
- `deploy/`：本机静态预览服务与启动脚本；
- `challenge_cup/award/`、`work-orders/`：答辩与工单材料。

## 不包含

- **不包含人体模型**：`.glb/.fbx/.blend/.3dm` 均未放入；平台仓与模型仓仍分离。
- **不包含中草药原始 50,854 条 JSON/CSV**：只附带页面使用的 `web/data/herbs/catalog.json`，避免把 100MB 原始数据再分发。
- 不包含真实病例、研究原始数据或受试者信息。

## 本地打开

### 只查看药材/教师端/总览

在预览包根目录执行：

```powershell
python deploy/preview_server.py --port 8020 --root web
```

打开：

- 演示总览：<http://127.0.0.1:8020/showcase.html>
- 教师端：<http://127.0.0.1:8020/teacher.html>
- 药材资料：<http://127.0.0.1:8020/herbs.html>
- 评委页：<http://127.0.0.1:8020/judge.html>

### 查看完整 3D

从模型仓取以下四个文件，放到本预览包的 `web/assets/`（该目录在本包里只有 README）：

- `anatomy_male.glb`
- `anatomy_female.glb`
- `meridians.json`
- `meridians_female.json`

模型仓：<https://github.com/dongmingkun/tcm-human-model>（private，需团队授权）

如果模型放在同级目录，也可以：

```powershell
python deploy/preview_server.py --port 8020 --root web `
  --models-dir "..\tcm-human-model\web\assets"
```

然后打开：

- 3D 主站：<http://127.0.0.1:8020/index.html?demo=1>
- 指定阳虚案例：<http://127.0.0.1:8020/index.html?demo=1&case=kidneyYang>

## 边界

- 教学演示，不诊断、不处方、不预测疗效；方名不含剂量。
- 教师端“本机演示记录”只保存在当前浏览器，不是研究数据，也不代表学生人数。
- 药材资料原始来源/许可待核实；页面只展示名称、功效、性、味、归经，不展示用法剂量，不作用药建议。
- 模型、经络和女性比例模型的许可/限制见模型仓与 `docs/ASSET_LICENSES.md`。

## 反馈方式

请直接指出：哪些页面打不开、3D 是否加载、最需要增加的功能、哪些表述不能对外说。正式修改仍回到 Gitea 平台仓；本预览包只用于查看和评审。
