# 石墨灰与信号橙 · 2026-11-26

工单 `WO-PF-20261126-004`。仅改主题颜色与缓存版本：实色石墨灰面板、冷白文字、信号橙操作；去除大面积彩色渐变及装饰光晕。人体/语义色点与业务、研究逻辑不变。

- 预览包浏览器回归 46 项通过，五尺寸无横向溢出，5 个器官标注无重叠，正常路径无 console/page/HTTP error、外部/写请求；见 `preview-verification.json`。
- 本地 8020 检查 1920/1280/390、三个操作面板和抽样对比度（含主按钮）；最低 7.92:1。body 与舞台的 background-image 均为 none，正常控制台/页面无错误；见 `local-checks.json` 与实际截图。
- 临时 8021 已关闭，8020 保留；未复制、下载或提交模型。其他会话的未提交改动保留，仅检验其当前工作树上的配色与基本控件，不代表全面审阅。
- 预览总览的 `showcase-demo.jpg` 更新为当前真实界面截图。截图中 BodyParts3D 部分归 The Database Center for Life Science，CC BY-SA 2.1 Japan；平台与 Three.js 代码 MIT。

工程检查不构成医学或学习效果证据。GitHub 预览分支/PR #1 待团队验收，不合并 main。
