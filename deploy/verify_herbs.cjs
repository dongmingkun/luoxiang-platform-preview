/* Engineering acceptance checks; intercepted fixtures are not medicinal data.
   Requires environment-provided Playwright via NODE_PATH. No dependency download. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const base = process.env.TCM_TEST_URL || 'http://127.0.0.1:8020';
const out = path.resolve(process.env.TCM_EVIDENCE_DIR || path.join(__dirname, '../challenge_cup/evidence/herbs_2026-11-08'));
const checks = [], consoleErrors = [], pageErrors = [], failedRequests = [], externalRequests = [], writes = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };
const ready = page => page.waitForFunction(() => !document.getElementById('herb-query').disabled);
const query = async (page, value) => { await page.locator('#herb-query').fill(value); await page.locator('#herb-query').press('Enter'); };
const overflow = async page => page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    context.on('request', req => {
      if (new URL(req.url()).origin !== new URL(base).origin) externalRequests.push(req.url());
      if (!['GET', 'HEAD'].includes(req.method())) writes.push({ method: req.method(), url: req.url() });
    });
    context.on('page', page => {
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));
      page.on('response', res => { if (res.status() >= 400) failedRequests.push({ url: res.url(), status: res.status() }); });
    });
    const page = await context.newPage();
    const statuses = {};
    for (const url of ['/index.html', '/teacher.html', '/dataset.html', '/research.html', '/judge.html', '/structure.html', '/yangqi.html', '/herbs.html', '/data/herbs/quality.json', '/data/herbs/catalog.json']) {
      const response = await context.request.get(base + url);
      statuses[url] = response.status();
      check(`HTTP 200 ${url}`, response.status() === 200);
    }
    await page.goto(base + '/index.html');
    await page.waitForSelector('#sample-cases button');
    await page.locator('a[href="herbs.html"]').click();
    await ready(page);
    check('home navigation opens catalog', page.url().endsWith('/herbs.html'));
    check('record/name/duplicate counts', (await page.locator('.herb-facts dd').allTextContents()).join(',') === '50,854,36,726,7,784');
    check('24 entries per first page', await page.locator('#herb-results > li').count() === 24);
    check('original first source row is retained', (await page.locator('.herb-row-id').first().textContent()).endsWith('#1'));
    await page.locator('#herb-next').click();
    check('pagination keeps all rows', (await page.locator('.herb-row-id').first().textContent()).endsWith('#25'));
    await page.locator('#herb-prev').click();
    check('previous page restores row 1', (await page.locator('.herb-row-id').first().textContent()).endsWith('#1'));

    await query(page, '黄芪');
    check('text search returns literal matches', await page.locator('#herb-results > li').count() > 0 && (await page.locator('#herb-results > li').allTextContents()).every(text => text.includes('黄芪')));
    check('same-name variants are marked', await page.locator('.herb-same-name').count() > 0);
    await page.locator('#herb-nature').selectOption('温');
    await page.locator('#herb-channel').selectOption('肺');
    const values = await page.locator('#herb-results > li').evaluateAll(cards => cards.map(card => [...card.querySelectorAll('dd')].map(el => el.textContent)));
    check('nature/channel filters match raw strings', values.length > 0 && values.every(row => row[0].includes('温') && row[2].includes('肺')));
    await query(page, '不存在的工程检索词__20261108');
    check('empty state is honest', await page.locator('#herb-empty').isVisible() && await page.locator('#herb-results > li').count() === 0);
    check('empty pagination disabled', await page.locator('#herb-prev').isDisabled() && await page.locator('#herb-next').isDisabled());
    await page.locator('#herb-clear').click();
    check('clear restores full catalog', (await page.locator('#herb-range').textContent()).startsWith('50,854'));
    check('search creates no local/session storage', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0));

    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const sizes = await overflow(page);
      check(`catalog no horizontal overflow ${width}`, sizes.scroll <= sizes.viewport);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(out, `herbs-${width}.png`), fullPage: false });
      await query(page, '黄芪');
      await page.locator('#results-title').evaluate(el => el.scrollIntoView({ block: 'start' }));
      check(`filtered cards no horizontal overflow ${width}`, (await overflow(page)).scroll <= width);
      await page.screenshot({ path: path.join(out, `results-${width}.png`), fullPage: false });
      await page.locator('#herb-clear').click();
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(base + '/herbs.html?q=' + encodeURIComponent('金银花'));
    await ready(page);
    check('query deep link is applied after load', await page.locator('#herb-query').inputValue() === '金银花' && await page.locator('#herb-results > li').count() > 0);
    await page.goto(base + '/teacher.html');
    await page.waitForSelector('#knowledge-table tbody tr');
    check('teacher has herb navigation and keeps ten examples', await page.locator('a[href="herbs.html"]').count() > 0 && await page.locator('#knowledge-table tbody tr').count() === 10);
    await page.goto(base + '/dataset.html');
    await page.waitForSelector('#btn-demo');
    for (const [name, mimeType, content] of [
      ['herb-fixture.json', 'application/json', JSON.stringify([{ 名称: '工程测试', 功效: '非医学资料' }])],
      ['herb-fixture.csv', 'text/csv', '名称,功效,性,味\n工程测试,非医学资料,,'],
    ]) {
      await page.locator('#file-input').setInputFiles({ name, mimeType, buffer: Buffer.from(content) });
      await page.waitForFunction(() => document.getElementById('import-status').textContent.includes('herbs.html'));
      check(`time-series importer rejects reference ${name}`, (await page.locator('#import-status').textContent()).includes('不是按天变化') && await page.locator('#case-count').textContent() === '0');
    }
    for (const extension of ['json', 'csv']) {
      await page.locator('#file-input').setInputFiles(path.resolve(__dirname, `../datasets/herbs/originals/中草药数据集（50000味）.${extension}`));
      await page.waitForFunction(() => document.getElementById('import-status').textContent.includes('文件过大'));
      check(`oversized original ${extension} keeps size limit and points to herb entry`, (await page.locator('#import-status').textContent()).includes('herbs.html') && await page.locator('#case-count').textContent() === '0');
    }
    await page.locator('#btn-demo').click();
    await page.waitForFunction(() => document.getElementById('case-count').textContent === '3');
    check('existing time-series demo still imports', (await page.locator('#meta-list').textContent()).includes('3 个案例 · 12 个数据点'));
    check('no unexpected console errors in ordinary use', consoleErrors.length === 0);
    check('no uncaught page errors in ordinary use', pageErrors.length === 0);
    check('no HTTP errors in ordinary use', failedRequests.length === 0);
    check('no external requests', externalRequests.length === 0);
    check('no upload or write requests', writes.length === 0);
    await context.close();

    // Fault injection is confined to this new browser context; repository files are untouched.
    const faults = await browser.newContext();
    const faultPage = await faults.newPage();
    let catalogMode = 'unavailable';
    await faultPage.route('**/data/herbs/catalog.json', route => catalogMode === 'unavailable'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      : route.continue());
    await faultPage.goto(base + '/herbs.html');
    await faultPage.waitForSelector('#herb-retry', { state: 'visible' });
    check('missing catalog shows retry with disabled search', (await faultPage.locator('#herb-status').textContent()).includes('加载失败') && await faultPage.locator('#herb-query').isDisabled());
    catalogMode = 'normal';
    await faultPage.locator('#herb-retry').click();
    await ready(faultPage);
    check('retry recovers real catalog', await faultPage.locator('#record-count').textContent() === '50,854');
    await faultPage.unrouteAll();

    const fixture = JSON.stringify({ schema: 'luoxiang/herbs@1', columns: ['source_row','名称','功效','性','味','归经','same_name_records'], rows: [[1, '工程测试', '<img src=x onerror="window.__injected=true">', null, null, null, 1]] });
    const fixtureMeta = { schema: 'luoxiang/herb-quality@1', row_count: 1, unique_names: 1, duplicate_name_groups: 0, extra_identical_rows: 0, json_csv_consistent: true, missing_by_field: { '归经': 1, '功效': 0 }, source: '工程夹具', license: '不作数据使用', content_review: '工程夹具', catalog: { bytes: Buffer.byteLength(fixture), sha256: createHash('sha256').update(fixture).digest('hex') } };
    let corrupt = false;
    await faultPage.route('**/data/herbs/quality.json', route => route.fulfill({ json: fixtureMeta }));
    await faultPage.route('**/data/herbs/catalog.json', route => route.fulfill({ contentType: 'application/json', body: corrupt ? fixture.replace('工程测试', '工程篡改') : fixture }));
    await faultPage.reload();
    await ready(faultPage);
    check('untrusted text is literal, no executable HTML', (await faultPage.locator('.herb-effect').textContent()).includes('<img') && await faultPage.locator('#herb-results img').count() === 0 && !await faultPage.evaluate(() => window.__injected));
    check('missing values are not invented', (await faultPage.locator('#herb-results dd').allTextContents()).every(text => text === '未提供'));
    corrupt = true;
    await faultPage.reload();
    await faultPage.waitForSelector('#herb-retry', { state: 'visible' });
    check('SHA mismatch blocks catalog', (await faultPage.locator('#herb-status').textContent()).includes('校验失败') && await faultPage.locator('#herb-results > li').count() === 0);
    await faults.close();
    const rawResponse = await browser.newContext();
    const rawStatus = (await rawResponse.request.get(base + '/datasets/herbs/originals/' + encodeURIComponent('中草药数据集（50000味）.json'))).status();
    check('original dataset is outside HTTP root', rawStatus === 404);
    await rawResponse.close();
    const report = { date: new Date().toISOString(), browser: await browser.version(), base, checks, statuses, consoleErrors, pageErrors, failedRequests, externalRequests, writes, rawSourceHTTP: rawStatus, faultTests: 'Browser-only engineering fixtures; expected 503 and checksum mismatch excluded from ordinary-use error count.' };
    await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: checks.length, consoleErrors, pageErrors, failedRequests, externalRequests, writes }));
  } finally { await browser.close(); }
})().catch(error => {
  console.error(error);
  console.error(JSON.stringify({ consoleErrors, pageErrors, failedRequests, externalRequests, writes }, null, 2));
  process.exitCode = 1;
});
