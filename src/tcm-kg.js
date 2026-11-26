/**
 * 络象经纬 · 中医五层结构化教学知识图谱（本地离线，零后端）
 * 自动集成：8 条经典条文 + 11 个脏腑 + 14 条经脉 + 42 个 GB/T 12346 国标要穴 + 10 个经典方示例 = 85 节点、110+ 关系边。
 * 每个节点均绑定 3D 可高亮对象或跨页核验入口，贯通全站。
 */
import { BONE_CUN_RULES } from "./cun-locator.js?v=20261127lab2";
import { FORMULAS, PATTERNS } from "./knowledge.js?v=20261107defense";

export const KG_NODE_TYPES = {
  classic:  { label: "经典条文", color: "#b0822d", bg: "#fbf5e8" },
  organ:    { label: "脏腑",     color: "#1b6b58", bg: "#e8f5ef" },
  meridian: { label: "十四经",   color: "#1c6e9c", bg: "#e8f3fa" },
  acupoint: { label: "国标腧穴", color: "#c45b2c", bg: "#fcf0ea" },
  herb:     { label: "经典方/药", color: "#6c4899", bg: "#f3eefb" },
};

const CORE_NODES = [
  // 经典条文 (6)
  { id: "cls_weiqi",   type: "classic", label: "《灵枢·卫气行》", summary: "卫气昼行于阳二十五周，夜行于阴二十五周，按肾→心→肺→肝→脾周流五脏。", link: "yangqi.html", target: { organs: ["Kidneys", "Heart", "Lungs", "Liver", "Spleen"], meridians: ["KI", "HT", "LU", "LR", "SP"], mode: "night" } },
  { id: "cls_cijin",   type: "classic", label: "《素问·刺禁论》", summary: "肝生于左，肺藏于右，心部于表，肾治于里，脾为之使，胃为之市。", link: "yangqi.html", target: { organs: ["Liver", "Lungs", "Spleen", "Stomach"], meridians: ["LR", "LU", "SP", "ST"] } },
  { id: "cls_shengqi", type: "classic", label: "《素问·生气通天论》", summary: "阳气者，若天与日，失其所，则折寿而不彰。", link: "yangqi.html", target: { organs: ["Kidneys", "Heart"], meridians: ["DU"] } },
  { id: "cls_sisheng", type: "classic", label: "《四圣心源》中气枢机", summary: "中气者，和济水火之机，升降金木之轴（脾升清、胃降浊）。", link: "yangqi.html", target: { organs: ["Spleen", "Stomach"], meridians: ["SP", "ST"] } },
  { id: "cls_nishun",  type: "classic", label: "《灵枢·逆顺肥瘦》", summary: "手之三阴，从脏走手；手之三阳，从手走头；足之三阳，从头走足；足之三阴，从足走腹。", link: "yangqi.html", target: { organs: ["Lungs", "Stomach", "Spleen"], meridians: ["LU", "LI", "ST", "SP"] } },
  { id: "cls_gb12346", type: "classic", label: "GB/T 12346 经穴标准", summary: "中华人民共和国国家标准《经穴名称与定位》，规定十四经腧穴定位与骨度分寸基准。", link: "lab.html", target: { organs: ["Stomach", "Kidneys"], meridians: ["ST", "DU", "SP"], acupoint: "ST36" } },

  // 脏腑 (10)
  { id: "org_Kidneys",        type: "organ", label: "肾", summary: "先天之本、元阳之根，位居腰部脊柱两侧靠后；主藏精、主水纳气。", target: { organs: ["Kidneys"], meridians: ["KI", "DU"] } },
  { id: "org_Spleen",         type: "organ", label: "脾", summary: "后天之本，中焦左枢，主运化升清、统血。", target: { organs: ["Spleen"], meridians: ["SP"] } },
  { id: "org_Stomach",        type: "organ", label: "胃", summary: "水谷之海，中焦右枢，主受纳腐熟、通降下行。", target: { organs: ["Stomach"], meridians: ["ST"] } },
  { id: "org_Liver",          type: "organ", label: "肝", summary: "主疏泄条达、藏血，居气机圆运动之左路升发。", target: { organs: ["Liver"], meridians: ["LR"] } },
  { id: "org_Lungs",          type: "organ", label: "肺", summary: "主气司呼吸、宣发肃降、朝百脉，居气机圆运动之右路肃降。", target: { organs: ["Lungs"], meridians: ["LU"] } },
  { id: "org_Heart",          type: "organ", label: "心", summary: "主血脉、藏神，心火下潜温煦肾水，成水火既济。", target: { organs: ["Heart"], meridians: ["HT", "PC"] } },
  { id: "org_LargeIntestine", type: "organ", label: "大肠", summary: "传化糟粕，与肺相表里。", target: { organs: ["LargeIntestine"], meridians: ["LI"] } },
  { id: "org_SmallIntestine", type: "organ", label: "小肠", summary: "受盛化物、泌别清浊，与心相表里。", target: { organs: ["SmallIntestine"], meridians: ["SI"] } },
  { id: "org_Gallbladder",    type: "organ", label: "胆", summary: "贮藏排泄胆汁、主决断，与肝相表里。", target: { organs: ["Gallbladder"], meridians: ["GB"] } },
  { id: "org_Bladder",        type: "organ", label: "膀胱", summary: "贮尿排尿、气化津液，与肾相表里。", target: { organs: ["Bladder"], meridians: ["BL"] } },

  // 十四经 (14)
  { id: "mer_DU", type: "meridian", label: "督脉", summary: "阳脉之海，循后正中线上行入脑、下贯腰骶。", target: { organs: ["Kidneys", "Brain"], meridians: ["DU"] } },
  { id: "mer_RN", type: "meridian", label: "任脉", summary: "阴脉之海，循前正中线总任一身阴经。", target: { organs: ["Kidneys", "Stomach"], meridians: ["RN"] } },
  { id: "mer_LU", type: "meridian", label: "手太阴肺经", summary: "手三阴之一，从胸走手，寅时当令。", target: { organs: ["Lungs"], meridians: ["LU"] } },
  { id: "mer_LI", type: "meridian", label: "手阳明大肠经", summary: "手三阳之一，从手走头，卯时当令。", target: { organs: ["LargeIntestine"], meridians: ["LI"] } },
  { id: "mer_ST", type: "meridian", label: "足阳明胃经", summary: "足三阳之一，从头走足，辰时当令，多气多血。", target: { organs: ["Stomach"], meridians: ["ST"] } },
  { id: "mer_SP", type: "meridian", label: "足太阴脾经", summary: "足三阴之一，从足走腹，巳时当令。", target: { organs: ["Spleen"], meridians: ["SP"] } },
  { id: "mer_HT", type: "meridian", label: "手少阴心经", summary: "手三阴之一，从胸走手，午时当令。", target: { organs: ["Heart"], meridians: ["HT"] } },
  { id: "mer_SI", type: "meridian", label: "手太阳小肠经", summary: "手三阳之一，从手走头，未时当令。", target: { organs: ["SmallIntestine"], meridians: ["SI"] } },
  { id: "mer_BL", type: "meridian", label: "足太阳膀胱经", summary: "足三阳之一，从头走足，申时当令，循背部两旁。", target: { organs: ["Bladder", "Kidneys"], meridians: ["BL"] } },
  { id: "mer_KI", type: "meridian", label: "足少阴肾经", summary: "足三阴之一，从足走腹，酉时当令，卫气入夜始注之经。", target: { organs: ["Kidneys"], meridians: ["KI"] } },
  { id: "mer_PC", type: "meridian", label: "手厥阴心包经", summary: "手三阴之一，从胸走手，戌时当令。", target: { organs: ["Heart"], meridians: ["PC"] } },
  { id: "mer_TE", type: "meridian", label: "手少阳三焦经", summary: "手三阳之一，从手走头，亥时当令。", target: { organs: ["Heart"], meridians: ["TE"] } },
  { id: "mer_GB", type: "meridian", label: "足少阳胆经", summary: "足三阳之一，从头走足，子时当令。", target: { organs: ["Gallbladder"], meridians: ["GB"] } },
  { id: "mer_LR", type: "meridian", label: "足厥阴肝经", summary: "足三阴之一，从足走腹，丑时当令。", target: { organs: ["Liver"], meridians: ["LR"] } },
];

