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

  it('ignores comments and blank lines', () => {
    const code = `# Header comment

label start:
    # Inline comment
    "Narration"
`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const types = tokens.map(t => t.type);
    expect(types).toEqual([
      'LABEL',
      'IDENTIFIER',
      'COLON',
      'NEWLINE',
      'INDENT',
      'STRING',
      'NEWLINE',
      'DEDENT',
      'EOF'
    ]);
  });
});
