import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsOut = path.join(root, 'docs');

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

run('node ./packages/cli/bin/kawa.js build ./examples/docs');
run('node ./packages/cli/bin/kawa.js build ./examples/showcase');
run('node ./scripts/build-playground.js');

rimraf(docsOut);
fs.mkdirSync(docsOut, { recursive: true });
copyDir(path.join(root, 'examples', 'docs', 'dist'), docsOut);
copyDir(path.join(root, 'examples', 'showcase', 'dist'), path.join(docsOut, 'showcase'));
copyDir(path.join(root, 'playground', 'dist'), path.join(docsOut, 'playground'));
fs.writeFileSync(path.join(docsOut, '.nojekyll'), '');

const indexPath = path.join(docsOut, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const cta = `
<style>
.kawa-product-bar{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:10px 16px;background:rgba(7,11,20,.92);border-bottom:1px solid rgba(244,63,94,.35);backdrop-filter:blur(10px);font-family:"Plus Jakarta Sans",system-ui,sans-serif}
.kawa-product-bar strong{color:#fff;font-size:.95rem}
.kawa-product-bar span{color:#94a3b8;font-size:.85rem;flex:1;min-width:160px}
.kawa-product-bar a,.kawa-product-bar code{display:inline-flex;align-items:center;padding:7px 12px;border-radius:10px;font-size:.82rem;font-weight:600;text-decoration:none}
.kawa-product-bar a.primary{background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff}
.kawa-product-bar a.secondary{background:rgba(30,41,59,.9);color:#e2e8f0;border:1px solid rgba(148,163,184,.25)}
.kawa-product-bar code{background:rgba(15,23,42,.9);color:#38bdf8;border:1px solid rgba(56,189,248,.25)}
body.kawa-fullscreen .kawa-root,html.kawa-fullscreen .kawa-root{padding-top:52px}
@media(max-width:720px){.kawa-product-bar span{display:none}}
</style>
<div class="kawa-product-bar" role="banner">
  <strong>Kawaijs</strong>
  <span>Ren'Py for the Web — narrative script, static deploy, native CSS.</span>
  <a class="primary" href="./showcase/">Play demo</a>
  <a class="secondary" href="./playground/">Try in browser</a>
  <code>npx kawa create my-novel</code>
</div>
`;

if (!html.includes('kawa-product-bar')) {
  html = html.replace('<body>', `<body>\n${cta}`);
  fs.writeFileSync(indexPath, html, 'utf8');
}

// Fix playground favicon relative path when nested
const pgIndex = path.join(docsOut, 'playground', 'index.html');
if (fs.existsSync(pgIndex)) {
  let pg = fs.readFileSync(pgIndex, 'utf8');
  pg = pg.replace('href="../favicon.svg"', 'href="../favicon.svg"');
  fs.writeFileSync(pgIndex, pg, 'utf8');
}

console.log(`✅ Assembled GitHub Pages site → ${docsOut}`);
console.log('   /           interactive docs + CTA');
console.log('   /showcase/  After the Bell demo');
console.log('   /playground/ zero-install editor');
