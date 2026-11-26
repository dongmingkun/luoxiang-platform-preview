import { parseCatalog, filterEntries, pageOf } from './herb-catalog.mjs?v=20261126award';

const $ = id => document.getElementById(id);
const format = value => Number(value).toLocaleString('zh-CN');
let entries = [], matches = [], page = 1, loaded = false, timer;
const inputs = ['herb-query', 'herb-nature', 'herb-taste', 'herb-channel', 'herb-clear'];
$('herb-query').value = (new URLSearchParams(location.search).get('q') || '').slice(0, 100);

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function render() {
  const result = pageOf(matches, page);
  page = result.page;
  $('herb-results').replaceChildren();
  for (const entry of result.rows) {
    const card = make('li');
    const top = make('div', 'herb-card-top');
    top.append(make('span', 'herb-row-id', `原记录 #${entry.id}`));
    if (entry.sameName > 1) top.append(make('span', 'herb-same-name', `同名 ${entry.sameName} 条 · 未合并`));
    card.append(top, make('h4', '', entry.name));
    const dl = make('dl');
    for (const [label, value] of [['性', entry.nature], ['味', entry.taste], ['归经', entry.channel]]) {
      dl.append(make('dt', '', label), make('dd', '', value?.trim() || '未提供'));
    }
    const effect = make('p', 'herb-effect');
    effect.append(make('b', '', '原文功效 · 待审'), document.createTextNode(entry.effect?.trim() || '未提供'));
    card.append(dl, effect);
    $('herb-results').append(card);
  }
  $('herb-empty').hidden = matches.length > 0;
  $('herb-range').textContent = `${format(result.total)} 条匹配 · 显示 ${format(result.start)}–${format(result.end)} 条`;
  $('herb-page').textContent = `第 ${page} / ${result.pages} 页`;
  $('herb-prev').disabled = page <= 1;
  $('herb-next').disabled = page >= result.pages;
  $('herb-status').textContent = `目录已通过完整性核对（${format(entries.length)} 条原始记录）。检索为原文字符串匹配，同名资料不自动合并。`;
}

function search() {
  if (!loaded) return;
  clearTimeout(timer);
  matches = filterEntries(entries, {
    query: $('herb-query').value,
    nature: $('herb-nature').value,
    taste: $('herb-taste')?.value || '',
    channel: $('herb-channel').value,
  });
  page = 1;
  render();
}

async function load() {
  loaded = false;
  $('herb-status').classList.remove('is-error');
  $('herb-status').textContent = '正在读取并核对资料目录，请稍候…';
  $('herb-retry').hidden = true;
  inputs.forEach(id => { const el = $(id); if (el) el.disabled = true; });
  try {
    const [metaResponse, dataResponse] = await Promise.all([fetch('data/herbs/quality.json'), fetch('data/herbs/catalog.json')]);
    if (!metaResponse.ok || !dataResponse.ok) throw new Error('数据文件暂时不可用。');
    const meta = await metaResponse.json(), raw = await dataResponse.arrayBuffer();
    if (meta.schema !== 'luoxiang/herb-quality@1' || meta.catalog?.bytes !== raw.byteLength) throw new Error('数据版本或文件大小不匹配。');
    if (globalThis.crypto?.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', raw);
      const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== meta.catalog.sha256) throw new Error('资料目录校验失败，请检查接入文件。');
    }
    entries = parseCatalog(JSON.parse(new TextDecoder().decode(raw)));
    if (entries.length !== meta.row_count) throw new Error('目录记录数与接入报告不一致。');
    $('record-count').textContent = format(meta.row_count);
    $('name-count').textContent = format(meta.unique_names);
    $('duplicate-count').textContent = format(meta.duplicate_name_groups);
    $('quality-note').textContent = `JSON/CSV 逐行一致：${meta.json_csv_consistent ? '已核对' : '未核对'}。完全重复行多出 ${format(meta.extra_identical_rows)} 条，仍保留原行。归经缺失 ${format(meta.missing_by_field['归经'])} 条；功效缺失 ${format(meta.missing_by_field['功效'])} 条。来源：${meta.source}；许可：${meta.license}；内容审校：${meta.content_review}。`;
    loaded = true;
    inputs.forEach(id => { const el = $(id); if (el) el.disabled = false; });
    search();
  } catch (error) {
    $('herb-status').textContent = `资料加载失败：${error.message} 可点击重试。`;
    $('herb-status').classList.add('is-error');
    $('herb-retry').hidden = false;
  }
}

$('herb-form').addEventListener('submit', event => { event.preventDefault(); search(); });
$('herb-query').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 160); });
for (const id of ['herb-nature', 'herb-taste', 'herb-channel']) $(id)?.addEventListener('change', search);
$('herb-clear').addEventListener('click', () => {
  for (const id of ['herb-query', 'herb-nature', 'herb-taste', 'herb-channel']) { const el = $(id); if (el) el.value = ''; }
  search();
});
document.querySelectorAll('[data-quick-herb]').forEach(btn => {
  btn.addEventListener('click', () => {
    $('herb-query').value = btn.dataset.quickHerb;
    search();
    $('results-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
for (const [id, delta] of [['herb-prev', -1], ['herb-next', 1]]) {
  $(id).addEventListener('click', () => { page += delta; render(); $('results-title').scrollIntoView({ block: 'start' }); });
}
$('herb-retry').addEventListener('click', load);
load();
