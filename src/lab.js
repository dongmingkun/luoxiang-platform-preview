import * as THREE from "three";
import { TCMScene3D } from "./scene3d.js?v=20261126qi";
import { NORMAL_STATE } from "./knowledge.js?v=20261107defense";
import { solveBoneCunAcupoints, scoreAcupointClick } from "./cun-locator.js?v=20261127lab";
import { KG_NODES, KG_EDGES, KG_NODE_TYPES, getKgStats, getNodeNeighbors } from "./tcm-kg.js?v=20261127lab";
import { PRESET_QUESTIONS, queryLocalQA } from "./local-qa.js?v=20261127lab";

const $ = id => document.getElementById(id);

const ui = {
  loading: $("loading"), loadingText: $("loading-text"),
  canvasWrap: $("canvas-wrap"),
  perfPill: $("perf-pill"), fpsChip: $("fps-chip"),
  stageTitle: $("stage-title"), stageModeChip: $("stage-mode-chip"),
  hudKicker: $("hud-kicker"), hudTitle: $("hud-title"), hudSub: $("hud-sub"),
  paramHeight: $("param-height"), paramHeightVal: $("param-height-val"),
  paramBuild: $("param-build"), paramBuildVal: $("param-build-val"),
  cunTv: $("cun-tv"), cunTh: $("cun-th"), cunFa: $("cun-fa"), cunLl: $("cun-ll"),
  locatorRefDiff: $("locator-ref-diff"),
  acupointList: $("acupoint-list"), acuCountTag: $("acu-count-tag"),
  btnLandmarks: $("btn-toggle-landmarks"), btnExportAcu: $("btn-export-acupoints"),
  // Exam
  btnExamStart: $("btn-exam-start"), btnExamHint: $("btn-exam-hint"),
  btnExamNext: $("btn-exam-next"), btnExamSkip: $("btn-exam-skip"),
  btnExportExam: $("btn-export-exam"),
  examStatus: $("exam-status"), examTarget: $("exam-target"),
  examQNo: $("exam-q-no"), examQTitle: $("exam-q-title"), examQMeta: $("exam-q-meta"),
  examQHint: $("exam-q-hint"), examFeedback: $("exam-feedback"),
  examDone: $("exam-done"), examMeanMm: $("exam-mean-mm"), examMeanScore: $("exam-mean-score"),
  examHistory: $("exam-history"),
  // KG
  kgSvg: $("kg-svg"), kgStatsTag: $("kg-stats-tag"),
  kgDetailTitle: $("kg-detail-title"), kgDetailType: $("kg-detail-type"),
  kgDetailSummary: $("kg-detail-summary"), kgNeighbors: $("kg-neighbors"), kgDetailLink: $("kg-detail-link"),
  // QA
  qaForm: $("qa-form"), qaInput: $("qa-input"), qaPresets: $("qa-presets"),
  qaResult: $("qa-result"), qaResTitle: $("qa-res-title"), qaResBadge: $("qa-res-badge"),
  qaResAnswer: $("qa-res-answer"), qaResQuote: $("qa-res-quote"),
  qaResSource: $("qa-res-source"), qaResAction: $("qa-res-action"), qaResLink: $("qa-res-link"),
};

let scene = null;
let sex = "male";
let visualMode = "real";
let activeTab = "locator";
let showLandmarks = true;
let solved = null;
let selectedAcuId = "ST36";

// 3D Overlay Groups inside scene.scene
let locatorGroup = null;
let landmarkGroup = null;
let examOverlayGroup = null;
const acuMeshes = new Map();

// Exam state
let examActive = false;
let examQueue = [];
let examIndex = 0;
let examAnsweredCurrent = false;
const examRecords = [];

// QA sequence timer
let qaSeqTimer = 0;

function setHud(kicker, title, sub) {
  if (ui.hudKicker) ui.hudKicker.textContent = kicker;
  if (ui.hudTitle) ui.hudTitle.textContent = title;
  if (ui.hudSub) ui.hudSub.textContent = sub;
}

