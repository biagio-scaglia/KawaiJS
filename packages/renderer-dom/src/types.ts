import type { StoryPackage } from '@kawaijs/ast';

export type AssetType = 'background' | 'character' | 'audio';

export function defaultAssetResolver(path: string, type: AssetType): string {
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('/') ||
    path.startsWith('./')
  ) {
    return path;
  }

  if (type === 'background') {
    const clean = path.replace(/^bg[\s_]+/i, '').trim();
    return clean.includes('.') ? `assets/backgrounds/${clean}` : `assets/backgrounds/${clean}.svg`;
  }

  if (type === 'character') {
    const clean = path.replace(/_/g, '/').replace(/\s+/g, '/').trim();
    return clean.includes('.') ? `assets/characters/${clean}` : `assets/characters/${clean}.svg`;
  }

  if (type === 'audio') {
    return path.includes('.') ? `assets/audio/${path}` : `assets/audio/${path}.mp3`;
  }

  return path;
}

/**
 * Preload all background and character assets mentioned in a story to eliminate visual flashes.
 */
export function preloadStoryAssets(story: StoryPackage, assetResolver: (path: string, type: AssetType) => string = defaultAssetResolver): void {
  if (typeof window === 'undefined') return;

  const bgSet = new Set<string>();
  const charSet = new Set<string>();

  for (const label of Object.values(story.labels)) {
    for (const inst of label) {
      if (inst.type === 'scene' && inst.background) {
        const clean = inst.background.replace(/^bg[\s_]+/i, '').trim();
        bgSet.add(clean);
      } else if (inst.type === 'show') {
        const key = inst.expression ? `${inst.character}/${inst.expression}` : inst.character;
        charSet.add(key);
      }
    }
  }

  for (const bg of bgSet) {
    const img = new Image();
    img.src = assetResolver(bg, 'background');
  }

  for (const char of charSet) {
    const img = new Image();
    img.src = assetResolver(char, 'character');
  }
}

export interface MainMenuItem {
  id?: string;
  label: string;
  icon?: string;
  action: 'start' | 'continue' | 'load' | 'settings' | 'about' | 'history' | 'quit' | (() => void);
  condition?: () => boolean;
  className?: string;
}

export interface MainMenuOptions {
  /**
   * Whether to display the Start / Main Menu screen before entering the story.
   * Default: true (Ren'Py style)
   */
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  backgroundUrl?: string;
  bgmTrack?: string;
  items?: MainMenuItem[];
  customFooter?: string;
  onStart?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onQuit?: () => void;
}

export interface AudioManagerLike {
  setMusicVolume(val: number): void;
  setSoundVolume(val: number): void;
  setMasterVolume?(val: number): void;
  getMusicVolume?(): number;
  getSoundVolume?(): number;
}

export interface DOMRendererOptions {
  container: HTMLElement;
  typewriterSpeed?: number; // ms per character, 0 for instant
  autoDelayMs?: number; // delay before auto-advancing
  assetResolver?: (path: string, type: AssetType) => string;
  mainMenu?: MainMenuOptions;
  audioManager?: AudioManagerLike;
}
