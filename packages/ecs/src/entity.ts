/**
 * Entity ID representation and recycling pool.
 * Uses 20-bit index and 12-bit generation to detect stale entity references.
 */

export type Entity = number;
export const NULL_ENTITY: Entity = 0;

const INDEX_MASK = 0xfffff; // 20 bits -> ~1,000,000 entities
const GENERATION_SHIFT = 20;

export class EntityPool {
  private generations: Uint16Array;
  private alive: Uint8Array;
  private freeList: number[] = [];
  private nextIndex = 1; // 0 is reserved as NULL_ENTITY
  private capacity: number;

  constructor(initialCapacity = 100000) {
    this.capacity = initialCapacity;
    this.generations = new Uint16Array(initialCapacity);
    this.alive = new Uint8Array(initialCapacity);
  }

  public create(): Entity {
    let index: number;
    if (this.freeList.length > 0) {
      index = this.freeList.pop()!;
    } else {
      if (this.nextIndex >= this.capacity) {
        this.grow();
      }
      index = this.nextIndex++;
    }

    this.alive[index] = 1;
    const gen = this.generations[index]!;
    return (gen << GENERATION_SHIFT) | (index & INDEX_MASK);
  }

  public destroy(entity: Entity): boolean {
    const index = entity & INDEX_MASK;
    const gen = entity >>> GENERATION_SHIFT;

    if (index >= this.nextIndex || this.alive[index] === 0 || this.generations[index] !== gen) {
      return false; // Stale or invalid entity
    }

    this.alive[index] = 0;
    // Increment generation so existing handles become invalid
    this.generations[index] = (this.generations[index]! + 1) & 0xfff;
    this.freeList.push(index);
    return true;
  }

  public isAlive(entity: Entity): boolean {
    const index = entity & INDEX_MASK;
    const gen = entity >>> GENERATION_SHIFT;
    return index < this.nextIndex && this.alive[index] === 1 && this.generations[index] === gen;
  }

  public getIndex(entity: Entity): number {
    return entity & INDEX_MASK;
  }

  public getEntity(index: number): Entity {
    if (index >= this.nextIndex || this.alive[index] === 0) {
      return -1;
    }
    const gen = this.generations[index] ?? 0;
    return (gen << GENERATION_SHIFT) | (index & INDEX_MASK);
  }

  private grow(): void {
    const newCap = this.capacity * 2;
    const newGens = new Uint16Array(newCap);
    newGens.set(this.generations);
    this.generations = newGens;

    const newAlive = new Uint8Array(newCap);
    newAlive.set(this.alive);
    this.alive = newAlive;

    this.capacity = newCap;
  }

  public clear(): void {
    this.generations.fill(0);
    this.alive.fill(0);
    this.freeList.length = 0;
    this.nextIndex = 1;
  }
}
