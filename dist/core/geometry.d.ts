export interface Point {
    x: number;
    y: number;
}
export declare function distance(a: Point, b: Point): number;
export declare function centroid(polygon: Point[]): Point;
export declare function polygonArea(polygon: Point[]): number;
