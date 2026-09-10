import type { AssetLoader } from "./types.js";

export const TextLoader: AssetLoader<string> = {
  name: "TextLoader",
  extensions: ["txt", "wgsl", "glsl", "vert", "frag", "md"],
  async load(path: string): Promise<string> {
    if (typeof fetch === "function") {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`[TextLoader] Failed to fetch '${path}': ${res.statusText}`);
      return res.text();
    }
    // Node / Bun fallback
    const fs = await import("fs/promises");
    return fs.readFile(path, "utf-8");
  },
};

export const JsonLoader: AssetLoader<any> = {
  name: "JsonLoader",
  extensions: ["json"],
  async load(path: string): Promise<any> {
    const text = await TextLoader.load(path);
    return JSON.parse(text);
  },
};

export const BinaryLoader: AssetLoader<ArrayBuffer> = {
  name: "BinaryLoader",
  extensions: ["bin", "dat", "wasm"],
  async load(path: string): Promise<ArrayBuffer> {
    if (typeof fetch === "function") {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`[BinaryLoader] Failed to fetch '${path}': ${res.statusText}`);
      return res.arrayBuffer();
    }
    const fs = await import("fs/promises");
    const buf = await fs.readFile(path);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  },
};
