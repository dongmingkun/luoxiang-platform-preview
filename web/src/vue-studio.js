import { createApp, version } from '../vendor/vue/vue.runtime.esm-browser.prod.js';
import { createStudioController } from './vue/studio-state.js';
import { createComponents } from './vue/studio-components.js';
import { initSceneControls } from './vue/studio-scene.js';

const controller = createStudioController();
const components = createComponents(controller), apps = [];
function mount(selector, component) {
  const host = document.querySelector(selector);
  if (!host) return;
  host.hidden = false;
  const app = createApp(component);
  app.mount(host);
  apps.push(app);
}
mount('#studio-nav', components.Sidebar);
mount('.studio-workflow', components.Workflow);
mount('.inspector-heading', components.Heading);
mount('.inspector-tabs', components.Tabs);
mount('#stage-timeline', components.Timeline);
const feedback = document.createElement('div');
feedback.className = 'vue-feedback-root';
document.getElementById('canvas-wrap').appendChild(feedback);
const app = createApp(components.Feedback);
app.mount(feedback); apps.push(app);
initSceneControls();
controller.resize();
document.body.classList.add('vue-studio-ready');
window.__luoxiangVue = Object.freeze({ version, components: apps.length, snapshot: controller.snapshot });
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  controller.dispose(); apps.forEach(app => app.unmount());
}, { once: true });
