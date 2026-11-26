/* Browser checks for the award task guide. Uses an existing Playwright runtime.
   No participant responses, screenshots of private input, or synthetic study results. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TCM_TEST_URL || 'http://127.0.0.1:8020';
const out = path.resolve(process.env.TCM_EVIDENCE_DIR || path.join(__dirname, '../challenge_cup/evidence/award_benchmark_2026-11-12'));
const checks = [], errors = [], failures = [], external = [], writes = [];
const check = (name, result) => { assert.ok(result, name); checks.push(name); };
const sizes = page => page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    context.on('page', page => {
      page.on('console', msg => { if (msg.type() === 'error') errors.push({ url: page.url(), text: msg.text() }); });
      page.on('pageerror', err => errors.push({ url: page.url(), text: err.message }));
      page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
    });
    context.on('request', req => {
      if (new URL(req.url()).origin !== new URL(base).origin) external.push(req.url());
      if (!['GET', 'HEAD'].includes(req.method())) writes.push(req.url());
    });
    const page = await context.newPage();
    await page.goto(base + '/index.html');
    const home = page.locator('a[href="judge.html#defense-workbench"]');
    check('home has direct task-workbench link', await home.count() === 1);
    await home.click();
    await page.waitForSelector('[data-task]');
    check('home route lands on workbench', page.url().endsWith('judge.html#defense-workbench'));
    check('four task selectors', await page.locator('[data-task]').count() === 4);
    const routes = { structure: 'structure.html', time: 'dataset.html?demo=1', source: 'herbs.html?q=%E9%BB%84%E8%8A%AA', research: 'research.html' };
    for (const [id, href] of Object.entries(routes)) {
      await page.locator(`[data-task="${id}"]`).click();
      const panel = page.locator(`#task-${id}`);
      check(`selected task ${id} has one active button and panel`, await page.locator('[data-task][aria-pressed="true"]').count() === 1 && await panel.isVisible() && await page.locator('[data-task-panel]:visible').count() === 1);
      check(`task ${id} has actionable steps and honest boundary`, await panel.locator('ol li').count() >= 2 && (await panel.textContent()).includes('待验证'));
      check(`task ${id} route is supported`, await panel.locator('.task-open').getAttribute('href') === href);
    }
    await page.locator('[data-task="time"]').focus();
    await page.keyboard.press('Space');
    check('native keyboard selection works', await page.locator('#task-time').isVisible());
    await page.locator('#task-time .task-open').click();
    await page.waitForFunction(() => document.getElementById('case-count').textContent === '3');
    check('time route loads existing 3-case demo', (await page.locator('#meta-list').textContent()).includes('3 个案例 · 12 个数据点'));
    await page.goto(base + '/judge.html#defense-workbench');
    await page.waitForSelector('[data-task]');
    check('no progress or research data saved', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0));
    check('all eight module pages have HTTP 200', (await Promise.all(['index','structure','yangqi','dataset','research','judge','teacher','herbs'].map(async name => (await context.request.get(`${base}/${name}.html`)).status()))).every(code => code === 200));
    check('evidence count updated to eight pages', (await page.locator('#evidence').textContent()).includes('8 页'));
    check('herb evidence distinguishes records from species/effects', (await page.locator('#evidence').textContent()).includes('50,854') && (await page.locator('#evidence').textContent()).includes('不是物种数'));
    check('three historical cases with primary-source links', await page.locator('.benchmark-case').count() === 3 && await page.locator('.benchmark-case a[href^="https://"]').count() === 3);
    check('historical award tracks distinguished', (await page.locator('#benchmark-cases').textContent()).includes('主赛道') && (await page.locator('#benchmark-cases').textContent()).includes('专项赛') && (await page.locator('#benchmark-cases').textContent()).includes('上海市'));
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [name, selector] of [['workbench','#defense-workbench'],['benchmarks','#benchmark-cases']]) {
        await page.locator(selector).evaluate(el => el.scrollIntoView({ block: 'start' }));
        const size = await sizes(page);
        check(`no horizontal overflow ${name} ${width}`, size.scroll <= size.viewport);
        await page.screenshot({ path: path.join(out, `${name}-${width}.png`) });
      }
    }
    await page.emulateMedia({ media: 'print' });
    check('print expands every task', await page.locator('[data-task-panel]:visible').count() === 4);
    check('print hides interactive task selectors', !await page.locator('.task-selectors').isVisible());
    check('print task text is dark', await page.locator('#task-source').evaluate(el => getComputedStyle(el).color === 'rgb(34, 34, 34)'));
    await page.pdf({ path: path.join(out, 'judge-A4.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true });
    await context.close();
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noJS.newPage();
    await staticPage.goto(base + '/judge.html#defense-workbench');
    check('no-JS retains four readable task panels', await staticPage.locator('[data-task-panel]:visible').count() === 4);
    check('no-JS retains actionable links', await staticPage.locator('[data-task-panel] a.task-open').count() === 4);
    await noJS.close();
    check('no console or uncaught errors', errors.length === 0);
    check('no unexpected HTTP errors', failures.length === 0);
    check('no external requests or uploads', external.length === 0 && writes.length === 0);
    const report = { checked: '2026-11-12', browser: await browser.version(), base, checks, errors, failures, external, writes, scope: 'Engineering task navigation and layout only; no learning outcomes or participant data collected.' };
    await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: checks.length, errors, failures, external, writes }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); console.error(JSON.stringify({ errors, failures, external, writes })); process.exitCode = 1; });
