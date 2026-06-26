import { Delaunay } from 'd3-delaunay';
export function generatePoints(width, height, count, rng) {
    const points = [];
    for (let i = 0; i < count; i++) {
        points.push({ x: rng.next() * width, y: rng.next() * height });
    }
    return relaxPoints(points, width, height, 2);
}
function relaxPoints(points, width, height, iterations) {
    let current = points;
    for (let i = 0; i < iterations; i++) {
        const flat = current.flatMap((p) => [p.x, p.y]);
        const delaunay = new Delaunay(flat);
        const voronoi = delaunay.voronoi([0, 0, width, height]);
        current = current.map((_, idx) => {
            const cell = voronoi.cellPolygon(idx);
            if (!cell)
                return current[idx];
            const cx = cell.reduce((s, v) => s + v[0], 0) / cell.length;
            const cy = cell.reduce((s, v) => s + v[1], 0) / cell.length;
            return { x: cx, y: cy };
        });
    }
    return current;
}
export function buildVoronoi(points, width, height) {
    const flat = points.flatMap((p) => [p.x, p.y]);
    const delaunay = new Delaunay(flat);
    const voronoi = delaunay.voronoi([0, 0, width, height]);
    const cells = points.map((site, index) => {
        const raw = voronoi.cellPolygon(index);
        const polygon = raw
            ? raw.slice(0, -1).map(([x, y]) => ({ x, y }))
            : [site];
        return { index, site, polygon };
    });
    const adjacency = new Map();
    for (let i = 0; i < points.length; i++) {
        const neighbors = [];
        for (const j of delaunay.neighbors(i)) {
            neighbors.push(j);
        }
        adjacency.set(i, neighbors);
    }
    return { cells, adjacency };
}
