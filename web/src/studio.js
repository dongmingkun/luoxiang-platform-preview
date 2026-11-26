// Presentation & interactive workbench adapter for Luoxiang Jingwei 3D Studio.
// Teaching knowledge rules, 3D scene physics, and zero-backend guarantees stay untouched.
import { MERIDIAN_NAMES } from "./knowledge.js?v=20261107defense";

const $ = id => document.getElementById(id);

function initStudio() {
  const tabs = [...document.querySelectorAll('[data-studio-tab]')];
  const panels = [...document.querySelectorAll('[data-studio-panel]')];
  const workflowSteps = [...document.querySelectorAll('[data-workflow-step]')];

  const tabTitles = {
    case: '案例辨证与映射',
    simulation: '方药方向与疗程推演',
    layers: '解剖层次与视效控制',
  };

  function selectPanel(id, focus = false) {
    const selected = tabs.find(tab => tab.dataset.studioTab === id);
    if (!selected) return;
    for (const tab of tabs) {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.dataset.studioPanel !== id;
    for (const step of workflowSteps) step.classList.toggle('is-current', step.dataset.workflowStep === id);
    const stepEl = $('inspector-step');
    if (stepEl) stepEl.textContent = `${String(tabs.indexOf(selected) + 1).padStart(2, '0')} / 03`;
    const titleEl = $('inspector-title');
    if (titleEl && tabTitles[id]) titleEl.textContent = tabTitles[id];
    if (focus) selected.focus();
  }

  document.addEventListener('click', event => {
    const tabBtn = event.target.closest?.('[data-studio-tab]');
    if (tabBtn) {
      selectPanel(tabBtn.dataset.studioTab);
      return;
    }
    const stepBtn = event.target.closest?.('[data-workflow-step]');
    if (stepBtn) {
      selectPanel(stepBtn.dataset.workflowStep);
      return;
    }
    const openBtn = event.target.closest?.('[data-open-panel]');
    if (openBtn) {
      selectPanel(openBtn.dataset.openPanel, true);
    }
  });
  for (const tab of tabs) {
    tab.addEventListener('keydown', event => {
      const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      const index = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (tabs.indexOf(tab) + offset + tabs.length) % tabs.length;
      if (offset || ['Home', 'End'].includes(event.key)) {
        event.preventDefault();
        selectPanel(tabs[index].dataset.studioTab, true);
      }
    });
  }

  selectPanel('case');
  const tabList = document.querySelector('.inspector-tabs');
  if (tabList) tabList.hidden = false;

  // Mode toggle link in header
  const params = new URLSearchParams(location.search);
  const isDemo = params.get('demo') === '1';
  const modeLink = $('mode-switch-link');
  if (modeLink) {
    modeLink.href = isDemo ? 'index.html' : 'index.html?demo=1';
    modeLink.textContent = isDemo ? '切至自由教学' : '进入答辩模式';
  }

  // Mobile navigation drawer + safe responsive breakpoint reset
  function setNav(open) {
    const narrow = window.matchMedia('(max-width: 960px)').matches;
    const active = Boolean(open && narrow);
    document.body.classList.toggle('nav-open', active);
    $('studio-menu')?.setAttribute('aria-expanded', String(active));
    const scrim = $('studio-scrim');
    if (scrim) scrim.hidden = !active;
    if (active) document.querySelector('.studio-nav-links a[aria-current]')?.focus();
  }

  $('studio-menu')?.addEventListener('click', () => {
    setNav($('studio-menu')?.getAttribute('aria-expanded') !== 'true');
  });
  $('studio-scrim')?.addEventListener('click', () => {
    setNav(false);
    $('studio-menu')?.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (document.body.classList.contains('nav-open')) {
        setNav(false);
        $('studio-menu')?.focus();
      } else if (!$('compare-hud')?.hidden) {
        setCompareOpen(false);
      } else if (!$('organ-popover')?.hidden) {
        closeOrganPopover();
      }
    }
  });
  $('studio-nav')?.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !document.body.classList.contains('nav-open')) return;
    const links = [...$('studio-nav').querySelectorAll('a')];
    const first = links[0];
    const last = links.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });

  // Always close drawer cleanly whenever viewport crosses desktop/mobile threshold
  const mq = window.matchMedia('(max-width: 960px)');
  mq.addEventListener?.('change', () => setNav(false));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 960 && document.body.classList.contains('nav-open')) setNav(false);
  });

  // Timeline proxy synchronization
  const slider = $('day-slider');
  const play = $('btn-play');
  const stageSlider = $('stage-day-slider');
  const stagePlay = $('stage-play');
  const stageDayLabel = $('stage-day-label');
  const dayLabel = $('day-label');

  function syncTimeline() {
    if (!slider || !play || !stageSlider || !stagePlay) return;
    stageSlider.value = slider.value;
    stageSlider.disabled = slider.disabled;
    if (stageDayLabel && dayLabel) stageDayLabel.textContent = dayLabel.textContent;
    stagePlay.disabled = play.disabled;
    const paused = !play.textContent.includes('模拟中');
    stagePlay.textContent = paused ? '▶ 播放' : 'Ⅱ 暂停';
    stagePlay.setAttribute('aria-label', paused ? '播放教学变化' : '暂停教学变化');
  }

  stageSlider?.addEventListener('input', event => {
    if (!slider) return;
    slider.value = event.currentTarget.value;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  stagePlay?.addEventListener('click', () => play?.click());
  slider?.addEventListener('input', syncTimeline);
  const timelineObserver = new MutationObserver(syncTimeline);
  for (const target of [slider, play, dayLabel]) {
    if (target) timelineObserver.observe(target, { attributes: true, attributeFilter: ['disabled'], childList: true, subtree: true });
  }
  syncTimeline();
  const stageTimeline = $('stage-timeline');
  if (stageTimeline) stageTimeline.hidden = false;

  // Standard case active state sync
  let selectedCase = isDemo ? params.get('case') : null;
  function markCase() {
    const hasMatch = Boolean($('analysis-body')?.querySelector('.pattern-name'));
    for (const button of $('sample-cases')?.querySelectorAll('button') || []) {
      const active = button.dataset.case === selectedCase && hasMatch;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }
  $('sample-cases')?.addEventListener('click', event => {
    const button = event.target.closest('[data-case]');
    if (button) {
      selectedCase = button.dataset.case;
      markCase();
    }
  });
  if ($('analysis-body')) new MutationObserver(markCase).observe($('analysis-body'), { childList: true, subtree: true });
  if ($('sample-cases')) new MutationObserver(markCase).observe($('sample-cases'), { childList: true });
  markCase();

  // Camera Orientation Controls with clear active states
  const camButtons = [...document.querySelectorAll('[data-camera-view]')];
  function setActiveCam(which) {
    for (const b of camButtons) {
      const on = b.dataset.cameraView === which;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  }
  function cameraView(which, animate = true) {
    const scene = window.__tcmScene;
    if (!scene) return;
    $('btn-rotate')?.classList.remove('is-on');
    setActiveCam(which);
    closeOrganPopover(false);
    if (typeof scene.setCameraPreset === 'function') {
      scene.setCameraPreset(which, animate);
    } else {
      scene.controls.autoRotate = false;
      scene.controls.target.set(0, 0.98, 0);
      scene.camera.position.set(0, 1.01, which === 'back' ? -3.3 : 3.3);
      scene.controls.update();
    }
  }
  for (const button of camButtons) {
    button.addEventListener('click', () => cameraView(button.dataset.cameraView, true));
  }
  $('btn-view-reset')?.addEventListener('click', () => {
    setActiveCam('front');
    closeOrganPopover(false);
  });

  // Organ Callout Toggle
  let labelsOn = true;
  $('btn-labels')?.addEventListener('click', e => {
    labelsOn = !labelsOn;
    e.currentTarget.classList.toggle('is-on', labelsOn);
    e.currentTarget.setAttribute('aria-pressed', String(labelsOn));
    window.__tcmScene?.setLabelsVisible?.(labelsOn);
  });

  // Organ Quick-Inspect Popover
  let activeOrganMeta = null;
  function openOrganPopover(key, meta) {
    const pop = $('organ-popover');
    if (!pop || !meta) return;
    activeOrganMeta = { key, meta };
    const st = window.__tcmStudioState;
    const isAffected = Boolean(st?.pattern?.organs?.includes(key));
    const merName = MERIDIAN_NAMES[meta.meridian] || meta.meridian || '—';
    $('organ-popover-dot').style.background = meta.color;
    $('organ-popover-title').textContent = `${meta.zh}（${key}）`;
    $('organ-popover-el').textContent = `五行属${meta.element}`;
    $('organ-popover-meta').textContent = isAffected
      ? `归属经络：${merName} · 当前「${st.pattern.name}」核心受累脏腑，已在三维视图中重点标亮。`
      : `归属经络：${merName} · 教学空间解剖定位参照，可点击下方进一步聚焦所属经络。`;
    pop.hidden = false;
    setActiveCam('');
  }
  function closeOrganPopover(resetCam = false) {
    const pop = $('organ-popover');
    if (pop) pop.hidden = true;
    activeOrganMeta = null;
    if (resetCam && window.__tcmScene) {
      cameraView('front', true);
    }
  }
  $('canvas-wrap')?.addEventListener('tcm:organ-select', e => {
    const { key, meta } = e.detail || {};
    openOrganPopover(key, meta);
  });
  $('organ-popover-close')?.addEventListener('click', () => closeOrganPopover(false));
  $('organ-popover-reset')?.addEventListener('click', () => closeOrganPopover(true));
  $('organ-popover-meridian')?.addEventListener('click', () => {
    if (activeOrganMeta?.meta?.meridian && window.__tcmScene) {
      window.__tcmScene.focusMeridian(activeOrganMeta.meta.meridian);
      $('btn-rotate')?.classList.remove('is-on');
    }
  });

  // True Interactive Before / After Comparison HUD
  let compareOpen = false;
  let compareTimer = 0;
  let comparePhase = 'after';

  function stopCompareAuto() {
    if (compareTimer) clearInterval(compareTimer);
    compareTimer = 0;
    $('compare-auto')?.classList.remove('is-on');
  }

  function renderCompareHud() {
    const st = window.__tcmStudioState;
    const hud = $('compare-hud');
    if (!hud || !st?.pattern) {
      if (hud) hud.hidden = true;
      return;
    }
    const b = st.beforeState;
    const a = st.afterState;
    const pct = v => Math.round(Math.max(0, Math.min(1, v)) * 100);
    const bBal = pct(1 - Math.abs(b.yang - b.yin));
    const aBal = pct(1 - Math.abs(a.yang - a.yin));
    const rows = [
      { label: '阴阳平衡', before: bBal, after: aBal, goodUp: true },
      { label: '气机运行', before: pct(b.qi), after: pct(a.qi), goodUp: true },
      { label: '血行通畅', before: pct(b.blood), after: pct(a.blood), goodUp: true },
      { label: '经络瘀滞', before: pct(b.stagnation), after: pct(a.stagnation), goodUp: false },
    ];
    $('compare-title').textContent = `${st.pattern.name} · ${st.formula?.name || '经典方示例'}（第 0 天 → 第 28 天）`;
    $('compare-grid').innerHTML = rows.map(r => {
      const diff = r.after - r.before;
      const sign = diff > 0 ? '+' : '';
      const cls = (r.goodUp ? diff >= 0 : diff <= 0) ? 'up' : 'down';
      return `<div class="compare-cell"><div class="compare-cell-label">${r.label}</div><div class="compare-cell-nums"><span>${r.before}% →</span><b>${r.after}%</b><em class="compare-delta ${cls}">${sign}${diff}%</em></div></div>`;
    }).join('');
    $('compare-cues').innerHTML = (st.pattern.improvements || []).map(x => `<span>✓ ${x}</span>`).join('');
    const isAfter = st.currentDay >= 14;
    $('compare-set-before')?.classList.toggle('is-on', !isAfter);
    $('compare-set-after')?.classList.toggle('is-on', isAfter);
  }

  function setCompareOpen(open) {
    const st = window.__tcmStudioState;
    if (open && !st?.pattern) {
      const notice = $('case-notice');
      if (notice) {
        notice.textContent = '请先在右侧选择一个标准案例，再开启「前后对比」视图。';
        notice.hidden = false;
      }
      return;
    }
    compareOpen = Boolean(open);
    const btn = $('btn-compare');
    btn?.classList.toggle('is-on', compareOpen);
    btn?.setAttribute('aria-pressed', String(compareOpen));
    $('canvas-wrap')?.classList.toggle('is-comparing', compareOpen);
    const hud = $('compare-hud');
    if (hud) hud.hidden = !compareOpen;
    if (compareOpen) {
      renderCompareHud();
      window.__tcmAppActions?.applyDay(28);
    } else {
      stopCompareAuto();
    }
  }

  $('btn-compare')?.addEventListener('click', () => setCompareOpen(!compareOpen));
  $('compare-close')?.addEventListener('click', () => setCompareOpen(false));
  $('compare-set-before')?.addEventListener('click', () => {
    stopCompareAuto();
    window.__tcmAppActions?.applyDay(0);
  });
  $('compare-set-after')?.addEventListener('click', () => {
    stopCompareAuto();
    window.__tcmAppActions?.applyDay(28);
  });
  $('compare-auto')?.addEventListener('click', e => {
    if (compareTimer) {
      stopCompareAuto();
      return;
    }
    e.currentTarget.classList.add('is-on');
    comparePhase = 'before';
    window.__tcmAppActions?.applyDay(0);
    compareTimer = setInterval(() => {
      comparePhase = comparePhase === 'before' ? 'after' : 'before';
      window.__tcmAppActions?.applyDay(comparePhase === 'after' ? 28 : 0);
    }, 2200);
  });

  // Layer Presets in Layers Tab
  const presetBtns = [...document.querySelectorAll('[data-layer-preset]')];
  for (const btn of presetBtns) {
    btn.addEventListener('click', () => {
      for (const b of presetBtns) b.classList.toggle('is-on', b === btn);
      window.__tcmAppActions?.applyLayerPreset(btn.dataset.layerPreset);
    });
  }

  // Sync Yin-Yang Balance Meter, Observable 3D Cues & Compare HUD on every app state change
  function syncStateWidgets(detail) {
    const st = detail || window.__tcmStudioState;
    if (!st) return;
    const cs = st.currentState || { yin: 0.5, yang: 0.5 };
    const yinPct = Math.round(Math.max(0, Math.min(1, cs.yin ?? 0.5)) * 100);
    const yangPct = Math.round(Math.max(0, Math.min(1, cs.yang ?? 0.5)) * 100);
    const total = Math.max(1, yinPct + yangPct);
    const yinShare = Math.round((yinPct / total) * 100);
    const yangShare = 100 - yinShare;

    const yinEl = $('yy-yin-val');
    const yangEl = $('yy-yang-val');
    if (yinEl) yinEl.textContent = `${yinPct}%`;
    if (yangEl) yangEl.textContent = `${yangPct}%`;
    const fillYin = $('yy-fill-yin');
    const fillYang = $('yy-fill-yang');
    if (fillYin) fillYin.style.width = `${yinShare}%`;
    if (fillYang) fillYang.style.width = `${yangShare}%`;

    const tag = $('yy-status-tag');
    if (tag) {
      const diff = (cs.yang ?? 0.5) - (cs.yin ?? 0.5);
      tag.textContent = Math.abs(diff) < 0.08 ? '阴平阳秘' : diff < 0 ? '阳偏虚 / 阴偏盛' : '阴偏虚 / 阳偏亢';
    }

    const impWrap = $('sim-improvements');
    const impList = $('sim-improvements-list');
    if (impWrap && impList) {
      if (st.pattern?.improvements?.length) {
        impList.innerHTML = st.pattern.improvements.map(x => `<li>${x}</li>`).join('');
        impWrap.hidden = false;
      } else {
        impWrap.hidden = true;
      }
    }

    if (!st.pattern && compareOpen) setCompareOpen(false);
    else if (compareOpen) renderCompareHud();
  }
  window.addEventListener('tcm:state-change', e => syncStateWidgets(e.detail));
  if (window.__tcmStudioState) syncStateWidgets(window.__tcmStudioState);

  $('btn-reset')?.addEventListener('click', () => {
    setCompareOpen(false);
    closeOrganPopover(false);
    setActiveCam('front');
  });

  // Scene ready observer
  let sceneBound = false;
  function sceneReady() {
    if (sceneBound || !window.__tcmScene) return;
    sceneBound = true;
    cameraView('front', false);
    const ready = $('stage-ready');
    if (ready) {
      ready.classList.add('is-ready');
      ready.replaceChildren(document.createElement('i'), document.createTextNode('本机模型已就绪'));
    }
    for (const button of camButtons) button.disabled = false;
    sceneObserver.disconnect();
    loadingObserver?.disconnect();
  }
  const sceneObserver = new MutationObserver(sceneReady);
  if ($('canvas-wrap')) sceneObserver.observe($('canvas-wrap'), { childList: true });
  let loadingObserver;
  if ($('loading')) {
    loadingObserver = new MutationObserver(() => {
      sceneReady();
      if (!sceneBound && $('loading-text')?.textContent.includes('失败')) {
        const ready = $('stage-ready');
        if (ready) ready.textContent = '需载入本机模型';
      }
    });
    loadingObserver.observe($('loading'), { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
  }
  sceneReady();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudio, { once: true });
} else {
  initStudio();
}
