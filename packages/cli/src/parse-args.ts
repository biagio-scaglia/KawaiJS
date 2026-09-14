export interface DevCommandArgs {
  readonly projectDir: string;
  readonly port?: number;
  readonly startLabel?: string;
}

/**
 * Parse `kawa dev [path] [--port N] [--at label]`.
 */
export function parseDevCommandArgs(args: string[]): DevCommandArgs {
  let projectDir = '.';
  let port: number | undefined;
  let startLabel: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const token = args[i];
    if (!token) continue;

    if (token.startsWith('--at=')) {
      startLabel = token.slice(5).trim() || undefined;
      continue;
    }
    if (token === '--at') {
      startLabel = args[++i]?.trim() || undefined;
      continue;
    }
    if (token.startsWith('--port=')) {
      const n = Number(token.slice(7));
      if (Number.isFinite(n) && n > 0) port = n;
      continue;
    }
    if (token === '--port') {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n > 0) port = n;
      continue;
    }
    if (token.startsWith('-')) {
      continue;
    }
    projectDir = token;
  }

  return { projectDir, port, startLabel };
}

export interface BuildCommandArgs {
  readonly projectDir: string;
  readonly startLabel?: string;
  readonly outDir?: string;
}

/**
 * Parse `kawa build [path] [--at label] [--out dir]`.
 */
export function parseBuildCommandArgs(args: string[]): BuildCommandArgs {
  let projectDir = '.';
  let startLabel: string | undefined;
  let outDir: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const token = args[i];
    if (!token) continue;

    if (token.startsWith('--at=')) {
      startLabel = token.slice(5).trim() || undefined;
      continue;
    }
    if (token === '--at') {
      startLabel = args[++i]?.trim() || undefined;
      continue;
    }
    if (token.startsWith('--out=')) {
      outDir = token.slice(6).trim() || undefined;
      continue;
    }
    if (token === '--out') {
      outDir = args[++i]?.trim() || undefined;
      continue;
    }
    if (token.startsWith('-')) {
      continue;
    }
    projectDir = token;
  }

  return { projectDir, startLabel, outDir };
}

export interface StaticMetaInput {
  readonly title: string;
  readonly description?: string;
  readonly image?: string;
  readonly siteName?: string;
  readonly url?: string;
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Static Open Graph / Twitter tags for dev/build HTML shells. */
export function renderStaticShareMetaTags(input: StaticMetaInput): string {
  const title = escapeHtmlAttr(input.title);
  const description = escapeHtmlAttr(input.description ?? input.title);
  const siteName = input.siteName ? escapeHtmlAttr(input.siteName) : title;
  const image = input.image ? escapeHtmlAttr(input.image) : '';
  const url = input.url ? escapeHtmlAttr(input.url) : '';

  const lines = [
    `<meta name="description" content="${description}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:site_name" content="${siteName}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`
  ];

  if (image) {
    lines.push(`<meta property="og:image" content="${image}">`);
    lines.push(`<meta name="twitter:image" content="${image}">`);
  }
  if (url) {
    lines.push(`<meta property="og:url" content="${url}">`);
  }

  return lines.map((l) => `  ${l}`).join('\n');
}
