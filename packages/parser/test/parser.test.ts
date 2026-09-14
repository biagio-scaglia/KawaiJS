import { describe, it, expect } from 'vitest';
import { Parser } from '../src/parser.js';
import { formatDiagnostic, KawaError } from '../src/diagnostic.js';
import { validateScript } from '../src/validator.js';
import { compileScript } from '../src/index.js';

describe('Parser', () => {
  it('parses character declarations, labels, dialogue, and narrator', () => {
    const code = `character yumia "Yumia" #f43f5e

label start:
    scene bg classroom with fade
    show yumia happy at center
    yumia "Good morning!"
    narrator "A peaceful day begins."
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

  it('parses set statements with operators and conditional branching', () => {
    const code = `label start:
    set affection = 0
    set affection += 1
    if affection >= 1:
        jump good_end
    else:
        jump normal_end
`;
    const parser = Parser.fromSource(code);
    const ast = parser.parse();

    const labelDecl = ast.statements[0];
    if (labelDecl?.type === 'LabelDecl') {
      expect(labelDecl.body[0]?.type).toBe('SetStmt');
      expect(labelDecl.body[1]?.type).toBe('SetStmt');
      expect(labelDecl.body[2]?.type).toBe('IfStmt');
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

  it('parses define, input, and window directives', () => {
    const code = `define bg classroom = "classroom.svg"
define music ambient = "bgm_ambient"

label start:
    input player_name "Your name?"
    window hide
    pause 100
    window show
    scene bg classroom with dissolve
    play music ambient
    "Hello [player_name]"
`;
    const parser = Parser.fromSource(code, 'script.kawa');
    const ast = parser.parse();
    expect(ast.statements.some((s) => s.type === 'DefineDecl')).toBe(true);
    const label = ast.statements.find((s) => s.type === 'LabelDecl');
    expect(label?.type).toBe('LabelDecl');
    if (label?.type === 'LabelDecl') {
      expect(label.body.some((s) => s.type === 'InputStmt')).toBe(true);
      expect(label.body.some((s) => s.type === 'WindowStmt')).toBe(true);
    }
  });

  it('parses vfx, camera, pause, and cg directives', () => {
    const code = `label start:
    vfx sakura
    vfx tint "rgba(255,100,100,0.3)"
    camera shake 500
    camera flash
    pause 1200
    cg "memories_sunset.jpg" as "cg_sunset"
    vfx stop
`;
    const parser = Parser.fromSource(code);
    const ast = parser.parse();

    const labelDecl = ast.statements[0];
    expect(labelDecl?.type).toBe('LabelDecl');
    if (labelDecl?.type === 'LabelDecl') {
      expect(labelDecl.body.length).toBe(7);
      expect(labelDecl.body[0]?.type).toBe('VfxStmt');
      expect(labelDecl.body[1]?.type).toBe('VfxStmt');
      expect(labelDecl.body[2]?.type).toBe('CameraStmt');
      expect(labelDecl.body[3]?.type).toBe('CameraStmt');
      expect(labelDecl.body[4]?.type).toBe('PauseStmt');
      expect(labelDecl.body[5]?.type).toBe('CgStmt');
      expect(labelDecl.body[6]?.type).toBe('VfxStmt');
    }
  });

  it('parses call statements as CallStmt', () => {
    const code = `label start:
    call helper
    "Back"

label helper:
    "Inside"
    return
`;
    const parser = Parser.fromSource(code);
    const ast = parser.parse();
    const start = ast.statements.find((s) => s.type === 'LabelDecl' && s.name === 'start');
    expect(start && start.type === 'LabelDecl' && start.body[0]?.type).toBe('CallStmt');

    const story = compileScript(code);
    expect(story.labels['start']?.[0]?.type).toBe('call');
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

  it('performs semantic validation and catches undefined labels and undeclared characters', () => {
    const scriptWithErrors = `character yumia "Yumia"

label start:
    scene bg classroom
    yumia "Hello!"
    unknown_char "I am not declared!"
    jump mistyped_lable

label mistyped_label:
    "Found it!"
`;
    const report = validateScript(scriptWithErrors, 'test.kawa');
    expect(report.isValid).toBe(false);
    expect(report.errors.length).toBe(1);
    expect(report.errors[0]?.message).toContain("Jump target label 'mistyped_lable' is not defined");
    expect(report.errors[0]?.hint).toContain("Did you mean 'mistyped_label'?");

    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.warnings[0]?.message).toContain("Character 'unknown_char' used in dialogue is not declared");
  });
});
