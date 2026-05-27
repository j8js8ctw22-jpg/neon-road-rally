# Neon Road Rally UI Redesign Phase 1 Gap Audit

Purpose: compare the current implementation against the Claude Design PDF, add only safe shared primitives, and identify future screen passes without disturbing validated gameplay or mode flows.

## Reference Standard

- Source: `Neon Road Rally - UI Redesign Direction (Print)v2.pdf`
- Existing repo reference export: `docs/ui-redesign/tokens.css`, `docs/ui-redesign/ui.css`, and component mockups in `docs/ui-redesign/`
- Current implementation: `style.css` and vanilla markup emitted by `game.js`

## Safe Primitives Added Or Normalized

Current `style.css` already contained most Phase 1 primitives from the PDF:

- Design tokens: color, spacing, radius, type, glow, and legacy aliases
- Button variants: `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`, size/block modifiers
- Chip styles: `.chip`, `.chip--active`, `.chip--cyan`, `.chip--yellow`, `.chip--green`
- Stat strip styles: `.stat-row`, `.stat`, `.stat-label`, `.stat-value`, `.stat-sub`
- Route row helper: `.route-row`
- Leaderboard row helper: `.lb`
- Shared menu/driver helpers: `.menu-btn`, `.driver-chip`, `.avatar-tile`, `.disclosure`

Phase 1 normalized the missing bridge names without changing live screen layout:

- Added primitive token aliases: `--primitive-hairline`, `--primitive-hairline-strong`, `--primitive-active-bar`, `--primitive-button-radius`, `--primitive-panel-radius`, `--primitive-row-min-height`
- Added stat strip aliases: `.stat-strip`, `.nrr-stat-strip`
- Added future route row alias: `.nrr-route-row`
- Added future leaderboard row alias: `.nrr-leaderboard-row`
- Reused the same colors, spacing, and active-left-bar behavior as the existing primitives

No gameplay, route, scoring, save, leaderboard, controller, Flow Break, Reckless Driver, Party-rule, or Garage-economy code was changed.

## Screen Audit

| Screen | Status | Current Alignment | Remaining Gap | Phase 1 Decision |
| --- | --- | --- | --- | --- |
| Title | Partially aligned | Uses PDF tokens, `nrr` shell, one primary CTA, driver chip, compact menu rows, short tagline, and no old section-label grid. | Primary label is `Start Race` rather than the PDF's `Official Race`; title utility line still carries audio/default/controller status. | Leave layout alone. Future pass can tune copy only if screenshots show first-action ambiguity. |
| Official Race setup | Partially aligned | Uses page-head, shared button variants, compact track selector, segmented race type, route-row-backed official route board, and one primary Start Race action. | Still has repeated section summaries, Custom Road / Practice disclosure instead of PDF 6th tile, and selected route uses the current cyan official-board treatment rather than the PDF magenta route-row accent. | Do not rewrite. Route board is currently working and validated; only future copy/section compression should be considered. |
| Results | Partially aligned | Strongest PDF match: full-screen result shell, large mono finish metric, chips for outcome/PB/cash, stat strip side board, and details collapsed by default. | Header plus quiet actions still expose more actions than the PDF target; `Driver Garage` remains on results; outcome/detail copy can repeat the hero metric. | Leave behavior and action routing intact. Future Results pass is the best candidate for focused cleanup. |
| Leaderboards | Partially aligned | Uses segmented board tabs, inline filter summary, leaderboard row helpers, current-driver highlight, route action in header, and data tools behind disclosure. | Board context line remains, filter layout is still heavier than the PDF, empty-state summary can show several low-value cells, and `Data Tools` still lives on this screen. | Leave storage/reset behavior alone. Future pass should focus on filter hierarchy and empty state. |
| Party setup/results | Do not touch for now | Party setup already uses the shared shell, page-head, start summary strip, segmented race type, compact driver rows, and validated Party smoke coverage. Party results use existing leaderboard/standing rows and handoff-first flow. | PDF wants a stricter 5-stat summary strip and less visible option chrome. | Protected in this phase because Party rules/results/handoff are working and explicitly out of scope unless a clear PDF gap is targeted later. |
| Garage | Do not touch for now | Uses shared page shell, buttons, chips, driver cards, stat/profile sections, and current Garage economy/cosmetic surfaces. Settings-like visual language is already present. | PDF wants driver name as the page-head focus, fewer explanatory paragraphs, career stats as a tighter stat strip, and more content behind disclosure. | Leave alone. Garage is working and economy-linked; future pass should be separate and screenshot-led. |
| Settings | Partially aligned | Uses two-column Audio/Controls and Defaults/Display layout, sliders, speed pills, chips, and Playtest/Data tools behind `More Options`. | Still has one primary `Done` button, controller diagnostic detail inside Settings, and some explanatory text that the PDF would compress. | Low-risk enough to audit only. Future pass can shorten copy and normalize reset/playtest disclosure labels. |
| In-race HUD | Do not touch for now | Canvas HUD already has top strip, score, speed, boost/progress, Fuel/Flow Break callouts, pause overlay, and existing race-state validation. | PDF wants exactly five always-on elements, no audio/fullscreen/debug during driving, mono hero speed treatment, and stricter one-callout behavior. | No HUD changes in Phase 1. Flow Break and Reckless Driver readability are protected validated surfaces; any HUD pass should run its own visual QA. |

## Already Aligned

- Global color/type/spacing/radius tokens are in `style.css`.
- Button, chip, stat strip, route row, leaderboard row, driver chip, avatar tile, menu row, and disclosure primitives exist.
- Title, Results, Leaderboards, Party, Garage, and Settings already use the `nrr` shell and shared primitive vocabulary in visible places.
- Settings already hides playtest/data tools below a disclosure.

## Needs Future Pass

Recommended next screen pass: Results.

Why: it has the strongest primitive foundation and the smallest safe scope. A future Results-only pass can reduce action hierarchy, promote the next-target line, and trim repeated outcome copy without touching gameplay, saves, scoring, route logic, Party rules, Garage economy, Flow Break, or Reckless Driver behavior.

Secondary future pass: Leaderboards empty/filter state.

Why: row primitives are now normalized, but the PDF's biggest remaining gap is filter chrome dominating the data. This should be handled separately because reset/data-tool placement and board routing are persistence-sensitive.

## Intentionally Left Alone

- `game.js` gameplay, saves, scoring, route logic, official route definitions, leaderboard storage/routing, controller behavior, Party rules, Garage economy, Flow Break, and Reckless Driver systems
- Current Garage page structure and economy-linked cosmetics
- Current Party setup/results/handoff behavior
- Current Official route board behavior and route/champion metadata
- Current in-race HUD, Flow Break, Fuel, Reckless Driver, and pause behavior
- Existing untracked UI review/export artifacts
