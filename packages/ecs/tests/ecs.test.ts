import { describe, expect, it } from "bun:test";
import {
  World,
  defineComponent,
  definePackedComponent,
  defineSystem,
} from "../src/index.js";

describe("@flux/ecs", () => {
  it("should create, query, and modify entities with object components", () => {
    const world = new World();
    const Position = defineComponent("Position", () => ({ x: 0, y: 0 }));
    const Velocity = defineComponent("Velocity", () => ({ vx: 1, vy: 2 }));

    const e1 = world.createEntity();
    const e2 = world.createEntity();

    world.add(e1, Position, { x: 10, y: 20 });
    world.add(e1, Velocity, { vx: 5, vy: 5 });

    world.add(e2, Position, { x: 100, y: 200 }); // e2 has no Velocity

    // System: movement
    const movement = defineSystem((w) => {
      for (const ent of w.query(Position, Velocity)) {
        const pos = w.get(ent, Position)!;
        const vel = w.get(ent, Velocity)!;
        pos.x += vel.vx;
        pos.y += vel.vy;
      }
    });

    world.registerSystem(movement);
    world.update(1 / 60);

    expect(world.get(e1, Position)?.x).toBe(15);
    expect(world.get(e1, Position)?.y).toBe(25);
    expect(world.get(e2, Position)?.x).toBe(100); // unaffected
  });

  it("should support contiguous packed numeric SoA components with zero allocations", () => {
    const world = new World();
    const Transform = definePackedComponent("Transform", { x: 0, y: 0, z: 0 });
    const Speed = definePackedComponent("Speed", { vx: 1, vy: 1, vz: 1 });

    const entityCount = 1000;
    for (let i = 0; i < entityCount; i++) {
      const e = world.createEntity();
      world.addPacked(e, Transform, [i, i * 2, 0]);
      world.addPacked(e, Speed, [1, 2, 3]);
    }

    const tBuffer = world.getPackedBuffer(Transform);
    const sBuffer = world.getPackedBuffer(Speed);

    // Run high-throughput update directly on typed buffer
    const tStorage = world.getStorage(Transform);
    const count = tStorage.count;
    for (let i = 0; i < count; i++) {
      const offset = i * 3;
      tBuffer[offset + 0] = tBuffer[offset + 0]! + sBuffer[offset + 0]!;
      tBuffer[offset + 1] = tBuffer[offset + 1]! + sBuffer[offset + 1]!;
      tBuffer[offset + 2] = tBuffer[offset + 2]! + sBuffer[offset + 2]!;
    }

    expect(tBuffer[0]).toBe(1); // 0 + 1
    expect(tBuffer[1]).toBe(2); // 0 + 2
    expect(tBuffer[2]).toBe(3); // 0 + 3
  });

  it("should properly destroy entities and recycle handles", () => {
    const world = new World();
    const Tag = defineComponent("Tag", () => ({ name: "" }));

    const e1 = world.createEntity();
    world.add(e1, Tag, { name: "Entity1" });
    expect(world.isAlive(e1)).toBe(true);

    world.destroyEntity(e1);
    expect(world.isAlive(e1)).toBe(false);
    expect(world.has(e1, Tag)).toBe(false);

    // Next created entity should recycle index with incremented generation
    const e2 = world.createEntity();
    expect(world.isAlive(e2)).toBe(true);
    expect(e2).not.toBe(e1);
  });
});
