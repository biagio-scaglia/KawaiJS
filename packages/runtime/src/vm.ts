import type { Instruction, StoryPackage } from '@kawaijs/ast';
import { cloneState, createInitialState, type Snapshot, type StoryState } from './state.js';
import { HistoryManager } from './history.js';
import { computeStoryHash, SaveManager, type SaveSlot, type LoadResult } from './save.js';
import { applySetOperation, evaluateCondition, interpolateVariables, isSafeKey } from './evaluator.js';

export interface AudioEvent {
  readonly action: 'play' | 'stop';
  readonly channel: 'music' | 'sound' | 'voice';
  readonly track?: string;
  readonly fade?: number;
  readonly loop?: boolean;
}

export interface CameraEvent {
  readonly action: 'shake' | 'vpunch' | 'hpunch' | 'flash';
  readonly duration?: number;
}

export type StateChangeListener = (state: StoryState) => void;
export type AudioEventListener = (event: AudioEvent) => void;
export type CameraEventListener = (event: CameraEvent) => void;
export type TickListener = (deltaMs: number, totalTimeMs: number) => void;
export type ErrorListener = (error: Error) => void;

export interface VMOptions {
  readonly saveManager?: SaveManager;
  readonly maxSnapshots?: number;
  readonly maxCallDepth?: number;
  /** Hard cap on instructions executed in a single burst (prevents infinite jump loops). */
  readonly maxInstructionsPerBurst?: number;
}

export class StoryVM {
  public readonly storyHash: string;
  private readonly story: StoryPackage;
  private state: StoryState;
  private snapshotStack: Snapshot[] = [];
  private readonly historyManager: HistoryManager;
  private readonly saveManager: SaveManager;
  private readonly maxSnapshots: number;
  private readonly maxCallDepth: number;
  private readonly maxInstructionsPerBurst: number;

  private stateChangeListeners = new Set<StateChangeListener>();
  private audioEventListeners = new Set<AudioEventListener>();
  private cameraEventListeners = new Set<CameraEventListener>();
  private errorListeners = new Set<ErrorListener>();
  private tickListeners = new Set<TickListener>();

  private executionTrace: string[] = [];
  private virtualTimeMs = 0;
  private isExecuting = false;

  constructor(story: StoryPackage, saveManagerOrOptions?: SaveManager | VMOptions) {
    this.story = story;
    this.storyHash = computeStoryHash(story);
    const startLabel = story.meta?.startLabel ?? 'start';
    this.state = createInitialState(startLabel);
    this.historyManager = new HistoryManager();

    let sm: SaveManager | undefined;
    let maxSnaps = 250;
    let maxDepth = 100;
    let maxBurst = 10_000;

    if (saveManagerOrOptions instanceof SaveManager) {
      sm = saveManagerOrOptions;
    } else if (saveManagerOrOptions) {
      sm = saveManagerOrOptions.saveManager;
      if (typeof saveManagerOrOptions.maxSnapshots === 'number') {
        maxSnaps = saveManagerOrOptions.maxSnapshots;
      }
      if (typeof saveManagerOrOptions.maxCallDepth === 'number') {
        maxDepth = saveManagerOrOptions.maxCallDepth;
      }
      if (typeof saveManagerOrOptions.maxInstructionsPerBurst === 'number') {
        maxBurst = saveManagerOrOptions.maxInstructionsPerBurst;
      }
    }

    this.saveManager = sm ?? new SaveManager();
    this.maxSnapshots = Math.max(1, maxSnaps);
    this.maxCallDepth = Math.max(1, maxDepth);
    this.maxInstructionsPerBurst = Math.max(1, maxBurst);
  }

  public getState(): StoryState {
    return this.state;
  }

  public getStory(): StoryPackage {
    return this.story;
  }

  public getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  public getSaveManager(): SaveManager {
    return this.saveManager;
  }

  public getExecutionTrace(): readonly string[] {
    return [...this.executionTrace];
  }

