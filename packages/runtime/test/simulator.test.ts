import { describe, it, expect } from 'vitest';
import { compileScript } from '@kawaijs/parser';
import { simulateStory } from '../src/simulator.js';

describe('StorySimulator & Headless Branch Explorer', () => {
  it('explores all branching choice paths and detects multiple endings', () => {
    const script = `
label start:
    "Welcome to the story!"
    menu:
        "Go Left":
            jump left_path
        "Go Right":
            jump right_path

label left_path:
    "You took the left path."
    menu:
        "Open Chest":
            "You found gold!"
        "Ignore Chest":
            "You walked away safely."

label right_path:
    "You took the right path into the cave."
    "The end."

label secret_unreachable_room:
    "Nobody can reach this label."
`;

    const story = compileScript(script);
    const result = simulateStory(story);

    expect(result.totalPaths).toBe(3); // (Left -> Chest), (Left -> Ignore), (Right)
    expect(result.errors).toHaveLength(0);
    expect(result.endings).toHaveLength(3);

    expect(result.visitedLabels.has('start')).toBe(true);
    expect(result.visitedLabels.has('left_path')).toBe(true);
    expect(result.visitedLabels.has('right_path')).toBe(true);
    expect(result.visitedLabels.has('secret_unreachable_room')).toBe(false);

    expect(result.unreachableLabels).toContain('secret_unreachable_room');

    // Check choice paths in endings
    const chestEnding = result.endings.find(e => e.choicePath.some(c => c.selectedText === 'Open Chest'));
    expect(chestEnding).toBeDefined();
    expect(chestEnding?.visitedLabels).toContain('left_path');

    const rightEnding = result.endings.find(e => e.choicePath.some(c => c.selectedText === 'Go Right'));
    expect(rightEnding).toBeDefined();
    expect(rightEnding?.visitedLabels).toContain('right_path');
  });

  it('detects runtime evaluation errors or missing start labels gracefully', () => {
    const script = `
label start:
    "Hello"
`;
    const story = compileScript(script);
    const result = simulateStory(story, { startLabel: 'non_existent_label' });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.error).toContain('non_existent_label');
  });

  it('respects initialVariables and variables updated during story simulation', () => {
    const script = `
label start:
    menu:
        "Hero path":
            set karma = karma + 10
            jump final_check
        "Rogue path":
            set karma = karma - 10
            jump final_check

label final_check:
    if karma >= 10:
        "Good Ending"
    else:
        "Bad Ending"
`;
    const story = compileScript(script);
    const result = simulateStory(story, { initialVariables: { karma: 0 } });

    expect(result.totalPaths).toBe(2);
    expect(result.endings).toHaveLength(2);

    const goodEnding = result.endings.find(e => e.finalState.variables.karma === 10);
    expect(goodEnding).toBeDefined();

    const badEnding = result.endings.find(e => e.finalState.variables.karma === -10);
    expect(badEnding).toBeDefined();
  });

  it('explores hotspot branches instead of soft-locking', () => {
    const script = `
label start:
    hotspot door 40 50 10 10 jump room
    "skip"

label room:
    "inside"
    return
`;
    const story = compileScript(script);
    const result = simulateStory(story, { maxStepsPerPath: 20 });
    expect(result.errors).toHaveLength(0);
    expect(result.visitedLabels.has('room')).toBe(true);
    expect(result.totalPaths).toBeGreaterThanOrEqual(1);
  });
});
