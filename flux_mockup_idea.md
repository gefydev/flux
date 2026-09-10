# Flux Engine ⚡

> **Write once. Run where it runs best.**

Flux es un framework/runtime de alto rendimiento para crear aplicaciones gráficas y videojuegos utilizando principalmente **TypeScript/JavaScript**, aprovechando automáticamente **WebGPU, WebAssembly y ejecución nativa** según el tipo de trabajo.

El objetivo no es hacer que JavaScript mágicamente sea más rápido.

El objetivo es hacer que el desarrollador **no tenga que preocuparse constantemente por dónde debe ejecutarse cada cosa**.

Flux intenta convertir esto:

```text
                    TypeScript
                         │
             ┌───────────┼───────────┐
             │           │           │
             ▼           ▼           ▼
            JS          WASM       WebGPU
             │           │           │
             └───────────┼───────────┘
                         ▼
                      Hardware
```

en una abstracción coherente.

El desarrollador escribe sistemas y declara sus necesidades. Flux se encarga, cuando es posible, de elegir el backend adecuado.

---

# 1. Filosofía

## 1.1. JavaScript no debe ser el enemigo

Flux parte de una premisa sencilla:

> **JavaScript es excelente para expresar lógica.**

Es flexible, productivo, tiene un ecosistema gigantesco y permite iterar extremadamente rápido.

El problema aparece cuando intentamos utilizarlo para absolutamente todo.

Por ejemplo:

```text
Gameplay              → JS/TS
UI                    → JS/TS
Networking             → JS/TS
Scripting              → JS/TS

ECS                    → WASM
Physics                → WASM
Pathfinding            → WASM
Animation              → WASM

Rendering              → WebGPU
Particles              → WebGPU
Culling                → WebGPU
Post-processing        → WebGPU
Simulation             → WebGPU
```

Flux no quiere reemplazar JavaScript.

Quiere **sacarle de encima las cosas para las que no es la herramienta ideal**.

---

# 2. La regla principal

Flux sigue una regla fundamental:

> **Todo debe poder funcionar primero en JavaScript.**

WASM y GPU son aceleradores, no requisitos conceptuales.

Esto permite:

```text
Principiante
    ↓
Todo en TypeScript
    ↓
Profiler detecta cuello de botella
    ↓
Flux recomienda WASM
    ↓
Sistema cambia de backend
    ↓
Más adelante
    ↓
GPU Compute si corresponde
```

Un desarrollador no debería tener que aprender Rust, C++, WASM, SPIR-V y shaders para crear su primer juego.

Pero alguien que sí conoce esas tecnologías debería poder utilizarlas al máximo.

---

# 3. Progressive Performance

Flux debería tener una progresión natural.

## Nivel 1: JavaScript

```ts
const movement = defineSystem((world) => {
    for (const entity of world.query(Position, Velocity)) {
        entity.position.x += entity.velocity.x
    }
})
```

Funciona.

No hay que saber nada de WASM.

---

## Nivel 2: Backend automático

```ts
const movement = defineSystem({
    backend: "auto",

    update(world) {
        // lógica
    }
})
```

Flux puede decidir:

```text
JS
 ↓
WASM
 ↓
GPU
```

según las características del sistema.

---

## Nivel 3: Backend explícito

```ts
defineSystem({
    backend: "wasm",

    update(world) {
        // ...
    }
})
```

o:

```ts
defineSystem({
    backend: "gpu",

    update(world) {
        // ...
    }
})
```

---

## Nivel 4: Control absoluto

Un desarrollador avanzado puede proporcionar:

```text
Custom WASM module
Custom WebGPU shader
Custom native plugin
Custom allocator
Custom renderer
Custom physics backend
```

Flux nunca debería impedirle bajar de nivel.

---

# 4. Arquitectura general

La arquitectura conceptual sería:

```text
┌─────────────────────────────────────────────┐
│                 APPLICATION                 │
│                                             │
│              TypeScript / JS                │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                FLUX ENGINE                  │
│                                             │
│  ECS │ Scene │ Assets │ Audio │ Networking  │
│                                             │
│              Scheduler                     │
└───────────────┬─────────────┬───────────────┘
                │             │
                ▼             ▼
        ┌──────────────┐ ┌──────────────┐
        │ JS Backend   │ │ WASM Backend │
        └──────────────┘ └──────┬───────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │ GPU Backend  │
                         │   WebGPU     │
                         └──────┬───────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ Resource Management  │
                    └──────────┬───────────┘
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
                    RAM                 VRAM
                     │                   │
                     └─────────┬─────────┘
                               ▼
                           Hardware
```

---

# 5. Core

`@flux/core`

Es la base de todo.

Responsabilidades aproximadas:

- lifecycle
- application state
- dependency management
- scheduling
- events
- timing
- profiling
- capabilities
- memory/resource abstractions
- backend registration

El Core no debería saber demasiado sobre rendering.

Tampoco debería depender obligatoriamente de WASM.

Ni siquiera debería asumir que Flux se está utilizando para un videojuego.

---

# 6. Runtime

`@flux/runtime`

El Runtime sería el corazón de ejecución.

Se ocuparía de:

```text
Initialize
     ↓
Discover capabilities
     ↓
Initialize backends
     ↓
Build execution graph
     ↓
Run systems
     ↓
Synchronize
     ↓
Render
     ↓
Present
```

Ejemplo conceptual:

```ts
const app = new Flux.Application()

app.use(Rendering)
app.use(Physics)
app.use(Audio)
app.use(Input)

app.start()
```

Internamente:

```text
Application
    │
    ├── Scheduler
    ├── Renderer
    ├── AssetManager
    ├── AudioManager
    ├── InputManager
    └── NetworkManager
```

---

# 7. Scheduler

Este sería uno de los componentes más importantes de Flux.

## Objetivo

Determinar:

> **qué ejecutar, cuándo ejecutarlo y dónde ejecutarlo.**

Por ejemplo:

```text
Physics
   │
   ├── depends on → Transform
   │
   └── produces → Velocity
```

Después:

```text
Animation
   │
   └── depends on → Transform
```

Y:

```text
Renderer
   │
   └── consumes → Transform + Mesh + Material
```

Flux puede construir un grafo:

