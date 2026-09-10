import { AssetHandle } from "./handle.js";
import { BinaryLoader, JsonLoader, TextLoader } from "./loaders.js";
import { type AssetLoader, AssetPriority, AssetStatus } from "./types.js";

/**
 * High-performance streaming asset manager for Flux Engine.
 * Supports async handles, automatic format routing, caching, and priority queues.
 */
export class AssetManager {
  private loaders = new Map<string, AssetLoader>();
  private cache = new Map<string, AssetHandle>();

  constructor() {
    this.registerLoader(TextLoader);
    this.registerLoader(JsonLoader);
    this.registerLoader(BinaryLoader);
  }

  public registerLoader(loader: AssetLoader): void {
    for (const ext of loader.extensions) {
      this.loaders.set(ext.toLowerCase(), loader);
    }
  }

  /**
   * Request an asset immediately returning an AssetHandle.
   * If already cached or loading, returns the existing handle.
   */
  public request<T = any>(path: string, priority = AssetPriority.Normal): AssetHandle<T> {
    const cached = this.cache.get(path);
    if (cached) {
      return cached as AssetHandle<T>;
    }

    const handle = new AssetHandle<T>(path, priority);
    this.cache.set(path, handle);

    this.startLoading(handle);
    return handle;
  }

  /**
   * Directly load and await an asset.
   */
  public async load<T = any>(path: string, priority = AssetPriority.Normal): Promise<T> {
    const handle = this.request<T>(path, priority);
    return handle.ready;
  }

  /**
   * Check if an asset is cached and loaded.
   */
  public get<T = any>(path: string): T | undefined {
    const handle = this.cache.get(path);
    return handle?.isLoaded ? (handle.data as T) : undefined;
  }

  /**
   * Unload an asset from cache.
   */
  public unload(path: string): boolean {
    return this.cache.delete(path);
  }

  public clear(): void {
    this.cache.clear();
  }

  private async startLoading<T>(handle: AssetHandle<T>): Promise<void> {
    handle.status = AssetStatus.Loading;
    handle.progress = 0.1;

    const ext = this.getExtension(handle.path);
    const loader = this.loaders.get(ext);

    if (!loader) {
      handle.reject(new Error(`[AssetManager] No loader registered for extension '.${ext}' (${handle.path})`));
      return;
    }

    try {
      const data = await loader.load(handle.path);
      handle.resolve(data);
    } catch (err: any) {
      handle.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private getExtension(path: string): string {
    const dotIdx = path.lastIndexOf(".");
    return dotIdx !== -1 ? path.slice(dotIdx + 1).toLowerCase() : "";
  }
}
