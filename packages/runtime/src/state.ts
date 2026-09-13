import type { ChoiceOption } from '@kawaijs/ast';

export interface CharacterState {
  readonly expression?: string;
  readonly position?: string;
  readonly transition?: string;
}

export interface DialogueState {
  readonly speaker?: string;
  readonly speakerDisplayName?: string;
  readonly speakerColor?: string;
  readonly text: string;
}

export interface VfxState {
  readonly effect: 'rain' | 'snow' | 'sakura' | 'fog' | 'tint' | 'stop';
  readonly intensity?: number | string;
  readonly color?: string;
}

export interface VisualState {
  readonly background: string | null;
  readonly transition: string | null;
  readonly characters: Record<string, CharacterState>;
  readonly vfx: VfxState | null;
  readonly activeCG: string | null;
}

export interface AudioState {
  readonly music: string | null;
  readonly voice: string | null;
}

export interface CallFrame {
  readonly returnLabel: string;
  readonly returnPointer: number;
}

export interface StoryState {
  readonly currentLabel: string;
  readonly instructionPointer: number;
  readonly callStack: readonly CallFrame[];
  readonly variables: Record<string, unknown>;
  readonly visual: VisualState;
  readonly audio: AudioState;
  readonly dialogue: DialogueState | null;
  readonly choices: readonly ChoiceOption[] | null;
  readonly unlockedCGs: Record<string, boolean>;
  readonly isWaitingForInput: boolean;
  readonly isFinished: boolean;
}

export interface Snapshot {
  readonly id: string;
  readonly timestamp: number;
  readonly state: StoryState;
}

export function createInitialState(startLabel = 'start'): StoryState {
  return {
    currentLabel: startLabel,
    instructionPointer: 0,
    callStack: [],
    variables: Object.create(null) as Record<string, unknown>,
    visual: {
      background: null,
      transition: null,
      characters: {},
      vfx: null,
      activeCG: null
    },
    audio: {
      music: null,
      voice: null
    },
    dialogue: null,
    choices: null,
    unlockedCGs: Object.create(null) as Record<string, boolean>,
    isWaitingForInput: false,
    isFinished: false
  };
}

export function cloneState(state: StoryState): StoryState {
  return {
    currentLabel: state.currentLabel,
    instructionPointer: state.instructionPointer,
    callStack: state.callStack.map(frame => ({ ...frame })),
    variables: Object.assign(Object.create(null), state.variables),
    visual: {
      background: state.visual.background,
      transition: state.visual.transition,
      vfx: state.visual.vfx ? { ...state.visual.vfx } : null,
      activeCG: state.visual.activeCG,
      characters: Object.fromEntries(
        Object.entries(state.visual.characters).map(([k, v]) => [k, { ...v }])
      )
    },
    audio: { ...state.audio },
    dialogue: state.dialogue ? { ...state.dialogue } : null,
    choices: state.choices ? state.choices.map(c => ({ ...c })) : null,
    unlockedCGs: Object.assign(Object.create(null), state.unlockedCGs),
    isWaitingForInput: state.isWaitingForInput,
    isFinished: state.isFinished
  };
}
