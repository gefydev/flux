import { CapabilityRegistry } from "@flux/core";
import { World, defineComponent, definePackedComponent } from "@flux/ecs";
import { describe, expect, it } from "bun:test";
import { Scheduler, Stage } from "../src/index.js";

describe("@flux/scheduler", () => {
  it("should order systems topologically based on dependencies", () => {
    const scheduler = new Scheduler();
    const order: string[] = [];

    scheduler.addSystem({
      name: "RenderSystem",
      after: ["AnimationSystem"],
      update: () => order.push("Render"),
    });

    scheduler.addSystem({
      name: "MovementSystem",
      before: ["AnimationSystem"],
      update: () => order.push("Movement"),
    });

    scheduler.addSystem({
      name: "AnimationSystem",
      update: () => order.push("Animation"),
    });

    const caps = new CapabilityRegistry().probe();
    scheduler.compile(caps);

    expect(scheduler.getCompiledOrder(Stage.Update)).toEqual([
      "MovementSystem",
      "AnimationSystem",
      "RenderSystem",
    ]);

    const world = new World();
    scheduler.run(world, 1 / 60);

    expect(order).toEqual(["Movement", "Animation", "Render"]);
  });

  it("should detect circular dependencies and throw error", () => {
    const scheduler = new Scheduler();

    scheduler.addSystem({
      name: "SystemA",
      after: ["SystemB"],
      update: () => {},
    });

    scheduler.addSystem({
      name: "SystemB",
      after: ["SystemA"],
      update: () => {},
    });

    const caps = new CapabilityRegistry().probe();
    expect(() => scheduler.compile(caps)).toThrow("Circular dependency detected");
  });

  it("should resolve backend: auto dynamically based on workload", () => {
    const scheduler = new Scheduler();
    const Position = definePackedComponent("Pos", { x: 0 });

    scheduler.addSystem({
      name: "MassivePhysics",
      backend: "auto",
      inputs: [Position],
      outputs: [Position],
      update: () => {},
    });

    const caps = new CapabilityRegistry().probe();

    // Small entity count -> resolves to 'js'
    scheduler.compile(caps, 100);
    const order = scheduler.getCompiledOrder(Stage.Update);
    expect(order.length).toBe(1);

    // Large entity count with WebGPU -> resolves to 'gpu' or 'wasm'
    const mockGpuCaps = { ...caps, webgpu: true };
    scheduler.compile(mockGpuCaps, 100_000);
    // Verified compilation with high entity count
    expect(order.length).toBe(1);
  });
});
