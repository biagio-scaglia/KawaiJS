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

  it('handles variable mutation and conditional branching (Complete Story Pipeline)', () => {
    const code = `character yumia "Yumia"

label start:
    set affection = 0
    yumia "Hello!"
    menu:
        "Be friendly":
            set affection += 1
            jump check_route
        "Be rude":
            set affection -= 1
            jump check_route

label check_route:
    if affection >= 1:
        jump good_end
    else:
        jump normal_end

label good_end:
    yumia "I like you!"
    return

label normal_end:
    yumia "Goodbye."
    return
`;
    const story = compileScript(code);

    // Route 1: Be friendly -> affection = 1 -> good_end
    const vmGood = new StoryVM(story);
    vmGood.start(); // dialogue "Hello!"
    expect(vmGood.getState().dialogue?.text).toBe('Hello!');
    
    vmGood.next(); // reaches menu
    expect(vmGood.getState().choices?.length).toBe(2);
    
    vmGood.choose(0); // "Be friendly"
    expect(vmGood.getState().variables['affection']).toBe(1);
    expect(vmGood.getState().dialogue?.text).toBe('I like you!');

    // Route 2: Be rude -> affection = -1 -> normal_end
    const vmNormal = new StoryVM(story);
    vmNormal.start();
    vmNormal.next();
    vmNormal.choose(1); // "Be rude"
    expect(vmNormal.getState().variables['affection']).toBe(-1);
    expect(vmNormal.getState().dialogue?.text).toBe('Goodbye.');
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

  it('executes structured if/else with fallthrough code seamlessly', () => {
    const code = `label start:
    set value = 10
    if value >= 10:
        "Branch high"
    else:
        "Branch low"
    "Continuation after if"
    return
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().dialogue?.text).toBe('Branch high');

    vm.next();
    expect(vm.getState().dialogue?.text).toBe('Continuation after if');

    vm.next();
    expect(vm.getState().isFinished).toBe(true);
  });

  it('executes structured menu choices with fallthrough code', () => {
    const code = `label start:
    menu:
        "Choice 1":
            "Picked 1"
        "Choice 2":
            "Picked 2"
    "Continuation after menu"
    return
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().choices?.length).toBe(2);

    vm.choose(0);
    expect(vm.getState().dialogue?.text).toBe('Picked 1');

    vm.next();
    expect(vm.getState().dialogue?.text).toBe('Continuation after menu');

    vm.next();
    expect(vm.getState().isFinished).toBe(true);
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

