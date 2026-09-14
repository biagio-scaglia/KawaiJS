import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';
import { getBaseThemeCss, getInlineRuntimeScript } from '../runtime-bundle.js';
import { loadProjectConfig } from '../config.js';
import { renderStaticShareMetaTags } from '../parse-args.js';

export interface DevServerOptions {
  port?: number;
  open?: boolean;
  startLabel?: string;
}

export function startDevServer(projectDir = '.', options: DevServerOptions = {}): void {
  const rootDir = path.resolve(process.cwd(), projectDir);

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

  let port = options.port ?? 3000;

  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Error: Cannot find '${scriptPath}'. Make sure you are inside a Kawaijs project directory.`);
    return;
  }

  const clients = new Set<http.ServerResponse>();

  // Debounced file watcher for auto-reload (script/style/config only — never assets).
  // Watching assets caused full page reloads when the browser fetched audio/images on Start
  // (especially noticeable in Opera / Windows fs.watch noise).
  let reloadTimeout: NodeJS.Timeout | null = null;
  const watchTargets = [scriptPath, stylePath, path.join(rootDir, 'game', 'kawa.config.json'), path.join(rootDir, 'kawa.config.json')]
    .filter((p) => fs.existsSync(p));
  const watchDirs = [...new Set(watchTargets.map((p) => path.dirname(p)))];

  for (const watchDir of watchDirs) {
    fs.watch(watchDir, { recursive: false }, (_eventType, filename) => {
      if (!filename) return;
      const base = path.basename(filename);
      const shouldReload =
        base.endsWith('.kawa') ||
        base.endsWith('.css') ||
        base === 'kawa.config.json';
      if (!shouldReload || base.includes('~') || base.startsWith('.') || base.endsWith('.tmp')) {
        return;
      }
      if (reloadTimeout) clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        console.log(`🔄 [${new Date().toLocaleTimeString()}] Change detected in ${base}, reloading...`);
        for (const client of clients) {
          client.write('data: reload\n\n');
        }
      }, 200);
    });
  }

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url ?? '/', `http://localhost:${port}`);
    const pathname = parsedUrl.pathname;

    // 1. SSE Live Reload endpoint
    if (pathname === '/__kawa_reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // 2. Story compilation API
    if (pathname === '/api/story.json') {
      try {
        const source = fs.readFileSync(scriptPath, 'utf-8');
        const compiledStory = compileScript(source, path.basename(scriptPath));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(compiledStory));
      } catch (err: unknown) {
        let formatted = 'Compilation Error';
        if (err instanceof KawaError) {
          const source = fs.readFileSync(scriptPath, 'utf-8');
          formatted = formatDiagnostic(err.diagnostic, source);
        } else if (err instanceof Error) {
          formatted = err.message;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: formatted }));
      }
      return;
    }

    // 3. Static Assets serving
    if (
      pathname.startsWith('/assets/') ||
      pathname.startsWith('/backgrounds/') ||
      pathname.startsWith('/characters/') ||
      pathname.startsWith('/audio/')
    ) {
      let relativeAssetPath = pathname;
      if (relativeAssetPath.startsWith('/assets/')) {
        relativeAssetPath = relativeAssetPath.slice('/assets/'.length);
      } else if (relativeAssetPath.startsWith('/')) {
        relativeAssetPath = relativeAssetPath.slice(1);
      }

      const safeAssetPath = path.normalize(relativeAssetPath).replace(/^(\.\.[/\\])+/, '');
      const assetsRoot = path.resolve(assetsDir);
      const filePath = path.resolve(assetsDir, safeAssetPath);
      const isInsideAssets =
        filePath === assetsRoot ||
        filePath.startsWith(assetsRoot + path.sep);

      if (isInsideAssets && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.mp3': 'audio/mpeg',
          '.ogg': 'audio/ogg',
          '.wav': 'audio/wav',
          '.m4a': 'audio/mp4'
        };

        const contentType = mimeTypes[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // 4. Combined Stylesheet
    const activeConfig = loadProjectConfig(rootDir);
    const sanitizeCssValue = (v: string) => v.replace(/[;{}<>\\]/g, '').slice(0, 120);
    let configCss = ':root {\n';
    if (activeConfig.theme?.primaryColor) {
      configCss += `  --kawa-primary-accent: ${sanitizeCssValue(activeConfig.theme.primaryColor)};\n`;
    }
    if (activeConfig.theme?.fontFamily) {
      configCss += `  --kawa-font-body: ${sanitizeCssValue(activeConfig.theme.fontFamily)};\n`;
    }
    if (activeConfig.theme?.headingFont) {
      configCss += `  --kawa-font-heading: ${sanitizeCssValue(activeConfig.theme.headingFont)};\n`;
    }
    configCss += '}\n';

    let combinedCss = getBaseThemeCss() + '\n\n' + configCss + '\n\n';
    if (fs.existsSync(stylePath)) {
      combinedCss += fs.readFileSync(stylePath, 'utf-8');
    }

    // 5. HTML Shell & Web Runtime
    let storyJson = 'null';
    let initialError = '';

    try {
      const source = fs.readFileSync(scriptPath, 'utf-8');
      const compiledStory = compileScript(source, path.basename(scriptPath));
      storyJson = JSON.stringify(compiledStory);
    } catch (err: unknown) {
      if (err instanceof KawaError) {
        const source = fs.readFileSync(scriptPath, 'utf-8');
        initialError = formatDiagnostic(err.diagnostic, source);
      } else if (err instanceof Error) {
        initialError = err.message;
      } else {
        initialError = String(err);
      }
    }

    const gameTitle = (activeConfig.title || 'Kawaijs Visual Novel')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const shareDescription =
      activeConfig.share?.description ||
      activeConfig.share?.siteName ||
      `Play ${activeConfig.title || 'Kawaijs Visual Novel'} in your browser.`;
    const shareImage = activeConfig.share?.defaultImage
      ? activeConfig.share.defaultImage.startsWith('http')
        ? activeConfig.share.defaultImage
        : `./assets/${activeConfig.share.defaultImage.replace(/^assets\//, '')}`
      : undefined;
    const shareMeta = renderStaticShareMetaTags({
      title: activeConfig.title || 'Kawaijs Visual Novel',
      description: shareDescription,
      siteName: activeConfig.share?.siteName || activeConfig.title,
      image: shareImage
    });

    const cliStartLabel = options.startLabel ? JSON.stringify(options.startLabel) : 'undefined';

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${gameTitle}</title>
${shareMeta}
  <style>
    ${combinedCss}
    html, body, #app {
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #000;
    }
    #error-overlay {
      display: ${initialError ? 'block' : 'none'}; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.95);
      color: #f43f5e; font-family: monospace; padding: 32px; z-index: 9999;
      white-space: pre-wrap; font-size: 1.1rem; line-height: 1.5; overflow: auto;
    }
  </style>
