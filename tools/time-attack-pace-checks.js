#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(repoRoot, "game.js"), "utf8");
const storage = new Map();
const context = vm.createContext({
  assert,
  console,
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  },
  window: {
    addEventListener: () => {}
  },
  document: {},
  navigator: {},
  performance: { now: () => 0 },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  setTimeout,
  clearTimeout
});

vm.runInContext(source, context, { filename: "game.js" });

vm.runInContext(`
(() => {
  assert.strictEqual(formatFinishTimeMs(getFinishTimeMsFromSeconds(30.456)), "30.456s", "Finish time should keep milliseconds");
  assert.strictEqual(formatSignedTimeDeltaSeconds(-0.382), "-0.382s", "Fast PB deltas should show negative subsecond gain");
  assert.strictEqual(formatSignedTimeDeltaSeconds(0.719), "+0.719s", "Slower PB deltas should show positive subsecond gap");

  const oldSave = {
    version: 1,
    currentPlayerId: "p1",
    players: [{
      id: "p1",
      name: "Joshua",
      car: DEFAULT_CAR,
      bestScore: 1000,
      badges: createDefaultBadgeSave(),
      badgeStats: createDefaultPlayerBadgeStats(),
      challengeProgress: createDefaultPlayerChallengeSave()
    }],
    leaderboard: [{
      runId: "old-run-1",
      playerId: "p1",
      playerName: "Joshua",
      carName: "Neon",
      trackId: "sunset-highway",
      trackName: "Sunset Highway",
      raceType: "classic",
      raceMode: "arcade",
      speedClass: "arcade",
      seed: "ROAD-11111",
      score: 1000,
      status: "finished",
      time: 42.7,
      date: "2026-05-01T00:00:00.000Z"
    }]
  };
  localStorage.setItem("pace-save-test", JSON.stringify(oldSave));
  const manager = new PlayerProfileManager("pace-save-test");
  const oldEntry = manager.data.leaderboard[0];
  assert.strictEqual(oldEntry.finishTimeMs, 42700, "Old leaderboard finish times should hydrate from time");
  const previous = manager.getBestTimeRecord("p1", "sunset-highway", "classic", "arcade");
  assert(previous, "Old leaderboard entry should seed player best time");
  assert.strictEqual(previous.finishTimeMs, 42700, "Player PB time should be migration-safe");

  const currentMs = getFinishTimeMsFromSeconds(42.318);
  const delta = (currentMs - previous.finishTimeMs) / 1000;
  assert.strictEqual(delta.toFixed(3), "-0.382", "PB comparison should be by exact milliseconds");
  const update = manager.recordBestFinishTime({
    scoreSaved: true,
    status: "finished",
    playerId: "p1",
    runId: "new-run-1",
    trackId: "sunset-highway",
    raceTypeId: "classic",
    speedClass: "arcade",
    seed: "ROAD-11111",
    finalScore: 900,
    time: 42.318,
    finishTimeMs: currentMs,
    finishTimeSecondsPrecise: 42.318
  });
  assert(update && update.improved, "Faster finish should update best-time record even if score is lower");
  assert.strictEqual(manager.getBestTimeRecord("p1", "sunset-highway", "classic", "arcade").finishTimeMs, 42318, "Best-time record should store faster precise finish");

  const slowerMs = getFinishTimeMsFromSeconds(43.037);
  const slowerDelta = (slowerMs - manager.getBestTimeRecord("p1", "sunset-highway", "classic", "arcade").finishTimeMs) / 1000;
  assert.strictEqual(slowerDelta.toFixed(3), "0.719", "Behind-best comparison should preserve fractional gap");

  const playtest = normalizePlaytestRunSummary({
    status: "finished",
    raceTypeId: "classic",
    raceModeId: "arcade",
    trackId: "sunset-highway",
    elapsedTime: 42.318,
    finishTimeMs: 42318,
    finishTimeSecondsPrecise: 42.318,
    personalBestTimeDelta: -0.382,
    paceAheadTime: 0.382,
    boostPadsCollected: 2,
    boostPadsMissedReachable: 1,
    estimatedBoostRouteQuality: "mixed"
  });
  assert.strictEqual(playtest.finishTimeMs, 42318, "Playtest summary should keep finishTimeMs");
  assert.strictEqual(playtest.finishTimeSecondsPrecise, 42.318, "Playtest summary should keep precise seconds");
  assert.strictEqual(playtest.personalBestTimeDelta, -0.382, "Playtest summary should keep PB delta");
  assert.strictEqual(playtest.paceAheadTime, 0.382, "Playtest summary should keep pace ahead time");
  assert.strictEqual(playtest.boostPadsMissedReachable, 1, "Playtest summary should keep missed reachable boosts");
  assert.strictEqual(playtest.estimatedBoostRouteQuality, "mixed", "Playtest summary should keep boost route quality");
})();
`, context, { filename: "pace-timing-checks" });

vm.runInContext(`
(() => {
  const fakeRun = {
    distance: 0,
    currentSpeed: 600,
    targetLane: 2,
    playerYRatio: PLAYER_START_Y_RATIO,
    track: TRACKS[0],
    speedClassId: "arcade",
    boostPadsCollected: 0,
    boostPadsReachableSeen: 0,
    boostPadsMissedReachable: 0
  };
  const manager = new ObstacleManager({
    run: fakeRun,
    renderer: {
      height: 720,
      aheadForY: () => 220
    },
    randomFloat: () => 0.5
  });
  manager.track = TRACKS[0];
  const boost = {
    id: "boost-test",
    type: "boostPad",
    lane: 2,
    laneFloat: 2,
    distance: 1000,
    hit: false,
    remove: false
  };
  manager.trackBoostPadOpportunity(boost, 1000);
  assert.strictEqual(fakeRun.boostPadsReachableSeen, 1, "Reachable boost should be counted once when it becomes a route chance");
  fakeRun.distance = 900;
  manager.trackBoostPadOpportunity(boost, 100);
  assert.strictEqual(fakeRun.boostPadsMissedReachable, 1, "Passing a reachable uncollected boost should count as missed");
  manager.trackBoostPadOpportunity(boost, 80);
  assert.strictEqual(fakeRun.boostPadsMissedReachable, 1, "Missed boost should not double count");
  assert.strictEqual(getBoostRouteFeedbackText(0, 1), "Missed boost chances hurt your pace.", "Missed boost route feedback should be compact and honest");

  const collectedBoost = {
    id: "boost-collected-test",
    type: "boostPad",
    lane: 2,
    laneFloat: 2,
    distance: 1200,
    hit: false,
    remove: false
  };
  fakeRun.distance = 0;
  fakeRun.boostPadsCollected = 0;
  fakeRun.boostPadsReachableSeen = 0;
  fakeRun.boostPadsMissedReachable = 0;
  manager.trackBoostPadOpportunity(collectedBoost, 1200);
  collectedBoost.hit = true;
  manager.trackBoostPadOpportunity(collectedBoost, 100);
  assert.strictEqual(fakeRun.boostPadsMissedReachable, 0, "Collected boosts should not count as missed");
})();
`, context, { filename: "pace-boost-checks" });

console.log("TIME_ATTACK_PACE_CHECKS_OK");
