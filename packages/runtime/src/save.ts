import type { StoryPackage } from '@kawaijs/ast';
import type { Snapshot } from './state.js';

export const CURRENT_SAVE_SCHEMA_VERSION = 1;

export interface SaveSlot {
  readonly schemaVersion?: number;
  readonly storyHash?: string;
  readonly id: string;
  readonly name: string;
  readonly timestamp: number;
  readonly snapshot: Snapshot;
  readonly previewText?: string;
  readonly screenshotUrl?: string;
}

export type LoadFailureReason = 'not_found' | 'corrupt' | 'incompatible_schema' | 'incompatible_story';

export interface LoadResult {
  readonly success: boolean;
  readonly slot?: SaveSlot;
  readonly reason?: LoadFailureReason;
}

export function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeStoryHash(story: StoryPackage): string {
  const sortedLabels = Object.keys(story.labels ?? {}).sort();
  const parts: string[] = [];
  parts.push(`start:${story.meta?.startLabel ?? 'start'}`);
  for (const label of sortedLabels) {
    parts.push(`label:${label}`);
    const instructions = story.labels[label] ?? [];
    for (const inst of instructions) {
      const { loc: _, ...rest } = inst as { loc?: unknown; [key: string]: unknown };
      parts.push(JSON.stringify(rest));
    }
  }
  return fnv1a(parts.join('\n'));
}

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  public getItem(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }

  public setItem(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  }

  public removeItem(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  }
}

export class SaveManager {
  private readonly storage: StorageAdapter;
  private readonly storagePrefix: string;

  constructor(storage?: StorageAdapter, storagePrefix = 'kawaijs_save_') {
    this.storage = storage ?? (typeof localStorage !== 'undefined' ? new LocalStorageAdapter() : new MemoryStorageAdapter());
    this.storagePrefix = storagePrefix;
  }

  public async saveSlot(
    slotId: string,
    snapshot: Snapshot,
    previewText?: string,
    storyHash = ''
  ): Promise<SaveSlot> {
    const slot: SaveSlot = {
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      storyHash,
      id: slotId,
      name: `Slot ${slotId}`,
      timestamp: Date.now(),
      snapshot,
      previewText
    };

    const key = `${this.storagePrefix}${slotId}`;
    await this.storage.setItem(key, JSON.stringify(slot));
    return slot;
  }

  public async loadSlot(slotId: string, expectedStoryHash?: string): Promise<LoadResult> {
    const key = `${this.storagePrefix}${slotId}`;
    const raw = await this.storage.getItem(key);
    if (!raw) return { success: false, reason: 'not_found' };

    try {
      const slot = JSON.parse(raw) as SaveSlot;
      if (!slot || typeof slot !== 'object' || !slot.snapshot) {
        return { success: false, reason: 'corrupt' };
      }
      if (slot.schemaVersion !== undefined && slot.schemaVersion > CURRENT_SAVE_SCHEMA_VERSION) {
        return { success: false, reason: 'incompatible_schema', slot };
      }
      if (expectedStoryHash && slot.storyHash && slot.storyHash !== expectedStoryHash) {
        return { success: false, reason: 'incompatible_story', slot };
      }
      return { success: true, slot };
    } catch {
      return { success: false, reason: 'corrupt' };
    }
  }

  public async deleteSlot(slotId: string): Promise<void> {
    const key = `${this.storagePrefix}${slotId}`;
    await this.storage.removeItem(key);
  }

  public async listSlots(totalSlots = 6, expectedStoryHash?: string): Promise<(SaveSlot | null)[]> {
    const slots: (SaveSlot | null)[] = [];
    for (let i = 1; i <= totalSlots; i++) {
      const res = await this.loadSlot(String(i), expectedStoryHash);
      slots.push(res.success && res.slot ? res.slot : null);
    }
    return slots;
  }
}
