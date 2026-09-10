/**
 * @license Apache-2.0
 * Copyright (c) 2026 GefyDev <hi@gefy.dev>
 *
 * Safe release publishing script for Flux Engine.
 * Manages npm authentication and publishes packages to npm.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const token = (process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN || "").trim();

if (!token) {
  console.error("==================================================================");
  console.error("❌ [Release Error] No NPM_TOKEN or NODE_AUTH_TOKEN found in environment!");
  console.error("   Please ensure 'NPM_TOKEN' is configured in GitHub Repository Secrets.");
  console.error("   (Repository -> Settings -> Secrets and variables -> Actions)");
  console.error("==================================================================");
  process.exit(1);
}

// Write .npmrc to user home directory and current working directory
const npmrcContent = [
  "@flow.engine:registry=https://registry.npmjs.org/",
  "registry=https://registry.npmjs.org/",
  `//registry.npmjs.org/:_authToken=${token}`,
  ""
].join("\n");

try {
  const homeNpmrc = path.join(os.homedir(), ".npmrc");
  fs.writeFileSync(homeNpmrc, npmrcContent);
  console.log("⚡ Configured ~/.npmrc authentication for @flow.engine.");
} catch (err) {
  console.warn("⚠️ Could not write to ~/.npmrc, trying local .npmrc:", err);
}

try {
  fs.writeFileSync(path.resolve(".npmrc"), npmrcContent);
  console.log("⚡ Configured local .npmrc authentication for @flow.engine.");
} catch (err) {
  console.warn("⚠️ Could not write local .npmrc:", err);
}

console.log("🚀 Publishing packages via Changesets...");
const child = spawnSync("bunx", ["changeset", "publish"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_AUTH_TOKEN: token,
    NPM_TOKEN: token,
  },
});

if (child.status !== 0) {
  console.error("==================================================================");
  console.error("❌ [NPM Publish Failed]");
  console.error("   If you encountered 404 Not Found or 403 Forbidden on @flow.engine/*:");
  console.error("   1. Verify the organization 'flow.engine' exists on npmjs.com");
  console.error("   2. Verify the NPM_TOKEN has Read and write permissions for 'flow.engine'");
  console.error("   3. Verify 2FA settings for granular access tokens");
  console.error("==================================================================");
  process.exit(child.status ?? 1);
}

console.log("🎉 All packages published successfully to NPM (@flow.engine)!");
process.exit(0);
