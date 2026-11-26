# Vue 工作台验收 · 2026-11-26

工单 `WO-PF-20261126-006`。Vue 3.5.46 正式生产运行库本地加载，6 个实际 Vue 挂载接管侧栏、步骤、标题、标签、时间轴与反馈。Three.js 画布不归 Vue 重渲染。保持上一轮明亮图谱配色。

| 范围 | 结果 | 记录 |
|---|---|---|
| Vue 专项（当前 8020） | 37 项通过，0 console/page error、外部/写请求 | `local/verification.json` |
| Vue 专项（隔离预览包 8021） | 37 项通过；五尺寸 390/768/1280/1440/1920 无横向溢出 | `preview/verification.json` |
| 原主界面路径（隔离预览包） | 46 项通过，5 个器官标注不重叠；正常路径 0 error、外部/写请求 | `legacy-ui-verification.json` |
| 原教师端流程 | 39 项通过，无 console/page/HTTP error | `teacher-verification.json` |
| 平台已提交旧基线（没有新的状态 API） | 10 项通过，原生 DOM 桥接的案例/双向时间轴/重置可用，0 error | `legacy-baseline-verification.json` |

新专项验证实际 Vue 挂载及版本、模式双向切换、面板动画、四案例状态、播放/暂停、双时间轴、唯一控件 ID、canvas/scene 实例不重建、移动菜单 inert/焦点/跨断点复位、自由教学标准文本、无存储/上传、减少动效仍保留标签选中位置。

独立只读审查发现并修复模式链接回归与减少动效高亮；快速切换案例的提示使用稳定 key，始终只保留当前一条。复核无 Critical/Important。兼容旧基线时，无对比 HUD 的页面保留原生对比动作；该保护由旧基线 10 项专测覆盖。

当前平台工作树包含其他会话修改，这些源码原样保留，不整体复制到预览包。GitHub 在既有已发布基线上只接入本轮 Vue 资产与入口；app/scene/knowledge/research 模块保持其预览基线。以上是工程验收，医学审阅和真实学习效果仍待团队补充。

临时 8021 已关闭，长期 8020 保留。模型仅映射已存在的本地目录，没有复制、下载或提交。截图为实际运行界面；BodyParts3D 部分归 The Database Center for Life Science，CC BY-SA 2.1 Japan；Vue/Three.js 与平台代码按相应 MIT 许可保留署名。

复现见 `docs/VUE_STUDIO.md`。测试依赖已固定于 package-lock，浏览器使用本机 Chrome。缺模型时按 INTEGRATION.md 手动准备，不从页面自动拉取。