function clearGroup(g) {
  if (!g) return;
  while (g.children.length) {
    const child = g.children.pop();
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }
}

function downloadText(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 300);
}

/* ============================================================
 * 1. 骨度分寸自动定位算法与 3D 体表渲染
 * ============================================================ */
function runBoneCunSolver() {
  if (!scene) return;
  const heightCm = Number(ui.paramHeight?.value || 172);
  const buildRatio = Number(ui.paramBuild?.value || 1.0);
  if (ui.paramHeightVal) ui.paramHeightVal.textContent = `${heightCm} cm`;
  if (ui.paramBuildVal) ui.paramBuildVal.textContent = `${buildRatio.toFixed(2)}×`;

  solved = solveBoneCunAcupoints({
    bodyMesh: scene.skin,
    meridianSystem: scene.meridians,
    sex,
    heightCm,
    buildRatio,
  });

  if (ui.cunTv) ui.cunTv.textContent = `${solved.cunMetrics.trunkVertCm} cm`;
  if (ui.cunTh) ui.cunTh.textContent = `${solved.cunMetrics.trunkHorizCm} cm`;
  if (ui.cunFa) ui.cunFa.textContent = `${solved.cunMetrics.forearmCm} cm`;
  if (ui.cunLl) ui.cunLl.textContent = `${solved.cunMetrics.lowerLegCm} cm`;
  if (ui.locatorRefDiff) {
    ui.locatorRefDiff.textContent = solved.meanRefDiffMm != null ? `${solved.meanRefDiffMm} mm` : "—";
  }
  if (ui.acuCountTag) ui.acuCountTag.textContent = `${solved.points.length} 穴`;

  renderLocator3D();
  renderAcupointList();
}

function renderLocator3D() {
  if (!scene || !solved) return;
  clearGroup(locatorGroup);
  clearGroup(landmarkGroup);
  acuMeshes.clear();

  const hideInExam = activeTab === "exam" && examActive && !examAnsweredCurrent;
  locatorGroup.visible = !hideInExam;
  landmarkGroup.visible = showLandmarks && activeTab === "locator";

  for (const pt of solved.points) {
    const isSel = pt.id === selectedAcuId;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(isSel ? 0.014 : 0.009, 14, 12),
      new THREE.MeshBasicMaterial({
        color: isSel ? 0x6ee7b7 : 0x34d399,
        transparent: true,
        opacity: isSel ? 0.98 : 0.84,
      }),
    );
    mesh.position.copy(pt.pos);
    mesh.renderOrder = 14;
    locatorGroup.add(mesh);
    acuMeshes.set(pt.id, mesh);

    if (isSel) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.017, 0.023, 24),
        new THREE.MeshBasicMaterial({ color: 0xfde68a, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
      );
      ring.position.copy(pt.pos);
      ring.lookAt(scene.camera.position);
      ring.renderOrder = 15;
      locatorGroup.add(ring);
    }
  }

  for (const lm of solved.landmarks) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.011, 0),
      new THREE.MeshBasicMaterial({ color: 0xf5b942, transparent: true, opacity: 0.82 }),
    );
    mesh.position.copy(lm.pos);
    mesh.renderOrder = 13;
    landmarkGroup.add(mesh);
  }
}

function focusAcupoint(id) {
  if (!solved || !scene) return;
  const pt = solved.points.find(p => p.id === id);
  if (!pt) return;
  selectedAcuId = pt.id;
  renderLocator3D();
  renderAcupointList();

  scene.setAffected([pt.organ], [pt.meridian]);
  const zSign = pt.face === "back" ? -1 : 1;
  const target = pt.pos.clone();
  const camPos = pt.pos.clone().add(new THREE.Vector3(pt.pos.x * 0.4, 0.08, zSign * 1.15));
  scene.controls.autoRotate = false;
  $("btn-rotate")?.classList.remove("is-on");
  scene._cameraTween = { pos: camPos, target, speed: 0.14 };

  setHud(
    `GB/T 12346 · ${pt.id}`,
    `${pt.name}（${pt.meridianName}）`,
    `${pt.formula}｜坐标 (${pt.coordCm.x}, ${pt.coordCm.y}, ${pt.coordCm.z}) cm`,
  );
}

