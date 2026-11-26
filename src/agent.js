import {
  SYMPTOMS, PATTERNS, FORMULAS, RED_FLAGS, ZANG_KEYS,
  ORGAN_META, MERIDIAN_NAMES, patternSymptoms, clamp,
} from "./knowledge.js?v=20261107defense";

export const DISCLAIMER =
  "本页面是中医理论学习与三维可视化演示，不构成诊断或处方；方名为经典方示例，不含剂量。如有不适，请就医并在执业医师指导下用药。";

export const AGENT_INTRO =
  "你好，我是「络象经纬 · 教学推演助手」。你可以从标准案例开始，或点选症状做教学匹配；我会把相应脏腑、经络和经典方作用方向投射到 3D 人体上。这不是诊断或处方。";

export function normalize(text) {
  return String(text || "").replace(/\s+/g, "").toLowerCase();
}

export function findSymptoms(text) {
  const t = normalize(text);
  if (!t) return [];
  const hits = [];
  for (const s of SYMPTOMS) {
    const names = [s.label, ...(s.aliases || [])];
    if (names.some(n => t.includes(normalize(n)))) hits.push(s);
  }
  return hits;
}

export function detectRedFlags(text) {
  const t = normalize(text);
  return RED_FLAGS.filter(f => t.includes(normalize(f)));
}

