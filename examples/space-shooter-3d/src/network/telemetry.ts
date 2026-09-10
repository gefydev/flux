/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * Real-time binary flight telemetry service utilizing @flow.engine/network.
 */

import { PacketReader, PacketWriter } from "@flow.engine/network";

export interface ITelemetrySnapshot {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  yaw: number;
  pitch: number;
  roll: number;
  hp: number;
  shield: number;
  score: number;
  wave: number;
}

/**
 * Binary flight recorder & network telemetry synchronization using @flow.engine/network.
 * Compresses flight dynamics into ultra-lean binary packets.
 */
export class FlightTelemetryService {
  private writer = new PacketWriter(512);
  public packetsSent = 0;
  public bytesStreamed = 0;
  public lastSnapshot: ITelemetrySnapshot | null = null;

  public serializeFlightState(snapshot: ITelemetrySnapshot): Uint8Array {
    this.writer.reset();
    // Packet Header
    this.writer.writeUint8(0x01); // Opcode 1: Flight Telemetry
    this.writer.writeFloat64(snapshot.timestamp);

    // Position & Kinematics
    this.writer.writeFloat32(snapshot.x);
    this.writer.writeFloat32(snapshot.y);
    this.writer.writeFloat32(snapshot.z);
    this.writer.writeFloat32(snapshot.speed);

    // Orientation
    this.writer.writeFloat32(snapshot.yaw);
    this.writer.writeFloat32(snapshot.pitch);
    this.writer.writeFloat32(snapshot.roll);

    // Vital Status
    this.writer.writeFloat32(snapshot.hp);
    this.writer.writeFloat32(snapshot.shield);
    this.writer.writeInt32(snapshot.score);
    this.writer.writeUint16(snapshot.wave);

    const packet = this.writer.toUint8Array();
    this.packetsSent++;
    this.bytesStreamed += packet.byteLength;
    this.lastSnapshot = snapshot;
    return packet;
  }

  public deserializeFlightState(data: Uint8Array): ITelemetrySnapshot | null {
    try {
      const reader = new PacketReader(data);
      const opcode = reader.readUint8();
      if (opcode !== 0x01) return null;

      const timestamp = reader.readFloat64();
      const x = reader.readFloat32();
      const y = reader.readFloat32();
      const z = reader.readFloat32();
      const speed = reader.readFloat32();

      const yaw = reader.readFloat32();
      const pitch = reader.readFloat32();
      const roll = reader.readFloat32();

      const hp = reader.readFloat32();
      const shield = reader.readFloat32();
      const score = reader.readInt32();
      const wave = reader.readUint16();

      return { timestamp, x, y, z, speed, yaw, pitch, roll, hp, shield, score, wave };
    } catch {
      return null;
    }
  }
}
