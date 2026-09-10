import type { ComponentType, PackedComponentType } from "./component.js";
import { type Entity, EntityPool } from "./entity.js";
import { type AnyComponentType, Query } from "./query.js";
import { type IComponentStorage, ObjectComponentStorage, PackedComponentStorage } from "./storage.js";
import { type System, type SystemDefinition, defineSystem } from "./system.js";

/**
 * The World manages all entities, components, and systems in Flux ECS.
 */
export class World {
  private entityPool = new EntityPool();
  private storages = new Map<number, IComponentStorage>();
  private systems: SystemDefinition[] = [];
  private queryCache = new Map<string, Query>();

  /**
   * Create a new entity with a recycled generational ID.
   */
  public createEntity(): Entity {
    return this.entityPool.create();
  }

  /**
   * Destroy an entity and purge all of its components.
   */
  public destroyEntity(entity: Entity): boolean {
    if (!this.entityPool.isAlive(entity)) {
      return false;
    }
    const idx = this.entityPool.getIndex(entity);
    for (const storage of this.storages.values()) {
      storage.remove(idx);
    }
    return this.entityPool.destroy(entity);
  }

  /**
   * Check if an entity is alive.
   */
  public isAlive(entity: Entity): boolean {
    return this.entityPool.isAlive(entity);
  }

  /**
   * Get the internal storage for a component type.
   */
  public getStorage(type: AnyComponentType): IComponentStorage {
    let storage = this.storages.get(type.id);
    if (!storage) {
      if ("isPacked" in type && type.isPacked) {
        storage = new PackedComponentStorage(type.stride);
      } else {
        storage = new ObjectComponentStorage();
      }
      this.storages.set(type.id, storage);
    }
    return storage;
  }

  /**
   * Attach an object component to an entity.
   */
  public add<T extends object>(entity: Entity, type: ComponentType<T>, initial?: Partial<T>): T {
    const idx = this.entityPool.getIndex(entity);
    const storage = this.getStorage(type) as ObjectComponentStorage<T>;
    const value = type.create(initial);
    storage.set(idx, value);
    return value;
  }

  /**
   * Attach a packed contiguous numeric component to an entity.
   */
  public addPacked(entity: Entity, type: PackedComponentType, values: ArrayLike<number>): void {
    const idx = this.entityPool.getIndex(entity);
    const storage = this.getStorage(type) as PackedComponentStorage;
    storage.setValues(idx, values);
  }

  /**
   * Remove a component from an entity.
   */
  public remove(entity: Entity, type: AnyComponentType): boolean {
    const idx = this.entityPool.getIndex(entity);
    const storage = this.storages.get(type.id);
    return storage ? storage.remove(idx) : false;
  }

  /**
   * Check if an entity has a specific component.
   */
  public has(entity: Entity, type: AnyComponentType): boolean {
    const idx = this.entityPool.getIndex(entity);
    const storage = this.storages.get(type.id);
    return storage ? storage.has(idx) : false;
  }

  /**
   * Get an entity's object component.
   */
  public get<T extends object>(entity: Entity, type: ComponentType<T>): T | undefined {
    const idx = this.entityPool.getIndex(entity);
    const storage = this.storages.get(type.id) as ObjectComponentStorage<T> | undefined;
    return storage ? storage.get(idx) : undefined;
  }

  /**
   * Get the direct Float32Array buffer offset for a packed component.
   */
  public getPackedOffset(entity: Entity, type: PackedComponentType): number {
    const idx = this.entityPool.getIndex(entity);
    const storage = this.storages.get(type.id) as PackedComponentStorage | undefined;
    return storage ? storage.getOffset(idx) : -1;
  }

  /**
   * Get the underlying contiguous Float32Array buffer for a packed component type.
   */
  public getPackedBuffer(type: PackedComponentType): Float32Array {
    const storage = this.getStorage(type) as PackedComponentStorage;
    return storage.denseBuffer;
  }

  /**
   * Query entities having all specified components.
   */
  public query(...types: AnyComponentType[]): Query {
    const key = types.map((t) => t.id).sort().join(":");
    let q = this.queryCache.get(key);
    if (!q) {
      q = new Query(this, types);
      this.queryCache.set(key, q);
    }
    return q;
  }

  /**
   * Register a system to run during world updates.
   */
  public registerSystem(system: System): this {
    this.systems.push(defineSystem(system));
    // Sort systems by priority (lower priority runs first)
    this.systems.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    return this;
  }

  /**
   * Run one tick of all systems in the world.
   */
  public update(dt: number): void {
    for (const sys of this.systems) {
      sys.update(this, dt);
    }
  }

  /**
   * Clear all entities and reset storages.
   */
  public clear(): void {
    this.entityPool.clear();
    for (const storage of this.storages.values()) {
      storage.clear();
    }
  }
}
