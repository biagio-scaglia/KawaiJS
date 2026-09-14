import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadProjectConfig } from '../config.js';
import { escapeHtmlAttr } from '../parse-args.js';

export interface EmbedCommandArgs {
  readonly projectDir: string;
  readonly width?: number;
  readonly height?: number;
  readonly startLabel?: string;
  readonly src?: string;
}

/**
 * Parse `kawa embed [path] [--width N] [--height N] [--at label] [--src url]`.
 */
export function parseEmbedCommandArgs(args: string[]): EmbedCommandArgs {
  let projectDir = '.';
  let width: number | undefined;
  let height: number | undefined;
  let startLabel: string | undefined;
  let src: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const token = args[i];
    if (!token) continue;
    if (token.startsWith('--width=')) {
      const n = Number(token.slice(8));
      if (Number.isFinite(n) && n > 0) width = n;
      continue;
    }
    if (token === '--width') {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n > 0) width = n;
      continue;
    }
    if (token.startsWith('--height=')) {
      const n = Number(token.slice(9));
      if (Number.isFinite(n) && n > 0) height = n;
      continue;
    }
    if (token === '--height') {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n > 0) height = n;
      continue;
    }
    if (token.startsWith('--at=')) {
      startLabel = token.slice(5).trim() || undefined;
      continue;
    }
    if (token === '--at') {
      startLabel = args[++i]?.trim() || undefined;
      continue;
    }
    if (token.startsWith('--src=')) {
      src = token.slice(6).trim() || undefined;
      continue;
    }
    if (token === '--src') {
      src = args[++i]?.trim() || undefined;
      continue;
    }
    if (token.startsWith('-')) continue;
    projectDir = token;
  }

  return { projectDir, width, height, startLabel, src };
}

export function buildEmbedSnippet(
  projectDir = '.',
  options: {
    width?: number;
    height?: number;
    startLabel?: string;
    src?: string;
  } = {}
): string {
  const config = loadProjectConfig(projectDir);
  const width = options.width ?? config.window?.width ?? 1280;
  const height = options.height ?? config.window?.height ?? 720;
  const title = escapeHtmlAttr(config.title || 'Kawaijs Visual Novel');

  const params = new URLSearchParams();
  params.set('embed', '1');
  if (options.startLabel) params.set('at', options.startLabel);

  let src = options.src?.trim() || './index.html';
  // If src already has query, merge carefully
  try {
    const u = new URL(src, 'https://kawa.local/');
    u.searchParams.set('embed', '1');
    if (options.startLabel) u.searchParams.set('at', options.startLabel);
    src =
      options.src && /^https?:\/\//i.test(options.src)
        ? u.toString()
        : `${u.pathname.replace(/^\//, './')}${u.search}`;
  } catch {
    const join = src.includes('?') ? '&' : '?';
    src = `${src}${join}${params.toString()}`;
  }

  const safeSrc = escapeHtmlAttr(src);
  return `<!-- Kawaijs embed kit -->
<div style="position:relative;width:100%;max-width:${width}px;aspect-ratio:${width}/${height};margin:0 auto;">
  <iframe
    title="${title}"
    src="${safeSrc}"
    allow="autoplay; fullscreen"
    loading="lazy"
    style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;overflow:hidden;background:#000;"
  ></iframe>
</div>
`;
}

export function writeEmbedSnippet(
  projectDir = '.',
  options: {
    width?: number;
    height?: number;
    startLabel?: string;
    src?: string;
    outFile?: string;
  } = {}
): string {
  const snippet = buildEmbedSnippet(projectDir, options);
  if (options.outFile) {
    const out = path.resolve(process.cwd(), options.outFile);
    fs.writeFileSync(out, snippet, 'utf-8');
  }
  return snippet;
}
