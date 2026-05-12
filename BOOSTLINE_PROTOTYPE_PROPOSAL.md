# Boostline Prototype Proposal

## Goal

Test whether Neon Road Rally can support a pure time-first race format where the skill is learning a fixed boost/ramp line, committing to lanes, and shaving time through repeatable execution.

## Prototype

- Race type: Boostline
- Prototype route: Neon Palm Boostline
- Track: Sunset Highway
- Speed class: Turbo
- Competition scope: one playable Official-route-style prototype
- Core loop: chase boost chains, hit ramp shortcuts, recover cleanly, and finish as fast as possible

## Why This Is Separate From Classic

Classic Official Routes still use the live Road Director for routecraft. Recent playtest findings showed that the route signatures still vary too much across live runs, which makes them a weak fit for a pure race feel. Boostline should not try to solve that by making the live director more deterministic.

Boostline uses a fixed distance-authored route spine. The same route script is generated from route distance/progress every time, independent of frame cadence or live player timing. Player behavior can affect collection, chain quality, crash outcome, and finish time, but not the authored route sequence.

## Route Structure

Neon Palm Boostline uses five readable phases:

- Launch: easy center boost line to teach the route.
- Groove: left/right lane commitments with light blockers shaping the fast line.
- Pressure: boost chain into ramp shortcut with blocker framing.
- Breather: short recovery and ramp setup.
- Final Push: risky final boost/ramp chain for best time.

## Implementation Plan

1. Add a prototype-only `boostline` race type.
2. Keep Boostline out of player-facing Classic/Fuel toggles, Party rules, badges, and normal Official 10 grids.
3. Add one prototype route record, `boostline-neon-palm`, with a fixed Sunset Highway / Turbo seed.
4. Add a Boostline route script that places boosts, ramps, blockers, recovery lanes, and final-push gates by route progress.
5. Add a Boostline route signature version/hash that includes authored wave distance and obstacle distance.
6. Add a small prototype card in the Official Race Board for direct testing.
7. Update results for Boostline so the first viewport prioritizes finish time, PB delta, boost chain quality, ramps hit/missed, and one measured note.
8. Add targeted checks for signature stability, route content, lower survival pressure than Classic, no impossible walls, no visible spawn violations, and stable performance.

## Non-Goals

- No 10-30 route expansion.
- No Party support.
- No badge support.
- No ghost car.
- No new tracks.
- No Pursuit reintroduction.
- No Classic/Fuel scoring, speed, physics, hitbox, Party, badge, camera, save-schema, or existing Official Route record changes.

## Safety Decision

The implementation is safe if Boostline remains a prototype-only branch with its own route script and route signature, and if the existing Classic/Fuel and Party checks remain green. The first prototype should be implemented because it is isolated, testable, and does not require retuning the core Road Director.
