import type { Snapshot } from './state.js';

export interface SaveSlot {
  readonly id: string;
  readonly name: string;
  readonly timestamp: number;
  readonly snapshot: Snapshot;
  readonly previewText?: string;
  readonly screenshotUrl?: string;
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

  public async saveSlot(slotId: string, snapshot: Snapshot, previewText?: string): Promise<SaveSlot> {
    const slot: SaveSlot = {
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

  public async loadSlot(slotId: string): Promise<SaveSlot | null> {
    const key = `${this.storagePrefix}${slotId}`;
    const raw = await this.storage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SaveSlot;
    } catch {
      return null;
    }
  }

  public async deleteSlot(slotId: string): Promise<void> {
    const key = `${this.storagePrefix}${slotId}`;
    await this.storage.removeItem(key);
  }
}
