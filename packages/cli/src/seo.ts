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

  // JSON-LD
  if (config.seo?.jsonLd !== false) {
    const custom = typeof config.seo?.jsonLd === 'object' ? config.seo.jsonLd : null;
    const jsonLd =
      custom ??
      ({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: title,
        description,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        },
        ...(author
          ? {
              author: {
                '@type': 'Person',
                name: author
              }
            }
          : {}),
        ...(canonical ? { url: canonical } : {}),
        ...(image ? { image } : {})
      } as Record<string, unknown>);

    lines.push(
      `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    );
  }

  // Help HTML lang consumers (attribute set separately on <html>)
  void lang;

  return lines.map((l) => `  ${l}`).join('\n');
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

/** Simple robots.txt when a canonical site URL is configured. */
export function renderRobotsTxt(canonicalUrl?: string): string {
  const lines = ['User-agent: *', 'Allow: /'];
  if (canonicalUrl) {
    try {
      const u = new URL(canonicalUrl);
      const base = u.href.endsWith('/') ? u.href : `${u.href.replace(/\/[^/]*$/, '/')}`;
      lines.push(`Sitemap: ${base}sitemap.xml`);
    } catch {
      // ignore invalid URL
    }
  }
  return `${lines.join('\n')}\n`;
}
