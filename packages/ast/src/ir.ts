import type { SourceLocation } from './source.js';

export interface CharacterDefinition {
  readonly id: string;
  readonly name: string;
  readonly color?: string;
}

export interface ChoiceOption {
  readonly text: string;
  readonly targetLabel: string;
  readonly condition?: string;
}

export interface HotspotOption {
  readonly id: string;
  /** Normalized 0–1 rect relative to the stage. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly targetLabel: string;
}

export type Instruction =
  | { readonly type: 'scene'; readonly background: string; readonly transition?: string; readonly loc?: SourceLocation }
  | { readonly type: 'show'; readonly character: string; readonly expression?: string; readonly position?: string; readonly transition?: string; readonly layer?: string; readonly z?: number; readonly loc?: SourceLocation }
  | { readonly type: 'hide'; readonly character: string; readonly transition?: string; readonly loc?: SourceLocation }
  | { readonly type: 'dialogue'; readonly speaker?: string; readonly text: string; readonly loc?: SourceLocation }
  | { readonly type: 'choice'; readonly prompt?: string; readonly choices: readonly ChoiceOption[]; readonly fallbackLabel?: string; readonly loc?: SourceLocation }
  | { readonly type: 'jump'; readonly targetLabel: string; readonly loc?: SourceLocation }
  | { readonly type: 'set'; readonly variable: string; readonly operator?: '=' | '+=' | '-='; readonly value: unknown; readonly isVariable?: boolean; readonly loc?: SourceLocation }
  | { readonly type: 'branch'; readonly condition: string; readonly thenLabel: string; readonly elseLabel?: string; readonly loc?: SourceLocation }
  | { readonly type: 'play_audio'; readonly channel: 'music' | 'sound' | 'voice'; readonly track: string; readonly fade?: number; readonly loop?: boolean; readonly loc?: SourceLocation }
  | { readonly type: 'stop_audio'; readonly channel: 'music' | 'sound' | 'voice'; readonly fade?: number; readonly loc?: SourceLocation }
  | { readonly type: 'vfx'; readonly effect: 'rain' | 'snow' | 'sakura' | 'fog' | 'tint' | 'stop'; readonly intensity?: number | string; readonly color?: string; readonly loc?: SourceLocation }
  | { readonly type: 'camera'; readonly action: 'shake' | 'vpunch' | 'hpunch' | 'flash'; readonly duration?: number; readonly loc?: SourceLocation }
  | { readonly type: 'pause'; readonly duration?: number; readonly loc?: SourceLocation }
  | { readonly type: 'cg'; readonly image: string; readonly unlockId?: string; readonly loc?: SourceLocation }
  | { readonly type: 'call'; readonly targetLabel: string; readonly loc?: SourceLocation }
  | { readonly type: 'return'; readonly loc?: SourceLocation }
  | { readonly type: 'input'; readonly variable: string; readonly prompt: string; readonly loc?: SourceLocation }
  | { readonly type: 'window'; readonly action: 'show' | 'hide'; readonly loc?: SourceLocation }
  | { readonly type: 'theme'; readonly name: string; readonly loc?: SourceLocation }
  | { readonly type: 'style'; readonly target: string; readonly name: string; readonly loc?: SourceLocation }
  | { readonly type: 'hotspot'; readonly id: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly targetLabel: string; readonly loc?: SourceLocation }
  | { readonly type: 'layer'; readonly name: string; readonly loc?: SourceLocation }
  | { readonly type: 'animate'; readonly character: string; readonly animation: string; readonly durationMs?: number; readonly loc?: SourceLocation }
  | { readonly type: 'unlock'; readonly id: string; readonly title?: string; readonly description?: string; readonly loc?: SourceLocation }
  | { readonly type: 'lang'; readonly code: string; readonly loc?: SourceLocation };

export interface AchievementDefinition {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
}

export interface StoryMeta {
  readonly title?: string;
  readonly version?: string;
  readonly author?: string;
  readonly startLabel?: string;
}

export interface StoryPackage {
  readonly meta: StoryMeta;
  readonly characters: Record<string, CharacterDefinition>;
  /** Optional asset/string aliases from `define` declarations. */
  readonly defines?: Record<string, string>;
  readonly labels: Record<string, readonly Instruction[]>;
  /** String tables keyed by language code, then message key. */
  readonly i18n?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Optional achievement catalog (titles/descriptions for the panel). */
  readonly achievements?: readonly AchievementDefinition[];
}
