#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const assert = require("assert");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
  }

  const candidates = [
    process.env.NRR_PLAYWRIGHT_NODE_MODULES,
    ...String(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean),
    process.env.HOME
      ? path.join(process.env.HOME, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules")
      : ""
  ].filter(Boolean);

  for (const nodeModulesPath of candidates) {
    const packagePath = path.join(nodeModulesPath, "playwright", "package.json");
    if (!fs.existsSync(packagePath)) continue;
    return createRequire(packagePath)("playwright");
  }

  throw new Error("Cannot find module 'playwright'. Install it locally, set NODE_PATH, or set NRR_PLAYWRIGHT_NODE_MODULES.");
}

const { chromium } = loadPlaywright();

const BRAVE_PATH = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const BASE_URL = process.env.NRR_SMOKE_URL || "http://127.0.0.1:8085/";
const OUT_DIR = process.env.NRR_FLOW_BREAK_QA_OUT_DIR || "/private/tmp/nrr-flow-break-correctness";

async function setupHarness(page) {
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    if (!app) throw new Error("Neon Road Rally app missing");
    localStorage.clear();
    app.profiles.data.players = [];
    app.profiles.data.currentPlayerId = null;
    const driver = app.profiles.createPlayer("Flow QA");
    app.profiles.selectPlayer(driver.id);

    window.__flowBreakQa = {
      laneCount() {
        return typeof LANES === "number" ? LANES : 7;
      },
      centerLane() {
        return typeof TRACK_DIRECTOR === "object" && Number.isFinite(TRACK_DIRECTOR.centerLane)
          ? TRACK_DIRECTOR.centerLane
          : Math.floor(this.laneCount() / 2);
      },
      reset(options = {}) {
        const laneFloat = Number.isFinite(options.laneFloat) ? options.laneFloat : this.centerLane();
        const targetLane = Number.isFinite(options.targetLane) ? options.targetLane : Math.round(laneFloat);
        const raceTypeId = options.raceTypeId || "classic";
        const raceOptions = {
          trackId: options.trackId || "sunset-highway",
          speedClassId: options.speedClassId || "turbo",
          raceTypeId,
          seed: options.seed || "SUNSET-PALM-SPRINT-TURBO"
        };
        if (raceTypeId === "classic" && options.officialRouteId !== false) {
          raceOptions.officialRouteId = options.officialRouteId || "sunset-neon-palm-sprint";
        }
        app.startRace(raceOptions);
        app.run.debugFrozen = true;
        app.run.countdownTimer = 0;
        app.run.raceActive = true;
        app.run.ended = false;
        app.run.pendingEndStatus = "";
        app.run.pendingEndReason = "";
        app.run.hitPauseTimer = 0;
        app.run.distance = Number.isFinite(options.distance) ? options.distance : 90000;
        app.run.elapsed = 0;
        app.run.currentSpeed = Number.isFinite(options.currentSpeed) ? options.currentSpeed : 3400;
        app.run.renderLaneFloat = laneFloat;
        app.run.playerLaneFloat = laneFloat;
        app.run.targetLane = targetLane;
        app.run.laneChangeTargetLane = targetLane;
        if (options.partyMode) app.run.partyMode = true;
        app.obstacles.obstacles = [];
        app.obstacles.nextObstacleId = 1;
        app.screen = "game";
        return this.snapshot();
      },
      add(type, lane, ahead) {
        const safeLane = Math.max(0, Math.min(this.laneCount() - 1, Math.round(lane)));
        const obstacle = app.obstacles.createObstacle(type, safeLane, app.run.distance + ahead, { allowLaneAdjust: false });
        app.obstacles.obstacles.push(obstacle);
        return obstacle.id;
      },
      armFromFlow() {
        app.run.neonFlow = 92;
        app.addNeonFlow("nearMiss", { ignoreSuppression: true });
        return this.snapshot();
      },
      setFlow(value) {
        app.run.neonFlow = Math.max(0, Number(value) || 0);
        app.renderer.render();
        return this.snapshot();
      },
      paint() {
        app.renderer.render();
        return this.snapshot();
      },
	      tick(dt = 0.016) {
	        app.run.elapsed += dt;
	        app.updateFlowBreak(dt);
	        return this.snapshot();
	      },
	      activate(inputSource = "qa") {
	        const success = app.activateFlowBreak(inputSource);
	        return { success, snapshot: this.snapshot() };
	      },
	      advance(distanceDelta, dt = 0.016) {
        app.run.distance += distanceDelta;
        app.run.elapsed += dt;
        app.updateFlowBreak(dt);
        if (app.run.flowBreakSparkBoostPendingSpeedRead) {
          app.updateRun(dt);
        }
        return this.snapshot();
      },
      measureFlowBreakFrameCost() {
	        this.reset();
	        this.armFromFlow();
	        this.add("slowCar", this.centerLane(), 2200);
	        this.add("truck", Math.max(0, this.centerLane() - 1), 2450);
	        this.add("slowCar", this.centerLane(), 2850);
	        app.activateFlowBreak("qa-perf");
	        const samples = [];
        let triggerSnapshot = null;
        for (let frame = 0; frame < 90; frame += 1) {
          const started = performance.now();
          app.updateFlowBreak(1 / 60);
          app.renderer.render();
          samples.push(Number((performance.now() - started).toFixed(3)));
          if (!triggerSnapshot && app.run.flowBreaksTriggered > 0) triggerSnapshot = this.snapshot();
          if (app.run.flowBreaksTriggered > 0 && frame > 36) break;
        }
        const worstMs = Math.max(...samples);
        const averageMs = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length);
        return {
          worstMs: Number(worstMs.toFixed(3)),
          averageMs: Number(averageMs.toFixed(3)),
          sampleCount: samples.length,
          triggered: app.run.flowBreaksTriggered || 0,
          hazardsCleared: app.run.flowBreakHazardsCleared || 0,
          sparksCreated: app.run.flowBreakSparksCreated || 0,
          frameTelemetryWorstMs: Number((app.run.flowBreakFrameWorstMs || 0).toFixed(3)),
          frameTelemetrySamples: app.run.flowBreakFrameSamples || 0,
          triggerSnapshot
        };
      },
      runCollisionWithArmedHazard(type, lane) {
        const ahead = app.renderer.aheadForY(app.renderer.getPlayerScreenY());
        const obstacle = app.obstacles.createObstacle(type, lane, app.run.distance + ahead, { allowLaneAdjust: false });
        app.obstacles.obstacles.push(obstacle);
        const zoneBefore = app.getFlowBreakZone(app.run);
        const decisionBefore = app.getFlowBreakObstacleDecision(obstacle, app.run, zoneBefore);
        app.collision.update();
        return {
          id: obstacle.id,
          ahead,
          zoneBefore,
          decisionBefore,
          hit: Boolean(obstacle.hit),
          remove: Boolean(obstacle.remove),
          flowBreakCleared: Boolean(obstacle.flowBreakCleared),
          pendingEndStatus: app.run.pendingEndStatus,
          pendingEndReason: app.run.pendingEndReason,
          flowBreakCollisionPrevented: app.run.flowBreakCollisionPrevented || 0,
          flowBreakHazardsClearedAhead: app.run.flowBreakHazardsClearedAhead || 0,
          flowBreakHazardsClearedBehind: app.run.flowBreakHazardsClearedBehind || 0,
          flowBreakSparksSpawnedAhead: app.run.flowBreakSparksSpawnedAhead || 0,
          flowBreakSparksSpawnedBehind: app.run.flowBreakSparksSpawnedBehind || 0,
          collisionState: app.run.collisionState
        };
      },
      runCollisionDuringPhase(type, lane) {
        const activation = app.activateFlowBreak("qa-phase-collision");
        const ahead = app.renderer.aheadForY(app.renderer.getPlayerScreenY());
        const obstacle = app.obstacles.createObstacle(type, lane, app.run.distance + ahead, { allowLaneAdjust: false });
        app.obstacles.obstacles.push(obstacle);
        app.collision.update();
        return {
          activation,
          id: obstacle.id,
          ahead,
          hit: Boolean(obstacle.hit),
          remove: Boolean(obstacle.remove),
          flowBreakCleared: Boolean(obstacle.flowBreakCleared),
          flowBreakPhasedUseId: obstacle.flowBreakPhasedUseId || 0,
          activeTimer: Number((app.run.flowBreakActiveTimer || 0).toFixed(3)),
          pendingEndStatus: app.run.pendingEndStatus || "",
          pendingEndReason: app.run.pendingEndReason || "",
          flowBreakCollisionPrevented: app.run.flowBreakCollisionPrevented || 0,
          collisionsPhasedThrough: app.run.flowBreakCollisionsPhasedThrough || 0,
          slowdownsPrevented: app.run.flowBreakSlowdownsPrevented || 0,
          collisionState: app.run.collisionState || "",
          impactEvents: Array.isArray(app.run.flowBreakImpactEvents) ? app.run.flowBreakImpactEvents.map((event) => ({
            phaseActivation: Boolean(event.phaseActivation),
            collisionsPhasedThrough: event.collisionsPhasedThrough || 0,
            slowdownsPrevented: event.slowdownsPrevented || 0,
            likelyCollisionPrevented: Boolean(event.likelyCollisionPrevented)
          })) : []
        };
      },
      runCollisionAfterPhaseExpires(type, lane) {
        const activation = app.activateFlowBreak("qa-phase-expire");
        const ahead = app.renderer.aheadForY(app.renderer.getPlayerScreenY());
        const obstacle = app.obstacles.createObstacle(type, lane, app.run.distance + ahead, { allowLaneAdjust: false });
        app.obstacles.obstacles.push(obstacle);
        app.updateFlowBreak((app.run.flowBreakDuration || 0) + 0.05);
        app.collision.update();
        return {
          activation,
          id: obstacle.id,
          ahead,
          activeTimer: Number((app.run.flowBreakActiveTimer || 0).toFixed(3)),
          hit: Boolean(obstacle.hit),
          remove: Boolean(obstacle.remove),
          flowBreakCleared: Boolean(obstacle.flowBreakCleared),
          pendingEndStatus: app.run.pendingEndStatus || "",
          pendingEndReason: app.run.pendingEndReason || "",
          collisionsPhasedThrough: app.run.flowBreakCollisionsPhasedThrough || 0,
          slowdownsPrevented: app.run.flowBreakSlowdownsPrevented || 0,
          endedInDanger: app.run.flowBreakEndedInDanger || 0,
          collisionState: app.run.collisionState || ""
        };
      },
      snapshot() {
        const run = app.run;
        return {
          flowEnabled: app.isNeonFlowEnabledForRun(run),
          flow: run.neonFlow || 0,
	          armed: Boolean(run.flowBreakArmed),
	          armedCount: run.flowBreaksArmed || 0,
	          triggered: run.flowBreaksTriggered || 0,
	          manualAttempts: run.flowBreakManualActivationAttempts || 0,
	          manualSuccesses: run.flowBreakManualTriggerSuccesses || 0,
	          noTargetAttempts: run.flowBreakNoTargetAttempts || 0,
	          phaseActivations: run.flowBreakPhaseActivations || 0,
	          phaseDuration: Number((run.flowBreakPhaseDuration || 0).toFixed(3)),
	          collisionsPhasedThrough: run.flowBreakCollisionsPhasedThrough || 0,
	          slowdownsPrevented: run.flowBreakSlowdownsPrevented || 0,
	          endedInDanger: run.flowBreakEndedInDanger || 0,
	          noTargetTimer: Number((run.flowBreakNoTargetTimer || 0).toFixed(3)),
	          activeTimer: Number((run.flowBreakActiveTimer || 0).toFixed(3)),
          centerLaneFloat: run.flowBreakCenterLaneFloat,
          reach: Math.round(run.flowBreakReach || 0),
          forwardReach: Math.round(run.flowBreakForwardReach || 0),
          frontBuffer: Math.round(run.flowBreakFrontBuffer || 0),
          playerForwardAhead: Math.round(run.flowBreakPlayerForwardAhead || app.getFlowBreakPlayerForwardAhead(run) || 0),
          startAhead: Math.round(run.flowBreakStartAhead || 0),
          lateralRadius: Number((run.flowBreakLateralRadiusLanes || 0).toFixed(2)),
          nearestHazardDistance: run.flowBreakNearestHazardDistance ?? null,
          hazardsCleared: run.flowBreakHazardsCleared || 0,
          hazardsClearedAhead: run.flowBreakHazardsClearedAhead || 0,
          hazardsClearedBehind: run.flowBreakHazardsClearedBehind || 0,
          hazardsConsidered: run.flowBreakHazardsConsidered || 0,
          skippedOutOfZone: run.flowBreakHazardsSkippedOutOfZone || 0,
          skippedNotClearable: run.flowBreakHazardsSkippedNotClearable || 0,
          visibleHazardsAtTrigger: run.flowBreakVisibleHazardsAtTrigger || 0,
          zeroEffectTriggers: run.flowBreakTriggeredWithZeroEffect || 0,
          noForwardHazardTriggers: run.flowBreakTriggeredWithNoForwardHazard || 0,
          triggerHazardType: run.flowBreakTriggerHazardType || "",
          triggeredByMajorHazard: Boolean(run.flowBreakTriggeredByMajorHazard),
          minorHazardsCleared: run.flowBreakMinorHazardsCleared || 0,
          majorHazardsCleared: run.flowBreakMajorHazardsCleared || 0,
          ignoredMinorHazardCount: run.flowBreakIgnoredMinorHazardCount || 0,
          sparksCreated: run.flowBreakSparksCreated || 0,
          sparksSpawnedAhead: run.flowBreakSparksSpawnedAhead || 0,
          sparksSpawnedBehind: run.flowBreakSparksSpawnedBehind || 0,
          sparksCollected: run.flowBreakSparksCollected || 0,
          sparkCollectableCount: run.flowBreakSparkCollectableCount || 0,
          sparkPickupCount: run.flowBreakSparkPickupCount || 0,
          sparkSpeedBefore: run.flowBreakSparkSpeedBefore ?? null,
          sparkSpeedAfter: run.flowBreakSparkSpeedAfter ?? null,
          sparkDisplaySpeedBefore: run.flowBreakSparkDisplaySpeedBefore ?? null,
          sparkDisplaySpeedAfter: run.flowBreakSparkDisplaySpeedAfter ?? null,
          sparkBoostMultiplier: run.flowBreakSparkBoostMultiplier || 0,
          sparkBoostDuration: run.flowBreakSparkBoostDuration || 0,
          sparkNormalBoostActive: Boolean(run.flowBreakSparkNormalBoostActive),
          sparkStackedWithBoost: Boolean(run.flowBreakSparkStackedWithBoost),
          sparkBoostTimer: Number((run.flowBreakSparkBoostTimer || 0).toFixed(3)),
          sparkPickupTimer: Number((run.flowBreakSparkPickupTimer || 0).toFixed(3)),
          collisionPrevented: run.flowBreakCollisionPrevented || 0,
          impactEventCount: Array.isArray(run.flowBreakImpactEvents) ? run.flowBreakImpactEvents.length : 0,
          likelyCollisionPrevented: run.flowBreakLikelyCollisionPrevented || 0,
          triggersDuringFinalPush: run.flowBreakTriggersDuringFinalPush || 0,
          crashesWithin5s: run.flowBreakCrashesWithin5s || 0,
          pressureBeforeAverage: run.flowBreakPressureBeforeAverage || 0,
          pressureAfterAverage: run.flowBreakPressureAfterAverage || 0,
          pressureDropAverage: run.flowBreakPressureDropAverage || 0,
          hazardsClearedPerTriggerAverage: run.flowBreakHazardsClearedPerTriggerAverage || 0,
          majorHazardsClearedPerTriggerAverage: run.flowBreakMajorHazardsClearedPerTriggerAverage || 0,
          flowBreakFrameWorstMs: Number((run.flowBreakFrameWorstMs || 0).toFixed(3)),
          flowBreakFrameSamples: run.flowBreakFrameSamples || 0,
          impactEvents: Array.isArray(run.flowBreakImpactEvents) ? run.flowBreakImpactEvents.map((event) => ({
            id: event.id || "",
            useId: event.useId || 0,
            progressPercent: event.progressPercent ?? null,
            sectionId: event.sectionId || "",
            speedClassId: event.speedClassId || "",
            raceTypeId: event.raceTypeId || "",
            triggerHazardType: event.triggerHazardType || "",
            hazardsCleared: event.hazardsCleared || 0,
            majorHazardsCleared: event.majorHazardsCleared || 0,
            minorHazardsCleared: event.minorHazardsCleared || 0,
            phaseActivation: Boolean(event.phaseActivation),
            phaseDuration: event.phaseDuration || 0,
            collisionsPhasedThrough: event.collisionsPhasedThrough || 0,
            slowdownsPrevented: event.slowdownsPrevented || 0,
            endedInDanger: Boolean(event.endedInDanger),
            likelyCollisionPrevented: Boolean(event.likelyCollisionPrevented),
            usedDuringFinalPush: Boolean(event.usedDuringFinalPush),
	            pressureBefore: event.pressureBefore ?? null,
	            pressureAfter: event.pressureAfter ?? null,
	            pressureDelta: event.pressureDelta ?? null,
	            manualActivation: Boolean(event.manualActivation),
	            inputSource: event.inputSource || "",
	            runFinished: Boolean(event.runFinished),
            playerCrashedWithin5s: Boolean(event.playerCrashedWithin5s)
          })) : [],
          pendingEndStatus: run.pendingEndStatus || "",
          callout: run.raceStateCalloutText || "",
          obstacles: app.obstacles.obstacles.map((obstacle) => ({
            id: obstacle.id,
            type: obstacle.type,
            lane: obstacle.lane,
            ahead: Math.round(obstacle.distance - run.distance),
            hit: Boolean(obstacle.hit),
            remove: Boolean(obstacle.remove),
            flowBreakCleared: Boolean(obstacle.flowBreakCleared)
          })),
          sparks: Array.isArray(run.flowBreakSparks) ? run.flowBreakSparks.map((spark) => ({
            id: spark.id,
            laneFloat: spark.laneFloat,
            ahead: Math.round(spark.distance - run.distance),
            collected: Boolean(spark.collected)
          })) : []
        };
      }
    };
  });
}

