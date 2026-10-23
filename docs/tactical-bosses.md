# Tactical boss encounters

The six existing boss encounters retain their HP and bounties: Mind Flayer60/40coins, Vecna100/80coins. Base sword and slingshot are sufficient. No upgrade or psychic purchase is required to win.

## Mind Flayer

Armor blocks body damage. A marked tentacle slam plants an independently hittable arm. Slingshot fire at its cyan node extends its stuck time once; the base sword cuts it. Two successful cuts open the chest core for four seconds, then armor and arms regenerate. The optional psychic charge holds the stuck arm and never kills the boss instantly. At low HP, double ground waves alternate with a high sweep; the second final-stage encounter introduces this pressure immediately and adds two reachable upper ledges.

## Vecna

HP thresholds at66% and33% change attack sequences. Leap targets are fixed during a visible warning: bait the landing into a charged electric pylon, then leave its marked area. Overloading it opens the core for four seconds. Devices recharge after eight seconds, avoiding permanent failure states. The base slingshot can interrupt psychic channeling; a physical pillar between Vecna and the player also blocks its ray. Low waves require a jump, high waves require crouching, psychic hits cost one heart and heavy hits cost two. Psychic power provides a brief optional core opening rather than instant death. Phase-three sequences shorten pauses while keeping separate warnings.

## Art and geometry

Six new transparent PNG atlases: `mf-phases`, `mf-arm`, `vecna-stances`, `boss-devices`, `vecna-airwave`, `boss-cores` in `public/assets/`. The existing boss sprites were the visual references for generated poses. A second Vecna atlas edit improved frame separation. `bossAssets.ts` stores measured frame boxes and ground baselines; pylon/cover crops use individual bounds rather than assuming equal artwork widths. Cover art and colliders have matching48×64 dimensions. Bright core overlays mark the actual attack targets, including remote arms. Automatic mouse-free/controller attacks aim at these targets too.

Arena objects are scoped to an individual boss, including all four final encounters. Support surfaces added for cover and upper routes are removed when the encounter or stage is cleared. Repeated room travel does not accumulate geometry.

Vecna's actual painted chest center is used for collision and auto aim. A basic slingshot can target it from the ground; a sword attack requires jumping up to the chest. The arm's cyan node and both core targets use measured artwork coordinates, avoiding a second detached glow or a hitbox at the feet.

The built-in image generation tool produced all six atlases. Original prompt specifications are in `tactical-boss-art-prompts.json`; originals remain in the generation output directory and project copies are included in the repository.

## Focused verification

Pure rules and arena checks cover armor/exposure, bounded holds, attack phases, pylon placement, jumpability and separate encounter identity. `tests/tactical-bosses.html` exercises actual Phaser projectiles, automatic sword aim, psychic effects, devices, physical cover, crouch/jump defenses, stage-ten variants and cleanup. Existing harness boss checks use these same helpers to avoid divergent expectations.
