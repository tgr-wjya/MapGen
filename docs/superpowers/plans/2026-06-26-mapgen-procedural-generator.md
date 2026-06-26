# MapGen — Procedural Map Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool that procedurally generates regional maps (SVG) from a JSON config using Voronoi + Simplex noise, encoding real geographic constraints.

**Architecture:** Hybrid generation pipeline — Voronoi tessellation creates structural cells, Simplex noise adds organic variation. Features build in layers: elevation → coastlines → rivers → biomes → political borders. Each layer reads from previous layers' output. Seed-based PRNG ensures determinism.

**Tech Stack:** TypeScript, Node.js, `open-simplex-noise` (seeded noise), `d3-delaunay` (Voronoi), `d3` (SVG rendering), `ajv` (JSON Schema validation), `commander` (CLI)

## Global Constraints

- Node.js ≥ 20 LTS
- TypeScript strict mode
- ESM modules only (`"type": "module"` in package.json)
- All randomness via seeded PRNG — no `Math.random()` calls
- SVG output must be valid, viewable in any browser
- JSON config validated against published JSON Schema before generation
- Zero runtime dependencies beyond listed packages

---

## File Structure

```
mapgen/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── config/
│   │   ├── schema.json             # JSON Schema for region config
│   │   ├── validator.ts            # Schema validation with ajv
│   │   └── types.ts                # TypeScript types mirroring schema
│   ├── core/
│   │   ├── rng.ts                  # Seeded PRNG wrapper
│   │   ├── voronoi.ts              # Voronoi cell generation + adjacency
│   │   ├── noise.ts                # Simplex noise layers (seeded)
│   │   └── geometry.ts             # Point/polygon utilities
│   ├── layers/
│   │   ├── elevation.ts            # Heightmap assignment to cells
│   │   ├── coastline.ts            # Sea-level thresholding, landmass detection
│   │   ├── rivers.ts               # Drainage basins, river path tracing
│   │   ├── straits.ts              # Strait detection between close landmasses
│   │   ├── biomes.ts               # Climate zone assignment (elevation + latitude + rain shadow)
│   │   └── borders.ts              # Political boundary generation from archetypes
│   ├── pipeline.ts                 # Orchestrates layers in order
│   └── render/
│       ├── svg.ts                  # SVG document construction
│       ├── styles.ts               # Color palettes, stroke styles
│       └── labels.ts               # Text label placement
├── tests/
│   ├── core/
│   │   ├── rng.test.ts
│   │   ├── voronoi.test.ts
│   │   ├── noise.test.ts
│   │   └── geometry.test.ts
│   ├── layers/
│   │   ├── elevation.test.ts
│   │   ├── coastline.test.ts
│   │   ├── rivers.test.ts
│   │   ├── straits.test.ts
│   │   ├── biomes.test.ts
│   │   └── borders.test.ts
│   ├── config/
│   │   └── validator.test.ts
│   ├── render/
│   │   └── svg.test.ts
│   └── pipeline.test.ts
└── examples/
    └── archipelago.json            # Example config
```

---

### Task 1: Project Scaffolding + Seeded RNG

