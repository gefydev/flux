/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * Flux Odyssey - Ultra-realistic 3D Space Combat Simulator.
 * Orchestrates all Flux Engine packages: @flow.engine/core, @flow.engine/ecs, @flow.engine/math,
 * @flow.engine/runtime, @flow.engine/input, @flow.engine/assets, @flow.engine/resources, @flow.engine/audio,
 * @flow.engine/network, @flow.engine/platform, @flow.engine/scheduler, @flow.engine/wasm, @flow.engine/webgpu.
 */

import { Application } from "@flow.engine/core";
import { defineSystem } from "@flow.engine/ecs";
import { InputManager } from "@flow.engine/input";
import { Mat4, Vec3 } from "@flow.engine/math";
import { BrowserPlatform } from "@flow.engine/platform";
import { BufferUsage, FluxBuffer } from "@flow.engine/resources";
import { createRuntimePlugin } from "@flow.engine/runtime";
import { AssetManager } from "@flow.engine/assets";

import { SpaceAudioSystem } from "./audio/sound_effects.js";
import {
  AsteroidTag,
  CrystalTag,
  EnemyTag,
  LaserTag,
  Position3D,
  ShieldEffectTag,
  ShipTag,
  Velocity3D,
} from "./components.js";
import {
  createAsteroidMesh,
  createCrystalMesh,
  createEnemyDroneMesh,
  createLaserMesh,
  createMissileMesh,
  createShieldBubbleMesh,
  createStarfighterMesh,
} from "./geometry.js";
import { FlightTelemetryService } from "./network/telemetry.js";
import { SpaceRenderer } from "./render/space_renderer.js";
import { buildGameScheduler } from "./simulation/scheduler_setup.js";
import { WasmPhysicsEngine } from "./simulation/wasm_physics.js";

