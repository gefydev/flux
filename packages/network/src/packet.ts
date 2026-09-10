/**
 * High-performance, zero-overhead binary packet serialization for multiplayer sync.
 */

export class PacketWriter {
  private buffer: Uint8Array;
  private view: DataView;
  private offset = 0;
  private textEncoder = new TextEncoder();

  constructor(initialCapacity = 1024) {
    this.buffer = new Uint8Array(initialCapacity);
    this.view = new DataView(this.buffer.buffer);
  }

  public get length(): number {
    return this.offset;
  }

  public reset(): this {
    this.offset = 0;
    return this;
  }

  public writeUint8(value: number): this {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
    return this;
  }

  public writeUint16(value: number, littleEndian = true): this {
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, value, littleEndian);
    this.offset += 2;
    return this;
  }

  public writeUint32(value: number, littleEndian = true): this {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value, littleEndian);
    this.offset += 4;
    return this;
  }

  public writeInt32(value: number, littleEndian = true): this {
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, value, littleEndian);
    this.offset += 4;
    return this;
  }

  public writeFloat32(value: number, littleEndian = true): this {
    this.ensureCapacity(4);
    this.view.setFloat32(this.offset, value, littleEndian);
    this.offset += 4;
    return this;
  }

  public writeFloat64(value: number, littleEndian = true): this {
    this.ensureCapacity(8);
    this.view.setFloat64(this.offset, value, littleEndian);
    this.offset += 8;
    return this;
  }

  public writeString(str: string): this {
    const encoded = this.textEncoder.encode(str);
    this.writeUint16(encoded.byteLength);
    this.ensureCapacity(encoded.byteLength);
    this.buffer.set(encoded, this.offset);
    this.offset += encoded.byteLength;
    return this;
  }

  public toUint8Array(): Uint8Array {
    return this.buffer.subarray(0, this.offset);
  }

  private ensureCapacity(extraBytes: number): void {
    if (this.offset + extraBytes > this.buffer.byteLength) {
      const newCap = Math.max(this.buffer.byteLength * 2, this.offset + extraBytes);
      const newBuf = new Uint8Array(newCap);
      newBuf.set(this.buffer);
      this.buffer = newBuf;
      this.view = new DataView(this.buffer.buffer);
    }
  }
}

export class PacketReader {
  private view: DataView;
  private buffer: Uint8Array;
  private offset = 0;
  private textDecoder = new TextDecoder();

  constructor(data: ArrayBufferView | ArrayBuffer) {
    if (ArrayBuffer.isView(data)) {
      this.buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    } else {
      this.buffer = new Uint8Array(data);
      this.view = new DataView(data);
    }
  }

  public get cursor(): number {
    return this.offset;
  }

  public get remainingBytes(): number {
    return this.view.byteLength - this.offset;
  }

  public readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  public readUint16(littleEndian = true): number {
    const val = this.view.getUint16(this.offset, littleEndian);
    this.offset += 2;
    return val;
  }

  public readUint32(littleEndian = true): number {
    const val = this.view.getUint32(this.offset, littleEndian);
    this.offset += 4;
    return val;
  }

  public readInt32(littleEndian = true): number {
    const val = this.view.getInt32(this.offset, littleEndian);
    this.offset += 4;
    return val;
  }

  public readFloat32(littleEndian = true): number {
    const val = this.view.getFloat32(this.offset, littleEndian);
    this.offset += 4;
    return val;
  }

  public readFloat64(littleEndian = true): number {
    const val = this.view.getFloat64(this.offset, littleEndian);
    this.offset += 8;
    return val;
  }

  public readString(): string {
    const len = this.readUint16();
    const slice = this.buffer.subarray(this.offset, this.offset + len);
    this.offset += len;
    return this.textDecoder.decode(slice);
  }
}
