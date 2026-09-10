/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * High-performance WASM simulation bridge for particles and guided missiles.
 * Executes native C++ / Rust code through @flux/wasm CppWasmAdapter.
 */

import { CppWasmAdapter } from "@flux/wasm";

export interface IParticleData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface IMissileData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  speed: number;
  turnRate: number;
  life: number;
  active: boolean;
}

/**
 * High-performance WASM simulation bridge for particles and guided missiles.
 * Executes native C++ / Rust code through @flux/wasm CppWasmAdapter.
 */
export class WasmPhysicsEngine {
  private adapter = new CppWasmAdapter("PhysicsSim");
  public isReady = false;

  // Fallback storage if WASM is unavailable
  private fallbackParticles: IParticleData[] = [];
  private fallbackMissiles: IMissileData[] = [];

  public async init(): Promise<boolean> {
    try {
      const response = await fetch("/physics_sim.wasm");
      if (!response.ok) {
        throw new Error(`Failed to fetch /physics_sim.wasm: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      await this.adapter.load(buffer);
      this.isReady = true;
      console.log("⚡ [Flux Odyssey] C++ / WASM Physics Engine loaded successfully!");
      return true;
    } catch (err) {
      console.warn("⚠️ [Flux Odyssey] WASM loading fallback to JS runtime physics:", err);
      this.isReady = false;
      return false;
    }
  }

  public spawnExplosion(x: number, y: number, z: number, count = 35, speedScale = 1.0): void {
    if (this.isReady) {
      const exp = this.adapter.getExports();
      if (exp.spawn_explosion) {
        exp.spawn_explosion(x, y, z, count, speedScale);
        return;
      }
    }

    // Fallback
    for (let i = 0; i < count; i++) {
      const theta = (i * 17 % 360) * (Math.PI / 180);
      const phi = (i * 31 % 180) * (Math.PI / 180);
      const spd = (18 + (i % 30)) * speedScale;

      this.fallbackParticles.push({
        x, y, z,
        vx: spd * Math.sin(phi) * Math.cos(theta),
        vy: spd * Math.cos(phi),
        vz: spd * Math.sin(phi) * Math.sin(theta),
        life: 0.7 + (i % 12) * 0.08,
        maxLife: 0.7 + (i % 12) * 0.08,
        size: 0.9 + (i % 6) * 0.4,
        r: 1.0, g: 0.55, b: 0.15, a: 1.0,
      });
    }
  }

  public spawnEnginePlume(x: number, y: number, z: number, shipVx: number, shipVy: number, shipVz: number, yaw: number): void {
    const spd = 60.0 + Math.random() * 20.0;
    const spreadX = (Math.random() - 0.5) * 4.0;
    const spreadY = (Math.random() - 0.5) * 4.0;

    const vx = shipVx * 0.3 + Math.sin(yaw) * spd + spreadX;
    const vy = shipVy * 0.3 + spreadY;
    const vz = shipVz * 0.3 + Math.cos(yaw) * spd;

    if (this.isReady) {
      const exp = this.adapter.getExports();
      if (exp.spawn_particle) {
        exp.spawn_particle(x, y, z, vx, vy, vz, 0.25, 0.7, 0.1, 0.7, 1.0, 1.0);
        return;
      }
    }

    this.fallbackParticles.push({
      x, y, z, vx, vy, vz,
      life: 0.25, maxLife: 0.25, size: 0.7,
      r: 0.1, g: 0.7, b: 1.0, a: 1.0,
    });
  }

  public spawnMissile(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    targetX: number, targetY: number, targetZ: number,
    speed = 220, turnRate = 4.5, life = 5.0
  ): number {
    if (this.isReady) {
      const exp = this.adapter.getExports();
      if (exp.spawn_missile) {
        return exp.spawn_missile(x, y, z, vx, vy, vz, targetX, targetY, targetZ, speed, turnRate, life);
      }
    }

    this.fallbackMissiles.push({
      x, y, z, vx, vy, vz,
      targetX, targetY, targetZ,
      speed, turnRate, life,
      active: true,
    });
    return this.fallbackMissiles.length - 1;
  }

  public update(dt: number): void {
    if (this.isReady) {
      const exp = this.adapter.getExports();
      if (exp.update_particles) exp.update_particles(dt);
      if (exp.update_missiles) exp.update_missiles(dt);
      return;
    }

    // Fallback particle step
    for (let i = this.fallbackParticles.length - 1; i >= 0; i--) {
      const p = this.fallbackParticles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.fallbackParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= 0.982;
      p.vy *= 0.982;
      p.vz *= 0.982;
      p.a = p.life / p.maxLife;
    }

    // Fallback missile step
    for (let i = this.fallbackMissiles.length - 1; i >= 0; i--) {
      const m = this.fallbackMissiles[i]!;
      m.life -= dt;
      if (m.life <= 0) {
        this.fallbackMissiles.splice(i, 1);
        continue;
      }

      const dx = m.targetX - m.x;
      const dy = m.targetY - m.y;
      const dz = m.targetZ - m.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 0.001) {
        const inv = 1 / dist;
        const desVx = dx * inv * m.speed;
        const desVy = dy * inv * m.speed;
        const desVz = dz * inv * m.speed;
        const turn = m.turnRate * dt;
        m.vx += (desVx - m.vx) * turn;
        m.vy += (desVy - m.vy) * turn;
        m.vz += (desVz - m.vz) * turn;
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
    }
  }

  /**
   * Iterate over active particles for rendering.
   */
  public forEachParticle(callback: (p: IParticleData) => void): void {
    if (this.isReady) {
      const exp = this.adapter.getExports();
      if (exp.get_particle_buffer) {
        const ptr = exp.get_particle_buffer() as number;
        const f32 = this.adapter.bridge.f32;
        const floatOffset = ptr >> 2;
        const stride = 13;
        const max = (exp.get_max_particles ? exp.get_max_particles() : 1024) as number;

        for (let i = 0; i < max; i++) {
          const off = floatOffset + i * stride;
          const life = f32[off + 6]!;
          if (life > 0) {
            callback({
              x: f32[off + 0]!,
              y: f32[off + 1]!,
              z: f32[off + 2]!,
              vx: f32[off + 3]!,
              vy: f32[off + 4]!,
              vz: f32[off + 5]!,
              life,
              maxLife: f32[off + 7]!,
              size: f32[off + 8]!,
              r: f32[off + 9]!,
              g: f32[off + 10]!,
              b: f32[off + 11]!,
              a: f32[off + 12]!,
            });
          }
        }
        return;
      }
    }

    for (const p of this.fallbackParticles) {
      callback(p);
    }
  }

  /**
   * Iterate over active homing missiles.
   */
  public forEachMissile(callback: (m: IMissileData, index: number) => void): void {
    if (this.isReady) {
      const exp = this.adapter.getExports();
      if (exp.get_missile_buffer) {
        const ptr = exp.get_missile_buffer() as number;
        const f32 = this.adapter.bridge.f32;
        const i32 = this.adapter.bridge.i32;
        const wordOffset = ptr >> 2;
        const stride = 13;
        const max = 64;

        for (let i = 0; i < max; i++) {
          const off = wordOffset + i * stride;
          const active = i32[off + 12]! !== 0;
          if (active) {
            callback({
              x: f32[off + 0]!,
              y: f32[off + 1]!,
              z: f32[off + 2]!,
              vx: f32[off + 3]!,
              vy: f32[off + 4]!,
              vz: f32[off + 5]!,
              targetX: f32[off + 6]!,
              targetY: f32[off + 7]!,
              targetZ: f32[off + 8]!,
              speed: f32[off + 9]!,
              turnRate: f32[off + 10]!,
              life: f32[off + 11]!,
              active: true,
            }, i);
          }
        }
        return;
      }
    }

    for (let i = 0; i < this.fallbackMissiles.length; i++) {
      callback(this.fallbackMissiles[i]!, i);
    }
  }
}
