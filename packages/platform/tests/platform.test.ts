import { describe, expect, it } from "bun:test";
import { BrowserPlatform } from "../src/index.js";

describe("@flow.engine/platform", () => {
  it("should initialize BrowserPlatform and report window geometry", () => {
    const platform = new BrowserPlatform();
    expect(platform.type).toBe("browser");
    expect(platform.isBrowser).toBe(true);
    expect(platform.isDesktop).toBe(false);

    const size = platform.getSize();
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});
