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

const TRACK_ROUTES = {
  "sunset-highway": [
    { id: "sunset-neon-palm-sprint", name: "Neon Palm Sprint", seed: "SUNSET-PALM-SPRINT-TURBO", speedClass: "Turbo", feelTag: "clean speed" },
    { id: "sunset-boostline-pier", name: "Boostline Pier", seed: "SUNSET-BOOSTLINE-PIER-TURBO", speedClass: "Turbo", feelTag: "boost line" },
    { id: "sunset-glass-city-climb", name: "Glass City Climb", seed: "SUNSET-GLASS-CITY-CLIMB-TURBO", speedClass: "Turbo", feelTag: "ramp route" },
    { id: "sunset-orange-sky-switchback", name: "Orange Sky Switchback", seed: "SUNSET-SKY-SWITCHBACK-OVERDRIVE", speedClass: "Overdrive", feelTag: "lane discipline" },
    { id: "sunset-cactus-cutback", name: "Cactus Cutback", seed: "SUNSET-CACTUS-CUTBACK-OVERDRIVE", speedClass: "Overdrive", feelTag: "traffic pressure" },
    { id: "sunset-radio-tower-run", name: "Radio Tower Run", seed: "SUNSET-RADIO-TOWER-OVERDRIVE", speedClass: "Overdrive", feelTag: "final push" },
    { id: "sunset-heatwave-express", name: "Heatwave Express", seed: "SUNSET-HEATWAVE-EXPRESS-REDLINE", speedClass: "Redline", feelTag: "clean speed" },
    { id: "sunset-mirage-merge", name: "Mirage Merge", seed: "SUNSET-MIRAGE-MERGE-REDLINE", speedClass: "Redline", feelTag: "lane discipline" },
    { id: "sunset-afterburner-mile", name: "Afterburner Mile", seed: "SUNSET-AFTERBURNER-MILE-REDLINE", speedClass: "Redline", feelTag: "boost line" },
    { id: "sunset-last-light-gauntlet", name: "Last Light Gauntlet", seed: "SUNSET-LAST-LIGHT-REDLINE", speedClass: "Redline", feelTag: "final push" }
  ],
  "redline-run": [
    { id: "redline-tunnel-spark-sprint", name: "Tunnel Spark Sprint", seed: "REDLINE-TUNNEL-SPARK-TURBO", speedClass: "Turbo", feelTag: "clean speed" },
    { id: "redline-neon-gate-dash", name: "Neon Gate Dash", seed: "REDLINE-NEON-GATE-TURBO", speedClass: "Turbo", feelTag: "lane discipline" },
    { id: "redline-service-lane-slalom", name: "Service Lane Slalom", seed: "REDLINE-SERVICE-LANE-TURBO", speedClass: "Turbo", feelTag: "traffic pressure" },
    { id: "redline-overpass-charge", name: "Overpass Charge", seed: "REDLINE-OVERPASS-CHARGE-OD", speedClass: "Overdrive", feelTag: "final push" },
    { id: "redline-switchyard-boostline", name: "Switchyard Boostline", seed: "REDLINE-SWITCHYARD-BOOST-OD", speedClass: "Overdrive", feelTag: "boost line" },
    { id: "redline-concrete-ribbon", name: "Concrete Ribbon", seed: "REDLINE-CONCRETE-RIBBON-OD", speedClass: "Overdrive", feelTag: "clean speed" },
    { id: "redline-midnight-merge", name: "Midnight Merge", seed: "REDLINE-MIDNIGHT-MERGE-REDLINE", speedClass: "Redline", feelTag: "lane discipline" },
    { id: "redline-reactor-ramp", name: "Reactor Ramp", seed: "REDLINE-REACTOR-RAMP-REDLINE", speedClass: "Redline", feelTag: "ramp route" },
    { id: "redline-city-limits-blaze", name: "City Limits Blaze", seed: "REDLINE-CITY-LIMITS-REDLINE", speedClass: "Redline", feelTag: "traffic pressure" },
    { id: "redline-finale", name: "Redline Finale", seed: "REDLINE-FINALE-REDLINE", speedClass: "Redline", feelTag: "final push" }
  ]
};

