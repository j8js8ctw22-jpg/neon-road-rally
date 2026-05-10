# Neon Road Rally Pursuit Mode Proposal

## Purpose

Design a family-friendly pursuit race type for Neon Road Rally that adds chase tension, route pressure, and party-room excitement without turning the game into a crime game or violent GTA-style fantasy.

Pursuit Mode is not about doing crimes, fighting police, or causing destruction. It is about the universal arcade fantasy of being chased: sirens behind you, roadblocks ahead, pressure rising, and one question in the player's head: can I escape?

## 1. Mode Fantasy

Pursuit Mode is a high-speed chase variant built around sirens, pressure, roadblocks, and escape tension.

The player is already on the road when the pursuit begins. The game does not need a crime story. The fantasy is closer to an arcade chase scene, a playground game of tag, or a cartoon getaway than a realistic police simulator.

Core feeling:

- Sirens start pulsing.
- The Heat Meter climbs.
- Roadblocks appear ahead with readable escape gaps.
- Police pressure pushes the player out of comfortable lanes.
- The final stretch becomes an escape run.
- Reaching the safe zone feels like a clean getaway.

This should feel intense, fast, and dramatic, but still family-friendly. The thrill comes from pressure and evasion, not violence.

## 2. Why Kids Will Like It

Pursuit is easy for kids to understand immediately because the fantasy is direct:

- Being chased is instantly legible.
- Sirens create excitement before the danger appears.
- Roadblocks feel dangerous without showing injury or violence.
- "Can I escape?" is a simple, repeatable goal.
- The mode creates good party tension because spectators can see the trap forming.
- Escaping at the last second is satisfying even when the score is not perfect.
- It creates a different emotional flavor from normal racing without adding complicated controls.

The best version feels like a high-energy cartoon chase. The player is not punished for understanding a complicated system. They are challenged to read the road, stay calm, and find the gap.

## 3. How It Differs From Classic And Fuel Run

| Mode | Core Question | Main Pressure | Player Read |
| --- | --- | --- | --- |
| Classic | Can I survive and score well? | Obstacle waves, speed, boosts, near misses | Read traffic, dodge hazards, chase score |
| Fuel Run | Can I route through fuel without running dry? | Fuel drain, gas-can placement, risky pickups | Plan lanes around survival resources |
| Pursuit | Can I escape while heat rises? | Heat, sirens, roadblocks, pressure lanes | Read warnings, dodge gates, find escape gaps |

Classic should remain the baseline survival and score mode.

Fuel Run should remain the routing-pressure mode.

Pursuit should become the chase-pressure mode: fewer resource decisions than Fuel Run, more dramatic warnings and escape beats than Classic.

## 4. Core Mechanics

### Heat Meter

Heat is the mode's main pressure gauge. It is not a crime meter. It represents how close the chase is to catching the player.

Recommended behavior:

- Heat rises during pursuit waves.
- Heat rises faster in high-intensity sections.
- Heat can spike when the player clips a roadblock, hits a heavy slowdown, or stays in a pressure lane too long.
- Heat drops during recovery windows or after cleanly passing a roadblock.
- At max heat, the player is `Busted` unless v1 chooses to make max heat only trigger a final danger state.

The meter should be simple: low, medium, high, critical. Kids should know when they are in trouble without reading a manual.

### Pursuit Pressure

Pursuit pressure is the Road Director's chase budget for the current moment. It decides how aggressive the road can become.

Pressure should control:

- How often roadblocks appear.
- How narrow the escape gaps become.
- Whether police pressure objects appear.
- How much warning time the player gets.
- How long recovery windows last.

Pressure should rise by section, not randomly. A run should feel composed: launch, chase builds, roadblock sequence, brief recovery, final escape push.

### Roadblocks

Roadblocks are the signature Pursuit obstacle.

They should be readable lane gates, not unfair walls. A roadblock can occupy several lanes with one or two visible escape gaps. The safest first pass is to build roadblocks from existing hard-blocker logic and clear lane patterns.

Roadblock rules:

- Always telegraph with `Roadblock Ahead`.
- Always leave at least one readable escape gap.
- Avoid same-frame surprise blocks.
- Avoid placing a roadblock immediately at run start.
- Do not combine a roadblock with another full-width pressure pattern.
- Make the gap obvious through spacing, lights, or lane markers.

