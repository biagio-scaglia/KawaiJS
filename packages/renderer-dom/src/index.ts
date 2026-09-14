export * from './renderer.js';

import type { StoryPackage } from '@kawaijs/ast';
import { StoryVM } from '@kawaijs/runtime';
import { DOMRenderer, preloadStoryAssets, type DOMRendererOptions } from './renderer.js';

export interface MountKawaAppOptions extends Omit<DOMRendererOptions, 'container'> {
  /**
   * Deep-link label override. When omitted, reads `?at=` or `?label=` from the URL.
   * Internal labels (`__…`) are ignored.
   */
  startLabel?: string;
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

/**
 * High-level helper to initialize and mount a visual novel into the DOM.
 */
export function mountKawaApp(
  story: StoryPackage,
  container: HTMLElement,
  options?: MountKawaAppOptions
): { vm: StoryVM; renderer: DOMRenderer } {
  preloadStoryAssets(story, options?.assetResolver);

  const deepLink = resolveDeepLinkLabel(story, options);
  const { startLabel: _ignored, ...rendererOptions } = options ?? {};

  const vm = new StoryVM(story);
  const renderer = new DOMRenderer(vm, {
    container,
    ...rendererOptions,
    syncUrlLabel: rendererOptions.syncUrlLabel ?? Boolean(deepLink),
    mainMenu: deepLink
      ? { ...rendererOptions.mainMenu, enabled: false }
      : rendererOptions.mainMenu
  });

  if (deepLink) {
    vm.start(deepLink);
  } else if (!renderer.isMainMenuActive()) {
    vm.start();
  }

  return { vm, renderer };
}
