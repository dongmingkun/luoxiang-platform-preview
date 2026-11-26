/**
 * 络象经纬 · 中医三维教学知识图谱（本地结构化图谱，零后端离线运行）
 * 贯通五大实体层：经典条文（classic）↔ 脏腑（organ）↔ 经脉（meridian）↔ 腧穴（acupoint）↔ 药材/经典方（herb）
 * 每个节点均绑定 3D 可高亮对象（organKey / meridianId / acupointId）或跨页溯源链接。
 */

export const KG_NODE_TYPES = {
  classic:  { label: "经典条文", color: "#b0822d", bg: "#fbf5e8" },
  organ:    { label: "脏腑",     color: "#1b6b58", bg: "#e8f5ef" },
  meridian: { label: "经脉",     color: "#1c6e9c", bg: "#e8f3fa" },
  acupoint: { label: "国标腧穴", color: "#c45b2c", bg: "#fcf0ea" },
  herb:     { label: "药材/方剂", color: "#6c4899", bg: "#f3eefb" },
};

export const KG_NODES = [
  // 经典条文
  { id: "cls_weiqi", type: "classic", label: "《灵枢·卫气行》", summary: "卫气昼行于阳二十五周，夜行于阴二十五周，按肾→心→肺→肝→脾周流五脏。", link: "yangqi.html", target: { organs: ["Kidneys", "Heart", "Lungs", "Liver", "Spleen"], meridians: ["KI", "HT", "LU", "LR", "SP"], mode: "night" } },
  { id: "cls_cijin", type: "classic", label: "《素问·刺禁论》", summary: "肝生于左，肺藏于右，心部于表，肾治于里，脾为之使，胃为之市。", link: "yangqi.html", target: { organs: ["Liver", "Lungs", "Spleen", "Stomach"], meridians: ["LR", "LU", "SP", "ST"] } },
  { id: "cls_shengqi", type: "classic", label: "《素问·生气通天论》", summary: "阳气者，若天与日，失其所，则折寿而不彰。", link: "yangqi.html", target: { organs: ["Kidneys", "Heart"], meridians: ["DU"] } },
  { id: "cls_sisheng", type: "classic", label: "《四圣心源》中气枢机", summary: "中气者，和济水火之机，升降金木之轴（脾升清、胃降浊）。", link: "yangqi.html", target: { organs: ["Spleen", "Stomach"], meridians: ["SP", "ST"] } },

  // 脏腑
  { id: "org_kidney", type: "organ", label: "肾（坎中一阳）", summary: "先天之本、元阳之根，位居腰部脊柱两侧靠后；主藏精、主水纳气。", target: { organs: ["Kidneys"], meridians: ["KI", "DU"] } },
  { id: "org_spleen", type: "organ", label: "脾（中焦升清）", summary: "后天之本，与胃居中焦为升降枢机，主运化升清、统血。", target: { organs: ["Spleen"], meridians: ["SP"] } },
  { id: "org_stomach", type: "organ", label: "胃（中焦降浊）", summary: "水谷之海，主受纳腐熟、通降下行，与脾相配构成升降枢纽。", target: { organs: ["Stomach"], meridians: ["ST"] } },
  { id: "org_liver", type: "organ", label: "肝（左路升发）", summary: "主疏泄条达、藏血，居气机圆运动之左路升发。", target: { organs: ["Liver"], meridians: ["LR"] } },
  { id: "org_lung", type: "organ", label: "肺（右路肃降）", summary: "主气司呼吸、宣发肃降、朝百脉，居气机圆运动之右路肃降。", target: { organs: ["Lungs"], meridians: ["LU"] } },
  { id: "org_heart", type: "organ", label: "心（上焦君火）", summary: "主血脉、藏神，心火下潜温煦肾水，成水火既济。", target: { organs: ["Heart"], meridians: ["HT", "PC"] } },

  // 经脉
  { id: "mer_du", type: "meridian", label: "督脉（阳脉之海）", summary: "循行后正中线，总督一身阳气，贯腰骶上行入脑。", target: { organs: ["Kidneys", "Brain"], meridians: ["DU"] } },
  { id: "mer_st", type: "meridian", label: "足阳明胃经", summary: "多气多血，辰时（07:00–09:00）当令，循头面胸腹下肢前外侧。", target: { organs: ["Stomach"], meridians: ["ST"] } },
  { id: "mer_sp", type: "meridian", label: "足太阴脾经", summary: "巳时（09:00–11:00）当令，循足大趾内侧上行入腹属脾络胃。", target: { organs: ["Spleen"], meridians: ["SP"] } },
  { id: "mer_ki", type: "meridian", label: "足少阴肾经", summary: "酉时当令，亦为卫气入夜始注之经；起于足底涌泉，上贯腰脊属肾。", target: { organs: ["Kidneys"], meridians: ["KI"] } },
  { id: "mer_lr", type: "meridian", label: "足厥阴肝经", summary: "丑时（01:00–03:00）当令，起于足大趾太冲，布胁肋上连目系。", target: { organs: ["Liver"], meridians: ["LR"] } },
  { id: "mer_lu", type: "meridian", label: "手太阴肺经", summary: "寅时（03:00–05:00）当令，起于中焦，下络大肠，出中府行上肢内侧前缘。", target: { organs: ["Lungs"], meridians: ["LU"] } },

  // 国标腧穴
  { id: "acu_st36", type: "acupoint", label: "足三里 ST36", summary: "足阳明胃经合穴；犊鼻下 3 寸，胫骨前嵴外 1 横指。", target: { organs: ["Stomach"], meridians: ["ST"], acupoint: "ST36" } },
  { id: "acu_sp6",  type: "acupoint", label: "三阴交 SP6", summary: "足太阴脾经要穴（肝脾肾三阴交会）；内踝尖上 3 寸。", target: { organs: ["Spleen", "Kidneys", "Liver"], meridians: ["SP"], acupoint: "SP6" } },
  { id: "acu_gv4",  type: "acupoint", label: "命门 GV4", summary: "督脉要穴；第 2 腰椎棘突下凹陷中，后正中线上（平脐）。", target: { organs: ["Kidneys"], meridians: ["DU"], acupoint: "GV4" } },
  { id: "acu_ki3",  type: "acupoint", label: "太溪 KI3", summary: "足少阴肾经原穴；内踝尖与跟腱之间凹陷中。", target: { organs: ["Kidneys"], meridians: ["KI"], acupoint: "KI3" } },
  { id: "acu_lr3",  type: "acupoint", label: "太冲 LR3", summary: "足厥阴肝经原穴；足背第 1、2 跖骨间凹陷中。", target: { organs: ["Liver"], meridians: ["LR"], acupoint: "LR3" } },
  { id: "acu_cv12", type: "acupoint", label: "中脘 CV12", summary: "任脉要穴、胃之募穴；前正中线上，脐中上 4 寸。", target: { organs: ["Stomach"], meridians: ["RN", "ST"], acupoint: "CV12" } },

  // 药材 / 经典方（跨页贯通 herbs.html & teacher.html）
  { id: "hrb_huangqi", type: "herb", label: "黄芪 · 归脾汤", summary: "甘微温，归肺、脾经；关联教学经典方「归脾汤（心脾两虚）」（无剂量教学示例）。", link: "herbs.html?q=%E9%BB%84%E8%8A%AA", target: { organs: ["Spleen", "Lungs"], meridians: ["SP", "LU"] } },
  { id: "hrb_fuzi",    type: "herb", label: "附子 · 金匮肾气丸", summary: "辛甘大热，归心、肾、脾经；关联教学经典方「金匮肾气丸（肾阳虚）」（无剂量教学示例）。", link: "herbs.html?q=%E9%99%84%E5%AD%90", target: { organs: ["Kidneys"], meridians: ["KI", "DU"] } },
  { id: "hrb_chaihu",  type: "herb", label: "柴胡 · 柴胡疏肝散", summary: "苦辛微寒，归肝、胆经；关联教学经典方「柴胡疏肝散（肝郁气滞）」（无剂量教学示例）。", link: "herbs.html?q=%E6%9F%B4%E8%83%A1", target: { organs: ["Liver"], meridians: ["LR", "GB"] } },
];

