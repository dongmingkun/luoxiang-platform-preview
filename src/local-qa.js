/**
 * 络象经纬 · 本地离线可溯源问答引擎（知识图谱 + 关键词加权检索 + 3D 联动指令）
 * 严格限定于中医理论教学问答，自动拦截临床诊断、处方与剂量类提问；100% 本地运行、零上传。
 */
import { BONE_CUN_RULES } from "./cun-locator.js?v=20261127lab";
import { KG_NODES } from "./tcm-kg.js?v=20261127lab";

const CLINICAL_GUARD_RE = /(开药|开方|处方|几克|多少克|剂量|吃什么药|诊断|确诊|癌症|肿瘤|怀孕|孕妇|急救|血压高怎么吃|血糖高怎么吃)/;

export const QA_CORPUS = [
  {
    id: "qa_weiqi_night",
    question: "卫气夜里怎么走？",
    keywords: ["卫气", "夜里", "夜间", "晚上", "阴分", "二十五度", "五脏", "怎么走", "卫气行"],
    answer: "按《灵枢·卫气行》，卫气一日一夜五十周于身：白昼行于阳分（体表与三阳经）二十五周；入夜后自足少阴肾经注入五脏，严格按五行相克次序「肾 → 心 → 肺 → 肝 → 脾 → 复归于肾」周行阴分二十五周，温养五脏，使人安睡。",
    source: "《灵枢·卫气行》",
    quote: "「卫气之行，一日一夜五十周于身，昼日行于阳二十五周，夜行于阴二十五周，周于五脏。……其始入于阴，常从足少阴注于肾，肾注于心，心注于肺，肺注于肝，肝注于脾，脾复注于肾为周。」",
    actionLabel: "已联动 3D：切换夜间卫阳入里，按肾→心→肺→肝→脾高亮流注",
    action: { type: "weiqi_night", organs: ["Kidneys", "Heart", "Lungs", "Liver", "Spleen"], meridians: ["KI", "HT", "LU", "LR", "SP"], night: true },
    kgNodeId: "cls_weiqi",
  },
  {
    id: "qa_liver_lung",
    question: "为什么说“肝左升、肺右降，脾胃居中为枢”？",
    keywords: ["肝", "肺", "左升", "右降", "脾胃", "枢机", "升降", "刺禁论", "四圣心源"],
    answer: "中医“肝生于左，肺藏于右”并非指解剖实体的左右，而是指人体气机圆运动的升降方位：左路肝木随脾气升清而条达上行、化生心火；右路肺金随胃气通降而肃降收敛、下归肾水；中焦脾升胃降为枢纽，中气一转则四维升降常通。",
    source: "《素问·刺禁论》 / 黄元御《四圣心源》",
    quote: "「脏有要害，不可不察，肝生于左，肺藏于右，心部于表，肾治于里，脾为之使，胃为之市。」；「中气者，和济水火之机，升降金木之轴。」",
    actionLabel: "已联动 3D：高亮肝、肺、脾、胃及对应四经",
    action: { type: "focus", organs: ["Liver", "Lungs", "Spleen", "Stomach"], meridians: ["LR", "LU", "SP", "ST"], focusOrgan: "Stomach", night: false },
    kgNodeId: "cls_cijin",
  },
  {
    id: "qa_st36",
    question: "足三里怎么用骨度分寸定位？",
    keywords: ["足三里", "ST36", "骨度", "分寸", "胃经", "定位", "取穴", "小腿"],
    answer: "足三里（ST36）属足阳明胃经合穴。按 GB/T 12346 骨度分寸：腘横纹至外踝尖折作 16 寸，在小腿外侧、犊鼻（外膝眼）下 3 寸，胫骨前嵴外 1 横指（中指）处。系统已根据当前模型身高自动换算下肢局部 1 寸物理长度并在 3D 体表标出落点。",
    source: "GB/T 12346-2021《经穴名称与定位》 / 《灵枢·本输》",
    quote: "「足三里（ST36）：在小腿外侧，犊鼻下 3 寸，犊鼻与解溪连线上。」",
    actionLabel: "已联动 3D：高亮足阳明胃经并聚焦足三里 ST36",
    action: { type: "acupoint", acupointId: "ST36", organs: ["Stomach"], meridians: ["ST"], night: false },
    kgNodeId: "acu_st36",
  },
  {
    id: "qa_kidney_du",
    question: "肾阳和督脉是什么关系？命门在哪里？",
    keywords: ["肾阳", "督脉", "命门", "GV4", "坎中一阳", "肾", "腰部"],
    answer: "肾居下焦腰部脊柱两侧、靠后，属坎卦（两阴之中藏一真阳），为先天元阳之根；督脉行于后正中线，为“阳脉之海”，贯脊属肾并上行入脑。督脉要穴命门（GV4）位于第 2 腰椎棘突下凹陷中、平脐，与左右双肾及膀胱经肾俞（BL23）相呼应。",
    source: "《素问·生气通天论》 / 《景岳全书》 / GB/T 12346",
    quote: "「阳气者，若天与日，失其所，则折寿而不彰。」；「命门为元气之根，为水火之宅。」",
    actionLabel: "已联动 3D：旋转/高亮督脉与双肾，聚焦命门 GV4",
    action: { type: "acupoint", acupointId: "GV4", organs: ["Kidneys"], meridians: ["DU", "KI"], night: false },
    kgNodeId: "acu_gv4",
  },
  {
    id: "qa_huangqi",
    question: "黄芪归哪些经？在平台里关联了什么经典方？",
    keywords: ["黄芪", "归经", "归脾汤", "药材", "脾经", "肺经", "补气"],
    answer: "按教学知识图谱关联：黄芪性微温、味甘，归肺经、脾经，助中焦脾气升清与上焦卫阳固表；在本平台教学案例库中关联经典方示例「归脾汤（心脾两虚）」。本回答仅作理论归经教学，不提供用药处方或剂量。",
    source: "平台知识图谱 · 药材原文库（herbs.html?q=黄芪）& 教师端经典方表",
    quote: "可在「药材资料」页核对黄芪原始记录行号、同名差异与 SHA-256 完整性校验。",
    actionLabel: "已联动 3D：高亮手太阴肺经与足太阴脾经",
    action: { type: "focus", organs: ["Spleen", "Lungs"], meridians: ["SP", "LU"], focusOrgan: "Spleen", night: false },
    link: { href: "herbs.html?q=%E9%BB%84%E8%8A%AA", text: "前往药材资料核对「黄芪」原文 ↗" },
    kgNodeId: "hrb_huangqi",
  },
  {
    id: "qa_sp6",
    question: "三阴交为什么叫“三阴交”？如何定位？",
    keywords: ["三阴交", "SP6", "足太阴", "肝脾肾", "内踝", "定位"],
    answer: "三阴交（SP6）为足太阴脾经要穴，同时是足太阴脾经、足少阴肾经、足厥阴肝经三条足三阴经的交会之处，故名三阴交。按骨度分寸：胫骨内侧髁下方至内踝尖折作 13 寸，取内踝尖上 3 寸、胫骨内侧缘后际。",
    source: "GB/T 12346-2021《经穴名称与定位》 / 《针灸甲乙经》",
    quote: "「三阴交（SP6）：在小腿内侧，内踝尖上 3 寸，胫骨内侧缘后际。」",
    actionLabel: "已联动 3D：高亮足太阴脾经并聚焦三阴交 SP6",
    action: { type: "acupoint", acupointId: "SP6", organs: ["Spleen", "Kidneys", "Liver"], meridians: ["SP", "KI", "LR"], night: false },
    kgNodeId: "acu_sp6",
  },
];

