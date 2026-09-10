import { describe, expect, it } from "bun:test";
import { AssetManager, AssetStatus } from "../src/index.js";

describe("@flux/assets", () => {
  it("should request assets and resolve handles asynchronously", async () => {
    const assets = new AssetManager();

    // Register a custom mock loader
    assets.registerLoader({
      name: "MockMeshLoader",
      extensions: ["mesh"],
      async load(path: string) {
        return { name: path, vertices: 300 };
      },
    });

    const handle = assets.request("character/hero.mesh");
    expect(handle.path).toBe("character/hero.mesh");
    expect(handle.status).toBe(AssetStatus.Loading);

    // Await ready
    const data = await handle.ready;
    expect(data.vertices).toBe(300);
    expect(handle.status).toBe(AssetStatus.Loaded);
    expect(handle.progress).toBe(1.0);

    // Caching check
    const secondRequest = assets.request("character/hero.mesh");
    expect(secondRequest).toBe(handle);
  });

  it("should fail gracefully when no loader is found", async () => {
    const assets = new AssetManager();
    const handle = assets.request("audio/theme.unknown_format");

    try {
      await handle.ready;
      expect(true).toBe(false);
    } catch (err: any) {
      expect(handle.status).toBe(AssetStatus.Failed);
      expect(err.message).toContain("No loader registered");
    }
  });
});
