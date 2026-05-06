# Neon Road Rally

Neon Road Rally is a local-only browser arcade racer built with plain HTML, CSS, and vanilla JavaScript. The current show build focuses on one track: Sunset Highway.

There are no accounts, cloud saves, online features, build tools, third-party libraries, or server requirements.

## How To Run Locally

Open `index.html` directly in a modern browser.

If the browser blocks local media loading, run a tiny local server from this folder:

```bash
python3 -m http.server 8081
```

Then open:

```text
http://127.0.0.1:8081/
```

## Controls

- Arrow keys or WASD: steer and move within the driving zone
- Space: use one manual boost
- Enter: start or confirm from title, setup, score, and party screens
- Esc: pause during a run, or back out of most menus
- F: toggle fullscreen outside debug gameplay
- M: mute/unmute music
- N: mute/unmute SFX
- Backtick: toggle debug mode

Debug mode also enables:

- R: restart run
- F: jump near the finish line
- C: force a crash
- L: view leaderboard
- P: run the Road Director spawn safety simulation
- H: freeze/unfreeze gameplay for hitbox inspection
- Shift + Plus/Minus: adjust debug speed scale
- Shift + 0: reset debug speed scale

## Current Modes

### Solo / Seeded Run

Solo is the main one-player route. Choose a race mode, use a random or manual Road Seed, and race Sunset Highway. The same seed, track, and race mode replay the same Road Director sequence.

Race modes:

- Sunday Drive
- Rookie
- Arcade
- Pro
- Turbo

### Challenge Mode

Challenge Mode uses curated fixed-seed runs. Each challenge shows its track, race mode, objective, fixed seed, completion status, and best score.

Current challenges:

- First Run
- Turbo Dare
- Clean Line
- Boost Hunter
- Near-Miss Run

### Party Mode

Party Mode is local pass-the-keyboard competition. Pick 2-8 local players, one shared seed, and one race mode. Each player gets one run on the same Road Director sequence, then the standings screen shows leader, margin, latest run, and rematch options.

Party rematches support:

- Rematch Same Seed
- Rematch New Seed

## Scoring

The score is built from:

- Distance points while driving
- Pace score while maintaining speed
- Boost scoring while boosted
- Finish bonus
- Speed finish bonus
- Clean driving bonuses
- Near-miss bonuses
- Boost pad and ramp bonuses
- Unused manual boost bonus
- Slowdown penalties
- Race mode multiplier

Crashes still save the score earned up to that point unless debug speed scaling is active.

## Local Saves

The game uses browser `localStorage` under:

```text
neonRoadRally.v1
```

It saves:

- Local players
- Selected player
- Car customization
- Personal bests
- Global top 20 scores
- Challenge progress
- Music/SFX mute and volume settings
- Default race mode

If save data is missing or corrupted, the game falls back to a clean local save state. `Reset Local Data` is available from the leaderboard and requires browser confirmation.

## Audio Files

Audio is optional, but the show build expects these files in `audio/`:

- `audio/title-theme.mp3`
- `audio/sunset-highway.mp3`
- `audio/boost.wav`
- `audio/crash.wav`
- `audio/slowdown.wav`
- `audio/finish.wav`
- `audio/menu-select.wav`
- `audio/near-miss.wav`
- `audio/oil.wav`
- `audio/ramp.wav`
- `audio/countdown-beep.wav`
- `audio/go.wav`
- `audio/new-high-score.wav`
- `audio/warning.wav`

Browser autoplay rules are respected. Title music starts only after user interaction, and race music starts at GO.

## Asset Folders

Player car sprites live in:

- `assets/cars/wedge-racer.png`
- `assets/cars/muscle-coupe.png`
- `assets/cars/tiny-formula.png`

Traffic sprites live in:

- `assets/traffic/slow-car-1.png`
- `assets/traffic/slow-car-2.png`
- `assets/traffic/fast-car-1.png`
- `assets/traffic/fast-car-2.png`
- `assets/traffic/truck-1.png`
- `assets/traffic/truck-2.png`

If a sprite is missing or disabled, the game uses the existing canvas fallback art.

## Road Director

The Road Director builds seeded obstacle waves from reusable templates. It validates lower-screen lane pressure so the game does not generate a five-lane unavoidable wall.

Sunset Highway is divided into race sections:

- Launch
- Groove
- Pressure
- Breather
- Final Push

Sections shape wave pressure, cadence, recovery gaps, and visual intensity. They do not analyze audio, require beat timing, or change music playback speed.

## Debug Verification

Use debug mode on the title screen for:

- Seed Determinism
- Road Director Simulation
- Vehicle Scale Check

The Road Director simulation checks deterministic runs across race modes and reports fairness, pressure, obstacle mix, section distribution, boost/ramp lane distribution, overlap failures, and seeded determinism.

## Known Limitations

- The current show build has one track: Sunset Highway.
- There is no Fuel Run mode.
- There are no online features, accounts, or cloud saves.
- Saves are local to the current browser.
- Party Mode is pass-the-keyboard only.
- Debug gameplay uses F for the finish-line shortcut, so fullscreen F is disabled during debug gameplay.
