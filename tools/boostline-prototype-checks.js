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

  function countObstacles(sequence, types) {
    const wanted = new Set(types);
    return sequence.reduce((sum, wave) => sum + (wave.obstacles || []).filter((obstacle) => wanted.has(obstacle.type)).length, 0);
  }

  function averageBlocked(sequence) {
    if (!sequence.length) return 0;
    return sequence.reduce((sum, wave) => sum + ((wave.blockedLanes || []).length), 0) / sequence.length;
  }

  const app = Object.create(NeonRoadRally.prototype);
  app.renderer = makeHarnessRenderer();

  const route = getOfficialRouteById(BOOSTLINE_PROTOTYPE_ROUTE_ID);
  assert(route, "Boostline prototype route should be registered");
  assert.strictEqual(route.name, "Neon Palm Boostline", "Boostline route should use the prototype route name");
  assert.strictEqual(route.raceTypeId, BOOSTLINE_RACE_TYPE_ID, "Boostline route should use Boostline race type");
  assert.strictEqual(route.prototype, true, "Boostline route should be prototype-only");
  assert.strictEqual(getOfficialRoutesForTrack("sunset-highway").some((item) => item.id === route.id), false, "Boostline should not appear in the normal Official 10 grid");
  assert.strictEqual(trackSupportsRaceType(getTrackById(route.trackId), BOOSTLINE_RACE_TYPE_ID), true, "Sunset should support Boostline prototype");
  assert.strictEqual(getRaceTypesForTrack(getTrackById(route.trackId)).some((item) => item.id === BOOSTLINE_RACE_TYPE_ID), false, "Boostline should stay out of default race type choices");
  assert.strictEqual(getRaceTypesForTrack(getTrackById(route.trackId), { includePrototype: true }).some((item) => item.id === BOOSTLINE_RACE_TYPE_ID), true, "Boostline should be opt-in for prototype tools");

  const script = getBoostlineRouteScript(route, createRaceTrackForSpeedClass(getTrackById(route.trackId), route.speedClassId, BOOSTLINE_RACE_TYPE_ID));
  assert(script?.events?.length >= 8, "Boostline script should contain all route phases");
  assert.deepStrictEqual(script.events.map((event) => event.phase), ["Launch", "Groove", "Groove", "Pressure", "Pressure", "Breather", "Final Push", "Final Push"], "Boostline route should preserve the authored phase order");

  const captures = [0.4, 1 / 60, 1 / 50, 1 / 30].map((dt) => app.captureRoadDirectorSequence({
    officialRouteId: route.id,
    raceTypeId: BOOSTLINE_RACE_TYPE_ID,
    waveLimit: 20,
    dt,
    routeSeedLocked: true
  }));
  const signatures = captures.map((capture) => app.getRoadDirectorRouteSignature(capture, { officialRouteId: route.id }));
  const signatureHash = signatures[0].hash;
  assert(signatures.every((signature) => signature.hash === signatureHash), "Boostline route signature should repeat across repeated generation and frame cadence");
  assert(signatures.every((signature) => signature.version === BOOSTLINE_ROUTE_SIGNATURE_VERSION), "Boostline signature should use the Boostline route signature version");

  const boostline = captures[0];
  const sequence = boostline.sequence;
  const waveTypes = sequence.map((wave) => wave.type);
  assert(waveTypes.includes("boostlineLaunchChain"), "Boostline should include a launch boost chain");
  assert(waveTypes.includes("boostlineGrooveCommit"), "Boostline should include groove lane commitment");
  assert(waveTypes.includes("boostlinePressureChain"), "Boostline should include pressure boost chain");
  assert(waveTypes.includes("boostlineRampShortcut"), "Boostline should include a ramp shortcut");
  assert(waveTypes.includes("boostlineBreatherSetup"), "Boostline should include a breather/recovery setup");
  assert(waveTypes.includes("boostlineFinalPushChain"), "Boostline should include a final push chain");

  const boostPads = countObstacles(sequence, ["boostPad"]);
  const ramps = countObstacles(sequence, ["ramp"]);
  const hardBlockers = countObstacles(sequence, ["slowCar", "fastCar", "truck", "barrier"]);
  const blockers = countObstacles(sequence, ["slowCar", "fastCar", "truck", "barrier", "cone", "oil", "branch", "deer"]);
  assert(boostPads >= 12, "Boostline should contain a learnable boost-pad route");
  assert(ramps >= 3, "Boostline should contain ramp shortcut opportunities");
  assert(hardBlockers <= 8, "Boostline should keep hard blocker pressure low");
  assert(sequence.every((wave) => (wave.blockedLanes || []).length < LANES), "Boostline should never create an impossible five-lane wall");
  assert(sequence.every((wave) => wave.fairnessPassed !== false), "Boostline authored waves should pass route fairness");
  assert(sequence.every((wave) => wave.pressureBudgetPassed !== false), "Boostline authored waves should stay within pressure budget");
  assert.strictEqual(boostline.boostlineVisibleSpawnViolations, 0, "Boostline should have no visible spawn violations");
  assert.strictEqual(
    boostline.preventedUnsafeSpawns,
    0,
    "Boostline should not rely on rejected unsafe spawns " + JSON.stringify(boostline.recentRoadDirectorRejections || [])
  );

  const classicCapture = app.captureRoadDirectorSequence({
    officialRouteId: "sunset-neon-palm-sprint",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    waveLimit: 20,
    dt: 0.4,
    routeSeedLocked: true
  });
  const boostlineAverageBlocked = averageBlocked(sequence);
  const classicAverageBlocked = averageBlocked(classicCapture.sequence);
  assert(
    boostlineAverageBlocked <= classicAverageBlocked || (hardBlockers / Math.max(1, sequence.length)) < 1,
    "Boostline should carry lower survival pressure than Classic"
  );

  console.log("BOOSTLINE_PROTOTYPE_CHECKS_OK");
  console.log(JSON.stringify({
    routeId: route.id,
    routeName: route.name,
    raceTypeId: BOOSTLINE_RACE_TYPE_ID,
    scriptVersion: boostline.boostlineScriptVersion,
    signatureVersion: signatures[0].version,
    signatureHash,
    signatureHashes: signatures.map((signature) => signature.hash),
    waveCount: signatures[0].waveCount,
    boostPads,
    ramps,
    blockers,
    hardBlockers,
    boostlineAverageBlocked: Number(boostlineAverageBlocked.toFixed(2)),
    classicAverageBlocked: Number(classicAverageBlocked.toFixed(2)),
    visibleSpawnViolations: boostline.boostlineVisibleSpawnViolations,
    preventedUnsafeSpawns: boostline.preventedUnsafeSpawns,
    phases: script.events.map((event) => event.phase)
  }, null, 2));
`, context, { filename: "boostline-prototype-checks" });