function findObstacle(snapshot, id) {
  return snapshot.obstacles.find((obstacle) => obstacle.id === id);
}

async function runRealRouteSample(page, outDir) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    localStorage.clear();
    app.profiles.data.players = [];
    app.profiles.data.currentPlayerId = null;
    const driver = app.profiles.createPlayer("Flow Route QA");
    app.profiles.selectPlayer(driver.id);
    app.startRace({
      trackId: "sunset-highway",
      speedClassId: "turbo",
      raceTypeId: "classic",
      seed: "SUNSET-PALM-SPRINT-TURBO",
      officialRouteId: "sunset-neon-palm-sprint"
    });
    app.run.debugFrozen = true;
    app.run.countdownTimer = 0;
    app.run.raceActive = true;
    const centerLane = typeof TRACK_DIRECTOR === "object" && Number.isFinite(TRACK_DIRECTOR.centerLane)
      ? TRACK_DIRECTOR.centerLane
      : 3;
    app.run.renderLaneFloat = centerLane;
    app.run.playerLaneFloat = centerLane;
    app.run.targetLane = centerLane;
    app.run.neonFlow = 92;
    app.addNeonFlow("nearMiss", { ignoreSuppression: true });
    app.renderer.render();
  });

  const readyShot = path.join(outDir, "real-route-flow-ready.png");
  await page.screenshot({ path: readyShot });
  const screenshots = [readyShot];
  let triggerShot = "";
  let finalSnapshot = null;

  for (let frame = 0; frame < 180; frame += 1) {
    const snapshot = await page.evaluate((frameIndex) => {
      const app = window.neonRoadRally;
      const run = app.run;
	      if (run.flowBreakArmed && (run.flowBreaksTriggered || 0) === 0) app.activateFlowBreak("qa-real-route");
	      app.updateRun(1 / 60);
      app.renderer.render();
      return {
        frame: frameIndex,
        ended: Boolean(run.ended),
        pendingEndStatus: run.pendingEndStatus || "",
        triggered: run.flowBreaksTriggered || 0,
        phaseActivations: run.flowBreakPhaseActivations || 0,
        phaseDuration: run.flowBreakPhaseDuration || 0,
        collisionsPhasedThrough: run.flowBreakCollisionsPhasedThrough || 0,
        slowdownsPrevented: run.flowBreakSlowdownsPrevented || 0,
        armed: Boolean(run.flowBreakArmed),
        hazardsCleared: run.flowBreakHazardsCleared || 0,
        hazardsClearedAhead: run.flowBreakHazardsClearedAhead || 0,
        hazardsClearedBehind: run.flowBreakHazardsClearedBehind || 0,
        visibleHazardsAtTrigger: run.flowBreakVisibleHazardsAtTrigger || 0,
        zeroEffectTriggers: run.flowBreakTriggeredWithZeroEffect || 0,
        noForwardHazardTriggers: run.flowBreakTriggeredWithNoForwardHazard || 0,
        triggerHazardType: run.flowBreakTriggerHazardType || "",
        triggeredByMajorHazard: Boolean(run.flowBreakTriggeredByMajorHazard),
        minorHazardsCleared: run.flowBreakMinorHazardsCleared || 0,
        majorHazardsCleared: run.flowBreakMajorHazardsCleared || 0,
        ignoredMinorHazardCount: run.flowBreakIgnoredMinorHazardCount || 0,
        sparksCreated: run.flowBreakSparksCreated || 0,
        sparksSpawnedAhead: run.flowBreakSparksSpawnedAhead || 0,
        sparksSpawnedBehind: run.flowBreakSparksSpawnedBehind || 0,
        sparksCollected: run.flowBreakSparksCollected || 0,
        sparkCollectableCount: run.flowBreakSparkCollectableCount || 0,
        sparkPickupCount: run.flowBreakSparkPickupCount || 0,
        sparkSpeedBefore: run.flowBreakSparkSpeedBefore ?? null,
        sparkSpeedAfter: run.flowBreakSparkSpeedAfter ?? null,
        sparkDisplaySpeedBefore: run.flowBreakSparkDisplaySpeedBefore ?? null,
        sparkDisplaySpeedAfter: run.flowBreakSparkDisplaySpeedAfter ?? null,
        sparkBoostMultiplier: run.flowBreakSparkBoostMultiplier || 0,
        sparkBoostDuration: run.flowBreakSparkBoostDuration || 0,
        sparkNormalBoostActive: Boolean(run.flowBreakSparkNormalBoostActive),
        sparkStackedWithBoost: Boolean(run.flowBreakSparkStackedWithBoost),
        collisionPrevented: run.flowBreakCollisionPrevented || 0,
        flowBreakFrameWorstMs: Number((run.flowBreakFrameWorstMs || 0).toFixed(3)),
        flowBreakFrameSamples: run.flowBreakFrameSamples || 0,
        forwardReach: Math.round(run.flowBreakForwardReach || 0),
        frontBuffer: Math.round(run.flowBreakFrontBuffer || 0),
        playerForwardAhead: Math.round(run.flowBreakPlayerForwardAhead || app.getFlowBreakPlayerForwardAhead(run) || 0),
        startAhead: Math.round(run.flowBreakStartAhead || 0),
        activeTimer: Number((run.flowBreakActiveTimer || 0).toFixed(3)),
        sparkBoostTimer: Number((run.flowBreakSparkBoostTimer || 0).toFixed(3)),
        distance: Math.round(run.distance || 0),
        lane: Number((run.renderLaneFloat || 0).toFixed(2)),
        visibleObstacles: app.obstacles.obstacles
          .filter((obstacle) => !obstacle.hit && !obstacle.remove && obstacle.distance - run.distance > -200 && obstacle.distance - run.distance < 3600)
          .map((obstacle) => ({
            type: obstacle.type,
            lane: obstacle.lane,
            ahead: Math.round(obstacle.distance - run.distance)
          }))
          .slice(0, 8),
        sparks: Array.isArray(run.flowBreakSparks) ? run.flowBreakSparks.map((spark) => ({
          laneFloat: spark.laneFloat,
          ahead: Math.round(spark.distance - run.distance),
          collected: Boolean(spark.collected)
        })) : []
      };
    }, frame);
    finalSnapshot = snapshot;
    if (snapshot.triggered > 0 && !triggerShot) {
      triggerShot = path.join(outDir, "real-route-flow-break-triggered.png");
      await page.screenshot({ path: triggerShot });
      screenshots.push(triggerShot);
    }
    if (snapshot.triggered > 0 && frame > 90) {
      break;
    }
    if (snapshot.ended) break;
  }

  return {
    ...(finalSnapshot || {}),
    screenshots
  };
}

