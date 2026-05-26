# Reckless Drivers v1 Design Spec

## Scope And Non-Goals

This document defines a production-minded v1 design for Reckless Drivers in Neon Road Rally. It is a design spec only. It does not change gameplay code, Road Director logic, spawning, physics, scoring, save data, leaderboards, controller behavior, Drift Dash tuning, Neon Flow, or official route signatures.

Reckless Drivers are not a traffic simulation. They are a narrow set of readable, deterministic traffic behaviors that make the road feel more human without creating random lane-switching obstacles.

The v1 target is simple:

- Make some traffic feel impatient and dangerous.
- Make every dangerous move readable before it happens.
- Keep official routes deterministic.
- Protect high-speed fairness and couch readability.
- Create new lane-planning and Drift Dash moments without changing car handling or scoring.

## 1. Mechanic Goals

Reckless Drivers exist to add emotional pressure between static obstacle patterns. Current blockers ask: "Which lane is open?" Reckless Drivers add: "Which lane is about to become unsafe?" That gives the road more life while keeping the same top-down arcade readability.

They should feel like dangerous impatient humans making readable mistakes:

- A driver starts drifting toward a gap because they want to pass.
- A driver hesitates, flashes intent, then commits.
- A driver realizes a lane is bad and corrects back before fully entering it.

They should not feel like random AI cars. The player should be able to point at the screen and say: "That car told me it was coming over."

Reckless Drivers differ from static blockers in three ways:

- They create time pressure after the player has already read the first traffic pattern.
- They reward looking ahead, not just reacting to the nearest obstacle.
- They create controlled lane-commitment tests where Drift Dash can be the right answer, but not the only answer.

They fit Neon Road Rally because the game is already about music-shaped pressure, clean lane reads, official route mastery, and couch-readable danger. Reckless Drivers should make the road feel more alive while preserving the game identity: fast, fair, deterministic, readable.

## 2. Fairness Rules

These are hard v1 rules. If implementation cannot satisfy them, Reckless Drivers should not appear in that situation.

### Movement Fairness

- No instant lane teleporting.
- No lane change without a visible telegraph.
- No more than one lane of lateral movement per committed reckless action in v1.
- No diagonal "snap" across lane centers.
- A reckless car must spend visible time biased toward the target lane before crossing the lane divider.
- Once the crossing phase begins, the target lane must remain predictable. It cannot retarget mid-crossing.
- If a move is cancelled, it must clearly return to the original lane and then become non-reckless for a cooldown window.

### Spawn Fairness

- Reckless Drivers may not spawn directly in the player's current lane inside the reaction window.
- Reckless Drivers may not spawn already mid-merge.
- Reckless Drivers may not spawn in a state that requires immediate Drift Dash to survive.
- Reckless Drivers may not spawn behind, on top of, or visually overlapping an existing obstacle.
- Reckless Drivers must enter as ordinary readable traffic first, then telegraph later.

### Minimum Reaction Windows

Reaction windows are measured from first clear telegraph to first possible collision with the player's current lane if the player does nothing. The first implementation should compute this from current speed and object distance, not from fixed pixels.

Minimum v1 windows:

| Speed class | Minimum telegraph-to-conflict window | Minimum visible bias before lane crossing |
| --- | ---: | ---: |
| Rookie / Training | Disabled by default | Disabled |
| Arcade | 1.35s | 0.55s |
| Pro | 1.20s | 0.50s |
| Turbo | 1.05s | 0.45s |
| Overdrive | 0.95s | 0.40s |
| Redline | 0.85s | 0.35s |

The Redline window is allowed to be shorter because expert speed is part of the mode, but it must still be visually obvious. If visual testing shows couch players cannot read it, Redline should reduce frequency before reducing fairness.

### Lane Escape Rules

