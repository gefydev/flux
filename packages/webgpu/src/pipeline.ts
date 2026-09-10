import type { GpuContext } from "./device.js";
import type { ComputePipelineDescriptor, RenderPipelineDescriptor } from "./types.js";

/**
 * Manages WGSL shader compilation, compute pipelines, and render pipeline caching.
 */
export class PipelineManager {
  private context: GpuContext;
  private computePipelines = new Map<string, any>();
  private renderPipelines = new Map<string, any>();

  constructor(context: GpuContext) {
    this.context = context;
  }

  public createShaderModule(code: string, label?: string): any {
    if (!this.context.isReady) {
      throw new Error("[PipelineManager] Cannot create shader module: WebGPU device not ready.");
    }
    return this.context.device.createShaderModule({
      label,
      code,
    });
  }

  public async getOrCreateComputePipeline(desc: ComputePipelineDescriptor): Promise<any> {
    const key = desc.label ?? desc.shader.code;
    if (this.computePipelines.has(key)) {
      return this.computePipelines.get(key);
    }

    if (!this.context.isReady) {
      throw new Error("[PipelineManager] Device not ready for compute pipeline creation.");
    }

    const shaderModule = this.createShaderModule(desc.shader.code, desc.shader.label);
    const pipeline = await this.context.device.createComputePipelineAsync({
      label: desc.label,
      layout: "auto",
      compute: {
        module: shaderModule,
        entryPoint: desc.entryPoint ?? "main",
      },
    });

    this.computePipelines.set(key, pipeline);
    return pipeline;
  }

  public clear(): void {
    this.computePipelines.clear();
    this.renderPipelines.clear();
  }
}
