/**
 * High-precision clock and timestep accumulator for Flux Engine.
 * Supports variable frame rates and deterministic fixed timestep loops.
 */
export class Clock {
  public delta = 0; // seconds
  public elapsed = 0; // seconds
  public frame = 0;
  public fps = 0;
  public alpha = 0; // [0, 1] interpolation factor between fixed steps

  public fixedTimeStep = 1 / 60; // 60hz
  public maxDelta = 0.1; // clamp delta to 100ms to prevent spiral of death

  private lastTime = 0;
  private accumulator = 0;
  private fpsFrames = 0;
  private fpsLastTime = 0;

  constructor(fixedTimeStep = 1 / 60, maxDelta = 0.1) {
    this.fixedTimeStep = fixedTimeStep;
    this.maxDelta = maxDelta;
  }

  public start(time = performance.now()): void {
    this.lastTime = time;
    this.fpsLastTime = time;
    this.elapsed = 0;
    this.frame = 0;
    this.accumulator = 0;
  }

  /**
   * Advance clock and calculate frame delta time.
   */
  public tick(currentTime = performance.now()): void {
    if (this.lastTime === 0) {
      this.start(currentTime);
      return;
    }

    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp delta
    if (dt > this.maxDelta) {
      dt = this.maxDelta;
    }

    this.delta = dt;
    this.elapsed += dt;
    this.accumulator += dt;
    this.frame++;

    // Calculate FPS smoothed over 500ms
    this.fpsFrames++;
    const fpsInterval = currentTime - this.fpsLastTime;
    if (fpsInterval >= 500) {
      this.fps = Math.round((this.fpsFrames * 1000) / fpsInterval);
      this.fpsFrames = 0;
      this.fpsLastTime = currentTime;
    }

    this.alpha = this.accumulator / this.fixedTimeStep;
  }

  /**
   * Check if a fixed timestep should run.
   */
  public consumeFixedStep(): boolean {
    if (this.accumulator >= this.fixedTimeStep) {
      this.accumulator -= this.fixedTimeStep;
      this.alpha = this.accumulator / this.fixedTimeStep;
      return true;
    }
    return false;
  }
}
