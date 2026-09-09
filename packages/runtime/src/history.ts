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

  public clear(): void {
    this.entries = [];
  }
}
