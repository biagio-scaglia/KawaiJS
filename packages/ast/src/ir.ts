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

export type Instruction =
  | { readonly type: 'scene'; readonly background: string; readonly transition?: string; readonly loc?: SourceLocation }
  | { readonly type: 'show'; readonly character: string; readonly expression?: string; readonly position?: string; readonly transition?: string; readonly loc?: SourceLocation }
  | { readonly type: 'hide'; readonly character: string; readonly transition?: string; readonly loc?: SourceLocation }
  | { readonly type: 'dialogue'; readonly speaker?: string; readonly text: string; readonly loc?: SourceLocation }
  | { readonly type: 'choice'; readonly prompt?: string; readonly choices: readonly ChoiceOption[]; readonly loc?: SourceLocation }
  | { readonly type: 'jump'; readonly targetLabel: string; readonly loc?: SourceLocation }
  | { readonly type: 'set'; readonly variable: string; readonly operator?: '=' | '+=' | '-='; readonly value: unknown; readonly loc?: SourceLocation }
  | { readonly type: 'branch'; readonly condition: string; readonly thenLabel: string; readonly elseLabel?: string; readonly loc?: SourceLocation }
  | { readonly type: 'play_audio'; readonly channel: 'music' | 'sound' | 'voice'; readonly track: string; readonly fade?: number; readonly loop?: boolean; readonly loc?: SourceLocation }
  | { readonly type: 'stop_audio'; readonly channel: 'music' | 'sound' | 'voice'; readonly fade?: number; readonly loc?: SourceLocation }
  | { readonly type: 'return'; readonly loc?: SourceLocation };

export interface StoryMeta {
  readonly title?: string;
  readonly version?: string;
  readonly author?: string;
  readonly startLabel?: string;
}

export interface StoryPackage {
  readonly meta: StoryMeta;
  readonly characters: Record<string, CharacterDefinition>;
  readonly labels: Record<string, readonly Instruction[]>;
}
