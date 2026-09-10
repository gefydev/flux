/**
 * Type-safe, low-overhead event bus for Flux Engine.
 */
export type EventCallback<T = any> = (payload: T) => void;

export class EventBus<Events extends Record<string, any> = Record<string, any>> {
  private listeners = new Map<keyof Events, Set<EventCallback<any>>>();

  /**
   * Subscribe to an event.
   */
  public on<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event for one occurrence only.
   */
  public once<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): () => void {
    const wrapper: EventCallback<Events[K]> = (payload) => {
      this.off(event, wrapper);
      callback(payload);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event.
   */
  public off<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers.
   */
  public emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const callback of set) {
        try {
          callback(payload);
        } catch (err) {
          console.error(`[EventBus] Error in listener for event "${String(event)}":`, err);
        }
      }
    }
  }

  /**
   * Clear all registered listeners.
   */
  public clear(): void {
    this.listeners.clear();
  }
}