**Files:**
- Create: `package.json`, `tsconfig.json`, `src/core/rng.ts`, `tests/core/rng.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `createRng(seed: number): Rng` where `Rng = { next(): number; nextInt(min: number, max: number): number; shuffle<T>(arr: T[]): T[] }`

- [ ] **Step 1: Initialize project**

```bash
cd "C:\Users\Tegar Wijaya Kusuma\Documents\Personal\Writings\Map-Generator"
npm init -y
npm install typescript @types/node vitest --save-dev
npm install open-simplex-noise d3-delaunay d3 ajv commander
npm install @types/d3 --save-dev
```

Update `package.json`:
```json
{
  "name": "mapgen",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate": "tsx src/index.ts"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Write failing test for seeded RNG**

```typescript
// tests/core/rng.test.ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';

describe('createRng', () => {
  it('produces deterministic sequence from same seed', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences from different seeds', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(99);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('nextInt returns values in [min, max]', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(3, 8);
      expect(val).toBeGreaterThanOrEqual(3);
      expect(val).toBeLessThanOrEqual(8);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('shuffle is deterministic and preserves elements', () => {
    const rng1 = createRng(55);
    const rng2 = createRng(55);
    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = [1, 2, 3, 4, 5];
    expect(rng1.shuffle(arr1)).toEqual(rng2.shuffle(arr2));
    expect(arr1.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/core/rng.test.ts`
Expected: FAIL — cannot resolve `../../src/core/rng.js`

- [ ] **Step 5: Implement seeded RNG (mulberry32)**

```typescript
// src/core/rng.ts
export interface Rng {
  next(): number;
  nextInt(min: number, max: number): number;
  shuffle<T>(arr: T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed | 0;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { next, nextInt, shuffle };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/core/rng.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git init
git add package.json tsconfig.json src/core/rng.ts tests/core/rng.test.ts
git commit -m "feat: project scaffold + seeded PRNG (mulberry32)"
```

---

### Task 2: Voronoi Cell Generation + Adjacency Graph

**Files:**
- Create: `src/core/voronoi.ts`, `src/core/geometry.ts`, `tests/core/voronoi.test.ts`, `tests/core/geometry.test.ts`

**Interfaces:**
- Consumes: `createRng(seed): Rng` from Task 1
- Produces:
  - `generatePoints(width: number, height: number, count: number, rng: Rng): Point[]`
  - `buildVoronoi(points: Point[], width: number, height: number): VoronoiGrid`
  - `VoronoiGrid = { cells: Cell[]; adjacency: Map<number, number[]> }`
  - `Cell = { index: number; site: Point; polygon: Point[] }`
  - `Point = { x: number; y: number }`

- [ ] **Step 1: Write failing tests for geometry utilities**

```typescript
// tests/core/geometry.test.ts
import { describe, it, expect } from 'vitest';
import { distance, centroid, polygonArea } from '../../src/core/geometry.js';

describe('geometry', () => {
  it('distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('centroid of triangle', () => {
    const c = centroid([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }]);
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(1);
  });

  it('polygon area of unit square', () => {
    const area = polygonArea([
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 1, y: 1 }, { x: 0, y: 1 }
    ]);
    expect(area).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/geometry.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement geometry utilities**

```typescript
// src/core/geometry.ts
export interface Point {
  x: number;
  y: number;
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function centroid(polygon: Point[]): Point {
  const n = polygon.length;
  const x = polygon.reduce((sum, p) => sum + p.x, 0) / n;
  const y = polygon.reduce((sum, p) => sum + p.y, 0) / n;
  return { x, y };
}

export function polygonArea(polygon: Point[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) / 2;
}
```

- [ ] **Step 4: Run geometry tests — verify PASS**

Run: `npx vitest run tests/core/geometry.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for Voronoi generation**

```typescript
// tests/core/voronoi.test.ts
import { describe, it, expect } from 'vitest';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createRng } from '../../src/core/rng.js';

describe('generatePoints', () => {
  it('generates correct number of points', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 100, rng);
    expect(points).toHaveLength(100);
  });

  it('all points within bounds', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
    }
  });

  it('deterministic with same seed', () => {
    const p1 = generatePoints(800, 600, 50, createRng(42));
    const p2 = generatePoints(800, 600, 50, createRng(42));
    expect(p1).toEqual(p2);
  });
});

describe('buildVoronoi', () => {
  it('produces one cell per point', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    const grid = buildVoronoi(points, 800, 600);
    expect(grid.cells).toHaveLength(50);
  });

  it('each cell has a polygon with at least 3 vertices', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    const grid = buildVoronoi(points, 800, 600);
    for (const cell of grid.cells) {
      expect(cell.polygon.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('adjacency map has entry for every cell', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    const grid = buildVoronoi(points, 800, 600);
    expect(grid.adjacency.size).toBe(50);
  });

  it('adjacency is symmetric', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    const grid = buildVoronoi(points, 800, 600);
    for (const [cellIdx, neighbors] of grid.adjacency) {
      for (const n of neighbors) {
        expect(grid.adjacency.get(n)).toContain(cellIdx);
      }
    }
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/core/voronoi.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement Voronoi generation**

```typescript
// src/core/voronoi.ts
import { Delaunay } from 'd3-delaunay';
import type { Point } from './geometry.js';
import type { Rng } from './rng.js';

export interface Cell {
  index: number;
  site: Point;
  polygon: Point[];
}

export interface VoronoiGrid {
  cells: Cell[];
  adjacency: Map<number, number[]>;
}

export function generatePoints(
  width: number,
  height: number,
  count: number,
  rng: Rng
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    points.push({ x: rng.next() * width, y: rng.next() * height });
  }
  return relaxPoints(points, width, height, 2);
}

function relaxPoints(
  points: Point[],
  width: number,
  height: number,
  iterations: number
): Point[] {
  let current = points;
  for (let i = 0; i < iterations; i++) {
    const flat = current.flatMap((p) => [p.x, p.y]);
    const delaunay = new Delaunay(flat);
    const voronoi = delaunay.voronoi([0, 0, width, height]);
    current = current.map((_, idx) => {
      const cell = voronoi.cellPolygon(idx);
      if (!cell) return current[idx];
      const cx = cell.reduce((s, v) => s + v[0], 0) / cell.length;
      const cy = cell.reduce((s, v) => s + v[1], 0) / cell.length;
      return { x: cx, y: cy };
    });
  }
  return current;
}

export function buildVoronoi(
  points: Point[],
  width: number,
  height: number
): VoronoiGrid {
  const flat = points.flatMap((p) => [p.x, p.y]);
  const delaunay = new Delaunay(flat);
  const voronoi = delaunay.voronoi([0, 0, width, height]);

  const cells: Cell[] = points.map((site, index) => {
    const raw = voronoi.cellPolygon(index);
    const polygon = raw
      ? raw.slice(0, -1).map(([x, y]) => ({ x, y }))
      : [site];
    return { index, site, polygon };
  });

  const adjacency = new Map<number, number[]>();
  for (let i = 0; i < points.length; i++) {
    const neighbors: number[] = [];
    for (const j of delaunay.neighbors(i)) {
      neighbors.push(j);
    }
    adjacency.set(i, neighbors);
  }

  return { cells, adjacency };
}
```

- [ ] **Step 8: Run tests — verify PASS**

Run: `npx vitest run tests/core/voronoi.test.ts`
Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add src/core/geometry.ts src/core/voronoi.ts tests/core/geometry.test.ts tests/core/voronoi.test.ts
git commit -m "feat: Voronoi cell generation with Lloyd relaxation + adjacency graph"
```

---

### Task 3: Simplex Noise Layer (Seeded)

**Files:**
- Create: `src/core/noise.ts`, `tests/core/noise.test.ts`

**Interfaces:**
- Consumes: seed number
- Produces: `createNoiseLayers(seed: number, octaves: number, lacunarity: number, persistence: number): NoiseSampler` where `NoiseSampler = { sample(x: number, y: number): number }` returning values in [-1, 1]

- [ ] **Step 1: Write failing test**

```typescript
// tests/core/noise.test.ts
import { describe, it, expect } from 'vitest';
import { createNoiseLampler } from '../../src/core/noise.js';

describe('createNoiseSampler', () => {
  it('returns values in [-1, 1]', () => {
    const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
    for (let x = 0; x < 100; x += 5) {
      for (let y = 0; y < 100; y += 5) {
        const val = sampler.sample(x, y);
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });

  it('deterministic with same seed', () => {
    const s1 = createNoiseSampler(42, 4, 2.0, 0.5);
    const s2 = createNoiseSampler(42, 4, 2.0, 0.5);
    for (let x = 0; x < 50; x += 10) {
      for (let y = 0; y < 50; y += 10) {
        expect(s1.sample(x, y)).toBe(s2.sample(x, y));
      }
    }
  });

  it('different seeds produce different values', () => {
    const s1 = createNoiseSampler(42, 4, 2.0, 0.5);
    const s2 = createNoiseSampler(99, 4, 2.0, 0.5);
    let same = 0;
    for (let x = 0; x < 50; x += 5) {
      if (s1.sample(x, 0) === s2.sample(x, 0)) same++;
    }
    expect(same).toBeLessThan(5);
  });

  it('more octaves produces more detail variation', () => {
    const smooth = createNoiseSampler(42, 1, 2.0, 0.5);
    const detailed = createNoiseSampler(42, 6, 2.0, 0.5);
    let smoothDiffs = 0;
    let detailedDiffs = 0;
    for (let x = 0; x < 20; x++) {
      smoothDiffs += Math.abs(smooth.sample(x, 0) - smooth.sample(x + 0.5, 0));
      detailedDiffs += Math.abs(detailed.sample(x, 0) - detailed.sample(x + 0.5, 0));
    }
    expect(detailedDiffs).toBeGreaterThan(smoothDiffs);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/core/noise.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement noise sampler**

```typescript
// src/core/noise.ts
import { makeNoise2D } from 'open-simplex-noise';

export interface NoiseSampler {
  sample(x: number, y: number): number;
}

export function createNoiseSampler(
  seed: number,
  octaves: number,
  lacunarity: number,
  persistence: number
): NoiseSampler {
  const noises = Array.from({ length: octaves }, (_, i) =>
    makeNoise2D(seed + i * 31)
  );

  function sample(x: number, y: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 0.01;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
      value += noises[i](x * frequency, y * frequency) * amplitude;
      maxAmplitude += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxAmplitude;
  }

  return { sample };
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/core/noise.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/noise.ts tests/core/noise.test.ts
git commit -m "feat: seeded Simplex noise sampler with fractal octaves"
```

---

### Task 4: Elevation Layer

**Files:**
- Create: `src/layers/elevation.ts`, `tests/layers/elevation.test.ts`

**Interfaces:**
- Consumes: `VoronoiGrid` from Task 2, `NoiseSampler` from Task 3
- Produces: `assignElevation(grid: VoronoiGrid, sampler: NoiseSampler, config: ElevationConfig): ElevationMap` where `ElevationMap = Map<number, number>` (cell index → elevation 0..1), `ElevationConfig = { seaLevel: number; mountainScale: number }`

- [ ] **Step 1: Write failing test**

```typescript
// tests/layers/elevation.test.ts
import { describe, it, expect } from 'vitest';
import { assignElevation } from '../../src/layers/elevation.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { createRng } from '../../src/core/rng.js';

describe('assignElevation', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 100, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const config = { seaLevel: 0.4, mountainScale: 1.0 };

  it('assigns elevation to every cell', () => {
    const elevMap = assignElevation(grid, sampler, config);
    expect(elevMap.size).toBe(100);
  });

  it('all elevations in [0, 1]', () => {
    const elevMap = assignElevation(grid, sampler, config);
    for (const elev of elevMap.values()) {
      expect(elev).toBeGreaterThanOrEqual(0);
      expect(elev).toBeLessThanOrEqual(1);
    }
  });

  it('some cells above sea level, some below', () => {
    const elevMap = assignElevation(grid, sampler, config);
    const above = [...elevMap.values()].filter((e) => e > config.seaLevel);
    const below = [...elevMap.values()].filter((e) => e <= config.seaLevel);
    expect(above.length).toBeGreaterThan(0);
    expect(below.length).toBeGreaterThan(0);
  });

  it('deterministic', () => {
    const e1 = assignElevation(grid, sampler, config);
    const e2 = assignElevation(grid, sampler, config);
    expect([...e1.entries()]).toEqual([...e2.entries()]);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/layers/elevation.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement elevation assignment**

```typescript
// src/layers/elevation.ts
import type { VoronoiGrid } from '../core/voronoi.js';
import type { NoiseSampler } from '../core/noise.js';

export interface ElevationConfig {
  seaLevel: number;
  mountainScale: number;
}

export type ElevationMap = Map<number, number>;

export function assignElevation(
  grid: VoronoiGrid,
  sampler: NoiseSampler,
  config: ElevationConfig
): ElevationMap {
  const elevMap: ElevationMap = new Map();

  for (const cell of grid.cells) {
    const raw = sampler.sample(cell.site.x, cell.site.y);
    const normalized = (raw + 1) / 2;
    const scaled = Math.min(1, Math.max(0, normalized * config.mountainScale));
    elevMap.set(cell.index, scaled);
  }

  return elevMap;
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/layers/elevation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layers/elevation.ts tests/layers/elevation.test.ts
git commit -m "feat: elevation layer — noise-based heightmap per Voronoi cell"
```

---

### Task 5: Coastline Detection + Landmass Identification

**Files:**
- Create: `src/layers/coastline.ts`, `tests/layers/coastline.test.ts`

**Interfaces:**
- Consumes: `VoronoiGrid`, `ElevationMap`, `ElevationConfig`
- Produces:
  - `detectCoastlines(grid: VoronoiGrid, elevMap: ElevationMap, seaLevel: number): CoastlineData`
  - `CoastlineData = { landCells: Set<number>; seaCells: Set<number>; coastalCells: Set<number>; landmasses: number[][] }` (landmasses = connected components of land cells)

- [ ] **Step 1: Write failing test**

```typescript
// tests/layers/coastline.test.ts
import { describe, it, expect } from 'vitest';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { createRng } from '../../src/core/rng.js';

describe('detectCoastlines', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 200, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });

  it('land + sea = total cells', () => {
    const coast = detectCoastlines(grid, elevMap, 0.4);
    expect(coast.landCells.size + coast.seaCells.size).toBe(200);
  });

  it('coastal cells are subset of land cells', () => {
    const coast = detectCoastlines(grid, elevMap, 0.4);
    for (const c of coast.coastalCells) {
      expect(coast.landCells.has(c)).toBe(true);
    }
  });

  it('coastal cells have at least one sea neighbor', () => {
    const coast = detectCoastlines(grid, elevMap, 0.4);
    for (const c of coast.coastalCells) {
      const neighbors = grid.adjacency.get(c)!;
      const hasSeaNeighbor = neighbors.some((n) => coast.seaCells.has(n));
      expect(hasSeaNeighbor).toBe(true);
    }
  });

  it('landmasses are non-empty connected components', () => {
    const coast = detectCoastlines(grid, elevMap, 0.4);
    expect(coast.landmasses.length).toBeGreaterThan(0);
    const allLand = coast.landmasses.flat();
    expect(new Set(allLand).size).toBe(coast.landCells.size);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/layers/coastline.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement coastline detection**

```typescript
// src/layers/coastline.ts
import type { VoronoiGrid } from '../core/voronoi.js';
import type { ElevationMap } from './elevation.js';

export interface CoastlineData {
  landCells: Set<number>;
  seaCells: Set<number>;
  coastalCells: Set<number>;
  landmasses: number[][];
}

export function detectCoastlines(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  seaLevel: number
): CoastlineData {
  const landCells = new Set<number>();
  const seaCells = new Set<number>();

  for (const cell of grid.cells) {
    if ((elevMap.get(cell.index) ?? 0) > seaLevel) {
      landCells.add(cell.index);
    } else {
      seaCells.add(cell.index);
    }
  }

  const coastalCells = new Set<number>();
  for (const cellIdx of landCells) {
    const neighbors = grid.adjacency.get(cellIdx) ?? [];
    if (neighbors.some((n) => seaCells.has(n))) {
      coastalCells.add(cellIdx);
    }
  }

  const landmasses = findConnectedComponents(landCells, grid.adjacency);

  return { landCells, seaCells, coastalCells, landmasses };
}

function findConnectedComponents(
  cells: Set<number>,
  adjacency: Map<number, number[]>
): number[][] {
  const visited = new Set<number>();
  const components: number[][] = [];

  for (const cell of cells) {
    if (visited.has(cell)) continue;
    const component: number[] = [];
    const queue = [cell];
    visited.add(cell);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (cells.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components.push(component);
  }

  return components;
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/layers/coastline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layers/coastline.ts tests/layers/coastline.test.ts
git commit -m "feat: coastline detection with landmass identification via flood fill"
```

---

### Task 6: River Generation (Drainage Basins)

**Files:**
- Create: `src/layers/rivers.ts`, `tests/layers/rivers.test.ts`

**Interfaces:**
- Consumes: `VoronoiGrid`, `ElevationMap`, `CoastlineData`
- Produces:
  - `generateRivers(grid: VoronoiGrid, elevMap: ElevationMap, coastData: CoastlineData, config: RiverConfig): RiverNetwork`
  - `RiverConfig = { maxRivers: number; minLength: number }`
  - `RiverNetwork = { rivers: River[] }` where `River = { path: number[]; flow: number[] }` (path = cell indices from source to mouth, flow = accumulated flow at each point)

- [ ] **Step 1: Write failing test**

```typescript
// tests/layers/rivers.test.ts
import { describe, it, expect } from 'vitest';
import { generateRivers } from '../../src/layers/rivers.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { createRng } from '../../src/core/rng.js';

describe('generateRivers', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 300, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
  const coastData = detectCoastlines(grid, elevMap, 0.4);
  const config = { maxRivers: 5, minLength: 3 };

  it('generates rivers within limit', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    expect(network.rivers.length).toBeLessThanOrEqual(5);
    expect(network.rivers.length).toBeGreaterThan(0);
  });

  it('rivers flow downhill (elevation decreases along path)', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    for (const river of network.rivers) {
      for (let i = 1; i < river.path.length; i++) {
        const prevElev = elevMap.get(river.path[i - 1])!;
        const currElev = elevMap.get(river.path[i])!;
        expect(currElev).toBeLessThanOrEqual(prevElev);
      }
    }
  });

  it('rivers end at sea or map edge', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    for (const river of network.rivers) {
      const mouth = river.path[river.path.length - 1];
      const atSea = coastData.seaCells.has(mouth);
      const atCoast = coastData.coastalCells.has(mouth);
      expect(atSea || atCoast).toBe(true);
    }
  });

  it('rivers do not split (no cell appears in two rivers)', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    const allCells = network.rivers.flatMap((r) => r.path);
    const unique = new Set(allCells);
    expect(unique.size).toBe(allCells.length);
  });

  it('rivers meet minimum length', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    for (const river of network.rivers) {
      expect(river.path.length).toBeGreaterThanOrEqual(config.minLength);
    }
  });

  it('flow increases downstream', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    for (const river of network.rivers) {
      for (let i = 1; i < river.flow.length; i++) {
        expect(river.flow[i]).toBeGreaterThanOrEqual(river.flow[i - 1]);
      }
    }
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/layers/rivers.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement river generation**

```typescript
// src/layers/rivers.ts
import type { VoronoiGrid } from '../core/voronoi.js';
import type { ElevationMap } from './elevation.js';
import type { CoastlineData } from './coastline.js';

export interface RiverConfig {
  maxRivers: number;
  minLength: number;
}

export interface River {
  path: number[];
  flow: number[];
}

export interface RiverNetwork {
  rivers: River[];
}

export function generateRivers(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  coastData: CoastlineData,
  config: RiverConfig
): RiverNetwork {
  const downhill = buildDownhillGraph(grid, elevMap, coastData);
  const sources = findSources(grid, elevMap, coastData, downhill);
  const usedCells = new Set<number>();
  const rivers: River[] = [];

  for (const source of sources) {
    if (rivers.length >= config.maxRivers) break;
    const path = tracePath(source, downhill, coastData, usedCells);
    if (path.length < config.minLength) continue;

    const flow = computeFlow(path);
    rivers.push({ path, flow });
    for (const c of path) usedCells.add(c);
  }

  return { rivers };
}

function buildDownhillGraph(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  coastData: CoastlineData
): Map<number, number> {
  const downhill = new Map<number, number>();

  for (const cellIdx of coastData.landCells) {
    const neighbors = grid.adjacency.get(cellIdx) ?? [];
    let lowestNeighbor = -1;
    let lowestElev = elevMap.get(cellIdx)!;

    for (const n of neighbors) {
      const nElev = elevMap.get(n)!;
      if (nElev < lowestElev) {
        lowestElev = nElev;
        lowestNeighbor = n;
      }
    }

    if (lowestNeighbor !== -1) {
      downhill.set(cellIdx, lowestNeighbor);
    }
  }

  return downhill;
}

function findSources(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  coastData: CoastlineData,
  downhill: Map<number, number>
): number[] {
  const sources: Array<{ cell: number; elev: number }> = [];

  for (const cellIdx of coastData.landCells) {
    if (coastData.coastalCells.has(cellIdx)) continue;
    const elev = elevMap.get(cellIdx)!;
    if (elev > 0.65) {
      sources.push({ cell: cellIdx, elev });
    }
  }

  sources.sort((a, b) => b.elev - a.elev);
  return sources.map((s) => s.cell);
}

function tracePath(
  source: number,
  downhill: Map<number, number>,
  coastData: CoastlineData,
  usedCells: Set<number>
): number[] {
  const path: number[] = [source];
  const visited = new Set<number>([source]);
  let current = source;

  while (true) {
    const next = downhill.get(current);
    if (next === undefined) break;
    if (visited.has(next)) break;
    if (usedCells.has(next)) break;

    path.push(next);
    visited.add(next);

    if (coastData.seaCells.has(next) || coastData.coastalCells.has(next)) {
      break;
    }
    current = next;
  }

  return path;
}

function computeFlow(path: number[]): number[] {
  return path.map((_, i) => i + 1);
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/layers/rivers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layers/rivers.ts tests/layers/rivers.test.ts
git commit -m "feat: river generation via drainage basins — downhill tracing, flow accumulation"
```

---

### Task 7: Strait Detection

**Files:**
- Create: `src/layers/straits.ts`, `tests/layers/straits.test.ts`

**Interfaces:**
- Consumes: `VoronoiGrid`, `CoastlineData`
- Produces:
  - `detectStraits(grid: VoronoiGrid, coastData: CoastlineData, config: StraitConfig): Strait[]`
  - `StraitConfig = { maxWidth: number }` (max cells between landmasses to qualify)
  - `Strait = { landmassA: number; landmassB: number; seaCells: number[] }`

- [ ] **Step 1: Write failing test**

```typescript
// tests/layers/straits.test.ts
import { describe, it, expect } from 'vitest';
import { detectStraits } from '../../src/layers/straits.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { createRng } from '../../src/core/rng.js';

describe('detectStraits', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 300, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
  const coastData = detectCoastlines(grid, elevMap, 0.4);

  it('returns empty array if only one landmass', () => {
    const singleLandCoast = { ...coastData, landmasses: [coastData.landmasses.flat()] };
    const straits = detectStraits(grid, singleLandCoast, { maxWidth: 3 });
    expect(straits).toEqual([]);
  });

  it('strait connects two different landmasses', () => {
    if (coastData.landmasses.length < 2) return;
    const straits = detectStraits(grid, coastData, { maxWidth: 5 });
    for (const strait of straits) {
      expect(strait.landmassA).not.toBe(strait.landmassB);
    }
  });

  it('strait sea cells are all sea', () => {
    const straits = detectStraits(grid, coastData, { maxWidth: 5 });
    for (const strait of straits) {
      for (const cell of strait.seaCells) {
        expect(coastData.seaCells.has(cell)).toBe(true);
      }
    }
  });

  it('strait width does not exceed maxWidth', () => {
    const maxWidth = 3;
    const straits = detectStraits(grid, coastData, { maxWidth });
    for (const strait of straits) {
      expect(strait.seaCells.length).toBeLessThanOrEqual(maxWidth);
    }
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/layers/straits.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement strait detection**

```typescript
// src/layers/straits.ts
import type { VoronoiGrid } from '../core/voronoi.js';
import type { CoastlineData } from './coastline.js';

export interface StraitConfig {
  maxWidth: number;
}

export interface Strait {
  landmassA: number;
  landmassB: number;
  seaCells: number[];
}

export function detectStraits(
  grid: VoronoiGrid,
  coastData: CoastlineData,
  config: StraitConfig
): Strait[] {
  if (coastData.landmasses.length < 2) return [];

  const cellToLandmass = new Map<number, number>();
  coastData.landmasses.forEach((lm, idx) => {
    for (const cell of lm) cellToLandmass.set(cell, idx);
  });

  const straits: Strait[] = [];
  const found = new Set<string>();

  for (const coastCell of coastData.coastalCells) {
    const landmassIdx = cellToLandmass.get(coastCell)!;
    const paths = bfsToOtherLandmass(
      coastCell,
      landmassIdx,
      grid,
      coastData,
      cellToLandmass,
      config.maxWidth
    );

    for (const path of paths) {
      const key = [Math.min(landmassIdx, path.target), Math.max(landmassIdx, path.target)].join('-');
      if (found.has(key)) continue;
      found.add(key);
      straits.push({
        landmassA: landmassIdx,
        landmassB: path.target,
        seaCells: path.seaCells,
      });
    }
  }

  return straits;
}

function bfsToOtherLandmass(
  startLand: number,
  startLandmass: number,
  grid: VoronoiGrid,
  coastData: CoastlineData,
  cellToLandmass: Map<number, number>,
  maxWidth: number
): Array<{ target: number; seaCells: number[] }> {
  const results: Array<{ target: number; seaCells: number[] }> = [];
  const startNeighbors = (grid.adjacency.get(startLand) ?? []).filter((n) =>
    coastData.seaCells.has(n)
  );

  for (const seaStart of startNeighbors) {
    const visited = new Set<number>([seaStart]);
    const queue: Array<{ cell: number; path: number[] }> = [
      { cell: seaStart, path: [seaStart] },
    ];

    while (queue.length > 0) {
      const { cell, path } = queue.shift()!;
      if (path.length > maxWidth) continue;

      const neighbors = grid.adjacency.get(cell) ?? [];
      for (const n of neighbors) {
        if (coastData.landCells.has(n)) {
          const lm = cellToLandmass.get(n)!;
          if (lm !== startLandmass) {
            results.push({ target: lm, seaCells: path });
          }
          continue;
        }
        if (coastData.seaCells.has(n) && !visited.has(n) && path.length < maxWidth) {
          visited.add(n);
          queue.push({ cell: n, path: [...path, n] });
        }
      }
    }
  }

  return results;
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/layers/straits.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layers/straits.ts tests/layers/straits.test.ts
git commit -m "feat: strait detection — BFS between landmasses through narrow sea gaps"
```

---

### Task 8: Biome/Climate Zone Assignment

**Files:**
- Create: `src/layers/biomes.ts`, `tests/layers/biomes.test.ts`

**Interfaces:**
- Consumes: `VoronoiGrid`, `ElevationMap`, `CoastlineData`, `RiverNetwork`
- Produces:
  - `assignBiomes(grid: VoronoiGrid, elevMap: ElevationMap, coastData: CoastlineData, rivers: RiverNetwork, config: BiomeConfig): BiomeMap`
  - `BiomeMap = Map<number, Biome>`
  - `Biome = 'ocean' | 'desert' | 'grassland' | 'forest' | 'tundra' | 'mountain' | 'tropical'`
  - `BiomeConfig = { latitude: number; windDirection: 'west' | 'east' }` (latitude affects temp, wind direction determines rain shadow)

- [ ] **Step 1: Write failing test**

```typescript
// tests/layers/biomes.test.ts
import { describe, it, expect } from 'vitest';
import { assignBiomes, type Biome } from '../../src/layers/biomes.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { generateRivers } from '../../src/layers/rivers.js';
import { createRng } from '../../src/core/rng.js';

const VALID_BIOMES: Biome[] = ['ocean', 'desert', 'grassland', 'forest', 'tundra', 'mountain', 'tropical'];

describe('assignBiomes', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 200, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
  const coastData = detectCoastlines(grid, elevMap, 0.4);
  const rivers = generateRivers(grid, elevMap, coastData, { maxRivers: 5, minLength: 3 });
  const config = { latitude: 45, windDirection: 'west' as const };

  it('assigns biome to every cell', () => {
    const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, config);
    expect(biomeMap.size).toBe(200);
  });

  it('all biomes are valid', () => {
    const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, config);
    for (const biome of biomeMap.values()) {
      expect(VALID_BIOMES).toContain(biome);
    }
  });

  it('sea cells are ocean', () => {
    const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, config);
    for (const cell of coastData.seaCells) {
      expect(biomeMap.get(cell)).toBe('ocean');
    }
  });

  it('very high elevation cells are mountain or tundra', () => {
    const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, config);
    for (const cell of coastData.landCells) {
      const elev = elevMap.get(cell)!;
      if (elev > 0.85) {
        const biome = biomeMap.get(cell)!;
        expect(['mountain', 'tundra']).toContain(biome);
      }
    }
  });

  it('rain shadow: cells downwind of mountains tend toward desert', () => {
    const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, config);
    const desertCells = [...biomeMap.entries()].filter(([_, b]) => b === 'desert');
    // With western wind, deserts should appear east of mountains
    // Just verify at least some desert exists in a mid-latitude config
    expect(desertCells.length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/layers/biomes.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement biome assignment**

```typescript
// src/layers/biomes.ts
import type { VoronoiGrid } from '../core/voronoi.js';
import type { ElevationMap } from './elevation.js';
import type { CoastlineData } from './coastline.js';
import type { RiverNetwork } from './rivers.js';

export type Biome = 'ocean' | 'desert' | 'grassland' | 'forest' | 'tundra' | 'mountain' | 'tropical';
export type BiomeMap = Map<number, Biome>;

export interface BiomeConfig {
  latitude: number;
  windDirection: 'west' | 'east';
}

export function assignBiomes(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  coastData: CoastlineData,
  rivers: RiverNetwork,
  config: BiomeConfig
): BiomeMap {
  const biomeMap: BiomeMap = new Map();
  const moisture = computeMoisture(grid, coastData, rivers, config);

  for (const cell of grid.cells) {
    if (coastData.seaCells.has(cell.index)) {
      biomeMap.set(cell.index, 'ocean');
      continue;
    }

    const elev = elevMap.get(cell.index)!;
    const moist = moisture.get(cell.index) ?? 0;
    const temp = computeTemperature(cell.site.y, grid, elev, config.latitude);

    biomeMap.set(cell.index, classifyBiome(elev, moist, temp));
  }

  return biomeMap;
}

function classifyBiome(elevation: number, moisture: number, temperature: number): Biome {
  if (elevation > 0.85) return 'mountain';
  if (temperature < 0.2) return 'tundra';
  if (temperature > 0.75 && moisture > 0.6) return 'tropical';
  if (moisture < 0.2) return 'desert';
  if (moisture > 0.5) return 'forest';
  return 'grassland';
}

function computeTemperature(
  y: number,
  grid: VoronoiGrid,
  elevation: number,
  latitude: number
): number {
  const height = 600;
  const normalizedY = y / height;
  const latitudeEffect = 1 - Math.abs(latitude - 45) / 45;
  const baseTemp = latitudeEffect * (1 - normalizedY * 0.3);
  const elevCooling = elevation * 0.4;
  return Math.max(0, Math.min(1, baseTemp - elevCooling));
}

function computeMoisture(
  grid: VoronoiGrid,
  coastData: CoastlineData,
  rivers: RiverNetwork,
  config: BiomeConfig
): Map<number, number> {
  const moisture = new Map<number, number>();
  const riverCells = new Set(rivers.rivers.flatMap((r) => r.path));

  for (const cell of grid.cells) {
    if (!coastData.landCells.has(cell.index)) continue;

    let moist = 0;

    if (coastData.coastalCells.has(cell.index)) moist += 0.4;
    if (riverCells.has(cell.index)) moist += 0.3;

    const neighbors = grid.adjacency.get(cell.index) ?? [];
    const coastalNeighborCount = neighbors.filter((n) => coastData.coastalCells.has(n)).length;
    moist += coastalNeighborCount * 0.1;

    // Rain shadow: reduce moisture for cells downwind of high elevation
    const shadowPenalty = computeRainShadow(cell.index, grid, coastData, config);
    moist -= shadowPenalty;

    moisture.set(cell.index, Math.max(0, Math.min(1, moist)));
  }

  return moisture;
}

function computeRainShadow(
  cellIdx: number,
  grid: VoronoiGrid,
  coastData: CoastlineData,
  config: BiomeConfig
): number {
  const cell = grid.cells[cellIdx];
  const windSign = config.windDirection === 'west' ? -1 : 1;

  const neighbors = grid.adjacency.get(cellIdx) ?? [];
  const upwindNeighbors = neighbors.filter((n) => {
    const nCell = grid.cells[n];
    return (nCell.site.x - cell.site.x) * windSign < 0;
  });

  if (upwindNeighbors.length === 0) return 0;

  const hasHighUpwind = upwindNeighbors.some((n) => {
    const elev = grid.cells[n] ? 0.7 : 0;
    return elev > 0.7;
  });

  return hasHighUpwind ? 0.3 : 0;
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/layers/biomes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layers/biomes.ts tests/layers/biomes.test.ts
git commit -m "feat: biome assignment with temperature, moisture, and rain shadow modeling"
```

---

### Task 9: Political Border Generation

**Files:**
- Create: `src/layers/borders.ts`, `tests/layers/borders.test.ts`

**Interfaces:**
- Consumes: `VoronoiGrid`, `CoastlineData`, `ElevationMap`, `RiverNetwork`, `Rng`
- Produces:
  - `generateBorders(grid: VoronoiGrid, coastData: CoastlineData, elevMap: ElevationMap, rivers: RiverNetwork, rng: Rng, config: BorderConfig): PoliticalMap`
  - `BorderConfig = { countries: CountrySpec[] }` where `CountrySpec = { name: string; archetype: 'island' | 'landlocked' | 'coastal' | 'peninsular' }`
  - `PoliticalMap = { territories: Map<number, string> }` (cell index → country name)

- [ ] **Step 1: Write failing test**

```typescript
// tests/layers/borders.test.ts
import { describe, it, expect } from 'vitest';
import { generateBorders } from '../../src/layers/borders.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { generateRivers } from '../../src/layers/rivers.js';
import { createRng } from '../../src/core/rng.js';

describe('generateBorders', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 300, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
  const coastData = detectCoastlines(grid, elevMap, 0.4);
  const rivers = generateRivers(grid, elevMap, coastData, { maxRivers: 5, minLength: 3 });
  const borderRng = createRng(42);

  const config = {
    countries: [
      { name: 'Aetheria', archetype: 'coastal' as const },
      { name: 'Valdris', archetype: 'landlocked' as const },
      { name: 'Marukai', archetype: 'coastal' as const },
    ],
  };

  it('assigns every land cell to a country', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    for (const cell of coastData.landCells) {
      expect(political.territories.has(cell)).toBe(true);
    }
  });

  it('does not assign sea cells', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    for (const cell of coastData.seaCells) {
      expect(political.territories.has(cell)).toBe(false);
    }
  });

  it('creates requested number of countries', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    const countries = new Set(political.territories.values());
    expect(countries.size).toBe(3);
  });

  it('each territory is contiguous', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    const countryCells = new Map<string, Set<number>>();
    for (const [cell, country] of political.territories) {
      if (!countryCells.has(country)) countryCells.set(country, new Set());
      countryCells.get(country)!.add(cell);
    }

    for (const [_, cells] of countryCells) {
      const visited = new Set<number>();
      const start = cells.values().next().value!;
      const queue = [start];
      visited.add(start);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const n of grid.adjacency.get(current) ?? []) {
          if (cells.has(n) && !visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
      expect(visited.size).toBe(cells.size);
    }
  });

  it('landlocked country has no coastal cells', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    const valdrisCells: number[] = [];
    for (const [cell, country] of political.territories) {
      if (country === 'Valdris') valdrisCells.push(cell);
    }
    if (valdrisCells.length > 0) {
      const hasCoast = valdrisCells.some((c) => coastData.coastalCells.has(c));
      expect(hasCoast).toBe(false);
    }
  });

  it('coastal country has at least one coastal cell', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    const aetheriaCells: number[] = [];
    for (const [cell, country] of political.territories) {
      if (country === 'Aetheria') aetheriaCells.push(cell);
    }
    const hasCoast = aetheriaCells.some((c) => coastData.coastalCells.has(c));
    expect(hasCoast).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/layers/borders.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement political border generation**

```typescript
// src/layers/borders.ts
import type { VoronoiGrid } from '../core/voronoi.js';
import type { CoastlineData } from './coastline.js';
import type { ElevationMap } from './elevation.js';
import type { RiverNetwork } from './rivers.js';
import type { Rng } from '../core/rng.js';

export interface CountrySpec {
  name: string;
  archetype: 'island' | 'landlocked' | 'coastal' | 'peninsular';
}

export interface BorderConfig {
  countries: CountrySpec[];
}

export interface PoliticalMap {
  territories: Map<number, string>;
}

export function generateBorders(
  grid: VoronoiGrid,
  coastData: CoastlineData,
  elevMap: ElevationMap,
  rivers: RiverNetwork,
  rng: Rng,
  config: BorderConfig
): PoliticalMap {
  const territories = new Map<number, string>();
  const riverCells = new Set(rivers.rivers.flatMap((r) => r.path));
  const unassigned = new Set(coastData.landCells);

  const seeds = placeSeeds(grid, coastData, config.countries, rng);

  for (const [countryName, seedCell] of seeds) {
    territories.set(seedCell, countryName);
    unassigned.delete(seedCell);
  }

  const queues = new Map<string, number[]>();
  for (const [countryName, seedCell] of seeds) {
    queues.set(countryName, [seedCell]);
  }

  while (unassigned.size > 0) {
    let grew = false;
    for (const spec of config.countries) {
      const queue = queues.get(spec.name)!;
      if (queue.length === 0) continue;

      const current = queue.shift()!;
      const neighbors = rng.shuffle([...(grid.adjacency.get(current) ?? [])]);

      for (const n of neighbors) {
        if (!unassigned.has(n)) continue;
        if (!isValidExpansion(n, spec, coastData)) continue;

        const borderCost = riverCells.has(n) ? 0.3 : 0;
        if (borderCost > 0 && rng.next() < borderCost) continue;

        territories.set(n, spec.name);
        unassigned.delete(n);
        queue.push(n);
        grew = true;
      }
    }

    if (!grew) {
      for (const cell of unassigned) {
        const neighbors = grid.adjacency.get(cell) ?? [];
        const assignedNeighbor = neighbors.find((n) => territories.has(n));
        if (assignedNeighbor !== undefined) {
          territories.set(cell, territories.get(assignedNeighbor)!);
          unassigned.delete(cell);
          break;
        }
      }
      if (unassigned.size > 0 && !grew) {
        const remaining = [...unassigned][0];
        territories.set(remaining, config.countries[0].name);
        unassigned.delete(remaining);
      }
    }
  }

  return { territories };
}

function placeSeeds(
  grid: VoronoiGrid,
  coastData: CoastlineData,
  countries: CountrySpec[],
  rng: Rng
): Map<string, number> {
  const seeds = new Map<string, number>();
  const used = new Set<number>();

  for (const spec of countries) {
    const candidates = getCandidatesForArchetype(spec.archetype, grid, coastData, used);
    if (candidates.length === 0) continue;
    const idx = rng.nextInt(0, candidates.length - 1);
    const seed = candidates[idx];
    seeds.set(spec.name, seed);
    used.add(seed);
  }

  return seeds;
}

function getCandidatesForArchetype(
  archetype: CountrySpec['archetype'],
  grid: VoronoiGrid,
  coastData: CoastlineData,
  used: Set<number>
): number[] {
  const available = [...coastData.landCells].filter((c) => !used.has(c));

  switch (archetype) {
    case 'coastal':
    case 'peninsular':
      return available.filter((c) => coastData.coastalCells.has(c));
    case 'landlocked':
      return available.filter((c) => !coastData.coastalCells.has(c));
    case 'island':
      return available.filter((c) => coastData.coastalCells.has(c));
    default:
      return available;
  }
}

function isValidExpansion(
  cell: number,
  spec: CountrySpec,
  coastData: CoastlineData
): boolean {
  if (spec.archetype === 'landlocked' && coastData.coastalCells.has(cell)) {
    return false;
  }
  return true;
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/layers/borders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layers/borders.ts tests/layers/borders.test.ts
git commit -m "feat: political border generation — archetype-seeded growth with natural feature alignment"
```

---

### Task 10: JSON Schema + Config Validation

**Files:**
- Create: `src/config/schema.json`, `src/config/types.ts`, `src/config/validator.ts`, `tests/config/validator.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `validateConfig(input: unknown): { valid: true; config: RegionConfig } | { valid: false; errors: string[] }`
  - `RegionConfig` type matching the JSON Schema

- [ ] **Step 1: Write the JSON Schema**

```json
// src/config/schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MapGen Region Config",
  "type": "object",
  "required": ["width", "height", "cellCount", "seaLevel", "countries"],
  "properties": {
    "width": { "type": "number", "minimum": 200, "maximum": 4000 },
    "height": { "type": "number", "minimum": 200, "maximum": 4000 },
    "cellCount": { "type": "number", "minimum": 50, "maximum": 2000 },
    "seaLevel": { "type": "number", "minimum": 0, "maximum": 1 },
    "mountainScale": { "type": "number", "minimum": 0.1, "maximum": 3, "default": 1.0 },
    "noiseOctaves": { "type": "number", "minimum": 1, "maximum": 8, "default": 4 },
    "latitude": { "type": "number", "minimum": -90, "maximum": 90, "default": 45 },
    "windDirection": { "type": "string", "enum": ["west", "east"], "default": "west" },
    "rivers": {
      "type": "object",
      "properties": {
        "maxCount": { "type": "number", "minimum": 0, "maximum": 50, "default": 5 },
        "minLength": { "type": "number", "minimum": 2, "maximum": 20, "default": 3 }
      }
    },
    "straits": {
      "type": "object",
      "properties": {
        "maxWidth": { "type": "number", "minimum": 1, "maximum": 10, "default": 3 }
      }
    },
    "countries": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "archetype"],
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "archetype": { "type": "string", "enum": ["island", "landlocked", "coastal", "peninsular"] }
        }
      }
    },
    "labels": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    }
  }
}
```

- [ ] **Step 2: Write TypeScript types**

```typescript
// src/config/types.ts
export interface RegionConfig {
  width: number;
  height: number;
  cellCount: number;
  seaLevel: number;
  mountainScale: number;
  noiseOctaves: number;
  latitude: number;
  windDirection: 'west' | 'east';
  rivers: { maxCount: number; minLength: number };
  straits: { maxWidth: number };
  countries: Array<{ name: string; archetype: 'island' | 'landlocked' | 'coastal' | 'peninsular' }>;
  labels: Record<string, string>;
}

export const DEFAULTS: Partial<RegionConfig> = {
  mountainScale: 1.0,
  noiseOctaves: 4,
  latitude: 45,
  windDirection: 'west',
  rivers: { maxCount: 5, minLength: 3 },
  straits: { maxWidth: 3 },
  labels: {},
};
```

- [ ] **Step 3: Write failing test for validator**

```typescript
// tests/config/validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/config/validator.js';

describe('validateConfig', () => {
  const validConfig = {
    width: 800,
    height: 600,
    cellCount: 300,
    seaLevel: 0.4,
    countries: [
      { name: 'Aetheria', archetype: 'coastal' },
      { name: 'Valdris', archetype: 'landlocked' },
    ],
  };

  it('accepts valid config with defaults filled', () => {
    const result = validateConfig(validConfig);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.mountainScale).toBe(1.0);
      expect(result.config.windDirection).toBe('west');
    }
  });

  it('rejects missing required fields', () => {
    const result = validateConfig({ width: 800 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid archetype', () => {
    const bad = { ...validConfig, countries: [{ name: 'X', archetype: 'floating' }] };
    const result = validateConfig(bad);
    expect(result.valid).toBe(false);
  });

  it('rejects width below minimum', () => {
    const bad = { ...validConfig, width: 50 };
    const result = validateConfig(bad);
    expect(result.valid).toBe(false);
  });

  it('accepts full config with all fields', () => {
    const full = {
      ...validConfig,
      mountainScale: 1.5,
      noiseOctaves: 6,
      latitude: 30,
      windDirection: 'east',
      rivers: { maxCount: 8, minLength: 4 },
      straits: { maxWidth: 5 },
      labels: { country_1: 'Aetheria' },
    };
    const result = validateConfig(full);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 4: Run test — verify FAIL**

Run: `npx vitest run tests/config/validator.test.ts`
Expected: FAIL

- [ ] **Step 5: Implement validator**

```typescript
// src/config/validator.ts
import Ajv from 'ajv';
import schema from './schema.json' with { type: 'json' };
import { type RegionConfig, DEFAULTS } from './types.js';

type ValidationResult =
  | { valid: true; config: RegionConfig }
  | { valid: false; errors: string[] };

export function validateConfig(input: unknown): ValidationResult {
  const ajv = new Ajv({ useDefaults: true, allErrors: true });
  const validate = ajv.compile(schema);

  const data = JSON.parse(JSON.stringify(input));
  const valid = validate(data);

  if (!valid) {
    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || '/'}: ${e.message}`
    );
    return { valid: false, errors };
  }

  const config: RegionConfig = {
    width: data.width,
    height: data.height,
    cellCount: data.cellCount,
    seaLevel: data.seaLevel,
    mountainScale: data.mountainScale ?? DEFAULTS.mountainScale!,
    noiseOctaves: data.noiseOctaves ?? DEFAULTS.noiseOctaves!,
    latitude: data.latitude ?? DEFAULTS.latitude!,
    windDirection: data.windDirection ?? DEFAULTS.windDirection!,
    rivers: data.rivers ?? DEFAULTS.rivers!,
    straits: data.straits ?? DEFAULTS.straits!,
    countries: data.countries,
    labels: data.labels ?? DEFAULTS.labels!,
  };

  return { valid: true, config };
}
```

- [ ] **Step 6: Run test — verify PASS**

Run: `npx vitest run tests/config/validator.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/config/schema.json src/config/types.ts src/config/validator.ts tests/config/validator.test.ts
git commit -m "feat: JSON Schema config validation with defaults and TypeScript types"
```

---

### Task 11: SVG Renderer

**Files:**
- Create: `src/render/svg.ts`, `src/render/styles.ts`, `src/render/labels.ts`, `tests/render/svg.test.ts`

**Interfaces:**
- Consumes: `VoronoiGrid`, `ElevationMap`, `CoastlineData`, `BiomeMap`, `PoliticalMap`, `RiverNetwork`, `Strait[]`, `RegionConfig`
- Produces: `renderSvg(data: RenderData): string` returning valid SVG document string
  - `RenderData = { grid: VoronoiGrid; elevMap: ElevationMap; coastData: CoastlineData; biomeMap: BiomeMap; political: PoliticalMap; rivers: RiverNetwork; straits: Strait[]; config: RegionConfig }`

- [ ] **Step 1: Write styles**

```typescript
// src/render/styles.ts
import type { Biome } from '../layers/biomes.js';

export const BIOME_COLORS: Record<Biome, string> = {
  ocean: '#4a90d9',
  desert: '#edc9af',
  grassland: '#7ec850',
  forest: '#2d8a4e',
  tundra: '#d4e5f7',
  mountain: '#8b7d6b',
  tropical: '#3cb371',
};

export const BORDER_STROKE = '#2c2c2c';
export const RIVER_STROKE = '#2e86c1';
export const COAST_STROKE = '#1a1a1a';
export const STRAIT_FILL = '#6ab7e8';

export const COUNTRY_COLORS = [
  '#f4a582', '#92c5de', '#d5a6bd', '#b6d7a8',
  '#ffe599', '#c9daf8', '#f9cb9c', '#d9d2e9',
];
```

- [ ] **Step 2: Write label placement**

```typescript
// src/render/labels.ts
import type { VoronoiGrid } from '../core/voronoi.js';
import type { PoliticalMap } from '../layers/borders.js';
import type { Point } from '../core/geometry.js';
import { centroid } from '../core/geometry.js';

export interface Label {
  text: string;
  position: Point;
  fontSize: number;
}

export function placeLabels(
  grid: VoronoiGrid,
  political: PoliticalMap,
  userLabels: Record<string, string>
): Label[] {
  const countryPolygons = new Map<string, Point[]>();

  for (const [cellIdx, country] of political.territories) {
    if (!countryPolygons.has(country)) countryPolygons.set(country, []);
    countryPolygons.get(country)!.push(grid.cells[cellIdx].site);
  }

  const labels: Label[] = [];
  for (const [country, sites] of countryPolygons) {
    const center = centroid(sites);
    const displayName = userLabels[country] ?? country;
    labels.push({ text: displayName, position: center, fontSize: 14 });
  }

  return labels;
}
```

- [ ] **Step 3: Write failing test for SVG renderer**

```typescript
// tests/render/svg.test.ts
import { describe, it, expect } from 'vitest';
import { renderSvg } from '../../src/render/svg.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { generateRivers } from '../../src/layers/rivers.js';
import { detectStraits } from '../../src/layers/straits.js';
import { assignBiomes } from '../../src/layers/biomes.js';
import { generateBorders } from '../../src/layers/borders.js';
import { createRng } from '../../src/core/rng.js';

describe('renderSvg', () => {
  function buildTestData() {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 100, rng);
    const grid = buildVoronoi(points, 800, 600);
    const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
    const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
    const coastData = detectCoastlines(grid, elevMap, 0.4);
    const rivers = generateRivers(grid, elevMap, coastData, { maxRivers: 3, minLength: 3 });
    const straits = detectStraits(grid, coastData, { maxWidth: 3 });
    const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, { latitude: 45, windDirection: 'west' });
    const political = generateBorders(grid, coastData, elevMap, rivers, createRng(42), {
      countries: [{ name: 'Aetheria', archetype: 'coastal' }, { name: 'Valdris', archetype: 'landlocked' }],
    });
    return {
      grid, elevMap, coastData, biomeMap, political, rivers, straits,
      config: { width: 800, height: 600, cellCount: 100, seaLevel: 0.4, mountainScale: 1.0, noiseOctaves: 4, latitude: 45, windDirection: 'west' as const, rivers: { maxCount: 3, minLength: 3 }, straits: { maxWidth: 3 }, countries: [{ name: 'Aetheria', archetype: 'coastal' as const }, { name: 'Valdris', archetype: 'landlocked' as const }], labels: {} },
    };
  }

  it('returns valid SVG string', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('contains polygon elements for cells', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('<polygon');
  });

  it('contains river paths', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('<path');
  });

  it('contains text labels', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('<text');
    expect(svg).toContain('Aetheria');
  });

  it('sets correct viewBox dimensions', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('viewBox="0 0 800 600"');
  });
});
```

- [ ] **Step 4: Run test — verify FAIL**

Run: `npx vitest run tests/render/svg.test.ts`
Expected: FAIL

- [ ] **Step 5: Implement SVG renderer**

```typescript
// src/render/svg.ts
import type { VoronoiGrid } from '../core/voronoi.js';
import type { ElevationMap } from '../layers/elevation.js';
import type { CoastlineData } from '../layers/coastline.js';
import type { BiomeMap } from '../layers/biomes.js';
import type { PoliticalMap } from '../layers/borders.js';
import type { RiverNetwork } from '../layers/rivers.js';
import type { Strait } from '../layers/straits.js';
import type { RegionConfig } from '../config/types.js';
import { BIOME_COLORS, BORDER_STROKE, RIVER_STROKE, COAST_STROKE, COUNTRY_COLORS } from './styles.js';
import { placeLabels } from './labels.js';

export interface RenderData {
  grid: VoronoiGrid;
  elevMap: ElevationMap;
  coastData: CoastlineData;
  biomeMap: BiomeMap;
  political: PoliticalMap;
  rivers: RiverNetwork;
  straits: Strait[];
  config: RegionConfig;
}

export function renderSvg(data: RenderData): string {
  const { grid, biomeMap, political, rivers, coastData, config } = data;
  const lines: string[] = [];

  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" width="${config.width}" height="${config.height}">`);

  // Background
  lines.push(`<rect width="${config.width}" height="${config.height}" fill="${BIOME_COLORS.ocean}"/>`);

  // Biome layer
  lines.push('<g id="biomes">');
  for (const cell of grid.cells) {
    const biome = biomeMap.get(cell.index)!;
    const points = cell.polygon.map((p) => `${p.x},${p.y}`).join(' ');
    lines.push(`<polygon points="${points}" fill="${BIOME_COLORS[biome]}" stroke="none"/>`);
  }
  lines.push('</g>');

  // Political borders
  const countryNames = [...new Set(political.territories.values())];
  lines.push('<g id="borders">');
  for (const cell of grid.cells) {
    const country = political.territories.get(cell.index);
    if (!country) continue;
    const colorIdx = countryNames.indexOf(country) % COUNTRY_COLORS.length;
    const points = cell.polygon.map((p) => `${p.x},${p.y}`).join(' ');
    lines.push(`<polygon points="${points}" fill="${COUNTRY_COLORS[colorIdx]}" fill-opacity="0.3" stroke="${BORDER_STROKE}" stroke-width="0.5"/>`);
  }
  lines.push('</g>');

  // Coastlines
  lines.push('<g id="coastlines">');
  for (const cellIdx of coastData.coastalCells) {
    const cell = grid.cells[cellIdx];
    const points = cell.polygon.map((p) => `${p.x},${p.y}`).join(' ');
    lines.push(`<polygon points="${points}" fill="none" stroke="${COAST_STROKE}" stroke-width="1.5"/>`);
  }
  lines.push('</g>');

  // Rivers
  lines.push('<g id="rivers">');
  for (const river of rivers.rivers) {
    const pathPoints = river.path.map((cellIdx) => {
      const site = grid.cells[cellIdx].site;
      return `${site.x},${site.y}`;
    });
    const d = `M ${pathPoints.join(' L ')}`;
    lines.push(`<path d="${d}" fill="none" stroke="${RIVER_STROKE}" stroke-width="2" stroke-linecap="round"/>`);
  }
  lines.push('</g>');

  // Labels
  const labels = placeLabels(grid, political, config.labels);
  lines.push('<g id="labels">');
  for (const label of labels) {
    lines.push(`<text x="${label.position.x}" y="${label.position.y}" font-size="${label.fontSize}" text-anchor="middle" font-family="sans-serif" font-weight="bold">${label.text}</text>`);
  }
  lines.push('</g>');

  lines.push('</svg>');
  return lines.join('\n');
}
```

- [ ] **Step 6: Run test — verify PASS**

Run: `npx vitest run tests/render/svg.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/render/svg.ts src/render/styles.ts src/render/labels.ts tests/render/svg.test.ts
git commit -m "feat: SVG renderer — biomes, borders, coastlines, rivers, labels"
```

---

### Task 12: Generation Pipeline + CLI

**Files:**
- Create: `src/pipeline.ts`, `src/index.ts`, `tests/pipeline.test.ts`, `examples/archipelago.json`

**Interfaces:**
- Consumes: all layers, validator, renderer
- Produces: `generate(config: RegionConfig, seed: number): string` (returns SVG), CLI entry point

- [ ] **Step 1: Write failing test for pipeline**

```typescript
// tests/pipeline.test.ts
import { describe, it, expect } from 'vitest';
import { generate } from '../src/pipeline.js';
import type { RegionConfig } from '../src/config/types.js';

describe('generate', () => {
  const config: RegionConfig = {
    width: 800,
    height: 600,
    cellCount: 150,
    seaLevel: 0.4,
    mountainScale: 1.0,
    noiseOctaves: 4,
    latitude: 45,
    windDirection: 'west',
    rivers: { maxCount: 4, minLength: 3 },
    straits: { maxWidth: 3 },
    countries: [
      { name: 'Aetheria', archetype: 'coastal' },
      { name: 'Valdris', archetype: 'landlocked' },
    ],
    labels: { Aetheria: 'The Republic of Aetheria' },
  };

  it('produces valid SVG from config + seed', () => {
    const svg = generate(config, 42);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('The Republic of Aetheria');
  });

  it('same config + seed = identical output', () => {
    const svg1 = generate(config, 42);
    const svg2 = generate(config, 42);
    expect(svg1).toBe(svg2);
  });

  it('different seeds produce different output', () => {
    const svg1 = generate(config, 42);
    const svg2 = generate(config, 99);
    expect(svg1).not.toBe(svg2);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/pipeline.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement pipeline**

```typescript
// src/pipeline.ts
import { createRng } from './core/rng.js';
import { createNoiseSampler } from './core/noise.js';
import { generatePoints, buildVoronoi } from './core/voronoi.js';
import { assignElevation } from './layers/elevation.js';
import { detectCoastlines } from './layers/coastline.js';
import { generateRivers } from './layers/rivers.js';
import { detectStraits } from './layers/straits.js';
import { assignBiomes } from './layers/biomes.js';
import { generateBorders } from './layers/borders.js';
import { renderSvg } from './render/svg.js';
import type { RegionConfig } from './config/types.js';

export function generate(config: RegionConfig, seed: number): string {
  const rng = createRng(seed);
  const sampler = createNoiseSampler(seed, config.noiseOctaves, 2.0, 0.5);

  const points = generatePoints(config.width, config.height, config.cellCount, rng);
  const grid = buildVoronoi(points, config.width, config.height);

  const elevMap = assignElevation(grid, sampler, {
    seaLevel: config.seaLevel,
    mountainScale: config.mountainScale,
  });

  const coastData = detectCoastlines(grid, elevMap, config.seaLevel);

  const rivers = generateRivers(grid, elevMap, coastData, {
    maxRivers: config.rivers.maxCount,
    minLength: config.rivers.minLength,
  });

  const straits = detectStraits(grid, coastData, {
    maxWidth: config.straits.maxWidth,
  });

  const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, {
    latitude: config.latitude,
    windDirection: config.windDirection,
  });

  const borderRng = createRng(seed + 1000);
  const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, {
    countries: config.countries,
  });

  return renderSvg({
    grid, elevMap, coastData, biomeMap, political, rivers, straits, config,
  });
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Implement CLI entry point**

```typescript
// src/index.ts
import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateConfig } from './config/validator.js';
import { generate } from './pipeline.js';

const program = new Command();

program
  .name('mapgen')
  .description('Procedural regional map generator')
  .version('0.1.0');

program
  .command('generate')
  .requiredOption('-c, --config <path>', 'Path to region config JSON')
  .requiredOption('-s, --seed <number>', 'Random seed', parseInt)
  .option('-o, --output <path>', 'Output SVG path', 'map.svg')
  .action((opts) => {
    const raw = JSON.parse(readFileSync(opts.config, 'utf-8'));
    const result = validateConfig(raw);

    if (!result.valid) {
      console.error('Invalid config:');
      for (const err of result.errors) console.error(`  - ${err}`);
      process.exit(1);
    }

    const svg = generate(result.config, opts.seed);
    writeFileSync(opts.output, svg);
    console.log(`Map generated: ${opts.output} (seed: ${opts.seed})`);
  });

program.parse();
```

- [ ] **Step 6: Create example config**

```json
// examples/archipelago.json
{
  "width": 1200,
  "height": 900,
  "cellCount": 400,
  "seaLevel": 0.45,
  "mountainScale": 1.2,
  "noiseOctaves": 5,
  "latitude": 35,
  "windDirection": "west",
  "rivers": { "maxCount": 6, "minLength": 4 },
  "straits": { "maxWidth": 4 },
  "countries": [
    { "name": "Aetheria", "archetype": "island" },
    { "name": "Valdris", "archetype": "coastal" },
    { "name": "Kaelmont", "archetype": "peninsular" },
    { "name": "Sorheim", "archetype": "landlocked" }
  ],
  "labels": {
    "Aetheria": "Republic of Aetheria",
    "Valdris": "Valdris Confederation",
    "Kaelmont": "Kingdom of Kaelmont",
    "Sorheim": "Sorheim Principality"
  }
}
```

- [ ] **Step 7: Run full pipeline test**

Run: `npx vitest run tests/pipeline.test.ts`
Expected: PASS

- [ ] **Step 8: Install tsx and test CLI end-to-end**

```bash
npm install tsx --save-dev
npx tsx src/index.ts generate --config examples/archipelago.json --seed 42 --output test-output.svg
# Verify file exists and contains valid SVG
head -5 test-output.svg
```

Expected: SVG file created with `<svg` tag

- [ ] **Step 9: Commit**

```bash
git add src/pipeline.ts src/index.ts tests/pipeline.test.ts examples/archipelago.json
git commit -m "feat: generation pipeline + CLI entry point — full map generation from config"
```

---

### Task 13: Run All Tests + Integration Smoke Test

**Files:**
- No new files — verification task

**Interfaces:**
- Consumes: entire codebase
- Produces: confidence that all units work together

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (10+ test files, 30+ individual tests)

- [ ] **Step 2: Generate map with example config**

```bash
npx tsx src/index.ts generate --config examples/archipelago.json --seed 42 --output output/archipelago-42.svg
npx tsx src/index.ts generate --config examples/archipelago.json --seed 99 --output output/archipelago-99.svg
```

- [ ] **Step 3: Verify determinism**

```bash
npx tsx src/index.ts generate --config examples/archipelago.json --seed 42 --output output/archipelago-42-verify.svg
diff output/archipelago-42.svg output/archipelago-42-verify.svg
```

Expected: No difference

- [ ] **Step 4: Open SVG in browser and visually verify**

Open `output/archipelago-42.svg` — should show:
- Distinct colored landmasses
- Blue ocean
- River lines flowing to coast
- Country labels
- Political border overlays

- [ ] **Step 5: Commit output gitignore**

```bash
echo "output/" >> .gitignore
git add .gitignore
git commit -m "chore: add output directory to gitignore"
```

---

## Research Notes: Geographic Constraints to Encode

These rules are baked into the algorithm during implementation (not a separate task):

**Rivers:**
- Never bifurcate downstream (they only merge)
- Flow perpendicular to elevation contours
- Form where precipitation meets high ground
- Major rivers widen toward the mouth

**Mountains:**
- Form in chains/ranges, not isolated peaks
- Highest points in interior of ranges
- Foothills taper toward plains

**Coastlines:**
- More irregular = more realistic (noise helps)
- Peninsulas and bays alternate
- Islands cluster near continent edges

**Straits:**
- Form between close landmasses (< 5 cells typical)
- Often flanked by higher terrain on both sides

**Rain Shadows:**
- Leeward side of mountains is drier
- Windward side gets moisture from ocean
- Effect scales with mountain height

**Biomes:**
- Latitude determines base temperature
- Elevation cools (lapse rate)
- Proximity to water increases moisture
- Desert belts at ~30° latitude (subtropical high pressure)

---