- At least one stable escape lane must remain available through the conflict window.
- V1 should prefer leaving two plausible lanes open when near other pressure objects.
- A reckless move may not combine with static blockers to create a full-road wall.
- A reckless move may not force a lane chain where every legal dodge immediately collides with another object.
- A reckless move may not require perfect frame timing.
- Drift Dash may be useful, but normal lane movement must be viable in at least some readable cases.

### Restrictions Near Rewards And Special Objects

Reckless Drivers should not steal the purpose of existing readable reward objects.

- No reckless lane crossing inside the immediate approach to a ramp.
- No reckless lane crossing inside the immediate landing or recovery zone after a ramp.
- No reckless lane crossing that covers a boost pad after the boost lane is already committed.
- No reckless lane crossing that makes a visible gas can unsafe after the player has entered the pickup lane.
- No reckless lane crossing that hides or overlaps an official route-critical object.

Initial recommended exclusion windows:

- Ramp approach: no crossing if the reckless car can reach the ramp lane within 1.25s of player arrival.
- Ramp landing: no crossing into the landing lane for 1.0s after expected landing.
- Boost pad approach: no crossing into a boost lane once the player is inside 1.0s of the pad.
- Gas can approach in Fuel Run: no crossing into the gas lane once the player is inside 1.2s of pickup.

These are design targets. Implementation should translate them into existing world-distance and speed calculations.

### High-Pressure Pattern Restrictions

Reckless Drivers should not stack on top of existing maximum-pressure moments.

Do not allow reckless actions during:

- Existing Road Director patterns already near the active-field pressure cap.
- Full-width or near-full-width blocker gates.
- Tight slalom sections that already require rapid lane alternation.
- Heavy Fuel Run gas rescue moments.
- Official route sections marked or behaving like final-push maximum pressure.
- Bonus Survival sequences if the active pattern already has dense traffic pressure.

If the Road Director cannot prove the pattern is safe, it should skip the reckless action instead of weakening the fairness rules.

### Determinism

- Reckless behavior on official routes must be fully deterministic from the official route seed and route setup.
- No wall-clock time, browser timing, frame-rate jitter, input timing, or random `Math.random()` calls may decide a reckless move.
- Reckless action selection, target lane, telegraph duration, commit timing, cancel decisions, and cooldowns must come from the same deterministic run RNG stream or a clearly derived deterministic substream.
- A replay of the same official route, race type, speed class, track, and seed must produce the same reckless traffic schedule.
- Playground/custom runs may vary by seed, but still must be deterministic for that selected seed.

## 3. Behavior Vocabulary

V1 should be intentionally narrow. Three readable behaviors are enough.

### V1 Allowed: Slow Drift Merge

A traffic car gradually biases toward an adjacent lane, signals, then crosses one lane at a steady lateral rate.

Use cases:

- Human-feeling lane pressure.
- Teaches the player to read lane bias early.
- Creates a clear "I should leave that lane soon" moment.

Rules:

- Adjacent lane only.
- Single target lane.
- No retargeting.
- Must have the full telegraph window.
- Must not begin if target lane safety cannot be proved.

### V1 Allowed: Aggressive Overtake

A faster reckless car moves one lane around slower traffic after a stronger telegraph. It should look impatient, not chaotic.

Use cases:

- Mid-route pressure on Pro and faster.
- More dramatic than Slow Drift Merge.
- Encourages lane planning across two or three lanes.

Rules:

- Adjacent lane only.
- Requires more forward distance than Slow Drift Merge.
- Must not occur near ramps, boost pads, or gas cans.
- Must not occur while another nearby reckless action is active.
- Should be rare on Arcade and moderate only on Turbo or faster.

### V1 Allowed: Panic Correction

A reckless car begins a telegraphed merge, then visibly abandons it and returns to its original lane because the target lane becomes invalid.

This is an escape hatch for fairness, not a trick behavior. The cancel must reduce danger, not create a second surprise.

Rules:

- May only happen before the car crosses the lane divider.
- Must show a visible wobble or brake tell.
- After cancel, the car becomes ordinary traffic for a cooldown.
- It must not become a fake-out used to bait the player.

