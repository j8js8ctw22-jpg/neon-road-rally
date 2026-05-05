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
const VIEW_DISTANCE = 1900;
const PLAYER_START_Y_RATIO = 0.82;
const PLAYER_MIN_Y_RATIO = 0.6;
const PLAYER_MAX_Y_RATIO = 0.84;
const DANGER_ZONE_TOP_RATIO = 0.5;
const DANGER_ZONE_BOTTOM_RATIO = 0.95;
const DANGER_ZONE_SLICE_PX = 32;
const FOUR_LANE_PRESSURE_COOLDOWN = 4300;
const TRACKS = [
  {
    id: "sunset-highway",
    name: "Sunset Highway",
    music: "audio/sunset-highway.mp3",
    targetDurationSeconds: 115,
    distanceToFinish: 52000,
    baseSpeed: 290,
    maxSpeed: 640,
    obstacleSettings: {
      earlySpacing: 980,
      lateSpacing: 520,
      firstObstacleAt: 920,
      warningLead: 520
    },
    difficultyCurve(progress) {
      return Math.min(1, Math.max(0, Math.pow(progress, 0.82)));
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
const PLAYER_CANVAS_HITBOX_WIDTH_RATIO = 0.8;
const PLAYER_CANVAS_HITBOX_HEIGHT_RATIO = 0.82;
const PLAYER_SPRITE_HITBOX_WIDTH_RATIO = 0.62;
const PLAYER_SPRITE_HITBOX_HEIGHT_RATIO = 0.56;
const PLAYER_SPRITE_HITBOX_Y_OFFSET_RATIO = -0.06;

const OBSTACLE_INFO = {
  slowCar: { label: "Slow Car", tall: true, crash: true, w: 62, h: 104, hitW: 0.88, hitH: 0.84, hitOffsetY: -0.02 },
  fastCar: { label: "Fast Car", tall: true, crash: true, w: 62, h: 104, hitW: 0.88, hitH: 0.84, hitOffsetY: -0.02 },
  truck: { label: "Truck", tall: true, crash: true, w: 78, h: 142, hitW: 0.9, hitH: 0.82, hitOffsetY: -0.04 },
  deer: { label: "Deer", tall: false, crash: false, w: 72, h: 58, hitW: 0.68, hitH: 0.72, hitOffsetY: 0.02 },
  cone: { label: "Cone", tall: false, crash: false, w: 42, h: 54, hitW: 0.7, hitH: 0.72, hitOffsetY: 0.1 },
  oil: { label: "Oil", tall: false, crash: false, w: 70, h: 42, hitW: 0.82, hitH: 0.58, hitOffsetY: 0 },
  ramp: { label: "Ramp", tall: false, crash: false, w: 80, h: 58, hitW: 0.9, hitH: 0.7, hitOffsetY: 0.06 },
  barrier: { label: "Barrier", tall: true, crash: true, w: 84, h: 70, hitW: 0.9, hitH: 0.7, hitOffsetY: -0.02 },
  boostPad: { label: "Boost Pad", tall: false, crash: false, w: 82, h: 48, hitW: 0.9, hitH: 0.74, hitOffsetY: 0 },
  branch: { label: "Branch", tall: false, crash: false, w: 68, h: 34, hitW: 0.84, hitH: 0.64, hitOffsetY: 0 },
  warning: { label: "Warning", tall: false, crash: false, w: 70, h: 78, hitW: 0, hitH: 0, hitOffsetY: 0 }
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

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
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

  recordScore(entry) {
    const cleanEntry = {
      playerName: sanitizeName(entry.playerName, "PLAYER"),
      carName: sanitizeName(entry.carName, "CAR"),
      trackName: sanitizeName(entry.trackName, "TRACK"),
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
    this.tracks = {
      title: { path: "audio/title-theme.mp3", audio: null, loaded: "untested" },
      race: { path: "audio/sunset-highway.mp3", audio: null, loaded: "untested" }
    };
    this.sfx = {
      boost: { path: "audio/boost.wav", audio: null, loaded: "untested" },
      crash: { path: "audio/crash.wav", audio: null, loaded: "untested" },
      slowdown: { path: "audio/slowdown.wav", audio: null, loaded: "untested" },
      finish: { path: "audio/finish.wav", audio: null, loaded: "untested" },
      menu: { path: "audio/menu-select.wav", audio: null, loaded: "untested" }
    };
  }

  activate() {
    if (this.userActivated) return;
    this.userActivated = true;
  }

  createAudio(entry, loop) {
    if (entry.audio) return entry.audio;
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = Boolean(loop);
    audio.volume = loop ? this.musicVolume : this.sfxVolume;
    audio.addEventListener("canplaythrough", () => {
      entry.loaded = "loaded";
    }, { once: true });
    audio.addEventListener("error", () => {
      entry.loaded = "missing";
    });
    audio.src = entry.path;
    entry.audio = audio;
    return audio;
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
    if (restart) audio.currentTime = 0;
    const promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        entry.loaded = "missing";
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

  playSfx(key) {
    if (!this.userActivated || this.sfxMuted) return;
    const entry = this.sfx[key];
    if (!entry) return;
    const source = this.createAudio(entry, false);
    const audio = source.cloneNode(true);
    audio.volume = this.sfxVolume;
    const promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        entry.loaded = "missing";
      });
    }
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

  sfxLoadedStatus() {
    return Object.entries(this.sfx).map(([key, entry]) => `${key}:${entry.loaded}`).join(" ");
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
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("pointerdown", () => {
      this.game.audio.activate();
      if (this.game.screen === "title") {
        this.game.audio.playMusic("title");
      }
    }, { passive: true });
  }

  onKeyDown(event) {
    const key = event.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Spacebar", "Enter", "Escape"].includes(key)) {
      event.preventDefault();
    }
    this.game.audio.activate();
    if (this.game.screen === "title") {
      this.game.audio.playMusic("title");
    }

    if (key === "`") {
      this.game.debugMode = !this.game.debugMode;
      if (this.game.screen === "title") this.game.showTitle();
      return;
    }

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
    }

    if (this.game.screen === "game") {
      if (key === "Escape") {
        this.game.togglePause();
      } else if (key === "ArrowUp" || key.toLowerCase() === "w") {
        this.heldVerticalKeys.add("up");
        this.updateVerticalInput();
      } else if (key === "ArrowDown" || key.toLowerCase() === "s") {
        this.heldVerticalKeys.add("down");
        this.updateVerticalInput();
      } else if (key === "ArrowLeft" || key.toLowerCase() === "a") {
        this.game.requestLaneMove(-1);
      } else if (key === "ArrowRight" || key.toLowerCase() === "d") {
        this.game.requestLaneMove(1);
      } else if (key === " " || key === "Spacebar") {
        this.game.useManualBoost();
      }
      return;
    }

    if (this.game.screen === "score") {
      if (key === "Enter") {
        this.game.startRace();
      } else if (key === "Escape") {
        this.game.showTitle();
      }
      return;
    }

    if (key === "Enter" && this.game.screen === "title") {
      this.game.startRaceFromTitle();
    } else if (key === "Escape" && !["title", "game"].includes(this.game.screen)) {
      this.game.showTitle();
    }
  }

  onKeyUp(event) {
    const key = event.key;
    if (this.game.screen !== "game") return;
    if (key === "ArrowUp" || key.toLowerCase() === "w") {
      this.heldVerticalKeys.delete("up");
      this.updateVerticalInput();
    } else if (key === "ArrowDown" || key.toLowerCase() === "s") {
      this.heldVerticalKeys.delete("down");
      this.updateVerticalInput();
    }
  }

  clearVerticalInput() {
    this.heldVerticalKeys.clear();
    this.game.setVerticalInput(0);
  }

  updateVerticalInput() {
    const up = this.heldVerticalKeys.has("up");
    const down = this.heldVerticalKeys.has("down");
    this.game.setVerticalInput(up === down ? 0 : (up ? -1 : 1));
  }
}

// ---------------------------------------------------------------------------
// Obstacle manager
// ---------------------------------------------------------------------------

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
  }

  random() {
    return typeof this.game.randomFloat === "function" ? this.game.randomFloat() : Math.random();
  }

  update(dt) {
    const run = this.game.run;
    const track = this.track;
    while (this.nextSpawnDistance < run.distance + VIEW_DISTANCE && this.nextSpawnDistance < track.distanceToFinish - 650) {
      this.spawnPattern(this.nextSpawnDistance);
      const progress = this.nextSpawnDistance / track.distanceToFinish;
      const difficulty = track.difficultyCurve(progress);
      const baseSpacing = lerp(track.obstacleSettings.earlySpacing, track.obstacleSettings.lateSpacing, difficulty);
      this.nextSpawnDistance += baseSpacing + this.random() * lerp(260, 80, difficulty);
    }

    this.obstacles = this.obstacles.filter((obstacle) => {
      const ahead = obstacle.distance - run.distance;
      if (obstacle.type === "deer") {
        this.updateDeer(obstacle, ahead);
      }
      return ahead > -260 && !obstacle.remove;
    });
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
    const track = this.track;
    const run = this.game.run;
    const progress = distance / track.distanceToFinish;
    const difficulty = track.difficultyCurve(progress);
    const safeLane = this.pickSafeLane();
    this.lastPatternSafeLane = safeLane;

    if (distance < 7800) {
      this.spawnEarly(distance, safeLane);
      return;
    }

    const roll = this.random();
    if (progress > 0.78 && distance - this.lastFourLanePressureDistance > FOUR_LANE_PRESSURE_COOLDOWN && roll < 0.055) {
      this.spawnFourLanePressure(distance, safeLane);
    } else if (roll < 0.24) {
      this.spawnVehiclePattern(distance, safeLane, difficulty);
    } else if (roll < 0.42) {
      this.spawnConstructionPattern(distance, safeLane, difficulty);
    } else if (roll < 0.52) {
      this.spawnDeerPattern(distance);
    } else if (roll < 0.68) {
      this.spawnOilOrCones(distance, safeLane, difficulty);
    } else if (roll < 0.79) {
      this.spawnRampChallenge(distance, safeLane);
    } else if (roll < 0.87) {
      this.spawnBoostPad(distance, safeLane);
    } else {
      this.spawnMixedPattern(distance, safeLane, difficulty);
    }

    if (run.distance > 12000 && this.random() < 0.12 + difficulty * 0.1) {
      this.spawnBoostPad(distance + 320, randomChoice([0, 1, 2, 3, 4], () => this.random()));
    }
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

    if (options.allowLaneAdjust !== false && this.isFairnessBlocker(candidate)) {
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
      allowFourLanePressure: Boolean(options.allowFourLanePressure)
    };
  }

  isFairnessBlocker(obstacle) {
    const info = OBSTACLE_INFO[obstacle.type];
    if (!info || obstacle.hit || obstacle.remove) return false;
    if (obstacle.type === "warning" || obstacle.type === "ramp" || obstacle.type === "boostPad") return false;
    return info.crash || ["deer", "cone", "oil", "branch"].includes(obstacle.type);
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
    this.addObstacle("warning", lane, Math.max(80, distance - this.track.obstacleSettings.warningLead), {
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
      const overlaps = rectsOverlap(playerBox, obstacleBox);

      if (overlaps) {
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
        run.nearMisses += 1;
        run.collisionState = `near miss ${info.label}`;
      }
    }
  }

  isNearMiss(playerBox, obstacleBox, obstacle, info) {
    if (!info.tall || obstacle.nearMissAwarded) return false;
    const passedPlayer = obstacleBox.y > playerBox.y + playerBox.h;
    const stillCloseVertically = obstacleBox.y < playerBox.y + playerBox.h + 150;
    const closeHorizontally = rectHorizontalGap(playerBox, obstacleBox) <= 26;
    return passedPlayer && stillCloseVertically && closeHorizontally;
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
      return;
    }

    if (obstacle.type === "boostPad") {
      run.padBoostTimer = Math.max(run.padBoostTimer, 1.25);
      this.game.addScoreEvent("boostPad", 400);
      this.game.audio.playSfx("boost");
      return;
    }

    if (obstacle.type === "oil") {
      run.oilTimer = 2;
      this.game.applySlowdown(0.78, -350, "oil");
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

  getPlayerDriveZone() {
    return {
      minY: this.height * PLAYER_MIN_Y_RATIO,
      maxY: Math.min(this.height * PLAYER_MAX_Y_RATIO, this.height - 58)
    };
  }

  getPlayerScreenY() {
    const run = this.game.run;
    const zone = this.getPlayerDriveZone();
    const baseY = clamp(this.height * run.playerYRatio, zone.minY, zone.maxY);
    return baseY - run.jumpOffset;
  }

  getPlayerHitbox() {
    const run = this.game.run;
    const scale = run.airborne ? PLAYER_AIRBORNE_SCALE : 1;
    const x = this.laneCenter(run.renderLaneFloat);
    const y = this.getPlayerScreenY() - 2 * scale;
    const usesSprite = playerUsesLoadedSprite(run.player.car, this.game.carSprites);
    const size = getPlayerCarDrawSize(run.player.car, {
      airborne: run.airborne,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
    const hitboxWidthRatio = usesSprite ? PLAYER_SPRITE_HITBOX_WIDTH_RATIO : PLAYER_CANVAS_HITBOX_WIDTH_RATIO;
    const hitboxHeightRatio = usesSprite ? PLAYER_SPRITE_HITBOX_HEIGHT_RATIO : PLAYER_CANVAS_HITBOX_HEIGHT_RATIO;
    const hitboxYOffset = usesSprite ? size.h * PLAYER_SPRITE_HITBOX_Y_OFFSET_RATIO : 0;
    return rectFromCenter(x, y + hitboxYOffset, size.w * hitboxWidthRatio, size.h * hitboxHeightRatio);
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

  getObstacleHitboxAt(obstacle, runDistance) {
    const info = OBSTACLE_INFO[obstacle.type];
    if (!info || obstacle.type === "warning" || info.hitW <= 0 || info.hitH <= 0) return null;
    const ahead = obstacle.distance - runDistance;
    if (ahead < -70 || ahead > VIEW_DISTANCE + 160) return null;
    const { x, y, scale } = this.getObstacleScreenPositionAt(obstacle, runDistance);
    return rectFromCenter(
      x,
      y + (info.hitOffsetY || 0) * info.h * scale,
      info.w * scale * info.hitW,
      info.h * scale * info.hitH
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
    sky.addColorStop(0, "#151139");
    sky.addColorStop(0.35, "#35104a");
    sky.addColorStop(0.58, "#11101f");
    sky.addColorStop(1, "#05050a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const sunY = Math.min(190, h * 0.26);
    const sunR = Math.min(118, w * 0.16);
    const sun = ctx.createRadialGradient(w * 0.5, sunY, 10, w * 0.5, sunY, sunR);
    sun.addColorStop(0, "rgba(255, 228, 94, 0.95)");
    sun.addColorStop(0.45, "rgba(255, 123, 84, 0.62)");
    sun.addColorStop(1, "rgba(255, 63, 209, 0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#28f6ff";
    ctx.lineWidth = 1;
    const gridY = Math.max(260, h * 0.43);
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

  drawAttractRoad() {
    const ctx = this.ctx;
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
    const shake = run.crashFlash || 0;
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 14 * shake);
    }
    this.drawRoadBase(1);
    this.drawFinishLineIfVisible();

    const sorted = this.game.obstacles.obstacles.slice().sort((a, b) => b.distance - a.distance);
    for (const obstacle of sorted) {
      const { x, y, scale } = this.getObstacleScreenPosition(obstacle);
      if (y < this.road.y - 110 || y > this.height + 170) continue;
      this.drawObstacle(ctx, obstacle, x, y, scale);
    }

    this.drawSpeedLines();
    this.drawPlayer();
    if (this.game.debugMode) this.drawHitboxOverlay();
    ctx.restore();
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

    const dashHeight = 56;
    const gap = 46;
    const scrollSource = this.game.screen === "game" || this.game.screen === "score"
      ? this.game.run.distance
      : this.game.attractDistance;
    const scroll = (scrollSource * 0.18) % (dashHeight + gap);
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
    ctx.restore();
  }

  drawFinishLineIfVisible() {
    const run = this.game.run;
    const finishDistance = run.track.distanceToFinish;
    if (finishDistance - run.distance > VIEW_DISTANCE) return;
    const y = this.yForDistance(finishDistance);
    drawFinishLine(this.ctx, this.road.x, y, this.road.w, this.scaleForY(y));
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
    ctx.lineWidth = 2;
    this.drawDangerZoneOverlay();
    const playerBox = this.getPlayerHitbox();
    drawHitboxRect(ctx, playerBox, "#28f6ff", "PLAYER");
    for (const obstacle of this.game.obstacles.obstacles) {
      const box = this.getObstacleHitbox(obstacle);
      if (!box) continue;
      if (box.y > this.height + 140 || box.y + box.h < this.road.y - 140) continue;
      const info = OBSTACLE_INFO[obstacle.type];
      const color = info.crash ? "#ff3b58" : (obstacle.type === "ramp" || obstacle.type === "boostPad" ? "#44ff99" : "#ffe45e");
      drawHitboxRect(ctx, box, color, info.label);
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
    if (!(run.boostTimer > 0 || run.padBoostTimer > 0 || run.currentSpeed > run.track.maxSpeed * 0.85)) return;
    const ctx = this.ctx;
    const intensity = run.boostTimer > 0 ? 0.45 : 0.24;
    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.strokeStyle = run.boostTimer > 0 ? "#28f6ff" : "#ffffff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i += 1) {
      const x = this.road.x + Math.random() * this.road.w;
      const y = this.road.y + Math.random() * this.road.h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 70 + Math.random() * 70);
      ctx.stroke();
    }
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
    drawHudLabel(ctx, "TRACK", run.track.name, left + col * 4, 9);

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
    const spriteDebug = getPlayerSpriteDebugInfo(run.player.car, {
      airborne: run.airborne,
      laneWidth: this.road.laneW
    }, this.game.carSprites);
    const lines = [
      "DEBUG `",
      `speed: ${run.currentSpeed.toFixed(1)}`,
      `lane: ${run.targetLane} render ${run.renderLaneFloat.toFixed(2)}`,
      `vertical: ${(run.playerYRatio * 100).toFixed(1)}% input ${run.verticalInput}`,
      `distance: ${run.distance.toFixed(0)}`,
      `obstacles: ${this.game.obstacles.obstacles.length}`,
      `progress: ${(run.distance / run.track.distanceToFinish * 100).toFixed(1)}%`,
      `airborne: ${run.airborne}`,
      `collision: ${run.collisionState}`,
      `last hit: ${run.lastCollision}`,
      `danger max: ${this.game.obstacles.lastSafetySummary?.maxBlocked ?? 0}`,
      `prevented: ${this.game.obstacles.preventedUnsafeSpawns}`,
      `sprite: ${spriteDebug.mode}`,
      `src img: ${spriteDebug.natural}`,
      `opaque: ${spriteDebug.opaque}`,
      `render: ${spriteDebug.render}`,
      `hitbox: ${playerBox.w.toFixed(0)}x${playerBox.h.toFixed(0)}`,
      `save: ${this.game.profiles.saveStatus}`,
      `music: ${this.game.audio.musicLoadedStatus()}`,
      `sfx: ${this.game.audio.sfxLoadedStatus()}`,
      "R restart  F finish  C crash  L scores  P sim"
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

function drawHitboxRect(ctx, box, color, label) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.92;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.globalAlpha = 0.12;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.globalAlpha = 1;
  ctx.font = "10px monospace";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, box.x, box.y - 3);
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

function playerUsesLoadedSprite(carConfig, spriteManager = null) {
  return carConfig.useSprite !== false && Boolean(spriteManager?.getSprite(getCarStyleId(carConfig)));
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
    this.attractDistance = 0;
    this.randomFloat = Math.random;
    this.simulationStatus = null;
    this.simulationRunning = false;
    this.lastFrame = performance.now();
    this.run = this.createEmptyRun();
    this.lastSummary = null;
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
    return {
      player,
      track,
      distance: 0,
      score: 0,
      elapsed: 0,
      targetLane: 2,
      renderLaneFloat: 2,
      playerLaneFloat: 2,
      playerYRatio: PLAYER_START_Y_RATIO,
      targetYRatio: PLAYER_START_Y_RATIO,
      verticalInput: 0,
      laneCooldown: 0,
      queuedLaneMove: 0,
      queuedMoveTimer: 0,
      currentSpeed: track.baseSpeed,
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
      finished: false,
      ended: false,
      endReason: "",
      paused: false
    };
  }

  loop(time) {
    const dt = Math.min(0.05, (time - this.lastFrame) / 1000 || 0);
    this.lastFrame = time;
    if (this.screen === "game" && !this.run.paused && !this.run.ended) {
      this.updateRun(dt);
    } else if (this.screen !== "game") {
      this.attractDistance = (this.attractDistance + dt * 210) % 100000;
    }
    if (this.run.crashFlash > 0) {
      this.run.crashFlash = Math.max(0, this.run.crashFlash - dt * 2.8);
    }
    this.renderer.render();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  updateRun(dt) {
    const run = this.run;
    run.elapsed += dt;
    run.laneCooldown = Math.max(0, run.laneCooldown - dt);
    run.boostTimer = Math.max(0, run.boostTimer - dt);
    run.padBoostTimer = Math.max(0, run.padBoostTimer - dt);
    run.oilTimer = Math.max(0, run.oilTimer - dt);
    run.slowdownTimer = Math.max(0, run.slowdownTimer - dt);

    if (run.queuedMoveTimer > 0) {
      run.queuedMoveTimer -= dt;
      if (run.queuedMoveTimer <= 0 && run.queuedLaneMove !== 0) {
        const direction = run.queuedLaneMove;
        run.queuedLaneMove = 0;
        this.performLaneMove(direction);
      }
    }

    const verticalSpeed = 0.42;
    run.targetYRatio = clamp(
      run.targetYRatio + run.verticalInput * verticalSpeed * dt,
      PLAYER_MIN_Y_RATIO,
      PLAYER_MAX_Y_RATIO
    );
    run.playerYRatio = lerp(run.playerYRatio, run.targetYRatio, clamp(dt * 11, 0, 1));

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
    const difficulty = run.track.difficultyCurve(progress);
    const base = lerp(run.track.baseSpeed, run.track.maxSpeed, difficulty);
    const boostSpeed = run.boostTimer > 0 ? 210 : 0;
    const padBoost = run.padBoostTimer > 0 ? 95 : 0;
    const slowdown = run.slowdownTimer > 0 ? run.slowdownFactor : 1;
    run.currentSpeed = clamp((base + boostSpeed + padBoost) * slowdown, 120, run.track.maxSpeed + 230);
    const distanceDelta = run.currentSpeed * dt;
    run.distance += distanceDelta;
    run.score += distanceDelta * (run.boostTimer > 0 ? 1.6 : 1);
    run.score += run.currentSpeed * dt * 0.04;

    run.renderLaneFloat = lerp(run.renderLaneFloat, run.targetLane, clamp(dt * 12, 0, 1));
    run.playerLaneFloat = run.renderLaneFloat;

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
    this.run = this.createEmptyRun();
    this.run.player = {
      ...player,
      car: { ...DEFAULT_CAR, ...player.car }
    };
    this.run.track = track;
    this.run.currentSpeed = track.baseSpeed;
    if (this.input) this.input.clearVerticalInput();
    this.obstacles.reset(track);
    this.setScreen("game");
    this.clearLayer();
    this.audio.stopMusic(0);
    this.audio.playMusic("race", true);
  }

  requestLaneMove(direction) {
    const run = this.run;
    if (run.paused || run.ended) return;
    if (run.oilTimer > 0) {
      run.queuedLaneMove = direction;
      run.queuedMoveTimer = Math.max(run.queuedMoveTimer, 0.16);
      return;
    }
    this.performLaneMove(direction);
  }

  setVerticalInput(direction) {
    if (!this.run) return;
    this.run.verticalInput = clamp(direction, -1, 1);
  }

  performLaneMove(direction) {
    const run = this.run;
    if (run.laneCooldown > 0) return;
    const nextLane = clamp(run.targetLane + direction, 0, LANES - 1);
    if (nextLane === run.targetLane) return;
    run.targetLane = nextLane;
    run.laneCooldown = run.oilTimer > 0 ? 0.26 : 0.08;
  }

  useManualBoost() {
    const run = this.run;
    if (run.paused || run.ended || run.manualBoosts <= 0) return;
    run.manualBoosts -= 1;
    run.boostTimer = Math.max(run.boostTimer, 2.55);
    this.audio.playSfx("boost");
  }

  launchJump() {
    const run = this.run;
    run.jumpDuration = 0.95;
    run.jumpTimer = run.jumpDuration;
    run.airborne = true;
  }

  applySlowdown(factor, penalty, reason) {
    const run = this.run;
    run.slowdownFactor = Math.min(run.slowdownFactor, factor);
    run.slowdownTimer = Math.max(run.slowdownTimer, 1.45);
    run.cleanTimer = 0;
    run.penalties += Math.abs(penalty);
    run.score = Math.max(0, run.score + penalty);
    run.lastCollision = reason;
    this.audio.playSfx("slowdown");
  }

  addScoreEvent(type, points) {
    const run = this.run;
    run.score += points;
    run.eventScore += points;
    if (run.bonuses[type] !== undefined) {
      run.bonuses[type] += points;
    }
  }

  endRace(status, reason) {
    const run = this.run;
    if (run.ended) return;
    run.ended = true;
    run.finished = status === "finished";
    run.endReason = reason;
    run.crashFlash = status === "crashed" ? 1 : 0;

    if (status === "finished") {
      run.bonuses.finish = 5000;
      run.score += run.bonuses.finish;
      const target = run.track.targetDurationSeconds;
      run.bonuses.speed = Math.max(0, Math.round(3000 * clamp((target - run.elapsed + 18) / target, 0, 1)));
      run.score += run.bonuses.speed;
      this.audio.playSfx("finish");
    } else {
      this.audio.playSfx("crash");
    }

    run.bonuses.unusedBoosts = run.manualBoosts * 750;
    run.score += run.bonuses.unusedBoosts;
    run.score = Math.max(0, Math.round(run.score));
    this.audio.stopMusic(0.28);

    const player = this.profiles.getCurrentPlayer() || this.profiles.ensureDefaultPlayer();
    const entry = this.profiles.recordScore({
      playerName: player.name,
      carName: player.car.name,
      trackName: run.track.name,
      score: run.score,
      status,
      time: run.elapsed
    });

    this.lastSummary = {
      scoreEntry: entry,
      finalScore: run.score,
      distance: Math.min(run.distance, run.track.distanceToFinish),
      progress: clamp(run.distance / run.track.distanceToFinish, 0, 1),
      status,
      reason,
      time: run.elapsed,
      bonuses: { ...run.bonuses },
      penalties: run.penalties,
      bestScore: this.profiles.getCurrentPlayer()?.bestScore || run.score,
      trackDistance: run.track.distanceToFinish
    };

    setTimeout(() => {
      if (this.screen === "game") this.showScoreScreen();
    }, status === "crashed" ? 520 : 420);
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
    const runs = options.runs || 1000;
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
    const invalidExamples = [];

    for (let runIndex = 0; runIndex < runs; runIndex += 1) {
      const seed = `${baseSeed}:${runIndex}`;
      const rng = createSeededRandom(seed);
      const simRun = {
        track,
        distance: 0,
        elapsed: 0,
        currentSpeed: track.baseSpeed
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
        const difficulty = track.difficultyCurve(progress);
        simRun.currentSpeed = lerp(track.baseSpeed, track.maxSpeed, difficulty);
        simRun.distance += simRun.currentSpeed * dt;
        simRun.elapsed += dt;
        manager.update(dt);

        const occupancy = manager.getDangerZoneLaneOccupancy(manager.obstacles, simRun.distance);
        totalSamples += 1;
        const blocked = clamp(occupancy.maxBlocked, 0, 5);
        if (blocked > 0) {
          pressureSamples += 1;
          pressureCounts[blocked] += 1;
        }
        if (blocked > maxBlocked) {
          maxBlocked = blocked;
          worstPressure = this.capturePressureExample(runIndex, seed, simRun, occupancy);
        }
        if (occupancy.invalid) {
          invalidWalls += 1;
          const example = this.capturePressureExample(runIndex, seed, simRun, occupancy);
          if (invalidExamples.length < 8) invalidExamples.push(example);
          if (invalidWalls <= 8) {
            console.warn("Neon Road Rally spawn safety wall", example);
          }
        }
      }
      preventedUnsafeSpawns += manager.preventedUnsafeSpawns;

      if (runIndex > 0 && runIndex % 25 === 0) {
        if (typeof options.onProgress === "function") {
          options.onProgress(runIndex + 1, runs);
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
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
    const pass = invalidWalls === 0
      && maxBlocked <= 4
      && pressureCounts[4] > 0
      && fourLaneRare
      && twoThreeCommon;

    return {
      runs,
      seed: baseSeed,
      invalidWalls,
      maxBlocked,
      pressureCounts,
      pressureSamples,
      totalSamples,
      frequencies,
      worstPressure,
      invalidExamples,
      preventedUnsafeSpawns,
      pass,
      passDetails: {
        zeroFiveLaneWalls: invalidWalls === 0,
        maxAtMostFour: maxBlocked <= 4,
        fourLaneExists: pressureCounts[4] > 0,
        fourLaneRare,
        twoThreeCommon
      }
    };
  }

  capturePressureExample(runIndex, seed, simRun, occupancy) {
    const slice = occupancy.worstSlice || { y: 0, lanes: [], blockers: [] };
    return {
      runIndex,
      seed,
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
        <p class="hint">Running 1,000 deterministic Sunset Highway generations...</p>
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
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel">
        <h2>Spawn Safety Simulation</h2>
        <div class="score-grid">
          <div class="score-card"><strong>Result</strong><span>${summary.pass ? "PASS" : "FAIL"}</span></div>
          <div class="score-card"><strong>Runs</strong><span>${summary.runs.toLocaleString()}</span></div>
          <div class="score-card"><strong>5-Lane Walls</strong><span>${summary.invalidWalls.toLocaleString()}</span></div>
          <div class="score-card"><strong>Max Blocked</strong><span>${summary.maxBlocked}</span></div>
          ${row(1)}
          ${row(2)}
          ${row(3)}
          ${row(4)}
          <div class="score-card"><strong>Prevented Spawns</strong><span>${summary.preventedUnsafeSpawns.toLocaleString()}</span></div>
          <div class="score-card"><strong>Seed</strong><span>${escapeHtml(summary.seed)}</span></div>
        </div>
        <p class="hint">
          Worst pressure: ${worst ? `${worst.maxBlocked} lanes at run ${worst.runIndex}, distance ${worst.distance}, y ${worst.sliceY}, lanes ${worst.lanes.join(", ")}` : "none"}.
        </p>
        <p class="hint">
          Checks: zero 5-lane walls ${summary.passDetails.zeroFiveLaneWalls ? "yes" : "no"} · 4-lane exists ${summary.passDetails.fourLaneExists ? "yes" : "no"} · 4-lane rare ${summary.passDetails.fourLaneRare ? "yes" : "no"} · 2/3 common ${summary.passDetails.twoThreeCommon ? "yes" : "no"}.
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
      this.audio.playMusic("race", false);
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
        <ol class="leaderboard-list">
          ${entries.length ? entries.map((entry, index) => `
            <li class="leaderboard-item">
              <span class="leaderboard-rank">#${index + 1}</span>
              <span>
                <strong>${escapeHtml(entry.playerName)}</strong>
                <span class="meta">${escapeHtml(entry.carName)} · ${escapeHtml(entry.trackName)} · ${entry.status} · ${formatTime(entry.time)} · ${new Date(entry.date).toLocaleDateString()}</span>
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
          <div class="score-card"><strong>Final Score</strong><span>${formatScore(summary.finalScore)}</span></div>
          <div class="score-card"><strong>Status</strong><span>${summary.status === "finished" ? "Finished" : `Crashed: ${escapeHtml(summary.reason)}`}</span></div>
          <div class="score-card"><strong>Distance</strong><span>${Math.round(summary.distance).toLocaleString()} / ${summary.trackDistance.toLocaleString()}</span></div>
          <div class="score-card"><strong>Time</strong><span>${formatTime(summary.time)}</span></div>
          <div class="score-card"><strong>Bonuses</strong><span>Finish ${formatScore(summary.bonuses.finish)} · Speed ${formatScore(summary.bonuses.speed)} · Unused Boosts ${formatScore(summary.bonuses.unusedBoosts)}</span></div>
          <div class="score-card"><strong>Driving</strong><span>Clean ${formatScore(summary.bonuses.clean)} · Near Miss ${formatScore(summary.bonuses.nearMiss)} · Penalties -${formatScore(summary.penalties)}</span></div>
          <div class="score-card"><strong>Player Best</strong><span>${formatScore(summary.bestScore)}</span></div>
          <div class="score-card"><strong>Progress</strong><span>${Math.round(summary.progress * 100)}%</span></div>
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
                <span class="meta">${escapeHtml(entry.carName)} · ${entry.status} · ${formatTime(entry.time)}</span>
              </span>
              <span class="leaderboard-score">${formatScore(entry.score)}</span>
            </li>
          `).join("")}
        </ol>
      </section>
    `;
    this.bindLayerButtons();
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
