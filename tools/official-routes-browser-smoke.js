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

const OFFICIAL_ROUTES = [
  ["sunset-highway-arcade", "Sunset Highway / Arcade", "SUNSET-ARCADE-OFFICIAL"],
  ["sunset-highway-pro", "Sunset Highway / Pro", "SUNSET-PRO-OFFICIAL"],
  ["sunset-highway-turbo", "Sunset Highway / Turbo", "SUNSET-TURBO-OFFICIAL"],
  ["sunset-highway-overdrive", "Sunset Highway / Overdrive", "SUNSET-OVERDRIVE-OFFICIAL"],
  ["sunset-highway-redline", "Sunset Highway / Redline", "SUNSET-REDLINE-OFFICIAL"],
  ["redline-run-arcade", "Redline Run / Arcade", "REDLINE-ARCADE-OFFICIAL"],
  ["redline-run-pro", "Redline Run / Pro", "REDLINE-PRO-OFFICIAL"],
  ["redline-run-turbo", "Redline Run / Turbo", "REDLINE-TURBO-OFFICIAL"],
  ["redline-run-overdrive", "Redline Run / Overdrive", "REDLINE-OVERDRIVE-OFFICIAL"],
  ["redline-run-redline", "Redline Run / Redline", "REDLINE-REDLINE-OFFICIAL"]
];

const OFFICIAL_SCENARIOS = [
  { id: "sunset-highway-arcade", name: "Sunset Highway / Arcade", seed: "SUNSET-ARCADE-OFFICIAL", score: 112300, time: 42.123 },
  { id: "sunset-highway-redline", name: "Sunset Highway / Redline", seed: "SUNSET-REDLINE-OFFICIAL", score: 284500, time: 28.456 },
  { id: "redline-run-turbo", name: "Redline Run / Turbo", seed: "REDLINE-TURBO-OFFICIAL", score: 219800, time: 35.789 }
];

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
    { snippet: text.slice(0, 800) }
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

async function assertOfficialSetup(page) {
  const text = await bodyText(page);
  assertIncludes(text, "Official Race Setup");
  assertIncludes(text, "Official 10");
  assertIncludes(text, "Custom Road / Practice");
  assertIncludes(text, "SUNSET-ARCADE-OFFICIAL");

  const routeIds = await page.$$eval("[data-official-route-id]", (nodes) => nodes.map((node) => node.dataset.officialRouteId));
  for (const [id, name, seed] of OFFICIAL_ROUTES) {
    assert(routeIds.includes(id), `Missing official route card: ${id}`);
    assertIncludes(text, name);
    assertIncludes(text, seed);
  }

  const raceTypeValues = await page.$$eval("#preRaceType option", (options) => options.map((option) => option.value));
  assert(raceTypeValues.includes("classic"), "Classic missing from solo setup race types", { raceTypeValues });
  assert(raceTypeValues.includes("fuelRun"), "Fuel Run missing from solo setup race types", { raceTypeValues });
  assert(!raceTypeValues.includes("pursuit"), "Pursuit should not appear in normal solo setup", { raceTypeValues });
}

async function selectOfficialRoute(page, routeId, expectedSeed) {
  const locator = page.locator(`.official-route-grid [data-official-route-id="${routeId}"]`);
  const count = await locator.count();
  assert(count === 1, `Expected one route card for ${routeId}`, { count });
  await locator.click();
  await page.waitForFunction(
    (seed) => document.querySelector("#roadSeedInput")?.value === seed,
    expectedSeed,
    { timeout: 5000 }
  );
}

async function finishCurrentRace(page, score, time) {
  await page.waitForFunction(() => window.neonRoadRally?.screen === "game", null, { timeout: 5000 });
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
    app.endRace("finished", "Official Routes Smoke Finish");
  }, { runScore: score, runTime: time });
  await page.waitForFunction(() => window.neonRoadRally?.screen === "score", null, { timeout: 5000 });
}

async function runOfficialScenario(page, scenario) {
  await selectOfficialRoute(page, scenario.id, scenario.seed);
  await clickAction(page, "startSeededRace");
  await finishCurrentRace(page, scenario.score, scenario.time);
  const text = await bodyText(page);
  assertIncludes(text, "Official Race Result");
  assertIncludes(text, scenario.name);
  assertIncludes(text, scenario.seed);
  assertIncludes(text, `${scenario.time.toFixed(3)}s`);
  assertIncludes(text, "PB Delta");
  assertIncludes(text, "Top 20");
  await page.locator(".result-details-block summary").click();
  const detailText = await bodyText(page);
  assertIncludes(detailText, "Competition");
  assertIncludes(detailText, "Official Route");
  await clickAction(page, "preRace");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
}

async function runCustomScenario(page) {
  const seed = "CUSTOM-OFFICIAL-SMOKE";
  const input = page.locator("#roadSeedInput");
  await input.fill(seed);
  await clickAction(page, "startSeededRace");
  await finishCurrentRace(page, 98100, 48.321);
  const text = await bodyText(page);
  assertIncludes(text, "Custom Road Result");
  assertIncludes(text, "Custom Road");
  assertIncludes(text, seed);
  assert(!text.includes("Official Race Result"), "Custom result should not present as Official Race");
  await clickAction(page, "leaderboard", '[data-view="scoreAttack"]');
  await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
}

async function assertLeaderboards(page) {
  let text = await bodyText(page);
  assertIncludes(text, "Score Attack");
  assertIncludes(text, "Official 10");
  assertIncludes(text, "Official Score Attack");
  assertIncludes(text, "Custom Road Scores");
  assertIncludes(text, "Practice, manual seed, and Challenge records preserved below Official 10");
  assertIncludes(text, "CUSTOM-OFFICIAL-SMOKE");
  const lowerScoreText = text.toLowerCase();
  assert(
    lowerScoreText.indexOf("official score attack") >= 0
      && lowerScoreText.indexOf("custom road scores") > lowerScoreText.indexOf("official score attack"),
    "Custom Road scores should appear below Official Score Attack"
  );

  await clickAction(page, "setLeaderboardView", '[data-view="timeAttack"]');
  await page.waitForFunction(() => window.neonRoadRally?.leaderboardView === "timeAttack", null, { timeout: 5000 });
  await clickAction(page, "leaderboard", '[data-view="timeAttack"][data-official-route-id="redline-run-turbo"]');
  await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
  text = await bodyText(page);
  assertIncludes(text, "Time Attack");
  assertIncludes(text, "Official Time Attack");
  assertIncludes(text, "Redline Run / Turbo");
  assertIncludes(text, "35.789s");
  assertIncludes(text, "Custom Road Times");
  assertIncludes(text, "48.321s");
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
    await assertOfficialSetup(page);
    for (const scenario of OFFICIAL_SCENARIOS) {
      await runOfficialScenario(page, scenario);
    }
    await runCustomScenario(page);
    await assertLeaderboards(page);

    assert(consoleIssues.length === 0, "Console warnings/errors found", { consoleIssues });
    console.log("OFFICIAL_ROUTES_BROWSER_SMOKE_OK");
    console.log(JSON.stringify({
      officialRoutes: OFFICIAL_ROUTES.map(([id, name, seed]) => ({ id, name, seed })),
      checkedOfficialScenarios: OFFICIAL_SCENARIOS.map(({ id, name, seed }) => ({ id, name, seed })),
      customSeed: "CUSTOM-OFFICIAL-SMOKE",
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
