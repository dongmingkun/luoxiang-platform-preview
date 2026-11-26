// Presentation/controller adapter only. Teaching rules and state remain in app.js.
const $ = id => document.getElementById(id);
const tabs = [...document.querySelectorAll('[data-studio-tab]')];
const panels = [...document.querySelectorAll('[data-studio-panel]')];
function selectPanel(id, focus = false) {
  const selected = tabs.find(tab => tab.dataset.studioTab === id);
  if (!selected) return;
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const panel of panels) panel.hidden = panel.dataset.studioPanel !== id;
  $('inspector-step').textContent = `${String(tabs.indexOf(selected) + 1).padStart(2,'0')} / 03`;
  if (focus) selected.focus();
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectPanel(tab.dataset.studioTab));
  tab.addEventListener('keydown', event => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + offset + tabs.length) % tabs.length;
    if (offset || ['Home','End'].includes(event.key)) { event.preventDefault(); selectPanel(tabs[index].dataset.studioTab, true); }
  });
}
for (const button of document.querySelectorAll('[data-open-panel]')) button.addEventListener('click', () => selectPanel(button.dataset.openPanel, true));
selectPanel('case');
document.querySelector('.inspector-tabs').hidden = false;
$('btn-reset').addEventListener('click', () => selectPanel('case'));

const compactNav = matchMedia('(max-width: 960px)');
function setNav(open) {
  open = Boolean(open && compactNav.matches);
  document.body.classList.toggle('nav-open', open);
  $('studio-menu').setAttribute('aria-expanded', String(open));
  $('studio-menu').setAttribute('aria-label', open ? '关闭平台导航' : '打开平台导航');
  $('studio-scrim').hidden = !open;
  $('studio-nav').inert = compactNav.matches && !open;
  $('studio-nav').setAttribute('aria-hidden', String(compactNav.matches && !open));
  if (open) document.querySelector('.studio-nav-links a[aria-current]').focus();
}
setNav(false);
compactNav.addEventListener('change', () => {
  const focusedInNav = $('studio-nav').contains(document.activeElement);
  setNav(false);
  if (compactNav.matches && focusedInNav) $('studio-menu').focus();
});
$('studio-menu').addEventListener('click', () => setNav($('studio-menu').getAttribute('aria-expanded') !== 'true'));
$('studio-scrim').addEventListener('click', () => { setNav(false); $('studio-menu').focus(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) { setNav(false); $('studio-menu').focus(); }
});
// Keep the drawer keyboard-contained while open without changing desktop navigation.
$('studio-nav').addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !compactNav.matches || !document.body.classList.contains('nav-open')) return;
  const links = [...$('studio-nav').querySelectorAll('a')], first = links[0], last = links.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

const slider = $('day-slider'), play = $('btn-play');
function syncTimeline() {
  $('stage-day-slider').value = slider.value;
  $('stage-day-slider').disabled = slider.disabled;
  $('stage-day-label').textContent = $('day-label').textContent;
  $('stage-play').disabled = play.disabled;
  const paused = !play.textContent.includes('模拟中');
  $('stage-play').textContent = paused ? '▶ 播放' : 'Ⅱ 暂停';
  $('stage-play').setAttribute('aria-label', paused ? '播放教学变化' : '暂停教学变化');
}
$('stage-day-slider').addEventListener('input', event => {
  slider.value = event.currentTarget.value;
  slider.dispatchEvent(new Event('input', { bubbles: true }));
});
$('stage-play').addEventListener('click', () => play.click());
slider.addEventListener('input', syncTimeline);
const timelineObserver = new MutationObserver(syncTimeline);
for (const target of [slider, play, $('day-label')]) timelineObserver.observe(target, { attributes: true, attributeFilter: ['disabled'], childList: true, subtree: true });
syncTimeline();
$('stage-timeline').hidden = false;
$('chat-form').addEventListener('submit', () => { document.querySelector('.studio-dialogue').open = true; });

let selectedCase = new URLSearchParams(location.search).get('demo') === '1' ? new URLSearchParams(location.search).get('case') : null;
function markCase() {
  const hasPattern = Boolean($('analysis-body').querySelector('.pattern-name'));
  for (const button of $('sample-cases').querySelectorAll('button')) {
    const active = button.dataset.case === selectedCase && hasPattern;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  if (!hasPattern) cameraView('front');
}
$('sample-cases').addEventListener('click', event => {
  const button = event.target.closest('[data-case]');
  if (button) { selectedCase = button.dataset.case; markCase(); }
});
new MutationObserver(markCase).observe($('analysis-body'), { childList: true, subtree: true });
new MutationObserver(markCase).observe($('sample-cases'), { childList: true });
markCase();
for (const id of ['chat-form', 'symptom-chips', 'btn-reset']) {
  $(id).addEventListener(id === 'chat-form' ? 'submit' : 'click', () => { selectedCase = null; markCase(); });
}

function cameraView(which) {
  const scene = window.__tcmScene;
  if (!scene) return;
  scene.controls.autoRotate = false;
  $('btn-rotate').classList.remove('is-on');
  scene.controls.target.set(0, .98, 0);
  scene.camera.position.set(0, 1.01, which === 'back' ? -3.5 : 3.5);
  scene.controls.update();
}
for (const button of document.querySelectorAll('[data-camera-view]')) button.addEventListener('click', () => cameraView(button.dataset.cameraView));
// Bubbling runs after the legacy button handlers, without a timer or frame race.
document.querySelector('.studio-shell').addEventListener('click', event => {
  if (event.target.closest('#btn-reset, #btn-view-reset, #btn-clear-symptoms')) cameraView('front');
});
let sceneBound = false;
function sceneReady() {
  if (sceneBound || !window.__tcmScene) return;
  sceneBound = true;
  cameraView('front');
  $('stage-ready').classList.add('is-ready');
  $('stage-ready').replaceChildren(document.createElement('i'), document.createTextNode('本机模型已就绪'));
  for (const button of document.querySelectorAll('[data-camera-view]')) button.disabled = false;
  sceneObserver.disconnect();
  loadingObserver?.disconnect();
}
const sceneObserver = new MutationObserver(sceneReady);
sceneObserver.observe($('canvas-wrap'), { childList: true });
let loadingObserver;
if ($('loading')) {
  loadingObserver = new MutationObserver(() => {
    sceneReady();
    if (!sceneBound && $('loading-text')?.textContent.includes('失败')) $('stage-ready').textContent = '需载入本机模型';
  });
  loadingObserver.observe($('loading'), { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
}
sceneReady();
// Surface model-switch failures even when the long dialogue is collapsed.
new MutationObserver(() => {
  const message = $('chat').lastElementChild;
  if (!message?.classList.contains('agent')) return;
  const last = message.textContent || '';
  if (last.includes('性别模型切换失败')) {
    $('stage-ready').textContent = '切换未完成 · 保留原模型';
    $('stage-ready').classList.remove('is-ready');
  } else if ((last.startsWith('已切换为女性教学模型') || last.startsWith('已切换为男性教学模型')) && window.__tcmScene) {
    if (!$('btn-rotate').classList.contains('is-on')) cameraView('front');
    $('stage-ready').textContent = '本机模型已就绪';
    $('stage-ready').classList.add('is-ready');
  }
}).observe($('chat'), { childList: true });
