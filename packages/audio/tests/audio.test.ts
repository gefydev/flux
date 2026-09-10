import { describe, expect, it } from "bun:test";
import { AudioManager } from "../src/index.js";

describe("@flux/audio", () => {
  it("should initialize AudioManager and compute bus volumes properly", () => {
    const audio = new AudioManager();

    audio.setMasterVolume(0.8);
    expect(audio.masterVolume).toBe(0.8);

    audio.sfxVolume = 0.5;
    expect(audio.sfxVolume).toBe(0.5);

    // Playing mock sound instance in headless test
    const instance = audio.play(null, { volume: 0.9, bus: "sfx" });
    expect(instance.id).toBeGreaterThan(0);
    expect(typeof instance.stop).toBe("function");
  });
});
