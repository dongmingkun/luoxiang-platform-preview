import { PATTERNS, FORMULAS, SYMPTOMS } from './knowledge.js?v=20261107defense';
import { SAMPLE_CASES } from './agent.js?v=20261108teacher';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'luoxiang.teacher.demo.v1';
const RECORD_NOTICE = '本机演示记录，不是研究数据、不含个人信息';
const cases = new Map(SAMPLE_CASES.map(sample => [sample.id, sample]));
let activePattern = 'all';

function cell(row, label, value, heading = false) {
  const el = document.createElement(heading ? 'th' : 'td');
  if (heading) el.scope = 'row';
  el.dataset.label = label;
  if (value !== undefined) el.textContent = value;
  row.appendChild(el);
  return el;
}

function renderFormulaRows() {
  const tbody = $('knowledge-table').tBodies[0];
  tbody.replaceChildren();
  for (const formula of Object.values(FORMULAS)) {
    if (activePattern !== 'all' && formula.pattern !== activePattern) continue;
    const row = document.createElement('tr');
    cell(row, '方名', formula.name, true);
    const herbsCell = cell(row, '组成药味', '');
    const wrap = document.createElement('div');
    wrap.className = 'herb-pill-list';
    for (const herb of formula.herbs) {
      const a = document.createElement('a');
      a.className = 'herb-pill-link';
      a.href = `herbs.html?q=${encodeURIComponent(herb)}`;
      a.textContent = herb;
      a.title = `在药材资料库中查阅「${herb}」原文`;
      wrap.appendChild(a);
    }
    herbsCell.appendChild(wrap);
    cell(row, '功效方向', formula.actions);
    cell(row, '对应证型', PATTERNS[formula.pattern].name);
    cell(row, '来源', '教材整理/待核');
    tbody.appendChild(row);
  }
}

function buildContent() {
  for (const [count, label, model] of [
    [Object.keys(PATTERNS).length, '类教学证型', false],
    [Object.keys(FORMULAS).length, '个经典方示例', false],
    [SYMPTOMS.length, '个症状标签', false],
    [14, '个器官 · 整合口径', true],
    [26, '条经络 · 整合口径', true],
  ]) {
    const card = document.createElement('div');
    card.className = `fact-card${model ? ' model-fact' : ''}`;
    const title = document.createElement('dt');
    title.textContent = label;
    const number = document.createElement('dd');
    number.className = 'fact-number';
    number.textContent = count;
    card.append(title, number);
    $('fact-cards').appendChild(card);
  }

  for (const sample of SAMPLE_CASES) {
    const pattern = PATTERNS[sample.pattern];
    const row = document.createElement('tr');
    cell(row, '案例名', sample.name, true);
    cell(row, '对应证型', pattern.name);
    cell(row, '经典方示例', FORMULAS[pattern.formula].name);
    const action = cell(row, '操作', '');
    const link = document.createElement('a');
    link.className = 'btn ghost';
    link.href = `index.html?demo=1&case=${encodeURIComponent(sample.id)}`;
    link.textContent = '打开案例 →';
    link.setAttribute('aria-label', `打开${sample.name}`);
    link.addEventListener('click', () => recordOpen(sample));
    link.addEventListener('auxclick', event => { if (event.button === 1) recordOpen(sample); });
    action.appendChild(link);
    $('case-table').tBodies[0].appendChild(row);
  }

  const filterBar = $('pattern-filters');
  if (filterBar) {
    const options = [['all', `全部证型 (${Object.keys(FORMULAS).length})`], ...Object.values(PATTERNS).map(p => [p.id, p.name.split(' / ')[0]])];
    for (const [id, label] of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pattern-filter-btn${id === activePattern ? ' is-on' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        activePattern = id;
        filterBar.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b === btn));
        renderFormulaRows();
      });
      filterBar.appendChild(btn);
    }
  }
  renderFormulaRows();
}

function readRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(data)) throw new Error('Invalid records');
    const records = data.filter(item => item && cases.has(item.caseId)
      && typeof item.time === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(item.time)
      && Number.isFinite(Date.parse(item.time)))
      .map(({ time, caseId }) => ({ time, caseId }));
    $('storage-status').textContent = records.length === data.length
      ? '记录仅保存在此浏览器与站点，不上传。'
      : '已忽略无法识别的记录；仅展示有效标准案例记录。';
    return records;
  } catch (error) {
    $('storage-status').textContent = error instanceof SyntaxError || error.message === 'Invalid records'
      ? '本机记录已损坏，无法读取；当前不展示旧记录。重新打开案例后将开始新记录。'
      : '本机存储不可用，打开操作无法持久保存；仍可进入标准案例。';
    return [];
  }
}

function publicRecord(record) {
  const sample = cases.get(record.caseId);
  const pattern = PATTERNS[sample.pattern];
  return { time: record.time, case: sample.name, pattern: pattern.name, formula: FORMULAS[pattern.formula].name };
}

function renderRecords(records) {
  const body = $('records-table').tBodies[0];
  body.replaceChildren();
  $('record-count').textContent = `本机已记录 ${records.length} 次打开`;
  $('records-empty').hidden = records.length > 0;
  $('records-table').hidden = records.length === 0;
  $('export-json').disabled = records.length === 0;
  $('export-csv').disabled = records.length === 0;
  const clearBtn = $('clear-records');
  if (clearBtn) clearBtn.disabled = records.length === 0;

  for (const record of [...records].sort((a, b) => b.time.localeCompare(a.time))) {
    const data = publicRecord(record);
    const row = document.createElement('tr');
    const timeCell = cell(row, '时间', '');
    const time = document.createElement('time');
    time.dateTime = data.time;
    time.textContent = new Date(data.time).toLocaleString('zh-CN', { hour12: false });
    timeCell.appendChild(time);
    cell(row, '案例', data.case);
    cell(row, '证型', data.pattern);
    cell(row, '方剂', data.formula);
    body.appendChild(row);
  }
}

function recordOpen(sample) {
  const records = readRecords();
  const next = [...records, { time: new Date().toISOString(), caseId: sample.id }];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    renderRecords(next);
  } catch {
    $('storage-status').textContent = '本次打开未保存：本机存储不可用或空间不足。仍可进入标准案例。';
    renderRecords(records);
  }
}