function renderAcupointList() {
  if (!ui.acupointList || !solved) return;
  ui.acupointList.innerHTML = "";
  for (const pt of solved.points) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `acu-item${pt.id === selectedAcuId ? " is-active" : ""}`;
    btn.innerHTML = `
      <div class="acu-item-top"><strong>${pt.name}</strong><code>${pt.id}</code></div>
      <div class="acu-item-sub">${pt.meridianName} · ${pt.region}</div>
    `;
    btn.addEventListener("click", () => focusAcupoint(pt.id));
    ui.acupointList.appendChild(btn);
  }
}

function exportAcupointsCsv() {
  if (!solved) return;
  const header = "code,name,meridian,region,sex,height_cm,build_ratio,x_cm,y_cm,z_cm,ref_diff_mm,cun_formula";
  const rows = solved.points.map(p => [
    p.id, p.name, p.meridianName, p.region, solved.sex, solved.heightCm, solved.buildRatio,
    p.coordCm.x, p.coordCm.y, p.coordCm.z, p.refErrorMm ?? "", `"${p.formula}"`,
  ].join(","));
  downloadText(`luoxiang_acupoints_${solved.sex}_${solved.heightCm}cm.csv`, [header, ...rows].join("\n"));
}

/* ============================================================
 * 2. 3D 交互式点穴考核闭环（Raycaster 精准拾取 + 毫米偏差打分）
 * ============================================================ */
function startExam() {
  if (!solved) return;
  // 精选 5 个代表性体表清晰易点的国标穴位并洗牌
  const pool = ["ST36", "SP6", "CV12", "CV4", "ST25", "GV14", "GV4", "LI11", "PC6", "CV17"]
    .map(id => solved.points.find(p => p.id === id))
    .filter(Boolean);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  examQueue = pool.slice(0, 5);
  examIndex = 0;
  examRecords.length = 0;
  examActive = true;
  examAnsweredCurrent = false;
  clearGroup(examOverlayGroup);

  ui.examStatus.hidden = true;
  ui.examTarget.hidden = false;
  ui.btnExamHint.disabled = false;
  ui.btnExportExam.disabled = true;
  ui.canvasWrap.classList.add("is-exam-cursor");
  renderExamQuestion();
  renderExamStats();
}

function renderExamQuestion() {
  const q = examQueue[examIndex];
  if (!q) {
    finishExam();
    return;
  }
  examAnsweredCurrent = false;
  clearGroup(examOverlayGroup);
  renderLocator3D();

  // 将模型自动转向该穴位所在面（正面或背面），方便学生点击
  scene?.setCameraPreset(q.face === "back" ? "back" : "front", true);
  scene?.setAffected([], [q.meridian]);

  ui.examQNo.textContent = `第 ${examIndex + 1} / ${examQueue.length} 题`;
  ui.examQTitle.textContent = `请在 3D 体表点击定位：${q.name}（${q.id}）`;
  ui.examQMeta.textContent = `归经：${q.meridianName} · 区域：${q.region}（${q.face === "back" ? "背面" : "正面"}）`;
  ui.examQHint.textContent = `骨度分寸提示：${q.formula}`;
  ui.examQHint.hidden = true;
  ui.examFeedback.hidden = true;
  ui.btnExamNext.hidden = true;
  ui.btnExamSkip.hidden = false;

  setHud("ACUPOINT EXAM", `考核中：请点击【${q.name} ${q.id}】`, `旋转调整视角后轻点体表落点；系统按三维毫米误差评分。`);
}

