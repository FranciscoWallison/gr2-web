/**
 * Main GR2 file parser
 */

import { BinaryReader } from '../utils/BinaryReader';
import { GR2Decompressor } from './GR2Decompressor';
import {
  GR2File,
  GR2FileHeader,
  GR2FileInfo,
  GR2Section,
  GR2Mesh,
  GR2Texture,
  GR2Model,
  GR2Skeleton,
  GR2Transform,
  GR2CompressionType,
} from '../types/structures';

export class GR2Parser {
  private static readonly MAGIC_BYTES = new Uint8Array([
    0xb8, 0x67, 0xb0, 0xca, 0xf8, 0x6d, 0xb1, 0x0f,
    0x84, 0x72, 0x8c, 0x7e, 0x5e, 0x19, 0x00, 0x1e
  ]);

  /**
   * Parse a GR2 file from ArrayBuffer
   */
  static parse(buffer: ArrayBuffer): GR2File {
    const reader = new BinaryReader(buffer);

    // Verify magic number
    const magic = reader.readBytes(16);
    if (!this.verifyMagic(magic)) {
      throw new Error('Invalid GR2 file: magic number mismatch');
    }

    // Parse header
    const header = this.parseHeader(reader, magic);

    // Parse sections
    const sections = this.parseSections(reader, header);

    // Decompress and parse file info
    const fileInfo = this.parseFileInfo(reader, sections);

    return {
      header,
      fileInfo,
      rawData: buffer,
    };
  }

  private static verifyMagic(magic: Uint8Array): boolean {
    if (magic.length !== this.MAGIC_BYTES.length) return false;

    for (let i = 0; i < magic.length; i++) {
      if (magic[i] !== this.MAGIC_BYTES[i]) return false;
    }

    return true;
  }

  private static parseHeader(reader: BinaryReader, magic: Uint8Array): GR2FileHeader {
    const headerSize = reader.readUInt32();
    const headerFormat = reader.readUInt32();
    const reserved = [
      reader.readUInt32(),
      reader.readUInt32(),
    ];

    return {
      magic,
      headerSize,
      headerFormat,
      reserved,
      sectionCount: 0, // Will be determined from file structure
      sections: [],
    };
  }

  private static parseSections(reader: BinaryReader, header: GR2FileHeader): GR2Section[] {
    const sections: GR2Section[] = [];

    // Section array starts after header
    reader.seek(header.headerSize);

    // First uint32 tells us section count
    const sectionCount = reader.readUInt32();
    header.sectionCount = sectionCount;

    for (let i = 0; i < sectionCount; i++) {
      const section: GR2Section = {
        compression: reader.readUInt32(),
        dataOffset: reader.readUInt32(),
        dataSize: reader.readUInt32(),
        decompressedSize: reader.readUInt32(),
        alignment: reader.readUInt32(),
        first16Bit: reader.readUInt32(),
        first8Bit: reader.readUInt32(),
        relocationsOffset: reader.readUInt32(),
        relocationsCount: reader.readUInt32(),
        mixedMarshallingOffset: reader.readUInt32(),
        mixedMarshallingCount: reader.readUInt32(),
      };

      sections.push(section);
    }

    return sections;
  }

  private static parseFileInfo(reader: BinaryReader, sections: GR2Section[]): GR2FileInfo {
    // The main file info is typically in section 0
    if (sections.length === 0) {
      throw new Error('No sections found in GR2 file');
    }

    const mainSection = sections[0];
    reader.seek(mainSection.dataOffset);

    const compressedData = reader.readBytes(mainSection.dataSize);
    const decompressedData = GR2Decompressor.decompress(
      compressedData,
      mainSection.decompressedSize,
      mainSection.compression as GR2CompressionType
    );

    const dataReader = new BinaryReader(decompressedData.buffer as ArrayBuffer);

    return this.parseFileInfoStructure(dataReader, sections);
  }

