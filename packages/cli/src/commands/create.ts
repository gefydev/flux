import * as fs from "fs";
import * as path from "path";

export interface CreateProjectOptions {
  name: string;
  template?: "simulation" | "minimal" | "multiplayer";
}

export function runCreateCommand(options: CreateProjectOptions): void {
  const targetDir = path.resolve(process.cwd(), options.name);
  if (fs.existsSync(targetDir)) {
    throw new Error(`[Flux CLI] Target directory '${options.name}' already exists.`);
  }

  console.log(`[Flux CLI] Creating new Flux project in '${targetDir}'...`);
  fs.mkdirSync(path.join(targetDir, "src"), { recursive: true });

  // 1. package.json
  const pkgJson = {
    name: options.name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "bun run src/index.ts",
      test: "bun test",
    },
    dependencies: {
      "@flux/core": "^0.1.0",
      "@flux/math": "^0.1.0",
      "@flux/ecs": "^0.1.0",
      "@flux/runtime": "^0.1.0",
    },
    devDependencies: {
      typescript: "^5.7.2",
    },
  };
  fs.writeFileSync(path.join(targetDir, "package.json"), JSON.stringify(pkgJson, null, 2));

  // 2. tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      skipLibCheck: true,
    },
    include: ["src/**/*"],
  };
  fs.writeFileSync(path.join(targetDir, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));

  // 3. src/index.ts
  const indexTs = `import { Application } from "@flux/core";
import { createRuntimePlugin } from "@flux/runtime";
import { defineComponent, defineSystem } from "@flux/ecs";

async function main() {
  const app = new Application({ name: "${options.name}" });
  app.use(createRuntimePlugin());

  await app.init();
  console.log("⚡ Flux Engine project running!");

  const Position = defineComponent("Position", () => ({ x: 0, y: 0 }));
  const entity = app.world.createEntity();
  app.world.add(entity, Position, { x: 10, y: 20 });

  app.world.registerSystem(defineSystem((w, dt) => {
    for (const ent of w.query(Position)) {
      const pos = w.get(ent, Position)!;
      pos.x += 1 * dt;
    }
  }));

  app.start();
}

main().catch(console.error);
`;
  fs.writeFileSync(path.join(targetDir, "src", "index.ts"), indexTs);

  console.log(`\n🎉 Project '${options.name}' created successfully!`);
  console.log(`\nTo get started:\n  cd ${options.name}\n  bun install\n  bun run dev\n`);
}
