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
    { id: "sunset-boostline-pier", name: "Pier Boost Sprint", seed: "SUNSET-BOOSTLINE-PIER-TURBO", speedClass: "Turbo", feelTag: "boost chain" },
    { id: "sunset-glass-city-climb", name: "Glass City Climb", seed: "SUNSET-GLASS-CITY-CLIMB-TURBO", speedClass: "Turbo", feelTag: "ramp route" },
    { id: "sunset-orange-sky-switchback", name: "Orange Sky Switchback", seed: "SUNSET-SKY-SWITCHBACK-OVERDRIVE", speedClass: "Overdrive", feelTag: "lane discipline" },
    { id: "sunset-cactus-cutback", name: "Cactus Cutback", seed: "SUNSET-CACTUS-CUTBACK-OVERDRIVE", speedClass: "Overdrive", feelTag: "traffic pressure" },
    { id: "sunset-radio-tower-run", name: "Radio Tower Run", seed: "SUNSET-RADIO-TOWER-OVERDRIVE", speedClass: "Overdrive", feelTag: "final push" },
    { id: "sunset-heatwave-express", name: "Heatwave Express", seed: "SUNSET-HEATWAVE-EXPRESS-REDLINE", speedClass: "Redline", feelTag: "clean speed" },
    { id: "sunset-mirage-merge", name: "Mirage Merge", seed: "SUNSET-MIRAGE-MERGE-REDLINE", speedClass: "Redline", feelTag: "lane discipline" },
    { id: "sunset-afterburner-mile", name: "Afterburner Mile", seed: "SUNSET-AFTERBURNER-MILE-REDLINE", speedClass: "Redline", feelTag: "boost chain" },
    { id: "sunset-last-light-gauntlet", name: "Last Light Gauntlet", seed: "SUNSET-LAST-LIGHT-REDLINE", speedClass: "Redline", feelTag: "final push" }
  ],
  "redline-run": [
    { id: "redline-tunnel-spark-sprint", name: "Tunnel Spark Sprint", seed: "REDLINE-TUNNEL-SPARK-TURBO", speedClass: "Turbo", feelTag: "clean speed" },
    { id: "redline-neon-gate-dash", name: "Neon Gate Dash", seed: "REDLINE-NEON-GATE-TURBO", speedClass: "Turbo", feelTag: "lane discipline" },
    { id: "redline-service-lane-slalom", name: "Service Lane Slalom", seed: "REDLINE-SERVICE-LANE-TURBO", speedClass: "Turbo", feelTag: "traffic pressure" },
    { id: "redline-overpass-charge", name: "Overpass Charge", seed: "REDLINE-OVERPASS-CHARGE-OD", speedClass: "Overdrive", feelTag: "final push" },
    { id: "redline-switchyard-boostline", name: "Switchyard Charge", seed: "REDLINE-SWITCHYARD-BOOST-OD", speedClass: "Overdrive", feelTag: "boost chain" },
    { id: "redline-concrete-ribbon", name: "Concrete Ribbon", seed: "REDLINE-CONCRETE-RIBBON-OD", speedClass: "Overdrive", feelTag: "clean speed" },
    { id: "redline-midnight-merge", name: "Midnight Merge", seed: "REDLINE-MIDNIGHT-MERGE-REDLINE", speedClass: "Redline", feelTag: "lane discipline" },
    { id: "redline-reactor-ramp", name: "Reactor Ramp", seed: "REDLINE-REACTOR-RAMP-REDLINE", speedClass: "Redline", feelTag: "ramp route" },
    { id: "redline-city-limits-blaze", name: "City Limits Blaze", seed: "REDLINE-CITY-LIMITS-REDLINE", speedClass: "Redline", feelTag: "traffic pressure" },
    { id: "redline-finale", name: "Redline Finale", seed: "REDLINE-FINALE-REDLINE", speedClass: "Redline", feelTag: "final push" }
  ],
  "midnight-ridge": [
    { id: "midnight-ridge-lantern-sprint", name: "Ridge Lantern Sprint", seed: "MIDNIGHT-RIDGE-LANTERN-TURBO", speedClass: "Turbo", feelTag: "clean speed" },
    { id: "midnight-cliffside-cutback", name: "Cliffside Cutback", seed: "MIDNIGHT-CLIFFSIDE-CUTBACK-TURBO", speedClass: "Turbo", feelTag: "lane discipline" },
    { id: "midnight-switchback-glow", name: "Switchback Glow", seed: "MIDNIGHT-SWITCHBACK-GLOW-TURBO", speedClass: "Turbo", feelTag: "drift timing" },
    { id: "midnight-pine-shadow-run", name: "Pine Shadow Run", seed: "MIDNIGHT-PINE-SHADOW-TURBO", speedClass: "Turbo", feelTag: "ridge line" },
    { id: "midnight-guardrail-gamble", name: "Guardrail Gamble", seed: "MIDNIGHT-GUARDRAIL-GAMBLE-OVERDRIVE", speedClass: "Overdrive", feelTag: "risk line" },
    { id: "midnight-moonlit-descent", name: "Moonlit Descent", seed: "MIDNIGHT-MOONLIT-DESCENT-OVERDRIVE", speedClass: "Overdrive", feelTag: "descent pressure" },
    { id: "midnight-summit-driftline", name: "Summit Driftline", seed: "MIDNIGHT-SUMMIT-DRIFTLINE-OVERDRIVE", speedClass: "Overdrive", feelTag: "drift timing" },
    { id: "midnight-black-peak-charge", name: "Black Peak Charge", seed: "MIDNIGHT-BLACK-PEAK-REDLINE", speedClass: "Redline", feelTag: "final push" },
    { id: "midnight-last-ridge-drop", name: "Last Ridge Drop", seed: "MIDNIGHT-LAST-RIDGE-REDLINE", speedClass: "Redline", feelTag: "lane discipline" },
    { id: "midnight-no-return-pass", name: "No-Return Pass", seed: "MIDNIGHT-NO-RETURN-PASS-REDLINE", speedClass: "Redline", feelTag: "final push" }
  ],
  "blackout-run": [
    { id: "blackout-headlight-mile", name: "Headlight Mile", seed: "BLACKOUT-HEADLIGHT-MILE-TURBO", speedClass: "Turbo", feelTag: "headlight read" },
    { id: "blackout-reflector-gate", name: "Reflector Gate", seed: "BLACKOUT-REFLECTOR-GATE-TURBO", speedClass: "Turbo", feelTag: "lane discipline" },
    { id: "blackout-dark-lane-dash", name: "Dark Lane Dash", seed: "BLACKOUT-DARK-LANE-DASH-TURBO", speedClass: "Turbo", feelTag: "clean speed" },
    { id: "blackout-white-line-fever", name: "White Line Fever", seed: "BLACKOUT-WHITE-LINE-FEVER-TURBO", speedClass: "Turbo", feelTag: "white line" },
    { id: "blackout-blind-curve-cut", name: "Blind Curve Cut", seed: "BLACKOUT-BLIND-CURVE-OVERDRIVE", speedClass: "Overdrive", feelTag: "precision" },
    { id: "blackout-phantom-merge", name: "Phantom Merge", seed: "BLACKOUT-PHANTOM-MERGE-OVERDRIVE", speedClass: "Overdrive", feelTag: "traffic shadow" },
    { id: "blackout-low-beam-sprint", name: "Low Beam Sprint", seed: "BLACKOUT-LOW-BEAM-SPRINT-OVERDRIVE", speedClass: "Overdrive", feelTag: "clean speed" },
    { id: "blackout-lights-out-charge", name: "Lights Out Charge", seed: "BLACKOUT-LIGHTS-OUT-REDLINE", speedClass: "Redline", feelTag: "final push" },
    { id: "blackout-black-glass-run", name: "Black Glass Run", seed: "BLACKOUT-BLACK-GLASS-REDLINE", speedClass: "Redline", feelTag: "lane discipline" },
    { id: "blackout-no-moon-finale", name: "No Moon Finale", seed: "BLACKOUT-NO-MOON-FINALE-REDLINE", speedClass: "Redline", feelTag: "final push" }
  ],
  "prism-highway": [
    { id: "prism-pinkline-sprint", name: "Pinkline Sprint", seed: "PRISM-PINKLINE-SPRINT-TURBO", speedClass: "Turbo", feelTag: "clean speed" },
    { id: "prism-rainbow-ramp-rush", name: "Rainbow Ramp Rush", seed: "PRISM-RAINBOW-RAMP-TURBO", speedClass: "Turbo", feelTag: "ramp route" },
    { id: "prism-neon-ribbon-run", name: "Neon Ribbon Run", seed: "PRISM-NEON-RIBBON-TURBO", speedClass: "Turbo", feelTag: "boost chain" },
    { id: "prism-candy-sky-cut", name: "Candy Sky Cut", seed: "PRISM-CANDY-SKY-CUT-TURBO", speedClass: "Turbo", feelTag: "lane discipline" },
    { id: "prism-violet-boostway", name: "Violet Boostway", seed: "PRISM-VIOLET-BOOSTWAY-OVERDRIVE", speedClass: "Overdrive", feelTag: "boost chain" },
    { id: "prism-glowwave-merge", name: "Glowwave Merge", seed: "PRISM-GLOWWAVE-MERGE-OVERDRIVE", speedClass: "Overdrive", feelTag: "traffic pressure" },
    { id: "prism-starburst-switch", name: "Starburst Switch", seed: "PRISM-STARBURST-SWITCH-OVERDRIVE", speedClass: "Overdrive", feelTag: "lane discipline" },
    { id: "prism-hot-pink-redline", name: "Hot Pink Redline", seed: "PRISM-HOT-PINK-REDLINE", speedClass: "Redline", feelTag: "final push" },
    { id: "prism-spectrum-surge", name: "Spectrum Surge", seed: "PRISM-SPECTRUM-SURGE-REDLINE", speedClass: "Redline", feelTag: "boost chain" },
    { id: "prism-finale", name: "Prism Finale", seed: "PRISM-FINALE-REDLINE", speedClass: "Redline", feelTag: "final push" }
  ]
};

