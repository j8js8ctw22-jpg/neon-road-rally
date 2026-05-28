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
const OUT_DIR = process.env.NRR_VISUAL_QA_OUT_DIR || "/private/tmp/nrr-race-screen-visual-smoke";

function assert(condition, message, details = {}) {
  if (!condition) {
    const suffix = Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
    throw new Error(`${message}${suffix}`);
  }
}

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function assertNoDuplicateResultHierarchy(scoreScreen, label) {
  if (scoreScreen?.screen !== "score") return;
  const text = String(scoreScreen.text || "");
  const primaryActions = Array.isArray(scoreScreen.primaryActions) ? scoreScreen.primaryActions : [];
  const cashAmount = Math.max(0, Number(scoreScreen.summary?.neonCashAwardAmount || 0));
  const cashMentions = countMatches(text, /\+\d[\d,]*\s+Neon Cash\b/gi);
  assert(primaryActions.length === 1, `${label} should expose exactly one primary action`, { primaryActions, text });
  if (cashAmount > 0) {
    assert(cashMentions === 1, `${label} should show earned Neon Cash exactly once`, { cashAmount, cashMentions, text });
  } else {
    assert(cashMentions === 0, `${label} should hide zero Neon Cash awards`, { cashAmount, cashMentions, text });
  }
  if (scoreScreen.summary?.status !== "finished") {
    assert(countMatches(text, /^RUN OVER$/gim) <= 1, `${label} should not duplicate RUN OVER`, { text });
    assert(countMatches(text, /^PROGRESS$/gim) <= 1, `${label} should not duplicate Progress stat labels`, { text });
    assert(!/NO FINISH TIME\s*(?:·|\n)\s*NO FINISH TIME/i.test(text), `${label} should not duplicate No finish time copy`, { text });
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

    function laneCount() {
      return typeof LANES === "number" ? LANES : 7;
    }

    function centerLane() {
      return typeof TRACK_DIRECTOR === "object" && Number.isFinite(TRACK_DIRECTOR.centerLane)
        ? TRACK_DIRECTOR.centerLane
        : Math.floor(laneCount() / 2);
    }

    function roadLanes() {
      return Array.from({ length: laneCount() }, (_, lane) => lane);
    }

    function clearTraffic() {
      const game = app();
      game.obstacles.obstacles = [];
      game.obstacles.seedLockedSpawnObstacles = [];
      if (game.run?.track) {
        game.obstacles.nextSpawnDistance = game.run.track.distanceToFinish + 100000;
      }
    }

    function syncPlayerLane(lane = centerLane()) {
      const run = app().run;
      run.targetLane = lane;
      run.renderLaneFloat = lane;
      run.playerLaneFloat = lane;
    }

    function installRoadSignProbe() {
      const renderer = app().renderer;
      if (!renderer || renderer.__visualSmokeRoadSignProbeInstalled) return;
      renderer.__visualSmokeRoadSignProbeInstalled = true;
      renderer.__visualSmokeRoadSignCounts = {};
      ["drawRoadsideBillboard", "drawNeonMileSign", "drawRedlineChevronSign"].forEach((methodName) => {
        const original = renderer[methodName];
        if (typeof original !== "function") return;
        renderer[methodName] = function probedRoadSign(...args) {
          this.__visualSmokeRoadSignCounts[methodName] = (this.__visualSmokeRoadSignCounts[methodName] || 0) + 1;
          return original.apply(this, args);
        };
      });
    }

    function resetRoadSignProbe() {
      const renderer = app().renderer;
      if (!renderer) return;
      installRoadSignProbe();
      renderer.__visualSmokeRoadSignCounts = {};
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
      syncPlayerLane(centerLane());
      clearTraffic();
      game.updateRaceSection(true);
      game.updateAudioMusicState();
      resetRoadSignProbe();
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

    function pixelAt(ctx, canvas, x, y) {
      const game = app();
      const scaleX = canvas.width / Math.max(1, game.renderer.width);
      const scaleY = canvas.height / Math.max(1, game.renderer.height);
      const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x * scaleX)));
      const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y * scaleY)));
      const data = ctx.getImageData(sx, sy, 1, 1).data;
      const luma = data[0] * 0.2126 + data[1] * 0.7152 + data[2] * 0.0722;
      const chroma = Math.max(data[0], data[1], data[2]) - Math.min(data[0], data[1], data[2]);
      return {
        r: data[0],
        g: data[1],
        b: data[2],
        a: data[3],
        luma: Number(luma.toFixed(2)),
        chroma
      };
    }

    function hueFamily(sample) {
      const max = Math.max(sample.r, sample.g, sample.b);
      const min = Math.min(sample.r, sample.g, sample.b);
      const chroma = max - min;
      if (sample.luma < 18 || chroma < 28) return "";
      let hue = 0;
      if (max === sample.r) hue = ((sample.g - sample.b) / chroma) % 6;
      else if (max === sample.g) hue = (sample.b - sample.r) / chroma + 2;
      else hue = (sample.r - sample.g) / chroma + 4;
      hue = (hue * 60 + 360) % 360;
      if (hue < 18 || hue >= 342) return "red";
      if (hue < 42) return "orange";
      if (hue < 72) return "yellow";
      if (hue < 150) return "green";
      if (hue < 205) return "cyan";
      if (hue < 255) return "blue";
      if (hue < 292) return "violet";
      return "magenta";
    }

    function summarizeSamples(samples) {
      const count = Math.max(1, samples.length);
      const lumas = samples.map((sample) => sample.luma);
      const chromas = samples.map((sample) => sample.chroma);
      const families = Array.from(new Set(samples.map(hueFamily).filter(Boolean))).sort();
      return {
        count: samples.length,
        averageLuma: Number((lumas.reduce((sum, value) => sum + value, 0) / count).toFixed(2)),
        maxLuma: Number(Math.max(...lumas, 0).toFixed(2)),
        averageChroma: Number((chromas.reduce((sum, value) => sum + value, 0) / count).toFixed(2)),
        maxChroma: Math.max(...chromas, 0),
        brightPixelRatio: Number((samples.filter((sample) => sample.luma >= 64).length / count).toFixed(3)),
        colorCoverage: Number((samples.filter((sample) => sample.chroma >= 42 && sample.luma >= 24).length / count).toFixed(3)),
        hueFamilies: families
      };
    }

    function regionSamples(ctx, canvas, rect, step = 14) {
      const samples = [];
      const startX = Math.max(0, rect.x);
      const endX = Math.min(app().renderer.width, rect.x + rect.w);
      const startY = Math.max(0, rect.y);
      const endY = Math.min(app().renderer.height, rect.y + rect.h);
      for (let y = startY; y <= endY; y += step) {
        for (let x = startX; x <= endX; x += step) {
          samples.push(pixelAt(ctx, canvas, x, y));
        }
      }
      return samples;
    }

    function regionStats(ctx, canvas, rect, step = 14) {
      return summarizeSamples(regionSamples(ctx, canvas, rect, step));
    }

    function canvasIdentitySample() {
      const game = app();
      game.renderer.render();
      const canvas = game.canvas;
      const ctx = canvas.getContext("2d");
      const road = game.renderer.road;
      const roadCore = regionStats(ctx, canvas, {
        x: road.x + road.w * 0.12,
        y: road.y + road.h * 0.18,
        w: road.w * 0.76,
        h: road.h * 0.5
      }, 18);
      const centerWash = regionStats(ctx, canvas, {
        x: road.x + road.w * 0.28,
        y: road.y + road.h * 0.36,
        w: road.w * 0.44,
        h: road.h * 0.3
      }, 16);
      const sideWashSamples = regionSamples(ctx, canvas, {
        x: road.x + road.w * 0.04,
        y: road.y + road.h * 0.36,
        w: road.w * 0.18,
        h: road.h * 0.3
      }, 16).concat(regionSamples(ctx, canvas, {
        x: road.x + road.w * 0.78,
        y: road.y + road.h * 0.36,
        w: road.w * 0.18,
        h: road.h * 0.3
      }, 16));
      const sideWash = summarizeSamples(sideWashSamples);
      const backgroundSamples = regionSamples(ctx, canvas, {
        x: 0,
        y: road.y + road.h * 0.08,
        w: Math.max(1, road.x - 22),
        h: road.h * 0.48
      }, 20).concat(regionSamples(ctx, canvas, {
        x: road.x + road.w + 22,
        y: road.y + road.h * 0.08,
        w: Math.max(1, game.renderer.width - road.x - road.w - 22),
        h: road.h * 0.48
      }, 20));
      const background = summarizeSamples(backgroundSamples);
      return {
        roadCore,
        centerWash,
        sideWash,
        background,
        centerToSideLumaDelta: Number((centerWash.averageLuma - sideWash.averageLuma).toFixed(2))
      };
    }

    function canvasReadabilitySample() {
      const game = app();
      game.renderer.render();
      const canvas = game.canvas;
      const ctx = canvas.getContext("2d");
      const road = game.renderer.road;
      const roadCenterX = road.x + road.w * 0.5;
      const roadCenterY = road.y + road.h * 0.56;
      const laneDividerX = road.x + road.laneW * centerLane();
      const rightEdgeX = road.x + road.w + 8;
      const scanYs = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8].map((ratio) => road.y + road.h * ratio);
      const laneSamples = scanYs.map((y) => pixelAt(ctx, canvas, laneDividerX, y));
      const edgeSamples = scanYs.map((y) => pixelAt(ctx, canvas, rightEdgeX, y));
      const roadSamples = [
        pixelAt(ctx, canvas, roadCenterX, roadCenterY),
        pixelAt(ctx, canvas, road.x + road.w * 0.32, road.y + road.h * 0.48),
        pixelAt(ctx, canvas, road.x + road.w * 0.68, road.y + road.h * 0.64)
      ];
      const maxLuma = (samples) => Math.max(...samples.map((sample) => sample.luma));
      const avgLuma = (samples) => samples.reduce((sum, sample) => sum + sample.luma, 0) / Math.max(1, samples.length);
      const maxChroma = Math.max(...laneSamples.concat(edgeSamples, roadSamples).map((sample) => sample.chroma));
      return {
        roadAverageLuma: Number(avgLuma(roadSamples).toFixed(2)),
        laneDividerMaxLuma: maxLuma(laneSamples),
        edgeMaxLuma: maxLuma(edgeSamples),
        maxChroma,
        laneSamples,
        edgeSamples,
        roadSamples
      };
    }

    function objectPixelStats(types = []) {
      const game = app();
      game.renderer.render();
      const canvas = game.canvas;
      const ctx = canvas.getContext("2d");
      const run = game.run;
      if (!run) return [];
      return game.obstacles.obstacles
        .filter((obstacle) => types.includes(obstacle.type) && !obstacle.hit && !obstacle.remove)
        .map((obstacle) => {
          const rect = game.renderer.getObstacleVisualRectAt(obstacle, run.distance);
          if (!rect) return null;
          const isTrafficBody = ["slowCar", "fastCar", "truck"].includes(obstacle.type);
          const insetX = rect.renderedWidth * (isTrafficBody ? 0.06 : 0.12);
          const insetY = rect.renderedHeight * (isTrafficBody ? 0.02 : 0.12);
          return {
            type: obstacle.type,
            lane: Math.round(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane),
            ahead: Math.round(obstacle.distance - run.distance),
            stats: regionStats(ctx, canvas, {
              x: rect.renderedX + insetX,
              y: rect.renderedY + insetY,
              w: Math.max(1, rect.renderedWidth - insetX * 2),
              h: Math.max(1, rect.renderedHeight - insetY * 2)
            }, Math.max(4, Math.round(Math.min(rect.renderedWidth, rect.renderedHeight) / 8)))
          };
        })
        .filter(Boolean);
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
            y: Number((rect?.centerY || 0).toFixed(2)),
            flowAlpha: Number((rect?.flowAlpha ?? 1).toFixed(3)),
            flowBlend: Number((rect?.flowBlend ?? 0).toFixed(3)),
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

    function decisionMetrics(label = "decision") {
      const game = app();
      const run = game.run || {};
      const speed = Math.max(1, Number(run.currentSpeed) || 1);
      const currentLane = Math.round(Math.max(0, Math.min(laneCount() - 1, Number.isFinite(run.targetLane) ? run.targetLane : centerLane())));
      const playerAheadDistance = playerAhead();
      const roadTopAhead = game.renderer.aheadForY(game.renderer.road.y);
      const activity = game.obstacles.getRoadActivitySnapshot?.(run, game.obstacles.obstacles, run.distance || 0, {
        visibleDistance: roadTopAhead
      }) || null;
      const records = (activity?.records || [])
        .filter((record) => record.visible && record.ahead > playerAheadDistance)
        .sort((a, b) => a.ahead - b.ahead);
      const firstMeaningful = records[0] || null;
      const requiredLaneDecisions = records.filter((record) => (
        (record.role === "hard blocker" || record.role === "intentional minor hazard")
        && record.lane === currentLane
      ));
      const fallbackHardDecisions = records.filter((record) => record.role === "hard blocker");
      const firstRequiredLaneDecision = requiredLaneDecisions[0] || fallbackHardDecisions[0] || firstMeaningful;
      const secondRequiredLaneDecision = requiredLaneDecisions[1] || fallbackHardDecisions.find((record) => record !== firstRequiredLaneDecision) || null;
      const visibleWaveKeys = new Set(records.map((record) => (
        record.waveId || record.waveLabel || record.waveType || `${record.role}:${record.type}:${Math.round(record.ahead / 500)}`
      )));
      const majorHazards = records.filter((record) => record.role === "hard blocker");
      const routeRewards = records.filter((record) => ["boost temptation", "ramp solution", "gas route", "free center gas"].includes(record.role));
      const decisionGaps = [];
      for (let index = 1; index < records.length; index += 1) {
        decisionGaps.push((records[index].ahead - records[index - 1].ahead) / speed);
      }
      const averageGap = decisionGaps.length
        ? decisionGaps.reduce((sum, value) => sum + value, 0) / decisionGaps.length
        : null;
      const distanceToPlayerZone = (record) => record ? Math.max(0, record.ahead - playerAheadDistance) : null;
      const secondsToPlayerZone = (record) => {
        const distance = distanceToPlayerZone(record);
        return distance === null ? null : distance / speed;
      };
      return {
        label,
        currentSpeed: Math.round(speed),
        currentLane,
        playerAhead: Number(playerAheadDistance.toFixed(2)),
        roadTopAhead: Number(roadTopAhead.toFixed(2)),
        readDistanceToPlayer: Number((roadTopAhead - playerAheadDistance).toFixed(2)),
        visibleLookaheadDistance: typeof VIEW_DISTANCE === "number" ? VIEW_DISTANCE : null,
        projectionMode: typeof CAMERA_CONFIG === "object" ? CAMERA_CONFIG.gameplayProjectionMode : "",
        projectionStrength: typeof CAMERA_CONFIG === "object" ? CAMERA_CONFIG.gameplayProjectionStrength : null,
        farScale: typeof CAMERA_CONFIG === "object" ? CAMERA_CONFIG.farScale : null,
        firstVisibleMeaningful: firstMeaningful ? {
          type: firstMeaningful.type,
          lane: firstMeaningful.lane,
          role: firstMeaningful.role,
          ahead: Math.round(firstMeaningful.ahead),
          distanceToPlayerZone: Math.round(distanceToPlayerZone(firstMeaningful)),
          secondsToPlayerZone: Number(secondsToPlayerZone(firstMeaningful).toFixed(2))
        } : null,
        firstRequiredLaneDecision: firstRequiredLaneDecision ? {
          type: firstRequiredLaneDecision.type,
          lane: firstRequiredLaneDecision.lane,
          role: firstRequiredLaneDecision.role,
          ahead: Math.round(firstRequiredLaneDecision.ahead),
          distanceToPlayerZone: Math.round(distanceToPlayerZone(firstRequiredLaneDecision)),
          secondsToPlayerZone: Number(secondsToPlayerZone(firstRequiredLaneDecision).toFixed(2))
        } : null,
        secondRequiredLaneDecision: secondRequiredLaneDecision ? {
          type: secondRequiredLaneDecision.type,
          lane: secondRequiredLaneDecision.lane,
          role: secondRequiredLaneDecision.role,
          ahead: Math.round(secondRequiredLaneDecision.ahead),
          distanceToPlayerZone: Math.round(distanceToPlayerZone(secondRequiredLaneDecision)),
          secondsToPlayerZone: Number(secondsToPlayerZone(secondRequiredLaneDecision).toFixed(2))
        } : null,
        visibleMeaningfulWaves: visibleWaveKeys.size,
        visibleMajorHazardsAhead: majorHazards.length,
        visibleRewardsAndRoutesAhead: routeRewards.length,
        nearestMajorBlockerTimeToDanger: majorHazards[0] ? Number(secondsToPlayerZone(majorHazards[0]).toFixed(2)) : null,
        nearestRewardRouteTimeToChoice: routeRewards[0] ? Number(secondsToPlayerZone(routeRewards[0]).toFixed(2)) : null,
        visibleMeaningfulObjects: activity?.visibleMeaningfulObjects ?? 0,
        visibleHardBlockers: activity?.visibleHardBlockers ?? 0,
        visibleRewards: activity?.visibleRewards ?? 0,
        meaningfulTotal: activity?.meaningfulTotal ?? records.length,
        averageUpcomingDecisionGapSeconds: averageGap === null ? null : Number(averageGap.toFixed(2)),
        records: records.map((record) => ({
          type: record.type,
          lane: record.lane,
          role: record.role,
          ahead: Math.round(record.ahead),
          wave: record.waveId || record.waveLabel || record.waveType || ""
        }))
      };
    }

    function snapshot(label = "") {
      const game = app();
      const run = game.run || {};
      const objects = visibleObjects();
      const road = game.renderer.road;
      const playerRect = game.renderer.getPlayerVisualRect();
      const playerY = game.renderer.getPlayerScreenY();
      const playerAheadDistance = game.renderer.aheadForY(playerY);
      const roadTopAhead = game.renderer.aheadForY(road.y);
      const laneCenters = roadLanes().map((lane) => Number(game.renderer.laneCenter(lane).toFixed(2)));
      const music = (() => {
        const identity = game.audio?.getMusicIdentityLayer?.();
        const state = game.audio?.musicState || {};
        const lastEvent = game.audio?.lastMusicEvent || null;
        const intensity = Number(identity?.intensity ?? state.intensity ?? 0) || 0;
        return {
          id: identity?.id || state.id || "",
          cueLabel: identity?.cueLabel || state.label || "",
          mood: identity?.mood || "",
          intensity: Number(intensity.toFixed(3)),
          sectionStem: identity?.futureHooks?.sectionStem || "",
          overlayStem: identity?.futureHooks?.overlayStem || "",
          active: Boolean(identity?.active),
          boosted: Boolean(identity?.boosted),
          airborne: Boolean(identity?.airborne),
          lastEvent: lastEvent?.id || "",
          lastEventHook: lastEvent?.futureHook || ""
        };
      })();
      return {
        label,
        screen: game.screen,
        trackId: run.track?.id || "",
        trackName: run.track?.name || "",
        visualIdentity: run.track?.visualTheme?.identity || "",
        raceTypeId: run.raceTypeId || "",
        speedClassId: run.speedClassId || "",
        status: run.ended ? (run.finished ? "finished" : "ended") : "running",
        endReason: run.endReason || "",
        distance: Math.round(run.distance || 0),
        progress: Number(((run.distance || 0) / Math.max(1, run.track?.distanceToFinish || 1)).toFixed(3)),
        currentSpeed: Math.round(run.currentSpeed || 0),
        laneCount: laneCount(),
        road: {
          x: Number(road.x.toFixed(2)),
          y: Number(road.y.toFixed(2)),
          w: Number(road.w.toFixed(2)),
          h: Number(road.h.toFixed(2)),
          laneW: Number(road.laneW.toFixed(2)),
          laneCenters,
          fitsHorizontally: road.x >= 0 && road.x + road.w <= game.renderer.width,
          rendererWidth: game.renderer.width,
          rendererHeight: game.renderer.height
        },
        camera: {
          playerY: Number(playerY.toFixed(2)),
          playerYRatio: Number((playerY / Math.max(1, game.renderer.height)).toFixed(3)),
          playerAhead: Number(playerAheadDistance.toFixed(2)),
          roadTopAhead: Number(roadTopAhead.toFixed(2)),
          readDistanceToPlayer: Number((roadTopAhead - playerAheadDistance).toFixed(2)),
          playerBottomClearance: Number((game.renderer.height - (playerRect.renderedY + playerRect.renderedHeight)).toFixed(2)),
          playerVisualHeight: Number(playerRect.renderedHeight.toFixed(2)),
          farScale: typeof CAMERA_CONFIG === "object" ? CAMERA_CONFIG.farScale : null,
          scalePerspectiveStrength: typeof CAMERA_CONFIG === "object" ? CAMERA_CONFIG.scalePerspectiveStrength : null,
          lowRoadDetail: Boolean(game.renderer.shouldUseLowRoadDetail?.(game.renderer.getCurrentTrackVisualTheme?.(), game.renderer.getPerformanceEffectScale?.()))
        },
        decision: decisionMetrics(label),
        roadSignCalls: { ...(game.renderer.__visualSmokeRoadSignCounts || {}) },
        objects,
        visibleTypes: Array.from(new Set(objects.map((item) => item.type))).sort(),
        canvas: canvasSample(),
        music,
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

    function testTrackTheme(trackId, options = {}) {
      const speedClassId = options.speedClassId || "turbo";
      const raceTypeId = options.raceTypeId || "classic";
      primeRun({
        raceTypeId,
        speedClassId,
        trackId,
        seed: `VISUAL-${trackId.toUpperCase()}-${speedClassId.toUpperCase()}`
      });
      const ahead = Math.max(playerAhead() + 240, 430);
      makeObstacle("slowCar", centerLane(), ahead);
      makeObstacle("boostPad", 1, ahead + 220);
      if (options.includeFuelAndBarrier) {
        makeObstacle("barrier", 0, ahead + 360, {
          waveType: "visualSmokeTrackTheme",
          waveLabel: "Visual smoke track theme barrier"
        });
        makeObstacle("gasCan", laneCount() - 1, ahead + 500, {
          waveType: "visualSmokeTrackTheme",
          waveLabel: "Visual smoke track theme fuel"
        });
      }
      makeObstacle("ramp", Math.min(laneCount() - 1, centerLane() + 1), ahead + 640, {
        waveType: "visualSmokeTrackTheme",
        waveLabel: "Visual smoke track theme"
      });
      return {
        trackId,
        speedClassId,
        raceTypeId,
        snapshot: snapshot(`track-theme-${trackId}`),
        readability: canvasReadabilitySample()
      };
    }

    function testBlackoutSpeedReadability(speedClassId) {
      return testTrackTheme("blackout-run", {
        speedClassId,
        raceTypeId: "fuelRun",
        includeFuelAndBarrier: true
      });
    }

    function addFullObjectReadabilitySet() {
      const ahead = Math.max(300, playerAhead() * 0.42);
      makeObstacle("slowCar", centerLane(), ahead);
      makeObstacle("fastCar", 0, ahead + 170);
      makeObstacle("truck", laneCount() - 1, ahead + 340);
      makeObstacle("barrier", 1, ahead + 500, {
        waveType: "visualSmokeIdentity",
        waveLabel: "Visual smoke identity barrier"
      });
      makeObstacle("boostPad", Math.min(laneCount() - 1, centerLane() + 1), ahead + 660, {
        waveType: "visualSmokeIdentity",
        waveLabel: "Visual smoke identity boost"
      });
      makeObstacle("gasCan", centerLane(), ahead + 820, {
        waveType: "visualSmokeIdentity",
        waveLabel: "Visual smoke identity fuel"
      });
      makeObstacle("ramp", laneCount() - 2, ahead + 980, {
        waveType: "visualSmokeIdentity",
        waveLabel: "Visual smoke identity ramp"
      });
    }

    function testBlackoutIdentity(speedClassId = "turbo") {
      primeRun({
        raceTypeId: "fuelRun",
        speedClassId,
        trackId: "blackout-run",
        seed: `VISUAL-BLACKOUT-IDENTITY-${speedClassId.toUpperCase()}`
      });
      const roadOnly = {
        snapshot: snapshot(`blackout-road-only-${speedClassId}`),
        readability: canvasReadabilitySample(),
        identity: canvasIdentitySample()
      };
      addFullObjectReadabilitySet();
      return {
        trackId: "blackout-run",
        speedClassId,
        roadOnly,
        objects: snapshot(`blackout-objects-${speedClassId}`),
        readability: canvasReadabilitySample(),
        identity: canvasIdentitySample(),
        objectStats: objectPixelStats(["slowCar", "fastCar", "truck", "barrier", "boostPad", "gasCan", "ramp"])
      };
    }

    function testPrismIdentity(speedClassId = "turbo") {
      primeRun({
        raceTypeId: "fuelRun",
        speedClassId,
        trackId: "prism-highway",
        seed: `VISUAL-PRISM-IDENTITY-${speedClassId.toUpperCase()}`
      });
      const roadOnly = {
        snapshot: snapshot(`prism-road-only-${speedClassId}`),
        readability: canvasReadabilitySample(),
        identity: canvasIdentitySample()
      };
      addFullObjectReadabilitySet();
      return {
        trackId: "prism-highway",
        speedClassId,
        roadOnly,
        objects: snapshot(`prism-objects-${speedClassId}`),
        readability: canvasReadabilitySample(),
        identity: canvasIdentitySample(),
        objectStats: objectPixelStats(["slowCar", "fastCar", "truck", "barrier", "boostPad", "gasCan", "ramp"])
      };
    }

    function testClassicBoost() {
      primeRun({ raceTypeId: "classic", speedClassId: "redline", seed: TEST_SEEDS.classic });
      const ahead = Math.max(playerAhead() + 230, 420);
      makeObstacle("boostPad", centerLane(), ahead);
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
      const target = makeObstacle("barrier", centerLane(), rampAhead + targetGap, {
        rampTarget: true,
        waveType: "visualSmokeRampTarget",
        waveLabel: "Visual smoke ramp target"
      });
      makeObstacle("ramp", centerLane(), rampAhead, {
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
      makeObstacle("slowCar", centerLane(), playerAhead());
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
      makeObstacle("gasCan", centerLane(), ahead, {
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

    function testFuelGasApproachOnly(label = "fuel-gas-visible") {
      primeRun({ raceTypeId: "fuelRun", speedClassId: "pro", seed: `${TEST_SEEDS.fuel}-${label}` });
      const run = app().run;
      run.fuel = Math.max(run.lowFuelThreshold + 3, Math.min(run.fuelMax, run.fuelMax * 0.45));
      const ahead = Math.max(playerAhead() + 260, 430);
      run.gasCansSpawned = Math.max(run.gasCansSpawned || 0, 1);
      makeObstacle("gasCan", centerLane(), ahead, {
        waveType: "visualSmokeFuel",
        waveLabel: "Visual smoke fuel approach"
      });
      return snapshot(label);
    }

    function testDecisionDistance(label = "decision-distance") {
      primeRun({
        raceTypeId: "classic",
        speedClassId: "turbo",
        trackId: "sunset-highway",
        seed: `VISUAL-${label}`
      });
      const game = app();
      const playerAheadDistance = playerAhead();
      const roadTopAhead = game.renderer.aheadForY(game.renderer.road.y);
      const readDistance = Math.max(1, roadTopAhead - playerAheadDistance);
      const firstDecisionAhead = playerAheadDistance + readDistance * 0.72;
      const firstRewardAhead = playerAheadDistance + readDistance * 0.54;
      const supportDecisionAhead = playerAheadDistance + readDistance * 0.86;
      makeObstacle("boostPad", Math.min(laneCount() - 1, centerLane() + 2), firstRewardAhead, {
        waveType: "visualSmokeDecision",
        waveLabel: "Decision trace boost route"
      });
      makeObstacle("slowCar", centerLane(), firstDecisionAhead, {
        waveType: "visualSmokeDecision",
        waveLabel: "Decision trace center blocker"
      });
      makeObstacle("barrier", Math.max(0, centerLane() - 2), supportDecisionAhead, {
        waveType: "visualSmokeDecision",
        waveLabel: "Decision trace support blocker"
      });
      return {
        snapshot: snapshot(label),
        metrics: decisionMetrics(label),
        objectStats: objectPixelStats(["slowCar", "barrier", "boostPad"])
      };
    }

    function testFarObjectFlowContinuity(label = "far-object-flow-continuity") {
      primeRun({
        raceTypeId: "classic",
        speedClassId: "turbo",
        trackId: "sunset-highway",
        seed: `VISUAL-${label}`
      });
      const game = app();
      const run = game.run;
      const viewDistance = typeof VIEW_DISTANCE === "number" ? VIEW_DISTANCE : 9000;
      const entryAheadBuffer = typeof FAR_OBJECT_FLOW_CONFIG === "object" ? FAR_OBJECT_FLOW_CONFIG.entryAheadBuffer : 760;
      const startAhead = viewDistance + entryAheadBuffer;
      const obstacle = makeObstacle("slowCar", Math.max(0, centerLane() - 2), startAhead, {
        waveType: "visualSmokeFarFlow",
        waveLabel: "Far object flow continuity"
      });
      const trace = [];
      const sample = (timeLabel) => {
        game.renderer.render();
        const rect = game.renderer.getObstacleVisualRectAt(obstacle, run.distance);
        const ahead = obstacle.distance - run.distance;
        const road = game.renderer.road;
        const alpha = rect ? Number((rect.flowAlpha ?? 1).toFixed(3)) : null;
        trace.push({
          label: timeLabel,
          elapsed: Number((run.elapsed || 0).toFixed(3)),
          distance: Math.round(run.distance || 0),
          ahead: Math.round(ahead),
          visible: Boolean(rect),
          readable: Boolean(rect && alpha >= 0.05),
          y: rect ? Number(rect.centerY.toFixed(2)) : null,
          baseY: rect ? Number((rect.flowBaseY ?? rect.centerY).toFixed(2)) : null,
          roadT: rect ? Number(((rect.centerY - road.y) / Math.max(1, road.h)).toFixed(3)) : null,
          roadTop: Number(road.y.toFixed(2)),
          alpha,
          blend: rect ? Number((rect.flowBlend ?? 0).toFixed(3)) : null,
          w: rect ? Number(rect.renderedWidth.toFixed(2)) : null,
          h: rect ? Number(rect.renderedHeight.toFixed(2)) : null
        });
      };
      sample("entry-0");
      for (let index = 0; index < 260; index += 1) {
        advance(1 / 60, 1 / 60);
        sample(`frame-${index + 1}`);
      }
      const visibleTrace = trace.filter((item) => item.visible && item.alpha > 0.01);
      const readableTrace = trace.filter((item) => item.readable);
      const firstVisible = visibleTrace[0] || null;
      const firstReadable = readableTrace[0] || null;
      const yDeltas = [];
      const alphaDeltas = [];
      for (let index = 1; index < readableTrace.length; index += 1) {
        yDeltas.push(Number((readableTrace[index].y - readableTrace[index - 1].y).toFixed(2)));
        alphaDeltas.push(Number((readableTrace[index].alpha - readableTrace[index - 1].alpha).toFixed(3)));
      }
      const midRoadPopIn = Boolean(firstReadable && firstReadable.roadT > 0.08);
      const monotonicDownRoad = yDeltas.every((delta) => delta >= -0.5);
      const continuousAlpha = alphaDeltas.every((delta) => delta >= -0.02);
      const maxFrameYJump = yDeltas.length ? Math.max(...yDeltas.map((delta) => Math.abs(delta))) : 0;
      const heldTopFrames = yDeltas.filter((delta, index) => {
        const item = readableTrace[index + 1];
        return item && item.roadT <= 0.08 && Math.abs(delta) < 0.12;
      }).length;
      const activeRoadTrace = readableTrace.filter((item) => item.roadT >= 0 && item.roadT <= 0.94);
      const activeRoadDeltas = [];
      for (let index = 1; index < activeRoadTrace.length; index += 1) {
        activeRoadDeltas.push({
          yDelta: Number((activeRoadTrace[index].y - activeRoadTrace[index - 1].y).toFixed(2)),
          roadT: activeRoadTrace[index].roadT,
          y: activeRoadTrace[index].y,
          ahead: activeRoadTrace[index].ahead,
          label: activeRoadTrace[index].label
        });
      }
      const averageDelta = (items) => {
        if (!items.length) return 0;
        return Number((items.reduce((sum, item) => sum + item.yDelta, 0) / items.length).toFixed(2));
      };
      const topThirdDeltas = activeRoadDeltas.filter((item) => item.roadT < 0.34);
      const middleThirdDeltas = activeRoadDeltas.filter((item) => item.roadT >= 0.34 && item.roadT < 0.67);
      const bottomThirdDeltas = activeRoadDeltas.filter((item) => item.roadT >= 0.67);
      const topThirdAverageYDelta = averageDelta(topThirdDeltas);
      const middleThirdAverageYDelta = averageDelta(middleThirdDeltas);
      const bottomThirdAverageYDelta = averageDelta(bottomThirdDeltas);
      const minActiveYDelta = activeRoadDeltas.length ? Math.min(...activeRoadDeltas.map((item) => item.yDelta)) : 0;
      const maxActiveYDelta = activeRoadDeltas.length ? Math.max(...activeRoadDeltas.map((item) => item.yDelta)) : 0;
      const bottomTopYDeltaRatio = topThirdAverageYDelta > 0
        ? Number((bottomThirdAverageYDelta / topThirdAverageYDelta).toFixed(3))
        : 0;
      const bottomMiddleYDeltaRatio = middleThirdAverageYDelta > 0
        ? Number((bottomThirdAverageYDelta / middleThirdAverageYDelta).toFixed(3))
        : 0;
      const sampledMotionTrace = activeRoadTrace
        .filter((item, index) => index === 0 || index === activeRoadTrace.length - 1 || index % 18 === 0)
        .map((item, index, items) => {
          const previous = index > 0 ? items[index - 1] : null;
          return {
            label: item.label,
            elapsed: item.elapsed,
            ahead: item.ahead,
            y: item.y,
            roadT: item.roadT,
            yDeltaFromPreviousSample: previous ? Number((item.y - previous.y).toFixed(2)) : 0,
            alpha: item.alpha
          };
        });
      const activeTransitionAhead = typeof DIRECTOR_PACING_VIEW_DISTANCE === "number" ? DIRECTOR_PACING_VIEW_DISTANCE : 7800;
      const activeTransitionSample = readableTrace.find((item) => item.ahead <= activeTransitionAhead) || null;
      const settledToNormal = readableTrace.some((item) => item.ahead <= viewDistance && item.alpha >= 0.995 && item.blend <= 0.001);
      return {
        snapshot: snapshot(label),
        config: {
          viewDistance,
          entryAheadBuffer,
          startAhead,
          entryOffsetPx: typeof FAR_OBJECT_FLOW_CONFIG === "object" ? FAR_OBJECT_FLOW_CONFIG.entryOffsetPx : null,
          fadeStartOffsetPx: typeof FAR_OBJECT_FLOW_CONFIG === "object" ? FAR_OBJECT_FLOW_CONFIG.fadeStartOffsetPx : null,
          fadeFullOffsetPx: typeof FAR_OBJECT_FLOW_CONFIG === "object" ? FAR_OBJECT_FLOW_CONFIG.fadeFullOffsetPx : null
        },
        firstVisible,
        firstReadable,
        yDeltas,
        alphaDeltas,
        maxFrameYJump,
        heldTopFrames,
        screenMotion: {
          firstActiveRoadSample: activeRoadTrace[0] || null,
          nearPlayerSample: activeRoadTrace.find((item) => item.roadT >= 0.9) || activeRoadTrace[activeRoadTrace.length - 1] || null,
          activeFrameCount: activeRoadTrace.length,
          minActiveYDelta,
          maxActiveYDelta,
          topThirdAverageYDelta,
          middleThirdAverageYDelta,
          bottomThirdAverageYDelta,
          bottomTopYDeltaRatio,
          bottomMiddleYDeltaRatio,
          activeRoadDeltas,
          sampledMotionTrace
        },
        activeTransitionSample,
        settledToNormal,
        monotonicDownRoad,
        continuousAlpha,
        midRoadPopIn,
        trace
      };
    }

    function testClassicViewport(label = "classic-viewport") {
      primeRun({
        raceTypeId: "classic",
        speedClassId: "turbo",
        trackId: "sunset-highway",
        seed: `VISUAL-${label}`
      });
      const ahead = Math.max(playerAhead() + 240, 430);
      makeObstacle("slowCar", 0, ahead);
      makeObstacle("boostPad", centerLane(), ahead + 220);
      makeObstacle("ramp", laneCount() - 1, ahead + 440, {
        waveType: "visualSmokeViewport",
        waveLabel: "Visual smoke viewport"
      });
      return {
        snapshot: snapshot(label),
        readability: canvasReadabilitySample()
      };
    }

    function testPlayerCarFloorGlowShape(label = "player-car-floor-glow-shape") {
      primeRun({
        raceTypeId: "classic",
        speedClassId: "redline",
        trackId: "sunset-highway",
        seed: `VISUAL-${label}`
      });
      const game = app();
      const run = game.run;
      const renderer = game.renderer;
      const ctx = renderer.ctx;
      run.boostTimer = 0;
      run.padBoostTimer = 0;
      run.driftBoostTimer = 0;
      run.boostTrailPunchTimer = 0;
      run.boostFlashTimer = 0;
      renderer.render();
      const calls = [];
      const ellipseCalls = [];
      const originalFillRect = ctx.fillRect;
      const originalEllipse = ctx.ellipse;
      ctx.fillRect = function probedFillRect(x, y, w, h) {
        calls.push({ x, y, w, h });
        return originalFillRect.apply(this, arguments);
      };
      ctx.ellipse = function probedEllipse(x, y, rx, ry, rotation, startAngle, endAngle) {
        ellipseCalls.push({ x, y, rx, ry, rotation, startAngle, endAngle });
        return originalEllipse.apply(this, arguments);
      };
      try {
        renderer.drawPlayerLaneFloorGlow(1);
      } finally {
        ctx.fillRect = originalFillRect;
        ctx.ellipse = originalEllipse;
      }
      const road = renderer.road;
      const laneX = road.x + run.targetLane * road.laneW;
      const laneCenterX = laneX + road.laneW * 0.5;
      const playerY = renderer.getPlayerScreenY();
      const playerGlowRects = calls.filter((rect) => (
        rect.w >= road.laneW * 0.25
        && rect.h >= road.laneW * 0.7
        && rect.x < laneX + road.laneW
        && rect.x + rect.w > laneX
        && rect.y < playerY + road.laneW * 1.2
        && rect.y + rect.h > playerY - road.laneW * 1.3
      ));
      const playerGlowEllipses = ellipseCalls.filter((ellipse) => (
        ellipse.rx >= road.laneW * 0.16
        && ellipse.ry >= road.laneW * 0.14
        && Math.abs(ellipse.x - laneCenterX) <= road.laneW * 0.55
        && ellipse.y < playerY + road.laneW * 1.2
        && ellipse.y > playerY - road.laneW * 1.3
      ));
      return {
        snapshot: snapshot(label),
        fillRectCalls: calls.map((rect) => ({
          x: Number(rect.x.toFixed(2)),
          y: Number(rect.y.toFixed(2)),
          w: Number(rect.w.toFixed(2)),
          h: Number(rect.h.toFixed(2))
        })),
        ellipseCalls: ellipseCalls.map((ellipse) => ({
          x: Number(ellipse.x.toFixed(2)),
          y: Number(ellipse.y.toFixed(2)),
          rx: Number(ellipse.rx.toFixed(2)),
          ry: Number(ellipse.ry.toFixed(2))
        })),
        playerGlowRects: playerGlowRects.map((rect) => ({
          x: Number(rect.x.toFixed(2)),
          y: Number(rect.y.toFixed(2)),
          w: Number(rect.w.toFixed(2)),
          h: Number(rect.h.toFixed(2))
        })),
        playerGlowEllipses: playerGlowEllipses.map((ellipse) => ({
          x: Number(ellipse.x.toFixed(2)),
          y: Number(ellipse.y.toFixed(2)),
          rx: Number(ellipse.rx.toFixed(2)),
          ry: Number(ellipse.ry.toFixed(2))
        }))
      };
    }

    function testDriftDashWideRoad(label = "drift-dash-wide-road") {
      primeRun({
        raceTypeId: "classic",
        speedClassId: "redline",
        trackId: "sunset-highway",
        seed: `VISUAL-${label}`
      });
      const run = app().run;
      syncPlayerLane(1);
      run.renderLaneFloat = 1.35;
      run.playerLaneFloat = 1.35;
      run.targetLane = 6;
      run.driftActive = true;
      run.driftDirection = 1;
      run.driftChargeSeconds = typeof DRIFT_TUNING === "object" ? DRIFT_TUNING.maxChargeSeconds : 0.52;
      run.driftChargeRatio = 1;
      const ahead = Math.max(playerAhead() + 360, 560);
      makeObstacle("slowCar", 0, ahead);
      makeObstacle("boostPad", 6, ahead + 360, {
        waveType: "visualSmokeDrift",
        waveLabel: "Visual smoke drift dash target"
      });
      app().renderer.render();
      return snapshot(label);
    }

    function testFlowBreakWideRoad(label = "flow-break-wide-road") {
      primeRun({
        raceTypeId: "classic",
        speedClassId: "turbo",
        trackId: "sunset-highway",
        seed: `VISUAL-${label}`
      });
      const run = app().run;
      syncPlayerLane(centerLane());
      run.neonFlow = typeof NEON_FLOW_CONFIG === "object" ? NEON_FLOW_CONFIG.maxFlow : 100;
      run.flowBreakArmed = true;
      run.flowBreakLateralRadiusLanes = typeof NEON_FLOW_CONFIG === "object" ? NEON_FLOW_CONFIG.breakLateralRadiusLanes : 1.45;
      run.flowBreakFrontBuffer = app().getFlowBreakFrontBuffer?.(run) || 260;
      const zone = app().getFlowBreakZone?.(run) || null;
      const hazardAhead = Math.max(playerAhead() + 420, zone?.startAhead ? zone.startAhead + 260 : 740);
      makeObstacle("truck", centerLane(), hazardAhead, {
        waveType: "visualSmokeFlowBreak",
        waveLabel: "Visual smoke Flow Break"
      });
      makeObstacle("slowCar", Math.min(laneCount() - 1, centerLane() + 1), hazardAhead + 280, {
        waveType: "visualSmokeFlowBreak",
        waveLabel: "Visual smoke Flow Break support"
      });
      app().renderer.render();
      return {
        snapshot: snapshot(label),
        zone
      };
    }

    function makePursuitRoadblock(safeLane = centerLane()) {
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
      roadLanes().forEach((lane) => {
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
      app().updateAudioMusicState();
      return { waveId, safeLane, ahead };
    }

    function testPursuitRoadblockAndEscaped() {
      primeRun({ raceTypeId: "pursuit", speedClassId: "turbo", seed: TEST_SEEDS.pursuit });
      const run = app().run;
      run.pursuitHeat = Math.max(run.pursuitHeat || 0, run.pursuitHeatLimit * 0.42);
      run.pursuitHeatMax = Math.max(run.pursuitHeatMax || 0, run.pursuitHeat);
      const roadblock = makePursuitRoadblock(centerLane());
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

    function testPartyClassicActive(label = "party-classic-active") {
      setupParty("classic");
      startPartyTurn();
      const ahead = Math.max(playerAhead() + 260, 430);
      makeObstacle("slowCar", centerLane(), ahead, {
        waveType: "visualSmokeParty",
        waveLabel: "Visual smoke party classic"
      });
      makeObstacle("boostPad", Math.min(laneCount() - 1, centerLane() + 1), ahead + 260, {
        waveType: "visualSmokeParty",
        waveLabel: "Visual smoke party classic boost"
      });
      return snapshot(label);
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
      makeObstacle("gasCan", centerLane(), Math.max(playerAhead() + 210, 390), {
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
      const runGarageRewardsQa = () => {
        const details = document.querySelector(".garage-rewards-details");
        if (!details) throw new Error("Garage rewards details missing");
        const garagePage = document.querySelector(".garage-page");
        details.open = true;
        if (garagePage) garagePage.scrollTop = Math.max(0, document.querySelector("#garageRewards")?.offsetTop || 0);
        const expectDisclosureOpen = (label) => {
          if (document.querySelector(".garage-rewards-details")?.open !== true) {
            throw new Error(`${label} should keep Titles and Badges open`);
          }
        };
        const expectNoGarageReset = (label, expectedDetails = details) => {
          const currentDetails = document.querySelector(".garage-rewards-details");
          if (game.screen !== "players" || document.querySelectorAll(".garage-panel").length !== 1 || !currentDetails?.open) {
            throw new Error(`${label} reset the Garage rewards section`);
          }
          return currentDetails === expectedDetails;
        };
        const expectGarageBadgeFilter = (filter, label) => {
          const active = document.querySelector(".badge-filter-button.is-active");
          if (active?.dataset.filter !== filter) {
            throw new Error(`${label} expected ${filter} filter, saw ${active?.dataset.filter || "none"}`);
          }
        };
        const clickFilter = (filter, label) => {
          const beforeDetails = document.querySelector(".garage-rewards-details");
          const button = document.querySelector(`.badge-filter-button[data-filter="${filter}"]`);
          if (!button) throw new Error(`Missing ${label} badge filter`);
          const started = performance.now();
          button.click();
          const durationMs = performance.now() - started;
          const sameDetails = expectNoGarageReset(label, beforeDetails);
          expectGarageBadgeFilter(filter, label);
          if (durationMs > 750) throw new Error(`${label} badge filter took ${durationMs.toFixed(1)}ms`);
          return { durationMs, sameDetails };
        };
        const mastery = clickFilter("mastery", "Mastery");
        const all = clickFilter("all", "All");
        const switchButton = document.querySelector('.garage-driver-list button[data-action="selectPlayer"]:not([disabled])');
        if (switchButton) {
          switchButton.click();
          expectDisclosureOpen("Switch Driver");
        }
        const renameInput = document.querySelector("#driverRenameName");
        const renameButton = document.querySelector('button[data-action="renameDriver"]');
        if (renameInput && renameButton) {
          renameInput.value = `${game.profiles.getCurrentPlayer()?.name || "QA"} PRIME`;
          renameButton.click();
          expectDisclosureOpen("Rename Driver");
        }
        const carName = document.querySelector("#carName");
        const saveButton = document.querySelector('button[data-action="saveCar"]');
        if (carName && saveButton) {
          carName.value = "QA RIG";
          saveButton.click();
          expectDisclosureOpen("Save Style");
        }
        return {
          rewardsOpen: document.querySelector(".garage-rewards-details")?.open === true,
          activeFilter: document.querySelector(".badge-filter-button.is-active")?.dataset.filter || "",
          masteryDurationMs: Number(mastery.durationMs.toFixed(2)),
          allDurationMs: Number(all.durationMs.toFixed(2)),
          sameDetailsAfterMastery: mastery.sameDetails,
          sameDetailsAfterAll: all.sameDetails
        };
      };
      const garageRewards = runGarageRewardsQa();
      const garage = {
        screen: game.screen,
        text: Boolean(document.querySelector(".garage-panel")),
        profile: Boolean(document.querySelector(".garage-profile-hero")),
        records: Boolean(document.querySelector("#garageRecords")),
        unlocks: Boolean(document.querySelector("#garageRewards")),
        profileCopy: ["Driver Profile", "Records & Rivals", "Unlocks & Rewards"].every((label) => (document.body.innerText || "").toLowerCase().includes(label.toLowerCase())),
        rewards: garageRewards
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
      game.showSettingsScreen();
      const settings = {
        screen: game.screen,
        audioControls: Boolean(document.querySelector("#masterVolume") && document.querySelector("#musicVolume") && document.querySelector("#sfxVolume")),
        audioTest: Boolean(document.querySelector(".audio-test-panel")),
        musicSummary: document.querySelector(".audio-test-header span")?.textContent || ""
      };
      return { garage, scoreBoard, timeBoard, report, settings };
    }

    function audioRoutingAudit() {
      const game = app();
      const expectedRaceMusic = {
        "sunset-highway": "audio/sunset-highway.mp3",
        "redline-run": "audio/redline-run.mp3",
        "blackout-run": "audio/blackout-run-headlight-mile.mp3",
        "midnight-ridge": "audio/midnight-ridge-mooncut-pass.mp3",
        "prism-highway": "audio/prism-highway-glasslight-fever.mp3"
      };
      const rows = Object.entries(expectedRaceMusic).map(([trackId, expectedPath]) => {
        const track = getTrackById(trackId);
        game.audio.setRaceMusicTrack(track);
        const raceEntry = game.audio?.tracks?.race || {};
        return {
          trackId,
          trackName: track?.name || "",
          expectedPath,
          configuredPath: getTrackMusicPath(track),
          configuredFallback: getTrackMusicFallbackPath(track),
          activePath: raceEntry.path || "",
          activeFallback: raceEntry.fallbackPath || ""
        };
      });
      game.audio.setRaceMusicTrack(getTrackById("sunset-highway"));
      return {
        title: {
          expectedPath: "audio/title-theme.mp3",
          activePath: game.audio?.tracks?.title?.path || ""
        },
        race: rows
      };
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
      testFuelGasApproachOnly,
      testDecisionDistance,
      testFarObjectFlowContinuity,
      testDriftDashWideRoad,
      testFlowBreakWideRoad,
      testPursuitRoadblockAndEscaped,
      testPursuitBusted,
      testPartyClassicActive,
      testPartyClassic,
      testPartyFuel,
      testTrackTheme,
      testClassicViewport,
      testPlayerCarFloorGlowShape,
      testBlackoutSpeedReadability,
      testBlackoutIdentity,
      testPrismIdentity,
      menuScreens,
      audioRoutingAudit
    };
  });
}

function screenshotPath(name) {
  const slug = String(name || "screenshot")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "screenshot";
  return path.join(OUT_DIR, `${slug}.png`);
}

async function captureScreenshot(page, report, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = screenshotPath(name);
  await page.screenshot({ path: file });
  report.screenshots.push(file);
  return file;
}

async function collectScoreScreen(page) {
  const screen = await waitForScreen(page, ["score", "partyStandings", "partyFinal"], 6000);
  return page.evaluate((activeScreen) => ({
    screen: activeScreen,
    text: document.body.innerText.slice(0, 900),
    primaryActions: [...document.querySelectorAll(".result-screen-panel .btn--primary")].map((button) => button.innerText.trim()),
    summary: (() => {
      const summary = window.neonRoadRally?.lastSummary;
      if (!summary) return null;
      return {
        status: summary.status,
        reason: summary.reason,
        raceTypeId: summary.raceTypeId,
        finalScore: summary.finalScore,
        finishTimeMs: summary.finishTimeMs,
        neonCashAwardAmount: summary.neonCashAward?.amount || 0,
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
      if (msg.type() === "warning" && msg.text().includes("Canvas2D: Multiple readback operations")) return;
      consoleIssues.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

  const report = {
    ok: false,
    baseUrl: BASE_URL,
    observed: {},
    scoreScreens: {},
    screenshots: [],
    traceDir: OUT_DIR,
    consoleIssues
  };

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.neonRoadRally), null, { timeout: 5000 });
    await page.evaluate(() => localStorage.clear());
    await installVisualSmokeHelpers(page);

    const viewportSamples = [];
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1280, height: 720 }
    ]) {
      await page.setViewportSize(viewport);
      const result = await page.evaluate(({ width, height }) => {
        window.neonRoadRally.renderer.resize();
        return window.__nrrVisualSmoke.testClassicViewport(`${width}x${height}`);
      }, viewport);
      const road = result.snapshot.road;
      assert(result.snapshot.laneCount === 7, `${viewport.width}x${viewport.height} should use 7 lanes`, result.snapshot);
      assert(road.laneCenters.length === 7, `${viewport.width}x${viewport.height} should report 7 lane centers`, road);
      assert(road.laneCenters.every((center, index, centers) => index === 0 || center > centers[index - 1]), `${viewport.width}x${viewport.height} lane centers should be ordered`, road);
      assert(road.fitsHorizontally, `${viewport.width}x${viewport.height} road should fit without horizontal clipping`, road);
      assert(road.laneW >= 120, `${viewport.width}x${viewport.height} lanes should stay readable and not compress below the old 5-lane baseline`, road);
      assert(road.w >= 880 && road.w <= 930, `${viewport.width}x${viewport.height} road width should stay in the 7-lane strategic-scale target range`, road);
      assert(result.snapshot.camera.playerYRatio >= 0.895, `${viewport.width}x${viewport.height} player car should sit lower for more forward read space`, result.snapshot.camera);
      assert(result.snapshot.camera.readDistanceToPlayer >= 8000, `${viewport.width}x${viewport.height} should show the longer strategic-scale read distance above the player`, result.snapshot.camera);
      assert(result.snapshot.decision.projectionMode === "linear", `${viewport.width}x${viewport.height} should use the linear 7-lane planning camera projection`, result.snapshot.decision);
      assert(result.snapshot.camera.playerBottomClearance >= 8, `${viewport.width}x${viewport.height} player car should not crowd the bottom strip`, result.snapshot.camera);
      assert(Object.values(result.snapshot.roadSignCalls || {}).reduce((sum, count) => sum + count, 0) === 0, `${viewport.width}x${viewport.height} active race should not draw non-gameplay roadside signs`, result.snapshot.roadSignCalls);
      assert(result.snapshot.visibleTypes.includes("slowCar") && result.snapshot.visibleTypes.includes("boostPad") && result.snapshot.visibleTypes.includes("ramp"), `${viewport.width}x${viewport.height} outer-lane objects should remain visible`, result.snapshot);
      if ((viewport.width === 1440 && viewport.height === 900) || (viewport.width === 1280 && viewport.height === 720)) {
        await captureScreenshot(page, report, `solo-classic-${viewport.width}x${viewport.height}`);
      }
      viewportSamples.push({
        viewport,
        road,
        camera: result.snapshot.camera,
        decision: result.snapshot.decision,
        roadSignCalls: result.snapshot.roadSignCalls,
        visibleTypes: result.snapshot.visibleTypes,
        readability: {
          roadAverageLuma: result.readability.roadAverageLuma,
          laneDividerMaxLuma: result.readability.laneDividerMaxLuma,
          edgeMaxLuma: result.readability.edgeMaxLuma
        }
      });
    }
    await page.setViewportSize({ width: 1366, height: 900 });
    report.observed.viewports = viewportSamples;

    await page.setViewportSize({ width: 1440, height: 900 });
    const playerGlowShape = await page.evaluate(() => window.__nrrVisualSmoke.testPlayerCarFloorGlowShape("player-car-floor-glow-shape"));
    assert(
      playerGlowShape.playerGlowRects.length === 0,
      "Player car floor glow should not draw a tall rectangular box around the car",
      playerGlowShape
    );
    assert(
      playerGlowShape.playerGlowEllipses.length === 0,
      "Player car floor glow should not draw an oval/blob around the car",
      playerGlowShape
    );
    report.observed.playerCarFloorGlow = {
      playerGlowRects: playerGlowShape.playerGlowRects,
      playerGlowEllipses: playerGlowShape.playerGlowEllipses,
      fillRectCalls: playerGlowShape.fillRectCalls,
      ellipseCalls: playerGlowShape.ellipseCalls,
      camera: playerGlowShape.snapshot.camera
    };
    await captureScreenshot(page, report, "player-car-floor-glow-shape");

    const decisionTrace = await page.evaluate(() => window.__nrrVisualSmoke.testDecisionDistance("decision-distance-1440x900"));
    assert(decisionTrace.metrics.readDistanceToPlayer >= 8000, "Decision trace should show the longer strategic-scale read distance", decisionTrace.metrics);
    assert(decisionTrace.metrics.firstRequiredLaneDecision?.distanceToPlayerZone >= 4200, "Decision trace should still put a required lane decision meaningfully ahead", decisionTrace.metrics);
    assert(decisionTrace.metrics.firstRequiredLaneDecision?.secondsToPlayerZone >= 1.5, "Decision trace should still give readable reaction time before danger", decisionTrace.metrics);
    report.observed.decisionDistance = {
      metrics: decisionTrace.metrics,
      objectStats: decisionTrace.objectStats.map((object) => ({
        type: object.type,
        lane: object.lane,
        ahead: object.ahead,
        averageLuma: object.stats.averageLuma,
        maxLuma: object.stats.maxLuma,
        brightPixelRatio: object.stats.brightPixelRatio
      }))
    };
    await captureScreenshot(page, report, "decision-distance-1440x900");

    const farFlow = await page.evaluate(() => window.__nrrVisualSmoke.testFarObjectFlowContinuity("far-object-flow-continuity-1440x900"));
    assert(farFlow.firstVisible?.visible, "Far object flow trace did not find a visible real object", farFlow);
    assert(farFlow.firstReadable?.readable, "Far object flow trace did not find a readable real object", farFlow);
    assert(farFlow.firstReadable.roadT <= 0.08, "Far object should first become readable at the top edge, not mid-road", farFlow.firstReadable);
    assert(farFlow.firstReadable.y <= farFlow.firstReadable.roadTop + 12, "Far object should enter from the road top/offscreen edge", farFlow.firstReadable);
    assert(!farFlow.midRoadPopIn, "Far object first became readable in the mid/near road", farFlow);
    assert(farFlow.monotonicDownRoad, "Far object y-position should flow continuously down-road", farFlow);
    assert(farFlow.continuousAlpha, "Far object alpha should transition continuously toward normal rendering", farFlow);
    assert(farFlow.maxFrameYJump <= 14, "Far object should not jump onto the board between frames", farFlow);
    assert(farFlow.heldTopFrames <= 2, "Far object should not hold at the top before entering", farFlow);
    assert(farFlow.screenMotion.activeFrameCount >= 150, "Far object motion trace should follow the object into the near road", farFlow.screenMotion);
    assert(farFlow.screenMotion.minActiveYDelta >= 2.5, "Far object should not visually stall after entering the road", farFlow.screenMotion);
    assert(farFlow.screenMotion.maxActiveYDelta <= 6.25, "Far object should not spike through the active road", farFlow.screenMotion);
    assert(farFlow.screenMotion.bottomTopYDeltaRatio >= 0.86, "Bottom-third object motion should not collapse compared with the top third", farFlow.screenMotion);
    assert(farFlow.screenMotion.bottomMiddleYDeltaRatio >= 0.86, "Bottom-third object motion should not collapse compared with the middle third", farFlow.screenMotion);
    assert(farFlow.settledToNormal, "Far object should settle back into normal rendering before the active zone", farFlow.trace);
    report.observed.farObjectFlow = {
      config: farFlow.config,
      firstVisible: farFlow.firstVisible,
      firstReadable: farFlow.firstReadable,
      yDeltas: farFlow.yDeltas,
      alphaDeltas: farFlow.alphaDeltas,
      maxFrameYJump: farFlow.maxFrameYJump,
      heldTopFrames: farFlow.heldTopFrames,
      screenMotion: farFlow.screenMotion,
      activeTransitionSample: farFlow.activeTransitionSample,
      settledToNormal: farFlow.settledToNormal,
      midRoadPopIn: farFlow.midRoadPopIn,
      monotonicDownRoad: farFlow.monotonicDownRoad,
      continuousAlpha: farFlow.continuousAlpha,
      trace: farFlow.trace
    };
    await captureScreenshot(page, report, "far-object-flow-continuity-1440x900");

    const boost = await page.evaluate(() => window.__nrrVisualSmoke.testClassicBoost());
    assert(boost.observed, "Classic boost pickup was not observed", boost.collected.boost);
    assert(boost.approach.visibleTypes.includes("boostPad"), "Classic boost pad was not visible before pickup", boost.approach);
    assert(boost.collected.boost.padBoostTimer > 0, "Boost-active timer was not visible after pickup", boost.collected.boost);
    assert(boost.collected.boost.flash > 0 && boost.collected.boost.trail > 0, "Boost pickup flash/trail timers were not active", boost.collected.boost);
    assert(boost.collected.music.boosted || boost.collected.music.lastEvent === "boostAccent", "Boost music identity/accent was not active", boost.collected.music);
    report.observed.classicBoost = {
      boostPadVisible: true,
      collected: boost.collected.boost.padsCollected,
      padBoostTimer: boost.collected.boost.padBoostTimer,
      flash: boost.collected.boost.flash,
      trail: boost.collected.boost.trail,
      music: boost.collected.music
    };

    const ramp = await page.evaluate(() => window.__nrrVisualSmoke.testClassicRamp());
    assert(ramp.approach.visibleTypes.includes("ramp"), "Classic ramp was not visible on approach", ramp.approach);
    assert(ramp.airborne.ramp.airborne && ramp.airborne.ramp.jumpOffset > 0, "Classic ramp airborne state was not observed", ramp.airborne.ramp);
    assert(ramp.landing.ramp.landingPulse > 0, "Classic ramp landing pulse was not observed", ramp.landing.ramp);
    assert(ramp.landing.ramp.targetsCleared >= 1, "Classic ramp target clear was not observed", ramp.landing.ramp);
    assert(ramp.airborne.music.airborne || ["rampLaunch", "rampLanding", "rampClear"].includes(ramp.landing.music.lastEvent), "Ramp music identity/accent was not observed", {
      airborne: ramp.airborne.music,
      landing: ramp.landing.music
    });
    report.observed.classicRamp = {
      rampApproachVisible: true,
      airborneObserved: true,
      jumpOffset: ramp.airborne.ramp.jumpOffset,
      landingPulse: ramp.landing.ramp.landingPulse,
      targetsCleared: ramp.landing.ramp.targetsCleared,
      targetStatus: ramp.landing.ramp.targetStatus,
      music: ramp.landing.music
    };

    const finish = await page.evaluate(() => window.__nrrVisualSmoke.testClassicFinish());
    assert(finish.finish.flash > 0 && finish.finish.stripe > 0, "Classic finish visual timers were not active", finish.finish);
    report.observed.classicFinish = finish.finish;
    report.scoreScreens.classicFinish = await collectScoreScreen(page);
    assert(report.scoreScreens.classicFinish.screen === "score", "Classic finish did not reach score screen", report.scoreScreens.classicFinish);
    assertNoDuplicateResultHierarchy(report.scoreScreens.classicFinish, "Classic finish result");

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
    assertNoDuplicateResultHierarchy(report.scoreScreens.classicCrash, "Classic crash result");

    await page.setViewportSize({ width: 1440, height: 900 });
    const fuelGasVisible = await page.evaluate(() => window.__nrrVisualSmoke.testFuelGasApproachOnly("fuel-run-gas-visibility"));
    assert(fuelGasVisible.visibleTypes.includes("gasCan"), "Fuel Run gas can should be visible in the approach screenshot", fuelGasVisible);
    report.observed.fuelGasVisibility = {
      camera: fuelGasVisible.camera,
      decision: fuelGasVisible.decision,
      visibleTypes: fuelGasVisible.visibleTypes
    };
    await captureScreenshot(page, report, "fuel-run-gas-visibility");

    const fuel = await page.evaluate(() => window.__nrrVisualSmoke.testFuelGasAndCritical());
    assert(fuel.gasApproach.visibleTypes.includes("gasCan"), "Fuel Run gas can was not visible before pickup", fuel.gasApproach);
    assert(fuel.collected.fuel.gasCansCollected >= 1, "Fuel Run gas can was not collected", fuel.collected.fuel);
    assert(fuel.collected.fuel.fuel > fuel.beforeFuel, "Fuel Run gas pickup did not raise fuel", {
      before: fuel.beforeFuel,
      after: fuel.collected.fuel.fuel
    });
    assert(fuel.critical.fuel.critical && fuel.critical.fuel.warningPulse > 0, "Fuel Run critical fuel visual was not observed", fuel.critical.fuel);
    assert(fuel.critical.music.id.includes("fuelCritical") || fuel.critical.music.lastEvent === "fuelCritical", "Fuel critical music identity was not observed", fuel.critical.music);
    report.observed.fuelRun = {
      gasCanVisible: true,
      gasCansCollected: fuel.collected.fuel.gasCansCollected,
      fuelBefore: fuel.beforeFuel,
      fuelAfter: fuel.collected.fuel.fuel,
      criticalFuelObserved: true,
      warningPulse: fuel.critical.fuel.warningPulse,
      music: fuel.critical.music
    };

    const trackThemes = await page.evaluate(() => (
      ["midnight-ridge", "blackout-run", "prism-highway"].map((trackId) => window.__nrrVisualSmoke.testTrackTheme(trackId))
    ));
    for (const themeResult of trackThemes) {
      const { snapshot, readability, trackId } = themeResult;
      assert(snapshot.screen === "game" && snapshot.trackId === trackId, `${trackId} visual smoke did not start on the requested track`, snapshot);
      assert(snapshot.canvas.hasDrawSurface, `${trackId} canvas should have a drawable surface`, snapshot.canvas);
      ["slowCar", "boostPad", "ramp"].forEach((type) => {
        assert(snapshot.visibleTypes.includes(type), `${trackId} should keep ${type} visible for readability`, snapshot);
      });
      const lanePaintDelta = trackId === "prism-highway" ? -1 : 6;
      assert(
        readability.laneDividerMaxLuma > readability.roadAverageLuma + lanePaintDelta,
        `${trackId} lane paint should separate from the road surface`,
        readability
      );
      assert(
        readability.edgeMaxLuma > readability.roadAverageLuma + 4,
        `${trackId} road edge glints should separate from the road surface`,
        readability
      );
      if (trackId === "prism-highway") {
        assert(readability.maxChroma >= 30, "Prism Highway should render visible color variation without relying on text", readability);
      }
    }
    report.observed.newTrackThemes = trackThemes.map((item) => ({
      trackId: item.trackId,
      speedClassId: item.speedClassId,
      visibleTypes: item.snapshot.visibleTypes,
      visualIdentity: item.snapshot.visualIdentity,
      readability: {
        roadAverageLuma: item.readability.roadAverageLuma,
        laneDividerMaxLuma: item.readability.laneDividerMaxLuma,
        edgeMaxLuma: item.readability.edgeMaxLuma,
        maxChroma: item.readability.maxChroma
      }
    }));

    const blackoutSpeedReadability = await page.evaluate(() => (
      ["turbo", "overdrive", "redline"].map((speedClassId) => window.__nrrVisualSmoke.testBlackoutSpeedReadability(speedClassId))
    ));
    for (const speedResult of blackoutSpeedReadability) {
      const { snapshot, readability, speedClassId } = speedResult;
      assert(snapshot.screen === "game" && snapshot.trackId === "blackout-run", `Blackout Run ${speedClassId} visual smoke did not start correctly`, snapshot);
      assert(snapshot.speedClassId === speedClassId, `Blackout Run ${speedClassId} smoke used the wrong speed class`, snapshot);
      ["barrier", "boostPad", "gasCan", "ramp", "slowCar"].forEach((type) => {
        assert(snapshot.visibleTypes.includes(type), `Blackout Run ${speedClassId} should keep ${type} visible`, snapshot);
      });
      assert(
        readability.laneDividerMaxLuma > readability.roadAverageLuma + 8,
        `Blackout Run ${speedClassId} lane paint should stay readable against the dark road`,
        readability
      );
      assert(
        readability.edgeMaxLuma > readability.roadAverageLuma + 6,
        `Blackout Run ${speedClassId} road edge glints should stay readable against the dark road`,
        readability
      );
      assert(
        readability.maxChroma <= 70,
        `Blackout Run ${speedClassId} should stay restrained rather than colorful`,
        readability
      );
    }
    report.observed.blackoutSpeedReadability = blackoutSpeedReadability.map((item) => ({
      speedClassId: item.speedClassId,
      visibleTypes: item.snapshot.visibleTypes,
      raceTypeId: item.snapshot.raceTypeId,
      readability: {
        roadAverageLuma: item.readability.roadAverageLuma,
        laneDividerMaxLuma: item.readability.laneDividerMaxLuma,
        edgeMaxLuma: item.readability.edgeMaxLuma,
        maxChroma: item.readability.maxChroma
      }
    }));

    const blackoutIdentity = await page.evaluate(() => (
      ["turbo", "overdrive", "redline"].map((speedClassId) => window.__nrrVisualSmoke.testBlackoutIdentity(speedClassId))
    ));
    for (const identityResult of blackoutIdentity) {
      const { roadOnly, objects, objectStats, speedClassId } = identityResult;
      assert(roadOnly.snapshot.screen === "game" && roadOnly.snapshot.trackId === "blackout-run", `Blackout Run ${speedClassId} identity smoke did not start correctly`, roadOnly.snapshot);
      assert(
        roadOnly.identity.roadCore.averageLuma <= 24,
        `Blackout Run ${speedClassId} road should stay genuinely blacked out`,
        roadOnly.identity
      );
      assert(
        roadOnly.identity.background.averageLuma <= 14,
        `Blackout Run ${speedClassId} background should stay near black`,
        roadOnly.identity
      );
      assert(
        roadOnly.identity.centerWash.brightPixelRatio <= 0.14 && roadOnly.identity.centerToSideLumaDelta <= 12,
        `Blackout Run ${speedClassId} should not be dominated by a large bright headlight trapezoid`,
        roadOnly.identity
      );
      ["slowCar", "fastCar", "truck", "barrier", "boostPad", "gasCan", "ramp"].forEach((type) => {
        assert(objects.visibleTypes.includes(type), `Blackout Run ${speedClassId} should keep ${type} visible through reflective reads`, objects);
      });
      ["slowCar", "fastCar", "truck"].forEach((type) => {
        const vehicle = objectStats.find((item) => item.type === type);
        assert(vehicle, `Blackout Run ${speedClassId} should report ${type} pixel stats`, objectStats);
        assert(
          vehicle.stats.averageLuma <= 56 && vehicle.stats.maxLuma >= 70 && vehicle.stats.brightPixelRatio <= 0.36,
          `Blackout Run ${speedClassId} ${type} should read as a dark silhouette with light/glint cues`,
          vehicle
        );
      });
      ["barrier", "boostPad", "gasCan", "ramp"].forEach((type) => {
        const object = objectStats.find((item) => item.type === type);
        assert(object, `Blackout Run ${speedClassId} should report ${type} pixel stats`, objectStats);
        assert(
          object.stats.maxLuma > roadOnly.identity.roadCore.averageLuma + 28,
          `Blackout Run ${speedClassId} ${type} should remain identifiable in the dark`,
          object
        );
      });
    }
    report.observed.blackoutIdentity = blackoutIdentity.map((item) => ({
      speedClassId: item.speedClassId,
      visibleTypes: item.objects.visibleTypes,
      roadCore: item.roadOnly.identity.roadCore,
      background: item.roadOnly.identity.background,
      centerWash: item.roadOnly.identity.centerWash,
      centerToSideLumaDelta: item.roadOnly.identity.centerToSideLumaDelta,
      objectStats: item.objectStats.map((object) => ({
        type: object.type,
        averageLuma: object.stats.averageLuma,
        maxLuma: object.stats.maxLuma,
        brightPixelRatio: object.stats.brightPixelRatio
      }))
    }));
    await captureScreenshot(page, report, "blackout-readability");

    const prismIdentity = await page.evaluate(() => (
      ["turbo", "overdrive", "redline"].map((speedClassId) => window.__nrrVisualSmoke.testPrismIdentity(speedClassId))
    ));
    for (const identityResult of prismIdentity) {
      const { roadOnly, objects, objectStats, speedClassId } = identityResult;
      assert(roadOnly.snapshot.screen === "game" && roadOnly.snapshot.trackId === "prism-highway", `Prism Highway ${speedClassId} identity smoke did not start correctly`, roadOnly.snapshot);
      assert(
        roadOnly.identity.roadCore.hueFamilies.length >= 6,
        `Prism Highway ${speedClassId} should show multiple rainbow hue families on the road itself`,
        roadOnly.identity.roadCore
      );
      assert(
        roadOnly.identity.roadCore.colorCoverage >= 0.46 && roadOnly.identity.roadCore.averageChroma >= 54,
        `Prism Highway ${speedClassId} road surface should carry the rainbow identity, not just decorative lines`,
        roadOnly.identity.roadCore
      );
      ["slowCar", "fastCar", "truck", "barrier", "boostPad", "gasCan", "ramp"].forEach((type) => {
        assert(objects.visibleTypes.includes(type), `Prism Highway ${speedClassId} should keep ${type} visible over rainbow pavement`, objects);
      });
      objectStats.forEach((object) => {
        assert(
          object.stats.maxLuma > roadOnly.identity.roadCore.averageLuma + 8 || object.stats.averageChroma > roadOnly.identity.roadCore.averageChroma + 8,
          `Prism Highway ${speedClassId} ${object.type} should stand out from the colorful road`,
          object
        );
      });
    }
    report.observed.prismIdentity = prismIdentity.map((item) => ({
      speedClassId: item.speedClassId,
      visibleTypes: item.objects.visibleTypes,
      roadCore: item.roadOnly.identity.roadCore,
      objectStats: item.objectStats.map((object) => ({
        type: object.type,
        averageLuma: object.stats.averageLuma,
        maxLuma: object.stats.maxLuma,
        averageChroma: object.stats.averageChroma,
        maxChroma: object.stats.maxChroma
      }))
    }));
    await captureScreenshot(page, report, "prism-readability");

    await page.setViewportSize({ width: 1440, height: 900 });
    const flowBreakWide = await page.evaluate(() => window.__nrrVisualSmoke.testFlowBreakWideRoad("flow-break-wide-road"));
    assert(flowBreakWide.snapshot.visibleTypes.includes("truck"), "Flow Break wide-road setup should keep the trigger hazard visible", flowBreakWide.snapshot);
    assert(flowBreakWide.snapshot.laneCount === 7, "Flow Break wide-road setup should keep seven lanes", flowBreakWide.snapshot);
    report.observed.flowBreakWideRoad = {
      camera: flowBreakWide.snapshot.camera,
      decision: flowBreakWide.snapshot.decision,
      visibleTypes: flowBreakWide.snapshot.visibleTypes,
      zone: flowBreakWide.zone
    };
    await captureScreenshot(page, report, "flow-break-wide-road");

    const driftWide = await page.evaluate(() => window.__nrrVisualSmoke.testDriftDashWideRoad("drift-dash-wide-road"));
    assert(driftWide.laneCount === 7, "Drift Dash wide-road setup should keep seven lanes", driftWide);
    assert(driftWide.road.laneCenters.length === 7, "Drift Dash wide-road setup should expose all seven lane centers", driftWide.road);
    report.observed.driftDashWideRoad = {
      camera: driftWide.camera,
      decision: driftWide.decision,
      road: driftWide.road,
      visibleTypes: driftWide.visibleTypes
    };
    await captureScreenshot(page, report, "drift-dash-wide-road");

    const pursuit = await page.evaluate(() => window.__nrrVisualSmoke.testPursuitRoadblockAndEscaped());
    assert(pursuit.warning.pursuit.roadblockAhead, "Pursuit roadblock warning was not active", pursuit.warning.pursuit);
    assert(pursuit.warning.objects.some((item) => item.pursuitRoadblock), "Pursuit roadblock gate was not visible", pursuit.warning.objects);
    assert(pursuit.warning.pursuit.escapeLaneCount >= 1, "Pursuit escape-lane guide was not represented", pursuit.warning.pursuit);
    assert(pursuit.warning.music.id.includes("pursuitPressure") || pursuit.warning.music.cueLabel === "Pursuit Pressure", "Pursuit pressure music identity was not observed", pursuit.warning.music);
    assert(pursuit.cleared.pursuit.roadblocksCleared >= 1, "Pursuit roadblock clear was not observed", pursuit.cleared.pursuit);
    assert(pursuit.escaped.pursuit.escaped && pursuit.escaped.finish.flash > 0, "Pursuit escaped result visual was not observed", pursuit.escaped);
    report.observed.pursuitRoadblockEscaped = {
      roadblockWarning: true,
      roadblockGateVisible: true,
      heat: pursuit.warning.pursuit.heat,
      roadblocksCleared: pursuit.cleared.pursuit.roadblocksCleared,
      escaped: pursuit.escaped.pursuit.escaped,
      finishFlash: pursuit.escaped.finish.flash,
      music: pursuit.warning.music
    };
    report.scoreScreens.pursuitEscaped = await collectScoreScreen(page);
    assert(report.scoreScreens.pursuitEscaped.summary?.pursuitResult === "Escaped", "Pursuit escaped result was not recorded", report.scoreScreens.pursuitEscaped.summary);
    assertNoDuplicateResultHierarchy(report.scoreScreens.pursuitEscaped, "Pursuit escaped result");

    const busted = await page.evaluate(() => window.__nrrVisualSmoke.testPursuitBusted());
    assert(busted.pursuit.busted && busted.pursuit.bustedBeat > 0, "Pursuit busted visual was not observed", busted.pursuit);
    report.observed.pursuitBusted = {
      busted: busted.pursuit.busted,
      bustedBeat: busted.pursuit.bustedBeat,
      heat: busted.pursuit.heat
    };
    report.scoreScreens.pursuitBusted = await collectScoreScreen(page);
    assert(report.scoreScreens.pursuitBusted.summary?.pursuitResult === "Busted", "Pursuit busted result was not recorded", report.scoreScreens.pursuitBusted.summary);
    assertNoDuplicateResultHierarchy(report.scoreScreens.pursuitBusted, "Pursuit busted result");

    const partyActiveSamples = [];
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 }
    ]) {
      await page.setViewportSize(viewport);
      const partyActive = await page.evaluate(({ width, height }) => {
        window.neonRoadRally.renderer.resize();
        return window.__nrrVisualSmoke.testPartyClassicActive(`party-classic-${width}x${height}`);
      }, viewport);
      assert(partyActive.screen === "game" && partyActive.raceTypeId === "classic", `Party Classic ${viewport.width}x${viewport.height} active screenshot should stay in race`, partyActive);
      assert(partyActive.laneCount === 7 && partyActive.road.laneCenters.length === 7, `Party Classic ${viewport.width}x${viewport.height} should keep seven lanes`, partyActive);
      partyActiveSamples.push({
        viewport,
        camera: partyActive.camera,
        decision: partyActive.decision,
        road: partyActive.road,
        visibleTypes: partyActive.visibleTypes
      });
      await captureScreenshot(page, report, `party-classic-${viewport.width}x${viewport.height}`);
    }
    report.observed.partyClassicActive = partyActiveSamples;

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
    assert(menu.garage.screen === "players" && menu.garage.text && menu.garage.profile && menu.garage.records && menu.garage.unlocks && menu.garage.profileCopy, "Garage screen smoke failed", menu.garage);
    assert(menu.scoreBoard.screen === "leaderboard" && menu.scoreBoard.scoreAttack, "Score Attack board smoke failed", menu.scoreBoard);
    assert(menu.timeBoard.screen === "leaderboard" && menu.timeBoard.timeAttack, "Time Attack board smoke failed", menu.timeBoard);
    assert(menu.report.screen === "playtestReport" && menu.report.playtestReport, "Playtest Report smoke failed", menu.report);
    assert(menu.settings.screen === "settings" && menu.settings.audioControls && menu.settings.audioTest, "Settings audio controls smoke failed", menu.settings);
    report.observed.menuAndReports = menu;

    const audioRouting = await page.evaluate(() => window.__nrrVisualSmoke.audioRoutingAudit());
    assert(audioRouting.title.activePath === audioRouting.title.expectedPath, "Title music should route to title-theme.mp3", audioRouting.title);
    audioRouting.race.forEach((row) => {
      assert(row.configuredPath === row.expectedPath, `${row.trackName} configured music should match expected mp3`, row);
      assert(row.activePath === row.expectedPath, `${row.trackName} active race music should match expected mp3`, row);
    });
    report.observed.audioRouting = audioRouting;

    assert(consoleIssues.length === 0, "Console warnings/errors observed", { consoleIssues });
    const objectScreenMotionTracePath = path.join(OUT_DIR, "object-screen-motion-trace.json");
    fs.writeFileSync(objectScreenMotionTracePath, JSON.stringify(report.observed.farObjectFlow.screenMotion, null, 2));
    report.traces = {
      objectScreenMotion: objectScreenMotionTracePath
    };
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
