/**
 * Binary data reader utility for parsing GR2 files
 */
export class BinaryReader {
  private view: DataView;
  private offset: number = 0;
  private littleEndian: boolean = true;

  constructor(buffer: ArrayBuffer, offset: number = 0, littleEndian: boolean = true) {
    this.view = new DataView(buffer);
    this.offset = offset;
    this.littleEndian = littleEndian;
  }

  get position(): number {
    return this.offset;
  }

  set position(value: number) {
    this.offset = value;
  }

  get remaining(): number {
    return this.view.byteLength - this.offset;
  }

  seek(offset: number): void {
    this.offset = offset;
  }

  skip(bytes: number): void {
    this.offset += bytes;
  }

  readUInt8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readInt8(): number {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readUInt16(): number {
    const value = this.view.getUint16(this.offset, this.littleEndian);
    this.offset += 2;
    return value;
  }

  readInt16(): number {
    const value = this.view.getInt16(this.offset, this.littleEndian);
    this.offset += 2;
    return value;
  }

  readUInt32(): number {
    const value = this.view.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }

  readInt32(): number {
    const value = this.view.getInt32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }

  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }

  readFloat64(): number {
    const value = this.view.getFloat64(this.offset, this.littleEndian);
    this.offset += 8;
    return value;
  }

  readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    return bytes;
  }

  readString(length?: number): string {
    if (length === undefined) {
      // Read null-terminated string
      let end = this.offset;
      while (end < this.view.byteLength && this.view.getUint8(end) !== 0) {
        end++;
      }
      length = end - this.offset;
    }

    const bytes = this.readBytes(length);
    const decoder = new TextDecoder('utf-8');
    const str = decoder.decode(bytes);

    // Skip null terminator if present
    if (this.offset < this.view.byteLength && this.view.getUint8(this.offset) === 0) {
      this.offset++;
    }

    return str;
  }

  readVector3(): number[] {
    return [this.readFloat32(), this.readFloat32(), this.readFloat32()];
  }

  readVector4(): number[] {
    return [
      this.readFloat32(),
      this.readFloat32(),
      this.readFloat32(),
      this.readFloat32(),
    ];
  }

  readMatrix3x3(): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < 3; i++) {
      matrix.push([this.readFloat32(), this.readFloat32(), this.readFloat32()]);
    }
    return matrix;
  }

  readMatrix4x4(): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < 4; i++) {
      matrix.push([
        this.readFloat32(),
        this.readFloat32(),
        this.readFloat32(),
        this.readFloat32(),
      ]);
    }
    return matrix;
  }

  align(alignment: number): void {
    const remainder = this.offset % alignment;
    if (remainder !== 0) {
      this.offset += alignment - remainder;
    }
  }

  createSubReader(offset: number, length: number): BinaryReader {
    const subBuffer = this.view.buffer.slice(offset, offset + length) as ArrayBuffer;
    return new BinaryReader(subBuffer, 0, this.littleEndian);
  }
}