const NORMAL_TRACKS = [
  { id: "sunset-highway", name: "Sunset Highway" },
  { id: "redline-run", name: "Redline Run" },
  { id: "midnight-ridge", name: "Midnight Ridge" },
  { id: "blackout-run", name: "Blackout Run" },
  { id: "prism-highway", name: "Prism Highway" }
];

const SPEED_LABELS = {
  arcade: "Arcade",
  pro: "Pro",
  turbo: "Turbo",
  overdrive: "Overdrive",
  redline: "Redline"
};

const SPEED_IDS_BY_LABEL = Object.fromEntries(Object.entries(SPEED_LABELS).map(([id, label]) => [label, id]));

const OFFICIAL_SCENARIOS = [
  { routeId: "sunset-neon-palm-sprint", trackId: "sunset-highway", raceType: "classic", score: 112300, time: 42.123, feedback: { boostPadsCollected: 3, bestBoostPadChain: 2, rampsUsed: 1, rampTargetsCleared: 0 }, expectFeedback: "Strong boost route" },
  { routeId: "sunset-orange-sky-switchback", trackId: "sunset-highway", raceType: "classic", score: 118900, time: 40.777 },
  { routeId: "sunset-glass-city-climb", trackId: "sunset-highway", raceType: "classic", score: 132400, time: 39.654, feedback: { boostPadsCollected: 1, bestBoostPadChain: 0, rampsUsed: 2, rampTargetsCleared: 2 }, expectFeedback: "Strong ramp route" },
  { routeId: "sunset-last-light-gauntlet", trackId: "sunset-highway", raceType: "classic", score: 284500, time: 28.456 },
  { routeId: "midnight-ridge-lantern-sprint", trackId: "midnight-ridge", raceType: "classic", score: 126400, time: 43.219 },
  { routeId: "blackout-headlight-mile", trackId: "blackout-run", raceType: "classic", score: 121900, time: 43.876 },
  { routeId: "prism-pinkline-sprint", trackId: "prism-highway", raceType: "classic", score: 129700, time: 42.884 },
  { routeId: "redline-switchyard-boostline", trackId: "redline-run", raceType: "fuelRun", score: 219800, time: 35.789, feedback: { boostPadsCollected: 2, bestBoostPadChain: 2, rampsUsed: 1, rampTargetsCleared: 1, gasCansCollected: 2, gasCansSpawned: 2 }, expectFeedback: "Strong boost route" }
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
    assert(!lower.includes(term), `${label} should not expose ${term}`, { snippet: String(text).slice(0, 1000) });
  });
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

