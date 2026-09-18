import * as fs from 'node:fs';
import * as path from 'node:path';

export interface KawaThemeConfig {
  readonly primaryColor?: string;
  readonly fontFamily?: string;
  readonly headingFont?: string;
  readonly dialogueBackground?: string;
  readonly dialogueBorder?: string;
}

export interface KawaWindowConfig {
  readonly width?: number;
  readonly height?: number;
  readonly aspectRatio?: string;
}

export interface KawaDefaultSettings {
  readonly textSpeed?: number;
  readonly autoDelay?: number;
  readonly musicVolume?: number;
  readonly soundVolume?: number;
  readonly voiceVolume?: number;
}

export interface KawaGalleryItemConfig {
  readonly id: string;
  readonly image: string;
  readonly title: string;
  readonly description?: string;
  readonly thumbnail?: string;
}

export interface KawaShareLabelConfig {
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
}

export interface KawaShareConfig {
  readonly siteName?: string;
  readonly description?: string;
  readonly defaultImage?: string;
  readonly twitterCard?: 'summary' | 'summary_large_image';
  readonly labels?: Readonly<Record<string, KawaShareLabelConfig>>;
}

export interface KawaPwaConfig {
  /** Enable PWA assets on build (default: true). */
  readonly enabled?: boolean;
  readonly shortName?: string;
  readonly description?: string;
  readonly themeColor?: string;
  readonly backgroundColor?: string;
}

export interface KawaSeoFaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface KawaSeoConfig {
  /** Meta description (falls back to share.description). */
  readonly description?: string;
  /** Comma-separated string or list of keywords. */
  readonly keywords?: string | readonly string[];
  /** Canonical page URL (also used for og:url / JSON-LD). */
  readonly canonicalUrl?: string;
  /** Open Graph locale, e.g. `en_US` or `it_IT`. */
  readonly locale?: string;
  /** robots meta content (default: `index,follow`). */
  readonly robots?: string;
  /**
   * Project-relative favicon path (svg/png/ico).
   * Checked under project root, `game/`, and `game/assets/`.
   * Also auto-discovers `favicon.svg` / `favicon.png` / `icon.svg`.
   */
  readonly favicon?: string;
  /** Optional apple-touch-icon (defaults to favicon). */
  readonly appleTouchIcon?: string;
  readonly themeColor?: string;
  /** Twitter @site handle, e.g. `@mystudio`. */
  readonly twitterSite?: string;
  /** Twitter @creator handle. */
  readonly twitterCreator?: string;
  /**
   * Emit JSON-LD WebApplication by default.
   * Set `false` to disable, or pass a custom object.
   */
  readonly jsonLd?: boolean | Record<string, unknown>;
  /**
   * FAQ entries for FAQPage JSON-LD + crawlable `<noscript>` (AEO / GEO).
   */
  readonly faq?: readonly KawaSeoFaqItem[];
  /**
   * Emit `llms.txt` next to the build (default: true when `canonicalUrl` is set).
   * Pass a string to override the full file body.
   */
  readonly llmsTxt?: boolean | string;
  /** Extra absolute or site-relative paths included in `sitemap.xml`. */
  readonly sitemapPaths?: readonly string[];
  /** Author profile / sameAs links for Person JSON-LD (GitHub, site, etc.). */
  readonly sameAs?: readonly string[];
  /** Short factual summary for AI crawlers (also used in llms.txt). */
  readonly aiSummary?: string;
}

export interface KawaAchievementConfig {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
}

export interface KawaProjectConfig {
  readonly title?: string;
  readonly author?: string;
  readonly version?: string;
  readonly theme?: KawaThemeConfig;
  readonly window?: KawaWindowConfig;
  readonly settings?: KawaDefaultSettings;
  readonly gallery?: readonly KawaGalleryItemConfig[];
  readonly share?: KawaShareConfig;
  readonly pwa?: KawaPwaConfig;
  readonly seo?: KawaSeoConfig;
  readonly achievements?: readonly KawaAchievementConfig[];
}

export const DEFAULT_KAWA_CONFIG: KawaProjectConfig = {
  title: 'My Kawaijs Visual Novel',
  author: 'Author Name',
  version: '0.1.0',
  theme: {
    primaryColor: '#f43f5e',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    headingFont: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  window: {
    width: 1280,
    height: 720,
    aspectRatio: '16/9'
  },
  settings: {
    textSpeed: 25,
    autoDelay: 2000,
    musicVolume: 0.8,
    soundVolume: 1.0,
    voiceVolume: 1.0
  },
  gallery: [],
  share: {},
  pwa: {
    enabled: true
  },
  seo: {
    robots: 'index,follow',
    locale: 'en_US',
    jsonLd: true
  },
  achievements: []
};

/**
 * Discovers and loads a Kawaijs project configuration file (kawa.config.json or game/kawa.config.json).
 */
export function loadProjectConfig(projectDir: string): KawaProjectConfig {
  const rootDir = path.resolve(process.cwd(), projectDir);

  const candidatePaths = [
    path.join(rootDir, 'kawa.config.json'),
    path.join(rootDir, 'game', 'kawa.config.json'),
    path.join(rootDir, 'kawa.json')
  ];

  for (const configPath of candidatePaths) {
    if (fs.existsSync(configPath)) {
      try {
        const rawContent = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(rawContent) as Partial<KawaProjectConfig>;
        return {
          ...DEFAULT_KAWA_CONFIG,
          ...parsed,
          theme: {
            ...DEFAULT_KAWA_CONFIG.theme,
            ...(parsed.theme ?? {})
          },
          window: {
            ...DEFAULT_KAWA_CONFIG.window,
            ...(parsed.window ?? {})
          },
          settings: {
            ...DEFAULT_KAWA_CONFIG.settings,
            ...(parsed.settings ?? {})
          },
          gallery: parsed.gallery ?? DEFAULT_KAWA_CONFIG.gallery,
          share: {
            ...DEFAULT_KAWA_CONFIG.share,
            ...(parsed.share ?? {}),
            labels: {
              ...(DEFAULT_KAWA_CONFIG.share?.labels ?? {}),
              ...(parsed.share?.labels ?? {})
            }
          },
          pwa: {
            ...DEFAULT_KAWA_CONFIG.pwa,
            ...(parsed.pwa ?? {})
          },
          seo: {
            ...DEFAULT_KAWA_CONFIG.seo,
            ...(parsed.seo ?? {})
          },
          achievements: parsed.achievements ?? DEFAULT_KAWA_CONFIG.achievements
        };
      } catch (err: unknown) {
        console.warn(`⚠️ Warning: Failed to parse configuration file at '${configPath}': ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return DEFAULT_KAWA_CONFIG;
}

export function createCliFileResolver(rootDir: string, scriptPath?: string): (target: string, from: string) => string | null {
  return (target: string, from: string): string | null => {
    const base = from && from !== '<anonymous>' && path.isAbsolute(from)
      ? path.dirname(from)
      : (scriptPath ? path.dirname(scriptPath) : path.join(rootDir, 'game'));
    const resolved = path.resolve(base, target);
    if (fs.existsSync(resolved)) return fs.readFileSync(resolved, 'utf-8');
    const alt = path.resolve(rootDir, 'game', target);
    if (fs.existsSync(alt)) return fs.readFileSync(alt, 'utf-8');
    const altRoot = path.resolve(rootDir, target);
    if (fs.existsSync(altRoot)) return fs.readFileSync(altRoot, 'utf-8');
    return null;
  };
}

