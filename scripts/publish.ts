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

const enableNpm = process.env.ENABLE_NPM_PUBLISH === "true";
const token = process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN;

if (!enableNpm) {
  console.log("==================================================================");
  console.log("ℹ️  [Release] NPM registry publishing is disabled by default.");
  console.log("    To enable publishing packages to npm, set ENABLE_NPM_PUBLISH=true");
  console.log("    and configure NPM_TOKEN in GitHub repository secrets.");
  console.log("==================================================================");
  process.exit(0);
}

if (!token || token.trim() === "") {
  console.log("==================================================================");
  console.log("⚠️  [Release] ENABLE_NPM_PUBLISH is true, but no NPM_TOKEN was found.");
  console.log("    Please configure NPM_TOKEN in your GitHub repository secrets.");
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

if (child.status !== 0) {
  console.log("==================================================================");
  console.log("⚠️  [NPM Publish Notice]");
  console.log("    If you encountered 404 Not Found on scoped packages (@flux/*):");
  console.log("    The scope '@flux' must be registered under your account on npmjs.com.");
  console.log("    Ensure you have created the organization at https://www.npmjs.com/org/create");
  console.log("==================================================================");
  process.exit(child.status ?? 0);
}

process.exit(0);
