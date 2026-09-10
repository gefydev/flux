/**
 * High-performance 2D vector backed by Float32Array.
 * Supports zero-allocation operations and memory-mapped subviews.
 */
export class Vec2 {
  public readonly data: Float32Array;
  public readonly offset: number;

  constructor(x = 0, y = 0, buffer?: Float32Array, offset = 0) {
    if (buffer) {
      this.data = buffer;
      this.offset = offset;
      if (x !== 0 || y !== 0) {
        this.data[this.offset] = x;
        this.data[this.offset + 1] = y;
      }
    } else {
      this.data = new Float32Array([x, y]);
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

  public set(x: number, y: number): this {
    this.data[this.offset] = x;
    this.data[this.offset + 1] = y;
    return this;
  }

  public copy(other: Vec2): this {
    this.data[this.offset] = other.data[other.offset]!;
    this.data[this.offset + 1] = other.data[other.offset + 1]!;
    return this;
  }

  public add(other: Vec2, out: Vec2 = this): Vec2 {
    out.data[out.offset] = this.data[this.offset]! + other.data[other.offset]!;
    out.data[out.offset + 1] = this.data[this.offset + 1]! + other.data[other.offset + 1]!;
    return out;
  }

  public sub(other: Vec2, out: Vec2 = this): Vec2 {
    out.data[out.offset] = this.data[this.offset]! - other.data[other.offset]!;
    out.data[out.offset + 1] = this.data[this.offset + 1]! - other.data[other.offset + 1]!;
    return out;
  }

  public scale(scalar: number, out: Vec2 = this): Vec2 {
    out.data[out.offset] = this.data[this.offset]! * scalar;
    out.data[out.offset + 1] = this.data[this.offset + 1]! * scalar;
    return out;
  }

  public dot(other: Vec2): number {
    return this.data[this.offset]! * other.data[other.offset]! + this.data[this.offset + 1]! * other.data[other.offset + 1]!;
  }

  public lengthSq(): number {
    const x = this.data[this.offset]!;
    const y = this.data[this.offset + 1]!;
    return x * x + y * y;
  }

  public length(): number {
    return Math.hypot(this.data[this.offset]!, this.data[this.offset + 1]!);
  }

  public normalize(out: Vec2 = this): Vec2 {
    const len = this.length();
    if (len > 0.00001) {
      const inv = 1 / len;
      out.data[out.offset] = this.data[this.offset]! * inv;
      out.data[out.offset + 1] = this.data[this.offset + 1]! * inv;
    } else {
      out.data[out.offset] = 0;
      out.data[out.offset + 1] = 0;
    }
    return out;
  }

  public distance(other: Vec2): number {
    const dx = this.data[this.offset]! - other.data[other.offset]!;
    const dy = this.data[this.offset + 1]! - other.data[other.offset + 1]!;
    return Math.hypot(dx, dy);
  }

  public clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}
