# Living enemies

Goal: preserve existing tactical bosses while adding genuine frame animation and distinctive ordinary-enemy attacks.

Implementation decisions: generated four-frame loops per boss state, grounded pivots, restrained continuous breathing, no physics-body resizing. Zombie jumps only from ground toward a visible hero after a crouch cue. Black crawler crouches, rushes in a locked direction, then recovers; cannot instantly reverse or dash off its patrol platform. Pause freezes all motion.

- [x] Generate and inspect matching transparent boss and enemy sheets; normalize cell dimensions, scale and ground anchors. Record prompts and frame metadata.
- [x] Add enemy action timing and frame helpers, focused tests for cooldown, grounded launch, locked rush direction and frame loops. Integrate jump/rush into GameScene.
- [x] Animate BossDirector in idle, windup, attack, flight and exposed states; retain core hit positions and planted feet. Animate even before aggro.
- [x] Run focused unit checks, TypeScript, a real-engine animation/attack check and Pages build. Review patch once, publish to main and verify deployment.

Verification budget: affected checks only, per workspace AGENTS.md. Existing main checkout is clean; continue there per user's direct repository workflow.

Verification: 11 focused unit checks passed; TypeScript and Pages build passed; real Phaser harness passed boss frame loops, fixed ground pivots, powered-up arm damage/immunity, zombie launch, crawler rush and recovery. Read-only review confirmed the initial slam remains distinct from later hand contact.
