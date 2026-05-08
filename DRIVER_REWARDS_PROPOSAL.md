# Neon Road Rally Driver Rewards And Titles Proposal

## Purpose

Create a local badge, achievement, title, and reward system that gives Neon Road Rally a long-term chase without accounts, online leaderboards, pay-to-win upgrades, or stat progression.

The system should make local profiles feel personal, make the score screen more satisfying, give kids and adults different kinds of wins, and turn Party Mode, Challenge Mode, Fuel Run, and seeded runs into repeatable bragging-rights loops.

## Design Goals

- Create a chase beyond one run by giving players permanent milestones, local crowns, and future cosmetic goals.
- Give players something to be proud of even when they are not the top scorer.
- Reward kids for progress, courage, and completion while still giving adults high-skill targets.
- Support Party Mode with quick, loud, readable post-round rewards.
- Support Challenge Mode with fixed-seed proof and clear completion badges.
- Support Fuel Run with survival, recovery, and low-fuel pressure rewards.
- Support seeded runs by making same-seed records and rematches feel official.
- Keep competition fair by using score, mode, track, seed, and challenge data already produced by the run.
- Avoid stat upgrades, speed boosts, better handling, easier fuel, extra lives, or anything that changes performance.
- Stay local-first: profile progress lives in browser localStorage and can be reset safely.

## Reward Types

### Permanent Achievements / Badges

Badges are permanent profile accomplishments. Once earned, they stay earned for that local player unless local data is reset. They should celebrate firsts, mode milestones, driving skill, Challenge completions, Party results, and specific race behaviors.

Badges are good for:

- "I did this once."
- "I completed this challenge."
- "I survived this kind of pressure."
- "I have proof on my profile."

### Temporary Local Titles / Crowns

Titles are competitive local crowns. They are held by one player until another player beats the record or wins the relevant local contest. Titles should be recalculated from saved records where possible instead of stored as fragile state.

Titles are good for:

- "I am currently the best at this on this device."
- "Someone can take this from me."
- "This creates a rematch."

### Future Cosmetic Unlocks

Unlocks are cosmetic only. They change how a profile, car presentation, boost trail, badge icon, nameplate, or menu theme looks. They must not improve score, speed, handling, fuel drain, obstacle generation, collision size, or challenge difficulty.

Unlocks are good for:

- "My profile looks different because I earned something."
- "I can show personality."
- "There is a harmless long-term collection chase."

## First-Pass Badge List

Difficulty scale:

- Easy: most players can earn quickly.
- Normal: requires a real run or a few attempts.
- Hard: requires skill or a strong score.
- Dare: intentionally difficult or tense.
- Master: rare local bragging-rights target.

