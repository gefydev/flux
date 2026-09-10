export type PlatformType = "browser" | "tauri" | "electron" | "headless";

export interface WindowConfig {
  title?: string;
  width?: number;
  height?: number;
  fullscreen?: boolean;
  resizable?: boolean;
}

export interface IPlatform {
  readonly type: PlatformType;
  readonly isDesktop: boolean;
  readonly isBrowser: boolean;
  setTitle(title: string): void;
  setFullscreen(fullscreen: boolean): Promise<void>;
  getSize(): { width: number; height: number };
}
