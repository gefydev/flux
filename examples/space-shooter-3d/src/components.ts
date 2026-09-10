import { defineComponent, definePackedComponent } from "@flux/ecs";

export const ShipTag = defineComponent("ShipTag", () => ({
  speed: 40,
  maxSpeed: 120,
  yaw: 0,
  pitch: 0,
  roll: 0,
  score: 0,
}));

export const AsteroidTag = defineComponent("AsteroidTag", () => ({
  rotSpeedY: 0.5,
  size: 2.0,
  hp: 2,
}));

export const LaserTag = defineComponent("LaserTag", () => ({
  life: 3.0, // seconds
}));

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
