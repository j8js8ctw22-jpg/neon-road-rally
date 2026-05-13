#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

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

  throw new Error("Cannot find module 'playwright'. Install it locally, set NODE_PATH, or set NRR_PLAYWRIGHT_NODE_MODULES to a node_modules directory containing Playwright.");
}

const { chromium } = loadPlaywright();

const BRAVE_PATH = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const BASE_URL = process.env.NRR_SMOKE_URL || "http://127.0.0.1:8085/";

function assert(condition, message, details = {}) {
  if (!condition) {
    const suffix = Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
    throw new Error(`${message}${suffix}`);
  }
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

function assertIncludes(text, expected, label = expected) {
  assert(
    text.toLowerCase().includes(String(expected).toLowerCase()),
    `Missing expected text: ${label}`,
    { snippet: text.slice(0, 1000) }
  );
}

async function createDriver(page) {
  await page.evaluate(() => {
    localStorage.clear();
    const app = window.neonRoadRally;
    app.profiles.data.players = [];
    app.profiles.data.currentPlayerId = null;
    const driver = app.profiles.createPlayer("Drift QA");
    app.profiles.selectPlayer(driver.id);
    app.showTitle();
  });
}

async function openSoloSetup(page) {
  await page.evaluate(() => window.neonRoadRally.showPreRaceScreen());
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
}

async function assertNormalSetupHiddenModes(page) {
  await openSoloSetup(page);
  const text = await bodyText(page);
  assert(!text.includes("Neon Palm Boostline"), "Boostline prototype route should not be visible in normal solo setup", { snippet: text.slice(0, 1200) });
  assert(!text.includes("Experimental Prototype"), "Boostline prototype label should not be visible in normal solo setup", { snippet: text.slice(0, 1200) });
  assert(!text.includes("Pursuit"), "Pursuit should not appear in normal solo setup", { snippet: text.slice(0, 1200) });
  const actionCount = await page.locator('[data-action="startBoostlinePrototype"]').count();
  assert(actionCount === 0, "Boostline prototype start action should not be present in normal setup", { actionCount });
  const routeCardCount = await page.locator(".official-route-grid [data-official-route-id]").count();
  assert(routeCardCount === 10, "Normal setup should still show the Official 10 grid", { routeCardCount });
  const raceTypeValues = await page.$$eval("#preRaceType option", (options) => options.map((option) => option.value));
  assert(raceTypeValues.includes("classic"), "Classic should remain available in normal setup", { raceTypeValues });
  assert(raceTypeValues.includes("fuelRun"), "Fuel Run should remain available in normal setup", { raceTypeValues });
  assert(!raceTypeValues.includes("boostline"), "Boostline should not be a player-facing race type", { raceTypeValues });
  assert(!raceTypeValues.includes("pursuit"), "Pursuit should not be a player-facing race type", { raceTypeValues });
}

async function startOfficialRun(page, route) {
  await page.evaluate((config) => {
    const app = window.neonRoadRally;
    app.startRace({
      trackId: config.trackId,
      speedClassId: config.speedClassId,
      raceTypeId: config.raceTypeId,
      seed: config.seed,
      officialRouteId: config.routeId
    });
    app.run.countdownTimer = 0;
    app.run.raceActive = true;
    app.run.elapsed = 0.1;
    if (app.obstacles) {
      app.obstacles.obstacles = [];
      if (!app.__driftSmokeOriginalObstacleUpdate && typeof app.obstacles.update === "function") {
        app.__driftSmokeOriginalObstacleUpdate = app.obstacles.update.bind(app.obstacles);
      }
      app.obstacles.update = () => {};
    }
  }, route);
  await page.waitForFunction(() => window.neonRoadRally?.screen === "game", null, { timeout: 5000 });
}

async function startCustomRun(page, route) {
  await page.evaluate((config) => {
    const app = window.neonRoadRally;
    app.startRace({
      trackId: config.trackId,
      speedClassId: config.speedClassId,
      raceTypeId: config.raceTypeId,
      seed: config.seed
    });
    app.run.countdownTimer = 0;
    app.run.raceActive = true;
    app.run.elapsed = 0.1;
    if (app.obstacles) {
      app.obstacles.obstacles = [];
      if (!app.__driftSmokeOriginalObstacleUpdate && typeof app.obstacles.update === "function") {
        app.__driftSmokeOriginalObstacleUpdate = app.obstacles.update.bind(app.obstacles);
      }
      app.obstacles.update = () => {};
    }
  }, route);
  await page.waitForFunction(() => window.neonRoadRally?.screen === "game", null, { timeout: 5000 });
}

async function exerciseDrift(page, directionKey, expectedDirection, options = {}) {
  const holdMs = options.holdMs ?? 320;
  const stabilityWaitMs = options.stabilityWaitMs ?? 180;
  const releaseMode = options.releaseMode || "shift";
  const before = await page.evaluate(() => {
    const run = window.neonRoadRally.run;
    return {
      targetLane: run.targetLane,
      renderLaneFloat: Number((run.renderLaneFloat || 0).toFixed(3)),
      laneMoves: run.laneMoves,
      speed: run.currentSpeed
    };
  });
  await page.keyboard.down("Shift");
  await page.keyboard.down(directionKey);
  await page.waitForFunction((direction) => {
    const run = window.neonRoadRally?.run || {};
    return run.driftActive === true && run.driftDirection === direction && (run.driftChargeSeconds || 0) > 0.08;
  }, expectedDirection, { timeout: 5000 });
  if (holdMs > 0) await page.waitForTimeout(holdMs);
  if (holdMs >= 800) {
    await page.waitForFunction(() => {
      const run = window.neonRoadRally?.run || {};
      return Boolean(run.driftFullChargeReady) || (run.driftChargeSeconds || 0) >= 1.045;
    }, null, { timeout: 1500 });
  }
  const active = await page.evaluate(() => {
    const app = window.neonRoadRally;
    const run = app.run;
    const hitbox = app.renderer.getPlayerHitbox();
    return {
      driftActive: Boolean(run.driftActive),
      driftDirection: run.driftDirection,
      driftChargeSeconds: Number((run.driftChargeSeconds || 0).toFixed(3)),
      driftChargeRatio: Number((run.driftChargeRatio || 0).toFixed(3)),
      driftDashDistance: Number((run.driftDashDistance || 0).toFixed(3)),
      fullChargeReady: Boolean(run.driftFullChargeReady),
      fullChargeCueActive: (run.driftFullChargeCueTimer || 0) > 0 || Boolean(run.driftFullChargeReady),
      targetLane: run.targetLane,
      renderLaneFloat: Number((run.renderLaneFloat || 0).toFixed(3)),
      laneMoves: run.laneMoves,
      visualCueActive: (run.driftSkidSparkTimer || 0) > 0,
      hitbox: {
        x: Number(hitbox.x.toFixed(2)),
        w: Number(hitbox.w.toFixed(2))
      }
    };
  });
  assert(active.driftActive, "Drift should become active while Shift and steering are held", { active });
  assert(active.driftDirection === expectedDirection, "Drift direction should match steering direction", { active });
  assert(active.visualCueActive, "Drift skid/spark cue should be active", { active });
  assert(active.laneMoves === before.laneMoves, "Shift + steering should not count a lane move", { before, active });
  assert(active.driftDashDistance > 0, "Shift + steering should start a cross-lane drift dash immediately", { before, active });
  assert(active.renderLaneFloat >= 0 && active.renderLaneFloat <= 4, "Active drift dash should stay inside road bounds", { before, active });
  if (expectedDirection < 0) {
    assert(active.renderLaneFloat < before.renderLaneFloat, "Left drift dash should move the car left immediately", { before, active });
  } else {
    assert(active.renderLaneFloat > before.renderLaneFloat, "Right drift dash should move the car right immediately", { before, active });
  }
  if (holdMs >= 800) {
    assert(active.fullChargeReady, "Max-hold drift dash should mark the cue as ready", { active });
    assert(active.fullChargeCueActive, "Max-hold drift dash should expose a visual cue state", { active });
  }
  await page.waitForTimeout(stabilityWaitMs);
  const held = await page.evaluate(() => {
    const run = window.neonRoadRally.run;
    return {
      targetLane: run.targetLane,
      renderLaneFloat: Number((run.renderLaneFloat || 0).toFixed(3)),
      driftDashDistance: Number((run.driftDashDistance || 0).toFixed(3)),
      laneMoves: run.laneMoves
    };
  });
  assert(held.laneMoves === active.laneMoves, "Holding drift should not repeat lane moves", { before, active, held });
  assert(held.renderLaneFloat >= 0 && held.renderLaneFloat <= 4, "Held drift dash should stay inside road bounds", { before, active, held });
  if (expectedDirection < 0) {
    assert(held.renderLaneFloat <= active.renderLaneFloat + 0.05, "Holding left drift dash should continue or hold its leftward cut", { before, active, held });
  } else {
    assert(held.renderLaneFloat >= active.renderLaneFloat - 0.05, "Holding right drift dash should continue or hold its rightward cut", { before, active, held });
  }

  if (releaseMode === "direction") {
    await page.keyboard.up(directionKey);
  } else {
    await page.keyboard.up("Shift");
  }
  await page.waitForFunction(() => {
    const run = window.neonRoadRally?.run || {};
    return !run.driftActive && (run.driftBoostTimer || 0) > 0 && (run.driftBoostMultiplier || 1) > 1;
  }, null, { timeout: 5000 });
  if (releaseMode === "direction") await page.keyboard.up("Shift");
  else await page.keyboard.up(directionKey);
  const release = await page.evaluate((previousSpeed) => {
    const run = window.neonRoadRally.run;
    return {
      driftBoostTimer: Number((run.driftBoostTimer || 0).toFixed(3)),
      driftBoostMultiplier: Number((run.driftBoostMultiplier || 1).toFixed(3)),
      driftReleaseBurstTimer: Number((run.driftReleaseBurstTimer || 0).toFixed(3)),
      driftBoostsReleased: run.driftBoostsReleased || 0,
      driftDashesCompleted: run.driftDashesCompleted || 0,
      driftDashTime: Number((run.driftDashTime || 0).toFixed(3)),
      driftLanesCrossed: Number((run.driftLanesCrossed || 0).toFixed(3)),
      longestDriftDashLanes: Number((run.longestDriftDashLanes || 0).toFixed(3)),
      driftsStarted: run.driftsStarted || 0,
      maxDriftHold: Number((run.maxDriftHold || 0).toFixed(3)),
      maxDriftCharge: Number((run.maxDriftCharge || 0).toFixed(3)),
      fullRelease: Boolean(run.driftLastReleaseFullCharge),
      targetLane: run.targetLane,
      renderLaneFloat: Number((run.renderLaneFloat || 0).toFixed(3)),
      laneMoves: run.laneMoves,
      currentSpeed: Number((run.currentSpeed || 0).toFixed(2)),
      previousSpeed: Number((previousSpeed || 0).toFixed(2))
    };
  }, before.speed);
  assert(release.driftBoostTimer > 0, "Drift release should create a timed speed boost", { release });
  assert(release.driftBoostMultiplier > 1, "Drift release should raise the speed multiplier", { release });
  assert(release.driftReleaseBurstTimer > 0, "Drift release burst visual cue should be active", { release });
  assert(release.driftBoostsReleased >= 1 && release.driftsStarted >= 1 && release.driftDashesCompleted >= 1, "Drift telemetry should increment", { release });
  assert(release.driftLanesCrossed > 0 && release.longestDriftDashLanes > 0, "Drift dash telemetry should record lanes crossed", { release });
  assert(Number.isInteger(release.targetLane) && release.targetLane >= 0 && release.targetLane <= 4, "Drift dash release should settle to a valid lane", { release });
  assert(release.renderLaneFloat >= 0 && release.renderLaneFloat <= 4, "Released drift dash should remain inside road bounds", { release });
  assert(release.laneMoves === before.laneMoves, "Drift dash release should not count as normal lane movement", { before, release });
  return { before, active, release };
}

async function assertLaneAndSpaceBoostStillWork(page) {
  const beforeLane = await page.evaluate(() => window.neonRoadRally.run.targetLane);
  await page.keyboard.press("d");
  await page.waitForFunction((lane) => window.neonRoadRally?.run?.targetLane !== lane, beforeLane, { timeout: 5000 });
  const laneResult = await page.evaluate((lane) => ({
    beforeLane: lane,
    afterLane: window.neonRoadRally.run.targetLane,
    driftActive: Boolean(window.neonRoadRally.run.driftActive)
  }), beforeLane);
  assert(!laneResult.driftActive, "Normal lane change without Shift should not drift", { laneResult });

  await page.keyboard.press("Space");
  await page.waitForFunction(() => (window.neonRoadRally?.run?.boostTimer || 0) > 0, null, { timeout: 5000 });
  const boostResult = await page.evaluate(() => ({
    boostTimer: Number((window.neonRoadRally.run.boostTimer || 0).toFixed(3)),
    manualBoostsUsed: window.neonRoadRally.run.manualBoostsUsed || 0
  }));
  assert(boostResult.manualBoostsUsed >= 1 && boostResult.boostTimer > 0, "Space boost should still work", { boostResult });
  return { laneResult, boostResult };
}

async function forceFinishWithDriftNote(page) {
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    const run = app.run;
    run.countdownTimer = 0;
    run.raceActive = true;
    run.elapsed = 41.234;
    run.distance = run.track.distanceToFinish;
    run.baseScore = 118000;
    run.score = 118000;
    run.manualBoosts = Math.max(0, run.manualBoosts || 0);
    run.driftsStarted = Math.max(run.driftsStarted || 0, 2);
    run.driftBoostsReleased = Math.max(run.driftBoostsReleased || 0, 2);
    run.driftDashesCompleted = Math.max(run.driftDashesCompleted || 0, 2);
    run.driftBoostTime = Math.max(run.driftBoostTime || 0, 1.1);
    run.driftDashTime = Math.max(run.driftDashTime || 0, 1.2);
    run.driftLanesCrossed = Math.max(run.driftLanesCrossed || 0, 2.2);
    run.longestDriftDashLanes = Math.max(run.longestDriftDashLanes || 0, 2.1);
    run.longestDrift = Math.max(run.longestDrift || 0, 1.05);
    run.maxDriftCharge = Math.max(run.maxDriftCharge || 0, 1.05);
    run.maxDriftHold = Math.max(run.maxDriftHold || 0, 1.05);
    run.driftNearMisses = 0;
    run.slowdownHits = 0;
    app.endRace("finished", "Drift Browser Smoke Finish");
  });
  await page.waitForFunction(() => window.neonRoadRally?.screen === "score", null, { timeout: 5000 });
  const text = await bodyText(page);
  assertIncludes(text, "Official Race Result");
  assertIncludes(text, "Big drift cut");
  const summary = await page.evaluate(() => {
    const result = window.neonRoadRally.lastSummary || {};
    return {
      driftResultNote: result.driftResultNote || "",
      driftsStarted: result.driftsStarted || 0,
      driftBoostsReleased: result.driftBoostsReleased || 0,
      driftDashesCompleted: result.driftDashesCompleted || 0,
      driftBoostTime: Number((result.driftBoostTime || 0).toFixed(3)),
      driftDashTime: Number((result.driftDashTime || 0).toFixed(3)),
      longestDrift: Number((result.longestDrift || 0).toFixed(3)),
      maxDriftCharge: Number((result.maxDriftCharge || 0).toFixed(3)),
      maxDriftHold: Number((result.maxDriftHold || 0).toFixed(3)),
      driftLanesCrossed: Number((result.driftLanesCrossed || 0).toFixed(3)),
      longestDriftDashLanes: Number((result.longestDriftDashLanes || 0).toFixed(3)),
      raceTypeId: result.raceTypeId || ""
    };
  });
  assert(summary.driftResultNote === "Big drift cut", "Result summary should keep the drift dash note", { summary });
  return summary;
}

