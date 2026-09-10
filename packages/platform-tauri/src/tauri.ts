import type { IPlatform, PlatformType } from "@flow.engine/platform";

/**
 * Platform adapter connecting Flux Engine to Tauri v2 and the Rust native backend.
 * Yields native desktop performance, native windowing, and zero-overhead IPC.
 */
export class TauriPlatform implements IPlatform {
  public readonly type: PlatformType = "tauri";
  public readonly isDesktop = true;
  public readonly isBrowser = false;

  public get isTauriAvailable(): boolean {
    const g = globalThis as any;
    return typeof g !== "undefined" && (!!g.__TAURI__ || !!g.__TAURI_INTERNALS__);
  }

  /**
   * Invoke a native Rust command defined in the Tauri backend.
   */
  public async invoke<T = any>(command: string, args: Record<string, any> = {}): Promise<T> {
    const g = globalThis as any;
    if (g.__TAURI__?.core?.invoke) {
      return g.__TAURI__.core.invoke(command, args);
    }
    if (g.__TAURI_INTERNALS__?.invoke) {
      return g.__TAURI_INTERNALS__.invoke(command, args);
    }
    console.warn(`[TauriPlatform] Cannot invoke '${command}': not running inside Tauri runtime.`);
    return null as unknown as T;
  }

  public setTitle(title: string): void {
    if (typeof document !== "undefined") {
      document.title = title;
    }
    this.invoke("plugin:window|set_title", { value: title }).catch(() => {});
  }

  public async setFullscreen(fullscreen: boolean): Promise<void> {
    await this.invoke("plugin:window|set_fullscreen", { value: fullscreen });
  }

  public getSize(): { width: number; height: number } {
    if (typeof window !== "undefined") {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { width: 1920, height: 1080 };
  }
}
