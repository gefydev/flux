import { CapabilityRegistry } from "./capabilities.js";
import { EventBus } from "./events.js";
import type { FluxPlugin } from "./plugin.js";

export type ApplicationState = "uninitialized" | "ready" | "running" | "paused" | "destroyed";

export interface ApplicationConfig {
  name?: string;
  version?: string;
  targetFps?: number;
  fixedTimeStep?: number;
  [key: string]: any;
}

export interface ApplicationEvents {
  "app:init": void;
  "app:start": void;
  "app:stop": void;
  "app:destroy": void;
  "app:tick": { delta: number; elapsed: number };
  [key: string]: any;
}

/**
 * The core Application orchestrator of Flux Engine.
 * Follows the progressive disclosure philosophy: minimal core that can be scaled up.
 */
export class Application {
  public readonly capabilities = new CapabilityRegistry();
  public readonly events = new EventBus<ApplicationEvents>();
  public readonly config: ApplicationConfig;

  private _state: ApplicationState = "uninitialized";
  private _plugins: FluxPlugin[] = [];
  private _installedPlugins = new Set<string>();

  constructor(config: ApplicationConfig = {}) {
    this.config = {
      name: "FluxApp",
      version: "0.1.0",
      targetFps: 60,
      fixedTimeStep: 1 / 60,
      ...config,
    };
  }

  public get state(): ApplicationState {
    return this._state;
  }

  /**
   * Register a plugin to extend the application.
   */
  public use(plugin: FluxPlugin): this {
    if (this._installedPlugins.has(plugin.name)) {
      console.warn(`[Flux] Plugin '${plugin.name}' is already installed.`);
      return this;
    }
    this._plugins.push(plugin);
    return this;
  }

  /**
   * Initialize the engine, discover capabilities, and install all registered plugins.
   */
  public async init(): Promise<this> {
    if (this._state !== "uninitialized") {
      return this;
    }

    // 1. Probe system capabilities
    this.capabilities.probe();

    // 2. Install plugins
    for (const plugin of this._plugins) {
      if (this._installedPlugins.has(plugin.name)) continue;

      // Verify dependencies if any
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this._installedPlugins.has(dep)) {
            throw new Error(`[Flux] Plugin '${plugin.name}' requires dependency '${dep}' to be installed first.`);
          }
        }
      }

      await plugin.install(this);
      this._installedPlugins.add(plugin.name);
    }

    this._state = "ready";
    this.events.emit("app:init", undefined);
    return this;
  }

  /**
   * Start the application execution.
   */
  public start(): this {
    if (this._state === "uninitialized") {
      throw new Error("[Flux] Application must be initialized with init() before start().");
    }
    if (this._state === "running") {
      return this;
    }

    this._state = "running";
    this.events.emit("app:start", undefined);
    return this;
  }

  /**
   * Stop or pause application execution.
   */
  public stop(): this {
    if (this._state !== "running") {
      return this;
    }

    this._state = "paused";
    this.events.emit("app:stop", undefined);
    return this;
  }

  /**
   * Clean up and destroy the application and all attached resources.
   */
  public destroy(): void {
    if (this._state === "destroyed") return;

    this.stop();
    this._state = "destroyed";
    this.events.emit("app:destroy", undefined);
    this.events.clear();
    this._plugins.length = 0;
    this._installedPlugins.clear();
  }
}
