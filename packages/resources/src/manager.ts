import { type BufferDescriptor, FluxBuffer } from "./buffer.js";
import { HandlePool, type ResourceHandle } from "./handle.js";
import { StagingPool } from "./staging.js";

/**
 * Global Resource Manager for Flux Engine.
 * Manages allocation, lifetimes, handles, and staging memory across RAM and VRAM.
 */
export class ResourceManager {
  private handlePool = new HandlePool();
  private buffers = new Map<number, FluxBuffer>();
  public readonly staging = new StagingPool();

  private _totalAllocatedBytes = 0;

  public get totalAllocatedBytes(): number {
    return this._totalAllocatedBytes;
  }

  /**
   * Create and register a new GPU buffer.
   */
  public createBuffer(desc: BufferDescriptor): ResourceHandle<FluxBuffer> {
    const handle = this.handlePool.allocate<FluxBuffer>("Buffer");
    const buffer = new FluxBuffer(desc);

    this.buffers.set(handle.id, buffer);
    this._totalAllocatedBytes += buffer.size;
    return handle;
  }

  /**
   * Retrieve a buffer by its generational handle.
   */
  public getBuffer(handle: ResourceHandle<FluxBuffer>): FluxBuffer | undefined {
    if (!this.handlePool.isValid(handle)) {
      return undefined;
    }
    return this.buffers.get(handle.id);
  }

  /**
   * Destroy a buffer and release its memory.
   */
  public destroyBuffer(handle: ResourceHandle<FluxBuffer>): boolean {
    if (!this.handlePool.isValid(handle)) {
      return false;
    }

    const buffer = this.buffers.get(handle.id);
    if (buffer) {
      this._totalAllocatedBytes -= buffer.size;
      this.buffers.delete(handle.id);
      this.handlePool.free(handle);
      return true;
    }

    return false;
  }

  /**
   * Iterate all dirty buffers needing GPU synchronization.
   */
  public *getDirtyBuffers(): IterableIterator<FluxBuffer> {
    for (const buf of this.buffers.values()) {
      if (buf.isDirty) {
        yield buf;
      }
    }
  }

  /**
   * Reset all resources and purge memory.
   */
  public clear(): void {
    this.buffers.clear();
    this.staging.clear();
    this._totalAllocatedBytes = 0;
  }
}
