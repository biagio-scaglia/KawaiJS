import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const require = createRequire(import.meta.url);

export function getBaseThemeCss(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(dirname, '..', '..', 'renderer-dom', 'src', 'theme.css'),
    path.resolve(dirname, '..', '..', 'renderer-dom', 'dist', 'theme.css'),
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

  try {
    const pkgPath = require.resolve('@kawaijs/renderer-dom/package.json');
    const cssCandidate = path.join(path.dirname(pkgPath), 'src', 'theme.css');
    if (fs.existsSync(cssCandidate)) {
      return fs.readFileSync(cssCandidate, 'utf-8');
    }
  } catch {}

  return '';
}

function resolveRendererDomEntry(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(dirname, '..', '..', 'renderer-dom', 'src', 'index.ts'),
    path.resolve(dirname, '..', '..', 'renderer-dom', 'dist', 'index.js'),
    path.resolve(dirname, '..', '..', '..', 'renderer-dom', 'src', 'index.ts'),
    path.resolve(dirname, '..', '..', '..', 'renderer-dom', 'dist', 'index.js'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  try {
    return require.resolve('@kawaijs/renderer-dom');
  } catch {
    throw new Error('Could not resolve @kawaijs/renderer-dom package entry point.');
  }
}

export function getInlineRuntimeScript(assetPrefix = '/'): string {
  // Always rebuild so CLI picks up renderer-dom source edits without a process restart.
  // Page loads are infrequent enough that sync esbuild cost is acceptable in dev/build.
  const entry = resolveRendererDomEntry();
  const result = esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    globalName: 'KawaiJS',
    write: false,
    minify: false,
    target: 'es2022'
  });

  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error('Failed to bundle @kawaijs/renderer-dom with esbuild.');
  }

  const bundle = result.outputFiles[0]!.text;
  const prefix = assetPrefix.endsWith('/') ? assetPrefix : assetPrefix + '/';
  return `
    const ASSET_PREFIX = '${prefix}';
    ${bundle}
    const { mountKawaApp, DOMRenderer, StoryVM } = KawaiJS;
  `;
}
