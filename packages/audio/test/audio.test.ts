import { describe, it, expect } from 'vitest';
import { AudioManager } from '../src/audio-manager.js';
import { StoryVM } from '@kawaijs/runtime';
import { compileScript } from '@kawaijs/parser';

describe('AudioManager', () => {
  it('instantiates with custom volumes and attaches to VM events', () => {
    const audio = new AudioManager({
      masterVolume: 0.8,
      musicVolume: 0.5,
      soundVolume: 0.9,
      voiceVolume: 0.7
    });

    const story = compileScript(`
label start:
    play music bgm_peaceful
    play sound click
    stop music
`);
    const vm = new StoryVM(story);
    const audioEvents: any[] = [];
    vm.onAudioEvent(e => audioEvents.push(e));

    const detach = audio.attachToVM(vm);
    vm.start();
    expect(audioEvents.length).toBeGreaterThan(0);
    expect(audioEvents[0]?.track).toBe('bgm_peaceful');
    detach();
  });
});
