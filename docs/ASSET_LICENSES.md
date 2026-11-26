# 第三方资产与许可

本项目代码使用 **MIT License**。写实人体/骨骼/器官资产基于 **BodyParts3D 4.0**，使用 **CC BY-SA 2.1 Japan**，不是 CC0，也不属于 MIT。再分发或发布衍生作品时必须保留署名并遵守 ShareAlike。

---

## 1. BodyParts3D

- **数据库**：BodyParts3D 4.0（人体解剖三维结构数据库）
- **提供方**：The Database Center for Life Science (DBCLS), Japan
- **项目主页**：<https://dbarchive.biosciencedbc.jp/en/bodyparts3d/>
- **许可说明**：<https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>
- **数据集下载**：
  - <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip>
  - <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip>
- **许可**：Creative Commons Attribution-ShareAlike 2.1 Japan
  - <https://creativecommons.org/licenses/by-sa/2.1/jp/>

### 必须保留的署名

> BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.

本项目在以下生成资产中使用了 BodyParts3D 数据：

- `unity/TCMYinYang/Assets/Resources/Models/TCM_Body.fbx`
- `unity/TCMYinYang/Assets/Resources/Models/TCM_BodyWire.fbx`
- `unity/TCMYinYang/Assets/Resources/Models/TCM_Anatomy.fbx`
- `unity/TCMYinYang/Assets/Resources/Models/TCM_Body_Female.fbx`（女性比例衍生）
- `unity/TCMYinYang/Assets/Resources/Models/TCM_BodyWire_Female.fbx`
- `unity/TCMYinYang/Assets/Resources/Models/TCM_Anatomy_Female.fbx`
- `web/assets/anatomy_male.glb`
- `web/assets/anatomy_female.glb`
- `blender/output/TCM_Anatomy.blend`、`TCM_Anatomy_Female.blend`（如仓库包含）
- 上述文件在 Unity/Blender/Web 中的材质、截图和三维衍生展示

女性模型是对同一 BodyParts3D 男性拓扑的比例变形（ANSUR II 2012 男女均值），不是新增的女性扫描数据；它仍受 BodyParts3D 的 CC BY-SA 2.1 Japan 约束。骨盆外表面做了去性化顶点收拢，默认 Web 资产不导出生殖系统网格。

这些解剖资产（包括经过缩放、平移、减面、合并、着色、切分和重新命名的版本）按 **CC BY-SA 2.1 Japan** 提供。代码本身仍为 MIT；如果你把解剖资产与代码一起再分发，请分别保留两种许可，并满足 CC BY-SA 的署名与相同方式共享要求。

### 使用与修改说明

本项目的 `blender/scripts/anatomy_manifest.py` 选择并解析了以下 BodyParts3D 结构：

- 全身皮肤（FJ2810）
- 颅骨、脊柱、肋骨、胸骨、骨盆、肩胛骨、锁骨、肱骨、桡骨、尺骨、股骨、髌骨、胫骨、腓骨等 87 块骨骼
- 心、肝、脾、肺（肺实质为程序化补建）、肾、胃、小肠、大肠、胆囊、膀胱、胰、脑、气管、支气管树

处理方式：

1. OBJ 原始坐标为毫米；统一缩放到 1.72 m 人体高度并平移对齐。
2. 按器官/骨骼分组 Join；骨骼与器官按需减面；设置每个器官的对象原点，便于在 Unity 中心脏搏动/肺呼吸缩放。
3. 为器官重新赋予项目自定义材质（五行色编码），不保留原始 BodyParts3D 材质。
4. 肺实质在 BodyParts3D 中缺失，使用程序化双肺补建；气管/支气管使用 BodyParts3D 原始解剖结构。
5. 经络、太极、丹田、流注环、舞台、UI 与代码均为本项目原创，未从 BodyParts3D 复制。

原始 BodyParts3D 数据集不提交到本仓库；只有处理后的派生 FBX/Blend 进入仓库（Git LFS）。克隆仓库的人无需下载原始数据集即可运行演示；如果要重新生成解剖资产，请按 Dataset 链接下载并遵守上述许可。

---

## 2. 程序化资产

以下资产由本项目脚本生成，不包含第三方版权素材：

- 经络/血脉管状网格、经脉控制点与投影路径
- 太极盘与双环、三丹田、心脏光球、子午流注环、舞台与光环
- 肺实质（程序化双肺）
- UI 图标/文字布局、着色器、Unity 场景与运行时逻辑

这些原创部分可按项目的 MIT License 使用（解剖资产的 ShareAlike 义务不因与 MIT 代码并存而消失）。

---

## 3. 工具

- **Blender** 4.5 LTS：GPL，用于离线生成资产；本项目不重新分发 Blender 本体。
- **Unity** 6000.0 LTS：Unity 许可；本项目不重新分发 Unity 编辑器。
- **BodyParts3D**：CC BY-SA 2.1 Japan，详见上文。

### ANSUR II 2012

女性比例变形使用 **ANSUR II（2012）** 公开汇总统计量（身高、肩宽、胸宽、腰宽、髋宽、胸厚、臀厚），仅使用均值/比例，不复制原始受试者记录或图像。

- 项目主页：<https://www.openlab.psu.edu/ansur2/>
- 公开 CSV：<https://tools.openlab.psu.edu/publicData/ANSUR_II_MALE_Public.csv>、<https://tools.openlab.psu.edu/publicData/ANSUR_II_FEMALE_Public.csv>
- 使用日期：2026-11-02。

---

## 4. 免责声明

### 新版界面截图（2026-11-26）

`web/assets/studio-preview.jpg` 是从本机真实运行的标准案例工作台截取的界面画面，不是生成的解剖图，也不代替三维模型。画面中 BodyParts3D 解剖部分的署名为 The Database Center for Life Science，按 CC BY-SA 2.1 Japan 保留相关署名与许可；页面代码仍按 MIT。测试截图同样保留该归属。未复制其他获奖团队的作品图片或界面素材。

解剖模型用于教学、科普与可视化演示。器官位置/形态来自公开解剖数据，但经过减面、着色和艺术化处理；不应用于临床诊断、手术规划或医疗器械。中医证候参数是艺术化表达，不构成医疗建议。
