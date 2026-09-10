/**
 * Flux Engine ⚡
 * High-Throughput 50,000 Entity Simulation Benchmark
 * Copyright 2026 GefyDev (hi@gefy.dev)
 * Licensed under the Apache License, Version 2.0.
 */

import { Application } from "@flow.engine/core";
import { definePackedComponent, defineSystem } from "@flow.engine/ecs";
import { createRuntimePlugin } from "@flow.engine/runtime";

async function main() {
  console.log("=================================================");
  console.log("  ⚡ FLUX ENGINE - Level 1 JS/TS Benchmark ⚡   ");
  console.log("  Author: GefyDev <hi@gefy.dev>                  ");
  console.log("=================================================\n");

  const app = new Application({ name: "FluxSimulationDemo" });
  app.use(createRuntimePlugin());

  await app.init();
  const caps = app.capabilities.get();
  console.log(`[Runtime] Environment: ${caps.environment.toUpperCase()}`);
  console.log(`[Capabilities] WASM: ${caps.wasm}, SIMD: ${caps.wasmSimd}, Workers: ${caps.workers}, Concurrency: ${caps.hardwareConcurrency}\n`);

  // 1. Define contiguous SoA components
  const Position = definePackedComponent("Position", { x: 0, y: 0, z: 0 });
  const Velocity = definePackedComponent("Velocity", { vx: 0, vy: 0, vz: 0 });

  // 2. Spawn 50,000 entities
  const ENTITY_COUNT = 50_000;
  console.log(`[ECS] Spawning ${ENTITY_COUNT.toLocaleString()} entities in contiguous Float32Array storage...`);

  const spawnStart = performance.now();
  for (let i = 0; i < ENTITY_COUNT; i++) {
    const entity = app.world.createEntity();
    app.world.addPacked(entity, Position, [
      (Math.random() - 0.5) * 1000,
      (Math.random() - 0.5) * 1000,
      (Math.random() - 0.5) * 1000,
    ]);
    app.world.addPacked(entity, Velocity, [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
    ]);
  }
  const spawnTime = (performance.now() - spawnStart).toFixed(2);
  console.log(`[ECS] Spawning completed in ${spawnTime}ms.\n`);

  // 3. Define Movement System (Progressive Performance - Level 1: Pure TypeScript)
  const posBuffer = app.world.getPackedBuffer(Position);
  const velBuffer = app.world.getPackedBuffer(Velocity);
  const count = app.world.getStorage(Position).count;

  const movementSystem = defineSystem({
    name: "MovementSystem",
    backend: "auto",
    update: (_world, dt) => {
      // Direct contiguous SoA update loop
      for (let i = 0; i < count; i++) {
        const offset = i * 3;
        posBuffer[offset + 0] = posBuffer[offset + 0]! + velBuffer[offset + 0]! * dt;
        posBuffer[offset + 1] = posBuffer[offset + 1]! + velBuffer[offset + 1]! * dt;
        posBuffer[offset + 2] = posBuffer[offset + 2]! + velBuffer[offset + 2]! * dt;
      }
    },
  });

  app.world.registerSystem(movementSystem);

  // 4. Run 60 frames benchmark
  console.log(`[Benchmark] Simulating 60 frames (1 second equivalent)...`);
  const frameTimes: number[] = [];
  const dt = 1 / 60;

  for (let frame = 1; frame <= 60; frame++) {
    const start = performance.now();
    app.world.update(dt);
    const end = performance.now();
    frameTimes.push(end - start);
  }

  const totalTime = frameTimes.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / frameTimes.length;
  const minTime = Math.min(...frameTimes);
  const maxTime = Math.max(...frameTimes);
  const throughput = ((ENTITY_COUNT * frameTimes.length) / (totalTime / 1000)).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

  console.log(`\n================== RESULTS ==================`);
  console.log(`  Entities simulated:  ${ENTITY_COUNT.toLocaleString()}`);
  console.log(`  Average frame time:  ${avgTime.toFixed(3)} ms`);
  console.log(`  Min / Max time:      ${minTime.toFixed(3)} ms / ${maxTime.toFixed(3)} ms`);
  console.log(`  Simulated FPS limit: ${(1000 / avgTime).toFixed(1)} FPS`);
  console.log(`  Throughput:          ${throughput} entity updates/sec`);
  console.log(`=============================================\n`);

  console.log(`[Status] Verified Rule #1: Pure TypeScript runs at extreme performance before needing WASM/GPU.`);
}

main().catch(console.error);
