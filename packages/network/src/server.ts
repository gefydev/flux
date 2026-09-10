export interface ServerClient {
  readonly id: string;
  send(data: Uint8Array | ArrayBuffer): void;
  close(): void;
}

export type ClientConnectedHandler = (client: ServerClient) => void;
export type ClientDisconnectedHandler = (client: ServerClient) => void;
export type ClientMessageHandler = (client: ServerClient, data: Uint8Array) => void;

/**
 * Open Authoritative Multiplayer Server harness for Flux Engine.
 * Enables studios and indie gamedevs to run their own dedicated servers with 0 cost and no vendor lock-in.
 */
export class FluxServer {
  private clients = new Map<string, ServerClient>();
  private connectHandlers = new Set<ClientConnectedHandler>();
  private disconnectHandlers = new Set<ClientDisconnectedHandler>();
  private messageHandlers = new Set<ClientMessageHandler>();

  public get clientCount(): number {
    return this.clients.size;
  }

  public registerClient(client: ServerClient): void {
    this.clients.set(client.id, client);
    for (const h of this.connectHandlers) h(client);
  }

  public unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      for (const h of this.disconnectHandlers) h(client);
    }
  }

  public handleClientMessage(clientId: string, data: Uint8Array): void {
    const client = this.clients.get(clientId);
    if (client) {
      for (const h of this.messageHandlers) h(client, data);
    }
  }

  /**
   * Broadcast a binary packet to all connected clients (with optional excludeId).
   */
  public broadcast(data: Uint8Array, excludeId?: string): void {
    for (const [id, client] of this.clients.entries()) {
      if (id !== excludeId) {
        try {
          client.send(data);
        } catch (err) {
          console.error(`[FluxServer] Error broadcasting to client ${id}:`, err);
        }
      }
    }
  }

  public onClientConnect(handler: ClientConnectedHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  public onClientDisconnect(handler: ClientDisconnectedHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  public onMessage(handler: ClientMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }
}