</head>
<body>
  <div id="error-overlay">${initialError ? initialError.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</div>
  <div id="app"></div>

  <script type="module">
    // Live Reload Connection
    try {
      const sse = new EventSource('/__kawa_reload');
      sse.onmessage = (e) => {
        if (e.data === 'reload') window.location.reload();
      };
    } catch {}

    // Inline runtime VM + DOM Renderer with Start Menu
    ${getInlineRuntimeScript('/')}

    // Load story and mount game app
    async function init() {
      const errorEl = document.getElementById('error-overlay');
      if (errorEl.style.display === 'block' && errorEl.textContent.trim()) {
        return;
      }

      try {
        let story = ${storyJson};
        if (!story) {
          const res = await fetch('/api/story.json');
          if (!res.ok) throw new Error('Failed to load story: HTTP ' + res.status);
          story = await res.json();
          if (story.error) {
            errorEl.style.display = 'block';
            errorEl.textContent = story.error;
            return;
          }
        }

        const projectConfig = ${JSON.stringify(activeConfig)};
        const cliStartLabel = ${cliStartLabel};

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
      } catch (err) {
        errorEl.style.display = 'block';
        errorEl.textContent = err.stack || err.message;
      }
    }

    init();
  </script>
</body>
</html>`);
  });

  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      port += 1;
      server.listen(port);
    } else {
      console.error('Server error:', e);
    }
  });

  server.listen(port, () => {
    console.log(`\n🌸 Kawaijs Dev Server running at:`);
    console.log(`   > Local:   \x1b[36mhttp://localhost:${port}\x1b[0m`);
    if (options.startLabel) {
      console.log(`   > Start:   label "${options.startLabel}" (--at)`);
    }
    console.log(`   > Project: ${rootDir}`);
    console.log(`   > Watching: game/script.kawa, game/style.css, game/assets/\n`);
  });
}
