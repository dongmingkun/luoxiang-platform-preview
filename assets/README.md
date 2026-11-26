# 人体模型（外部）

平台仓库**不包含**人体模型。请由队长从 GitHub `dongmingkun/tcm-human-model` 取用后，把以下文件放到本目录：

- `anatomy_male.glb`
- `anatomy_female.glb`
- `meridians.json`
- `meridians_female.json`

大小与 SHA-256 见仓库根目录 `model_manifest.json`。这些文件被 `.gitignore` 忽略，不会提交到 Gitea。

未放模型时，3D 页面会显示“解剖模型加载失败”，这是预期行为；数据推演/研究模式的表格与 CSV 仍可使用。
