/**
 * High-performance 4D vector / color / quaternion vector backed by Float32Array.
 * Supports zero-allocation operations and memory-mapped subviews.
 */
export class Vec4 {
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

  public set(x: number, y: number, z: number, w: number): this {
    this.data[this.offset] = x;
    this.data[this.offset + 1] = y;
    this.data[this.offset + 2] = z;
    this.data[this.offset + 3] = w;
    return this;
  }

  public copy(other: Vec4): this {
    this.data[this.offset] = other.data[other.offset]!;
    this.data[this.offset + 1] = other.data[other.offset + 1]!;
    this.data[this.offset + 2] = other.data[other.offset + 2]!;
    this.data[this.offset + 3] = other.data[other.offset + 3]!;
    return this;
  }

  public add(other: Vec4, out: Vec4 = this): Vec4 {
    out.data[out.offset] = this.data[this.offset]! + other.data[other.offset]!;
    out.data[out.offset + 1] = this.data[this.offset + 1]! + other.data[other.offset + 1]!;
    out.data[out.offset + 2] = this.data[this.offset + 2]! + other.data[other.offset + 2]!;
    out.data[out.offset + 3] = this.data[this.offset + 3]! + other.data[other.offset + 3]!;
    return out;
  }

  public sub(other: Vec4, out: Vec4 = this): Vec4 {
    out.data[out.offset] = this.data[this.offset]! - other.data[other.offset]!;
    out.data[out.offset + 1] = this.data[this.offset + 1]! - other.data[other.offset + 1]!;
    out.data[out.offset + 2] = this.data[this.offset + 2]! - other.data[other.offset + 2]!;
    out.data[out.offset + 3] = this.data[this.offset + 3]! - other.data[other.offset + 3]!;
    return out;
  }

  public scale(scalar: number, out: Vec4 = this): Vec4 {
    out.data[out.offset] = this.data[this.offset]! * scalar;
    out.data[out.offset + 1] = this.data[this.offset + 1]! * scalar;
    out.data[out.offset + 2] = this.data[this.offset + 2]! * scalar;
    out.data[out.offset + 3] = this.data[this.offset + 3]! * scalar;
    return out;
  }

  public dot(other: Vec4): number {
    return (
      this.data[this.offset]! * other.data[other.offset]! +
      this.data[this.offset + 1]! * other.data[other.offset + 1]! +
      this.data[this.offset + 2]! * other.data[other.offset + 2]! +
      this.data[this.offset + 3]! * other.data[other.offset + 3]!
    );
  }

  public clone(): Vec4 {
    return new Vec4(this.x, this.y, this.z, this.w);
  }
}
