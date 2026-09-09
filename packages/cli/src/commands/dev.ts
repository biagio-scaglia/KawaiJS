import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';

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

  // File watcher for auto-reload
  const gameDir = path.join(rootDir, 'game');
  if (fs.existsSync(gameDir)) {
    fs.watch(gameDir, { recursive: true }, (_eventType, filename) => {
      if (filename && (filename.endsWith('.kawa') || filename.endsWith('.css') || filename.startsWith('assets'))) {
        console.log(`🔄 [Kawa Dev] File changed: ${filename}. Reloading...`);
        for (const client of clients) {
          client.write(`data: reload\n\n`);
        }
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
      let combinedCss = `/* Kawaijs Base Theme */\n`;
      
      // Load default renderer theme CSS
      const themeCssPath = path.resolve(path.dirname(import.meta.url.replace('file:///', '')), '..', '..', '..', 'renderer-dom', 'src', 'theme.css');
      if (fs.existsSync(themeCssPath)) {
        combinedCss += fs.readFileSync(themeCssPath, 'utf-8') + '\n';
      }

      if (fs.existsSync(stylePath)) {
        combinedCss += `/* User Custom Styles */\n` + fs.readFileSync(stylePath, 'utf-8');
      }
      res.end(combinedCss);
      return;
    }

    // 4. Game Assets (/assets/*)
    if (url.startsWith('/assets/')) {
      const relPath = decodeURIComponent(url.replace('/assets/', ''));
      let filePath = path.join(assetsDir, relPath);

      if (!fs.existsSync(filePath)) {
        // Try fallback extensions (.svg, .png, .webp, .jpg, .jpeg, .mp3, .ogg)
        const parsed = path.parse(filePath);
        for (const ext of ['.svg', '.png', '.webp', '.jpg', '.jpeg', '.mp3', '.ogg']) {
          const candidate = path.join(parsed.dir, parsed.name + ext);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            filePath = candidate;
            break;
          }
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

        window.__kawa_app = mountKawaApp(story, document.getElementById('app'));
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
    }
    function evaluateCondition(cond, vars) {
      const t = (cond || '').trim();
      if (!t || t === 'true') return true;
      if (t === 'false') return false;
      const ops = ['>=', '<=', '!=', '==', '>', '<'];
      for (const op of ops) {
        const idx = t.indexOf(op);
        if (idx !== -1) {
          const l = resolveVal(t.slice(0, idx), vars);
          const r = resolveVal(t.slice(idx + op.length), vars);
          if (op === '>=') return Number(l) >= Number(r);
          if (op === '<=') return Number(l) <= Number(r);
          if (op === '>') return Number(l) > Number(r);
          if (op === '<') return Number(l) < Number(r);
          if (op === '==') return l == r;
          if (op === '!=') return l != r;
        }
      }
      if (t.startsWith('!')) return !Boolean(vars[t.slice(1).trim()]);
      return Boolean(vars[t]);
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
        this.history = [];
        this.saveManager = new SaveManager();
      }
      getState() { return this.state; }
      onStateChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
      start() { this.execute(); }
      next() {
        if (this.state.isFinished || (this.state.choices && this.state.choices.length > 0)) return;
        this.state.isWaitingForInput = false;
        this.execute();
      }
      choose(idx) {
        if (!this.state.choices || !this.state.choices[idx]) return;
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
        await this.saveManager.saveSlot(slot, this.state, this.state.dialogue ? this.state.dialogue.text : '');
      }
      async load(slot) {
        const data = await this.saveManager.loadSlot(slot);
        if (data && data.snapshot) {
          this.state = JSON.parse(JSON.stringify(data.snapshot));
          this.snapshotStack = [this.state];
          this.notify();
          return true;
        }
        return false;
      }
      execute() {
        while (!this.state.isWaitingForInput && !this.state.isFinished) {
          const list = this.story.labels[this.state.currentLabel];
          if (!list || this.state.instructionPointer >= list.length) {
            if (this.state.callStack.length > 0) {
              const frame = this.state.callStack.pop();
              this.state.currentLabel = frame.returnLabel;
              this.state.instructionPointer = frame.returnPointer;
              continue;
            }
            this.state.isFinished = true;
            break;
          }
          const inst = list[this.state.instructionPointer++];
          if (inst.type === 'scene') {
            this.state.visual.background = inst.background;
            this.state.visual.characters = {};
          } else if (inst.type === 'show') {
            this.state.visual.characters[inst.character] = {
              expression: inst.expression,
              position: inst.position || 'center'
            };
          } else if (inst.type === 'hide') {
            delete this.state.visual.characters[inst.character];
          } else if (inst.type === 'dialogue') {
            const charDef = inst.speaker ? this.story.characters[inst.speaker] : null;
            this.state.dialogue = {
              speaker: inst.speaker,
              speakerDisplayName: charDef ? charDef.name : inst.speaker,
              speakerColor: charDef ? charDef.color : null,
              text: inst.text
            };
            this.state.isWaitingForInput = true;
            this.history.push(this.state.dialogue);
          } else if (inst.type === 'choice') {
            this.state.choices = inst.choices;
            this.state.isWaitingForInput = true;
          } else if (inst.type === 'jump') {
            this.state.currentLabel = inst.targetLabel;
            this.state.instructionPointer = 0;
          } else if (inst.type === 'set') {
            const curr = this.state.variables[inst.variable];
            this.state.variables[inst.variable] = applySetOp(curr, inst.operator, inst.value, this.state.variables);
          } else if (inst.type === 'branch') {
            const ok = evaluateCondition(inst.condition, this.state.variables);
            this.state.currentLabel = ok ? inst.thenLabel : (inst.elseLabel || inst.thenLabel);
            this.state.instructionPointer = 0;
          } else if (inst.type === 'return') {
            this.state.isFinished = true;
          }
        }
        if (this.state.isWaitingForInput) {
          this.snapshotStack.push(JSON.parse(JSON.stringify(this.state)));
        }
        this.notify();
      }
      notify() { for (const l of this.listeners) l(this.state); }
    }
    class DOMRenderer {
      constructor(vm, container) {
        this.vm = vm;
        this.container = container;
        this.build();
        vm.onStateChange(s => this.render(s));
        this.render(vm.getState());
      }
      build() {
        this.container.innerHTML = \`
          <div class="kawa-root">
            <div class="kawa-stage">
              <div class="kawa-background"></div>
              <div class="kawa-characters kawa-sprites"></div>
              <div class="kawa-ui-layer">
                <div class="kawa-choice-container kawa-choices" style="display:none"></div>
                <div class="kawa-dialogue-box kawa-dialogue">
                  <div class="kawa-speaker-tag kawa-speaker" style="display:none"></div>
                  <div class="kawa-dialogue-text kawa-text"></div>
                  <div class="kawa-continue-indicator">&#9660;</div>
                </div>
                <nav class="kawa-quick-menu">
                  <button class="kawa-btn kawa-back">Back</button>
                  <button class="kawa-btn kawa-save">Save</button>
                  <button class="kawa-btn kawa-load">Load</button>
                </nav>
              </div>
            </div>
          </div>\`;
        this.bgEl = this.container.querySelector('.kawa-background');
        this.charsEl = this.container.querySelector('.kawa-characters');
        this.boxEl = this.container.querySelector('.kawa-dialogue-box');
        this.spkEl = this.container.querySelector('.kawa-speaker-tag');
        this.txtEl = this.container.querySelector('.kawa-dialogue-text');
        this.choiceEl = this.container.querySelector('.kawa-choice-container');
        this.backBtn = this.container.querySelector('.kawa-back');
        this.saveBtn = this.container.querySelector('.kawa-save');
        this.loadBtn = this.container.querySelector('.kawa-load');

        this.boxEl.addEventListener('click', () => this.vm.next());
        this.backBtn.addEventListener('click', (e) => { e.stopPropagation(); this.vm.rollback(); });
        this.saveBtn.addEventListener('click', async (e) => { e.stopPropagation(); await this.vm.save('1'); alert('Saved to Slot 1'); });
        this.loadBtn.addEventListener('click', async (e) => { e.stopPropagation(); if (await this.vm.load('1')) alert('Loaded Slot 1'); });
        window.addEventListener('keydown', (e) => {
          if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this.vm.next(); }
          if (e.code === 'Backspace') { e.preventDefault(); this.vm.rollback(); }
        });
      }
      render(state) {
        this.backBtn.disabled = !this.vm.canRollback();
        if (state.visual.background) {
          const bg = state.visual.background.replace(/^bg\\s+/, '');
          this.bgEl.style.backgroundImage = 'url("/assets/backgrounds/' + bg + (bg.includes('.') ? '' : '.png') + '")';
          this.bgEl.style.opacity = '1';
        } else {
          this.bgEl.style.opacity = '0';
        }

        this.charsEl.innerHTML = '';
        for (const [id, char] of Object.entries(state.visual.characters)) {
          const div = document.createElement('div');
          div.className = 'kawa-sprite kawa-pos-' + (char.position || 'center');
          const img = document.createElement('img');
          const expr = char.expression ? '/' + char.expression : '';
          img.src = '/assets/characters/' + id + expr + '.png';
          img.alt = id;
          img.onerror = () => {
            img.style.display = 'none';
            div.style.width = '200px'; div.style.height = '400px';
            div.style.background = 'rgba(244,63,94,0.3)'; div.style.border = '2px dashed #f43f5e';
            div.style.borderRadius = '16px'; div.style.display = 'flex'; div.style.alignItems = 'center';
            div.style.justifyContent = 'center'; div.style.color = '#fff';
            div.textContent = id + (char.expression ? ' (' + char.expression + ')' : '');
          };
          div.appendChild(img);
          this.charsEl.appendChild(div);
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
          this.txtEl.textContent = state.dialogue.text;
        } else {
          this.boxEl.style.display = 'none';
        }

        if (state.choices && state.choices.length > 0) {
          this.choiceEl.innerHTML = '';
          this.choiceEl.style.display = 'flex';
          state.choices.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.className = 'kawa-choice-btn kawa-choice';
            btn.textContent = c.text;
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.vm.choose(idx); });
            this.choiceEl.appendChild(btn);
          });
        } else {
          this.choiceEl.style.display = 'none';
        }
      }
    }
    function mountKawaApp(story, container) {
      const vm = new StoryVM(story);
      const renderer = new DOMRenderer(vm, container);
      vm.start();
      return { vm, renderer };
    }
  `;
}
