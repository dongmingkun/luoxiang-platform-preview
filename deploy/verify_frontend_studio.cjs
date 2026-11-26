/* Engineering UI acceptance; no participant input or study results. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TCM_TEST_URL || 'http://127.0.0.1:8020';
const out = path.resolve(process.env.TCM_EVIDENCE_DIR || path.join(__dirname, '../challenge_cup/evidence/frontend_studio_2026-11-26'));
const checks = [], errors = [], failures = [], external = [], writes = [], geometry = [];
const contrasts = [];
async function textContrast(page, selectors) {
  return page.evaluate(selectors => {
    const rgb = text => (text.match(/[\d.]+/g) || []).map(Number);
    const lum = values => values.slice(0,3).map(v => { const s=v/255; return s<=.04045?s/12.92:((s+.055)/1.055)**2.4; }).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    return selectors.map(selector => {
      const el=document.querySelector(selector); if(!el) return {selector,ratio:0};
      let node=el,bg=[255,255,255];
      while(node) { const c=rgb(getComputedStyle(node).backgroundColor); if(c.length===3 || c[3]===1) {bg=c;break;} node=node.parentElement; }
      const a=lum(rgb(getComputedStyle(el).color)),b=lum(bg);
      return {selector,ratio:Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2))};
    });
  }, selectors);
}
const check = (name, value) => { assert.ok(value, name); checks.push(name); };
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    context.on('page', page => {
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('response', r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
    });
    context.on('request', r => {
      if (new URL(r.url()).origin !== new URL(base).origin) external.push(r.url());
      if (!['GET','HEAD'].includes(r.method())) writes.push(r.url());
    });
    const page = await context.newPage();
    await page.goto(base + '/index.html?demo=1&case=kidneyYang');
    await page.waitForSelector('.pattern-name');
    check('new studio shell is used', await page.locator('.studio-shell').count() === 1);
    await page.waitForFunction(() => Boolean(window.__tcmScene), { timeout: 30000 });
    check('real scene is loaded, not an anatomy screenshot', await page.locator('#canvas-wrap canvas').count() === 1);
    check('model resting view is stable', await page.evaluate(() => !window.__tcmScene.controls.autoRotate));
    await page.locator('[data-camera-view="back"]').click();
    check('back view changes the real camera', await page.evaluate(() => window.__tcmScene.camera.position.z < 0));
    await page.locator('[data-camera-view="front"]').click();
    check('front view changes the real camera', await page.evaluate(() => window.__tcmScene.camera.position.z > 0));
    check('demo still hides free symptoms', !await page.locator('#chat-input').isVisible() && !await page.locator('#symptom-chips').isVisible());
    check('four standard cases remain available', await page.locator('#sample-cases button').count() === 4);
    for (const [id, expected] of [['kidneyYang','肾阳虚'],['liverStag','肝郁气滞'],['yinDef','肾阴虚'],['spleenDef','脾胃虚弱']]) {
      await page.locator(`#sample-cases [data-case="${id}"]`).click();
      check(`case behavior preserved ${id}`, (await page.locator('.pattern-name').textContent()).includes(expected));
    }
    await page.locator('#sample-cases [data-case="kidneyYang"]').click();
    await page.locator('[data-studio-tab="simulation"]').click();
    check('simulation tab has original controls', await page.locator('#treatment-card').isVisible() && !await page.locator('#analysis-card').isVisible());
    await page.locator('#day-slider').fill('14');
    check('original slider updates stage proxy', await page.locator('#stage-day-slider').inputValue() === '14');
    await page.locator('[data-camera-view="back"]').click();
    await page.locator('#formula-select').selectOption({ index:0 });
    check('formula change preserves the chosen camera view', await page.evaluate(() => window.__tcmScene.camera.position.z < 0));
    await page.locator('[data-camera-view="front"]').click();
    await page.locator('#stage-day-slider').fill('28');
    check('stage slider dispatches original teaching state', await page.locator('#day-slider').inputValue() === '28' && (await page.locator('#day-label').textContent()).includes('28'));
    await page.locator('#stage-play').click();
    await page.waitForTimeout(350);
    check('stage play proxies actual player', (await page.locator('#btn-play').textContent()).includes('模拟中') && (await page.locator('#stage-play').textContent()).includes('暂停'));
    await page.locator('#stage-play').click();
    check('stage pause proxies actual player', !(await page.locator('#btn-play').textContent()).includes('模拟中'));
    await page.locator('[data-studio-tab="layers"]').click();
    check('layers tab reveals existing toggles', await page.locator('#layer-toggles button').count() === 8 && await page.locator('#skin-opacity').isVisible());
    await page.locator('#layer-toggles [data-layer="skeleton"]').click();
    check('original layer button works', await page.locator('#layer-toggles [data-layer="skeleton"]').evaluate(el => el.classList.contains('is-on')));
    await page.locator('#btn-mode-holo').click();
    check('holographic visual mode preserved', await page.evaluate(() => window.__tcmScene.visualMode === 'holo'));
    await page.locator('#btn-mode-real').click();
    await page.locator('#btn-sex-female').click();
    await page.waitForFunction(() => document.getElementById('btn-sex-female').classList.contains('is-on'));
    check('female model toggle preserved', await page.evaluate(() => window.__tcmScene.sex === 'female'));
    check('model switch keeps rotation button and camera consistent', await page.evaluate(() => window.__tcmScene.controls.autoRotate === document.getElementById('btn-rotate').classList.contains('is-on')));
    await page.locator('#btn-sex-male').click();
    await page.waitForFunction(() => document.getElementById('btn-sex-male').classList.contains('is-on'));
    await page.locator('#btn-view-reset').click();
    check('view reset keeps resting camera stable', await page.evaluate(() => !window.__tcmScene.controls.autoRotate && !document.getElementById('btn-rotate').classList.contains('is-on')));
    await page.locator('[data-studio-tab="case"]').focus();
    await page.keyboard.press('ArrowRight');
    check('tab keyboard navigation is functional', await page.locator('[data-studio-tab="simulation"]').getAttribute('aria-selected') === 'true');
    await page.locator('[data-studio-tab="case"]').click();
    const inspectorContrast = await textContrast(page, ['[data-studio-tab="layers"]','.layer-pill','.panel-intro p','.formula-note','.analysis-copy','.org-tag','.teaching-boundary','.inspector-boundary p','.stage-range small']);
    contrasts.push(...inspectorContrast);
    check('critical inspector text meets 4.5 contrast ratio', inspectorContrast.every(c => c.ratio >= 4.5));
    for (const [width,height] of [[1920,1080],[1440,1000],[1280,900],[768,1024],[390,844]]) {
      await page.setViewportSize({ width,height });
      await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0,0); });
      await page.waitForTimeout(120);
      const g = await page.evaluate(() => ({ width:innerWidth, scroll:document.documentElement.scrollWidth, stage:document.getElementById('canvas-wrap').getBoundingClientRect().toJSON() }));
      geometry.push(g);
      check(`no horizontal overflow ${width}`, g.scroll <= width);
      check(`usable real 3D viewport ${width}`, g.stage.width >= 300 && g.stage.height >= 320);
      if (width === 390) {
        check('closed mobile navigation is keyboard-inert', await page.locator('#studio-nav').evaluate(el => el.inert));
        await page.locator('#studio-menu').click();
        check('mobile navigation opens', await page.locator('#studio-menu').getAttribute('aria-expanded') === 'true');
        await page.keyboard.press('Escape');
        check('mobile navigation closes with keyboard', await page.locator('#studio-menu').getAttribute('aria-expanded') === 'false');
        await page.locator('#studio-menu').click();
        await page.setViewportSize({ width:1280,height:900 });
        check('desktop resize clears drawer trap and exposes navigation', await page.locator('#studio-nav').evaluate(el => !el.inert && !document.body.classList.contains('nav-open')));
        await page.setViewportSize({ width,height });
      }
      await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0,0); });
      await page.waitForTimeout(100);
      await page.screenshot({ path:path.join(out,`studio-${width}.png`), fullPage: width <= 768 });
    }
    await page.setViewportSize({ width:1440,height:1000 });
    await page.locator('#btn-reset').click();
    check('reset disables both teaching timelines', await page.locator('#day-slider').isDisabled() && await page.locator('#stage-day-slider').isDisabled());
    await page.goto(base + '/index.html');
    await page.waitForSelector('#sample-cases button');
    check('ordinary mode retains original symptom controls', await page.locator('#chat-input').isVisible() && await page.locator('#symptom-chips').isVisible());
    await page.locator('#sample-cases [data-case="kidneyYang"]').click();
    await page.locator('#chat-input').fill('怕冷、腰膝酸软、夜尿多');
    await page.locator('#chat-input').press('Enter');
    check('manual standard-text input opens the actual dialogue', await page.locator('.studio-dialogue').evaluate(el => el.open));
    check('manual input clears standard-case selection', await page.locator('#sample-cases .is-active').count() === 0);
    check('no UI state is persisted or uploaded', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0) && writes.length === 0);
    await page.goto(base + '/showcase.html');
    check('showcase remains reachable', await page.locator('.show-hero').isVisible());
    const overviewContrast = await textContrast(page, ['.show-lede','.show-step p','.show-module.featured p','.show-evidence-grid p','.show-boundary span']);
    contrasts.push(...overviewContrast);
    check('showcase instructional copy meets 4.5 contrast ratio', overviewContrast.every(c => c.ratio >= 4.5));
    check('showcase uses the real new studio capture', await page.locator('.show-screen img').evaluate(img => img.complete && img.naturalWidth > 1000));
    for (const width of [1440,390]) {
      await page.setViewportSize({ width,height:1000 });
      await page.waitForTimeout(900);
      check(`showcase no horizontal overflow ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path:path.join(out,`showcase-${width}.png`),fullPage:true });
    }
    const codes = await Promise.all(['index','showcase','teacher','structure','yangqi','dataset','herbs','research','judge'].map(async n => (await context.request.get(`${base}/${n}.html`)).status()));
    check('nine platform pages return HTTP 200', codes.every(code => code === 200));
    check('no console or page errors', errors.length === 0);
    check('no failed or external requests', failures.length === 0 && external.length === 0);
    const fallback = await browser.newContext();
    const fallbackPage = await fallback.newPage();
    await fallbackPage.route(/\/assets\/anatomy_.*\.glb/, r => r.fulfill({ status:404,body:'Missing local model: engineering test.' }));
    await fallbackPage.goto(base + '/index.html?demo=1&case=kidneyYang');
    await fallbackPage.waitForFunction(() => document.getElementById('stage-ready').textContent.includes('需载入'));
    check('missing local model is disclosed honestly', (await fallbackPage.locator('#loading-text').textContent()).includes('失败'));
    check('missing model retains case and timeline controls', await fallbackPage.locator('.pattern-name').isVisible() && !await fallbackPage.locator('#stage-day-slider').isDisabled());
    await fallback.close();
    const partial = await browser.newContext();
    const partialPage = await partial.newPage();
    await partialPage.route(/\/assets\/anatomy_female\.glb/, r => r.fulfill({ status:404,body:'Missing female model: engineering test.' }));
    await partialPage.goto(base + '/index.html?demo=1&case=kidneyYang');
    await partialPage.waitForFunction(() => Boolean(window.__tcmScene));
    await partialPage.locator('#btn-sex-female').click();
    await partialPage.waitForFunction(() => document.getElementById('stage-ready').textContent.includes('保留原模型'));
    check('failed sex switch is visible outside collapsed dialogue', (await partialPage.locator('#stage-ready').textContent()).includes('切换未完成'));
    check('failed sex switch preserves working male model', await partialPage.evaluate(() => window.__tcmScene.sex === 'male'));
    await partial.close();
    await fs.writeFile(path.join(out,'verification.json'), JSON.stringify({ date:'2026-11-26', browser:await browser.version(), checks, geometry, contrasts, errors, failures, external, writes },null,2)+'\n');
    console.log(JSON.stringify({ passed:checks.length,errors,failures,external,writes }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); console.error(JSON.stringify({errors,failures,external,writes})); process.exitCode=1; });