function exportRecords(format) {
  const records = readRecords();
  renderRecords(records);
  if (!records.length) return;
  const rows = records.map(publicRecord);
  const csvCell = value => `"${String(value).replace(/"/g, '""')}"`;
  const text = format === 'json'
    ? JSON.stringify({ notice: RECORD_NOTICE, records: rows }, null, 2) + '\n'
    : '\uFEFF' + [['时间', '案例', '证型', '方剂'], ...rows.map(row => [row.time, row.case, row.pattern, row.formula])]
      .map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const blob = new Blob([text], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `络象经纬-本机演示记录-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

buildContent();
renderRecords(readRecords());
$('export-json').addEventListener('click', () => exportRecords('json'));
$('export-csv').addEventListener('click', () => exportRecords('csv'));
$('clear-records')?.addEventListener('click', () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    renderRecords([]);
    $('storage-status').textContent = '已清空本机演示记录。';
  } catch {
    $('storage-status').textContent = '本机存储不可用，无法清空。';
  }
});
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) renderRecords(readRecords());
});
window.addEventListener('pageshow', () => renderRecords(readRecords()));

// —— 04 · 班级点穴考核 CSV 本地汇总（薄弱穴位诊断） ——
function parseExamCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const idx = name => headers.indexOf(name);
  const iCode = idx('acupoint_code');
  const iName = idx('acupoint_name');
  const iMer = idx('meridian');
  const iErr = idx('error_mm');
  const iScore = idx('score');
  if (iCode < 0 || iErr < 0) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const err = Number(cols[iErr]);
    const score = Number(cols[iScore]);
    if (!cols[iCode] || !Number.isFinite(err)) continue;
    rows.push({
      code: cols[iCode],
      name: cols[iName] || cols[iCode],
      meridian: cols[iMer] || '—',
      err,
      score: Number.isFinite(score) ? score : 0,
    });
  }
  return rows;
}

function renderExamAnalytics(rows, sourceLabel) {
  const statusEl = $('exam-analytics-status');
  const table = $('exam-analytics-table');
  if (!table || !statusEl) return;
  if (!rows.length) {
    statusEl.textContent = '未解析到有效点穴考核记录（请确认 CSV 包含 acupoint_code 与 error_mm 列）。';
    table.hidden = true;
    return;
  }
  const map = new Map();
  for (const r of rows) {
    const cur = map.get(r.code) || { code: r.code, name: r.name, meridian: r.meridian, count: 0, sumErr: 0, sumScore: 0 };
    cur.count += 1;
    cur.sumErr += r.err;
    cur.sumScore += r.score;
    map.set(r.code, cur);
  }
  const ranked = [...map.values()]
    .map(x => ({ ...x, meanErr: x.sumErr / x.count, meanScore: x.sumScore / x.count }))
    .sort((a, b) => b.meanErr - a.meanErr);
  const overallErr = (rows.reduce((a, r) => a + r.err, 0) / rows.length).toFixed(1);
  const overallScore = Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length);
  statusEl.textContent = `${sourceLabel}：共汇总 ${rows.length} 条作答、覆盖 ${ranked.length} 个穴位｜整体平均偏差 ${overallErr} mm，均分 ${overallScore}。`;

  const tbody = table.tBodies[0];
  tbody.replaceChildren();
  for (const item of ranked) {
    const tr = document.createElement('tr');
    cell(tr, '穴位', `${item.name} (${item.code})`, true);
    cell(tr, '归经', item.meridian);
    cell(tr, '作答次数', String(item.count));
    cell(tr, '平均偏差', `${item.meanErr.toFixed(1)} mm`);
    cell(tr, '平均得分', `${Math.round(item.meanScore)} 分`);
    const advice = item.meanErr > 35 ? '重点复训 · 强化骨度标志演示' : item.meanErr > 20 ? '建议巩固 · 结合体表参照' : '掌握良好';
    cell(tr, '教学建议', advice);
    tbody.appendChild(tr);
  }
  table.hidden = false;
}

$('exam-csv-input')?.addEventListener('change', async e => {
  const files = [...(e.target.files || [])];
  if (!files.length) return;
  const all = [];
  for (const f of files) {
    all.push(...parseExamCsv(await f.text()));
  }
  renderExamAnalytics(all, `已导入 ${files.length} 份本机考核 CSV`);
  e.target.value = '';
});

$('btn-exam-sample')?.addEventListener('click', () => {
  const sampleCsv = [
    'timestamp,acupoint_code,acupoint_name,meridian,region,error_mm,score,grade,sex,height_cm',
    '2026-11-27T00:00:00Z,SP6,三阴交,足太阴脾经,小腿,42.5,63,合格,male,172',
    '2026-11-27T00:00:00Z,SP6,三阴交,足太阴脾经,小腿,38.1,68,合格,female,162',
    '2026-11-27T00:00:00Z,GV4,命门,督脉,腰部,31.4,76,合格,male,172',
    '2026-11-27T00:00:00Z,ST36,足三里,足阳明胃经,小腿,18.2,93,优良,male,172',
    '2026-11-27T00:00:00Z,ST36,足三里,足阳明胃经,小腿,14.6,97,优良,female,162',
    '2026-11-27T00:00:00Z,CV12,中脘,任脉,上腹,11.3,100,精准,male,172',
  ].join('\n');
  renderExamAnalytics(parseExamCsv(sampleCsv), '格式示例（非真实班级成绩）');
});
