# Longer routes, kill bounties and Vecna impact

Main routes increase by 600 world units per stage: 3340, 3940, 4540, 5140, 5740, 6340, 6940, 7540, 8140 and 8740. Dungeons increase by 240: 2230 to 4390. New playable rooms, collectibles and encounters extend each route while preserving the opening geometry. Jump gaps remain achievable without the purchased double jump. Checkpoints move toward the route midpoint.

Stage ten has four separate 900-unit arenas: Mind Flayer at 4450, Vecna at 5730, Mind Flayer at 7010 and Vecna at 8290. The main exit requires all four to be defeated. Their HP remain 60 and 100 respectively. The stage-five dungeon retains four guards and its single final Vecna.

Kill bounties are credited immediately once per defeated enemy: crawler/bat 2; husk/slime/bloom/Billy 5; Mind Flayer 40; Vecna 80. Room travel preserves earned bounty and killed-enemy sets. HUD coins include floor coins and combat earnings; collectible-star completion still uses only authored pickups. The dungeon's stage-end 2x bonus includes combat earnings.

Vecna detects the hero within 1100 units (previously 640), without the old arena-entry condition, and makes its first leap after a 900ms warning cycle. Subsequent attack starts retain the three-second cycle. Each landing creates an animated red/violet explosion and two ground-hugging waves. The waves deal three hearts on grounded contact; jumping clears them. They stop at pits, expire after 900 units and cancel when their source is killed or psychically controlled. Damage invincibility prevents double damage from blast/contact/waves in one landing.

`public/assets/vecna-impact.png` was generated with the built-in image tool as an eight-effect transparent atlas: four blast stages plus four rightward traveling wave stages. Runtime frames preserve alpha, mirror for leftward motion and anchor to measured visible ground baselines. No external download or creative image post-processing was used.

Focused verification covers route reachability, final boss placement, exact bounties and Vecna behavior. The real Phaser harness has `?progressionOnly` for the three affected checks: actual waves/explosion, reward persistence/multiplier and long-route/final-gate behavior.

Results: 11 route/dungeon unit checks and three bounty/Vecna unit checks passed. All three real Phaser progression checks passed, including traversable endpoints in all ten extended stages. TypeScript, the Pages build and packaged asset check passed. Read-only review found no important issues.
