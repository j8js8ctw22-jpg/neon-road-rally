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
        const effectiveDistance = getObstacleEffectiveDistance(obstacle);
        const y = this.yForDistanceAt(effectiveDistance, runDistance);
        const lane = Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane;
        return { x: this.laneCenter(clamp(lane, 0, LANES - 1)), y, scale: this.scaleForY(y) };
      },
      getObstacleVisualRectAt(obstacle, runDistance) {
        const info = OBSTACLE_INFO[obstacle.type];
        if (!info || obstacle.type === "warning") return null;
        const ahead = getObstacleEffectiveDistance(obstacle) - runDistance;
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
      progress: event.progress,
      telegraphSeconds: event.telegraphSeconds,
      anticipationSeconds: event.anticipationSeconds,
      commitPauseSeconds: event.commitPauseSeconds,
      forwardDistancePeak: event.forwardDistancePeak,
      diagonalMotion: event.diagonalMotion,
      behaviorProfileLabel: event.behaviorProfileLabel,
      mergeSeconds: event.mergeSeconds,
      afterOfficialFinish: Boolean(event.afterOfficialFinish || event.enduranceContinuation),
      enduranceLap: event.enduranceLap || 1,
      timeSinceOfficialFinish: event.timeSinceOfficialFinish || 0,
      comfortBandTarget: Boolean(event.comfortBandTarget),
      comfortBandMin: Number.isFinite(event.comfortBandMin) ? event.comfortBandMin : null,
      comfortBandMax: Number.isFinite(event.comfortBandMax) ? event.comfortBandMax : null,
      comfortBandCenter: Number.isFinite(event.comfortBandCenter) ? event.comfortBandCenter : null,
      targetSafetyOk: event.targetSafetyOk,
      targetLaneClearAtSchedule: event.targetLaneClearAtSchedule,
      safetyReason: event.safetyReason
    }));
  }

  function assertRecklessQuality(captureResult, label) {
    const scheduled = scheduledEvents(captureResult);
    const started = startedEvents(captureResult);
    const safelyCancelledBeforeStart = (captureResult.recklessDriverEvents || []).filter((event) => (
      event.kind === "cancelled" && event.reason === "target-blocked-before-start"
    ));
    const enduranceCapture = scheduled.some((event) => event.afterOfficialFinish || event.enduranceContinuation);
    if (enduranceCapture) {
      assert(started.length > 0, label + " should show at least one visible post-finish reckless telegraph");
      assert(started.length <= scheduled.length, label + " started telegraphs should not exceed scheduled reckless events");
    } else {
      const resolvedIds = new Set(started.concat(safelyCancelledBeforeStart).map((event) => event.obstacleId).filter(Boolean));
      const unresolvedScheduled = scheduled.filter((event) => !resolvedIds.has(event.obstacleId));
      assert(started.length > 0, label + " should show at least one visible reckless telegraph");
      assert(
        unresolvedScheduled.length === 0,
        label + " scheduled reckless events should enter a visible telegraph or cancel during the start-time safety recheck"
      );
    }
    assert.strictEqual(captureResult.recklessPanicCorrections || 0, 0, label + " should not spend scheduled events on fake blocked-lane panic corrections");
    for (const event of scheduled) {
      const enduranceEvent = Boolean(event.afterOfficialFinish || event.enduranceContinuation);
      const minProgress = enduranceEvent
        ? RECKLESS_DRIVER_PROTOTYPE_CONFIG.enduranceContinuation.minProgress
        : RECKLESS_DRIVER_PROTOTYPE_CONFIG.minProgress;
      const maxProgress = enduranceEvent
        ? RECKLESS_DRIVER_PROTOTYPE_CONFIG.enduranceContinuation.maxProgress
        : RECKLESS_DRIVER_PROTOTYPE_CONFIG.maxProgress;
      assert.strictEqual(event.targetSafetyOk, true, label + " scheduled targets should pass complete safety validation");
      assert.strictEqual(event.targetLaneClearAtSchedule, true, label + " target lane should be clear at schedule time");
      assert(event.progress >= minProgress, label + " should not schedule before the reckless minimum progress");
      assert(event.progress <= maxProgress, label + " should not schedule after the reckless maximum progress");
    }
    for (const event of started) {
      assert.strictEqual(event.targetLaneClearAtStart, true, label + " target lane should still be clear when the event enters telegraph");
      assert.strictEqual(event.targetSafetyOkAtStart, true, label + " target lane should still pass safety when the event enters telegraph");
    }
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
      "recklessEventsScheduledBeforeOfficialFinish",
      "recklessEventsScheduledAfterOfficialFinish",
      "recklessEventsSeenBeforeOfficialFinish",
      "recklessEventsSeenAfterOfficialFinish",
      "recklessLateLapVisibleCount",
      "recklessComfortBandTargets",
      "recklessLatestTimeSinceOfficialFinish",
      "recklessTelegraphAverageSeconds",
      "recklessMovementAverageSeconds"
    ];
    const mapFields = [
      "recklessScheduledByBehavior",
      "recklessScheduledBySection",
      "recklessScheduledAfterOfficialFinishByLap",
      "recklessSeenBySection",
      "recklessSeenAfterOfficialFinishByLap",
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
  const slowForward = getRecklessDriverBehaviorProfile(RECKLESS_DRIVER_BEHAVIORS.slowDriftMerge).forwardDistance || 0;
  const aggressiveForward = getRecklessDriverBehaviorProfile(RECKLESS_DRIVER_BEHAVIORS.aggressiveOvertake).forwardDistance || 0;
  const panicForward = getRecklessDriverBehaviorProfile(RECKLESS_DRIVER_BEHAVIORS.panicCorrection).forwardDistance || 0;
  assert(slowForward > 0, "slow drift merge should include gentle forward displacement");
  assert(aggressiveForward > slowForward, "aggressive overtake should have the strongest forward displacement");
  assert(panicForward > slowForward, "panic correction should begin with diagonal forward displacement");
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
  assertRecklessQuality(officialScenario.capture, "official reckless capture");

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
    assert(event.forwardDistancePeak > 0, "scheduled event should include forward reckless displacement");
    assert.strictEqual(event.diagonalMotion, true, "scheduled event should advertise diagonal reckless motion");
    assert(event.mergeSeconds >= 0.32, "merge should not snap instantly");
    assert.strictEqual(event.targetSafetyOk, true, "scheduled reckless events should not use unsafe targets");
    assert.strictEqual(event.targetLaneClearAtSchedule, true, "scheduled reckless events should not target an occupied lane");
  }
  for (const event of startedEvents(officialScenario.capture)) {
    assert.strictEqual(event.phase, "telegraph", "started reckless event should begin in telegraph before movement");
    assert(event.telegraphSeconds >= event.mergeSeconds, "telegraph should be at least as readable as movement duration");
    assert(event.anticipationSeconds >= 0, "started event should expose anticipation timing");
    assert(event.forwardDistancePeak > 0, "started event should expose forward displacement");
    assert.strictEqual(event.diagonalMotion, true, "started event should expose diagonal motion state");
    assert.strictEqual(event.targetLaneClearAtStart, true, "started reckless event should still have a clear target lane at telegraph");
  }
  assert(
    (officialScenario.capture.recklessDriversActiveMax || 0) <= RECKLESS_DRIVER_PROTOTYPE_CONFIG.maxActiveAtOnce,
    "prototype should keep one active reckless movement globally"
  );

  function makeManualRecklessHarness(options = {}) {
    const speedClassId = options.speedClassId || "redline";
    const track = createRaceTrackForSpeedClass(getTrackById("sunset-highway"), speedClassId, DEFAULT_RACE_TYPE_ID);
    const progress = options.progress || 0.72;
    const spawnDistance = Math.round(track.distanceToFinish * progress);
    const runDistance = Math.max(0, spawnDistance - DIRECTOR_PACING_VIEW_DISTANCE * 0.8);
    const seed = options.seed || "RECKLESS-FORCED-TARGET-LANE";
    const seedSource = getRunRandomSeedSource(seed, track, speedClassId, DEFAULT_RACE_TYPE_ID);
    const rng = createSeededRandomController(seedSource);
    const run = {
      track,
      speedClassId,
      speedClass: getSpeedClassConfig(speedClassId),
      raceTypeId: DEFAULT_RACE_TYPE_ID,
      raceType: getRaceTypeConfig(DEFAULT_RACE_TYPE_ID),
      distance: runDistance,
      elapsed: 0,
      currentSpeed: getTrackCruiseSpeed(track, progress, speedClassId),
      targetLane: TRACK_DIRECTOR.centerLane,
      renderLaneFloat: TRACK_DIRECTOR.centerLane,
      playerLaneFloat: TRACK_DIRECTOR.centerLane,
      roadSeed: seed,
      roadSeedSource: seedSource,
      roadDirectorSequence: [],
      routeSeedLocked: false,
      partySeedLocked: false,
      officialRouteSeedLocked: false,
      partyMode: false,
      challengeMode: false,
      officialEnduranceActive: false,
      officialFinishLocked: false,
      currentSectionId: "pressure",
      currentSectionLabel: "Pressure",
      recklessDriversEnabled: false,
      recklessDriversScheduled: 0,
      recklessDriversStarted: 0,
      recklessDriversCompleted: 0,
      recklessDriversPanicCorrections: 0,
      recklessDriversCancelled: 0,
      recklessDriversSafetyRejects: 0,
      recklessDriversRewardRejects: 0,
      recklessDriversPressureRejects: 0,
      recklessDriversDisabledModeSkips: 0,
      recklessDriversActiveMax: 0,
      recklessEventsSeen: 0,
      recklessSlowMerges: 0,
      recklessAggressiveOvertakes: 0,
      recklessPanicCorrections: 0,
      recklessNearMisses: 0,
      recklessCrashes: 0,
      recklessAvoidedWithDriftDash: 0,
      recklessComfortBandTargets: 0,
      recklessTelegraphSecondsSum: 0,
      recklessMovementSecondsSum: 0,
      recklessTelemetrySamples: 0,
      recklessScheduledByBehavior: {},
      recklessScheduledBySection: {},
      recklessSeenBySection: {},
      recklessCompletedByBehavior: {},
      recklessCompletedBySection: {},
      recklessRejectsByReason: {},
      recklessRejectsBySection: {},
      recklessRejectsByDetail: {},
      recklessLastScheduleDistance: -Infinity,
      recklessActiveObstacleId: "",
      recklessFirstOpportunityGranted: false,
      recklessDriverEvents: []
    };
    const renderer = makeHarnessRenderer();
    renderer.run = run;
    const game = {
      run,
      renderer,
      screen: "game",
      randomFloat: () => rng.random(),
      trafficSprites: null,
      audio: { playSfx: () => {} }
    };
    const manager = new ObstacleManager(game);
    manager.reset(track);
    manager.obstacles = [];
    game.obstacles = manager;
    run.distance = runDistance;
    return { manager, run, spawnDistance };
  }

  function tryForcedRecklessSchedule(options = {}) {
    const { manager, run, spawnDistance } = makeManualRecklessHarness(options);
    const sourceLane = Number.isFinite(options.sourceLane) ? options.sourceLane : TRACK_DIRECTOR.centerLane;
    const wave = {
      type: "offsetPair",
      waveId: options.waveId || "forced-reckless-target-lane",
      distance: spawnDistance,
      section: { id: "pressure", label: "Pressure" },
      spawned: []
    };
    const source = manager.createObstacle("slowCar", sourceLane, spawnDistance, {
      waveType: wave.type,
      waveId: wave.waveId,
      sectionId: wave.section.id,
      sectionLabel: wave.section.label
    });
    manager.obstacles.push(source);
    wave.spawned.push(source);
    for (const lane of options.blockedLanes || []) {
      manager.obstacles.push(manager.createObstacle("fastCar", lane, spawnDistance, {
        waveType: "forcedTargetBlocker",
        waveId: wave.waveId,
        sectionId: wave.section.id,
        sectionLabel: wave.section.label
      }));
    }
    const scheduled = manager.tryScheduleRecklessFromWave(wave, spawnDistance, { section: wave.section });
    return { manager, run, source, scheduled, events: run.recklessDriverEvents };
  }

  function sampleForcedRecklessMotion(behavior, options = {}) {
    const { manager, run, spawnDistance } = makeManualRecklessHarness({
      ...options,
      seed: options.seed || ("RECKLESS-MOTION-" + behavior)
    });
    const sourceLane = Number.isFinite(options.sourceLane) ? options.sourceLane : TRACK_DIRECTOR.centerLane;
    const targetLane = Number.isFinite(options.targetLane) ? options.targetLane : sourceLane + 1;
    const wave = {
      type: "offsetPair",
      waveId: "forced-motion-" + behavior,
      distance: spawnDistance,
      section: { id: "pressure", label: "Pressure" },
      spawned: []
    };
    const source = manager.createObstacle("fastCar", sourceLane, spawnDistance, {
      waveType: wave.type,
      waveId: wave.waveId,
      sectionId: wave.section.id,
      sectionLabel: wave.section.label
    });
    manager.obstacles.push(source);
    wave.spawned.push(source);
    const validation = manager.validateRecklessTargetLane(source, targetLane);
    assert(validation.ok, "forced motion sample should start with a valid target lane for " + behavior);
    const scheduled = manager.scheduleRecklessDriver(source, wave, behavior, sourceLane, targetLane, validation);
    const state = scheduled.recklessState;
    const activationLead = state.telegraphSeconds + state.mergeSeconds + state.settleSeconds + 0.28;
    const playerAhead = manager.getPlayerZoneAhead(run.distance);
    run.distance = scheduled.distance - playerAhead - run.currentSpeed * Math.max(0.1, activationLead - 0.03);
    const samples = [];
    for (let i = 0; i < 170 && !scheduled.recklessComplete; i += 1) {
      run.elapsed += 1 / 60;
      manager.updateRecklessObstacle(scheduled, 1 / 60, run);
      const position = manager.game.renderer.getObstacleScreenPositionAt(scheduled, run.distance);
      samples.push({
        phase: state.phase,
        laneFloat: Number((scheduled.laneFloat || 0).toFixed(3)),
        forwardOffset: Number((scheduled.recklessDistanceOffset || 0).toFixed(2)),
        y: Number(position.y.toFixed(2))
      });
    }
    return {
      behavior,
      forwardDistancePeak: state.forwardDistancePeak || 0,
      maxForwardOffset: Number((state.maxForwardDistanceOffsetSeen || 0).toFixed(2)),
      maxLaneDisplacement: Number((state.maxLaneDisplacementSeen || 0).toFixed(3)),
      diagonalMotionSeen: Boolean(state.diagonalMotionSeen),
      finalLane: scheduled.lane,
      finalForwardOffset: scheduled.recklessDistanceOffset || 0,
      phases: Array.from(new Set(samples.map((sample) => sample.phase))),
      samples: samples.filter((sample, index) => index % 16 === 0 || index === samples.length - 1)
    };
  }

  const motionSamples = Object.values(RECKLESS_DRIVER_BEHAVIORS).map((behavior) => sampleForcedRecklessMotion(behavior));
  const motionByBehavior = Object.fromEntries(motionSamples.map((sample) => [sample.behavior, sample]));
  for (const sample of motionSamples) {
    assert(sample.maxForwardOffset > 12, sample.behavior + " should produce forward displacement during lane change");
    assert(sample.maxLaneDisplacement > 0.09, sample.behavior + " should produce lateral displacement during lane change");
    assert.strictEqual(sample.diagonalMotionSeen, true, sample.behavior + " should record diagonal motion state");
    assert.strictEqual(sample.finalForwardOffset, 0, sample.behavior + " should clear forward offset after completion/cancel");
  }
  assert(
    motionByBehavior.aggressiveOvertake.maxForwardOffset > motionByBehavior.slowDriftMerge.maxForwardOffset * 1.8,
    "Aggressive Overtake should surge forward more strongly than Slow Drift Merge"
  );
  assert(
    motionByBehavior.panicCorrection.phases.includes("panicCommit") && motionByBehavior.panicCorrection.phases.includes("panicCorrection"),
    "Panic Correction should start diagonally then correct back"
  );
  assert.strictEqual(
    motionByBehavior.panicCorrection.finalLane,
    TRACK_DIRECTOR.centerLane,
    "Panic Correction should finish back in the source lane"
  );

  const forcedBlockedTarget = tryForcedRecklessSchedule({
    sourceLane: TRACK_DIRECTOR.centerLane,
    blockedLanes: [TRACK_DIRECTOR.centerLane + 1],
    seed: "RECKLESS-FORCED-ONE-BLOCKED"
  });
  assert(forcedBlockedTarget.scheduled, "forced one-blocked target should still schedule by choosing a valid adjacent lane");
  assert.notStrictEqual(
    forcedBlockedTarget.scheduled.recklessTargetLane,
    TRACK_DIRECTOR.centerLane + 1,
    "reckless scheduler should not choose an occupied adjacent target lane"
  );
  assert.strictEqual(
    forcedBlockedTarget.scheduled.recklessState.targetLaneClearAtSchedule,
    true,
    "forced one-blocked target should schedule with a clear target lane"
  );

  const forcedFullyBlocked = tryForcedRecklessSchedule({
    sourceLane: 0,
    blockedLanes: [1],
    seed: "RECKLESS-FORCED-FULLY-BLOCKED"
  });
  assert.strictEqual(forcedFullyBlocked.scheduled, null, "fully blocked edge-lane reckless opportunity should cancel before scheduling");
  assert(
    forcedFullyBlocked.events.some((event) => event.kind === "skip" && event.detail === "target-lane-blocked"),
    "fully blocked forced opportunity should record a target-lane-blocked safety skip"
  );

  const forcedStartRetarget = tryForcedRecklessSchedule({
    sourceLane: TRACK_DIRECTOR.centerLane,
    blockedLanes: [],
    seed: "RECKLESS-FORCED-START-RETARGET"
  });
  assert(forcedStartRetarget.scheduled, "forced start-retarget setup should schedule before the target lane changes");
  const oldStartTargetLane = forcedStartRetarget.scheduled.recklessTargetLane;
  forcedStartRetarget.manager.obstacles.push(forcedStartRetarget.manager.createObstacle("fastCar", oldStartTargetLane, forcedStartRetarget.scheduled.distance, {
    waveType: "forcedStartBlocker",
    waveId: "forced-start-retarget",
    sectionId: "pressure",
    sectionLabel: "Pressure"
  }));
  const state = forcedStartRetarget.scheduled.recklessState;
  const activationLead = state.telegraphSeconds + state.mergeSeconds + state.settleSeconds + 0.28;
  const playerAhead = forcedStartRetarget.manager.getPlayerZoneAhead(forcedStartRetarget.run.distance);
  forcedStartRetarget.run.distance = forcedStartRetarget.scheduled.distance
    - playerAhead
    - forcedStartRetarget.run.currentSpeed * Math.max(0.1, activationLead - 0.03);
  const becameActive = forcedStartRetarget.manager.updateRecklessObstacle(forcedStartRetarget.scheduled, 1 / 60, forcedStartRetarget.run);
  assert(becameActive, "reckless start-time target recheck should retarget to the alternate lane when one is available");
  assert.notStrictEqual(
    forcedStartRetarget.scheduled.recklessTargetLane,
    oldStartTargetLane,
    "start-time recheck should not keep a target lane that became blocked"
  );
  assert.strictEqual(state.targetLaneClearAtStart, true, "retargeted reckless start should mark the new target lane clear");
  assert(
    forcedStartRetarget.events.some((event) => event.kind === "retargeted"),
    "start-time recheck should record a retargeted telemetry event"
  );

  const customCapture = capture({
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    seed: "RECKLESS-PROTOTYPE-CUSTOM",
    waveLimit: 180
  });
  assertTelemetryShape(customCapture, "custom reckless capture");
  assertRecklessQuality(customCapture, "custom reckless capture");
  assert(scheduledEvents(customCapture).length > 0, "Playground/Custom Classic should be eligible for reckless prototype events");

  const redlineCapture = capture({
    officialRouteId: "redline-city-limits-blaze",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    waveLimit: 260
  });
  assertTelemetryShape(redlineCapture, "redline reckless capture");
  assertRecklessQuality(redlineCapture, "redline reckless capture");
  const redlineScheduled = scheduledEvents(redlineCapture);
  assert(redlineScheduled.length >= 5, "Redline should schedule 5-6 meaningful reckless events when fair");
  assert(redlineScheduled.length <= RECKLESS_DRIVER_PROTOTYPE_CONFIG.maxPerRunBySpeed.redline, "Redline should respect the prototype max per run");
  assert(redlineCapture.recklessAggressiveOvertakes >= 4, "Redline should strongly prefer Aggressive Overtake when safe");
  assert(redlineCapture.recklessComfortBandTargets >= 2, "Redline should cut into the player's 3-lane comfort band when fair");
  assert(
    redlineScheduled.some((event) => event.sectionId === "pressure" || event.sectionId === "finalPush"),
    "Redline should allow a fair reckless event in pressure/finalPush instead of launch-only scheduling"
  );
  assert(
    redlineScheduled.some((event) => event.behavior === RECKLESS_DRIVER_BEHAVIORS.aggressiveOvertake),
    "Redline scheduled events should include Aggressive Overtake"
  );
  assert(
    redlineScheduled.some((event) => event.progress >= 0.7),
    "Redline should schedule later-race reckless events when route length allows"
  );
  assert(
    redlineScheduled.some((event) => event.progress >= 0.7 && event.behavior === RECKLESS_DRIVER_BEHAVIORS.aggressiveOvertake),
    "Redline later-race reckless events should lean toward Aggressive Overtake"
  );
  assert(
    redlineScheduled.filter((event) => event.progress >= 0.5).every((event) => event.behavior === RECKLESS_DRIVER_BEHAVIORS.aggressiveOvertake),
    "Redline mid/late reckless events should not fall back to Slow Merge"
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
  assertRecklessQuality(partyCapture, "party classic capture");
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
  assertRecklessQuality(chaseCapture, "record chase classic capture");
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
    officialFinishLocked: true,
    officialEnduranceLap: 2,
    waveLimit: 320,
    dt: 0.28
  });
  assertTelemetryShape(enduranceCapture, "endurance continuation capture");
  assertRecklessQuality(enduranceCapture, "endurance continuation capture");
  assert(scheduledEvents(enduranceCapture).length > 0, "Official Endurance continuation should keep scheduling reckless prototype events");
  assert(enduranceCapture.recklessEventsScheduledAfterOfficialFinish > 0, "Official Endurance continuation should count post-finish scheduled reckless events");
  assert.strictEqual(enduranceCapture.recklessEventsScheduledBeforeOfficialFinish, 0, "Endurance capture should not mutate first-lap reckless telemetry");
  assert(enduranceCapture.recklessEventsSeenAfterOfficialFinish >= 2, "Official Endurance continuation should show meaningful post-finish reckless events");
  assert(enduranceCapture.recklessLateLapVisibleCount >= 2, "Official Endurance continuation should count visible late-lap reckless events");
  assert(
    Object.values(enduranceCapture.recklessScheduledAfterOfficialFinishByLap || {}).reduce((sum, count) => sum + count, 0) > 0,
    "Official Endurance continuation should report scheduled reckless events by endurance lap"
  );
  assert(
    scheduledEvents(enduranceCapture).every((event) => event.afterOfficialFinish === true && event.enduranceLap >= 2),
    "Official Endurance scheduled events should be marked as post-finish lap events"
  );
  const redlineEnduranceCapture = capture({
    officialRouteId: "redline-city-limits-blaze",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    officialEnduranceActive: true,
    officialFinishLocked: true,
    officialEnduranceLap: 3,
    waveLimit: 240,
    dt: 0.24
  });
  assertTelemetryShape(redlineEnduranceCapture, "redline endurance continuation capture");
  assertRecklessQuality(redlineEnduranceCapture, "redline endurance continuation capture");
  assert(redlineEnduranceCapture.recklessEventsScheduledAfterOfficialFinish >= 2, "Redline endurance continuation should get meaningful late-lap reckless pressure");
  assert(redlineEnduranceCapture.recklessEventsSeenAfterOfficialFinish >= 2, "Redline endurance continuation should show meaningful late-lap reckless pressure");
  assert(redlineEnduranceCapture.recklessComfortBandTargets >= 2, "Redline endurance continuation should keep cutting into the comfort band when fair");
  const officialAfterEnduranceRepeat = capture({
    officialRouteId: officialScenario.routeId,
    raceTypeId: DEFAULT_RACE_TYPE_ID
  });
  assert.deepStrictEqual(
    normalizeSequenceSpine(officialAfterEnduranceRepeat),
    normalizeSequenceSpine(officialScenario.capture),
    "Endurance continuation scheduling should not alter the official locked first-lap route sequence spine"
  );
  assert.deepStrictEqual(
    normalizeScheduled(officialAfterEnduranceRepeat),
    normalizeScheduled(officialScenario.capture),
    "Endurance continuation scheduling should not alter official locked first-lap reckless choices"
  );

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
      recklessComfortBandTargets: redlineCapture.recklessComfortBandTargets,
      recklessScheduledByBehavior: redlineCapture.recklessScheduledByBehavior,
      recklessScheduledBySection: redlineCapture.recklessScheduledBySection,
      recklessRejectsByReason: redlineCapture.recklessRejectsByReason,
      recklessRejectsBySection: redlineCapture.recklessRejectsBySection,
      recklessRejectsByDetail: redlineCapture.recklessRejectsByDetail
    },
    forcedTargeting: {
      oneBlockedTargetLane: forcedBlockedTarget.scheduled?.recklessTargetLane ?? null,
      oneBlockedEvents: forcedBlockedTarget.events,
      fullyBlockedScheduled: Boolean(forcedFullyBlocked.scheduled),
      fullyBlockedEvents: forcedFullyBlocked.events,
      startRetargetOldTargetLane: oldStartTargetLane,
      startRetargetNewTargetLane: forcedStartRetarget.scheduled?.recklessTargetLane ?? null,
      startRetargetEvents: forcedStartRetarget.events
    },
    motionSamples,
    customEvents: normalizeScheduled(customCapture),
    partyClassicEvents: normalizeScheduled(partyCapture),
    recordChaseEvents: normalizeScheduled(chaseCapture),
    enduranceContinuation: {
      routeId: enduranceCapture.officialRouteId,
      lap: enduranceCapture.officialEnduranceLap,
      scheduledAfterFinish: enduranceCapture.recklessEventsScheduledAfterOfficialFinish,
      seenAfterFinish: enduranceCapture.recklessEventsSeenAfterOfficialFinish,
      scheduledByLap: enduranceCapture.recklessScheduledAfterOfficialFinishByLap,
      seenByLap: enduranceCapture.recklessSeenAfterOfficialFinishByLap,
      latestTimeSinceOfficialFinish: enduranceCapture.recklessLatestTimeSinceOfficialFinish,
      events: normalizeScheduled(enduranceCapture)
    },
    redlineEnduranceContinuation: {
      routeId: redlineEnduranceCapture.officialRouteId,
      lap: redlineEnduranceCapture.officialEnduranceLap,
      scheduledAfterFinish: redlineEnduranceCapture.recklessEventsScheduledAfterOfficialFinish,
      seenAfterFinish: redlineEnduranceCapture.recklessEventsSeenAfterOfficialFinish,
      scheduledByLap: redlineEnduranceCapture.recklessScheduledAfterOfficialFinishByLap,
      comfortBandTargets: redlineEnduranceCapture.recklessComfortBandTargets,
      events: normalizeScheduled(redlineEnduranceCapture)
    },
    disabledModeEvents: {
      fuel: scheduledEvents(fuelCapture).length,
      partyFuel: scheduledEvents(partyFuelCapture).length,
      pursuit: scheduledEvents(pursuitCapture).length,
      challenge: scheduledEvents(challengeCapture).length
    }
  };
`, context, { filename: "reckless-drivers-prototype-checks.vm.js" });

console.log(JSON.stringify(context.__recklessPrototypeCheckResult, null, 2));
console.log("RECKLESS_DRIVERS_PROTOTYPE_CHECKS_OK");
