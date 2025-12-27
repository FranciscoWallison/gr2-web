/**
 * GR2 Decompression utilities
 * Based on the decompression functions from the original granny2.js
 */

import { GR2CompressionType } from '../types/structures';

export class GR2Decompressor {
  /**
   * Decompress a GR2 section based on compression type
   */
  static decompress(
    compressedData: Uint8Array,
    decompressedSize: number,
    compressionType: GR2CompressionType
  ): Uint8Array {
    switch (compressionType) {
      case GR2CompressionType.NONE:
        return compressedData;

      case GR2CompressionType.OODLE0:
      case GR2CompressionType.OODLE1:
        return this.decompressOodle(compressedData, decompressedSize);

      case GR2CompressionType.BITKNIT1:
      case GR2CompressionType.BITKNIT2:
        return this.decompressBitknit(compressedData, decompressedSize);

      default:
        throw new Error(`Unsupported compression type: ${compressionType}`);
    }
  }

  /**
   * Decompress Oodle-compressed data
   * This is a simplified implementation - full Oodle decompression is complex
   */
  private static decompressOodle(
    compressedData: Uint8Array,
    decompressedSize: number
  ): Uint8Array {
    // For now, we'll implement a basic decompressor
    // A full Oodle implementation would require the proprietary algorithm
    console.warn('Oodle decompression not fully implemented');

    const output = new Uint8Array(decompressedSize);
    let outPos = 0;
    let inPos = 0;

    while (outPos < decompressedSize && inPos < compressedData.length) {
      const control = compressedData[inPos++];

      if (control < 128) {
        // Literal bytes
        const count = control + 1;
        for (let i = 0; i < count && outPos < decompressedSize; i++) {
          output[outPos++] = compressedData[inPos++];
        }
      } else {
        // Back reference
        const length = (control & 0x7F) + 3;
        const offset = compressedData[inPos++] | (compressedData[inPos++] << 8);

        for (let i = 0; i < length && outPos < decompressedSize; i++) {
          output[outPos] = output[outPos - offset];
          outPos++;
        }
      }
    }

    return output;
  }

  /**
   * Decompress Bitknit-compressed data
   * Based on the sub_1000DDC0 function from the original code
   */
  private static decompressBitknit(
    compressedData: Uint8Array,
    decompressedSize: number
  ): Uint8Array {
    const output = new Uint8Array(decompressedSize);
    const view = new DataView(compressedData.buffer, compressedData.byteOffset);

    let outPos = 0;
    let bitBuffer = 0;
    let bitsAvailable = 0;
    let inPos = 0;

    const readBits = (count: number): number => {
      while (bitsAvailable < count) {
        if (inPos >= compressedData.length) break;
        bitBuffer |= (compressedData[inPos++] << bitsAvailable);
        bitsAvailable += 8;
      }

      const value = bitBuffer & ((1 << count) - 1);
      bitBuffer >>>= count;
      bitsAvailable -= count;
      return value;
    };

    while (outPos < decompressedSize) {
      const flag = readBits(1);

      if (flag === 0) {
        // Literal byte
        output[outPos++] = readBits(8);
      } else {
        // Back reference
        const offsetBits = readBits(4) + 1;
        const offset = readBits(offsetBits);
        const lengthBits = readBits(4);
        const length = readBits(lengthBits) + 3;

        // Copy from earlier in the output
        for (let i = 0; i < length && outPos < decompressedSize; i++) {
          output[outPos] = output[outPos - offset - 1];
          outPos++;
        }
      }
    }

    return output;
  }

  /**
   * Reverse byte order for marshalling
   */
  static reverseBytes(data: Uint8Array, elementSize: number): Uint8Array {
    const result = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i += elementSize) {
      for (let j = 0; j < elementSize; j++) {
        result[i + j] = data[i + elementSize - 1 - j];
      }
    }

    return result;
  }
}
