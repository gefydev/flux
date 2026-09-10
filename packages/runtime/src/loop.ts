import { Clock } from "./clock.js";

export type LoopCallback = (dt: number) => void;
export type RenderCallback = (alpha: number) => void;

/**
 * Execution engine loop handling frame requests across Browser, Node, and Bun runtimes.
 */
export class EngineLoop {
  public readonly clock = new Clock();
  private running = false;
  private animFrameId: any = null;

  private fixedUpdateCallbacks: LoopCallback[] = [];
  private updateCallbacks: LoopCallback[] = [];
  private renderCallbacks: RenderCallback[] = [];

  constructor(fixedTimeStep = 1 / 60) {
    this.clock.fixedTimeStep = fixedTimeStep;
  }

  public get isRunning(): boolean {
    return this.running;
  }

  public onFixedUpdate(cb: LoopCallback): this {
    this.fixedUpdateCallbacks.push(cb);
    return this;
  }

  public onUpdate(cb: LoopCallback): this {
    this.updateCallbacks.push(cb);
    return this;
  }

  public onRender(cb: RenderCallback): this {
    this.renderCallbacks.push(cb);
    return this;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.scheduleNext();
  }

  public stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(this.animFrameId);
      } else {
        clearTimeout(this.animFrameId);
      }
      this.animFrameId = null;
    }
  }

  /**
   * Execute a single step (useful for headless testing or manual step-through).
   */
  public step(time = performance.now()): void {
    this.clock.tick(time);
    if (this.clock.delta === 0) return;

    // 1. Deterministic fixed steps (Physics, network sync)
    while (this.clock.consumeFixedStep()) {
      for (const cb of this.fixedUpdateCallbacks) {
        cb(this.clock.fixedTimeStep);
      }
    }

    // 2. Variable update (Gameplay, input, logic)
    for (const cb of this.updateCallbacks) {
      cb(this.clock.delta);
    }

    // 3. Render pass (alpha interpolation)
    for (const cb of this.renderCallbacks) {
      cb(this.clock.alpha);
    }
  }

  private scheduleNext(): void {
    if (!this.running) return;

    if (typeof requestAnimationFrame === "function") {
      this.animFrameId = requestAnimationFrame((time) => {
        this.step(time);
        this.scheduleNext();
      });
    } else {
      // Headless / Server / Bun environment: run ~60hz
      this.animFrameId = setTimeout(() => {
        this.step(performance.now());
        this.scheduleNext();
      }, 16);
    }
  }
}
