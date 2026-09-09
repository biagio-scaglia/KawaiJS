import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';

export interface BuildOptions {
  outDir?: string;
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
.kawa-btn { background: var(--kawa-menu-btn-bg); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 4px 12px; font-size: 0.85rem; font-weight: 500; cursor: pointer; }
.kawa-btn:hover { background: var(--kawa-menu-btn-hover-bg); color: #ffffff; }
.kawa-modal-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
.kawa-modal-card { background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; width: 90%; max-width: 750px; max-height: 85%; display: flex; flex-direction: column; padding: 24px 28px; }
.kawa-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; }
.kawa-modal-title { font-size: 1.35rem; font-weight: 700; color: #ffffff; }
.kawa-modal-body { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.kawa-slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.kawa-slot-card { background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 130px; }
.kawa-ending-card { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(16px); border: 1px solid rgba(244, 63, 94, 0.4); border-radius: 16px; padding: 32px 48px; display: flex; flex-direction: column; align-items: center; text-align: center; z-index: 50; }
.kawa-ending-title { font-size: 2rem; font-weight: 800; color: var(--kawa-primary-accent); margin-bottom: 8px; }
.kawa-ending-subtitle { font-size: 1.1rem; color: #cbd5e1; margin-bottom: 16px; }
`;
}

export function buildProject(projectDir = '.', options: BuildOptions = {}): boolean {
  const rootDir = path.resolve(process.cwd(), projectDir);
  const scriptPath = path.join(rootDir, 'game', 'script.kawa');
  const stylePath = path.join(rootDir, 'game', 'style.css');
  const assetsDir = path.join(rootDir, 'game', 'assets');
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
  let combinedCss = `/* Kawaijs Bundled Stylesheet */\n` + getBaseThemeCss() + '\n\n';

  if (fs.existsSync(stylePath)) {
    combinedCss += fs.readFileSync(stylePath, 'utf-8') + '\n';
  }
  fs.writeFileSync(path.join(outDir, 'style.css'), combinedCss, 'utf-8');
  console.log(`✅ Stylesheet bundled to dist/style.css`);

  // 5. Generate Standalone HTML Application
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storyPackage.meta.title ?? 'Kawaijs Visual Novel'}</title>
  <link rel="stylesheet" href="./style.css">
  <style>
    body { margin: 0; padding: 0; background: #000; overflow: hidden; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    const story = ${JSON.stringify(storyPackage, null, 2)};

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
    class DOMRenderer {
      constructor(vm, container, audioManager) {
        this.vm = vm;
        this.container = container;
        this.audioManager = audioManager;
        this.isChoicePending = false;
        this.activeBgLayer = 'A';
        this.currentBgUrl = '';
        this.activeChars = new Map();
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
        this.bgLayerA = this.container.querySelector('.kawa-bg-a');
        this.bgLayerB = this.container.querySelector('.kawa-bg-b');
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

        // 1. Dual Background Crossfade
        if (state.visual.background) {
          const rawBg = state.visual.background;
          const bg = rawBg.replace(/^bg[\s_]+/i, '').trim();
          const baseName = bg.replace(/\\.(svg|png|jpg|jpeg|webp)$/i, '');
          const svgUrl = './assets/backgrounds/' + (bg.includes('.') ? bg : bg + '.svg');
          const pngUrl = './assets/backgrounds/' + baseName + '.png';

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
          const primarySrc = './assets/characters/' + id + expr + '.svg';

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
              if (fallback === 1) img.src = './assets/characters/' + id + expr + '.png';
              else if (fallback === 2 && char.expression) img.src = './assets/characters/' + id + '_' + char.expression + '.svg';
              else if (fallback === 3 && char.expression) img.src = './assets/characters/' + id + '_' + char.expression + '.png';
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
      }
    }

    function preloadAssets(story) {
      if (typeof window === 'undefined') return;
      for (const list of Object.values(story.labels || {})) {
        for (const inst of list) {
          if (inst.type === 'scene' && inst.background) {
            const clean = inst.background.replace(/^bg[\s_]+/i, '').trim();
            const img = new Image();
            img.src = './assets/backgrounds/' + (clean.includes('.') ? clean : clean + '.svg');
          } else if (inst.type === 'show') {
            const expr = inst.expression ? '/' + inst.expression : '';
            const img = new Image();
            img.src = './assets/characters/' + inst.character + expr + '.svg';
          }
        }
      }
    }

    preloadAssets(story);
    const vm = new StoryVM(story);
    const audio = new AudioManager();
    const audioResolver = (track, channel) => {
      return track.includes('.') ? './assets/audio/' + track : './assets/audio/' + track + '.mp3';
    };
    audio.attachToVM(vm, audioResolver);
    new DOMRenderer(vm, document.getElementById('app'), audio);
    vm.start();
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
