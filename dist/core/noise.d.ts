export interface NoiseSampler {
    sample(x: number, y: number): number;
}
export declare function createNoiseSampler(seed: number, octaves: number, lacunarity: number, persistence: number): NoiseSampler;