async function main() {
  const canvas = document.getElementById("flux-canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element '#flux-canvas' not found.");

  // 1. Platform & Window Setup (@flow.engine/platform)
  const platform = new BrowserPlatform();
  platform.setTitle("⚡ Flux Odyssey - 3D Space Combat Simulator");

  const resizeCanvas = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  };
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // 2. Flux Application & Capabilities (@flow.engine/core, @flow.engine/runtime)
  const app = new Application({ name: "Flux Odyssey" });
  app.use(createRuntimePlugin({ fixedTimeStep: 1 / 60 }));
  await app.init();

  // 3. Streaming Asset Manager (@flow.engine/assets)
  const assetManager = new AssetManager();
  let missionConfig = {
    sector: "Orion Nebula Rim - Sector 7",
    asteroidFieldDensity: 160,
    enemyWaves: [
      { wave: 1, scouts: 3, interceptors: 0, gunships: 0, name: "Vanguard Probes" },
      { wave: 2, scouts: 4, interceptors: 2, gunships: 0, name: "Interceptor Strike" },
      { wave: 3, scouts: 4, interceptors: 4, gunships: 1, name: "Dreadnought Fleet" },
    ],
  };

  try {
    const loaded = await assetManager.load("/mission.json");
    if (loaded && loaded.sector) missionConfig = loaded;
  } catch {
    console.log("⚡ Using built-in mission manifest for sector.");
  }

  // 4. Native C++ / Rust WASM Simulation Engine (@flow.engine/wasm)
  const wasmPhysics = new WasmPhysicsEngine();
  await wasmPhysics.init();

  // 5. Audio Synthesizer & Spatial Buses (@flow.engine/audio)
  const audio = new SpaceAudioSystem();
  await audio.init();
  window.addEventListener("click", () => audio.resume(), { once: true });
  window.addEventListener("keydown", () => audio.resume(), { once: true });

  // 6. Network Telemetry Service (@flow.engine/network)
  const telemetry = new FlightTelemetryService();

  // 7. GPU Resource Buffers (@flow.engine/resources)
  const particleBuffer = new FluxBuffer({
    label: "WasmParticlePositions",
    size: 1024 * 4 * 4, // 1024 vec4 floats
    usage: BufferUsage.Vertex | BufferUsage.CopyDst,
  });

  // 8. 3D PBR Dual-Pipeline Renderer
  const renderer = new SpaceRenderer(canvas);
  renderer.resize(canvas.width, canvas.height);
  window.addEventListener("resize", () => renderer.resize(canvas.width, canvas.height));

  // Upload Meshes
  const shipMesh = renderer.uploadMesh(createStarfighterMesh());
  const enemyDroneMesh = renderer.uploadMesh(createEnemyDroneMesh());
  const asteroidMesh = renderer.uploadMesh(createAsteroidMesh(2, 2.5));
  const laserMesh = renderer.uploadMesh(createLaserMesh());
  const missileMesh = renderer.uploadMesh(createMissileMesh());
  const crystalMesh = renderer.uploadMesh(createCrystalMesh());
  const shieldMesh = renderer.uploadMesh(createShieldBubbleMesh());

  // 9. Semantic Input System (@flow.engine/input)
  const input = new InputManager();
  input.attach(window);

  // Flight Controls
  input.actions.bindKey("PitchUp", "KeyS");
  input.actions.bindKey("PitchUp", "ArrowDown");
  input.actions.bindKey("PitchDown", "KeyW");
  input.actions.bindKey("PitchDown", "ArrowUp");
  input.actions.bindKey("TurnLeft", "KeyA");
  input.actions.bindKey("TurnLeft", "ArrowLeft");
  input.actions.bindKey("TurnRight", "KeyD");
  input.actions.bindKey("TurnRight", "ArrowRight");
  input.actions.bindKey("RollLeft", "KeyQ");
  input.actions.bindKey("RollRight", "KeyE");
  input.actions.bindKey("Boost", "ShiftLeft");
  input.actions.bindKey("Boost", "ShiftRight");

  // Weapons & Abilities
  input.actions.bindKey("PrimaryFire", "Space");
  input.actions.bindMouseButton("PrimaryFire", 0); // Left Click
  input.actions.bindKey("SecondaryFire", "KeyF");
  input.actions.bindMouseButton("SecondaryFire", 2); // Right Click
  input.actions.bindKey("EMP", "KeyR");

  // 10. Spawn Initial Entities into ECS World (@flow.engine/ecs)
  const world = app.world;

  // Player Starfighter
  const player = world.createEntity();
  world.add(player, ShipTag, {
    speed: 70,
    maxSpeed: 230,
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
    combo: 1,
    empCharge: 100,
  });
  world.add(player, ShieldEffectTag, { intensity: 0 });
  world.addPacked(player, Position3D, [0, 0, 0]);
  world.addPacked(player, Velocity3D, [0, 0, 0]);

  // Asteroid Belt (Procedural generation)
  const ASTEROID_COUNT = missionConfig.asteroidFieldDensity ?? 160;
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const ast = world.createEntity();
    const size = 1.6 + Math.random() * 2.8;
    world.add(ast, AsteroidTag, {
      rotSpeedX: (Math.random() - 0.5) * 0.8,
      rotSpeedY: (Math.random() - 0.5) * 1.2,
      size,
      hp: Math.ceil(size * 1.5),
      maxHp: Math.ceil(size * 1.5),
    });

    const x = (Math.random() - 0.5) * 700;
    const y = (Math.random() - 0.5) * 260;
    const z = (Math.random() - 0.5) * 1000 - 300;
    world.addPacked(ast, Position3D, [x, y, z]);
    world.addPacked(ast, Velocity3D, [
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
    ]);
  }

  // Spawner Helpers
  let currentWave = 1;
  let totalCrystalsCollected = 0;

  function spawnEnemySquadron(count: number, zOffset: number) {
    for (let i = 0; i < count; i++) {
      const drone = world.createEntity();
      world.add(drone, EnemyTag, {
        type: i % 3 === 0 ? "interceptor" : "scout",
        hp: i % 3 === 0 ? 6 : 3,
        maxHp: i % 3 === 0 ? 6 : 3,
        fireCooldown: 1.0 + Math.random() * 1.5,
        rotSpeedY: 1.0,
        scoreValue: i % 3 === 0 ? 300 : 150,
      });

      const x = (Math.random() - 0.5) * 400;
      const y = (Math.random() - 0.5) * 120;
      const z = zOffset - Math.random() * 250;
      world.addPacked(drone, Position3D, [x, y, z]);
      world.addPacked(drone, Velocity3D, [0, 0, 0]);
    }
  }

  // Spawn initial wave
  spawnEnemySquadron(4, -350);

  function spawnPlasmaLasers(x: number, y: number, z: number, yaw: number, pitch = 0, isEnemy = false) {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const offsets = isEnemy ? [0] : [-2.8, 2.8];

    const speed = isEnemy ? 190 : 340;
    const forwardX = -Math.sin(yaw) * Math.cos(pitch);
    const forwardY = Math.sin(pitch);
    const forwardZ = -Math.cos(yaw) * Math.cos(pitch);

    const dir = isEnemy ? -1 : 1;
    const vx = dir * forwardX * speed;
    const vy = dir * forwardY * speed;
    const vz = dir * forwardZ * speed;

    for (const wingX of offsets) {
      const lx = x + wingX * cosY;
      const lz = z - wingX * sinY;
      const laser = world.createEntity();
      world.add(laser, LaserTag, { life: 2.8, isEnemy, yaw, pitch });

      world.addPacked(laser, Position3D, [lx, y, lz]);
      world.addPacked(laser, Velocity3D, [vx, vy, vz]);
    }
    if (!isEnemy) audio.playLaser();
  }

  function spawnCrystal(x: number, y: number, z: number) {
    const crystal = world.createEntity();
    world.add(crystal, CrystalTag, { value: 100, rotSpeed: 2.5, life: 20 });
    world.addPacked(crystal, Position3D, [x, y, z]);
    world.addPacked(crystal, Velocity3D, [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
    ]);
  }

  // 11. Define Systems Bundle for @flow.engine/scheduler
  let shootCooldown = 0;
  let missileCooldown = 0;
  let cameraShake = 0;

  // System: Input & Actions
  const inputSystem = defineSystem(() => {
    // End frame input updates happen in renderSystem
  });

  // System: Flight & Kinematics
  const flightSystem = defineSystem((w, dt) => {
    shootCooldown -= dt;
    missileCooldown -= dt;

    const shipEnt = w.query(ShipTag).first();
    if (shipEnt === undefined) return;

    const ship = w.get(shipEnt, ShipTag)!;
    const pOff = w.getPackedOffset(shipEnt, Position3D);
    const vOff = w.getPackedOffset(shipEnt, Velocity3D);
    const pBuf = w.getPackedBuffer(Position3D);
    const vBuf = w.getPackedBuffer(Velocity3D);

    const turnSpeed = 2.4;
    const pitchSpeed = 2.0;
    const rollSpeed = 3.6;

    // Pitch Control (W / S or ArrowUp / ArrowDown)
    if (input.isPressed("PitchUp")) {
      ship.pitch = Math.min(1.35, ship.pitch + pitchSpeed * dt);
    } else if (input.isPressed("PitchDown")) {
      ship.pitch = Math.max(-1.35, ship.pitch - pitchSpeed * dt);
    } else {
      // Return pitch towards horizontal level
      ship.pitch *= Math.pow(0.2, dt);
    }

    // Yaw Control (A / D or ArrowLeft / ArrowRight)
    if (input.isPressed("TurnLeft")) {
      ship.yaw += turnSpeed * dt;
    } else if (input.isPressed("TurnRight")) {
      ship.yaw -= turnSpeed * dt;
    }

    // Roll Control (Q / E) & Aerodynamic Banking
    let manualRoll = false;
    if (input.isPressed("RollLeft")) {
      ship.roll += rollSpeed * dt;
      manualRoll = true;
    }
    if (input.isPressed("RollRight")) {
      ship.roll -= rollSpeed * dt;
      manualRoll = true;
    }

    if (!manualRoll) {
      if (input.isPressed("TurnLeft")) {
        const targetRoll = 0.6; // ~35° banking into turn
        ship.roll += (targetRoll - ship.roll) * dt * 5.0;
      } else if (input.isPressed("TurnRight")) {
        const targetRoll = -0.6;
        ship.roll += (targetRoll - ship.roll) * dt * 5.0;
      } else {
        // Return wings to level smoothly
        ship.roll *= Math.pow(0.08, dt);
      }
    }

    // Turbo Boost
    const isBoosting = input.isPressed("Boost");
    const targetSpeed = isBoosting ? ship.maxSpeed : 70;
    ship.speed += (targetSpeed - ship.speed) * dt * 4.0;

    // Full 3D Kinematic translation along forward vector
    const forwardX = -Math.sin(ship.yaw) * Math.cos(ship.pitch);
    const forwardY = Math.sin(ship.pitch);
    const forwardZ = -Math.cos(ship.yaw) * Math.cos(ship.pitch);

    vBuf[vOff + 0] = forwardX * ship.speed;
    vBuf[vOff + 1] = forwardY * ship.speed;
    vBuf[vOff + 2] = forwardZ * ship.speed;

    pBuf[pOff + 0] = pBuf[pOff + 0]! + vBuf[vOff + 0]! * dt;
    pBuf[pOff + 1] = pBuf[pOff + 1]! + vBuf[vOff + 1]! * dt;
    pBuf[pOff + 2] = pBuf[pOff + 2]! + vBuf[vOff + 2]! * dt;

    // Native C++ engine plume particles
    wasmPhysics.spawnEnginePlume(
      pBuf[pOff + 0]!, pBuf[pOff + 1]!, pBuf[pOff + 2]!,
      vBuf[vOff + 0]!, vBuf[vOff + 1]!, vBuf[vOff + 2]!,
      ship.yaw,
      ship.pitch
    );

    // Primary Weapons: Dual Plasma Blasters
    if (input.isPressed("PrimaryFire") && shootCooldown <= 0) {
      spawnPlasmaLasers(pBuf[pOff + 0]!, pBuf[pOff + 1]!, pBuf[pOff + 2]!, ship.yaw, ship.pitch, false);
      shootCooldown = isBoosting ? 0.12 : 0.16;
      cameraShake = 0.3;
    }

    // Secondary Weapons: Homing Missiles
    if (input.isPressed("SecondaryFire") && missileCooldown <= 0 && ship.missiles > 0) {
      ship.missiles--;
      missileCooldown = 0.6;
      audio.playMissileLaunch();

      // Find nearest enemy drone for homing lock
      let targetX = pBuf[pOff + 0]! + forwardX * 300;
      let targetY = pBuf[pOff + 1]! + forwardY * 300;
      let targetZ = pBuf[pOff + 2]! + forwardZ * 300;

      for (const enemyEnt of w.query(EnemyTag)) {
        const epOff = w.getPackedOffset(enemyEnt, Position3D);
        if (epOff >= 0) {
          targetX = pBuf[epOff + 0]!;
          targetY = pBuf[epOff + 1]!;
          targetZ = pBuf[epOff + 2]!;
          break;
        }
      }

      wasmPhysics.spawnMissile(
        pBuf[pOff + 0]!, pBuf[pOff + 1]!, pBuf[pOff + 2]!,
        vBuf[vOff + 0]! * 0.5, vBuf[vOff + 1]! * 0.5, vBuf[vOff + 2]! * 0.5,
        targetX, targetY, targetZ
      );
    }

    // EMP Shockwave
    if (input.isPressed("EMP") && ship.empCharge >= 100) {
      ship.empCharge = 0;
      audio.playExplosion(1.0);
      cameraShake = 1.2;
      wasmPhysics.spawnExplosion(pBuf[pOff + 0]!, pBuf[pOff + 1]!, pBuf[pOff + 2]!, 120, 2.5);

      // Wipe enemy projectiles and damage nearby drones
      const toWipe: number[] = [];
      for (const lEnt of w.query(LaserTag)) {
        const l = w.get(lEnt, LaserTag);
        if (l && l.isEnemy) toWipe.push(lEnt);
      }
      for (const ent of toWipe) w.destroyEntity(ent);

      for (const eEnt of w.query(EnemyTag)) {
        const enemy = w.get(eEnt, EnemyTag);
        if (enemy) {
          enemy.hp -= 4;
        }
      }
    } else {
      ship.empCharge = Math.min(100, ship.empCharge + dt * 10);
    }
  });

  // System: Native WASM Physics Step (@flow.engine/wasm)
  const wasmPhysicsSystem = defineSystem((_, dt) => {
    wasmPhysics.update(dt);
  });

  // System: Alien Drone Swarm AI
  const enemyAiSystem = defineSystem((w, dt) => {
    const shipEnt = w.query(ShipTag).first();
    if (shipEnt === undefined) return;
    const sOff = w.getPackedOffset(shipEnt, Position3D);
    if (sOff < 0) return;
    const sBuf = w.getPackedBuffer(Position3D);
    const sx = sBuf[sOff + 0]!, sy = sBuf[sOff + 1]!, sz = sBuf[sOff + 2]!;

    for (const ent of w.query(EnemyTag)) {
      const drone = w.get(ent, EnemyTag);
      if (!drone) continue;

      const pOff = w.getPackedOffset(ent, Position3D);
      const vOff = w.getPackedOffset(ent, Velocity3D);
      if (pOff < 0 || vOff < 0) continue;

      const pBuf = w.getPackedBuffer(Position3D);
      const vBuf = w.getPackedBuffer(Velocity3D);

      const dx = sx - pBuf[pOff + 0]!;
      const dy = sy - pBuf[pOff + 1]!;
      const dz = sz - pBuf[pOff + 2]!;
      const dist = Math.hypot(dx, dy, dz);

      // Turn towards player
      const targetYaw = Math.atan2(dx, dz);
      drone.rotSpeedY = targetYaw;

      // Swarm maneuvers: approach if far, circle if near
      const speed = drone.type === "scout" ? 85 : 55;
      if (dist > 120) {
        vBuf[vOff + 0] = (dx / dist) * speed;
        vBuf[vOff + 1] = (dy / dist) * speed;
        vBuf[vOff + 2] = (dz / dist) * speed;
      } else {
        // Circle strafe
        vBuf[vOff + 0] = (-dz / dist) * speed;
        vBuf[vOff + 2] = (dx / dist) * speed;
      }

      pBuf[pOff + 0] = pBuf[pOff + 0]! + vBuf[vOff + 0]! * dt;
      pBuf[pOff + 1] = pBuf[pOff + 1]! + vBuf[vOff + 1]! * dt;
      pBuf[pOff + 2] = pBuf[pOff + 2]! + vBuf[vOff + 2]! * dt;

      // Firing logic
      drone.fireCooldown -= dt;
      if (drone.fireCooldown <= 0 && dist < 450) {
        const horizDist = Math.hypot(dx, dz);
        const targetPitch = Math.atan2(dy, horizDist);
        spawnPlasmaLasers(pBuf[pOff + 0]!, pBuf[pOff + 1]!, pBuf[pOff + 2]!, drone.rotSpeedY, targetPitch, true);
        drone.fireCooldown = 1.8 + Math.random() * 1.2;
      }
    }
  });

  // System: Laser & Asteroid Kinematics
  const projectileSystem = defineSystem((w, dt) => {
    const toDestroy: number[] = [];

    // Lasers
    for (const ent of w.query(LaserTag)) {
      const laser = w.get(ent, LaserTag);
      if (!laser) continue;

      laser.life -= dt;
      if (laser.life <= 0) {
        toDestroy.push(ent);
        continue;
      }

      const pOff = w.getPackedOffset(ent, Position3D);
      const vOff = w.getPackedOffset(ent, Velocity3D);
      if (pOff < 0 || vOff < 0) continue;

      const pBuf = w.getPackedBuffer(Position3D);
      const vBuf = w.getPackedBuffer(Velocity3D);

      pBuf[pOff + 0] = pBuf[pOff + 0]! + vBuf[vOff + 0]! * dt;
      pBuf[pOff + 1] = pBuf[pOff + 1]! + vBuf[vOff + 1]! * dt;
      pBuf[pOff + 2] = pBuf[pOff + 2]! + vBuf[vOff + 2]! * dt;
    }

    for (const ent of toDestroy) w.destroyEntity(ent);

    // Asteroids
    for (const ent of w.query(AsteroidTag)) {
      const pOff = w.getPackedOffset(ent, Position3D);
      const vOff = w.getPackedOffset(ent, Velocity3D);
      if (pOff < 0 || vOff < 0) continue;

      const pBuf = w.getPackedBuffer(Position3D);
      const vBuf = w.getPackedBuffer(Velocity3D);

      pBuf[pOff + 0] = pBuf[pOff + 0]! + vBuf[vOff + 0]! * dt;
      pBuf[pOff + 1] = pBuf[pOff + 1]! + vBuf[vOff + 1]! * dt;
      pBuf[pOff + 2] = pBuf[pOff + 2]! + vBuf[vOff + 2]! * dt;
    }

    // Crystals
    const crystalsToDestroy: number[] = [];
    for (const ent of w.query(CrystalTag)) {
      const crystal = w.get(ent, CrystalTag);
      if (!crystal) continue;
      crystal.life -= dt;
      if (crystal.life <= 0) {
        crystalsToDestroy.push(ent);
        continue;
      }
      const pOff = w.getPackedOffset(ent, Position3D);
      const vOff = w.getPackedOffset(ent, Velocity3D);
      if (pOff < 0 || vOff < 0) continue;
      const pBuf = w.getPackedBuffer(Position3D);
      const vBuf = w.getPackedBuffer(Velocity3D);
      pBuf[pOff + 0] = pBuf[pOff + 0]! + vBuf[vOff + 0]! * dt;
      pBuf[pOff + 1] = pBuf[pOff + 1]! + vBuf[vOff + 1]! * dt;
      pBuf[pOff + 2] = pBuf[pOff + 2]! + vBuf[vOff + 2]! * dt;
    }
    for (const ent of crystalsToDestroy) w.destroyEntity(ent);
  });

  // System: 3D Combat Collisions (Lasers, Missiles, Drones, Asteroids, Player)
  const combatSystem = defineSystem((w) => {
    const shipEnt = w.query(ShipTag).first();
    const ship = shipEnt !== undefined ? w.get(shipEnt, ShipTag) : null;
    const shieldFX = shipEnt !== undefined ? w.get(shipEnt, ShieldEffectTag) : null;

    const lasersToDestroy: number[] = [];
    const enemiesToDestroy: number[] = [];

    const spOff = shipEnt !== undefined ? w.getPackedOffset(shipEnt, Position3D) : -1;
    const spBuf = w.getPackedBuffer(Position3D);
    const sx = spOff >= 0 ? spBuf[spOff + 0]! : 0;
    const sy = spOff >= 0 ? spBuf[spOff + 1]! : 0;
    const sz = spOff >= 0 ? spBuf[spOff + 2]! : 0;

    for (const laserEnt of w.query(LaserTag)) {
      const laser = w.get(laserEnt, LaserTag);
      if (!laser) continue;

      const lpOff = w.getPackedOffset(laserEnt, Position3D);
      if (lpOff < 0) continue;
      const lpBuf = w.getPackedBuffer(Position3D);
      const lx = lpBuf[lpOff + 0]!, ly = lpBuf[lpOff + 1]!, lz = lpBuf[lpOff + 2]!;

      // 1. Enemy Laser -> Player Ship
      if (laser.isEnemy && ship && spOff >= 0) {
        const distSq = (lx - sx) ** 2 + (ly - sy) ** 2 + (lz - sz) ** 2;
        if (distSq < 5.0 ** 2) {
          lasersToDestroy.push(laserEnt);
          audio.playShieldHit();
          if (shieldFX) shieldFX.intensity = 1.0;
          cameraShake = 0.8;

          if (ship.shield > 0) {
            ship.shield = Math.max(0, ship.shield - 15);
          } else {
            ship.hp = Math.max(0, ship.hp - 15);
            triggerDamageFlash();
          }
          continue;
        }
      }

      // 2. Player Laser -> Enemy Drones
      if (!laser.isEnemy) {
        for (const enemyEnt of w.query(EnemyTag)) {
          const enemy = w.get(enemyEnt, EnemyTag);
          if (!enemy) continue;

          const epOff = w.getPackedOffset(enemyEnt, Position3D);
          if (epOff < 0) continue;
          const epBuf = w.getPackedBuffer(Position3D);
          const ex = epBuf[epOff + 0]!, ey = epBuf[epOff + 1]!, ez = epBuf[epOff + 2]!;

          const distSq = (lx - ex) ** 2 + (ly - ey) ** 2 + (lz - ez) ** 2;
          if (distSq < 3.8 ** 2) {
            lasersToDestroy.push(laserEnt);
            enemy.hp--;
            wasmPhysics.spawnExplosion(lx, ly, lz, 8, 0.5);

            if (enemy.hp <= 0) {
              enemiesToDestroy.push(enemyEnt);
              audio.playExplosion();
              wasmPhysics.spawnExplosion(ex, ey, ez, 45, 1.4);
              spawnCrystal(ex, ey, ez);
              if (ship) ship.score += enemy.scoreValue * ship.combo;
            }
            break;
          }
        }
      }

      // 3. Player Laser -> Asteroids
      if (!laser.isEnemy) {
        for (const astEnt of w.query(AsteroidTag)) {
          const ast = w.get(astEnt, AsteroidTag);
          if (!ast) continue;

          const apOff = w.getPackedOffset(astEnt, Position3D);
          if (apOff < 0) continue;
          const apBuf = w.getPackedBuffer(Position3D);
          const ax = apBuf[apOff + 0]!, ay = apBuf[apOff + 1]!, az = apBuf[apOff + 2]!;

          const distSq = (lx - ax) ** 2 + (ly - ay) ** 2 + (lz - az) ** 2;
          if (distSq < (ast.size + 0.8) ** 2) {
            lasersToDestroy.push(laserEnt);
            ast.hp--;
            wasmPhysics.spawnExplosion(lx, ly, lz, 10, 0.4);

            if (ast.hp <= 0) {
              audio.playExplosion();
              wasmPhysics.spawnExplosion(ax, ay, az, 35, 1.0);
              spawnCrystal(ax, ay, az);
              if (ship) ship.score += 75;

              // Respawn asteroid ahead
              apBuf[apOff + 0] = (Math.random() - 0.5) * 600;
              apBuf[apOff + 1] = (Math.random() - 0.5) * 200;
              apBuf[apOff + 2] = lz - 450 - Math.random() * 250;
              ast.hp = ast.maxHp;
            }
            break;
          }
        }
      }
    }

    // 4. WASM Homing Missiles -> Enemy Drones & Asteroids
    wasmPhysics.forEachMissile((m, idx) => {
      for (const enemyEnt of w.query(EnemyTag)) {
        const enemy = w.get(enemyEnt, EnemyTag);
        if (!enemy) continue;

        const epOff = w.getPackedOffset(enemyEnt, Position3D);
        if (epOff < 0) continue;
        const epBuf = w.getPackedBuffer(Position3D);
        const ex = epBuf[epOff + 0]!, ey = epBuf[epOff + 1]!, ez = epBuf[epOff + 2]!;

        const distSq = (m.x - ex) ** 2 + (m.y - ey) ** 2 + (m.z - ez) ** 2;
        if (distSq < 5.5 ** 2) {
          m.active = false;
          enemy.hp -= 4; // High missile blast damage
          audio.playExplosion(0.8);
          wasmPhysics.spawnExplosion(ex, ey, ez, 50, 1.8);

          if (enemy.hp <= 0) {
            enemiesToDestroy.push(enemyEnt);
            spawnCrystal(ex, ey, ez);
            if (ship) ship.score += enemy.scoreValue * 2;
          }
          break;
        }
      }
    });

    for (const ent of lasersToDestroy) w.destroyEntity(ent);
    for (const ent of enemiesToDestroy) w.destroyEntity(ent);

    // Natural shield regeneration over time
    if (ship && ship.shield < ship.maxShield) {
      ship.shield = Math.min(ship.maxShield, ship.shield + 0.05);
    }
  });

  // System: Loot & Crystal Magnetization
  const lootSystem = defineSystem((w, dt) => {
    const shipEnt = w.query(ShipTag).first();
    if (shipEnt === undefined) return;
    const ship = w.get(shipEnt, ShipTag)!;

    const spOff = w.getPackedOffset(shipEnt, Position3D);
    if (spOff < 0) return;
    const spBuf = w.getPackedBuffer(Position3D);
    const sx = spBuf[spOff + 0]!, sy = spBuf[spOff + 1]!, sz = spBuf[spOff + 2]!;

    const collected: number[] = [];

    for (const cEnt of w.query(CrystalTag)) {
      const crystal = w.get(cEnt, CrystalTag);
      if (!crystal) continue;

      const cpOff = w.getPackedOffset(cEnt, Position3D);
      const cvOff = w.getPackedOffset(cEnt, Velocity3D);
      if (cpOff < 0 || cvOff < 0) continue;

      const cpBuf = w.getPackedBuffer(Position3D);
      const cvBuf = w.getPackedBuffer(Velocity3D);

      const dx = sx - cpBuf[cpOff + 0]!;
      const dy = sy - cpBuf[cpOff + 1]!;
      const dz = sz - cpBuf[cpOff + 2]!;
      const dist = Math.hypot(dx, dy, dz);

      // Magnetize when ship is within 65m
      if (dist < 65.0) {
        const pull = 160.0 / Math.max(1, dist);
        cvBuf[cvOff + 0] = cvBuf[cvOff + 0]! + dx * pull * dt;
        cvBuf[cvOff + 1] = cvBuf[cvOff + 1]! + dy * pull * dt;
        cvBuf[cvOff + 2] = cvBuf[cvOff + 2]! + dz * pull * dt;
      }

      // Collect crystal
      if (dist < 4.5) {
        collected.push(cEnt);
        totalCrystalsCollected++;
        ship.score += crystal.value;
        ship.shield = Math.min(ship.maxShield, ship.shield + 20);
        ship.missiles = Math.min(ship.maxMissiles, ship.missiles + 2);
        audio.playCrystalPickup();
      }
    }

    for (const ent of collected) w.destroyEntity(ent);
  });

  // System: Waves & Objective Progression
  let waveTimer = 0;
  const waveSystem = defineSystem((w, dt) => {
    let enemyCount = 0;
    for (const _ of w.query(EnemyTag)) enemyCount++;

    if (enemyCount === 0) {
      waveTimer += dt;
      if (waveTimer >= 3.0) {
        currentWave++;
        waveTimer = 0;
        const count = Math.min(10, currentWave * 3);

        const shipEnt = w.query(ShipTag).first();
        const sOff = shipEnt !== undefined ? w.getPackedOffset(shipEnt, Position3D) : -1;
        const spBuf = w.getPackedBuffer(Position3D);
        const sz = sOff >= 0 ? spBuf[sOff + 2]! : 0;

        spawnEnemySquadron(count, sz - 500);
      }
    }
  });

  // System: Network Flight Telemetry Stream (@flow.engine/network)
  let lastTelemetryStream = performance.now();
  const telemetrySystem = defineSystem((w) => {
    const now = performance.now();
    if (now - lastTelemetryStream >= 100) {
      const shipEnt = w.query(ShipTag).first();
      if (shipEnt !== undefined) {
        const ship = w.get(shipEnt, ShipTag)!;
        const sOff = w.getPackedOffset(shipEnt, Position3D);
        if (sOff >= 0) {
          const sBuf = w.getPackedBuffer(Position3D);
          telemetry.serializeFlightState({
            timestamp: now,
            x: sBuf[sOff + 0]!,
            y: sBuf[sOff + 1]!,
            z: sBuf[sOff + 2]!,
            speed: ship.speed,
            yaw: ship.yaw,
            pitch: ship.pitch,
            roll: ship.roll,
            hp: ship.hp,
            shield: ship.shield,
            score: ship.score,
            wave: currentWave,
          });
        }
      }
      lastTelemetryStream = now;
    }
  });

  // System: Dynamic Audio Modulation (@flow.engine/audio)
  const audioSystem = defineSystem((w) => {
    const shipEnt = w.query(ShipTag).first();
    if (shipEnt !== undefined) {
      const ship = w.get(shipEnt, ShipTag)!;
      const speedFactor = (ship.speed - 70) / (ship.maxSpeed - 70);
      audio.updateEnginePitch(Math.max(0, Math.min(1, speedFactor)));
    }
  });

  // System: Rendering & HUD Interface
  // HUD Elements
  const statFps = document.getElementById("stat-fps")!;
  const statMs = document.getElementById("stat-ms")!;
  const statEntities = document.getElementById("stat-entities")!;
  const statMem = document.getElementById("stat-mem")!;
  const statWasm = document.getElementById("stat-wasm")!;
  const statNet = document.getElementById("stat-net")!;
  const statAttitude = document.getElementById("stat-attitude");

  const hudWave = document.getElementById("hud-wave")!;
  const hudScore = document.getElementById("hud-score")!;
  const hudCrystals = document.getElementById("hud-crystals")!;

  const barShield = document.getElementById("bar-shield")!;
  const labelShield = document.getElementById("label-shield")!;
  const barHull = document.getElementById("bar-hull")!;
  const labelHull = document.getElementById("label-hull")!;
  const barEmp = document.getElementById("bar-emp")!;
  const labelEmp = document.getElementById("label-emp")!;
  const labelMissiles = document.getElementById("label-missiles")!;

  const crosshairEl = document.getElementById("hud-crosshair")!;
  const targetBoxEl = document.getElementById("hud-target-box")!;
  const damageFlashEl = document.getElementById("damage-flash")!;

  function triggerDamageFlash() {
    if (damageFlashEl) {
      damageFlashEl.style.opacity = "0.7";
      setTimeout(() => (damageFlashEl.style.opacity = "0"), 120);
    }
  }

  // Pre-allocated particle typed arrays for GPU upload
  const particlePosData = new Float32Array(1024 * 4);
  const particleColData = new Float32Array(1024 * 4);

  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  const renderSystem = defineSystem((w, dt) => {
    const time = performance.now() * 0.001;

    const shipEnt = w.query(ShipTag).first();
    if (shipEnt === undefined) return;

    const ship = w.get(shipEnt, ShipTag)!;
    const shieldFX = w.get(shipEnt, ShieldEffectTag)!;
    if (shieldFX.intensity > 0) {
      shieldFX.intensity = Math.max(0, shieldFX.intensity - dt * 2.5);
    }

    const sOff = w.getPackedOffset(shipEnt, Position3D);
    if (sOff < 0) return;
    const sBuf = w.getPackedBuffer(Position3D);
    const sx = sBuf[sOff + 0]!, sy = sBuf[sOff + 1]!, sz = sBuf[sOff + 2]!;

    // Camera follow offset with camera shake
    cameraShake = Math.max(0, cameraShake - dt * 2.0);
    const shakeX = (Math.random() - 0.5) * cameraShake * 1.5;
    const shakeY = (Math.random() - 0.5) * cameraShake * 1.5;

    // Ship 3D orientation vectors
    const fX = -Math.sin(ship.yaw) * Math.cos(ship.pitch);
    const fY = Math.sin(ship.pitch);
    const fZ = -Math.cos(ship.yaw) * Math.cos(ship.pitch);

    // Ship local up vector before roll
    const uX = Math.sin(ship.yaw) * Math.sin(ship.pitch);
    const uY = Math.cos(ship.pitch);
    const uZ = Math.cos(ship.yaw) * Math.sin(ship.pitch);

    // Ship local right vector
    const rX = -Math.cos(ship.yaw);
    const rY = 0;
    const rZ = Math.sin(ship.yaw);

    // Apply roll to camera up vector
    const cosR = Math.cos(ship.roll);
    const sinR = Math.sin(ship.roll);
    const camUpX = uX * cosR - rX * sinR;
    const camUpY = uY * cosR - rY * sinR;
    const camUpZ = uZ * cosR - rZ * sinR;

    const camDist = 19.0;
    const camHeight = 5.2;
    const camX = sx - fX * camDist + camUpX * camHeight + shakeX;
    const camY = sy - fY * camDist + camUpY * camHeight + shakeY;
    const camZ = sz - fZ * camDist + camUpZ * camHeight;

    renderer.cameraPos = new Vec3(camX, camY, camZ);

    // Build View Matrix (lookAt) looking slightly ahead of the ship
    buildLookAt(
      renderer.viewMatrix,
      new Vec3(camX, camY, camZ),
      new Vec3(sx + fX * 10.0, sy + fY * 10.0 + camUpY * 0.8, sz + fZ * 10.0),
      new Vec3(camUpX, camUpY, camUpZ)
    );

    // Forward direction for skybox parallax
    const camDir = new Vec3(fX, fY, fZ);
    renderer.beginFrame(time, camDir);

    // 1. Draw Player Starfighter
    const isBoosting = input.isPressed("Boost");
    renderer.drawMesh(
      shipMesh,
      new Vec3(sx, sy, sz),
      ship.yaw,
      ship.pitch,
      ship.roll,
      1.0,
      {
        color: [0.15, 0.75, 1.0],
        emissive: isBoosting ? 0.9 : 0.2,
        metallic: 0.85,
        roughness: 0.25,
      }
    );

    // 2. Draw Shield Bubble when hit or shielding
    if (shieldFX.intensity > 0.05 || isBoosting) {
      renderer.drawShield(
        shieldMesh,
        new Vec3(sx, sy, sz),
        time,
        shieldFX.intensity,
        [0.2, 0.75, 1.0]
      );
    }

    // 3. Draw Enemy Alien Drones
    for (const ent of w.query(EnemyTag)) {
      const drone = w.get(ent, EnemyTag);
      if (!drone) continue;
      const off = w.getPackedOffset(ent, Position3D);
      if (off < 0) continue;
      const buf = w.getPackedBuffer(Position3D);

      renderer.drawMesh(
        enemyDroneMesh,
        new Vec3(buf[off + 0]!, buf[off + 1]!, buf[off + 2]!),
        drone.rotSpeedY,
        0,
        0,
        drone.type === "interceptor" ? 1.8 : 1.2,
        {
          color: drone.type === "interceptor" ? [0.95, 0.2, 0.2] : [1.0, 0.45, 0.1],
          emissive: 0.5,
          metallic: 0.7,
          roughness: 0.3,
        }
      );
    }

    // 4. Draw Asteroid Field
    for (const ent of w.query(AsteroidTag)) {
      const ast = w.get(ent, AsteroidTag);
      if (!ast) continue;
      const off = w.getPackedOffset(ent, Position3D);
      if (off < 0) continue;
      const buf = w.getPackedBuffer(Position3D);

      renderer.drawMesh(
        asteroidMesh,
        new Vec3(buf[off + 0]!, buf[off + 1]!, buf[off + 2]!),
        ast.rotSpeedY * time,
        ast.rotSpeedX * time,
        0,
        ast.size,
        {
          color: [0.7, 0.55, 0.45],
          emissive: 0.0,
          metallic: 0.2,
          roughness: 0.8,
        }
      );
    }

    // 5. Draw Lasers (Cyan for player, Red for enemy)
    for (const ent of w.query(LaserTag)) {
      const laser = w.get(ent, LaserTag);
      if (!laser) continue;
      const off = w.getPackedOffset(ent, Position3D);
      if (off < 0) continue;
      const buf = w.getPackedBuffer(Position3D);

      renderer.drawMesh(
        laserMesh,
        new Vec3(buf[off + 0]!, buf[off + 1]!, buf[off + 2]!),
        laser.yaw,
        laser.pitch,
        0,
        1.0,
        {
          color: laser.isEnemy ? [1.0, 0.2, 0.2] : [0.1, 1.0, 0.9],
          emissive: 1.0,
          metallic: 0.0,
          roughness: 0.0,
          useTexture: false,
        }
      );
    }

    // 6. Draw Homing Missiles
    wasmPhysics.forEachMissile((m) => {
      const yaw = Math.atan2(m.vx, m.vz);
      const horiz = Math.hypot(m.vx, m.vz);
      const pitch = Math.atan2(m.vy, horiz);
      renderer.drawMesh(
        missileMesh,
        new Vec3(m.x, m.y, m.z),
        yaw,
        pitch,
        0,
        1.0,
        {
          color: [0.95, 0.85, 0.2],
          emissive: 0.6,
          metallic: 0.8,
          roughness: 0.3,
        }
      );
    });

    // 7. Draw Antimatter Crystals (Loot)
    for (const ent of w.query(CrystalTag)) {
      const crystal = w.get(ent, CrystalTag);
      if (!crystal) continue;
      const off = w.getPackedOffset(ent, Position3D);
      if (off < 0) continue;
      const buf = w.getPackedBuffer(Position3D);

      renderer.drawMesh(
        crystalMesh,
        new Vec3(buf[off + 0]!, buf[off + 1]!, buf[off + 2]!),
        crystal.rotSpeed * time,
        crystal.rotSpeed * time * 0.7,
        0,
        1.0,
        {
          color: [0.2, 1.0, 0.6],
          emissive: 0.8,
          metallic: 0.9,
          roughness: 0.1,
        }
      );
    }

    // 8. Draw WASM Particles (Billboard fire, warp dust & explosions)
    let pCount = 0;
    wasmPhysics.forEachParticle((p) => {
      if (pCount < 1024) {
        const off = pCount * 4;
        particlePosData[off + 0] = p.x;
        particlePosData[off + 1] = p.y;
        particlePosData[off + 2] = p.z;
        particlePosData[off + 3] = p.size;

        particleColData[off + 0] = p.r;
        particleColData[off + 1] = p.g;
        particleColData[off + 2] = p.b;
        particleColData[off + 3] = p.a;
        pCount++;
      }
    });
    renderer.drawParticles(particlePosData, particleColData, pCount);

    // 9. Update Cockpit HUD & Telemetry every 150ms
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 150) {
      const deltaMs = (now - lastFpsUpdate) / frameCount;
      const fps = (1000 / deltaMs).toFixed(1);

      statFps.innerText = `${fps}`;
      statMs.innerText = `${deltaMs.toFixed(2)} ms`;

      let activeEnts = 0;
      for (const _ of w.query(ShipTag)) activeEnts++;
      for (const _ of w.query(EnemyTag)) activeEnts++;
      for (const _ of w.query(AsteroidTag)) activeEnts++;
      for (const _ of w.query(LaserTag)) activeEnts++;
      for (const _ of w.query(CrystalTag)) activeEnts++;

      statEntities.innerText = `${activeEnts + pCount}`;
      statMem.innerText = `~${(renderer.totalTriangles * 0.048).toFixed(1)} KB`;
      statWasm.innerText = wasmPhysics.isReady ? `Native (${pCount} pt)` : `JS Fallback (${pCount} pt)`;
      statNet.innerText = `${telemetry.packetsSent} pkts (${(telemetry.bytesStreamed / 1024).toFixed(1)} KB)`;
      if (statAttitude) {
        const pitchDeg = Math.round((ship.pitch * 180) / Math.PI);
        const rollDeg = Math.round((ship.roll * 180) / Math.PI);
        statAttitude.innerText = `${pitchDeg > 0 ? "+" : ""}${pitchDeg}° / ${rollDeg > 0 ? "+" : ""}${rollDeg}°`;
      }

      // Vitals
      barShield.style.width = `${Math.max(0, ship.shield)}%`;
      labelShield.innerText = `${Math.round(ship.shield)}%`;
      barHull.style.width = `${Math.max(0, ship.hp)}%`;
      labelHull.innerText = `${Math.round(ship.hp)}%`;
      barEmp.style.width = `${Math.max(0, ship.empCharge)}%`;
      labelEmp.innerText = ship.empCharge >= 100 ? "READY [R]" : `${Math.round(ship.empCharge)}%`;
      labelMissiles.innerText = `${ship.missiles} / ${ship.maxMissiles}`;

      // Mission & Score
      hudScore.innerText = `${ship.score.toLocaleString()}`;
      hudCrystals.innerText = `${totalCrystalsCollected}`;
      hudWave.innerText = `WAVE ${currentWave} / 3`;

      frameCount = 0;
      lastFpsUpdate = now;
    }

    input.endFrame();
  });

  // 12. Build & Compile Scheduler DAG (@flow.engine/scheduler)
  const scheduler = buildGameScheduler({
    inputSystem,
    flightSystem,
    wasmPhysicsSystem,
    enemyAiSystem,
    projectileSystem,
    combatSystem,
    lootSystem,
    waveSystem,
    telemetrySystem,
    audioSystem,
    renderSystem,
  });

  scheduler.compile(app.capabilities.get());

  // Register master step to Application Loop
  app.loop.onUpdate((dt) => {
    scheduler.run(app.world, dt);
  });

  // 13. Start Engine
  app.start();
  console.log("⚡ [Flux Odyssey] Engine running at 60+ FPS with WebGPU/WebGL2, WASM C++, and Scheduler DAG!");
}

