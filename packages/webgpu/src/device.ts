import type { GpuDeviceLimits } from "./types.js";

/**
 * Manages the WebGPU Device, Adapter, and hardware CommandQueue.
 * Implements graceful fallback detection when hardware acceleration is unavailable.
 */
export class GpuContext {
  public adapter: any = null;
  public device: any = null;
  public queue: any = null;
  public limits: GpuDeviceLimits = {};
  public isReady = false;

  /**
   * Initialize WebGPU adapter and logical device.
   */
  public async init(options: { powerPreference?: "low-power" | "high-performance" } = {}): Promise<boolean> {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      this.isReady = false;
      return false;
    }

    try {
      this.adapter = await (navigator as any).gpu.requestAdapter(options);
      if (!this.adapter) {
        this.isReady = false;
        return false;
      }

      this.device = await this.adapter.requestDevice();
      this.queue = this.device.queue;
      this.limits = this.device.limits ?? {};
      this.isReady = true;
      return true;
    } catch (err) {
      console.warn("[GpuContext] WebGPU initialization failed, falling back to software/CPU mode:", err);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Upload data to a GPUBuffer via device queue.
   */
  public writeBuffer(gpuBuffer: any, byteOffset: number, data: BufferSource): void {
    if (!this.isReady || !this.queue) {
      throw new Error("[GpuContext] Device is not ready to writeBuffer.");
    }
    this.queue.writeBuffer(gpuBuffer, byteOffset, data);
  }

  /**
   * Destroy logical device and release GPU resources.
   */
  public destroy(): void {
    if (this.device) {
      this.device.destroy?.();
      this.device = null;
      this.queue = null;
      this.adapter = null;
      this.isReady = false;
    }
  }
}
