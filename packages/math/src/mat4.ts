import { Vec3 } from "./vec3.js";

/**
 * High-performance 4x4 column-major matrix backed by Float32Array.
 * Optimized for WebGPU shaders and hardware transformation pipelines.
 */
export class Mat4 {
  public readonly data: Float32Array;
  public readonly offset: number;

  constructor(buffer?: Float32Array, offset = 0) {
    if (buffer) {
      this.data = buffer;
      this.offset = offset;
    } else {
      this.data = new Float32Array(16);
      this.offset = 0;
      this.identity();
    }
  }

  public identity(): this {
    const o = this.offset;
    const d = this.data;
    d[o + 0] = 1;  d[o + 1] = 0;  d[o + 2] = 0;  d[o + 3] = 0;
    d[o + 4] = 0;  d[o + 5] = 1;  d[o + 6] = 0;  d[o + 7] = 0;
    d[o + 8] = 0;  d[o + 9] = 0;  d[o + 10] = 1; d[o + 11] = 0;
    d[o + 12] = 0; d[o + 13] = 0; d[o + 14] = 0; d[o + 15] = 1;
    return this;
  }

  public copy(other: Mat4): this {
    const to = this.offset;
    const from = other.offset;
    const td = this.data;
    const fd = other.data;
    for (let i = 0; i < 16; i++) {
      td[to + i] = fd[from + i]!;
    }
    return this;
  }

