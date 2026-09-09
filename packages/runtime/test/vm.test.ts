import { describe, it, expect } from 'vitest';
import { compileScript } from '@kawaijs/parser';
import { StoryVM } from '../src/vm.js';
import { MemoryStorageAdapter, SaveManager } from '../src/save.js';

describe('StoryVM Execution & State', () => {
  it('executes a linear story step-by-step', () => {
    const code = `character yumia "Yumia"

label start:
    scene bg classroom
    show yumia happy
    yumia "Line 1"
    yumia "Line 2"
    return
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().isWaitingForInput).toBe(true);
    expect(vm.getState().dialogue?.text).toBe('Line 1');
    expect(vm.getState().visual.background).toBe('bg classroom');
    expect(vm.getState().visual.characters['yumia']?.expression).toBe('happy');

    vm.next();
    expect(vm.getState().dialogue?.text).toBe('Line 2');

    vm.next();
    expect(vm.getState().isFinished).toBe(true);
  });

  it('handles branching choices', () => {
    const code = `label start:
    menu:
        "Choice A":
            "You picked A"
        "Choice B":
            "You picked B"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().choices?.length).toBe(2);

    // Pick Choice B (index 1)
    vm.choose(1);
    expect(vm.getState().choices).toBeNull();
    expect(vm.getState().dialogue?.text).toBe('You picked B');
  });

  it('supports deterministic rollback', () => {
    const code = `label start:
    "Step 1"
    "Step 2"
    "Step 3"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().dialogue?.text).toBe('Step 1');

    vm.next();
    expect(vm.getState().dialogue?.text).toBe('Step 2');

    vm.next();
    expect(vm.getState().dialogue?.text).toBe('Step 3');

    // Roll back to Step 2
    const rolledBack = vm.rollback();
    expect(rolledBack).toBe(true);
    expect(vm.getState().dialogue?.text).toBe('Step 2');

    // Roll back to Step 1
    vm.rollback();
    expect(vm.getState().dialogue?.text).toBe('Step 1');
  });

  it('supports save and load persistence', async () => {
    const code = `character yumia "Yumia"

label start:
    scene bg library
    yumia "Checkpoint 1"
    yumia "Checkpoint 2"
`;
    const story = compileScript(code);
    const storage = new MemoryStorageAdapter();
    const saveManager = new SaveManager(storage);
    const vm = new StoryVM(story, saveManager);

    vm.start(); // at Checkpoint 1
    await vm.save('slot_1');

    vm.next(); // at Checkpoint 2
    expect(vm.getState().dialogue?.text).toBe('Checkpoint 2');

    // Restore from save
    const loaded = await vm.load('slot_1');
    expect(loaded).toBe(true);
    expect(vm.getState().dialogue?.text).toBe('Checkpoint 1');
    expect(vm.getState().visual.background).toBe('bg library');
  });
});
