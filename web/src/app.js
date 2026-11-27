import {
  SYMPTOMS, PATTERNS, FORMULAS, ORGAN_META, ZANG_KEYS, MERIDIAN_NAMES,
  NORMAL_STATE, lerpState, clamp, patternSymptoms,
} from "./knowledge.js?v=20261107defense";
import {
  AGENT_INTRO, DISCLAIMER, SAMPLE_CASES, analyzeText, formulaFor, formulaOptions,
  buildAnalysisReply, buildTreatmentReply, urgentReply, detectFormula,
  detectOrgan, detectMeridian, isCompareIntent, isResetIntent, isTreatIntent,
} from "./agent.js?v=20261108teacher";
import { startModelLoader } from "./model-loader.js";

const $ = id => document.getElementById(id);
const ui = {
  chat: $("chat"), chips: $("symptom-chips"), samples: $("sample-cases"),
  form: $("chat-form"), input: $("chat-input"), agentStatus: $("agent-status"),
  analysisCard: $("analysis-card"), analysisBody: $("analysis-body"), analysisTag: $("analysis-tag"),
  treatmentCard: $("treatment-card"), treatmentTag: $("treatment-tag"),
  formulaSelect: $("formula-select"), formulaNote: $("formula-note"),
  daySlider: $("day-slider"), dayLabel: $("day-label"),
  btnBefore: $("btn-before"), btnAfter: $("btn-after"), btnPlay: $("btn-play"),
  metrics: $("metrics"), treatmentNote: $("treatment-note"),
  skinOpacity: $("skin-opacity"), skinOpacityValue: $("skin-opacity-value"),
  layerToggles: $("layer-toggles"), viewState: $("view-state"),
  loading: $("loading"), loadingText: $("loading-text"),
  labels: $("labels"), clockText: $("clock-text"),
  btnSexMale: $("btn-sex-male"), btnSexFemale: $("btn-sex-female"),
};

const selectedSymptoms = new Set();
let scene = null;
let analysis = null;
let pattern = null;
let formula = null;
let beforeState = { ...NORMAL_STATE };
let afterState = { ...NORMAL_STATE };
let currentDay = 0;
let playing = false;
let playRaf = 0;
let chipTimer = 0;
let visualMode = "real";
let sex = "male";
let sexLoading = false;

const layerDefs = [
  ["skin", "皮肤"], ["organs", "器官"], ["skeleton", "骨骼"],
  ["meridians", "经络"], ["vessels", "血脉"], ["flow", "气血流"], ["clock", "流注环"], ["taiji", "太极/丹田"],
];
const REAL_LAYERS = {
  skin: true, organs: true, skeleton: false, meridians: true,
  vessels: false, flow: true, clock: false, taiji: false,
};
const HOLO_LAYERS = {
  skin: true, organs: true, skeleton: true, meridians: true,
  vessels: true, flow: true, clock: true, taiji: true,
};
const layers = { ...REAL_LAYERS };

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function format(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}
function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = format(text);
  ui.chat.appendChild(el);
  ui.chat.scrollTop = ui.chat.scrollHeight;
  return el;
}
function setAgentStatus(text) { ui.agentStatus.textContent = text; }

function buildChips() {
  for (const s of SYMPTOMS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = s.label;
    b.dataset.symptom = s.label;
    b.addEventListener("click", () => {
      if (selectedSymptoms.has(s.label)) selectedSymptoms.delete(s.label);
      else selectedSymptoms.add(s.label);
      b.classList.toggle("is-on", selectedSymptoms.has(s.label));
      scheduleChipAnalysis();
    });
    ui.chips.appendChild(b);
  }
  for (const c of SAMPLE_CASES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sample";
    b.textContent = c.name;
    b.dataset.case = c.id;
    b.addEventListener("click", () => selectSampleCase(c));
    ui.samples.appendChild(b);
  }
}

function selectSampleCase(sample) {
  $('case-notice').hidden = true;
  stopPlay();
  clearSymptoms();
  processUserInput(sample.text);
}

