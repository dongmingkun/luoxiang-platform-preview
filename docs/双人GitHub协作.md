# 双人 GitHub 并行开发指南

目标：两个人（Blender/数据 与 Unity/交互）在同一个仓库里持续集成，尽量不冲突、每次合并都能运行。

---

## 1. 角色与文件所有权

| 区域 | 负责人 | 可修改路径 |
|---|---|---|
| 3D 资产 / 中医数据 / 解剖资产 | 队友 A | `blender/`、`shared/tcm_data/`、`Assets/Resources/Models/`、`docs/中医阴阳可视化设计.md`、`docs/ASSET_LICENSES.md` |
| Unity 运行时 / UI / 器官动画 | 队友 B | `Assets/Scripts/`、`Assets/Shaders/`、`Assets/Scenes/`、`docs/Blender到Unity资产管线.md` |
| 契约 | 双方共同 | `meridians.json` 字段、`TcmState` 字段、`ORGAN_*` 命名、Shader 属性名 |

**原则**：不要顺手格式化/重排对方目录；不要提交 `Library/`、`Temp/`、`Logs/`、`*.csproj`。

---

## 2. 分支模型

```
main                受保护，始终可运行
├─ feat/blender-xxx  A：人体/经络/材质/预览
├─ feat/unity-xxx    B：Shader/UI/动效/交互
├─ data/xxx          任一方：JSON 契约变更（需双方 review）
└─ fix/xxx           任一方：缺陷修复
```

- 每个 PR 只做一件事；标题用中文/英文均可，正文写清「改了什么 / 怎么验证 / 影响谁」。
- 合并前先 `git pull --rebase origin main`，再跑一次本地验证。
- 至少 1 人 review；涉及 JSON 契约或 Shader 属性名的 PR 必须双方确认。

### 提交信息

```
feat(blender): 增加心包经与三焦经预览
feat(unity): 子午流注环支持手动拖动
fix(unity): 修复 Slider 在 4K 下的点击偏移
data: 调整肝经 0.46 处阻滞点
docs: 补充阳虚参数说明
```

---

## 3. 首次把仓库推到 GitHub

在项目根目录执行：

```bash
git init
git lfs install --local
git add .
git commit -m "chore: 初始化阴阳二气人体经络可视化工程"

# 在 GitHub 新建空仓库（不要勾选 README / .gitignore）
git remote add origin https://github.com/<账号>/<仓库名>.git
git branch -M main
git push -u origin main
```

队友：

```bash
git clone https://github.com/<账号>/<仓库名>.git
cd <仓库名>
git lfs install
git lfs pull
```

然后：

1. 用 Unity Hub 打开 `unity/TCMYinYang`；
2. 首次自动生成场景与运行时材质；
3. 提交 Unity 自动生成的 `.meta`、`ProjectSettings/*.asset` 和 `Assets/Resources/Materials/*.mat`（这些是可复现的工程文件；`.flag` 已忽略）。

建议在 GitHub 仓库设置中保护 `main`：
- Require a pull request before merging；
- Require 1 approval；
- Require status checks（如果以后加 CI）；
- 禁止 force push。

---

## 4. 二进制资产与 Git LFS

`.gitattributes` 已配置：

```
*.blend  *.fbx  *.glb  *.png  *.mp4  → Git LFS
```

注意：
- 首次克隆**必须** `git lfs install && git lfs pull`，否则 FBX/预览图只是指针文件。
- 写实解剖版新增 `TCM_Anatomy.fbx`（约 17MB）；它和 `TCM_Body.fbx` 都通过 LFS 提交。
- **不要提交** `D:/TCM_Anatomy` 原始 BodyParts3D 数据集（体积大，且需单独遵守许可）；只提交处理后的 FBX/Blend。
- 解剖资产为 **CC BY-SA 2.1 Japan**，提交/发布时保留 `docs/ASSET_LICENSES.md` 的署名与 ShareAlike 说明。代码仍为 MIT。
- 不要反复提交整包 Blender 大文件；尽量只提交最终 `.blend` + 必要的 FBX/PNG。
- 预览图更新后请同步 README 引用的截图，避免答辩时展示旧图。

