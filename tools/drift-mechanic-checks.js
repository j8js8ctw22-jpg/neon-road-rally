#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(repoRoot, "game.js"), "utf8");
assert(
  !source.includes("this.renderBoostlinePrototypeCard(track.id)"),
  "Boostline prototype card should not be wired into normal solo setup"
);

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

  function keyEvent(key, code = "") {
    return {
      key,
      code,
      repeat: false,
      target: null,
      preventDefault() {
        this.defaultPrevented = true;
      }
    };
  }

  function makeFakeGame() {
    const game = {
      screen: "game",
      run: { raceActive: true, paused: false, ended: false, debugFrozen: false },
      laneMoves: [],
      driftInputs: [],
      verticalInput: 0,
      manualBoosts: 0,
      audio: {
        activate() {},
        playMusic() {}
      },
      recordInputEvent() {},
      focusControls() {},
      requestLaneMove(direction) {
        this.laneMoves.push(direction);
        return true;
      },
      setVerticalInput(direction) {
        this.verticalInput = direction;
      },
      setDriftInput(direction, shiftHeld) {
        this.driftInputs.push({ direction, shiftHeld: Boolean(shiftHeld) });
      },
      clearDriftInput() {
        this.driftInputs.push({ direction: 0, shiftHeld: false, cleared: true });
      },
      useManualBoost() {
        this.manualBoosts += 1;
      },
      togglePause() {}
    };
    return game;
  }

  {
    const fakeGame = makeFakeGame();
    const input = new InputManager(fakeGame);
    input.onKeyDown(keyEvent("a", "KeyA"));
    assert.strictEqual(fakeGame.laneMoves.at(-1), -1, "A without Shift should preserve one-lane left movement");
    assert.strictEqual(fakeGame.driftInputs.at(-1).direction, 0, "A without Shift should not start drift");
  }

  {
    const fakeGame = makeFakeGame();
    const input = new InputManager(fakeGame);
    input.onKeyDown(keyEvent("d", "KeyD"));
    assert.strictEqual(fakeGame.laneMoves.at(-1), 1, "D without Shift should preserve one-lane right movement");
    assert.strictEqual(fakeGame.driftInputs.at(-1).direction, 0, "D without Shift should not start drift");
  }

  {
    const fakeGame = makeFakeGame();
    const input = new InputManager(fakeGame);
    input.onKeyDown(keyEvent("Shift", "ShiftLeft"));
    assert.strictEqual(fakeGame.driftInputs.at(-1).direction, 0, "Shift alone should not drift");
    assert.strictEqual(fakeGame.laneMoves.length, 0, "Shift alone should not request a lane move");

    input.onKeyDown(keyEvent("a", "KeyA"));
    assert.strictEqual(fakeGame.laneMoves.length, 0, "Shift + A should not request a lane move");
    assert.strictEqual(fakeGame.driftInputs.at(-1).direction, -1, "Shift + A should start left drift input");
    input.onKeyUp(keyEvent("a", "KeyA"));
    assert.strictEqual(fakeGame.driftInputs.at(-1).direction, 0, "Releasing A while Shift is held should clear drift input");
  }

  {
    const fakeGame = makeFakeGame();
    const input = new InputManager(fakeGame);
    input.onKeyDown(keyEvent("Shift", "ShiftLeft"));
    input.onKeyDown(keyEvent("ArrowRight", ""));
    assert.strictEqual(fakeGame.laneMoves.length, 0, "Shift + ArrowRight should not request a lane move");
    assert.strictEqual(fakeGame.driftInputs.at(-1).direction, 1, "Shift + ArrowRight should start right drift input");
    input.onKeyUp(keyEvent("Shift", "ShiftLeft"));
    assert.strictEqual(fakeGame.driftInputs.at(-1).direction, 0, "Releasing Shift should clear drift input");
  }

  {
    const fakeGame = makeFakeGame();
    const input = new InputManager(fakeGame);
    input.onKeyDown(keyEvent(" ", "Space"));
    assert.strictEqual(fakeGame.manualBoosts, 1, "Space boost should still request a manual boost");
  }

  const tapDashDistance = getDriftDashLaneDistanceForHold(0.12);
  const shortDashDistance = getDriftDashLaneDistanceForHold(0.32);
  const longDashDistance = getDriftDashLaneDistanceForHold(0.85);
  const cappedDashDistance = getDriftDashLaneDistanceForHold(5);
  const shortBoost = getDriftDashBoostForRelease(0.22, shortDashDistance);
  const longBoost = getDriftDashBoostForRelease(1.05, longDashDistance);
  const cappedBoost = getDriftDashBoostForRelease(5, LANES);
  assert(Math.abs(DRIFT_TUNING.maxChargeSeconds - 1.05) <= 0.06, "Max drift dash hold should cap around 1.05 seconds");
  assert(DRIFT_TUNING.releaseCooldownSeconds <= 0.25, "Drift dash cooldown should stay short for responsive repeated inputs");
  assert(tapDashDistance > 0 && tapDashDistance < 0.6, "Tap drift dash should make a small lane cut");
  assert(shortDashDistance > 1.05 && shortDashDistance < 1.45, "Short drift dash should move roughly one lane");
  assert(longDashDistance > shortDashDistance, "Longer drift dash should cross farther than a short dash");
  assert(cappedDashDistance <= LANES - 1 + 0.05, "Capped drift dash distance should fit inside the road width");
  assert.strictEqual(getDriftMajoritySettleLane(2.5, 1), 2, "Right drift release below 51% should settle back");
  assert.strictEqual(getDriftMajoritySettleLane(2.51, 1), 3, "Right drift release at 51% should settle into the entered lane");
  assert.strictEqual(getDriftMajoritySettleLane(1.5, -1), 2, "Left drift release below 51% should settle back");
  assert.strictEqual(getDriftMajoritySettleLane(1.49, -1), 1, "Left drift release at 51% should settle into the entered lane");
  assert(shortBoost.multiplier > 1 && shortBoost.duration > 0, "Short clean drift dashes should provide a small boost");
  assert(longBoost.multiplier > shortBoost.multiplier, "Longer drift dashes should release a stronger boost");
  assert(longBoost.duration > shortBoost.duration, "Longer drift dashes should release a longer boost");
  assert.strictEqual(cappedBoost.multiplier, longBoost.multiplier, "Drift dash boost multiplier should cap");
  assert.strictEqual(cappedBoost.duration, longBoost.duration, "Drift dash boost duration should cap");

  const app = Object.create(NeonRoadRally.prototype);
  app.renderer = makeHarnessRenderer();
  const sfxPlayed = [];
  app.audio = {
    sfxVolume: 1,
    playSfx(key) {
      sfxPlayed.push(key);
      return true;
    },
    triggerMusicEvent() {}
  };
  app.addFloatingScoreText = () => {};
  app.run = {
    raceActive: true,
    paused: false,
    ended: false,
    airborne: false,
    targetLane: 2,
    renderLaneFloat: 2,
    playerLaneFloat: 2,
    laneChangeStartLane: 2,
    laneChangeTargetLane: 2,
    laneChangeDistance: 0.001,
    laneChangeElapsed: 0,
    laneChangeProgress: 1,
    laneMoves: 0,
    driftInputDirection: 0,
    driftInputShift: false,
    driftActive: false,
    driftDirection: 0,
    driftChargeSeconds: 0,
    driftChargeRatio: 0,
    maxDriftCharge: 0,
    maxDriftHold: 0,
    driftDashStartLaneFloat: 2,
    driftDashLastLaneFloat: 2,
    driftDashDistance: 0,
    driftFullChargeReady: false,
    driftFullChargeCuePlayed: false,
    driftFullChargeCueTimer: 0,
    driftCooldownTimer: 0,
    driftBoostTimer: 0,
    driftBoostMultiplier: 1,
    driftsStarted: 0,
    driftBoostsReleased: 0,
    driftBoostTime: 0,
    driftDashesCompleted: 0,
    driftDashTime: 0,
    driftLanesCrossed: 0,
    longestDriftDashLanes: 0,
    driftSettleLane: 2,
    driftSettleDelta: 0,
    driftSettledByMajorityThreshold: false,
    longestDrift: 0,
    boostTrailPunchTimer: 0,
    screenShake: 0,
    floatingTexts: []
  };
  const startingLane = app.run.targetLane;
  const startingLaneMoves = app.run.laneMoves;
  app.setDriftInput(-1, true);
  assert.strictEqual(app.run.driftActive, true, "Shift + A should start drift dash during input handling");
  assert.strictEqual(app.run.driftDirection, -1, "Immediate left drift dash should keep left direction");
  assert.strictEqual(app.run.laneMoves, startingLaneMoves, "Immediate Shift + A should not trigger normal lane-change telemetry");
  assert(app.run.renderLaneFloat < startingLane, "Shift + A should move the car immediately before the next simulation tick");
  const immediateLaneFloat = app.run.renderLaneFloat;
  app.updateDriftState(0.2);
  assert.strictEqual(app.run.driftActive, true, "Shift + A should activate left drift dash state");
  assert.strictEqual(app.run.driftDirection, -1, "Left drift dash should keep left direction");
  assert.strictEqual(app.run.laneMoves, startingLaneMoves, "Shift + A should not trigger normal lane-change telemetry");
  assert(app.run.renderLaneFloat < startingLane, "Left drift dash should immediately move across the lane");
  assert(app.run.renderLaneFloat < immediateLaneFloat, "Held left drift dash should continue moving after the immediate impulse");
  assert(app.run.driftDashDistance > 0.6, "A held drift dash should build measurable cross-lane distance");
  app.setDriftInput(0, false);
  const releasedLaneFloat = app.run.renderLaneFloat;
  assert.strictEqual(app.run.driftActive, false, "Release should end active drift dash");
  assert(Number.isInteger(app.run.targetLane) && app.run.targetLane >= 0 && app.run.targetLane < LANES, "Release should settle to a valid lane");
  assert.strictEqual(app.run.renderLaneFloat, app.run.targetLane, "Release should snap the car into the chosen lane immediately");
  assert.strictEqual(app.run.playerLaneFloat, app.run.targetLane, "Release should stop player lane travel immediately");
  app.updateDriftState(0.016);
  assert.strictEqual(app.run.renderLaneFloat, releasedLaneFloat, "Drift dash should not keep sliding after release");
  assert(app.run.driftBoostTimer > 0, "Clean release should start a small drift dash boost timer");
  assert(app.run.driftBoostMultiplier > 1, "Clean release should apply a small drift dash speed multiplier");
  assert.strictEqual(app.run.driftDashesCompleted, 1, "Release should count drift dash telemetry");
  assert.strictEqual(app.run.driftBoostsReleased, 1, "Boosted release should count drift boost telemetry");
  assert(app.run.driftLanesCrossed > 0.6, "Release should record lanes crossed");
  const shortRelease = {
    timer: app.run.driftBoostTimer,
    multiplier: app.run.driftBoostMultiplier,
    lanes: app.run.longestDriftDashLanes
  };

  app.run.targetLane = 0;
  app.run.renderLaneFloat = 0;
  app.run.playerLaneFloat = 0;
  app.run.laneChangeStartLane = 0;
  app.run.laneChangeTargetLane = 0;
  app.run.laneChangeDistance = 0.001;
  app.run.laneChangeElapsed = 0;
  app.run.laneChangeProgress = 1;
  app.run.driftCooldownTimer = 0;
  app.setDriftInput(1, true);
  assert.strictEqual(app.run.driftActive, true, "Shift + D should start immediately after cooldown clears");
  assert(app.run.renderLaneFloat > 0, "Immediate right drift dash should move before the next simulation tick");
  app.updateDriftState(0.85);
  assert.strictEqual(app.run.driftActive, true, "Shift + D should activate right drift dash state");
  assert.strictEqual(app.run.driftDirection, 1, "Right drift dash should keep right direction");
  assert(app.run.renderLaneFloat > 2.5, "Longer right drift dash should cut across multiple lanes");
  assert(app.run.renderLaneFloat <= LANES - 1, "Drift dash should stay inside road bounds while active");
  assert(app.run.driftFullChargeReady === false, "0.85-second dash should not hit the max-hold cue yet");
  app.updateDriftState(0.35);
  assert(app.run.driftFullChargeReady, "Max-hold drift dash should mark ready at the cap");
  assert(app.run.driftChargeRatio >= 0.999, "Max-hold drift dash ratio should reach cap");
  assert(app.run.maxDriftCharge <= DRIFT_TUNING.maxChargeSeconds, "Max drift charge should be capped");
  assert(app.run.maxDriftHold <= DRIFT_TUNING.maxChargeSeconds, "Max drift hold should be capped");
  assert(app.run.maxDriftHold >= 1.04, "Max drift hold should reach the 1.05-second cap");
  assert(sfxPlayed.includes("driftFullCharge"), "Max-hold dash should play the full-charge SFX hook");
  app.setDriftInput(0, false);
  assert(app.run.targetLane >= 3 && app.run.targetLane < LANES, "Long drift dash release should settle near the crossed-to lane");
  assert.strictEqual(app.run.renderLaneFloat, app.run.targetLane, "Long release should stop on its settled lane immediately");
  assert(app.run.longestDriftDashLanes > shortRelease.lanes, "Longer drift dash should record more lanes crossed than a tap/short dash");
  assert(app.run.driftBoostMultiplier > shortRelease.multiplier, "Longer drift dash should release a stronger boost than a short dash");
  assert(app.run.driftBoostTimer > shortRelease.timer, "Longer drift dash should release a longer boost than a short dash");
  assert.strictEqual(app.run.driftDashesCompleted, 2, "Full release should count another drift dash");
  assert.strictEqual(app.run.driftBoostsReleased, 2, "Full release should count another drift boost");

  app.run.driftCooldownTimer = DRIFT_TUNING.releaseCooldownSeconds;
  app.setDriftInput(-1, true);
  assert.strictEqual(app.run.driftActive, false, "Cooldown should block only the tiny lockout window");
  app.updateDriftState(DRIFT_TUNING.releaseCooldownSeconds + 0.01);
  assert.strictEqual(app.run.driftActive, true, "Held drift input should start as soon as the short cooldown expires");
  app.setDriftInput(0, false);

  function runSettleProbe(direction, laneFloat) {
    Object.assign(app.run, {
      raceActive: true,
      paused: false,
      ended: false,
      airborne: false,
      driftActive: true,
      driftDirection: direction,
      driftChargeSeconds: 0.2,
      driftChargeRatio: getDriftChargeRatio(0.2),
      driftDashStartLaneFloat: direction > 0 ? Math.floor(laneFloat) : Math.ceil(laneFloat),
      renderLaneFloat: laneFloat,
      playerLaneFloat: laneFloat,
      driftCooldownTimer: 0
    });
    return app.releaseDriftBoost("settle-probe");
  }
  runSettleProbe(1, 2.5);
  assert.strictEqual(app.run.targetLane, 2, "Right drift at 50% should settle back to the previous lane");
  assert.strictEqual(app.run.renderLaneFloat, 2, "Right drift at 50% should snap back immediately");
  assert.strictEqual(app.run.driftSettledByMajorityThreshold, true, "Release should record majority-threshold settling");
  runSettleProbe(1, 2.51);
  assert.strictEqual(app.run.targetLane, 3, "Right drift at 51% should settle into the entered lane");
  assert.strictEqual(app.run.renderLaneFloat, 3, "Right drift at 51% should snap into the entered lane immediately");
  runSettleProbe(-1, 1.5);
  assert.strictEqual(app.run.targetLane, 2, "Left drift at 50% should settle back to the previous lane");
  runSettleProbe(-1, 1.49);
  assert.strictEqual(app.run.targetLane, 1, "Left drift at 51% should settle into the entered lane");

  app.run.targetLane = 0;
  app.run.renderLaneFloat = 0;
  app.run.playerLaneFloat = 0;
  app.run.driftCooldownTimer = 0;
  app.setDriftInput(-1, true);
  app.updateDriftState(2);
  assert.strictEqual(app.run.renderLaneFloat, 0, "Left drift dash from the left edge should not leave the road");
  app.setDriftInput(0, false);
  app.updateDriftState(0.016);
  assert.strictEqual(app.run.targetLane, 0, "Edge drift dash release should settle inside the road");

  const baseBox = { x: 100, y: 50, w: 40, h: 80 };
  const leftRun = { driftActive: true, driftDirection: -1, driftChargeSeconds: DRIFT_TUNING.maxChargeSeconds };
  const rightRun = { driftActive: true, driftDirection: 1, driftChargeSeconds: DRIFT_TUNING.maxChargeSeconds };
  const leftBox = getDriftAdjustedPlayerHitbox(baseBox, leftRun, 120);
  const rightBox = getDriftAdjustedPlayerHitbox(baseBox, rightRun, 120);
  assert(leftBox.x < baseBox.x && leftBox.w > baseBox.w, "Left drift danger footprint should extend left");
  assert.strictEqual(leftBox.x + leftBox.w, baseBox.x + baseBox.w, "Left drift should preserve the non-drift-side edge");
  assert.strictEqual(rightBox.x, baseBox.x, "Right drift should preserve the non-drift-side edge");
  assert(rightBox.x + rightBox.w > baseBox.x + baseBox.w, "Right drift danger footprint should extend right");

  const palmCaptureA = app.captureRoadDirectorSequence({
    officialRouteId: "sunset-neon-palm-sprint",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    waveLimit: 36,
    dt: 0.36,
    routeSeedLocked: true
  });
  const palmCaptureB = app.captureRoadDirectorSequence({
    officialRouteId: "sunset-neon-palm-sprint",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    waveLimit: 36,
    dt: 0.36,
    routeSeedLocked: true
  });
  const palmSignatureA = app.getRoadDirectorRouteSignature(palmCaptureA, { officialRouteId: "sunset-neon-palm-sprint" });
  const palmSignatureB = app.getRoadDirectorRouteSignature(palmCaptureB, { officialRouteId: "sunset-neon-palm-sprint" });
  assert.strictEqual(palmSignatureA.hash, palmSignatureB.hash, "Official route signatures should remain stable with drift code present");
  assert.strictEqual(getRaceTypesForTrack(getTrackById("sunset-highway")).some((item) => item.id === BOOSTLINE_RACE_TYPE_ID), false, "Boostline should not be visible in default race type choices");
  assert.strictEqual(getRaceTypesForTrack(getTrackById("sunset-highway")).some((item) => item.id === PURSUIT_RACE_TYPE_ID), false, "Pursuit should not be visible in default race type choices");

  console.log("DRIFT_MECHANIC_CHECKS_OK");
  console.log(JSON.stringify({
    dashHoldWindowSeconds: [DRIFT_TUNING.minChargeSeconds, DRIFT_TUNING.maxChargeSeconds],
    dashLanesPerSecond: DRIFT_TUNING.dashLanesPerSecond,
    initialDashSeconds: DRIFT_TUNING.initialDashSeconds,
    settleMajorityThreshold: DRIFT_TUNING.settleMajorityThreshold,
    releaseCooldownSeconds: DRIFT_TUNING.releaseCooldownSeconds,
    maxDashLaneDistance: Number(cappedDashDistance.toFixed(3)),
    boostMultiplier: {
      short: Number(shortBoost.multiplier.toFixed(3)),
      max: Number(longBoost.multiplier.toFixed(3))
    },
    boostDuration: {
      short: Number(shortBoost.duration.toFixed(3)),
      max: Number(longBoost.duration.toFixed(3))
    },
    dangerLaneReach: DRIFT_TUNING.dangerLaneReach,
    officialSignatureHash: palmSignatureA.hash
  }, null, 2));
`, context, { filename: "drift-mechanic-checks" });
