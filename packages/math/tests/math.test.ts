import { describe, expect, it } from "bun:test";
import { Mat4, Quat, Vec2, Vec3, Vec4 } from "../src/index.js";

describe("@flux/math", () => {
  it("should perform Vec2 and Vec3 operations with zero allocations", () => {
    const v1 = new Vec3(1, 2, 3);
    const v2 = new Vec3(4, 5, 6);
    const out = new Vec3();

    v1.add(v2, out);
    expect(out.x).toBe(5);
    expect(out.y).toBe(7);
    expect(out.z).toBe(9);

    const dot = v1.dot(v2);
    expect(dot).toBe(1 * 4 + 2 * 5 + 3 * 6); // 32
  });

  it("should wrap shared Float32Array at offsets", () => {
    // A shared buffer containing 2 3D positions in SoA or interleaved format
    const buffer = new Float32Array(6);
    const p1 = new Vec3(10, 20, 30, buffer, 0);
    const p2 = new Vec3(40, 50, 60, buffer, 3);

    expect(buffer[0]).toBe(10);
    expect(buffer[3]).toBe(40);

    p1.x = 99;
    expect(buffer[0]).toBe(99);
  });

  it("should multiply Mat4 and handle identity", () => {
    const m1 = new Mat4();
    const m2 = new Mat4();
    const out = new Mat4();

    m1.multiply(m2, out);
    expect(out.data[0]).toBe(1);
    expect(out.data[5]).toBe(1);
    expect(out.data[10]).toBe(1);
    expect(out.data[15]).toBe(1);
  });

  it("should rotate Mat4 around X, Y, and Z axes", () => {
    const m = new Mat4();
    m.rotateX(Math.PI / 2);
    // cos(pi/2) = 0, sin(pi/2) = 1
    // row 1 col 1 (idx 5) = cos = 0, row 2 col 1 (idx 6) = sin = 1
    expect(Math.abs(m.data[5]!)).toBeLessThan(1e-6);
    expect(Math.abs(m.data[6]! - 1)).toBeLessThan(1e-6);

    const my = new Mat4();
    my.rotateY(Math.PI / 2);
    // row 0 col 0 (idx 0) = cos = 0, row 2 col 0 (idx 2) = -sin = -1
    expect(Math.abs(my.data[0]!)).toBeLessThan(1e-6);
    expect(Math.abs(my.data[2]! + 1)).toBeLessThan(1e-6);

    const mz = new Mat4();
    mz.rotateZ(Math.PI / 2);
    // row 0 col 0 (idx 0) = cos = 0, row 1 col 0 (idx 1) = sin = 1
    expect(Math.abs(mz.data[0]!)).toBeLessThan(1e-6);
    expect(Math.abs(mz.data[1]! - 1)).toBeLessThan(1e-6);
  });
});
