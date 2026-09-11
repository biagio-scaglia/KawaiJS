import { describe, it, expect } from 'vitest';
import { Lexer } from '../src/lexer.js';

describe('Lexer', () => {
  it('tokenizes keywords, identifiers, and strings', () => {
    const code = `character yumia "Yumia"`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens.map(t => t.type)).toEqual([
      'CHARACTER',
      'IDENTIFIER',
      'STRING',
      'EOF'
    ]);
    expect(tokens[1]?.value).toBe('yumia');
    expect(tokens[2]?.value).toBe('Yumia');
  });

  it('tokenizes compound assignment and comparison operators', () => {
    const code = `set score += 5
if score >= 10:
    set score -= 2
`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const types = tokens.map(t => t.type);

    expect(types).toContain('PLUS_EQUALS');
    expect(types).toContain('GREATER_EQUALS');
    expect(types).toContain('MINUS_EQUALS');
  });

  it('tokenizes narrator keyword and strings', () => {
    const code = `narrator "This is a story."`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens[0]?.type).toBe('NARRATOR');
    expect(tokens[1]?.value).toBe('This is a story.');
  });

  it('correctly tracks INDENT and DEDENT levels', () => {
    const code = `label start:
    scene bg room
    yumia "Hello"
`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const types = tokens.map(t => t.type);
    expect(types).toContain('INDENT');
    expect(types).toContain('DEDENT');
  });

  it('tokenizes hex color literals without treating them as comments', () => {
    const code = `character yumia "Yumia" #f43f5e`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens.map(t => t.type)).toEqual([
      'CHARACTER',
      'IDENTIFIER',
      'STRING',
      'COLOR',
      'EOF'
    ]);
    expect(tokens[3]?.value).toBe('#f43f5e');
  });

  it('handles string escape sequences', () => {
    const code = `"Hello \\"world\\"\\nLine 2"`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens[0]?.type).toBe('STRING');
    expect(tokens[0]?.value).toBe('Hello "world"\nLine 2');
  });

  it('tokenizes negative numbers and standalone plus/minus operators', () => {
    const code = `set score = -42
set offset = +10
`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const numTokens = tokens.filter(t => t.type === 'NUMBER');
    expect(numTokens.length).toBe(2);
    expect(numTokens[0]?.value).toBe('-42');
    expect(numTokens[1]?.value).toBe('+10');
  });
});

