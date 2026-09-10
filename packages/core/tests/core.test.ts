import { describe, expect, it } from "bun:test";
import { Application, definePlugin } from "../src/index.js";

describe("@flux/core", () => {
  it("should initialize application lifecycle and probe capabilities", async () => {
    const app = new Application({ name: "TestApp" });
    expect(app.state).toBe("uninitialized");

    let pluginInstalled = false;
    const testPlugin = definePlugin({
      name: "test-plugin",
      install: (instance) => {
        expect(instance).toBe(app);
        pluginInstalled = true;
      },
    });

    app.use(testPlugin);
    await app.init();

    expect(app.state).toBe("ready");
    expect(pluginInstalled).toBe(true);

    const caps = app.capabilities.get();
    expect(typeof caps.wasm).toBe("boolean");
    expect(caps.environment).toBe("bun");

    app.start();
    expect(app.state).toBe("running");

    app.stop();
    expect(app.state).toBe("paused");

    app.destroy();
    expect(app.state).toBe("destroyed");
  });

  it("should handle typed events correctly", () => {
    const app = new Application();
    let emitted = 0;

    const unsubscribe = app.events.on("custom:event", (data: number) => {
      emitted += data;
    });

    app.events.emit("custom:event", 10);
    app.events.emit("custom:event", 5);
    expect(emitted).toBe(15);

    unsubscribe();
    app.events.emit("custom:event", 20);
    expect(emitted).toBe(15);
  });
});
