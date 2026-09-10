import { describe, expect, it } from "bun:test";
import { FluxServer, PacketReader, PacketWriter } from "../src/index.js";

describe("@flux/network", () => {
  it("should serialize and deserialize binary packets with zero data loss", () => {
    const writer = new PacketWriter();

    // Write a game entity state packet
    const MSG_TYPE_ENTITY_STATE = 42;
    writer
      .writeUint8(MSG_TYPE_ENTITY_STATE)
      .writeUint32(1001) // Entity ID
      .writeFloat32(123.456) // Position X
      .writeFloat32(-789.012) // Position Y
      .writeFloat32(50.0) // Position Z
      .writeString("Player_Gefy"); // Entity Name

    const packet = writer.toUint8Array();
    expect(packet.byteLength).toBeGreaterThan(0);

    const reader = new PacketReader(packet);
    expect(reader.readUint8()).toBe(42);
    expect(reader.readUint32()).toBe(1001);
    expect(reader.readFloat32()).toBeCloseTo(123.456, 3);
    expect(reader.readFloat32()).toBeCloseTo(-789.012, 3);
    expect(reader.readFloat32()).toBeCloseTo(50.0, 3);
    expect(reader.readString()).toBe("Player_Gefy");
    expect(reader.remainingBytes).toBe(0);
  });

  it("should manage authoritative multiplayer server clients and broadcasts", () => {
    const server = new FluxServer();
    const client1Packets: Uint8Array[] = [];
    const client2Packets: Uint8Array[] = [];

    const mockClient1 = {
      id: "client-1",
      send: (data: Uint8Array) => client1Packets.push(data),
      close: () => {},
    };

    const mockClient2 = {
      id: "client-2",
      send: (data: Uint8Array) => client2Packets.push(data),
      close: () => {},
    };

    server.registerClient(mockClient1);
    server.registerClient(mockClient2);
    expect(server.clientCount).toBe(2);

    const broadcastMsg = new Uint8Array([1, 2, 3, 4]);
    // Broadcast excluding sender (client-1)
    server.broadcast(broadcastMsg, "client-1");

    expect(client1Packets.length).toBe(0);
    expect(client2Packets.length).toBe(1);
    expect(client2Packets[0]).toEqual(broadcastMsg);

    server.unregisterClient("client-2");
    expect(server.clientCount).toBe(1);
  });
});
