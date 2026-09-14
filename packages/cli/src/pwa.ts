import type { KawaProjectConfig } from './config.js';

export interface PwaAssets {
  readonly manifestJson: string;
  readonly serviceWorkerJs: string;
  readonly iconSvg: string;
}

export interface WebManifestOptions {
  /** Icon file in dist, e.g. `icon.svg` or `icon.png`. */
  readonly iconFile?: string;
  readonly iconMime?: string;
}

export function buildPwaIconSvg(accent = '#f43f5e'): string {
  const safe = accent.replace(/[<>"']/g, '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Kawaijs">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <circle cx="256" cy="210" r="110" fill="${safe}" opacity="0.95"/>
  <path d="M120 400c40-70 100-100 136-100s96 30 136 100" fill="none" stroke="${safe}" stroke-width="28" stroke-linecap="round"/>
  <circle cx="210" cy="190" r="14" fill="#0f172a"/>
  <circle cx="302" cy="190" r="14" fill="#0f172a"/>
</svg>
`;
}

export function buildWebManifest(
  config: KawaProjectConfig,
  options: WebManifestOptions = {}
): string {
  const name = config.title || 'Kawaijs Visual Novel';
  const shortName = (config.pwa?.shortName || name).slice(0, 12);
  const themeColor =
    config.seo?.themeColor || config.pwa?.themeColor || config.theme?.primaryColor || '#f43f5e';
  const backgroundColor = config.pwa?.backgroundColor || '#000000';
  const description =
    config.seo?.description ||
    config.share?.description ||
    config.pwa?.description ||
    `Play ${name} in your browser.`;
  const iconFile = options.iconFile || 'icon.svg';
  const iconMime =
    options.iconMime ||
    (iconFile.endsWith('.png') ? 'image/png' : 'image/svg+xml');
  const lang = (config.seo?.locale || 'en_US').split(/[_-]/)[0] || 'en';

  const manifest = {
    name,
    short_name: shortName,
    description,
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: backgroundColor,
    theme_color: themeColor,
    lang,
    icons: [
      {
        src: `./${iconFile}`,
        sizes: 'any',
        type: iconMime,
        purpose: 'any'
      },
      {
        src: `./${iconFile}`,
        sizes: 'any',
        type: iconMime,
        purpose: 'maskable'
      }
    ]
  };

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** App-shell service worker: precache core files, cache-first for assets. */
export function buildServiceWorkerScript(
  cacheVersion = 'kawa-v1',
  precacheExtra: string[] = []
): string {
  const precache = [
    './',
    './index.html',
    './style.css',
    './manifest.webmanifest',
    './icon.svg',
    ...precacheExtra
  ];
  const unique = [...new Set(precache)];
  return `/* Kawaijs PWA service worker */
const CACHE = '${cacheVersion}';
const PRECACHE = ${JSON.stringify(unique)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isAsset =
    url.pathname.includes('/assets/') ||
    /\\.(png|jpe?g|webp|gif|svg|ico|mp3|ogg|wav|m4a|css|js|woff2?)$/i.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then(async (res) => {
        const cache = await caches.open(CACHE);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
`;
}

export function buildPwaAssets(
  config: KawaProjectConfig,
  cacheVersion?: string,
  options: WebManifestOptions & { precacheExtra?: string[] } = {}
): PwaAssets {
  const accent =
    config.seo?.themeColor || config.pwa?.themeColor || config.theme?.primaryColor || '#f43f5e';
  return {
    manifestJson: buildWebManifest(config, options),
    serviceWorkerJs: buildServiceWorkerScript(
      cacheVersion ?? `kawa-${Date.now().toString(36)}`,
      options.precacheExtra
    ),
    iconSvg: buildPwaIconSvg(accent)
  };
}

/** HTML tags for PWA installability (favicon/SEO icons come from seo.ts). */
export function renderPwaHeadTags(config: KawaProjectConfig): string {
  const themeColor = (
    config.seo?.themeColor ||
    config.pwa?.themeColor ||
    config.theme?.primaryColor ||
    '#f43f5e'
  ).replace(/[<>"']/g, '');
  const title = (config.title || 'Kawaijs Visual Novel').replace(/[<>"']/g, '');
  return [
    `  <meta name="mobile-web-app-capable" content="yes">`,
    `  <meta name="apple-mobile-web-app-capable" content="yes">`,
    `  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
    `  <meta name="apple-mobile-web-app-title" content="${title.slice(0, 12)}">`,
    `  <meta name="theme-color" content="${themeColor}">`,
    `  <link rel="manifest" href="./manifest.webmanifest">`
  ].join('\n');
}

export function renderPwaRegisterScript(): string {
  return `
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
`;
}
