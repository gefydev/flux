/**
 * Environment-agnostic WebGPU type interfaces and shaders descriptors.
 */

export interface GpuDeviceLimits {
  maxBufferSize?: number;
  maxComputeWorkgroupSizeX?: number;
  maxComputeWorkgroupSizeY?: number;
  maxComputeWorkgroupSizeZ?: number;
  maxComputeInvocationsPerWorkgroup?: number;
  [key: string]: any;
}

export interface ShaderModuleDescriptor {
  label?: string;
  code: string; // WGSL source code
}

export interface ComputePipelineDescriptor {
  label?: string;
  shader: ShaderModuleDescriptor;
  entryPoint?: string;
}

export interface RenderPipelineDescriptor {
  label?: string;
  vertexShader: ShaderModuleDescriptor;
  vertexEntryPoint?: string;
  fragmentShader?: ShaderModuleDescriptor;
  fragmentEntryPoint?: string;
  cullMode?: "none" | "front" | "back";
  topology?: "point-list" | "line-list" | "triangle-list";
}