export const PRESET_QUESTIONS = QA_CORPUS.map(q => q.question);

export function queryLocalQA(rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) {
    return {
      ok: false,
      blocked: false,
      answer: "请输入中医理论、经脉循行或骨度定位问题，例如「卫气夜里怎么走」或「足三里怎么定位」。",
    };
  }

  // 合规红线拦截：严守教学定位，不作临床诊疗/处方/剂量回答
  if (CLINICAL_GUARD_RE.test(query)) {
    return {
      ok: true,
      blocked: true,
      answer: "【教学边界提示】本系统为中医理论与三维解剖教学平台，不提供临床诊断、开具处方、用药剂量或个人诊疗建议。如需就医请咨询执业医师；您可改问经脉循行、脏腑升降或国标穴位骨度定位等理论问题。",
      source: "平台学术与合规边界声明",
      quote: "本地离线教学检索 · 零上传 · 非医疗器械",
      actionLabel: "未触发诊疗动作（已按合规边界拦截）",
      action: null,
    };
  }

  const lower = query.toLowerCase();

  // 1. 优先精确匹配 18 个国标穴位名或编码
  const matchedRule = BONE_CUN_RULES.find(
    r => query.includes(r.name) || lower.includes(r.id.toLowerCase()),
  );
  if (matchedRule) {
    const curated = QA_CORPUS.find(c => c.action?.acupointId === matchedRule.id);
    if (curated) return { ok: true, blocked: false, ...curated, confidence: 0.96 };
    return {
      ok: true,
      blocked: false,
      question: query,
      answer: `${matchedRule.name}（${matchedRule.id}）归属${matchedRule.meridianName}，位于${matchedRule.region}。骨度分寸定位：${matchedRule.formula}（${matchedRule.cunSpec}）。`,
      source: "GB/T 12346-2021《经穴名称与定位》 · 骨度分寸算法库",
      quote: `${matchedRule.name}（${matchedRule.id}）：${matchedRule.formula}。`,
      actionLabel: `已联动 3D：高亮${matchedRule.meridianName}并聚焦 ${matchedRule.name} ${matchedRule.id}`,
      action: { type: "acupoint", acupointId: matchedRule.id, organs: [matchedRule.organ], meridians: [matchedRule.meridian], night: false },
      confidence: 0.92,
    };
  }

  // 2. 语料库加权关键词检索
  let best = null;
  let bestScore = 0;
  for (const item of QA_CORPUS) {
    let s = 0;
    for (const kw of item.keywords) {
      if (lower.includes(kw.toLowerCase())) s += kw.length >= 3 ? 3 : 2;
    }
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  if (best && bestScore >= 2) {
    return { ok: true, blocked: false, ...best, confidence: Math.min(0.95, 0.72 + bestScore * 0.04) };
  }

  // 3. 回退到知识图谱节点检索
  const kgHit = KG_NODES.find(n => query.includes(n.label.replace(/（.*?）/g, "")) || n.summary.includes(query));
  if (kgHit) {
    return {
      ok: true,
      blocked: false,
      question: query,
      answer: `图谱命中节点【${kgHit.label}】：${kgHit.summary}`,
      source: "络象经纬 · 本地中医教学知识图谱",
      quote: kgHit.summary,
      actionLabel: `已联动 3D：高亮【${kgHit.label}】关联脏腑/经脉`,
      action: { type: "focus", organs: kgHit.target?.organs || [], meridians: kgHit.target?.meridians || [], acupointId: kgHit.target?.acupoint || null, night: kgHit.target?.mode === "night" },
      link: kgHit.link ? { href: kgHit.link, text: `前往关联视图 ↗` } : null,
      kgNodeId: kgHit.id,
      confidence: 0.80,
    };
  }

  return {
    ok: true,
    blocked: false,
    question: query,
    answer: "本地教学知识库暂未命中该问题的确切出处（本系统坚持“有据可查、不凭空编造”原则）。建议尝试询问：卫气夜行顺序、肝左升肺右降出处、足三里/三阴交/命门骨度定位，或黄芪归经与经典方关联。",
    source: "本地可溯源检索引擎 · 未命中诚实拒答",
    quote: "仅返回具备明确经典条文或 GB/T 12346 出处的教学条目。",
    actionLabel: "未触发 3D 联动",
    action: null,
    confidence: 0,
  };
}