```text
Input
  │
  ▼
Gameplay
  │
  ▼
Physics
  │
  ▼
Animation
  │
  ▼
Culling
  │
  ▼
Rendering
```

Pero sistemas independientes pueden ejecutarse en paralelo.

---

# 8. Scheduler heterogéneo

El Scheduler no solamente decide el orden.

También puede decidir el backend.

Por ejemplo:

```text
Pathfinding
    ↓
CPU-heavy
    ↓
WASM

Particle Simulation
    ↓
massively parallel
    ↓
GPU

UI
    ↓
event-driven
    ↓
JS
```

El resultado sería algo como:

```text
                Scheduler
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
      JS           WASM         GPU
       │            │            │
    Gameplay      Physics      Particles
    UI             AI          Culling
    Events         ECS         Simulation
```

---

# 9. `backend: "auto"`

La API idealmente permitiría:

```ts
defineSystem({
    backend: "auto",

    update(context) {
        // ...
    }
})
```

Flux podría analizar:

- cantidad de entidades
- frecuencia de ejecución
- cantidad de datos
- tipos de datos
- dependencias
- costo histórico
- transferencias JS ↔ WASM
- disponibilidad de GPU features
- disponibilidad de workers
- latencia requerida

Y decidir.

---

# 10. El profiler como parte del engine

El profiler no debería limitarse a mostrar:

```text
Physics: 11.2ms
```

Debería interpretar.

Por ejemplo:

```text
Physics
11.2 ms/frame

Potential optimization:
WASM backend may reduce CPU time.

Estimated:
11.2ms → 4.7-6.1ms

Reason:
Large contiguous numeric workload.
Low JS object interaction.
High iteration count.
```

Esto convertiría al profiler en una herramienta de optimización activa.

---

# 11. JavaScript Backend

`@flux/js`

Es el backend universal.

Todo sistema debería poder ejecutarse acá.

Ventajas:

- debugging sencillo
- desarrollo rápido
- hot reload
- acceso directo a APIs JS
- cero compilación
- excelente para lógica de alto nivel

Desventajas:

- overhead de runtime
- garbage collection
- estructuras dinámicas
- peor comportamiento para determinados workloads masivos

Flux no intenta eliminarlo.

Lo utiliza donde corresponde.

---

# 12. WASM Backend

`@flux/wasm`

WASM se utiliza para workloads CPU-intensive.

Candidatos:

```text
Physics
AI
Pathfinding
ECS iteration
Animation
Compression
Decompression
Procedural generation
Navigation
Geometry processing
Audio DSP
```

La arquitectura debería permitir módulos:

```text
WASM Backend
     │
     ├── Physics
     ├── AI
     ├── Compression
     ├── Animation
     └── Custom
```

---

# 13. WASM como adapter

El desarrollador no debería tener que escribir WASM.

Por ejemplo:

```ts
physics.use("auto")
```

Flux podría tener:

```text
JSPhysics
WASMPhysics
NativePhysics
```

con una interfaz común:

```ts
interface PhysicsBackend {
    createBody(...)
    destroyBody(...)
    simulate(...)
    sync(...)
}
```

Así:

```ts
physics.backend = "auto"
```

puede seleccionar:

```text
WASMPhysics
```

cuando exista.

---

# 14. Evitar el problema JS ↔ WASM

Un gran error sería hacer esto:

```text
JS
 ↓
WASM
 ↓
JS
 ↓
WASM
 ↓
JS
 ↓
WASM
```

cada frame.

El costo de las fronteras puede destruir el beneficio.

Flux debería favorecer:

```text
JS
 │
 │ batch
 ▼
WASM
 │
 │ procesa miles/millones
 ▼
JS
```

Idealmente:

```text
Shared memory
TypedArrays
Struct-of-Arrays
Linear memory
```

cuando las capacidades disponibles lo permitan.

---

# 15. GPU Backend

`@flux/webgpu`

La GPU no debería ser solamente el renderer.

WebGPU también puede funcionar como plataforma de compute.

Ejemplos:

```text
Particles
Boids
Fluid simulation
Culling
Skinning
Animation
Terrain generation
Procedural systems
Post-processing
Physics
AI workloads
```

---

# 16. Rendering Pipeline

Flux debería separar:

```text
Scene
 ↓
Visibility
 ↓
Culling
 ↓
Sorting
 ↓
GPU submission
 ↓
Rasterization
 ↓
Lighting
 ↓
Post-processing
 ↓
Present
```

El renderer no debería recorrer objetos JS uno por uno siempre.

Idealmente:

```text
Scene data
    ↓
GPU-friendly buffers
    ↓
Indirect rendering
    ↓
GPU
```

La filosofía sería:

> **No hacer en CPU lo que la GPU puede hacer masivamente.**

---

# 17. GPU-driven rendering

Una arquitectura avanzada podría utilizar:

```text
CPU
 │
 └── high-level scene management
          │
          ▼
       GPU buffers
          │
          ▼
      Compute shaders
          │
     ┌────┴────┐
     ▼         ▼
   Culling   LOD
     │         │
     └────┬────┘
          ▼
    Indirect draw
```

Esto reduce trabajo del CPU.

Especialmente importante para escenas con:

```text
100k+
1M+
10M+
```

de elementos potencialmente visibles.

---

# 18. Resource Manager

Uno de los componentes fundamentales de Flux.

`@flux/resources`

Debe abstraer:

```text
SSD
 ↓
Compressed Asset
 ↓
RAM
 ↓
Decoded Asset
 ↓
VRAM
 ↓
GPU Resource
```

El desarrollador debería poder hacer:

```ts
const texture = assets.load("forest/albedo.ktx2")
```

sin tener que administrar manualmente cada copia.

---

# 19. Streaming de assets

Flux debería soportar streaming automático.

Ejemplo:

```text
Jugador se acerca
       ↓
Asset Manager detecta necesidad
       ↓
SSD read
       ↓
Decompression
       ↓
RAM staging
       ↓
VRAM upload
       ↓
GPU resource
```

Cuando deja de ser necesario:

```text
VRAM
 ↓
eviction
 ↓
resource released
```

No necesariamente se debe eliminar inmediatamente de RAM.

Flux puede mantener un cache.

---

# 20. Memory tiers

Flux podría pensar en niveles:

