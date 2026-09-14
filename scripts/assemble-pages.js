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
.kawa-product-bar{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:8px 12px;padding-top:max(8px,env(safe-area-inset-top));background:rgba(7,11,20,.96);border-bottom:1px solid rgba(244,63,94,.35);font-family:system-ui,sans-serif}
.kawa-product-bar strong{color:#fff;font-size:.9rem}
.kawa-product-bar span{color:#94a3b8;font-size:.8rem;flex:1;min-width:140px}
.kawa-product-bar a,.kawa-product-bar code,.kawa-product-bar button{display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:10px;font-size:.8rem;font-weight:600;text-decoration:none;min-height:40px;border:0;cursor:pointer}
.kawa-product-bar a.primary{background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff}
.kawa-product-bar a.secondary{background:rgba(30,41,59,.9);color:#e2e8f0;border:1px solid rgba(148,163,184,.25)}
.kawa-product-bar code{background:rgba(15,23,42,.9);color:#38bdf8;border:1px solid rgba(56,189,248,.25)}
.kawa-product-bar .kawa-product-dismiss{background:transparent;color:#94a3b8;padding:6px 10px;min-width:40px}
body.kawa-fullscreen.has-kawa-product-bar .kawa-root,html.kawa-fullscreen.has-kawa-product-bar .kawa-root{padding-top:calc(48px + env(safe-area-inset-top))}
@media(max-width:720px){
  .kawa-product-bar span,.kawa-product-bar code{display:none}
  .kawa-product-bar{gap:6px}
  .kawa-product-bar a{flex:1}
}
</style>
<div class="kawa-product-bar" id="kawa-product-bar" role="banner">
  <strong>Kawaijs</strong>
  <span>Ren'Py for the Web — narrative script, static deploy, native CSS.</span>
  <a class="primary" href="./showcase/">Play demo</a>
  <a class="secondary" href="./playground/">Try in browser</a>
  <code>npx kawa create my-novel</code>
  <button type="button" class="kawa-product-dismiss" id="kawa-product-dismiss" aria-label="Hide toolbar">✕</button>
</div>
<script>
(function(){
  var bar=document.getElementById('kawa-product-bar');
  var btn=document.getElementById('kawa-product-dismiss');
  if(!bar) return;
  function hide(){
    bar.remove();
    document.documentElement.classList.remove('has-kawa-product-bar');
    document.body.classList.remove('has-kawa-product-bar');
    try{sessionStorage.setItem('kawa-hide-product-bar','1')}catch(e){}
  }
  try{
    if(sessionStorage.getItem('kawa-hide-product-bar')==='1'){hide();return;}
  }catch(e){}
  document.documentElement.classList.add('has-kawa-product-bar');
  document.body.classList.add('has-kawa-product-bar');
  if(btn) btn.addEventListener('click',hide);
})();
</script>
`;

if (!html.includes('id="kawa-product-bar"')) {
  html = html.replace('<body>', `<body>\n${cta}`);
  fs.writeFileSync(indexPath, html, 'utf8');
}

const pgIndex = path.join(docsOut, 'playground', 'index.html');
if (fs.existsSync(pgIndex)) {
  let pg = fs.readFileSync(pgIndex, 'utf8');
  pg = pg.replace('href="../favicon.svg"', 'href="../favicon.svg"');
  fs.writeFileSync(pgIndex, pg, 'utf8');
}

// Site-wide sitemap + robots for Google Search Console (authoritative for the Pages site)
const siteOrigin = 'https://biagio-scaglia.github.io/KawaiJS/';
const today = new Date().toISOString().slice(0, 10);
const lessonLabels = [
  'hub',
  'lesson_install',
  'lesson_script',
  'lesson_stage',
  'lesson_branch',
  'lesson_deploy',
  'lesson_seo'
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlEntry(loc, { priority = 0.7, changefreq = 'weekly', alternates = [] } = {}) {
  const alts = alternates
    .map(
      (a) =>
        `    <xhtml:link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}" />`
    )
    .join('\n');
  return `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${Number(priority).toFixed(1)}</priority>${alts ? `\n${alts}` : ''}
  </url>`;
}

const home = siteOrigin;
const homeIt = `${siteOrigin}?lang=it`;
const entries = [
  urlEntry(home, {
    priority: 1.0,
    changefreq: 'weekly',
    alternates: [
      { hreflang: 'en', href: home },
      { hreflang: 'it', href: homeIt },
      { hreflang: 'x-default', href: home }
    ]
  }),
  urlEntry(`${siteOrigin}showcase/`, { priority: 0.9, changefreq: 'weekly' }),
  urlEntry(`${siteOrigin}playground/`, { priority: 0.9, changefreq: 'weekly' }),
  urlEntry(homeIt, {
    priority: 0.8,
    changefreq: 'monthly',
    alternates: [
      { hreflang: 'en', href: home },
      { hreflang: 'it', href: homeIt },
      { hreflang: 'x-default', href: home }
    ]
  }),
  ...lessonLabels.map((label) =>
    urlEntry(`${siteOrigin}?at=${encodeURIComponent(label)}`, {
      priority: 0.6,
      changefreq: 'monthly'
    })
  ),
  urlEntry(`${siteOrigin}llms.txt`, { priority: 0.4, changefreq: 'monthly' })
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(docsOut, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(
  path.join(docsOut, 'robots.txt'),
  `User-agent: *\nAllow: /\n\n# Google Search Console\nSitemap: ${siteOrigin}sitemap.xml\n`,
  'utf8'
);

console.log(`✅ Assembled GitHub Pages site → ${docsOut}`);
console.log('   /           interactive docs + CTA');
console.log('   /showcase/  After the Bell demo');
console.log('   /playground/ zero-install editor');
console.log('   /sitemap.xml + /robots.txt (GSC-ready)');
