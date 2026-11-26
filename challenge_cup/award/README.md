# B3 获奖准备材料包

更新：2026-11-12。用途是补证、核验与排练；不承诺获奖，不是最终申报书。

## 使用顺序

1. [B3_AWARD_PLAYBOOK.md](B3_AWARD_PLAYBOOK.md)：100 分自查与答辩前 7 天行动。
2. [EVIDENCE_MATRIX.csv](EVIDENCE_MATRIX.csv)：逐项核验台账，按“工程 / 研究 / 应用 / 不可声称”前缀区分。
3. [PPT_OUTLINE.md](PPT_OUTLINE.md)：10 页事实与占位框架。
4. [DEMO_SCRIPT_5MIN.md](DEMO_SCRIPT_5MIN.md)：300 秒点击路径、口播要点和超时切换。
5. [JUDGE_QA.md](JUDGE_QA.md)：评委追问与回答边界。
6. [COMPARISON_FRAMEWORK.md](COMPARISON_FRAMEWORK.md)：类别对比与空白竞品核验表。
7. [TEST_NOTES.md](TEST_NOTES.md)：本次验证结果与未覆盖项。
8. [WINNING_PROJECT_BENCHMARKS.md](WINNING_PROJECT_BENCHMARKS.md)：2023/2025 往届作品官方来源、赛道、有限事实与设计判断。
9. [VALIDATION_PROTOCOL.md](VALIDATION_PROTOCOL.md)：工程、内容、真实学习/应用的分层补证与同任务比较框架（待审定）。

本地入口：[答辩任务台](http://127.0.0.1:8020/judge.html#defense-workbench)。按钮只切换导览，不记录验收、成绩或研究作答；关闭 JS 可阅读全部步骤，A4 打印展开四任务。往届奖项与我们的研究效果是不同证据，不能互相替代。

## 两仓分离与队长手动取模型

| 仓库 | 职责 |
|---|---|
| Gitea `cjh/Yang-Energy-Flow-Chart.profile-private`（本平台仓） | Web/Unity 平台、部署、研究工具、评委材料 |
| [GitHub dongmingkun/tcm-human-model](https://github.com/dongmingkun/tcm-human-model)（私有） | 男女模型、经络、Blender/Rhino 源与脚本、建模文档 |

两仓不关联：无 submodule、无页面/CI 跨仓下载、无自动同步。平台仓不获取、不复制模型；本机 8020 预览只按文件名读取队长已放置在同级模型目录中的文件，不提交到任一仓库。

队长本地操作（由队长执行，整合过程与资产不上传）：

1. 获得模型仓的团队只读权限，在 GitHub 网页手动取交付文件；如使用团队提供的交付包，先确认版本和来源。
2. 本机 8020 预览默认从同级 `tcm-human-model/web/assets/` 读取以下四个文件：`anatomy_male.glb`、`anatomy_female.glb`、`meridians.json`、`meridians_female.json`。若做离线静态托管/拷贝，再手动放到平台 `web/assets/`；源路径同名，见根目录 [INTEGRATION.md](../../INTEGRATION.md)。不要提交这些文件或其压缩包。
3. 用根目录 [model_manifest.json](../../model_manifest.json) 的大小与 SHA-256 核对交付版本。PowerShell 可用 `Get-FileHash -Algorithm SHA256 -LiteralPath <实际模型路径>`，其余文件同样核对；不一致先核实交付版本，不盲目改清单。
4. 在平台仓根目录运行 `powershell -ExecutionPolicy Bypass -File deploy/start_preview.ps1`，打开 <http://127.0.0.1:8020/> 下五个页面；复测男女切换、器官/经络数量、隐私处理、曲线同步和控制台。
5. Unity 如需演示，按 `INTEGRATION.md` 手动放置 6 个 FBX 到被忽略的 `unity/TCMYinYang/Assets/Resources/Models/` 并重新绑定；再将同一交付版本的 `meridians.json` 手动放到 `unity/TCMYinYang/Assets/StreamingAssets/tcm/meridians.json`（亦被忽略）。平台旧版本曾误跟踪该经络 JSON，本次从当前版本移除，不改写历史。未验收前不用作现场备份。
6. 保留模型许可与署名。无需把本地整合结果推回任一仓库，也不要求队长上传整合过程。

平台 Git 中禁止出现 `.glb/.fbx/.blend/.3dm`、经络 JSON、`rhino/`、`blender/`、`unity/**/Models/`，包括 LFS 指针、模型压缩包和伪装扩展名。`model_manifest.json` 只是外部文件清单。

## 状态口径

- `verified` / 已验证：有指向的源码、模板或测试记录；只支持该记录覆盖的工程事实。源码核对不等于完整交互验收；历史整合记录不等于本次无模型环境复测。
- `pending` / 待采集：真实数据待采集，或证据/许可/整合复测待验证。没有结果就保留空缺，不能改成 0 人、0 效果等虚假观测。
- `not_claimable` / 不可声称：现有证据不支持该推论，如把模拟百分比解释为疗效或学习增益。未来取得研究证据也需重写为准确、受限的新主张。

CSV 是证据目录，不是受试者数据。列为 `claim,evidence,file或URL,status,owner,next_action`；路径以平台仓根为基准，负责人为待团队指定的角色，不表示已经完成签字。

## 团队仍须本人完成

真实问卷、对照实验、访谈、专家审阅、授权、试点、成本与竞品核验均须团队真实取得。原始资料只保存在被忽略的 `challenge_cup/data/real/`，不进 Git；对外汇总也需脱敏和团队同意。

本包的 PPT 框架、问答提示、演示脚本、评分映射、比较框架和自动测试记录，均不能直接当作最终申报书、学术论文、社会调查报告、专家意见或学习效果结论。最终学术判断、报告与申报正文由参赛学生本人撰写；推荐意见由推荐者本人出具。不得为展示而补造作答 CSV、访谈引语或意见签名。

模拟参数不是生理测量；不诊断、不处方、不预测疗效。保留 BodyParts3D / CC BY-SA 2.1 Japan、代码 MIT 和 Three.js MIT 说明，见 [08_合规与授权.md](../08_合规与授权.md) 与 [ASSET_LICENSES.md](../../docs/ASSET_LICENSES.md)。
