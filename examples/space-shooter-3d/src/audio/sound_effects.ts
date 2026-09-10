/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * Procedural sci-fi sound effects synthesizer utilizing @flux/audio.
 * Generates cinematic space combat audio entirely in-memory with zero network latency.
 */

import { AudioManager } from "@flux/audio";

export class SpaceAudioSystem {
  public audioManager = new AudioManager();

  private laserBuffer: AudioBuffer | null = null;
  private missileBuffer: AudioBuffer | null = null;
  private explosionBuffer: AudioBuffer | null = null;
  private shieldHitBuffer: AudioBuffer | null = null;
  private crystalBuffer: AudioBuffer | null = null;
  private engineBuffer: AudioBuffer | null = null;

  private engineInstance: any = null;

  public async init(): Promise<void> {
    if (!this.audioManager.isSupported) return;

    const ctx = (this.audioManager as any).ctx as AudioContext;
    if (!ctx) return;

    this.laserBuffer = this.synthesizeLaser(ctx);
    this.missileBuffer = this.synthesizeMissile(ctx);
    this.explosionBuffer = this.synthesizeExplosion(ctx);
    this.shieldHitBuffer = this.synthesizeShieldHit(ctx);
    this.crystalBuffer = this.synthesizeCrystal(ctx);
    this.engineBuffer = this.synthesizeEngineLoop(ctx);

    // Start background engine loop
    if (this.engineBuffer) {
      this.engineInstance = this.audioManager.play(this.engineBuffer, {
        bus: "sfx",
        volume: 0.15,
        loop: true,
        pitch: 1.0,
      });
    }
  }

  public resume(): void {
    this.audioManager.resume().catch(() => {});
  }

  public playLaser(): void {
    if (this.laserBuffer) {
      this.audioManager.play(this.laserBuffer, { bus: "sfx", volume: 0.35, pitch: 0.95 + Math.random() * 0.1 });
    }
  }

  public playMissileLaunch(): void {
    if (this.missileBuffer) {
      this.audioManager.play(this.missileBuffer, { bus: "sfx", volume: 0.5, pitch: 0.9 + Math.random() * 0.2 });
    }
  }

  public playExplosion(volume = 0.6): void {
    if (this.explosionBuffer) {
      this.audioManager.play(this.explosionBuffer, { bus: "sfx", volume, pitch: 0.85 + Math.random() * 0.3 });
    }
  }

  public playShieldHit(): void {
    if (this.shieldHitBuffer) {
      this.audioManager.play(this.shieldHitBuffer, { bus: "sfx", volume: 0.45, pitch: 0.9 + Math.random() * 0.2 });
    }
  }

  public playCrystalPickup(): void {
    if (this.crystalBuffer) {
      this.audioManager.play(this.crystalBuffer, { bus: "sfx", volume: 0.5 });
    }
  }

  public updateEnginePitch(speedFactor: number): void {
    if (!this.engineInstance || !(this.audioManager as any).ctx) return;
    // Modulate pitch from 0.8x up to 1.8x at full boost
    const targetPitch = 0.8 + speedFactor * 1.0;
    try {
      const source = (this.engineInstance as any).source;
      if (source && source.playbackRate) {
        source.playbackRate.value = targetPitch;
      }
    } catch {}
  }

  private synthesizeLaser(ctx: AudioContext): AudioBuffer {
    const duration = 0.18;
    const sampleRate = ctx.sampleRate;
    const samples = sampleRate * duration;
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      // Exponential chirp from 980Hz down to 120Hz
      const freq = 980 * Math.exp(-progress * 3.5);
      const amp = Math.pow(1.0 - progress, 1.6);
      data[i] = Math.sin(2 * Math.PI * freq * t) * amp * 0.65;
    }
    return buffer;
  }

  private synthesizeMissile(ctx: AudioContext): AudioBuffer {
    const duration = 0.4;
    const sampleRate = ctx.sampleRate;
    const samples = sampleRate * duration;
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const noise = Math.random() * 2 - 1;
      const sub = Math.sin(2 * Math.PI * (140 + progress * 200) * t);
      const amp = Math.sin(progress * Math.PI);
      data[i] = (noise * 0.4 + sub * 0.6) * amp * 0.7;
    }
    return buffer;
  }

  private synthesizeExplosion(ctx: AudioContext): AudioBuffer {
    const duration = 0.9;
    const sampleRate = ctx.sampleRate;
    const samples = sampleRate * duration;
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    let lastVal = 0;
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      // Low-pass filtered noise + sub-bass boom
      const white = Math.random() * 2 - 1;
      lastVal = (lastVal + 0.12 * white) / 1.12;
      const subBass = Math.sin(2 * Math.PI * (80 * Math.exp(-progress * 2.0)) * t);
      const env = Math.pow(1.0 - progress, 2.0);
      data[i] = (lastVal * 0.65 + subBass * 0.35) * env * 0.8;
    }
    return buffer;
  }

  private synthesizeShieldHit(ctx: AudioContext): AudioBuffer {
    const duration = 0.3;
    const sampleRate = ctx.sampleRate;
    const samples = sampleRate * duration;
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const wave1 = Math.sin(2 * Math.PI * 520 * t);
      const wave2 = Math.sin(2 * Math.PI * 780 * t);
      const noise = (Math.random() * 2 - 1) * 0.2;
      const env = Math.exp(-progress * 8.0);
      data[i] = (wave1 * 0.5 + wave2 * 0.3 + noise) * env * 0.6;
    }
    return buffer;
  }

  private synthesizeCrystal(ctx: AudioContext): AudioBuffer {
    const duration = 0.45;
    const sampleRate = ctx.sampleRate;
    const samples = sampleRate * duration;
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    // Arpeggiated crystal chime notes (E6, G#6, B6, E7)
    const notes = [1318.5, 1661.2, 1975.5, 2637.0];
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const noteIdx = Math.min(notes.length - 1, Math.floor((t / duration) * notes.length));
      const freq = notes[noteIdx]!;
      const subT = t - (noteIdx * duration) / notes.length;
      const env = Math.exp(-subT * 12.0);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
    }
    return buffer;
  }

  private synthesizeEngineLoop(ctx: AudioContext): AudioBuffer {
    const duration = 2.0;
    const sampleRate = ctx.sampleRate;
    const samples = sampleRate * duration;
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      // Dual sub-oscillators at 55Hz (A1) and 110Hz (A2) + slight white noise hum
      const osc1 = Math.sin(2 * Math.PI * 55 * t);
      const osc2 = Math.sin(2 * Math.PI * 110 * t) * 0.5;
      const noise = (Math.random() * 2 - 1) * 0.08;
      data[i] = (osc1 * 0.5 + osc2 + noise) * 0.4;
    }
    return buffer;
  }
}