const OFFICIAL_SCENARIOS = [
  { routeId: "sunset-neon-palm-sprint", trackId: "sunset-highway", raceType: "classic", score: 112300, time: 42.123 },
  { routeId: "sunset-last-light-gauntlet", trackId: "sunset-highway", raceType: "classic", score: 284500, time: 28.456 },
  { routeId: "redline-switchyard-boostline", trackId: "redline-run", raceType: "fuelRun", score: 219800, time: 35.789 }
];

function routeById(routeId) {
  return Object.values(TRACK_ROUTES).flat().find((route) => route.id === routeId);
}

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

async function clickAction(page, action, extraSelector = "") {
  const locator = page.locator(`[data-action="${action}"]${extraSelector}`);
  const count = await locator.count();
  assert(count === 1, `Expected one ${action} action`, { count, extraSelector });
  await locator.click();
}

async function openSoloSetup(page) {
  await clickAction(page, "start");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
}

async function selectTrack(page, trackId) {
  const card = page.locator(`[data-track-card="${trackId}"]`);
  const count = await card.count();
  assert(count === 1, `Expected one track card for ${trackId}`, { count });
  await card.click();
  await page.waitForFunction(
    (id) => document.querySelector(`input[name="preRaceTrack"][value="${id}"]`)?.checked === true,
    trackId,
    { timeout: 5000 }
  );
}

async function setRaceType(page, raceType) {
  const button = page.locator(`[data-race-type-choice="preRace"][data-value="${raceType}"]`);
  const count = await button.count();
  assert(count === 1, `Expected one race type button for ${raceType}`, { count });
  await button.click();
  await page.waitForFunction(
    (value) => document.querySelector("#preRaceType")?.value === value,
    raceType,
    { timeout: 5000 }
  );
}

async function assertTrackOfficial10(page, trackId, label) {
  await selectTrack(page, trackId);
  const routes = TRACK_ROUTES[trackId];
  const text = await bodyText(page);
  assertIncludes(text, `${label} Official 10`);
  assertIncludes(text, "Custom Road / Practice");
  assert(!text.includes("Pursuit"), "Pursuit should not appear in normal setup", { snippet: text.slice(0, 1200) });

  const cards = await page.$$eval(".official-route-grid [data-official-route-id]", (nodes) => (
    nodes.map((node) => ({
      id: node.dataset.officialRouteId,
      text: node.textContent || ""
    }))
  ));
  assert(cards.length === 10, `Expected 10 official route cards for ${trackId}`, { cards });
  for (const route of routes) {
    const card = cards.find((item) => item.id === route.id);
    assert(card, `Missing official route card: ${route.id}`, { cards });
    assertIncludes(card.text, route.name);
    assertIncludes(card.text, route.speedClass);
    assertIncludes(card.text, route.feelTag);
    assertIncludes(card.text, route.seed);
    assert(!/Arcade|Pro/i.test(`${route.name} ${route.speedClass}`), "Official cards should not use Arcade/Pro", { route });
  }

  const raceTypeValues = await page.$$eval("#preRaceType option", (options) => options.map((option) => option.value));
  assert(raceTypeValues.includes("classic"), "Classic missing from official setup race types", { raceTypeValues });
  assert(raceTypeValues.includes("fuelRun"), "Fuel Run missing from official setup race types", { raceTypeValues });
  assert(!raceTypeValues.includes("pursuit"), "Pursuit should not appear in normal solo setup", { raceTypeValues });
}

async function selectOfficialRoute(page, routeId) {
  const route = routeById(routeId);
  assert(route, `Unknown official route ${routeId}`);
  const locator = page.locator(`.official-route-grid [data-official-route-id="${routeId}"]`);
  const count = await locator.count();
  assert(count === 1, `Expected one route card for ${routeId}`, { count });
  await locator.click();
  await page.waitForFunction(
    ({ seed, name }) => (
      document.querySelector("#roadSeedInput")?.value === seed
      && document.querySelector("#soloSetupActionSummary")?.textContent?.includes(name)
    ),
    { seed: route.seed, name: route.name },
    { timeout: 5000 }
  );
}

