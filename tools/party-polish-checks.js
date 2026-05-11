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
  const players = [
    { id: "p1", name: "Lucas", car: DEFAULT_CAR, bestScore: 0 },
    { id: "p2", name: "Jonah", car: DEFAULT_CAR, bestScore: 0 },
    { id: "p3", name: "Nola", car: DEFAULT_CAR, bestScore: 0 }
  ];
  const names = (session, round = 0) => session.getRoundPlayers(round).map((player) => player.name).join("|");
  const rosterNames = players.map((player) => player.name).join("|");

  const roster = new PartySession({
    players,
    sharedSeed: "ROAD-11111",
    roundType: PARTY_ROUND_TYPE_BEST_OF_3,
    startingOrderMode: PARTY_STARTING_ORDER_MODE_ROSTER
  });
  assert.strictEqual(names(roster, 0), rosterNames, "Roster Order should preserve selected order");
  assert.strictEqual(names(roster, 1), rosterNames, "Roster Order should stay stable every round");

  const randomOnce = new PartySession({
    players,
    sharedSeed: "ROAD-11111",
    roundType: PARTY_ROUND_TYPE_BEST_OF_3,
    startingOrderMode: PARTY_STARTING_ORDER_MODE_RANDOM_ONCE,
    orderSeed: "party-order-test"
  });
  assert.notStrictEqual(names(randomOnce, 0), rosterNames, "Random Once should shuffle the roster");
  assert.strictEqual(names(randomOnce, 1), names(randomOnce, 0), "Random Once should reuse the same order");
  assert.strictEqual(names(randomOnce, 2), names(randomOnce, 0), "Random Once should reuse the same order through all rounds");

  const randomEvery = new PartySession({
    players,
    sharedSeed: "ROAD-11111",
    roundType: PARTY_ROUND_TYPE_BEST_OF_3,
    startingOrderMode: PARTY_STARTING_ORDER_MODE_RANDOM_EVERY_ROUND,
    orderSeed: "party-order-test"
  });
  assert.notStrictEqual(names(randomEvery, 1), names(randomEvery, 0), "Random Every Round should reshuffle between rounds");

  const oldSession = new PartySession({ players, sharedSeed: "ROAD-11111" });
  assert.strictEqual(oldSession.startingOrderMode, PARTY_STARTING_ORDER_MODE_ROSTER, "Old sessions should normalize to roster order");

  const summary = (score, fields = {}) => ({
    finalScore: score,
    status: fields.status || "finished",
    reason: fields.reason || "",
    time: fields.time || 55,
    speedClass: "arcade",
    raceTypeId: fields.raceTypeId || DEFAULT_RACE_TYPE_ID,
    seed: "ROAD-11111",
    trackId: DEFAULT_TRACK_ID,
    trackName: "Sunset Highway",
    progress: fields.progress ?? 1,
    distance: fields.distance ?? 155000,
    trackDistance: 155000,
    nearMisses: fields.nearMisses || 0,
    manualBoostsUsed: fields.manualBoostsUsed || 0,
    boostPadsCollected: fields.boostPadsCollected || 0,
    rampsUsed: fields.rampsUsed || 0,
    laneMoves: fields.laneMoves || 0,
    slowdownHits: fields.slowdownHits || 0,
    gasCansCollected: fields.gasCansCollected || 0,
    gasCansSpawned: fields.gasCansSpawned || 0,
    fuelCollected: fields.gasCansCollected || 0,
    fuelRemaining: fields.fuelRemaining || 0,
    lowestFuelReached: fields.lowestFuelReached || 0
  });

  const awardsSession = new PartySession({
    players,
    sharedSeed: "ROAD-11111",
    roundType: PARTY_ROUND_TYPE_ONE_RUN,
    startingOrderMode: PARTY_STARTING_ORDER_MODE_ROSTER
  });
  awardsSession.addResult(summary(1000, { nearMisses: 5, manualBoostsUsed: 2 }));
  awardsSession.addResult(summary(2000, { nearMisses: 5, laneMoves: 4 }));
  awardsSession.addResult(summary(1500, { rampsUsed: 3, slowdownHits: 0 }));
  const awards = calculatePartyAwards(awardsSession);
  const nearMiss = awards.find((award) => award.id === "near_miss_driver");
  assert(nearMiss && nearMiss.winners.length === 2, "Tied near-miss awards should keep both winners");
  assert(awards.some((award) => award.id === "highest_single_run" && award.winners[0].playerId === "p2"), "Highest Single Run should use best score");
  assert(awards.some((award) => award.id === "ramp_rider" && award.winners[0].playerId === "p3"), "Ramp Rider should use ramps actually used");

  const zeroSession = new PartySession({ players, sharedSeed: "ROAD-11111", startingOrderMode: PARTY_STARTING_ORDER_MODE_ROSTER });
  zeroSession.addResult(summary(100));
  zeroSession.addResult(summary(100));
  zeroSession.addResult(summary(100));
  assert(!calculatePartyAwards(zeroSession).some((award) => award.id === "near_miss_driver"), "Zero-value near-miss awards should be hidden");

  const antiFarm = new PartySession({ players, sharedSeed: "ROAD-11111", startingOrderMode: PARTY_STARTING_ORDER_MODE_ROSTER });
  antiFarm.addResult(summary(100, { status: "crashed", progress: 0.03, laneMoves: 30, rampsUsed: 4, manualBoostsUsed: 3, distance: 4000 }));
  antiFarm.addResult(summary(120, { status: "crashed", progress: 0.03, laneMoves: 20, rampsUsed: 3, manualBoostsUsed: 2, distance: 4000 }));
  antiFarm.addResult(summary(130, { status: "crashed", progress: 0.03, laneMoves: 15, rampsUsed: 2, manualBoostsUsed: 1, distance: 4000 }));
  const farmAwards = calculatePartyAwards(antiFarm).map((award) => award.id);
  assert(!farmAwards.includes("lane_shifter"), "Lane Shifter should respect meaningful-distance anti-farming");
  assert(!farmAwards.includes("ramp_rider"), "Ramp Rider should respect meaningful-distance anti-farming");
  assert(!farmAwards.includes("boost_hunter"), "Boost Hunter should respect meaningful-distance anti-farming");

  const classicAwards = calculatePartyAwards(awardsSession).map((award) => award.id);
  assert(!classicAwards.includes("fuel_saver") && !classicAwards.includes("gas_grabber"), "Fuel awards should not appear in Classic Party");

  const fuelSession = new PartySession({
    players,
    sharedSeed: "ROAD-11111",
    raceType: FUEL_RUN_RACE_TYPE_ID,
    startingOrderMode: PARTY_STARTING_ORDER_MODE_ROSTER
  });
  fuelSession.addResult(summary(1000, { raceTypeId: FUEL_RUN_RACE_TYPE_ID, gasCansCollected: 2, fuelRemaining: 38 }));
  fuelSession.addResult(summary(2000, { raceTypeId: FUEL_RUN_RACE_TYPE_ID, gasCansCollected: 6, fuelRemaining: 8 }));
  fuelSession.addResult(summary(1500, { raceTypeId: FUEL_RUN_RACE_TYPE_ID, gasCansCollected: 1, fuelRemaining: 30 }));
  const fuelAwards = calculatePartyAwards(fuelSession).map((award) => award.id);
  assert(fuelAwards.includes("fuel_saver"), "Fuel Saver should appear in Fuel Run Party");
  assert(fuelAwards.includes("gas_grabber"), "Gas Grabber should appear in Fuel Run Party");
  assert(fuelAwards.includes("low_fuel_hero"), "Low Fuel Hero should appear for low-fuel Fuel Run finishes");

  const manager = new PlayerProfileManager("party-polish-test");
  manager.data.players = players.map((player) => ({
    ...player,
    badges: createDefaultBadgeSave(),
    badgeStats: createDefaultPlayerBadgeStats(),
    challengeProgress: createDefaultPlayerChallengeSave()
  }));
  const progress = manager.recordPartyAwardProgress("p2", fuelSession.finalAwards?.length ? fuelSession.finalAwards : calculatePartyAwards(fuelSession));
  assert(progress.awardIds.includes("gas_grabber"), "Party awards should update permanent award counters");
  const p2Stats = normalizePlayerBadgeStats(manager.getPlayerById("p2").badgeStats);
  assert(p2Stats.partyAwardsWon > 0, "Award progress should persist on the driver profile");
  assert(p2Stats.partyGasGrabberAwards === 1, "Fuel-only Gas Grabber should update its Fuel Run party counter");
})();
`, context, { filename: "party-polish-checks" });

console.log("PARTY_POLISH_CHECKS_OK");
