export interface MeshData {
  positions: Float32Array; // x, y, z
  normals: Float32Array;   // nx, ny, nz
  uvs: Float32Array;       // u, v
  indices: Uint16Array;
}

/**
 * Generate 3D Starfighter mesh.
 */
export function createStarfighterMesh(): MeshData {
  // Vertices: [x, y, z, nx, ny, nz, u, v]
  const vertices = [
    // Nose tip
    0, 0, 3.5,     0, 0, 1,    0.5, 1.0,
    // Cockpit top
    0, 0.7, 0.5,   0, 1, 0.2,  0.5, 0.6,
    // Left wingtip
    -3.2, -0.2, -1.5, -0.3, 0.8, -0.5, 0.0, 0.0,
    // Right wingtip
    3.2, -0.2, -1.5,  0.3, 0.8, -0.5, 1.0, 0.0,
    // Engine center
    0, -0.3, -2.0,  0, 0, -1,   0.5, 0.0,
    // Cockpit base
    0, -0.6, 0.5,  0, -1, 0,    0.5, 0.4,
    // Left engine
    -0.8, 0, -2.0, -0.5, 0, -1, 0.2, 0.0,
    // Right engine
    0.8, 0, -2.0,  0.5, 0, -1,  0.8, 0.0,
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
  ];

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

/**
 * Generate procedural 3D rocky asteroid mesh.
 */
export function createAsteroidMesh(subdivisions = 2, radius = 2.0): MeshData {
  // Base 3D Octahedron / Box perturbed
  const basePositions: number[] = [
    // Front
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
    // Back
    -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
    // Top
    -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
    // Bottom
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
    // Right
     1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
    // Left
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

  // Perturb vertices spherically with noise to make a craggy asteroid
  for (let i = 0; i < count; i++) {
    let x = basePositions[i * 3 + 0]!;
    let y = basePositions[i * 3 + 1]!;
    let z = basePositions[i * 3 + 2]!;

    const len = Math.hypot(x, y, z);
    const noise = 0.8 + 0.4 * Math.sin(x * 3.5 + y * 2.1 + z * 1.7);
    const r = (radius * noise) / len;

    x *= r;
    y *= r;
    z *= r;

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Normals
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
    -0.1, -0.1, -2.5,
     0.1, -0.1, -2.5,
     0.1,  0.1, -2.5,
    -0.1,  0.1, -2.5,
    -0.1, -0.1,  2.5,
     0.1, -0.1,  2.5,
     0.1,  0.1,  2.5,
    -0.1,  0.1,  2.5,
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
