import type { AssetType } from './types.js';

/** Raster + vector extensions tried when a character path resolves to `.svg` by default. */
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'] as const;

/**
 * Build candidate URLs for a character asset key (`yumia` or `yumia/happy`).
 * Prefer raster (png/jpg/webp) before the default `.svg` so real art wins.
 */
export function characterAssetCandidates(
  pathKey: string,
  resolve: (path: string, type: AssetType) => string
): string[] {
  const primary = resolve(pathKey, 'character');
  const extMatch = primary.match(/^(.*)\.(svg|png|jpe?g|webp|gif)$/i);
  if (!extMatch) {
    return IMAGE_EXTENSIONS.map((ext) => `${primary}${ext}`);
  }

  const base = extMatch[1]!;
  const primaryExt = `.${extMatch[2]!.toLowerCase()}`;
  const normalizedPrimary =
    primaryExt === '.jpeg' ? '.jpg' : primaryExt === '.jpg' ? '.jpg' : primaryExt;

  // Explicit non-svg path → that file first, then siblings
  if (normalizedPrimary !== '.svg') {
    const rest = IMAGE_EXTENSIONS.filter((ext) => ext !== normalizedPrimary && !(normalizedPrimary === '.jpg' && ext === '.jpeg'));
    return [primary, ...rest.map((ext) => `${base}${ext}`)];
  }

  // Default resolver appended .svg → try real bitmaps first
  return IMAGE_EXTENSIONS.map((ext) => `${base}${ext}`);
}

/**
 * Attach sequential src fallbacks on an image (png/jpg/webp before giving up).
 */
export function bindImageSrcFallbacks(
  img: HTMLImageElement,
  candidates: string[],
  onAllFailed?: () => void
): void {
  let index = 0;
  const tryNext = (): void => {
    if (index >= candidates.length) {
      onAllFailed?.();
      return;
    }
    img.src = candidates[index++]!;
  };

  img.onerror = () => {
    tryNext();
  };

  tryNext();
}
