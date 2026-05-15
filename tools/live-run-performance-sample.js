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
const ROUTE_TIMEOUT_MS = Number(process.env.NRR_PERF_ROUTE_TIMEOUT_MS || 120000);
const POST_ROUTE_CLEANUP_MS = 900;
const INCLUDE_SEQUENCE = process.env.NRR_PERF_INCLUDE_SEQUENCE === "1";
const DEFAULT_PERF_ROUTE_IDS = [
  "sunset-neon-palm-sprint",
  "sunset-last-light-gauntlet",
  "blackout-headlight-mile",
  "blackout-blind-curve-cut",
  "blackout-lights-out-charge",
  "prism-pinkline-sprint",
  "prism-violet-boostway",
  "prism-hot-pink-redline"
].join(",");

const TRACK_PERFORMANCE_THRESHOLDS = {
  "blackout-run": {
    minAverageFps: 58,
    maxSlowFramePercent: 3,
    maxWorstFrameMs: 95,
    maxRecentAverageFrameMs: 24
  },
  "prism-highway": {
    minAverageFps: 58,
    maxSlowFramePercent: 3,
    maxWorstFrameMs: 95,
    maxRecentAverageFrameMs: 24
  }
};

const ROUTES = {
  "sunset-neon-palm-sprint": {
    routeId: "sunset-neon-palm-sprint",
    routeName: "Neon Palm Sprint",
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: "classic",
    seed: "SUNSET-PALM-SPRINT-TURBO"
  },
  "sunset-last-light-gauntlet": {
    routeId: "sunset-last-light-gauntlet",
    routeName: "Last Light Gauntlet",
    trackId: "sunset-highway",
    speedClassId: "redline",
    raceTypeId: "classic",
    seed: "SUNSET-LAST-LIGHT-REDLINE"
  },
  "blackout-headlight-mile": {
    routeId: "blackout-headlight-mile",
    routeName: "Headlight Mile",
    trackId: "blackout-run",
    speedClassId: "turbo",
    raceTypeId: "classic",
    seed: "BLACKOUT-HEADLIGHT-MILE-TURBO"
  },
  "blackout-blind-curve-cut": {
    routeId: "blackout-blind-curve-cut",
    routeName: "Blind Curve Cut",
    trackId: "blackout-run",
    speedClassId: "overdrive",
    raceTypeId: "classic",
    seed: "BLACKOUT-BLIND-CURVE-OVERDRIVE"
  },
  "blackout-lights-out-charge": {
    routeId: "blackout-lights-out-charge",
    routeName: "Lights Out Charge",
    trackId: "blackout-run",
    speedClassId: "redline",
    raceTypeId: "classic",
    seed: "BLACKOUT-LIGHTS-OUT-REDLINE"
  },
  "prism-pinkline-sprint": {
    routeId: "prism-pinkline-sprint",
    routeName: "Pinkline Sprint",
    trackId: "prism-highway",
    speedClassId: "turbo",
    raceTypeId: "classic",
    seed: "PRISM-PINKLINE-SPRINT-TURBO"
  },
  "prism-violet-boostway": {
    routeId: "prism-violet-boostway",
    routeName: "Violet Boostway",
    trackId: "prism-highway",
    speedClassId: "overdrive",
    raceTypeId: "classic",
    seed: "PRISM-VIOLET-BOOSTWAY-OVERDRIVE"
  },
  "prism-hot-pink-redline": {
    routeId: "prism-hot-pink-redline",
    routeName: "Hot Pink Redline",
    trackId: "prism-highway",
    speedClassId: "redline",
    raceTypeId: "classic",
    seed: "PRISM-HOT-PINK-REDLINE"
  },
  "boostline-neon-palm": {
    routeId: "boostline-neon-palm",
    routeName: "Neon Palm Boostline",
    trackId: "sunset-highway",
    speedClassId: "turbo",
    raceTypeId: "boostline",
    seed: "SUNSET-NEON-PALM-BOOSTLINE"
  },
  "redline-switchyard-boostline": {
    routeId: "redline-switchyard-boostline",
    routeName: "Switchyard Boostline",
    trackId: "redline-run",
    speedClassId: "overdrive",
    raceTypeId: "fuelRun",
    seed: "REDLINE-SWITCHYARD-BOOST-OD"
  }
};