async function finishCurrentRace(page, score, time) {
  await page.waitForFunction(() => window.neonRoadRally?.screen === "game", null, { timeout: 5000 });
  await page.waitForTimeout(350);
  const telemetry = await page.evaluate(() => {
    const run = window.neonRoadRally?.run || {};
    return {
      speedClassId: run.speedClassId || "",
      raceTypeId: run.raceTypeId || "",
      frameSampleCount: run.frameSampleCount || 0,
      averageFrameMs: Number((run.averageFrameMs || 0).toFixed(2)),
      worstFrameMs: Number((run.frameTimeMaxMs || 0).toFixed(2)),
      averageFps: Number((run.averageFps || 0).toFixed(1)),
      slowFramePercent: Number((run.slowFramePercent || 0).toFixed(2)),
      performanceEffectScale: Number((run.performanceEffectScale || 1).toFixed(2)),
      renderEffectScale: Number((run.renderEffectScale || 1).toFixed(2)),
      renderEffectScaleMin: Number((run.renderEffectScaleMin || 1).toFixed(2)),
      officialRouteId: run.officialRouteId || "",
      routeSeedLocked: Boolean(run.routeSeedLocked || run.officialRouteSeedLocked),
      routeSignatureHash: run.routeSignatureHash || ""
    };
  });
  assert(telemetry.frameSampleCount > 0, "Frame telemetry should collect samples on race screen", { telemetry });
  assert(telemetry.averageFrameMs > 0, "Frame telemetry should report average frame time", { telemetry });
  await page.evaluate(({ runScore, runTime }) => {
    const app = window.neonRoadRally;
    const run = app.run;
    run.countdownTimer = 0;
    run.raceActive = true;
    run.elapsed = runTime;
    run.distance = run.track.distanceToFinish;
    run.baseScore = runScore;
    run.score = runScore;
    run.manualBoostsUsed = 0;
    run.manualBoosts = 3;
    run.boostPadsCollected = 1;
    run.rampsUsed = 1;
    run.rampTargetsCleared = 1;
    run.nearMisses = 1;
    run.laneMoves = 2;
    run.slowdownHits = 0;
    if (run.raceTypeId === "fuelRun") {
      run.fuel = Math.max(run.fuel || 0, run.fuelMax || 80);
      run.gasCansCollected = Math.max(run.gasCansCollected || 0, 1);
      run.gasCansSpawned = Math.max(run.gasCansSpawned || 0, 1);
    }
    app.endRace("finished", "Official Routes Smoke Finish");
  }, { runScore: score, runTime: time });
  await page.waitForFunction(() => window.neonRoadRally?.screen === "score", null, { timeout: 5000 });
  return telemetry;
}

async function runOfficialScenario(page, scenario, options = {}) {
  const route = routeById(scenario.routeId);
  await selectTrack(page, scenario.trackId);
  await setRaceType(page, scenario.raceType);
  await selectOfficialRoute(page, scenario.routeId);
  const readyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(readyText, "Official Race");
  assertIncludes(readyText, route.name);
  await clickAction(page, "startSeededRace");
  const telemetry = await finishCurrentRace(page, scenario.score, scenario.time);
  const text = await bodyText(page);
  assertIncludes(text, "Official Race Result");
  assertIncludes(text, route.name);
  assertIncludes(text, route.seed);
  assertIncludes(text, `${scenario.time.toFixed(3)}s`);
  assertIncludes(text, "PB Delta");
  assertIncludes(text, "Top 20");
  await page.locator(".result-details-block summary").click();
  const detailText = await bodyText(page);
  assertIncludes(detailText, "Competition");
  assertIncludes(detailText, "Official Route");
  if (options.returnToSetup !== false) {
    await clickAction(page, "preRace");
    await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
  }
  return { routeId: scenario.routeId, telemetry };
}

async function assertOfficialTimeBoard(page) {
  await clickAction(page, "leaderboard", '[data-view="timeAttack"]');
  await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
  const text = await bodyText(page);
  assertIncludes(text, "Time Attack");
  assertIncludes(text, "Official Time Attack");
  assertIncludes(text, "Switchyard Boostline");
  assertIncludes(text, "35.789s");
  assertIncludes(text, "Fuel Run");
  await page.evaluate(() => window.neonRoadRally?.showPreRaceScreen());
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
}

