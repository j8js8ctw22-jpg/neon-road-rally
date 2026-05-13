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

  const shortBoost = getDriftBoostForCharge(0.25);
  const longBoost = getDriftBoostForCharge(3);
  const cappedBoost = getDriftBoostForCharge(8);
  assert(shortBoost.multiplier > 1 && shortBoost.duration > 0, "Short drifts should provide a small boost");
  assert(longBoost.multiplier > shortBoost.multiplier, "Longer drifts should give a larger boost");
  assert(longBoost.duration > shortBoost.duration, "Longer drifts should last longer");
  assert.strictEqual(cappedBoost.multiplier, longBoost.multiplier, "Drift boost multiplier should cap");
  assert.strictEqual(cappedBoost.duration, longBoost.duration, "Drift boost duration should cap");

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
    driftInputDirection: 0,
    driftInputShift: false,
    driftActive: false,
    driftDirection: 0,
    driftChargeSeconds: 0,
    driftChargeRatio: 0,
    maxDriftCharge: 0,
    driftFullChargeReady: false,
    driftFullChargeCuePlayed: false,
    driftFullChargeCueTimer: 0,
    driftCooldownTimer: 0,
    driftBoostTimer: 0,
    driftBoostMultiplier: 1,
    driftsStarted: 0,
    driftBoostsReleased: 0,
    driftBoostTime: 0,
    longestDrift: 0,
    boostTrailPunchTimer: 0,
    screenShake: 0,
    floatingTexts: []
  };
  const startingLane = app.run.targetLane;
  app.setDriftInput(-1, true);
  app.updateDriftState(0.3);
  assert.strictEqual(app.run.driftActive, true, "Shift + A should activate left drift state");
  assert.strictEqual(app.run.driftDirection, -1, "Left drift should keep left direction");
  assert.strictEqual(app.run.targetLane, startingLane, "Drift should not change lane by itself");
  app.setDriftInput(0, false);
  app.updateDriftState(0.016);
  assert.strictEqual(app.run.driftActive, false, "Release should end active drift");
  assert(app.run.driftBoostTimer > 0, "Release should start drift boost timer");
  assert(app.run.driftBoostMultiplier > 1, "Release should apply drift speed multiplier");
  assert.strictEqual(app.run.driftBoostsReleased, 1, "Release should count drift boost telemetry");
  const shortRelease = {
    timer: app.run.driftBoostTimer,
    multiplier: app.run.driftBoostMultiplier
  };

  app.run.driftCooldownTimer = 0;
  app.setDriftInput(1, true);
  app.updateDriftState(3.25);
  assert.strictEqual(app.run.driftActive, true, "Shift + D should activate right drift state");
  assert.strictEqual(app.run.driftDirection, 1, "Right drift should keep right direction");
  assert(app.run.driftFullChargeReady, "A 3-second drift should mark full charge ready");
  assert(app.run.driftChargeRatio >= 0.999, "Full drift charge ratio should reach cap");
  assert(app.run.maxDriftCharge <= DRIFT_TUNING.maxChargeSeconds, "Max drift charge should be capped");
  assert(sfxPlayed.includes("driftFullCharge"), "Full charge should play the full-charge SFX hook");
  app.setDriftInput(0, false);
  app.updateDriftState(0.016);
  assert(app.run.driftBoostMultiplier > shortRelease.multiplier, "A 3-second drift should release a stronger boost than a short drift");
  assert(app.run.driftBoostTimer > shortRelease.timer, "A 3-second drift should release a longer boost than a short drift");
  assert.strictEqual(app.run.driftBoostsReleased, 2, "Full release should count another drift boost");

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
    chargeWindowSeconds: [DRIFT_TUNING.minChargeSeconds, DRIFT_TUNING.maxChargeSeconds],
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
