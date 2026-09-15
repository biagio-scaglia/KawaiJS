import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';
import { mountKawaApp, defaultAssetResolver } from '@kawaijs/renderer-dom';
import type { AssetType } from '@kawaijs/renderer-dom';
import { zipSync, strToU8 } from 'fflate';

const STARTER = `character yumia "Yumia" #f43f5e

define bg classroom = "classroom.svg"

label start:
    scene bg classroom with fade
    show yumia happy at center

    yumia "Hello from the Kawaijs playground!"
    yumia "Edit the script on the left — the preview updates live."

    menu:
        "Say hi back":
            jump hello
        "Ask about the engine":
            jump about

label hello:
    yumia "Nice to meet you. Download the project when you're ready."
    return

label about:
    yumia "Write .kawa, ship a static site. Ren'Py for the Web."
    return
`;

const editorHost = document.getElementById('editor')!;
const previewHost = document.getElementById('preview')!;
const diagnosticsEl = document.getElementById('diagnostics')!;
const btnRun = document.getElementById('btn-run')!;
const btnDownload = document.getElementById('btn-download')!;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let mounted: { vm: { destroy?: () => void }; renderer: { destroy?: () => void } } | null = null;

function assetResolver(path: string, type: AssetType): string {
  const resolved = defaultAssetResolver(path, type);
  if (resolved.startsWith('assets/')) return `./${resolved}`;
  return resolved;
}

function clearPreview(): void {
  if (mounted?.renderer?.destroy) {
    try {
      mounted.renderer.destroy();
    } catch {
      /* ignore */
    }
  }
  if (mounted?.vm?.destroy) {
    try {
      mounted.vm.destroy();
    } catch {
      /* ignore */
    }
  }
  mounted = null;
  previewHost.replaceChildren();
}

function showDiagnostics(text: string, ok: boolean): void {
  diagnosticsEl.hidden = false;
  diagnosticsEl.textContent = text;
  diagnosticsEl.dataset.ok = ok ? 'true' : 'false';
}

function runPreview(source: string): void {
  try {
    const story = compileScript(source, 'game.kawa', { validateLabels: true });
    clearPreview();
    const root = document.createElement('div');
    root.style.width = '100%';
    root.style.height = '100%';
    previewHost.appendChild(root);

    mounted = mountKawaApp(story, root, {
      embed: true,
      assetResolver,
      typewriterSpeed: 18,
      mainMenu: { enabled: false },
      syncUrlLabel: false,
      virtualCanvas: { width: 1280, height: 720 }
    }) as typeof mounted;

    showDiagnostics('Compiled successfully.', true);
  } catch (err) {
    const message =
      err instanceof KawaError
        ? formatDiagnostic(err.diagnostic, source)
        : err instanceof Error
          ? err.message
          : String(err);
    showDiagnostics(message, false);
  }
}

function scheduleRun(source: string): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runPreview(source), 300);
}

const state = EditorState.create({
  doc: STARTER,
  extensions: [
    basicSetup,
    oneDark,
    EditorView.lineWrapping,
    keymap.of([...defaultKeymap, indentWithTab]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        scheduleRun(update.state.doc.toString());
      }
    })
  ]
});

const view = new EditorView({
  state,
  parent: editorHost
});

btnRun.addEventListener('click', () => {
  runPreview(view.state.doc.toString());
});

btnDownload.addEventListener('click', () => {
  const source = view.state.doc.toString();
  const files: Record<string, Uint8Array> = {
    'my-kawa-playground/package.json': strToU8(
      JSON.stringify(
        {
          name: 'my-kawa-playground',
          private: true,
          type: 'module',
          scripts: {
            dev: 'kawa dev',
            build: 'kawa build',
            validate: 'kawa validate'
          },
          dependencies: {
            kawaijs: '^0.1.11'
          }
        },
        null,
        2
      )
    ),
    'my-kawa-playground/README.md': strToU8(
      `# My Kawaijs project\n\nCreated from the [Kawaijs Playground](https://biagio-scaglia.github.io/KawaiJS/playground/).\n\n\`\`\`bash\nnpm install\nnpx kawa dev\n\`\`\`\n`
    ),
    'my-kawa-playground/game/script.kawa': strToU8(source),
    'my-kawa-playground/game/kawa.config.json': strToU8(
      JSON.stringify(
        {
          title: 'My Kawaijs Novel',
          author: 'Author',
          version: '0.1.0'
        },
        null,
        2
      )
    )
  };

  const assetPaths = [
    ['my-kawa-playground/game/assets/backgrounds/classroom.svg', './assets/backgrounds/classroom.svg'],
    ['my-kawa-playground/game/assets/characters/yumia/happy.svg', './assets/characters/yumia/happy.svg']
  ] as const;

  void Promise.all(
    assetPaths.map(async ([zipPath, url]) => {
      const res = await fetch(url);
      const buf = new Uint8Array(await res.arrayBuffer());
      files[zipPath] = buf;
    })
  ).then(() => {
    const zipped = zipSync(files);
    const blob = new Blob([zipped], { type: 'application/zip' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kawaijs-playground-project.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  });
});

runPreview(STARTER);
