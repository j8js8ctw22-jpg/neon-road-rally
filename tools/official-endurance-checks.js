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
  document: {
    activeElement: null,
    body: { contains: () => false }
  },
  navigator: {},
  performance: { now: () => 0 },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  setTimeout: (callback) => {
    if (typeof callback === "function") callback();
    return 0;
  },
  clearTimeout: () => {}
});

vm.runInContext(source, context, { filename: "game.js" });

async function main() {
  await vm.runInContext(`
    (async () => {
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
          },
          getPlayerFloatingAnchor() {
            return {
              x: this.laneCenter(TRACK_DIRECTOR.centerLane),
              y: this.height * PLAYER_START_Y_RATIO
            };
          }
        };
      }

      function makeAudioStub() {
        return {
          masterMuted: false,
          musicMuted: false,
          sfxVolume: 1,
          setRaceMusicTrack: () => {},
          playMusic: () => {},
          stopMusic: () => {},
          updateMusicState: () => {},
          triggerMusicEvent: () => {},
          playSfx: () => false
        };
      }

      function makeLayerStub() {
        return {
          innerHTML: "",
          classList: {
            add: () => {},
            remove: () => {},
            toggle: () => {}
          },
          querySelector: () => null,
          querySelectorAll: () => []
        };
      }

      let appIndex = 0;
      function makeApp() {
        const app = Object.create(NeonRoadRally.prototype);
        app.profiles = new PlayerProfileManager("official-endurance-checks-" + (++appIndex));
        app.playtestReports = { addRun: () => null };
        app.audio = makeAudioStub();
        app.renderer = makeHarnessRenderer();
        app.obstacles = new ObstacleManager(app);
        app.collision = new CollisionSystem(app);
        app.input = {
          clearGameplayInput: () => {},
          clearCountdownInputLocks: () => {}
        };
        app.canvas = { focus: () => {} };
        app.layer = makeLayerStub();
        app.screen = "title";
        app.debugMode = false;
        app.debugSpeedScale = 1;
        app.attractDistance = 0;
        const defaultOfficialRoute = getDefaultOfficialRouteForTrack(DEFAULT_TRACK_ID);
        app.pendingRoadSeed = defaultOfficialRoute?.seed || DEFAULT_ROAD_SEED;
        app.pendingRaceTypeId = DEFAULT_RACE_TYPE_ID;
        app.pendingTrackId = defaultOfficialRoute?.trackId || DEFAULT_TRACK_ID;
        app.pendingOfficialRouteId = defaultOfficialRoute?.id || DEFAULT_OFFICIAL_ROUTE_ID;
        app.partySetup = null;
        app.partySession = null;
        app.guideTab = "basics";
        app.guideReturnScreen = "title";
        app.badgeFilter = "all";
        app.playtestReportFilter = "all";
        app.leaderboardView = LEADERBOARD_VIEW_SCORE_ATTACK;
        app.leaderboardTrackId = app.pendingTrackId;
        app.leaderboardRaceTypeId = app.pendingRaceTypeId;
        app.leaderboardSpeedClassId = app.profiles.data.speedClassId;
        app.leaderboardOfficialRouteId = defaultOfficialRoute?.id || DEFAULT_OFFICIAL_ROUTE_ID;
        app.playtestReportCopyText = "";
        app.roadDirectorReportCopyText = "";
        app.roadRng = null;
        app.officialFullRouteSignatureCache = new Map();
        app.officialEnduranceBestByRoute = new Map();
        app.randomFloat = () => app.nextRoadRandom();
        app.simulationStatus = null;
        app.simulationRunning = false;
        app.run = app.createEmptyRun();
        app.lastSummary = null;
        app.scoreTallyFrame = null;
        return app;
      }

      function startOfficialClassicRun() {
        const app = makeApp();
        const route = getOfficialRouteById("sunset-neon-palm-sprint") || getDefaultOfficialRouteForTrack(DEFAULT_TRACK_ID);
        assert(route, "Official Classic route should be available");
        app.startRace({
          seed: route.seed,
          speedClassId: route.speedClassId,
          raceTypeId: DEFAULT_RACE_TYPE_ID,
          track: getTrackById(route.trackId),
          officialRouteId: route.id
        });
        app.renderer.run = app.run;
        app.run.countdownTimer = 0;
        app.run.raceActive = true;
        app.run.elapsed = 51.234;
        app.run.distance = app.run.track.distanceToFinish;
        return { app, route };
      }

      function finishFirstLap(app) {
        const beforeLeaderboardCount = app.profiles.data.leaderboard.length;
        app.handleFinishLineCrossing();
        app.renderer.run = app.run;
        assert.strictEqual(app.screen, "game", "Official Classic should remain in race after first finish");
        assert.strictEqual(app.run.ended, false, "Endurance continuation should keep the run active");
        assert.strictEqual(app.run.officialEnduranceActive, true, "Endurance flag should turn on after first finish");
        assert.strictEqual(app.run.officialFinishLocked, true, "Official finish should be locked after first finish");
        assert.strictEqual(app.run.officialEnduranceLap, 2, "First finish should continue into Lap 2");
        assert.strictEqual(app.run.officialEnduranceCompletedLaps, 1, "First finish should count as Lap 1 complete");
        assert.strictEqual(app.run.manualBoosts, 3, "Lap 2 should start with three fresh manual boosts");
        assert.strictEqual(app.profiles.data.leaderboard.length, beforeLeaderboardCount + 1, "First finish should record exactly one official score row");
        assert.strictEqual(app.run.officialFinishTimeMs, 51234, "Official finish time should be captured from first finish");
        assert.strictEqual(app.run.officialFinishSummary.finishTimeMs, 51234, "Official finish snapshot should preserve first finish time");
        assert.strictEqual(app.lastSummary.finishTimeMs, 51234, "Last summary before endurance should be the normal official finish");
        assert.strictEqual(app.lastSummary.status, "finished", "First-lap official summary should remain finished");
        return {
          officialRunId: app.run.runId,
          officialFinishTimeMs: app.run.officialFinishTimeMs,
          officialScore: app.run.officialFinishScore,
          officialSummary: app.run.officialFinishSummary,
          leaderboardCount: app.profiles.data.leaderboard.length
        };
      }

      const first = startOfficialClassicRun();
      const signatureBefore = first.app.getOfficialFullRouteSignature(first.route, DEFAULT_RACE_TYPE_ID).hash;
      const official = finishFirstLap(first.app);
      first.app.run.elapsed += 8.25;
      first.app.run.score += 2400;
      first.app.run.distance = 9000;
      first.app.updateOfficialEnduranceStats();
      assert.strictEqual(first.app.run.officialFinishTimeMs, official.officialFinishTimeMs, "Post-finish play should not mutate the official finish time");
      assert.strictEqual(first.app.run.officialFinishSummary.finalScore, official.officialScore, "Post-finish play should not mutate the official score snapshot");
      first.app.endOfficialEndurance("Driver Ended");
      assert.strictEqual(first.app.profiles.data.leaderboard.length, official.leaderboardCount, "Escape after finish should not create a second official score row");
      assert.strictEqual(first.app.lastSummary.finishTimeMs, official.officialFinishTimeMs, "Escape result should still show first-lap official time");
      assert.strictEqual(first.app.lastSummary.finalScore, official.officialScore, "Escape result should still show first-lap official score");
      assert.strictEqual(first.app.lastSummary.officialEnduranceResult.endedBy, "Escape", "Escape should end the endurance portion");
      assert.strictEqual(first.app.lastSummary.officialEnduranceResult.officialFinishTimeMs, official.officialFinishTimeMs, "Endurance result should reference the locked official time");
      const officialRows = first.app.getOfficialScoreAttackRows(first.route.id, { raceTypeId: DEFAULT_RACE_TYPE_ID });
      assert.strictEqual(officialRows.filter((row) => row.runId === official.officialRunId).length, 1, "Official score board should contain only the first-finish row for this run");
      const timeRows = first.app.getTimeAttackLeaderboardRows({
        trackId: first.route.trackId,
        raceTypeId: DEFAULT_RACE_TYPE_ID,
        speedClassId: first.route.speedClassId
      }, { legacy: false, limit: LEADERBOARD_STORAGE_MAX_ENTRIES }).filter((row) => row.officialRouteId === first.route.id && row.runId === official.officialRunId);
      assert.strictEqual(timeRows.length, 1, "Time Attack should contain only the first-finish row for this run");
      assert.strictEqual(timeRows[0].finishTimeMs, official.officialFinishTimeMs, "Time Attack row should use the first finish time only");
      const signatureAfter = first.app.getOfficialFullRouteSignature(first.route, DEFAULT_RACE_TYPE_ID).hash;
      assert.strictEqual(signatureAfter, signatureBefore, "Post-finish endurance should not change the first-lap full-route signature");

      const crash = startOfficialClassicRun();
      const crashOfficial = finishFirstLap(crash.app);
      crash.app.run.elapsed += 4.5;
      crash.app.run.distance = 12000;
      crash.app.run.score += 1500;
      crash.app.updateOfficialEnduranceStats();
      crash.app.endRace("crashed", "Debug Crash");
      assert.strictEqual(crash.app.profiles.data.leaderboard.length, crashOfficial.leaderboardCount, "Crash after finish should not add a second leaderboard row");
      assert.strictEqual(crash.app.lastSummary.status, "crashed", "Crash should remain the final endurance end status");
      assert.strictEqual(crash.app.lastSummary.finishTimeMs, crashOfficial.officialFinishTimeMs, "Crash result should preserve the first-lap finish time");
      assert.strictEqual(crash.app.lastSummary.finalScore, crashOfficial.officialScore, "Crash result should preserve the first-lap official score");
      assert.strictEqual(crash.app.lastSummary.officialEnduranceResult.endedBy, "Crash", "Crash should be recorded as the endurance ending");
      assert.strictEqual(crash.app.lastSummary.officialEnduranceResult.endReason, "Debug Crash", "Crash reason should be stored on endurance result");
      assert(crash.app.lastSummary.officialEnduranceResult.postFinishScore > 0, "Crash endurance result should track post-finish score separately");

      const boosts = startOfficialClassicRun();
      finishFirstLap(boosts.app);
      boosts.app.useManualBoost();
      assert.strictEqual(boosts.app.run.manualBoosts, 2, "Manual boost should be spendable during endurance");
      boosts.app.run.elapsed += 2;
      boosts.app.run.distance = boosts.app.run.track.distanceToFinish + 250;
      boosts.app.handleFinishLineCrossing();
      assert.strictEqual(boosts.app.run.officialEnduranceLap, 3, "Second endurance crossing should advance to Lap 3");
      assert.strictEqual(boosts.app.run.officialEnduranceCompletedLaps, 2, "Second crossing should count two completed laps");
      assert.strictEqual(boosts.app.run.manualBoosts, 3, "Each new endurance lap should refresh three manual boosts");

      const fuelApp = makeApp();
      fuelApp.startRace({
        seed: first.route.seed,
        speedClassId: first.route.speedClassId,
        raceTypeId: FUEL_RUN_RACE_TYPE_ID,
        track: getTrackById(first.route.trackId),
        officialRouteId: first.route.id
      });
      assert.strictEqual(fuelApp.run.raceTypeId, FUEL_RUN_RACE_TYPE_ID, "Fuel Run setup should remain Fuel Run");
      assert.strictEqual(fuelApp.canStartOfficialEnduranceAtFinish(fuelApp.run), false, "Fuel Run should not start Official Endurance");

      const partyApp = makeApp();
      partyApp.startRace({
        partyMode: true,
        seed: first.route.seed,
        speedClassId: first.route.speedClassId,
        raceTypeId: DEFAULT_RACE_TYPE_ID,
        track: getTrackById(first.route.trackId)
      });
      assert.strictEqual(partyApp.run.partyMode, true, "Party setup should remain Party");
      assert.strictEqual(partyApp.canStartOfficialEnduranceAtFinish(partyApp.run), false, "Party should not start Official Endurance");

      const speedLap2 = getOfficialEnduranceSpeedMultiplier({
        officialEnduranceActive: true,
        officialFinishLocked: true,
        officialEnduranceLap: 2
      });
      const speedLap3 = getOfficialEnduranceSpeedMultiplier({
        officialEnduranceActive: true,
        officialFinishLocked: true,
        officialEnduranceLap: 3
      });
      assert(speedLap3 > speedLap2, "Endurance speed multiplier should increase by lap");
      const pressureLap2 = getOfficialEndurancePressureMultiplier({
        officialEnduranceActive: true,
        officialFinishLocked: true,
        officialEnduranceLap: 2
      });
      const pressureLap3 = getOfficialEndurancePressureMultiplier({
        officialEnduranceActive: true,
        officialFinishLocked: true,
        officialEnduranceLap: 3
      });
      assert(pressureLap3 > pressureLap2, "Endurance pressure multiplier should increase by lap");

      const simApp = makeApp();
      const lap1Safety = await simApp.runSpawnSafetySimulationCore({
        runs: 1,
        officialRouteId: first.route.id,
        raceTypeId: DEFAULT_RACE_TYPE_ID,
        dt: 0.36
      });
      const lap3Safety = await simApp.runSpawnSafetySimulationCore({
        runs: 1,
        officialRouteId: first.route.id,
        raceTypeId: DEFAULT_RACE_TYPE_ID,
        officialEnduranceLap: 3,
        dt: 0.36
      });
      const lap3FairnessPass = [
        "zeroFiveLaneWalls",
        "zeroHardBlockerFiveLaneWalls",
        "zeroSameLaneOverlaps",
        "zeroBoostOverlaps",
        "zeroRampOverlaps",
        "zeroVisibleSpawnViolations",
        "maxWavesPerFrameOne",
        "activeFieldCapsRespected",
        "deadScreenWithinModeLimit",
        "maxAtMostFour",
        "hardBlockerMaxAtMostFour",
        "flatHardRowsControlled",
        "routeReadabilityPassed",
        "rampUsefulnessPassed",
        "unsafeRampLandingsPassed",
        "directorFairnessPassed",
        "directorPressureBudgetPassed"
      ].every((key) => lap3Safety.passDetails[key] === true);
      assert(lap3FairnessPass, "Lap 3 endurance fairness checks should pass: " + JSON.stringify(lap3Safety.passDetails));
      assert.strictEqual(lap3Safety.passDetails.zeroFiveLaneWalls, true, "Lap 3 endurance should avoid impossible 5-lane walls");
      assert.strictEqual(lap3Safety.passDetails.zeroVisibleSpawnViolations, true, "Lap 3 endurance should avoid visible spawn violations");
      assert.strictEqual(lap3Safety.passDetails.routeReadabilityPassed, true, "Lap 3 endurance should keep readable routes");
      assert.strictEqual(lap3Safety.passDetails.deadScreenWithinModeLimit, true, "Lap 3 endurance should avoid dead openings and sit-still stretches");
      assert(
        lap3Safety.director.averagePressureBudget > lap1Safety.director.averagePressureBudget,
        "Lap 3 endurance should raise director pressure budget over first lap"
      );

      console.log("OFFICIAL_ENDURANCE_CHECKS_OK");
      console.log(JSON.stringify({
        officialRouteId: first.route.id,
        officialFinishTimeMs: official.officialFinishTimeMs,
        officialScore: official.officialScore,
        leaderboardRowsAfterEscape: first.app.profiles.data.leaderboard.length,
        crashEnduranceResult: crash.app.lastSummary.officialEnduranceResult,
        lapRefresh: {
          lap: boosts.app.run.officialEnduranceLap,
          completedLaps: boosts.app.run.officialEnduranceCompletedLaps,
          manualBoosts: boosts.app.run.manualBoosts
        },
        safety: {
          lap1AveragePressureBudget: lap1Safety.director.averagePressureBudget,
          lap3AveragePressureBudget: lap3Safety.director.averagePressureBudget,
          lap3FairnessPass,
          lap3FairnessDetails: {
            zeroFiveLaneWalls: lap3Safety.passDetails.zeroFiveLaneWalls,
            zeroHardBlockerFiveLaneWalls: lap3Safety.passDetails.zeroHardBlockerFiveLaneWalls,
            zeroVisibleSpawnViolations: lap3Safety.passDetails.zeroVisibleSpawnViolations,
            activeFieldCapsRespected: lap3Safety.passDetails.activeFieldCapsRespected,
            deadScreenWithinModeLimit: lap3Safety.passDetails.deadScreenWithinModeLimit,
            routeReadabilityPassed: lap3Safety.passDetails.routeReadabilityPassed,
            directorFairnessPassed: lap3Safety.passDetails.directorFairnessPassed,
            directorPressureBudgetPassed: lap3Safety.passDetails.directorPressureBudgetPassed
          }
        },
        firstLapSignatureStable: signatureAfter === signatureBefore
      }, null, 2));
    })()
  `, context, { filename: "official-endurance-checks" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
