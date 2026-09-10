/**
 * Staging buffer allocator for efficient CPU-to-GPU data transfers.
 * Recycles scratch memory blocks to avoid per-frame GC thrashing.
 */
export class StagingPool {
  private pool: Uint8Array[] = [];
  private blockSize: number;

  constructor(blockSize = 64 * 1024) {
    this.blockSize = blockSize;
  }

  public acquire(minSize: number): Uint8Array {
    const targetSize = Math.max(minSize, this.blockSize);
    for (let i = 0; i < this.pool.length; i++) {
      const b = this.pool[i]!;
      if (b.byteLength >= targetSize) {
        this.pool.splice(i, 1);
        return b;
      }
    }
    return new Uint8Array(targetSize);
  }

  public release(buffer: Uint8Array): void {
    // Keep max 16 buffers cached
    if (this.pool.length < 16) {
      this.pool.push(buffer);
    }
  }

  public clear(): void {
    this.pool.length = 0;
  }
}
