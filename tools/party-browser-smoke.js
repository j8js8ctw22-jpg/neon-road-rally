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
const NORMAL_TRACKS = [
  { id: "sunset-highway", name: "Sunset Highway" },
  { id: "redline-run", name: "Redline Run" },
  { id: "midnight-ridge", name: "Midnight Ridge" },
  { id: "blackout-run", name: "Blackout Run" },
  { id: "prism-highway", name: "Prism Highway" }
];

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

  function assertNoNormalUiDebugTerms(text, label) {
    const lower = String(text || "").toLowerCase();
    [
      "schema",
      "migration",
      "signature",
      "hash",
      "seed",
      "write",
      "snapshot",
      "internal",
      "telemetry",
      "version",
      "scope",
      "officialfullroute",
      "runprogress",
      "debug"
    ].forEach((term) => {
      if (lower.includes(term)) throw new Error(`${label} should not expose ${term}: ${String(text).slice(0, 1000)}`);
    });
  }

  async function setPartyOption(selector, value, expectedText) {
    await page.selectOption(selector, value);
    const selectedValue = await page.locator(selector).inputValue();
    if (selectedValue !== value) throw new Error(`${selector} expected ${value}, saw ${selectedValue}`);
    if (expectedText) await expectText(expectedText);
  }

  async function openPartyOptions() {
    const options = page.locator(".party-options-panel").first();
    const isOpen = await options.evaluate((node) => node.open);
    if (!isOpen) await options.locator("summary").click();
  }

  async function assertPartyTrackSelection() {
    const cards = await page.$$eval('input[name="partyTrack"]', (nodes) => nodes.map((node) => ({
      id: node.value,
      label: node.closest("[data-track-card]")?.textContent.replace(/\s+/g, " ").trim() || "",
      descriptorCount: node.closest("[data-track-card]")?.querySelectorAll("em, small").length || 0
    })));
    if (cards.length !== NORMAL_TRACKS.length) {
      throw new Error(`Party setup expected ${NORMAL_TRACKS.length} normal tracks, saw ${cards.length}: ${JSON.stringify(cards)}`);
    }
    for (const track of NORMAL_TRACKS) {
      const card = cards.find((item) => item.id === track.id);
      if (!card || card.label !== track.name || card.descriptorCount !== 0) {
        throw new Error(`Party setup missing normal track ${track.name}: ${JSON.stringify(cards)}`);
      }
      await page.locator(`[data-track-card="${track.id}"]`).click();
      await page.waitForFunction(
        (id) => document.querySelector(`input[name="partyTrack"][value="${id}"]`)?.checked === true,
        track.id,
        { timeout: 5000 }
      );
      const raceTypes = await page.$$eval("#partyRaceType option", (options) => options.map((option) => option.value));
      if (!raceTypes.includes("classic") || !raceTypes.includes("fuelRun")) {
        throw new Error(`${track.name} Party setup should expose Classic and Fuel Run only: ${raceTypes.join(", ")}`);
      }
      if (raceTypes.includes("pursuit") || raceTypes.includes("boostline")) {
        throw new Error(`${track.name} Party setup should not expose Pursuit or Boostline: ${raceTypes.join(", ")}`);
      }
    }
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

  await clickText("Party Race");
  await expectText("Party Mode");
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    const setup = app.getPartySetup();
    setup.selectedPlayerIds = app.profiles.data.players.map((player) => player.id);
    app.showPartySetupScreen();
  });
  await expectText("3/8");
  const partySetupUi = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const start = document.querySelector(".party-start-action")?.getBoundingClientRect();
    const startSummary = document.querySelector("#partySetupActionSummary")?.textContent.replace(/\s+/g, " ").trim() || "";
    const trackHeights = Array.from(document.querySelectorAll("[data-track-card]")).map((node) => node.getBoundingClientRect().height);
    const driverHeights = Array.from(document.querySelectorAll(".party-driver-row")).map((node) => node.getBoundingClientRect().height);
    const speedHeights = Array.from(document.querySelectorAll(".mode-ladder.is-compact .mode-ladder-card")).map((node) => node.getBoundingClientRect().height);
    const raceTypeLabels = Array.from(document.querySelectorAll('[data-race-type-choice="party"]')).map((node) => node.textContent.replace(/\s+/g, " ").trim());
    const sectionLabels = Array.from(document.querySelectorAll(".party-setup-section .setup-section-heading .eyebrow")).map((node) => node.textContent.replace(/\s+/g, " ").trim());
    return {
      text,
      sectionLabels,
      oldSummaryCount: document.querySelectorAll(".party-summary-compact").length,
      oldStepCount: document.querySelectorAll(".party-flow-strip").length,
      startActionCount: document.querySelectorAll(".party-start-action").length,
      startSummary,
      startTop: start?.top || 9999,
      trackHeights,
      driverHeights,
      speedHeights,
      raceTypeLabels,
      driverRows: document.querySelectorAll(".party-driver-row").length,
      giantDriverCards: document.querySelectorAll(".driver-card.is-party-card").length,
      manageOpen: document.querySelector(".party-manage-details")?.open ?? true,
      optionsOpen: document.querySelector(".party-options-panel")?.open ?? true,
      visibleManagementCopy: /Rename|Remove|Up|Down/.test(text),
      hiddenOptionsCopyVisible: /Round|Road Code|Roster Order|Random Once|Random Every Round/.test(text)
    };
  });
  if (JSON.stringify(partySetupUi.sectionLabels) !== JSON.stringify(["Drivers", "Shared Race"])) {
    throw new Error(`Party setup should expose Drivers and Shared Race sections: ${JSON.stringify(partySetupUi.sectionLabels)}`);
  }
  if (partySetupUi.oldSummaryCount || partySetupUi.oldStepCount || partySetupUi.startActionCount !== 1) {
    throw new Error(`Party setup should keep one compact start summary: ${JSON.stringify({
      oldSummaryCount: partySetupUi.oldSummaryCount,
      oldStepCount: partySetupUi.oldStepCount,
      startActionCount: partySetupUi.startActionCount
    })}`);
  }
  if (partySetupUi.startTop > 360) throw new Error(`Start Party Round should remain high in the setup flow: ${partySetupUi.startTop}`);
  if (!/3 drivers · Classic · .* · /.test(partySetupUi.startSummary)) {
    throw new Error(`Start summary should use selected settings once: ${partySetupUi.startSummary}`);
  }
  if (!partySetupUi.trackHeights.every((height) => height <= 70)) {
    throw new Error(`Party track choices should be compact: ${JSON.stringify(partySetupUi.trackHeights)}`);
  }
  if (!partySetupUi.driverHeights.every((height) => height <= 62)) {
    throw new Error(`Party driver rows should stay compact: ${JSON.stringify(partySetupUi.driverHeights)}`);
  }
  if (!partySetupUi.speedHeights.every((height) => height <= 52)) {
    throw new Error(`Party speed choices should stay compact: ${JSON.stringify(partySetupUi.speedHeights)}`);
  }
  if (JSON.stringify(partySetupUi.raceTypeLabels) !== JSON.stringify(["Classic", "Fuel Run"])) {
    throw new Error(`Party race type should be a two-option toggle: ${JSON.stringify(partySetupUi.raceTypeLabels)}`);
  }
  if (partySetupUi.driverRows !== 3 || partySetupUi.giantDriverCards !== 0) {
    throw new Error(`Party drivers should use compact rows: ${JSON.stringify({ driverRows: partySetupUi.driverRows, giantDriverCards: partySetupUi.giantDriverCards })}`);
  }
  if (partySetupUi.manageOpen || partySetupUi.optionsOpen || partySetupUi.visibleManagementCopy || partySetupUi.hiddenOptionsCopyVisible) {
    throw new Error(`Party management/options should stay collapsed by default: ${JSON.stringify({
      manageOpen: partySetupUi.manageOpen,
      optionsOpen: partySetupUi.optionsOpen,
      visibleManagementCopy: partySetupUi.visibleManagementCopy,
      hiddenOptionsCopyVisible: partySetupUi.hiddenOptionsCopyVisible
    })}`);
  }
  if (/Pursuit|Boostline|Endurance/i.test(partySetupUi.text)) {
    throw new Error(`Party setup should not expose unsupported race families: ${partySetupUi.text.slice(0, 1000)}`);
  }
  assertNoNormalUiDebugTerms(partySetupUi.text, "Party setup");
  await assertPartyTrackSelection();
  await page.locator('[data-race-type-choice="party"][data-value="fuelRun"]').click();
  await expectText("Fuel Run");
  await page.locator('.mode-ladder-card[data-id="redline"]').click();
  await expectText("Redline");
  await page.locator('[data-race-type-choice="party"][data-value="classic"]').click();
  await expectText("Classic");
  await page.locator('.mode-ladder-card[data-id="turbo"]').click();
  await expectText("Turbo");
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    while (app.profiles.data.players.length < 8) {
      app.profiles.createPlayer(`Driver ${app.profiles.data.players.length + 1}`);
    }
    const setup = app.getPartySetup();
    setup.selectedPlayerIds = app.profiles.data.players.slice(0, 8).map((player) => player.id);
    app.showPartySetupScreen();
  });
  await expectText("8/8");
  const maxPartySummary = await page.textContent("#partySetupActionSummary");
  if (!/8 drivers/.test(maxPartySummary || "")) {
    throw new Error(`Party setup should support 8 selected drivers: ${maxPartySummary}`);
  }
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    const setup = app.getPartySetup();
    setup.selectedPlayerIds = app.profiles.data.players.slice(0, 3).map((player) => player.id);
    app.showPartySetupScreen();
  });
  await expectText("3/8");
  await setPartyOption("#partyRaceType", "classic", "Classic");
  await openPartyOptions();
  await setPartyOption("#partyStartingOrder", "rosterOrder");
  await setPartyOption("#partyStartingOrder", "randomOnce");
  await setPartyOption("#partyStartingOrder", "randomEveryRound");
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
  await page.locator('[data-race-type-choice="party"][data-value="fuelRun"]').click();
  await openPartyOptions();
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
  await clickText("Start Race");
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

  await clickText("Garage");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "players", null, { timeout: 5000 });
  await expectText("Driver Garage");
  await clickAction("title");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "title", null, { timeout: 5000 });

  await clickText("Records");
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
