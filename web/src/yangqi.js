import { TCMScene3D } from "./scene3d.js?v=20261126qi";
import { NORMAL_STATE } from "./knowledge.js?v=20261107defense";

const $ = id => document.getElementById(id);
const FIVE_ZANG = ["Heart", "Liver", "Spleen", "Lungs", "Kidneys"];
const SIX_FU = ["Stomach", "SmallIntestine", "LargeIntestine", "Gallbladder", "Bladder"];
const YANG_MERIDIANS = ["LI", "SI", "TE", "ST", "GB", "BL"];
const YIN_MERIDIANS = ["LU", "HT", "PC", "SP", "KI", "LR"];

// 十二时辰子午流注 + 《灵枢·卫气行》昼阳 25 度 / 夜阴 25 度（肾→心→肺→肝→脾相克传变）
const SHICHEN_SCHEDULE = [
  { key: "mao", name: "卯时", short: "卯", hours: "05:00–07:00", phase: "day", meridian: "LI", meridianName: "手阳明大肠经当令", organ: "LargeIntestine", focusOrgan: "Lungs", route: "昼行阳分（25度）· 平旦卫气出目行表", acu: "合谷 LI4 · 曲池 LI11" },
  { key: "chen", name: "辰时", short: "辰", hours: "07:00–09:00", phase: "day", meridian: "ST", meridianName: "足阳明胃经当令", organ: "Stomach", focusOrgan: "Stomach", route: "昼行阳分（25度）· 中焦受纳通降", acu: "天枢 ST25 · 足三里 ST36" },
  { key: "si", name: "巳时", short: "巳", hours: "09:00–11:00", phase: "day", meridian: "SP", meridianName: "足太阴脾经当令", organ: "Spleen", focusOrgan: "Spleen", route: "昼行阳分（25度）· 脾主升清输精", acu: "三阴交 SP6 · 阴陵泉 SP9" },
  { key: "wu", name: "午时", short: "午", hours: "11:00–13:00", phase: "day", meridian: "HT", meridianName: "手少阴心经当令", organ: "Heart", focusOrgan: "Heart", route: "昼行阳分（25度）· 重阳之极，心阳温通", acu: "少海 HT3 · 神门 HT7" },
  { key: "wei", name: "未时", short: "未", hours: "13:00–15:00", phase: "day", meridian: "SI", meridianName: "手太阳小肠经当令", organ: "SmallIntestine", focusOrgan: "Heart", route: "昼行阳分（25度）· 分清泌浊", acu: "后溪 SI3 · 小海 SI8" },
  { key: "shen", name: "申时", short: "申", hours: "15:00–17:00", phase: "day", meridian: "BL", meridianName: "足太阳膀胱经当令", organ: "Bladder", focusOrgan: "Kidneys", route: "昼行阳分（25度）· 阳气循背下行", acu: "肺俞 BL13 · 肾俞 BL23 · 委中 BL40" },
  { key: "you", name: "酉时", short: "酉", hours: "17:00–19:00", phase: "day", meridian: "KI", meridianName: "足少阴肾经当令", organ: "Kidneys", focusOrgan: "Kidneys", route: "阳尽入阴之交 · 卫气将由足少阴入肾", acu: "涌泉 KI1 · 太溪 KI3" },
  { key: "xu", name: "戌时", short: "戌", hours: "19:00–21:00", phase: "night", meridian: "KI", meridianName: "夜入五脏 ① 肾（足少阴）", organ: "Kidneys", focusOrgan: "Kidneys", route: "《灵枢·卫气行》夜行阴分（25度）：首入于肾", acu: "太溪 KI3 · 气穴 KI13" },
  { key: "hai", name: "亥时", short: "亥", hours: "21:00–23:00", phase: "night", meridian: "HT", meridianName: "夜入五脏 ② 肾→心", organ: "Heart", focusOrgan: "Heart", route: "《灵枢·卫气行》夜行阴分（25度）：肾注于心", acu: "神门 HT7 · 内关 PC6" },
  { key: "zi", name: "子时", short: "子", hours: "23:00–01:00", phase: "night", meridian: "LU", meridianName: "夜入五脏 ③ 心→肺", organ: "Lungs", focusOrgan: "Lungs", route: "《灵枢·卫气行》夜行阴分（25度）：心注于肺", acu: "中府 LU1 · 太渊 LU9" },
  { key: "chou", name: "丑时", short: "丑", hours: "01:00–03:00", phase: "night", meridian: "LR", meridianName: "夜入五脏 ④ 肺→肝", organ: "Liver", focusOrgan: "Liver", route: "《灵枢·卫气行》夜行阴分（25度）：肺注于肝", acu: "太冲 LR3 · 期门 LR14" },
  { key: "yin", name: "寅时", short: "寅", hours: "03:00–05:00", phase: "night", meridian: "SP", meridianName: "夜入五脏 ⑤ 肝→脾（复注肾）", organ: "Spleen", focusOrgan: "Spleen", route: "《灵枢·卫气行》夜行阴分（25度）：肝注于脾，复归于肾为周", acu: "三阴交 SP6 · 大横 SP15" },
];

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
    btn.className = `shichen-tick${slot.phase === "night" ? " is-night-slot" : ""}${idx === shichenIdx ? " is-on" : ""}`;
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
  return phase === "day" ? "昼 · 卫阳行阳二十五度" : "夜 · 卫阳入阴二十五度";
}

