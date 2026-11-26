import { YangqiScene } from "./yangqi-scene.js";
import { SLOTS as SHICHEN_SCHEDULE, weiAt } from "./yangqi-clock.js";
import { setupStomachAtlas } from "./yangqi-atlas.js";
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
  vessels: true, flow: true, clock: false, taiji: true,
};
const LAYER_DEFS = [
  ["skin", "皮肤"], ["organs", "器官"], ["skeleton", "骨骼"], ["meridians", "经络"],
  ["vessels", "血脉"], ["flow", "气血流"], ["taiji", "太极/丹田"],
];
let layers = { ...REAL_LAYERS };

function opacityLabel(v) {
  return Math.round(v * 100) + "%";
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
      if (scene) { scene.clearInspection(); scene.setLayers(layers); }
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
  shichenSlider: $("shichen-slider"),
  shichenTicks: $("shichen-ticks"),
  shichenCurrentLabel: $("shichen-current-label"),
  shichenDegreeTag: $("shichen-degree-tag"),
  hudName: $("hud-shichen-name"),
  hudHours: $("hud-shichen-hours"),
  hudMeridian: $("hud-shichen-meridian"),
  hudRoute: $("hud-shichen-route"),
  hudAcu: $("hud-shichen-acu"),
};

let scene = null;
let atlas = null;
let shichenIdx = 1; // 默认辰时（07:00-09:00，足阳明胃经）
let phase = "day";
let channel = "shichen";
let visualMode = "real";
let sex = "male";
let switching = false;

function currentSlot() {
  return SHICHEN_SCHEDULE[shichenIdx] || SHICHEN_SCHEDULE[1];
}

function buildShichenTicks() {
  if (!ui.shichenTicks) return;
  ui.shichenTicks.innerHTML = "";
  SHICHEN_SCHEDULE.forEach((slot, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `shichen-tick${weiAt(idx).phase === "night" ? " is-night-slot" : ""}${idx === shichenIdx ? " is-on" : ""}`;
    btn.textContent = slot.short;
    btn.title = `${slot.name}（${slot.hours}）· ${slot.meridianName}`;
    btn.dataset.shichenIdx = String(idx);
    btn.addEventListener("click", () => {
      stopCycle();
      channel = "shichen";
      applyShichen(idx);
    });
    ui.shichenTicks.appendChild(btn);
  });
}

