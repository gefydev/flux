import type { IPlatform, PlatformType } from "./types.js";

/**
 * Platform implementation for standard Web Browsers.
 */
export class BrowserPlatform implements IPlatform {
  public readonly type: PlatformType = "browser";
  public readonly isDesktop = false;
  public readonly isBrowser = true;

  public setTitle(title: string): void {
    if (typeof document !== "undefined") {
      document.title = title;
    }
  }

  public async setFullscreen(fullscreen: boolean): Promise<void> {
    if (typeof document === "undefined") return;

    if (fullscreen) {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      }
    }
  }

  public getSize(): { width: number; height: number } {
    if (typeof window !== "undefined") {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { width: 1280, height: 720 };
  }
}