export function analyzeText(text, selectedLabels = []) {
  const free = findSymptoms(text);
  const selected = SYMPTOMS.filter(s => selectedLabels.includes(s.label));
  const merged = [...selected];
  for (const s of free) if (!merged.some(x => x.id === s.id)) merged.push(s);

  const scores = {};
  for (const s of merged) {
    for (const [pid, w] of Object.entries(s.patterns || {})) {
      scores[pid] = (scores[pid] || 0) + w;
    }
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topId = ranked[0]?.[0] || null;
  const secondId = ranked[1]?.[0] || null;
  const top = topId ? PATTERNS[topId] : null;
  const second = secondId ? PATTERNS[secondId] : null;
  const confidence = top
    ? clamp(0.42 + merged.length * 0.06 + Math.min(ranked[0][1], 8) * 0.035, 0.42, 0.93)
    : 0;
  return {
    symptoms: merged,
    scores,
    top,
    second,
    confidence,
    redFlags: detectRedFlags(text),
  };
}

export function symptomOptions() {
  return SYMPTOMS.map(s => s.label);
}

export function formulaFor(pattern, preferredId = null) {
  if (!pattern) return null;
  if (preferredId && FORMULAS[preferredId] && FORMULAS[preferredId].pattern === pattern.id) {
    return FORMULAS[preferredId];
  }
  return FORMULAS[pattern.formula] || null;
}

export function formulaOptions(pattern) {
  if (!pattern) return [];
  const ids = [pattern.formula, ...(pattern.alternatives || [])];
  return ids.filter(id => FORMULAS[id]).map(id => FORMULAS[id]);
}

export function affectedSummary(pattern) {
  if (!pattern) return "";
  const organs = pattern.organs.map(k => ORGAN_META[k]?.zh || k).join("、");
  const meridians = pattern.meridians.map(m => MERIDIAN_NAMES[m] || m).join("、");
  return `相关脏腑：${organs}；相关经络：${meridians}`;
}

export function buildAnalysisReply(analysis, pattern, formula) {
  if (!pattern) {
    return "我还需要更多线索。可以点选上方的常见症状，或用一句话描述，例如「怕冷、腰膝酸软、夜尿多」。";
  }
  const sym = analysis.symptoms.map(s => s.label).join("、") || "你描述的症状";
  const second = analysis.second ? `，次要可能为「${analysis.second.name}」` : "";
  return [
    `从你提到的「${sym}」看，教学匹配度最高的是 **${pattern.name}**（${pattern.subtitle}，规则匹配度约 ${Math.round(analysis.confidence * 100)}%，不是诊断概率）${second}。`,
    affectedSummary(pattern) + "。",
    `经典方示例：**${formula?.name || "—"}**（${formula?.actions || ""}）。这只是方名与作用方向的教学演示，不含剂量，也不能替代面诊。`,
    "我已把该证候的 3D 表现投射到模型：可以先看「服药前」，再拖动疗程滑块观察模拟变化。",
  ].join("\n\n");
}

export function buildTreatmentReply(pattern, formula, day) {
  if (!pattern) return "请先描述症状或完成一次证候分析，再开始服药模拟。";
  const progress = clamp(day / 28);
  const lines = [
    `开始演示：**${formula?.name || "经典方示例"}** → ${pattern.name}。`,
    `当前模拟疗程：第 ${day} 天（${Math.round(progress * 100)}%）。`,
    "3D 模型会沿「服药前 → 服药后」的方向变化：" +
      pattern.improvements.map(x => `\n· ${x}`).join(""),
    "再次强调：这是证候-方剂-视觉参数的映射演示，不是真实药效预测，也不是处方。",
  ];
  return lines.join("\n\n");
}

export function urgentReply(redFlags) {
  return [
    `你提到了「${redFlags.join("、")}」等需要优先排查的表现。`,
    "**请立即联系急救或前往医院**，不要依赖本页面做自我诊断或自行服药。",
    "本演示不会对急症做方剂模拟；请先获得专业医疗评估。",
  ].join("\n\n");
}

export function detectFormula(text) {
  const t = normalize(text);
  for (const [id, f] of Object.entries(FORMULAS)) {
    if (t.includes(normalize(f.name))) return { id, ...f };
  }
  return null;
}

export function detectOrgan(text) {
  const t = normalize(text);
  for (const [key, meta] of Object.entries(ORGAN_META)) {
    if (t.includes(normalize(meta.zh))) return { key, ...meta };
  }
  if (t.includes("肝")) return { key: "Liver", ...ORGAN_META.Liver };
  if (t.includes("心")) return { key: "Heart", ...ORGAN_META.Heart };
  if (t.includes("脾")) return { key: "Spleen", ...ORGAN_META.Spleen };
  if (t.includes("肺")) return { key: "Lungs", ...ORGAN_META.Lungs };
  if (t.includes("肾")) return { key: "Kidneys", ...ORGAN_META.Kidneys };
  return null;
}

export function detectMeridian(text) {
  const t = normalize(text);
  for (const [id, name] of Object.entries(MERIDIAN_NAMES)) {
    if (t.includes(normalize(name))) return { id, name };
  }
  return null;
}

export function isCompareIntent(text) {
  const t = normalize(text);
  return ["对比", "前后", "服药前", "服药后", "before", "after"].some(k => t.includes(k));
}

export function isResetIntent(text) {
  const t = normalize(text);
  return ["重置", "清除", "恢复", "正常态", "reset"].some(k => t.includes(k));
}

export function isTreatIntent(text) {
  const t = normalize(text);
  return ["服药", "吃药", "中药", "方剂", "开始治疗", "模拟"].some(k => t.includes(k));
}

export const SAMPLE_CASES = [
  { id: "kidneyYang", pattern: "kidneyYang", name: "阳虚怕冷案", text: "我怕冷，手脚冰凉，腰膝酸软，夜尿多，精神不振" },
  { id: "liverStag", pattern: "liverStag", name: "肝郁刺痛案", text: "最近压力大，胁肋胀痛，爱叹气，偶尔刺痛，情绪低落" },
  { id: "yinDef", pattern: "yinDef", name: "阴虚虚热案", text: "口干，盗汗，五心烦热，晚上睡不好，腰酸" },
  { id: "spleenDef", pattern: "spleenDef", name: "脾虚湿困案", text: "食欲差，腹胀，便溏，身体沉重，乏力" },
];

export function quickFormulaForPattern(pattern) {
  return formulaFor(pattern);
}

export { ZANG_KEYS, ORGAN_META, MERIDIAN_NAMES, PATTERNS, FORMULAS };
