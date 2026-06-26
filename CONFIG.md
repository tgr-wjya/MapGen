# Configuration Reference

Complete guide to all MapGen configuration options.

## Full Configuration Example

```json
{
  "width": 1200,
  "height": 900,
  "cellCount": 400,
  "seaLevel": 0.45,
  "mountainScale": 1.2,
  "noiseOctaves": 5,
  "latitude": 35,
  "windDirection": "west",
  "rivers": {
    "maxCount": 6,
    "minLength": 4
  },
  "straits": {
    "maxWidth": 3
  },
  "countries": [
    { "name": "Aetheria", "archetype": "island" },
    { "name": "Valdris", "archetype": "coastal" },
    { "name": "Kaelmont", "archetype": "peninsular" },
    { "name": "Sorheim", "archetype": "landlocked" }
  ],
  "labels": {
    "Aetheria": "The Republic of Aetheria",
    "Valdris": "Valdris Confederation"
  }
}
```

## Required Fields

### `width` (number)

Map width in pixels.

- **Range**: 200 - 4000
- **Recommended**: 800-1600 for screen viewing, 2000+ for print
- **Example**: `1200`

### `height` (number)

Map height in pixels.

- **Range**: 200 - 4000
- **Recommended**: 600-1200 for screen viewing
- **Example**: `900`

### `cellCount` (number)

Number of regions (Voronoi cells) the map is divided into. More cells = more detail but slower generation.

- **Range**: 50 - 2000
- **Recommended**:
  - 100-200: Quick generation, simple maps
  - 300-500: Good detail for most uses
  - 600-1000: High detail for large maps
  - 1000+: Very detailed but slow
- **Example**: `400`

### `seaLevel` (number)

Threshold that determines land vs water. Higher = more ocean.

- **Range**: 0.0 - 1.0
- **Effects**:
  - 0.0 - 0.2: Almost all land, tiny seas
  - 0.3 - 0.4: Mostly land with significant oceans (Earth-like)
  - 0.5: Balanced continents and oceans
  - 0.6 - 0.7: Archipelago with many islands
  - 0.8+: Mostly ocean with tiny islands
- **Example**: `0.45`

### `countries` (array)

List of countries/nations to generate on the map. At least one required.

Each country object needs:

#### `name` (string)

Internal name of the country (used in config and as default label).

- **Example**: `"Aetheria"`

#### `archetype` (string)

Geographic type that influences where the country is placed and how it grows.

- **Options**:
  - `"island"`: Placed on islands, surrounded by water
  - `"coastal"`: Placed on coastlines, has ocean access
  - `"peninsular"`: Placed on peninsulas (mostly surrounded by water with land bridge)
  - `"landlocked"`: Placed inland, no direct ocean access
- **Note**: Generator tries to match archetype but may not always succeed depending on terrain and seed
- **Example**: `"coastal"`

**Full country example**:
```json
{
  "name": "Northreach",
  "archetype": "coastal"
}
```

## Optional Fields (with Defaults)

### `mountainScale` (number)

Multiplier for terrain elevation. Higher = taller mountains and deeper valleys.

- **Range**: 0.1 - 3.0
- **Default**: `1.0`
- **Effects**:
  - 0.5: Gentle rolling hills
  - 1.0: Normal mountain ranges
  - 1.5: Dramatic mountains
  - 2.0+: Very dramatic, fantasy-style peaks
- **Example**: `1.2`

### `noiseOctaves` (number)

Number of fractal noise layers. More octaves = more terrain detail/roughness.

- **Range**: 1 - 8
- **Default**: `4`
- **Effects**:
  - 1-2: Very smooth, simple terrain
  - 4: Normal detail (good balance)
  - 6-7: Highly detailed, fractal-like
  - 8: Maximum detail (may look noisy)
- **Example**: `5`

### `latitude` (number)

Climate zone center point. Affects temperature and biome distribution.

- **Range**: -90 to 90 (like Earth degrees)
- **Default**: `45`
- **Effects**:
  - -90 to -60: Polar (tundra, ice)
  - -60 to -30: Cold temperate
  - -30 to 30: Warm/tropical (jungles, deserts)
  - 30 to 60: Temperate (forests, grasslands)
  - 60 to 90: Polar (tundra, ice)
- **Example**: `35`

### `windDirection` (string)

Prevailing wind direction. Affects rain shadow (deserts form downwind of mountains).

- **Options**: `"west"` or `"east"`
- **Default**: `"west"`
- **Effects**: Mountains block moisture from the upwind side, creating deserts on the downwind side
- **Example**: `"west"`

