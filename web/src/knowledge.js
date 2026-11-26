export const NORMAL_STATE = {
  yin: 0.5, yang: 0.5, qi: 1.0, blood: 1.0,
  stagnation: 0.0, inflammation: 0.0, blockedMeridian: "",
};

export const ORGAN_META = {
  Heart: { zh: "心", element: "火", color: "#ff4b3e", meridian: "HT" },
  Liver: { zh: "肝", element: "木", color: "#35d47a", meridian: "LR" },
  Spleen: { zh: "脾", element: "土", color: "#e8b44c", meridian: "SP" },
  Lungs: { zh: "肺", element: "金", color: "#c8e6ff", meridian: "LU" },
  Kidneys: { zh: "肾", element: "水", color: "#3b8cff", meridian: "KI" },
  Stomach: { zh: "胃", element: "土", color: "#ff9a45", meridian: "ST" },
  SmallIntestine: { zh: "小肠", element: "火", color: "#ff7d8a", meridian: "SI" },
  LargeIntestine: { zh: "大肠", element: "金", color: "#d66c7c", meridian: "LI" },
  Gallbladder: { zh: "胆", element: "木", color: "#3fc68f", meridian: "GB" },
  Bladder: { zh: "膀胱", element: "水", color: "#57b5ff", meridian: "BL" },
  Pancreas: { zh: "胰", element: "土", color: "#e8c78c", meridian: "SP" },
  Brain: { zh: "脑", element: "神", color: "#b7a8ff", meridian: "DU" },
  Trachea: { zh: "气管", element: "金", color: "#d8f3ff", meridian: "LU" },
  Airways: { zh: "支气管", element: "金", color: "#b8e4ff", meridian: "LU" },
  Uterus: { zh: "子宫", element: "胞宫", color: "#c97b8a", meridian: "REN" },
  Ovaries: { zh: "卵巢", element: "胞宫", color: "#d9a0a8", meridian: "REN" },
  FallopianTubes: { zh: "输卵管", element: "胞宫", color: "#c88f98", meridian: "REN" },
};

export const ZANG_KEYS = ["Heart", "Liver", "Spleen", "Lungs", "Kidneys"];

export const MERIDIAN_NAMES = {
  LU: "肺经", LI: "大肠经", ST: "胃经", SP: "脾经",
  HT: "心经", SI: "小肠经", BL: "膀胱经", KI: "肾经",
  PC: "心包经", TE: "三焦经", GB: "胆经", LR: "肝经",
  REN: "任脉", DU: "督脉",
};

export const RED_FLAGS = [
  "胸痛", "呼吸困难", "意识不清", "昏厥", "大出血",
  "剧烈头痛", "高热不退", "持续呕吐", "剧烈腹痛", "抽搐",
];

