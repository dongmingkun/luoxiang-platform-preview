/**
 * 络象经纬 · 全国“挑战杯”5 分钟答辩接力导览条
 * 仅在 URL 包含 ?defense=1 时激活；零 localStorage / sessionStorage，零外网请求。
 * 跨站计时通过 URL 查询参数 &t=<秒> 无状态传递，不影响任何离线与存储测试契约。
 */

const TOTAL_BUDGET_SEC = 300;

const STATIONS = [
  {
    id: "structure",
    page: "structure.html",
    title: "空间结构观察",
    budgetSec: 45,
    cue: "演示分层显隐、实时横断面/矢状面断层剖切与网格尺寸参考，说明三维资产独立分仓交付。",
    url: "structure.html?defense=1",
  },
  {
    id: "dataset",
    page: "dataset.html",
    title: "时序溯源与容错",
    budgetSec: 80,
    cue: "演示原始采样点 vs 线性插值、字段→3D映射链及异常边界自检，声明教学模拟非临床数据。",
    url: "dataset.html?demo=1&defense=1",
  },
  {
    id: "herbs",
    page: "herbs.html",
    title: "原文溯源与经典方",
    budgetSec: 40,
    cue: "演示 50,854 条原行号、SHA-256 校验、同名差异与教学经典方反查，声明不荐药无剂量。",
    url: "herbs.html?q=%E9%BB%84%E8%8A%AA&defense=1",
  },
  {
    id: "index",
    page: "index.html",
    title: "三维辨证与对比",
    budgetSec: 70,
    cue: "演示标准教学案例、双侧标注聚焦与 0–28 天前后对比 HUD，声明教学模拟非疗效预测。",
    url: "index.html?demo=1&case=kidneyYang&defense=1",
  },
  {
    id: "judge",
    page: "judge.html",
    title: "证据矩阵与边界",
    budgetSec: 65,
    cue: "展示四项答辩核验、101 列研究契约与已验证/待采集/不可声称三色边界并准时收束。",
    url: "judge.html?defense=1#defense-workbench",
  },
];

