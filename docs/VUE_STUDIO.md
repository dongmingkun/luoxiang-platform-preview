# Vue 工作台展示层

`http://127.0.0.1:8020/index.html` 继续由现有静态服务提供，支持答辩参数。无需额外 Vite/Node 服务；Vue 生产 runtime 已随平台文件提供，不访问 CDN。

## 所有权

- `web/src/vue-studio.js`：挂载 6 个 Vue 组件与生命周期。
- `web/src/vue/studio-components.js`：声明式导航、步骤/标签、标题、时间轴、Transition 反馈。
- `web/src/vue/studio-state.js`：响应状态、原生控件/现有事件桥接、键盘/手机焦点、减少动效。
- `web/src/vue/studio-scene.js`：从既有展示适配器抽出的相机/器官/对比/图层预设操作，不重建 Three.js。
- `web/vue-studio.css`：短时位移、淡入与时间轴样式；尊重 prefers-reduced-motion。
- `app.js` 继续拥有案例、原时间轴、规则与模拟；原研究/模型模块不迁入 Vue。不将 canvas 或 app 生成的案例/分析 DOM 放进 Vue render。

## 依赖与验收

```powershell
npm ci --ignore-scripts
npm run vendor:vue
npm run test:vue
```

Vue 3.5.46、Playwright 1.64.1 均精确锁定。验收需要本机 Chrome、8020 服务及已手动准备的合法模型。可设置 `TCM_TEST_URL` 与 `TCM_EVIDENCE_DIR` 验证隔离包。本机默认 npm 缓存路径异常时，本轮使用 `.git/npm-vue-cache` 绕过，未修改全局配置。

许可和 runtime SHA-256 见 `web/vendor/vue/README.md`。`node_modules` 不提交。页面无编译器/eval，不需后端；不新增存储、上传或真实数据。

## 动效与降级

面板切换保留原控件节点，动画只作用于显示层。减少动效时去除过渡，保留指示条代表选中态的位置。状态桥也读取原生控件，兼容没有新状态事件的旧平台基线。页面缺少增强对比 HUD 时保留原对比行为。模型文件缺失仍显示原加载失败提示，不把界面可操作当成模型已载入。
