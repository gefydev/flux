/**
 * High-performance 3D vector backed by Float32Array.
 * Supports zero-allocation operations and memory-mapped subviews.
 */
export class Vec3 {
  public readonly data: Float32Array;
  public readonly offset: number;

  constructor(x = 0, y = 0, z = 0, buffer?: Float32Array, offset = 0) {
    if (buffer) {
      this.data = buffer;
      this.offset = offset;
      if (x !== 0 || y !== 0 || z !== 0) {
        this.data[this.offset] = x;
        this.data[this.offset + 1] = y;
        this.data[this.offset + 2] = z;
      }
    } else {
      this.data = new Float32Array([x, y, z]);
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

  public set(x: number, y: number, z: number): this {
    this.data[this.offset] = x;
    this.data[this.offset + 1] = y;
    this.data[this.offset + 2] = z;
    return this;
  }

  public copy(other: Vec3): this {
    this.data[this.offset] = other.data[other.offset]!;
    this.data[this.offset + 1] = other.data[other.offset + 1]!;
    this.data[this.offset + 2] = other.data[other.offset + 2]!;
    return this;
  }

  public add(other: Vec3, out: Vec3 = this): Vec3 {
    out.data[out.offset] = this.data[this.offset]! + other.data[other.offset]!;
    out.data[out.offset + 1] = this.data[this.offset + 1]! + other.data[other.offset + 1]!;
    out.data[out.offset + 2] = this.data[this.offset + 2]! + other.data[other.offset + 2]!;
    return out;
  }

  public sub(other: Vec3, out: Vec3 = this): Vec3 {
    out.data[out.offset] = this.data[this.offset]! - other.data[other.offset]!;
    out.data[out.offset + 1] = this.data[this.offset + 1]! - other.data[other.offset + 1]!;
    out.data[out.offset + 2] = this.data[this.offset + 2]! - other.data[other.offset + 2]!;
    return out;
  }

  public scale(scalar: number, out: Vec3 = this): Vec3 {
    out.data[out.offset] = this.data[this.offset]! * scalar;
    out.data[out.offset + 1] = this.data[this.offset + 1]! * scalar;
    out.data[out.offset + 2] = this.data[this.offset + 2]! * scalar;
    return out;
  }

  public dot(other: Vec3): number {
    return (
      this.data[this.offset]! * other.data[other.offset]! +
      this.data[this.offset + 1]! * other.data[other.offset + 1]! +
      this.data[this.offset + 2]! * other.data[other.offset + 2]!
    );
  }

  public cross(other: Vec3, out: Vec3 = this): Vec3 {
    const ax = this.data[this.offset]!;
    const ay = this.data[this.offset + 1]!;
    const az = this.data[this.offset + 2]!;
    const bx = other.data[other.offset]!;
    const by = other.data[other.offset + 1]!;
    const bz = other.data[other.offset + 2]!;

    out.data[out.offset] = ay * bz - az * by;
    out.data[out.offset + 1] = az * bx - ax * bz;
    out.data[out.offset + 2] = ax * by - ay * bx;
    return out;
  }

  public lengthSq(): number {
    const x = this.data[this.offset]!;
    const y = this.data[this.offset + 1]!;
    const z = this.data[this.offset + 2]!;
    return x * x + y * y + z * z;
  }

  public length(): number {
    return Math.hypot(this.data[this.offset]!, this.data[this.offset + 1]!, this.data[this.offset + 2]!);
  }

  public normalize(out: Vec3 = this): Vec3 {
    const len = this.length();
    if (len > 0.00001) {
      const inv = 1 / len;
      out.data[out.offset] = this.data[this.offset]! * inv;
      out.data[out.offset + 1] = this.data[this.offset + 1]! * inv;
      out.data[out.offset + 2] = this.data[this.offset + 2]! * inv;
    } else {
      out.data[out.offset] = 0;
      out.data[out.offset + 1] = 0;
      out.data[out.offset + 2] = 0;
    }
    return out;
  }

  public distance(other: Vec3): number {
    const dx = this.data[this.offset]! - other.data[other.offset]!;
    const dy = this.data[this.offset + 1]! - other.data[other.offset + 1]!;
    const dz = this.data[this.offset + 2]! - other.data[other.offset + 2]!;
    return Math.hypot(dx, dy, dz);
  }

  public clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }
}