  public multiply(other: Mat4, out: Mat4 = this): Mat4 {
    const a = this.data;
    const ao = this.offset;
    const b = other.data;
    const bo = other.offset;
    const r = out.data;
    const ro = out.offset;

    // Use temporary variables to allow in-place multiplication (a.multiply(b, a))
    const a00 = a[ao + 0]!, a01 = a[ao + 1]!, a02 = a[ao + 2]!, a03 = a[ao + 3]!;
    const a10 = a[ao + 4]!, a11 = a[ao + 5]!, a12 = a[ao + 6]!, a13 = a[ao + 7]!;
    const a20 = a[ao + 8]!, a21 = a[ao + 9]!, a22 = a[ao + 10]!, a23 = a[ao + 11]!;
    const a30 = a[ao + 12]!, a31 = a[ao + 13]!, a32 = a[ao + 14]!, a33 = a[ao + 15]!;

    let b0 = b[bo + 0]!, b1 = b[bo + 1]!, b2 = b[bo + 2]!, b3 = b[bo + 3]!;
    r[ro + 0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    r[ro + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    r[ro + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    r[ro + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[bo + 4]!; b1 = b[bo + 5]!; b2 = b[bo + 6]!; b3 = b[bo + 7]!;
    r[ro + 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    r[ro + 5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    r[ro + 6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    r[ro + 7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[bo + 8]!; b1 = b[bo + 9]!; b2 = b[bo + 10]!; b3 = b[bo + 11]!;
    r[ro + 8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    r[ro + 9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    r[ro + 10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    r[ro + 11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[bo + 12]!; b1 = b[bo + 13]!; b2 = b[bo + 14]!; b3 = b[bo + 15]!;
    r[ro + 12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    r[ro + 13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    r[ro + 14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    r[ro + 15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    return out;
  }

  public translate(v: Vec3, out: Mat4 = this): Mat4 {
    const x = v.x, y = v.y, z = v.z;
    const d = this.data;
    const o = this.offset;
    const r = out.data;
    const ro = out.offset;

    if (this !== out) {
      for (let i = 0; i < 12; i++) r[ro + i] = d[o + i]!;
    }

    r[ro + 12] = d[o + 0]! * x + d[o + 4]! * y + d[o + 8]! * z + d[o + 12]!;
    r[ro + 13] = d[o + 1]! * x + d[o + 5]! * y + d[o + 9]! * z + d[o + 13]!;
    r[ro + 14] = d[o + 2]! * x + d[o + 6]! * y + d[o + 10]! * z + d[o + 14]!;
    r[ro + 15] = d[o + 3]! * x + d[o + 7]! * y + d[o + 11]! * z + d[o + 15]!;
    return out;
  }

  public scale(v: Vec3, out: Mat4 = this): Mat4 {
    const x = v.x, y = v.y, z = v.z;
    const d = this.data;
    const o = this.offset;
    const r = out.data;
    const ro = out.offset;

    r[ro + 0] = d[o + 0]! * x;
    r[ro + 1] = d[o + 1]! * x;
    r[ro + 2] = d[o + 2]! * x;
    r[ro + 3] = d[o + 3]! * x;

    r[ro + 4] = d[o + 4]! * y;
    r[ro + 5] = d[o + 5]! * y;
    r[ro + 6] = d[o + 6]! * y;
    r[ro + 7] = d[o + 7]! * y;

    r[ro + 8] = d[o + 8]! * z;
    r[ro + 9] = d[o + 9]! * z;
    r[ro + 10] = d[o + 10]! * z;
    r[ro + 11] = d[o + 11]! * z;

    if (this !== out) {
      r[ro + 12] = d[o + 12]!;
      r[ro + 13] = d[o + 13]!;
      r[ro + 14] = d[o + 14]!;
      r[ro + 15] = d[o + 15]!;
    }
    return out;
  }

  public rotateX(rad: number, out: Mat4 = this): Mat4 {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a = this.data;
    const ao = this.offset;
    const r = out.data;
    const ro = out.offset;

    const a10 = a[ao + 4]!, a11 = a[ao + 5]!, a12 = a[ao + 6]!, a13 = a[ao + 7]!;
    const a20 = a[ao + 8]!, a21 = a[ao + 9]!, a22 = a[ao + 10]!, a23 = a[ao + 11]!;

    if (this !== out) {
      for (let i = 0; i < 4; i++) {
        r[ro + i] = a[ao + i]!;
        r[ro + 12 + i] = a[ao + 12 + i]!;
      }
    }

    r[ro + 4] = a10 * c + a20 * s;
    r[ro + 5] = a11 * c + a21 * s;
    r[ro + 6] = a12 * c + a22 * s;
    r[ro + 7] = a13 * c + a23 * s;
    r[ro + 8] = a20 * c - a10 * s;
    r[ro + 9] = a21 * c - a11 * s;
    r[ro + 10] = a22 * c - a12 * s;
    r[ro + 11] = a23 * c - a13 * s;
    return out;
  }

  public rotateY(rad: number, out: Mat4 = this): Mat4 {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a = this.data;
    const ao = this.offset;
    const r = out.data;
    const ro = out.offset;

    const a00 = a[ao + 0]!, a01 = a[ao + 1]!, a02 = a[ao + 2]!, a03 = a[ao + 3]!;
    const a20 = a[ao + 8]!, a21 = a[ao + 9]!, a22 = a[ao + 10]!, a23 = a[ao + 11]!;

    if (this !== out) {
      for (let i = 0; i < 4; i++) {
        r[ro + 4 + i] = a[ao + 4 + i]!;
        r[ro + 12 + i] = a[ao + 12 + i]!;
      }
    }

    r[ro + 0] = a00 * c - a20 * s;
    r[ro + 1] = a01 * c - a21 * s;
    r[ro + 2] = a02 * c - a22 * s;
    r[ro + 3] = a03 * c - a23 * s;
    r[ro + 8] = a00 * s + a20 * c;
    r[ro + 9] = a01 * s + a21 * c;
    r[ro + 10] = a02 * s + a22 * c;
    r[ro + 11] = a03 * s + a23 * c;
    return out;
  }

  public rotateZ(rad: number, out: Mat4 = this): Mat4 {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a = this.data;
    const ao = this.offset;
    const r = out.data;
    const ro = out.offset;

    const a00 = a[ao + 0]!, a01 = a[ao + 1]!, a02 = a[ao + 2]!, a03 = a[ao + 3]!;
    const a10 = a[ao + 4]!, a11 = a[ao + 5]!, a12 = a[ao + 6]!, a13 = a[ao + 7]!;

    if (this !== out) {
      for (let i = 0; i < 4; i++) {
        r[ro + 8 + i] = a[ao + 8 + i]!;
        r[ro + 12 + i] = a[ao + 12 + i]!;
      }
    }

    r[ro + 0] = a00 * c + a10 * s;
    r[ro + 1] = a01 * c + a11 * s;
    r[ro + 2] = a02 * c + a12 * s;
    r[ro + 3] = a03 * c + a13 * s;
    r[ro + 4] = a10 * c - a00 * s;
    r[ro + 5] = a11 * c - a01 * s;
    r[ro + 6] = a12 * c - a02 * s;
    r[ro + 7] = a13 * c - a03 * s;
    return out;
  }

  /**
   * Generates a perspective projection matrix.
   * Defaults to OpenGL/WebGL depth range (-1 to 1 NDC).
   * Pass isWebGpu = true for WebGPU depth range (0 to 1 NDC).
   */
  public perspective(fovyRad: number, aspect: number, near: number, far: number, isWebGpu = false): this {
    const f = 1.0 / Math.tan(fovyRad / 2);
    const nf = 1 / (near - far);
    const d = this.data;
    const o = this.offset;

    d[o + 0] = f / aspect;
    d[o + 1] = 0;
    d[o + 2] = 0;
    d[o + 3] = 0;

    d[o + 4] = 0;
    d[o + 5] = f;
    d[o + 6] = 0;
    d[o + 7] = 0;

    d[o + 8] = 0;
    d[o + 9] = 0;
    d[o + 10] = isWebGpu ? far * nf : (far + near) * nf;
    d[o + 11] = -1;

    d[o + 12] = 0;
    d[o + 13] = 0;
    d[o + 14] = isWebGpu ? far * near * nf : 2 * far * near * nf;
    d[o + 15] = 0;

    return this;
  }

  public clone(): Mat4 {
    const m = new Mat4();
    m.copy(this);
    return m;
  }
}
