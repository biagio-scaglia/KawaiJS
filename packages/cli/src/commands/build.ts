import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';
import { getBaseThemeCss, getInlineRuntimeScript } from '../runtime-bundle.js';
import { loadProjectConfig } from '../config.js';
import { buildPwaAssets, buildPwaIconSvg, renderPwaHeadTags, renderPwaRegisterScript } from '../pwa.js';
import {
  renderRobotsTxt,
  renderSeoHeadTags,
  resolveAppleTouchIcon,
  resolveFavicon,
  resolveHtmlLang,
  writeSeoIconsToDist
} from '../seo.js';
import { enrichStoryPackage } from '../i18n.js';

export interface BuildOptions {
  outDir?: string;
  startLabel?: string;
}

export function buildProject(projectDir = '.', options: BuildOptions = {}): boolean {
  const rootDir = path.resolve(process.cwd(), projectDir);
  const projectConfig = loadProjectConfig(rootDir);

  let scriptPath = path.join(rootDir, 'game', 'script.kawa');
  if (!fs.existsSync(scriptPath)) {
    const rootCandidate = path.join(rootDir, 'script.kawa');
    if (fs.existsSync(rootCandidate)) {
      scriptPath = rootCandidate;
    }
  }

  let stylePath = path.join(rootDir, 'game', 'style.css');
  if (!fs.existsSync(stylePath)) {
    const rootCandidate = path.join(rootDir, 'style.css');
    if (fs.existsSync(rootCandidate)) {
      stylePath = rootCandidate;
    }
  }

  let assetsDir = path.join(rootDir, 'game', 'assets');
  if (!fs.existsSync(assetsDir)) {
    const rootCandidate = path.join(rootDir, 'assets');
    if (fs.existsSync(rootCandidate)) {
      assetsDir = rootCandidate;
    }
  }

  const outDir = path.resolve(rootDir, options.outDir ?? 'dist');

  console.log(`\n📦 Building Kawaijs visual novel...`);
  console.log(`   Source: ${rootDir}`);
  console.log(`   Output: ${outDir}\n`);

  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Error: Cannot find '${scriptPath}'. Make sure you are inside a Kawaijs project directory.`);
    return false;
  }

  // 1. Compile Kawa Script
  let storyPackage;
  try {
    const source = fs.readFileSync(scriptPath, 'utf-8');
    storyPackage = compileScript(source, path.basename(scriptPath));
    storyPackage = enrichStoryPackage(storyPackage, rootDir);
    console.log(`✅ Script compiled successfully (${Object.keys(storyPackage.labels).length} labels).`);
  } catch (err: unknown) {
    if (err instanceof KawaError) {
      const source = fs.readFileSync(scriptPath, 'utf-8');
      console.error(formatDiagnostic(err.diagnostic, source));
    } else if (err instanceof Error) {
      console.error(`❌ Compilation error: ${err.message}`);
    }
    return false;
  }

  // 2. Prepare output directory
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // 3. Copy Assets
  const outAssetsDir = path.join(outDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    copyDirectoryRecursive(assetsDir, outAssetsDir);
    console.log(`✅ Assets copied to dist/assets/`);
  }

  // 4. Generate Combined style.css
  const sanitizeCssValue = (v: string) => v.replace(/[;{}<>\\]/g, '').slice(0, 120);
  let configCss = ':root {\n';
  if (projectConfig.theme?.primaryColor) {
    configCss += `  --kawa-primary-accent: ${sanitizeCssValue(projectConfig.theme.primaryColor)};\n`;
  }
  if (projectConfig.theme?.fontFamily) {
    configCss += `  --kawa-font-body: ${sanitizeCssValue(projectConfig.theme.fontFamily)};\n`;
  }
  if (projectConfig.theme?.headingFont) {
    configCss += `  --kawa-font-heading: ${sanitizeCssValue(projectConfig.theme.headingFont)};\n`;
  }
  configCss += '}\n';

  let combinedCss = `/* Kawaijs Bundled Stylesheet */\n` + getBaseThemeCss() + '\n\n' + configCss + '\n\n';

  if (fs.existsSync(stylePath)) {
    combinedCss += fs.readFileSync(stylePath, 'utf-8') + '\n';
  }
  fs.writeFileSync(path.join(outDir, 'style.css'), combinedCss, 'utf-8');
  console.log(`✅ Stylesheet bundled to dist/style.css`);

  // 5. SEO icons + HTML shell
  const gameTitle = (projectConfig.title || storyPackage.meta.title || 'Kawaijs Visual Novel')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const favicon = resolveFavicon(rootDir, projectConfig);
  const appleTouch = resolveAppleTouchIcon(rootDir, projectConfig, favicon);
  const generatedSvg = buildPwaIconSvg(
    projectConfig.seo?.themeColor || projectConfig.pwa?.themeColor || projectConfig.theme?.primaryColor
  );
  const icons = writeSeoIconsToDist(outDir, favicon, appleTouch, generatedSvg);
  console.log(
    favicon.isGenerated
      ? `✅ Favicon: generated default icon.svg`
      : `✅ Favicon: copied ${favicon.outFileName} from project`
  );

  const seoMeta = renderSeoHeadTags({
    config: projectConfig,
    favicon: { ...favicon, href: icons.faviconHref },
    appleTouchIcon: { ...appleTouch, href: icons.appleHref },
    pageUrl: projectConfig.seo?.canonicalUrl,
    includeIconLinks: true
  });

  const cliStartLabel = options.startLabel ? JSON.stringify(options.startLabel) : 'undefined';
  const pwaEnabled = projectConfig.pwa?.enabled !== false;
  const pwaHead = pwaEnabled ? renderPwaHeadTags(projectConfig) : '';
  const pwaRegister = pwaEnabled ? renderPwaRegisterScript() : '';
  const htmlLang = resolveHtmlLang(projectConfig);

  if (pwaEnabled) {
    const iconMime = icons.pwaIconFile.endsWith('.png') ? 'image/png' : 'image/svg+xml';
    const precacheExtra = [
      `./${icons.pwaIconFile}`,
      icons.faviconHref.replace(/^\.\//, './'),
      icons.appleHref.replace(/^\.\//, './')
    ].filter((u, i, arr) => arr.indexOf(u) === i);
    const pwa = buildPwaAssets(projectConfig, `kawa-${projectConfig.version || '0'}`, {
      iconFile: icons.pwaIconFile,
      iconMime,
      precacheExtra
    });
    fs.writeFileSync(path.join(outDir, 'manifest.webmanifest'), pwa.manifestJson, 'utf-8');
    fs.writeFileSync(path.join(outDir, 'sw.js'), pwa.serviceWorkerJs, 'utf-8');
    if (!fs.existsSync(path.join(outDir, icons.pwaIconFile))) {
      fs.writeFileSync(path.join(outDir, 'icon.svg'), pwa.iconSvg, 'utf-8');
    }
    console.log(`✅ PWA assets written (manifest, sw.js, ${icons.pwaIconFile})`);
  }

  if (projectConfig.seo?.canonicalUrl) {
    fs.writeFileSync(
      path.join(outDir, 'robots.txt'),
      renderRobotsTxt(projectConfig.seo.canonicalUrl),
      'utf-8'
    );
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${gameTitle}</title>
${seoMeta}
${pwaHead}
  <style>
    ${combinedCss}
    html, body, #app {
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #000;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
  </style>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    const story = ${JSON.stringify(storyPackage, null, 2)};
    const projectConfig = ${JSON.stringify(projectConfig)};
    const cliStartLabel = ${cliStartLabel};

    // Inline runtime VM + DOM Renderer with Start Menu
    ${getInlineRuntimeScript('./')}

    const app = mountKawaApp(story, document.getElementById('app'), {
      startLabel: cliStartLabel,
      share: projectConfig.share,
      mainMenu: {
        title: projectConfig.title,
        galleryItems: projectConfig.gallery
      },
      typewriterSpeed: projectConfig.settings?.textSpeed,
      autoDelayMs: projectConfig.settings?.autoDelay,
      virtualCanvas: {
        width: projectConfig.window?.width || 1280,
        height: projectConfig.window?.height || 720
      }
    });
    window.__kawa_app = app;
    ${pwaRegister}
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent, 'utf-8');
  console.log(`✅ Static web application generated: dist/index.html`);
  console.log(`\n🎉 Production build complete! Ready for GitHub Pages, Netlify, itch.io, etc.\n`);
  return true;
}

function copyDirectoryRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
