import type { Instruction, StoryPackage } from '@kawaijs/ast';
import { cloneState, createInitialState, type Snapshot, type StoryState } from './state.js';
import { HistoryManager } from './history.js';
import { SaveManager } from './save.js';
import { applySetOperation, evaluateCondition } from './evaluator.js';

export interface AudioEvent {
  readonly action: 'play' | 'stop';
  readonly channel: 'music' | 'sound' | 'voice';
  readonly track?: string;
  readonly fade?: number;
  readonly loop?: boolean;
}

export type StateChangeListener = (state: StoryState) => void;
export type AudioEventListener = (event: AudioEvent) => void;

export class StoryVM {
  private readonly story: StoryPackage;
  private state: StoryState;
  private snapshotStack: Snapshot[] = [];
  private readonly historyManager: HistoryManager;
  private readonly saveManager: SaveManager;

  private stateChangeListeners = new Set<StateChangeListener>();
  private audioEventListeners = new Set<AudioEventListener>();

  private isExecuting = false;

  constructor(story: StoryPackage, saveManager?: SaveManager) {
    this.story = story;
    const startLabel = story.meta.startLabel ?? 'start';
    this.state = createInitialState(startLabel);
    this.historyManager = new HistoryManager();
    this.saveManager = saveManager ?? new SaveManager();
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

  public onStateChange(listener: StateChangeListener): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  public onAudioEvent(listener: AudioEventListener): () => void {
    this.audioEventListeners.add(listener);
    return () => this.audioEventListeners.delete(listener);
  }

  public start(): void {
    const startLabel = this.story.meta.startLabel ?? 'start';
    if (!this.story.labels[startLabel]) {
      throw new Error(`Cannot start story: Start label '${startLabel}' not found in story package.`);
    }

    this.state = createInitialState(startLabel);
    this.snapshotStack = [];
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
      isWaitingForInput: false
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
    this.state = {
      ...this.state,
      choices: null,
      isWaitingForInput: false,
      currentLabel: choice.targetLabel,
      instructionPointer: 0
    };

    this.executeUntilWaiting();
  }

  /**
   * Jumps directly to a label.
   */
  public jump(labelName: string): void {
    if (!this.story.labels[labelName]) {
      throw new Error(`Target label '${labelName}' not found in story package.`);
    }

    this.state = {
      ...this.state,
      currentLabel: labelName,
      instructionPointer: 0,
      choices: null,
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

    // Pop current snapshot
    this.snapshotStack.pop();
    // Restore previous snapshot
    const prev = this.snapshotStack[this.snapshotStack.length - 1];
    if (prev) {
      this.state = cloneState(prev.state);
      this.notifyStateChanged();
      return true;
    }

    return false;
  }

  public canRollback(): boolean {
    return this.snapshotStack.length > 1;
  }

  public async save(slotId: string): Promise<void> {
    const currentSnapshot = this.captureSnapshot();
    const previewText = this.state.dialogue?.text ?? 'Game in progress';
    await this.saveManager.saveSlot(slotId, currentSnapshot, previewText);
  }

  public async load(slotId: string): Promise<boolean> {
    const slot = await this.saveManager.loadSlot(slotId);
    if (!slot) return false;

    this.state = cloneState(slot.snapshot.state);
    this.snapshotStack = [slot.snapshot];
    this.notifyStateChanged();
    return true;
  }

  private executeUntilWaiting(): void {
    if (this.isExecuting) return;
    this.isExecuting = true;

    try {
      while (!this.state.isWaitingForInput && !this.state.isFinished) {
        const labelInstructions = this.story.labels[this.state.currentLabel];
        if (!labelInstructions || this.state.instructionPointer >= labelInstructions.length) {
          // Handle end of label: check call stack
          if (this.state.callStack.length > 0) {
            const topFrame = this.state.callStack[this.state.callStack.length - 1]!;
            this.state = {
              ...this.state,
              currentLabel: topFrame.returnLabel,
              instructionPointer: topFrame.returnPointer,
              callStack: this.state.callStack.slice(0, -1)
            };
            continue;
          }

          // Story finished
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
        this.state = {
          ...this.state,
          visual: {
            background: inst.background,
            transition: inst.transition ?? null,
            characters: {} // Clear characters on new scene
          }
        };
        break;
      }

      case 'show': {
        const charDef = this.state.visual.characters[inst.character] ?? {};
        this.state = {
          ...this.state,
          visual: {
            ...this.state.visual,
            characters: {
              ...this.state.visual.characters,
              [inst.character]: {
                expression: inst.expression ?? charDef.expression,
                position: inst.position ?? charDef.position ?? 'center'
              }
            }
          }
        };
        break;
      }

      case 'hide': {
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

        this.state = {
          ...this.state,
          dialogue: {
            speaker: inst.speaker,
            speakerDisplayName: displayName,
            speakerColor: color,
            text: inst.text
          },
          isWaitingForInput: true
        };

        this.historyManager.addEntry(inst.speaker, displayName, inst.text);
        break;
      }

      case 'choice': {
        const availableChoices = inst.choices.filter(choice => {
          if (!choice.condition) return true;
          return evaluateCondition(choice.condition, this.state.variables);
        });
        this.state = {
          ...this.state,
          choices: availableChoices,
          isWaitingForInput: true
        };
        break;
      }

      case 'jump': {
        this.state = {
          ...this.state,
          currentLabel: inst.targetLabel,
          instructionPointer: 0
        };
        break;
      }

      case 'set': {
        const currentVal = this.state.variables[inst.variable];
        const nextVal = applySetOperation(currentVal, inst.operator, inst.value, this.state.variables, inst.isVariable);
        this.state = {
          ...this.state,
          variables: {
            ...this.state.variables,
            [inst.variable]: nextVal
          }
        };
        break;
      }

      case 'branch': {
        const conditionVal = evaluateCondition(inst.condition, this.state.variables);
        const targetLabel = conditionVal ? inst.thenLabel : (inst.elseLabel ?? inst.thenLabel);
        this.state = {
          ...this.state,
          currentLabel: targetLabel,
          instructionPointer: 0
        };
        break;
      }

      case 'play_audio': {
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
          this.state = {
            ...this.state,
            currentLabel: topFrame.returnLabel,
            instructionPointer: topFrame.returnPointer,
            callStack: this.state.callStack.slice(0, -1)
          };
        } else {
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
      state: cloneState(this.state)
    };
  }

  private recordSnapshot(): void {
    const snap = this.captureSnapshot();
    this.snapshotStack.push(snap);
    // Limit snapshot history to last 50 steps
    if (this.snapshotStack.length > 50) {
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
