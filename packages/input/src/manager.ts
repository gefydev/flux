import { ActionMap } from "./actions.js";
import { Keyboard } from "./keyboard.js";
import { Mouse } from "./mouse.js";

/**
 * Main input manager for Flux Engine.
 */
export class InputManager {
  public readonly keyboard = new Keyboard();
  public readonly mouse = new Mouse();
  public readonly actions = new ActionMap();

  private attachedElement: any = null;
  private onKeyDownBound: any = null;
  private onKeyUpBound: any = null;
  private onMouseMoveBound: any = null;
  private onMouseDownBound: any = null;
  private onMouseUpBound: any = null;

  /**
   * Bind event listeners to window or canvas.
   */
  public attach(element: any = globalThis): void {
    if (this.attachedElement || !element || typeof element.addEventListener !== "function") {
      return;
    }

    this.attachedElement = element;
    this.onKeyDownBound = (e: any) => this.keyboard.handleKeyDown(e.code);
    this.onKeyUpBound = (e: any) => this.keyboard.handleKeyUp(e.code);
    this.onMouseMoveBound = (e: any) => this.mouse.handleMouseMove(e.clientX, e.clientY, e.movementX, e.movementY);
    this.onMouseDownBound = (e: any) => this.mouse.handleMouseDown(e.button);
    this.onMouseUpBound = (e: any) => this.mouse.handleMouseUp(e.button);

    element.addEventListener("keydown", this.onKeyDownBound);
    element.addEventListener("keyup", this.onKeyUpBound);
    element.addEventListener("mousemove", this.onMouseMoveBound);
    element.addEventListener("mousedown", this.onMouseDownBound);
    element.addEventListener("mouseup", this.onMouseUpBound);
  }

  public detach(): void {
    if (!this.attachedElement) return;

    this.attachedElement.removeEventListener("keydown", this.onKeyDownBound);
    this.attachedElement.removeEventListener("keyup", this.onKeyUpBound);
    this.attachedElement.removeEventListener("mousemove", this.onMouseMoveBound);
    this.attachedElement.removeEventListener("mousedown", this.onMouseDownBound);
    this.attachedElement.removeEventListener("mouseup", this.onMouseUpBound);

    this.attachedElement = null;
  }

  public isPressed(action: string): boolean {
    return this.actions.isActionPressed(action, this.keyboard, this.mouse);
  }

  public isJustPressed(action: string): boolean {
    return this.actions.isActionJustPressed(action, this.keyboard, this.mouse);
  }

  /**
   * Reset transient frame states (call at the end of each frame).
   */
  public endFrame(): void {
    this.keyboard.endFrame();
    this.mouse.endFrame();
  }
}
