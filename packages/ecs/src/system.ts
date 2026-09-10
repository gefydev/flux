import type { AnyComponentType } from "./query.js";
import type { World } from "./world.js";

export type ExecutionBackend = "auto" | "js" | "wasm" | "gpu" | "worker";

export interface SystemDefinition {
  name?: string;
  backend?: ExecutionBackend;
  inputs?: AnyComponentType[];
  outputs?: AnyComponentType[];
  priority?: number;
  update: (world: World, dt: number) => void;
}

export type SystemFn = (world: World, dt: number) => void;
export type System = SystemDefinition | SystemFn;

export function defineSystem(def: SystemDefinition | SystemFn): SystemDefinition {
  if (typeof def === "function") {
    return {
      backend: "js",
      update: def,
    };
  }
  return {
    backend: def.backend ?? "auto",
    ...def,
  };
}
