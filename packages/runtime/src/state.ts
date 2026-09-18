import type { ChoiceOption, HotspotOption } from '@kawaijs/ast';

export interface CharacterState {
  readonly expression?: string;
  readonly position?: string;
  readonly transition?: string;
  readonly layer?: string;
  readonly z?: number;
  readonly cssAnimation?: {
    readonly name: string;
    readonly durationMs?: number;
    /** Bumps so the same animation can re-trigger. */
    readonly token?: number;
  };
}

export interface AchievementState {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly unlockedAt: number;
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
  /** Default layer name applied to subsequent shows without an explicit layer. */
  readonly defaultLayer: string | null;
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
  /** Clickable stage/CG regions waiting for a player pick. */
  readonly hotspots: readonly HotspotOption[] | null;
  /** CSS theme token applied on the player root (`data-kawa-theme`). */
  readonly theme: string | null;
  /** Named style tokens keyed by UI target (dialogue, stage, root, choices). */
  readonly styleClasses: Readonly<Record<string, string>>;
  readonly unlockedCGs: Record<string, boolean>;
  /** Unlocked achievements / exportable flags. */
  readonly achievements: Readonly<Record<string, AchievementState>>;
  /** Active language code for `{t:key}` string tables. */
  readonly lang: string | null;
  /**
   * When set, the presentation layer should auto-advance after this many ms.
   * Click/keyboard advance may skip the remaining delay.
   */
  readonly pendingPauseMs: number | null;
  /** Text prompt waiting for the player (`input` directive). */
  readonly pendingInput: { readonly variable: string; readonly prompt: string } | null;
  /** When false, the dialogue window should be hidden (`window hide`). */
  readonly windowVisible: boolean;
  readonly isWaitingForInput: boolean;
  readonly isFinished: boolean;
}

export interface Snapshot {
  readonly id: string;
  readonly timestamp: number;
  readonly state: StoryState;
  /** Dialogue history length at snapshot time — used to trim backlog on rollback. */
  readonly historyLength?: number;
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
      activeCG: null,
      defaultLayer: null
    },
    audio: {
      music: null,
      voice: null
    },
    dialogue: null,
    choices: null,
    hotspots: null,
    theme: null,
    styleClasses: Object.create(null) as Record<string, string>,
    unlockedCGs: Object.create(null) as Record<string, boolean>,
    achievements: Object.create(null) as Record<string, AchievementState>,
    lang: null,
    pendingPauseMs: null,
    pendingInput: null,
    windowVisible: true,
    isWaitingForInput: false,
    isFinished: false
  };
}

/**
 * Normalize a partially-shaped / older save state into a full StoryState.
 * Returns null when the payload is too corrupt to recover.
 */