function handleExamClick(clientX, clientY) {
  if (!examActive || examAnsweredCurrent || !scene || !scene.skin || !solved) return;
  const q = examQueue[examIndex];
  if (!q) return;

  const rect = scene.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, scene.camera);
  const hits = raycaster.intersectObject(scene.skin, false);
  if (!hits.length) {
    setHud("ACUPOINT EXAM", "未点中人体体表", "请直接轻点 3D 人体模型表面完成取穴。");
    return;
  }

  const clickedPos = hits[0].point.clone();
  const { distMm, score, grade } = scoreAcupointClick(clickedPos, q.pos, solved.scaleToRealCm);
  examAnsweredCurrent = true;
  examRecords.push({
    index: examIndex + 1,
    code: q.id,
    name: q.name,
    meridian: q.meridianName,
    region: q.region,
    distMm,
    score,
    grade,
    sex,
    heightCm: solved.heightCm,
  });

  // 3D 可视化：学生点（橙色）+ 国标参考点（翠绿）+ 偏差连线
  clearGroup(examOverlayGroup);
  const userMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xf97316 }),
  );
  userMesh.position.copy(clickedPos);
  userMesh.renderOrder = 16;

  const targetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x34d399 }),
  );
  targetMesh.position.copy(q.pos);
  targetMesh.renderOrder = 16;

  const lineGeo = new THREE.BufferGeometry().setFromPoints([clickedPos, q.pos]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xfde68a }));
  line.renderOrder = 16;

  examOverlayGroup.add(userMesh, targetMesh, line);

  ui.examFeedback.hidden = false;
  ui.examFeedback.className = `exam-feedback${score < 60 ? " is-miss" : ""}`;
  ui.examFeedback.innerHTML = `<b>${grade} · ${score} 分</b>（三维偏差 <b>${distMm} mm</b>）<br />参考骨度：${q.formula}`;
  ui.btnExamNext.hidden = false;
  ui.btnExamNext.textContent = examIndex + 1 < examQueue.length ? "下一题 →" : "查看本轮成绩 ✓";
  ui.btnExamSkip.hidden = true;
  ui.btnExportExam.disabled = false;

  setHud(`得分 ${score} · ${grade}`, `${q.name} 偏差 ${distMm} mm`, "橙球＝你的取穴点，翠绿球＝国标骨度算法点。");
  renderExamStats();
}

function finishExam() {
  examActive = false;
  ui.canvasWrap.classList.remove("is-exam-cursor");
  ui.examTarget.hidden = true;
  ui.examStatus.hidden = false;
  const count = examRecords.length;
  const meanMm = count ? (examRecords.reduce((a, r) => a + r.distMm, 0) / count).toFixed(1) : "—";
  const meanScore = count ? Math.round(examRecords.reduce((a, r) => a + r.score, 0) / count) : 0;
  ui.examStatus.innerHTML = `本轮考核完成！共作答 <b>${count}</b> 题，平均三维偏差 <b>${meanMm} mm</b>，平均分 <b>${meanScore}</b>。可导出 CSV 并导入教师端汇总班级薄弱穴位。`;
  renderLocator3D();
  setHud("EXAM COMPLETED", `本轮均分 ${meanScore} · 均差 ${meanMm} mm`, "可导出本机 CSV 送入教师端开展班级薄弱穴位统计。");
}

function renderExamStats() {
  const n = examRecords.length;
  if (ui.examDone) ui.examDone.textContent = `${n} / ${examQueue.length || 5}`;
  if (ui.examMeanMm) {
    ui.examMeanMm.textContent = n ? `${(examRecords.reduce((a, r) => a + r.distMm, 0) / n).toFixed(1)} mm` : "—";
  }
  if (ui.examMeanScore) {
    ui.examMeanScore.textContent = n ? `${Math.round(examRecords.reduce((a, r) => a + r.score, 0) / n)} 分` : "—";
  }
  if (ui.examHistory) {
    ui.examHistory.innerHTML = examRecords
      .map(r => `<li><b>${r.name} (${r.code})</b>：偏差 ${r.distMm} mm · ${r.score} 分（${r.grade}）</li>`)
      .join("");
  }
}

