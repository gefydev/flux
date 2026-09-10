/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * Safe release publishing script for Flux Engine.
 * Manages npm authentication and avoids CI pipeline failures when NPM_TOKEN is not configured.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const token = process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN;

if (!token || token.trim() === "") {
  console.log("==================================================================");
  console.log("⚡ [Flux Engine Release] No NPM_TOKEN detected in GitHub Secrets.");
  console.log("------------------------------------------------------------------");
  console.log("ℹ️  Publishing was skipped gracefully so the CI workflow does not fail.");
  console.log("ℹ️  To enable publishing packages to npm:");
  console.log("    1. Go to https://www.npmjs.com/ and create an Access Token (Automation).");
  console.log("    2. Navigate to your GitHub repository:");
  console.log("       Settings -> Secrets and variables -> Actions -> Repository secrets");
  console.log("    3. Add a new secret named 'NPM_TOKEN' with your token value.");
  console.log("==================================================================");
  process.exit(0);
}

// Write .npmrc to user home directory and current working directory
const npmrcContent = `//registry.npmjs.org/:_authToken=${token.trim()}\nregistry=https://registry.npmjs.org/\nalways-auth=true\n`;
try {
  const homeNpmrc = path.join(os.homedir(), ".npmrc");
  fs.writeFileSync(homeNpmrc, npmrcContent);
  console.log("⚡ Configured ~/.npmrc authentication.");
} catch (err) {
  console.warn("⚠️ Could not write to ~/.npmrc, trying local .npmrc:", err);
}

try {
  fs.writeFileSync(path.resolve(".npmrc"), npmrcContent);
  console.log("⚡ Configured local .npmrc authentication.");
} catch (err) {
  console.warn("⚠️ Could not write local .npmrc:", err);
}

console.log("🚀 Publishing packages via Changesets...");
const child = spawnSync("bunx", ["changeset", "publish"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_AUTH_TOKEN: token.trim(),
    NPM_TOKEN: token.trim(),
  },
});

process.exit(child.status ?? 0);
