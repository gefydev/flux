import type { WasmModuleMetadata } from "./abi.js";
import { WasmBridge } from "./bridge.js";

/**
 * Base interface for language-specific WASM adapters in Flux Engine.
 */
export interface WasmAdapter<T = any> {
  readonly metadata: WasmModuleMetadata;
  readonly bridge: WasmBridge;
  isLoaded: boolean;
  load(source: BufferSource | WebAssembly.Module | string): Promise<void>;
  getExports(): T;
}

/**
 * Specialized adapter for Rust WASM modules.
 * Works seamlessly with crates compiled via wasm-bindgen or wasm32-unknown-unknown.
 */
export class RustWasmAdapter<T = any> implements WasmAdapter<T> {
  public readonly metadata: WasmModuleMetadata;
  public readonly bridge = new WasmBridge();
  public isLoaded = false;

  constructor(name: string, metadata: Partial<WasmModuleMetadata> = {}) {
    this.metadata = {
      name,
      language: "rust",
      ...metadata,
    };
  }

  public async load(source: BufferSource | WebAssembly.Module, imports: WebAssembly.Imports = {}): Promise<void> {
    let instance: WebAssembly.Instance;

    if (source instanceof WebAssembly.Module) {
      instance = await WebAssembly.instantiate(source, imports);
    } else {
      const res: any = await WebAssembly.instantiate(source, imports);
      instance = res.instance ?? res;
    }

    this.bridge.attach(instance);
    this.isLoaded = true;

    // Call flux_init if exported
    if (typeof this.bridge.exports.flux_init === "function") {
      this.bridge.exports.flux_init();
    }
  }

  public getExports(): T {
    return this.bridge.exports as unknown as T;
  }
}

/**
 * Specialized adapter for C/C++ WASM modules.
 * Works with modules compiled via Emscripten or Clang standalone wasm32 targets.
 */
export class CppWasmAdapter<T = any> implements WasmAdapter<T> {
  public readonly metadata: WasmModuleMetadata;
  public readonly bridge = new WasmBridge();
  public isLoaded = false;

  constructor(name: string, metadata: Partial<WasmModuleMetadata> = {}) {
    this.metadata = {
      name,
      language: "cpp",
      ...metadata,
    };
  }

  public async load(source: BufferSource | WebAssembly.Module, imports: WebAssembly.Imports = {}): Promise<void> {
    let instance: WebAssembly.Instance;

    if (source instanceof WebAssembly.Module) {
      instance = await WebAssembly.instantiate(source, imports);
    } else {
      const res: any = await WebAssembly.instantiate(source, imports);
      instance = res.instance ?? res;
    }

    this.bridge.attach(instance);
    this.isLoaded = true;

    // Call flux_init or standard C constructor if present
    if (typeof this.bridge.exports.flux_init === "function") {
      this.bridge.exports.flux_init();
    }
  }

  public getExports(): T {
    return this.bridge.exports as unknown as T;
  }
}
