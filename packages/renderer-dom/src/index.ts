export * from './renderer.js';

import type { StoryPackage } from '@kawaijs/ast';
import { StoryVM } from '@kawaijs/runtime';
import { DOMRenderer, preloadStoryAssets, type DOMRendererOptions } from './renderer.js';

/**
 * High-level helper to initialize and mount a visual novel into the DOM.
 */
export function mountKawaApp(
  story: StoryPackage,
  container: HTMLElement,
  options?: Omit<DOMRendererOptions, 'container'>
): { vm: StoryVM; renderer: DOMRenderer } {
  preloadStoryAssets(story, options?.assetResolver);

  const vm = new StoryVM(story);
  const renderer = new DOMRenderer(vm, {
    container,
    ...options
  });

  vm.start();
  return { vm, renderer };
}


