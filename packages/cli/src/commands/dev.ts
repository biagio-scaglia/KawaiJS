import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';
import { getBaseThemeCss, getInlineRuntimeScript } from '../runtime-bundle.js';

export interface DevServerOptions {
  port?: number;
  open?: boolean;
}

export function startDevServer(projectDir = '.', options: DevServerOptions = {}): void {
  const rootDir = path.resolve(process.cwd(), projectDir);
  const scriptPath = path.join(rootDir, 'game', 'script.kawa');
  const stylePath = path.join(rootDir, 'game', 'style.css');
  const assetsDir = path.join(rootDir, 'game', 'assets');
  let port = options.port ?? 3000;

  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Error: Cannot find '${scriptPath}'. Make sure you are inside a Kawaijs project directory.`);
    return;
  }

  const clients = new Set<http.ServerResponse>();

  // Debounced file watcher for auto-reload
  let reloadTimeout: NodeJS.Timeout | null = null;
  const gameDir = path.join(rootDir, 'game');
  if (fs.existsSync(gameDir)) {
    fs.watch(gameDir, { recursive: true }, (_eventType, filename) => {
      if (
        filename &&
        (filename.endsWith('.kawa') || filename.endsWith('.css') || filename.startsWith('assets')) &&
        !filename.includes('~') &&
        !filename.startsWith('.') &&
        !filename.endsWith('.tmp')
      ) {
        if (reloadTimeout) clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(() => {
          console.log(`🔄 [Kawa Dev] File changed: ${filename}. Reloading...`);
          for (const client of clients) {
            try {
              client.write(`data: reload\n\n`);
            } catch {}
          }
        }, 250);
      }
    });
  }

  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';

    // 1. SSE Live Reload Endpoint
    if (url === '/__kawa_reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // 2. Dynamic Story JSON API
    if (url === '/api/story.json') {
      try {
        const source = fs.readFileSync(scriptPath, 'utf-8');
        const story = compileScript(source, path.basename(scriptPath));
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(JSON.stringify(story));
      } catch (err: unknown) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        let errMsg = 'Compilation Error';
        if (err instanceof KawaError) {
          const source = fs.readFileSync(scriptPath, 'utf-8');
          errMsg = formatDiagnostic(err.diagnostic, source);
        } else if (err instanceof Error) {
          errMsg = err.message;
        }
        res.end(JSON.stringify({ error: errMsg }));
      }
      return;
    }

    // 3. User & Default Stylesheet
    if (url === '/style.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      let combinedCss = `/* Kawaijs Base Theme */\n` + getBaseThemeCss() + '\n\n';

      if (fs.existsSync(stylePath)) {
        combinedCss += `/* User Custom Styles */\n` + fs.readFileSync(stylePath, 'utf-8');
      }
      res.end(combinedCss);
      return;
    }

    // 4. Game Assets (/assets/*)
    if (url.startsWith('/assets/')) {
      const cleanUrl = url.split('?')[0]!;
      const relPath = decodeURIComponent(cleanUrl.replace(/^\/?assets\//, ''));
      let filePath = path.join(assetsDir, relPath);

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        const parsed = path.parse(filePath);
        const cleanName = parsed.name.replace(/^bg[\s_]+/i, '');
        
        for (const nameCandidate of [parsed.name, cleanName]) {
          for (const ext of ['', '.svg', '.png', '.webp', '.jpg', '.jpeg', '.mp3', '.ogg', '.wav']) {
            const candidate = path.join(parsed.dir, nameCandidate + ext);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
              filePath = candidate;
              break;
            }
          }
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) break;
        }
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.mp3': 'audio/mpeg',
          '.ogg': 'audio/ogg',
          '.wav': 'audio/wav'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
        return;
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Asset not found');
        return;
      }
    }

    // 5. HTML Shell & Web Runtime
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kawaijs Visual Novel</title>
  <link rel="stylesheet" href="/style.css">
  <style>
    body { margin: 0; padding: 0; background: #000; overflow: hidden; }
    #error-overlay {
      display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.95);
      color: #f43f5e; font-family: monospace; padding: 32px; z-index: 9999;
      white-space: pre-wrap; font-size: 1.1rem; line-height: 1.5;
    }
  </style>
</head>
<body>
  <div id="error-overlay"></div>
  <div id="app"></div>

  <script type="module">
    // Live Reload Connection
    const sse = new EventSource('/__kawa_reload');
    sse.onmessage = (e) => {
      if (e.data === 'reload') window.location.reload();
    };

    // Load story and mount game app
    async function init() {
      const errorEl = document.getElementById('error-overlay');
      try {
        const res = await fetch('/api/story.json');
        const story = await res.json();
        if (story.error) {
          errorEl.style.display = 'block';
          errorEl.textContent = story.error;
          return;
        }

        // Inline runtime VM + DOM Renderer with Start Menu
        ${getInlineRuntimeScript('/')}

        const app = mountKawaApp(story, document.getElementById('app'));
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
    console.log(`   > Project: ${rootDir}`);
    console.log(`   > Watching: game/script.kawa, game/style.css, game/assets/\n`);
  });
}
