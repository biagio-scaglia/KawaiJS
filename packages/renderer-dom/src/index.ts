export * from './renderer.js';
export * from './share-meta.js';
export * from './embed.js';
export * from './touch.js';

import type { StoryPackage } from '@kawaijs/ast';
import {
  StoryVM,
  decodeContinueToken,
  resolveContinueToken
} from '@kawaijs/runtime';
import { DOMRenderer, preloadStoryAssets, type DOMRendererOptions } from './renderer.js';
import { resolveEmbedMode } from './embed.js';

export interface MountKawaAppOptions extends Omit<DOMRendererOptions, 'container'> {
  /**
   * Deep-link label override. When omitted, reads `?at=` or `?label=` from the URL.
   * Internal labels (`__…`) are ignored.
   */
  startLabel?: string;
  /** Optional URL search string for deep-link / embed / continue / lang detection. */
  search?: string;
  /** Optional URL hash for continue-link detection. */
  hash?: string;
  /** Skip applying a continue-link from the URL. */
  ignoreContinueLink?: boolean;
  /** Force language for `{t:key}` tables. Falls back to `?lang=`. */
  lang?: string;
}

/**
 * Resolve a public deep-link label from options or the current URL.
 * Returns undefined when missing / invalid / internal.
 */
export function resolveDeepLinkLabel(
  story: StoryPackage,
  options?: { startLabel?: string; search?: string }
): string | undefined {
  const fromOpt = options?.startLabel?.trim();
  let candidate = fromOpt || undefined;

  if (!candidate && typeof window !== 'undefined') {
    const search = options?.search ?? window.location.search;
    const params = new URLSearchParams(search);
    candidate = (params.get('at') ?? params.get('label') ?? '').trim() || undefined;
  }

  if (!candidate || candidate.startsWith('__')) return undefined;
  if (!story.labels[candidate]) return undefined;
  return candidate;
}

export function resolveLangCode(options?: { lang?: string; search?: string }): string | undefined {
  const fromOpt = options?.lang?.trim().toLowerCase();
  if (fromOpt) return fromOpt;
  let search = options?.search;
  if (search === undefined && typeof window !== 'undefined') {
    search = window.location.search;
  }
  if (!search) return undefined;
  const code = new URLSearchParams(search).get('lang')?.trim().toLowerCase();
  return code || undefined;
}

/**
 * High-level helper to initialize and mount a visual novel into the DOM.
 */
export function mountKawaApp(
  story: StoryPackage,
  container: HTMLElement,
  options?: MountKawaAppOptions
): { vm: StoryVM; renderer: DOMRenderer } {
  preloadStoryAssets(story, options?.assetResolver);

  const continueToken = options?.ignoreContinueLink
    ? undefined
    : resolveContinueToken(options?.search, options?.hash);
  const continueSlot = continueToken ? decodeContinueToken(continueToken) : null;

  const deepLink = continueSlot ? undefined : resolveDeepLinkLabel(story, options);
  const embed = options?.embed ?? resolveEmbedMode(options?.search);
  const lang = resolveLangCode(options);
  const {
    startLabel: _ignored,
    search: _search,
    hash: _hash,
    ignoreContinueLink: _icl,
    lang: _lang,
    ...rendererOptions
  } = options ?? {};

  const skipMenu = Boolean(deepLink || embed || continueSlot);

  const vm = new StoryVM(story);
  const renderer = new DOMRenderer(vm, {
    container,
    ...rendererOptions,
    embed,
    syncUrlLabel: rendererOptions.syncUrlLabel ?? Boolean(deepLink || embed),
    mainMenu: skipMenu
      ? { ...rendererOptions.mainMenu, enabled: false }
      : rendererOptions.mainMenu
  });

  if (continueSlot) {
    const res = vm.loadFromSlot(continueSlot);
    if (!res.success) {
      if (!renderer.isMainMenuActive()) {
        vm.start(deepLink);
      }
    }
  } else if (deepLink) {
    vm.start(deepLink);
  } else if (!renderer.isMainMenuActive()) {
    vm.start();
  }

  vm.hydrateAchievements();
  if (lang) {
    vm.setLang(lang);
  }

  return { vm, renderer };
}
