export interface Rng {
    next(): number;
    nextInt(min: number, max: number): number;
    shuffle<T>(arr: T[]): T[];
}
export declare function createRng(seed: number): Rng;