function buildLayerToggles() {
  for (const [key, label] of layerDefs) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `layer-pill${layers[key] ? " is-on" : ""}`;
    b.textContent = label;
    b.dataset.layer = key;
    b.addEventListener("click", () => {
      layers[key] = !layers[key];
      b.classList.toggle("is-on", layers[key]);
      if (scene) scene.setLayers(layers);
    });
    ui.layerToggles.appendChild(b);
  }
}

function syncChips() {
  document.querySelectorAll(".chip").forEach(b => {
    b.classList.toggle("is-on", selectedSymptoms.has(b.dataset.symptom));
  });
}

function scheduleChipAnalysis() {
  clearTimeout(chipTimer);
  chipTimer = setTimeout(() => {
    if (selectedSymptoms.size === 0) return;
    analyzeAndPresent([...selectedSymptoms].join("、"), true);
  }, 380);
}

function clearSymptoms() {
  selectedSymptoms.clear();
  syncChips();
  clearTimeout(chipTimer);
}

function emitStudioState(currentState = NORMAL_STATE) {
  const detail = {
    pattern,
    formula,
    beforeState: { ...beforeState },
    afterState: { ...afterState },
    currentState: { ...currentState },
    currentDay,
    visualMode,
    sex,
  };
  window.__tcmStudioState = detail;
  window.dispatchEvent(new CustomEvent("tcm:state-change", { detail }));
}

function setAnalysisCard() {
  if (!pattern) {
    ui.analysisTag.textContent = "等待选择";
    ui.analysisBody.className = "analysis-empty";
    ui.analysisBody.innerHTML = "<div class=\"analysis-placeholder\">从上方选择一个标准案例</div><p>观察证候与相关脏腑、经络的教学对应关系，点击脏腑/经络标签可在 3D 视图中聚焦。</p>";
    return;
  }
  const organTags = pattern.organs.map(k => {
    const meta = ORGAN_META[k];
    return `<button type="button" class="org-tag is-interactive" data-focus-organ="${k}" title="点击在 3D 中聚焦${meta.zh}" style="--tag-accent:${meta.color}"><i style="background:${meta.color}"></i>${meta.zh}</button>`;
  }).join("");
  const meridianTags = pattern.meridians.map(m =>
    `<button type="button" class="org-tag meridian is-interactive" data-focus-meridian="${m}" title="点击在 3D 中聚焦${MERIDIAN_NAMES[m] || m}">${MERIDIAN_NAMES[m] || m}</button>`).join("");
  const sym = analysis?.symptoms.map(s => s.label).join(" · ") || "—";
  const herbsHtml = formula?.herbs?.length
    ? `<div class="formula-herbs">${formula.herbs.map(h => `<span>${escapeHtml(h)}</span>`).join("")}</div>`
    : "";
  ui.analysisTag.textContent = "教学匹配";
  ui.analysisBody.className = "";
  ui.analysisBody.innerHTML = `
    <div class="pattern-head">
      <div>
        <div class="pattern-name">${pattern.name}</div>
        <div class="pattern-sub">${pattern.subtitle}</div>
      </div>
      <span class="pattern-score">${Math.round((analysis?.confidence || 0) * 100)}%</span>
    </div>
    <div class="confidence"><span>规则匹配度（非诊断概率）</span><div class="bar"><i style="width:${Math.round((analysis?.confidence || 0) * 100)}%"></i></div></div>
    <div class="analysis-copy">${escapeHtml(pattern.description)}</div>
    <div class="analysis-matched"><span>已匹配</span> ${escapeHtml(sym)}</div>
    <div class="tag-list" aria-label="相关脏腑与经络（点击聚焦）">${organTags}${meridianTags}</div>
    <div class="formula-brief">
      <div class="formula-brief-head"><span>经典方示例</span><b>${formula?.name || "—"}</b><em>不含剂量</em></div>
      <div class="formula-brief-act">${formula?.actions || ""}</div>
      ${herbsHtml}
    </div>
  `;
}

