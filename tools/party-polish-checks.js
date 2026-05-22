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
    lowestFuelReached: fields.lowestFuelReached || 0,
    ...fields
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

  const bonusSession = new PartySession({
    players,
    sharedSeed: "ROAD-11111",
    raceType: DEFAULT_RACE_TYPE_ID,
    bonusSurvival: PARTY_BONUS_SURVIVAL_ON,
    startingOrderMode: PARTY_STARTING_ORDER_MODE_ROSTER
  });
  const bonusResult = bonusSession.addResult(summary(80000, {
    officialEnduranceResult: {
      officialFinishTimeMs: 42800,
      officialFinishScore: 80000,
      postFinishScore: 12000,
      survivalTime: 24,
      currentLap: 2,
      endedBy: "Escape"
    },
    neonFlowEnabled: true,
    flowBreaksTriggered: 1,
    flowBreakHazardsCleared: 2,
    flowBreakSparksCollected: 1
  }));
  assert.strictEqual(bonusResult.score, 92000, "Party Bonus Survival should add bonus score to the locked official finish score");
  assert.strictEqual(bonusResult.status, "finished", "Party Bonus Survival results should count as finished Party turns");
  assert.strictEqual(bonusResult.reason, "Official Finish + Bonus Survival", "Party Bonus Survival should label the combined result clearly");
  assert.strictEqual(bonusResult.partyBonusSurvival, true, "Party Bonus Survival telemetry should mark the result");
  assert.strictEqual(bonusResult.bonusSurvivalScore, 12000, "Party Bonus Survival should preserve post-finish score telemetry");
  assert.strictEqual(bonusResult.flowBreaksTriggered, 1, "Party results should carry Flow Break telemetry");
  const bonusStanding = bonusSession.standings()[0];
  assert.strictEqual(bonusStanding.latestBonusSurvival, true, "Party standings should expose latest Bonus Survival state");
  assert.strictEqual(bonusStanding.latestFlowBreaksTriggered, 1, "Party standings should expose latest Flow Break count");
  const rematch = bonusSession.createRematch("ROAD-22222");
  assert.strictEqual(rematch.bonusSurvival, PARTY_BONUS_SURVIVAL_ON, "Party rematch should preserve Bonus Survival option");

  let pad = null;
  navigator.getGamepads = () => (pad ? [pad] : []);
  const laneMoveAttempts = [];
  const laneMoveSuccesses = [];
  const verticalInputs = [];
  const driftInputs = [];
  let boosts = 0;
  let pauses = 0;
  let starts = 0;
  let enduranceEnds = 0;
  const fakeGame = {
    screen: "game",
    run: { paused: false, ended: false, debugFrozen: false, raceActive: true, pendingEndStatus: "", targetLane: 2 },
    officialEnduranceCanEnd: false,
    audio: { activate() {}, playMusic() {}, playSfx() {} },
    layer: { querySelectorAll: () => [] },
    recordInputEvent() {},
    requestLaneMove(direction) {
      const before = this.run.targetLane;
      const next = Math.max(0, Math.min(LANES - 1, before + direction));
      const changed = next !== before;
      laneMoveAttempts.push({ direction, before, next, changed });
      this.run.targetLane = next;
      if (changed) laneMoveSuccesses.push({ direction, lane: next });
      return changed;
    },
    setVerticalInput(direction) { verticalInputs.push(direction); },
    setDriftInput(direction, held) { driftInputs.push({ direction, held }); },
    useManualBoost() { boosts += 1; },
    togglePause() { pauses += 1; this.run.paused = !this.run.paused; },
    canEndOfficialEndurance() { return this.officialEnduranceCanEnd; },
    endOfficialEndurance(reason) { enduranceEnds += 1; this.lastEnduranceReason = reason; },
    startCurrentPartyRun() { starts += 1; }
  };
  const makePad = ({ axes = [0, 0], buttons = [], mapping = "standard" } = {}) => ({
    connected: true,
    index: 0,
    id: "DualSense QA",
    mapping,
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: Boolean(buttons.includes(index)), value: buttons.includes(index) ? 1 : 0 }))
  });
  const input = new InputManager(fakeGame);
  const releasePad = () => {
    pad = makePad();
    input.update(1 / 60);
  };
  const pressPad = (options, frames = 1) => {
    pad = makePad(options);
    for (let frame = 0; frame < frames; frame += 1) input.update(1 / 60);
  };

  fakeGame.run.targetLane = 2;
  pressPad({ buttons: [15] }, 3);
  assert.strictEqual(fakeGame.run.targetLane, 3, "D-pad right should move one lane only while held");
  assert.strictEqual(laneMoveSuccesses.length, 1, "Held D-pad right should not repeat lane changes");
  releasePad();
  pressPad({ buttons: [14] });
  assert.strictEqual(fakeGame.run.targetLane, 2, "D-pad left should move one lane after release");
  releasePad();
  fakeGame.run.targetLane = 0;
  const beforeLeftEdgeSuccesses = laneMoveSuccesses.length;
  pressPad({ buttons: [14] });
  assert.strictEqual(fakeGame.run.targetLane, 0, "D-pad left should clamp at the left road edge");
  assert.strictEqual(laneMoveSuccesses.length, beforeLeftEdgeSuccesses, "Left edge input should not create a successful lane move");
  releasePad();
  fakeGame.run.targetLane = LANES - 1;
  const beforeRightEdgeSuccesses = laneMoveSuccesses.length;
  pressPad({ buttons: [15] });
  assert.strictEqual(fakeGame.run.targetLane, LANES - 1, "D-pad right should clamp at the right road edge");
  assert.strictEqual(laneMoveSuccesses.length, beforeRightEdgeSuccesses, "Right edge input should not create a successful lane move");
  releasePad();

  fakeGame.run.targetLane = 2;
  pressPad({ axes: [0.75, 0] });
  assert.strictEqual(fakeGame.run.targetLane, 3, "Left stick right should steer right");
  releasePad();
  pressPad({ axes: [-0.75, 0] });
  assert.strictEqual(fakeGame.run.targetLane, 2, "Left stick left should steer left after release");
  releasePad();
  pressPad({ buttons: [12] });
  assert(verticalInputs.includes(-1), "D-pad up should feed vertical movement");
  releasePad();
  pressPad({ buttons: [13] });
  assert(verticalInputs.includes(1), "D-pad down should feed vertical movement");
  releasePad();
  pressPad({ axes: [0, -0.75] });
  assert(verticalInputs.includes(-1), "Left stick up should feed vertical movement");
  releasePad();

  const beforeDriftSuccesses = laneMoveSuccesses.length;
  pressPad({ buttons: [14, 4] });
  assert.strictEqual(laneMoveSuccesses.length, beforeDriftSuccesses, "L1 plus left should not also lane-tap");
  assert(driftInputs.some((entry) => entry.direction === -1 && entry.held), "L1 plus left should feed Drift Dash left");
  releasePad();
  pressPad({ buttons: [15, 6] });
  assert(driftInputs.some((entry) => entry.direction === 1 && entry.held), "L2 plus right should feed Drift Dash right");
  releasePad();

  pressPad({ buttons: [0] }, 2);
  assert.strictEqual(boosts, 1, "Cross/X should trigger one manual boost edge");
  releasePad();
  fakeGame.screen = "partyTurn";
  pressPad({ buttons: [0] });
  assert.strictEqual(starts, 1, "Cross/X should select/start from Party Turn");
  releasePad();
  pressPad({ mapping: "custom-dualsense", buttons: [0] });
  assert.strictEqual(input.getControllerDiagnosticSnapshot().status, "Controller detected, mapping may vary", "Non-standard gamepad mapping should show cautious diagnostic status");
  releasePad();
  fakeGame.screen = "game";
  fakeGame.run.paused = true;
  pressPad({ buttons: [1] });
  assert.strictEqual(fakeGame.run.paused, false, "Circle should resume paused gameplay where supported");
  releasePad();
  pressPad({ buttons: [9] });
  assert.strictEqual(pauses, 2, "Options/Menu should pause gameplay");
  assert.strictEqual(fakeGame.run.paused, true, "Options/Menu should leave the run paused");
  releasePad();
  fakeGame.run.paused = false;
  fakeGame.officialEnduranceCanEnd = true;
  pressPad({ buttons: [9] });
  assert.strictEqual(enduranceEnds, 1, "Options/Menu should end Bonus Survival when end is available");
  assert.strictEqual(fakeGame.lastEnduranceReason, "Driver Ended", "Options/Menu should use the manual-end reason for Bonus Survival");
  releasePad();
  fakeGame.officialEnduranceCanEnd = false;
  fakeGame.run.paused = false;
  pad = null;
  const keyEvent = (key, code = key) => ({
    key,
    code,
    repeat: false,
    target: null,
    preventDefault() {}
  });
  input.onKeyDown(keyEvent("ArrowLeft", "ArrowLeft"));
  input.onKeyUp(keyEvent("ArrowLeft", "ArrowLeft"));
  assert(laneMoveSuccesses.some((entry) => entry.direction === -1), "Keyboard lane input should still work with gamepad support installed");
  input.onKeyDown(keyEvent(" ", "Space"));
  input.onKeyUp(keyEvent(" ", "Space"));
  assert.strictEqual(boosts, 2, "Keyboard boost should still work with gamepad support installed");
  assert.strictEqual(input.gamepadLastMapping, "standard", "Standard mapping should be captured for diagnostics");
  assert(input.gamepadLastButton.includes("Options/Menu"), "Diagnostics should keep the last pressed controller button");
  assert(input.gamepadLastAxis.includes("Left stick"), "Diagnostics should keep the last active stick axis");
  assert.deepStrictEqual(
    {
      cross: input.gamepadDetectedInputs.cross,
      circle: input.gamepadDetectedInputs.circle,
      options: input.gamepadDetectedInputs.options,
      driftButton: input.gamepadDetectedInputs.driftButton,
      dpad: input.gamepadDetectedInputs.dpad,
      leftStick: input.gamepadDetectedInputs.leftStick
    },
    { cross: true, circle: true, options: true, driftButton: true, dpad: true, leftStick: true },
    "Controller diagnostics should record all standard PS5 test inputs"
  );

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
  window.__partyPolishQaReport = {
    partyBonusSurvival: true,
    controllerStandardMapping: {
      dpadAndStick: true,
      crossBoostAndSelect: true,
      circleResume: true,
      optionsPauseAndBonusEnd: true,
      l1L2DriftDash: true,
      nonStandardMappingCaution: true,
      keyboardStillWorks: true,
      heldRepeatGuard: true,
      laneEdgesClamp: true
    }
  };
})();
`, context, { filename: "party-polish-checks" });

console.log("PARTY_POLISH_CHECKS_OK");
console.log(JSON.stringify(context.window.__partyPolishQaReport || {}, null, 2));
