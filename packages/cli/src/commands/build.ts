import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';

export interface BuildOptions {
  outDir?: string;
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
  let combinedCss = `/* Kawaijs Bundled Stylesheet */\n`;
  const themeCssPath = path.resolve(path.dirname(import.meta.url.replace('file:///', '')), '..', '..', '..', 'renderer-dom', 'src', 'theme.css');
  if (fs.existsSync(themeCssPath)) {
    combinedCss += fs.readFileSync(themeCssPath, 'utf-8') + '\n\n';
  }
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
    class DOMRenderer {
      constructor(vm, container) {
        this.vm = vm;
        this.container = container;
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

        this.boxEl.addEventListener('click', () => this.vm.next());
        this.backBtn.addEventListener('click', (e) => { e.stopPropagation(); this.vm.rollback(); });
        this.histBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showHistory(); });
        this.saveBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('save'); });
        this.loadBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showSaveLoad('load'); });
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
        });
      }
      render(state) {
        this.isChoicePending = false;
        this.backBtn.disabled = !this.vm.canRollback();
        if (state.visual.background) {
          const bg = state.visual.background.replace(/^bg\\s+/, '');
          this.bgEl.style.backgroundImage = 'url("./assets/backgrounds/' + bg + (bg.includes('.') ? '' : '.svg') + '"), url("./assets/backgrounds/' + bg + '.png")';
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
          img.src = './assets/characters/' + id + expr + '.svg';
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

    const vm = new StoryVM(story);
    new DOMRenderer(vm, document.getElementById('app'));
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
