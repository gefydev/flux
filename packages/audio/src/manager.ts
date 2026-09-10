import type { PlayOptions, SoundInstance } from "./types.js";

/**
 * High-performance audio manager supporting WebAudio nodes and volume buses.
 */
export class AudioManager {
  public masterVolume = 1.0;
  public musicVolume = 1.0;
  public sfxVolume = 1.0;

  private ctx: any = null;
  private nextInstanceId = 1;

  constructor() {
    const AudioCtxClass = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (AudioCtxClass) {
      try {
        this.ctx = new AudioCtxClass();
      } catch {
        this.ctx = null;
      }
    }
  }

  public get isSupported(): boolean {
    return this.ctx !== null;
  }

  /**
   * Resume audio context on user interaction (required by browser autoplay policies).
   */
  public async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  /**
   * Play an audio buffer with bus volume calculation.
   */
  public play(audioBuffer: any, options: PlayOptions = {}): SoundInstance {
    const id = this.nextInstanceId++;
    const bus = options.bus ?? "sfx";
    const baseVol = options.volume ?? 1.0;
    const busMultiplier = bus === "music" ? this.musicVolume : this.sfxVolume;
    const finalVolume = baseVol * busMultiplier * this.masterVolume;

    if (!this.ctx) {
      // Mock instance for headless/unsupported environments
      return {
        id,
        stop() {},
        setVolume(_vol: number) {},
      };
    }

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = options.loop ?? false;
      if (options.pitch) {
        source.playbackRate.value = options.pitch;
      }

      const gainNode = this.ctx.createGain();
      gainNode.gain.value = finalVolume;

      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      source.start();

      return {
        id,
        stop: () => {
          try {
            source.stop();
          } catch {}
        },
        setVolume: (vol: number) => {
          gainNode.gain.value = vol * busMultiplier * this.masterVolume;
        },
      };
    } catch {
      return {
        id,
        stop() {},
        setVolume(_vol: number) {},
      };
    }
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }
}
