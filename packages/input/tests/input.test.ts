import { describe, expect, it } from "bun:test";
import { InputManager } from "../src/index.js";

describe("@flow.engine/input", () => {
  it("should track keyboard and mouse button states across frames", () => {
    const input = new InputManager();

    input.keyboard.handleKeyDown("Space");
    expect(input.keyboard.isPressed("Space")).toBe(true);
    expect(input.keyboard.isJustPressed("Space")).toBe(true);

    input.endFrame();
    expect(input.keyboard.isPressed("Space")).toBe(true);
    expect(input.keyboard.isJustPressed("Space")).toBe(false); // cleared after frame

    input.keyboard.handleKeyUp("Space");
    expect(input.keyboard.isPressed("Space")).toBe(false);
    expect(input.keyboard.isJustReleased("Space")).toBe(true);
  });

  it("should evaluate semantic action maps", () => {
    const input = new InputManager();
    input.actions.bindKey("Jump", "Space");
    input.actions.bindMouseButton("Attack", 0); // Left Click

    expect(input.isPressed("Jump")).toBe(false);
    expect(input.isPressed("Attack")).toBe(false);

    input.keyboard.handleKeyDown("Space");
    expect(input.isPressed("Jump")).toBe(true);

    input.mouse.handleMouseDown(0);
    expect(input.isPressed("Attack")).toBe(true);
  });
});
