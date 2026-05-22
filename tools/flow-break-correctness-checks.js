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
      reset(options = {}) {
        const laneFloat = Number.isFinite(options.laneFloat) ? options.laneFloat : 2;
        const targetLane = Number.isFinite(options.targetLane) ? options.targetLane : Math.round(laneFloat);
        const raceTypeId = options.raceTypeId || "classic";
        const raceOptions = {
          trackId: "sunset-highway",
          speedClassId: "turbo",
          raceTypeId,
          seed: "SUNSET-PALM-SPRINT-TURBO"
        };
        if (raceTypeId === "classic") raceOptions.officialRouteId = "sunset-neon-palm-sprint";
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
        const obstacle = app.obstacles.createObstacle(type, lane, app.run.distance + ahead, { allowLaneAdjust: false });
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
        this.add("slowCar", 2, 2200);
        this.add("truck", 1, 2450);
        this.add("slowCar", 2, 2850);
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
      snapshot() {
        const run = app.run;
        return {
          flowEnabled: app.isNeonFlowEnabledForRun(run),
          flow: run.neonFlow || 0,
          armed: Boolean(run.flowBreakArmed),
          armedCount: run.flowBreaksArmed || 0,
          triggered: run.flowBreaksTriggered || 0,
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
          flowBreakFrameWorstMs: Number((run.flowBreakFrameWorstMs || 0).toFixed(3)),
          flowBreakFrameSamples: run.flowBreakFrameSamples || 0,
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
    app.run.renderLaneFloat = 2;
    app.run.playerLaneFloat = 2;
    app.run.targetLane = 2;
    app.run.neonFlow = 92;
    app.addNeonFlow("nearMiss", { ignoreSuppression: true });
    app.renderer.render();
  });

  const readyShot = path.join(outDir, "real-route-flow-ready.png");
  await page.screenshot({ path: readyShot });
  const screenshots = [readyShot];
  let triggerShot = "";
  let sparksShot = "";
  let collectedShot = "";
  let finalSnapshot = null;

  for (let frame = 0; frame < 1200; frame += 1) {
    const snapshot = await page.evaluate((frameIndex) => {
      const app = window.neonRoadRally;
      const run = app.run;
      if (Array.isArray(run.flowBreakSparks) && run.flowBreakSparks.length) {
        const nextSpark = run.flowBreakSparks
          .filter((spark) => !spark.collected)
          .sort((a, b) => Math.max(0, a.distance - run.distance) - Math.max(0, b.distance - run.distance))[0];
        if (nextSpark && nextSpark.distance - run.distance > 520) {
          const sparkLane = Math.round(Math.max(0, Math.min(4, nextSpark.laneFloat)));
          run.targetLane = sparkLane;
          run.laneChangeTargetLane = sparkLane;
          run.renderLaneFloat += Math.max(-0.12, Math.min(0.12, sparkLane - run.renderLaneFloat));
          run.playerLaneFloat = run.renderLaneFloat;
        }
      }
      app.updateRun(1 / 60);
      app.renderer.render();
      return {
        frame: frameIndex,
        ended: Boolean(run.ended),
        pendingEndStatus: run.pendingEndStatus || "",
        triggered: run.flowBreaksTriggered || 0,
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
    if (snapshot.sparksCreated > 0 && snapshot.sparks.length && !sparksShot) {
      sparksShot = path.join(outDir, "real-route-boost-sparks-visible.png");
      await page.screenshot({ path: sparksShot });
      screenshots.push(sparksShot);
    }
    if (snapshot.sparksCollected > 0 && !collectedShot) {
      collectedShot = path.join(outDir, "real-route-boost-spark-collected.png");
      await page.screenshot({ path: collectedShot });
      screenshots.push(collectedShot);
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
    app.run.renderLaneFloat = 2;
    app.run.playerLaneFloat = 2;
    app.run.targetLane = 2;
    app.run.laneChangeTargetLane = 2;
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
    app.obstacles.obstacles.push(app.obstacles.createObstacle("slowCar", 2, app.run.distance + 2200, { allowLaneAdjust: false }));
    app.obstacles.obstacles.push(app.obstacles.createObstacle("truck", 1, app.run.distance + 2450, { allowLaneAdjust: false }));
    app.lastFrame = performance.now();
    app.addNeonFlow("nearMiss", { ignoreSuppression: true });
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

    const behindAhead = Math.max(20, armed.playerForwardAhead - 360);
    const behindId = await page.evaluate((ahead) => window.__flowBreakQa.add("slowCar", 2, ahead), behindAhead);
    const behindWait = await page.evaluate(() => window.__flowBreakQa.tick());
    assert.strictEqual(behindWait.armed, true, "Flow Break should wait when the only clearable hazard is behind the player");
    assert.strictEqual(behindWait.triggered, 0, "Flow Break should not trigger for behind-player hazards");
    assert(!findObstacle(behindWait, behindId).flowBreakCleared, "Behind-player hazard should not be cleared by normal Flow Break");

    const edgeOnlyId = await page.evaluate(() => window.__flowBreakQa.add("slowCar", 2, 4050));
    const noEffectWait = await page.evaluate(() => window.__flowBreakQa.tick());
    assert.strictEqual(noEffectWait.armed, true, "Flow Break should wait when only one edge hazard is outside trigger quality");
    assert.strictEqual(noEffectWait.triggered, 0, "Flow Break should not trigger with no meaningful visible effect");
    assert.strictEqual(noEffectWait.zeroEffectTriggers, 0, "Flow Break should not record zero-effect triggers");
    assert.strictEqual(noEffectWait.noForwardHazardTriggers, 0, "Waiting should not create no-forward trigger telemetry");
    assert(!findObstacle(noEffectWait, edgeOnlyId).flowBreakCleared, "Edge hazard should remain until it enters the trigger zone");

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    const coneOnlyId = await page.evaluate(() => window.__flowBreakQa.add("cone", 2, 2200));
    const coneOnly = await page.evaluate(() => window.__flowBreakQa.tick());
    assert.strictEqual(coneOnly.armed, true, "Cone-only forward zone should keep Flow Break armed");
    assert.strictEqual(coneOnly.triggered, 0, "Cone-only forward zone should not trigger Flow Break");
    assert(!findObstacle(coneOnly, coneOnlyId).flowBreakCleared, "Cone-only hazard should not be cleared without a major trigger");
    assert(coneOnly.ignoredMinorHazardCount >= 1, "Cone-only forward zone should record an ignored minor hazard");
    assert.strictEqual(coneOnly.zeroEffectTriggers, 0, "Cone-only wait should not create zero-effect telemetry");
    assert.strictEqual(coneOnly.noForwardHazardTriggers, 0, "Cone-only wait should not create no-forward trigger telemetry");

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    const oilOnlyId = await page.evaluate(() => window.__flowBreakQa.add("oil", 2, 2200));
    const branchOnlyId = await page.evaluate(() => window.__flowBreakQa.add("branch", 2, 2350));
    const minorOnly = await page.evaluate(() => window.__flowBreakQa.tick());
    assert.strictEqual(minorOnly.armed, true, "Oil/branch-only forward zone should keep Flow Break armed");
    assert.strictEqual(minorOnly.triggered, 0, "Oil/branch-only forward zone should not trigger Flow Break");
    assert(!findObstacle(minorOnly, oilOnlyId).flowBreakCleared, "Oil should not be cleared without a major trigger");
    assert(!findObstacle(minorOnly, branchOnlyId).flowBreakCleared, "Branch should not be cleared without a major trigger");
    assert(minorOnly.ignoredMinorHazardCount >= 2, "Oil/branch-only forward zone should record ignored minor hazards");

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());

    const slowId = await page.evaluate(() => window.__flowBreakQa.add("slowCar", 2, 2200));
    const truckClusterId = await page.evaluate(() => window.__flowBreakQa.add("truck", 1, 2450));
    const coneClusterId = await page.evaluate(() => window.__flowBreakQa.add("cone", 2, 2260));
    const branchClusterId = await page.evaluate(() => window.__flowBreakQa.add("branch", 1, 2380));
    const farLaneId = await page.evaluate(() => window.__flowBreakQa.add("slowCar", 4, 2300));
    const boostId = await page.evaluate(() => window.__flowBreakQa.add("boostPad", 2, 2050));
    const rampId = await page.evaluate(() => window.__flowBreakQa.add("ramp", 2, 2150));
    const gasId = await page.evaluate(() => window.__flowBreakQa.add("gasCan", 2, 2250));
    const warningId = await page.evaluate(() => window.__flowBreakQa.add("warning", 2, 1950));
    await page.evaluate(() => window.__flowBreakQa.paint());
    const preTriggerShot = path.join(OUT_DIR, "pre-trigger-danger-visible.png");
    await page.screenshot({ path: preTriggerShot });
    const triggered = await page.evaluate(() => window.__flowBreakQa.tick());
    if (triggered.armed !== false || triggered.triggered !== 1) {
      console.log("FLOW_BREAK_TRIGGER_SNAPSHOT", JSON.stringify(triggered, null, 2));
    }
    assert.strictEqual(triggered.armed, false, "Flow Break should disarm after triggering");
    assert.strictEqual(triggered.triggered, 1, "Flow Break trigger count should increment");
    assert(findObstacle(triggered, slowId).flowBreakCleared, "Same-lane slow car should be cleared");
    assert(findObstacle(triggered, truckClusterId).flowBreakCleared, "Nearby truck should be clearable by Flow Break");
    assert(findObstacle(triggered, coneClusterId).flowBreakCleared, "Minor hazard should clear when a nearby major hazard triggers Flow Break");
    assert(findObstacle(triggered, branchClusterId).flowBreakCleared, "Branch should clear when a nearby major hazard triggers Flow Break");
    assert(!findObstacle(triggered, farLaneId).flowBreakCleared, "Far-lane hazard outside radius should not clear");
    assert(!findObstacle(triggered, boostId).flowBreakCleared, "Boost pad should not clear");
    assert(!findObstacle(triggered, rampId).flowBreakCleared, "Ramp should not clear");
    assert(!findObstacle(triggered, gasId).flowBreakCleared, "Gas can should not clear");
    assert(!findObstacle(triggered, warningId).flowBreakCleared, "Warning should not clear");
    assert(triggered.hazardsCleared >= 2, "Flow Break cleared telemetry should increment for visible hazards");
    assert(triggered.hazardsClearedAhead >= 2, "Flow Break should classify normal clears as ahead");
    assert.strictEqual(triggered.hazardsClearedBehind, 0, "Normal Flow Break should not clear behind-player hazards");
    assert(triggered.visibleHazardsAtTrigger >= 1, "Flow Break should record visible hazards at trigger");
    assert.strictEqual(triggered.zeroEffectTriggers, 0, "Flow Break should not trigger with zero effect");
    assert.strictEqual(triggered.noForwardHazardTriggers, 0, "Flow Break should not trigger without a forward hazard");
    assert(["slowCar", "truck", "fastCar", "barrier"].includes(triggered.triggerHazardType), "Flow Break trigger should record a major hazard type");
    assert.strictEqual(triggered.triggeredByMajorHazard, true, "Flow Break trigger should be marked as major-hazard driven");
    assert(triggered.majorHazardsCleared >= 2, "Major hazard clear telemetry should increment");
    assert(triggered.minorHazardsCleared >= 2, "Minor hazards can clear after a major-triggered Flow Break");
    assert(triggered.sparksCreated >= 2, "Flow Break should create boost sparks");
    assert(triggered.sparksSpawnedAhead >= 2, "Flow Break sparks should spawn ahead of the player");
    assert.strictEqual(triggered.sparksSpawnedBehind, 0, "Flow Break should not spawn sparks behind the player");
    assert(triggered.sparks.length >= 1, "Spark should remain collectible after burst");
    assert(triggered.sparks.every((spark) => spark.ahead > triggered.playerForwardAhead), "All visible Flow Break sparks should be ahead of the player");
    const breakShot = path.join(OUT_DIR, "flow-break-burst-frame.png");
    await page.screenshot({ path: breakShot });
    await page.evaluate(() => window.__flowBreakQa.tick(0.12));
    const sparksShot = path.join(OUT_DIR, "hazards-converted-sparks-visible.png");
    await page.screenshot({ path: sparksShot });

    const sparkAhead = triggered.sparks[0].ahead;
    const turboSparkDisplayProbe = await page.evaluate(() => {
      const app = window.neonRoadRally;
      const rawBefore = 3890;
      const rawAfter = rawBefore * 1.16;
      return {
        rawBefore,
        rawAfter,
        displayBefore: getDisplayedSpeedForRaw(rawBefore, app.run.track, app.run.speedClassId),
        displayAfter: getDisplayedSpeedForRaw(rawAfter, app.run.track, app.run.speedClassId)
      };
    });
    await page.evaluate(() => {
      window.neonRoadRally.run.currentSpeed = 3890;
      window.neonRoadRally.run.baseCruiseSpeed = Math.max(window.neonRoadRally.run.baseCruiseSpeed || 0, 3890);
    });
    const collected = await page.evaluate((delta) => window.__flowBreakQa.advance(delta), Math.max(0, sparkAhead - 120));
    assert(collected.sparksCollected >= 1, "Boost spark should be collectable");
    assert(collected.sparkBoostTimer > 0, "Collected spark should grant a short speed reward");
    assert(collected.sparkPickupCount >= 1, "Spark pickup telemetry should increment");
    assert(collected.sparkSpeedBefore !== null, "Spark pickup should record raw speed before reward");
    if (!(collected.sparkSpeedAfter > collected.sparkSpeedBefore)) {
      console.log("FLOW_BREAK_SPARK_COLLECTED_SNAPSHOT", JSON.stringify(collected, null, 2));
    }
    assert(collected.sparkSpeedAfter > collected.sparkSpeedBefore, "Spark pickup should increase raw speed");
    assert(collected.sparkDisplaySpeedBefore !== null, "Spark pickup should record display speed before reward");
    assert(collected.sparkDisplaySpeedAfter >= collected.sparkDisplaySpeedBefore, "Spark pickup should not lower displayed speed");
    assert(turboSparkDisplayProbe.displayAfter > 230, "Turbo spark overrun should display above the base Turbo range");
    assert(turboSparkDisplayProbe.displayAfter >= turboSparkDisplayProbe.displayBefore + 12, "Turbo spark pickup should show an obvious displayed-speed jump");
    assert(collected.sparkBoostMultiplier >= 1.16, "Spark pickup should record its boost multiplier");
    assert(collected.sparkPickupTimer > 0, "Spark pickup should trigger visible HUD feedback");
    const collectedShot = path.join(OUT_DIR, "boost-spark-collected.png");
    await page.screenshot({ path: collectedShot });

    const frameCost = await page.evaluate(() => window.__flowBreakQa.measureFlowBreakFrameCost());
    assert.strictEqual(frameCost.triggered, 1, "Performance sample should trigger Flow Break once");
    assert(frameCost.hazardsCleared >= 1, "Performance sample should still clear hazards");
    assert(frameCost.sparksCreated >= 1, "Performance sample should still create sparks");
    assert(frameCost.worstMs < 50, `Focused Flow Break update/render should stay below major-spike budget, saw ${frameCost.worstMs}ms`);
    const liveFrameSample = await runLiveFlowBreakFrameSample(page);
    assert(liveFrameSample.triggered >= 1, "Live frame sample should trigger Flow Break");
    assert(liveFrameSample.hazardsCleared >= 1, "Live frame sample should clear hazards");
    assert.strictEqual(liveFrameSample.triggeredByMajorHazard, true, "Live frame sample should trigger from a major hazard");
    if (!(liveFrameSample.flowBreakFrameWorstMs < 120)) {
      console.log("FLOW_BREAK_LIVE_FRAME_SAMPLE", JSON.stringify(liveFrameSample, null, 2));
    }
    assert(liveFrameSample.flowBreakFrameWorstMs < 120, `Live Flow Break frame window should avoid 150-250ms spikes, saw ${liveFrameSample.flowBreakFrameWorstMs}ms`);

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    const truckId = await page.evaluate(() => window.__flowBreakQa.add("truck", 2, 2600));
    const truck = await page.evaluate(() => window.__flowBreakQa.tick());
    assert(findObstacle(truck, truckId).flowBreakCleared, "Truck should be clearable by Flow Break");
    assert.strictEqual(truck.triggerHazardType, "truck", "Truck should be recorded as the trigger hazard");
    assert.strictEqual(truck.triggeredByMajorHazard, true, "Truck trigger should be marked as major hazard");

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    const barrierId = await page.evaluate(() => window.__flowBreakQa.add("barrier", 2, 2200));
    const barrier = await page.evaluate(() => window.__flowBreakQa.tick());
    assert(findObstacle(barrier, barrierId).flowBreakCleared, "Barrier should trigger and clear through Flow Break");
    assert.strictEqual(barrier.triggerHazardType, "barrier", "Barrier should be recorded as the trigger hazard");

    await page.evaluate(() => window.__flowBreakQa.reset());
    await page.evaluate(() => window.__flowBreakQa.armFromFlow());
    const collision = await page.evaluate(() => window.__flowBreakQa.runCollisionWithArmedHazard("slowCar", 2));
    if (collision.pendingEndStatus || !collision.flowBreakCleared) {
      console.log("FLOW_BREAK_COLLISION_SNAPSHOT", JSON.stringify(collision, null, 2));
    }
    assert(collision.flowBreakCleared, "Collision-zone hazard should be cleared by Flow Break fail-safe");
    assert.strictEqual(collision.pendingEndStatus, "", "Flow Break should prevent crash into a cleared hazard");
    assert(collision.flowBreakCollisionPrevented >= 1, "Collision-prevented telemetry should increment");
    assert.strictEqual(collision.flowBreakSparksSpawnedBehind || 0, 0, "Emergency Flow Break should still avoid behind-player spark placement");

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
      const coneId = window.__flowBreakQa.add("cone", 2, 2200);
      const snapshot = window.__flowBreakQa.tick();
      return { coneId, snapshot };
    });
    assert.strictEqual(partyClassicConeOnly.snapshot.triggered, 0, "Party Classic Flow Break should not trigger from cone-only danger");
    assert.strictEqual(partyClassicConeOnly.snapshot.armed, true, "Party Classic cone-only danger should leave Flow Break armed");
    assert(!findObstacle(partyClassicConeOnly.snapshot, partyClassicConeOnly.coneId).flowBreakCleared, "Party Classic cone-only hazard should not clear without a major trigger");

    const partyClassicMajor = await page.evaluate(() => {
      window.__flowBreakQa.reset({ partyMode: true });
      window.__flowBreakQa.armFromFlow();
      const slowId = window.__flowBreakQa.add("slowCar", 2, 2200);
      const coneId = window.__flowBreakQa.add("cone", 2, 2260);
      const snapshot = window.__flowBreakQa.tick();
      return { slowId, coneId, snapshot };
    });
    assert.strictEqual(partyClassicMajor.snapshot.triggered, 1, "Party Classic Flow Break should trigger from a forward major hazard");
    assert.strictEqual(partyClassicMajor.snapshot.triggeredByMajorHazard, true, "Party Classic trigger should be marked major-hazard driven");
    assert(findObstacle(partyClassicMajor.snapshot, partyClassicMajor.slowId).flowBreakCleared, "Party Classic major hazard should clear");
    assert(findObstacle(partyClassicMajor.snapshot, partyClassicMajor.coneId).flowBreakCleared, "Party Classic minor hazard may clear after a major trigger");
    assert(partyClassicMajor.snapshot.sparksCreated >= 1, "Party Classic Flow Break should create forward sparks");

    const partyFuel = await page.evaluate(() => {
      window.__flowBreakQa.reset({ raceTypeId: "fuelRun", partyMode: true });
      window.__flowBreakQa.armFromFlow();
      return window.__flowBreakQa.snapshot();
    });
    assert.strictEqual(partyFuel.flowEnabled, false, "Party Fuel Run should not enable Flow Break");
    assert.strictEqual(partyFuel.armed, false, "Party Fuel Run should not arm Flow Break");

    const pageText = await page.textContent("body");
    const manualPulseCopyPattern = new RegExp([`PRESS ${"E"}`, `LANE ${"PULSE"}`, `${"PULSE"} READY`, `E ${"PULSE"}`].join("|"), "i");
    assert(!manualPulseCopyPattern.test(pageText || ""), "Visible DOM should not contain manual Pulse copy");
    if (consoleIssues.length) {
      throw new Error(`Console warnings/errors found: ${consoleIssues.join(" | ")}`);
    }

    const realRouteSample = await runRealRouteSample(page, OUT_DIR);
    assert(realRouteSample.triggered >= 1, "Real route sample should trigger Flow Break");
    assert(realRouteSample.hazardsCleared >= 1, "Real route sample should clear visible hazards");
    assert(realRouteSample.hazardsClearedAhead >= 1, "Real route sample should clear forward hazards");
    assert.strictEqual(realRouteSample.hazardsClearedBehind, 0, "Real route sample should not clear behind-player hazards");
    assert(realRouteSample.sparksCreated >= 1, "Real route sample should create visible boost sparks");
    assert(realRouteSample.sparksSpawnedAhead >= 1, "Real route sample should spawn forward boost sparks");
    assert.strictEqual(realRouteSample.sparksSpawnedBehind, 0, "Real route sample should not spawn behind-player sparks");
    assert(realRouteSample.sparksCollected >= 1, "Real route sample should collect at least one boost spark");
    assert(realRouteSample.sparkSpeedAfter > realRouteSample.sparkSpeedBefore, "Real route spark pickup should increase raw speed");
    assert.strictEqual(realRouteSample.triggeredByMajorHazard, true, "Real route sample should trigger from a major hazard");
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
        sparksShot,
        collectedShot,
        ...realRouteSample.screenshots
      ],
      charging,
      armed,
      emptyRoad,
      noEffectWait,
      coneOnly,
      minorOnly,
      triggered,
      turboSparkDisplayProbe,
      collected,
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