// Symptom -> pattern weights.  The agent first normalizes free text and
// matches any label or alias, then sums the weights.
export const SYMPTOMS = [
  { id: "cold", label: "怕冷", aliases: ["畏寒", "怕风", "手脚凉"], patterns: { kidneyYang: 2, spleenDef: 1 } },
  { id: "coldLimbs", label: "手脚冰凉", aliases: ["四肢冷", "手足不温"], patterns: { kidneyYang: 2, spleenDef: 1 } },
  { id: "waist", label: "腰膝酸软", aliases: ["腰酸", "腰疼", "膝盖软"], patterns: { kidneyYang: 2, yinDef: 2, kidneyYin: 2 } },
  { id: "nightUrine", label: "夜尿多", aliases: ["起夜多", "尿频"], patterns: { kidneyYang: 2 } },
  { id: "lowEnergy", label: "乏力", aliases: ["没力气", "疲倦", "精神不振"], patterns: { kidneyYang: 1, spleenDef: 2, heartSpleen: 2 } },
  { id: "edema", label: "水肿", aliases: ["浮肿", "腿肿"], patterns: { kidneyYang: 2, spleenDef: 1, phlegm: 1 } },
  { id: "looseStool", label: "便溏", aliases: ["拉肚子", "大便稀"], patterns: { spleenDef: 2, kidneyYang: 1 } },
  { id: "dryMouth", label: "口干", aliases: ["口渴", "咽干"], patterns: { yinDef: 2, phlegm: 1 } },
  { id: "nightSweat", label: "盗汗", aliases: ["夜间出汗", "睡觉出汗"], patterns: { yinDef: 2 } },
  { id: "hotFive", label: "五心烦热", aliases: ["手脚心热", "虚热", "烦热"], patterns: { yinDef: 2 } },
  { id: "insomnia", label: "失眠", aliases: ["睡不好", "入睡困难", "多梦"], patterns: { yinDef: 1, heartSpleen: 2 } },
  { id: "palpitation", label: "心悸", aliases: ["心慌", "心跳快"], patterns: { heartSpleen: 2, yinDef: 1 } },
  { id: "poorAppetite", label: "食欲差", aliases: ["没胃口", "不想吃", "纳差"], patterns: { spleenDef: 2, heartSpleen: 1, phlegm: 1 } },
  { id: "bloating", label: "腹胀", aliases: ["肚子胀", "胃胀"], patterns: { spleenDef: 2, liverStag: 1 } },
  { id: "ribPain", label: "胁肋胀痛", aliases: ["两肋胀", "胁痛", "胸口胀"], patterns: { liverStag: 2 } },
  { id: "depressed", label: "情绪抑郁", aliases: ["心情差", "郁闷", "爱叹气", "烦躁"], patterns: { liverStag: 2, heartSpleen: 1 } },
  { id: "stabbing", label: "刺痛", aliases: ["固定痛", "瘀痛", "痛有定处"], patterns: { liverStag: 2 } },
  { id: "palpitations", label: "多梦", aliases: ["梦多", "睡不踏实"], patterns: { heartSpleen: 2 } },
  { id: "phlegm", label: "痰多", aliases: ["有痰", "痰黏"], patterns: { phlegm: 2 } },
  { id: "chestTight", label: "胸闷", aliases: ["胸口闷", "憋闷"], patterns: { phlegm: 2, liverStag: 1 } },
  { id: "heaviness", label: "身体沉重", aliases: ["困重", "四肢沉重"], patterns: { phlegm: 2, spleenDef: 1 } },
  { id: "dizziness", label: "头晕", aliases: ["眩晕", "头昏"], patterns: { phlegm: 1, yinDef: 1, heartSpleen: 1 } },
];

export const FORMULAS = {
  jinkui: {
    name: "金匮肾气丸",
    herbs: ["附子", "桂枝", "熟地黄", "山茱萸", "山药", "茯苓", "泽泻", "牡丹皮"],
    actions: "温补肾阳，化气行水",
    pattern: "kidneyYang",
    note: "经典方名示例；不含剂量，需在执业医师指导下使用。",
  },
  yougui: {
    name: "右归丸",
    herbs: ["熟地黄", "山药", "山茱萸", "枸杞子", "鹿角胶", "菟丝子", "杜仲", "当归", "肉桂", "附子"],
    actions: "温补肾阳，填精益髓",
    pattern: "kidneyYang",
    note: "经典方名示例；不含剂量。",
  },
  liuwei: {
    name: "六味地黄丸",
    herbs: ["熟地黄", "山茱萸", "山药", "泽泻", "茯苓", "牡丹皮"],
    actions: "滋阴补肾",
    pattern: "yinDef",
    note: "经典方名示例；不含剂量。",
  },
  zhibai: {
    name: "知柏地黄丸",
    herbs: ["知母", "黄柏", "熟地黄", "山茱萸", "山药", "泽泻", "茯苓", "牡丹皮"],
    actions: "滋阴降火",
    pattern: "yinDef",
    note: "经典方名示例；不含剂量。",
  },
  xuefu: {
    name: "血府逐瘀汤",
    herbs: ["桃仁", "红花", "当归", "生地黄", "川芎", "赤芍", "牛膝", "桔梗", "柴胡", "枳壳", "甘草"],
    actions: "活血化瘀，行气止痛",
    pattern: "liverStag",
    note: "经典方名示例；不含剂量。",
  },
  xiaoyao: {
    name: "逍遥散",
    herbs: ["柴胡", "当归", "白芍", "白术", "茯苓", "甘草", "薄荷", "生姜"],
    actions: "疏肝解郁，健脾养血",
    pattern: "liverStag",
    note: "经典方名示例；不含剂量。",
  },
  shenling: {
    name: "参苓白术散",
    herbs: ["人参", "茯苓", "白术", "山药", "白扁豆", "莲子", "薏苡仁", "砂仁", "桔梗", "甘草"],
    actions: "健脾益气，渗湿止泻",
    pattern: "spleenDef",
    note: "经典方名示例；不含剂量。",
  },
  sijunzi: {
    name: "四君子汤",
    herbs: ["人参", "白术", "茯苓", "甘草"],
    actions: "益气健脾",
    pattern: "spleenDef",
    note: "经典方名示例；不含剂量。",
  },
  guipi: {
    name: "归脾汤",
    herbs: ["黄芪", "龙眼肉", "白术", "茯神", "酸枣仁", "人参", "木香", "甘草", "当归", "远志"],
    actions: "益气补血，健脾养心",
    pattern: "heartSpleen",
    note: "经典方名示例；不含剂量。",
  },
  erchen: {
    name: "二陈汤",
    herbs: ["半夏", "橘红", "茯苓", "甘草"],
    actions: "燥湿化痰，理气和中",
    pattern: "phlegm",
    note: "经典方名示例；不含剂量。",
  },
};

