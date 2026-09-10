/**
 * High-performance Sparse Set storage for components.
 * Guarantees O(1) lookups, insertions, deletions, and contiguous dense iteration.
 */

export interface IComponentStorage {
  has(entityIndex: number): boolean;
  remove(entityIndex: number): boolean;
  clear(): void;
  readonly count: number;
}

export class ObjectComponentStorage<T> implements IComponentStorage {
  private sparse: Int32Array;
  public denseEntities: number[] = [];
  public denseData: T[] = [];
  private capacity: number;

  constructor(initialCapacity = 100000) {
    this.capacity = initialCapacity;
    this.sparse = new Int32Array(initialCapacity).fill(-1);
  }

  public get count(): number {
    return this.denseEntities.length;
  }

  public has(entityIndex: number): boolean {
    if (entityIndex >= this.sparse.length) return false;
    const denseIdx = this.sparse[entityIndex]!;
    return denseIdx !== -1 && denseIdx < this.denseEntities.length && this.denseEntities[denseIdx] === entityIndex;
  }

  public get(entityIndex: number): T | undefined {
    if (entityIndex >= this.sparse.length) return undefined;
    const denseIdx = this.sparse[entityIndex]!;
    return denseIdx !== -1 ? this.denseData[denseIdx] : undefined;
  }

  public set(entityIndex: number, value: T): void {
    if (entityIndex >= this.sparse.length) {
      this.grow(entityIndex * 2);
    }

    const denseIdx = this.sparse[entityIndex]!;
    if (denseIdx !== -1 && denseIdx < this.denseEntities.length && this.denseEntities[denseIdx] === entityIndex) {
      this.denseData[denseIdx] = value;
      return;
    }

    // New insertion
    const newDenseIdx = this.denseEntities.length;
    this.sparse[entityIndex] = newDenseIdx;
    this.denseEntities.push(entityIndex);
    this.denseData.push(value);
  }

  public remove(entityIndex: number): boolean {
    if (!this.has(entityIndex)) return false;

    const denseIdx = this.sparse[entityIndex]!;
    const lastDenseIdx = this.denseEntities.length - 1;
    const lastEntity = this.denseEntities[lastDenseIdx]!;
    const lastData = this.denseData[lastDenseIdx]!;

    // Swap and pop
    this.denseEntities[denseIdx] = lastEntity;
    this.denseData[denseIdx] = lastData;
    this.sparse[lastEntity] = denseIdx;

    this.denseEntities.pop();
    this.denseData.pop();
    this.sparse[entityIndex] = -1;

    return true;
  }

  private grow(newCapacity: number): void {
    const nextCap = Math.max(newCapacity, this.capacity * 2);
    const newSparse = new Int32Array(nextCap).fill(-1);
    newSparse.set(this.sparse);
    this.sparse = newSparse;
    this.capacity = nextCap;
  }

  public clear(): void {
    this.sparse.fill(-1);
    this.denseEntities.length = 0;
    this.denseData.length = 0;
  }
}

/**
 * Packed contiguous Float32Array storage for SoA numeric data.
 */
export class PackedComponentStorage implements IComponentStorage {
  private sparse: Int32Array;
  public denseEntities: Int32Array;
  public denseBuffer: Float32Array;
  public readonly stride: number;
  private _count = 0;
  private capacity: number;

  constructor(stride: number, initialCapacity = 100000) {
    this.stride = stride;
    this.capacity = initialCapacity;
    this.sparse = new Int32Array(initialCapacity).fill(-1);
    this.denseEntities = new Int32Array(initialCapacity);
    this.denseBuffer = new Float32Array(initialCapacity * stride);
  }

  public get count(): number {
    return this._count;
  }

  public has(entityIndex: number): boolean {
    if (entityIndex >= this.sparse.length) return false;
    const denseIdx = this.sparse[entityIndex]!;
    return denseIdx !== -1 && denseIdx < this._count && this.denseEntities[denseIdx] === entityIndex;
  }

  public getOffset(entityIndex: number): number {
    const denseIdx = this.sparse[entityIndex]!;
    return denseIdx !== -1 ? denseIdx * this.stride : -1;
  }

  public setValues(entityIndex: number, values: ArrayLike<number>): void {
    if (entityIndex >= this.sparse.length || this._count >= this.capacity) {
      this.grow(Math.max(entityIndex * 2, this.capacity * 2));
    }

    let denseIdx = this.sparse[entityIndex]!;
    if (denseIdx === -1 || denseIdx >= this._count || this.denseEntities[denseIdx] !== entityIndex) {
      denseIdx = this._count++;
      this.sparse[entityIndex] = denseIdx;
      this.denseEntities[denseIdx] = entityIndex;
    }

    const start = denseIdx * this.stride;
    for (let i = 0; i < this.stride; i++) {
      this.denseBuffer[start + i] = values[i] ?? 0;
    }
  }

  public remove(entityIndex: number): boolean {
    if (!this.has(entityIndex)) return false;

    const denseIdx = this.sparse[entityIndex]!;
    const lastDenseIdx = this._count - 1;
    const lastEntity = this.denseEntities[lastDenseIdx]!;

    if (denseIdx !== lastDenseIdx) {
      // Swap dense entities
      this.denseEntities[denseIdx] = lastEntity;
      this.sparse[lastEntity] = denseIdx;

      // Swap dense buffer data
      const targetOffset = denseIdx * this.stride;
      const sourceOffset = lastDenseIdx * this.stride;
      for (let i = 0; i < this.stride; i++) {
        this.denseBuffer[targetOffset + i] = this.denseBuffer[sourceOffset + i]!;
      }
    }

    this._count--;
    this.sparse[entityIndex] = -1;
    return true;
  }

  private grow(newCapacity: number): void {
    const newCap = Math.max(newCapacity, this.capacity * 2);
    const newSparse = new Int32Array(newCap).fill(-1);
    newSparse.set(this.sparse);
    this.sparse = newSparse;

    const newDenseEnt = new Int32Array(newCap);
    newDenseEnt.set(this.denseEntities);
    this.denseEntities = newDenseEnt;

    const newDenseBuf = new Float32Array(newCap * this.stride);
    newDenseBuf.set(this.denseBuffer);
    this.denseBuffer = newDenseBuf;

    this.capacity = newCap;
  }

  public clear(): void {
    this.sparse.fill(-1);
    this._count = 0;
  }
}
