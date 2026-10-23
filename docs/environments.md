# Environment art direction

Ten original side-view locations, each with a paired Upside Down echo. Each generated PNG atlas has two equal horizontal panels: normal above, corrupted counterpart below. Runtime frames derive their bounds from the actual image dimensions. No offline transparency edits or hand slicing are needed for these opaque backgrounds.

| Stage | Identity | Playable surface |
| --- | --- | --- |
| 1 | Hawkins suburb, Byers alphabet lights, bicycles and porches | Asphalt ledges |
| 2 | Mirkwood and Castle Byers | Woodland timber |
| 3 | Palace Arcade **interior**, CRT cabinets and neon | Carpet trim and metal |
| 4 | Hawkins Middle **corridor**, lockers, science wing and AV cart | Hallway tiles |
| 5 | Quarry and mine supports, ore rails | Striated rock |
| 6 | Hawkins Lab exterior, security and satellite dishes | Industrial grating |
| 7 | Underground service tunnel, pumps and pipes | Utility steel |
| 8 | Creel House interior, grandfather clock | Wooden floorboards |
| 9 | Starcourt ruins, escalators and food court | Mall tile |
| 10 | Rainbow Room containment core | Laboratory panels |

The counterpart keeps the location architecture while introducing living vines, structural decay, spores, failed lighting and red organic growth. It does not substitute the same generic dungeon background for every location. Arcade/school/house/mall remain interiors in both worlds. Gameplay platforms are separate deterministic Phaser art aligned exactly to collision tops, preserving readable pits and landings. Location props scroll in a separate parallax plane; subdued fixture lights, fog and motes loop, respecting reduced motion.

The generated panoramic source has route-aware overscan and gentle horizontal parallax, covering the viewport without tiling or moving outside its frame. Foreground architecture varies by location and provides depth while the normal and Upside Down background frames preserve matched landmarks. Routes, enemy placement and combat controls remain unchanged. Mind Flayer has 60 HP; Vecna has 100 HP.

## Official reference context

- [Netflix Tudum — Upside Down explained](https://www.netflix.com/tudum/articles/stranger-things-5-upside-down-explained): Hawkins echo, vines, spores, gates and Creel House motifs.
- [Netflix — Stranger Things](https://www.netflix.com/tudum/stranger-things): the Byers lights, school AV/science setting and Hawkins laboratory context.
- [Netflix — Tales From ’85](https://www.netflix.com/tudum/articles/stranger-things-tales-from-85-season-2-release-date): Hawkins Middle, Palace Arcade and mine references. These inform art direction, not copied television stills.

## Generation and files

Built-in image generation was used for all ten project assets in `public/assets/environments/stage-01.png` through `stage-10.png`. The complete prompts are stored in `environment-prompts.json`. Each prompt specifies one integrated two-state atlas, pixel art, clear gameplay space, matching architecture, no characters/HUD, and a distinct setting.

## Verification

`tests/environments.html` provides real Phaser previews plus a single 20-room smoke pass for asset frames, grounded spawns, movement and exact boss HP. The existing route/door tests cover reachability. `scripts/check-pages.mjs` verifies every environment atlas is packaged for the repository Pages base path.

Validated in this change: all 20 real-engine environment checks passed; 18 focused boss/combat unit tests and seven dungeon tests passed. Independent read-only review found no important issues. Full CI verification runs once during publishing.
