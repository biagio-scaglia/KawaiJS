import { describe, it, expect } from 'vitest';
import { compileScript } from '../src/index.js';
import { KawaError } from '../src/diagnostic.js';

describe('Compiler', () => {
  it('compiles Kawa Script into a StoryPackage IR', () => {
    const code = `character yumia "Yumia"

label start:
    scene bg classroom
    show yumia happy
    yumia "Hello world!"
    menu:
        "Greet her":
            yumia "Glad to meet you!"
        "Ignore":
            "You stayed silent."
`;
    const story = compileScript(code);

    expect(story.characters['yumia']).toBeDefined();
    expect(story.characters['yumia']?.name).toBe('Yumia');
    expect(story.labels['start']).toBeDefined();

    const startInstructions = story.labels['start']!;
    expect(startInstructions[0]?.type).toBe('scene');
    expect(startInstructions[1]?.type).toBe('show');
    expect(startInstructions[2]?.type).toBe('dialogue');
    expect(startInstructions[3]?.type).toBe('choice');
  });

  it('compiles structured if/elif/else with fallthrough merge blocks', () => {
    const code = `label start:
    set score = 5
    if score > 10:
        narrator "High"
    elif score > 3:
        narrator "Medium"
    else:
        narrator "Low"
    narrator "After if block"
    return
`;
    const story = compileScript(code);
    expect(story.labels['start']).toBeDefined();
    expect(Object.keys(story.labels).length).toBeGreaterThan(2);
  });

  it('supports multi-file include statements and merges declarations', () => {
    const mainScript = `include "chapter1.kawa"
character sensei "Sensei" #38bdf8

label start:
    jump ch1_start
`;

    const chapter1Script = `character yumia "Yumia" #f43f5e

label ch1_start:
    yumia "Welcome to Chapter 1!"
`;

    const fileMap: Record<string, string> = {
      'chapter1.kawa': chapter1Script
    };

    const story = compileScript(mainScript, 'main.kawa', {
      fileResolver: (target) => fileMap[target]!
    });

    expect(story.characters['sensei']).toBeDefined();
    expect(story.characters['yumia']).toBeDefined();
    expect(story.labels['start']).toBeDefined();
    expect(story.labels['ch1_start']).toBeDefined();
  });

  it('detects circular includes and throws a KawaError', () => {
    const fileA = `include "b.kawa"\nlabel start:\n    "A"\n`;
    const fileB = `include "a.kawa"\nlabel b_label:\n    "B"\n`;

    const fileMap: Record<string, string> = {
      'a.kawa': fileA,
      'b.kawa': fileB
    };

    expect(() => {
      compileScript(fileA, 'a.kawa', {
        fileResolver: (target) => fileMap[target]!
      });
    }).toThrow(KawaError);
  });

  it('detects include cycles across path aliases (ch.kawa vs ./ch.kawa)', () => {
    const main = `include "ch.kawa"
include "./ch.kawa"
label start:
    "x"
`;
    const ch = `label ch1:
    "c"
`;
    expect(() => {
      compileScript(main, 'main.kawa', {
        fileResolver: (target) => {
          const key = target.replace(/^\.\//, '');
          if (key === 'ch.kawa') return ch;
          return null;
        }
      });
    }).toThrow(/Circular include/);
  });

  it('preserves character hex color definitions', () => {
    const code = `character yumia "Yumia" #f43f5e
character kaori "Kaori" #0284c7

label start:
    "Hello"
`;
    const story = compileScript(code);
    expect(story.characters['yumia']?.color).toBe('#f43f5e');
    expect(story.characters['kaori']?.color).toBe('#0284c7');
  });

  it('detects unknown jump labels and suggests nearest matching labels', () => {
    const brokenCode = `label roof_top:
    "Rooftop scene"

label start:
    jump rooftop
`;
    try {
      compileScript(brokenCode);
      expect.fail('Should have thrown KawaError');
    } catch (e) {
      expect(e).toBeInstanceOf(KawaError);
      const err = e as KawaError;
      expect(err.diagnostic.hint).toContain("Did you mean 'roof_top'?");
    }
  });

  it('ensures choice blocks without trailing statements jump to merge label with return', () => {
    const code = `label start:
    menu:
        "Choice A":
            "You picked A"
        "Choice B":
            "You picked B"
`;
    const story = compileScript(code);
    const startInsts = story.labels['start']!;
    expect(startInsts[0]?.type).toBe('choice');
    const choiceInst = startInsts[0] as any;
    expect(choiceInst.choices.length).toBe(2);

    const targetA = choiceInst.choices[0].targetLabel;
    const instsA = story.labels[targetA]!;
    expect(instsA[0]?.type).toBe('dialogue');
    // The last instruction must be a jump to merge label, not falling off
    expect(instsA[1]?.type).toBe('jump');

    const mergeLabel = instsA[1]?.targetLabel;
    expect(story.labels[mergeLabel]).toBeDefined();
    expect(story.labels[mergeLabel]![0]?.type).toBe('return');
  });

  it('ensures statements after a menu continue execution via merge label', () => {
    const code = `label start:
    menu:
        "Yes":
            set agreed = true
        "No":
            set agreed = false
    "Story continues here"
`;
    const story = compileScript(code);
    const startInsts = story.labels['start']!;
    const choiceInst = startInsts[0] as any;
    const targetA = choiceInst.choices[0].targetLabel;
    const instsA = story.labels[targetA]!;
    const mergeLabel = instsA[1]?.targetLabel;

    const mergeInsts = story.labels[mergeLabel]!;
    expect(mergeInsts[0]?.type).toBe('dialogue');
    expect((mergeInsts[0] as any).text).toBe('Story continues here');
  });

  it('compiles theme, style, and normalized hotspots', () => {
    const code = `label start:
    theme "Noir"
    style dialogue glass
    hotspot door 40 50 18 12 jump next
    "waiting"

label next:
    "arrived"
`;
    const story = compileScript(code);
    const start = story.labels['start']!;
    expect(start.some((i) => i.type === 'theme' && i.name === 'Noir')).toBe(true);
    expect(start.some((i) => i.type === 'style' && i.target === 'dialogue' && i.name === 'glass')).toBe(true);
    const hotspot = start.find((i) => i.type === 'hotspot');
    expect(hotspot?.type).toBe('hotspot');
    if (hotspot?.type === 'hotspot') {
      expect(hotspot.x).toBeCloseTo(0.4);
      expect(hotspot.y).toBeCloseTo(0.5);
      expect(hotspot.w).toBeCloseTo(0.18);
      expect(hotspot.h).toBeCloseTo(0.12);
      expect(hotspot.targetLabel).toBe('next');
    }
  });

  it('does not pick synthetic __* labels as startLabel when start is missing', () => {
    const code = `label intro:
    if true:
        "yes"
    "after"
`;
    const story = compileScript(code);
    expect(story.meta.startLabel).toBe('intro');
    expect(story.meta.startLabel?.startsWith('__')).toBe(false);
  });

  it('rejects empty scripts with no labels', () => {
    expect(() => compileScript('\n\n')).toThrow(KawaError);
  });

  it('rejects nested label/character/define declarations', () => {
    expect(() =>
      compileScript(`label start:
    label inner:
        "hello"
    "outer"
`)
    ).toThrow(/Nested label/);

    expect(() =>
      compileScript(`label start:
    character x "X"
    "hi"
`)
    ).toThrow(/Nested character/);
  });

  it('rejects duplicate character declarations', () => {
    expect(() =>
      compileScript(`character yumia "First"
character yumia "Second"
label start:
    "hi"
`)
    ).toThrow(/Duplicate character/);
  });
});


