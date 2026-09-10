/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * Component definitions and packed contiguous SoA numeric buffers for Flux Odyssey.
 */

import { defineComponent, definePackedComponent } from "@flux/ecs";

export const ShipTag = defineComponent("ShipTag", () => ({
  speed: 60,
  maxSpeed: 210,
  yaw: 0,
  pitch: 0,
  roll: 0,
  score: 0,
  hp: 100,
  maxHp: 100,
  shield: 100,
  maxShield: 100,
  missiles: 12,
  maxMissiles: 24,
  combo: 0,
  empCharge: 100,
}));

export const EnemyTag = defineComponent("EnemyTag", () => ({
  type: "scout" as "scout" | "interceptor" | "gunship",
  hp: 4,
  maxHp: 4,
  fireCooldown: 1.5,
  rotSpeedY: 0.8,
  scoreValue: 150,
}));

export const AsteroidTag = defineComponent("AsteroidTag", () => ({
  rotSpeedX: 0.3,
  rotSpeedY: 0.6,
  size: 2.2,
  hp: 3,
  maxHp: 3,
}));

export const LaserTag = defineComponent("LaserTag", () => ({
  life: 2.8,
  isEnemy: false,
}));

export const CrystalTag = defineComponent("CrystalTag", () => ({
  value: 50,
  rotSpeed: 2.5,
  life: 15.0,
}));

export const ShieldEffectTag = defineComponent("ShieldEffectTag", () => ({
  intensity: 0.0,
}));

// Contiguous SoA packed buffers for massive entities
export const Position3D = definePackedComponent("Position3D", {
  x: 0,
  y: 0,
  z: 0,
});

export const Velocity3D = definePackedComponent("Velocity3D", {
  vx: 0,
  vy: 0,
  vz: 0,
});

export const Scale3D = definePackedComponent("Scale3D", {
  sx: 1,
  sy: 1,
  sz: 1,
});
