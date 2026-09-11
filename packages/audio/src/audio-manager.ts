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
  private isMuted = false;

  private currentMusicAudio: HTMLAudioElement | null = null;
  private currentMusicTrack: string | null = null;
  private currentVoiceAudio: HTMLAudioElement | null = null;
  private soundPool: HTMLAudioElement[] = [];
  private isUnlocked = false;
  private pendingMusic: { src: string; options: PlayMusicOptions } | null = null;
  private musicFadeInterval: ReturnType<typeof setInterval> | null = null;
  private unlockHandler: (() => void) | null = null;

  constructor(options: AudioOptions = {}) {
    this.masterVolume = options.masterVolume ?? 1.0;
    this.musicVolume = options.musicVolume ?? 0.8;
    this.soundVolume = options.soundVolume ?? 1.0;
    this.voiceVolume = options.voiceVolume ?? 1.0;

    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.isUnlocked = true;
        if (this.pendingMusic) {
          const { src, options } = this.pendingMusic;
          this.pendingMusic = null;
          this.playMusic(src, options);
        }
        this.removeUnlockListeners();
      };
      this.unlockHandler = unlock;
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
    }
  }

  private removeUnlockListeners(): void {
    if (this.unlockHandler && typeof window !== 'undefined') {
      window.removeEventListener('click', this.unlockHandler);
      window.removeEventListener('keydown', this.unlockHandler);
      window.removeEventListener('touchstart', this.unlockHandler);
      this.unlockHandler = null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateActiveVolumes();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSoundVolume(): number {
    return this.soundVolume;
  }

  public getVoiceVolume(): number {
    return this.voiceVolume;
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    this.updateActiveVolumes();
  }

  public setMusicVolume(val: number): void {
    this.musicVolume = Math.max(0, Math.min(1, val));
    this.updateActiveVolumes();
  }

  public setSoundVolume(val: number): void {
    this.soundVolume = Math.max(0, Math.min(1, val));
  }

  public setVoiceVolume(val: number): void {
    this.voiceVolume = Math.max(0, Math.min(1, val));
    this.updateActiveVolumes();
  }

  public playMusic(src: string, options: PlayMusicOptions = {}): void {
    if (typeof Audio === 'undefined') return;

    if (this.currentMusicTrack === src && this.currentMusicAudio && !this.currentMusicAudio.paused) {
      return; // already playing this track
    }

    if (!this.isUnlocked) {
      this.pendingMusic = { src, options };
    }

    const fadein = options.fadein ?? 0;
    const loop = options.loop ?? true;
    const targetVolume = this.isMuted ? 0 : (options.volume ?? 1) * this.masterVolume * this.musicVolume;

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

    if (this.musicFadeInterval) {
      clearInterval(this.musicFadeInterval);
      this.musicFadeInterval = null;
    }

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
    const cleanup = () => {
      const idx = this.soundPool.indexOf(audio);
      if (idx !== -1) this.soundPool.splice(idx, 1);
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', cleanup);
    };
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);
  }

  public stopSound(): void {
    for (const audio of this.soundPool) {
      try {
        audio.pause();
        audio.src = '';
      } catch {}
    }
    this.soundPool = [];
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

  public destroy(): void {
    this.removeUnlockListeners();
    this.stopMusic();
    this.stopSound();
    this.stopVoice();
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
        } else if (event.channel === 'sound') {
          this.stopSound();
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
    if (this.musicFadeInterval) {
      clearInterval(this.musicFadeInterval);
      this.musicFadeInterval = null;
    }

    if (durationMs <= 0) {
      audio.volume = Math.max(0, Math.min(1, to));
      if (onComplete) onComplete();
      return;
    }

    const steps = 20;
    const stepTime = Math.max(10, durationMs / steps);
    const volumeStep = (to - from) / steps;
    let currentStep = 0;

    this.musicFadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(0, Math.min(1, from + volumeStep * currentStep));
      if (currentStep >= steps) {
        if (this.musicFadeInterval) {
          clearInterval(this.musicFadeInterval);
          this.musicFadeInterval = null;
        }
        audio.volume = Math.max(0, Math.min(1, to));
        if (onComplete) onComplete();
      }
    }, stepTime);
  }

  private updateActiveVolumes(): void {
    if (this.currentMusicAudio) {
      this.currentMusicAudio.volume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
    }
    if (this.currentVoiceAudio) {
      this.currentVoiceAudio.volume = this.isMuted ? 0 : this.masterVolume * this.voiceVolume;
    }
  }
}
