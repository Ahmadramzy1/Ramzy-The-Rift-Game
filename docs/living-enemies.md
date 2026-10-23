# Living enemies

Forty newly generated transparent frames extend the existing enemy identities. `mf-living.png` and `vecna-living.png` have sixteen 256px cells each; `husk-jump.png` and `crawler-rush.png` have four 128×112px cells each. Built-in image_gen produced the art; exact prompts are in `living-enemy-art-prompts.json`. `scripts/prepare-living-assets.py` extracts source cells with a single scale per character and a common grounded pivot, retaining alpha. Measured frame bounds are in `public/assets/living-frames.json`.

Boss animation uses the gameplay clock, including inactive encounters. Idle, anticipation, psychic channel, casting, leap and exposed states use fitted frame loops plus slight breathing. Vecna retains the authored exposed-chest pose to keep its tactical core aligned; its breathing and core pulse continue. Animation never changes physics body size. Game pause freezes animation.

Mind Flayer extraction uses sixteen individually measured source rectangles, rather than equal-height rows: the generated source has uneven gutters and tentacle tips cross the nominal row boundaries. The corrected atlas excludes all neighboring sprites, preserves the 240px foot baseline and fits the 161px reference body to 136 world pixels. Its loader URL is versioned to invalidate the previous cached image.

Zombie husks crouch for 280ms, jump once from grounded contact and commit forward during flight. Black crawlers telegraph for 300ms, rush for 390ms then recover for 320ms. Both require a visible approaching hero within 260px and 90px vertical distance, and have a 2400ms cooldown. Rush direction is locked at anticipation, with patrol boundaries stopping forward movement. Existing contact damage and stomp remain in effect.

A planted, uncut Mind Flayer hand damages overlapping heroes for one heart, including a powered-up hero. Existing 1800ms immunity prevents repeated contact damage. Telegraphs and severed remnants are harmless. The initial heavy ground-slam impact and emitted waves retain their existing two-heart damage.

Focused verification: `tests/enemyActions.test.ts`, `tests/bossArmContact.test.ts`, existing boss rules; browser harness `tests/living-enemies.html` checks real Phaser frames, ground anchors, hand contact, invulnerability, jump/rush and return to walking.
