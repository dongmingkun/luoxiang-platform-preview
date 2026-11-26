/* Browser acceptance checks. Requires Playwright supplied by the test environment.
   Run with NODE_PATH pointing at its node_modules; never downloads dependencies. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const base = process.env.TCM_TEST_URL || 'http://127.0.0.1:8020';
const out = path.resolve(__dirname, '../challenge_cup/evidence/teacher_2026-11-08');
const key = 'luoxiang.teacher.demo.v1';
const checks = [];
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
function check(name, value) { assert.ok(value, name); checks.push(name); }

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    context.on('page', page => {
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push({ url: page.url(), text: msg.text() }); });
      page.on('pageerror', error => pageErrors.push({ url: page.url(), text: error.message }));
      page.on('response', response => { if (response.status() >= 400) failedRequests.push({ url: response.url(), status: response.status() }); });
    });
    const page = await context.newPage();
    for (const url of ['/teacher.html', '/index.html?demo=1&case=kidneyYang', '/judge.html']) {
      const response = await page.goto(base + url);
      check(`HTTP 200 ${url}`, response.status() === 200);
    }
    await page.goto(base + '/teacher.html');
    await page.waitForSelector('#case-table a');
    check('empty state is visible', await page.locator('#records-empty').isVisible());
    check('empty export is disabled', await page.locator('#export-csv').isDisabled());
    check('four standard cases', await page.locator('#case-table tbody tr').count() === 4);
    check('ten teaching formulas', await page.locator('#knowledge-table tbody tr').count() === 10);
    check('source labels are pending textbook review', await page.locator('#knowledge-table tbody tr').filter({ hasText: '教材整理/待核' }).count() === 10);
    check('fact counts', (await page.locator('.fact-number').allTextContents()).join(',') === '6,10,22,14,26');
    await page.locator('#case-table a').first().click();
    await page.waitForURL('**/index.html?demo=1&case=kidneyYang');
    await page.waitForSelector('.pattern-name');
    check('teacher link selects kidney yang case', await page.locator('.pattern-name').textContent() === '肾阳虚');
    check('demo hides free symptoms', !await page.locator('#chat-input').isVisible() && !await page.locator('#symptom-chips').isVisible());
    await page.goto(base + '/teacher.html');
    await page.waitForSelector('#records-table tbody tr');
    check('opening creates exactly one record', await page.locator('#records-table tbody tr').count() === 1);
    await page.reload();
    await page.waitForSelector('#records-table tbody tr');
    check('refresh preserves record without increment', await page.locator('#records-table tbody tr').count() === 1);
    for (const format of ['json', 'csv']) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator(`#export-${format}`).click()]);
      const content = await fs.readFile(await download.path(), 'utf8');
      if (format === 'json') {
        const data = JSON.parse(content);
        check('JSON contains one fixed case record', data.records.length === 1 && data.records[0].case === '阳虚怕冷案' && data.records[0].formula === '金匮肾气丸');
        check('JSON record has only four public fields', Object.keys(data.records[0]).sort().join(',') === 'case,formula,pattern,time');
      } else {
        check('CSV has four columns and one record', content.replace(/^\uFEFF/, '').trim().split('\r\n').length === 2 && content.includes('"时间","案例","证型","方剂"'));
        check('CSV contains standard case only', content.includes('"阳虚怕冷案","肾阳虚","金匮肾气丸"') && !/姓名|电话|学号|问卷|participant|userAgent/i.test(content));
      }
    }
    // Unknown extra properties never cross the export boundary.
    await page.evaluate(key => { const records = JSON.parse(localStorage.getItem(key)); records[0].name = 'SHOULD_NOT_EXPORT'; localStorage.setItem(key, JSON.stringify(records)); }, key);
    await page.reload();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-json').click()]);
    check('storage extras are omitted from export', !(await fs.readFile(await download.path(), 'utf8')).includes('SHOULD_NOT_EXPORT'));

    for (const [id, name, formula] of [
      ['kidneyYang', '肾阳虚', '金匮肾气丸'],
      ['liverStag', '肝郁气滞 / 气滞血瘀', '血府逐瘀汤'],
      ['yinDef', '肾阴虚 / 阴虚火旺', '六味地黄丸'],
      ['spleenDef', '脾胃虚弱', '参苓白术散'],
    ]) {
      await page.goto(`${base}/index.html?demo=1&case=${id}`);
      await page.waitForSelector('.pattern-name');
      check(`case selection ${id}`, await page.locator('.pattern-name').textContent() === name && await page.locator('#formula-select').inputValue() === formula);
    }
    for (const id of ['missing', '__proto__', '%3Cscript%3E', '']) {
      await page.goto(`${base}/index.html?demo=1&case=${id}`);
      await page.waitForSelector('#sample-cases button');
      check(`unknown case fallback ${id || '(empty)'}`, await page.locator('#case-notice').isVisible() && await page.locator('.pattern-name').count() === 0);
    }
    await page.locator('#sample-cases button').first().click();
    check('manual selection clears unknown case notice', await page.locator('.pattern-name').textContent() === '肾阳虚' && !await page.locator('#case-notice').isVisible());
    await page.goto(base + '/index.html?case=kidneyYang');
    await page.waitForSelector('#sample-cases button');
    check('normal mode ignores case and keeps input', await page.locator('#chat-input').isVisible() && await page.locator('#symptom-chips').isVisible() && await page.locator('.pattern-name').count() === 0);

    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [name, url] of [['teacher', '/teacher.html'], ['demo-case', '/index.html?demo=1&case=kidneyYang'], ['judge', '/judge.html']]) {
        await page.goto(base + url);
        await page.waitForTimeout(700);
        const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
        check(`no horizontal overflow ${name} ${width}`, sizes.scroll <= sizes.width);
        if (name === 'teacher' && width === 390) {
          const geometry = await page.locator('#knowledge-table tbody tr').first().evaluate(row => ({ row: row.clientWidth, heading: row.querySelector('th').getBoundingClientRect().width }));
          check('mobile row heading uses full card width', geometry.heading >= geometry.row - 30);
        }
        await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
      }
    }
    await page.goto(base + '/teacher.html');
    await page.evaluate(key => localStorage.setItem(key, '{invalid json'), key);
    await page.reload();
    await page.waitForSelector('#case-table a');
    check('corrupt storage shows honest empty state', await page.locator('#records-empty').isVisible() && (await page.locator('#storage-status').textContent()).includes('损坏'));
    await context.close();

    const denied = await browser.newContext();
    await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }));
    const deniedPage = await denied.newPage();
    deniedPage.on('pageerror', error => pageErrors.push({ url: deniedPage.url(), text: error.message }));
    await deniedPage.goto(base + '/teacher.html');
    await deniedPage.waitForSelector('#case-table a');
    check('unavailable storage is explained', (await deniedPage.locator('#storage-status').textContent()).includes('不可用'));
    await deniedPage.locator('#case-table a').first().click();
    await deniedPage.waitForURL('**/index.html?demo=1&case=kidneyYang');
    check('storage denial still permits case navigation', true);
    await denied.close();
    check('no uncaught page errors', pageErrors.length === 0);
    await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify({ date: new Date().toISOString(), browser: await browser.version(), base, checks, consoleErrors, pageErrors, failedRequests }, null, 2) + '\n');
    console.log(JSON.stringify({ passed: checks.length, consoleErrors, pageErrors, failedRequests }, null, 2));
    if (consoleErrors.length) process.exitCode = 2;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
