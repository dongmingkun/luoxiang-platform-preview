# 深海蓝主题验收 · 2026-11-26

工单：`WO-PF-20261126-002`。本轮仅新增 `web/studio-night.css` 并在主页面引入；无新依赖、网络请求、动画或三维材质改动。

## 发布包

基于既有 GitHub `codex/frontend-studio-preview` / `753ded6`，原业务、三维与研究模块保持不变。新增主题后，原前端验收脚本重新运行 **56 项通过**，五尺寸无横向溢出，关键文字对比度检查通过，正常路径 console/page/HTTP 错误和外部/写请求均为 0，九页面返回 200。详见 `preview-verification.json`、`preview-1440.png`、`preview-390.png`。

复现：使用本地已手动整合的模型，在临时 8021 运行 `deploy/verify_frontend_studio.cjs`，设置 `TCM_TEST_URL` 与独立 `TCM_EVIDENCE_DIR`。临时服务已关闭；长期 8020 保留。未复制或下载模型。

## 当前本地工作台

8020 工作树包含另一个会话尚未提交的界面/场景改动，本轮均保留，未纳入发布。对该工作树仅检查主题、真实三维/标准案例、面板切换、移动菜单与 390/1280/1920 横向宽度，**10 项通过，0 console/page error**。详见 `local-checks.json`、`live-*.png`；这些截图不代表 PR 已包含并行功能。

此处只验证配色和工程可用性，不证明医学正确性或学习效果。截图中的 BodyParts3D 解剖部分署名 The Database Center for Life Science，按 CC BY-SA 2.1 Japan 保留；平台和 Three.js 代码 MIT。未引入模型资产或真实受试者数据。
