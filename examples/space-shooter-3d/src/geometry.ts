/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * Procedural 3D Mesh Geometry Generators for Flux Odyssey.
 */

export interface MeshData {
  positions: Float32Array; // x, y, z
  normals: Float32Array;   // nx, ny, nz
  uvs: Float32Array;       // u, v
  indices: Uint16Array;
}

/**
 * Generate 3D Starfighter mesh with cockpit, delta wings, plasma cannons, and engine nozzles.
 * Oriented towards -Z (forward).
 */
export function createStarfighterMesh(): MeshData {
  const vertices = [
    // [x, y, z, nx, ny, nz, u, v]
    // 0: Nose tip
    0, 0, -4.5,            0, 0, -1,         0.5, 1.0,
    // 1: Cockpit top
    0, 0.8, -0.8,          0, 1, -0.2,       0.5, 0.6,
    // 2: Left wingtip
    -3.8, -0.2, 1.8,       -0.3, 0.8, 0.5,   0.0, 0.0,
    // 3: Right wingtip
    3.8, -0.2, 1.8,        0.3, 0.8, 0.5,    1.0, 0.0,
    // 4: Engine center
    0, -0.3, 2.5,          0, 0, 1,          0.5, 0.0,
    // 5: Cockpit base / hull belly
    0, -0.7, -0.6,         0, -1, 0,         0.5, 0.4,
    // 6: Left engine pod
    -1.2, 0.1, 2.5,        -0.5, 0, 1,       0.2, 0.0,
    // 7: Right engine pod
    1.2, 0.1, 2.5,         0.5, 0, 1,        0.8, 0.0,
    // 8: Left wing cannon tip
    -2.8, -0.1, -2.0,      -1, 0, 0,         0.1, 0.8,
    // 9: Right wing cannon tip
    2.8, -0.1, -2.0,       1, 0, 0,          0.9, 0.8,
    // 10: Tail fin top
    0, 1.6, 1.8,           0, 1, 0,          0.5, 0.9,
  ];

  const indices = [
    // Top hull
    0, 1, 2,
    0, 3, 1,
    // Wing backs
    1, 7, 3,
    1, 2, 6,
    // Engines
    6, 1, 4,
    7, 4, 1,
    // Bottom hull
    0, 2, 5,
    0, 5, 3,
    5, 2, 6,
    5, 7, 3,
    5, 6, 4,
    5, 4, 7,
    // Plasma Cannons
    2, 8, 1,
    3, 1, 9,
    // Vertical Stabilizer / Tail Fin
    1, 10, 4,
    1, 4, 10,
  ];

  return buildMeshData(vertices, indices);
}

/**
 * Generate Alien Scout Interceptor Drone mesh.
 */
export function createEnemyDroneMesh(): MeshData {
  const vertices = [
    // Forward mandibles
    -0.8, 0, -2.5,   0, 0, -1,   0.2, 1.0,
    0.8, 0, -2.5,    0, 0, -1,   0.8, 1.0,
    // Core center
    0, 0.5, 0,       0, 1, 0,    0.5, 0.5,
    0, -0.5, 0,      0, -1, 0,   0.5, 0.5,
    // Back fins
    -2.2, 0.3, 1.5,  -1, 0.5, 0, 0.0, 0.0,
    2.2, 0.3, 1.5,   1, 0.5, 0,  1.0, 0.0,
    0, -0.2, 2.0,    0, 0, 1,    0.5, 0.0,
  ];

  const indices = [
    0, 2, 1,
    0, 1, 3,
    0, 4, 2,
    1, 2, 5,
    2, 4, 6,
    2, 6, 5,
    3, 6, 4,
    3, 5, 6,
  ];

  return buildMeshData(vertices, indices);
}

/**
 * Generate 3D Homing Missile mesh.
 */
export function createMissileMesh(): MeshData {
  const vertices = [
    // Nose cone
    0, 0, -1.8,     0, 0, -1,    0.5, 1.0,
    // Body cylinder ring forward
    -0.2, -0.2, -0.6,  -1, -1, 0,  0.0, 0.6,
     0.2, -0.2, -0.6,   1, -1, 0,  1.0, 0.6,
     0.2,  0.2, -0.6,   1,  1, 0,  1.0, 0.6,
    -0.2,  0.2, -0.6,  -1,  1, 0,  0.0, 0.6,
    // Body cylinder ring back
    -0.2, -0.2, 1.2,   -1, -1, 0,  0.0, 0.1,
     0.2, -0.2, 1.2,    1, -1, 0,  1.0, 0.1,
     0.2,  0.2, 1.2,    1,  1, 0,  1.0, 0.1,
    -0.2,  0.2, 1.2,   -1,  1, 0,  0.0, 0.1,
    // Exhaust nozzle
    0, 0, 1.4,      0, 0, 1,     0.5, 0.0,
  ];

  const indices = [
    // Cone
    0, 1, 2,  0, 2, 3,  0, 3, 4,  0, 4, 1,
    // Cylinder sides
    1, 5, 6,  1, 6, 2,
    2, 6, 7,  2, 7, 3,
    3, 7, 8,  3, 8, 4,
    4, 8, 5,  4, 5, 1,
    // Tail
    9, 6, 5,  9, 7, 6,  9, 8, 7,  9, 5, 8,
  ];

  return buildMeshData(vertices, indices);
}

