import { runBuildCommand } from "./commands/build.js";
import { runCreateCommand } from "./commands/create.js";
import { runDevCommand } from "./commands/dev.js";
import { runInfoCommand } from "./commands/info.js";

export function runCli(args: string[] = process.argv.slice(2)): void {
  const command = args[0]?.toLowerCase();

  switch (command) {
    case "info":
      runInfoCommand();
      break;

    case "create": {
      const name = args[1];
      if (!name) {
        console.error("Error: Project name required. Usage: flux create <project-name>");
        process.exit(1);
      }
      runCreateCommand({ name });
      break;
    }

    case "dev":
      runDevCommand();
      break;

    case "build":
      runBuildCommand();
      break;

    case "-v":
    case "--version":
    case "version":
      console.log("Flux Engine CLI v0.1.0 (GefyDev <hi@gefy.dev>)");
      break;

    case "-h":
    case "--help":
    case "help":
    default:
      printHelp();
      break;
  }
}

function printHelp(): void {
  console.log(`
Flux Engine ⚡ CLI
Author: GefyDev <hi@gefy.dev>

Usage:
  flux <command> [options]

Commands:
  create <name>   Scaffold a new Flux Engine project
  info            Print system capabilities, hardware concurrency, and WASM/GPU detection
  dev             Start local development server with hot reload
  build           Build application for web or desktop targets
  help            Show this help message
  --version       Show CLI version
`);
}
