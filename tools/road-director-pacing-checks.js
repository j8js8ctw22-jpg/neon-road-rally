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

async function main() {
  await vm.runInContext(`
  (async () => {
    function assertWithin(value, min, max, message) {
      assert(value >= min && value <= max, message + " got " + value.toFixed(3));
    }

    function simulateFinishTime(trackId, speedClassId, raceTypeId = DEFAULT_RACE_TYPE_ID, boostPadProgresses = []) {
      const track = createRaceTrackForSpeedClass(getTrackById(trackId), speedClassId, raceTypeId);
      let elapsed = 0;
      let distance = 0;
      let boostTimer = 0;
      let nextPadIndex = 0;
      while (distance < track.distanceToFinish && elapsed < 300) {
        const progress = clamp(distance / Math.max(1, track.distanceToFinish), 0, 1);
        while (nextPadIndex < boostPadProgresses.length && progress >= boostPadProgresses[nextPadIndex]) {
          boostTimer = Math.max(boostTimer, SPEED_TUNING.padBoostDuration);
          nextPadIndex += 1;
        }
        const base = getTrackCruiseSpeed(track, progress, speedClassId);
        const boostMultiplier = boostTimer > 0 ? SPEED_TUNING.padBoostMultiplier : 1;
        const speed = clamp(
          base * boostMultiplier,
          SPEED_TUNING.minSpeed,
          track.maxSpeed * SPEED_TUNING.maxBoostOverrunMultiplier
        );
        const dt = 0.016;
        distance += speed * dt;
        elapsed += dt;
        boostTimer = Math.max(0, boostTimer - dt);
      }
      return elapsed;
    }

    function makeHarnessRenderer() {
      return {
        width: 1280,
        height: 720,
        road: { x: 260, y: 0, w: 760, h: 720, laneW: 152 },
        run: null,
        aheadForY(y) {
          return clamp((this.height - y) / this.height * VIEW_DISTANCE, 0, VIEW_DISTANCE);
        },
        yForDistanceAt(distance, runDistance) {
          return this.height - clamp((distance - runDistance) / VIEW_DISTANCE, -0.2, 1.2) * this.height;
        },
        laneCenter(lane) {
          return this.road.x + this.road.laneW * (lane + 0.5);
        },
        scaleForY(y) {
          return 0.45 + clamp(y / this.height, 0, 1) * 0.65;
        },
        getObstacleVisualSize(type, scale = 1) {
          const info = OBSTACLE_INFO[type] || { w: 70, h: 84 };
          return { w: info.w * scale, h: info.h * scale, drawScale: scale };
        },
        getObstacleScreenPositionAt(obstacle, runDistance) {
          const y = this.yForDistanceAt(obstacle.distance, runDistance);
          const lane = Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane;
          return { x: this.laneCenter(clamp(lane, 0, LANES - 1)), y, scale: this.scaleForY(y) };
        },
        getObstacleVisualRectAt(obstacle, runDistance) {
          const info = OBSTACLE_INFO[obstacle.type];
          if (!info || obstacle.type === "warning") return null;
          const ahead = obstacle.distance - runDistance;
          if (ahead < -70 || ahead > VIEW_DISTANCE + 160) return null;
          const position = this.getObstacleScreenPositionAt(obstacle, runDistance);
          const size = this.getObstacleVisualSize(obstacle.type, position.scale, obstacle);
          return {
            centerX: position.x,
            centerY: position.y,
            renderedX: position.x - size.w / 2,
            renderedY: position.y - size.h / 2,
            renderedWidth: size.w,
            renderedHeight: size.h
          };
        },
        getObstacleHitboxAt(obstacle, runDistance) {
          const config = getHitboxConfig(obstacle.type);
          const visual = this.getObstacleVisualRectAt(obstacle, runDistance);
          if (!config || !visual) return null;
          return rectFromCenter(
            visual.centerX + config.offsetX * visual.renderedWidth,
            visual.centerY + config.offsetY * visual.renderedHeight,
            visual.renderedWidth * config.width,
            visual.renderedHeight * config.height
          );
        },
        getObstacleHitbox(obstacle) {
          return this.getObstacleHitboxAt(obstacle, this.run?.distance || 0);
        },
        getPlayerHitbox() {
          return rectFromCenter(
            this.laneCenter(TRACK_DIRECTOR.centerLane),
            this.height * PLAYER_START_Y_RATIO,
            70,
            100
          );
        }
      };
    }

    const expectedTimes = {
      "sunset-highway": {
        arcade: [74, 76],
        pro: [66, 69],
        turbo: [56, 59],
        overdrive: [50, 53],
        redline: [47, 50]
      },
      "redline-run": {
        arcade: [60, 63],
        pro: [57, 60],
        turbo: [53, 56],
        overdrive: [50, 53],
        redline: [48, 50]
      }
    };

    Object.entries(expectedTimes).forEach(([trackId, modeRanges]) => {
      let previousSeconds = null;
      Object.entries(modeRanges).forEach(([speedClassId, range]) => {
        const classic = createRaceTrackForSpeedClass(getTrackById(trackId), speedClassId, DEFAULT_RACE_TYPE_ID);
        const fuel = createRaceTrackForSpeedClass(getTrackById(trackId), speedClassId, FUEL_RUN_RACE_TYPE_ID);
        const seconds = simulateFinishTime(trackId, speedClassId, DEFAULT_RACE_TYPE_ID);
        assertWithin(seconds, range[0], range[1], trackId + " " + speedClassId + " finish target");
        if (previousSeconds !== null) {
          assert(previousSeconds - seconds >= 2, trackId + " " + speedClassId + " should be meaningfully faster than the previous speed class");
        }
        previousSeconds = seconds;
        assert.strictEqual(classic.pacingRulesVersion, RACE_PACING_RULES_VERSION, "Classic should use current pacing rules version");
        assert.strictEqual(fuel.pacingRulesVersion, RACE_PACING_RULES_VERSION, "Fuel Run should use current pacing rules version");
        assert.strictEqual(fuel.distanceToFinish, classic.distanceToFinish, "Fuel Run should share competitive race distance");
      });
    });

    const pursuitDistances = {
      "sunset-highway": { arcade: 155000, pro: 193750, turbo: 186000, overdrive: 173600, redline: 173600 },
      "redline-run": { arcade: 165000, pro: 206250, turbo: 178200, overdrive: 184800, redline: 194700 }
    };
    Object.entries(pursuitDistances).forEach(([trackId, distances]) => {
      Object.entries(distances).forEach(([speedClassId, distance]) => {
        const track = createRaceTrackForSpeedClass(getTrackById(trackId), speedClassId, PURSUIT_RACE_TYPE_ID);
        assert.strictEqual(track.distanceToFinish, distance, "Pursuit distance should remain on its previous pacing");
        assert.strictEqual(track.pacingRulesVersion, PURSUIT_PACING_RULES_VERSION, "Pursuit should keep its own pacing version");
      });
    });

    const boostSavings = simulateFinishTime("sunset-highway", "arcade", DEFAULT_RACE_TYPE_ID)
      - simulateFinishTime("sunset-highway", "arcade", DEFAULT_RACE_TYPE_ID, [0.2, 0.5, 0.72]);
    assertWithin(boostSavings, 0.95, 1.35, "Three reachable boost pads should create visible pace value");

    const sunsetSections = getTrackSections(createRaceTrackForSpeedClass(getTrackById("sunset-highway"), "arcade"));
    assert.deepStrictEqual(sunsetSections.map((section) => section.id), ["launch", "groove", "pressure", "breather", "finalPush"], "Sunset should keep the five-section race arc");
    const sunsetArcade = simulateFinishTime("sunset-highway", "arcade");
    const sunsetBreather = sunsetSections.find((section) => section.id === "breather");
    assert((sunsetBreather.endProgress - sunsetBreather.startProgress) * sunsetArcade >= 9, "Sunset Arcade breather should be long enough to register");

    const app = Object.create(NeonRoadRally.prototype);
    app.renderer = makeHarnessRenderer();
    const fuelTrack = createRaceTrackForSpeedClass(getTrackById("sunset-highway"), "arcade", FUEL_RUN_RACE_TYPE_ID);
    const fuelRegressionRun = {
      track: fuelTrack,
      speedClassId: "arcade",
      raceTypeId: FUEL_RUN_RACE_TYPE_ID,
      distance: 0,
      elapsed: 0,
      currentSpeed: getTrackCruiseSpeed(fuelTrack, 0, "arcade"),
      targetLane: TRACK_DIRECTOR.centerLane,
      playerYRatio: PLAYER_START_Y_RATIO,
      roadSeed: "LANE-57517"
    };
    const fuelRegressionManager = new ObstacleManager({
      run: fuelRegressionRun,
      renderer: app.renderer,
      randomFloat: () => 0.5
    });
    fuelRegressionManager.reset(fuelTrack);
    const blockedFuelRoute = [
      fuelRegressionManager.createObstacle("slowCar", 2, 1000, { waveType: "LANE-57517" }),
      fuelRegressionManager.createObstacle("truck", 3, 1010, { waveType: "LANE-57517" }),
      fuelRegressionManager.createObstacle("slowCar", 4, 1020, { waveType: "LANE-57517" })
    ];
    const blockedGasCan = fuelRegressionManager.createObstacle("gasCan", 3, 1500, { waveType: "LANE-57517" });
    const blockedGasResult = fuelRegressionManager.canSpawnObstacle(blockedGasCan, blockedFuelRoute);
    assert(!blockedGasResult.canSpawn, "LANE-57517-style blocker cluster should reject impossible gas can");
    assert(blockedGasResult.gasCanReachabilityFailure, "Rejected gas can should be tagged as a reachability prevention");
    assert(blockedGasResult.gasCanRouteSafetyFailure, "Rejected gas can should be tagged as a route-safety failure");
    const reachableGasCan = fuelRegressionManager.createObstacle("gasCan", 0, 1500, { waveType: "LANE-57517" });
    const reachableGasResult = fuelRegressionManager.canSpawnObstacle(reachableGasCan, []);
    assert(reachableGasResult.canSpawn, "Gas can with a clear side route should remain spawnable");
    const nearFutureHard = [
      fuelRegressionManager.createObstacle("slowCar", 2, 1760, { waveType: "fuel-exit-check" })
    ];
    const noEscapeGasCan = fuelRegressionManager.createObstacle("gasCan", 2, 1500, { waveType: "fuel-exit-check" });
    const noEscapeResult = fuelRegressionManager.canSpawnObstacle(noEscapeGasCan, nearFutureHard);
    assert(!noEscapeResult.canSpawn, "Gas can should reject a near-future hard blocker in the pickup lane");
    const escapableFutureHard = [
      fuelRegressionManager.createObstacle("slowCar", 2, 2350, { waveType: "fuel-exit-check" })
    ];
    const escapableGasCan = fuelRegressionManager.createObstacle("gasCan", 2, 1500, { waveType: "fuel-exit-check" });
    const escapableResult = fuelRegressionManager.canSpawnObstacle(escapableGasCan, escapableFutureHard);
    assert(escapableResult.canSpawn, "Gas can should allow a distant same-lane blocker once spacing and exits are clear");
    const blockedExitRoute = [
      fuelRegressionManager.createObstacle("slowCar", 1, 1660, { waveType: "fuel-exit-check" }),
      fuelRegressionManager.createObstacle("slowCar", 2, 2100, { waveType: "fuel-exit-check" }),
      fuelRegressionManager.createObstacle("truck", 3, 1660, { waveType: "fuel-exit-check" })
    ];
    const blockedExitGasCan = fuelRegressionManager.createObstacle("gasCan", 2, 1500, { waveType: "fuel-exit-check" });
    const blockedExitResult = fuelRegressionManager.canSpawnObstacle(blockedExitGasCan, blockedExitRoute);
    assert(!blockedExitResult.canSpawn, "Gas can should reject a route with no safe lane exit after pickup");
    const rewardVisualConflict = [
      fuelRegressionManager.createObstacle("boostPad", 3, 1600, { waveType: "fuel-readability-check" })
    ];
    const clutteredGasCan = fuelRegressionManager.createObstacle("gasCan", 2, 1500, { waveType: "fuel-readability-check" });
    const clutteredGasResult = fuelRegressionManager.canSpawnObstacle(clutteredGasCan, rewardVisualConflict);
    assert(!clutteredGasResult.canSpawn, "Gas can should keep visual spacing from nearby boost/ramp rewards");
    const partyFuelRun = {
      ...fuelRegressionRun,
      partyMode: true,
      partySeedLocked: true
    };
    const partyFuelManager = new ObstacleManager({
      run: partyFuelRun,
      renderer: app.renderer,
      randomFloat: () => 0.5
    });
    partyFuelManager.reset(fuelTrack);
    const partyBlockedGasResult = partyFuelManager.canSpawnObstacle(
      partyFuelManager.createObstacle("gasCan", 3, 1500, { waveType: "party-fuel-safety" }),
      blockedFuelRoute
    );
    assert(!partyBlockedGasResult.canSpawn, "Party Fuel Run should use the same gas-can route safety");
    const denseFuelRun = {
      ...fuelRegressionRun,
      gasCanPlacementAttempts: 0,
      gasCanPlacementRejectedUnsafe: 0,
      gasCanPlacementSkippedNoFairRoute: 0,
      gasCanRouteSafetyFailures: 0
    };
    const denseManager = new ObstacleManager({
      run: denseFuelRun,
      renderer: app.renderer,
      randomFloat: () => 0.5
    });
    denseManager.reset(fuelTrack);
    denseManager.obstacles = [0, 1, 2, 3, 4].map((lane) => denseManager.createObstacle("slowCar", lane, 1450 + lane * 8, { waveType: "dense-fuel-route" }));
    const denseContext = {
      run: denseFuelRun,
      section: getTrackSection(fuelTrack, 0.2),
      band: { id: "pressure" },
      sectionProgress: 0.2,
      pressureBudget: 4
    };
    const denseResult = denseManager.director.createWaveResult("fuelTrafficGate", denseContext);
    const denseGasCan = denseManager.director.trySpawnFuelCan([2], 1500, denseContext, denseResult, "denseFuelRoute");
    assert.strictEqual(denseGasCan, null, "High-density fuel route should skip instead of forcing an unfair gas can");
    assert(denseFuelRun.gasCanPlacementAttempts >= LANES, "Skipped gas route should record alternate lane attempts");
    assert.strictEqual(denseFuelRun.gasCanPlacementSkippedNoFairRoute, 1, "Skipped gas route should record no-fair-route telemetry");
    const lane57517Fuel = await app.runSpawnSafetySimulationCore({
      runs: 1,
      speedClassIds: ["arcade"],
      trackId: "sunset-highway",
      raceTypeId: FUEL_RUN_RACE_TYPE_ID,
      dt: 0.3,
      seed: "LANE-57517"
    });
    assert.strictEqual(lane57517Fuel.gasCanOverlaps, 0, "LANE-57517 Fuel Run should avoid gas can overlaps");
    assert.strictEqual(lane57517Fuel.routeReadabilityFailures, 0, "LANE-57517 Fuel Run should preserve readable routes");
    for (const trackId of ["sunset-highway", "redline-run"]) {
      const summary = await app.runSpawnSafetySimulationCore({
        runs: 2,
        speedClassIds: ["arcade"],
        trackId,
        raceTypeId: DEFAULT_RACE_TYPE_ID,
        dt: 0.3,
        seed: "road-director-pacing"
      });
      const sections = summary.director.sectionStats || {};
      assert.strictEqual(summary.visibleSpawnViolations, 0, trackId + " should avoid visible spawn violations");
      assert(summary.maxWavesSpawnedInSingleFrame <= 1, trackId + " should preserve one scheduled wave per frame");
      assert.strictEqual(summary.routeReadabilityFailures, 0, trackId + " should preserve readable routes");
      assert(summary.longestDeadScreenSeconds <= 2.6, trackId + " should avoid long dead screens");
      ["launch", "groove", "pressure", "breather", "finalPush"].forEach((sectionId) => {
        assert((sections[sectionId]?.totalWaves || 0) > 0, trackId + " should populate " + sectionId);
      });
      const breatherFamilies = sections.breather?.waveFamilyCounts || {};
      const breatherFamilyTotal = Object.values(breatherFamilies).reduce((sum, count) => sum + count, 0);
      const breatherRewardShare = breatherFamilyTotal
        ? ((breatherFamilies.reward || 0) + (breatherFamilies.solution || 0) + (breatherFamilies.recovery || 0)) / breatherFamilyTotal
        : 0;
      const pressureHotterThanBreather = (sections.pressure?.averagePressure || 0) > (sections.breather?.averagePressure || 0);
      const breatherReadsAsRewardWindow = breatherRewardShare >= 0.55
        && (sections.breather?.averagePressure || 0) < (sections.finalPush?.averagePressure || 0);
      assert(pressureHotterThanBreather || breatherReadsAsRewardWindow, trackId + " breather should read as lower pressure or reward recovery");
      assert((sections.finalPush?.averagePressure || 0) > (sections.groove?.averagePressure || 0), trackId + " final push should be distinct from groove");
      assert(Object.keys(summary.director.waveFamilyCounts || {}).length >= 4, trackId + " should produce varied wave families");
      assert(Object.keys(summary.director.directorIntentCounts || {}).length >= 4, trackId + " should produce varied director intents");
    }

    const playtestRows = [
      normalizePlaytestRunSummary({
        status: "finished",
        trackId: "sunset-highway",
        raceTypeId: "classic",
        raceModeId: "arcade",
        elapsedTime: 74.944,
        finishTimeMs: 74944,
        sectionDurations: { launch: 10.4, groove: 18.1, pressure: 18.2, breather: 10.5, finalPush: 17.7 },
        boostPadsCollected: 3,
        boostPadsReachableSeen: 4,
        boostPadsMissedReachable: 1,
        personalBestTimeDelta: 0.719,
        paceBehindTime: 0.719,
        paceFeedbackActiveTime: 42,
        paceFeedbackSampleCount: 220,
        directorIntentCounts: { rewardTemptation: 3, recovery: 2 },
        waveFamilyCounts: { reward: 3, recovery: 2 }
      }),
      normalizePlaytestRunSummary({
        status: "finished",
        trackId: "redline-run",
        raceTypeId: "classic",
        raceModeId: "redline",
        elapsedTime: 49.248,
        finishTimeMs: 49248,
        sectionDurations: { launch: 6.1, groove: 13.3, pressure: 12.2, breather: 6.1, finalPush: 13.3 },
        boostPadsCollected: 4,
        boostPadsReachableSeen: 4,
        boostPadsMissedReachable: 0,
        personalBestTimeDelta: -0.382,
        paceAheadTime: 0.382,
        paceFeedbackActiveTime: 35,
        paceFeedbackSampleCount: 190,
        directorIntentCounts: { finalPushPressure: 3, escalateSection: 2 },
        waveFamilyCounts: { precision: 3, "speed-skill": 2 }
      })
    ];
    app.playtestReports = { getRuns: () => playtestRows };
    const aggregate = app.buildPlaytestReportAggregate("all");
    assert.strictEqual(aggregate.finishTimeStats.count, 2, "Playtest Report should aggregate finish-time stats");
    assert(aggregate.sectionDurationAverages.breather > 0, "Playtest Report should aggregate section durations");
    assert.strictEqual(aggregate.totalBoostPadsCollected, 7, "Playtest Report should aggregate collected boost pads");
    assert.strictEqual(aggregate.totalBoostPadsReachableSeen, 8, "Playtest Report should aggregate reachable boost pads");
    assert.strictEqual(aggregate.totalBoostPadsMissedReachable, 1, "Playtest Report should aggregate missed reachable boost pads");
    assert.strictEqual(aggregate.personalBestTimeDeltaStats.count, 2, "Playtest Report should aggregate PB deltas");
    assert.strictEqual(aggregate.paceFeedbackRunCount, 2, "Playtest Report should count pace-feedback runs");
    assert(aggregate.directorIntentRows.length >= 4, "Playtest Report should expose director intent variety");
    assert(aggregate.waveFamilyRows.length >= 4, "Playtest Report should expose wave family variety");

    const fuelRoutePlaytest = normalizePlaytestRunSummary({
      status: "finished",
      trackId: "sunset-highway",
      raceTypeId: FUEL_RUN_RACE_TYPE_ID,
      raceModeId: "arcade",
      elapsedTime: 72.4,
      gasCansSpawned: 5,
      gasCansCollected: 3,
      gasCanSpawnRejected: 4,
      gasCanSpawnRepositioned: 1,
      gasCanReachabilityFailuresPrevented: 2,
      gasCanPlacementAttempts: 8,
      gasCanPlacementRejectedUnsafe: 4,
      gasCanPlacementSkippedNoFairRoute: 1,
      gasCanRouteSafetyFailures: 3,
      gasCanNearestBlockerDistanceMin: 312
    });
    assert.strictEqual(fuelRoutePlaytest.gasCanReachabilityFailuresPrevented, 2, "Playtest rows should keep fuel reachability prevention counters");
    assert.strictEqual(fuelRoutePlaytest.gasCanPlacementSkippedNoFairRoute, 1, "Playtest rows should keep fuel placement skip counters");
    app.playtestReports = { getRuns: () => [fuelRoutePlaytest] };
    const fuelAggregate = app.buildPlaytestReportAggregate("all");
    assert.strictEqual(fuelAggregate.fuelSummary.gasCanSpawnRejected, 4, "Playtest Report should aggregate rejected gas can spawn attempts");
    assert.strictEqual(fuelAggregate.fuelSummary.gasCanSpawnRepositioned, 1, "Playtest Report should aggregate repositioned gas cans");
    assert.strictEqual(fuelAggregate.fuelSummary.gasCanReachabilityFailuresPrevented, 2, "Playtest Report should aggregate prevented impossible gas cans");
    assert.strictEqual(fuelAggregate.fuelSummary.gasCanPlacementAttempts, 8, "Playtest Report should aggregate gas can placement attempts");
    assert.strictEqual(fuelAggregate.fuelSummary.gasCanPlacementRejectedUnsafe, 4, "Playtest Report should aggregate unsafe gas can placement rejects");
    assert.strictEqual(fuelAggregate.fuelSummary.gasCanPlacementSkippedNoFairRoute, 1, "Playtest Report should aggregate skipped no-fair-route gas cans");
    assert.strictEqual(fuelAggregate.fuelSummary.gasCanRouteSafetyFailures, 3, "Playtest Report should aggregate gas can route safety failures");
    assert.strictEqual(fuelAggregate.fuelSummary.gasCanNearestBlockerDistanceMin, 312, "Playtest Report should keep closest gas-can blocker distance");
  })()
  `, context, { filename: "road-director-pacing-checks" });
}

main()
  .then(() => {
    console.log("ROAD_DIRECTOR_PACING_CHECKS_OK");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
