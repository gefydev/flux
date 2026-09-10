import type { SystemCapabilities } from "@flux/core";
import type { ExecutionBackend, SystemDefinition } from "@flux/ecs";

export interface DispatchContext {
  capabilities: SystemCapabilities;
  entityCount: number;
}

/**
 * Heterogeneous backend dispatcher.
 * Analyzes workload characteristics and device capabilities to choose the optimal backend.
 */
export class BackendDispatcher {
  /**
   * Determine the target backend for a given system.
   */
  public resolveBackend(system: SystemDefinition, context: DispatchContext): ExecutionBackend {
    if (system.backend && system.backend !== "auto") {
      return system.backend;
    }

    // Heuristics for backend: "auto"
    const caps = context.capabilities;

    // 1. If system operates purely on packed numeric SoA data with high entity count (> 5,000)
    const hasOnlyPacked = system.inputs?.length && system.inputs.every((c: any) => c.isPacked);

    if (hasOnlyPacked && context.entityCount >= 5000) {
      if (caps.webgpu) {
        return "gpu"; // Ideal for compute shader execution
      }
      if (caps.wasm) {
        return "wasm"; // Ideal for SIMD vector CPU loop
      }
    }

    // Default to universal fast JavaScript backend
    return "js";
  }
}
