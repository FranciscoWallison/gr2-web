# GR2 File Renderer

Modern TypeScript library for parsing and rendering Granny2 (.gr2) 3D model files in the browser using Three.js.

## 🎯 Features

- ✅ **Pure JavaScript/TypeScript** - No x86 emulation or DLL dependencies
- 🚀 **Fast & Lightweight** - Direct binary parsing without overhead
- 🎨 **Three.js Integration** - Seamless 3D rendering
- 📦 **Modern ES Modules** - Tree-shakeable and easy to bundle
- 💪 **Type-Safe** - Full TypeScript definitions
- 🔧 **Flexible API** - Use as parser only or complete renderer

## 📥 Installation

```bash
npm install gr2-file-renderer
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { loadGR2File, GR2Renderer } from 'gr2-file-renderer';
import * as THREE from 'three';

// Create Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load and render GR2 file
const gr2File = await loadGR2File('model.gr2');
const gr2Renderer = new GR2Renderer({ scene });
gr2Renderer.render(gr2File);

// Render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

### Load from File Input

```typescript
import { loadGR2FromFile, GR2Renderer } from 'gr2-file-renderer';

document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const gr2File = await loadGR2FromFile(file);

  const gr2Renderer = new GR2Renderer({ scene });
  gr2Renderer.render(gr2File);
});
```

### Parser Only (No Rendering)

```typescript
import { GR2Parser } from 'gr2-file-renderer';

const response = await fetch('model.gr2');
const buffer = await response.arrayBuffer();
const gr2File = GR2Parser.parse(buffer);

console.log('Models:', gr2File.fileInfo.models);
console.log('Meshes:', gr2File.fileInfo.meshes);
console.log('Textures:', gr2File.fileInfo.textures);
```

## 🎨 Advanced Options

### Renderer Options

```typescript
const gr2Renderer = new GR2Renderer({
  scene: myScene,          // Optional: provide your own scene
  autoRotate: true,        // Auto-rotate model
  wireframe: false,        // Render as wireframe
  lights: true,            // Add default lights
});
```

### Manual Update Loop

```typescript
function animate(delta) {
  gr2Renderer.update(delta); // Update animations/rotation
  renderer.render(scene, camera);
}
```

## 📚 API Reference

### `GR2Parser`

Static class for parsing GR2 files.

#### Methods

- `parse(buffer: ArrayBuffer): GR2File` - Parse a GR2 file from ArrayBuffer

### `GR2Renderer`

Class for rendering GR2 models with Three.js.

#### Constructor

```typescript
new GR2Renderer(options?: GR2RendererOptions)
```

#### Methods

- `render(gr2File: GR2File): THREE.Group` - Render a GR2 file to the scene
- `update(delta: number): void` - Update animations and auto-rotation
- `getScene(): THREE.Scene` - Get the Three.js scene
- `getGroup(): THREE.Group` - Get the model group
- `dispose(): void` - Clean up resources

### Helper Functions

- `loadGR2File(url: string): Promise<GR2File>` - Load from URL
- `loadGR2FromFile(file: File): Promise<GR2File>` - Load from File object

## 🏗️ Architecture

The library is organized into several modules:

```
gr2-file-renderer/
├── parser/
│   ├── GR2Parser.ts       # Main file parser
│   └── GR2Decompressor.ts # Decompression utilities
├── renderer/
│   └── GR2Renderer.ts     # Three.js renderer
├── types/
│   └── structures.ts      # TypeScript type definitions
└── utils/
    └── BinaryReader.ts    # Binary data reader
```

## 🎮 Supported Features

### ✅ Currently Supported

- File header parsing
- Section decompression (Oodle, Bitknit)
- Model hierarchy
- Mesh geometry (vertices, normals, UVs, indices)
- Textures (basic formats)
- Skeletons (bone hierarchy)
- Transform matrices

### 🚧 Coming Soon

- Full animation support
- Advanced texture formats (S3TC/DXT)
- Morph targets
- Advanced material properties
- Skinned mesh deformation

## 🔧 Development

```bash
# Install dependencies
npm install

# Build library
npm run build

# Watch mode
npm run dev

# Run example
npm run example
```

## 📖 Examples

See the `examples/` directory for complete working examples:

- `basic.html` - Basic usage with file loading
- Advanced rendering techniques
- Animation playback

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Based on the Granny2 file format by RAD Game Tools
- Inspired by the original gr2-web project
- Built with Three.js

## ⚠️ Important Notes

This library is a clean-room implementation based on publicly available format documentation. It does not use or include any proprietary Granny2 SDK code or binaries.

The original implementation used x86 emulation to run the official Granny2 DLL. This modern implementation provides a pure JavaScript alternative that is faster, lighter, and easier to use.
