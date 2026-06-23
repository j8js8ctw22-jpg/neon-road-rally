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

  throw new Error("Cannot find Playwright. Set NODE_PATH or NRR_PLAYWRIGHT_NODE_MODULES.");
}

const { chromium } = loadPlaywright();
const BRAVE_PATH = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const BASE_URL = process.env.NRR_SMOKE_URL || "http://127.0.0.1:8096/";

function assert(condition, message, details = {}) {
  if (condition) return;
  const suffix = Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
  throw new Error(`${message}${suffix}`);
}

async function tap(page, selector) {
  const locator = page.locator(selector);
  assert(await locator.count() === 1, `Expected one tappable element: ${selector}`);
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert(box && box.width > 0 && box.height > 0, `Missing tap target bounds: ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return box;
}

async function waitForScreen(page, screen) {
  await page.waitForFunction(
    (expected) => window.neonRoadRally?.screen === expected,
    screen,
    { timeout: 5000 }
  );
}

async function primeActiveRun(page) {
  return page.evaluate(() => {
    const app = window.neonRoadRally;
    const run = app.run;
    run.countdownTimer = 0;
    run.raceActive = true;
    run.paused = false;
    run.ended = false;
    run.debugFrozen = false;
    run.pendingEndStatus = "";
    run.targetLane = 3;
    run.renderLaneFloat = 3;
    run.playerLaneFloat = 3;
    app.obstacles.obstacles = [];
    app.obstacles.seedLockedSpawnObstacles = [];
    app.obstacles.nextSpawnDistance = run.track.distanceToFinish + 100000;
    app.input.touchPointerDetected = true;
    app.input.lastInputModality = "touch";
    app.input.updateTouchControlsVisibility({ force: true });
    return {
      lane: run.targetLane,
      manualBoosts: run.manualBoosts,
      routeId: run.officialRouteId,
      controlsHidden: document.getElementById("touchControls").hidden
    };
  });
}

async function finishCurrentRun(page, score = 42000) {
  await page.evaluate((finalScore) => {
    const app = window.neonRoadRally;
    const run = app.run;
    run.elapsed = Math.max(25, run.elapsed || 0);
    run.distance = run.track.distanceToFinish;
    run.baseScore = finalScore;
    run.score = finalScore;
    app.endRace("finished", "Touch smoke finish", {
      skipBadges: true,
      skipPlaytest: true
    });
  }, score);
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: BRAVE_PATH
  });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const consoleIssues = [];
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.neonRoadRally), null, { timeout: 5000 });

    const packageReport = await page.evaluate(async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      const manifestResponse = await fetch(manifestLink.href);
      const manifest = await manifestResponse.json();
      const iconStatuses = await Promise.all(manifest.icons.map(async (icon) => {
        const response = await fetch(new URL(icon.src, location.href));
        return { src: icon.src, status: response.status };
      }));
      const cabinet = document.getElementById("arcadeCabinet").getBoundingClientRect();
      return {
        manifestStatus: manifestResponse.status,
        display: manifest.display,
        orientation: manifest.orientation,
        iconStatuses,
        appleIcon: appleIcon?.getAttribute("href") || "",
        cabinet: { width: cabinet.width, height: cabinet.height },
        touchCapable: document.body.classList.contains("is-touch-capable")
      };
    });
    assert(packageReport.manifestStatus === 200, "Manifest did not load", packageReport);
    assert(packageReport.display === "standalone", "Manifest must launch standalone", packageReport);
    assert(packageReport.orientation === "landscape", "Manifest must request landscape", packageReport);
    assert(packageReport.iconStatuses.every((icon) => icon.status === 200), "Manifest icon failed to load", packageReport);
    assert(packageReport.appleIcon.endsWith("apple-touch-icon.png"), "Apple touch icon is missing", packageReport);
    assert(packageReport.cabinet.width === 1024 && packageReport.cabinet.height === 768, "4:3 stage did not fill iPad landscape", packageReport);
    assert(packageReport.touchCapable, "Touch-capable class was not applied", packageReport);

    await page.setViewportSize({ width: 768, height: 1024 });
    const portraitReport = await page.locator(".orientation-gate").evaluate((element) => ({
      display: getComputedStyle(element).display,
      text: element.textContent.replace(/\s+/g, " ").trim()
    }));
    assert(portraitReport.display === "grid", "Portrait rotate screen is not visible", portraitReport);
    assert(portraitReport.text.includes("Rotate Your Device"), "Portrait guidance is missing", portraitReport);

    await page.setViewportSize({ width: 844, height: 390 });
    const phoneLandscapeReport = await page.evaluate(() => {
      const cabinet = document.getElementById("arcadeCabinet").getBoundingClientRect();
      const panel = document.querySelector(".title-panel");
      const buttons = Array.from(document.querySelectorAll(".title-action-stack button")).map((button) => {
        const rect = button.getBoundingClientRect();
        const children = Array.from(button.children).map((child) => child.getBoundingClientRect());
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          contentContained: children.every((child) => child.top >= rect.top && child.bottom <= rect.bottom)
        };
      });
      return {
        cabinet: { left: cabinet.left, top: cabinet.top, right: cabinet.right, bottom: cabinet.bottom },
        panel: { clientHeight: panel.clientHeight, scrollHeight: panel.scrollHeight },
        buttons,
        allInside: buttons.every((button) => (
          button.left >= cabinet.left && button.right <= cabinet.right &&
          button.top >= cabinet.top && button.bottom <= cabinet.bottom &&
          button.contentContained
        ))
      };
    });
    assert(phoneLandscapeReport.allInside, "Phone-landscape title actions are clipped", phoneLandscapeReport);
    assert(phoneLandscapeReport.panel.clientHeight === phoneLandscapeReport.panel.scrollHeight, "Phone-landscape title unexpectedly scrolls", phoneLandscapeReport);
    await page.setViewportSize({ width: 1024, height: 768 });

    await tap(page, '[data-action="start"]');
    await waitForScreen(page, "createDriver");
    await tap(page, "#newDriverName");
    await page.locator("#newDriverName").fill("TOUCH ACE");
    const nameAttributes = await page.locator("#newDriverName").evaluate((element) => ({
      autocapitalize: element.getAttribute("autocapitalize"),
      enterkeyhint: element.getAttribute("enterkeyhint"),
      fontSize: getComputedStyle(element).fontSize
    }));
    assert(nameAttributes.autocapitalize === "words", "Driver input is missing iOS capitalization", nameAttributes);
    assert(nameAttributes.enterkeyhint === "done", "Driver input is missing iOS enter hint", nameAttributes);
    assert(Number.parseFloat(nameAttributes.fontSize) >= 16, "Driver input may trigger iOS zoom", nameAttributes);
    await tap(page, '[data-action="createPlayer"]');
    await waitForScreen(page, "preRace");
    await tap(page, '[data-action="startSeededRace"]');
    await waitForScreen(page, "game");

    const initialRun = await primeActiveRun(page);
    assert(initialRun.routeId, "UI launch did not start an Official route", initialRun);
    assert(!initialRun.controlsHidden, "Touch controls did not appear automatically", initialRun);

    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 500, y: 520, radiusX: 6, radiusY: 6, force: 1, id: 1 }]
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 580, y: 520, radiusX: 6, radiusY: 6, force: 1, id: 1 }]
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const swipeReport = await page.evaluate(() => ({
      lane: window.neonRoadRally.run.targetLane,
      source: window.neonRoadRally.input.lastLaneInputSource
    }));
    assert(swipeReport.lane === initialRun.lane + 1, "Swipe did not step exactly one lane", swipeReport);
    assert(swipeReport.source === "touch", "Swipe did not use the touch lane-input source", swipeReport);

    const boostsBefore = await page.evaluate(() => window.neonRoadRally.run.manualBoosts);
    await tap(page, "#touchBoost");
    const boostReport = await page.evaluate(() => ({
      boosts: window.neonRoadRally.run.manualBoosts,
      used: window.neonRoadRally.run.manualBoostsUsed,
      timer: window.neonRoadRally.run.boostTimer,
      source: window.neonRoadRally.input.lastBoostInputSource
    }));
    assert(boostReport.boosts === boostsBefore - 1, "Touch boost did not spend one manual boost", boostReport);
    assert(boostReport.used > 0 && boostReport.timer > 0, "Touch boost did not activate the normal boost state", boostReport);
    assert(boostReport.source === "touch", "Touch boost did not use the shared input path", boostReport);

    await tap(page, "#touchPause");
    await page.waitForFunction(() => window.neonRoadRally?.run?.paused === true, null, { timeout: 3000 });
    assert(await page.locator('.pause-overlay[aria-label="Paused"]').isVisible(), "Touch pause did not open the pause dialog");
    await tap(page, '[data-action="resume"]');
    await page.waitForFunction(() => window.neonRoadRally?.run?.paused === false, null, { timeout: 3000 });

    await page.keyboard.press("ArrowLeft");
    const keyboardReport = await page.evaluate(() => ({
      modality: window.neonRoadRally.input.lastInputModality,
      hidden: document.getElementById("touchControls").hidden
    }));
    assert(keyboardReport.modality === "keyboard" && keyboardReport.hidden, "Keyboard input did not hide touch controls", keyboardReport);
    await page.touchscreen.tap(500, 520);
    const touchReturnReport = await page.evaluate(() => ({
      modality: window.neonRoadRally.input.lastInputModality,
      hidden: document.getElementById("touchControls").hidden
    }));
    assert(touchReturnReport.modality === "touch" && !touchReturnReport.hidden, "Touch input did not restore controls", touchReturnReport);

    const touchStorageReport = await page.evaluate(() => {
      const app = window.neonRoadRally;
      const mainBefore = localStorage.getItem("neonRoadRally.v1");
      app.touchSettings.update({ steeringMode: "hold", forceControls: false });
      app.input.updateTouchControlsVisibility({ force: true });
      const mainAfter = localStorage.getItem("neonRoadRally.v1");
      return {
        mainUnchanged: mainBefore === mainAfter,
        touch: JSON.parse(localStorage.getItem("neonRoadRally.touch.v1"))
      };
    });
    assert(touchStorageReport.mainUnchanged, "Touch settings changed the validated main save");
    assert(touchStorageReport.touch.steeringMode === "hold", "Hold-side preference did not save", touchStorageReport);

    await page.evaluate(() => {
      const run = window.neonRoadRally.run;
      run.targetLane = 3;
      run.renderLaneFloat = 3;
      run.playerLaneFloat = 3;
    });
    await tap(page, '[data-touch-steer="-1"]');
    const holdReport = await page.evaluate(() => ({
      lane: window.neonRoadRally.run.targetLane,
      source: window.neonRoadRally.input.lastLaneInputSource,
      mode: document.getElementById("touchControls").dataset.steeringMode
    }));
    assert(holdReport.lane === 2, "Hold-side steering did not step left", holdReport);
    assert(holdReport.source === "touch" && holdReport.mode === "hold", "Hold-side mode did not use touch lane semantics", holdReport);

    await finishCurrentRun(page, 64000);
    await waitForScreen(page, "score");
    const officialReport = await page.evaluate(() => ({
      routeId: window.neonRoadRally.lastSummary?.officialRouteId || "",
      scoreSaved: Boolean(window.neonRoadRally.lastSummary?.scoreSaved),
      status: window.neonRoadRally.lastSummary?.status || ""
    }));
    assert(officialReport.routeId && officialReport.scoreSaved && officialReport.status === "finished", "Official touch run did not save a record", officialReport);

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.neonRoadRally), null, { timeout: 5000 });
    const reloadReport = await page.evaluate(() => ({
      touch: window.neonRoadRally.getTouchSettings(),
      players: window.neonRoadRally.profiles.data.players.length,
      mainVersion: JSON.parse(localStorage.getItem("neonRoadRally.v1")).version
    }));
    assert(reloadReport.touch.steeringMode === "hold", "Touch preference did not survive reload", reloadReport);
    assert(reloadReport.players === 1, "Main save did not survive touch preference reload", reloadReport);

    await page.evaluate(() => {
      const app = window.neonRoadRally;
      app.profiles.createPlayer("TOUCH TWO");
      app.showTitle();
    });
    await waitForScreen(page, "title");
    await tap(page, '[data-action="partyMode"]');
    await waitForScreen(page, "partySetup");
    const partySetupReport = await page.evaluate(() => ({
      selected: window.neonRoadRally.getPartySetupSelectedPlayers().length,
      startDisabled: document.querySelector('[data-action="partyStartRound"]').disabled
    }));
    assert(partySetupReport.selected === 2 && !partySetupReport.startDisabled, "Two-player Party setup is not tap-ready", partySetupReport);
    await tap(page, '[data-action="partyStartRound"]');
    await waitForScreen(page, "partyTurn");
    const handoffReport = await page.evaluate(() => ({
      text: document.querySelector(".party-turn-hero-card")?.innerText || "",
      startHeight: document.querySelector('[data-action="partyStartRun"]')?.getBoundingClientRect().height || 0
    }));
    assert(handoffReport.text.toLowerCase().includes("pass the ipad"), "Party handoff does not instruct device passing", handoffReport);
    assert(handoffReport.startHeight >= 44, "Party handoff tap target is too small", handoffReport);

    await tap(page, '[data-action="partyStartRun"]');
    await waitForScreen(page, "game");
    await finishCurrentRun(page, 30000);
    await waitForScreen(page, "partyStandings");
    await tap(page, '[data-action="partyNextPlayer"]');
    await waitForScreen(page, "partyTurn");
    await tap(page, '[data-action="partyStartRun"]');
    await waitForScreen(page, "game");
    await finishCurrentRun(page, 34000);
    await waitForScreen(page, "partyFinal");
    const partyFinalReport = await page.evaluate(() => ({
      screen: window.neonRoadRally.screen,
      completedRuns: window.neonRoadRally.partySession?.completedRuns || 0,
      players: window.neonRoadRally.partySession?.totalPlayers || 0
    }));
    assert(partyFinalReport.completedRuns === 2 && partyFinalReport.players === 2, "Two-player touch Party did not finish", partyFinalReport);

    assert(consoleIssues.length === 0, "Browser console reported issues", { consoleIssues });
    console.log(JSON.stringify({
      packageReport,
      portraitReport,
      phoneLandscapeReport,
      nameAttributes,
      swipeReport,
      boostReport,
      keyboardReport,
      touchReturnReport,
      touchStorageReport,
      holdReport,
      officialReport,
      reloadReport,
      partySetupReport,
      handoffReport,
      partyFinalReport
    }, null, 2));
    console.log("M2_TOUCH_PWA_SMOKE_OK");
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