### Future Only: Double-Lane Weave

A car changes one lane, settles, then later changes another lane. This could be exciting later, but it is not v1.

Future requirements:

- Two separate telegraphs.
- A settle window between moves.
- Strong route-section gating.
- Dedicated visual QA at Turbo, Overdrive, and Redline.

### Explicitly Banned In V1

- Instant lane jumps.
- Two-lane swerves.
- S-curves inside one conflict window.
- Chasing the player lane.
- Retargeting toward the player's current lane after input.
- Last-second "gotcha" merges.
- Reckless cars emerging from offscreen already crossing lanes.
- Multiple reckless cars weaving in the same local field.
- Reckless behavior during ramp landing commitment.
- Any behavior that requires hidden AI prediction of player input.

## 4. Telegraph Language

The telegraph is the mechanic. If the tell is not readable, the movement should not happen.

### Visual Tells

V1 should use a layered tell:

1. Lane bias: the reckless car leans or slides slightly toward the intended lane.
2. Turn glow: a small amber or neon side indicator appears on the target side.
3. Brake or impatience pulse: a short rear-light pulse signals unstable human behavior.
4. Commit motion: the car crosses the lane divider at a steady, readable lateral speed.

The tell should be visible even on a TV from couch distance. It should not depend on tiny sprite details alone.

### Timing

Recommended total sequence:

- Intent tell: 0.20s to 0.30s.
- Lane bias hold: speed-class-scaled minimum from the fairness table.
- Crossing: 0.30s to 0.45s, never instant.
- Settle: 0.25s minimum before any other special behavior.

At higher speed classes, distance-to-conflict shrinks, but the tell must still start earlier in world space so the player sees it before danger.

### Audio

Audio is optional for v1. If used, it should be subtle:

- A short tire chirp or impatient engine blip at intent start.
- No loud warning siren.
- No cue that competes with music-shaped pacing or crash/boost sounds.

Audio must be supplemental. The visual tell must be sufficient with sound off.

### Player Readability Test

A successful Reckless Driver should pass this simple test:

- First run: "That car is doing something."
- Second run: "That car is moving left/right."
- Third run: "I can plan around that."

If playtesters describe it as random, the behavior has failed even if the math says it is avoidable.

## 5. Road Director Integration

Reckless Drivers should be Road Director-authored pressure, not independent AI chaos.

### Allowed Sections

Best v1 placement:

- Mid-route groove sections after the player has settled into speed.
- Traffic pressure sections with room to breathe.
- Late-route moments where the road has clear lanes and fewer reward objects.
- Official route feel tags that already imply lane discipline or traffic pressure.

Avoid v1 placement:

- First seconds of a run.
- Immediate post-crash/restart recovery.
- Ramp-heavy routes unless the reckless action is far from ramp approach/landing.
- Boost-chain sections.
- Fuel rescue windows.
- Maximum-density final pushes.
- Blackout visibility-limited sections unless the tell is boosted for contrast.

### Frequency Scaling

The v1 frequency should be low enough that Reckless Drivers feel special.

Suggested maximum committed reckless actions per full run:

| Speed class | Suggested max per run | Notes |
| --- | ---: | --- |
| Rookie / Training | 0 | Disabled until proven kid-readable. |
| Arcade | 1 | Optional tutorial-level encounter only. |
| Pro | 2 | Primary introduction speed. |
| Turbo | 3 | Standard v1 target. |
| Overdrive | 3 | Use longer spacing, not more chaos. |
| Redline | 2-3 | Fewer but cleaner tells. |

Per-local-field cap:

- Only one active reckless telegraph or merge in the lower active field.
- No second reckless action until the first has settled and left the danger window.
- Minimum spacing between reckless actions should be at least 4.0s on Arcade/Pro and 3.0s on Turbo or faster.

### Official Route Determinism

For official routes, Reckless Drivers must be part of the seeded Road Director plan. The same official route must always produce:

- Same reckless car spawn opportunity.
- Same source lane.
- Same target lane.
- Same telegraph timing.
- Same merge timing.
- Same cancellation decision, if any.

The system can skip a reckless action if safety validation fails, but the skip itself must be deterministic.

### Music-Shaped Pacing

Reckless Drivers should be placed like musical accents:

- Use them as tension notes before or after a pressure phrase.
- Avoid putting them on every beat.
- Avoid creating visual noise during high-density musical peaks.
- Give the player a readable release after a successful dodge.

They should support the road's rhythm. They should not turn the game into a reaction spam lane-switcher.

### Endurance Continuation

During Official Finish + Bonus Survival or other continuation pressure:

- Reckless Drivers may appear only if the local pressure budget is low.
- Frequency should be capped lower than the main route.
- No reckless action should appear immediately after the official finish handoff.
- The system should favor Slow Drift Merge only.

## 6. Drift Dash Interaction

Reckless Drivers should make Drift Dash feel more valuable without making it mandatory.

Good Drift Dash opportunities:

- A reckless merge threatens the player's lane and a clean two-lane escape is visible.
- A normal lane move is possible early, but Drift Dash lets skilled players hold a riskier score/racing line longer.
- A player can use Drift Dash to escape an aggressive overtake while staying near a boost or score opportunity.

Bad Drift Dash requirements:

- The player must Drift Dash instantly or die.
- The player must Drift Dash into a lane that was not readable before the telegraph.
- The player must know hidden future traffic to survive.
- The reckless car tracks or punishes the player's Drift Dash choice.

Lane commitment matters because the reckless car should make one lane less trustworthy over time. The player chooses whether to leave early, hold and Drift Dash late, or route around the danger through a safer lane.

## 7. Visual Readability Constraints

Reckless Drivers must fit the existing readability budget.

Hard constraints:

- The lane destination must be readable before the car crosses the lane divider.
- The tell must work at high speed and couch distance.
- The tell must not rely only on tiny turn-signal pixels.
- The car must not hide the lane line during the tell.
- Reckless cars need a distinct but restrained visual treatment, such as a small amber side glow or unstable wobble.
- Do not add large particle effects during racing.
- Do not add heavy aura effects in the active road.
- Do not cover boost pads, ramps, gas cans, or lane markers with telegraph effects.

Track-specific readability:

- Sunset Highway: standard v1 contrast is acceptable.
- Redline Run: avoid overusing red telegraphs against red track elements; amber/cyan contrast is safer.
- Midnight Ridge: tells should stand out without looking like road reflectors.
- Blackout Run: tell brightness must be higher, but count must be lower.
- Prism Highway: avoid rainbow-noise indicators; use one consistent reckless-driver tell color.

The player should never need to parse more than one reckless telegraph at a time.

## 8. Technical Risk Notes

### Determinism Drift

Risk: Reckless behavior accidentally uses frame timing, browser timing, or non-seeded randomness.

Mitigation:

- Use deterministic route/run RNG only.
- Record reckless schedules in debug/playtest report.
- Add route determinism checks before enabling in Official Race.

### Collision Fairness

Risk: A visually readable merge still collides because hitboxes or interpolation do not match the sprite.

Mitigation:

- Tie collision lane occupancy to the same lane-crossing phases shown visually.
- Consider a conservative "warning phase" where the car is not yet collision-active in the target lane.
- Test near misses at Redline speed and with Drift Dash.

### Performance

Risk: Animated telegraphs, glows, and extra validation add browser repaint cost.

Mitigation:

- Use simple sprite-state changes and small glow elements.
- Avoid per-frame DOM work.
- Keep all race visuals in canvas.
- Limit active reckless actors.

### Animation Timing

Risk: Merge animation duration varies with frame rate, making timing unfair.

Mitigation:

- Drive movement from deterministic elapsed simulation time, not rendered frames.
- Clamp large delta spikes.
- Log telegraph start, crossing start, and settle timestamps in debug reports.

### Overlapping Telegraphs

