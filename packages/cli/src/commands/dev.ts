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

        // Auto-resume state on dev live reload
        const DEV_SESSION_KEY = 'kawaijs_dev_state';
        const savedDevState = sessionStorage.getItem(DEV_SESSION_KEY);
        if (savedDevState) {
          try {
            const parsed = JSON.parse(savedDevState);
            if (parsed && parsed.currentLabel && story.labels[parsed.currentLabel]) {
              app.vm.state = parsed;
              app.vm.snapshotStack = [parsed];
              app.vm.notify();
            }
          } catch {}
        }

        app.vm.onStateChange((state) => {
          if (!state.isFinished) {
            sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(state));
          } else {
            sessionStorage.removeItem(DEV_SESSION_KEY);
          }
        });
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
            } else if (inst.type === 'play_audio') {
              for (const cb of this.audioListeners) {
                cb({
                  action: 'play',
                  channel: inst.channel,
                  track: inst.track,
                  fade: inst.fade,
                  loop: inst.loop
                });
              }
              if (inst.channel === 'music') {
                this.state.audio.music = inst.track;
              } else if (inst.channel === 'voice') {
                this.state.audio.voice = inst.track;
              }
            } else if (inst.type === 'stop_audio') {
              for (const cb of this.audioListeners) {
                cb({
                  action: 'stop',
                  channel: inst.channel,
                  fade: inst.fade
                });
              }
              if (inst.channel === 'music') {
                this.state.audio.music = null;
              } else if (inst.channel === 'voice') {
                this.state.audio.voice = null;
              }
            } else if (inst.type === 'return') {
              this.state.isFinished = true;
            }
          }
          if (this.state.isWaitingForInput) {
            this.snapshotStack.push(JSON.parse(JSON.stringify(this.state)));
          }
        } finally {
          this.isExecuting = false;
        }
        this.notify();
      }
      notify() { for (const l of this.listeners) l(this.state); }
    }
    class AudioManager {
      constructor() {
        this.masterVolume = 1.0;
        this.musicVolume = 0.8;
        this.soundVolume = 1.0;
        this.voiceVolume = 1.0;
        this.isMuted = false;
        this.currentMusicAudio = null;
        this.currentMusicTrack = null;
        this.currentVoiceAudio = null;
        this.soundPool = [];
        this.isUnlocked = false;
        this.pendingMusic = null;

        // Auto-unlock audio context on first user interaction
        const unlock = () => {
          this.isUnlocked = true;
          if (this.pendingMusic) {
            const { src, options } = this.pendingMusic;
            this.pendingMusic = null;
            this.playMusic(src, options);
          }
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
          window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { passive: true });
        window.addEventListener('keydown', unlock, { passive: true });
        window.addEventListener('touchstart', unlock, { passive: true });
      }
      toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.currentMusicAudio) {
          this.currentMusicAudio.volume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
        }
        return this.isMuted;
      }
      playMusic(src, options = {}) {
        if (this.currentMusicTrack === src && this.currentMusicAudio && !this.currentMusicAudio.paused) {
          return;
        }
        if (!this.isUnlocked) {
          this.pendingMusic = { src, options };
        }
        const fadein = options.fadein ?? 0;
        const loop = options.loop ?? true;
        const targetVolume = this.isMuted ? 0 : (options.volume ?? 1) * this.masterVolume * this.musicVolume;

        if (this.currentMusicAudio) {
          this.stopMusic({ fadeout: fadein > 0 ? fadein : 0.3 });
        }

        const audio = new Audio(src);
        audio.loop = loop;
        this.currentMusicAudio = audio;
        this.currentMusicTrack = src;

        if (fadein > 0) {
          audio.volume = 0;
          audio.play().catch(() => {});
          this.fadeVolume(audio, 0, targetVolume, fadein * 1000);
        } else {
          audio.volume = targetVolume;
          audio.play().catch(() => {});
        }
      }
      stopMusic(options = {}) {
        const fadeout = options.fadeout ?? 0;
        const audio = this.currentMusicAudio;
        if (!audio) return;
        this.currentMusicAudio = null;
        this.currentMusicTrack = null;
        this.pendingMusic = null;

        if (fadeout > 0) {
          this.fadeVolume(audio, audio.volume, 0, fadeout * 1000, () => {
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
                  <button class="kawa-btn kawa-hist">History</button>
                  <button class="kawa-btn kawa-save">Save</button>
                  <button class="kawa-btn kawa-load">Load</button>
                  <button class="kawa-btn kawa-mute" title="Toggle Mute">🔊</button>
                </nav>
              </div>
            </div>
          </div>\`;
        this.rootEl = this.container.querySelector('.kawa-root');
        this.bgEl = this.container.querySelector('.kawa-background');
        this.charsEl = this.container.querySelector('.kawa-characters');
        this.boxEl = this.container.querySelector('.kawa-dialogue-box');
        this.spkEl = this.container.querySelector('.kawa-speaker-tag');
        this.txtEl = this.container.querySelector('.kawa-dialogue-text');
        this.choiceEl = this.container.querySelector('.kawa-choice-container');
        this.backBtn = this.container.querySelector('.kawa-back');
        this.histBtn = this.container.querySelector('.kawa-hist');
        this.saveBtn = this.container.querySelector('.kawa-save');
        this.loadBtn = this.container.querySelector('.kawa-load');
        this.muteBtn = this.container.querySelector('.kawa-mute');

        this.boxEl.addEventListener('click', () => this.vm.next());
        this.backBtn.addEventListener('click', (e) => { e.stopPropagation(); this.vm.rollback(); });
        this.histBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showHistory(); });
        this.saveBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('save'); });
        this.loadBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('load'); });
        if (this.muteBtn && this.audioManager) {
          this.muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMuted = this.audioManager.toggleMute();
            this.muteBtn.textContent = isMuted ? '🔇' : '🔊';
          });
        }
        window.addEventListener('keydown', (e) => {
          const modal = this.rootEl.querySelector('.kawa-modal-overlay');
          if (modal) {
            if (e.key === 'Escape') modal.remove();
            return;
          }
          if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this.vm.next(); }
          if (e.code === 'Backspace') { e.preventDefault(); this.vm.rollback(); }
          if (e.key === 's' || e.key === 'S') this.showSaveLoad('save');
          if (e.key === 'l' || e.key === 'L') this.showSaveLoad('load');
          if (e.key === 'h' || e.key === 'H') this.showHistory();
          if (e.key === 'm' || e.key === 'M') {
            if (this.audioManager && this.muteBtn) {
              const isMuted = this.audioManager.toggleMute();
              this.muteBtn.textContent = isMuted ? '🔇' : '🔊';
            }
          }
        });
      }
      render(state) {
        this.isChoicePending = false;
        this.backBtn.disabled = !this.vm.canRollback();
        if (state.visual.background) {
          const rawBg = state.visual.background;
          const bg = rawBg.replace(/^bg[\s_]+/i, '').trim();
          const baseName = bg.replace(/\.(svg|png|jpg|jpeg|webp)$/i, '');
          const svgUrl = '/assets/backgrounds/' + (bg.includes('.') ? bg : bg + '.svg');
          const pngUrl = '/assets/backgrounds/' + baseName + '.png';

          const img = new Image();
          img.onload = () => {
            this.bgEl.style.backgroundImage = 'url("' + svgUrl + '")';
            this.bgEl.style.opacity = '1';
          };
          img.onerror = () => {
            const img2 = new Image();
            img2.onload = () => {
              this.bgEl.style.backgroundImage = 'url("' + pngUrl + '")';
              this.bgEl.style.opacity = '1';
            };
            img2.onerror = () => {
              this.bgEl.style.backgroundImage = 'radial-gradient(ellipse at center, #334155 0%, #0f172a 100%)';
              this.bgEl.style.opacity = '1';
            };
            img2.src = pngUrl;
          };
          img.src = svgUrl;
        } else {
          this.bgEl.style.opacity = '0';
        }

        this.charsEl.innerHTML = '';
        for (const [id, char] of Object.entries(state.visual.characters)) {
          const div = document.createElement('div');
          div.className = 'kawa-sprite kawa-pos-' + (char.position || 'center');
          const img = document.createElement('img');
          const expr = char.expression ? '/' + char.expression : '';
          img.src = '/assets/characters/' + id + expr + '.svg';
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
          this.choiceEl.style.display = 'none';
          const exEnd = this.rootEl.querySelector('.kawa-ending-card');
          if (!exEnd) {
            const endCard = document.createElement('div');
            endCard.className = 'kawa-ending-card';
            endCard.innerHTML = \`
              <div class="kawa-ending-title">🌸 The End</div>
              <div class="kawa-ending-subtitle">Story complete! Thank you for playing.</div>
              <div style="display:flex;gap:12px;margin-top:16px;">
                <button class="kawa-btn kawa-btn-replay">🔄 Play Again</button>
                <button class="kawa-btn kawa-btn-load-end">📂 Load Slot</button>
              </div>\`;
            endCard.querySelector('.kawa-btn-replay').addEventListener('click', () => {
              sessionStorage.removeItem('kawaijs_dev_state');
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
      async showSaveLoad(mode) {
        const ex = this.rootEl.querySelector('.kawa-modal-overlay');
        if (ex) ex.remove();
        const ov = document.createElement('div');
        ov.className = 'kawa-modal-overlay';
        const card = document.createElement('div');
        card.className = 'kawa-modal-card';
        card.innerHTML = \`
          <div class="kawa-modal-header">
            <div class="kawa-modal-title">\${mode === 'save' ? '💾 Save Game' : '📂 Load Game'}</div>
            <button class="kawa-btn kawa-close-btn">✕ Close</button>
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
            b.textContent = 'Save Here';
            b.addEventListener('click', async () => {
              await this.vm.save(num);
              ov.remove();
              this.showSaveLoad('save');
            });
            act.appendChild(b);
          } else if (s) {
            const b = document.createElement('button');
            b.className = 'kawa-slot-btn kawa-slot-btn-load';
            b.textContent = 'Load';
            b.addEventListener('click', async () => {
              if (await this.vm.load(num)) ov.remove();
            });
            act.appendChild(b);
          }
          if (s) {
            const d = document.createElement('button');
            d.className = 'kawa-slot-btn kawa-slot-btn-del';
            d.textContent = '🗑';
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
            <div class="kawa-modal-title">📜 Dialogue History</div>
            <button class="kawa-btn kawa-close-btn">✕ Close</button>
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
            txt.textContent = h.text;
            item.appendChild(txt);
            body.appendChild(item);
          });
        }
        ov.appendChild(card);
        this.rootEl.appendChild(ov);
      }
    }
    function mountKawaApp(story, container) {
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