function getRouteList() {
  const ids = String(process.env.NRR_PERF_ROUTE_IDS || DEFAULT_PERF_ROUTE_IDS)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.map((id) => {
    if (!ROUTES[id]) throw new Error(`Unknown performance route id: ${id}`);
    return ROUTES[id];
  });
}

async function runRoute(page, route) {
  await page.evaluate((routeConfig) => {
    const app = window.neonRoadRally;
    if (!app) throw new Error("Neon Road Rally app missing");
    localStorage.clear();
    app.profiles.data.players = [];
    app.profiles.data.currentPlayerId = null;
    const driver = app.profiles.createPlayer("Perf QA");
    app.profiles.selectPlayer(driver.id);
    if (app.collision) app.collision.update = () => {};
    app.startRace({
      trackId: routeConfig.trackId,
      speedClassId: routeConfig.speedClassId,
      raceTypeId: routeConfig.raceTypeId,
      seed: routeConfig.seed,
      officialRouteId: routeConfig.routeId
    });
    app.run.countdownTimer = 0;
    app.run.raceActive = true;
  }, route);

  try {
    await page.waitForFunction(() => window.neonRoadRally?.run?.ended === true, null, { timeout: ROUTE_TIMEOUT_MS });
  } catch (error) {
    const diagnostic = await page.evaluate(() => {
      const app = window.neonRoadRally;
      const run = app?.run || {};
      return {
        screen: app?.screen || "",
        ended: Boolean(run.ended),
        raceActive: Boolean(run.raceActive),
        countdownTimer: Number((run.countdownTimer || 0).toFixed(2)),
        distance: Math.round(run.distance || 0),
        finishDistance: Math.round(run.track?.distanceToFinish || 0),
        elapsed: Number((run.elapsed || 0).toFixed(2)),
        currentSpeed: Math.round(run.currentSpeed || 0),
        frameSampleCount: run.frameSampleCount || 0,
        averageFps: Number((run.averageFps || 0).toFixed(1)),
        worstFrameMs: Number((run.frameTimeMaxMs || 0).toFixed(2)),
        performanceEffectScale: Number((run.performanceEffectScale || 1).toFixed(2)),
        renderEffectScaleMin: Number((run.renderEffectScaleMin || 1).toFixed(2)),
        routeSeedLocked: Boolean(run.routeSeedLocked || run.officialRouteSeedLocked),
        routeSignatureHash: run.routeSignatureHash || "",
        runProgressSignatureHash: run.runProgressSignatureHash || run.routeSignatureHash || "",
        officialFullRouteSignatureHash: run.officialFullRouteSignatureHash || ""
      };
    });
    throw new Error(`Timed out waiting for ${route.routeName} to finish: ${error.message} ${JSON.stringify(diagnostic)}`);
  }

  const result = await page.evaluate((routeConfig) => {
    const app = window.neonRoadRally;
    const run = app.run || {};
    const summary = app.lastSummary || {};
    const sequence = run.roadDirectorSequence || [];
    const hashString = (value) => {
      let hash = 2166136261;
      const text = String(value || "");
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(16).padStart(8, "0");
    };
    const routeContentKey = sequence.map((wave) => [
      wave.type || "",
      wave.sectionId || "",
      (wave.blockedLanes || []).join(","),
      (wave.boostLanes || []).join(","),
      (wave.rampLanes || []).join(","),
      (wave.gasCanLanes || []).join(","),
      (wave.routeLanes || []).join(","),
      (wave.rewardLanes || []).join(","),
      (wave.obstacles || []).map((obstacle) => `${obstacle.type}:${obstacle.lane}`).join(",")
    ].join("|")).join(";");
    const routeCoarseKey = sequence.map((wave) => [
      wave.type || "",
      wave.sectionId || "",
      Math.round((Number(wave.distance) || 0) / 500) * 500,
      (wave.blockedLanes || []).join(","),
      (wave.boostLanes || []).join(","),
      (wave.rampLanes || []).join(","),
      (wave.gasCanLanes || []).join(","),
      (wave.routeLanes || []).join(","),
      (wave.rewardLanes || []).join(","),
      (wave.obstacles || []).map((obstacle) => `${obstacle.type}:${obstacle.lane}:${Math.round((Number(obstacle.distance) || 0) / 500) * 500}`).join(",")
    ].join("|")).join(";");
    const result = {
      routeId: routeConfig.routeId,
      routeName: routeConfig.routeName,
      trackId: routeConfig.trackId,
      raceTypeId: routeConfig.raceTypeId,
      speedClassId: routeConfig.speedClassId,
      seed: routeConfig.seed,
      status: summary.status || run.status || "",
      finishTimeMs: summary.finishTimeMs ?? null,
      frameSampleCount: run.frameSampleCount || 0,
      averageFrameMs: Number((run.averageFrameMs || 0).toFixed(2)),
      averageFps: Number((run.averageFps || 0).toFixed(1)),
      worstFrameMs: Number((run.frameTimeMaxMs || 0).toFixed(2)),
      recentAverageFrameMs: Number((run.frameTimeRecentAvgMs || 0).toFixed(2)),
      recentWorstFrameMs: Number((run.frameTimeRecentMaxMs || 0).toFixed(2)),
      slowFramePercent: Number((run.slowFramePercent || 0).toFixed(2)),
      performanceEffectScale: Number((run.performanceEffectScale || 1).toFixed(2)),
      renderEffectScaleMin: Number((run.renderEffectScaleMin || 1).toFixed(2)),
      routeSeedLocked: Boolean(run.routeSeedLocked || run.officialRouteSeedLocked),
      routeContentHash: hashString(routeContentKey),
      routeCoarseHash: hashString(routeCoarseKey),
      routeSignatureHash: run.routeSignatureHash || "",
      routeSignatureWaveCount: run.routeSignatureWaveCount || 0,
      runProgressSignatureHash: run.runProgressSignatureHash || run.routeSignatureHash || "",
      runProgressSignatureWaveCount: run.runProgressSignatureWaveCount || run.routeSignatureWaveCount || 0,
      officialFullRouteSignatureHash: run.officialFullRouteSignatureHash || "",
      officialFullRouteSignatureWaveCount: run.officialFullRouteSignatureWaveCount || 0
    };
    if (routeConfig.includeSequence) {
      result.sequence = (run.roadDirectorSequence || []).map((wave) => ({
        index: wave.index,
        type: wave.type,
        sectionId: wave.sectionId,
        distance: wave.distance,
        lanes: wave.blockedLanes || [],
        routes: wave.routeLanes || [],
        rewards: wave.rewardLanes || [],
        obstacles: (wave.obstacles || []).map((obstacle) => ({
          type: obstacle.type,
          lane: obstacle.lane,
          distance: obstacle.distance
        }))
      }));
    }
    return result;
  }, { ...route, includeSequence: INCLUDE_SEQUENCE });
  await page.waitForTimeout(POST_ROUTE_CLEANUP_MS);
  return result;
}

