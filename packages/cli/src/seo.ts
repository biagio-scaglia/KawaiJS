import * as fs from 'node:fs';
import * as path from 'node:path';
import type { KawaProjectConfig } from './config.js';
import { escapeHtmlAttr } from './parse-args.js';

export interface ResolvedIcon {
  /** Absolute path on disk (if a real file exists). */
  readonly absolutePath?: string;
  /** Public href used in HTML / manifest (e.g. `./favicon.svg`). */
  readonly href: string;
  /** MIME type for <link rel="icon">. */
  readonly mimeType: string;
  /** File basename written to dist (e.g. favicon.svg). */
  readonly outFileName: string;
  /** True when falling back to the generated PWA SVG. */
  readonly isGenerated: boolean;
}

const ICON_MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function mimeForExt(ext: string): string {
  return ICON_MIME[ext.toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Resolve a project-relative asset path against common locations.
 */
export function resolveProjectAssetPath(rootDir: string, relativePath: string): string | null {
  const clean = relativePath.replace(/^[./\\]+/, '').replace(/\\/g, '/');
  if (!clean || clean.includes('..')) return null;

  const candidates = [
    path.join(rootDir, clean),
    path.join(rootDir, 'game', clean),
    path.join(rootDir, 'game', 'assets', clean),
    path.join(rootDir, 'assets', clean)
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c;
    }
  }
  return null;
}

const AUTO_FAVICON_NAMES = [
  'favicon.svg',
  'favicon.png',
  'favicon.ico',
  'icon.svg',
  'icon.png',
  'apple-touch-icon.png'
];

/**
 * Find a user-provided favicon/icon for the project.
 * Prefers `seo.favicon`, then common filenames under game/ / assets/.
 */
export function resolveFavicon(rootDir: string, config: KawaProjectConfig): ResolvedIcon {
  const configured = config.seo?.favicon?.trim();
  if (configured) {
    const abs = resolveProjectAssetPath(rootDir, configured);
    if (abs) {
      const ext = path.extname(abs).toLowerCase() || '.png';
      const outFileName = `favicon${ext === '.jpeg' ? '.jpg' : ext}`;
      return {
        absolutePath: abs,
        href: `./${outFileName}`,
        mimeType: mimeForExt(ext),
        outFileName,
        isGenerated: false
      };
    }
  }

  for (const name of AUTO_FAVICON_NAMES) {
    const abs = resolveProjectAssetPath(rootDir, name);
    if (abs) {
      const ext = path.extname(abs).toLowerCase() || '.png';
      const outFileName = name.startsWith('apple-touch') ? name : `favicon${ext}`;
      return {
        absolutePath: abs,
        href: `./${outFileName}`,
        mimeType: mimeForExt(ext),
        outFileName,
        isGenerated: false
      };
    }
  }

  return {
    href: './icon.svg',
    mimeType: 'image/svg+xml',
    outFileName: 'icon.svg',
    isGenerated: true
  };
}

export function resolveAppleTouchIcon(
  rootDir: string,
  config: KawaProjectConfig,
  favicon: ResolvedIcon
): ResolvedIcon {
  const configured = config.seo?.appleTouchIcon?.trim();
  if (configured) {
    const abs = resolveProjectAssetPath(rootDir, configured);
    if (abs) {
      const ext = path.extname(abs).toLowerCase() || '.png';
      const outFileName = `apple-touch-icon${ext === '.svg' ? '.svg' : '.png'}`;
      return {
        absolutePath: abs,
        href: `./${outFileName}`,
        mimeType: mimeForExt(ext),
        outFileName,
        isGenerated: false
      };
    }
  }

  // Prefer a dedicated apple-touch file if present
  for (const name of ['apple-touch-icon.png', 'apple-touch-icon.svg']) {
    const abs = resolveProjectAssetPath(rootDir, name);
    if (abs) {
      return {
        absolutePath: abs,
        href: `./${path.basename(abs)}`,
        mimeType: mimeForExt(path.extname(abs)),
        outFileName: path.basename(abs),
        isGenerated: false
      };
    }
  }

  return favicon;
}

export interface SeoHeadInput {
  readonly config: KawaProjectConfig;
  readonly favicon: ResolvedIcon;
  readonly appleTouchIcon: ResolvedIcon;
  /** Absolute or site URL for canonical / og:url when known. */
  readonly pageUrl?: string;
  /** When false, skip PWA-only tags (caller may add them separately). */
  readonly includeIconLinks?: boolean;
}

/**
 * Full SEO + social + favicon <head> fragment for CLI HTML shells.
 */
export function renderSeoHeadTags(input: SeoHeadInput): string {
  const { config, favicon, appleTouchIcon } = input;
  const title = config.title || 'Kawaijs Visual Novel';
  const description =
    config.seo?.description ||
    config.share?.description ||
    `Play ${title} in your browser.`;
  const siteName = config.share?.siteName || title;
  const author = config.author;
  const locale = config.seo?.locale || 'en_US';
  const lang = locale.split('_')[0] || 'en';
  const robots = config.seo?.robots || 'index,follow';
  const themeColor =
    config.seo?.themeColor || config.pwa?.themeColor || config.theme?.primaryColor || '#f43f5e';
  const twitterCard = config.share?.twitterCard || 'summary_large_image';
  const canonical = config.seo?.canonicalUrl || input.pageUrl;
  const imageRaw = config.share?.defaultImage;
  const image = imageRaw
    ? imageRaw.startsWith('http') || imageRaw.startsWith('./') || imageRaw.startsWith('/')
      ? imageRaw
      : `./assets/${imageRaw.replace(/^assets\//, '')}`
    : undefined;

  const keywords = config.seo?.keywords;
  const keywordsStr = Array.isArray(keywords)
    ? keywords.filter(Boolean).join(', ')
    : typeof keywords === 'string'
      ? keywords
      : '';

  const lines: string[] = [
    `<meta name="description" content="${escapeHtmlAttr(description)}">`,
    `<meta name="robots" content="${escapeHtmlAttr(robots)}">`,
    `<meta name="theme-color" content="${escapeHtmlAttr(themeColor)}">`
  ];

  if (author) {
    lines.push(`<meta name="author" content="${escapeHtmlAttr(author)}">`);
  }
  if (keywordsStr) {
    lines.push(`<meta name="keywords" content="${escapeHtmlAttr(keywordsStr)}">`);
  }
  if (canonical) {
    lines.push(`<link rel="canonical" href="${escapeHtmlAttr(canonical)}">`);
  }

  // Open Graph
  lines.push(`<meta property="og:type" content="website">`);
  lines.push(`<meta property="og:locale" content="${escapeHtmlAttr(locale)}">`);
  lines.push(`<meta property="og:title" content="${escapeHtmlAttr(title)}">`);
  lines.push(`<meta property="og:description" content="${escapeHtmlAttr(description)}">`);
  lines.push(`<meta property="og:site_name" content="${escapeHtmlAttr(siteName)}">`);
  if (canonical) {
    lines.push(`<meta property="og:url" content="${escapeHtmlAttr(canonical)}">`);
  }
  if (image) {
    lines.push(`<meta property="og:image" content="${escapeHtmlAttr(image)}">`);
  }

  // Twitter
  lines.push(`<meta name="twitter:card" content="${escapeHtmlAttr(twitterCard)}">`);
  lines.push(`<meta name="twitter:title" content="${escapeHtmlAttr(title)}">`);
  lines.push(`<meta name="twitter:description" content="${escapeHtmlAttr(description)}">`);
  if (image) {
    lines.push(`<meta name="twitter:image" content="${escapeHtmlAttr(image)}">`);
  }
  if (config.seo?.twitterSite) {
    lines.push(`<meta name="twitter:site" content="${escapeHtmlAttr(config.seo.twitterSite)}">`);
  }
  if (config.seo?.twitterCreator) {
    lines.push(
      `<meta name="twitter:creator" content="${escapeHtmlAttr(config.seo.twitterCreator)}">`
    );
  }

  if (input.includeIconLinks !== false) {
    lines.push(
      `<link rel="icon" href="${escapeHtmlAttr(favicon.href)}" type="${escapeHtmlAttr(favicon.mimeType)}">`
    );
    lines.push(
      `<link rel="apple-touch-icon" href="${escapeHtmlAttr(appleTouchIcon.href)}">`
    );
  }

  // JSON-LD (SoftwareApplication + Person + optional FAQPage for AEO/GEO)
  if (config.seo?.jsonLd !== false) {
    const custom = typeof config.seo?.jsonLd === 'object' ? config.seo.jsonLd : null;
    const jsonLd = custom ?? buildDefaultJsonLd({
      title,
      description,
      author,
      canonical,
      image,
      faq: config.seo?.faq,
      sameAs: config.seo?.sameAs
    });

    lines.push(
      `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    );
  }

  // Help HTML lang consumers (attribute set separately on <html>)
  void lang;

  return lines.map((l) => `  ${l}`).join('\n');
}

export function buildDefaultJsonLd(input: {
  readonly title: string;
  readonly description: string;
  readonly author?: string;
  readonly canonical?: string;
  readonly image?: string;
  readonly faq?: readonly { readonly question: string; readonly answer: string }[];
  readonly sameAs?: readonly string[];
}): Record<string, unknown> {
  const app: Record<string, unknown> = {
    '@type': 'SoftwareApplication',
    name: input.title,
    description: input.description,
    applicationCategory: 'GameApplication',
    applicationSubCategory: 'VisualNovelEngine',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  };
  if (input.canonical) app.url = input.canonical;
  if (input.image) app.image = input.image;
  if (input.author) {
    app.author = { '@type': 'Person', name: input.author };
    app.creator = { '@type': 'Person', name: input.author };
  }

  const graph: Record<string, unknown>[] = [app];

  if (input.author) {
    const person: Record<string, unknown> = {
      '@type': 'Person',
      name: input.author,
      jobTitle: 'Software Engineer',
      knowsAbout: [
        'visual novels',
        'web development',
        'TypeScript',
        'Kawaijs',
        'game engines'
      ]
    };
    if (input.canonical) person.url = input.canonical;
    if (input.sameAs && input.sameAs.length > 0) person.sameAs = [...input.sameAs];
    graph.push(person);
  }

  if (input.faq && input.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: input.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    });
  }

  if (graph.length === 1) {
    return { '@context': 'https://schema.org', ...app };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

export function resolveHtmlLang(config: KawaProjectConfig): string {
  const locale = config.seo?.locale || 'en_US';
  return (locale.split(/[_-]/)[0] || 'en').toLowerCase();
}

/**
 * Copy user favicon / apple-touch into dist. Returns public hrefs actually written.
 */
export function writeSeoIconsToDist(
  outDir: string,
  favicon: ResolvedIcon,
  appleTouchIcon: ResolvedIcon,
  generatedIconSvg?: string
): { faviconHref: string; appleHref: string; pwaIconFile: string } {
  let faviconHref = favicon.href;
  let appleHref = appleTouchIcon.href;
  let pwaIconFile = 'icon.svg';

  if (favicon.absolutePath && favicon.outFileName) {
    fs.copyFileSync(favicon.absolutePath, path.join(outDir, favicon.outFileName));
    faviconHref = `./${favicon.outFileName}`;
    // Also publish as icon.* for PWA if SVG/PNG
    const ext = path.extname(favicon.outFileName).toLowerCase();
    if (ext === '.svg' || ext === '.png') {
      pwaIconFile = `icon${ext}`;
      fs.copyFileSync(favicon.absolutePath, path.join(outDir, pwaIconFile));
    }
  } else if (generatedIconSvg) {
    fs.writeFileSync(path.join(outDir, 'icon.svg'), generatedIconSvg, 'utf-8');
    faviconHref = './icon.svg';
    pwaIconFile = 'icon.svg';
  }

  if (
    appleTouchIcon.absolutePath &&
    appleTouchIcon.outFileName &&
    appleTouchIcon.absolutePath !== favicon.absolutePath
  ) {
    fs.copyFileSync(appleTouchIcon.absolutePath, path.join(outDir, appleTouchIcon.outFileName));
    appleHref = `./${appleTouchIcon.outFileName}`;
  } else if (appleTouchIcon.absolutePath && appleTouchIcon.outFileName) {
    // Same file as favicon — ensure out name exists
    if (!fs.existsSync(path.join(outDir, appleTouchIcon.outFileName))) {
      fs.copyFileSync(appleTouchIcon.absolutePath, path.join(outDir, appleTouchIcon.outFileName));
    }
    appleHref = `./${appleTouchIcon.outFileName}`;
  } else {
    appleHref = faviconHref;
  }

  return { faviconHref, appleHref, pwaIconFile };
}

/** Normalize a canonical URL to a directory base ending with `/`. */
export function canonicalBaseUrl(canonicalUrl: string): string | null {
  try {
    const u = new URL(canonicalUrl);
    if (u.pathname.endsWith('/') || u.pathname === '') {
      return u.href.endsWith('/') ? u.href : `${u.href}/`;
    }
    // File-like path → strip last segment
    const dir = u.pathname.replace(/\/[^/]*$/, '/');
    return `${u.origin}${dir}`;
  } catch {
    return null;
  }
}

/** Simple robots.txt when a canonical site URL is configured. */
export function renderRobotsTxt(canonicalUrl?: string): string {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Google Search Console / crawlers'
  ];
  if (canonicalUrl) {
    const base = canonicalBaseUrl(canonicalUrl);
    if (base) {
      lines.push(`Sitemap: ${base}sitemap.xml`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export type SitemapChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface SitemapEntryOptions {
  readonly loc?: string;
  readonly path?: string;
  readonly changefreq?: SitemapChangeFreq;
  readonly priority?: number;
  readonly lastmod?: string;
  /** Alternate language URLs for xhtml:link hreflang annotations. */
  readonly alternates?: readonly { readonly hreflang: string; readonly href: string }[];
}

const SITEMAP_SKIP_RE =
  /(?:^|\/)(?:robots\.txt|sw\.js|manifest\.webmanifest|favicon\.ico|favicon\.svg|icon\.svg)(?:$|\?)/i;

function resolveSitemapLoc(base: string, entry: string | SitemapEntryOptions): string | null {
  if (typeof entry === 'string') {
    if (!entry) return null;
    if (entry.startsWith('http://') || entry.startsWith('https://')) return entry;
    return `${base}${entry.replace(/^\//, '')}`;
  }
  if (entry.loc) return entry.loc;
  if (entry.path) {
    if (entry.path.startsWith('http://') || entry.path.startsWith('https://')) return entry.path;
    return `${base}${entry.path.replace(/^\//, '')}`;
  }
  return null;
}

function defaultPriority(loc: string, home: string): number {
  if (loc === home) return 1.0;
  if (/\/showcase\/?$/.test(loc) || /\/playground\/?$/.test(loc)) return 0.9;
  if (/\?lang=/.test(loc)) return 0.8;
  if (/\?at=/.test(loc)) return 0.65;
  if (/llms\.txt$/i.test(loc)) return 0.4;
  return 0.7;
}

function defaultChangefreq(loc: string, home: string): SitemapChangeFreq {
  if (loc === home || /\/showcase\/?$/.test(loc) || /\/playground\/?$/.test(loc)) return 'weekly';
  if (/\?at=/.test(loc) || /\?lang=/.test(loc)) return 'monthly';
  return 'monthly';
}

/** sitemap.xml for the built site (+ deep-link paths / extra entries). */
export function renderSitemapXml(
  canonicalUrl: string,
  extraPaths: readonly (string | SitemapEntryOptions)[] = []
): string {
  const baseRaw = canonicalBaseUrl(canonicalUrl) ?? canonicalUrl;
  const base = baseRaw.replace(/\/?$/, '/');
  const home = base;
  const today = new Date().toISOString().slice(0, 10);

  type Normalized = {
    loc: string;
    changefreq: SitemapChangeFreq;
    priority: number;
    lastmod: string;
    alternates: { hreflang: string; href: string }[];
  };

  const byLoc = new Map<string, Normalized>();

  const upsert = (entry: string | SitemapEntryOptions): void => {
    const loc = resolveSitemapLoc(base, entry);
    if (!loc || SITEMAP_SKIP_RE.test(loc)) return;
    // Utility / duplicate views — keep out of GSC sitemap
    if (/[?&]embed=/.test(loc)) return;

    const opts = typeof entry === 'string' ? {} : entry;
    const existing = byLoc.get(loc);
    const alternates = [...(existing?.alternates ?? [])];
    if (opts.alternates) {
      for (const alt of opts.alternates) {
        if (!alternates.some((a) => a.hreflang === alt.hreflang && a.href === alt.href)) {
          alternates.push({ hreflang: alt.hreflang, href: alt.href });
        }
      }
    }

    byLoc.set(loc, {
      loc,
      lastmod: opts.lastmod ?? existing?.lastmod ?? today,
      changefreq: opts.changefreq ?? existing?.changefreq ?? defaultChangefreq(loc, home),
      priority: opts.priority ?? existing?.priority ?? defaultPriority(loc, home),
      alternates
    });
  };

  upsert(home);
  for (const p of extraPaths) upsert(p);

  // Stable order: home first, then alpha
  const entries = [...byLoc.values()].sort((a, b) => {
    if (a.loc === home) return -1;
    if (b.loc === home) return 1;
    return a.loc.localeCompare(b.loc);
  });

  const hasAlternates = entries.some((e) => e.alternates.length > 0);
  const ns = hasAlternates
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

  const body = entries
    .map((e) => {
      const altLines = e.alternates
        .map(
          (a) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(a.hreflang)}" href="${escapeXml(a.href)}" />`
        )
        .join('\n');
      return `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${escapeXml(e.lastmod)}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>${altLines ? `\n${altLines}` : ''}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${ns}>
${body}
</urlset>
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** llms.txt — machine-readable summary for AI crawlers (GEO). */
export function renderLlmsTxt(config: KawaProjectConfig): string {
  if (typeof config.seo?.llmsTxt === 'string' && config.seo.llmsTxt.trim()) {
    return config.seo.llmsTxt.trimEnd() + '\n';
  }

  const title = config.title || 'Kawaijs Visual Novel';
  const description =
    config.seo?.aiSummary ||
    config.seo?.description ||
    config.share?.description ||
    `${title} is a browser visual novel.`;
  const author = config.author || 'Unknown';
  const canonical = config.seo?.canonicalUrl;
  const lines = [
    `# ${title}`,
    '',
    `> ${description}`,
    '',
    `Author: ${author}`,
    'Engine: Kawaijs — web-native visual novel engine (TypeScript, Ren\'Py-inspired scripting).',
    'License: MIT',
    ''
  ];

  if (canonical) {
    lines.push('## Primary');
    lines.push(`- [${title}](${canonical}): Interactive documentation / playable site`);
    lines.push('');
  }

  lines.push('## Facts');
  lines.push('- Kawaijs runs visual novels entirely in the browser with no backend required.');
  lines.push('- Authors write `.kawa` scripts (indentation-based) and ship a static `dist/` folder.');
  lines.push('- Deploy targets include GitHub Pages, Netlify, Vercel, Cloudflare Pages, and itch.io.');
  lines.push('- Built-in features: save/load, backlog, rollback, PWA, SEO meta, JSON-LD, i18n.');
  lines.push('- `kawa build` compiles and runs semantic validation (labels, choices, hotspots).');
  lines.push('- `StoryVM.getState()` returns a clone; mutating it does not alter the running story.');
  lines.push('- Modals restore keyboard focus on Escape; `input` prompts cannot be dismissed with Escape.');
  lines.push('');

  if (config.seo?.faq && config.seo.faq.length > 0) {
    lines.push('## FAQ');
    for (const item of config.seo.faq) {
      lines.push(`- Q: ${item.question}`);
      lines.push(`  A: ${item.answer}`);
    }
    lines.push('');
  }

  if (config.seo?.sameAs && config.seo.sameAs.length > 0) {
    lines.push('## Links');
    for (const url of config.seo.sameAs) {
      lines.push(`- ${url}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Crawlable FAQ / summary for bots when JS is unavailable (AEO). */
export function renderNoscriptDocs(config: KawaProjectConfig): string {
  const title = escapeHtmlText(config.title || 'Kawaijs');
  const description = escapeHtmlText(
    config.seo?.aiSummary || config.seo?.description || config.share?.description || ''
  );
  const author = escapeHtmlText(config.author || '');
  const faq = config.seo?.faq ?? [];

  const faqHtml = faq
    .map(
      (item) => `    <section>
      <h3>${escapeHtmlText(item.question)}</h3>
      <p>${escapeHtmlText(item.answer)}</p>
    </section>`
    )
    .join('\n');

  return `<noscript>
  <main style="max-width:42rem;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.55;color:#0f172a;background:#fff">
    <h1>${title}</h1>
    ${author ? `<p><strong>Author:</strong> ${author}</p>` : ''}
    ${description ? `<p>${description}</p>` : ''}
    <p>Enable JavaScript to play this interactive visual-novel documentation. Static answers follow for search and answer engines.</p>
${faqHtml ? `    <h2>Frequently asked questions</h2>\n${faqHtml}` : ''}
  </main>
</noscript>`;
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