/**
 * Generate 3D Antimatter Energy Crystal mesh.
 */
export function createCrystalMesh(): MeshData {
  const vertices = [
    // Top apex
    0, 1.8, 0,      0, 1, 0,    0.5, 1.0,
    // Middle equator
    -0.8, 0, -0.8,  -1, 0, -1,  0.0, 0.5,
     0.8, 0, -0.8,   1, 0, -1,  1.0, 0.5,
     0.8, 0,  0.8,   1, 0,  1,  1.0, 0.5,
    -0.8, 0,  0.8,  -1, 0,  1,  0.0, 0.5,
    // Bottom apex
    0, -1.8, 0,     0, -1, 0,   0.5, 0.0,
  ];

  const indices = [
    0, 1, 2,  0, 2, 3,  0, 3, 4,  0, 4, 1,
    5, 2, 1,  5, 3, 2,  5, 4, 3,  5, 1, 4,
  ];

  return buildMeshData(vertices, indices);
}

/**
 * Generate Geodesic Shield Bubble mesh.
 */
export function createShieldBubbleMesh(radius = 5.2): MeshData {
  const segments = 12;
  const rings = 8;
  const pos: number[] = [];
  const norm: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    const phi = v * Math.PI;
    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const theta = u * Math.PI * 2;

      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);

      pos.push(x * radius, y * radius, z * radius);
      norm.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const first = r * (segments + 1) + s;
      const second = first + segments + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(norm),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

/**
 * Generate procedural 3D rocky asteroid mesh.
 */
export function createAsteroidMesh(subdivisions = 2, radius = 2.4): MeshData {
  const basePositions: number[] = [
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
    -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
    -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
     1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1,
  ];

  const baseIndices: number[] = [
    0, 1, 2,  0, 2, 3,
    4, 5, 6,  4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
  ];

  const count = basePositions.length / 3;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    let x = basePositions[i * 3 + 0]!;
    let y = basePositions[i * 3 + 1]!;
    let z = basePositions[i * 3 + 2]!;

    const len = Math.hypot(x, y, z);
    const noise = 0.8 + 0.35 * Math.sin(x * 3.5 + y * 2.1 + z * 1.7);
    const r = (radius * noise) / len;

    x *= r;
    y *= r;
    z *= r;

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const nLen = Math.hypot(x, y, z);
    normals[i * 3 + 0] = x / nLen;
    normals[i * 3 + 1] = y / nLen;
    normals[i * 3 + 2] = z / nLen;

    uvs[i * 2 + 0] = (x / radius + 1) * 0.5;
    uvs[i * 2 + 1] = (y / radius + 1) * 0.5;
  }

  return {
    positions,
    normals,
    uvs,
    indices: new Uint16Array(baseIndices),
  };
}

/**
 * Generate 3D Laser bolt mesh.
 */
export function createLaserMesh(): MeshData {
  const positions = new Float32Array([
    -0.12, -0.12, -3.0,
     0.12, -0.12, -3.0,
     0.12,  0.12, -3.0,
    -0.12,  0.12, -3.0,
    -0.12, -0.12,  3.0,
     0.12, -0.12,  3.0,
     0.12,  0.12,  3.0,
    -0.12,  0.12,  3.0,
  ]);

  const normals = new Float32Array(8 * 3).fill(0);
  const uvs = new Float32Array(8 * 2).fill(0.5);

  const indices = new Uint16Array([
    0, 1, 2,  0, 2, 3,
    4, 5, 6,  4, 6, 7,
    0, 4, 7,  0, 7, 3,
    1, 5, 6,  1, 6, 2,
    3, 2, 6,  3, 6, 7,
    0, 1, 5,  0, 5, 4,
  ]);

  return { positions, normals, uvs, indices };
}

function buildMeshData(vertices: number[], indices: number[]): MeshData {
  const posCount = vertices.length / 8;
  const positions = new Float32Array(posCount * 3);
  const normals = new Float32Array(posCount * 3);
  const uvs = new Float32Array(posCount * 2);

  for (let i = 0; i < posCount; i++) {
    positions[i * 3 + 0] = vertices[i * 8 + 0]!;
    positions[i * 3 + 1] = vertices[i * 8 + 1]!;
    positions[i * 3 + 2] = vertices[i * 8 + 2]!;

    normals[i * 3 + 0] = vertices[i * 8 + 3]!;
    normals[i * 3 + 1] = vertices[i * 8 + 4]!;
    normals[i * 3 + 2] = vertices[i * 8 + 5]!;

    uvs[i * 2 + 0] = vertices[i * 8 + 6]!;
    uvs[i * 2 + 1] = vertices[i * 8 + 7]!;
  }

  return {
    positions,
    normals,
    uvs,
    indices: new Uint16Array(indices),
  };
}
