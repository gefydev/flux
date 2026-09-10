import type { Keyboard } from "./keyboard.js";
import type { Mouse } from "./mouse.js";

/**
 * Action mapping binding semantic gameplay actions to physical input devices.
 */
export class ActionMap {
  private keyBindings = new Map<string, string[]>(); // actionName -> keyCodes[]
  private mouseBindings = new Map<string, number[]>(); // actionName -> mouseButtons[]

  public bindKey(action: string, keyCode: string): this {
    let list = this.keyBindings.get(action);
    if (!list) {
      list = [];
      this.keyBindings.set(action, list);
    }
    if (!list.includes(keyCode)) list.push(keyCode);
    return this;
  }

  public bindMouseButton(action: string, button: number): this {
    let list = this.mouseBindings.get(action);
    if (!list) {
      list = [];
      this.mouseBindings.set(action, list);
    }
    if (!list.includes(button)) list.push(button);
    return this;
  }

  public isActionPressed(action: string, keyboard: Keyboard, mouse: Mouse): boolean {
    const keys = this.keyBindings.get(action);
    if (keys && keys.some((k) => keyboard.isPressed(k))) return true;

    const buttons = this.mouseBindings.get(action);
    if (buttons && buttons.some((b) => mouse.isButtonPressed(b))) return true;

    return false;
  }

  public isActionJustPressed(action: string, keyboard: Keyboard, mouse: Mouse): boolean {
    const keys = this.keyBindings.get(action);
    if (keys && keys.some((k) => keyboard.isJustPressed(k))) return true;

    const buttons = this.mouseBindings.get(action);
    if (buttons && buttons.some((b) => mouse.isButtonJustPressed(b))) return true;

    return false;
  }
}
