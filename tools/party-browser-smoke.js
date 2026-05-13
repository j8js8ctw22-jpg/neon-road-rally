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

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    const app = window.neonRoadRally;
    app.profiles.data.players = [];
    app.profiles.data.currentPlayerId = null;
    const lucas = app.profiles.createPlayer("Lucas");
    app.profiles.createPlayer("Jonah");
    app.profiles.createPlayer("Nola");
    app.profiles.selectPlayer(lucas.id);
    app.showTitle();
  });

  async function clickText(text) {
    await page.getByRole("button", { name: new RegExp(text, "i") }).first().click();
  }

  async function clickAction(action) {
    await page.locator(`[data-action="${action}"]`).first().click();
  }

  async function expectText(text) {
    await page.getByText(new RegExp(text, "i")).filter({ visible: true }).first().waitFor({ timeout: 5000 });
  }

  async function setPartyOption(selector, value, expectedText) {
    await page.selectOption(selector, value);
    if (expectedText) await expectText(expectedText);
  }

  async function finishCurrentPartyRun(fields = {}) {
    await page.getByRole("button", { name: /^Start Run$/ }).click();
    await page.waitForFunction(() => window.neonRoadRally?.screen === "game", null, { timeout: 5000 });
    await page.evaluate((runFields) => {
      const app = window.neonRoadRally;
      const run = app.run;
      run.countdownTimer = 0;
      run.raceActive = true;
      run.elapsed = runFields.time ?? 45;
      run.distance = run.track.distanceToFinish;
      run.baseScore = runFields.baseScore ?? runFields.score ?? 50000;
      run.score = runFields.score ?? run.baseScore;
      run.manualBoostsUsed = runFields.manualBoostsUsed ?? 0;
      run.manualBoosts = Math.max(0, 3 - run.manualBoostsUsed);
      run.boostPadsCollected = runFields.boostPadsCollected ?? 0;
      run.rampsUsed = runFields.rampsUsed ?? 0;
      run.rampTargetsCleared = runFields.rampTargetsCleared ?? 0;
      run.nearMisses = runFields.nearMisses ?? 0;
      run.laneMoves = runFields.laneMoves ?? 0;
      run.slowdownHits = runFields.slowdownHits ?? 0;
      if (run.raceTypeId === "fuelRun") {
        run.gasCansCollected = runFields.gasCansCollected ?? 0;
        run.gasCansSpawned = runFields.gasCansSpawned ?? Math.max(run.gasCansCollected, 1);
        run.fuel = runFields.fuelRemaining ?? 25;
        run.lowestFuelReached = runFields.lowestFuelReached ?? run.fuel;
      }
      app.endRace(runFields.status || "finished", runFields.reason || "Smoke Finish");
    }, fields);
    await page.waitForFunction(() => ["partyStandings", "partyFinal"].includes(window.neonRoadRally?.screen), null, { timeout: 8000 });
  }

  async function advancePartyIfNeeded() {
    const final = await page.evaluate(() => window.neonRoadRally?.screen === "partyFinal");
    if (!final) {
      await page.getByRole("button", { name: /^Next Player$/ }).click();
      await page.waitForFunction(() => window.neonRoadRally?.screen === "partyTurn", null, { timeout: 5000 });
    }
    return final;
  }

  await clickText("Party Mode");
  await expectText("Party Mode");
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    const setup = app.getPartySetup();
    setup.selectedPlayerIds = app.profiles.data.players.map((player) => player.id);
    app.showPartySetupScreen();
  });
  await expectText("3/8");
  await setPartyOption("#partyRaceType", "classic", "Classic Race");
  await setPartyOption("#partyStartingOrder", "rosterOrder", "Roster Order");
  await setPartyOption("#partyStartingOrder", "randomOnce", "Random Once");
  await setPartyOption("#partyStartingOrder", "randomEveryRound", "Random Every Round");
  await page.selectOption("#partyRoundType", "bestOf3");
  await page.getByRole("button", { name: /Start Party Round/i }).first().click();
  await page.waitForFunction(() => window.neonRoadRally?.screen === "partyTurn", null, { timeout: 5000 });
  await expectText("Starting Order");
  await expectText("At the keyboard now");
  await expectText("Player 1 of 3");

  const classicRuns = [
    { score: 140000, nearMisses: 4, manualBoostsUsed: 2, laneMoves: 5 },
    { score: 180000, rampsUsed: 3, slowdownHits: 0 },
    { score: 120000, boostPadsCollected: 3, laneMoves: 2 },
    { score: 210000, nearMisses: 6, manualBoostsUsed: 1 },
    { score: 160000, rampsUsed: 5, slowdownHits: 0 },
    { score: 150000, laneMoves: 7, boostPadsCollected: 2 },
    { score: 230000, nearMisses: 7, manualBoostsUsed: 3 },
    { score: 170000, rampsUsed: 2, slowdownHits: 0 },
    { score: 190000, laneMoves: 4, boostPadsCollected: 2 }
  ];
  let sawRoundShuffle = false;
  for (const runFields of classicRuns) {
    await finishCurrentPartyRun(runFields);
    sawRoundShuffle = sawRoundShuffle || await page.getByText(/order shuffled/i).count().then((count) => count > 0);
    const final = await advancePartyIfNeeded();
    if (final) break;
  }
  await page.waitForFunction(() => window.neonRoadRally?.screen === "partyFinal", null, { timeout: 5000 });
  await expectText("Party Winner");
  await expectText("Final Standings");
  await expectText("Party Awards");
  if (!sawRoundShuffle) throw new Error("Random Every Round shuffle message not observed");

  await page.getByRole("button", { name: /Change (Players\/Mode|Setup)/i }).click();
  await page.waitForFunction(() => window.neonRoadRally?.screen === "partySetup", null, { timeout: 5000 });
  await page.selectOption("#partyRaceType", "fuelRun");
  await page.selectOption("#partyRoundType", "oneRunEach");
  await page.selectOption("#partyStartingOrder", "randomOnce");
  await page.getByRole("button", { name: /Start Party Round/i }).first().click();
  await page.waitForFunction(() => window.neonRoadRally?.screen === "partyTurn", null, { timeout: 5000 });

  const fuelRuns = [
    { score: 150000, gasCansCollected: 2, gasCansSpawned: 4, fuelRemaining: 38, lowestFuelReached: 20 },
    { score: 170000, gasCansCollected: 6, gasCansSpawned: 7, fuelRemaining: 8, lowestFuelReached: 5 },
    { score: 130000, gasCansCollected: 3, gasCansSpawned: 5, fuelRemaining: 28, lowestFuelReached: 15 }
  ];
  for (const runFields of fuelRuns) {
    await finishCurrentPartyRun(runFields);
    const final = await advancePartyIfNeeded();
    if (final) break;
  }
  await page.waitForFunction(() => window.neonRoadRally?.screen === "partyFinal", null, { timeout: 5000 });
  await expectText("Fuel Saver");
  await expectText("Gas Grabber");

  await page.getByRole("button", { name: /(Return|Back) to Title/i }).click();
  await page.waitForFunction(() => window.neonRoadRally?.screen === "title", null, { timeout: 5000 });
  await clickText("Solo Race");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
  await page.selectOption("#preRaceType", "classic");
  await page.selectOption("#preRaceType", "fuelRun");
  const soloRaceTypeValues = await page.$$eval("#preRaceType option", (options) => options.map((option) => option.value));
  if (!soloRaceTypeValues.includes("classic") || !soloRaceTypeValues.includes("fuelRun")) {
    throw new Error(`Solo setup missing expected race types: ${soloRaceTypeValues.join(", ")}`);
  }
  if (soloRaceTypeValues.includes("pursuit")) {
    throw new Error("Pursuit should not appear in normal solo setup");
  }
  await page.getByRole("button", { name: /^Back( to Title)?$/ }).click();
  await page.waitForFunction(() => window.neonRoadRally?.screen === "title", null, { timeout: 5000 });

  await clickText("Driver Garage");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "players", null, { timeout: 5000 });
  await expectText("Driver Garage");
  await clickAction("title");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "title", null, { timeout: 5000 });

  await clickText("Leaderboard");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
  await expectText("Score Attack");
  await expectText("Time Attack");
  await clickAction("title");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "title", null, { timeout: 5000 });

  await clickText("Settings");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "settings", null, { timeout: 5000 });
  await clickText("Playtest Tools");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "playtestReport", null, { timeout: 5000 });
  await expectText("Playtest Report");

  const result = await page.evaluate(() => ({
    screen: window.neonRoadRally.screen,
    partyReports: window.neonRoadRally.playtestReports.getRuns().filter((run) => run.partyMode).length,
    partyAwardReports: window.neonRoadRally.playtestReports.getRuns().filter((run) => run.partyAwardCategories?.length).length,
    partyStartingOrderModes: Array.from(new Set(window.neonRoadRally.playtestReports.getRuns().filter((run) => run.partyMode).map((run) => run.partyStartingOrderMode)))
  }));
  await browser.close();

  if (consoleIssues.length) throw new Error(`Console issues: ${consoleIssues.join(" | ")}`);
  console.log(JSON.stringify({ ok: true, sawRoundShuffle, ...result }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