async function selectPracticeSpeed(page, speedClassId) {
  await page.selectOption("#preRaceSpeedClass", speedClassId);
  await page.waitForFunction(
    (id) => document.querySelector("#preRaceSpeedClass")?.value === id,
    speedClassId,
    { timeout: 5000 }
  );
}

async function runCustomScenario(page) {
  await selectTrack(page, "sunset-highway");
  await setRaceType(page, "classic");
  await clickAction(page, "randomSeed");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });

  const speedOptions = await page.$$eval("#preRaceSpeedClass option", (options) => options.map((option) => option.value));
  assert(speedOptions.includes("arcade"), "Arcade should remain available in Custom Road / Practice", { speedOptions });
  assert(speedOptions.includes("pro"), "Pro should remain available in Custom Road / Practice", { speedOptions });

  await selectPracticeSpeed(page, "arcade");
  let readyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(readyText, "Custom Road");
  assertIncludes(readyText, "Arcade");

  await selectPracticeSpeed(page, "pro");
  readyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(readyText, "Custom Road");
  assertIncludes(readyText, "Pro");

  await selectPracticeSpeed(page, "turbo");
  const seed = "CUSTOM-OFFICIAL-SMOKE";
  const input = page.locator("#roadSeedInput");
  await input.fill(seed);
  await page.waitForFunction(
    (expectedSeed) => document.querySelector("#roadSeedInput")?.value === expectedSeed,
    seed,
    { timeout: 5000 }
  );
  readyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(readyText, "Custom Road");
  assertIncludes(readyText, seed);
  await clickAction(page, "startSeededRace");
  const telemetry = await finishCurrentRace(page, 98100, 48.321);
  const text = await bodyText(page);
  assertIncludes(text, "Custom Road Result");
  assertIncludes(text, "Custom Road");
  assertIncludes(text, seed);
  assert(!text.includes("Official Race Result"), "Custom result should not present as Official Race");
  return { routeId: "custom-road", telemetry };
}

async function runManualOfficialSeedScenario(page) {
  const route = routeById("sunset-neon-palm-sprint");
  await selectTrack(page, "sunset-highway");
  await setRaceType(page, "classic");
  await clickAction(page, "randomSeed");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
  await selectPracticeSpeed(page, "turbo");
  const input = page.locator("#roadSeedInput");
  await input.fill(route.seed);
  await page.waitForFunction(
    ({ seed, routeId, name }) => (
      document.querySelector("#roadSeedInput")?.value === seed
      && document.querySelector("#officialRouteInput")?.value === routeId
      && document.querySelector("#soloSetupCompetitionLabel")?.textContent?.includes("Official Race")
      && document.querySelector("#soloSetupActionSummary")?.textContent?.includes(name)
    ),
    { seed: route.seed, routeId: route.id, name: route.name },
    { timeout: 5000 }
  );
  const readyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(readyText, "Official Race");
  assertIncludes(readyText, route.name);
  await clickAction(page, "startSeededRace");
  const telemetry = await finishCurrentRace(page, 118800, 41.987);
  const text = await bodyText(page);
  assertIncludes(text, "Official Race Result");
  assertIncludes(text, route.name);
  assertIncludes(text, route.seed);
  assert(!text.includes("Custom Road Result"), "Official seed manual run should not present as Custom Road");
  await clickAction(page, "preRace");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
  return { routeId: route.id, telemetry, manualSeed: route.seed };
}

