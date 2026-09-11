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
});


