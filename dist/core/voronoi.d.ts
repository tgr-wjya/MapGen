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
export declare function generatePoints(width: number, height: number, count: number, rng: Rng): Point[];
export declare function buildVoronoi(points: Point[], width: number, height: number): VoronoiGrid;
