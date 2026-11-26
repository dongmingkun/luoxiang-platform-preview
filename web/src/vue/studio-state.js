import { reactive, watch, nextTick } from '../../vendor/vue/vue.runtime.esm-browser.prod.js';

export const panels = [
  { id: 'case', label: '案例', step: '选案例', title: '案例辨证与映射' },
  { id: 'simulation', label: '推演', step: '观变化', title: '方药方向与疗程推演' },
  { id: 'layers', label: '图层', step: '析层次', title: '解剖层次与视效控制' },
];

export function createStudioController() {
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = reactive({ panel: 'case', day: 0, playing: false, enabled: false,
    pattern: '', selectedCase: new URLSearchParams(location.search).get('case'),
    navOpen: false, narrow: false, reduced: reduced.matches, message: '' });
  const cleanups = [], animations = new Set();
  let toastTimer, initialized = false;
  const modeLink = $('mode-switch-link');
  if (modeLink) {
    const demo = new URLSearchParams(location.search).get('demo') === '1';
    modeLink.href = demo ? 'index.html' : 'index.html?demo=1';
    modeLink.textContent = demo ? '切至自由教学' : '进入答辩模式';
  }
  const listen = (target, name, fn) => {
    if (!target) return;
    target.addEventListener(name, fn);
    cleanups.push(() => target.removeEventListener(name, fn));
  };
  function animate(element) {
    if (!element || state.reduced || !element.getBoundingClientRect().height) return;
    for (const a of element.getAnimations()) if (a.id === 'vue-studio-feedback') a.cancel();
    const a = element.animate([{ opacity: .55, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
    a.id = 'vue-studio-feedback';
    animations.add(a);
    a.finished.catch(() => {}).finally(() => animations.delete(a));
  }
  function notify(message) {
    clearTimeout(toastTimer);
    state.message = message;
    toastTimer = setTimeout(() => { state.message = ''; }, 2200);
  }
  function sync() {
    const previous = state.pattern;
    const slider = $('day-slider'), play = $('btn-play');
    state.enabled = Boolean(slider && !slider.disabled);
    state.day = Math.max(0, Math.min(28, Number(slider?.value) || 0));
    state.playing = Boolean(play?.textContent.includes('模拟中'));
    state.pattern = $('analysis-body')?.querySelector('.pattern-name')?.textContent.trim() || '';
    if (!state.pattern && previous) state.selectedCase = null;
    for (const button of $('sample-cases')?.querySelectorAll('button') || []) {
      const active = button.dataset.case === state.selectedCase && Boolean(state.pattern);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    if (initialized && state.pattern !== previous) {
      notify(state.pattern ? `正在观察：${state.pattern}` : '已重置教学状态');
      animate($('analysis-card'));
    }
    initialized = true;
  }
  function selectPanel(id, focus = false) {
    if (!panels.some(panel => panel.id === id)) return;
    state.panel = id;
    if (focus) nextTick(() => $(`tab-${id}`)?.focus());
  }
  const stopPanelWatch = watch(() => state.panel, id => {
    for (const element of document.querySelectorAll('[data-studio-panel]')) {
      element.hidden = element.dataset.studioPanel !== id;
    }
    animate($(`panel-${id}`));
  }, { immediate: true, flush: 'sync' });

  function setDay(value) {
    const slider = $('day-slider');
    if (!slider || slider.disabled) return;
    slider.value = String(Math.max(0, Math.min(28, Number(value) || 0)));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    sync();
  }
  function togglePlay() { if (!$('btn-play')?.disabled) $('btn-play').click(); sync(); }
  function applyNav() {
    const nav = $('studio-nav'), menu = $('studio-menu');
    const open = state.narrow && state.navOpen;
    document.body.classList.toggle('nav-open', open);
    menu?.setAttribute('aria-expanded', String(open));
    if ($('studio-scrim')) $('studio-scrim').hidden = !open;
    if (nav) nav.inert = state.narrow && !open;
    if (open) nextTick(() => nav?.querySelector('a[aria-current]')?.focus());
    else if (state.narrow && nav?.contains(document.activeElement)) menu?.focus();
  }
  const stopNavWatch = watch(() => [state.navOpen, state.narrow], applyNav, { flush: 'sync' });
  function resize() {
    // Follow the page's actual responsive breakpoint, including local theme variants.
    state.narrow = Boolean($('studio-menu') && getComputedStyle($('studio-menu')).display !== 'none');
    if (!state.narrow) state.navOpen = false;
    applyNav();
  }
  listen($('studio-menu'), 'click', () => { state.navOpen = !state.navOpen; });
  listen($('studio-scrim'), 'click', () => { state.navOpen = false; $('studio-menu')?.focus(); });
  listen(window, 'resize', resize);
  listen(reduced, 'change', () => {
    state.reduced = reduced.matches;
    if (state.reduced) for (const animation of animations) animation.cancel();
  });
  listen(document, 'keydown', event => {
    if (event.key === 'Escape') {
      if (state.navOpen) { state.navOpen = false; $('studio-menu')?.focus(); }
      else if (!$('compare-hud')?.hidden) $('compare-close')?.click();
      else if (!$('organ-popover')?.hidden) $('organ-popover-close')?.click();
    }
    if (event.key !== 'Tab' || !state.navOpen || !state.narrow) return;
    const links = [...$('studio-nav').querySelectorAll('a[href]')];
    const first = links[0], last = links.at(-1);
    if (event.shiftKey && (document.activeElement === first || !$('studio-nav').contains(document.activeElement))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !$('studio-nav').contains(document.activeElement))) {
      event.preventDefault(); first?.focus();
    }
  });
  listen(document, 'click', event => {
    const target = event.target.closest?.('[data-open-panel]');
    if (target) selectPanel(target.dataset.openPanel, true);
  });
  listen($('sample-cases'), 'click', event => {
    const button = event.target.closest('[data-case]');
    if (!button) return;
    state.selectedCase = button.dataset.case;
    sync(); animate($('analysis-card'));
  });
  for (const id of ['chat-form', 'symptom-chips', 'btn-reset', 'btn-clear-symptoms']) {
    listen($(id), id === 'chat-form' ? 'submit' : 'click', () => {
      state.selectedCase = null; sync();
      if (id === 'chat-form' && document.querySelector('.studio-dialogue')) document.querySelector('.studio-dialogue').open = true;
    });
  }
  listen(window, 'tcm:state-change', sync);
  listen($('day-slider'), 'input', sync);
  // Older platform baselines have native controls but no state event. Keep both paths usable.
  const observer = new MutationObserver(sync);
  for (const id of ['analysis-body', 'day-label', 'day-slider', 'btn-play']) {
    if ($(id)) observer.observe($(id), { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  }
  sync();
  return { state, selectPanel, setDay, togglePlay, notify, resize,
    snapshot: () => ({ panel: state.panel, day: state.day, playing: state.playing,
      pattern: state.pattern, enabled: state.enabled, reducedMotion: state.reduced }),
    dispose() {
      clearTimeout(toastTimer); observer.disconnect(); stopPanelWatch(); stopNavWatch();
      cleanups.forEach(fn => fn()); animations.forEach(animation => animation.cancel());
    } };
}
