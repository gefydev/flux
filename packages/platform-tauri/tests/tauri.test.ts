import { describe, expect, it } from "bun:test";
import { TauriPlatform } from "../src/index.js";

describe("@flux/platform-tauri", () => {
  it("should detect Tauri availability and provide graceful fallback when running in tests", async () => {
    const platform = new TauriPlatform();

    expect(platform.type).toBe("tauri");
    expect(platform.isDesktop).toBe(true);
    expect(platform.isBrowser).toBe(false);
    expect(platform.isTauriAvailable).toBe(false); // In bun test runner, Tauri is absent

    // Calling invoke safely returns null without throwing
    const result = await platform.invoke("custom_command");
    expect(result).toBeNull();
  });

  it("should communicate with mock Tauri runtime if present", async () => {
    const platform = new TauriPlatform();
    let invokedCmd = "";

    (globalThis as any).__TAURI__ = {
      core: {
        invoke: async (cmd: string) => {
          invokedCmd = cmd;
          return { success: true };
        },
      },
    };

    expect(platform.isTauriAvailable).toBe(true);
    const res = await platform.invoke("render_frame");
    expect(res).toEqual({ success: true });
    expect(invokedCmd).toBe("render_frame");

    delete (globalThis as any).__TAURI__;
  });
});
