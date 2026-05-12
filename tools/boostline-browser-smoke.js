#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const nodeAssert = require("assert");
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
    { snippet: text.slice(0, 1200) }
  );
}

async function clickAction(page, action) {
  const locator = page.locator(`[data-action="${action}"]`);
  const count = await locator.count();
  assert(count === 1, `Expected one ${action} action`, { count });
  await locator.click();
}

async function waitForScreen(page, screen, timeout = 5000) {
  await page.waitForFunction((expected) => window.neonRoadRally?.screen === expected, screen, { timeout });
}

async function createDriverAndOpenSetup(page) {
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    if (!app) throw new Error("Neon Road Rally app missing");
    localStorage.clear();
    app.profiles.data.players = [];
    app.profiles.data.currentPlayerId = null;
    const driver = app.profiles.createPlayer("Boostline QA");
    app.profiles.selectPlayer(driver.id);
    app.showPreRaceScreen();
  });
  await waitForScreen(page, "preRace");
}

async function captureBoostlineSignature(page, dt = 0.4) {
  return page.evaluate((frameDt) => {
    const app = window.neonRoadRally;
    const capture = app.captureRoadDirectorSequence({
      officialRouteId: "boostline-neon-palm",
      raceTypeId: "boostline",
      waveLimit: 20,
      dt: frameDt,
      routeSeedLocked: true
    });
    const signature = app.getRoadDirectorRouteSignature(capture, { officialRouteId: "boostline-neon-palm" });
    return {
      hash: signature.hash,
      version: signature.version,
      waveCount: signature.waveCount,
      sequence: capture.sequence,
      visibleSpawnViolations: capture.boostlineVisibleSpawnViolations,
      preventedUnsafeSpawns: capture.preventedUnsafeSpawns
    };
  }, dt);
}

async function startBoostline(page) {
  await createDriverAndOpenSetup(page);
  const text = await bodyText(page);
  assertIncludes(text, "Experimental Prototype");
  assertIncludes(text, "Neon Palm Boostline");
  assertIncludes(text, "fixed boost/ramp line");
  assert(!text.includes("Pursuit"), "Pursuit should not appear in normal solo setup", { snippet: text.slice(0, 1200) });
  const normalRouteCards = await page.locator(".official-route-grid [data-official-route-id]").count();
  nodeAssert.strictEqual(normalRouteCards, 10, "Boostline should not be added to the normal Official 10 grid");
  const raceTypeValues = await page.$$eval("#preRaceType option", (options) => options.map((option) => option.value));
  assert(!raceTypeValues.includes("boostline"), "Boostline should not appear in the normal race type toggle", { raceTypeValues });
  assert(!raceTypeValues.includes("pursuit"), "Pursuit should not appear in the normal race type toggle", { raceTypeValues });
  await clickAction(page, "startBoostlinePrototype");
  await waitForScreen(page, "game");
  const run = await page.evaluate(() => {
    const activeRun = window.neonRoadRally.run || {};
    return {
      raceTypeId: activeRun.raceTypeId,
      officialRouteId: activeRun.officialRouteId,
      officialRouteName: activeRun.officialRouteName,
      routeSeedLocked: Boolean(activeRun.routeSeedLocked || activeRun.officialRouteSeedLocked),
      speedClassId: activeRun.speedClassId,
      trackId: activeRun.track?.id || ""
    };
  });
  nodeAssert.deepStrictEqual(run, {
    raceTypeId: "boostline",
    officialRouteId: "boostline-neon-palm",
    officialRouteName: "Neon Palm Boostline",
    routeSeedLocked: true,
    speedClassId: "turbo",
    trackId: "sunset-highway"
  }, "Boostline should start the fixed prototype route");
}

async function forceFinishBoostline(page, capture) {
  await page.evaluate((sequence) => {
    const app = window.neonRoadRally;
    const run = app.run;
    run.countdownTimer = 0;
    run.raceActive = true;
    run.elapsed = 52.321;
    run.distance = run.track.distanceToFinish;
    run.baseScore = 1000;
    run.score = 1000;
    run.roadDirectorSequence = sequence;
    run.boostPadsCollected = 18;
    run.boostPadsReachableSeen = 18;
    run.boostPadsMissedReachable = 0;
    run.bestBoostPadChain = 3;
    run.rampsUsed = 3;
    run.rampTargetsCleared = 3;
    run.manualBoosts = 0;
    run.manualBoostsUsed = 0;
    run.slowdownHits = 0;
    app.endRace("finished", "Boostline Browser Smoke Finish");
  }, capture.sequence);
  await waitForScreen(page, "score");
  const text = await bodyText(page);
  assertIncludes(text, "Boostline Prototype Result");
  assertIncludes(text, "Boostline Finished");
  assertIncludes(text, "Finish Time");
  assertIncludes(text, "PB Delta");
  assertIncludes(text, "Boost Chain");
  assertIncludes(text, "Ramps");
  assertIncludes(text, "Perfect boost chain");
  const scoreBoardButtons = await page.locator('[data-action="leaderboard"][data-view="scoreAttack"]').count();
  nodeAssert.strictEqual(scoreBoardButtons, 0, "Boostline first result actions should not include Score Board");
  const result = await page.evaluate(() => {
    const summary = window.neonRoadRally.lastSummary || {};
    return {
      routeSignatureHash: summary.routeSignatureHash,
      routeSignatureVersion: summary.routeSignatureVersion,
      routeSignatureWaveCount: summary.routeSignatureWaveCount,
      boostlineResultNote: summary.boostlineResultNote,
      finishTimeMs: summary.finishTimeMs,
      raceTypeId: summary.raceTypeId
    };
  });
  nodeAssert.strictEqual(result.routeSignatureHash, capture.hash, "Finished Boostline result should carry the fixed route signature");
  nodeAssert.strictEqual(result.routeSignatureVersion, "boostline-authored-spine-v1", "Boostline result should carry the Boostline signature version");
  nodeAssert.strictEqual(result.routeSignatureWaveCount, 8, "Boostline result should include the authored route wave count");
  nodeAssert.strictEqual(result.boostlineResultNote, "Perfect boost chain", "Finished Boostline note should be measured and clear");
  return result;
}

