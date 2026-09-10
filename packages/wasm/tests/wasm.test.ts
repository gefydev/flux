import { describe, expect, it } from "bun:test";
import { CppWasmAdapter, RustWasmAdapter, WasmBridge } from "../src/index.js";

// Minimal valid wasm binary that exports memory(1 page) and add(i32, i32) -> i32
const minimalWasmBytes = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
  0x03, 0x02, 0x01, 0x00,
  0x05, 0x03, 0x01, 0x00, 0x01,
  0x07, 0x10, 0x02, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
  0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
]);

describe("@flow.engine/wasm", () => {
  it("should instantiate and read/write memory through WasmBridge", async () => {
    const { instance } = await WebAssembly.instantiate(minimalWasmBytes);
    const bridge = new WasmBridge(instance);

    expect(bridge.isAttached).toBe(true);

    // Call exported add function
    const add = (bridge.exports as any).add;
    expect(add(15, 27)).toBe(42);

    // Write and read float buffers
    const testData = new Float32Array([3.14159, 2.71828, 1.41421]);
    bridge.writeFloat32Array(0, testData);

    const readBack = bridge.readFloat32Array(0, 3);
    expect(readBack[0]).toBeCloseTo(3.14159, 4);
    expect(readBack[1]).toBeCloseTo(2.71828, 4);
    expect(readBack[2]).toBeCloseTo(1.41421, 4);
  });

  it("should support RustWasmAdapter", async () => {
    const adapter = new RustWasmAdapter("physics-rust");
    expect(adapter.metadata.language).toBe("rust");
    expect(adapter.isLoaded).toBe(false);

    await adapter.load(minimalWasmBytes);
    expect(adapter.isLoaded).toBe(true);

    const exports = adapter.getExports();
    expect(exports.add(100, 200)).toBe(300);
  });

  it("should support CppWasmAdapter", async () => {
    const adapter = new CppWasmAdapter("physics-cpp");
    expect(adapter.metadata.language).toBe("cpp");
    expect(adapter.isLoaded).toBe(false);

    await adapter.load(minimalWasmBytes);
    expect(adapter.isLoaded).toBe(true);

    const exports = adapter.getExports();
    expect(exports.add(50, 50)).toBe(100);
  });
});
