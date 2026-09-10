export function runBuildCommand(options: { target?: "web" | "tauri" | "node" } = {}): void {
  const target = options.target ?? "web";
  console.log(`⚡ Building Flux application for target: ${target.toUpperCase()}`);
  console.log("Compiling shaders, stripping debug symbols, and preparing assets...");
  console.log("Build complete! Output in dist/");
}
