/**
 * Keyboard input tracking with frame-based justPressed and justReleased states.
 */
export class Keyboard {
  private pressedKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private justReleasedKeys = new Set<string>();

  public isPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  public isJustPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  public isJustReleased(code: string): boolean {
    return this.justReleasedKeys.has(code);
  }

  public handleKeyDown(code: string): void {
    if (!this.pressedKeys.has(code)) {
      this.justPressedKeys.add(code);
    }
    this.pressedKeys.add(code);
  }

  public handleKeyUp(code: string): void {
    this.pressedKeys.delete(code);
    this.justReleasedKeys.add(code);
  }

  public endFrame(): void {
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
  }

  public reset(): void {
    this.pressedKeys.clear();
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
  }
}
