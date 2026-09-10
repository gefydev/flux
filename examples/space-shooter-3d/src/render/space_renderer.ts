/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * Ultra-realistic dual-pipeline space renderer for Flux Odyssey.
 * Supports WebGPU and WebGL2 PBR rendering pipelines.
 */

import { Mat4, Vec3 } from "@flux/math";
import type { MeshData } from "../geometry.js";
import {
  MESH_FRAGMENT_SHADER,
  MESH_VERTEX_SHADER,
  SHIELD_FRAGMENT_SHADER,
  SKYBOX_FRAGMENT_SHADER,
  SKYBOX_VERTEX_SHADER,
} from "./shaders_glsl.js";

export interface RenderableMesh {
  vao: WebGLVertexArrayObject;
  indexCount: number;
}

export interface DrawOptions {
  color?: [number, number, number];
  emissive?: number;
  metallic?: number;
  roughness?: number;
  useTexture?: boolean;
}

/**
 * Ultra-realistic dual-pipeline space renderer for Flux Odyssey.
 * Implements high-res PBR shading, procedural nebulae, shield forcefields, and billboard particle plumes.
 */
export class SpaceRenderer {
  public gl: WebGL2RenderingContext;
  private meshProgram: WebGLProgram;
  private shieldProgram: WebGLProgram;
  private skyboxProgram: WebGLProgram;

  // Skybox full-screen quad VAO
  private skyboxVao: WebGLVertexArrayObject;

  // Particle buffer & VAO
  private particleVao: WebGLVertexArrayObject;
  private particlePosBuf: WebGLBuffer;
  private particleColBuf: WebGLBuffer;
  private particleProgram: WebGLProgram;

  // Uniform locations - Mesh Program
  private uMvpLoc: WebGLUniformLocation | null = null;
  private uModelLoc: WebGLUniformLocation | null = null;
  private uCamPosLoc: WebGLUniformLocation | null = null;
  private uColorLoc: WebGLUniformLocation | null = null;
  private uLightDirLoc: WebGLUniformLocation | null = null;
  private uTextureLoc: WebGLUniformLocation | null = null;
  private uUseTexLoc: WebGLUniformLocation | null = null;
  private uEmissiveLoc: WebGLUniformLocation | null = null;
  private uMetallicLoc: WebGLUniformLocation | null = null;
  private uRoughnessLoc: WebGLUniformLocation | null = null;

  // Uniform locations - Shield Program
  private uShieldMvpLoc: WebGLUniformLocation | null = null;
  private uShieldModelLoc: WebGLUniformLocation | null = null;
  private uShieldCamPosLoc: WebGLUniformLocation | null = null;
  private uShieldColorLoc: WebGLUniformLocation | null = null;
  private uShieldTimeLoc: WebGLUniformLocation | null = null;
  private uShieldHitLoc: WebGLUniformLocation | null = null;

  // Uniform locations - Skybox
  private uSkyboxDirLoc: WebGLUniformLocation | null = null;
  private uSkyboxTimeLoc: WebGLUniformLocation | null = null;

  // Matrices
  public projMatrix = new Mat4();
  public viewMatrix = new Mat4();
  private mvpMatrix = new Mat4();
  private vpMatrix = new Mat4();
  private modelMatrix = new Mat4();
  public cameraPos = new Vec3(0, 0, 0);