async function assertNormalTrackCards(page, inputName = "preRaceTrack") {
  const cards = await page.$$eval(`input[name="${inputName}"]`, (nodes) => nodes.map((node) => ({
    id: node.value,
    label: node.closest("[data-track-card]")?.textContent.replace(/\s+/g, " ").trim() || "",
    height: node.closest("[data-track-card]")?.getBoundingClientRect().height || 0,
    descriptorCount: node.closest("[data-track-card]")?.querySelectorAll("em, small").length || 0
  })));
  assert(cards.length === NORMAL_TRACKS.length, `Expected ${NORMAL_TRACKS.length} normal track cards for ${inputName}`, { cards });
  for (const track of NORMAL_TRACKS) {
    const card = cards.find((item) => item.id === track.id);
    assert(card, `Missing normal track card: ${track.id}`, { cards });
    assert(card.label === track.name, "Track choices should be name-only with no wrapped descriptors", { track, card });
    assert(card.descriptorCount === 0, "Track choices should not render descriptor tags", { track, card });
    assert(card.height <= 70, "Track choices should stay compact", { track, card });
  }
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

async function assertOfficialSetupLayoutIntegrity(page, label) {
  const metrics = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const pageScrollWidth = document.documentElement.scrollWidth;
    const panel = document.querySelector(".pre-race-panel");
    const routeList = document.querySelector(".official-route-list");
    const longNames = ["Orange Sky Switchback", "Last Light Gauntlet", "Heatwave Express"];
    const rows = Array.from(document.querySelectorAll(".official-route-list [data-official-route-id]")).map((row) => {
      const rowRect = row.getBoundingClientRect();
      const children = Array.from(row.children).map((child) => {
        const rect = child.getBoundingClientRect();
        return {
          className: child.className || child.tagName,
          text: child.textContent.replace(/\s+/g, " ").trim(),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          scrollWidth: child.scrollWidth,
          clientWidth: child.clientWidth
        };
      });
      const overlaps = [];
      for (let index = 0; index < children.length; index += 1) {
        for (let next = index + 1; next < children.length; next += 1) {
          const a = children[index];
          const b = children[next];
          const intersects = a.left < b.right - 1
            && b.left < a.right - 1
            && a.top < b.bottom - 1
            && b.top < a.bottom - 1;
          if (intersects) overlaps.push([a.text, b.text]);
        }
      }
      const outside = children.filter((child) => (
        child.left < rowRect.left - 1
        || child.right > rowRect.right + 1
        || child.top < rowRect.top - 1
        || child.bottom > rowRect.bottom + 1
        || child.scrollWidth > child.clientWidth + 1
      ));
      const pb = row.querySelector("small")?.getBoundingClientRect();
      const title = row.querySelector("strong")?.textContent?.replace(/\s+/g, " ").trim() || "";
      return {
        id: row.dataset.officialRouteId,
        text: row.textContent.replace(/\s+/g, " ").trim(),
        width: rowRect.width,
        height: rowRect.height,
        outside,
        overlaps,
        title,
        pbInside: !pb || (pb.left >= rowRect.left - 1 && pb.right <= rowRect.right + 1)
      };
    });
    return {
      viewportWidth,
      pageScrollWidth,
      panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : 0,
      routeListOverflow: routeList ? routeList.scrollWidth - routeList.clientWidth : 0,
      rows,
      longNameRows: rows.filter((row) => longNames.some((name) => row.title.includes(name)))
    };
  });
  assert(metrics.pageScrollWidth <= metrics.viewportWidth + 1, `${label} should not require horizontal page scrolling`, { metrics });
  assert(metrics.panelOverflow <= 1, `${label} panel should not overflow horizontally`, { metrics });
  assert(metrics.routeListOverflow <= 1, `${label} route list should not overflow horizontally`, { metrics });
  const outsideRows = metrics.rows.filter((row) => row.outside.length);
  assert(outsideRows.length === 0, `${label} route row text should stay inside each row`, { outsideRows });
  const overlappingRows = metrics.rows.filter((row) => row.overlaps.length);
  assert(overlappingRows.length === 0, `${label} route row text should not overlap`, { overlappingRows });
  const pbOutsideRows = metrics.rows.filter((row) => !row.pbInside);
  assert(pbOutsideRows.length === 0, `${label} PB text should stay inside route rows`, { pbOutsideRows });
  if (metrics.rows.some((row) => ["Orange Sky Switchback", "Last Light Gauntlet", "Heatwave Express"].includes(row.title))) {
    assert(metrics.longNameRows.length >= 3, `${label} should keep long Sunset route names readable`, { longNameRows: metrics.longNameRows });
  }
}

