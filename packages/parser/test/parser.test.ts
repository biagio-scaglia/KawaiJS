import { describe, it, expect } from 'vitest';
import { Parser } from '../src/parser.js';
import { formatDiagnostic, KawaError } from '../src/diagnostic.js';

describe('Parser', () => {
  it('parses character declarations, labels, and dialogue', () => {
    const code = `character yumia "Yumia" #f43f5e

label start:
    scene bg classroom with fade
    show yumia happy at center
    yumia "Good morning!"
    "A peaceful day begins."
`;
    const parser = Parser.fromSource(code);
    const ast = parser.parse();

    expect(ast.type).toBe('Program');
    expect(ast.statements.length).toBe(2);

    const charDecl = ast.statements[0];
    expect(charDecl?.type).toBe('CharacterDecl');

    const labelDecl = ast.statements[1];
    expect(labelDecl?.type).toBe('LabelDecl');
    if (labelDecl?.type === 'LabelDecl') {
      expect(labelDecl.name).toBe('start');
      expect(labelDecl.body.length).toBe(4);
      expect(labelDecl.body[0]?.type).toBe('SceneStmt');
      expect(labelDecl.body[1]?.type).toBe('ShowStmt');
      expect(labelDecl.body[2]?.type).toBe('DialogueStmt');
      expect(labelDecl.body[3]?.type).toBe('DialogueStmt');
    }
  });

  it('parses branching menu statements', () => {
    const code = `label start:
    menu:
        "Option A":
            jump label_a
        "Option B":
            jump label_b
`;
    const parser = Parser.fromSource(code);
    const ast = parser.parse();

    const labelDecl = ast.statements[0];
    if (labelDecl?.type === 'LabelDecl') {
      const menu = labelDecl.body[0];
      expect(menu?.type).toBe('MenuStmt');
      if (menu?.type === 'MenuStmt') {
        expect(menu.choices.length).toBe(2);
        expect(menu.choices[0]?.text).toBe('Option A');
        expect(menu.choices[1]?.text).toBe('Option B');
      }
    }
  });

  it('formats helpful diagnostics on syntax error', () => {
    const invalidCode = `label start:
    jump
`;
    expect(() => {
      const parser = Parser.fromSource(invalidCode, 'script.kawa');
      parser.parse();
    }).toThrowError(KawaError);

    try {
      const parser = Parser.fromSource(invalidCode, 'script.kawa');
      parser.parse();
    } catch (e) {
      if (e instanceof KawaError) {
        const msg = formatDiagnostic(e.diagnostic, invalidCode);
        expect(msg).toContain('[Kawa ERROR]');
        expect(msg).toContain('script.kawa');
      }
    }
  });
});