// 自动将 42 个 GB/T 12346 穴位与 10 个教学经典方注入知识图谱
const ACUPOINT_NODES = BONE_CUN_RULES.map(r => ({
  id: `acu_${r.id}`,
  type: "acupoint",
  label: `${r.name} ${r.id}`,
  summary: `${r.meridianName}（${r.region}）｜${r.formula}`,
  target: { organs: [r.organ], meridians: [r.meridian], acupoint: r.id },
}));

const FORMULA_NODES = Object.entries(FORMULAS).map(([fid, f]) => {
  const pat = PATTERNS[f.pattern];
  const firstHerb = f.herbs[0] || "";
  return {
    id: `frm_${fid}`,
    type: "herb",
    label: f.name,
    summary: `教学经典方（${pat ? pat.name : ""}）｜组成示例：${f.herbs.join("、")}（不含剂量）｜${f.actions}`,
    link: firstHerb ? `herbs.html?q=${encodeURIComponent(firstHerb)}` : "teacher.html#knowledge",
    target: { organs: pat?.organs || ["Spleen"], meridians: pat?.meridians || ["SP"] },
  };
});

export const KG_NODES = [...CORE_NODES, ...ACUPOINT_NODES, ...FORMULA_NODES];

const BASE_EDGES = [
  { from: "cls_weiqi", to: "org_Kidneys", rel: "夜首注于肾" },
  { from: "cls_weiqi", to: "org_Heart",   rel: "肾→心" },
  { from: "cls_weiqi", to: "org_Lungs",   rel: "心→肺" },
  { from: "cls_weiqi", to: "org_Liver",   rel: "肺→肝" },
  { from: "cls_weiqi", to: "org_Spleen",  rel: "肝→脾" },
  { from: "cls_cijin", to: "org_Liver",   rel: "肝生于左" },
  { from: "cls_cijin", to: "org_Lungs",   rel: "肺藏于右" },
  { from: "cls_sisheng", to: "org_Spleen",  rel: "脾主升清" },
  { from: "cls_sisheng", to: "org_Stomach", rel: "胃主降浊" },
  { from: "cls_shengqi", to: "org_Kidneys", rel: "元阳之根" },
  { from: "cls_shengqi", to: "mer_DU",      rel: "阳脉之海" },
  { from: "cls_nishun",  to: "mer_LU",      rel: "手三阴从胸走手" },
  { from: "cls_nishun",  to: "mer_LI",      rel: "手三阳从手走头" },
  { from: "cls_nishun",  to: "mer_ST",      rel: "足三阳从头走足" },
  { from: "cls_nishun",  to: "mer_SP",      rel: "足三阴从足走腹" },

  { from: "org_Kidneys",        to: "mer_DU", rel: "督脉温肾" },
  { from: "org_Kidneys",        to: "mer_KI", rel: "属肾" },
  { from: "org_Stomach",        to: "mer_ST", rel: "属胃" },
  { from: "org_Spleen",         to: "mer_SP", rel: "属脾" },
  { from: "org_Liver",          to: "mer_LR", rel: "属肝" },
  { from: "org_Lungs",          to: "mer_LU", rel: "属肺" },
  { from: "org_Heart",          to: "mer_HT", rel: "属心" },
  { from: "org_Heart",          to: "mer_PC", rel: "属心包" },
  { from: "org_LargeIntestine", to: "mer_LI", rel: "属大肠" },
  { from: "org_SmallIntestine", to: "mer_SI", rel: "属小肠" },
  { from: "org_Gallbladder",    to: "mer_GB", rel: "属胆" },
  { from: "org_Bladder",        to: "mer_BL", rel: "属膀胱" },
  { from: "org_Stomach",        to: "mer_RN", rel: "任脉交会" },
];

