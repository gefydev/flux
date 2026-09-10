import { AssetPriority, AssetStatus } from "./types.js";

/**
 * Handle returned immediately upon requesting an asset.
 * Supports polling status, observing progress, or awaiting .ready promise.
 */
export class AssetHandle<T = any> {
  public readonly path: string;
  public readonly priority: AssetPriority;

  public status: AssetStatus = AssetStatus.Pending;
  public progress = 0; // [0, 1]
  public data: T | null = null;
  public error: Error | null = null;

  public readonly ready: Promise<T>;
  public resolve!: (data: T) => void;
  public reject!: (err: Error) => void;

  constructor(path: string, priority = AssetPriority.Normal) {
    this.path = path;
    this.priority = priority;

    this.ready = new Promise<T>((res, rej) => {
      this.resolve = (data: T) => {
        this.status = AssetStatus.Loaded;
        this.progress = 1.0;
        this.data = data;
        res(data);
      };
      this.reject = (err: Error) => {
        this.status = AssetStatus.Failed;
        this.error = err;
        rej(err);
      };
    });
  }

  public get isLoaded(): boolean {
    return this.status === AssetStatus.Loaded;
  }
}
