/**
 * Capabilities detector for Flux Engine.
 * Inspects device features to enable dynamic dispatch across JS, WASM, Workers, and WebGPU.
 */

export interface SystemCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  wasm: boolean;
  wasmSimd: boolean;
  sharedArrayBuffer: boolean;
  workers: boolean;
  hardwareConcurrency: number;
  environment: "browser" | "node" | "bun" | "tauri" | "electron" | "worker" | "unknown";
}

export class CapabilityRegistry {
  private caps: SystemCapabilities | null = null;
  private customCaps = new Map<string, any>();

  /**
   * Synchronously probe base platform capabilities.
   */
  public probe(): SystemCapabilities {
    if (this.caps) return this.caps;

    const env = this.detectEnvironment();
    const hasWasm = typeof globalThis.WebAssembly !== "undefined";
    const hasSimd = hasWasm && this.checkWasmSimd();
    const hasSAB = typeof globalThis.SharedArrayBuffer !== "undefined";
    const hasWorkers = typeof globalThis.Worker !== "undefined";
    const concurrency = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;

    const hasGpu = typeof navigator !== "undefined" && "gpu" in navigator;
    const hasGl2 = typeof document !== "undefined" && !!document.createElement("canvas").getContext("webgl2");

    this.caps = {
      webgpu: hasGpu,
      webgl2: hasGl2,
      wasm: hasWasm,
      wasmSimd: hasSimd,
      sharedArrayBuffer: hasSAB,
      workers: hasWorkers,
      hardwareConcurrency: concurrency,
      environment: env,
    };

    return this.caps;
  }

  /**
   * Asynchronously check full WebGPU adapter support.
   */
  public async probeWebGPU(): Promise<{ supported: boolean; adapterName?: string; limits?: Record<string, any> }> {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      return { supported: false };
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) return { supported: false };
      const info = (await adapter.requestAdapterInfo?.()) ?? {};
      return {
        supported: true,
        adapterName: info.description || info.vendor || "WebGPU Adapter",
        limits: adapter.limits,
      };
    } catch {
      return { supported: false };
    }
  }

  private detectEnvironment(): SystemCapabilities["environment"] {
    if (typeof globalThis !== "undefined") {
      if ("__TAURI__" in globalThis || "__TAURI_INTERNALS__" in globalThis) return "tauri";
      if ("Bun" in globalThis) return "bun";
      if (typeof process !== "undefined" && (process as any).versions?.electron) return "electron";
      if (typeof process !== "undefined" && (process as any).versions?.node) return "node";
      if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope) return "worker";
      if (typeof window !== "undefined") return "browser";
    }
    return "unknown";
  }

  private checkWasmSimd(): boolean {
    try {
      // Minimal wasm module with SIMD v128.const instruction
      const bytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
        0x03, 0x02, 0x01, 0x00, 0x0a, 0x15, 0x01, 0x13, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0b,
      ]);
      return WebAssembly.validate(bytes);
    } catch {
      return false;
    }
  }

  public get(): SystemCapabilities {
    return this.caps ?? this.probe();
  }

  public setCustom<T>(key: string, value: T): void {
    this.customCaps.set(key, value);
  }

  public getCustom<T>(key: string): T | undefined {
    return this.customCaps.get(key);
  }
}
