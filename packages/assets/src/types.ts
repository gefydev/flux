/**
 * Types and priorities for the Flux streaming asset pipeline.
 */

export enum AssetPriority {
  Critical = 0,
  High = 1,
  Normal = 2,
  Low = 3,
  Background = 4,
}

export enum AssetStatus {
  Pending = "Pending",
  Loading = "Loading",
  Loaded = "Loaded",
  Failed = "Failed",
}

export interface AssetLoader<T = any> {
  readonly name: string;
  readonly extensions: string[];
  load(path: string, options?: Record<string, any>): Promise<T>;
}
