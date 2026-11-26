// 数据推演：把队友提供的 CSV/JSON 时序数据映射到 3D 阴阳气血与经络。
// 纯前端解析，不上传文件；数据来源/许可由导入者在文件中声明。

import { TCMScene3D } from "./scene3d.js?v=20261126award";
import { ORGAN_META, MERIDIAN_NAMES, ZANG_KEYS, NORMAL_STATE, lerpState, clamp } from "./knowledge.js?v=20261107defense";
import { isHerbReference } from "./herb-catalog.mjs?v=20261108herbs";

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_CASES = 50;
const MAX_POINTS = 2000;
// A recognized reference file is a user-facing format mismatch, not a runtime fault.
class HerbReferenceError extends Error {}

const $ = (id) => document.getElementById(id);
const ui = {
  fileInput: $("file-input"),
  btnPick: $("btn-pick"),
  btnDemo: $("btn-demo"),
  dropZone: $("drop-zone"),
  importStatus: $("import-status"),
  metaCard: $("meta-card"),
  metaList: $("meta-list"),
  metaLicenseTag: $("meta-license-tag"),
  metaWarnings: $("meta-warnings"),
  caseList: $("case-list"),
  caseCount: $("case-count"),
  caseCard: $("case-card"),
  caseSourceTag: $("case-source-tag"),
  caseDetail: $("case-detail"),
  chartCard: $("chart-card"),
  chart: $("series-chart"),
  btnChartView: $("btn-chart-view"),
  btnTableView: $("btn-table-view"),
  seriesTableWrap: $("series-table-wrap"),
  seriesTable: $("series-table"),
  timelineCase: $("timeline-case"),
  timelineProvenance: $("timeline-provenance"),
  dayLabel: $("day-label"),
  daySlider: $("day-slider"),
  eventStrip: $("event-strip"),
  eventLabel: $("event-label"),
  timelineNote: $("timeline-note"),
  btnFirst: $("btn-first"),
  btnPlay: $("btn-play"),
  btnLast: $("btn-last"),
  viewState: $("view-state"),
  dataBadge: $("data-badge"),
  skinOpacity: $("skin-opacity"),
  skinOpacityValue: $("skin-opacity-value"),
  layerToggles: $("layer-toggles"),
  loading: $("loading"),
  loadingText: $("loading-text"),
  labels: $("labels"),
  btnSexMale: $("btn-sex-male"), btnSexFemale: $("btn-sex-female"),
};

const HEADER_MAP = {
  datasetname: "dataset_name", "数据名称": "dataset_name", "数据集名称": "dataset_name",
  contributor: "contributor", "提供者": "contributor", "数据提供者": "contributor", "队友": "contributor",
  source: "source", "来源": "source", "数据来源": "source",
  license: "license", "许可": "license", "授权": "license",
  caseid: "case_id", "案例编号": "case_id", "病例编号": "case_id", "编号": "case_id",
  casename: "case_name", "案例名称": "case_name", "病例名称": "case_name",
  pattern: "pattern", "证候": "pattern", "证型": "pattern",
  formula: "formula", "方剂": "formula", "方药": "formula", "经典方": "formula",
  organs: "organs", "脏腑": "organs", "器官": "organs",
  meridians: "meridians", "经络": "meridians",
  day: "day", "天数": "day", "时间": "day", "日": "day", time: "day",
  yin: "yin", "阴": "yin", "阴气": "yin",
  yang: "yang", "阳": "yang", "阳气": "yang",
  qi: "qi", "气": "qi", "气机": "qi",
  blood: "blood", "血": "blood", "血行": "blood",
  stagnation: "stagnation", "瘀滞": "stagnation", "瘀": "stagnation",
  inflammation: "inflammation", "炎症": "inflammation", "热": "inflammation", "虚火": "inflammation",
  blockedmeridian: "blocked_meridian", "阻滞经络": "blocked_meridian", "病位经络": "blocked_meridian",
  event: "event", "事件": "event",
  medication: "medication", "用药": "medication", "方药事件": "medication", "药物": "medication",
  note: "note", "备注": "note", "说明": "note",
  isdemo: "is_demo", "是否演示": "is_demo",
};

const ORGAN_ALIASES = {
  "心": "Heart", "肝": "Liver", "脾": "Spleen", "肺": "Lungs", "肾": "Kidneys",
  "胃": "Stomach", "小肠": "SmallIntestine", "大肠": "LargeIntestine", "胆": "Gallbladder",
  "胆囊": "Gallbladder", "膀胱": "Bladder", "胰": "Pancreas", "脑": "Brain",
  "气管": "Trachea", "支气管": "Airways",
};

const MERIDIAN_ALIASES = (() => {
  const out = {};
  Object.entries(MERIDIAN_NAMES).forEach(([code, name]) => {
    out[code] = code;
    out[name] = code;
  });
  Object.assign(out, {
    "肺经": "LU", "大肠经": "LI", "胃经": "ST", "脾经": "SP", "心经": "HT", "小肠经": "SI",
    "膀胱经": "BL", "肾经": "KI", "心包经": "PC", "三焦经": "TE", "胆经": "GB", "肝经": "LR",
    "任脉": "REN", "督脉": "DU",
  });
  return out;
})();