export function normalizeStoryState(raw: unknown): StoryState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;

  if (typeof s['currentLabel'] !== 'string' || typeof s['instructionPointer'] !== 'number') {
    return null;
  }

  const base = createInitialState(s['currentLabel']);
  const visualRaw = (s['visual'] && typeof s['visual'] === 'object' ? s['visual'] : {}) as Record<string, unknown>;
  const audioRaw = (s['audio'] && typeof s['audio'] === 'object' ? s['audio'] : {}) as Record<string, unknown>;
  const dialogueRaw = s['dialogue'] && typeof s['dialogue'] === 'object' ? (s['dialogue'] as Record<string, unknown>) : null;

  const callStack = Array.isArray(s['callStack'])
    ? s['callStack']
        .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
        .map(f => ({
          returnLabel: typeof f['returnLabel'] === 'string' ? f['returnLabel'] : base.currentLabel,
          returnPointer: typeof f['returnPointer'] === 'number' ? f['returnPointer'] : 0
        }))
    : [];

  const charactersRaw =
    visualRaw['characters'] && typeof visualRaw['characters'] === 'object'
      ? (visualRaw['characters'] as Record<string, CharacterState>)
      : {};

  const pendingInputRaw =
    s['pendingInput'] && typeof s['pendingInput'] === 'object'
      ? (s['pendingInput'] as Record<string, unknown>)
      : null;
  const pendingInput =
    pendingInputRaw &&
    typeof pendingInputRaw['variable'] === 'string' &&
    typeof pendingInputRaw['prompt'] === 'string'
      ? {
          variable: pendingInputRaw['variable'] as string,
          prompt: pendingInputRaw['prompt'] as string
        }
      : null;

  const hotspots = Array.isArray(s['hotspots'])
    ? (s['hotspots'] as HotspotOption[]).filter(
        (h): h is HotspotOption =>
          !!h &&
          typeof h === 'object' &&
          typeof h.id === 'string' &&
          typeof h.targetLabel === 'string' &&
          typeof h.x === 'number' &&
          typeof h.y === 'number' &&
          typeof h.w === 'number' &&
          typeof h.h === 'number'
      )
    : null;

  const choices = Array.isArray(s['choices']) ? (s['choices'] as ChoiceOption[]) : null;

  // Keep wait flag consistent with recoverable interactive state.
  let isWaitingForInput = Boolean(s['isWaitingForInput']);
  if (isWaitingForInput && !pendingInput && !hotspots && (!choices || choices.length === 0)) {
    // Dialogue waits are fine without choices/input/hotspots; only clear when the saved
    // blob claimed a wait but all interactive payloads were corrupt/missing AND there is
    // no dialogue either (corrupt save mid-input with stripped fields).
    if (!dialogueRaw || typeof dialogueRaw['text'] !== 'string') {
      isWaitingForInput = false;
    }
  }
  if (pendingInput || (hotspots && hotspots.length > 0) || (choices && choices.length > 0)) {
    isWaitingForInput = true;
  }

  return {
    currentLabel: s['currentLabel'] as string,
    instructionPointer: s['instructionPointer'] as number,
    callStack,
    variables:
      s['variables'] && typeof s['variables'] === 'object'
        ? Object.assign(Object.create(null), s['variables'])
        : Object.create(null),
    visual: {
      background: typeof visualRaw['background'] === 'string' ? visualRaw['background'] : null,
      transition: typeof visualRaw['transition'] === 'string' ? visualRaw['transition'] : null,
      characters: { ...charactersRaw },
      vfx: (visualRaw['vfx'] as VfxState | null) ?? null,
      activeCG: typeof visualRaw['activeCG'] === 'string' ? visualRaw['activeCG'] : null,
      defaultLayer: typeof visualRaw['defaultLayer'] === 'string' ? visualRaw['defaultLayer'] : null
    },
    audio: {
      music: typeof audioRaw['music'] === 'string' ? audioRaw['music'] : null,
      voice: typeof audioRaw['voice'] === 'string' ? audioRaw['voice'] : null
    },
    dialogue: dialogueRaw && typeof dialogueRaw['text'] === 'string'
      ? {
          speaker: typeof dialogueRaw['speaker'] === 'string' ? dialogueRaw['speaker'] : undefined,
          speakerDisplayName:
            typeof dialogueRaw['speakerDisplayName'] === 'string'
              ? dialogueRaw['speakerDisplayName']
              : undefined,
          speakerColor: typeof dialogueRaw['speakerColor'] === 'string' ? dialogueRaw['speakerColor'] : undefined,
          text: dialogueRaw['text'] as string
        }
      : null,
    choices,
    hotspots: hotspots && hotspots.length > 0 ? hotspots : null,
    theme: typeof s['theme'] === 'string' ? s['theme'] : null,
    styleClasses:
      s['styleClasses'] && typeof s['styleClasses'] === 'object'
        ? Object.assign(Object.create(null), s['styleClasses'])
        : Object.create(null),
    unlockedCGs:
      s['unlockedCGs'] && typeof s['unlockedCGs'] === 'object'
        ? Object.assign(Object.create(null), s['unlockedCGs'])
        : Object.create(null),
    achievements:
      s['achievements'] && typeof s['achievements'] === 'object'
        ? Object.assign(Object.create(null), s['achievements'])
        : Object.create(null),
    lang: typeof s['lang'] === 'string' ? s['lang'] : null,
    pendingPauseMs: typeof s['pendingPauseMs'] === 'number' ? s['pendingPauseMs'] : null,
    pendingInput,
    windowVisible: s['windowVisible'] === false ? false : true,
    isWaitingForInput,
    isFinished: Boolean(s['isFinished'])
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
      defaultLayer: state.visual.defaultLayer,
      characters: Object.fromEntries(
        Object.entries(state.visual.characters).map(([k, v]) => [
          k,
          {
            ...v,
            cssAnimation: v.cssAnimation ? { ...v.cssAnimation } : undefined
          }
        ])
      )
    },
    audio: { ...state.audio },
    dialogue: state.dialogue ? { ...state.dialogue } : null,
    choices: state.choices ? state.choices.map(c => ({ ...c })) : null,
    hotspots: state.hotspots ? state.hotspots.map(h => ({ ...h })) : null,
    theme: state.theme,
    styleClasses: Object.assign(Object.create(null), state.styleClasses),
    unlockedCGs: Object.assign(Object.create(null), state.unlockedCGs),
    achievements: Object.assign(Object.create(null), state.achievements),
    lang: state.lang,
    pendingPauseMs: state.pendingPauseMs ?? null,
    pendingInput: state.pendingInput ? { ...state.pendingInput } : null,
    windowVisible: state.windowVisible !== false,
    isWaitingForInput: state.isWaitingForInput,
    isFinished: state.isFinished
  };
}
