/**
 * Generational Resource Handle.
 * Prevents use-after-free and stale resource references.
 */

export interface ResourceHandle<T = unknown> {
  readonly id: number;
  readonly type: string;
}

const INDEX_MASK = 0xfffff;
const GENERATION_SHIFT = 20;

export class HandlePool {
  private generations: Uint16Array;
  private freeList: number[] = [];
  private nextIndex = 0;
  private capacity: number;

  constructor(initialCapacity = 10000) {
    this.capacity = initialCapacity;
    this.generations = new Uint16Array(initialCapacity);
  }

  public allocate<T>(type: string): ResourceHandle<T> {
    let index: number;
    if (this.freeList.length > 0) {
      index = this.freeList.pop()!;
    } else {
      if (this.nextIndex >= this.capacity) {
        this.grow();
      }
      index = this.nextIndex++;
    }

    const gen = this.generations[index]!;
    const id = (gen << GENERATION_SHIFT) | (index & INDEX_MASK);
    return { id, type };
  }

  public free(handle: ResourceHandle<any>): boolean {
    const index = handle.id & INDEX_MASK;
    const gen = handle.id >>> GENERATION_SHIFT;

    if (index >= this.nextIndex || this.generations[index] !== gen) {
      return false; // Stale handle
    }

    this.generations[index] = (this.generations[index]! + 1) & 0xfff;
    this.freeList.push(index);
    return true;
  }

  public isValid(handle: ResourceHandle<any>): boolean {
    const index = handle.id & INDEX_MASK;
    const gen = handle.id >>> GENERATION_SHIFT;
    return index < this.nextIndex && this.generations[index] === gen;
  }

  private grow(): void {
    const newCap = this.capacity * 2;
    const newGens = new Uint16Array(newCap);
    newGens.set(this.generations);
    this.generations = newGens;
    this.capacity = newCap;
  }
}
