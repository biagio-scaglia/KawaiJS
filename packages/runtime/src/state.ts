import type { ChoiceOption } from '@kawaijs/ast';

export interface CharacterState {
  readonly expression?: string;
  readonly position?: string;
}

export interface DialogueState {
  readonly speaker?: string;
  readonly speakerDisplayName?: string;
  readonly speakerColor?: string;
  readonly text: string;
}

export interface VisualState {
  readonly background: string | null;
  readonly transition: string | null;
  readonly characters: Record<string, CharacterState>;
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
    variables: {},
    visual: {
      background: null,
      transition: null,
      characters: {}
    },
    audio: {
      music: null,
      voice: null
    },
    dialogue: null,
    choices: null,
    isWaitingForInput: false,
    isFinished: false
  };
}

export function cloneState(state: StoryState): StoryState {
  return {
    currentLabel: state.currentLabel,
    instructionPointer: state.instructionPointer,
    callStack: state.callStack.map(frame => ({ ...frame })),
    variables: { ...state.variables },
    visual: {
      background: state.visual.background,
      transition: state.visual.transition,
      characters: Object.fromEntries(
        Object.entries(state.visual.characters).map(([k, v]) => [k, { ...v }])
      )
    },
    audio: { ...state.audio },
    dialogue: state.dialogue ? { ...state.dialogue } : null,
    choices: state.choices ? state.choices.map(c => ({ ...c })) : null,
    isWaitingForInput: state.isWaitingForInput,
    isFinished: state.isFinished
  };
}