async function assertTrackOfficial10(page, trackId, label) {
  await selectTrack(page, trackId);
  const routes = TRACK_ROUTES[trackId];
  const text = await bodyText(page);
  assertIncludes(text, "Official Race");
  assertIncludes(text, "Track");
  assertIncludes(text, "Race Type");
  assertIncludes(text, "Route");
  assertIncludes(text, label);
  assertIncludes(text, "Custom Road");
  assertNoNormalUiDebugTerms(text, `${label} setup`);
  assert(!text.includes(routes[0].seed), "Main Official setup should hide raw route seeds", { route: routes[0].id, snippet: text.slice(0, 1200) });
  assert(!text.includes("Pursuit"), "Pursuit should not appear in normal setup", { snippet: text.slice(0, 1200) });
  assert(!text.includes("Boostline Prototype"), "Boostline prototype should not appear in normal setup", { snippet: text.slice(0, 1200) });
  assert(!/\bArcade\b|\bPro\b/.test(text), "Arcade/Pro should stay inside collapsed Practice controls", { snippet: text.slice(0, 1200) });

  const setupShape = await page.evaluate(() => {
    const panel = document.querySelector(".pre-race-panel");
    const summary = document.querySelector("#soloSetupActionSummary")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const raceButtons = Array.from(document.querySelectorAll('[data-race-type-choice="preRace"]')).map((node) => node.textContent.replace(/\s+/g, " ").trim());
    const sectionLabels = Array.from(document.querySelectorAll(".official-setup-section .setup-section-heading .eyebrow")).map((node) => node.textContent.replace(/\s+/g, " ").trim());
    return {
      panelTitle: panel?.querySelector("h2")?.textContent?.trim() || "",
      sectionLabels,
      summary,
      summaryCount: Array.from(panel?.querySelectorAll("*") || []).filter((node) => node.textContent?.replace(/\s+/g, " ").trim() === summary).length,
      startBarCount: panel?.querySelectorAll(".solo-setup-action").length || 0,
      stepStripCount: panel?.querySelectorAll(".setup-step-strip").length || 0,
      raceButtons
    };
  });
  assert(setupShape.panelTitle === "Official Race", "Official setup title should be simple", { setupShape });
  assert(JSON.stringify(setupShape.sectionLabels) === JSON.stringify(["Track", "Race Type", "Route"]), "Official setup should use Track / Race Type / Route sections", { setupShape });
  assert(setupShape.startBarCount === 1 && setupShape.stepStripCount === 0, "Official setup should use one start bar and no bulky step strip", { setupShape });
  assert(setupShape.summaryCount === 1, "Start Race summary should appear once", { setupShape });
  assert(JSON.stringify(setupShape.raceButtons) === JSON.stringify(["Classic", "Fuel Run"]), "Race Type should be a compact Classic/Fuel toggle", { setupShape });

  const practiceOpen = await page.$eval(".practice-collapsible", (node) => node.open);
  assert(!practiceOpen, "Custom Road should be collapsed by default");

  const trackLayout = await page.$$eval("[data-track-card]", (nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  assert(trackLayout.every((height) => height <= 90), "Track choices should be compact tiles", { trackLayout });
  await assertOfficialSetupLayoutIntegrity(page, `${label} setup`);

  const routeLayout = await page.$eval(".official-route-list", (node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    const rows = Array.from(node.querySelectorAll("[data-official-route-id]")).map((row) => row.getBoundingClientRect());
    return {
      height: rect.height,
      columns: style.gridTemplateColumns.split(" ").filter(Boolean).length,
      rowTops: Array.from(new Set(rows.map((row) => Math.round(row.top))))
    };
  });
  assert(routeLayout.height <= 420, "Official route list should avoid a huge-card layout", { routeLayout });
  assert(routeLayout.columns === 2 && routeLayout.rowTops.length === 5, "Official route list should use a dense two-column, five-row board on desktop", { routeLayout });

  const cards = await page.$$eval(".official-route-list [data-official-route-id]", (nodes) => (
    nodes.map((node) => ({
      id: node.dataset.officialRouteId,
      text: node.textContent || "",
      height: node.getBoundingClientRect().height
    }))
  ));
  assert(cards.length === 10, `Expected 10 official route rows for ${trackId}`, { cards });
  assert(cards.every((card) => card.height <= 92), `Official route rows should stay compact for ${trackId}`, { cards });
  for (const route of routes) {
    const card = cards.find((item) => item.id === route.id);
    assert(card, `Missing official route row: ${route.id}`, { cards });
    assertIncludes(card.text, route.name);
    assertIncludes(card.text, route.speedClass);
    assert(!card.text.includes(route.seed), "Official route setup cards should hide raw route seeds", { route, card: card.text });
    assert(!/Arcade|Pro/i.test(`${route.name} ${route.speedClass}`), "Official cards should not use Arcade/Pro", { route });
  }

  const raceTypeValues = await page.$$eval("#preRaceType option", (options) => options.map((option) => option.value));
  assert(raceTypeValues.includes("classic"), "Classic missing from official setup race types", { raceTypeValues });
  assert(raceTypeValues.includes("fuelRun"), "Fuel Run missing from official setup race types", { raceTypeValues });
  assert(!raceTypeValues.includes("pursuit"), "Pursuit should not appear in normal solo setup", { raceTypeValues });
  assert(!raceTypeValues.includes("boostline"), "Boostline should not appear in normal solo setup", { raceTypeValues });
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
  const selectedState = await page.$$eval(".official-route-list [data-official-route-id]", (nodes) => nodes.map((node) => ({
    id: node.dataset.officialRouteId,
    selected: node.classList.contains("is-selected")
  })));
  assert(selectedState.filter((item) => item.selected).length === 1, "One official route should be visibly selected", { selectedState });
  assert(selectedState.some((item) => item.id === routeId && item.selected), "Selected route should match the clicked route", { selectedState, routeId });
}

async function returnToPreRace(page) {
  await page.evaluate(() => window.neonRoadRally?.showPreRaceScreen());
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
}

async function assertOfficialLaunchState(page, routeId) {
  const route = routeById(routeId);
  await selectTrack(page, "sunset-highway");
  await setRaceType(page, "classic");
  await selectOfficialRoute(page, routeId);
  const readyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(readyText, "Official Race");
  assertIncludes(readyText, route.name);
  assertIncludes(readyText, route.speedClass);
  assert(!readyText.includes(route.seed), "Official Start Race summary should hide raw route seeds", { readyText, routeId });
  await clickAction(page, "startSeededRace");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "game", null, { timeout: 5000 });
  const runState = await page.evaluate(() => {
    const run = window.neonRoadRally?.run || {};
    return {
      officialRouteId: run.officialRouteId || "",
      speedClassId: run.speedClassId || "",
      raceTypeId: run.raceTypeId || "",
      competitionKind: run.competitionKind || "",
      routeSeedLocked: Boolean(run.routeSeedLocked || run.officialRouteSeedLocked),
      seed: run.roadSeed || run.seed || ""
    };
  });
  assert(runState.officialRouteId === routeId, `Official route ${routeId} should launch as Official Race`, { runState, route });
  assert(runState.speedClassId === SPEED_IDS_BY_LABEL[route.speedClass], "Official launch should use the route locked speed", { runState, route });
  assert(runState.competitionKind === "Official Race", "Official route launch should use Official Race context", { runState, route });
  assert(runState.routeSeedLocked, "Official route launch should seed-lock the route", { runState, route });
  await returnToPreRace(page);
}

async function assertPracticeOverridesOfficialLaunch(page, routeId, speedClassId) {
  const route = routeById(routeId);
  await selectTrack(page, "sunset-highway");
  await setRaceType(page, "classic");
  await selectOfficialRoute(page, routeId);
  await expandPracticeSetup(page);
  await selectPracticeSpeed(page, speedClassId);
  const readyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(readyText, "Custom Road");
  assertIncludes(readyText, SPEED_LABELS[speedClassId] || speedClassId);
  assertIncludes(readyText, route.seed);
  assert(!readyText.includes(route.name), "Practice summary should not keep the selected Official route name", { readyText, route });
  await clickAction(page, "startSeededRace");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "game", null, { timeout: 5000 });
  const runState = await page.evaluate(() => {
    const run = window.neonRoadRally?.run || {};
    return {
      officialRouteId: run.officialRouteId || "",
      speedClassId: run.speedClassId || "",
      raceTypeId: run.raceTypeId || "",
      competitionKind: run.competitionKind || "",
      routeSeedLocked: Boolean(run.routeSeedLocked || run.officialRouteSeedLocked),
      seed: run.roadSeed || run.seed || ""
    };
  });
  assert(runState.officialRouteId === "", "Practice launch should not keep the selected Official route id", { runState, route });
  assert(runState.competitionKind === "Custom Road", "Practice launch should use Custom Road context", { runState, route });
  assert(runState.speedClassId === speedClassId, "Practice launch should use the selected custom speed", { runState, speedClassId });
  assert(runState.seed === route.seed, "Practice launch should use the current custom road code input", { runState, route });
  assert(!runState.routeSeedLocked, "Practice launch should not seed-lock an Official route", { runState, route });
  await returnToPreRace(page);
  await selectOfficialRoute(page, routeId);
  const officialReadyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(officialReadyText, "Official Race");
  assertIncludes(officialReadyText, route.name);
  assert(!officialReadyText.includes("Custom Road"), "Selecting an Official route should switch back from Practice context", { officialReadyText, route });
}