| id | name | description | Trigger condition | Difficulty | Visibility |
| --- | --- | --- | --- | --- | --- |
| `first_run_posted` | First Run Posted | Put a score on the board. | Finish, crash, or run out of fuel with `scoreSaved === true` for the first time. | Easy | Visible |
| `first_finish` | Track Complete | Finish any track in any race mode. | `status === "finished"` on any non-debug run. | Easy | Visible |
| `first_personal_best` | Personal Best | Set a new profile best. | `newPersonalBest === true`. | Easy | Visible |
| `top_20_entry` | Top 20 Driver | Break into the local Top 20. | `entersTopTwenty === true`. | Normal | Visible |
| `sunset_finisher` | Sunset Finisher | Finish Sunset Highway. | Finish `trackId === "sunset-highway"`. | Easy | Visible |
| `redline_finisher` | Redline Finisher | Finish Redline Run. | Finish `trackId === "redline-run"`. | Normal | Visible |
| `turbo_survivor` | Turbo Survivor | Finish a Turbo run. | Finish with `speedClass === "turbo"`. | Hard | Visible |
| `clean_run` | Clean Run | Finish without slowdown hits. | Finish with `slowdownHits === 0` and no slowdown penalties. | Hard | Visible |
| `clean_redline` | Clean Redline | Finish Redline without slowdown hits. | Finish `trackId === "redline-run"` with `slowdownHits === 0`. | Dare | Visible |
| `near_miss_streak` | Near-Miss Streak | Bank several close calls in one run. | Earn at least 3 near-miss bonuses in one run. | Normal | Visible |
| `near_miss_maniac` | Near-Miss Maniac | Thread traffic for a big close-call run. | Earn at least 5 near-miss bonuses in one run. | Hard | Visible |
| `boost_hunter` | Boost Hunter | Use every manual boost and keep racing. | Use all 3 manual boosts in one saved run. | Normal | Visible |
| `no_boost_hero` | No Boost Hero | Finish while saving every manual boost. | Finish with `manualBoostsUsed === 0`. | Hard | Visible |
| `last_second_save` | Last-Second Save | Finish just ahead of disaster. | Finish a run after a near miss, fuel critical stretch, or final 10 percent crash-risk section; first pass can use finish with `progress >= 1` and `slowdownHits > 0` after 90 percent. | Hard | Hidden |
| `fuel_run_finish` | Fuel Run Finish | Finish a Fuel Run. | Finish with `raceTypeId === "fuelRun"`. | Normal | Visible |
| `last_drop` | Last Drop | Finish Fuel Run with almost no fuel left. | Finish Fuel Run with `fuelRemaining <= 10`. | Hard | Visible |
| `fuel_saver` | Fuel Saver | Finish Fuel Run with a strong reserve. | Finish Fuel Run with `fuelRemaining >= 40`. | Hard | Visible |
| `fuel_panic_survivor` | Fuel Panic Survivor | Survive deep Fuel Run pressure. | Complete the `fuel-panic` challenge or reach at least 75 percent in a Pro/Turbo Fuel Run without running out. | Dare | Visible |
| `first_challenge` | First Challenge | Complete any Challenge Mode objective. | Any `challengeResult.completed === true`. | Easy | Visible |
| `dare_cleared` | Dare Cleared | Clear a Dare difficulty challenge. | Complete any challenge with `difficulty === "Dare"`. | Dare | Visible |
| `clean_challenger` | Clean Challenger | Clear a clean-driving challenge. | Complete `clean-line` or `clean-redline`. | Hard | Visible |
| `redline_dare` | Redline Dare | Take on Redline Turbo pressure. | Complete `redline-dare` or `the-dare`. | Dare | Visible |
| `party_winner` | Party Winner | Win a local Party Mode round. | Finish a Party session with final standing rank 1. | Normal | Visible |
| `comeback_kid` | Comeback Kid | Climb back into the lead. | In Party Mode, gain at least 2 places after trailing, or win after not leading entering the final run. | Hard | Visible |
| `same_seed_rival` | Same Seed Rival | Compete on equal ground. | Complete a Party round or local rematch where every player used the same seed. | Easy | Visible |

First pass should ship roughly 20 to 25 badges. The table above includes 25 badges, with the safest first shipping set listed in the recommendations section below.

## Local Titles / Crowns

Titles should be shown as local crowns, not permanent achievements. A player can hold multiple titles, and every title should be easy to explain in one sentence.

Tie-break order should be consistent:

1. Higher score wins unless the title is explicitly about completion count, party wins, or clean driving.
2. If score is tied, finished run beats crash or out-of-fuel.
3. If both finished, faster elapsed time wins.
4. If still tied, newer record can claim the crown because it creates rematch energy.
5. If a title is based on a fixed seed or challenge, only matching track, race type, race mode, seed, and challenge id are comparable.

| id | name | Description | Holder calculation | Can be lost | Tie-break rules |
| --- | --- | --- | --- | --- | --- |
| `sunset_champion` | Sunset Champion | Best local Sunset Highway driver. | Highest saved score on `trackId === "sunset-highway"` across non-debug runs. | Yes | Score, finish status, faster time, newer date. |
| `redline_champion` | Redline Champion | Best local Redline Run driver. | Highest saved score on `trackId === "redline-run"` across non-debug runs. | Yes | Score, finish status, faster time, newer date. |
| `turbo_champion` | Turbo Champion | Best local Turbo driver. | Highest saved score with `speedClass === "turbo"`. | Yes | Score, finish status, faster time, newer date. |
| `fuel_champion` | Fuel Champion | Best local Fuel Run driver. | Highest saved score with `raceTypeId === "fuelRun"`. | Yes | Score, finish status, higher fuel remaining, faster time, newer date. |
| `party_champion` | Party Champion | Current local Party Mode ruler. | Most recent completed Party session winner, or most Party wins if persistent party history is added. | Yes | Party wins, best party score, total party score, newest session. |
| `challenge_champion` | Challenge Champion | Strongest Challenge Mode profile. | Most completed challenges; tie by total best challenge score. | Yes | Completed count, Dare completions, total best challenge score, newest completion. |
| `near_miss_champion` | Near-Miss Champion | Best close-call driver. | Highest near-miss count in one saved run. | Yes | Near misses, score, finish status, newer date. |
| `clean_champion` | Clean Champion | Best clean-driving scorer. | Highest score on a finished run with `slowdownHits === 0`. | Yes | Score, faster time, tougher speed class, newer date. |
| `seed_champion` | Seed Champion | Best driver on a specific shared seed. | Highest score for the currently viewed track/race type/race mode/seed combination. | Yes | Score, finish status, faster time, newer date. |
| `redline_dare_holder` | Redline Dare Holder | Current best on the Redline Dare family. | Highest saved score on `redline-dare` or `the-dare`. | Yes | Challenge completion, progress percent, score, newer date. |
| `fuel_panic_holder` | Fuel Panic Holder | Current best on Fuel Panic. | Best saved progress/score on `challengeId === "fuel-panic"`. | Yes | Completion, progress percent, score, fuel remaining, newer date. |
| `total_score_champion` | Total Score Champion | Best long-form party scorer. | Highest winning total in Party Mode Total Score rounds. | Yes | Total score, best single run, margin of victory, newer date. |