  // Performance telemetry
  public drawCalls = 0;
  public totalTriangles = 0;
  public defaultTexture: WebGLTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) {
      throw new Error("[SpaceRenderer] WebGL2 not supported on this device.");
    }
    this.gl = gl;

    this.meshProgram = this.createProgram(MESH_VERTEX_SHADER, MESH_FRAGMENT_SHADER);
    this.shieldProgram = this.createProgram(MESH_VERTEX_SHADER, SHIELD_FRAGMENT_SHADER);
    this.skyboxProgram = this.createProgram(SKYBOX_VERTEX_SHADER, SKYBOX_FRAGMENT_SHADER);
    this.particleProgram = this.createParticleProgram();

    this.initUniforms();
    this.initDefaultTexture();

    // Skybox quad
    this.skyboxVao = this.createSkyboxVao();

    // Particle buffers
    this.particleVao = gl.createVertexArray()!;
    this.particlePosBuf = gl.createBuffer()!;
    this.particleColBuf = gl.createBuffer()!;
    this.initParticleVao();

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE); // Double-sided rendering for dynamic geometry
  }

  public resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
    const aspect = width / Math.max(1, height);
    this.projMatrix.perspective((60 * Math.PI) / 180, aspect, 0.5, 3000.0);
  }

  public beginFrame(time: number, cameraDir: Vec3): void {
    this.drawCalls = 0;
    this.totalTriangles = 0;

    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Calculate View-Projection matrix
    this.projMatrix.multiply(this.viewMatrix, this.vpMatrix);

    // 1. Render Procedural Deep Space Nebula Skybox
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.skyboxProgram);
    gl.uniform3f(this.uSkyboxDirLoc, cameraDir.x, cameraDir.y, cameraDir.z);
    gl.uniform1f(this.uSkyboxTimeLoc, time);

    gl.bindVertexArray(this.skyboxVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.drawCalls++;

    // Re-enable depth testing for world geometry
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.meshProgram);
    gl.uniform3f(this.uLightDirLoc, 0.6, 0.8, -0.4);
    gl.uniform3f(this.uCamPosLoc, this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);
    gl.uniform1i(this.uTextureLoc, 0);
  }

  public uploadMesh(mesh: MeshData): RenderableMesh {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return { vao, indexCount: mesh.indices.length };
  }

  public drawMesh(
    mesh: RenderableMesh,
    position: Vec3,
    rotationYaw = 0,
    rotationPitch = 0,
    rotationRoll = 0,
    scale = 1.0,
    options: DrawOptions = {}
  ): void {
    const gl = this.gl;

    this.modelMatrix.identity();
    this.modelMatrix.translate(position);

    // Apply 3D Euler rotations: Yaw (around Y), Pitch (around X), Roll (around Z)
    if (rotationYaw !== 0) this.modelMatrix.rotateY(rotationYaw);
    if (rotationPitch !== 0) this.modelMatrix.rotateX(rotationPitch);
    if (rotationRoll !== 0) this.modelMatrix.rotateZ(rotationRoll);

    // Scale
    if (scale !== 1.0) this.modelMatrix.scale(new Vec3(scale, scale, scale));

    // MVP = VP * Model
    this.vpMatrix.multiply(this.modelMatrix, this.mvpMatrix);

    const color = options.color ?? [1, 1, 1];
    gl.uniformMatrix4fv(this.uMvpLoc, false, this.mvpMatrix.data);
    gl.uniformMatrix4fv(this.uModelLoc, false, this.modelMatrix.data);
    gl.uniform3f(this.uColorLoc, color[0], color[1], color[2]);
    gl.uniform1f(this.uEmissiveLoc, options.emissive ?? 0.0);
    gl.uniform1f(this.uMetallicLoc, options.metallic ?? 0.5);
    gl.uniform1f(this.uRoughnessLoc, options.roughness ?? 0.4);
    gl.uniform1f(this.uUseTexLoc, options.useTexture !== false ? 1.0 : 0.0);

    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

    this.drawCalls++;
    this.totalTriangles += mesh.indexCount / 3;
  }

  public drawShield(
    mesh: RenderableMesh,
    position: Vec3,
    time: number,
    hitIntensity: number,
    color: [number, number, number] = [0.2, 0.7, 1.0]
  ): void {
    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive shield glow
    gl.depthMask(false); // Don't occlude interior ship

    gl.useProgram(this.shieldProgram);

    this.modelMatrix.identity();
    this.modelMatrix.translate(position);
    this.vpMatrix.multiply(this.modelMatrix, this.mvpMatrix);

    gl.uniformMatrix4fv(this.uShieldMvpLoc, false, this.mvpMatrix.data);
    gl.uniformMatrix4fv(this.uShieldModelLoc, false, this.modelMatrix.data);
    gl.uniform3f(this.uShieldCamPosLoc, this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);
    gl.uniform3f(this.uShieldColorLoc, color[0], color[1], color[2]);
    gl.uniform1f(this.uShieldTimeLoc, time);
    gl.uniform1f(this.uShieldHitLoc, hitIntensity);

    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.useProgram(this.meshProgram);

    this.drawCalls++;
    this.totalTriangles += mesh.indexCount / 3;
  }

  public drawParticles(positions: Float32Array, colors: Float32Array, count: number): void {
    if (count <= 0) return;
    const gl = this.gl;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);

    gl.useProgram(this.particleProgram);
    const uMvp = gl.getUniformLocation(this.particleProgram, "u_mvp");
    gl.uniformMatrix4fv(uMvp, false, this.vpMatrix.data);

    gl.bindVertexArray(this.particleVao);

    // Update positions & sizes (x, y, z, size)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particlePosBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions.subarray(0, count * 4));

    // Update colors (r, g, b, a)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleColBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors.subarray(0, count * 4));

    gl.drawArrays(gl.POINTS, 0, count);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.useProgram(this.meshProgram);

    this.drawCalls++;
  }

  private initParticleVao(): void {
    const gl = this.gl;
    const maxParticles = 1024;
    gl.bindVertexArray(this.particleVao);

    // Location 0: Position + size (vec4)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particlePosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, maxParticles * 4 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);

    // Location 1: Color (vec4)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleColBuf);
    gl.bufferData(gl.ARRAY_BUFFER, maxParticles * 4 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  private createParticleProgram(): WebGLProgram {
    const vs = `#version 300 es
    layout(location = 0) in vec4 a_posSize;
    layout(location = 1) in vec4 a_color;
    uniform mat4 u_mvp;
    out vec4 v_color;
    void main() {
        v_color = a_color;
        vec4 clip = u_mvp * vec4(a_posSize.xyz, 1.0);
        gl_Position = clip;
        gl_PointSize = clamp(a_posSize.w * (800.0 / clip.w), 2.0, 64.0);
    }
    `;

    const fs = `#version 300 es
    precision highp float;
    in vec4 v_color;
    out vec4 fragColor;
    void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distSq = dot(coord, coord);
        if (distSq > 0.25) discard;
        float soft = 1.0 - smoothstep(0.0, 0.25, distSq);
        fragColor = vec4(v_color.rgb, v_color.a * soft);
    }
    `;

    return this.createProgram(vs, fs);
  }

  private createSkyboxVao(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // Two full screen triangles
    const quad = new Float32Array([
      -1, -1,   1, -1,  -1,  1,
      -1,  1,   1, -1,   1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    return vao;
  }

  private initDefaultTexture(): void {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Procedural metallic carbon fiber grid
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const panel = (x % 32 === 0 || y % 32 === 0) ? 90 : 180;
        const spec = ((x + y) % 16 < 8) ? 30 : 0;
        const col = Math.min(255, panel + spec);
        data[i + 0] = col;
        data[i + 1] = col;
        data[i + 2] = col + 15; // Subtle blue metallic tint
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
    // Mesh uniforms
    this.uMvpLoc = gl.getUniformLocation(this.meshProgram, "u_mvp");
    this.uModelLoc = gl.getUniformLocation(this.meshProgram, "u_model");
    this.uCamPosLoc = gl.getUniformLocation(this.meshProgram, "u_cameraPos");
    this.uColorLoc = gl.getUniformLocation(this.meshProgram, "u_color");
    this.uLightDirLoc = gl.getUniformLocation(this.meshProgram, "u_lightDir");
    this.uTextureLoc = gl.getUniformLocation(this.meshProgram, "u_texture");
    this.uUseTexLoc = gl.getUniformLocation(this.meshProgram, "u_useTexture");
    this.uEmissiveLoc = gl.getUniformLocation(this.meshProgram, "u_emissive");
    this.uMetallicLoc = gl.getUniformLocation(this.meshProgram, "u_metallic");
    this.uRoughnessLoc = gl.getUniformLocation(this.meshProgram, "u_roughness");

    // Shield uniforms
    this.uShieldMvpLoc = gl.getUniformLocation(this.shieldProgram, "u_mvp");
    this.uShieldModelLoc = gl.getUniformLocation(this.shieldProgram, "u_model");
    this.uShieldCamPosLoc = gl.getUniformLocation(this.shieldProgram, "u_cameraPos");
    this.uShieldColorLoc = gl.getUniformLocation(this.shieldProgram, "u_color");
    this.uShieldTimeLoc = gl.getUniformLocation(this.shieldProgram, "u_time");
    this.uShieldHitLoc = gl.getUniformLocation(this.shieldProgram, "u_hitIntensity");

    // Skybox uniforms
    this.uSkyboxDirLoc = gl.getUniformLocation(this.skyboxProgram, "u_cameraDir");
    this.uSkyboxTimeLoc = gl.getUniformLocation(this.skyboxProgram, "u_time");
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
      throw new Error(`[SpaceRenderer] Link error: ${gl.getProgramInfoLog(prog)}`);
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
      throw new Error(`[SpaceRenderer] Shader compile error: ${info}`);
    }

    return shader;
  }
}