async function assertLeaderboards(page) {
  await clickAction(page, "leaderboard", '[data-view="scoreAttack"]');
  await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
  let text = await bodyText(page);
  assertIncludes(text, "Score Attack");
  assertIncludes(text, "Official 10");
  assertIncludes(text, "Official Score Attack");
  assertIncludes(text, "Neon Palm Sprint");
  assertIncludes(text, "Custom Road Scores");
  assertIncludes(text, "Practice, manual seed, and Challenge records preserved below Official 10");
  assertIncludes(text, "CUSTOM-OFFICIAL-SMOKE");
  const lowerScoreText = text.toLowerCase();
  assert(
    lowerScoreText.indexOf("official score attack") >= 0
      && lowerScoreText.indexOf("custom road scores") > lowerScoreText.indexOf("official score attack"),
    "Custom Road scores should appear below Official Score Attack"
  );
  const customScoreSection = lowerScoreText.slice(lowerScoreText.indexOf("custom road scores"));
  assert(!customScoreSection.includes("sunset-palm-sprint-turbo"), "Official seed should not appear in Custom Road Scores");

  await clickAction(page, "setLeaderboardView", '[data-view="timeAttack"]');
  await page.waitForFunction(() => window.neonRoadRally?.leaderboardView === "timeAttack", null, { timeout: 5000 });
  text = await bodyText(page);
  assertIncludes(text, "Time Attack");
  assertIncludes(text, "Official Time Attack");
  assertIncludes(text, "Neon Palm Sprint");
  assertIncludes(text, "42.123s");
  assertIncludes(text, "41.987s");
  assertIncludes(text, "Custom Road Times");
  assertIncludes(text, "48.321s");
  const lowerTimeText = text.toLowerCase();
  const customTimeSection = lowerTimeText.slice(lowerTimeText.indexOf("custom road times"));
  assert(!customTimeSection.includes("sunset-palm-sprint-turbo"), "Official seed should not appear in Custom Road Times");
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: BRAVE_PATH
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const consoleIssues = [];
  page.on("console", (msg) => {
    if (["warning", "error"].includes(msg.type())) consoleIssues.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      const app = window.neonRoadRally;
      app.profiles.data.players = [];
      app.profiles.data.currentPlayerId = null;
      const driver = app.profiles.createPlayer("Official QA");
      app.profiles.selectPlayer(driver.id);
      app.showTitle();
    });

    await openSoloSetup(page);
    await assertTrackOfficial10(page, "sunset-highway", "Sunset Highway");
    await assertTrackOfficial10(page, "redline-run", "Redline Run");

    await selectTrack(page, "sunset-highway");
    const telemetrySamples = [];
    for (let index = 0; index < OFFICIAL_SCENARIOS.length; index += 1) {
      telemetrySamples.push(await runOfficialScenario(page, OFFICIAL_SCENARIOS[index], { returnToSetup: index < OFFICIAL_SCENARIOS.length - 1 }));
    }
    await assertOfficialTimeBoard(page);
    telemetrySamples.push(await runManualOfficialSeedScenario(page));
    telemetrySamples.push(await runCustomScenario(page));
    await assertLeaderboards(page);

    const playtestRouteTelemetry = await page.evaluate(() => {
      const runs = window.neonRoadRally?.playtestReports?.getRuns?.() || [];
      return runs
        .filter((run) => run.officialRouteId)
        .map((run) => ({
          route: run.officialRouteName || run.officialRouteId,
          signatureHash: run.routeSignatureHash || "",
          routeSeedLocked: Boolean(run.routeSeedLocked),
          averageFps: Number((run.averageFps || 0).toFixed(1)),
          worstFrameMs: Number((run.worstFrameMs || 0).toFixed(1)),
          renderEffectScaleMin: Number((run.renderEffectScaleMin || 1).toFixed(2))
        }));
    });
    assert(playtestRouteTelemetry.some((run) => run.route === "Neon Palm Sprint" && run.signatureHash && run.routeSeedLocked), "Playtest Report should include official route signature and seed-lock telemetry", { playtestRouteTelemetry });

    assert(consoleIssues.length === 0, "Console warnings/errors found", { consoleIssues });
    console.log("OFFICIAL_ROUTES_BROWSER_SMOKE_OK");
    console.log(JSON.stringify({
      officialRoutes: Object.fromEntries(Object.entries(TRACK_ROUTES).map(([trackId, routes]) => [
        trackId,
        routes.map(({ id, name, seed, speedClass, feelTag }) => ({ id, name, seed, speedClass, feelTag }))
      ])),
      checkedOfficialScenarios: OFFICIAL_SCENARIOS.map((scenario) => ({
        ...scenario,
        name: routeById(scenario.routeId).name,
        seed: routeById(scenario.routeId).seed
      })),
      customSeed: "CUSTOM-OFFICIAL-SMOKE",
      frameTelemetry: telemetrySamples,
      playtestRouteTelemetry,
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
