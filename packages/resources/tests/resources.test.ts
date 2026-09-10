import { describe, expect, it } from "bun:test";
import { BufferUsage, FluxBuffer, ResourceManager } from "../src/index.js";

describe("@flow.engine/resources", () => {
  it("should create buffers and track dirty ranges efficiently", () => {
    const buffer = new FluxBuffer({
      size: 1024,
      usage: BufferUsage.Vertex | BufferUsage.CopyDst,
    });

    expect(buffer.isDirty).toBe(false);

    // Write bytes [0..16]
    const data1 = new Float32Array([1, 2, 3, 4]); // 16 bytes
    buffer.write(0, data1);

    expect(buffer.isDirty).toBe(true);
    let ranges = buffer.getDirtyRanges();
    expect(ranges.length).toBe(1);
    expect(ranges[0]?.offset).toBe(0);
    expect(ranges[0]?.size).toBe(16);

    // Write adjacent bytes [16..32] -> should merge into [0..32]
    const data2 = new Float32Array([5, 6, 7, 8]);
    buffer.write(16, data2);

    ranges = buffer.getDirtyRanges();
    expect(ranges.length).toBe(1);
    expect(ranges[0]?.offset).toBe(0);
    expect(ranges[0]?.size).toBe(32);

    buffer.clearDirty();
    expect(buffer.isDirty).toBe(false);
  });

  it("should manage generational resource handles in ResourceManager", () => {
    const manager = new ResourceManager();

    const handle = manager.createBuffer({
      size: 4096,
      usage: BufferUsage.Uniform,
    });

    expect(manager.totalAllocatedBytes).toBe(4096);

    const buf = manager.getBuffer(handle);
    expect(buf).toBeDefined();
    expect(buf?.size).toBe(4096);

    // Destroy
    const destroyed = manager.destroyBuffer(handle);
    expect(destroyed).toBe(true);
    expect(manager.totalAllocatedBytes).toBe(0);
    expect(manager.getBuffer(handle)).toBeUndefined();

    // Trying to destroy with stale handle returns false
    expect(manager.destroyBuffer(handle)).toBe(false);
  });
});
