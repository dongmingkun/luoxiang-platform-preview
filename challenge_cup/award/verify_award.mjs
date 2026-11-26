// Engineering QA only: never fills participant forms or loads model assets.
// Run from the platform root. Arguments: base URL, directory containing Playwright node_modules.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const baseUrl = process.argv[2] || 'http://127.0.0.1:8765';
const dependencyRoot = path.resolve(process.argv[3] || '.git/award-opt-qa');
const require = createRequire(path.join(dependencyRoot, 'package.json'));
const { chromium } = require('playwright');
const outDir = 'challenge_cup/evidence/award_opt_2026-11-02';
fs.mkdirSync(outDir, { recursive: true });
const result = {
  measured_at: new Date().toISOString(),
  timezone: 'Asia/Shanghai',
  scope: 'Platform-only engineering QA; no model assets; no participant responses.',
  base_url: baseUrl,
  baseline_ref: '2fd4b6c',
  node: process.version,
  os: `${process.platform} ${process.arch}`,
};

const run = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim();
result.syntax = fs.readdirSync('web/src').filter(name => name.endsWith('.js'));
for (const file of result.syntax) run(process.execPath, ['--check', `web/src/${file}`]);
const judge = fs.readFileSync('web/judge.html', 'utf8');
const inline = [...judge.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
for (const [, attrs, code] of inline) {
  if (!/src\s*=|importmap/.test(attrs)) execFileSync(process.execPath, ['--check'], { input: code });
}
result.judge_inline_syntax = 'pass';

const source = fs.readFileSync('web/src/research.js', 'utf8');
const declaration = source.match(/const COLUMNS = \[[\s\S]*?\n\];/);
assert(declaration, 'Research COLUMNS declaration missing');
const columns = Array.from(vm.runInNewContext(`${declaration[0]}\nCOLUMNS`));
const header = fs.readFileSync('challenge_cup/data/templates/experiment_items_template.csv', 'utf8')
  .replace(/^\uFEFF/, '').split(/\r?\n/)[0].split(',');
assert.deepEqual(columns, header);
assert.equal(columns.length, 101);
result.research_csv = { columns: columns.length, ordered_header_matches_source: true, responses_created: 0 };

const protectedPaths = ['web/research.html', 'web/research.css', 'web/src', 'web/data', 'model_manifest.json', 'INTEGRATION.md'];
result.protected_diff = run('git', ['diff', result.baseline_ref, '--', ...protectedPaths]);
assert.equal(result.protected_diff, '', 'Protected research, data, or model contracts changed');
const tracked = run('git', ['ls-files']).split(/\r?\n/);
const forbidden = file => /\.(?:glb|fbx|blend|3dm)$/i.test(file)
  || /(?:^|\/)(?:rhino|blender)\//i.test(file)
  || /^unity\/.*\/Models\//i.test(file)
  || /(?:^|\/)meridians[^/]*\.json$/i.test(file)
  || /^challenge_cup\/data\/real\//i.test(file);
result.forbidden_tracked = tracked.filter(forbidden);
assert.deepEqual(result.forbidden_tracked, []);
result.assets_present = fs.readdirSync('web/assets');
assert.deepEqual(result.assets_present, ['README.md']);
result.submodule_file_present = fs.existsSync('.gitmodules');
assert.equal(result.submodule_file_present, false);
assert.equal(run('git', ['ls-files', '--stage']).split(/\r?\n/).some(line => line.startsWith('160000 ')), false);
run('git', ['diff', '--check']);

result.http = [];
for (const route of ['/', '/yangqi.html', '/dataset.html', '/research.html', '/judge.html']) {
  const response = await new Promise((resolve, reject) => {
    http.get(`${baseUrl}${route}`, response => {
      response.resume();
      response.on('end', () => resolve({ status: response.statusCode, contentType: response.headers['content-type'] }));
      response.on('error', reject);
    }).on('error', reject);
  });
  assert.equal(response.status, 200, route);
  assert.match(response.contentType, /text\/html/);
  result.http.push({ route, status: response.status });
}

const browser = await chromium.launch({
  executablePath: process.env.AWARD_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
try {
  result.browser = browser.version();
  result.viewports = [];
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors = [], pageErrors = [], failedRequests = [], externalRequests = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => failedRequests.push(request.url()));
    page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseUrl).origin) externalRequests.push(request.url()); });
    await page.goto(`${baseUrl}/judge.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({
      innerWidth,
      clientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      overflowX: getComputedStyle(document.body).overflowX,
      overflowY: getComputedStyle(document.body).overflowY,
      outliers: [...document.querySelectorAll('body *')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
      }).map(element => element.tagName + '.' + element.className),
      sections: document.querySelectorAll('main > section').length,
      legendItems: document.querySelectorAll('.status-legend li').length,
      comparisonRows: document.querySelectorAll('.comparison-table tbody tr').length,
    }));
    assert(metrics.documentScrollWidth <= metrics.clientWidth, 'Document overflows horizontally');
    assert(metrics.bodyScrollWidth <= metrics.innerWidth, 'Body overflows horizontally');
    assert.deepEqual(metrics.outliers, [], 'Element extends outside viewport');
    assert.equal(metrics.legendItems, 3);
    assert.equal(metrics.comparisonRows, 3);
    assert(!['hidden', 'clip'].includes(metrics.overflowX), 'Overflow must not be hidden to pass');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    assert(await page.evaluate(() => scrollY > 0), 'Page must scroll to lower sections');
    const footer = await page.locator('.judge-footer').boundingBox();
    assert(footer.y < viewport.height && footer.y + footer.height > 0, 'Footer cannot be reached');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => { window.print = () => { window.__qaPrintCalls = (window.__qaPrintCalls || 0) + 1; }; });
    await page.locator('#btn-print').click();
    assert.equal(await page.evaluate(() => window.__qaPrintCalls), 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${outDir}/judge-${viewport.width}.png`, fullPage: true });
    if (viewport.width === 390) {
      await page.locator('.evidence-status').screenshot({ path: `${outDir}/legend-390.png` });
      await page.locator('.comparison-table').screenshot({ path: `${outDir}/comparison-390.png` });
    }
    if (viewport.width === 1280) {
      await page.emulateMedia({ media: 'print' });
      result.print = await page.evaluate(() => ({
        topbar: getComputedStyle(document.querySelector('.judge-topbar')).display,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        legendColors: [...document.querySelectorAll('.status-legend .evidence-tag')].map(el => getComputedStyle(el).color),
        pageRules: [...document.styleSheets].flatMap(sheet => [...sheet.cssRules])
          .filter(rule => rule.cssText.includes('@page')).map(rule => rule.cssText),
      }));
      assert.equal(result.print.topbar, 'none');
      assert(result.print.pageRules.some(rule => /a4/i.test(rule) && /12mm/.test(rule)));
      await page.pdf({ path: path.join(dependencyRoot, 'judge-a4.pdf'), preferCSSPageSize: true, printBackground: true });
    }
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(failedRequests, []);
    assert.deepEqual(externalRequests, []);
    result.viewports.push({ viewport, ...metrics, consoleErrors, pageErrors, failedRequests, externalRequests, printButtonCalls: 1, footerReachable: true });
    await context.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${outDir}/checks.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ syntaxFiles: result.syntax.length, inline: 'pass', http: result.http, researchColumns: columns.length, viewports: result.viewports, print: result.print, evidence: outDir }, null, 2));