async function finishCurrentRace(page, score, time, feedback = {}) {
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
      routeSignatureHash: run.routeSignatureHash || "",
      runProgressSignatureHash: run.runProgressSignatureHash || run.routeSignatureHash || "",
      officialFullRouteSignatureHash: run.officialFullRouteSignatureHash || ""
    };
  });
  assert(telemetry.frameSampleCount > 0, "Frame telemetry should collect samples on race screen", { telemetry });
  assert(telemetry.averageFrameMs > 0, "Frame telemetry should report average frame time", { telemetry });
  await page.evaluate(({ runScore, runTime, routeFeedback }) => {
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
    run.boostPadsCollected = routeFeedback.boostPadsCollected ?? 1;
    run.bestBoostPadChain = routeFeedback.bestBoostPadChain ?? run.bestBoostPadChain ?? 0;
    run.boostPadsReachableSeen = routeFeedback.boostPadsReachableSeen ?? Math.max(run.boostPadsCollected || 0, 1);
    run.boostPadsMissedReachable = routeFeedback.boostPadsMissedReachable ?? 0;
    run.rampsUsed = routeFeedback.rampsUsed ?? 1;
    run.rampTargetsCleared = routeFeedback.rampTargetsCleared ?? 1;
    run.nearMisses = 1;
    run.laneMoves = 2;
    run.slowdownHits = 0;
    if (run.raceTypeId === "fuelRun") {
      run.fuel = Math.max(run.fuel || 0, run.fuelMax || 80);
      run.gasCansCollected = Math.max(run.gasCansCollected || 0, routeFeedback.gasCansCollected ?? 1);
      run.gasCansSpawned = Math.max(run.gasCansSpawned || 0, routeFeedback.gasCansSpawned ?? 1);
    }
    app.endRace("finished", "Official Routes Smoke Finish");
  }, { runScore: score, runTime: time, routeFeedback: feedback });
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
  assertIncludes(readyText, route.speedClass);
  assert(!readyText.includes(route.seed), "Start Race summary should not expose raw official seeds", { readyText, routeId: route.id });
  await clickAction(page, "startSeededRace");
  const telemetry = await finishCurrentRace(page, scenario.score, scenario.time, scenario.feedback || {});
  const text = await bodyText(page);
  assertIncludes(text, "Official Race Result");
  assertIncludes(text, route.name);
  assert(!text.includes(route.seed), "Official result first view should not expose raw route seed", { routeId: route.id });
  assertNoNormalUiDebugTerms(text, `${route.name} result`);
  assertIncludes(text, `${scenario.time.toFixed(3)}s`);
  assertIncludes(text, "PB Delta");
  assertIncludes(text, "Top 20");
  if (scenario.expectFeedback) assertIncludes(text, scenario.expectFeedback);
  const routeBoardActionCount = await page.locator('[data-action="leaderboard"]').filter({ hasText: "View Route Boards" }).count();
  assert(routeBoardActionCount === 1, "Result should expose one View Route Boards action", { routeBoardActionCount });
  await page.locator(".result-details-block summary").click();
  const detailSeed = await page.locator(".seed-copy").inputValue();
  assert(detailSeed === route.seed, "Official route seed should remain available in result details", { routeId: route.id, detailSeed });
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
  assertIncludes(text, "Switchyard Charge");
  assertIncludes(text, "35.789s");
  assertIncludes(text, "Fuel Run");
  await page.evaluate(() => window.neonRoadRally?.showPreRaceScreen());
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
}

async function selectPracticeSpeed(page, speedClassId) {
  await expandPracticeSetup(page);
  const button = page.locator(`.practice-setup-body [data-action="setModePickerSpeed"][data-id="${speedClassId}"]`);
  const count = await button.count();
  assert(count === 1, `Expected one Practice speed button for ${speedClassId}`, { count });
  await button.click();
  await page.waitForFunction(
    ({ id, label }) => (
      document.querySelector("#preRaceSpeedClass")?.value === id
      && document.querySelector("#soloSetupCompetitionLabel")?.textContent?.includes("Custom Road")
      && document.querySelector("#soloSetupActionSummary")?.textContent?.includes(label)
    ),
    { id: speedClassId, label: SPEED_LABELS[speedClassId] || speedClassId },
    { timeout: 5000 }
  );
}

async function expandPracticeSetup(page) {
  const details = page.locator(".practice-collapsible");
  const count = await details.count();
  assert(count === 1, "Custom Road section should exist", { count });
  const open = await details.evaluate((node) => node.open);
  if (!open) {
    await page.locator(".practice-collapsible summary").click();
    await page.waitForFunction(() => document.querySelector(".practice-collapsible")?.open, null, { timeout: 5000 });
  }
}

async function runCustomScenario(page, options = {}) {
  const trackId = options.trackId || "sunset-highway";
  const seed = options.seed || "CUSTOM-OFFICIAL-SMOKE";
  await selectTrack(page, trackId);
  await setRaceType(page, "classic");
  await expandPracticeSetup(page);
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
  const input = page.locator("#roadSeedInput");
  await input.fill(seed);
  await page.waitForFunction(
    (expectedSeed) => document.querySelector("#roadSeedInput")?.value === expectedSeed,
    seed,
    { timeout: 5000 }
  );
  readyText = await page.locator(".solo-setup-action").innerText();
  assertIncludes(readyText, "Custom Road");
  assertIncludes(readyText, "Turbo");
  assertIncludes(readyText, seed);
  await clickAction(page, "startSeededRace");
  const telemetry = await finishCurrentRace(page, 98100, 48.321);
  const text = await bodyText(page);
  assertIncludes(text, "Playground Result");
  assertIncludes(text, "Playground Record");
  assertIncludes(text, "Custom Road");
  assertIncludes(text, seed);
  assertNoNormalUiDebugTerms(text, "Custom Road result");
  assert(!text.includes("Official Race Result"), "Custom result should not present as Official Race");
  const boardSeparation = await page.evaluate((customSeed) => {
    const app = window.neonRoadRally;
    return {
      officialHasCustomSeed: (app.profiles.data.leaderboard || []).some((entry) => entry.seed === customSeed),
      playgroundHasCustomSeed: (app.profiles.data.playgroundRecords || []).some((entry) => entry.seed === customSeed),
      playgroundOfficialLeak: (app.profiles.data.playgroundRecords || []).some((entry) => Boolean(entry.officialRouteId))
    };
  }, seed);
  assert(boardSeparation.playgroundHasCustomSeed, "Custom Road result should save to Playground records", boardSeparation);
  assert(!boardSeparation.officialHasCustomSeed && !boardSeparation.playgroundOfficialLeak, "Custom Road should not contaminate Official boards", boardSeparation);
  if (options.returnToSetup) {
    await clickAction(page, "preRace");
    await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
  }
  return { routeId: "custom-road", telemetry };
}

