/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * System DAG and execution stage configuration using @flux/scheduler.
 */

import { type System, type World, defineSystem } from "@flux/ecs";
import { Scheduler, Stage } from "@flux/scheduler";

export interface GameSystemsBundle {
  inputSystem: System;
  flightSystem: System;
  wasmPhysicsSystem: System;
  enemyAiSystem: System;
  projectileSystem: System;
  combatSystem: System;
  lootSystem: System;
  waveSystem: System;
  telemetrySystem: System;
  audioSystem: System;
  renderSystem: System;
}

/**
 * Configure the execution graph DAG with @flux/scheduler stages.
 */
export function buildGameScheduler(systems: GameSystemsBundle): Scheduler {
  const scheduler = new Scheduler();

  // Stage 1: PreUpdate (Input & Action Processing)
  scheduler.addSystem(systems.inputSystem, {
    name: "InputSystem",
    stage: Stage.PreUpdate,
  });

  // Stage 2: Update (Simulation & Physics)
  scheduler.addSystem(systems.flightSystem, {
    name: "FlightSystem",
    stage: Stage.Update,
    after: ["InputSystem"],
  });

  scheduler.addSystem(systems.wasmPhysicsSystem, {
    name: "WasmPhysicsSystem",
    stage: Stage.Update,
    after: ["FlightSystem"],
  });

  scheduler.addSystem(systems.enemyAiSystem, {
    name: "EnemyAiSystem",
    stage: Stage.Update,
    after: ["FlightSystem"],
  });

  scheduler.addSystem(systems.projectileSystem, {
    name: "ProjectileSystem",
    stage: Stage.Update,
    after: ["FlightSystem", "EnemyAiSystem"],
  });

  scheduler.addSystem(systems.combatSystem, {
    name: "CombatSystem",
    stage: Stage.Update,
    after: ["ProjectileSystem", "WasmPhysicsSystem"],
  });

  scheduler.addSystem(systems.lootSystem, {
    name: "LootSystem",
    stage: Stage.Update,
    after: ["CombatSystem"],
  });

  // Stage 3: PostUpdate (Wave Logic, Telemetry, Audio Modulation)
  scheduler.addSystem(systems.waveSystem, {
    name: "WaveSystem",
    stage: Stage.PostUpdate,
  });

  scheduler.addSystem(systems.telemetrySystem, {
    name: "TelemetrySystem",
    stage: Stage.PostUpdate,
  });

  scheduler.addSystem(systems.audioSystem, {
    name: "AudioSystem",
    stage: Stage.PostUpdate,
  });

  // Stage 4: Render (Dual-backend GPU & HUD)
  scheduler.addSystem(systems.renderSystem, {
    name: "RenderSystem",
    stage: Stage.Render,
  });

  return scheduler;
}