function setTreatmentEnabled(enabled) {
  ui.treatmentCard.classList.toggle("is-disabled", !enabled);
  ui.formulaSelect.disabled = !enabled;
  ui.daySlider.disabled = !enabled;
  ui.btnBefore.disabled = !enabled;
  ui.btnAfter.disabled = !enabled;
  ui.btnPlay.disabled = !enabled;
  if (!enabled) ui.treatmentTag.textContent = "未开始";
}

function fillFormulaSelect() {
  ui.formulaSelect.innerHTML = "";
  if (!pattern) return;
  for (const f of formulaOptions(pattern)) {
    const opt = document.createElement("option");
    opt.value = f.name;
    opt.textContent = `${f.name} · ${f.actions}`;
    ui.formulaSelect.appendChild(opt);
  }
  if (formula) ui.formulaSelect.value = formula.name;
  ui.formulaNote.textContent = formula
    ? `${formula.name}：${formula.actions}。${formula.note} 当前版本按证候演示作用方向，不做方剂间疗效比较。`
    : "请选择一个经典方示例；当前版本按证候演示作用方向，不做方剂间疗效比较。";
}

function beginTreatment(p, f, addChat = true) {
  pattern = p;
  formula = f;
  beforeState = { ...p.before };
  afterState = { ...p.after };
  currentDay = 0;
  setTreatmentEnabled(true);
  fillFormulaSelect();
  setAnalysisCard();
  ui.daySlider.value = "0";
  ui.dayLabel.textContent = "第 0 天";
  ui.treatmentTag.textContent = "服药前";
  ui.treatmentNote.textContent = `模拟 ${p.name} → ${f.name}；拖动疗程滑块或点「模拟服药」观察 3D 变化。`;
  applyDay(0);
  if (scene) {
    scene.setAffected(p.organs, p.meridians);
    scene.setState(beforeState, p.organs, p.meridians);
  }
  if (addChat) {
    addMessage("agent", buildTreatmentReply(p, f, 0));
  }
}

function analyzeAndPresent(text, addChat = true) {
  const free = text || "";
  const a = analyzeText(free, [...selectedSymptoms]);
  if (a.redFlags.length) {
    addMessage("agent", urgentReply(a.redFlags));
    setAgentStatus("检测到需优先就医的表现");
    return;
  }
  if (!a.top || a.symptoms.length === 0) {
    if (addChat) {
      addMessage("agent", "我还需要更多线索。可以点选上方常见症状，或用一句话描述，例如「怕冷、腰膝酸软、夜尿多」。");
    }
    setAgentStatus("在线 · 等待更多症状");
    return;
  }
  analysis = a;
  pattern = a.top;
  formula = formulaFor(pattern);
  beforeState = { ...pattern.before };
  afterState = { ...pattern.after };
  currentDay = 0;
  setTreatmentEnabled(true);
  fillFormulaSelect();
  setAnalysisCard();
  ui.viewState.textContent = `${pattern.name} · 服药前`;
  ui.daySlider.value = "0";
  ui.dayLabel.textContent = "第 0 天";
  ui.treatmentTag.textContent = "服药前";
  ui.treatmentNote.textContent = `已投射 ${pattern.name} 的异常状态；选择方剂后拖动疗程观察变化。`;
  applyDay(0);
  if (scene) {
    scene.setAffected(pattern.organs, pattern.meridians);
    scene.setState(beforeState, pattern.organs, pattern.meridians);
  }
  setAgentStatus(`已匹配：${pattern.name}`);
  if (addChat) {
    addMessage("agent", buildAnalysisReply(a, pattern, formula));
  }
}