function exportExamCsv() {
  if (!examRecords.length) return;
  const header = "timestamp,acupoint_code,acupoint_name,meridian,region,error_mm,score,grade,sex,height_cm";
  const ts = new Date().toISOString();
  const rows = examRecords.map(r => [
    ts, r.code, r.name, r.meridian, r.region, r.distMm, r.score, r.grade, r.sex, r.heightCm,
  ].join(","));
  downloadText(`luoxiang_acupoint_exam_${Date.now()}.csv`, [header, ...rows].join("\n"));
}

/* ============================================================
 * 3. 中医五层知识图谱（分层 SVG + 点击联动 3D）
 * ============================================================ */
function renderKnowledgeGraph(activeId = "cls_weiqi") {
  if (!ui.kgSvg) return;
  const stats = getKgStats();
  if (ui.kgStatsTag) ui.kgStatsTag.textContent = `${stats.nodeCount} 节点 · ${stats.edgeCount} 边`;

  const cols = ["classic", "organ", "meridian", "acupoint", "herb"];
  const colX = { classic: 42, organ: 118, meridian: 195, acupoint: 272, herb: 348 };
  const coords = new Map();

  for (const col of cols) {
    const items = KG_NODES.filter(n => n.type === col);
    const step = 318 / Math.max(1, items.length);
    items.forEach((n, idx) => {
      coords.set(n.id, { x: colX[col], y: 34 + step * (idx + 0.5) });
    });
  }

  const neighborIds = new Set([activeId]);
  KG_EDGES.forEach(e => {
    if (e.from === activeId) neighborIds.add(e.to);
    if (e.to === activeId) neighborIds.add(e.from);
  });

  const svgNS = "http://www.w3.org/2000/svg";
  ui.kgSvg.innerHTML = "";

  // Column headers
  cols.forEach(c => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", String(colX[c]));
    t.setAttribute("y", "16");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-size", "9");
    t.setAttribute("font-weight", "700");
    t.setAttribute("fill", KG_NODE_TYPES[c].color);
    t.textContent = KG_NODE_TYPES[c].label;
    ui.kgSvg.appendChild(t);
  });

  // Edges
  KG_EDGES.forEach(e => {
    const a = coords.get(e.from);
    const b = coords.get(e.to);
    if (!a || !b) return;
    const isHi = e.from === activeId || e.to === activeId;
    const path = document.createElementNS(svgNS, "path");
    const mx = (a.x + b.x) * 0.5;
    path.setAttribute("d", `M${a.x} ${a.y} C${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`);
    path.setAttribute("class", `kg-edge${isHi ? " is-hi" : " is-dim"}`);
    ui.kgSvg.appendChild(path);
  });

  // Nodes
  KG_NODES.forEach(n => {
    const c = coords.get(n.id);
    if (!c) return;
    const meta = KG_NODE_TYPES[n.type];
    const g = document.createElementNS(svgNS, "g");
    const isAct = n.id === activeId;
    const isNear = neighborIds.has(n.id);
    g.setAttribute("class", `kg-node${isAct ? " is-active" : ""}${!isNear ? " is-dim" : ""}`);
    g.setAttribute("transform", `translate(${c.x} ${c.y})`);

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", "-32");
    rect.setAttribute("y", "-12");
    rect.setAttribute("width", "64");
    rect.setAttribute("height", "24");
    rect.setAttribute("fill", isAct ? meta.color : meta.bg);
    rect.setAttribute("stroke", meta.color);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("y", "3");
    if (isAct) label.setAttribute("fill", "#ffffff");
    const shortLabel = n.label.replace(/（.*?）/g, "").replace(/《|》/g, "").slice(0, 6);
    label.textContent = shortLabel;

    g.append(rect, label);
    g.addEventListener("click", () => selectKgNode(n.id));
    ui.kgSvg.appendChild(g);
  });
}

