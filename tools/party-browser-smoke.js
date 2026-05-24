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

  function assertNoFirstViewportDebugTerms(text, label) {
    const lower = String(text || "").toLowerCase();
    [
      "signature",
      "route hash",
      "runprogress",
      "officialfullroute",
      "telemetry",
      "raw pacing",
      "pacing version",
      "debug"
    ].forEach((term) => {
      if (lower.includes(term)) throw new Error(`${label} first viewport should not expose ${term}: ${String(text).slice(0, 1000)}`);
    });
  }

  async function getFirstViewportText() {
    return page.evaluate(() => [
      ".result-header",
      ".result-payoff",
      ".playground-record-card",
      ".result-quiet-actions",
      ".party-drama-header",
      ".party-last-run-card",
      ".official-record-chase-hero"
    ].map((selector) => document.querySelector(selector)?.innerText || "").filter(Boolean).join("\n"));
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

  async function installVirtualGamepad() {
    await page.evaluate(() => {
      window.__nrrVirtualPad = null;
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => (window.__nrrVirtualPad ? [window.__nrrVirtualPad] : [])
      });
    });
  }

  async function setVirtualGamepad({ buttons = [], axes = [0, 0] } = {}, frames = 1) {
    return page.evaluate(({ buttons, axes, frames }) => {
      const buttonSet = new Set(buttons);
      window.__nrrVirtualPad = {
        connected: true,
        index: 0,
        id: "DualSense Browser QA",
        mapping: "standard",
        axes,
        buttons: Array.from({ length: 16 }, (_, index) => ({
          pressed: buttonSet.has(index),
          value: buttonSet.has(index) ? 1 : 0
        }))
      };
      const started = performance.now();
      const app = window.neonRoadRally;
      for (let frame = 0; frame < frames; frame += 1) app.input.update(1 / 60);
      return performance.now() - started;
    }, { buttons, axes, frames });
  }

  async function pressVirtualGamepad(options, frames = 2) {
    const durationMs = await setVirtualGamepad(options, frames);
    await setVirtualGamepad({}, 2);
    return durationMs;
  }

  async function focusMenuSelector(selector) {
    await page.evaluate((targetSelector) => {
      const app = window.neonRoadRally;
      const target = document.querySelector(targetSelector);
      if (!target) throw new Error(`Missing focus target: ${targetSelector}`);
      app.input.focusMenuElement(target);
    }, selector);
  }

  async function assertControllerDirectionsDoNotChangeSelect(selector, label) {
    await focusMenuSelector(selector);
    const before = await page.locator(selector).inputValue();
    const visibleFocusBefore = await page.evaluate((targetSelector) => {
      const target = document.querySelector(targetSelector);
      return Boolean(target?.classList?.contains("is-controller-focused"));
    }, selector);
    await pressVirtualGamepad({ buttons: [15] });
    await pressVirtualGamepad({ buttons: [14] });
    const after = await page.locator(selector).inputValue();
    if (after !== before) {
      throw new Error(`${label} select changed from ${before} to ${after} on controller left/right`);
    }
    return { before, after, visibleFocusBefore };
  }

  async function runLeaderboardControllerSelectQa() {
    await installVirtualGamepad();
    await page.evaluate(() => window.neonRoadRally.showLeaderboard("scoreAttack"));
    await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
    const track = await assertControllerDirectionsDoNotChangeSelect("#leaderboardTrack", "Leaderboard Track");
    const route = await assertControllerDirectionsDoNotChangeSelect("#leaderboardRoute", "Leaderboard Route");
    const raceType = await assertControllerDirectionsDoNotChangeSelect("#leaderboardRaceType", "Leaderboard Race Type");
    await focusMenuSelector("#leaderboardRaceType");
    await pressVirtualGamepad({ buttons: [0] });
    const raceTypeAfterCross = await page.locator("#leaderboardRaceType").inputValue();
    if (raceTypeAfterCross !== raceType.before) {
      throw new Error(`Leaderboard Race Type changed on Cross activation without selection: ${raceType.before} -> ${raceTypeAfterCross}`);
    }
    await page.selectOption("#leaderboardRaceType", "fuelRun");
    await page.waitForFunction(() => document.querySelector("#leaderboardRaceType")?.value === "fuelRun", null, { timeout: 5000 });
    const mouseSelectRaceType = await page.locator("#leaderboardRaceType").inputValue();
    await page.selectOption("#leaderboardRaceType", "classic");
    await page.waitForFunction(() => document.querySelector("#leaderboardRaceType")?.value === "classic", null, { timeout: 5000 });
    await page.evaluate(() => {
      window.__nrrBackToTitleStartedAt = performance.now();
    });
    const backInputDurationMs = await pressVirtualGamepad({ buttons: [1] });
    await page.waitForFunction(() => window.neonRoadRally?.screen === "title", null, { timeout: 5000 });
    const titleSettledMs = await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - window.__nrrBackToTitleStartedAt)));
    }));
    if (titleSettledMs > 250) {
      throw new Error(`Back to Title transition took too long: ${titleSettledMs.toFixed(1)}ms`);
    }
    return {
      track,
      route,
      raceType,
      mouseSelectRaceType,
      backInputDurationMs: Number(backInputDurationMs.toFixed(2)),
      titleSettledMs: Number(titleSettledMs.toFixed(2))
    };
  }

  async function runControllerMenuNavigationQa() {
    await installVirtualGamepad();
    await page.evaluate(() => {
      const app = window.neonRoadRally;
      app.showTitle();
    });
    await page.waitForFunction(() => document.activeElement?.dataset?.action === "start", null, { timeout: 5000 });
    const titleFocusVisible = await page.evaluate(() => {
      const active = document.activeElement;
      return Boolean(active?.classList?.contains("is-controller-focused") && document.querySelector("#screenLayer")?.classList?.contains("is-menu-navigation-active"));
    });
    await pressVirtualGamepad({ buttons: [13] });
    await page.waitForFunction(() => document.activeElement?.dataset?.action === "partyMode", null, { timeout: 5000 });
    await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction(() => window.neonRoadRally?.screen === "partySetup", null, { timeout: 5000 });

    await page.evaluate(() => {
      const app = window.neonRoadRally;
      const setup = app.getPartySetup();
      setup.selectedPlayerIds = app.profiles.data.players.slice(0, 3).map((player) => player.id);
      setup.bonusSurvival = "off";
      app.showPartySetupScreen();
    });
    await focusMenuSelector(".party-manage-details > summary");
    await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction(() => document.querySelector(".party-manage-details")?.open === true, null, { timeout: 5000 });
    const beforeOrder = await page.$$eval(".party-order-card", (rows) => rows.map((row) => row.dataset.partyOrderId));
    await focusMenuSelector('.party-order-card [data-action="partyMovePlayer"][data-dir="1"]:not([disabled])');
    await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction((oldOrder) => {
      const nextOrder = Array.from(document.querySelectorAll(".party-order-card")).map((row) => row.dataset.partyOrderId);
      return document.querySelector(".party-manage-details")?.open === true && JSON.stringify(nextOrder) !== JSON.stringify(oldOrder);
    }, beforeOrder, { timeout: 5000 });

    await focusMenuSelector(".party-options-panel > summary");
    await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction(() => document.querySelector(".party-options-panel")?.open === true, null, { timeout: 5000 });
    await page.evaluate(() => {
      const select = document.querySelector("#partyBonusSurvival");
      select.value = "off";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await focusMenuSelector("#partyBonusSurvival");
    await pressVirtualGamepad({ buttons: [15] });
    const partyBonusAfterControllerRight = await page.locator("#partyBonusSurvival").inputValue();
    if (partyBonusAfterControllerRight !== "off") {
      throw new Error(`Party Bonus Survival select changed on controller right: ${partyBonusAfterControllerRight}`);
    }
    await page.selectOption("#partyBonusSurvival", "on");
    await page.waitForFunction(() => (
      document.querySelector(".party-options-panel")?.open === true &&
      document.querySelector("#partyBonusSurvival")?.value === "on"
    ), null, { timeout: 5000 });

    await page.evaluate(() => window.neonRoadRally.showDriverGarageScreen());
    await focusMenuSelector(".garage-rewards-details > summary");
    await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction(() => document.querySelector(".garage-rewards-details")?.open === true, null, { timeout: 5000 });
    await focusMenuSelector('.badge-filter-button[data-filter="mastery"]');
    const masteryDurationMs = await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction(() => (
      document.querySelector(".garage-rewards-details")?.open === true &&
      document.querySelector(".badge-filter-button.is-active")?.dataset?.filter === "mastery"
    ), null, { timeout: 5000 });
    await focusMenuSelector('.badge-filter-button[data-filter="all"]');
    const allDurationMs = await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction(() => (
      document.querySelector(".garage-rewards-details")?.open === true &&
      document.querySelector(".badge-filter-button.is-active")?.dataset?.filter === "all"
    ), null, { timeout: 5000 });

    await page.evaluate(() => window.neonRoadRally.showSettingsScreen());
    await focusMenuSelector(".settings-tools-details > summary");
    await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction(() => (
      document.querySelector(".settings-tools-details")?.open === true &&
      Boolean(document.querySelector(".settings-controller-diagnostics"))
    ), null, { timeout: 5000 });
    await page.evaluate(() => window.neonRoadRally.showTitle());

    return {
      titleFocusVisible,
      partyScreenReached: true,
      manageStayedOpen: true,
      partyOptionsStayedOpen: true,
      garageRewardsStayedOpen: true,
      garageMasteryDurationMs: Number(masteryDurationMs.toFixed(2)),
      garageAllDurationMs: Number(allDurationMs.toFixed(2)),
      settingsControllerDiagnosticReached: true
    };
  }

  async function runPartyManageDriverReorderQa() {
    await page.evaluate(() => {
      const app = window.neonRoadRally;
      const setup = app.getPartySetup();
      setup.selectedPlayerIds = app.profiles.data.players.slice(0, 3).map((player) => player.id);
      setup.startingOrderMode = "rosterOrder";
      app.showPartySetupScreen();
    });
    await expectText("3/8");

    const disclosureSelector = (label) => {
      if (label === "Manage Drivers") return ".party-manage-details";
      if (label === "Party Options") return ".party-options-panel";
      throw new Error(`Unknown Party setup disclosure: ${label}`);
    };
    const openDisclosure = async (label) => {
      const details = page.locator(disclosureSelector(label)).first();
      if (!await details.evaluate((node) => node.open)) {
        await details.locator("summary").click();
      }
      await expectDisclosureOpen(label);
    };
    const expectDisclosureOpen = async (label) => {
      const selector = disclosureSelector(label);
      const open = await page.locator(selector).first().evaluate((node) => node.open);
      if (!open) throw new Error(`${label} should remain open`);
    };
    const expectNoPartySetupReset = async () => {
      const report = await page.evaluate(() => ({
        screen: window.neonRoadRally?.screen || "",
        setupScreens: document.querySelectorAll(".party-setup-screen").length,
        startActions: document.querySelectorAll(".party-start-action").length,
        manageOpen: document.querySelector(".party-manage-details")?.open === true,
        optionsOpen: document.querySelector(".party-options-panel")?.open === true
      }));
      if (report.screen !== "partySetup" || report.setupScreens !== 1 || report.startActions !== 1 || !report.manageOpen || !report.optionsOpen) {
        throw new Error(`Party setup should stay in place with both panels open: ${JSON.stringify(report)}`);
      }
    };
    const orderIds = async () => page.$$eval(".party-order-card", (rows) => rows.map((row) => row.dataset.partyOrderId));
    const orderNames = async () => page.$$eval(".party-order-card strong", (nodes) => nodes.map((node) => node.textContent.replace(/^\d+\.\s*/, "").trim()));
    const expectPartyRosterOrder = async (expectedIds) => {
      await page.waitForFunction((expected) => {
        const rows = Array.from(document.querySelectorAll(".party-order-card")).map((row) => row.dataset.partyOrderId);
        return JSON.stringify(rows) === JSON.stringify(expected);
      }, expectedIds, { timeout: 5000 });
      await expectNoPartySetupReset();
      return orderNames();
    };

    await openDisclosure("Manage Drivers");
    await openDisclosure("Party Options");
    const initialIds = await orderIds();
    if (initialIds.length !== 3) throw new Error(`Manage Drivers reorder QA expected 3 selected drivers: ${JSON.stringify(initialIds)}`);

    const clickMove = async (id, dir, expectedIds) => {
      await page.locator(`.party-order-card[data-party-order-id="${id}"] [data-action="partyMovePlayer"][data-dir="${dir}"]`).click();
      await expectPartyRosterOrder(expectedIds);
    };

    await clickMove(initialIds[0], "1", [initialIds[1], initialIds[0], initialIds[2]]);
    await clickMove(initialIds[0], "1", [initialIds[1], initialIds[2], initialIds[0]]);
    await clickMove(initialIds[0], "-1", [initialIds[1], initialIds[0], initialIds[2]]);

    const afterRepeatedMoves = await orderIds();
    const afterRepeatedMoveNames = await orderNames();
    const focusReport = await page.evaluate((driverId) => {
      const active = document.activeElement;
      return {
        manageOpen: document.querySelector(".party-manage-details")?.open === true,
        activeDriverId: active?.dataset?.partyOrderId || active?.closest?.("[data-party-order-id]")?.dataset?.partyOrderId || "",
        activeAction: active?.dataset?.action || ""
      };
    }, initialIds[0]);
    if (!focusReport.manageOpen || focusReport.activeDriverId !== initialIds[0]) {
      throw new Error(`Manage Drivers should stay open with focus near the moved row: ${JSON.stringify(focusReport)}`);
    }

    await page.locator(`.party-order-card[data-party-order-id="${initialIds[2]}"] [data-action="partyRemovePlayer"]`).click();
    await expectPartyRosterOrder([initialIds[1], initialIds[0]]);
    await page.locator("#partyNewDriverName").fill("Mira");
    await page.locator(".party-add-driver-button").click();
    await page.waitForFunction(() => {
      const rows = Array.from(document.querySelectorAll(".party-order-card")).map((row) => row.textContent || "");
      return rows.length === 3 && rows.some((text) => /Mira/.test(text));
    }, null, { timeout: 5000 });
    await expectNoPartySetupReset();

    const afterAddIds = await orderIds();
    const afterAddNames = await page.evaluate((ids) => ids.map((id) => window.neonRoadRally.profiles.getPlayerById(id)?.name || ""), afterAddIds);
    const beforeSeed = await page.locator("#partySeedInput").inputValue();
    await page.locator('[data-action="partyRandomSeed"]').click();
    await page.waitForFunction((oldSeed) => document.querySelector("#partySeedInput")?.value !== oldSeed, beforeSeed, { timeout: 5000 });
    await expectNoPartySetupReset();

    await setPartyOption("#partyBonusSurvival", "on", "On");
    await expectNoPartySetupReset();
    await setPartyOption("#partyBonusSurvival", "off", "Off");
    await expectNoPartySetupReset();
    await setPartyOption("#partySeedMode", "newSeedEachRound");
    await expectNoPartySetupReset();
    await setPartyOption("#partySeedMode", "sameSeedForRound");
    await expectNoPartySetupReset();
    await page.locator('[data-track-card="redline-run"]').click();
    await page.waitForFunction(() => document.querySelector('input[name="partyTrack"][value="redline-run"]')?.checked === true, null, { timeout: 5000 });
    await expectNoPartySetupReset();
    await page.locator('.mode-ladder-card[data-id="redline"]').click();
    await page.waitForFunction(() => document.querySelector("#partyRaceMode")?.value === "redline", null, { timeout: 5000 });
    await expectNoPartySetupReset();
    await page.locator('[data-race-type-choice="party"][data-value="fuelRun"]').click();
    await page.waitForFunction(() => document.querySelector("#partyRaceType")?.value === "fuelRun", null, { timeout: 5000 });
    await expectNoPartySetupReset();
    await page.locator('[data-race-type-choice="party"][data-value="classic"]').click();
    await page.waitForFunction(() => document.querySelector("#partyRaceType")?.value === "classic", null, { timeout: 5000 });
    await expectNoPartySetupReset();

    await page.selectOption("#partyStartingOrder", "rosterOrder");
    await expectNoPartySetupReset();
    await page.getByRole("button", { name: /Start Party Race/i }).first().click();
    await page.waitForFunction(() => window.neonRoadRally?.screen === "partyTurn", null, { timeout: 5000 });
    const turnOrderNames = await page.$$eval(".party-turn-order-list li span", (nodes) => nodes.map((node) => node.textContent.trim()));
    const expectedTurnOrderNames = await page.evaluate((ids) => ids.map((id) => window.neonRoadRally.profiles.getPlayerById(id)?.name || ""), afterAddIds);
    if (JSON.stringify(turnOrderNames) !== JSON.stringify(expectedTurnOrderNames)) {
      throw new Error(`Party Race should use reordered roster: ${JSON.stringify({ turnOrderNames, expectedTurnOrderNames })}`);
    }

    await page.getByRole("button", { name: /Change Setup/i }).click();
    await page.waitForFunction(() => window.neonRoadRally?.screen === "partySetup", null, { timeout: 5000 });
    const afterReturnOpen = await page.locator(".party-manage-details").first().evaluate((node) => node.open);
    await page.evaluate(() => {
      const app = window.neonRoadRally;
      app.profiles.data.players = app.profiles.data.players.slice(0, 3);
      app.profiles.data.currentPlayerId = app.profiles.data.players[0]?.id || null;
      const setup = app.getPartySetup();
      setup.selectedPlayerIds = app.profiles.data.players.slice(0, 3).map((player) => player.id);
      app.showPartySetupScreen();
    });

    return {
      initialNames: await page.evaluate((ids) => ids.map((id) => window.neonRoadRally.profiles.getPlayerById(id)?.name || ""), initialIds),
      afterRepeatedMovesNames: afterRepeatedMoveNames,
      afterAddNames,
      turnOrderNames,
      manageStayedOpen: focusReport.manageOpen,
      partyOptionsStayedOpen: true,
      afterReturnOpen
    };
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

  async function finishCurrentPartyRun(fields = {}, options = {}) {
    if (options.startVia === "keyboard") {
      await page.keyboard.press("Enter");
    } else {
      await page.getByRole("button", { name: /^Start (Official )?Run$/ }).click();
    }
    await page.waitForFunction(() => window.neonRoadRally?.screen === "game", null, { timeout: 5000 });
    await page.evaluate((runFields) => {
      const app = window.neonRoadRally;
      const run = app.run;
      run.countdownTimer = 0;
      run.raceActive = true;
      run.elapsed = runFields.time ?? 45;
      const status = runFields.status || "finished";
      const progress = Number.isFinite(runFields.progress) ? Math.max(0, Math.min(1, runFields.progress)) : 0.62;
      run.distance = status === "finished" ? run.track.distanceToFinish : run.track.distanceToFinish * progress;
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
      app.endRace(status, runFields.reason || "Smoke Finish");
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

  async function runPartyBonusSurvivalQa() {
    const report = await page.evaluate(() => {
      const app = window.neonRoadRally;
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = () => 0;
      try {
        const players = app.profiles.data.players.slice(0, 3);
        const startPartyRun = (bonusSurvival) => {
          app.partySession = new PartySession({
            players,
            sharedSeed: "ROAD-11111",
            raceType: "classic",
            bonusSurvival,
            startingOrderMode: PARTY_STARTING_ORDER_MODE_ROSTER
          });
          app.startCurrentPartyRun({ force: true });
          const run = app.run;
          run.countdownTimer = 0;
          run.raceActive = true;
          run.elapsed = 42;
          run.distance = run.track.distanceToFinish;
          run.baseScore = 90000;
          run.score = 90000;
          run.manualBoosts = 3;
          run.manualBoostsUsed = 0;
          run.currentSpeed = Math.max(run.currentSpeed || 0, 3600);
          return run;
        };

        startPartyRun("off");
        app.handleFinishLineCrossing();
        const off = {
          ended: Boolean(app.run.ended),
          officialEnduranceActive: Boolean(app.run.officialEnduranceActive),
          results: app.partySession.results.length,
          resultReason: app.partySession.results[0]?.reason || "",
          resultScore: app.partySession.results[0]?.score || 0
        };

        startPartyRun("on");
        app.handleFinishLineCrossing();
        const afterFinish = {
          ended: Boolean(app.run.ended),
          officialEnduranceActive: Boolean(app.run.officialEnduranceActive),
          officialFinishLocked: Boolean(app.run.officialFinishLocked),
          results: app.partySession.results.length,
          canEnd: app.canEndOfficialEndurance()
        };

        app.run.elapsed += 18;
        app.run.score += 7000;
        app.run.distance = Math.min(app.run.track.distanceToFinish - 1, 42000);
        app.updateOfficialEnduranceStats();
        app.endOfficialEndurance("Driver Ended");
        const result = app.partySession.results[0] || {};
        const final = {
          results: app.partySession.results.length,
          status: result.status || "",
          reason: result.reason || "",
          score: result.score || 0,
          officialFinishScore: result.officialFinishScore || 0,
          bonusSurvivalScore: result.bonusSurvivalScore || 0,
          bonusSurvivalTime: result.bonusSurvivalTime || 0,
          partyBonusSurvival: Boolean(result.partyBonusSurvival),
          summaryHasEndurance: Boolean(app.lastSummary?.officialEnduranceResult)
        };

        app.partySession = null;
        app.partySetup = app.createDefaultPartySetup();
        app.partySetup.selectedPlayerIds = app.profiles.data.players.slice(0, 3).map((player) => player.id);
        app.showPartySetupScreen();
        return { off, afterFinish, final };
      } finally {
        window.setTimeout = originalSetTimeout;
      }
    });
    if (!report.off.ended || report.off.officialEnduranceActive || report.off.results !== 1) {
      throw new Error(`Party Bonus Survival off should finish normally: ${JSON.stringify(report.off)}`);
    }
    if (report.afterFinish.ended || !report.afterFinish.officialEnduranceActive || !report.afterFinish.officialFinishLocked || report.afterFinish.results !== 0 || !report.afterFinish.canEnd) {
      throw new Error(`Party Bonus Survival on should defer Party result and continue survival: ${JSON.stringify(report.afterFinish)}`);
    }
    if (report.final.results !== 1 || report.final.status !== "finished" || report.final.reason !== "Official Finish + Bonus Survival" || !report.final.partyBonusSurvival || !(report.final.bonusSurvivalScore > 0) || !report.final.summaryHasEndurance) {
      throw new Error(`Party Bonus Survival final result should combine official finish and bonus survival: ${JSON.stringify(report.final)}`);
    }
    return report;
  }

  async function runOfficialRecordChaseQa() {
    const startingPlaygroundCount = await page.evaluate(() => window.neonRoadRally?.profiles?.data?.playgroundRecords?.length || 0);
    await installVirtualGamepad();
    await page.evaluate(() => {
      const app = window.neonRoadRally;
      app.partySession = null;
      app.partySetup = app.createDefaultPartySetup();
      app.partySetup.selectedPlayerIds = app.profiles.data.players.slice(0, 3).map((player) => player.id);
      app.preRaceLaunchContext = "official";
      app.showPreRaceScreen();
    });
    await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
    await page.locator('[data-action="officialRecordChaseSetup"]').first().click();
    await page.waitForFunction(() => window.neonRoadRally?.screen === "officialRecordChaseSetup", null, { timeout: 5000 });
    const officialSetupEntry = await page.evaluate(() => ({
      screen: window.neonRoadRally.screen,
      copy: document.body.innerText.includes("Everyone runs the same official route. Records still count.")
    }));
    if (officialSetupEntry.screen !== "officialRecordChaseSetup" || !officialSetupEntry.copy) {
      throw new Error(`Official Race setup should enter Official Record Chase with clear copy: ${JSON.stringify(officialSetupEntry)}`);
    }

    await page.evaluate(() => {
      const app = window.neonRoadRally;
      app.partySession = null;
      app.partySetup = app.createDefaultPartySetup();
      app.partySetup.selectedPlayerIds = app.profiles.data.players.slice(0, 3).map((player) => player.id);
      app.showPartySetupScreen();
    });
    await page.locator('.party-start-action [data-action="officialRecordChaseSetup"]').click();
    await page.waitForFunction(() => window.neonRoadRally?.screen === "officialRecordChaseSetup", null, { timeout: 5000 });
    const setupReport = await page.evaluate(() => {
      const app = window.neonRoadRally;
      const route = getOfficialRouteById(app.pendingOfficialRouteId);
      return {
        screen: app.screen,
        selectedDrivers: app.getPartySetupSelectedPlayers().map((player) => player.name),
        routeId: route?.id || "",
        routeName: route ? getOfficialRouteDisplayName(route) : "",
        setupText: document.body.innerText
      };
    });
    if (setupReport.screen !== "officialRecordChaseSetup" || setupReport.selectedDrivers.length !== 3 || !setupReport.routeId) {
      throw new Error(`Party setup should enter Official Record Chase with selected drivers and route: ${JSON.stringify(setupReport)}`);
    }
    if (!/Everyone runs the same official route\. Records still count\./.test(setupReport.setupText)) {
      throw new Error(`Official Record Chase setup copy missing: ${setupReport.setupText.slice(0, 1000)}`);
    }

    await focusMenuSelector('[data-action="officialRecordChaseStart"]');
    await pressVirtualGamepad({ buttons: [0] });
    await page.waitForFunction(() => window.neonRoadRally?.screen === "partyTurn", null, { timeout: 5000 });
    const lockedSetup = await page.evaluate(() => {
      const app = window.neonRoadRally;
      const session = app.partySession;
      const route = getOfficialRouteById(session?.officialRouteId || "");
      return {
        officialRecordChase: Boolean(session?.officialRecordChase),
        routeId: route?.id || "",
        routeName: route ? getOfficialRouteDisplayName(route) : "",
        sharedSeed: session?.sharedSeed || "",
        routeSeed: route?.seed || "",
        trackId: session?.track?.id || "",
        routeTrackId: route?.trackId || "",
        speedClass: session?.raceMode || "",
        routeSpeedClass: route?.speedClassId || "",
        currentPlayer: session?.currentPlayer?.name || "",
        turnText: document.body.innerText
      };
    });
    if (!lockedSetup.officialRecordChase || lockedSetup.sharedSeed !== lockedSetup.routeSeed || lockedSetup.trackId !== lockedSetup.routeTrackId || lockedSetup.speedClass !== lockedSetup.routeSpeedClass) {
      throw new Error(`Official Record Chase should lock official setup before first turn: ${JSON.stringify(lockedSetup)}`);
    }
    if (!/Records still count/.test(lockedSetup.turnText) || !lockedSetup.turnText.includes(lockedSetup.routeName)) {
      throw new Error(`Official Record Chase turn should keep route and records copy visible: ${lockedSetup.turnText.slice(0, 1000)}`);
    }

    const runFields = [
      { time: 41.25, score: 168000, nearMisses: 4, boostPadsCollected: 2 },
      { time: 43.5, score: 185000, rampsUsed: 2, boostPadsCollected: 3 },
      { time: 40.75, score: 176000, slowdownHits: 0, manualBoostsUsed: 1 }
    ];
    const perTurn = [];
    for (let index = 0; index < runFields.length; index += 1) {
      const beforeRun = await page.evaluate(() => {
        const app = window.neonRoadRally;
        const session = app.partySession;
        return {
          screen: app.screen,
          currentPlayer: session?.currentPlayer?.name || "",
          routeId: session?.officialRouteId || "",
          routeSeed: session?.officialSeed || session?.sharedSeed || ""
        };
      });
      await finishCurrentPartyRun(runFields[index], { startVia: index === 0 ? "keyboard" : "button" });
      const afterRun = await page.evaluate(() => {
        const app = window.neonRoadRally;
        const summary = app.lastSummary || {};
        const session = app.partySession;
        const standings = session?.standings?.() || [];
        const heroText = document.querySelector(".official-record-chase-hero")?.innerText || "";
        const nextButtonText = document.querySelector('[data-action="partyNextPlayer"]')?.textContent || "";
        return {
          screen: app.screen,
          summaryPlayer: summary.playerName || "",
          partyMode: Boolean(summary.partyMode),
          officialRecordChase: Boolean(summary.officialRecordChase),
          officialRouteId: summary.officialRouteId || "",
          sessionRouteId: session?.officialRouteId || "",
          routeSeed: session?.officialSeed || session?.sharedSeed || "",
          summarySeed: summary.seed || "",
          timeAttackPlacement: summary.timeAttackPlacement || "",
          scoreAttackPlacement: summary.scoreAttackPlacement || "",
          scoreSaved: Boolean(summary.scoreSaved),
          standingCount: standings.length,
          completedRuns: session?.completedRuns || 0,
          currentLeader: standings[0]?.playerName || "",
          currentStanding: standings.find((row) => row.playerId === summary.playerId)?.rank || 0,
          heroText,
          nextButtonText
        };
      });
      if (!afterRun.partyMode || !afterRun.officialRecordChase || afterRun.officialRouteId !== afterRun.sessionRouteId || afterRun.summarySeed !== afterRun.routeSeed || !afterRun.scoreSaved) {
        throw new Error(`Official Record Chase run should save as official party wrapper only: ${JSON.stringify(afterRun)}`);
      }
      if (!/Official Rank \/ PB|Leader Gap|Official Score/i.test(afterRun.heroText)) {
        throw new Error(`Official Record Chase first viewport missing rank/gap/official result: ${afterRun.heroText.slice(0, 1000)}`);
      }
      if (index < runFields.length - 1 && !/^Next Driver:/i.test(afterRun.nextButtonText)) {
        throw new Error(`Official Record Chase result should show next driver action: ${JSON.stringify(afterRun)}`);
      }
      perTurn.push({ beforeRun, afterRun });
      if (index < runFields.length - 1) {
        await focusMenuSelector('[data-action="partyNextPlayer"]');
        await pressVirtualGamepad({ buttons: [0] });
        await page.waitForFunction(() => window.neonRoadRally?.screen === "partyTurn", null, { timeout: 5000 });
      }
    }

    await page.waitForFunction(() => window.neonRoadRally?.screen === "partyFinal", null, { timeout: 5000 });
    const finalReport = await page.evaluate(() => {
      const app = window.neonRoadRally;
      const session = app.partySession;
      const route = getOfficialRouteById(session?.officialRouteId || "");
      const standings = session?.standings?.() || [];
      const timeRows = route ? app.getTimeAttackLeaderboardRows({
        trackId: route.trackId,
        raceTypeId: session.raceType,
        speedClassId: route.speedClassId
      }, { legacy: false, limit: 999 }).filter((entry) => entry.officialRouteId === route.id) : [];
      const scoreRows = route ? app.getOfficialScoreAttackRows(route.id, { raceTypeId: session.raceType, limit: 999 }) : [];
      const selectedIds = new Set((session?.selectedPlayers || []).map((player) => player.id));
      const normalPartyEntry = route ? normalizeLeaderboardEntry({
        playerId: "normal-party",
        playerName: "Normal Party",
        trackId: route.trackId,
        trackName: getTrackById(route.trackId).name,
        seed: route.seed,
        raceMode: route.speedClassId,
        raceType: session.raceType,
        score: 999,
        status: "finished",
        time: 99,
        finishTimeMs: 99000,
        partyMode: true,
        officialRouteId: route.id
      }) : null;
      return {
        screen: app.screen,
        routeId: route?.id || "",
        standings: standings.map((row) => ({
          playerName: row.playerName,
          rank: row.rank,
          bestOfficialTimeMs: row.bestOfficialTimeMs,
          bestScore: row.bestScore,
          highlights: row.officialHighlights
        })),
          timePlayers: timeRows.filter((entry) => selectedIds.has(entry.playerId)).map((entry) => entry.playerName),
          scorePlayers: scoreRows.filter((entry) => selectedIds.has(entry.playerId)).map((entry) => entry.playerName),
          playgroundRecordCount: app.profiles.data.playgroundRecords?.length || 0,
          normalPartyOfficialRouteId: normalPartyEntry?.officialRouteId || "",
          finalText: document.body.innerText
        };
      });
    if (finalReport.screen !== "partyFinal" || finalReport.standings.length !== 3 || finalReport.standings[0].bestOfficialTimeMs !== 40750) {
      throw new Error(`Official Record Chase final standings should rank the fastest official time first: ${JSON.stringify(finalReport)}`);
    }
    if (new Set(finalReport.timePlayers).size !== 3 || new Set(finalReport.scorePlayers).size !== 3) {
      throw new Error(`Official Record Chase should write each driver to normal official boards: ${JSON.stringify(finalReport)}`);
    }
    if (finalReport.playgroundRecordCount !== startingPlaygroundCount) {
      throw new Error(`Official Record Chase should not write Playground records: ${JSON.stringify(finalReport)}`);
    }
    if (finalReport.normalPartyOfficialRouteId) {
      throw new Error(`Normal party/custom run should not normalize into official boards: ${JSON.stringify(finalReport)}`);
    }
    if (!/Winner:|1st|2nd|3rd|Best score|Official Top 20|Beat time PB/i.test(finalReport.finalText)) {
      throw new Error(`Official Record Chase final screen should make winner and official highlights obvious: ${finalReport.finalText.slice(0, 1400)}`);
    }

    await page.evaluate(() => {
      const app = window.neonRoadRally;
      app.partySession = null;
      app.partySetup = app.createDefaultPartySetup();
      app.partySetup.selectedPlayerIds = app.profiles.data.players.slice(0, 3).map((player) => player.id);
      app.showTitle();
    });
    return { setupReport, lockedSetup, perTurn, finalReport };
  }

  async function runCouchResultsAndPlaygroundRecordsQa() {
    const routeSetup = await page.evaluate(() => {
      const app = window.neonRoadRally;
      app.partySession = null;
      app.partySetup = null;
      app.profiles.data.leaderboard = [];
      app.profiles.data.bestTimes = [];
      app.profiles.data.playgroundRecords = [];
      app.profiles.selectPlayer(app.profiles.data.players[0].id);
      const player = app.profiles.getCurrentPlayer();
      const route = getDefaultOfficialRouteForTrack(DEFAULT_TRACK_ID);
      app.profiles.recordScore({
        runId: "official-pb-pace-smoke",
        playerId: player.id,
        playerName: player.name,
        carName: player.car.name,
        trackId: route.trackId,
        trackName: getTrackById(route.trackId).name,
        seed: route.seed,
        speedClass: route.speedClassId,
        raceMode: route.speedClassId,
        raceType: DEFAULT_RACE_TYPE_ID,
        pacingRulesVersion: getActivePacingRulesVersion(DEFAULT_RACE_TYPE_ID),
        officialRouteId: route.id,
        officialRouteName: route.name,
        officialSeed: route.seed,
        competitionKind: getCompetitionKindLabel(route),
        score: 100000,
        status: "finished",
        time: 41,
        finishTimeMs: 41000,
        finishTimeSecondsPrecise: 41,
        slowdownHits: 0,
        cleanRun: true
      });
      app.showTitle();
      return {
        routeId: route.id,
        routeSeed: route.seed,
        trackId: route.trackId,
        speedClassId: route.speedClassId,
        playerName: player.name
      };
    });

    async function finishSoloRun(config) {
      const startReport = await page.evaluate((runConfig) => {
        const app = window.neonRoadRally;
        const players = app.profiles.data.players || [];
        const player = players[runConfig.playerIndex || 0] || players[0];
        app.profiles.selectPlayer(player.id);
        app.partySession = null;
        app.partySetup = null;
        const route = runConfig.official
          ? (getOfficialRouteById(runConfig.officialRouteId) || getDefaultOfficialRouteForTrack(runConfig.trackId || DEFAULT_TRACK_ID))
          : null;
        const trackId = route?.trackId || runConfig.trackId || DEFAULT_TRACK_ID;
        const speedClassId = route?.speedClassId || runConfig.speedClassId || DEFAULT_SPEED_CLASS_ID;
        const raceTypeId = runConfig.raceTypeId || DEFAULT_RACE_TYPE_ID;
        const seed = route?.seed || runConfig.seed || "PLAYGROUND-SMOKE-ROAD";
        app.pendingTrackId = trackId;
        app.pendingRaceTypeId = raceTypeId;
        app.pendingRoadSeed = seed;
        app.pendingOfficialRouteId = route?.id || "";
        app.startRace({
          trackId,
          speedClassId,
          raceTypeId,
          seed,
          officialRouteId: route?.id || "",
          customRoad: !route,
          allowOfficialRouteMatch: Boolean(route)
        });
        const run = app.run;
        run.countdownTimer = 0;
        run.raceActive = true;
        let paceHudText = run.paceHudText || "";
        if (runConfig.samplePace) {
          run.distance = run.track.distanceToFinish * (runConfig.sampleProgress || 0.5);
          run.elapsed = runConfig.sampleElapsed || 20;
          app.updatePaceFeedback();
          paceHudText = run.paceHudText || "";
        }
        const status = runConfig.status || "finished";
        const progress = Number.isFinite(runConfig.progress) ? Math.max(0, Math.min(1, runConfig.progress)) : 0.58;
        run.elapsed = runConfig.time ?? 45;
        run.distance = status === "finished" ? run.track.distanceToFinish : run.track.distanceToFinish * progress;
        run.baseScore = runConfig.score ?? 50000;
        run.score = runConfig.score ?? run.baseScore;
        run.manualBoostsUsed = 3;
        run.manualBoosts = 0;
        run.boostPadsCollected = runConfig.boostPadsCollected || 0;
        run.nearMisses = runConfig.nearMisses || 0;
        run.slowdownHits = runConfig.slowdownHits || 0;
        app.endRace(status, runConfig.reason || "Smoke Finish", {
          skipBadges: true,
          skipPlaytest: true
        });
        return {
          paceHudText,
          playerName: player.name,
          routeId: route?.id || "",
          seed
        };
      }, config);
      await page.waitForFunction(() => window.neonRoadRally?.screen === "score", null, { timeout: 8000 });
      const firstViewportText = await getFirstViewportText();
      assertNoFirstViewportDebugTerms(firstViewportText, config.label || "Result");
      const report = await page.evaluate(() => {
        const app = window.neonRoadRally;
        const summary = app.lastSummary || {};
        return {
          screen: app.screen,
          summary: {
            playerName: summary.playerName || "",
            officialRouteId: summary.officialRouteId || "",
            status: summary.status || "",
            scoreSaved: Boolean(summary.scoreSaved),
            playgroundRecordSaved: Boolean(summary.playgroundRecordSaved),
            playgroundScoreRank: summary.playgroundScoreRank || null,
            playgroundTimeRank: summary.playgroundTimeRank || null,
            paceResultText: summary.paceResultText || "",
            timeAttackPlacement: summary.timeAttackPlacement || "",
            scoreAttackPlacement: summary.scoreAttackPlacement || "",
            finishTimeMs: summary.finishTimeMs ?? null,
            finalScore: summary.finalScore || 0,
            seed: summary.seed || ""
          },
          officialLeaderboardSeeds: (app.profiles.data.leaderboard || []).map((entry) => entry.seed || ""),
          playgroundRecords: (app.profiles.data.playgroundRecords || []).map((entry) => ({
            seed: entry.seed || "",
            status: entry.status || "",
            finishTimeMs: entry.finishTimeMs ?? null,
            score: entry.score || 0,
            playerName: entry.playerName || ""
          }))
        };
      });
      return { ...startReport, ...report, firstViewportText };
    }

    const officialFinished = await finishSoloRun({
      label: "Solo Official finished",
      official: true,
      officialRouteId: routeSetup.routeId,
      time: 42.25,
      score: 125000,
      samplePace: true,
      sampleProgress: 0.6,
      sampleElapsed: 24
    });
    if (!/^PB pace [-+]/.test(officialFinished.paceHudText)) {
      throw new Error(`Official HUD should show compact PB pace feedback: ${JSON.stringify(officialFinished)}`);
    }
    if (!/Official Race Result/i.test(officialFinished.firstViewportText) || !new RegExp(routeSetup.playerName, "i").test(officialFinished.firstViewportText) || !/Finish Time|Time Attack/i.test(officialFinished.firstViewportText) || !/Behind PB by|Beat PB by|New route best/i.test(officialFinished.firstViewportText)) {
      throw new Error(`Solo Official finished result first viewport should show driver, finish, and PB pace: ${officialFinished.firstViewportText.slice(0, 1400)}`);
    }

    const officialCrashed = await finishSoloRun({
      label: "Solo Official crashed",
      official: true,
      officialRouteId: routeSetup.routeId,
      status: "crashed",
      reason: "Smoke Wall",
      progress: 0.42,
      time: 24.4,
      score: 62000
    });
    if (!/Official Race Result/i.test(officialCrashed.firstViewportText) || !/Run Over|Progress/i.test(officialCrashed.firstViewportText) || !new RegExp(routeSetup.playerName, "i").test(officialCrashed.firstViewportText)) {
      throw new Error(`Solo Official crashed result first viewport should show driver and outcome: ${officialCrashed.firstViewportText.slice(0, 1400)}`);
    }

    const playgroundFinished = await finishSoloRun({
      label: "Playground finished",
      official: false,
      playerIndex: 1,
      seed: "PLAYGROUND-FINISH-SMOKE",
      time: 49.5,
      score: 132000,
      boostPadsCollected: 2
    });
    if (!playgroundFinished.summary.playgroundRecordSaved || playgroundFinished.summary.officialRouteId || !playgroundFinished.summary.playgroundTimeRank) {
      throw new Error(`Finished Playground run should save score and time only to Playground: ${JSON.stringify(playgroundFinished.summary)}`);
    }
    if (!/Playground Result/i.test(playgroundFinished.firstViewportText) || !/Playground Record|Score Rank|Time Rank/i.test(playgroundFinished.firstViewportText) || !new RegExp(playgroundFinished.playerName, "i").test(playgroundFinished.firstViewportText)) {
      throw new Error(`Playground finished result first viewport should show record placement and driver: ${playgroundFinished.firstViewportText.slice(0, 1400)}`);
    }

    const playgroundCrashed = await finishSoloRun({
      label: "Playground crashed",
      official: false,
      playerIndex: 2,
      seed: "PLAYGROUND-CRASH-SMOKE",
      status: "crashed",
      reason: "Smoke Wall",
      progress: 0.47,
      time: 28,
      score: 88000,
      nearMisses: 2
    });
    if (!playgroundCrashed.summary.playgroundRecordSaved || playgroundCrashed.summary.playgroundTimeRank) {
      throw new Error(`Crashed Playground run should save score only: ${JSON.stringify(playgroundCrashed.summary)}`);
    }

    const boardSeparation = await page.evaluate(() => {
      const app = window.neonRoadRally;
      const filter = {
        trackId: DEFAULT_TRACK_ID,
        raceTypeId: DEFAULT_RACE_TYPE_ID,
        speedClassId: DEFAULT_SPEED_CLASS_ID
      };
      const scoreRows = app.getPlaygroundRecordRows(filter, LEADERBOARD_VIEW_PLAYGROUND_SCORE, { limit: 999 });
      const timeRows = app.getPlaygroundRecordRows(filter, LEADERBOARD_VIEW_PLAYGROUND_TIME, { limit: 999 });
      const officialSeeds = (app.profiles.data.leaderboard || []).map((entry) => entry.seed || "");
      return {
        scoreSeeds: scoreRows.map((entry) => entry.seed),
        timeSeeds: timeRows.map((entry) => entry.seed),
        officialSeeds,
        officialHasPlaygroundSeed: officialSeeds.some((seed) => /^PLAYGROUND-/.test(seed || "")),
        playgroundHasOfficialRoute: (app.profiles.data.playgroundRecords || []).some((entry) => Boolean(entry.officialRouteId))
      };
    });
    if (!boardSeparation.scoreSeeds.includes("PLAYGROUND-FINISH-SMOKE") || !boardSeparation.scoreSeeds.includes("PLAYGROUND-CRASH-SMOKE")) {
      throw new Error(`Playground score board should include finished and crashed custom runs: ${JSON.stringify(boardSeparation)}`);
    }
    if (!boardSeparation.timeSeeds.includes("PLAYGROUND-FINISH-SMOKE") || boardSeparation.timeSeeds.includes("PLAYGROUND-CRASH-SMOKE")) {
      throw new Error(`Playground time board should include finished custom runs only: ${JSON.stringify(boardSeparation)}`);
    }
    if (boardSeparation.officialHasPlaygroundSeed || boardSeparation.playgroundHasOfficialRoute) {
      throw new Error(`Playground and Official boards should stay separate: ${JSON.stringify(boardSeparation)}`);
    }

    await page.evaluate(() => {
      window.neonRoadRally.showLeaderboard(LEADERBOARD_VIEW_PLAYGROUND_SCORE, {
        trackId: DEFAULT_TRACK_ID,
        raceTypeId: DEFAULT_RACE_TYPE_ID,
        speedClassId: DEFAULT_SPEED_CLASS_ID,
        officialRouteId: ""
      });
    });
    await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
    const playgroundLeaderboard = await page.evaluate(() => ({
      text: document.body.innerText,
      selectedTab: document.querySelector('[data-action="setLeaderboardView"].is-selected')?.textContent.replace(/\s+/g, " ").trim() || ""
    }));
    if (!/Playground Records|Local fun records|Not official|Playground Score|Playground Time/i.test(playgroundLeaderboard.text) || !/Playground Score/i.test(playgroundLeaderboard.selectedTab)) {
      throw new Error(`Leaderboards should expose Playground Records separately: ${playgroundLeaderboard.text.slice(0, 1400)}`);
    }
    await page.locator('[data-action="setLeaderboardView"][data-view="playgroundTime"]').click();
    await page.waitForFunction(() => document.querySelector('[data-action="setLeaderboardView"][data-view="playgroundTime"]')?.classList.contains("is-selected"), null, { timeout: 5000 });
    const playgroundTimeText = await page.evaluate(() => document.body.innerText);
    if (!/Playground Time|Fastest finished Playground runs|Not official/i.test(playgroundTimeText)) {
      throw new Error(`Playground Time board should be a separate leaderboard category: ${playgroundTimeText.slice(0, 1400)}`);
    }

    await page.evaluate(() => window.neonRoadRally.showTitle());
    return { routeSetup, officialFinished, officialCrashed, playgroundFinished, playgroundCrashed, boardSeparation };
  }

  const controllerMenuNavigationQa = await runControllerMenuNavigationQa();
  const leaderboardControllerSelectQa = await runLeaderboardControllerSelectQa();
  const officialRecordChaseQa = await runOfficialRecordChaseQa();
  const couchResultsAndPlaygroundRecordsQa = await runCouchResultsAndPlaygroundRecordsQa();

  await clickText("Party Race");
  await expectText("Party Mode");
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    const setup = app.getPartySetup();
    setup.selectedPlayerIds = app.profiles.data.players.map((player) => player.id);
    app.showPartySetupScreen();
  });
  await expectText("3/8");
  const partyBonusSurvivalQa = await runPartyBonusSurvivalQa();
  const partyManageReorderQa = await runPartyManageDriverReorderQa();
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
  if (partySetupUi.startTop > 360) throw new Error(`Start Party Race should remain high in the setup flow: ${partySetupUi.startTop}`);
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
  await setPartyOption("#partyBonusSurvival", "on", "On");
  await setPartyOption("#partyBonusSurvival", "off", "Off");
  await setPartyOption("#partyStartingOrder", "rosterOrder");
  await setPartyOption("#partyStartingOrder", "randomOnce");
  await setPartyOption("#partyStartingOrder", "randomEveryRound");
  await page.selectOption("#partyRoundType", "bestOf3");
  await page.getByRole("button", { name: /Start Party Race/i }).first().click();
  await page.waitForFunction(() => window.neonRoadRally?.screen === "partyTurn", null, { timeout: 5000 });
  await expectText("Starting Order");
  await expectText("Pass the controller or keyboard now");
  await expectText("Player 1 of 3");

  const classicRuns = [
    { score: 140000, status: "crashed", reason: "Smoke Wall", progress: 0.58, nearMisses: 4, manualBoostsUsed: 2, laneMoves: 5 },
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
  let keyboardPartyStartQa = false;
  for (const [index, runFields] of classicRuns.entries()) {
    await finishCurrentPartyRun(runFields, { startVia: index === 0 ? "keyboard" : "button" });
    if (index === 0) keyboardPartyStartQa = true;
    if (index === 0) {
      const partyCustomCrashReport = await page.evaluate(() => {
        const app = window.neonRoadRally;
        const summary = app.lastSummary || {};
        const firstViewport = [
          document.querySelector(".party-drama-header")?.innerText || "",
          document.querySelector(".party-last-run-card")?.innerText || "",
          document.querySelector(".party-action-row")?.innerText || ""
        ].join("\n");
        return {
          screen: app.screen,
          playerName: summary.playerName || "",
          status: summary.status || "",
          playgroundRecordSaved: Boolean(summary.playgroundRecordSaved),
          playgroundTimeRank: summary.playgroundTimeRank || null,
          firstViewport
        };
      });
      assertNoFirstViewportDebugTerms(partyCustomCrashReport.firstViewport, "Party custom crashed result");
      if (partyCustomCrashReport.screen !== "partyStandings" || partyCustomCrashReport.status !== "crashed" || !partyCustomCrashReport.playgroundRecordSaved || partyCustomCrashReport.playgroundTimeRank) {
        throw new Error(`Party custom crash should show standings and save Playground score only: ${JSON.stringify(partyCustomCrashReport)}`);
      }
      if (!/Current Party Race|Latest Run|Playground Record|Next Player/i.test(partyCustomCrashReport.firstViewport)) {
        throw new Error(`Party custom crash first viewport should prioritize standings, latest player, Playground chip, and next action: ${partyCustomCrashReport.firstViewport.slice(0, 1400)}`);
      }
    }
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
  await page.getByRole("button", { name: /Start Party Race/i }).first().click();
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
  let settingsControllerQa = null;
  const settingsToolsSummary = page.locator(".settings-tools-details > summary");
  if (await settingsToolsSummary.count()) {
    const toolsOpen = await page.locator(".settings-tools-details").first().evaluate((node) => node.open);
    if (!toolsOpen) await settingsToolsSummary.click();
    const settingsQa = await page.evaluate(() => {
      const tools = document.querySelector(".settings-tools-details");
      if (tools) tools.open = true;
      const bodyText = document.body.innerText.replace(/\s+/g, " ");
      const lowerText = bodyText.toLowerCase();
      return {
        tvNote: /HDMI\/USB-C to HDMI/.test(bodyText) && /TV Game Mode/.test(bodyText) && /AirPlay\/casting delay is expected/.test(bodyText),
        controllerDiagnostic: Boolean(document.querySelector(".settings-controller-diagnostics")),
        controllerStatus: document.querySelector("[data-controller-status]")?.textContent || "",
        controllerPreset: window.neonRoadRally?.profiles?.data?.controllerPresetId || "",
        controllerPresetCopy: ["controller preset", "standard", "shoulder racer"].every((text) => lowerText.includes(text)),
        controllerPresetDiagnostic: lowerText.includes("preset standard"),
        controllerFocusNote: /button press first/.test(bodyText),
        mappingRows: ["cross/x", "circle", "options/menu", "l1/l2 + left/right", "d-pad / left stick"].every((text) => lowerText.includes(text))
      };
    });
    if (!settingsQa.tvNote || !settingsQa.controllerDiagnostic || !settingsQa.controllerPresetCopy || !settingsQa.controllerPresetDiagnostic || !settingsQa.controllerFocusNote || !settingsQa.mappingRows || settingsQa.controllerPreset !== "standard") {
      throw new Error(`Settings should include compact controller diagnostics, mapping, and TV setup copy: ${JSON.stringify(settingsQa)}`);
    }
    await page.locator('button[data-action="setControllerPreset"][data-id="shoulderRacer"]').click();
    await page.waitForFunction(() => window.neonRoadRally?.profiles?.data?.controllerPresetId === "shoulderRacer", null, { timeout: 3000 });
    const shoulderToolsOpen = await page.locator(".settings-tools-details").first().evaluate((node) => node.open);
    if (!shoulderToolsOpen) await page.locator(".settings-tools-details > summary").first().click();
    const shoulderQa = await page.evaluate(() => {
      const bodyText = document.body.innerText.replace(/\s+/g, " ");
      const lowerText = bodyText.toLowerCase();
      return {
        controllerPreset: window.neonRoadRally?.profiles?.data?.controllerPresetId || "",
        activeCopy: ["shoulder racer", "l1/r1 tap lanes", "l2/r2 drift dash"].every((text) => lowerText.includes(text)),
        diagnosticPreset: lowerText.includes("preset shoulder racer"),
        mappingRows: ["l1 / r1", "lane left / lane right", "l2 / r2", "drift dash left / right", "cross/x", "circle", "options/menu"].every((text) => lowerText.includes(text))
      };
    });
    if (shoulderQa.controllerPreset !== "shoulderRacer" || !shoulderQa.activeCopy || !shoulderQa.diagnosticPreset || !shoulderQa.mappingRows) {
      throw new Error(`Settings should persist and explain Shoulder Racer mapping: ${JSON.stringify(shoulderQa)}`);
    }
    await page.locator('button[data-action="setControllerPreset"][data-id="standard"]').click();
    await page.waitForFunction(() => window.neonRoadRally?.profiles?.data?.controllerPresetId === "standard", null, { timeout: 3000 });
    settingsControllerQa = { ...settingsQa, shoulderRacer: shoulderQa };
    const toolsOpenAfterPreset = await page.locator(".settings-tools-details").first().evaluate((node) => node.open);
    if (!toolsOpenAfterPreset) await page.locator(".settings-tools-details > summary").first().click();
    await clickAction("showPlaytestReport");
  } else {
    await clickText("Playtest Tools");
  }
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
  console.log(JSON.stringify({
    ok: true,
    sawRoundShuffle,
    keyboardPartyStartQa,
    settingsControllerQa,
    controllerMenuNavigationQa,
    leaderboardControllerSelectQa,
    officialRecordChaseQa,
    couchResultsAndPlaygroundRecordsQa,
    partyBonusSurvivalQa,
    partyManageReorderQa,
    ...result
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
