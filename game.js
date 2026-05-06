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
const TRACKS = [
  {
    id: "sunset-highway",
    name: "Sunset Highway",
    music: "audio/sunset-highway.mp3",
    targetDurationSeconds: 115,
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
  laneChangeDurationSeconds: 0.11,
  heldLaneRepeatDelaySeconds: 0.16,
  heldLaneRepeatIntervalSeconds: 0.11,
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

const TRACK_DIRECTOR = {
  centerLane: 2,
  centerHoldSeconds: 3.2,
  centerSafeSecondsLimit: 5.5,
  laneSafeSecondsLimit: 12,
  fourLaneMinProgress: 0.78,
  hardWaveRecoveryChance: 0.18,
  modeCadence: {
    sunday: { early: 3.25, mid: 2.65, late: 2.2, randomEarly: 0.45, randomLate: 0.18, spacingScale: 1.08, recoveryScale: 1.18, centerSafe: 8, laneStill: 5.2, forceMeaningful: 4.2 },
    rookie: { early: 2.65, mid: 2.1, late: 1.65, randomEarly: 0.34, randomLate: 0.14, spacingScale: 0.98, recoveryScale: 0.95, centerSafe: 6.6, laneStill: 4.2, forceMeaningful: 3.3 },
    arcade: { early: 2.05, mid: 1.52, late: 1.1, randomEarly: 0.22, randomLate: 0.09, spacingScale: 0.82, recoveryScale: 0.62, centerSafe: 5.2, laneStill: 3, forceMeaningful: 2.35 },
    pro: { early: 1.55, mid: 1.15, late: 0.88, randomEarly: 0.16, randomLate: 0.06, spacingScale: 0.66, recoveryScale: 0.42, centerSafe: 4, laneStill: 2.2, forceMeaningful: 1.75 },
    turbo: { early: 1.16, mid: 0.88, late: 0.68, randomEarly: 0.1, randomLate: 0.04, spacingScale: 0.54, recoveryScale: 0.28, centerSafe: 3.1, laneStill: 1.55, forceMeaningful: 1.25 }
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
    boostPad: -0.45
  },
  modeIntensity: {
    sunday: 0.72,
    rookie: 0.88,
    arcade: 1.16,
    pro: 1.42,
    turbo: 1.68
  }
};

const TRACK_DIRECTOR_BANDS = [
  {
    id: "opening",
    label: "Opening",
    min: 0,
    max: 0.2,
    budget: [1.1, 2.15],
    weights: {
      singleBlocker: 3.2,
      doubleGate: 1.25,
      offsetPair: 0.75,
      centerBlock: 0.9,
      boostTemptation: 0.85,
      recoveryGap: 0.34
    }
  },
  {
    id: "earlyMid",
    label: "Early-Mid",
    min: 0.2,
    max: 0.45,
    budget: [2.15, 3.35],
    weights: {
      doubleGate: 2.45,
      offsetPair: 1.75,
      centerBlock: 1.65,
      leftRightSweep: 1.6,
      constructionSqueeze: 1.65,
      boostTemptation: 0.72,
      rampEscape: 0.95,
      deerCrossing: 0.95,
      recoveryGap: 0.18
    }
  },
  {
    id: "lateMid",
    label: "Late-Mid",
    min: 0.45,
    max: 0.75,
    budget: [2.85, 4.2],
    weights: {
      doubleGate: 1.7,
      offsetPair: 1.85,
      centerBlock: 1.65,
      leftRightSweep: 1.85,
      constructionSqueeze: 2,
      deerCrossing: 1.15,
      rampEscape: 1.18,
      boostTemptation: 0.55,
      nearMissCorridor: 1.7,
      recoveryGap: 0.16
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
      centerBlock: 1.35,
      leftRightSweep: 1.85,
      constructionSqueeze: 2.05,
      deerCrossing: 1.15,
      rampEscape: 1.25,
      boostTemptation: 0.42,
      nearMissCorridor: 2.1,
      fourLaneSpike: 0.32,
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

const PLAYER_CANVAS_WIDTH = 76;
const PLAYER_CANVAS_HEIGHT = 118;
const PLAYER_SPRITE_WIDTH_RATIO = 1.05;
const PLAYER_SPRITE_MIN_WIDTH = 145;
const PLAYER_SPRITE_MAX_WIDTH = 205;
const PLAYER_SPRITE_LANE_MAX_RATIO = 1.35;
const PREVIEW_SPRITE_SCALE = 1.5;
const SPRITE_OPAQUE_ALPHA_THRESHOLD = 16;
const PLAYER_SPRITE_STYLE_WIDTH_RATIOS = {
  wedge: PLAYER_SPRITE_WIDTH_RATIO,
  muscle: 1.1,
  formula: 0.9
};
const PLAYER_AIRBORNE_SCALE = 1.06;
const MIN_COLLISION_OVERLAP_PX = 4;
const NEAR_MISS_ZONE_EXPANSION_PX = 26;

const HITBOX_CONFIG = {
  player: { width: 0.62, height: 0.68, offsetX: 0, offsetY: 0.03 },
  slowCar: { width: 0.68, height: 0.74, offsetX: 0, offsetY: 0 },
  fastCar: { width: 0.66, height: 0.72, offsetX: 0, offsetY: 0 },
  truck: { width: 0.76, height: 0.82, offsetX: 0, offsetY: 0 },
  barrier: { width: 0.78, height: 0.78, offsetX: 0, offsetY: 0 },
  cone: { width: 0.55, height: 0.6, offsetX: 0, offsetY: 0 },
  oil: { width: 0.7, height: 0.45, offsetX: 0, offsetY: 0 },
  deer: { width: 0.6, height: 0.65, offsetX: 0, offsetY: 0 },
  ramp: { width: 0.75, height: 0.65, offsetX: 0, offsetY: 0 },
  boostPad: { width: 0.75, height: 0.55, offsetX: 0, offsetY: 0 },
  branch: { width: 0.66, height: 0.5, offsetX: 0, offsetY: 0 }
};

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
    finish: "FINISH"
  };
  return `${labels[type] || "BONUS"} ${amount}`;
}

function getScoreEventColor(type) {
  if (type === "nearMiss") return "#28f6ff";
  if (type === "boostPad") return "#44ff99";
  if (type === "ramp") return "#ffe45e";
  if (type === "finish") return "#f6fbff";
  return "#ffe45e";
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeName(value, fallback) {
  const clean = String(value || "").trim().replace(/\s+/g, " ").slice(0, 24);
  return clean || fallback;
}

function formatScore(value) {
  return Math.max(0, Math.round(value)).toLocaleString();
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
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

function createSeededRandom(seed) {
  let state = hashSeed(seed) || 1;
  return function seededRandom() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
      audio: {
        musicMuted: false,
        sfxMuted: false,
        musicVolume: 0.62,
        sfxVolume: 0.82
      }
    };
  }

  load() {
    const parsed = safeJsonParse(localStorage.getItem(this.storageKey));
    if (!parsed || typeof parsed !== "object") {
      this.saveStatus = parsed === null && localStorage.getItem(this.storageKey) ? "Recovered from corrupted save" : "No save found";
      return this.defaultData();
    }

    const fallback = this.defaultData();
    const players = Array.isArray(parsed.players) ? parsed.players.map((player, index) => ({
      id: String(player.id || uid()),
      name: sanitizeName(player.name, `PLAYER ${index + 1}`),
      car: {
        ...DEFAULT_CAR,
        ...(player.car && typeof player.car === "object" ? player.car : {})
      },
      bestScore: Number.isFinite(player.bestScore) ? Math.max(0, Math.round(player.bestScore)) : 0
    })) : [];

    const leaderboard = Array.isArray(parsed.leaderboard) ? parsed.leaderboard
      .filter((entry) => entry && Number.isFinite(entry.score))
      .map((entry) => ({
        playerName: sanitizeName(entry.playerName, "PLAYER"),
        carName: sanitizeName(entry.carName, "CAR"),
        trackName: sanitizeName(entry.trackName, "TRACK"),
        speedClass: normalizeSpeedClassId(entry.speedClass, DEFAULT_SPEED_CLASS_ID),
        score: Math.max(0, Math.round(entry.score)),
        status: entry.status === "finished" ? "finished" : "crashed",
        time: Number.isFinite(entry.time) ? Math.max(0, entry.time) : 0,
        date: String(entry.date || new Date().toISOString())
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20) : [];

    const audio = {
      ...fallback.audio,
      ...(parsed.audio && typeof parsed.audio === "object" ? parsed.audio : {})
    };
    audio.musicVolume = clampNumber(audio.musicVolume, 0, 1, fallback.audio.musicVolume);
    audio.sfxVolume = clampNumber(audio.sfxVolume, 0, 1, fallback.audio.sfxVolume);
    audio.musicMuted = Boolean(audio.musicMuted);
    audio.sfxMuted = Boolean(audio.sfxMuted);

    const currentPlayerId = players.some((player) => player.id === parsed.currentPlayerId)
      ? parsed.currentPlayerId
      : (players[0] ? players[0].id : null);

    this.saveStatus = "Save loaded";
    return {
      version: 1,
      players,
      currentPlayerId,
      speedClassId: normalizeSpeedClassId(parsed.speedClassId, fallback.speedClassId),
      leaderboard,
      audio
    };
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      this.saveStatus = `Saved ${new Date().toLocaleTimeString()}`;
      return true;
    } catch (error) {
      this.saveStatus = "Save failed";
      return false;
    }
  }

  resetAll() {
    localStorage.removeItem(this.storageKey);
    this.data = this.defaultData();
    this.saveStatus = "Local data reset";
  }

  getCurrentPlayer() {
    return this.data.players.find((player) => player.id === this.data.currentPlayerId) || null;
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
    const player = {
      id: uid(),
      name: sanitizeName(name, "PLAYER"),
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
    player.car = {
      name: sanitizeName(carConfig.name, DEFAULT_CAR.name),
      bodyColor: carConfig.bodyColor || DEFAULT_CAR.bodyColor,
      stripeColor: carConfig.stripeColor || DEFAULT_CAR.stripeColor,
      windowColor: carConfig.windowColor || DEFAULT_CAR.windowColor,
      bodyStyle: CAR_BODY_STYLES.some((style) => style.id === carConfig.bodyStyle) ? carConfig.bodyStyle : DEFAULT_CAR.bodyStyle,
      useSprite: carConfig.useSprite !== false
    };
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
    const cleanEntry = {
      playerName: sanitizeName(entry.playerName, "PLAYER"),
      carName: sanitizeName(entry.carName, "CAR"),
      trackName: sanitizeName(entry.trackName, "TRACK"),
      speedClass: normalizeSpeedClassId(entry.speedClass, DEFAULT_SPEED_CLASS_ID),
      score: Math.max(0, Math.round(entry.score)),
      status: entry.status === "finished" ? "finished" : "crashed",
      time: Number.isFinite(entry.time) ? Math.max(0, entry.time) : 0,
      date: new Date().toISOString()
    };
    this.data.leaderboard.push(cleanEntry);
    this.data.leaderboard.sort((a, b) => b.score - a.score);
    this.data.leaderboard = this.data.leaderboard.slice(0, 20);

    const player = this.getCurrentPlayer();
    if (player && cleanEntry.score > player.bestScore) {
      player.bestScore = cleanEntry.score;
    }
    this.save();
    return cleanEntry;
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

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

class InputManager {
  constructor(game) {
    this.game = game;
    this.heldVerticalKeys = new Set();
    this.activeKeys = new Set();
    this.suppressedUntilKeyup = new Set();
    this.heldLaneKeys = new Map();
    this.laneHoldDirection = 0;
    this.laneRepeatTimer = 0;
    this.lastKeyPressed = "none";
    this.lastKeyTime = 0;
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

    if (!isEdge && isControlKey) return;

    if (key.toLowerCase() === "m") {
      this.game.toggleMusic();
      return;
    }

    if (key.toLowerCase() === "n") {
      this.game.toggleSfx();
      return;
    }

    if (this.game.debugMode) {
      const lower = key.toLowerCase();
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
        this.game.startRace();
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
        this.startLaneHold("left", -1);
      } else if (keyId === "right") {
        this.startLaneHold("right", 1);
      } else if (keyId === "boost") {
        this.game.useManualBoost();
      }
      return;
    }

    if (this.game.screen === "score") {
      if (keyId === "enter") {
        this.game.audio.playSfx("menu");
        this.game.startRace();
      } else if (keyId === "escape") {
        this.game.audio.playSfx("menu");
        this.game.showTitle();
      }
      return;
    }

    if (keyId === "enter" && this.game.screen === "title") {
      this.game.audio.playSfx("menu");
      this.game.startRaceFromTitle();
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
    } else if (keyId === "left" || keyId === "right") {
      this.releaseLaneHold(keyId);
    }
  }

  update(dt) {
    if (!this.canProcessGameplayInput()) return;
    if (!this.laneHoldDirection) return;
    this.laneRepeatTimer -= dt;
    while (this.laneRepeatTimer <= 0) {
      this.game.requestLaneMove(this.laneHoldDirection, "hold");
      this.laneRepeatTimer += INPUT_CONFIG.heldLaneRepeatIntervalSeconds;
      if (!this.laneHoldDirection) break;
    }
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
    return !run || run.ended || run.paused || run.countdownTimer > 0 || this.suppressedUntilKeyup.has(keyId);
  }

  canProcessGameplayInput() {
    const run = this.game.run;
    return this.game.screen === "game" && run && !run.paused && !run.ended && !run.debugFrozen && run.countdownTimer <= 0;
  }

  startLaneHold(keyId, direction) {
    if (this.suppressedUntilKeyup.has(keyId)) return;
    this.heldLaneKeys.set(keyId, direction);
    this.laneHoldDirection = direction;
    this.laneRepeatTimer = INPUT_CONFIG.heldLaneRepeatDelaySeconds;
    this.game.requestLaneMove(direction, "press");
  }

  releaseLaneHold(keyId) {
    this.heldLaneKeys.delete(keyId);
    const entries = Array.from(this.heldLaneKeys.values());
    this.laneHoldDirection = entries.length ? entries[entries.length - 1] : 0;
    this.laneRepeatTimer = this.laneHoldDirection ? INPUT_CONFIG.heldLaneRepeatDelaySeconds : 0;
  }

  releaseGameplayKey(keyId) {
    if (keyId === "up" || keyId === "down") {
      this.heldVerticalKeys.delete(keyId);
      this.updateVerticalInput();
    } else if (keyId === "left" || keyId === "right") {
      this.releaseLaneHold(keyId);
    }
  }

  clearGameplayInput() {
    this.activeKeys.clear();
    this.suppressedUntilKeyup.clear();
    this.heldVerticalKeys.clear();
    this.heldLaneKeys.clear();
    this.laneHoldDirection = 0;
    this.laneRepeatTimer = 0;
    this.game.setVerticalInput(0);
  }

  clearCountdownInputLocks() {
    ["left", "right", "up", "down", "boost"].forEach((keyId) => {
      if (this.activeKeys.has(keyId)) this.suppressedUntilKeyup.add(keyId);
    });
    this.heldVerticalKeys.clear();
    this.heldLaneKeys.clear();
    this.laneHoldDirection = 0;
    this.laneRepeatTimer = 0;
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
      laneHoldDirection: this.laneHoldDirection,
      laneRepeatTimer: this.laneRepeatTimer,
      verticalHeld: Array.from(this.heldVerticalKeys).join(", ") || "none"
    };
  }
}

// ---------------------------------------------------------------------------
// Obstacle manager
// ---------------------------------------------------------------------------

class TrackDirector {
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
      pressureCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      waveCounts: {},
      boostLaneCounts: Array(LANES).fill(0),
      rampLaneCounts: Array(LANES).fill(0),
      obstacleTypeCounts: {},
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
      pressureBudgetSum: 0
    };
  }

  random() {
    return this.manager.random();
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
    const difficulty = track.difficultyCurve(progress);
    const speedClassId = this.manager.getSpeedClassId();
    const cadence = getTrackDirectorCadence(speedClassId);
    const modeIntensity = TRACK_DIRECTOR.modeIntensity[speedClassId] || 1;
    const playerLane = Math.round(clamp(
      Number.isFinite(run.targetLane) ? run.targetLane : TRACK_DIRECTOR.centerLane,
      0,
      LANES - 1
    ));
    const bandT = clamp((progress - band.min) / Math.max(0.001, band.max - band.min), 0, 1);
    const budget = lerp(band.budget[0], band.budget[1], bandT) * modeIntensity;
    const centerSafeLimit = cadence.centerSafe ?? TRACK_DIRECTOR.centerSafeSecondsLimit;
    const laneStillLimit = cadence.laneStill ?? 3;
    const centerNeedsChallenge = progress > 0.12
      && (this.centerLaneHoldSeconds >= TRACK_DIRECTOR.centerHoldSeconds
        || this.centerSafeSeconds >= centerSafeLimit);
    const needsMovementChallenge = progress > 0.16 && this.laneStillSeconds >= laneStillLimit;

    return {
      track,
      run,
      distance,
      progress,
      band,
      difficulty,
      speedClassId,
      cadence,
      modeIntensity,
      playerLane,
      pressureBudget: budget,
      centerNeedsChallenge,
      needsMovementChallenge,
      cruiseSpeed: getTrackCruiseSpeed(track, progress, speedClassId)
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

  chooseWaveType(context) {
    if (this.forceRecoveryNext) {
      this.forceRecoveryNext = false;
      return "recoveryGap";
    }
    if (this.timeSinceMeaningfulWaveSeconds >= (context.cadence.forceMeaningful ?? 3)) {
      return this.chooseForcedMeaningfulWave(context);
    }

    const entries = Object.entries(context.band.weights).map(([type, baseWeight]) => {
      let weight = baseWeight;
      if (!this.isWaveAllowed(type, context)) return { value: type, weight: 0 };

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
        if (["deerCrossing", "constructionSqueeze", "nearMissCorridor"].includes(type)) weight *= 0.58;
        if (type === "rampEscape") weight *= 0.75;
      } else if (context.speedClassId === "pro" || context.speedClassId === "turbo") {
        if (["offsetPair", "leftRightSweep", "constructionSqueeze", "nearMissCorridor", "rampEscape"].includes(type)) weight *= context.speedClassId === "turbo" ? 1.45 : 1.28;
        if (type === "doubleGate") weight *= 0.82;
        if (type === "recoveryGap") weight *= context.speedClassId === "turbo" ? 0.32 : 0.5;
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
      { value: "rampEscape", weight: this.isWaveAllowed("rampEscape", context) ? 0.95 : 0 }
    ];
    if (context.speedClassId === "pro" || context.speedClassId === "turbo") {
      weights.find((item) => item.value === "nearMissCorridor").weight *= 1.35;
      weights.find((item) => item.value === "leftRightSweep").weight *= 1.25;
      weights.find((item) => item.value === "doubleGate").weight *= 0.8;
    }
    return weightedChoice(weights, () => this.random()) || "doubleGate";
  }

  isWaveAllowed(type, context) {
    if (type === "fourLaneSpike") {
      if (context.progress < TRACK_DIRECTOR.fourLaneMinProgress) return false;
      if (context.speedClassId === "sunday" || context.speedClassId === "rookie") return false;
      return context.distance - this.manager.lastFourLanePressureDistance >= FOUR_LANE_PRESSURE_COOLDOWN;
    }
    if (type === "nearMissCorridor" && context.band.id === "opening") return false;
    if (type === "deerCrossing" && context.progress < 0.22) return false;
    if (type === "constructionSqueeze" && context.progress < 0.18) return false;
    return true;
  }

  createWaveResult(type, context) {
    return {
      type,
      label: this.getWaveLabel(type),
      band: context.band,
      pressureBudget: context.pressureBudget,
      spawned: [],
      blockedLanes: new Set(),
      boostLanes: [],
      rampLanes: [],
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
    }

    if (this.manager.isFairnessBlocker(obstacle)) {
      const blockedLane = obstacle.type === "deer" ? TRACK_DIRECTOR.centerLane : lane;
      result.blockedLanes.add(blockedLane);
      if (blockedLane === TRACK_DIRECTOR.centerLane) result.centerBlocked = true;
    }
  }

  recordWave(result, context) {
    const blockedCount = clamp(result.blockedLanes.size, 0, 5);
    const safety = this.manager.validateObstaclePattern(this.manager.obstacles, this.manager.game.run.distance);
    result.fairnessPassed = !safety.invalid;
    result.maxDangerBlocked = safety.maxBlocked;
    result.hard = result.type === "fourLaneSpike"
      || blockedCount >= 3
      || result.pressure >= context.pressureBudget + 0.45;

    const stats = this.stats;
    stats.totalWaves += 1;
    if (context.band.id !== "opening") stats.nonOpeningWaves += 1;
    stats.blockedLaneSum += blockedCount;
    stats.pressureCounts[blockedCount] = (stats.pressureCounts[blockedCount] || 0) + 1;
    stats.waveCounts[result.type] = (stats.waveCounts[result.type] || 0) + 1;
    stats.pressureBudgetSum += context.pressureBudget;
    if (result.hard) stats.hardWaveCount += 1;
    if (result.type === "recoveryGap") stats.recoveryWaveCount += 1;
    if (!result.fairnessPassed) stats.fairnessFailures += 1;
    stats.waveGapSeconds.push(this.timeSinceWaveSeconds);
    stats.longestWaveGapSeconds = Math.max(stats.longestWaveGapSeconds, this.timeSinceWaveSeconds);
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
      this.centerSafeSeconds = 0;
    }

    const requiresMovement = result.centerBlocked || blockedCount >= 2 || result.type === "boostTemptation" || result.type === "rampEscape";
    if (requiresMovement) {
      stats.movementGapSeconds.push(this.decisionSafeSeconds);
      this.decisionSafeSeconds = 0;
    }
    const meaningfulWave = result.type !== "recoveryGap" && (blockedCount > 0 || this.hasActivePressureAhead());
    if (meaningfulWave) {
      stats.meaningfulWaveCount += 1;
      stats.meaningfulWaveGapSeconds.push(this.timeSinceMeaningfulWaveSeconds);
      stats.longestMeaningfulWaveGapSeconds = Math.max(stats.longestMeaningfulWaveGapSeconds, this.timeSinceMeaningfulWaveSeconds);
      this.timeSinceMeaningfulWaveSeconds = 0;
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
      pressureBudget: context.pressureBudget,
      pressure: result.pressure,
      blockedLanes: Array.from(result.blockedLanes).sort((a, b) => a - b),
      centerBlocked: result.centerBlocked,
      fairnessPassed: result.fairnessPassed
    };
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

  hasActivePressureAhead() {
    const runDistance = this.manager.game.run?.distance || 0;
    return this.manager.obstacles.some((obstacle) => {
      if (!this.manager.isFairnessBlocker(obstacle)) return false;
      const ahead = obstacle.distance - runDistance;
      return ahead > 0 && ahead < VIEW_DISTANCE * 0.92;
    });
  }

  getSpacingMultiplier(result) {
    if (!result) return 1;
    const cadence = getTrackDirectorCadence(this.manager.getSpeedClassId());
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
      fourLaneSpike: 1.16
    };
    const recoveryScale = result.type === "recoveryGap" ? (cadence.recoveryScale ?? 1) : 1;
    return (multipliers[result.type] || 1) * (cadence.spacingScale ?? 1) * recoveryScale;
  }

  getRandomSecondsScale(result) {
    if (!result) return 1;
    const cadence = getTrackDirectorCadence(this.manager.getSpeedClassId());
    if (result.type === "recoveryGap") return 0.28 * (cadence.recoveryScale ?? 1);
    if (result.hard) return 0.38;
    return 0.52;
  }

  getDebugInfo() {
    const current = this.currentWave || {};
    return {
      band: current.band || getTrackDirectorBand(this.manager.game.run?.distance / Math.max(1, this.manager.track?.distanceToFinish || 1)).label,
      wave: current.label || "none",
      budget: Number.isFinite(current.pressureBudget) ? current.pressureBudget : 0,
      pressure: Number.isFinite(current.pressure) ? current.pressure : 0,
      centerSafeSeconds: this.centerSafeSeconds,
      centerHoldSeconds: this.centerLaneHoldSeconds,
      laneStillSeconds: this.laneStillSeconds,
      meaningfulGapSeconds: this.timeSinceMeaningfulWaveSeconds,
      lanePressure: Array.isArray(current.blockedLanes) && current.blockedLanes.length ? current.blockedLanes.join(",") : "none",
      recentWaves: this.recentWaves.map((wave) => wave.label).join(" > "),
      fairnessPassed: this.lastFairnessPassed
    };
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
      obstacleTypeCounts: { ...stats.obstacleTypeCounts },
      averagePressureBudget: stats.totalWaves ? stats.pressureBudgetSum / stats.totalWaves : 0,
      longestLaneSafeSeconds: stats.longestLaneSafeSeconds.slice()
    };
  }

  allLanes() {
    return [0, 1, 2, 3, 4];
  }

  lanesExcept(excluded) {
    const list = Array.isArray(excluded) ? excluded : [excluded];
    return this.allLanes().filter((lane) => !list.includes(lane));
  }

  pickPressureLane(context, centerChance = 0.25, excluded = []) {
    const blocked = Array.isArray(excluded) ? excluded : [excluded];
    if (context.needsMovementChallenge && !blocked.includes(context.playerLane) && this.random() < 0.74) {
      return context.playerLane;
    }
    if (!blocked.includes(TRACK_DIRECTOR.centerLane)) {
      if (context.centerNeedsChallenge && this.random() < 0.84) return TRACK_DIRECTOR.centerLane;
      if (context.progress > 0.18 && this.random() < centerChance) return TRACK_DIRECTOR.centerLane;
    }
    if (!blocked.includes(context.playerLane) && context.progress > 0.24 && this.random() < 0.3) {
      return context.playerLane;
    }
    return randomChoice(shuffle(this.lanesExcept(blocked), () => this.random()), () => this.random());
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
    const lanes = this.lanesExcept(excluded).filter((lane) => lane !== TRACK_DIRECTOR.centerLane);
    const sideLanes = lanes.length ? lanes : this.lanesExcept(excluded);
    if (context.playerLane !== TRACK_DIRECTOR.centerLane && sideLanes.includes(TRACK_DIRECTOR.centerLane) && this.random() < 0.16) {
      return TRACK_DIRECTOR.centerLane;
    }
    return randomChoice(shuffle(sideLanes, () => this.random()), () => this.random());
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
  }

  waveDoubleGate(distance, context, result) {
    const safeLane = this.pickSafeLane(context, context.centerNeedsChallenge);
    let lanes = shuffle(this.lanesExcept(safeLane), () => this.random());
    if (context.centerNeedsChallenge && lanes.includes(TRACK_DIRECTOR.centerLane)) {
      lanes = [TRACK_DIRECTOR.centerLane].concat(lanes.filter((lane) => lane !== TRACK_DIRECTOR.centerLane));
    }
    this.spawn(this.chooseBlockerType(context, 0.12), lanes[0], distance, result);
    this.spawn(this.random() < 0.55 ? "slowCar" : (context.difficulty > 0.4 ? "oil" : "cone"), lanes[1], distance, result);
    const addThird = context.progress > 0.42
      && (context.speedClassId === "arcade" || context.speedClassId === "pro" || context.speedClassId === "turbo")
      && this.random() < (context.speedClassId === "arcade" ? 0.34 : (context.speedClassId === "pro" ? 0.58 : 0.72));
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
    if (context.progress > 0.36 && context.speedClassId !== "sunday" && this.random() < (context.speedClassId === "rookie" ? 0.28 : 0.56)) {
      const thirdLane = randomChoice(shuffle(this.lanesExcept([firstLane, secondLane]), () => this.random()), () => this.random());
      this.spawn(this.random() < 0.55 ? "cone" : "slowCar", thirdLane, distance + stagger * 0.55, result);
    }
  }

  waveCenterBlock(distance, context, result) {
    const type = context.progress < 0.3 ? (this.random() < 0.45 ? "cone" : "slowCar") : this.chooseBlockerType(context, 0.2);
    this.spawn(type, TRACK_DIRECTOR.centerLane, distance, result);
    if (context.progress > 0.2) {
      const sideLane = this.pickPressureLane(context, 0, [TRACK_DIRECTOR.centerLane]);
      this.spawn(this.random() < 0.55 ? "cone" : "oil", sideLane, distance, result);
      if (context.progress > 0.48 && ["arcade", "pro", "turbo"].includes(context.speedClassId) && this.random() < (context.speedClassId === "arcade" ? 0.36 : 0.64)) {
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
    const count = context.band.id === "final" || context.speedClassId === "pro" || context.speedClassId === "turbo" ? 4 : 3;
    const step = clamp(context.cruiseSpeed * 0.17, 150, 285);
    for (let i = 0; i < count; i += 1) {
      const lane = start + i * direction;
      if (lane < 0 || lane >= LANES) continue;
      const type = i === 0 ? "cone" : (this.random() < 0.42 ? "slowCar" : this.chooseBlockerType(context, 0.1));
      this.spawn(type, lane, distance + i * step, result);
    }
  }

  waveConstructionSqueeze(distance, context, result) {
    const safeLane = this.pickSafeLane(context, true);
    this.manager.addWarning(distance, safeLane, "work");
    let lanes = shuffle(this.lanesExcept(safeLane), () => this.random());
    if (context.centerNeedsChallenge && lanes.includes(TRACK_DIRECTOR.centerLane)) {
      lanes = [TRACK_DIRECTOR.centerLane].concat(lanes.filter((lane) => lane !== TRACK_DIRECTOR.centerLane));
    }
    const count = context.speedClassId === "sunday" && context.band.id === "earlyMid"
      ? 2
      : (context.speedClassId === "rookie" && context.band.id === "earlyMid" && this.random() < 0.45 ? 2 : 3);
    const types = ["barrier", this.random() < 0.58 ? "cone" : "oil", context.difficulty > 0.5 ? "barrier" : "cone"];
    for (let i = 0; i < count; i += 1) {
      this.spawn(types[i], lanes[i], distance + (i < 3 ? 0 : 135), result);
    }
  }

  waveDeerCrossing(distance, context, result) {
    const direction = this.random() < 0.5 ? 1 : -1;
    const signLane = direction > 0 ? 0 : 4;
    this.manager.addWarning(distance, signLane, "deer");
    if (context.progress > 0.35 && context.speedClassId !== "sunday") {
      const laneA = this.pickPressureLane(context, 0.24);
      const laneB = this.pickPressureLane(context, 0.18, [laneA]);
      this.spawn(this.random() < 0.6 ? "cone" : "oil", laneA, distance - 180, result);
      if (["arcade", "pro", "turbo"].includes(context.speedClassId) && this.random() < 0.65) {
        this.spawn("cone", laneB, distance + 170, result);
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
    if (context.band.id !== "opening" && context.speedClassId !== "sunday") {
      this.spawn("cone", lanes[2], hazardDistance + (context.speedClassId === "turbo" ? 40 : 100), result);
    }
    if (context.band.id === "final" && (context.speedClassId === "pro" || context.speedClassId === "turbo")) {
      this.spawn(this.random() < 0.5 ? "oil" : "branch", lanes[3], hazardDistance + 160, result);
    }
  }

  waveBoostTemptation(distance, context, result) {
    const blockerLane = this.pickPressureLane(context, 0.46);
    const rewardLane = this.pickRewardLane(context, [blockerLane]);
    this.spawn(this.random() < 0.72 ? "slowCar" : "cone", blockerLane, distance, result);
    if (context.progress > 0.25) {
      const secondLane = this.pickPressureLane(context, 0.18, [blockerLane, rewardLane]);
      this.spawn(this.random() < 0.62 ? "cone" : "oil", secondLane, distance + (context.speedClassId === "turbo" ? 0 : 40), result);
    }
    this.spawn("boostPad", rewardLane, distance + clamp(context.cruiseSpeed * 0.27, 260, 430), result);
  }

  waveNearMissCorridor(distance, context, result) {
    const safeLane = this.pickSafeLane(context, context.centerNeedsChallenge);
    let lanes = shuffle(this.lanesExcept(safeLane), () => this.random());
    if (context.centerNeedsChallenge && lanes.includes(TRACK_DIRECTOR.centerLane)) {
      lanes = [TRACK_DIRECTOR.centerLane].concat(lanes.filter((lane) => lane !== TRACK_DIRECTOR.centerLane));
    }
    const count = context.band.id === "final" || context.speedClassId === "arcade" || context.speedClassId === "pro" || context.speedClassId === "turbo" ? 3 : 2;
    for (let i = 0; i < count; i += 1) {
      const type = i === 0 ? "fastCar" : (i === 1 && context.difficulty > 0.6 ? "truck" : "slowCar");
      this.spawn(type, lanes[i], distance + (i === 2 ? (context.speedClassId === "turbo" ? 90 : 140) : 0), result);
    }
  }

  waveFourLaneSpike(distance, context, result) {
    const safeLane = this.pickSafeLane(context, true);
    const lanes = shuffle(this.lanesExcept(safeLane), () => this.random());
    const types = ["slowCar", "fastCar", "barrier", this.random() < 0.5 ? "cone" : "oil"];
    const candidates = types.map((type, index) => this.manager.createObstacle(type, lanes[index], distance, {
      allowFourLanePressure: true
    }));
    const scan = this.manager.scanPatternSafety(candidates, this.manager.obstacles);
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

  waveRecoveryGap(distance, context, result) {
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
    this.director = new TrackDirector(this);
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
    this.director.reset(track);
  }

  random() {
    return typeof this.game.randomFloat === "function" ? this.game.randomFloat() : Math.random();
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

  pickSafeLane() {
    const lanes = [0, 1, 2, 3, 4].filter((lane) => Math.abs(lane - this.lastPatternSafeLane) <= 3);
    return randomChoice(lanes, () => this.random());
  }

  addObstacle(type, lane, distance, options = {}) {
    const candidate = this.createObstacle(type, lane, distance, options);
    const spawnResult = this.canSpawnObstacle(candidate);
    if (spawnResult.canSpawn) {
      this.obstacles.push(candidate);
      if (spawnResult.maxBlocked >= 4) {
        this.lastFourLanePressureDistance = distance;
      }
      this.lastSafetySummary = spawnResult;
      const postSpawn = this.validateObstaclePattern(this.obstacles, this.game.run.distance);
      if (postSpawn.invalid) {
        candidate.remove = true;
        this.obstacles = this.obstacles.filter((obstacle) => obstacle !== candidate);
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
    return {
      id: uid(),
      type,
      lane,
      laneFloat: Number.isFinite(options.laneFloat) ? options.laneFloat : lane,
      distance,
      hit: false,
      nearMissAwarded: false,
      warningType: options.warningType || null,
      direction: options.direction || 1,
      variant: options.variant || "",
      remove: false,
      sfxPlayed: false,
      allowFourLanePressure: Boolean(options.allowFourLanePressure)
    };
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
    const info = OBSTACLE_INFO[obstacle.type];
    const laneW = this.game.renderer?.road?.laneW || 152;
    if (obstacle.type === "deer") {
      return {
        laneMin: -0.5,
        laneMax: LANES - 0.5,
        distanceMin: obstacle.distance - this.getObjectDistanceHalfSize(obstacle.type),
        distanceMax: obstacle.distance + this.getObjectDistanceHalfSize(obstacle.type),
        centerDistance: obstacle.distance
      };
    }
    const laneCenterValue = Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane;
    const config = getHitboxConfig(obstacle.type);
    const laneHalfSpan = clamp((info.w * config.width) / Math.max(1, laneW * 2), 0.18, 0.48);
    const halfDistance = this.getObjectDistanceHalfSize(obstacle.type);
    return {
      laneMin: laneCenterValue - laneHalfSpan,
      laneMax: laneCenterValue + laneHalfSpan,
      distanceMin: obstacle.distance - halfDistance,
      distanceMax: obstacle.distance + halfDistance,
      centerDistance: obstacle.distance
    };
  }

  getObjectDistanceHalfSize(type) {
    const info = OBSTACLE_INFO[type];
    const config = getHitboxConfig(type);
    if (!info || !config) return 42;
    const roadH = this.game.renderer?.road?.h || 720;
    return Math.max(42, (info.h * config.height * 1.18 * VIEW_DISTANCE / Math.max(1, roadH)) / 2);
  }

  getSpawnSpacingClass(obstacle) {
    if (["slowCar", "fastCar", "truck", "barrier"].includes(obstacle.type)) return "heavy";
    if (["ramp", "boostPad"].includes(obstacle.type)) return "assist";
    if (obstacle.type === "deer") return "animal";
    return "small";
  }

  getMinimumSameLaneGap(a, b) {
    const baseByClass = {
      heavy: 360,
      assist: 340,
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

  wouldOverlapExistingObject(candidate, existingObjects = this.obstacles) {
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

  wouldCreateFiveLaneWall(candidateObstacle, existingObstacles = this.obstacles) {
    return this.scanCandidateSafety(candidateObstacle, existingObstacles).invalid;
  }

  canSpawnObstacle(candidateObstacle) {
    const overlap = this.wouldOverlapExistingObject(candidateObstacle, this.obstacles);
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
    const scan = this.scanCandidateSafety(candidateObstacle, this.obstacles);
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

  scanCandidateSafety(candidateObstacle, existingObstacles = this.obstacles) {
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
    const start = Math.max(this.game.run.distance, minDistance - aheadTop - 180);
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

  spawnEarly(distance, safeLane) {
    const lane = randomChoice([0, 1, 2, 3, 4].filter((item) => item !== safeLane), () => this.random());
    const roll = this.random();
    if (roll < 0.5) {
      this.addObstacle("slowCar", lane, distance);
      if (distance > 4200 && this.random() < 0.42) {
        this.addObstacle("cone", safeLane === 2 ? randomChoice([0, 4], () => this.random()) : safeLane, distance);
      }
    } else if (roll < 0.76) {
      this.addObstacle("cone", lane, distance);
    } else if (roll < 0.9) {
      this.addObstacle("ramp", safeLane, distance + 140);
      this.addObstacle("cone", lane, distance + 210);
    } else {
      this.spawnBoostPad(distance, safeLane);
    }
  }

  spawnVehiclePattern(distance, safeLane, difficulty) {
    const lanes = shuffle([0, 1, 2, 3, 4].filter((lane) => lane !== safeLane), () => this.random());
    const minCount = distance / this.track.distanceToFinish < 0.25 ? 1 : 2;
    const count = Math.min(3, minCount + Math.floor(this.random() * (1.4 + difficulty * 2)));
    for (let i = 0; i < count; i += 1) {
      const type = this.random() < 0.25 + difficulty * 0.22 ? "fastCar" : "slowCar";
      this.addObstacle(type, lanes[i], distance + (i < 2 ? 0 : 150));
    }
    if (difficulty > 0.35 && this.random() < 0.32) {
      const truckLane = randomChoice(lanes.slice(count), () => this.random());
      if (Number.isFinite(truckLane)) {
        this.addObstacle("truck", truckLane, distance + 320);
      }
    }
  }

  spawnConstructionPattern(distance, safeLane, difficulty) {
    this.addWarning(distance, safeLane, "work");
    const lanes = shuffle([0, 1, 2, 3, 4].filter((lane) => lane !== safeLane), () => this.random());
    const barrierCount = difficulty > 0.55 ? 2 : 1;
    for (let i = 0; i < barrierCount; i += 1) {
      this.addObstacle("barrier", lanes[i], distance + (barrierCount > 1 ? 0 : i * 80));
    }
    const coneLane = lanes[barrierCount] ?? safeLane;
    this.addObstacle("cone", coneLane, distance + (difficulty > 0.25 ? 20 : 250));
    if (difficulty > 0.45) {
      this.addObstacle("oil", lanes[barrierCount + 1] ?? safeLane, distance + 130);
    }
  }

  spawnDeerPattern(distance) {
    const direction = this.random() < 0.5 ? 1 : -1;
    const signLane = direction > 0 ? 0 : 4;
    this.addWarning(distance, signLane, "deer");
    this.addObstacle("deer", 2, distance, {
      laneFloat: direction > 0 ? -0.45 : LANES - 0.55,
      direction
    });
  }

  spawnOilOrCones(distance, safeLane, difficulty) {
    const lanes = shuffle([0, 1, 2, 3, 4].filter((lane) => lane !== safeLane), () => this.random());
    this.addObstacle(this.random() < 0.55 ? "oil" : "cone", lanes[0], distance);
    if (difficulty > 0.28) this.addObstacle("branch", lanes[1], distance + 20);
    if (difficulty > 0.62) this.addObstacle("cone", lanes[2], distance + 300);
  }

  spawnRampChallenge(distance, safeLane) {
    this.addObstacle("ramp", safeLane, distance);
    const lanes = shuffle([0, 1, 2, 3, 4].filter((lane) => lane !== safeLane), () => this.random());
    this.addObstacle("cone", lanes[0], distance + 180);
    this.addObstacle(this.random() < 0.5 ? "oil" : "branch", lanes[1], distance + 190);
  }

  spawnBoostPad(distance, lane) {
    this.addObstacle("boostPad", lane, distance);
  }

  spawnMixedPattern(distance, safeLane, difficulty) {
    const lanes = shuffle([0, 1, 2, 3, 4].filter((lane) => lane !== safeLane), () => this.random());
    this.addObstacle("slowCar", lanes[0], distance);
    this.addObstacle(this.random() < 0.5 ? "cone" : "branch", lanes[1], distance + 35);
    if (difficulty > 0.4) {
      this.addObstacle(this.random() < 0.45 ? "truck" : "fastCar", lanes[2], distance + 420);
    }
  }

  spawnFourLanePressure(distance, safeLane) {
    const lanes = shuffle([0, 1, 2, 3, 4].filter((lane) => lane !== safeLane), () => this.random());
    const types = shuffle(["slowCar", "fastCar", "barrier", this.random() < 0.5 ? "cone" : "oil"], () => this.random());
    const candidates = types.map((type, index) => this.createObstacle(type, lanes[index], distance, {
      allowFourLanePressure: true,
      allowLaneAdjust: false
    }));
    const groupScan = this.scanPatternSafety(candidates, this.obstacles);
    if (groupScan.invalid) {
      this.preventedUnsafeSpawns += 1;
      this.lastSafetySummary = { ...groupScan, reason: "four-lane group would create five-lane wall" };
      for (let i = 0; i < 3; i += 1) {
        this.addObstacle(types[i], lanes[i], distance, {
          allowLaneAdjust: false
        });
      }
      this.spawnBoostPad(distance + 180, safeLane);
      return;
    }

    for (let i = 0; i < 4; i += 1) {
      this.addObstacle(types[i], lanes[i], distance, {
        allowFourLanePressure: true,
        allowLaneAdjust: false
      });
    }
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
      const collision = rectsOverlapByThreshold(playerBox, obstacleBox, MIN_COLLISION_OVERLAP_PX);

      if (collision.hit) {
        const result = this.getCollisionResult(obstacle, info);
        this.logCollision(obstacle, info, playerBox, obstacleBox, collision.overlap, result);
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
    if (obstacle.type === "oil") return "oil";
    if (obstacle.type === "ramp") return "ramp";
    if (obstacle.type === "boostPad") return "boost";
    return "slowdown";
  }

  logCollision(obstacle, info, playerBox, obstacleBox, overlap, result) {
    if (!this.game.debugMode || typeof console === "undefined") return;
    const run = this.game.run;
    console.info("[collision]", {
      objectType: obstacle.type,
      label: info.label,
      playerHitbox: this.formatRect(playerBox),
      obstacleHitbox: this.formatRect(obstacleBox),
      overlapWidth: Number(overlap.width.toFixed(2)),
      overlapHeight: Number(overlap.height.toFixed(2)),
      minOverlapPx: MIN_COLLISION_OVERLAP_PX,
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

  getPlayerRenderBounds() {
    const run = this.game.run;
    const x = this.laneCenter(run.renderLaneFloat);
    const y = this.getPlayerScreenY();
    const size = getPlayerCarDrawSize(run.player.car, {
      airborne: run.airborne,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
    return rectFromCenter(x, y, size.w, size.h);
  }

  getPlayerHitbox() {
    const run = this.game.run;
    const x = this.laneCenter(run.renderLaneFloat);
    const y = this.getPlayerScreenY();
    const size = getPlayerCarDrawSize(run.player.car, {
      airborne: run.airborne,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
    const config = getHitboxConfig("player");
    return rectFromCenter(
      x + size.w * config.offsetX,
      y + size.h * config.offsetY,
      size.w * config.width,
      size.h * config.height
    );
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

  getObstacleRenderBoundsAt(obstacle, runDistance) {
    const info = OBSTACLE_INFO[obstacle.type];
    if (!info || obstacle.type === "warning") return null;
    const ahead = obstacle.distance - runDistance;
    if (ahead < -70 || ahead > VIEW_DISTANCE + 160) return null;
    const { x, y, scale } = this.getObstacleScreenPositionAt(obstacle, runDistance);
    return rectFromCenter(x, y, info.w * scale, info.h * scale);
  }

  getObstacleHitboxAt(obstacle, runDistance) {
    const info = OBSTACLE_INFO[obstacle.type];
    const config = getHitboxConfig(obstacle.type);
    if (!info || obstacle.type === "warning" || !config) return null;
    const ahead = obstacle.distance - runDistance;
    if (ahead < -70 || ahead > VIEW_DISTANCE + 160) return null;
    const { x, y, scale } = this.getObstacleScreenPositionAt(obstacle, runDistance);
    return rectFromCenter(
      x + config.offsetX * info.w * scale,
      y + config.offsetY * info.h * scale,
      info.w * scale * config.width,
      info.h * scale * config.height
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
    sun.addColorStop(0, `rgba(255, 228, 94, ${0.95 * TRACK_VISUALS.horizonGlowStrength})`);
    sun.addColorStop(0.42, `rgba(255, 130, 75, ${0.66 * TRACK_VISUALS.horizonGlowStrength})`);
    sun.addColorStop(1, "rgba(255, 63, 209, 0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    const horizonGlow = ctx.createRadialGradient(w * 0.5, horizonY, 4, w * 0.5, horizonY, Math.max(w * 0.28, 320));
    horizonGlow.addColorStop(0, `rgba(255, 148, 72, ${0.42 * TRACK_VISUALS.horizonGlowStrength})`);
    horizonGlow.addColorStop(0.38, `rgba(255, 63, 209, ${0.17 * TRACK_VISUALS.horizonGlowStrength})`);
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

  drawRoadsideScenery(alpha = 1) {
    const ctx = this.ctx;
    const road = this.road;
    const scrollSource = this.getVisualDistance();
    const speedRatio = this.getVisualSpeedRatio();
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
      const warmth = this.getFinalStretchIntensity();

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
      drawTrafficCar(ctx, this.laneCenter(lane), y, i % 2 ? "fastCar" : "slowCar", 0.72);
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
    this.drawHud();
    if (this.game.debugMode) this.drawDebug();
  }

  drawRoadBase(alpha) {
    const ctx = this.ctx;
    const road = this.road;
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

    ctx.shadowBlur = 14;
    ctx.shadowColor = "#28f6ff";
    ctx.strokeStyle = "#28f6ff";
    ctx.lineWidth = 4;
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
    const intensity = TRACK_VISUALS.roadDetailIntensity * alpha;
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
    const lightSpacing = TRACK_VISUALS.edgeLightSpacing;
    const reflectorSpacing = TRACK_VISUALS.reflectorSpacing;
    const lightScroll = (scrollSource * (0.72 + speedRatio * 0.42)) % lightSpacing;
    const reflectorScroll = (scrollSource * 0.58) % reflectorSpacing;

    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    for (let y = road.y - lightSpacing + lightScroll; y < this.height + lightSpacing; y += lightSpacing) {
      const t = clamp((y - road.y) / Math.max(1, road.h), 0, 1);
      const size = lerp(3, 7, t);
      const color = Math.floor(y / lightSpacing) % 2 ? "#ff3fd1" : "#28f6ff";
      ctx.shadowBlur = 12;
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
    if (finalStretch <= 0) return;
    const ctx = this.ctx;
    const road = this.road;
    ctx.save();
    ctx.globalAlpha = alpha * finalStretch * 0.22;
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
    if (obstacle.type === "slowCar" || obstacle.type === "fastCar") {
      drawTrafficCar(ctx, x, y, obstacle.type, scale);
    } else if (obstacle.type === "truck") {
      drawTruck(ctx, x, y, scale);
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
    } else if (obstacle.type === "barrier") {
      drawBarrier(ctx, x, y, scale);
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
    drawHitboxRect(ctx, playerRenderBox, "rgba(246, 251, 255, 0.88)", "PLAYER render", "render");
    drawHitboxRect(ctx, playerBox, "#28f6ff", "PLAYER hitbox", "hitbox");
    for (const obstacle of this.game.obstacles.obstacles) {
      const renderBox = this.getObstacleRenderBounds(obstacle);
      const box = this.getObstacleHitbox(obstacle);
      if (!box) continue;
      if (box.y > this.height + 140 || box.y + box.h < this.road.y - 140) continue;
      const info = OBSTACLE_INFO[obstacle.type];
      const active = rectsOverlapByThreshold(playerBox, box, MIN_COLLISION_OVERLAP_PX).hit;
      const color = active ? "#f6fbff" : (info.crash ? "#ff3b58" : (obstacle.type === "ramp" || obstacle.type === "boostPad" ? "#44ff99" : "#ffe45e"));
      if (renderBox) {
        drawHitboxRect(ctx, renderBox, "rgba(246, 251, 255, 0.6)", "", "render");
      }
      drawHitboxRect(ctx, box, color, `${info.label} hitbox`, active ? "active" : "hitbox");
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
    if (!(boosting || highSpeed)) return;
    const ctx = this.ctx;
    const speedRatio = this.getVisualSpeedRatio();
    const finalStretch = this.getFinalStretchIntensity();
    const intensity = (run.boostTimer > 0 ? 0.42 : (run.padBoostTimer > 0 ? 0.32 : 0.18))
      * TRACK_VISUALS.speedStreakIntensity
      * (1 + finalStretch * 0.25);
    const lineCount = Math.round((run.boostTimer > 0 ? 34 : (run.padBoostTimer > 0 ? 24 : 16)) * (0.85 + speedRatio * 0.35));
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

  drawHud() {
    const ctx = this.ctx;
    const run = this.game.run;
    const w = this.width;
    const progress = clamp(run.distance / run.track.distanceToFinish, 0, 1);
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
    const col = Math.max(148, Math.min(210, w / 5.4));
    drawHudLabel(ctx, "PLAYER", run.player.name, left, 9);
    drawHudLabel(ctx, "SCORE", formatScore(run.score), left + col, 9);
    drawHudLabel(ctx, "SPEED", `${Math.round(run.currentSpeed)} MPH`, left + col * 2, 9);
    drawHudLabel(ctx, "BOOST", `${run.manualBoosts}/3`, left + col * 3, 9);
    drawHudLabel(ctx, "TRACK", `${run.track.name} · ${run.speedClass?.label || getSpeedClassLabel(run.speedClassId)}`, left + col * 4, 9);

    const barX = 16;
    const barY = 50;
    const barW = Math.min(w - 32, 520);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.fillRect(barX, barY, barW, 10);
    ctx.fillStyle = "#44ff99";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#44ff99";
    ctx.fillRect(barX, barY, barW * progress, 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#b8c6d9";
    ctx.font = "700 12px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText(`${Math.round(progress * 100)}%  MUSIC ${this.game.audio.musicMuted ? "OFF" : "ON"}  SFX ${this.game.audio.sfxMuted ? "OFF" : "ON"}`, barX + barW + 18, 47);
    ctx.restore();
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
    const spriteDebug = getPlayerSpriteDebugInfo(run.player.car, {
      airborne: run.airborne,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
    const lines = [
      "DEBUG `",
      `mode: ${run.speedClass?.label || getSpeedClassLabel(run.speedClassId)} score x${(run.scoreMultiplier || 1).toFixed(2)}`,
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
      `obstacles: ${this.game.obstacles.obstacles.length}`,
      `progress: ${(progress * 100).toFixed(1)}%`,
      `airborne: ${run.airborne}`,
      `collision: ${run.collisionState}`,
      `last hit: ${run.lastCollision}`,
      `danger max: ${this.game.obstacles.lastSafetySummary?.maxBlocked ?? 0}`,
      `prevented: ${this.game.obstacles.preventedUnsafeSpawns}`,
      `band: ${directorDebug.band}`,
      `wave: ${directorDebug.wave}`,
      `budget: ${directorDebug.budget.toFixed(2)} pressure ${directorDebug.pressure.toFixed(2)}`,
      `center safe: ${directorDebug.centerSafeSeconds.toFixed(1)}s hold ${directorDebug.centerHoldSeconds.toFixed(1)}s`,
      `lane still: ${directorDebug.laneStillSeconds.toFixed(1)}s empty ${directorDebug.meaningfulGapSeconds.toFixed(1)}s`,
      `lane pressure: ${directorDebug.lanePressure}`,
      `wave fair: ${directorDebug.fairnessPassed}`,
      `recent: ${directorDebug.recentWaves || "none"}`,
      `sprite: ${spriteDebug.mode}`,
      `src img: ${spriteDebug.natural}`,
      `opaque: ${spriteDebug.opaque}`,
      `render: ${spriteDebug.render}`,
      `hitbox: ${playerBox.w.toFixed(0)}x${playerBox.h.toFixed(0)} min ${MIN_COLLISION_OVERLAP_PX}px`,
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
      `min overlap ${MIN_COLLISION_OVERLAP_PX}px`,
      format("player"),
      `${format("slowCar", "slow")}  ${format("fastCar", "fast")}`,
      `${format("truck")}  ${format("barrier")}`,
      `${format("cone")}  ${format("oil")}`,
      `${format("deer")}  ${format("ramp")}`,
      `${format("boostPad", "boost")}  ${format("branch")}`
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
    const lines = [
      "INPUT",
      `held: ${input.heldKeys}`,
      `suppressed: ${input.suppressedKeys}`,
      `last: ${input.lastKey} ${age}`,
      `lane: ${run.renderLaneFloat.toFixed(2)} -> ${run.targetLane}`,
      `progress: ${(run.laneChangeProgress * 100).toFixed(0)}%  dur ${(INPUT_CONFIG.laneChangeDurationSeconds * 1000).toFixed(0)}ms`,
      `x: ${currentX.toFixed(0)} -> ${targetX.toFixed(0)}  y: ${this.getPlayerScreenY().toFixed(0)}`,
      `lock: ${this.getInputLockState()}`,
      `boosts: ${run.manualBoosts}  active: ${run.boostTimer > 0 || run.padBoostTimer > 0 ? "yes" : "no"}`,
      `repeat: ${input.laneHoldDirection || 0} in ${Math.max(0, input.laneRepeatTimer).toFixed(2)}s`,
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
    if (run.countdownTimer > 0) return `countdown ${run.countdownTimer.toFixed(1)}s`;
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

function drawHudLabel(ctx, label, value, x, y) {
  ctx.fillStyle = "#ffe45e";
  ctx.font = "700 10px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#f6fbff";
  ctx.font = "700 16px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(String(value).slice(0, 18), x, y + 16);
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

function getCanvasPlayerCarRenderSize(state = {}) {
  const scale = state.airborne ? PLAYER_AIRBORNE_SCALE : 1;
  return {
    scale,
    w: PLAYER_CANVAS_WIDTH * scale,
    h: PLAYER_CANVAS_HEIGHT * scale
  };
}

function getCarStyleId(carConfig) {
  return CAR_BODY_STYLES.some((item) => item.id === carConfig.bodyStyle) ? carConfig.bodyStyle : DEFAULT_CAR.bodyStyle;
}

function getPlayerSpriteTargetWidth(carConfig, state = {}) {
  const style = getCarStyleId(carConfig);
  const laneWidth = Number.isFinite(state.laneWidth) && state.laneWidth > 0
    ? state.laneWidth
    : 760 / LANES;
  const ratio = PLAYER_SPRITE_STYLE_WIDTH_RATIOS[style] || PLAYER_SPRITE_WIDTH_RATIO;
  const laneFitMax = Math.max(1, laneWidth * PLAYER_SPRITE_LANE_MAX_RATIO);
  const minWidth = Math.min(PLAYER_SPRITE_MIN_WIDTH, laneFitMax);
  const maxWidth = Math.min(PLAYER_SPRITE_MAX_WIDTH, laneFitMax);
  let width = clamp(laneWidth * ratio, minWidth, maxWidth);
  if (state.preview) width *= PREVIEW_SPRITE_SCALE;
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
  const body = isFast ? "#ff8f3f" : "#2dd4ff";
  const stripe = isFast ? "#ffe45e" : "#ff3fd1";
  const w = 62 * scale;
  const h = 104 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w, h);
  ctx.shadowBlur = 9;
  ctx.shadowColor = body;
  ctx.fillStyle = body;
  pixelPath(ctx, [[-0.38, -0.48], [0.38, -0.48], [0.46, 0.4], [-0.46, 0.4]], w, h);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#0c1430";
  ctx.fillRect(-w * 0.25, -h * 0.24, w * 0.5, h * 0.22);
  ctx.fillStyle = stripe;
  ctx.fillRect(-w * 0.3, h * 0.18, w * 0.6, h * 0.08);
  ctx.fillStyle = isFast ? "#ff3b58" : "#ffe45e";
  ctx.fillRect(-w * 0.32, -h * 0.43, w * 0.17, h * 0.06);
  ctx.fillRect(w * 0.15, -h * 0.43, w * 0.17, h * 0.06);
  ctx.fillStyle = "#05070f";
  ctx.fillRect(-w * 0.54, -h * 0.18, w * 0.12, h * 0.52);
  ctx.fillRect(w * 0.42, -h * 0.18, w * 0.12, h * 0.52);
  ctx.restore();
}

function drawTruck(ctx, x, y, scale = 1) {
  const w = 78 * scale;
  const h = 142 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w, h);
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ff3b58";
  ctx.fillStyle = "#ff3b58";
  ctx.fillRect(-w * 0.48, -h * 0.48, w * 0.96, h * 0.78);
  ctx.fillStyle = "#cfd4e3";
  ctx.fillRect(-w * 0.42, -h * 0.16, w * 0.84, h * 0.48);
  ctx.fillStyle = "#0c1430";
  ctx.fillRect(-w * 0.34, -h * 0.4, w * 0.68, h * 0.18);
  ctx.fillStyle = "#ffe45e";
  ctx.fillRect(-w * 0.44, -h * 0.47, w * 0.2, h * 0.06);
  ctx.fillRect(w * 0.24, -h * 0.47, w * 0.2, h * 0.06);
  ctx.fillStyle = "#111";
  ctx.fillRect(-w * 0.58, -h * 0.28, w * 0.12, h * 0.72);
  ctx.fillRect(w * 0.46, -h * 0.28, w * 0.12, h * 0.72);
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

function drawBarrier(ctx, x, y, scale = 1) {
  const w = 84 * scale;
  const h = 70 * scale;
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, w, h);
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ff3b58";
  ctx.fillStyle = "#27212c";
  ctx.fillRect(-w * 0.5, -h * 0.26, w, h * 0.48);
  ctx.strokeStyle = "#ff3b58";
  ctx.lineWidth = Math.max(3, 5 * scale);
  ctx.beginPath();
  ctx.moveTo(-w * 0.42, h * 0.14);
  ctx.lineTo(w * 0.42, -h * 0.2);
  ctx.moveTo(-w * 0.12, h * 0.18);
  ctx.lineTo(w * 0.48, -h * 0.06);
  ctx.stroke();
  ctx.fillStyle = "#ffe45e";
  ctx.fillRect(-w * 0.42, -h * 0.2, w * 0.18, h * 0.12);
  ctx.fillRect(w * 0.18, h * 0.02, w * 0.18, h * 0.12);
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
    });
    this.renderer = new Renderer(this.canvas, this);
    this.obstacles = new ObstacleManager(this);
    this.collision = new CollisionSystem(this);
    this.input = new InputManager(this);
    this.screen = "title";
    this.debugMode = false;
    this.debugSpeedScale = 1;
    this.attractDistance = 0;
    this.randomFloat = Math.random;
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
    return {
      player,
      track,
      speedClassId: speedClass.id,
      speedClass,
      scoreMultiplier: speedClass.scoreMultiplier,
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
      lastDistanceDelta: 0,
      boostMultiplier: 1,
      manualBoosts: 3,
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
      eventScore: 0,
      bonuses: {
        finish: 0,
        speed: 0,
        unusedBoosts: 0,
        clean: 0,
        nearMiss: 0,
        boostPad: 0,
        ramp: 0
      },
      lastCollision: "clear",
      collisionState: "clear",
      crashFlash: 0,
      screenShake: 0,
      bumpFlashTimer: 0,
      boostBurstTimer: 0,
      finishFlashTimer: 0,
      crashBeatTimer: 0,
      inputFlashTimer: 0,
      inputFlashKey: "none",
      lastInputKey: "none",
      countdownTimer: ARCADE_FEEL.enabled ? ARCADE_FEEL.countdownSeconds : 0,
      lastCountdownSfxLabel: "",
      raceActive: !ARCADE_FEEL.enabled,
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
    run.inputFlashTimer = Math.max(0, (run.inputFlashTimer || 0) - dt);
    if (Array.isArray(run.floatingTexts)) {
      run.floatingTexts.forEach((text) => {
        text.life -= dt;
        text.x += text.vx * dt;
        text.y += text.vy * dt;
      });
      run.floatingTexts = run.floatingTexts.filter((text) => text.life > 0);
    }
  }

  updateRun(dt) {
    const run = this.run;
    if (run.countdownTimer > 0) {
      this.playCountdownSfx();
      run.countdownTimer = Math.max(0, run.countdownTimer - dt);
      if (run.countdownTimer <= 0) {
        run.raceActive = true;
        if (this.input) this.input.clearCountdownInputLocks();
      }
      return;
    }
    run.raceActive = true;
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
    this.addBaseScore(distanceDelta * (run.boostTimer > 0 ? 1.6 : 1));
    this.addBaseScore(run.currentSpeed * dt * 0.04);

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

  startRaceFromTitle() {
    if (!this.profiles.getCurrentPlayer()) {
      this.showPlayerScreen("Create or choose a player before the first run.");
      return;
    }
    this.startRace();
  }

  startRace() {
    const player = this.profiles.ensureDefaultPlayer();
    const track = TRACKS[0];
    const speedClass = getSpeedClassConfig(this.profiles.data.speedClassId);
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
    this.run.currentSpeed = getTrackCruiseSpeed(track, 0, speedClass.id);
    this.run.rawCruiseSpeed = getTrackRawCruiseSpeed(track, 0, speedClass.id);
    this.run.baseCruiseSpeed = this.run.currentSpeed;
    this.run.speedCap = track.maxSpeed * SPEED_TUNING.maxBoostOverrunMultiplier * (this.debugSpeedScale || 1);
    this.run.speedCapped = false;
    this.run.debugSpeedScale = this.debugSpeedScale || 1;
    if (this.input) this.input.clearGameplayInput();
    this.obstacles.reset(track);
    this.setScreen("game");
    this.clearLayer();
    this.focusControls();
    this.audio.stopMusic(0);
    this.audio.playMusic("race", true);
  }

  requestLaneMove(direction) {
    const run = this.run;
    if (run.paused || run.ended || run.countdownTimer > 0) return false;
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
    return true;
  }

  useManualBoost() {
    const run = this.run;
    if (run.paused || run.ended || run.countdownTimer > 0 || run.manualBoosts <= 0) return;
    run.manualBoosts -= 1;
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

  endRace(status, reason) {
    const run = this.run;
    if (run.ended) return;
    run.ended = true;
    run.finished = status === "finished";
    run.endReason = reason;
    run.crashFlash = status === "crashed" ? 1 : 0;
    run.screenShake = status === "crashed" ? Math.max(run.screenShake || 0, ARCADE_FEEL.crashShake) : run.screenShake;
    run.crashBeatTimer = status === "crashed" ? 0.72 : 0;

    if (status === "finished") {
      run.finishFlashTimer = ARCADE_FEEL.finishFlashSeconds;
      run.bonuses.finish = 5000;
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
      this.addBaseScore(run.bonuses.speed);
      this.audio.playSfx("finish");
    } else {
      this.audio.playSfx("crash");
    }

    run.bonuses.unusedBoosts = run.manualBoosts * 750;
    this.addBaseScore(run.bonuses.unusedBoosts);
    run.score = Math.max(0, Math.round(run.score));
    this.audio.stopMusic(0.28);

    const player = this.profiles.getCurrentPlayer() || this.profiles.ensureDefaultPlayer();
    const previousBestScore = player.bestScore || 0;
    const leaderboard = this.profiles.data.leaderboard || [];
    const topTwentyCutoff = leaderboard.length < 20 ? -1 : Math.min(...leaderboard.slice(0, 20).map((item) => item.score || 0));
    const debugSpeedScaleActive = Math.abs((this.debugSpeedScale || 1) - 1) > 0.001;
    const isNewPersonalBest = !debugSpeedScaleActive && run.score > previousBestScore;
    const entersTopTwenty = !debugSpeedScaleActive && (leaderboard.length < 20 || run.score > topTwentyCutoff);
    const entry = debugSpeedScaleActive ? null : this.profiles.recordScore({
      playerName: player.name,
      carName: player.car.name,
      trackName: run.track.name,
      speedClass: run.speedClassId,
      score: run.score,
      status,
      time: run.elapsed
    });

    this.lastSummary = {
      scoreEntry: entry,
      baseScore: Math.max(0, Math.round(run.baseScore || 0)),
      finalScore: run.score,
      speedClass: run.speedClassId,
      speedClassLabel: run.speedClass?.label || getSpeedClassLabel(run.speedClassId),
      scoreMultiplier: run.scoreMultiplier || 1,
      distance: Math.min(run.distance, run.track.distanceToFinish),
      progress: clamp(run.distance / run.track.distanceToFinish, 0, 1),
      status,
      reason,
      time: run.elapsed,
      bonuses: { ...run.bonuses },
      penalties: run.penalties,
      bestScore: debugSpeedScaleActive ? previousBestScore : (this.profiles.getCurrentPlayer()?.bestScore || run.score),
      trackDistance: run.track.distanceToFinish,
      newPersonalBest: isNewPersonalBest,
      entersTopTwenty,
      newHighScore: isNewPersonalBest || entersTopTwenty,
      scoreSaved: !debugSpeedScaleActive,
      debugSpeedScaleActive,
      debugSpeedScale: this.debugSpeedScale || 1
    };

    setTimeout(() => {
      if (this.screen === "game") this.showScoreScreen();
    }, status === "crashed" ? ARCADE_FEEL.crashScoreDelayMs : ARCADE_FEEL.finishScoreDelayMs);
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
    this.showSimulationRunning();
    const summary = await this.runSpawnSafetySimulationCore({
      ...options,
      onProgress: (completed, total) => this.updateSimulationProgress(completed, total)
    });
    this.simulationRunning = false;
    this.simulationStatus = summary;
    this.showSimulationReport(summary);
  }

  async runSpawnSafetySimulationCore(options = {}) {
    const runsPerSpeedClass = options.runs || 1000;
    const speedClassIds = Array.isArray(options.speedClassIds) && options.speedClassIds.length
      ? options.speedClassIds.map((id) => normalizeSpeedClassId(id)).filter((id, index, list) => list.indexOf(id) === index)
      : SPEED_CLASSES.map((speedClass) => speedClass.id);
    const runs = runsPerSpeedClass * speedClassIds.length;
    const baseSeed = options.seed || "sunset-highway-spawn-safety-v1";
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
    let minSameLaneSpacing = Infinity;
    let spacingSum = 0;
    let spacingSamples = 0;
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
        movementGapCount: 0,
        movementGapSum: 0,
        centerChallengeGapCount: 0,
        centerChallengeGapSum: 0,
        waveGapCount: 0,
        waveGapSum: 0,
        meaningfulWaveGapCount: 0,
        meaningfulWaveGapSum: 0,
        longestCenterSafeSeconds: 0,
        longestWaveGapSeconds: 0,
        longestMeaningfulWaveGapSeconds: 0,
        longestActiveEmptySeconds: 0,
        pressureBudgetSum: 0,
        pressureCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        waveCounts: {},
        boostLaneCounts: Array(LANES).fill(0),
        rampLaneCounts: Array(LANES).fill(0),
        obstacleTypeCounts: {},
        longestLaneSafeSeconds: Array(LANES).fill(0)
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
      target.movementGapCount += stats.movementGapCount;
      target.movementGapSum += stats.movementGapSum;
      target.centerChallengeGapCount += stats.centerChallengeGapCount;
      target.centerChallengeGapSum += stats.centerChallengeGapSum;
      target.waveGapCount += stats.waveGapCount;
      target.waveGapSum += stats.waveGapSum;
      target.meaningfulWaveGapCount += stats.meaningfulWaveGapCount;
      target.meaningfulWaveGapSum += stats.meaningfulWaveGapSum;
      target.longestCenterSafeSeconds = Math.max(target.longestCenterSafeSeconds, stats.longestCenterSafeSeconds);
      target.longestWaveGapSeconds = Math.max(target.longestWaveGapSeconds, stats.longestWaveGapSeconds);
      target.longestMeaningfulWaveGapSeconds = Math.max(target.longestMeaningfulWaveGapSeconds, stats.longestMeaningfulWaveGapSeconds);
      target.longestActiveEmptySeconds = Math.max(target.longestActiveEmptySeconds, stats.longestActiveEmptySeconds);
      target.pressureBudgetSum += stats.pressureBudgetSum;
      mergeCountMap(target.pressureCounts, stats.pressureCounts);
      mergeCountMap(target.waveCounts, stats.waveCounts);
      mergeCountMap(target.obstacleTypeCounts, stats.obstacleTypeCounts);
      mergeLaneCounts(target.boostLaneCounts, stats.boostLaneCounts);
      mergeLaneCounts(target.rampLaneCounts, stats.rampLaneCounts);
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
        pressureCounts: { ...aggregate.pressureCounts },
        boostLaneCounts: aggregate.boostLaneCounts.slice(),
        rampLaneCounts: aggregate.rampLaneCounts.slice(),
        boostLaneDistribution: aggregate.boostLaneCounts.map((count) => boostTotal ? count / boostTotal : 0),
        rampLaneDistribution: aggregate.rampLaneCounts.map((count) => rampTotal ? count / rampTotal : 0),
        topWaveCounts: topCountList(aggregate.waveCounts, 8),
        topObstacleTypes: topCountList(aggregate.obstacleTypeCounts, 8),
        averagePressureBudget: aggregate.totalWaves ? aggregate.pressureBudgetSum / aggregate.totalWaves : 0,
        longestLaneSafeSeconds: aggregate.longestLaneSafeSeconds.slice()
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
        minSameLaneSpacing: Infinity,
        spacingSum: 0,
        spacingSamples: 0,
        pressureCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        director: createDirectorAggregate()
      };

      for (let runIndex = 0; runIndex < runsPerSpeedClass; runIndex += 1) {
        const seed = `${baseSeed}:${speedClassId}:${runIndex}`;
        const rng = createSeededRandom(seed);
        const simRun = {
          track,
          speedClassId,
          speedClass,
          distance: 0,
          elapsed: 0,
          currentSpeed: getTrackCruiseSpeed(track, 0, speedClassId)
        };
        const simGame = {
          run: simRun,
          renderer: this.renderer,
          randomFloat: rng
        };
        const manager = new ObstacleManager(simGame);
        manager.reset(track);

        while (simRun.distance < track.distanceToFinish) {
          const progress = clamp(simRun.distance / track.distanceToFinish, 0, 1);
          simRun.currentSpeed = getTrackCruiseSpeed(track, progress, speedClassId);
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
          if (occupancy.invalid) {
            invalidWalls += 1;
            perSpeedClass[speedClassId].invalidWalls += 1;
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
            sameLaneOverlaps += sameLaneCount;
            boostObjectOverlaps += boostCount;
            rampObjectOverlaps += rampCount;
            perSpeedClass[speedClassId].sameLaneOverlaps += sameLaneCount;
            perSpeedClass[speedClassId].boostObjectOverlaps += boostCount;
            perSpeedClass[speedClassId].rampObjectOverlaps += rampCount;
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
      item.director = finalizeDirectorStats(item.director);
      delete item.spacingSum;
      delete item.spacingSamples;
    });

    const modeIntensityChecks = {
      sundayPlayable: true,
      arcadeNoDeadAir: true,
      proTurboThreeLaneFrequent: true,
      centerNotSafeLong: true
    };
    for (const id of speedClassIds) {
      const item = perSpeedClass[id];
      const stats = item.director;
      const wavePressureTotal = Math.max(1, (stats.pressureCounts[1] || 0) + (stats.pressureCounts[2] || 0) + (stats.pressureCounts[3] || 0) + (stats.pressureCounts[4] || 0));
      const highPressurePercent = ((stats.pressureCounts[3] || 0) + (stats.pressureCounts[4] || 0)) / wavePressureTotal;
      item.highPressurePercent = highPressurePercent;
      if (id === "arcade") {
        modeIntensityChecks.arcadeNoDeadAir = (stats.averageMeaningfulWaveGapSeconds || Infinity) <= 2.15
          && stats.longestActiveEmptySeconds <= 4.8;
      }
      if (id === "pro" || id === "turbo") {
        const target = id === "turbo" ? 0.28 : 0.22;
        modeIntensityChecks.proTurboThreeLaneFrequent = modeIntensityChecks.proTurboThreeLaneFrequent && highPressurePercent >= target;
      }
      const centerLimit = id === "turbo" ? 4.2 : (id === "pro" ? 5.2 : (id === "arcade" ? 7.2 : 10.5));
      modeIntensityChecks.centerNotSafeLong = modeIntensityChecks.centerNotSafeLong
        && (stats.averageCenterChallengeGapSeconds === null || stats.averageCenterChallengeGapSeconds <= centerLimit);
    }

    const directorTwoThreeCommon = (director.pressureCounts[2] || 0) + (director.pressureCounts[3] || 0) >= (director.pressureCounts[1] || 0);
    const centerChallengedRegularly = director.nonOpeningCenterBlockedPercent >= 0.36;
    const boostNotMostlyCenter = (director.boostLaneDistribution[TRACK_DIRECTOR.centerLane] || 0) <= 0.34;
    const repeatedPatternsControlled = director.repeatedPatternPercent <= 0.18;
    const directorFairnessPassed = director.fairnessFailures === 0;
    const pass = invalidWalls === 0
      && maxBlocked <= 4
      && sameLaneOverlaps === 0
      && boostObjectOverlaps === 0
      && rampObjectOverlaps === 0
      && pressureCounts[4] > 0
      && fourLaneRare
      && twoThreeCommon
      && directorTwoThreeCommon
      && centerChallengedRegularly
      && boostNotMostlyCenter
      && repeatedPatternsControlled
      && directorFairnessPassed
      && modeIntensityChecks.sundayPlayable
      && modeIntensityChecks.arcadeNoDeadAir
      && modeIntensityChecks.proTurboThreeLaneFrequent
      && modeIntensityChecks.centerNotSafeLong;

    return {
      runs,
      seed: baseSeed,
      invalidWalls,
      sameLaneOverlaps,
      boostObjectOverlaps,
      rampObjectOverlaps,
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
      runsPerSpeedClass,
      speedClassIds,
      perSpeedClass,
      director,
      pass,
      passDetails: {
        zeroFiveLaneWalls: invalidWalls === 0,
        zeroSameLaneOverlaps: sameLaneOverlaps === 0,
        zeroBoostOverlaps: boostObjectOverlaps === 0,
        zeroRampOverlaps: rampObjectOverlaps === 0,
        maxAtMostFour: maxBlocked <= 4,
        fourLaneExists: pressureCounts[4] > 0,
        fourLaneRare,
        twoThreeCommon,
        directorTwoThreeCommon,
        centerChallengedRegularly,
        boostNotMostlyCenter,
        repeatedPatternsControlled,
        directorFairnessPassed,
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

  showSimulationRunning() {
    this.setScreen("simulation");
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel compact">
        <h2>Spawn Safety Simulation</h2>
        <p class="hint">Running 1,000 deterministic Sunset Highway generations for each speed class...</p>
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
      const highPressure = Number.isFinite(item.highPressurePercent) ? `${(item.highPressurePercent * 100).toFixed(0)}% 3/4-lane` : "3/4 n/a";
      return `${item.label}: ${item.invalidWalls} walls, ${item.sameLaneOverlaps} overlaps, max ${item.maxBlocked}, min gap ${minSpacing}, ${centerPercent}, ${fmtSeconds(gap)} meaningful, ${highPressure}`;
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
    const overlapSummary = (summary.overlapExamples || []).length
      ? (summary.overlapExamples || []).slice(0, 4).map((example) => {
        const pairs = example.overlaps.map((overlap) => {
          const flags = [
            overlap.sameLane ? "same lane" : "cross lane",
            overlap.boostOverlap ? "boost" : "",
            overlap.rampOverlap ? "ramp" : ""
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
          <div class="score-card"><strong>Speed Classes</strong><span>${summary.speedClassIds.length} x ${summary.runsPerSpeedClass.toLocaleString()}</span></div>
          <div class="score-card"><strong>5-Lane Walls</strong><span>${summary.invalidWalls.toLocaleString()}</span></div>
          <div class="score-card"><strong>Object Overlaps</strong><span>${summary.sameLaneOverlaps.toLocaleString()}</span></div>
          <div class="score-card"><strong>Boost Overlaps</strong><span>${summary.boostObjectOverlaps.toLocaleString()}</span></div>
          <div class="score-card"><strong>Ramp Overlaps</strong><span>${summary.rampObjectOverlaps.toLocaleString()}</span></div>
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
          <div class="score-card"><strong>Seed</strong><span>${escapeHtml(summary.seed)}</span></div>
        </div>
        <p class="hint">
          Worst pressure: ${worst ? `${worst.maxBlocked} lanes at run ${worst.runIndex}, distance ${worst.distance}, y ${worst.sliceY}, lanes ${worst.lanes.join(", ")}` : "none"}.
        </p>
        <p class="hint">${escapeHtml(speedClassSummary)}</p>
        <p class="hint">Director pressure: ${escapeHtml(directorPressure)}.</p>
        <p class="hint">Boost lanes: ${escapeHtml(laneDistribution(director.boostLaneCounts, director.boostLaneDistribution))}</p>
        <p class="hint">Ramp lanes: ${escapeHtml(laneDistribution(director.rampLaneCounts, director.rampLaneDistribution))}</p>
        <p class="hint">Top waves: ${escapeHtml(topList(director.topWaveCounts))}</p>
        <p class="hint">Obstacle mix: ${escapeHtml(topList(director.topObstacleTypes))}</p>
        <p class="hint">Overlap examples: ${escapeHtml(overlapSummary)}</p>
        <p class="hint">
          Checks: zero 5-lane walls ${summary.passDetails.zeroFiveLaneWalls ? "yes" : "no"} · zero overlaps ${summary.passDetails.zeroSameLaneOverlaps ? "yes" : "no"} · zero boost overlaps ${summary.passDetails.zeroBoostOverlaps ? "yes" : "no"} · zero ramp overlaps ${summary.passDetails.zeroRampOverlaps ? "yes" : "no"} · 4-lane rare ${summary.passDetails.fourLaneRare ? "yes" : "no"} · 2/3 common ${summary.passDetails.twoThreeCommon ? "yes" : "no"} · center challenged ${summary.passDetails.centerChallengedRegularly ? "yes" : "no"} · boosts distributed ${summary.passDetails.boostNotMostlyCenter ? "yes" : "no"} · no Arcade dead air ${summary.passDetails.arcadeNoDeadAir ? "yes" : "no"} · Pro/Turbo pressure ${summary.passDetails.proTurboThreeLaneFrequent ? "yes" : "no"} · pattern repeats controlled ${summary.passDetails.repeatedPatternsControlled ? "yes" : "no"}.
        </p>
        <div class="row" style="margin-top:16px">
          <button class="small-button" data-action="runSimulation">Run Again</button>
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
      this.audio.playMusic("race", false);
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
    this.setScreen("title");
    this.audio.stopMusic(0);
    this.audio.playMusic("title", false);
    const player = this.profiles.getCurrentPlayer();
    const selectedSpeedClass = getSpeedClassConfig(this.profiles.data.speedClassId);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel title-panel">
        <div class="title-block">
          <div class="eyebrow">Local-only arcade racer</div>
          <h1 class="game-title">Neon<br>Road<br>Rally</h1>
          <p class="subtitle">Dodge the traffic, hit the boost pads, save three manual boosts for the right moment, and survive Sunset Highway.</p>
          <p class="status-line">${player ? `Current player: ${escapeHtml(player.name)} driving ${escapeHtml(player.car.name)}` : "No player selected yet."}</p>
        </div>
        <div class="menu-stack">
          <div class="speed-class-panel">
            <div class="speed-class-header">
              <span>Race Speed</span>
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
            <p class="hint">Higher speed classes start faster and award higher scores. Arcade is the standard race.</p>
          </div>
          <button class="menu-button primary" data-action="start">Start Game</button>
          <button class="menu-button" data-action="players">Choose/Create Player</button>
          <button class="menu-button" data-action="customize">Customize Car</button>
          <button class="menu-button" data-action="leaderboard">View Top 20 Scores</button>
          <button class="menu-button" data-action="toggleMusic">Music: ${this.audio.musicMuted ? "Muted" : "On"}</button>
          <button class="menu-button" data-action="toggleSfx">SFX: ${this.audio.sfxMuted ? "Muted" : "On"}</button>
          ${this.debugMode ? `<button class="menu-button" data-action="runSimulation">Run Spawn Safety Simulation</button>` : ""}
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
        </div>
      </section>
    `;
    this.bindLayerButtons();
    this.bindTitleAudioControls();
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
          <p class="hint">Profiles live only in this browser through localStorage.</p>
          <div class="field">
            <label for="playerName">New player name</label>
            <input id="playerName" type="text" maxlength="24" value="" placeholder="PLAYER NAME">
          </div>
          <div class="row">
            <button class="small-button" data-action="createPlayer">Create Player</button>
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
    if (input) input.focus();
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
            <input id="carName" type="text" maxlength="24" value="${escapeAttr(car.name)}">
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

  readCarForm() {
    return {
      name: sanitizeName(document.getElementById("carName")?.value, DEFAULT_CAR.name),
      bodyColor: document.getElementById("bodyColor")?.value || DEFAULT_CAR.bodyColor,
      stripeColor: document.getElementById("stripeColor")?.value || DEFAULT_CAR.stripeColor,
      windowColor: document.getElementById("windowColor")?.value || DEFAULT_CAR.windowColor,
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
        <p class="hint">Higher speed classes have higher score multipliers. Top 20 is combined across all race speeds.</p>
        <ol class="leaderboard-list">
          ${entries.length ? entries.map((entry, index) => `
            <li class="leaderboard-item">
              <span class="leaderboard-rank">#${index + 1}</span>
              <span>
                <strong>${escapeHtml(entry.playerName)}</strong>
                <span class="meta">${escapeHtml(entry.carName)} · ${escapeHtml(entry.trackName)} · ${escapeHtml(getSpeedClassLabel(entry.speedClass))} · ${entry.status} · ${formatTime(entry.time)} · ${new Date(entry.date).toLocaleDateString()}</span>
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
    const leaderboard = this.profiles.data.leaderboard.slice(0, 20);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel">
        <h2>${summary.status === "finished" ? "Track Complete" : "Run Over"}</h2>
        <div class="score-grid">
          <div class="score-card"><strong>Final Score</strong><span id="finalScoreValue" class="tally-score" data-final-score="${summary.finalScore}">0</span></div>
          <div class="score-card"><strong>Status</strong><span>${summary.status === "finished" ? "Finished" : `Crashed: ${escapeHtml(summary.reason)}`}</span></div>
          <div class="score-card"><strong>Speed Class</strong><span>${escapeHtml(summary.speedClassLabel)}</span></div>
          <div class="score-card"><strong>Score Multiplier</strong><span>${formatScore(summary.baseScore)} x ${summary.scoreMultiplier.toFixed(2)}</span></div>
          <div class="score-card"><strong>Distance</strong><span>${Math.round(summary.distance).toLocaleString()} / ${summary.trackDistance.toLocaleString()}</span></div>
          <div class="score-card"><strong>Time</strong><span>${formatTime(summary.time)}</span></div>
          <div class="score-card"><strong>Bonuses</strong><span>Finish ${formatScore(summary.bonuses.finish)} · Speed ${formatScore(summary.bonuses.speed)} · Unused Boosts ${formatScore(summary.bonuses.unusedBoosts)}</span></div>
          <div class="score-card"><strong>Driving</strong><span>Clean ${formatScore(summary.bonuses.clean)} · Near Miss ${formatScore(summary.bonuses.nearMiss)} · Penalties -${formatScore(summary.penalties)}</span></div>
          <div class="score-card"><strong>Player Best</strong><span>${formatScore(summary.bestScore)}</span></div>
          <div class="score-card"><strong>Progress</strong><span>${Math.round(summary.progress * 100)}%</span></div>
          <div class="score-card"><strong>Save Status</strong><span>${summary.scoreSaved ? "Saved" : `Debug speed x${summary.debugSpeedScale.toFixed(2)} - not saved`}</span></div>
        </div>
        <div class="row" style="margin:18px 0">
          <button class="small-button" data-action="restart">Restart</button>
          <button class="small-button" data-action="title">Return to Title</button>
          <button class="small-button" data-action="leaderboard">Top 20</button>
        </div>
        <h2>Leaderboard</h2>
        <ol class="leaderboard-list">
          ${leaderboard.map((entry, index) => `
            <li class="leaderboard-item">
              <span class="leaderboard-rank">#${index + 1}</span>
              <span>
                <strong>${escapeHtml(entry.playerName)}</strong>
                <span class="meta">${escapeHtml(entry.carName)} · ${escapeHtml(getSpeedClassLabel(entry.speedClass))} · ${entry.status} · ${formatTime(entry.time)}</span>
              </span>
              <span class="leaderboard-score">${formatScore(entry.score)}</span>
            </li>
          `).join("")}
        </ol>
      </section>
    `;
    this.bindLayerButtons();
    this.animateScoreTally(summary.finalScore);
    if (summary.newHighScore) {
      this.audio.playSfx("newHighScore");
    }
  }

  animateScoreTally(finalScore) {
    const element = document.getElementById("finalScoreValue");
    if (!element) return;
    if (this.scoreTallyFrame) {
      cancelAnimationFrame(this.scoreTallyFrame);
      this.scoreTallyFrame = null;
    }
    if (!ARCADE_FEEL.enabled || ARCADE_FEEL.scoreTallyMs <= 0) {
      element.textContent = formatScore(finalScore);
      return;
    }
    const start = performance.now();
    const duration = ARCADE_FEEL.scoreTallyMs;
    const tick = (now) => {
      if (this.screen !== "score" || !document.body.contains(element)) {
        this.scoreTallyFrame = null;
        return;
      }
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = easeOutCubic(progress);
      element.textContent = formatScore(finalScore * eased);
      if (progress < 1) {
        this.scoreTallyFrame = requestAnimationFrame(tick);
      } else {
        element.textContent = formatScore(finalScore);
        this.scoreTallyFrame = null;
      }
    };
    this.scoreTallyFrame = requestAnimationFrame(tick);
  }

  bindLayerButtons() {
    this.layer.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        this.audio.activate();
        this.audio.playSfx("menu");
        const action = button.dataset.action;
        if (action === "start") this.startRaceFromTitle();
        else if (action === "players") this.showPlayerScreen();
        else if (action === "customize") this.showCustomizeScreen();
        else if (action === "leaderboard") this.showLeaderboard();
        else if (action === "setSpeedClass") this.handleSetSpeedClass(button.dataset.id);
        else if (action === "toggleMusic") this.toggleMusic(true);
        else if (action === "toggleSfx") this.toggleSfx(true);
        else if (action === "runSimulation") this.runSpawnSafetySimulation();
        else if (action === "title") this.showTitle();
        else if (action === "restart") this.startRace();
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
    const name = sanitizeName(input?.value, `PLAYER ${this.profiles.data.players.length + 1}`);
    this.profiles.createPlayer(name);
    this.showPlayerScreen(`${name} is ready.`);
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
    this.showTitle();
  }

  handleResetData() {
    const confirmed = window.confirm("Reset all Neon Road Rally players, car settings, scores, and audio settings?");
    if (!confirmed) return;
    this.profiles.resetAll();
    this.audio.setMusicMuted(false);
    this.audio.setSfxMuted(false);
    this.showTitle();
  }

  toggleMusic(refreshTitle = false) {
    this.audio.setMusicMuted(!this.audio.musicMuted);
    if (!this.audio.musicMuted) {
      if (this.screen === "game" && !this.run.paused) this.audio.playMusic("race", false);
      else this.audio.playMusic("title", false);
    }
    if ((refreshTitle || this.screen === "title") && this.screen === "title") this.showTitle();
  }

  toggleSfx(refreshTitle = false) {
    this.audio.setSfxMuted(!this.audio.sfxMuted);
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
