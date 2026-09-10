/**
 * Component definitions and registry.
 * Supports both object-based components and high-throughput SoA numeric columns.
 */

export interface ComponentType<T = any> {
  readonly id: number;
  readonly name: string;
  create(initial?: Partial<T>): T;
}

let nextComponentId = 0;

/**
 * Define a typed component.
 */
export function defineComponent<T extends object>(
  name: string,
  factory?: () => T
): ComponentType<T> {
  const id = nextComponentId++;
  return {
    id,
    name,
    create(initial?: Partial<T>): T {
      const base = factory ? factory() : ({} as T);
      return initial ? Object.assign(base, initial) : base;
    },
  };
}

/**
 * Packed numeric component schema for contiguous memory buffers.
 */
export interface PackedSchema {
  [field: string]: number; // fieldName -> default value
}

export interface PackedComponentType<S extends PackedSchema = PackedSchema> {
  readonly id: number;
  readonly name: string;
  readonly fields: string[];
  readonly stride: number;
  readonly defaultValues: Float32Array;
  readonly isPacked: true;
}

export function definePackedComponent<S extends PackedSchema>(
  name: string,
  schema: S
): PackedComponentType<S> {
  const id = nextComponentId++;
  const fields = Object.keys(schema);
  const stride = fields.length;
  const defaultValues = new Float32Array(stride);

  fields.forEach((key, idx) => {
    defaultValues[idx] = schema[key]!;
  });

  return {
    id,
    name,
    fields,
    stride,
    defaultValues,
    isPacked: true,
  };
}