Implementation note: Titles should be recalculated from leaderboard, challenge progress, and party session history whenever possible. Store title history only for optional flavor such as "claimed on" and "lost to."

## Score Screen Integration

The score screen is where the reward system should feel alive. It should show a short row of callouts above or near the existing personal best / Top 20 / challenge callouts.

Recommended callout priority:

1. `Badge Earned`: show the badge icon, badge name, and one-line reason. If multiple badges were earned, show the most important 1 to 3 with a "View all" route to Profile.
2. `Title Claimed`: show the crown title and who was beaten, if known.
3. `Title Defended`: show when the current holder improved or stayed ahead.
4. `Personal Best`: preserve existing score-screen language and treat it as a major moment.
5. `Local Record`: show when the run becomes the best local score for a track, race type, speed class, challenge, or seed.
6. `Party Winner`: show on Party standings/final screen, not just individual score screen.

Suggested examples:

- `Badge Earned: Turbo Survivor`
- `Title Claimed: Sunset Champion`
- `Title Defended: Fuel Champion`
- `New Personal Best`
- `Local Record: Redline Turbo`
- `Party Winner: Joshua`

Score screen rules:

- Do not award or show new rewards for debug speed runs.
- If the run is not saved, callouts should say why and avoid fake reward moments.
- Keep the row short. Rewards should feel special, not like a receipt.
- For kids, use clear names and bright icon treatment. For adults, preserve record details: score, seed, mode, and date.
- Party Mode should make the room result obvious before profile bookkeeping.

## Driver Profile Screen

The Driver Profile screen should be a local brag book and a quick comparison panel. It should not become a complicated account page.

Recommended layout:

### Header

- Player name.
- Car name and current car sprite.
- Best score.
- Current titles held.
- Recently earned badge strip.

### Current Titles

- Show title crown cards such as `Sunset Champion`, `Fuel Champion`, and `Party Champion`.
- Each card should show the record that currently supports it: score, mode, track, seed, challenge, or party format.
- If the player holds no titles, show a simple prompt like "No crowns yet. Chase a local record."

### Badges Earned

- Grid of earned badges.
- Locked visible badges show name and requirement.
- Hidden badges stay hidden until earned, then reveal with date.
- Filters: All, Starter, Skill, Race Mode, Track, Fuel Run, Challenge, Party.

### Recently Earned

- Last 3 to 5 earned badges with date.
- Useful for kids and families because the newest accomplishment is easy to find.

### Best Scores

- Overall best score.
- Best Sunset Highway score.
- Best Redline Run score.
- Best Classic score.
- Best Fuel Run score.
- Best Turbo score.
- Best fixed-seed score when viewing seed history.

### Challenge Completions

- Completed challenge count.
- Best score and best progress per challenge.
- Dare completions.
- Clean challenge completions.
- Fuel challenge completions.

### Party Wins

- Party wins.
- Best of 3 wins.
- Total Score wins.
- Close wins.
- Comeback wins.
- Same-seed rivalry results if lightweight party history is added.

### Fuel Run Stats

- Fuel Run finishes.
- Best Fuel Run score.
- Most fuel remaining at finish.
- Lowest-fuel finish.
- Gas cans collected lifetime.
- Fuel Panic / Last Drop challenge status.

### Turbo Stats

- Turbo finishes.
- Best Turbo score.
- Turbo challenge completions.
- Redline Turbo progress.
- Best Turbo clean run.

## Save Structure

The current save key should remain localStorage-compatible and migration-safe. A rewards system can extend the existing `neonRoadRally.v1` object without changing the storage model.

Recommended shape:

```js
{
  version: 2,
  players: [
    {
      id: "local-player-id",
      name: "JOSHUA",
      bestScore: 123456,
      rewards: {
        badges: {
          first_run_posted: {
            earned: true,
            firstEarnedAt: "2026-05-08T12:00:00.000Z",
            firstRunId: "run-id",
            firstScore: 1200,
            source: {
              trackId: "sunset-highway",
              raceTypeId: "classic",
              speedClass: "arcade",
              seed: "SUNSET-123"
            }
          }
        },
        recentBadgeIds: ["first_run_posted"],
        stats: {
          partyWins: 0,
          bestOf3Wins: 0,
          totalScoreWins: 0,
          fuelRunFinishes: 0,
          turboFinishes: 0,
          cleanFinishes: 0
        }
      }
    }
  ],
  rewards: {
    version: 1,
    titleHistory: [
      {
        titleId: "sunset_champion",
        playerId: "local-player-id",
        claimedAt: "2026-05-08T12:00:00.000Z",
        lostAt: "",
        sourceRunId: "run-id"
      }
    ],
    partyHistory: [
      {
        sessionId: "party-session-id",
        completedAt: "2026-05-08T12:00:00.000Z",
        roundType: "bestOf3",
        seedMode: "sameSeedForRound",
        winnerPlayerId: "local-player-id",
        standings: []
      }
    ]
  }
}
```

Save rules:

- Badges are stored per player.
- Each badge stores the first earned date.
- Store only small source metadata needed for profile display.
- Titles should be recalculated from leaderboard, challenge progress, and party history where possible.
- Title history is optional flavor, not the source of truth for current holders.
- Party title support may need lightweight completed session history because current Party Mode results are session-based.
- Use versioned migration functions so missing `rewards` data creates defaults safely.
- Unknown badge ids or malformed reward entries should be ignored, not crash the game.
- Corrupted reward data should fall back to empty rewards while preserving the rest of the save if possible.

## Fairness Rules

- No performance upgrades.
- No score-affecting unlocks.
- No easier Road Director, fuel drain, collision box, manual boost count, ramp behavior, or multiplier changes from rewards.
- Debug speed runs should not award badges, titles, profile stats, party wins, or challenge reward credit.
- Corrupted saves should recover safely and never block the player from starting a race.
- Rewards are local-only for now.
- Local competition is trust-based; that is acceptable for family and same-room play.
- Future online or featured challenge submissions must use separate validation and should not trust local reward state.
- Hidden badges should not push players into unsafe or unclear behavior. They should be delightful discoveries, not secret chores.

## Future Cosmetic Unlocks

Cosmetics should be earned through badges or profile milestones but remain presentation-only.

Safe unlock ideas:

- Profile frames.
- Boost trail colors.
- Badge icon variants.
- Car sprite variants.
- Title screen nameplates.
- Menu themes.
- Crown styles for current title holders.
- Score screen banner treatments.
- Profile background patterns tied to tracks.
- Party winner confetti styles.

Current limitation:

Player car sprites are fixed-color assets for now, so cosmetic rewards should not depend on dynamic recoloring yet. The safest first car cosmetics are alternate sprite files, profile frames, boost trail colors, and nameplates. Avoid any design that requires changing the pixels of `assets/cars/*.png` in real time.

Cosmetic guardrails:

- Do not make a cosmetic imply a stat upgrade.
- Do not hide readability-critical UI behind unlocks.
- Do not make kids grind for basic fun presentation.
- Do not make cosmetics depend on online accounts.

## Party Mode Ideas

Party rewards should create immediate room energy. They should be visible on the final standings screen and then saved to profiles.

Suggested Party rewards:

- `Party Winner`: Win any completed Party Mode session.
- `Close Call`: Win or lose a Party session by a small score margin.
- `Comeback Kid`: Win after trailing earlier in the session.
- `Best of 3 Winner`: Win a Best of 3 Party session.
- `Total Score Champion`: Win a Total Score Party session.
- `Same Seed Rivalry`: Complete a same-seed Party round where every player had the same road.
- `Room Stealer`: Take first place on the final run.
- `Perfect Party`: Win every round in a Best of 3.
- `Photo Finish`: Top two players finish within a tiny score margin.
- `Seed Rematch Winner`: Win a rematch on the same seed after losing the prior round.

Party-specific design notes:

- Party reward text should be short and celebratory.
- Party reward logic should run only after a session is complete, except for temporary "leader changed" callouts.
- Same Seed Rivalry is important because it reinforces fairness.
- Party titles should be easy for kids to understand: "Party Champion" is better than complicated statistical labels.

## Challenge Mode Ideas

Challenge badges should make fixed-seed runs feel like official tests. They should use existing challenge ids and objective results.

Suggested Challenge rewards:

- `First Challenge`: Complete any challenge.
- `Dare Cleared`: Complete any Dare difficulty challenge.
- `Clean Challenger`: Complete `clean-line` or `clean-redline`.
- `Redline Dare`: Complete `redline-dare` or `the-dare`.
- `Fuel Panic Survivor`: Complete or survive deep into `fuel-panic`.
- `Last Drop`: Complete `last-drop`.
- `Boost Hunter`: Complete `boost-hunter`.
- `Near-Miss Run`: Complete `near-miss-run`.
- `Challenge Sweep`: Complete every current challenge.
- `Dare Double`: Complete two Dare challenges.

Challenge-specific design notes:

- Fixed challenge seeds make completion feel fair.
- The profile should show completion count and best score, not just badges.
- Do not overfill Challenge Mode with reward popups before the core objective result is clear.
- Some challenge badges can double as normal run badges when the same behavior happens outside Challenge Mode, but challenge completions should always feel more official.

## Implementation Plan

### Phase 1: Local Reward Core

- Add badge definitions with ids, names, descriptions, categories, difficulty, visibility, and trigger metadata.
- Add a badge evaluator that receives the final run summary, player profile, challenge result, party result, and current save state.
- Add player badge storage with first earned date, first run source, and recent badge ids.
- Add a title evaluator that recalculates current holders from saved leaderboard entries, challenge progress, and party history where possible.
- Add score screen callouts for `Badge Earned`, `Title Claimed`, `Title Defended`, `Personal Best`, `Local Record`, and `Party Winner`.
- Add a Driver Profile display with current titles, earned badges, recent badges, best scores, challenge completions, party wins, Fuel Run stats, and Turbo stats.

### Phase 2: Presentation And Collection Depth

- Add badge visuals/icons.
- Add profile filters by category.
- Add visible progress indicators for near-term badges where the math is simple.
- Add cosmetic unlock definitions and unlock display.
- Add profile frames, nameplates, boost trail colors, and menu themes.
- Add better party history presentation if Party titles need stronger support.

### Phase 3: Future Featured Challenge Layer

- Add website/global featured challenge titles only after the local system is stable.
- Keep future featured titles narrow: same track, same race type, same race mode, same seed, same game version.
- Use public racer tags, not free-form local player names.
- Keep global submission optional and separate from local rewards.
- Never let global logic block local scoring, local badges, or local Party Mode.

## Risks / Things To Avoid

- Too many badges at launch. The first set should feel curated, not noisy.
- Fake grind such as "play 500 runs" without a meaningful skill or family-play reason.
- Stat upgrades or unlocks that change score potential.
- Complicated menus that bury the next race.
- Hard-to-understand title rules.
- Online/global logic before the local system is stable.
- Reward popups that interrupt Party Mode flow.
- Hidden badges that encourage bad play without making the purpose clear after they unlock.
- Storing current titles as brittle state when they can be recalculated from records.
- Making cosmetics depend on dynamic car recoloring before the sprite asset pipeline supports it.

## Recommended First Shipping Set

### First 10 Badges

1. `first_run_posted` - First Run Posted.
2. `first_finish` - Track Complete.
3. `first_personal_best` - Personal Best.
4. `top_20_entry` - Top 20 Driver.
5. `sunset_finisher` - Sunset Finisher.
6. `turbo_survivor` - Turbo Survivor.
7. `clean_run` - Clean Run.
8. `near_miss_streak` - Near-Miss Streak.
9. `fuel_run_finish` - Fuel Run Finish.
10. `first_challenge` - First Challenge.

These cover onboarding, pride, skill, Fuel Run, Challenge Mode, and the existing score-screen loop without requiring party history or complex lifetime stats.

### First 6 Titles

1. `sunset_champion` - Sunset Champion.
2. `redline_champion` - Redline Champion.
3. `turbo_champion` - Turbo Champion.
4. `fuel_champion` - Fuel Champion.
5. `challenge_champion` - Challenge Champion.
6. `clean_champion` - Clean Champion.

These can be derived mostly from saved leaderboard and challenge progress data. `party_champion` should follow once completed party session history is stored cleanly.

### Suggested Implementation Order

1. Add static badge definitions and category metadata.
2. Add migration-safe per-player badge storage.
3. Evaluate badges at the end of saved, non-debug runs.
4. Show newly earned badges on the score screen.
5. Add profile badge grid and recent badge strip.
6. Add title evaluator for leaderboard-derived titles.
7. Show title claimed/defended callouts on the score screen.
8. Add current title cards to Driver Profile.
9. Add party session history, then Party rewards and Party Champion.
10. Add visuals/icons, filters, progress indicators, and cosmetic unlocks.
