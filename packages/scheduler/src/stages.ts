/**
 * Standard execution stages for Flux Engine systems.
 */
export enum Stage {
  Startup = "Startup",
  PreUpdate = "PreUpdate",
  Update = "Update",
  PostUpdate = "PostUpdate",
  Render = "Render",
}

export const DEFAULT_STAGE_ORDER: Stage[] = [
  Stage.PreUpdate,
  Stage.Update,
  Stage.PostUpdate,
  Stage.Render,
];
