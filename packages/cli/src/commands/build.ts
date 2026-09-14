import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';
import { getBaseThemeCss, getInlineRuntimeScript } from '../runtime-bundle.js';
import { loadProjectConfig } from '../config.js';
import { renderStaticShareMetaTags } from '../parse-args.js';
import { buildPwaAssets, renderPwaHeadTags, renderPwaRegisterScript } from '../pwa.js';

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

  // 5. Generate Standalone HTML Application
  const gameTitle = (projectConfig.title || storyPackage.meta.title || 'Kawaijs Visual Novel')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const shareDescription =
    projectConfig.share?.description ||
    projectConfig.share?.siteName ||
    `Play ${projectConfig.title || storyPackage.meta.title || 'Kawaijs Visual Novel'} in your browser.`;
  const shareImage = projectConfig.share?.defaultImage
    ? projectConfig.share.defaultImage.startsWith('http')
      ? projectConfig.share.defaultImage
      : `./assets/${projectConfig.share.defaultImage.replace(/^assets\//, '')}`
    : undefined;
  const shareMeta = renderStaticShareMetaTags({
    title: projectConfig.title || storyPackage.meta.title || 'Kawaijs Visual Novel',
    description: shareDescription,
    siteName: projectConfig.share?.siteName || projectConfig.title,
    image: shareImage
  });

  const cliStartLabel = options.startLabel ? JSON.stringify(options.startLabel) : 'undefined';
  const pwaEnabled = projectConfig.pwa?.enabled !== false;
  const pwaHead = pwaEnabled ? renderPwaHeadTags(projectConfig) : '';
  const pwaRegister = pwaEnabled ? renderPwaRegisterScript() : '';

  if (pwaEnabled) {
    const pwa = buildPwaAssets(projectConfig, `kawa-${projectConfig.version || '0'}`);
    fs.writeFileSync(path.join(outDir, 'manifest.webmanifest'), pwa.manifestJson, 'utf-8');
    fs.writeFileSync(path.join(outDir, 'sw.js'), pwa.serviceWorkerJs, 'utf-8');
    fs.writeFileSync(path.join(outDir, 'icon.svg'), pwa.iconSvg, 'utf-8');
    console.log(`✅ PWA assets written (manifest, sw.js, icon.svg)`);
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${gameTitle}</title>
${shareMeta}
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
