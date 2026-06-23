# Neon Road Rally Web Demo Safety Checklist

This checklist is for hosting the current Neon Road Rally browser build as static files through GitHub Pages or another static host. The demo remains local-first: no accounts, cloud saves, backend API, global leaderboard, payments, uploads, chat, analytics, or external scripts.

## Pre-Deploy Checklist

- Run `bash scripts/build-dist.sh`.
- Host only the generated `dist/` contents: `index.html`, `style.css`, `game.js`, `audio/`, and `assets/`.
- Do not host `.git`, `docs/`, `tools/`, `ui-review-pack/`, `stable-copies/`, `*.md`, `.DS_Store`, or source-only review artifacts.
- Keep all script, style, image, and media paths relative so the game can run from a subdirectory.
- Confirm there are no API keys, tokens, credentials, private paths, analytics snippets, CDN scripts, `eval`, `new Function`, hidden network calls, or backend endpoints.
- Run `node --check game.js`.
- Run `git diff --check`.
- Run the browser smoke test below from a local static server before upload.

## Asset Checklist

- CSS loads from `style.css`.
- JavaScript loads from `game.js`.
- Player car sprites load from `assets/cars/`.
- Traffic sprites load from `assets/traffic/`.
- There is no barrier sprite request; barriers use the canvas fallback art.
- Missing optional sprites should fall back to canvas drawing instead of crashing.
- No asset path should point to `/Users/...`, `file://`, a remote URL, or a user-controlled string.

## Audio Checklist

Expected local audio files:

- `audio/title-theme.mp3`
- `audio/sunset-highway.mp3`
- `audio/redline-run.mp3`
- `audio/midnight-ridge-mooncut-pass.mp3`
- `audio/blackout-run-headlight-mile.mp3`
- `audio/prism-highway-glasslight-fever.mp3`
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

Audio starts only after user interaction. Missing optional audio should not stop the game.

## Browser Smoke Test

Use a current desktop browser and a local static server.

1. Title screen loads.
2. Official Race starts from a route board.
3. Solo / Seeded Run starts in Classic.
4. Solo / Seeded Run starts in Fuel Run.
5. Challenge Mode starts.
6. Party Mode starts with 2 local players.
7. Leaderboard opens.
8. Settings opens.
9. Reset Local Data confirmation appears.
10. Audio mute/unmute works after user interaction.
11. Fullscreen works where the browser permits it.
12. Console has no game errors or warnings.
13. There are no missing asset or audio warnings in the intended demo file set.

## localStorage Note

The game stores local profiles, selected player, car settings, personal bests, Top 20 local scores, challenge progress, audio settings, and default race mode under this game-specific key:

```text
neonRoadRally.v1
```

The game should recover if that key is missing, corrupted, oversized, or contains unexpected value types. Local leaderboard entries are capped to Top 20, local player names are capped to 20 characters, local car names are capped to 24 characters, and manual seeds normalize to uppercase seed text capped at 32 characters.

`Reset Local Data` requires browser confirmation and should delete only the Neon Road Rally local key, not unrelated `tilthen.app` storage.

## XSS And Corrupted Save Checks

Use these local-only inputs before a public demo:

- Player name: `<script>alert(1)</script>`
- Car name: `<img src=x onerror=alert(1)>`
- Seed: `test"><script>alert(1)</script>`
- Corrupted leaderboard string: `"><svg onload=alert(1)>`

Expected result: no script runs, malicious strings are normalized or rendered as harmless text, the game does not crash, and Reset Local Data remains available.

Also test:

- Invalid JSON in `neonRoadRally.v1`.
- Oversized leaderboard array.
- Leaderboard entry with missing fields.
- Old score entry missing seed, race type, or challenge id.
- Malformed date.
- Player with an absurdly long name.
- Car name with HTML-like content.

## Privacy Note

The current website demo stores profiles, settings, challenge progress, and scores locally in the browser. There is no account, cloud save, or global leaderboard in the MVP. Clearing browser data may erase progress. A future global leaderboard should be optional and submit only a constrained racer tag plus score metadata, not local player names.

## Mobile And iPad Status

- Desktop and laptop keyboard play is primary.
- iPad with a keyboard may work.
- Touch controls are not implemented yet.
- Phone portrait is not supported or recommended.
- Future iPad/touch support needs deliberate touch controls and a separate validation pass.

## Suggested CSP For Future Hosting

Do not add this if it breaks the static build, but this is a reasonable starting point for a future website deployment:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self';
```

If inline styles and scripts are avoided later, `style-src` can be tightened by removing `'unsafe-inline'`.

## Future Public Racer Tag Rule

Do not submit free-form local player names to any future website or global leaderboard. Use a constrained public racer tag instead.

Format:

- Exactly 3 uppercase letters followed by 2 numbers.
- Examples: `AAA01`, `JDX77`, `SUN08`, `DAD01`.
- Regex: `/^[A-Z]{3}[0-9]{2}$/`.
- Uppercase only, no spaces, punctuation, emoji, Unicode, or HTML.
- Max length 5.

If a player does not have a valid public racer tag in the future, generate a default random tag or prompt them to create one before global submission.

A global leaderboard should display only racer tag, score, track, race type, race mode, seed or challenge id, and date/time if needed. It should not display local player names, free-form car names, or arbitrary user-entered text.

## Future Global Leaderboard Safety

Do not implement the global leaderboard in this static pass. The first public version should be Featured Challenge Top 20 only:

- Same track.
- Same race type.
- Same race mode.
- Same seed.
- Same game version.
- No giant all-mode leaderboard at first.

Future score submission should include only:

- `racerTag`
- `score`
- `trackId`
- `raceType`
- `raceMode`
- `seed`
- `challengeId` if applicable
- finish, crash, or out-of-fuel status
- elapsed time
- game version
- debug speed scale status
- timestamp

Safety rules:

- Debug speed runs must never submit globally.
- Local scores should still save if global submission fails.
- Global leaderboard should be optional.
- No accounts are required for the first version.
- Avoid collecting personal information.
- The server should rate-limit submissions.
- The server should reject impossible scores and times.
- The server should sanitize `racerTag` anyway.
- The server should store only minimal data.
- Future stronger validation can replay an input timeline against the seeded Road Director.

Likely future backend approach:

- Cloudflare Worker API.
- Cloudflare D1 or KV for leaderboard storage.
- `GET` leaderboard endpoint.
- `POST` score endpoint.
- Future replay/input validation.

## Client-Side Cheating Note

Local scores are local and can be modified by advanced users. That is acceptable for MVP and local play. Global scores need server validation later. Seeded runs make future replay/input validation practical.

## Recommended First Website Demo Flow

1. Create a local player.
2. Customize or select a car.
3. Run an Official Race route from the route board.
4. Run Solo / Seeded Run in Classic on Arcade with a generated seed.
5. Run Solo / Seeded Run in Fuel Run with a generated or manual seed.
6. Open Challenge Mode and play First Run or Turbo Dare.
7. Open Party Mode with 2 local players, then try Rematch Same Seed and Rematch New Seed.
8. Show Leaderboard, Settings/audio mute, and fullscreen.

## Known Limitations

- Saves are browser-local.
- Party Mode is pass-the-keyboard only.
- There are no online features, accounts, cloud saves, global leaderboards, payments, uploads, chat, or backend APIs.
- Mobile/touch controls are not implemented.
