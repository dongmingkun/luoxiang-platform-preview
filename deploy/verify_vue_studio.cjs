/* Vue integration acceptance. Standard teaching cases only; no study results. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TCM_TEST_URL || 'http://127.0.0.1:8020';
const out = path.resolve(process.env.TCM_EVIDENCE_DIR || 'challenge_cup/evidence/vue_studio_2026-11-26');
const checks = [], errors = [], external = [], writes = [], geometry = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    context.on('request', r => {
      if (new URL(r.url()).origin !== new URL(base).origin) external.push(r.url());
      if (!['GET', 'HEAD'].includes(r.method())) writes.push(r.url());
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + '/index.html?demo=1&case=kidneyYang');
    await page.waitForFunction(() => Boolean(window.__luoxiangVue && window.__tcmScene));
    check('six real Vue component mounts', await page.locator('[data-v-app]').count() === 6);
    check('local production Vue 3.5.46 is running', await page.evaluate(() => window.__luoxiangVue.version === '3.5.46'));
    check('demo header returns to free mode', await page.locator('#mode-switch-link').getAttribute('href') === 'index.html');
    check('light atlas palette retained', await page.evaluate(() => getComputedStyle(document.body).colorScheme === 'light'));
    check('initial standard case selection retained', await page.locator('[data-case="kidneyYang"]').getAttribute('aria-pressed') === 'true');
    await page.evaluate(() => { window.__originalCanvas = document.querySelector('#canvas-wrap canvas'); window.__originalScene = window.__tcmScene; });
    await page.evaluate(() => document.getElementById('tab-simulation').click());
    check('panel transition responds to Vue state', await page.evaluate(() => document.getElementById('panel-simulation').getAnimations().some(a => a.id === 'vue-studio-feedback')));
    check('Vue tabs control the existing panels', await page.locator('#treatment-card').isVisible() && !await page.locator('#analysis-card').isVisible());
    await page.locator('#day-slider').fill('7');
    check('native slider updates Vue timeline', await page.locator('#stage-day-slider').inputValue() === '7');
    await page.locator('#stage-day-slider').fill('28');
    check('Vue timeline updates native simulation', await page.locator('#day-slider').inputValue() === '28' && (await page.locator('#day-label').textContent()).includes('28'));
    await page.locator('#stage-day-slider').fill('14');
    await page.locator('#stage-play').click();
    check('one click starts actual playback', await page.evaluate(() => window.__luoxiangVue.snapshot().playing) && (await page.locator('#btn-play').textContent()).includes('模拟中'));
    await page.locator('#stage-play').click();
    check('one click pauses actual playback', !await page.evaluate(() => window.__luoxiangVue.snapshot().playing));
    await page.locator('#tab-case').focus();
    await page.keyboard.press('End');
    check('keyboard End selects and focuses layers', await page.locator('#tab-layers').getAttribute('aria-selected') === 'true' && await page.locator('#tab-layers').evaluate(el => el === document.activeElement));
    await page.keyboard.press('Home');
    check('keyboard Home returns to case panel', await page.locator('#analysis-card').isVisible());
    for (const [id, expected] of [['liverStag', '肝郁气滞'], ['yinDef', '肾阴虚'], ['spleenDef', '脾胃虚弱'], ['kidneyYang', '肾阳虚']]) {
      await page.locator(`[data-case="${id}"]`).click();
      check(`case and Vue state agree: ${id}`, await page.evaluate(expected => {
        const native = document.querySelector('.pattern-name').textContent.trim();
        return window.__luoxiangVue.snapshot().pattern === native && native.includes(expected);
      }, expected));
    }
    check('case change produces actual status feedback', await page.locator('.vue-feedback').isVisible());
    check('canvas and scene survive Vue updates', await page.evaluate(() => window.__originalCanvas === document.querySelector('#canvas-wrap canvas') && window.__originalScene === window.__tcmScene && document.querySelectorAll('#canvas-wrap canvas').length === 1));
    const ids = await page.locator('[id]').evaluateAll(elements => elements.map(e => e.id));
    check('component transitions retain unique control IDs', new Set(ids).size === ids.length);
    for (const [width, height] of [[1920,1080], [1440,1000], [1280,900], [768,1024], [390,844]]) {
      await page.setViewportSize({ width, height });
      const g = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      geometry.push(g); check(`no horizontal overflow ${width}`, g.scroll <= width);
      if (width === 390) {
        check('closed mobile drawer is inert', await page.locator('#studio-nav').evaluate(el => el.inert));
        await page.locator('#studio-menu').click();
        check('Vue opens mobile navigation', await page.locator('#studio-menu').getAttribute('aria-expanded') === 'true');
        await page.keyboard.press('Escape');
        check('Escape restores menu focus', await page.locator('#studio-menu').evaluate(el => el === document.activeElement));
        await page.locator('#studio-menu').click();
        await page.setViewportSize({ width: 1440, height: 1000 });
        check('desktop resize clears drawer and inert state', await page.locator('#studio-nav').evaluate(el => !el.inert && !document.body.classList.contains('nav-open')));
        await page.setViewportSize({ width, height });
      }
      await page.waitForTimeout(260);
      await page.screenshot({ path: path.join(out, `vue-${width}.png`), fullPage: width <= 768 });
    }
    await page.setViewportSize({ width:1440, height:1000 });
    await page.locator('#btn-reset').click();
    check('reset clears both timelines and Vue case state', await page.locator('#stage-day-slider').isDisabled() && await page.locator('#day-slider').isDisabled() && !await page.evaluate(() => window.__luoxiangVue.snapshot().pattern));
    await page.goto(base + '/index.html');
    await page.waitForFunction(() => Boolean(window.__luoxiangVue && window.__tcmScene));
    check('free header links to demo mode', await page.locator('#mode-switch-link').getAttribute('href') === 'index.html?demo=1');
    await page.locator('[data-case="kidneyYang"]').click();
    await page.locator('#chat-input').fill('怕冷、腰膝酸软、夜尿多');
    await page.locator('#chat-input').press('Enter');
    check('free standard text reveals dialogue and clears case selection', await page.locator('.studio-dialogue').evaluate(el => el.open) && await page.locator('#sample-cases .is-active').count() === 0);
    check('no teaching data persisted', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0));
    const reduced = await browser.newContext({ reducedMotion: 'reduce' });
    const rp = await reduced.newPage();
    await rp.goto(base + '/index.html?demo=1&case=kidneyYang');
    await rp.waitForFunction(() => Boolean(window.__luoxiangVue && window.__tcmScene));
    await rp.locator('#tab-layers').click();
    check('reduced motion retains selected indicator position', await rp.locator('.vue-tab-indicator').evaluate(el => getComputedStyle(el).transform !== 'none' && getComputedStyle(el).transitionDuration === '0s'));
    check('reduced motion skips panel animation', await rp.evaluate(() => window.__luoxiangVue.snapshot().reducedMotion && !document.getElementById('panel-layers').getAnimations().some(a => a.id === 'vue-studio-feedback')));
    await reduced.close();
    check('no console or page errors', errors.length === 0);
    check('runtime makes no external or write requests', external.length === 0 && writes.length === 0);
    await fs.writeFile(path.join(out,'verification.json'), JSON.stringify({ date:'2026-11-26', url:base, browser:await browser.version(), checks, geometry, errors, external, writes }, null, 2) + '\n');
    console.log(JSON.stringify({ passed:checks.length, errors, external, writes }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); console.error(JSON.stringify({ checks, errors, external, writes })); process.exitCode = 1; });
