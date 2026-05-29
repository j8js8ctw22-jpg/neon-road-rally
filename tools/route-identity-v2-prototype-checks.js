#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(repoRoot, "game.js"), "utf8");
const storage = new Map();
const startedAt = Date.now();

const context = vm.createContext({
  assert,
  console,
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  },
  window: { addEventListener: () => {} },
  document: {},
  navigator: {},
  performance: { now: () => Date.now() - startedAt },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  setTimeout,
  clearTimeout
});

vm.runInContext(source, context, { filename: "game.js" });

const result = vm.runInContext(`
(() => {
  const app = Object.create(NeonRoadRally.prototype);
  const allRoadConditionFlags = { enabled: true };
  const allRecklessFlags = { enabled: true };
  const sampleRouteId = "prism-hot-pink-redline";
  const defaultCapture = app.captureRouteIdentityV2Prototype({ officialRouteId: sampleRouteId });

  assert.strictEqual(defaultCapture.debugOnly, true, "Route Identity V2 capture should be marked debug-only");
  assert.strictEqual(defaultCapture.shippingEnabled, false, "Route Identity V2 capture should remain non-shipping");
  assert.strictEqual(defaultCapture.affectsRouteSignature, false, "Route Identity V2 capture should not affect route signatures");
  assert.strictEqual(defaultCapture.roadConditionsV2.zones.length, 0, "Road Conditions V2 should be default-off");
  assert.strictEqual(defaultCapture.recklessDriversV2.events.length, 0, "Reckless Drivers V2 should be default-off");

  for (const type of Object.values(ROAD_CONDITION_V2_TYPES)) {
    const flags = { [type]: true };
    const capture = app.captureRouteIdentityV2Prototype({
      officialRouteId: sampleRouteId,
      roadConditionsV2: flags
    });
    assert.strictEqual(capture.roadConditionsV2.zones.length, 1, type + " should be individually enabled");
    assert.strictEqual(capture.roadConditionsV2.zones[0].type, type, type + " should be the only road condition zone");
    assert.strictEqual(capture.recklessDriversV2.events.length, 0, type + " should not enable reckless V2");
  }

  for (const behavior of Object.values(RECKLESS_DRIVER_V2_BEHAVIORS)) {
    const flags = { [behavior]: true };
    const capture = app.captureRouteIdentityV2Prototype({
      officialRouteId: sampleRouteId,
      recklessDriversV2: flags
    });
    assert.strictEqual(capture.recklessDriversV2.events.length, 1, behavior + " should be individually enabled");
    assert.strictEqual(capture.recklessDriversV2.events[0].behavior, behavior, behavior + " should be the only reckless V2 event");
    assert.strictEqual(capture.roadConditionsV2.zones.length, 0, behavior + " should not enable road conditions V2");
  }

  const routeRows = app.getRouteIdentityV2ReportRows();
  assert.strictEqual(routeRows.length, OFFICIAL_ROUTES.length, "Route identity report rows should cover every official route");
  assert.strictEqual(OFFICIAL_ROUTES.length, 50, "Official route roster should remain 50 base routes");

  const routeCaptures = OFFICIAL_ROUTES.map((route) => app.captureRouteIdentityV2Prototype({
    officialRouteId: route.id,
    roadConditionsV2: allRoadConditionFlags,
    recklessDriversV2: allRecklessFlags
  }));
  const routeRepeats = OFFICIAL_ROUTES.map((route) => app.captureRouteIdentityV2Prototype({
    officialRouteId: route.id,
    roadConditionsV2: allRoadConditionFlags,
    recklessDriversV2: allRecklessFlags
  }));
  assert.deepStrictEqual(routeCaptures, routeRepeats, "Route Identity V2 plans should be deterministic across every official route");

  const allZones = routeCaptures.flatMap((capture) => capture.roadConditionsV2.zones);
  const allEvents = routeCaptures.flatMap((capture) => capture.recklessDriversV2.events);
  assert.strictEqual(routeCaptures.every((capture) => capture.roadConditionsV2.zones.length === 5), true, "All road condition flags should produce five prototype zones per route");
  assert.strictEqual(routeCaptures.every((capture) => capture.recklessDriversV2.events.length === 5), true, "All reckless V2 flags should produce five prototype events per route");

  for (const zone of allZones) {
    assert.strictEqual(zone.debugOnly, true, zone.type + " should be debug-only");
    assert.strictEqual(zone.shippingEnabled, false, zone.type + " should be non-shipping");
    assert.strictEqual(zone.affectsRouteSignature, false, zone.type + " should not affect route signatures");
    assert(zone.closedLanes.length >= 1, zone.type + " should close at least one lane");
    assert(zone.closedLanes.length < LANES, zone.type + " should never close the whole road");
    assert(zone.safeLaneCount >= 4, zone.type + " should preserve at least four safe lanes in prototype form");
    assert(zone.warningSeconds >= 1.85, zone.type + " should preserve Redline-readable warning time");
    assert(zone.distance >= 3600, zone.type + " should be a zone, not a blocker pile");
    assert(zone.sustainedDistance > 0, zone.type + " should include sustained closure space");
    assert.strictEqual(zone.fairness.noHiddenCollision, true, zone.type + " should avoid hidden collisions");
    assert.strictEqual(zone.fairness.plannerOnlyNoLiveOverlap, true, zone.type + " should remain planner-only");
  }

  const zoneTypes = new Set(allZones.map((zone) => zone.type));
  for (const type of Object.values(ROAD_CONDITION_V2_TYPES)) {
    assert(zoneTypes.has(type), "Road Conditions V2 should include " + type);
  }

  for (const event of allEvents) {
    assert.strictEqual(event.debugOnly, true, event.behavior + " should be debug-only");
    assert.strictEqual(event.shippingEnabled, false, event.behavior + " should be non-shipping");
    assert.strictEqual(event.affectsRouteSignature, false, event.behavior + " should not affect route signatures");
    assert.strictEqual(event.hitboxFollowsVisual, true, event.behavior + " should keep hitbox and visual intent coherent");
    assert.strictEqual(event.noHiddenCollision, true, event.behavior + " should avoid hidden collisions");
    assert(event.telegraphSeconds >= 1.1, event.behavior + " should be telegraphed");
    assert(event.safety.escapeLaneCount >= 4, event.behavior + " should preserve escape lanes in prototype form");
    assert(Math.abs(event.laneDelta) <= event.laneDeltaMax, event.behavior + " should respect its lane delta limit");
    if (event.behavior === RECKLESS_DRIVER_V2_BEHAVIORS.multiLaneCut) {
      assert.strictEqual(Math.abs(event.laneDelta), 2, "Multi-Lane Cut should prototype a two-lane cut");
      assert.strictEqual(event.rare, true, "Multi-Lane Cut should be marked rare");
      assert(event.telegraphSeconds >= 1.6, "Multi-Lane Cut should use extra telegraph time");
      assert.strictEqual(event.safety.multiLaneExtraTelegraph, true, "Multi-Lane Cut should pass extra telegraph safety");
    }
    if (event.behavior === RECKLESS_DRIVER_V2_BEHAVIORS.panicBrake) {
      assert.strictEqual(event.laneDelta, 0, "Panic Brake should be a slowdown reaction, not a lane cut");
    }
  }

  const behaviorTypes = new Set(allEvents.map((event) => event.behavior));
  for (const behavior of Object.values(RECKLESS_DRIVER_V2_BEHAVIORS)) {
    assert(behaviorTypes.has(behavior), "Reckless Drivers V2 should include " + behavior);
  }

  const signatureRouteIds = [
    "sunset-mirage-merge",
    "redline-finale",
    "midnight-no-return-pass",
    "blackout-no-moon-finale",
    "prism-hot-pink-redline"
  ];
  const signatureRows = signatureRouteIds.map((routeId) => {
    app.officialFullRouteSignatureCache = new Map();
    const before = app.getOfficialFullRouteSignature(routeId, DEFAULT_RACE_TYPE_ID);
    app.captureRouteIdentityV2Prototype({
      officialRouteId: routeId,
      roadConditionsV2: allRoadConditionFlags,
      recklessDriversV2: allRecklessFlags
    });
    app.officialFullRouteSignatureCache = new Map();
    const after = app.getOfficialFullRouteSignature(routeId, DEFAULT_RACE_TYPE_ID);
    assert.strictEqual(before.hash, after.hash, routeId + " signature should be unchanged by V2 debug prototype planning");
    assert.strictEqual(before.waveCount, after.waveCount, routeId + " signature wave count should be unchanged by V2 debug prototype planning");
    return {
      routeId,
      hash: before.hash,
      waveCount: before.waveCount
    };
  });

  const recommendationConditions = new Set(routeRows.map((row) => row.roadConditionType));
  const recommendationBehaviors = new Set(routeRows.map((row) => row.recklessBehavior));
  for (const type of Object.values(ROAD_CONDITION_V2_TYPES)) {
    assert(recommendationConditions.has(type), "Route recommendations should use " + type);
  }
  for (const behavior of Object.values(RECKLESS_DRIVER_V2_BEHAVIORS)) {
    assert(recommendationBehaviors.has(behavior), "Route recommendations should use " + behavior);
  }

  globalThis.__routeIdentityV2PrototypeCheckResult = {
    version: ROUTE_IDENTITY_V2_PROTOTYPE_VERSION,
    officialRouteCount: OFFICIAL_ROUTES.length,
    routeNames: OFFICIAL_ROUTES.map((route) => route.name),
    defaultRoadConditionZones: defaultCapture.roadConditionsV2.zones.length,
    defaultRecklessEvents: defaultCapture.recklessDriversV2.events.length,
    sampleMetrics: routeCaptures.find((capture) => capture.routeId === sampleRouteId).metrics,
    roadConditionTypes: Array.from(zoneTypes),
    recklessBehaviors: Array.from(behaviorTypes),
    recommendationConditionTypes: Array.from(recommendationConditions),
    recommendationBehaviors: Array.from(recommendationBehaviors),
    signatureRows
  };
  return globalThis.__routeIdentityV2PrototypeCheckResult;
})()
`, context, { filename: "route-identity-v2-prototype-checks.vm.js" });

const reportPath = path.join(repoRoot, "docs", "route-identity-v2.md");
assert(fs.existsSync(reportPath), "docs/route-identity-v2.md should exist");
const report = fs.readFileSync(reportPath, "utf8");
for (const routeName of result.routeNames) {
  assert(report.includes("### " + routeName), "Route identity report should include " + routeName);
}

console.log(JSON.stringify({
  status: "ok",
  elapsedMs: Date.now() - startedAt,
  ...result
}, null, 2));
