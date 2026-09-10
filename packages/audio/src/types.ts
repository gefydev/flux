export interface PlayOptions {
  volume?: number; // 0 to 1
  loop?: boolean;
  pitch?: number;  // playbackRate
  bus?: "master" | "music" | "sfx";
}

export interface SoundInstance {
  readonly id: number;
  stop(): void;
  setVolume(volume: number): void;
}
