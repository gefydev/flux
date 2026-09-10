/**
 * Mouse position, button clicks, delta movements, and wheel tracking.
 */
export class Mouse {
  public x = 0;
  public y = 0;
  public deltaX = 0;
  public deltaY = 0;
  public wheel = 0;

  private pressedButtons = new Set<number>();
  private justPressedButtons = new Set<number>();
  private justReleasedButtons = new Set<number>();

  public isButtonPressed(button: number): boolean {
    return this.pressedButtons.has(button);
  }

  public isButtonJustPressed(button: number): boolean {
    return this.justPressedButtons.has(button);
  }

  public isButtonJustReleased(button: number): boolean {
    return this.justReleasedButtons.has(button);
  }

  public handleMouseMove(x: number, y: number, deltaX = 0, deltaY = 0): void {
    this.x = x;
    this.y = y;
    this.deltaX += deltaX;
    this.deltaY += deltaY;
  }

  public handleMouseDown(button: number): void {
    if (!this.pressedButtons.has(button)) {
      this.justPressedButtons.add(button);
    }
    this.pressedButtons.add(button);
  }

  public handleMouseUp(button: number): void {
    this.pressedButtons.delete(button);
    this.justReleasedButtons.add(button);
  }

  public handleWheel(delta: number): void {
    this.wheel += delta;
  }

  public endFrame(): void {
    this.justPressedButtons.clear();
    this.justReleasedButtons.clear();
    this.deltaX = 0;
    this.deltaY = 0;
    this.wheel = 0;
  }

  public reset(): void {
    this.pressedButtons.clear();
    this.justPressedButtons.clear();
    this.justReleasedButtons.clear();
    this.deltaX = 0;
    this.deltaY = 0;
    this.wheel = 0;
  }
}
