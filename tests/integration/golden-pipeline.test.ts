import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Parser, compileScript } from '@kawaijs/parser';
import { StoryVM, computeStoryHash, MemoryStorageAdapter, SaveManager } from '@kawaijs/runtime';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

function readFixture(filename: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, filename), 'utf-8');
}

describe('Golden Pipeline & Deterministic Execution Tests', () => {
  describe('Linear Story Pipeline', () => {
    const source = readFixture('linear-story.kawa');

    it('parses AST accurately', () => {
      const ast = Parser.fromSource(source, 'linear-story.kawa').parse();
      expect(ast.type).toBe('Program');
      expect(ast.statements.length).toBe(3); // 2 characters + 1 label
      expect(ast.statements[0]?.type).toBe('CharacterDecl');
      expect(ast.statements[1]?.type).toBe('CharacterDecl');
      expect(ast.statements[2]?.type).toBe('LabelDecl');
    });

    it('compiles IR and computes deterministic storyHash', () => {
      const story = compileScript(source, 'linear-story.kawa');
      expect(story.characters['yumia']?.name).toBe('Yumia');
      expect(story.characters['sensei']?.name).toBe('Sensei');
      expect(story.labels['start']?.length).toBeGreaterThan(5);

      const hash1 = computeStoryHash(story);
      const hash2 = computeStoryHash(story);
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(8);
    });

    it('executes deterministically with canonical execution trace', () => {
      const story = compileScript(source, 'linear-story.kawa');
      const vm = new StoryVM(story);

      vm.start();
      // Step through dialogue 1
      expect(vm.getState().dialogue?.text).toBe('Good morning, Sensei!');
      vm.next();
      // Step through dialogue 2
      expect(vm.getState().dialogue?.text).toBe('Good morning, Yumia. Ready for class?');
      vm.next();
      // Step through narration
      expect(vm.getState().dialogue?.text).toBe('The bell chimes softly in the distance.');
      vm.next();
      // Story finishes
      expect(vm.getState().isFinished).toBe(true);

      const trace = vm.getExecutionTrace();
      expect(trace).toEqual([
        'START start',
        'SCENE bg classroom [fade]',
        'PLAY_AUDIO music:bgm_peaceful',
        'SHOW yumia happy at center',
        'DIALOGUE [Yumia] Good morning, Sensei!',
        'DIALOGUE [Sensei] Good morning, Yumia. Ready for class?',
        'SET affinity = 10',
        'SET affinity += 15',
        'DIALOGUE The bell chimes softly in the distance.',
        'HIDE yumia',
        'STOP_AUDIO music',
        'END'
      ]);
    });

    it('performs save/load roundtrip and enforces storyHash compatibility', async () => {
      const story = compileScript(source, 'linear-story.kawa');
      const storage = new MemoryStorageAdapter();
      const saveManager = new SaveManager(storage);
      const vm = new StoryVM(story, saveManager);

      vm.start();
      expect(vm.getState().dialogue?.text).toBe('Good morning, Sensei!');
      await vm.save('1');

      // Advance to end
      vm.next();
      vm.next();
      vm.next();
      expect(vm.getState().isFinished).toBe(true);

      // Restore save
      const loadResult = await vm.loadWithDetails('1');
      expect(loadResult.success).toBe(true);
      expect(loadResult.slot?.storyHash).toBe(vm.storyHash);
      expect(vm.getState().dialogue?.text).toBe('Good morning, Sensei!');
      expect(vm.getState().visual.background).toBe('bg classroom');

      // Incompatible story test: if story instructions change, loading must reject
      const modifiedStory = {
        ...story,
        labels: {
          ...story.labels,
          start: [
            ...story.labels['start']!,
            { type: 'dialogue' as const, text: 'Modified version instruction' }
          ]
        }
      };
      const vm2 = new StoryVM(modifiedStory, saveManager);
      expect(vm2.storyHash).not.toBe(vm.storyHash);

      const rejectedLoad = await vm2.loadWithDetails('1');
      expect(rejectedLoad.success).toBe(false);
      expect(rejectedLoad.reason).toBe('incompatible_story');
    });
  });

  describe('Branching Story Pipeline', () => {
    const source = readFixture('branching-story.kawa');

    it('evaluates choices dynamically and traces branches', () => {
      const story = compileScript(source, 'branching-story.kawa');
      const vm = new StoryVM(story);

      vm.start();
      // First dialogue
      expect(vm.getState().dialogue?.text).toBe('It looks like it might rain today.');
      vm.next();

      // Choices available: has_umbrella was false, courage is 15 >= 10
      const choices = vm.getState().choices;
      expect(choices).toBeDefined();
      expect(choices?.length).toBe(2);
      expect(choices?.[0]?.text).toBe('Offer a jacket');
      expect(choices?.[1]?.text).toBe('Run for shelter');

      // Choose choice 0 ("Offer a jacket")
      vm.choose(0);
      expect(vm.getState().dialogue?.text).toBe('You are so warm and kind, thank you!');
      expect(vm.getState().variables['affinity']).toBe(20);

      vm.next();
      expect(vm.getState().isFinished).toBe(true);

      const trace = vm.getExecutionTrace();
      expect(trace.some(t => t.startsWith('CHOOSE 0 (Offer a jacket)'))).toBe(true);
      expect(trace).toContain('JUMP offer_jacket');
      expect(trace).toContain('SET affinity = 20');
      expect(trace).toContain('DIALOGUE [Yumia] You are so warm and kind, thank you!');
      expect(trace).toContain('END');
    });
  });

  describe('Edge Cases & Security Hardening', () => {
    const source = readFixture('edge-cases.kawa');

    it('prevents prototype pollution completely and uses null prototype for state.variables', () => {
      const story = compileScript(source, 'edge-cases.kawa');
      const vm = new StoryVM(story);

      vm.start();
      while (!vm.getState().isFinished) {
        vm.next();
      }

      // 1. Prototype pollution assertions
      expect(Object.getPrototypeOf(vm.getState().variables)).toBe(null);
      expect((Object.prototype as unknown as Record<string, unknown>)['polluted']).toBeUndefined();
      expect((Object.prototype as unknown as Record<string, unknown>)['hacked']).toBeUndefined();
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
      expect(({} as Record<string, unknown>)['hacked']).toBeUndefined();

      // 2. Arithmetic & logical condition evaluations
      expect(vm.getState().variables['score']).toBe(75);
      expect(vm.getState().variables['flag']).toBe(true);

      // 3. Execution trace check
      const trace = vm.getExecutionTrace();
      expect(trace).toContain('SET score = 100');
      expect(trace).toContain('SET score -= 75');
      expect(trace).toContain('DIALOGUE High score verified.');
      expect(trace).toContain('DIALOGUE [Detective] Investigation complete.');
      expect(trace).not.toContain('DIALOGUE Should not enter this block.');
      expect(trace).not.toContain('DIALOGUE Score verification failed.');
    });

    it('provides deterministic virtual clock via vm.tick(deltaMs)', () => {
      const story = compileScript(source, 'edge-cases.kawa');
      const vm = new StoryVM(story);

      const recordedTicks: Array<{ delta: number; total: number }> = [];
      const unsubscribe = vm.onTick((delta, total) => {
        recordedTicks.push({ delta, total });
      });

      expect(vm.getVirtualTime()).toBe(0);
      vm.tick(16);
      vm.tick(33);
      vm.tick(51);

      expect(vm.getVirtualTime()).toBe(100);
      expect(recordedTicks).toEqual([
        { delta: 16, total: 16 },
        { delta: 33, total: 49 },
        { delta: 51, total: 100 }
      ]);

      unsubscribe();
      vm.tick(50);
      expect(vm.getVirtualTime()).toBe(150);
      expect(recordedTicks.length).toBe(3); // no new ticks recorded after unsubscribe
    });
  });
});
