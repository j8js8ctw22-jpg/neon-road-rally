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
  window: { addEventListener: () => {} },
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

  const app = Object.create(NeonRoadRally.prototype);
  app.renderer = makeHarnessRenderer();

  function capture(options) {
    const result = app.captureRoadDirectorSequence({
      waveLimit: 140,
      dt: 0.36,
      ...options
    });
    assert.strictEqual(Array.isArray(result.recklessDriverEvents), true, "capture should expose reckless prototype events");
    return result;
  }

  function scheduledEvents(captureResult) {
    return (captureResult.recklessDriverEvents || []).filter((event) => event.kind === "scheduled");
  }

  function startedEvents(captureResult) {
    return (captureResult.recklessDriverEvents || []).filter((event) => event.kind === "started");
  }

  function normalizeScheduled(captureResult) {
    return scheduledEvents(captureResult).map((event) => ({
      behavior: event.behavior,
      type: event.type,
      waveType: event.waveType,
      sectionId: event.sectionId,
      distance: event.distance,
      sourceLane: event.sourceLane,
      targetLane: event.targetLane,
      laneDelta: event.laneDelta,
      telegraphSeconds: event.telegraphSeconds,
      anticipationSeconds: event.anticipationSeconds,
      commitPauseSeconds: event.commitPauseSeconds,
      behaviorProfileLabel: event.behaviorProfileLabel,
      mergeSeconds: event.mergeSeconds,
      targetSafetyOk: event.targetSafetyOk
    }));
  }

  function normalizeSequenceSpine(captureResult) {
    return (captureResult.sequence || []).map((wave) => ({
      type: wave.type || "",
      family: wave.family || "",
      sectionId: wave.sectionId || "",
      distance: Math.round(wave.distance || 0),
      lanes: (wave.blockedLanes || []).slice().join(","),
      rewardLanes: (wave.rewardLanes || []).slice().join(",")
    }));
  }

  function assertTelemetryShape(captureResult, label) {
    const numericFields = [
      "recklessEventsSeen",
      "recklessSlowMerges",
      "recklessAggressiveOvertakes",
      "recklessPanicCorrections",
      "recklessNearMisses",
      "recklessCrashes",
      "recklessAvoidedWithDriftDash",
      "recklessTelegraphAverageSeconds",
      "recklessMovementAverageSeconds"
    ];
    const mapFields = [
      "recklessScheduledByBehavior",
      "recklessScheduledBySection",
      "recklessSeenBySection",
      "recklessCompletedByBehavior",
      "recklessCompletedBySection",
      "recklessRejectsByReason",
      "recklessRejectsBySection",
      "recklessRejectsByDetail"
    ];
    for (const field of numericFields) {
      assert.strictEqual(typeof captureResult[field], "number", label + " should expose numeric telemetry field " + field);
      assert(Number.isFinite(captureResult[field]), label + " telemetry field " + field + " should be finite");
    }
    for (const field of mapFields) {
      assert(captureResult[field] && typeof captureResult[field] === "object" && !Array.isArray(captureResult[field]), label + " should expose count map " + field);
    }
    const seenByBehavior = (captureResult.recklessSlowMerges || 0)
      + (captureResult.recklessAggressiveOvertakes || 0)
      + (captureResult.recklessPanicCorrections || 0);
    assert.strictEqual(seenByBehavior, captureResult.recklessEventsSeen || 0, label + " behavior counts should sum to recklessEventsSeen");
    assert.strictEqual(captureResult.recklessEventsSeen || 0, captureResult.recklessDriversStarted || 0, label + " seen count should match started telegraphs");
    if ((captureResult.recklessEventsSeen || 0) > 0) {
      assert(captureResult.recklessTelegraphAverageSeconds >= 0.85, label + " telegraph average should preserve readable windows");
      assert(captureResult.recklessMovementAverageSeconds >= 0.32, label + " movement average should not snap");
    }
  }

  const behaviorTimings = Object.values(RECKLESS_DRIVER_BEHAVIORS).map((behavior) => ({
    behavior,
    mergeSeconds: RECKLESS_DRIVER_PROTOTYPE_CONFIG.mergeSeconds[behavior],
    profile: getRecklessDriverBehaviorProfile(behavior)
  }));
  assert.strictEqual(new Set(behaviorTimings.map((item) => item.mergeSeconds)).size, behaviorTimings.length, "each reckless v1 behavior should have distinct movement timing");
  assert(
    behaviorTimings.some((item) => item.behavior === RECKLESS_DRIVER_BEHAVIORS.slowDriftMerge && item.profile.telegraphBonusSeconds > 0),
    "slow drift merge should have a longer signal profile"
  );
  assert(
    behaviorTimings.some((item) => item.behavior === RECKLESS_DRIVER_BEHAVIORS.aggressiveOvertake && item.profile.visualSurge > 0.05),
    "aggressive overtake should have a visible surge profile"
  );
  assert(
    behaviorTimings.some((item) => item.behavior === RECKLESS_DRIVER_BEHAVIORS.panicCorrection && item.profile.brakeFlash >= 1),
    "panic correction should have a brake-flash profile"
  );

  const routeCandidates = [
    "sunset-neon-palm-sprint",
    "sunset-cactus-cutback",
    "redline-service-lane-slalom",
    "blackout-phantom-merge",
    "prism-pinkline-sprint"
  ];
  const officialCaptures = routeCandidates.map((routeId) => ({
    routeId,
    capture: capture({ officialRouteId: routeId, raceTypeId: DEFAULT_RACE_TYPE_ID })
  }));
  const officialScenario = officialCaptures.find((row) => scheduledEvents(row.capture).length > 0);
  assert(officialScenario, "at least one solo Official Classic route should schedule a rare reckless driver prototype event");
  assertTelemetryShape(officialScenario.capture, "official reckless capture");

  const officialRepeat = capture({
    officialRouteId: officialScenario.routeId,
    raceTypeId: DEFAULT_RACE_TYPE_ID
  });
  assertTelemetryShape(officialRepeat, "official repeat capture");
  assert.deepStrictEqual(
    normalizeScheduled(officialScenario.capture),
    normalizeScheduled(officialRepeat),
    "reckless event choices should repeat exactly under the same official seed"
  );

  const allowedBehaviors = new Set(Object.values(RECKLESS_DRIVER_BEHAVIORS));
  assert(startedEvents(officialScenario.capture).length > 0, "scheduled reckless events should enter a visible telegraph state");
  for (const event of scheduledEvents(officialScenario.capture)) {
    assert(allowedBehaviors.has(event.behavior), "scheduled behavior should be one of the v1 allowed behaviors");
    assert.strictEqual(Math.abs(event.laneDelta), 1, "reckless movement should only target an adjacent lane");
    assert(!RECKLESS_DRIVER_PROTOTYPE_CONFIG.pressureWaveBlocklist.includes(event.waveType), "reckless should not attach to blocked high-pressure waves");
    assert(!RECKLESS_DRIVER_PROTOTYPE_CONFIG.sectionBlocklist.includes(event.sectionId), "reckless should not attach to blocked sections");
    assert(event.telegraphSeconds >= 0.85, "telegraph should meet the Redline minimum readability window");
    assert(event.anticipationSeconds >= 0, "scheduled event should include anticipation timing");
    assert(event.mergeSeconds >= 0.32, "merge should not snap instantly");
    assert(event.targetSafetyOk || event.behavior === RECKLESS_DRIVER_BEHAVIORS.panicCorrection, "unsafe targets should only become panic corrections");
  }
  for (const event of startedEvents(officialScenario.capture)) {
    assert.strictEqual(event.phase, "telegraph", "started reckless event should begin in telegraph before movement");
    assert(event.telegraphSeconds >= event.mergeSeconds, "telegraph should be at least as readable as movement duration");
    assert(event.anticipationSeconds >= 0, "started event should expose anticipation timing");
  }
  assert(
    (officialScenario.capture.recklessDriversActiveMax || 0) <= RECKLESS_DRIVER_PROTOTYPE_CONFIG.maxActiveAtOnce,
    "prototype should keep one active reckless movement globally"
  );

  const customCapture = capture({
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    seed: "RECKLESS-PROTOTYPE-CUSTOM",
    waveLimit: 180
  });
  assertTelemetryShape(customCapture, "custom reckless capture");
  assert(scheduledEvents(customCapture).length > 0, "Playground/Custom Classic should be eligible for reckless prototype events");

  const redlineCapture = capture({
    officialRouteId: "redline-city-limits-blaze",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    waveLimit: 260
  });
  assertTelemetryShape(redlineCapture, "redline reckless capture");
  const redlineScheduled = scheduledEvents(redlineCapture);
  assert(redlineScheduled.length >= 3, "Redline should schedule 3-4 meaningful reckless events when fair");
  assert(redlineScheduled.length <= RECKLESS_DRIVER_PROTOTYPE_CONFIG.maxPerRunBySpeed.redline, "Redline should respect the prototype max per run");
  assert(redlineCapture.recklessAggressiveOvertakes >= 2, "Redline should strongly prefer Aggressive Overtake when safe");
  assert(
    redlineScheduled.some((event) => event.sectionId === "pressure" || event.sectionId === "finalPush"),
    "Redline should allow a fair reckless event in pressure/finalPush instead of launch-only scheduling"
  );
  assert(
    redlineScheduled.some((event) => event.behavior === RECKLESS_DRIVER_BEHAVIORS.aggressiveOvertake),
    "Redline scheduled events should include Aggressive Overtake"
  );
  assert(
    Object.values(redlineCapture.recklessRejectsByReason || {}).reduce((sum, count) => sum + count, 0) > 0,
    "Redline telemetry should include rejection reason counts for tuning review"
  );
  const redlineRepeat = capture({
    officialRouteId: "redline-city-limits-blaze",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    waveLimit: 260
  });
  assert.deepStrictEqual(
    normalizeScheduled(redlineCapture),
    normalizeScheduled(redlineRepeat),
    "Redline reckless event choices should repeat exactly under the same official seed"
  );

  const fuelCapture = capture({
    officialRouteId: officialScenario.routeId,
    raceTypeId: FUEL_RUN_RACE_TYPE_ID
  });
  assertTelemetryShape(fuelCapture, "fuel disabled capture");
  assert.strictEqual(scheduledEvents(fuelCapture).length, 0, "Fuel Run should not schedule reckless prototype events");
  assert.strictEqual(fuelCapture.recklessEventsSeen, 0, "Fuel Run should not show reckless telemetry events");

  const partyCapture = capture({
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    seed: "RECKLESS-PROTOTYPE-CUSTOM",
    partyMode: true,
    partySeedLocked: true,
    waveLimit: 180
  });
  assertTelemetryShape(partyCapture, "party classic capture");
  assert(scheduledEvents(partyCapture).length > 0, "Party Classic should schedule reckless events from the shared Classic seed");
  const partyRepeat = capture({
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    seed: "RECKLESS-PROTOTYPE-CUSTOM",
    partyMode: true,
    partySeedLocked: true,
    waveLimit: 180
  });
  assert.deepStrictEqual(
    normalizeScheduled(partyCapture),
    normalizeScheduled(partyRepeat),
    "Party Classic reckless events should repeat exactly for each driver on the same shared seed"
  );

  const chaseCapture = capture({
    officialRouteId: officialScenario.routeId,
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    partyMode: true,
    officialRecordChase: true,
    partySeedLocked: true
  });
  assertTelemetryShape(chaseCapture, "record chase classic capture");
  assert(scheduledEvents(chaseCapture).length > 0, "Official Record Chase Classic should schedule reckless events");
  assert.deepStrictEqual(
    normalizeScheduled(chaseCapture),
    normalizeScheduled(officialScenario.capture),
    "Official Record Chase Classic should mirror the solo Official Classic reckless hazard model"
  );
  assert.deepStrictEqual(
    normalizeSequenceSpine(chaseCapture),
    normalizeSequenceSpine(officialScenario.capture),
    "Official Record Chase Classic should not alter the official route sequence spine"
  );

  const partyFuelCapture = capture({
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: FUEL_RUN_RACE_TYPE_ID,
    seed: "RECKLESS-PARTY-FUEL",
    partyMode: true,
    partySeedLocked: true
  });
  assertTelemetryShape(partyFuelCapture, "party fuel disabled capture");
  assert.strictEqual(scheduledEvents(partyFuelCapture).length, 0, "Party Fuel Run should not schedule reckless events");
  assert.strictEqual(partyFuelCapture.recklessEventsSeen, 0, "Party Fuel Run should not show reckless telemetry events");

  const pursuitCapture = capture({
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: PURSUIT_RACE_TYPE_ID,
    seed: "RECKLESS-PURSUIT-DISABLED"
  });
  assertTelemetryShape(pursuitCapture, "pursuit disabled capture");
  assert.strictEqual(scheduledEvents(pursuitCapture).length, 0, "Pursuit should not schedule reckless events");
  assert.strictEqual(pursuitCapture.recklessEventsSeen, 0, "Pursuit should not show reckless telemetry events");

  const challengeCapture = capture({
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    seed: "RECKLESS-CHALLENGE-DISABLED",
    challengeMode: true
  });
  assertTelemetryShape(challengeCapture, "challenge disabled capture");
  assert.strictEqual(scheduledEvents(challengeCapture).length, 0, "Challenge Mode should not schedule reckless events");
  assert.strictEqual(challengeCapture.recklessEventsSeen, 0, "Challenge Mode should not show reckless telemetry events");

  const enduranceCapture = capture({
    officialRouteId: officialScenario.routeId,
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    officialEnduranceActive: true,
    officialFinishLocked: true
  });
  assertTelemetryShape(enduranceCapture, "endurance disabled capture");
  assert.strictEqual(scheduledEvents(enduranceCapture).length, 0, "Official Endurance continuation should not schedule reckless prototype events");
  assert.strictEqual(enduranceCapture.recklessEventsSeen, 0, "Official Endurance continuation should not show reckless telemetry events");

  globalThis.__recklessPrototypeCheckResult = {
    officialRouteId: officialScenario.routeId,
    officialEvents: normalizeScheduled(officialScenario.capture),
    officialTelemetry: {
      recklessEventsSeen: officialScenario.capture.recklessEventsSeen,
      recklessSlowMerges: officialScenario.capture.recklessSlowMerges,
      recklessAggressiveOvertakes: officialScenario.capture.recklessAggressiveOvertakes,
      recklessPanicCorrections: officialScenario.capture.recklessPanicCorrections,
      recklessTelegraphAverageSeconds: officialScenario.capture.recklessTelegraphAverageSeconds,
      recklessMovementAverageSeconds: officialScenario.capture.recklessMovementAverageSeconds,
      recklessScheduledByBehavior: officialScenario.capture.recklessScheduledByBehavior,
      recklessScheduledBySection: officialScenario.capture.recklessScheduledBySection,
      recklessRejectsByReason: officialScenario.capture.recklessRejectsByReason
    },
    redlineRouteId: redlineCapture.officialRouteId,
    redlineEvents: normalizeScheduled(redlineCapture),
    redlineTelemetry: {
      recklessEventsSeen: redlineCapture.recklessEventsSeen,
      recklessSlowMerges: redlineCapture.recklessSlowMerges,
      recklessAggressiveOvertakes: redlineCapture.recklessAggressiveOvertakes,
      recklessPanicCorrections: redlineCapture.recklessPanicCorrections,
      recklessScheduledByBehavior: redlineCapture.recklessScheduledByBehavior,
      recklessScheduledBySection: redlineCapture.recklessScheduledBySection,
      recklessRejectsByReason: redlineCapture.recklessRejectsByReason,
      recklessRejectsBySection: redlineCapture.recklessRejectsBySection,
      recklessRejectsByDetail: redlineCapture.recklessRejectsByDetail
    },
    customEvents: normalizeScheduled(customCapture),
    partyClassicEvents: normalizeScheduled(partyCapture),
    recordChaseEvents: normalizeScheduled(chaseCapture),
    disabledModeEvents: {
      fuel: scheduledEvents(fuelCapture).length,
      partyFuel: scheduledEvents(partyFuelCapture).length,
      pursuit: scheduledEvents(pursuitCapture).length,
      challenge: scheduledEvents(challengeCapture).length,
      endurance: scheduledEvents(enduranceCapture).length
    }
  };
`, context, { filename: "reckless-drivers-prototype-checks.vm.js" });

console.log(JSON.stringify(context.__recklessPrototypeCheckResult, null, 2));
console.log("RECKLESS_DRIVERS_PROTOTYPE_CHECKS_OK");