### Police Cars As Pressure Objects

Police cars can eventually become moving pursuit objects, but they are risky for v1 if they require new AI, lane pursuit logic, collision rules, and art.

Safer first-pass options:

- Canvas-drawn police markers.
- Flashing red/blue lane blockers.
- Static roadblock cars used as obstacle silhouettes.
- Non-AI pressure markers that occupy lanes like existing traffic/hard blockers.

Police cars should pressure the player, not become targets. The player should not be rewarded for hitting them.

### Safe Zone / Escape Finish

The final stretch should clearly shift the fantasy from "survive the chase" to "escape now."

Possible safe-zone behavior:

- At 90 percent progress, show `Escape Zone`.
- Heat starts dropping if the player stays clean.
- Roadblocks become fewer but more dramatic.
- Crossing the finish with heat below the fail state produces `Escaped`.

The escape finish should be a payoff moment. It should feel different from simply finishing a Classic run.

### Siren Warning

Siren warning is the mode's main anticipation tool.

Use it before danger, not only during danger:

- Siren pulse starts before a roadblock wave.
- HUD flashes lightly during pursuit pressure.
- `Roadblock Ahead` appears before the block enters the main decision zone.
- Warning intensity should match actual danger.

The warning should help the player trust the game. If the siren lies too often, players stop reading it.

### Pursuit Intensity By Section

Pursuit should follow track sections:

- Launch: low heat, first siren sting, no cheap roadblock.
- Build: first pressure lanes and easy roadblock gate.
- Chase: heat rises, roadblocks become more frequent.
- Recovery: heat drops, one readable breather window.
- Escape: final push, high pressure, clear safe-zone payoff.

This fits Neon Road Rally's existing music-shaped race direction. Pursuit should feel like a chase scene inside the song, not a random pile of hazards.

### Optional Helicopter / Searchlight Later

A helicopter or searchlight can become a later visual-pressure system:

- Searchlight sweeps lanes before a roadblock.
- Spotlight marks a dangerous lane.
- Helicopter audio raises tension.
- It should be visual pressure first, not a separate enemy system.

This should wait until the base Pursuit loop is fun.

## 5. What Not To Add

Pursuit Mode should explicitly avoid:

- Weapons.
- Shooting.
- Ramming police as a goal.
- Pedestrians.
- Injury or violence.
- Crime systems.
- Wanted stars tied to crimes.
- Money economy.
- Shop upgrades tied to pursuit success.
- Real-time multiplayer.
- Arrest animations that feel harsh or realistic.
- Any scoring incentive for destruction.

The tone should stay arcade, readable, and family-friendly.

## 6. Player Goal Options

| Goal Option | Strength | Weakness | V1 Fit |
| --- | --- | --- | --- |
| Survive until finish | Easy to understand and matches existing race structure | May feel too close to Classic if heat is only decoration | Good |
| Outrun heat | Strong mode identity and makes the Heat Meter matter | Needs clear heat rules so players understand why they win or lose | Good |
| Reach safe zone | Best fantasy payoff: escape has a destination | Requires clear final-zone UI and result language | Best |
| Survive a timed pursuit | Simple party format and good for challenge packs | Less connected to track progress and current finish structure | Later |

Recommended v1 goal: **Reach the Escape Zone and finish before heat overwhelms you.**

This preserves the existing lane-race structure while giving Pursuit a different emotional arc. The player still drives to the finish, but the finish is framed as an escape zone, and the Heat Meter gives the run a chase-specific fail pressure.

Suggested v1 result rules:

- `Escaped`: player reaches the finish / escape zone without crashing or maxing heat.
- `Busted`: heat reaches the fail threshold.
- `Crashed`: player hits a crash-ending obstacle.

## 7. Road Director Integration

Pursuit should be a Road Director pattern family, not a separate random spawner.

The Road Director should create pursuit waves using:

- Roadblock gates: multi-lane blocker patterns with clear escape gaps.
- Police pressure lanes: lanes that become temporarily unsafe or crowded.
- Escape gaps: explicitly chosen safe routes through the wave.
- Recovery windows: short breathers after successful roadblocks.
- Siren warning: warning state before roadblocks, not after.
- Section intensity: pressure scales with launch/build/chase/recovery/escape sections.

