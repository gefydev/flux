import { Vec3 } from "./vec3.js";

/**
 * Quaternion representation for 3D rotations backed by Float32Array.
 */
export class Quat {
  public readonly data: Float32Array;
  public readonly offset: number;

  constructor(x = 0, y = 0, z = 0, w = 1, buffer?: Float32Array, offset = 0) {
    if (buffer) {
      this.data = buffer;
      this.offset = offset;
      if (x !== 0 || y !== 0 || z !== 0 || w !== 1) {
        this.data[this.offset] = x;
        this.data[this.offset + 1] = y;
        this.data[this.offset + 2] = z;
        this.data[this.offset + 3] = w;
      }
    } else {
      this.data = new Float32Array([x, y, z, w]);
      this.offset = 0;
    }
  }

  public get x(): number {
    return this.data[this.offset]!;
  }
  public set x(val: number) {
    this.data[this.offset] = val;
  }

  public get y(): number {
    return this.data[this.offset + 1]!;
  }
  public set y(val: number) {
    this.data[this.offset + 1] = val;
  }

  public get z(): number {
    return this.data[this.offset + 2]!;
  }
  public set z(val: number) {
    this.data[this.offset + 2] = val;
  }

  public get w(): number {
    return this.data[this.offset + 3]!;
  }
  public set w(val: number) {
    this.data[this.offset + 3] = val;
  }

  public identity(): this {
    this.data[this.offset] = 0;
    this.data[this.offset + 1] = 0;
    this.data[this.offset + 2] = 0;
    this.data[this.offset + 3] = 1;
    return this;
  }

  public setAxisAngle(axis: Vec3, rad: number): this {
    const half = rad * 0.5;
    const s = Math.sin(half);
    this.data[this.offset] = axis.x * s;
    this.data[this.offset + 1] = axis.y * s;
    this.data[this.offset + 2] = axis.z * s;
    this.data[this.offset + 3] = Math.cos(half);
    return this;
  }

  public multiply(other: Quat, out: Quat = this): Quat {
    const ax = this.x, ay = this.y, az = this.z, aw = this.w;
    const bx = other.x, by = other.y, bz = other.z, bw = other.w;

    out.data[out.offset] = ax * bw + aw * bx + ay * bz - az * by;
    out.data[out.offset + 1] = ay * bw + aw * by + az * bx - ax * bz;
    out.data[out.offset + 2] = az * bw + aw * bz + ax * by - ay * bx;
    out.data[out.offset + 3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  }

  public clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }
}
