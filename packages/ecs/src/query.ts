import type { ComponentType, PackedComponentType } from "./component.js";
import type { Entity } from "./entity.js";
import type { World } from "./world.js";

export type AnyComponentType = ComponentType<any> | PackedComponentType<any>;

/**
 * High-speed cached query across one or more component types.
 */
export class Query {
  private world: World;
  private types: AnyComponentType[];

  constructor(world: World, types: AnyComponentType[]) {
    this.world = world;
    this.types = types;
  }

  /**
   * Iterate over all matching entities.
   */
  public *[Symbol.iterator](): IterableIterator<Entity> {
    if (this.types.length === 0) return;

    // Pick the storage with the smallest count as the driving iterator (optimization)
    let smallestType = this.types[0]!;
    let smallestCount = this.world.getStorage(smallestType).count;

    for (let i = 1; i < this.types.length; i++) {
      const t = this.types[i]!;
      const count = this.world.getStorage(t).count;
      if (count < smallestCount) {
        smallestCount = count;
        smallestType = t;
      }
    }

    const drivingStorage = this.world.getStorage(smallestType);
    const dense = (drivingStorage as any).denseEntities;
    const len = drivingStorage.count;
    if (len === 0) return;

    // Snapshot dense entity indices to prevent iterator corruption from in-loop deletions/mutations
    const snapshot = Array.isArray(dense) ? dense.slice(0, len) : (dense as Int32Array).slice(0, len);

    outer: for (let i = 0; i < len; i++) {
      const entityIndex = snapshot[i]!;
      const entity = this.world.getEntity(entityIndex);
      if (entity === -1 || !this.world.isAlive(entity)) {
        continue;
      }

      // Check that entity has all other components
      for (const t of this.types) {
        if (!this.world.getStorage(t).has(entityIndex)) {
          continue outer;
        }
      }

      // Convert entity index back to live entity
      yield entity;
    }
  }

  /**
   * Fast callback iteration without generator overhead.
   */
  public forEach(callback: (entity: Entity) => void): void {
    if (this.types.length === 0) return;

    let smallestType = this.types[0]!;
    let smallestCount = this.world.getStorage(smallestType).count;

    for (let i = 1; i < this.types.length; i++) {
      const t = this.types[i]!;
      const count = this.world.getStorage(t).count;
      if (count < smallestCount) {
        smallestCount = count;
        smallestType = t;
      }
    }

    const drivingStorage = this.world.getStorage(smallestType);
    const dense = (drivingStorage as any).denseEntities;
    const len = drivingStorage.count;
    if (len === 0) return;

    const snapshot = Array.isArray(dense) ? dense.slice(0, len) : (dense as Int32Array).slice(0, len);

    outer: for (let i = 0; i < len; i++) {
      const entityIndex = snapshot[i]!;
      const entity = this.world.getEntity(entityIndex);
      if (entity === -1 || !this.world.isAlive(entity)) {
        continue;
      }

      for (const t of this.types) {
        if (!this.world.getStorage(t).has(entityIndex)) {
          continue outer;
        }
      }
      callback(entity);
    }
  }
}