Rules the Road Director must protect:

- No impossible walls.
- No cheap starts.
- No hidden roadblocks without warning.
- No stacking roadblocks on top of hard traffic walls.
- No lane gap that becomes unreadable because of another object.
- No same-lane reward/object overlap that baits the player into a crash.
- No final stretch that becomes impossible after one mistake.

The director should think in complete pursuit sentences:

- Warning.
- Pressure.
- Roadblock.
- Escape gap.
- Recovery.
- Escalation.

If a wave cannot provide that structure, it should not spawn.

## 8. Track Support

### Sunset Pursuit

Sunset Pursuit should be the first and cleanest version.

It should use the balanced Sunset Highway identity: warm arcade chase, readable roadblocks, medium pressure, and a clear escape finish. This is the best place to teach the mode because the track already supports a broad object mix and general-purpose Road Director pressure.

### Redline Pursuit

Redline Pursuit should be the speed dare version.

It should use fewer clutter objects, faster roadblock reads, and sharper lane commitments. Redline should feel like a neon expressway chase: cleaner, faster, and more precise. It should probably ship after Sunset Pursuit proves the base rules.

### Future Midnight Backroad Pursuit

Midnight Backroad Pursuit could be the suspense version later.

It should use headlights, tail lights, siren flashes, searchlight-style warning, and darker roadblock silhouettes. This is likely a strong future fit, but only after the warning language is reliable enough that low visibility feels tense instead of unfair.

## 9. UI / HUD

Pursuit UI should be clear and compact.

Recommended HUD elements:

- Heat meter: the main mode gauge.
- Siren pulse: light visual pulse when a pursuit wave is building.
- `Roadblock Ahead`: short warning before a roadblock enters the decision zone.
- `Escape Zone`: final-stretch callout.
- `Heat Dropping`: recovery feedback when the player clears pressure.
- Result statuses: `Escaped`, `Busted`, `Crashed`.

The HUD should avoid long explanations during the run. Use words kids can read quickly. Let color, pulse, and position carry the pressure.

## 10. Scoring

Pursuit scoring should add identity without becoming a spreadsheet.

Possible score additions:

- Heat survived bonus.
- Clean escape bonus.
- Near-miss bonus.
- Roadblock dodge bonus.
- No-crash escape bonus.
- Smart boost usage bonus.

Recommended v1 scoring:

- Base score remains familiar.
- Add a modest `Escaped` bonus.
- Add a `Roadblock Dodge` bonus for cleanly clearing roadblock waves.
- Add a `Clean Getaway` bonus for escaping without crashes or major slowdown hits.

Do not overcomplicate the first pass. The Heat Meter should create the pressure; scoring should reinforce the fantasy without requiring players to study formulas.

## 11. Badges

Suggested Pursuit badges:

| Badge | Trigger Direction |
| --- | --- |
| First Escape | Escape a Pursuit run for the first time. |
| Heat Survivor | Escape after reaching critical heat. |
| Clean Getaway | Escape without crashing or major slowdown hits. |
| Roadblock Dodger | Clear several roadblocks in one run. |
| Redline Escape | Escape on Redline Pursuit. |
| No-Boost Escape | Escape without using manual boosts. |
| Last-Second Escape | Escape while heat is critical near the finish. |
| Pursuit Master | Complete a high-intensity Pursuit run. |
| Siren Proof | Clear a run without letting heat reach critical. |
| Safe Zone Hero | Enter the escape zone under heavy pressure and finish. |

These should stay accomplishment-focused, not crime-focused.

## 12. First Implementation Scope

Pursuit v1 should use:

- Existing lane race system.
- Existing track/race type structure.
- Existing traffic and hard-blocker logic.
- Roadblock-style lane patterns.
- A simple Heat Meter.
- Siren / visual warning before roadblock waves.
- Result statuses: `Escaped`, `Busted`, `Crashed`.
- Canvas-drawn police markers or flashing red/blue blocker lights only if needed.
- No new art assets required for the first pass.

Pursuit v1 should not require:

