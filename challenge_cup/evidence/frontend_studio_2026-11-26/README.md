# 三维教学工作台前端验收 · 2026-11-26

工单：`WO-PF-20261126-001`；平台任务分支：`codex/frontend-studio`。目标：GitHub 私有预览仓 `dongmingkun/luoxiang-platform-preview` 的独立前端分支，遵循分支评审规则，不自动合并主分支。

## 实际结果

| 检查 | 结果与范围 | 证据 |
|---|---|---|
| 新前端 | 56 项通过，涵盖四案例、图层、男女/真实/全息、正背视角、双时间轴与实际播放/暂停 | `verification.json` |
| 手机/平板/桌面 | 390/768/1280/1440/1920 无横向溢出，三维视口至少 300×320；截图已查看 | `studio-*.png` |
| 导航与键盘 | 窄屏关闭菜单不可聚焦，Escape 关闭；切换桌面退出抽屉与焦点循环；面板支持方向键/Home/End | `verification.json` |
| 摄像机状态 | 复位/男女切换后按钮与环绕实际状态一致；切方剂不改变已选背面视角 | `verification.json` |
| 对比度 | 关键操作和说明按实际背景检测，至少 4.5:1；非诊断/非疗效说明保留 | `verification.json` 的 `contrasts` |
| 其他路径 | 总览使用实际新版截图；九页面 200；正常路径 console/page/HTTP error、外部请求/写请求均为 0 | `verification.json` |
| 降级 | 独立浏览器夹具模拟缺模型、缺女性模型，明确显示失败/保留原模型，不冒充载入成功 | 同上；预期失败不混入正常路径错误计数 |
| 旧教学回归 | 39 项通过；无 console/page/HTTP error；标准案例、教师端记录与导出保留 | `teacher-regression.json` |
| 数据单元 | 原 Python 4 项、Node 4 项通过；未改变药材目录或原始数据 | 原 `tests/` 与本次运行日志 |
| 契约/分仓 | 原主站 44 个控件 ID 保留、当前 69 个 ID 唯一；研究 101 列保留；预览无模型/经络/原始药材/受试者文件 | `static-checks.json` |

浏览器版本见 JSON（本次 Chrome 158.0.8127.88）。本目录只记录工程与视觉检查，不证明教学效果、医学内容准确或资料授权。

## 独立预览包核验与并行改动

工作中其他会话改动了平台的 `web/src/scene3d.js` 与 `web/src/app.js`。这些改动不属于本次前端，保留原状，不纳入本次提交或发布。为避免混合验收，最终截图与 56 项验收在独立工作树运行：以 GitHub `642bb733` 为基线，只覆盖本次白名单前端文件；app/scene/agent/knowledge/research 与 GitHub 基线逐文件核对一致。

该临时包使用 `127.0.0.1:8021` 单独服务，模型仅映射既有本机资产，未复制/下载/提交；验收结束即关闭该临时服务。日常地址仍为 `127.0.0.1:8020`，当前平台的并行场景改动予以保留。`preview-package.json` 记录了该范围；不能把本次结论扩展到并行场景代码。

## 复查命令

```powershell
$env:NODE_PATH = Join-Path (Get-Location) '.git/award-opt-qa/node_modules'
node deploy/verify_frontend_studio.cjs
node --check web/src/studio.js
node --check deploy/verify_frontend_studio.cjs
python -X utf8 -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/herb-catalog.test.mjs
git diff --check
```

隔离包另设 `TCM_TEST_URL=http://127.0.0.1:8021`；验证脚本支持 `TCM_EVIDENCE_DIR`，不覆盖旧证据。完整 3D 验收仍要求队长手动准备合法模型；GitHub 预览仓只有平台代码和界面截图。

## 真实画面与归属

`web/assets/studio-preview.jpg` 从上述实际运行包截图，非生成解剖图。截图的解剖部分保留 BodyParts3D / The Database Center for Life Science / CC BY-SA 2.1 Japan；代码和 Three.js 保留 MIT。未复制往届团队素材，不以其奖项或指标为本项目背书。
