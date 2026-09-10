import type { FluxBuffer } from "@flow.engine/resources";
import { GpuContext } from "./device.js";
import { PipelineManager } from "./pipeline.js";

/**
 * High-level WebGPU renderer for Flux Engine.
 * Implements GPU-driven compute passes, command buffering, and dirty range synchronizations.
 */
export class WebGpuRenderer {
  public readonly context = new GpuContext();
  public readonly pipelines: PipelineManager;

  constructor() {
    this.pipelines = new PipelineManager(this.context);
  }

  /**
   * Initialize WebGPU subsystem.
   */
  public async init(): Promise<boolean> {
    return this.context.init();
  }

  /**
   * Synchronize only dirty byte ranges of a FluxBuffer to its hardware GPUBuffer.
   */
  public syncBuffer(fluxBuffer: FluxBuffer, gpuBuffer: any): void {
    if (!this.context.isReady || !fluxBuffer.isDirty) return;

    for (const range of fluxBuffer.getDirtyRanges()) {
      const slice = fluxBuffer.data.subarray(range.offset, range.offset + range.size);
      this.context.writeBuffer(gpuBuffer, range.offset, slice as any);
    }

    fluxBuffer.clearDirty();
  }

  /**
   * Dispatch a WebGPU compute shader pass.
   */
  public dispatchCompute(
    pipeline: any,
    bindGroup: any,
    workgroupsX: number,
    workgroupsY = 1,
    workgroupsZ = 1
  ): void {
    if (!this.context.isReady) return;

    const commandEncoder = this.context.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
    passEncoder.end();

    this.context.queue.submit([commandEncoder.finish()]);
  }
}
