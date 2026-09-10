import type { Application } from "./app.js";

/**
 * Interface defining a modular plugin for Flux Engine.
 * Plugins can extend the engine with rendering, physics, audio, devtools, or custom backends.
 */
export interface FluxPlugin {
  name: string;
  version?: string;
  dependencies?: string[];
  install: (app: Application) => void | Promise<void>;
}

/**
 * Helper function providing type-checking when defining a plugin.
 */
export function definePlugin(plugin: FluxPlugin): FluxPlugin {
  if (!plugin.name) {
    throw new Error("[Flux] Plugin must have a valid 'name' property.");
  }
  if (typeof plugin.install !== "function") {
    throw new Error(`[Flux] Plugin '${plugin.name}' must provide an 'install' method.`);
  }
  return plugin;
}