### `rivers` (object)

Controls river generation.

#### `rivers.maxCount` (number)

Maximum number of major rivers to generate.

- **Range**: 0 - 50
- **Default**: `5`
- **Example**: `6`

#### `rivers.minLength` (number)

Minimum number of cells a river must flow through to be shown.

- **Range**: 2 - 20
- **Default**: `3`
- **Effects**:
  - 2-3: Shows small streams and major rivers
  - 5-7: Only medium-to-major rivers
  - 10+: Only the longest rivers
- **Example**: `4`

### `straits` (object)

Controls narrow water passages between landmasses.

#### `straits.maxWidth` (number)

Maximum width (in cells) for a strait to be detected.

- **Range**: 1 - 10
- **Default**: `3`
- **Note**: Currently detected but not rendered in SVG output (reserved for future use)
- **Example**: `3`

### `labels` (object)

Optional display name overrides for countries. Use when you want the map to show a full formal name but keep the config simple.

- **Format**: `{ "configName": "Display Name" }`
- **Default**: `{}` (uses country names as-is)
- **Example**:
```json
{
  "Aetheria": "The Free Republic of Aetheria",
  "Valdris": "Valdris Trade Confederation",
  "Kaelmont": "Kingdom of Kaelmont"
}
```

## Biome System

Biomes are automatically assigned based on:

1. **Elevation** (from `mountainScale` and noise)
   - High elevation → mountains, tundra
   - Low elevation → other biomes

2. **Temperature** (from `latitude` and elevation)
   - Hot regions → tropical forests, deserts
   - Cold regions → tundra

3. **Moisture** (from coastlines, rivers, and rain shadow from `windDirection`)
   - High moisture → forests, tropical
   - Low moisture → deserts, grasslands

**Generated biomes**:
- Ocean (blue)
- Desert (tan)
- Grassland (light green)
- Forest (green)
- Tundra (light blue/white)
- Mountain (brown/gray)
- Tropical (bright green)

## Configuration Tips

### Getting the Right Land/Water Balance

Start with `seaLevel` and generate a few test maps:

```json
// Too much water? Lower seaLevel
"seaLevel": 0.4  // (was 0.6)

// Not enough water? Raise seaLevel
"seaLevel": 0.5  // (was 0.3)
```

### Making Varied Terrain

Combine `mountainScale` and `noiseOctaves`:

```json
// Dramatic fantasy mountains
"mountainScale": 2.0,
"noiseOctaves": 6

// Gentle realistic terrain
"mountainScale": 0.8,
"noiseOctaves": 3
```

### Climate Zones

Match `latitude` to your world's feel:

```json
// Tropical jungle world
"latitude": 10,
"seaLevel": 0.5

// Northern kingdoms (like Scandinavia)
"latitude": 60,
"mountainScale": 1.3

// Mediterranean climate
"latitude": 35,
"windDirection": "west"
```

### Detail Level vs Performance

Balance `cellCount` with map size:

```json
// Fast generation, lower detail
"width": 800,
"height": 600,
"cellCount": 200

// Slow but detailed
"width": 2000,
"height": 1500,
"cellCount": 1000
```

**Rule of thumb**: Keep cellCount ≤ width/2 for reasonable generation times.

## Validation Rules

The generator validates your config file. Common errors:

### "width: must be >= 200"
Your width is too small. Minimum is 200 pixels.

### "seaLevel: must be <= 1"
seaLevel must be between 0 and 1. Use `0.5` not `50`.

### "countries: must have required property 'archetype'"
Every country needs an `archetype` field. Valid values: `island`, `coastal`, `peninsular`, `landlocked`.

### "windDirection: must be equal to one of the allowed values"
Use `"west"` or `"east"` (lowercase, in quotes).

### Additional properties not allowed
You have a field name that's not recognized. Check spelling (case-sensitive).

## Complete Minimal Config

The shortest valid config (all optional fields use defaults):

```json
{
  "width": 800,
  "height": 600,
  "cellCount": 200,
  "seaLevel": 0.4,
  "countries": [
    { "name": "Kingdom", "archetype": "coastal" }
  ]
}
```

This gets you:
- 800x600 map
- 200 cells (moderate detail)
- 40% sea level (mostly land)
- Default mountains (scale 1.0)
- Default terrain detail (4 octaves)
- Temperate climate (latitude 45)
- Western wind
- Up to 5 rivers (min length 3)
- One coastal country named "Kingdom"
