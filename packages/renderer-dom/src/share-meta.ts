import type { StoryPackage } from '@kawaijs/ast';
import type { StoryState } from '@kawaijs/runtime';

export interface ShareLabelMeta {
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
}

export interface ShareConfig {
  readonly siteName?: string;
  readonly description?: string;
  readonly defaultImage?: string;
  readonly twitterCard?: 'summary' | 'summary_large_image';
  readonly labels?: Readonly<Record<string, ShareLabelMeta>>;
}

export interface SceneShareMeta {
  readonly title: string;
  readonly description: string;
  readonly image?: string;
  readonly url?: string;
}

/** Strip Kawa rich-text tags and variable placeholders for plain-text previews. */
export function stripRichTags(text: string): string {
  return text
    .replace(/\{\/?[a-z]+(?:=[^}]*)?\}/gi, '')
    .replace(/\[[\w.]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveShareAssetUrl(path: string, assetBase = './assets/'): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/') || path.startsWith('./')) return path;
  const clean = path.replace(/^bg[\s_]+/i, '').trim();
  if (clean.includes('/')) return `${assetBase}${clean}`;
  if (/\.(svg|png|jpe?g|webp|gif)$/i.test(clean)) {
    return `${assetBase}backgrounds/${clean}`;
  }
  return `${assetBase}backgrounds/${clean}.svg`;
}

export function buildSceneShareMeta(
  story: StoryPackage,
  state: StoryState,
  config?: ShareConfig,
  pageUrl?: string
): SceneShareMeta {
  const gameTitle = config?.siteName ?? story.meta?.title ?? 'Kawaijs Visual Novel';
  const label = state.currentLabel;
  const labelMeta = label && !label.startsWith('__') ? config?.labels?.[label] : undefined;

  let title = labelMeta?.title ?? gameTitle;
  if (!labelMeta?.title && label && !label.startsWith('__')) {
    const pretty = label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    title = `${gameTitle} — ${pretty}`;
  }

  let description = labelMeta?.description ?? config?.description ?? '';
  if (!description && state.dialogue?.text) {
    const raw = stripRichTags(state.dialogue.text);
    const speaker = state.dialogue.speakerDisplayName ?? state.dialogue.speaker;
    description = speaker ? `${speaker}: ${raw}` : raw;
    if (description.length > 160) {
      description = `${description.slice(0, 157)}…`;
    }
  }
  if (!description) {
    description = config?.description ?? `Play ${gameTitle} in your browser.`;
  }

  let image = labelMeta?.image;
  if (!image && state.visual.activeCG) {
    image = state.visual.activeCG;
  }
  if (!image && state.visual.background) {
    image = state.visual.background;
  }
  image = image ?? config?.defaultImage;

  return {
    title,
    description,
    image,
    url: pageUrl
  };
}

function upsertMetaProperty(property: string, content: string): void {
  if (!content) return;
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertMetaName(name: string, content: string): void {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Update Open Graph / Twitter meta tags and document title for the current scene. */
export function applyDocumentShareMeta(meta: SceneShareMeta, config?: ShareConfig): void {
  if (typeof document === 'undefined') return;

  let imageUrl = meta.image;
  if (imageUrl && typeof window !== 'undefined') {
    try {
      imageUrl = new URL(imageUrl, window.location.href).href;
    } catch {
      // keep relative
    }
  }

  document.title = meta.title;
  upsertMetaProperty('og:title', meta.title);
  upsertMetaProperty('og:description', meta.description);
  upsertMetaProperty('og:type', 'website');
  if (meta.url) upsertMetaProperty('og:url', meta.url);
  if (config?.siteName) upsertMetaProperty('og:site_name', config.siteName);
  if (imageUrl) upsertMetaProperty('og:image', imageUrl);

  upsertMetaName('description', meta.description);
  upsertMetaName('twitter:card', config?.twitterCard ?? 'summary_large_image');
  upsertMetaName('twitter:title', meta.title);
  upsertMetaName('twitter:description', meta.description);
  if (imageUrl) upsertMetaName('twitter:image', imageUrl);
}