function applyDay(day) {
  currentDay = clamp(day, 0, 28);
  if (!pattern) return;
  const t = clamp(currentDay / 28);
  const eased = t * t * (3 - 2 * t);
  const state = lerpState(beforeState, afterState, eased);
  ui.daySlider.value = String(Math.round(currentDay));
  ui.dayLabel.textContent = `第 ${Math.round(currentDay)} 天`;
  ui.viewState.textContent = currentDay < 0.5
    ? `${pattern.name} · 服药前`
    : currentDay > 27.5
      ? `服药后 · ${pattern.name}`
      : `第 ${Math.round(currentDay)} 天 · ${pattern.name}`;
  if (scene) scene.setState(state, pattern.organs, pattern.meridians);
  updateMetrics(state);
  ui.treatmentTag.textContent = currentDay > 27.5 ? "疗程完成" : currentDay < 0.5 ? "服药前" : "变化中";
}

function updateMetrics(state) {
  const balance = 1 - Math.abs(state.yang - state.yin);
  const qi = clamp(state.qi);
  const blood = clamp(state.blood);
  const stasis = clamp(state.stagnation);
  const values = { balance, qi, blood, stagnation: stasis };
  for (const [key, value] of Object.entries(values)) {
    const bar = document.querySelector(`[data-metric="${key}"]`);
    const b = bar?.parentElement?.nextElementSibling;
    if (bar) bar.style.width = `${Math.round(value * 100)}%`;
    if (b) b.textContent = `${Math.round(value * 100)}%`;
  }
  const flowQi = document.getElementById("flow-qi");
  const flowBlood = document.getElementById("flow-blood");
  const flowBalance = document.getElementById("flow-balance");
  if (flowQi) flowQi.textContent = `${Math.round(qi * 100)}%`;
  if (flowBlood) flowBlood.textContent = `${Math.round(blood * 100)}%`;
  if (flowBalance) flowBalance.textContent = `${Math.round(balance * 100)}%`;
  emitStudioState(state);
}

function applyLayerPreset(mode) {
  Object.assign(layers, mode === "real" ? REAL_LAYERS : HOLO_LAYERS);
  document.querySelectorAll(".layer-pill").forEach((b) => {
    b.classList.toggle("is-on", Boolean(layers[b.dataset.layer]));
  });
  if (scene) scene.setLayers(layers);
}

function setVisualMode(mode) {
  visualMode = mode === "holo" ? "holo" : "real";
  if (scene) scene.setVisualMode(visualMode);
  applyLayerPreset(visualMode);
  const opacity = visualMode === "real" ? 0.18 : 0.10;
  ui.skinOpacity.value = String(opacity);
  ui.skinOpacityValue.textContent = opacity < 0.04 ? "透视" : opacity < 0.12 ? "清透" : "标准";
  if (scene) scene.setSkinOpacity(opacity);
  $("btn-mode-real")?.classList.toggle("is-on", visualMode === "real");
  $("btn-mode-holo")?.classList.toggle("is-on", visualMode === "holo");
  ui.viewState.textContent = pattern
    ? `${pattern.name} · ${visualMode === "real" ? "真实" : "全息"}`
    : `正常 · ${visualMode === "real" ? "真实" : "全息"}`;
}

function setSexButtons(value) {
  ui.btnSexMale?.classList.toggle("is-on", value === "male");
  ui.btnSexFemale?.classList.toggle("is-on", value === "female");
  ui.btnSexMale?.setAttribute("aria-pressed", String(value === "male"));
  ui.btnSexFemale?.setAttribute("aria-pressed", String(value === "female"));
}