Risk: A reckless tell overlaps with ramps, boost pads, gas cans, score callouts, or another reckless car.

Mitigation:

- Add a local-field reservation system.
- Require object and lane reservations before allowing a reckless action.
- Skip actions instead of compressing tells.

### Road Director Conflict Cases

Risk: The Road Director schedules a fair static pattern, then Reckless Drivers make it unfair after movement.

Mitigation:

- Validate after planned reckless movement, not just at spawn time.
- Reserve source lane, target lane, and conflict window.
- Include reckless movement in active-field pressure calculations.

### Browser Repaint Cost

Risk: Extra glow effects or debug overlays harm menu/race performance.

Mitigation:

- No DOM overlays for active reckless telegraphs.
- No large screen-space blur.
- No persistent debug panels outside local/debug mode.

## 9. Rollout Plan

### Stage 0: Design Lock

Before implementation, decide:

- V1 includes only Slow Drift Merge, Aggressive Overtake, and Panic Correction.
- Rookie/Training stays disabled.
- Official routes require deterministic schedule proof.
- No score, speed, leaderboard, save, or physics changes.

### Stage 1: Internal Minimal Implementation

Implement behind a local/debug flag or narrow feature gate first.

V1 build should include:

- One reckless actor at a time.
- Adjacent-lane movement only.
- Seeded behavior selection.
- Telegraph timing by speed class.
- Safety validation against current active-field pressure.
- Debug report rows for reckless action schedule and skips.

### Stage 2: Non-Official Smoke And Feel Test

Test first in Playground/custom runs.

Playtest goals:

- Players can identify the target lane before movement.
- Players blame themselves when they crash, not randomness.
- Kids can understand "that driver was coming over."
- Adults find skill in holding a lane longer or Drift Dashing late.
- No one describes the mechanic as unfair or invisible.

Failure signs:

- "It came out of nowhere."
- "It changed lanes into me."
- "I could not tell where it was going."
- "The only way out was Drift Dash."
- "The road became too busy to read."

Any of those should cause timing, frequency, or behavior count reductions before adding complexity.

### Stage 3: Official Route Determinism Gate

Before Official Race eligibility:

- Same official route seed produces identical reckless schedules.
- Time Attack and Score Attack remain unchanged except for the new traffic challenge.
- Existing official route signatures are intentionally updated only if the feature is formally accepted into Official routes.
- Route determinism checks include reckless schedules and skip decisions.
- No Playground/custom record data mixes into Official boards.

If official route signatures must stay frozen for a release, Reckless Drivers should remain disabled in Official Race until a planned route-version update.

### Stage 4: Limited Official Route Rollout

Enable only on selected route feel tags first:

- lane discipline
- traffic pressure
- final push, only when pressure budget allows

Avoid first official rollout on:

- ramp route
- boost chain
- headlight read
- dense Blackout sections

### Stage 5: Rollback And Rework Criteria

Rollback or disable Reckless Drivers if:

- Determinism checks fail.
- Any official route creates unavoidable cross-lane deaths.
- Browser performance drops noticeably.
- Playtesters consistently call it random.
- Drift Dash becomes required instead of optional skill expression.
- Blackout or Prism readability suffers.
- Route records become suspect because behavior differs across runs.

The mechanic should earn its place by making the road feel more alive and more skillful while staying fair. If it cannot do that with a narrow v1, do not expand the vocabulary. Tighten the rules.

## Recommended V1 Scope

Ship the first implementation only when it can satisfy this scope:

- One reckless action active at a time.
- Adjacent-lane movement only.
- No v1 double-lane weave.
- Strong visual telegraph with speed-class-specific minimum windows.
- No reckless crossings near ramps, boost pads, gas cans, or high-pressure gates.
- Deterministic schedule for official routes.
- Low frequency, especially at Redline and Blackout.
- Debug/playtest report visibility before normal release.

The goal is not smarter traffic. The goal is fair, readable, human-feeling danger.
