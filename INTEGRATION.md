# 平台 × 模型分离与本地整合

## 0. 结论

- **Gitea（本仓库）**：平台代码与材料，**不含人体模型**。
- **GitHub `tcm-human-model`**：人体模型/经络/Blender/Rhino 模块，**不含平台页面**。
- 两个仓库不自动关联；队长从 GitHub 取模型，放入平台目录，自行整合。
- 不要把模型文件、模型压缩包或 LFS 指针提交到本仓库。

## 1. 从 GitHub 取模型

需要团队给队长开放 `dongmingkun/tcm-human-model` 的只读权限；或由团队导出 人体建模交付_v1.2.zip 发给队长。

模型仓库中的 Web 文件：

| GitHub 文件 | 平台目标路径 |
|---|---|
| `web/assets/anatomy_male.glb` | `web/assets/anatomy_male.glb` |
| `web/assets/anatomy_female.glb` | `web/assets/anatomy_female.glb` |
| `web/assets/meridians.json` | `web/assets/meridians.json` |
| `web/assets/meridians_female.json` | `web/assets/meridians_female.json` |

校验大小与 SHA-256：见本仓库根目录 `model_manifest.json`。

## 2. Web 本地整合

本机唯一预览地址为 <http://127.0.0.1:8020/>。标准做法是让平台同级目录存放模型仓，由预览服务按文件名映射，**不把 4 个文件复制进平台 Git**：

```
workspace/
├─ tcm-platform-gitea/web/          平台代码
└─ tcm-human-model/web/assets/      4 个模型文件
```

```powershell
powershell -ExecutionPolicy Bypass -File deploy/start_preview.ps1
# http://127.0.0.1:8020/
```

如果队长要在纯静态托管/旧 8000 方式中整合，仍可手动把 4 个文件放入 `web/assets/`（gitignore），再用静态服务器打开；但 8020 是团队验收基准，后续修改以它为准。没有模型时，3D 页面会显示“解剖模型加载失败”或“本地未放置该模型”；这是预期行为，不白屏、不伪造模型。

## 3. Unity 本地整合

模型仓库中的 FBX：

- `TCM_Anatomy.fbx`、`TCM_Anatomy_Female.fbx`
- `TCM_Body.fbx`、`TCM_Body_Female.fbx`
- `TCM_BodyWire.fbx`、`TCM_BodyWire_Female.fbx`

放到：

```
unity/TCMYinYang/Assets/Resources/Models/
```

该目录在 `.gitignore` 中，**不会进入平台仓库**。导入 Unity 后重新绑定材质/场景引用；当前 Unity 场景仍以男性基线为主，女性切换需按模型仓库 `INTEGRATION.md` 接。

## 4. 禁止事项

- 不要 `git submodule add` 模型仓库。
- 不要在 CI/页面里自动从 GitHub 拉模型（两仓不关联）。
- 不要把模型、Blender/Rhino 源文件、模型压缩包提交到平台仓库。
- 不要把真实病例/研究原始数据提交到任何仓库。

## 5. 验收

- [ ] 平台仓库 `git ls-files` 中没有 `.glb`、`.fbx`、`.blend`、`.3dm`、`rhino/`、`blender/`、`unity/**/Models/`。
- [ ] `model_manifest.json` 的 SHA 与 GitHub 模型一致。
- [ ] 放入 4 个 Web 模型文件后，5 个页面均 200，3D 加载成功。
- [ ] 未放模型时，页面有清晰失败提示，不白屏、不伪造模型。
- [ ] 研究模式仍为本地匿名 CSV；数据推演仍显示来源/许可/非临床。