function formatTime(sec) {
  const safe = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function getCurrentPageName() {
  const path = window.location.pathname || "";
  const seg = path.split("/").filter(Boolean).pop() || "index.html";
  return seg.toLowerCase();
}

function buildStationHref(rawUrl, elapsedSec) {
  const [baseAndQuery, hash] = rawUrl.split("#");
  const [page, query = ""] = baseAndQuery.split("?");
  const params = new URLSearchParams(query);
  params.set("defense", "1");
  params.set("t", String(Math.max(0, Math.floor(elapsedSec))));
  return `${page}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

function buildExitHref() {
  const url = new URL(window.location.href);
  url.searchParams.delete("defense");
  url.searchParams.delete("t");
  return url.toString();
}

function injectStyles() {
  if (document.getElementById("defense-relay-style")) return;
  const style = document.createElement("style");
  style.id = "defense-relay-style";
  style.textContent = `
    .defense-relay-bar {
      position: fixed;
      left: 50%;
      bottom: 8px;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: calc(100vw - 20px);
      padding: 6px 10px;
      border-radius: 12px;
      background: rgba(12, 31, 27, 0.94);
      border: 1px solid rgba(52, 211, 153, 0.42);
      box-shadow: 0 12px 30px rgba(6, 18, 15, 0.46), 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
      color: #f3f4ef;
      font-family: "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.2;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .defense-relay-bar.is-collapsed {
      padding: 5px 9px;
      gap: 6px;
    }
    .defense-relay-bar.is-collapsed .dr-head,
    .defense-relay-bar.is-collapsed .dr-dots,
    .defense-relay-bar.is-collapsed .dr-nav,
    .defense-relay-bar.is-collapsed .dr-cue-pop {
      display: none !important;
    }
    .dr-cue-pop {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 8px);
      transform: translateX(-50%);
      width: min(560px, calc(100vw - 28px));
      padding: 9px 12px;
      border-radius: 10px;
      background: rgba(12, 31, 27, 0.96);
      border: 1px solid rgba(52, 211, 153, 0.45);
      box-shadow: 0 10px 26px rgba(6, 18, 15, 0.45);
      color: #e6f2ed;
      font-size: 12px;
      line-height: 1.5;
    }
    .dr-cue-pop b {
      color: #6ee7b7;
      margin-right: 6px;
    }
    .dr-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(27, 107, 88, 0.48);
      border: 1px solid rgba(52, 211, 153, 0.45);
      color: #a7f3d0;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .dr-dot-live {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
      flex-shrink: 0;
    }
    .dr-head {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .dr-title {
      font-weight: 700;
      color: #ffffff;
    }
    .dr-budget {
      font-size: 11px;
      color: #9dd4c3;
    }
    .dr-dots {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .dr-station-dot {
      width: 21px;
      height: 21px;
      border-radius: 999px;
      border: 1px solid rgba(167, 243, 208, 0.28);
      background: rgba(255, 255, 255, 0.06);
      color: #c5dad3;
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
    }
    .dr-station-dot:hover {
      background: rgba(52, 211, 153, 0.22);
      border-color: rgba(52, 211, 153, 0.7);
      color: #ffffff;
    }
    .dr-station-dot.is-current {
      background: #1b6b58;
      border-color: #6ee7b7;
      color: #ffffff;
      box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.25);
    }
    .dr-timer-wrap {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 7px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.12);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .dr-timer-wrap.is-warn {
      border-color: rgba(251, 191, 36, 0.65);
      color: #fde68a;
    }
    .dr-timer-wrap.is-over {
      border-color: rgba(248, 113, 113, 0.75);
      background: rgba(127, 29, 29, 0.45);
      color: #fecaca;
    }
    .dr-time {
      font-weight: 700;
      font-size: 12.5px;
      letter-spacing: 0.02em;
    }
    .dr-btn {
      appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.08);
      color: #f3f4ef;
      border-radius: 7px;
      padding: 4px 8px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.16s ease, border-color 0.16s ease;
    }
    .dr-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(167, 243, 208, 0.55);
    }
    .dr-btn.is-on {
      background: rgba(52, 211, 153, 0.22);
      border-color: rgba(110, 231, 183, 0.65);
      color: #a7f3d0;
    }
    .dr-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .dr-btn-primary {
      background: #1b6b58;
      border-color: #34d399;
      color: #ffffff;
    }
    .dr-btn-primary:hover {
      background: #23836c;
    }
    .dr-nav,
    .dr-utils {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
    }
    @media (max-width: 1020px) {
      .dr-dots, .dr-budget { display: none; }
    }
    @media print {
      .defense-relay-bar { display: none !important; }
    }
  `;
  document.head.appendChild(style);
}

function initDefenseGuide() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("defense") !== "1") return;

  injectStyles();

  const page = getCurrentPageName();
  let currentIndex = STATIONS.findIndex((s) => s.page === page);
  if (currentIndex < 0) currentIndex = 0;
  const station = STATIONS[currentIndex];

  let elapsedSec = Number(params.get("t"));
  if (!Number.isFinite(elapsedSec) || elapsedSec < 0) elapsedSec = 0;
  let paused = false;
  let collapsed = false;
  let cueOpen = false;

  const bar = document.createElement("aside");
  bar.id = "defense-relay-bar";
  bar.className = "defense-relay-bar";
  bar.setAttribute("aria-label", "5 分钟国赛答辩接力导览");

  const cuePop = document.createElement("div");
  cuePop.className = "dr-cue-pop";
  cuePop.hidden = true;
  const cueLabel = document.createElement("b");
  cueLabel.textContent = `第 ${currentIndex + 1} 站要点（建议 ${station.budgetSec}s）`;
  const cueText = document.createElement("span");
  cueText.textContent = station.cue;
  cuePop.append(cueLabel, cueText);

  const badge = document.createElement("span");
  badge.className = "dr-badge";
  const liveDot = document.createElement("span");
  liveDot.className = "dr-dot-live";
  const badgeText = document.createElement("span");
  badgeText.textContent = `答辩接力 ${currentIndex + 1}/${STATIONS.length}`;
  badge.append(liveDot, badgeText);

  const head = document.createElement("div");
  head.className = "dr-head";
  const titleEl = document.createElement("span");
  titleEl.className = "dr-title";
  titleEl.textContent = station.title;
  const budgetEl = document.createElement("span");
  budgetEl.className = "dr-budget";
  budgetEl.textContent = `${station.budgetSec}s`;
  head.append(titleEl, budgetEl);

  const dots = document.createElement("div");
  dots.className = "dr-dots";
  STATIONS.forEach((st, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `dr-station-dot${idx === currentIndex ? " is-current" : ""}`;
    btn.textContent = String(idx + 1);
    btn.title = `第 ${idx + 1} 站：${st.title}（建议 ${st.budgetSec}s）`;
    btn.addEventListener("click", () => {
      window.location.href = buildStationHref(st.url, elapsedSec);
    });
    dots.appendChild(btn);
  });

  const timerWrap = document.createElement("div");
  timerWrap.className = "dr-timer-wrap";
  const timeEl = document.createElement("span");
  timeEl.className = "dr-time";
  timeEl.id = "dr-timer-readout";
  const pauseBtn = document.createElement("button");
  pauseBtn.type = "button";
  pauseBtn.className = "dr-btn";
  pauseBtn.textContent = "暂停";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "dr-btn";
  resetBtn.textContent = "归零";
  resetBtn.title = "重置 5 分钟总计时";
  timerWrap.append(timeEl, pauseBtn, resetBtn);

  const nav = document.createElement("div");
  nav.className = "dr-nav";
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "dr-btn";
  prevBtn.textContent = "← 上一站";
  prevBtn.disabled = currentIndex === 0;
  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      window.location.href = buildStationHref(STATIONS[currentIndex - 1].url, elapsedSec);
    }
  });

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "dr-btn dr-btn-primary";
  const hasNext = currentIndex < STATIONS.length - 1;
  nextBtn.textContent = hasNext ? `下一站：${STATIONS[currentIndex + 1].title} →` : "答辩收束 ✓";
  nextBtn.addEventListener("click", () => {
    if (hasNext) {
      window.location.href = buildStationHref(STATIONS[currentIndex + 1].url, elapsedSec);
    } else {
      window.location.href = buildExitHref();
    }
  });
  nav.append(prevBtn, nextBtn);

  const utils = document.createElement("div");
  utils.className = "dr-utils";
  const cueBtn = document.createElement("button");
  cueBtn.type = "button";
  cueBtn.className = "dr-btn";
  cueBtn.textContent = "要点";
  cueBtn.title = station.cue;
  cueBtn.addEventListener("click", () => {
    cueOpen = !cueOpen;
    cuePop.hidden = !cueOpen;
    cueBtn.classList.toggle("is-on", cueOpen);
  });

  const collapseBtn = document.createElement("button");
  collapseBtn.type = "button";
  collapseBtn.className = "dr-btn";
  collapseBtn.textContent = "收起";
  collapseBtn.addEventListener("click", () => {
    collapsed = !collapsed;
    bar.classList.toggle("is-collapsed", collapsed);
    collapseBtn.textContent = collapsed ? "展开" : "收起";
  });

  const exitBtn = document.createElement("button");
  exitBtn.type = "button";
  exitBtn.className = "dr-btn";
  exitBtn.textContent = "退出";
  exitBtn.title = "退出答辩接力条，返回常规页面";
  exitBtn.addEventListener("click", () => {
    window.location.href = buildExitHref();
  });
  utils.append(cueBtn, collapseBtn, exitBtn);

  bar.append(cuePop, badge, head, dots, timerWrap, nav, utils);
  document.body.appendChild(bar);

  function renderTimer() {
    timeEl.textContent = `${formatTime(elapsedSec)} / ${formatTime(TOTAL_BUDGET_SEC)}`;
    timerWrap.classList.toggle("is-warn", elapsedSec >= 270 && elapsedSec <= TOTAL_BUDGET_SEC);
    timerWrap.classList.toggle("is-over", elapsedSec > TOTAL_BUDGET_SEC);
  }

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "继续" : "暂停";
  });

  resetBtn.addEventListener("click", () => {
    elapsedSec = 0;
    renderTimer();
  });

  renderTimer();
  window.setInterval(() => {
    if (!paused) {
      elapsedSec += 1;
      renderTimer();
    }
  }, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDefenseGuide, { once: true });
} else {
  initDefenseGuide();
}
