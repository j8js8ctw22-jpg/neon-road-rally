# Neon Road Rally Show-Build Release Checklist

## Purpose

Define the exact checklist for preparing a local or website demo build of Neon Road Rally.

Use this before showing the game to another person, recording footage, publishing a website build, or treating a local build as demo-ready.

## 1. Show Build Goal

The show build should prove the core promise:

Neon Road Rally is a polished local/web demo for music-driven arcade racing with seeded challenges, Party Mode, Challenge Mode, Fuel Run, local badges/titles, and two distinct tracks.

The demo should make these points obvious:

- Sunset Highway is the current song-backed core road.
- Redline Run feels faster, cleaner, and visually distinct from Sunset Highway.
- Seeds make runs repeatable and fair to compare.
- Challenge Mode turns fixed seeds into named tests.
- Party Mode turns one keyboard into local competition.
- Fuel Run changes the tension by making gas cans and fuel pressure central.
- Badges and local titles give the profile a reason to matter without accounts, cloud saves, or global leaderboards.

## 2. Required Demo Paths

Run every path below before calling the build show-ready.

| Pass | Path | Required Result |
| --- | --- | --- |
| [ ] | Solo Classic Arcade on Sunset Highway | Starts cleanly, reaches active traffic quickly, and shows the baseline music-shaped arcade flow. |
| [ ] | Solo Classic Pro or Turbo on Redline Run | Redline feels faster and distinct without becoming cheap or unreadable. |
| [ ] | Fuel Run on Sunset Highway | Gas cans are readable, fuel pressure is clear, and the run still feels fair. |
| [ ] | Fuel Run on Redline Run | Fuel Panic-style pressure is readable at higher Redline speed. |
| [ ] | Challenge Mode: Redline Warmup | Challenge loads Redline Run, Classic, Arcade, seed `REDLINE-WARMUP`, and completion/progress saves correctly. |
| [ ] | Challenge Mode: Fuel Panic | Challenge loads Redline Run, Fuel Run, Pro, seed `FUEL-PANIC`, and the fuel objective is clear. |
| [ ] | Party Mode: 2-player Best of 3 | Two local players can finish the round flow, standings are understandable, and same-seed comparison is visible. |
| [ ] | Party Mode: Total Score | Total Score uses the expected multi-run structure and final result is easy to explain. |
| [ ] | Leaderboard and Local Titles | Local Top 20 appears, seed/mode/track details are readable, and title holders calculate. |
| [ ] | Driver Badges/Profile | Profile shows earned badges, recent badges, held titles, and local-only state clearly. |

## 3. Pre-Demo Data Setup

### Reset Or Curate Local Data

Use a clean browser profile for the cleanest show build.

If using an existing browser, decide intentionally:

- Reset local data when you want first-run behavior, clean player creation, and predictable reward unlocks.
- Keep curated local data when you want to show leaderboard history, titles, badges, and profile progress immediately.
- Do not let stale debug/test names, broken scores, or half-finished challenge progress appear in a public demo.

Use the in-game reset path only:

1. Open Leaderboard.
2. Choose `Reset Local Data`.
3. Confirm the browser prompt.
4. Verify it clears only the `neonRoadRally.v1` data for this browser.

Do not add automatic clearing to the build.

### Suggested Demo Player Names

Use short local names that look like real pass-the-keyboard players:

- Joshua
- Riley
- Maya
- Kai

For a two-player Party demo, use:

- Joshua
- Riley

Avoid joke names, test strings, HTML-looking names, emoji, and anything that looks like a future public account name. Local player names stay local.

### Suggested Demo Seeds

Use real challenge seeds whenever possible:

- `REDLINE-WARMUP` for the first Redline challenge demo.
- `FUEL-PANIC` for Redline Fuel Run pressure.
- `LAST-DROP` for accessible Sunset Highway Fuel Run.
- `PARTY-SEED` for two-player Party comparison.
- `THE-DARE` or `REDLINE-DARE` for a high-pressure Redline retry moment.

For Solo Classic Arcade on Sunset Highway, use either:

- a generated random seed if the goal is to show normal player behavior, or
- `FIRST-RUN` if the goal is a reliable onboarding run.

### Suggested Badges/Titles To Show

Badges worth demonstrating:

- First Run
- First Finish
- Sunset Finisher
- Redline Finisher
- Fuel Survivor
- Challenge Cleared
- Party Starter

Titles worth demonstrating:

- Sunset Champion
- Redline Champion
- Turbo Champion
- Fuel Champion
- Challenge Champion
- Clean Champion

### Avoiding Stale Test Data

Before capture or public play:

- [ ] Confirm the current player and car names are intentional.
- [ ] Confirm local leaderboard entries are believable.
- [ ] Confirm challenge progress does not imply an old broken build.
- [ ] Confirm badge counts are expected for the selected profile.
- [ ] Confirm title holders match current local leaderboard state.
- [ ] Confirm no debug-speed or developer-only run is being presented as normal play.
- [ ] Use a fresh browser profile if there is any doubt.

## 4. Technical Checks

### Local Server

- [ ] Start a local server from the repository root when testing browser media loading.
- [ ] Recommended command: `python3 -m http.server 8081`
- [ ] Open `http://127.0.0.1:8081/`.
- [ ] Verify the title screen loads without a build step.

### Console And Loading

- [ ] Browser console has no errors.
- [ ] Browser console has no warnings that matter for the demo.
- [ ] `audio/title-theme.mp3` loads.
- [ ] `audio/sunset-highway.mp3` loads.
- [ ] Redline Run falls back cleanly if `audio/redline-run.mp3` is not present.
- [ ] Car sprites load from `assets/cars/`.
- [ ] Traffic sprites load from `assets/traffic/`.
- [ ] No missing file requests appear except the known optional Redline music file if the fallback is expected.

### Input, Fullscreen, And Settings

- [ ] Keyboard focus works after clicking the game.
- [ ] Arrow keys or WASD move the car.
- [ ] Space triggers manual boost.
- [ ] Enter starts/confirms where expected.
- [ ] Esc pauses or backs out where expected.
- [ ] Fullscreen works on desktop.
- [ ] Music mute works.
- [ ] SFX mute works.
- [ ] Settings persist locally when expected.
- [ ] Reset data confirmation names local data clearly and does not run automatically.

### Bundle Hygiene

- [ ] No `.DS_Store` files are included in the deployed bundle.
- [ ] No account, backend, cloud-save, analytics, upload, chat, or payment code is added for this show build.
- [ ] Static asset paths are relative and work from the intended local or website route.
- [ ] README and web-demo notes still match the current build.

## 5. Gameplay Checks

### Road And Spawn Feel

- [ ] No obvious object pop-in during normal play.
- [ ] No cheap starts in the first seconds of a run.
- [ ] No unavoidable five-lane wall appears in show paths.
- [ ] Arcade is not dead or empty.
- [ ] Turbo feels fast and fair, not random or instantly punitive.
- [ ] Redline Run feels distinct from Sunset Highway in speed, visuals, and road pressure.
- [ ] Sunset Highway still feels like the balanced baseline.

### Objects And Readability

- [ ] Ramps clear cars and objects in the demo paths.
- [ ] Gas cans are readable at speed.
- [ ] Fuel Run boost behavior is clear and useful for fuel pressure.
- [ ] Fuel warnings are noticeable without overwhelming the race.
- [ ] Boost pads feel tempting but not mandatory in every moment.
- [ ] Slowdown/crash feedback is obvious.

### Mode Flow

- [ ] Solo setup makes track, race type, race speed, and seed understandable.
- [ ] Challenge cards show track, race type, mode, objective, seed, and progress.
- [ ] Fuel Panic explains its fuel/progress goal clearly.
- [ ] Party setup is understandable for two local players.
- [ ] Best of 3 standings make the leader and next player clear.
- [ ] Total Score standings make cumulative scoring clear.
- [ ] Party rematch options preserve same-seed vs new-seed intent.

## 6. Rewards Checks

### Badges

- [ ] Badges award only from normal saved non-debug play.
- [ ] First Run awards after the first saved run.
- [ ] First Finish awards after the first completed race.
- [ ] Redline Finisher awards after finishing Redline Run.
- [ ] Fuel Survivor awards after finishing a Fuel Run.
- [ ] Challenge Cleared awards after completing a Challenge Mode challenge.
- [ ] Party Starter awards after completing a Party Mode round.
- [ ] Deprecated badges do not show in the visible profile grid.
- [ ] `Personal Best` legacy badge does not appear as a permanent badge.
- [ ] `Top 20` legacy badge does not appear as a permanent badge.

### Titles

- [ ] Titles calculate from current local leaderboard/challenge state.
- [ ] Sunset Champion can be claimed from a saved Sunset Highway Classic score.
- [ ] Redline Champion can be claimed from a saved Redline Run Classic score.
- [ ] Turbo Champion can be claimed from a saved Turbo score.
- [ ] Fuel Champion can be claimed from a saved Fuel Run score.
- [ ] Challenge Champion can be claimed from challenge progress.
- [ ] Clean Champion can be claimed from a finished clean run.
- [ ] Driver Profile shows held titles.
- [ ] Title board shows claimed and unclaimed titles clearly.

### Reward Presentation

- [ ] Score screen badge callouts are noticeable but not too noisy.
- [ ] Score screen title callouts are readable and limited.
- [ ] Multiple new badges do not crowd out score, seed, track, mode, or race result.
- [ ] Driver Profile shows earned badges, locked visible badges, recent badges, and local titles.
- [ ] Reward language never implies online accounts, permanent cloud identity, or global ranking.

