import type { SystemCapabilities } from "@flux/core";
import { type System, type SystemDefinition, type World, defineSystem } from "@flux/ecs";
import { BackendDispatcher, type DispatchContext } from "./dispatcher.js";
import { ExecutionGraph } from "./graph.js";
import { DEFAULT_STAGE_ORDER, Stage } from "./stages.js";

export interface SystemOptions {
  name?: string;
  stage?: Stage;
  before?: string[];
  after?: string[];
}

export interface ScheduledSystem {
  name: string;
  stage: Stage;
  before: string[];
  after: string[];
  definition: SystemDefinition;
}

/**
 * Main heterogeneous Scheduler for Flux Engine.
 */
export class Scheduler {
  private rawSystems: ScheduledSystem[] = [];
  private compiledStages = new Map<Stage, ScheduledSystem[]>();
  private dispatcher = new BackendDispatcher();
  private isCompiled = false;
  private anonymousCount = 0;

  /**
   * Add a system to the scheduler with optional stage and dependency constraints.
   */
  public addSystem(system: System, options: SystemOptions = {}): this {
    const def = defineSystem(system);
    const anyDef = def as any;
    const name = options.name ?? def.name ?? anyDef.name ?? `AnonymousSystem_${++this.anonymousCount}`;
    const stage = options.stage ?? anyDef.stage ?? Stage.Update;
    const before = options.before ?? anyDef.before ?? [];
    const after = options.after ?? anyDef.after ?? [];

    this.rawSystems.push({
      name,
      stage,
      before,
      after,
      definition: def,
    });

    this.isCompiled = false;
    return this;
  }

  /**
   * Build execution DAGs for each stage and resolve execution order.
   */
  public compile(capabilities: SystemCapabilities, entityCount = 0): void {
    this.compiledStages.clear();
    const context: DispatchContext = { capabilities, entityCount };

    // Group systems by stage
    const stageGroups = new Map<Stage, ScheduledSystem[]>();
    for (const sys of this.rawSystems) {
      let group = stageGroups.get(sys.stage);
      if (!group) {
        group = [];
        stageGroups.set(sys.stage, group);
      }
      group.push(sys);
    }

    // Resolve dependencies for each stage independently
    for (const [stage, systems] of stageGroups.entries()) {
      const graph = new ExecutionGraph();

      for (const sys of systems) {
        // Resolve target backend
        (sys.definition as any).resolvedBackend = this.dispatcher.resolveBackend(sys.definition, context);
        graph.addNode(sys);
      }

      // Add edges from explicit after / before rules
      for (const sys of systems) {
        for (const dep of sys.after) {
          if (systems.some((s) => s.name === dep)) {
            graph.addEdge(dep, sys.name);
          }
        }
        for (const dep of sys.before) {
          if (systems.some((s) => s.name === dep)) {
            graph.addEdge(sys.name, dep);
          }
        }
      }

      // Automatically infer dependencies based on inputs/outputs if declared
      for (const sysA of systems) {
        if (!sysA.definition.outputs?.length) continue;
        for (const sysB of systems) {
          if (sysA === sysB || !sysB.definition.inputs?.length) continue;
          // If sysA outputs a component that sysB inputs, sysB depends on sysA
          const hasHazard = sysA.definition.outputs.some((outComp) =>
            sysB.definition.inputs!.some((inComp) => inComp.id === outComp.id)
          );
          if (hasHazard) {
            try {
              graph.addEdge(sysA.name, sysB.name);
            } catch {
              // Edge might already exist
            }
          }
        }
      }

      const ordered = graph.resolve();
      this.compiledStages.set(stage, ordered);
    }

    this.isCompiled = true;
  }

  /**
   * Run all systems registered for a specific stage.
   */
  public runStage(stage: Stage, world: World, dt: number): void {
    const systems = this.compiledStages.get(stage);
    if (!systems) return;

    for (const sys of systems) {
      sys.definition.update(world, dt);
    }
  }

  /**
   * Run the full pipeline through default stages.
   */
  public run(world: World, dt: number): void {
    if (!this.isCompiled) {
      throw new Error("[Scheduler] Scheduler must be compiled before calling run().");
    }

    for (const stage of DEFAULT_STAGE_ORDER) {
      this.runStage(stage, world, dt);
    }
  }

  public getCompiledOrder(stage: Stage): string[] {
    const list = this.compiledStages.get(stage);
    return list ? list.map((s) => s.name) : [];
  }
}