```text
Tier 0
CPU registers/cache

Tier 1
RAM

Tier 2
VRAM

Tier 3
SSD
```

Cada recurso tendría una política.

Por ejemplo:

```text
Texture A
VRAM: resident
RAM: cached
SSD: source

Texture B
VRAM: resident
RAM: evicted
SSD: source

Texture C
VRAM: not resident
RAM: resident
SSD: source
```

El Resource Manager decide.

---

# 21. Texturas

Flux debería favorecer formatos comprimidos para GPU.

Por ejemplo:

```text
Source
PNG/TGA/EXR
     ↓
Asset pipeline
     ↓
GPU compressed format
     ↓
VRAM
```

No tiene sentido cargar una textura gigantesca sin compresión si el hardware permite una representación más eficiente.

También debería soportar:

```text
Mipmaps
Virtual textures
Texture streaming
LOD
Sparse resources
```

cuando las capacidades del dispositivo lo permitan.

---

# 22. Asset pipeline

`@flux/assets`

Durante desarrollo:

```text
assets/
├── textures/
├── meshes/
├── materials/
├── audio/
└── animations/
```

Flux podría procesarlos:

```text
Source
 ↓
Validation
 ↓
Optimization
 ↓
Compression
 ↓
Metadata
 ↓
Build artifact
```

Por ejemplo:

```text
forest.png
     ↓
forest.ktx2
```

o:

```text
character.glb
     ↓
optimized mesh
     ↓
compressed buffers
     ↓
LOD chain
```

---

# 23. ECS

`@flux/ecs`

Flux debería utilizar una arquitectura orientada a datos.

En lugar de:

```ts
class Enemy {
    position
    velocity
    health
    mesh
    ai
}
```

preferir:

```text
Position[]
Velocity[]
Health[]
Mesh[]
AI[]
```

Esto permite:

```text
CPU cache friendliness
WASM processing
GPU upload
SIMD
batch processing
```

---

# 24. SoA vs AoS

Para workloads intensivos, Flux debería favorecer:

```text
Structure of Arrays
```

en lugar de:

```text
Array of Structures
```

Ejemplo:

```text
positions.x[]
positions.y[]
positions.z[]

velocities.x[]
velocities.y[]
velocities.z[]
```

Esto es mucho más amigable para procesamiento masivo.

---

# 25. Data-oriented design

La filosofía general del ECS sería:

> **Los datos pertenecen a los sistemas, no al revés.**

Esto ayuda a:

- WASM
- SIMD
- multithreading
- GPU compute
- cache locality
- batching

---

# 26. Workers

`@flux/workers`

Los trabajos que no necesitan bloquear el thread principal podrían ejecutarse en workers.

Ejemplo:

```text
Main Thread
    │
    ├── Rendering
    ├── Input
    └── Gameplay
          │
          ├── Worker → Pathfinding
          ├── Worker → Asset decoding
          └── Worker → AI
```

WASM podría ejecutarse dentro de workers cuando sea conveniente.

---

# 27. Threads

Flux debería diseñarse pensando desde el principio en paralelismo.

No:

```text
everything → main thread
```

sino:

```text
Main
 │
 ├── Render
 ├── Gameplay
 │
 ├── Worker 1
 ├── Worker 2
 ├── Worker 3
 └── Worker 4
```

La cantidad y distribución dependerían del hardware y del runtime.

---

# 28. Networking

`@flux/network`

La capa de networking debería ser independiente del renderer.

Podría ofrecer:

```text
Client
Server
WebSocket
WebTransport
UDP/native transport
```

cuando el target lo permita.

El ECS podría integrarse con networking mediante snapshots:

```text
World
 ↓
Replication
 ↓
Delta compression
 ↓
Network
```

---

# 29. Audio

`@flux/audio`

Arquitectura:

```text
Audio Source
     ↓
Mixer
     ↓
DSP
     ↓
Output
```

Los workloads DSP pesados podrían utilizar WASM.

Ejemplos:

```text
Reverb
Spatialization
Filtering
Mixing
Procedural audio
```

---

# 30. Physics

`@flux/physics`

La API debería abstraer el backend:

```ts
physics.backend = "auto"
```

Posibles implementaciones:

```text
JS
WASM
Native
GPU
```

La implementación inicial probablemente debería ser WASM.

Flux no necesita inventar un motor de física desde cero para demostrar su arquitectura.

---

# 31. Tauri

`@flux/platform-tauri`

Tauri funcionaría como **shell de escritorio**.

No sería el engine.

Arquitectura:

```text
Flux
 │
 └── Platform
       │
       ├── Browser
       ├── Tauri
       ├── Electron
       └── Native
```

Esto permite cambiar la tecnología de empaquetado sin tocar el código del juego.

---

# 32. Por qué Tauri

Tauri utiliza el WebView del sistema en lugar de empaquetar una instancia completa de Chromium dentro de cada aplicación.

En términos conceptuales:

```text
Electron

Game
 └── Chromium
      └── App


Tauri

Game
 └── System WebView
```

Esto puede reducir considerablemente el tamaño del paquete.

Pero hay una consecuencia:

```text
Windows → WebView2
macOS   → WKWebView
Linux   → WebKitGTK
```

Por lo tanto Flux necesita una capa de capacidades.

---

# 33. Capability system

Nunca deberíamos asumir:

```ts
if (webgpu) {
    // everything works
}
```

Debería existir algo parecido a:

```ts
capabilities.webgpu
capabilities.compute
capabilities.timestampQueries
capabilities.float32Filtering
capabilities.compressedTextures
capabilities.sharedMemory
capabilities.workers
```

Y:

```ts
if (capabilities.compressedTextures.bc) {
    // BC
} else if (capabilities.compressedTextures.astc) {
    // ASTC
} else {
    // fallback
}
```

---

# 34. Electron como fallback

Aunque Tauri sea el target principal, Electron podría seguir existiendo:

```text
Flux
 ├── Tauri
 ├── Electron
 ├── Browser
 └── Native
```

Esto tiene una ventaja importante.

Electron permite una versión de Chromium controlada por la aplicación.

Por lo tanto:

```text
Tauri
→ menor footprint
→ system WebView
→ más variabilidad

Electron
→ mayor footprint
→ bundled Chromium
→ entorno más predecible
```

