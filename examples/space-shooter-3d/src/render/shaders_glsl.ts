/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * High-Resolution GLSL Shaders for WebGL2 Pipeline in Flux Odyssey.
 * Includes PBR lighting, normal perturbation, emissive glow, and deep space nebula skybox.
 */

export const MESH_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_mvp;
uniform mat4 u_model;

out vec3 v_normal;
out vec2 v_uv;
out vec3 v_worldPos;

void main() {
    mat3 normalMat = mat3(u_model);
    v_normal = normalize(normalMat * a_normal);
    v_uv = a_uv;
    vec4 world = u_model * vec4(a_position, 1.0);
    v_worldPos = world.xyz;
    gl_Position = u_mvp * vec4(a_position, 1.0);
}
`;

export const MESH_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
in vec3 v_worldPos;

uniform vec3 u_cameraPos;
uniform vec3 u_color;
uniform vec3 u_lightDir;
uniform sampler2D u_texture;
uniform float u_useTexture;
uniform float u_emissive;
uniform float u_metallic;
uniform float u_roughness;

out vec4 fragColor;

void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(u_lightDir);
    vec3 V = normalize(u_cameraPos - v_worldPos);
    vec3 H = normalize(L + V);

    // Diffuse
    float NdotL = max(dot(N, L), 0.0);
    float ambient = 0.22;
    vec3 diffuse = u_color * (ambient + NdotL * 0.78);

    // Specular Blinn-Phong
    float NdotH = max(dot(N, H), 0.0);
    float specPower = mix(12.0, 128.0, 1.0 - u_roughness);
    float spec = pow(NdotH, specPower) * u_metallic;
    vec3 specular = vec3(1.0, 0.95, 0.9) * spec * NdotL;

    // Texture modulation
    vec3 albedo = u_color;
    if (u_useTexture > 0.5) {
        vec4 tex = texture(u_texture, v_uv);
        albedo *= tex.rgb;
    }

    // Emissive component (boost, shields, laser glow)
    vec3 emissive = albedo * u_emissive * 1.8;

    vec3 finalRgb = albedo * diffuse + specular + emissive;
    fragColor = vec4(finalRgb, 1.0);
}
`;

export const SHIELD_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
in vec3 v_worldPos;

uniform vec3 u_cameraPos;
uniform vec3 u_color;
uniform float u_time;
uniform float u_hitIntensity;

out vec4 fragColor;

void main() {
    vec3 N = normalize(v_normal);
    vec3 V = normalize(u_cameraPos - v_worldPos);

    // Fresnel glow edge
    float fresnel = 1.0 - max(dot(N, V), 0.0);
    fresnel = pow(fresnel, 2.5);

    // Hex pulse grid
    float hex = sin(v_uv.x * 40.0 + u_time * 3.0) * sin(v_uv.y * 40.0 - u_time * 2.0);
    hex = smoothstep(0.3, 0.9, hex);

    float alpha = (fresnel * 0.7 + hex * 0.3) * (0.4 + u_hitIntensity * 0.6);
    vec3 glowColor = mix(u_color, vec3(1.0, 0.3, 0.2), u_hitIntensity);

    fragColor = vec4(glowColor, alpha);
}
`;

export const SKYBOX_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;

void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.9999, 1.0);
}
`;

export const SKYBOX_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec3 u_cameraDir;
uniform float u_time;
out vec4 fragColor;

// Procedural 2D hash for starfield
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec2 p = (v_uv - 0.5) * 2.0;
    p += u_cameraDir.xy * 0.25;

    // Multi-layer star field
    float stars = 0.0;
    for (float i = 1.0; i <= 3.0; i += 1.0) {
        vec2 grid = floor(p * (180.0 * i));
        float h = hash(grid);
        if (h > 0.985) {
            float twinkle = sin(u_time * 4.0 + h * 6.28) * 0.3 + 0.7;
            stars += pow(h, 30.0) * twinkle * (1.2 / i);
        }
    }

    // Swirling colorful cosmic nebula
    float nebula1 = sin(p.x * 2.5 + sin(p.y * 3.0 + u_time * 0.05)) * 0.5 + 0.5;
    float nebula2 = cos(p.y * 2.0 - cos(p.x * 2.5 - u_time * 0.04)) * 0.5 + 0.5;

    vec3 deepSpace = vec3(0.015, 0.02, 0.04);
    vec3 cyanDust = vec3(0.05, 0.2, 0.35) * pow(nebula1, 3.0);
    vec3 purpleDust = vec3(0.3, 0.05, 0.3) * pow(nebula2, 3.5);

    vec3 finalColor = deepSpace + cyanDust + purpleDust + vec3(stars);
    fragColor = vec4(finalColor, 1.0);
}
`;
