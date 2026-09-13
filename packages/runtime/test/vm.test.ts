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

  it('filters choices when condition evaluates to false', () => {
    const code = `label start:
    set has_key = false
    set coins = 10
    menu:
        "Open door with key" if has_key:
            "Unlocked door"
        "Pay toll" if coins >= 5:
            "Paid toll"
        "Walk away":
            "Walked away"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    const choices = vm.getState().choices;
    expect(choices).toBeDefined();
    expect(choices?.length).toBe(2);
    expect(choices?.[0]?.text).toBe('Pay toll');
    expect(choices?.[1]?.text).toBe('Walk away');
  });

  it('evaluates undeclared variables as falsy in conditions without throwing', () => {
    const code = `label start:
    if undeclared_flag:
        "Should not happen"
    else:
        "Expected branch"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().dialogue?.text).toBe('Expected branch');
  });

  it('concatenates strings with += and resets state cleanly on start()', () => {
    const code = `label start:
    set greeting = "Hello, "
    set greeting += "World!"
    set counter = 1
    set counter += 5
    "Done"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().variables['greeting']).toBe('Hello, World!');
    expect(vm.getState().variables['counter']).toBe(6);
  });

  it('interpolates variables in dialogue and choices dynamically', () => {
    const code = `label start:
    set player_name = "Alex"
    set gold = 50
    "Welcome, [player_name]! You currently have [gold] coins."
    menu:
        "Give [gold] gold to [player_name]":
            "Gave gold!"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().dialogue?.text).toBe('Welcome, Alex! You currently have 50 coins.');

    vm.next();
    expect(vm.getState().choices?.length).toBe(1);
    expect(vm.getState().choices?.[0]?.text).toBe('Give 50 gold to Alex');
  });

  it('handles VFX states and CG unlocks seamlessly', () => {
    const code = `label start:
    vfx rain
    cg "event_cg_1.jpg" as "beach_cg"
    "Look at the rain!"
    vfx stop
    "Rain stopped."
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().visual.vfx?.effect).toBe('rain');
    expect(vm.getState().visual.activeCG).toBe('event_cg_1.jpg');
    expect(vm.getState().unlockedCGs?.['beach_cg']).toBe(true);

    vm.next();
    expect(vm.getState().visual.vfx).toBeNull();
  });

  it('triggers camera events for shake and flash', () => {
    const code = `label start:
    camera shake 600
    camera flash
    "Screen shook and flashed!"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);
    const cameraEvents: Array<{ action: string; duration?: number }> = [];

    vm.onCameraEvent((e) => cameraEvents.push(e));

    vm.start();
    expect(cameraEvents.length).toBe(2);
    expect(cameraEvents[0]?.action).toBe('shake');
    expect(cameraEvents[0]?.duration).toBe(600);
    expect(cameraEvents[1]?.action).toBe('flash');
    expect(vm.getState().dialogue?.text).toBe('Screen shook and flashed!');
  });
});



