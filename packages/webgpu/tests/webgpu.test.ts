import { BufferUsage, FluxBuffer } from "@flux/resources";
import { describe, expect, it } from "bun:test";
import { GpuContext, WebGpuRenderer } from "../src/index.js";

describe("@flux/webgpu", () => {
  it("should gracefully handle environments without WebGPU hardware support", async () => {
    const context = new GpuContext();
    const ready = await context.init();

    // In standard Node/Bun without --enable-webgpu flag, should gracefully report false
    expect(ready).toBe(false);
    expect(context.isReady).toBe(false);
  });

  it("should synchronize dirty ranges to mock GPU queue correctly", () => {
    const renderer = new WebGpuRenderer();
    const writtenData: { offset: number; size: number }[] = [];

    // Mock ready WebGPU context
    (renderer.context as any).isReady = true;
    (renderer.context as any).queue = {
      writeBuffer: (_buf: any, offset: number, data: Uint8Array) => {
        writtenData.push({ offset, size: data.byteLength });
      },
    };

    const fluxBuf = new FluxBuffer({
      size: 1024,
      usage: BufferUsage.Storage,
    });

    // Write 64 bytes at offset 128
    fluxBuf.write(128, new Float32Array(16)); // 16 * 4 = 64 bytes
    expect(fluxBuf.isDirty).toBe(true);

    const mockGpuBuffer = {};
    renderer.syncBuffer(fluxBuf, mockGpuBuffer);

    expect(writtenData.length).toBe(1);
    expect(writtenData[0]?.offset).toBe(128);
    expect(writtenData[0]?.size).toBe(64);
    expect(fluxBuf.isDirty).toBe(false); // Cleaned after sync
  });
});