function channelLabel() {
  const slot = currentSlot();
  return {
    shichen: `${slot.name} · ${slot.meridianName}`,
    du: "督脉 · 阳脉之海（命门→大椎→百会）",
    yang: "三阳经 · 躯干→四肢布散",
    yin: "三阴经 · 四肢→五脏归藏",
    zangfu: "五脏六腑 · 左升右降中枢",
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

function updateShichenUI() {
  const slot = currentSlot();
  if (ui.shichenSlider) ui.shichenSlider.value = String(shichenIdx);
  document.querySelectorAll(".shichen-tick").forEach(b => {
    b.classList.toggle("is-on", Number(b.dataset.shichenIdx) === shichenIdx);
  });
  if (ui.shichenCurrentLabel) {
    ui.shichenCurrentLabel.innerHTML = `<b>${slot.name}</b> · ${slot.hours} · ${slot.meridianName}`;
  }
  if (ui.shichenDegreeTag) {
    ui.shichenDegreeTag.textContent = slot.phase === "day" ? "昼 · 阳分 25度" : "夜 · 阴分 25度";
  }
  if (ui.hudName) ui.hudName.textContent = slot.name;
  if (ui.hudHours) ui.hudHours.textContent = slot.hours;
  if (ui.hudMeridian) ui.hudMeridian.textContent = slot.meridianName;
  if (ui.hudRoute) ui.hudRoute.textContent = slot.route;
  if (ui.hudAcu) ui.hudAcu.textContent = `示范穴位（GB/T 12346）：${slot.acu}`;
  if (ui.viewState) ui.viewState.textContent = `${slot.name} · ${slot.phase === "day" ? "卫阳行阳分" : "卫阳入五脏"}`;
}

function applyFuYang() {
  if (!scene) return;
  if (phase === "day") {
    scene.setAffected(["Kidneys", "Brain"], ["DU", ...YANG_MERIDIANS]);
  } else {
    scene.setAffected(["Kidneys", ...FIVE_ZANG], ["DU", ...YIN_MERIDIANS]);
  }
}

function applyChannel() {
  setChannelButtons();
  const slot = currentSlot();
  if (scene) {
    if (channel === "shichen") {
      scene.setAffected([slot.organ], [slot.meridian]);
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
  if (channel === "shichen" && slot.focusOrgan) {
    highlightOrganUI(slot.focusOrgan, false);
  }
  if (ui.focusLabel) ui.focusLabel.textContent = channelLabel();
}

function applyShichen(idx) {
  shichenIdx = ((idx % SHICHEN_SCHEDULE.length) + SHICHEN_SCHEDULE.length) % SHICHEN_SCHEDULE.length;
  const slot = currentSlot();
  phase = slot.phase;
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
  const targetIdx = next === "night" ? 7 : 1; // 戌时（夜首入肾）或 辰时（昼足阳明）
  channel = "shichen";
  applyShichen(targetIdx);
}

function applyMode(mode) {
  visualMode = mode === "holo" ? "holo" : "real";
  layers = { ...(visualMode === "real" ? REAL_LAYERS : HOLO_LAYERS) };
  syncLayerPills();
  const opacity = visualMode === "real" ? 0.16 : 0.10;
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
  ["btn-sex-male", "btn-sex-female"].forEach(id => { const b = $(id); if (b) b.disabled = true; });
  try {
    const ok = await scene.setSex(next);
    if (!ok) throw new Error("sex switch failed");
    sex = next;
    applyMode(visualMode);
    applyShichen(shichenIdx);
    $("btn-sex-male")?.classList.toggle("is-on", sex === "male");
    $("btn-sex-female")?.classList.toggle("is-on", sex === "female");
  } catch (e) {
    console.error(e);
    if (ui.focusLabel) ui.focusLabel.textContent = "模型切换失败";
  } finally {
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
    node.addEventListener("click", () => {
      const key = node.dataset.organ;
      if (!key) return;
      highlightOrganUI(key, true);
      if (scene) scene.focusOrgan(key);
      if (ui.focusLabel) ui.focusLabel.textContent = `聚焦脏腑 · ${node.querySelector("text")?.textContent || key}`;
    });
  });

  // 右侧 3D 脏腑标签点击 → 双向联动左图节点 + 左侧要点高亮并滚动
  $("canvas-wrap")?.addEventListener("tcm:organ-select", e => {
    const key = e.detail?.key;
    const zh = e.detail?.meta?.zh || key;
    if (!key) return;
    switchTab("axis");
    highlightOrganUI(key, true);
    if (ui.focusLabel) ui.focusLabel.textContent = `聚焦脏腑 · ${zh}`;
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
  buildShichenTicks();
  bindUI();
  applyShichen(shichenIdx);
  scene = new TCMScene3D($("canvas-wrap"), $("labels"), ui.loadingText);
  try {
    await scene.init();
    scene.setState(NORMAL_STATE, [], []);
    applyMode("real");
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