const PATTERN_BASE = {
  kidneyYang: {
    id: "kidneyYang",
    name: "肾阳虚",
    subtitle: "阳不制阴 · 寒从内生",
    description: "阳气不足，温煦无力：畏寒、腰膝酸软、夜尿多、精神不振。肾与督脉失于温养，气化与血行偏慢。",
    before: { yin: 0.62, yang: 0.22, qi: 0.55, blood: 0.70, stagnation: 0.38, inflammation: 0.0, blockedMeridian: "KI" },
    after: { yin: 0.52, yang: 0.46, qi: 0.95, blood: 0.95, stagnation: 0.08, inflammation: 0.0, blockedMeridian: "" },
    organs: ["Kidneys", "Spleen", "Bladder"],
    meridians: ["KI", "DU", "BL"],
    formula: "jinkui",
    alternatives: ["yougui"],
    improvements: ["肾器官由暗转亮", "肾经/督脉流速提升", "下焦瘀滞下降", "太极失衡减缓"],
    accent: "#5ea8ff",
  },
  yinDef: {
    id: "yinDef",
    name: "肾阴虚 / 阴虚火旺",
    subtitle: "阴不制阳 · 虚火内生",
    description: "阴液不足，虚热内扰：口干、盗汗、五心烦热、腰酸耳鸣。心肾失于濡润，气机偏快而浮躁。",
    before: { yin: 0.20, yang: 0.64, qi: 1.18, blood: 0.88, stagnation: 0.08, inflammation: 0.72, blockedMeridian: "HT" },
    after: { yin: 0.46, yang: 0.52, qi: 1.02, blood: 1.0, stagnation: 0.05, inflammation: 0.12, blockedMeridian: "" },
    organs: ["Kidneys", "Heart", "Lungs", "Brain"],
    meridians: ["KI", "HT", "LU"],
    formula: "liuwei",
    alternatives: ["zhibai"],
    improvements: ["心搏由快转稳", "虚火/炎症下降", "肾与心经趋于柔和", "脑与肺的过亮缓解"],
    accent: "#ff8a5b",
  },
  liverStag: {
    id: "liverStag",
    name: "肝郁气滞 / 气滞血瘀",
    subtitle: "气停血滞 · 不通则痛",
    description: "情志不遂，气机郁滞，久则血行瘀阻：胁肋胀痛、善叹息、刺痛、情绪低落。肝经出现明显阻滞，瘀点沿经聚集。",
    before: { yin: 0.48, yang: 0.44, qi: 0.34, blood: 0.30, stagnation: 0.90, inflammation: 0.20, blockedMeridian: "LR" },
    after: { yin: 0.50, yang: 0.50, qi: 0.95, blood: 0.92, stagnation: 0.12, inflammation: 0.05, blockedMeridian: "" },
    organs: ["Liver", "Gallbladder", "Spleen"],
    meridians: ["LR", "GB", "PC"],
    formula: "xuefu",
    alternatives: ["xiaoyao"],
    improvements: ["肝经紫色阻滞消退", "瘀点减少", "血流与气机恢复", "太极旋转趋于平稳"],
    accent: "#b06cff",
  },
  spleenDef: {
    id: "spleenDef",
    name: "脾胃虚弱",
    subtitle: "运化无力 · 湿浊内生",
    description: "脾胃气虚，运化失健：食欲差、腹胀、便溏、乏力。脾经与胃经推动无力，水湿停聚。",
    before: { yin: 0.52, yang: 0.38, qi: 0.55, blood: 0.65, stagnation: 0.32, inflammation: 0.0, blockedMeridian: "SP" },
    after: { yin: 0.50, yang: 0.50, qi: 0.95, blood: 0.92, stagnation: 0.08, inflammation: 0.0, blockedMeridian: "" },
    organs: ["Spleen", "Stomach", "Pancreas"],
    meridians: ["SP", "ST", "REN"],
    formula: "shenling",
    alternatives: ["sijunzi"],
    improvements: ["脾器官亮度恢复", "脾胃经流速提升", "中焦湿滞下降", "整体气机回升"],
    accent: "#e8b44c",
  },
  heartSpleen: {
    id: "heartSpleen",
    name: "心脾两虚",
    subtitle: "气血生化不足 · 心神失养",
    description: "思虑过度，心脾两伤：心悸、失眠、多梦、健忘、食欲差、乏力。气血不足以奉养心神。",
    before: { yin: 0.45, yang: 0.40, qi: 0.52, blood: 0.58, stagnation: 0.15, inflammation: 0.10, blockedMeridian: "HT" },
    after: { yin: 0.50, yang: 0.50, qi: 0.95, blood: 0.95, stagnation: 0.05, inflammation: 0.02, blockedMeridian: "" },
    organs: ["Heart", "Spleen", "Brain"],
    meridians: ["HT", "SP", "PC"],
    formula: "guipi",
    alternatives: [],
    improvements: ["心搏更有节律", "心血与脾气回升", "脑神明亮", "睡眠相关经络趋稳"],
    accent: "#ffb36b",
  },
  phlegm: {
    id: "phlegm",
    name: "痰湿内阻",
    subtitle: "湿聚成痰 · 阻滞气机",
    description: "脾失健运，湿聚成痰：身体沉重、胸闷、痰多、苔厚腻。气机被湿浊所困，三焦水道不畅。",
    before: { yin: 0.60, yang: 0.45, qi: 0.50, blood: 0.65, stagnation: 0.55, inflammation: 0.15, blockedMeridian: "SP" },
    after: { yin: 0.52, yang: 0.50, qi: 0.90, blood: 0.90, stagnation: 0.15, inflammation: 0.05, blockedMeridian: "" },
    organs: ["Spleen", "Lungs", "Stomach"],
    meridians: ["SP", "ST", "REN"],
    formula: "erchen",
    alternatives: [],
    improvements: ["脾肺亮度回升", "中上焦湿滞下降", "经络流动变清", "身体沉重感减轻"],
    accent: "#8fd3a8",
  },
};

export const PATTERNS = PATTERN_BASE;

export function patternSymptoms(patternId) {
  return SYMPTOMS.filter(s => (s.patterns[patternId] || 0) > 0).map(s => s.label);
}

export function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpState(a, b, t) {
  t = clamp(t);
  return {
    yin: lerp(a.yin, b.yin, t),
    yang: lerp(a.yang, b.yang, t),
    qi: lerp(a.qi, b.qi, t),
    blood: lerp(a.blood, b.blood, t),
    stagnation: lerp(a.stagnation, b.stagnation, t),
    inflammation: lerp(a.inflammation, b.inflammation, t),
    blockedMeridian: t < 0.55 ? a.blockedMeridian : b.blockedMeridian,
  };
}
