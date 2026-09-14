export interface DialogueHistoryEntry {
  readonly id: string;
  readonly speaker?: string;
  readonly speakerDisplayName?: string;
  readonly text: string;
  readonly timestamp: number;
}

export class HistoryManager {
  private entries: DialogueHistoryEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries;
  }

  public addEntry(speaker: string | undefined, speakerDisplayName: string | undefined, text: string): DialogueHistoryEntry {
    const entry: DialogueHistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      speaker,
      speakerDisplayName,
      text,
      timestamp: Date.now()
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    return entry;
  }

  public getEntries(): readonly DialogueHistoryEntry[] {
    return this.entries;
  }

  public getLength(): number {
    return this.entries.length;
  }

  /** Keep only the first `count` entries (used on rollback). */
  public trimTo(count: number): void {
    const n = Math.max(0, Math.min(count, this.entries.length));
    if (n < this.entries.length) {
      this.entries = this.entries.slice(0, n);
    }
  }

  /** Replace backlog (used on load / save restore). */
  public replaceAll(entries: readonly DialogueHistoryEntry[]): void {
    this.entries = entries.slice(-this.maxEntries).map((e) => ({ ...e }));
  }

  public clear(): void {
    this.entries = [];
  }
}
