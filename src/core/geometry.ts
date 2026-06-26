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