async function runLiveFlowBreakFrameSample(page) {
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    app.startRace({
      trackId: "sunset-highway",
      speedClassId: "turbo",
      raceTypeId: "classic",
      seed: "SUNSET-PALM-SPRINT-TURBO",
      officialRouteId: "sunset-neon-palm-sprint"
    });
    if (!window.__flowBreakQaOriginalCollisionUpdate) {
      window.__flowBreakQaOriginalCollisionUpdate = app.collision.update.bind(app.collision);
    }
    app.collision.update = () => {};
    app.run.debugFrozen = false;
    app.run.countdownTimer = 0;
    app.run.raceActive = true;
    app.run.distance = 90000;
    app.run.elapsed = 0;
    app.run.currentSpeed = 3400;
    const centerLane = typeof TRACK_DIRECTOR === "object" && Number.isFinite(TRACK_DIRECTOR.centerLane)
      ? TRACK_DIRECTOR.centerLane
      : 3;
    app.run.renderLaneFloat = centerLane;
    app.run.playerLaneFloat = centerLane;
    app.run.targetLane = centerLane;
    app.run.laneChangeTargetLane = centerLane;
    app.run.neonFlow = 0;
    app.run.frameSampleCount = 0;
    app.run.frameTimeSumMs = 0;
    app.run.frameTimeMaxMs = 0;
    app.run.frameTimeSlowCount = 0;
    app.run.frameTimeRecentSamples = [];
    app.run.averageFrameMs = 0;
    app.run.averageFps = 0;
    app.run.slowFramePercent = 0;
    app.run.flowBreakFrameWorstMs = 0;
    app.run.flowBreakFrameSamples = 0;
    app.obstacles.obstacles = [];
    app.obstacles.nextObstacleId = 1;
    app.lastFrame = performance.now();
    app.renderer.render();
  });
  await page.waitForFunction(() => {
    const run = window.neonRoadRally?.run;
    return Boolean(run && run.frameSampleCount >= 5);
  }, null, { timeout: 4000 });
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    app.run.frameSampleCount = 0;
    app.run.frameTimeSumMs = 0;
    app.run.frameTimeMaxMs = 0;
    app.run.frameTimeSlowCount = 0;
    app.run.frameTimeRecentSamples = [];
    app.run.averageFrameMs = 0;
    app.run.averageFps = 0;
    app.run.slowFramePercent = 0;
    app.run.flowBreakFrameWorstMs = 0;
    app.run.flowBreakFrameSamples = 0;
    app.run.neonFlow = 92;
    app.obstacles.obstacles = [];
    app.obstacles.nextObstacleId = 1;
    const centerLane = typeof TRACK_DIRECTOR === "object" && Number.isFinite(TRACK_DIRECTOR.centerLane)
      ? TRACK_DIRECTOR.centerLane
      : 3;
	    app.obstacles.obstacles.push(app.obstacles.createObstacle("slowCar", centerLane, app.run.distance + 2200, { allowLaneAdjust: false }));
	    app.obstacles.obstacles.push(app.obstacles.createObstacle("truck", Math.max(0, centerLane - 1), app.run.distance + 2450, { allowLaneAdjust: false }));
	    app.lastFrame = performance.now();
	    app.addNeonFlow("nearMiss", { ignoreSuppression: true });
	    app.activateFlowBreak("qa-live-frame");
	  });
  await page.waitForFunction(() => {
    const run = window.neonRoadRally?.run;
    return Boolean(run && run.flowBreaksTriggered >= 1 && run.flowBreakFrameSamples >= 12);
  }, null, { timeout: 8000 });
  return page.evaluate(() => {
    const run = window.neonRoadRally.run;
    if (window.__flowBreakQaOriginalCollisionUpdate) {
      window.neonRoadRally.collision.update = window.__flowBreakQaOriginalCollisionUpdate;
    }
    return {
      triggered: run.flowBreaksTriggered || 0,
      hazardsCleared: run.flowBreakHazardsCleared || 0,
      triggerHazardType: run.flowBreakTriggerHazardType || "",
      triggeredByMajorHazard: Boolean(run.flowBreakTriggeredByMajorHazard),
      minorHazardsCleared: run.flowBreakMinorHazardsCleared || 0,
      majorHazardsCleared: run.flowBreakMajorHazardsCleared || 0,
      sparksCreated: run.flowBreakSparksCreated || 0,
      sparksCollected: run.flowBreakSparksCollected || 0,
      flowBreakFrameWorstMs: Number((run.flowBreakFrameWorstMs || 0).toFixed(2)),
      flowBreakFrameSamples: run.flowBreakFrameSamples || 0,
      averageFps: Number((run.averageFps || 0).toFixed(1)),
      worstFrameMs: Number((run.frameTimeMaxMs || 0).toFixed(2)),
      slowFramePercent: Number((run.slowFramePercent || 0).toFixed(2)),
      consoleState: run.collisionState || ""
    };
  });
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: BRAVE_PATH,
    args: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=CalculateNativeWinOcclusion"
    ]
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleIssues = [];
  page.on("console", (msg) => {
    if (["warning", "error"].includes(msg.type())) consoleIssues.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await setupHarness(page);

    await page.evaluate(() => window.__flowBreakQa.reset());
    const charging = await page.evaluate(() => window.__flowBreakQa.setFlow(48));
    assert.strictEqual(charging.armed, false, "Flow should not be armed while charging");
    assert.strictEqual(charging.flow, 48, "Flow meter should show charging progress");
    const chargingShot = path.join(OUT_DIR, "flow-meter-charging-hud.png");
    await page.screenshot({ path: chargingShot });

    const armed = await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    assert.strictEqual(armed.flow, 0, "Flow should reset after arming");
    assert.strictEqual(armed.armed, true, "Flow Break should arm at 100 Flow");
    assert.strictEqual(armed.armedCount, 1, "Flow Break armed count should increment");
	    const emptyRoad = await page.evaluate(() => window.__flowBreakQa.tick());
	    assert.strictEqual(emptyRoad.armed, true, "Flow Break should stay armed on empty road");
	    assert.strictEqual(emptyRoad.triggered, 0, "Flow Break should not trigger on empty road");
	    const armedShot = path.join(OUT_DIR, "flow-ready-hud.png");
	    await page.screenshot({ path: armedShot });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => window.__flowBreakQa.paint());
    const armed720Shot = path.join(OUT_DIR, "flow-ready-hud-1280x720.png");
    await page.screenshot({ path: armed720Shot });
	    await page.setViewportSize({ width: 1440, height: 900 });
	    await page.evaluate(() => window.__flowBreakQa.paint());

	    const emptyManual = await page.evaluate(() => window.__flowBreakQa.activate("qa-targetless"));
	    assert.strictEqual(emptyManual.success, true, "Manual Flow Break should activate even with no target");
	    assert.strictEqual(emptyManual.snapshot.armed, false, "Targetless Flow Break should consume the charge");
	    assert.strictEqual(emptyManual.snapshot.triggered, 1, "Targetless Flow Break should count as one spent charge");
	    assert.strictEqual(emptyManual.snapshot.phaseActivations, 1, "Targetless Flow Break should start phase mode");
	    assert(emptyManual.snapshot.activeTimer > 2, "Flow Break phase should last roughly two seconds");
	    assert.strictEqual(emptyManual.snapshot.noTargetAttempts, 0, "Flow Break should not record no-target attempts anymore");
	    assert.strictEqual(emptyManual.snapshot.hazardsCleared, 0, "Targetless Flow Break should not clear hazards");

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());

    const slowId = await page.evaluate(() => window.__flowBreakQa.add("slowCar", window.__flowBreakQa.centerLane(), 2200));
    const truckClusterId = await page.evaluate(() => window.__flowBreakQa.add("truck", Math.max(0, window.__flowBreakQa.centerLane() - 1), 2450));
    const coneClusterId = await page.evaluate(() => window.__flowBreakQa.add("cone", window.__flowBreakQa.centerLane(), 2260));
    const branchClusterId = await page.evaluate(() => window.__flowBreakQa.add("branch", Math.max(0, window.__flowBreakQa.centerLane() - 1), 2380));
    const farLaneId = await page.evaluate(() => window.__flowBreakQa.add("slowCar", window.__flowBreakQa.laneCount() - 1, 2300));
    const boostId = await page.evaluate(() => window.__flowBreakQa.add("boostPad", window.__flowBreakQa.centerLane(), 2050));
    const rampId = await page.evaluate(() => window.__flowBreakQa.add("ramp", window.__flowBreakQa.centerLane(), 2150));
    const gasId = await page.evaluate(() => window.__flowBreakQa.add("gasCan", window.__flowBreakQa.centerLane(), 2250));
    const warningId = await page.evaluate(() => window.__flowBreakQa.add("warning", window.__flowBreakQa.centerLane(), 1950));
    await page.evaluate(() => window.__flowBreakQa.paint());
    const preTriggerShot = path.join(OUT_DIR, "pre-trigger-danger-visible.png");
    await page.screenshot({ path: preTriggerShot });
	    const armedWithDanger = await page.evaluate(() => window.__flowBreakQa.tick());
	    assert.strictEqual(armedWithDanger.armed, true, "Armed Flow Break should not auto-fire when danger enters range");
	    assert.strictEqual(armedWithDanger.triggered, 0, "Danger in range should wait for manual Flow Break input");
	    assert(!findObstacle(armedWithDanger, slowId).flowBreakCleared, "Flow Break should not clear hazards before input");
	    const triggered = await page.evaluate(() => {
	      const app = window.neonRoadRally;
	      app.run.debugFrozen = false;
	      window.dispatchEvent(new KeyboardEvent("keydown", {
	        key: "e",
	        code: "KeyE",
	        bubbles: true,
	        cancelable: true
	      }));
	      window.dispatchEvent(new KeyboardEvent("keyup", {
	        key: "e",
	        code: "KeyE",
	        bubbles: true,
	        cancelable: true
	      }));
	      app.run.debugFrozen = true;
	      return window.__flowBreakQa.snapshot();
	    });
	    if (triggered.armed !== false || triggered.triggered !== 1) {
	      console.log("FLOW_BREAK_TRIGGER_SNAPSHOT", JSON.stringify(triggered, null, 2));
	    }
	    assert.strictEqual(triggered.armed, false, "Flow Break should disarm after triggering");
	    assert.strictEqual(triggered.triggered, 1, "Flow Break trigger count should increment");
	    assert.strictEqual(triggered.manualAttempts, 1, "Keyboard Flow Break should count as one manual attempt");
	    assert.strictEqual(triggered.manualSuccesses, 1, "Keyboard Flow Break should count as one manual success");
	    assert.strictEqual(triggered.noTargetAttempts, 0, "Successful keyboard Flow Break should not count as no-target");
    assert.strictEqual(triggered.phaseActivations, 1, "Keyboard Flow Break should start a phase activation");
    assert(triggered.phaseDuration >= 2.2, "Keyboard Flow Break should record the phase duration");
    assert(!findObstacle(triggered, slowId).flowBreakCleared, "Same-lane slow car should stay on road after Flow Break activation");
    assert(!findObstacle(triggered, truckClusterId).flowBreakCleared, "Nearby truck should stay on road after Flow Break activation");
    assert(!findObstacle(triggered, coneClusterId).flowBreakCleared, "Minor hazard should stay on road after Flow Break activation");
    assert(!findObstacle(triggered, branchClusterId).flowBreakCleared, "Branch should stay on road after Flow Break activation");
    assert(!findObstacle(triggered, farLaneId).flowBreakCleared, "Far-lane hazard outside radius should not clear");
    assert(!findObstacle(triggered, boostId).flowBreakCleared, "Boost pad should not clear");
    assert(!findObstacle(triggered, rampId).flowBreakCleared, "Ramp should not clear");
    assert(!findObstacle(triggered, gasId).flowBreakCleared, "Gas can should not clear");
    assert(!findObstacle(triggered, warningId).flowBreakCleared, "Warning should not clear");
    assert.strictEqual(triggered.hazardsCleared, 0, "Flow Break phase should not clear hazards");
    assert.strictEqual(triggered.hazardsClearedAhead, 0, "Flow Break phase should not classify cleared hazards");
    assert.strictEqual(triggered.hazardsClearedBehind, 0, "Normal Flow Break should not clear behind-player hazards");
    assert(triggered.visibleHazardsAtTrigger >= 1, "Flow Break should still record visible hazards at activation");
    assert.strictEqual(triggered.zeroEffectTriggers, 0, "Flow Break should not trigger with zero effect");
    assert.strictEqual(triggered.noForwardHazardTriggers, 0, "Flow Break should not trigger without a forward hazard");
    assert(["slowCar", "truck", "fastCar", "barrier"].includes(triggered.triggerHazardType), "Flow Break trigger should record a major hazard type");
    assert.strictEqual(triggered.triggeredByMajorHazard, true, "Flow Break activation should note a nearby major hazard when present");
    assert.strictEqual(triggered.majorHazardsCleared, 0, "Major hazards should not be cleared by phase activation");
    assert.strictEqual(triggered.minorHazardsCleared, 0, "Minor hazards should not be cleared by phase activation");
    assert.strictEqual(triggered.sparksCreated, 0, "Flow Break phase should not create boost sparks from deleted hazards");
    assert.strictEqual(triggered.sparksSpawnedAhead, 0, "Flow Break phase should not spawn forward sparks");
    assert.strictEqual(triggered.sparksSpawnedBehind, 0, "Flow Break should not spawn sparks behind the player");
    assert.strictEqual(triggered.sparks.length, 0, "Flow Break phase should not leave spark pickups");
    assert.strictEqual(triggered.impactEventCount, 1, "Flow Break impact telemetry should record one trigger event");
    assert.strictEqual(triggered.impactEvents.length, 1, "Flow Break impact event should be exposed in diagnostics");
    const impact = triggered.impactEvents[0];
    assert.strictEqual(impact.speedClassId, "turbo", "Flow Break impact should record speed class");
    assert.strictEqual(impact.raceTypeId, "classic", "Flow Break impact should record race type");
    assert(impact.sectionId, "Flow Break impact should record route section");
    assert(impact.progressPercent !== null && impact.progressPercent >= 0, "Flow Break impact should record route progress");
    assert.strictEqual(impact.triggerHazardType, triggered.triggerHazardType, "Flow Break impact should record trigger hazard type");
    assert.strictEqual(impact.phaseActivation, true, "Flow Break impact should mark phase activation");
    assert(impact.phaseDuration >= 2.2, "Flow Break impact should record phase duration");
    assert.strictEqual(impact.hazardsCleared, 0, "Flow Break impact should record zero hazards cleared");
    assert.strictEqual(impact.majorHazardsCleared, 0, "Flow Break impact should record zero major hazards cleared");
    assert.strictEqual(impact.minorHazardsCleared, 0, "Flow Break impact should record zero minor hazards cleared");
	    assert(impact.pressureBefore !== null, "Flow Break impact should record pressure before trigger");
	    assert(impact.pressureAfter !== null, "Flow Break impact should record pressure after trigger");
	    assert.strictEqual(impact.pressureBefore, impact.pressureAfter, "Flow Break phase should not reduce pressure by deleting hazards");
	    assert.strictEqual(impact.manualActivation, true, "Flow Break impact should mark manual activation");
	    assert.strictEqual(impact.inputSource, "keyboard", "Keyboard Flow Break should record input source");
	    assert.strictEqual(triggered.hazardsClearedPerTriggerAverage, 0, "Flow Break phase should expose zero average hazards cleared");
    assert.strictEqual(triggered.majorHazardsClearedPerTriggerAverage, 0, "Flow Break phase should expose zero average major hazards cleared");
    const breakShot = path.join(OUT_DIR, "flow-break-burst-frame.png");
    await page.screenshot({ path: breakShot });

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    const phaseCollision = await page.evaluate(() => window.__flowBreakQa.runCollisionDuringPhase("slowCar", window.__flowBreakQa.centerLane()));
    assert.strictEqual(phaseCollision.activation, true, "Flow Break should activate before a collision-zone hazard");
    assert.strictEqual(phaseCollision.pendingEndStatus, "", "Flow Break phase should prevent crash while active");
    assert.strictEqual(phaseCollision.hit, false, "Phased-through car should not be marked hit");
    assert.strictEqual(phaseCollision.remove, false, "Phased-through car should remain on the road");
    assert.strictEqual(phaseCollision.flowBreakCleared, false, "Phased-through car should not be cleared");
    assert.strictEqual(phaseCollision.collisionsPhasedThrough, 1, "Flow Break should count phased-through traffic");
    assert.strictEqual(phaseCollision.flowBreakCollisionPrevented, 1, "Legacy collision-prevented telemetry should stay compatible");
    assert(phaseCollision.impactEvents[0]?.collisionsPhasedThrough >= 1, "Impact telemetry should count phased-through collisions");
    assert.strictEqual(phaseCollision.impactEvents[0]?.likelyCollisionPrevented, true, "Impact telemetry should mark phased collision as a likely save");

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    const phaseSlowdown = await page.evaluate(() => window.__flowBreakQa.runCollisionDuringPhase("oil", window.__flowBreakQa.centerLane()));
    assert.strictEqual(phaseSlowdown.pendingEndStatus, "", "Flow Break phase should not end the run on minor hazards");
    assert.strictEqual(phaseSlowdown.hit, false, "Phased-through oil should not be marked hit");
    assert.strictEqual(phaseSlowdown.remove, false, "Phased-through oil should remain on the road");
    assert.strictEqual(phaseSlowdown.slowdownsPrevented, 1, "Flow Break should count prevented slowdown hazards");
    assert(phaseSlowdown.impactEvents[0]?.slowdownsPrevented >= 1, "Impact telemetry should count prevented slowdowns");

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    const expiredCollision = await page.evaluate(() => window.__flowBreakQa.runCollisionAfterPhaseExpires("slowCar", window.__flowBreakQa.centerLane()));
    assert.strictEqual(expiredCollision.activeTimer, 0, "Flow Break phase should expire");
    assert(expiredCollision.pendingEndStatus, "Collision should resolve normally after Flow Break expires");
    assert.strictEqual(expiredCollision.flowBreakCleared, false, "Expired Flow Break should not clear the collision hazard");
    assert.strictEqual(expiredCollision.endedInDanger, 1, "Ending phase on a hazard should be recorded");

    const frameCost = await page.evaluate(() => window.__flowBreakQa.measureFlowBreakFrameCost());
    assert.strictEqual(frameCost.triggered, 1, "Performance sample should trigger Flow Break once");
    assert.strictEqual(frameCost.hazardsCleared, 0, "Performance sample should not clear hazards");
    assert.strictEqual(frameCost.sparksCreated, 0, "Performance sample should not create sparks from cleared hazards");
    assert(frameCost.worstMs < 50, `Focused Flow Break update/render should stay below major-spike budget, saw ${frameCost.worstMs}ms`);
    const liveFrameSample = await runLiveFlowBreakFrameSample(page);
    assert(liveFrameSample.triggered >= 1, "Live frame sample should trigger Flow Break");
    assert.strictEqual(liveFrameSample.hazardsCleared, 0, "Live frame sample should not clear hazards");
    assert.strictEqual(liveFrameSample.triggeredByMajorHazard, true, "Live frame sample should record nearby major hazard context");
    if (!(liveFrameSample.flowBreakFrameWorstMs < 120)) {
      console.log("FLOW_BREAK_LIVE_FRAME_SAMPLE", JSON.stringify(liveFrameSample, null, 2));
    }
    assert(liveFrameSample.flowBreakFrameWorstMs < 120, `Live Flow Break frame window should avoid 150-250ms spikes, saw ${liveFrameSample.flowBreakFrameWorstMs}ms`);

	    await page.evaluate(() => window.__flowBreakQa.reset());
	    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
	    const truckId = await page.evaluate(() => window.__flowBreakQa.add("truck", window.__flowBreakQa.centerLane(), 2600));
	    const truck = (await page.evaluate(() => window.__flowBreakQa.activate("qa-truck"))).snapshot;
	    assert(!findObstacle(truck, truckId).flowBreakCleared, "Truck should remain on road during Flow Break phase");
    assert.strictEqual(truck.triggerHazardType, "truck", "Truck should be recorded as the trigger hazard");
    assert.strictEqual(truck.triggeredByMajorHazard, true, "Truck trigger should be marked as major hazard");

	    await page.evaluate(() => window.__flowBreakQa.reset());
	    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
	    const barrierId = await page.evaluate(() => window.__flowBreakQa.add("barrier", window.__flowBreakQa.centerLane(), 2200));
	    const barrier = (await page.evaluate(() => window.__flowBreakQa.activate("qa-barrier"))).snapshot;
	    assert(!findObstacle(barrier, barrierId).flowBreakCleared, "Barrier should stay on road during Flow Break phase");
    assert.strictEqual(barrier.triggerHazardType, "barrier", "Barrier should be recorded as the trigger hazard");

    const laneTriggerSweep = await page.evaluate(() => {
      const lanes = [0, window.__flowBreakQa.centerLane(), window.__flowBreakQa.laneCount() - 1];
      return lanes.map((lane) => {
	        window.__flowBreakQa.reset({ laneFloat: lane, targetLane: lane });
	        window.__flowBreakQa.armFromFlow();
	        const hazardId = window.__flowBreakQa.add("slowCar", lane, 2200);
	        const snapshot = window.__flowBreakQa.activate("qa-lane-sweep").snapshot;
	        return { lane, hazardId, snapshot };
      });
    });
    for (const sample of laneTriggerSweep) {
      assert.strictEqual(sample.snapshot.triggered, 1, `Flow Break should trigger on lane ${sample.lane}`);
      assert(!findObstacle(sample.snapshot, sample.hazardId).flowBreakCleared, `Flow Break should not clear same-lane danger on lane ${sample.lane}`);
      assert.strictEqual(sample.snapshot.sparks.length, 0, `Flow Break phase should not create sparks for lane ${sample.lane}`);
    }

	    await page.evaluate(() => window.__flowBreakQa.reset());
	    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
	    const collision = await page.evaluate(() => window.__flowBreakQa.runCollisionWithArmedHazard("slowCar", window.__flowBreakQa.centerLane()));
	    if (!collision.pendingEndStatus || collision.flowBreakCleared) {
	      console.log("FLOW_BREAK_COLLISION_SNAPSHOT", JSON.stringify(collision, null, 2));
	    }
	    assert(!collision.flowBreakCleared, "Armed Flow Break should not auto-fire as a collision fail-safe");
	    assert(collision.pendingEndStatus, "Collision-zone hazard should crash if the player did not manually spend Flow Break");
	    assert.strictEqual(collision.flowBreakCollisionPrevented, 0, "Manual Flow Break should not record an automatic collision prevention");

    const fuel = await page.evaluate(() => {
      window.__flowBreakQa.reset({ raceTypeId: "fuelRun" });
      window.__flowBreakQa.armFromFlow();
      return window.__flowBreakQa.snapshot();
    });
    assert.strictEqual(fuel.flowEnabled, false, "Fuel Run should not enable Flow Break");
    assert.strictEqual(fuel.armed, false, "Fuel Run should not arm Flow Break");

    const partyClassicArmed = await page.evaluate(() => {
      window.__flowBreakQa.reset({ partyMode: true });
      window.__flowBreakQa.armFromFlow();
      return window.__flowBreakQa.snapshot();
    });
    assert.strictEqual(partyClassicArmed.flowEnabled, true, "Party Classic should enable Flow Break");
    assert.strictEqual(partyClassicArmed.armed, true, "Party Classic should arm Flow Break from earned Flow");

    const partyClassicConeOnly = await page.evaluate(() => {
	      window.__flowBreakQa.reset({ partyMode: true });
	      window.__flowBreakQa.armFromFlow();
	      const coneId = window.__flowBreakQa.add("cone", window.__flowBreakQa.centerLane(), 2200);
	      const snapshot = window.__flowBreakQa.activate("qa-party-cone-only").snapshot;
	      return { coneId, snapshot };
    });
    assert.strictEqual(partyClassicConeOnly.snapshot.triggered, 1, "Party Classic Flow Break should activate from manual input even with minor-only danger");
    assert.strictEqual(partyClassicConeOnly.snapshot.armed, false, "Party Classic manual Flow Break should spend its charge");
    assert(!findObstacle(partyClassicConeOnly.snapshot, partyClassicConeOnly.coneId).flowBreakCleared, "Party Classic cone-only hazard should stay on road");

    const partyClassicMajor = await page.evaluate(() => {
      window.__flowBreakQa.reset({ partyMode: true });
	      window.__flowBreakQa.armFromFlow();
	      const slowId = window.__flowBreakQa.add("slowCar", window.__flowBreakQa.centerLane(), 2200);
	      const coneId = window.__flowBreakQa.add("cone", window.__flowBreakQa.centerLane(), 2260);
	      const snapshot = window.__flowBreakQa.activate("qa-party-major").snapshot;
	      return { slowId, coneId, snapshot };
    });
    assert.strictEqual(partyClassicMajor.snapshot.triggered, 1, "Party Classic Flow Break should trigger from a forward major hazard");
    assert.strictEqual(partyClassicMajor.snapshot.triggeredByMajorHazard, true, "Party Classic trigger should be marked major-hazard driven");
    assert(!findObstacle(partyClassicMajor.snapshot, partyClassicMajor.slowId).flowBreakCleared, "Party Classic major hazard should remain during phase");
    assert(!findObstacle(partyClassicMajor.snapshot, partyClassicMajor.coneId).flowBreakCleared, "Party Classic minor hazard should remain during phase");
    assert.strictEqual(partyClassicMajor.snapshot.sparksCreated, 0, "Party Classic Flow Break should not create clear-sparks");

    const partyFuel = await page.evaluate(() => {
      window.__flowBreakQa.reset({ raceTypeId: "fuelRun", partyMode: true });
      window.__flowBreakQa.armFromFlow();
      return window.__flowBreakQa.snapshot();
    });
    assert.strictEqual(partyFuel.flowEnabled, false, "Party Fuel Run should not enable Flow Break");
    assert.strictEqual(partyFuel.armed, false, "Party Fuel Run should not arm Flow Break");

    const reportProbe = await page.evaluate(() => {
      const app = window.neonRoadRally;
      window.__flowBreakQa.reset({
        trackId: "redline-run",
        speedClassId: "redline",
        seed: "REDLINE-CITY-LIMITS-REDLINE",
        officialRouteId: "redline-city-limits-blaze"
      });
      app.run.currentSectionId = "finalPush";
      app.run.currentSectionLabel = "Final Push";
	      window.__flowBreakQa.armFromFlow();
	      window.__flowBreakQa.add("slowCar", window.__flowBreakQa.centerLane(), 2200);
	      window.__flowBreakQa.add("truck", Math.max(0, window.__flowBreakQa.centerLane() - 1), 2380);
	      const triggeredSnapshot = window.__flowBreakQa.activate("qa-report").snapshot;
      app.endRace("finished", "Flow QA Finish");
      const latest = app.playtestReports.getRuns().slice(-1)[0] || {};
      const aggregate = app.buildPlaytestReportAggregate("all");
      const exportPayload = JSON.parse(app.buildPlaytestReportExportText("all"));
      return {
        triggeredSnapshot,
        latest,
	        aggregateFlowBreakImpact: {
	          runs: aggregate.flowBreakRunCount,
	          manualAttempts: aggregate.flowBreakManualActivationAttempts,
	          manualSuccesses: aggregate.flowBreakManualTriggerSuccesses,
	          noTargetAttempts: aggregate.flowBreakNoTargetAttempts,
	          phaseActivations: aggregate.flowBreakPhaseActivations,
	          collisionsPhasedThrough: aggregate.flowBreakCollisionsPhasedThrough,
	          slowdownsPrevented: aggregate.flowBreakSlowdownsPrevented,
	          triggered: aggregate.flowBreaksTriggered,
          hazardsCleared: aggregate.flowBreakHazardsCleared,
          majorHazardsCleared: aggregate.flowBreakMajorHazardsCleared,
          likelyCollisionPrevented: aggregate.flowBreakLikelyCollisionPrevented,
          finalPush: aggregate.flowBreakTriggersDuringFinalPush,
          rows: aggregate.flowBreakHighSpeedRows
        },
        exportedFlowBreakImpact: exportPayload.totals.flowBreakImpact
      };
    });
	    assert.strictEqual(reportProbe.triggeredSnapshot.triggered, 1, "Report probe should trigger Flow Break once");
	    assert.strictEqual(reportProbe.triggeredSnapshot.manualAttempts, 1, "Report probe should record a manual Flow Break attempt");
	    assert.strictEqual(reportProbe.triggeredSnapshot.manualSuccesses, 1, "Report probe should record a successful manual Flow Break");
	    assert(reportProbe.latest.flowBreakImpactEvents?.length >= 1, "Playtest run should persist Flow Break impact events");
	    assert.strictEqual(reportProbe.latest.flowBreakManualActivationAttempts, 1, "Playtest run should persist manual Flow Break attempts");
	    assert.strictEqual(reportProbe.latest.flowBreakManualTriggerSuccesses, 1, "Playtest run should persist successful manual Flow Break triggers");
	    assert.strictEqual(reportProbe.latest.flowBreakImpactEvents[0].runFinished, true, "Flow Break impact event should record finished run outcome");
	    assert.strictEqual(reportProbe.latest.flowBreakImpactEvents[0].usedDuringFinalPush, true, "Flow Break impact event should record finalPush usage");
	    assert.strictEqual(reportProbe.latest.flowBreakImpactEvents[0].manualActivation, true, "Flow Break impact event should record manual activation");
    assert.strictEqual(reportProbe.latest.flowBreakImpactEvents[0].phaseActivation, true, "Flow Break impact event should record phase activation");
    assert.strictEqual(reportProbe.latest.flowBreakHazardsClearedPerTriggerAverage, 0, "Playtest run should expose zero hazards cleared per trigger");
    assert.strictEqual(reportProbe.latest.flowBreakPressureBeforeAverage, reportProbe.latest.flowBreakPressureAfterAverage, "Playtest run should show unchanged pressure for phase activation");
	    assert(reportProbe.aggregateFlowBreakImpact.triggered >= 1, "Playtest aggregate should count Flow Break triggers");
	    assert(reportProbe.aggregateFlowBreakImpact.manualAttempts >= 1, "Playtest aggregate should count manual Flow Break attempts");
	    assert(reportProbe.aggregateFlowBreakImpact.manualSuccesses >= 1, "Playtest aggregate should count successful manual Flow Break triggers");
	    assert(reportProbe.aggregateFlowBreakImpact.phaseActivations >= 1, "Playtest aggregate should count Flow Break phase activations");
	    assert.strictEqual(reportProbe.aggregateFlowBreakImpact.majorHazardsCleared, 0, "Playtest aggregate should not count major hazards cleared");
    assert(reportProbe.aggregateFlowBreakImpact.finalPush >= 1, "Playtest aggregate should count finalPush Flow Break triggers");
    assert(reportProbe.aggregateFlowBreakImpact.rows.some((row) => row.speedClassId === "redline" && row.triggered >= 1), "Playtest aggregate should include a Redline Flow Break summary row");
	    assert(reportProbe.exportedFlowBreakImpact?.triggered >= 1, "Playtest export should include Flow Break impact totals");
	    assert(reportProbe.exportedFlowBreakImpact?.manualAttempts >= 1, "Playtest export should include manual Flow Break attempts");
	    assert(reportProbe.exportedFlowBreakImpact?.manualSuccesses >= 1, "Playtest export should include manual Flow Break successes");
	    assert(reportProbe.exportedFlowBreakImpact?.phaseActivations >= 1, "Playtest export should include Flow Break phase activations");
    assert(reportProbe.exportedFlowBreakImpact?.highSpeedClassicRows?.some((row) => row.speedClassId === "redline" && row.triggered >= 1), "Playtest export should include Redline Flow Break row");

    const pageText = await page.textContent("body");
    const manualPulseCopyPattern = new RegExp([`PRESS ${"E"}`, `LANE ${"PULSE"}`, `${"PULSE"} READY`, `E ${"PULSE"}`].join("|"), "i");
    assert(!manualPulseCopyPattern.test(pageText || ""), "Visible DOM should not contain manual Pulse copy");
    if (consoleIssues.length) {
      throw new Error(`Console warnings/errors found: ${consoleIssues.join(" | ")}`);
    }

    const realRouteSample = await runRealRouteSample(page, OUT_DIR);
    assert(realRouteSample.triggered >= 1, "Real route sample should trigger Flow Break");
    assert(realRouteSample.phaseActivations >= 1, "Real route sample should activate phase mode");
    assert.strictEqual(realRouteSample.hazardsCleared, 0, "Real route sample should not clear visible hazards");
    assert.strictEqual(realRouteSample.hazardsClearedAhead, 0, "Real route sample should not clear forward hazards");
    assert.strictEqual(realRouteSample.hazardsClearedBehind, 0, "Real route sample should not clear behind-player hazards");
    assert.strictEqual(realRouteSample.sparksCreated, 0, "Real route sample should not create boost sparks");
    assert.strictEqual(realRouteSample.sparksSpawnedAhead, 0, "Real route sample should not spawn forward boost sparks");
    assert.strictEqual(realRouteSample.sparksSpawnedBehind, 0, "Real route sample should not spawn behind-player sparks");
    assert.strictEqual(realRouteSample.zeroEffectTriggers, 0, "Real route sample should have no zero-effect Flow Break triggers");
    assert.strictEqual(realRouteSample.noForwardHazardTriggers, 0, "Real route sample should not trigger without a forward hazard");

    console.log("FLOW_BREAK_CORRECTNESS_CHECKS_OK");
    console.log(JSON.stringify({
      screenshots: [
        chargingShot,
        armedShot,
        armed720Shot,
        preTriggerShot,
        breakShot,
        ...realRouteSample.screenshots
      ],
      charging,
      armed,
      emptyRoad,
      triggered,
      phaseCollision,
      phaseSlowdown,
      expiredCollision,
      frameCost,
      liveFrameSample,
      truck,
      barrier,
      collision,
      fuel,
      partyClassicArmed,
      partyClassicConeOnly,
      partyClassicMajor,
      partyFuel,
      realRouteSample,
      consoleIssues
    }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
