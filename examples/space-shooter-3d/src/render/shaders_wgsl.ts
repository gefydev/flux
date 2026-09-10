/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * High-Performance WGSL Shaders for @flux/webgpu pipeline in Flux Odyssey.
 */

export const WGSL_PBR_SHADER = /* wgsl */ `
struct Uniforms {
    mvp: mat4x4<f32>,
    model: mat4x4<f32>,
    color: vec3<f32>,
    emissive: f32,
    cameraPos: vec3<f32>,
    metallic: f32,
    lightDir: vec3<f32>,
    roughness: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};

struct VertexOutput {
    @builtin(position) clipPosition: vec4<f32>,
    @location(0) normal: vec3<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) worldPos: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let world = u.model * vec4<f32>(in.position, 1.0);
    out.worldPos = world.xyz;
    out.clipPosition = u.mvp * vec4<f32>(in.position, 1.0);
    out.normal = normalize((u.model * vec4<f32>(in.normal, 0.0)).xyz);
    out.uv = in.uv;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let N = normalize(in.normal);
    let L = normalize(u.lightDir);
    let V = normalize(u.cameraPos - in.worldPos);
    let H = normalize(L + V);

    let NdotL = max(dot(N, L), 0.0);
    let ambient = 0.22;
    let diffuse = u.color * (ambient + NdotL * 0.78);

    let NdotH = max(dot(N, H), 0.0);
    let specPower = mix(16.0, 128.0, 1.0 - u.roughness);
    let spec = pow(NdotH, specPower) * u.metallic;
    let specular = vec3<f32>(1.0, 0.95, 0.9) * spec * NdotL;

    let emissiveCol = u.color * u.emissive * 2.0;
    let finalColor = diffuse + specular + emissiveCol;

    return vec4<f32>(finalColor, 1.0);
}
`;