- Full AI police cars.
- New collision model.
- New lane system.
- New save architecture beyond safe mode/result fields.
- New backend or online multiplayer.
- New story/crime layer.
- New economy.

The first implementation should prove that heat plus readable roadblocks is fun. If that works, police-car visuals can be upgraded later.

## 13. Future Expansion

Later Pursuit additions:

- Non-colliding pursuit ghost behind the player for pressure and spectacle.
- Helicopter spotlight or searchlight sweeps.
- Spike-strip equivalent only if it is fair, readable, and not visually mean.
- Special Pursuit challenges.
- Pursuit Party preset.
- Track-specific pursuit tuning for Redline and Midnight Backroad.
- More badge and title support after the core mode proves itself.

The best expansion path is atmosphere first, then smarter pressure, then more mode integration.

## 14. Risks

Key risks:

- The mode becomes unfair if roadblocks create walls.
- Visual chaos makes the road harder to read.
- Police cars feel like normal traffic unless their silhouette and light language are distinct.
- Heat Meter behavior becomes confusing if players cannot tell why it rises or falls.
- Siren warnings lose trust if they do not predict real danger.
- Scope creep pulls the mode into AI, story, economy, or online systems too early.
- The mode accidentally rewards hitting police objects or causing crashes.
- Classic, Fuel Run, Party, or Challenge behavior gets disturbed by shared Road Director changes.

The biggest design risk is unfairness. A chase mode can be hard, but it cannot feel cheap. The player must believe there was a gap and they missed it.

## 15. Acceptance Criteria

First pass succeeds if:

- Pursuit is instantly understandable.
- The Heat Meter creates real pressure.
- Roadblocks are readable before they matter.
- Siren warnings help players prepare.
- Escape feels exciting and distinct from a normal finish.
- There are no cheap starts.
- There are no impossible walls.
- A failed run clearly reads as `Busted` or `Crashed`.
- Classic remains intact.
- Fuel Run remains intact.
- Party Mode remains intact.
- Challenge Mode remains intact.

## 16. First Codex Implementation Prompt

Implement Pursuit Mode v1 for Neon Road Rally.

Do not rewrite the game architecture. Preserve Classic behavior exactly. Preserve Fuel Run behavior, Challenge Mode, Party Mode, local saves, leaderboard compatibility, player profiles, input behavior, speed tuning, and existing track behavior unless a narrow additive hook is required for Pursuit.

Goal: add a family-friendly `Pursuit` race type where the player reaches an `Escape Zone` finish before heat overwhelms them. This is not a crime/violence mode. Do not add weapons, crime systems, money, pedestrians, online multiplayer, or rewards for hitting police.

Recommended v1 scope:

- Add Pursuit as an opt-in race type beside Classic and Fuel Run where the existing UI pattern supports it safely.
- Use the existing lane race system and Road Director architecture.
- Add a simple Heat Meter with low/medium/high/critical states.
- Add siren/visual warning before pursuit waves.
- Add roadblock-style wave patterns using existing traffic/hard-blocker behavior, always with at least one readable escape gap.
- Add `Roadblock Ahead`, `Escape Zone`, and `Heat Dropping` callouts.
- Add result statuses: `Escaped`, `Busted`, and `Crashed`.
- Add modest Pursuit scoring hooks: escape bonus, roadblock dodge bonus, clean getaway bonus.
- Start with roadblocks, heat, warning, and simple canvas-drawn police markers/lights if needed. Do not implement full AI police cars in v1 unless it is clearly low-risk and isolated.

Road Director requirements:

- No cheap starts.
- No impossible walls.
- No roadblock without warning.
- No stacked roadblock plus hard-traffic wall.
- Include recovery windows after roadblock waves.
- Scale pursuit intensity by track section where existing section data is available.
- Keep Sunset Pursuit as the first supported track. Add Redline Pursuit only if the same system is safe and straightforward.

Validation expectations:

- Run syntax checks.
- Run existing deterministic/smoke checks that cover Classic, Fuel Run, Challenge, and Party.
- Add a narrow Pursuit verification path proving no impossible walls, no cheap starts, readable roadblock gaps, heat changes, and correct result statuses.
- Use browser smoke if UI/HUD is changed.
- Report exactly what files changed, what was validated, and whether full police-car AI was intentionally deferred.
