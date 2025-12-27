/**
 * GR2 File Renderer Library
 * Modern TypeScript library for parsing and rendering Granny2 (.gr2) 3D model files
 */

// Core exports
export { GR2Parser } from './parser/GR2Parser';
export { GR2Decompressor } from './parser/GR2Decompressor';
export { GR2Renderer, GR2RendererOptions } from './renderer/GR2Renderer';
export { BinaryReader } from './utils/BinaryReader';

// Type exports
export * from './types/structures';

// Convenience function to load and parse a GR2 file
export async function loadGR2File(url: string): Promise<import('./types/structures').GR2File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load GR2 file: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return GR2Parser.parse(buffer);
}

// Convenience function to load from file input
export function loadGR2FromFile(file: File): Promise<import('./types/structures').GR2File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const gr2File = GR2Parser.parse(buffer);
        resolve(gr2File);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