  private static parseFileInfoStructure(reader: BinaryReader, sections: GR2Section[]): GR2FileInfo {
    // Read pointer table (file info structure has pointers to other data)
    const textureCount = reader.readUInt32();
    const texturesPtr = reader.readUInt32();

    const materialCount = reader.readUInt32();
    const materialsPtr = reader.readUInt32();

    const skeletonCount = reader.readUInt32();
    const skeletonsPtr = reader.readUInt32();

    const vertexDataCount = reader.readUInt32();
    const vertexDataPtr = reader.readUInt32();

    const triTopologyCount = reader.readUInt32();
    const triTopologyPtr = reader.readUInt32();

    const meshCount = reader.readUInt32();
    const meshesPtr = reader.readUInt32();

    const modelCount = reader.readUInt32();
    const modelsPtr = reader.readUInt32();

    const trackGroupCount = reader.readUInt32();
    const trackGroupPtr = reader.readUInt32();

    const animationCount = reader.readUInt32();
    const animationPtr = reader.readUInt32();

    // Parse each data type
    const fileInfo: GR2FileInfo = {
      textures: this.parseTextures(reader, texturesPtr, textureCount),
      materials: [], // TODO: implement
      skeletons: this.parseSkeletons(reader, skeletonsPtr, skeletonCount),
      vertexDatas: [], // TODO: implement
      triTopologies: [], // TODO: implement
      meshes: this.parseMeshes(reader, meshesPtr, meshCount),
      models: this.parseModels(reader, modelsPtr, modelCount),
      trackGroups: [], // TODO: implement
      animations: [], // TODO: implement
    };

    return fileInfo;
  }

  private static parseTransform(reader: BinaryReader): GR2Transform {
    const flags = reader.readUInt32();
    const position = reader.readVector3();
    const orientation = reader.readVector4(); // Quaternion
    const scaleShear = reader.readMatrix3x3();

    return {
      flags,
      position,
      orientation,
      scaleShear,
    };
  }

  private static parseSkeletons(
    reader: BinaryReader,
    ptr: number,
    count: number
  ): GR2Skeleton[] {
    if (count === 0 || ptr === 0) return [];

    const skeletons: GR2Skeleton[] = [];
    reader.seek(ptr);

    for (let i = 0; i < count; i++) {
      const namePtr = reader.readUInt32();
      const boneCount = reader.readUInt32();
      const bonesPtr = reader.readUInt32();

      const savedPos = reader.position;

      // Read name
      reader.seek(namePtr);
      const name = reader.readString();

      // Read bones
      const bones = [];
      if (boneCount > 0 && bonesPtr !== 0) {
        reader.seek(bonesPtr);
        for (let j = 0; j < boneCount; j++) {
          const boneNamePtr = reader.readUInt32();
          const parentIndex = reader.readInt32();

          const bonePos = reader.position;
          reader.seek(boneNamePtr);
          const boneName = reader.readString();
          reader.seek(bonePos);

          const localTransform = this.parseTransform(reader);

          bones.push({
            name: boneName,
            parentIndex,
            localTransform,
          });
        }
      }

      skeletons.push({ name, bones });
      reader.seek(savedPos);
    }

    return skeletons;
  }

  private static parseMeshes(reader: BinaryReader, ptr: number, count: number): GR2Mesh[] {
    // Simplified mesh parsing - full implementation would be more complex
    const meshes: GR2Mesh[] = [];

    if (count === 0 || ptr === 0) return meshes;

    // TODO: Implement full mesh parsing
    console.warn('Mesh parsing not fully implemented');

    return meshes;
  }

  private static parseModels(reader: BinaryReader, ptr: number, count: number): GR2Model[] {
    const models: GR2Model[] = [];

    if (count === 0 || ptr === 0) return models;

    reader.seek(ptr);

    for (let i = 0; i < count; i++) {
      const namePtr = reader.readUInt32();
      const skeletonPtr = reader.readUInt32();

      const savedPos = reader.position;

      reader.seek(namePtr);
      const name = reader.readString();
      reader.seek(savedPos);

      const initialPlacement = this.parseTransform(reader);

      const meshBindingCount = reader.readUInt32();
      const meshBindingsPtr = reader.readUInt32();

      models.push({
        name,
        initialPlacement,
        meshBindings: [], // TODO: parse mesh bindings
      });
    }

    return models;
  }

  private static parseTextures(reader: BinaryReader, ptr: number, count: number): GR2Texture[] {
    const textures: GR2Texture[] = [];

    if (count === 0 || ptr === 0) return textures;

    // TODO: Implement texture parsing
    console.warn('Texture parsing not fully implemented');

    return textures;
  }
}
