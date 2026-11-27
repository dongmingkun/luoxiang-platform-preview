import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const source = new URL('node_modules/vue/', root);
const target = new URL('web/vendor/vue/', root);
const pkg = JSON.parse(await readFile(new URL('package.json', source), 'utf8'));
const configured = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
if (pkg.version !== configured.dependencies.vue) throw new Error('Vue version must match the exact dependency pin.');
await mkdir(target, { recursive: true });
const runtime = await readFile(new URL('dist/vue.runtime.esm-browser.prod.js', source));
await writeFile(new URL('vue.runtime.esm-browser.prod.js', target), runtime);
await copyFile(new URL('LICENSE', source), new URL('LICENSE', target));
await writeFile(new URL('README.md', target), `# Vue browser runtime\n\nVue ${pkg.version}, MIT. Official npm package: https://www.npmjs.com/package/vue/v/${pkg.version}\n\nSHA-256: \`${createHash('sha256').update(runtime).digest('hex')}\`\n\nReproduce: \`npm ci --ignore-scripts\`, then \`npm run vendor:vue\`. The browser loads this local production runtime only; no CDN, compiler, or build server is required.\n`);
console.log(`Vendored Vue ${pkg.version}: ${runtime.length} bytes.`);