El desarrollador puede elegir.

---

# 35. Browser target

Flux también debería funcionar directamente en navegador.

Por ejemplo:

```bash
flux dev
```

puede abrir:

```text
localhost
```

y ejecutar:

```text
TypeScript
+
WebGPU
+
WASM
```

Sin Tauri.

Esto permite:

```text
Development
    ↓
Browser

Production
    ↓
Tauri
```

---

# 36. Build system

`@flux/build`

Una aplicación debería poder tener:

```text
flux.config.ts
```

Ejemplo conceptual:

```ts
export default defineConfig({
    name: "MyGame",

    targets: [
        "windows",
        "linux",
        "macos",
        "web"
    ]
})
```

Después:

```bash
flux dev
flux build
flux build --target windows
flux build --target linux
flux build --target macos
flux build --target web
```

---

# 37. Dev server

El modo desarrollo debería proporcionar:

```text
Hot reload
Asset watching
TypeScript compilation
WASM compilation
Shader validation
WebGPU diagnostics
Profiler
Network inspection
ECS inspection
```

Idealmente:

```bash
flux dev
```

y listo.

---

# 38. DevTools

`@flux/devtools`

Una aplicación gráfica podría mostrar:

```text
FRAME: 8.31ms

CPU
├── Gameplay       1.2ms
├── Physics        0.8ms
├── Animation      0.6ms
└── Other          0.4ms

WASM
├── Physics        0.8ms
└── AI             1.1ms

GPU
├── Shadows        1.4ms
├── Lighting       1.7ms
├── Post FX        0.7ms
└── Particles      0.5ms
```

Y memoria:

```text
RAM
├── Assets         4.2 GB
├── Runtime        1.1 GB
├── WASM           220 MB
└── Cache          800 MB

VRAM
├── Textures       6.4 GB
├── Geometry       2.1 GB
├── Buffers        1.2 GB
└── Render targets 1.8 GB
```

---

# 39. Automatic optimization

Flux debería aprender del runtime.

Ejemplo:

```text
System: Navigation

Average:
7.8ms

Backend:
JS

Suggested:
WASM

Reason:
98% numeric processing
1.2M iterations/frame
minimal object interaction
```

El desarrollador puede aceptar:

```text
[Move to WASM]
```

y Flux genera/configura el adapter.

---

# 40. Pero no magia

Una regla fundamental:

> **Flux no debe prometer compilar cualquier JavaScript arbitrario a WASM mágicamente.**

JavaScript puede hacer cosas extremadamente dinámicas:

```ts
obj[randomKey]()
```

o:

```ts
const x = someObjectFromAnywhere()
```

No existe una traducción universal eficiente de eso a WASM.

Por eso Flux debería ofrecer:

```text
Typed systems
Typed components
Data-oriented APIs
Declarative workloads
```

para que pueda analizar y optimizar.

---

# 41. Typed data

Por ejemplo:

```ts
component Position {
    x: f32
    y: f32
    z: f32
}
```

Eso es muchísimo más fácil de convertir a una representación eficiente que:

```ts
const entity = {
    position: {
        x: "banana"
    }
}
```

La libertad total de JS puede seguir existiendo.

Pero los sistemas optimizables deberían utilizar un modelo más estricto.

---

# 42. Compilation model

Una posible arquitectura:

```text
TypeScript
     │
     ▼
Flux IR
     │
 ┌───┼────┐
 ▼   ▼    ▼
JS  WASM  GPU
```

Flux podría crear una representación intermedia de determinados sistemas.

Por ejemplo:

```text
Flux IR
 ↓
JavaScript backend
 ↓
WASM backend
 ↓
GPU backend
```

Esto permitiría que la API de alto nivel no dependa directamente de una implementación.

---

# 43. Flux IR

El IR podría describir:

```text
Inputs
Outputs
Dependencies
Operations
Data types
Memory requirements
Execution constraints
```

Ejemplo conceptual:

```text
System: UpdateVelocity

Inputs:
Position<f32x3>
Velocity<f32x3>

Operations:
add
multiply

Output:
Position<f32x3>

Parallel:
yes
```

Flux podría inferir:

```text
WASM suitable
GPU suitable
```

---

# 44. Compute graphs

Para sistemas adecuados, Flux podría representar:

```text
Input
 ↓
Transform
 ↓
Physics
 ↓
Animation
 ↓
Culling
```

como un grafo.

Luego analizar:

```text
CPU?
WASM?
GPU?
Parallel?
Sequential?
```

---

# 45. Resource lifetime

Flux debería saber cuándo un recurso está siendo utilizado.

Por ejemplo:

```text
Texture A
 ├── Material 1
 ├── Material 2
 └── Particle System
```

Mientras exista alguna referencia:

```text
resident
```

Cuando ninguna exista:

```text
candidate for eviction
```

Esto evitaría liberar recursos todavía necesarios.

---

# 46. VRAM management

El engine debería mantener un presupuesto:

```text
VRAM budget = 8 GB
```

Y saber:

```text
Used      = 6.7 GB
Reserved  = 0.5 GB
Available = 0.8 GB
```

Cuando la memoria se acerca al límite:

```text
Evict unused textures
↓
Reduce mip level
↓
Unload distant assets
↓
Reduce cache
```

No esperar a que el driver empiece a sufrir.

---

# 47. Quality scaling

Flux podría implementar escalado automático.

Por ejemplo:

```text
GPU memory pressure
        ↓
Texture mip reduction
        ↓
Shadow resolution
        ↓
Particle count
        ↓
LOD
```

El juego podría declarar:

```ts
quality.memory = "adaptive"
```

---

# 48. LOD system

Los objetos podrían tener:

```text
LOD 0
100% geometry

LOD 1
60%

LOD 2
30%

LOD 3
10%

LOD 4
billboard
```

Flux decide según:

```text
distance
screen size
GPU load
memory pressure
```

---

# 49. Virtual assets

Para mundos enormes:

```text
World
 ├── Region A
 ├── Region B
 ├── Region C
 └── Region D
```

El Resource Manager podría cargar solamente:

```text
Current region
+
Nearby regions
```

Y mantener:

```text
Low-res representation
```

de regiones lejanas.

---

# 50. Rendering abstraction

