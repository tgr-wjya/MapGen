# MapGen — Fantasy Map Generator

Generate beautiful, realistic fantasy maps from simple configuration files. Perfect for worldbuilding, game design, or creative projects.

## What You Get

- Procedurally generated landmasses with natural coastlines
- Rivers that flow downhill from mountains to the sea
- Realistic biomes (forests, deserts, grasslands, mountains, etc.)
- Political borders between countries
- Fully customizable through a simple config file
- Deterministic: same seed = same map every time

## Quick Start

### Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed (version 20 or higher)
2. Download or clone this repository
3. Open a terminal in the project folder and run:

```bash
npm install
npm run build
```

### Generate Your First Map

```bash
npm run generate -- --config examples/archipelago.json --seed 42 --output my-map.svg
```

This creates `my-map.svg` — open it in any web browser or image viewer!

### Try Different Maps

Change the seed number to get completely different maps:

```bash
npm run generate -- --config examples/archipelago.json --seed 99 --output another-map.svg
```

Same configuration, different seed = different map. Use this to generate variations until you find one you like!

## Making Your Own Maps

### 1. Create a Configuration File

Copy `examples/archipelago.json` and edit it to your liking. Here's what each setting does:

#### Map Size

```json
"width": 1200,
"height": 900,
"cellCount": 400
```

- **width** & **height**: Map dimensions in pixels (200-4000)
- **cellCount**: How many regions to divide the map into (50-2000)
  - More cells = more detail but slower generation
  - Try 200-400 for medium maps, 600-1000 for large detailed maps

#### Land & Water

```json
"seaLevel": 0.45
```

- **seaLevel**: How much of the map is water (0.0 = all land, 1.0 = all water)
  - 0.3 = mostly land with some seas
  - 0.5 = balanced continents and oceans
  - 0.7 = archipelago with many islands

#### Terrain

```json
"mountainScale": 1.2,
"noiseOctaves": 5
```

- **mountainScale**: How tall/dramatic the mountains are (0.1-3.0)
  - 0.5 = gentle hills
  - 1.0 = normal mountains
  - 2.0 = dramatic peaks
  
- **noiseOctaves**: How detailed/rough the terrain looks (1-8)
  - 1-2 = smooth, simple terrain
  - 4 = normal detail (recommended)
  - 6-8 = very detailed, fractal-like

#### Climate

```json
"latitude": 35,
"windDirection": "west"
```

- **latitude**: Climate zone (-90 to 90)
  - 0 = tropical (hot, lots of jungles)
  - 30-45 = temperate (mixed forests/grasslands)
  - 60-90 = cold (tundra, snow)
  
- **windDirection**: Which way the wind blows ("west" or "east")
  - Affects where deserts form (downwind of mountains get less rain)

#### Rivers

```json
"rivers": {
  "maxCount": 6,
  "minLength": 4
}
```

- **maxCount**: Maximum number of rivers (0-50)
- **minLength**: Minimum cells a river must flow through (2-20)
  - Higher = only major rivers shown

#### Countries

```json
"countries": [
  { "name": "Aetheria", "archetype": "island" },
  { "name": "Valdris", "archetype": "coastal" },
  { "name": "Kaelmont", "archetype": "peninsular" },
  { "name": "Sorheim", "archetype": "landlocked" }
]
```

Each country needs:
- **name**: What to label it on the map
- **archetype**: What type of country
  - `island`: surrounded by water
  - `coastal`: has coastline access
  - `peninsular`: mostly surrounded by water with one land connection
  - `landlocked`: no ocean access

#### Custom Labels (Optional)

```json
"labels": {
  "Aetheria": "The Republic of Aetheria",
  "Valdris": "Valdris Confederation"
}
```

Use different display names on the map while keeping config names simple.

### 2. Generate the Map

```bash
npm run generate -- --config YOUR_CONFIG.json --seed SOME_NUMBER --output OUTPUT.svg
```

- `--config`: Path to your config file
- `--seed`: Any number (changes the random generation)
- `--output`: Where to save the SVG file (optional, defaults to `map.svg`)

### 3. Experiment!

Try different seeds with the same config to explore variations. When you find a map you like, save that seed number — you can regenerate the exact same map anytime.

## Tips for Great Maps

1. **Start with seaLevel**: Get the land/water ratio right first
2. **Adjust cellCount**: More cells = more detail but takes longer
3. **Try many seeds**: Generate 5-10 maps with different seeds, pick your favorite
4. **Match countries to geography**: After generating, if a "coastal" country ended up landlocked, adjust the config and try a different seed
5. **Climate matters**: Latitude affects temperature — tropical maps (lat 0-20) get jungles, cold maps (lat 60+) get tundra

## Example Configurations

### Continental Map (like Europe)
```json
{
  "width": 1600,
  "height": 1200,
  "cellCount": 500,
  "seaLevel": 0.35,
  "mountainScale": 1.0,
  "latitude": 45,
  "countries": [
    { "name": "Northreach", "archetype": "coastal" },
    { "name": "Midlands", "archetype": "landlocked" },
    { "name": "Southbay", "archetype": "coastal" }
  ]
}
```

### Island Chain (like Japan/Indonesia)
```json
{
  "width": 1400,
  "height": 1000,
  "cellCount": 400,
  "seaLevel": 0.65,
  "mountainScale": 1.3,
  "latitude": 25,
  "countries": [
    { "name": "Sunrise Isles", "archetype": "island" },
    { "name": "Storm Islands", "archetype": "island" }
  ]
}
```

### Desert Continent
```json
{
  "width": 1200,
  "height": 1200,
  "cellCount": 300,
  "seaLevel": 0.45,
  "mountainScale": 0.8,
  "latitude": 30,
  "windDirection": "west",
  "countries": [
    { "name": "Sand Kingdoms", "archetype": "coastal" },
    { "name": "Oasis Tribes", "archetype": "landlocked" }
  ]
}
```

## Troubleshooting

**Map looks too crowded**: Reduce `cellCount` to 200-300

**Not enough water**: Increase `seaLevel` (try 0.5-0.6)

**Too much water/tiny islands**: Decrease `seaLevel` (try 0.3-0.4)

**Mountains look flat**: Increase `mountainScale` to 1.5-2.0

**Terrain too smooth**: Increase `noiseOctaves` to 6-7

**Generation takes too long**: Reduce `cellCount` or map size

**Country ended up with wrong geography**: Try a different seed or adjust the country list to match what the map generated

## Output Format

Maps are saved as SVG (Scalable Vector Graphics) files. You can:
- Open directly in web browsers (Chrome, Firefox, Safari)
- Edit in vector graphics software (Inkscape, Adobe Illustrator)
- Convert to PNG/JPG using online tools or Inkscape
- Scale to any size without quality loss

## License

MIT — use for personal or commercial projects freely.
