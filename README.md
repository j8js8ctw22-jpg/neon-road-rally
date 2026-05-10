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

## Demo Checklist

For a local show build, use a current desktop browser and run from the local server above so audio loads consistently.

Recommended first demo path:

1. Choose or create a player.
2. Customize or select a car.
3. Run Solo / Seeded Run in Classic on Arcade with the generated seed.
4. Run Solo / Seeded Run in Fuel Run with a manual seed.
5. Open Challenge Mode and play First Run or Turbo Dare.
6. Open Party Mode with 2 players, then try Rematch Same Seed and Rematch New Seed.
7. Show Leaderboard, Settings/audio mute, and fullscreen.

To clear local test data, open Leaderboard, choose `Reset Local Data`, and accept the browser confirmation. This clears local players, car settings, scores, challenge progress, and audio/default race settings for this browser only. It never runs automatically.

Audio files live in `audio/`. Player car sprites live in `assets/cars/`, and traffic sprites live in `assets/traffic/`.

Known demo limitations: Sunset Highway is the only track, Party Mode is pass-the-keyboard only, saves are browser-local, and there are no online, account, cloud-save, payment, upload, chat, or backend API features.

For public static-hosting safety checks, see `WEB_DEMO_CHECKLIST.md`.

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

- Arcade
- Pro
- Turbo
- Overdrive
- Redline

Arcade is the default family-speed race. Pro adds serious traffic pressure. Turbo is fast, dangerous, and fair. Overdrive is a high-speed dare run. Redline is maximum-speed local bragging rights.

Sunday Drive and Rookie remain available under Training / Easy Modes for older saves and approachable fixed-seed challenges.

### Challenge Mode

Challenge Mode uses curated fixed-seed runs. Each challenge shows its track, race type, race mode, difficulty, objective, fixed seed, completion status, best score, and best progress.

Current challenges:

- First Run
- Turbo Dare
- Clean Line
- Boost Hunter
- Near-Miss Run
- Redline Warmup
- Redline Dare
- Speed Gate
- Fuel Panic
- Last Drop
- Clean Redline
- Party Seed Sampler
- The Dare

Featured demo seeds for future web copy:

- PARTY-SEED
- REDLINE-WARMUP
- REDLINE-DARE
- FUEL-PANIC
- THE-DARE

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

Local player names are capped to 20 characters, local car names are capped to 24 characters, manual road seeds normalize to uppercase seed text capped at 32 characters, and the local leaderboard is capped to Top 20 entries.

## Website Demo Safety

The current build is safe to host as static files when served with the local assets in this repo. It does not use external scripts, analytics, CDN dependencies, backend/API calls, file uploads, accounts, cloud saves, or payment flows.

Suggested starting CSP for future deployment:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self';
```

If inline styles are avoided later, the style policy can be tightened.

Privacy note: profiles, settings, challenge progress, and scores are stored locally in this browser only. Clearing browser data may erase progress. A future global leaderboard should be optional and should submit only a constrained racer tag plus score metadata, not local player names.

Future public racer tags should use exactly 3 uppercase letters followed by 2 numbers, for example `AAA01`, `JDX77`, `SUN08`, or `DAD01`, validated by `/^[A-Z]{3}[0-9]{2}$/`. Do not submit free-form local player names to a future global leaderboard.

Mobile status: desktop/laptop keyboard play is primary. iPad with a keyboard may work. Touch controls are not implemented yet, and phone portrait is not supported or recommended.

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
- There are no online features, accounts, or cloud saves.
- Saves are local to the current browser.
- Party Mode is pass-the-keyboard only.
- Touch controls are not implemented yet.
- Debug gameplay uses F for the finish-line shortcut, so fullscreen F is disabled during debug gameplay.
