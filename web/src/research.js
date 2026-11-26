// 络象经纬 · 研究模式
// 纯前端、无后端；作答只保存在 sessionStorage，完成后导出 CSV。
// 研究只使用标准案例；不收集姓名、学号、病史或受试者自己的症状。

const STORAGE_KEY = "tcm_research_session_v1";
const FORM_VERSION = "1.0";

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const KNOWLEDGE_A = [
  {
    q: "下列属于“阳”的属性是：",
    options: ["静止", "寒冷", "明亮", "下降"],
    answer: 2,
  },
  {
    q: "“阴平阳秘，精神乃治”主要说明：",
    options: ["阴阳对立", "阴阳平衡", "阴阳转化", "阴阳无限可分"],
    answer: 1,
  },
  {
    q: "五行相生的顺序是：",
    options: ["木→火→土→金→水", "木→土→水→火→金", "金→木→水→火→土", "水→火→木→土→金"],
    answer: 0,
  },
  {
    q: "中医认为“主疏泄”的脏是：",
    options: ["心", "肝", "脾", "肺"],
    answer: 1,
  },
  {
    q: "下列属于“心”的主要生理功能的是：",
    options: ["主运化", "主疏泄", "主血脉", "主水"],
    answer: 2,
  },
  {
    q: "“主运化”的脏是：",
    options: ["脾", "肺", "肾", "肝"],
    answer: 0,
  },
  {
    q: "中医认为“藏精，主生长发育与生殖”的脏是：",
    options: ["心", "肾", "脾", "肺"],
    answer: 1,
  },
  {
    q: "六腑的共同生理特点是：",
    options: ["传化物而不藏", "藏精气而不泻", "主藏血", "主气司呼吸"],
    answer: 0,
  },
  {
    q: "下列属于奇经八脉的是：",
    options: ["手太阴肺经", "足阳明胃经", "督脉", "足厥阴肝经"],
    answer: 2,
  },
  {
    q: "子午流注中，卯时（5–7 点）当令的经脉是：",
    options: ["肺经", "大肠经", "胃经", "脾经"],
    answer: 1,
  },
];

const KNOWLEDGE_B = [
  {
    q: "下列属于“阴”的属性是：",
    options: ["明亮", "温热", "安静", "上升"],
    answer: 2,
  },
  {
    q: "“阴阳互根”主要说明：",
    options: ["阴阳相互对立", "阴阳相互依存", "阴阳此消彼长", "阴阳可无限分割"],
    answer: 1,
  },
  {
    q: "五行相克的顺序中，木克：",
    options: ["土", "水", "火", "金"],
    answer: 0,
  },
  {
    q: "中医认为“主藏血”的脏是：",
    options: ["肝", "心", "脾", "肾"],
    answer: 0,
  },
  {
    q: "下列属于“肺”的主要生理功能的是：",
    options: ["主运化", "主气、司呼吸", "主藏精", "主疏泄"],
    answer: 1,
  },
  {
    q: "“主水”的脏是：",
    options: ["心", "肝", "肾", "脾"],
    answer: 2,
  },
  {
    q: "六腑中“受盛之官”指的是：",
    options: ["胆", "胃", "小肠", "膀胱"],
    answer: 2,
  },
  {
    q: "下列属于奇经八脉的是：",
    options: ["手少阴心经", "任脉", "足太阳膀胱经", "手阳明大肠经"],
    answer: 1,
  },
  {
    q: "子午流注中，寅时（3–5 点）当令的经脉是：",
    options: ["肺经", "大肠经", "胃经", "肝经"],
    answer: 0,
  },
  {
    q: "“血为气之母”主要说明：",
    options: ["气能生血", "气能行血", "血能载气、养气", "气能摄血"],
    answer: 2,
  },
];

const REASONING_ITEMS = [
  {
    q: "某阳虚教学案例：第 0 天阳气 0.22、气机 0.55、瘀滞 0.38；第 28 天阳气 0.46、气机 0.95、瘀滞 0.08。最合理的教学解释是：",
    options: [
      "阳气越高越好，应无限温阳",
      "温阳方向使阳气回升、气机改善、瘀滞下降，阴阳更趋平衡",
      "阴气必须降为 0",
      "数据证明该方剂治愈了患者",
    ],
    answer: 1,
  },
  {
    q: "某肝郁教学案例：用药后气机 0.34→0.95、瘀滞 0.90→0.12、炎症 0.20→0.05。最直接对应的变化是：",
    options: [
      "骨骼数量增加",
      "血型改变",
      "气机改善、瘀滞下降",
      "身高增加",
    ],
    answer: 2,
  },
  {
    q: "看到“用药后曲线改善”，最严谨的判断是：",
    options: [
      "说明该药一定有效",
      "说明患者已经治愈",
      "可以据此给患者开方",
      "这是教学参数的数据映射，可帮助理解趋势，但不能证明临床疗效",
    ],
    answer: 3,
  },
];

