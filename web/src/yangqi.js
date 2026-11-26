import { TCMScene3D } from "./scene3d.js?v=20261126award";
import { NORMAL_STATE } from "./knowledge.js?v=20261107defense";

const $ = id => document.getElementById(id);
const FIVE_ZANG = ["Heart", "Liver", "Spleen", "Lungs", "Kidneys"];
const SIX_FU = ["Stomach", "SmallIntestine", "LargeIntestine", "Gallbladder", "Bladder"];
const YANG_MERIDIANS = ["LI", "SI", "TE", "ST", "GB", "BL"];
const YIN_MERIDIANS = ["LU", "HT", "PC", "SP", "KI", "LR"];
const REAL_LAYERS = {
  skin: true, organs: true, skeleton: false, meridians: true,
  vessels: false, flow: true, clock: false, taiji: false,
};
const HOLO_LAYERS = {
  skin: true, organs: true, skeleton: true, meridians: true,
  vessels: true, flow: true, clock: true, taiji: true,
};
const LAYER_DEFS = [
  ["skin", "皮肤"], ["organs", "器官"], ["skeleton", "骨骼"], ["meridians", "经络"],
  ["vessels", "血脉"], ["flow", "气血流"], ["clock", "流注环"], ["taiji", "太极/丹田"],
];
let layers = { ...REAL_LAYERS };

function opacityLabel(v) {
  return v < 0.04 ? "透视" : v < 0.12 ? "清透" : v < 0.22 ? "标准" : "可见";
}
function buildLayerToggles() {
  for (const [key, label] of LAYER_DEFS) {
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
    ui.layerToggles?.appendChild(b);
  }
}
function syncLayerPills() {
  document.querySelectorAll(".layer-pill").forEach(b => {
    b.classList.toggle("is-on", !!layers[b.dataset.layer]);
  });
}

const ui = {
  loading: $("loading"), loadingText: $("loading-text"),
  day: $("btn-yq-day"), night: $("btn-yq-night"),
  phaseLabel: $("yq-phase-label"), focusLabel: $("yq-focus-label"),
  viewState: $("view-state"),
  skinOpacity: $("skin-opacity"), skinOpacityValue: $("skin-opacity-value"),
  layerToggles: $("layer-toggles"),
};

let scene = null;
let phase = "day";
let channel = "all";
let visualMode = "real";
let sex = "male";
let switching = false;

