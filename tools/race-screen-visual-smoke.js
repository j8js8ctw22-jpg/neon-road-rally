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

async function waitForScreen(page, expected, timeout = 5000) {
  const screens = Array.isArray(expected) ? expected : [expected];
  await page.waitForFunction(
    (values) => values.includes(window.neonRoadRally?.screen),
    screens,
    { timeout }
  );
  return page.evaluate(() => window.neonRoadRally?.screen);
}

async function installVisualSmokeHelpers(page) {
  await page.evaluate(() => {
    const TEST_SEEDS = {
      classic: "VISUAL-CLASSIC-BOOST-RAMP",
      fuel: "VISUAL-FUEL-GAS",
      pursuit: "VISUAL-PURSUIT-GATE",
      party: "VISUAL-PARTY"
    };

    function app() {
      return window.neonRoadRally;
    }

    function ensurePlayers() {
      const game = app();
      game.profiles.data.players = [];
      game.profiles.data.currentPlayerId = null;
      const ace = game.profiles.createPlayer("QA ACE");
      const jay = game.profiles.createPlayer("QA JAY");
      const max = game.profiles.createPlayer("QA MAX");
      game.profiles.selectPlayer(ace.id);
      return [ace, jay, max];
    }

    function playerAhead() {
      const game = app();
      return game.renderer.aheadForY(game.renderer.getPlayerScreenY());
    }

    function clearTraffic() {
      const game = app();
      game.obstacles.obstacles = [];
      game.obstacles.seedLockedSpawnObstacles = [];
      if (game.run?.track) {
        game.obstacles.nextSpawnDistance = game.run.track.distanceToFinish + 100000;
      }
    }

    function syncPlayerLane(lane = 2) {
      const run = app().run;
      run.targetLane = lane;
      run.renderLaneFloat = lane;
      run.playerLaneFloat = lane;
    }

    function primeRun(options = {}) {
      const game = app();
      const {
        raceTypeId = "classic",
        speedClassId = "arcade",
        trackId = "sunset-highway",
        seed = TEST_SEEDS.classic,
        player = null,
        partyMode = false,
        partySeedLocked = false
      } = options;
      game.startRace({
        raceTypeId,
        speedClassId,
        trackId,
        seed,
        player,
        partyMode,
        partySeedLocked
      });
      const run = game.run;
      run.countdownTimer = 0;
      run.raceActive = true;
      run.paused = false;
      run.debugFrozen = true;
      run.elapsed = Math.max(run.elapsed || 0, 0.05);
      syncPlayerLane(2);
      clearTraffic();
      game.updateRaceSection(true);
      game.updateAudioMusicState();
      game.renderer.render();
      return snapshot("primed");
    }

    function makeObstacle(type, lane, ahead, options = {}) {
      const game = app();
      const distance = game.run.distance + ahead;
      const obstacle = game.obstacles.createObstacle(type, lane, distance, options);
      game.obstacles.obstacles.push(obstacle);
      game.renderer.render();
      return obstacle;
    }

    function advance(seconds = 0.05, step = 1 / 60) {
      const game = app();
      let remaining = Math.max(0, seconds);
      while (remaining > 0 && game.screen === "game") {
        const dt = Math.min(step, remaining);
        if (!game.run.ended) game.updateRun(dt);
        game.updateArcadeEffects(dt);
        remaining -= dt;
      }
      game.renderer.render();
      return snapshot("advanced");
    }

    function advanceUntil(predicate, maxSeconds = 4, step = 1 / 60) {
      const game = app();
      let elapsed = 0;
      while (elapsed < maxSeconds && game.screen === "game") {
        if (predicate(game)) break;
        advance(step, step);
        elapsed += step;
      }
      return {
        elapsed,
        matched: Boolean(predicate(game)),
        snapshot: snapshot("advance-until")
      };
    }

    function canvasSample() {
      const game = app();
      const canvas = game.canvas;
      const width = Math.max(1, Math.floor(canvas.width));
      const height = Math.max(1, Math.floor(canvas.height));
      return {
        width: Math.round(game.renderer.width),
        height: Math.round(game.renderer.height),
        backingWidth: width,
        backingHeight: height,
        hasDrawSurface: width > 0 && height > 0
      };
    }

    function visibleObjects() {
      const game = app();
      const run = game.run;
      if (!run) return [];
      return game.obstacles.obstacles
        .map((obstacle) => {
          const rect = game.renderer.getObstacleVisualRectAt(obstacle, run.distance);
          return {
            id: obstacle.id,
            type: obstacle.type,
            lane: Math.round(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane),
            ahead: Math.round(obstacle.distance - run.distance),
            visible: Boolean(rect),
            sprite: Boolean(rect?.sprite),
            w: Math.round(rect?.renderedWidth || 0),
            h: Math.round(rect?.renderedHeight || 0),
            pursuitRoadblock: Boolean(obstacle.pursuitRoadblock),
            pursuitEscapeLane: Number.isFinite(obstacle.pursuitEscapeLane) ? obstacle.pursuitEscapeLane : null,
            hit: Boolean(obstacle.hit),
            remove: Boolean(obstacle.remove)
          };
        })
        .filter((item) => item.visible);
    }

    function snapshot(label = "") {
      const game = app();
      const run = game.run || {};
      const objects = visibleObjects();
      return {
        label,
        screen: game.screen,
        raceTypeId: run.raceTypeId || "",
        status: run.ended ? (run.finished ? "finished" : "ended") : "running",
        endReason: run.endReason || "",
        distance: Math.round(run.distance || 0),
        progress: Number(((run.distance || 0) / Math.max(1, run.track?.distanceToFinish || 1)).toFixed(3)),
        currentSpeed: Math.round(run.currentSpeed || 0),
        objects,
        visibleTypes: Array.from(new Set(objects.map((item) => item.type))).sort(),
        canvas: canvasSample(),
        boost: {
          padsCollected: run.boostPadsCollected || 0,
          padBoostTimer: Number((run.padBoostTimer || 0).toFixed(3)),
          flash: Number((run.boostFlashTimer || 0).toFixed(3)),
          burst: Number((run.boostBurstTimer || 0).toFixed(3)),
          streak: Number((run.boostStreakPunchTimer || 0).toFixed(3)),
          trail: Number((run.boostTrailPunchTimer || 0).toFixed(3)),
          screenShake: Number((run.screenShake || 0).toFixed(3))
        },
        ramp: {
          rampsUsed: run.rampsUsed || 0,
          targetsCleared: run.rampTargetsCleared || 0,
          airborne: Boolean(run.airborne),
          jumpOffset: Math.round(run.jumpOffset || 0),
          launchPulse: Number((run.rampLaunchPulseTimer || 0).toFixed(3)),
          landingPulse: Number((run.rampLandingPulseTimer || 0).toFixed(3)),
          clearSpark: Number((run.rampClearSparkTimer || 0).toFixed(3)),
          targetStatus: run.lastRampTargetStatus || ""
        },
        fuel: {
          fuel: Number((run.fuel || 0).toFixed(2)),
          low: Boolean(run.lowFuelActive),
          critical: Boolean(run.criticalFuelActive),
          warningPulse: Number((run.fuelWarningPulseTimer || 0).toFixed(3)),
          gasCansCollected: run.gasCansCollected || 0,
          gasCansSpawned: run.gasCansSpawned || 0
        },
        pursuit: {
          heat: Number((run.pursuitHeat || 0).toFixed(2)),
          heatLimit: Number((run.pursuitHeatLimit || 0).toFixed(2)),
          roadblockAhead: Boolean(run.pursuitRoadblockAhead),
          warningTimer: Number((run.pursuitWarningTimer || 0).toFixed(3)),
          sirenPulse: Number((run.pursuitSirenPulseTimer || 0).toFixed(3)),
          roadblocksSpawned: run.roadblocksSpawned || 0,
          roadblocksCleared: run.roadblocksCleared || 0,
          roadblockWarnings: run.roadblockWarnings || 0,
          escapeLaneCount: run.roadblockEscapeLaneCount || 0,
          escaped: Boolean(run.escapeReached),
          busted: Boolean(run.bustedOccurred),
          bustedBeat: Number((run.pursuitBustedBeatTimer || 0).toFixed(3)),
          result: run.pursuitResult || ""
        },
        finish: {
          flash: Number((run.finishFlashTimer || 0).toFixed(3)),
          stripe: Number((run.finishStripeTimer || 0).toFixed(3))
        },
        crash: {
          pendingEnd: run.pendingEndStatus || "",
          flash: Number((run.crashFlash || 0).toFixed(3)),
          beat: Number((run.crashBeatTimer || 0).toFixed(3)),
          sparks: Number((run.crashSparkTimer || 0).toFixed(3)),
          bustedBeat: Number((run.pursuitBustedBeatTimer || 0).toFixed(3))
        }
      };
    }

    function testClassicBoost() {
      primeRun({ raceTypeId: "classic", speedClassId: "redline", seed: TEST_SEEDS.classic });
      const ahead = Math.max(playerAhead() + 230, 420);
      makeObstacle("boostPad", 2, ahead);
      const approach = snapshot("classic-boost-approach");
      const result = advanceUntil((game) => (game.run.boostPadsCollected || 0) >= 1, 4);
      return {
        observed: result.matched,
        approach,
        collected: result.snapshot
      };
    }

    function testClassicRamp() {
      primeRun({ raceTypeId: "classic", speedClassId: "turbo", seed: TEST_SEEDS.classic });
      const rampAhead = Math.max(playerAhead() + 260, 450);
      const targetGap = 560;
      const target = makeObstacle("barrier", 2, rampAhead + targetGap, {
        rampTarget: true,
        waveType: "visualSmokeRampTarget",
        waveLabel: "Visual smoke ramp target"
      });
      makeObstacle("ramp", 2, rampAhead, {
        rampSolution: true,
        solutionTargetDistance: target.distance,
        solutionTargetType: target.type,
        solutionTargetId: target.id,
        waveType: "visualSmokeRamp",
        waveLabel: "Visual smoke ramp"
      });
      const approach = snapshot("classic-ramp-approach");
      const airborne = advanceUntil((game) => Boolean(game.run.airborne && game.run.jumpOffset > 8), 4).snapshot;
      const landing = advanceUntil((game) => (game.run.rampLandingPulseTimer || 0) > 0, 4).snapshot;
      return {
        observed: Boolean((landing.ramp.rampsUsed || 0) >= 1 && landing.ramp.landingPulse > 0),
        approach,
        airborne,
        landing
      };
    }

    function testClassicFinish() {
      primeRun({ raceTypeId: "classic", speedClassId: "arcade", seed: `${TEST_SEEDS.classic}-FINISH` });
      const run = app().run;
      run.elapsed = Math.max(run.elapsed, 38);
      run.distance = Math.max(0, run.track.distanceToFinish - 8);
      advance(0.05);
      return snapshot("classic-finish-effect");
    }

    function testClassicCrash() {
      primeRun({ raceTypeId: "classic", speedClassId: "redline", seed: `${TEST_SEEDS.classic}-CRASH` });
      const run = app().run;
      makeObstacle("slowCar", 2, playerAhead());
      app().collision.update();
      const impact = snapshot("classic-crash-impact");
      const ended = advanceUntil((game) => Boolean(game.run.ended), 1.6).snapshot;
      return { impact, ended };
    }

    function testFuelGasAndCritical() {
      primeRun({ raceTypeId: "fuelRun", speedClassId: "pro", seed: TEST_SEEDS.fuel });
      const run = app().run;
      run.fuel = Math.max(run.lowFuelThreshold + 3, Math.min(run.fuelMax, run.fuelMax * 0.45));
      const beforeFuel = run.fuel;
      const ahead = Math.max(playerAhead() + 220, 410);
      run.gasCansSpawned = Math.max(run.gasCansSpawned || 0, 1);
      makeObstacle("gasCan", 2, ahead, {
        waveType: "visualSmokeFuel",
        waveLabel: "Visual smoke fuel"
      });
      const gasApproach = snapshot("fuel-gas-approach");
      const collected = advanceUntil((game) => (game.run.gasCansCollected || 0) >= 1, 4).snapshot;
      clearTraffic();
      run.fuel = Math.max(1, Math.min(run.criticalFuelThreshold * 0.7, run.criticalFuelThreshold - 1));
      run.fuelWarningCooldown = 0;
      run.fuelWarningState = "none";
      advance(0.05);
      const critical = snapshot("fuel-critical-visual");
      return {
        beforeFuel: Number(beforeFuel.toFixed(2)),
        gasApproach,
        collected,
        critical
      };
    }

    function makePursuitRoadblock(safeLane = 2) {
      const run = app().run;
      const waveId = `visual-smoke-roadblock-${Math.round(run.elapsed * 1000)}`;
      const ahead = Math.max(playerAhead() + 310, 560);
      run.pursuitRoadblockAhead = true;
      run.pursuitWarningTimer = Math.max(run.pursuitWarningTimer || 0, 2.2);
      run.pursuitSirenPulseTimer = Math.max(run.pursuitSirenPulseTimer || 0, 1.2);
      run.pursuitChasePulseTimer = Math.max(run.pursuitChasePulseTimer || 0, 1.2);
      run.roadblockWarnings = Math.max(run.roadblockWarnings || 0, 1);
      run.roadblocksSpawned = Math.max(run.roadblocksSpawned || 0, 1);
      run.roadblockEscapeLaneCount = Math.max(run.roadblockEscapeLaneCount || 0, 1);
      run.lastRoadblockSafeLane = safeLane;
      [0, 1, 2, 3, 4].forEach((lane) => {
        if (lane === safeLane) return;
        makeObstacle("barrier", lane, ahead + (Math.abs(lane - safeLane) % 2) * 28, {
          pursuitRoadblock: true,
          pursuitMarker: true,
          pursuitEscapeLane: safeLane,
          pursuitRoadblockLead: true,
          roadblockWaveId: waveId,
          waveType: "visualSmokeRoadblock",
          waveLabel: "Visual smoke roadblock"
        });
      });
      return { waveId, safeLane, ahead };
    }

    function testPursuitRoadblockAndEscaped() {
      primeRun({ raceTypeId: "pursuit", speedClassId: "turbo", seed: TEST_SEEDS.pursuit });
      const run = app().run;
      run.pursuitHeat = Math.max(run.pursuitHeat || 0, run.pursuitHeatLimit * 0.42);
      run.pursuitHeatMax = Math.max(run.pursuitHeatMax || 0, run.pursuitHeat);
      const roadblock = makePursuitRoadblock(2);
      const warning = snapshot("pursuit-roadblock-warning");
      syncPlayerLane(roadblock.safeLane);
      const cleared = advanceUntil((game) => (game.run.roadblocksCleared || 0) >= 1, 4).snapshot;
      run.elapsed = Math.max(run.elapsed, 42);
      run.distance = Math.max(run.distance, run.track.distanceToFinish - 6);
      advance(0.05);
      const escaped = snapshot("pursuit-escaped-effect");
      return { roadblock, warning, cleared, escaped };
    }

    function testPursuitBusted() {
      primeRun({ raceTypeId: "pursuit", speedClassId: "redline", seed: `${TEST_SEEDS.pursuit}-BUSTED` });
      makePursuitRoadblock(3);
      app().forceBusted();
      return snapshot("pursuit-busted-effect");
    }

    function finishPartyRun(fields = {}) {
      const game = app();
      const run = game.run;
      run.countdownTimer = 0;
      run.raceActive = true;
      run.debugFrozen = true;
      run.elapsed = fields.time ?? 44;
      run.distance = run.track.distanceToFinish;
      run.baseScore = fields.score ?? 84000;
      run.score = fields.score ?? run.baseScore;
      run.manualBoosts = fields.manualBoosts ?? 1;
      run.boostPadsCollected = fields.boostPadsCollected ?? run.boostPadsCollected ?? 0;
      run.rampsUsed = fields.rampsUsed ?? run.rampsUsed ?? 0;
      run.rampTargetsCleared = fields.rampTargetsCleared ?? run.rampTargetsCleared ?? 0;
      if (run.raceTypeId === "fuelRun") {
        run.gasCansCollected = fields.gasCansCollected ?? run.gasCansCollected ?? 1;
        run.gasCansSpawned = fields.gasCansSpawned ?? Math.max(run.gasCansCollected, 1);
        run.fuel = fields.fuelRemaining ?? Math.max(12, run.criticalFuelThreshold + 2);
        run.lowestFuelReached = fields.lowestFuelReached ?? Math.max(1, run.criticalFuelThreshold - 1);
      }
      game.endRace(fields.status || "finished", fields.reason || "Visual Smoke Party");
      return snapshot("party-run-ended");
    }

    function setupParty(raceTypeId = "classic") {
      const game = app();
      const players = game.profiles.data.players.slice(0, 2);
      game.showPartySetupScreen();
      const setup = game.getPartySetup();
      setup.selectedPlayerIds = players.map((player) => player.id);
      setup.trackId = "sunset-highway";
      setup.raceMode = "arcade";
      setup.raceType = raceTypeId;
      setup.roundType = "oneRunEach";
      setup.seedMode = "sameRound";
      setup.startingOrderMode = "rosterOrder";
      setup.sharedSeed = `${TEST_SEEDS.party}-${raceTypeId}`;
      game.showPartySetupScreen();
      game.handlePartyStartRound();
      return snapshot(`party-${raceTypeId}-turn`);
    }

    function startPartyTurn() {
      const game = app();
      game.startCurrentPartyRun({ force: true });
      const run = game.run;
      run.countdownTimer = 0;
      run.raceActive = true;
      run.debugFrozen = true;
      clearTraffic();
      game.renderer.render();
      return snapshot("party-run-started");
    }

    function testPartyClassic() {
      const setup = setupParty("classic");
      const started = startPartyTurn();
      const firstEnded = finishPartyRun({ score: 93000, boostPadsCollected: 1 });
      return { setup, started, firstEnded };
    }

    function testPartyFuel() {
      const setup = setupParty("fuelRun");
      const started = startPartyTurn();
      const run = app().run;
      run.fuel = Math.max(run.lowFuelThreshold + 2, run.fuelMax * 0.4);
      run.gasCansSpawned = Math.max(run.gasCansSpawned || 0, 1);
      makeObstacle("gasCan", 2, Math.max(playerAhead() + 210, 390), {
        waveType: "visualSmokePartyFuel",
        waveLabel: "Visual smoke party fuel"
      });
      const gasApproach = snapshot("party-fuel-gas-approach");
      const gasCollected = advanceUntil((game) => (game.run.gasCansCollected || 0) >= 1, 4).snapshot;
      const ended = finishPartyRun({ score: 88000, gasCansCollected: Math.max(1, gasCollected.fuel.gasCansCollected), gasCansSpawned: 1 });
      return { setup, started, gasApproach, gasCollected, ended };
    }

    function menuScreens() {
      const game = app();
      game.showDriverGarageScreen();
      const garage = {
        screen: game.screen,
        text: Boolean(document.querySelector(".garage-panel"))
      };
      game.showLeaderboard("scoreAttack");
      const scoreBoard = {
        screen: game.screen,
        scoreAttack: game.leaderboardView === "scoreAttack"
      };
      game.showLeaderboard("timeAttack");
      const timeBoard = {
        screen: game.screen,
        timeAttack: game.leaderboardView === "timeAttack"
      };
      game.showPlaytestReportScreen();
      const report = {
        screen: game.screen,
        playtestReport: Boolean(document.querySelector(".playtest-report-panel"))
      };
      return { garage, scoreBoard, timeBoard, report };
    }

    ensurePlayers();
    window.__nrrVisualSmoke = {
      primeRun,
      snapshot,
      testClassicBoost,
      testClassicRamp,
      testClassicFinish,
      testClassicCrash,
      testFuelGasAndCritical,
      testPursuitRoadblockAndEscaped,
      testPursuitBusted,
      testPartyClassic,
      testPartyFuel,
      menuScreens
    };
  });
}

