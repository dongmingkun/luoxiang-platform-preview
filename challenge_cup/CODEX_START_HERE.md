# Codex 启动提示

把本仓库在 Codex 中打开（当前 Codex 打开的是 `glaucoma_first`，项目名“计算机挑战”，不是本仓库），然后对 Codex 说：

```text
请先完整读取根目录 AGENTS.md、challenge_cup/README.md、challenge_cup/codex/CURRENT_HANDOFF.md 和 challenge_cup/09_Codex协作任务板.md。
这是一个挑战杯“哲学社会科学类社会调查报告”项目的研究工具包，不是让你代写报告的。
请从任务板中认领 C1（Web 代码审阅，含 web/research.html 研究模式 + web/dataset.html 数据推演）和 C6（合规检查），
在 challenge_cup/codex/ 下输出；不要修改 web/、unity/、blender/、shared/ 的源文件，
不要生成可直接提交的调查报告成稿，不要编造问卷数据或实证结果。
完成后更新 challenge_cup/codex/STATUS.md。
```

如果 Codex 已经能读仓库，也可以只发：

```text
Read AGENTS.md, challenge_cup/codex/CURRENT_HANDOFF.md and challenge_cup/09_Codex协作任务板.md.
Claim C1 and C6. Do not edit source; output to challenge_cup/codex/.
```

## 分工建议

| 角色 | 负责 |
|---|---|
| 你（参赛团队） | 采集真实数据、写最终调查报告、与导师确认赛道/伦理、签字与提交 |
| ZCode（本会话） | 3D/解剖/Web 原型、研究设计、问卷、分析代码、申报/答辩素材、仓库集成 |
| Codex（另一 Agent） | 独立代码审阅、PPT 骨架、数据看板/图表、海报、可用性测试脚本、合规审计 |
| 指导教师 | 选题/量表/专家审阅/推荐意见/伦理与真实性把关 |

## 不要让 Codex 做的事

- 不写 15000 字调查报告全文或大段成稿（负面清单禁止 AI 代写）。
- 不生成/补全问卷数据、访谈记录、用户评价、专家意见。
- 不把 Web 里的 94%/95% 模拟参数写成实验结论。
- 不改 BodyParts3D 授权声明、不删医学免责声明。
- 不改 `shared/tcm_data/meridians.json`、`ORGAN_*` 命名、`TcmState` 契约，除非任务明确。