const LAYER_DEFS = [
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

let scene = null;
let dataset = null;
let currentCase = null;
let currentCaseIndex = -1;
let currentDay = 0;
let playing = false;
let playRaf = 0;
let chartDragging = false;
let dataView = "chart";
let visualMode = "real";
let sex = "male";
let sexLoading = false;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function num(value, fallback) {
  const cleaned = text(value).replace(/[%％]/g, "");
  if (cleaned === "") return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function formatDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function normKey(key) {
  return text(key).toLowerCase().replace(/[\s_\-/()（）]/g, "");
}

function canonicalKey(key) {
  const normalized = normKey(key);
  return HEADER_MAP[normalized] || normalized;
}

function canonicalRecord(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  Object.entries(raw).forEach(([key, value]) => {
    const k = canonicalKey(key);
    if (!(k in out) || text(out[k]) === "") out[k] = value;
  });
  return out;
}

function parseList(value) {
  return unique(text(value).split(/[|;；,，、\n]+/).map((x) => x.trim()).filter(Boolean));
}

function normalizeOrgan(value) {
  const s = text(value);
  if (!s) return "";
  if (ORGAN_META[s]) return s;
  return ORGAN_ALIASES[s] || "";
}

function normalizeMeridian(value) {
  const s = text(value).toUpperCase();
  if (!s) return "";
  if (MERIDIAN_NAMES[s]) return s;
  return MERIDIAN_ALIASES[s] || MERIDIAN_ALIASES[text(value)] || "";
}

function setStatus(message, type = "") {
  ui.importStatus.textContent = message;
  ui.importStatus.className = `import-status${type ? ` is-${type}` : ""}`;
}

function detectDelimiter(textValue) {
  const firstLine = textValue.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim() !== "") || "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (let i = 0; i < firstLine.length; i += 1) {
    const ch = firstLine[i];
    if (ch === '"') {
      if (quoted && firstLine[i + 1] === '"') i += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && counts[ch] !== undefined) counts[ch] += 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCsv(textValue, delimiter = ",") {
  const textData = textValue.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < textData.length; i += 1) {
    const ch = textData[i];
    if (quoted) {
      if (ch === '"') {
        if (textData[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
}

// ---------- 数据规范化 ----------

function normalizePoint(raw, index, warnings, caseId, missingSeen) {
  const r = canonicalRecord(raw);
  const dayText = text(r.day);
  let day = num(r.day, index);
  if (dayText === "") {
    if (!missingSeen.has("day")) {
      warnings.push(`${caseId}：缺少 day 字段，已按行号作为天数；建议补充 0–28 天。`);
      missingSeen.add("day");
    }
  }
  if (!Number.isFinite(day)) day = index;
  if (day < 0) warnings.push(`${caseId}：存在负天数 ${day}，请检查。`);

  const readMetric = (value, fallback, max, label) => {
    const rawText = text(value);
    if (rawText === "") return fallback;
    const explicitPercent = /[%％]/.test(rawText);
    let n = Number(rawText.replace(/[%％]/g, ""));
    if (!Number.isFinite(n)) {
      if (!missingSeen.has(`range-${label}`)) {
        warnings.push(`${caseId}：${label} 不是数字（${rawText}），已用默认值；请核对。`);
        missingSeen.add(`range-${label}`);
      }
      return fallback;
    }
    const original = n;
    if (explicitPercent) n /= 100;
    else if (n > 10 && n <= 100) n /= 100;
    if (n < 0 || n > max) {
      if (!missingSeen.has(`range-${label}`)) {
        warnings.push(`${caseId}：${label} 原始值 ${original} 超出 0–${max}，已截断显示；请核对（支持 0–100 百分数）。`);
        missingSeen.add(`range-${label}`);
      }
    }
    return clamp(n, 0, max);
  };

  if (text(r.yin) === "" && text(r.yang) === "") {
    if (!missingSeen.has("yinyang")) {
      warnings.push(`${caseId}：缺少阴/阳字段，已用默认 0.5/0.5；这会影响 3D 与曲线解释。`);
      missingSeen.add("yinyang");
    }
  }
  if (text(r.qi) === "" || text(r.blood) === "") {
    if (!missingSeen.has("qiblood")) {
      warnings.push(`${caseId}：缺少气/血字段，已用默认 1.0；请让数据提供者补齐。`);
      missingSeen.add("qiblood");
    }
  }

  const yin = readMetric(r.yin, 0.5, 1, "yin/阴");
  const yang = readMetric(r.yang, 0.5, 1, "yang/阳");
  const qi = readMetric(r.qi, 1, 1.2, "qi/气");
  const blood = readMetric(r.blood, 1, 1.2, "blood/血");
  const stagnation = readMetric(r.stagnation, 0, 1, "stagnation/瘀滞");
  const inflammation = readMetric(r.inflammation, 0, 1, "inflammation/炎症");

  const blockedRaw = text(r.blocked_meridian);
  const blockedMeridian = normalizeMeridian(blockedRaw);
  if (blockedRaw && !blockedMeridian) {
    warnings.push(`${caseId}：未知阻滞经络「${blockedRaw}」；请使用 KI/DU/LR 等代码或标准中文名。`);
  }

  const organRaw = parseList(r.organs);
  let organs = organRaw.map(normalizeOrgan).filter(Boolean);
  const badOrgans = organRaw.filter((x) => !normalizeOrgan(x));
  if (badOrgans.length) warnings.push(`${caseId}：未知脏腑「${badOrgans.join("、")}」已忽略。`);

  const meridianRaw = parseList(r.meridians);
  let meridians = meridianRaw.map(normalizeMeridian).filter(Boolean);
  const badMeridians = meridianRaw.filter((x) => !normalizeMeridian(x));
  if (badMeridians.length) warnings.push(`${caseId}：未知经络「${badMeridians.join("、")}」已忽略。`);

  if (!meridians.length && blockedMeridian) meridians = [blockedMeridian];
  if (!organs.length && blockedMeridian) {
    organs = Object.keys(ORGAN_META).filter((key) => ORGAN_META[key].meridian === blockedMeridian);
  }
  if (!organs.length && meridians.length) {
    organs = unique(meridians.map((m) => ZANG_KEYS.find((key) => ORGAN_META[key].meridian === m)));
  }
  if (!meridians.length && organs.length) {
    meridians = unique(organs.map((key) => ORGAN_META[key]?.meridian));
  }

  const medication = text(r.medication);
  if (/\d+(\.\d+)?\s*(mg|g|ml|克|毫克|毫升)/i.test(medication)) {
    warnings.push(`${caseId}：用药字段疑似含剂量「${medication}」，教学展示建议只保留方名。`);
  }

  return {
    day,
    yin,
    yang,
    qi,
    blood,
    stagnation,
    inflammation,
    blockedMeridian,
    organs: unique(organs),
    meridians: unique(meridians),
    event: text(r.event),
    medication,
    note: text(r.note),
  };
}

function normalizeCase(raw, index, globalMeta, warnings) {
  const r = canonicalRecord(raw);
  const caseId = text(r.case_id) || text(r.case_name) || `CASE-${String(index + 1).padStart(3, "0")}`;
  if (!text(r.case_id)) warnings.push(`${caseId}：缺少 case_id，已自动编号；建议为每个案例分配匿名编号。`);

  const seriesRaw = Array.isArray(raw?.series)
    ? raw.series
    : Array.isArray(raw?.points)
      ? raw.points
      : Array.isArray(raw?.data)
        ? raw.data
        : (text(r.day) !== "" || text(r.yin) !== "" || text(r.yang) !== "")
          ? [raw]
          : [];

  if (!Array.isArray(seriesRaw) || seriesRaw.length === 0) {
    warnings.push(`${caseId}：没有可用的时序数据点，已跳过。`);
    return null;
  }
  if (seriesRaw.length > MAX_POINTS) {
    warnings.push(`${caseId}：数据点超过 ${MAX_POINTS} 个，已截断；建议先聚合到关键时间点。`);
  }

  const missingSeen = new Set();
  const points = seriesRaw.slice(0, MAX_POINTS)
    .map((point, i) => normalizePoint(point, i, warnings, caseId, missingSeen))
    .sort((a, b) => a.day - b.day);

  const byDay = new Map();
  points.forEach((point) => {
    if (byDay.has(point.day)) {
      warnings.push(`${caseId}：第 ${formatDay(point.day)} 天重复，保留后一条记录。`);
    }
    byDay.set(point.day, point);
  });
  const series = [...byDay.values()].sort((a, b) => a.day - b.day);
  if (!series.length) {
    warnings.push(`${caseId}：清洗后没有有效数据点，已跳过。`);
    return null;
  }

  const rawCaseOrgans = parseList(r.organs);
  const badCaseOrgans = rawCaseOrgans.filter((x) => !normalizeOrgan(x));
  if (badCaseOrgans.length) warnings.push(`${caseId}：案例级未知脏腑「${badCaseOrgans.join("、")}」已忽略。`);
  const rawCaseMeridians = parseList(r.meridians);
  const badCaseMeridians = rawCaseMeridians.filter((x) => !normalizeMeridian(x));
  if (badCaseMeridians.length) warnings.push(`${caseId}：案例级未知经络「${badCaseMeridians.join("、")}」已忽略。`);

  const caseOrgans = unique(rawCaseOrgans.map(normalizeOrgan).filter(Boolean));
  const caseMeridians = unique(rawCaseMeridians.map(normalizeMeridian).filter(Boolean));
  const organs = unique(caseOrgans.length ? caseOrgans : series.flatMap((p) => p.organs));
  const meridians = unique(caseMeridians.length ? caseMeridians : series.flatMap((p) => p.meridians));
  const days = series.map((p) => p.day);

  const source = text(r.source) || text(globalMeta.source);
  const license = text(r.license) || text(globalMeta.license);
  const note = text(r.note);
  const isDemo = Boolean(globalMeta.is_demo)
    || /demo|演示|示例/i.test(`${globalMeta.dataset_name || ""} ${source} ${license} ${note} ${caseId}`);

  return {
    case_id: caseId,
    case_name: text(r.case_name) || text(raw?.name) || caseId,
    pattern: text(r.pattern) || "导入案例",
    formula: text(r.formula),
    organs,
    meridians,
    series,
    startDay: Math.min(0, ...days),
    endDay: Math.max(0, ...days),
    source,
    license,
    note,
    isDemo,
    events: series.filter((p) => p.event || p.medication).map((p) => ({
      day: p.day,
      event: p.event,
      medication: p.medication,
    })),
  };
}

function firstNonEmpty(records, key) {
  const hit = records.find((rec) => text(rec[key]) !== "");
  return hit ? hit[key] : "";
}

function normalizeRecords(records, globalMeta, warnings) {
  const groups = new Map();
  records.forEach((rec) => {
    const cid = text(rec.case_id) || text(rec.case_name) || "CASE-001";
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid).push(rec);
  });
  if (!records.some((rec) => text(rec.case_id))) {
    warnings.push("缺少 case_id：已按案例名/默认编号分组；多案例数据请补充匿名编号。");
  }

  const rawCases = [];
  let index = 0;
  groups.forEach((group, cid) => {
    rawCases.push({
      case_id: cid,
      case_name: firstNonEmpty(group, "case_name") || cid,
      pattern: firstNonEmpty(group, "pattern"),
      formula: firstNonEmpty(group, "formula"),
      organs: firstNonEmpty(group, "organs"),
      meridians: firstNonEmpty(group, "meridians"),
      source: firstNonEmpty(group, "source") || text(globalMeta.source),
      license: firstNonEmpty(group, "license") || text(globalMeta.license),
      note: firstNonEmpty(group, "note"),
      series: group,
    });
    index += 1;
  });
  return rawCases;
}

function buildDataset(cases, globalMeta, warnings, filename) {
  const clean = cases.filter(Boolean);
  if (!clean.length) {
    throw new Error("没有可用案例。请检查 case_id、day、yin/yang 等字段。");
  }
  if (clean.length > MAX_CASES) {
    warnings.push(`案例数超过 ${MAX_CASES} 个，只显示前 ${MAX_CASES} 个。`);
  }
  const kept = clean.slice(0, MAX_CASES);
  const pointCount = kept.reduce((sum, c) => sum + c.series.length, 0);
  const allDays = kept.flatMap((c) => c.series.map((p) => p.day));
  const datasetName = text(globalMeta.dataset_name) || filename || "未命名数据集";
  const caseSource = kept.find((c) => c.source)?.source || "";
  const caseLicense = kept.find((c) => c.license)?.license || "";
  const isDemo = Boolean(globalMeta.is_demo)
    || kept.some((c) => c.isDemo)
    || /demo|演示|示例/i.test(`${datasetName} ${text(globalMeta.source)} ${text(globalMeta.license)} ${filename}`);
  const meta = {
    dataset_name: datasetName,
    contributor: text(globalMeta.contributor) || "未提供",
    source: text(globalMeta.source) || caseSource || "未提供",
    license: text(globalMeta.license) || caseLicense || "未提供",
    notes: text(globalMeta.notes) || "",
    filename: filename || "",
    case_count: kept.length,
    point_count: pointCount,
    day_min: allDays.length ? Math.min(...allDays) : 0,
    day_max: allDays.length ? Math.max(...allDays) : 0,
    is_demo: isDemo,
    format: text(globalMeta.format) || "CSV",
    delimiter: globalMeta.delimiter === undefined || globalMeta.delimiter === null ? "," : String(globalMeta.delimiter),
  };
  return { meta, cases: kept, warnings: unique(warnings) };
}

function parseDataset(textValue, filename) {
  const trimmed = String(textValue || "").trim();
  if (!trimmed) throw new Error("文件为空。");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let data;
    try { data = JSON.parse(trimmed); }
    catch (err) { throw new Error(`JSON 解析失败：${err.message}`); }
    if (isHerbReference(data)) throw new HerbReferenceError("这是药材资料，不是按天变化的案例数据。请打开“药材资料”（herbs.html）检索；时序推演请使用 CSV 模板。");
    const warnings = [];
    const globalMeta = canonicalRecord(data.meta || {});
    globalMeta.format = "JSON";
    if (!text(globalMeta.dataset_name)) globalMeta.dataset_name = filename || "未命名数据集";
    if (Array.isArray(data.rows)) {
      const records = data.rows.map(canonicalRecord);
      return buildDataset(normalizeRecords(records, globalMeta, warnings).map((raw, i) => normalizeCase(raw, i, globalMeta, warnings)), globalMeta, warnings, filename);
    }
    const rawCases = Array.isArray(data) ? data
      : Array.isArray(data.cases) ? data.cases
        : (Array.isArray(data.series) || Array.isArray(data.points) || text(data.day) !== "" || text(data.yin) !== "")
          ? [data]
          : [];
    return buildDataset(rawCases.map((raw, i) => normalizeCase(raw, i, globalMeta, warnings)), globalMeta, warnings, filename);
  }

  if (isHerbReference(trimmed)) throw new HerbReferenceError("这是药材资料，不是按天变化的案例数据。请打开“药材资料”（herbs.html）检索；时序推演请使用 CSV 模板。");
  const delimiter = filename.toLowerCase().endsWith(".tsv") ? "\t" : detectDelimiter(trimmed);
  const rows = parseCsv(trimmed, delimiter);
  if (rows.length < 2) throw new Error("CSV 至少需要表头和一行数据。");
  const header = rows[0].map(canonicalKey);
  const warnings = [];
  if (!header.includes("day")) warnings.push("CSV 缺少 day 列；将按行号作为天数。");
  if (!header.includes("case_id")) warnings.push("CSV 缺少 case_id 列；多案例数据会被合并。");
  const records = rows.slice(1).map((cells, i) => {
    const obj = { __row: i + 2 };
    header.forEach((key, j) => { obj[key] = cells[j] ?? ""; });
    return obj;
  }).filter((rec) => Object.entries(rec).some(([k, v]) => k !== "__row" && text(v) !== ""));

  const globalMeta = {
    dataset_name: firstNonEmpty(records, "dataset_name") || filename || "未命名数据集",
    contributor: firstNonEmpty(records, "contributor"),
    source: firstNonEmpty(records, "source"),
    license: firstNonEmpty(records, "license"),
    notes: firstNonEmpty(records, "note"),
    format: "CSV",
    delimiter,
  };
  const rawCases = normalizeRecords(records, globalMeta, warnings);
  return buildDataset(rawCases.map((raw, i) => normalizeCase(raw, i, globalMeta, warnings)), globalMeta, warnings, filename);
}

// ---------- 渲染 ----------

const CHART = { w: 360, h: 170, left: 30, right: 8, top: 10, bottom: 22 };

function renderMeta(ds) {
  const meta = ds.meta;
  const rows = [
    ["数据名称", meta.dataset_name],
    ["提供者", meta.contributor],
    ["来源", meta.source],
    ["许可", meta.license],
    ["规模", `${meta.case_count} 个案例 · ${meta.point_count} 个数据点`],
    ["时间", `${formatDay(meta.day_min)} – ${formatDay(meta.day_max)} 天`],
    ["格式", meta.format === "JSON"
      ? "JSON"
      : `CSV · ${meta.delimiter === "\t" ? "Tab" : meta.delimiter === ";" ? "分号" : "逗号"}分隔`],
    ["文件", meta.filename || "—"],
  ];
  ui.metaList.innerHTML = rows.map(([key, value]) =>
    `<div class="kv"><span>${esc(key)}</span><b>${esc(value)}</b></div>`).join("");
  ui.metaLicenseTag.textContent = meta.license === "未提供" ? "许可待补" : "已声明";
  ui.metaWarnings.innerHTML = ds.warnings.length
    ? `<ul>${ds.warnings.slice(0, 8).map((w) => `<li>${esc(w)}</li>`).join("")}${ds.warnings.length > 8 ? `<li>另有 ${ds.warnings.length - 8} 条提示</li>` : ""}</ul>`
    : "";
  ui.metaCard.hidden = false;
}

function renderCaseList(ds) {
  ui.caseCount.textContent = String(ds.cases.length);
  if (!ds.cases.length) {
    ui.caseList.innerHTML = '<p class="empty-hint">没有可用案例。</p>';
    return;
  }
  ui.caseList.innerHTML = ds.cases.map((c, i) => `
    <button class="case-item" type="button" data-index="${i}">
      <b>${esc(c.case_name)}</b>
      <small>${esc(c.pattern)} · ${c.series.length} 点 · ${formatDay(c.startDay)}–${formatDay(c.endDay)} 天</small>
    </button>
  `).join("");
  ui.caseList.querySelectorAll(".case-item").forEach((btn) => {
    btn.addEventListener("click", () => selectCase(Number(btn.dataset.index)));
  });
}

function renderCaseDetail(c) {
  const organTags = c.organs.length
    ? c.organs.map((key) => {
      const meta = ORGAN_META[key];
      return `<span class="org-tag" style="color:${meta.color};border-color:${meta.color}44">${esc(meta.zh)}</span>`;
    }).join("")
    : '<span class="empty-hint">未提供脏腑字段</span>';
  const meridianTags = c.meridians.length
    ? c.meridians.map((code) => `<span class="org-tag meridian">${esc(MERIDIAN_NAMES[code] || code)}</span>`).join("")
    : '<span class="empty-hint">未提供经络字段</span>';
  const events = c.events.length
    ? `<ul class="event-list">${c.events.map((e) => `<li>第 ${formatDay(e.day)} 天：${esc([e.event, e.medication].filter(Boolean).join(" · "))}</li>`).join("")}</ul>`
    : '<p class="empty-hint">未提供用药/事件字段。</p>';

  ui.caseDetail.innerHTML = `
    <div class="pattern-name">${esc(c.case_name)}</div>
    <div class="pattern-sub">${esc(c.pattern)}${c.formula ? ` · ${esc(c.formula)}` : ""}</div>
    <div class="detail-row"><span>脏腑</span><div class="tag-list">${organTags}</div></div>
    <div class="detail-row"><span>经络</span><div class="tag-list">${meridianTags}</div></div>
    <div class="detail-row"><span>用药</span><div>${events}</div></div>
    ${c.note ? `<p class="empty-hint">备注：${esc(c.note)}</p>` : ""}
  `;
  ui.caseSourceTag.textContent = c.license && c.license !== "未提供" ? "许可已声明" : "许可待补";
  ui.caseCard.hidden = false;
}

function renderEventStrip(c) {
  if (!c.events.length) {
    ui.eventStrip.innerHTML = "";
    return;
  }
  const span = Math.max(0.001, c.endDay - c.startDay);
  ui.eventStrip.innerHTML = c.events.map((e) => {
    const left = ((e.day - c.startDay) / span) * 100;
    const title = [e.event, e.medication].filter(Boolean).join(" · ");
    return `<i class="event-dot" data-day="${e.day}" style="left:${clamp(left, 0, 100)}%" title="${esc(`第 ${formatDay(e.day)} 天：${title}`)}"></i>`;
  }).join("");
}

function renderChart(c) {
  const W = CHART.w;
  const H = CHART.h;
  const left = CHART.left;
  const right = CHART.right;
  const top = CHART.top;
  const bottom = CHART.bottom;
  const start = c.startDay;
  const end = Math.max(c.startDay + 0.001, c.endDay);
  const values = c.series.flatMap((p) => [p.yin, p.yang, p.qi, p.blood, p.stagnation]);
  const maxY = Math.max(1.2, ...values);
  const x = (day) => left + ((day - start) / (end - start)) * (W - left - right);
  const y = (value) => top + (1 - clamp(value, 0, maxY) / maxY) * (H - top - bottom);

  const grid = [0, maxY / 2, maxY].map((v) =>
    `<line x1="${left}" y1="${y(v)}" x2="${W - right}" y2="${y(v)}" stroke="rgba(130,190,210,0.13)" stroke-width="1"/>` +
    `<text x="${left - 5}" y="${y(v) + 3}" fill="#536b7b" font-size="7" text-anchor="end">${v.toFixed(1)}</text>`
  ).join("");

  const xTicks = [start, (start + end) / 2, end].map((day, i) =>
    `<text x="${x(day)}" y="${H - 6}" fill="#536b7b" font-size="7" text-anchor="${i === 0 ? "start" : i === 2 ? "end" : "middle"}">${formatDay(day)}d</text>`
  ).join("");

  const eventLines = c.events.map((e) =>
    `<line x1="${x(e.day)}" y1="${top}" x2="${x(e.day)}" y2="${H - bottom}" stroke="#ffd27a" stroke-width="1" opacity="0.16"/>`
  ).join("");

  const seriesDefs = [
    ["yin", "#55d8ff"], ["yang", "#ffb36b"], ["qi", "#43d98b"],
    ["blood", "#ff6b7a"], ["stagnation", "#b06cff"],
  ];
  const lines = seriesDefs.map(([key, color]) => {
    if (c.series.length === 1) {
      const p = c.series[0];
      return `<circle cx="${x(p.day)}" cy="${y(p[key])}" r="2.5" fill="${color}"/>`;
    }
    const points = c.series.map((p) => `${x(p.day).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
    return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");

  ui.chart.innerHTML = `
    ${grid}${xTicks}${eventLines}${lines}
    <line id="chart-cursor" x1="${x(currentDay)}" y1="${top}" x2="${x(currentDay)}" y2="${H - bottom}" stroke="#eafcff" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>
  `;
  ui.chartCard.hidden = false;
}

function renderSeriesTable(c) {
  const tbody = ui.seriesTable?.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = c.series.map((p) => {
    const blocked = p.blockedMeridian ? (MERIDIAN_NAMES[p.blockedMeridian] || p.blockedMeridian) : "—";
    const event = [p.event, p.medication].filter(Boolean).join(" · ") || "—";
    return `<tr data-day="${p.day}">
      <td>${formatDay(p.day)}</td>
      <td>${p.yin.toFixed(2)}</td>
      <td>${p.yang.toFixed(2)}</td>
      <td>${p.qi.toFixed(2)}</td>
      <td>${p.blood.toFixed(2)}</td>
      <td>${p.stagnation.toFixed(2)}</td>
      <td>${p.inflammation.toFixed(2)}</td>
      <td>${esc(blocked)}</td>
      <td>${esc(event)}</td>
    </tr>`;
  }).join("");
}

function setDataView(view) {
  dataView = view === "table" ? "table" : "chart";
  const table = dataView === "table";
  ui.btnChartView?.classList.toggle("is-on", !table);
  ui.btnTableView?.classList.toggle("is-on", table);
  ui.btnChartView?.setAttribute("aria-pressed", String(!table));
  ui.btnTableView?.setAttribute("aria-pressed", String(table));
  if (ui.chart) ui.chart.hidden = table;
  if (ui.seriesTableWrap) ui.seriesTableWrap.hidden = !table;
  ui.chartCard?.classList.toggle("is-table", table);
  if (currentCase) renderSeriesTable(currentCase);
  ui.seriesTable?.querySelectorAll("tbody tr").forEach((row) => {
    row.classList.toggle("is-current", Math.abs(Number(row.dataset.day) - currentDay) < 0.15);
  });
}

function updateChartCursor(day) {
  const c = currentCase;
  if (!c) return;
  const cursor = $("chart-cursor");
  if (!cursor) return;
  const start = c.startDay;
  const end = Math.max(c.startDay + 0.001, c.endDay);
  const x = CHART.left + ((day - start) / (end - start)) * (CHART.w - CHART.left - CHART.right);
  cursor.setAttribute("x1", String(x));
  cursor.setAttribute("x2", String(x));
}

function updateMetrics(state) {
  const values = {
    balance: clamp(1 - Math.abs(state.yang - state.yin), 0, 1),
    qi: clamp(state.qi, 0, 1),
    blood: clamp(state.blood, 0, 1),
    stagnation: clamp(state.stagnation, 0, 1),
  };
  Object.entries(values).forEach(([key, value]) => {
    const bar = document.querySelector(`[data-metric="${key}"]`);
    const label = bar?.parentElement?.nextElementSibling;
    if (bar) bar.style.width = `${Math.round(value * 100)}%`;
    if (label) label.textContent = `${Math.round(value * 100)}%`;
  });
  const flowQi = document.getElementById("flow-qi");
  const flowBlood = document.getElementById("flow-blood");
  if (flowQi) flowQi.textContent = `${Math.round(values.qi * 100)}%`;
  if (flowBlood) flowBlood.textContent = `${Math.round(values.blood * 100)}%`;
}

function applyDay(day) {
  if (!currentCase) return;
  const c = currentCase;
  const d = clamp(day, c.startDay, c.endDay);
  currentDay = d;
  const series = c.series;
  let a = series[0];
  let b = series[series.length - 1];
  let t = 0;

  if (d <= a.day) {
    b = a;
  } else if (d >= b.day) {
    a = b;
  } else {
    for (let i = 0; i < series.length - 1; i += 1) {
      const left = series[i];
      const right = series[i + 1];
      if (d >= left.day && d <= right.day) {
        a = left;
        b = right;
        t = (right.day - left.day) > 0 ? (d - left.day) / (right.day - left.day) : 0;
        break;
      }
    }
  }

  const state = a === b ? { ...a } : lerpState(a, b, t);
  const point = t < 0.5 ? a : b;
  const organs = point.organs.length ? point.organs : c.organs;
  const meridians = point.meridians.length ? point.meridians : c.meridians;
  if (scene) scene.setState(state, organs, meridians);

  ui.daySlider.value = String(d);
  ui.dayLabel.textContent = `第 ${formatDay(d)} 天`;
  ui.viewState.textContent = `${c.pattern} · 第 ${formatDay(d)} 天`;
  updateMetrics(state);
  updateChartCursor(d);

  const exact = series.find((p) => Math.abs(p.day - d) < 0.15 && (p.event || p.medication));
  if (exact) {
    ui.eventLabel.textContent = [exact.event, exact.medication].filter(Boolean).join(" · ");
  } else {
    const past = [...series].reverse().find((p) => p.day <= d && p.medication);
    ui.eventLabel.textContent = past && d - past.day <= 7
      ? `用药：${past.medication}（第 ${formatDay(past.day)} 天起）`
      : "—";
  }
  ui.timelineNote.textContent = point.note
    || `数据点 ${series.indexOf(point) + 1}/${series.length}；点与点之间线性插值，3D 为教学映射。`;

  ui.eventStrip.querySelectorAll(".event-dot").forEach((dot) => {
    dot.classList.toggle("is-current", Math.abs(Number(dot.dataset.day) - d) < 0.15);
  });
  ui.seriesTable?.querySelectorAll("tbody tr").forEach((row) => {
    row.classList.toggle("is-current", Math.abs(Number(row.dataset.day) - d) < 0.15);
  });
  ui.timelineCase.textContent = `${c.case_name} · ${c.pattern}`;
}

function stopPlay() {
  playing = false;
  if (playRaf) cancelAnimationFrame(playRaf);
  playRaf = 0;
  if (ui.btnPlay) ui.btnPlay.textContent = "▶ 播放变化";
}

function play() {
  if (!currentCase || currentCase.endDay <= currentCase.startDay + 0.01) return;
  stopPlay();
  playing = true;
  ui.btnPlay.textContent = "Ⅱ 播放中";
  const from = currentDay >= currentCase.endDay - 0.01 ? currentCase.startDay : currentDay;
  const to = currentCase.endDay;
  const started = performance.now();
  const step = (now) => {
    if (!playing) return;
    const t = clamp((now - started) / 8000, 0, 1);
    const eased = t * t * (3 - 2 * t);
    applyDay(from + (to - from) * eased);
    if (t < 1) {
      playRaf = requestAnimationFrame(step);
    } else {
      playing = false;
      ui.btnPlay.textContent = "▶ 重播";
    }
  };
  playRaf = requestAnimationFrame(step);
}

function selectCase(index) {
  const c = dataset?.cases[index];
  if (!c) return;
  stopPlay();
  currentCaseIndex = index;
  currentCase = c;
  currentDay = c.startDay;

  ui.caseList.querySelectorAll(".case-item").forEach((btn) => {
    btn.classList.toggle("is-active", Number(btn.dataset.index) === index);
  });
  ui.timelineCase.textContent = `${c.case_name} · ${c.pattern}`;
  ui.daySlider.min = String(c.startDay);
  ui.daySlider.max = String(Math.max(c.startDay, c.endDay));
  ui.daySlider.step = "0.1";
  ui.daySlider.value = String(currentDay);
  ui.daySlider.disabled = false;
  ui.btnFirst.disabled = false;
  ui.btnLast.disabled = false;
  ui.btnPlay.disabled = c.endDay <= c.startDay + 0.01;
  ui.btnPlay.textContent = "▶ 播放变化";

  const demo = dataset.meta.is_demo || c.isDemo;
  renderCaseDetail(c);
  renderEventStrip(c);
  renderChart(c);
  renderSeriesTable(c);
  setDataView(dataView);
  applyDay(currentDay);

  ui.timelineProvenance.textContent = `${dataset.meta.dataset_name} · ${demo ? "非临床演示数据" : "导入数据"} · ${dataset.meta.license === "未提供" ? "许可待补" : "许可已声明"}`;
  ui.timelineProvenance.classList.toggle("is-demo", demo);
  ui.dataBadge.textContent = demo ? "DEMO · 演示数据" : "IMPORTED · 已导入";
  ui.dataBadge.className = `dataset-badge ${demo ? "is-demo" : "is-real"}`;
}

function applyDataset(ds) {
  dataset = ds;
  renderMeta(ds);
  renderCaseList(ds);
  selectCase(0);
  const demo = ds.meta.is_demo;
  const warnSuffix = ds.warnings.length ? ` 有 ${ds.warnings.length} 条数据提示，请查看“数据信息”。` : "";
  setStatus(
    demo
      ? `已加载演示数据：${ds.cases.length} 个案例。演示值仅展示导入格式，不是临床数据。${warnSuffix}`
      : `已导入：${ds.cases.length} 个案例、${ds.meta.point_count} 个数据点。${warnSuffix}`,
    demo || ds.warnings.length ? "warn" : "ok",
  );
}

async function loadFile(file) {
  if (!file) return;
  if (file.size > MAX_FILE_BYTES) {
    setStatus(`文件过大（${(file.size / 1024 / 1024).toFixed(1)} MB），时序文件请控制在 3 MB 内。中草药条目请到“药材资料”（herbs.html）检索。`, "error");
    return;
  }
  try {
    const raw = await file.text();
    const ds = parseDataset(raw, file.name);
    applyDataset(ds);
  } catch (err) {
    if (!(err instanceof HerbReferenceError)) console.error(err);
    setStatus(`导入失败：${err.message}`, "error");
  }
}

async function loadDemo() {
  setStatus("正在加载演示数据…");
  try {
    const res = await fetch("data/dataset_demo.csv", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    applyDataset(parseDataset(raw, "dataset_demo.csv"));
  } catch (err) {
    console.error(err);
    setStatus(`演示数据加载失败：${err.message}`, "error");
  }
}

function seekChart(evt) {
  if (!currentCase) return;
  const rect = ui.chart.getBoundingClientRect();
  if (!rect.width) return;
  const px = ((evt.clientX - rect.left) / rect.width) * CHART.w;
  const ratio = clamp((px - CHART.left) / (CHART.w - CHART.left - CHART.right), 0, 1);
  stopPlay();
  applyDay(currentCase.startDay + ratio * (currentCase.endDay - currentCase.startDay));
}

function buildLayerToggles() {
  ui.layerToggles.innerHTML = LAYER_DEFS.map(([key, label]) =>
    `<button class="layer-pill${layers[key] ? " is-on" : ""}" type="button" data-layer="${key}">${esc(label)}</button>`).join("");
  ui.layerToggles.querySelectorAll(".layer-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.layer;
      layers[key] = !layers[key];
      btn.classList.toggle("is-on", layers[key]);
      if (scene) scene.setLayers(layers);
    });
  });
}

function bindImportEvents() {
  ui.btnPick.addEventListener("click", () => ui.fileInput.click());
  ui.btnDemo.addEventListener("click", loadDemo);
  ui.dropZone.addEventListener("click", () => ui.fileInput.click());
  ui.dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ui.fileInput.click();
    }
  });
  ui.fileInput.addEventListener("change", () => {
    const file = ui.fileInput.files?.[0];
    ui.fileInput.value = "";
    if (file) loadFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    ui.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      ui.dropZone.classList.add("is-over");
    });
  });
  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    ui.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      ui.dropZone.classList.remove("is-over");
    });
  });
  ui.dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });
}

function bindTimelineEvents() {
  ui.btnChartView.addEventListener("click", () => setDataView("chart"));
  ui.btnTableView.addEventListener("click", () => setDataView("table"));
  ui.daySlider.addEventListener("input", () => {
    stopPlay();
    applyDay(Number(ui.daySlider.value));
  });
  ui.btnFirst.addEventListener("click", () => {
    stopPlay();
    if (currentCase) applyDay(currentCase.startDay);
  });
  ui.btnLast.addEventListener("click", () => {
    stopPlay();
    if (currentCase) applyDay(currentCase.endDay);
  });
  ui.btnPlay.addEventListener("click", () => {
    if (playing) stopPlay();
    else play();
  });

  ui.chart.addEventListener("pointerdown", (e) => {
    chartDragging = true;
    seekChart(e);
  });
  ui.chart.addEventListener("pointermove", (e) => {
    if (chartDragging) seekChart(e);
  });
  window.addEventListener("pointerup", () => { chartDragging = false; });
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
  [ui.btnSexMale, ui.btnSexFemale].forEach(b => { if (b) b.disabled = true; });
  ui.viewState.textContent = next === "female" ? "切换女性模型…" : "切换男性模型…";
  try {
    const ok = await scene.setSex(next);
    if (!ok) throw new Error("sex model load failed");
    sex = next;
    setSexButtons(sex);
    setVisualMode(visualMode);
    if (currentCase) applyDay(currentDay);
    setStatus(next === "female"
      ? "已切换女性模型（比例重建；骨盆外表面已做隐私处理）。"
      : "已切换男性模型（骨盆外表面已做隐私处理）。", "ok");
  } catch (err) {
    console.error(err);
    sex = prev;
    setSexButtons(sex);
    setVisualMode(visualMode);
    setStatus("性别模型切换失败，请确认两张 GLB 与本地服务均可用。", "error");
  } finally {
    sexLoading = false;
    [ui.btnSexMale, ui.btnSexFemale].forEach(b => { if (b) b.disabled = false; });
  }
}

function bindSceneControls() {
  $("btn-mode-real").addEventListener("click", () => setVisualMode("real"));
  $("btn-mode-holo").addEventListener("click", () => setVisualMode("holo"));
  ui.btnSexMale?.addEventListener("click", () => changeSex("male"));
  ui.btnSexFemale?.addEventListener("click", () => changeSex("female"));
  $("btn-view-reset").addEventListener("click", () => scene?.resetView());
  $("btn-rotate").addEventListener("click", (e) => {
    if (!scene) return;
    scene.controls.autoRotate = !scene.controls.autoRotate;
    e.currentTarget.classList.toggle("is-on", scene.controls.autoRotate);
  });
  ui.skinOpacity.addEventListener("input", () => {
    const value = Number(ui.skinOpacity.value);
    if (scene) scene.setSkinOpacity(value);
    ui.skinOpacityValue.textContent = value < 0.04 ? "透视" : value < 0.12 ? "清透" : value < 0.22 ? "标准" : "可见";
  });
}

async function boot() {
  buildLayerToggles();
  bindImportEvents();
  bindTimelineEvents();
  bindSceneControls();

  scene = new TCMScene3D($("canvas-wrap"), ui.labels, ui.loadingText);
  try {
    await scene.init();
    scene.setLayers(layers);
    scene.setSkinOpacity(Number(ui.skinOpacity.value));
    scene.setState(NORMAL_STATE, [], []);
    setVisualMode("real");
    setSexButtons("male");
    ui.loading.classList.add("is-hidden");
    setTimeout(() => ui.loading.remove(), 500);
    window.__datasetScene = scene;
    if (currentCase) applyDay(currentDay);
    console.log("[dataset] scene ready", {
      meridians: scene.meridians?.meridians?.length,
      organs: scene.organs?.size,
    });
  } catch (err) {
    console.error(err);
    ui.loadingText.textContent = "3D 模型加载失败；数据仍可导入，请通过本地 HTTP 服务打开并确认 assets/anatomy_male.glb 存在。";
    setStatus("3D 加载失败；数据解析与曲线仍可用。", "error");
  }

  const params = new URLSearchParams(location.search);
  if (params.get("demo") === "1") loadDemo();
}

boot();