Flux no debería exponer únicamente:

```ts
drawMesh()
```

porque eso empuja al usuario hacia un renderer demasiado ingenuo.

La API debería ser de alto nivel:

```ts
scene.add(mesh)
```

mientras internamente se intenta llegar a:

```text
GPU buffers
bind groups
indirect draws
render bundles
compute passes
```

cuando corresponda.

---

# 51. Materials

Los materiales podrían ser declarativos:

```ts
material({
    baseColor: texture,
    metallic: 0.8,
    roughness: 0.25
})
```

Flux genera/selecciona shaders apropiados.

Un usuario avanzado puede escribir:

```wgsl
@fragment
fn fragmentMain(...) -> ...
```

y tomar control completo.

---

# 52. Shader system

`@flux/shaders`

Debería manejar:

```text
WGSL
Shader compilation
Reflection
Pipeline caching
Variants
Defines
Material specialization
Hot reload
```

Y evitar recompilar innecesariamente.

---

# 53. Pipeline cache

Los pipelines GPU pueden ser costosos.

Flux debería almacenar:

```text
Material
+
Shader
+
Vertex layout
+
Render state
```

como una key.

Después:

```text
lookup
 ↓
existing pipeline
```

en lugar de reconstruirlo constantemente.

---

# 54. Asset cache

El mismo principio debería existir para assets.

```text
Asset hash
     ↓
Cache
     ↓
Already processed?
     │
   yes → reuse
   no  → process
```

Esto acelera builds.

---

# 55. Packaging

Un proyecto podría producir:

```text
dist/
├── windows/
├── linux/
├── macos/
└── web/
```

Cada target contiene únicamente lo necesario.

El objetivo es evitar:

```text
Game
+
entire development environment
+
unused assets
+
unused backends
```

---

# 56. Tree shaking

Flux debería estar diseñado para eliminar código no utilizado.

Si un juego no usa:

```text
Audio
Networking
Physics
VR
```

idealmente esos módulos no deberían terminar en el build final.

---

# 57. Plugins

Arquitectura:

```text
Flux
 ├── Core
 ├── Renderer
 ├── Physics
 ├── Audio
 ├── Networking
 ├── AI
 └── Custom
```

Cada módulo debería poder registrarse como plugin.

Ejemplo:

```ts
app.use(PhysicsPlugin)
app.use(AudioPlugin)
```

---

# 58. Native plugins

Aunque Flux sea principalmente web/JS/WASM, debería existir una ruta para native.

```text
Flux
   │
   ├── JS
   ├── WASM
   ├── WebGPU
   └── Native
```

Esto sería especialmente útil para:

```text
filesystem
platform APIs
specialized hardware
low-level networking
native audio
native GPU integrations
```

---

# 59. Rust/Tauri bridge

Cuando se utiliza Tauri:

```text
TypeScript
     │
     ▼
Flux Runtime
     │
     ▼
Tauri
     │
     ▼
Rust
     │
     ▼
Operating System
```

El bridge debería utilizarse solamente cuando tenga sentido.

No conviene mandar cada operación pequeña:

```text
JS → Rust → JS
```

constantemente.

Preferir:

```text
JS
 ↓
large batch
 ↓
Rust
 ↓
large result
 ↓
JS
```

---

# 60. Plataforma

`@flux/platform`

API abstracta:

```ts
platform.window
platform.filesystem
platform.clipboard
platform.input
platform.storage
platform.network
platform.process
```

Implementaciones:

```text
BrowserPlatform
TauriPlatform
ElectronPlatform
NativePlatform
```

---

# 61. Input

Unificar:

```text
Keyboard
Mouse
Touch
Gamepad
Controller
VR
```

en una API común.

Ejemplo:

```ts
input.action("jump")
```

en lugar de:

```ts
if (Keyboard.isPressed("Space"))
```

Esto permite remapping.

---

# 62. Save system

Una abstracción:

```ts
await storage.save("player", data)
```

Backend:

```text
Browser → IndexedDB
Tauri   → filesystem
Electron → filesystem
Native  → filesystem
```

---

# 63. Debugging

Flux debería ofrecer debugging consistente entre backends.

El desarrollador debería poder ver:

```text
JS stack
WASM stack
GPU pass
resource lifetime
ECS system
worker activity
```

en una misma herramienta.

---

# 64. Error handling

Los errores deberían explicar la capa responsable.

No:

```text
GPU Error
```

sino:

```text
Failed to create texture.

Asset:
characters/player/albedo.ktx2

Reason:
BC7 texture compression unavailable.

Fallback:
RGBA8

Estimated VRAM impact:
+142 MB
```

---

# 65. Compatibility

Flux debería tener niveles:

```text
Flux Basic
Flux Standard
Flux Advanced
Flux Experimental
```

Por ejemplo:

```text
Basic
→ WebGPU básico
→ WASM
→ JS

Advanced
→ compute
→ compressed textures
→ indirect rendering
→ advanced features
```

Esto permite degradación elegante.

---

# 66. Fallback philosophy

Nunca asumir:

```text
feature exists
```

Siempre:

```text
feature exists?
   │
   ├── yes → optimized path
   │
   └── no  → fallback
```

Ejemplo:

```text
GPU Compute
 ↓ unavailable
WASM
 ↓ unavailable
Worker JS
 ↓
JS
```

---

# 67. Rendering fallback

La prioridad podría ser:

```text
WebGPU
   ↓
WebGL2
   ↓
Canvas
```

aunque el objetivo de Flux para aplicaciones gráficas pesadas sería claramente WebGPU.

WebGL sería principalmente compatibilidad.

---

# 68. Mobile

Tauri también permite targets móviles, pero Flux debería tratarlos como una plataforma con capacidades distintas.

No asumir:

```text
desktop GPU == mobile GPU
```

Mobile implica:

```text
thermal constraints
memory limits
battery
GPU bandwidth
different texture formats
```

El Quality Manager debería poder adaptarse.

---

# 69. Editor

Eventualmente:

```text
Flux Editor
```

podría proporcionar:

```text
Scene editor
Entity inspector
Material editor
Shader editor
Asset browser
Profiler
World editor
Animation tools
```

Pero esto debería venir después del Runtime.

Primero:

> **hacer que Flux ejecute cosas bien.**

Después:

> **hacer que Flux sea agradable de usar.**

---

# 70. CLI

La CLI podría ser:

```bash
flux create
flux dev
flux build
flux test
flux profile
flux inspect
flux doctor
flux add
flux remove
```

`flux doctor` podría detectar problemas:

```text
WebGPU             ✓
WASM               ✓
Threads            ✓
Tauri              ✓
Compressed textures ✓
GPU memory         8 GB
```

---

# 71. Project structure

Un proyecto típico:

```text
my-game/
│
├── assets/
│   ├── textures/
│   ├── meshes/
│   ├── audio/
│   └── shaders/
│
├── src/
│   ├── game/
│   ├── systems/
│   ├── components/
│   ├── scenes/
│   └── main.ts
│
├── flux.config.ts
├── package.json
└── tsconfig.json
```

---

# 72. API philosophy

La API debería ser:

```text
simple at the top
powerful underneath
```

Principiante:

```ts
const game = new Flux.Game()

game.load("level.glb")

game.start()
```

Avanzado:

```ts
renderer.configure({
    bindless: true,
    indirectRendering: true,
    pipelineCache: true
})
```

Expert:

```ts
renderer.registerBackend(customBackend)
```

---

# 73. No esconder el hardware

Flux debería abstraer complejidad, pero no ocultar información útil.

Por ejemplo:

```ts
device.gpu.memory
device.gpu.features
device.cpu.cores
device.runtime.wasm
```

El usuario avanzado debe poder inspeccionar.

---

# 74. Observability

El engine debería saber qué está ocurriendo.

Métricas:

```text
CPU time
GPU time
WASM time
JS time
worker utilization
RAM
VRAM
asset streaming
draw calls
triangles
shader compilation
pipeline creation
GC pauses
```

Esto es esencial para que `backend: "auto"` sea algo serio y no una caja negra.

---

# 75. Performance budgets

Los proyectos podrían definir presupuestos:

```ts
performance({
    frameBudget: 8.33,
    memoryBudget: 12 * GB,
    vramBudget: 10 * GB
})
```

Flux alerta:

```text
⚠ Physics exceeded CPU budget.

Budget: 2ms
Actual: 4.7ms
```

---

# 76. Frame scheduling

Para 120 Hz:

```text
8.33ms/frame
```

Para 60 Hz:

```text
16.67ms/frame
```

Flux debería conocer el presupuesto y distribuir tareas.

Por ejemplo:

```text
Frame 1
Physics
Rendering

Frame 2
AI batch 1

Frame 3
AI batch 2
```

cuando una tarea no necesite completarse en un solo frame.

---

# 77. Async everything

Las operaciones pesadas deberían ser asíncronas cuando sea posible:

```ts
const texture = await assets.load(...)
```

```ts
const navmesh = await navigation.build(...)
```

```ts
const wasm = await wasm.load(...)
```

Evitar bloquear el thread principal.

---

# 78. Garbage collection

Flux no puede eliminar el GC de JavaScript.

Pero sí puede minimizar su impacto.

Estrategias:

```text
Object pools
TypedArrays
ECS storage
Reusable buffers
Avoid temporary objects
Batch allocations
```

La filosofía sería:

> **JavaScript para lógica, estructuras predecibles para workloads intensivos.**

---

# 79. Memory ownership

Flux debería intentar que cada recurso tenga ownership claro.

```text
AssetManager owns asset
Renderer owns GPU resource
Scene owns reference
```

Cuando desaparecen las referencias:

```text
resource → release candidate
```

Esto es especialmente importante porque JavaScript no tiene control determinista de memoria.

---

# 80. Garbage collection vs resources

Un objeto JS pequeño:

```text
TextureHandle
```

puede ser recolectado.

Pero eso no significa necesariamente:

```text
VRAM resource
```

debe liberarse inmediatamente.

Flux debe separar:

```text
JS object lifetime
```

de:

```text
GPU resource lifetime
```

---

# 81. Handles

En vez de pasar objetos gigantes:

```ts
Texture
```

Flux podría utilizar handles:

```ts
TextureHandle
```

El handle puede ser pequeño:

```text
ID
generation
flags
```

mientras el recurso real vive en:

```text
Resource Manager
```

---

# 82. Generational handles

Para evitar referencias inválidas:

```text
TextureHandle
ID = 42
Generation = 7
```

Si el recurso se destruye:

```text
Generation = 8
```

Un handle viejo:

```text
42:7
```

queda inválido.

Esto es muy útil para engines de alto rendimiento.

---

# 83. Asset references

En vez de:

```ts
texture = hugeObject
```

usar:

```ts
texture = assets.ref("forest/albedo")
```

Flux decide cuándo materializarlo.

---

# 84. Build-time optimization

Parte de la optimización puede ocurrir antes de ejecutar.

```text
Source
 ↓
Asset analysis
 ↓
Dependency graph
 ↓
Compression
 ↓
Shader compilation
 ↓
WASM compilation
 ↓
Bundle
```

Cuanto más trabajo se haga durante build, menos trabajo en runtime.

---

# 85. Runtime optimization

Lo que no pueda resolverse en build:

```text
GPU capabilities
memory pressure
distance
scene visibility
dynamic workloads
```

se decide en runtime.

---

# 86. Build-time + runtime

Flux debería dividir:

```text
Build intelligence
+
Runtime intelligence
```

Ejemplo:

```text
Build:
"Esta textura soporta BC7."

Runtime:
"Este dispositivo no soporta BC7."

Resultado:

```text
Use ASTC / ETC / fallback
```

según plataforma.

---

# 87. Determinism

Para simulaciones y multiplayer, Flux debería tener modos deterministas donde sea posible.

Por ejemplo:

```text
Deterministic simulation
```

Esto es particularmente importante para:

```text
Physics
Networking
Replays
Lockstep
```

---

# 88. Replays

El ECS podría registrar inputs/events:

```text
Frame 1 → jump
Frame 2 → move
Frame 3 → attack
```

y reproducirlos.

Esto también sería útil para debugging.

---

# 89. Testing

Flux debería permitir tests de sistemas sin renderer.

Por ejemplo:

```ts
test("movement", () => {
    world.spawn({
        position: [0, 0, 0],
        velocity: [1, 0, 0]
    })

    movement.update(world)

    expect(...).toBe(...)
})
```

Esto es otra ventaja de separar:

```text
Core
Renderer
Platform
```

---

# 90. Headless mode

Muy importante.

```bash
flux test
```

debería poder ejecutar:

```text
ECS
Physics
AI
Networking
```

sin abrir una ventana.

Esto permite servidores dedicados.

---

# 91. Dedicated server

Un proyecto podría compilar:

```bash
flux build --target server
```

y obtener:

```text
No renderer
No WebGPU
No UI
No textures
```

solo:

```text
ECS
Physics
Networking
Game logic
```

Esto podría reducir muchísimo el footprint.

---

# 92. Architecture principle

Una regla central:

> **El renderer nunca debe ser el dueño del juego.**

El juego debería poder existir sin renderer.

```text
Game
 ↓
ECS
 ↓
Systems
```

y opcionalmente:

```text
Renderer
```

consume el estado.

---

# 93. Separation of concerns

```text
Flux Core
    ↓
Flux Runtime
    ↓
Flux ECS
    ↓
Flux Systems
    ↓
Flux Rendering
    ↓
Flux Platform
```

Cada capa debe poder probarse independientemente.

---

# 94. Package ecosystem

Una posible estructura:

```text
@flux/core
@flux/runtime
@flux/ecs
@flux/math
@flux/assets
@flux/resources
@flux/webgpu
@flux/wasm
@flux/physics
@flux/audio
@flux/network
@flux/input
@flux/workers
@flux/devtools
@flux/platform
@flux/platform-tauri
@flux/platform-electron
@flux/platform-browser
@flux/cli
```

---

# 95. Dependencias

La regla:

```text
Core
 ↓
minimal dependencies
```

Evitar que:

```text
@flux/core
```

termine dependiendo de:

```text
Tauri
WebGPU
Electron
React
Physics
Audio
```

El Core debe ser pequeño.

---

# 96. UI

Flux podría ser agnóstico.

Permitir:

```text
HTML/CSS
Canvas
React
Svelte
Vue
Custom UI
```

La UI no debe contaminar el renderer 3D.

---

# 97. Game logic

El usuario podría escribir:

```ts
class PlayerSystem {
    update(world, dt) {
        ...
    }
}
```

o una API funcional:

```ts
system({
    query: [Position, Velocity],

    update({ position, velocity, dt }) {
        ...
    }
})
```

La segunda forma sería más fácil de optimizar.

---

# 98. Optimizable vs dynamic systems

Flux podría distinguir:

```text
Dynamic System
```

y:

```text
Data System
```

Dynamic:

```ts
system(() => {
    console.log(...)
})
```

Data:

```ts
system({
    inputs: [Position, Velocity],
    outputs: [Position]
})
```

Los segundos son candidatos a WASM/GPU.

---

# 99. Backend selection

Un posible algoritmo conceptual:

```text
if system.requiresDOM:
    JS

else if system.requiresObjects:
    JS

else if system.isParallel:
    GPU

else if system.isNumeric && system.large:
    WASM

else:
    JS
```

Después incorporar:

```text
historical profiling
memory cost
transfer cost
device capabilities
```

---

# 100. El costo de mover datos

Flux debería tener esto muy presente.

No siempre:

```text
GPU = faster
```

porque:

```text
JS
 ↓
upload
 ↓
GPU
 ↓
download
 ↓
JS
```

puede ser peor que ejecutar todo en CPU.

La regla debería ser:

> **Mover menos datos antes de intentar mover más trabajo.**

---

# 101. Data locality

Una situación ideal:

```text
CPU data
    ↓
WASM
    ↓
stays there
```

o:

```text
GPU buffer
    ↓
Compute
    ↓
GPU rendering
```

La situación menos deseable:

```text
CPU
 ↓
GPU
 ↓
CPU
 ↓
GPU
```

cada frame.

---

# 102. GPU-resident data

Para sistemas GPU-heavy:

```text
World state
     ↓
GPU buffers
```

y después:

```text
Compute
 ↓
Culling
 ↓
Animation
 ↓
Rendering
```

sin volver constantemente a JS.

Esto podría ser una de las grandes diferencias de Flux frente a un engine JS tradicional.

---

# 103. World representation

Flux podría mantener dos representaciones:

```text
Logical World
```

para gameplay:

```text
ECS
```

y:

```text
GPU World
```

para rendering/simulation.

Un sistema de sincronización decide qué necesita subir.

---

# 104. Dirty tracking

No subir todo cada frame.

```text
Position changed?
    ↓ yes
Upload

Position unchanged?
    ↓
Do nothing
```

Con miles de entidades, esto puede ser fundamental.

---

# 105. Batching

Flux debería intentar agrupar:

```text
draw calls
resource uploads
WASM calls
worker messages
GPU commands
```

en batches.

En general:

```text
many small operations
```

son peores que:

```text
few large operations
```

---

# 106. API async

La carga de assets:

```ts
const player = await assets.load("player")
```

podría devolver un handle inmediatamente:

```ts
const player = assets.request("player")
```

y permitir:

```ts
player.status
player.progress
player.ready
```

Esto facilita streaming.

---

# 107. Streaming priorities

Los recursos podrían tener prioridades:

```text
Critical
High
Normal
Low
Background
```

Ejemplo:

```text
Player texture → Critical
Nearby NPC → High
Distant building → Low
Background music → Normal
```

---

# 108. Predictive streaming

Flux podría anticipar:

```text
Player velocity
Camera direction
Current location
World graph
```

para cargar:

```text
next region
```

antes de que sea necesaria.

---

# 109. Asset dependency graph

```text
Scene
 ├── Material
 │    ├── Texture
 │    └── Shader
 │
 └── Mesh
      └── Animation
```

Flux conoce las dependencias.

Si se carga:

```text
Scene A
```

puede descubrir automáticamente qué necesita.

---

# 110. Hot reload

Durante desarrollo:

```text
Shader changed
    ↓
recompile
    ↓
replace pipeline
```

o:

```text
Script changed
    ↓
reload module
```

sin reiniciar todo el juego cuando sea posible.

---

# 111. Error recovery

Si falla un shader:

```text
Shader error
 ↓