  public clearExecutionTrace(): void {
    this.executionTrace = [];
  }

  private recordTrace(entry: string): void {
    this.executionTrace.push(entry);
  }

  public getVirtualTime(): number {
    return this.virtualTimeMs;
  }

  public tick(deltaMs: number): void {
    if (deltaMs <= 0) return;
    this.virtualTimeMs += deltaMs;
    for (const listener of this.tickListeners) {
      listener(deltaMs, this.virtualTimeMs);
    }
  }

  public onTick(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  public onStateChange(listener: StateChangeListener): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  public onAudioEvent(listener: AudioEventListener): () => void {
    this.audioEventListeners.add(listener);
    return () => this.audioEventListeners.delete(listener);
  }

  public onCameraEvent(listener: CameraEventListener): () => void {
    this.cameraEventListeners.add(listener);
    return () => this.cameraEventListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private emitCameraEvent(event: CameraEvent): void {
    for (const listener of this.cameraEventListeners) {
      listener(event);
    }
  }

  private emitError(error: Error): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch {}
    }
  }

  public start(): void {
    if (this.isExecuting) {
      throw new Error('Cannot call start() while the story VM is already executing instructions.');
    }

    const startLabel = this.story.meta?.startLabel ?? 'start';
    if (!this.story.labels[startLabel]) {
      throw new Error(`Cannot start story: Start label '${startLabel}' not found in story package.`);
    }

    const prevMusic = this.state.audio.music;
    this.recordTrace(`START ${startLabel}`);
    this.state = createInitialState(startLabel);
    this.snapshotStack = [];
    this.virtualTimeMs = 0;
    this.historyManager.clear();
    this.resyncAudio(prevMusic);
    this.executeUntilWaiting();
  }

  /**
   * Advances the story to the next dialogue, choice, or scene event.
   */
  public next(): void {
    if (this.state.isFinished || this.isExecuting) return;

    if (this.state.choices && this.state.choices.length > 0) {
      // Must make a choice; cannot advance automatically
      return;
    }

    this.state = {
      ...this.state,
      isWaitingForInput: false,
      pendingPauseMs: null
    };

    this.executeUntilWaiting();
  }

  /**
   * Selects an option from the current choice menu.
   */
  public choose(choiceIndex: number): void {
    if (this.isExecuting || !this.state.choices || !this.state.choices[choiceIndex]) {
      return;
    }

    const choice = this.state.choices[choiceIndex]!;
    this.recordTrace(`CHOOSE ${choiceIndex} (${choice.text}) -> ${choice.targetLabel}`);

    if (!this.story.labels[choice.targetLabel]) {
      const err = new Error(`Runtime Error: Choice target label '${choice.targetLabel}' is not defined in story.`);
      this.emitError(err);
      this.state = {
        ...this.state,
        choices: null,
        pendingPauseMs: null,
        isFinished: true,
        isWaitingForInput: false
      };
      this.notifyStateChanged();
      return;
    }

    this.state = {
      ...this.state,
      choices: null,
      isWaitingForInput: false,
      pendingPauseMs: null,
      currentLabel: choice.targetLabel,
      instructionPointer: 0
    };

    this.executeUntilWaiting();
  }

  /**
   * Jumps directly to a label.
   */
  public jump(labelName: string): void {
    if (this.isExecuting) {
      throw new Error('Cannot call jump() while the story VM is already executing instructions.');
    }
    if (!this.story.labels[labelName]) {
      throw new Error(`Target label '${labelName}' not found in story package.`);
    }

    this.recordTrace(`JUMP_MANUAL ${labelName}`);
    this.state = {
      ...this.state,
      currentLabel: labelName,
      instructionPointer: 0,
      choices: null,
      pendingPauseMs: null,
      isWaitingForInput: false
    };

    this.executeUntilWaiting();
  }

