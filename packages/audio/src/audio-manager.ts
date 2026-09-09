import type { AudioEvent, StoryVM } from '@kawaijs/runtime';

export interface AudioOptions {
  masterVolume?: number;
  musicVolume?: number;
  soundVolume?: number;
  voiceVolume?: number;
}

export interface PlayMusicOptions {
  fadein?: number;
  loop?: boolean;
  volume?: number;
}

export interface StopMusicOptions {
  fadeout?: number;
}

export class AudioManager {
  private masterVolume: number;
  private musicVolume: number;
  private soundVolume: number;
  private voiceVolume: number;

  private currentMusicAudio: HTMLAudioElement | null = null;
  private currentMusicTrack: string | null = null;
  private currentVoiceAudio: HTMLAudioElement | null = null;
  private soundPool: HTMLAudioElement[] = [];

  constructor(options: AudioOptions = {}) {
    this.masterVolume = options.masterVolume ?? 1.0;
    this.musicVolume = options.musicVolume ?? 0.8;
    this.soundVolume = options.soundVolume ?? 1.0;
    this.voiceVolume = options.voiceVolume ?? 1.0;
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    this.updateActiveVolumes();
  }

  public setMusicVolume(val: number): void {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.currentMusicAudio) {
      this.currentMusicAudio.volume = this.masterVolume * this.musicVolume;
    }
  }

  public setSoundVolume(val: number): void {
    this.soundVolume = Math.max(0, Math.min(1, val));
  }

  public setVoiceVolume(val: number): void {
    this.voiceVolume = Math.max(0, Math.min(1, val));
    if (this.currentVoiceAudio) {
      this.currentVoiceAudio.volume = this.masterVolume * this.voiceVolume;
    }
  }

  public playMusic(src: string, options: PlayMusicOptions = {}): void {
    if (typeof Audio === 'undefined') return;

    if (this.currentMusicTrack === src && this.currentMusicAudio && !this.currentMusicAudio.paused) {
      return; // already playing this track
    }

    const fadein = options.fadein ?? 0;
    const loop = options.loop ?? true;
    const targetVolume = (options.volume ?? 1) * this.masterVolume * this.musicVolume;

    // Fade out previous music if active
    if (this.currentMusicAudio) {
      this.stopMusic({ fadeout: fadein > 0 ? fadein : 0.3 });
    }

    const audio = new Audio(src);
    audio.loop = loop;
    this.currentMusicAudio = audio;
    this.currentMusicTrack = src;

    if (fadein > 0) {
      audio.volume = 0;
      audio.play().catch(() => {});
      this.fadeVolume(audio, 0, targetVolume, fadein * 1000);
    } else {
      audio.volume = targetVolume;
      audio.play().catch(() => {});
    }
  }

  public stopMusic(options: StopMusicOptions = {}): void {
    const fadeout = options.fadeout ?? 0;
    const audio = this.currentMusicAudio;
    if (!audio) return;

    this.currentMusicAudio = null;
    this.currentMusicTrack = null;

    if (fadeout > 0) {
      this.fadeVolume(audio, audio.volume, 0, fadeout * 1000, () => {
        audio.pause();
        audio.src = '';
      });
    } else {
      audio.pause();
      audio.src = '';
    }
  }

  public playSound(src: string, volume = 1): void {
    if (typeof Audio === 'undefined') return;

    const audio = new Audio(src);
    audio.volume = volume * this.masterVolume * this.soundVolume;
    audio.play().catch(() => {});

    this.soundPool.push(audio);
    audio.addEventListener('ended', () => {
      const idx = this.soundPool.indexOf(audio);
      if (idx !== -1) this.soundPool.splice(idx, 1);
    });
  }

  public playVoice(src: string, volume = 1): void {
    if (typeof Audio === 'undefined') return;

    if (this.currentVoiceAudio) {
      this.currentVoiceAudio.pause();
      this.currentVoiceAudio.src = '';
    }

    const audio = new Audio(src);
    audio.volume = volume * this.masterVolume * this.voiceVolume;
    audio.play().catch(() => {});
    this.currentVoiceAudio = audio;
  }

  public stopVoice(): void {
    if (this.currentVoiceAudio) {
      this.currentVoiceAudio.pause();
      this.currentVoiceAudio.src = '';
      this.currentVoiceAudio = null;
    }
  }

  /**
   * Attaches the AudioManager to a StoryVM instance to automatically play/stop tracks.
   */
  public attachToVM(
    vm: StoryVM,
    assetResolver: (track: string, channel: 'music' | 'sound' | 'voice') => string = (t) => t
  ): () => void {
    return vm.onAudioEvent((event: AudioEvent) => {
      if (event.action === 'play' && event.track) {
        const url = assetResolver(event.track, event.channel);
        if (event.channel === 'music') {
          this.playMusic(url, { fadein: event.fade, loop: event.loop });
        } else if (event.channel === 'sound') {
          this.playSound(url);
        } else if (event.channel === 'voice') {
          this.playVoice(url);
        }
      } else if (event.action === 'stop') {
        if (event.channel === 'music') {
          this.stopMusic({ fadeout: event.fade });
        } else if (event.channel === 'voice') {
          this.stopVoice();
        }
      }
    });
  }

  private fadeVolume(
    audio: HTMLAudioElement,
    from: number,
    to: number,
    durationMs: number,
    onComplete?: () => void
  ): void {
    const steps = 20;
    const stepTime = durationMs / steps;
    const volumeStep = (to - from) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(0, Math.min(1, from + volumeStep * currentStep));
      if (currentStep >= steps) {
        clearInterval(interval);
        audio.volume = to;
        if (onComplete) onComplete();
      }
    }, stepTime);
  }

  private updateActiveVolumes(): void {
    if (this.currentMusicAudio) {
      this.currentMusicAudio.volume = this.masterVolume * this.musicVolume;
    }
    if (this.currentVoiceAudio) {
      this.currentVoiceAudio.volume = this.masterVolume * this.voiceVolume;
    }
  }
}
