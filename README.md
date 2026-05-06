# Neon Road Rally

Neon Road Rally is a small local-only 80s arcade lane-dodging racer. It runs from `index.html` with plain HTML, CSS, and vanilla JavaScript. No server, build tools, accounts, networking, libraries, or external image files are required.

## How To Run

Open `index.html` directly in a modern browser.

The `audio/` folder can be empty. Missing music or sound effects are ignored safely, and the game still plays silently.

## Controls

- Up Arrow or W: move forward within the driving zone
- Down Arrow or S: move backward within the driving zone
- Left Arrow or A: move one lane left
- Right Arrow or D: move one lane right
- Space: use one manual boost
- Enter: start or confirm from title/score
- Esc: pause during a run, or back from most menus
- M: mute/unmute music
- N: mute/unmute sound effects
- Backtick: toggle debug mode

Debug mode also enables:

- R: restart run
- F: jump near the finish line
- C: force a crash
- L: view leaderboard
- P: run the spawn safety simulation
- H: freeze/unfreeze gameplay for hitbox inspection
- Canvas hitbox outlines for the player and active obstacles
- Separate rendered bounds and collision hitbox outlines
- Input state panel with held keys, lane target, lane progress, boost state, and lock state
- Danger-zone lane occupancy overlay for spawn fairness debugging
- Debug-only collision logs in the browser console

When debug mode is active on the title screen, a `Run Spawn Safety Simulation` button is also shown.

## Gameplay Rules

- The road has exactly five lanes.
- The player starts in the center lane.
- Lane changes slide quickly between lanes and cannot leave the road.
- The player can move forward and backward within a limited road zone, but steering remains lane-based.
- Sunset Highway gradually increases speed until the finish.
- Each run has exactly three manual boosts.
- Boosts temporarily increase speed, increase score gain, and add a neon trail.
- Cars, trucks, and roadwork barriers crash the player and end the run.
- Deer, cones, branches, debris-style hazards, and oil do not end the run, but they slow the car and apply score penalties.
- Oil slows the car without buffering or delaying steering input.
- Ramps make the car jump briefly.
- While airborne, the player can pass over small ground hazards.
- Tall vehicles, trucks, and barriers are still dangerous.
- Warning signs appear before deer crossings and construction zones.
- The Road Director builds intentional obstacle waves from reusable templates instead of spawning isolated random objects.
- The Road Director validates obstacle hitboxes in the lower danger zone so it cannot create a five-lane unavoidable wall.
- Debug simulation checks 1,000 deterministic runs per speed class and reports center pressure, wave frequency, obstacle mix, boost/ramp lane distribution, empty stretches, pattern repeats, and overlap/fairness failures.

## Scoring

The score is built from:

- Distance points while driving
- Extra score gain while boosting
- A small speed bonus while maintaining pace
- 5,000 points for finishing
- Up to 3,000 points for a quick finish
- 750 points for each unused manual boost
- 100 points for every 10 seconds of clean driving
- 150 points for near misses beside tall traffic
- 400 points for boost pads
- Penalties for slowdown collisions

Crashes still save the score earned up to that point.

## Local Saves

The game uses browser `localStorage` under the key `neonRoadRally.v1`.

It saves:

- Local players
- Selected player
- Each player’s car customization
- Each player’s personal best
- Global top 20 scores
- Music and SFX mute/volume settings

If save data is missing or corrupted, the game falls back to a clean local save state.

## Reset Local Data

Open `View Top 20 Scores` from the title screen and press `Reset Local Data`. A browser confirmation prompt appears before anything is removed.

## Optional Audio

Place original audio files in `audio/` with these filenames:

- `audio/title-theme.mp3`
- `audio/sunset-highway.mp3`
- `audio/boost.wav`
- `audio/crash.wav`
- `audio/slowdown.wav`
- `audio/finish.wav`
- `audio/menu-select.wav`

Browsers block autoplay, so music starts only after a click, Enter keypress, or another user interaction. Race music restarts from the beginning when a new race begins.

## Adding New Tracks

Tracks are defined in `TRACKS` near the top of `game.js`.

Add another object with:

```js
{
  id: "midnight-loop",
  name: "Midnight Loop",
  music: "audio/midnight-loop.mp3",
  targetDurationSeconds: 115,
  distanceToFinish: 52000,
  baseSpeed: 290,
  maxSpeed: 640,
  obstacleSettings: {
    earlySpacing: 980,
    lateSpacing: 520,
    firstObstacleAt: 920,
    warningLead: 520
  },
  difficultyCurve(progress) {
    return Math.min(1, Math.max(0, Math.pow(progress, 0.82)));
  }
}
```

Then update `startRace()` if you want a track picker instead of always using the first track.

## Adding New Obstacle Types

Add the type in three places in `game.js`:

1. Add metadata to `OBSTACLE_INFO`.
2. Add a drawing helper or extend `Renderer.drawObstacle()`.
3. Add collision behavior in `CollisionSystem.resolveHit()` if it needs special rules.

Spawn it from a `RoadDirector` wave template or add a new template when the object needs its own rhythm.

## Adjusting Difficulty

Tune Road Director values near the top of `game.js`:

- `ROAD_DIRECTOR.modeCadence`: wave timing, recovery scale, center safety timing, and movement pressure by speed class
- `ROAD_DIRECTOR.pressureValues`: simple pressure budget values for each obstacle/reward type
- `ROAD_DIRECTOR.modeIntensity`: target pressure budget by speed class
- `TRACK_DIRECTOR_BANDS`: opening, early-mid, late-mid, and final wave template weights

Tune these values in the Sunset Highway track config only when the whole race pace or length needs to change:

- `baseSpeed`: starting pace
- `maxSpeed`: top pace
- `earlySpacing`: early obstacle spacing
- `lateSpacing`: late obstacle spacing
- `firstObstacleAt`: how long the opening safe stretch lasts
- `difficultyCurve(progress)`: how quickly difficulty rises

Lower speeds and larger spacing make the game easier. Higher speeds, tighter spacing, and steeper difficulty curves make it harder.

## Tuning Track Length To A 2-Minute Song

Use `targetDurationSeconds` as the desired completion time and tune `distanceToFinish` until a clean run lands near the end of the song.

For a roughly two-minute track:

1. Set `targetDurationSeconds` to about `115`.
2. Play a clean test run without crashing.
3. If the finish line appears too early, increase `distanceToFinish`.
4. If the finish line appears too late, decrease `distanceToFinish`.
5. Re-test with boosts, because aggressive boosting should finish a little faster.

The current first track uses `distanceToFinish: 52000`, `baseSpeed: 290`, and `maxSpeed: 640`, which is tuned for a short arcade run near the requested 90-120 second range.

## Optional Car Sprites

Player car styles can use transparent PNG sprites from `assets/cars/`:

- `assets/cars/wedge-racer.png`
- `assets/cars/muscle-coupe.png`
- `assets/cars/tiny-formula.png`

Sprites should be top-down, facing upward, centered, and roughly `128x192`. If a sprite is missing or fails to load, the game falls back to the canvas-drawn car. The `Use Sprite Car` toggle in Customize Car controls whether a saved car attempts to use PNG sprites.