function phaseText() {
  return phase === "day" ? "昼 · 卫阳行表" : "夜 · 卫阳入里";
}
function phaseFocusText() {
  return phase === "day" ? "六腑 / 体表" : "五脏 / 体内";
}
function channelLabel() {
  return {
    all: phaseFocusText(),
    du: "督脉 · 阳脉之海",
    yang: "三阳经 · 躯干→四肢",
    yin: "三阴经 · 四肢→脏腑",
    zangfu: "脏腑升降 · 肾脾心脉",
    fu: phase === "day"
      ? "阳主阴从 · 昼行表卫外（阴从于内）"
      : "阳主阴从 · 夜入阴宅温养（阴为阳之宅）",
  }[channel] || "";
}
function setChannelButtons() {
  document.querySelectorAll("[data-channel]").forEach(b => {
    b.classList.toggle("is-on", b.dataset.channel === channel);
  });
}
function setPhaseButtons() {
  ui.day?.classList.toggle("is-on", phase === "day");
  ui.night?.classList.toggle("is-on", phase === "night");
}
function focusPhase() {
  const organs = phase === "day" ? SIX_FU : FIVE_ZANG;
  const meridians = phase === "day" ? YANG_MERIDIANS : YIN_MERIDIANS;
  scene?.setAffected(organs, meridians);
}
function applyFuYang() {
  // 扶阳派·阳主阴从：肾根常明，昼阳主于表（督脉+三阳经），夜阳入阴宅（五脏+三阴经）
  if (!scene) return;
  if (phase === "day") {
    scene.setAffected(["Kidneys", "Brain"], ["DU", ...YANG_MERIDIANS]);
  } else {
    scene.setAffected(["Kidneys", ...FIVE_ZANG], ["DU", ...YIN_MERIDIANS]);
  }
}
function applyChannel() {
  setChannelButtons();
  if (!scene) return;
  if (channel === "all") {
    focusPhase();
  } else if (channel === "fu") {
    applyFuYang();
  } else if (channel === "du") {
    scene.setAffected(["Kidneys", "Brain"], ["DU"]);
  } else if (channel === "yang") {
    scene.setAffected(SIX_FU, YANG_MERIDIANS);
  } else if (channel === "yin") {
    scene.setAffected(FIVE_ZANG, YIN_MERIDIANS);
  } else if (channel === "zangfu") {
    scene.setAffected(FIVE_ZANG, []);
  }
  if (ui.focusLabel) ui.focusLabel.textContent = channelLabel();
}
function applyPhase(next) {
  phase = next === "night" ? "night" : "day";
  document.body.classList.toggle("is-night", phase === "night");
  setPhaseButtons();
  if (ui.phaseLabel) ui.phaseLabel.textContent = phaseText();
  if (ui.viewState) ui.viewState.textContent = phaseText();
  if (scene) {
    scene.setDayNight(phase);
    if (channel === "all") focusPhase();
    else if (channel === "fu") applyFuYang();
  }
  if (ui.focusLabel) ui.focusLabel.textContent = channelLabel();
}
function applyMode(mode) {
  visualMode = mode === "holo" ? "holo" : "real";
  layers = { ...(visualMode === "real" ? REAL_LAYERS : HOLO_LAYERS) };
  syncLayerPills();
  const opacity = visualMode === "real" ? 0.18 : 0.10;
  if (ui.skinOpacity) ui.skinOpacity.value = opacity;
  if (ui.skinOpacityValue) ui.skinOpacityValue.textContent = opacityLabel(opacity);
  if (scene) {
    scene.setVisualMode(visualMode);
    scene.setLayers(layers);
    scene.setSkinOpacity(opacity);
  }
  $("btn-mode-real")?.classList.toggle("is-on", visualMode === "real");
  $("btn-mode-holo")?.classList.toggle("is-on", visualMode === "holo");
}
async function changeSex(next) {
  if (!scene || switching || next === sex) return;
  switching = true;
  [("btn-sex-male"), ("btn-sex-female")].forEach(id => { const b = $(id); if (b) b.disabled = true; });
  try {
    const ok = await scene.setSex(next);
    if (!ok) throw new Error("sex switch failed");
    sex = next;
    applyMode(visualMode);
    applyPhase(phase);
    applyChannel();
    $("btn-sex-male")?.classList.toggle("is-on", sex === "male");
    $("btn-sex-female")?.classList.toggle("is-on", sex === "female");
  } catch (e) {
    console.error(e);
    if (ui.focusLabel) ui.focusLabel.textContent = "模型切换失败";
  } finally {
    switching = false;
    [("btn-sex-male"), ("btn-sex-female")].forEach(id => { const b = $(id); if (b) b.disabled = false; });
  }
}
let cycleTimer = 0;
function stopCycle() {
  if (cycleTimer) clearInterval(cycleTimer);
  cycleTimer = 0;
  const btn = $("btn-yq-cycle");
  if (btn) {
    btn.classList.remove("is-on");
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = "↻ 昼夜轮转";
  }
}
function bindUI() {
  const tabs = [...document.querySelectorAll("[data-yq-tab]")];
  const panels = [...document.querySelectorAll("[data-yq-panel]")];
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const id = tab.dataset.yqTab;
      tabs.forEach(t => t.setAttribute("aria-selected", String(t === tab)));
      panels.forEach(p => { p.hidden = p.dataset.yqPanel !== id; });
    });
  }
  $("btn-yq-cycle")?.addEventListener("click", e => {
    if (cycleTimer) { stopCycle(); return; }
    e.currentTarget.classList.add("is-on");
    e.currentTarget.setAttribute("aria-pressed", "true");
    e.currentTarget.textContent = "Ⅱ 停止轮转";
    applyPhase(phase === "day" ? "night" : "day");
    cycleTimer = setInterval(() => applyPhase(phase === "day" ? "night" : "day"), 3600);
  });
  ui.day?.addEventListener("click", () => { stopCycle(); applyPhase("day"); });
  ui.night?.addEventListener("click", () => { stopCycle(); applyPhase("night"); });
  document.querySelectorAll("[data-channel]").forEach(b => {
    b.addEventListener("click", () => { channel = b.dataset.channel; applyChannel(); });
  });
  document.querySelectorAll(".organ-node").forEach(node => {
    node.addEventListener("click", () => {
      const key = node.dataset.organ;
      if (!key || !scene) return;
      document.querySelectorAll(".organ-node").forEach(n => n.classList.remove("is-active"));
      node.classList.add("is-active");
      scene.focusOrgan(key);
      if (ui.focusLabel) ui.focusLabel.textContent = `聚焦 · ${node.querySelector("text")?.textContent || key}`;
    });
  });
  $("btn-sex-male")?.addEventListener("click", () => changeSex("male"));
  $("btn-sex-female")?.addEventListener("click", () => changeSex("female"));
  $("btn-mode-real")?.addEventListener("click", () => applyMode("real"));
  $("btn-mode-holo")?.addEventListener("click", () => applyMode("holo"));
  $("btn-view-reset")?.addEventListener("click", () => scene?.resetView());
  $("btn-rotate")?.addEventListener("click", e => {
    if (!scene) return;
    scene.controls.autoRotate = !scene.controls.autoRotate;
    e.currentTarget.classList.toggle("is-on", scene.controls.autoRotate);
  });
  ui.skinOpacity?.addEventListener("input", () => {
    const v = Number(ui.skinOpacity.value);
    if (scene) scene.setSkinOpacity(v);
    if (ui.skinOpacityValue) ui.skinOpacityValue.textContent = opacityLabel(v);
  });
}

async function boot() {
  buildLayerToggles();
  bindUI();
  applyPhase("day");
  applyChannel();
  scene = new TCMScene3D($("canvas-wrap"), $("labels"), ui.loadingText);
  try {
    await scene.init();
    scene.setState(NORMAL_STATE, [], []);
    applyMode("real");
    applyPhase(phase);
    applyChannel();
    ui.loading.classList.add("is-hidden");
    setTimeout(() => ui.loading.remove(), 500);
    window.__yangqiScene = scene;
    console.log("[yangqi] ready", { sex: scene.sex, organs: scene.organs.size, meridians: scene.meridians?.meridians?.length });
  } catch (err) {
    console.error(err);
    ui.loadingText.textContent = "3D 模型加载失败；请通过本地 HTTP 服务打开并确认 anatomy_male.glb / anatomy_female.glb 存在。";
  }
}

boot();