async function changeSex(next) {
  if (!scene || sexLoading || next === sex) return;
  const prev = sex;
  sexLoading = true;
  if (ui.btnSexMale) ui.btnSexMale.disabled = true;
  if (ui.btnSexFemale) ui.btnSexFemale.disabled = true;
  ui.viewState.textContent = next === "female" ? "切换女性模型…" : "切换男性模型…";
  try {
    const ok = await scene.setSex(next);
    if (!ok) throw new Error("sex model load failed");
    sex = next;
    setSexButtons(sex);
    sexLoading = false;
    if (ui.btnSexMale) ui.btnSexMale.disabled = false;
    if (ui.btnSexFemale) ui.btnSexFemale.disabled = false;
    setVisualMode(visualMode);
    addMessage("agent", next === "female"
      ? "已切换为女性教学模型：按 ANSUR II 比例重建，以肩宽、胸廓、腰胯与身高区分；骨盆外表面已做隐私处理。"
      : "已切换为男性教学模型：骨盆外表面已做隐私处理。");
  } catch (err) {
    console.error(err);
    sex = prev;
    setSexButtons(sex);
    sexLoading = false;
    if (ui.btnSexMale) ui.btnSexMale.disabled = false;
    if (ui.btnSexFemale) ui.btnSexFemale.disabled = false;
    setVisualMode(visualMode);
    addMessage("agent", "性别模型切换失败，请确认 assets/anatomy_male.glb 与 anatomy_female.glb 已随本地服务提供。");
  }
}

function stopPlay() {
  playing = false;
  if (playRaf) cancelAnimationFrame(playRaf);
  playRaf = 0;
  ui.btnPlay.textContent = "▶ 模拟服药";
}

function playTreatment() {
  if (!pattern) return;
  stopPlay();
  playing = true;
  ui.btnPlay.textContent = "Ⅱ 模拟中";
  const start = performance.now();
  const from = currentDay >= 27 ? 0 : currentDay;
  const to = 28;
  if (from === 0) applyDay(0);
  const step = now => {
    if (!playing) return;
    const t = clamp((now - start) / 6500);
    const eased = t * t * (3 - 2 * t);
    applyDay(from + (to - from) * eased);
    if (t < 1) {
      playRaf = requestAnimationFrame(step);
    } else {
      playing = false;
      ui.btnPlay.textContent = "▶ 重播";
      addMessage("agent", `模拟完成：第 28 天。${pattern.name}的 3D 参数已沿方剂作用方向改善；这是教学演示，不是药效预测。`);
    }
  };
  playRaf = requestAnimationFrame(step);
}

function resetAll(silent = false) {
  stopPlay();
  clearSymptoms();
  analysis = null;
  pattern = null;
  formula = null;
  beforeState = { ...NORMAL_STATE };
  afterState = { ...NORMAL_STATE };
  currentDay = 0;
  setAnalysisCard();
  setTreatmentEnabled(false);
  ui.formulaSelect.innerHTML = "";
  ui.formulaNote.textContent = "先完成教学匹配，再选择经典方示例；当前版本按证候演示作用方向，不做方剂间疗效比较。";
  ui.daySlider.value = "0";
  ui.dayLabel.textContent = "第 0 天";
  ui.viewState.textContent = "正常 · 阴平阳秘";
  ui.treatmentTag.textContent = "未开始";
  ui.treatmentNote.textContent = "3D 会沿「证候 → 方剂作用方向」变化；这是可视化模拟，不是药效预测。";
  updateMetrics(NORMAL_STATE);
  if (scene) {
    scene.setAffected([], []);
    scene.setState(NORMAL_STATE, [], []);
    scene.resetView();
  }
  setAgentStatus("在线 · 等待你的症状");
  if (!silent) addMessage("agent", "已回到正常态。可以重新描述症状，或点选常见症状开始。");
}

