import { type Application, definePlugin } from "@flux/core";
import { World } from "@flux/ecs";
import { EngineLoop } from "./loop.js";

// Extend Application with runtime properties
declare module "@flux/core" {
  interface Application {
    loop: EngineLoop;
    world: World;
  }
}

export interface RuntimePluginOptions {
  fixedTimeStep?: number;
}

/**
 * Creates the Flux Runtime Plugin, attaching the execution loop and ECS world to the Application.
 */
export function createRuntimePlugin(options: RuntimePluginOptions = {}) {
  return definePlugin({
    name: "@flux/runtime",
    version: "0.1.0",
    install(app: Application) {
      const loop = new EngineLoop(options.fixedTimeStep ?? 1 / 60);
      const world = new World();

      app.loop = loop;
      app.world = world;

      // Connect loop updates to ECS world
      loop.onUpdate((dt) => {
        world.update(dt);
        app.events.emit("app:tick", { delta: dt, elapsed: loop.clock.elapsed });
      });

      // Hook into Application start and stop
      app.events.on("app:start", () => loop.start());
      app.events.on("app:stop", () => loop.stop());
      app.events.on("app:destroy", () => {
        loop.stop();
        world.clear();
      });
    },
  });
}
