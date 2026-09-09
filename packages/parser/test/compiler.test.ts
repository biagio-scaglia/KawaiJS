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

  it('detects unknown jump labels and suggests diagnostics', () => {
    const brokenCode = `label start:
    jump missing_label
`;
    expect(() => {
      compileScript(brokenCode);
    }).toThrowError(KawaError);
  });
});
