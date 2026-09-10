# Flux Engine ⚡

> **Write once. Run where it runs best.**

Flux is a modular, high-performance runtime and framework for building graphical applications, 3D simulations, and games with **TypeScript**, automatically orchestrating execution across **JavaScript, WebAssembly (Rust & C++), Web Workers, and WebGPU**.

Created & maintained by **GefyDev** (<hi@gefy.dev>).  
Released under the **Apache-2.0 License**.

---

## 💡 Philosophy: Progressive Performance

Flux Engine follows a single golden rule:

> **Everything must work first in JavaScript/TypeScript. WebAssembly and WebGPU are accelerators, not mandatory barriers.**

```
Level 1: Pure TypeScript   ───► Fast iteration, instant prototyping, zero compilation
Level 2: backend: "auto"    ───► Flux analyzes workload and dispatches to WASM or GPU
Level 3: backend: "wasm"    ───► Heavy CPU computation (physics, pathfinding, massive SoA)
Level 4: backend: "gpu"     ───► Massively parallel compute & GPU-driven rendering (WebGPU)
```

No game developer should be forced to learn Rust, C++, SPIR-V, or raw shaders to build their game. But when advanced studios or performance engineers need absolute low-level control, Flux provides transparent adapters and zero-overhead memory access.

---

## 🏛️ Open Source Core Architecture

The entire engine, runtime, and ecosystem packages are **100% Open Source under Apache 2.0**. Developers and studios can host their own dedicated servers, peer-to-peer networking, or custom pipelines without vendor lock-in or subscription fees.

```
                            APPLICATION
                                 │
                            TypeScript
                                 │
                                 ▼
                       ┌───────────────────┐
                       │    @flux/core     │
                       └─────────┬─────────┘
                                 │
                       ┌─────────▼─────────┐
                       │   @flux/runtime   │
                       └────┬────┬────┬────┘
                            │    │    │
                   ┌────────┘    │    └────────┐
                   ▼             ▼             ▼
              @flux/ecs      @flux/wasm   @flux/webgpu
              (SoA / JS)   (Rust & C++)   (Render/Compute)
                   │             │             │
                   └─────────────┼─────────────┘
                                 │
                         @flux/resources
                                 │
                      ┌──────────┴──────────┐
                      ▼                     ▼
                     RAM                   VRAM
```

---

## 📦 Packages

| Package | Description | Status |
|---|---|---|
| **[`@flux/core`](file:///c:/Users/genar/Documents/GitHub/flux-engine/packages/core)** | Application lifecycle, capabilities detection, and typed plugin system | ✅ Ready |
| **[`@flux/math`](file:///c:/Users/genar/Documents/GitHub/flux-engine/packages/math)** | Contiguous `Float32Array` vectors (`Vec2`, `Vec3`, `Vec4`) and matrices (`Mat4`, `Quat`) | ✅ Ready |
| **[`@flux/ecs`](file:///c:/Users/genar/Documents/GitHub/flux-engine/packages/ecs)** | Data-Oriented Entity Component System with SoA contiguous memory backing | ✅ Ready |
| **[`@flux/runtime`](file:///c:/Users/genar/Documents/GitHub/flux-engine/packages/runtime)** | Universal execution loop (RAF / headless timer), high-precision clock & pipeline | ✅ Ready |
| **[`@flux/wasm`](file:///c:/Users/genar/Documents/GitHub/flux-engine/packages/wasm)** | Multi-language WebAssembly bridge with first-class **Rust** and **C++** adapters | ✅ Ready |

---

## 🚀 Quick Start

### 1. Prerequisites
- **[Bun](https://bun.sh)** (>= 1.1)

### 2. Installation
```bash
git clone https://github.com/GefyDev/flux-engine.git
cd flux-engine
bun install
```

### 3. Run Tests
```bash
bun test
```

### 4. Run the 50k+ Entity Simulation Benchmark
```bash
bun run examples/basic-simulation/src/index.ts
```

Benchmark results on pure TypeScript (Level 1):
```text
================== RESULTS ==================
  Entities simulated:  50,000
  Average frame time:  0.238 ms
  Min / Max time:      0.178 ms / 1.630 ms
  Simulated FPS limit: 4,206.5 FPS
  Throughput:          210,322,635 entity updates/sec
=============================================
```

---

## 🦀 Multi-Language WASM Adapters

Flux allows teams to choose their compute stack:

- **TypeScript / JavaScript**: Default universal backend.
- **Rust**: Built-in `RustWasmAdapter` compatible with `wasm-bindgen` and `wasm32-unknown-unknown`.
- **C / C++**: Built-in `CppWasmAdapter` compatible with Clang and Emscripten.
- **Custom Language (Zig, Odin, etc.)**: Via standard `FluxWasmABI` linear memory interface.

---

## 📄 License & Attribution

- **Author**: GefyDev (<hi@gefy.dev>)
- **License**: Apache License, Version 2.0 ([LICENSE](file:///c:/Users/genar/Documents/GitHub/flux-engine/LICENSE)).