function processUserInput(text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  addMessage("user", clean);
  ui.input.value = "";
  setAgentStatus("推理中…");

  const red = analyzeText(clean, []).redFlags;
  if (red.length) {
    addMessage("agent", urgentReply(red));
    setAgentStatus("请优先就医");
    return;
  }
  if (isResetIntent(clean)) { resetAll(); return; }
  if (isCompareIntent(clean)) {
    if (!pattern) { addMessage("agent", "先完成一次证候分析，才能做服药前后对比。"); return; }
    applyDay(currentDay > 14 ? 0 : 28);
    addMessage("agent", currentDay > 14 ? "已切到服药后。" : "已切到服药前。");
    return;
  }

  const foundFormula = detectFormula(clean);
  const a0 = analyzeText(clean, [...selectedSymptoms]);
  if (foundFormula && (isTreatIntent(clean) || a0.symptoms.length === 0)) {
    const p = PATTERNS[foundFormula.pattern];
    if (!p) { addMessage("agent", "这个方名还没有关联到可视化证候。"); return; }
    if (pattern && pattern.id !== p.id) {
      addMessage("agent", `当前证候是「${pattern.name}」，与「${foundFormula.name}」的示例证候「${p.name}」不一致。已按「${p.name}」切换教学场景。`);
    }
    beginTreatment(p, foundFormula, false);
    addMessage("agent", buildTreatmentReply(p, foundFormula, 0));
    return;
  }

  if (a0.top && a0.symptoms.length > 0) {
    analysis = a0;
    pattern = a0.top;
    formula = formulaFor(pattern);
    analyzeAndPresent(clean, true);
    return;
  }

  if (isTreatIntent(clean)) {
    if (!pattern) addMessage("agent", "请先描述症状完成证候分析，再说「服药」；我可以方名示例教学，但不能开方。");
    else { beginTreatment(pattern, formula, false); playTreatment(); }
    return;
  }

  const organ = detectOrgan(clean);
  if (organ) {
    if (scene) scene.focusOrgan(organ.key);
    addMessage("agent", `已聚焦「${organ.zh}」。${organ.zh}属${organ.element}，对应经络：${MERIDIAN_NAMES[organ.meridian] || organ.meridian}。若有不适应先描述症状，而不是只按脏腑名称判断。`);
    setAgentStatus(`已聚焦：${organ.zh}`);
    return;
  }
  const mer = detectMeridian(clean);
  if (mer) {
    if (scene) scene.focusMeridian(mer.id);
    addMessage("agent", `已聚焦「${mer.name}」。可以继续描述症状，我会把经络阻滞与脏腑状态一起投射到 3D。`);
    setAgentStatus(`已聚焦：${mer.name}`);
    return;
  }

  addMessage("agent", "我暂时没有从这句话里识别出足够的具体症状。可以试试：「怕冷、腰膝酸软、夜尿多」或点选上方症状标签。");
  setAgentStatus("在线 · 等待更多症状");
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const demoMode = params.get('demo') === '1';
  if (demoMode) {
    document.body.classList.add('demo-mode');
    const banner = $('demo-banner');
    if (banner) banner.hidden = false;
    setAgentStatus('答辩模式 · 请选择标准案例');
  }
  buildChips();
  buildLayerToggles();
  addMessage("agent", AGENT_INTRO);
  addMessage("agent", DISCLAIMER);
  updateMetrics(NORMAL_STATE);

  if (demoMode && params.has('case')) {
    const sample = SAMPLE_CASES.find(c => c.id === params.get('case'));
    if (sample) selectSampleCase(sample);
    else {
      const notice = $('case-notice');
      notice.textContent = '未找到对应的标准案例，请从下方选择。已保留答辩模式首页。';
      notice.hidden = false;
    }
  }

  startModelLoader({
    wrap: $("canvas-wrap"), labels: ui.labels, loading: ui.loading, text: ui.loadingText,
    onReady(loaded) {
      scene = loaded;
      sex = scene.sex;
      scene.setState(pattern ? beforeState : NORMAL_STATE, pattern?.organs || [], pattern?.meridians || []);
      setVisualMode(visualMode);
      if (pattern && currentDay) applyDay(currentDay);
      setSexButtons(sex);
      for (const [key, button] of [["male", ui.btnSexMale], ["female", ui.btnSexFemale]]) {
        if (button) button.disabled = !!scene.localModels && !scene.localModels.has(key);
      }
      window.__tcmScene = scene;
    },
  });

  ui.form.addEventListener("submit", e => {
    e.preventDefault();
    processUserInput(ui.input.value);
  });
  $("btn-clear-symptoms").addEventListener("click", () => {
    clearSymptoms();
    resetAll(true);
    addMessage("agent", "已清空所选症状并回到正常态。");
  });
  $("btn-reset").addEventListener("click", () => resetAll());
  ui.daySlider.addEventListener("input", () => {
    stopPlay();
    applyDay(Number(ui.daySlider.value));
  });
  ui.btnBefore.addEventListener("click", () => { stopPlay(); applyDay(0); });
  ui.btnAfter.addEventListener("click", () => { stopPlay(); applyDay(28); });
  ui.btnPlay.addEventListener("click", () => { if (playing) stopPlay(); else playTreatment(); });
  ui.analysisBody.addEventListener("click", e => {
    const organBtn = e.target.closest("[data-focus-organ]");
    if (organBtn && scene) {
      const key = organBtn.dataset.focusOrgan;
      scene.focusOrgan(key);
      $("btn-rotate")?.classList.remove("is-on");
      const meta = ORGAN_META[key];
      if (meta) {
        scene.container?.dispatchEvent(new CustomEvent("tcm:organ-select", { detail: { key, meta } }));
      }
      return;
    }
    const merBtn = e.target.closest("[data-focus-meridian]");
    if (merBtn && scene) {
      scene.focusMeridian(merBtn.dataset.focusMeridian);
      $("btn-rotate")?.classList.remove("is-on");
    }
  });
  ui.formulaSelect.addEventListener("change", () => {
    const f = Object.values(FORMULAS).find(x => x.name === ui.formulaSelect.value);
    if (f) {
      formula = f;
      setAnalysisCard();
      ui.formulaNote.textContent = `${f.name}：${f.actions}。${f.note} 当前版本按证候演示作用方向，不做方剂间疗效比较。`;
      addMessage("agent", `已切换到「${f.name}」。当前版本按证候演示作用方向，切换方剂只更换教学示例，不比较疗效；方名与剂量需由专业医师决定。`);
      emitStudioState(scene?.state || NORMAL_STATE);
    }
  });
  ui.skinOpacity.addEventListener("input", () => {
    const v = Number(ui.skinOpacity.value);
    if (scene) scene.setSkinOpacity(v);
    ui.skinOpacityValue.textContent = v < 0.04 ? "透视" : v < 0.12 ? "清透" : v < 0.22 ? "标准" : "可见";
  });
  $("btn-mode-real").addEventListener("click", () => setVisualMode("real"));
  $("btn-mode-holo").addEventListener("click", () => setVisualMode("holo"));
  ui.btnSexMale?.addEventListener("click", () => changeSex("male"));
  ui.btnSexFemale?.addEventListener("click", () => changeSex("female"));
  $("btn-view-reset").addEventListener("click", () => scene?.resetView());
  $("btn-rotate").addEventListener("click", e => {
    if (!scene) return;
    scene.controls.autoRotate = !scene.controls.autoRotate;
    e.currentTarget.classList.toggle("is-on", scene.controls.autoRotate);
  });
  $("btn-compare").addEventListener("click", () => {
    if (!pattern) { addMessage("agent", "先完成证候分析，再做服药前后对比。"); return; }
    if (document.body.classList.contains("studio-body")) return;
    stopPlay();
    applyDay(currentDay > 14 ? 0 : 28);
  });
  window.__tcmAppActions = {
    applyDay: d => { stopPlay(); applyDay(d); },
    stopPlay,
    playTreatment,
    applyLayerPreset: preset => {
      if (preset === "meridian") {
        Object.assign(layers, { skin: true, organs: true, skeleton: false, meridians: true, vessels: false, flow: true, clock: true, taiji: false });
      } else if (preset === "holo") {
        setVisualMode("holo");
        return;
      } else {
        setVisualMode("real");
        return;
      }
      document.querySelectorAll(".layer-pill").forEach(b => b.classList.toggle("is-on", Boolean(layers[b.dataset.layer])));
      if (scene) scene.setLayers(layers);
    },
  };
}

boot();