async function assertLeaderboards(page) {
  await page.evaluate(() => {
    const app = window.neonRoadRally;
    const player = app?.profiles?.getCurrentPlayer?.();
    if (!app || !player) return;
    const routeId = "sunset-neon-palm-sprint";
    if ((app.profiles.data.enduranceLeaderboard || []).some((entry) => entry.officialRouteId === routeId)) return;
    app.profiles.data.enduranceLeaderboard.push({
      recordId: "smoke-endurance-sunset-neon-palm",
      playerId: player.id,
      playerName: player.name,
      officialRouteId: routeId,
      trackId: "sunset-highway",
      raceTypeId: "classic",
      speedClassId: "turbo",
      officialFinishTimeMs: 42123,
      officialFinishScore: 112300,
      survivalTime: 37.5,
      postFinishScore: 56700,
      currentLap: 4,
      lapReached: 4,
      enduranceLapsCompleted: 3,
      endedBy: "Crash",
      date: new Date().toISOString()
    });
  });
  await page.evaluate(() => window.neonRoadRally?.showLeaderboard("scoreAttack", {
    officialRouteId: "sunset-neon-palm-sprint",
    raceTypeId: "classic"
  }));
  await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
  let text = await bodyText(page);
  assertIncludes(text, "Score Attack");
  assertIncludes(text, "Leaderboards");
  assertIncludes(text, "Your Best");
  assertIncludes(text, "Leader");
  assertIncludes(text, "Next Chase");
  assertIncludes(text, "Race This Route");
  assertIncludes(text, "Neon Palm Sprint");
  assertIncludes(text, "Time Attack");
  assertIncludes(text, "Survival");
  assertIncludes(text, "Endurance Score");
  assertIncludes(text, "Playground Score");
  assertIncludes(text, "Playground Time");
  assertNoNormalUiDebugTerms(text, "Score Attack board");
  const arcadePrimitives = await page.$eval(".leaderboard-chase-panel", (panel) => ({
    pageShell: panel.classList.contains("arcade-page-shell"),
    header: Boolean(panel.querySelector(".arcade-header")),
    tabs: Boolean(panel.querySelector(".arcade-segmented-tabs")),
    filterBar: Boolean(panel.querySelector(".arcade-filter-bar")),
    statStrip: Boolean(panel.querySelector(".arcade-stat-strip")),
    boardContext: Boolean(panel.querySelector(".arcade-scoreboard-header")),
    scoreboard: Boolean(panel.querySelector(".arcade-scoreboard")),
    row: Boolean(panel.querySelector(".arcade-score-row")),
    primaryValue: Boolean(panel.querySelector(".arcade-primary-value")),
    currentChip: Boolean(panel.querySelector(".arcade-you-chip")),
    toolsPanel: Boolean(panel.querySelector(".arcade-tools-panel"))
  }));
  assert(Object.values(arcadePrimitives).every(Boolean), "Leaderboard should use reusable arcade UI primitives", arcadePrimitives);
  const boardTabs = await page.$$eval(".arcade-segmented-tabs .arcade-tab", (nodes) => nodes.map((node) => node.textContent.trim()));
  assert(JSON.stringify(boardTabs) === JSON.stringify(["Time Attack", "Score Attack", "Survival", "Endurance Score", "Playground Score", "Playground Time"]), "Chase board tabs should be compact labels", { boardTabs });
  const boardTabMaxHeight = await page.$$eval(".arcade-segmented-tabs .arcade-tab", (nodes) => Math.max(...nodes.map((node) => node.getBoundingClientRect().height)));
  assert(boardTabMaxHeight <= 42, "Chase board tabs should stay slim", { boardTabMaxHeight });
  const filterShape = await page.$eval(".arcade-filter-bar", (node) => {
    const routeSelect = node.querySelector("#leaderboardRoute");
    const routeSelectStyle = routeSelect ? window.getComputedStyle(routeSelect) : null;
    const children = Array.from(node.children).map((child) => {
      const rect = child.getBoundingClientRect();
      return {
        text: child.textContent.replace(/\s+/g, " ").trim(),
        width: rect.width,
        height: rect.height
      };
    });
    return {
      height: node.getBoundingClientRect().height,
      routeSelectTag: routeSelect?.tagName || "",
      routeValue: routeSelect?.value || "",
      routeOptions: routeSelect ? Array.from(routeSelect.options).map((option) => option.textContent.trim()) : [],
      routeWhiteSpace: routeSelectStyle?.whiteSpace || "",
      routeCardCount: node.querySelectorAll(".official-route-row, .official-route-card, .official-route-list, .leaderboard-route-menu").length,
      emptyChildren: children.filter((child) => !child.text || child.width < 40 || child.height < 16),
      text: node.textContent.replace(/\s+/g, " ").trim()
    };
  });
  assert(filterShape.height <= 64, "Leaderboard route controls should stay in one compact bar", { filterShape });
  assert(filterShape.routeSelectTag === "SELECT", "Leaderboard route selector should be a compact select control", { filterShape });
  assert(filterShape.routeCardCount === 0, "Leaderboard route selector should not render route cards or grids", { filterShape });
  assert(filterShape.routeWhiteSpace === "nowrap", "Leaderboard route names should stay horizontal in the compact selector", { filterShape });
  assert(filterShape.emptyChildren.length === 0, "Leaderboard filters should not create empty columns", { filterShape });
  assert(filterShape.routeOptions.some((option) => option.includes("Last Light Gauntlet") && option.includes("Redline")), "Route dropdown should expose normal route names with speed", { filterShape });
  assertIncludes(filterShape.text, "Track");
  assertIncludes(filterShape.text, "Race Type");
  assertIncludes(filterShape.text, "Route");
  const firstLeaderboardRowTop = await page.$eval(".leaderboard-list .leaderboard-item", (node) => node.getBoundingClientRect().top);
  assert(firstLeaderboardRowTop < 610, "Leaderboard rows should start high on the page", { firstLeaderboardRowTop });
  const yourBestHeight = await page.$eval(".arcade-stat-strip", (node) => node.getBoundingClientRect().height);
  assert(yourBestHeight <= 78, "Chase summary should stay compact", { yourBestHeight });
  const currentDriverRows = await page.locator(".leaderboard-list .leaderboard-item.is-current-driver .arcade-you-chip").count();
  assert(currentDriverRows >= 1, "Current driver chip should be visible in the ranked row", { currentDriverRows });
  const scoreRowText = await page.locator(".leaderboard-list .leaderboard-item").first().innerText();
  assertIncludes(scoreRowText, "finish");
  assert(/\d{1,3}(,\d{3})+/.test(scoreRowText), "Score Attack row should emphasize a score value", { scoreRowText });
  const scorePrimaryValue = await page.locator(".leaderboard-list .leaderboard-item .arcade-primary-value strong").first().innerText();
  assert(/\d{1,3}(,\d{3})+/.test(scorePrimaryValue), "Score Attack row should prioritize score", { scorePrimaryValue, scoreRowText });
  assertIncludes(scoreRowText, "You");
  assert(!/Official Race/i.test(scoreRowText), "Leaderboard row should not repeat Official Race", { scoreRowText });
  assert(!/Sunset Highway|Classic|Turbo/i.test(scoreRowText), "Filtered leaderboard row should not repeat selected track/rules/speed", { scoreRowText });
  const lowerScoreText = text.toLowerCase();
  assert(!lowerScoreText.includes("sunset-palm-sprint-turbo"), "Main Score Attack board should hide raw official seeds");
  assert(!/save loaded/i.test(text), "Save status should stay hidden behind Data Tools", { snippet: text.slice(0, 1000) });
  await page.selectOption("#leaderboardRoute", "sunset-last-light-gauntlet");
  await page.dispatchEvent("#leaderboardRoute", "change");
  await page.waitForFunction(
    () => window.neonRoadRally?.leaderboardOfficialRouteId === "sunset-last-light-gauntlet"
      && document.querySelector('[data-action="raceOfficialRoute"]')?.dataset.officialRouteId === "sunset-last-light-gauntlet",
    null,
    { timeout: 5000 }
  );
  let routeChangeText = await bodyText(page);
  assertIncludes(routeChangeText, "Last Light Gauntlet");
  assertIncludes(routeChangeText, "Redline");
  const routeControlMetrics = await page.$eval("#leaderboardRoute", (node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return {
      width: rect.width,
      height: rect.height,
      whiteSpace: style.whiteSpace,
      value: node.value,
      routeCardCount: document.querySelectorAll(".leaderboard-chase-panel .official-route-row, .leaderboard-chase-panel .official-route-list, .leaderboard-route-menu").length,
      pageScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });
  assert(routeControlMetrics.height <= 44, "Route selector should not expand into vertical route text", { routeControlMetrics });
  assert(routeControlMetrics.width >= 220, "Route selector should keep enough width for horizontal names", { routeControlMetrics });
  assert(routeControlMetrics.whiteSpace === "nowrap", "Route selector should ellipsize instead of wrapping", { routeControlMetrics });
  assert(routeControlMetrics.routeCardCount === 0, "Route selector open state should not rely on route card markup", { routeControlMetrics });
  assert(routeControlMetrics.pageScrollWidth <= routeControlMetrics.viewportWidth + 1, "Leaderboard route selector should not create horizontal page scroll", { routeControlMetrics });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => window.neonRoadRally?.showLeaderboard("scoreAttack", {
    officialRouteId: "sunset-last-light-gauntlet",
    raceTypeId: "classic"
  }));
  await page.waitForFunction(
    () => window.neonRoadRally?.leaderboardOfficialRouteId === "sunset-last-light-gauntlet",
    null,
    { timeout: 5000 }
  );
  const narrowRouteMetrics = await page.$eval(".leaderboard-chase-panel", (panel) => {
    const routeSelect = panel.querySelector("#leaderboardRoute");
    const firstRow = panel.querySelector(".leaderboard-list .leaderboard-item");
    const style = routeSelect ? window.getComputedStyle(routeSelect) : null;
    return {
      pageScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      panelScrollWidth: panel.scrollWidth,
      panelClientWidth: panel.clientWidth,
      routeHeight: routeSelect?.getBoundingClientRect().height || 0,
      routeWhiteSpace: style?.whiteSpace || "",
      firstRowTop: firstRow?.getBoundingClientRect().top || 9999,
      routeCardCount: panel.querySelectorAll(".official-route-row, .official-route-card, .official-route-list, .leaderboard-route-menu").length
    };
  });
  assert(narrowRouteMetrics.pageScrollWidth <= narrowRouteMetrics.viewportWidth + 1, "Leaderboard should not horizontally scroll at narrower laptop width", { narrowRouteMetrics });
  assert(narrowRouteMetrics.panelScrollWidth <= narrowRouteMetrics.panelClientWidth + 1, "Leaderboard panel should not overflow at narrower laptop width", { narrowRouteMetrics });
  assert(narrowRouteMetrics.routeHeight <= 44, "Route selector should stay one-line at narrower laptop width", { narrowRouteMetrics });
  assert(narrowRouteMetrics.routeWhiteSpace === "nowrap", "Route selector should keep route names horizontal at narrower laptop width", { narrowRouteMetrics });
  assert(narrowRouteMetrics.routeCardCount === 0, "Narrow leaderboard should not reintroduce route card markup", { narrowRouteMetrics });
  assert(narrowRouteMetrics.firstRowTop < 700, "Leaderboard rows should remain in the first view at narrower laptop width", { narrowRouteMetrics });
  await clickAction(page, "raceOfficialRoute");
  await page.waitForFunction(() => window.neonRoadRally?.screen === "preRace", null, { timeout: 5000 });
  const raceTargetText = await bodyText(page);
  assertIncludes(raceTargetText, "Official Race");
  assertIncludes(raceTargetText, "Last Light Gauntlet");
  assertIncludes(raceTargetText, "Redline");
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate(() => window.neonRoadRally?.showLeaderboard("scoreAttack", {
    officialRouteId: "sunset-neon-palm-sprint",
    raceTypeId: "classic"
  }));
  await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
  const officialExtraDetailsCount = await page.locator(".leaderboard-extra-details summary").count();
  assert(officialExtraDetailsCount === 0, "Official Score Attack should not mix custom Playground records into extra details", { officialExtraDetailsCount });
  await page.evaluate(() => window.neonRoadRally?.showLeaderboard("playgroundScore", {
    trackId: "midnight-ridge",
    raceTypeId: "classic",
    speedClassId: "turbo",
    officialRouteId: ""
  }));
  await page.waitForFunction(() => window.neonRoadRally?.leaderboardView === "playgroundScore", null, { timeout: 5000 });
  text = await bodyText(page);
  assertIncludes(text, "Playground Records");
  assertIncludes(text, "CUSTOM-MIDNIGHT-RIDGE");
  assertIncludes(text, "Not official");

  await page.evaluate(() => window.neonRoadRally?.showLeaderboard("timeAttack", {
    officialRouteId: "sunset-neon-palm-sprint",
    raceTypeId: "classic"
  }));
  await page.waitForFunction(() => window.neonRoadRally?.leaderboardView === "timeAttack" && window.neonRoadRally?.leaderboardOfficialRouteId === "sunset-neon-palm-sprint", null, { timeout: 5000 });
  text = await bodyText(page);
  assertIncludes(text, "Time Attack");
  assertIncludes(text, "Fastest finish");
  assertIncludes(text, "Neon Palm Sprint");
  assertIncludes(text, "42.123s");
  assertNoNormalUiDebugTerms(text, "Time Attack board");
  const timeRowText = await page.locator(".leaderboard-list .leaderboard-item").first().innerText();
  assertIncludes(timeRowText, "42.123s");
  const timePrimaryValue = await page.locator(".leaderboard-list .leaderboard-item .arcade-primary-value strong").first().innerText();
  assert(timePrimaryValue === "42.123s", "Time Attack row should prioritize finish time", { timePrimaryValue });
  assert(!/Official Race/i.test(timeRowText), "Time Attack row should not repeat Official Race", { timeRowText });
  const lowerTimeText = text.toLowerCase();
  assert(!lowerTimeText.includes("sunset-palm-sprint-turbo"), "Main Time Attack board should hide raw official seeds");
  const timeExtraDetailsCount = await page.locator(".leaderboard-extra-details summary").count();
  assert(timeExtraDetailsCount === 0, "Official Time Attack should not mix custom Playground times into extra details", { timeExtraDetailsCount });
  await page.evaluate(() => window.neonRoadRally?.showLeaderboard("playgroundTime", {
    trackId: "sunset-highway",
    raceTypeId: "classic",
    speedClassId: "turbo",
    officialRouteId: ""
  }));
  await page.waitForFunction(() => window.neonRoadRally?.leaderboardView === "playgroundTime", null, { timeout: 5000 });
  text = await bodyText(page);
  assertIncludes(text, "Playground Time");
  assertIncludes(text, "CUSTOM-OFFICIAL-SMOKE");
  assertIncludes(text, "48.321s");

  await clickAction(page, "setLeaderboardView", '[data-view="enduranceSurvival"]');
  await page.waitForFunction(() => window.neonRoadRally?.leaderboardView === "enduranceSurvival", null, { timeout: 5000 });
  text = await bodyText(page);
  assertIncludes(text, "Survival");
  assertIncludes(text, "Longest survival");
  assertNoNormalUiDebugTerms(text, "Survival board");
  const survivalRowText = await page.locator(".leaderboard-list .leaderboard-item").first().innerText();
  assertIncludes(survivalRowText, "Lap 4");
  assertIncludes(survivalRowText, "Crash");
  const survivalPrimaryValue = await page.locator(".leaderboard-list .leaderboard-item .arcade-primary-value strong").first().innerText();
  assert(/^\d+:\d{2} survival$/.test(survivalPrimaryValue), "Survival row should prioritize compact survival time", { survivalPrimaryValue, survivalRowText });

  await clickAction(page, "setLeaderboardView", '[data-view="enduranceScore"]');
  await page.waitForFunction(() => window.neonRoadRally?.leaderboardView === "enduranceScore", null, { timeout: 5000 });
  text = await bodyText(page);
  assertIncludes(text, "Endurance Score");
  assertIncludes(text, "Best bonus score");
  assertNoNormalUiDebugTerms(text, "Endurance Score board");
  const enduranceScoreRowText = await page.locator(".leaderboard-list .leaderboard-item").first().innerText();
  assertIncludes(enduranceScoreRowText, "Lap 4");
  assertIncludes(enduranceScoreRowText, "Crash");
  const enduranceScorePrimaryValue = await page.locator(".leaderboard-list .leaderboard-item .arcade-primary-value strong").first().innerText();
  assert(/\d{2},\d{3}/.test(enduranceScorePrimaryValue), "Endurance Score row should prioritize bonus score", { enduranceScorePrimaryValue, enduranceScoreRowText });
}

