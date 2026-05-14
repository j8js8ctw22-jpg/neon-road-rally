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

  const app = Object.create(NeonRoadRally.prototype);
  app.renderer = makeHarnessRenderer();

  const newNormalTrackIds = ["midnight-ridge", "blackout-run", "prism-highway"];
  const firstOfficialRouteIds = [
    "sunset-neon-palm-sprint",
    "redline-tunnel-spark-sprint",
    "midnight-ridge-lantern-sprint",
    "blackout-headlight-mile",
    "prism-pinkline-sprint"
  ];
  const newTrackExpectedSpeedCounts = { turbo: 4, overdrive: 3, redline: 3 };
  for (const trackId of newNormalTrackIds) {
    const routes = getOfficialRoutesForTrack(trackId);
    assert.strictEqual(routes.length, 10, trackId + " should register an Official 10");
    assert.deepStrictEqual(
      routes.reduce((counts, route) => {
        counts[route.speedClassId] = (counts[route.speedClassId] || 0) + 1;
        return counts;
      }, {}),
      newTrackExpectedSpeedCounts,
      trackId + " should use 4 Turbo, 3 Overdrive, and 3 Redline official routes"
    );
    assert(routes.every((route) => officialRouteSupportsRaceType(route, DEFAULT_RACE_TYPE_ID)), trackId + " official routes should support Classic");
    assert(routes.every((route) => officialRouteSupportsRaceType(route, FUEL_RUN_RACE_TYPE_ID)), trackId + " official routes should support Fuel Run");
    assert(routes.every((route) => !["arcade", "pro"].includes(route.speedClassId)), trackId + " official routes should exclude Arcade and Pro");
  }

  const audit = app.runOfficialRouteDeterminismAudit({
    routeIds: firstOfficialRouteIds,
    raceTypeIds: [DEFAULT_RACE_TYPE_ID, FUEL_RUN_RACE_TYPE_ID],
    repeats: 5,
    waveLimit: 36,
    dt: 0.36
  });

  assert(audit.pass, "Official route determinism audit should pass");
  assert.strictEqual(audit.officialSeedNormalizationPassed, true, "Official seeds should normalize to official route ids");
  assert.strictEqual(audit.customSeedRemainsCustom, true, "Non-official manual seeds should remain custom");

  const palmClassic = audit.routeAudits.find((row) => row.routeId === "sunset-neon-palm-sprint" && row.raceTypeId === DEFAULT_RACE_TYPE_ID);
  const redlineClassic = audit.routeAudits.find((row) => row.routeId === "redline-tunnel-spark-sprint" && row.raceTypeId === DEFAULT_RACE_TYPE_ID);
  assert(palmClassic?.signatureHash, "Neon Palm Sprint should produce a route signature");
  assert(redlineClassic?.signatureHash, "Redline Run official route should produce a route signature");
  assert(palmClassic.signatureHashes.every((hash) => hash === palmClassic.signatureHash), "Neon Palm Sprint signatures should repeat exactly");
  assert(redlineClassic.signatureHashes.every((hash) => hash === redlineClassic.signatureHash), "Redline official signatures should repeat exactly");
  for (const routeId of firstOfficialRouteIds.slice(2)) {
    const row = audit.routeAudits.find((item) => item.routeId === routeId && item.raceTypeId === DEFAULT_RACE_TYPE_ID);
    assert(row?.signatureHash, routeId + " should produce a route signature");
    assert(row.signatureHashes.every((hash) => hash === row.signatureHash), routeId + " signatures should repeat exactly");
  }

  function assertFrameCadenceStable(routeId, raceTypeId, label) {
    const dts = [1 / 60, 1 / 50, 1 / 40, 1 / 30];
    const signatures = dts.map((dt) => {
      const capture = app.captureRoadDirectorSequence({
        officialRouteId: routeId,
        raceTypeId,
        waveLimit: 36,
        dt,
        routeSeedLocked: true
      });
      return {
        dt,
        signature: app.getRoadDirectorRouteSignature(capture, { officialRouteId: routeId })
      };
    });
    const expectedHash = signatures[0].signature.hash;
    if (!signatures.every((row) => row.signature.hash === expectedHash)) {
      throw new Error(label + " should keep the same route signature across frame cadences " + JSON.stringify(
        signatures.map((row) => ({ dt: Number(row.dt.toFixed(5)), hash: row.signature.hash, waveCount: row.signature.waveCount }))
      ));
    }
    return signatures.map((row) => ({ dt: row.dt, hash: row.signature.hash }));
  }

  const frameCadenceRouteIds = ["sunset-neon-palm-sprint", "redline-tunnel-spark-sprint"];
  const frameCadenceAudits = frameCadenceRouteIds.map((routeId) => ({
    routeId,
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    signatures: assertFrameCadenceStable(routeId, DEFAULT_RACE_TYPE_ID, getOfficialRouteDisplayName(routeId) + " Classic")
  }));

  const palmManualClassic = getOfficialRouteForRun("sunset-highway", "turbo", DEFAULT_RACE_TYPE_ID, "SUNSET-PALM-SPRINT-TURBO", "");
  const palmManualFuel = getOfficialRouteForRun("sunset-highway", "turbo", FUEL_RUN_RACE_TYPE_ID, "SUNSET-PALM-SPRINT-TURBO", "");
  const midnightManualClassic = getOfficialRouteForRun("midnight-ridge", "turbo", DEFAULT_RACE_TYPE_ID, "MIDNIGHT-RIDGE-LANTERN-TURBO", "");
  const blackoutManualClassic = getOfficialRouteForRun("blackout-run", "turbo", DEFAULT_RACE_TYPE_ID, "BLACKOUT-HEADLIGHT-MILE-TURBO", "");
  const prismManualClassic = getOfficialRouteForRun("prism-highway", "turbo", DEFAULT_RACE_TYPE_ID, "PRISM-PINKLINE-SPRINT-TURBO", "");
  const customManual = getOfficialRouteForRun("sunset-highway", "turbo", DEFAULT_RACE_TYPE_ID, "CUSTOM-NOT-OFFICIAL-SEED", "");
  assert.strictEqual(palmManualClassic?.id, "sunset-neon-palm-sprint", "Manual Classic official seed should normalize to Neon Palm Sprint");
  assert.strictEqual(palmManualFuel?.id, "sunset-neon-palm-sprint", "Manual Fuel Run official seed should normalize to Neon Palm Sprint");
  assert.strictEqual(midnightManualClassic?.id, "midnight-ridge-lantern-sprint", "Manual Midnight Ridge official seed should normalize to Ridge Lantern Sprint");
  assert.strictEqual(blackoutManualClassic?.id, "blackout-headlight-mile", "Manual Blackout Run official seed should normalize to Headlight Mile");
  assert.strictEqual(prismManualClassic?.id, "prism-pinkline-sprint", "Manual Prism Highway official seed should normalize to Pinkline Sprint");
  assert.strictEqual(customManual, null, "Non-official manual seed should not normalize");

  const officialEntry = normalizeLeaderboardEntry({
    playerName: "QA",
    carName: "QA Car",
    trackId: "sunset-highway",
    raceType: DEFAULT_RACE_TYPE_ID,
    speedClass: "turbo",
    seed: "SUNSET-PALM-SPRINT-TURBO",
    score: 12345,
    status: "finished",
    finishTimeMs: 42123
  });
  const customEntry = normalizeLeaderboardEntry({
    playerName: "QA",
    carName: "QA Car",
    trackId: "sunset-highway",
    raceType: DEFAULT_RACE_TYPE_ID,
    speedClass: "turbo",
    seed: "CUSTOM-NOT-OFFICIAL-SEED",
    score: 12345,
    status: "finished",
    finishTimeMs: 42123
  });
  assert.strictEqual(officialEntry.officialRouteId, "sunset-neon-palm-sprint", "Leaderboard entries using an official seed should route to Official records");
  assert.strictEqual(officialEntry.competitionKind, "Official Race", "Official seed entries should be labeled Official Race");
  assert.strictEqual(customEntry.officialRouteId, "", "Custom seed leaderboard entries should stay custom");
  assert.strictEqual(customEntry.competitionKind, "Custom Road", "Custom seed leaderboard entries should be labeled Custom Road");

  console.log("OFFICIAL_ROUTE_DETERMINISM_CHECKS_OK");
  console.log(JSON.stringify({
    signatureVersion: audit.signatureVersion,
    routes: audit.routeAudits.map((row) => ({
      routeId: row.routeId,
      routeName: row.routeName,
      raceTypeId: row.raceTypeId,
      seed: row.seed,
      signatureHash: row.signatureHash,
      waveCount: row.waveCounts[0],
      repeats: row.repeats
    })),
    frameCadenceAudits,
    manualOfficialSeed: {
      seed: "SUNSET-PALM-SPRINT-TURBO",
      normalizedRouteId: palmManualClassic.id
    },
    newTrackOfficial10: Object.fromEntries(newNormalTrackIds.map((trackId) => [
      trackId,
      getOfficialRoutesForTrack(trackId).map((route) => ({
        routeId: route.id,
        routeName: route.name,
        seed: route.seed,
        speedClassId: route.speedClassId
      }))
    ])),
    customSeedRemainsCustom: audit.customSeedRemainsCustom
  }, null, 2));
`, context, { filename: "official-route-determinism-checks" });
