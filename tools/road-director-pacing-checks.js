#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(repoRoot, "game.js"), "utf8");
const MAX_MEANINGFUL_WAVE_GAP_SECONDS = 8.6;
const MIN_CLASSIC_THREE_PLUS_PRESSURE_SHARE = 0.085;
const storage = new Map();
const context = vm.createContext({
  assert,
  console,
  MAX_MEANINGFUL_WAVE_GAP_SECONDS,
  MIN_CLASSIC_THREE_PLUS_PRESSURE_SHARE,
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
      const roadWidth = Math.min(1280 * CAMERA_CONFIG.roadWidthRatio, CAMERA_CONFIG.roadMaxWidth);
      return {
        width: 1280,
        height: 720,
        road: { x: (1280 - roadWidth) / 2, y: 0, w: roadWidth, h: 720, laneW: roadWidth / LANES },
        run: null,
        aheadForY(y) {
          return getCameraAheadForProjectedRoadT(clamp(y / this.height, 0, 1));
        },
        yForDistanceAt(distance, runDistance) {
          return getCameraProjectedRoadTForAhead(distance - runDistance) * this.height;
        },
        laneCenter(lane) {
          return this.road.x + this.road.laneW * (lane + 0.5);
        },
        scaleForY(y) {
          return getCameraScaleForProjectedRoadT(clamp(y / this.height, 0, 1));
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
      },
      "midnight-ridge": {
        arcade: [74, 76],
        pro: [66, 69],
        turbo: [56, 59],
        overdrive: [50, 53],
        redline: [47, 50]
      },
      "blackout-run": {
        arcade: [74, 76],
        pro: [66, 69],
        turbo: [56, 59],
        overdrive: [50, 53],
        redline: [47, 50]
      },
      "prism-highway": {
        arcade: [74, 76],
        pro: [66, 69],
        turbo: [56, 59],
        overdrive: [50, 53],
        redline: [47, 50]
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
        assert.strictEqual(classic.pacingRulesVersion, getActivePacingRulesVersion(DEFAULT_RACE_TYPE_ID), "Classic should use current pacing rules version");
        assert.strictEqual(fuel.pacingRulesVersion, getActivePacingRulesVersion(FUEL_RUN_RACE_TYPE_ID), "Fuel Run should use current pacing rules version");
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
    const firstOfficialRouteIds = [
      "sunset-neon-palm-sprint",
      "redline-tunnel-spark-sprint",
      "midnight-ridge-lantern-sprint",
      "blackout-headlight-mile",
      "prism-pinkline-sprint"
    ];
    const officialRouteAudit = app.runOfficialRouteDeterminismAudit({
      routeIds: firstOfficialRouteIds,
      raceTypeIds: [DEFAULT_RACE_TYPE_ID, FUEL_RUN_RACE_TYPE_ID],
      repeats: 4,
      waveLimit: 32,
      dt: 0.36
    });
    assert(officialRouteAudit.pass, "Official route signatures should be stable across repeated generation");
    assert(officialRouteAudit.officialSeedNormalizationPassed, "Manual official seeds should normalize to official route identity");
    assert(officialRouteAudit.customSeedRemainsCustom, "Non-official manual seed should remain Custom Road");
    function captureOfficialRacecraft(routeId, raceTypeId = DEFAULT_RACE_TYPE_ID) {
      const capture = app.captureRoadDirectorSequence({
        officialRouteId: routeId,
        raceTypeId,
        waveLimit: OFFICIAL_FULL_ROUTE_SIGNATURE_WAVE_LIMIT,
        dt: 0.36,
        routeSeedLocked: true,
        preserveFullRoadDirectorSequence: true,
        fullRouteSignature: true
      });
      const repeat = app.captureRoadDirectorSequence({
        officialRouteId: routeId,
        raceTypeId,
        waveLimit: OFFICIAL_FULL_ROUTE_SIGNATURE_WAVE_LIMIT,
        dt: 0.36,
        routeSeedLocked: true,
        preserveFullRoadDirectorSequence: true,
        fullRouteSignature: true
      });
      const signature = app.getRoadDirectorRouteSignature(capture, { officialRouteId: routeId });
      const repeatSignature = app.getRoadDirectorRouteSignature(repeat, { officialRouteId: routeId });
      assert.strictEqual(signature.hash, repeatSignature.hash, routeId + " official racecraft signature should repeat");
      return {
        routeId,
        raceTypeId,
        signatureHash: signature.hash,
        recentRoadDirectorRejections: capture.recentRoadDirectorRejections || [],
        sequence: capture.sequence || []
      };
    }

    function hasWave(sample, type, predicate = () => true) {
      return sample.sequence.some((wave) => wave.type === type && predicate(wave));
    }

    const officialLaneMigrationTypes = new Set([
      "officialGateSweep",
      "officialRollingBlockade",
      "officialCrossTrackFork",
      "officialFarSideTemptation"
    ]);
    const officialLaneClosureTypes = new Set([
      "officialLaneClosureSide",
      "officialLaneClosureCenter",
      "officialLaneClosureTaper",
      "officialFinalClosureGate"
    ]);

    function getLaneMigrationMetrics(sample) {
      const sequence = sample.sequence || [];
      const migrationWaves = sequence.filter((wave) => officialLaneMigrationTypes.has(wave.type));
      const passiveBands = Array.from({ length: LANES - 2 }, (_, minLane) => [minLane, minLane + 1, minLane + 2]);
      const bandRows = passiveBands.map((band) => {
        const inBand = (lane) => band.includes(lane);
        const migrationPressure = migrationWaves.filter((wave) => {
          const routeOrReward = (wave.routeLanes || []).concat(wave.rewardLanes || []);
          const asksOutsideBand = routeOrReward.some((lane) => !inBand(lane));
          const pressesBand = (wave.blockedLanes || []).some(inBand);
          return asksOutsideBand && pressesBand;
        }).length;
        const routeOutsideBand = migrationWaves.filter((wave) => (
          (wave.routeLanes || []).some((lane) => !inBand(lane))
        )).length;
        const rewardsMissed = sequence.reduce(
          (sum, wave) => sum + (wave.rewardLanes || []).filter((lane) => !inBand(lane)).length,
          0
        );
        return {
          band: band.join("-"),
          migrationPressure,
          routeOutsideBand,
          rewardsMissed
        };
      });
      const crossTrackDecisions = migrationWaves.filter((wave) => {
        const lanes = (wave.routeLanes || [])
          .concat(wave.rewardLanes || [])
          .concat(wave.blockedLanes || [])
          .filter(Number.isFinite);
        return lanes.length && Math.max(...lanes) - Math.min(...lanes) >= 4;
      }).length;
      return {
        routeId: sample.routeId,
        raceTypeId: sample.raceTypeId,
        speedClassId: getOfficialRouteById(sample.routeId)?.speedClassId || "",
        migrationWaveCount: migrationWaves.length,
        migrationWaveTypes: migrationWaves.map((wave) => wave.type),
        crossTrackDecisions,
        finalPushCommitments: migrationWaves.filter((wave) => wave.sectionId === "finalPush").length,
        minPassiveBandPressure: Math.min(...bandRows.map((row) => row.migrationPressure)),
        minPassiveBandRouteOutside: Math.min(...bandRows.map((row) => row.routeOutsideBand)),
        minPassiveBandRewardsMissed: Math.min(...bandRows.map((row) => row.rewardsMissed)),
        bandRows
      };
    }

    function getLaneClosureMetrics(sample, migrationRow = null) {
      const sequence = sample.sequence || [];
      const closureWaves = sequence.filter((wave) => officialLaneClosureTypes.has(wave.type));
      const passiveBands = Array.from({ length: LANES - 2 }, (_, minLane) => [minLane, minLane + 1, minLane + 2]);
      const bandRows = passiveBands.map((band) => {
        const inBand = (lane) => band.includes(lane);
        const closurePressure = closureWaves.filter((wave) => {
          const closed = wave.laneClosureLanes || wave.blockedLanes || [];
          const routeOrReward = (wave.routeLanes || []).concat(wave.rewardLanes || []);
          const closedInBand = closed.filter(inBand).length;
          const routeOutsideBand = routeOrReward.some((lane) => !inBand(lane));
          return closedInBand >= 1 && routeOutsideBand;
        }).length;
        const fullClosure = closureWaves.some((wave) => {
          const closed = wave.laneClosureLanes || wave.blockedLanes || [];
          return band.every((lane) => closed.includes(lane));
        });
        const migrationBand = migrationRow?.bandRows?.find((row) => row.band === band.join("-"));
        return {
          band: band.join("-"),
          closurePressure,
          combinedPressure: closurePressure + (migrationBand?.migrationPressure || 0),
          fullClosure
        };
      });
      const durations = closureWaves.map((wave) => {
        if (Number.isFinite(wave.laneClosureDuration) && wave.laneClosureDuration > 0) return wave.laneClosureDuration;
        const hardDistances = (wave.obstacles || [])
          .filter((obstacle) => obstacle.type === "barrier")
          .map((obstacle) => obstacle.distance)
          .filter(Number.isFinite);
        return hardDistances.length ? Math.max(...hardDistances) - Math.min(...hardDistances) : 0;
      }).filter((value) => value > 0);
      const zoneDistances = closureWaves.map((wave) => {
        if (Number.isFinite(wave.laneClosureZoneDistance) && wave.laneClosureZoneDistance > 0) return wave.laneClosureZoneDistance;
        if (Number.isFinite(wave.laneClosure?.zoneDistance) && wave.laneClosure.zoneDistance > 0) return wave.laneClosure.zoneDistance;
        const hardDistances = (wave.obstacles || [])
          .filter((obstacle) => obstacle.type === "barrier")
          .map((obstacle) => obstacle.distance)
          .filter(Number.isFinite);
        return hardDistances.length ? Math.max(...hardDistances) - Math.min(...hardDistances) : 0;
      }).filter((value) => value > 0);
      const zoneDurations = closureWaves.map((wave) => (
        Number.isFinite(wave.laneClosureZoneDuration) ? wave.laneClosureZoneDuration : 0
      )).filter((value) => value > 0);
      const warningTimes = closureWaves.map((wave) => (
        Number.isFinite(wave.laneClosureWarningSeconds) ? wave.laneClosureWarningSeconds : 0
      )).filter((value) => value > 0);
      const safeLaneCounts = closureWaves.map((wave) => (
        (wave.laneClosureSafeLanes || []).length || Math.max(0, LANES - ((wave.laneClosureLanes || wave.blockedLanes || []).length))
      ));
      const maxClosed = closureWaves.reduce((max, wave) => (
        Math.max(max, (wave.laneClosureLanes || wave.blockedLanes || []).length)
      ), 0);
      const laneCountForWave = (wave) => {
        if (Number.isFinite(wave.laneClosureClosedLaneCount) && wave.laneClosureClosedLaneCount > 0) return wave.laneClosureClosedLaneCount;
        return (wave.laneClosureLanes || wave.blockedLanes || []).length;
      };
      const countRole = (wave, role) => (
        (wave.obstacles || []).filter((obstacle) => obstacle.laneClosureRole === role).length
      );
      const taperInCount = closureWaves.reduce((sum, wave) => sum + (Number.isFinite(wave.laneClosureTaperInCount) ? wave.laneClosureTaperInCount : countRole(wave, "taper-in")), 0);
      const sustainedMarkerCount = closureWaves.reduce((sum, wave) => (
        sum + (Number.isFinite(wave.laneClosureSustainedMarkerCount)
          ? wave.laneClosureSustainedMarkerCount
          : countRole(wave, "sustained-marker") + countRole(wave, "sustained-hard"))
      ), 0);
      const taperOutCount = closureWaves.reduce((sum, wave) => sum + (Number.isFinite(wave.laneClosureTaperOutCount) ? wave.laneClosureTaperOutCount : countRole(wave, "taper-out")), 0);
      return {
        routeId: sample.routeId,
        raceTypeId: sample.raceTypeId,
        speedClassId: getOfficialRouteById(sample.routeId)?.speedClassId || "",
        laneClosureWaves: closureWaves.length,
        laneClosureZoneCount: closureWaves.length,
        laneClosureWaveTypes: closureWaves.map((wave) => wave.type),
        laneClosureZoneKinds: closureWaves.map((wave) => wave.laneClosureZoneKind || wave.laneClosure?.zoneKind || ""),
        laneClosureLanesClosedMax: maxClosed,
        laneClosureDurationAverage: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0,
        laneClosureZoneDurationAverage: zoneDurations.length ? zoneDurations.reduce((sum, value) => sum + value, 0) / zoneDurations.length : 0,
        laneClosureZoneDistanceAverage: zoneDistances.length ? zoneDistances.reduce((sum, value) => sum + value, 0) / zoneDistances.length : 0,
        laneClosureWarningTimeAverage: warningTimes.length ? warningTimes.reduce((sum, value) => sum + value, 0) / warningTimes.length : 0,
        laneClosureSafeLaneCountMin: safeLaneCounts.length ? Math.min(...safeLaneCounts) : LANES,
        singleLaneClosureCount: closureWaves.filter((wave) => laneCountForWave(wave) === 1).length,
        twoLaneClosureCount: closureWaves.filter((wave) => laneCountForWave(wave) === 2).length,
        threeLaneClosureCount: closureWaves.filter((wave) => laneCountForWave(wave) === 3).length,
        closureTaperInCount: taperInCount,
        closureSustainedMarkerCount: sustainedMarkerCount,
        closureTaperOutCount: taperOutCount,
        laneClosureForcedSideSwitches: closureWaves.filter((wave) => {
          const closed = wave.laneClosureLanes || wave.blockedLanes || [];
          const route = wave.routeLanes || [];
          if (!closed.length || !route.length) return false;
          const closedAverage = closed.reduce((sum, lane) => sum + lane, 0) / closed.length;
          return route.some((lane) => !closed.includes(lane) && Math.abs(lane - closedAverage) >= 2);
        }).length,
        laneClosureFinalPushWaves: closureWaves.filter((wave) => wave.sectionId === "finalPush").length,
        laneClosureRouteFailuresPreventedRejected: Math.max(
          0,
          ...((sample.recentRoadDirectorRejections || [])
            .filter((item) => officialLaneClosureTypes.has(item.waveType || item.type || ""))
            .map((item) => item.activeFieldRouteInvalid || item.reason ? 1 : 0))
        ),
        passiveBandsFullyClosed: bandRows.filter((row) => row.fullClosure).length,
        minPassiveBandClosurePressure: bandRows.length ? Math.min(...bandRows.map((row) => row.closurePressure)) : 0,
        minPassiveBandCombinedPressure: bandRows.length ? Math.min(...bandRows.map((row) => row.combinedPressure)) : 0,
        bandRows
      };
    }

    const safeFastRacecraft = captureOfficialRacecraft("sunset-neon-palm-sprint");
    const boostChainRacecraft = captureOfficialRacecraft("sunset-boostline-pier");
    const rampShortcutRacecraft = captureOfficialRacecraft("sunset-glass-city-climb");
    const redlineFuelRacecraft = captureOfficialRacecraft("redline-switchyard-boostline", FUEL_RUN_RACE_TYPE_ID);
    assert(
      hasWave(safeFastRacecraft, "officialFarSideTemptation", (wave) => (
        wave.routeType === "far-side reward temptation"
        && (wave.routeLanes || []).length >= 1
        && (wave.boostLanes || []).length >= 1
        && (wave.blockedLanes || []).length >= 1
      )),
      "Neon Palm Sprint should expose a far-side reward migration choice"
    );
    assert(
      hasWave(boostChainRacecraft, "officialRollingBlockade", (wave) => (
        wave.routeType === "rolling blockade migration"
        && (wave.routeLanes || []).length >= 2
        && (wave.blockedLanes || []).length >= 1
      )),
      "Boostline Pier should expose a rolling blockade lane-migration read"
    );
    assert(
      hasWave(boostChainRacecraft, "officialCrossTrackFork", (wave) => (
        wave.routeType === "cross-track commitment fork"
        && (wave.boostLanes || []).length >= 1
      )),
      "Boostline Pier should still include an obvious boost route in the migration fork"
    );
    assert(
      hasWave(rampShortcutRacecraft, "officialBoostRampChain", (wave) => (wave.rampLanes || []).length >= 1)
        || hasWave(rampShortcutRacecraft, "rampEscape", (wave) => (wave.rampLanes || []).length >= 1),
      "Glass City Climb should expose a readable ramp shortcut"
    );
    assert(
      hasWave(redlineFuelRacecraft, "fuelTrafficGate", (wave) => (wave.gasCanLanes || []).length >= 1)
        || hasWave(redlineFuelRacecraft, "fuelSupport", (wave) => (wave.boostLanes || []).length >= 1),
      "Switchyard Boostline Fuel Run should keep an official fuel/boost racecraft route"
    );
    const officialRacecraftSafety = await app.runSpawnSafetySimulationCore({
      runs: 1,
      officialRouteId: "sunset-boostline-pier",
      raceTypeId: DEFAULT_RACE_TYPE_ID,
      dt: 0.3
    });
    assert.strictEqual(officialRacecraftSafety.visibleSpawnViolations, 0, "Official racecraft route should avoid visible spawn violations");
    assert.strictEqual(officialRacecraftSafety.invalidWalls, 0, "Official racecraft route should avoid impossible walls");
    assert.strictEqual(officialRacecraftSafety.hardBlockerWalls, 0, "Official racecraft route should avoid hard-blocker walls");
    assert.strictEqual(officialRacecraftSafety.routeReadabilityFailures, 0, "Official racecraft route should keep readable route choices");
    console.log("OFFICIAL_RACECRAFT_SAMPLE " + JSON.stringify({
      safeFast: {
        routeId: safeFastRacecraft.routeId,
        signatureHash: safeFastRacecraft.signatureHash,
        waves: safeFastRacecraft.sequence.filter((wave) => String(wave.type || "").startsWith("official")).map((wave) => wave.type)
      },
      boostChain: {
        routeId: boostChainRacecraft.routeId,
        signatureHash: boostChainRacecraft.signatureHash,
        waves: boostChainRacecraft.sequence.filter((wave) => String(wave.type || "").startsWith("official")).map((wave) => wave.type)
      },
      rampShortcut: {
        routeId: rampShortcutRacecraft.routeId,
        signatureHash: rampShortcutRacecraft.signatureHash,
        rampWaves: rampShortcutRacecraft.sequence.filter((wave) => (wave.rampLanes || []).length).map((wave) => wave.type)
      },
      redlineFuel: {
        routeId: redlineFuelRacecraft.routeId,
        signatureHash: redlineFuelRacecraft.signatureHash,
        fuelWaves: redlineFuelRacecraft.sequence.filter((wave) => (wave.gasCanLanes || []).length || (wave.boostLanes || []).length).map((wave) => wave.type).slice(0, 6)
      },
      safety: {
        visibleSpawnViolations: officialRacecraftSafety.visibleSpawnViolations,
        invalidWalls: officialRacecraftSafety.invalidWalls,
        hardBlockerWalls: officialRacecraftSafety.hardBlockerWalls,
        routeReadabilityFailures: officialRacecraftSafety.routeReadabilityFailures
      }
    }));

    const officialClassicRacecraftSamples = OFFICIAL_ROUTES
      .filter((route) => officialRouteSupportsRaceType(route, DEFAULT_RACE_TYPE_ID))
      .map((route) => captureOfficialRacecraft(route.id, DEFAULT_RACE_TYPE_ID));
    const officialLaneMigrationRows = officialClassicRacecraftSamples.map((sample) => getLaneMigrationMetrics(sample));
    const officialLaneClosureRows = officialClassicRacecraftSamples.map((sample, index) => getLaneClosureMetrics(sample, officialLaneMigrationRows[index]));
    const redlineMigrationRows = officialLaneMigrationRows.filter((row) => row.speedClassId === "redline");
    const overdriveMigrationRows = officialLaneMigrationRows.filter((row) => row.speedClassId === "overdrive");
    const turboMigrationRows = officialLaneMigrationRows.filter((row) => row.speedClassId === "turbo");
    const redlineClosureRows = officialLaneClosureRows.filter((row) => row.speedClassId === "redline");
    const overdriveClosureRows = officialLaneClosureRows.filter((row) => row.speedClassId === "overdrive");
    const turboClosureRows = officialLaneClosureRows.filter((row) => row.speedClassId === "turbo");
    redlineMigrationRows.forEach((row) => {
      const closure = redlineClosureRows.find((item) => item.routeId === row.routeId) || {};
      assert(row.migrationWaveCount + (closure.laneClosureWaves || 0) >= 3, row.routeId + " Redline should include 3+ official migration/closure set pieces");
      assert(row.crossTrackDecisions + (closure.laneClosureForcedSideSwitches || 0) >= 2, row.routeId + " Redline should require multiple cross-track decisions");
      assert(row.finalPushCommitments + (closure.laneClosureFinalPushWaves || 0) >= 1, row.routeId + " Redline finalPush should include a real lane commitment");
    });
    overdriveMigrationRows.forEach((row) => {
      const closure = overdriveClosureRows.find((item) => item.routeId === row.routeId) || {};
      assert(row.migrationWaveCount + (closure.laneClosureWaves || 0) >= 3, row.routeId + " Overdrive should include 3+ official migration/closure set pieces");
      assert(row.crossTrackDecisions + (closure.laneClosureForcedSideSwitches || 0) >= 2, row.routeId + " Overdrive should require multiple cross-track decisions");
      assert(row.finalPushCommitments + (closure.laneClosureFinalPushWaves || 0) >= 1, row.routeId + " Overdrive finalPush should include a real lane commitment");
    });
    turboMigrationRows.forEach((row) => {
      assert(row.migrationWaveCount >= 3, row.routeId + " Turbo should keep the lighter official lane-migration layer");
      assert(row.finalPushCommitments >= 1, row.routeId + " Turbo finalPush should keep a readable commitment");
    });
    redlineClosureRows.forEach((row) => {
      assert(row.laneClosureWaves >= 2, row.routeId + " Redline should include 2+ true lane-closure set pieces");
      assert(row.laneClosureZoneCount >= 1, row.routeId + " Redline should include at least one sustained closure zone");
      assert(row.laneClosureFinalPushWaves >= 1, row.routeId + " Redline finalPush should include a closure commitment");
      assert(row.laneClosureSafeLaneCountMin >= 4, row.routeId + " Redline closures should leave at least four safe lanes");
      assert(row.laneClosureZoneDistanceAverage >= 4300, row.routeId + " Redline closures should read as sustained roadwork zones");
      assert(row.laneClosureZoneDurationAverage >= 0.7, row.routeId + " Redline closure zones should last long enough to perceive");
      assert(row.laneClosureWarningTimeAverage >= 1.2, row.routeId + " Redline closures should give warning before the hard block");
      assert(row.singleLaneClosureCount + row.twoLaneClosureCount >= 1, row.routeId + " Redline should prefer 1-2 lane sustained closures");
      assert(row.threeLaneClosureCount < row.laneClosureZoneCount, row.routeId + " Redline should not make every closure a 3-lane wall");
      assert(row.closureTaperInCount >= row.laneClosureZoneCount, row.routeId + " Redline closure zones need taper-in markers");
      assert(row.closureSustainedMarkerCount >= row.laneClosureZoneCount * 2, row.routeId + " Redline closure zones need sustained markers");
      assert(row.closureTaperOutCount >= row.laneClosureZoneCount, row.routeId + " Redline closure zones need taper-out markers");
      assert(row.laneClosureForcedSideSwitches >= 1, row.routeId + " Redline closures should force committed side switches");
      assert(row.minPassiveBandCombinedPressure >= 1, row.routeId + " Redline passive 3-lane bands should face migration or closure pressure");
      assert.strictEqual(row.laneClosureRouteFailuresPreventedRejected, 0, row.routeId + " Redline closure should not require route-failure rejection");
    });
    overdriveClosureRows.forEach((row) => {
      assert(row.laneClosureWaves >= 2, row.routeId + " Overdrive should include true lane-closure set pieces");
      assert(row.laneClosureZoneCount >= 1, row.routeId + " Overdrive should include at least one sustained closure zone");
      assert(row.laneClosureFinalPushWaves >= 1, row.routeId + " Overdrive finalPush should include a closure commitment");
      assert(row.laneClosureSafeLaneCountMin >= 4, row.routeId + " Overdrive closures should leave at least four safe lanes");
      assert(row.laneClosureZoneDistanceAverage >= 3400, row.routeId + " Overdrive closures should read as sustained roadwork zones");
      assert(row.laneClosureZoneDurationAverage >= 0.65, row.routeId + " Overdrive closure zones should last long enough to perceive");
      assert(row.laneClosureWarningTimeAverage >= 1.2, row.routeId + " Overdrive closures should give warning before the hard block");
      assert(row.singleLaneClosureCount + row.twoLaneClosureCount >= 1, row.routeId + " Overdrive should prefer 1-2 lane sustained closures");
      assert(row.threeLaneClosureCount < row.laneClosureZoneCount, row.routeId + " Overdrive should not make every closure a 3-lane wall");
      assert(row.closureTaperInCount >= row.laneClosureZoneCount, row.routeId + " Overdrive closure zones need taper-in markers");
      assert(row.closureSustainedMarkerCount >= row.laneClosureZoneCount * 2, row.routeId + " Overdrive closure zones need sustained markers");
      assert(row.closureTaperOutCount >= row.laneClosureZoneCount, row.routeId + " Overdrive closure zones need taper-out markers");
      assert(row.laneClosureForcedSideSwitches >= 1, row.routeId + " Overdrive closures should force committed side switches");
      assert(row.minPassiveBandCombinedPressure >= 1, row.routeId + " Overdrive passive 3-lane bands should face migration or closure pressure");
    });
    turboClosureRows.forEach((row) => {
      assert.strictEqual(row.laneClosureWaves, 0, row.routeId + " Turbo should not receive hard closure set pieces in this pass");
    });
    const fuelMigrationRows = firstOfficialRouteIds.map((routeId) => getLaneMigrationMetrics(captureOfficialRacecraft(routeId, FUEL_RUN_RACE_TYPE_ID)));
    const fuelClosureRows = firstOfficialRouteIds.map((routeId) => getLaneClosureMetrics(captureOfficialRacecraft(routeId, FUEL_RUN_RACE_TYPE_ID)));
    assert(
      fuelMigrationRows.every((row) => row.migrationWaveCount === 0),
      "Fuel Run official routes should not receive Classic-only lane-migration waves"
    );
    assert(
      fuelClosureRows.every((row) => row.laneClosureWaves === 0),
      "Fuel Run official routes should not receive Classic-only lane-closure waves"
    );
    console.log("OFFICIAL_LANE_MIGRATION_SAMPLE " + JSON.stringify({
      redline: redlineMigrationRows.map((row) => ({
        routeId: row.routeId,
        migrationWaveCount: row.migrationWaveCount,
        crossTrackDecisions: row.crossTrackDecisions,
        finalPushCommitments: row.finalPushCommitments,
        minPassiveBandPressure: row.minPassiveBandPressure,
        minPassiveBandRewardsMissed: row.minPassiveBandRewardsMissed,
        migrationWaveTypes: row.migrationWaveTypes
      })),
      overdrive: overdriveMigrationRows.map((row) => ({
        routeId: row.routeId,
        migrationWaveCount: row.migrationWaveCount,
        crossTrackDecisions: row.crossTrackDecisions,
        finalPushCommitments: row.finalPushCommitments,
        minPassiveBandPressure: row.minPassiveBandPressure
      })),
      turbo: turboMigrationRows.map((row) => ({
        routeId: row.routeId,
        migrationWaveCount: row.migrationWaveCount,
        finalPushCommitments: row.finalPushCommitments
      })),
      fuelClassicSeparation: fuelMigrationRows.map((row) => ({
        routeId: row.routeId,
        raceTypeId: row.raceTypeId,
        migrationWaveCount: row.migrationWaveCount
      }))
    }));
    console.log("OFFICIAL_LANE_CLOSURE_SAMPLE " + JSON.stringify({
      redline: redlineClosureRows.map((row) => ({
        routeId: row.routeId,
        laneClosureWaves: row.laneClosureWaves,
        laneClosureZoneCount: row.laneClosureZoneCount,
        laneClosureWaveTypes: row.laneClosureWaveTypes,
        laneClosureZoneKinds: row.laneClosureZoneKinds,
        laneClosureLanesClosedMax: row.laneClosureLanesClosedMax,
        laneClosureDurationAverage: Number(row.laneClosureDurationAverage.toFixed(1)),
        laneClosureZoneDurationAverage: Number(row.laneClosureZoneDurationAverage.toFixed(2)),
        laneClosureZoneDistanceAverage: Number(row.laneClosureZoneDistanceAverage.toFixed(1)),
        laneClosureWarningTimeAverage: Number(row.laneClosureWarningTimeAverage.toFixed(2)),
        laneClosureSafeLaneCountMin: row.laneClosureSafeLaneCountMin,
        singleLaneClosureCount: row.singleLaneClosureCount,
        twoLaneClosureCount: row.twoLaneClosureCount,
        threeLaneClosureCount: row.threeLaneClosureCount,
        closureTaperInCount: row.closureTaperInCount,
        closureSustainedMarkerCount: row.closureSustainedMarkerCount,
        closureTaperOutCount: row.closureTaperOutCount,
        laneClosureForcedSideSwitches: row.laneClosureForcedSideSwitches,
        passiveBandsFullyClosed: row.passiveBandsFullyClosed,
        minPassiveBandCombinedPressure: row.minPassiveBandCombinedPressure
      })),
      overdrive: overdriveClosureRows.map((row) => ({
        routeId: row.routeId,
        laneClosureWaves: row.laneClosureWaves,
        laneClosureWaveTypes: row.laneClosureWaveTypes,
        laneClosureZoneKinds: row.laneClosureZoneKinds,
        laneClosureDurationAverage: Number(row.laneClosureDurationAverage.toFixed(1)),
        laneClosureZoneDurationAverage: Number(row.laneClosureZoneDurationAverage.toFixed(2)),
        laneClosureZoneDistanceAverage: Number(row.laneClosureZoneDistanceAverage.toFixed(1)),
        laneClosureWarningTimeAverage: Number(row.laneClosureWarningTimeAverage.toFixed(2)),
        singleLaneClosureCount: row.singleLaneClosureCount,
        twoLaneClosureCount: row.twoLaneClosureCount,
        threeLaneClosureCount: row.threeLaneClosureCount,
        closureTaperInCount: row.closureTaperInCount,
        closureSustainedMarkerCount: row.closureSustainedMarkerCount,
        closureTaperOutCount: row.closureTaperOutCount,
        laneClosureForcedSideSwitches: row.laneClosureForcedSideSwitches,
        passiveBandsFullyClosed: row.passiveBandsFullyClosed,
        minPassiveBandCombinedPressure: row.minPassiveBandCombinedPressure
      })),
      turbo: turboClosureRows.map((row) => ({
        routeId: row.routeId,
        laneClosureWaves: row.laneClosureWaves
      })),
      fuelClassicSeparation: fuelClosureRows.map((row) => ({
        routeId: row.routeId,
        raceTypeId: row.raceTypeId,
        laneClosureWaves: row.laneClosureWaves
      }))
    }));

    function getOpeningRouteSeconds(track, speedClassId, distance) {
      return estimateTrackElapsedSecondsAtDistance(track, speedClassId, distance);
    }

    function isOpeningMeaningfulWave(wave) {
      return (wave.blockedLanes || []).length > 0
        || (wave.boostLanes || []).length > 0
        || (wave.rampLanes || []).length > 0
        || (wave.gasCanLanes || []).length > 0;
    }

    function summarizeOfficialOpeningRoute(route, raceTypeId) {
      const track = createRaceTrackForSpeedClass(getTrackById(route.trackId), route.speedClassId, raceTypeId);
      const rules = getOfficialOpeningActivityRules(route, route.speedClassId, track, raceTypeId);
      if (!rules) return null;
      const capture = app.captureRoadDirectorSequence({
        officialRouteId: route.id,
        raceTypeId,
        waveLimit: 14,
        dt: 0.36,
        routeSeedLocked: true
      });
      const openingWaves = (capture.sequence || [])
        .map((wave) => ({
          ...wave,
          routeElapsed: getOpeningRouteSeconds(track, route.speedClassId, wave.distance || 0)
        }))
        .filter((wave) => wave.routeElapsed <= rules.firstWindowSeconds + 0.001);
      const meaningfulWaves = openingWaves.filter(isOpeningMeaningfulWave);
      const requiredLaneDecisionWaves = openingWaves.filter((wave) => (wave.blockedLanes || []).includes(TRACK_DIRECTOR.centerLane));
      const firstMeaningfulDecisionTime = meaningfulWaves.length ? meaningfulWaves[0].routeElapsed : null;
      const firstRequiredLaneDecisionTime = requiredLaneDecisionWaves.length ? requiredLaneDecisionWaves[0].routeElapsed : null;
      const requiredTimes = requiredLaneDecisionWaves.map((wave) => wave.routeElapsed);
      const noInputDecisionTimes = raceTypeId === FUEL_RUN_RACE_TYPE_ID
        ? meaningfulWaves.map((wave) => wave.routeElapsed)
        : requiredTimes;
      let openingNoInputSafeTime = noInputDecisionTimes.length ? noInputDecisionTimes[0] : rules.firstWindowSeconds;
      for (let index = 1; index < noInputDecisionTimes.length; index += 1) {
        openingNoInputSafeTime = Math.max(openingNoInputSafeTime, noInputDecisionTimes[index] - noInputDecisionTimes[index - 1]);
      }
      if (noInputDecisionTimes.length) {
        openingNoInputSafeTime = Math.max(openingNoInputSafeTime, rules.firstWindowSeconds - noInputDecisionTimes[noInputDecisionTimes.length - 1]);
      }
      return {
        routeId: route.id,
        routeName: route.name,
        raceTypeId,
        speedClassId: route.speedClassId,
        openingWaveCountFirst10Seconds: openingWaves.length,
        openingMeaningfulWaveCountFirst10Seconds: meaningfulWaves.length,
        openingRequiredLaneDecisionCountFirst10Seconds: requiredLaneDecisionWaves.length,
        firstMeaningfulDecisionTime,
        firstRequiredLaneDecisionTime,
        openingNoInputSafeTime,
        fairnessFailures: (capture.sequence || []).filter((wave) => wave.fairnessPassed === false).length,
        openingWaveTypes: openingWaves.map((wave) => wave.type),
        pass: meaningfulWaves.length >= rules.minMeaningfulWavesFirst10
          && requiredLaneDecisionWaves.length >= rules.minRequiredLaneDecisionsFirst10
          && Number.isFinite(firstMeaningfulDecisionTime)
          && Number.isFinite(firstRequiredLaneDecisionTime)
          && openingWaves.length <= 8
          && openingNoInputSafeTime <= rules.maxOpeningNoInputSafeTime + 0.3
          && (capture.sequence || []).every((wave) => wave.fairnessPassed !== false)
      };
    }

    const officialOpeningRows = [];
    for (const route of OFFICIAL_ROUTES) {
      for (const raceTypeId of [DEFAULT_RACE_TYPE_ID, FUEL_RUN_RACE_TYPE_ID]) {
        const row = summarizeOfficialOpeningRoute(route, raceTypeId);
        if (row) officialOpeningRows.push(row);
      }
    }
    const spectrumOpeningRows = officialOpeningRows.filter((row) => row.routeId === "prism-spectrum-surge");
    const officialOpeningFailures = officialOpeningRows.filter((row) => !row.pass);
    assert.strictEqual(officialOpeningFailures.length, 0, "Official Turbo/Overdrive/Redline routes should meet the opening activity floor: " + JSON.stringify(officialOpeningFailures.slice(0, 5)));
    assert(
      spectrumOpeningRows.some((row) => row.raceTypeId === DEFAULT_RACE_TYPE_ID
        && row.openingMeaningfulWaveCountFirst10Seconds >= 4
        && row.openingRequiredLaneDecisionCountFirst10Seconds >= 2
        && Number.isFinite(row.firstRequiredLaneDecisionTime)
        && row.openingWaveCountFirst10Seconds <= 8),
      "Prism Highway / Spectrum Surge / Redline / Classic should meet the normal opening activity floor"
    );
    const spectrumOpeningSafety = await app.runSpawnSafetySimulationCore({
      runs: 1,
      officialRouteId: "prism-spectrum-surge",
      raceTypeId: DEFAULT_RACE_TYPE_ID,
      dt: 0.36
    });
    assert.strictEqual(spectrumOpeningSafety.visibleSpawnViolations, 0, "Spectrum Surge opening floor should avoid visible spawn violations");
    assert.strictEqual(spectrumOpeningSafety.invalidWalls, 0, "Spectrum Surge opening floor should avoid impossible walls");
    assert.strictEqual(spectrumOpeningSafety.hardBlockerWalls, 0, "Spectrum Surge opening floor should avoid hard-blocker walls");
    assert.strictEqual(spectrumOpeningSafety.routeReadabilityFailures, 0, "Spectrum Surge opening floor should keep readable routes");
    console.log("OFFICIAL_OPENING_ACTIVITY_SAMPLE " + JSON.stringify({
      checkedRoutes: officialOpeningRows.length,
      spectrumSurge: spectrumOpeningRows,
      spectrumSafety: {
        visibleSpawnViolations: spectrumOpeningSafety.visibleSpawnViolations,
        invalidWalls: spectrumOpeningSafety.invalidWalls,
        hardBlockerWalls: spectrumOpeningSafety.hardBlockerWalls,
        routeReadabilityFailures: spectrumOpeningSafety.routeReadabilityFailures
      }
    }));
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
      fuelRegressionManager.createObstacle("slowCar", 2, 2000, { waveType: "LANE-57517" }),
      fuelRegressionManager.createObstacle("truck", 3, 2010, { waveType: "LANE-57517" }),
      fuelRegressionManager.createObstacle("slowCar", 4, 2020, { waveType: "LANE-57517" })
    ];
    const blockedGasCan = fuelRegressionManager.createObstacle("gasCan", 3, 2500, { waveType: "LANE-57517" });
    const blockedGasResult = fuelRegressionManager.canSpawnObstacle(blockedGasCan, blockedFuelRoute);
    assert(!blockedGasResult.canSpawn, "LANE-57517-style blocker cluster should reject impossible gas can");
    assert(blockedGasResult.gasCanReachabilityFailure, "Rejected gas can should be tagged as a reachability prevention");
    assert(blockedGasResult.gasCanRouteSafetyFailure, "Rejected gas can should be tagged as a route-safety failure");
    const reachableGasCan = fuelRegressionManager.createObstacle("gasCan", 0, 2500, { waveType: "LANE-57517" });
    const reachableGasResult = fuelRegressionManager.canSpawnObstacle(reachableGasCan, []);
    assert(reachableGasResult.canSpawn, "Gas can with a clear side route should remain spawnable");
    const nearFutureHard = [
      fuelRegressionManager.createObstacle("slowCar", 2, 2760, { waveType: "fuel-exit-check" })
    ];
    const noEscapeGasCan = fuelRegressionManager.createObstacle("gasCan", 2, 2500, { waveType: "fuel-exit-check" });
    const noEscapeResult = fuelRegressionManager.canSpawnObstacle(noEscapeGasCan, nearFutureHard);
    assert(!noEscapeResult.canSpawn, "Gas can should reject a near-future hard blocker in the pickup lane");
    const escapableFutureHard = [
      fuelRegressionManager.createObstacle("slowCar", 2, 4200, { waveType: "fuel-exit-check" })
    ];
    const escapableGasCan = fuelRegressionManager.createObstacle("gasCan", 2, 2500, { waveType: "fuel-exit-check" });
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
    denseManager.obstacles = Array.from({ length: LANES }, (_, lane) => lane)
      .map((lane) => denseManager.createObstacle("slowCar", lane, 1450 + lane * 8, { waveType: "dense-fuel-route" }));
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
    for (const trackId of ["sunset-highway", "redline-run", "midnight-ridge", "blackout-run", "prism-highway"]) {
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
      assert(summary.longestDeadScreenSeconds <= 4, trackId + " should avoid long dead screens");
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
      const finalPushPressure = sections.finalPush?.averagePressure || 0;
      const groovePressure = sections.groove?.averagePressure || 0;
      const finalPushFullyMeaningful = (sections.finalPush?.meaningfulWavePercent || 0) >= 0.95;
      assert(
        finalPushPressure > groovePressure
          || (finalPushFullyMeaningful && finalPushPressure >= groovePressure - 0.12),
        trackId + " final push should be distinct from groove"
      );
      assert(Object.keys(summary.director.waveFamilyCounts || {}).length >= 4, trackId + " should produce varied wave families");
      assert(Object.keys(summary.director.directorIntentCounts || {}).length >= 4, trackId + " should produce varied director intents");
    }

    function roundMetric(value, digits = 2) {
      return Number.isFinite(value) ? Number(value.toFixed(digits)) : value;
    }

    function earlyDeathRiskWindows(summary) {
      return Object.values(summary.perSpeedClass || {}).reduce((sum, item) => {
        const launch = item.sectionSafety?.launch || {};
        return sum
          + (launch.invalidWalls || 0)
          + (launch.hardBlockerWalls || 0)
          + (launch.flatHardBlockerFourRows || 0)
          + (launch.flatHardBlockerFiveRows || 0)
          + (launch.routeReadabilityFailures || 0)
          + (launch.unsafeRampLandings || 0);
      }, 0);
    }

    function finishPacingBySpeed(trackId, raceTypeId, speedClassIds) {
      return Object.fromEntries(speedClassIds.map((speedClassId) => [
        speedClassId,
        roundMetric(simulateFinishTime(trackId, speedClassId, raceTypeId), 2)
      ]));
    }

    function pressureWaveCount(director, blockedCounts) {
      return blockedCounts.reduce((sum, blocked) => sum + (director.pressureCounts?.[blocked] || 0), 0);
    }

    function compactFeelSummary(summary, trackId) {
      const director = summary.director || {};
      const threePlusPressureWaves = pressureWaveCount(director, [3, 4, 5]);
      return {
        trackId,
        raceTypeId: summary.raceTypeId,
        sampledSeeds: summary.runs,
        finishSeconds: finishPacingBySpeed(trackId, summary.raceTypeId, summary.speedClassIds),
        deadScreenMax: roundMetric(summary.longestDeadScreenSeconds),
        meaningfulGapMax: roundMetric(director.longestMeaningfulWaveGapSeconds),
        decisionGapMax: roundMetric(summary.upcomingDecisionGapMax),
        opening: {
          firstMeaningfulDecision: roundMetric(director.firstMeaningfulDecisionTime),
          firstRequiredLaneDecision: roundMetric(director.firstRequiredLaneDecisionTime),
          meaningfulWavesFirst10: director.openingMeaningfulWaveCountFirst10Seconds || director.meaningfulWavesFirst10Seconds || 0,
          requiredLaneDecisionsFirst10: director.openingRequiredLaneDecisionCountFirst10Seconds || 0,
          noInputSafeMax: roundMetric(director.openingNoInputSafeTime),
          deadScreenFirst10: roundMetric(director.openingDeadScreenTimeFirst10Seconds),
          deadScreenStreakMax: roundMetric(director.longestOpeningDeadScreenSeconds)
        },
        hardBlockerDensity: {
          maxHardBlocked: summary.maxHardBlocked,
          fourLaneSamplePercent: roundMetric(summary.hardBlockerFourLaneSamplePercent, 4),
          hardWavePercent: roundMetric(director.hardWavePercent),
          threePlusPressureWavePercent: roundMetric(director.totalWaves ? threePlusPressureWaves / director.totalWaves : 0),
          fourLanePressureWaveCount: pressureWaveCount(director, [4])
        },
        failures: {
          invalidWalls: summary.invalidWalls,
          hardBlockerWalls: summary.hardBlockerWalls,
          routeReadabilityFailures: summary.routeReadabilityFailures,
          overlaps: summary.sameLaneOverlaps + summary.boostObjectOverlaps + summary.rampObjectOverlaps + summary.gasCanOverlaps,
          earlyDeathRiskWindows: earlyDeathRiskWindows(summary)
        },
        activeField: {
          preventedUnsafeSpawns: summary.preventedUnsafeSpawns,
          underActivityCorrections: summary.underActivityCorrections,
          overActivityDelays: summary.overActivityDelays,
          visibleSpawnViolations: summary.visibleSpawnViolations
        },
        placementFairness: {
          boostCenterShare: roundMetric(director.boostLaneDistribution?.[TRACK_DIRECTOR.centerLane] || 0),
          gasCenterShare: roundMetric(director.gasCanLaneDistribution?.[TRACK_DIRECTOR.centerLane] || 0),
          rampUsefulTargetPercent: roundMetric(summary.rampUsefulTargetPercent),
          averageGasCansSpawned: roundMetric(summary.averageGasCansSpawned),
          longestGasCanGap: roundMetric(summary.averageMaxTimeBetweenGasCans)
        },
        variety: {
          familyCounts: { ...(director.waveFamilyCounts || {}) },
          familyCount: Object.keys(director.waveFamilyCounts || {}).length,
          intentCount: Object.keys(director.directorIntentCounts || {}).length,
          maxFamilyStreak: director.maxWaveFamilyStreak || 0,
          repeatedTypePercent: roundMetric(director.repeatedPatternPercent),
          repeatedFamilyPercent: roundMetric(director.repeatedWaveFamilyPercent)
        },
        spacing: {
          averageRewardGap: roundMetric(director.averageRewardGapSeconds),
          longestRewardGap: roundMetric(director.longestRewardGapSeconds),
          averageRecoveryGap: roundMetric(director.averageRecoveryGapSeconds),
          longestRecoveryGap: roundMetric(director.longestRecoveryGapSeconds)
        },
        sectionShape: Object.fromEntries(Object.entries(director.sectionStats || {}).map(([sectionId, section]) => [
          sectionId,
          {
            waves: section.totalWaves || 0,
            pressure: roundMetric(section.averagePressure),
            meaningful: roundMetric(section.meaningfulWavePercent),
            reward: roundMetric(section.rewardWavePercent),
            recovery: roundMetric(section.recoveryWavePercent)
          }
        ])),
        pursuitRhythm: {
          roadblocks: summary.pursuitRoadblockCount || 0,
          pressureWaves: summary.pursuitPressureWaveCount || 0,
          recoveryWaves: summary.pursuitRecoveryWaveCount || 0,
          averageHeatMax: roundMetric(summary.pursuitHeatMaxAverage)
        },
        perSpeed: Object.fromEntries(Object.entries(summary.perSpeedClass || {}).map(([speedClassId, item]) => [
          speedClassId,
          {
            deadScreenMax: roundMetric(item.director?.longestDeadScreenSeconds),
            firstRequiredLaneDecision: roundMetric(item.director?.firstRequiredLaneDecisionTime),
            openingMeaningfulFirst10: item.director?.openingMeaningfulWaveCountFirst10Seconds || item.director?.meaningfulWavesFirst10Seconds || 0,
            openingNoInputSafeMax: roundMetric(item.director?.openingNoInputSafeTime),
            meaningfulGapMax: roundMetric(item.director?.longestMeaningfulWaveGapSeconds),
            decisionGapMax: roundMetric(item.director?.upcomingDecisionGapMax),
            maxFamilyStreak: item.director?.maxWaveFamilyStreak || 0,
            hardWavePercent: roundMetric(item.director?.hardWavePercent),
            familyCount: Object.keys(item.director?.waveFamilyCounts || {}).length
          }
        ]))
      };
    }

    function assertFeelSafety(summary, label) {
      const director = summary.director || {};
      const laneCoverage = (counts = []) => counts.filter((count) => count > 0).length;
      assert.strictEqual(summary.invalidWalls, 0, label + " should have no impossible walls");
      assert.strictEqual(summary.hardBlockerWalls, 0, label + " should have no hard-blocker walls");
      assert.strictEqual(summary.routeReadabilityFailures, 0, label + " should preserve readable routes");
      assert.strictEqual(summary.minorOnlyOpenLaneEvents, 0, label + " should not leave only minor-hazard escape lanes");
      assert.strictEqual(summary.visibleSpawnViolations, 0, label + " should avoid visible spawn violations");
      assert(summary.maxWavesSpawnedInSingleFrame <= 1, label + " should keep one scheduled wave per frame");
      assert(summary.flatHardBlockerFourRows === 0 && summary.flatHardBlockerFiveRows === 0, label + " should avoid flat four/five-lane hard rows");
      assert(summary.passDetails?.laneCountSeven === true, label + " should use the 7-lane foundation");
      assert.strictEqual((director.boostLaneCounts || []).length, LANES, label + " should track boost lanes across all seven lanes");
      assert.strictEqual((director.rampLaneCounts || []).length, LANES, label + " should track ramp lanes across all seven lanes");
      if (summary.raceTypeId === DEFAULT_RACE_TYPE_ID) {
        assert.strictEqual(laneCoverage(director.boostLaneCounts || []), LANES, label + " should spawn Classic boost pads across all seven lanes");
      }
      assert(summary.sameLaneOverlaps + summary.boostObjectOverlaps + summary.rampObjectOverlaps + summary.gasCanOverlaps <= 4, label + " should avoid gameplay overlaps");
      assert(earlyDeathRiskWindows(summary) === 0, label + " should avoid cheap launch risk windows");
      assert((director.longestDeadScreenSeconds || 0) <= 3.6, label + " should avoid long dead screens");
      assert((director.longestMeaningfulWaveGapSeconds || 0) <= MAX_MEANINGFUL_WAVE_GAP_SECONDS, label + " should avoid long gaps between meaningful choices");
      assert(Object.keys(director.waveFamilyCounts || {}).length >= 4, label + " should use at least four wave families");
      assert(Object.keys(director.directorIntentCounts || {}).length >= 4, label + " should use at least four director intents");
      assert((director.maxWaveFamilyStreak || 0) <= 6, label + " should avoid obvious wave-family spam");
      assert((director.boostLaneDistribution?.[TRACK_DIRECTOR.centerLane] || 0) <= 0.42, label + " should not over-center boost rewards");
      assert.strictEqual(pressureWaveCount(director, [6, 7]), 0, label + " should never create 6/7-lane pressure walls");
      if (summary.raceTypeId === DEFAULT_RACE_TYPE_ID) {
        const threePlusPressureShare = director.totalWaves ? pressureWaveCount(director, [3, 4, 5]) / director.totalWaves : 0;
        assert(
          threePlusPressureShare >= MIN_CLASSIC_THREE_PLUS_PRESSURE_SHARE,
          label + " should include planned 3+ lane pressure on the 7-lane road"
        );
      }
      if (summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID) {
        assert.strictEqual((director.gasCanLaneCounts || []).length, LANES, label + " should track gas lanes across all seven lanes");
        assert.strictEqual(laneCoverage(director.gasCanLaneCounts || []), LANES, label + " should spawn gas cans across all seven lanes");
        assert(summary.averageGasCansSpawned >= 3.2, label + " should offer enough gas routes");
        assert((summary.averageMaxTimeBetweenGasCans || 0) <= 28, label + " should avoid long gas droughts");
        assert((director.gasCanLaneDistribution?.[TRACK_DIRECTOR.centerLane] || 0) <= 0.48, label + " should not make fuel cans free center pickups");
      }
      if (summary.raceTypeId === PURSUIT_RACE_TYPE_ID) {
        assert((summary.pursuitRoadblockCount || 0) > 0, label + " should spawn pursuit roadblocks");
        assert((summary.pursuitPressureWaveCount || 0) > 0, label + " should include pursuit pressure waves");
        assert((summary.pursuitRecoveryWaveCount || 0) > 0, label + " should include pursuit recovery windows");
      }
    }

    const matrixSpeedClasses = ["arcade", "pro", "turbo", "overdrive", "redline"];
    const feelMatrix = [];
    for (const trackId of ["sunset-highway", "redline-run", "midnight-ridge", "blackout-run", "prism-highway"]) {
      for (const raceTypeId of [DEFAULT_RACE_TYPE_ID, FUEL_RUN_RACE_TYPE_ID]) {
        const summary = await app.runSpawnSafetySimulationCore({
          runs: 4,
          speedClassIds: matrixSpeedClasses,
          trackId,
          raceTypeId,
          dt: 0.5,
          seed: "road-director-feel-matrix"
        });
        const compact = compactFeelSummary(summary, trackId);
        feelMatrix.push(compact);
        console.log("ROAD_DIRECTOR_FEEL_SAMPLE " + JSON.stringify(compact));
        assertFeelSafety(summary, trackId + " " + raceTypeId);
      }
    }
    for (const trackId of ["sunset-highway", "redline-run"]) {
      const pursuitSummary = await app.runSpawnSafetySimulationCore({
        runs: 4,
        speedClassIds: matrixSpeedClasses,
        trackId,
        raceTypeId: PURSUIT_RACE_TYPE_ID,
        dt: 0.5,
        seed: "road-director-feel-matrix"
      });
      const compactPursuit = compactFeelSummary(pursuitSummary, trackId);
      feelMatrix.push(compactPursuit);
      console.log("ROAD_DIRECTOR_FEEL_SAMPLE " + JSON.stringify(compactPursuit));
      assertFeelSafety(pursuitSummary, trackId + " pursuit");
    }

    console.log("ROAD_DIRECTOR_FEEL_MATRIX " + JSON.stringify(feelMatrix));

    const passiveTelemetryProbe = Object.create(NeonRoadRally.prototype);
    passiveTelemetryProbe.run = {
      raceActive: true,
      currentSpeed: getTrackCruiseSpeed(createRaceTrackForSpeedClass(getTrackById("redline-run"), "redline"), 0.5, "redline"),
      targetLane: TRACK_DIRECTOR.centerLane,
      renderLaneFloat: TRACK_DIRECTOR.centerLane,
      centerLaneTime: 0,
      currentCenterLaneStreak: 0,
      longestCenterLaneStreak: 0,
      currentThreeLaneBandMin: TRACK_DIRECTOR.centerLane,
      currentThreeLaneBandMax: TRACK_DIRECTOR.centerLane,
      currentThreeLaneBandSeconds: 0,
      longestThreeLaneBandSeconds: 0,
      speedSampleSeconds: 0,
      speedWeightedSum: 0,
      maxSpeedObserved: 0
    };
    for (const lane of [2, 3, 4, 3]) {
      passiveTelemetryProbe.run.renderLaneFloat = lane;
      passiveTelemetryProbe.run.targetLane = lane;
      for (let i = 0; i < 9; i += 1) passiveTelemetryProbe.updateRunTelemetry(1);
    }
    assert(
      passiveTelemetryProbe.run.longestThreeLaneBandSeconds >= 36,
      "Passive-lane telemetry should detect long survival inside one three-lane band"
    );
    passiveTelemetryProbe.run.renderLaneFloat = 6;
    passiveTelemetryProbe.run.targetLane = 6;
    passiveTelemetryProbe.updateRunTelemetry(1);
    assert(
      passiveTelemetryProbe.run.currentThreeLaneBandSeconds <= 1.01,
      "Passive-lane telemetry should reset once the player leaves the three-lane band"
    );

    const minorPressureProbe = Object.create(NeonRoadRally.prototype);
    minorPressureProbe.audio = { sfxVolume: 1, playSfx() {} };
    minorPressureProbe.addFloatingScoreText = () => {};
    minorPressureProbe.showRaceStateCallout = () => {};
    minorPressureProbe.run = {
      speedClassId: "redline",
      speedClass: getSpeedClassConfig("redline"),
      raceTypeId: DEFAULT_RACE_TYPE_ID,
      officialRouteId: "redline-city-limits-blaze",
      officialEnduranceActive: true,
      officialFinishLocked: true,
      officialEnduranceLap: 3,
      officialEnduranceStartElapsed: 0,
      elapsed: 48,
      track: createRaceTrackForSpeedClass(getTrackById("redline-run"), "redline"),
      challengeMode: false,
      partyMode: false,
      slowdownFactor: 1,
      slowdownTimer: 0,
      cleanTimer: 12,
      penalties: 0,
      slowdownHits: 0,
      neonFlow: 40,
      neonFlowSuppressedTimer: 0,
      flowBreakArmed: false,
      baseScore: 5000,
      score: 5000,
      scoreMultiplier: 1,
      scoreBreakdown: { slowdownPenalties: 0 },
      minorObstacleHits: 0,
      highSpeedMinorObstacleHits: 0,
      enduranceMinorObstacleHits: 0,
      enduranceMinorSlowdownHits: 0,
      minorObstaclePenaltyScore: 0,
      highSpeedMinorPenaltyScore: 0,
      enduranceMinorPenaltyScore: 0,
      sloppyLineEvents: 0,
      enduranceMinorHitsByLap: {}
    };
    const redlineConeTuning = minorPressureProbe.getMinorObstaclePressureTuning({ type: "cone" });
    assert(redlineConeTuning && redlineConeTuning.factor < 0.82, "Redline minor obstacle tuning should apply stronger speed loss");
    assert(redlineConeTuning.durationSeconds > 1.45, "Redline minor obstacle tuning should extend recovery");
    minorPressureProbe.applyMinorObstacleSlowdown({ type: "cone" });
    assert(minorPressureProbe.run.slowdownTimer > 1.45, "High-speed minor hit should use longer slowdown recovery");
    assert(minorPressureProbe.run.neonFlowSuppressedTimer > NEON_FLOW_CONFIG.slowdownPauseSeconds, "High-speed minor hit should suppress Flow gain longer");
    assert(minorPressureProbe.run.enduranceMinorSlowdownHits === 1, "Endurance minor slowdown telemetry should count the hit");
    assert(minorPressureProbe.run.sloppyLineEvents === 1, "High-speed minor hit should report sloppy-line feedback telemetry");
    const forgivingProbe = Object.create(NeonRoadRally.prototype);
    forgivingProbe.run = {
      speedClassId: "arcade",
      raceTypeId: DEFAULT_RACE_TYPE_ID,
      officialRouteId: "sunset-neon-palm-sprint",
      challengeMode: false
    };
    assert.strictEqual(forgivingProbe.getMinorObstaclePressureTuning({ type: "cone" }), null, "Arcade minor obstacle tuning should remain forgiving");

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
        waveFamilyCounts: { precision: 3, "speed-skill": 2 },
        laneChanges: 14,
        driftDashesCompleted: 0,
        flowBreaksTriggered: 0,
        longestThreeLaneBandSeconds: 31,
        redlineLowLaneChangeFinish: true,
        redlineZeroDriftDashFinish: true,
        redlineNoFlowBreakFinish: true,
        redlinePassiveThreeLaneFinish: true,
        highSpeedMinorObstacleHits: 1,
        highSpeedMinorPenaltyScore: 725,
        sloppyLineEvents: 1
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
    assert.strictEqual(aggregate.redlineLowLaneChangeFinishes, 1, "Playtest Report should flag low-lane-change Redline finishes");
    assert.strictEqual(aggregate.redlineZeroDriftDashFinishes, 1, "Playtest Report should flag zero-Drift-Dash Redline finishes");
    assert.strictEqual(aggregate.redlineNoFlowBreakFinishes, 1, "Playtest Report should flag no-Flow-Break Redline finishes");
    assert.strictEqual(aggregate.redlinePassiveThreeLaneFinishes, 1, "Playtest Report should flag long three-lane-band Redline finishes");
    assert.strictEqual(aggregate.highSpeedMinorObstacleHits, 1, "Playtest Report should aggregate high-speed minor obstacle hits");
    assert.strictEqual(aggregate.sloppyLineEvents, 1, "Playtest Report should aggregate sloppy-line events");

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
