import { describe, expect, it } from "bun:test";
import { runCli, runInfoCommand } from "../src/index.js";

describe("@flux/cli", () => {
  it("should run info command without throwing", () => {
    expect(() => runInfoCommand()).not.toThrow();
  });

  it("should run CLI with help and version flags", () => {
    expect(() => runCli(["--help"])).not.toThrow();
    expect(() => runCli(["--version"])).not.toThrow();
    expect(() => runCli(["info"])).not.toThrow();
  });
});
