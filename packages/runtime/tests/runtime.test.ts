import { Application } from "@flux/core";
import { defineComponent } from "@flux/ecs";
import { describe, expect, it } from "bun:test";
import { Clock, EngineLoop, createRuntimePlugin } from "../src/index.js";

describe("@flux/runtime", () => {
  it("should calculate delta, fixed step consumption, and elapsed time in Clock", () => {
    const clock = new Clock(1 / 60);
    clock.start(1000);

    clock.tick(1035); // advance 35ms (> 2 fixed steps at 16.66ms)
    expect(clock.delta).toBeCloseTo(0.035, 3);

    let fixedSteps = 0;
    while (clock.consumeFixedStep()) {
      fixedSteps++;
    }
    expect(fixedSteps).toBe(2);
  });

  it("should execute updates with EngineLoop.step()", () => {
    const loop = new EngineLoop();
    let fixedTicks = 0;
    let varTicks = 0;

    loop.onFixedUpdate(() => fixedTicks++);
    loop.onUpdate(() => varTicks++);

    loop.step(1000);
    loop.step(1020); // 20ms delta -> 1 fixed step + 1 variable step

    expect(fixedTicks).toBe(1);
    expect(varTicks).toBe(1);
  });

  it("should integrate with Application and World seamlessly", async () => {
    const app = new Application();
    app.use(createRuntimePlugin());
    await app.init();

    expect(app.loop).toBeDefined();
    expect(app.world).toBeDefined();

    const Counter = defineComponent("Counter", () => ({ val: 0 }));
    const entity = app.world.createEntity();
    app.world.add(entity, Counter);

    app.world.registerSystem((w) => {
      for (const ent of w.query(Counter)) {
        w.get(ent, Counter)!.val++;
      }
    });

    app.loop.step(1000);
    app.loop.step(1016);

    expect(app.world.get(entity, Counter)?.val).toBe(1);

    app.destroy();
    expect(app.loop.isRunning).toBe(false);
  });
});