## 7. Website Checks

### Route And Framing

- [ ] Recommended canonical URL is `/games/neon-road-rally`.
- [ ] Optional short redirect `/neon-road-rally` points to the canonical route only when ready.
- [ ] Page frames the game as music-driven arcade racing, not just an embedded canvas.
- [ ] Page includes a featured seed section.
- [ ] First featured challenge is Redline Warmup unless there is a deliberate launch reason to change it.

### Embed And Play

- [ ] Game embed or focused play route loads.
- [ ] Keyboard focus works inside the embed/play view.
- [ ] Fullscreen works from the website context.
- [ ] Audio starts only after user interaction as expected.
- [ ] Static game bundle uses the intended public asset path.
- [ ] No global leaderboard UI appears yet.

### Visitor Notes

- [ ] Desktop/laptop keyboard note is visible.
- [ ] iPad with keyboard is described as may work, not guaranteed.
- [ ] Touch controls are documented as not ready.
- [ ] Phone portrait is documented as not supported yet.
- [ ] localStorage/privacy note is visible.
- [ ] Copy says scores/profiles are saved locally in this browser.
- [ ] Copy says no account is required.
- [ ] Copy says clearing browser data may erase progress.
- [ ] Copy says global leaderboard is planned later, not available now.

## 8. Known Limitations To Be Honest About

Use this exact limitation framing in demo notes, website copy, or handoff docs:

- Touch controls are not ready yet.
- Phone portrait play is not supported yet.
- Global leaderboard is not implemented yet.
- There are no accounts, cloud saves, or online multiplayer.
- Redline Run's dedicated music file is not final/present yet; it currently falls back to Sunset Highway music.
- Dynamic car recoloring is not available yet.
- Saves, profiles, badges, titles, challenge progress, settings, and leaderboard entries are local to the current browser.
- Clearing browser data may erase progress.

## 9. Final Go / No-Go Criteria

Do not show or publish the build unless every must-pass item below is green.

### Must Pass

- [ ] Game loads from the intended local server or website route with no console errors.
- [ ] Audio and visual assets load, with only the known Redline music fallback if applicable.
- [ ] Keyboard focus, fullscreen, mute, and reset confirmation all work.
- [ ] Solo Classic works on both Sunset Highway and Redline Run.
- [ ] Fuel Run works on both Sunset Highway and Redline Run.
- [ ] Challenge Mode works for Redline Warmup and Fuel Panic.
- [ ] Party Mode works for 2-player Best of 3 and Total Score.
- [ ] Leaderboard, badges, Driver Profile, and local titles display correctly.
- [ ] Redline Run feels distinct from Sunset Highway.
- [ ] No cheap starts, obvious pop-in, unreadable gas cans, or broken ramps appear in required demo paths.
- [ ] Website/demo copy clearly says local saves only, no account required, and no global leaderboard yet.
- [ ] Desktop keyboard requirement and mobile/touch limitations are documented.
- [ ] No `.DS_Store` files are included in the deployed bundle.

### No-Go

Stop the release/demo if any of these happen:

- [ ] Any console error appears during normal title, setup, race, score, challenge, party, leaderboard, settings, or profile flow.
- [ ] Any required asset is missing without an expected fallback.
- [ ] Keyboard focus fails inside the website embed.
- [ ] Fullscreen fails in the intended demo browser.
- [ ] A required mode cannot start or complete its expected flow.
- [ ] Party standings are confusing or incorrect.
- [ ] Badges/titles award incorrectly or deprecated badges appear.
- [ ] Local reset is unclear or deletes more than the intended local game data.
- [ ] Website copy implies online leaderboard, accounts, cloud saves, or mobile touch support exists now.
- [ ] The deployed bundle includes `.DS_Store`.

## Suggested Demo Path

Use this order for a tight show build:

1. Open title screen and show the core menu.
2. Create/select `Joshua` as the local player.
3. Run Solo Classic Arcade on Sunset Highway with a generated seed.
4. Run Challenge Mode: Redline Warmup.
5. Run Fuel Run on Sunset Highway with `LAST-DROP`.
6. Run Challenge Mode: Fuel Panic.
7. Run Solo Classic Turbo on Redline Run with `THE-DARE` or `REDLINE-DARE`.
8. Open Driver Profile to show badges and titles earned so far.
9. Run Party Mode with `Joshua` and `Riley`, Best of 3, seed `PARTY-SEED`.
10. Run Party Mode Total Score if time allows.
11. Open Leaderboard and Local Titles.
12. Show Settings/audio mute and fullscreen.

If time is short, skip Total Score and keep Best of 3 as the Party proof.
