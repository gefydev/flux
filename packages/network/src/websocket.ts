import {
  type ConnectionHandler,
  ConnectionState,
  type MessageHandler,
  type NetworkTransport,
} from "./transport.js";

/**
 * High-performance WebSocket client transport.
 * Works seamlessly in Browser, Bun, and modern Node runtimes.
 */
export class WebSocketTransport implements NetworkTransport {
  private ws: WebSocket | null = null;
  private _state = ConnectionState.Disconnected;

  private messageHandlers = new Set<MessageHandler>();
  private connectHandlers = new Set<ConnectionHandler>();
  private disconnectHandlers = new Set<ConnectionHandler>();

  public get state(): ConnectionState {
    return this._state;
  }

  public async connect(url: string): Promise<void> {
    if (this._state === ConnectionState.Connected || this._state === ConnectionState.Connecting) {
      return;
    }

    this._state = ConnectionState.Connecting;

    return new Promise((resolve, reject) => {
      try {
        const SocketClass = globalThis.WebSocket;
        if (!SocketClass) {
          throw new Error("[WebSocketTransport] WebSocket API not available in this environment.");
        }

        this.ws = new SocketClass(url);
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
          this._state = ConnectionState.Connected;
          for (const h of this.connectHandlers) h();
          resolve();
        };

        this.ws.onclose = () => {
          this._state = ConnectionState.Disconnected;
          for (const h of this.disconnectHandlers) h();
        };

        this.ws.onerror = (err) => {
          if (this._state === ConnectionState.Connecting) {
            reject(err);
          }
        };

        this.ws.onmessage = (event) => {
          let data: Uint8Array;
          if (event.data instanceof ArrayBuffer) {
            data = new Uint8Array(event.data);
          } else if (ArrayBuffer.isView(event.data)) {
            data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
          } else if (typeof event.data === "string") {
            data = new TextEncoder().encode(event.data);
          } else {
            return;
          }

          for (const handler of this.messageHandlers) {
            handler(data);
          }
        };
      } catch (err) {
        this._state = ConnectionState.Disconnected;
        reject(err);
      }
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this._state = ConnectionState.Disconnecting;
      this.ws.close();
      this.ws = null;
      this._state = ConnectionState.Disconnected;
    }
  }

  public send(data: ArrayBufferView | ArrayBuffer): void {
    if (!this.ws || this._state !== ConnectionState.Connected) {
      throw new Error("[WebSocketTransport] Cannot send packet: not connected.");
    }
    this.ws.send(data);
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  public onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }
}