function selectKgNode(nodeId) {
  const node = KG_NODES.find(n => n.id === nodeId);
  if (!node) return;
  renderKnowledgeGraph(nodeId);

  const meta = KG_NODE_TYPES[node.type];
  if (ui.kgDetailTitle) ui.kgDetailTitle.textContent = node.label;
  if (ui.kgDetailType) ui.kgDetailType.textContent = meta.label;
  if (ui.kgDetailSummary) ui.kgDetailSummary.textContent = node.summary;

  if (ui.kgNeighbors) {
    ui.kgNeighbors.innerHTML = "";
    for (const nb of getNodeNeighbors(nodeId)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kg-nb-pill";
      btn.textContent = `${nb.rel} → ${nb.node.label.replace(/（.*?）/g, "")}`;
      btn.addEventListener("click", () => selectKgNode(nb.node.id));
      ui.kgNeighbors.appendChild(btn);
    }
  }

  if (ui.kgDetailLink) {
    if (node.link) {
      ui.kgDetailLink.hidden = false;
      ui.kgDetailLink.innerHTML = `<a href="${node.link}">前往关联专题页面核验 ↗</a>`;
    } else {
      ui.kgDetailLink.hidden = true;
    }
  }

  // 联动 3D
  if (scene && node.target) {
    scene.setDayNight(node.target.mode === "night" ? "night" : "day");
    scene.setAffected(node.target.organs || [], node.target.meridians || []);
    if (node.target.acupoint) {
      focusAcupoint(node.target.acupoint);
    } else if (node.target.organs?.[0]) {
      scene.focusOrgan(node.target.organs[0]);
      setHud("KNOWLEDGE GRAPH", `图谱联动：${node.label}`, node.summary);
    }
  }
}

/* ============================================================
 * 4. 本地离线可溯源问答联动 3D
 * ============================================================ */
function initQaPresets() {
  if (!ui.qaPresets) return;
  ui.qaPresets.innerHTML = "";
  PRESET_QUESTIONS.forEach(q => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qa-chip";
    btn.textContent = q;
    btn.addEventListener("click", () => {
      if (ui.qaInput) ui.qaInput.value = q;
      runQa(q);
    });
    ui.qaPresets.appendChild(btn);
  });
}

function stopQaSequence() {
  if (qaSeqTimer) clearInterval(qaSeqTimer);
  qaSeqTimer = 0;
}

function runQa(text) {
  stopQaSequence();
  const res = queryLocalQA(text);
  if (!res.ok) return;

  ui.qaResult.hidden = false;
  ui.qaResult.classList.toggle("is-blocked", !!res.blocked);
  ui.qaResTitle.textContent = res.blocked ? "合规边界拦截" : (res.question || text);
  ui.qaResBadge.textContent = res.blocked ? "非诊疗边界" : (res.confidence ? `本地溯源 · ${Math.round(res.confidence * 100)}%` : "未命中");
  ui.qaResAnswer.textContent = res.answer;
  ui.qaResQuote.textContent = res.quote || "";
  ui.qaResQuote.hidden = !res.quote;
  ui.qaResSource.textContent = res.source ? `出处：${res.source}` : "";
  ui.qaResAction.textContent = res.actionLabel || "";
  if (res.link) {
    ui.qaResLink.hidden = false;
    ui.qaResLink.innerHTML = `<a href="${res.link.href}">${res.link.text}</a>`;
  } else {
    ui.qaResLink.hidden = true;
  }

  // 触发 3D 联动
  if (!scene || !res.action) return;
  const act = res.action;
  scene.setDayNight(act.night ? "night" : "day");
  if (act.type === "weiqi_night") {
    const seq = [
      { organ: "Kidneys", mer: "KI", label: "① 卫气始注于肾（足少阴）" },
      { organ: "Heart",   mer: "HT", label: "② 肾注于心（手少阴）" },
      { organ: "Lungs",   mer: "LU", label: "③ 心注于肺（手太阴）" },
      { organ: "Liver",   mer: "LR", label: "④ 肺注于肝（足厥阴）" },
      { organ: "Spleen",  mer: "SP", label: "⑤ 肝注于脾（复归于肾）" },
    ];
    let step = 0;
    const playStep = () => {
      const s = seq[step % seq.length];
      scene.setAffected([s.organ], [s.mer]);
      setHud("QA → 3D 联动播放", `《灵枢·卫气行》夜入五脏`, s.label);
      step += 1;
    };
    playStep();
    qaSeqTimer = setInterval(playStep, 1800);
  } else if (act.type === "acupoint" && act.acupointId) {
    focusAcupoint(act.acupointId);
  } else {
    scene.setAffected(act.organs || [], act.meridians || []);
    if (act.focusOrgan) scene.focusOrgan(act.focusOrgan);
    setHud("QA → 3D 联动", res.question || text, res.actionLabel || "");
  }
}

