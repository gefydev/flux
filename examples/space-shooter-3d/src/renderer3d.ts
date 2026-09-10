import { Mat4, Vec3 } from "@flow.engine/math";
import type { MeshData } from "./geometry.js";

const VERTEX_SHADER_SOURCE = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_mvp;
uniform mat4 u_model;

out vec3 v_normal;
out vec2 v_uv;
out vec3 v_worldPos;

void main() {
    v_normal = mat3(u_model) * a_normal;
    v_uv = a_uv;
    vec4 world = u_model * vec4(a_position, 1.0);
    v_worldPos = world.xyz;
    gl_Position = u_mvp * vec4(a_position, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
in vec3 v_worldPos;

uniform vec3 u_color;
uniform vec3 u_lightDir;
uniform sampler2D u_texture;
uniform float u_useTexture;
uniform float u_emissive;

out vec4 fragColor;

void main() {
    vec3 normal = normalize(v_normal);
    vec3 lightDir = normalize(u_lightDir);
    
    // Ambient + Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    float ambient = 0.25;
    float lighting = ambient + diff * 0.75;
    
    vec3 baseColor = u_color;
    if (u_useTexture > 0.5) {
        vec4 tex = texture(u_texture, v_uv);
        baseColor *= tex.rgb;
    }
    
    vec3 finalColor = baseColor * (lighting + u_emissive);
    fragColor = vec4(finalColor, 1.0);
}
`;

export interface RenderableMesh {
  vao: WebGLVertexArrayObject;
  indexCount: number;
}

export class Renderer3D {
  public gl: WebGL2RenderingContext;
  private program: WebGLProgram;

  // Uniform locations
  private uMvpLoc: WebGLUniformLocation | null = null;
  private uModelLoc: WebGLUniformLocation | null = null;
  private uColorLoc: WebGLUniformLocation | null = null;
  private uLightDirLoc: WebGLUniformLocation | null = null;
  private uTextureLoc: WebGLUniformLocation | null = null;
  private uUseTexLoc: WebGLUniformLocation | null = null;
  private uEmissiveLoc: WebGLUniformLocation | null = null;

  // Camera matrices
  public projMatrix = new Mat4();
  public viewMatrix = new Mat4();
  private mvpMatrix = new Mat4();
  private vpMatrix = new Mat4();
  private modelMatrix = new Mat4();

  // Metrics
  public drawCalls = 0;
  public totalTriangles = 0;

  // Texture
  public defaultTexture: WebGLTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) {
      throw new Error("[Renderer3D] WebGL2 not supported on this browser.");
    }
    this.gl = gl;
    this.program = this.createProgram(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.initUniforms();
    this.initDefaultTexture();

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // Disable backface culling to ensure all wings and procedurally rotated geometry render double-sided
    gl.disable(gl.CULL_FACE);
  }

  public resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
    const aspect = width / Math.max(1, height);
    // Perspective projection 60 degrees fov
    this.projMatrix.perspective((60 * Math.PI) / 180, aspect, 0.5, 2500.0);
  }

  public beginFrame(): void {
    this.drawCalls = 0;
    this.totalTriangles = 0;

    const gl = this.gl;
    gl.clearColor(0.02, 0.025, 0.05, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);

    // Light direction (sun in space)
    gl.uniform3f(this.uLightDirLoc, 0.6, 0.8, -0.4);

    // Ensure default texture is bound to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);
    gl.uniform1i(this.uTextureLoc, 0);

    // Calculate View-Projection matrix: vpMatrix = projMatrix * viewMatrix
    this.projMatrix.multiply(this.viewMatrix, this.vpMatrix);
  }

  public uploadMesh(mesh: MeshData): RenderableMesh {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    // Position buffer (location 0)
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    // Normal buffer (location 1)
    const normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    // UV buffer (location 2)
    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

    // Index buffer
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    return { vao, indexCount: mesh.indices.length };
  }

  public drawMesh(
    mesh: RenderableMesh,
    position: Vec3,
    rotationYaw: number,
    rotationPitch: number,
    scale: number,
    color: [number, number, number],
    emissive = 0.0
  ): void {
    const gl = this.gl;

    // Build Model Matrix
    this.modelMatrix.identity();
    this.modelMatrix.translate(position);
    // Rotate Y (yaw)
    const radY = rotationYaw;
    const cosY = Math.cos(radY), sinY = Math.sin(radY);
    const d = this.modelMatrix.data;
    const m00 = d[0]!, m02 = d[2]!, m10 = d[4]!, m12 = d[6]!, m20 = d[8]!, m22 = d[10]!;
    d[0] = m00 * cosY + m02 * sinY;
    d[2] = -m00 * sinY + m02 * cosY;
    d[4] = m10 * cosY + m12 * sinY;
    d[6] = -m10 * sinY + m12 * cosY;
    d[8] = m20 * cosY + m22 * sinY;
    d[10] = -m20 * sinY + m22 * cosY;

    // Scale
    this.modelMatrix.scale(new Vec3(scale, scale, scale));

    // MVP = VP * Model
    this.vpMatrix.multiply(this.modelMatrix, this.mvpMatrix);

    gl.uniformMatrix4fv(this.uMvpLoc, false, this.mvpMatrix.data);
    gl.uniformMatrix4fv(this.uModelLoc, false, this.modelMatrix.data);
    gl.uniform3f(this.uColorLoc, color[0], color[1], color[2]);
    gl.uniform1f(this.uEmissiveLoc, emissive);
    gl.uniform1f(this.uUseTexLoc, 1.0);

    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

    this.drawCalls++;
    this.totalTriangles += mesh.indexCount / 3;
  }

  private initDefaultTexture(): void {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Procedural 64x64 grid/metal texture
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const grid = (x % 16 === 0 || y % 16 === 0) ? 220 : 160;
        data[i + 0] = grid;
        data[i + 1] = grid;
        data[i + 2] = grid;
        data[i + 3] = 255;
      }
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.defaultTexture = tex;
  }

  private initUniforms(): void {
    const gl = this.gl;
    this.uMvpLoc = gl.getUniformLocation(this.program, "u_mvp");
    this.uModelLoc = gl.getUniformLocation(this.program, "u_model");
    this.uColorLoc = gl.getUniformLocation(this.program, "u_color");
    this.uLightDirLoc = gl.getUniformLocation(this.program, "u_lightDir");
    this.uTextureLoc = gl.getUniformLocation(this.program, "u_texture");
    this.uUseTexLoc = gl.getUniformLocation(this.program, "u_useTexture");
    this.uEmissiveLoc = gl.getUniformLocation(this.program, "u_emissive");
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;
    const vertShader = this.compileShader(gl.VERTEX_SHADER, vertSrc);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`[Renderer3D] Program link error: ${gl.getProgramInfoLog(prog)}`);
    }

    return prog;
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`[Renderer3D] Shader compile error: ${info}`);
    }

    return shader;
  }
}
