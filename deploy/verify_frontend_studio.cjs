/* Engineering UI acceptance; no participant input or study results. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const base = process.env.TCM_TEST_URL || 'http://127.0.0.1:8020';
const out = path.resolve(process.env.TCM_EVIDENCE_DIR || path.join(__dirname, '../challenge_cup/evidence/frontend_studio_2026-11-26'));
const showcaseHeroOut = path.resolve(path.join(__dirname, '../web/assets/showcase-demo.jpg'));

const checks = [], errors = [], failures = [], external = [], writes = [], geometry = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    context.on('page', page => {
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('response', r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
    });
    context.on('request', r => {
      if (new URL(r.url()).origin !== new URL(base).origin) external.push(r.url());
      if (!['GET', 'HEAD'].includes(r.method())) writes.push(r.url());
    });

    const page = await context.newPage();
    await page.goto(base + '/index.html?demo=1&case=kidneyYang');
    await page.waitForSelector('.pattern-name');
    check('new studio shell is used', await page.locator('.studio-shell').count() === 1);
    await page.waitForFunction(() => Boolean(window.__tcmScene), { timeout: 30000 });
    await page.waitForTimeout(450);

    check('real scene is loaded, not an anatomy screenshot', await page.locator('#canvas-wrap canvas').count() === 1);
    check('model resting view is stable', await page.evaluate(() => !window.__tcmScene.controls.autoRotate));
    check('demo still hides free symptoms', !await page.locator('#chat-input').isVisible() && !await page.locator('#symptom-chips').isVisible());
    check('four standard cases remain available', await page.locator('#sample-cases button').count() === 4);

    // Verify bilateral organ labels do NOT collide
    const labelOverlap = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.organ-label')].filter(el => getComputedStyle(el).display !== 'none');
      const rects = els.map(el => ({ key: el.dataset.organKey, r: el.getBoundingClientRect() }));
      const hits = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].r, b = rects[j].r;
          const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
          if (overlap) hits.push([rects[i].key, rects[j].key]);
        }
      }
      return { count: rects.length, hits };
    });
    check('bilateral organ callouts have zero overlap', labelOverlap.count >= 5 && labelOverlap.hits.length === 0);

    // Capture fresh showcase hero image at 1440x900
    await page.screenshot({ path: showcaseHeroOut, type: 'jpeg', quality: 90 });

    // Verify clickable organ callout popover
    await page.locator('.organ-label[data-organ-key="Kidneys"]').click();
    await page.waitForTimeout(250);
    check('clicking organ callout opens quick-inspect popover', await page.locator('#organ-popover').isVisible());
    await page.locator('#organ-popover-reset').click();
    await page.waitForTimeout(200);
    check('organ popover reset closes cleanly', !await page.locator('#organ-popover').isVisible());

    // Verify camera orientation active states
    await page.locator('[data-camera-view="back"]').click();
    check('camera back view shows active state', await page.locator('[data-camera-view="back"]').evaluate(el => el.classList.contains('is-on')));
    await page.locator('[data-camera-view="front"]').click();
    check('camera front view shows active state', await page.locator('[data-camera-view="front"]').evaluate(el => el.classList.contains('is-on')));

    // Verify all 4 cases
    for (const [id, expected] of [['kidneyYang', '肾阳虚'], ['liverStag', '肝郁气滞'], ['yinDef', '肾阴虚'], ['spleenDef', '脾胃虚弱']]) {
      await page.locator(`#sample-cases [data-case="${id}"]`).click();
      check(`case behavior preserved ${id}`, (await page.locator('.pattern-name').textContent()).includes(expected));
    }
    await page.locator('#sample-cases [data-case="kidneyYang"]').click();

    // Verify interactive Before/After Comparison HUD
    await page.locator('#btn-compare').click();
    await page.waitForTimeout(200);
    check('compare button opens before/after HUD with active state',
      await page.locator('#compare-hud').isVisible() &&
      await page.locator('#btn-compare').evaluate(el => el.classList.contains('is-on')) &&
      await page.locator('#compare-grid .compare-cell').count() === 4
    );
    await page.screenshot({ path: path.join(out, 'studio-compare.png') });
    await page.locator('#compare-close').click();
    check('compare HUD closes cleanly', !await page.locator('#compare-hud').isVisible());

    // Verify simulation tab & slider proxy
    await page.locator('[data-studio-tab="simulation"]').click();
    check('simulation tab has original controls', await page.locator('#treatment-card').isVisible() && !await page.locator('#analysis-card').isVisible());
    await page.locator('#day-slider').fill('14');
    check('original slider updates stage proxy', await page.locator('#stage-day-slider').inputValue() === '14');
    await page.locator('#stage-day-slider').fill('28');
    check('stage slider dispatches original teaching state', await page.locator('#day-slider').inputValue() === '28' && (await page.locator('#day-label').textContent()).includes('28'));
    await page.screenshot({ path: path.join(out, 'studio-simulation.png') });
    await page.locator('#stage-play').click();
    await page.waitForTimeout(350);
    check('stage play proxies actual player', (await page.locator('#btn-play').textContent()).includes('模拟中') && (await page.locator('#stage-play').textContent()).includes('暂停'));
    await page.locator('#stage-play').click();
    check('stage pause proxies actual player', !(await page.locator('#btn-play').textContent()).includes('模拟中'));

    // Verify layers tab
    await page.locator('[data-studio-tab="layers"]').click();
    check('layers tab reveals existing toggles', await page.locator('#layer-toggles button').count() === 8 && await page.locator('#skin-opacity').isVisible());
    await page.locator('#layer-toggles [data-layer="skeleton"]').click();
    check('original layer button works', await page.locator('#layer-toggles [data-layer="skeleton"]').evaluate(el => el.classList.contains('is-on')));
    await page.locator('#btn-mode-holo').click();
    check('holographic visual mode preserved', await page.evaluate(() => window.__tcmScene.visualMode === 'holo'));
    await page.screenshot({ path: path.join(out, 'studio-layers-holo.png') });
    await page.locator('#btn-mode-real').click();
    await page.locator('#btn-sex-female').click();
    await page.waitForFunction(() => document.getElementById('btn-sex-female').classList.contains('is-on'));
    check('female model toggle preserved', await page.evaluate(() => window.__tcmScene.sex === 'female'));
    await page.locator('#btn-sex-male').click();
    await page.waitForFunction(() => document.getElementById('btn-sex-male').classList.contains('is-on'));

    // Keyboard tab navigation
    await page.locator('[data-studio-tab="case"]').focus();
    await page.keyboard.press('ArrowRight');
    check('tab keyboard navigation is functional', await page.locator('[data-studio-tab="simulation"]').getAttribute('aria-selected') === 'true');
    await page.locator('[data-studio-tab="case"]').click();

    // Multi-viewport layout & resize check (including desktop -> 390 mobile sidebar check)
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 900], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(200);
      const g = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        stage: document.getElementById('canvas-wrap').getBoundingClientRect().toJSON(),
        navHidden: innerWidth <= 960 ? (() => { const s = getComputedStyle(document.getElementById('studio-nav')); return s.display === 'none' || s.visibility === 'hidden'; })() : true,
      }));
      geometry.push(g);
      check(`no horizontal overflow ${width}`, g.scroll <= width);
      check(`usable real 3D viewport ${width}`, g.stage.width >= 300 && g.stage.height >= 300);
      if (width <= 960) {
        const navClosedOnResize = await page.evaluate(() => { const s = getComputedStyle(document.getElementById('studio-nav')); return !document.body.classList.contains('nav-open') && (s.display === 'none' || s.visibility === 'hidden'); });
        check(`mobile sidebar stays closed on resize ${width}`, navClosedOnResize);
      }
      if (width === 390) {
        await page.locator('#studio-menu').click();
        check('mobile navigation opens', await page.locator('#studio-menu').getAttribute('aria-expanded') === 'true');
        await page.keyboard.press('Escape');
        check('mobile navigation closes with keyboard', await page.locator('#studio-menu').getAttribute('aria-expanded') === 'false');
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(out, `studio-${width}.png`), fullPage: width <= 768 });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#btn-reset').click();
    check('reset disables both teaching timelines', await page.locator('#day-slider').isDisabled() && await page.locator('#stage-day-slider').isDisabled());

    // Ordinary free-teaching mode
    await page.goto(base + '/index.html');
    await page.waitForSelector('#sample-cases button');
    check('ordinary mode retains original symptom controls', await page.locator('#chat-input').isVisible() && await page.locator('#symptom-chips').isVisible());
    check('no UI state is persisted or uploaded', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0) && writes.length === 0);

    // Showcase page
    await page.goto(base + '/showcase.html');
    await page.waitForTimeout(350);
    check('showcase remains reachable', await page.locator('.show-hero').isVisible());
    await page.screenshot({ path: path.join(out, 'studio-showcase.png'), fullPage: true });

    check('no console or page errors', errors.length === 0);
    check('no failed or external requests', failures.length === 0 && external.length === 0);

    await fs.writeFile(
      path.join(out, 'verification.json'),
      JSON.stringify({ date: '2026-11-26', browser: await browser.version(), checks, geometry, errors, failures, external, writes }, null, 2) + '\n',
    );
    console.log(JSON.stringify({ passed: checks.length, labelOverlap, errors, failures, external, writes }));
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  console.error(JSON.stringify({ errors, failures, external, writes }));
  process.exitCode = 1;
});