const ACUPOINT_EDGES = BONE_CUN_RULES.flatMap(r => [
  { from: `mer_${r.meridian}`, to: `acu_${r.id}`, rel: "所属经穴" },
  { from: "cls_gb12346", to: `acu_${r.id}`, rel: "国标定位" },
]);

const FORMULA_EDGES = Object.entries(FORMULAS).flatMap(([fid, f]) => {
  const pat = PATTERNS[f.pattern];
  const mers = (pat?.meridians || []).slice(0, 2);
  return mers.map(m => ({ from: `frm_${fid}`, to: `mer_${m}`, rel: "归经/调治方向" }));
});

export const KG_EDGES = [...BASE_EDGES, ...ACUPOINT_EDGES, ...FORMULA_EDGES];

export function getKgStats() {
  const byType = {};
  for (const n of KG_NODES) byType[n.type] = (byType[n.type] || 0) + 1;
  return { nodeCount: KG_NODES.length, edgeCount: KG_EDGES.length, byType };
}

export function getNodeNeighbors(nodeId) {
  const rels = KG_EDGES.filter(e => e.from === nodeId || e.to === nodeId);
  return rels.map(e => {
    const otherId = e.from === nodeId ? e.to : e.from;
    const other = KG_NODES.find(n => n.id === otherId);
    return { rel: e.rel, dir: e.from === nodeId ? "out" : "in", node: other };
  }).filter(x => x.node);
}
