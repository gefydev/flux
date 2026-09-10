/**
 * Flux Odyssey - Native Physics & Swarm Simulation Engine (C++)
 * Copyright 2026 GefyDev (hi@gefy.dev)
 * Licensed under the Apache License, Version 2.0.
 *
 * Compiles to WebAssembly with C ABI for @flow.engine/wasm CppWasmAdapter.
 */

#include <cmath>
#include <cstdint>

#define FLUX_EXPORT extern "C" __attribute__((visibility("default")))

// Maximum particles in the native simulation pool
constexpr int MAX_PARTICLES = 1024;
constexpr int MAX_MISSILES = 64;
constexpr int MAX_DRONES = 32;

struct Particle {
    float x, y, z;
    float vx, vy, vz;
    float life;
    float maxLife;
    float size;
    float r, g, b, a;
};

struct Missile {
    float x, y, z;
    float vx, vy, vz;
    float targetX, targetY, targetZ;
    float speed;
    float turnRate;
    float life;
    int active;
};

struct Drone {
    float x, y, z;
    float vx, vy, vz;
    float yaw, pitch;
    float speed;
    int active;
};

// Contiguous native simulation memory buffers
static Particle g_particles[MAX_PARTICLES];
static Missile g_missiles[MAX_MISSILES];
static Drone g_drones[MAX_DRONES];
static int g_activeParticles = 0;

FLUX_EXPORT void flux_init() {
    g_activeParticles = 0;
    for (int i = 0; i < MAX_PARTICLES; ++i) {
        g_particles[i].life = 0.0f;
    }
    for (int i = 0; i < MAX_MISSILES; ++i) {
        g_missiles[i].active = 0;
    }
    for (int i = 0; i < MAX_DRONES; ++i) {
        g_drones[i].active = 0;
    }
}

FLUX_EXPORT int get_max_particles() {
    return MAX_PARTICLES;
}

FLUX_EXPORT float* get_particle_buffer() {
    return reinterpret_cast<float*>(g_particles);
}

FLUX_EXPORT int spawn_particle(float x, float y, float z,
                               float vx, float vy, float vz,
                               float life, float size,
                               float r, float g, float b, float a) {
    // Find free slot
    for (int i = 0; i < MAX_PARTICLES; ++i) {
        if (g_particles[i].life <= 0.0f) {
            g_particles[i] = { x, y, z, vx, vy, vz, life, life, size, r, g, b, a };
            return i;
        }
    }
    return -1;
}

FLUX_EXPORT void spawn_explosion(float x, float y, float z, int count, float speedScale) {
    for (int i = 0; i < count; ++i) {
        float theta = static_cast<float>(i * 17 % 360) * 0.0174533f;
        float phi = static_cast<float>(i * 31 % 180) * 0.0174533f;
        float spd = (15.0f + static_cast<float>(i % 25)) * speedScale;

        float vx = spd * std::sin(phi) * std::cos(theta);
        float vy = spd * std::cos(phi);
        float vz = spd * std::sin(phi) * std::sin(theta);

        float life = 0.6f + static_cast<float>(i % 10) * 0.08f;
        float size = 0.8f + static_cast<float>(i % 5) * 0.4f;

        spawn_particle(x, y, z, vx, vy, vz, life, size, 1.0f, 0.6f, 0.1f, 1.0f);
    }
}

FLUX_EXPORT int update_particles(float dt) {
    int active = 0;
    for (int i = 0; i < MAX_PARTICLES; ++i) {
        if (g_particles[i].life > 0.0f) {
            g_particles[i].life -= dt;
            if (g_particles[i].life <= 0.0f) {
                g_particles[i].life = 0.0f;
                continue;
            }

            // Advance kinematics
            g_particles[i].x += g_particles[i].vx * dt;
            g_particles[i].y += g_particles[i].vy * dt;
            g_particles[i].z += g_particles[i].vz * dt;

            // Drag
            g_particles[i].vx *= 0.985f;
            g_particles[i].vy *= 0.985f;
            g_particles[i].vz *= 0.985f;

            // Fade alpha with remaining life
            float t = g_particles[i].life / g_particles[i].maxLife;
            g_particles[i].a = t;

            active++;
        }
    }
    g_activeParticles = active;
    return active;
}

FLUX_EXPORT int spawn_missile(float x, float y, float z,
                              float vx, float vy, float vz,
                              float targetX, float targetY, float targetZ,
                              float speed, float turnRate, float life) {
    for (int i = 0; i < MAX_MISSILES; ++i) {
        if (!g_missiles[i].active) {
            g_missiles[i] = { x, y, z, vx, vy, vz, targetX, targetY, targetZ, speed, turnRate, life, 1 };
            return i;
        }
    }
    return -1;
}

FLUX_EXPORT float* get_missile_buffer() {
    return reinterpret_cast<float*>(g_missiles);
}

FLUX_EXPORT void update_missiles(float dt) {
    for (int i = 0; i < MAX_MISSILES; ++i) {
        if (!g_missiles[i].active) continue;

        g_missiles[i].life -= dt;
        if (g_missiles[i].life <= 0.0f) {
            g_missiles[i].active = 0;
            continue;
        }

        // Homing steering towards target
        float dx = g_missiles[i].targetX - g_missiles[i].x;
        float dy = g_missiles[i].targetY - g_missiles[i].y;
        float dz = g_missiles[i].targetZ - g_missiles[i].z;
        float dist = std::sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > 0.001f) {
            float invDist = 1.0f / dist;
            float desiredVx = dx * invDist * g_missiles[i].speed;
            float desiredVy = dy * invDist * g_missiles[i].speed;
            float desiredVz = dz * invDist * g_missiles[i].speed;

            float turn = g_missiles[i].turnRate * dt;
            g_missiles[i].vx += (desiredVx - g_missiles[i].vx) * turn;
            g_missiles[i].vy += (desiredVy - g_missiles[i].vy) * turn;
            g_missiles[i].vz += (desiredVz - g_missiles[i].vz) * turn;
        }

        g_missiles[i].x += g_missiles[i].vx * dt;
        g_missiles[i].y += g_missiles[i].vy * dt;
        g_missiles[i].z += g_missiles[i].vz * dt;
    }
}
