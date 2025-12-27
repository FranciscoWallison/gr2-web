/**
 * GR2 File Format Type Definitions
 * Based on Granny2 SDK structures
 */

export interface GR2FileHeader {
  magic: Uint8Array; // 16 bytes magic number
  headerSize: number;
  headerFormat: number;
  reserved: number[];
  sectionCount: number;
  sections: GR2Section[];
}

export interface GR2Section {
  compression: number;
  dataOffset: number;
  dataSize: number;
  decompressedSize: number;
  alignment: number;
  first16Bit: number;
  first8Bit: number;
  relocationsOffset: number;
  relocationsCount: number;
  mixedMarshallingOffset: number;
  mixedMarshallingCount: number;
}

export interface GR2File {
  header: GR2FileHeader;
  fileInfo: GR2FileInfo;
  rawData: ArrayBuffer;
}

export interface GR2FileInfo {
  artToolInfo?: GR2ArtToolInfo;
  exporterInfo?: GR2ExporterInfo;
  fromFileName?: string;
  textures: GR2Texture[];
  materials: GR2Material[];
  skeletons: GR2Skeleton[];
  vertexDatas: GR2VertexData[];
  triTopologies: GR2TriTopology[];
  meshes: GR2Mesh[];
  models: GR2Model[];
  trackGroups: GR2TrackGroup[];
  animations: GR2Animation[];
}

export interface GR2ArtToolInfo {
  fromArtToolName?: string;
  artToolMajorRevision?: number;
  artToolMinorRevision?: number;
  unitsPerMeter?: number;
  origin?: number[];
  rightVector?: number[];
  upVector?: number[];
  backVector?: number[];
}

export interface GR2ExporterInfo {
  exporterName?: string;
  exporterMajorRevision?: number;
  exporterMinorRevision?: number;
  exporterBuildNumber?: number;
  exporterCustomization?: number;
}

export interface GR2Transform {
  flags: number;
  position: number[]; // float[3]
  orientation: number[]; // float[4] quaternion
  scaleShear: number[][]; // float[3][3] matrix
}

export interface GR2Bone {
  name: string;
  parentIndex: number;
  localTransform: GR2Transform;
  inverseWorld4x4?: number[][]; // float[4][4]
  lodError?: number;
  extendedData?: any;
}

export interface GR2Skeleton {
  name: string;
  bones: GR2Bone[];
  lodType?: number;
}

export interface GR2VertexData {
  vertexType: string;
  vertexCount: number;
  vertices: ArrayBuffer;
}

export interface GR2TriTopology {
  groups: GR2TriMaterialGroup[];
  indices: Uint16Array | Uint32Array;
  indexCount: number;
  bytesPerIndex: number;
}

export interface GR2TriMaterialGroup {
  materialIndex: number;
  triFirst: number;
  triCount: number;
}

export interface GR2Mesh {
  name: string;
  primaryVertexData: GR2VertexData;
  primaryTopology: GR2TriTopology;
  materialBindings: GR2MaterialBinding[];
  boneBindings: GR2BoneBinding[];
  morphTargets?: GR2MorphTarget[];
}

export interface GR2MaterialBinding {
  material: GR2Material;
}

export interface GR2BoneBinding {
  boneName: string;
  obbMin?: number[];
  obbMax?: number[];
  triangleIndices?: number[];
}

export interface GR2MorphTarget {
  scalarName?: string;
  vertexData: GR2VertexData;
}

export interface GR2ModelMeshBinding {
  mesh: GR2Mesh;
}

export interface GR2Model {
  name: string;
  skeleton?: GR2Skeleton;
  initialPlacement: GR2Transform;
  meshBindings: GR2ModelMeshBinding[];
}

export interface GR2Material {
  name: string;
  maps: GR2MaterialMap[];
  texture?: GR2Texture;
  extendedData?: any;
}

export interface GR2MaterialMap {
  usage: string;
  material: string;
}

export interface GR2Texture {
  fromFileName: string;
  textureType: number;
  width: number;
  height: number;
  encoding: number;
  subFormat: number;
  layout: GR2PixelLayout;
  images: GR2TextureImage[];
}

export interface GR2PixelLayout {
  bytesPerPixel: number;
  shiftForComponent: number[]; // [4]
  bitsForComponent: number[]; // [4]
}

export interface GR2TextureImage {
  mipLevel: number;
  data: Uint8Array;
}

export interface GR2TrackGroup {
  name: string;
  vectorTracks: GR2VectorTrack[];
  transformTracks: GR2TransformTrack[];
  transformLODErrors?: number[];
  textTracks?: GR2TextTrack[];
  initialPlacement?: GR2Transform;
  accumulationFlags?: number;
  loopTranslation?: number[];
  periodicLoop?: any;
}

export interface GR2VectorTrack {
  name: string;
  dimension: number;
  valueCurve: any; // Curve data
}

export interface GR2TransformTrack {
  name: string;
  orientationCurve: any;
  positionCurve: any;
  scaleShearCurve: any;
}

export interface GR2TextTrack {
  name: string;
  timeStampedText: GR2TextEntry[];
}

export interface GR2TextEntry {
  timeStamp: number;
  text: string;
}

export interface GR2Animation {
  name: string;
  duration: number;
  timeStep: number;
  oversampling: number;
  trackGroups: GR2TrackGroup[];
}

// Vertex format constants
export enum GR2VertexFormat {
  UNKNOWN = 0,
  P3 = 1, // Position only
  PN33 = 2, // Position + Normal
  PNT332 = 3, // Position + Normal + TexCoord
  PWNT3432 = 4, // Position + Weights + Normal + TexCoord (skinned)
}

// Texture encoding types
export enum GR2TextureEncoding {
  UNKNOWN = 0,
  RAW = 1,
  S3TC = 2, // DXT compression
  BINK = 3,
}

// Compression types
export enum GR2CompressionType {
  NONE = 0,
  OODLE0 = 1,
  OODLE1 = 2,
  BITKNIT1 = 3,
  BITKNIT2 = 4,
}
