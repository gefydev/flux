import type { FluxWasmExports } from "./abi.js";

/**
 * WasmBridge manages the linear memory boundary between JavaScript and WebAssembly.
 * Protects against buffer detachment on memory growth and provides high-speed batch transfers.
 */
export class WasmBridge {
  private instance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;

  // Cached views into linear memory
  private _u8: Uint8Array | null = null;
  private _i32: Int32Array | null = null;
  private _f32: Float32Array | null = null;

  constructor(instance?: WebAssembly.Instance, memory?: WebAssembly.Memory) {
    if (instance) {
      this.attach(instance, memory);
    }
  }

  public attach(instance: WebAssembly.Instance, memory?: WebAssembly.Memory): void {
    this.instance = instance;
    this.memory = memory ?? ((instance.exports.memory as WebAssembly.Memory) || null);
    if (!this.memory) {
      throw new Error("[WasmBridge] No WebAssembly.Memory found on instance exports.");
    }
    this.refreshViews();
  }

  public get exports(): FluxWasmExports {
    if (!this.instance) {
      throw new Error("[WasmBridge] No WASM instance attached.");
    }
    return this.instance.exports as unknown as FluxWasmExports;
  }

  public get isAttached(): boolean {
    return this.instance !== null && this.memory !== null;
  }

  /**
   * Linear memory views (auto-refreshed if buffer detached).
   */
  public get u8(): Uint8Array {
    this.ensureValidViews();
    return this._u8!;
  }

  public get i32(): Int32Array {
    this.ensureValidViews();
    return this._i32!;
  }

  public get f32(): Float32Array {
    this.ensureValidViews();
    return this._f32!;
  }

  /**
   * Allocate memory inside the WASM module heap.
   */
  public alloc(bytes: number): number {
    const fn = this.exports.flux_alloc;
    if (typeof fn !== "function") {
      throw new Error("[WasmBridge] Module does not export flux_alloc.");
    }
    return fn(bytes);
  }

  /**
   * Free memory inside the WASM module heap.
   */
  public free(ptr: number, bytes: number): void {
    const fn = this.exports.flux_free;
    if (typeof fn === "function") {
      fn(ptr, bytes);
    }
  }

  /**
   * Copy a typed array from JavaScript into WASM linear memory.
   */
  public writeFloat32Array(ptr: number, data: Float32Array): void {
    this.ensureValidViews();
    const floatOffset = ptr >> 2;
    this._f32!.set(data, floatOffset);
  }

  /**
   * Copy a float buffer from WASM linear memory into JavaScript.
   */
  public readFloat32Array(ptr: number, count: number, out?: Float32Array): Float32Array {
    this.ensureValidViews();
    const floatOffset = ptr >> 2;
    const sub = this._f32!.subarray(floatOffset, floatOffset + count);
    if (out) {
      out.set(sub);
      return out;
    }
    return new Float32Array(sub);
  }

  private ensureValidViews(): void {
    if (!this.memory) {
      throw new Error("[WasmBridge] Memory not initialized.");
    }
    if (this._u8 === null || this._u8.buffer !== this.memory.buffer || this._u8.buffer.byteLength === 0) {
      this.refreshViews();
    }
  }

  private refreshViews(): void {
    if (!this.memory) return;
    const buf = this.memory.buffer;
    this._u8 = new Uint8Array(buf);
    this._i32 = new Int32Array(buf);
    this._f32 = new Float32Array(buf);
  }
}
