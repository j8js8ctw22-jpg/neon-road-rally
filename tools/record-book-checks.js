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
  const route = getDefaultOfficialRouteForTrack(DEFAULT_TRACK_ID);
  const pacingVersion = getActivePacingRulesVersion(route.raceTypeId);
  const challenge = CHALLENGES[0];
  const badge = getVisibleBadgeDefinitions()[0];
  const oldDate = "2024-01-02T03:04:05.000Z";
  const newDate = "2025-02-03T04:05:06.000Z";
  const bestTimeKey = getBestTimeKey(route.trackId, route.raceTypeId, route.speedClassId, pacingVersion);
  const player = {
    id: "player-one",
    name: "JOSH",
    car: normalizeCarConfig({ ...DEFAULT_CAR, name: "NIGHT RUNNER" }),
    neonCash: 125,
    cosmetics: createDefaultPlayerCosmetics(),
    bestScore: 92000,
    bestTimes: {
      [bestTimeKey]: {
        gameVersion: GAME_VERSION,
        trackId: route.trackId,
        raceTypeId: route.raceTypeId,
        speedClassId: route.speedClassId,
        pacingRulesVersion: pacingVersion,
        finishTimeMs: 41234,
        runId: "official-run-1",
        seed: route.seed,
        score: 92000,
        date: oldDate
      }
    },
    badges: { earned: { [badge.id]: { earnedAt: oldDate } } },
    badgeStats: { totalRuns: 8, totalFinishes: 5 },
    challengeProgress: {
      completed: {
        [challenge.id]: {
          completed: true,
          bestScore: 44000,
          firstCompletedAt: oldDate,
          bestDate: oldDate
        }
      }
    }
  };
  const officialEntry = {
    runId: "official-run-1",
    gameVersion: GAME_VERSION,
    playerId: player.id,
    playerName: player.name,
    carName: player.car.name,
    trackId: route.trackId,
    speedClass: route.speedClassId,
    raceType: route.raceTypeId,
    pacingRulesVersion: pacingVersion,
    seed: route.seed,
    score: 92000,
    status: "finished",
    time: 41.234,
    finishTimeMs: 41234,
    slowdownHits: 0,
    date: oldDate
  };
  const playgroundEntry = {
    recordId: "playground-record-1",
    runId: "playground-run-1",
    gameVersion: GAME_VERSION,
    playerId: player.id,
    playerName: player.name,
    carName: player.car.name,
    trackId: route.trackId,
    speedClass: route.speedClassId,
    raceType: route.raceTypeId,
    pacingRulesVersion: pacingVersion,
    seed: "CUSTOM-12345",
    score: 51000,
    status: "finished",
    finishTimeMs: 48900,
    date: oldDate
  };
  const enduranceEntry = {
    recordId: "endurance-record-1",
    runId: "endurance-run-1",
    gameVersion: GAME_VERSION,
    playerId: player.id,
    playerName: player.name,
    carName: player.car.name,
    trackId: route.trackId,
    officialRouteId: route.id,
    speedClass: route.speedClassId,
    raceType: DEFAULT_RACE_TYPE_ID,
    pacingRulesVersion: pacingVersion,
    seed: route.seed,
    officialFinishTimeMs: 42000,
    officialFinishScore: 80000,
    survivalTime: 27,
    currentLap: 2,
    lapsCompleted: 1,
    postFinishScore: 14000,
    endedBy: "Escape",
    date: oldDate
  };
  const fixture = {
    version: 1,
    players: [player],
    currentPlayerId: player.id,
    speedClassId: DEFAULT_SPEED_CLASS_ID,
    controllerPresetId: DEFAULT_CONTROLLER_PRESET_ID,
    leaderboard: [officialEntry],
    playgroundRecords: [playgroundEntry],
    enduranceLeaderboard: [enduranceEntry],
    challengeProgress: {
      progress: {
        [challenge.id]: {
          completed: true,
          bestScore: 44000,
          bestProgressPercent: 100,
          bestDate: oldDate,
          bestRunSummary: { status: "finished", score: 44000, seed: route.seed }
        }
      }
    },
    audio: {}
  };

  const exported = createRecordBookDocument(fixture, new Date("2026-06-23T12:00:00.000Z"));
  assert.strictEqual(exported.schema, RECORD_BOOK_SCHEMA_ID, "Export should identify the Record Book schema");
  assert.strictEqual(exported.schemaVersion, 1, "Export should include schema version 1");
  assert.strictEqual(exported.checksum, calculateRecordBookChecksum(exported.payload), "Export checksum should cover the payload");
  assert.strictEqual(exported.payload.leaderboards.official.length, 1, "Official records should export");
  assert.strictEqual(exported.payload.leaderboards.playground.length, 1, "Playground records should export");
  assert.strictEqual(exported.payload.leaderboards.endurance.length, 1, "Endurance records should export");
  assert.strictEqual(exported.payload.leaderboards.official[0].gameVersion, GAME_VERSION, "Records should preserve game version");
  assert.strictEqual(exported.payload.leaderboards.official[0].pacingRulesVersion, pacingVersion, "Records should preserve pacing rules version");
  assert.strictEqual(exported.payload.leaderboards.official[0].seed, route.seed, "Records should preserve seed");
  assert.strictEqual(exported.payload.leaderboards.official[0].date, oldDate, "Records should preserve date");
  assert(exported.payload.titles.length === TITLE_DEFINITIONS.length, "Derived titles should export");

  const validated = validateRecordBookDocument(JSON.stringify(exported));
  const empty = new PlayerProfileManager("record-book-empty").defaultData();
  const firstMerge = mergeRecordBookPayload(empty, validated.payload);
  assert(firstMerge.changed, "Importing into an empty device should change it");
  assert.strictEqual(firstMerge.afterChecksum, exported.checksum, "Empty-device import should reproduce an identical Record Book");
  assert.strictEqual(firstMerge.data.currentPlayerId, player.id, "Empty-device import should select the imported player");

  const secondMerge = mergeRecordBookPayload(firstMerge.data, validated.payload);
  assert.strictEqual(secondMerge.changed, false, "Re-importing the same file should change nothing");
  assert.strictEqual(secondMerge.afterChecksum, firstMerge.afterChecksum, "Re-import should remain checksum-stable");

  const corrupted = JSON.parse(JSON.stringify(exported));
  corrupted.payload.personalBests[0].bestScore += 1;
  assert.throws(
    () => validateRecordBookDocument(JSON.stringify(corrupted)),
    /checksum does not match/i,
    "Corrupted payloads should be rejected"
  );
  const unknown = JSON.parse(JSON.stringify(exported));
  unknown.schemaVersion = 99;
  assert.throws(
    () => validateRecordBookDocument(JSON.stringify(unknown)),
    /unsupported record book schema version/i,
    "Unknown schemas should be rejected"
  );

  const local = JSON.parse(JSON.stringify(fixture));
  local.players[0].name = "LOCAL NAME";
  local.players[0].bestScore = 99000;
  local.players[0].bestTimes[bestTimeKey].finishTimeMs = 43000;
  local.players[0].bestTimes[bestTimeKey].date = newDate;
  local.players[0].badges = createDefaultBadgeSave();
  local.players[0].badgeStats = { totalRuns: 12, totalFinishes: 3 };
  local.players[0].challengeProgress.completed[challenge.id].bestScore = 1000;
  local.players[0].challengeProgress.completed[challenge.id].firstCompletedAt = newDate;
  local.leaderboard[0].date = newDate;
  const mergedExisting = mergeRecordBookPayload(local, validated.payload);
  const mergedPlayer = mergedExisting.data.players[0];
  assert.strictEqual(mergedPlayer.name, "LOCAL NAME", "Import should not wipe an existing local profile name");
  assert.strictEqual(mergedPlayer.bestScore, 99000, "Import should keep the better local best score");
  assert.strictEqual(mergedPlayer.bestTimes[bestTimeKey].finishTimeMs, 41234, "Import should keep the faster time");
  assert(mergedPlayer.badges.earned[badge.id], "Import should union earned badges");
  assert.strictEqual(mergedPlayer.badgeStats.totalRuns, 12, "Import should keep the higher idempotent badge stat");
  assert.strictEqual(mergedPlayer.badgeStats.totalFinishes, 5, "Import should take the higher imported badge stat");
  assert.strictEqual(mergedPlayer.challengeProgress.completed[challenge.id].bestScore, 44000, "Import should keep the best challenge score");
  assert.strictEqual(mergedPlayer.challengeProgress.completed[challenge.id].firstCompletedAt, oldDate, "Import should preserve the oldest completion date");
  assert.strictEqual(mergedExisting.data.leaderboard[0].date, oldDate, "Duplicate records should preserve the oldest date");

  const oversizedPlayerPayload = JSON.parse(JSON.stringify(exported.payload));
  oversizedPlayerPayload.players = Array.from({ length: 80 }, (_, index) => ({ ...player, id: "player-" + index }));
  assert(normalizeRecordBookPayload(oversizedPlayerPayload).players.length <= LOCAL_PLAYER_MAX_COUNT, "Import should enforce the local player cap");

  const metadata = new RecordBookMetadataStore("record-book-reminder-test");
  metadata.data.firstUnexportedChangeAt = "2026-05-01T00:00:00.000Z";
  metadata.save();
  assert(metadata.shouldRemind(exported.checksum, true, new Date("2026-06-23T00:00:00.000Z")), "Changed records should remind after 30 days");
  metadata.markExported(exported.checksum, new Date("2026-06-23T00:00:00.000Z"));
  assert(!metadata.shouldRemind(exported.checksum, true, new Date("2026-08-01T00:00:00.000Z")), "An unchanged exported Record Book should not remind");
})();
`, context, { filename: "record-book-checks.vm.js" });

console.log("Record Book checks passed: export parity, safe merge, idempotency, checksum rejection, limits, and reminders.");