/* ============================================================
 * UI 绑定 & 性能监控（首屏加载耗时 + 实时 FPS）
 * ============================================================ */
function switchTab(id) {
  activeTab = id;
  stopQaSequence();
  document.querySelectorAll("[data-lab-tab]").forEach(t => {
    t.setAttribute("aria-selected", String(t.dataset.labTab === id));
  });
  document.querySelectorAll("[data-lab-panel]").forEach(p => {
    p.hidden = p.dataset.labPanel !== id;
  });

  const titles = {
    locator: ["骨度分寸体表定位 · 三维实景验证", "定位视图"],
    exam:    ["3D 交互式点穴考核 · 毫米偏差评分", "点穴考核"],
    kg:      ["中医五层知识图谱 · 节点 3D 联动", "图谱视图"],
    qa:      ["本地可溯源教学问答 · 3D 路径联动", "溯源问答"],
  };
  const [title, chip] = titles[id] || titles.locator;
  if (ui.stageTitle) ui.stageTitle.textContent = title;
  if (ui.stageModeChip) ui.stageModeChip.textContent = chip;

  ui.canvasWrap.classList.toggle("is-exam-cursor", id === "exam" && examActive);
  renderLocator3D();
  if (id === "kg") renderKnowledgeGraph("cls_weiqi");
}

