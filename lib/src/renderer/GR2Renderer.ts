/**
 * Three.js renderer for GR2 models
 */

import * as THREE from 'three';
import { GR2File, GR2Mesh, GR2Model, GR2Texture } from '../types/structures';

export interface GR2RendererOptions {
  scene?: THREE.Scene;
  autoRotate?: boolean;
  wireframe?: boolean;
  lights?: boolean;
}

export class GR2Renderer {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private options: GR2RendererOptions;

  constructor(options: GR2RendererOptions = {}) {
    this.options = {
      autoRotate: false,
      wireframe: false,
      lights: true,
      ...options,
    };

    this.scene = options.scene || new THREE.Scene();
    this.group = new THREE.Group();
    this.scene.add(this.group);

    if (this.options.lights) {
      this.setupLights();
    }
  }

  /**
   * Render a GR2File to the scene
   */
  render(gr2File: GR2File): THREE.Group {
    this.group.clear();

    const { fileInfo } = gr2File;

    // Create texture map
    const textureMap = new Map<string, THREE.Texture>();
    fileInfo.textures.forEach((tex) => {
      const texture = this.createTexture(tex);
      if (texture) {
        textureMap.set(tex.fromFileName, texture);
      }
    });

    // Render each model
    fileInfo.models.forEach((model) => {
      const modelGroup = this.renderModel(model, textureMap);
      this.group.add(modelGroup);
    });

    // Apply initial transform
    this.applyCoordinateSystem();

    return this.group;
  }

  private renderModel(model: GR2Model, textureMap: Map<string, THREE.Texture>): THREE.Group {
    const modelGroup = new THREE.Group();
    modelGroup.name = model.name;

    model.meshBindings.forEach((binding) => {
      const mesh = this.renderMesh(binding.mesh, textureMap);
      if (mesh) {
        modelGroup.add(mesh);
      }
    });

    // Apply initial placement transform
    this.applyTransform(modelGroup, model.initialPlacement);

    return modelGroup;
  }

  private renderMesh(mesh: GR2Mesh, textureMap: Map<string, THREE.Texture>): THREE.Mesh | null {
    try {
      const geometry = this.createGeometry(mesh);
      const material = this.createMaterial(mesh, textureMap);

      const threeMesh = new THREE.Mesh(geometry, material);
      threeMesh.name = mesh.name;

      return threeMesh;
    } catch (error) {
      console.error('Error rendering mesh:', mesh.name, error);
      return null;
    }
  }

  private createGeometry(mesh: GR2Mesh): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Extract vertex data
    const vertexData = mesh.primaryVertexData;
    if (!vertexData) {
      throw new Error('No vertex data found in mesh');
    }

    // Parse vertex buffer based on format
    // PNT332 format: Position(3) + Normal(3) + TexCoord(2) = 8 floats per vertex
    const floatArray = new Float32Array(vertexData.vertices);
    const vertexCount = vertexData.vertexCount;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i < vertexCount; i++) {
      const offset = i * 8;

      // Position
      positions.push(
        floatArray[offset + 0],
        floatArray[offset + 1],
        floatArray[offset + 2]
      );

      // Normal
      normals.push(
        floatArray[offset + 3],
        floatArray[offset + 4],
        floatArray[offset + 5]
      );

      // UV
      uvs.push(
        floatArray[offset + 6],
        1.0 - floatArray[offset + 7] // Flip V coordinate
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    // Set indices
    const topology = mesh.primaryTopology;
    if (topology && topology.indices) {
      geometry.setIndex(new THREE.BufferAttribute(topology.indices, 1));
    }

    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();

    return geometry;
  }

  private createMaterial(
    mesh: GR2Mesh,
    textureMap: Map<string, THREE.Texture>
  ): THREE.Material {
    let material: THREE.Material;

    // Try to find texture from material bindings
    let texture: THREE.Texture | undefined;
    if (mesh.materialBindings && mesh.materialBindings.length > 0) {
      const firstMaterial = mesh.materialBindings[0].material;
      if (firstMaterial && firstMaterial.texture) {
        texture = textureMap.get(firstMaterial.texture.fromFileName);
      }
    }

    if (texture) {
      material = new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.DoubleSide,
        wireframe: this.options.wireframe,
      });
    } else {
      material = new THREE.MeshLambertMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
        wireframe: this.options.wireframe,
      });
    }

    return material;
  }

  private createTexture(gr2Texture: GR2Texture): THREE.Texture | null {
    if (!gr2Texture.images || gr2Texture.images.length === 0) {
      return null;
    }

    const image = gr2Texture.images[0];
    const { width, height } = gr2Texture;

    // Create canvas and convert RGBA data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(image.data);
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }

  private applyTransform(object: THREE.Object3D, transform: any): void {
    if (!transform) return;

    // Apply position
    if (transform.position) {
      object.position.set(
        transform.position[0],
        transform.position[1],
        transform.position[2]
      );
    }

    // Apply rotation (quaternion)
    if (transform.orientation) {
      object.quaternion.set(
        transform.orientation[0],
        transform.orientation[1],
        transform.orientation[2],
        transform.orientation[3]
      );
    }

    // Apply scale (from scaleShear matrix)
    if (transform.scaleShear) {
      const scale = new THREE.Vector3(
        transform.scaleShear[0][0],
        transform.scaleShear[1][1],
        transform.scaleShear[2][2]
      );
      object.scale.copy(scale);
    }
  }

  private applyCoordinateSystem(): void {
    // GR2 uses a different coordinate system than Three.js
    // Apply transformation matrix to convert
    const matrix = new THREE.Matrix4().set(
      1, 0, 0, 0,
      0, 0, 1, 0,
      0, 1, 0, 0,
      0, 0, 0, 1
    );

    this.group.applyMatrix4(matrix);
  }

  private setupLights(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040);
    this.scene.add(ambient);

    // Directional light
    const directional = new THREE.DirectionalLight(0xffffff, 0.5);
    directional.position.set(0, 20, -50);
    this.scene.add(directional);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(delta: number): void {
    if (this.options.autoRotate) {
      this.group.rotation.y += delta * 0.5;
    }
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });

    this.scene.remove(this.group);
  }
}