function assertPerformanceResults(results) {
  const failures = [];
  for (const result of results) {
    const threshold = TRACK_PERFORMANCE_THRESHOLDS[result.trackId];
    if (!threshold) continue;
    if (result.averageFps < threshold.minAverageFps) {
      failures.push(`${result.routeId} averageFps ${result.averageFps} < ${threshold.minAverageFps}`);
    }
    if (result.slowFramePercent > threshold.maxSlowFramePercent) {
      failures.push(`${result.routeId} slowFramePercent ${result.slowFramePercent} > ${threshold.maxSlowFramePercent}`);
    }
    if (result.worstFrameMs > threshold.maxWorstFrameMs) {
      failures.push(`${result.routeId} worstFrameMs ${result.worstFrameMs} > ${threshold.maxWorstFrameMs}`);
    }
    if (result.recentAverageFrameMs > threshold.maxRecentAverageFrameMs) {
      failures.push(`${result.routeId} recentAverageFrameMs ${result.recentAverageFrameMs} > ${threshold.maxRecentAverageFrameMs}`);
    }
  }
  if (failures.length) {
    throw new Error(`Performance thresholds failed: ${failures.join(" | ")}`);
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
    const results = [];
    for (const route of getRouteList()) {
      results.push(await runRoute(page, route));
    }
    assertPerformanceResults(results);
    if (consoleIssues.length) {
      throw new Error(`Console warnings/errors found: ${consoleIssues.join(" | ")}`);
    }
    console.log("LIVE_RUN_PERFORMANCE_SAMPLE_OK");
    console.log(JSON.stringify({ results, consoleIssues, thresholds: TRACK_PERFORMANCE_THRESHOLDS }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