---

## 5. 每日并行工作流

### 队友 A（Blender/数据）

```bash
git pull --rebase
# 写实解剖版（当前）：先确认 BodyParts3D 数据在 TCM_ANATOMY_ROOT
blender -b --factory-startup -P blender/scripts/anatomy_build.py
blender -b --factory-startup -P blender/scripts/project_meridians.py
# 检查 blender/output/preview/anatomy_test.png
git add blender shared unity/TCMYinYang/Assets/Resources/Models unity/TCMYinYang/Assets/StreamingAssets
git commit -m "feat(blender): ..."
git push

# 仅早期示意版才使用 build_scene.py（会覆盖当前 JSON/人体资产）
```

### 队友 B（Unity）

```bash
git pull --rebase
# 打开 unity/TCMYinYang，修改 Scripts/Shaders，Play 验证
git add unity/TCMYinYang/Assets/Scripts unity/TCMYinYang/Assets/Shaders
git commit -m "feat(unity): ..."
git push
```

### 合并前本地验证清单

- [ ] Unity Console 0 error（warning 可接受）；
- [ ] Play 后能看到人体、经络、血脉、太极、流注环；
- [ ] 四个证候按钮都能正常切换，滑杆不打架；
- [ ] 子午流注拖动到 03:00 / 11:00 时对应经脉高亮；
- [ ] 相机拖拽、滚轮、快捷键正常；
- [ ] 中文 UI 无方块、无溢出；
- [ ] 如果改了 JSON：Blender 预览与 Unity 运行时一致。

---

## 6. 契约变更流程

JSON / `TcmState` / Shader 属性名是两端耦合点。任何变更：

1. 单独开 `data/xxx` 分支；
2. 同时改：
   - `blender/scripts/tcm_config.py`（导出端）
   - `unity/.../Core/TcmJsonModels.cs`（读取端）
   - 使用该字段的 View/Shader
   - 本文档或管线文档
3. PR 标题标注 `[contract]`，双方 review；
4. 合并后双方各自 `pull --rebase` 并重跑一次完整流程。

---

## 7. 建议的两周节奏

| 天数 | 队友 A | 队友 B |
|---|---|---|
| D1–2 | 人体比例、经络走向微调、预览图 | 工程打开、场景/材质初始化、Shader 基础 |
| D3–4 | 血管与丹田位置、Blender 材质 | 经络管生成、流光 Shader、相机 |
| D5–6 | 子午流注环与舞台细节 | 太极 / 丹田 / 流注动效、Bloom |
| D7 | 第一版资产冻结，发 PR | 四证候参数联调，发 PR |
| D8–9 | 异常态瘀点/配色、预览视频 | UI 美化、快捷键、性能 |
| D10 | 共同验收：正常/阳虚/阴虚/气滞血瘀 | 共同验收：构建 Windows 包 |
| D11–12 | 答辩截图、海报 | 录屏、讲解脚本 |
| D13–14 | 缓冲、修复、最终 tag `v1.0-demo` | 缓冲、修复、最终 tag |

---

## 8. Issue / PR 模板

仓库已包含：

- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`

PR 描述中请附：
- 变更截图/GIF（UI 或视觉改动必须有）；
- 复现/验证步骤；
- 是否影响 JSON 契约、Shader 属性名、场景生成流程。

---

## 9. 发布 Demo

```bash
# 建议 tag
git tag -a v1.0-demo -m "阴阳二气可视化课程演示版"
git push origin v1.0-demo
```

Unity 构建设置：
- Platform：Windows x86_64；
- Resolution：1600×900，Windowed，Resizable；
- Quality：关闭阴影（本项目已运行时关闭），保留 HDR；
- 构建前执行一次 **TCM → 应用推荐工程设置**，确保 Shader 未被剥离；
- 打包后确认 `TCMYinYang_Data/StreamingAssets/tcm/meridians.json` 存在。

祝演示顺利。
