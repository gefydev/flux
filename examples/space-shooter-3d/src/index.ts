import { Application } from "@flux/core";
import { defineSystem } from "@flux/ecs";
import { InputManager } from "@flux/input";
import { Mat4, Vec3 } from "@flux/math";
import { createRuntimePlugin } from "@flux/runtime";
import { AsteroidTag, LaserTag, Position3D, ShipTag, Velocity3D } from "./components.js";
import { createAsteroidMesh, createLaserMesh, createStarfighterMesh } from "./geometry.js";
import { Renderer3D } from "./renderer3d.js";

async function main() {
  const canvas = document.getElementById("flux-canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element not found");

  // Handle high-DPI resize
  const resizeCanvas = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  };
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // 1. Initialize Flux Engine Application
  const app = new Application({ name: "Flux Starfighter 3D" });
  app.use(createRuntimePlugin({ fixedTimeStep: 1 / 60 }));
  await app.init();

  // 2. Initialize 3D Renderer & Meshes
  const renderer = new Renderer3D(canvas);
  renderer.resize(canvas.width, canvas.height);
  window.addEventListener("resize", () => renderer.resize(canvas.width, canvas.height));

  const shipMesh = renderer.uploadMesh(createStarfighterMesh());
  const asteroidMesh = renderer.uploadMesh(createAsteroidMesh(2, 2.8));
  const laserMesh = renderer.uploadMesh(createLaserMesh());

  // 3. Initialize Input System
  const input = new InputManager();
  input.attach(window);
  input.actions.bindKey("TurnLeft", "KeyA");
  input.actions.bindKey("TurnLeft", "ArrowLeft");
  input.actions.bindKey("TurnRight", "KeyD");
  input.actions.bindKey("TurnRight", "ArrowRight");
  input.actions.bindKey("PitchUp", "KeyS");
  input.actions.bindKey("PitchUp", "ArrowDown");
  input.actions.bindKey("PitchDown", "KeyW");
  input.actions.bindKey("PitchDown", "ArrowUp");
  input.actions.bindKey("Shoot", "Space");
  input.actions.bindKey("Boost", "ShiftLeft");
  input.actions.bindKey("Boost", "ShiftRight");
  input.actions.bindMouseButton("Shoot", 0);

  // 4. Spawn Player Starfighter
  const player = app.world.createEntity();
  app.world.add(player, ShipTag, { speed: 50, maxSpeed: 160, yaw: 0, pitch: 0, roll: 0, score: 0 });
  app.world.addPacked(player, Position3D, [0, 0, 0]);
  app.world.addPacked(player, Velocity3D, [0, 0, 0]);

  // 5. Spawn Asteroid Field (150 asteroids)
  const ASTEROID_COUNT = 150;
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const asteroid = app.world.createEntity();
    const size = 1.8 + Math.random() * 2.5;
    app.world.add(asteroid, AsteroidTag, {
      rotSpeedY: (Math.random() - 0.5) * 1.5,
      size,
      hp: Math.ceil(size),
    });

    const x = (Math.random() - 0.5) * 600;
    const y = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 800 - 200;
    app.world.addPacked(asteroid, Position3D, [x, y, z]);
    app.world.addPacked(asteroid, Velocity3D, [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
    ]);
  }

  // Laser spawner helper
  let shootCooldown = 0;
  function shootLasers(x: number, y: number, z: number, yaw: number) {
    // Wingtip offsets
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    const offsets = [-2.4, 2.4];
    for (const wingX of offsets) {
      const lx = x + wingX * cosY;
      const lz = z - wingX * sinY;
      const laser = app.world.createEntity();
      app.world.add(laser, LaserTag, { life: 2.5 });

      const speed = 280;
      const vx = -Math.sin(yaw) * speed;
      const vz = -Math.cos(yaw) * speed;

      app.world.addPacked(laser, Position3D, [lx, y, lz]);
      app.world.addPacked(laser, Velocity3D, [vx, 0, vz]);
    }
  }

  // 6. Define Systems

  // Flight Control System
  const flightSystem = defineSystem((world, dt) => {
    shootCooldown -= dt;

    for (const ent of world.query(ShipTag)) {
      const ship = world.get(ent, ShipTag)!;
      const posOff = world.getPackedOffset(ent, Position3D);
      const posBuf = world.getPackedBuffer(Position3D);

      const turnSpeed = 2.2;
      if (input.isPressed("TurnLeft")) ship.yaw += turnSpeed * dt;
      if (input.isPressed("TurnRight")) ship.yaw -= turnSpeed * dt;
      if (input.isPressed("PitchUp")) ship.pitch += turnSpeed * 0.8 * dt;
      if (input.isPressed("PitchDown")) ship.pitch -= turnSpeed * 0.8 * dt;

      // Speed & Boost
      const isBoosting = input.isPressed("Boost");
      const targetSpeed = isBoosting ? ship.maxSpeed : 50;
      ship.speed += (targetSpeed - ship.speed) * dt * 3.0;

      // Forward vector based on yaw
      const forwardX = -Math.sin(ship.yaw);
      const forwardZ = -Math.cos(ship.yaw);

      posBuf[posOff + 0] = posBuf[posOff + 0]! + forwardX * ship.speed * dt;
      posBuf[posOff + 2] = posBuf[posOff + 2]! + forwardZ * ship.speed * dt;

      // Shooting
      if (input.isPressed("Shoot") && shootCooldown <= 0) {
        shootLasers(posBuf[posOff + 0]!, posBuf[posOff + 1]!, posBuf[posOff + 2]!, ship.yaw);
        shootCooldown = 0.18; // ~5.5 shots/sec
      }
    }
  });

  // Projectile & Asteroid Movement System
  const movementSystem = defineSystem((world, dt) => {
    // Lasers
    const toDestroy: number[] = [];

    for (const ent of world.query(LaserTag)) {
      const laser = world.get(ent, LaserTag);
      if (!laser) continue;

      laser.life -= dt;
      if (laser.life <= 0) {
        toDestroy.push(ent);
        continue;
      }

      const pOff = world.getPackedOffset(ent, Position3D);
      const vOff = world.getPackedOffset(ent, Velocity3D);
      if (pOff < 0 || vOff < 0) continue;

      const pBuf = world.getPackedBuffer(Position3D);
      const vBuf = world.getPackedBuffer(Velocity3D);

      pBuf[pOff + 0] = pBuf[pOff + 0]! + vBuf[vOff + 0]! * dt;
      pBuf[pOff + 1] = pBuf[pOff + 1]! + vBuf[vOff + 1]! * dt;
      pBuf[pOff + 2] = pBuf[pOff + 2]! + vBuf[vOff + 2]! * dt;
    }

    for (const ent of toDestroy) {
      world.destroyEntity(ent);
    }

    // Asteroids
    for (const ent of world.query(AsteroidTag)) {
      const pOff = world.getPackedOffset(ent, Position3D);
      const vOff = world.getPackedOffset(ent, Velocity3D);
      if (pOff < 0 || vOff < 0) continue;

      const pBuf = world.getPackedBuffer(Position3D);
      const vBuf = world.getPackedBuffer(Velocity3D);

      pBuf[pOff + 0] = pBuf[pOff + 0]! + vBuf[vOff + 0]! * dt;
      pBuf[pOff + 1] = pBuf[pOff + 1]! + vBuf[vOff + 1]! * dt;
      pBuf[pOff + 2] = pBuf[pOff + 2]! + vBuf[vOff + 2]! * dt;
    }
  });

  // Combat Collision System (3D Sphere vs Point)
  const combatSystem = defineSystem((world) => {
    const shipEnt = world.query(ShipTag)[Symbol.iterator]().next().value;
    const ship = shipEnt ? world.get(shipEnt, ShipTag) : null;
    const lasersToDestroy: number[] = [];

    for (const laserEnt of world.query(LaserTag)) {
      const lpOff = world.getPackedOffset(laserEnt, Position3D);
      if (lpOff < 0) continue;

      const lpBuf = world.getPackedBuffer(Position3D);
      const lx = lpBuf[lpOff + 0]!;
      const ly = lpBuf[lpOff + 1]!;
      const lz = lpBuf[lpOff + 2]!;

      for (const astEnt of world.query(AsteroidTag)) {
        const ast = world.get(astEnt, AsteroidTag);
        if (!ast) continue;

        const apOff = world.getPackedOffset(astEnt, Position3D);
        if (apOff < 0) continue;

        const apBuf = world.getPackedBuffer(Position3D);
        const ax = apBuf[apOff + 0]!;
        const ay = apBuf[apOff + 1]!;
        const az = apBuf[apOff + 2]!;

        const distSq = (lx - ax) ** 2 + (ly - ay) ** 2 + (lz - az) ** 2;
        if (distSq < (ast.size + 1.0) ** 2) {
          // Hit!
          lasersToDestroy.push(laserEnt);
          ast.hp--;
          if (ast.hp <= 0) {
            // Asteroid destroyed: respawn ahead
            if (ship) ship.score++;
            apBuf[apOff + 0] = (Math.random() - 0.5) * 500;
            apBuf[apOff + 1] = (Math.random() - 0.5) * 150;
            apBuf[apOff + 2] = lz - 400 - Math.random() * 200;
            ast.hp = 2;
          }
          break;
        }
      }
    }

    for (const laserEnt of lasersToDestroy) {
      world.destroyEntity(laserEnt);
    }
  });

  // HUD & Rendering System
  const statFps = document.getElementById("stat-fps")!;
  const statMs = document.getElementById("stat-ms")!;
  const statEntities = document.getElementById("stat-entities")!;
  const statMem = document.getElementById("stat-mem")!;
  const hudScore = document.getElementById("hud-score")!;

  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  const renderSystem = defineSystem((world) => {
    renderer.beginFrame();

    // 1. Position camera behind player ship
    const shipEnt = world.query(ShipTag)[Symbol.iterator]().next().value;
    if (!shipEnt) return;

    const ship = world.get(shipEnt, ShipTag);
    if (!ship) return;

    const sOff = world.getPackedOffset(shipEnt, Position3D);
    if (sOff < 0) return;

    const sBuf = world.getPackedBuffer(Position3D);
    const sx = sBuf[sOff + 0]!;
    const sy = sBuf[sOff + 1]!;
    const sz = sBuf[sOff + 2]!;

    // Camera follow offset
    const camDist = 16.0;
    const camHeight = 5.5;
    const camX = sx + Math.sin(ship.yaw) * camDist;
    const camY = sy + camHeight;
    const camZ = sz + Math.cos(ship.yaw) * camDist;

    // Build View Matrix (lookAt)
    buildLookAt(renderer.viewMatrix, new Vec3(camX, camY, camZ), new Vec3(sx, sy + 1.2, sz), new Vec3(0, 1, 0));

    // 2. Render Player Ship
    renderer.drawMesh(shipMesh, new Vec3(sx, sy, sz), ship.yaw, ship.pitch, 1.0, [0.2, 0.7, 1.0], 0.1);

    // 3. Render Asteroids
    for (const ent of world.query(AsteroidTag)) {
      const ast = world.get(ent, AsteroidTag);
      if (!ast) continue;

      const off = world.getPackedOffset(ent, Position3D);
      if (off < 0) continue;

      const buf = world.getPackedBuffer(Position3D);
      renderer.drawMesh(
        asteroidMesh,
        new Vec3(buf[off + 0]!, buf[off + 1]!, buf[off + 2]!),
        ast.rotSpeedY * performance.now() * 0.001,
        0,
        ast.size,
        [0.75, 0.6, 0.5]
      );
    }

    // 4. Render Lasers (emissive neon cyan)
    for (const ent of world.query(LaserTag)) {
      const off = world.getPackedOffset(ent, Position3D);
      if (off < 0) continue;

      const buf = world.getPackedBuffer(Position3D);
      renderer.drawMesh(
        laserMesh,
        new Vec3(buf[off + 0]!, buf[off + 1]!, buf[off + 2]!),
        ship.yaw,
        0,
        1.0,
        [0.1, 1.0, 0.9],
        0.8
      );
    }

    // 5. Update Telemetry HUD every 10 frames
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 250) {
      const dt = (now - lastFpsUpdate) / frameCount;
      const fps = (1000 / dt).toFixed(1);
      statFps.innerText = `${fps}`;
      statMs.innerText = `${dt.toFixed(2)} ms`;

      const totalEntities =
        world.getStorage(ShipTag).count +
        world.getStorage(AsteroidTag).count +
        world.getStorage(LaserTag).count;

      statEntities.innerText = `${totalEntities.toLocaleString()}`;
      statMem.innerText = `~${(renderer.totalTriangles * 0.048).toFixed(1)} KB VRAM`;
      hudScore.innerText = `${ship.score}`;

      frameCount = 0;
      lastFpsUpdate = now;
    }

    input.endFrame();
  });

  // Register Systems in order
  app.world.registerSystem(flightSystem);
  app.world.registerSystem(movementSystem);
  app.world.registerSystem(combatSystem);
  app.world.registerSystem(renderSystem);

  // 7. Start Engine
  app.start();
  console.log("⚡ Flux Starfighter 3D running smoothly at 60+ FPS!");
}

