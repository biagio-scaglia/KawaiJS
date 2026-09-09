import type { SourceLocation } from '@kawaijs/ast';

export type TokenType =
  // Keywords
  | 'CHARACTER'
  | 'LABEL'
  | 'SCENE'
  | 'SHOW'
  | 'HIDE'
  | 'AT'
  | 'WITH'
  | 'MENU'
  | 'JUMP'
  | 'RETURN'
  | 'SET'
  | 'IF'
  | 'ELIF'
  | 'ELSE'
  | 'PLAY'
  | 'STOP'
  | 'MUSIC'
  | 'SOUND'
  | 'VOICE'
  | 'FADEIN'
  | 'FADEOUT'
  | 'LOOP'
  | 'NARRATOR'
  // Literals & Identifiers
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'COLOR'
  // Symbols & Operators
  | 'COLON'
  | 'EQUALS'
  | 'PLUS_EQUALS'
  | 'MINUS_EQUALS'
  | 'DOUBLE_EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_EQUALS'
  | 'LESS_EQUALS'
  | 'GREATER'
  | 'LESS'
  | 'COMMA'
  // Layout tokens
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF';

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly loc: SourceLocation;
}

export const KEYWORDS: Record<string, TokenType> = {
  character: 'CHARACTER',
  label: 'LABEL',
  scene: 'SCENE',
  show: 'SHOW',
  hide: 'HIDE',
  at: 'AT',
  with: 'WITH',
  menu: 'MENU',
  jump: 'JUMP',
  return: 'RETURN',
  set: 'SET',
  if: 'IF',
  elif: 'ELIF',
  else: 'ELSE',
  play: 'PLAY',
  stop: 'STOP',
  music: 'MUSIC',
  sound: 'SOUND',
  voice: 'VOICE',
  fadein: 'FADEIN',
  fadeout: 'FADEOUT',
  fade: 'FADEIN',
  loop: 'LOOP',
  narrator: 'NARRATOR',
  true: 'BOOLEAN',
  false: 'BOOLEAN'
};
