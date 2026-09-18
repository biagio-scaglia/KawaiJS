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
    const playEvent = audioEvents.find((e) => e.action === 'play' && e.channel === 'music');
    expect(playEvent?.track).toBe('bgm_peaceful');
    detach();
  });

  it('handles voice state listeners and audio ducking options', () => {
    const audio = new AudioManager({
      ducking: true,
      duckRatio: 0.25
    });

    const voiceEvents: boolean[] = [];
    const unsubscribe = audio.onVoiceStateChange((isPlaying) => {
      voiceEvents.push(isPlaying);
    });

    audio.playVoice('test_voice.mp3');
    audio.stopVoice();

    expect(voiceEvents.length).toBeGreaterThanOrEqual(1);
    unsubscribe();
    audio.destroy();
  });

  it('queues music until unlock instead of creating Audio early', () => {
    const OriginalAudio = globalThis.Audio;
    let constructed = 0;
    // @ts-expect-error test stub
    globalThis.Audio = class {
      loop = false;
      volume = 1;
      paused = true;
      src = '';
      preload = '';
      constructor() {
        constructed++;
      }
      play() {
        this.paused = false;
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
      addEventListener() {}
      removeEventListener() {}
    };

    const audio = new AudioManager();
    // Before any gesture, playMusic must only queue — never construct HTMLAudioElement.
    audio.playMusic('track.mp3');
    expect(constructed).toBe(0);

    audio.destroy();
    globalThis.Audio = OriginalAudio;
  });
});
