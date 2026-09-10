import { CapabilityRegistry } from "@flux/core";

export function runInfoCommand(): void {
  console.log("==========================================");
  console.log("  ⚡ FLUX ENGINE - System Diagnostics ⚡  ");
  console.log("  Author: GefyDev <hi@gefy.dev>           ");
  console.log("  Version: 0.1.0                          ");
  console.log("==========================================\n");

  const registry = new CapabilityRegistry();
  const caps = registry.probe();

  console.log("Environment:");
  console.log(`  - OS / Host:       ${process.platform} (${process.arch})`);
  console.log(`  - Runtime:         ${caps.environment.toUpperCase()}`);
  console.log(`  - Concurrency:     ${caps.hardwareConcurrency} logical cores\n`);

  console.log("Execution Accelerators:");
  console.log(`  - WebAssembly:     ${caps.wasm ? "✅ Available" : "❌ Not detected"}`);
  console.log(`  - WASM SIMD:       ${caps.wasmSimd ? "✅ Available" : "❌ Not detected"}`);
  console.log(`  - WebGPU:          ${caps.webgpu ? "✅ Available" : "❌ Software/CPU fallback"}`);
  console.log(`  - Web Workers:     ${caps.workers ? "✅ Available" : "❌ Single-threaded"}`);
  console.log(`  - SharedArrayBuf:  ${caps.sharedArrayBuffer ? "✅ Available" : "❌ Disabled"}\n`);

  console.log("Ready to build high-performance applications.");
}
