import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';

export interface DevServerOptions {
  port?: number;
  open?: boolean;
}

function getBaseThemeCss(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(dirname, '..', '..', '..', 'renderer-dom', 'src', 'theme.css'),
    path.resolve(dirname, '..', '..', '..', 'renderer-dom', 'dist', 'theme.css'),
    path.resolve(dirname, '..', '..', 'node_modules', '@kawaijs', 'renderer-dom', 'src', 'theme.css'),
    path.resolve(dirname, '..', '..', 'node_modules', '@kawaijs', 'renderer-dom', 'dist', 'theme.css')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return fs.readFileSync(c, 'utf-8');
    }
  }

  // Built-in fallback base CSS
  return `
:root {
  --kawa-font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --kawa-bg-color: #0b0f19;
  --kawa-text-color: #f3f4f6;
  --kawa-primary-accent: #f43f5e;
  --kawa-dialogue-bg: rgba(15, 23, 42, 0.85);
  --kawa-dialogue-border: rgba(244, 63, 94, 0.3);
  --kawa-dialogue-radius: 12px;
  --kawa-dialogue-padding: 24px 32px;
  --kawa-speaker-bg: #f43f5e;
  --kawa-speaker-color: #ffffff;
  --kawa-speaker-radius: 6px;
  --kawa-choice-bg: rgba(30, 41, 59, 0.9);
  --kawa-choice-hover-bg: rgba(244, 63, 94, 0.85);
  --kawa-choice-color: #ffffff;
  --kawa-choice-border: 1px solid rgba(255, 255, 255, 0.15);
  --kawa-choice-radius: 8px;
  --kawa-choice-padding: 14px 28px;
  --kawa-menu-btn-bg: rgba(15, 23, 42, 0.6);
  --kawa-menu-btn-hover-bg: rgba(244, 63, 94, 0.8);
  --kawa-stage-aspect-ratio: 16 / 9;
}
html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #030712; overflow: hidden; }
.kawa-root { position: relative; width: 100vw; height: 100vh; background: radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%); color: var(--kawa-text-color); font-family: var(--kawa-font-family); display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none; box-sizing: border-box; }
.kawa-root * { box-sizing: border-box; }
.kawa-stage { position: relative; width: 100%; max-width: calc(100vh * (16 / 9)); aspect-ratio: var(--kawa-stage-aspect-ratio); background: radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); }
.kawa-background { position: absolute; inset: 0; z-index: 1; background: radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%); overflow: hidden; }
.kawa-bg-layer { position: absolute; inset: 0; background-size: cover; background-position: center; background-repeat: no-repeat; transition: opacity 0.4s ease-in-out; opacity: 0; }
.kawa-bg-layer.active { opacity: 1; }
.kawa-characters { position: absolute; inset: 0; pointer-events: none; z-index: 2; display: flex; align-items: flex-end; }
.kawa-sprite { position: absolute; bottom: 0; height: 85%; transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease; display: flex; align-items: flex-end; justify-content: center; }
.kawa-sprite img { max-height: 100%; width: auto; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.5)); }
.kawa-sprite.kawa-pos-left { left: 15%; transform: translateX(-50%); }
.kawa-sprite.kawa-pos-center { left: 50%; transform: translateX(-50%); }
.kawa-sprite.kawa-pos-right { left: 85%; transform: translateX(-50%); }
.kawa-ui-layer { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; justify-content: flex-end; padding: 32px 48px; pointer-events: none; }
.kawa-dialogue-box { position: relative; width: 100%; min-height: 140px; background: var(--kawa-dialogue-bg); backdrop-filter: blur(12px); border: 1px solid var(--kawa-dialogue-border); border-radius: var(--kawa-dialogue-radius); padding: var(--kawa-dialogue-padding); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); pointer-events: auto; cursor: pointer; }
.kawa-speaker-tag { display: inline-block; font-weight: 700; font-size: 1.1rem; color: var(--kawa-speaker-color); background-color: var(--kawa-speaker-bg); padding: 4px 14px; border-radius: var(--kawa-speaker-radius); margin-bottom: 10px; }
.kawa-dialogue-text { font-size: 1.15rem; line-height: 1.65; color: var(--kawa-text-color); word-break: break-word; }
.kawa-continue-indicator { position: absolute; right: 24px; bottom: 16px; font-size: 1rem; color: var(--kawa-primary-accent); animation: kawa-bounce 1.2s infinite ease-in-out; }
@keyframes kawa-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
.kawa-choice-container { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; gap: 14px; width: 80%; max-width: 500px; pointer-events: auto; z-index: 20; }
.kawa-choice-btn { background: var(--kawa-choice-bg); backdrop-filter: blur(8px); color: var(--kawa-choice-color); border: var(--kawa-choice-border); border-radius: var(--kawa-choice-radius); padding: var(--kawa-choice-padding); font-size: 1.05rem; font-weight: 600; cursor: pointer; text-align: center; }
.kawa-choice-btn:hover { background: var(--kawa-choice-hover-bg); transform: translateY(-2px) scale(1.02); }
.kawa-quick-menu { display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; pointer-events: auto; }
.kawa-btn { background: var(--kawa-menu-btn-bg); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 4px 12px; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.kawa-btn:hover { background: var(--kawa-menu-btn-hover-bg); color: #ffffff; }
.kawa-btn.active { background: var(--kawa-primary-accent); color: #ffffff; }
.kawa-mode-badge { position: absolute; top: 20px; right: 24px; z-index: 30; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(6px); border: 1px solid var(--kawa-primary-accent); border-radius: 20px; padding: 6px 14px; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em; color: var(--kawa-primary-accent); display: inline-flex; align-items: center; gap: 6px; }
.kawa-modal-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
.kawa-modal-card { background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; width: 90%; max-width: 750px; max-height: 85%; display: flex; flex-direction: column; padding: 24px 28px; }
.kawa-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; }
.kawa-modal-title { font-size: 1.35rem; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px; }
.kawa-modal-body { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.kawa-slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.kawa-slot-card { background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 130px; }
.kawa-ending-card { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(16px); border: 1px solid rgba(244, 63, 94, 0.4); border-radius: 16px; padding: 32px 48px; display: flex; flex-direction: column; align-items: center; text-align: center; z-index: 50; }
.kawa-ending-title { font-size: 2rem; font-weight: 800; color: var(--kawa-primary-accent); margin-bottom: 8px; }
.kawa-ending-subtitle { font-size: 1.1rem; color: #cbd5e1; margin-bottom: 16px; }
.kawa-setting-row { display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); }
.kawa-setting-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; font-weight: 600; color: #e2e8f0; }
.kawa-setting-value { font-size: 0.85rem; color: var(--kawa-primary-accent); font-weight: 700; }
.kawa-slider { width: 100%; height: 6px; border-radius: 3px; background: #334155; outline: none; cursor: pointer; }
.kawa-bold { font-weight: 700; }
.kawa-italic { font-style: italic; }
`;
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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(story));
      } catch (err: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
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
      res.writeHead(200, { 'Content-Type': 'text/css' });
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
        // Try fallback extensions and strip prefixes
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
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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

    // Load story and start game
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

        // Inline runtime VM + DOM Renderer
        ${getInlineRuntimeScript()}

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

function getInlineRuntimeScript(): string {
  return `
    const SVG_ICONS = {
      back: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
      history: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>',
      save: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
      load: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      auto: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
      skip: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
      settings: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      volumeOn: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
      volumeMute: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
      trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      close: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      arrowDown: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
      replay: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
    };

    function formatRichText(raw) {
      return (raw || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\\{b\\}(.*?)\\{\\/b\\}/gi, '<strong class="kawa-bold">$1</strong>')
        .replace(/\\{i\\}(.*?)\\{\\/i\\}/gi, '<em class="kawa-italic">$1</em>')
        .replace(/\\{color=([^}]+)\\}(.*?)\\{\\/color\\}/gi, '<span style="color:$1">$2</span>')
        .replace(/\\{size=([^}]+)\\}(.*?)\\{\\/size\\}/gi, '<span style="font-size:$1">$2</span>');
    }

    class MemoryStorageAdapter {
      constructor() { this.store = new Map(); }
      getItem(k) { return this.store.get(k) || null; }
      setItem(k, v) { this.store.set(k, v); }
      removeItem(k) { this.store.delete(k); }
    }
    class LocalStorageAdapter {
      getItem(k) { return localStorage.getItem(k); }
      setItem(k, v) { localStorage.setItem(k, v); }
      removeItem(k) { localStorage.removeItem(k); }
    }
    class SaveManager {
      constructor() { this.storage = typeof localStorage !== 'undefined' ? new LocalStorageAdapter() : new MemoryStorageAdapter(); }
      async saveSlot(id, snapshot, previewText) {
        const slot = { id, name: 'Slot ' + id, timestamp: Date.now(), snapshot, previewText };
        this.storage.setItem('kawaijs_save_' + id, JSON.stringify(slot));
        return slot;
      }
      async loadSlot(id) {
        const raw = this.storage.getItem('kawaijs_save_' + id);
        return raw ? JSON.parse(raw) : null;
      }
      async deleteSlot(id) {
        this.storage.removeItem('kawaijs_save_' + id);
      }
      async listSlots(total = 6) {
        const slots = [];
        for (let i = 1; i <= total; i++) {
          slots.push(await this.loadSlot(String(i)));
        }
        return slots;
      }
    }
    function evaluateCondition(cond, vars) {
      const t = (cond || '').trim();
      if (!t || t === 'true') return true;
      if (t === 'false') return false;
      const toNum = (v) => {
        if (typeof v === 'number') return v;
        if (v === true) return 1;
        if (v === false || v === undefined || v === null || v === '') return 0;
        const n = Number(v);
        return isNaN(n) ? 0 : n;
      };
      const ops = ['>=', '<=', '!=', '==', '>', '<'];
      for (const op of ops) {
        const idx = t.indexOf(op);
        if (idx !== -1) {
          const l = resolveVal(t.slice(0, idx), vars);
          const r = resolveVal(t.slice(idx + op.length), vars);
          if (op === '>=') return toNum(l) >= toNum(r);
          if (op === '<=') return toNum(l) <= toNum(r);
          if (op === '>') return toNum(l) > toNum(r);
          if (op === '<') return toNum(l) < toNum(r);
          if (op === '==') return l === r || String(l) === String(r);
          if (op === '!=') return l !== r && String(l) !== String(r);
        }
      }
      if (t.startsWith('!')) {
        const v = vars[t.slice(1).trim()];
        return v === false || v === 'false' || v === 0 || v === '0' || v === undefined || v === null || v === '';
      }
      const val = t in vars ? vars[t] : resolveVal(t, vars);
      if (val === false || val === 'false' || val === 0 || val === '0' || val === undefined || val === null || val === '') return false;
      return Boolean(val);
    }
    function resolveVal(token, vars) {
      const t = token.trim();
      if (t === 'true') return true;
      if (t === 'false') return false;
      if (!isNaN(Number(t)) && t !== '') return Number(t);
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
      if (t in vars) return vars[t];
      return t;
    }
    function applySetOp(curr, op, val, vars) {
      const res = (typeof val === 'string' && val in vars) ? vars[val] : val;
      if (op === '+=') return Number(curr || 0) + Number(res);
      if (op === '-=') return Number(curr || 0) - Number(res);
      return res;
    }
    class StoryVM {
      constructor(story) {
        this.story = story;
        this.state = {
          currentLabel: story.meta.startLabel || 'start',
          instructionPointer: 0,
          callStack: [],
          variables: {},
          visual: { background: null, transition: null, characters: {} },
          audio: { music: null, voice: null },
          dialogue: null,
          choices: null,
          isWaitingForInput: false,
          isFinished: false
        };
        this.snapshotStack = [];
        this.listeners = new Set();
        this.audioListeners = new Set();
        this.history = [];
        this.saveManager = new SaveManager();
        this.isExecuting = false;
      }
      getState() { return this.state; }
      onStateChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
      onAudioEvent(cb) { this.audioListeners.add(cb); return () => this.audioListeners.delete(cb); }
      start() { this.execute(); }
      next() {
        if (this.state.isFinished || this.isExecuting || (this.state.choices && this.state.choices.length > 0)) return;
        this.state.isWaitingForInput = false;
        this.execute();
      }
      choose(idx) {
        if (this.isExecuting || !this.state.choices || !this.state.choices[idx]) return;
        const choice = this.state.choices[idx];
        this.state.choices = null;
        this.state.isWaitingForInput = false;
        this.state.currentLabel = choice.targetLabel;
        this.state.instructionPointer = 0;
        this.execute();
      }
      rollback() {
        if (this.snapshotStack.length <= 1) return false;
        this.snapshotStack.pop();
        const prev = this.snapshotStack[this.snapshotStack.length - 1];
        if (prev) {
          this.state = JSON.parse(JSON.stringify(prev));
          this.notify();
          return true;
        }
        return false;
      }
      canRollback() { return this.snapshotStack.length > 1; }
      async save(slot) {
        await this.saveManager.saveSlot(slot, JSON.parse(JSON.stringify(this.state)), this.state.dialogue ? this.state.dialogue.text : '');
      }
      async load(slot) {
        const data = await this.saveManager.loadSlot(slot);
        if (data && data.snapshot) {
          this.state = JSON.parse(JSON.stringify(data.snapshot.state || data.snapshot));
          this.snapshotStack = [JSON.parse(JSON.stringify(this.state))];
          this.notify();
          return true;
        }
        return false;
      }
      execute() {
        if (this.isExecuting) return;
        this.isExecuting = true;
        try {
          while (!this.state.isWaitingForInput && !this.state.isFinished) {
            const currentInstructions = this.story.labels[this.state.currentLabel];
            if (!currentInstructions || this.state.instructionPointer >= currentInstructions.length) {
              if (this.state.callStack.length > 0) {
                const ret = this.state.callStack.pop();
                this.state.currentLabel = ret.label;
                this.state.instructionPointer = ret.pointer;
                continue;
              }
              this.state.isFinished = true;
              this.state.dialogue = null;
              this.state.choices = null;
              this.notify();
              break;
            }
            const inst = currentInstructions[this.state.instructionPointer];
            this.state.instructionPointer++;
            this.executeInstruction(inst);
          }
        } finally {
          this.isExecuting = false;
        }
      }
      executeInstruction(inst) {
        switch (inst.type) {
          case 'say': {
            let spkName = null;
            let spkColor = null;
            if (inst.speaker) {
              const decl = this.story.characters[inst.speaker];
              spkName = decl ? decl.displayName : inst.speaker;
              spkColor = decl ? decl.color : null;
            }
            this.state.dialogue = { speaker: inst.speaker || null, speakerDisplayName: spkName, speakerColor: spkColor, text: inst.text };
            this.state.choices = null;
            this.state.isWaitingForInput = true;
            this.history.push({ speakerDisplayName: spkName, text: inst.text });
            this.snapshotStack.push(JSON.parse(JSON.stringify(this.state)));
            this.notify();
            break;
          }
          case 'scene': {
            this.state.visual.background = inst.background;
            this.state.visual.transition = inst.transition || null;
            this.state.visual.characters = {};
            this.notify();
            break;
          }
          case 'show': {
            this.state.visual.characters[inst.character] = {
              expression: inst.expression || undefined,
              position: inst.position || 'center'
            };
            this.notify();
            break;
          }
          case 'hide': {
            delete this.state.visual.characters[inst.character];
            this.notify();
            break;
          }
          case 'play': {
            if (inst.channel === 'music') this.state.audio.music = inst.track;
            else if (inst.channel === 'voice') this.state.audio.voice = inst.track;
            this.notifyAudio({ action: 'play', channel: inst.channel, track: inst.track, fade: inst.fade, loop: inst.loop !== false });
            break;
          }
          case 'stop': {
            if (inst.channel === 'music') this.state.audio.music = null;
            else if (inst.channel === 'voice') this.state.audio.voice = null;
            this.notifyAudio({ action: 'stop', channel: inst.channel, fade: inst.fade });
            break;
          }
          case 'menu': {
            const avail = [];
            for (const item of inst.choices) {
              if (item.condition) {
                if (evaluateCondition(item.condition, this.state.variables)) avail.push(item);
              } else {
                avail.push(item);
              }
            }
            this.state.choices = avail;
            this.state.dialogue = null;
            this.state.isWaitingForInput = true;
            this.snapshotStack.push(JSON.parse(JSON.stringify(this.state)));
            this.notify();
            break;
          }
          case 'jump': {
            this.state.currentLabel = inst.targetLabel;
            this.state.instructionPointer = 0;
            break;
          }
          case 'call': {
            this.state.callStack.push({ label: this.state.currentLabel, pointer: this.state.instructionPointer });
            this.state.currentLabel = inst.targetLabel;
            this.state.instructionPointer = 0;
            break;
          }
          case 'return': {
            if (this.state.callStack.length > 0) {
              const ret = this.state.callStack.pop();
              this.state.currentLabel = ret.label;
              this.state.instructionPointer = ret.pointer;
            } else {
              this.state.isFinished = true;
              this.notify();
            }
            break;
          }
          case 'set': {
            const cur = this.state.variables[inst.variable];
            this.state.variables[inst.variable] = applySetOp(cur, inst.operator, inst.value, this.state.variables);
            break;
          }
          case 'if': {
            const pass = evaluateCondition(inst.condition, this.state.variables);
            if (pass) {
              this.state.currentLabel = inst.thenLabel;
              this.state.instructionPointer = 0;
            } else if (inst.elseLabel) {
              this.state.currentLabel = inst.elseLabel;
              this.state.instructionPointer = 0;
            }
            break;
          }
        }
      }
      notify() { for (const l of this.listeners) l(this.state); }
      notifyAudio(e) { for (const l of this.audioListeners) l(e); }
    }
    class AudioManager {
      constructor() {
        this.masterVolume = 1.0;
        this.musicVolume = 0.8;
        this.soundVolume = 1.0;
        this.voiceVolume = 1.0;
        this.isMuted = false;
        this.currentMusicAudio = null;
        this.currentVoiceAudio = null;
        this.soundPool = [];
      }
      setMasterVolume(v) { this.masterVolume = Math.max(0, Math.min(1, v)); this.updateVolumes(); }
      setMusicVolume(v) { this.musicVolume = Math.max(0, Math.min(1, v)); this.updateVolumes(); }
      setSoundVolume(v) { this.soundVolume = Math.max(0, Math.min(1, v)); }
      setVoiceVolume(v) { this.voiceVolume = Math.max(0, Math.min(1, v)); this.updateVolumes(); }
      toggleMute() { this.isMuted = !this.isMuted; this.updateVolumes(); return this.isMuted; }
      updateVolumes() {
        if (this.currentMusicAudio) {
          this.currentMusicAudio.volume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
        }
        if (this.currentVoiceAudio) {
          this.currentVoiceAudio.volume = this.isMuted ? 0 : this.masterVolume * this.voiceVolume;
        }
      }
      playMusic(src, options = {}) {
        if (this.currentMusicAudio) {
          this.currentMusicAudio.pause();
          this.currentMusicAudio.src = '';
        }
        const audio = new Audio(src);
        audio.loop = options.loop !== false;
        const targetVolume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
        this.currentMusicAudio = audio;
        if (options.fadein && options.fadein > 0) {
          audio.volume = 0;
          audio.play().catch(() => {});
          this.fadeVolume(audio, 0, targetVolume, options.fadein * 1000);
        } else {
          audio.volume = targetVolume;
          audio.play().catch(() => {});
        }
      }
      stopMusic(options = {}) {
        const audio = this.currentMusicAudio;
        if (!audio) return;
        this.currentMusicAudio = null;
        if (options.fadeout && options.fadeout > 0) {
          this.fadeVolume(audio, audio.volume, 0, options.fadeout * 1000, () => {
            audio.pause();
            audio.src = '';
          });
        } else {
          audio.pause();
          audio.src = '';
        }
      }
      playSound(src, volume = 1) {
        if (this.isMuted) return;
        const audio = new Audio(src);
        audio.volume = volume * this.masterVolume * this.soundVolume;
        audio.play().catch(() => {});
        this.soundPool.push(audio);
        audio.addEventListener('ended', () => {
          const idx = this.soundPool.indexOf(audio);
          if (idx !== -1) this.soundPool.splice(idx, 1);
        });
      }
      playVoice(src, volume = 1) {
        if (this.currentVoiceAudio) {
          this.currentVoiceAudio.pause();
          this.currentVoiceAudio.src = '';
        }
        if (this.isMuted) return;
        const audio = new Audio(src);
        audio.volume = volume * this.masterVolume * this.voiceVolume;
        audio.play().catch(() => {});
        this.currentVoiceAudio = audio;
      }
      stopVoice() {
        if (this.currentVoiceAudio) {
          this.currentVoiceAudio.pause();
          this.currentVoiceAudio.src = '';
          this.currentVoiceAudio = null;
        }
      }
      fadeVolume(audio, from, to, durationMs, onComplete) {
        const steps = 20;
        const stepTime = durationMs / steps;
        const volumeStep = (to - from) / steps;
        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep++;
          if (this.isMuted) {
            audio.volume = 0;
          } else {
            audio.volume = Math.max(0, Math.min(1, from + volumeStep * currentStep));
          }
          if (currentStep >= steps) {
            clearInterval(interval);
            if (!this.isMuted) audio.volume = to;
            if (onComplete) onComplete();
          }
        }, stepTime);
      }
      attachToVM(vm, assetResolver) {
        return vm.onAudioEvent((event) => {
          if (event.action === 'play' && event.track) {
            const url = assetResolver(event.track, event.channel);
            if (event.channel === 'music') {
              this.playMusic(url, { fadein: event.fade, loop: event.loop });
            } else if (event.channel === 'sound') {
              this.playSound(url);
            } else if (event.channel === 'voice') {
              this.playVoice(url);
            }
          } else if (event.action === 'stop') {
            if (event.channel === 'music') {
              this.stopMusic({ fadeout: event.fade });
            } else if (event.channel === 'voice') {
              this.stopVoice();
            }
          }
        });
      }
    }

    class DOMRenderer {
      constructor(vm, container, audioManager) {
        this.vm = vm;
        this.container = container;
        this.audioManager = audioManager;
        this.isChoicePending = false;
        this.activeBgLayer = 'A';
        this.currentBgUrl = '';
        this.activeChars = new Map();
        this.typewriterSpeed = 20;
        this.autoDelayMs = 1800;
        this.isAutoMode = false;
        this.isSkipMode = false;
        this.autoTimer = null;
        this.skipInterval = null;
        this.typewriterInterval = null;
        this.isTypewriting = false;
        this.fullText = '';

        if (typeof localStorage !== 'undefined') {
          try {
            const s = JSON.parse(localStorage.getItem('kawaijs_settings') || '{}');
            if (typeof s.typewriterSpeed === 'number') this.typewriterSpeed = s.typewriterSpeed;
            if (typeof s.autoDelayMs === 'number') this.autoDelayMs = s.autoDelayMs;
          } catch {}
        }

        this.build();
        vm.onStateChange(s => this.render(s));
        this.render(vm.getState());
      }

      build() {
        this.container.innerHTML = \`
          <div class="kawa-root">
            <div class="kawa-stage">
              <div class="kawa-background">
                <div class="kawa-bg-layer kawa-bg-a active"></div>
                <div class="kawa-bg-layer kawa-bg-b"></div>
              </div>
              <div class="kawa-characters kawa-sprites"></div>
              <div class="kawa-mode-badge" style="display:none"></div>
              <div class="kawa-ui-layer">
                <div class="kawa-choice-container kawa-choices" style="display:none"></div>
                <div class="kawa-dialogue-box kawa-dialogue">
                  <div class="kawa-speaker-tag kawa-speaker" style="display:none"></div>
                  <div class="kawa-dialogue-text kawa-text"></div>
                  <div class="kawa-continue-indicator">\${SVG_ICONS.arrowDown}</div>
                </div>
                <nav class="kawa-quick-menu">
                  <button class="kawa-btn kawa-back">\${SVG_ICONS.back} <span>Back</span></button>
                  <button class="kawa-btn kawa-hist">\${SVG_ICONS.history} <span>History</span></button>
                  <button class="kawa-btn kawa-auto">\${SVG_ICONS.auto} <span>Auto</span></button>
                  <button class="kawa-btn kawa-skip">\${SVG_ICONS.skip} <span>Skip</span></button>
                  <button class="kawa-btn kawa-save">\${SVG_ICONS.save} <span>Save</span></button>
                  <button class="kawa-btn kawa-load">\${SVG_ICONS.load} <span>Load</span></button>
                  <button class="kawa-btn kawa-settings">\${SVG_ICONS.settings} <span>Settings</span></button>
                </nav>
              </div>
            </div>
          </div>\`;

        this.rootEl = this.container.querySelector('.kawa-root');
        this.bgLayerA = this.container.querySelector('.kawa-bg-a');
        this.bgLayerB = this.container.querySelector('.kawa-bg-b');
        this.charsEl = this.container.querySelector('.kawa-characters');
        this.modeBadgeEl = this.container.querySelector('.kawa-mode-badge');
        this.boxEl = this.container.querySelector('.kawa-dialogue-box');
        this.spkEl = this.container.querySelector('.kawa-speaker-tag');
        this.txtEl = this.container.querySelector('.kawa-dialogue-text');
        this.choiceEl = this.container.querySelector('.kawa-choice-container');
        this.backBtn = this.container.querySelector('.kawa-back');
        this.histBtn = this.container.querySelector('.kawa-hist');
        this.autoBtn = this.container.querySelector('.kawa-auto');
        this.skipBtn = this.container.querySelector('.kawa-skip');
        this.saveBtn = this.container.querySelector('.kawa-save');
        this.loadBtn = this.container.querySelector('.kawa-load');
        this.settingsBtn = this.container.querySelector('.kawa-settings');

        this.boxEl.addEventListener('click', () => {
          if (this.isAutoMode) this.toggleAuto(false);
          if (this.isSkipMode) this.toggleSkip(false);
          this.advance();
        });
        this.backBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isAutoMode) this.toggleAuto(false);
          if (this.isSkipMode) this.toggleSkip(false);
          this.vm.rollback();
        });
        this.histBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showHistory(); });
        this.autoBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleAuto(); });
        this.skipBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSkip(); });
        this.saveBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('save'); });
        this.loadBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('load'); });
        this.settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSettings(); });

        window.addEventListener('keydown', (e) => {
          const modal = this.rootEl.querySelector('.kawa-modal-overlay');
          if (modal) {
            if (e.key === 'Escape') modal.remove();
            return;
          }
          if (e.code === 'Space' || e.code === 'Enter') {
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
            e.preventDefault();
            if (this.isAutoMode) this.toggleAuto(false);
            if (this.isSkipMode) this.toggleSkip(false);
            this.advance();
          } else if (e.code === 'Backspace') {
            e.preventDefault();
            if (this.isAutoMode) this.toggleAuto(false);
            if (this.isSkipMode) this.toggleSkip(false);
            this.vm.rollback();
          } else if (e.key === 'a' || e.key === 'A') {
            this.toggleAuto();
          } else if (e.key === 'Tab' || e.key === 'Control') {
            e.preventDefault();
            this.toggleSkip();
          } else if (e.key === 's' || e.key === 'S') {
            this.showSaveLoad('save');
          } else if (e.key === 'l' || e.key === 'L') {
            this.showSaveLoad('load');
          } else if (e.key === 'h' || e.key === 'H') {
            this.showHistory();
          } else if (e.key === 'p' || e.key === 'P' || e.key === 'o' || e.key === 'O') {
            this.showSettings();
          }
        });
      }

      toggleAuto(force) {
        this.isAutoMode = force !== undefined ? force : !this.isAutoMode;
        if (this.isAutoMode && this.isSkipMode) this.toggleSkip(false);
        this.updateModeUI();
        if (this.isAutoMode && !this.isTypewriting) this.scheduleAuto();
        else if (!this.isAutoMode && this.autoTimer) {
          clearTimeout(this.autoTimer);
          this.autoTimer = null;
        }
      }

      toggleSkip(force) {
        this.isSkipMode = force !== undefined ? force : !this.isSkipMode;
        if (this.isSkipMode && this.isAutoMode) this.toggleAuto(false);
        this.updateModeUI();
        if (this.isSkipMode) {
          if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
          if (!this.skipInterval) {
            this.skipInterval = setInterval(() => {
              const s = this.vm.getState();
              if (s.isFinished || (s.choices && s.choices.length > 0)) {
                this.toggleSkip(false);
                return;
              }
              if (this.isTypewriting) this.finishTypewriter();
              this.vm.next();
            }, 55);
          }
        } else {
          if (this.skipInterval) { clearInterval(this.skipInterval); this.skipInterval = null; }
        }
      }

      updateModeUI() {
        if (this.autoBtn) this.autoBtn.classList.toggle('active', this.isAutoMode);
        if (this.skipBtn) this.skipBtn.classList.toggle('active', this.isSkipMode);
        if (this.modeBadgeEl) {
          if (this.isSkipMode) {
            this.modeBadgeEl.innerHTML = SVG_ICONS.skip + ' SKIP';
            this.modeBadgeEl.style.display = 'inline-flex';
          } else if (this.isAutoMode) {
            this.modeBadgeEl.innerHTML = SVG_ICONS.auto + ' AUTO';
            this.modeBadgeEl.style.display = 'inline-flex';
          } else {
            this.modeBadgeEl.style.display = 'none';
          }
        }
      }

      scheduleAuto() {
        if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
        if (!this.isAutoMode) return;
        const s = this.vm.getState();
        if (s.isFinished || (s.choices && s.choices.length > 0)) return;
        const dur = Math.max(800, this.autoDelayMs + (s.dialogue ? s.dialogue.text.length * 15 : 0));
        this.autoTimer = setTimeout(() => {
          if (this.isAutoMode) {
            const cur = this.vm.getState();
            if (!cur.isFinished && (!cur.choices || cur.choices.length === 0)) this.vm.next();
          }
        }, dur);
      }

      advance() {
        if (this.isTypewriting) this.finishTypewriter();
        else this.vm.next();
      }

      render(state) {
        this.isChoicePending = false;
        this.backBtn.disabled = !this.vm.canRollback();

        // 1. Dual Background Crossfade
        if (state.visual.background) {
          const rawBg = state.visual.background;
          const bg = rawBg.replace(/^bg[\s_]+/i, '').trim();
          const baseName = bg.replace(/\\.(svg|png|jpg|jpeg|webp)$/i, '');
          const svgUrl = '/assets/backgrounds/' + (bg.includes('.') ? bg : bg + '.svg');
          const pngUrl = '/assets/backgrounds/' + baseName + '.png';

          if (svgUrl !== this.currentBgUrl) {
            this.currentBgUrl = svgUrl;
            const inLayer = this.activeBgLayer === 'A' ? this.bgLayerB : this.bgLayerA;
            const outLayer = this.activeBgLayer === 'A' ? this.bgLayerA : this.bgLayerB;

            inLayer.style.backgroundImage = 'url("' + svgUrl + '")';
            inLayer.classList.add('active');
            outLayer.classList.remove('active');
            this.activeBgLayer = this.activeBgLayer === 'A' ? 'B' : 'A';

            const testImg = new Image();
            testImg.onerror = () => {
              const img2 = new Image();
              img2.onload = () => {
                inLayer.style.backgroundImage = 'url("' + pngUrl + '")';
              };
              img2.onerror = () => {
                inLayer.style.backgroundImage = 'radial-gradient(ellipse at center, #334155 0%, #0f172a 100%)';
              };
              img2.src = pngUrl;
            };
            testImg.src = svgUrl;
          }
        } else {
          this.currentBgUrl = '';
          this.bgLayerA.classList.remove('active');
          this.bgLayerB.classList.remove('active');
        }

        // 2. Character Reconciliation
        const currChars = state.visual.characters;
        const currIds = new Set(Object.keys(currChars));

        for (const [id, rec] of this.activeChars.entries()) {
          if (!currIds.has(id)) {
            rec.div.remove();
            this.activeChars.delete(id);
          }
        }

        for (const [id, char] of Object.entries(currChars)) {
          const posClass = 'kawa-sprite kawa-pos-' + (char.position || 'center');
          const expr = char.expression ? '/' + char.expression : '';
          const primarySrc = '/assets/characters/' + id + expr + '.svg';

          let rec = this.activeChars.get(id);
          if (!rec) {
            const div = document.createElement('div');
            div.className = posClass;
            const img = document.createElement('img');
            img.src = primarySrc;
            img.alt = id;
            let fallback = 0;
            img.onerror = () => {
              fallback++;
              if (fallback === 1) img.src = '/assets/characters/' + id + expr + '.png';
              else if (fallback === 2 && char.expression) img.src = '/assets/characters/' + id + '_' + char.expression + '.svg';
              else if (fallback === 3 && char.expression) img.src = '/assets/characters/' + id + '_' + char.expression + '.png';
              else {
                img.style.display = 'none';
                div.style.width = '220px'; div.style.height = '420px';
                div.style.background = 'rgba(244,63,94,0.25)'; div.style.border = '2px dashed #f43f5e';
                div.style.borderRadius = '16px'; div.style.display = 'flex'; div.style.alignItems = 'center';
                div.style.justifyContent = 'center'; div.style.color = '#fff'; div.style.fontWeight = '600';
                div.textContent = id + (char.expression ? ' (' + char.expression + ')' : '');
              }
            };
            div.appendChild(img);
            this.charsEl.appendChild(div);
            rec = { div, img, expression: char.expression, position: char.position };
            this.activeChars.set(id, rec);
          } else {
            rec.div.className = posClass;
            if (rec.expression !== char.expression) {
              rec.expression = char.expression;
              rec.img.style.display = 'block';
              rec.img.src = primarySrc;
            }
          }
        }

        if (state.dialogue) {
          this.boxEl.style.display = 'block';
          if (state.dialogue.speakerDisplayName) {
            this.spkEl.style.display = 'inline-block';
            this.spkEl.textContent = state.dialogue.speakerDisplayName;
            if (state.dialogue.speakerColor) this.spkEl.style.backgroundColor = state.dialogue.speakerColor;
          } else {
            this.spkEl.style.display = 'none';
          }
          this.startTypewriter(state.dialogue.text);
        } else {
          this.boxEl.style.display = 'none';
        }

        if (state.choices && state.choices.length > 0) {
          if (this.isAutoMode) this.toggleAuto(false);
          if (this.isSkipMode) this.toggleSkip(false);
          this.choiceEl.innerHTML = '';
          this.choiceEl.style.display = 'flex';
          this.choiceEl.style.pointerEvents = 'auto';
          this.choiceEl.style.opacity = '1';
          state.choices.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.className = 'kawa-choice-btn kawa-choice';
            btn.textContent = c.text;
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.isChoicePending) return;
              this.isChoicePending = true;
              this.choiceEl.style.pointerEvents = 'none';
              this.choiceEl.style.opacity = '0.5';
              this.vm.choose(idx);
            });
            this.choiceEl.appendChild(btn);
          });
        } else {
          this.choiceEl.style.display = 'none';
        }

        if (state.isFinished) {
          if (this.isAutoMode) this.toggleAuto(false);
          if (this.isSkipMode) this.toggleSkip(false);
          this.choiceEl.style.display = 'none';
          const exEnd = this.rootEl.querySelector('.kawa-ending-card');
          if (!exEnd) {
            const endCard = document.createElement('div');
            endCard.className = 'kawa-ending-card';
            endCard.innerHTML = \`
              <div class="kawa-ending-title">The End</div>
              <div class="kawa-ending-subtitle">Story complete! Thank you for playing.</div>
              <div style="display:flex;gap:12px;margin-top:16px;">
                <button class="kawa-btn kawa-btn-replay">\${SVG_ICONS.replay} Play Again</button>
                <button class="kawa-btn kawa-btn-load-end">\${SVG_ICONS.load} Load Slot</button>
              </div>\`;
            endCard.querySelector('.kawa-btn-replay').addEventListener('click', () => {
              window.location.reload();
            });
            endCard.querySelector('.kawa-btn-load-end').addEventListener('click', () => {
              this.showSaveLoad('load');
            });
            this.rootEl.appendChild(endCard);
          }
        } else {
          const exEnd = this.rootEl.querySelector('.kawa-ending-card');
          if (exEnd) exEnd.remove();
        }
      }

      startTypewriter(text) {
        if (this.typewriterInterval) clearInterval(this.typewriterInterval);
        if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
        this.fullText = text;

        if (this.typewriterSpeed <= 0 || this.isSkipMode) {
          this.txtEl.innerHTML = formatRichText(text);
          this.isTypewriting = false;
          if (this.isAutoMode) this.scheduleAuto();
          return;
        }

        this.isTypewriting = true;
        let idx = 0;
        this.txtEl.innerHTML = '';
        this.typewriterInterval = setInterval(() => {
          idx++;
          this.txtEl.innerHTML = formatRichText(this.fullText.slice(0, idx));
          if (idx >= this.fullText.length) {
            this.finishTypewriter();
          }
        }, this.typewriterSpeed);
      }

      finishTypewriter() {
        if (this.typewriterInterval) {
          clearInterval(this.typewriterInterval);
          this.typewriterInterval = null;
        }
        this.txtEl.innerHTML = formatRichText(this.fullText);
        this.isTypewriting = false;
        if (this.isAutoMode) this.scheduleAuto();
      }

      showSettings() {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title">\${SVG_ICONS.settings} <span>Settings</span></div>
            <button class="kawa-btn kawa-close-btn">\${SVG_ICONS.close} <span>Close</span></button>
          </div>
          <div class="kawa-modal-body">
            <div class="kawa-setting-row">
              <div class="kawa-setting-header">
                <span>Text Speed</span>
                <span class="kawa-setting-value" id="kawa-sp-val">\${this.typewriterSpeed === 0 ? 'Instant' : this.typewriterSpeed + 'ms'}</span>
              </div>
              <input type="range" class="kawa-slider" id="kawa-sp-sl" min="0" max="60" step="5" value="\${this.typewriterSpeed}">
            </div>
            <div class="kawa-setting-row">
              <div class="kawa-setting-header">
                <span>Auto Delay</span>
                <span class="kawa-setting-value" id="kawa-au-val">\${(this.autoDelayMs / 1000).toFixed(1)}s</span>
              </div>
              <input type="range" class="kawa-slider" id="kawa-au-sl" min="500" max="5000" step="250" value="\${this.autoDelayMs}">
            </div>
          </div>\`;
        card.querySelector('.kawa-close-btn').addEventListener('click', () => ov.remove());
        const spSl = card.querySelector('#kawa-sp-sl');
        const spVal = card.querySelector('#kawa-sp-val');
        spSl.addEventListener('input', () => {
          this.typewriterSpeed = Number(spSl.value);
          spVal.textContent = this.typewriterSpeed === 0 ? 'Instant' : this.typewriterSpeed + 'ms';
          this.saveSettings();
        });
        const auSl = card.querySelector('#kawa-au-sl');
        const auVal = card.querySelector('#kawa-au-val');
        auSl.addEventListener('input', () => {
          this.autoDelayMs = Number(auSl.value);
          auVal.textContent = (this.autoDelayMs / 1000).toFixed(1) + 's';
          this.saveSettings();
        });
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }

      saveSettings() {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('kawaijs_settings', JSON.stringify({
              typewriterSpeed: this.typewriterSpeed,
              autoDelayMs: this.autoDelayMs
            }));
          } catch {}
        }
      }

      async showSaveLoad(mode) {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title">\${mode === 'save' ? SVG_ICONS.save : SVG_ICONS.load} <span>\${mode === 'save' ? 'Save Game' : 'Load Game'}</span></div>
            <button class="kawa-btn kawa-close-btn">\${SVG_ICONS.close} <span>Close</span></button>
          </div>
          <div class="kawa-modal-body"><div class="kawa-slots-grid"></div></div>\`;
        card.querySelector('.kawa-close-btn').addEventListener('click', () => ov.remove());
        const grid = card.querySelector('.kawa-slots-grid');
        const slots = await this.vm.saveManager.listSlots(6);
        slots.forEach((s, i) => {
          const num = String(i + 1);
          const c = document.createElement('div');
          c.className = 'kawa-slot-card';
          c.innerHTML = \`
            <div class="kawa-slot-header">
              <span class="kawa-slot-badge">Slot \${num}</span>
              <span class="kawa-slot-time">\${s ? new Date(s.timestamp).toLocaleTimeString() : 'Empty'}</span>
            </div>
            <div class="kawa-slot-preview">\${s ? (s.previewText || 'Game in progress') : '<span class="kawa-slot-empty-text">No save data</span>'}</div>
            <div class="kawa-slot-actions"></div>\`;
          const act = c.querySelector('.kawa-slot-actions');
          if (mode === 'save') {
            const b = document.createElement('button');
            b.className = 'kawa-slot-btn kawa-slot-btn-save';
            b.innerHTML = SVG_ICONS.save + ' Save Here';
            b.addEventListener('click', async () => {
              await this.vm.save(num);
              ov.remove();
              this.showSaveLoad('save');
            });
            act.appendChild(b);
          } else if (s) {
            const b = document.createElement('button');
            b.className = 'kawa-slot-btn kawa-slot-btn-load';
            b.innerHTML = SVG_ICONS.load + ' Load';
            b.addEventListener('click', async () => {
              if (await this.vm.load(num)) ov.remove();
            });
            act.appendChild(b);
          }
          if (s) {
            const d = document.createElement('button');
            d.className = 'kawa-slot-btn kawa-slot-btn-del';
            d.innerHTML = SVG_ICONS.trash;
            d.addEventListener('click', async () => {
              await this.vm.saveManager.deleteSlot(num);
              ov.remove();
              this.showSaveLoad(mode);
            });
            act.appendChild(d);
          }
          grid.appendChild(c);
        });
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }

      showHistory() {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title">\${SVG_ICONS.history} <span>Dialogue History</span></div>
            <button class="kawa-btn kawa-close-btn">\${SVG_ICONS.close} <span>Close</span></button>
          </div>
          <div class="kawa-modal-body"></div>\`;
        card.querySelector('.kawa-close-btn').addEventListener('click', () => ov.remove());
        const body = card.querySelector('.kawa-modal-body');
        if (this.vm.history.length === 0) {
          body.innerHTML = '<div style="opacity:0.6">No dialogue history yet.</div>';
        } else {
          this.vm.history.forEach(h => {
            const item = document.createElement('div');
            item.className = 'kawa-history-item';
            if (h.speakerDisplayName) {
              item.innerHTML = '<div class="kawa-history-speaker">' + h.speakerDisplayName + '</div>';
            }
            const txt = document.createElement('div');
            txt.innerHTML = formatRichText(h.text);
            item.appendChild(txt);
            body.appendChild(item);
          });
        }
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }
    }

    function preloadAssets(story) {
      if (typeof window === 'undefined') return;
      for (const list of Object.values(story.labels || {})) {
        for (const inst of list) {
          if (inst.type === 'scene' && inst.background) {
            const clean = inst.background.replace(/^bg[\s_]+/i, '').trim();
            const img = new Image();
            img.src = '/assets/backgrounds/' + (clean.includes('.') ? clean : clean + '.svg');
          } else if (inst.type === 'show') {
            const expr = inst.expression ? '/' + inst.expression : '';
            const img = new Image();
            img.src = '/assets/characters/' + inst.character + expr + '.svg';
          }
        }
      }
    }

    function mountKawaApp(story, container) {
      preloadAssets(story);
      const vm = new StoryVM(story);
      const audio = new AudioManager();
      const audioResolver = (track, channel) => {
        return track.includes('.') ? '/assets/audio/' + track : '/assets/audio/' + track + '.mp3';
      };
      audio.attachToVM(vm, audioResolver);
      const renderer = new DOMRenderer(vm, container, audio);
      vm.start();
      return { vm, renderer, audio };
    }
  `;
}
