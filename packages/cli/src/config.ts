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
  }
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
          }
        };
      } catch (err: unknown) {
        console.warn(`⚠️ Warning: Failed to parse configuration file at '${configPath}': ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return DEFAULT_KAWA_CONFIG;
}
