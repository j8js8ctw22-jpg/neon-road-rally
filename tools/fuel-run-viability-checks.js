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
  const app = Object.create(NeonRoadRally.prototype);
  app.renderer = app.createRoadDirectorSignatureRenderer();

  const routeRows = OFFICIAL_ROUTES
    .filter((route) => !route.prototype)
    .filter((route) => officialRouteSupportsRaceType(route, FUEL_RUN_RACE_TYPE_ID))
    .filter((route) => ["turbo", "overdrive", "redline"].includes(route.speedClassId));

  const rows = routeRows.map((route) => {
    const track = getTrackById(route.trackId);
    const rules = getOfficialFuelViabilityRules(route, route.speedClassId, track);
    const capture = app.captureRoadDirectorSequence({
      officialRouteId: route.id,
      raceTypeId: FUEL_RUN_RACE_TYPE_ID,
      waveLimit: OFFICIAL_FULL_ROUTE_SIGNATURE_WAVE_LIMIT,
      dt: OFFICIAL_FULL_ROUTE_SIGNATURE_DT,
      routeSeedLocked: true,
      preserveFullRoadDirectorSequence: true,
      fullRouteSignature: true
    });
    const repeat = app.captureRoadDirectorSequence({
      officialRouteId: route.id,
      raceTypeId: FUEL_RUN_RACE_TYPE_ID,
      waveLimit: OFFICIAL_FULL_ROUTE_SIGNATURE_WAVE_LIMIT,
      dt: OFFICIAL_FULL_ROUTE_SIGNATURE_DT,
      routeSeedLocked: true,
      preserveFullRoadDirectorSequence: true,
      fullRouteSignature: true
    });
    const signature = app.getRoadDirectorRouteSignature(capture, { officialRouteId: route.id });
    const repeatSignature = app.getRoadDirectorRouteSignature(repeat, { officialRouteId: route.id });
    const progressSamples = capture.gasCanSpawnProgressSamples || [];
    const timeSamples = (capture.gasCanSpawnTimeSamples || []).slice().sort((a, b) => a - b);
    const postMidpointOpportunities = progressSamples.filter((progress) => progress >= rules.midpointProgress).length;
    const lateOpportunities = progressSamples.filter((progress) => progress >= rules.lateProgress).length;
    const finishNoFuelStretch = capture.elapsed - (timeSamples.length ? timeSamples[timeSamples.length - 1] : 0);
    const gapTimes = [0].concat(timeSamples).concat([capture.elapsed]);
    let maxLateNoFuelStretch = 0;
    for (let index = 1; index < gapTimes.length; index += 1) {
      const start = gapTimes[index - 1];
      const end = gapTimes[index];
      if (end >= capture.elapsed * rules.lateProgress) {
        maxLateNoFuelStretch = Math.max(maxLateNoFuelStretch, end - start);
      }
    }
    const row = {
      routeId: route.id,
      routeName: route.name,
      trackId: route.trackId,
      speedClassId: route.speedClassId,
      raceTypeId: FUEL_RUN_RACE_TYPE_ID,
      seed: route.seed,
      signatureHash: signature.hash,
      repeatSignatureHash: repeatSignature.hash,
      signatureStable: signature.hash === repeatSignature.hash,
      waveCount: signature.waveCount,
      finishReached: Boolean(capture.finishReached),
      simOutOfFuel: Boolean(capture.simOutOfFuel),
      fuelRemaining: Number((capture.fuelRemaining || 0).toFixed(2)),
      gasCansSpawned: capture.gasCansSpawned || 0,
      gasCansCollected: capture.gasCansCollected || 0,
      gasCansMissed: capture.gasCansMissed || 0,
      postMidpointOpportunities,
      lateOpportunities,
      longestNoFuelStretch: Number((capture.longestNoFuelStretch || 0).toFixed(2)),
      finishNoFuelStretch: Number(finishNoFuelStretch.toFixed(2)),
      maxLateNoFuelStretch: Number(maxLateNoFuelStretch.toFixed(2)),
      placementAttempts: capture.gasCanPlacementAttempts || 0,
      placementRejectedUnsafe: capture.gasCanPlacementRejectedUnsafe || 0,
      placementSkippedNoFairRoute: capture.gasCanPlacementSkippedNoFairRoute || 0,
      routeSafetyFailures: capture.gasCanRouteSafetyFailures || 0,
      recoveryPlacements: capture.gasCanRecoveryPlacements || 0,
      minTotalOpportunities: rules.minTotalOpportunities,
      cansNeededForFuelBudget: rules.cansNeededForFuelBudget,
      maxNoFuelStretchSeconds: rules.maxNoFuelStretchSeconds,
      lateSafetyRequired: false
    };
    row.lateSafetyRequired = row.fuelRemaining <= rules.lateFuelThreshold
      || row.finishNoFuelStretch > rules.maxNoFuelStretchSeconds;

    assert.strictEqual(row.signatureStable, true, row.routeId + " Fuel Run route signature should repeat exactly");
    assert.strictEqual(row.finishReached, true, row.routeId + " Fuel Run simulation should reach the finish");
    assert.strictEqual(row.simOutOfFuel, false, row.routeId + " Fuel Run should be finishable when all spawned cans are collected");
    assert(row.gasCansSpawned >= rules.minTotalOpportunities, row.routeId + " should spawn the official minimum fair gas-can opportunities");
    assert(row.gasCansCollected === row.gasCansSpawned, row.routeId + " skilled viability simulation should collect every spawned gas can");
    assert(row.postMidpointOpportunities >= rules.minPostMidpointOpportunities, row.routeId + " should include a post-midpoint gas opportunity");
    if (row.lateSafetyRequired) {
      assert(row.lateOpportunities >= rules.minLateOpportunities, row.routeId + " should include a late-route safety gas opportunity");
    }
    assert(!(rules.minTotalOpportunities > 1 && row.gasCansSpawned <= 1), row.routeId + " should not have only one gas can when fuel budget needs more");
    assert(row.longestNoFuelStretch <= rules.maxNoFuelStretchSeconds + 0.001, row.routeId + " should not have a huge all-route no-fuel stretch");
    assert(row.maxLateNoFuelStretch <= rules.maxNoFuelStretchSeconds + 0.001, row.routeId + " should not have a huge late no-fuel stretch");
    return row;
  });

  const noReturn = rows.find((row) => row.routeId === "midnight-no-return-pass" && row.speedClassId === "redline");
  assert(noReturn, "No-Return Pass Redline Fuel Run regression row should be present");
  assert(noReturn.gasCansSpawned > 1, "No-Return Pass Redline should spawn more than one fair gas can");
  assert(noReturn.lateOpportunities >= 1, "No-Return Pass Redline should include a late-route gas opportunity");
  assert.strictEqual(noReturn.simOutOfFuel, false, "No-Return Pass Redline should be finishable after collecting all spawned cans");

  console.log("FUEL_RUN_VIABILITY_CHECKS_OK");
  console.log(JSON.stringify({
    routeCount: rows.length,
    signatureStatus: {
      stableAcrossRepeatedRuns: rows.every((row) => row.signatureStable),
      version: OFFICIAL_ROUTE_SIGNATURE_VERSION
    },
    noReturnPass: noReturn,
    minGasBySpeedClass: rows.reduce((acc, row) => {
      acc[row.speedClassId] = Math.min(acc[row.speedClassId] || Infinity, row.gasCansSpawned);
      return acc;
    }, {}),
    maxNoFuelStretch: rows.reduce((max, row) => Math.max(max, row.longestNoFuelStretch), 0),
    rows
  }, null, 2));
`, context, { filename: "fuel-run-viability-checks" });
