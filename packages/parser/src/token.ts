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
  | 'CALL'
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
  | 'VFX'
  | 'CAMERA'
  | 'PAUSE'
  | 'CG'
  | 'AS'
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
  | 'PLUS'
  | 'MINUS'
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

export const KEYWORDS_MAP = new Map<string, TokenType>([
  ['character', 'CHARACTER'],
  ['label', 'LABEL'],
  ['scene', 'SCENE'],
  ['show', 'SHOW'],
  ['hide', 'HIDE'],
  ['at', 'AT'],
  ['with', 'WITH'],
  ['menu', 'MENU'],
  ['jump', 'JUMP'],
  ['call', 'CALL'],
  ['return', 'RETURN'],
  ['set', 'SET'],
  ['if', 'IF'],
  ['elif', 'ELIF'],
  ['else', 'ELSE'],
  ['play', 'PLAY'],
  ['stop', 'STOP'],
  ['music', 'MUSIC'],
  ['sound', 'SOUND'],
  ['voice', 'VOICE'],
  ['fadein', 'FADEIN'],
  ['fadeout', 'FADEOUT'],
  ['fade', 'FADEIN'],
  ['loop', 'LOOP'],
  ['narrator', 'NARRATOR'],
  ['vfx', 'VFX'],
  ['camera', 'CAMERA'],
  ['pause', 'PAUSE'],
  ['cg', 'CG'],
  ['as', 'AS'],
  ['true', 'BOOLEAN'],
  ['false', 'BOOLEAN']
]);

export const KEYWORDS: Record<string, TokenType> = Object.fromEntries(KEYWORDS_MAP.entries());
