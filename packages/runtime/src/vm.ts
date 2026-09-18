import type { Instruction, StoryPackage } from '@kawaijs/ast';
import { cloneState, createInitialState, type AchievementState, type Snapshot, type StoryState } from './state.js';
import { HistoryManager } from './history.js';
import { computeStoryHash, SaveManager, type SaveSlot, type LoadResult } from './save.js';
import { applySetOperation, evaluateCondition, interpolateVariables, isSafeKey, resolveSpriteZ } from './evaluator.js';

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
  /** Initial variable values seeded into the story state. */
  readonly initialVariables?: Record<string, unknown>;
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
  private readonly initialVariables?: Record<string, unknown>;

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
      if (saveManagerOrOptions.initialVariables) {
        this.initialVariables = { ...saveManagerOrOptions.initialVariables };
      }
    }

    this.applyInitialVariables();
    this.saveManager = sm ?? new SaveManager();
    this.maxSnapshots = Math.max(1, maxSnaps);
    this.maxCallDepth = Math.max(1, maxDepth);
    this.maxInstructionsPerBurst = Math.max(1, maxBurst);
  }

  private applyInitialVariables(): void {
    if (this.initialVariables) {
      for (const [key, value] of Object.entries(this.initialVariables)) {
        if (isSafeKey(key)) {
          this.state.variables[key] = value;
        }
      }
    }
  }

  public getState(): StoryState {
    // Return a deep clone so host/UI mutations cannot corrupt internal VM state.
    return cloneState(this.state);
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

  public start(atLabel?: string): void {
    if (this.isExecuting) {
      throw new Error('Cannot call start() while the story VM is already executing instructions.');
    }

    const startLabel = atLabel ?? this.story.meta?.startLabel ?? 'start';
    if (!this.story.labels[startLabel]) {
      throw new Error(`Cannot start story: Start label '${startLabel}' not found in story package.`);
    }

    const prevMusic = this.state.audio.music;
    this.executionTrace = [];
    this.recordTrace(`START ${startLabel}`);
    this.state = createInitialState(startLabel);
    this.applyInitialVariables();
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

    if (this.state.hotspots && this.state.hotspots.length > 0) {
      // Must click a hotspot; stage click must not skip.
      return;
    }

    if (this.state.pendingInput) {
      // Must call submitInput(); clicking the stage must not skip the prompt.
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
   * Completes a pending `input` prompt and continues the story.
   */
  public submitInput(value: string): void {
    if (this.isExecuting || !this.state.pendingInput) return;

    const variable = this.state.pendingInput.variable;
    const trimmed = String(value ?? '').trim();
    this.recordTrace(`INPUT ${variable}="${trimmed}"`);

    const nextVars = { ...this.state.variables };
    if (isSafeKey(variable)) {
      nextVars[variable] = trimmed;
    }

    this.state = {
      ...this.state,
      variables: nextVars,
      pendingInput: null,
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
        hotspots: null,
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
      hotspots: null,
      isWaitingForInput: false,
      pendingPauseMs: null,
      currentLabel: choice.targetLabel,
      instructionPointer: 0
    };

    this.executeUntilWaiting();
  }

  /**
   * Selects a clickable hotspot and jumps to its target label.
   */
  public selectHotspot(id: string): void {
    if (this.isExecuting || !this.state.hotspots || this.state.hotspots.length === 0) {
      return;
    }

    const hotspot = this.state.hotspots.find((h) => h.id === id);
    if (!hotspot) return;

    this.recordTrace(`HOTSPOT ${id} -> ${hotspot.targetLabel}`);

    if (!this.story.labels[hotspot.targetLabel]) {
      const err = new Error(
        `Runtime Error: Hotspot target label '${hotspot.targetLabel}' is not defined in story.`
      );
      this.emitError(err);
      this.state = {
        ...this.state,
        hotspots: null,
        pendingPauseMs: null,
        isFinished: true,
        isWaitingForInput: false
      };
      this.notifyStateChanged();
      return;
    }

    this.state = {
      ...this.state,
      hotspots: null,
      choices: null,
      isWaitingForInput: false,
      pendingPauseMs: null,
      windowVisible: true,
      currentLabel: hotspot.targetLabel,
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
      hotspots: null,
      pendingInput: null,
      pendingPauseMs: null,
      isWaitingForInput: false,
      isFinished: false
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
    this.applyLoadedSlot(res.slot, `LOAD slot_${slotId}`);
    return res;
  }

  /**
   * Restore from an in-memory SaveSlot (continue-links, imported saves).
   * Validates storyHash when present on the slot.
   */
  public loadFromSlot(slot: SaveSlot, validateStoryHash = true): LoadResult {
    if (validateStoryHash && slot.storyHash && slot.storyHash !== this.storyHash) {
      return { success: false, reason: 'incompatible_story', slot };
    }
    this.applyLoadedSlot(slot, `LOAD continue_${slot.id}`);
    return { success: true, slot };
  }

  private applyLoadedSlot(slot: SaveSlot, traceLabel: string): void {
    const prevMusic = this.state.audio.music;
    this.state = cloneState(slot.snapshot.state);
    const restoredHistory = slot.historyEntries ?? [];
    this.historyManager.replaceAll(restoredHistory);
    const snap: Snapshot = {
      ...slot.snapshot,
      historyLength:
        typeof slot.snapshot.historyLength === 'number'
          ? Math.min(slot.snapshot.historyLength, restoredHistory.length)
          : restoredHistory.length
    };
    this.snapshotStack = [snap];
    this.virtualTimeMs = 0;
    this.recordTrace(traceLabel);
    this.resyncAudio(prevMusic);
    this.notifyStateChanged();
  }

  /**
   * Emit stop/play audio events so the presentation layer matches restored state
   * after load or rollback (snapshots store track ids but not live Audio elements).
   */
  private resyncAudio(previousMusic: string | null): void {
    this.emitAudioEvent({ action: 'stop', channel: 'voice' });
    this.emitAudioEvent({ action: 'stop', channel: 'sound' });

    const nextMusic = this.state.audio.music;
    if (previousMusic !== nextMusic) {
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

    // Voice is always stopped above; replay from restored state when present.
    const nextVoice = this.state.audio.voice;
    if (nextVoice) {
      this.emitAudioEvent({
        action: 'play',
        channel: 'voice',
        track: nextVoice
      });
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
            activeCG: null,
            defaultLayer: this.state.visual.defaultLayer
          },
          hotspots: null
        };
        break;
      }

      case 'show': {
        this.recordTrace(`SHOW ${inst.character}${inst.expression ? ` ${inst.expression}` : ''}${inst.position ? ` at ${inst.position}` : ''}`);
        const charDef = this.state.visual.characters[inst.character] ?? {};
        const layer = inst.layer ?? charDef.layer ?? this.state.visual.defaultLayer ?? undefined;
        const z = resolveSpriteZ(layer, inst.z ?? charDef.z);
        this.state = {
          ...this.state,
          visual: {
            ...this.state.visual,
            characters: {
              ...this.state.visual.characters,
              [inst.character]: {
                expression: inst.expression ?? charDef.expression,
                position: inst.position ?? charDef.position ?? 'center',
                transition: inst.transition ?? charDef.transition,
                layer,
                z,
                cssAnimation: charDef.cssAnimation
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
        const interpolatedText = interpolateVariables(inst.text, this.state.variables, {
          lang: this.state.lang,
          i18n: this.story.i18n
        });
        this.recordTrace(`DIALOGUE ${displayName ? `[${displayName}] ` : ''}${interpolatedText}`);

        this.state = {
          ...this.state,
          dialogue: {
            speaker: inst.speaker,
            speakerDisplayName: displayName,
            speakerColor: color,
            text: interpolatedText
          },
          hotspots: null,
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
            text: interpolateVariables(choice.text, this.state.variables, {
              lang: this.state.lang,
              i18n: this.story.i18n
            })
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
          hotspots: null,
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
        } else if (inst.channel === 'voice') {
          this.state = {
            ...this.state,
            audio: {
              ...this.state.audio,
              voice: inst.track
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
        } else if (inst.channel === 'voice') {
          this.state = {
            ...this.state,
            audio: {
              ...this.state.audio,
              voice: null
            }
          };
        }
        break;
      }

      case 'input': {
        const prompt = interpolateVariables(inst.prompt, this.state.variables, {
          lang: this.state.lang,
          i18n: this.story.i18n
        });
        this.recordTrace(`INPUT_WAIT ${inst.variable} "${prompt}"`);
        this.state = {
          ...this.state,
          pendingInput: { variable: inst.variable, prompt },
          choices: null,
          hotspots: null,
          pendingPauseMs: null,
          isWaitingForInput: true
        };
        break;
      }

      case 'window': {
        this.recordTrace(`WINDOW ${inst.action}`);
        this.state = {
          ...this.state,
          windowVisible: inst.action === 'show'
        };
        break;
      }

      case 'theme': {
        const name = sanitizeCssToken(inst.name);
        this.recordTrace(`THEME ${name}`);
        this.state = {
          ...this.state,
          theme: name || null
        };
        break;
      }

      case 'style': {
        const target = sanitizeCssToken(inst.target) || 'root';
        const name = sanitizeCssToken(inst.name) || 'default';
        this.recordTrace(`STYLE ${target}=${name}`);
        this.state = {
          ...this.state,
          styleClasses: {
            ...this.state.styleClasses,
            [target]: name
          }
        };
        break;
      }

      case 'hotspot': {
        const collected = [
          {
            id: inst.id,
            x: inst.x,
            y: inst.y,
            w: inst.w,
            h: inst.h,
            targetLabel: inst.targetLabel
          }
        ];

        const labelInstructions = this.story.labels[this.state.currentLabel] ?? [];
        while (this.state.instructionPointer < labelInstructions.length) {
          const nextInst = labelInstructions[this.state.instructionPointer];
          if (!nextInst || nextInst.type !== 'hotspot') break;
          this.state = {
            ...this.state,
            instructionPointer: this.state.instructionPointer + 1
          };
          collected.push({
            id: nextInst.id,
            x: nextInst.x,
            y: nextInst.y,
            w: nextInst.w,
            h: nextInst.h,
            targetLabel: nextInst.targetLabel
          });
        }

        this.recordTrace(`HOTSPOTS [${collected.map((h) => h.id).join(', ')}]`);
        this.state = {
          ...this.state,
          hotspots: collected,
          choices: null,
          pendingPauseMs: null,
          isWaitingForInput: true
        };
        break;
      }

      case 'layer': {
        const name = sanitizeCssToken(inst.name) || 'master';
        this.recordTrace(`LAYER ${name}`);
        this.state = {
          ...this.state,
          visual: {
            ...this.state.visual,
            defaultLayer: name
          }
        };
        break;
      }

      case 'animate': {
        const existing = this.state.visual.characters[inst.character];
        if (!existing) {
          this.recordTrace(`ANIMATE skipped (missing ${inst.character})`);
          break;
        }
        const animName = sanitizeCssToken(inst.animation) || 'fade-in';
        this.recordTrace(`ANIMATE ${inst.character} ${animName}`);
        this.state = {
          ...this.state,
          visual: {
            ...this.state.visual,
            characters: {
              ...this.state.visual.characters,
              [inst.character]: {
                ...existing,
                cssAnimation: {
                  name: animName,
                  durationMs: inst.durationMs,
                  token: Date.now()
                }
              }
            }
          }
        };
        break;
      }

      case 'unlock': {
        const catalog = this.story.achievements?.find((a) => a.id === inst.id);
        const entry = {
          id: inst.id,
          title: inst.title ?? catalog?.title ?? inst.id,
          description: inst.description ?? catalog?.description,
          unlockedAt: Date.now()
        };
        this.recordTrace(`UNLOCK ${inst.id}`);
        this.state = {
          ...this.state,
          achievements: {
            ...this.state.achievements,
            [inst.id]: entry
          }
        };
        this.persistAchievement(entry);
        break;
      }

      case 'lang': {
        const code = inst.code.trim().toLowerCase() || 'en';
        this.recordTrace(`LANG ${code}`);
        this.state = {
          ...this.state,
          lang: code
        };
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
      const oldest = this.snapshotStack[0];
      if (oldest && typeof oldest.historyLength === 'number') {
        this.historyManager.trimTo(oldest.historyLength);
      }
    }
  }

  private notifyStateChanged(): void {
    const currentState = cloneState(this.state);
    for (const listener of this.stateChangeListeners) {
      listener(currentState);
    }
  }

  private emitAudioEvent(event: AudioEvent): void {
    for (const listener of this.audioEventListeners) {
      listener(event);
    }
  }

  private persistAchievement(entry: AchievementState): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const key = `kawaijs_achievements_${this.storyHash}`;
      const raw = localStorage.getItem(key);
      const map = raw ? (JSON.parse(raw) as Record<string, AchievementState>) : {};
      map[entry.id] = entry;
      localStorage.setItem(key, JSON.stringify(map));
    } catch {
      // ignore quota / private mode
    }
  }

  /** Merge locally persisted achievements into the current state (call after start/load). */
  public hydrateAchievements(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const key = `kawaijs_achievements_${this.storyHash}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const map = JSON.parse(raw) as Record<string, AchievementState>;
      this.state = {
        ...this.state,
        achievements: {
          ...map,
          ...this.state.achievements
        }
      };
      this.notifyStateChanged();
    } catch {
      // ignore
    }
  }

  /** Export achievements as a plain JSON-serializable object (itch / analytics). */
  public exportAchievementsJson(): {
    storyHash: string;
    exportedAt: number;
    achievements: AchievementState[];
  } {
    return {
      storyHash: this.storyHash,
      exportedAt: Date.now(),
      achievements: Object.values(this.state.achievements)
    };
  }

  /** Set active language for `{t:key}` lookups (also used by `?lang=`). */
  public setLang(code: string): void {
    const normalized = code.trim().toLowerCase() || 'en';
    this.state = {
      ...this.state,
      lang: normalized
    };
    this.notifyStateChanged();
  }
}

function sanitizeCssToken(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '');
}
