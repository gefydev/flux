/**
 * Standard C-compatible ABI specification for Flux WASM modules.
 * Any language targeting WebAssembly (Rust, C/C++, Zig, Odin, etc.)
 * can implement this minimal ABI to seamlessly integrate with Flux Engine.
 */

export interface FluxWasmExports {
  memory: WebAssembly.Memory;
  flux_alloc?: (size: number) => number;
  flux_free?: (ptr: number, size: number) => void;
  flux_init?: () => number;
  [key: string]: any;
}

export interface WasmModuleMetadata {
  name: string;
  version?: string;
  author?: string;
  language: "rust" | "cpp" | "zig" | "c" | "custom";
}