async function collectScoreScreen(page) {
  const screen = await waitForScreen(page, ["score", "partyStandings", "partyFinal"], 6000);
  return page.evaluate((activeScreen) => ({
    screen: activeScreen,
    text: document.body.innerText.slice(0, 900),
    summary: (() => {
      const summary = window.neonRoadRally?.lastSummary;
      if (!summary) return null;
      return {
        status: summary.status,
        reason: summary.reason,
        raceTypeId: summary.raceTypeId,
        finalScore: summary.finalScore,
        finishTimeMs: summary.finishTimeMs,
        partyMode: Boolean(summary.partyMode),
        partyScreen: activeScreen,
        gasCansCollected: summary.gasCansCollected || 0,
        fuelRemaining: summary.fuelRemaining || 0,
        pursuitResult: summary.pursuitResult || "",
        roadblocksSpawned: summary.roadblocksSpawned || 0,
        roadblocksCleared: summary.roadblocksCleared || 0,
        boostPadsCollected: summary.boostPadsCollected || 0,
        rampsUsed: summary.rampsUsed || 0,
        rampTargetsCleared: summary.rampTargetsCleared || 0
      };
    })()
  }), screen);
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: BRAVE_PATH
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const consoleIssues = [];
  page.on("console", (msg) => {
    if (["warning", "error"].includes(msg.type())) {
      consoleIssues.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

  const report = {
    ok: false,
    baseUrl: BASE_URL,
    observed: {},
    scoreScreens: {},
    consoleIssues
  };

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.neonRoadRally), null, { timeout: 5000 });
    await page.evaluate(() => localStorage.clear());
    await installVisualSmokeHelpers(page);

    const boost = await page.evaluate(() => window.__nrrVisualSmoke.testClassicBoost());
    assert(boost.observed, "Classic boost pickup was not observed", boost.collected.boost);
    assert(boost.approach.visibleTypes.includes("boostPad"), "Classic boost pad was not visible before pickup", boost.approach);
    assert(boost.collected.boost.padBoostTimer > 0, "Boost-active timer was not visible after pickup", boost.collected.boost);
    assert(boost.collected.boost.flash > 0 && boost.collected.boost.trail > 0, "Boost pickup flash/trail timers were not active", boost.collected.boost);
    report.observed.classicBoost = {
      boostPadVisible: true,
      collected: boost.collected.boost.padsCollected,
      padBoostTimer: boost.collected.boost.padBoostTimer,
      flash: boost.collected.boost.flash,
      trail: boost.collected.boost.trail
    };

    const ramp = await page.evaluate(() => window.__nrrVisualSmoke.testClassicRamp());
    assert(ramp.approach.visibleTypes.includes("ramp"), "Classic ramp was not visible on approach", ramp.approach);
    assert(ramp.airborne.ramp.airborne && ramp.airborne.ramp.jumpOffset > 0, "Classic ramp airborne state was not observed", ramp.airborne.ramp);
    assert(ramp.landing.ramp.landingPulse > 0, "Classic ramp landing pulse was not observed", ramp.landing.ramp);
    assert(ramp.landing.ramp.targetsCleared >= 1, "Classic ramp target clear was not observed", ramp.landing.ramp);
    report.observed.classicRamp = {
      rampApproachVisible: true,
      airborneObserved: true,
      jumpOffset: ramp.airborne.ramp.jumpOffset,
      landingPulse: ramp.landing.ramp.landingPulse,
      targetsCleared: ramp.landing.ramp.targetsCleared,
      targetStatus: ramp.landing.ramp.targetStatus
    };

    const finish = await page.evaluate(() => window.__nrrVisualSmoke.testClassicFinish());
    assert(finish.finish.flash > 0 && finish.finish.stripe > 0, "Classic finish visual timers were not active", finish.finish);
    report.observed.classicFinish = finish.finish;
    report.scoreScreens.classicFinish = await collectScoreScreen(page);
    assert(report.scoreScreens.classicFinish.screen === "score", "Classic finish did not reach score screen", report.scoreScreens.classicFinish);

    const crash = await page.evaluate(() => window.__nrrVisualSmoke.testClassicCrash());
    assert(crash.impact.crash.flash > 0 && crash.impact.crash.beat > 0, "Classic crash impact visuals were not active", crash.impact.crash);
    assert(crash.ended.crash.flash > 0 || crash.ended.crash.sparks > 0, "Classic crash end visuals were not retained through impact pause", crash.ended.crash);
    report.observed.classicCrash = {
      impactFlash: crash.impact.crash.flash,
      impactBeat: crash.impact.crash.beat,
      endedFlash: crash.ended.crash.flash,
      endedSparks: crash.ended.crash.sparks
    };
    report.scoreScreens.classicCrash = await collectScoreScreen(page);
    assert(report.scoreScreens.classicCrash.screen === "score", "Classic crash did not reach score screen", report.scoreScreens.classicCrash);

    const fuel = await page.evaluate(() => window.__nrrVisualSmoke.testFuelGasAndCritical());
    assert(fuel.gasApproach.visibleTypes.includes("gasCan"), "Fuel Run gas can was not visible before pickup", fuel.gasApproach);
    assert(fuel.collected.fuel.gasCansCollected >= 1, "Fuel Run gas can was not collected", fuel.collected.fuel);
    assert(fuel.collected.fuel.fuel > fuel.beforeFuel, "Fuel Run gas pickup did not raise fuel", {
      before: fuel.beforeFuel,
      after: fuel.collected.fuel.fuel
    });
    assert(fuel.critical.fuel.critical && fuel.critical.fuel.warningPulse > 0, "Fuel Run critical fuel visual was not observed", fuel.critical.fuel);
    report.observed.fuelRun = {
      gasCanVisible: true,
      gasCansCollected: fuel.collected.fuel.gasCansCollected,
      fuelBefore: fuel.beforeFuel,
      fuelAfter: fuel.collected.fuel.fuel,
      criticalFuelObserved: true,
      warningPulse: fuel.critical.fuel.warningPulse
    };

    const pursuit = await page.evaluate(() => window.__nrrVisualSmoke.testPursuitRoadblockAndEscaped());
    assert(pursuit.warning.pursuit.roadblockAhead, "Pursuit roadblock warning was not active", pursuit.warning.pursuit);
    assert(pursuit.warning.objects.some((item) => item.pursuitRoadblock), "Pursuit roadblock gate was not visible", pursuit.warning.objects);
    assert(pursuit.warning.pursuit.escapeLaneCount >= 1, "Pursuit escape-lane guide was not represented", pursuit.warning.pursuit);
    assert(pursuit.cleared.pursuit.roadblocksCleared >= 1, "Pursuit roadblock clear was not observed", pursuit.cleared.pursuit);
    assert(pursuit.escaped.pursuit.escaped && pursuit.escaped.finish.flash > 0, "Pursuit escaped result visual was not observed", pursuit.escaped);
    report.observed.pursuitRoadblockEscaped = {
      roadblockWarning: true,
      roadblockGateVisible: true,
      heat: pursuit.warning.pursuit.heat,
      roadblocksCleared: pursuit.cleared.pursuit.roadblocksCleared,
      escaped: pursuit.escaped.pursuit.escaped,
      finishFlash: pursuit.escaped.finish.flash
    };
    report.scoreScreens.pursuitEscaped = await collectScoreScreen(page);
    assert(report.scoreScreens.pursuitEscaped.summary?.pursuitResult === "Escaped", "Pursuit escaped result was not recorded", report.scoreScreens.pursuitEscaped.summary);

    const busted = await page.evaluate(() => window.__nrrVisualSmoke.testPursuitBusted());
    assert(busted.pursuit.busted && busted.pursuit.bustedBeat > 0, "Pursuit busted visual was not observed", busted.pursuit);
    report.observed.pursuitBusted = {
      busted: busted.pursuit.busted,
      bustedBeat: busted.pursuit.bustedBeat,
      heat: busted.pursuit.heat
    };
    report.scoreScreens.pursuitBusted = await collectScoreScreen(page);
    assert(report.scoreScreens.pursuitBusted.summary?.pursuitResult === "Busted", "Pursuit busted result was not recorded", report.scoreScreens.pursuitBusted.summary);

    const partyClassic = await page.evaluate(() => window.__nrrVisualSmoke.testPartyClassic());
    assert(partyClassic.setup.screen === "partyTurn", "Party Classic did not reach turn handoff", partyClassic.setup);
    assert(partyClassic.started.raceTypeId === "classic" && partyClassic.started.screen === "game", "Party Classic run did not start", partyClassic.started);
    report.observed.partyClassic = {
      startScreen: partyClassic.started.screen,
      raceTypeId: partyClassic.started.raceTypeId,
      endedStatus: partyClassic.firstEnded.status
    };
    report.scoreScreens.partyClassic = await collectScoreScreen(page);
    assert(["partyStandings", "partyFinal"].includes(report.scoreScreens.partyClassic.screen), "Party Classic result screen was not reached", report.scoreScreens.partyClassic);

    const partyFuel = await page.evaluate(() => window.__nrrVisualSmoke.testPartyFuel());
    assert(partyFuel.setup.screen === "partyTurn", "Party Fuel did not reach turn handoff", partyFuel.setup);
    assert(partyFuel.started.raceTypeId === "fuelRun" && partyFuel.started.screen === "game", "Party Fuel run did not start", partyFuel.started);
    assert(partyFuel.gasApproach.visibleTypes.includes("gasCan"), "Party Fuel gas can was not visible", partyFuel.gasApproach);
    assert(partyFuel.gasCollected.fuel.gasCansCollected >= 1, "Party Fuel gas pickup was not collected", partyFuel.gasCollected.fuel);
    report.observed.partyFuel = {
      startScreen: partyFuel.started.screen,
      raceTypeId: partyFuel.started.raceTypeId,
      gasCanVisible: true,
      gasCansCollected: partyFuel.gasCollected.fuel.gasCansCollected,
      endedStatus: partyFuel.ended.status
    };
    report.scoreScreens.partyFuel = await collectScoreScreen(page);
    assert(["partyStandings", "partyFinal"].includes(report.scoreScreens.partyFuel.screen), "Party Fuel result screen was not reached", report.scoreScreens.partyFuel);

    const menu = await page.evaluate(() => window.__nrrVisualSmoke.menuScreens());
    assert(menu.garage.screen === "players" && menu.garage.text, "Garage screen smoke failed", menu.garage);
    assert(menu.scoreBoard.screen === "leaderboard" && menu.scoreBoard.scoreAttack, "Score Attack board smoke failed", menu.scoreBoard);
    assert(menu.timeBoard.screen === "leaderboard" && menu.timeBoard.timeAttack, "Time Attack board smoke failed", menu.timeBoard);
    assert(menu.report.screen === "playtestReport" && menu.report.playtestReport, "Playtest Report smoke failed", menu.report);
    report.observed.menuAndReports = menu;

    assert(consoleIssues.length === 0, "Console warnings/errors observed", { consoleIssues });
    report.ok = true;
    console.log("RACE_SCREEN_VISUAL_SMOKE_OK");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