  /**
   * Rolls back the story state to the previous snapshot.
   */
  public rollback(): boolean {
    if (this.snapshotStack.length <= 1) {
      return false;
    }

    const prevMusic = this.state.audio.music;

    // Pop current snapshot
    this.snapshotStack.pop();
    // Restore previous snapshot
    const prev = this.snapshotStack[this.snapshotStack.length - 1];
    if (prev) {
      this.state = cloneState(prev.state);
      const histLen =
        typeof prev.historyLength === 'number' ? prev.historyLength : this.historyManager.getLength();
      this.historyManager.trimTo(histLen);
      this.recordTrace(`ROLLBACK`);
      this.resyncAudio(prevMusic);
      this.notifyStateChanged();
      return true;
    }

    return false;
  }

  public canRollback(): boolean {
    return this.snapshotStack.length > 1;
  }

  public async save(slotId: string): Promise<SaveSlot> {
    const currentSnapshot = this.captureSnapshot();
    const previewText = this.state.dialogue?.text ?? 'Game in progress';
    this.recordTrace(`SAVE slot_${slotId}`);
    return await this.saveManager.saveSlot(
      slotId,
      currentSnapshot,
      previewText,
      this.storyHash,
      this.historyManager.getEntries()
    );
  }

  public async load(slotId: string, validateStoryHash = true): Promise<boolean> {
    const res = await this.loadWithDetails(slotId, validateStoryHash);
    return res.success;
  }

  public async loadWithDetails(slotId: string, validateStoryHash = true): Promise<LoadResult> {
    const res = await this.saveManager.loadSlot(slotId, validateStoryHash ? this.storyHash : undefined);
    if (!res.success || !res.slot) {
      return res;
    }

    const prevMusic = this.state.audio.music;
    this.state = cloneState(res.slot.snapshot.state);
    const restoredHistory = res.slot.historyEntries ?? [];
    this.historyManager.replaceAll(restoredHistory);
    const snap: Snapshot = {
      ...res.slot.snapshot,
      historyLength:
        typeof res.slot.snapshot.historyLength === 'number'
          ? res.slot.snapshot.historyLength
          : restoredHistory.length
    };
    this.snapshotStack = [snap];
    this.recordTrace(`LOAD slot_${slotId}`);
    this.resyncAudio(prevMusic);
    this.notifyStateChanged();
    return res;
  }

  /**
   * Emit stop/play audio events so the presentation layer matches restored state
   * after load or rollback (snapshots store track ids but not live Audio elements).
   */
  private resyncAudio(previousMusic: string | null): void {
    this.emitAudioEvent({ action: 'stop', channel: 'voice' });
    this.emitAudioEvent({ action: 'stop', channel: 'sound' });

    const nextMusic = this.state.audio.music;
    if (previousMusic === nextMusic) {
      return;
    }

    if (nextMusic) {
      this.emitAudioEvent({
        action: 'play',
        channel: 'music',
        track: nextMusic,
        loop: true
      });
    } else {
      this.emitAudioEvent({ action: 'stop', channel: 'music' });
    }
  }

  private executeUntilWaiting(): void {
    if (this.isExecuting) return;
    this.isExecuting = true;

    try {
      let instructionsExecuted = 0;
      while (!this.state.isWaitingForInput && !this.state.isFinished) {
        if (instructionsExecuted >= this.maxInstructionsPerBurst) {
          const err = new Error(
            `Runtime Error: Exceeded maximum of ${this.maxInstructionsPerBurst} instructions without waiting for input (possible infinite loop at label '${this.state.currentLabel}').`
          );
          this.emitError(err);
          this.state = {
            ...this.state,
            isFinished: true,
            isWaitingForInput: false
          };
          break;
        }

        const labelInstructions = this.story.labels[this.state.currentLabel];
        if (!labelInstructions || this.state.instructionPointer >= labelInstructions.length) {
          // Handle end of label: check call stack
          if (this.state.callStack.length > 0) {
            const topFrame = this.state.callStack[this.state.callStack.length - 1]!;
            this.recordTrace(`RETURN -> ${topFrame.returnLabel}:${topFrame.returnPointer}`);
            this.state = {
              ...this.state,
              currentLabel: topFrame.returnLabel,
              instructionPointer: topFrame.returnPointer,
              callStack: this.state.callStack.slice(0, -1)
            };
            continue;
          }

          // Story finished
          this.recordTrace('END');
          this.state = {
            ...this.state,
            isFinished: true,
            isWaitingForInput: false
          };
          break;
        }

        const inst = labelInstructions[this.state.instructionPointer]!;
        this.state = {
          ...this.state,
          instructionPointer: this.state.instructionPointer + 1
        };

        this.executeInstruction(inst);
        instructionsExecuted++;
      }

      if (this.state.isWaitingForInput) {
        this.recordSnapshot();
      }
    } finally {
      this.isExecuting = false;
    }

    this.notifyStateChanged();
  }

