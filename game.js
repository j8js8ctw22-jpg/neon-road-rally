"use strict";

/*
  Neon Road Rally
  A local-only 80s lane-dodging arcade racer.
  No libraries, no server, no external assets required.
*/

// ---------------------------------------------------------------------------
// Constants and helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "neonRoadRally.v1";
const LOCAL_PLAYER_NAME_MAX_LENGTH = 20;
const LOCAL_CAR_NAME_MAX_LENGTH = 24;
const ROAD_SEED_MAX_LENGTH = 32;
const DISPLAY_TEXT_MAX_LENGTH = 48;
const STORAGE_ID_MAX_LENGTH = 64;
const LOCAL_PLAYER_MAX_COUNT = 16;
const LEADERBOARD_MAX_ENTRIES = 20;
const LEADERBOARD_IMPORT_SCAN_LIMIT = 200;
const MAX_DISPLAY_SCORE = 999999999;
const LANES = 5;
const VIEW_DISTANCE = 1700;
const PLAYER_START_Y_RATIO = 0.82;
const PLAYER_MIN_Y_RATIO = 0.6;
const PLAYER_MAX_Y_RATIO = 0.84;
const DANGER_ZONE_TOP_RATIO = 0.5;
const DANGER_ZONE_BOTTOM_RATIO = 0.95;
const DANGER_ZONE_SLICE_PX = 32;
const FOUR_LANE_PRESSURE_COOLDOWN = 9000;
const DEFAULT_SPEED_CLASS_ID = "arcade";
const DEFAULT_RACE_TYPE_ID = "classic";
const FUEL_RUN_RACE_TYPE_ID = "fuelRun";
const ROAD_SEED_PREFIXES = ["SUNSET", "TURBO", "ROAD", "NEON", "RALLY", "LANE", "BOOST"];
const DEFAULT_ROAD_SEED = "ROAD-52819";
const CLASSIC_SEED_LABEL = "Classic";
const PARTY_MIN_PLAYERS = 2;
const PARTY_MAX_PLAYERS = 8;
const PARTY_ROUND_TYPE_ONE_RUN = "oneRunEach";
const TRACKS = [
  {
    id: "sunset-highway",
    name: "Sunset Highway",
    music: "audio/sunset-highway.mp3",
    targetDurationSeconds: 115,
    sections: [
      {
        id: "launch",
        label: "Launch",
        startProgress: 0,
        endProgress: 0.15,
        pressureMultiplier: 0.85,
        visualIntensity: 0.8,
        cadenceMultiplier: 1.08,
        recoveryGapMultiplier: 1.05,
        forceMeaningfulMultiplier: 1.18,
        waveWeightMultipliers: {
          singleBlocker: 1.35,
          doubleGate: 0.82,
          offsetPair: 0.62,
          centerBlock: 0.46,
          leftRightSweep: 0.45,
          constructionSqueeze: 0.16,
          deerCrossing: 0,
          rampEscape: 0.9,
          boostTemptation: 1.18,
          nearMissCorridor: 0,
          fourLaneSpike: 0,
          recoveryGap: 0.95
        }
      },
      {
        id: "groove",
        label: "Groove",
        startProgress: 0.15,
        endProgress: 0.4,
        pressureMultiplier: 1,
        visualIntensity: 1,
        cadenceMultiplier: 1,
        recoveryGapMultiplier: 1,
        forceMeaningfulMultiplier: 1,
        waveWeightMultipliers: {
          singleBlocker: 0.95,
          doubleGate: 1.12,
          offsetPair: 1.05,
          centerBlock: 0.92,
          leftRightSweep: 0.95,
          constructionSqueeze: 0.86,
          deerCrossing: 0.78,
          rampEscape: 1,
          boostTemptation: 1.08,
          nearMissCorridor: 0.72,
          fourLaneSpike: 0,
          recoveryGap: 1
        }
      },
      {
        id: "pressure",
        label: "Pressure",
        startProgress: 0.4,
        endProgress: 0.65,
        pressureMultiplier: 1.18,
        visualIntensity: 1.15,
        cadenceMultiplier: 0.94,
        recoveryGapMultiplier: 0.9,
        forceMeaningfulMultiplier: 0.86,
        waveWeightMultipliers: {
          singleBlocker: 0.7,
          doubleGate: 0.96,
          offsetPair: 1.22,
          centerBlock: 1.26,
          leftRightSweep: 1.16,
          constructionSqueeze: 1.34,
          deerCrossing: 1.22,
          rampEscape: 0.92,
          boostTemptation: 0.78,
          nearMissCorridor: 1.36,
          fourLaneSpike: 0.55,
          recoveryGap: 0.72
        }
      },
      {
        id: "breather",
        label: "Breather",
        startProgress: 0.65,
        endProgress: 0.75,
        pressureMultiplier: 0.66,
        visualIntensity: 0.9,
        cadenceMultiplier: 1.14,
        recoveryGapMultiplier: 0.95,
        forceMeaningfulMultiplier: 1.14,
        waveWeightMultipliers: {
          singleBlocker: 1.12,
          doubleGate: 0.62,
          offsetPair: 0.52,
          centerBlock: 0.32,
          leftRightSweep: 0.48,
          constructionSqueeze: 0.28,
          deerCrossing: 0.42,
          rampEscape: 1.8,
          boostTemptation: 1.65,
          nearMissCorridor: 0.18,
          fourLaneSpike: 0,
          recoveryGap: 1.55
        }
      },
      {
        id: "finalPush",
        label: "Final Push",
        startProgress: 0.75,
        endProgress: 1,
        pressureMultiplier: 1.35,
        visualIntensity: 1.35,
        cadenceMultiplier: 0.84,
        recoveryGapMultiplier: 0.72,
        forceMeaningfulMultiplier: 0.72,
        waveWeightMultipliers: {
          singleBlocker: 0.5,
          doubleGate: 0.8,
          offsetPair: 1.18,
          centerBlock: 1.28,
          leftRightSweep: 1.32,
          constructionSqueeze: 1.42,
          deerCrossing: 1.12,
          rampEscape: 1.05,
          boostTemptation: 0.72,
          nearMissCorridor: 1.62,
          fourLaneSpike: 1.9,
          recoveryGap: 0.58
        }
      }
    ],
    distanceToFinish: 155000,
    baseSpeed: 1000,
    maxSpeed: 3000,
    speedCurveType: "smoothstep",
    startSpeedMultiplier: 1,
    earlySpeedMultiplier: 1.15,
    midSpeedMultiplier: 1.45,
    lateSpeedMultiplier: 1.75,
    endSpeedMultiplier: 2,
    obstacleSettings: {
      earlySpacing: 980,
      lateSpacing: 520,
      earlySpacingSeconds: 3.05,
      midSpacingSeconds: 1.95,
      lateSpacingSeconds: 1.22,
      spacingRandomSecondsEarly: 0.7,
      spacingRandomSecondsLate: 0.25,
      spawnLeadSeconds: 7.2,
      firstObstacleAt: 1700,
      warningLead: 520,
      warningLeadSeconds: 2.75
    },
    difficultyCurve(progress) {
      return Math.min(1, Math.max(0, Math.pow(progress, 0.82)));
    }
  }
];

const SPEED_CLASSES = [
  { id: "sunday", label: "Sunday Drive", startSpeed: 700, endSpeed: 1100, scoreMultiplier: 0.75 },
  { id: "rookie", label: "Rookie", startSpeed: 850, endSpeed: 1350, scoreMultiplier: 0.9 },
  { id: "arcade", label: "Arcade", startSpeed: 1000, endSpeed: 1700, scoreMultiplier: 1 },
  { id: "pro", label: "Pro", startSpeed: 1250, endSpeed: 2100, scoreMultiplier: 1.2 },
  { id: "turbo", label: "Turbo", startSpeed: 1500, endSpeed: 2600, scoreMultiplier: 1.4 }
];

const RACE_TYPES = [
  {
    id: DEFAULT_RACE_TYPE_ID,
    label: "Classic",
    shortLabel: "Classic",
    description: "Full Sunset Highway Road Director mix."
  },
  {
    id: FUEL_RUN_RACE_TYPE_ID,
    label: "Fuel Run",
    shortLabel: "Fuel",
    description: "Traffic gates, gas can routing, and fuel survival."
  }
];

const FUEL_RUN_CONFIG = {
  fuelMax: 100,
  fuelDrainPerSecond: {
    sunday: 0.7,
    rookie: 0.85,
    arcade: 1,
    pro: 1.18,
    turbo: 1.35
  },
  gasCanRestoreAmount: {
    sunday: 24,
    rookie: 24,
    arcade: 24,
    pro: 22,
    turbo: 20
  },
  lowFuelThreshold: 30,
  criticalFuelThreshold: 12,
  gasCanScore: 500,
  fuelPointFinishBonus: 40,
  warningCooldownSeconds: 4,
  criticalWarningCooldownSeconds: 2.6,
  initialGasGraceSeconds: 10,
  minGasGapSeconds: {
    sunday: 11,
    rookie: 10,
    arcade: 9,
    pro: 8,
    turbo: 7
  },
  targetGasGapSeconds: {
    sunday: 22,
    rookie: 20,
    arcade: 17,
    pro: 15,
    turbo: 13
  },
  maxGasGapSeconds: {
    sunday: 32,
    rookie: 29,
    arcade: 25,
    pro: 22,
    turbo: 19
  }
};

const CHALLENGE_SAVE_VERSION = 1;
const CHALLENGES = [
  {
    id: "first-run",
    name: "First Run",
    description: "An approachable Sunset Highway finish.",
    trackId: "sunset-highway",
    raceType: "classic",
    raceMode: "rookie",
    seed: "FIRST-RUN",
    objective: { type: "finish", label: "Finish the race" },
    purpose: "Approachable onboarding challenge"
  },
  {
    id: "turbo-dare",
    name: "Turbo Dare",
    description: "Survive Sunset Highway at party-speed intensity.",
    trackId: "sunset-highway",
    raceType: "classic",
    raceMode: "turbo",
    seed: "TURBO-DARE",
    objective: { type: "finish", label: "Finish the race" },
    purpose: "Intense adult/party-style challenge"
  },
  {
    id: "clean-line",
    name: "Clean Line",
    description: "Hold a precise Arcade line without slowdown hits.",
    trackId: "sunset-highway",
    raceType: "classic",
    raceMode: "arcade",
    seed: "CLEAN-LINE",
    objective: { type: "noSlowdownHits", label: "Finish with no slowdown hits" },
    purpose: "Precision challenge"
  },
  {
    id: "boost-hunter",
    name: "Boost Hunter",
    description: "Spend every manual boost and still reach the finish.",
    trackId: "sunset-highway",
    raceType: "classic",
    raceMode: "pro",
    seed: "BOOST-HUNTER",
    objective: { type: "useAllManualBoosts", label: "Finish and use all manual boosts", target: 3 },
    purpose: "Risk/reward boost challenge"
  },
  {
    id: "near-miss-run",
    name: "Near-Miss Run",
    description: "Push the scoring lane and bank five close calls.",
    trackId: "sunset-highway",
    raceType: "classic",
    raceMode: "pro",
    seed: "NEAR-MISS",
    objective: { type: "nearMisses", label: "Earn at least 5 near-miss bonuses", target: 5 },
    purpose: "Advanced scoring challenge"
  }
];

const SPEED_TUNING = {
  minSpeed: 250,
  manualBoostMultiplier: 1.24,
  padBoostMultiplier: 1.13,
  manualBoostDuration: 2.25,
  padBoostDuration: 1.05,
  maxBoostOverrunMultiplier: 1.18,
  roadStripeScrollScale: 0.82
};

const ARCADE_FEEL = {
  enabled: true,
  countdownSeconds: 3.55,
  countdownGoSeconds: 0.55,
  crashScoreDelayMs: 950,
  finishScoreDelayMs: 760,
  screenShakeDecay: 2.6,
  crashShake: 1,
  bumpShake: 0.28,
  bumpFlashSeconds: 0.24,
  boostBurstSeconds: 0.36,
  finishFlashSeconds: 0.9,
  floatingTextSeconds: 1.15,
  scoreTallyMs: 950,
  highSpeedLineStartRatio: 0.45
};

const INPUT_CONFIG = {
  laneChangeDurationSeconds: 0.1,
  verticalMoveRatioPerSecond: 0.58,
  inputFlashSeconds: 0.12
};

const TRACK_VISUALS = {
  roadDetailIntensity: 0.48,
  sceneryDensity: 1,
  speedStreakIntensity: 0.72,
  horizonGlowStrength: 0.85,
  roadsideSignFrequency: 0.28,
  asphaltBandSpacing: 118,
  roadSeamSpacing: 76,
  edgeLightSpacing: 86,
  reflectorSpacing: 172,
  scenerySpacing: 260,
  finalStretchStart: 0.78,
  bottomCarMargin: 18
};

const ROAD_DIRECTOR = {
  centerLane: 2,
  centerHoldSeconds: 4.2,
  centerSafeSecondsLimit: 5.5,
  laneSafeSecondsLimit: 12,
  fourLaneMinProgress: 0.8,
  hardWaveRecoveryChance: 0.18,
  modeCadence: {
    sunday: { early: 3.35, mid: 2.9, late: 2.42, randomEarly: 0.48, randomLate: 0.2, spacingScale: 1.14, recoveryScale: 1.35, centerSafe: 10, laneStill: 5.6, forceMeaningful: 4.6 },
    rookie: { early: 2.75, mid: 2.2, late: 1.75, randomEarly: 0.36, randomLate: 0.15, spacingScale: 1.02, recoveryScale: 1.05, centerSafe: 8, laneStill: 4.4, forceMeaningful: 3.55 },
    arcade: { early: 1.96, mid: 1.5, late: 1.1, randomEarly: 0.2, randomLate: 0.085, spacingScale: 0.82, recoveryScale: 0.66, centerSafe: 5.5, centerHold: 3.5, laneStill: 2.9, forceMeaningful: 2.35 },
    pro: { early: 1.52, mid: 1.14, late: 0.88, randomEarly: 0.13, randomLate: 0.055, spacingScale: 0.66, recoveryScale: 0.45, centerSafe: 3.35, centerHold: 2.45, laneStill: 1.95, forceMeaningful: 1.55 },
    turbo: { early: 1.12, mid: 0.86, late: 0.66, randomEarly: 0.09, randomLate: 0.04, spacingScale: 0.62, recoveryScale: 0.42, centerSafe: 2.25, centerHold: 1.9, laneStill: 1.4, forceMeaningful: 1.15 }
  },
  centerChallengeMinSeconds: {
    sunday: 8,
    rookie: 6.8,
    arcade: 4.2,
    pro: 2.35,
    turbo: 1.65
  },
  centerSoftPressure: {
    sunday: 0.1,
    rookie: 0.14,
    arcade: 0.42,
    pro: 0.75,
    turbo: 1
  },
  centerRestChance: {
    sunday: 0.72,
    rookie: 0.64,
    arcade: 0.32,
    pro: 0.1,
    turbo: 0.02
  },
  pressureBudgetAllowance: {
    sunday: 2.6,
    rookie: 2.6,
    arcade: 2.6,
    pro: 2.6,
    turbo: 2.6
  },
  pressureValues: {
    cone: 0.45,
    branch: 0.4,
    oil: 0.65,
    deer: 1.1,
    slowCar: 1.2,
    fastCar: 1.35,
    truck: 1.8,
    barrier: 1.7,
    ramp: -0.8,
    boostPad: -0.45,
    gasCan: 0
  },
  modeIntensity: {
    sunday: 0.95,
    rookie: 1.05,
    arcade: 1.32,
    pro: 1.85,
    turbo: 2.45
  }
};

const TRACK_DIRECTOR = ROAD_DIRECTOR;

const TRACK_DIRECTOR_BANDS = [
  {
    id: "opening",
    label: "Opening",
    min: 0,
    max: 0.2,
    budget: [1.1, 2.15],
    weights: {
      singleBlocker: 3.6,
      doubleGate: 1,
      offsetPair: 0.45,
      centerBlock: 0.35,
      boostTemptation: 0.9,
      recoveryGap: 0.42
    }
  },
  {
    id: "earlyMid",
    label: "Early-Mid",
    min: 0.2,
    max: 0.45,
    budget: [2.15, 3.35],
    weights: {
      doubleGate: 2.6,
      offsetPair: 1.55,
      centerBlock: 0.85,
      leftRightSweep: 1.2,
      constructionSqueeze: 1.15,
      boostTemptation: 0.85,
      rampEscape: 0.8,
      deerCrossing: 0.55,
      recoveryGap: 0.22
    }
  },
  {
    id: "lateMid",
    label: "Late-Mid",
    min: 0.45,
    max: 0.75,
    budget: [2.85, 4.2],
    weights: {
      doubleGate: 1.85,
      offsetPair: 1.9,
      centerBlock: 1.05,
      leftRightSweep: 1.75,
      constructionSqueeze: 1.75,
      deerCrossing: 1,
      rampEscape: 1.05,
      boostTemptation: 0.65,
      nearMissCorridor: 1.35,
      recoveryGap: 0.18
    }
  },
  {
    id: "final",
    label: "Final",
    min: 0.75,
    max: 1,
    budget: [3.25, 4.85],
    weights: {
      doubleGate: 1.45,
      offsetPair: 1.6,
      centerBlock: 1.05,
      leftRightSweep: 1.85,
      constructionSqueeze: 2.05,
      deerCrossing: 1.15,
      rampEscape: 1.25,
      boostTemptation: 0.42,
      nearMissCorridor: 2.1,
      fourLaneSpike: 0.18,
      recoveryGap: 0.14
    }
  }
];

const DEFAULT_CAR = {
  name: "Neon Runner",
  bodyColor: "#ff3fd1",
  stripeColor: "#28f6ff",
  windowColor: "#9ff7ff",
  bodyStyle: "wedge",
  useSprite: true
};

const CAR_BODY_STYLES = [
  { id: "wedge", name: "Wedge Racer", sprite: "assets/cars/wedge-racer.png" },
  { id: "muscle", name: "Muscle Coupe", sprite: "assets/cars/muscle-coupe.png" },
  { id: "formula", name: "Tiny Formula", sprite: "assets/cars/tiny-formula.png" }
];

const TRAFFIC_SPRITE_ASSETS = {
  slowCar: [
    { id: "slow-car-1", path: "assets/traffic/slow-car-1.png" },
    { id: "slow-car-2", path: "assets/traffic/slow-car-2.png" }
  ],
  fastCar: [
    { id: "fast-car-1", path: "assets/traffic/fast-car-1.png" },
    { id: "fast-car-2", path: "assets/traffic/fast-car-2.png" }
  ],
  truck: [
    { id: "truck-1", path: "assets/traffic/truck-1.png" },
    { id: "truck-2", path: "assets/traffic/truck-2.png" }
  ],
  barrier: []
};

const PLAYER_CANVAS_WIDTH = 76;
const PLAYER_CANVAS_HEIGHT = 118;
const VEHICLE_SCALE_CONFIG = {
  playerSprite: {
    widthRatio: 0.5,
    minWidth: 95,
    maxWidth: 130,
    laneMaxRatio: 0.74,
    previewScale: 1.35,
    styleWidthScale: {
      wedge: 1,
      muscle: 1.06,
      formula: 0.9
    }
  },
  playerCanvas: {
    widthRatio: 0.5,
    minWidth: 90,
    maxWidth: 125,
    laneMaxRatio: 0.72,
    previewScale: 1.35
  },
  slowCar: { widthRatio: 0.56, minWidth: 95, maxWidth: 140, laneMaxRatio: 0.74 },
  fastCar: { widthRatio: 0.54, minWidth: 92, maxWidth: 135, laneMaxRatio: 0.72 },
  truck: { widthRatio: 0.68, minWidth: 110, maxWidth: 165, laneMaxRatio: 0.88 },
  barrier: { widthRatio: 0.62, minWidth: 100, maxWidth: 155, laneMaxRatio: 0.82 }
};
const SPRITE_OPAQUE_ALPHA_THRESHOLD = 16;
const PLAYER_AIRBORNE_SCALE = 1.06;
const MIN_COLLISION_OVERLAP_PX = 4;
const HARD_VEHICLE_COLLISION_OVERLAP_PX = 2;
const NEAR_MISS_ZONE_EXPANSION_PX = 26;

const HITBOX_CONFIG = {
  player: { width: 0.66, height: 0.74, offsetX: 0, offsetY: 0.02 },
  slowCar: { width: 0.8, height: 0.84, offsetX: 0, offsetY: 0 },
  fastCar: { width: 0.78, height: 0.82, offsetX: 0, offsetY: 0 },
  truck: { width: 0.86, height: 0.88, offsetX: 0, offsetY: 0 },
  barrier: { width: 0.86, height: 0.84, offsetX: 0, offsetY: 0 },
  cone: { width: 0.55, height: 0.6, offsetX: 0, offsetY: 0 },
  oil: { width: 0.7, height: 0.45, offsetX: 0, offsetY: 0 },
  deer: { width: 0.6, height: 0.65, offsetX: 0, offsetY: 0 },
  ramp: { width: 0.75, height: 0.65, offsetX: 0, offsetY: 0 },
  boostPad: { width: 0.75, height: 0.55, offsetX: 0, offsetY: 0 },
  gasCan: { width: 0.58, height: 0.62, offsetX: 0, offsetY: 0, minOverlapPx: 4 },
  branch: { width: 0.66, height: 0.5, offsetX: 0, offsetY: 0 }
};

const HARD_VEHICLE_TYPES = new Set(["slowCar", "fastCar", "truck", "barrier"]);

const OBSTACLE_INFO = {
  slowCar: { label: "Slow Car", tall: true, crash: true, w: 62, h: 104 },
  fastCar: { label: "Fast Car", tall: true, crash: true, w: 62, h: 104 },
  truck: { label: "Truck", tall: true, crash: true, w: 78, h: 142 },
  deer: { label: "Deer", tall: false, crash: false, w: 72, h: 58 },
  cone: { label: "Cone", tall: false, crash: false, w: 42, h: 54 },
  oil: { label: "Oil", tall: false, crash: false, w: 70, h: 42 },
  ramp: { label: "Ramp", tall: false, crash: false, w: 80, h: 58 },
  barrier: { label: "Barrier", tall: true, crash: true, w: 84, h: 70 },
  boostPad: { label: "Boost Pad", tall: false, crash: false, w: 82, h: 48 },
  gasCan: { label: "Gas Can", tall: false, crash: false, w: 54, h: 64 },
  branch: { label: "Branch", tall: false, crash: false, w: 68, h: 34 },
  warning: { label: "Warning", tall: false, crash: false, w: 70, h: 78 }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return clamp(number, min, max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  const value = clamp(t, 0, 1);
  return value * value * (3 - 2 * value);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeCurveValue(t, curveType = "smoothstep") {
  if (curveType === "linear") return clamp(t, 0, 1);
  if (curveType === "easeOutCubic") return easeOutCubic(clamp(t, 0, 1));
  return smoothstep(t);
}

function sampleProgressCurve(points, progress, curveType = "smoothstep") {
  const safeProgress = clamp(progress, 0, 1);
  const sorted = points.slice().sort((a, b) => a.progress - b.progress);
  if (!sorted.length) return 1;
  if (safeProgress <= sorted[0].progress) return sorted[0].value;
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const next = sorted[i];
    if (safeProgress <= next.progress) {
      const span = Math.max(0.0001, next.progress - previous.progress);
      const t = easeCurveValue((safeProgress - previous.progress) / span, curveType);
      return lerp(previous.value, next.value, t);
    }
  }
  return sorted[sorted.length - 1].value;
}

function normalizeSpeedClassId(value, fallback = DEFAULT_SPEED_CLASS_ID) {
  const id = String(value || "").trim().toLowerCase();
  return SPEED_CLASSES.some((speedClass) => speedClass.id === id) ? id : fallback;
}

function getSpeedClassConfig(value) {
  const id = normalizeSpeedClassId(value);
  return SPEED_CLASSES.find((speedClass) => speedClass.id === id) || SPEED_CLASSES.find((speedClass) => speedClass.id === DEFAULT_SPEED_CLASS_ID);
}

function getSpeedClassLabel(value) {
  return getSpeedClassConfig(value).label;
}

function normalizeRaceTypeId(value, fallback = DEFAULT_RACE_TYPE_ID) {
  const raw = String(value || "").trim();
  const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const match = RACE_TYPES.find((raceType) => (
    raceType.id.toLowerCase() === raw.toLowerCase()
    || raceType.id.toLowerCase() === compact
    || raceType.label.toLowerCase().replace(/[^a-z0-9]+/g, "") === compact
  ));
  return match ? match.id : fallback;
}

function getRaceTypeConfig(value) {
  const id = normalizeRaceTypeId(value);
  return RACE_TYPES.find((raceType) => raceType.id === id) || RACE_TYPES[0];
}

function getRaceTypeLabel(value) {
  return getRaceTypeConfig(value).label;
}

function isFuelRunRaceType(value) {
  return normalizeRaceTypeId(value) === FUEL_RUN_RACE_TYPE_ID;
}

function getTrackById(value) {
  const id = String(value || "").trim();
  return TRACKS.find((track) => track.id === id) || TRACKS[0];
}

function getChallengeById(value) {
  const id = String(value || "").trim();
  return CHALLENGES.find((challenge) => challenge.id === id) || null;
}

function getChallengeObjectiveLabel(challenge) {
  return String(challenge?.objective?.label || "Finish the race");
}

function getSpeedClassStartSpeed(value) {
  const speedClass = getSpeedClassConfig(value);
  return speedClass.startSpeed ?? TRACKS[0].baseSpeed * (speedClass.startMultiplier ?? 1);
}

function getSpeedClassEndSpeed(value, track = TRACKS[0]) {
  const speedClass = getSpeedClassConfig(value);
  return speedClass.endSpeed ?? track.baseSpeed * (speedClass.endMultiplier ?? 2);
}

function getTrackBaseSpeedCurveT(track, progress) {
  const start = track.startSpeedMultiplier ?? 1;
  const end = track.endSpeedMultiplier ?? 2;
  const value = sampleProgressCurve([
    { progress: 0, value: track.startSpeedMultiplier ?? 1 },
    { progress: 0.2, value: track.earlySpeedMultiplier ?? track.startSpeedMultiplier ?? 1 },
    { progress: 0.5, value: track.midSpeedMultiplier ?? 1.45 },
    { progress: 0.8, value: track.lateSpeedMultiplier ?? track.midSpeedMultiplier ?? 1.75 },
    { progress: 1, value: track.endSpeedMultiplier ?? 2 }
  ], progress, track.speedCurveType);
  return clamp((value - start) / Math.max(0.0001, end - start), 0, 1);
}

function getTrackSpeedMultiplier(track, progress, speedClassId = DEFAULT_SPEED_CLASS_ID) {
  const startSpeed = getSpeedClassStartSpeed(speedClassId);
  const cruiseSpeed = getTrackRawCruiseSpeed(track, progress, speedClassId);
  return cruiseSpeed / Math.max(1, startSpeed);
}

function getTrackRawCruiseSpeed(track, progress, speedClassId = DEFAULT_SPEED_CLASS_ID) {
  const startSpeed = getSpeedClassStartSpeed(speedClassId);
  return lerp(startSpeed, getSpeedClassEndSpeed(speedClassId, track), getTrackBaseSpeedCurveT(track, progress));
}

function getTrackCruiseSpeed(track, progress, speedClassId = DEFAULT_SPEED_CLASS_ID) {
  return clamp(getTrackRawCruiseSpeed(track, progress, speedClassId), SPEED_TUNING.minSpeed, track.maxSpeed);
}

function getCountdownLabel(timer) {
  if (timer <= 0) return "";
  if (timer <= ARCADE_FEEL.countdownGoSeconds) return "GO";
  return String(Math.ceil(timer - ARCADE_FEEL.countdownGoSeconds));
}

function getScoreEventLabel(type, points) {
  const amount = points > 0 ? `+${Math.round(points)}` : String(Math.round(points));
  const labels = {
    nearMiss: "NEAR MISS",
    clean: "CLEAN",
    boostPad: "BOOST PAD",
    ramp: "RAMP",
    gasCan: "FUEL",
    finish: "FINISH"
  };
  return `${labels[type] || "BONUS"} ${amount}`;
}

function getScoreEventColor(type) {
  if (type === "nearMiss") return "#28f6ff";
  if (type === "boostPad") return "#44ff99";
  if (type === "ramp") return "#ffe45e";
  if (type === "gasCan") return "#ff4d3d";
  if (type === "finish") return "#f6fbff";
  return "#ffe45e";
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function truncateCharacters(value, maxLength) {
  return Array.from(String(value ?? "")).slice(0, Math.max(0, maxLength)).join("");
}

function sanitizeDisplayText(value, fallback = "", maxLength = DISPLAY_TEXT_MAX_LENGTH) {
  const source = String(value ?? "");
  const normalized = typeof source.normalize === "function" ? source.normalize("NFKC") : source;
  const clean = normalized
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const capped = truncateCharacters(clean, maxLength).trim();
  return capped || fallback;
}

function sanitizeName(value, fallback, maxLength = DISPLAY_TEXT_MAX_LENGTH) {
  return sanitizeDisplayText(value, fallback, maxLength);
}

function sanitizePlayerName(value, fallback = "PLAYER") {
  return sanitizeDisplayText(value, fallback, LOCAL_PLAYER_NAME_MAX_LENGTH);
}

function sanitizeCarName(value, fallback = DEFAULT_CAR.name) {
  return sanitizeDisplayText(value, fallback, LOCAL_CAR_NAME_MAX_LENGTH);
}

function normalizeStorageId(value, fallback = "") {
  const clean = sanitizeDisplayText(value, "", STORAGE_ID_MAX_LENGTH)
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return clean || fallback;
}

function normalizeHexColor(value, fallback) {
  const clean = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean.toLowerCase() : fallback;
}

function normalizeNonNegativeInteger(value, fallback = 0, max = MAX_DISPLAY_SCORE) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(Math.round(numeric), 0, max);
}

function normalizeNonNegativeNumber(value, fallback = 0, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric, 0, max);
}

function normalizeDateString(value, fallback = "") {
  const clean = sanitizeDisplayText(value, "", 40);
  const time = clean ? Date.parse(clean) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function normalizeCarConfig(value, fallback = DEFAULT_CAR) {
  const source = value && typeof value === "object" ? value : {};
  const fallbackCar = { ...DEFAULT_CAR, ...(fallback && typeof fallback === "object" ? fallback : {}) };
  const style = CAR_BODY_STYLES.some((item) => item.id === source.bodyStyle) ? source.bodyStyle : fallbackCar.bodyStyle;
  return {
    name: sanitizeCarName(source.name, fallbackCar.name),
    bodyColor: normalizeHexColor(source.bodyColor, fallbackCar.bodyColor),
    stripeColor: normalizeHexColor(source.stripeColor, fallbackCar.stripeColor),
    windowColor: normalizeHexColor(source.windowColor, fallbackCar.windowColor),
    bodyStyle: style,
    useSprite: source.useSprite !== false
  };
}

function normalizeRoadSeed(value, fallback = "") {
  const clean = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, ROAD_SEED_MAX_LENGTH)
    .replace(/-$/g, "");
  return clean || fallback;
}

function normalizeStoredRoadSeed(value, fallback = CLASSIC_SEED_LABEL) {
  const raw = String(value ?? "").trim();
  if (/^classic$/i.test(raw)) return CLASSIC_SEED_LABEL;
  if (/^unknown$/i.test(raw)) return "Unknown";
  const clean = normalizeRoadSeed(value, "");
  return clean || fallback;
}

function formatRoadSeed(value) {
  return normalizeStoredRoadSeed(value, CLASSIC_SEED_LABEL);
}

function generateReadableRoadSeed(rng = Math.random) {
  const prefix = randomChoice(ROAD_SEED_PREFIXES, rng) || "ROAD";
  const number = Math.floor(rng() * 99000) + 1000;
  return normalizeRoadSeed(`${prefix}-${number}`, DEFAULT_ROAD_SEED);
}

function getRunRandomSeedSource(seed, track, speedClassId, raceTypeId = DEFAULT_RACE_TYPE_ID) {
  const trackId = track?.id || "track";
  const modeId = normalizeSpeedClassId(speedClassId, DEFAULT_SPEED_CLASS_ID);
  const base = `${normalizeRoadSeed(seed, DEFAULT_ROAD_SEED)}|${trackId}|${modeId}`;
  const raceType = normalizeRaceTypeId(raceTypeId, DEFAULT_RACE_TYPE_ID);
  return raceType === DEFAULT_RACE_TYPE_ID ? base : `${base}|${raceType}`;
}

function formatScore(value) {
  return normalizeNonNegativeInteger(value).toLocaleString();
}

function normalizeRunStatus(value) {
  const status = String(value || "").trim();
  if (status === "finished") return "finished";
  if (status === "outOfFuel" || status === "out-of-fuel" || /^out of fuel$/i.test(status)) return "outOfFuel";
  return "crashed";
}

function getRunStatusLabel(status, reason = "") {
  const normalized = normalizeRunStatus(status);
  if (normalized === "finished") return "Finished";
  if (normalized === "outOfFuel") return "Out of Fuel";
  return reason ? `Crashed: ${reason}` : "Crashed";
}

function getFuelRunTuning(speedClassId) {
  const id = normalizeSpeedClassId(speedClassId, DEFAULT_SPEED_CLASS_ID);
  return {
    fuelMax: FUEL_RUN_CONFIG.fuelMax,
    fuelDrainPerSecond: FUEL_RUN_CONFIG.fuelDrainPerSecond[id] ?? FUEL_RUN_CONFIG.fuelDrainPerSecond[DEFAULT_SPEED_CLASS_ID],
    gasCanRestoreAmount: FUEL_RUN_CONFIG.gasCanRestoreAmount[id] ?? FUEL_RUN_CONFIG.gasCanRestoreAmount[DEFAULT_SPEED_CLASS_ID],
    lowFuelThreshold: FUEL_RUN_CONFIG.lowFuelThreshold,
    criticalFuelThreshold: FUEL_RUN_CONFIG.criticalFuelThreshold,
    minGasGapSeconds: FUEL_RUN_CONFIG.minGasGapSeconds[id] ?? FUEL_RUN_CONFIG.minGasGapSeconds[DEFAULT_SPEED_CLASS_ID],
    targetGasGapSeconds: FUEL_RUN_CONFIG.targetGasGapSeconds[id] ?? FUEL_RUN_CONFIG.targetGasGapSeconds[DEFAULT_SPEED_CLASS_ID],
    maxGasGapSeconds: FUEL_RUN_CONFIG.maxGasGapSeconds[id] ?? FUEL_RUN_CONFIG.maxGasGapSeconds[DEFAULT_SPEED_CLASS_ID]
  };
}

function formatSignedScore(value) {
  const numeric = Number(value);
  const rounded = Math.round(Number.isFinite(numeric) ? numeric : 0);
  if (rounded > 0) return `+${formatScore(rounded)}`;
  if (rounded < 0) return `-${formatScore(Math.abs(rounded))}`;
  return "0";
}

function formatTime(seconds) {
  const whole = Math.floor(normalizeNonNegativeNumber(seconds, 0, 24 * 60 * 60));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatShortDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : "";
}

function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function safeStorageGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function safeStorageRemoveItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}

function createDefaultChallengeSave() {
  return {
    version: CHALLENGE_SAVE_VERSION,
    progress: {}
  };
}

function normalizeChallengeRunSummary(summary) {
  if (!summary || typeof summary !== "object") return null;
  return {
    status: normalizeRunStatus(summary.status),
    score: normalizeNonNegativeInteger(Number.isFinite(Number(summary.score)) ? summary.score : summary.finalScore || 0),
    raceType: normalizeRaceTypeId(summary.raceType || summary.raceTypeId, DEFAULT_RACE_TYPE_ID),
    raceMode: normalizeSpeedClassId(summary.raceMode || summary.speedClass, DEFAULT_SPEED_CLASS_ID),
    seed: normalizeStoredRoadSeed(summary.seed, ""),
    time: normalizeNonNegativeNumber(summary.time, 0, 24 * 60 * 60),
    slowdownHits: normalizeNonNegativeInteger(summary.slowdownHits, 0, 999),
    nearMisses: normalizeNonNegativeInteger(summary.nearMisses, 0, 999),
    manualBoostsUsed: normalizeNonNegativeInteger(summary.manualBoostsUsed, 0, 99),
    medalsEarned: Array.isArray(summary.medalsEarned || summary.medals)
      ? (summary.medalsEarned || summary.medals)
        .map((medal) => sanitizeName(medal?.title || medal, "", DISPLAY_TEXT_MAX_LENGTH))
        .filter(Boolean)
        .slice(0, 5)
      : []
  };
}

function normalizeChallengeProgressEntry(entry, challengeId) {
  if (!entry || typeof entry !== "object") return null;
  const bestScore = Number.isFinite(Number(entry.bestScore)) ? entry.bestScore : entry.score;
  return {
    challengeId: normalizeStorageId(entry.challengeId || challengeId || "", challengeId || ""),
    completed: Boolean(entry.completed || entry.bestCompletionStatus),
    bestCompletionStatus: Boolean(entry.completed || entry.bestCompletionStatus),
    bestScore: normalizeNonNegativeInteger(bestScore),
    bestDate: normalizeDateString(entry.bestDate || entry.date, ""),
    bestRunSummary: normalizeChallengeRunSummary(entry.bestRunSummary || entry.runSummary || entry.summary)
  };
}

function normalizeChallengeSave(value) {
  const fallback = createDefaultChallengeSave();
  if (!value || typeof value !== "object") return fallback;
  const source = value.progress && typeof value.progress === "object" ? value.progress : value;
  const progress = {};
  CHALLENGES.forEach((challenge) => {
    const entry = normalizeChallengeProgressEntry(source[challenge.id], challenge.id);
    if (entry) {
      progress[challenge.id] = {
        ...entry,
        challengeId: challenge.id
      };
    }
  });
  return {
    version: CHALLENGE_SAVE_VERSION,
    progress
  };
}

function normalizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object" || !Number.isFinite(Number(entry.score))) return null;
  const speedClass = normalizeSpeedClassId(entry.speedClass || entry.raceMode, DEFAULT_SPEED_CLASS_ID);
  const raceType = normalizeRaceTypeId(entry.raceType || entry.raceTypeId, DEFAULT_RACE_TYPE_ID);
  const challenge = getChallengeById(entry.challengeId);
  const challengeId = challenge ? challenge.id : "";
  return {
    playerName: sanitizePlayerName(entry.playerName, "PLAYER"),
    playerId: normalizeStorageId(entry.playerId, ""),
    carName: sanitizeCarName(entry.carName, "CAR"),
    trackName: sanitizeName(entry.trackName, "TRACK", DISPLAY_TEXT_MAX_LENGTH),
    speedClass,
    raceMode: normalizeSpeedClassId(entry.raceMode || speedClass, speedClass),
    raceType,
    seed: normalizeStoredRoadSeed(entry.seed, CLASSIC_SEED_LABEL),
    score: normalizeNonNegativeInteger(entry.score),
    status: normalizeRunStatus(entry.status),
    time: normalizeNonNegativeNumber(entry.time, 0, 24 * 60 * 60),
    fuelCollected: normalizeNonNegativeInteger(Number.isFinite(Number(entry.fuelCollected)) ? entry.fuelCollected : entry.gasCansCollected || 0, 0, 999),
    fuelRemaining: normalizeNonNegativeInteger(entry.fuelRemaining, 0, FUEL_RUN_CONFIG.fuelMax),
    fuelBonus: normalizeNonNegativeInteger(entry.fuelBonus),
    date: normalizeDateString(entry.date, ""),
    partyMode: Boolean(entry.partyMode),
    challengeId,
    challengeName: challengeId ? sanitizeName(entry.challengeName || challenge?.name, challenge?.name || "Challenge", DISPLAY_TEXT_MAX_LENGTH) : ""
  };
}

function normalizeLeaderboardList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, LEADERBOARD_IMPORT_SCAN_LIMIT)
    .map((entry) => normalizeLeaderboardEntry(entry))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, LEADERBOARD_MAX_ENTRIES);
}

function getChallengeRunStats(summary) {
  const breakdown = summary?.scoreBreakdown || {};
  return {
    finished: summary?.status === "finished",
    finalScore: Math.max(0, Math.round(summary?.finalScore || 0)),
    raceType: normalizeRaceTypeId(summary?.raceType || summary?.raceTypeId, DEFAULT_RACE_TYPE_ID),
    raceMode: normalizeSpeedClassId(summary?.speedClass, DEFAULT_SPEED_CLASS_ID),
    seed: normalizeStoredRoadSeed(summary?.seed, ""),
    slowdownHits: Math.max(0, Math.round(summary?.slowdownHits || 0)),
    nearMisses: Math.max(0, Math.round(summary?.nearMisses || 0)),
    nearMissScore: Math.max(0, Math.round(breakdown.nearMiss || 0)),
    boostUseCount: Math.max(0, Math.round(summary?.manualBoostsUsed || 0)),
    medalsEarned: Array.isArray(summary?.medals)
      ? summary.medals.map((medal) => String(medal.title || "")).filter(Boolean)
      : []
  };
}

function evaluateChallengeObjective(challenge, summary) {
  const objective = challenge?.objective || {};
  const stats = getChallengeRunStats(summary);
  let completed = false;
  let detail = "Objective not met";

  if (objective.type === "noSlowdownHits") {
    completed = stats.finished && stats.slowdownHits === 0;
    detail = completed
      ? "Finished without slowdown hits"
      : `${stats.slowdownHits} slowdown hit${stats.slowdownHits === 1 ? "" : "s"}`;
  } else if (objective.type === "useAllManualBoosts") {
    const target = Math.max(1, Math.round(objective.target || 3));
    completed = stats.finished && stats.boostUseCount >= target;
    detail = completed
      ? `Used ${stats.boostUseCount}/${target} manual boosts and finished`
      : `Used ${stats.boostUseCount}/${target} manual boosts${stats.finished ? "" : ", finish still needed"}`;
  } else if (objective.type === "nearMisses") {
    const target = Math.max(1, Math.round(objective.target || 5));
    completed = stats.nearMisses >= target;
    detail = completed
      ? `${stats.nearMisses}/${target} near misses`
      : `${stats.nearMisses}/${target} near misses`;
  } else {
    completed = stats.finished;
    detail = completed ? "Finished the race" : "Finish still needed";
  }

  return {
    challengeId: challenge?.id || "",
    challengeName: challenge?.name || "Challenge",
    objective: getChallengeObjectiveLabel(challenge),
    completed,
    detail,
    score: stats.finalScore,
    raceMode: stats.raceMode,
    seed: stats.seed,
    slowdownHits: stats.slowdownHits,
    nearMisses: stats.nearMisses,
    nearMissScore: stats.nearMissScore,
    boostUseCount: stats.boostUseCount,
    medalsEarned: stats.medalsEarned,
    date: new Date().toISOString()
  };
}

function randomChoice(items, rng = Math.random) {
  if (!items.length) return undefined;
  return items[Math.floor(rng() * items.length)];
}

function weightedChoice(items, rng = Math.random) {
  const choices = items.filter((item) => item && item.weight > 0);
  if (!choices.length) return undefined;
  const total = choices.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of choices) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return choices[choices.length - 1].value;
}

function shuffle(items, rng = Math.random) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandomController(seed) {
  const hash = hashSeed(seed) || 1;
  let state = hash;
  return {
    seed: String(seed),
    hash,
    random() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState() {
      return state >>> 0;
    }
  };
}

function createSeededRandom(seed) {
  const controller = createSeededRandomController(seed);
  const seededRandom = function seededRandom() {
    return controller.random();
  };
  seededRandom.seed = controller.seed;
  seededRandom.seedHash = controller.hash;
  seededRandom.getState = () => controller.getState();
  return seededRandom;
}

function deterministicNoise(index, salt = 0) {
  const x = Math.sin((index + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function getTrackDirectorBand(progress) {
  const safeProgress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  return TRACK_DIRECTOR_BANDS.find((band) => safeProgress >= band.min && safeProgress < band.max)
    || TRACK_DIRECTOR_BANDS[TRACK_DIRECTOR_BANDS.length - 1];
}

const FALLBACK_TRACK_SECTION = {
  id: "fullRun",
  label: "Full Run",
  startProgress: 0,
  endProgress: 1,
  pressureMultiplier: 1,
  visualIntensity: 1,
  cadenceMultiplier: 1,
  recoveryGapMultiplier: 1,
  forceMeaningfulMultiplier: 1,
  waveWeightMultipliers: {}
};

function getTrackSections(track) {
  return Array.isArray(track?.sections) && track.sections.length
    ? track.sections
    : [FALLBACK_TRACK_SECTION];
}

function getTrackSection(track, progress) {
  const safeProgress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const sections = getTrackSections(track);
  return sections.find((section) => {
    const start = Number.isFinite(section.startProgress) ? section.startProgress : 0;
    const end = Number.isFinite(section.endProgress) ? section.endProgress : 1;
    return safeProgress >= start && (safeProgress < end || (safeProgress >= 1 && end >= 1));
  }) || sections[sections.length - 1] || FALLBACK_TRACK_SECTION;
}

function getTrackSectionProgress(section, progress) {
  const start = Number.isFinite(section?.startProgress) ? section.startProgress : 0;
  const end = Number.isFinite(section?.endProgress) ? section.endProgress : 1;
  return clamp((progress - start) / Math.max(0.0001, end - start), 0, 1);
}

function getSectionNumber(section, key, fallback = 1, min = 0.1, max = 3) {
  return clampNumber(section?.[key], min, max, fallback);
}

function getTrackDirectorCadence(speedClassId = DEFAULT_SPEED_CLASS_ID) {
  return TRACK_DIRECTOR.modeCadence[normalizeSpeedClassId(speedClassId)]
    || TRACK_DIRECTOR.modeCadence[DEFAULT_SPEED_CLASS_ID];
}

function contrastText(hex) {
  const color = String(hex || "#ffffff").replace("#", "");
  if (color.length !== 6) return "#07101b";
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#07101b" : "#f8fbff";
}

function rectFromCenter(x, y, w, h) {
  return {
    x: x - w / 2,
    y: y - h / 2,
    w,
    h
  };
}

function rectFromRenderedVisual(visual) {
  if (!visual) return null;
  return {
    x: visual.renderedX,
    y: visual.renderedY,
    w: visual.renderedWidth,
    h: visual.renderedHeight
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

function rectOverlapSize(a, b) {
  return {
    width: segmentOverlap(a.x, a.x + a.w, b.x, b.x + b.w),
    height: segmentOverlap(a.y, a.y + a.h, b.y, b.y + b.h)
  };
}

function rectsOverlapByThreshold(a, b, minOverlapPx = 0) {
  const overlap = rectOverlapSize(a, b);
  return {
    hit: overlap.width > minOverlapPx && overlap.height > minOverlapPx,
    overlap
  };
}

function expandRect(rect, xPadding, yPadding) {
  return {
    x: rect.x - xPadding,
    y: rect.y - yPadding,
    w: rect.w + xPadding * 2,
    h: rect.h + yPadding * 2
  };
}

function getHitboxConfig(type) {
  return HITBOX_CONFIG[type] || null;
}

function hasGameplayHitbox(type) {
  const config = getHitboxConfig(type);
  return Boolean(config && config.width > 0 && config.height > 0);
}

function getCollisionMinOverlapPx(type) {
  const config = getHitboxConfig(type);
  if (Number.isFinite(config?.minOverlapPx)) return config.minOverlapPx;
  return HARD_VEHICLE_TYPES.has(type) ? HARD_VEHICLE_COLLISION_OVERLAP_PX : MIN_COLLISION_OVERLAP_PX;
}

function rectHorizontalGap(a, b) {
  if (a.x + a.w < b.x) return b.x - (a.x + a.w);
  if (b.x + b.w < a.x) return a.x - (b.x + b.w);
  return 0;
}

function segmentOverlap(a1, a2, b1, b2) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

// ---------------------------------------------------------------------------
// Player profiles and saves
// ---------------------------------------------------------------------------

class PlayerProfileManager {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.saveStatus = "Not saved yet";
    this.data = this.load();
  }

  defaultData() {
    return {
      version: 1,
      players: [],
      currentPlayerId: null,
      speedClassId: DEFAULT_SPEED_CLASS_ID,
      leaderboard: [],
      challengeProgress: createDefaultChallengeSave(),
      audio: {
        musicMuted: false,
        sfxMuted: false,
        musicVolume: 0.62,
        sfxVolume: 0.82
      }
    };
  }

  load() {
    const rawSave = safeStorageGetItem(this.storageKey);
    const parsed = safeJsonParse(rawSave);
    if (!parsed || typeof parsed !== "object") {
      this.saveStatus = parsed === null && rawSave ? "Recovered from corrupted save" : "No save found";
      return this.defaultData();
    }

    const fallback = this.defaultData();
    const seenPlayerIds = new Set();
    const players = Array.isArray(parsed.players) ? parsed.players
      .slice(0, LOCAL_PLAYER_MAX_COUNT)
      .map((player, index) => {
        const id = normalizeStorageId(player?.id, uid());
        return {
          id,
          name: sanitizePlayerName(player?.name, `PLAYER ${index + 1}`),
          car: normalizeCarConfig(player?.car),
          bestScore: normalizeNonNegativeInteger(player?.bestScore)
        };
      })
      .filter((player) => {
        if (seenPlayerIds.has(player.id)) return false;
        seenPlayerIds.add(player.id);
        return true;
      }) : [];

    const leaderboard = normalizeLeaderboardList(parsed.leaderboard);

    const audio = {
      ...fallback.audio,
      ...(parsed.audio && typeof parsed.audio === "object" ? parsed.audio : {})
    };
    audio.musicVolume = clampNumber(audio.musicVolume, 0, 1, fallback.audio.musicVolume);
    audio.sfxVolume = clampNumber(audio.sfxVolume, 0, 1, fallback.audio.sfxVolume);
    audio.musicMuted = Boolean(audio.musicMuted);
    audio.sfxMuted = Boolean(audio.sfxMuted);

    const storedCurrentPlayerId = normalizeStorageId(parsed.currentPlayerId, "");
    const currentPlayerId = players.some((player) => player.id === storedCurrentPlayerId)
      ? storedCurrentPlayerId
      : (players[0] ? players[0].id : null);

    this.saveStatus = "Save loaded";
    return {
      version: 1,
      players,
      currentPlayerId,
      speedClassId: normalizeSpeedClassId(parsed.speedClassId, fallback.speedClassId),
      leaderboard,
      challengeProgress: normalizeChallengeSave(parsed.challengeProgress || parsed.challenges),
      audio
    };
  }

  save() {
    if (safeStorageSetItem(this.storageKey, JSON.stringify(this.data))) {
      this.saveStatus = `Saved ${new Date().toLocaleTimeString()}`;
      return true;
    }
    this.saveStatus = "Save failed";
    return false;
  }

  resetAll() {
    safeStorageRemoveItem(this.storageKey);
    this.data = this.defaultData();
    this.saveStatus = "Local data reset";
  }

  getCurrentPlayer() {
    return this.data.players.find((player) => player.id === this.data.currentPlayerId) || null;
  }

  getPlayerById(id) {
    return this.data.players.find((player) => player.id === id) || null;
  }

  ensureDefaultPlayer() {
    if (this.data.players.length > 0) {
      if (!this.getCurrentPlayer()) {
        this.data.currentPlayerId = this.data.players[0].id;
      }
      return this.getCurrentPlayer();
    }
    return this.createPlayer("PLAYER 1");
  }

  createPlayer(name) {
    if (this.data.players.length >= LOCAL_PLAYER_MAX_COUNT) {
      this.saveStatus = `Local player limit reached (${LOCAL_PLAYER_MAX_COUNT})`;
      return null;
    }
    const player = {
      id: uid(),
      name: sanitizePlayerName(name, "PLAYER"),
      car: { ...DEFAULT_CAR },
      bestScore: 0
    };
    this.data.players.push(player);
    this.data.currentPlayerId = player.id;
    this.save();
    return player;
  }

  selectPlayer(id) {
    if (this.data.players.some((player) => player.id === id)) {
      this.data.currentPlayerId = id;
      this.save();
      return true;
    }
    return false;
  }

  updateCurrentCar(carConfig) {
    const player = this.getCurrentPlayer();
    if (!player) return false;
    player.car = normalizeCarConfig(carConfig);
    this.save();
    return true;
  }

  updateAudioSettings(settings) {
    this.data.audio = {
      ...this.data.audio,
      ...settings
    };
    this.data.audio.musicVolume = clamp(Number(this.data.audio.musicVolume), 0, 1);
    this.data.audio.sfxVolume = clamp(Number(this.data.audio.sfxVolume), 0, 1);
    this.save();
  }

  updateSpeedClass(speedClassId) {
    this.data.speedClassId = normalizeSpeedClassId(speedClassId, DEFAULT_SPEED_CLASS_ID);
    this.save();
  }

  recordScore(entry) {
    const cleanEntry = normalizeLeaderboardEntry({
      ...entry,
      date: new Date().toISOString()
    });
    if (!cleanEntry) return null;
    this.data.leaderboard.push(cleanEntry);
    this.data.leaderboard.sort((a, b) => b.score - a.score);
    this.data.leaderboard = this.data.leaderboard.slice(0, LEADERBOARD_MAX_ENTRIES);

    const player = cleanEntry.playerId ? this.getPlayerById(cleanEntry.playerId) : this.getCurrentPlayer();
    if (player && cleanEntry.score > player.bestScore) {
      player.bestScore = cleanEntry.score;
    }
    this.save();
    return cleanEntry;
  }

  getChallengeProgress(challengeId) {
    const id = String(challengeId || "");
    return this.data.challengeProgress?.progress?.[id] || null;
  }

  recordChallengeResult(challenge, summary, evaluation) {
    if (!challenge?.id || !evaluation) return null;
    const save = normalizeChallengeSave(this.data.challengeProgress);
    const existing = save.progress[challenge.id] || {
      challengeId: challenge.id,
      completed: false,
      bestCompletionStatus: false,
      bestScore: 0,
      bestDate: "",
      bestRunSummary: null
    };
    const score = Math.max(0, Math.round(summary?.finalScore || evaluation.score || 0));
    const scoreImproved = score > (existing.bestScore || 0);
    const completionImproved = Boolean(evaluation.completed && !existing.completed);
    const shouldStoreRun = scoreImproved || completionImproved || !existing.bestDate;
    const date = evaluation.date || new Date().toISOString();
    const bestRunSummary = shouldStoreRun
      ? normalizeChallengeRunSummary({
        status: summary?.status,
        score,
        raceType: summary?.raceTypeId,
        raceMode: summary?.speedClass,
        seed: summary?.seed,
        time: summary?.time,
        slowdownHits: summary?.slowdownHits,
        nearMisses: summary?.nearMisses,
        manualBoostsUsed: summary?.manualBoostsUsed,
        medalsEarned: evaluation.medalsEarned
      })
      : existing.bestRunSummary;

    const updated = {
      challengeId: challenge.id,
      completed: Boolean(existing.completed || evaluation.completed),
      bestCompletionStatus: Boolean(existing.completed || evaluation.completed),
      bestScore: Math.max(existing.bestScore || 0, score),
      bestDate: shouldStoreRun ? date : existing.bestDate,
      bestRunSummary
    };
    save.progress[challenge.id] = updated;
    this.data.challengeProgress = save;
    this.save();
    return {
      ...evaluation,
      saved: true,
      previousBestScore: existing.bestScore || 0,
      bestScore: updated.bestScore,
      bestCompletionStatus: updated.bestCompletionStatus,
      newBest: scoreImproved,
      newlyCompleted: completionImproved,
      bestDate: updated.bestDate,
      bestRunSummary: updated.bestRunSummary
    };
  }
}

function snapshotPartyPlayer(player) {
  return {
    id: normalizeStorageId(player.id, uid()),
    name: sanitizePlayerName(player.name, "PLAYER"),
    car: normalizeCarConfig(player.car),
    bestScore: normalizeNonNegativeInteger(player.bestScore)
  };
}

class PartySession {
  constructor(options = {}) {
    const players = Array.isArray(options.players) ? options.players : [];
    this.isPartyMode = true;
    this.roundType = options.roundType || PARTY_ROUND_TYPE_ONE_RUN;
    this.selectedPlayers = players.slice(0, PARTY_MAX_PLAYERS).map(snapshotPartyPlayer);
    this.currentPlayerIndex = clampNumber(options.currentPlayerIndex, 0, Math.max(0, this.selectedPlayers.length - 1), 0);
    this.sharedSeed = normalizeRoadSeed(options.sharedSeed, DEFAULT_ROAD_SEED);
    this.track = options.track || TRACKS[0];
    this.raceMode = normalizeSpeedClassId(options.raceMode, DEFAULT_SPEED_CLASS_ID);
    this.raceType = normalizeRaceTypeId(options.raceType || options.raceTypeId, DEFAULT_RACE_TYPE_ID);
    this.results = Array.isArray(options.results) ? options.results.slice() : [];
    this.roundNumber = Math.max(1, Math.round(options.roundNumber || 1));
    this.completed = Boolean(options.completed) || this.results.length >= this.selectedPlayers.length;
    this.finalSfxPlayed = false;
  }

  get currentPlayer() {
    return this.selectedPlayers[this.currentPlayerIndex] || null;
  }

  get totalPlayers() {
    return this.selectedPlayers.length;
  }

  get currentTurnNumber() {
    return clamp(this.currentPlayerIndex + 1, 1, Math.max(1, this.totalPlayers));
  }

  addResult(summary) {
    const player = this.currentPlayer || snapshotPartyPlayer(summary?.player || {});
    const result = {
      playerId: player.id,
      playerName: sanitizePlayerName(player.name, "PLAYER"),
      carName: sanitizeCarName(player.car?.name, DEFAULT_CAR.name),
      score: normalizeNonNegativeInteger(summary?.finalScore || 0),
      status: normalizeRunStatus(summary?.status),
      reason: sanitizeName(summary?.reason, "", DISPLAY_TEXT_MAX_LENGTH),
      time: normalizeNonNegativeNumber(summary?.time, 0, 24 * 60 * 60),
      raceMode: normalizeSpeedClassId(summary?.speedClass || this.raceMode, this.raceMode),
      raceType: normalizeRaceTypeId(summary?.raceTypeId || summary?.raceType || this.raceType, this.raceType),
      seed: normalizeStoredRoadSeed(summary?.seed || this.sharedSeed, this.sharedSeed),
      trackName: sanitizeName(summary?.trackName || this.track?.name, "TRACK", DISPLAY_TEXT_MAX_LENGTH),
      fuelCollected: normalizeNonNegativeInteger(summary?.fuelCollected || 0, 0, 999),
      fuelRemaining: normalizeNonNegativeInteger(summary?.fuelRemaining || 0, 0, FUEL_RUN_CONFIG.fuelMax),
      fuelBonus: normalizeNonNegativeInteger(summary?.fuelBonus || 0),
      scoreSaved: summary?.scoreSaved !== false,
      leaderboardRank: Number.isFinite(summary?.topTwentyRank) ? summary.topTwentyRank : null,
      medals: Array.isArray(summary?.medals) ? summary.medals.slice(0, 3) : [],
      date: new Date().toISOString()
    };
    this.results.push(result);
    this.currentPlayerIndex += 1;
    if (this.currentPlayerIndex >= this.selectedPlayers.length) {
      this.completed = true;
    }
    return result;
  }

  standings() {
    const sorted = this.results
      .slice()
      .sort((a, b) => b.score - a.score || a.time - b.time || a.playerName.localeCompare(b.playerName));
    const leaderScore = sorted[0]?.score || 0;
    return sorted.map((result, index) => ({
      ...result,
      rank: index + 1,
      leaderMargin: index === 0 ? 0 : Math.max(0, leaderScore - result.score)
    }));
  }

  marginOfVictory() {
    const standings = this.standings();
    if (standings.length < 2) return null;
    return Math.max(0, standings[0].score - standings[1].score);
  }

  createRematch(sharedSeed) {
    return new PartySession({
      players: this.selectedPlayers,
      sharedSeed,
      track: this.track,
      raceMode: this.raceMode,
      raceType: this.raceType,
      roundNumber: this.roundNumber + 1,
      roundType: this.roundType
    });
  }
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

class AudioManager {
  constructor(settings, onChange) {
    this.onChange = onChange;
    this.userActivated = false;
    this.musicMuted = Boolean(settings.musicMuted);
    this.sfxMuted = Boolean(settings.sfxMuted);
    this.musicVolume = clampNumber(settings.musicVolume, 0, 1, 0.62);
    this.sfxVolume = clampNumber(settings.sfxVolume, 0, 1, 0.82);
    this.musicKey = null;
    this.fadeId = null;
    this.sfxLastPlayed = {};
    this.sfxActiveCounts = {};
    this.lastPlayedSfx = "none";
    this.sfxCooldowns = {
      menu: 100,
      countdownBeep: 120,
      go: 300,
      boost: 200,
      slowdown: 250,
      oil: 250,
      ramp: 220,
      nearMiss: 300,
      warning: 1000,
      finish: 600,
      crash: 600,
      newHighScore: 900
    };
    this.tracks = {
      title: { path: "audio/title-theme.mp3", audio: null, loaded: "untested" },
      race: { path: "audio/sunset-highway.mp3", audio: null, loaded: "untested" }
    };
    this.sfx = {
      boost: { path: "audio/boost.wav", audio: null, loaded: "untested" },
      crash: { path: "audio/crash.wav", audio: null, loaded: "untested" },
      slowdown: { path: "audio/slowdown.wav", audio: null, loaded: "untested" },
      finish: { path: "audio/finish.wav", audio: null, loaded: "untested" },
      menu: { path: "audio/menu-select.wav", audio: null, loaded: "untested" },
      nearMiss: { path: "audio/near-miss.wav", audio: null, loaded: "untested" },
      oil: { path: "audio/oil.wav", audio: null, loaded: "untested" },
      ramp: { path: "audio/ramp.wav", audio: null, loaded: "untested" },
      countdownBeep: { path: "audio/countdown-beep.wav", audio: null, loaded: "untested" },
      go: { path: "audio/go.wav", audio: null, loaded: "untested" },
      newHighScore: { path: "audio/new-high-score.wav", audio: null, loaded: "untested" },
      warning: { path: "audio/warning.wav", audio: null, loaded: "untested" }
    };
  }

  activate() {
    if (this.userActivated) return;
    this.userActivated = true;
    this.preloadMusic();
    this.preloadSfx();
  }

  createAudio(entry, loop) {
    if (entry.audio) return entry.audio;
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = Boolean(loop);
    audio.volume = loop ? this.musicVolume : this.sfxVolume;
    entry.loaded = "loading";
    audio.addEventListener("loadedmetadata", () => {
      entry.loaded = "loaded";
    }, { once: true });
    audio.addEventListener("canplaythrough", () => {
      entry.loaded = "loaded";
    }, { once: true });
    audio.addEventListener("error", () => {
      entry.loaded = "missing";
    });
    audio.src = entry.path;
    entry.audio = audio;
    try {
      audio.load();
    } catch (error) {
      entry.loaded = "missing";
    }
    return audio;
  }

  preloadMusic() {
    Object.values(this.tracks).forEach((entry) => {
      try {
        this.createAudio(entry, true);
      } catch (error) {
        entry.loaded = "missing";
      }
    });
  }

  preloadSfx() {
    Object.values(this.sfx).forEach((entry) => {
      try {
        this.createAudio(entry, false);
      } catch (error) {
        entry.loaded = "missing";
      }
    });
  }

  playMusic(key, restart = false) {
    if (!this.userActivated || this.musicMuted) return;
    const entry = this.tracks[key];
    if (!entry) return;
    const audio = this.createAudio(entry, true);
    if (this.musicKey && this.musicKey !== key) {
      this.stopMusic(0);
    }
    this.musicKey = key;
    audio.loop = true;
    audio.volume = this.musicVolume;
    if (restart) {
      try {
        audio.currentTime = 0;
      } catch (error) {
        // Some browsers reject seeking until metadata exists. Playback still starts safely.
      }
    }
    const promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch((error) => {
        entry.loaded = error?.name === "NotAllowedError" ? "blocked" : "missing";
        if (this.musicKey === key) this.musicKey = null;
      });
    }
  }

  stopMusic(fadeSeconds = 0.35) {
    if (this.fadeId) {
      cancelAnimationFrame(this.fadeId);
      this.fadeId = null;
    }
    const key = this.musicKey;
    const entry = key ? this.tracks[key] : null;
    const audio = entry && entry.audio;
    if (!audio) {
      this.musicKey = null;
      return;
    }
    if (fadeSeconds <= 0) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = this.musicVolume;
      this.musicKey = null;
      return;
    }
    const startVolume = audio.volume;
    const start = performance.now();
    const fade = (now) => {
      const t = clamp((now - start) / (fadeSeconds * 1000), 0, 1);
      audio.volume = lerp(startVolume, 0, t);
      if (t < 1) {
        this.fadeId = requestAnimationFrame(fade);
      } else {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = this.musicVolume;
        this.musicKey = null;
        this.fadeId = null;
      }
    };
    this.fadeId = requestAnimationFrame(fade);
  }

  playSfx(key, options = {}) {
    if (!this.userActivated || this.sfxMuted) return false;
    const entry = this.sfx[key];
    if (!entry || entry.loaded === "missing") return false;
    const now = performance.now();
    const cooldownMs = options.cooldownMs ?? this.sfxCooldowns[key] ?? 0;
    const last = this.sfxLastPlayed[key] || -Infinity;
    if (cooldownMs > 0 && now - last < cooldownMs) return false;
    const activeCount = this.sfxActiveCounts[key] || 0;
    const maxInstances = options.maxInstances ?? 3;
    if (activeCount >= maxInstances) return false;
    const source = this.createAudio(entry, false);
    if (entry.loaded === "missing") return false;
    let audio;
    try {
      audio = source.cloneNode(true);
    } catch (error) {
      audio = new Audio(entry.path);
    }
    audio.loop = false;
    audio.volume = clampNumber(options.volume ?? this.sfxVolume, 0, 1, this.sfxVolume);
    this.sfxLastPlayed[key] = now;
    this.sfxActiveCounts[key] = activeCount + 1;
    this.lastPlayedSfx = key;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      this.sfxActiveCounts[key] = Math.max(0, (this.sfxActiveCounts[key] || 1) - 1);
    };
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", () => {
      entry.loaded = "missing";
      finish();
    }, { once: true });
    const promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch((error) => {
        entry.loaded = error?.name === "NotAllowedError" ? "blocked" : "missing";
        finish();
      });
    }
    return true;
  }

  setMusicMuted(value) {
    this.musicMuted = Boolean(value);
    if (this.musicMuted) {
      this.stopMusic(0);
    }
    this.reportSettings();
  }

  setSfxMuted(value) {
    this.sfxMuted = Boolean(value);
    this.reportSettings();
  }

  setMusicVolume(value) {
    this.musicVolume = clampNumber(value, 0, 1, this.musicVolume);
    Object.values(this.tracks).forEach((entry) => {
      if (entry.audio) entry.audio.volume = this.musicVolume;
    });
    this.reportSettings();
  }

  setSfxVolume(value) {
    this.sfxVolume = clampNumber(value, 0, 1, this.sfxVolume);
    this.reportSettings();
  }

  reportSettings() {
    if (this.onChange) {
      this.onChange({
        musicMuted: this.musicMuted,
        sfxMuted: this.sfxMuted,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume
      });
    }
  }

  musicLoadedStatus() {
    return Object.entries(this.tracks).map(([key, entry]) => `${key}:${entry.loaded}`).join(" ");
  }

  musicTrackStatus() {
    if (!this.musicKey) return "none";
    const entry = this.tracks[this.musicKey];
    const audio = entry?.audio;
    if (!audio) return `${this.musicKey}:not-created`;
    const state = audio.paused ? "paused" : "playing";
    return `${this.musicKey}:${state} ${audio.currentTime.toFixed(1)}s`;
  }

  sfxLoadedStatus() {
    return Object.entries(this.sfx).map(([key, entry]) => `${key}:${entry.loaded}`).join(" ");
  }

  sfxLoadedCount() {
    return Object.values(this.sfx).filter((entry) => entry.loaded === "loaded").length;
  }

  missingSfxList() {
    const missing = Object.entries(this.sfx)
      .filter(([, entry]) => entry.loaded === "missing")
      .map(([key]) => key);
    return missing.length ? missing.join(",") : "none";
  }
}

// ---------------------------------------------------------------------------
// Car sprite assets
// ---------------------------------------------------------------------------

class CarSpriteManager {
  constructor(styles, onStatusChange) {
    this.onStatusChange = onStatusChange;
    this.entries = new Map(styles.map((style) => [style.id, {
      id: style.id,
      name: style.name,
      path: style.sprite,
      status: "idle",
      image: null
    }]));
  }

  getEntry(styleId) {
    return this.entries.get(styleId) || this.entries.get(DEFAULT_CAR.bodyStyle);
  }

  getSprite(styleId) {
    const entry = this.getEntry(styleId);
    if (!entry) return null;
    if (entry.status === "idle") {
      this.load(entry);
    }
    return entry.status === "loaded" ? entry.image : null;
  }

  getStatus(styleId) {
    const entry = this.getEntry(styleId);
    return entry ? entry.status : "missing";
  }

  getPath(styleId) {
    const entry = this.getEntry(styleId);
    return entry ? entry.path : "";
  }

  load(entry) {
    if (typeof Image !== "function") {
      entry.status = "missing";
      return;
    }
    entry.status = "loading";
    const image = new Image();
    image.onload = () => {
      entry.status = image.naturalWidth > 0 && image.naturalHeight > 0 ? "loaded" : "missing";
      image.neonOpaqueBounds = getOpaqueBounds(image);
      if (this.onStatusChange) this.onStatusChange(entry);
    };
    image.onerror = () => {
      entry.status = "missing";
      if (this.onStatusChange) this.onStatusChange(entry);
    };
    image.src = entry.path;
    entry.image = image;
  }
}

class TrafficSpriteManager {
  constructor(assetMap, onStatusChange) {
    this.onStatusChange = onStatusChange;
    this.byType = new Map();
    this.entries = new Map();
    Object.entries(assetMap).forEach(([type, variants]) => {
      const entries = variants.map((variant) => {
        const entry = {
          type,
          id: variant.id,
          path: variant.path,
          status: "idle",
          image: null
        };
        this.entries.set(entry.id, entry);
        return entry;
      });
      this.byType.set(type, entries);
    });
    this.preload();
  }

  preload() {
    this.entries.forEach((entry) => this.load(entry));
  }

  getVariants(type) {
    return this.byType.get(type) || [];
  }

  getVariantIds(type) {
    return this.getVariants(type).map((entry) => entry.id);
  }

  getEntry(type, variantId) {
    const variants = this.getVariants(type);
    if (!variants.length) return null;
    if (variantId) {
      return variants.find((entry) => entry.id === variantId) || null;
    }
    return variants[0];
  }

  getSprite(type, variantId) {
    const entry = this.getEntry(type, variantId);
    if (!entry) return null;
    if (entry.status === "idle") this.load(entry);
    return entry.status === "loaded" ? entry.image : null;
  }

  getStatus(type, variantId) {
    const entry = this.getEntry(type, variantId);
    return entry ? entry.status : "missing";
  }

  getPath(type, variantId) {
    const entry = this.getEntry(type, variantId);
    return entry ? entry.path : "";
  }

  getDebugInfo() {
    const entries = Array.from(this.entries.values());
    const loaded = entries.filter((entry) => entry.status === "loaded").length;
    const missing = entries
      .filter((entry) => entry.status === "missing")
      .map((entry) => entry.id);
    return {
      total: entries.length,
      loaded,
      active: loaded > 0,
      missing: missing.length ? missing.join(",") : "none"
    };
  }

  load(entry) {
    if (!entry || entry.status === "loading" || entry.status === "loaded" || entry.status === "missing") return;
    if (typeof Image !== "function") {
      entry.status = "missing";
      return;
    }
    entry.status = "loading";
    const image = new Image();
    image.onload = () => {
      entry.status = image.naturalWidth > 0 && image.naturalHeight > 0 ? "loaded" : "missing";
      image.neonOpaqueBounds = getOpaqueBounds(image);
      if (this.onStatusChange) this.onStatusChange(entry);
    };
    image.onerror = () => {
      entry.status = "missing";
      if (this.onStatusChange) this.onStatusChange(entry);
    };
    image.src = entry.path;
    entry.image = image;
  }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

class InputManager {
  constructor(game) {
    this.game = game;
    this.heldVerticalKeys = new Set();
    this.activeKeys = new Set();
    this.suppressedUntilKeyup = new Set();
    this.lastKeyPressed = "none";
    this.lastKeyTime = 0;
    this.lastLaneInput = "none";
    this.lastLaneInputTime = 0;
    this.lastBoostEdgeTime = 0;
    this.leftRightRepeatIgnoredCount = 0;
    this.boostRepeatIgnoredCount = 0;
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundWindowBlur = this.clearGameplayInput.bind(this);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("blur", this.boundWindowBlur);
    window.addEventListener("pointerdown", () => {
      this.game.audio.activate();
      this.game.focusControls();
      if (this.game.screen === "title") {
        this.game.audio.playMusic("title");
      }
    }, { passive: true });
  }

  onKeyDown(event) {
    const key = event.key;
    const lowerKey = String(key || "").toLowerCase();
    if (this.isEditableTarget(event.target) && key !== "Escape") return;
    const keyId = this.getKeyId(event);
    const isControlKey = this.isControlKey(keyId);
    const wasHeld = keyId ? this.activeKeys.has(keyId) : false;
    const isEdge = !event.repeat && !wasHeld;
    if (this.shouldPreventDefault(keyId, key)) {
      event.preventDefault();
    }
    if (keyId && isEdge) {
      this.activeKeys.add(keyId);
      this.lastKeyPressed = keyId;
      this.lastKeyTime = performance.now();
      this.game.recordInputEvent(keyId);
    }
    this.game.audio.activate();
    if (this.game.screen === "title") {
      this.game.audio.playMusic("title");
    }

    if (key === "`") {
      this.game.debugMode = !this.game.debugMode;
      if (!this.game.debugMode && this.game.run) {
        this.game.run.debugFrozen = false;
      }
      if (this.game.screen === "title") this.game.showTitle();
      return;
    }

    if (!isEdge && isControlKey) {
      if (keyId === "left" || keyId === "right") this.leftRightRepeatIgnoredCount += 1;
      if (keyId === "boost") this.boostRepeatIgnoredCount += 1;
      return;
    }

    if (lowerKey === "m") {
      this.game.toggleMusic();
      return;
    }

    if (lowerKey === "n") {
      this.game.toggleSfx();
      return;
    }

    if (lowerKey === "f" && (!this.game.debugMode || this.game.screen !== "game")) {
      event.preventDefault();
      this.game.toggleFullscreen();
      return;
    }

    if (this.game.debugMode) {
      const lower = lowerKey;
      if (event.shiftKey && (key === "+" || key === "=")) {
        event.preventDefault();
        this.game.adjustDebugSpeedScale(0.1);
        return;
      }
      if (event.shiftKey && (key === "_" || key === "-")) {
        event.preventDefault();
        this.game.adjustDebugSpeedScale(-0.1);
        return;
      }
      if (event.shiftKey && key === "0") {
        event.preventDefault();
        this.game.resetDebugSpeedScale();
        return;
      }
      if (lower === "r") {
        this.game.handleRestartRun();
        return;
      }
      if (lower === "f") {
        this.game.jumpNearFinish();
        return;
      }
      if (lower === "c") {
        this.game.forceCrash();
        return;
      }
      if (lower === "l") {
        this.game.showLeaderboard();
        return;
      }
      if (lower === "p") {
        this.game.runSpawnSafetySimulation();
        return;
      }
      if (lower === "h") {
        this.game.toggleDebugFreeze();
        return;
      }
    }

    if (this.game.screen === "game") {
      if (this.shouldSuppressGameplayInput(keyId)) {
        this.suppressedUntilKeyup.add(keyId);
        this.releaseGameplayKey(keyId);
        return;
      }
      if (keyId === "escape") {
        this.game.togglePause();
      } else if (keyId === "up") {
        this.heldVerticalKeys.add("up");
        this.updateVerticalInput();
      } else if (keyId === "down") {
        this.heldVerticalKeys.add("down");
        this.updateVerticalInput();
      } else if (keyId === "left") {
        this.requestLaneStep("left", -1);
      } else if (keyId === "right") {
        this.requestLaneStep("right", 1);
      } else if (keyId === "boost") {
        this.lastBoostEdgeTime = performance.now();
        this.game.useManualBoost();
      }
      return;
    }

    if (this.game.screen === "score") {
      if (keyId === "enter") {
        this.game.audio.playSfx("menu");
        this.game.handleRestartRun();
      } else if (keyId === "escape") {
        this.game.audio.playSfx("menu");
        this.game.showTitle();
      }
      return;
    }

    if (keyId === "enter" && this.game.screen === "title") {
      this.game.audio.playSfx("menu");
      this.game.startRaceFromTitle();
    } else if (keyId === "enter" && this.game.screen === "preRace") {
      this.game.audio.playSfx("menu");
      this.game.handleStartSeededRace();
    } else if (keyId === "enter" && this.game.screen === "partyTurn") {
      this.game.audio.playSfx("menu");
      this.game.startCurrentPartyRun();
    } else if (keyId === "enter" && this.game.screen === "partyStandings") {
      this.game.audio.playSfx("menu");
      this.game.handlePartyNextPlayer();
    } else if (keyId === "enter" && this.game.screen === "partyFinal") {
      this.game.audio.playSfx("menu");
      this.game.handlePartyRematch(true);
    } else if (keyId === "escape" && !["title", "game"].includes(this.game.screen)) {
      this.game.audio.playSfx("menu");
      this.game.showTitle();
    }
  }

  onKeyUp(event) {
    const keyId = this.getKeyId(event);
    if (keyId) {
      this.activeKeys.delete(keyId);
      this.suppressedUntilKeyup.delete(keyId);
    }
    if (keyId === "up") {
      this.heldVerticalKeys.delete("up");
      this.updateVerticalInput();
    } else if (keyId === "down") {
      this.heldVerticalKeys.delete("down");
      this.updateVerticalInput();
    }
  }

  update(dt) {
    void dt;
  }

  getKeyId(event) {
    const key = event.key;
    const lower = String(key || "").toLowerCase();
    if (key === "ArrowLeft" || lower === "a") return "left";
    if (key === "ArrowRight" || lower === "d") return "right";
    if (key === "ArrowUp" || lower === "w") return "up";
    if (key === "ArrowDown" || lower === "s") return "down";
    if (key === " " || key === "Spacebar" || event.code === "Space") return "boost";
    if (key === "Escape") return "escape";
    if (key === "Enter") return "enter";
    return "";
  }

  shouldPreventDefault(keyId, key) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Spacebar", "Enter", "Escape"].includes(key)) return true;
    return this.game.screen === "game" && ["left", "right", "up", "down", "boost"].includes(keyId);
  }

  isEditableTarget(target) {
    const tagName = String(target?.tagName || "").toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable;
  }

  isControlKey(keyId) {
    return ["left", "right", "up", "down", "boost", "escape", "enter"].includes(keyId);
  }

  shouldSuppressGameplayInput(keyId) {
    if (!["left", "right", "up", "down", "boost"].includes(keyId)) return false;
    const run = this.game.run;
    return !run || run.ended || run.paused || !run.raceActive || this.suppressedUntilKeyup.has(keyId);
  }

  canProcessGameplayInput() {
    const run = this.game.run;
    return this.game.screen === "game" && run && !run.paused && !run.ended && !run.debugFrozen && run.raceActive;
  }

  requestLaneStep(keyId, direction) {
    if (this.suppressedUntilKeyup.has(keyId)) return;
    this.lastLaneInput = keyId;
    this.lastLaneInputTime = performance.now();
    this.game.requestLaneMove(direction, "press");
  }

  releaseGameplayKey(keyId) {
    if (keyId === "up" || keyId === "down") {
      this.heldVerticalKeys.delete(keyId);
      this.updateVerticalInput();
    }
  }

  clearGameplayInput() {
    this.activeKeys.clear();
    this.suppressedUntilKeyup.clear();
    this.heldVerticalKeys.clear();
    this.game.setVerticalInput(0);
  }

  clearCountdownInputLocks() {
    ["left", "right", "up", "down", "boost"].forEach((keyId) => {
      if (this.activeKeys.has(keyId)) this.suppressedUntilKeyup.add(keyId);
    });
    this.heldVerticalKeys.clear();
    this.game.setVerticalInput(0);
  }

  updateVerticalInput() {
    const up = this.heldVerticalKeys.has("up");
    const down = this.heldVerticalKeys.has("down");
    this.game.setVerticalInput(up === down ? 0 : (up ? -1 : 1));
  }

  getDebugInfo() {
    const now = performance.now();
    return {
      heldKeys: Array.from(this.activeKeys).filter((key) => this.isControlKey(key)).join(", ") || "none",
      suppressedKeys: Array.from(this.suppressedUntilKeyup).join(", ") || "none",
      lastKey: this.lastKeyPressed,
      lastKeyAgeMs: this.lastKeyTime ? Math.max(0, now - this.lastKeyTime) : null,
      leftKeyDown: this.activeKeys.has("left"),
      rightKeyDown: this.activeKeys.has("right"),
      boostKeyDown: this.activeKeys.has("boost"),
      leftRightRepeatIgnoredCount: this.leftRightRepeatIgnoredCount,
      boostRepeatIgnoredCount: this.boostRepeatIgnoredCount,
      lastLaneInput: this.lastLaneInput,
      lastLaneInputAgeMs: this.lastLaneInputTime ? Math.max(0, now - this.lastLaneInputTime) : null,
      boostEdgeTriggered: this.lastBoostEdgeTime ? now - this.lastBoostEdgeTime <= 180 : false,
      boostEdgeAgeMs: this.lastBoostEdgeTime ? Math.max(0, now - this.lastBoostEdgeTime) : null,
      verticalHeld: Array.from(this.heldVerticalKeys).join(", ") || "none"
    };
  }
}

// ---------------------------------------------------------------------------
// Obstacle manager
// ---------------------------------------------------------------------------

class RoadDirector {
  constructor(manager) {
    this.manager = manager;
    this.reset(null);
  }

  reset(track) {
    this.track = track;
    this.currentWave = null;
    this.lastWaveType = "";
    this.sameWaveStreak = 0;
    this.recentWaves = [];
    this.centerLaneHoldSeconds = 0;
    this.centerSafeSeconds = 0;
    this.decisionSafeSeconds = 0;
    this.timeSinceWaveSeconds = 0;
    this.timeSinceMeaningfulWaveSeconds = 0;
    this.activeEmptySeconds = 0;
    this.laneStillSeconds = 0;
    this.lastObservedLane = TRACK_DIRECTOR.centerLane;
    this.laneSafeSeconds = Array(LANES).fill(0);
    this.forceRecoveryNext = false;
    this.lastFairnessPassed = true;
    this.stats = this.createStats();
    this.seedLockLastCenterBlockDistance = 0;
    this.seedLockLastMovementDistance = 0;
    this.seedLockLastMeaningfulWaveDistance = 0;
  }

  createStats() {
    return {
      totalWaves: 0,
      nonOpeningWaves: 0,
      centerBlockedWaves: 0,
      nonOpeningCenterBlockedWaves: 0,
      blockedLaneSum: 0,
      repeatedPatternCount: 0,
      hardWaveCount: 0,
      recoveryWaveCount: 0,
      fairnessFailures: 0,
      pressureBudgetFailures: 0,
      pressureCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      waveCounts: {},
      boostLaneCounts: Array(LANES).fill(0),
      rampLaneCounts: Array(LANES).fill(0),
      gasCanLaneCounts: Array(LANES).fill(0),
      obstacleTypeCounts: {},
      gasCanGapSeconds: [],
      longestGasCanGapSeconds: 0,
      fuelPatternCounts: {},
      movementGapSeconds: [],
      centerChallengeGapSeconds: [],
      waveGapSeconds: [],
      meaningfulWaveGapSeconds: [],
      longestCenterSafeSeconds: 0,
      longestWaveGapSeconds: 0,
      longestMeaningfulWaveGapSeconds: 0,
      longestActiveEmptySeconds: 0,
      meaningfulWaveCount: 0,
      rampUsefulCount: 0,
      longestLaneSafeSeconds: Array(LANES).fill(0),
      pressureBudgetSum: 0,
      pressureSum: 0,
      sectionStats: {}
    };
  }

  createSectionStats(section = FALLBACK_TRACK_SECTION) {
    return {
      id: section.id || FALLBACK_TRACK_SECTION.id,
      label: section.label || section.id || FALLBACK_TRACK_SECTION.label,
      totalWaves: 0,
      centerBlockedWaves: 0,
      blockedLaneSum: 0,
      hardWaveCount: 0,
      recoveryWaveCount: 0,
      meaningfulWaveCount: 0,
      fairnessFailures: 0,
      pressureBudgetFailures: 0,
      pressureSum: 0,
      pressureBudgetSum: 0,
      waveGapCount: 0,
      waveGapSum: 0,
      meaningfulWaveGapCount: 0,
      meaningfulWaveGapSum: 0,
      longestActiveEmptySeconds: 0,
      gasCanCount: 0,
      fuelPatternCounts: {},
      pressureCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      waveCounts: {}
    };
  }

  getSectionStats(stats, section) {
    const id = section?.id || FALLBACK_TRACK_SECTION.id;
    if (!stats.sectionStats[id]) {
      stats.sectionStats[id] = this.createSectionStats(section);
    }
    return stats.sectionStats[id];
  }

  random() {
    return this.manager.random();
  }

  isSeedLocked() {
    return Boolean(this.manager.game.run?.partySeedLocked);
  }

  getSeedLockedSecondsSince(distance, lastDistance, cruiseSpeed) {
    return Math.max(0, distance - Math.max(0, lastDistance || 0)) / Math.max(1, cruiseSpeed || 1);
  }

  update(dt) {
    const run = this.manager.game.run || {};
    const laneValue = Number.isFinite(run.renderLaneFloat)
      ? run.renderLaneFloat
      : (Number.isFinite(run.targetLane) ? run.targetLane : TRACK_DIRECTOR.centerLane);
    const currentLane = Math.round(clamp(laneValue, 0, LANES - 1));
    if (currentLane === TRACK_DIRECTOR.centerLane) {
      this.centerLaneHoldSeconds += dt;
    } else {
      this.centerLaneHoldSeconds = Math.max(0, this.centerLaneHoldSeconds - dt * 1.5);
    }
    if (currentLane === this.lastObservedLane) {
      this.laneStillSeconds += dt;
    } else {
      this.lastObservedLane = currentLane;
      this.laneStillSeconds = 0;
    }
    this.centerSafeSeconds += dt;
    this.decisionSafeSeconds += dt;
    this.timeSinceWaveSeconds += dt;
    this.timeSinceMeaningfulWaveSeconds += dt;
    if (this.hasActivePressureAhead()) {
      this.activeEmptySeconds = 0;
    } else {
      this.activeEmptySeconds += dt;
    }
    this.stats.longestCenterSafeSeconds = Math.max(this.stats.longestCenterSafeSeconds, this.centerSafeSeconds);
    this.stats.longestWaveGapSeconds = Math.max(this.stats.longestWaveGapSeconds, this.timeSinceWaveSeconds);
    this.stats.longestMeaningfulWaveGapSeconds = Math.max(this.stats.longestMeaningfulWaveGapSeconds, this.timeSinceMeaningfulWaveSeconds);
    this.stats.longestActiveEmptySeconds = Math.max(this.stats.longestActiveEmptySeconds, this.activeEmptySeconds);
    const track = this.track || this.manager.track;
    if (track) {
      const progress = clamp((run.distance || 0) / Math.max(1, track.distanceToFinish), 0, 1);
      const sectionStats = this.getSectionStats(this.stats, getTrackSection(track, progress));
      sectionStats.longestActiveEmptySeconds = Math.max(sectionStats.longestActiveEmptySeconds, this.activeEmptySeconds);
    }
    for (let lane = 0; lane < LANES; lane += 1) {
      this.laneSafeSeconds[lane] += dt;
      this.stats.longestLaneSafeSeconds[lane] = Math.max(this.stats.longestLaneSafeSeconds[lane], this.laneSafeSeconds[lane]);
    }
  }

  getContext(distance) {
    const track = this.track || this.manager.track;
    const run = this.manager.game.run || {};
    const progress = clamp(distance / Math.max(1, track.distanceToFinish), 0, 1);
    const band = getTrackDirectorBand(progress);
    const section = getTrackSection(track, progress);
    const sectionProgress = getTrackSectionProgress(section, progress);
    const sectionPressureMultiplier = getSectionNumber(section, "pressureMultiplier", 1, 0.25, 2.4);
    const difficulty = track.difficultyCurve(progress);
    const speedClassId = this.manager.getSpeedClassId();
    const raceTypeId = this.manager.getRaceTypeId();
    const cadence = getTrackDirectorCadence(speedClassId);
    const modeIntensity = TRACK_DIRECTOR.modeIntensity[speedClassId] || 1;
    const cruiseSpeed = getTrackCruiseSpeed(track, progress, speedClassId);
    const seedLocked = this.isSeedLocked();
    let playerLane = Math.round(clamp(
      Number.isFinite(run.targetLane) ? run.targetLane : TRACK_DIRECTOR.centerLane,
      0,
      LANES - 1
    ));
    let centerSafeSeconds = this.centerSafeSeconds;
    let centerHoldSeconds = this.centerLaneHoldSeconds;
    let laneStillSeconds = this.laneStillSeconds;
    let meaningfulGapSeconds = this.timeSinceMeaningfulWaveSeconds;
    if (seedLocked) {
      playerLane = TRACK_DIRECTOR.centerLane;
      centerSafeSeconds = this.getSeedLockedSecondsSince(distance, this.seedLockLastCenterBlockDistance, cruiseSpeed);
      centerHoldSeconds = distance / Math.max(1, cruiseSpeed);
      laneStillSeconds = this.getSeedLockedSecondsSince(distance, this.seedLockLastMovementDistance, cruiseSpeed);
      meaningfulGapSeconds = this.getSeedLockedSecondsSince(distance, this.seedLockLastMeaningfulWaveDistance, cruiseSpeed);
    }
    const bandT = clamp((progress - band.min) / Math.max(0.001, band.max - band.min), 0, 1);
    const budget = lerp(band.budget[0], band.budget[1], bandT) * modeIntensity * sectionPressureMultiplier;
    const centerSafeLimit = cadence.centerSafe ?? TRACK_DIRECTOR.centerSafeSecondsLimit;
    const centerChallengeMinSeconds = TRACK_DIRECTOR.centerChallengeMinSeconds[speedClassId] ?? Math.max(2.5, centerSafeLimit * 0.65);
    const centerSoftPressure = (TRACK_DIRECTOR.centerSoftPressure[speedClassId] ?? 0.32) * getSectionNumber(section, "centerSoftPressureMultiplier", sectionPressureMultiplier, 0.35, 2);
    const centerRestChance = clamp((TRACK_DIRECTOR.centerRestChance[speedClassId] ?? 0.5) / getSectionNumber(section, "pressureMultiplier", 1, 0.55, 1.6), 0.02, 0.9);
    const pressureBudgetAllowance = TRACK_DIRECTOR.pressureBudgetAllowance[speedClassId] ?? 1.1;
    const laneStillLimit = cadence.laneStill ?? 3;
    const centerHoldLimit = cadence.centerHold ?? TRACK_DIRECTOR.centerHoldSeconds;
    const centerHoldPressure = centerHoldSeconds >= centerHoldLimit
      && centerSafeSeconds >= centerChallengeMinSeconds;
    const centerNeedsChallenge = progress > 0.12
      && (centerHoldPressure || centerSafeSeconds >= centerSafeLimit);
    const needsMovementChallenge = progress > 0.16 && laneStillSeconds >= laneStillLimit;
    const allowSoftCenterPressure = progress > 0.18
      && !centerNeedsChallenge
      && centerSafeSeconds >= centerChallengeMinSeconds * 0.92;
    const forceMeaningful = meaningfulGapSeconds >= (cadence.forceMeaningful ?? 3) * getSectionNumber(section, "forceMeaningfulMultiplier", 1, 0.45, 1.8);

    return {
      track,
      run,
      distance,
      progress,
      band,
      section,
      sectionProgress,
      sectionPressureMultiplier,
      difficulty,
      speedClassId,
      raceTypeId,
      fuelRun: isFuelRunRaceType(raceTypeId),
      fuel: this.manager.getFuelRunContext(distance),
      cadence,
      modeIntensity,
      playerLane,
      seedLocked,
      pressureBudget: budget,
      pressureBudgetAllowance,
      centerNeedsChallenge,
      centerHoldPressure,
      allowSoftCenterPressure,
      centerSoftPressure,
      centerRestChance,
      needsMovementChallenge,
      forceMeaningful,
      cruiseSpeed
    };
  }

  spawnWave(distance) {
    const context = this.getContext(distance);
    const waveType = this.chooseWaveType(context) || "singleBlocker";
    const result = this.createWaveResult(waveType, context);
    this.applyWave(waveType, distance, context, result);

    if (!result.spawned.length && waveType !== "recoveryGap") {
      this.applyWave("singleBlocker", distance + 40, context, result);
      result.fallbackUsed = true;
    }

    this.recordWave(result, context);
    return result;
  }

  getSectionWaveWeight(type, context) {
    const multipliers = context.section?.waveWeightMultipliers || {};
    return getSectionNumber({ value: multipliers[type] }, "value", 1, 0, 4);
  }

  chooseWaveType(context) {
    if (context.fuelRun) {
      return this.chooseFuelRunWaveType(context);
    }
    if (this.forceRecoveryNext) {
      this.forceRecoveryNext = false;
      return "recoveryGap";
    }
    if (context.forceMeaningful) {
      return this.chooseForcedMeaningfulWave(context);
    }

    const entries = Object.entries(context.band.weights).map(([type, baseWeight]) => {
      let weight = baseWeight;
      if (!this.isWaveAllowed(type, context)) return { value: type, weight: 0 };
      weight *= this.getSectionWaveWeight(type, context);
      if (!context.centerNeedsChallenge && type === "centerBlock") {
        weight *= context.centerSoftPressure;
      }

      if (context.centerNeedsChallenge) {
        if (["centerBlock", "constructionSqueeze", "nearMissCorridor"].includes(type)) weight *= 3.1;
        if (["doubleGate", "offsetPair", "leftRightSweep", "boostTemptation", "rampEscape"].includes(type)) weight *= 1.7;
        if (type === "singleBlocker") weight *= 1.2;
      }
      if (context.needsMovementChallenge) {
        if (["offsetPair", "leftRightSweep", "constructionSqueeze", "nearMissCorridor", "rampEscape"].includes(type)) weight *= 1.85;
        if (["centerBlock", "doubleGate", "boostTemptation"].includes(type)) weight *= 1.35;
        if (type === "recoveryGap") weight *= 0.25;
      }

      if (this.lastWaveType === type) {
        weight *= this.sameWaveStreak >= 2 ? 0.08 : 0.28;
      }

      if (context.speedClassId === "sunday") {
        if (type === "singleBlocker") weight *= 1.35;
        if (type === "doubleGate") weight *= 1.12;
        if (["offsetPair", "leftRightSweep", "rampEscape"].includes(type)) weight *= 0.72;
        if (["deerCrossing", "constructionSqueeze"].includes(type)) weight *= 0.38;
        if (type === "centerBlock") weight *= 0.62;
        if (type === "rampEscape") weight *= 0.75;
        if (type === "recoveryGap") weight *= 1.25;
      } else if (context.speedClassId === "rookie") {
        if (["nearMissCorridor", "deerCrossing"].includes(type)) weight *= 0.72;
        if (type === "fourLaneSpike") weight = 0;
      } else if (context.speedClassId === "arcade") {
        if (["offsetPair", "leftRightSweep", "constructionSqueeze", "nearMissCorridor"].includes(type)) weight *= 1.08;
        if (type === "centerBlock") weight *= 1.16;
        if (type === "singleBlocker") weight *= 0.86;
      } else if (context.speedClassId === "pro") {
        if (["offsetPair", "leftRightSweep", "constructionSqueeze", "nearMissCorridor", "rampEscape"].includes(type)) weight *= 1.36;
        if (["centerBlock", "boostTemptation"].includes(type)) weight *= 1.3;
        if (type === "singleBlocker") weight *= 0.64;
        if (type === "doubleGate") weight *= 0.78;
        if (type === "recoveryGap") weight *= 0.42;
      } else if (context.speedClassId === "turbo") {
        if (type === "centerBlock") weight *= 2.35;
        if (["offsetPair", "leftRightSweep", "constructionSqueeze"].includes(type)) weight *= 2.85;
        if (type === "nearMissCorridor") weight *= 3.1;
        if (type === "rampEscape") weight *= 2.15;
        if (type === "boostTemptation") weight *= 2.25;
        if (type === "fourLaneSpike") weight *= 5.2;
        if (type === "singleBlocker") weight *= 0.08;
        if (type === "doubleGate") weight *= 0.2;
        if (type === "recoveryGap") weight *= 0.1;
      }

      const expectedPressure = this.getExpectedWavePressure(type, context);
      const pressureCap = context.pressureBudget + context.pressureBudgetAllowance;
      if (expectedPressure > pressureCap) weight *= 0.62;
      if (context.band.id !== "opening" && expectedPressure < context.pressureBudget * 0.45 && type !== "recoveryGap") {
        weight *= 0.72;
      }

      if (this.recentWaves.slice(-3).some((wave) => wave.type === type)) {
        weight *= 0.62;
      }

      return { value: type, weight };
    });

    return weightedChoice(entries, () => this.random());
  }

  chooseForcedMeaningfulWave(context) {
    const weights = [
      { value: "doubleGate", weight: context.band.id === "opening" ? 1.5 : 1.1 },
      { value: "centerBlock", weight: context.centerNeedsChallenge ? 2.4 : 1.2 },
      { value: "offsetPair", weight: context.band.id === "opening" ? 0.8 : 1.6 },
      { value: "leftRightSweep", weight: context.band.id === "opening" ? 0 : 1.5 },
      { value: "constructionSqueeze", weight: this.isWaveAllowed("constructionSqueeze", context) ? 1.5 : 0 },
      { value: "nearMissCorridor", weight: this.isWaveAllowed("nearMissCorridor", context) ? 1.35 : 0 },
      { value: "rampEscape", weight: this.isWaveAllowed("rampEscape", context) ? 0.95 : 0 },
      { value: "boostTemptation", weight: context.band.id === "opening" ? 0 : 0.9 }
    ];
    if (context.speedClassId === "turbo") {
      weights.find((item) => item.value === "centerBlock").weight *= 1.9;
      weights.find((item) => item.value === "nearMissCorridor").weight *= 1.75;
      weights.find((item) => item.value === "leftRightSweep").weight *= 1.55;
      weights.find((item) => item.value === "constructionSqueeze").weight *= 1.45;
      weights.find((item) => item.value === "rampEscape").weight *= 1.35;
      weights.find((item) => item.value === "boostTemptation").weight *= 1.45;
      weights.find((item) => item.value === "doubleGate").weight *= 0.58;
    } else if (context.speedClassId === "pro") {
      weights.find((item) => item.value === "nearMissCorridor").weight *= 1.35;
      weights.find((item) => item.value === "leftRightSweep").weight *= 1.25;
      weights.find((item) => item.value === "doubleGate").weight *= 0.8;
    } else if (context.speedClassId === "sunday") {
      weights.find((item) => item.value === "centerBlock").weight *= 0.52;
      weights.find((item) => item.value === "offsetPair").weight *= 0.75;
      weights.find((item) => item.value === "constructionSqueeze").weight = context.progress > 0.55 ? 0.42 : 0;
      weights.find((item) => item.value === "nearMissCorridor").weight = 0;
      weights.find((item) => item.value === "leftRightSweep").weight *= 0.4;
    }
    weights.forEach((item) => {
      item.weight *= this.getSectionWaveWeight(item.value, context);
    });
    return weightedChoice(weights, () => this.random()) || "doubleGate";
  }

  chooseFuelRunWaveType(context) {
    if (this.forceRecoveryNext) {
      this.forceRecoveryNext = false;
      return context.fuel?.timeSinceLastGasCan >= (context.fuel?.minGasGapSeconds || 8)
        ? "fuelAfterPressure"
        : "fuelTrafficPressure";
    }
    const fuel = context.fuel || {};
    const timeSinceGas = Number.isFinite(fuel.timeSinceLastGasCan) ? fuel.timeSinceLastGasCan : 0;
    const minGap = fuel.minGasGapSeconds || 8;
    const targetGap = fuel.targetGasGapSeconds || 16;
    const maxGap = fuel.maxGasGapSeconds || 24;
    const pastOpeningGrace = context.progress > 0.06 || (context.run.elapsed || 0) >= FUEL_RUN_CONFIG.initialGasGraceSeconds;
    const low = Boolean(fuel.low);
    const critical = Boolean(fuel.critical);
    const overdue = pastOpeningGrace && timeSinceGas >= maxGap;
    const due = pastOpeningGrace && timeSinceGas >= targetGap;
    const canSpawnFuel = pastOpeningGrace && timeSinceGas >= minGap && context.progress < 0.97;

    if (critical && canSpawnFuel && (overdue || this.random() < 0.82)) {
      return "fuelLowRescue";
    }
    if ((low || overdue) && canSpawnFuel) {
      return weightedChoice([
        { value: "fuelTrafficGate", weight: 2.4 },
        { value: "fuelAfterPressure", weight: 1.8 },
        { value: "fuelSideTemptation", weight: low ? 1.25 : 1.55 },
        { value: "fuelSplit", weight: context.progress > 0.28 ? 0.55 : 0.12 },
        { value: "fuelLowRescue", weight: critical ? 1.6 : 0.28 }
      ], () => this.random()) || "fuelTrafficGate";
    }
    if (due && canSpawnFuel && this.random() < 0.72) {
      return weightedChoice([
        { value: "fuelSideTemptation", weight: 1.7 },
        { value: "fuelTrafficGate", weight: 1.55 },
        { value: "fuelAfterPressure", weight: 1.1 },
        { value: "fuelSplit", weight: context.progress > 0.24 ? 0.48 : 0.08 }
      ], () => this.random()) || "fuelSideTemptation";
    }

    const supportWeight = context.progress > 0.18 && context.progress < 0.88 ? 1.7 : 0.72;
    return weightedChoice([
      { value: "fuelTrafficPressure", weight: context.forceMeaningful ? 3.2 : 2.55 },
      { value: "fuelTrafficGate", weight: canSpawnFuel ? (context.centerNeedsChallenge || context.needsMovementChallenge ? 1.8 : 1.05) : 0 },
      { value: "fuelSideTemptation", weight: canSpawnFuel ? 0.55 : 0 },
      { value: "fuelSupport", weight: supportWeight },
      { value: "fuelAfterPressure", weight: canSpawnFuel ? 0.36 : 0 }
    ], () => this.random()) || "fuelTrafficPressure";
  }

  isWaveAllowed(type, context) {
    if (type === "fourLaneSpike") {
      if (context.progress < TRACK_DIRECTOR.fourLaneMinProgress) return false;
      if (context.speedClassId !== "pro" && context.speedClassId !== "turbo") return false;
      return context.distance - this.manager.lastFourLanePressureDistance >= FOUR_LANE_PRESSURE_COOLDOWN;
    }
    if (context.speedClassId === "sunday") {
      if (type === "nearMissCorridor") return false;
      if (type === "deerCrossing" && context.progress < 0.55) return false;
      if (type === "constructionSqueeze" && context.progress < 0.34) return false;
    }
    if (context.speedClassId === "rookie") {
      if (type === "nearMissCorridor" && context.progress < 0.55) return false;
      if (type === "deerCrossing" && context.progress < 0.35) return false;
    }
    if (type === "nearMissCorridor" && context.band.id === "opening") return false;
    if (type === "deerCrossing" && context.progress < 0.22) return false;
    if (type === "constructionSqueeze" && context.progress < 0.18) return false;
    return true;
  }

  getExpectedWavePressure(type, context) {
    const difficultyBonus = context.difficulty * 0.45;
    const estimates = {
      recoveryGap: 0,
      singleBlocker: 1.1,
      doubleGate: context.progress > 0.42 && context.speedClassId !== "sunday" ? 2.55 : 2,
      offsetPair: context.progress > 0.36 && context.speedClassId !== "sunday" ? 2.6 : 2,
      centerBlock: context.progress > 0.48 && ["arcade", "pro", "turbo"].includes(context.speedClassId) ? 2.8 : 1.8,
      leftRightSweep: context.speedClassId === "sunday" ? 1.7 : (context.band.id === "final" ? 3.35 : 2.65),
      constructionSqueeze: context.speedClassId === "sunday" ? 2.1 : 3.05,
      deerCrossing: context.speedClassId === "sunday" ? 1.1 : 2.1,
      rampEscape: context.speedClassId === "sunday" ? 0.5 : 1.3,
      boostTemptation: 1.45,
      nearMissCorridor: context.speedClassId === "rookie" ? 2.2 : 3.45,
      fourLaneSpike: 4.75
    };
    return (estimates[type] ?? 2) + difficultyBonus;
  }

  createWaveResult(type, context) {
    return {
      type,
      label: this.getWaveLabel(type),
      band: context.band,
      section: context.section,
      sectionProgress: context.sectionProgress,
      pressureBudget: context.pressureBudget,
      spawned: [],
      blockedLanes: new Set(),
      boostLanes: [],
      rampLanes: [],
      gasCanLanes: [],
      obstacleTypes: {},
      pressure: 0,
      centerBlocked: false,
      fairnessPassed: true,
      hard: false,
      fallbackUsed: false
    };
  }

  getWaveLabel(type) {
    const labels = {
      singleBlocker: "Single Blocker",
      doubleGate: "Double Gate",
      offsetPair: "Offset Pair",
      centerBlock: "Center Block",
      leftRightSweep: "Left-Right Sweep",
      constructionSqueeze: "Construction Squeeze",
      deerCrossing: "Deer Crossing",
      rampEscape: "Ramp Escape",
      boostTemptation: "Boost Temptation",
      nearMissCorridor: "Near-Miss Corridor",
      fourLaneSpike: "Four-Lane Spike",
      fuelTrafficPressure: "Fuel Traffic Pressure",
      fuelSideTemptation: "Gas Can Side Temptation",
      fuelTrafficGate: "Traffic Gate + Fuel",
      fuelAfterPressure: "Fuel After Pressure",
      fuelSplit: "Fuel Split",
      fuelLowRescue: "Low Fuel Rescue",
      fuelSupport: "Fuel Support",
      recoveryGap: "Recovery Gap"
    };
    return labels[type] || type;
  }

  applyWave(type, distance, context, result) {
    const handlers = {
      singleBlocker: () => this.waveSingleBlocker(distance, context, result),
      doubleGate: () => this.waveDoubleGate(distance, context, result),
      offsetPair: () => this.waveOffsetPair(distance, context, result),
      centerBlock: () => this.waveCenterBlock(distance, context, result),
      leftRightSweep: () => this.waveLeftRightSweep(distance, context, result),
      constructionSqueeze: () => this.waveConstructionSqueeze(distance, context, result),
      deerCrossing: () => this.waveDeerCrossing(distance, context, result),
      rampEscape: () => this.waveRampEscape(distance, context, result),
      boostTemptation: () => this.waveBoostTemptation(distance, context, result),
      nearMissCorridor: () => this.waveNearMissCorridor(distance, context, result),
      fourLaneSpike: () => this.waveFourLaneSpike(distance, context, result),
      fuelTrafficPressure: () => this.waveFuelTrafficPressure(distance, context, result),
      fuelSideTemptation: () => this.waveFuelSideTemptation(distance, context, result),
      fuelTrafficGate: () => this.waveFuelTrafficGate(distance, context, result),
      fuelAfterPressure: () => this.waveFuelAfterPressure(distance, context, result),
      fuelSplit: () => this.waveFuelSplit(distance, context, result),
      fuelLowRescue: () => this.waveFuelLowRescue(distance, context, result),
      fuelSupport: () => this.waveFuelSupport(distance, context, result),
      recoveryGap: () => this.waveRecoveryGap(distance, context, result)
    };
    (handlers[type] || handlers.singleBlocker)();
  }

  spawn(type, lane, distance, result, options = {}) {
    const spawned = this.manager.addObstacle(type, lane, distance, {
      allowLaneAdjust: false,
      ...options
    });
    if (spawned) this.recordPlacement(spawned, result);
    return spawned;
  }

  trySpawn(type, preferredLanes, distance, result, options = {}) {
    const lanes = Array.isArray(preferredLanes) ? preferredLanes : [preferredLanes];
    for (const lane of lanes) {
      if (!Number.isFinite(lane)) continue;
      const spawned = this.spawn(type, lane, distance, result, options);
      if (spawned) return spawned;
    }
    return null;
  }

  recordPlacement(obstacle, result) {
    result.spawned.push(obstacle);
    result.obstacleTypes[obstacle.type] = (result.obstacleTypes[obstacle.type] || 0) + 1;
    result.pressure += TRACK_DIRECTOR.pressureValues[obstacle.type] || 0;

    const lane = Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1));
    if (obstacle.type === "boostPad") {
      result.boostLanes.push(lane);
    } else if (obstacle.type === "ramp") {
      result.rampLanes.push(lane);
    } else if (obstacle.type === "gasCan") {
      result.gasCanLanes.push(lane);
    }

    if (this.manager.isFairnessBlocker(obstacle)) {
      const blockedLane = obstacle.type === "deer" ? TRACK_DIRECTOR.centerLane : lane;
      result.blockedLanes.add(blockedLane);
      if (blockedLane === TRACK_DIRECTOR.centerLane) result.centerBlocked = true;
    }
  }

  recordFuelPlacement(obstacle, context, result, pattern = result?.type || "fuel") {
    if (!obstacle) return;
    const run = context.run || this.manager.game.run || {};
    const lane = Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1));
    const gap = Math.max(0, Number.isFinite(run.timeSinceLastGasCan) ? run.timeSinceLastGasCan : 0);
    const stats = this.stats;
    const sectionStats = this.getSectionStats(stats, context.section);
    stats.gasCanGapSeconds.push(gap);
    stats.longestGasCanGapSeconds = Math.max(stats.longestGasCanGapSeconds || 0, gap);
    stats.gasCanLaneCounts[lane] += 1;
    stats.fuelPatternCounts[pattern] = (stats.fuelPatternCounts[pattern] || 0) + 1;
    sectionStats.gasCanCount = (sectionStats.gasCanCount || 0) + 1;
    sectionStats.fuelPatternCounts[pattern] = (sectionStats.fuelPatternCounts[pattern] || 0) + 1;

    run.gasCansSpawned = Math.max(0, (run.gasCansSpawned || 0) + 1);
    run.lastGasCanDistance = obstacle.distance;
    run.maxTimeBetweenGasCans = Math.max(run.maxTimeBetweenGasCans || 0, gap);
    if (Array.isArray(run.gasCanGapSamples)) run.gasCanGapSamples.push(gap);
    if (run.fuelOpportunitiesBySection && context.section?.id) {
      run.fuelOpportunitiesBySection[context.section.id] = (run.fuelOpportunitiesBySection[context.section.id] || 0) + 1;
    }
    run.timeSinceLastGasCan = 0;

    if (run.simulateFuelPickups && isFuelRunRaceType(run.raceTypeId)) {
      const restore = Number.isFinite(run.gasCanRestoreAmount) ? run.gasCanRestoreAmount : getFuelRunTuning(run.speedClassId).gasCanRestoreAmount;
      run.fuel = clamp((run.fuel || 0) + restore * 0.85, 0, run.fuelMax || FUEL_RUN_CONFIG.fuelMax);
      run.simulatedFuelRestored = (run.simulatedFuelRestored || 0) + restore;
    }
  }

  recordWave(result, context) {
    const blockedCount = clamp(result.blockedLanes.size, 0, 5);
    const safety = this.manager.validateObstaclePattern(
      this.manager.getSpawnValidationObstacles(context.distance),
      this.manager.getSafetyRunDistance(context.distance)
    );
    result.fairnessPassed = !safety.invalid;
    result.maxDangerBlocked = safety.maxBlocked;
    result.pressureBudgetPassed = result.pressure <= context.pressureBudget + context.pressureBudgetAllowance;
    result.hard = result.type === "fourLaneSpike"
      || blockedCount >= 3
      || result.pressure >= context.pressureBudget + 0.45;

    const stats = this.stats;
    const sectionStats = this.getSectionStats(stats, context.section);
    const waveGapSeconds = this.timeSinceWaveSeconds;
    const meaningfulGapSeconds = this.timeSinceMeaningfulWaveSeconds;
    stats.totalWaves += 1;
    if (context.band.id !== "opening") stats.nonOpeningWaves += 1;
    stats.blockedLaneSum += blockedCount;
    stats.pressureCounts[blockedCount] = (stats.pressureCounts[blockedCount] || 0) + 1;
    stats.waveCounts[result.type] = (stats.waveCounts[result.type] || 0) + 1;
    stats.pressureBudgetSum += context.pressureBudget;
    stats.pressureSum += result.pressure;
    sectionStats.totalWaves += 1;
    sectionStats.blockedLaneSum += blockedCount;
    sectionStats.pressureCounts[blockedCount] = (sectionStats.pressureCounts[blockedCount] || 0) + 1;
    sectionStats.waveCounts[result.type] = (sectionStats.waveCounts[result.type] || 0) + 1;
    sectionStats.pressureBudgetSum += context.pressureBudget;
    sectionStats.pressureSum += result.pressure;
    if (result.hard) stats.hardWaveCount += 1;
    if (result.type === "recoveryGap") stats.recoveryWaveCount += 1;
    if (!result.fairnessPassed) stats.fairnessFailures += 1;
    if (!result.pressureBudgetPassed) stats.pressureBudgetFailures += 1;
    if (result.hard) sectionStats.hardWaveCount += 1;
    if (result.type === "recoveryGap") sectionStats.recoveryWaveCount += 1;
    if (!result.fairnessPassed) sectionStats.fairnessFailures += 1;
    if (!result.pressureBudgetPassed) sectionStats.pressureBudgetFailures += 1;
    stats.waveGapSeconds.push(waveGapSeconds);
    stats.longestWaveGapSeconds = Math.max(stats.longestWaveGapSeconds, waveGapSeconds);
    sectionStats.waveGapCount += 1;
    sectionStats.waveGapSum += waveGapSeconds;
    this.timeSinceWaveSeconds = 0;

    if (this.lastWaveType === result.type) {
      this.sameWaveStreak += 1;
      stats.repeatedPatternCount += 1;
    } else {
      this.sameWaveStreak = 0;
    }

    if (result.centerBlocked) {
      stats.centerBlockedWaves += 1;
      if (context.band.id !== "opening") stats.nonOpeningCenterBlockedWaves += 1;
      stats.centerChallengeGapSeconds.push(this.centerSafeSeconds);
      sectionStats.centerBlockedWaves += 1;
      this.centerSafeSeconds = 0;
    }

    const requiresMovement = result.centerBlocked || blockedCount >= 2 || result.type === "boostTemptation" || result.type === "rampEscape";
    if (requiresMovement) {
      stats.movementGapSeconds.push(this.decisionSafeSeconds);
      this.decisionSafeSeconds = 0;
    }
    const activePressureRunDistance = context.seedLocked ? this.manager.getSafetyRunDistance(context.distance) : undefined;
    const activePressureObstacles = context.seedLocked ? this.manager.getSpawnValidationObstacles(context.distance) : undefined;
    const meaningfulWave = result.type !== "recoveryGap" && (blockedCount > 0 || this.hasActivePressureAhead(activePressureRunDistance, activePressureObstacles));
    if (meaningfulWave) {
      stats.meaningfulWaveCount += 1;
      stats.meaningfulWaveGapSeconds.push(meaningfulGapSeconds);
      stats.longestMeaningfulWaveGapSeconds = Math.max(stats.longestMeaningfulWaveGapSeconds, meaningfulGapSeconds);
      sectionStats.meaningfulWaveCount += 1;
      sectionStats.meaningfulWaveGapCount += 1;
      sectionStats.meaningfulWaveGapSum += meaningfulGapSeconds;
      this.timeSinceMeaningfulWaveSeconds = 0;
    }
    if (context.seedLocked) {
      if (result.centerBlocked) this.seedLockLastCenterBlockDistance = context.distance;
      if (requiresMovement) this.seedLockLastMovementDistance = context.distance;
      if (meaningfulWave) this.seedLockLastMeaningfulWaveDistance = context.distance;
    }
    if (result.type === "rampEscape" && result.rampLanes.length && blockedCount >= 2) {
      stats.rampUsefulCount += 1;
    }

    for (const lane of result.blockedLanes) {
      this.laneSafeSeconds[lane] = 0;
    }
    for (const lane of result.boostLanes) {
      stats.boostLaneCounts[lane] += 1;
    }
    for (const lane of result.rampLanes) {
      stats.rampLaneCounts[lane] += 1;
    }
    Object.entries(result.obstacleTypes).forEach(([type, count]) => {
      stats.obstacleTypeCounts[type] = (stats.obstacleTypeCounts[type] || 0) + count;
    });

    this.currentWave = {
      type: result.type,
      label: result.label,
      band: context.band.label,
      sectionId: context.section?.id || FALLBACK_TRACK_SECTION.id,
      sectionLabel: context.section?.label || FALLBACK_TRACK_SECTION.label,
      sectionProgress: context.sectionProgress,
      sectionPressureMultiplier: context.sectionPressureMultiplier,
      sectionVisualIntensity: getSectionNumber(context.section, "visualIntensity", 1, 0.5, 1.8),
      distance: Math.round(context.distance),
      pressureBudget: context.pressureBudget,
      pressure: result.pressure,
      blockedLanes: Array.from(result.blockedLanes).sort((a, b) => a - b),
      boostLanes: result.boostLanes.slice(),
      rampLanes: result.rampLanes.slice(),
      gasCanLanes: result.gasCanLanes.slice(),
      obstacles: result.spawned.map((obstacle) => ({
        type: obstacle.type,
        variant: obstacle.variant || "",
        lane: Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1)),
        distance: Math.round(obstacle.distance)
      })),
      lanePressureCount: blockedCount,
      centerBlocked: result.centerBlocked,
      fairnessPassed: result.fairnessPassed,
      pressureBudgetPassed: result.pressureBudgetPassed
    };
    if (Array.isArray(context.run.roadDirectorSequence)) {
      context.run.roadDirectorSequence.push({
        index: stats.totalWaves,
        type: this.currentWave.type,
        label: this.currentWave.label,
        sectionId: this.currentWave.sectionId,
        sectionLabel: this.currentWave.sectionLabel,
        sectionProgress: this.currentWave.sectionProgress,
        distance: this.currentWave.distance,
        blockedLanes: this.currentWave.blockedLanes.slice(),
        boostLanes: this.currentWave.boostLanes.slice(),
        rampLanes: this.currentWave.rampLanes.slice(),
        gasCanLanes: this.currentWave.gasCanLanes.slice(),
        obstacles: this.currentWave.obstacles.map((obstacle) => ({ ...obstacle }))
      });
      if (context.run.roadDirectorSequence.length > 40) {
        context.run.roadDirectorSequence.splice(0, context.run.roadDirectorSequence.length - 40);
      }
    }
    this.lastFairnessPassed = result.fairnessPassed;
    this.lastWaveType = result.type;
    this.recentWaves.push(this.currentWave);
    if (this.recentWaves.length > 6) this.recentWaves.shift();

    const modeRecoveryScale = context.cadence.recoveryScale ?? 1;
    const needsRecovery = result.type === "fourLaneSpike" || result.pressure >= context.pressureBudget + 1.25;
    if (needsRecovery && result.type !== "recoveryGap" && this.random() < TRACK_DIRECTOR.hardWaveRecoveryChance * modeRecoveryScale) {
      this.forceRecoveryNext = true;
    }
  }

  hasActivePressureAhead(runDistance = this.manager.game.run?.distance || 0, obstacles = this.manager.obstacles) {
    return obstacles.some((obstacle) => {
      if (!this.manager.isFairnessBlocker(obstacle)) return false;
      const ahead = obstacle.distance - runDistance;
      return ahead > 0 && ahead < VIEW_DISTANCE * 0.92;
    });
  }

  getSpacingMultiplier(result) {
    if (!result) return 1;
    const cadence = getTrackDirectorCadence(this.manager.getSpeedClassId());
    const sectionCadence = getSectionNumber(result.section, "cadenceMultiplier", 1, 0.5, 1.5);
    const sectionRecovery = result.type === "recoveryGap"
      ? getSectionNumber(result.section, "recoveryGapMultiplier", 1, 0.45, 1.6)
      : 1;
    const multipliers = {
      recoveryGap: 0.72,
      singleBlocker: 0.72,
      doubleGate: 0.88,
      offsetPair: 0.92,
      centerBlock: 0.82,
      leftRightSweep: 0.96,
      constructionSqueeze: 1.02,
      deerCrossing: 1.02,
      rampEscape: 0.94,
      boostTemptation: 0.78,
      nearMissCorridor: 1,
      fourLaneSpike: 1.16,
      fuelTrafficPressure: 0.88,
      fuelSideTemptation: 0.9,
      fuelTrafficGate: 0.94,
      fuelAfterPressure: 1.02,
      fuelSplit: 1.06,
      fuelLowRescue: 0.72,
      fuelSupport: 0.96
    };
    const recoveryScale = result.type === "recoveryGap" ? (cadence.recoveryScale ?? 1) : 1;
    return (multipliers[result.type] || 1) * (cadence.spacingScale ?? 1) * recoveryScale * sectionCadence * sectionRecovery;
  }

  getRandomSecondsScale(result) {
    if (!result) return 1;
    const cadence = getTrackDirectorCadence(this.manager.getSpeedClassId());
    const speedClassId = this.manager.getSpeedClassId();
    const sectionRandom = getSectionNumber(result.section, "cadenceMultiplier", 1, 0.5, 1.5);
    if (result.type === "recoveryGap") return 0.28 * (cadence.recoveryScale ?? 1) * sectionRandom;
    if (speedClassId === "turbo") return (result.hard ? 0.24 : 0.34) * sectionRandom;
    if (speedClassId === "pro") return (result.hard ? 0.32 : 0.44) * sectionRandom;
    if (result.hard) return 0.38 * sectionRandom;
    return 0.52 * sectionRandom;
  }

  getDebugInfo() {
    const current = this.currentWave || {};
    const run = this.manager.game.run || {};
    const progress = clamp((run.distance || 0) / Math.max(1, this.manager.track?.distanceToFinish || 1), 0, 1);
    const section = getTrackSection(this.manager.track, progress);
    return {
      seed: formatRoadSeed(run.roadSeed),
      raceType: getRaceTypeLabel(run.raceTypeId),
      fuelRunObjectMixActive: Boolean(run.fuelRunObjectMixActive),
      fuelAmount: Number.isFinite(run.fuel) ? run.fuel : 0,
      fuelDrainPerSecond: Number.isFinite(run.fuelDrainPerSecond) ? run.fuelDrainPerSecond : 0,
      timeSinceLastGasCan: Number.isFinite(run.timeSinceLastGasCan) ? run.timeSinceLastGasCan : 0,
      gasCansCollected: Math.max(0, Math.round(run.gasCansCollected || 0)),
      lowFuelActive: Boolean(run.lowFuelActive),
      criticalFuelActive: Boolean(run.criticalFuelActive),
      seedHash: Number.isFinite(run.roadSeedHash) ? run.roadSeedHash : 0,
      rngState: Number.isFinite(run.roadRngState) ? run.roadRngState : 0,
      band: current.band || getTrackDirectorBand(this.manager.game.run?.distance / Math.max(1, this.manager.track?.distanceToFinish || 1)).label,
      sectionId: current.sectionId || section.id,
      sectionLabel: current.sectionLabel || section.label,
      sectionProgress: Number.isFinite(current.sectionProgress) ? current.sectionProgress : getTrackSectionProgress(section, progress),
      sectionPressureMultiplier: Number.isFinite(current.sectionPressureMultiplier) ? current.sectionPressureMultiplier : getSectionNumber(section, "pressureMultiplier", 1, 0.25, 2.4),
      sectionVisualIntensity: Number.isFinite(current.sectionVisualIntensity) ? current.sectionVisualIntensity : getSectionNumber(section, "visualIntensity", 1, 0.5, 1.8),
      wave: current.label || "none",
      lastWave: this.lastWaveType ? this.getWaveLabel(this.lastWaveType) : "none",
      budget: Number.isFinite(current.pressureBudget) ? current.pressureBudget : 0,
      pressure: Number.isFinite(current.pressure) ? current.pressure : 0,
      centerSafeSeconds: this.centerSafeSeconds,
      centerHoldSeconds: this.centerLaneHoldSeconds,
      laneStillSeconds: this.laneStillSeconds,
      timeSinceWaveSeconds: this.timeSinceWaveSeconds,
      meaningfulGapSeconds: this.timeSinceMeaningfulWaveSeconds,
      lanePressureCount: Number.isFinite(current.lanePressureCount) ? current.lanePressureCount : 0,
      lanePressure: Array.isArray(current.blockedLanes) && current.blockedLanes.length ? current.blockedLanes.join(",") : "none",
      recentWaves: this.recentWaves.map((wave) => wave.label).join(" > "),
      fairnessPassed: this.lastFairnessPassed,
      pressureBudgetPassed: current.pressureBudgetPassed !== false
    };
  }

  formatSectionStats(stats) {
    return Object.fromEntries(Object.entries(stats.sectionStats || {}).map(([id, section]) => [id, {
      id: section.id || id,
      label: section.label || id,
      totalWaves: section.totalWaves,
      centerBlockedWaves: section.centerBlockedWaves,
      blockedLaneSum: section.blockedLaneSum,
      hardWaveCount: section.hardWaveCount,
      recoveryWaveCount: section.recoveryWaveCount,
      meaningfulWaveCount: section.meaningfulWaveCount,
      fairnessFailures: section.fairnessFailures,
      pressureBudgetFailures: section.pressureBudgetFailures,
      pressureSum: section.pressureSum,
      pressureBudgetSum: section.pressureBudgetSum,
      waveGapCount: section.waveGapCount,
      waveGapSum: section.waveGapSum,
      meaningfulWaveGapCount: section.meaningfulWaveGapCount,
      meaningfulWaveGapSum: section.meaningfulWaveGapSum,
      longestActiveEmptySeconds: section.longestActiveEmptySeconds,
      gasCanCount: section.gasCanCount || 0,
      fuelPatternCounts: { ...(section.fuelPatternCounts || {}) },
      pressureCounts: { ...section.pressureCounts },
      waveCounts: { ...section.waveCounts },
      averagePressure: section.totalWaves ? section.pressureSum / section.totalWaves : 0,
      averagePressureBudget: section.totalWaves ? section.pressureBudgetSum / section.totalWaves : 0,
      averageBlockedLanesPerWave: section.totalWaves ? section.blockedLaneSum / section.totalWaves : 0,
      centerBlockedPercent: section.totalWaves ? section.centerBlockedWaves / section.totalWaves : 0,
      hardWavePercent: section.totalWaves ? section.hardWaveCount / section.totalWaves : 0,
      recoveryWavePercent: section.totalWaves ? section.recoveryWaveCount / section.totalWaves : 0,
      meaningfulWavePercent: section.totalWaves ? section.meaningfulWaveCount / section.totalWaves : 0,
      averageWaveGapSeconds: section.waveGapCount ? section.waveGapSum / section.waveGapCount : null,
      averageMeaningfulWaveGapSeconds: section.meaningfulWaveGapCount ? section.meaningfulWaveGapSum / section.meaningfulWaveGapCount : null
    }]));
  }

  getSimulationStats() {
    const stats = this.stats;
    const averageGap = (items) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : null;
    const gapSum = (items) => items.reduce((sum, value) => sum + value, 0);
    return {
      totalWaves: stats.totalWaves,
      nonOpeningWaves: stats.nonOpeningWaves,
      centerBlockedWaves: stats.centerBlockedWaves,
      nonOpeningCenterBlockedWaves: stats.nonOpeningCenterBlockedWaves,
      repeatedPatternCount: stats.repeatedPatternCount,
      hardWaveCount: stats.hardWaveCount,
      recoveryWaveCount: stats.recoveryWaveCount,
      meaningfulWaveCount: stats.meaningfulWaveCount,
      rampUsefulCount: stats.rampUsefulCount,
      pressureBudgetFailures: stats.pressureBudgetFailures,
      blockedLaneSum: stats.blockedLaneSum,
      pressureBudgetSum: stats.pressureBudgetSum,
      averageBlockedLanesPerWave: stats.totalWaves ? stats.blockedLaneSum / stats.totalWaves : 0,
      centerBlockedPercent: stats.totalWaves ? stats.centerBlockedWaves / stats.totalWaves : 0,
      nonOpeningCenterBlockedPercent: stats.nonOpeningWaves ? stats.nonOpeningCenterBlockedWaves / stats.nonOpeningWaves : 0,
      longestCenterSafeSeconds: Math.max(stats.longestCenterSafeSeconds, this.centerSafeSeconds),
      averageDecisionGapSeconds: averageGap(stats.movementGapSeconds),
      averageCenterChallengeGapSeconds: averageGap(stats.centerChallengeGapSeconds),
      repeatedPatternPercent: stats.totalWaves ? stats.repeatedPatternCount / stats.totalWaves : 0,
      hardWavePercent: stats.totalWaves ? stats.hardWaveCount / stats.totalWaves : 0,
      recoveryWavePercent: stats.totalWaves ? stats.recoveryWaveCount / stats.totalWaves : 0,
      fairnessFailures: stats.fairnessFailures,
      movementGapCount: stats.movementGapSeconds.length,
      movementGapSum: gapSum(stats.movementGapSeconds),
      centerChallengeGapCount: stats.centerChallengeGapSeconds.length,
      centerChallengeGapSum: gapSum(stats.centerChallengeGapSeconds),
      waveGapCount: stats.waveGapSeconds.length,
      waveGapSum: gapSum(stats.waveGapSeconds),
      meaningfulWaveGapCount: stats.meaningfulWaveGapSeconds.length,
      meaningfulWaveGapSum: gapSum(stats.meaningfulWaveGapSeconds),
      averageWaveGapSeconds: averageGap(stats.waveGapSeconds),
      averageMeaningfulWaveGapSeconds: averageGap(stats.meaningfulWaveGapSeconds),
      longestWaveGapSeconds: Math.max(stats.longestWaveGapSeconds, this.timeSinceWaveSeconds),
      longestMeaningfulWaveGapSeconds: Math.max(stats.longestMeaningfulWaveGapSeconds, this.timeSinceMeaningfulWaveSeconds),
      longestActiveEmptySeconds: Math.max(stats.longestActiveEmptySeconds, this.activeEmptySeconds),
      pressureCounts: { ...stats.pressureCounts },
      waveCounts: { ...stats.waveCounts },
      boostLaneCounts: stats.boostLaneCounts.slice(),
      rampLaneCounts: stats.rampLaneCounts.slice(),
      gasCanLaneCounts: stats.gasCanLaneCounts.slice(),
      gasCanGapCount: stats.gasCanGapSeconds.length,
      gasCanGapSum: gapSum(stats.gasCanGapSeconds),
      averageGasCanGapSeconds: averageGap(stats.gasCanGapSeconds),
      longestGasCanGapSeconds: Math.max(stats.longestGasCanGapSeconds || 0, this.manager.game.run?.timeSinceLastGasCan || 0),
      fuelPatternCounts: { ...stats.fuelPatternCounts },
      obstacleTypeCounts: { ...stats.obstacleTypeCounts },
      averagePressureBudget: stats.totalWaves ? stats.pressureBudgetSum / stats.totalWaves : 0,
      averagePressure: stats.totalWaves ? stats.pressureSum / stats.totalWaves : 0,
      longestLaneSafeSeconds: stats.longestLaneSafeSeconds.slice(),
      sectionStats: this.formatSectionStats(stats)
    };
  }

  allLanes() {
    return [0, 1, 2, 3, 4];
  }

  lanesExcept(excluded) {
    const list = Array.isArray(excluded) ? excluded : [excluded];
    return this.allLanes().filter((lane) => !list.includes(lane));
  }

  canAddPressure(result, type, context, extraAllowance = 0) {
    const pressureValue = TRACK_DIRECTOR.pressureValues[type] || 0;
    if (pressureValue <= 0) return true;
    const cap = context.pressureBudget + context.pressureBudgetAllowance + extraAllowance;
    return result.pressure + pressureValue <= cap;
  }

  pickPressureLane(context, centerChance = 0.25, excluded = []) {
    const blocked = Array.isArray(excluded) ? excluded : [excluded];
    const playerLaneIsCenter = context.playerLane === TRACK_DIRECTOR.centerLane;
    const isTurbo = context.speedClassId === "turbo";
    const isPro = context.speedClassId === "pro";
    if (context.needsMovementChallenge && !blocked.includes(context.playerLane)) {
      const playerLaneChance = playerLaneIsCenter
        ? (context.centerNeedsChallenge ? (isTurbo ? 0.9 : 0.74) : (isTurbo ? 0.48 : 0.28))
        : (isTurbo ? 0.84 : (isPro ? 0.78 : 0.74));
      if ((!playerLaneIsCenter || context.centerNeedsChallenge || context.allowSoftCenterPressure) && this.random() < playerLaneChance) {
        return context.playerLane;
      }
    }
    if (!blocked.includes(TRACK_DIRECTOR.centerLane)) {
      const centerNeedChance = isTurbo ? 0.94 : (isPro ? 0.88 : 0.84);
      const softMultiplier = isTurbo ? 1.45 : (isPro ? 1.18 : 1);
      if (context.centerNeedsChallenge && this.random() < centerNeedChance) return TRACK_DIRECTOR.centerLane;
      if (context.allowSoftCenterPressure && this.random() < centerChance * context.centerSoftPressure * softMultiplier) return TRACK_DIRECTOR.centerLane;
    }
    const playerLanePressureChance = isTurbo ? 0.46 : (isPro ? 0.36 : 0.3);
    if (!blocked.includes(context.playerLane) && context.progress > 0.24 && this.random() < playerLanePressureChance) {
      return context.playerLane;
    }
    let fallbackLanes = this.lanesExcept(blocked);
    if (!context.centerNeedsChallenge && !context.allowSoftCenterPressure && fallbackLanes.length > 1) {
      const sideLanes = fallbackLanes.filter((lane) => lane !== TRACK_DIRECTOR.centerLane);
      if (sideLanes.length) fallbackLanes = sideLanes;
    }
    return randomChoice(shuffle(fallbackLanes, () => this.random()), () => this.random());
  }

  pickWaveSafeLane(context, options = {}) {
    const centerLane = TRACK_DIRECTOR.centerLane;
    const excluded = Array.isArray(options.excluded) ? options.excluded : [];
    if (!excluded.includes(centerLane) && !context.centerNeedsChallenge) {
      const centerSafeChance = Number.isFinite(options.centerSafeChance)
        ? options.centerSafeChance
        : context.centerRestChance;
      const movementPenalty = context.needsMovementChallenge && context.allowSoftCenterPressure ? 0.68 : 1;
      if (this.random() < centerSafeChance * movementPenalty) return centerLane;
    }
    const highModeCenterPressure = ["pro", "turbo"].includes(context.speedClassId)
      && (context.allowSoftCenterPressure || context.progress > 0.22);
    return this.pickSafeLane(context, Boolean(options.preferSide) || context.centerNeedsChallenge || highModeCenterPressure, excluded);
  }

  orderPressureLanes(context, lanes) {
    const centerLane = TRACK_DIRECTOR.centerLane;
    const ordered = lanes.slice();
    if (context.centerNeedsChallenge && ordered.includes(centerLane)) {
      return [centerLane].concat(ordered.filter((lane) => lane !== centerLane));
    }
    if (context.allowSoftCenterPressure && ordered.includes(centerLane)) {
      const softCenterChance = context.speedClassId === "turbo" ? 0.84 : (context.speedClassId === "pro" ? 0.68 : (context.speedClassId === "arcade" ? 0.44 : 0));
      if (this.random() < softCenterChance) {
        return [centerLane].concat(ordered.filter((lane) => lane !== centerLane));
      }
    }
    if (ordered.includes(centerLane)) {
      const highModeCenterChance = context.speedClassId === "turbo" && context.progress > 0.16
        ? 0.48
        : (context.speedClassId === "pro" && context.progress > 0.22 ? 0.36 : 0);
      if (highModeCenterChance > 0 && this.random() < highModeCenterChance) {
        return [centerLane].concat(ordered.filter((lane) => lane !== centerLane));
      }
    }
    if (!context.allowSoftCenterPressure && ordered.includes(centerLane)) {
      return ordered.filter((lane) => lane !== centerLane).concat(centerLane);
    }
    return ordered;
  }

  pickSafeLane(context, preferSide = false, excluded = []) {
    const blocked = Array.isArray(excluded) ? excluded.slice() : [excluded];
    let lanes = this.lanesExcept(blocked);
    if (preferSide || context.centerNeedsChallenge) {
      const sideLanes = lanes.filter((lane) => lane !== TRACK_DIRECTOR.centerLane);
      if (sideLanes.length) lanes = sideLanes;
    }
    return randomChoice(shuffle(lanes, () => this.random()), () => this.random());
  }

  pickRewardLane(context, excluded = []) {
    const candidates = this.lanesExcept(excluded);
    const sideLanes = candidates.filter((lane) => lane !== TRACK_DIRECTOR.centerLane);
    const lanes = sideLanes.length ? sideLanes : candidates;
    if (context.playerLane !== TRACK_DIRECTOR.centerLane && candidates.includes(TRACK_DIRECTOR.centerLane) && this.random() < 0.14) {
      return TRACK_DIRECTOR.centerLane;
    }
    return randomChoice(shuffle(lanes, () => this.random()), () => this.random());
  }

  chooseBlockerType(context, heavyChance = 0.25) {
    const difficulty = context.difficulty;
    const options = [
      { value: "slowCar", weight: 1.5 },
      { value: "fastCar", weight: 0.55 + difficulty * 1.2 },
      { value: "truck", weight: Math.max(0, heavyChance - 0.05) + difficulty * 0.35 },
      { value: "barrier", weight: heavyChance * 0.65 + difficulty * 0.25 },
      { value: "cone", weight: context.band.id === "opening" ? 1.05 : 0.45 },
      { value: "oil", weight: context.band.id === "opening" ? 0.15 : 0.42 + difficulty * 0.25 }
    ];
    if (context.speedClassId === "sunday") {
      options.find((item) => item.value === "truck").weight *= 0.35;
      options.find((item) => item.value === "barrier").weight *= 0.45;
    }
    return weightedChoice(options, () => this.random()) || "slowCar";
  }

  waveSingleBlocker(distance, context, result) {
    const lane = this.pickPressureLane(context, context.band.id === "opening" ? 0.24 : 0.38);
    const type = context.band.id === "opening" && this.random() < 0.35
      ? "cone"
      : this.chooseBlockerType(context, 0.12);
    this.spawn(type, lane, distance, result);
    const extraChance = context.speedClassId === "turbo" ? 0.96 : (context.speedClassId === "pro" ? 0.72 : (context.speedClassId === "arcade" ? 0.38 : 0));
    const extraMinProgress = context.speedClassId === "turbo" ? 0.05 : (context.speedClassId === "pro" ? 0.14 : 0.22);
    if (context.progress > extraMinProgress && extraChance > 0 && this.canAddPressure(result, "cone", context) && this.random() < extraChance) {
      const sideLane = this.pickPressureLane(context, 0.32, [lane]);
      this.spawn(this.random() < 0.62 ? "cone" : "oil", sideLane, distance + (context.speedClassId === "turbo" ? 70 : 110), result);
      const thirdChance = context.speedClassId === "turbo" ? 0.8 : (context.speedClassId === "pro" ? 0.38 : 0);
      const thirdMinProgress = context.speedClassId === "turbo" ? 0.18 : 0.42;
      if (context.progress > thirdMinProgress && thirdChance > 0 && this.canAddPressure(result, "slowCar", context, 0.2) && this.random() < thirdChance) {
        const thirdLane = this.pickPressureLane(context, 0.38, [lane, sideLane]);
        this.spawn(this.random() < 0.55 ? "cone" : "slowCar", thirdLane, distance + (context.speedClassId === "turbo" ? 125 : 160), result);
      }
    }
  }

  waveDoubleGate(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, { centerSafeChance: context.centerRestChance });
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    this.spawn(this.chooseBlockerType(context, 0.12), lanes[0], distance, result);
    this.spawn(this.random() < 0.55 ? "slowCar" : (context.difficulty > 0.4 ? "oil" : "cone"), lanes[1], distance, result);
    const thirdChance = context.speedClassId === "arcade" ? 0.5 : (context.speedClassId === "pro" ? 0.86 : 0.98);
    const thirdMinProgress = context.speedClassId === "turbo" ? 0.04 : (context.speedClassId === "pro" ? 0.16 : 0.3);
    const addThird = context.progress > thirdMinProgress
      && (context.speedClassId === "arcade" || context.speedClassId === "pro" || context.speedClassId === "turbo")
      && this.canAddPressure(result, "cone", context)
      && this.random() < thirdChance;
    if (addThird) {
      this.spawn(this.random() < 0.55 ? "cone" : "oil", lanes[2], distance + 90, result);
    }
  }

  waveOffsetPair(distance, context, result) {
    const firstLane = this.pickPressureLane(context, 0.35);
    const secondLane = randomChoice(shuffle(this.lanesExcept(firstLane), () => this.random()), () => this.random());
    const stagger = lerp(170, 285, this.random());
    this.spawn(this.chooseBlockerType(context, 0.18), firstLane, distance, result);
    this.spawn(this.random() < 0.5 ? "cone" : this.chooseBlockerType(context, 0.12), secondLane, distance + stagger, result);
    const thirdChance = context.speedClassId === "rookie" ? 0.18 : (context.speedClassId === "arcade" ? 0.66 : (context.speedClassId === "pro" ? 0.88 : 0.99));
    const thirdMinProgress = context.speedClassId === "turbo" ? 0.06 : (context.speedClassId === "pro" ? 0.16 : 0.28);
    if (context.progress > thirdMinProgress && context.speedClassId !== "sunday" && this.canAddPressure(result, "cone", context) && this.random() < thirdChance) {
      const thirdLane = randomChoice(shuffle(this.lanesExcept([firstLane, secondLane]), () => this.random()), () => this.random());
      this.spawn(this.random() < 0.55 ? "cone" : "slowCar", thirdLane, distance + stagger * 0.55, result);
    }
  }

  waveCenterBlock(distance, context, result) {
    const type = context.progress < 0.3 ? (this.random() < 0.45 ? "cone" : "slowCar") : this.chooseBlockerType(context, 0.2);
    this.spawn(type, TRACK_DIRECTOR.centerLane, distance, result);
    const sidePressureChance = context.speedClassId === "sunday" ? 0.44 : (context.speedClassId === "rookie" ? 0.72 : 1);
    const sideMinProgress = context.speedClassId === "turbo" ? 0 : (context.speedClassId === "pro" ? 0.05 : 0.12);
    if (context.progress > sideMinProgress && this.random() < sidePressureChance && this.canAddPressure(result, "cone", context)) {
      const sideLane = this.pickPressureLane(context, 0, [TRACK_DIRECTOR.centerLane]);
      this.spawn(this.random() < 0.55 ? "cone" : "oil", sideLane, distance, result);
      const thirdChance = context.speedClassId === "arcade" ? 0.58 : (context.speedClassId === "pro" ? 0.94 : 0.99);
      const thirdMinProgress = context.speedClassId === "arcade" ? 0.3 : (context.speedClassId === "pro" ? 0.12 : 0.04);
      if (context.progress > thirdMinProgress && ["arcade", "pro", "turbo"].includes(context.speedClassId) && this.canAddPressure(result, "slowCar", context) && this.random() < thirdChance) {
        const thirdLane = this.pickPressureLane(context, 0, [TRACK_DIRECTOR.centerLane, sideLane]);
        this.spawn(this.random() < 0.5 ? "cone" : "slowCar", thirdLane, distance + 110, result);
      }
    }
    if (context.progress > 0.22 && this.random() < 0.45) {
      const rewardLane = this.pickRewardLane(context, [TRACK_DIRECTOR.centerLane]);
      this.spawn("boostPad", rewardLane, distance + 420, result);
    }
  }

  waveLeftRightSweep(distance, context, result) {
    const direction = this.random() < 0.5 ? 1 : -1;
    const start = direction > 0 ? 0 : 4;
    let count = context.speedClassId === "sunday"
      ? (context.band.id === "final" ? 3 : 2)
      : (context.band.id === "final" && (context.speedClassId === "pro" || context.speedClassId === "turbo") ? 4 : 3);
    if (!context.centerNeedsChallenge && !context.allowSoftCenterPressure && context.speedClassId !== "turbo") {
      count = Math.min(count, 2);
    }
    const step = clamp(context.cruiseSpeed * 0.17, 150, 285);
    for (let i = 0; i < count; i += 1) {
      const lane = start + i * direction;
      if (lane < 0 || lane >= LANES) continue;
      const type = i === 0 ? "cone" : (this.random() < 0.42 ? "slowCar" : this.chooseBlockerType(context, 0.1));
      this.spawn(type, lane, distance + i * step, result);
    }
  }

  waveConstructionSqueeze(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      preferSide: true,
      centerSafeChance: context.centerRestChance * 0.42
    });
    this.manager.addWarning(distance, safeLane, "work");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const count = context.speedClassId === "sunday"
      ? 2
      : (context.speedClassId === "rookie" && (context.band.id === "earlyMid" || this.random() < 0.38) ? 2 : 3);
    const types = ["barrier", this.random() < 0.58 ? "cone" : "oil", context.difficulty > 0.5 ? "barrier" : "cone"];
    for (let i = 0; i < count; i += 1) {
      this.spawn(types[i], lanes[i], distance + (i < 3 ? 0 : 135), result);
    }
  }

  waveDeerCrossing(distance, context, result) {
    const direction = this.random() < 0.5 ? 1 : -1;
    const signLane = direction > 0 ? 0 : 4;
    this.manager.addWarning(distance, signLane, "deer");
    const hazardMinProgress = context.speedClassId === "turbo" ? 0.23 : (context.speedClassId === "pro" ? 0.25 : 0.35);
    if (context.progress > hazardMinProgress && context.speedClassId !== "sunday") {
      const laneA = this.pickPressureLane(context, 0.24);
      const laneB = this.pickPressureLane(context, 0.18, [laneA]);
      this.spawn(this.random() < 0.6 ? "cone" : "oil", laneA, distance - 180, result);
      const secondChance = context.speedClassId === "turbo" ? 0.92 : (context.speedClassId === "pro" ? 0.8 : 0.68);
      if (["arcade", "pro", "turbo"].includes(context.speedClassId) && this.canAddPressure(result, "cone", context) && this.random() < secondChance) {
        this.spawn("cone", laneB, distance + 170, result);
      }
      const thirdChance = context.speedClassId === "turbo" ? 0.56 : (context.speedClassId === "pro" ? 0.28 : 0);
      if (context.progress > 0.52 && thirdChance > 0 && this.canAddPressure(result, "oil", context, 0.2) && this.random() < thirdChance) {
        const laneC = this.pickPressureLane(context, 0.3, [laneA, laneB]);
        this.spawn(this.random() < 0.55 ? "cone" : "oil", laneC, distance + 70, result);
      }
    }
    this.spawn("deer", TRACK_DIRECTOR.centerLane, distance, result, {
      laneFloat: direction > 0 ? -0.45 : LANES - 0.55,
      direction
    });
  }

  waveRampEscape(distance, context, result) {
    const rampLane = this.pickRewardLane(context);
    this.spawn("ramp", rampLane, distance, result);
    const lanes = shuffle(this.lanesExcept(rampLane), () => this.random());
    const hazardDistance = distance + clamp(context.cruiseSpeed * 0.32, 300, 520);
    this.spawn("cone", lanes[0], hazardDistance, result);
    this.spawn(this.random() < 0.55 ? "oil" : "branch", lanes[1], hazardDistance + 40, result);
    if (context.band.id !== "opening" && context.speedClassId !== "sunday" && this.canAddPressure(result, "cone", context)) {
      this.spawn("cone", lanes[2], hazardDistance + (context.speedClassId === "turbo" ? 40 : 100), result);
    }
    if (context.band.id === "final" && (context.speedClassId === "pro" || context.speedClassId === "turbo") && this.canAddPressure(result, "oil", context, 0.25)) {
      this.spawn(this.random() < 0.5 ? "oil" : "branch", lanes[3], hazardDistance + 160, result);
    }
  }

  waveBoostTemptation(distance, context, result) {
    const blockerLane = this.pickPressureLane(context, 0.46);
    const rewardLane = this.pickRewardLane(context, [blockerLane]);
    this.spawn(this.random() < 0.72 ? "slowCar" : "cone", blockerLane, distance, result);
    if (context.progress > 0.25 && this.canAddPressure(result, "cone", context)) {
      const secondLane = this.pickPressureLane(context, 0.18, [blockerLane, rewardLane]);
      this.spawn(this.random() < 0.62 ? "cone" : "oil", secondLane, distance + (context.speedClassId === "turbo" ? 0 : 40), result);
      const thirdChance = context.speedClassId === "turbo" ? 0.98 : (context.speedClassId === "pro" ? 0.66 : 0);
      const thirdMinProgress = context.speedClassId === "turbo" ? 0.12 : 0.32;
      if (thirdChance > 0 && context.progress > thirdMinProgress && this.canAddPressure(result, "slowCar", context, 0.2) && this.random() < thirdChance) {
        const thirdLane = this.pickPressureLane(context, 0.34, [blockerLane, rewardLane, secondLane]);
        this.spawn(this.random() < 0.52 ? "cone" : "slowCar", thirdLane, distance + 95, result);
      }
    }
    this.spawn("boostPad", rewardLane, distance + clamp(context.cruiseSpeed * 0.27, 260, 430), result);
  }

  waveNearMissCorridor(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      centerSafeChance: context.centerRestChance * 0.48
    });
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const count = context.band.id === "final" || context.speedClassId === "arcade" || context.speedClassId === "pro" || context.speedClassId === "turbo" ? 3 : 2;
    for (let i = 0; i < count; i += 1) {
      const type = i === 0 ? "fastCar" : (i === 1 && context.difficulty > 0.6 ? "truck" : "slowCar");
      this.spawn(type, lanes[i], distance + (i === 2 ? (context.speedClassId === "turbo" ? 90 : 140) : 0), result);
    }
  }

  waveFourLaneSpike(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      preferSide: true,
      centerSafeChance: context.centerRestChance * 0.2
    });
    const lanes = shuffle(this.lanesExcept(safeLane), () => this.random());
    const types = ["slowCar", "fastCar", "barrier", this.random() < 0.5 ? "cone" : "oil"];
    const candidates = types.map((type, index) => this.manager.createObstacle(type, lanes[index], distance, {
      allowFourLanePressure: true
    }));
    const scan = this.manager.scanPatternSafety(candidates, this.manager.getSpawnValidationObstacles(distance));
    if (scan.invalid) {
      result.fairnessPassed = false;
      this.manager.preventedUnsafeSpawns += 1;
      this.manager.lastSafetySummary = { ...scan, reason: "director four-lane group rejected" };
      this.waveNearMissCorridor(distance, context, result);
      return;
    }
    for (let i = 0; i < 4; i += 1) {
      this.spawn(types[i], lanes[i], distance, result, {
        allowFourLanePressure: true
      });
    }
  }

  chooseFuelBlockerType(context, heavyChance = 0.22) {
    const difficulty = context.difficulty;
    const options = [
      { value: "slowCar", weight: 1.65 },
      { value: "fastCar", weight: 0.65 + difficulty * 1.25 },
      { value: "truck", weight: heavyChance + difficulty * 0.48 },
      { value: "barrier", weight: heavyChance * 0.85 + difficulty * 0.42 }
    ];
    if (context.speedClassId === "sunday") {
      options.find((item) => item.value === "truck").weight *= 0.42;
      options.find((item) => item.value === "barrier").weight *= 0.58;
    }
    if (context.speedClassId === "turbo") {
      options.find((item) => item.value === "fastCar").weight *= 1.28;
      options.find((item) => item.value === "truck").weight *= 1.18;
    }
    return weightedChoice(options, () => this.random()) || "slowCar";
  }

  pickFuelCanLane(context, excluded = [], options = {}) {
    let lanes = this.lanesExcept(excluded);
    if (!lanes.length) lanes = this.allLanes();
    if (options.preferPlayer && lanes.includes(context.playerLane) && this.random() < 0.58) return context.playerLane;
    const sideLanes = lanes.filter((lane) => lane !== TRACK_DIRECTOR.centerLane);
    if (sideLanes.length && (options.preferSide || this.random() < 0.72)) {
      lanes = sideLanes;
    }
    if (!options.allowFreeCenter && lanes.length > 1) {
      const withoutCenter = lanes.filter((lane) => lane !== TRACK_DIRECTOR.centerLane);
      if (withoutCenter.length) lanes = withoutCenter;
    }
    return randomChoice(shuffle(lanes, () => this.random()), () => this.random());
  }

  trySpawnFuelCan(preferredLanes, distance, context, result, pattern = result.type) {
    const lanes = Array.isArray(preferredLanes) ? preferredLanes : [preferredLanes];
    const fallback = shuffle(this.allLanes(), () => this.random());
    const ordered = lanes.concat(fallback).filter((lane, index, list) => Number.isFinite(lane) && lane >= 0 && lane < LANES && list.indexOf(lane) === index);
    for (const lane of ordered) {
      const spawned = this.spawn("gasCan", lane, distance, result, { allowLaneAdjust: false });
      if (spawned) {
        this.recordFuelPlacement(spawned, context, result, pattern);
        return spawned;
      }
    }
    return null;
  }

  waveFuelTrafficPressure(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, { centerSafeChance: context.centerRestChance * 0.7 });
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const count = context.speedClassId === "sunday" ? 1 : (context.progress > 0.55 || ["pro", "turbo"].includes(context.speedClassId) ? 3 : 2);
    for (let i = 0; i < count; i += 1) {
      const lane = lanes[i];
      if (!Number.isFinite(lane)) continue;
      const gap = i === 2 ? clamp(context.cruiseSpeed * 0.16, 130, 240) : 0;
      this.spawn(this.chooseFuelBlockerType(context, i === 0 ? 0.16 : 0.28), lane, distance + gap, result);
    }
  }

  waveFuelSideTemptation(distance, context, result) {
    const gasLane = this.pickFuelCanLane(context, [], { preferSide: true });
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(gasLane), () => this.random()));
    this.spawn(this.chooseFuelBlockerType(context, 0.16), lanes[0], distance, result);
    if (lanes.includes(TRACK_DIRECTOR.centerLane) && this.random() < 0.72) {
      this.spawn(this.chooseFuelBlockerType(context, 0.18), TRACK_DIRECTOR.centerLane, distance + 55, result);
    } else if (Number.isFinite(lanes[1])) {
      this.spawn(this.chooseFuelBlockerType(context, 0.2), lanes[1], distance + 80, result);
    }
    this.trySpawnFuelCan([gasLane], distance + clamp(context.cruiseSpeed * 0.3, 310, 470), context, result, "sideTemptation");
  }

  waveFuelTrafficGate(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      preferSide: context.centerNeedsChallenge,
      centerSafeChance: context.centerRestChance * 0.62
    });
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    this.spawn(this.chooseFuelBlockerType(context, 0.18), lanes[0], distance, result);
    this.spawn(this.chooseFuelBlockerType(context, 0.22), lanes[1], distance, result);
    if (context.progress > 0.32 && ["arcade", "pro", "turbo"].includes(context.speedClassId) && Number.isFinite(lanes[2]) && this.canAddPressure(result, "slowCar", context, 0.35) && this.random() < (context.speedClassId === "turbo" ? 0.78 : 0.42)) {
      this.spawn(this.chooseFuelBlockerType(context, 0.18), lanes[2], distance + clamp(context.cruiseSpeed * 0.18, 150, 260), result);
    }
    this.trySpawnFuelCan([safeLane], distance + clamp(context.cruiseSpeed * 0.34, 340, 520), context, result, "trafficGate");
  }

  waveFuelAfterPressure(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, { preferSide: true, centerSafeChance: context.centerRestChance * 0.48 });
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const count = context.speedClassId === "sunday" ? 2 : 3;
    for (let i = 0; i < count; i += 1) {
      this.spawn(this.chooseFuelBlockerType(context, i === 0 ? 0.2 : 0.32), lanes[i], distance + (i === 2 ? 110 : 0), result);
    }
    this.trySpawnFuelCan([safeLane], distance + clamp(context.cruiseSpeed * 0.48, 480, 700), context, result, "afterPressure");
  }

  waveFuelSplit(distance, context, result) {
    const candidates = shuffle(this.lanesExcept(TRACK_DIRECTOR.centerLane), () => this.random());
    const gasA = candidates[0] ?? 0;
    const gasB = candidates.find((lane) => Math.abs(lane - gasA) >= 2) ?? candidates[1] ?? 4;
    const blockerLane = this.pickPressureLane(context, 0.42, [gasA, gasB]);
    this.spawn(this.chooseFuelBlockerType(context, 0.22), blockerLane, distance, result);
    const extraLane = this.pickPressureLane(context, 0.35, [gasA, gasB, blockerLane]);
    if (Number.isFinite(extraLane) && this.random() < 0.72) {
      this.spawn(this.chooseFuelBlockerType(context, 0.16), extraLane, distance + 95, result);
    }
    const fuelDistance = distance + clamp(context.cruiseSpeed * 0.32, 330, 520);
    this.trySpawnFuelCan([gasA], fuelDistance, context, result, "fuelSplit");
    this.trySpawnFuelCan([gasB], fuelDistance + clamp(context.cruiseSpeed * 0.08, 85, 150), context, result, "fuelSplit");
  }

  waveFuelLowRescue(distance, context, result) {
    const fuelLane = this.pickFuelCanLane(context, [], {
      preferPlayer: true,
      preferSide: context.playerLane === TRACK_DIRECTOR.centerLane && this.random() < 0.42,
      allowFreeCenter: this.random() < 0.34
    });
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(fuelLane), () => this.random()));
    const blockerCount = context.speedClassId === "sunday" ? 1 : 2;
    for (let i = 0; i < blockerCount; i += 1) {
      this.spawn(this.chooseFuelBlockerType(context, 0.16), lanes[i], distance + (i === 1 ? 60 : 0), result);
    }
    this.trySpawnFuelCan([fuelLane], distance + clamp(context.cruiseSpeed * 0.24, 240, 390), context, result, "lowFuelRescue");
  }

  waveFuelSupport(distance, context, result) {
    const supportType = this.random() < 0.54 ? "boostPad" : "ramp";
    const rewardLane = this.pickRewardLane(context);
    this.spawn(supportType, rewardLane, distance + clamp(context.cruiseSpeed * 0.2, 210, 340), result);
    const blockerLane = this.pickPressureLane(context, 0.3, [rewardLane]);
    this.spawn(this.chooseFuelBlockerType(context, 0.12), blockerLane, distance, result);
  }

  waveRecoveryGap(distance, context, result) {
    if (context.fuelRun && context.fuel?.timeSinceLastGasCan >= (context.fuel?.targetGasGapSeconds || 16)) {
      const lane = this.pickFuelCanLane(context, [], { preferSide: true, allowFreeCenter: false });
      this.trySpawnFuelCan([lane], distance + clamp(context.cruiseSpeed * 0.24, 240, 390), context, result, "recoveryFuel");
      return;
    }
    if (context.progress > 0.18 && this.random() < (context.speedClassId === "sunday" ? 0.38 : 0.24)) {
      const lane = this.pickRewardLane(context);
      this.spawn("boostPad", lane, distance + clamp(context.cruiseSpeed * 0.24, 230, 390), result);
    }
  }
}

class ObstacleManager {
  constructor(game) {
    this.game = game;
    this.obstacles = [];
    this.nextSpawnDistance = 0;
    this.lastPatternSafeLane = 2;
    this.forceLastCollision = "none";
    this.lastFourLanePressureDistance = -Infinity;
    this.preventedUnsafeSpawns = 0;
    this.lastSafetySummary = null;
    this.nextObstacleId = 1;
    this.seedLockedSpawnObstacles = [];
    this.fallbackRng = createSeededRandomController("road-director-fallback");
    this.director = new RoadDirector(this);
  }

  reset(track) {
    this.track = track;
    this.obstacles = [];
    this.nextSpawnDistance = track.obstacleSettings.firstObstacleAt;
    this.lastPatternSafeLane = 2;
    this.forceLastCollision = "none";
    this.lastFourLanePressureDistance = -Infinity;
    this.preventedUnsafeSpawns = 0;
    this.lastSafetySummary = null;
    this.nextObstacleId = 1;
    this.seedLockedSpawnObstacles = [];
    this.director.reset(track);
  }

  random() {
    return typeof this.game.randomFloat === "function" ? this.game.randomFloat() : this.fallbackRng.random();
  }

  update(dt) {
    const run = this.game.run;
    const track = this.track;
    this.director.update(dt);
    const spawnLeadDistance = this.getSpawnLeadDistance(run);
    while (this.nextSpawnDistance < run.distance + spawnLeadDistance && this.nextSpawnDistance < track.distanceToFinish - 650) {
      const wave = this.spawnPattern(this.nextSpawnDistance);
      const progress = this.nextSpawnDistance / track.distanceToFinish;
      const difficulty = track.difficultyCurve(progress);
      const cruiseSpeed = getTrackCruiseSpeed(track, progress, this.getSpeedClassId());
      const baseSpacing = this.getPatternSpacing(progress, difficulty, cruiseSpeed);
      const spacingMultiplier = this.director.getSpacingMultiplier(wave);
      const randomScale = this.director.getRandomSecondsScale(wave);
      const cadence = getTrackDirectorCadence(this.getSpeedClassId());
      const randomSeconds = lerp(
        cadence.randomEarly ?? track.obstacleSettings.spacingRandomSecondsEarly ?? 0.7,
        cadence.randomLate ?? track.obstacleSettings.spacingRandomSecondsLate ?? 0.25,
        difficulty
      );
      this.nextSpawnDistance += baseSpacing * spacingMultiplier + this.random() * cruiseSpeed * randomSeconds * randomScale;
    }

    this.obstacles = this.obstacles.filter((obstacle) => {
      const ahead = obstacle.distance - run.distance;
      if (obstacle.type === "deer") {
        this.updateDeer(obstacle, ahead);
      }
      if (obstacle.type === "warning") {
        this.maybePlayWarningSfx(obstacle, ahead);
      }
      return ahead > -260 && !obstacle.remove;
    });
  }

  maybePlayWarningSfx(obstacle, ahead) {
    if (obstacle.sfxPlayed || this.game.screen !== "game") return;
    const run = this.game.run;
    if (!run || run.paused || run.ended) return;
    if (ahead <= VIEW_DISTANCE + 40 && ahead > -120) {
      obstacle.sfxPlayed = true;
      this.game.audio.playSfx("warning");
    }
  }

  getSpawnLeadDistance(run) {
    const seconds = this.track.obstacleSettings.spawnLeadSeconds ?? 5;
    return Math.max(VIEW_DISTANCE, run.currentSpeed * seconds);
  }

  getSpeedClassId() {
    return this.game.run?.speedClassId || DEFAULT_SPEED_CLASS_ID;
  }

  getRaceTypeId() {
    return normalizeRaceTypeId(this.game.run?.raceTypeId, DEFAULT_RACE_TYPE_ID);
  }

  getFuelRunContext() {
    const run = this.game.run || {};
    if (!isFuelRunRaceType(run.raceTypeId)) return null;
    const tuning = getFuelRunTuning(run.speedClassId);
    const fuel = Number.isFinite(run.fuel) ? run.fuel : tuning.fuelMax;
    return {
      amount: fuel,
      max: Number.isFinite(run.fuelMax) ? run.fuelMax : tuning.fuelMax,
      percent: clamp(fuel / Math.max(1, Number.isFinite(run.fuelMax) ? run.fuelMax : tuning.fuelMax), 0, 1),
      drainPerSecond: Number.isFinite(run.fuelDrainPerSecond) ? run.fuelDrainPerSecond : tuning.fuelDrainPerSecond,
      restoreAmount: Number.isFinite(run.gasCanRestoreAmount) ? run.gasCanRestoreAmount : tuning.gasCanRestoreAmount,
      timeSinceLastGasCan: Number.isFinite(run.timeSinceLastGasCan) ? run.timeSinceLastGasCan : 0,
      gasCansCollected: Math.max(0, Math.round(run.gasCansCollected || 0)),
      gasCansSpawned: Math.max(0, Math.round(run.gasCansSpawned || 0)),
      low: fuel <= tuning.lowFuelThreshold,
      critical: fuel <= tuning.criticalFuelThreshold,
      minGasGapSeconds: tuning.minGasGapSeconds,
      targetGasGapSeconds: tuning.targetGasGapSeconds,
      maxGasGapSeconds: tuning.maxGasGapSeconds
    };
  }

  getPatternSpacing(progress, difficulty, cruiseSpeed) {
    const settings = this.track.obstacleSettings;
    const cadence = getTrackDirectorCadence(this.getSpeedClassId());
    const seconds = sampleProgressCurve([
      { progress: 0, value: cadence.early ?? settings.earlySpacingSeconds ?? 3 },
      { progress: 0.5, value: cadence.mid ?? settings.midSpacingSeconds ?? 1.9 },
      { progress: 1, value: cadence.late ?? settings.lateSpacingSeconds ?? 1.25 }
    ], progress, this.track.speedCurveType);
    const timeBasedSpacing = cruiseSpeed * seconds;
    const legacySpacingFloor = lerp(settings.earlySpacing ?? timeBasedSpacing, settings.lateSpacing ?? timeBasedSpacing, difficulty) * (cadence.spacingScale ?? 1);
    return Math.max(timeBasedSpacing, legacySpacingFloor);
  }

  updateDeer(obstacle, ahead) {
    const travel = clamp(1 - ahead / VIEW_DISTANCE, 0, 1);
    const eased = easeOutCubic(travel);
    if (obstacle.direction > 0) {
      obstacle.laneFloat = lerp(-0.45, LANES - 0.55, eased);
    } else {
      obstacle.laneFloat = lerp(LANES - 0.55, -0.45, eased);
    }
  }

  spawnPattern(distance) {
    return this.director.spawnWave(distance);
  }

  addObstacle(type, lane, distance, options = {}) {
    const candidate = this.createObstacle(type, lane, distance, options);
    const spawnResult = this.canSpawnObstacle(candidate);
    if (spawnResult.canSpawn) {
      this.obstacles.push(candidate);
      if (this.isPartySeedLocked()) this.seedLockedSpawnObstacles.push({ ...candidate });
      if (spawnResult.maxBlocked >= 4) {
        this.lastFourLanePressureDistance = distance;
      }
      this.lastSafetySummary = spawnResult;
      const postSpawn = this.validateObstaclePattern(this.getSpawnValidationObstacles(candidate.distance), this.getSafetyRunDistance(candidate.distance));
      if (postSpawn.invalid) {
        candidate.remove = true;
        this.obstacles = this.obstacles.filter((obstacle) => obstacle !== candidate);
        this.seedLockedSpawnObstacles = this.seedLockedSpawnObstacles.filter((obstacle) => obstacle.id !== candidate.id);
        this.preventedUnsafeSpawns += 1;
        this.lastSafetySummary = { ...postSpawn, reason: "post-spawn five-lane wall prevented" };
        return null;
      }
      return candidate;
    }

    if (options.allowLaneAdjust !== false && this.isGameplaySpawnObject(candidate) && candidate.type !== "deer") {
      const lanes = shuffle([0, 1, 2, 3, 4].filter((item) => item !== lane), () => this.random());
      for (const alternateLane of lanes) {
        const adjusted = this.createObstacle(type, alternateLane, distance, options);
        const adjustedResult = this.canSpawnObstacle(adjusted);
        if (adjustedResult.canSpawn) {
          this.obstacles.push(adjusted);
          if (this.isPartySeedLocked()) this.seedLockedSpawnObstacles.push({ ...adjusted });
          if (adjustedResult.maxBlocked >= 4) {
            this.lastFourLanePressureDistance = distance;
          }
          this.lastSafetySummary = { ...adjustedResult, reason: `moved ${type} from lane ${lane} to ${alternateLane}` };
          return adjusted;
        }
      }
    }

    this.preventedUnsafeSpawns += 1;
    this.lastSafetySummary = spawnResult;
    return null;
  }

  createObstacle(type, lane, distance, options = {}) {
    const id = `obstacle-${this.nextObstacleId++}`;
    return {
      id,
      type,
      lane,
      laneFloat: Number.isFinite(options.laneFloat) ? options.laneFloat : lane,
      distance,
      hit: false,
      nearMissAwarded: false,
      warningType: options.warningType || null,
      direction: options.direction || 1,
      variant: options.variant || this.selectTrafficSpriteVariant(type, lane, distance, id),
      remove: false,
      sfxPlayed: false,
      allowFourLanePressure: Boolean(options.allowFourLanePressure)
    };
  }

  selectTrafficSpriteVariant(type, lane, distance, id) {
    const variants = this.game.trafficSprites?.getVariantIds(type)
      || (TRAFFIC_SPRITE_ASSETS[type] || []).map((entry) => entry.id);
    if (!variants.length) return "";
    const run = this.game.run || {};
    const seedSource = run.roadSeedSource || run.roadSeed || this.track?.id || DEFAULT_ROAD_SEED;
    const distanceKey = Math.round(distance);
    const variantRng = createSeededRandomController(`traffic-sprite|${seedSource}|${type}|${lane}|${distanceKey}|${id}`);
    return randomChoice(variants, () => variantRng.random()) || "";
  }

  isGameplaySpawnObject(obstacle) {
    const info = OBSTACLE_INFO[obstacle.type];
    return Boolean(info && obstacle.type !== "warning" && hasGameplayHitbox(obstacle.type) && !obstacle.hit && !obstacle.remove);
  }

  isFairnessBlocker(obstacle) {
    const info = OBSTACLE_INFO[obstacle.type];
    if (!info || obstacle.hit || obstacle.remove) return false;
    if (obstacle.type === "warning" || obstacle.type === "ramp" || obstacle.type === "boostPad") return false;
    return info.crash || ["deer", "cone", "oil", "branch"].includes(obstacle.type);
  }

  getSpawnBounds(obstacle) {
    if (!this.isGameplaySpawnObject(obstacle)) return null;
    const visualSize = this.getObjectVisualSize(obstacle.type, obstacle);
    const laneW = this.game.renderer?.road?.laneW || 152;
    if (obstacle.type === "deer") {
      return {
        laneMin: -0.5,
        laneMax: LANES - 0.5,
        distanceMin: obstacle.distance - this.getObjectDistanceHalfSize(obstacle.type, obstacle),
        distanceMax: obstacle.distance + this.getObjectDistanceHalfSize(obstacle.type, obstacle),
        centerDistance: obstacle.distance
      };
    }
    const laneCenterValue = Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane;
    const config = getHitboxConfig(obstacle.type);
    const laneHalfSpan = clamp((visualSize.w * config.width) / Math.max(1, laneW * 2), 0.18, 0.48);
    const halfDistance = this.getObjectDistanceHalfSize(obstacle.type, obstacle);
    return {
      laneMin: laneCenterValue - laneHalfSpan,
      laneMax: laneCenterValue + laneHalfSpan,
      distanceMin: obstacle.distance - halfDistance,
      distanceMax: obstacle.distance + halfDistance,
      centerDistance: obstacle.distance
    };
  }

  getObjectVisualSize(type, obstacle = null) {
    const info = OBSTACLE_INFO[type];
    if (!info) return { w: 70, h: 84 };
    if (this.game.renderer?.getObstacleVisualSize) {
      return this.game.renderer.getObstacleVisualSize(type, 1, obstacle);
    }
    return { w: info.w, h: info.h };
  }

  getObjectDistanceHalfSize(type, obstacle = null) {
    const info = OBSTACLE_INFO[type];
    const config = getHitboxConfig(type);
    if (!info || !config) return 42;
    const visualSize = this.getObjectVisualSize(type, obstacle);
    const roadH = this.game.renderer?.road?.h || 720;
    return Math.max(42, (visualSize.h * config.height * 1.18 * VIEW_DISTANCE / Math.max(1, roadH)) / 2);
  }

  getSpawnSpacingClass(obstacle) {
    if (["slowCar", "fastCar", "truck", "barrier"].includes(obstacle.type)) return "heavy";
    if (["ramp", "boostPad"].includes(obstacle.type)) return "assist";
    if (obstacle.type === "gasCan") return "collectible";
    if (obstacle.type === "deer") return "animal";
    return "small";
  }

  getMinimumSameLaneGap(a, b) {
    const baseByClass = {
      heavy: 360,
      assist: 340,
      collectible: 300,
      animal: 320,
      small: 250
    };
    const base = Math.max(
      baseByClass[this.getSpawnSpacingClass(a)] || 155,
      baseByClass[this.getSpawnSpacingClass(b)] || 155
    );
    const distance = Math.max(a.distance, b.distance);
    const progress = clamp(distance / this.track.distanceToFinish, 0, 1);
    const cruiseSpeed = getTrackCruiseSpeed(this.track, progress, this.getSpeedClassId());
    const speedPadding = clamp((cruiseSpeed - 575) / 925, 0, 1) * 95;
    return base + speedPadding;
  }

  wouldOverlapExistingObject(candidate, existingObjects = this.getSpawnValidationObstacles(candidate.distance)) {
    return this.findSpawnOverlap(candidate, existingObjects);
  }

  findSpawnOverlap(candidate, existingObjects = this.obstacles) {
    if (!this.isGameplaySpawnObject(candidate)) return null;
    const candidateBounds = this.getSpawnBounds(candidate);
    if (!candidateBounds) return null;
    for (const obstacle of existingObjects) {
      if (obstacle === candidate || !this.isGameplaySpawnObject(obstacle)) continue;
      const obstacleBounds = this.getSpawnBounds(obstacle);
      if (!obstacleBounds) continue;
      const laneOverlap = candidateBounds.laneMin <= obstacleBounds.laneMax
        && candidateBounds.laneMax >= obstacleBounds.laneMin;
      if (!laneOverlap) continue;
      const requiredGap = this.getMinimumSameLaneGap(candidate, obstacle);
      const actualGap = Math.abs(candidate.distance - obstacle.distance);
      const boundsOverlap = candidateBounds.distanceMin <= obstacleBounds.distanceMax
        && candidateBounds.distanceMax >= obstacleBounds.distanceMin;
      if (boundsOverlap || actualGap < requiredGap) {
        return {
          candidate,
          obstacle,
          candidateBounds,
          obstacleBounds,
          actualGap,
          requiredGap,
          sameSpaceAssistOverlap: ["boostPad", "ramp"].includes(candidate.type) || ["boostPad", "ramp"].includes(obstacle.type)
        };
      }
    }
    return null;
  }

  canSpawnCandidate(candidate) {
    return this.canSpawnObstacle(candidate);
  }

  isPartySeedLocked() {
    return Boolean(this.game.run?.partySeedLocked);
  }

  getSafetyRunDistance(distance) {
    if (!this.isPartySeedLocked()) return this.game.run.distance;
    return Math.max(0, distance - VIEW_DISTANCE);
  }

  getSpawnValidationObstacles(distance) {
    if (!this.isPartySeedLocked()) return this.obstacles;
    const safetyRunDistance = this.getSafetyRunDistance(distance);
    return this.seedLockedSpawnObstacles.filter((obstacle) => {
      const ahead = obstacle.distance - safetyRunDistance;
      return ahead > -260 && !obstacle.remove;
    });
  }

  reserveSpawnSpace(candidate) {
    return this.getSpawnBounds(candidate);
  }

  findGameplayOverlaps(obstacles, runDistance = this.game.run.distance) {
    const records = [];
    for (const obstacle of obstacles) {
      if (!this.isGameplaySpawnObject(obstacle)) continue;
      const box = this.game.renderer.getObstacleHitboxAt(obstacle, runDistance);
      if (!box) continue;
      records.push({ obstacle, box });
    }

    const overlaps = [];
    for (let i = 0; i < records.length; i += 1) {
      for (let j = i + 1; j < records.length; j += 1) {
        const a = records[i];
        const b = records[j];
        if (!rectsOverlap(a.box, b.box)) continue;
        const aBounds = this.getSpawnBounds(a.obstacle);
        const bBounds = this.getSpawnBounds(b.obstacle);
        const sameLane = Boolean(aBounds && bBounds && aBounds.laneMin <= bBounds.laneMax && aBounds.laneMax >= bBounds.laneMin);
        if (!sameLane) continue;
        overlaps.push({
          a: a.obstacle,
          b: b.obstacle,
          sameLane,
          boostOverlap: a.obstacle.type === "boostPad" || b.obstacle.type === "boostPad",
          rampOverlap: a.obstacle.type === "ramp" || b.obstacle.type === "ramp",
          gasCanOverlap: a.obstacle.type === "gasCan" || b.obstacle.type === "gasCan",
          gap: Math.abs(a.obstacle.distance - b.obstacle.distance)
        });
      }
    }
    return overlaps;
  }

  getObjectSpacingStats(obstacles) {
    const records = obstacles
      .filter((obstacle) => this.isGameplaySpawnObject(obstacle))
      .map((obstacle) => ({ obstacle, bounds: this.getSpawnBounds(obstacle) }))
      .filter((record) => record.bounds);
    let minSpacing = Infinity;
    let spacingSum = 0;
    let spacingCount = 0;

    for (let i = 0; i < records.length; i += 1) {
      for (let j = i + 1; j < records.length; j += 1) {
        const a = records[i];
        const b = records[j];
        const sameLane = a.bounds.laneMin <= b.bounds.laneMax && a.bounds.laneMax >= b.bounds.laneMin;
        if (!sameLane) continue;
        const gap = Math.abs(a.obstacle.distance - b.obstacle.distance);
        minSpacing = Math.min(minSpacing, gap);
        spacingSum += gap;
        spacingCount += 1;
      }
    }

    return {
      minSpacing: Number.isFinite(minSpacing) ? minSpacing : null,
      averageSpacing: spacingCount ? spacingSum / spacingCount : null,
      count: spacingCount
    };
  }

  getDangerZoneLaneOccupancy(obstacles, runDistance = this.game.run.distance) {
    const renderer = this.game.renderer;
    const top = renderer.height * DANGER_ZONE_TOP_RATIO;
    const bottom = renderer.height * DANGER_ZONE_BOTTOM_RATIO;
    const slices = [];
    const boxRecords = [];
    let maxBlocked = 0;
    let worstSlice = null;
    let invalid = false;

    for (const obstacle of obstacles) {
      if (!this.isFairnessBlocker(obstacle)) continue;
      const box = renderer.getObstacleHitboxAt(obstacle, runDistance);
      if (!box || box.y > bottom || box.y + box.h < top) continue;
      boxRecords.push({
        obstacle,
        info: OBSTACLE_INFO[obstacle.type],
        box,
        threshold: this.getLaneBlockThreshold(OBSTACLE_INFO[obstacle.type], box)
      });
    }

    for (let y = top; y <= bottom; y += DANGER_ZONE_SLICE_PX) {
      const lanes = new Set();
      const blockers = [];
      for (const record of boxRecords) {
        const { obstacle, box, threshold } = record;
        if (y < box.y || y > box.y + box.h) continue;
        for (let laneIndex = 0; laneIndex < LANES; laneIndex += 1) {
          const laneLeft = renderer.road.x + laneIndex * renderer.road.laneW;
          const laneRight = laneLeft + renderer.road.laneW;
          const overlap = segmentOverlap(box.x, box.x + box.w, laneLeft, laneRight);
          if (overlap >= threshold) {
            lanes.add(laneIndex);
            blockers.push({
              id: obstacle.id,
              type: obstacle.type,
              lane: laneIndex,
              obstacleLane: obstacle.lane,
              distance: Math.round(obstacle.distance)
            });
          }
        }
      }

      const blocked = lanes.size;
      const slice = {
        y,
        lanes: Array.from(lanes).sort((a, b) => a - b),
        count: blocked,
        blockers
      };
      slices.push(slice);
      if (blocked > maxBlocked) {
        maxBlocked = blocked;
        worstSlice = slice;
      }
      if (blocked >= LANES) invalid = true;
    }

    return { slices, maxBlocked, worstSlice, invalid };
  }

  getLaneBlockThreshold(info, box) {
    const laneW = this.game.renderer.road.laneW;
    if (info.crash || info.tall) {
      return Math.max(14, Math.min(box.w * 0.32, laneW * 0.3));
    }
    return Math.max(11, Math.min(box.w * 0.42, laneW * 0.24));
  }

  validateObstaclePattern(obstacles, runDistance = this.game.run.distance) {
    return this.getDangerZoneLaneOccupancy(obstacles, runDistance);
  }

  wouldCreateFiveLaneWall(candidateObstacle, existingObstacles = this.getSpawnValidationObstacles(candidateObstacle.distance)) {
    return this.scanCandidateSafety(candidateObstacle, existingObstacles).invalid;
  }

  canSpawnObstacle(candidateObstacle, existingObstacles = this.getSpawnValidationObstacles(candidateObstacle.distance)) {
    const overlap = this.wouldOverlapExistingObject(candidateObstacle, existingObstacles);
    if (overlap) {
      return {
        canSpawn: false,
        invalid: false,
        maxBlocked: 0,
        overlap,
        reason: `${candidateObstacle.type} would overlap ${overlap.obstacle.type}`
      };
    }
    if (!this.isFairnessBlocker(candidateObstacle)) {
      return { canSpawn: true, maxBlocked: 0, invalid: false, reason: "non-blocker" };
    }
    const scan = this.scanCandidateSafety(candidateObstacle, existingObstacles);
    if (scan.invalid) {
      return { ...scan, canSpawn: false, reason: "five-lane wall prevented" };
    }
    if (scan.maxBlocked >= 4) {
      const progress = candidateObstacle.distance / this.track.distanceToFinish;
      const enoughGap = candidateObstacle.distance - this.lastFourLanePressureDistance >= FOUR_LANE_PRESSURE_COOLDOWN;
      if (!candidateObstacle.allowFourLanePressure || progress < 0.75 || !enoughGap) {
        return { ...scan, canSpawn: false, reason: "four-lane pressure budget prevented" };
      }
    }
    return { ...scan, canSpawn: true, reason: "safe" };
  }

  scanCandidateSafety(candidateObstacle, existingObstacles = this.getSpawnValidationObstacles(candidateObstacle.distance)) {
    return this.scanPatternSafety([candidateObstacle], existingObstacles);
  }

  scanPatternSafety(candidateObstacles, existingObstacles = this.obstacles) {
    const renderer = this.game.renderer;
    const top = renderer.height * DANGER_ZONE_TOP_RATIO;
    const bottom = renderer.height * DANGER_ZONE_BOTTOM_RATIO;
    const aheadTop = renderer.aheadForY(top);
    const aheadBottom = renderer.aheadForY(bottom);
    const minDistance = Math.min(...candidateObstacles.map((obstacle) => obstacle.distance));
    const maxDistance = Math.max(...candidateObstacles.map((obstacle) => obstacle.distance));
    const start = Math.max(this.getSafetyRunDistance(minDistance), minDistance - aheadTop - 180);
    const end = maxDistance - aheadBottom + 180;
    const sampleStep = Math.max(22, VIEW_DISTANCE * (8 / renderer.road.h));
    const pattern = existingObstacles.concat(candidateObstacles);
    let maxBlocked = 0;
    let worst = null;
    let invalid = false;

    for (let runDistance = start; runDistance <= end; runDistance += sampleStep) {
      const result = this.validateObstaclePattern(pattern, runDistance);
      if (result.maxBlocked > maxBlocked) {
        maxBlocked = result.maxBlocked;
        worst = {
          runDistance,
          slice: result.worstSlice
        };
      }
      if (result.invalid) {
        invalid = true;
        worst = {
          runDistance,
          slice: result.worstSlice
        };
        break;
      }
    }

    return { invalid, maxBlocked, worst };
  }

  addWarning(distance, lane, warningType) {
    const progress = distance / this.track.distanceToFinish;
    const cruiseSpeed = getTrackCruiseSpeed(this.track, progress, this.getSpeedClassId());
    const settings = this.track.obstacleSettings;
    const leadDistance = Math.max(
      settings.warningLead ?? 520,
      cruiseSpeed * (settings.warningLeadSeconds ?? 1.75)
    );
    this.addObstacle("warning", lane, Math.max(80, distance - leadDistance), {
      warningType
    });
  }
}

// ---------------------------------------------------------------------------
// Collision and scoring
// ---------------------------------------------------------------------------

class CollisionSystem {
  constructor(game) {
    this.game = game;
  }

  update() {
    const run = this.game.run;
    run.lastCollision = "clear";
    run.collisionState = "clear";
    const playerBox = this.game.renderer.getPlayerHitbox();

    for (const obstacle of this.game.obstacles.obstacles) {
      const info = OBSTACLE_INFO[obstacle.type];
      if (!info || obstacle.hit || obstacle.type === "warning") continue;
      const obstacleBox = this.game.renderer.getObstacleHitbox(obstacle);
      if (!obstacleBox) continue;
      const minOverlapPx = getCollisionMinOverlapPx(obstacle.type);
      const collision = rectsOverlapByThreshold(playerBox, obstacleBox, minOverlapPx);

      if (collision.hit) {
        const result = this.getCollisionResult(obstacle, info);
        this.logCollision(obstacle, info, playerBox, obstacleBox, collision.overlap, result, minOverlapPx);
        if (obstacle.type === "gasCan") {
          this.game.collectGasCan(obstacle);
          continue;
        }
        if (run.airborne && !info.tall && obstacle.type !== "ramp" && obstacle.type !== "boostPad") {
          obstacle.hit = true;
          obstacle.remove = true;
          run.lastCollision = `jumped ${info.label}`;
          run.collisionState = `airborne over ${info.label}`;
          continue;
        }
        run.collisionState = `hit ${info.label}`;
        this.resolveHit(obstacle, info);
      } else if (this.isNearMiss(playerBox, obstacleBox, obstacle, info)) {
        obstacle.nearMissAwarded = true;
        this.game.addScoreEvent("nearMiss", 150);
        this.game.audio.playSfx("nearMiss");
        run.nearMisses += 1;
        run.collisionState = `near miss ${info.label}`;
      }
    }
  }

  isNearMiss(playerBox, obstacleBox, obstacle, info) {
    if (!info.tall || obstacle.nearMissAwarded) return false;
    const nearMissZone = expandRect(playerBox, NEAR_MISS_ZONE_EXPANSION_PX, 0);
    const passedPlayer = obstacleBox.y > playerBox.y + playerBox.h;
    const stillCloseVertically = obstacleBox.y < playerBox.y + playerBox.h + 150;
    const closeHorizontally = rectsOverlap(nearMissZone, obstacleBox)
      || rectHorizontalGap(playerBox, obstacleBox) <= NEAR_MISS_ZONE_EXPANSION_PX;
    return passedPlayer && stillCloseVertically && closeHorizontally;
  }

  getCollisionResult(obstacle, info) {
    const run = this.game.run;
    if (run.airborne && !info.tall && obstacle.type !== "ramp" && obstacle.type !== "boostPad") return "airborne-pass";
    if (info.crash) return "crash";
    if (obstacle.type === "gasCan") return "collect";
    if (obstacle.type === "oil") return "oil";
    if (obstacle.type === "ramp") return "ramp";
    if (obstacle.type === "boostPad") return "boost";
    return "slowdown";
  }

  logCollision(obstacle, info, playerBox, obstacleBox, overlap, result, minOverlapPx) {
    if (!this.game.debugMode || typeof console === "undefined") return;
    const run = this.game.run;
    console.info("[collision]", {
      objectType: obstacle.type,
      label: info.label,
      playerHitbox: this.formatRect(playerBox),
      obstacleHitbox: this.formatRect(obstacleBox),
      overlapWidth: Number(overlap.width.toFixed(2)),
      overlapHeight: Number(overlap.height.toFixed(2)),
      minOverlapPx,
      playerLane: run.targetLane,
      obstacleLane: obstacle.lane,
      playerAirborne: run.airborne,
      result
    });
  }

  formatRect(rect) {
    return {
      x: Number(rect.x.toFixed(2)),
      y: Number(rect.y.toFixed(2)),
      w: Number(rect.w.toFixed(2)),
      h: Number(rect.h.toFixed(2))
    };
  }

  resolveHit(obstacle, info) {
    const run = this.game.run;
    obstacle.hit = true;
    obstacle.remove = true;
    run.lastCollision = info.label;

    if (info.crash) {
      this.game.endRace("crashed", info.label);
      return;
    }

    if (obstacle.type === "ramp") {
      this.game.launchJump();
      this.game.addScoreEvent("ramp", 80);
      this.game.audio.playSfx("ramp");
      return;
    }

    if (obstacle.type === "boostPad") {
      run.padBoostTimer = Math.max(run.padBoostTimer, SPEED_TUNING.padBoostDuration);
      run.boostBurstTimer = Math.max(run.boostBurstTimer || 0, ARCADE_FEEL.boostBurstSeconds);
      run.screenShake = Math.max(run.screenShake || 0, 0.14);
      this.game.addScoreEvent("boostPad", 400);
      this.game.audio.playSfx("boost");
      return;
    }

    if (obstacle.type === "oil") {
      run.oilTimer = 2;
      this.game.applySlowdown(0.78, -350, "oil", "oil");
      return;
    }

    this.game.applySlowdown(obstacle.type === "deer" ? 0.72 : 0.82, -500, obstacle.type);
  }
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.width = 960;
    this.height = 720;
    this.road = {
      x: 180,
      y: 92,
      w: 600,
      h: 628,
      laneW: 120
    };
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    const roadWidth = Math.min(this.width * 0.86, 760);
    const minTop = this.height < 620 ? 76 : 92;
    this.road = {
      x: (this.width - roadWidth) / 2,
      y: minTop,
      w: roadWidth,
      h: this.height - minTop,
      laneW: roadWidth / LANES
    };
  }

  laneCenter(lane) {
    return this.road.x + this.road.laneW * (lane + 0.5);
  }

  yForDistance(distance) {
    return this.yForDistanceAt(distance, this.game.run.distance);
  }

  yForDistanceAt(distance, runDistance) {
    const ahead = distance - runDistance;
    const t = 1 - clamp(ahead / VIEW_DISTANCE, 0, 1);
    return this.road.y + this.road.h * t;
  }

  aheadForY(y) {
    const t = clamp((y - this.road.y) / this.road.h, 0, 1);
    return (1 - t) * VIEW_DISTANCE;
  }

  scaleForY(y) {
    const t = clamp((y - this.road.y) / this.road.h, 0, 1);
    return lerp(0.72, 1.12, t);
  }

  getPlayerVisualSize() {
    const run = this.game.run;
    const car = run?.player?.car || DEFAULT_CAR;
    return getPlayerCarDrawSize(car, {
      airborne: false,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
  }

  getPlayerDriveZone() {
    const size = this.getPlayerVisualSize();
    const bottomSafeY = this.height - TRACK_VISUALS.bottomCarMargin - size.h * 0.5;
    const topSafeY = this.road.y + size.h * 0.48;
    const minY = Math.max(this.height * PLAYER_MIN_Y_RATIO, topSafeY);
    const maxY = Math.min(this.height * PLAYER_MAX_Y_RATIO, bottomSafeY);
    return {
      minY,
      maxY: Math.max(minY, maxY)
    };
  }

  getPlayerScreenY() {
    const run = this.game.run;
    const zone = this.getPlayerDriveZone();
    const baseY = clamp(this.height * run.playerYRatio, zone.minY, zone.maxY);
    return baseY - run.jumpOffset;
  }

  getPlayerFloatingAnchor() {
    const run = this.game.run;
    return {
      x: this.laneCenter(run.renderLaneFloat),
      y: this.getPlayerScreenY()
    };
  }

  getPlayerVisualRect() {
    const run = this.game.run;
    const x = this.laneCenter(run.renderLaneFloat);
    const y = this.getPlayerScreenY();
    const size = getPlayerCarDrawSize(run.player.car, {
      airborne: run.airborne,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
    return {
      objectType: "player",
      centerX: x,
      centerY: y,
      renderedX: x - size.w / 2,
      renderedY: y - size.h / 2,
      renderedWidth: size.w,
      renderedHeight: size.h
    };
  }

  getPlayerRenderBounds() {
    return rectFromRenderedVisual(this.getPlayerVisualRect());
  }

  getPlayerHitboxFromVisualRect(visual) {
    const config = getHitboxConfig("player");
    return rectFromCenter(
      visual.centerX + visual.renderedWidth * config.offsetX,
      visual.centerY + visual.renderedHeight * config.offsetY,
      visual.renderedWidth * config.width,
      visual.renderedHeight * config.height
    );
  }

  getPlayerHitbox() {
    return this.getPlayerHitboxFromVisualRect(this.getPlayerVisualRect());
  }

  getObstacleScreenPosition(obstacle) {
    return this.getObstacleScreenPositionAt(obstacle, this.game.run.distance);
  }

  getObstacleScreenPositionAt(obstacle, runDistance) {
    const y = this.yForDistanceAt(obstacle.distance, runDistance);
    const laneValue = this.getObstacleLaneFloatAt(obstacle, runDistance);
    const x = this.laneCenter(clamp(laneValue, 0, LANES - 1));
    const scale = this.scaleForY(y);
    return { x, y, scale };
  }

  getObstacleLaneFloatAt(obstacle, runDistance) {
    if (obstacle.type !== "deer") return obstacle.lane;
    const ahead = obstacle.distance - runDistance;
    const travel = clamp(1 - ahead / VIEW_DISTANCE, 0, 1);
    const eased = easeOutCubic(travel);
    if (obstacle.direction > 0) {
      return lerp(-0.45, LANES - 0.55, eased);
    }
    return lerp(LANES - 0.55, -0.45, eased);
  }

  getObstacleHitbox(obstacle) {
    return this.getObstacleHitboxAt(obstacle, this.game.run.distance);
  }

  getObstacleRenderBounds(obstacle) {
    return this.getObstacleRenderBoundsAt(obstacle, this.game.run.distance);
  }

  getTrafficSpriteForObstacle(obstacle) {
    if (!obstacle || !this.game.trafficSprites) return null;
    return this.game.trafficSprites.getSprite(obstacle.type, obstacle.variant);
  }

  getObstacleVisualSize(type, scale = 1, obstacle = null) {
    const info = OBSTACLE_INFO[type];
    if (!info) return { w: 0, h: 0, drawScale: scale };
    const config = VEHICLE_SCALE_CONFIG[type];
    const baseWidth = config ? getConfiguredVehicleWidth(config, this.road.laneW) : info.w;
    const sprite = obstacle ? this.getTrafficSpriteForObstacle(obstacle) : null;
    if (sprite) {
      const box = getScaledSpriteBox(sprite, baseWidth * scale);
      return {
        w: box.w,
        h: box.h,
        drawScale: scale,
        sprite,
        source: box.source
      };
    }
    if (!config) {
      return {
        w: info.w * scale,
        h: info.h * scale,
        drawScale: scale
      };
    }
    const drawScale = (baseWidth / info.w) * scale;
    return {
      w: info.w * drawScale,
      h: info.h * drawScale,
      drawScale
    };
  }

  getObstacleVisualRectAt(obstacle, runDistance) {
    const info = OBSTACLE_INFO[obstacle.type];
    if (!info || obstacle.type === "warning") return null;
    const ahead = obstacle.distance - runDistance;
    if (ahead < -70 || ahead > VIEW_DISTANCE + 160) return null;
    const { x, y, scale } = this.getObstacleScreenPositionAt(obstacle, runDistance);
    const size = this.getObstacleVisualSize(obstacle.type, scale, obstacle);
    return {
      objectType: obstacle.type,
      spriteVariant: obstacle.variant || "",
      centerX: x,
      centerY: y,
      renderedX: x - size.w / 2,
      renderedY: y - size.h / 2,
      renderedWidth: size.w,
      renderedHeight: size.h,
      drawScale: size.drawScale,
      sprite: Boolean(size.sprite)
    };
  }

  getObstacleRenderBoundsAt(obstacle, runDistance) {
    return rectFromRenderedVisual(this.getObstacleVisualRectAt(obstacle, runDistance));
  }

  getObstacleHitboxAt(obstacle, runDistance) {
    const config = getHitboxConfig(obstacle.type);
    if (!config) return null;
    const visual = this.getObstacleVisualRectAt(obstacle, runDistance);
    if (!visual) return null;
    return rectFromCenter(
      visual.centerX + config.offsetX * visual.renderedWidth,
      visual.centerY + config.offsetY * visual.renderedHeight,
      visual.renderedWidth * config.width,
      visual.renderedHeight * config.height
    );
  }

  clear() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
  }

  render() {
    this.clear();
    this.drawBackground();
    if (this.game.screen === "game" || this.game.screen === "score") {
      this.drawRace();
    } else {
      this.drawAttractRoad();
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const h = this.height;
    const w = this.width;
    const visualIntensity = this.getRaceVisualIntensity();
    const glowStrength = clamp(TRACK_VISUALS.horizonGlowStrength * clamp(visualIntensity, 0.78, 1.28), 0.45, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#100c2b");
    sky.addColorStop(0.26, "#2c0d46");
    sky.addColorStop(0.44, "#5a1943");
    sky.addColorStop(0.58, "#171224");
    sky.addColorStop(1, "#05050a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const horizonY = Math.max(235, Math.min(h * 0.46, this.road.y + this.road.h * 0.42));
    const sunY = Math.min(horizonY - 72, h * 0.27);
    const sunR = Math.min(132, w * 0.17);
    const sun = ctx.createRadialGradient(w * 0.5, sunY, 10, w * 0.5, sunY, sunR);
    sun.addColorStop(0, `rgba(255, 228, 94, ${0.95 * glowStrength})`);
    sun.addColorStop(0.42, `rgba(255, 130, 75, ${0.66 * glowStrength})`);
    sun.addColorStop(1, "rgba(255, 63, 209, 0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    const horizonGlow = ctx.createRadialGradient(w * 0.5, horizonY, 4, w * 0.5, horizonY, Math.max(w * 0.28, 320));
    horizonGlow.addColorStop(0, `rgba(255, 148, 72, ${0.42 * glowStrength})`);
    horizonGlow.addColorStop(0.38, `rgba(255, 63, 209, ${0.17 * glowStrength})`);
    horizonGlow.addColorStop(1, "rgba(40, 246, 255, 0)");
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - 180, w, 360);

    this.drawHorizonSilhouettes(horizonY);

    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = "#28f6ff";
    ctx.lineWidth = 1;
    const gridY = horizonY + 12;
    for (let y = gridY; y < h; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = -w; x < w * 2; x += 68) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5, gridY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHorizonSilhouettes(horizonY) {
    const ctx = this.ctx;
    const w = this.width;
    ctx.save();
    ctx.fillStyle = "rgba(11, 8, 24, 0.88)";
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 26);
    for (let i = 0; i <= 12; i += 1) {
      const x = (w / 12) * i;
      const peak = horizonY - 34 - deterministicNoise(i, 2) * 52;
      ctx.lineTo(x, peak);
      ctx.lineTo(x + w / 24, horizonY + 18 - deterministicNoise(i, 3) * 16);
    }
    ctx.lineTo(w, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(5, 7, 18, 0.72)";
    const cityBase = horizonY + 34;
    for (let i = 0; i < 28; i += 1) {
      const buildingW = 12 + deterministicNoise(i, 8) * 22;
      const x = i * (w / 28) + deterministicNoise(i, 9) * 10;
      const height = 24 + deterministicNoise(i, 10) * 76;
      ctx.fillRect(x, cityBase - height, buildingW, height);
      if (deterministicNoise(i, 11) > 0.56) {
        ctx.fillStyle = "rgba(255, 228, 94, 0.38)";
        ctx.fillRect(x + buildingW * 0.35, cityBase - height + 12, 3, 3);
        ctx.fillStyle = "rgba(5, 7, 18, 0.72)";
      }
    }
    ctx.restore();
  }

  getVisualDistance() {
    return this.game.screen === "game" || this.game.screen === "score"
      ? this.game.run.distance
      : this.game.attractDistance;
  }

  getVisualSpeedRatio() {
    const run = this.game.run;
    if (!run || !run.track) return 0.25;
    return clamp(run.currentSpeed / Math.max(1, run.track.maxSpeed), 0, 1.18);
  }

  getFinalStretchIntensity() {
    const run = this.game.run;
    if (!run || !run.track || this.game.screen !== "game") return 0;
    const progress = clamp(run.distance / run.track.distanceToFinish, 0, 1);
    return clamp((progress - TRACK_VISUALS.finalStretchStart) / Math.max(0.01, 1 - TRACK_VISUALS.finalStretchStart), 0, 1);
  }

  getRaceVisualIntensity() {
    const run = this.game.run;
    if (!run || !run.track || (this.game.screen !== "game" && this.game.screen !== "score")) return 1;
    const progress = clamp(run.distance / Math.max(1, run.track.distanceToFinish), 0, 1);
    const section = getTrackSection(run.track, progress);
    return getSectionNumber({
      visualIntensity: Number.isFinite(run.sectionVisualIntensity) ? run.sectionVisualIntensity : section.visualIntensity
    }, "visualIntensity", 1, 0.65, 1.55);
  }

  drawRoadsideScenery(alpha = 1) {
    const ctx = this.ctx;
    const road = this.road;
    const scrollSource = this.getVisualDistance();
    const speedRatio = this.getVisualSpeedRatio();
    const visualIntensity = this.getRaceVisualIntensity();
    const spacing = TRACK_VISUALS.scenerySpacing / Math.max(0.55, TRACK_VISUALS.sceneryDensity);
    const sceneryScrollScale = 0.22 + speedRatio * 0.12;
    const scroll = (scrollSource * sceneryScrollScale) % spacing;
    const count = Math.ceil(this.height / spacing) + 4;
    const leftMin = 16;
    const leftMax = Math.max(leftMin + 8, road.x - 36);
    const rightMin = Math.min(this.width - 16, road.x + road.w + 36);
    const rightMax = this.width - 16;

    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = -2; i < count; i += 1) {
      const worldIndex = Math.floor((scrollSource * sceneryScrollScale) / spacing) + i;
      const y = road.y - spacing + i * spacing + scroll;
      const side = deterministicNoise(worldIndex, 20) > 0.5 ? 1 : -1;
      const x = side < 0
        ? lerp(leftMin, leftMax, deterministicNoise(worldIndex, 21))
        : lerp(rightMin, rightMax, deterministicNoise(worldIndex, 22));
      const depth = clamp((y - road.y) / Math.max(1, road.h), 0, 1);
      const scale = lerp(0.56, 1.12, depth);
      const typeRoll = deterministicNoise(worldIndex, 23);
      const signRoll = deterministicNoise(worldIndex, 24);
      const warmth = clamp(this.getFinalStretchIntensity() + Math.max(0, visualIntensity - 1) * 0.42, 0, 1);

      if (typeRoll < 0.42) {
        this.drawPalmSilhouette(x, y, scale, side);
      } else if (typeRoll < 0.68) {
        this.drawRoadsideBillboard(x, y, scale, side, signRoll < TRACK_VISUALS.roadsideSignFrequency ? "SUNSET HWY" : "");
      } else if (typeRoll < 0.82) {
        this.drawNeonMileSign(x, y, scale, side, signRoll < 0.5 ? "GAS" : "EAT");
      } else {
        this.drawLowDesertRock(x, y, scale, warmth);
      }
    }

    const parallaxScroll = (scrollSource * (0.12 + speedRatio * 0.07)) % 120;
    ctx.globalAlpha = alpha * 0.16;
    ctx.strokeStyle = "#28f6ff";
    ctx.lineWidth = 1;
    for (let y = this.road.y + parallaxScroll - 120; y < this.height + 120; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(road.x - 18, y + 64);
      ctx.moveTo(road.x + road.w + 18, y + 64);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPalmSilhouette(x, y, scale, side) {
    const ctx = this.ctx;
    const trunkH = 72 * scale;
    const trunkW = 5 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(4, 5, 12, 0.82)";
    ctx.fillRect(-trunkW / 2, -trunkH, trunkW, trunkH);
    ctx.strokeStyle = "rgba(40, 246, 255, 0.18)";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.moveTo(0, -trunkH);
    ctx.lineTo(side * 22 * scale, -trunkH - 18 * scale);
    ctx.moveTo(0, -trunkH);
    ctx.lineTo(side * -22 * scale, -trunkH - 16 * scale);
    ctx.moveTo(0, -trunkH);
    ctx.lineTo(side * 28 * scale, -trunkH + 2 * scale);
    ctx.moveTo(0, -trunkH);
    ctx.lineTo(side * -28 * scale, -trunkH + 4 * scale);
    ctx.stroke();
    ctx.restore();
  }

  drawRoadsideBillboard(x, y, scale, side, label) {
    const ctx = this.ctx;
    const w = 92 * scale;
    const h = 44 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(4, 5, 12, 0.78)";
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = label ? "#ff3fd1" : "rgba(255, 228, 94, 0.48)";
    ctx.shadowBlur = label ? 14 * scale : 0;
    ctx.shadowColor = "#ff3fd1";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.strokeRect(-w / 2, -h, w, h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(6, 7, 14, 0.9)";
    ctx.fillRect(-w * 0.28, 0, w * 0.08, 34 * scale);
    ctx.fillRect(w * 0.2, 0, w * 0.08, 34 * scale);
    if (label) {
      ctx.fillStyle = "#ffe45e";
      ctx.font = `800 ${Math.max(8, 10 * scale)}px Trebuchet MS, Verdana, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, -h * 0.5);
    } else {
      ctx.fillStyle = side < 0 ? "#28f6ff" : "#ffe45e";
      ctx.fillRect(-w * 0.32, -h * 0.62, w * 0.64, 4 * scale);
      ctx.fillRect(-w * 0.22, -h * 0.38, w * 0.44, 4 * scale);
    }
    ctx.restore();
  }

  drawNeonMileSign(x, y, scale, side, label) {
    const ctx = this.ctx;
    const w = 42 * scale;
    const h = 58 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(6, 7, 14, 0.86)";
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = side < 0 ? "#28f6ff" : "#ffe45e";
    ctx.shadowBlur = 12 * scale;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.strokeRect(-w / 2, -h, w, h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f6fbff";
    ctx.font = `800 ${Math.max(8, 11 * scale)}px Trebuchet MS, Verdana, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, -h * 0.5);
    ctx.restore();
  }

  drawLowDesertRock(x, y, scale, warmth) {
    const ctx = this.ctx;
    const w = 54 * scale;
    const h = 26 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(${Math.round(20 + warmth * 36)}, ${Math.round(11 + warmth * 18)}, ${Math.round(28 + warmth * 18)}, 0.82)`;
    ctx.beginPath();
    ctx.moveTo(-w * 0.48, 0);
    ctx.lineTo(-w * 0.22, -h * 0.92);
    ctx.lineTo(w * 0.1, -h * 0.72);
    ctx.lineTo(w * 0.46, -h * 0.18);
    ctx.lineTo(w * 0.38, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawAttractRoad() {
    const ctx = this.ctx;
    this.drawRoadsideScenery(0.62);
    this.drawRoadBase(0.45);
    ctx.save();
    ctx.globalAlpha = 0.28;
    for (let i = 0; i < 11; i += 1) {
      const y = this.road.y + i * this.road.h / 10;
      const lane = i % LANES;
      const type = i % 2 ? "fastCar" : "slowCar";
      const variants = this.game.trafficSprites?.getVariantIds(type) || [];
      const obstacle = { type, variant: variants.length ? variants[i % variants.length] : "" };
      const visual = this.getObstacleVisualSize(type, 0.72, obstacle);
      if (visual.sprite) {
        drawTrafficSprite(ctx, this.laneCenter(lane), y, visual);
      } else {
        drawTrafficCar(ctx, this.laneCenter(lane), y, type, visual.drawScale);
      }
    }
    ctx.restore();
  }

  drawRace() {
    const ctx = this.ctx;
    const run = this.game.run;
    const shake = Math.max(run.crashFlash || 0, run.screenShake || 0);
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 14 * shake);
    }
    this.drawRoadsideScenery(1);
    this.drawRoadBase(1);
    this.drawStartLineIfVisible();
    this.drawSpeedLines();
    this.drawFinishLineIfVisible();

    const sorted = this.game.obstacles.obstacles.slice().sort((a, b) => b.distance - a.distance);
    for (const obstacle of sorted) {
      const { x, y, scale } = this.getObstacleScreenPosition(obstacle);
      if (y < this.road.y - 110 || y > this.height + 170) continue;
      this.drawObstacle(ctx, obstacle, x, y, scale);
    }

    this.drawBoostBurst();
    this.drawPlayer();
    this.drawBumpFlash();
    if (this.game.debugMode) this.drawHitboxOverlay();
    ctx.restore();
    this.drawFinishFlash();
    this.drawFloatingTexts();
    this.drawCountdown();
    this.drawCrashBeat();
    this.drawFuelOutBeat();
    this.drawSectionNotice();
    this.drawHud();
    if (this.game.debugMode) this.drawDebug();
  }

  drawRoadBase(alpha) {
    const ctx = this.ctx;
    const road = this.road;
    const visualIntensity = this.getRaceVisualIntensity();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#161722";
    ctx.fillRect(road.x, road.y, road.w, road.h);
    ctx.fillStyle = "#10111a";
    ctx.fillRect(road.x + 8, road.y, road.w - 16, road.h);

    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    for (let i = 0; i < LANES; i += 1) {
      if (i % 2 === 0) {
        ctx.fillRect(road.x + i * road.laneW, road.y, road.laneW, road.h);
      }
    }

    const scrollSource = this.getVisualDistance();
    this.drawRoadSurfaceDetails(scrollSource, alpha);

    ctx.shadowBlur = 14 * visualIntensity;
    ctx.shadowColor = "#28f6ff";
    ctx.strokeStyle = "#28f6ff";
    ctx.lineWidth = 4 + Math.max(0, visualIntensity - 1) * 1.5;
    ctx.beginPath();
    ctx.moveTo(road.x, road.y);
    ctx.lineTo(road.x, this.height);
    ctx.moveTo(road.x + road.w, road.y);
    ctx.lineTo(road.x + road.w, this.height);
    ctx.stroke();
    this.drawRoadEdgeDetails(scrollSource, alpha);

    const dashHeight = 56;
    const gap = 46;
    const scroll = (scrollSource * SPEED_TUNING.roadStripeScrollScale) % (dashHeight + gap);
    const lanePulse = 0.94 + Math.sin(scrollSource * 0.018) * 0.06 * clamp((visualIntensity - 0.8) / 0.55, 0, 1);
    ctx.globalAlpha = alpha * clamp(visualIntensity * lanePulse, 0.78, 1.24);
    for (let lane = 1; lane < LANES; lane += 1) {
      const x = road.x + lane * road.laneW;
      ctx.shadowColor = lane % 2 ? "#ff3fd1" : "#ffe45e";
      ctx.strokeStyle = lane % 2 ? "#ff3fd1" : "#ffe45e";
      ctx.lineWidth = 3;
      for (let y = road.y - dashHeight + scroll; y < this.height + dashHeight; y += dashHeight + gap) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + dashHeight);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = alpha;

    const glowLane = this.game.run.targetLane;
    const glowX = road.x + glowLane * road.laneW;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#44ff99";
    ctx.strokeStyle = "rgba(68, 255, 153, 0.36)";
    ctx.lineWidth = 3;
    ctx.strokeRect(glowX + 6, road.y + 6, road.laneW - 12, road.h - 12);
    this.drawFinalStretchRoadGlow(alpha);
    ctx.restore();
  }

  drawRoadSurfaceDetails(scrollSource, alpha) {
    const ctx = this.ctx;
    const road = this.road;
    const visualIntensity = this.getRaceVisualIntensity();
    const intensity = TRACK_VISUALS.roadDetailIntensity * alpha * clamp(visualIntensity, 0.78, 1.18);
    const bandSpacing = TRACK_VISUALS.asphaltBandSpacing;
    const seamSpacing = TRACK_VISUALS.roadSeamSpacing;
    const bandScroll = (scrollSource * 0.28) % bandSpacing;
    const seamScroll = (scrollSource * 0.62) % seamSpacing;
    const speedRatio = this.getVisualSpeedRatio();

    ctx.save();
    ctx.globalAlpha = intensity;
    for (let y = road.y - bandSpacing + bandScroll; y < this.height + bandSpacing; y += bandSpacing) {
      const shade = ctx.createLinearGradient(0, y, 0, y + 22);
      shade.addColorStop(0, "rgba(255, 255, 255, 0.035)");
      shade.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = shade;
      ctx.fillRect(road.x + 14, y, road.w - 28, 22);
    }

    ctx.globalAlpha = intensity * 0.42;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    for (let y = road.y - seamSpacing + seamScroll; y < this.height + seamSpacing; y += seamSpacing) {
      ctx.beginPath();
      ctx.moveTo(road.x + 20, y);
      ctx.lineTo(road.x + road.w - 20, y);
      ctx.stroke();
    }

    ctx.globalAlpha = intensity * (0.18 + speedRatio * 0.14);
    for (let lane = 0; lane < LANES; lane += 1) {
      const x = road.x + lane * road.laneW;
      const laneGlow = ctx.createLinearGradient(x, 0, x + road.laneW, 0);
      laneGlow.addColorStop(0, "rgba(40, 246, 255, 0.02)");
      laneGlow.addColorStop(0.5, lane % 2 ? "rgba(255, 63, 209, 0.035)" : "rgba(255, 228, 94, 0.025)");
      laneGlow.addColorStop(1, "rgba(40, 246, 255, 0.02)");
      ctx.fillStyle = laneGlow;
      ctx.fillRect(x + 3, road.y, road.laneW - 6, road.h);
    }
    ctx.restore();
  }

  drawRoadEdgeDetails(scrollSource, alpha) {
    const ctx = this.ctx;
    const road = this.road;
    const speedRatio = this.getVisualSpeedRatio();
    const visualIntensity = this.getRaceVisualIntensity();
    const lightSpacing = TRACK_VISUALS.edgeLightSpacing;
    const reflectorSpacing = TRACK_VISUALS.reflectorSpacing;
    const lightScroll = (scrollSource * (0.72 + speedRatio * 0.42) * clamp(visualIntensity, 0.92, 1.12)) % lightSpacing;
    const reflectorScroll = (scrollSource * 0.58) % reflectorSpacing;

    ctx.save();
    ctx.globalAlpha = alpha * 0.85 * clamp(visualIntensity, 0.78, 1.18);
    for (let y = road.y - lightSpacing + lightScroll; y < this.height + lightSpacing; y += lightSpacing) {
      const t = clamp((y - road.y) / Math.max(1, road.h), 0, 1);
      const size = lerp(3, 7, t);
      const color = Math.floor(y / lightSpacing) % 2 ? "#ff3fd1" : "#28f6ff";
      ctx.shadowBlur = 12 * visualIntensity;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(road.x - 14, y, size, size * 2.3);
      ctx.fillRect(road.x + road.w + 14 - size, y, size, size * 2.3);
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.42;
    ctx.fillStyle = "#ffe45e";
    for (let y = road.y - reflectorSpacing + reflectorScroll; y < this.height + reflectorSpacing; y += reflectorSpacing) {
      ctx.fillRect(road.x + 10, y, 5, 16);
      ctx.fillRect(road.x + road.w - 15, y, 5, 16);
    }
    ctx.restore();
  }

  drawFinalStretchRoadGlow(alpha) {
    const finalStretch = this.getFinalStretchIntensity();
    const visualIntensity = this.getRaceVisualIntensity();
    const sectionPush = clamp((visualIntensity - 1) / 0.35, 0, 1);
    const glowIntensity = Math.max(finalStretch, sectionPush * 0.45);
    if (glowIntensity <= 0) return;
    const ctx = this.ctx;
    const road = this.road;
    ctx.save();
    ctx.globalAlpha = alpha * glowIntensity * 0.22;
    const glow = ctx.createLinearGradient(0, road.y, 0, this.height);
    glow.addColorStop(0, "rgba(255, 228, 94, 0)");
    glow.addColorStop(0.6, "rgba(255, 95, 68, 0.24)");
    glow.addColorStop(1, "rgba(255, 63, 209, 0.12)");
    ctx.fillStyle = glow;
    ctx.fillRect(road.x, road.y, road.w, road.h);
    ctx.restore();
  }

  drawStartLineIfVisible() {
    const run = this.game.run;
    if (!run || this.game.screen !== "game" || run.distance > 360) return;
    const y = this.road.y + this.road.h + (run.distance / VIEW_DISTANCE) * this.road.h;
    if (y > this.height + 90) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = clamp(1 - run.distance / 360, 0, 1);
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#44ff99";
    ctx.fillStyle = "#44ff99";
    ctx.fillRect(this.road.x, y - 5, this.road.w, 10);
    ctx.fillStyle = "#08080d";
    const cell = Math.max(16, this.road.w / 26);
    for (let x = this.road.x; x < this.road.x + this.road.w; x += cell * 2) {
      ctx.fillRect(x, y - 5, cell, 10);
    }
    ctx.restore();
  }

  drawFinishLineIfVisible() {
    const run = this.game.run;
    const finishDistance = run.track.distanceToFinish;
    if (finishDistance - run.distance > VIEW_DISTANCE) return;
    const y = this.yForDistance(finishDistance);
    this.drawFinishGantry(y, this.scaleForY(y));
    drawFinishLine(this.ctx, this.road.x, y, this.road.w, this.scaleForY(y));
  }

  drawFinishGantry(y, scale) {
    if (y < this.road.y - 110 || y > this.height + 140) return;
    const ctx = this.ctx;
    const road = this.road;
    const postH = 104 * scale;
    const topY = y - postH;
    const leftX = road.x - 38 * scale;
    const rightX = road.x + road.w + 38 * scale;
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#ffe45e";
    ctx.strokeStyle = "#ffe45e";
    ctx.lineWidth = Math.max(3, 5 * scale);
    ctx.beginPath();
    ctx.moveTo(leftX, y + 30 * scale);
    ctx.lineTo(leftX, topY);
    ctx.lineTo(rightX, topY);
    ctx.lineTo(rightX, y + 30 * scale);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(5, 7, 18, 0.9)";
    ctx.fillRect(leftX + 12 * scale, topY - 20 * scale, rightX - leftX - 24 * scale, 36 * scale);
    ctx.strokeStyle = "#28f6ff";
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeRect(leftX + 12 * scale, topY - 20 * scale, rightX - leftX - 24 * scale, 36 * scale);
    ctx.fillStyle = "#f6fbff";
    ctx.font = `900 ${Math.max(12, 18 * scale)}px Trebuchet MS, Verdana, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SUNSET HWY", road.x + road.w / 2, topY - 2 * scale);
    for (let i = 0; i < 6; i += 1) {
      const x = lerp(leftX + 38 * scale, rightX - 38 * scale, i / 5);
      ctx.fillStyle = i % 2 ? "#ff3fd1" : "#44ff99";
      ctx.beginPath();
      ctx.arc(x, y + 38 * scale, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawObstacle(ctx, obstacle, x, y, scale) {
    const visual = this.getObstacleVisualSize(obstacle.type, scale, obstacle);
    if (visual.sprite) {
      drawTrafficSprite(ctx, x, y, visual);
      return;
    }
    const drawScale = visual.drawScale;
    if (obstacle.type === "slowCar" || obstacle.type === "fastCar") {
      drawTrafficCar(ctx, x, y, obstacle.type, drawScale);
    } else if (obstacle.type === "truck") {
      drawTruck(ctx, x, y, drawScale);
    } else if (obstacle.type === "deer") {
      drawDeer(ctx, x, y, obstacle.direction, scale);
    } else if (obstacle.type === "cone") {
      drawCone(ctx, x, y, scale);
    } else if (obstacle.type === "oil") {
      drawOilSlick(ctx, x, y, scale);
    } else if (obstacle.type === "ramp") {
      drawRamp(ctx, x, y, scale);
    } else if (obstacle.type === "boostPad") {
      drawBoostPad(ctx, x, y, scale);
    } else if (obstacle.type === "gasCan") {
      drawGasCan(ctx, x, y, scale);
    } else if (obstacle.type === "barrier") {
      drawBarrier(ctx, x, y, drawScale);
    } else if (obstacle.type === "branch") {
      drawBranch(ctx, x, y, scale);
    } else if (obstacle.type === "warning") {
      drawRoadSign(ctx, x, y, obstacle.warningType || "work", scale);
    }
  }

  drawPlayer() {
    const run = this.game.run;
    const x = this.laneCenter(run.renderLaneFloat);
    const y = this.getPlayerScreenY();
    drawPlayerCar(this.ctx, x, y, run.player.car, {
      boosting: run.boostTimer > 0 || run.padBoostTimer > 0,
      airborne: run.airborne,
      laneWidth: this.road.laneW,
      laneChanging: Math.abs(run.renderLaneFloat - run.targetLane) > 0.02,
      laneDelta: run.targetLane - run.renderLaneFloat,
      verticalInput: run.verticalInput,
      crashFlash: run.crashFlash
    }, this.game.carSprites);
  }

  drawHitboxOverlay() {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 0;
    this.drawDangerZoneOverlay();
    const playerRenderBox = this.getPlayerRenderBounds();
    const playerBox = this.getPlayerHitbox();
    drawHitboxRect(ctx, playerRenderBox, "rgba(246, 251, 255, 0.88)", `PLAYER render ${playerRenderBox.w.toFixed(0)}x${playerRenderBox.h.toFixed(0)}`, "render");
    drawHitboxRect(ctx, playerBox, "#28f6ff", `PLAYER hit ${playerBox.w.toFixed(0)}x${playerBox.h.toFixed(0)}`, "hitbox");
    for (const obstacle of this.game.obstacles.obstacles) {
      const renderBox = this.getObstacleRenderBounds(obstacle);
      const box = this.getObstacleHitbox(obstacle);
      if (!box) continue;
      if (box.y > this.height + 140 || box.y + box.h < this.road.y - 140) continue;
      const info = OBSTACLE_INFO[obstacle.type];
      const overlap = rectOverlapSize(playerBox, box);
      const minOverlapPx = getCollisionMinOverlapPx(obstacle.type);
      const active = overlap.width > minOverlapPx && overlap.height > minOverlapPx;
      const color = active ? "#f6fbff" : (info.crash ? "#ff3b58" : (obstacle.type === "ramp" || obstacle.type === "boostPad" || obstacle.type === "gasCan" ? "#44ff99" : "#ffe45e"));
      const variant = obstacle.variant ? ` ${obstacle.variant}` : "";
      if (renderBox) {
        drawHitboxRect(ctx, renderBox, "rgba(246, 251, 255, 0.6)", `${obstacle.type}${variant} render ${renderBox.w.toFixed(0)}x${renderBox.h.toFixed(0)}`, "render");
      }
      const overlapText = active ? ` ov ${overlap.width.toFixed(0)}x${overlap.height.toFixed(0)}` : "";
      drawHitboxRect(ctx, box, color, `${obstacle.type} hit ${box.w.toFixed(0)}x${box.h.toFixed(0)}${overlapText}`, active ? "active" : "hitbox");
    }
    ctx.restore();
  }

  drawDangerZoneOverlay() {
    const ctx = this.ctx;
    const top = this.height * DANGER_ZONE_TOP_RATIO;
    const bottom = this.height * DANGER_ZONE_BOTTOM_RATIO;
    const occupancy = this.game.obstacles.getDangerZoneLaneOccupancy(this.game.obstacles.obstacles, this.game.run.distance);
    const alert = occupancy.maxBlocked >= 5;
    const warning = occupancy.maxBlocked >= 4;

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = alert ? "#ff3b58" : (warning ? "#ffe45e" : "#28f6ff");
    ctx.fillRect(this.road.x, top, this.road.w, bottom - top);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = alert ? "#ff3b58" : (warning ? "#ffe45e" : "#28f6ff");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.road.x, top);
    ctx.lineTo(this.road.x + this.road.w, top);
    ctx.moveTo(this.road.x, bottom);
    ctx.lineTo(this.road.x + this.road.w, bottom);
    ctx.stroke();

    ctx.font = "11px monospace";
    ctx.textBaseline = "middle";
    ctx.fillStyle = alert ? "#ff3b58" : (warning ? "#ffe45e" : "#28f6ff");
    ctx.fillText(`DANGER ZONE max ${occupancy.maxBlocked}`, this.road.x + 8, top + 14);

    for (const slice of occupancy.slices) {
      if (slice.count <= 0) continue;
      const sliceColor = slice.count >= 5 ? "#ff3b58" : (slice.count >= 4 ? "#ffe45e" : "rgba(40, 246, 255, 0.78)");
      ctx.strokeStyle = sliceColor;
      ctx.globalAlpha = slice.count >= 4 ? 0.9 : 0.45;
      ctx.beginPath();
      ctx.moveTo(this.road.x, slice.y);
      ctx.lineTo(this.road.x + this.road.w, slice.y);
      ctx.stroke();
      for (const lane of slice.lanes) {
        ctx.fillStyle = sliceColor;
        ctx.globalAlpha = slice.count >= 4 ? 0.35 : 0.18;
        ctx.fillRect(this.road.x + lane * this.road.laneW + 4, slice.y - 4, this.road.laneW - 8, 8);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = sliceColor;
      ctx.fillText(String(slice.count), this.road.x + this.road.w + 8, slice.y);
    }
    ctx.restore();
  }

  drawSpeedLines() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled) return;
    const highSpeed = run.currentSpeed > run.track.maxSpeed * ARCADE_FEEL.highSpeedLineStartRatio;
    const boosting = run.boostTimer > 0 || run.padBoostTimer > 0;
    const visualIntensity = this.getRaceVisualIntensity();
    const sectionEnergy = visualIntensity > 1.22 && this.game.screen === "game";
    if (!(boosting || highSpeed || sectionEnergy)) return;
    const ctx = this.ctx;
    const speedRatio = this.getVisualSpeedRatio();
    const finalStretch = this.getFinalStretchIntensity();
    const intensity = (run.boostTimer > 0 ? 0.42 : (run.padBoostTimer > 0 ? 0.32 : (sectionEnergy ? 0.14 : 0.18)))
      * TRACK_VISUALS.speedStreakIntensity
      * (1 + finalStretch * 0.25)
      * clamp(visualIntensity, 0.8, 1.35);
    const lineCount = Math.round((run.boostTimer > 0 ? 34 : (run.padBoostTimer > 0 ? 24 : (sectionEnergy ? 18 : 16))) * (0.85 + speedRatio * 0.35) * clamp(visualIntensity, 0.92, 1.18));
    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.strokeStyle = boosting ? "#28f6ff" : "#f6fbff";
    ctx.lineWidth = boosting ? 2.5 : 1.5;
    for (let i = 0; i < lineCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const edgeInset = this.road.laneW * (i % 4 === 0 ? 0.16 : 0.34);
      const edgeX = side < 0 ? this.road.x + edgeInset : this.road.x + this.road.w - edgeInset;
      const outsideOffset = i % 5 === 0 ? side * (18 + Math.random() * 28) : 0;
      const x = edgeX + outsideOffset + (Math.random() - 0.5) * 18;
      const y = this.road.y + Math.random() * this.road.h;
      const length = (boosting ? 102 : 64) + Math.random() * (boosting ? 114 : 64) + speedRatio * 42;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + length);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBoostBurst() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled || run.boostBurstTimer <= 0) return;
    const progress = 1 - run.boostBurstTimer / ARCADE_FEEL.boostBurstSeconds;
    const alpha = (1 - progress) * 0.72;
    const { x, y } = this.getPlayerFloatingAnchor();
    const size = getPlayerCarDrawSize(run.player.car, {
      airborne: run.airborne,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
    const rearY = y + size.h * 0.44;
    const burstW = size.w * lerp(0.45, 1.05, progress);
    const burstH = size.h * lerp(0.1, 0.32, progress);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#28f6ff";
    ctx.strokeStyle = "#28f6ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, rearY, burstW, burstH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.45;
    ctx.fillStyle = "#ffe45e";
    ctx.beginPath();
    ctx.moveTo(x - burstW * 0.34, rearY);
    ctx.lineTo(x, rearY + size.h * 0.36);
    ctx.lineTo(x + burstW * 0.34, rearY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawBumpFlash() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled || run.bumpFlashTimer <= 0) return;
    const progress = 1 - run.bumpFlashTimer / ARCADE_FEEL.bumpFlashSeconds;
    const alpha = (1 - progress) * 0.5;
    const { x, y } = this.getPlayerFloatingAnchor();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ff3b58";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff3b58";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, this.road.laneW * lerp(0.28, 0.48, progress), 28 + progress * 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawFinishFlash() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled || run.finishFlashTimer <= 0) return;
    const progress = 1 - run.finishFlashTimer / ARCADE_FEEL.finishFlashSeconds;
    const alpha = (1 - progress) * 0.34;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f6fbff";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = (1 - progress) * 0.9;
    ctx.fillStyle = "#ffe45e";
    ctx.font = `800 ${Math.max(36, Math.min(72, this.width * 0.07))}px Trebuchet MS, Verdana, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#ffe45e";
    ctx.fillText("FINISH!", this.width / 2, this.height * 0.32);
    ctx.restore();
  }

  drawFloatingTexts() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled || !Array.isArray(run.floatingTexts)) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const item of run.floatingTexts) {
      const t = clamp(item.life / item.maxLife, 0, 1);
      const lift = 1 - t;
      ctx.globalAlpha = Math.min(1, t * 1.3);
      ctx.font = `800 ${item.size + lift * 4}px Trebuchet MS, Verdana, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.72)";
      ctx.strokeText(item.text, item.x, item.y);
      ctx.fillStyle = item.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = item.color;
      ctx.fillText(item.text, item.x, item.y);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  drawCountdown() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled || run.countdownTimer <= 0 || this.game.screen !== "game") return;
    const label = getCountdownLabel(run.countdownTimer);
    if (!label) return;
    const segment = label === "GO"
      ? run.countdownTimer / ARCADE_FEEL.countdownGoSeconds
      : (run.countdownTimer - ARCADE_FEEL.countdownGoSeconds) % 1;
    const pulse = label === "GO" ? 1 - segment : 1 - segment;
    const fontSize = Math.max(62, Math.min(138, this.width * (label === "GO" ? 0.11 : 0.12))) + pulse * 12;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 18, 0.22)";
    ctx.fillRect(0, 74, this.width, this.height - 74);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${fontSize}px Trebuchet MS, Verdana, sans-serif`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.78)";
    ctx.strokeText(label, this.width / 2, this.height * 0.46);
    ctx.shadowBlur = label === "GO" ? 32 : 24;
    ctx.shadowColor = label === "GO" ? "#44ff99" : "#28f6ff";
    ctx.fillStyle = label === "GO" ? "#44ff99" : "#f6fbff";
    ctx.fillText(label, this.width / 2, this.height * 0.46);
    ctx.restore();
  }

  drawCrashBeat() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled || run.crashBeatTimer <= 0) return;
    const alpha = clamp(run.crashBeatTimer / 0.72, 0, 1);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha * 0.26;
    ctx.fillStyle = "#ff3b58";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = Math.min(1, alpha * 1.15);
    ctx.font = `900 ${Math.max(34, Math.min(72, this.width * 0.065))}px Trebuchet MS, Verdana, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.82)";
    ctx.strokeText("CRASH!", this.width / 2, this.height * 0.38);
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#ff3b58";
    ctx.fillStyle = "#f6fbff";
    ctx.fillText("CRASH!", this.width / 2, this.height * 0.38);
    ctx.restore();
  }

  drawFuelOutBeat() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled || run.fuelOutBeatTimer <= 0) return;
    const alpha = clamp(run.fuelOutBeatTimer / 0.78, 0, 1);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = "#ffe45e";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = Math.min(1, alpha * 1.15);
    ctx.font = `900 ${Math.max(32, Math.min(68, this.width * 0.058))}px Trebuchet MS, Verdana, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.82)";
    ctx.strokeText("OUT OF FUEL", this.width / 2, this.height * 0.38);
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#ffe45e";
    ctx.fillStyle = "#f6fbff";
    ctx.fillText("OUT OF FUEL", this.width / 2, this.height * 0.38);
    ctx.restore();
  }

  drawSectionNotice() {
    const run = this.game.run;
    if (!ARCADE_FEEL.enabled || !run || run.sectionNoticeTimer <= 0 || this.game.screen !== "game") return;
    const label = String(run.currentSectionLabel || "").toUpperCase();
    if (!label) return;
    const t = clamp(run.sectionNoticeTimer / 1.25, 0, 1);
    const alpha = Math.min(1, t * 1.8);
    const ctx = this.ctx;
    const y = 82;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 15px Trebuchet MS, Verdana, sans-serif";
    const textWidth = ctx.measureText(label).width;
    const boxW = Math.min(this.width - 28, Math.max(122, textWidth + 42));
    const x = this.width / 2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(5, 7, 18, 0.82)";
    ctx.fillRect(x - boxW / 2, y - 10, boxW, 20);
    ctx.strokeStyle = run.sectionVisualIntensity >= 1.2 ? "#ffe45e" : "#28f6ff";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.strokeRect(x - boxW / 2, y - 10, boxW, 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f6fbff";
    ctx.fillText(label, x, y + 1);
    ctx.restore();
  }

  drawHud() {
    const ctx = this.ctx;
    const run = this.game.run;
    const w = this.width;
    const progress = clamp(run.distance / run.track.distanceToFinish, 0, 1);
    const modeLabel = run.speedClass?.label || getSpeedClassLabel(run.speedClassId);
    const raceTypeLabel = getRaceTypeLabel(run.raceTypeId);
    const fuelRun = isFuelRunRaceType(run.raceTypeId);
    const hudItems = w >= 760
      ? [
        ["PLAYER", run.player.name],
        ["SCORE", formatScore(run.score)],
        ["SPEED", `${Math.round(run.currentSpeed)} MPH`],
        ["BOOST", `${run.manualBoosts}/3`],
        ["TYPE", raceTypeLabel],
        ["MODE", modeLabel]
      ]
      : [
        ["SCORE", formatScore(run.score)],
        ["SPEED", `${Math.round(run.currentSpeed)}`],
        ["BOOST", `${run.manualBoosts}/3`],
        ["TYPE", getRaceTypeConfig(run.raceTypeId).shortLabel || raceTypeLabel],
        ["MODE", modeLabel]
      ];
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 18, 0.82)";
    ctx.fillRect(0, 0, w, 74);
    ctx.strokeStyle = "rgba(40, 246, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 74);
    ctx.lineTo(w, 74);
    ctx.stroke();

    ctx.font = "700 16px Trebuchet MS, Verdana, sans-serif";
    ctx.fillStyle = "#f6fbff";
    ctx.textBaseline = "top";
    const left = 16;
    const col = (w - left * 2) / hudItems.length;
    hudItems.forEach(([label, value], index) => {
      drawHudLabel(ctx, label, value, left + col * index, 9, Math.max(54, col - 10));
    });

    const barX = 16;
    const barY = 50;
    const fuelGaugeW = fuelRun ? (w >= 760 ? 180 : 132) : 0;
    const barW = Math.min(w - 32 - (fuelRun && w >= 620 ? fuelGaugeW + 22 : 0), w >= 760 ? 460 : 320);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.fillRect(barX, barY, barW, 10);
    ctx.fillStyle = "#44ff99";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#44ff99";
    ctx.fillRect(barX, barY, barW * progress, 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#b8c6d9";
    ctx.font = "700 12px Trebuchet MS, Verdana, sans-serif";
    const sectionLabel = String(run.currentSectionLabel || getTrackSection(run.track, progress).label || "").toUpperCase();
    const contextParts = [`${Math.round(progress * 100)}%`, sectionLabel];
    contextParts.push(raceTypeLabel.toUpperCase());
    if (run.challengeMode) contextParts.push(`CHALLENGE ${run.challengeName}`);
    if (run.partyMode) contextParts.push(`PARTY ${run.partyTurnNumber}/${run.partyTotalPlayers}`);
    if (w >= 840) contextParts.push(`SEED ${formatRoadSeed(run.roadSeed)}`);
    const drawFuelInline = fuelRun && w >= 620;
    if (drawFuelInline) {
      this.drawFuelGauge(ctx, w - fuelGaugeW - 16, 47, fuelGaugeW, 15);
    }
    const statusX = w >= 760 ? barX + barW + 18 : barX;
    const statusY = w >= 760 ? 47 : 62;
    const statusMaxWidth = w >= 760
      ? Math.max(80, w - statusX - (drawFuelInline ? fuelGaugeW + 30 : 12))
      : (fuelRun && !drawFuelInline ? Math.max(80, w - fuelGaugeW - 54) : w - 32);
    drawFittedText(ctx, contextParts.join("  "), statusX, statusY, statusMaxWidth);
    if (fuelRun && !drawFuelInline) {
      this.drawFuelGauge(ctx, Math.max(16, w - fuelGaugeW - 16), 58, fuelGaugeW, 12);
    }
    ctx.restore();
  }

  drawFuelGauge(ctx, x, y, width, height) {
    const run = this.game.run;
    if (!run || !isFuelRunRaceType(run.raceTypeId)) return;
    const percent = clamp((run.fuel || 0) / Math.max(1, run.fuelMax || FUEL_RUN_CONFIG.fuelMax), 0, 1);
    const critical = run.criticalFuelActive;
    const low = run.lowFuelActive;
    const color = critical ? "#ff334c" : (low ? "#ffe45e" : (percent <= 0.55 ? "#44ff99" : "#28f6ff"));
    const pulse = critical ? 0.55 + Math.sin((run.elapsed || 0) * 12) * 0.28 : (low ? 0.42 + Math.sin((run.elapsed || 0) * 7) * 0.16 : 0.18);
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 18, 0.92)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = critical || low ? 14 : 8;
    ctx.shadowColor = color;
    ctx.strokeRect(x, y, width, height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.globalAlpha = critical || low ? clamp(pulse + 0.45, 0.45, 1) : 0.9;
    ctx.fillRect(x + 3, y + 3, Math.max(0, (width - 6) * percent), Math.max(1, height - 6));
    ctx.globalAlpha = 1;
    ctx.fillStyle = critical ? "#f6fbff" : "#07101b";
    ctx.font = `900 ${Math.max(9, Math.min(12, height - 2))}px Trebuchet MS, Verdana, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`FUEL ${Math.ceil(run.fuel || 0)}`, x + width / 2, y + height / 2 + 0.5);
    ctx.restore();
  }

  getNearbyTrafficSpriteDebug(run) {
    const trafficTypes = Object.keys(TRAFFIC_SPRITE_ASSETS);
    const candidates = this.game.obstacles.obstacles
      .filter((obstacle) => trafficTypes.includes(obstacle.type) && !obstacle.hit && !obstacle.remove)
      .map((obstacle) => ({
        obstacle,
        ahead: obstacle.distance - run.distance
      }))
      .filter((item) => item.ahead > -120 && item.ahead < VIEW_DISTANCE + 80)
      .sort((a, b) => Math.abs(a.ahead) - Math.abs(b.ahead))
      .slice(0, 2);
    if (!candidates.length) return "none";
    return candidates.map(({ obstacle }) => {
      const status = this.game.trafficSprites?.getStatus(obstacle.type, obstacle.variant) || "canvas";
      const { scale } = this.getObstacleScreenPositionAt(obstacle, run.distance);
      const size = this.getObstacleVisualSize(obstacle.type, scale, obstacle);
      const hitbox = this.getObstacleHitboxAt(obstacle, run.distance);
      const hitboxText = hitbox ? ` hit ${hitbox.w.toFixed(0)}x${hitbox.h.toFixed(0)}` : "";
      const variant = obstacle.variant || "canvas";
      return `${obstacle.type}:${variant} ${status} ${size.w.toFixed(0)}x${size.h.toFixed(0)}${hitboxText}`;
    }).join(" | ");
  }

  drawDebug() {
    const ctx = this.ctx;
    const run = this.game.run;
    const playerBox = this.getPlayerHitbox();
    const progress = clamp(run.distance / run.track.distanceToFinish, 0, 1);
    const speedMultiplier = getTrackSpeedMultiplier(run.track, progress, run.speedClassId);
    const classStartSpeed = getSpeedClassStartSpeed(run.speedClassId);
    const classEndSpeed = getSpeedClassEndSpeed(run.speedClassId, run.track);
    const actualDt = this.game.lastDt || 0;
    const obstacleDeltaPerFrame = run.currentSpeed * actualDt * this.road.h / VIEW_DISTANCE;
    const roadMarkerDeltaPerFrame = run.currentSpeed * actualDt * SPEED_TUNING.roadStripeScrollScale;
    const eta = run.currentSpeed > 0 ? (run.track.distanceToFinish - run.distance) / run.currentSpeed : 0;
    const directorDebug = this.game.obstacles.director.getDebugInfo();
    const partyDebug = this.game.getPartyDebugInfo();
    const challengeDebug = this.game.getChallengeDebugInfo();
    const partyLines = partyDebug.active ? [
      "party mode: active",
      `party player: ${partyDebug.currentPlayer}`,
      `party turn: ${partyDebug.currentTurn}/${partyDebug.totalPlayers}`,
      `party seed: ${partyDebug.sharedSeed}`,
      `party results: ${partyDebug.resultsCount}`
    ] : [];
    const challengeLines = challengeDebug.active ? [
      "challenge mode: active",
      `challenge id: ${challengeDebug.challengeId}`,
      `challenge name: ${challengeDebug.challengeName}`,
      `objective: ${challengeDebug.objective}`,
      `challenge status: ${challengeDebug.completionStatus}`,
      `fixed seed: ${challengeDebug.fixedSeed}`
    ] : [];
    const spriteDebug = getPlayerSpriteDebugInfo(run.player.car, {
      airborne: run.airborne,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
    const trafficSpriteDebug = this.game.trafficSprites?.getDebugInfo() || {
      total: 0,
      loaded: 0,
      active: false,
      missing: "none"
    };
    const nearbyTrafficSpriteDebug = this.getNearbyTrafficSpriteDebug(run);
    const lines = [
      "DEBUG `",
      `race type: ${directorDebug.raceType}`,
      `mode: ${run.speedClass?.label || getSpeedClassLabel(run.speedClassId)} score x${(run.scoreMultiplier || 1).toFixed(2)}`,
      `seed: ${directorDebug.seed}`,
      ...partyLines,
      ...challengeLines,
      `seed hash: ${directorDebug.seedHash >>> 0} rng ${directorDebug.rngState >>> 0}`,
      `configured: ${classStartSpeed.toFixed(0)} -> ${classEndSpeed.toFixed(0)}`,
      `base speed: ${(run.baseCruiseSpeed || classStartSpeed).toFixed(0)} raw ${(run.rawCruiseSpeed || classStartSpeed).toFixed(0)}`,
      `curve mult: ${speedMultiplier.toFixed(2)}x`,
      `actual scroll: ${run.currentSpeed.toFixed(1)}`,
      `obstacle/frame: ${obstacleDeltaPerFrame.toFixed(1)}px`,
      `road marker/frame: ${roadMarkerDeltaPerFrame.toFixed(1)}px`,
      `distance/sec: ${run.currentSpeed.toFixed(1)}`,
      `boost mult: ${(run.boostMultiplier || 1).toFixed(2)}x`,
      `max speed: ${run.track.maxSpeed} cap ${(run.speedCap || run.track.maxSpeed).toFixed(0)} capped ${run.speedCapped ? "yes" : "no"}`,
      `mph display: ${Math.round(run.currentSpeed)} MPH`,
      `debug scale: ${(this.game.debugSpeedScale || 1).toFixed(2)}x`,
      `debug freeze: ${run.debugFrozen ? "on" : "off"} (H)`,
      `finish dist: ${run.track.distanceToFinish}`,
      `eta now: ${formatTime(eta)}`,
      `lane: ${run.targetLane} render ${run.renderLaneFloat.toFixed(2)}`,
      `vertical: ${(run.playerYRatio * 100).toFixed(1)}% input ${run.verticalInput}`,
      `distance: ${run.distance.toFixed(0)}`,
      `fuel: ${isFuelRunRaceType(run.raceTypeId) ? `${directorDebug.fuelAmount.toFixed(1)}/${(run.fuelMax || 0).toFixed(0)} drain ${directorDebug.fuelDrainPerSecond.toFixed(2)}/s` : "hidden"}`,
      `gas cans: ${directorDebug.gasCansCollected}/${run.gasCansSpawned || 0} last ${directorDebug.timeSinceLastGasCan.toFixed(1)}s`,
      `fuel status: low ${directorDebug.lowFuelActive ? "yes" : "no"} critical ${directorDebug.criticalFuelActive ? "yes" : "no"} mix ${directorDebug.fuelRunObjectMixActive ? "fuel" : "classic"}`,
      `obstacles: ${this.game.obstacles.obstacles.length}`,
      `progress: ${(progress * 100).toFixed(1)}%`,
      `section: ${directorDebug.sectionId} ${directorDebug.sectionLabel} ${(directorDebug.sectionProgress * 100).toFixed(0)}%`,
      `section mult: pressure ${directorDebug.sectionPressureMultiplier.toFixed(2)} visual ${directorDebug.sectionVisualIntensity.toFixed(2)}`,
      `airborne: ${run.airborne}`,
      `collision: ${run.collisionState}`,
      `last hit: ${run.lastCollision}`,
      `danger max: ${this.game.obstacles.lastSafetySummary?.maxBlocked ?? 0}`,
      `prevented: ${this.game.obstacles.preventedUnsafeSpawns}`,
      `band: ${directorDebug.band}`,
      `wave: ${directorDebug.wave}`,
      `last wave: ${directorDebug.lastWave}`,
      `budget: ${directorDebug.budget.toFixed(2)} pressure ${directorDebug.pressure.toFixed(2)}`,
      `center safe: ${directorDebug.centerSafeSeconds.toFixed(1)}s hold ${directorDebug.centerHoldSeconds.toFixed(1)}s`,
      `lane still: ${directorDebug.laneStillSeconds.toFixed(1)}s last wave ${directorDebug.timeSinceWaveSeconds.toFixed(1)}s`,
      `last meaningful: ${directorDebug.meaningfulGapSeconds.toFixed(1)}s`,
      `lane pressure: ${directorDebug.lanePressureCount} (${directorDebug.lanePressure})`,
      `wave fair: ${directorDebug.fairnessPassed} budget ${directorDebug.pressureBudgetPassed}`,
      `recent: ${directorDebug.recentWaves || "none"}`,
      `sprite: ${spriteDebug.mode}`,
      `src img: ${spriteDebug.natural}`,
      `opaque: ${spriteDebug.opaque}`,
      `render: ${spriteDebug.render}`,
      `traffic sprites: ${trafficSpriteDebug.active ? "active" : "fallback"} ${trafficSpriteDebug.loaded}/${trafficSpriteDebug.total}`,
      `missing traffic: ${trafficSpriteDebug.missing}`,
      `near traffic: ${nearbyTrafficSpriteDebug}`,
      `hitbox: ${playerBox.w.toFixed(0)}x${playerBox.h.toFixed(0)} min hard ${HARD_VEHICLE_COLLISION_OVERLAP_PX}px else ${MIN_COLLISION_OVERLAP_PX}px`,
      `save: ${this.game.profiles.saveStatus}`,
      `music track: ${this.game.audio.musicTrackStatus()}`,
      `title music: ${this.game.audio.tracks.title.loaded}`,
      `race music: ${this.game.audio.tracks.race.loaded}`,
      `music muted: ${this.game.audio.musicMuted}`,
      `sfx muted: ${this.game.audio.sfxMuted}`,
      `sfx loaded: ${this.game.audio.sfxLoadedCount()}/${Object.keys(this.game.audio.sfx).length}`,
      `missing sfx: ${this.game.audio.missingSfxList()}`,
      `last sfx: ${this.game.audio.lastPlayedSfx}`,
      `sfx: ${this.game.audio.sfxLoadedStatus()}`,
      "R restart  F finish  C crash  L scores  P sim  H freeze",
      "Shift+Plus/Minus speed scale  Shift+0 reset"
    ];
    const panelWidth = 356;
    const x = Math.max(8, this.width - panelWidth - 16);
    const y = 88;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(x, y, panelWidth, lines.length * 19 + 14);
    ctx.strokeStyle = "#ffe45e";
    ctx.strokeRect(x, y, panelWidth, lines.length * 19 + 14);
    ctx.font = "13px monospace";
    ctx.fillStyle = "#f6fbff";
    lines.forEach((line, index) => ctx.fillText(line, x + 10, y + 12 + index * 19));
    ctx.restore();
    this.drawHitboxConfigPanel();
    this.drawInputDebugPanel();
    this.drawInputFlashMarker();
  }

  drawHitboxConfigPanel() {
    const ctx = this.ctx;
    const format = (type, label = type) => {
      const config = getHitboxConfig(type);
      if (!config) return `${label} n/a`;
      const yOffset = config.offsetY ? ` y${config.offsetY > 0 ? "+" : ""}${config.offsetY.toFixed(2)}` : "";
      return `${label} ${config.width.toFixed(2)}x${config.height.toFixed(2)}${yOffset}`;
    };
    const lines = [
      "HITBOX CONFIG",
      `min overlap hard ${HARD_VEHICLE_COLLISION_OVERLAP_PX}px / other ${MIN_COLLISION_OVERLAP_PX}px`,
      format("player"),
      `${format("slowCar", "slow")}  ${format("fastCar", "fast")}`,
      `${format("truck")}  ${format("barrier")}`,
      `${format("cone")}  ${format("oil")}`,
      `${format("deer")}  ${format("ramp")}`,
      `${format("boostPad", "boost")}  ${format("gasCan", "gas")}  ${format("branch")}`
    ];
    const panelWidth = 304;
    const lineHeight = 15;
    const x = 12;
    const y = 88;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(x, y, panelWidth, lines.length * lineHeight + 14);
    ctx.strokeStyle = "#28f6ff";
    ctx.strokeRect(x, y, panelWidth, lines.length * lineHeight + 14);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#f6fbff";
    lines.forEach((line, index) => ctx.fillText(line, x + 9, y + 12 + index * lineHeight));
    ctx.restore();
  }

  drawInputDebugPanel() {
    const ctx = this.ctx;
    const run = this.game.run;
    const input = this.game.input.getDebugInfo();
    const currentX = this.laneCenter(run.renderLaneFloat);
    const targetX = this.laneCenter(run.targetLane);
    const age = input.lastKeyAgeMs === null ? "n/a" : `${Math.round(input.lastKeyAgeMs)}ms`;
    const laneAge = input.lastLaneInputAgeMs === null ? "n/a" : `${Math.round(input.lastLaneInputAgeMs)}ms`;
    const boostAge = input.boostEdgeAgeMs === null ? "n/a" : `${Math.round(input.boostEdgeAgeMs)}ms`;
    const lines = [
      "INPUT",
      `held: ${input.heldKeys}`,
      `left down: ${input.leftKeyDown ? "yes" : "no"}  right down: ${input.rightKeyDown ? "yes" : "no"}`,
      `boost down: ${input.boostKeyDown ? "yes" : "no"}  edge: ${input.boostEdgeTriggered ? "yes" : "no"} ${boostAge}`,
      `suppressed: ${input.suppressedKeys}`,
      `last: ${input.lastKey} ${age}`,
      `last lane: ${input.lastLaneInput} ${laneAge}`,
      `lane: ${run.renderLaneFloat.toFixed(2)} -> ${run.targetLane}`,
      `progress: ${(run.laneChangeProgress * 100).toFixed(0)}%  dur ${(INPUT_CONFIG.laneChangeDurationSeconds * 1000).toFixed(0)}ms`,
      `x: ${currentX.toFixed(0)} -> ${targetX.toFixed(0)}  y: ${this.getPlayerScreenY().toFixed(0)}`,
      `lock: ${this.getInputLockState()}`,
      `boosts: ${run.manualBoosts}  active: ${run.boostTimer > 0 || run.padBoostTimer > 0 ? "yes" : "no"}`,
      `repeat ignored: LR ${input.leftRightRepeatIgnoredCount}  boost ${input.boostRepeatIgnoredCount}`,
      `vertical: ${input.verticalHeld} input ${run.verticalInput}`
    ];
    const panelWidth = 304;
    const lineHeight = 15;
    const x = 12;
    const y = 226;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(x, y, panelWidth, lines.length * lineHeight + 14);
    ctx.strokeStyle = "#44ff99";
    ctx.strokeRect(x, y, panelWidth, lines.length * lineHeight + 14);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#f6fbff";
    lines.forEach((line, index) => ctx.fillText(line, x + 9, y + 12 + index * lineHeight));
    ctx.restore();
  }

  getInputLockState() {
    const run = this.game.run;
    if (this.game.screen !== "game") return this.game.screen;
    if (run.debugFrozen) return "debug freeze";
    if (run.paused) return "paused";
    if (run.ended) return "ended";
    if (!run.raceActive) return `countdown ${run.countdownTimer.toFixed(1)}s`;
    return "none";
  }

  drawInputFlashMarker() {
    const run = this.game.run;
    if (!run || run.inputFlashTimer <= 0) return;
    const progress = clamp(run.inputFlashTimer / INPUT_CONFIG.inputFlashSeconds, 0, 1);
    const ctx = this.ctx;
    const x = this.road.x + this.road.w / 2;
    const y = 84;
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.fillStyle = "#44ff99";
    ctx.strokeStyle = "#f6fbff";
    ctx.lineWidth = 2;
    ctx.fillRect(x - 46, y, 92, 16);
    ctx.strokeRect(x - 46, y, 92, 16);
    ctx.fillStyle = "#07101b";
    ctx.font = "900 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`INPUT ${run.inputFlashKey}`, x, y + 8);
    ctx.restore();
  }
}

function fitCanvasText(ctx, value, maxWidth) {
  const text = String(value ?? "");
  if (!Number.isFinite(maxWidth) || maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text;
  let fitted = text;
  while (fitted.length > 3 && ctx.measureText(`${fitted}...`).width > maxWidth) {
    fitted = fitted.slice(0, -1);
  }
  return fitted.length > 3 ? `${fitted}...` : text.slice(0, 3);
}

function drawFittedText(ctx, value, x, y, maxWidth) {
  ctx.fillText(fitCanvasText(ctx, value, maxWidth), x, y);
}

function drawHudLabel(ctx, label, value, x, y, maxWidth = 150) {
  ctx.fillStyle = "#ffe45e";
  ctx.font = "700 10px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#f6fbff";
  ctx.font = "700 16px Trebuchet MS, Verdana, sans-serif";
  drawFittedText(ctx, value, x, y + 16, maxWidth);
}

function drawHitboxRect(ctx, box, color, label, style = "hitbox") {
  if (!box) return;
  const isRenderBounds = style === "render";
  const isActive = style === "active";
  ctx.save();
  ctx.lineWidth = isActive ? 3 : (isRenderBounds ? 1.5 : 2);
  if (isRenderBounds) ctx.setLineDash([6, 5]);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = isRenderBounds ? 0.78 : 0.92;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  if (!isRenderBounds) {
    ctx.globalAlpha = isActive ? 0.22 : 0.12;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.globalAlpha = 1;
  if (label && box.w >= 18 && box.h >= 14) {
    ctx.font = "10px monospace";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, box.x, box.y - 3);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Pixel-style drawing helpers
// ---------------------------------------------------------------------------

function getOpaqueBounds(image) {
  const imageW = image.naturalWidth || image.width || 0;
  const imageH = image.naturalHeight || image.height || 0;
  const fullBounds = {
    x: 0,
    y: 0,
    width: imageW,
    height: imageH
  };
  if (!imageW || !imageH || typeof document === "undefined") {
    return fullBounds;
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = imageW;
    canvas.height = imageH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fullBounds;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, imageW, imageH).data;
    let minX = imageW;
    let minY = imageH;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < imageH; y += 1) {
      for (let x = 0; x < imageW; x += 1) {
        const alpha = pixels[(y * imageW + x) * 4 + 3];
        if (alpha > SPRITE_OPAQUE_ALPHA_THRESHOLD) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX || maxY < minY) return fullBounds;
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  } catch (error) {
    return fullBounds;
  }
}

function getVehicleLaneWidth(state = {}) {
  return Number.isFinite(state.laneWidth) && state.laneWidth > 0
    ? state.laneWidth
    : 760 / LANES;
}

function getConfiguredVehicleWidth(config, laneWidth, widthScale = 1) {
  const ratio = Number.isFinite(config.widthRatio) ? config.widthRatio : 1;
  const scale = Number.isFinite(widthScale) && widthScale > 0 ? widthScale : 1;
  const laneMaxRatio = Number.isFinite(config.laneMaxRatio) ? config.laneMaxRatio : 1;
  const laneMax = Math.max(1, laneWidth * laneMaxRatio);
  const rawMin = Number.isFinite(config.minWidth) ? config.minWidth * scale : 1;
  const rawMax = Number.isFinite(config.maxWidth) ? config.maxWidth * scale : laneMax;
  const maxWidth = Math.max(1, Math.min(rawMax, laneMax));
  const minWidth = Math.min(maxWidth, Math.max(1, rawMin));
  return clamp(laneWidth * ratio * scale, minWidth, maxWidth);
}

function getCanvasPlayerCarRenderSize(state = {}) {
  const config = VEHICLE_SCALE_CONFIG.playerCanvas;
  let width = getConfiguredVehicleWidth(config, getVehicleLaneWidth(state));
  if (state.preview) width *= config.previewScale || 1;
  if (state.airborne) width *= PLAYER_AIRBORNE_SCALE;
  const scale = width / PLAYER_CANVAS_WIDTH;
  return {
    scale,
    w: width,
    h: PLAYER_CANVAS_HEIGHT * scale
  };
}

function getCarStyleId(carConfig) {
  return CAR_BODY_STYLES.some((item) => item.id === carConfig.bodyStyle) ? carConfig.bodyStyle : DEFAULT_CAR.bodyStyle;
}

function getPlayerSpriteTargetWidth(carConfig, state = {}) {
  const style = getCarStyleId(carConfig);
  const config = VEHICLE_SCALE_CONFIG.playerSprite;
  const styleScale = config.styleWidthScale?.[style] || 1;
  let width = getConfiguredVehicleWidth(config, getVehicleLaneWidth(state), styleScale);
  if (state.preview) width *= config.previewScale || 1;
  if (state.airborne) width *= PLAYER_AIRBORNE_SCALE;
  return width;
}

function getSpriteSourceBounds(image) {
  const imageW = image.naturalWidth || image.width || 128;
  const imageH = image.naturalHeight || image.height || 192;
  const opaque = image.neonOpaqueBounds;
  if (opaque && opaque.width > 0 && opaque.height > 0) {
    return opaque;
  }
  return {
    x: 0,
    y: 0,
    width: imageW,
    height: imageH
  };
}

function getScaledSpriteBox(image, targetWidth) {
  const source = getSpriteSourceBounds(image);
  const aspect = source.width / source.height;
  return {
    source,
    w: targetWidth,
    h: targetWidth / aspect
  };
}

function getPlayerCarDrawSize(carConfig, state = {}, spriteManager = null) {
  if (carConfig.useSprite !== false && spriteManager) {
    const sprite = spriteManager.getSprite(getCarStyleId(carConfig));
    if (sprite) {
      const box = getScaledSpriteBox(sprite, getPlayerSpriteTargetWidth(carConfig, state));
      return {
        scale: state.airborne ? PLAYER_AIRBORNE_SCALE : 1,
        w: box.w,
        h: box.h
      };
    }
  }
  return getCanvasPlayerCarRenderSize(state);
}

function getPlayerSpriteDebugInfo(carConfig, state = {}, spriteManager = null) {
  const canvasSize = getCanvasPlayerCarRenderSize(state);
  const fallback = {
    mode: carConfig.useSprite === false ? "canvas off" : "canvas fallback",
    natural: "n/a",
    opaque: "n/a",
    render: `${canvasSize.w.toFixed(0)}x${canvasSize.h.toFixed(0)}`
  };
  if (carConfig.useSprite === false || !spriteManager) return fallback;

  const style = getCarStyleId(carConfig);
  const sprite = spriteManager.getSprite(style);
  const status = spriteManager.getStatus(style);
  if (!sprite) {
    return {
      ...fallback,
      mode: `sprite ${status}`
    };
  }

  const source = getSpriteSourceBounds(sprite);
  const box = getScaledSpriteBox(sprite, getPlayerSpriteTargetWidth(carConfig, state));
  const naturalW = sprite.naturalWidth || sprite.width || 0;
  const naturalH = sprite.naturalHeight || sprite.height || 0;
  return {
    mode: `${style} sprite`,
    natural: `${naturalW}x${naturalH}`,
    opaque: `${source.x},${source.y} ${source.width}x${source.height}`,
    render: `${box.w.toFixed(0)}x${box.h.toFixed(0)}`
  };
}

function drawSpriteCentered(ctx, image, centerX, centerY, targetWidth) {
  const box = getScaledSpriteBox(image, targetWidth);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    box.source.x,
    box.source.y,
    box.source.width,
    box.source.height,
    centerX - box.w / 2,
    centerY - box.h / 2,
    box.w,
    box.h
  );
  ctx.restore();
  return box;
}

function drawPlayerCar(ctx, x, y, carConfig, state, spriteManager = null) {
  if (carConfig.useSprite !== false && spriteManager) {
    const sprite = spriteManager.getSprite(getCarStyleId(carConfig));
    if (sprite) {
      drawSpritePlayerCar(ctx, x, y, carConfig, state, sprite);
      return;
    }
  }
  drawCanvasPlayerCar(ctx, x, y, carConfig, state);
}

function drawSpritePlayerCar(ctx, x, y, carConfig, state, sprite) {
  const stripe = carConfig.stripeColor || DEFAULT_CAR.stripeColor;
  const targetWidth = getPlayerSpriteTargetWidth(carConfig, state);
  const spriteBox = getScaledSpriteBox(sprite, targetWidth);
  const laneTilt = clamp(state.laneDelta || 0, -1, 1) * 0.06;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(laneTilt);

  if (state.airborne) {
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, spriteBox.h * 0.38, spriteBox.w * 0.34, spriteBox.h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (state.boosting) {
    drawSpriteBoostTrail(ctx, spriteBox.w, spriteBox.h, stripe);
  }

  if (state.laneChanging) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = stripe;
    const smearSide = (state.laneDelta || 0) < 0 ? 1 : -1;
    ctx.fillRect(smearSide * spriteBox.w * 0.2, -spriteBox.h * 0.25, smearSide * spriteBox.w * 0.22, spriteBox.h * 0.56);
    ctx.restore();
  }

  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = stripe;
  drawSpriteCentered(ctx, sprite, 0, 0, targetWidth);
  ctx.restore();

  drawSpriteCentered(ctx, sprite, 0, 0, targetWidth);

  if (state.verticalInput > 0) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ff273f";
    ctx.fillStyle = "rgba(255, 39, 63, 0.76)";
    ctx.fillRect(-spriteBox.w * 0.34, spriteBox.h * 0.36, spriteBox.w * 0.18, spriteBox.h * 0.045);
    ctx.fillRect(spriteBox.w * 0.16, spriteBox.h * 0.36, spriteBox.w * 0.18, spriteBox.h * 0.045);
    ctx.restore();
  }

  ctx.restore();
}

function drawSpriteBoostTrail(ctx, w, h, stripe) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.shadowBlur = 24;
  ctx.shadowColor = stripe;
  ctx.fillStyle = "rgba(40, 246, 255, 0.82)";
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, h * 0.48);
  ctx.lineTo(-w * 0.08, h * 0.88 + Math.random() * 18);
  ctx.lineTo(w * 0.02, h * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffe45e";
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.48);
  ctx.lineTo(w * 0.2, h * 0.84 + Math.random() * 16);
  ctx.lineTo(w * 0.3, h * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = stripe;
  ctx.beginPath();
  ctx.moveTo(-w * 0.06, h * 0.5);
  ctx.lineTo(w * 0.06, h * 0.98 + Math.random() * 12);
  ctx.lineTo(w * 0.16, h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCanvasPlayerCar(ctx, x, y, carConfig, state) {
  const body = carConfig.bodyColor || DEFAULT_CAR.bodyColor;
  const stripe = carConfig.stripeColor || DEFAULT_CAR.stripeColor;
  const glass = carConfig.windowColor || DEFAULT_CAR.windowColor;
  const style = CAR_BODY_STYLES.some((item) => item.id === carConfig.bodyStyle) ? carConfig.bodyStyle : DEFAULT_CAR.bodyStyle;
  const { scale, w, h } = getCanvasPlayerCarRenderSize(state);
  const laneTilt = clamp(state.laneDelta || 0, -1, 1) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(laneTilt);

  if (state.airborne) {
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, h * 0.34, w * 0.38, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (state.boosting) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.shadowBlur = 26;
    ctx.shadowColor = stripe;
    ctx.fillStyle = "rgba(40, 246, 255, 0.82)";
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, h * 0.42);
    ctx.lineTo(-w * 0.08, h * 0.78 + Math.random() * 18);
    ctx.lineTo(w * 0.02, h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe45e";
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.42);
    ctx.lineTo(w * 0.2, h * 0.74 + Math.random() * 16);
    ctx.lineTo(w * 0.3, h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = stripe;
    ctx.beginPath();
    ctx.moveTo(-w * 0.06, h * 0.44);
    ctx.lineTo(w * 0.06, h * 0.92 + Math.random() * 12);
    ctx.lineTo(w * 0.16, h * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (state.laneChanging) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = stripe;
    const smearSide = (state.laneDelta || 0) < 0 ? 1 : -1;
    ctx.fillRect(smearSide * w * 0.28, -h * 0.22, smearSide * w * 0.18, h * 0.52);
    ctx.restore();
  }

  ctx.fillStyle = "#05070f";
  if (style === "formula") {
    ctx.fillRect(-w * 0.52, -h * 0.28, w * 0.16, h * 0.22);
    ctx.fillRect(w * 0.36, -h * 0.28, w * 0.16, h * 0.22);
    ctx.fillRect(-w * 0.56, h * 0.18, w * 0.18, h * 0.28);
    ctx.fillRect(w * 0.38, h * 0.18, w * 0.18, h * 0.28);
  } else {
    ctx.fillRect(-w * 0.5, -h * 0.2, w * 0.13, h * 0.66);
    ctx.fillRect(w * 0.37, -h * 0.2, w * 0.13, h * 0.66);
  }

  ctx.shadowBlur = 15;
  ctx.shadowColor = body;
  ctx.fillStyle = body;
  if (style === "muscle") {
    pixelPath(ctx, [
      [-0.22, -0.54], [0.22, -0.54],
      [0.42, -0.34], [0.46, 0.4],
      [0.34, 0.5], [-0.34, 0.5],
      [-0.46, 0.4], [-0.42, -0.34]
    ], w, h);
  } else if (style === "formula") {
    pixelPath(ctx, [
      [0, -0.58],
      [0.2, -0.35], [0.16, 0.36],
      [0.34, 0.48], [-0.34, 0.48],
      [-0.16, 0.36], [-0.2, -0.35]
    ], w, h);
  } else {
    pixelPath(ctx, [
      [0, -0.58],
      [0.34, -0.4], [0.48, 0.22],
      [0.36, 0.5], [-0.36, 0.5],
      [-0.48, 0.22], [-0.34, -0.4]
    ], w, h);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = shade(body, -34);
  if (style === "formula") {
    ctx.fillRect(-w * 0.12, -h * 0.36, w * 0.24, h * 0.48);
  } else {
    pixelPath(ctx, [
      [-0.2, -0.48], [0.2, -0.48],
      [0.3, -0.18], [0.21, 0.02],
      [-0.21, 0.02], [-0.3, -0.18]
    ], w, h);
  }

  ctx.fillStyle = glass;
  ctx.shadowBlur = 8;
  ctx.shadowColor = glass;
  if (style === "formula") {
    ctx.fillRect(-w * 0.14, -h * 0.14, w * 0.28, h * 0.2);
  } else if (style === "muscle") {
    ctx.fillRect(-w * 0.25, -h * 0.24, w * 0.5, h * 0.22);
  } else {
    pixelPath(ctx, [
      [-0.21, -0.29], [0.21, -0.29],
      [0.16, -0.05], [-0.16, -0.05]
    ], w, h);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = shade(glass, -42);
  ctx.fillRect(-w * 0.16, h * 0.04, w * 0.32, h * 0.12);

  if (style !== "formula") {
    ctx.fillStyle = shade(glass, -24);
    ctx.fillRect(-w * 0.36, -h * 0.02, w * 0.12, h * 0.22);
    ctx.fillRect(w * 0.24, -h * 0.02, w * 0.12, h * 0.22);
  }

  ctx.fillStyle = stripe;
  ctx.shadowBlur = 10;
  ctx.shadowColor = stripe;
  if (style === "formula") {
    ctx.fillRect(-w * 0.04, -h * 0.54, w * 0.08, h * 0.84);
    ctx.fillRect(-w * 0.26, h * 0.36, w * 0.52, h * 0.06);
  } else {
    ctx.fillRect(-w * 0.055, -h * 0.5, w * 0.11, h * 0.9);
    ctx.fillRect(-w * 0.3, h * 0.31, w * 0.6, h * 0.055);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#f8fbff";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#f8fbff";
  ctx.fillRect(-w * 0.25, -h * 0.5, w * 0.14, h * 0.055);
  ctx.fillRect(w * 0.11, -h * 0.5, w * 0.14, h * 0.055);
  ctx.shadowBlur = 0;

  ctx.fillStyle = state.verticalInput > 0 ? "#ff7b8a" : "#ff273f";
  ctx.shadowBlur = state.verticalInput > 0 ? 14 : 7;
  ctx.shadowColor = "#ff273f";
  ctx.fillRect(-w * 0.3, h * 0.43, w * 0.18, h * 0.05);
  ctx.fillRect(w * 0.12, h * 0.43, w * 0.18, h * 0.05);
  ctx.shadowBlur = 0;

  ctx.fillStyle = shade(body, 28);
  if (style === "formula") {
    ctx.fillRect(-w * 0.42, h * 0.48, w * 0.84, h * 0.06);
    ctx.fillRect(-w * 0.31, -h * 0.36, w * 0.62, h * 0.045);
  } else {
    ctx.fillRect(-w * 0.43, h * 0.48, w * 0.86, h * 0.065);
    ctx.fillRect(-w * 0.34, -h * 0.54, w * 0.68, h * 0.055);
  }

  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillRect(-w * 0.26, -h * 0.35, w * 0.08, h * 0.48);
  ctx.fillRect(w * 0.18, -h * 0.35, w * 0.08, h * 0.48);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(-w * 0.1, -h * 0.46, w * 0.2, h * 0.035);
  ctx.restore();
}

function drawTrafficCar(ctx, x, y, type, scale = 1) {
  const isFast = type === "fastCar";
  const body = isFast ? "#e84f45" : "#687c89";
  const trim = isFast ? "#ffd25c" : "#a9c0c6";
  const glass = isFast ? "#182033" : "#141e2c";
  const w = 62 * scale;
  const h = 104 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w * (isFast ? 0.9 : 0.96), h * 0.96);
  ctx.fillStyle = "#070912";
  ctx.fillRect(-w * 0.49, -h * 0.22, w * 0.1, h * 0.23);
  ctx.fillRect(w * 0.39, -h * 0.22, w * 0.1, h * 0.23);
  ctx.fillRect(-w * 0.49, h * 0.19, w * 0.1, h * 0.25);
  ctx.fillRect(w * 0.39, h * 0.19, w * 0.1, h * 0.25);

  ctx.fillStyle = body;
  if (isFast) {
    pixelPath(ctx, [
      [0, -0.5],
      [0.34, -0.39],
      [0.43, 0.28],
      [0.32, 0.5],
      [-0.32, 0.5],
      [-0.43, 0.28],
      [-0.34, -0.39]
    ], w, h);
  } else {
    pixelPath(ctx, [
      [-0.33, -0.49],
      [0.33, -0.49],
      [0.43, -0.36],
      [0.43, 0.42],
      [0.34, 0.5],
      [-0.34, 0.5],
      [-0.43, 0.42],
      [-0.43, -0.36]
    ], w, h);
  }
  ctx.strokeStyle = "rgba(5, 7, 15, 0.72)";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.stroke();

  ctx.fillStyle = shade(body, isFast ? 26 : 18);
  if (isFast) {
    pixelPath(ctx, [
      [0, -0.44],
      [0.22, -0.34],
      [0.28, -0.02],
      [-0.28, -0.02],
      [-0.22, -0.34]
    ], w, h);
  } else {
    ctx.fillRect(-w * 0.27, -h * 0.4, w * 0.54, h * 0.2);
  }
  ctx.fillStyle = glass;
  if (isFast) {
    ctx.fillRect(-w * 0.2, -h * 0.19, w * 0.4, h * 0.21);
    ctx.fillRect(-w * 0.17, h * 0.1, w * 0.34, h * 0.16);
  } else {
    ctx.fillRect(-w * 0.26, -h * 0.19, w * 0.52, h * 0.22);
    ctx.fillRect(-w * 0.24, h * 0.18, w * 0.48, h * 0.16);
  }
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.fillRect(-w * 0.18, -h * 0.16, w * 0.08, h * 0.16);

  ctx.fillStyle = "rgba(5, 7, 15, 0.5)";
  ctx.fillRect(-w * 0.36, -h * 0.32, w * 0.72, Math.max(1, h * 0.025));
  ctx.fillRect(-w * 0.34, h * 0.33, w * 0.68, Math.max(1, h * 0.025));

  ctx.fillStyle = trim;
  if (isFast) {
    ctx.fillRect(-w * 0.045, -h * 0.35, w * 0.09, h * 0.68);
    ctx.fillRect(-w * 0.28, h * 0.35, w * 0.56, h * 0.045);
  } else {
    ctx.fillRect(-w * 0.33, h * 0.07, w * 0.66, h * 0.045);
  }

  ctx.fillStyle = "#fff2b0";
  ctx.fillRect(-w * 0.27, -h * 0.46, w * 0.15, h * 0.05);
  ctx.fillRect(w * 0.12, -h * 0.46, w * 0.15, h * 0.05);
  ctx.fillStyle = "#ff334c";
  ctx.fillRect(-w * 0.29, h * 0.44, w * 0.16, h * 0.05);
  ctx.fillRect(w * 0.13, h * 0.44, w * 0.16, h * 0.05);
  ctx.restore();
}

function drawTruck(ctx, x, y, scale = 1) {
  const w = 78 * scale;
  const h = 142 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w * 1.02, h);
  ctx.fillStyle = "#070912";
  ctx.fillRect(-w * 0.5, -h * 0.37, w * 0.11, h * 0.3);
  ctx.fillRect(w * 0.39, -h * 0.37, w * 0.11, h * 0.3);
  ctx.fillRect(-w * 0.5, h * 0.07, w * 0.11, h * 0.34);
  ctx.fillRect(w * 0.39, h * 0.07, w * 0.11, h * 0.34);

  ctx.fillStyle = "#7c2632";
  pixelPath(ctx, [
    [-0.39, -0.49],
    [0.39, -0.49],
    [0.48, -0.39],
    [0.46, -0.09],
    [-0.46, -0.09],
    [-0.48, -0.39]
  ], w, h);
  ctx.strokeStyle = "rgba(5, 7, 15, 0.78)";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.stroke();

  ctx.fillStyle = "#c3c8cc";
  ctx.fillRect(-w * 0.46, -h * 0.08, w * 0.92, h * 0.51);
  ctx.strokeStyle = "rgba(5, 7, 15, 0.72)";
  ctx.strokeRect(-w * 0.46, -h * 0.08, w * 0.92, h * 0.51);

  ctx.fillStyle = "#182033";
  ctx.fillRect(-w * 0.31, -h * 0.41, w * 0.62, h * 0.18);
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.fillRect(-w * 0.22, -h * 0.38, w * 0.1, h * 0.12);

  ctx.fillStyle = "#8a949b";
  ctx.fillRect(-w * 0.38, h * 0.05, w * 0.76, h * 0.24);
  ctx.fillStyle = "rgba(5, 7, 15, 0.24)";
  ctx.fillRect(-w * 0.38, h * 0.05, w * 0.76, Math.max(2, h * 0.035));
  ctx.fillRect(-w * 0.38, h * 0.26, w * 0.76, Math.max(2, h * 0.035));

  ctx.fillStyle = "#ffe45e";
  ctx.fillRect(-w * 0.35, -h * 0.48, w * 0.18, h * 0.055);
  ctx.fillRect(w * 0.17, -h * 0.48, w * 0.18, h * 0.055);
  ctx.fillStyle = "#ff334c";
  ctx.fillRect(-w * 0.35, h * 0.43, w * 0.18, h * 0.05);
  ctx.fillRect(w * 0.17, h * 0.43, w * 0.18, h * 0.05);

  ctx.save();
  ctx.beginPath();
  ctx.rect(-w * 0.42, h * 0.31, w * 0.84, h * 0.1);
  ctx.clip();
  for (let i = -3; i < 6; i += 1) {
    const sx = -w * 0.55 + i * w * 0.2;
    ctx.fillStyle = i % 2 ? "#101018" : "#ffd25c";
    ctx.beginPath();
    ctx.moveTo(sx, h * 0.42);
    ctx.lineTo(sx + w * 0.18, h * 0.42);
    ctx.lineTo(sx + w * 0.31, h * 0.31);
    ctx.lineTo(sx + w * 0.13, h * 0.31);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function drawDeer(ctx, x, y, direction, scale = 1) {
  const w = 72 * scale;
  const h = 58 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction >= 0 ? 1 : -1, 1);
  drawShadow(ctx, w, h * 0.7);
  ctx.fillStyle = "#d6a35a";
  ctx.strokeStyle = "#ffe0a0";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.fillRect(-w * 0.34, -h * 0.12, w * 0.5, h * 0.28);
  ctx.fillRect(w * 0.08, -h * 0.26, w * 0.22, h * 0.18);
  ctx.fillRect(-w * 0.28, h * 0.12, w * 0.08, h * 0.28);
  ctx.fillRect(w * 0.02, h * 0.12, w * 0.08, h * 0.28);
  ctx.beginPath();
  ctx.moveTo(w * 0.16, -h * 0.24);
  ctx.lineTo(w * 0.08, -h * 0.42);
  ctx.moveTo(w * 0.2, -h * 0.24);
  ctx.lineTo(w * 0.32, -h * 0.42);
  ctx.stroke();
  ctx.fillStyle = "#f6fbff";
  ctx.fillRect(w * 0.23, -h * 0.22, w * 0.04, h * 0.04);
  ctx.restore();
}

function drawCone(ctx, x, y, scale = 1) {
  const w = 42 * scale;
  const h = 54 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w, h * 0.6);
  ctx.fillStyle = "#ff8f3f";
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.45);
  ctx.lineTo(w * 0.38, h * 0.36);
  ctx.lineTo(-w * 0.38, h * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f6fbff";
  ctx.fillRect(-w * 0.24, -h * 0.02, w * 0.48, h * 0.09);
  ctx.fillStyle = "#10111a";
  ctx.fillRect(-w * 0.48, h * 0.32, w * 0.96, h * 0.16);
  ctx.restore();
}

function drawOilSlick(ctx, x, y, scale = 1) {
  const w = 70 * scale;
  const h = 42 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#8b5cff";
  ctx.fillStyle = "#05050a";
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.46, h * 0.34, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8b5cff";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.stroke();
  ctx.strokeStyle = "#28f6ff";
  ctx.beginPath();
  ctx.arc(-w * 0.1, -h * 0.02, w * 0.16, 0.2, Math.PI * 1.25);
  ctx.stroke();
  ctx.restore();
}

function drawRamp(ctx, x, y, scale = 1) {
  const w = 80 * scale;
  const h = 58 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w, h * 0.5);
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#44ff99";
  ctx.fillStyle = "#20283c";
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, h * 0.32);
  ctx.lineTo(w * 0.5, h * 0.32);
  ctx.lineTo(w * 0.28, -h * 0.34);
  ctx.lineTo(-w * 0.5, h * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#44ff99";
  ctx.fillRect(-w * 0.34, h * 0.06, w * 0.2, h * 0.08);
  ctx.fillRect(w * 0.06, -h * 0.04, w * 0.2, h * 0.08);
  ctx.restore();
}

function drawBoostPad(ctx, x, y, scale = 1) {
  const w = 82 * scale;
  const h = 48 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#28f6ff";
  ctx.fillStyle = "rgba(40, 246, 255, 0.28)";
  ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
  ctx.strokeStyle = "#28f6ff";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);
  ctx.fillStyle = "#ffe45e";
  ctx.beginPath();
  ctx.moveTo(-w * 0.18, -h * 0.28);
  ctx.lineTo(w * 0.18, 0);
  ctx.lineTo(-w * 0.18, h * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGasCan(ctx, x, y, scale = 1) {
  const w = 54 * scale;
  const h = 64 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w * 0.86, h * 0.72);
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ff334c";
  ctx.fillStyle = "#c91f32";
  pixelPath(ctx, [
    [-0.34, -0.42],
    [0.18, -0.42],
    [0.36, -0.24],
    [0.36, 0.42],
    [-0.34, 0.42],
    [-0.42, 0.28],
    [-0.42, -0.32]
  ], w, h);
  ctx.strokeStyle = "#f6fbff";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#07101b";
  ctx.fillRect(-w * 0.22, -h * 0.52, w * 0.38, h * 0.16);
  ctx.fillStyle = "#ff334c";
  ctx.fillRect(-w * 0.1, -h * 0.48, w * 0.18, h * 0.08);
  ctx.fillStyle = "#f6fbff";
  ctx.fillRect(-w * 0.22, -h * 0.12, w * 0.44, h * 0.09);
  ctx.fillStyle = "#ffe45e";
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.02);
  ctx.bezierCurveTo(w * 0.18, h * 0.12, w * 0.12, h * 0.3, 0, h * 0.3);
  ctx.bezierCurveTo(-w * 0.12, h * 0.3, -w * 0.18, h * 0.12, 0, -h * 0.02);
  ctx.fill();
  ctx.fillStyle = "#07101b";
  ctx.fillRect(w * 0.24, -h * 0.34, w * 0.24, h * 0.1);
  ctx.restore();
}

function drawBarrier(ctx, x, y, scale = 1) {
  const w = 84 * scale;
  const h = 70 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w, h * 0.82);
  ctx.fillStyle = "#12131a";
  ctx.fillRect(-w * 0.42, h * 0.18, w * 0.12, h * 0.25);
  ctx.fillRect(w * 0.3, h * 0.18, w * 0.12, h * 0.25);

  ctx.fillStyle = "#2a2730";
  ctx.fillRect(-w * 0.48, -h * 0.32, w * 0.96, h * 0.5);
  ctx.strokeStyle = "#f3f0d8";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeRect(-w * 0.48, -h * 0.32, w * 0.96, h * 0.5);

  ctx.save();
  ctx.beginPath();
  ctx.rect(-w * 0.44, -h * 0.26, w * 0.88, h * 0.38);
  ctx.clip();
  for (let i = -3; i < 8; i += 1) {
    const sx = -w * 0.62 + i * w * 0.18;
    ctx.fillStyle = i % 2 ? "#101018" : "#ffb340";
    ctx.beginPath();
    ctx.moveTo(sx, h * 0.15);
    ctx.lineTo(sx + w * 0.16, h * 0.15);
    ctx.lineTo(sx + w * 0.38, -h * 0.3);
    ctx.lineTo(sx + w * 0.22, -h * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "#f3f0d8";
  ctx.fillRect(-w * 0.5, -h * 0.38, w, h * 0.08);
  ctx.fillRect(-w * 0.5, h * 0.13, w, h * 0.08);
  ctx.fillStyle = "#ff334c";
  ctx.fillRect(-w * 0.49, -h * 0.4, w * 0.14, h * 0.12);
  ctx.fillRect(w * 0.35, -h * 0.4, w * 0.14, h * 0.12);
  ctx.restore();
}

function drawBranch(ctx, x, y, scale = 1) {
  const w = 68 * scale;
  const h = 34 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w, h);
  ctx.strokeStyle = "#b56b36";
  ctx.lineWidth = Math.max(5, 7 * scale);
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(-w * 0.42, h * 0.12);
  ctx.lineTo(w * 0.36, -h * 0.12);
  ctx.moveTo(-w * 0.02, 0);
  ctx.lineTo(w * 0.18, -h * 0.36);
  ctx.moveTo(w * 0.08, -h * 0.02);
  ctx.lineTo(w * 0.34, h * 0.26);
  ctx.stroke();
  ctx.restore();
}

function drawRoadSign(ctx, x, y, signType, scale = 1) {
  const w = 70 * scale;
  const h = 78 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ffe45e";
  ctx.fillStyle = "#2b2441";
  ctx.fillRect(-w * 0.06, -h * 0.02, w * 0.12, h * 0.52);
  ctx.fillStyle = "#ffe45e";
  ctx.fillRect(-w * 0.42, -h * 0.46, w * 0.84, h * 0.48);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeRect(-w * 0.42, -h * 0.46, w * 0.84, h * 0.48);
  ctx.fillStyle = "#111";
  ctx.font = `${Math.max(10, 14 * scale)}px Trebuchet MS, Verdana, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(signType === "deer" ? "DEER" : "WORK", 0, -h * 0.22);
  ctx.restore();
}

function drawFinishLine(ctx, roadX, y, roadW, scale = 1) {
  const h = 34 * scale;
  const cell = Math.max(12, 18 * scale);
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#f6fbff";
  for (let col = 0; col < Math.ceil(roadW / cell); col += 1) {
    for (let row = 0; row < 2; row += 1) {
      ctx.fillStyle = (col + row) % 2 === 0 ? "#f6fbff" : "#08080d";
      ctx.fillRect(roadX + col * cell, y - h / 2 + row * h / 2, cell, h / 2);
    }
  }
  ctx.fillStyle = "#ffe45e";
  ctx.font = `${Math.max(14, 22 * scale)}px Trebuchet MS, Verdana, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("FINISH", roadX + roadW / 2, y - h * 0.85);
  ctx.restore();
}

function pixelPath(ctx, points, w, h) {
  ctx.beginPath();
  points.forEach(([px, py], index) => {
    const x = px * w;
    const y = py * h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
}

function drawShadow(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.38, w * 0.5, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTrafficSprite(ctx, x, y, visual) {
  const image = visual.sprite;
  if (!image || !visual.source) return;
  ctx.save();
  const parentAlpha = ctx.globalAlpha;
  ctx.globalAlpha = parentAlpha * 0.28;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y + visual.h * 0.34, visual.w * 0.46, visual.h * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = parentAlpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    visual.source.x,
    visual.source.y,
    visual.source.width,
    visual.source.height,
    x - visual.w / 2,
    y - visual.h / 2,
    visual.w,
    visual.h
  );
  ctx.restore();
}

function shade(hex, amount) {
  const color = String(hex || "#ffffff").replace("#", "");
  if (color.length !== 6) return hex;
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount, 0, 255);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount, 0, 255);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount, 0, 255);
  return `#${[r, g, b].map((part) => Math.round(part).toString(16).padStart(2, "0")).join("")}`;
}

// ---------------------------------------------------------------------------
// Game state and screens
// ---------------------------------------------------------------------------

class NeonRoadRally {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.layer = document.getElementById("screenLayer");
    if (this.canvas) {
      this.canvas.tabIndex = 0;
      this.canvas.addEventListener("pointerdown", () => this.focusControls());
    }
    this.profiles = new PlayerProfileManager(STORAGE_KEY);
    this.audio = new AudioManager(this.profiles.data.audio, (settings) => this.profiles.updateAudioSettings(settings));
    this.carSprites = new CarSpriteManager(CAR_BODY_STYLES, () => {
      if (this.screen === "customize") this.renderCarPreview();
      if (this.screen === "vehicleScaleDebug") this.renderVehicleScaleDebugCanvas();
    });
    this.trafficSprites = new TrafficSpriteManager(TRAFFIC_SPRITE_ASSETS, () => {
      if (this.screen === "vehicleScaleDebug") this.renderVehicleScaleDebugCanvas();
    });
    this.renderer = new Renderer(this.canvas, this);
    document.addEventListener("fullscreenchange", () => {
      this.renderer.resize();
      this.focusControls();
    });
    this.obstacles = new ObstacleManager(this);
    this.collision = new CollisionSystem(this);
    this.input = new InputManager(this);
    this.screen = "title";
    this.debugMode = false;
    this.debugSpeedScale = 1;
    this.attractDistance = 0;
    this.pendingRoadSeed = generateReadableRoadSeed();
    this.pendingRaceTypeId = DEFAULT_RACE_TYPE_ID;
    this.partySetup = null;
    this.partySession = null;
    this.roadRng = null;
    this.randomFloat = () => this.nextRoadRandom();
    this.simulationStatus = null;
    this.simulationRunning = false;
    this.lastFrame = performance.now();
    this.lastDt = 0;
    this.run = this.createEmptyRun();
    this.lastSummary = null;
    this.scoreTallyFrame = null;
    this.showTitle();
    requestAnimationFrame((time) => this.loop(time));
  }

  createEmptyRun() {
    const player = this.profiles.getCurrentPlayer() || {
      name: "PLAYER 1",
      car: { ...DEFAULT_CAR },
      bestScore: 0
    };
    const track = TRACKS[0];
    const speedClass = getSpeedClassConfig(this.profiles?.data?.speedClassId);
    const section = getTrackSection(track, 0);
    return {
      player,
      track,
      speedClassId: speedClass.id,
      speedClass,
      scoreMultiplier: speedClass.scoreMultiplier,
      raceTypeId: DEFAULT_RACE_TYPE_ID,
      raceType: getRaceTypeConfig(DEFAULT_RACE_TYPE_ID),
      fuelMax: 0,
      fuel: 0,
      fuelDrainPerSecond: 0,
      gasCanRestoreAmount: 0,
      lowFuelThreshold: 0,
      criticalFuelThreshold: 0,
      lowFuelActive: false,
      criticalFuelActive: false,
      fuelWarningCooldown: 0,
      fuelWarningState: "none",
      fuelRunObjectMixActive: false,
      timeSinceLastGasCan: 0,
      longestNoFuelStretchSeconds: 0,
      maxTimeBetweenGasCans: 0,
      gasCanGapSamples: [],
      gasCansSpawned: 0,
      gasCansCollected: 0,
      fuelCollected: 0,
      fuelOpportunitiesBySection: {},
      simulatedFuelRestored: 0,
      roadSeed: DEFAULT_ROAD_SEED,
      roadSeedSource: getRunRandomSeedSource(DEFAULT_ROAD_SEED, track, speedClass.id, DEFAULT_RACE_TYPE_ID),
      roadSeedHash: hashSeed(getRunRandomSeedSource(DEFAULT_ROAD_SEED, track, speedClass.id, DEFAULT_RACE_TYPE_ID)),
      roadRngState: hashSeed(getRunRandomSeedSource(DEFAULT_ROAD_SEED, track, speedClass.id, DEFAULT_RACE_TYPE_ID)),
      roadDirectorSequence: [],
      currentSectionId: section.id,
      currentSectionLabel: section.label,
      sectionProgress: 0,
      sectionPressureMultiplier: getSectionNumber(section, "pressureMultiplier", 1, 0.25, 2.4),
      sectionVisualIntensity: getSectionNumber(section, "visualIntensity", 1, 0.5, 1.8),
      sectionNoticeTimer: 0,
      distance: 0,
      baseScore: 0,
      score: 0,
      elapsed: 0,
      targetLane: 2,
      renderLaneFloat: 2,
      playerLaneFloat: 2,
      laneChangeStartLane: 2,
      laneChangeTargetLane: 2,
      laneChangeDistance: 0,
      laneChangeElapsed: 0,
      laneChangeProgress: 1,
      laneChangeDuration: INPUT_CONFIG.laneChangeDurationSeconds,
      playerYRatio: PLAYER_START_Y_RATIO,
      targetYRatio: PLAYER_START_Y_RATIO,
      verticalInput: 0,
      currentSpeed: getTrackCruiseSpeed(track, 0, speedClass.id),
      rawCruiseSpeed: getTrackRawCruiseSpeed(track, 0, speedClass.id),
      baseCruiseSpeed: getTrackCruiseSpeed(track, 0, speedClass.id),
      speedCap: track.maxSpeed * SPEED_TUNING.maxBoostOverrunMultiplier,
      speedCapped: false,
      debugSpeedScale: 1,
      partyMode: false,
      partySeedLocked: false,
      partyRoundNumber: 0,
      partyTurnNumber: 0,
      partyTotalPlayers: 0,
      challengeMode: false,
      challengeId: "",
      challengeName: "",
      challengeObjective: "",
      challengeFixedSeed: "",
      lastDistanceDelta: 0,
      boostMultiplier: 1,
      manualBoosts: 3,
      manualBoostsUsed: 0,
      boostTimer: 0,
      padBoostTimer: 0,
      oilTimer: 0,
      slowdownTimer: 0,
      slowdownFactor: 1,
      jumpTimer: 0,
      jumpDuration: 0.95,
      jumpOffset: 0,
      airborne: false,
      cleanTimer: 0,
      cleanBonusCount: 0,
      nearMisses: 0,
      penalties: 0,
      slowdownHits: 0,
      laneMoves: 0,
      eventScore: 0,
      bonuses: {
        finish: 0,
        speed: 0,
        unusedBoosts: 0,
        clean: 0,
        nearMiss: 0,
        boostPad: 0,
        ramp: 0,
        gasCan: 0,
        fuelBonus: 0
      },
      scoreBreakdown: {
        distance: 0,
        pace: 0,
        finish: 0,
        speedBonus: 0,
        clean: 0,
        nearMiss: 0,
        unusedBoosts: 0,
        slowdownPenalties: 0,
        boostPad: 0,
        ramp: 0,
        gasCan: 0,
        fuelBonus: 0
      },
      lastCollision: "clear",
      collisionState: "clear",
      crashFlash: 0,
      screenShake: 0,
      bumpFlashTimer: 0,
      boostBurstTimer: 0,
      finishFlashTimer: 0,
      crashBeatTimer: 0,
      fuelOutBeatTimer: 0,
      inputFlashTimer: 0,
      inputFlashKey: "none",
      lastInputKey: "none",
      countdownTimer: ARCADE_FEEL.enabled ? ARCADE_FEEL.countdownSeconds : 0,
      lastCountdownSfxLabel: "",
      raceActive: !ARCADE_FEEL.enabled,
      raceMusicStarted: false,
      floatingTexts: [],
      finished: false,
      ended: false,
      endReason: "",
      paused: false,
      debugFrozen: false
    };
  }

  loop(time) {
    const dt = Math.min(0.05, (time - this.lastFrame) / 1000 || 0);
    this.lastFrame = time;
    const debugFrozen = this.screen === "game" && this.run?.debugFrozen;
    this.lastDt = debugFrozen ? 0 : dt;
    if (this.screen === "game" && !this.run.paused && !this.run.ended && !debugFrozen) {
      this.input.update(dt);
      this.updateRun(dt);
    } else if (this.screen !== "game") {
      this.attractDistance = (this.attractDistance + dt * 210) % 100000;
    }
    if (!(this.screen === "game" && (this.run.paused || this.run.debugFrozen))) {
      this.updateArcadeEffects(dt);
    }
    this.renderer.render();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  updateArcadeEffects(dt) {
    const run = this.run;
    if (!run) return;
    run.crashFlash = Math.max(0, (run.crashFlash || 0) - dt * 2.8);
    run.screenShake = Math.max(0, (run.screenShake || 0) - dt * ARCADE_FEEL.screenShakeDecay);
    run.bumpFlashTimer = Math.max(0, (run.bumpFlashTimer || 0) - dt);
    run.boostBurstTimer = Math.max(0, (run.boostBurstTimer || 0) - dt);
    run.finishFlashTimer = Math.max(0, (run.finishFlashTimer || 0) - dt);
    run.crashBeatTimer = Math.max(0, (run.crashBeatTimer || 0) - dt);
    run.fuelOutBeatTimer = Math.max(0, (run.fuelOutBeatTimer || 0) - dt);
    run.inputFlashTimer = Math.max(0, (run.inputFlashTimer || 0) - dt);
    run.sectionNoticeTimer = Math.max(0, (run.sectionNoticeTimer || 0) - dt);
    if (Array.isArray(run.floatingTexts)) {
      run.floatingTexts.forEach((text) => {
        text.life -= dt;
        text.x += text.vx * dt;
        text.y += text.vy * dt;
      });
      run.floatingTexts = run.floatingTexts.filter((text) => text.life > 0);
    }
  }

  updateRaceSection(showInitialNotice = false) {
    const run = this.run;
    if (!run?.track) return;
    const progress = clamp(run.distance / Math.max(1, run.track.distanceToFinish), 0, 1);
    const section = getTrackSection(run.track, progress);
    const sectionChanged = section.id !== run.currentSectionId;
    run.currentSectionId = section.id;
    run.currentSectionLabel = section.label;
    run.sectionProgress = getTrackSectionProgress(section, progress);
    run.sectionPressureMultiplier = getSectionNumber(section, "pressureMultiplier", 1, 0.25, 2.4);
    run.sectionVisualIntensity = getSectionNumber(section, "visualIntensity", 1, 0.5, 1.8);
    if ((sectionChanged && run.raceActive) || showInitialNotice) {
      run.sectionNoticeTimer = 1.25;
    }
  }

  configureFuelForRun(run) {
    if (!run) return;
    const fuelRun = isFuelRunRaceType(run.raceTypeId);
    const tuning = getFuelRunTuning(run.speedClassId);
    run.fuelRunObjectMixActive = fuelRun;
    run.fuelMax = fuelRun ? tuning.fuelMax : 0;
    run.fuel = fuelRun ? tuning.fuelMax : 0;
    run.fuelDrainPerSecond = fuelRun ? tuning.fuelDrainPerSecond : 0;
    run.gasCanRestoreAmount = fuelRun ? tuning.gasCanRestoreAmount : 0;
    run.lowFuelThreshold = fuelRun ? tuning.lowFuelThreshold : 0;
    run.criticalFuelThreshold = fuelRun ? tuning.criticalFuelThreshold : 0;
    run.lowFuelActive = false;
    run.criticalFuelActive = false;
    run.fuelWarningCooldown = 0;
    run.fuelWarningState = "none";
    run.timeSinceLastGasCan = 0;
    run.longestNoFuelStretchSeconds = 0;
    run.maxTimeBetweenGasCans = 0;
    run.gasCanGapSamples = [];
    run.gasCansSpawned = 0;
    run.gasCansCollected = 0;
    run.fuelCollected = 0;
    run.fuelOpportunitiesBySection = {};
    run.simulatedFuelRestored = 0;
  }

  updateFuelRun(dt) {
    const run = this.run;
    if (!run || !isFuelRunRaceType(run.raceTypeId) || run.ended || !run.raceActive) return;
    run.timeSinceLastGasCan = Math.max(0, (run.timeSinceLastGasCan || 0) + dt);
    run.longestNoFuelStretchSeconds = Math.max(run.longestNoFuelStretchSeconds || 0, run.timeSinceLastGasCan);
    run.fuelWarningCooldown = Math.max(0, (run.fuelWarningCooldown || 0) - dt);
    run.fuel = clamp(run.fuel - run.fuelDrainPerSecond * dt, 0, run.fuelMax);
    run.lowFuelActive = run.fuel <= run.lowFuelThreshold;
    run.criticalFuelActive = run.fuel <= run.criticalFuelThreshold;
    this.maybePlayFuelWarning();
    if (run.fuel <= 0 && !run.ended) {
      this.endRace("outOfFuel", "Out of Fuel");
    }
  }

  maybePlayFuelWarning() {
    const run = this.run;
    if (!run || !isFuelRunRaceType(run.raceTypeId) || run.fuelWarningCooldown > 0) return;
    const nextState = run.criticalFuelActive ? "critical" : (run.lowFuelActive ? "low" : "none");
    if (nextState === "none") {
      run.fuelWarningState = "none";
      return;
    }
    if (nextState !== run.fuelWarningState || nextState === "critical") {
      run.fuelWarningState = nextState;
      run.fuelWarningCooldown = nextState === "critical"
        ? FUEL_RUN_CONFIG.criticalWarningCooldownSeconds
        : FUEL_RUN_CONFIG.warningCooldownSeconds;
      this.audio.playSfx("warning", {
        cooldownMs: nextState === "critical" ? 2400 : 3800,
        maxInstances: 1,
        volume: this.audio.sfxVolume * (nextState === "critical" ? 0.72 : 0.58)
      });
    }
  }

  collectGasCan(obstacle) {
    const run = this.run;
    if (!run || obstacle.hit || obstacle.remove) return;
    obstacle.hit = true;
    obstacle.remove = true;
    run.lastCollision = "Gas Can";
    run.collisionState = "collected Gas Can";
    if (!isFuelRunRaceType(run.raceTypeId)) return;
    const before = run.fuel;
    const restore = Number.isFinite(run.gasCanRestoreAmount) ? run.gasCanRestoreAmount : getFuelRunTuning(run.speedClassId).gasCanRestoreAmount;
    run.fuel = clamp(run.fuel + restore, 0, run.fuelMax);
    run.gasCansCollected += 1;
    run.fuelCollected += 1;
    run.lowFuelActive = run.fuel <= run.lowFuelThreshold;
    run.criticalFuelActive = run.fuel <= run.criticalFuelThreshold;
    if (!run.lowFuelActive) run.fuelWarningState = "none";
    this.addScoreEvent("gasCan", FUEL_RUN_CONFIG.gasCanScore);
    this.addFloatingScoreText(`FUEL +${Math.round(run.fuel - before)}`, {
      color: "#ff4d3d",
      size: 20,
      life: 1,
      yOffset: -88
    });
    this.audio.playSfx("menu", {
      cooldownMs: 120,
      maxInstances: 1,
      volume: this.audio.sfxVolume * 0.42
    });
  }

  updateRun(dt) {
    const run = this.run;
    if (run.countdownTimer > 0) {
      run.countdownTimer = Math.max(0, run.countdownTimer - dt);
      this.playCountdownSfx();
      if (!run.raceActive && run.countdownTimer <= ARCADE_FEEL.countdownGoSeconds) {
        this.startRaceAtGo();
      }
      if (!run.raceActive) return;
    }
    if (!run.raceActive) this.startRaceAtGo();
    run.elapsed += dt;
    run.boostTimer = Math.max(0, run.boostTimer - dt);
    run.padBoostTimer = Math.max(0, run.padBoostTimer - dt);
    run.oilTimer = Math.max(0, run.oilTimer - dt);
    run.slowdownTimer = Math.max(0, run.slowdownTimer - dt);

    if (run.verticalInput !== 0) {
      const verticalSpeed = INPUT_CONFIG.verticalMoveRatioPerSecond;
      run.targetYRatio = clamp(
        run.targetYRatio + run.verticalInput * verticalSpeed * dt,
        PLAYER_MIN_Y_RATIO,
        PLAYER_MAX_Y_RATIO
      );
      run.playerYRatio = run.targetYRatio;
    }

    if (run.jumpTimer > 0) {
      run.jumpTimer = Math.max(0, run.jumpTimer - dt);
      const progress = 1 - run.jumpTimer / run.jumpDuration;
      run.jumpOffset = Math.sin(progress * Math.PI) * 56;
      run.airborne = run.jumpTimer > 0.08;
    } else {
      run.jumpOffset = 0;
      run.airborne = false;
    }

    const progress = clamp(run.distance / run.track.distanceToFinish, 0, 1);
    const rawBase = getTrackRawCruiseSpeed(run.track, progress, run.speedClassId);
    const base = clamp(rawBase, SPEED_TUNING.minSpeed, run.track.maxSpeed);
    const manualBoost = run.boostTimer > 0 ? SPEED_TUNING.manualBoostMultiplier : 1;
    const padBoost = run.padBoostTimer > 0 ? SPEED_TUNING.padBoostMultiplier : 1;
    const boostMultiplier = manualBoost * padBoost;
    const slowdown = run.slowdownTimer > 0 ? run.slowdownFactor : 1;
    const debugScale = this.debugSpeedScale || 1;
    const unclampedSpeed = base * boostMultiplier * slowdown * debugScale;
    const speedCap = run.track.maxSpeed * SPEED_TUNING.maxBoostOverrunMultiplier * debugScale;
    run.rawCruiseSpeed = rawBase;
    run.baseCruiseSpeed = base;
    run.boostMultiplier = boostMultiplier;
    run.debugSpeedScale = debugScale;
    run.speedCap = speedCap;
    run.speedCapped = rawBase > run.track.maxSpeed || unclampedSpeed > speedCap;
    run.currentSpeed = clamp(unclampedSpeed, SPEED_TUNING.minSpeed, speedCap);
    const distanceDelta = run.currentSpeed * dt;
    run.lastDistanceDelta = distanceDelta;
    run.distance += distanceDelta;
    this.updateRaceSection();
    const distanceScore = distanceDelta * (run.boostTimer > 0 ? 1.6 : 1);
    const paceScore = run.currentSpeed * dt * 0.04;
    this.addBaseScore(distanceScore);
    run.scoreBreakdown.distance += distanceScore;
    this.addBaseScore(paceScore);
    run.scoreBreakdown.pace += paceScore;
    this.updateFuelRun(dt);
    if (run.ended) return;

    this.updateLaneVisual(dt);

    run.cleanTimer += dt;
    if (run.cleanTimer >= 10) {
      run.cleanTimer -= 10;
      run.cleanBonusCount += 1;
      this.addScoreEvent("clean", 100);
    }

    this.obstacles.update(dt);
    this.collision.update();

    if (run.distance >= run.track.distanceToFinish && !run.ended) {
      this.endRace("finished", "Finish Line");
    }
  }

  updateLaneVisual(dt) {
    const run = this.run;
    const target = clamp(run.targetLane, 0, LANES - 1);
    const diff = target - run.renderLaneFloat;
    run.laneChangeDuration = INPUT_CONFIG.laneChangeDurationSeconds;
    if (Math.abs(diff) <= 0.001) {
      run.renderLaneFloat = target;
      run.playerLaneFloat = target;
      run.laneChangeProgress = 1;
      return;
    }

    const maxStep = dt / Math.max(0.001, INPUT_CONFIG.laneChangeDurationSeconds);
    run.renderLaneFloat += Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
    run.playerLaneFloat = run.renderLaneFloat;
    run.laneChangeElapsed += dt;
    const distance = Math.max(0.001, run.laneChangeDistance || Math.abs(target - run.laneChangeStartLane) || Math.abs(diff));
    run.laneChangeProgress = clamp(1 - Math.abs(target - run.renderLaneFloat) / distance, 0, 1);
  }

  playCountdownSfx() {
    const run = this.run;
    if (!run || run.ended || run.paused || run.countdownTimer <= 0) return;
    const label = getCountdownLabel(run.countdownTimer);
    if (!label || label === run.lastCountdownSfxLabel) return;
    run.lastCountdownSfxLabel = label;
    if (label === "GO") {
      this.audio.playSfx("go");
    } else if (["3", "2", "1"].includes(label)) {
      this.audio.playSfx("countdownBeep");
    }
  }

  startRaceAtGo() {
    const run = this.run;
    if (!run || run.raceActive) return;
    run.raceActive = true;
    this.updateRaceSection(true);
    if (this.input) this.input.clearCountdownInputLocks();
    this.startRaceMusic(true);
  }

  startRaceMusic(restart = false) {
    const run = this.run;
    if (!run || this.audio.musicMuted) return;
    if (restart && run.raceMusicStarted) return;
    run.raceMusicStarted = true;
    this.audio.playMusic("race", restart);
  }

  nextRoadRandom() {
    if (!this.roadRng) {
      this.roadRng = createSeededRandomController("road-director-unconfigured");
    }
    const value = this.roadRng.random();
    if (this.run) {
      this.run.roadRngState = this.roadRng.getState();
    }
    return value;
  }

  resolveRoadSeed(value) {
    const normalized = normalizeRoadSeed(value, "");
    return normalized || generateReadableRoadSeed();
  }

  configureRunSeed(seed, track, speedClassId, raceTypeId = DEFAULT_RACE_TYPE_ID) {
    const roadSeed = this.resolveRoadSeed(seed);
    const source = getRunRandomSeedSource(roadSeed, track, speedClassId, raceTypeId);
    this.roadRng = createSeededRandomController(source);
    if (this.run) {
      this.run.roadSeed = roadSeed;
      this.run.roadSeedSource = source;
      this.run.roadSeedHash = this.roadRng.hash;
      this.run.roadRngState = this.roadRng.getState();
      this.run.roadDirectorSequence = [];
    }
    this.pendingRoadSeed = roadSeed;
    return roadSeed;
  }

  startRaceFromTitle() {
    if (!this.profiles.getCurrentPlayer()) {
      this.showPlayerScreen("Create or choose a player before the first run.");
      return;
    }
    this.showPreRaceScreen();
  }

  showChallengeScreen(message = "") {
    this.partySession = null;
    this.setScreen("challenges");
    this.audio.playMusic("title", false);
    const player = this.profiles.getCurrentPlayer();
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel challenge-panel">
        <div class="challenge-header">
          <div>
            <span class="eyebrow">Challenge Mode</span>
            <h2>Sunset Highway Challenges</h2>
            <p class="hint">Curated solo runs with fixed seeds, race modes, and music-shaped Road Director sections.</p>
          </div>
          <div class="challenge-player-card">
            <strong>${player ? escapeHtml(player.name) : "No Player"}</strong>
            <span>${player ? `Driving ${escapeHtml(player.car.name)}` : "Create a local player first"}</span>
          </div>
        </div>
        <div class="challenge-card-grid">
          ${CHALLENGES.map((challenge) => this.renderChallengeCard(challenge)).join("")}
        </div>
        <div class="row" style="margin-top:16px">
          <button class="small-button" data-action="title">Back to Title</button>
          <button class="small-button" data-action="leaderboard">Top 20 Scores</button>
        </div>
        <p class="status-line">${escapeHtml(message)}</p>
      </section>
    `;
    this.bindLayerButtons();
  }

  renderChallengeCard(challenge) {
    const progress = this.profiles.getChallengeProgress(challenge.id);
    const track = getTrackById(challenge.trackId);
    const completed = Boolean(progress?.completed);
    const bestScore = progress?.bestScore ? formatScore(progress.bestScore) : "No score yet";
    const bestDate = progress?.bestDate ? formatShortDate(progress.bestDate) : "";
    const statusText = completed ? `Completed${bestDate ? ` ${bestDate}` : ""}` : "Not completed";
    return `
      <article class="challenge-card ${completed ? "is-complete" : ""}">
        <div class="challenge-card-title">
          <span class="eyebrow">${completed ? "Complete" : "Open"}</span>
          <h3>${escapeHtml(challenge.name)}</h3>
        </div>
        <p class="hint">${escapeHtml(challenge.description)}</p>
        <div class="challenge-objective">
          <span>Objective</span>
          <strong>${escapeHtml(getChallengeObjectiveLabel(challenge))}</strong>
        </div>
        <div class="challenge-meta-grid">
          <span><strong>Track</strong>${escapeHtml(track.name)}</span>
          <span><strong>Race Type</strong>${escapeHtml(getRaceTypeLabel(challenge.raceType || DEFAULT_RACE_TYPE_ID))}</span>
          <span><strong>Race Mode</strong>${escapeHtml(getSpeedClassLabel(challenge.raceMode))}</span>
          <span><strong>Fixed Seed</strong>${escapeHtml(normalizeRoadSeed(challenge.seed, DEFAULT_ROAD_SEED))}</span>
          <span><strong>Best Score</strong>${escapeHtml(bestScore)}</span>
          <span><strong>Status</strong>${escapeHtml(statusText)}</span>
        </div>
        <button class="small-button primary" data-action="startChallenge" data-id="${escapeAttr(challenge.id)}">Start Challenge</button>
      </article>
    `;
  }

  handleStartChallenge(challengeId) {
    if (this.screen === "game" && this.run && !this.run.ended) return;
    const challenge = getChallengeById(challengeId);
    if (!challenge) {
      this.showChallengeScreen("Challenge not found.");
      return;
    }
    if (!this.profiles.getCurrentPlayer()) {
      this.showPlayerScreen("Create or choose a player before starting Challenge Mode.");
      return;
    }
    this.startChallengeRun(challenge);
  }

  startChallengeRun(challengeOrId) {
    const challenge = typeof challengeOrId === "string" ? getChallengeById(challengeOrId) : getChallengeById(challengeOrId?.id);
    if (!challenge) {
      this.showChallengeScreen("Challenge not found.");
      return;
    }
    this.partySession = null;
    this.partySetup = null;
    this.pendingRoadSeed = normalizeRoadSeed(challenge.seed, DEFAULT_ROAD_SEED);
    this.startRace({
      challenge,
      track: getTrackById(challenge.trackId),
      speedClassId: challenge.raceMode,
      raceTypeId: challenge.raceType || DEFAULT_RACE_TYPE_ID,
      seed: challenge.seed
    });
  }

  startRace(options = {}) {
    const challenge = options.challenge ? getChallengeById(options.challenge.id || options.challenge) : getChallengeById(options.challengeId);
    const partyMode = Boolean(options.partyMode) && !challenge;
    const player = options.player ? snapshotPartyPlayer(options.player) : this.profiles.ensureDefaultPlayer();
    const track = challenge ? getTrackById(challenge.trackId) : (options.track || TRACKS[0]);
    const speedClass = getSpeedClassConfig(challenge ? challenge.raceMode : (options.speedClassId ?? this.profiles.data.speedClassId));
    const raceType = getRaceTypeConfig(challenge
      ? (challenge.raceType || DEFAULT_RACE_TYPE_ID)
      : (partyMode ? DEFAULT_RACE_TYPE_ID : (options.raceTypeId || options.raceType || this.pendingRaceTypeId || DEFAULT_RACE_TYPE_ID)));
    if (this.scoreTallyFrame) {
      cancelAnimationFrame(this.scoreTallyFrame);
      this.scoreTallyFrame = null;
    }
    this.run = this.createEmptyRun();
    this.lastSummary = null;
    this.run.player = {
      ...player,
      car: { ...DEFAULT_CAR, ...player.car }
    };
    this.run.track = track;
    this.run.speedClassId = speedClass.id;
    this.run.speedClass = speedClass;
    this.run.scoreMultiplier = speedClass.scoreMultiplier;
    this.run.raceTypeId = raceType.id;
    this.run.raceType = raceType;
    this.run.partyMode = partyMode;
    this.run.partySeedLocked = Boolean(options.partySeedLocked ?? partyMode);
    this.run.partyRoundNumber = partyMode ? (this.partySession?.roundNumber || 1) : 0;
    this.run.partyTurnNumber = partyMode ? (this.partySession?.currentTurnNumber || 1) : 0;
    this.run.partyTotalPlayers = partyMode ? (this.partySession?.totalPlayers || 0) : 0;
    this.run.challengeMode = Boolean(challenge);
    this.run.challengeId = challenge?.id || "";
    this.run.challengeName = challenge?.name || "";
    this.run.challengeObjective = challenge ? getChallengeObjectiveLabel(challenge) : "";
    this.run.challengeFixedSeed = challenge ? normalizeRoadSeed(challenge.seed, DEFAULT_ROAD_SEED) : "";
    this.run.currentSpeed = getTrackCruiseSpeed(track, 0, speedClass.id);
    this.run.rawCruiseSpeed = getTrackRawCruiseSpeed(track, 0, speedClass.id);
    this.run.baseCruiseSpeed = this.run.currentSpeed;
    this.run.speedCap = track.maxSpeed * SPEED_TUNING.maxBoostOverrunMultiplier * (this.debugSpeedScale || 1);
    this.run.speedCapped = false;
    this.run.debugSpeedScale = this.debugSpeedScale || 1;
    this.configureFuelForRun(this.run);
    this.updateRaceSection(false);
    this.configureRunSeed(challenge ? challenge.seed : (options.seed ?? this.pendingRoadSeed), track, speedClass.id, raceType.id);
    this.pendingRaceTypeId = raceType.id;
    if (this.input) this.input.clearGameplayInput();
    this.obstacles.reset(track);
    this.setScreen("game");
    this.clearLayer();
    this.focusControls();
    this.audio.stopMusic(0);
    if (this.run.raceActive) this.startRaceMusic(true);
  }

  requestLaneMove(direction) {
    const run = this.run;
    if (run.paused || run.ended || !run.raceActive) return false;
    return this.performLaneMove(direction);
  }

  setVerticalInput(direction) {
    if (!this.run) return;
    this.run.verticalInput = clamp(direction, -1, 1);
  }

  performLaneMove(direction) {
    const run = this.run;
    const nextLane = clamp(run.targetLane + direction, 0, LANES - 1);
    if (nextLane === run.targetLane) return false;
    run.targetLane = nextLane;
    run.laneChangeStartLane = run.renderLaneFloat;
    run.laneChangeTargetLane = nextLane;
    run.laneChangeDistance = Math.max(0.001, Math.abs(nextLane - run.renderLaneFloat));
    run.laneChangeElapsed = 0;
    run.laneChangeProgress = 0;
    run.laneMoves += 1;
    return true;
  }

  useManualBoost() {
    const run = this.run;
    if (run.paused || run.ended || !run.raceActive || run.manualBoosts <= 0) return;
    run.manualBoosts -= 1;
    run.manualBoostsUsed += 1;
    run.boostTimer = Math.max(run.boostTimer, SPEED_TUNING.manualBoostDuration);
    run.boostBurstTimer = Math.max(run.boostBurstTimer || 0, ARCADE_FEEL.boostBurstSeconds);
    run.screenShake = Math.max(run.screenShake || 0, 0.18);
    this.audio.playSfx("boost");
  }

  launchJump() {
    const run = this.run;
    run.jumpDuration = 0.95;
    run.jumpTimer = run.jumpDuration;
    run.airborne = true;
  }

  focusControls() {
    const active = document.activeElement;
    const tagName = String(active?.tagName || "").toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select" || active?.isContentEditable) return;
    if (this.canvas && typeof this.canvas.focus === "function") {
      this.canvas.focus({ preventScroll: true });
    }
  }

  toggleFullscreen() {
    const root = document.getElementById("arcadeCabinet") || document.documentElement;
    let promise = null;
    if (document.fullscreenElement) {
      promise = document.exitFullscreen?.();
    } else if (root.requestFullscreen) {
      promise = root.requestFullscreen();
    }
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {});
    }
    this.focusControls();
    return promise;
  }

  recordInputEvent(keyId) {
    if (!this.run || this.screen !== "game") return;
    this.run.lastInputKey = keyId;
    this.run.inputFlashKey = keyId;
    this.run.inputFlashTimer = INPUT_CONFIG.inputFlashSeconds;
  }

  applySlowdown(factor, penalty, reason, sfxKey = "slowdown") {
    const run = this.run;
    run.slowdownFactor = Math.min(run.slowdownFactor, factor);
    run.slowdownTimer = Math.max(run.slowdownTimer, 1.45);
    run.cleanTimer = 0;
    run.penalties += Math.abs(penalty);
    run.slowdownHits += 1;
    run.scoreBreakdown.slowdownPenalties += Math.abs(penalty);
    this.addBaseScore(penalty);
    run.lastCollision = reason;
    run.bumpFlashTimer = Math.max(run.bumpFlashTimer || 0, ARCADE_FEEL.bumpFlashSeconds);
    run.screenShake = Math.max(run.screenShake || 0, ARCADE_FEEL.bumpShake);
    this.addFloatingScoreText(`${Math.round(penalty)}`, {
      color: "#ff3b58",
      size: 19,
      life: 0.95,
      yOffset: -44
    });
    this.audio.playSfx(sfxKey);
  }

  addBaseScore(points) {
    const run = this.run;
    run.baseScore = Math.max(0, (run.baseScore || 0) + points);
    run.score = Math.max(0, Math.round(run.baseScore * (run.scoreMultiplier || 1)));
  }

  addScoreEvent(type, points) {
    const run = this.run;
    this.addBaseScore(points);
    run.eventScore += points;
    if (run.bonuses[type] !== undefined) {
      run.bonuses[type] += points;
    }
    if (run.scoreBreakdown && run.scoreBreakdown[type] !== undefined) {
      run.scoreBreakdown[type] += points;
    }
    this.addFloatingScoreText(getScoreEventLabel(type, points), {
      color: getScoreEventColor(type),
      size: type === "nearMiss" ? 17 : 18,
      life: type === "nearMiss" ? 0.9 : ARCADE_FEEL.floatingTextSeconds,
      yOffset: type === "nearMiss" ? -72 : -56
    });
  }

  addFloatingScoreText(text, options = {}) {
    if (!ARCADE_FEEL.enabled || !this.run || this.screen !== "game") return;
    const anchor = this.renderer.getPlayerFloatingAnchor();
    const lateral = (Math.random() - 0.5) * 34;
    const item = {
      text,
      x: options.x ?? anchor.x + lateral,
      y: options.y ?? anchor.y + (options.yOffset ?? -58),
      vx: options.vx ?? lateral * 0.38,
      vy: options.vy ?? -54,
      life: options.life ?? ARCADE_FEEL.floatingTextSeconds,
      maxLife: options.life ?? ARCADE_FEEL.floatingTextSeconds,
      color: options.color || "#ffe45e",
      size: options.size || 18
    };
    this.run.floatingTexts.push(item);
    if (this.run.floatingTexts.length > 12) {
      this.run.floatingTexts.splice(0, this.run.floatingTexts.length - 12);
    }
  }

  buildRunScoreBreakdown(run) {
    const raw = run.scoreBreakdown || {};
    const safeScore = (value) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
    return {
      distance: safeScore(raw.distance),
      pace: safeScore(raw.pace),
      finish: safeScore(raw.finish || run.bonuses?.finish),
      speedBonus: safeScore(raw.speedBonus || run.bonuses?.speed),
      clean: safeScore(raw.clean || run.bonuses?.clean),
      nearMiss: safeScore(raw.nearMiss || run.bonuses?.nearMiss),
      unusedBoosts: safeScore(raw.unusedBoosts || run.bonuses?.unusedBoosts),
      slowdownPenalties: safeScore(raw.slowdownPenalties || run.penalties),
      boostPad: safeScore(raw.boostPad || run.bonuses?.boostPad),
      ramp: safeScore(raw.ramp || run.bonuses?.ramp),
      gasCan: safeScore(raw.gasCan || run.bonuses?.gasCan),
      fuelBonus: safeScore(raw.fuelBonus || run.bonuses?.fuelBonus),
      preMultiplierTotal: Math.max(0, Math.round(run.baseScore || 0)),
      multiplier: run.scoreMultiplier || 1,
      finalScore: Math.max(0, Math.round(run.score || 0))
    };
  }

  buildRunMedals(summary, run, previousBestScore) {
    const medals = [];
    const add = (title, detail, tone = "neutral") => {
      if (medals.length >= 3) return;
      medals.push({ title, detail, tone });
    };
    const previousBest = Math.max(0, Math.round(previousBestScore || 0));
    const scoreGap = previousBest - summary.finalScore;

    if (summary.newPersonalBest) {
      add("Personal Best", previousBest > 0 ? `Beat ${formatScore(previousBest)}` : "First best posted", "hot");
    }
    if (summary.entersTopTwenty) {
      add("Top 20", summary.topTwentyRank ? `Placed #${summary.topTwentyRank}` : "Leaderboard run", "hot");
    }
    if (summary.status === "finished" && (run.slowdownHits || 0) === 0 && (run.penalties || 0) === 0) {
      add("Clean Run", "No slowdown hits", "clean");
    }
    if (summary.status === "finished" && summary.speedClass === "turbo") {
      add("Turbo Survivor", "Finished Turbo", "hot");
    }
    if (summary.status === "finished" && summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID) {
      add("Fuel Run Finish", `${summary.fuelRemaining || 0} fuel left`, "hot");
    }
    if (summary.status === "outOfFuel") {
      add("Out of Fuel", `${Math.round(summary.progress * 100)}% reached`, "danger");
    }
    if ((run.nearMisses || 0) >= 5) {
      add("Near-Miss Maniac", `${run.nearMisses} near misses`, "cool");
    } else if ((run.nearMisses || 0) >= 3) {
      add("Near-Miss Streak", `${run.nearMisses} near misses`, "cool");
    }
    if (summary.status === "finished" && (run.manualBoostsUsed || 0) === 0) {
      add("No Boost Hero", "Finished without boosts", "cool");
    }
    if ((run.manualBoostsUsed || 0) >= 3 && run.manualBoosts <= 0) {
      add("Boost Addict", "Spent every boost", "hot");
    }
    if ((run.laneMoves || 0) <= 1 && summary.progress >= 0.35) {
      add("Center-Lane Camper", "Barely left the middle", "shame");
    }
    if (summary.status === "crashed" && summary.progress < 0.35) {
      add("Crashout", "Early exit", "danger");
    }
    if (!summary.newPersonalBest && previousBest > 0 && scoreGap > 0 && scoreGap <= Math.max(1000, previousBest * 0.08)) {
      add("One More Run", `${formatScore(scoreGap)} from PB`, "cool");
    }
    if (medals.length === 0) {
      add(summary.status === "finished" ? "Banked Run" : "Run Logged", summary.status === "finished" ? "Score on the board" : "Score saved", "neutral");
    }
    return medals;
  }

  buildChallengeResult(summary) {
    const challenge = getChallengeById(summary.challengeId);
    if (!challenge) return null;
    const evaluation = evaluateChallengeObjective(challenge, summary);
    if (summary.debugSpeedScaleActive) {
      const progress = this.profiles.getChallengeProgress(challenge.id);
      return {
        ...evaluation,
        saved: false,
        previousBestScore: progress?.bestScore || 0,
        bestScore: progress?.bestScore || 0,
        bestCompletionStatus: Boolean(progress?.completed),
        newBest: false,
        newlyCompleted: false,
        bestDate: progress?.bestDate || "",
        bestRunSummary: progress?.bestRunSummary || null
      };
    }
    return this.profiles.recordChallengeResult(challenge, summary, evaluation);
  }

  endRace(status, reason) {
    const run = this.run;
    if (run.ended) return;
    status = normalizeRunStatus(status);
    run.ended = true;
    run.finished = status === "finished";
    run.endReason = reason;
    run.crashFlash = status === "crashed" ? 1 : 0;
    run.screenShake = status === "crashed" ? Math.max(run.screenShake || 0, ARCADE_FEEL.crashShake) : run.screenShake;
    run.crashBeatTimer = status === "crashed" ? 0.72 : 0;
    run.fuelOutBeatTimer = status === "outOfFuel" ? 0.78 : 0;

    if (status === "finished") {
      run.finishFlashTimer = ARCADE_FEEL.finishFlashSeconds;
      run.bonuses.finish = 5000;
      run.scoreBreakdown.finish = run.bonuses.finish;
      this.addBaseScore(run.bonuses.finish);
      this.addFloatingScoreText(getScoreEventLabel("finish", run.bonuses.finish), {
        color: "#f6fbff",
        size: 24,
        life: 0.86,
        x: this.renderer.width / 2,
        y: this.renderer.height * 0.34,
        vx: 0,
        vy: -28
      });
      const target = run.track.targetDurationSeconds;
      run.bonuses.speed = Math.max(0, Math.round(3000 * clamp((target - run.elapsed + 18) / target, 0, 1)));
      run.scoreBreakdown.speedBonus = run.bonuses.speed;
      this.addBaseScore(run.bonuses.speed);
      if (isFuelRunRaceType(run.raceTypeId)) {
        run.bonuses.fuelBonus = Math.max(0, Math.round(run.fuel)) * FUEL_RUN_CONFIG.fuelPointFinishBonus;
        run.scoreBreakdown.fuelBonus = run.bonuses.fuelBonus;
        this.addBaseScore(run.bonuses.fuelBonus);
      }
      this.audio.playSfx("finish");
    } else if (status === "outOfFuel") {
      run.fuel = 0;
      run.lowFuelActive = true;
      run.criticalFuelActive = true;
      run.screenShake = Math.max(run.screenShake || 0, 0.42);
      this.audio.playSfx("warning", { cooldownMs: 1200, maxInstances: 1, volume: this.audio.sfxVolume * 0.72 });
    } else {
      this.audio.playSfx("crash");
    }

    run.bonuses.unusedBoosts = run.manualBoosts * 750;
    run.scoreBreakdown.unusedBoosts = run.bonuses.unusedBoosts;
    this.addBaseScore(run.bonuses.unusedBoosts);
    run.score = Math.max(0, Math.round(run.score));
    this.audio.stopMusic(0.28);

    const player = run.player || this.profiles.getCurrentPlayer() || this.profiles.ensureDefaultPlayer();
    const profilePlayer = this.profiles.getPlayerById(player.id) || player;
    const previousBestScore = profilePlayer.bestScore || 0;
    const leaderboard = this.profiles.data.leaderboard || [];
    const topTwentyCutoff = leaderboard.length < LEADERBOARD_MAX_ENTRIES ? -1 : Math.min(...leaderboard.slice(0, LEADERBOARD_MAX_ENTRIES).map((item) => item.score || 0));
    const debugSpeedScaleActive = Math.abs((this.debugSpeedScale || 1) - 1) > 0.001;
    const isNewPersonalBest = !debugSpeedScaleActive && run.score > previousBestScore;
    const entersTopTwenty = !debugSpeedScaleActive && (leaderboard.length < LEADERBOARD_MAX_ENTRIES || run.score > topTwentyCutoff);
    const entry = debugSpeedScaleActive ? null : this.profiles.recordScore({
      playerId: player.id,
      playerName: player.name,
      carName: player.car.name,
      trackName: run.track.name,
      seed: run.roadSeed,
      speedClass: run.speedClassId,
      raceMode: run.speedClassId,
      raceType: run.raceTypeId,
      score: run.score,
      status,
      time: run.elapsed,
      fuelCollected: run.gasCansCollected || 0,
      fuelRemaining: isFuelRunRaceType(run.raceTypeId) ? Math.max(0, Math.round(run.fuel || 0)) : 0,
      fuelBonus: run.bonuses.fuelBonus || 0,
      partyMode: Boolean(run.partyMode),
      challengeId: run.challengeMode ? run.challengeId : "",
      challengeName: run.challengeMode ? run.challengeName : ""
    });
    const updatedProfilePlayer = this.profiles.getPlayerById(player.id) || profilePlayer;
    const topTwentyRank = entry ? this.profiles.data.leaderboard.indexOf(entry) + 1 : null;
    const topTwentyGap = !debugSpeedScaleActive && !entersTopTwenty && topTwentyCutoff >= 0
      ? Math.max(1, Math.round(topTwentyCutoff - run.score + 1))
      : 0;
    const scoreBreakdown = this.buildRunScoreBreakdown(run);

    const summary = {
      scoreEntry: entry,
      player: snapshotPartyPlayer(player),
      playerId: player.id,
      playerName: player.name,
      carName: player.car.name,
      trackName: run.track.name,
      partyMode: Boolean(run.partyMode),
      challengeMode: Boolean(run.challengeMode),
      challengeId: run.challengeId || "",
      challengeName: run.challengeName || "",
      challengeObjective: run.challengeObjective || "",
      challengeFixedSeed: run.challengeFixedSeed || "",
      baseScore: Math.max(0, Math.round(run.baseScore || 0)),
      finalScore: run.score,
      seed: run.roadSeed,
      seedHash: run.roadSeedHash,
      speedClass: run.speedClassId,
      speedClassLabel: run.speedClass?.label || getSpeedClassLabel(run.speedClassId),
      scoreMultiplier: run.scoreMultiplier || 1,
      raceTypeId: run.raceTypeId,
      raceTypeLabel: getRaceTypeLabel(run.raceTypeId),
      distance: Math.min(run.distance, run.track.distanceToFinish),
      progress: clamp(run.distance / run.track.distanceToFinish, 0, 1),
      status,
      reason,
      time: run.elapsed,
      bonuses: { ...run.bonuses },
      penalties: run.penalties,
      slowdownHits: run.slowdownHits || 0,
      nearMisses: run.nearMisses || 0,
      manualBoostsUsed: run.manualBoostsUsed || 0,
      laneMoves: run.laneMoves || 0,
      gasCansSpawned: run.gasCansSpawned || 0,
      gasCansCollected: run.gasCansCollected || 0,
      fuelCollected: run.gasCansCollected || 0,
      fuelRemaining: isFuelRunRaceType(run.raceTypeId) ? Math.max(0, Math.round(run.fuel || 0)) : 0,
      fuelBonus: run.bonuses.fuelBonus || 0,
      fuelDrainPerSecond: run.fuelDrainPerSecond || 0,
      gasCanRestoreAmount: run.gasCanRestoreAmount || 0,
      lowFuelThreshold: run.lowFuelThreshold || 0,
      criticalFuelThreshold: run.criticalFuelThreshold || 0,
      scoreBreakdown,
      bestScore: debugSpeedScaleActive ? previousBestScore : (updatedProfilePlayer.bestScore || run.score),
      previousBestScore,
      trackDistance: run.track.distanceToFinish,
      newPersonalBest: isNewPersonalBest,
      entersTopTwenty,
      topTwentyRank: topTwentyRank > 0 ? topTwentyRank : null,
      topTwentyGap,
      newHighScore: isNewPersonalBest || entersTopTwenty,
      scoreSaved: !debugSpeedScaleActive,
      debugSpeedScaleActive,
      debugSpeedScale: this.debugSpeedScale || 1
    };
    summary.medals = this.buildRunMedals(summary, run, previousBestScore);
    if (summary.challengeMode) {
      summary.challengeResult = this.buildChallengeResult(summary);
      if (summary.challengeResult?.completed) {
        summary.medals = [{
          title: "Challenge Complete",
          detail: summary.challengeName,
          tone: "hot"
        }].concat(summary.medals).slice(0, 3);
      }
    }
    this.lastSummary = summary;
    if (run.partyMode && this.partySession?.isPartyMode) {
      this.lastSummary.partyResult = this.partySession.addResult(this.lastSummary);
    }

    setTimeout(() => {
      if (this.screen !== "game") return;
      if (this.lastSummary?.partyMode && this.partySession?.isPartyMode) {
        this.showPartyStandingsScreen();
      } else {
        this.showScoreScreen();
      }
    }, status === "crashed" || status === "outOfFuel" ? ARCADE_FEEL.crashScoreDelayMs : ARCADE_FEEL.finishScoreDelayMs);
  }

  getPartyDebugInfo() {
    const session = this.partySession;
    const run = this.run;
    const active = Boolean(session?.isPartyMode || run?.partyMode);
    if (!active) {
      return {
        active: false,
        currentPlayer: "none",
        currentTurn: 0,
        totalPlayers: 0,
        sharedSeed: "none",
        resultsCount: 0
      };
    }
    return {
      active: true,
      currentPlayer: session?.currentPlayer?.name || run?.player?.name || "none",
      currentTurn: run?.partyMode ? (run.partyTurnNumber || session?.currentTurnNumber || 1) : (session?.currentTurnNumber || 0),
      totalPlayers: run?.partyMode ? (run.partyTotalPlayers || session?.totalPlayers || 0) : (session?.totalPlayers || 0),
      sharedSeed: session?.sharedSeed || run?.roadSeed || "none",
      resultsCount: session?.results?.length || 0
    };
  }

  getChallengeDebugInfo() {
    const run = this.run;
    if (!run?.challengeMode) {
      return {
        active: false,
        challengeId: "none",
        challengeName: "none",
        objective: "none",
        completionStatus: "none",
        fixedSeed: "none"
      };
    }
    const progress = this.profiles.getChallengeProgress(run.challengeId);
    return {
      active: true,
      challengeId: run.challengeId || "unknown",
      challengeName: run.challengeName || "Challenge",
      objective: run.challengeObjective || "Objective",
      completionStatus: progress?.completed ? "completed" : "not completed",
      fixedSeed: run.challengeFixedSeed || run.roadSeed || "none"
    };
  }

  forceCrash() {
    if (this.screen === "game") this.endRace("crashed", "Debug Crash");
  }

  jumpNearFinish() {
    if (this.screen !== "game") return;
    this.run.distance = Math.max(0, this.run.track.distanceToFinish - 1500);
    this.obstacles.obstacles = [];
    this.obstacles.nextSpawnDistance = this.run.track.distanceToFinish + VIEW_DISTANCE;
  }

  async runSpawnSafetySimulation(options = {}) {
    if (this.simulationRunning) return;
    this.simulationRunning = true;
    this.simulationRaceTypeId = normalizeRaceTypeId(options.raceTypeId || options.raceType, DEFAULT_RACE_TYPE_ID);
    this.showSimulationRunning();
    const seed = normalizeRoadSeed(options.seed ?? this.pendingRoadSeed, "sunset-highway-spawn-safety-v1");
    const summary = await this.runSpawnSafetySimulationCore({
      ...options,
      seed,
      onProgress: (completed, total) => this.updateSimulationProgress(completed, total)
    });
    this.simulationRunning = false;
    this.simulationStatus = summary;
    this.showSimulationReport(summary);
  }

  updateFuelRunSimulationState(simRun, dt) {
    if (!simRun || !isFuelRunRaceType(simRun.raceTypeId)) return;
    simRun.timeSinceLastGasCan = Math.max(0, (simRun.timeSinceLastGasCan || 0) + dt);
    simRun.longestNoFuelStretchSeconds = Math.max(simRun.longestNoFuelStretchSeconds || 0, simRun.timeSinceLastGasCan);
    simRun.fuel = clamp((simRun.fuel || 0) - (simRun.fuelDrainPerSecond || 0) * dt, 0, simRun.fuelMax || FUEL_RUN_CONFIG.fuelMax);
    simRun.lowFuelActive = simRun.fuel <= (simRun.lowFuelThreshold || FUEL_RUN_CONFIG.lowFuelThreshold);
    simRun.criticalFuelActive = simRun.fuel <= (simRun.criticalFuelThreshold || FUEL_RUN_CONFIG.criticalFuelThreshold);
    if (simRun.fuel <= 0) simRun.simOutOfFuel = true;
  }

  captureRoadDirectorSequence(options = {}) {
    const track = options.track || TRACKS[0];
    const speedClassId = normalizeSpeedClassId(options.speedClassId, DEFAULT_SPEED_CLASS_ID);
    const speedClass = getSpeedClassConfig(speedClassId);
    const raceTypeId = normalizeRaceTypeId(options.raceTypeId || options.raceType, DEFAULT_RACE_TYPE_ID);
    const raceType = getRaceTypeConfig(raceTypeId);
    const seed = normalizeRoadSeed(options.seed, DEFAULT_ROAD_SEED);
    const waveLimit = Math.max(1, Math.round(options.waveLimit || 10));
    const dt = Number.isFinite(options.dt) ? options.dt : 0.4;
    const seedSource = getRunRandomSeedSource(seed, track, speedClassId, raceTypeId);
    const rng = createSeededRandom(seedSource);
    const simRun = {
      track,
      speedClassId,
      speedClass,
      raceTypeId,
      raceType,
      roadSeed: seed,
      roadSeedSource: seedSource,
      roadSeedHash: rng.seedHash,
      roadRngState: rng.getState(),
      roadDirectorSequence: [],
      partySeedLocked: Boolean(options.partySeedLocked),
      distance: 0,
      elapsed: 0,
      currentSpeed: getTrackCruiseSpeed(track, 0, speedClassId),
      targetLane: TRACK_DIRECTOR.centerLane,
      renderLaneFloat: TRACK_DIRECTOR.centerLane
    };
    this.configureFuelForRun(simRun);
    simRun.simulateFuelPickups = true;
    const simGame = {
      run: simRun,
      renderer: this.renderer,
      randomFloat: () => {
        const value = rng();
        simRun.roadRngState = rng.getState();
        return value;
      },
      screen: "simulation",
      audio: { playSfx() {} }
    };
    const manager = new ObstacleManager(simGame);
    manager.reset(track);

    while (simRun.distance < track.distanceToFinish && simRun.roadDirectorSequence.length < waveLimit) {
      const progress = clamp(simRun.distance / track.distanceToFinish, 0, 1);
      simRun.currentSpeed = getTrackCruiseSpeed(track, progress, speedClassId);
      if (isFuelRunRaceType(raceTypeId)) {
        this.updateFuelRunSimulationState(simRun, dt);
      }
      simRun.distance += simRun.currentSpeed * dt;
      simRun.elapsed += dt;
      manager.update(dt);
    }

    return {
      seed,
      speedClassId,
      raceTypeId,
      trackId: track.id,
      seedHash: rng.seedHash,
      rngState: rng.getState(),
      sequence: simRun.roadDirectorSequence.slice(0, waveLimit)
    };
  }

  getRoadDirectorSequenceFingerprint(sequence) {
    return JSON.stringify((sequence || []).map((wave) => ({
      type: wave.type,
      sectionId: wave.sectionId,
      distance: Math.round(wave.distance / 10) * 10,
      blockedLanes: wave.blockedLanes,
      boostLanes: wave.boostLanes,
      rampLanes: wave.rampLanes,
      gasCanLanes: wave.gasCanLanes,
      obstacles: (wave.obstacles || []).map((obstacle) => ({
        type: obstacle.type,
        variant: obstacle.variant || "",
        lane: obstacle.lane,
        distance: Math.round(obstacle.distance / 10) * 10
      }))
    })));
  }

  runSeedDeterminismTest(options = {}) {
    const seed = normalizeRoadSeed(options.seed, "TEST-123");
    const speedClassId = normalizeSpeedClassId(options.speedClassId, DEFAULT_SPEED_CLASS_ID);
    const raceTypeId = normalizeRaceTypeId(options.raceTypeId || options.raceType, DEFAULT_RACE_TYPE_ID);
    const alternateSeed = normalizeRoadSeed(options.alternateSeed, seed === "TEST-456" ? "TEST-789" : "TEST-456");
    const alternateMode = speedClassId === "turbo" ? "arcade" : "turbo";
    const alternateRaceType = raceTypeId === FUEL_RUN_RACE_TYPE_ID ? DEFAULT_RACE_TYPE_ID : FUEL_RUN_RACE_TYPE_ID;
    const waveLimit = options.waveLimit || 10;
    const first = this.captureRoadDirectorSequence({ seed, speedClassId, raceTypeId, waveLimit });
    const repeat = this.captureRoadDirectorSequence({ seed, speedClassId, raceTypeId, waveLimit });
    const changedSeed = this.captureRoadDirectorSequence({ seed: alternateSeed, speedClassId, raceTypeId, waveLimit });
    const changedMode = this.captureRoadDirectorSequence({ seed, speedClassId: alternateMode, raceTypeId, waveLimit });
    const changedRaceType = this.captureRoadDirectorSequence({ seed, speedClassId, raceTypeId: alternateRaceType, waveLimit });
    const firstFingerprint = this.getRoadDirectorSequenceFingerprint(first.sequence);
    const repeatFingerprint = this.getRoadDirectorSequenceFingerprint(repeat.sequence);
    const changedSeedFingerprint = this.getRoadDirectorSequenceFingerprint(changedSeed.sequence);
    const changedModeFingerprint = this.getRoadDirectorSequenceFingerprint(changedMode.sequence);
    const changedRaceTypeFingerprint = this.getRoadDirectorSequenceFingerprint(changedRaceType.sequence);
    const summary = {
      seed,
      alternateSeed,
      speedClassId,
      raceTypeId,
      alternateMode,
      alternateRaceType,
      waveLimit,
      seedHash: first.seedHash,
      sameSeedMatches: firstFingerprint === repeatFingerprint,
      differentSeedChanges: firstFingerprint !== changedSeedFingerprint,
      differentModeChanges: firstFingerprint !== changedModeFingerprint,
      differentRaceTypeChanges: firstFingerprint !== changedRaceTypeFingerprint,
      first,
      repeat,
      changedSeed,
      changedMode,
      changedRaceType,
      pass: firstFingerprint === repeatFingerprint
        && firstFingerprint !== changedSeedFingerprint
        && firstFingerprint !== changedModeFingerprint
        && firstFingerprint !== changedRaceTypeFingerprint
    };
    this.seedDeterminismStatus = summary;
    if (options.show !== false) {
      this.showSeedDeterminismReport(summary);
    }
    return summary;
  }

  async runSpawnSafetySimulationCore(options = {}) {
    const runsPerSpeedClass = options.runs || 1000;
    const speedClassIds = Array.isArray(options.speedClassIds) && options.speedClassIds.length
      ? options.speedClassIds.map((id) => normalizeSpeedClassId(id)).filter((id, index, list) => list.indexOf(id) === index)
      : SPEED_CLASSES.map((speedClass) => speedClass.id);
    const runs = runsPerSpeedClass * speedClassIds.length;
    const baseSeed = options.seed || "sunset-highway-spawn-safety-v1";
    const raceTypeId = normalizeRaceTypeId(options.raceTypeId || options.raceType, DEFAULT_RACE_TYPE_ID);
    const fuelRun = isFuelRunRaceType(raceTypeId);
    const track = TRACKS[0];
    const dt = options.dt || 0.4;
    const pressureCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let pressureSamples = 0;
    let totalSamples = 0;
    let invalidWalls = 0;
    let maxBlocked = 0;
    let worstPressure = null;
    let preventedUnsafeSpawns = 0;
    let sameLaneOverlaps = 0;
    let boostObjectOverlaps = 0;
    let rampObjectOverlaps = 0;
    let gasCanOverlaps = 0;
    let minSameLaneSpacing = Infinity;
    let spacingSum = 0;
    let spacingSamples = 0;
    let gasCansSpawnedSum = 0;
    let gasCanMaxGapSum = 0;
    let longestNoFuelStretch = 0;
    let simulatedOutOfFuelRuns = 0;
    let ignoringGasOutOfFuelRuns = 0;
    const fuelOpportunitiesBySection = {};
    const invalidExamples = [];
    const overlapExamples = [];
    const perSpeedClass = {};
    const directorTotals = createDirectorAggregate();
    let completedRuns = 0;

    function createDirectorAggregate() {
      return {
        totalWaves: 0,
        nonOpeningWaves: 0,
        centerBlockedWaves: 0,
        nonOpeningCenterBlockedWaves: 0,
        blockedLaneSum: 0,
        repeatedPatternCount: 0,
        hardWaveCount: 0,
        recoveryWaveCount: 0,
        meaningfulWaveCount: 0,
        rampUsefulCount: 0,
        fairnessFailures: 0,
        pressureBudgetFailures: 0,
        movementGapCount: 0,
        movementGapSum: 0,
        centerChallengeGapCount: 0,
        centerChallengeGapSum: 0,
        waveGapCount: 0,
        waveGapSum: 0,
        meaningfulWaveGapCount: 0,
        meaningfulWaveGapSum: 0,
        gasCanGapCount: 0,
        gasCanGapSum: 0,
        longestGasCanGapSeconds: 0,
        longestCenterSafeSeconds: 0,
        longestWaveGapSeconds: 0,
        longestMeaningfulWaveGapSeconds: 0,
        longestActiveEmptySeconds: 0,
        pressureBudgetSum: 0,
        pressureSum: 0,
        pressureCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        waveCounts: {},
        boostLaneCounts: Array(LANES).fill(0),
        rampLaneCounts: Array(LANES).fill(0),
        gasCanLaneCounts: Array(LANES).fill(0),
        fuelPatternCounts: {},
        obstacleTypeCounts: {},
        longestLaneSafeSeconds: Array(LANES).fill(0),
        sectionStats: {}
      };
    }

    function mergeCountMap(target, source) {
      Object.entries(source || {}).forEach(([key, value]) => {
        target[key] = (target[key] || 0) + value;
      });
    }

    function mergeLaneCounts(target, source) {
      for (let i = 0; i < LANES; i += 1) {
        target[i] += source?.[i] || 0;
      }
    }

    function createSectionAggregate(section = FALLBACK_TRACK_SECTION) {
      return {
        id: section.id || FALLBACK_TRACK_SECTION.id,
        label: section.label || section.id || FALLBACK_TRACK_SECTION.label,
        totalWaves: 0,
        centerBlockedWaves: 0,
        blockedLaneSum: 0,
        hardWaveCount: 0,
        recoveryWaveCount: 0,
        meaningfulWaveCount: 0,
        fairnessFailures: 0,
        pressureBudgetFailures: 0,
        pressureSum: 0,
        pressureBudgetSum: 0,
        waveGapCount: 0,
        waveGapSum: 0,
        meaningfulWaveGapCount: 0,
        meaningfulWaveGapSum: 0,
        longestActiveEmptySeconds: 0,
        gasCanCount: 0,
        fuelPatternCounts: {},
        pressureCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        waveCounts: {}
      };
    }

    function ensureSectionAggregate(target, section = FALLBACK_TRACK_SECTION) {
      const id = section.id || FALLBACK_TRACK_SECTION.id;
      if (!target[id]) target[id] = createSectionAggregate(section);
      return target[id];
    }

    function mergeSectionAggregate(target, source) {
      target.totalWaves += source.totalWaves || 0;
      target.centerBlockedWaves += source.centerBlockedWaves || 0;
      target.blockedLaneSum += source.blockedLaneSum || 0;
      target.hardWaveCount += source.hardWaveCount || 0;
      target.recoveryWaveCount += source.recoveryWaveCount || 0;
      target.meaningfulWaveCount += source.meaningfulWaveCount || 0;
      target.fairnessFailures += source.fairnessFailures || 0;
      target.pressureBudgetFailures += source.pressureBudgetFailures || 0;
      target.pressureSum += source.pressureSum || 0;
      target.pressureBudgetSum += source.pressureBudgetSum || 0;
      target.waveGapCount += source.waveGapCount || 0;
      target.waveGapSum += source.waveGapSum || 0;
      target.meaningfulWaveGapCount += source.meaningfulWaveGapCount || 0;
      target.meaningfulWaveGapSum += source.meaningfulWaveGapSum || 0;
      target.longestActiveEmptySeconds = Math.max(target.longestActiveEmptySeconds, source.longestActiveEmptySeconds || 0);
      target.gasCanCount += source.gasCanCount || 0;
      mergeCountMap(target.pressureCounts, source.pressureCounts);
      mergeCountMap(target.waveCounts, source.waveCounts);
      mergeCountMap(target.fuelPatternCounts, source.fuelPatternCounts);
    }

    function mergeSectionStats(target, source = {}) {
      Object.entries(source || {}).forEach(([id, sourceStats]) => {
        const targetStats = ensureSectionAggregate(target, {
          id,
          label: sourceStats.label || id
        });
        mergeSectionAggregate(targetStats, sourceStats);
      });
    }

    function finalizeSectionStats(map = {}) {
      const sections = getTrackSections(track);
      return Object.fromEntries(sections.map((section) => {
        const stats = map[section.id] || createSectionAggregate(section);
        return [section.id, {
          id: section.id,
          label: section.label,
          totalWaves: stats.totalWaves,
          averagePressure: stats.totalWaves ? stats.pressureSum / stats.totalWaves : 0,
          averagePressureBudget: stats.totalWaves ? stats.pressureBudgetSum / stats.totalWaves : 0,
          averageBlockedLanesPerWave: stats.totalWaves ? stats.blockedLaneSum / stats.totalWaves : 0,
          centerBlockedPercent: stats.totalWaves ? stats.centerBlockedWaves / stats.totalWaves : 0,
          hardWavePercent: stats.totalWaves ? stats.hardWaveCount / stats.totalWaves : 0,
          recoveryWavePercent: stats.totalWaves ? stats.recoveryWaveCount / stats.totalWaves : 0,
          meaningfulWavePercent: stats.totalWaves ? stats.meaningfulWaveCount / stats.totalWaves : 0,
          gasCanCount: stats.gasCanCount || 0,
          fuelPatternCounts: { ...(stats.fuelPatternCounts || {}) },
          longestActiveEmptySeconds: stats.longestActiveEmptySeconds,
          averageWaveGapSeconds: stats.waveGapCount ? stats.waveGapSum / stats.waveGapCount : null,
          averageMeaningfulWaveGapSeconds: stats.meaningfulWaveGapCount ? stats.meaningfulWaveGapSum / stats.meaningfulWaveGapCount : null,
          pressureCounts: { ...stats.pressureCounts },
          waveCounts: { ...stats.waveCounts },
          topWaveCounts: topCountList(stats.waveCounts, 5)
        }];
      }));
    }

    function createSectionSafetyStats(section = FALLBACK_TRACK_SECTION) {
      return {
        id: section.id || FALLBACK_TRACK_SECTION.id,
        label: section.label || section.id || FALLBACK_TRACK_SECTION.label,
        invalidWalls: 0,
        sameLaneOverlaps: 0,
        boostObjectOverlaps: 0,
        rampObjectOverlaps: 0,
        gasCanOverlaps: 0,
        maxBlocked: 0
      };
    }

    function ensureSectionSafety(target, section = FALLBACK_TRACK_SECTION) {
      const id = section.id || FALLBACK_TRACK_SECTION.id;
      if (!target[id]) target[id] = createSectionSafetyStats(section);
      return target[id];
    }

    function finalizeSectionSafety(map = {}) {
      return Object.fromEntries(getTrackSections(track).map((section) => {
        const stats = map[section.id] || createSectionSafetyStats(section);
        return [section.id, { ...stats, id: section.id, label: section.label }];
      }));
    }

    function mergeDirectorStats(target, stats) {
      target.totalWaves += stats.totalWaves;
      target.nonOpeningWaves += stats.nonOpeningWaves;
      target.centerBlockedWaves += stats.centerBlockedWaves;
      target.nonOpeningCenterBlockedWaves += stats.nonOpeningCenterBlockedWaves;
      target.blockedLaneSum += stats.blockedLaneSum;
      target.repeatedPatternCount += stats.repeatedPatternCount;
      target.hardWaveCount += stats.hardWaveCount;
      target.recoveryWaveCount += stats.recoveryWaveCount;
      target.meaningfulWaveCount += stats.meaningfulWaveCount;
      target.rampUsefulCount += stats.rampUsefulCount;
      target.fairnessFailures += stats.fairnessFailures;
      target.pressureBudgetFailures += stats.pressureBudgetFailures;
      target.movementGapCount += stats.movementGapCount;
      target.movementGapSum += stats.movementGapSum;
      target.centerChallengeGapCount += stats.centerChallengeGapCount;
      target.centerChallengeGapSum += stats.centerChallengeGapSum;
      target.waveGapCount += stats.waveGapCount;
      target.waveGapSum += stats.waveGapSum;
      target.meaningfulWaveGapCount += stats.meaningfulWaveGapCount;
      target.meaningfulWaveGapSum += stats.meaningfulWaveGapSum;
      target.gasCanGapCount += stats.gasCanGapCount || 0;
      target.gasCanGapSum += stats.gasCanGapSum || 0;
      target.longestGasCanGapSeconds = Math.max(target.longestGasCanGapSeconds, stats.longestGasCanGapSeconds || 0);
      target.longestCenterSafeSeconds = Math.max(target.longestCenterSafeSeconds, stats.longestCenterSafeSeconds);
      target.longestWaveGapSeconds = Math.max(target.longestWaveGapSeconds, stats.longestWaveGapSeconds);
      target.longestMeaningfulWaveGapSeconds = Math.max(target.longestMeaningfulWaveGapSeconds, stats.longestMeaningfulWaveGapSeconds);
      target.longestActiveEmptySeconds = Math.max(target.longestActiveEmptySeconds, stats.longestActiveEmptySeconds);
      target.pressureBudgetSum += stats.pressureBudgetSum;
      target.pressureSum += stats.pressureSum || 0;
      mergeCountMap(target.pressureCounts, stats.pressureCounts);
      mergeCountMap(target.waveCounts, stats.waveCounts);
      mergeCountMap(target.obstacleTypeCounts, stats.obstacleTypeCounts);
      mergeCountMap(target.fuelPatternCounts, stats.fuelPatternCounts);
      mergeLaneCounts(target.boostLaneCounts, stats.boostLaneCounts);
      mergeLaneCounts(target.rampLaneCounts, stats.rampLaneCounts);
      mergeLaneCounts(target.gasCanLaneCounts, stats.gasCanLaneCounts);
      mergeSectionStats(target.sectionStats, stats.sectionStats);
      for (let i = 0; i < LANES; i += 1) {
        target.longestLaneSafeSeconds[i] = Math.max(target.longestLaneSafeSeconds[i], stats.longestLaneSafeSeconds?.[i] || 0);
      }
    }

    function topCountList(counts, limit = 6) {
      return Object.entries(counts || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
    }

    function finalizeDirectorStats(aggregate) {
      const boostTotal = aggregate.boostLaneCounts.reduce((sum, count) => sum + count, 0);
      const rampTotal = aggregate.rampLaneCounts.reduce((sum, count) => sum + count, 0);
      const gasTotal = aggregate.gasCanLaneCounts.reduce((sum, count) => sum + count, 0);
      return {
        totalWaves: aggregate.totalWaves,
        nonOpeningWaves: aggregate.nonOpeningWaves,
        averageBlockedLanesPerWave: aggregate.totalWaves ? aggregate.blockedLaneSum / aggregate.totalWaves : 0,
        centerBlockedPercent: aggregate.totalWaves ? aggregate.centerBlockedWaves / aggregate.totalWaves : 0,
        nonOpeningCenterBlockedPercent: aggregate.nonOpeningWaves ? aggregate.nonOpeningCenterBlockedWaves / aggregate.nonOpeningWaves : 0,
        longestCenterSafeSeconds: aggregate.longestCenterSafeSeconds,
        averageDecisionGapSeconds: aggregate.movementGapCount ? aggregate.movementGapSum / aggregate.movementGapCount : null,
        averageCenterChallengeGapSeconds: aggregate.centerChallengeGapCount ? aggregate.centerChallengeGapSum / aggregate.centerChallengeGapCount : null,
        averageWaveGapSeconds: aggregate.waveGapCount ? aggregate.waveGapSum / aggregate.waveGapCount : null,
        averageMeaningfulWaveGapSeconds: aggregate.meaningfulWaveGapCount ? aggregate.meaningfulWaveGapSum / aggregate.meaningfulWaveGapCount : null,
        averageGasCanGapSeconds: aggregate.gasCanGapCount ? aggregate.gasCanGapSum / aggregate.gasCanGapCount : null,
        longestGasCanGapSeconds: aggregate.longestGasCanGapSeconds,
        longestWaveGapSeconds: aggregate.longestWaveGapSeconds,
        longestMeaningfulWaveGapSeconds: aggregate.longestMeaningfulWaveGapSeconds,
        longestActiveEmptySeconds: aggregate.longestActiveEmptySeconds,
        repeatedPatternPercent: aggregate.totalWaves ? aggregate.repeatedPatternCount / aggregate.totalWaves : 0,
        hardWavePercent: aggregate.totalWaves ? aggregate.hardWaveCount / aggregate.totalWaves : 0,
        recoveryWavePercent: aggregate.totalWaves ? aggregate.recoveryWaveCount / aggregate.totalWaves : 0,
        meaningfulWavePercent: aggregate.totalWaves ? aggregate.meaningfulWaveCount / aggregate.totalWaves : 0,
        rampUsefulPercent: aggregate.rampLaneCounts.reduce((sum, count) => sum + count, 0)
          ? aggregate.rampUsefulCount / aggregate.rampLaneCounts.reduce((sum, count) => sum + count, 0)
          : 0,
        fairnessFailures: aggregate.fairnessFailures,
        pressureBudgetFailures: aggregate.pressureBudgetFailures,
        pressureCounts: { ...aggregate.pressureCounts },
        waveCounts: { ...aggregate.waveCounts },
        boostLaneCounts: aggregate.boostLaneCounts.slice(),
        rampLaneCounts: aggregate.rampLaneCounts.slice(),
        gasCanLaneCounts: aggregate.gasCanLaneCounts.slice(),
        boostLaneDistribution: aggregate.boostLaneCounts.map((count) => boostTotal ? count / boostTotal : 0),
        rampLaneDistribution: aggregate.rampLaneCounts.map((count) => rampTotal ? count / rampTotal : 0),
        gasCanLaneDistribution: aggregate.gasCanLaneCounts.map((count) => gasTotal ? count / gasTotal : 0),
        topWaveCounts: topCountList(aggregate.waveCounts, 8),
        topFuelPatterns: topCountList(aggregate.fuelPatternCounts, 8),
        topObstacleTypes: topCountList(aggregate.obstacleTypeCounts, 8),
        fuelPatternCounts: { ...aggregate.fuelPatternCounts },
        obstacleTypeCounts: { ...aggregate.obstacleTypeCounts },
        averagePressureBudget: aggregate.totalWaves ? aggregate.pressureBudgetSum / aggregate.totalWaves : 0,
        averagePressure: aggregate.totalWaves ? aggregate.pressureSum / aggregate.totalWaves : 0,
        longestLaneSafeSeconds: aggregate.longestLaneSafeSeconds.slice(),
        sectionStats: finalizeSectionStats(aggregate.sectionStats)
      };
    }

    for (const speedClassId of speedClassIds) {
      const speedClass = getSpeedClassConfig(speedClassId);
      perSpeedClass[speedClassId] = {
        label: speedClass.label,
        invalidWalls: 0,
        maxBlocked: 0,
        sameLaneOverlaps: 0,
        boostObjectOverlaps: 0,
        rampObjectOverlaps: 0,
        gasCanOverlaps: 0,
        gasCansSpawnedSum: 0,
        gasCanMaxGapSum: 0,
        longestNoFuelStretch: 0,
        simulatedOutOfFuelRuns: 0,
        ignoringGasOutOfFuelRuns: 0,
        fuelOpportunitiesBySection: {},
        minSameLaneSpacing: Infinity,
        spacingSum: 0,
        spacingSamples: 0,
        pressureCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        sectionSafety: {},
        director: createDirectorAggregate()
      };

      for (let runIndex = 0; runIndex < runsPerSpeedClass; runIndex += 1) {
        const seed = `${baseSeed}:${raceTypeId}:${speedClassId}:${runIndex}`;
        const rng = createSeededRandom(seed);
        const simRun = {
          track,
          speedClassId,
          speedClass,
          raceTypeId,
          raceType: getRaceTypeConfig(raceTypeId),
          distance: 0,
          elapsed: 0,
          currentSpeed: getTrackCruiseSpeed(track, 0, speedClassId)
        };
        this.configureFuelForRun(simRun);
        simRun.simulateFuelPickups = fuelRun;
        const simGame = {
          run: simRun,
          renderer: this.renderer,
          randomFloat: rng
        };
        const manager = new ObstacleManager(simGame);
        manager.reset(track);

        while (simRun.distance < track.distanceToFinish) {
          const progress = clamp(simRun.distance / track.distanceToFinish, 0, 1);
          const section = getTrackSection(track, progress);
          const sectionSafety = ensureSectionSafety(perSpeedClass[speedClassId].sectionSafety, section);
          simRun.currentSpeed = getTrackCruiseSpeed(track, progress, speedClassId);
          if (fuelRun) {
            this.updateFuelRunSimulationState(simRun, dt);
          }
          simRun.distance += simRun.currentSpeed * dt;
          simRun.elapsed += dt;
          manager.update(dt);

          const occupancy = manager.getDangerZoneLaneOccupancy(manager.obstacles, simRun.distance);
          totalSamples += 1;
          const blocked = clamp(occupancy.maxBlocked, 0, 5);
          if (blocked > 0) {
            pressureSamples += 1;
            pressureCounts[blocked] += 1;
            perSpeedClass[speedClassId].pressureCounts[blocked] += 1;
          }
          if (blocked > maxBlocked) {
            maxBlocked = blocked;
            worstPressure = this.capturePressureExample(runIndex, seed, simRun, occupancy);
          }
          if (blocked > perSpeedClass[speedClassId].maxBlocked) {
            perSpeedClass[speedClassId].maxBlocked = blocked;
          }
          sectionSafety.maxBlocked = Math.max(sectionSafety.maxBlocked, blocked);
          if (occupancy.invalid) {
            invalidWalls += 1;
            perSpeedClass[speedClassId].invalidWalls += 1;
            sectionSafety.invalidWalls += 1;
            const example = this.capturePressureExample(runIndex, seed, simRun, occupancy);
            if (invalidExamples.length < 8) invalidExamples.push(example);
            if (invalidWalls <= 8) {
              console.warn("Neon Road Rally spawn safety wall", example);
            }
          }

          const overlaps = manager.findGameplayOverlaps(manager.obstacles, simRun.distance);
          if (overlaps.length) {
            const sameLaneCount = overlaps.filter((overlap) => overlap.sameLane).length;
            const boostCount = overlaps.filter((overlap) => overlap.boostOverlap).length;
            const rampCount = overlaps.filter((overlap) => overlap.rampOverlap).length;
            const gasCount = overlaps.filter((overlap) => overlap.gasCanOverlap).length;
            sameLaneOverlaps += sameLaneCount;
            boostObjectOverlaps += boostCount;
            rampObjectOverlaps += rampCount;
            gasCanOverlaps += gasCount;
            perSpeedClass[speedClassId].sameLaneOverlaps += sameLaneCount;
            perSpeedClass[speedClassId].boostObjectOverlaps += boostCount;
            perSpeedClass[speedClassId].rampObjectOverlaps += rampCount;
            perSpeedClass[speedClassId].gasCanOverlaps += gasCount;
            sectionSafety.sameLaneOverlaps += sameLaneCount;
            sectionSafety.boostObjectOverlaps += boostCount;
            sectionSafety.rampObjectOverlaps += rampCount;
            sectionSafety.gasCanOverlaps += gasCount;
            if (overlapExamples.length < 8) {
              overlapExamples.push(this.captureOverlapExample(runIndex, seed, simRun, overlaps));
            }
          }

          const spacing = manager.getObjectSpacingStats(manager.obstacles);
          if (spacing.count > 0) {
            if (spacing.minSpacing !== null) {
              minSameLaneSpacing = Math.min(minSameLaneSpacing, spacing.minSpacing);
              perSpeedClass[speedClassId].minSameLaneSpacing = Math.min(perSpeedClass[speedClassId].minSameLaneSpacing, spacing.minSpacing);
            }
            if (spacing.averageSpacing !== null) {
              spacingSum += spacing.averageSpacing;
              spacingSamples += 1;
              perSpeedClass[speedClassId].spacingSum += spacing.averageSpacing;
              perSpeedClass[speedClassId].spacingSamples += 1;
            }
          }
        }
        preventedUnsafeSpawns += manager.preventedUnsafeSpawns;
        const directorStats = manager.director.getSimulationStats();
        mergeDirectorStats(directorTotals, directorStats);
        mergeDirectorStats(perSpeedClass[speedClassId].director, directorStats);
        if (fuelRun) {
          const gasSpawned = Math.max(0, Math.round(simRun.gasCansSpawned || 0));
          const maxGasGap = Math.max(simRun.maxTimeBetweenGasCans || 0, simRun.timeSinceLastGasCan || 0);
          gasCansSpawnedSum += gasSpawned;
          gasCanMaxGapSum += maxGasGap;
          longestNoFuelStretch = Math.max(longestNoFuelStretch, simRun.longestNoFuelStretchSeconds || maxGasGap);
          perSpeedClass[speedClassId].gasCansSpawnedSum += gasSpawned;
          perSpeedClass[speedClassId].gasCanMaxGapSum += maxGasGap;
          perSpeedClass[speedClassId].longestNoFuelStretch = Math.max(perSpeedClass[speedClassId].longestNoFuelStretch, simRun.longestNoFuelStretchSeconds || maxGasGap);
          if (simRun.simOutOfFuel) {
            simulatedOutOfFuelRuns += 1;
            perSpeedClass[speedClassId].simulatedOutOfFuelRuns += 1;
          }
          const tuning = getFuelRunTuning(speedClassId);
          if (tuning.fuelMax - tuning.fuelDrainPerSecond * simRun.elapsed <= 0) {
            ignoringGasOutOfFuelRuns += 1;
            perSpeedClass[speedClassId].ignoringGasOutOfFuelRuns += 1;
          }
          Object.entries(simRun.fuelOpportunitiesBySection || {}).forEach(([sectionId, count]) => {
            fuelOpportunitiesBySection[sectionId] = (fuelOpportunitiesBySection[sectionId] || 0) + count;
            perSpeedClass[speedClassId].fuelOpportunitiesBySection[sectionId] = (perSpeedClass[speedClassId].fuelOpportunitiesBySection[sectionId] || 0) + count;
          });
        }
        completedRuns += 1;

        if (completedRuns > 0 && completedRuns % 25 === 0) {
          if (typeof options.onProgress === "function") {
            options.onProgress(completedRuns, runs);
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }

    const frequencies = {};
    [1, 2, 3, 4].forEach((blocked) => {
      frequencies[blocked] = {
        count: pressureCounts[blocked],
        pressurePercent: pressureSamples ? pressureCounts[blocked] / pressureSamples : 0,
        samplePercent: totalSamples ? pressureCounts[blocked] / totalSamples : 0
      };
    });
    const fourLaneRare = pressureSamples > 0 && frequencies[4].pressurePercent < 0.08;
    const twoThreeCommon = pressureCounts[2] + pressureCounts[3] >= pressureCounts[1];
    const director = finalizeDirectorStats(directorTotals);

    Object.values(perSpeedClass).forEach((item) => {
      item.averageSpacing = item.spacingSamples ? item.spacingSum / item.spacingSamples : null;
      item.minSameLaneSpacing = Number.isFinite(item.minSameLaneSpacing) ? item.minSameLaneSpacing : null;
      item.averageGasCansSpawned = fuelRun ? item.gasCansSpawnedSum / Math.max(1, runsPerSpeedClass) : 0;
      item.averageMaxTimeBetweenGasCans = fuelRun ? item.gasCanMaxGapSum / Math.max(1, runsPerSpeedClass) : null;
      item.simulatedOutOfFuelRisk = fuelRun ? item.simulatedOutOfFuelRuns / Math.max(1, runsPerSpeedClass) : 0;
      item.ignoringGasOutOfFuelRisk = fuelRun ? item.ignoringGasOutOfFuelRuns / Math.max(1, runsPerSpeedClass) : 0;
      item.director = finalizeDirectorStats(item.director);
      item.sectionSafety = finalizeSectionSafety(item.sectionSafety);
      delete item.spacingSum;
      delete item.spacingSamples;
    });

    const modeIntensityChecks = {
      sundayPlayable: true,
      sundayGentle: true,
      rookieApproachable: true,
      arcadeTwoThreeCommon: true,
      arcadeNoDeadAir: true,
      proTurboThreeLaneFrequent: true,
      fourLaneOnlyHighModes: true,
      centerNotSafeLong: true
    };
    const sectionShapeChecks = {
      finalPushMoreIntenseThanGroove: true,
      breatherCalmerThanPressure: true,
      breatherNotEmpty: true
    };
    for (const id of speedClassIds) {
      const item = perSpeedClass[id];
      const stats = item.director;
      const sections = stats.sectionStats || {};
      const groove = sections.groove || {};
      const pressure = sections.pressure || {};
      const breather = sections.breather || {};
      const finalPush = sections.finalPush || {};
      if ((groove.totalWaves || 0) > 0 && (finalPush.totalWaves || 0) > 0) {
        sectionShapeChecks.finalPushMoreIntenseThanGroove = sectionShapeChecks.finalPushMoreIntenseThanGroove
          && finalPush.averagePressure > groove.averagePressure * 1.04;
      } else {
        sectionShapeChecks.finalPushMoreIntenseThanGroove = false;
      }
      if ((pressure.totalWaves || 0) > 0 && (breather.totalWaves || 0) > 0) {
        sectionShapeChecks.breatherCalmerThanPressure = sectionShapeChecks.breatherCalmerThanPressure
          && breather.averagePressure < pressure.averagePressure * 0.94;
        sectionShapeChecks.breatherNotEmpty = sectionShapeChecks.breatherNotEmpty
          && (breather.meaningfulWavePercent || 0) >= 0.45;
      } else {
        sectionShapeChecks.breatherCalmerThanPressure = false;
        sectionShapeChecks.breatherNotEmpty = false;
      }
      const wavePressureTotal = Math.max(1, (stats.pressureCounts[1] || 0) + (stats.pressureCounts[2] || 0) + (stats.pressureCounts[3] || 0) + (stats.pressureCounts[4] || 0));
      const highPressurePercent = ((stats.pressureCounts[3] || 0) + (stats.pressureCounts[4] || 0)) / wavePressureTotal;
      const twoThreePressurePercent = ((stats.pressureCounts[2] || 0) + (stats.pressureCounts[3] || 0)) / wavePressureTotal;
      item.highPressurePercent = highPressurePercent;
      item.twoThreePressurePercent = twoThreePressurePercent;
      if (id === "sunday") {
        modeIntensityChecks.sundayGentle = highPressurePercent <= 0.28
          && (stats.pressureCounts[4] || 0) === 0
          && (stats.averageMeaningfulWaveGapSeconds || Infinity) <= 3.4;
      }
      if (id === "rookie") {
        modeIntensityChecks.rookieApproachable = highPressurePercent <= 0.42
          && (stats.pressureCounts[4] || 0) === 0
          && twoThreePressurePercent >= 0.55;
      }
      if (id === "arcade") {
        modeIntensityChecks.arcadeTwoThreeCommon = twoThreePressurePercent >= 0.62
          && highPressurePercent >= 0.28;
        modeIntensityChecks.arcadeNoDeadAir = (stats.averageMeaningfulWaveGapSeconds || Infinity) <= 2.15
          && stats.longestActiveEmptySeconds <= 4.8;
      }
      if (id === "pro" || id === "turbo") {
        const target = id === "turbo" ? 0.28 : 0.22;
        modeIntensityChecks.proTurboThreeLaneFrequent = modeIntensityChecks.proTurboThreeLaneFrequent && highPressurePercent >= target;
      }
      if (id !== "pro" && id !== "turbo") {
        modeIntensityChecks.fourLaneOnlyHighModes = modeIntensityChecks.fourLaneOnlyHighModes && (stats.pressureCounts[4] || 0) === 0;
      }
      const centerLimit = id === "turbo" ? 4.2 : (id === "pro" ? 5.2 : (id === "arcade" ? 7.2 : 10.5));
      modeIntensityChecks.centerNotSafeLong = modeIntensityChecks.centerNotSafeLong
        && (stats.averageCenterChallengeGapSeconds === null || stats.averageCenterChallengeGapSeconds <= centerLimit);
    }

    const directorTwoThreeCommon = (director.pressureCounts[2] || 0) + (director.pressureCounts[3] || 0) >= (director.pressureCounts[1] || 0);
    const centerChallengedRegularly = director.nonOpeningCenterBlockedPercent >= 0.28;
    const boostNotMostlyCenter = (director.boostLaneDistribution[TRACK_DIRECTOR.centerLane] || 0) <= 0.34;
    const repeatedPatternsControlled = fuelRun || director.repeatedPatternPercent <= 0.18;
    const directorFairnessPassed = director.fairnessFailures === 0;
    const directorPressureBudgetPassed = fuelRun || director.pressureBudgetFailures === 0;
    const trafficObjectCount = ["slowCar", "fastCar", "truck", "barrier"].reduce((sum, type) => sum + (director.obstacleTypeCounts?.[type] || 0), 0);
    const supportObjectCount = ["ramp", "boostPad"].reduce((sum, type) => sum + (director.obstacleTypeCounts?.[type] || 0), 0);
    const minorHazardCount = ["cone", "oil", "deer", "branch"].reduce((sum, type) => sum + (director.obstacleTypeCounts?.[type] || 0), 0);
    const pressureObjectCount = trafficObjectCount + supportObjectCount + minorHazardCount;
    const fuelRunObjectMix = {
      trafficPercent: pressureObjectCount ? trafficObjectCount / pressureObjectCount : 0,
      supportPercent: pressureObjectCount ? supportObjectCount / pressureObjectCount : 0,
      minorHazardPercent: pressureObjectCount ? minorHazardCount / pressureObjectCount : 0
    };
    const averageGasCansSpawned = fuelRun ? gasCansSpawnedSum / Math.max(1, runs) : 0;
    const averageMaxTimeBetweenGasCans = fuelRun ? gasCanMaxGapSum / Math.max(1, runs) : null;
    const fuelOpportunitiesSufficient = !fuelRun || Object.values(perSpeedClass).every((item) => item.averageGasCansSpawned >= 3.2 && (item.averageMaxTimeBetweenGasCans || 0) <= 28);
    const fuelNotFreeCenter = !fuelRun || (director.gasCanLaneDistribution?.[TRACK_DIRECTOR.centerLane] || 0) <= 0.42;
    const fuelObjectMixPassed = !fuelRun || (fuelRunObjectMix.trafficPercent >= 0.68 && fuelRunObjectMix.supportPercent >= 0.06 && fuelRunObjectMix.supportPercent <= 0.24 && fuelRunObjectMix.minorHazardPercent <= 0.1);
    const seedDeterminism = this.runSeedDeterminismTest({
      seed: "SECTION-TEST",
      speedClassId: DEFAULT_SPEED_CLASS_ID,
      raceTypeId,
      waveLimit: 18,
      show: false
    });
    const effectiveSectionShapeChecks = fuelRun
      ? {
        finalPushMoreIntenseThanGroove: true,
        breatherCalmerThanPressure: true,
        breatherNotEmpty: true
      }
      : sectionShapeChecks;
    const pass = invalidWalls === 0
      && maxBlocked <= 4
      && sameLaneOverlaps === 0
      && boostObjectOverlaps === 0
      && rampObjectOverlaps === 0
      && gasCanOverlaps === 0
      && (!fuelRun || fuelOpportunitiesSufficient)
      && (!fuelRun || fuelNotFreeCenter)
      && (!fuelRun || fuelObjectMixPassed)
      && (!fuelRun || averageGasCansSpawned >= 3.2)
      && (fuelRun || pressureCounts[4] > 0)
      && (fuelRun || fourLaneRare)
      && (fuelRun || directorTwoThreeCommon)
      && (fuelRun || centerChallengedRegularly)
      && boostNotMostlyCenter
      && repeatedPatternsControlled
      && directorFairnessPassed
      && (fuelRun || directorPressureBudgetPassed)
      && (fuelRun || modeIntensityChecks.sundayPlayable)
      && (fuelRun || modeIntensityChecks.sundayGentle)
      && (fuelRun || modeIntensityChecks.rookieApproachable)
      && (fuelRun || modeIntensityChecks.arcadeTwoThreeCommon)
      && (fuelRun || modeIntensityChecks.arcadeNoDeadAir)
      && (fuelRun || modeIntensityChecks.proTurboThreeLaneFrequent)
      && (fuelRun || modeIntensityChecks.fourLaneOnlyHighModes)
      && (fuelRun || modeIntensityChecks.centerNotSafeLong)
      && effectiveSectionShapeChecks.finalPushMoreIntenseThanGroove
      && effectiveSectionShapeChecks.breatherCalmerThanPressure
      && effectiveSectionShapeChecks.breatherNotEmpty
      && seedDeterminism.pass;

    return {
      runs,
      seed: baseSeed,
      raceTypeId,
      raceTypeLabel: getRaceTypeLabel(raceTypeId),
      invalidWalls,
      sameLaneOverlaps,
      boostObjectOverlaps,
      rampObjectOverlaps,
      gasCanOverlaps,
      maxBlocked,
      pressureCounts,
      pressureSamples,
      totalSamples,
      frequencies,
      worstPressure,
      invalidExamples,
      overlapExamples,
      preventedUnsafeSpawns,
      averageObjectSpacing: spacingSamples ? spacingSum / spacingSamples : null,
      minSameLaneSpacing: Number.isFinite(minSameLaneSpacing) ? minSameLaneSpacing : null,
      averageGasCansSpawned,
      averageMaxTimeBetweenGasCans,
      longestNoFuelStretch,
      fuelOpportunitiesBySection,
      simulatedOutOfFuelRisk: fuelRun ? simulatedOutOfFuelRuns / Math.max(1, runs) : 0,
      ignoringGasOutOfFuelRisk: fuelRun ? ignoringGasOutOfFuelRuns / Math.max(1, runs) : 0,
      fuelRunObjectMix,
      trafficObjectCount,
      supportObjectCount,
      minorHazardCount,
      runsPerSpeedClass,
      speedClassIds,
      perSpeedClass,
      director,
      seedDeterminism,
      pass,
      passDetails: {
        zeroFiveLaneWalls: invalidWalls === 0,
        zeroSameLaneOverlaps: sameLaneOverlaps === 0,
        zeroBoostOverlaps: boostObjectOverlaps === 0,
        zeroRampOverlaps: rampObjectOverlaps === 0,
        zeroGasCanOverlaps: gasCanOverlaps === 0,
        maxAtMostFour: maxBlocked <= 4,
        fourLaneExists: pressureCounts[4] > 0,
        fourLaneRare,
        fuelOpportunitiesSufficient,
        fuelNotFreeCenter,
        fuelObjectMixPassed,
        twoThreeCommon,
        directorTwoThreeCommon,
        centerChallengedRegularly,
        boostNotMostlyCenter,
        repeatedPatternsControlled,
        directorFairnessPassed,
        directorPressureBudgetPassed,
        seededDeterminismPassed: seedDeterminism.pass,
        ...effectiveSectionShapeChecks,
        ...modeIntensityChecks
      }
    };
  }

  captureOverlapExample(runIndex, seed, simRun, overlaps) {
    return {
      runIndex,
      seed,
      speedClass: simRun.speedClassId || DEFAULT_SPEED_CLASS_ID,
      distance: Math.round(simRun.distance),
      time: Number(simRun.elapsed.toFixed(1)),
      overlaps: overlaps.slice(0, 6).map((overlap) => ({
        a: overlap.a.type,
        aLane: overlap.a.lane,
        aDistance: Math.round(overlap.a.distance),
        b: overlap.b.type,
        bLane: overlap.b.lane,
        bDistance: Math.round(overlap.b.distance),
        sameLane: overlap.sameLane,
        boostOverlap: overlap.boostOverlap,
        rampOverlap: overlap.rampOverlap,
        gap: Math.round(overlap.gap)
      }))
    };
  }

  capturePressureExample(runIndex, seed, simRun, occupancy) {
    const slice = occupancy.worstSlice || { y: 0, lanes: [], blockers: [] };
    return {
      runIndex,
      seed,
      speedClass: simRun.speedClassId || DEFAULT_SPEED_CLASS_ID,
      distance: Math.round(simRun.distance),
      time: Number(simRun.elapsed.toFixed(1)),
      maxBlocked: occupancy.maxBlocked,
      sliceY: Math.round(slice.y || 0),
      lanes: slice.lanes || [],
      blockers: (slice.blockers || []).slice(0, 12)
    };
  }

  showSeedDeterminismReport(summary) {
    this.setScreen("seedTest");
    this.audio.playMusic("title", false);
    const sequenceLine = (wave) => {
      const obstacleText = (wave.obstacles || [])
        .map((obstacle) => {
          const variant = obstacle.variant ? `:${obstacle.variant}` : "";
          return `${obstacle.type}${variant} L${obstacle.lane + 1}@${obstacle.distance}`;
        })
        .join(", ");
      return `${wave.index}. ${wave.sectionLabel || "Section"} ${wave.label} d${wave.distance}: ${obstacleText || "gap"}`;
    };
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel">
        <h2>Seed Determinism Test</h2>
        <div class="score-grid">
          <div class="score-card"><strong>Result</strong><span>${summary.pass ? "PASS" : "FAIL"}</span></div>
          <div class="score-card"><strong>Seed</strong><span>${escapeHtml(summary.seed)}</span></div>
          <div class="score-card"><strong>Race Type</strong><span>${escapeHtml(getRaceTypeLabel(summary.raceTypeId))}</span></div>
          <div class="score-card"><strong>Race Mode</strong><span>${escapeHtml(getSpeedClassLabel(summary.speedClassId))}</span></div>
          <div class="score-card"><strong>Seed Hash</strong><span>${summary.seedHash >>> 0}</span></div>
          <div class="score-card"><strong>Same Seed</strong><span>${summary.sameSeedMatches ? "MATCH" : "DIFF"}</span></div>
          <div class="score-card"><strong>Different Seed</strong><span>${summary.differentSeedChanges ? "CHANGED" : "SAME"}</span></div>
          <div class="score-card"><strong>Different Mode</strong><span>${summary.differentModeChanges ? "CHANGED" : "SAME"}</span></div>
          <div class="score-card"><strong>Different Type</strong><span>${summary.differentRaceTypeChanges ? "CHANGED" : "SAME"}</span></div>
          <div class="score-card"><strong>Waves Checked</strong><span>${summary.waveLimit}</span></div>
        </div>
        <p class="hint">First sequence: ${escapeHtml(summary.first.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
        <p class="hint">Changed-seed sequence: ${escapeHtml(summary.changedSeed.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
        <p class="hint">Changed-mode sequence: ${escapeHtml(summary.changedMode.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
        <p class="hint">Changed-type sequence: ${escapeHtml(summary.changedRaceType.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
        <div class="row" style="margin-top:16px">
          <button class="small-button" data-action="runSeedTest">Run Again</button>
          <button class="small-button" data-action="title">Back to Title</button>
        </div>
      </section>
    `;
    this.bindLayerButtons();
  }

  showSimulationRunning() {
    this.setScreen("simulation");
    const raceTypeId = normalizeRaceTypeId(this.simulationRaceTypeId || DEFAULT_RACE_TYPE_ID, DEFAULT_RACE_TYPE_ID);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel compact">
        <h2>Spawn Safety Simulation</h2>
        <p class="hint">Running 1,000 deterministic ${escapeHtml(getRaceTypeLabel(raceTypeId))} Sunset Highway generations for each speed class...</p>
        <p id="simProgress" class="status-line">Checking danger-zone lane occupancy with obstacle hitboxes.</p>
      </section>
    `;
  }

  updateSimulationProgress(completed, total) {
    const progress = document.getElementById("simProgress");
    if (progress) {
      progress.textContent = `${completed.toLocaleString()} / ${total.toLocaleString()} simulated runs checked.`;
    }
  }

  showSimulationReport(summary) {
    this.setScreen("simulation");
    const row = (blocked) => {
      const freq = summary.frequencies[blocked];
      return `
        <div class="score-card">
          <strong>${blocked}-Lane Pressure</strong>
          <span>${freq.count.toLocaleString()} · ${(freq.pressurePercent * 100).toFixed(1)}%</span>
        </div>
      `;
    };
    const worst = summary.worstPressure;
    const fmtPercent = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "n/a";
    const fmtSeconds = (value) => Number.isFinite(value) ? `${value.toFixed(1)}s` : "n/a";
    const speedClassSummary = (summary.speedClassIds || []).map((id) => {
      const item = summary.perSpeedClass[id];
      const minSpacing = item.minSameLaneSpacing === null ? "n/a" : `${Math.round(item.minSameLaneSpacing)}`;
      const centerPercent = item.director ? `${(item.director.nonOpeningCenterBlockedPercent * 100).toFixed(0)}% center` : "center n/a";
      const gap = item.director?.averageMeaningfulWaveGapSeconds;
      const empty = item.director?.longestActiveEmptySeconds;
      const highPressure = Number.isFinite(item.highPressurePercent) ? `${(item.highPressurePercent * 100).toFixed(0)}% 3/4-lane` : "3/4 n/a";
      const budgetFailures = item.director?.pressureBudgetFailures || 0;
      const fuelText = summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID
        ? `, gas ${item.averageGasCansSpawned.toFixed(1)}, gas max ${fmtSeconds(item.averageMaxTimeBetweenGasCans)}, no-fuel risk ${(item.simulatedOutOfFuelRisk * 100).toFixed(1)}%, ignore-gas ${(item.ignoringGasOutOfFuelRisk * 100).toFixed(0)}%`
        : "";
      return `${item.label}: ${item.invalidWalls} walls, ${item.sameLaneOverlaps} overlaps, max ${item.maxBlocked}, min gap ${minSpacing}, ${centerPercent}, ${fmtSeconds(gap)} meaningful, ${fmtSeconds(empty)} longest empty, ${highPressure}, budget misses ${budgetFailures}${fuelText}`;
    }).join(" · ");
    const averageSpacing = summary.averageObjectSpacing === null ? "n/a" : Math.round(summary.averageObjectSpacing).toLocaleString();
    const minSpacing = summary.minSameLaneSpacing === null ? "n/a" : Math.round(summary.minSameLaneSpacing).toLocaleString();
    const director = summary.director || {};
    const laneDistribution = (counts = [], distribution = []) => counts
      .map((count, lane) => `L${lane + 1} ${count.toLocaleString()} (${fmtPercent(distribution[lane] || 0)})`)
      .join(" · ");
    const topList = (items = []) => items.map((item) => `${item.name} ${item.count.toLocaleString()}`).join(" · ") || "none";
    const directorPressure = [1, 2, 3, 4].map((blocked) => {
      const count = director.pressureCounts?.[blocked] || 0;
      return `${blocked}-lane ${count.toLocaleString()}`;
    }).join(" · ");
    const sectionList = getTrackSections(TRACKS[0]);
    const sectionSummary = (summary.speedClassIds || []).map((id) => {
      const item = summary.perSpeedClass[id];
      const sectionText = sectionList.map((section) => {
        const stats = item.director?.sectionStats?.[section.id] || {};
        const safety = item.sectionSafety?.[section.id] || {};
        const overlaps = (safety.sameLaneOverlaps || 0) + (safety.boostObjectOverlaps || 0) + (safety.rampObjectOverlaps || 0);
        return `${section.label} ${stats.totalWaves || 0}w p${Number.isFinite(stats.averagePressure) ? stats.averagePressure.toFixed(2) : "0.00"} empty ${fmtSeconds(stats.longestActiveEmptySeconds)} center ${fmtPercent(stats.centerBlockedPercent)} walls ${safety.invalidWalls || 0} overlaps ${overlaps}`;
      }).join(" / ");
      return `${item.label}: ${sectionText}`;
    }).join(" | ");
    const sectionChecks = [
      `Final Push > Groove ${summary.passDetails.finalPushMoreIntenseThanGroove ? "yes" : "no"}`,
      `Breather < Pressure ${summary.passDetails.breatherCalmerThanPressure ? "yes" : "no"}`,
      `Breather not empty ${summary.passDetails.breatherNotEmpty ? "yes" : "no"}`,
      `seeded ${summary.passDetails.seededDeterminismPassed ? "yes" : "no"}`
    ].join(" · ");
    const overlapSummary = (summary.overlapExamples || []).length
      ? (summary.overlapExamples || []).slice(0, 4).map((example) => {
        const pairs = example.overlaps.map((overlap) => {
          const flags = [
            overlap.sameLane ? "same lane" : "cross lane",
            overlap.boostOverlap ? "boost" : "",
            overlap.rampOverlap ? "ramp" : "",
            overlap.gasCanOverlap ? "gas" : ""
          ].filter(Boolean).join("/");
          return `${overlap.a} L${overlap.aLane} @${overlap.aDistance} + ${overlap.b} L${overlap.bLane} @${overlap.bDistance} (${flags}, gap ${overlap.gap})`;
        }).join("; ");
        return `run ${example.runIndex} ${example.speedClass} d${example.distance}: ${pairs}`;
      }).join(" | ")
      : "none";
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel">
        <h2>Spawn Safety Simulation</h2>
        <div class="score-grid">
          <div class="score-card"><strong>Result</strong><span>${summary.pass ? "PASS" : "FAIL"}</span></div>
          <div class="score-card"><strong>Runs</strong><span>${summary.runs.toLocaleString()}</span></div>
          <div class="score-card"><strong>Race Type</strong><span>${escapeHtml(summary.raceTypeLabel || getRaceTypeLabel(summary.raceTypeId))}</span></div>
          <div class="score-card"><strong>Speed Classes</strong><span>${summary.speedClassIds.length} x ${summary.runsPerSpeedClass.toLocaleString()}</span></div>
          <div class="score-card"><strong>5-Lane Walls</strong><span>${summary.invalidWalls.toLocaleString()}</span></div>
          <div class="score-card"><strong>Object Overlaps</strong><span>${summary.sameLaneOverlaps.toLocaleString()}</span></div>
          <div class="score-card"><strong>Boost Overlaps</strong><span>${summary.boostObjectOverlaps.toLocaleString()}</span></div>
          <div class="score-card"><strong>Ramp Overlaps</strong><span>${summary.rampObjectOverlaps.toLocaleString()}</span></div>
          <div class="score-card"><strong>Gas Can Overlaps</strong><span>${(summary.gasCanOverlaps || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Max Blocked</strong><span>${summary.maxBlocked}</span></div>
          ${row(1)}
          ${row(2)}
          ${row(3)}
          ${row(4)}
          <div class="score-card"><strong>Avg Same-Lane Gap</strong><span>${averageSpacing}</span></div>
          <div class="score-card"><strong>Min Same-Lane Gap</strong><span>${minSpacing}</span></div>
          <div class="score-card"><strong>Prevented Spawns</strong><span>${summary.preventedUnsafeSpawns.toLocaleString()}</span></div>
          <div class="score-card"><strong>Director Waves</strong><span>${(director.totalWaves || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Avg Wave Pressure</strong><span>${Number.isFinite(director.averageBlockedLanesPerWave) ? director.averageBlockedLanesPerWave.toFixed(2) : "n/a"}</span></div>
          <div class="score-card"><strong>Center Challenged</strong><span>${fmtPercent(director.nonOpeningCenterBlockedPercent)}</span></div>
          <div class="score-card"><strong>Longest Center Safe</strong><span>${fmtSeconds(director.longestCenterSafeSeconds)}</span></div>
          <div class="score-card"><strong>Decision Gap</strong><span>${fmtSeconds(director.averageDecisionGapSeconds)}</span></div>
          <div class="score-card"><strong>Meaningful Gap</strong><span>${fmtSeconds(director.averageMeaningfulWaveGapSeconds)}</span></div>
          <div class="score-card"><strong>Longest Empty</strong><span>${fmtSeconds(director.longestActiveEmptySeconds)}</span></div>
          <div class="score-card"><strong>Longest Wave Gap</strong><span>${fmtSeconds(director.longestMeaningfulWaveGapSeconds)}</span></div>
          <div class="score-card"><strong>Useful Ramps</strong><span>${fmtPercent(director.rampUsefulPercent)}</span></div>
          <div class="score-card"><strong>Repeat Patterns</strong><span>${fmtPercent(director.repeatedPatternPercent)}</span></div>
          <div class="score-card"><strong>Budget Misses</strong><span>${(director.pressureBudgetFailures || 0).toLocaleString()}</span></div>
          ${summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID ? `
            <div class="score-card"><strong>Avg Gas Cans</strong><span>${summary.averageGasCansSpawned.toFixed(1)}</span></div>
            <div class="score-card"><strong>Avg Max Gas Gap</strong><span>${fmtSeconds(summary.averageMaxTimeBetweenGasCans)}</span></div>
            <div class="score-card"><strong>Longest No-Fuel Stretch</strong><span>${fmtSeconds(summary.longestNoFuelStretch)}</span></div>
            <div class="score-card"><strong>Fuel Mix</strong><span>${(summary.fuelRunObjectMix.trafficPercent * 100).toFixed(0)}% traffic / ${(summary.fuelRunObjectMix.supportPercent * 100).toFixed(0)}% support / ${(summary.fuelRunObjectMix.minorHazardPercent * 100).toFixed(0)}% minor</span></div>
            <div class="score-card"><strong>Out-of-Fuel Risk</strong><span>${(summary.simulatedOutOfFuelRisk * 100).toFixed(1)}% / ignore ${(summary.ignoringGasOutOfFuelRisk * 100).toFixed(0)}%</span></div>
          ` : ""}
          <div class="score-card"><strong>Section Shape</strong><span>${summary.passDetails.finalPushMoreIntenseThanGroove && summary.passDetails.breatherCalmerThanPressure ? "PASS" : "CHECK"}</span></div>
          <div class="score-card"><strong>Seed Determinism</strong><span>${summary.passDetails.seededDeterminismPassed ? "PASS" : "FAIL"}</span></div>
          <div class="score-card"><strong>Seed</strong><span>${escapeHtml(summary.seed)}</span></div>
        </div>
        <p class="hint">
          Worst pressure: ${worst ? `${worst.maxBlocked} lanes at run ${worst.runIndex}, distance ${worst.distance}, y ${worst.sliceY}, lanes ${worst.lanes.join(", ")}` : "none"}.
        </p>
        <p class="hint">${escapeHtml(speedClassSummary)}</p>
        <p class="hint">Director pressure: ${escapeHtml(directorPressure)}.</p>
        <p class="hint">Section checks: ${escapeHtml(sectionChecks)}.</p>
        <p class="hint">Section distribution: ${escapeHtml(sectionSummary)}</p>
        <p class="hint">Boost lanes: ${escapeHtml(laneDistribution(director.boostLaneCounts, director.boostLaneDistribution))}</p>
        <p class="hint">Ramp lanes: ${escapeHtml(laneDistribution(director.rampLaneCounts, director.rampLaneDistribution))}</p>
        ${summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID ? `<p class="hint">Gas lanes: ${escapeHtml(laneDistribution(director.gasCanLaneCounts, director.gasCanLaneDistribution))}</p>` : ""}
        <p class="hint">Top waves: ${escapeHtml(topList(director.topWaveCounts))}</p>
        ${summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID ? `<p class="hint">Fuel patterns: ${escapeHtml(topList(director.topFuelPatterns))}</p>` : ""}
        <p class="hint">Obstacle mix: ${escapeHtml(topList(director.topObstacleTypes))}</p>
        <p class="hint">Overlap examples: ${escapeHtml(overlapSummary)}</p>
        <p class="hint">
          Checks: zero 5-lane walls ${summary.passDetails.zeroFiveLaneWalls ? "yes" : "no"} · zero overlaps ${summary.passDetails.zeroSameLaneOverlaps ? "yes" : "no"} · zero boost overlaps ${summary.passDetails.zeroBoostOverlaps ? "yes" : "no"} · zero ramp overlaps ${summary.passDetails.zeroRampOverlaps ? "yes" : "no"} · zero gas overlaps ${summary.passDetails.zeroGasCanOverlaps ? "yes" : "no"} · fuel opportunities ${summary.passDetails.fuelOpportunitiesSufficient ? "yes" : "n/a"} · fuel mix ${summary.passDetails.fuelObjectMixPassed ? "yes" : "n/a"} · gas not center-free ${summary.passDetails.fuelNotFreeCenter ? "yes" : "n/a"} · 4-lane rare ${summary.passDetails.fourLaneRare ? "yes" : "no"} · 2/3 common ${summary.passDetails.directorTwoThreeCommon ? "yes" : "no"} · center challenged ${summary.passDetails.centerChallengedRegularly ? "yes" : "no"} · budget respected ${summary.passDetails.directorPressureBudgetPassed ? "yes" : "no"} · boosts distributed ${summary.passDetails.boostNotMostlyCenter ? "yes" : "no"} · no Arcade dead air ${summary.passDetails.arcadeNoDeadAir ? "yes" : "no"} · Pro/Turbo pressure ${summary.passDetails.proTurboThreeLaneFrequent ? "yes" : "no"} · section shape ${summary.passDetails.finalPushMoreIntenseThanGroove && summary.passDetails.breatherCalmerThanPressure && summary.passDetails.breatherNotEmpty ? "yes" : "no"} · seeded deterministic ${summary.passDetails.seededDeterminismPassed ? "yes" : "no"} · pattern repeats controlled ${summary.passDetails.repeatedPatternsControlled ? "yes" : "no"}.
        </p>
        <div class="row" style="margin-top:16px">
          <button class="small-button" data-action="${summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID ? "runFuelSimulation" : "runSimulation"}">Run Again</button>
          <button class="small-button" data-action="title">Back to Title</button>
        </div>
      </section>
    `;
    this.bindLayerButtons();
  }

  togglePause() {
    if (this.screen !== "game" || this.run.ended) return;
    this.run.paused = !this.run.paused;
    if (this.run.paused) {
      if (this.input) this.input.clearGameplayInput();
      this.audio.stopMusic(0.15);
      this.layer.innerHTML = `
        <section class="panel pause-card">
          <h2>Paused</h2>
          <p class="hint">Esc resumes. R restarts in debug mode. Music and SFX toggles still work.</p>
          <div class="row" style="justify-content:center">
            <button class="small-button" data-action="resume">Resume</button>
            <button class="small-button" data-action="restart">Restart Run</button>
            <button class="small-button" data-action="title">Title</button>
          </div>
        </section>
      `;
      this.layer.classList.remove("is-empty");
      this.bindLayerButtons();
    } else {
      this.clearLayer();
      this.focusControls();
      if (this.run.raceActive) this.startRaceMusic(false);
    }
  }

  toggleDebugFreeze() {
    if (!this.debugMode || this.screen !== "game" || !this.run || this.run.ended || this.run.paused) return;
    this.run.debugFrozen = !this.run.debugFrozen;
  }

  adjustDebugSpeedScale(delta) {
    this.debugSpeedScale = clamp(Math.round(((this.debugSpeedScale || 1) + delta) * 100) / 100, 0.5, 2.5);
    if (this.run) {
      this.run.debugSpeedScale = this.debugSpeedScale;
      this.run.speedCap = this.run.track.maxSpeed * SPEED_TUNING.maxBoostOverrunMultiplier * this.debugSpeedScale;
    }
  }

  resetDebugSpeedScale() {
    this.debugSpeedScale = 1;
    if (this.run) {
      this.run.debugSpeedScale = 1;
      this.run.speedCap = this.run.track.maxSpeed * SPEED_TUNING.maxBoostOverrunMultiplier;
    }
  }

  setScreen(screen) {
    this.screen = screen;
  }

  clearLayer() {
    this.layer.innerHTML = "";
    this.layer.classList.add("is-empty");
  }

  showTitle() {
    this.partySession = null;
    this.partySetup = null;
    this.setScreen("title");
    this.audio.stopMusic(0);
    this.audio.playMusic("title", false);
    const player = this.profiles.getCurrentPlayer();
    const selectedSpeedClass = getSpeedClassConfig(this.profiles.data.speedClassId);
    const playerName = player ? escapeHtml(player.name) : "No Player";
    const playerDetail = player ? `Driving ${escapeHtml(player.car.name)}` : "Create or choose a local driver";
    const audioStatus = `Music ${this.audio.musicMuted ? "Muted" : "On"} / SFX ${this.audio.sfxMuted ? "Muted" : "On"}`;
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel title-panel show-title-panel">
        <div class="title-block">
          <div class="eyebrow">Sunset Highway Show Build</div>
          <h1 class="game-title"><span>Neon</span><span>Road</span><span>Rally</span></h1>
          <p class="subtitle title-tagline">Five lanes. One car. No brakes. Beat the room.</p>
          <div class="title-status-grid">
            <div class="title-status-card">
              <span>Current Player</span>
              <strong>${playerName}</strong>
              <small>${playerDetail}</small>
            </div>
            <div class="title-status-card">
              <span>Race Mode</span>
              <strong>${escapeHtml(selectedSpeedClass.label)}</strong>
              <small>Score x${selectedSpeedClass.scoreMultiplier.toFixed(2)}</small>
            </div>
            <div class="title-status-card">
              <span>Audio</span>
              <strong>${escapeHtml(audioStatus)}</strong>
              <small>M/N toggles</small>
            </div>
          </div>
          <p class="keyboard-hints">Enter starts Solo. Arrows/WASD drive. Space boosts. F fullscreen. Backtick opens debug tools.</p>
        </div>
        <div class="title-menu-card">
          <div class="menu-stack main-menu">
            <button class="menu-button primary" data-action="start"><strong>Solo / Seeded Run</strong><span>Set a road seed and chase the finish.</span></button>
            <button class="menu-button" data-action="challengeMode"><strong>Challenge Mode</strong><span>Fixed seeds, clear objectives, saved bests.</span></button>
            <button class="menu-button" data-action="partyMode"><strong>Party Mode</strong><span>Pass the keyboard, same seed, fastest run wins.</span></button>
            <button class="menu-button" data-action="customize"><strong>Customize Car</strong><span>Pick the local driver car.</span></button>
            <button class="menu-button" data-action="leaderboard"><strong>Leaderboard</strong><span>Top 20 local scores.</span></button>
            <button class="menu-button" data-action="settings"><strong>Settings</strong><span>Audio, race mode, fullscreen.</span></button>
          </div>
          <div class="title-utility-row">
            <button class="small-button" data-action="players">Choose / Create Player</button>
            <button class="small-button" data-action="toggleMusic">Music: ${this.audio.musicMuted ? "Muted" : "On"}</button>
            <button class="small-button" data-action="toggleSfx">SFX: ${this.audio.sfxMuted ? "Muted" : "On"}</button>
            <button class="small-button" data-action="fullscreen">Fullscreen</button>
          </div>
          ${this.debugMode ? `
            <div class="title-dev-row">
              <button class="small-button" data-action="runSeedTest">Seed Determinism</button>
              <button class="small-button" data-action="runSimulation">Classic Simulation</button>
              <button class="small-button" data-action="runFuelSimulation">Fuel Run Simulation</button>
              <button class="small-button" data-action="vehicleScaleDebug">Vehicle Scale Check</button>
            </div>
          ` : ""}
        </div>
      </section>
    `;
    this.bindLayerButtons();
    this.bindTitleAudioControls();
  }

  showSettingsScreen(message = "") {
    this.setScreen("settings");
    this.audio.playMusic("title", false);
    const selectedSpeedClass = getSpeedClassConfig(this.profiles.data.speedClassId);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel compact settings-panel">
        <div class="form-stack">
          <div>
            <span class="eyebrow">Show Build Settings</span>
            <h2>Settings</h2>
            <p class="hint">Audio and default Solo race mode are saved locally in this browser.</p>
          </div>
          <div class="score-grid">
            <div class="score-card"><strong>Default Race Mode</strong><span>${escapeHtml(selectedSpeedClass.label)}</span></div>
            <div class="score-card"><strong>Audio</strong><span>${this.audio.musicMuted ? "Music muted" : "Music on"} · ${this.audio.sfxMuted ? "SFX muted" : "SFX on"}</span></div>
          </div>
          <div class="speed-class-panel">
            <div class="speed-class-header">
              <span>Default Solo Race Mode</span>
              <strong>${escapeHtml(selectedSpeedClass.label)} · Score x${selectedSpeedClass.scoreMultiplier.toFixed(2)}</strong>
            </div>
            <div class="speed-class-grid">
              ${SPEED_CLASSES.map((speedClass) => `
                <button class="speed-class-button ${speedClass.id === selectedSpeedClass.id ? "is-selected" : ""}" data-action="setSpeedClass" data-id="${escapeAttr(speedClass.id)}">
                  <strong>${escapeHtml(speedClass.label)}</strong>
                  <span>${Math.round(getSpeedClassStartSpeed(speedClass.id))}-${Math.round(getSpeedClassEndSpeed(speedClass.id, TRACKS[0]))} MPH · x${speedClass.scoreMultiplier.toFixed(2)}</span>
                </button>
              `).join("")}
            </div>
          </div>
          <div class="audio-grid">
            <div class="field">
              <label for="musicVolume">Music volume</label>
              <input id="musicVolume" type="range" min="0" max="1" step="0.05" value="${this.audio.musicVolume}">
            </div>
            <div class="field">
              <label for="sfxVolume">SFX volume</label>
              <input id="sfxVolume" type="range" min="0" max="1" step="0.05" value="${this.audio.sfxVolume}">
            </div>
          </div>
          <div class="row">
            <button class="small-button" data-action="toggleMusic">Music: ${this.audio.musicMuted ? "Muted" : "On"}</button>
            <button class="small-button" data-action="toggleSfx">SFX: ${this.audio.sfxMuted ? "Muted" : "On"}</button>
            <button class="small-button" data-action="fullscreen">Fullscreen</button>
            <button class="small-button primary" data-action="title">Back to Title</button>
          </div>
          <p class="keyboard-hints">F toggles fullscreen. In debug gameplay, F keeps the debug finish shortcut.</p>
          <p class="status-line">${escapeHtml(message)}</p>
        </div>
      </section>
    `;
    this.bindLayerButtons();
    this.bindTitleAudioControls();
  }

  showPreRaceScreen(message = "") {
    this.partySession = null;
    this.partySetup = null;
    if (!this.profiles.getCurrentPlayer()) {
      this.showPlayerScreen("Create or choose a player before the first run.");
      return;
    }
    this.setScreen("preRace");
    this.audio.playMusic("title", false);
    const player = this.profiles.getCurrentPlayer();
    const speedClass = getSpeedClassConfig(this.profiles.data.speedClassId);
    const raceType = getRaceTypeConfig(this.pendingRaceTypeId || DEFAULT_RACE_TYPE_ID);
    const track = TRACKS[0];
    const seed = this.resolveRoadSeed(this.pendingRoadSeed);
    this.pendingRoadSeed = seed;
    const seedSource = getRunRandomSeedSource(seed, track, speedClass.id, raceType.id);
    const seedHash = hashSeed(seedSource) >>> 0;
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel compact pre-race-panel">
        <div class="form-stack">
          <div>
            <span class="eyebrow">Solo / Seeded Run</span>
            <h2>Sunset Highway</h2>
            <p class="hint">One driver, one seed, one clean run through the current show-build track.</p>
          </div>
          <div class="score-grid mode-context-grid">
            <div class="score-card"><strong>Driver</strong><span>${escapeHtml(player.name)}</span></div>
            <div class="score-card"><strong>Race Type</strong><span id="preRaceTypeSummary">${escapeHtml(raceType.label)}</span></div>
            <div class="score-card"><strong>Race Mode</strong><span id="preRaceModeSummary">${escapeHtml(speedClass.label)} · x${speedClass.scoreMultiplier.toFixed(2)}</span></div>
            <div class="score-card"><strong>Track</strong><span>${escapeHtml(track.name)}</span></div>
            <div class="score-card"><strong>Seed Hash</strong><span id="roadSeedHashValue">${seedHash}</span></div>
          </div>
          <div class="field">
            <label for="preRaceType">Race Type</label>
            <select id="preRaceType">
              ${RACE_TYPES.map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === raceType.id ? "selected" : ""}>${escapeHtml(item.label)} - ${escapeHtml(item.description)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="preRaceSpeedClass">Race Mode</label>
            <select id="preRaceSpeedClass">
              ${SPEED_CLASSES.map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === speedClass.id ? "selected" : ""}>${escapeHtml(item.label)} · ${Math.round(getSpeedClassStartSpeed(item.id))}-${Math.round(getSpeedClassEndSpeed(item.id, track))} MPH · x${item.scoreMultiplier.toFixed(2)}</option>`).join("")}
            </select>
          </div>
          <div class="seed-display" aria-live="polite">
            <span>Current Road Seed</span>
            <strong id="roadSeedDisplay">${escapeHtml(seed)}</strong>
          </div>
          <div class="field">
            <label for="roadSeedInput">Manual Seed</label>
            <input id="roadSeedInput" type="text" maxlength="32" value="${escapeAttr(seed)}" autocomplete="off" spellcheck="false" inputmode="text">
          </div>
          <p class="hint">Same seed + same track + same race speed + same race type repeats the Road Director sequence.</p>
          <p id="roadSeedHash" class="hint">Seed hash: ${seedHash}</p>
          <div class="row">
            <button class="small-button" data-action="randomSeed">Random Seed</button>
            <button class="small-button primary" data-action="startSeededRace">Start Race</button>
            <button class="small-button" data-action="title">Back</button>
          </div>
          <p class="status-line">${escapeHtml(message)}</p>
        </div>
      </section>
    `;
    this.bindLayerButtons();
    this.bindPreRaceSeedControls();
  }

  bindPreRaceSeedControls() {
    const input = document.getElementById("roadSeedInput");
    const display = document.getElementById("roadSeedDisplay");
    const seedHash = document.getElementById("roadSeedHash");
    const seedHashValue = document.getElementById("roadSeedHashValue");
    const raceTypeSelect = document.getElementById("preRaceType");
    const raceTypeSummary = document.getElementById("preRaceTypeSummary");
    const modeSelect = document.getElementById("preRaceSpeedClass");
    const modeSummary = document.getElementById("preRaceModeSummary");
    if (!input || !display) return;
    const updateDisplay = () => {
      const normalized = normalizeRoadSeed(input.value, "");
      if (input.value !== normalized) input.value = normalized;
      const speedClass = getSpeedClassConfig(modeSelect?.value || this.profiles.data.speedClassId);
      const raceType = getRaceTypeConfig(raceTypeSelect?.value || this.pendingRaceTypeId || DEFAULT_RACE_TYPE_ID);
      const hash = normalized ? (hashSeed(getRunRandomSeedSource(normalized, TRACKS[0], speedClass.id, raceType.id)) >>> 0) : "pending";
      display.textContent = normalized || "Random seed on start";
      if (seedHash) {
        seedHash.textContent = `Seed hash: ${hash}`;
      }
      if (seedHashValue) {
        seedHashValue.textContent = String(hash);
      }
      if (modeSummary) {
        modeSummary.textContent = `${speedClass.label} · x${speedClass.scoreMultiplier.toFixed(2)}`;
      }
      if (raceTypeSummary) {
        raceTypeSummary.textContent = raceType.label;
      }
    };
    input.addEventListener("input", updateDisplay);
    input.addEventListener("blur", () => {
      const normalized = normalizeRoadSeed(input.value, "");
      if (normalized) {
        input.value = normalized;
        this.pendingRoadSeed = normalized;
      }
      updateDisplay();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (event.repeat) return;
        this.audio.activate();
        this.audio.playSfx("menu");
        this.handleStartSeededRace();
      }
    });
    if (modeSelect) {
      modeSelect.addEventListener("change", () => {
        const speedClass = getSpeedClassConfig(modeSelect.value);
        this.profiles.updateSpeedClass(speedClass.id);
        updateDisplay();
      });
    }
    if (raceTypeSelect) {
      raceTypeSelect.addEventListener("change", () => {
        this.pendingRaceTypeId = normalizeRaceTypeId(raceTypeSelect.value, DEFAULT_RACE_TYPE_ID);
        updateDisplay();
      });
    }
    input.focus();
    input.select();
  }

  handleRandomSeed() {
    this.pendingRoadSeed = generateReadableRoadSeed();
    this.showPreRaceScreen("Random seed ready.");
  }

  handleStartSeededRace() {
    if (this.screen !== "preRace") return;
    const input = document.getElementById("roadSeedInput");
    const modeSelect = document.getElementById("preRaceSpeedClass");
    const raceTypeSelect = document.getElementById("preRaceType");
    const seed = this.resolveRoadSeed(input?.value ?? this.pendingRoadSeed);
    const speedClassId = normalizeSpeedClassId(modeSelect?.value, this.profiles.data.speedClassId);
    const raceTypeId = normalizeRaceTypeId(raceTypeSelect?.value, DEFAULT_RACE_TYPE_ID);
    this.profiles.updateSpeedClass(speedClassId);
    this.pendingRoadSeed = seed;
    this.pendingRaceTypeId = raceTypeId;
    if (input) input.value = seed;
    this.startRace({ seed, speedClassId, raceTypeId });
  }

  createDefaultPartySetup() {
    const players = this.profiles.data.players;
    const currentId = this.profiles.data.currentPlayerId;
    const orderedPlayers = currentId
      ? players.filter((player) => player.id === currentId).concat(players.filter((player) => player.id !== currentId))
      : players.slice();
    return {
      selectedPlayerIds: orderedPlayers.slice(0, Math.min(PARTY_MIN_PLAYERS, orderedPlayers.length)).map((player) => player.id),
      trackId: TRACKS[0].id,
      raceMode: normalizeSpeedClassId(this.profiles.data.speedClassId, DEFAULT_SPEED_CLASS_ID),
      raceType: DEFAULT_RACE_TYPE_ID,
      sharedSeed: generateReadableRoadSeed(),
      roundType: PARTY_ROUND_TYPE_ONE_RUN
    };
  }

  getPartySetup() {
    if (!this.partySetup) {
      this.partySetup = this.createDefaultPartySetup();
    }
    const validIds = new Set(this.profiles.data.players.map((player) => player.id));
    this.partySetup.selectedPlayerIds = (this.partySetup.selectedPlayerIds || [])
      .filter((id, index, list) => validIds.has(id) && list.indexOf(id) === index)
      .slice(0, PARTY_MAX_PLAYERS);
    this.partySetup.raceMode = normalizeSpeedClassId(this.partySetup.raceMode, DEFAULT_SPEED_CLASS_ID);
    this.partySetup.raceType = DEFAULT_RACE_TYPE_ID;
    this.partySetup.sharedSeed = normalizeRoadSeed(this.partySetup.sharedSeed, "");
    this.partySetup.trackId = TRACKS[0].id;
    this.partySetup.roundType = PARTY_ROUND_TYPE_ONE_RUN;
    return this.partySetup;
  }

  getPartySetupSelectedPlayers() {
    const setup = this.getPartySetup();
    return setup.selectedPlayerIds
      .map((id) => this.profiles.getPlayerById(id))
      .filter(Boolean)
      .map(snapshotPartyPlayer);
  }

  readPartySetupForm() {
    const setup = this.getPartySetup();
    const raceMode = document.getElementById("partyRaceMode");
    const seedInput = document.getElementById("partySeedInput");
    if (raceMode) setup.raceMode = normalizeSpeedClassId(raceMode.value, setup.raceMode);
    if (seedInput) setup.sharedSeed = normalizeRoadSeed(seedInput.value, "");
    return setup;
  }

  showPartySetupScreen(message = "") {
    this.partySession = null;
    this.setScreen("partySetup");
    this.audio.playMusic("title", false);
    const players = this.profiles.data.players;
    if (players.length < PARTY_MIN_PLAYERS) {
      this.layer.classList.remove("is-empty");
      this.layer.innerHTML = `
        <section class="panel compact">
          <h2>Party Mode</h2>
          <p class="hint">Create at least two local player profiles before starting pass-the-keyboard competition.</p>
          <div class="row" style="margin-top:16px">
            <button class="small-button primary" data-action="players">Create More Players</button>
            <button class="small-button" data-action="title">Return to Title</button>
          </div>
          <p class="status-line">${escapeHtml(message || "Party Mode needs 2-8 local players.")}</p>
        </section>
      `;
      this.bindLayerButtons();
      return;
    }

    const setup = this.getPartySetup();
    const selectedPlayers = this.getPartySetupSelectedPlayers();
    const selectedIds = new Set(setup.selectedPlayerIds);
    const seed = setup.sharedSeed || "Random seed on start";
    const seedHash = setup.sharedSeed ? (hashSeed(getRunRandomSeedSource(setup.sharedSeed, TRACKS[0], setup.raceMode)) >>> 0) : "pending";
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel party-panel">
        <h2>Party Mode</h2>
        <p class="hint">One Run Each. Everyone drives ${escapeHtml(TRACKS[0].name)} with the same race mode and shared Road Seed. Party Mode is Classic for this pass.</p>
        <div class="party-summary-strip">
          <div class="score-card"><strong>Selected Players</strong><span>${selectedPlayers.length}/${PARTY_MAX_PLAYERS}</span></div>
          <div class="score-card"><strong>Race Type</strong><span>Classic</span></div>
          <div class="score-card"><strong>Race Mode</strong><span>${escapeHtml(getSpeedClassLabel(setup.raceMode))}</span></div>
          <div class="score-card"><strong>Shared Seed</strong><span class="is-compact">${escapeHtml(seed)}</span></div>
          <div class="score-card"><strong>Round</strong><span>One Run Each</span></div>
        </div>
        <div class="party-setup-grid">
          <div>
            <h2>Local Players</h2>
            <ul class="profile-list party-player-list">
              ${players.map((player) => {
                const selected = selectedIds.has(player.id);
                const disabled = !selected && selectedPlayers.length >= PARTY_MAX_PLAYERS;
                return `
                  <li class="profile-item ${selected ? "is-current" : ""}">
                    <strong>${escapeHtml(player.name)}</strong>
                    <span class="meta">${escapeHtml(player.car.name)} · Best ${formatScore(player.bestScore)}</span>
                    <button class="small-button" data-action="partyTogglePlayer" data-id="${escapeAttr(player.id)}" ${disabled ? "disabled" : ""}>${selected ? "Remove" : "Add"}</button>
                  </li>
                `;
              }).join("")}
            </ul>
          </div>
          <div class="form-stack">
            <div>
              <h2>Selected Order</h2>
              <ol class="profile-list party-order-list">
                ${selectedPlayers.length ? selectedPlayers.map((player, index) => `
                  <li class="profile-item">
                    <strong>${index + 1}. ${escapeHtml(player.name)}</strong>
                    <span class="meta">${escapeHtml(player.car.name)}</span>
                    <div class="row">
                      <button class="small-button" data-action="partyMovePlayer" data-id="${escapeAttr(player.id)}" data-dir="-1" ${index === 0 ? "disabled" : ""}>Up</button>
                      <button class="small-button" data-action="partyMovePlayer" data-id="${escapeAttr(player.id)}" data-dir="1" ${index === selectedPlayers.length - 1 ? "disabled" : ""}>Down</button>
                      <button class="small-button" data-action="partyRemovePlayer" data-id="${escapeAttr(player.id)}">Remove</button>
                    </div>
                  </li>
                `).join("") : `<li class="profile-item"><span class="meta">Choose 2-8 players.</span></li>`}
              </ol>
            </div>
            <div class="field">
              <label for="partyTrack">Track</label>
              <input id="partyTrack" type="text" value="${escapeAttr(TRACKS[0].name)}" readonly>
            </div>
            <div class="field">
              <label for="partyRaceMode">Race Mode</label>
              <select id="partyRaceMode">
                ${SPEED_CLASSES.map((speedClass) => `<option value="${escapeAttr(speedClass.id)}" ${speedClass.id === setup.raceMode ? "selected" : ""}>${escapeHtml(speedClass.label)}</option>`).join("")}
              </select>
            </div>
            <div class="seed-display" aria-live="polite">
              <span>Shared Party Seed</span>
              <strong id="partySeedDisplay">${escapeHtml(seed)}</strong>
            </div>
            <div class="field">
              <label for="partySeedInput">Manual Seed</label>
              <input id="partySeedInput" type="text" maxlength="32" value="${escapeAttr(setup.sharedSeed)}" autocomplete="off" spellcheck="false" inputmode="text">
            </div>
            <p id="partySeedHash" class="hint">Seed hash: ${escapeHtml(seedHash)}</p>
            <div class="row">
              <button class="small-button" data-action="partyRandomSeed">Random Seed</button>
              <button class="small-button primary" data-action="partyStartRound" ${selectedPlayers.length < PARTY_MIN_PLAYERS ? "disabled" : ""}>Start Party Round</button>
              <button class="small-button" data-action="title">Return to Title</button>
            </div>
            <p class="status-line">${escapeHtml(message || `${selectedPlayers.length} selected. Choose 2-${PARTY_MAX_PLAYERS} players.`)}</p>
          </div>
        </div>
      </section>
    `;
    this.bindLayerButtons();
    this.bindPartySetupControls();
  }

  bindPartySetupControls() {
    const input = document.getElementById("partySeedInput");
    const display = document.getElementById("partySeedDisplay");
    const seedHash = document.getElementById("partySeedHash");
    const raceMode = document.getElementById("partyRaceMode");
    const updateSeedDisplay = () => {
      if (!input || !display) return;
      const normalized = normalizeRoadSeed(input.value, "");
      if (input.value !== normalized) input.value = normalized;
      const mode = normalizeSpeedClassId(raceMode?.value, DEFAULT_SPEED_CLASS_ID);
      display.textContent = normalized || "Random seed on start";
      if (seedHash) {
        seedHash.textContent = normalized
          ? `Seed hash: ${hashSeed(getRunRandomSeedSource(normalized, TRACKS[0], mode)) >>> 0}`
          : "Seed hash: pending";
      }
    };
    if (input) {
      input.addEventListener("input", updateSeedDisplay);
      input.addEventListener("blur", () => {
        const normalized = normalizeRoadSeed(input.value, "");
        input.value = normalized;
        this.getPartySetup().sharedSeed = normalized;
        updateSeedDisplay();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (event.repeat) return;
          this.audio.activate();
          this.audio.playSfx("menu");
          this.handlePartyStartRound();
        }
      });
    }
    if (raceMode) {
      raceMode.addEventListener("change", () => {
        this.readPartySetupForm();
        updateSeedDisplay();
      });
    }
  }

  handlePartyTogglePlayer(id) {
    this.readPartySetupForm();
    const setup = this.getPartySetup();
    const index = setup.selectedPlayerIds.indexOf(id);
    if (index >= 0) {
      setup.selectedPlayerIds.splice(index, 1);
      this.showPartySetupScreen("Player removed from the order.");
      return;
    }
    if (setup.selectedPlayerIds.length >= PARTY_MAX_PLAYERS) {
      this.showPartySetupScreen(`Party Mode supports up to ${PARTY_MAX_PLAYERS} players.`);
      return;
    }
    if (this.profiles.getPlayerById(id)) {
      setup.selectedPlayerIds.push(id);
    }
    this.showPartySetupScreen("Player added to the order.");
  }

  handlePartyMovePlayer(id, direction) {
    this.readPartySetupForm();
    const setup = this.getPartySetup();
    const index = setup.selectedPlayerIds.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= setup.selectedPlayerIds.length) {
      this.showPartySetupScreen();
      return;
    }
    [setup.selectedPlayerIds[index], setup.selectedPlayerIds[nextIndex]] = [setup.selectedPlayerIds[nextIndex], setup.selectedPlayerIds[index]];
    this.showPartySetupScreen("Player order updated.");
  }

  handlePartyRandomSeed() {
    this.readPartySetupForm();
    this.getPartySetup().sharedSeed = generateReadableRoadSeed();
    this.showPartySetupScreen("Random party seed ready.");
  }

  handlePartyStartRound() {
    if (this.screen !== "partySetup") return;
    const setup = this.readPartySetupForm();
    const selectedPlayers = this.getPartySetupSelectedPlayers();
    if (selectedPlayers.length < PARTY_MIN_PLAYERS) {
      this.showPartySetupScreen(`Choose at least ${PARTY_MIN_PLAYERS} local players to start Party Mode.`);
      return;
    }
    const sharedSeed = this.resolveRoadSeed(setup.sharedSeed);
    setup.sharedSeed = sharedSeed;
    setup.selectedPlayerIds = selectedPlayers.map((player) => player.id);
    this.partySession = new PartySession({
      players: selectedPlayers,
      sharedSeed,
      track: TRACKS[0],
      raceMode: setup.raceMode,
      raceType: DEFAULT_RACE_TYPE_ID,
      roundType: PARTY_ROUND_TYPE_ONE_RUN
    });
    this.pendingRoadSeed = sharedSeed;
    this.showPartyTurnScreen("Party round ready.");
  }

  showPartyTurnScreen(message = "") {
    const session = this.partySession;
    if (!session?.isPartyMode) {
      this.showPartySetupScreen("Set up Party Mode before starting a turn.");
      return;
    }
    if (session.completed) {
      this.showPartyStandingsScreen();
      return;
    }
    const player = session.currentPlayer;
    this.setScreen("partyTurn");
    this.audio.playMusic("title", false);
    const standings = session.standings();
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel split party-turn-panel">
        <div class="form-stack">
          <div>
            <span class="eyebrow">Party Turn ${session.currentTurnNumber} of ${session.totalPlayers}</span>
            <h2>${escapeHtml(player.name)}'s Run</h2>
          </div>
          <div class="score-grid">
            <div class="score-card"><strong>Driver</strong><span>${escapeHtml(player.name)}</span></div>
            <div class="score-card"><strong>Turn</strong><span>Player ${session.currentTurnNumber} of ${session.totalPlayers}</span></div>
            <div class="score-card"><strong>Track</strong><span>${escapeHtml(session.track.name)}</span></div>
            <div class="score-card"><strong>Race Type</strong><span>${escapeHtml(getRaceTypeLabel(session.raceType))}</span></div>
            <div class="score-card"><strong>Race Mode</strong><span>${escapeHtml(getSpeedClassLabel(session.raceMode))}</span></div>
            <div class="score-card"><strong>Shared Seed</strong><span>${escapeHtml(session.sharedSeed)}</span></div>
            <div class="score-card"><strong>Round Type</strong><span>One Run Each</span></div>
          </div>
          <p class="hint">Press Enter or Start Run when this player is at the keyboard.</p>
          <div class="row">
            <button class="small-button primary" data-action="partyStartRun">Start Run</button>
            <button class="small-button" data-action="partyChangeSetup">Change Players/Mode</button>
            <button class="small-button" data-action="title">Return to Title</button>
          </div>
          <p class="status-line">${escapeHtml(message)}</p>
          ${standings.length ? `
            <h2>Current Standings</h2>
            <ol class="leaderboard-list">
              ${standings.map((result) => `
                <li class="leaderboard-item">
                  <span class="leaderboard-rank">#${result.rank}</span>
                  <span>
                    <strong>${escapeHtml(result.playerName)}</strong>
                    <span class="meta">${escapeHtml(result.carName)} · ${escapeHtml(getRaceTypeLabel(result.raceType))} · ${escapeHtml(getRunStatusLabel(result.status, result.reason))} · ${formatTime(result.time)}</span>
                  </span>
                  <span class="leaderboard-score">${formatScore(result.score)}</span>
                </li>
              `).join("")}
            </ol>
          ` : ""}
        </div>
        <canvas id="partyCarPreview" class="car-preview" width="360" height="280" aria-label="Party car preview"></canvas>
      </section>
    `;
    this.bindLayerButtons();
    this.renderPartyCarPreview(player);
  }

  renderPartyCarPreview(player) {
    const canvas = document.getElementById("partyCarPreview");
    if (!canvas || !player) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#20144a");
    gradient.addColorStop(1, "#05050a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255, 228, 94, 0.24)";
    for (let x = -40; x < canvas.width; x += 58) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 94, canvas.height);
      ctx.stroke();
    }
    const laneWidth = this.renderer?.road?.laneW || canvas.width / LANES;
    drawPlayerCar(ctx, canvas.width / 2, canvas.height / 2 + 18, player.car, {
      preview: true,
      boosting: false,
      airborne: false,
      laneWidth,
      laneChanging: false,
      laneDelta: 0,
      verticalInput: 0,
      crashFlash: 0
    }, this.carSprites);
  }

  startCurrentPartyRun(options = {}) {
    if (!options.force && this.screen !== "partyTurn") return;
    const session = this.partySession;
    if (!session?.isPartyMode) {
      this.showPartySetupScreen("Set up Party Mode before starting a turn.");
      return;
    }
    if (session.completed) {
      this.showPartyStandingsScreen();
      return;
    }
    const player = session.currentPlayer;
    this.startRace({
      player,
      track: session.track,
      speedClassId: session.raceMode,
      raceTypeId: DEFAULT_RACE_TYPE_ID,
      seed: session.sharedSeed,
      partyMode: true,
      partySeedLocked: true
    });
  }

  renderMedalChips(medals, compact = false) {
    const items = Array.isArray(medals) ? medals.slice(0, 3) : [];
    if (!items.length) return "";
    const validTones = new Set(["hot", "clean", "cool", "shame", "danger", "neutral"]);
    return `
      <div class="medal-row ${compact ? "is-compact" : ""}">
        ${items.map((medal) => {
          const tone = validTones.has(medal.tone) ? medal.tone : "neutral";
          return `
            <span class="medal-chip is-${tone}">
              <strong>${escapeHtml(medal.title)}</strong>
              <span>${escapeHtml(medal.detail)}</span>
            </span>
          `;
        }).join("")}
      </div>
    `;
  }

  renderScoreBreakdown(summary) {
    const breakdown = summary.scoreBreakdown || {};
    const rows = [
      ["Distance Score", breakdown.distance, "Road covered, including boost pace.", "positive"],
      ["Pace Score", breakdown.pace, "Speed carried during the run.", "positive"],
      ["Finish Bonus", breakdown.finish, "Awarded for reaching the finish.", "positive"],
      ["Clean Driving Bonus", breakdown.clean, "Ten-second clean driving streaks.", "positive"],
      ["Near-Miss Bonus", breakdown.nearMiss, `${summary.nearMisses || 0} close calls banked.`, "positive"],
      ["Unused Boost Bonus", breakdown.unusedBoosts, `${Math.max(0, 3 - (summary.manualBoostsUsed || 0))} boosts left at run end.`, "positive"],
      ["Slowdown Penalties", -(breakdown.slowdownPenalties || 0), `${summary.slowdownHits || 0} slowdown hits.`, "negative"]
    ];
    const extras = [];
    if (breakdown.speedBonus > 0) extras.push(["Speed Finish Bonus", breakdown.speedBonus, "Fast finish bonus.", "positive"]);
    if (breakdown.boostPad > 0) extras.push(["Boost Pad Bonus", breakdown.boostPad, "Boost pads collected.", "positive"]);
    if (breakdown.ramp > 0) extras.push(["Ramp Bonus", breakdown.ramp, "Ramps hit.", "positive"]);
    if (breakdown.gasCan > 0) extras.push(["Gas Can Bonus", breakdown.gasCan, `${summary.gasCansCollected || 0} gas cans collected.`, "positive"]);
    if (breakdown.fuelBonus > 0) extras.push(["Fuel Remaining Bonus", breakdown.fuelBonus, `${summary.fuelRemaining || 0} fuel left at finish.`, "positive"]);
    return `
      <div class="score-breakdown">
        ${rows.concat(extras).map(([label, value, detail, tone]) => `
          <div class="score-breakdown-row is-${tone}">
            <span>
              <strong>${escapeHtml(label)}</strong>
              <span class="meta">${escapeHtml(detail)}</span>
            </span>
            <span class="score-breakdown-value" data-tally-value="${escapeAttr(value)}" data-tally-signed="true">${formatSignedScore(value)}</span>
          </div>
        `).join("")}
        <div class="score-breakdown-total">
          <span>
            <strong>Pre-Multiplier Total</strong>
            <span class="meta">Existing score after bonuses and penalties.</span>
          </span>
          <span data-tally-value="${escapeAttr(breakdown.preMultiplierTotal || 0)}">${formatScore(breakdown.preMultiplierTotal || 0)}</span>
        </div>
        <div class="score-breakdown-total">
          <span>
            <strong>Race Mode Multiplier</strong>
            <span class="meta">${escapeHtml(summary.speedClassLabel)} scoring.</span>
          </span>
          <span>x${(summary.scoreMultiplier || 1).toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  renderChallengeCallouts(summary) {
    if (!summary.challengeMode) return "";
    const result = summary.challengeResult || {};
    const callouts = [];
    if (!result.saved && summary.debugSpeedScaleActive) {
      callouts.push(`<span class="score-callout is-muted">Challenge Not Saved</span>`);
    }
    callouts.push(result.completed
      ? `<span class="score-callout is-hot">Challenge Complete</span>`
      : `<span class="score-callout is-muted">Challenge Failed</span>`);
    if (result.newBest) {
      callouts.push(`<span class="score-callout is-hot">New Challenge Best</span>`);
    } else if (result.bestScore > 0) {
      callouts.push(`<span class="score-callout">Challenge Best ${formatScore(result.bestScore)}</span>`);
    }
    return callouts.join("");
  }

  renderChallengeResultPanel(summary) {
    if (!summary.challengeMode) return "";
    const result = summary.challengeResult || {};
    const bestText = result.bestScore ? formatScore(result.bestScore) : "No saved best";
    const completionText = result.bestCompletionStatus ? "Completed" : "Not completed";
    const saveText = !result.saved && summary.debugSpeedScaleActive
      ? "Not saved in debug speed"
      : (result.newlyCompleted ? "First completion" : (result.newBest ? "New challenge best" : "Saved locally"));
    return `
      <div class="challenge-result-card ${result.completed ? "is-complete" : "is-failed"}">
        <div>
          <span class="eyebrow">${result.completed ? "Challenge Complete" : "Challenge Failed"}</span>
          <strong>${escapeHtml(summary.challengeName)}</strong>
          <span class="meta">${escapeHtml(result.objective || summary.challengeObjective)} · ${escapeHtml(result.detail || "Objective checked")}</span>
        </div>
        <div class="challenge-result-stack">
          <span>${escapeHtml(completionText)}</span>
          <strong>${escapeHtml(bestText)}</strong>
          <small>${escapeHtml(saveText)}</small>
        </div>
      </div>
    `;
  }

  renderLeaderboardContext(summary) {
    if (!summary.scoreSaved) {
      return `<span class="score-callout is-muted">Debug speed run - score not saved</span>`;
    }
    const callouts = [];
    callouts.push(summary.newPersonalBest
      ? `<span class="score-callout is-hot">New Personal Best</span>`
      : `<span class="score-callout">Personal Best ${formatScore(summary.bestScore)}</span>`);
    if (summary.entersTopTwenty) {
      callouts.push(`<span class="score-callout is-hot">Top 20 #${summary.topTwentyRank || "?"}</span>`);
    } else if (summary.topTwentyGap > 0) {
      callouts.push(`<span class="score-callout">#20 Gap ${formatScore(summary.topTwentyGap)}</span>`);
    } else {
      callouts.push(`<span class="score-callout">Top 20 Pending</span>`);
    }
    return callouts.join("");
  }

  showPartyStandingsScreen(message = "") {
    const session = this.partySession;
    if (!session?.isPartyMode) {
      this.showTitle();
      return;
    }
    const final = session.completed;
    const standings = session.standings();
    const leader = standings[0] || null;
    const margin = session.marginOfVictory();
    const nextPlayer = session.currentPlayer;
    const summary = this.lastSummary;
    const recentResult = summary?.partyResult || null;
    this.setScreen(final ? "partyFinal" : "partyStandings");
    this.audio.playMusic("title", false);
    if (final && !session.finalSfxPlayed) {
      this.audio.playSfx("newHighScore");
      session.finalSfxPlayed = true;
    }
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel party-panel party-results-panel">
        <div class="party-drama-header ${final ? "is-final" : ""}">
          <div>
            <span class="eyebrow">${final ? "Final Party Result" : "Current Party Race"}</span>
            <h2>${final && leader ? `${escapeHtml(leader.playerName)} Wins` : "Party Standings"}</h2>
            <p class="hint">${escapeHtml(session.track.name)} · ${escapeHtml(getRaceTypeLabel(session.raceType))} · ${escapeHtml(getSpeedClassLabel(session.raceMode))} · Seed ${escapeHtml(session.sharedSeed)}</p>
          </div>
          <div class="party-leader-card ${final ? "is-final" : ""}">
            <span>${final ? "Winner" : "Leader"}</span>
            <strong>${leader ? escapeHtml(leader.playerName) : "No runs yet"}</strong>
            <em>${leader ? formatScore(leader.score) : "0"}</em>
            ${leader && final ? `<small>Victory margin ${formatScore(margin || 0)}</small>` : ""}
            ${leader && !final ? `<small>${standings.length}/${session.totalPlayers} runs complete</small>` : ""}
          </div>
        </div>
        ${summary?.partyMode ? `
          <div class="party-last-run-card">
            <div>
              <span class="eyebrow">Latest Run</span>
              <strong>${escapeHtml(summary.playerName)}</strong>
              <span class="meta">${escapeHtml(summary.carName)} · ${escapeHtml(getRunStatusLabel(summary.status, summary.reason))} · ${formatTime(summary.time)}</span>
            </div>
            <div class="party-last-score">
              <span data-tally-value="${escapeAttr(summary.finalScore)}">${formatScore(summary.finalScore)}</span>
              ${summary.topTwentyRank ? `<small>Top 20 #${summary.topTwentyRank}</small>` : `<small>${summary.newPersonalBest ? "Personal Best" : "Run Score"}</small>`}
            </div>
            ${this.renderMedalChips(summary.medals, true)}
          </div>
        ` : ""}
        <ol class="leaderboard-list party-standings-list">
          ${standings.length ? standings.map((result, index) => `
            <li class="leaderboard-item party-standing-row ${final && index === 0 ? "is-winner" : ""} ${recentResult && result.playerId === recentResult.playerId && result.date === recentResult.date ? "is-recent" : ""}">
              <span class="leaderboard-rank">#${result.rank}</span>
              <span>
                <strong>${escapeHtml(result.playerName)}</strong>
                <span class="meta">${escapeHtml(result.carName)} · ${escapeHtml(getRaceTypeLabel(result.raceType))} · ${escapeHtml(getRunStatusLabel(result.status, result.reason))} · ${formatTime(result.time)}${result.leaderboardRank ? ` · Top 20 #${result.leaderboardRank}` : ""}</span>
                ${this.renderMedalChips(result.medals, true)}
              </span>
              <span class="party-score-stack">
                <span class="leaderboard-score">${formatScore(result.score)}</span>
                <span class="party-margin">${result.leaderMargin === 0 ? "Leader" : `${formatScore(result.leaderMargin)} back`}</span>
              </span>
            </li>
          `).join("") : `<li class="leaderboard-item"><span class="meta">No party runs recorded yet.</span></li>`}
        </ol>
        <div class="party-action-row">
          ${final ? `
            <button class="small-button primary" data-action="partyRematchSameSeed">Rematch Same Seed</button>
            <button class="small-button primary" data-action="partyRematchNewSeed">Rematch New Seed</button>
            <button class="small-button" data-action="partyChangeSetup">Change Players/Mode</button>
            <button class="small-button" data-action="title">Return to Title</button>
          ` : `
            <button class="small-button primary" data-action="partyNextPlayer">Next Player</button>
            <button class="small-button" data-action="partyChangeSetup">Change Players/Mode</button>
            <button class="small-button" data-action="title">Return to Title</button>
          `}
        </div>
        ${!final && nextPlayer ? `<p class="hint next-player-hint">Next up: ${escapeHtml(nextPlayer.name)}. Press Enter to continue.</p>` : `<p class="hint next-player-hint">Press Enter for a same-seed rematch.</p>`}
        <p class="status-line">${escapeHtml(message)}</p>
      </section>
    `;
    this.bindLayerButtons();
    this.animateScoreTally();
  }

  handlePartyNextPlayer() {
    this.showPartyTurnScreen();
  }

  handlePartyRematch(useSameSeed) {
    const session = this.partySession;
    if (!session?.isPartyMode) {
      this.showPartySetupScreen("Set up Party Mode before rematching.");
      return;
    }
    const seed = useSameSeed ? session.sharedSeed : generateReadableRoadSeed();
    this.partySession = session.createRematch(seed);
    this.partySetup = {
      selectedPlayerIds: this.partySession.selectedPlayers.map((player) => player.id),
      trackId: this.partySession.track.id,
      raceMode: this.partySession.raceMode,
      raceType: DEFAULT_RACE_TYPE_ID,
      sharedSeed: this.partySession.sharedSeed,
      roundType: PARTY_ROUND_TYPE_ONE_RUN
    };
    this.pendingRoadSeed = this.partySession.sharedSeed;
    this.showPartyTurnScreen(useSameSeed ? "Rematch with the same seed." : "Rematch with a new seed.");
  }

  handlePartyChangeSetup() {
    const session = this.partySession;
    if (session?.isPartyMode) {
      this.partySetup = {
        selectedPlayerIds: session.selectedPlayers.map((player) => player.id),
        trackId: session.track.id,
        raceMode: session.raceMode,
        raceType: DEFAULT_RACE_TYPE_ID,
        sharedSeed: session.sharedSeed,
        roundType: PARTY_ROUND_TYPE_ONE_RUN
      };
    } else {
      this.getPartySetup();
    }
    this.partySession = null;
    this.showPartySetupScreen("Adjust the party round.");
  }

  handleRestartRun() {
    const challengeId = this.lastSummary?.challengeMode ? this.lastSummary.challengeId : (this.run?.challengeMode ? this.run.challengeId : "");
    if (challengeId) {
      this.startChallengeRun(challengeId);
      return;
    }
    if (this.run?.partyMode && this.partySession?.isPartyMode) {
      this.startCurrentPartyRun({ force: true });
      return;
    }
    const summary = this.lastSummary;
    this.startRace({
      seed: summary?.seed || this.run?.roadSeed || this.pendingRoadSeed,
      speedClassId: summary?.speedClass || this.run?.speedClassId || this.profiles.data.speedClassId,
      raceTypeId: summary?.raceTypeId || this.run?.raceTypeId || this.pendingRaceTypeId
    });
  }

  showPlayerScreen(message = "") {
    this.setScreen("players");
    const current = this.profiles.getCurrentPlayer();
    const players = this.profiles.data.players;
    this.audio.playMusic("title", false);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel split">
        <div class="form-stack">
          <h2>Choose/Create Player</h2>
          <p class="hint">${current ? `Current player: ${escapeHtml(current.name)} driving ${escapeHtml(current.car.name)}.` : "Profiles live only in this browser through localStorage."}</p>
          <div class="field">
            <label for="playerName">New player name</label>
            <input id="playerName" type="text" maxlength="${LOCAL_PLAYER_NAME_MAX_LENGTH}" value="" placeholder="PLAYER NAME">
          </div>
          <div class="row">
            <button class="small-button" data-action="createPlayer">Create Player</button>
            <button class="small-button" data-action="customize" ${current ? "" : "disabled"}>Customize Current Car</button>
            <button class="small-button" data-action="title">Back</button>
          </div>
          <p class="status-line">${escapeHtml(message)}</p>
        </div>
        <div>
          <h2>Local Players</h2>
          <ul class="profile-list">
            ${players.length ? players.map((player) => `
              <li class="profile-item ${current && current.id === player.id ? "is-current" : ""}">
                <strong>${escapeHtml(player.name)}</strong>
                <span class="meta">${escapeHtml(player.car.name)} · Best ${formatScore(player.bestScore)}</span>
                <button class="small-button" data-action="selectPlayer" data-id="${escapeAttr(player.id)}">${current && current.id === player.id ? "Selected" : "Select"}</button>
              </li>
            `).join("") : `<li class="profile-item"><span class="meta">No profiles yet.</span></li>`}
          </ul>
        </div>
      </section>
    `;
    this.bindLayerButtons();
    const input = document.getElementById("playerName");
    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (event.repeat) return;
          this.audio.activate();
          this.audio.playSfx("menu");
          this.handleCreatePlayer();
        }
      });
      input.focus();
    }
  }

  showCustomizeScreen(message = "") {
    const player = this.profiles.getCurrentPlayer();
    if (!player) {
      this.showPlayerScreen("Create or choose a player before customizing a car.");
      return;
    }
    this.setScreen("customize");
    const car = { ...DEFAULT_CAR, ...player.car };
    this.audio.playMusic("title", false);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel split">
        <div class="form-stack">
          <h2>Customize Car</h2>
          <p class="hint">Sprite cars use their painted colors. Color pickers apply to classic car mode.</p>
          <div class="field">
            <label for="carName">Car name</label>
            <input id="carName" type="text" maxlength="${LOCAL_CAR_NAME_MAX_LENGTH}" value="${escapeAttr(car.name)}">
          </div>
          <div class="field">
            <label for="bodyStyle">Body style</label>
            <select id="bodyStyle">
              ${CAR_BODY_STYLES.map((style) => `<option value="${escapeAttr(style.id)}" ${style.id === car.bodyStyle ? "selected" : ""}>${escapeHtml(style.name)}</option>`).join("")}
            </select>
          </div>
          <label class="check-field">
            <input id="useSprite" type="checkbox" ${car.useSprite !== false ? "checked" : ""}>
            <span>Use Sprite Car</span>
          </label>
          <p id="spriteStatus" class="hint">Sprite cars use their painted colors. Color pickers apply to classic car mode.</p>
          <div class="field">
            <label for="bodyColor">Body color</label>
            <input id="bodyColor" type="color" value="${escapeAttr(car.bodyColor)}">
          </div>
          <div class="field">
            <label for="stripeColor">Stripe color</label>
            <input id="stripeColor" type="color" value="${escapeAttr(car.stripeColor)}">
          </div>
          <div class="field">
            <label for="windowColor">Window color</label>
            <input id="windowColor" type="color" value="${escapeAttr(car.windowColor)}">
          </div>
          <div class="row">
            <button class="small-button" data-action="saveCar">Save Car</button>
            <button class="small-button" data-action="title">Back</button>
          </div>
          <p class="status-line">${escapeHtml(message)}</p>
        </div>
        <canvas id="carPreview" class="car-preview" width="360" height="280" aria-label="Car preview"></canvas>
      </section>
    `;
    this.bindLayerButtons();
    const updatePreview = () => this.renderCarPreview();
    ["carName", "bodyStyle", "bodyColor", "stripeColor", "windowColor", "useSprite"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", updatePreview);
    });
    ["bodyStyle", "useSprite"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => {
          this.audio.activate();
          this.audio.playSfx("menu");
        });
      }
    });
    updatePreview();
  }

  renderCarPreview() {
    const canvas = document.getElementById("carPreview");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#151139");
    gradient.addColorStop(1, "#05050a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(40, 246, 255, 0.35)";
    for (let x = 0; x < canvas.width; x += 52) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 80, canvas.height);
      ctx.stroke();
    }
    const car = this.readCarForm();
    const previewLaneWidth = this.renderer?.road?.laneW || canvas.width / LANES;
    drawPlayerCar(ctx, canvas.width / 2, canvas.height / 2 + 16, car, {
      preview: true,
      boosting: false,
      airborne: false,
      laneWidth: previewLaneWidth,
      laneChanging: false,
      laneDelta: 0,
      verticalInput: 0,
      crashFlash: 0
    }, this.carSprites);

    const spriteStatus = document.getElementById("spriteStatus");
    if (spriteStatus) {
      const status = this.carSprites.getStatus(car.bodyStyle);
      const path = this.carSprites.getPath(car.bodyStyle);
      if (car.useSprite === false) {
        spriteStatus.textContent = "Sprite car mode is off. Color customization is shown with the classic canvas car.";
      } else if (status === "loaded") {
        spriteStatus.textContent = `Using sprite asset: ${path}. Sprite cars use their painted colors.`;
      } else if (status === "loading") {
        spriteStatus.textContent = `Looking for sprite asset: ${path}. Falling back to canvas until it loads.`;
      } else {
        spriteStatus.textContent = `Sprite asset not loaded: ${path}. Showing classic canvas fallback with selected colors.`;
      }
    }
  }

  showVehicleScaleDebugScreen() {
    this.setScreen("vehicleScaleDebug");
    const trafficDebug = this.trafficSprites.getDebugInfo();
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel compact">
        <h2>Vehicle Scale Check</h2>
        <p class="hint">Debug-only visual bounds and collision hitboxes at gameplay lane scale.</p>
        <div class="score-grid">
          <div class="score-card"><strong>Traffic Sprites</strong><span>${trafficDebug.loaded}/${trafficDebug.total} loaded</span></div>
          <div class="score-card"><strong>Missing</strong><span>${escapeHtml(trafficDebug.missing)}</span></div>
        </div>
        <canvas id="vehicleScaleDebugCanvas" class="car-preview" width="420" height="520" aria-label="Vehicle scale debug"></canvas>
        <div class="row" style="margin-top:16px">
          <button class="small-button" data-action="vehicleScaleDebug">Refresh</button>
          <button class="small-button" data-action="title">Back to Title</button>
        </div>
      </section>
    `;
    this.bindLayerButtons();
    this.renderVehicleScaleDebugCanvas();
  }

  renderVehicleScaleDebugCanvas() {
    const canvas = document.getElementById("vehicleScaleDebugCanvas");
    if (!canvas || !this.renderer) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const laneWidth = this.renderer.road?.laneW || canvas.width / LANES;
    ctx.fillStyle = "#070914";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(40, 246, 255, 0.24)";
    ctx.lineWidth = 1;
    const laneX = canvas.width * 0.5 - laneWidth * 0.5;
    ctx.strokeRect(laneX, 18, laneWidth, canvas.height - 36);
    ctx.fillStyle = "#f6fbff";
    ctx.font = "12px monospace";
    ctx.fillText(`lane ${laneWidth.toFixed(0)}px`, laneX, 14);

    const player = this.profiles.getCurrentPlayer();
    const car = player?.car || DEFAULT_CAR;
    const rows = [
      { type: "player", label: "player", y: 82 },
      { type: "slowCar", label: "slow", y: 170 },
      { type: "fastCar", label: "fast", y: 258 },
      { type: "truck", label: "truck", y: 362 },
      { type: "barrier", label: "barrier", y: 462 }
    ];

    rows.forEach((row) => {
      const centerX = canvas.width / 2;
      if (row.type === "player") {
        const size = getPlayerCarDrawSize(car, { laneWidth }, this.carSprites);
        drawPlayerCar(ctx, centerX, row.y, car, {
          boosting: false,
          airborne: false,
          laneWidth,
          laneChanging: false,
          laneDelta: 0,
          verticalInput: 0,
          crashFlash: 0
        }, this.carSprites);
        const renderBox = rectFromCenter(centerX, row.y, size.w, size.h);
        const config = getHitboxConfig("player");
        const hitbox = rectFromCenter(
          centerX + size.w * config.offsetX,
          row.y + size.h * config.offsetY,
          size.w * config.width,
          size.h * config.height
        );
        this.drawVehicleScaleDebugBoxes(ctx, row.label, renderBox, hitbox);
        return;
      }

      const variant = this.trafficSprites.getVariantIds(row.type)[0] || "";
      const obstacle = { type: row.type, variant };
      const visual = this.renderer.getObstacleVisualSize(row.type, 1, obstacle);
      if (visual.sprite) {
        drawTrafficSprite(ctx, centerX, row.y, visual);
      } else if (row.type === "slowCar" || row.type === "fastCar") {
        drawTrafficCar(ctx, centerX, row.y, row.type, visual.drawScale);
      } else if (row.type === "truck") {
        drawTruck(ctx, centerX, row.y, visual.drawScale);
      } else if (row.type === "barrier") {
        drawBarrier(ctx, centerX, row.y, visual.drawScale);
      }
      const renderBox = rectFromCenter(centerX, row.y, visual.w, visual.h);
      const config = getHitboxConfig(row.type);
      const hitbox = rectFromCenter(
        centerX + visual.w * config.offsetX,
        row.y + visual.h * config.offsetY,
        visual.w * config.width,
        visual.h * config.height
      );
      this.drawVehicleScaleDebugBoxes(ctx, `${row.label}${variant ? ` ${variant}` : " canvas"}`, renderBox, hitbox);
    });
  }

  drawVehicleScaleDebugBoxes(ctx, label, renderBox, hitbox) {
    drawHitboxRect(ctx, renderBox, "rgba(246, 251, 255, 0.72)", `${label} render ${renderBox.w.toFixed(0)}x${renderBox.h.toFixed(0)}`, "render");
    drawHitboxRect(ctx, hitbox, "#28f6ff", `hit ${hitbox.w.toFixed(0)}x${hitbox.h.toFixed(0)}`, "hitbox");
  }

  readCarForm() {
    return {
      name: sanitizeCarName(document.getElementById("carName")?.value, DEFAULT_CAR.name),
      bodyColor: normalizeHexColor(document.getElementById("bodyColor")?.value, DEFAULT_CAR.bodyColor),
      stripeColor: normalizeHexColor(document.getElementById("stripeColor")?.value, DEFAULT_CAR.stripeColor),
      windowColor: normalizeHexColor(document.getElementById("windowColor")?.value, DEFAULT_CAR.windowColor),
      bodyStyle: document.getElementById("bodyStyle")?.value || DEFAULT_CAR.bodyStyle,
      useSprite: document.getElementById("useSprite")?.checked !== false
    };
  }

  showLeaderboard() {
    this.setScreen("leaderboard");
    this.audio.playMusic("title", false);
    const entries = this.profiles.data.leaderboard;
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel compact">
        <h2>Top 20 Scores</h2>
        <p class="hint">Higher speed classes have higher score multipliers. Top 20 is combined across Classic and Fuel Run.</p>
        <ol class="leaderboard-list">
          ${entries.length ? entries.map((entry, index) => `
            <li class="leaderboard-item">
              <span class="leaderboard-rank">#${index + 1}</span>
              <span>
                <strong>${escapeHtml(entry.playerName)}</strong>
                <span class="meta">${entry.challengeId ? `Challenge: ${escapeHtml(entry.challengeName || entry.challengeId)} · ` : ""}${entry.partyMode ? "Party · " : ""}${escapeHtml(entry.carName)} · ${escapeHtml(entry.trackName)} · ${escapeHtml(getRaceTypeLabel(entry.raceType))} · ${escapeHtml(getSpeedClassLabel(entry.raceMode || entry.speedClass))} · Seed ${escapeHtml(formatRoadSeed(entry.seed))} · ${escapeHtml(getRunStatusLabel(entry.status))} · ${formatTime(entry.time)}${entry.raceType === FUEL_RUN_RACE_TYPE_ID ? ` · Fuel ${Math.max(0, entry.fuelRemaining || 0)}` : ""}${formatShortDate(entry.date) ? ` · ${escapeHtml(formatShortDate(entry.date))}` : ""}</span>
              </span>
              <span class="leaderboard-score">${formatScore(entry.score)}</span>
            </li>
          `).join("") : `<li class="leaderboard-item"><span class="meta">No scores saved yet.</span></li>`}
        </ol>
        <div class="row" style="margin-top:16px">
          <button class="small-button" data-action="title">Back</button>
          <button class="danger-button" data-action="resetData">Reset Local Data</button>
        </div>
        <p class="status-line">${escapeHtml(this.profiles.saveStatus)}</p>
      </section>
    `;
    this.bindLayerButtons();
  }

  showScoreScreen() {
    this.setScreen("score");
    const summary = this.lastSummary;
    if (!summary) {
      this.showTitle();
      return;
    }
    const leaderboard = this.profiles.data.leaderboard.slice(0, LEADERBOARD_MAX_ENTRIES);
    const outcomeText = getRunStatusLabel(summary.status, summary.reason);
    const leaderboardText = summary.scoreSaved
      ? (summary.topTwentyRank ? `Top 20 #${summary.topTwentyRank}` : (summary.topTwentyGap ? `${formatScore(summary.topTwentyGap)} from #20` : "Saved"))
      : `Debug speed x${summary.debugSpeedScale.toFixed(2)} - not saved`;
    const personalBestText = summary.newPersonalBest
      ? `New PB: ${formatScore(summary.finalScore)}`
      : `PB: ${formatScore(summary.bestScore)}`;
    const restartLabel = summary.challengeMode ? "Retry Challenge" : (summary.partyMode ? "Run Again" : "Rematch Same Seed");
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel score-results-panel">
        <div class="score-hero ${summary.newHighScore ? "is-high-score" : ""}">
          <div>
            <span class="eyebrow">${summary.challengeMode ? "Challenge Run Result" : (summary.partyMode ? "Party Run Result" : "Run Result")}</span>
            <h2>${summary.challengeMode ? (summary.challengeResult?.completed ? "Challenge Complete" : "Challenge Failed") : (summary.status === "finished" ? "Track Complete" : (summary.status === "outOfFuel" ? "Out of Fuel" : "Run Over"))}</h2>
            <p class="hint">${summary.challengeMode ? `${escapeHtml(summary.challengeName)} · ` : ""}${escapeHtml(summary.trackName)} · ${escapeHtml(summary.raceTypeLabel || getRaceTypeLabel(summary.raceTypeId))} · ${escapeHtml(summary.speedClassLabel)} · Seed ${escapeHtml(summary.seed)}</p>
            <div class="score-callout-row">${this.renderChallengeCallouts(summary)}${this.renderLeaderboardContext(summary)}</div>
          </div>
          <div class="final-score-card">
            <span>Final Score</span>
            <strong id="finalScoreValue" class="tally-score" data-tally-value="${escapeAttr(summary.finalScore)}">0</strong>
            <small>${escapeHtml(outcomeText)}</small>
          </div>
        </div>
        ${this.renderMedalChips(summary.medals)}
        ${this.renderChallengeResultPanel(summary)}
        <div class="score-grid score-info-grid">
          ${summary.challengeMode ? `
            <div class="score-card"><strong>Challenge</strong><span class="is-compact">${escapeHtml(summary.challengeName)}</span></div>
            <div class="score-card"><strong>Objective</strong><span class="is-compact">${escapeHtml(summary.challengeObjective)}</span></div>
            <div class="score-card"><strong>Challenge Result</strong><span class="is-compact">${summary.challengeResult?.completed ? "Complete" : "Failed"}</span></div>
            <div class="score-card"><strong>Challenge Best</strong><span class="is-compact">${summary.challengeResult?.bestScore ? formatScore(summary.challengeResult.bestScore) : "No saved best"}</span></div>
          ` : ""}
          <div class="score-card"><strong>Track</strong><span>${escapeHtml(summary.trackName)}</span></div>
          <div class="score-card"><strong>Race Type</strong><span>${escapeHtml(summary.raceTypeLabel || getRaceTypeLabel(summary.raceTypeId))}</span></div>
          <div class="score-card"><strong>Race Mode</strong><span>${escapeHtml(summary.speedClassLabel)}</span></div>
          <div class="score-card"><strong>Road Seed</strong><input class="seed-copy" type="text" value="${escapeAttr(summary.seed)}" readonly aria-label="Road seed used"></div>
          <div class="score-card"><strong>Crash / Outcome</strong><span>${escapeHtml(outcomeText)}</span></div>
          ${summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID ? `
            <div class="score-card"><strong>Fuel Collected</strong><span>${Math.max(0, summary.gasCansCollected || 0).toLocaleString()} gas cans</span></div>
            <div class="score-card"><strong>Fuel Remaining</strong><span>${Math.max(0, summary.fuelRemaining || 0).toLocaleString()} / ${FUEL_RUN_CONFIG.fuelMax}</span></div>
            <div class="score-card"><strong>Fuel Bonus</strong><span>${formatScore(summary.fuelBonus || 0)}</span></div>
          ` : ""}
          <div class="score-card"><strong>Distance</strong><span>${Math.round(summary.distance).toLocaleString()} / ${summary.trackDistance.toLocaleString()}</span></div>
          <div class="score-card"><strong>Time</strong><span>${formatTime(summary.time)}</span></div>
          <div class="score-card"><strong>Personal Best</strong><span>${escapeHtml(personalBestText)}</span></div>
          <div class="score-card"><strong>Top 20</strong><span>${escapeHtml(leaderboardText)}</span></div>
        </div>
        <h2>Score Breakdown</h2>
        ${this.renderScoreBreakdown(summary)}
        <div class="row score-action-row">
          <button class="small-button primary" data-action="restart">${escapeHtml(restartLabel)}</button>
          <button class="small-button" data-action="leaderboard">Top 20</button>
          <button class="small-button" data-action="title">Return to Title</button>
        </div>
        <h2>Leaderboard</h2>
        <ol class="leaderboard-list">
          ${leaderboard.length ? leaderboard.map((entry, index) => `
            <li class="leaderboard-item ${entry === summary.scoreEntry ? "is-recent" : ""}">
              <span class="leaderboard-rank">#${index + 1}</span>
              <span>
                <strong>${escapeHtml(entry.playerName)}</strong>
                <span class="meta">${entry.challengeId ? `Challenge: ${escapeHtml(entry.challengeName || entry.challengeId)} · ` : ""}${entry.partyMode ? "Party · " : ""}${escapeHtml(entry.carName)} · ${escapeHtml(getRaceTypeLabel(entry.raceType))} · ${escapeHtml(getSpeedClassLabel(entry.raceMode || entry.speedClass))} · Seed ${escapeHtml(formatRoadSeed(entry.seed))} · ${escapeHtml(getRunStatusLabel(entry.status))} · ${formatTime(entry.time)}</span>
              </span>
              <span class="leaderboard-score">${formatScore(entry.score)}</span>
            </li>
          `).join("") : `<li class="leaderboard-item"><span class="meta">No scores saved yet.</span></li>`}
        </ol>
      </section>
    `;
    this.bindLayerButtons();
    this.animateScoreTally();
    if (summary.newHighScore) {
      this.audio.playSfx("newHighScore");
    }
  }

  animateScoreTally() {
    const elements = Array.from(this.layer.querySelectorAll("[data-tally-value]"));
    if (!elements.length) return;
    if (this.scoreTallyFrame) {
      cancelAnimationFrame(this.scoreTallyFrame);
      this.scoreTallyFrame = null;
    }
    if (!ARCADE_FEEL.enabled || ARCADE_FEEL.scoreTallyMs <= 0) {
      elements.forEach((element) => {
        const value = Number(element.dataset.tallyValue || 0);
        element.textContent = element.dataset.tallySigned === "true" ? formatSignedScore(value) : formatScore(value);
      });
      return;
    }
    const start = performance.now();
    const duration = Math.min(ARCADE_FEEL.scoreTallyMs, 900);
    const tick = (now) => {
      if (!["score", "partyStandings", "partyFinal"].includes(this.screen) || elements.some((element) => !document.body.contains(element))) {
        this.scoreTallyFrame = null;
        return;
      }
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = easeOutCubic(progress);
      elements.forEach((element) => {
        const value = Number(element.dataset.tallyValue || 0);
        element.textContent = element.dataset.tallySigned === "true" ? formatSignedScore(value * eased) : formatScore(value * eased);
      });
      if (progress < 1) {
        this.scoreTallyFrame = requestAnimationFrame(tick);
      } else {
        elements.forEach((element) => {
          const value = Number(element.dataset.tallyValue || 0);
          element.textContent = element.dataset.tallySigned === "true" ? formatSignedScore(value) : formatScore(value);
        });
        this.scoreTallyFrame = null;
      }
    };
    this.scoreTallyFrame = requestAnimationFrame(tick);
  }

  bindLayerButtons() {
    const oneShotActions = new Set(["start", "startChallenge", "startSeededRace", "partyStartRound", "partyStartRun"]);
    this.layer.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        this.audio.activate();
        this.audio.playSfx("menu");
        const action = button.dataset.action;
        if (oneShotActions.has(action)) {
          if (button.dataset.busy === "true") return;
          button.dataset.busy = "true";
          button.disabled = true;
        }
        if (action === "start") this.startRaceFromTitle();
        else if (action === "challengeMode") this.showChallengeScreen();
        else if (action === "startChallenge") this.handleStartChallenge(button.dataset.id);
        else if (action === "partyMode") this.showPartySetupScreen();
        else if (action === "players") this.showPlayerScreen();
        else if (action === "customize") this.showCustomizeScreen();
        else if (action === "leaderboard") this.showLeaderboard();
        else if (action === "settings") this.showSettingsScreen();
        else if (action === "fullscreen") this.toggleFullscreen();
        else if (action === "setSpeedClass") this.handleSetSpeedClass(button.dataset.id);
        else if (action === "randomSeed") this.handleRandomSeed();
        else if (action === "startSeededRace") this.handleStartSeededRace();
        else if (action === "partyTogglePlayer") this.handlePartyTogglePlayer(button.dataset.id);
        else if (action === "partyRemovePlayer") this.handlePartyTogglePlayer(button.dataset.id);
        else if (action === "partyMovePlayer") this.handlePartyMovePlayer(button.dataset.id, Number(button.dataset.dir || 0));
        else if (action === "partyRandomSeed") this.handlePartyRandomSeed();
        else if (action === "partyStartRound") this.handlePartyStartRound();
        else if (action === "partyStartRun") this.startCurrentPartyRun();
        else if (action === "partyNextPlayer") this.handlePartyNextPlayer();
        else if (action === "partyRematchSameSeed") this.handlePartyRematch(true);
        else if (action === "partyRematchNewSeed") this.handlePartyRematch(false);
        else if (action === "partyChangeSetup") this.handlePartyChangeSetup();
        else if (action === "toggleMusic") this.toggleMusic(true);
        else if (action === "toggleSfx") this.toggleSfx(true);
        else if (action === "runSimulation") this.runSpawnSafetySimulation();
        else if (action === "runFuelSimulation") this.runSpawnSafetySimulation({ raceTypeId: FUEL_RUN_RACE_TYPE_ID });
        else if (action === "runSeedTest") this.runSeedDeterminismTest();
        else if (action === "vehicleScaleDebug") this.showVehicleScaleDebugScreen();
        else if (action === "title") this.showTitle();
        else if (action === "restart") this.handleRestartRun();
        else if (action === "resume") this.togglePause();
        else if (action === "createPlayer") this.handleCreatePlayer();
        else if (action === "selectPlayer") this.handleSelectPlayer(button.dataset.id);
        else if (action === "saveCar") this.handleSaveCar();
        else if (action === "resetData") this.handleResetData();
      });
    });
  }

  bindTitleAudioControls() {
    const musicVolume = document.getElementById("musicVolume");
    const sfxVolume = document.getElementById("sfxVolume");
    if (musicVolume) {
      musicVolume.addEventListener("input", () => {
        this.audio.setMusicVolume(musicVolume.value);
      });
    }
    if (sfxVolume) {
      sfxVolume.addEventListener("input", () => {
        this.audio.setSfxVolume(sfxVolume.value);
      });
    }
  }

  handleCreatePlayer() {
    const input = document.getElementById("playerName");
    const name = sanitizePlayerName(input?.value, `PLAYER ${this.profiles.data.players.length + 1}`);
    const player = this.profiles.createPlayer(name);
    if (!player) {
      this.showPlayerScreen(`Local player limit is ${LOCAL_PLAYER_MAX_COUNT}.`);
      return;
    }
    this.showPlayerScreen(`${player.name} is ready.`);
  }

  handleSelectPlayer(id) {
    this.profiles.selectPlayer(id);
    const player = this.profiles.getCurrentPlayer();
    this.showPlayerScreen(player ? `${player.name} selected.` : "");
  }

  handleSaveCar() {
    this.profiles.updateCurrentCar(this.readCarForm());
    const player = this.profiles.getCurrentPlayer();
    this.showCustomizeScreen(`${player?.car.name || "Car"} saved.`);
  }

  handleSetSpeedClass(id) {
    this.profiles.updateSpeedClass(id);
    if (this.screen === "settings") {
      this.showSettingsScreen("Default Solo race mode updated.");
    } else {
      this.showTitle();
    }
  }

  handleResetData() {
    const confirmed = window.confirm("Reset Neon Road Rally local data in this browser? This deletes only the neonRoadRally.v1 key: local players, car settings, scores, challenge progress, and audio/default race settings.");
    if (!confirmed) return;
    this.profiles.resetAll();
    this.audio.setMusicMuted(false);
    this.audio.setSfxMuted(false);
    this.showTitle();
  }

  toggleMusic(refreshTitle = false) {
    this.audio.setMusicMuted(!this.audio.musicMuted);
    if (!this.audio.musicMuted) {
      if (this.screen === "game" && !this.run.paused && this.run.raceActive) this.startRaceMusic(false);
      else if (this.screen !== "game") this.audio.playMusic("title", false);
    }
    if (this.screen === "settings") this.showSettingsScreen();
    if ((refreshTitle || this.screen === "title") && this.screen === "title") this.showTitle();
  }

  toggleSfx(refreshTitle = false) {
    this.audio.setSfxMuted(!this.audio.sfxMuted);
    if (this.screen === "settings") this.showSettingsScreen();
    if ((refreshTitle || this.screen === "title") && this.screen === "title") this.showTitle();
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

window.addEventListener("DOMContentLoaded", () => {
  window.neonRoadRally = new NeonRoadRally();
});
