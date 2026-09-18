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
    expect(vm.getHistoryManager().getEntries().map((e) => e.text)).toEqual(['Step 1']);
  });

  it('trims dialogue history on rollback and restores it on save/load', async () => {
    const code = `label start:
    "Alpha"
    "Beta"
    "Gamma"
`;
    const story = compileScript(code);
    const storage = new MemoryStorageAdapter();
    const vm = new StoryVM(story, { saveManager: new SaveManager(storage) });

    vm.start();
    vm.next();
    vm.next();
    expect(vm.getHistoryManager().getEntries().map((e) => e.text)).toEqual(['Alpha', 'Beta', 'Gamma']);

    expect(vm.rollback()).toBe(true);
    expect(vm.getState().dialogue?.text).toBe('Beta');
    expect(vm.getHistoryManager().getEntries().map((e) => e.text)).toEqual(['Alpha', 'Beta']);

    const slot = await vm.save('1');
    expect(slot.schemaVersion).toBe(2);
    expect(slot.historyEntries?.map((e) => e.text)).toEqual(['Alpha', 'Beta']);

    vm.next();
    expect(vm.getHistoryManager().getLength()).toBe(3);

    const loaded = await vm.load('1');
    expect(loaded).toBe(true);
    expect(vm.getState().dialogue?.text).toBe('Beta');
    expect(vm.getHistoryManager().getEntries().map((e) => e.text)).toEqual(['Alpha', 'Beta']);
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

  it('keeps sakura particles when applying vfx tint overlay', () => {
    const code = `label start:
    vfx sakura
    vfx tint "#fda4af"
    "Petals under pink light"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().visual.vfx?.effect).toBe('sakura');
    expect(vm.getState().visual.vfx?.color).toBe('#fda4af');
  });

  it('supports define aliases, input prompts, and window hide/show', () => {
    const code = `define music theme = "bgm_theme"

label start:
    input player_name "Name?"
    window hide
    window show
    play music theme
    "Hi [player_name]"
`;
    const story = compileScript(code);
    expect(story.defines?.['music theme']).toBe('bgm_theme');

    const vm = new StoryVM(story);
    vm.start();
    expect(vm.getState().pendingInput?.variable).toBe('player_name');
    expect(vm.getState().isWaitingForInput).toBe(true);

    vm.next(); // must not skip input
    expect(vm.getState().pendingInput).not.toBeNull();

    vm.submitInput('Alex');
    expect(vm.getState().variables['player_name']).toBe('Alex');
    expect(vm.getState().windowVisible).toBe(true);
    expect(vm.getState().audio.music).toBe('bgm_theme');
    expect(vm.getState().dialogue?.text).toBe('Hi Alex');
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

  it('emits errors via onError and caps snapshot history to maxSnapshots', () => {
    const code = `label start:
    "Line 1"
    "Line 2"
    "Line 3"
    "Line 4"
    "Line 5"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story, { maxSnapshots: 2 });
    const errors: Error[] = [];
    vm.onError((err) => errors.push(err));

    vm.start();
    vm.next();
    vm.next();
    vm.next();
    vm.next();

    // With maxSnapshots: 2, only 1 rollback step is available
    expect(vm.rollback()).toBe(true);
    expect(vm.rollback()).toBe(false);
    expect(errors.length).toBe(0);
  });

  it('handles subroutine calls and returns correctly', () => {
    const story = {
      meta: { title: 'Test', author: 'Author' },
      characters: {},
      startLabel: 'start',
      labels: {
        start: [
          { type: 'dialogue' as const, speaker: 'narrator', text: 'Before call' },
          { type: 'call' as const, targetLabel: 'subroutine' },
          { type: 'dialogue' as const, speaker: 'narrator', text: 'After return' },
        ],
        subroutine: [
          { type: 'dialogue' as const, speaker: 'narrator', text: 'Inside subroutine' },
          { type: 'return' as const },
        ],
      },
    };

    const vm = new StoryVM(story);
    vm.start();
    expect(vm.getState().dialogue?.text).toBe('Before call');
    vm.next();
    expect(vm.getState().dialogue?.text).toBe('Inside subroutine');
    vm.next();
    expect(vm.getState().dialogue?.text).toBe('After return');
  });

  it('catches missing jump targets and emits error without crashing', () => {
    const story = {
      meta: { title: 'Test', author: 'Author' },
      characters: {},
      startLabel: 'start',
      labels: {
        start: [
          { type: 'jump' as const, targetLabel: 'non_existent_label' },
        ],
      },
    };

    const vm = new StoryVM(story);
    const errors: Error[] = [];
    vm.onError((err) => errors.push(err));

    vm.start();
    expect(errors.length).toBe(1);
    expect(errors[0]?.message).toContain('non_existent_label');
    expect(vm.getState().isFinished).toBe(true);
  });

  it('halts infinite self-jump loops via instruction budget', () => {
    const story = {
      meta: { startLabel: 'start' },
      characters: {},
      labels: {
        start: [{ type: 'jump' as const, targetLabel: 'start' }]
      }
    };
    const vm = new StoryVM(story, { maxInstructionsPerBurst: 25 });
    const errors: Error[] = [];
    vm.onError((err) => errors.push(err));

    vm.start();
    expect(vm.getState().isFinished).toBe(true);
    expect(errors.some((e) => e.message.includes('infinite loop') || e.message.includes('maximum'))).toBe(true);
  });

  it('clears dialogue history and virtual time on start()', () => {
    const code = `label start:
    "Hello"
    "World"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    vm.next();
    expect(vm.getHistoryManager().getEntries().length).toBe(2);

    vm.tick(500);
    expect(vm.getVirtualTime()).toBe(500);

    vm.start();
    expect(vm.getHistoryManager().getEntries().length).toBe(1); // only first line of restarted story
    expect(vm.getVirtualTime()).toBe(0);
    expect(vm.getState().dialogue?.text).toBe('Hello');
  });

  it('sets pendingPauseMs for timed pauses', () => {
    const code = `label start:
    pause 250
    "After pause"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);

    vm.start();
    expect(vm.getState().pendingPauseMs).toBe(250);
    expect(vm.getState().isWaitingForInput).toBe(true);

    vm.next();
    expect(vm.getState().pendingPauseMs).toBeNull();
    expect(vm.getState().dialogue?.text).toBe('After pause');
  });

  it('continues when all choice conditions filter out options', () => {
    const code = `label start:
    set flag = false
    menu:
        "Hidden" if flag:
            "Should not appear"
    "Continued"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);
    const errors: Error[] = [];
    vm.onError((err) => errors.push(err));

    vm.start();
    expect(vm.getState().dialogue?.text).toBe('Continued');
    expect(errors.some((e) => e.message.includes('zero available options'))).toBe(true);
  });

  it('resyncs music audio events on rollback and load', async () => {
    const code = `label start:
    play music theme loop
    "With music"
    stop music
    "Silent"
`;
    const story = compileScript(code);
    const storage = new MemoryStorageAdapter();
    const saveManager = new SaveManager(storage);
    const vm = new StoryVM(story, saveManager);
    const events: Array<{ action: string; channel: string; track?: string }> = [];
    vm.onAudioEvent((e) => events.push({ action: e.action, channel: e.channel, track: e.track }));

    vm.start();
    expect(vm.getState().audio.music).toBe('theme');
    await vm.save('1');

    vm.next(); // stop music -> Silent
    expect(vm.getState().audio.music).toBeNull();

    events.length = 0;
    vm.rollback();
    expect(vm.getState().audio.music).toBe('theme');
    expect(events.some((e) => e.action === 'play' && e.channel === 'music' && e.track === 'theme')).toBe(true);

    vm.next();
    events.length = 0;
    const loaded = await vm.load('1');
    expect(loaded).toBe(true);
    expect(vm.getState().dialogue?.text).toBe('With music');
    expect(events.some((e) => e.action === 'play' && e.track === 'theme')).toBe(true);
  });

  it('rejects saves without storyHash when validation is required and migrates old shape', async () => {
    const { migrateSaveSlot } = await import('../src/save.js');
    const migrated = migrateSaveSlot({
      id: '1',
      name: 'Slot 1',
      timestamp: 1,
      snapshot: {
        id: 'snap',
        timestamp: 1,
        state: {
          currentLabel: 'start',
          instructionPointer: 0,
          // missing pendingPauseMs / unlockedCGs on purpose
          callStack: [],
          variables: { a: 1 },
          visual: { background: 'bg classroom', transition: null, characters: {} },
          audio: { music: null },
          dialogue: { text: 'Hi' },
          choices: null,
          isWaitingForInput: true,
          isFinished: false
        }
      }
    });
    expect(migrated).not.toBeNull();
    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.historyEntries).toEqual([]);
    expect(migrated?.snapshot.state.pendingPauseMs).toBeNull();
    expect(migrated?.snapshot.state.unlockedCGs).toBeDefined();
    expect(migrated?.snapshot.state.variables['a']).toBe(1);

    const storage = new MemoryStorageAdapter();
    await storage.setItem(
      'kawaijs_save_9',
      JSON.stringify({
        id: '9',
        name: 'Old',
        timestamp: 1,
        snapshot: migrated!.snapshot
        // no storyHash
      })
    );
    const sm = new SaveManager(storage);
    const res = await sm.loadSlot('9', 'expectedhash');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('incompatible_story');
  });

  it('applies theme/style and waits on hotspots until selected', () => {
    const code = `label start:
    theme "noir"
    style dialogue glass
    hotspot door 10 20 30 40 jump room
    hotspot window 60 10 20 25 jump room
    "should not reach"

label room:
    "inside"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);
    vm.start();

    expect(vm.getState().theme).toBe('noir');
    expect(vm.getState().styleClasses['dialogue']).toBe('glass');
    expect(vm.getState().hotspots?.length).toBe(2);
    expect(vm.getState().isWaitingForInput).toBe(true);

    vm.next();
    expect(vm.getState().hotspots?.length).toBe(2);
    expect(vm.getState().dialogue).toBeNull();

    vm.selectHotspot('door');
    expect(vm.getState().hotspots).toBeNull();
    expect(vm.getState().dialogue?.text).toBe('inside');
  });

  it('can start at a deep-link label', () => {
    const code = `label start:
    "intro"

label courtyard:
    "direct"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);
    vm.start('courtyard');
    expect(vm.getState().dialogue?.text).toBe('direct');
  });

  it('seeds state variables when initialVariables option is provided', () => {
    const code = `label start:
    "karma is [karma]"
`;
    const story = compileScript(code);
    const vm = new StoryVM(story, { initialVariables: { karma: 42 } });
    expect(vm.getState().variables['karma']).toBe(42);
    vm.start();
    expect(vm.getState().dialogue?.text).toBe('karma is 42');
  });

  it('restores pendingInput across save/load so next() cannot skip the prompt', async () => {
    const code = `label start:
    input name "Name?"
    "Hi [name]"
    return
`;
    const story = compileScript(code);
    const sm = new SaveManager(new MemoryStorageAdapter());
    const vm = new StoryVM(story, { saveManager: sm });
    vm.start();
    expect(vm.getState().pendingInput?.variable).toBe('name');
    await vm.save('1');

    const vm2 = new StoryVM(story, { saveManager: sm });
    expect(await vm2.load('1')).toBe(true);
    expect(vm2.getState().pendingInput?.variable).toBe('name');
    vm2.next();
    expect(vm2.getState().pendingInput?.variable).toBe('name');
    vm2.submitInput('Ada');
    expect(vm2.getState().dialogue?.text).toBe('Hi Ada');
  });

  it('restores hotspots across save/load so next() cannot bypass them', async () => {
    const code = `label start:
    hotspot door 40 50 10 10 jump room
    "skip"

label room:
    "inside"
    return
`;
    const story = compileScript(code);
    const sm = new SaveManager(new MemoryStorageAdapter());
    const vm = new StoryVM(story, { saveManager: sm });
    vm.start();
    expect(vm.getState().hotspots?.length).toBe(1);
    await vm.save('1');

    const vm2 = new StoryVM(story, { saveManager: sm });
    expect(await vm2.load('1')).toBe(true);
    expect(vm2.getState().hotspots?.length).toBe(1);
    vm2.next();
    expect(vm2.getState().hotspots?.length).toBe(1);
    vm2.selectHotspot('door');
    expect(vm2.getState().dialogue?.text).toBe('inside');
  });

  it('jump() clears isFinished and pendingInput so playback can resume', () => {
    const code = `label start:
    return

label extra:
    "More"
    return
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);
    vm.start();
    expect(vm.getState().isFinished).toBe(true);
    vm.jump('extra');
    expect(vm.getState().isFinished).toBe(false);
    expect(vm.getState().dialogue?.text).toBe('More');
  });

  it('jump() away from an input prompt does not soft-lock next()', () => {
    const code = `label start:
    input x "?"
    "never"

label other:
    "ok"
    return
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);
    vm.start();
    expect(vm.getState().pendingInput).not.toBeNull();
    vm.jump('other');
    expect(vm.getState().pendingInput).toBeNull();
    expect(vm.getState().dialogue?.text).toBe('ok');
    vm.next();
    expect(vm.getState().isFinished).toBe(true);
  });

  it('clears executionTrace on restart', () => {
    const code = `label start:
    "a"
    return
`;
    const story = compileScript(code);
    const vm = new StoryVM(story);
    vm.start();
    const lenAfterFirst = vm.getExecutionTrace().length;
    vm.start();
    expect(vm.getExecutionTrace().length).toBe(lenAfterFirst);
    expect(vm.getExecutionTrace()[0]).toMatch(/^START/);
  });

  it('getState() returns a clone so host mutations cannot corrupt the VM', () => {
    const story = compileScript(`label start:
    set score = 1
    "hi"
`);
    const vm = new StoryVM(story);
    vm.start();
    const snapshot = vm.getState();
    snapshot.variables['score'] = 999;
    (snapshot as { dialogue: { text: string } | null }).dialogue = { text: 'hacked' };
    expect(vm.getState().variables['score']).toBe(1);
    expect(vm.getState().dialogue?.text).toBe('hi');
  });
});