export const KG_EDGES = [
  { from: "cls_weiqi", to: "org_kidney", rel: "夜首注于肾" },
  { from: "cls_weiqi", to: "org_heart",  rel: "肾→心" },
  { from: "cls_weiqi", to: "org_lung",   rel: "心→肺" },
  { from: "cls_cijin", to: "org_liver",  rel: "肝生于左" },
  { from: "cls_cijin", to: "org_lung",   rel: "肺藏于右" },
  { from: "cls_sisheng", to: "org_spleen",  rel: "脾主升清" },
  { from: "cls_sisheng", to: "org_stomach", rel: "胃主降浊" },
  { from: "cls_shengqi", to: "org_kidney",  rel: "元阳之根" },
  { from: "cls_shengqi", to: "mer_du",      rel: "阳脉之海" },

  { from: "org_kidney",  to: "mer_du", rel: "督脉温肾" },
  { from: "org_kidney",  to: "mer_ki", rel: "属肾" },
  { from: "org_stomach", to: "mer_st", rel: "属胃" },
  { from: "org_spleen",  to: "mer_sp", rel: "属脾" },
  { from: "org_liver",   to: "mer_lr", rel: "属肝" },
  { from: "org_lung",    to: "mer_lu", rel: "属肺" },

  { from: "mer_st", to: "acu_st36", rel: "合穴" },
  { from: "mer_st", to: "acu_cv12", rel: "胃募穴" },
  { from: "mer_sp", to: "acu_sp6",  rel: "三阴交会" },
  { from: "mer_du", to: "acu_gv4",  rel: "命门" },
  { from: "mer_ki", to: "acu_ki3",  rel: "原穴" },
  { from: "mer_lr", to: "acu_lr3",  rel: "原穴" },

  { from: "hrb_huangqi", to: "mer_sp", rel: "归脾经" },
  { from: "hrb_huangqi", to: "mer_lu", rel: "归肺经" },
  { from: "hrb_fuzi",    to: "mer_ki", rel: "归肾经" },
  { from: "hrb_chaihu",  to: "mer_lr", rel: "归肝经" },
];

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
