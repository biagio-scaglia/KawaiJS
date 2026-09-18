import type { SaveSlot } from './save.js';
import { migrateSaveSlot } from './save.js';

/** Compact continue-link payload (schema-aligned SaveSlot, history trimmed). */
export interface ContinueLinkPayload {
  readonly v: 1;
  readonly slot: SaveSlot;
}

const MAX_HISTORY_IN_LINK = 24;
/** Soft limit for query string friendliness across browsers/hosts. */
export const CONTINUE_LINK_SOFT_MAX_CHARS = 7000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + '='.repeat(padLen);
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function utf8Encode(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text);
  }
  return new Uint8Array(Buffer.from(text, 'utf8'));
}

function utf8Decode(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(bytes).toString('utf8');
}

/** Strip bulky / non-essential fields for URL transport. */
export function compactSaveForContinueLink(slot: SaveSlot, includeHistory = true): SaveSlot {
  const history = includeHistory
    ? (slot.historyEntries ?? []).slice(-MAX_HISTORY_IN_LINK)
    : [];

  return {
    schemaVersion: slot.schemaVersion ?? 2,
    storyHash: slot.storyHash,
    id: slot.id || 'continue',
    name: slot.name || 'Continue Link',
    timestamp: slot.timestamp,
    snapshot: {
      id: slot.snapshot.id,
      timestamp: slot.snapshot.timestamp,
      state: slot.snapshot.state,
      // historyLength must match the entries we actually keep in the payload
      historyLength: history.length
    },
    previewText: slot.previewText,
    historyEntries: history
  };
}

/**
 * Encode a save slot into a URL-safe continue token.
 * Returns null if the payload cannot be kept under the soft size limit.
 */
export function encodeContinueToken(slot: SaveSlot): string | null {
  let compact = compactSaveForContinueLink(slot, true);
  let payload: ContinueLinkPayload = { v: 1, slot: compact };
  let token = toBase64Url(utf8Encode(JSON.stringify(payload)));

  if (token.length > CONTINUE_LINK_SOFT_MAX_CHARS) {
    compact = compactSaveForContinueLink(slot, false);
    payload = { v: 1, slot: compact };
    token = toBase64Url(utf8Encode(JSON.stringify(payload)));
  }

  if (token.length > CONTINUE_LINK_SOFT_MAX_CHARS) {
    return null;
  }
  return token;
}

/** Decode a continue token back into a migrated SaveSlot. */
export function decodeContinueToken(token: string): SaveSlot | null {
  try {
    const json = utf8Decode(fromBase64Url(token.trim()));
    const parsed = JSON.parse(json) as ContinueLinkPayload | SaveSlot;
    const rawSlot =
      parsed && typeof parsed === 'object' && 'v' in parsed && (parsed as ContinueLinkPayload).v === 1
        ? (parsed as ContinueLinkPayload).slot
        : (parsed as SaveSlot);
    return migrateSaveSlot(rawSlot);
  } catch {
    return null;
  }
}

/**
 * Read a continue token from URL search / hash.
 * Accepts `?continue=`, `?c=`, `#continue=`, `#c=`.
 */
export function resolveContinueToken(search?: string, hash?: string): string | undefined {
  const tryParams = (raw: string | undefined, stripHash: boolean): string | undefined => {
    if (!raw) return undefined;
    const q = stripHash ? raw.replace(/^#/, '') : raw.replace(/^\?/, '');
    if (!q) return undefined;
    // Support bare `#c=TOKEN` and `?c=TOKEN`
    const params = new URLSearchParams(q.includes('=') ? q : '');
    const fromKnown = (params.get('continue') ?? params.get('c') ?? '').trim();
    if (fromKnown) return fromKnown || undefined;
    // Also accept `#continue=TOKEN` where the whole hash is key=value
    if (stripHash && q.startsWith('continue=')) {
      return decodeURIComponent(q.slice('continue='.length)).trim() || undefined;
    }
    if (stripHash && q.startsWith('c=')) {
      return decodeURIComponent(q.slice(2)).trim() || undefined;
    }
    return undefined;
  };

  let searchStr = search;
  let hashStr = hash;
  if (searchStr === undefined && typeof window !== 'undefined') {
    searchStr = window.location.search;
  }
  if (hashStr === undefined && typeof window !== 'undefined') {
    hashStr = window.location.hash;
  }

  return tryParams(searchStr, false) ?? tryParams(hashStr, true);
}

/** Build a shareable absolute URL with `?continue=` (clears prior at/label/c). */
export function buildContinueHref(token: string, baseHref?: string): string {
  const href =
    baseHref ??
    (typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  const url = new URL(href);
  url.searchParams.delete('c');
  url.searchParams.delete('at');
  url.searchParams.delete('label');
  url.searchParams.set('continue', token);
  if (url.hash.startsWith('#continue=') || url.hash.startsWith('#c=')) {
    url.hash = '';
  }
  return url.toString();
}