function highlightOrganUI(organKey, scrollNote = false) {
  document.querySelectorAll(".organ-node").forEach(n => {
    n.classList.toggle("is-active", n.dataset.organ === organKey);
  });
  document.querySelectorAll("[data-organ-note]").forEach(li => {
    const match = li.dataset.organNote === organKey;
    li.classList.toggle("is-active", match);
    if (match && scrollNote) {
      li.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
}

function phaseText() {
  return "卫气 · " + weiAt(shichenIdx).label;
}

function channelLabel() {
  const slot = currentSlot();
  return {
    shichen: `${slot.name} · ${slot.meridianName}`,
    du: "督脉 · 阳脉之海（命门→大椎→百会）",
    yang: "手足三阳 · 六条阳经",
    yin: "手足三阴 · 六条阴经",
    zangfu: "五脏六腑 · 左升右降中枢",
    fu: phase === "day" ? "卫气昼行 · 阳分路线" : "卫气夜行 · 肾→心→肺→肝→脾→肾",
  }[channel] || "";
}

function setChannelButtons() {
  document.querySelectorAll("[data-channel]").forEach(b => {
    b.classList.toggle("is-on", b.dataset.channel === channel);
  });
}

function setPhaseButtons() {
  ui.day.setAttribute("aria-pressed", String(phase === "day"));
  ui.night.setAttribute("aria-pressed", String(phase === "night"));
  ui.day?.classList.toggle("is-on", phase === "day");
  ui.night?.classList.toggle("is-on", phase === "night");
}

function updateShichenUI() {
  const slot = currentSlot();
  if (ui.shichenSlider) ui.shichenSlider.value = String(shichenIdx);
  document.querySelectorAll(".shichen-tick").forEach(b => {
    const current = Number(b.dataset.shichenIdx) === shichenIdx;
    b.classList.toggle("is-on", current);
    b.setAttribute("aria-pressed", String(current));
  });
  const wei = weiAt(shichenIdx);
  ui.shichenSlider.setAttribute("aria-valuetext", slot.name + " " + slot.hours);
  ui.shichenCurrentLabel.textContent = slot.meridianName;
  ui.shichenDegreeTag.textContent = wei.label + " · " + wei.range;
  $("wei-progress").value = wei.end;
  $("slot-hours").textContent = slot.name + " · " + slot.hours;
  ui.hudName.textContent = slot.name;
  ui.hudHours.textContent = slot.hours;
  ui.hudMeridian.textContent = slot.meridianName;
  ui.hudRoute.textContent = slot.route;
  ui.hudAcu.textContent = "经穴举例 · " + slot.acu;
  ui.viewState.textContent = slot.name + " · " + slot.meridianName.replace("当令", "");
}

function applyFuYang() {
  if (!scene) return;
  if (phase === "day") {
    scene.setAffected([], YANG_MERIDIANS);
  } else {
    scene.setAffected(FIVE_ZANG, []);
  }
}

function applyChannel() {
  setChannelButtons();
  const slot = currentSlot();
  if (scene) {
    scene.clearInspection();
    if (channel === "shichen") {
      scene.setAffected(slot.organ ? [slot.organ] : [], [slot.meridian]);
    } else if (channel === "fu") {
      applyFuYang();
    } else if (channel === "du") {
      scene.setAffected(["Kidneys", "Brain"], ["DU"]);
    } else if (channel === "yang") {
      scene.setAffected(SIX_FU, YANG_MERIDIANS);
    } else if (channel === "yin") {
      scene.setAffected(FIVE_ZANG, YIN_MERIDIANS);
    } else if (channel === "zangfu") {
      scene.setAffected([...FIVE_ZANG, "Stomach"], []);
    }
  }
  if (channel === "shichen") {
    highlightOrganUI(slot.organ, false);
  }
  atlas?.setChannel(channel === "shichen" ? slot.meridian : null);
  if (ui.focusLabel) ui.focusLabel.textContent = channelLabel();
}

function applyShichen(idx) {
  shichenIdx = ((idx % SHICHEN_SCHEDULE.length) + SHICHEN_SCHEDULE.length) % SHICHEN_SCHEDULE.length;
  phase = weiAt(shichenIdx).phase;
  document.body.classList.toggle("is-night", phase === "night");
  setPhaseButtons();
  updateShichenUI();
  if (ui.phaseLabel) ui.phaseLabel.textContent = phaseText();
  if (scene) {
    scene.setDayNight(phase);
  }
  applyChannel();
}

function applyPhasePreset(next) {
  const targetIdx = next === "night" ? 6 : 0;
  channel = "shichen";
  applyShichen(targetIdx);
}

function applyMode(mode) {
  atlas?.cancelMark();
  visualMode = mode === "holo" ? "holo" : "real";
  layers = { ...(visualMode === "real" ? REAL_LAYERS : HOLO_LAYERS) };
  syncLayerPills();
  const opacity = visualMode === "real" ? 0.38 : 0.07;
  if (ui.skinOpacity) ui.skinOpacity.value = opacity;
  if (ui.skinOpacityValue) ui.skinOpacityValue.textContent = opacityLabel(opacity);
  if (scene) {
    scene.clearInspection();
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
  atlas.suspend();
  ["btn-sex-male", "btn-sex-female"].forEach(id => { const b = $(id); if (b) b.disabled = true; });
  try {
    const ok = await scene.setSex(next);
    if (!ok) throw new Error("sex switch failed");
    sex = next;
    applyMode(visualMode);
    applyShichen(shichenIdx);
    $("btn-rotate").classList.remove("is-on");
    $("btn-sex-male")?.classList.toggle("is-on", sex === "male");
    $("btn-sex-female")?.classList.toggle("is-on", sex === "female");
  } catch (e) {
    console.error(e);
    if (ui.focusLabel) ui.focusLabel.textContent = "模型切换失败";
  } finally {
    atlas.attach(scene);
    switching = false;
    ["btn-sex-male", "btn-sex-female"].forEach(id => { const b = $(id); if (b) b.disabled = false; });
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
    btn.textContent = "▶ 演进时辰";
  }
}

function bindUI() {
  const tabs = [...document.querySelectorAll("[data-yq-tab]")];
  const panels = [...document.querySelectorAll("[data-yq-panel]")];
  const switchTab = id => {
    if (id !== "meridians") atlas?.cancelMark();
    tabs.forEach(t => t.setAttribute("aria-selected", String(t.dataset.yqTab === id)));
    panels.forEach(p => { p.hidden = p.dataset.yqPanel !== id; });
  };
  for (const tab of tabs) {
    tab.addEventListener("click", () => switchTab(tab.dataset.yqTab));
  }

  $("btn-yq-cycle")?.addEventListener("click", e => {
    if (cycleTimer) { stopCycle(); return; }
    channel = "shichen";
    e.currentTarget.classList.add("is-on");
    e.currentTarget.setAttribute("aria-pressed", "true");
    e.currentTarget.textContent = "Ⅱ 暂停演进";
    applyShichen(shichenIdx + 1);
    cycleTimer = setInterval(() => applyShichen(shichenIdx + 1), 2400);
  });

  ui.day?.addEventListener("click", () => { stopCycle(); applyPhasePreset("day"); });
  ui.night?.addEventListener("click", () => { stopCycle(); applyPhasePreset("night"); });

  for (const [id, delta] of [["slot-prev", -1], ["slot-next", 1]]) {
    $(id).addEventListener("click", () => {
      stopCycle();
      channel = "shichen";
      applyShichen(shichenIdx + delta);
    });
  }
  $("atlas-open").addEventListener("click", () => {
    stopCycle();
    channel = "shichen";
    applyShichen(1);
    switchTab("meridians");
    $("st-point").focus();
  });
  ui.shichenSlider?.addEventListener("input", e => {
    stopCycle();
    channel = "shichen";
    applyShichen(Number(e.target.value));
  });

  document.querySelectorAll("[data-channel]").forEach(b => {
    b.addEventListener("click", () => {
      stopCycle();
      channel = b.dataset.channel;
      applyChannel();
    });
  });

  // 左侧 2D 升降图节点点击 → 联动 3D 聚焦 + 左侧要点高亮
  document.querySelectorAll(".organ-node").forEach(node => {
    node.setAttribute("role", "button");
    node.setAttribute("tabindex", "0");
    node.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        node.dispatchEvent(new MouseEvent("click"));
      }
    });
    node.addEventListener("click", () => {
      const key = node.dataset.organ;
      if (!key) return;
      stopCycle();
      highlightOrganUI(key, true);
      if (scene) { scene.clearInspection(); scene.focusOrgan(key); $("btn-rotate").classList.remove("is-on"); }
      if (ui.focusLabel) ui.focusLabel.textContent = `聚焦脏腑 · ${node.querySelector("text")?.textContent || key}`;
    });
  });

  // 右侧 3D 脏腑标签点击 → 双向联动左图节点 + 左侧要点高亮并滚动
  $("canvas-wrap")?.addEventListener("tcm:organ-select", e => {
    const key = e.detail?.key;
    const zh = e.detail?.meta?.zh || key;
    if (!key) return;
    stopCycle();
    switchTab("axis");
    highlightOrganUI(key, true);
    if (ui.focusLabel) ui.focusLabel.textContent = `聚焦脏腑 · ${zh}`;
  });

  $("btn-sex-male")?.addEventListener("click", () => changeSex("male"));
  $("btn-sex-female")?.addEventListener("click", () => changeSex("female"));
  $("btn-mode-real")?.addEventListener("click", () => applyMode("real"));
  $("btn-mode-holo")?.addEventListener("click", () => applyMode("holo"));
  for (const [id, organ, view] of [["inspect-stomach", "Stomach", "front"], ["inspect-kidneys", "Kidneys", "back"]]) {
    $(id).addEventListener("click", () => {
      if (!scene || switching) return;
      atlas?.cancelMark();
      stopCycle();
      if (!layers.organs) { layers.organs = true; scene.setLayers(layers); syncLayerPills(); }
      scene.inspectOrgan(organ, view);
      highlightOrganUI(organ);
      $("btn-rotate").classList.remove("is-on");
      ui.focusLabel.textContent = organ === "Stomach" ? "正面 · 单独显示胃" : "背面 · 单独显示双肾";
    });
  }
  $("btn-view-reset")?.addEventListener("click", () => { scene?.resetView(); $("btn-rotate").classList.remove("is-on"); applyChannel(); });
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
  buildShichenTicks();
  atlas = setupStomachAtlas();
  bindUI();
  applyShichen(shichenIdx);
  const loadingScene = new YangqiScene($("canvas-wrap"), $("labels"), ui.loadingText);
  try {
    await loadingScene.init();
    scene = loadingScene;
    atlas.attach(scene);
    scene.setState(NORMAL_STATE, [], []);
    applyMode(visualMode);
    applyShichen(shichenIdx);
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