  private executeInstruction(inst: Instruction): void {
    switch (inst.type) {
      case 'scene': {
        this.recordTrace(`SCENE ${inst.background}${inst.transition ? ` [${inst.transition}]` : ''}`);
        this.state = {
          ...this.state,
          visual: {
            background: inst.background,
            transition: inst.transition ?? null,
            characters: {}, // Clear characters on new scene
            vfx: null,
            activeCG: null
          }
        };
        break;
      }

      case 'show': {
        this.recordTrace(`SHOW ${inst.character}${inst.expression ? ` ${inst.expression}` : ''}${inst.position ? ` at ${inst.position}` : ''}`);
        const charDef = this.state.visual.characters[inst.character] ?? {};
        this.state = {
          ...this.state,
          visual: {
            ...this.state.visual,
            characters: {
              ...this.state.visual.characters,
              [inst.character]: {
                expression: inst.expression ?? charDef.expression,
                position: inst.position ?? charDef.position ?? 'center',
                transition: inst.transition ?? charDef.transition
              }
            }
          }
        };
        break;
      }

      case 'hide': {
        this.recordTrace(`HIDE ${inst.character}`);
        const nextChars = { ...this.state.visual.characters };
        delete nextChars[inst.character];
        this.state = {
          ...this.state,
          visual: {
            ...this.state.visual,
            characters: nextChars
          }
        };
        break;
      }

      case 'dialogue': {
        const charDef = inst.speaker ? this.story.characters[inst.speaker] : undefined;
        const displayName = charDef?.name ?? inst.speaker;
        const color = charDef?.color;
        const interpolatedText = interpolateVariables(inst.text, this.state.variables);
        this.recordTrace(`DIALOGUE ${displayName ? `[${displayName}] ` : ''}${interpolatedText}`);

        this.state = {
          ...this.state,
          dialogue: {
            speaker: inst.speaker,
            speakerDisplayName: displayName,
            speakerColor: color,
            text: interpolatedText
          },
          pendingPauseMs: null,
          isWaitingForInput: true
        };

        this.historyManager.addEntry(inst.speaker, displayName, interpolatedText);
        break;
      }

      case 'choice': {
        const availableChoices = inst.choices
          .filter(choice => {
            if (!choice.condition) return true;
            return evaluateCondition(choice.condition, this.state.variables);
          })
          .map(choice => ({
            ...choice,
            text: interpolateVariables(choice.text, this.state.variables)
          }));

        this.recordTrace(`CHOICES [${availableChoices.map(c => c.text).join(', ')}]`);

        if (availableChoices.length === 0) {
          // No visible choices — jump to menu fallthrough rather than soft-locking.
          const fallback = (inst as { readonly fallbackLabel?: string }).fallbackLabel;
          const err = new Error('Runtime Warning: Choice menu evaluated to zero available options; continuing.');
          this.emitError(err);
          if (fallback && this.story.labels[fallback]) {
            this.state = {
              ...this.state,
              choices: null,
              pendingPauseMs: null,
              isWaitingForInput: false,
              currentLabel: fallback,
              instructionPointer: 0
            };
          } else {
            this.state = {
              ...this.state,
              choices: null,
              pendingPauseMs: null,
              isWaitingForInput: false
            };
          }
          break;
        }

        this.state = {
          ...this.state,
          choices: availableChoices,
          pendingPauseMs: null,
          isWaitingForInput: true
        };
        break;
      }

      case 'vfx': {
        this.recordTrace(`VFX ${inst.effect}${inst.intensity !== undefined ? ` ${inst.intensity}` : ''}${inst.color ? ` ${inst.color}` : ''}`);
        if (inst.effect === 'stop') {
          this.state = {
            ...this.state,
            visual: {
              ...this.state.visual,
              vfx: null
            }
          };
          break;
        }

        const prev = this.state.visual.vfx;
        // Tint is an overlay: keep rain/sakura/snow/fog particles running underneath.
        if (inst.effect === 'tint') {
          const baseEffect =
            prev && prev.effect !== 'tint' && prev.effect !== 'stop' ? prev.effect : 'tint';
          this.state = {
            ...this.state,
            visual: {
              ...this.state.visual,
              vfx: {
                effect: baseEffect,
                intensity: prev?.intensity,
                color: inst.color ?? (typeof inst.intensity === 'string' ? inst.intensity : undefined)
              }
            }
          };
          break;
        }

        this.state = {
          ...this.state,
          visual: {
            ...this.state.visual,
            vfx: {
              effect: inst.effect,
              intensity: inst.intensity,
              // Preserve active tint color when switching weather effects
              color: prev?.color
            }
          }
        };
        break;
      }

      case 'camera': {
        this.recordTrace(`CAMERA ${inst.action}${inst.duration !== undefined ? ` ${inst.duration}` : ''}`);
        this.emitCameraEvent({
          action: inst.action,
          duration: inst.duration
        });
        break;
      }

      case 'pause': {
        this.recordTrace(`PAUSE${inst.duration !== undefined ? ` ${inst.duration}` : ''}`);
        // Duration is treated as milliseconds (matches README / parser examples like `pause 1200`).
        this.state = {
          ...this.state,
          pendingPauseMs: inst.duration !== undefined && inst.duration > 0 ? inst.duration : null,
          isWaitingForInput: true
        };
        break;
      }

      case 'cg': {
        const unlockKey = inst.unlockId || inst.image;
        this.recordTrace(`CG ${inst.image}`);
        const nextUnlocked = Object.assign(Object.create(null), this.state.unlockedCGs);
        nextUnlocked[unlockKey] = true;
        this.state = {
          ...this.state,
          visual: {
            ...this.state.visual,
            activeCG: inst.image
          },
          unlockedCGs: nextUnlocked
        };
        break;
      }

      case 'jump': {
        const target = inst.targetLabel;
        this.recordTrace(`JUMP ${target}`);
        if (!this.story.labels[target]) {
          const err = new Error(`Runtime Error: Jump target label '${target}' is not defined in story.`);
          this.emitError(err);
          this.state = {
            ...this.state,
            isFinished: true,
            isWaitingForInput: false
          };
          break;
        }
        this.state = {
          ...this.state,
          currentLabel: target,
          instructionPointer: 0
        };
        break;
      }

      case 'call': {
        const target = (inst as { readonly targetLabel: string }).targetLabel;
        this.recordTrace(`CALL ${target}`);
        if (this.state.callStack.length >= this.maxCallDepth) {
          const err = new Error(`Runtime Error: Maximum call stack depth of ${this.maxCallDepth} exceeded.`);
          this.emitError(err);
          this.state = {
            ...this.state,
            isFinished: true,
            isWaitingForInput: false
          };
          break;
        }
        if (!this.story.labels[target]) {
          const err = new Error(`Runtime Error: Call target label '${target}' is not defined in story.`);
          this.emitError(err);
          this.state = {
            ...this.state,
            isFinished: true,
            isWaitingForInput: false
          };
          break;
        }
        this.state = {
          ...this.state,
          callStack: [
            ...this.state.callStack,
            {
              returnLabel: this.state.currentLabel,
              returnPointer: this.state.instructionPointer
            }
          ],
          currentLabel: target,
          instructionPointer: 0
        };
        break;
      }

      case 'set': {
        const currentVal = this.state.variables[inst.variable];
        const nextVal = applySetOperation(currentVal, inst.operator, inst.value, this.state.variables, inst.isVariable);
        this.recordTrace(`SET ${inst.variable} ${inst.operator ?? '='} ${String(nextVal)}`);
        const nextVars = Object.assign(Object.create(null), this.state.variables);
        if (isSafeKey(inst.variable)) {
          nextVars[inst.variable] = nextVal;
        }
        this.state = {
          ...this.state,
          variables: nextVars
        };
        break;
      }

      case 'branch': {
        const conditionVal = evaluateCondition(inst.condition, this.state.variables);
        const targetLabel = conditionVal ? inst.thenLabel : (inst.elseLabel ?? inst.thenLabel);
        this.recordTrace(`BRANCH ${inst.condition} (${conditionVal}) -> ${targetLabel}`);
        if (!this.story.labels[targetLabel]) {
          const err = new Error(`Runtime Error: Branch target label '${targetLabel}' is not defined in story.`);
          this.emitError(err);
          this.state = {
            ...this.state,
            isFinished: true,
            isWaitingForInput: false
          };
          break;
        }
        this.state = {
          ...this.state,
          currentLabel: targetLabel,
          instructionPointer: 0
        };
        break;
      }

      case 'play_audio': {
        this.recordTrace(`PLAY_AUDIO ${inst.channel}:${inst.track}`);
        this.emitAudioEvent({
          action: 'play',
          channel: inst.channel,
          track: inst.track,
          fade: inst.fade,
          loop: inst.loop
        });
        if (inst.channel === 'music') {
          this.state = {
            ...this.state,
            audio: {
              ...this.state.audio,
              music: inst.track
            }
          };
        }
        break;
      }

      case 'stop_audio': {
        this.recordTrace(`STOP_AUDIO ${inst.channel}`);
        this.emitAudioEvent({
          action: 'stop',
          channel: inst.channel,
          fade: inst.fade
        });
        if (inst.channel === 'music') {
          this.state = {
            ...this.state,
            audio: {
              ...this.state.audio,
              music: null
            }
          };
        }
        break;
      }

      case 'return': {
        if (this.state.callStack.length > 0) {
          const topFrame = this.state.callStack[this.state.callStack.length - 1]!;
          this.recordTrace(`RETURN -> ${topFrame.returnLabel}:${topFrame.returnPointer}`);
          this.state = {
            ...this.state,
            currentLabel: topFrame.returnLabel,
            instructionPointer: topFrame.returnPointer,
            callStack: this.state.callStack.slice(0, -1)
          };
        } else {
          this.recordTrace('END');
          this.state = {
            ...this.state,
            isFinished: true,
            isWaitingForInput: false
          };
        }
        break;
      }
    }
  }

  private captureSnapshot(): Snapshot {
    return {
      id: `snap_${Date.now()}_${this.snapshotStack.length}`,
      timestamp: Date.now(),
      state: cloneState(this.state),
      historyLength: this.historyManager.getLength()
    };
  }

  private recordSnapshot(): void {
    const snap = this.captureSnapshot();
    this.snapshotStack.push(snap);
    if (this.snapshotStack.length > this.maxSnapshots) {
      this.snapshotStack.shift();
    }
  }

  private notifyStateChanged(): void {
    const currentState = this.getState();
    for (const listener of this.stateChangeListeners) {
      listener(currentState);
    }
  }

  private emitAudioEvent(event: AudioEvent): void {
    for (const listener of this.audioEventListeners) {
      listener(event);
    }
  }
}