/**
 * High-speed lookAt matrix generator.
 */
function buildLookAt(out: Mat4, eye: Vec3, center: Vec3, up: Vec3): void {
  const z0 = eye.x - center.x;
  const z1 = eye.y - center.y;
  const z2 = eye.z - center.z;
  let len = Math.hypot(z0, z1, z2);
  const invZ = len > 0 ? 1 / len : 0;
  const fz0 = z0 * invZ, fz1 = z1 * invZ, fz2 = z2 * invZ;

  // x = up x z
  let x0 = up.y * fz2 - up.z * fz1;
  let x1 = up.z * fz0 - up.x * fz2;
  let x2 = up.x * fz1 - up.y * fz0;
  len = Math.hypot(x0, x1, x2);
  const invX = len > 0 ? 1 / len : 0;
  const fx0 = x0 * invX, fx1 = x1 * invX, fx2 = x2 * invX;

  // y = z x x
  const fy0 = fz1 * fx2 - fz2 * fx1;
  const fy1 = fz2 * fx0 - fz0 * fx2;
  const fy2 = fz0 * fx1 - fz1 * fx0;

  const d = out.data;
  d[0] = fx0; d[1] = fy0; d[2] = fz0; d[3] = 0;
  d[4] = fx1; d[5] = fy1; d[6] = fz1; d[7] = 0;
  d[8] = fx2; d[9] = fy2; d[10] = fz2; d[11] = 0;
  d[12] = -(fx0 * eye.x + fx1 * eye.y + fx2 * eye.z);
  d[13] = -(fy0 * eye.x + fy1 * eye.y + fy2 * eye.z);
  d[14] = -(fz0 * eye.x + fz1 * eye.y + fz2 * eye.z);
  d[15] = 1;
}

main().catch(console.error);
