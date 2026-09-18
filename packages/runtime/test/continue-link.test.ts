import { describe, it, expect } from 'vitest';
import { compileScript } from '@kawaijs/parser';
import {
  StoryVM,
  encodeContinueToken,
  decodeContinueToken,
  resolveContinueToken,
  buildContinueHref,
  compactSaveForContinueLink
} from '../src/index.js';

describe('continue-link', () => {
  const script = `character yumia "Yumia" #f43f5e
label start:
    yumia "Hello"
    jump next
label next:
    yumia "World"
    return
`;

  it('encodes and restores a save via continue token', async () => {
    const story = compileScript(script);
    const vm = new StoryVM(story);
    vm.start();
    vm.next();
    const slot = await vm.save('1');
    const token = encodeContinueToken(slot);
    expect(token).toBeTruthy();

    const restored = decodeContinueToken(token!);
    expect(restored).not.toBeNull();
    expect(restored!.snapshot.state.dialogue?.text).toBe(slot.snapshot.state.dialogue?.text);

    const vm2 = new StoryVM(story);
    const res = vm2.loadFromSlot(restored!);
    expect(res.success).toBe(true);
    expect(vm2.getState().dialogue?.text).toBe(slot.snapshot.state.dialogue?.text);
  });

  it('resolves continue tokens from search and hash', () => {
    expect(resolveContinueToken('?continue=abc', '')).toBe('abc');
    expect(resolveContinueToken('?c=xyz', '')).toBe('xyz');
    expect(resolveContinueToken('', '#continue=tok')).toBe('tok');
    expect(resolveContinueToken('', '#c=short')).toBe('short');
    expect(resolveContinueToken('?at=start', '')).toBeUndefined();
  });

  it('builds a continue href and rejects incompatible story hashes', async () => {
    const story = compileScript(script);
    const vm = new StoryVM(story);
    vm.start();
    const slot = await vm.save('1');
    const token = encodeContinueToken(compactSaveForContinueLink(slot))!;
    const href = buildContinueHref(token, 'https://example.com/game/?at=start');
    expect(href).toContain('continue=');
    expect(href).not.toContain('at=');

    const other = compileScript(`label start:\n    "other"\n`);
    const vmOther = new StoryVM(other);
    const bad = vmOther.loadFromSlot({ ...slot, storyHash: 'deadbeef' });
    expect(bad.success).toBe(false);
    expect(bad.reason).toBe('incompatible_story');
  });

  it('aligns historyLength with kept historyEntries when history is stripped', async () => {
    const story = compileScript(script);
    const vm = new StoryVM(story);
    vm.start();
    const slot = await vm.save('1');
    const withFakeHistory = {
      ...slot,
      historyEntries: Array.from({ length: 50 }, (_, i) => ({
        id: `h${i}`,
        text: `line ${i}`,
        timestamp: i
      })),
      snapshot: {
        ...slot.snapshot,
        historyLength: 50
      }
    };
    const compact = compactSaveForContinueLink(withFakeHistory, false);
    expect(compact.historyEntries).toEqual([]);
    expect(compact.snapshot.historyLength).toBe(0);
  });
});
