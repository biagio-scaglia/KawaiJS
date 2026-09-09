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
  // Literals & Identifiers
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  // Symbols
  | 'COLON'
  | 'EQUALS'
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
  loop: 'LOOP',
  true: 'BOOLEAN',
  false: 'BOOLEAN'
};
