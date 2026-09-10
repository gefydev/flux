import type { ScheduledSystem } from "./scheduler.js";

/**
 * Directed Acyclic Graph (DAG) for system dependency resolution.
 */
export class ExecutionGraph {
  private nodes = new Map<string, ScheduledSystem>();
  private edges = new Map<string, Set<string>>(); // source -> targets that depend on it
  private inDegree = new Map<string, number>();

  public addNode(system: ScheduledSystem): void {
    const id = system.name;
    if (this.nodes.has(id)) {
      throw new Error(`[ExecutionGraph] System '${id}' is already registered in this graph.`);
    }
    this.nodes.set(id, system);
    this.edges.set(id, new Set());
    this.inDegree.set(id, 0);
  }

  public addEdge(fromId: string, toId: string): void {
    if (!this.nodes.has(fromId)) {
      throw new Error(`[ExecutionGraph] Source system '${fromId}' not found in graph.`);
    }
    if (!this.nodes.has(toId)) {
      throw new Error(`[ExecutionGraph] Target system '${toId}' not found in graph.`);
    }

    const targets = this.edges.get(fromId)!;
    if (!targets.has(toId)) {
      targets.add(toId);
      this.inDegree.set(toId, (this.inDegree.get(toId) ?? 0) + 1);
    }
  }

  /**
   * Performs topological sort using Kahn's algorithm.
   * Detects cycles and returns systems ordered by dependency.
   */
  public resolve(): ScheduledSystem[] {
    const inDeg = new Map(this.inDegree);
    const queue: string[] = [];

    for (const [id, deg] of inDeg.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const sorted: ScheduledSystem[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      sorted.push(this.nodes.get(currentId)!);

      const targets = this.edges.get(currentId);
      if (targets) {
        for (const targetId of targets) {
          const newDeg = inDeg.get(targetId)! - 1;
          inDeg.set(targetId, newDeg);
          if (newDeg === 0) {
            queue.push(targetId);
          }
        }
      }
    }

    if (sorted.length !== this.nodes.size) {
      const unvisited = Array.from(this.nodes.keys()).filter((k) => !sorted.some((s) => s.name === k));
      throw new Error(`[ExecutionGraph] Circular dependency detected among systems: ${unvisited.join(", ")}`);
    }

    return sorted;
  }
}
