//! Flux Odyssey - Native Physics Engine (Compiled to WebAssembly with C ABI)
//! Compatible with both @flow.engine/wasm CppWasmAdapter and RustWasmAdapter.
//! Copyright (c) 2026 GefyDev <hi@gefy.dev>
//! Licensed under the Apache License, Version 2.0.

const MAX_PARTICLES: usize = 1024;
const MAX_MISSILES: usize = 64;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct Particle {
    pub x: f32, pub y: f32, pub z: f32,
    pub vx: f32, pub vy: f32, pub vz: f32,
    pub life: f32,
    pub max_life: f32,
    pub size: f32,
    pub r: f32, pub g: f32, pub b: f32, pub a: f32,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct Missile {
    pub x: f32, pub y: f32, pub z: f32,
    pub vx: f32, pub vy: f32, pub vz: f32,
    pub target_x: f32, pub target_y: f32, pub target_z: f32,
    pub speed: f32,
    pub turn_rate: f32,
    pub life: f32,
    pub active: i32,
}

static mut PARTICLES: [Particle; MAX_PARTICLES] = [Particle {
    x: 0.0, y: 0.0, z: 0.0,
    vx: 0.0, vy: 0.0, vz: 0.0,
    life: 0.0, max_life: 1.0, size: 1.0,
    r: 1.0, g: 1.0, b: 1.0, a: 1.0,
}; MAX_PARTICLES];

static mut MISSILES: [Missile; MAX_MISSILES] = [Missile {
    x: 0.0, y: 0.0, z: 0.0,
    vx: 0.0, vy: 0.0, vz: 0.0,
    target_x: 0.0, target_y: 0.0, target_z: 0.0,
    speed: 0.0, turn_rate: 0.0, life: 0.0,
    active: 0,
}; MAX_MISSILES];

#[no_mangle]
pub extern "C" fn flux_init() {
    unsafe {
        for p in PARTICLES.iter_mut() {
            p.life = 0.0;
        }
        for m in MISSILES.iter_mut() {
            m.active = 0;
        }
    }
}

#[no_mangle]
pub extern "C" fn get_max_particles() -> i32 {
    MAX_PARTICLES as i32
}

#[no_mangle]
pub extern "C" fn get_particle_buffer() -> *const f32 {
    unsafe { PARTICLES.as_ptr() as *const f32 }
}

#[no_mangle]
pub extern "C" fn get_missile_buffer() -> *const f32 {
    unsafe { MISSILES.as_ptr() as *const f32 }
}

#[no_mangle]
pub extern "C" fn spawn_particle(
    x: f32, y: f32, z: f32,
    vx: f32, vy: f32, vz: f32,
    life: f32, size: f32,
    r: f32, g: f32, b: f32, a: f32,
) -> i32 {
    unsafe {
        for (i, p) in PARTICLES.iter_mut().enumerate() {
            if p.life <= 0.0 {
                *p = Particle { x, y, z, vx, vy, vz, life, max_life: life, size, r, g, b, a };
                return i as i32;
            }
        }
    }
    -1
}

#[no_mangle]
pub extern "C" fn spawn_explosion(x: f32, y: f32, z: f32, count: i32, speed_scale: f32) {
    for i in 0..count {
        let theta = (i * 17 % 360) as f32 * 0.0174533;
        let phi = (i * 31 % 180) as f32 * 0.0174533;
        let spd = (18.0 + (i % 30) as f32) * speed_scale;

        let vx = spd * phi.sin() * theta.cos();
        let vy = spd * phi.cos();
        let vz = spd * phi.sin() * theta.sin();

        let life = 0.7 + (i % 12) as f32 * 0.08;
        let size = 0.9 + (i % 6) as f32 * 0.4;

        spawn_particle(x, y, z, vx, vy, vz, life, size, 1.0, 0.55, 0.15, 1.0);
    }
}

#[no_mangle]
pub extern "C" fn update_particles(dt: f32) -> i32 {
    let mut active = 0;
    unsafe {
        for p in PARTICLES.iter_mut() {
            if p.life > 0.0 {
                p.life -= dt;
                if p.life <= 0.0 {
                    p.life = 0.0;
                    continue;
                }

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;

                p.vx *= 0.982;
                p.vy *= 0.982;
                p.vz *= 0.982;

                p.a = p.life / p.max_life;
                active += 1;
            }
        }
    }
    active
}

#[no_mangle]
pub extern "C" fn spawn_missile(
    x: f32, y: f32, z: f32,
    vx: f32, vy: f32, vz: f32,
    target_x: f32, target_y: f32, target_z: f32,
    speed: f32, turn_rate: f32, life: f32,
) -> i32 {
    unsafe {
        for (i, m) in MISSILES.iter_mut().enumerate() {
            if m.active == 0 {
                *m = Missile {
                    x, y, z, vx, vy, vz,
                    target_x, target_y, target_z,
                    speed, turn_rate, life,
                    active: 1,
                };
                return i as i32;
            }
        }
    }
    -1
}

#[no_mangle]
pub extern "C" fn update_missiles(dt: f32) {
    unsafe {
        for m in MISSILES.iter_mut() {
            if m.active == 0 { continue; }

            m.life -= dt;
            if m.life <= 0.0 {
                m.active = 0;
                continue;
            }

            let dx = m.target_x - m.x;
            let dy = m.target_y - m.y;
            let dz = m.target_z - m.z;
            let dist_sq = dx * dx + dy * dy + dz * dz;

            if dist_sq > 0.0001 {
                let dist = dist_sq.sqrt();
                let inv_dist = 1.0 / dist;
                let desired_vx = dx * inv_dist * m.speed;
                let desired_vy = dy * inv_dist * m.speed;
                let desired_vz = dz * inv_dist * m.speed;

                let turn = m.turn_rate * dt;
                m.vx += (desired_vx - m.vx) * turn;
                m.vy += (desired_vy - m.vy) * turn;
                m.vz += (desired_vz - m.vz) * turn;
            }

            m.x += m.vx * dt;
            m.y += m.vy * dt;
            m.z += m.vz * dt;
        }
    }
}