async function assertNewTrackLeaderboards(page) {
  await page.evaluate(() => window.neonRoadRally?.showLeaderboard("timeAttack", { trackId: "midnight-ridge" }));
  await page.waitForFunction(() => window.neonRoadRally?.screen === "leaderboard", null, { timeout: 5000 });
  let text = await bodyText(page);
  assertIncludes(text, "Time Attack");
  assertIncludes(text, "Midnight Ridge");
  assertIncludes(text, "Ridge Lantern Sprint");

  await page.selectOption("#leaderboardTrack", "blackout-run");
  await page.dispatchEvent("#leaderboardTrack", "change");
  await page.waitForFunction(
    () => document.querySelector("#leaderboardTrack")?.value === "blackout-run"
      && document.body.innerText.includes("Headlight Mile"),
    null,
    { timeout: 5000 }
  );
  text = await bodyText(page);
  assertIncludes(text, "Blackout Run");
  assertIncludes(text, "Headlight Mile");

  await page.evaluate(() => window.neonRoadRally?.showLeaderboard("scoreAttack", { officialRouteId: "prism-pinkline-sprint" }));
  await page.waitForFunction(() => window.neonRoadRally?.leaderboardView === "scoreAttack", null, { timeout: 5000 });
  text = await bodyText(page);
  assertIncludes(text, "Score Attack");
  assertIncludes(text, "Prism Highway");
  assertIncludes(text, "Pinkline Sprint");
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
    await assertNormalTrackCards(page);
    for (const track of NORMAL_TRACKS) {
      await assertTrackOfficial10(page, track.id, track.name);
    }

    await selectTrack(page, "sunset-highway");
    await assertOfficialLaunchState(page, "sunset-neon-palm-sprint");
    await assertOfficialLaunchState(page, "sunset-orange-sky-switchback");
    await assertPracticeOverridesOfficialLaunch(page, "sunset-neon-palm-sprint", "turbo");
    await assertPracticeOverridesOfficialLaunch(page, "sunset-orange-sky-switchback", "overdrive");
    await assertOfficialSetupLayoutIntegrity(page, "Sunset setup after launch-context toggles");
    const telemetrySamples = [];
    for (let index = 0; index < OFFICIAL_SCENARIOS.length; index += 1) {
      telemetrySamples.push(await runOfficialScenario(page, OFFICIAL_SCENARIOS[index], { returnToSetup: index < OFFICIAL_SCENARIOS.length - 1 }));
    }
    await assertOfficialTimeBoard(page);
    telemetrySamples.push(await runCustomScenario(page, { trackId: "midnight-ridge", seed: "CUSTOM-MIDNIGHT-RIDGE", returnToSetup: true }));
    telemetrySamples.push(await runCustomScenario(page, { trackId: "blackout-run", seed: "CUSTOM-BLACKOUT-RUN", returnToSetup: true }));
    telemetrySamples.push(await runCustomScenario(page, { trackId: "prism-highway", seed: "CUSTOM-PRISM-HIGHWAY", returnToSetup: true }));
    telemetrySamples.push(await runCustomScenario(page));
    await assertLeaderboards(page);
    await assertNewTrackLeaderboards(page);

    const playtestRouteTelemetry = await page.evaluate(() => {
      const runs = window.neonRoadRally?.playtestReports?.getRuns?.() || [];
      return runs
        .filter((run) => run.officialRouteId)
        .map((run) => ({
          route: run.officialRouteName || run.officialRouteId,
          signatureHash: run.routeSignatureHash || "",
          runProgressSignatureHash: run.runProgressSignatureHash || run.routeSignatureHash || "",
          officialFullRouteSignatureHash: run.officialFullRouteSignatureHash || "",
          routeSeedLocked: Boolean(run.routeSeedLocked),
          averageFps: Number((run.averageFps || 0).toFixed(1)),
          worstFrameMs: Number((run.worstFrameMs || 0).toFixed(1)),
          renderEffectScaleMin: Number((run.renderEffectScaleMin || 1).toFixed(2))
        }));
    });
    assert(
      playtestRouteTelemetry.some((run) => run.route === "Neon Palm Sprint" && run.officialFullRouteSignatureHash && run.runProgressSignatureHash && run.routeSeedLocked),
      "Playtest Report should distinguish full official route signatures from run-progress signatures",
      { playtestRouteTelemetry }
    );

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