const DEMOGRAPHICS = [
  { key: "gender", label: "性别", options: [["1", "男"], ["2", "女"], ["3", "不愿透露"]] },
  { key: "grade", label: "年级", options: [["1", "大一"], ["2", "大二"], ["3", "大三"], ["4", "大四"], ["5", "研究生"]] },
  {
    key: "major",
    label: "专业类别",
    options: [["1", "中医/中西医结合"], ["2", "临床医学"], ["3", "护理/助产"], ["4", "药学/中药学"], ["5", "其他医学相关"], ["6", "非医学"]],
  },
  { key: "prior_tcm", label: "此前是否系统学过中医基础理论/中医药课程", options: [["1", "是"], ["0", "否"]] },
  { key: "family_tcm", label: "家庭中是否有中医药从业者/长期使用者", options: [["1", "是"], ["0", "否"], ["2", "不确定"]] },
  { key: "tech_frequency", label: "使用数字学习产品（App/网页/VR/3D）的频率", options: [["1", "几乎不用"], ["2", "偶尔"], ["3", "每周"], ["4", "每天"]] },
  { key: "tech_familiarity", label: "对 3D/游戏类界面的熟悉度", options: [["1", "1 完全不熟"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7 非常熟"]] },
  { key: "prior_exposure", label: "此前对“阴阳/经络/脏腑”的接触程度", options: [["1", "从未"], ["2", "听过但不了解"], ["3", "了解一些"], ["4", "比较了解"]] },
];

const ATTITUDE_ITEMS = [
  "中医药文化是中华优秀传统文化的重要组成部分。",
  "我对中医药的阴阳、经络等理论感兴趣。",
  "我认为医学生学习中医药基础知识是有价值的。",
  "我愿意参加中医药文化讲座、展览或体验活动。",
  "我认为中医药所倡导的整体观、治未病等理念对现代健康生活有启发。",
  "我愿意向他人介绍中医药文化。",
  "我认为用数字技术呈现中医药文化是值得尝试的。",
  "总体而言，我对中医药持积极态度。",
];

const IDENTITY_ITEMS = [
  "我为中医药文化感到自豪。",
  "我认为医学生有责任传承中医药文化。",
  "中医药文化让我更认同中华文化。",
  "我愿意在社交媒体上分享中医药文化内容。",
  "我认为中医药文化应该在创新中传承。",
];

const INTENTION_ITEMS = [
  "我愿意继续学习中医药相关课程或内容。",
  "我愿意推荐同学使用这类 3D 学习工具。",
  "未来我愿意参与中医药文化传播活动。",
];

const HEALTH_ITEMS = [
  "我能判断网络上的健康信息是否可靠。",
  "我知道如何查找权威的健康信息。",
  "我理解“文化理解”与“医疗诊疗”的区别。",
  "我知道身体不适时应寻求专业医疗帮助。",
];

const ENGAGEMENT_ITEMS = [
  "体验时我很专注。",
  "我愿意主动探索不同图层和案例。",
  "体验时我觉得时间过得很快。",
  "遇到看不懂的地方，我会继续尝试。",
  "这次体验激发了我的好奇心。",
  "我认真完成了学习任务。",
];

const PRESENCE_ITEMS = [
  "我仿佛“看见”了身体内部的结构。",
  "旋转、透视让我更容易理解空间关系。",
  "经络和脏腑的变化是直观的。",
  "3D 呈现比平面图更能让我投入。",
  "我能把看到的 3D 结构与中医概念联系起来。",
];

const SUS_ITEMS = [
  "我愿意经常使用这个系统。",
  "我觉得这个系统没有必要这么复杂。",
  "我觉得这个系统容易使用。",
  "我需要技术人员帮助才能使用这个系统。",
  "我觉得系统各功能整合得很好。",
  "我觉得系统中有太多不一致的地方。",
  "我认为大多数人能很快学会使用这个系统。",
  "我觉得这个系统用起来很麻烦。",
  "我对使用这个系统很有信心。",
  "我需要先学很多东西才能使用这个系统。",
];
const SUS_REVERSED = new Set([2, 4, 6, 8, 10]);

const TAM_ITEMS = [
  "这类 3D 工具能帮助我理解中医概念。",
  "它能提高我的学习效率。",
  "我觉得操作很容易。",
  "我很快就上手了。",
  "我愿意在课程或科普活动中使用它。",
  "我愿意把它推荐给同学。",
];

const SCALE_META = {
  attitude: { prefix: "AT", items: ATTITUDE_ITEMS },
  identity: { prefix: "ID", items: IDENTITY_ITEMS },
  intention: { prefix: "BI", items: INTENTION_ITEMS },
  health_literacy: { prefix: "HL", items: HEALTH_ITEMS },
  engagement: { prefix: "EN", items: ENGAGEMENT_ITEMS },
  presence: { prefix: "PR", items: PRESENCE_ITEMS },
  tam: { prefix: "TAM", items: TAM_ITEMS },
};

const COLUMNS = [
  "participant_id", "group", "gender", "grade", "major", "prior_tcm", "family_tcm",
  "tech_frequency", "tech_familiarity", "prior_exposure",
  "knowledge_pre", "pre_attitude", "pre_identity", "pre_intention", "pre_health_literacy",
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => `AT${i}_pre`),
  ...[1, 2, 3, 4, 5].map(i => `ID${i}_pre`),
  ...[1, 2, 3].map(i => `BI${i}_pre`),
  ...[1, 2, 3, 4].map(i => `HL${i}_pre`),
  "knowledge_post", "post_attitude", "post_identity", "post_intention", "post_health_literacy",
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => `AT${i}_post`),
  ...[1, 2, 3, 4, 5].map(i => `ID${i}_post`),
  ...[1, 2, 3].map(i => `BI${i}_post`),
  ...[1, 2, 3, 4].map(i => `HL${i}_post`),
  "engagement", "presence", "sus", "tam",
  ...[1, 2, 3, 4, 5, 6].map(i => `EN${i}`),
  ...[1, 2, 3, 4, 5].map(i => `PR${i}`),
  ...[1, 2, 3, 4, 5, 6].map(i => `TAM${i}`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `SUS${i}`),
  "attention_check", "reasoning_post", "duration_min", "task_completed", "consent",
  "open_1", "open_2", "open_3", "open_4", "notes",
];

let state = defaultState();
let timerId = null;

function defaultState() {
  return {
    version: FORM_VERSION,
    hostLocked: false,
    participantId: "",
    group: null,
    started: false,
    completed: false,
    startedAt: null,
    learningStartedAt: null,
    completedAt: null,
    currentStep: 1,
    taskCompleted: 0,
    demo: null,
    pre: null,
    post: null,
    finalRow: null,
    finalCsv: "",
  };
}

// ---------- 渲染 ----------

function renderDemographics() {
  const box = $("#demographics");
  box.innerHTML = DEMOGRAPHICS.map((d) => `
    <div class="r-field" data-demo-field="${d.key}">
      <label for="demo-${d.key}">${d.label} <b style="color:var(--red)">*</b></label>
      <select id="demo-${d.key}" class="r-select" data-demo="${d.key}">
        <option value="">请选择</option>
        ${d.options.map(([v, label]) => `<option value="${v}">${label}</option>`).join("")}
      </select>
    </div>
  `).join("");
}

function renderKnowledge(box, items, prefix) {
  box.innerHTML = items.map((item, i) => {
    const name = `${prefix}_q${i + 1}`;
    return `
      <div class="q" data-required-group="${name}">
        <div class="q-title"><span class="q-num">${i + 1}</span><span>${item.q} <b style="color:var(--red)">*</b></span></div>
        <div class="q-options" role="radiogroup" aria-label="${item.q}">
          ${item.options.map((opt, j) => `
            <label class="q-option">
              <input type="radio" name="${name}" value="${j}" />
              <span>${String.fromCharCode(65 + j)}. ${opt}</span>
            </label>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function renderLikert(box, key, stage, items, max = 7) {
  const low = max === 5 ? "非常不同意" : "非常不同意";
  const high = max === 5 ? "非常同意" : "非常同意";
  const values = Array.from({ length: max }, (_, i) => i + 1);
  box.innerHTML = `
    <div class="r-scale-head">
      <p>1 = ${low}，${max} = ${high}</p>
      <p class="r-hint" data-scale-progress="${key}_${stage}"></p>
    </div>
    <div class="likert-wrap">
      <table class="likert">
        <thead>
          <tr>
            <th>题目</th>
            ${values.map((v) => `<th>${v}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${items.map((text, i) => {
            const name = `${key}_${stage}_${i + 1}`;
            return `
              <tr data-required-group="${name}">
                <td>${i + 1}. ${text} <b style="color:var(--red)">*</b></td>
                ${values.map((v) => `
                  <td>
                    <input type="radio" name="${name}" value="${v}" aria-label="${text}，${v}" />
                  </td>
                `).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSUS(box) {
  renderLikert(box, "sus", "post", SUS_ITEMS, 5);
}

function renderAttention() {
  const box = $("#attention-check");
  box.innerHTML = `
    <div class="q" data-required-group="attention_check">
      <div class="q-title"><span class="q-num">AC1</span><span>本题请选择“比较同意”（6）。 <b style="color:var(--red)">*</b></span></div>
      <div class="q-options" role="radiogroup" aria-label="注意力检查" style="flex-direction:row;flex-wrap:wrap;gap:14px">
        ${[1, 2, 3, 4, 5, 6, 7].map((v) => `
          <label class="q-option"><input type="radio" name="attention_check" value="${v}" /> <span>${v}</span></label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAllForms() {
  renderDemographics();
  renderKnowledge($("#knowledge-pre"), KNOWLEDGE_A, "kp");
  renderLikert($("#attitude-pre"), "attitude", "pre", ATTITUDE_ITEMS);
  renderLikert($("#identity-pre"), "identity", "pre", IDENTITY_ITEMS);
  renderLikert($("#intention-pre"), "intention", "pre", INTENTION_ITEMS);
  renderLikert($("#health-literacy-pre"), "health_literacy", "pre", HEALTH_ITEMS);

  renderKnowledge($("#knowledge-post"), KNOWLEDGE_B, "kq");
  renderLikert($("#attitude-post"), "attitude", "post", ATTITUDE_ITEMS);
  renderLikert($("#identity-post"), "identity", "post", IDENTITY_ITEMS);
  renderLikert($("#intention-post"), "intention", "post", INTENTION_ITEMS);
  renderLikert($("#health-literacy-post"), "health_literacy", "post", HEALTH_ITEMS);
  renderLikert($("#engagement-post"), "engagement", "post", ENGAGEMENT_ITEMS);
  renderKnowledge($("#reasoning-post"), REASONING_ITEMS, "reason");
  renderLikert($("#presence-post"), "presence", "post", PRESENCE_ITEMS);
  renderSUS($("#sus-post"));
  renderLikert($("#tam-post"), "tam", "post", TAM_ITEMS);
  renderAttention();
}

// ---------- 读取与计分 ----------

function radioVal(name) {
  const el = $(`input[name="${name}"]:checked`);
  return el ? Number(el.value) : null;
}

function selectVal(key) {
  const el = $(`select[data-demo="${key}"]`);
  return el && el.value !== "" ? Number(el.value) : null;
}

function scoreKnowledge(items, prefix) {
  let score = 0;
  items.forEach((item, i) => {
    if (radioVal(`${prefix}_q${i + 1}`) === item.answer) score += 1;
  });
  return score;
}

function sumScale(key, stage, items) {
  let total = 0;
  items.forEach((_, i) => {
    const v = radioVal(`${key}_${stage}_${i + 1}`);
    if (v != null) total += v;
  });
  return total;
}

function susScore() {
  let total = 0;
  SUS_ITEMS.forEach((_, i) => {
    const v = radioVal(`sus_post_${i + 1}`);
    if (v == null) return;
    total += SUS_REVERSED.has(i + 1) ? 5 - v : v - 1;
  });
  return total * 2.5;
}

function collectItems(key, stage, outStage) {
  const meta = SCALE_META[key];
  const out = {};
  meta.items.forEach((_, i) => {
    const suffix = outStage ? `_${outStage}` : "";
    out[`${meta.prefix}${i + 1}${suffix}`] = radioVal(`${key}_${stage}_${i + 1}`);
  });
  return out;
}

function collectSUSItems() {
  const out = {};
  SUS_ITEMS.forEach((_, i) => {
    out[`SUS${i + 1}`] = radioVal(`sus_post_${i + 1}`);
  });
  return out;
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ---------- 本地保存 / 恢复 ----------

function collectFormValues() {
  const values = {};
  $$('input[type="radio"]:checked').forEach((el) => { values[el.name] = el.value; });
  $$("select[data-demo]").forEach((el) => { if (el.value) values[`demo_${el.dataset.demo}`] = el.value; });
  $$('input[type="checkbox"]').forEach((el) => { if (el.id) values[el.id] = el.checked; });
  $$("textarea").forEach((el) => { if (el.id) values[el.id] = el.value; });
  return values;
}

function restoreFormValues(values) {
  if (!values) return;
  Object.entries(values).forEach(([name, value]) => {
    const radios = $$(`input[name="${name}"]`);
    if (radios.length) {
      const hit = radios.find((el) => el.value === String(value));
      if (hit) hit.checked = true;
      return;
    }
    if (name.startsWith("demo_")) {
      const el = $(`select[data-demo="${name.slice(5)}"]`);
      if (el) el.value = String(value);
      return;
    }
    const el = document.getElementById(name);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value;
  });
}

function saveSession() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      meta: state,
      values: collectFormValues(),
    }));
  } catch (err) {
    console.warn("无法保存本机会话", err);
  }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.meta ? data : null;
  } catch (err) {
    console.warn("无法读取本机会话", err);
    return null;
  }
}

function clearSession() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
}

// ---------- UI 小工具 ----------

let toastTimer = null;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2600);
}

function clearErrors(root = document) {
  $$(".is-error", root).forEach((el) => el.classList.remove("is-error"));
}

function validateRadioContainer(box) {
  let missing = 0;
  let first = null;
  const names = new Set($$('input[type="radio"]', box).map((el) => el.name));
  names.forEach((name) => {
    if (!box.querySelector(`input[name="${name}"]:checked`)) {
      missing += 1;
      const group = box.querySelector(`[data-required-group="${name}"]`);
      if (group) {
        group.classList.add("is-error");
        if (!first) first = group;
      }
    }
  });
  return { missing, first };
}

function validateDemographics() {
  let missing = 0;
  let first = null;
  $$("select[data-demo]").forEach((el) => {
    if (!el.value) {
      missing += 1;
      const field = el.closest(".r-field");
      if (field) {
        field.classList.add("is-error");
        if (!first) first = field;
      }
    }
  });
  return { missing, first };
}

function validateScreen(step) {
  clearErrors();
  let missing = 0;
  let first = null;

  const merge = (res) => {
    missing += res.missing;
    if (!first && res.first) first = res.first;
  };

  if (step === 2) {
    merge(validateDemographics());
    ["#knowledge-pre", "#attitude-pre", "#identity-pre", "#intention-pre", "#health-literacy-pre"]
      .forEach((sel) => merge(validateRadioContainer($(sel))));
  }

  if (step === 4) {
    ["#knowledge-post", "#attitude-post", "#identity-post", "#intention-post", "#health-literacy-post", "#engagement-post", "#reasoning-post"]
      .forEach((sel) => merge(validateRadioContainer($(sel))));
    if (state.group === 1) {
      ["#presence-post", "#sus-post", "#tam-post"].forEach((sel) => merge(validateRadioContainer($(sel))));
    }
    merge(validateRadioContainer($("#attention-check")));
  }

  if (missing > 0) {
    toast(`还有 ${missing} 题未完成，请检查标红的题目。`);
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

function updateProgress(step) {
  const screen = step === 2 ? $("#screen-pretest") : step === 4 ? $("#screen-posttest") : null;
  const bar = step === 2 ? $("#pre-progress") : step === 4 ? $("#post-progress") : null;
  if (!screen || !bar) return;

  const names = new Set();
  $$('input[type="radio"]', screen).forEach((el) => {
    if (el.closest("[hidden]")) return;
    names.add(el.name);
  });
  let done = 0;
  names.forEach((name) => {
    if (screen.querySelector(`input[name="${name}"]:checked`)) done += 1;
  });
  const selects = $$("select[data-demo]", screen).filter((el) => !el.closest("[hidden]"));
  selects.forEach((el) => { if (el.value) done += 1; });
  const total = names.size + selects.length;
  bar.style.width = total ? `${Math.min(100, (done / total) * 100)}%` : "0%";

  $$("[data-scale-progress]", screen).forEach((el) => {
    const key = el.dataset.scaleProgress;
    const inputs = $$(`input[name^="${key}_"]`, screen);
    const totalItems = new Set(inputs.map((x) => x.name)).size;
    const answered = new Set(inputs.filter((x) => x.checked).map((x) => x.name)).size;
    el.textContent = totalItems ? `已答 ${answered} / ${totalItems}` : "";
  });
}

function showScreen(step) {
  const map = { 1: "consent", 2: "pretest", 3: "learning", 4: "posttest", 5: "done" };
  $$(".screen").forEach((el) => el.classList.remove("is-active"));
  const screen = $(`#screen-${map[step]}`);
  if (screen) screen.classList.add("is-active");
  $$(".r-step").forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle("is-active", n === step);
    el.classList.toggle("is-done", n < step);
  });
  document.body.classList.toggle("is-started", Boolean(state.started));
  state.currentStep = step;
  window.scrollTo(0, 0);
  if (step === 2 || step === 4) updateProgress(step);
}

function lockHostUI() {
  $("#host-id").disabled = true;
  $("#host-group").disabled = true;
  $("#btn-apply-host").disabled = true;
  $("#host-status").textContent = `已设置：${state.participantId} · ${state.group === 1 ? "实验组（3D）" : "对照组（图文）"}`;
}

function applyHost(auto = false) {
  if (state.started) {
    toast("研究已开始，组别与编号不能更改。");
    lockHostUI();
    return false;
  }
  const id = $("#host-id").value.trim();
  const groupRaw = $("#host-group").value;
  if (!id) {
    if (!auto) toast("请填写匿名受试者编号。");
    return false;
  }
  if (groupRaw !== "0" && groupRaw !== "1") {
    if (!auto) toast("请选择实验组或对照组。");
    return false;
  }
  state.participantId = id.replace(/[^\w\u4e00-\u9fa5-]/g, "").slice(0, 24);
  state.group = Number(groupRaw);
  state.hostLocked = true;
  lockHostUI();
  updateConsentButton();
  saveSession();
  return true;
}

function updateConsentButton() {
  const all = ["#consent-1", "#consent-2", "#consent-3", "#consent-4"].every((sel) => $(sel).checked);
  const ready = all && state.hostLocked && !state.started;
  $("#btn-consent").disabled = !ready;
  $("#consent-hint").textContent = state.hostLocked
    ? (all ? "可以开始前测。" : "请勾选全部同意项。")
    : "请先完成主持者设置，并勾选全部同意项。";
}

// ---------- 计时 ----------

function startTimer() {
  stopTimer();
  if (!state.learningStartedAt) state.learningStartedAt = Date.now();
  const tick = () => {
    const timer = $("#timer");
    if (timer) timer.innerHTML = `${formatTime(Date.now() - state.learningStartedAt)} <small>学习计时</small>`;
  };
  tick();
  timerId = setInterval(tick, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function setupLearning() {
  const isExp = state.group === 1;
  $("#experiment-block").hidden = !isExp;
  $("#control-block").hidden = isExp;
  $("#learning-title").textContent = isExp ? "三维教学系统学习任务" : "图文材料阅读";
  $("#learning-desc").textContent = isExp
    ? "请按任务单使用三维教学系统与数据推演页，重点观察“用药事件—阴阳气血曲线—脏腑/经络 3D 变化”的对应关系。只使用页面里的标准案例/演示数据。"
    : "请阅读下面的图文材料，重点理解阴阳、五行、脏腑、气血、经络、子午流注，以及数据表中用药前后的变化方向。";
  $("#task-done").checked = Boolean(state.taskCompleted);
  $("#btn-learning").disabled = !$("#task-done").checked;
  startTimer();
}

// ---------- 提交 ----------

function lockScreen(selector) {
  $$("input, select, textarea", $(selector)).forEach((el) => { el.disabled = true; });
}

function submitPretest() {
  if (!validateScreen(2)) return;

  const demo = {};
  DEMOGRAPHICS.forEach((d) => { demo[d.key] = selectVal(d.key); });

  state.demo = demo;
  state.pre = {
    knowledge: scoreKnowledge(KNOWLEDGE_A, "kp"),
    attitude: sumScale("attitude", "pre", ATTITUDE_ITEMS),
    identity: sumScale("identity", "pre", IDENTITY_ITEMS),
    intention: sumScale("intention", "pre", INTENTION_ITEMS),
    health_literacy: sumScale("health_literacy", "pre", HEALTH_ITEMS),
    items: {
      ...collectItems("attitude", "pre", "pre"),
      ...collectItems("identity", "pre", "pre"),
      ...collectItems("intention", "pre", "pre"),
      ...collectItems("health_literacy", "pre", "pre"),
    },
  };
  state.started = true;
  if (!state.startedAt) state.startedAt = Date.now();
  state.currentStep = 3;
  if (!state.learningStartedAt) state.learningStartedAt = Date.now();
  lockScreen("#screen-pretest");
  $("#experiment-post").hidden = state.group !== 1;
  showScreen(3);
  setupLearning();
  saveSession();
}

function submitPosttest() {
  if (!validateScreen(4)) return;

  state.taskCompleted = $("#task-done").checked ? 1 : 0;
  state.post = {
    knowledge: scoreKnowledge(KNOWLEDGE_B, "kq"),
    attitude: sumScale("attitude", "post", ATTITUDE_ITEMS),
    identity: sumScale("identity", "post", IDENTITY_ITEMS),
    intention: sumScale("intention", "post", INTENTION_ITEMS),
    health_literacy: sumScale("health_literacy", "post", HEALTH_ITEMS),
    engagement: sumScale("engagement", "post", ENGAGEMENT_ITEMS),
    reasoning: scoreKnowledge(REASONING_ITEMS, "reason"),
    presence: state.group === 1 ? sumScale("presence", "post", PRESENCE_ITEMS) : null,
    sus: state.group === 1 ? susScore() : null,
    tam: state.group === 1 ? sumScale("tam", "post", TAM_ITEMS) : null,
    attentionCheck: radioVal("attention_check") === 6 ? 1 : 0,
    items: {
      ...collectItems("attitude", "post", "post"),
      ...collectItems("identity", "post", "post"),
      ...collectItems("intention", "post", "post"),
      ...collectItems("health_literacy", "post", "post"),
      ...collectItems("engagement", "post", ""),
      ...(state.group === 1 ? collectItems("presence", "post", "") : {}),
      ...(state.group === 1 ? collectItems("tam", "post", "") : {}),
      ...(state.group === 1 ? collectSUSItems() : {}),
    },
  };
  state.completedAt = Date.now();
  state.completed = true;
  state.currentStep = 5;
  state.finalRow = buildRow();
  state.finalCsv = toCsv(COLUMNS, [state.finalRow]);
  stopTimer();
  renderDone();
  showScreen(5);
  saveSession();
}

// ---------- CSV ----------

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(columns, rows) {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((col) => csvCell(row[col])).join(","));
  return [header, ...body].join("\n");
}

function buildRow() {
  const row = {};
  COLUMNS.forEach((col) => { row[col] = ""; });
  const demo = state.demo || {};
  const pre = state.pre || {};
  const post = state.post || {};

  row.participant_id = state.participantId;
  row.group = state.group;
  DEMOGRAPHICS.forEach((d) => { row[d.key] = demo[d.key] ?? ""; });

  row.knowledge_pre = pre.knowledge ?? "";
  row.pre_attitude = pre.attitude ?? "";
  row.pre_identity = pre.identity ?? "";
  row.pre_intention = pre.intention ?? "";
  row.pre_health_literacy = pre.health_literacy ?? "";
  Object.assign(row, pre.items || {});

  row.knowledge_post = post.knowledge ?? "";
  row.post_attitude = post.attitude ?? "";
  row.post_identity = post.identity ?? "";
  row.post_intention = post.intention ?? "";
  row.post_health_literacy = post.health_literacy ?? "";
  row.engagement = post.engagement ?? "";
  row.presence = post.presence ?? "";
  row.sus = post.sus ?? "";
  row.tam = post.tam ?? "";
  Object.assign(row, post.items || {});

  row.attention_check = post.attentionCheck ?? "";
  row.reasoning_post = post.reasoning ?? "";
  row.duration_min = state.startedAt && state.completedAt
    ? ((state.completedAt - state.startedAt) / 60000).toFixed(1)
    : "";
  row.task_completed = state.taskCompleted ? 1 : 0;
  row.consent = 1;
  row.open_1 = $("#open-1").value.trim();
  row.open_2 = $("#open-2").value.trim();
  row.open_3 = $("#open-3").value.trim();
  row.open_4 = $("#open-4").value.trim();
  row.notes = `form=${FORM_VERSION};condition=${state.group === 1 ? "3d" : "text"}`;
  return row;
}

function renderDone() {
  const row = state.finalRow;
  if (!row) return;
  const items = [
    ["组别", row.group === 1 ? "实验组（3D）" : "对照组（图文）", ""],
    ["知识 · 前测", row.knowledge_pre, "/ 10"],
    ["知识 · 后测", row.knowledge_post, "/ 10"],
    ["态度 · 前测", row.pre_attitude, "/ 56"],
    ["态度 · 后测", row.post_attitude, "/ 56"],
    ["文化认同 · 前测", row.pre_identity, "/ 35"],
    ["文化认同 · 后测", row.post_identity, "/ 35"],
    ["学习意愿 · 前测", row.pre_intention, "/ 21"],
    ["学习意愿 · 后测", row.post_intention, "/ 21"],
    ["用药推理 · 后测", row.reasoning_post, "/ 3"],
  ];
  if (row.group === 1) {
    items.push(["SUS 可用性", Number(row.sus).toFixed(1), "/ 100"]);
    items.push(["临场感", row.presence, "/ 35"]);
  }
  $("#summary").innerHTML = items.map(([label, value, unit]) => `
    <div><span>${label}</span><b>${value === "" ? "—" : value}</b>${unit ? `<small>${unit}</small>` : ""}</div>
  `).join("");
  const preview = state.finalCsv.length > 1600 ? `${state.finalCsv.slice(0, 1600)}\n…` : state.finalCsv;
  $("#csv-preview").textContent = preview;
}

function downloadCsv() {
  if (!state.finalCsv) {
    toast("还没有可导出的数据。");
    return;
  }
  const blob = new Blob(["\ufeff" + state.finalCsv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeId = (state.participantId || "participant").replace(/[^\w\u4e00-\u9fa5-]/g, "_");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  a.href = url;
  a.download = `tcm_research_${safeId}_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  toast("CSV 已开始下载，请交给主试。");
}

async function copyCsv() {
  if (!state.finalCsv) {
    toast("还没有可复制的数据。");
    return;
  }
  try {
    await navigator.clipboard.writeText(state.finalCsv);
    toast("CSV 已复制到剪贴板。");
  } catch (err) {
    const ta = document.createElement("textarea");
    ta.value = state.finalCsv;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("CSV 已复制。"); }
    catch (e) { toast("复制失败，请用下载按钮。"); }
    ta.remove();
  }
}

function resetAll() {
  if (!confirm("确定清除本机所有作答并开始新的受试者吗？未导出的数据将丢失。")) return;
  clearSession();
  location.reload();
}

// ---------- 初始化与事件 ----------

function bindEvents() {
  $("#btn-apply-host").addEventListener("click", () => applyHost(false));

  ["#consent-1", "#consent-2", "#consent-3", "#consent-4"].forEach((sel) => {
    $(sel).addEventListener("change", () => {
      updateConsentButton();
      saveSession();
    });
  });

  $("#btn-consent").addEventListener("click", () => {
    if (!state.hostLocked) {
      toast("请先在左侧填写受试者编号并选择组别。");
      return;
    }
    if (!$("#consent-1").checked || !$("#consent-2").checked || !$("#consent-3").checked || !$("#consent-4").checked) {
      toast("请勾选全部同意项。");
      return;
    }
    state.started = true;
    state.startedAt = Date.now();
    state.currentStep = 2;
    showScreen(2);
    saveSession();
  });

  $("#btn-pretest").addEventListener("click", submitPretest);

  $("#task-done").addEventListener("change", () => {
    state.taskCompleted = $("#task-done").checked ? 1 : 0;
    $("#btn-learning").disabled = !$("#task-done").checked;
    saveSession();
  });

  $("#btn-learning").addEventListener("click", () => {
    if (!$("#task-done").checked) {
      toast("请先勾选“我已完成学习任务”。");
      return;
    }
    state.taskCompleted = 1;
    stopTimer();
    $("#experiment-post").hidden = state.group !== 1;
    showScreen(4);
    saveSession();
  });

  $("#btn-posttest").addEventListener("click", submitPosttest);
  $("#btn-download").addEventListener("click", downloadCsv);
  $("#btn-copy").addEventListener("click", copyCsv);
  $("#btn-new").addEventListener("click", resetAll);
  $("#btn-reset").addEventListener("click", resetAll);
  $("#btn-open-3d").addEventListener("click", saveSession);

  document.addEventListener("change", (e) => {
    if (!e.target.matches("input, select, textarea")) return;
    saveSession();
    if (state.currentStep === 2 || state.currentStep === 4) updateProgress(state.currentStep);
  });
  document.addEventListener("input", (e) => {
    if (e.target.matches("textarea")) saveSession();
  });
}

function init() {
  renderAllForms();

  const saved = loadSession();
  if (saved) {
    state = Object.assign(defaultState(), saved.meta || {});
    restoreFormValues(saved.values);
  }

  const params = new URLSearchParams(location.search);
  if (!state.participantId && params.get("id")) state.participantId = params.get("id").trim().slice(0, 24);
  if (state.group === null && (params.get("group") === "0" || params.get("group") === "1")) {
    state.group = Number(params.get("group"));
  }

  if (state.participantId && (state.group === 0 || state.group === 1)) {
    $("#host-id").value = state.participantId;
    $("#host-group").value = String(state.group);
    if (state.hostLocked) lockHostUI();
    else applyHost(true);
  }

  $("#experiment-post").hidden = state.group !== 1;
  updateConsentButton();

  if (state.completed && state.finalCsv) {
    renderDone();
    showScreen(5);
  } else if (state.started) {
    if (state.pre) lockScreen("#screen-pretest");
    let step = [2, 3, 4].includes(state.currentStep) ? state.currentStep : 2;
    if (!state.pre && step !== 2) step = 2;
    if (step === 3) setupLearning();
    showScreen(step);
  } else {
    showScreen(1);
  }

  bindEvents();
  updateProgress(2);
  updateProgress(4);
  window.scrollTo(0, 0);
  setTimeout(() => window.scrollTo(0, 0), 0);
}

init();