async function forceCrashBoostline(page, capture) {
  await page.evaluate(() => window.neonRoadRally.handleStartBoostlinePrototype());
  await waitForScreen(page, "game");
  await page.evaluate((sequence) => {
    const app = window.neonRoadRally;
    const run = app.run;
    run.countdownTimer = 0;
    run.raceActive = true;
    run.elapsed = 31.5;
    run.distance = run.track.distanceToFinish * 0.58;
    run.roadDirectorSequence = sequence.slice(0, 5);
    run.boostPadsCollected = 4;
    run.boostPadsReachableSeen = 7;
    run.boostPadsMissedReachable = 3;
    run.bestBoostPadChain = 1;
    run.rampsUsed = 1;
    run.rampTargetsCleared = 0;
    app.endRace("crashed", "slow car");
  }, capture.sequence);
  await waitForScreen(page, "score");
  const text = await bodyText(page);
  assertIncludes(text, "Boostline Run Over");
  assertIncludes(text, "Crashed before final chain");
  const result = await page.evaluate(() => ({
    status: window.neonRoadRally.lastSummary?.status || "",
    note: window.neonRoadRally.lastSummary?.boostlineResultNote || "",
    raceTypeId: window.neonRoadRally.lastSummary?.raceTypeId || ""
  }));
  nodeAssert.deepStrictEqual(result, {
    status: "crashed",
    note: "Crashed before final chain",
    raceTypeId: "boostline"
  }, "Crashed Boostline result should stay clear");
}

async function assertClassicFuelStillStart(page) {
  const starts = await page.evaluate(() => {
    const app = window.neonRoadRally;
    const results = [];
    [
      {
        routeId: "sunset-neon-palm-sprint",
        raceTypeId: "classic",
        seed: "SUNSET-PALM-SPRINT-TURBO",
        speedClassId: "turbo",
        trackId: "sunset-highway"
      },
      {
        routeId: "redline-switchyard-boostline",
        raceTypeId: "fuelRun",
        seed: "REDLINE-SWITCHYARD-BOOST-OD",
        speedClassId: "overdrive",
        trackId: "redline-run"
      }
    ].forEach((route) => {
      app.startRace({
        trackId: route.trackId,
        speedClassId: route.speedClassId,
        raceTypeId: route.raceTypeId,
        seed: route.seed,
        officialRouteId: route.routeId
      });
      results.push({
        routeId: route.routeId,
        expectedRaceType: route.raceTypeId,
        raceTypeId: app.run.raceTypeId,
        officialRouteId: app.run.officialRouteId,
        routeSeedLocked: Boolean(app.run.routeSeedLocked || app.run.officialRouteSeedLocked),
        partyMode: Boolean(app.run.partyMode)
      });
    });
    return results;
  });
  for (const row of starts) {
    nodeAssert.strictEqual(row.raceTypeId, row.expectedRaceType, "Classic/Fuel official route should preserve race type");
    nodeAssert.strictEqual(row.officialRouteId, row.routeId, "Classic/Fuel official route should still lock route id");
    nodeAssert.strictEqual(row.routeSeedLocked, true, "Classic/Fuel official route should still be seed locked");
    nodeAssert.strictEqual(row.partyMode, false, "Classic/Fuel solo route smoke should not enter party mode");
  }
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
    await startBoostline(page);
    const signatures = await Promise.all([0.4, 1 / 60, 1 / 30].map((dt) => captureBoostlineSignature(page, dt)));
    const expectedHash = signatures[0].hash;
    assert(signatures.every((signature) => signature.hash === expectedHash), "Boostline signatures should stay identical across repeated browser generation", { signatures });
    assert(signatures.every((signature) => signature.visibleSpawnViolations === 0), "Boostline should not create visible spawn violations", { signatures });
    assert(signatures.every((signature) => signature.preventedUnsafeSpawns === 0), "Boostline should not rely on unsafe spawn rejection", { signatures });
    const finishResult = await forceFinishBoostline(page, signatures[0]);
    await forceCrashBoostline(page, signatures[0]);
    await assertClassicFuelStillStart(page);
    if (consoleIssues.length) {
      throw new Error(`Console warnings/errors found: ${consoleIssues.join(" | ")}`);
    }
    console.log("BOOSTLINE_BROWSER_SMOKE_OK");
    console.log(JSON.stringify({
      signatureHash: expectedHash,
      signatureVersion: signatures[0].version,
      waveCount: signatures[0].waveCount,
      finishResult,
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
