/**
 * GPU Buffer abstractions and dirty tracking for Flux Engine.
 */

export enum BufferUsage {
  MapRead = 1 << 0,
  MapWrite = 1 << 1,
  CopySrc = 1 << 2,
  CopyDst = 1 << 3,
  Index = 1 << 4,
  Vertex = 1 << 5,
  Uniform = 1 << 6,
  Storage = 1 << 7,
  Indirect = 1 << 8,
}

export interface DirtyRange {
  offset: number; // in bytes
  size: number;   // in bytes
}

export interface BufferDescriptor {
  label?: string;
  size: number; // in bytes
  usage: number; // bitmask of BufferUsage
  initialData?: ArrayBufferView | ArrayBuffer;
}

export class FluxBuffer {
  public readonly label: string;
  public readonly size: number;
  public readonly usage: number;

  private hostData: Uint8Array;
  private dirtyRanges: DirtyRange[] = [];
  public version = 0;

  constructor(desc: BufferDescriptor) {
    this.label = desc.label ?? "FluxBuffer";
    this.size = desc.size;
    this.usage = desc.usage;
    this.hostData = new Uint8Array(this.size);

    if (desc.initialData) {
      this.write(0, desc.initialData);
    }
  }

  public get isDirty(): boolean {
    return this.dirtyRanges.length > 0;
  }

  public get data(): Uint8Array {
    return this.hostData;
  }

  /**
   * Write data into the host buffer and mark the region as dirty for GPU upload.
   */
  public write(byteOffset: number, data: ArrayBufferView | ArrayBuffer): void {
    const src = ArrayBuffer.isView(data)
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data);

    if (byteOffset + src.byteLength > this.size) {
      throw new RangeError(
        `[FluxBuffer] Write out of bounds: offset ${byteOffset} + len ${src.byteLength} > size ${this.size}`
      );
    }

    this.hostData.set(src, byteOffset);
    this.markDirty(byteOffset, src.byteLength);
    this.version++;
  }

  /**
   * Mark a byte range as dirty. Automatically coalesces overlapping or contiguous ranges.
   */
  public markDirty(offset: number, size: number): void {
    if (size <= 0) return;

    const newEnd = offset + size;
    let merged = false;

    for (let i = 0; i < this.dirtyRanges.length; i++) {
      const r = this.dirtyRanges[i]!;
      const rEnd = r.offset + r.size;

      // Check overlap or adjacency
      if (offset <= rEnd && newEnd >= r.offset) {
        const start = Math.min(offset, r.offset);
        const end = Math.max(newEnd, rEnd);
        r.offset = start;
        r.size = end - start;
        merged = true;
        break;
      }
    }

    if (!merged) {
      this.dirtyRanges.push({ offset, size });
    }
  }

  /**
   * Get all pending dirty ranges that need GPU synchronization.
   */
  public getDirtyRanges(): readonly DirtyRange[] {
    return this.dirtyRanges;
  }

  /**
   * Clear dirty state after GPU upload.
   */
  public clearDirty(): void {
    this.dirtyRanges.length = 0;
  }
}