/**
 * Fast lookAt matrix generator.
 */
function buildLookAt(out: Mat4, eye: Vec3, center: Vec3, up: Vec3): void {
  const z0 = eye.x - center.x;
  const z1 = eye.y - center.y;
  const z2 = eye.z - center.z;
  let len = Math.hypot(z0, z1, z2);
  const invZ = len > 0 ? 1 / len : 0;
  const fz0 = z0 * invZ, fz1 = z1 * invZ, fz2 = z2 * invZ;

  // x = up x z
  let x0 = up.y * fz2 - up.z * fz1;
  let x1 = up.z * fz0 - up.x * fz2;
  let x2 = up.x * fz1 - up.y * fz0;
  len = Math.hypot(x0, x1, x2);
  const invX = len > 0 ? 1 / len : 0;
  const fx0 = x0 * invX, fx1 = x1 * invX, fx2 = x2 * invX;

  // y = z x x
  const fy0 = fz1 * fx2 - fz2 * fx1;
  const fy1 = fz2 * fx0 - fz0 * fx2;
  const fy2 = fz0 * fx1 - fz1 * fx0;

  const d = out.data;
  d[0] = fx0; d[1] = fy0; d[2] = fz0; d[3] = 0;
  d[4] = fx1; d[5] = fy1; d[6] = fz1; d[7] = 0;
  d[8] = fx2; d[9] = fy2; d[10] = fz2; d[11] = 0;
  d[12] = -(fx0 * eye.x + fx1 * eye.y + fx2 * eye.z);
  d[13] = -(fy0 * eye.x + fy1 * eye.y + fy2 * eye.z);
  d[14] = -(fz0 * eye.x + fz1 * eye.y + fz2 * eye.z);
  d[15] = 1;
}

main().catch(console.error);