Fallback material
 ↓
Log detailed diagnostic
```

No debería necesariamente destruir toda la aplicación.

---

# 112. Production mode

Development:

```text
Debug
Profiler
Assertions
Hot reload
Verbose diagnostics
```

Production:

```text
Optimized
Minified
Stripped
Compressed
No devtools
```

---

# 113. Security

Si Flux ejecuta código remoto o mods, debería existir un modelo de sandbox.

Especialmente para:

```text
Mods
Scripts
Downloaded content
User-generated content
```

Nunca asumir que todo JS es confiable.

---

# 114. Modding

Eventualmente podría existir:

```text
Flux Mod API
```

con:

```text
Scripts
Assets
Entities
Systems
UI
```

pero con permisos.

---

# 115. Plugin API

Un plugin debería poder declarar:

```ts
export default definePlugin({
    name: "physics",

    dependencies: [],

    install(app) {
        ...
    }
})
```

---

# 116. Versioning

Flux debería separar:

```text
Engine API
Runtime API
Backend API
Platform API
```

para evitar que una actualización rompa todo.

---

# 117. Backwards compatibility

Una prioridad importante.

Un proyecto creado con:

```text
Flux 2
```

debería poder migrarse razonablemente a:

```text
Flux 3
```

con herramientas:

```bash
flux migrate
```

---

# 118. Open source philosophy

Flux debería ser modular y auditable.

Idealmente:

```text
Core
Runtime
ECS
WebGPU
WASM
CLI
DevTools
```

open source.

Las partes propietarias, si alguna vez existen, deberían estar claramente separadas.

---

# 119. What Flux is not

Flux no intenta ser:

```text
"JavaScript pero 1000x más rápido"
```

Tampoco:

```text
"Unreal escrito en TypeScript"
```

Ni:

```text
"Un compilador mágico de cualquier JS a GPU"
```

Ni:

```text
"Electron con WebGPU"
```

Es otra cosa.

---

# 120. What Flux actually is

Flux sería:

> **Un runtime gráfico y de ejecución heterogénea que permite construir aplicaciones de alto rendimiento desde TypeScript, delegando workloads a JavaScript, WebAssembly, workers y GPU según sus características y las capacidades del dispositivo.**

---

# 121. Arquitectura final conceptual

```text
                         APPLICATION
                              │
                         TypeScript
                              │
                              ▼
                    ┌───────────────────┐
                    │    FLUX CORE      │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │     RUNTIME       │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │     SCHEDULER     │
                    └────┬────┬────┬────┘
                         │    │    │
                ┌────────┘    │    └────────┐
                ▼             ▼             ▼
               JS            WASM          GPU
                │             │             │
                │             │          WebGPU
                │             │             │
                └─────────────┼─────────────┘
                              │
                       RESOURCE MANAGER
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                   RAM                 VRAM
                    │                   │
                    └─────────┬─────────┘
                              ▼
                           HARDWARE


                    PLATFORM ABSTRACTION
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
       Browser              Tauri              Electron
                              │
                              ▼
                             Rust
                              │
                              ▼
                              OS
```

---

# 122. Filosofía resumida

Flux debería seguir estas reglas:

### 1. JS first

Todo debería poder comenzar en JavaScript/TypeScript.

### 2. Performance when needed

WASM y GPU aparecen cuando aportan valor.

### 3. Automatic, not mandatory

`backend: "auto"` debería ser una opción poderosa, no una obligación.

### 4. Data-oriented

Los workloads pesados deben utilizar estructuras eficientes.

### 5. GPU-first rendering

El renderer debe intentar mantener la mayor cantidad posible de trabajo gráfico en GPU.

### 6. Minimize transfers

Mover datos entre JS, WASM, CPU y GPU cuesta.

### 7. Streaming by default

Los assets grandes no deberían requerir cargar el mundo entero en RAM.

### 8. Platform abstraction

Tauri, Electron, browser y native son plataformas, no el corazón del engine.

### 9. Capability-driven

Flux debe adaptarse al hardware disponible.

### 10. Progressive disclosure

Principiante:

```text
JS
```

Intermedio:

```text
JS + automatic WASM
```

Avanzado:

```text
WASM + WebGPU
```

Expert:

```text
Custom backends
```

### 11. Observable

El engine debe explicar qué está haciendo y por qué.

### 12. No magic promises

La optimización automática debe estar respaldada por datos, no por marketing.

---

# 123. La idea central

Todo Flux puede resumirse en una frase:

```text
                    YOU WRITE THE LOGIC

                           ↓

                     FLUX ANALYZES

                           ↓

              ┌────────────┼────────────┐
              ↓            ↓            ↓
             JS           WASM         GPU

              └────────────┼────────────┘
                           ↓

                       HARDWARE
```

El desarrollador piensa:

```ts
"Quiero mover 500.000 entidades."
```

No necesariamente:

```text
"¿Debería usar JS?
¿WASM?
¿SIMD?
¿Worker?
¿GPU Compute?
¿SharedArrayBuffer?
¿Cuánto cuesta transferir los datos?"
```

Flux debería encargarse de esa segunda parte.

---

# 124. El objetivo final

La ambición de Flux no debería ser:

> "hacer juegos AAA en JavaScript".

Eso es demasiado específico.

La ambición debería ser:

> **hacer que un lenguaje de alto nivel pueda controlar una arquitectura de ejecución de bajo nivel sin obligar al desarrollador a convertirse en experto en cada capa del hardware.**

Y eso permite que Flux pueda terminar siendo utilizado para:

```text
🎮 Videojuegos
🧊 Simulaciones
🌍 Mundos 3D
🧬 Visualización científica
🏗️ CAD
🤖 Simulación de robots
🎨 Herramientas 3D
📊 Visualización de datos
🥽 XR
🖥️ Aplicaciones gráficas
```

La aplicación sigue pareciendo TypeScript.

Por debajo, Flux intenta convertirla en una máquina mucho más seria.

---

# 125. Mantra

```text
JavaScript for expression.
WASM for computation.
GPU for parallelism.
Workers for concurrency.
RAM for working data.
VRAM for graphics.
SSD for persistence.
Flux for deciding where everything belongs.
```

**Flux Engine ⚡**

> Write once. Run where it runs best.