function startFpsMonitor() {
  let frames = 0;
  let last = performance.now();
  const loop = now => {
    frames += 1;
    if (now - last >= 1000) {
      const fps = Math.round((frames * 1000) / (now - last));
      if (ui.fpsChip) ui.fpsChip.textContent = `FPS ${fps}`;
      frames = 0;
      last = now;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function bindEvents() {
  document.querySelectorAll("[data-lab-tab]").forEach(t => {
    t.addEventListener("click", () => switchTab(t.dataset.labTab));
  });

  ui.paramHeight?.addEventListener("input", runBoneCunSolver);
  ui.paramBuild?.addEventListener("input", runBoneCunSolver);
  ui.btnLandmarks?.addEventListener("click", () => {
    showLandmarks = !showLandmarks;
    ui.btnLandmarks.classList.toggle("is-on", showLandmarks);
    renderLocator3D();
  });
  ui.btnExportAcu?.addEventListener("click", exportAcupointsCsv);

  // Exam events
  ui.btnExamStart?.addEventListener("click", startExam);
  ui.btnExamHint?.addEventListener("click", () => {
    if (ui.examQHint) ui.examQHint.hidden = !ui.examQHint.hidden;
  });
  ui.btnExamNext?.addEventListener("click", () => {
    examIndex += 1;
    renderExamQuestion();
  });
  ui.btnExamSkip?.addEventListener("click", () => {
    examIndex += 1;
    renderExamQuestion();
  });
  ui.btnExportExam?.addEventListener("click", exportExamCsv);

  // Distinguish drag-orbit vs tap/click on 3D canvas for acupoint exam
  let downPos = null;
  ui.canvasWrap?.addEventListener("pointerdown", e => {
    downPos = { x: e.clientX, y: e.clientY };
  });
  ui.canvasWrap?.addEventListener("pointerup", e => {
    if (!downPos) return;
    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    downPos = null;
    if (dist < 7 && activeTab === "exam" && examActive) {
      handleExamClick(e.clientX, e.clientY);
    }
  });

  // QA events
  ui.qaForm?.addEventListener("submit", e => {
    e.preventDefault();
    runQa(ui.qaInput?.value || "");
  });

  // Stage tools
  $("btn-sex-male")?.addEventListener("click", () => changeSex("male"));
  $("btn-sex-female")?.addEventListener("click", () => changeSex("female"));
  $("btn-mode-real")?.addEventListener("click", () => applyMode("real"));
  $("btn-mode-holo")?.addEventListener("click", () => applyMode("holo"));
  $("btn-view-front")?.addEventListener("click", () => scene?.setCameraPreset("front", true));
  $("btn-view-back")?.addEventListener("click", () => scene?.setCameraPreset("back", true));
  $("btn-view-reset")?.addEventListener("click", () => scene?.resetView());
  $("btn-rotate")?.addEventListener("click", e => {
    if (!scene) return;
    scene.controls.autoRotate = !scene.controls.autoRotate;
    e.currentTarget.classList.toggle("is-on", scene.controls.autoRotate);
  });
}

function applyMode(mode) {
  visualMode = mode === "holo" ? "holo" : "real";
  if (scene) {
    scene.setVisualMode(visualMode);
    scene.setLayers({
      skin: true, organs: true, skeleton: visualMode === "holo",
      meridians: true, vessels: false, flow: true, clock: false, taiji: false,
    });
    scene.setSkinOpacity(visualMode === "real" ? 0.16 : 0.10);
  }
  $("btn-mode-real")?.classList.toggle("is-on", visualMode === "real");
  $("btn-mode-holo")?.classList.toggle("is-on", visualMode === "holo");
}

async function changeSex(next) {
  if (!scene || next === sex) return;
  const ok = await scene.setSex(next);
  if (!ok) return;
  sex = next;
  $("btn-sex-male")?.classList.toggle("is-on", sex === "male");
  $("btn-sex-female")?.classList.toggle("is-on", sex === "female");
  if (ui.paramHeight) ui.paramHeight.value = sex === "female" ? "162" : "172";
  applyMode(visualMode);
  runBoneCunSolver();
}

async function boot() {
  const t0 = performance.now();
  initQaPresets();
  bindEvents();
  renderKnowledgeGraph("cls_weiqi");

  scene = new TCMScene3D(ui.canvasWrap, $("labels"), ui.loadingText);
  try {
    await scene.init();
    scene.controls.autoRotate = false;
    scene.setState(NORMAL_STATE, [], []);
    applyMode("real");

    locatorGroup = new THREE.Group();
    landmarkGroup = new THREE.Group();
    examOverlayGroup = new THREE.Group();
    scene.scene.add(locatorGroup, landmarkGroup, examOverlayGroup);

    runBoneCunSolver();
    focusAcupoint("ST36");

    const loadMs = Math.round(performance.now() - t0);
    if (ui.perfPill) ui.perfPill.innerHTML = `<i></i>本地离线 · 首屏 ${loadMs} ms`;

    ui.loading.classList.add("is-hidden");
    setTimeout(() => ui.loading.remove(), 450);
    startFpsMonitor();
    window.__labScene = scene;
  } catch (err) {
    console.error(err);
    ui.loadingText.textContent = "3D 模型加载失败；请通过本地 HTTP 服务打开。";
  }
}

boot();