async function assertPartyAndGarageSanity(page) {
  const party = await page.evaluate(() => {
    const app = window.neonRoadRally;
    const players = app.profiles.data.players;
    if (players.length < 2) {
      app.profiles.createPlayer("Drift QA 2");
    }
    const setup = app.getPartySetup();
    setup.selectedPlayerIds = app.profiles.data.players.map((player) => player.id).slice(0, 2);
    app.showPartySetupScreen();
    const select = document.querySelector("#partyRaceType");
    return {
      screen: app.screen,
      raceTypes: select ? Array.from(select.options).map((option) => option.value) : []
    };
  });
  assert(party.screen === "partySetup", "Party setup should open", { party });
  assert(party.raceTypes.includes("classic") && party.raceTypes.includes("fuelRun"), "Party Classic/Fuel should remain available", { party });
  assert(!party.raceTypes.includes("boostline") && !party.raceTypes.includes("pursuit"), "Party setup should not expose Boostline or Pursuit", { party });

  await page.evaluate(() => window.neonRoadRally.showPlayerScreen());
  await page.waitForFunction(() => window.neonRoadRally?.screen === "players", null, { timeout: 5000 });
  const garageText = await bodyText(page);
  assertIncludes(garageText, "Driver Garage");
}

async function main() {
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
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const consoleIssues = [];
  page.on("console", (msg) => {
    if (["warning", "error"].includes(msg.type())) consoleIssues.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await createDriver(page);
    await assertNormalSetupHiddenModes(page);

    await startCustomRun(page, {
      trackId: "sunset-highway",
      speedClassId: "arcade",
      raceTypeId: "classic",
      seed: "DRIFT-ARCADE-SHORT"
    });
    const arcadeShortDrift = await exerciseDrift(page, "a", -1, { holdMs: 120, stabilityWaitMs: 30, releaseMode: "direction" });
    const arcadeControls = await assertLaneAndSpaceBoostStillWork(page);

    await startCustomRun(page, {
      trackId: "sunset-highway",
      speedClassId: "arcade",
      raceTypeId: "classic",
      seed: "DRIFT-ARCADE-FULL"
    });
    const arcadeFullDrift = await exerciseDrift(page, "d", 1, { holdMs: 950, releaseMode: "shift" });
    assert(arcadeFullDrift.release.driftBoostMultiplier > arcadeShortDrift.release.driftBoostMultiplier, "Arcade long drift dash should release a stronger boost than short drift dash", { arcadeShortDrift, arcadeFullDrift });
    assert(arcadeFullDrift.release.driftBoostTimer > arcadeShortDrift.release.driftBoostTimer, "Arcade long drift dash should release a longer boost than short drift dash", { arcadeShortDrift, arcadeFullDrift });
    assert(arcadeFullDrift.release.fullRelease, "Arcade long drift dash should mark the release as a max dash", { arcadeFullDrift });

    await startOfficialRun(page, {
      routeId: "sunset-neon-palm-sprint",
      trackId: "sunset-highway",
      speedClassId: "turbo",
      raceTypeId: "classic",
      seed: "SUNSET-PALM-SPRINT-TURBO"
    });
    const turboShortDrift = await exerciseDrift(page, "a", -1, { holdMs: 120, stabilityWaitMs: 30, releaseMode: "shift" });

    await startOfficialRun(page, {
      routeId: "sunset-neon-palm-sprint",
      trackId: "sunset-highway",
      speedClassId: "turbo",
      raceTypeId: "classic",
      seed: "SUNSET-PALM-SPRINT-TURBO"
    });
    const turboFullDrift = await exerciseDrift(page, "ArrowRight", 1, { holdMs: 950, releaseMode: "direction" });
    assert(turboFullDrift.release.driftBoostMultiplier > turboShortDrift.release.driftBoostMultiplier, "Turbo long drift dash should release a stronger boost than short drift dash", { turboShortDrift, turboFullDrift });
    assert(turboFullDrift.release.driftBoostTimer > turboShortDrift.release.driftBoostTimer, "Turbo long drift dash should release a longer boost than short drift dash", { turboShortDrift, turboFullDrift });
    const finishSummary = await forceFinishWithDriftNote(page);

    await startOfficialRun(page, {
      routeId: "redline-switchyard-boostline",
      trackId: "redline-run",
      speedClassId: "overdrive",
      raceTypeId: "fuelRun",
      seed: "REDLINE-SWITCHYARD-BOOST-OD"
    });
    const fuelDrift = await exerciseDrift(page, "d", 1, { holdMs: 320, releaseMode: "shift" });
    await assertPartyAndGarageSanity(page);

    if (consoleIssues.length) {
      throw new Error(`Console warnings/errors found: ${consoleIssues.join(" | ")}`);
    }
    console.log("DRIFT_BROWSER_SMOKE_OK");
    console.log(JSON.stringify({
      arcadeShortDrift,
      arcadeFullDrift,
      arcadeControls,
      turboShortDrift,
      turboFullDrift,
      fuelDrift,
      finishSummary,
      consoleIssues
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
