/**
 * Abstract networking transport for Flux Engine.
 * Supports WebSockets, WebRTC DataChannels, WebTransport, and custom peer transports.
 */

export enum ConnectionState {
  Disconnected = "Disconnected",
  Connecting = "Connecting",
  Connected = "Connected",
  Disconnecting = "Disconnecting",
}

export type MessageHandler = (data: Uint8Array) => void;
export type ConnectionHandler = () => void;

export interface NetworkTransport {
  readonly state: ConnectionState;
  connect(url: string): Promise<void>;
  disconnect(): void;
  send(data: ArrayBufferView | ArrayBuffer): void;
  onMessage(handler: MessageHandler): () => void;
  onConnect(handler: ConnectionHandler): () => void;
  onDisconnect(handler: ConnectionHandler): () => void;
}
