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
const GAME_VERSION = "show-build-local";
const PLAYTEST_REPORT_STORAGE_KEY = "neonRoadRally.playtestReports.v1";
const PLAYTEST_REPORT_VERSION = 1;
const PLAYTEST_REPORT_MAX_RUNS = 200;
const LOCAL_PLAYER_NAME_MAX_LENGTH = 20;
const LOCAL_CAR_NAME_MAX_LENGTH = 24;
const ROAD_SEED_MAX_LENGTH = 32;
const DISPLAY_TEXT_MAX_LENGTH = 48;
const STORAGE_ID_MAX_LENGTH = 64;
const LOCAL_PLAYER_MAX_COUNT = 16;
const LEADERBOARD_MAX_ENTRIES = 20;
const LEADERBOARD_IMPORT_SCAN_LIMIT = 200;
const MAX_DISPLAY_SCORE = 999999999;
const BADGE_SAVE_VERSION = 1;
const PLAYER_BADGE_STATS_VERSION = 1;
const BADGE_DEFINITIONS = [
  {
    id: "first_run_posted",
    name: "First Run",
    description: "Post any saved run, finished or crashed.",
    category: "starter",
    difficulty: "Easy",
    hidden: false,
    icon: "RUN"
  },
  {
    id: "first_finish",
    name: "First Finish",
    description: "Finish any race.",
    category: "starter",
    difficulty: "Easy",
    hidden: false,
    icon: "FIN"
  },
  {
    id: "first_personal_best",
    name: "Personal Best",
    description: "Legacy score-screen callout. No longer awarded as a permanent badge.",
    category: "starter",
    difficulty: "Easy",
    hidden: true,
    deprecated: true,
    visible: false,
    icon: "PB"
  },
  {
    id: "top_20_entry",
    name: "Top 20",
    description: "Legacy score-screen callout. No longer awarded as a permanent badge.",
    category: "starter",
    difficulty: "Normal",
    hidden: true,
    deprecated: true,
    visible: false,
    icon: "20"
  },
  {
    id: "sunset_finisher",
    name: "Sunset Finisher",
    description: "Finish Sunset Highway.",
    category: "track",
    difficulty: "Easy",
    hidden: false,
    icon: "SUN"
  },
  {
    id: "redline_finisher",
    name: "Redline Finisher",
    description: "Finish Redline Run.",
    category: "track",
    difficulty: "Normal",
    hidden: false,
    icon: "RED"
  },
  {
    id: "turbo_survivor",
    name: "Turbo Survivor",
    description: "Finish any Turbo race.",
    category: "speed",
    difficulty: "Hard",
    hidden: false,
    icon: "TUR"
  },
  {
    id: "clean_run",
    name: "Clean Run",
    description: "Finish with zero slowdown hits.",
    category: "skill",
    difficulty: "Hard",
    hidden: false,
    icon: "CLN"
  },
  {
    id: "near_miss_streak",
    name: "Near-Miss Streak",
    description: "Earn at least 5 near misses in one run.",
    category: "skill",
    difficulty: "Hard",
    hidden: false,
    icon: "NM"
  },
  {
    id: "fuel_run_finish",
    name: "Fuel Survivor",
    description: "Finish any Fuel Run.",
    category: "fuel",
    difficulty: "Normal",
    hidden: false,
    icon: "FUEL"
  },
  {
    id: "first_challenge",
    name: "Challenge Cleared",
    description: "Complete any Challenge Mode challenge.",
    category: "challenge",
    difficulty: "Normal",
    hidden: false,
    icon: "CH"
  },
  {
    id: "party_starter",
    name: "Party Starter",
    description: "Complete a Party Mode round.",
    category: "party",
    difficulty: "Easy",
    hidden: false,
    icon: "PTY"
  },
  {
    id: "party_regular",
    name: "Party Regular",
    description: "Complete 5 Party runs.",
    category: "party",
    difficulty: "Normal",
    hidden: false,
    icon: "P5"
  },
  {
    id: "party_winner",
    name: "Party Winner",
    description: "Win a Party session.",
    category: "party",
    difficulty: "Normal",
    hidden: false,
    icon: "WIN"
  },
  {
    id: "comeback_driver",
    name: "Comeback Driver",
    description: "Win a Party session after trailing.",
    category: "party",
    difficulty: "Hard",
    hidden: false,
    icon: "BACK"
  },
  {
    id: "best_of_3_winner",
    name: "Best of 3 Winner",
    description: "Win a Best of 3 Party session.",
    category: "party",
    difficulty: "Hard",
    hidden: false,
    icon: "B3"
  },
  {
    id: "overdrive_survivor",
    name: "Overdrive Survivor",
    description: "Finish an Overdrive race.",
    category: "speed",
    difficulty: "Hard",
    hidden: false,
    icon: "OD"
  },
  {
    id: "redline_survivor",
    name: "Redline Survivor",
    description: "Finish Redline race mode.",
    category: "speed",
    difficulty: "Very Hard",
    hidden: false,
    icon: "RL"
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Finish with a very high average speed.",
    category: "speed",
    difficulty: "Very Hard",
    hidden: false,
    icon: "SPD"
  },
  {
    id: "no_boost_turbo",
    name: "Turbo No Boost",
    description: "Finish Turbo or faster without manual boost.",
    category: "speed",
    difficulty: "Very Hard",
    hidden: false,
    icon: "NOB"
  },
  {
    id: "redline_master",
    name: "Redline Master",
    description: "Finish Redline Run on Pro or faster.",
    category: "track",
    difficulty: "Hard",
    hidden: false,
    icon: "RDM"
  },
  {
    id: "sunset_master",
    name: "Sunset Master",
    description: "Finish Sunset Highway on Pro or faster.",
    category: "track",
    difficulty: "Hard",
    hidden: false,
    icon: "SUM"
  },
  {
    id: "fuel_clutch",
    name: "Fuel Clutch",
    description: "Finish Fuel Run with 10 or less fuel.",
    category: "fuel",
    difficulty: "Hard",
    hidden: false,
    icon: "F10"
  },
  {
    id: "fuel_hoarder",
    name: "Fuel Hoarder",
    description: "Finish Fuel Run with 40 or more fuel.",
    category: "fuel",
    difficulty: "Hard",
    hidden: false,
    icon: "F40"
  },
  {
    id: "gas_gremlin",
    name: "Gas Grabber",
    description: "Collect 5 gas cans in one Fuel Run.",
    category: "fuel",
    difficulty: "Normal",
    hidden: false,
    icon: "GAS"
  },
  {
    id: "boost_saver",
    name: "Boost Saver",
    description: "Save 10 fuel with manual boosts in one Fuel Run.",
    category: "fuel",
    difficulty: "Hard",
    hidden: false,
    icon: "SAVE"
  },
  {
    id: "ramp_rider",
    name: "Ramp Rider",
    description: "Use 5 ramps in one run.",
    category: "skill",
    difficulty: "Normal",
    hidden: false,
    icon: "RMP"
  },
  {
    id: "jump_master",
    name: "Jump Master",
    description: "Clear 5 ramp targets in one run.",
    category: "skill",
    difficulty: "Hard",
    hidden: false,
    icon: "JMP"
  },
  {
    id: "near_miss_10",
    name: "Near-Miss 10",
    description: "Earn 10 near misses in one run.",
    category: "skill",
    difficulty: "Very Hard",
    hidden: false,
    icon: "NM10"
  },
  {
    id: "clean_turbo",
    name: "Clean Turbo",
    description: "Finish Turbo or faster with zero slowdown hits.",
    category: "skill",
    difficulty: "Very Hard",
    hidden: false,
    icon: "CT"
  },
  {
    id: "no_boost_finish",
    name: "No Boost Finish",
    description: "Finish Pro or faster without manual boost.",
    category: "skill",
    difficulty: "Hard",
    hidden: false,
    icon: "NB"
  },
  {
    id: "comeback_finish",
    name: "Clutch Finish",
    description: "Finish Fuel Run after dipping below 25 fuel.",
    category: "skill",
    difficulty: "Very Hard",
    hidden: false,
    icon: "CLT"
  },
  {
    id: "challenge_regular",
    name: "Challenge Regular",
    description: "Complete 3 challenges.",
    category: "challenge",
    difficulty: "Normal",
    hidden: false,
    icon: "C3"
  },
  {
    id: "challenge_ace",
    name: "Challenge Ace",
    description: "Complete 8 challenges.",
    category: "challenge",
    difficulty: "Very Hard",
    hidden: false,
    icon: "C8"
  },
  {
    id: "daredevil",
    name: "Daredevil",
    description: "Complete any Dare difficulty challenge.",
    category: "challenge",
    difficulty: "Very Hard",
    hidden: false,
    icon: "DARE"
  },
  {
    id: "first_redline_challenge",
    name: "Redline Challenger",
    description: "Complete a Redline Run challenge.",
    category: "challenge",
    difficulty: "Hard",
    hidden: false,
    icon: "RCH"
  }
];
const BADGE_DEFINITION_BY_ID = Object.fromEntries(BADGE_DEFINITIONS.map((badge) => [badge.id, badge]));
const BADGE_CATEGORY_FILTERS = [
  { id: "all", label: "All" },
  { id: "starter", label: "Starter" },
  { id: "party", label: "Party" },
  { id: "speed", label: "Speed" },
  { id: "skill", label: "Skill" },
  { id: "track", label: "Track" },
  { id: "fuel", label: "Fuel" },
  { id: "challenge", label: "Challenge" }
];
const BADGE_CATEGORY_LABELS = Object.fromEntries(BADGE_CATEGORY_FILTERS.map((filter) => [filter.id, filter.label]));
const PLAYER_CHALLENGE_SAVE_VERSION = 1;
const TITLE_DEFINITIONS = [
  {
    id: "sunset_champion",
    name: "Sunset Champion",
    description: "Highest saved Classic score on Sunset Highway.",
    context: "Sunset Highway Classic",
    icon: "SUN"
  },
  {
    id: "redline_champion",
    name: "Redline Champion",
    description: "Highest saved Classic score on Redline Run.",
    context: "Redline Run Classic",
    icon: "RED"
  },
  {
    id: "turbo_champion",
    name: "Turbo Champion",
    description: "Highest saved score from any Turbo run.",
    context: "Turbo runs",
    icon: "TUR"
  },
  {
    id: "fuel_champion",
    name: "Fuel Champion",
    description: "Highest saved score from any Fuel Run.",
    context: "Fuel Run",
    icon: "FUEL"
  },
  {
    id: "challenge_champion",
    name: "Challenge Champion",
    description: "Most completed challenges, then highest total best challenge score.",
    context: "Challenge Mode",
    icon: "CH"
  },
  {
    id: "clean_champion",
    name: "Clean Champion",
    description: "Highest saved score on a finished clean run with zero slowdown hits.",
    context: "Finished clean runs",
    icon: "CLN"
  }
];
const TITLE_DEFINITION_BY_ID = Object.fromEntries(TITLE_DEFINITIONS.map((title) => [title.id, title]));
const LANES = 5;
const CAMERA_CONFIG = {
  originalViewDistance: 1700,
  previousViewDistance: 2400,
  visibleLookaheadDistance: 6500,
  vehicleScale: 0.64,
  hazardScale: 0.74,
  playerYRatio: 0.88,
  playerMinYRatio: 0.64,
  playerMaxYRatio: 0.91,
  roadWidthRatio: 0.78,
  roadMaxWidth: 700,
  roadTopMargin: 60,
  compactRoadTopMargin: 58,
  roadBottomMargin: 8,
  perspectiveStrength: 0.85,
  gameplayProjectionMode: "linear",
  gameplayProjectionStrength: 1,
  scalePerspectiveStrength: 0.85,
  farScale: 0.5,
  nearScale: 0.94,
  hudHeight: 58
};
const VIEW_DISTANCE = CAMERA_CONFIG.visibleLookaheadDistance;
const PLAYER_START_Y_RATIO = CAMERA_CONFIG.playerYRatio;
const PLAYER_MIN_Y_RATIO = CAMERA_CONFIG.playerMinYRatio;
const PLAYER_MAX_Y_RATIO = CAMERA_CONFIG.playerMaxYRatio;
const DANGER_ZONE_TOP_RATIO = 0.5;
const DANGER_ZONE_BOTTOM_RATIO = 0.95;
const DANGER_ZONE_SLICE_PX = 32;
const HARD_BLOCKER_WALL_CONFIG = {
  tacticalTopRatio: 0.16,
  tacticalBottomRatio: 0.97,
  screenSlicePx: 24,
  debugLogDistanceGap: 900
};
const ROAD_READABILITY_CONFIG = {
  sameRowBandWorld: 210,
  sameRowOpeningHardLimit: 2,
  sameRowHardLimit: 3,
  routeNearDistance: 260,
  routeLookaheadRatio: 0.88,
  routeBandWorld: 420,
  routeLaneStep: 1,
  minorPressureSpawnScale: {
    sunday: 0.88,
    rookie: 0.72,
    arcade: 0.52,
    pro: 0.38,
    turbo: 0.28,
    overdrive: 0.22,
    redline: 0.16
  },
  denseTrafficMinorScale: 0.28,
  fuelMinorHazardScale: 0,
  rampTargetMinGap: 470,
  rampTargetMaxGap: 840,
  rampClearDistance: 1380,
  rampLandingSafetyDistance: 420,
  rampLandingClearDistance: 1380,
  rampMinAirborneDuration: 0.74,
  rampMaxAirborneDuration: 1.35,
  rampLandingGraceSeconds: 0.08,
  rampPathCollectibleSafetyDistance: 180,
  routeTimingBufferSeconds: 0.18,
  routeTimingLookaheadSeconds: 2.4
};
const TRAFFIC_MOTION_CONFIG = {
  vehicleRelativeSpeed: 0
};
const START_CLEAR_CONFIG = {
  minVisibleAheadRatio: 0.86,
  targetVisibleAheadRatio: 0.94,
  maxVisibleAheadRatio: 0.98,
  enforceElapsedSeconds: 0.35,
  clearSecondsByMode: {
    sunday: 3.6,
    rookie: 3.45,
    arcade: 3.3,
    pro: 3.15,
    turbo: 3.05,
    overdrive: 2.95,
    redline: 2.85
  }
};
const LAUNCH_PACING_CONFIG = {
  firstWindowSeconds: 10,
  preloadBeyondLaunchDistance: 1100,
  default: {
    spawnLeadSeconds: 5.2,
    spacingMultiplier: 1.1,
    randomSecondsMultiplier: 1.08,
    pressureBudgetMultiplier: 1,
    pressureBudgetAllowance: null,
    forceMeaningfulMultiplier: 1,
    centerChallengeStartProgress: 0.16,
    softCenterStartProgress: 0.2,
    minorScaleMultiplier: 0.72,
    boostWeightMultiplier: 0.7,
    rampWeightMultiplier: 0.75
  },
  pro: {
    spawnLeadSeconds: 3.5,
    spacingMultiplier: 1.42,
    randomSecondsMultiplier: 1.48,
    pressureBudgetMultiplier: 0.76,
    pressureBudgetAllowance: 1.08,
    forceMeaningfulMultiplier: 1.5,
    centerChallengeStartProgress: 0.18,
    softCenterStartProgress: 0.22,
    minorScaleMultiplier: 0.32,
    boostWeightMultiplier: 0.28,
    rampWeightMultiplier: 0.55
  },
  turbo: {
    spawnLeadSeconds: 3.25,
    spacingMultiplier: 1.74,
    randomSecondsMultiplier: 1.85,
    pressureBudgetMultiplier: 0.62,
    pressureBudgetAllowance: 1.05,
    forceMeaningfulMultiplier: 1.8,
    centerChallengeStartProgress: 0.18,
    softCenterStartProgress: 0.22,
    minorScaleMultiplier: 0.2,
    boostWeightMultiplier: 0.18,
    rampWeightMultiplier: 0.45
  },
  overdrive: {
    spawnLeadSeconds: 3.05,
    spacingMultiplier: 2,
    randomSecondsMultiplier: 2.1,
    pressureBudgetMultiplier: 0.56,
    pressureBudgetAllowance: 1.03,
    forceMeaningfulMultiplier: 2,
    centerChallengeStartProgress: 0.19,
    softCenterStartProgress: 0.23,
    minorScaleMultiplier: 0.16,
    boostWeightMultiplier: 0.16,
    rampWeightMultiplier: 0.42
  },
  redline: {
    spawnLeadSeconds: 2.95,
    spacingMultiplier: 2.24,
    randomSecondsMultiplier: 2.35,
    pressureBudgetMultiplier: 0.52,
    pressureBudgetAllowance: 1.02,
    forceMeaningfulMultiplier: 2.15,
    centerChallengeStartProgress: 0.2,
    softCenterStartProgress: 0.24,
    minorScaleMultiplier: 0.12,
    boostWeightMultiplier: 0.14,
    rampWeightMultiplier: 0.38
  }
};
const SPAWN_VISIBILITY_CONFIG = {
  revealBufferWorld: 1100,
  revealBufferSeconds: 0.65,
  maxWavesPerFrame: 1,
  transitionGuardSeconds: 3,
  transitionGuardSpawnLeadSeconds: 3.8
};
const ACTIVE_FIELD_BUDGET_CONFIG = {
  sampleStepWorld: 260,
  spawnDelaySeconds: 0.42,
  routeScanMinHardBlockers: 3,
  supportSuppressVisibleRatio: 0.78,
  default: {
    minVisibleMeaningful: 2,
    targetVisibleMeaningful: 3,
    maxUpcomingDecisionGapSeconds: 2,
    deadScreenLimitSeconds: 2,
    lonelyObjectLimitSeconds: 1.35,
    maxVisibleHardBlockers: 5,
    maxTacticalHardBlockers: 5,
    maxHardBlockersNext3Seconds: 4,
    maxHardBlockersInTwoSeconds: 4,
    maxHardBlockersInThreeLaneNeighborhood: 4,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 4,
    spikeVisibleHardBlockers: 5
  },
  sunday: {
    minVisibleMeaningful: 1,
    targetVisibleMeaningful: 2,
    maxUpcomingDecisionGapSeconds: 3.8,
    deadScreenLimitSeconds: 3.8,
    lonelyObjectLimitSeconds: 2.2,
    maxVisibleHardBlockers: 4,
    maxTacticalHardBlockers: 3,
    maxHardBlockersNext3Seconds: 3,
    maxHardBlockersInTwoSeconds: 3,
    maxHardBlockersInThreeLaneNeighborhood: 3,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 3,
    spikeVisibleHardBlockers: 4
  },
  rookie: {
    minVisibleMeaningful: 1,
    targetVisibleMeaningful: 2,
    maxUpcomingDecisionGapSeconds: 3,
    deadScreenLimitSeconds: 3,
    lonelyObjectLimitSeconds: 1.8,
    maxVisibleHardBlockers: 4,
    maxTacticalHardBlockers: 4,
    maxHardBlockersNext3Seconds: 4,
    maxHardBlockersInTwoSeconds: 3,
    maxHardBlockersInThreeLaneNeighborhood: 3,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 3,
    spikeVisibleHardBlockers: 4
  },
  arcade: {
    minVisibleMeaningful: 2,
    targetVisibleMeaningful: 3,
    maxUpcomingDecisionGapSeconds: 2,
    deadScreenLimitSeconds: 2,
    lonelyObjectLimitSeconds: 1.35,
    maxVisibleHardBlockers: 5,
    maxTacticalHardBlockers: 5,
    maxHardBlockersNext3Seconds: 4,
    maxHardBlockersInTwoSeconds: 4,
    maxHardBlockersInThreeLaneNeighborhood: 4,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 4,
    spikeVisibleHardBlockers: 5
  },
  pro: {
    minVisibleMeaningful: 3,
    targetVisibleMeaningful: 4,
    maxUpcomingDecisionGapSeconds: 1.5,
    deadScreenLimitSeconds: 1.5,
    lonelyObjectLimitSeconds: 1.05,
    maxVisibleHardBlockers: 6,
    maxTacticalHardBlockers: 6,
    maxHardBlockersNext3Seconds: 5,
    maxHardBlockersInTwoSeconds: 4,
    maxHardBlockersInThreeLaneNeighborhood: 4,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 5,
    spikeVisibleHardBlockers: 6
  },
  turbo: {
    minVisibleMeaningful: 3,
    targetVisibleMeaningful: 4,
    maxUpcomingDecisionGapSeconds: 1.2,
    deadScreenLimitSeconds: 1.2,
    lonelyObjectLimitSeconds: 0.9,
    maxVisibleHardBlockers: 6,
    maxTacticalHardBlockers: 6,
    maxHardBlockersNext3Seconds: 5,
    maxHardBlockersInTwoSeconds: 4,
    maxHardBlockersInThreeLaneNeighborhood: 4,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 5,
    spikeVisibleHardBlockers: 7
  },
  overdrive: {
    minVisibleMeaningful: 3,
    targetVisibleMeaningful: 4,
    maxUpcomingDecisionGapSeconds: 1.05,
    deadScreenLimitSeconds: 1.05,
    lonelyObjectLimitSeconds: 0.82,
    maxVisibleHardBlockers: 6,
    maxTacticalHardBlockers: 6,
    maxHardBlockersNext3Seconds: 5,
    maxHardBlockersInTwoSeconds: 4,
    maxHardBlockersInThreeLaneNeighborhood: 4,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 5,
    spikeVisibleHardBlockers: 7
  },
  redline: {
    minVisibleMeaningful: 3,
    targetVisibleMeaningful: 4,
    maxUpcomingDecisionGapSeconds: 0.95,
    deadScreenLimitSeconds: 0.95,
    lonelyObjectLimitSeconds: 0.75,
    maxVisibleHardBlockers: 6,
    maxTacticalHardBlockers: 6,
    maxHardBlockersNext3Seconds: 5,
    maxHardBlockersInTwoSeconds: 4,
    maxHardBlockersInThreeLaneNeighborhood: 4,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 5,
    spikeVisibleHardBlockers: 7
  },
  fuelRun: {
    minVisibleMeaningful: 2,
    targetVisibleMeaningful: 3,
    maxVisibleHardBlockers: 6,
    maxTacticalHardBlockers: 5,
    maxHardBlockersNext3Seconds: 5,
    maxHardBlockersInTwoSeconds: 4,
    maxHardBlockersInThreeLaneNeighborhood: 4,
    maxVisibleHardWaveOverlap: 2,
    spawnDelayVisibleHardBlockers: 5,
    spikeVisibleHardBlockers: 6
  }
};
const ROAD_DIRECTOR_ACTIVITY_CONFIG = {
  upcomingWindowSeconds: 3.2,
  correctionLeadSeconds: 0.15,
  correctionCooldownSeconds: 0.65,
  noActivityWeightThreshold: 0.85,
  lonelyDistantAheadRatio: 0.68,
  sectionMultipliers: {
    launch: { min: 1, target: 0.9, maxUpcomingDecisionGap: 0.95 },
    groove: { min: 1, target: 1, maxUpcomingDecisionGap: 1 },
    pressure: { min: 1.12, target: 1.14, maxUpcomingDecisionGap: 0.86 },
    breather: { min: 1, target: 0.82, maxUpcomingDecisionGap: 1.08 },
    finalPush: { min: 1.18, target: 1.22, maxUpcomingDecisionGap: 0.78 }
  },
  rewardRoles: ["boostPad", "ramp", "gasCan"]
};
const ROAD_DIRECTOR_WAVE_METADATA = {
  singleBlocker: {
    id: "singleBlocker",
    displayName: "Single Blocker",
    family: "light-gate",
    intent: "keep the road awake",
    requiredAction: "read one lane",
    routeType: "single lane avoid",
    rewardType: "",
    pressureRating: 1,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["launch", "groove"]
  },
  doubleGate: {
    id: "doubleGate",
    displayName: "Double Gate",
    family: "lane-change",
    intent: "create a readable two-lane gate",
    requiredAction: "choose the open route",
    routeType: "side escape",
    rewardType: "",
    pressureRating: 2,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["launch", "groove", "pressure"]
  },
  offsetPair: {
    id: "offsetPair",
    displayName: "Offset Pair",
    family: "lane-change",
    intent: "stagger a lane-read decision",
    requiredAction: "time a lane change",
    routeType: "staggered escape",
    rewardType: "",
    pressureRating: 2,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["groove", "pressure"]
  },
  centerBlock: {
    id: "centerBlock",
    displayName: "Center Block",
    family: "lane-change",
    intent: "challenge center camping",
    requiredAction: "leave center lane",
    routeType: "side escape",
    rewardType: "boost",
    pressureRating: 2,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["groove", "pressure", "finalPush"]
  },
  leftRightSweep: {
    id: "leftRightSweep",
    displayName: "Left-Right Sweep",
    family: "lane-change",
    intent: "sweep pressure across the road",
    requiredAction: "read staggered lane changes",
    routeType: "moving gap",
    rewardType: "",
    pressureRating: 3,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["pressure", "finalPush"]
  },
  constructionSqueeze: {
    id: "constructionSqueeze",
    displayName: "Construction Squeeze",
    family: "squeeze",
    intent: "narrow the route with warning",
    requiredAction: "commit to the signed lane",
    routeType: "announced side escape",
    rewardType: "",
    pressureRating: 3,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["pressure", "finalPush"]
  },
  deerCrossing: {
    id: "deerCrossing",
    displayName: "Deer Crossing",
    family: "hazard-read",
    intent: "add a purposeful crossing hazard",
    requiredAction: "anticipate crossing movement",
    routeType: "timed center read",
    rewardType: "",
    pressureRating: 2,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["groove", "pressure"]
  },
  rampEscape: {
    id: "rampEscape",
    displayName: "Ramp Escape",
    family: "solution",
    intent: "offer jump solution",
    requiredAction: "align with ramp",
    routeType: "jump route",
    rewardType: "safe jump",
    pressureRating: 2,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["breather", "pressure"]
  },
  boostTemptation: {
    id: "boostTemptation",
    displayName: "Boost Temptation",
    family: "reward",
    intent: "tempt risky lane choice",
    requiredAction: "optional side route",
    routeType: "reward side route",
    rewardType: "boost",
    pressureRating: 2,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["groove", "breather", "pressure"]
  },
  nearMissCorridor: {
    id: "nearMissCorridor",
    displayName: "Near-Miss Corridor",
    family: "near-miss",
    intent: "create a close readable traffic corridor",
    requiredAction: "hold or shift into the corridor",
    routeType: "corridor",
    rewardType: "near miss",
    pressureRating: 4,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["pressure", "finalPush"]
  },
  fourLaneSpike: {
    id: "fourLaneSpike",
    displayName: "Four-Lane Spike",
    family: "spike",
    intent: "brief peak pressure with one readable lane",
    requiredAction: "commit to the escape lane",
    routeType: "single escape",
    rewardType: "",
    pressureRating: 5,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["finalPush"]
  },
  redlineSlalom: {
    id: "redlineSlalom",
    displayName: "Redline Slalom",
    family: "speed-skill",
    intent: "high-speed lane reading",
    requiredAction: "staggered lane changes",
    routeType: "slalom",
    rewardType: "boost",
    pressureRating: 3,
    trackAffinity: ["redline-run"],
    sectionAffinity: ["groove", "pressure", "finalPush"]
  },
  speedGateChain: {
    id: "speedGateChain",
    displayName: "Speed Gate Chain",
    family: "reward",
    intent: "chain boost choices through traffic",
    requiredAction: "follow the boost route",
    routeType: "reward chain",
    rewardType: "boost",
    pressureRating: 2,
    trackAffinity: ["redline-run"],
    sectionAffinity: ["groove", "pressure"]
  },
  expressConvoy: {
    id: "expressConvoy",
    displayName: "Express Convoy",
    family: "speed-skill",
    intent: "build a fast traffic corridor",
    requiredAction: "read fast staggered traffic",
    routeType: "fast corridor",
    rewardType: "boost",
    pressureRating: 3,
    trackAffinity: ["redline-run"],
    sectionAffinity: ["pressure", "finalPush"]
  },
  neonChicane: {
    id: "neonChicane",
    displayName: "Neon Chicane",
    family: "speed-skill",
    intent: "force a clean high-speed chicane",
    requiredAction: "change lanes through gates",
    routeType: "chicane",
    rewardType: "boost",
    pressureRating: 3,
    trackAffinity: ["redline-run"],
    sectionAffinity: ["pressure", "finalPush"]
  },
  rampOverpass: {
    id: "rampOverpass",
    displayName: "Ramp Overpass",
    family: "solution",
    intent: "make the ramp the authored solution",
    requiredAction: "align with ramp",
    routeType: "jump route",
    rewardType: "safe jump",
    pressureRating: 2,
    trackAffinity: ["redline-run"],
    sectionAffinity: ["pressure", "breather"]
  },
  needleThread: {
    id: "needleThread",
    displayName: "Needle Thread",
    family: "precision",
    intent: "ask for a narrow committed read",
    requiredAction: "thread the clear lane",
    routeType: "narrow route",
    rewardType: "boost",
    pressureRating: 4,
    trackAffinity: ["redline-run"],
    sectionAffinity: ["pressure", "finalPush"]
  },
  fuelTrafficPressure: {
    id: "fuelTrafficPressure",
    displayName: "Fuel Traffic Pressure",
    family: "fuel-pressure",
    intent: "keep traffic pressure between fuel choices",
    requiredAction: "read traffic",
    routeType: "traffic gate",
    rewardType: "",
    pressureRating: 3,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["groove", "pressure"]
  },
  fuelSideTemptation: {
    id: "fuelSideTemptation",
    displayName: "Gas Can Side Temptation",
    family: "fuel-route",
    intent: "place fuel as a side-lane choice",
    requiredAction: "leave the easy lane for gas",
    routeType: "fuel side route",
    rewardType: "gas",
    pressureRating: 2,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["groove", "breather", "pressure"]
  },
  fuelTrafficGate: {
    id: "fuelTrafficGate",
    displayName: "Traffic Gate + Fuel",
    family: "fuel-route",
    intent: "route fuel through a readable traffic gate",
    requiredAction: "choose the fuel lane",
    routeType: "fuel gate",
    rewardType: "gas",
    pressureRating: 3,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["pressure", "finalPush"]
  },
  fuelAfterPressure: {
    id: "fuelAfterPressure",
    displayName: "Fuel After Pressure",
    family: "fuel-route",
    intent: "reward a safe route after pressure",
    requiredAction: "recover toward gas",
    routeType: "recovery fuel route",
    rewardType: "gas",
    pressureRating: 3,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["breather", "pressure"]
  },
  fuelSplit: {
    id: "fuelSplit",
    displayName: "Fuel Split",
    family: "fuel-route",
    intent: "offer two fuel choices around traffic",
    requiredAction: "pick a gas lane",
    routeType: "split fuel route",
    rewardType: "gas",
    pressureRating: 2,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["groove", "breather"]
  },
  fuelLowRescue: {
    id: "fuelLowRescue",
    displayName: "Low Fuel Rescue",
    family: "fuel-route",
    intent: "surface an urgent gas route",
    requiredAction: "reach the gas can",
    routeType: "rescue route",
    rewardType: "gas",
    pressureRating: 2,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["groove", "pressure", "finalPush"]
  },
  fuelSupport: {
    id: "fuelSupport",
    displayName: "Fuel Support",
    family: "reward",
    intent: "add light reward pressure",
    requiredAction: "optional reward route",
    routeType: "light reward route",
    rewardType: "boost",
    pressureRating: 1,
    trackAffinity: ["sunset-highway"],
    sectionAffinity: ["breather", "groove"]
  },
  recoveryGap: {
    id: "recoveryGap",
    displayName: "Recovery Gap",
    family: "recovery",
    intent: "short breathing room",
    requiredAction: "none/light",
    routeType: "open road",
    rewardType: "boost/gas",
    pressureRating: 0,
    trackAffinity: ["sunset-highway", "redline-run"],
    sectionAffinity: ["breather", "launch"]
  }
};
const ROAD_DIRECTOR_INTENT_LABELS = {
  maintainPressure: "Maintain Pressure",
  forceLaneChange: "Force Lane Change",
  challengeCenterLane: "Challenge Center Lane",
  rewardTemptation: "Create Reward Temptation",
  rampSolution: "Create Ramp Solution",
  gasRoute: "Create Gas Route",
  nearMissOpportunity: "Create Near-Miss Opportunity",
  recovery: "Provide Short Recovery",
  escalateSection: "Escalate Section",
  finalPushPressure: "Final Push Pressure"
};
const ROAD_DIRECTOR_INTENT_WAVE_WEIGHTS = {
  maintainPressure: {
    singleBlocker: 1.25,
    doubleGate: 1.35,
    offsetPair: 1.25,
    redlineSlalom: 1.25,
    fuelTrafficPressure: 1.5,
    recoveryGap: 0.25
  },
  forceLaneChange: {
    doubleGate: 1.65,
    offsetPair: 1.75,
    leftRightSweep: 1.7,
    rampEscape: 1.25,
    redlineSlalom: 1.55,
    neonChicane: 1.45,
    recoveryGap: 0.18
  },
  challengeCenterLane: {
    centerBlock: 2.35,
    constructionSqueeze: 1.35,
    nearMissCorridor: 1.45,
    doubleGate: 1.2,
    fuelTrafficGate: 1.35,
    recoveryGap: 0.12
  },
  rewardTemptation: {
    boostTemptation: 2.25,
    speedGateChain: 1.9,
    rampEscape: 1.3,
    fuelSideTemptation: 1.75,
    fuelSupport: 1.4,
    recoveryGap: 0.55
  },
  rampSolution: {
    rampEscape: 2.35,
    rampOverpass: 2.05,
    boostTemptation: 0.85,
    recoveryGap: 0.3
  },
  gasRoute: {
    fuelTrafficGate: 2.35,
    fuelSideTemptation: 2.15,
    fuelAfterPressure: 1.7,
    fuelSplit: 1.45,
    fuelLowRescue: 2.6,
    fuelTrafficPressure: 0.75,
    recoveryGap: 0.25
  },
  nearMissOpportunity: {
    nearMissCorridor: 2.2,
    expressConvoy: 1.8,
    needleThread: 1.55,
    redlineSlalom: 1.45,
    recoveryGap: 0.1
  },
  recovery: {
    recoveryGap: 2.6,
    boostTemptation: 0.85,
    rampEscape: 0.85,
    speedGateChain: 0.75,
    fuelSupport: 1.1,
    fourLaneSpike: 0,
    needleThread: 0.25,
    nearMissCorridor: 0.35
  },
  escalateSection: {
    leftRightSweep: 1.55,
    constructionSqueeze: 1.35,
    nearMissCorridor: 1.45,
    redlineSlalom: 1.45,
    neonChicane: 1.25,
    fuelTrafficPressure: 1.3,
    recoveryGap: 0.22
  },
  finalPushPressure: {
    centerBlock: 1.5,
    leftRightSweep: 1.65,
    nearMissCorridor: 1.75,
    redlineSlalom: 1.6,
    expressConvoy: 1.55,
    needleThread: 1.45,
    fuelTrafficGate: 1.45,
    recoveryGap: 0.12
  }
};
const FOUR_LANE_PRESSURE_COOLDOWN = 9000;
const DEFAULT_SPEED_CLASS_ID = "arcade";
const DEFAULT_RACE_TYPE_ID = "classic";
const FUEL_RUN_RACE_TYPE_ID = "fuelRun";
const DEFAULT_TRACK_ID = "sunset-highway";
const ROAD_SEED_PREFIXES = ["SUNSET", "TURBO", "ROAD", "NEON", "RALLY", "LANE", "BOOST"];
const DEFAULT_ROAD_SEED = "ROAD-52819";
const CLASSIC_SEED_LABEL = "Classic";
const PARTY_MIN_PLAYERS = 2;
const PARTY_MAX_PLAYERS = 8;
const PARTY_ROUND_TYPE_ONE_RUN = "oneRunEach";
const PARTY_ROUND_TYPE_BEST_OF_3 = "bestOf3";
const PARTY_ROUND_TYPE_TOTAL_SCORE = "totalScore";
const PARTY_SEED_MODE_SAME_ROUND = "sameSeedForRound";
const PARTY_SEED_MODE_NEW_ROUND = "newSeedEachRound";
const PARTY_ROUND_TYPES = [
  { id: PARTY_ROUND_TYPE_ONE_RUN, label: "One Run Each", totalRounds: 1, scoringLabel: "Best Score" },
  { id: PARTY_ROUND_TYPE_BEST_OF_3, label: "Best of 3", totalRounds: 3, scoringLabel: "Best Score" },
  { id: PARTY_ROUND_TYPE_TOTAL_SCORE, label: "Total Score", totalRounds: 3, scoringLabel: "Total Score" }
];
const PARTY_SEED_MODES = [
  { id: PARTY_SEED_MODE_SAME_ROUND, label: "Same Seed for Round" },
  { id: PARTY_SEED_MODE_NEW_ROUND, label: "New Seed Each Round" }
];
const WEEKEND_PLAYTEST_PICKS = [
  {
    id: "kids-first-race",
    title: "First Arcade Race",
    trackId: DEFAULT_TRACK_ID,
    trackLabel: "Sunset Highway",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    speedClassId: "arcade",
    suggestedUse: "younger/new players"
  },
  {
    id: "family-arcade",
    title: "Family Arcade",
    trackId: DEFAULT_TRACK_ID,
    trackLabel: "Sunset Highway",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    speedClassId: "arcade",
    suggestedUse: "normal family play"
  },
  {
    id: "parent-challenge",
    title: "Parent Challenge",
    trackId: DEFAULT_TRACK_ID,
    trackLabel: "Sunset Highway",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    speedClassId: "pro",
    suggestedUse: "adults / older kids"
  },
  {
    id: "redline-dare",
    title: "Redline Dare",
    trackId: "redline-run",
    trackLabel: "Redline Run",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    speedClassId: "turbo",
    suggestedUse: "intense short runs"
  },
  {
    id: "fuel-panic",
    title: "Fuel Panic",
    trackId: DEFAULT_TRACK_ID,
    trackLabel: "Sunset Highway",
    raceTypeId: FUEL_RUN_RACE_TYPE_ID,
    speedClassId: "pro",
    suggestedUse: "gas-routing test",
    note: "Redline Run is a good second Fuel Run test."
  },
  {
    id: "party-starter",
    title: "Party Starter",
    trackId: DEFAULT_TRACK_ID,
    trackLabel: "Sunset Highway",
    raceTypeId: DEFAULT_RACE_TYPE_ID,
    speedClassId: "pro",
    partyRoundType: PARTY_ROUND_TYPE_BEST_OF_3,
    partySeedMode: PARTY_SEED_MODE_SAME_ROUND,
    suggestedUse: "first family party set"
  }
];
const WEEKEND_PLAYTEST_CHECKLIST = [
  "Try First Arcade Race",
  "Try Family Arcade",
  "Try Redline Dare",
  "Try Fuel Run",
  "Try Party Best of 3",
  "Check badges/title callouts",
  "Check if ramps feel useful",
  "After playing, copy Playtest Report"
];
const PARTY_SETUP_HELP_ITEMS = [
  { title: "Best of 3", text: "each player gets 3 tries; best score wins." },
  { title: "Total Score", text: "all runs add together." },
  { title: "Same Seed", text: "everyone races the same road." },
  { title: "New Seed Each Round", text: "fresh road each round." }
];
const PLAYTEST_REPORT_FILTERS = [
  { id: "all", label: "All Runs" },
  { id: "classic", label: "Classic Only" },
  { id: "fuelRun", label: "Fuel Run Only" },
  { id: "challenge", label: "Challenge Runs" },
  { id: "party", label: "Party Runs" },
  { id: "turbo", label: "Turbo Only" }
];
const TRACKS = [
  {
    id: "sunset-highway",
    name: "Sunset Highway",
    description: "Balanced arcade racing with traffic, boosts, ramps, and music-shaped pressure.",
    cardIdentity: "Balanced arcade road with traffic, ramps, hazards, and music-shaped pressure.",
    music: "audio/sunset-highway.mp3",
    musicFallback: "audio/sunset-highway.mp3",
    musicStatus: "Dedicated track music included.",
    recommendedModes: ["Solo / Seeded Run", "Fuel Run", "Party Mode", "Challenge Mode"],
    fuelRunSupport: true,
    targetDurationSeconds: 115,
    speedScale: 1,
    distanceMultiplierByMode: {},
    visualTheme: {
      skyTop: "#1f1548",
      skyBottom: "#f07a45",
      horizonGlow: "rgba(255, 172, 82, 0.36)",
      roadOuter: "#111523",
      roadInner: "#181d2d",
      roadShoulder: "#2d1f32",
      edgeColor: "#ffb347",
      edgeAltColor: "#ff4f8b",
      lanePrimary: "rgba(255, 238, 182, 0.82)",
      laneSecondary: "rgba(255, 113, 145, 0.74)",
      reflectorColor: "#ffe08a",
      speedStreakColor: "rgba(255, 180, 82, 0.54)",
      boostStreakColor: "rgba(70, 240, 255, 0.62)",
      finishLabel: "SUNSET",
      roadsidePrimaryLabel: "SUNSET",
      roadsideSecondaryLabels: ["BOOST", "RALLY"],
      sceneryDensity: 1,
      roadDetailIntensity: 1,
      speedStreakIntensity: 1
    },
    roadDirectorProfile: {},
    allowedObjectMix: {
      slowCar: 1,
      fastCar: 1,
      truck: 1,
      barrier: 1,
      cone: 1,
      oil: 1,
      branch: 1,
      deer: 1,
      boostPad: 1,
      ramp: 1,
      gasCan: 1,
      minorHazardScale: 1
    },
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
    maxSpeed: 5900,
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
  },
  {
    id: "redline-run",
    name: "Redline Run",
    description: "Speed-first neon expressway with fast traffic, boost gates, slaloms, and cleaner high-speed pressure.",
    cardIdentity: "Speed-first neon expressway with fast traffic, boost gates, slaloms, and cleaner but more intense pressure.",
    music: "audio/redline-run.mp3",
    musicFallback: "audio/sunset-highway.mp3",
    musicOptional: true,
    musicStatus: "Uses Redline Run music; falls back safely if missing.",
    recommendedModes: ["Solo / Seeded Run", "Fuel Run", "Party Mode", "Pro / Turbo"],
    fuelRunSupport: true,
    targetDurationSeconds: 78,
    distanceToFinish: 165000,
    distanceMultiplierByMode: {
      sunday: 0.74,
      rookie: 0.86,
      arcade: 1,
      pro: 1.25,
      turbo: 1.08,
      overdrive: 1.12,
      redline: 1.18
    },
    speedScale: 1.15,
    speedScaleByMode: {
      sunday: 1.1,
      rookie: 1.14,
      arcade: 1.2,
      pro: 1.15,
      turbo: 1.18,
      overdrive: 1.05,
      redline: 1.02
    },
    baseSpeed: 1000,
    maxSpeed: 6600,
    speedCurveType: "smoothstep",
    startSpeedMultiplier: 1,
    earlySpeedMultiplier: 1.18,
    midSpeedMultiplier: 1.48,
    lateSpeedMultiplier: 1.82,
    endSpeedMultiplier: 2.08,
    visualTheme: {
      identity: "redline",
      skyTop: "#03040b",
      skyMid: "#12081c",
      skyHorizon: "#330817",
      skyBottom: "#08060f",
      horizonGlow: "rgba(255, 45, 85, 0.54)",
      sunAlpha: 0.22,
      roadOuter: "#090a12",
      roadInner: "#0d0f19",
      roadShoulder: "#190817",
      edgeColor: "#ff2d55",
      edgeAltColor: "#ff4fe1",
      lanePrimary: "rgba(255, 248, 250, 0.94)",
      laneSecondary: "rgba(255, 45, 85, 0.9)",
      reflectorColor: "#27f2ff",
      speedStreakColor: "rgba(255, 45, 85, 0.78)",
      boostStreakColor: "rgba(39, 242, 255, 0.72)",
      finishLabel: "REDLINE",
      roadsidePrimaryLabel: "REDLINE",
      roadsideSecondaryLabels: ["GATE", "FAST"],
      sceneryDensity: 0.98,
      roadDetailIntensity: 0.32,
      speedStreakIntensity: 1.46,
      citySkyline: true,
      urbanScenery: true,
      tunnelPanels: true,
      redlineChevrons: true,
      sharpLaneMarkers: true,
      skylineColor: "rgba(2, 4, 12, 0.96)",
      cityWindowColor: "rgba(255, 45, 85, 0.48)",
      guardrailColor: "rgba(255, 45, 85, 0.82)",
      chevronColor: "#ff2d55"
    },
    roadDirectorProfile: {
      cadenceScale: 1.1,
      randomScale: 0.86,
      spacingScale: 1.06,
      recoveryScale: 1.18,
      modeCadenceMultipliers: {
        sunday: { cadenceScale: 1.18, spacingScale: 1.12, recoveryScale: 1.22 },
        rookie: { cadenceScale: 1.14, spacingScale: 1.1, recoveryScale: 1.2 },
        arcade: { cadenceScale: 1.1, spacingScale: 1.08, recoveryScale: 1.16 },
        pro: { cadenceScale: 1.06, spacingScale: 1.06, recoveryScale: 1.12 },
        turbo: { cadenceScale: 1.02, spacingScale: 1.05, recoveryScale: 1.08 },
        overdrive: { cadenceScale: 1.04, spacingScale: 1.1, recoveryScale: 1.14 },
        redline: { cadenceScale: 1.08, spacingScale: 1.16, recoveryScale: 1.22 }
      },
      waveWeightMultipliers: {
        singleBlocker: 0.72,
        doubleGate: 0.88,
        offsetPair: 1.32,
        centerBlock: 1.08,
        leftRightSweep: 1.22,
        constructionSqueeze: 0.1,
        deerCrossing: 0,
        rampEscape: 0.72,
        boostTemptation: 1.42,
        nearMissCorridor: 1.3,
        fourLaneSpike: 0,
        recoveryGap: 1.34
      },
      forcedMeaningfulWaveMultipliers: {
        doubleGate: 0.86,
        offsetPair: 1.28,
        centerBlock: 1.02,
        leftRightSweep: 1.2,
        constructionSqueeze: 0.1,
        deerCrossing: 0,
        rampEscape: 0.78,
        boostTemptation: 1.38,
        nearMissCorridor: 1.28,
        redlineSlalom: 1.45,
        speedGateChain: 1.1,
        expressConvoy: 1.2,
        neonChicane: 0.85,
        rampOverpass: 0.9,
        needleThread: 1.35
      },
      fuelWaveWeightMultipliers: {
        fuelSupport: 1.05,
        fuelTrafficPressure: 1.16,
        fuelTrafficGate: 1.28,
        fuelSideTemptation: 1.24,
        fuelSplit: 0.78,
        fuelAfterPressure: 0.86,
        recoveryGap: 1.28
      },
      extraWaveWeightsByBand: {
        opening: {
          redlineSlalom: 0.52,
          speedGateChain: 0.82,
          expressConvoy: 0.38,
          rampOverpass: 0.08
        },
        earlyMid: {
          redlineSlalom: 1.35,
          speedGateChain: 1.16,
          expressConvoy: 1.05,
          neonChicane: 0.42,
          rampOverpass: 0.58,
          needleThread: 0.42
        },
        lateMid: {
          redlineSlalom: 1.2,
          speedGateChain: 0.92,
          expressConvoy: 1.24,
          neonChicane: 0.78,
          rampOverpass: 0.68,
          needleThread: 1.06
        },
        final: {
          redlineSlalom: 1.46,
          speedGateChain: 0.86,
          expressConvoy: 1.08,
          neonChicane: 0.58,
          rampOverpass: 0.52,
          needleThread: 1.42
        }
      }
    },
    allowedObjectMix: {
      slowCar: 1,
      fastCar: 1.75,
      truck: 0.96,
      barrier: 0.26,
      cone: 0.03,
      oil: 0,
      branch: 0,
      deer: 0,
      boostPad: 1.55,
      ramp: 1,
      gasCan: 1.18,
      minorHazardScale: 0.04
    },
    sections: [
      {
        id: "launch",
        label: "Launch",
        startProgress: 0,
        endProgress: 0.14,
        pressureMultiplier: 0.72,
        visualIntensity: 0.9,
        cadenceMultiplier: 1.18,
        recoveryGapMultiplier: 1.2,
        forceMeaningfulMultiplier: 1.22,
        waveWeightMultipliers: {
          singleBlocker: 1.18,
          doubleGate: 0.72,
          offsetPair: 0.58,
          centerBlock: 0.38,
          leftRightSweep: 0.32,
          constructionSqueeze: 0,
          deerCrossing: 0,
          rampEscape: 0.65,
          boostTemptation: 1.35,
          nearMissCorridor: 0,
          fourLaneSpike: 0,
          recoveryGap: 1.18,
          redlineSlalom: 0.45,
          speedGateChain: 0.7,
          expressConvoy: 0.3,
          neonChicane: 0,
          rampOverpass: 0.1,
          needleThread: 0
        }
      },
      {
        id: "groove",
        label: "Lane Read",
        startProgress: 0.14,
        endProgress: 0.44,
        pressureMultiplier: 0.88,
        visualIntensity: 1,
        cadenceMultiplier: 1.12,
        recoveryGapMultiplier: 1.14,
        forceMeaningfulMultiplier: 1.04,
        waveWeightMultipliers: {
          singleBlocker: 0.72,
          doubleGate: 0.92,
          offsetPair: 1.38,
          centerBlock: 0.94,
          leftRightSweep: 1.18,
          constructionSqueeze: 0.06,
          deerCrossing: 0,
          rampEscape: 0.82,
          boostTemptation: 1.42,
          nearMissCorridor: 1.1,
          fourLaneSpike: 0,
          recoveryGap: 1.2,
          redlineSlalom: 1.45,
          speedGateChain: 1.35,
          expressConvoy: 1.05,
          neonChicane: 0.45,
          rampOverpass: 0.75,
          needleThread: 0.45
        }
      },
      {
        id: "pressure",
        label: "Redline",
        startProgress: 0.44,
        endProgress: 0.64,
        pressureMultiplier: 1.04,
        visualIntensity: 1.15,
        cadenceMultiplier: 1.04,
        recoveryGapMultiplier: 1,
        forceMeaningfulMultiplier: 0.9,
        waveWeightMultipliers: {
          singleBlocker: 0.54,
          doubleGate: 0.9,
          offsetPair: 1.42,
          centerBlock: 1.12,
          leftRightSweep: 1.28,
          constructionSqueeze: 0.08,
          deerCrossing: 0,
          rampEscape: 0.7,
          boostTemptation: 1.24,
          nearMissCorridor: 1.42,
          fourLaneSpike: 0,
          recoveryGap: 1,
          redlineSlalom: 1.2,
          speedGateChain: 0.95,
          expressConvoy: 1.35,
          neonChicane: 0.95,
          rampOverpass: 0.8,
          needleThread: 1.2
        }
      },
      {
        id: "breather",
        label: "Open Pull",
        startProgress: 0.64,
        endProgress: 0.76,
        pressureMultiplier: 0.62,
        visualIntensity: 1.02,
        cadenceMultiplier: 1.22,
        recoveryGapMultiplier: 1.3,
        forceMeaningfulMultiplier: 1.16,
        waveWeightMultipliers: {
          singleBlocker: 0.72,
          doubleGate: 0.58,
          offsetPair: 0.62,
          centerBlock: 0.34,
          leftRightSweep: 0.48,
          constructionSqueeze: 0,
          deerCrossing: 0,
          rampEscape: 1.18,
          boostTemptation: 1.9,
          nearMissCorridor: 0.28,
          fourLaneSpike: 0,
          recoveryGap: 1.82,
          redlineSlalom: 0.45,
          speedGateChain: 1.7,
          expressConvoy: 0.45,
          neonChicane: 0.18,
          rampOverpass: 0.5,
          needleThread: 0.18
        }
      },
      {
        id: "finalPush",
        label: "Final Dare",
        startProgress: 0.76,
        endProgress: 1,
        pressureMultiplier: 1.18,
        visualIntensity: 1.34,
        cadenceMultiplier: 0.96,
        recoveryGapMultiplier: 0.92,
        forceMeaningfulMultiplier: 0.82,
        waveWeightMultipliers: {
          singleBlocker: 0.42,
          doubleGate: 0.8,
          offsetPair: 1.34,
          centerBlock: 1.12,
          leftRightSweep: 1.36,
          constructionSqueeze: 0.1,
          deerCrossing: 0,
          rampEscape: 0.72,
          boostTemptation: 1.18,
          nearMissCorridor: 1.58,
          fourLaneSpike: 0,
          recoveryGap: 0.9,
          redlineSlalom: 1.55,
          speedGateChain: 1.1,
          expressConvoy: 1.25,
          neonChicane: 0.65,
          rampOverpass: 0.6,
          needleThread: 1.55
        }
      }
    ],
    obstacleSettings: {
      earlySpacing: 1120,
      lateSpacing: 660,
      earlySpacingSeconds: 3.25,
      midSpacingSeconds: 2.08,
      lateSpacingSeconds: 1.32,
      spacingRandomSecondsEarly: 0.5,
      spacingRandomSecondsLate: 0.18,
      spawnLeadSeconds: 7.3,
      firstObstacleAt: 2200,
      warningLead: 560,
      warningLeadSeconds: 2.8
    },
    difficultyCurve(progress) {
      return Math.min(1, Math.max(0, Math.pow(progress, 0.78)));
    }
  }
];

const SPEED_CLASSES = [
  { id: "sunday", label: "Sunday Drive", startSpeed: 700, endSpeed: 1100, scoreMultiplier: 0.75, distanceMultiplier: 0.82, description: "Training cruise.", training: true },
  { id: "rookie", label: "Rookie", startSpeed: 950, endSpeed: 1500, scoreMultiplier: 0.9, distanceMultiplier: 0.92, description: "Training warmup.", training: true },
  { id: "arcade", label: "Arcade", startSpeed: 1250, endSpeed: 2100, scoreMultiplier: 1, distanceMultiplier: 1, description: "Default family-speed race.", visibleNormal: true },
  { id: "pro", label: "Pro", startSpeed: 2250, endSpeed: 3600, scoreMultiplier: 1.25, distanceMultiplier: 1.25, description: "Serious traffic pressure.", visibleNormal: true },
  { id: "turbo", label: "Turbo", startSpeed: 2700, endSpeed: 4300, scoreMultiplier: 1.55, distanceMultiplier: 1.2, description: "Fast, dangerous, fair.", visibleNormal: true },
  { id: "overdrive", label: "Overdrive", startSpeed: 3300, endSpeed: 5200, scoreMultiplier: 1.85, distanceMultiplier: 1.12, description: "High-speed dare run.", visibleNormal: true },
  { id: "redline", label: "Redline", startSpeed: 3800, endSpeed: 5900, scoreMultiplier: 2.15, distanceMultiplier: 1.12, description: "Maximum-speed local bragging rights.", visibleNormal: true }
];
const NORMAL_SPEED_CLASS_IDS = ["arcade", "pro", "turbo", "overdrive", "redline"];
const TRAINING_SPEED_CLASS_IDS = ["sunday", "rookie"];
const SPEED_CLASS_ORDER = TRAINING_SPEED_CLASS_IDS.concat(NORMAL_SPEED_CLASS_IDS);
const SPEED_DEMON_AVERAGE_SPEED_THRESHOLD = 3600;

const RACE_TYPES = [
  {
    id: DEFAULT_RACE_TYPE_ID,
    label: "Classic",
    shortLabel: "Classic",
    description: "Full Road Director traffic, boosts, ramps, and finish-line scoring."
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
    sunday: 0.95,
    rookie: 1.15,
    arcade: 1.65,
    pro: 2.65,
    turbo: 3.1,
    overdrive: 3.1,
    redline: 3.1
  },
  gasCanRestoreAmount: {
    sunday: 24,
    rookie: 23,
    arcade: 20,
    pro: 18,
    turbo: 16,
    overdrive: 16,
    redline: 16
  },
  fuelDrainMultiplierDuringManualBoost: 0,
  lowFuelThreshold: 35,
  criticalFuelThreshold: 14,
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
    turbo: 7,
    overdrive: 7,
    redline: 7
  },
  targetGasGapSeconds: {
    sunday: 22,
    rookie: 20,
    arcade: 17,
    pro: 15,
    turbo: 13,
    overdrive: 13,
    redline: 13
  },
  maxGasGapSeconds: {
    sunday: 32,
    rookie: 29,
    arcade: 25,
    pro: 22,
    turbo: 19,
    overdrive: 19,
    redline: 19
  }
};

const CHALLENGE_SAVE_VERSION = 1;
const CHALLENGE_DIFFICULTY_LABELS = ["Easy", "Normal", "Hard", "Dare"];
const CHALLENGES = [
  {
    id: "first-run",
    name: "First Run",
    description: "An approachable Sunset Highway finish.",
    trackId: "sunset-highway",
    raceType: "classic",
    raceMode: "rookie",
    seed: "FIRST-RUN",
    difficulty: "Easy",
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
    difficulty: "Dare",
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
    difficulty: "Hard",
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
    difficulty: "Hard",
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
    difficulty: "Hard",
    objective: { type: "nearMisses", label: "Earn at least 5 near-miss bonuses", target: 5 },
    purpose: "Advanced scoring challenge"
  },
  {
    id: "redline-warmup",
    name: "Redline Warmup",
    description: "A cleaner, faster first taste of Redline Run.",
    trackId: "redline-run",
    raceType: "classic",
    raceMode: "arcade",
    seed: "REDLINE-WARMUP",
    difficulty: "Normal",
    objective: { type: "finish", label: "Finish the race" },
    purpose: "Introduce Redline's faster cleaner style"
  },
  {
    id: "redline-dare",
    name: "Redline Dare",
    description: "Push Turbo speed without needing a full finish yet.",
    trackId: "redline-run",
    raceType: "classic",
    raceMode: "turbo",
    seed: "REDLINE-DARE",
    difficulty: "Dare",
    objective: { type: "reachProgress", label: "Reach 75% progress or finish", targetPercent: 75 },
    purpose: "Speed-first challenge without requiring immediate full completion"
  },
  {
    id: "speed-gate",
    name: "Speed Gate",
    description: "Follow boost routes through Redline pressure.",
    trackId: "redline-run",
    raceType: "classic",
    raceMode: "pro",
    seed: "SPEED-GATE",
    difficulty: "Hard",
    objective: { type: "collectBoostPads", label: "Collect 3 boost pads and reach 50%", target: 3, progressTargetPercent: 50 },
    purpose: "Boost/risk challenge"
  },
  {
    id: "fuel-panic",
    name: "Fuel Panic",
    description: "Stay fueled deep into a Pro Redline Fuel Run.",
    trackId: "redline-run",
    raceType: "fuelRun",
    raceMode: "pro",
    seed: "FUEL-PANIC",
    difficulty: "Hard",
    objective: { type: "fuelProgress", label: "Reach 75% without running out of fuel", targetPercent: 75 },
    purpose: "Showcase Fuel Run pressure"
  },
  {
    id: "last-drop",
    name: "Last Drop",
    description: "An accessible Fuel Run finish on Sunset Highway.",
    trackId: "sunset-highway",
    raceType: "fuelRun",
    raceMode: "arcade",
    seed: "LAST-DROP",
    difficulty: "Normal",
    objective: { type: "finishFuelRun", label: "Finish Fuel Run" },
    purpose: "Accessible Fuel Run challenge"
  },
  {
    id: "clean-redline",
    name: "Clean Redline",
    description: "Finish Redline clean, with no slowdown hits.",
    trackId: "redline-run",
    raceType: "classic",
    raceMode: "arcade",
    seed: "CLEAN-REDLINE",
    difficulty: "Hard",
    objective: { type: "noSlowdownHits", label: "Finish with no slowdown hits" },
    purpose: "Precision challenge"
  },
  {
    id: "party-seed-sampler",
    name: "Party Seed Sampler",
    description: "A fixed Sunset seed for future side-by-side comparison.",
    trackId: "sunset-highway",
    raceType: "classic",
    raceMode: "pro",
    seed: "PARTY-SEED",
    difficulty: "Normal",
    objective: { type: "reachProgress", label: "Reach 50% progress", targetPercent: 50 },
    purpose: "A good fixed seed for future Party Mode comparison"
  },
  {
    id: "the-dare",
    name: "The Dare",
    description: "A hard but reachable Redline Turbo retry target.",
    trackId: "redline-run",
    raceType: "classic",
    raceMode: "turbo",
    seed: "THE-DARE",
    difficulty: "Dare",
    objective: { type: "reachProgress", label: "Reach 50% progress", targetPercent: 50 },
    purpose: "A hard but achievable try-again challenge"
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
  crashScoreDelayMs: 640,
  finishScoreDelayMs: 720,
  screenShakeIntensity: 0.82,
  screenShakeDecay: 2.6,
  crashPauseMs: 110,
  crashShake: 1,
  crashSparkMs: 420,
  bumpShake: 0.28,
  bumpFlashSeconds: 0.24,
  boostBurstSeconds: 0.36,
  boostFlashMs: 260,
  boostStreakPunchMs: 420,
  boostTrailPunchMs: 520,
  rampLaunchPulseMs: 220,
  rampLandingPulseMs: 320,
  rampClearSparkMs: 420,
  finishFlashSeconds: 0.9,
  finishStripeMs: 760,
  nearMissPopupCooldown: 0.38,
  nearMissSparkMs: 260,
  fuelWarningPulseMs: 620,
  fuelSavedPulseMs: 520,
  fuelSavedPopupCooldown: 1.1,
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
  bottomCarMargin: 12
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
    arcade: { early: 1.55, mid: 1.18, late: 0.9, randomEarly: 0.14, randomLate: 0.06, spacingScale: 0.7, recoveryScale: 0.52, centerSafe: 3.6, centerHold: 2.65, laneStill: 2.1, forceMeaningful: 1.75 },
    pro: { early: 1.34, mid: 1.08, late: 0.84, randomEarly: 0.11, randomLate: 0.05, spacingScale: 0.68, recoveryScale: 0.5, centerSafe: 2.25, centerHold: 1.9, laneStill: 1.4, forceMeaningful: 1.34 },
    turbo: { early: 1.52, mid: 1.22, late: 0.98, randomEarly: 0.13, randomLate: 0.06, spacingScale: 0.78, recoveryScale: 0.62, centerSafe: 2.1, centerHold: 1.75, laneStill: 1.25, forceMeaningful: 1.55 },
    overdrive: { early: 1.68, mid: 1.34, late: 1.08, randomEarly: 0.14, randomLate: 0.06, spacingScale: 0.86, recoveryScale: 0.72, centerSafe: 1.95, centerHold: 1.62, laneStill: 1.12, forceMeaningful: 1.7 },
    redline: { early: 1.82, mid: 1.46, late: 1.18, randomEarly: 0.15, randomLate: 0.07, spacingScale: 0.92, recoveryScale: 0.82, centerSafe: 1.85, centerHold: 1.48, laneStill: 1, forceMeaningful: 1.85 }
  },
  centerChallengeMinSeconds: {
    sunday: 8,
    rookie: 6.8,
    arcade: 2.7,
    pro: 1.9,
    turbo: 1.75,
    overdrive: 1.62,
    redline: 1.48
  },
  centerSoftPressure: {
    sunday: 0.1,
    rookie: 0.14,
    arcade: 0.65,
    pro: 0.9,
    turbo: 0.92,
    overdrive: 0.94,
    redline: 0.96
  },
  centerRestChance: {
    sunday: 0.72,
    rookie: 0.64,
    arcade: 0.16,
    pro: 0.04,
    turbo: 0.03,
    overdrive: 0.025,
    redline: 0.02
  },
  pressureBudgetAllowance: {
    sunday: 2.6,
    rookie: 2.6,
    arcade: 2.6,
    pro: 2.6,
    turbo: 2.6,
    overdrive: 2.6,
    redline: 2.6
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
    arcade: 1.55,
    pro: 2.25,
    turbo: 2.35,
    overdrive: 2.3,
    redline: 2.25
  }
};

const TRACK_DIRECTOR = ROAD_DIRECTOR;
const REDLINE_TEMPLATE_WAVE_TYPES = new Set([
  "redlineSlalom",
  "speedGateChain",
  "expressConvoy",
  "neonChicane",
  "rampOverpass",
  "needleThread"
]);

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

const CAR_BODY_STYLES = [
  { id: "wedge", name: "Wedge Racer", sprite: "assets/cars/wedge-racer.png" },
  { id: "muscle", name: "Muscle Coupe", sprite: "assets/cars/muscle-coupe.png" },
  { id: "formula", name: "Tiny Formula", sprite: "assets/cars/tiny-formula.png" }
];

const PLAYER_CAR_PAINT_STYLE_VERSION = 1;
const ORIGINAL_CAR_PAINT_ID = "original";
const DEFAULT_CAR_STYLE = {
  bodyColor: ORIGINAL_CAR_PAINT_ID,
  accentColor: ORIGINAL_CAR_PAINT_ID,
  boostTrail: "cyan"
};

const CAR_BODY_COLOR_OPTIONS = [
  { id: ORIGINAL_CAR_PAINT_ID, label: "Original", hex: null },
  { id: "red", label: "Red", hex: "#ff3b58" },
  { id: "blue", label: "Blue", hex: "#3777ff" },
  { id: "green", label: "Green", hex: "#44ff99" },
  { id: "yellow", label: "Yellow", hex: "#ffe45e" },
  { id: "purple", label: "Purple", hex: "#8f5cff" },
  { id: "pink", label: "Pink", hex: "#ff3fd1" },
  { id: "white", label: "White", hex: "#f6fbff" },
  { id: "black", label: "Black", hex: "#10131f" },
  { id: "orange", label: "Orange", hex: "#ff8f3f" },
  { id: "cyan", label: "Cyan", hex: "#28f6ff" }
];

const CAR_ACCENT_COLOR_OPTIONS = [
  { id: ORIGINAL_CAR_PAINT_ID, label: "Original", hex: null },
  { id: "cyan", label: "Cyan", hex: "#28f6ff" },
  { id: "magenta", label: "Magenta", hex: "#ff3fd1" },
  { id: "yellow", label: "Yellow", hex: "#ffe45e" },
  { id: "white", label: "White", hex: "#f6fbff" },
  { id: "red", label: "Red", hex: "#ff3b58" },
  { id: "blue", label: "Blue", hex: "#3777ff" }
];

const CAR_BOOST_TRAIL_OPTIONS = [
  { id: "cyan", label: "Cyan", hex: "#28f6ff" },
  { id: "magenta", label: "Magenta", hex: "#ff3fd1" },
  { id: "yellow", label: "Yellow", hex: "#ffe45e" },
  { id: "white", label: "White", hex: "#f6fbff" },
  { id: "red", label: "Red", hex: "#ff3b58" },
  { id: "blue", label: "Blue", hex: "#3777ff" }
];

const DEFAULT_CAR = {
  name: "Neon Runner",
  bodyColor: "#ff3fd1",
  stripeColor: "#28f6ff",
  windowColor: "#9ff7ff",
  bodyStyle: "wedge",
  useSprite: true,
  carStyle: { ...DEFAULT_CAR_STYLE }
};

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
const MINOR_HAZARD_TYPES = new Set(["cone", "oil", "branch", "deer"]);
const RAMP_CLEARABLE_TYPES = new Set(["slowCar", "fastCar", "truck", "barrier", "cone", "oil", "branch", "deer", "gasCan", "boostPad", "ramp"]);
const RAMP_TARGET_TYPES = new Set([...HARD_VEHICLE_TYPES, ...MINOR_HAZARD_TYPES]);
const RAMP_LANDING_UNSAFE_TYPES = new Set([...HARD_VEHICLE_TYPES, ...MINOR_HAZARD_TYPES]);
const RAMP_PATH_COLLECTIBLE_TYPES = new Set(["gasCan", "boostPad"]);
const CAMERA_HAZARD_SCALE_TYPES = new Set(["cone", "oil", "deer", "ramp", "boostPad", "gasCan", "branch"]);

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

function getVisibleBadgeDefinitions() {
  return BADGE_DEFINITIONS.filter((badge) => badge && badge.hidden !== true && badge.deprecated !== true && badge.visible !== false);
}

function isVisibleBadgeDefinition(badge) {
  return Boolean(badge) && badge.hidden !== true && badge.deprecated !== true && badge.visible !== false;
}

function getRampTargetGap(ramp) {
  const targetDistance = Number.isFinite(ramp?.solutionTargetDistance) ? ramp.solutionTargetDistance : null;
  if (!targetDistance || !Number.isFinite(ramp?.distance)) return ROAD_READABILITY_CONFIG.rampTargetMaxGap;
  return clamp(
    targetDistance - ramp.distance,
    ROAD_READABILITY_CONFIG.rampTargetMinGap,
    ROAD_READABILITY_CONFIG.rampTargetMaxGap
  );
}

function getRampRequiredClearDistance(targetGap = ROAD_READABILITY_CONFIG.rampTargetMaxGap) {
  return Math.max(
    ROAD_READABILITY_CONFIG.rampClearDistance,
    Math.max(0, targetGap) + ROAD_READABILITY_CONFIG.rampLandingSafetyDistance
  );
}

function getRampAirborneDurationForSpeed(speed, targetGap = ROAD_READABILITY_CONFIG.rampTargetMaxGap) {
  const safeSpeed = Math.max(1, Number.isFinite(speed) ? speed : 1);
  const requiredSeconds = getRampRequiredClearDistance(targetGap) / safeSpeed;
  return clamp(
    requiredSeconds,
    ROAD_READABILITY_CONFIG.rampMinAirborneDuration,
    ROAD_READABILITY_CONFIG.rampMaxAirborneDuration
  );
}

function getRampClearDistanceForSpeed(speed, targetGap = ROAD_READABILITY_CONFIG.rampTargetMaxGap) {
  const safeSpeed = Math.max(1, Number.isFinite(speed) ? speed : 1);
  return safeSpeed * getRampAirborneDurationForSpeed(safeSpeed, targetGap);
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

function getSpeedClassRank(value) {
  const id = normalizeSpeedClassId(value, DEFAULT_SPEED_CLASS_ID);
  const index = SPEED_CLASS_ORDER.indexOf(id);
  return index >= 0 ? index : SPEED_CLASS_ORDER.indexOf(DEFAULT_SPEED_CLASS_ID);
}

function isSpeedClassAtLeast(value, minimum) {
  return getSpeedClassRank(value) >= getSpeedClassRank(minimum);
}

function getNormalVisibleSpeedClasses() {
  return NORMAL_SPEED_CLASS_IDS
    .map((id) => getSpeedClassConfig(id))
    .filter((speedClass) => speedClass?.visibleNormal === true);
}

function getTrainingSpeedClasses() {
  return TRAINING_SPEED_CLASS_IDS
    .map((id) => getSpeedClassConfig(id))
    .filter((speedClass) => speedClass?.training === true);
}

function getSpeedClassLadderNumber(value) {
  const index = NORMAL_SPEED_CLASS_IDS.indexOf(normalizeSpeedClassId(value, ""));
  return index >= 0 ? index + 1 : null;
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

function normalizePartyRoundType(value, fallback = PARTY_ROUND_TYPE_ONE_RUN) {
  const id = String(value || "").trim();
  return PARTY_ROUND_TYPES.some((item) => item.id === id) ? id : fallback;
}

function getPartyRoundTypeConfig(value) {
  const id = normalizePartyRoundType(value);
  return PARTY_ROUND_TYPES.find((item) => item.id === id) || PARTY_ROUND_TYPES[0];
}

function getPartyRoundTypeLabel(value) {
  return getPartyRoundTypeConfig(value).label;
}

function getPartyRoundTotal(value) {
  return getPartyRoundTypeConfig(value).totalRounds || 1;
}

function getPartyScoringLabel(value) {
  return getPartyRoundTypeConfig(value).scoringLabel || "Best Score";
}

function normalizePartySeedMode(value, fallback = PARTY_SEED_MODE_SAME_ROUND) {
  const id = String(value || "").trim();
  return PARTY_SEED_MODES.some((item) => item.id === id) ? id : fallback;
}

function getPartySeedModeLabel(value) {
  const id = normalizePartySeedMode(value);
  return PARTY_SEED_MODES.find((item) => item.id === id)?.label || PARTY_SEED_MODES[0].label;
}

function isPartyCloseRaceMargin(leaderScore, margin) {
  const score = normalizeNonNegativeInteger(leaderScore);
  const gap = normalizeNonNegativeInteger(margin);
  if (score <= 0 || gap <= 0) return false;
  return gap <= Math.max(1200, Math.round(score * 0.05));
}

function normalizeTrackId(value, fallback = DEFAULT_TRACK_ID) {
  const id = String(value || "").trim();
  return TRACKS.some((track) => track.id === id) ? id : fallback;
}

function getTrackById(value) {
  const id = normalizeTrackId(value);
  return TRACKS.find((track) => track.id === id) || TRACKS[0];
}

function getTrackVisualTheme(track = TRACKS[0]) {
  return {
    ...(TRACKS[0]?.visualTheme || {}),
    ...(track?.visualTheme || {})
  };
}

function getTrackMusicPath(track = TRACKS[0]) {
  return String(track?.music || TRACKS[0]?.music || "");
}

function getTrackMusicFallbackPath(track = TRACKS[0]) {
  return String(track?.musicFallback || TRACKS[0]?.music || "");
}

function getTrackMusicStatus(track = TRACKS[0]) {
  return String(track?.musicStatus || (track?.music ? "Track music configured." : "No track music configured."));
}

function trackSupportsRaceType(track = TRACKS[0], raceTypeId = DEFAULT_RACE_TYPE_ID) {
  const id = normalizeRaceTypeId(raceTypeId);
  if (id === DEFAULT_RACE_TYPE_ID) return true;
  if (id === FUEL_RUN_RACE_TYPE_ID) return track?.fuelRunSupport !== false;
  return true;
}

function getRaceTypesForTrack(track = TRACKS[0]) {
  return RACE_TYPES.filter((raceType) => trackSupportsRaceType(track, raceType.id));
}

function getTrackSpeedScale(track = TRACKS[0], speedClassId = DEFAULT_SPEED_CLASS_ID) {
  const id = normalizeSpeedClassId(speedClassId);
  const modeScale = Number(track?.speedScaleByMode?.[id]);
  if (Number.isFinite(modeScale)) return clamp(modeScale, 0.5, 1.8);
  const scale = Number(track?.speedScale);
  return Number.isFinite(scale) ? clamp(scale, 0.5, 1.8) : 1;
}

function getTrackDistanceMultiplier(track = TRACKS[0], speedClassId = DEFAULT_SPEED_CLASS_ID) {
  const id = normalizeSpeedClassId(speedClassId);
  const trackMultiplier = Number(track?.distanceMultiplierByMode?.[id]);
  if (Number.isFinite(trackMultiplier)) return clamp(trackMultiplier, 0.5, 1.8);
  return getSpeedClassDistanceMultiplier(id);
}

function getChallengeById(value) {
  const id = String(value || "").trim();
  return CHALLENGES.find((challenge) => challenge.id === id) || null;
}

function getChallengeObjectiveLabel(challenge) {
  return String(challenge?.objective?.label || "Finish the race");
}

function getChallengeDifficultyLabel(challenge) {
  const label = String(challenge?.difficulty || "Normal").trim();
  return CHALLENGE_DIFFICULTY_LABELS.includes(label) ? label : "Normal";
}

function formatChallengeProgressPercent(value) {
  const percent = clampNumber(value, 0, 100, 0);
  return `${Math.round(percent)}%`;
}

function getSpeedClassStartSpeed(value) {
  const speedClass = getSpeedClassConfig(value);
  return speedClass.startSpeed ?? TRACKS[0].baseSpeed * (speedClass.startMultiplier ?? 1);
}

function getSpeedClassEndSpeed(value, track = TRACKS[0]) {
  const speedClass = getSpeedClassConfig(value);
  return speedClass.endSpeed ?? track.baseSpeed * (speedClass.endMultiplier ?? 2);
}

function getSpeedClassDistanceMultiplier(value) {
  const speedClass = getSpeedClassConfig(value);
  const multiplier = Number(speedClass.distanceMultiplier);
  return Number.isFinite(multiplier) ? clamp(multiplier, 0.5, 1.8) : 1;
}

function createRaceTrackForSpeedClass(track = TRACKS[0], speedClassId = DEFAULT_SPEED_CLASS_ID) {
  const sourceTrack = track || TRACKS[0];
  const multiplier = getTrackDistanceMultiplier(sourceTrack, speedClassId);
  if (Math.abs(multiplier - 1) < 0.001) return sourceTrack;
  const baseDistance = Math.max(1, Math.round(sourceTrack.distanceToFinish || TRACKS[0].distanceToFinish || 1));
  return {
    ...sourceTrack,
    baseDistanceToFinish: baseDistance,
    distanceMultiplier: multiplier,
    distanceToFinish: Math.max(1, Math.round(baseDistance * multiplier))
  };
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
  const safeTrack = track || TRACKS[0];
  const startSpeed = getTrackRawCruiseSpeed(safeTrack, 0, speedClassId);
  const cruiseSpeed = getTrackRawCruiseSpeed(safeTrack, progress, speedClassId);
  return cruiseSpeed / Math.max(1, startSpeed);
}

function getTrackRawCruiseSpeed(track, progress, speedClassId = DEFAULT_SPEED_CLASS_ID) {
  const safeTrack = track || TRACKS[0];
  const speedScale = getTrackSpeedScale(safeTrack, speedClassId);
  const startSpeed = getSpeedClassStartSpeed(speedClassId) * speedScale;
  const endSpeed = getSpeedClassEndSpeed(speedClassId, safeTrack) * speedScale;
  return lerp(startSpeed, endSpeed, getTrackBaseSpeedCurveT(safeTrack, progress));
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

function getCarPaintOption(options, value, fallbackId) {
  const id = String(value ?? "").trim();
  return options.find((option) => option.id === id)
    || options.find((option) => option.id === fallbackId)
    || options[0];
}

function normalizeCarPaintOptionId(value, options, fallbackId) {
  return getCarPaintOption(options, value, fallbackId)?.id || fallbackId;
}

function normalizeCarStyle(value, fallback = DEFAULT_CAR_STYLE) {
  const source = value && typeof value === "object" ? value : {};
  const fallbackStyle = {
    ...DEFAULT_CAR_STYLE,
    ...(fallback && typeof fallback === "object" ? fallback : {})
  };
  return {
    bodyColor: normalizeCarPaintOptionId(source.bodyColor, CAR_BODY_COLOR_OPTIONS, fallbackStyle.bodyColor),
    accentColor: normalizeCarPaintOptionId(source.accentColor, CAR_ACCENT_COLOR_OPTIONS, fallbackStyle.accentColor),
    boostTrail: normalizeCarPaintOptionId(source.boostTrail, CAR_BOOST_TRAIL_OPTIONS, fallbackStyle.boostTrail)
  };
}

function getCarPaintHex(options, value, fallbackId) {
  return getCarPaintOption(options, value, fallbackId)?.hex || null;
}

function getCarStyleBodyHex(carConfig) {
  const style = normalizeCarStyle(carConfig?.carStyle);
  return getCarPaintHex(CAR_BODY_COLOR_OPTIONS, style.bodyColor, DEFAULT_CAR_STYLE.bodyColor);
}

function getCarStyleAccentHex(carConfig) {
  const style = normalizeCarStyle(carConfig?.carStyle);
  return getCarPaintHex(CAR_ACCENT_COLOR_OPTIONS, style.accentColor, DEFAULT_CAR_STYLE.accentColor);
}

function getCarAccentColor(carConfig) {
  return getCarStyleAccentHex(carConfig)
    || normalizeHexColor(carConfig?.stripeColor, DEFAULT_CAR.stripeColor);
}

function getCarBoostTrailColor(carConfig) {
  const style = normalizeCarStyle(carConfig?.carStyle);
  return getCarPaintHex(CAR_BOOST_TRAIL_OPTIONS, style.boostTrail, DEFAULT_CAR_STYLE.boostTrail)
    || getCarAccentColor(carConfig);
}

function getCanvasBodyColorForCarStyle(carStyle) {
  const style = normalizeCarStyle(carStyle);
  return getCarPaintHex(CAR_BODY_COLOR_OPTIONS, style.bodyColor, DEFAULT_CAR_STYLE.bodyColor)
    || DEFAULT_CAR.bodyColor;
}

function getCanvasStripeColorForCarStyle(carStyle) {
  const style = normalizeCarStyle(carStyle);
  return getCarPaintHex(CAR_ACCENT_COLOR_OPTIONS, style.accentColor, DEFAULT_CAR_STYLE.accentColor)
    || DEFAULT_CAR.stripeColor;
}

function formatPaintDebugRatio(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "n/a";
}

function renderPaintOptionGroup(name, options, selectedValue, fallbackId, label) {
  const selectedId = normalizeCarPaintOptionId(selectedValue, options, fallbackId);
  return `
    <div class="paint-swatch-grid" role="radiogroup" aria-label="${escapeAttr(label)}">
      ${options.map((option) => {
        const selected = option.id === selectedId;
        const swatchStyle = option.hex
          ? ` style="--paint-color:${escapeAttr(option.hex)}"`
          : "";
        return `
          <label class="paint-swatch ${selected ? "is-selected" : ""}${option.hex ? "" : " is-original"}"${swatchStyle}>
            <input type="radio" name="${escapeAttr(name)}" value="${escapeAttr(option.id)}" ${selected ? "checked" : ""}>
            <span class="paint-chip" aria-hidden="true"></span>
            <span>${escapeHtml(option.label)}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
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

function normalizeOptionalFuelAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, 0, FUEL_RUN_CONFIG.fuelMax) : null;
}

function normalizeSectionCountMap(value) {
  const source = value && typeof value === "object" ? value : {};
  const result = {};
  Object.entries(source).slice(0, 16).forEach(([key, count]) => {
    const id = normalizeStorageId(key, "");
    if (id) result[id] = normalizeNonNegativeInteger(count, 0, 9999);
  });
  return result;
}

function normalizeCountMap(value, limit = 24) {
  const source = value && typeof value === "object" ? value : {};
  const result = {};
  Object.entries(source).slice(0, limit).forEach(([key, count]) => {
    const id = normalizeStorageId(key, "");
    if (id) result[id] = normalizeNonNegativeInteger(count, 0, 99999);
  });
  return result;
}

function normalizeDateString(value, fallback = "") {
  const clean = sanitizeDisplayText(value, "", 40);
  const time = clean ? Date.parse(clean) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function getBadgeDefinition(id) {
  return BADGE_DEFINITION_BY_ID[String(id || "")] || null;
}

function normalizeBadgeId(value) {
  const id = normalizeStorageId(value, "");
  return getBadgeDefinition(id) ? id : "";
}

function normalizeBadgeIdList(value, limit = BADGE_DEFINITIONS.length) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const result = [];
  source.forEach((item) => {
    const id = normalizeBadgeId(typeof item === "object" ? item?.id : item);
    if (id && !seen.has(id) && result.length < limit) {
      seen.add(id);
      result.push(id);
    }
  });
  return result;
}

function createDefaultBadgeSave() {
  return {
    version: BADGE_SAVE_VERSION,
    earned: {}
  };
}

function normalizePlayerBadges(value) {
  const fallback = createDefaultBadgeSave();
  const source = value && typeof value === "object" ? value : {};
  const rawEarned = Array.isArray(value)
    ? value
    : (source.earned && typeof source.earned === "object" ? source.earned : {});
  const earned = {};

  if (Array.isArray(rawEarned)) {
    rawEarned.forEach((entry) => {
      const id = normalizeBadgeId(typeof entry === "object" ? entry?.id : entry);
      if (!id) return;
      const earnedAt = typeof entry === "object"
        ? normalizeDateString(entry.earnedAt || entry.firstEarnedAt || entry.date, "")
        : "";
      earned[id] = { earnedAt };
    });
  } else {
    Object.entries(rawEarned).forEach(([key, entry]) => {
      const id = normalizeBadgeId(entry && typeof entry === "object" ? (entry.id || key) : key);
      if (!id || entry === false || entry === null || entry?.earned === false) return;
      const earnedAt = entry && typeof entry === "object"
        ? normalizeDateString(entry.earnedAt || entry.firstEarnedAt || entry.date, "")
        : "";
      earned[id] = { earnedAt };
    });
  }

  return {
    ...fallback,
    earned
  };
}

function createDefaultPlayerBadgeStats() {
  return {
    version: PLAYER_BADGE_STATS_VERSION,
    totalRuns: 0,
    partyRuns: 0,
    partyWins: 0,
    bestOf3Wins: 0
  };
}

function normalizePlayerBadgeStats(value) {
  const fallback = createDefaultPlayerBadgeStats();
  const source = value && typeof value === "object" ? value : {};
  return {
    ...fallback,
    totalRuns: normalizeNonNegativeInteger(source.totalRuns || source.runs, 0, 999999),
    partyRuns: normalizeNonNegativeInteger(source.partyRuns, 0, 999999),
    partyWins: normalizeNonNegativeInteger(source.partyWins, 0, 999999),
    bestOf3Wins: normalizeNonNegativeInteger(source.bestOf3Wins, 0, 999999)
  };
}

function getBadgeProgress(player) {
  const badges = normalizePlayerBadges(player?.badges);
  const visibleDefinitions = getVisibleBadgeDefinitions();
  const earnedIds = visibleDefinitions
    .map((badge) => badge.id)
    .filter((id) => Boolean(badges.earned[id]));
  return {
    earnedIds,
    earnedCount: earnedIds.length,
    totalCount: visibleDefinitions.length,
    badges
  };
}

function formatBadgeEarnedDate(entry) {
  const earnedAt = normalizeDateString(entry?.earnedAt, "");
  return earnedAt ? formatShortDate(earnedAt) : "Earned";
}

function normalizeBadgeFilter(value) {
  const id = normalizeStorageId(value, "all");
  return BADGE_CATEGORY_FILTERS.some((filter) => filter.id === id) ? id : "all";
}

function getBadgeCategoryLabel(category) {
  const id = normalizeStorageId(category, "");
  return BADGE_CATEGORY_LABELS[id] || "Badge";
}

function getRecentlyEarnedBadges(player, limit = 3) {
  const badges = normalizePlayerBadges(player?.badges);
  return Object.entries(badges.earned)
    .map(([id, entry]) => {
      const definition = getBadgeDefinition(id);
      if (!isVisibleBadgeDefinition(definition)) return null;
      return {
        ...definition,
        earnedAt: entry?.earnedAt || ""
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = Date.parse(a.earnedAt || "") || 0;
      const bTime = Date.parse(b.earnedAt || "") || 0;
      return bTime - aTime;
    })
    .slice(0, Math.max(0, Math.min(6, limit)));
}

function getTitleDefinition(id) {
  return TITLE_DEFINITION_BY_ID[String(id || "")] || null;
}

function createDefaultPlayerChallengeSave() {
  return {
    version: PLAYER_CHALLENGE_SAVE_VERSION,
    completed: {}
  };
}

function normalizePlayerChallengeSave(value) {
  const fallback = createDefaultPlayerChallengeSave();
  const source = value && typeof value === "object"
    ? (value.completed && typeof value.completed === "object"
      ? value.completed
      : (value.progress && typeof value.progress === "object" ? value.progress : value))
    : {};
  const completed = {};
  CHALLENGES.forEach((challenge) => {
    const entry = source[challenge.id];
    if (!entry) return;
    const completedFlag = entry === true || entry.completed === true || entry.bestCompletionStatus === true;
    if (!completedFlag) return;
    const bestScore = normalizeNonNegativeInteger(entry.bestScore || entry.score, 0, MAX_DISPLAY_SCORE);
    const firstCompletedAt = normalizeDateString(entry.firstCompletedAt || entry.completedAt || entry.bestDate || entry.date, "");
    const bestDate = normalizeDateString(entry.bestDate || entry.completedAt || entry.date, firstCompletedAt);
    completed[challenge.id] = {
      challengeId: challenge.id,
      completed: true,
      bestScore,
      firstCompletedAt,
      bestDate
    };
  });
  return {
    ...fallback,
    completed
  };
}

function getPlayerChallengeTitleStats(player) {
  const challengeProgress = normalizePlayerChallengeSave(player?.challengeProgress || player?.challengeStats);
  const entries = Object.values(challengeProgress.completed);
  const timestamps = entries
    .map((entry) => normalizeDateString(entry.firstCompletedAt || entry.bestDate, ""))
    .filter(Boolean)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  return {
    completedCount: entries.length,
    totalBestScore: entries.reduce((sum, entry) => sum + normalizeNonNegativeInteger(entry.bestScore, 0, MAX_DISPLAY_SCORE), 0),
    firstCompletedAt: timestamps[0] || "",
    challengeProgress
  };
}

function getLeaderboardEntryTitleSource(entry) {
  const stored = normalizeStorageId(entry?.runId || entry?.id, "");
  if (stored) return stored;
  return [
    normalizeStorageId(entry?.playerId, "no-player"),
    sanitizePlayerName(entry?.playerName, "PLAYER"),
    normalizeNonNegativeInteger(entry?.score, 0, MAX_DISPLAY_SCORE),
    normalizeDateString(entry?.date, ""),
    normalizeStorageId(entry?.trackId, ""),
    normalizeRaceTypeId(entry?.raceType, DEFAULT_RACE_TYPE_ID),
    normalizeSpeedClassId(entry?.raceMode || entry?.speedClass, DEFAULT_SPEED_CLASS_ID)
  ].join("|").slice(0, 180);
}

function getTitleTimestampValue(value) {
  const timestamp = normalizeDateString(value, "");
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function getTitleCandidateStableKey(candidate) {
  return [
    normalizeStorageId(candidate?.playerId, ""),
    sanitizePlayerName(candidate?.playerName, "PLAYER"),
    sanitizeName(candidate?.sourceId || "", "", 180)
  ].join("|");
}

function titleCandidateIsBetter(candidate, incumbent) {
  if (!candidate) return false;
  if (!incumbent) return true;
  if ((candidate.primaryValue || 0) !== (incumbent.primaryValue || 0)) {
    return (candidate.primaryValue || 0) > (incumbent.primaryValue || 0);
  }
  if ((candidate.secondaryValue || 0) !== (incumbent.secondaryValue || 0)) {
    return (candidate.secondaryValue || 0) > (incumbent.secondaryValue || 0);
  }
  const candidateTime = getTitleTimestampValue(candidate.timestamp);
  const incumbentTime = getTitleTimestampValue(incumbent.timestamp);
  if (candidateTime !== incumbentTime) return candidateTime < incumbentTime;
  return getTitleCandidateStableKey(candidate) < getTitleCandidateStableKey(incumbent);
}

function makeScoreTitleCandidate(titleId, entry, context) {
  const definition = getTitleDefinition(titleId);
  if (!definition || !entry) return null;
  const score = normalizeNonNegativeInteger(entry.score, 0, MAX_DISPLAY_SCORE);
  if (score <= 0) return null;
  return {
    titleId,
    playerId: normalizeStorageId(entry.playerId, ""),
    playerName: sanitizePlayerName(entry.playerName, "PLAYER"),
    primaryValue: score,
    secondaryValue: 0,
    score,
    timestamp: normalizeDateString(entry.date, ""),
    sourceId: getLeaderboardEntryTitleSource(entry),
    context: context || definition.context,
    statText: formatScore(score)
  };
}

function makeChallengeTitleCandidate(player) {
  const stats = getPlayerChallengeTitleStats(player);
  if (stats.completedCount <= 0) return null;
  return {
    titleId: "challenge_champion",
    playerId: normalizeStorageId(player?.id, ""),
    playerName: sanitizePlayerName(player?.name, "PLAYER"),
    primaryValue: stats.completedCount,
    secondaryValue: stats.totalBestScore,
    score: stats.totalBestScore,
    completedCount: stats.completedCount,
    timestamp: stats.firstCompletedAt,
    sourceId: `challenge|${normalizeStorageId(player?.id, "")}`,
    context: "Challenge Mode",
    statText: `${stats.completedCount}/${CHALLENGES.length} complete - ${formatScore(stats.totalBestScore)} total best`
  };
}

function formatTitleDate(value) {
  const date = formatShortDate(value);
  return date || "Local record";
}

function buildTitleViewModel(definition, candidate) {
  if (!candidate) {
    return {
      ...definition,
      playerId: "",
      playerName: "",
      statText: "No holder yet",
      recordDate: "",
      sourceId: "",
      held: false
    };
  }
  return {
    ...definition,
    playerId: normalizeStorageId(candidate.playerId, ""),
    playerName: sanitizePlayerName(candidate.playerName, "PLAYER"),
    statText: sanitizeDisplayText(candidate.statText, "Local record", 80),
    recordDate: normalizeDateString(candidate.timestamp, ""),
    sourceId: sanitizeName(candidate.sourceId, "", 180),
    held: true
  };
}

function calculateLocalTitles(data) {
  const candidates = new Map();
  const consider = (candidate) => {
    if (!candidate?.titleId) return;
    const current = candidates.get(candidate.titleId);
    if (titleCandidateIsBetter(candidate, current)) {
      candidates.set(candidate.titleId, candidate);
    }
  };
  const entries = normalizeLeaderboardList(data?.leaderboard || []);
  entries.forEach((entry) => {
    const raceType = normalizeRaceTypeId(entry.raceType, DEFAULT_RACE_TYPE_ID);
    const raceMode = normalizeSpeedClassId(entry.raceMode || entry.speedClass, DEFAULT_SPEED_CLASS_ID);
    const trackId = normalizeTrackId(entry.trackId, DEFAULT_TRACK_ID);
    if (raceType === DEFAULT_RACE_TYPE_ID && trackId === "sunset-highway") {
      consider(makeScoreTitleCandidate("sunset_champion", entry, "Sunset Highway Classic"));
    }
    if (raceType === DEFAULT_RACE_TYPE_ID && trackId === "redline-run") {
      consider(makeScoreTitleCandidate("redline_champion", entry, "Redline Run Classic"));
    }
    if (raceMode === "turbo") {
      consider(makeScoreTitleCandidate("turbo_champion", entry, "Turbo runs"));
    }
    if (raceType === FUEL_RUN_RACE_TYPE_ID) {
      consider(makeScoreTitleCandidate("fuel_champion", entry, "Fuel Run"));
    }
    if (entry.cleanRun === true) {
      consider(makeScoreTitleCandidate("clean_champion", entry, "Finished clean runs"));
    }
  });
  const players = Array.isArray(data?.players) ? data.players : [];
  players.forEach((player) => consider(makeChallengeTitleCandidate(player)));
  return TITLE_DEFINITIONS.map((definition) => buildTitleViewModel(definition, candidates.get(definition.id) || null));
}

function getRelevantTitleIdsForSummary(summary) {
  const ids = new Set();
  if (!summary?.scoreSaved) return ids;
  const raceType = normalizeRaceTypeId(summary.raceTypeId, DEFAULT_RACE_TYPE_ID);
  const speedClass = normalizeSpeedClassId(summary.speedClass, DEFAULT_SPEED_CLASS_ID);
  const trackId = normalizeTrackId(summary.trackId, DEFAULT_TRACK_ID);
  if (raceType === DEFAULT_RACE_TYPE_ID && trackId === "sunset-highway") ids.add("sunset_champion");
  if (raceType === DEFAULT_RACE_TYPE_ID && trackId === "redline-run") ids.add("redline_champion");
  if (speedClass === "turbo") ids.add("turbo_champion");
  if (raceType === FUEL_RUN_RACE_TYPE_ID) ids.add("fuel_champion");
  if (summary.status === "finished" && (summary.slowdownHits || 0) === 0) ids.add("clean_champion");
  if (summary.challengeMode && summary.challengeResult?.completed && summary.challengeResult?.saved !== false) ids.add("challenge_champion");
  return ids;
}

function titleWasTouchedBySummary(title, summary) {
  if (!title?.held || !summary?.scoreSaved) return false;
  if (title.id === "challenge_champion") {
    return Boolean(summary.challengeMode && summary.challengeResult?.completed && summary.challengeResult?.saved !== false);
  }
  const sourceId = summary.scoreEntry ? getLeaderboardEntryTitleSource(summary.scoreEntry) : "";
  return Boolean(sourceId && title.sourceId === sourceId);
}

function getTitleChangesForSummary(summary, previousTitles, currentTitles) {
  const relevantIds = getRelevantTitleIdsForSummary(summary);
  const playerId = normalizeStorageId(summary?.playerId, "");
  const previousById = new Map((Array.isArray(previousTitles) ? previousTitles : []).map((title) => [title.id, title]));
  const currentById = new Map((Array.isArray(currentTitles) ? currentTitles : []).map((title) => [title.id, title]));
  const changes = { claimed: [], defended: [] };
  relevantIds.forEach((titleId) => {
    const current = currentById.get(titleId);
    if (!current?.held || !playerId || current.playerId !== playerId) return;
    if (!titleWasTouchedBySummary(current, summary)) return;
    const previous = previousById.get(titleId);
    const item = {
      id: current.id,
      name: current.name,
      description: current.description,
      context: current.context,
      statText: current.statText,
      recordDate: current.recordDate
    };
    if (previous?.held && previous.playerId === playerId) {
      changes.defended.push(item);
    } else {
      changes.claimed.push(item);
    }
  });
  return changes;
}

function normalizeCarConfig(value, fallback = DEFAULT_CAR) {
  const source = value && typeof value === "object" ? value : {};
  const fallbackCar = { ...DEFAULT_CAR, ...(fallback && typeof fallback === "object" ? fallback : {}) };
  const style = CAR_BODY_STYLES.some((item) => item.id === source.bodyStyle) ? source.bodyStyle : fallbackCar.bodyStyle;
  const carStyle = normalizeCarStyle(source.carStyle, fallbackCar.carStyle || DEFAULT_CAR_STYLE);
  return {
    name: sanitizeCarName(source.name, fallbackCar.name),
    bodyColor: normalizeHexColor(source.bodyColor, fallbackCar.bodyColor),
    stripeColor: normalizeHexColor(source.stripeColor, fallbackCar.stripeColor),
    windowColor: normalizeHexColor(source.windowColor, fallbackCar.windowColor),
    bodyStyle: style,
    useSprite: source.useSprite !== false,
    carStyle
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
  const progressPercent = Number.isFinite(Number(summary.progressPercent))
    ? Number(summary.progressPercent)
    : (Number.isFinite(Number(summary.finishProgressPercent))
      ? Number(summary.finishProgressPercent)
      : Number(summary.progress || 0) * 100);
  return {
    status: normalizeRunStatus(summary.status),
    score: normalizeNonNegativeInteger(Number.isFinite(Number(summary.score)) ? summary.score : summary.finalScore || 0),
    raceType: normalizeRaceTypeId(summary.raceType || summary.raceTypeId, DEFAULT_RACE_TYPE_ID),
    raceMode: normalizeSpeedClassId(summary.raceMode || summary.speedClass, DEFAULT_SPEED_CLASS_ID),
    seed: normalizeStoredRoadSeed(summary.seed, ""),
    time: normalizeNonNegativeNumber(summary.time, 0, 24 * 60 * 60),
    progressPercent: clampNumber(progressPercent, 0, 100, 0),
    slowdownHits: normalizeNonNegativeInteger(summary.slowdownHits, 0, 999),
    nearMisses: normalizeNonNegativeInteger(summary.nearMisses, 0, 999),
    boostPadsCollected: normalizeNonNegativeInteger(summary.boostPadsCollected, 0, 999),
    gasCansCollected: normalizeNonNegativeInteger(summary.gasCansCollected || summary.fuelCollected, 0, 999),
    outOfFuel: Boolean(summary.outOfFuel || summary.outOfFuelOccurred || summary.status === "outOfFuel"),
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
  const bestRunSummary = normalizeChallengeRunSummary(entry.bestRunSummary || entry.runSummary || entry.summary);
  const bestProgressPercent = Number.isFinite(Number(entry.bestProgressPercent))
    ? Number(entry.bestProgressPercent)
    : (Number.isFinite(Number(entry.progressPercent))
      ? Number(entry.progressPercent)
      : (bestRunSummary?.progressPercent || (entry.completed || entry.bestCompletionStatus ? 100 : 0)));
  return {
    challengeId: normalizeStorageId(entry.challengeId || challengeId || "", challengeId || ""),
    completed: Boolean(entry.completed || entry.bestCompletionStatus),
    bestCompletionStatus: Boolean(entry.completed || entry.bestCompletionStatus),
    bestScore: normalizeNonNegativeInteger(bestScore),
    bestProgressPercent: clampNumber(bestProgressPercent, 0, 100, 0),
    bestDate: normalizeDateString(entry.bestDate || entry.date, ""),
    bestRunSummary
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
  const track = getTrackById(entry.trackId);
  const status = normalizeRunStatus(entry.status);
  const hasSlowdownHits = entry.slowdownHits !== null && entry.slowdownHits !== undefined && entry.slowdownHits !== "";
  const slowdownHits = hasSlowdownHits ? normalizeNonNegativeInteger(entry.slowdownHits, 0, 9999) : null;
  return {
    runId: normalizeStorageId(entry.runId || entry.id, ""),
    playerName: sanitizePlayerName(entry.playerName, "PLAYER"),
    playerId: normalizeStorageId(entry.playerId, ""),
    carName: sanitizeCarName(entry.carName, "CAR"),
    trackId: normalizeTrackId(entry.trackId || track?.id, track?.id || DEFAULT_TRACK_ID),
    trackName: sanitizeName(entry.trackName || track?.name, track?.name || "TRACK", DISPLAY_TEXT_MAX_LENGTH),
    speedClass,
    raceMode: normalizeSpeedClassId(entry.raceMode || speedClass, speedClass),
    raceType,
    seed: normalizeStoredRoadSeed(entry.seed, CLASSIC_SEED_LABEL),
    score: normalizeNonNegativeInteger(entry.score),
    status,
    time: normalizeNonNegativeNumber(entry.time, 0, 24 * 60 * 60),
    slowdownHits,
    cleanRun: status === "finished" && Boolean(entry.cleanRun === true || entry.clean === true || slowdownHits === 0),
    fuelCollected: normalizeNonNegativeInteger(Number.isFinite(Number(entry.fuelCollected)) ? entry.fuelCollected : entry.gasCansCollected || 0, 0, 999),
    fuelRemaining: normalizeNonNegativeInteger(entry.fuelRemaining, 0, FUEL_RUN_CONFIG.fuelMax),
    fuelBonus: normalizeNonNegativeInteger(entry.fuelBonus),
    date: normalizeDateString(entry.date, ""),
    partyMode: Boolean(entry.partyMode),
    partySessionId: normalizeStorageId(entry.partySessionId, ""),
    partyRoundType: normalizePartyRoundType(entry.partyRoundType, PARTY_ROUND_TYPE_ONE_RUN),
    partyRoundIndex: normalizeNonNegativeInteger(entry.partyRoundIndex || entry.partyRoundNumber, 0, 99),
    partySeed: normalizeStoredRoadSeed(entry.partySeed || entry.partySharedSeed || entry.sharedSeed, ""),
    challengeId,
    challengeName: challengeId ? sanitizeName(entry.challengeName || challenge?.name, challenge?.name || "Challenge", DISPLAY_TEXT_MAX_LENGTH) : "",
    challengeCompleted: Boolean(entry.challengeCompleted)
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

function normalizePlaytestRunSummary(entry) {
  if (!entry || typeof entry !== "object") return null;
  const raceTypeId = normalizeRaceTypeId(entry.raceTypeId || entry.raceType, DEFAULT_RACE_TYPE_ID);
  const raceModeId = normalizeSpeedClassId(entry.raceModeId || entry.raceMode || entry.speedClass, DEFAULT_SPEED_CLASS_ID);
  const status = normalizeRunStatus(entry.status || entry.result);
  const track = getTrackById(entry.trackId);
  const challenge = getChallengeById(entry.challengeId);
  const progressPercent = Number.isFinite(Number(entry.finishProgressPercent))
    ? Number(entry.finishProgressPercent)
    : Number(entry.progress || 0) * 100;
  return {
    runId: normalizeStorageId(entry.runId || entry.id, uid()),
    timestamp: normalizeDateString(entry.timestamp, new Date().toISOString()),
    gameVersion: sanitizeName(entry.gameVersion || GAME_VERSION, GAME_VERSION, 32),
    playerDisplayName: sanitizePlayerName(entry.playerDisplayName || entry.playerName, "PLAYER"),
    trackId: normalizeStorageId(track?.id || entry.trackId, TRACKS[0].id),
    trackName: sanitizeName(entry.trackName || track?.name, TRACKS[0].name, DISPLAY_TEXT_MAX_LENGTH),
    raceTypeId,
    raceTypeLabel: sanitizeName(entry.raceTypeLabel || getRaceTypeLabel(raceTypeId), getRaceTypeLabel(raceTypeId), DISPLAY_TEXT_MAX_LENGTH),
    raceModeId,
    raceModeLabel: sanitizeName(entry.raceModeLabel || getSpeedClassLabel(raceModeId), getSpeedClassLabel(raceModeId), DISPLAY_TEXT_MAX_LENGTH),
    challengeId: challenge ? challenge.id : "",
    challengeName: challenge ? sanitizeName(entry.challengeName || challenge.name, challenge.name, DISPLAY_TEXT_MAX_LENGTH) : "",
    challengeObjective: challenge ? sanitizeName(entry.challengeObjective || getChallengeObjectiveLabel(challenge), getChallengeObjectiveLabel(challenge), DISPLAY_TEXT_MAX_LENGTH) : "",
    challengeCompleted: Boolean(entry.challengeCompleted),
    challengePreviousBest: normalizeNonNegativeInteger(entry.challengePreviousBest || entry.previousBest),
    challengeNewBest: Boolean(entry.challengeNewBest || entry.newBest),
    newlyEarnedBadges: normalizeBadgeIdList(entry.newlyEarnedBadges || entry.badgesEarned, BADGE_DEFINITIONS.length)
      .filter((id) => isVisibleBadgeDefinition(getBadgeDefinition(id))),
    totalBadgesEarned: normalizeNonNegativeInteger(entry.totalBadgesEarned, 0, getVisibleBadgeDefinitions().length),
    partyMode: Boolean(entry.partyMode),
    partySessionId: normalizeStorageId(entry.partySessionId, ""),
    partyRoundType: normalizePartyRoundType(entry.partyRoundType, PARTY_ROUND_TYPE_ONE_RUN),
    partyRoundIndex: normalizeNonNegativeInteger(entry.partyRoundIndex || entry.partyRoundNumber, 0, 99),
    partyTotalRounds: normalizeNonNegativeInteger(entry.partyTotalRounds, 0, 99),
    partySeedMode: normalizePartySeedMode(entry.partySeedMode, PARTY_SEED_MODE_SAME_ROUND),
    partySeed: normalizeStoredRoadSeed(entry.partySeed || entry.partySharedSeed || entry.sharedSeed, ""),
    partyTotalScore: normalizeNonNegativeInteger(entry.partyTotalScore, 0, MAX_DISPLAY_SCORE),
    partyBestScore: normalizeNonNegativeInteger(entry.partyBestScore, 0, MAX_DISPLAY_SCORE),
    partyLeaderChanges: normalizeNonNegativeInteger(entry.partyLeaderChanges, 0, 99),
    partyTurnIndex: normalizeNonNegativeInteger(entry.partyTurnIndex, 0, PARTY_MAX_PLAYERS),
    partyPlayerCount: normalizeNonNegativeInteger(entry.partyPlayerCount, 0, PARTY_MAX_PLAYERS),
    partySharedSeed: normalizeStoredRoadSeed(entry.partySharedSeed || entry.partySeed || entry.sharedSeed, ""),
    partyRankAfterRun: normalizeNonNegativeInteger(entry.partyRankAfterRun || entry.partyRank, 0, PARTY_MAX_PLAYERS),
    partyStandingGap: normalizeNonNegativeInteger(entry.partyStandingGap || entry.leaderMargin),
    roadSeed: normalizeStoredRoadSeed(entry.roadSeed || entry.seed, CLASSIC_SEED_LABEL),
    result: getRunStatusLabel(status),
    status,
    finalScore: normalizeNonNegativeInteger(entry.finalScore || entry.score),
    elapsedTime: normalizeNonNegativeNumber(entry.elapsedTime || entry.time, 0, 24 * 60 * 60),
    distanceCompleted: normalizeNonNegativeNumber(entry.distanceCompleted || entry.distance),
    finishProgressPercent: clampNumber(progressPercent, 0, 100, 0),
    endReason: sanitizeName(entry.endReason || entry.reason, "", DISPLAY_TEXT_MAX_LENGTH),
    boostsUsed: normalizeNonNegativeInteger(entry.boostsUsed || entry.manualBoostsUsed, 0, 99),
    boostPadsCollected: normalizeNonNegativeInteger(entry.boostPadsCollected, 0, 999),
    rampsUsed: normalizeNonNegativeInteger(entry.rampsUsed, 0, 999),
    nearMisses: normalizeNonNegativeInteger(entry.nearMisses, 0, 999),
    slowdownHits: normalizeNonNegativeInteger(entry.slowdownHits, 0, 999),
    collisionType: sanitizeName(entry.collisionType, "", DISPLAY_TEXT_MAX_LENGTH),
    laneChanges: normalizeNonNegativeInteger(entry.laneChanges || entry.laneMoves, 0, 9999),
    verticalMovementAmount: normalizeNonNegativeNumber(entry.verticalMovementAmount, 0, 9999),
    centerLaneTime: normalizeNonNegativeNumber(entry.centerLaneTime, 0, 24 * 60 * 60),
    longestCenterLaneStreak: normalizeNonNegativeNumber(entry.longestCenterLaneStreak, 0, 24 * 60 * 60),
    averageSpeed: normalizeNonNegativeNumber(entry.averageSpeed, 0, 99999),
    maxSpeed: normalizeNonNegativeNumber(entry.maxSpeed, 0, 99999),
    finalSectionId: normalizeStorageId(entry.finalSectionId, ""),
    finalSectionName: sanitizeName(entry.finalSectionName, "", DISPLAY_TEXT_MAX_LENGTH),
    roadDirectorWaveCount: normalizeNonNegativeInteger(entry.roadDirectorWaveCount, 0, 99999),
    wavesFirst10Seconds: normalizeNonNegativeInteger(entry.wavesFirst10Seconds, 0, 99999),
    launchWaveCount: normalizeNonNegativeInteger(entry.launchWaveCount, 0, 99999),
    meaningfulWaveCount: normalizeNonNegativeInteger(entry.meaningfulWaveCount, 0, 99999),
    supportWaveCount: normalizeNonNegativeInteger(entry.supportWaveCount, 0, 99999),
    popInPreventedCount: normalizeNonNegativeInteger(entry.popInPreventedCount, 0, 99999),
    wavesSpawnedInsideVisibleCount: normalizeNonNegativeInteger(entry.wavesSpawnedInsideVisibleCount, 0, 99999),
    maxWavesSpawnedInSingleFrame: normalizeNonNegativeInteger(entry.maxWavesSpawnedInSingleFrame, 0, 999),
    sectionTransitionWaveBurstCount: normalizeNonNegativeInteger(entry.sectionTransitionWaveBurstCount, 0, 99999),
    catchUpSpawnsBlockedCount: normalizeNonNegativeInteger(entry.catchUpSpawnsBlockedCount, 0, 99999),
    maxVisibleHardBlockers: normalizeNonNegativeInteger(entry.maxVisibleHardBlockers, 0, 99),
    maxTacticalHardBlockers: normalizeNonNegativeInteger(entry.maxTacticalHardBlockers, 0, 99),
    maxHardBlockersNext3Seconds: normalizeNonNegativeInteger(entry.maxHardBlockersNext3Seconds, 0, 99),
    maxHardBlockersInTwoSeconds: normalizeNonNegativeInteger(entry.maxHardBlockersInTwoSeconds, 0, 99),
    maxHardBlockersInThreeLaneNeighborhood: normalizeNonNegativeInteger(entry.maxHardBlockersInThreeLaneNeighborhood, 0, 99),
    visibleWaveOverlapMax: normalizeNonNegativeInteger(entry.visibleWaveOverlapMax, 0, 99),
    activeFieldBudgetDelays: normalizeNonNegativeInteger(entry.activeFieldBudgetDelays, 0, 99999),
    activeFieldRejectedSpawns: normalizeNonNegativeInteger(entry.activeFieldRejectedSpawns, 0, 99999),
    combinedRouteFailures: normalizeNonNegativeInteger(entry.combinedRouteFailures, 0, 99999),
    barrierCount: normalizeNonNegativeInteger(entry.barrierCount, 0, 99999),
    supportObjectsSuppressedByDensity: normalizeNonNegativeInteger(entry.supportObjectsSuppressedByDensity, 0, 99999),
    deadScreenTime: normalizeNonNegativeNumber(entry.deadScreenTime, 0, 24 * 60 * 60),
    longestDeadScreenSeconds: normalizeNonNegativeNumber(entry.longestDeadScreenSeconds, 0, 24 * 60 * 60),
    timeSinceLastMeaningfulDecisionMax: normalizeNonNegativeNumber(entry.timeSinceLastMeaningfulDecisionMax, 0, 24 * 60 * 60),
    visibleMeaningfulMin: normalizeNonNegativeInteger(entry.visibleMeaningfulMin, 0, 999),
    visibleMeaningfulAverage: normalizeNonNegativeNumber(entry.visibleMeaningfulAverage, 0, 999),
    upcomingDecisionGapMax: normalizeNonNegativeNumber(entry.upcomingDecisionGapMax, 0, 24 * 60 * 60),
    underActivityCorrections: normalizeNonNegativeInteger(entry.underActivityCorrections, 0, 99999),
    overActivityDelays: normalizeNonNegativeInteger(entry.overActivityDelays, 0, 99999),
    directorIntentCounts: normalizeCountMap(entry.directorIntentCounts),
    waveFamilyCounts: normalizeCountMap(entry.waveFamilyCounts),
    rewardLaneDistribution: normalizeCountMap(entry.rewardLaneDistribution || entry.rewardLaneCounts, 8),
    rampUseRate: normalizeNonNegativeNumber(entry.rampUseRate, 0, 1),
    rampsSpawned: normalizeNonNegativeInteger(entry.rampsSpawned, 0, 9999),
    rampAirborneDuration: normalizeNonNegativeNumber(entry.rampAirborneDuration, 0, 10),
    rampClearDistance: normalizeNonNegativeNumber(entry.rampClearDistance, 0, 99999),
    rampLandingSafetyDistance: normalizeNonNegativeNumber(entry.rampLandingSafetyDistance, 0, 99999),
    rampTargetsAssigned: normalizeNonNegativeInteger(entry.rampTargetsAssigned, 0, 9999),
    rampTargetsCleared: normalizeNonNegativeInteger(entry.rampTargetsCleared, 0, 9999),
    rampLandingRejected: normalizeNonNegativeInteger(entry.rampLandingRejected, 0, 9999),
    rampFailedToClearTarget: normalizeNonNegativeInteger(entry.rampFailedToClearTarget, 0, 9999),
    hardestPressureObserved: normalizeNonNegativeNumber(entry.hardestPressureObserved, 0, 999),
    gasCansSpawned: normalizeNonNegativeInteger(entry.gasCansSpawned, 0, 9999),
    gasCansCollected: normalizeNonNegativeInteger(entry.gasCansCollected || entry.fuelCollected, 0, 9999),
    fuelRemaining: normalizeNonNegativeNumber(entry.fuelRemaining, 0, FUEL_RUN_CONFIG.fuelMax),
    fuelSavedByBoost: normalizeNonNegativeNumber(entry.fuelSavedByBoost, 0, FUEL_RUN_CONFIG.fuelMax),
    fuelDrainPausedTime: normalizeNonNegativeNumber(entry.fuelDrainPausedTime, 0, 24 * 60 * 60),
    boostsUsedInFuelRun: normalizeNonNegativeInteger(entry.boostsUsedInFuelRun, 0, 99),
    lowestFuelReached: normalizeNonNegativeNumber(entry.lowestFuelReached, 0, FUEL_RUN_CONFIG.fuelMax),
    fuelAt25Percent: normalizeOptionalFuelAmount(entry.fuelAt25Percent),
    fuelAt50Percent: normalizeOptionalFuelAmount(entry.fuelAt50Percent),
    fuelAt75Percent: normalizeOptionalFuelAmount(entry.fuelAt75Percent),
    gasCansSpawnedBySection: normalizeSectionCountMap(entry.gasCansSpawnedBySection),
    gasCansCollectedBySection: normalizeSectionCountMap(entry.gasCansCollectedBySection),
    longestNoFuelStretch: normalizeNonNegativeNumber(entry.longestNoFuelStretch, 0, 24 * 60 * 60),
    lowFuelTime: normalizeNonNegativeNumber(entry.lowFuelTime, 0, 24 * 60 * 60),
    criticalFuelTime: normalizeNonNegativeNumber(entry.criticalFuelTime, 0, 24 * 60 * 60),
    outOfFuelOccurred: Boolean(entry.outOfFuelOccurred || status === "outOfFuel")
  };
}

function normalizePlaytestReportFilter(value) {
  const id = String(value || "all");
  return PLAYTEST_REPORT_FILTERS.some((filter) => filter.id === id) ? id : "all";
}

function getChallengeRunStats(summary) {
  const breakdown = summary?.scoreBreakdown || {};
  const progressPercent = Number.isFinite(Number(summary?.progressPercent))
    ? Number(summary.progressPercent)
    : Number(summary?.progress || 0) * 100;
  return {
    finished: summary?.status === "finished",
    outOfFuel: summary?.status === "outOfFuel",
    finalScore: Math.max(0, Math.round(summary?.finalScore || 0)),
    raceType: normalizeRaceTypeId(summary?.raceType || summary?.raceTypeId, DEFAULT_RACE_TYPE_ID),
    raceMode: normalizeSpeedClassId(summary?.speedClass, DEFAULT_SPEED_CLASS_ID),
    seed: normalizeStoredRoadSeed(summary?.seed, ""),
    progressPercent: clampNumber(progressPercent, 0, 100, 0),
    slowdownHits: Math.max(0, Math.round(summary?.slowdownHits || 0)),
    nearMisses: Math.max(0, Math.round(summary?.nearMisses || 0)),
    nearMissScore: Math.max(0, Math.round(breakdown.nearMiss || 0)),
    boostUseCount: Math.max(0, Math.round(summary?.manualBoostsUsed || 0)),
    boostPadsCollected: Math.max(0, Math.round(summary?.boostPadsCollected || 0)),
    gasCansCollected: Math.max(0, Math.round(summary?.gasCansCollected || summary?.fuelCollected || 0)),
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
    if (completed) {
      detail = "Finished without slowdown hits";
    } else if (!stats.finished) {
      detail = `Finish still needed · ${stats.slowdownHits} slowdown hit${stats.slowdownHits === 1 ? "" : "s"}`;
    } else {
      detail = `${stats.slowdownHits} slowdown hit${stats.slowdownHits === 1 ? "" : "s"}`;
    }
  } else if (objective.type === "useAllManualBoosts") {
    const target = Math.max(1, Math.round(objective.target || 3));
    completed = stats.finished && stats.boostUseCount >= target;
    detail = completed
      ? `Used ${stats.boostUseCount}/${target} manual boosts and finished`
      : `Used ${stats.boostUseCount}/${target} manual boosts${stats.finished ? "" : ", finish still needed"}`;
  } else if (objective.type === "reachProgress") {
    const target = clampNumber(objective.targetPercent ?? objective.target, 1, 100, 50);
    completed = stats.finished || stats.progressPercent >= target;
    detail = `${formatChallengeProgressPercent(stats.progressPercent)}/${formatChallengeProgressPercent(target)} progress`;
  } else if (objective.type === "collectBoostPads") {
    const target = Math.max(1, Math.round(objective.target || 1));
    const progressTarget = clampNumber(objective.progressTargetPercent ?? objective.targetPercent, 0, 100, 0);
    completed = stats.boostPadsCollected >= target && stats.progressPercent >= progressTarget;
    detail = `${stats.boostPadsCollected}/${target} boost pads · ${formatChallengeProgressPercent(stats.progressPercent)}/${formatChallengeProgressPercent(progressTarget)} progress`;
  } else if (objective.type === "fuelProgress") {
    const target = clampNumber(objective.targetPercent ?? objective.target, 1, 100, 75);
    completed = stats.raceType === FUEL_RUN_RACE_TYPE_ID && stats.progressPercent >= target && !stats.outOfFuel;
    if (stats.raceType !== FUEL_RUN_RACE_TYPE_ID) {
      detail = "Fuel Run required";
    } else if (stats.outOfFuel) {
      detail = `Out of fuel at ${formatChallengeProgressPercent(stats.progressPercent)}/${formatChallengeProgressPercent(target)}`;
    } else {
      detail = `${formatChallengeProgressPercent(stats.progressPercent)}/${formatChallengeProgressPercent(target)} progress with fuel`;
    }
  } else if (objective.type === "finishFuelRun") {
    completed = stats.raceType === FUEL_RUN_RACE_TYPE_ID && stats.finished;
    if (completed) {
      detail = `Finished Fuel Run with ${stats.gasCansCollected} gas can${stats.gasCansCollected === 1 ? "" : "s"}`;
    } else if (stats.raceType !== FUEL_RUN_RACE_TYPE_ID) {
      detail = "Fuel Run required";
    } else if (stats.outOfFuel) {
      detail = `Out of fuel at ${formatChallengeProgressPercent(stats.progressPercent)}`;
    } else {
      detail = "Fuel Run finish still needed";
    }
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
    raceType: stats.raceType,
    seed: stats.seed,
    progressPercent: stats.progressPercent,
    slowdownHits: stats.slowdownHits,
    nearMisses: stats.nearMisses,
    nearMissScore: stats.nearMissScore,
    boostUseCount: stats.boostUseCount,
    boostPadsCollected: stats.boostPadsCollected,
    gasCansCollected: stats.gasCansCollected,
    outOfFuel: stats.outOfFuel,
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

function getTrackDirectorCadence(speedClassId = DEFAULT_SPEED_CLASS_ID, track = TRACKS[0]) {
  const id = normalizeSpeedClassId(speedClassId);
  const base = TRACK_DIRECTOR.modeCadence[id] || TRACK_DIRECTOR.modeCadence[DEFAULT_SPEED_CLASS_ID];
  const profile = track?.roadDirectorProfile || {};
  const mode = profile.modeCadenceMultipliers?.[id] || {};
  const cadenceScale = clampNumber(mode.cadenceScale ?? profile.cadenceScale, 0.5, 1.8, 1);
  const randomScale = clampNumber(mode.randomScale ?? profile.randomScale, 0.25, 1.8, 1);
  const spacingScale = clampNumber(mode.spacingScale ?? profile.spacingScale, 0.4, 1.8, 1);
  const recoveryScale = clampNumber(mode.recoveryScale ?? profile.recoveryScale, 0.4, 2.2, 1);
  return {
    ...base,
    early: (base.early ?? 1) * cadenceScale,
    mid: (base.mid ?? 1) * cadenceScale,
    late: (base.late ?? 1) * cadenceScale,
    randomEarly: (base.randomEarly ?? 0) * randomScale,
    randomLate: (base.randomLate ?? 0) * randomScale,
    spacingScale: (base.spacingScale ?? 1) * spacingScale,
    recoveryScale: (base.recoveryScale ?? 1) * recoveryScale,
    centerSafe: (base.centerSafe ?? TRACK_DIRECTOR.centerSafeSecondsLimit) * cadenceScale,
    centerHold: (base.centerHold ?? TRACK_DIRECTOR.centerHoldSeconds) * cadenceScale,
    laneStill: (base.laneStill ?? 3) * cadenceScale,
    forceMeaningful: (base.forceMeaningful ?? 3) * cadenceScale
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
          bestScore: normalizeNonNegativeInteger(player?.bestScore),
          badges: normalizePlayerBadges(player?.badges),
          badgeStats: normalizePlayerBadgeStats(player?.badgeStats || player?.stats),
          challengeProgress: normalizePlayerChallengeSave(player?.challengeProgress || player?.challengeStats)
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
      car: normalizeCarConfig(DEFAULT_CAR),
      bestScore: 0,
      badges: createDefaultBadgeSave(),
      badgeStats: createDefaultPlayerBadgeStats(),
      challengeProgress: createDefaultPlayerChallengeSave()
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

  getPlayerBadgeProgress(playerOrId) {
    const player = typeof playerOrId === "string" ? this.getPlayerById(playerOrId) : playerOrId;
    return getBadgeProgress(player);
  }

  getBadgeViewModels(playerOrId) {
    const player = typeof playerOrId === "string" ? this.getPlayerById(playerOrId) : playerOrId;
    const badges = normalizePlayerBadges(player?.badges);
    return getVisibleBadgeDefinitions().map((definition) => {
      const earnedEntry = badges.earned[definition.id] || null;
      return {
        ...definition,
        categoryLabel: getBadgeCategoryLabel(definition.category),
        earned: Boolean(earnedEntry),
        earnedAt: earnedEntry?.earnedAt || ""
      };
    });
  }

  getTitleBoard() {
    return calculateLocalTitles(this.data);
  }

  getPlayerTitles(playerOrId) {
    const player = typeof playerOrId === "string" ? this.getPlayerById(playerOrId) : playerOrId;
    const playerId = normalizeStorageId(player?.id || playerOrId, "");
    if (!playerId) return [];
    return this.getTitleBoard().filter((title) => title.held && title.playerId === playerId);
  }

  recordPlayerChallengeCompletion(playerId, challengeId, score, completedAt = new Date().toISOString()) {
    const player = this.getPlayerById(playerId);
    const challenge = getChallengeById(challengeId);
    if (!player || !challenge) return false;
    player.challengeProgress = normalizePlayerChallengeSave(player.challengeProgress || player.challengeStats);
    const existing = player.challengeProgress.completed[challenge.id] || null;
    const cleanScore = normalizeNonNegativeInteger(score, 0, MAX_DISPLAY_SCORE);
    const firstCompletedAt = existing?.firstCompletedAt || normalizeDateString(completedAt, new Date().toISOString());
    const improved = cleanScore > (existing?.bestScore || 0);
    player.challengeProgress.completed[challenge.id] = {
      challengeId: challenge.id,
      completed: true,
      bestScore: Math.max(existing?.bestScore || 0, cleanScore),
      firstCompletedAt,
      bestDate: improved || !existing?.bestDate ? normalizeDateString(completedAt, firstCompletedAt) : existing.bestDate
    };
    return true;
  }

  evaluateRunTitles(summary, previousTitles) {
    const currentTitles = this.getTitleBoard();
    return getTitleChangesForSummary(summary, previousTitles, currentTitles);
  }

  awardBadges(playerId, badgeIds, earnedAt = new Date().toISOString()) {
    const player = this.getPlayerById(playerId);
    if (!player) return [];
    player.badges = normalizePlayerBadges(player.badges);
    const newlyEarned = [];
    normalizeBadgeIdList(badgeIds).forEach((id) => {
      if (player.badges.earned[id]) return;
      const definition = getBadgeDefinition(id);
      if (!isVisibleBadgeDefinition(definition)) return;
      player.badges.earned[id] = { earnedAt };
      newlyEarned.push({
        ...definition,
        earnedAt
      });
    });
    if (newlyEarned.length) this.save();
    return newlyEarned;
  }

  recordBadgeRunStats(summary) {
    const player = this.getPlayerById(summary?.playerId);
    if (!player || summary?.scoreSaved === false) return createDefaultPlayerBadgeStats();
    player.badgeStats = normalizePlayerBadgeStats(player.badgeStats);
    player.badgeStats.totalRuns += 1;
    if (summary.partyMode) player.badgeStats.partyRuns += 1;
    this.save();
    return player.badgeStats;
  }

  recordPartySessionWin(playerId, roundType) {
    const player = this.getPlayerById(playerId);
    if (!player) return createDefaultPlayerBadgeStats();
    player.badgeStats = normalizePlayerBadgeStats(player.badgeStats);
    player.badgeStats.partyWins += 1;
    if (normalizePartyRoundType(roundType) === PARTY_ROUND_TYPE_BEST_OF_3) {
      player.badgeStats.bestOf3Wins += 1;
    }
    this.save();
    return player.badgeStats;
  }

  evaluateRunBadges(summary) {
    if (!summary?.scoreSaved || !summary.playerId) return [];
    const badgeIds = ["first_run_posted"];
    const player = this.getPlayerById(summary.playerId);
    const badgeStats = normalizePlayerBadgeStats(player?.badgeStats);
    const speedClass = normalizeSpeedClassId(summary.speedClass, DEFAULT_SPEED_CLASS_ID);

    if (summary.status === "finished") {
      badgeIds.push("first_finish");
      if (summary.trackId === "sunset-highway") badgeIds.push("sunset_finisher");
      if (summary.trackId === "redline-run") badgeIds.push("redline_finisher");
      if (summary.speedClass === "turbo") badgeIds.push("turbo_survivor");
      if (summary.speedClass === "overdrive") badgeIds.push("overdrive_survivor");
      if (summary.speedClass === "redline") badgeIds.push("redline_survivor");
      if ((summary.averageSpeed || 0) >= SPEED_DEMON_AVERAGE_SPEED_THRESHOLD) badgeIds.push("speed_demon");
      if (summary.trackId === "redline-run" && isSpeedClassAtLeast(speedClass, "pro")) badgeIds.push("redline_master");
      if (summary.trackId === "sunset-highway" && isSpeedClassAtLeast(speedClass, "pro")) badgeIds.push("sunset_master");
      if (isSpeedClassAtLeast(speedClass, "turbo") && (summary.manualBoostsUsed || 0) === 0) badgeIds.push("no_boost_turbo");
      if (isSpeedClassAtLeast(speedClass, "pro") && (summary.manualBoostsUsed || 0) === 0) badgeIds.push("no_boost_finish");
      if ((summary.slowdownHits || 0) === 0) badgeIds.push("clean_run");
      if (isSpeedClassAtLeast(speedClass, "turbo") && (summary.slowdownHits || 0) === 0) badgeIds.push("clean_turbo");
      if (summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID) badgeIds.push("fuel_run_finish");
      if (summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID && (summary.fuelRemaining || 0) <= 10) badgeIds.push("fuel_clutch");
      if (summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID && (summary.fuelRemaining || 0) >= 40) badgeIds.push("fuel_hoarder");
      if (summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID && (summary.lowestFuelReached || FUEL_RUN_CONFIG.fuelMax) <= 25) badgeIds.push("comeback_finish");
    }
    if ((summary.nearMisses || 0) >= 5) badgeIds.push("near_miss_streak");
    if ((summary.nearMisses || 0) >= 10) badgeIds.push("near_miss_10");
    if ((summary.rampsUsed || 0) >= 5) badgeIds.push("ramp_rider");
    if ((summary.rampTargetsCleared || 0) >= 5) badgeIds.push("jump_master");
    if (summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID && (summary.gasCansCollected || 0) >= 5) badgeIds.push("gas_gremlin");
    if (summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID && (summary.fuelSavedByBoost || 0) >= 10) badgeIds.push("boost_saver");
    if (summary.partyMode && badgeStats.partyRuns >= 5) badgeIds.push("party_regular");
    if (summary.challengeMode && summary.challengeResult?.completed && summary.challengeResult?.saved !== false) {
      badgeIds.push("first_challenge");
      const challenge = getChallengeById(summary.challengeId);
      const challengeStats = getPlayerChallengeTitleStats(player);
      if (challengeStats.completedCount >= 3) badgeIds.push("challenge_regular");
      if (challengeStats.completedCount >= 8) badgeIds.push("challenge_ace");
      if (getChallengeDifficultyLabel(challenge) === "Dare") badgeIds.push("daredevil");
      if (challenge?.trackId === "redline-run") badgeIds.push("first_redline_challenge");
    }

    return this.awardBadges(summary.playerId, badgeIds);
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
      bestProgressPercent: 0,
      bestDate: "",
      bestRunSummary: null
    };
    const score = Math.max(0, Math.round(summary?.finalScore || evaluation.score || 0));
    const progressPercent = clampNumber(evaluation.progressPercent ?? Number(summary?.progress || 0) * 100, 0, 100, 0);
    const scoreImproved = score > (existing.bestScore || 0);
    const progressImproved = progressPercent > (existing.bestProgressPercent || 0);
    const completionImproved = Boolean(evaluation.completed && !existing.completed);
    const shouldStoreRun = scoreImproved || progressImproved || completionImproved || !existing.bestDate;
    const date = evaluation.date || new Date().toISOString();
    const bestRunSummary = shouldStoreRun
      ? normalizeChallengeRunSummary({
        status: summary?.status,
        score,
        raceType: summary?.raceTypeId,
        raceMode: summary?.speedClass,
        seed: summary?.seed,
        time: summary?.time,
        progressPercent,
        slowdownHits: summary?.slowdownHits,
        nearMisses: summary?.nearMisses,
        boostPadsCollected: summary?.boostPadsCollected,
        gasCansCollected: summary?.gasCansCollected,
        outOfFuel: summary?.status === "outOfFuel",
        manualBoostsUsed: summary?.manualBoostsUsed,
        medalsEarned: evaluation.medalsEarned
      })
      : existing.bestRunSummary;

    const updated = {
      challengeId: challenge.id,
      completed: Boolean(existing.completed || evaluation.completed),
      bestCompletionStatus: Boolean(existing.completed || evaluation.completed),
      bestScore: Math.max(existing.bestScore || 0, score),
      bestProgressPercent: Math.max(existing.bestProgressPercent || 0, progressPercent),
      bestDate: shouldStoreRun ? date : existing.bestDate,
      bestRunSummary
    };
    save.progress[challenge.id] = updated;
    this.data.challengeProgress = save;
    if (evaluation.completed && summary?.playerId) {
      this.recordPlayerChallengeCompletion(summary.playerId, challenge.id, score, date);
    }
    this.save();
    return {
      ...evaluation,
      saved: true,
      previousBestScore: existing.bestScore || 0,
      bestScore: updated.bestScore,
      bestCompletionStatus: updated.bestCompletionStatus,
      newBest: scoreImproved,
      newBestProgress: progressImproved,
      newlyCompleted: completionImproved,
      bestProgressPercent: updated.bestProgressPercent,
      bestDate: updated.bestDate,
      bestRunSummary: updated.bestRunSummary
    };
  }
}

class PlaytestReportStore {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.status = "Not loaded";
    this.runs = this.load();
  }

  load() {
    const rawSave = safeStorageGetItem(this.storageKey);
    const parsed = safeJsonParse(rawSave);
    const source = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed?.runs) ? parsed.runs : []);
    const runs = source
      .slice(-PLAYTEST_REPORT_MAX_RUNS)
      .map((entry) => normalizePlaytestRunSummary(entry))
      .filter(Boolean);
    this.status = rawSave && !parsed ? "Recovered from corrupted playtest report data" : "Playtest reports loaded";
    return runs;
  }

  save() {
    const payload = {
      version: PLAYTEST_REPORT_VERSION,
      maxRuns: PLAYTEST_REPORT_MAX_RUNS,
      runs: this.runs.slice(-PLAYTEST_REPORT_MAX_RUNS)
    };
    if (safeStorageSetItem(this.storageKey, JSON.stringify(payload))) {
      this.status = `Saved ${this.runs.length} playtest run${this.runs.length === 1 ? "" : "s"}`;
      return true;
    }
    this.status = "Playtest report save failed";
    return false;
  }

  addRun(entry) {
    const cleanEntry = normalizePlaytestRunSummary({
      timestamp: new Date().toISOString(),
      runId: uid(),
      ...entry
    });
    if (!cleanEntry) {
      this.status = "Playtest run ignored";
      return null;
    }
    this.runs.push(cleanEntry);
    if (this.runs.length > PLAYTEST_REPORT_MAX_RUNS) {
      this.runs.splice(0, this.runs.length - PLAYTEST_REPORT_MAX_RUNS);
    }
    this.save();
    return cleanEntry;
  }

  clear() {
    safeStorageRemoveItem(this.storageKey);
    this.runs = [];
    this.status = "Playtest reports cleared";
  }

  getRuns() {
    return this.runs.slice();
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
    this.sessionId = normalizeStorageId(options.sessionId, uid());
    this.isPartyMode = true;
    this.roundType = normalizePartyRoundType(options.roundType, PARTY_ROUND_TYPE_ONE_RUN);
    this.seedMode = normalizePartySeedMode(options.seedMode, PARTY_SEED_MODE_SAME_ROUND);
    this.totalRounds = getPartyRoundTotal(this.roundType);
    this.selectedPlayers = players.slice(0, PARTY_MAX_PLAYERS).map(snapshotPartyPlayer);
    this.sharedSeed = normalizeRoadSeed(options.sharedSeed, DEFAULT_ROAD_SEED);
    this.track = getTrackById(options.track?.id || options.trackId || DEFAULT_TRACK_ID);
    this.raceMode = normalizeSpeedClassId(options.raceMode, DEFAULT_SPEED_CLASS_ID);
    this.raceType = normalizeRaceTypeId(options.raceType || options.raceTypeId, DEFAULT_RACE_TYPE_ID);
    this.results = Array.isArray(options.results) ? options.results.slice() : [];
    const nextRunIndex = Math.max(0, Math.min(this.results.length, this.totalPlayers * this.totalRounds));
    this.currentRoundIndex = clampNumber(options.currentRoundIndex ?? Math.floor(nextRunIndex / Math.max(1, this.totalPlayers)), 0, Math.max(0, this.totalRounds - 1), 0);
    this.currentPlayerIndex = clampNumber(options.currentPlayerIndex ?? (nextRunIndex % Math.max(1, this.totalPlayers)), 0, Math.max(0, this.selectedPlayers.length - 1), 0);
    this.roundSeeds = this.createRoundSeeds(options.roundSeeds);
    this.leaderChanges = normalizeNonNegativeInteger(options.leaderChanges || 0, 0, 99);
    this.completed = Boolean(options.completed) || this.results.length >= this.totalRuns;
    this.finalSfxPlayed = false;
  }

  createRoundSeeds(sourceSeeds = []) {
    const source = Array.isArray(sourceSeeds) ? sourceSeeds : [];
    const seeds = [];
    for (let index = 0; index < this.totalRounds; index += 1) {
      if (this.seedMode === PARTY_SEED_MODE_SAME_ROUND) {
        seeds.push(this.sharedSeed);
      } else {
        const sourceSeed = normalizeRoadSeed(source[index], "");
        seeds.push(sourceSeed || (index === 0 ? this.sharedSeed : generateReadableRoadSeed()));
      }
    }
    return seeds;
  }

  get currentPlayer() {
    return this.selectedPlayers[this.currentPlayerIndex] || null;
  }

  get totalPlayers() {
    return this.selectedPlayers.length;
  }

  get totalRuns() {
    return this.totalPlayers * this.totalRounds;
  }

  get completedRuns() {
    return this.results.length;
  }

  get roundNumber() {
    return clamp(this.currentRoundIndex + 1, 1, Math.max(1, this.totalRounds));
  }

  get currentTurnNumber() {
    return clamp(this.currentPlayerIndex + 1, 1, Math.max(1, this.totalPlayers));
  }

  get currentSeed() {
    return normalizeRoadSeed(this.roundSeeds[this.currentRoundIndex], this.sharedSeed);
  }

  get scoringLabel() {
    return getPartyScoringLabel(this.roundType);
  }

  addResult(summary) {
    const player = this.currentPlayer || snapshotPartyPlayer(summary?.player || {});
    const previousStandings = this.standings();
    const previousLeader = previousStandings[0]?.completedRuns > 0 ? previousStandings[0] : null;
    const previousPlayerStanding = previousStandings.find((standing) => standing.playerId === player.id) || null;
    const result = {
      resultId: uid(),
      playerId: player.id,
      playerName: sanitizePlayerName(player.name, "PLAYER"),
      carName: sanitizeCarName(player.car?.name, DEFAULT_CAR.name),
      score: normalizeNonNegativeInteger(summary?.finalScore || 0),
      status: normalizeRunStatus(summary?.status),
      reason: sanitizeName(summary?.reason, "", DISPLAY_TEXT_MAX_LENGTH),
      time: normalizeNonNegativeNumber(summary?.time, 0, 24 * 60 * 60),
      raceMode: normalizeSpeedClassId(summary?.speedClass || this.raceMode, this.raceMode),
      raceType: normalizeRaceTypeId(summary?.raceTypeId || summary?.raceType || this.raceType, this.raceType),
      seed: normalizeStoredRoadSeed(summary?.seed || this.currentSeed, this.currentSeed),
      trackId: normalizeTrackId(summary?.trackId || this.track?.id, this.track?.id || DEFAULT_TRACK_ID),
      trackName: sanitizeName(summary?.trackName || this.track?.name, "TRACK", DISPLAY_TEXT_MAX_LENGTH),
      roundType: this.roundType,
      seedMode: this.seedMode,
      roundIndex: this.roundNumber,
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      turnNumber: this.currentTurnNumber,
      totalPlayers: this.totalPlayers,
      fuelCollected: normalizeNonNegativeInteger(summary?.fuelCollected || 0, 0, 999),
      fuelRemaining: normalizeNonNegativeInteger(summary?.fuelRemaining || 0, 0, FUEL_RUN_CONFIG.fuelMax),
      fuelBonus: normalizeNonNegativeInteger(summary?.fuelBonus || 0),
      scoreSaved: summary?.scoreSaved !== false,
      leaderboardRank: Number.isFinite(summary?.topTwentyRank) ? summary.topTwentyRank : null,
      medals: Array.isArray(summary?.medals) ? summary.medals.slice(0, 3) : [],
      date: new Date().toISOString()
    };
    this.results.push(result);
    const standings = this.standings();
    const leader = standings[0] || null;
    const standing = standings.find((item) => item.resultId === result.resultId || item.playerId === result.playerId) || null;
    const leaderChanged = Boolean(previousLeader && leader && leader.playerId !== previousLeader.playerId);
    if (leaderChanged) this.leaderChanges += 1;
    result.rank = standing?.rank || 0;
    result.leaderMargin = standing?.leaderMargin || 0;
    result.bestScore = standing?.bestScore || result.score;
    result.totalScore = standing?.totalScore || result.score;
    result.latestScore = standing?.latestScore || result.score;
    result.completedRuns = standing?.completedRuns || 1;
    result.partyLeaderChanged = leaderChanged && leader?.playerId === result.playerId;
    result.partyComebackPlaces = previousPlayerStanding?.completedRuns > 0
      ? Math.max(0, (previousPlayerStanding.rank || 0) - (standing?.rank || 0))
      : 0;
    this.currentPlayerIndex += 1;
    if (this.currentPlayerIndex >= this.selectedPlayers.length) {
      this.currentPlayerIndex = 0;
      if (this.currentRoundIndex + 1 >= this.totalRounds) {
        this.completed = true;
      } else {
        this.currentRoundIndex += 1;
      }
    }
    result.roundCompleted = this.currentPlayerIndex === 0;
    result.partyLeaderChanges = this.leaderChanges;
    return result;
  }

  standings() {
    const rows = this.selectedPlayers.map((player, order) => {
      const playerResults = this.results.filter((result) => result.playerId === player.id);
      const latest = playerResults[playerResults.length - 1] || null;
      const best = playerResults
        .slice()
        .sort((a, b) => b.score - a.score || a.time - b.time || String(a.date || "").localeCompare(String(b.date || "")))[0] || null;
      const totalScore = playerResults.reduce((sum, result) => sum + normalizeNonNegativeInteger(result.score), 0);
      const bestScore = best?.score || 0;
      const latestScore = latest?.score || 0;
      const rankScore = this.roundType === PARTY_ROUND_TYPE_TOTAL_SCORE ? totalScore : bestScore;
      return {
        resultId: latest?.resultId || "",
        playerId: player.id,
        playerName: player.name,
        carName: sanitizeCarName(player.car?.name, DEFAULT_CAR.name),
        score: rankScore,
        rankScore,
        latestScore,
        bestScore,
        totalScore,
        completedRuns: playerResults.length,
        totalRounds: this.totalRounds,
        latestRoundNumber: latest?.roundNumber || 0,
        latestStatus: latest?.status || "",
        latestReason: latest?.reason || "",
        latestTime: latest?.time || 0,
        raceMode: latest?.raceMode || this.raceMode,
        raceType: latest?.raceType || this.raceType,
        seed: latest?.seed || this.currentSeed,
        medals: (latest?.medals?.length ? latest.medals : best?.medals) || [],
        leaderboardRank: latest?.leaderboardRank || null,
        order
      };
    });
    const sorted = rows.sort((a, b) => (
      b.rankScore - a.rankScore
      || b.bestScore - a.bestScore
      || b.totalScore - a.totalScore
      || b.latestScore - a.latestScore
      || b.completedRuns - a.completedRuns
      || a.order - b.order
    ));
    const leaderScore = sorted[0]?.rankScore || 0;
    return sorted.map((result, index) => ({
      ...result,
      rank: index + 1,
      leaderMargin: index === 0 ? 0 : Math.max(0, leaderScore - result.rankScore)
    }));
  }

  marginOfVictory() {
    const standings = this.standings();
    if (standings.length < 2) return null;
    return Math.max(0, standings[0].score - standings[1].score);
  }

  createRematch(sharedSeed, options = {}) {
    const reuseRoundSeeds = Boolean(options.reuseRoundSeeds);
    return new PartySession({
      players: this.selectedPlayers,
      sharedSeed,
      roundSeeds: reuseRoundSeeds ? this.roundSeeds : [],
      track: this.track,
      raceMode: this.raceMode,
      raceType: this.raceType,
      roundType: this.roundType,
      seedMode: this.seedMode
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
    this.raceTrackId = DEFAULT_TRACK_ID;
    this.optionalMusicAvailability = {};
    this.optionalMusicProbes = {};
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

  configureMusicEntry(key, path) {
    const entry = this.tracks[key];
    if (!entry || entry.path === path) return entry;
    if (entry.audio) {
      try {
        entry.audio.pause();
      } catch (error) {
        // Ignore stale audio cleanup failures.
      }
    }
    entry.path = path;
    entry.audio = null;
    entry.loaded = "untested";
    if (this.musicKey === key) this.musicKey = null;
    return entry;
  }

  probeOptionalMusic(path) {
    const musicPath = String(path || "");
    if (!musicPath || typeof fetch !== "function") return Promise.resolve(false);
    if (Object.prototype.hasOwnProperty.call(this.optionalMusicAvailability, musicPath)) {
      return Promise.resolve(Boolean(this.optionalMusicAvailability[musicPath]));
    }
    if (this.optionalMusicProbes[musicPath]) return this.optionalMusicProbes[musicPath];
    this.optionalMusicProbes[musicPath] = fetch(musicPath, { method: "HEAD", cache: "no-store" })
      .then((response) => response.ok)
      .catch(() => false)
      .then((available) => {
        this.optionalMusicAvailability[musicPath] = Boolean(available);
        delete this.optionalMusicProbes[musicPath];
        return Boolean(available);
      });
    return this.optionalMusicProbes[musicPath];
  }

  setRaceMusicTrack(track = TRACKS[0]) {
    const safeTrack = track || TRACKS[0];
    const requestedPath = getTrackMusicPath(safeTrack);
    const fallbackPath = getTrackMusicFallbackPath(safeTrack) || getTrackMusicPath(TRACKS[0]);
    const optional = Boolean(safeTrack.musicOptional && requestedPath && requestedPath !== fallbackPath);
    const requestedAvailable = optional
      ? this.optionalMusicAvailability[requestedPath] === true
      : Boolean(requestedPath);
    const path = requestedAvailable ? requestedPath : fallbackPath;
    this.raceTrackId = safeTrack.id || DEFAULT_TRACK_ID;
    this.configureMusicEntry("race", path || getTrackMusicPath(TRACKS[0]));
    if (optional && !Object.prototype.hasOwnProperty.call(this.optionalMusicAvailability, requestedPath)) {
      this.probeOptionalMusic(requestedPath).then((available) => {
        if (available && this.raceTrackId === safeTrack.id && this.tracks.race?.path !== requestedPath) {
          this.configureMusicEntry("race", requestedPath);
        }
      });
    }
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
      image: null,
      paintCache: new Map()
    }]));
  }

  getEntry(styleId) {
    return this.entries.get(styleId) || this.entries.get(DEFAULT_CAR.bodyStyle);
  }

  getSprite(styleId, carConfig = null) {
    const entry = this.getEntry(styleId);
    if (!entry) return null;
    if (entry.status === "idle") {
      this.load(entry);
    }
    if (entry.status !== "loaded") return null;
    return carConfig ? this.getStyledSprite(entry, carConfig) : entry.image;
  }

  getStyledSprite(entry, carConfig) {
    const carStyle = normalizeCarStyle(carConfig?.carStyle);
    const cacheKey = this.getPaintCacheKey(entry.id, carStyle);
    if (!getCarStyleBodyHex({ carStyle }) && !getCarStyleAccentHex({ carStyle })) {
      entry.lastPaintDebug = {
        status: "original",
        cacheSize: this.getPaintCacheSize(),
        protectedRatio: null,
        paintRatio: null,
        bodyRatio: null,
        accentRatio: null
      };
      return entry.image;
    }
    if (entry.paintCache.has(cacheKey)) {
      const cached = entry.paintCache.get(cacheKey);
      entry.lastPaintDebug = {
        ...cached.debug,
        cacheSize: this.getPaintCacheSize()
      };
      return cached.sprite || entry.image;
    }
    const result = recolorPlayerCarSprite(entry.image, carStyle, entry.id);
    entry.paintCache.set(cacheKey, result);
    entry.lastPaintDebug = {
      ...result.debug,
      cacheSize: this.getPaintCacheSize()
    };
    return result.sprite || entry.image;
  }

  getPaintCacheKey(styleId, carStyle) {
    const style = normalizeCarStyle(carStyle);
    return [
      PLAYER_CAR_PAINT_STYLE_VERSION,
      styleId || DEFAULT_CAR.bodyStyle,
      style.bodyColor,
      style.accentColor
    ].join("|");
  }

  getStatus(styleId) {
    const entry = this.getEntry(styleId);
    return entry ? entry.status : "missing";
  }

  getPath(styleId) {
    const entry = this.getEntry(styleId);
    return entry ? entry.path : "";
  }

  getPaintCacheSize() {
    let total = 0;
    this.entries.forEach((entry) => {
      total += entry.paintCache?.size || 0;
    });
    return total;
  }

  getPaintDebugInfo(styleId, carStyle = DEFAULT_CAR_STYLE) {
    const entry = this.getEntry(styleId);
    if (!entry) {
      return {
        status: "missing",
        cacheSize: this.getPaintCacheSize(),
        protectedRatio: null,
        paintRatio: null,
        bodyRatio: null,
        accentRatio: null
      };
    }
    const normalized = normalizeCarStyle(carStyle);
    const cacheKey = this.getPaintCacheKey(entry.id, normalized);
    const cached = entry.paintCache?.get(cacheKey);
    if (cached?.debug) {
      return {
        ...cached.debug,
        cacheSize: this.getPaintCacheSize()
      };
    }
    return {
      status: !getCarStyleBodyHex({ carStyle: normalized }) && !getCarStyleAccentHex({ carStyle: normalized })
        ? "original"
        : entry.status,
      cacheSize: this.getPaintCacheSize(),
      protectedRatio: null,
      paintRatio: null,
      bodyRatio: null,
      accentRatio: null
    };
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
      entry.paintCache.clear();
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
    this.deadScreenSeconds = 0;
    this.lastActivitySnapshot = null;
    this.currentDirectorIntent = null;
    this.laneStillSeconds = 0;
    this.lastObservedLane = TRACK_DIRECTOR.centerLane;
    this.laneSafeSeconds = Array(LANES).fill(0);
    this.forceRecoveryNext = false;
    this.lastFairnessPassed = true;
    this.nextWaveId = 1;
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
      waveFamilyCounts: {},
      directorIntentCounts: {},
      rewardLaneCounts: {
        center: 0,
        side: 0,
        left: 0,
        right: 0
      },
      sideLaneRewardCount: 0,
      centerRewardCount: 0,
      visibleMeaningfulMin: Infinity,
      visibleMeaningfulSampleSum: 0,
      visibleMeaningfulSampleCount: 0,
      upcomingDecisionGapMax: 0,
      deadScreenTime: 0,
      longestDeadScreenSeconds: 0,
      timeSinceLastMeaningfulDecisionMax: 0,
      underActivityCorrections: 0,
      overActivityDelays: 0,
      boostLaneCounts: Array(LANES).fill(0),
      rampLaneCounts: Array(LANES).fill(0),
      gasCanLaneCounts: Array(LANES).fill(0),
      obstacleTypeCounts: {},
      gasCanGapSeconds: [],
      longestGasCanGapSeconds: 0,
      fuelPatternCounts: {},
      rampSolutionCount: 0,
      rampTargetsAssigned: 0,
      rampLandingRejected: 0,
      rampFailedToClearTarget: 0,
      minorHazardCount: 0,
      supportWaveCount: 0,
      wavesFirst10Seconds: 0,
      meaningfulWavesFirst10Seconds: 0,
      supportWavesFirst10Seconds: 0,
      launchWaveCount: 0,
      launchMeaningfulWaveCount: 0,
      launchSupportWaveCount: 0,
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
      rampSolutionCount: 0,
      minorHazardCount: 0,
      supportWaveCount: 0,
      pressureCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      waveCounts: {},
      waveFamilyCounts: {},
      directorIntentCounts: {}
    };
  }

  getSectionStats(stats, section) {
    const id = section?.id || FALLBACK_TRACK_SECTION.id;
    if (!stats.sectionStats[id]) {
      stats.sectionStats[id] = this.createSectionStats(section);
    }
    return stats.sectionStats[id];
  }

  getLaunchPacingConfig(speedClassId = this.manager.getSpeedClassId(), section = null) {
    if ((section?.id || "") !== "launch") return null;
    return {
      ...LAUNCH_PACING_CONFIG.default,
      ...(LAUNCH_PACING_CONFIG[speedClassId] || {})
    };
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
    const activitySnapshot = this.manager.getRoadActivitySnapshot
      ? this.manager.getRoadActivitySnapshot(run, this.manager.obstacles, run.distance || 0)
      : null;
    this.lastActivitySnapshot = activitySnapshot;
    if (this.hasActivePressureAhead()) {
      this.activeEmptySeconds = 0;
    } else {
      this.activeEmptySeconds += dt;
    }
    if (activitySnapshot?.deadScreen) {
      this.deadScreenSeconds += dt;
      this.stats.deadScreenTime += dt;
      this.stats.longestDeadScreenSeconds = Math.max(this.stats.longestDeadScreenSeconds, this.deadScreenSeconds);
      if (run && !run.ended) {
        run.deadScreenTime = (run.deadScreenTime || 0) + dt;
        run.longestDeadScreenSeconds = Math.max(run.longestDeadScreenSeconds || 0, this.deadScreenSeconds);
      }
    } else {
      this.deadScreenSeconds = 0;
    }
    if (activitySnapshot && run && !run.ended) {
      const visibleMeaningful = Math.max(0, activitySnapshot.visibleMeaningfulObjects || 0);
      this.stats.visibleMeaningfulMin = Math.min(this.stats.visibleMeaningfulMin, visibleMeaningful);
      this.stats.visibleMeaningfulSampleSum += visibleMeaningful;
      this.stats.visibleMeaningfulSampleCount += 1;
      if (!Number.isFinite(run.visibleMeaningfulMin)) run.visibleMeaningfulMin = visibleMeaningful;
      else run.visibleMeaningfulMin = Math.min(run.visibleMeaningfulMin, visibleMeaningful);
      run.visibleMeaningfulSampleSum = (run.visibleMeaningfulSampleSum || 0) + visibleMeaningful;
      run.visibleMeaningfulSampleCount = (run.visibleMeaningfulSampleCount || 0) + 1;
      if (Number.isFinite(activitySnapshot.nextMeaningfulDecisionSeconds)) {
        this.stats.upcomingDecisionGapMax = Math.max(this.stats.upcomingDecisionGapMax, activitySnapshot.nextMeaningfulDecisionSeconds);
        run.upcomingDecisionGapMax = Math.max(run.upcomingDecisionGapMax || 0, activitySnapshot.nextMeaningfulDecisionSeconds);
      }
      this.stats.timeSinceLastMeaningfulDecisionMax = Math.max(this.stats.timeSinceLastMeaningfulDecisionMax, this.timeSinceMeaningfulWaveSeconds);
      run.timeSinceLastMeaningfulDecisionMax = Math.max(run.timeSinceLastMeaningfulDecisionMax || 0, this.timeSinceMeaningfulWaveSeconds);
    }
    this.stats.longestCenterSafeSeconds = Math.max(this.stats.longestCenterSafeSeconds, this.centerSafeSeconds);
    this.stats.longestWaveGapSeconds = Math.max(this.stats.longestWaveGapSeconds, this.timeSinceWaveSeconds);
    this.stats.longestMeaningfulWaveGapSeconds = Math.max(this.stats.longestMeaningfulWaveGapSeconds, this.timeSinceMeaningfulWaveSeconds);
    this.stats.longestActiveEmptySeconds = Math.max(this.stats.longestActiveEmptySeconds, this.activeEmptySeconds);
    this.stats.longestDeadScreenSeconds = Math.max(this.stats.longestDeadScreenSeconds, this.deadScreenSeconds);
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
    const cadence = getTrackDirectorCadence(speedClassId, track);
    const modeIntensity = TRACK_DIRECTOR.modeIntensity[speedClassId] || 1;
    const cruiseSpeed = getTrackCruiseSpeed(track, progress, speedClassId);
    const launchPacing = this.getLaunchPacingConfig(speedClassId, section);
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
    const budget = lerp(band.budget[0], band.budget[1], bandT)
      * modeIntensity
      * sectionPressureMultiplier
      * (launchPacing?.pressureBudgetMultiplier ?? 1);
    const centerSafeLimit = cadence.centerSafe ?? TRACK_DIRECTOR.centerSafeSecondsLimit;
    const centerChallengeMinSeconds = TRACK_DIRECTOR.centerChallengeMinSeconds[speedClassId] ?? Math.max(2.5, centerSafeLimit * 0.65);
    const centerSoftPressure = (TRACK_DIRECTOR.centerSoftPressure[speedClassId] ?? 0.32) * getSectionNumber(section, "centerSoftPressureMultiplier", sectionPressureMultiplier, 0.35, 2);
    const centerRestChance = clamp((TRACK_DIRECTOR.centerRestChance[speedClassId] ?? 0.5) / getSectionNumber(section, "pressureMultiplier", 1, 0.55, 1.6), 0.02, 0.9);
    const pressureBudgetAllowance = Number.isFinite(launchPacing?.pressureBudgetAllowance)
      ? launchPacing.pressureBudgetAllowance
      : (TRACK_DIRECTOR.pressureBudgetAllowance[speedClassId] ?? 1.1);
    const laneStillLimit = cadence.laneStill ?? 3;
    const centerHoldLimit = cadence.centerHold ?? TRACK_DIRECTOR.centerHoldSeconds;
    const centerHoldPressure = centerHoldSeconds >= centerHoldLimit
      && centerSafeSeconds >= centerChallengeMinSeconds;
    const centerChallengeStartProgress = launchPacing?.centerChallengeStartProgress ?? 0.12;
    const softCenterStartProgress = launchPacing?.softCenterStartProgress ?? 0.18;
    const centerNeedsChallenge = progress > centerChallengeStartProgress
      && (centerHoldPressure || centerSafeSeconds >= centerSafeLimit);
    const needsMovementChallenge = progress > 0.16 && laneStillSeconds >= laneStillLimit;
    const allowSoftCenterPressure = progress > softCenterStartProgress
      && !centerNeedsChallenge
      && centerSafeSeconds >= centerChallengeMinSeconds * 0.92;
    const forceMeaningful = meaningfulGapSeconds >= (cadence.forceMeaningful ?? 3)
      * getSectionNumber(section, "forceMeaningfulMultiplier", 1, 0.45, 1.8)
      * (launchPacing?.forceMeaningfulMultiplier ?? 1);
    const activity = this.manager.getRoadActivitySnapshot
      ? this.manager.getRoadActivitySnapshot(run, this.manager.obstacles, this.manager.game.run?.distance || 0)
      : null;
    const activityBudget = this.manager.getActivityFloorBudget
      ? this.manager.getActivityFloorBudget(run, section)
      : {};

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
      launchPacing,
      centerSoftPressure,
      centerRestChance,
      needsMovementChallenge,
      forceMeaningful,
      cruiseSpeed,
      activity,
      activityBudget,
      forcedDirectorIntent: run.forceRoadDirectorIntent || "",
      forcedDirectorIntentReason: run.forceRoadDirectorIntentReason || ""
    };
  }

  spawnWave(distance) {
    const context = this.getContext(distance);
    context.directorIntent = this.chooseDirectorIntent(context);
    this.currentDirectorIntent = context.directorIntent;
    const waveType = this.chooseWaveType(context) || "singleBlocker";
    const result = this.createWaveResult(waveType, context);
    this.applyWave(waveType, distance, context, result);

    if (!result.spawned.length && waveType !== "recoveryGap") {
      this.applyWave("singleBlocker", distance + 40, context, result);
      result.fallbackUsed = true;
    }

    this.recordWave(result, context);
    if (context.run) {
      context.run.forceRoadDirectorIntent = "";
      context.run.forceRoadDirectorIntentReason = "";
    }
    return result;
  }

  getSectionWaveWeight(type, context) {
    const multipliers = context.section?.waveWeightMultipliers || {};
    return getSectionNumber({ value: multipliers[type] }, "value", 1, 0, 4);
  }

  getTrackWaveWeight(type, context, key = "waveWeightMultipliers") {
    const multipliers = context.track?.roadDirectorProfile?.[key] || {};
    return getSectionNumber({ value: multipliers[type] }, "value", 1, 0, 4);
  }

  hasTrackSpecificWave(type, context) {
    const extraByBand = context.track?.roadDirectorProfile?.extraWaveWeightsByBand || {};
    return Object.values(extraByBand).some((weights) => Number(weights?.[type]) > 0);
  }

  getWaveEntriesForContext(context) {
    const weights = { ...(context.band?.weights || {}) };
    const extraByBand = context.track?.roadDirectorProfile?.extraWaveWeightsByBand || {};
    [extraByBand.all, extraByBand[context.band?.id], context.section?.extraWaveWeights].forEach((extra) => {
      if (!extra || typeof extra !== "object") return;
      Object.entries(extra).forEach(([type, value]) => {
        const extraWeight = Number(value);
        if (!Number.isFinite(extraWeight) || extraWeight <= 0) return;
        weights[type] = (Number(weights[type]) || 0) + extraWeight;
      });
    });
    return Object.entries(weights);
  }

  getTrackObjectWeight(type, context) {
    const weight = Number(context.track?.allowedObjectMix?.[type]);
    return Number.isFinite(weight) ? clamp(weight, 0, 4) : 1;
  }

  getTrackMinorFallback(type, context, fallback = "slowCar") {
    return this.getTrackObjectWeight(type, context) > 0.2 ? type : fallback;
  }

  getWaveMetadata(type) {
    const metadata = ROAD_DIRECTOR_WAVE_METADATA[type];
    if (metadata) return metadata;
    return {
      id: type,
      displayName: this.getWaveLabel(type),
      family: "unknown",
      intent: "not tracked yet",
      requiredAction: "not tracked yet",
      routeType: "not tracked yet",
      rewardType: "",
      pressureRating: 0,
      trackAffinity: [],
      sectionAffinity: []
    };
  }

  getIntentLabel(intentId) {
    return ROAD_DIRECTOR_INTENT_LABELS[intentId] || intentId || "Unknown";
  }

  makeDirectorIntent(id, reason = "") {
    return {
      id,
      label: this.getIntentLabel(id),
      reason
    };
  }

  chooseDirectorIntent(context) {
    const forced = context.forcedDirectorIntent;
    if (forced && ROAD_DIRECTOR_INTENT_LABELS[forced]) {
      return this.makeDirectorIntent(forced, context.forcedDirectorIntentReason || "activity floor correction");
    }
    const activity = context.activity || {};
    const budget = context.activityBudget || {};
    const visibleHard = activity.visibleHardBlockers || 0;
    const maxHard = budget.maxVisibleHardBlockers ?? context.pressureBudget + context.pressureBudgetAllowance;
    const overDensity = Boolean(activity.overDensity) || visibleHard >= maxHard;
    const underActivity = Boolean(activity.underActivity);
    const sectionId = context.section?.id || "";
    const trackId = context.track?.id || DEFAULT_TRACK_ID;

    if (overDensity) {
      return this.makeDirectorIntent("recovery", "active field near ceiling");
    }
    if (context.fuelRun) {
      const fuel = context.fuel || {};
      const gasDue = fuel.low || fuel.critical || (fuel.timeSinceLastGasCan || 0) >= (fuel.targetGasGapSeconds || 16);
      if (underActivity && gasDue) return this.makeDirectorIntent("gasRoute", "fuel route can carry activity");
      if (gasDue && this.random() < 0.76) return this.makeDirectorIntent("gasRoute", "fuel route due");
    }
    if (underActivity) {
      if (sectionId === "breather") {
        return weightedChoice([
          { value: this.makeDirectorIntent("rewardTemptation", "breather activity floor"), weight: 1.5 },
          { value: this.makeDirectorIntent("rampSolution", "breather activity floor"), weight: 1.1 },
          { value: this.makeDirectorIntent("maintainPressure", "breather activity floor"), weight: 0.9 }
        ], () => this.random()) || this.makeDirectorIntent("maintainPressure", "activity floor");
      }
      if (trackId === "redline-run") {
        return weightedChoice([
          { value: this.makeDirectorIntent("forceLaneChange", "redline activity floor"), weight: 1.25 },
          { value: this.makeDirectorIntent("nearMissOpportunity", "redline activity floor"), weight: 1.15 },
          { value: this.makeDirectorIntent("rewardTemptation", "redline activity floor"), weight: 0.95 },
          { value: this.makeDirectorIntent("maintainPressure", "redline activity floor"), weight: 0.9 }
        ], () => this.random()) || this.makeDirectorIntent("maintainPressure", "activity floor");
      }
      return weightedChoice([
        { value: this.makeDirectorIntent("maintainPressure", "activity floor"), weight: 1.4 },
        { value: this.makeDirectorIntent("rewardTemptation", "activity floor"), weight: 1.05 },
        { value: this.makeDirectorIntent("forceLaneChange", "activity floor"), weight: 0.9 },
        { value: this.makeDirectorIntent("rampSolution", "activity floor"), weight: sectionId === "launch" ? 0.25 : 0.65 }
      ], () => this.random()) || this.makeDirectorIntent("maintainPressure", "activity floor");
    }
    if (context.centerNeedsChallenge) {
      return this.makeDirectorIntent("challengeCenterLane", "center lane held too long");
    }
    if (context.needsMovementChallenge) {
      return this.makeDirectorIntent("forceLaneChange", "player has stayed in one lane");
    }
    if (sectionId === "finalPush") {
      return this.makeDirectorIntent("finalPushPressure", "final section");
    }
    if (sectionId === "pressure") {
      return this.makeDirectorIntent("escalateSection", "pressure section");
    }
    if (sectionId === "breather") {
      return weightedChoice([
        { value: this.makeDirectorIntent("rewardTemptation", "breather reward"), weight: 1.15 },
        { value: this.makeDirectorIntent("rampSolution", "breather solution"), weight: 0.9 },
        { value: this.makeDirectorIntent("recovery", "breather recovery"), weight: 0.65 },
        { value: this.makeDirectorIntent("maintainPressure", "breather floor"), weight: 0.75 }
      ], () => this.random()) || this.makeDirectorIntent("rewardTemptation", "breather");
    }
    if (trackId === "redline-run" && this.random() < 0.44) {
      return weightedChoice([
        { value: this.makeDirectorIntent("forceLaneChange", "redline speedway"), weight: 1.1 },
        { value: this.makeDirectorIntent("nearMissOpportunity", "redline speedway"), weight: 1 },
        { value: this.makeDirectorIntent("rewardTemptation", "redline speedway"), weight: 0.85 }
      ], () => this.random()) || this.makeDirectorIntent("forceLaneChange", "redline speedway");
    }
    return weightedChoice([
      { value: this.makeDirectorIntent("maintainPressure", "default road rhythm"), weight: 1.25 },
      { value: this.makeDirectorIntent("forceLaneChange", "default road rhythm"), weight: 0.9 },
      { value: this.makeDirectorIntent("rewardTemptation", "default road rhythm"), weight: 0.72 },
      { value: this.makeDirectorIntent("nearMissOpportunity", "default road rhythm"), weight: context.progress > 0.35 ? 0.44 : 0.12 }
    ], () => this.random()) || this.makeDirectorIntent("maintainPressure", "default");
  }

  getDirectorIntentWeight(type, context) {
    const intentId = context.directorIntent?.id || "";
    const intentWeights = ROAD_DIRECTOR_INTENT_WAVE_WEIGHTS[intentId] || {};
    let weight = Number.isFinite(intentWeights[type]) ? intentWeights[type] : 1;
    const metadata = this.getWaveMetadata(type);
    if (context.activity?.underActivity && metadata.family === "recovery") weight *= 0.08;
    if (context.activity?.overDensity && metadata.pressureRating >= 3) weight *= 0.18;
    if (context.fuelRun && intentId === "gasRoute" && metadata.rewardType !== "gas") weight *= 0.45;
    if (context.track?.id === "redline-run" && Array.isArray(metadata.trackAffinity) && metadata.trackAffinity.includes("redline-run")) {
      weight *= 1.12;
    }
    if (context.section?.id && Array.isArray(metadata.sectionAffinity) && metadata.sectionAffinity.includes(context.section.id)) {
      weight *= 1.08;
    }
    return weight;
  }

  getVarietyWeight(type, context) {
    const metadata = this.getWaveMetadata(type);
    let weight = 1;
    const recent = this.recentWaves.slice(-5);
    const familyRepeats = recent.filter((wave) => wave.family === metadata.family).length;
    const intentRepeats = recent.filter((wave) => wave.directorIntentId === context.directorIntent?.id).length;
    const typeRepeats = recent.filter((wave) => wave.type === type).length;
    if (familyRepeats >= 3) weight *= 0.22;
    else if (familyRepeats >= 2) weight *= 0.48;
    if (intentRepeats >= 3) weight *= 0.55;
    if (typeRepeats >= 2) weight *= 0.18;
    else if (typeRepeats >= 1) weight *= 0.62;
    if (type === "centerBlock" && recent.slice(-3).some((wave) => wave.type === "centerBlock")) weight *= 0.28;
    if (metadata.family === "recovery" && recent.slice(-2).some((wave) => wave.family === "recovery")) weight *= 0.18;
    if (metadata.family === "reward") {
      const rewardRepeats = recent.filter((wave) => wave.rewardType).length;
      if (rewardRepeats >= 3) weight *= 0.46;
    }
    return weight;
  }

  chooseWaveType(context) {
    if (context.fuelRun) {
      return this.chooseFuelRunWaveType(context);
    }
    if (this.forceRecoveryNext) {
      this.forceRecoveryNext = false;
      return "recoveryGap";
    }
    if (context.activity?.underActivity && !context.activity?.overDensity) {
      return this.chooseActivityFloorWave(context);
    }
    if (context.forceMeaningful) {
      return this.chooseForcedMeaningfulWave(context);
    }

    const entries = this.getWaveEntriesForContext(context).map(([type, baseWeight]) => {
      let weight = baseWeight;
      if (!this.isWaveAllowed(type, context)) return { value: type, weight: 0 };
      weight *= this.getSectionWaveWeight(type, context);
      weight *= this.getTrackWaveWeight(type, context);
      weight *= this.getDirectorIntentWeight(type, context);
      weight *= this.getVarietyWeight(type, context);
      if (!context.centerNeedsChallenge && type === "centerBlock") {
        weight *= context.centerSoftPressure;
      }

      if (context.centerNeedsChallenge) {
        if (["centerBlock", "constructionSqueeze", "nearMissCorridor"].includes(type)) weight *= 3.1;
        if (["doubleGate", "offsetPair", "leftRightSweep", "boostTemptation", "rampEscape"].includes(type)) weight *= 1.7;
        if (["redlineSlalom", "needleThread", "expressConvoy", "speedGateChain"].includes(type)) weight *= 1.55;
        if (type === "singleBlocker") weight *= 1.2;
      }
      if (context.needsMovementChallenge) {
        if (["offsetPair", "leftRightSweep", "constructionSqueeze", "nearMissCorridor", "rampEscape"].includes(type)) weight *= 1.85;
        if (["centerBlock", "doubleGate", "boostTemptation"].includes(type)) weight *= 1.35;
        if (["redlineSlalom", "neonChicane", "needleThread", "rampOverpass"].includes(type)) weight *= 1.85;
        if (["speedGateChain", "expressConvoy"].includes(type)) weight *= 1.35;
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
        if (["redlineSlalom", "expressConvoy", "speedGateChain"].includes(type)) weight *= 0.54;
        if (["needleThread", "neonChicane", "rampOverpass"].includes(type)) weight *= 0.18;
        if (type === "centerBlock") weight *= 0.62;
        if (type === "rampEscape") weight *= 0.75;
        if (type === "recoveryGap") weight *= 1.25;
      } else if (context.speedClassId === "rookie") {
        if (["nearMissCorridor", "deerCrossing"].includes(type)) weight *= 0.72;
        if (["needleThread", "neonChicane", "rampOverpass"].includes(type)) weight *= 0.58;
        if (["redlineSlalom", "expressConvoy", "speedGateChain"].includes(type)) weight *= 0.86;
        if (type === "fourLaneSpike") weight = 0;
      } else if (context.speedClassId === "arcade") {
        if (["offsetPair", "leftRightSweep", "constructionSqueeze", "nearMissCorridor"].includes(type)) weight *= 1.08;
        if (["redlineSlalom", "speedGateChain", "expressConvoy"].includes(type)) weight *= 1.16;
        if (["neonChicane", "rampOverpass", "needleThread"].includes(type)) weight *= 1.04;
        if (type === "centerBlock") weight *= 1.16;
        if (type === "singleBlocker") weight *= 0.86;
      } else if (context.speedClassId === "pro") {
        if (["offsetPair", "leftRightSweep", "constructionSqueeze", "nearMissCorridor", "rampEscape"].includes(type)) weight *= 1.36;
        if (["centerBlock", "boostTemptation"].includes(type)) weight *= 1.3;
        if (["redlineSlalom", "expressConvoy", "needleThread"].includes(type)) weight *= 1.34;
        if (["speedGateChain", "neonChicane", "rampOverpass"].includes(type)) weight *= 1.18;
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
        if (type === "redlineSlalom") weight *= 2.25;
        if (type === "needleThread") weight *= 2.3;
        if (type === "expressConvoy") weight *= 1.8;
        if (type === "speedGateChain") weight *= 1.45;
        if (type === "neonChicane") weight *= 1.35;
        if (type === "rampOverpass") weight *= 1.2;
        if (type === "singleBlocker") weight *= 0.08;
        if (type === "doubleGate") weight *= 0.2;
        if (type === "recoveryGap") weight *= 0.1;
      }

      if (context.section?.id === "launch" && context.speedClassId === "turbo") {
        const launchMultipliers = {
          singleBlocker: 12,
          doubleGate: 3.4,
          offsetPair: 0.52,
          centerBlock: 0.32,
          leftRightSweep: 0.22,
          constructionSqueeze: 0,
          deerCrossing: 0,
          rampEscape: context.launchPacing?.rampWeightMultiplier ?? 0.48,
          boostTemptation: context.launchPacing?.boostWeightMultiplier ?? 0.2,
          nearMissCorridor: 0,
          fourLaneSpike: 0,
          recoveryGap: 5.8,
          redlineSlalom: 0.4,
          speedGateChain: 0.65,
          expressConvoy: 0.26,
          neonChicane: 0,
          rampOverpass: 0.1,
          needleThread: 0
        };
        weight *= launchMultipliers[type] ?? 1;
      } else if (context.section?.id === "launch") {
        if (type === "boostTemptation") weight *= context.launchPacing?.boostWeightMultiplier ?? 0.7;
        if (type === "rampEscape") weight *= context.launchPacing?.rampWeightMultiplier ?? 0.75;
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

  chooseActivityFloorWave(context) {
    const trackId = context.track?.id || DEFAULT_TRACK_ID;
    const opening = context.band?.id === "opening" || context.section?.id === "launch";
    const breather = context.section?.id === "breather";
    const weights = [
      { value: "doubleGate", weight: opening ? 1.55 : 1.15 },
      { value: "offsetPair", weight: opening ? 0.88 : 1.35 },
      { value: "centerBlock", weight: context.centerNeedsChallenge ? 1.45 : (opening ? 0.28 : 0.85) },
      { value: "leftRightSweep", weight: opening ? 0 : 0.95 },
      { value: "boostTemptation", weight: opening ? 0.42 : (breather ? 1.45 : 0.9) },
      { value: "rampEscape", weight: opening ? 0.32 : (breather ? 1.15 : 0.72) },
      { value: "nearMissCorridor", weight: opening || context.speedClassId === "sunday" || context.speedClassId === "rookie" ? 0 : 0.58 },
      { value: "redlineSlalom", weight: trackId === "redline-run" ? (opening ? 0.92 : 1.45) : 0 },
      { value: "speedGateChain", weight: trackId === "redline-run" ? (opening ? 1.5 : (breather ? 1.65 : 1.18)) : 0 },
      { value: "expressConvoy", weight: trackId === "redline-run" && !opening && !breather ? 0.92 : 0 },
      { value: "rampOverpass", weight: trackId === "redline-run" && !opening ? (breather ? 1.1 : 0.58) : 0 },
      { value: "needleThread", weight: trackId === "redline-run" && !opening && !breather && context.speedClassId !== "arcade" ? 0.72 : 0 }
    ];
    if (context.speedClassId === "sunday") {
      weights.find((item) => item.value === "doubleGate").weight *= 1.05;
      weights.find((item) => item.value === "offsetPair").weight *= 0.6;
      weights.find((item) => item.value === "centerBlock").weight *= 0.35;
      weights.find((item) => item.value === "leftRightSweep").weight *= 0.25;
      weights.find((item) => item.value === "rampEscape").weight *= 0.55;
    } else if (context.speedClassId === "rookie") {
      weights.find((item) => item.value === "doubleGate").weight *= 1.15;
      weights.find((item) => item.value === "leftRightSweep").weight *= 0.58;
      weights.find((item) => item.value === "nearMissCorridor").weight = 0;
    } else if (context.speedClassId === "turbo") {
      weights.find((item) => item.value === "redlineSlalom").weight *= 1.35;
      weights.find((item) => item.value === "speedGateChain").weight *= 1.25;
      weights.find((item) => item.value === "nearMissCorridor").weight *= 1.35;
      weights.find((item) => item.value === "leftRightSweep").weight *= 1.2;
    }
    weights.forEach((item) => {
      item.weight *= this.getSectionWaveWeight(item.value, context);
      item.weight *= this.getTrackWaveWeight(item.value, context);
      item.weight *= this.getDirectorIntentWeight(item.value, context);
      item.weight *= this.getVarietyWeight(item.value, context);
      if (!this.isWaveAllowed(item.value, context)) item.weight = 0;
      const expectedPressure = this.getExpectedWavePressure(item.value, context);
      if (expectedPressure > context.pressureBudget + context.pressureBudgetAllowance) {
        item.weight *= 0.45;
      }
    });
    return weightedChoice(weights, () => this.random()) || "doubleGate";
  }

  chooseForcedMeaningfulWave(context) {
    if (context.section?.id === "launch" && context.speedClassId === "turbo") {
      return weightedChoice([
        { value: "singleBlocker", weight: 3.4 },
        { value: "doubleGate", weight: 1.25 },
        { value: "offsetPair", weight: 0.42 },
        { value: "centerBlock", weight: 0.16 },
        { value: "boostTemptation", weight: 0.08 }
      ], () => this.random()) || "singleBlocker";
    }
    const weights = [
      { value: "doubleGate", weight: context.band.id === "opening" ? 1.5 : 1.1 },
      { value: "centerBlock", weight: context.centerNeedsChallenge ? 2.4 : 1.2 },
      { value: "offsetPair", weight: context.band.id === "opening" ? 0.8 : 1.6 },
      { value: "leftRightSweep", weight: context.band.id === "opening" ? 0 : 1.5 },
      { value: "constructionSqueeze", weight: this.isWaveAllowed("constructionSqueeze", context) ? 1.5 : 0 },
      { value: "nearMissCorridor", weight: this.isWaveAllowed("nearMissCorridor", context) ? 1.35 : 0 },
      { value: "rampEscape", weight: this.isWaveAllowed("rampEscape", context) ? 0.95 : 0 },
      { value: "boostTemptation", weight: context.band.id === "opening" ? 0 : 0.9 },
      { value: "redlineSlalom", weight: this.hasTrackSpecificWave("redlineSlalom", context) ? (context.band.id === "opening" ? 0.45 : 1.45) : 0 },
      { value: "speedGateChain", weight: this.hasTrackSpecificWave("speedGateChain", context) ? (context.band.id === "opening" ? 0.72 : 1.1) : 0 },
      { value: "expressConvoy", weight: this.hasTrackSpecificWave("expressConvoy", context) ? (context.band.id === "opening" ? 0.36 : 1.2) : 0 },
      { value: "neonChicane", weight: this.hasTrackSpecificWave("neonChicane", context) && context.band.id !== "opening" ? 0.85 : 0 },
      { value: "rampOverpass", weight: this.hasTrackSpecificWave("rampOverpass", context) && context.band.id !== "opening" ? 0.9 : 0 },
      { value: "needleThread", weight: this.hasTrackSpecificWave("needleThread", context) && context.band.id !== "opening" ? 1.35 : 0 }
    ];
    if (context.speedClassId === "turbo") {
      weights.find((item) => item.value === "centerBlock").weight *= 1.9;
      weights.find((item) => item.value === "nearMissCorridor").weight *= 1.75;
      weights.find((item) => item.value === "leftRightSweep").weight *= 1.55;
      weights.find((item) => item.value === "constructionSqueeze").weight *= 1.45;
      weights.find((item) => item.value === "rampEscape").weight *= 1.35;
      weights.find((item) => item.value === "boostTemptation").weight *= 1.45;
      weights.find((item) => item.value === "doubleGate").weight *= 0.58;
      weights.find((item) => item.value === "redlineSlalom").weight *= 1.75;
      weights.find((item) => item.value === "needleThread").weight *= 1.9;
      weights.find((item) => item.value === "expressConvoy").weight *= 1.45;
      weights.find((item) => item.value === "speedGateChain").weight *= 1.25;
    } else if (context.speedClassId === "pro") {
      weights.find((item) => item.value === "nearMissCorridor").weight *= 1.35;
      weights.find((item) => item.value === "leftRightSweep").weight *= 1.25;
      weights.find((item) => item.value === "doubleGate").weight *= 0.8;
      weights.find((item) => item.value === "redlineSlalom").weight *= 1.25;
      weights.find((item) => item.value === "needleThread").weight *= 1.28;
      weights.find((item) => item.value === "expressConvoy").weight *= 1.18;
    } else if (context.speedClassId === "sunday") {
      weights.find((item) => item.value === "centerBlock").weight *= 0.52;
      weights.find((item) => item.value === "offsetPair").weight *= 0.75;
      weights.find((item) => item.value === "constructionSqueeze").weight = context.progress > 0.55 ? 0.42 : 0;
      weights.find((item) => item.value === "nearMissCorridor").weight = 0;
      weights.find((item) => item.value === "leftRightSweep").weight *= 0.4;
      weights.find((item) => item.value === "neonChicane").weight = 0;
      weights.find((item) => item.value === "needleThread").weight = 0;
      weights.find((item) => item.value === "rampOverpass").weight *= 0.24;
    }
    weights.forEach((item) => {
      item.weight *= this.getSectionWaveWeight(item.value, context);
      item.weight *= this.getTrackWaveWeight(item.value, context, "forcedMeaningfulWaveMultipliers");
      item.weight *= this.getDirectorIntentWeight(item.value, context);
      item.weight *= this.getVarietyWeight(item.value, context);
      if (!this.isWaveAllowed(item.value, context)) item.weight = 0;
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
    if (context.directorIntent?.id === "gasRoute" && canSpawnFuel) {
      return weightedChoice([
        { value: "fuelTrafficGate", weight: low || critical ? 2.25 : 1.65 },
        { value: "fuelSideTemptation", weight: 1.65 },
        { value: "fuelAfterPressure", weight: 1.25 },
        { value: "fuelSplit", weight: context.progress > 0.26 ? 0.85 : 0.18 },
        { value: "fuelLowRescue", weight: critical ? 2.2 : 0.35 }
      ].map((item) => ({
        ...item,
        weight: item.weight
          * this.getTrackWaveWeight(item.value, context, "fuelWaveWeightMultipliers")
          * this.getDirectorIntentWeight(item.value, context)
          * this.getVarietyWeight(item.value, context)
      })), () => this.random()) || "fuelTrafficGate";
    }
    if ((low || overdue) && canSpawnFuel) {
      return weightedChoice([
        { value: "fuelTrafficGate", weight: 2.4 },
        { value: "fuelAfterPressure", weight: 1.8 },
        { value: "fuelSideTemptation", weight: low ? 1.25 : 1.55 },
        { value: "fuelSplit", weight: context.progress > 0.28 ? 0.55 : 0.12 },
        { value: "fuelLowRescue", weight: critical ? 1.6 : 0.28 }
      ].map((item) => ({
        ...item,
        weight: item.weight
          * this.getTrackWaveWeight(item.value, context, "fuelWaveWeightMultipliers")
          * this.getDirectorIntentWeight(item.value, context)
          * this.getVarietyWeight(item.value, context)
      })), () => this.random()) || "fuelTrafficGate";
    }
    if (due && canSpawnFuel && this.random() < 0.72) {
      return weightedChoice([
        { value: "fuelSideTemptation", weight: 1.7 },
        { value: "fuelTrafficGate", weight: 1.55 },
        { value: "fuelAfterPressure", weight: 1.1 },
        { value: "fuelSplit", weight: context.progress > 0.24 ? 0.48 : 0.08 }
      ].map((item) => ({
        ...item,
        weight: item.weight
          * this.getTrackWaveWeight(item.value, context, "fuelWaveWeightMultipliers")
          * this.getDirectorIntentWeight(item.value, context)
          * this.getVarietyWeight(item.value, context)
      })), () => this.random()) || "fuelSideTemptation";
    }

    const supportWeight = context.progress > 0.18 && context.progress < 0.88 ? 1.7 : 0.72;
    return weightedChoice([
      { value: "fuelTrafficPressure", weight: context.forceMeaningful ? 3.2 : 2.55 },
      { value: "fuelTrafficGate", weight: canSpawnFuel ? (context.centerNeedsChallenge || context.needsMovementChallenge ? 1.8 : 1.05) : 0 },
      { value: "fuelSideTemptation", weight: canSpawnFuel ? 0.55 : 0 },
      { value: "fuelSupport", weight: supportWeight },
      { value: "fuelAfterPressure", weight: canSpawnFuel ? 0.36 : 0 }
    ].map((item) => ({
      ...item,
      weight: item.weight
        * this.getTrackWaveWeight(item.value, context, "fuelWaveWeightMultipliers")
        * this.getDirectorIntentWeight(item.value, context)
        * this.getVarietyWeight(item.value, context)
    })), () => this.random()) || "fuelTrafficPressure";
  }

  isWaveAllowed(type, context) {
    if (REDLINE_TEMPLATE_WAVE_TYPES.has(type) && !this.hasTrackSpecificWave(type, context)) return false;
    if (this.getTrackWaveWeight(type, context) <= 0) return false;
    if (type === "deerCrossing" && this.getTrackObjectWeight("deer", context) <= 0) return false;
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
    if (REDLINE_TEMPLATE_WAVE_TYPES.has(type) && context.band.id === "opening" && ["neonChicane", "needleThread"].includes(type)) return false;
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
      fourLaneSpike: 4.75,
      redlineSlalom: context.speedClassId === "turbo" ? 3.05 : 2.45,
      speedGateChain: 1.7,
      expressConvoy: context.speedClassId === "turbo" ? 3.2 : 2.55,
      neonChicane: 2.65,
      rampOverpass: 1.85,
      needleThread: context.speedClassId === "turbo" ? 3.65 : 3.15
    };
    return (estimates[type] ?? 2) + difficultyBonus;
  }

  createWaveResult(type, context) {
    const metadata = this.getWaveMetadata(type);
    return {
      waveId: `wave-${this.nextWaveId++}`,
      type,
      label: metadata.displayName || this.getWaveLabel(type),
      metadata,
      directorIntent: context.directorIntent || this.makeDirectorIntent("maintainPressure", "fallback"),
      band: context.band,
      section: context.section,
      sectionProgress: context.sectionProgress,
      pressureBudget: context.pressureBudget,
      spawned: [],
      blockedLanes: new Set(),
      boostLanes: [],
      rampLanes: [],
      rampSolutions: [],
      gasCanLanes: [],
      routeLanes: [],
      rewardLanes: [],
      obstacleTypes: {},
      pressure: 0,
      centerBlocked: false,
      fairnessPassed: true,
      hard: false,
      fallbackUsed: false
    };
  }

  getWaveLabel(type) {
    return ROAD_DIRECTOR_WAVE_METADATA[type]?.displayName || type;
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
      redlineSlalom: () => this.waveRedlineSlalom(distance, context, result),
      speedGateChain: () => this.waveSpeedGateChain(distance, context, result),
      expressConvoy: () => this.waveExpressConvoy(distance, context, result),
      neonChicane: () => this.waveNeonChicane(distance, context, result),
      rampOverpass: () => this.waveRampOverpass(distance, context, result),
      needleThread: () => this.waveNeedleThread(distance, context, result),
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
      waveType: result.type,
      waveLabel: result.label,
      waveId: result.waveId,
      sectionId: result.section?.id || FALLBACK_TRACK_SECTION.id,
      sectionLabel: result.section?.label || FALLBACK_TRACK_SECTION.label,
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
      result.rewardLanes.push(lane);
    } else if (obstacle.type === "ramp") {
      result.rampLanes.push(lane);
      result.rewardLanes.push(lane);
    } else if (obstacle.type === "gasCan") {
      result.gasCanLanes.push(lane);
      result.rewardLanes.push(lane);
    }

    if (this.manager.isFairnessBlocker(obstacle)) {
      const blockedLane = obstacle.type === "deer" ? TRACK_DIRECTOR.centerLane : lane;
      result.blockedLanes.add(blockedLane);
      if (blockedLane === TRACK_DIRECTOR.centerLane) result.centerBlocked = true;
    }
  }

  removePlacement(obstacle, result) {
    if (!obstacle) return;
    obstacle.remove = true;
    this.manager.obstacles = this.manager.obstacles.filter((item) => item !== obstacle);
    this.manager.seedLockedSpawnObstacles = this.manager.seedLockedSpawnObstacles.filter((item) => item.id !== obstacle.id);
    if (!result) return;
    result.spawned = result.spawned.filter((item) => item !== obstacle);
    const count = result.obstacleTypes[obstacle.type] || 0;
    if (count <= 1) delete result.obstacleTypes[obstacle.type];
    else result.obstacleTypes[obstacle.type] = count - 1;
    result.pressure = Math.max(0, result.pressure - (TRACK_DIRECTOR.pressureValues[obstacle.type] || 0));
    this.rebuildPlacementLaneState(result);
  }

  rebuildPlacementLaneState(result) {
    result.boostLanes = [];
    result.rampLanes = [];
    result.gasCanLanes = [];
    result.rewardLanes = [];
    result.blockedLanes = new Set();
    result.centerBlocked = false;
    for (const obstacle of result.spawned) {
      const lane = Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1));
      if (obstacle.type === "boostPad") {
        result.boostLanes.push(lane);
        result.rewardLanes.push(lane);
      } else if (obstacle.type === "ramp") {
        result.rampLanes.push(lane);
        result.rewardLanes.push(lane);
      } else if (obstacle.type === "gasCan") {
        result.gasCanLanes.push(lane);
        result.rewardLanes.push(lane);
      }
      if (this.manager.isFairnessBlocker(obstacle)) {
        const blockedLane = obstacle.type === "deer" ? TRACK_DIRECTOR.centerLane : lane;
        result.blockedLanes.add(blockedLane);
        if (blockedLane === TRACK_DIRECTOR.centerLane) result.centerBlocked = true;
      }
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
    if (run.gasCansSpawnedBySection && context.section?.id) {
      run.gasCansSpawnedBySection[context.section.id] = (run.gasCansSpawnedBySection[context.section.id] || 0) + 1;
    }
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

  recordIntendedRoute(result, lanes, routeType = "") {
    if (!result) return;
    const routeLanes = (Array.isArray(lanes) ? lanes : [lanes])
      .map((lane) => Math.round(clamp(lane, 0, LANES - 1)))
      .filter((lane, index, list) => Number.isFinite(lane) && list.indexOf(lane) === index);
    if (routeLanes.length) {
      result.routeLanes = routeLanes;
      if (routeType) result.routeType = routeType;
    }
  }

  recordWave(result, context) {
    const blockedCount = clamp(result.blockedLanes.size, 0, 5);
    const metadata = result.metadata || this.getWaveMetadata(result.type);
    const family = metadata.family || "unknown";
    const directorIntent = result.directorIntent || context.directorIntent || this.makeDirectorIntent("maintainPressure", "fallback");
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
    if (context.run) {
      context.run.hardestPressureObserved = Math.max(
        context.run.hardestPressureObserved || 0,
        blockedCount,
        result.maxDangerBlocked || 0
      );
    }

    const stats = this.stats;
    const sectionStats = this.getSectionStats(stats, context.section);
    const waveGapSeconds = this.timeSinceWaveSeconds;
    const meaningfulGapSeconds = this.timeSinceMeaningfulWaveSeconds;
    stats.totalWaves += 1;
    if (context.band.id !== "opening") stats.nonOpeningWaves += 1;
    stats.blockedLaneSum += blockedCount;
    stats.pressureCounts[blockedCount] = (stats.pressureCounts[blockedCount] || 0) + 1;
    stats.waveCounts[result.type] = (stats.waveCounts[result.type] || 0) + 1;
    stats.waveFamilyCounts[family] = (stats.waveFamilyCounts[family] || 0) + 1;
    stats.directorIntentCounts[directorIntent.id] = (stats.directorIntentCounts[directorIntent.id] || 0) + 1;
    stats.pressureBudgetSum += context.pressureBudget;
    stats.pressureSum += result.pressure;
    sectionStats.totalWaves += 1;
    sectionStats.blockedLaneSum += blockedCount;
    sectionStats.pressureCounts[blockedCount] = (sectionStats.pressureCounts[blockedCount] || 0) + 1;
    sectionStats.waveCounts[result.type] = (sectionStats.waveCounts[result.type] || 0) + 1;
    sectionStats.waveFamilyCounts[family] = (sectionStats.waveFamilyCounts[family] || 0) + 1;
    sectionStats.directorIntentCounts[directorIntent.id] = (sectionStats.directorIntentCounts[directorIntent.id] || 0) + 1;
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
    const rewardCount = result.boostLanes.length + result.rampLanes.length + result.gasCanLanes.length;
    const solutionWave = metadata.family === "solution" && (result.rampSolutions.length || result.rampLanes.length);
    const fuelRouteWave = context.fuelRun && metadata.rewardType === "gas" && result.gasCanLanes.length > 0;
    const rewardTemptationWave = metadata.family === "reward" && rewardCount > 0;
    const meaningfulWave = result.type !== "recoveryGap" && (
      blockedCount > 0
      || solutionWave
      || fuelRouteWave
      || rewardTemptationWave
      || this.hasActivePressureAhead(activePressureRunDistance, activePressureObstacles)
    );
    if (meaningfulWave) {
      stats.meaningfulWaveCount += 1;
      stats.meaningfulWaveGapSeconds.push(meaningfulGapSeconds);
      stats.longestMeaningfulWaveGapSeconds = Math.max(stats.longestMeaningfulWaveGapSeconds, meaningfulGapSeconds);
      sectionStats.meaningfulWaveCount += 1;
      sectionStats.meaningfulWaveGapCount += 1;
      sectionStats.meaningfulWaveGapSum += meaningfulGapSeconds;
      this.timeSinceMeaningfulWaveSeconds = 0;
    } else {
      stats.supportWaveCount += 1;
      sectionStats.supportWaveCount = (sectionStats.supportWaveCount || 0) + 1;
    }
    const inFirstWindow = (context.run?.elapsed || 0) <= LAUNCH_PACING_CONFIG.firstWindowSeconds;
    if (inFirstWindow) {
      stats.wavesFirst10Seconds += 1;
      if (meaningfulWave) stats.meaningfulWavesFirst10Seconds += 1;
      else stats.supportWavesFirst10Seconds += 1;
    }
    if (context.section?.id === "launch") {
      stats.launchWaveCount += 1;
      if (meaningfulWave) stats.launchMeaningfulWaveCount += 1;
      else stats.launchSupportWaveCount += 1;
    }
    if (context.seedLocked) {
      if (result.centerBlocked) this.seedLockLastCenterBlockDistance = context.distance;
      if (requiresMovement) this.seedLockLastMovementDistance = context.distance;
      if (meaningfulWave) this.seedLockLastMeaningfulWaveDistance = context.distance;
    }
    const minorHazardsInWave = Array.from(MINOR_HAZARD_TYPES)
      .reduce((sum, type) => sum + (result.obstacleTypes[type] || 0), 0);
    stats.minorHazardCount += minorHazardsInWave;
    sectionStats.minorHazardCount = (sectionStats.minorHazardCount || 0) + minorHazardsInWave;
    if (result.rampSolutions.length) {
      stats.rampSolutionCount += result.rampSolutions.length;
      sectionStats.rampSolutionCount = (sectionStats.rampSolutionCount || 0) + result.rampSolutions.length;
    }
    if (result.type === "rampEscape" && result.rampLanes.length && (blockedCount >= 2 || result.rampSolutions.length)) {
      stats.rampUsefulCount += result.rampSolutions.length || 1;
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
    for (const lane of result.rewardLanes) {
      const side = lane < TRACK_DIRECTOR.centerLane ? "left" : (lane > TRACK_DIRECTOR.centerLane ? "right" : "center");
      stats.rewardLaneCounts[side] = (stats.rewardLaneCounts[side] || 0) + 1;
      if (lane === TRACK_DIRECTOR.centerLane) stats.centerRewardCount += 1;
      else {
        stats.sideLaneRewardCount += 1;
        stats.rewardLaneCounts.side = (stats.rewardLaneCounts.side || 0) + 1;
      }
    }
    Object.entries(result.obstacleTypes).forEach(([type, count]) => {
      stats.obstacleTypeCounts[type] = (stats.obstacleTypeCounts[type] || 0) + count;
    });

    this.currentWave = {
      type: result.type,
      label: result.label,
      family,
      intent: metadata.intent || "not tracked yet",
      requiredAction: metadata.requiredAction || "not tracked yet",
      routeType: result.routeType || metadata.routeType || "not tracked yet",
      rewardType: metadata.rewardType || "",
      pressureRating: metadata.pressureRating || 0,
      directorIntentId: directorIntent.id,
      directorIntentLabel: directorIntent.label,
      directorIntentReason: directorIntent.reason || "",
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
      rampSolutions: result.rampSolutions.map((solution) => ({ ...solution })),
      gasCanLanes: result.gasCanLanes.slice(),
      routeLanes: result.routeLanes.slice(),
      rewardLanes: result.rewardLanes.slice(),
      obstacles: result.spawned.map((obstacle) => ({
        type: obstacle.type,
        variant: obstacle.variant || "",
        lane: Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1)),
        distance: Math.round(obstacle.distance)
      })),
      lanePressureCount: blockedCount,
      meaningfulWave,
      supportWave: !meaningfulWave,
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
        family: this.currentWave.family,
        intent: this.currentWave.intent,
        requiredAction: this.currentWave.requiredAction,
        routeType: this.currentWave.routeType,
        rewardType: this.currentWave.rewardType,
        pressureRating: this.currentWave.pressureRating,
        directorIntentId: this.currentWave.directorIntentId,
        directorIntentLabel: this.currentWave.directorIntentLabel,
        directorIntentReason: this.currentWave.directorIntentReason,
        blockedLanes: this.currentWave.blockedLanes.slice(),
        boostLanes: this.currentWave.boostLanes.slice(),
        rampLanes: this.currentWave.rampLanes.slice(),
        gasCanLanes: this.currentWave.gasCanLanes.slice(),
        routeLanes: this.currentWave.routeLanes.slice(),
        rewardLanes: this.currentWave.rewardLanes.slice(),
        obstacles: this.currentWave.obstacles.map((obstacle) => ({ ...obstacle }))
      });
      if (context.run.roadDirectorSequence.length > 40) {
        context.run.roadDirectorSequence.splice(0, context.run.roadDirectorSequence.length - 40);
      }
    }
    this.lastFairnessPassed = result.fairnessPassed;
    this.lastWaveType = result.type;
    this.recentWaves.push(this.currentWave);
    if (this.recentWaves.length > 10) this.recentWaves.shift();

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
    const cadence = getTrackDirectorCadence(this.manager.getSpeedClassId(), this.manager.track);
    const turboFuelSpacing = this.manager.getSpeedClassId() === "turbo"
      && this.manager.getRaceTypeId() === FUEL_RUN_RACE_TYPE_ID
      && String(result.type || "").startsWith("fuel")
      ? 1.12
      : 1;
    const sectionCadence = getSectionNumber(result.section, "cadenceMultiplier", 1, 0.5, 1.5);
    const sectionRecovery = result.type === "recoveryGap"
      ? getSectionNumber(result.section, "recoveryGapMultiplier", 1, 0.45, 1.6)
      : 1;
    const launchPacing = this.getLaunchPacingConfig(this.manager.getSpeedClassId(), result.section);
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
      redlineSlalom: 0.88,
      speedGateChain: 0.78,
      expressConvoy: 0.92,
      neonChicane: 1,
      rampOverpass: 0.94,
      needleThread: 0.98,
      fuelTrafficPressure: 0.88,
      fuelSideTemptation: 0.9,
      fuelTrafficGate: 0.94,
      fuelAfterPressure: 1.02,
      fuelSplit: 1.06,
      fuelLowRescue: 0.72,
      fuelSupport: 0.96
    };
    const recoveryScale = result.type === "recoveryGap" ? (cadence.recoveryScale ?? 1) : 1;
    return (multipliers[result.type] || 1)
      * (cadence.spacingScale ?? 1)
      * recoveryScale
      * sectionCadence
      * sectionRecovery
      * (launchPacing?.spacingMultiplier ?? 1)
      * turboFuelSpacing;
  }

  getRandomSecondsScale(result) {
    if (!result) return 1;
    const cadence = getTrackDirectorCadence(this.manager.getSpeedClassId(), this.manager.track);
    const speedClassId = this.manager.getSpeedClassId();
    const sectionRandom = getSectionNumber(result.section, "cadenceMultiplier", 1, 0.5, 1.5);
    const launchPacing = this.getLaunchPacingConfig(speedClassId, result.section);
    const launchRandom = launchPacing?.randomSecondsMultiplier ?? 1;
    if (result.type === "recoveryGap") return 0.28 * (cadence.recoveryScale ?? 1) * sectionRandom * launchRandom;
    if (speedClassId === "turbo") return (result.hard ? 0.24 : 0.34) * sectionRandom * launchRandom;
    if (speedClassId === "pro") return (result.hard ? 0.32 : 0.44) * sectionRandom * launchRandom;
    if (result.hard) return 0.38 * sectionRandom * launchRandom;
    return 0.52 * sectionRandom * launchRandom;
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
      waveCount: this.stats.totalWaves || 0,
      meaningfulWaveCount: this.stats.meaningfulWaveCount || 0,
      supportWaveCount: this.stats.supportWaveCount || 0,
      wavesFirst10Seconds: this.stats.wavesFirst10Seconds || 0,
      launchWaveCount: this.stats.launchWaveCount || 0,
      launchMeaningfulWaveCount: this.stats.launchMeaningfulWaveCount || 0,
      hardestPressureObserved: Math.max(0, run.hardestPressureObserved || 0),
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
      waveFamily: current.family || "none",
      waveIntent: current.intent || "none",
      directorIntent: current.directorIntentLabel || this.currentDirectorIntent?.label || "none",
      currentWaveMeaningful: Boolean(current.meaningfulWave),
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
      supportWaveCount: section.supportWaveCount || 0,
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
      rampSolutionCount: section.rampSolutionCount || 0,
      minorHazardCount: section.minorHazardCount || 0,
      fuelPatternCounts: { ...(section.fuelPatternCounts || {}) },
      pressureCounts: { ...section.pressureCounts },
      waveCounts: { ...section.waveCounts },
      waveFamilyCounts: { ...(section.waveFamilyCounts || {}) },
      directorIntentCounts: { ...(section.directorIntentCounts || {}) },
      averagePressure: section.totalWaves ? section.pressureSum / section.totalWaves : 0,
      averagePressureBudget: section.totalWaves ? section.pressureBudgetSum / section.totalWaves : 0,
      averageBlockedLanesPerWave: section.totalWaves ? section.blockedLaneSum / section.totalWaves : 0,
      centerBlockedPercent: section.totalWaves ? section.centerBlockedWaves / section.totalWaves : 0,
      hardWavePercent: section.totalWaves ? section.hardWaveCount / section.totalWaves : 0,
      recoveryWavePercent: section.totalWaves ? section.recoveryWaveCount / section.totalWaves : 0,
      meaningfulWavePercent: section.totalWaves ? section.meaningfulWaveCount / section.totalWaves : 0,
      supportWavePercent: section.totalWaves ? (section.supportWaveCount || 0) / section.totalWaves : 0,
      averageWaveGapSeconds: section.waveGapCount ? section.waveGapSum / section.waveGapCount : null,
      averageMeaningfulWaveGapSeconds: section.meaningfulWaveGapCount ? section.meaningfulWaveGapSum / section.meaningfulWaveGapCount : null
    }]));
  }

  getSimulationStats() {
    const stats = this.stats;
    const run = this.manager.game.run || {};
    const averageGap = (items) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : null;
    const gapSum = (items) => items.reduce((sum, value) => sum + value, 0);
    const visibleSamples = stats.visibleMeaningfulSampleCount || 0;
    const rampSpawned = stats.rampLaneCounts.reduce((sum, count) => sum + count, 0);
    const rampUseRate = rampSpawned ? Math.min(1, Math.max(0, (run.rampsUsed || 0) / rampSpawned)) : 0;
    return {
      totalWaves: stats.totalWaves,
      nonOpeningWaves: stats.nonOpeningWaves,
      centerBlockedWaves: stats.centerBlockedWaves,
      nonOpeningCenterBlockedWaves: stats.nonOpeningCenterBlockedWaves,
      repeatedPatternCount: stats.repeatedPatternCount,
      hardWaveCount: stats.hardWaveCount,
      recoveryWaveCount: stats.recoveryWaveCount,
      meaningfulWaveCount: stats.meaningfulWaveCount,
      supportWaveCount: stats.supportWaveCount,
      wavesFirst10Seconds: stats.wavesFirst10Seconds,
      meaningfulWavesFirst10Seconds: stats.meaningfulWavesFirst10Seconds,
      supportWavesFirst10Seconds: stats.supportWavesFirst10Seconds,
      launchWaveCount: stats.launchWaveCount,
      launchMeaningfulWaveCount: stats.launchMeaningfulWaveCount,
      launchSupportWaveCount: stats.launchSupportWaveCount,
      rampUsefulCount: stats.rampUsefulCount,
      rampSolutionCount: stats.rampSolutionCount,
      rampsSpawned: rampSpawned,
      rampsUsed: run.rampsUsed || 0,
      rampAirborneDuration: run.rampAirborneDuration || 0,
      rampClearDistance: run.rampClearDistance || ROAD_READABILITY_CONFIG.rampClearDistance,
      rampTargetsAssigned: run.rampTargetsAssigned || stats.rampTargetsAssigned || 0,
      rampTargetsCleared: run.rampTargetsCleared || 0,
      rampLandingRejected: run.rampLandingRejected || stats.rampLandingRejected || 0,
      rampFailedToClearTarget: run.rampFailedToClearTarget || stats.rampFailedToClearTarget || 0,
      minorHazardCount: stats.minorHazardCount,
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
      waveFamilyCounts: { ...stats.waveFamilyCounts },
      directorIntentCounts: { ...stats.directorIntentCounts },
      boostLaneCounts: stats.boostLaneCounts.slice(),
      rampLaneCounts: stats.rampLaneCounts.slice(),
      gasCanLaneCounts: stats.gasCanLaneCounts.slice(),
      rewardLaneCounts: { ...stats.rewardLaneCounts },
      sideLaneRewardCount: stats.sideLaneRewardCount || 0,
      centerRewardCount: stats.centerRewardCount || 0,
      visibleMeaningfulMin: Number.isFinite(stats.visibleMeaningfulMin) ? stats.visibleMeaningfulMin : 0,
      visibleMeaningfulAverage: visibleSamples ? stats.visibleMeaningfulSampleSum / visibleSamples : 0,
      visibleMeaningfulSampleCount: visibleSamples,
      upcomingDecisionGapMax: stats.upcomingDecisionGapMax || 0,
      deadScreenTime: stats.deadScreenTime || 0,
      longestDeadScreenSeconds: Math.max(stats.longestDeadScreenSeconds || 0, this.deadScreenSeconds || 0),
      timeSinceLastMeaningfulDecisionMax: Math.max(stats.timeSinceLastMeaningfulDecisionMax || 0, this.timeSinceMeaningfulWaveSeconds || 0),
      underActivityCorrections: stats.underActivityCorrections || run.underActivityCorrections || 0,
      overActivityDelays: stats.overActivityDelays || run.overActivityDelays || run.activeFieldBudgetDelays || 0,
      rampUseRate,
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

  getMinorHazardScale(context, result = null) {
    if (context.fuelRun) return ROAD_READABILITY_CONFIG.fuelMinorHazardScale;
    let scale = ROAD_READABILITY_CONFIG.minorPressureSpawnScale[context.speedClassId] ?? 0.5;
    scale *= this.getTrackObjectWeight("minorHazardScale", context);
    if (context.section?.id === "launch") {
      scale *= context.launchPacing?.minorScaleMultiplier ?? LAUNCH_PACING_CONFIG.default.minorScaleMultiplier;
    }
    const hardCount = result
      ? result.spawned.filter((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type)).length
      : 0;
    if (hardCount >= 2 || (result?.blockedLanes?.size || 0) >= 3) {
      scale *= ROAD_READABILITY_CONFIG.denseTrafficMinorScale;
    }
    return scale;
  }

  shouldSpawnMinorHazard(context, baseChance, result = null) {
    const chance = clamp(baseChance * this.getMinorHazardScale(context, result), 0, 1);
    return chance > 0 && this.random() < chance;
  }

  chooseMinorHazard(context, options = {}) {
    const includeBranch = options.includeBranch !== false && context.band.id !== "opening";
    const coneWeight = context.speedClassId === "turbo" ? 1.2 : 1.4;
    const choices = [
      { value: "cone", weight: coneWeight * this.getTrackObjectWeight("cone", context) },
      { value: "oil", weight: (context.band.id === "opening" ? 0.16 : 0.72) * this.getTrackObjectWeight("oil", context) }
    ];
    if (includeBranch) choices.push({ value: "branch", weight: 0.42 * this.getTrackObjectWeight("branch", context) });
    return weightedChoice(choices, () => this.random()) || this.getTrackMinorFallback("cone", context);
  }

  staggerDistance(context, factor, min, max) {
    return clamp(context.cruiseSpeed * factor, min, max);
  }

  recordRampSolution(result, ramp, target) {
    if (!ramp || !target) return;
    const targetGap = Math.max(0, target.distance - ramp.distance);
    const clearDistance = Number.isFinite(ramp.solutionClearDistance)
      ? ramp.solutionClearDistance
      : getRampRequiredClearDistance(targetGap);
    result.rampSolutions.push({
      lane: Math.round(clamp(ramp.lane, 0, LANES - 1)),
      rampDistance: Math.round(ramp.distance),
      targetDistance: Math.round(target.distance),
      targetType: target.type,
      targetId: target.id || "",
      clearDistance: Math.round(clearDistance),
      landingSafetyDistance: ROAD_READABILITY_CONFIG.rampLandingSafetyDistance
    });
    this.stats.rampTargetsAssigned = (this.stats.rampTargetsAssigned || 0) + 1;
    const run = this.manager.game.run;
    if (run) run.rampTargetsAssigned = (run.rampTargetsAssigned || 0) + 1;
  }

  isRampSolutionCandidateClearable(rampLane, rampDistance, targetDistance, context) {
    if (!Number.isFinite(targetDistance) || targetDistance <= rampDistance) return false;
    const targetGap = targetDistance - rampDistance;
    const clearDistance = getRampClearDistanceForSpeed(context.cruiseSpeed, targetGap);
    const requiredClearDistance = targetGap + ROAD_READABILITY_CONFIG.rampLandingSafetyDistance;
    if (clearDistance + 1 < requiredClearDistance) return false;
    if (this.manager.hasRampPathCollectibleConflict(rampLane, rampDistance, targetDistance, this.manager.obstacles)) return false;
    if (this.manager.isRampLandingRangeUnsafe(rampLane, targetDistance, this.manager.obstacles)) return false;
    return true;
  }

  recordRampRejected(context) {
    this.stats.rampLandingRejected = (this.stats.rampLandingRejected || 0) + 1;
    const run = context?.run || this.manager.game.run;
    if (run) run.rampLandingRejected = (run.rampLandingRejected || 0) + 1;
  }

  spawnRampSolution(rampLane, distance, context, result, options = {}) {
    const targetType = options.targetType || this.chooseMinorHazard(context, { includeBranch: true });
    const baseTargetGap = clamp(
      options.targetGap || context.cruiseSpeed * 0.34,
      ROAD_READABILITY_CONFIG.rampTargetMinGap,
      ROAD_READABILITY_CONFIG.rampTargetMaxGap
    );
    const gapCandidates = [
      baseTargetGap,
      baseTargetGap + 120,
      baseTargetGap - 120,
      ROAD_READABILITY_CONFIG.rampTargetMinGap,
      ROAD_READABILITY_CONFIG.rampTargetMaxGap
    ];
    const seenGaps = new Set();
    for (const rawGap of gapCandidates) {
      const targetGap = clamp(rawGap, ROAD_READABILITY_CONFIG.rampTargetMinGap, ROAD_READABILITY_CONFIG.rampTargetMaxGap);
      const gapKey = Math.round(targetGap / 10) * 10;
      if (seenGaps.has(gapKey)) continue;
      seenGaps.add(gapKey);
      const targetDistance = distance + targetGap;
      if (!this.isRampSolutionCandidateClearable(rampLane, distance, targetDistance, context)) {
        this.recordRampRejected(context);
        continue;
      }
      const target = this.spawn(targetType, rampLane, targetDistance, result, {
        rampTarget: true,
        allowLaneAdjust: false
      });
      if (!target) continue;
      const clearDistance = getRampClearDistanceForSpeed(context.cruiseSpeed, targetGap);
      const ramp = this.spawn("ramp", rampLane, distance, result, {
        rampSolution: true,
        solutionTargetDistance: targetDistance,
        solutionTargetType: targetType,
        solutionTargetId: target.id,
        solutionClearDistance: clearDistance,
        solutionLandingSafetyDistance: ROAD_READABILITY_CONFIG.rampLandingSafetyDistance,
        allowLaneAdjust: false
      });
      if (!ramp) {
        this.removePlacement(target, result);
        this.recordRampRejected(context);
        continue;
      }
      target.rampSolutionId = ramp.id;
      this.recordRampSolution(result, ramp, target);
      return ramp;
    }
    return null;
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
      if (this.random() < centerSafeChance * movementPenalty) {
        return this.avoidRecentRouteLane(centerLane, context, excluded);
      }
    }
    const highModeCenterPressure = ["pro", "turbo"].includes(context.speedClassId)
      && (context.allowSoftCenterPressure || context.progress > 0.22);
    return this.avoidRecentRouteLane(
      this.pickSafeLane(context, Boolean(options.preferSide) || context.centerNeedsChallenge || highModeCenterPressure, excluded),
      context,
      excluded
    );
  }

  avoidRecentRouteLane(lane, context, excluded = []) {
    const recentLanes = this.recentWaves.slice(-4).flatMap((wave) => wave.routeLanes || []);
    const repeats = recentLanes.filter((item) => item === lane).length;
    if (repeats < 2 || this.random() > 0.62) return lane;
    const blocked = Array.isArray(excluded) ? excluded : [excluded];
    let alternatives = this.lanesExcept(blocked).filter((candidate) => candidate !== lane);
    if (context.centerNeedsChallenge || context.speedClassId === "turbo") {
      const sideAlternatives = alternatives.filter((candidate) => candidate !== TRACK_DIRECTOR.centerLane);
      if (sideAlternatives.length) alternatives = sideAlternatives;
    }
    return alternatives.length
      ? randomChoice(shuffle(alternatives, () => this.random()), () => this.random())
      : lane;
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
    const picked = randomChoice(shuffle(lanes, () => this.random()), () => this.random());
    const recentRewards = this.recentWaves.slice(-4).flatMap((wave) => wave.rewardLanes || []);
    const repeats = recentRewards.filter((lane) => lane === picked).length;
    if (repeats >= 2 && lanes.length > 1 && this.random() < 0.7) {
      return randomChoice(shuffle(lanes.filter((lane) => lane !== picked), () => this.random()), () => this.random()) ?? picked;
    }
    return picked;
  }

  chooseBlockerType(context, heavyChance = 0.25) {
    const difficulty = context.difficulty;
    const options = [
      { value: "slowCar", weight: 1.5 * this.getTrackObjectWeight("slowCar", context) },
      { value: "fastCar", weight: (0.55 + difficulty * 1.2) * this.getTrackObjectWeight("fastCar", context) },
      { value: "truck", weight: (Math.max(0, heavyChance - 0.05) + difficulty * 0.35) * this.getTrackObjectWeight("truck", context) },
      { value: "barrier", weight: (heavyChance * 0.65 + difficulty * 0.25) * this.getTrackObjectWeight("barrier", context) },
      { value: "cone", weight: (context.band.id === "opening" ? 0.9 : 0.2) * this.getTrackObjectWeight("cone", context) },
      { value: "oil", weight: (context.band.id === "opening" ? 0.08 : 0.18 + difficulty * 0.12) * this.getTrackObjectWeight("oil", context) }
    ];
    if (context.speedClassId === "sunday") {
      options.find((item) => item.value === "truck").weight *= 0.35;
      options.find((item) => item.value === "barrier").weight *= 0.45;
    }
    if (["launch", "groove"].includes(context.section?.id)) {
      options.find((item) => item.value === "barrier").weight *= 0.48;
    }
    if (context.speedClassId === "turbo") {
      options.find((item) => item.value === "barrier").weight *= 0.38;
    } else if (context.speedClassId === "pro") {
      options.find((item) => item.value === "barrier").weight *= 0.65;
    }
    return weightedChoice(options, () => this.random()) || "slowCar";
  }

  waveSingleBlocker(distance, context, result) {
    const lane = this.pickPressureLane(context, context.band.id === "opening" ? 0.24 : 0.38);
    const type = context.band.id === "opening" && this.random() < 0.35
      ? this.getTrackMinorFallback("cone", context)
      : this.chooseBlockerType(context, 0.12);
    this.spawn(type, lane, distance, result);
    if (context.section?.id === "launch") return;
    const extraChance = context.speedClassId === "turbo" ? 0.96 : (context.speedClassId === "pro" ? 0.72 : (context.speedClassId === "arcade" ? 0.38 : 0));
    const extraMinProgress = context.speedClassId === "turbo" ? 0.05 : (context.speedClassId === "pro" ? 0.14 : 0.22);
    if (context.progress > extraMinProgress && extraChance > 0 && this.canAddPressure(result, "cone", context) && this.shouldSpawnMinorHazard(context, extraChance, result)) {
      const sideLane = this.pickPressureLane(context, 0.32, [lane]);
      this.spawn(this.chooseMinorHazard(context), sideLane, distance + this.staggerDistance(context, 0.12, 120, 230), result);
      const thirdChance = context.speedClassId === "turbo" ? 0.8 : (context.speedClassId === "pro" ? 0.38 : 0);
      const thirdMinProgress = context.speedClassId === "turbo" ? 0.18 : 0.42;
      if (context.progress > thirdMinProgress && thirdChance > 0 && this.canAddPressure(result, "slowCar", context, 0.2) && this.random() < thirdChance) {
        const thirdLane = this.pickPressureLane(context, 0.38, [lane, sideLane]);
        this.spawn("slowCar", thirdLane, distance + this.staggerDistance(context, 0.22, 250, 410), result);
      }
    }
  }

  waveDoubleGate(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, { centerSafeChance: context.centerRestChance });
    this.recordIntendedRoute(result, safeLane, "side escape");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    this.spawn(this.chooseBlockerType(context, 0.12), lanes[0], distance, result);
    this.spawn(this.random() < 0.78 ? "slowCar" : this.chooseBlockerType(context, 0.08), lanes[1], distance + this.staggerDistance(context, 0.07, 70, 145), result);
    if (context.section?.id === "launch") return;
    const thirdChance = context.speedClassId === "arcade" ? 0.5 : (context.speedClassId === "pro" ? 0.86 : 0.98);
    const thirdMinProgress = context.speedClassId === "turbo" ? 0.04 : (context.speedClassId === "pro" ? 0.16 : 0.3);
    const addThird = context.progress > thirdMinProgress
      && (context.speedClassId === "arcade" || context.speedClassId === "pro" || context.speedClassId === "turbo")
      && this.canAddPressure(result, "cone", context)
      && this.shouldSpawnMinorHazard(context, thirdChance, result);
    if (addThird) {
      this.spawn(this.chooseMinorHazard(context), lanes[2], distance + this.staggerDistance(context, 0.15, 170, 300), result);
    }
  }

  waveOffsetPair(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, { centerSafeChance: context.centerRestChance * 0.86 });
    this.recordIntendedRoute(result, safeLane, "staggered escape");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const firstLane = lanes[0];
    const secondLane = lanes[1];
    const stagger = lerp(170, 285, this.random());
    this.spawn(this.chooseBlockerType(context, 0.18), firstLane, distance, result);
    const secondType = this.shouldSpawnMinorHazard(context, 0.36, result)
      ? this.chooseMinorHazard(context)
      : this.chooseBlockerType(context, 0.12);
    this.spawn(secondType, secondLane, distance + stagger, result);
    if (context.section?.id === "launch") return;
    const thirdChance = context.speedClassId === "rookie" ? 0.18 : (context.speedClassId === "arcade" ? 0.66 : (context.speedClassId === "pro" ? 0.88 : 0.99));
    const thirdMinProgress = context.speedClassId === "turbo" ? 0.06 : (context.speedClassId === "pro" ? 0.16 : 0.28);
    if (context.progress > thirdMinProgress && context.speedClassId !== "sunday" && this.canAddPressure(result, "cone", context) && this.random() < thirdChance) {
      const thirdLane = randomChoice(shuffle(this.lanesExcept([safeLane, firstLane, secondLane]), () => this.random()), () => this.random());
      const thirdType = this.shouldSpawnMinorHazard(context, 0.28, result) ? this.chooseMinorHazard(context) : "slowCar";
      if (this.canAddPressure(result, thirdType, context, 0.2)) {
        this.spawn(thirdType, thirdLane, distance + stagger + this.staggerDistance(context, 0.08, 95, 180), result);
      }
    }
  }

  waveCenterBlock(distance, context, result) {
    this.recordIntendedRoute(result, [0, 1, 3, 4], "side escape");
    const type = context.progress < 0.3 ? (this.random() < 0.45 ? this.getTrackMinorFallback("cone", context) : "slowCar") : this.chooseBlockerType(context, 0.2);
    this.spawn(type, TRACK_DIRECTOR.centerLane, distance, result);
    const launchOpening = context.section?.id === "launch";
    if (launchOpening && context.speedClassId === "turbo" && context.progress < 0.1) return;
    const sidePressureChance = context.speedClassId === "sunday" ? 0.44 : (context.speedClassId === "rookie" ? 0.72 : 1);
    const sideMinProgress = context.speedClassId === "turbo" ? 0 : (context.speedClassId === "pro" ? 0.05 : 0.12);
    if (context.progress > sideMinProgress && this.random() < sidePressureChance && this.canAddPressure(result, "cone", context)) {
      const sideLane = this.pickPressureLane(context, 0, [TRACK_DIRECTOR.centerLane]);
      const sideType = this.shouldSpawnMinorHazard(context, 0.42, result) ? this.chooseMinorHazard(context) : "slowCar";
      if (this.canAddPressure(result, sideType, context, 0.15)) {
        this.spawn(sideType, sideLane, distance + this.staggerDistance(context, 0.1, 105, 205), result);
        if (launchOpening) return;
        const thirdChance = context.speedClassId === "arcade" ? 0.58 : (context.speedClassId === "pro" ? 0.94 : 0.99);
        const thirdMinProgress = context.speedClassId === "arcade" ? 0.3 : (context.speedClassId === "pro" ? 0.12 : 0.04);
        if (context.progress > thirdMinProgress && ["arcade", "pro", "turbo"].includes(context.speedClassId) && this.canAddPressure(result, "slowCar", context) && this.random() < thirdChance) {
          const thirdLane = this.pickPressureLane(context, 0, [TRACK_DIRECTOR.centerLane, sideLane]);
          this.spawn("slowCar", thirdLane, distance + this.staggerDistance(context, 0.22, 250, 420), result);
        }
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
      const type = i === 0 ? this.getTrackMinorFallback("cone", context) : (this.random() < 0.42 ? "slowCar" : this.chooseBlockerType(context, 0.1));
      this.spawn(type, lane, distance + i * step, result);
    }
  }

  waveConstructionSqueeze(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      preferSide: true,
      centerSafeChance: context.centerRestChance * 0.42
    });
    this.recordIntendedRoute(result, safeLane, "announced side escape");
    this.manager.addWarning(distance, safeLane, "work");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const count = context.speedClassId === "sunday"
      ? 2
      : (context.speedClassId === "rookie" && (context.band.id === "earlyMid" || this.random() < 0.38) ? 2 : 3);
    const primaryBarrierChance = context.speedClassId === "turbo" ? 0.42 : (context.speedClassId === "pro" ? 0.5 : 0.62);
    const primaryType = this.random() < primaryBarrierChance ? "barrier" : "slowCar";
    const secondBarrier = context.difficulty > 0.68
      && !["launch", "groove"].includes(context.section?.id)
      && this.random() < (context.speedClassId === "turbo" ? 0.24 : 0.34);
    const minorType = this.random() < 0.58 ? this.getTrackMinorFallback("cone", context) : this.getTrackMinorFallback("oil", context);
    const types = [primaryType, minorType, secondBarrier ? "barrier" : "slowCar"];
    for (let i = 0; i < count; i += 1) {
      let type = types[i];
      if (MINOR_HAZARD_TYPES.has(type) && !this.shouldSpawnMinorHazard(context, 0.72, result)) {
        if (i === 1) continue;
        type = "slowCar";
      }
      if (!this.canAddPressure(result, type, context, 0.25)) continue;
      this.spawn(type, lanes[i], distance + i * this.staggerDistance(context, 0.1, 115, 220), result);
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
      if (this.shouldSpawnMinorHazard(context, 0.7, result)) {
        this.spawn(this.chooseMinorHazard(context), laneA, distance - this.staggerDistance(context, 0.12, 150, 260), result);
      }
      const secondChance = context.speedClassId === "turbo" ? 0.92 : (context.speedClassId === "pro" ? 0.8 : 0.68);
      if (["arcade", "pro", "turbo"].includes(context.speedClassId) && this.canAddPressure(result, "cone", context) && this.shouldSpawnMinorHazard(context, secondChance, result)) {
        this.spawn("cone", laneB, distance + 170, result);
      }
      const thirdChance = context.speedClassId === "turbo" ? 0.56 : (context.speedClassId === "pro" ? 0.28 : 0);
      if (context.progress > 0.52 && thirdChance > 0 && this.canAddPressure(result, "oil", context, 0.2) && this.shouldSpawnMinorHazard(context, thirdChance, result)) {
        const laneC = this.pickPressureLane(context, 0.3, [laneA, laneB]);
        this.spawn(this.chooseMinorHazard(context), laneC, distance + this.staggerDistance(context, 0.08, 90, 170), result);
      }
    }
    this.spawn("deer", TRACK_DIRECTOR.centerLane, distance, result, {
      laneFloat: direction > 0 ? -0.45 : LANES - 0.55,
      direction
    });
  }

  waveRampEscape(distance, context, result) {
    const rampLane = this.pickWaveSafeLane(context, {
      preferSide: true,
      centerSafeChance: context.centerRestChance * 0.36
    });
    this.recordIntendedRoute(result, rampLane, "jump route");
    const ramp = this.spawnRampSolution(rampLane, distance, context, result, {
      targetType: this.random() < 0.68 ? this.getTrackMinorFallback("cone", context) : this.chooseMinorHazard(context, { includeBranch: true })
    });
    if (!ramp) {
      this.waveBoostTemptation(distance, context, result);
      return;
    }
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(rampLane), () => this.random()));
    const pressureDistance = distance + clamp(context.cruiseSpeed * 0.28, 380, 700);
    const firstType = this.chooseBlockerType(context, 0.14);
    this.spawn(firstType, lanes[0], pressureDistance - this.staggerDistance(context, 0.08, 90, 170), result);
    if (context.section?.id === "breather") return;
    if (context.band.id !== "opening" && context.speedClassId !== "sunday" && this.canAddPressure(result, "slowCar", context, 0.35)) {
      this.spawn("slowCar", lanes[1], pressureDistance + this.staggerDistance(context, 0.1, 110, 210), result);
    }
    if (context.band.id === "final" && (context.speedClassId === "pro" || context.speedClassId === "turbo") && this.canAddPressure(result, "fastCar", context, 0.3)) {
      this.spawn("fastCar", lanes[2], pressureDistance + this.staggerDistance(context, 0.24, 270, 470), result);
    }
  }

  waveBoostTemptation(distance, context, result) {
    const blockerLane = this.pickPressureLane(context, 0.46);
    const rewardLane = this.pickRewardLane(context, [blockerLane]);
    this.recordIntendedRoute(result, rewardLane, "reward side route");
    this.spawn(this.random() < 0.72 ? "slowCar" : this.getTrackMinorFallback("cone", context), blockerLane, distance, result);
    const launchOpening = context.section?.id === "launch";
    if (context.progress > 0.25 && this.canAddPressure(result, "cone", context)) {
      const secondLane = this.pickPressureLane(context, 0.18, [blockerLane, rewardLane]);
      const secondType = this.shouldSpawnMinorHazard(context, 0.38, result) ? this.chooseMinorHazard(context) : "slowCar";
      if (this.canAddPressure(result, secondType, context, 0.15)) {
        this.spawn(secondType, secondLane, distance + this.staggerDistance(context, 0.1, 105, 210), result);
        const thirdChance = context.speedClassId === "turbo" ? 0.98 : (context.speedClassId === "pro" ? 0.66 : 0);
        const thirdMinProgress = context.speedClassId === "turbo" ? 0.12 : 0.32;
        if (thirdChance > 0 && context.progress > thirdMinProgress && this.canAddPressure(result, "slowCar", context, 0.2) && this.random() < thirdChance) {
          const thirdLane = this.pickPressureLane(context, 0.34, [blockerLane, rewardLane, secondLane]);
          this.spawn("slowCar", thirdLane, distance + this.staggerDistance(context, 0.24, 260, 440), result);
        }
      }
    }
    const launchBoostChance = context.speedClassId === "turbo" ? 0.18 : 0.34;
    if (!launchOpening || this.random() < launchBoostChance) {
      this.spawn("boostPad", rewardLane, distance + clamp(context.cruiseSpeed * 0.27, 260, 430), result);
    }
  }

  waveNearMissCorridor(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      centerSafeChance: context.centerRestChance * 0.48
    });
    this.recordIntendedRoute(result, safeLane, "corridor");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const count = context.band.id === "final" || context.speedClassId === "arcade" || context.speedClassId === "pro" || context.speedClassId === "turbo" ? 3 : 2;
    const step = this.staggerDistance(context, 0.13, 150, 280);
    for (let i = 0; i < count; i += 1) {
      const type = i === 0 ? "fastCar" : (i === 1 && context.difficulty > 0.6 ? "truck" : "slowCar");
      this.spawn(type, lanes[i], distance + i * step, result);
    }
  }

  waveRedlineSlalom(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      centerSafeChance: context.centerRestChance * 0.38,
      preferSide: ["pro", "turbo"].includes(context.speedClassId)
    });
    this.recordIntendedRoute(result, safeLane, "slalom");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const step = this.staggerDistance(context, 0.12, 145, 260);
    const count = context.speedClassId === "sunday" ? 2 : (context.speedClassId === "rookie" ? 2 : 3);
    for (let i = 0; i < count; i += 1) {
      const lane = lanes[i];
      if (!Number.isFinite(lane)) continue;
      const type = i === 0 ? "fastCar" : (i === 1 && context.difficulty > 0.55 ? "slowCar" : "fastCar");
      if (this.canAddPressure(result, type, context, 0.3)) {
        this.spawn(type, lane, distance + i * step, result);
      }
    }
    if (context.progress > 0.22 && this.random() < 0.42) {
      this.spawn("boostPad", safeLane, distance + step * 2.6, result);
    }
  }

  waveSpeedGateChain(distance, context, result) {
    const firstLane = this.pickRewardLane(context);
    const secondLane = this.pickRewardLane(context, [firstLane]);
    const thirdLane = this.pickRewardLane(context, [firstLane, secondLane]);
    const chain = [firstLane, secondLane];
    if (["arcade", "pro", "turbo"].includes(context.speedClassId) && context.progress > 0.3) chain.push(thirdLane);
    this.recordIntendedRoute(result, chain, "reward chain");
    const step = this.staggerDistance(context, 0.14, 170, 290);
    chain.forEach((lane, index) => {
      this.spawn("boostPad", lane, distance + index * step, result);
      const blockerLane = this.pickPressureLane(context, 0.22, chain.slice(0, index + 1));
      const type = index === 0 ? "slowCar" : "fastCar";
      if (Number.isFinite(blockerLane) && this.canAddPressure(result, type, context, 0.35)) {
        this.spawn(type, blockerLane, distance + index * step + this.staggerDistance(context, 0.06, 70, 135), result);
      }
    });
  }

  waveExpressConvoy(distance, context, result) {
    const corridorLane = this.pickWaveSafeLane(context, {
      centerSafeChance: context.centerRestChance * 0.34,
      preferSide: context.speedClassId === "turbo"
    });
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(corridorLane), () => this.random()));
    const step = this.staggerDistance(context, 0.1, 120, 230);
    const count = context.speedClassId === "sunday" ? 2 : (context.progress > 0.48 || ["pro", "turbo"].includes(context.speedClassId) ? 3 : 2);
    for (let i = 0; i < count; i += 1) {
      const lane = lanes[i];
      const type = i === 2 && context.difficulty > 0.58 ? "truck" : "fastCar";
      if (Number.isFinite(lane) && this.canAddPressure(result, type, context, 0.3)) {
        this.spawn(type, lane, distance + i * step, result);
      }
    }
    if (context.progress > 0.38 && this.random() < 0.36) {
      this.spawn("boostPad", corridorLane, distance + step * 2.2, result);
    }
  }

  waveNeonChicane(distance, context, result) {
    const pathLane = this.pickWaveSafeLane(context, {
      preferSide: true,
      centerSafeChance: context.centerRestChance * 0.22
    });
    const turnLane = this.pickSafeLane(context, true, [pathLane]);
    const firstGate = this.orderPressureLanes(context, shuffle(this.lanesExcept(pathLane), () => this.random()));
    const secondGate = this.orderPressureLanes(context, shuffle(this.lanesExcept(turnLane), () => this.random()));
    const step = this.staggerDistance(context, 0.13, 155, 285);
    const barrierType = this.getTrackObjectWeight("barrier", context) > 0.05 ? "barrier" : "slowCar";
    if (this.canAddPressure(result, barrierType, context, 0.3)) {
      this.spawn(barrierType, firstGate[0], distance, result);
    }
    if (this.canAddPressure(result, "slowCar", context, 0.3)) {
      this.spawn("slowCar", firstGate[1], distance + step * 0.7, result);
    }
    if (this.canAddPressure(result, barrierType, context, 0.4)) {
      this.spawn(barrierType, secondGate[0], distance + step * 1.65, result);
    }
    if (context.progress > 0.5 && this.random() < 0.34) {
      this.spawn("boostPad", turnLane, distance + step * 2.15, result);
    }
  }

  waveRampOverpass(distance, context, result) {
    const rampLane = this.pickWaveSafeLane(context, {
      preferSide: true,
      centerSafeChance: context.centerRestChance * 0.25
    });
    const ramp = this.spawnRampSolution(rampLane, distance, context, result, {
      targetType: "cone",
      targetGap: this.staggerDistance(context, 0.2, 245, 390)
    });
    if (!ramp) {
      this.waveRedlineSlalom(distance, context, result);
      return;
    }
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(rampLane), () => this.random()));
    const pressureDistance = distance + this.staggerDistance(context, 0.28, 390, 660);
    const leadType = context.progress > 0.5 && this.random() < 0.44 ? "truck" : "fastCar";
    if (this.canAddPressure(result, leadType, context, 0.35)) {
      this.spawn(leadType, lanes[0], pressureDistance, result);
    }
    if (this.canAddPressure(result, "slowCar", context, 0.28)) {
      this.spawn("slowCar", lanes[1], pressureDistance + this.staggerDistance(context, 0.08, 95, 175), result);
    }
  }

  waveNeedleThread(distance, context, result) {
    const threadLane = this.pickWaveSafeLane(context, {
      centerSafeChance: context.centerRestChance * 0.18,
      preferSide: context.speedClassId !== "arcade"
    });
    this.recordIntendedRoute(result, threadLane, "narrow route");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(threadLane), () => this.random()));
    const step = this.staggerDistance(context, 0.09, 115, 215);
    const types = [
      context.progress > 0.62 && this.random() < 0.34 ? "truck" : "fastCar",
      "fastCar",
      context.difficulty > 0.6 ? "slowCar" : "fastCar"
    ];
    for (let i = 0; i < types.length; i += 1) {
      const lane = lanes[i];
      const type = types[i];
      if (Number.isFinite(lane) && this.canAddPressure(result, type, context, 0.42)) {
        this.spawn(type, lane, distance + i * step, result);
      }
    }
    if (context.progress > 0.58 && this.random() < 0.3) {
      this.spawn("boostPad", threadLane, distance + step * 3, result);
    }
  }

  waveFourLaneSpike(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      preferSide: true,
      centerSafeChance: context.centerRestChance * 0.2
    });
    const lanes = shuffle(this.lanesExcept(safeLane), () => this.random());
    const spikeHeavyType = context.section?.id === "finalPush" && context.difficulty > 0.72 && this.random() < 0.32
      ? "barrier"
      : "truck";
    const types = ["slowCar", "fastCar", spikeHeavyType, this.random() < 0.5 ? "cone" : "oil"];
    const step = this.staggerDistance(context, 0.13, 160, 290);
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
      this.spawn(types[i], lanes[i], distance + i * step, result, {
        allowFourLanePressure: true
      });
    }
  }

  chooseFuelBlockerType(context, heavyChance = 0.22) {
    const difficulty = context.difficulty;
    const options = [
      { value: "slowCar", weight: 1.65 * this.getTrackObjectWeight("slowCar", context) },
      { value: "fastCar", weight: (0.65 + difficulty * 1.25) * this.getTrackObjectWeight("fastCar", context) },
      { value: "truck", weight: (heavyChance + difficulty * 0.48) * this.getTrackObjectWeight("truck", context) },
      { value: "barrier", weight: (heavyChance * 0.85 + difficulty * 0.42) * this.getTrackObjectWeight("barrier", context) }
    ];
    if (context.speedClassId === "sunday") {
      options.find((item) => item.value === "truck").weight *= 0.42;
      options.find((item) => item.value === "barrier").weight *= 0.58;
    }
    if (context.speedClassId === "turbo") {
      options.find((item) => item.value === "fastCar").weight *= 1.28;
      options.find((item) => item.value === "truck").weight *= 1.18;
      options.find((item) => item.value === "barrier").weight *= 0.45;
    }
    if (["launch", "groove"].includes(context.section?.id)) {
      options.find((item) => item.value === "barrier").weight *= 0.58;
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
    this.recordIntendedRoute(result, safeLane, "traffic gate");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const count = context.speedClassId === "sunday" ? 1 : (context.progress > 0.55 || ["pro", "turbo"].includes(context.speedClassId) ? 3 : 2);
    const step = this.staggerDistance(context, 0.11, 125, 230);
    for (let i = 0; i < count; i += 1) {
      const lane = lanes[i];
      if (!Number.isFinite(lane)) continue;
      const gap = i * step;
      this.spawn(this.chooseFuelBlockerType(context, i === 0 ? 0.16 : 0.28), lane, distance + gap, result);
    }
  }

  waveFuelSideTemptation(distance, context, result) {
    const gasLane = this.pickFuelCanLane(context, [], { preferSide: true });
    this.recordIntendedRoute(result, gasLane, "fuel side route");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(gasLane), () => this.random()));
    this.spawn(this.chooseFuelBlockerType(context, 0.16), lanes[0], distance, result);
    if (lanes.includes(TRACK_DIRECTOR.centerLane) && this.random() < 0.72) {
      this.spawn(this.chooseFuelBlockerType(context, 0.18), TRACK_DIRECTOR.centerLane, distance + this.staggerDistance(context, 0.08, 90, 170), result);
    } else if (Number.isFinite(lanes[1])) {
      this.spawn(this.chooseFuelBlockerType(context, 0.2), lanes[1], distance + this.staggerDistance(context, 0.1, 110, 210), result);
    }
    this.trySpawnFuelCan([gasLane], distance + clamp(context.cruiseSpeed * 0.3, 310, 470), context, result, "sideTemptation");
  }

  waveFuelTrafficGate(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, {
      preferSide: context.centerNeedsChallenge,
      centerSafeChance: context.centerRestChance * 0.62
    });
    this.recordIntendedRoute(result, safeLane, "fuel gate");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    this.spawn(this.chooseFuelBlockerType(context, 0.18), lanes[0], distance, result);
    this.spawn(this.chooseFuelBlockerType(context, 0.22), lanes[1], distance + this.staggerDistance(context, 0.09, 105, 190), result);
    if (context.progress > 0.32 && ["arcade", "pro", "turbo"].includes(context.speedClassId) && Number.isFinite(lanes[2]) && this.canAddPressure(result, "slowCar", context, 0.35) && this.random() < (context.speedClassId === "turbo" ? 0.78 : 0.42)) {
      this.spawn(this.chooseFuelBlockerType(context, 0.18), lanes[2], distance + this.staggerDistance(context, 0.2, 230, 390), result);
    }
    this.trySpawnFuelCan([safeLane], distance + clamp(context.cruiseSpeed * 0.34, 340, 520), context, result, "trafficGate");
  }

  waveFuelAfterPressure(distance, context, result) {
    const safeLane = this.pickWaveSafeLane(context, { preferSide: true, centerSafeChance: context.centerRestChance * 0.48 });
    this.recordIntendedRoute(result, safeLane, "recovery fuel route");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(safeLane), () => this.random()));
    const count = context.speedClassId === "sunday" ? 2 : 3;
    const step = this.staggerDistance(context, 0.1, 120, 220);
    for (let i = 0; i < count; i += 1) {
      this.spawn(this.chooseFuelBlockerType(context, i === 0 ? 0.2 : 0.32), lanes[i], distance + i * step, result);
    }
    this.trySpawnFuelCan([safeLane], distance + clamp(context.cruiseSpeed * 0.48, 480, 700), context, result, "afterPressure");
  }

  waveFuelSplit(distance, context, result) {
    const candidates = shuffle(this.lanesExcept(TRACK_DIRECTOR.centerLane), () => this.random());
    const gasA = candidates[0] ?? 0;
    const gasB = candidates.find((lane) => Math.abs(lane - gasA) >= 2) ?? candidates[1] ?? 4;
    this.recordIntendedRoute(result, [gasA, gasB], "split fuel route");
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
    this.recordIntendedRoute(result, fuelLane, "rescue route");
    const lanes = this.orderPressureLanes(context, shuffle(this.lanesExcept(fuelLane), () => this.random()));
    const blockerCount = context.speedClassId === "sunday" ? 1 : 2;
    for (let i = 0; i < blockerCount; i += 1) {
      this.spawn(this.chooseFuelBlockerType(context, 0.16), lanes[i], distance + (i === 1 ? 60 : 0), result);
    }
    this.trySpawnFuelCan([fuelLane], distance + clamp(context.cruiseSpeed * 0.24, 240, 390), context, result, "lowFuelRescue");
  }

  waveFuelSupport(distance, context, result) {
    const rewardLane = this.pickRewardLane(context);
    this.recordIntendedRoute(result, rewardLane, "light reward route");
    this.spawn("boostPad", rewardLane, distance + clamp(context.cruiseSpeed * 0.22, 240, 390), result);
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
    this.nextSpawnDistance = this.getInitialSpawnDistance(track);
    this.lastPatternSafeLane = 2;
    this.forceLastCollision = "none";
    this.lastFourLanePressureDistance = -Infinity;
    this.preventedUnsafeSpawns = 0;
    this.lastSafetySummary = null;
    this.nextObstacleId = 1;
    this.seedLockedSpawnObstacles = [];
    this.director.reset(track);
    this.applyStartClearState();
  }

  random() {
    return typeof this.game.randomFloat === "function" ? this.game.randomFloat() : this.fallbackRng.random();
  }

  update(dt) {
    const run = this.game.run;
    const track = this.track;
    if (run) {
      run.wavesSpawnedThisFrame = 0;
      run.lastWaveDelayedForVisibleSafety = false;
      run.lastSpawnVisibleAhead = VIEW_DISTANCE;
      run.lastSpawnRevealBuffer = this.getSpawnRevealBuffer(run);
    }
    this.director.update(dt);
    this.spawnScheduledWave(run, track);

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
    this.updateActiveFieldTelemetry(run);
  }

  getSpawnRevealBuffer(run = this.game.run) {
    const speed = Math.max(1, Number.isFinite(run?.currentSpeed)
      ? run.currentSpeed
      : getTrackCruiseSpeed(this.track || TRACKS[0], 0, this.getSpeedClassId()));
    return Math.max(
      SPAWN_VISIBILITY_CONFIG.revealBufferWorld,
      speed * SPAWN_VISIBILITY_CONFIG.revealBufferSeconds
    );
  }

  getMinimumSpawnAhead(run = this.game.run) {
    return VIEW_DISTANCE + this.getSpawnRevealBuffer(run);
  }

  isSectionTransitionGuardActive(run = this.game.run, section = null) {
    if (!run || !section || section.id === "launch") return false;
    const lastTransitionElapsed = Number.isFinite(run.lastSectionTransitionElapsed)
      ? run.lastSectionTransitionElapsed
      : -Infinity;
    const elapsedSinceTransition = Math.max(0, (run.elapsed || 0) - lastTransitionElapsed);
    return elapsedSinceTransition <= SPAWN_VISIBILITY_CONFIG.transitionGuardSeconds;
  }

  getSpawnSchedulePlan(run = this.game.run, track = this.track) {
    const progress = clamp((run?.distance || 0) / Math.max(1, track?.distanceToFinish || 1), 0, 1);
    const section = getTrackSection(track, progress);
    const launchPacing = this.director.getLaunchPacingConfig(this.getSpeedClassId(), section);
    const launchEndDistance = (track?.distanceToFinish || 0) * (section.id === "launch" ? section.endProgress : 1);
    const launchSpawnLimit = section.id === "launch"
      ? launchEndDistance + (launchPacing?.preloadBeyondLaunchDistance ?? LAUNCH_PACING_CONFIG.preloadBeyondLaunchDistance)
      : Infinity;
    const spawnLeadDistance = this.getSpawnLeadDistance(run, section);
    const revealBuffer = this.getSpawnRevealBuffer(run);
    const minimumSpawnAhead = VIEW_DISTANCE + revealBuffer;
    const minimumSpawnDistance = (run?.distance || 0) + minimumSpawnAhead;
    const spawnHorizon = Math.min((run?.distance || 0) + spawnLeadDistance, launchSpawnLimit);
    return {
      section,
      launchPacing,
      spawnLeadDistance,
      revealBuffer,
      minimumSpawnAhead,
      minimumSpawnDistance,
      spawnHorizon,
      launchSpawnLimit,
      transitionGuardActive: this.isSectionTransitionGuardActive(run, section),
      maxWavesPerFrame: SPAWN_VISIBILITY_CONFIG.maxWavesPerFrame
    };
  }

  getNextScheduledWaveSpacing(wave, spawnDistance) {
    const spawnProgress = spawnDistance / Math.max(1, this.track.distanceToFinish);
    const difficulty = this.track.difficultyCurve(spawnProgress);
    const cruiseSpeed = getTrackCruiseSpeed(this.track, spawnProgress, this.getSpeedClassId());
    const baseSpacing = this.getPatternSpacing(spawnProgress, difficulty, cruiseSpeed);
    const spacingMultiplier = this.director.getSpacingMultiplier(wave);
    const randomScale = this.director.getRandomSecondsScale(wave);
    const cadence = getTrackDirectorCadence(this.getSpeedClassId(), this.track);
    const randomSeconds = lerp(
      cadence.randomEarly ?? this.track.obstacleSettings.spacingRandomSecondsEarly ?? 0.7,
      cadence.randomLate ?? this.track.obstacleSettings.spacingRandomSecondsLate ?? 0.25,
      difficulty
    );
    return baseSpacing * spacingMultiplier + this.random() * cruiseSpeed * randomSeconds * randomScale;
  }

  getWaveMinimumGameplayAhead(wave, runDistance = this.game.run?.distance || 0) {
    const spawned = Array.isArray(wave?.spawned) ? wave.spawned : [];
    const gameplayAhead = spawned
      .filter((obstacle) => this.isGameplaySpawnObject(obstacle))
      .map((obstacle) => obstacle.distance - runDistance);
    return gameplayAhead.length ? Math.min(...gameplayAhead) : null;
  }

  chooseUnderActivityIntent(run, activity) {
    const sectionId = run?.currentSectionId || "";
    if (isFuelRunRaceType(run?.raceTypeId)) {
      const fuelLow = Boolean(run.lowFuelActive || run.criticalFuelActive);
      const gasDue = (run.timeSinceLastGasCan || 0) >= (run.targetGasGapSeconds || getFuelRunTuning(run.speedClassId).targetGasGapSeconds);
      if (fuelLow || gasDue) return "gasRoute";
    }
    if (activity?.visibleRewards + activity?.upcomingRewards <= 0 && sectionId === "breather") return "rewardTemptation";
    if ((this.track?.id || "") === "redline-run") return "forceLaneChange";
    if (sectionId === "finalPush") return "finalPushPressure";
    if (sectionId === "pressure") return "escalateSection";
    return "maintainPressure";
  }

  applyUnderActivityCorrection(run, plan, activity) {
    if (!run || !activity?.underActivity || activity.overDensity) return false;
    const elapsed = Number.isFinite(run.elapsed) ? run.elapsed : 0;
    const last = Number.isFinite(run.lastUnderActivityCorrectionElapsed)
      ? run.lastUnderActivityCorrectionElapsed
      : -Infinity;
    if (elapsed - last < ROAD_DIRECTOR_ACTIVITY_CONFIG.correctionCooldownSeconds) return false;
    const finishLimit = (this.track?.distanceToFinish || 0) - 650;
    const speed = Math.max(1, Number.isFinite(run.currentSpeed)
      ? run.currentSpeed
      : getTrackCruiseSpeed(this.track || TRACKS[0], 0, this.getSpeedClassId()));
    const targetDistance = Math.min(
      plan.spawnHorizon,
      Math.max(
        plan.minimumSpawnDistance,
        (run.distance || 0) + plan.minimumSpawnAhead + speed * ROAD_DIRECTOR_ACTIVITY_CONFIG.correctionLeadSeconds
      )
    );
    if (!Number.isFinite(targetDistance) || targetDistance >= finishLimit) return false;
    if (this.nextSpawnDistance <= targetDistance + 1) return false;
    this.nextSpawnDistance = targetDistance;
    run.underActivityCorrections = (run.underActivityCorrections || 0) + 1;
    run.lastUnderActivityCorrectionElapsed = elapsed;
    run.lastUnderActivityCorrectionReason = activity.status || "below activity floor";
    run.forceRoadDirectorIntent = this.chooseUnderActivityIntent(run, activity);
    run.forceRoadDirectorIntentReason = activity.status || "below activity floor";
    if (this.director?.stats) {
      this.director.stats.underActivityCorrections = (this.director.stats.underActivityCorrections || 0) + 1;
    }
    return true;
  }

  spawnScheduledWave(run = this.game.run, track = this.track) {
    if (!run || !track) return null;
    const plan = this.getSpawnSchedulePlan(run, track);
    const finishLimit = track.distanceToFinish - 650;
    let wavesSpawned = 0;
    let delayedForVisibility = false;

    if (this.nextSpawnDistance < plan.minimumSpawnDistance) {
      if (this.nextSpawnDistance <= plan.spawnHorizon + 1 && this.nextSpawnDistance < finishLimit) {
        run.popInPreventedCount = (run.popInPreventedCount || 0) + 1;
        delayedForVisibility = true;
      }
      this.nextSpawnDistance = plan.minimumSpawnDistance;
    }

    const fieldDelay = this.shouldDelayForActiveField(run);
    if (fieldDelay.delay && this.nextSpawnDistance <= plan.spawnHorizon + 1 && this.nextSpawnDistance < finishLimit) {
      this.nextSpawnDistance += this.getActiveFieldDelayDistance(run);
      run.activeFieldBudgetDelays = (run.activeFieldBudgetDelays || 0) + 1;
      run.overActivityDelays = (run.overActivityDelays || 0) + 1;
      run.lastActiveFieldBudgetReason = fieldDelay.reason;
      if (this.director?.stats) {
        this.director.stats.overActivityDelays = (this.director.stats.overActivityDelays || 0) + 1;
      }
      run.wavesSpawnedThisFrame = 0;
      run.maxWavesSpawnedInSingleFrame = Math.max(run.maxWavesSpawnedInSingleFrame || 0, 0);
      run.lastWaveDelayedForVisibleSafety = delayedForVisibility;
      return { ...plan, wavesSpawned: 0, delayedForVisibility, activeFieldDelayed: true };
    }

    const activity = this.getRoadActivitySnapshot(run, this.obstacles, run.distance || 0);
    const underActivityCorrected = this.applyUnderActivityCorrection(run, plan, activity);

    if (this.nextSpawnDistance <= plan.spawnHorizon + 1 && this.nextSpawnDistance < finishLimit) {
      const spawnDistance = this.nextSpawnDistance;
      const wave = this.spawnPattern(spawnDistance);
      wavesSpawned = 1;
      const minGameplayAhead = this.getWaveMinimumGameplayAhead(wave, run.distance || 0);
      if (minGameplayAhead !== null && minGameplayAhead <= VIEW_DISTANCE) {
        run.wavesSpawnedInsideVisibleCount = (run.wavesSpawnedInsideVisibleCount || 0) + 1;
      }
      run.lastWaveSpawnDistance = spawnDistance;
      run.lastWaveSpawnAhead = spawnDistance - (run.distance || 0);
      run.lastWaveSpawnSection = plan.section?.id || "";
      run.lastSpawnVisibleAhead = VIEW_DISTANCE;
      run.lastSpawnRevealBuffer = plan.revealBuffer;
      this.nextSpawnDistance += this.getNextScheduledWaveSpacing(wave, spawnDistance);
    }

    if (wavesSpawned >= plan.maxWavesPerFrame && this.nextSpawnDistance <= plan.spawnHorizon + 1 && this.nextSpawnDistance < finishLimit) {
      run.catchUpSpawnsBlockedCount = (run.catchUpSpawnsBlockedCount || 0) + 1;
    }

    run.wavesSpawnedThisFrame = wavesSpawned;
    run.maxWavesSpawnedInSingleFrame = Math.max(run.maxWavesSpawnedInSingleFrame || 0, wavesSpawned);
    run.lastWaveDelayedForVisibleSafety = delayedForVisibility;
    return { ...plan, wavesSpawned, delayedForVisibility, underActivityCorrected };
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

  getSpawnLeadDistance(run, sectionOverride = null) {
    const progress = clamp((run?.distance || 0) / Math.max(1, this.track?.distanceToFinish || 1), 0, 1);
    const section = sectionOverride || getTrackSection(this.track, progress);
    const launchPacing = this.director.getLaunchPacingConfig(this.getSpeedClassId(), section);
    let seconds = launchPacing?.spawnLeadSeconds ?? this.track.obstacleSettings.spawnLeadSeconds ?? 5;
    if (this.isSectionTransitionGuardActive(run, section)) {
      seconds = Math.min(seconds, SPAWN_VISIBILITY_CONFIG.transitionGuardSpawnLeadSeconds);
    }
    const speed = Math.max(1, Number.isFinite(run?.currentSpeed)
      ? run.currentSpeed
      : getTrackCruiseSpeed(this.track || TRACKS[0], progress, this.getSpeedClassId()));
    return Math.max(this.getMinimumSpawnAhead(run), speed * seconds);
  }

  getStartClearSeconds(run = this.game.run) {
    return START_CLEAR_CONFIG.clearSecondsByMode[normalizeSpeedClassId(run?.speedClassId, DEFAULT_SPEED_CLASS_ID)]
      ?? START_CLEAR_CONFIG.clearSecondsByMode[DEFAULT_SPEED_CLASS_ID];
  }

  getStartClearAheadDistance(run = this.game.run, track = this.track) {
    const speedClassId = normalizeSpeedClassId(run?.speedClassId, DEFAULT_SPEED_CLASS_ID);
    const startSpeed = Math.max(1, Number.isFinite(run?.currentSpeed) ? run.currentSpeed : getTrackCruiseSpeed(track || TRACKS[0], 0, speedClassId));
    const secondsDistance = startSpeed * this.getStartClearSeconds(run);
    const minimumVisible = VIEW_DISTANCE * START_CLEAR_CONFIG.minVisibleAheadRatio;
    const targetVisible = VIEW_DISTANCE * START_CLEAR_CONFIG.targetVisibleAheadRatio;
    const maximumVisible = VIEW_DISTANCE * START_CLEAR_CONFIG.maxVisibleAheadRatio;
    return clamp(Math.max(secondsDistance, targetVisible, minimumVisible), minimumVisible, maximumVisible);
  }

  getInitialSpawnDistance(track = this.track) {
    const run = this.game.run || {};
    return Math.max(track?.obstacleSettings?.firstObstacleAt || 0, this.getStartClearAheadDistance(run, track));
  }

  applyStartClearState() {
    const run = this.game.run;
    if (!run) return;
    const clearAhead = this.getStartClearAheadDistance(run, this.track);
    run.startClearSeconds = this.getStartClearSeconds(run);
    run.startClearAheadDistance = clearAhead;
    run.startClearUntilDistance = run.distance + clearAhead;
    run.startClearApplied = true;
    run.startClearRejectedObjects = 0;
  }

  violatesStartClearZone(candidate) {
    const run = this.game.run;
    if (!run || !run.startClearApplied || !this.isGameplaySpawnObject(candidate)) return false;
    if ((run.elapsed || 0) > START_CLEAR_CONFIG.enforceElapsedSeconds) return false;
    const boundary = run.startClearUntilDistance || (run.distance + (run.startClearAheadDistance || this.getStartClearAheadDistance(run, this.track)));
    return candidate.distance < boundary;
  }

  getStartClearStatus(run = this.game.run) {
    if (!run) {
      return {
        active: false,
        clearAheadDistance: 0,
        firstHardAhead: null,
        firstHardSeconds: null,
        rejected: 0
      };
    }
    const hardBlockers = this.obstacles
      .filter((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type) && !obstacle.hit && !obstacle.remove)
      .map((obstacle) => obstacle.distance - run.distance)
      .filter((ahead) => ahead > -120)
      .sort((a, b) => a - b);
    const firstHardAhead = hardBlockers.length ? hardBlockers[0] : null;
    return {
      active: (run.elapsed || 0) <= (run.startClearSeconds || this.getStartClearSeconds(run)),
      clearAheadDistance: run.startClearAheadDistance || this.getStartClearAheadDistance(run, this.track),
      firstHardAhead,
      firstHardSeconds: firstHardAhead === null || !(run.currentSpeed > 0) ? null : firstHardAhead / run.currentSpeed,
      rejected: run.startClearRejectedObjects || 0
    };
  }

  getSpeedClassId() {
    return this.game.run?.speedClassId || DEFAULT_SPEED_CLASS_ID;
  }

  getRaceTypeId() {
    return normalizeRaceTypeId(this.game.run?.raceTypeId, DEFAULT_RACE_TYPE_ID);
  }

  getActiveFieldBudget(run = this.game.run) {
    const speedClassId = normalizeSpeedClassId(run?.speedClassId, this.getSpeedClassId());
    const modeBudget = ACTIVE_FIELD_BUDGET_CONFIG[speedClassId] || ACTIVE_FIELD_BUDGET_CONFIG.default;
    const fuelBudget = isFuelRunRaceType(run?.raceTypeId) ? ACTIVE_FIELD_BUDGET_CONFIG.fuelRun : {};
    return {
      ...ACTIVE_FIELD_BUDGET_CONFIG.default,
      ...modeBudget,
      ...fuelBudget
    };
  }

  getActivityFloorBudget(run = this.game.run, section = null) {
    const base = this.getActiveFieldBudget(run);
    const track = this.track || run?.track || TRACKS[0];
    const progress = clamp((run?.distance || 0) / Math.max(1, track?.distanceToFinish || 1), 0, 1);
    const activeSection = section || getTrackSection(track, progress);
    const sectionActivity = ROAD_DIRECTOR_ACTIVITY_CONFIG.sectionMultipliers[activeSection?.id] || {};
    const minVisibleMeaningful = Math.max(
      1,
      Math.round((base.minVisibleMeaningful ?? 1) * (sectionActivity.min ?? 1))
    );
    const targetVisibleMeaningful = Math.max(
      minVisibleMeaningful,
      Math.round((base.targetVisibleMeaningful ?? minVisibleMeaningful) * (sectionActivity.target ?? 1))
    );
    const maxUpcomingDecisionGapSeconds = Math.max(
      0.8,
      (base.maxUpcomingDecisionGapSeconds ?? 2) * (sectionActivity.maxUpcomingDecisionGap ?? 1)
    );
    return {
      ...base,
      minVisibleMeaningful,
      targetVisibleMeaningful,
      maxUpcomingDecisionGapSeconds,
      deadScreenLimitSeconds: base.deadScreenLimitSeconds ?? maxUpcomingDecisionGapSeconds,
      lonelyObjectLimitSeconds: base.lonelyObjectLimitSeconds ?? Math.max(0.8, maxUpcomingDecisionGapSeconds * 0.65)
    };
  }

  canReachRoadObject(obstacle, run = this.game.run, runDistance = run?.distance || 0) {
    if (!obstacle || !run) return true;
    const ahead = obstacle.distance - runDistance;
    const speed = Math.max(1, Number.isFinite(run.currentSpeed)
      ? run.currentSpeed
      : getTrackCruiseSpeed(this.track || TRACKS[0], 0, this.getSpeedClassId()));
    const currentLane = Math.round(clamp(Number.isFinite(run.targetLane) ? run.targetLane : TRACK_DIRECTOR.centerLane, 0, LANES - 1));
    const lane = Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1));
    const playerAhead = this.getPlayerZoneAhead(runDistance);
    const timeToDecision = (ahead - playerAhead) / speed;
    const requiredSeconds = Math.abs(lane - currentLane) * INPUT_CONFIG.laneChangeDurationSeconds + 0.12;
    return timeToDecision >= requiredSeconds;
  }

  getMeaningfulRoadObjectInfo(obstacle, run = this.game.run, runDistance = run?.distance || 0) {
    if (!this.isGameplaySpawnObject(obstacle)) return null;
    const lane = Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1));
    if (HARD_VEHICLE_TYPES.has(obstacle.type)) {
      return { role: "hard blocker", weight: 1, lane };
    }
    if (MINOR_HAZARD_TYPES.has(obstacle.type)) {
      const intentional = Boolean(obstacle.waveType && obstacle.waveType !== "recoveryGap");
      return intentional ? { role: "intentional minor hazard", weight: 0.8, lane } : null;
    }
    if (obstacle.type === "gasCan" && isFuelRunRaceType(run?.raceTypeId)) {
      const freeCenter = lane === TRACK_DIRECTOR.centerLane && !(run?.lastVisibleHardBlockers > 0);
      return { role: freeCenter ? "free center gas" : "gas route", weight: freeCenter ? 0.35 : 1, lane };
    }
    if (obstacle.type === "boostPad") {
      if (!this.canReachRoadObject(obstacle, run, runDistance)) return null;
      return { role: "boost temptation", weight: 1, lane };
    }
    if (obstacle.type === "ramp") {
      const useful = obstacle.rampSolution || Boolean(this.getRampSolutionTarget(obstacle, this.obstacles));
      if (!useful || !this.canReachRoadObject(obstacle, run, runDistance)) return null;
      return { role: "ramp solution", weight: 1, lane };
    }
    return null;
  }

  getRoadActivitySnapshot(run = this.game.run, obstacles = this.obstacles, runDistance = run?.distance || 0) {
    const track = this.track || run?.track || TRACKS[0];
    const progress = clamp(runDistance / Math.max(1, track?.distanceToFinish || 1), 0, 1);
    const section = getTrackSection(track, progress);
    const budget = this.getActivityFloorBudget(run, section);
    const speed = Math.max(1, Number.isFinite(run?.currentSpeed)
      ? run.currentSpeed
      : getTrackCruiseSpeed(track, progress, this.getSpeedClassId()));
    const upcomingWindow = VIEW_DISTANCE + speed * ROAD_DIRECTOR_ACTIVITY_CONFIG.upcomingWindowSeconds;
    const density = this.getActiveFieldDensity(obstacles, runDistance);
    const records = [];
    let visibleMeaningfulObjects = 0;
    let upcomingMeaningfulObjects = 0;
    let visibleMeaningfulWeight = 0;
    let upcomingMeaningfulWeight = 0;
    let visibleRewards = 0;
    let upcomingRewards = 0;
    let visibleFreeCenterGas = 0;
    let firstMeaningfulAhead = null;
    const rewardLaneCounts = { center: 0, side: 0, left: 0, right: 0 };

    for (const obstacle of obstacles) {
      const ahead = obstacle.distance - runDistance;
      if (ahead <= -120 || ahead > upcomingWindow || obstacle.hit || obstacle.remove) continue;
      const info = this.getMeaningfulRoadObjectInfo(obstacle, run, runDistance);
      if (!info) continue;
      const visible = ahead <= VIEW_DISTANCE;
      const record = {
        type: obstacle.type,
        lane: info.lane,
        ahead,
        visible,
        role: info.role,
        weight: info.weight,
        waveType: obstacle.waveType || ""
      };
      records.push(record);
      if (firstMeaningfulAhead === null || ahead < firstMeaningfulAhead) firstMeaningfulAhead = ahead;
      if (visible) {
        visibleMeaningfulObjects += 1;
        visibleMeaningfulWeight += info.weight;
      } else {
        upcomingMeaningfulObjects += 1;
        upcomingMeaningfulWeight += info.weight;
      }
      if (ROAD_DIRECTOR_ACTIVITY_CONFIG.rewardRoles.includes(obstacle.type)) {
        const side = info.lane < TRACK_DIRECTOR.centerLane ? "left" : (info.lane > TRACK_DIRECTOR.centerLane ? "right" : "center");
        rewardLaneCounts[side] = (rewardLaneCounts[side] || 0) + 1;
        if (info.lane !== TRACK_DIRECTOR.centerLane) rewardLaneCounts.side = (rewardLaneCounts.side || 0) + 1;
        if (visible) visibleRewards += 1;
        else upcomingRewards += 1;
      }
      if (info.role === "free center gas" && visible) visibleFreeCenterGas += 1;
    }

    const nextMeaningfulDecisionSeconds = firstMeaningfulAhead === null
      ? null
      : Math.max(0, firstMeaningfulAhead / speed);
    const meaningfulTotal = visibleMeaningfulObjects + upcomingMeaningfulObjects;
    const activityWeight = visibleMeaningfulWeight + upcomingMeaningfulWeight * 0.72;
    const noMeaningfulActivity = activityWeight < ROAD_DIRECTOR_ACTIVITY_CONFIG.noActivityWeightThreshold;
    const lonelyDistantObject = visibleMeaningfulObjects === 1
      && upcomingMeaningfulObjects === 0
      && records.some((record) => record.visible && record.ahead >= VIEW_DISTANCE * ROAD_DIRECTOR_ACTIVITY_CONFIG.lonelyDistantAheadRatio);
    const lateDecision = nextMeaningfulDecisionSeconds === null
      || nextMeaningfulDecisionSeconds > budget.maxUpcomingDecisionGapSeconds;
    const underActivity = (
      visibleMeaningfulObjects < budget.minVisibleMeaningful
      || meaningfulTotal < budget.targetVisibleMeaningful
      || noMeaningfulActivity
      || lonelyDistantObject
      || lateDecision
    );
    const deadScreen = noMeaningfulActivity || (visibleMeaningfulObjects <= 1 && upcomingMeaningfulObjects === 0 && lateDecision);
    const overDensity = density.visibleHardBlockers >= budget.spawnDelayVisibleHardBlockers
      || density.tacticalHardBlockers >= budget.maxTacticalHardBlockers
      || density.hardBlockersNext3Seconds >= budget.maxHardBlockersNext3Seconds
      || density.visibleHardWaveOverlap > budget.maxVisibleHardWaveOverlap;
    const status = underActivity
      ? (deadScreen ? "dead-screen risk" : "below activity floor")
      : (overDensity ? "over-density risk" : "within activity floor");

    return {
      status,
      underActivity,
      deadScreen,
      overDensity,
      visibleMeaningfulObjects,
      upcomingMeaningfulObjects,
      targetVisibleMeaningful: budget.targetVisibleMeaningful,
      minVisibleMeaningful: budget.minVisibleMeaningful,
      activityWeight,
      visibleMeaningfulWeight,
      upcomingMeaningfulWeight,
      meaningfulTotal,
      visibleHardBlockers: density.visibleHardBlockers || 0,
      visibleRewards,
      upcomingRewards,
      visibleFreeCenterGas,
      activeFieldDensity: density,
      nextMeaningfulDecisionSeconds,
      maxUpcomingDecisionGapSeconds: budget.maxUpcomingDecisionGapSeconds,
      deadScreenLimitSeconds: budget.deadScreenLimitSeconds,
      lonelyObjectLimitSeconds: budget.lonelyObjectLimitSeconds,
      records,
      rewardLaneCounts
    };
  }

  getPlayerZoneAhead(runDistance = this.game.run?.distance || 0) {
    const renderer = this.game.renderer;
    const run = this.game.run || {};
    if (!renderer?.aheadForY) return VIEW_DISTANCE * 0.12;
    const playerYRatio = Number.isFinite(run.playerYRatio)
      ? clamp(run.playerYRatio, PLAYER_MIN_Y_RATIO, PLAYER_MAX_Y_RATIO)
      : PLAYER_START_Y_RATIO;
    return renderer.aheadForY(renderer.height * playerYRatio);
  }

  getHardBlockerRecords(obstacles = this.obstacles, runDistance = this.game.run?.distance || 0) {
    return obstacles
      .filter((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type) && !obstacle.hit && !obstacle.remove)
      .map((obstacle) => {
        const lanes = this.getWorldLaneCoverage(obstacle, 0.16);
        const laneCenter = Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1));
        return {
          obstacle,
          ahead: obstacle.distance - runDistance,
          lane: laneCenter,
          lanes: lanes.length ? lanes : [laneCenter],
          waveId: obstacle.waveId || `${obstacle.waveType || "unknown"}:${Math.round(obstacle.distance / 250) * 250}`
        };
      })
      .filter((record) => record.ahead > -260 && record.ahead <= VIEW_DISTANCE);
  }

  getActiveFieldDensity(obstacles = this.obstacles, runDistance = this.game.run?.distance || 0) {
    const run = this.game.run || {};
    const speed = Math.max(1, Number.isFinite(run.currentSpeed)
      ? run.currentSpeed
      : getTrackCruiseSpeed(this.track || TRACKS[0], clamp(runDistance / Math.max(1, this.track?.distanceToFinish || 1), 0, 1), this.getSpeedClassId()));
    const playerAhead = this.getPlayerZoneAhead(runDistance);
    const records = this.getHardBlockerRecords(obstacles, runDistance);
    const upperRoadHardBlockers = records.filter((record) => record.ahead > VIEW_DISTANCE * 0.66).length;
    const midRoadHardBlockers = records.filter((record) => record.ahead > VIEW_DISTANCE * 0.33 && record.ahead <= VIEW_DISTANCE * 0.66).length;
    const tacticalLimit = Math.min(VIEW_DISTANCE, playerAhead + speed * 3.5);
    const tacticalHardBlockers = records.filter((record) => record.ahead <= tacticalLimit).length;
    const hardBlockersNext3Seconds = records.filter((record) => record.ahead <= Math.min(VIEW_DISTANCE, playerAhead + speed * 3)).length;
    const hardBlockersNext5Seconds = records.filter((record) => record.ahead <= Math.min(VIEW_DISTANCE, playerAhead + speed * 5)).length;
    const sortedAhead = records.map((record) => record.ahead).sort((a, b) => a - b);
    let maxHardBlockersInTwoSeconds = 0;
    for (const ahead of sortedAhead) {
      const end = ahead + speed * 2;
      maxHardBlockersInTwoSeconds = Math.max(
        maxHardBlockersInTwoSeconds,
        sortedAhead.filter((value) => value >= ahead && value <= end).length
      );
    }
    let maxHardBlockersInThreeLaneNeighborhood = 0;
    for (let lane = 0; lane <= LANES - 3; lane += 1) {
      maxHardBlockersInThreeLaneNeighborhood = Math.max(
        maxHardBlockersInThreeLaneNeighborhood,
        records.filter((record) => record.lanes.some((item) => item >= lane && item <= lane + 2)).length
      );
    }
    const visibleHardWaveIds = new Set(records.map((record) => record.waveId).filter(Boolean));
    return {
      visibleHardBlockers: records.length,
      upperRoadHardBlockers,
      midRoadHardBlockers,
      tacticalHardBlockers,
      hardBlockersNext3Seconds,
      hardBlockersNext5Seconds,
      maxHardBlockersInTwoSeconds,
      maxHardBlockersInThreeLaneNeighborhood,
      visibleHardWaveOverlap: visibleHardWaveIds.size,
      records
    };
  }

  validateActiveFieldBudget(obstacles = this.obstacles, runDistance = this.game.run?.distance || 0, options = {}) {
    const run = this.game.run || {};
    const budget = this.getActiveFieldBudget(run);
    const density = this.getActiveFieldDensity(obstacles, runDistance);
    const route = density.visibleHardBlockers >= ACTIVE_FIELD_BUDGET_CONFIG.routeScanMinHardBlockers
      ? this.getRouteReadability(obstacles, runDistance)
      : { invalid: false, routeFailures: 0, worstSlice: null };
    const overVisible = density.visibleHardBlockers > budget.maxVisibleHardBlockers;
    const spikeAllowed = density.visibleHardBlockers <= budget.spikeVisibleHardBlockers
      && !route.invalid
      && density.maxHardBlockersInTwoSeconds <= budget.maxHardBlockersInTwoSeconds
      && density.maxHardBlockersInThreeLaneNeighborhood <= budget.maxHardBlockersInThreeLaneNeighborhood
      && density.visibleHardWaveOverlap <= budget.maxVisibleHardWaveOverlap;
    const invalid = (
      (overVisible && !spikeAllowed)
      || density.tacticalHardBlockers > budget.maxTacticalHardBlockers
      || density.hardBlockersNext3Seconds > budget.maxHardBlockersNext3Seconds
      || density.maxHardBlockersInTwoSeconds > budget.maxHardBlockersInTwoSeconds
      || density.maxHardBlockersInThreeLaneNeighborhood > budget.maxHardBlockersInThreeLaneNeighborhood
      || density.visibleHardWaveOverlap > budget.maxVisibleHardWaveOverlap
      || route.invalid
    );
    const reason = route.invalid
      ? "combined active-field route prevented"
      : (density.visibleHardWaveOverlap > budget.maxVisibleHardWaveOverlap
        ? "visible wave overlap budget prevented"
        : (density.maxHardBlockersInTwoSeconds > budget.maxHardBlockersInTwoSeconds
          ? "two-second hard-blocker budget prevented"
          : (density.maxHardBlockersInThreeLaneNeighborhood > budget.maxHardBlockersInThreeLaneNeighborhood
            ? "three-lane hard-blocker budget prevented"
            : "visible hard-blocker budget prevented")));
    return {
      invalid,
      reason,
      budget,
      density,
      route,
      activeFieldInvalid: invalid,
      activeFieldRouteInvalid: route.invalid
    };
  }

  shouldDelayForActiveField(run = this.game.run) {
    if (!run) return { delay: false, reason: "" };
    const budget = this.getActiveFieldBudget(run);
    const density = this.getActiveFieldDensity(this.obstacles, run.distance || 0);
    const route = density.visibleHardBlockers >= ACTIVE_FIELD_BUDGET_CONFIG.routeScanMinHardBlockers
      ? this.getRouteReadability(this.obstacles, run.distance || 0)
      : { invalid: false };
    const delay = density.visibleHardBlockers >= budget.spawnDelayVisibleHardBlockers
      || density.tacticalHardBlockers >= budget.maxTacticalHardBlockers
      || density.hardBlockersNext3Seconds >= budget.maxHardBlockersNext3Seconds
      || density.visibleHardWaveOverlap > budget.maxVisibleHardWaveOverlap
      || route.invalid;
    const reason = route.invalid
      ? "route closed"
      : (density.visibleHardWaveOverlap > budget.maxVisibleHardWaveOverlap
        ? "wave overlap"
        : (density.hardBlockersNext3Seconds >= budget.maxHardBlockersNext3Seconds
          ? "next3 hard budget"
          : "visible hard budget"));
    return { delay, reason, density, budget, route };
  }

  getActiveFieldDelayDistance(run = this.game.run) {
    const speed = Math.max(1, Number.isFinite(run?.currentSpeed)
      ? run.currentSpeed
      : getTrackCruiseSpeed(this.track || TRACKS[0], 0, this.getSpeedClassId()));
    return Math.max(520, speed * ACTIVE_FIELD_BUDGET_CONFIG.spawnDelaySeconds);
  }

  updateActiveFieldTelemetry(run = this.game.run) {
    if (!run) return;
    const density = this.getActiveFieldDensity(this.obstacles, run.distance || 0);
    const activity = this.getRoadActivitySnapshot(run, this.obstacles, run.distance || 0);
    run.lastVisibleHardBlockers = density.visibleHardBlockers;
    run.lastTacticalHardBlockers = density.tacticalHardBlockers;
    run.lastHardBlockersNext3Seconds = density.hardBlockersNext3Seconds;
    run.lastVisibleWaveOverlap = density.visibleHardWaveOverlap;
    run.maxVisibleHardBlockers = Math.max(run.maxVisibleHardBlockers || 0, density.visibleHardBlockers);
    run.maxUpperRoadHardBlockers = Math.max(run.maxUpperRoadHardBlockers || 0, density.upperRoadHardBlockers);
    run.maxMidRoadHardBlockers = Math.max(run.maxMidRoadHardBlockers || 0, density.midRoadHardBlockers);
    run.maxTacticalHardBlockers = Math.max(run.maxTacticalHardBlockers || 0, density.tacticalHardBlockers);
    run.maxHardBlockersNext3Seconds = Math.max(run.maxHardBlockersNext3Seconds || 0, density.hardBlockersNext3Seconds);
    run.maxHardBlockersInTwoSeconds = Math.max(run.maxHardBlockersInTwoSeconds || 0, density.maxHardBlockersInTwoSeconds);
    run.maxHardBlockersInThreeLaneNeighborhood = Math.max(run.maxHardBlockersInThreeLaneNeighborhood || 0, density.maxHardBlockersInThreeLaneNeighborhood);
    run.visibleWaveOverlapMax = Math.max(run.visibleWaveOverlapMax || 0, density.visibleHardWaveOverlap);
    run.lastVisibleMeaningfulObjects = activity.visibleMeaningfulObjects || 0;
    run.lastUpcomingMeaningfulObjects = activity.upcomingMeaningfulObjects || 0;
    run.lastVisibleMeaningfulTarget = activity.targetVisibleMeaningful || 0;
    run.lastRoadActivityFloorStatus = activity.status || "";
    run.lastDeadScreenRisk = Boolean(activity.deadScreen);
    run.lastUpcomingDecisionSeconds = Number.isFinite(activity.nextMeaningfulDecisionSeconds)
      ? activity.nextMeaningfulDecisionSeconds
      : null;
  }

  shouldSuppressSupportForDensity(candidate, existingObstacles = this.getSpawnValidationObstacles(candidate.distance)) {
    if (!["boostPad", "ramp", "gasCan"].includes(candidate.type)) return false;
    if (candidate.type === "ramp" && candidate.rampSolution) return false;
    const run = this.game.run || {};
    const budget = this.getActiveFieldBudget(run);
    const sampleDistance = Math.max(0, candidate.distance - VIEW_DISTANCE * 0.5);
    const density = this.getActiveFieldDensity(existingObstacles, sampleDistance);
    const route = density.visibleHardBlockers >= ACTIVE_FIELD_BUDGET_CONFIG.routeScanMinHardBlockers
      ? this.getRouteReadability(existingObstacles, sampleDistance)
      : { invalid: false };
    const suppressThreshold = Math.max(3, Math.floor(budget.maxVisibleHardBlockers * ACTIVE_FIELD_BUDGET_CONFIG.supportSuppressVisibleRatio));
    return route.invalid
      || density.visibleHardBlockers >= suppressThreshold
      || density.hardBlockersNext3Seconds >= budget.maxHardBlockersNext3Seconds
      || density.maxHardBlockersInTwoSeconds >= budget.maxHardBlockersInTwoSeconds;
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
    const cadence = getTrackDirectorCadence(this.getSpeedClassId(), this.track);
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
    if (this.violatesVisibleSpawnZone(candidate)) {
      if (this.game.run) this.game.run.popInPreventedCount = (this.game.run.popInPreventedCount || 0) + 1;
      this.preventedUnsafeSpawns += 1;
      this.lastSafetySummary = {
        canSpawn: false,
        invalid: false,
        maxBlocked: 0,
        reason: "visible spawn zone prevented pop-in"
      };
      this.recordRejectedSpawnTelemetry(this.lastSafetySummary, candidate);
      return null;
    }
    if (this.violatesStartClearZone(candidate)) {
      if (this.game.run) this.game.run.startClearRejectedObjects = (this.game.run.startClearRejectedObjects || 0) + 1;
      this.preventedUnsafeSpawns += 1;
      this.lastSafetySummary = {
        canSpawn: false,
        invalid: false,
        maxBlocked: 0,
        reason: "start-clear zone prevented low initial spawn"
      };
      this.recordRejectedSpawnTelemetry(this.lastSafetySummary, candidate);
      return null;
    }
    const spawnResult = this.canSpawnObstacle(candidate);
    if (spawnResult.canSpawn) {
      this.obstacles.push(candidate);
      if (this.isPartySeedLocked()) this.seedLockedSpawnObstacles.push({ ...candidate });
      if (spawnResult.maxBlocked >= 4) {
        this.lastFourLanePressureDistance = distance;
      }
      this.lastSafetySummary = spawnResult;
      const postSpawn = this.validateCompleteSafetyPattern(this.getSpawnValidationObstacles(candidate.distance), this.getSafetyRunDistance(candidate.distance));
      if (postSpawn.invalid) {
        candidate.remove = true;
        this.obstacles = this.obstacles.filter((obstacle) => obstacle !== candidate);
        this.seedLockedSpawnObstacles = this.seedLockedSpawnObstacles.filter((obstacle) => obstacle.id !== candidate.id);
        this.preventedUnsafeSpawns += 1;
        this.lastSafetySummary = {
          ...postSpawn,
          reason: postSpawn.activeFieldInvalid
            ? (postSpawn.activeFieldRouteInvalid ? "post-spawn combined active-field route prevented" : "post-spawn active-field density prevented")
            : (postSpawn.flatHardRowInvalid
              ? "post-spawn flat hard-blocker row prevented"
              : (postSpawn.routeInvalid
                ? "post-spawn unreadable route prevented"
                : (postSpawn.hardBlockerInvalid ? "post-spawn hard-blocker five-lane wall prevented" : "post-spawn five-lane wall prevented")))
        };
        this.recordRejectedSpawnTelemetry(this.lastSafetySummary, candidate);
        return null;
      }
      this.recordSpawnTelemetry(candidate);
      return candidate;
    }

    if (options.allowLaneAdjust !== false
      && !spawnResult.supportSuppressedByDensity
      && !spawnResult.activeFieldInvalid
      && this.isGameplaySpawnObject(candidate)
      && candidate.type !== "deer") {
      const lanes = shuffle([0, 1, 2, 3, 4].filter((item) => item !== lane), () => this.random());
      for (const alternateLane of lanes) {
        const adjusted = this.createObstacle(type, alternateLane, distance, options);
        const adjustedResult = this.canSpawnObstacle(adjusted);
        if (adjustedResult.canSpawn) {
          this.obstacles.push(adjusted);
          this.recordSpawnTelemetry(adjusted);
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
    this.recordRejectedSpawnTelemetry(spawnResult, candidate);
    return null;
  }

  recordSpawnTelemetry(obstacle) {
    const run = this.game.run;
    if (!run || !obstacle) return;
    if (obstacle.type === "barrier") {
      run.barrierCount = (run.barrierCount || 0) + 1;
    }
  }

  recordRejectedSpawnTelemetry(result, candidate = null) {
    const run = this.game.run;
    if (!run || !result) return;
    if (!Array.isArray(run.recentRoadDirectorRejections)) run.recentRoadDirectorRejections = [];
    run.recentRoadDirectorRejections.push({
      elapsed: Number.isFinite(run.elapsed) ? Number(run.elapsed.toFixed(2)) : 0,
      distance: Math.round(Number.isFinite(candidate?.distance) ? candidate.distance : (run.distance || 0)),
      type: candidate?.type || "unknown",
      lane: Number.isFinite(candidate?.lane) ? candidate.lane : null,
      waveType: candidate?.waveType || "unknown",
      waveLabel: candidate?.waveLabel || candidate?.waveType || "unknown",
      reason: result.reason || "rejected",
      activeFieldInvalid: Boolean(result.activeFieldInvalid),
      activeFieldRouteInvalid: Boolean(result.activeFieldRouteInvalid),
      routeInvalid: Boolean(result.routeInvalid),
      supportSuppressedByDensity: Boolean(result.supportSuppressedByDensity)
    });
    if (run.recentRoadDirectorRejections.length > 12) {
      run.recentRoadDirectorRejections.splice(0, run.recentRoadDirectorRejections.length - 12);
    }
    if (result.supportSuppressedByDensity) {
      run.supportObjectsSuppressedByDensity = (run.supportObjectsSuppressedByDensity || 0) + 1;
    }
    if (result.activeFieldInvalid) {
      run.activeFieldRejectedSpawns = (run.activeFieldRejectedSpawns || 0) + 1;
      run.lastActiveFieldBudgetReason = result.reason || "active-field budget prevented";
    }
    if (result.activeFieldRouteInvalid) {
      run.combinedRouteFailures = (run.combinedRouteFailures || 0) + 1;
    }
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
      allowFourLanePressure: Boolean(options.allowFourLanePressure),
      relativeSpeed: HARD_VEHICLE_TYPES.has(type) ? TRAFFIC_MOTION_CONFIG.vehicleRelativeSpeed : 0,
      rampTarget: Boolean(options.rampTarget),
      rampSolution: Boolean(options.rampSolution),
      solutionTargetDistance: Number.isFinite(options.solutionTargetDistance) ? options.solutionTargetDistance : null,
      solutionTargetType: options.solutionTargetType || "",
      solutionTargetId: options.solutionTargetId || "",
      solutionClearDistance: Number.isFinite(options.solutionClearDistance) ? options.solutionClearDistance : null,
      solutionLandingSafetyDistance: Number.isFinite(options.solutionLandingSafetyDistance) ? options.solutionLandingSafetyDistance : ROAD_READABILITY_CONFIG.rampLandingSafetyDistance,
      waveType: options.waveType || "",
      waveLabel: options.waveLabel || "",
      waveId: options.waveId || "",
      sectionId: options.sectionId || "",
      sectionLabel: options.sectionLabel || ""
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

  violatesVisibleSpawnZone(candidate) {
    const run = this.game.run;
    if (!run || !this.isGameplaySpawnObject(candidate)) return false;
    return candidate.distance - (run.distance || 0) <= VIEW_DISTANCE;
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
      heavy: 470,
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
    const projectedGap = (this.getObjectDistanceHalfSize(a.type, a) + this.getObjectDistanceHalfSize(b.type, b)) * 1.08;
    return Math.max(base + speedPadding, projectedGap);
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

  getBoxBlockedLanes(box, threshold) {
    const renderer = this.game.renderer;
    const lanes = [];
    for (let laneIndex = 0; laneIndex < LANES; laneIndex += 1) {
      const laneLeft = renderer.road.x + laneIndex * renderer.road.laneW;
      const laneRight = laneLeft + renderer.road.laneW;
      const overlap = segmentOverlap(box.x, box.x + box.w, laneLeft, laneRight);
      if (overlap >= threshold) lanes.push(laneIndex);
    }
    return lanes;
  }

  getHardBlockerLaneOccupancy(obstacles, runDistance = this.game.run.distance) {
    const renderer = this.game.renderer;
    const top = Math.max(renderer.road.y, renderer.height * HARD_BLOCKER_WALL_CONFIG.tacticalTopRatio);
    const bottom = Math.min(renderer.road.y + renderer.road.h, renderer.height * HARD_BLOCKER_WALL_CONFIG.tacticalBottomRatio);
    const slices = [];
    const boxRecords = [];
    let maxBlocked = 0;
    let worstSlice = null;
    let invalid = false;

    for (const obstacle of obstacles) {
      if (!HARD_VEHICLE_TYPES.has(obstacle.type) || obstacle.hit || obstacle.remove) continue;
      const info = OBSTACLE_INFO[obstacle.type];
      const box = renderer.getObstacleHitboxAt(obstacle, runDistance);
      if (!info || !box || box.y > bottom || box.y + box.h < top) continue;
      const threshold = this.getLaneBlockThreshold(info, box);
      const lanes = this.getBoxBlockedLanes(box, threshold);
      if (!lanes.length) continue;
      const boxAheadTop = renderer.aheadForY(box.y);
      const boxAheadBottom = renderer.aheadForY(box.y + box.h);
      boxRecords.push({
        obstacle,
        box,
        threshold,
        lanes,
        distanceMin: runDistance + Math.min(boxAheadTop, boxAheadBottom),
        distanceMax: runDistance + Math.max(boxAheadTop, boxAheadBottom)
      });
    }

    const makeBlocker = (record, lane) => ({
      id: record.obstacle.id,
      type: record.obstacle.type,
      lane,
      obstacleLane: record.obstacle.lane,
      distance: Math.round(record.obstacle.distance),
      wave: record.obstacle.waveType || "unknown",
      section: record.obstacle.sectionId || "unknown"
    });

    if (boxRecords.length < 4) {
      const lanes = new Set();
      const blockers = [];
      for (const record of boxRecords) {
        for (const lane of record.lanes) {
          lanes.add(lane);
          blockers.push(makeBlocker(record, lane));
        }
      }
      const blockedLanes = Array.from(lanes).sort((a, b) => a - b);
      const slice = blockedLanes.length ? {
        source: "visible",
        y: boxRecords.reduce((sum, record) => sum + record.box.y + record.box.h * 0.5, 0) / boxRecords.length,
        ahead: 0,
        distance: runDistance,
        lanes: blockedLanes,
        count: blockedLanes.length,
        blockers
      } : null;
      return {
        slices: slice ? [slice] : [],
        maxBlocked: slice ? slice.count : 0,
        worstSlice: slice,
        invalid: false
      };
    }

    const updateWorst = (slice) => {
      if (slice.count > 0) slices.push(slice);
      if (slice.count > maxBlocked) {
        maxBlocked = slice.count;
        worstSlice = slice;
      }
      if (slice.count >= LANES) {
        invalid = true;
        worstSlice = slice;
      }
    };

    for (let y = top; y <= bottom; y += HARD_BLOCKER_WALL_CONFIG.screenSlicePx) {
      const lanes = new Set();
      const blockers = [];
      for (const record of boxRecords) {
        if (y < record.box.y || y > record.box.y + record.box.h) continue;
        for (const lane of record.lanes) {
          lanes.add(lane);
          blockers.push(makeBlocker(record, lane));
        }
      }
      const blockedLanes = Array.from(lanes).sort((a, b) => a - b);
      updateWorst({
        source: "screen",
        y,
        ahead: renderer.aheadForY(y),
        distance: runDistance + renderer.aheadForY(y),
        lanes: blockedLanes,
        count: blockedLanes.length,
        blockers
      });
      if (invalid) break;
    }

    if (!invalid && boxRecords.length) {
      const boundaries = Array.from(new Set(boxRecords
        .flatMap((record) => [record.distanceMin, record.distanceMax])
        .map((value) => Math.round(value * 100) / 100)))
        .sort((a, b) => a - b);
      const sampleDistances = boundaries.slice();
      for (let i = 0; i < boundaries.length - 1; i += 1) {
        if (boundaries[i + 1] > boundaries[i]) {
          sampleDistances.push((boundaries[i] + boundaries[i + 1]) / 2);
        }
      }
      for (const distance of sampleDistances.sort((a, b) => a - b)) {
        const lanes = new Set();
        const blockers = [];
        for (const record of boxRecords) {
          if (distance < record.distanceMin || distance > record.distanceMax) continue;
          for (const lane of record.lanes) {
            lanes.add(lane);
            blockers.push(makeBlocker(record, lane));
          }
        }
        const blockedLanes = Array.from(lanes).sort((a, b) => a - b);
        updateWorst({
          source: "world",
          y: renderer.yForDistanceAt(distance, runDistance),
          ahead: distance - runDistance,
          distance,
          lanes: blockedLanes,
          count: blockedLanes.length,
          blockers
        });
        if (invalid) break;
      }
    }

    return { slices, maxBlocked, worstSlice, invalid };
  }

  getWorldLaneCoverage(obstacle, minOverlap = 0.18) {
    const bounds = this.getSpawnBounds(obstacle);
    if (!bounds) return [];
    const lanes = [];
    for (let lane = 0; lane < LANES; lane += 1) {
      const overlap = segmentOverlap(bounds.laneMin, bounds.laneMax, lane - 0.5, lane + 0.5);
      if (overlap >= minOverlap) lanes.push(lane);
    }
    return lanes;
  }

  getSameRowHardLimit(distance) {
    const progress = clamp(distance / Math.max(1, this.track?.distanceToFinish || 1), 0, 1);
    return progress < 0.2
      ? ROAD_READABILITY_CONFIG.sameRowOpeningHardLimit
      : ROAD_READABILITY_CONFIG.sameRowHardLimit;
  }

  getHardBlockerRowOccupancy(obstacles, options = {}) {
    const runDistance = Number.isFinite(options.runDistance)
      ? options.runDistance
      : (this.game.run?.distance || 0);
    const band = Number.isFinite(options.bandWorld)
      ? options.bandWorld
      : ROAD_READABILITY_CONFIG.sameRowBandWorld;
    const windowMin = runDistance + ROAD_READABILITY_CONFIG.routeNearDistance - band;
    const windowMax = runDistance + VIEW_DISTANCE * ROAD_READABILITY_CONFIG.routeLookaheadRatio + band;
    const records = obstacles
      .filter((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type) && !obstacle.hit && !obstacle.remove)
      .filter((obstacle) => obstacle.distance >= windowMin && obstacle.distance <= windowMax)
      .map((obstacle) => ({
        obstacle,
        lanes: this.getWorldLaneCoverage(obstacle, 0.16)
      }))
      .filter((record) => record.lanes.length);
    const sampleDistances = Array.from(new Set(records.map((record) => Math.round(record.obstacle.distance / 5) * 5))).sort((a, b) => a - b);
    const rows = [];
    let invalid = false;
    let maxBlocked = 0;
    let worstRow = null;
    let fourLaneRows = 0;
    let fiveLaneRows = 0;

    for (const sampleDistance of sampleDistances) {
      const lanes = new Set();
      const blockers = [];
      for (const record of records) {
        if (Math.abs(record.obstacle.distance - sampleDistance) > band * 0.5) continue;
        for (const lane of record.lanes) {
          lanes.add(lane);
          blockers.push({
            id: record.obstacle.id,
            type: record.obstacle.type,
            lane,
            obstacleLane: record.obstacle.lane,
            distance: Math.round(record.obstacle.distance),
            wave: record.obstacle.waveType || "unknown",
            section: record.obstacle.sectionId || "unknown"
          });
        }
      }
      const blockedLanes = Array.from(lanes).sort((a, b) => a - b);
      if (!blockedLanes.length) continue;
      const row = {
        source: "world-row",
        distance: sampleDistance,
        ahead: sampleDistance - runDistance,
        lanes: blockedLanes,
        count: blockedLanes.length,
        limit: this.getSameRowHardLimit(sampleDistance),
        blockers
      };
      rows.push(row);
      if (row.count > maxBlocked) {
        maxBlocked = row.count;
        worstRow = row;
      }
      if (row.count >= 4) fourLaneRows += 1;
      if (row.count >= 5) fiveLaneRows += 1;
      if (row.count > row.limit || row.count >= LANES) {
        invalid = true;
        worstRow = row;
        break;
      }
    }

    return {
      rows,
      invalid,
      maxBlocked,
      worstRow,
      flatRows: rows.filter((row) => row.count >= 3).length,
      fourLaneRows,
      fiveLaneRows
    };
  }

  isRampLandingRangeUnsafe(rampLane, targetDistance, obstacles, excluded = new Set()) {
    const landingStart = targetDistance;
    const landingEnd = landingStart + ROAD_READABILITY_CONFIG.rampLandingSafetyDistance;
    return obstacles.some((obstacle) => {
      if (excluded.has(obstacle) || obstacle.hit || obstacle.remove || !RAMP_LANDING_UNSAFE_TYPES.has(obstacle.type)) return false;
      if (obstacle.distance <= landingStart || obstacle.distance > landingEnd) return false;
      return this.getWorldLaneCoverage(obstacle, 0.16).includes(rampLane);
    });
  }

  hasRampPathCollectibleConflict(rampOrLane, rampDistance, targetDistance, obstacles = this.obstacles) {
    const rampLane = typeof rampOrLane === "object"
      ? Math.round(clamp(Number.isFinite(rampOrLane.laneFloat) ? rampOrLane.laneFloat : rampOrLane.lane, 0, LANES - 1))
      : Math.round(clamp(rampOrLane, 0, LANES - 1));
    const startDistance = typeof rampOrLane === "object" ? rampOrLane.distance : rampDistance;
    const targetEnd = Number.isFinite(targetDistance)
      ? targetDistance
      : (typeof rampOrLane === "object" && Number.isFinite(rampOrLane.solutionTargetDistance)
        ? rampOrLane.solutionTargetDistance
        : startDistance + ROAD_READABILITY_CONFIG.rampTargetMaxGap);
    const pathEnd = targetEnd + ROAD_READABILITY_CONFIG.rampPathCollectibleSafetyDistance;
    return obstacles.some((obstacle) => {
      if (obstacle === rampOrLane || obstacle.hit || obstacle.remove || !RAMP_PATH_COLLECTIBLE_TYPES.has(obstacle.type)) return false;
      if (obstacle.distance <= startDistance || obstacle.distance > pathEnd) return false;
      return this.getWorldLaneCoverage(obstacle, 0.16).includes(rampLane);
    });
  }

  isRampLandingUnsafe(ramp, obstacles) {
    const rampLane = Math.round(clamp(Number.isFinite(ramp.laneFloat) ? ramp.laneFloat : ramp.lane, 0, LANES - 1));
    const target = this.getRampSolutionTarget(ramp, obstacles);
    const targetDistance = Number.isFinite(target?.distance)
      ? target.distance
      : (Number.isFinite(ramp.solutionTargetDistance)
        ? ramp.solutionTargetDistance
        : ramp.distance + getRampTargetGap(ramp));
    return this.isRampLandingRangeUnsafe(rampLane, targetDistance, obstacles, new Set([ramp, target].filter(Boolean)));
  }

  getRampSolutionTarget(ramp, obstacles) {
    const rampLane = Math.round(clamp(Number.isFinite(ramp.laneFloat) ? ramp.laneFloat : ramp.lane, 0, LANES - 1));
    if (ramp.solutionTargetId) {
      const assigned = obstacles.find((obstacle) => obstacle.id === ramp.solutionTargetId && !obstacle.hit && !obstacle.remove) || null;
      if (assigned) return assigned;
    }
    const targetGap = getRampTargetGap(ramp);
    const clearDistance = Number.isFinite(ramp.solutionClearDistance)
      ? ramp.solutionClearDistance
      : getRampRequiredClearDistance(targetGap);
    const maxTargetGap = Math.min(
      ROAD_READABILITY_CONFIG.rampTargetMaxGap,
      Math.max(ROAD_READABILITY_CONFIG.rampTargetMinGap, clearDistance - ROAD_READABILITY_CONFIG.rampLandingSafetyDistance)
    );
    return obstacles.find((obstacle) => {
      if (obstacle === ramp || obstacle.hit || obstacle.remove || !RAMP_TARGET_TYPES.has(obstacle.type)) return false;
      const gap = obstacle.distance - ramp.distance;
      if (gap < ROAD_READABILITY_CONFIG.rampTargetMinGap || gap > maxTargetGap) return false;
      return this.getWorldLaneCoverage(obstacle, 0.16).includes(rampLane);
    }) || null;
  }

  getRampUsefulness(obstacles, runDistance = this.game.run.distance) {
    const ramps = obstacles.filter((obstacle) => {
      if (obstacle.type !== "ramp" || obstacle.hit || obstacle.remove) return false;
      const ahead = obstacle.distance - runDistance;
      return ahead > -260 && ahead < VIEW_DISTANCE + ROAD_READABILITY_CONFIG.rampTargetMaxGap;
    });
    const details = ramps.map((ramp) => {
      const target = this.getRampSolutionTarget(ramp, obstacles);
      const unsafeLanding = this.isRampLandingUnsafe(ramp, obstacles);
      const pathCollectibleConflict = this.hasRampPathCollectibleConflict(ramp, null, target?.distance, obstacles);
      const useful = Boolean(target) && !unsafeLanding && !pathCollectibleConflict;
      return {
        id: ramp.id,
        lane: Math.round(clamp(Number.isFinite(ramp.laneFloat) ? ramp.laneFloat : ramp.lane, 0, LANES - 1)),
        distance: Math.round(ramp.distance),
        wave: ramp.waveType || "unknown",
        useful,
        unsafeLanding,
        pathCollectibleConflict,
        clearDistance: Math.round(ramp.solutionClearDistance || getRampRequiredClearDistance(getRampTargetGap(ramp))),
        targetType: target?.type || "",
        targetDistance: target ? Math.round(target.distance) : null
      };
    });
    return {
      ramps: details,
      total: details.length,
      useful: details.filter((item) => item.useful).length,
      withoutUsefulTarget: details.filter((item) => !item.useful).length,
      unsafeLanding: details.filter((item) => item.unsafeLanding).length,
      pathCollectibleConflict: details.filter((item) => item.pathCollectibleConflict).length
    };
  }

  getRouteReadability(obstacles, runDistance = this.game.run.distance) {
    const start = runDistance + ROAD_READABILITY_CONFIG.routeNearDistance;
    const end = runDistance + VIEW_DISTANCE * ROAD_READABILITY_CONFIG.routeLookaheadRatio;
    const band = ROAD_READABILITY_CONFIG.routeBandWorld;
    const run = this.game.run || {};
    const renderer = this.game.renderer;
    const track = this.track || this.game.run?.track || TRACKS[0];
    const routeProgress = clamp(runDistance / Math.max(1, track.distanceToFinish), 0, 1);
    const routeSection = getTrackSection(track, routeProgress);
    const routeSpeedClassId = this.getSpeedClassId();
    const turboLaunchRoute = routeSection.id === "launch" && routeSpeedClassId === "turbo";
    const currentLane = Math.round(clamp(Number.isFinite(run.targetLane) ? run.targetLane : TRACK_DIRECTOR.centerLane, 0, LANES - 1));
    const currentSpeed = Math.max(1, Number.isFinite(run.currentSpeed) ? run.currentSpeed : getTrackCruiseSpeed(this.track || TRACKS[0], 0, this.getSpeedClassId()));
    let playerAhead = 0;
    if (renderer?.aheadForY) {
      const playerYRatio = Number.isFinite(run.playerYRatio)
        ? clamp(run.playerYRatio, PLAYER_MIN_Y_RATIO, PLAYER_MAX_Y_RATIO)
        : PLAYER_START_Y_RATIO;
      playerAhead = renderer.aheadForY(renderer.height * playerYRatio);
    }
    const records = obstacles
      .filter((obstacle) => this.isGameplaySpawnObject(obstacle))
      .filter((obstacle) => obstacle.distance >= start - band && obstacle.distance <= end + band)
      .map((obstacle) => ({
        obstacle,
        lanes: this.getWorldLaneCoverage(obstacle, 0.16),
        bounds: this.getSpawnBounds(obstacle)
      }))
      .filter((record) => record.lanes.length && record.bounds);
    const rampSolutions = obstacles
      .filter((obstacle) => obstacle.type === "ramp" && !obstacle.hit && !obstacle.remove)
      .filter((obstacle) => obstacle.distance >= start - ROAD_READABILITY_CONFIG.rampTargetMaxGap && obstacle.distance <= end)
      .map((ramp) => {
        const target = this.getRampSolutionTarget(ramp, obstacles);
        const targetGap = getRampTargetGap(ramp);
        const clearDistance = Number.isFinite(ramp.solutionClearDistance)
          ? ramp.solutionClearDistance
          : getRampClearDistanceForSpeed(currentSpeed, targetGap);
        return {
          lane: Math.round(clamp(Number.isFinite(ramp.laneFloat) ? ramp.laneFloat : ramp.lane, 0, LANES - 1)),
          start: ramp.distance + ROAD_READABILITY_CONFIG.rampTargetMinGap,
          end: target
            ? target.distance + 160
            : ramp.distance + Math.max(ROAD_READABILITY_CONFIG.rampTargetMinGap, clearDistance - ROAD_READABILITY_CONFIG.rampLandingSafetyDistance),
          unsafe: this.isRampLandingUnsafe(ramp, obstacles),
          pathCollectibleConflict: this.hasRampPathCollectibleConflict(ramp, null, target?.distance, obstacles)
        };
      })
      .filter((ramp) => !ramp.unsafe);
    const objectIsSolvedByRamp = (lane, distance, type) => RAMP_TARGET_TYPES.has(type) && rampSolutions.some((ramp) => (
      !ramp.pathCollectibleConflict && ramp.lane === lane && distance >= ramp.start && distance <= ramp.end
    ));
    const sampleDistances = [];
    for (let distance = start; distance <= end; distance += band) {
      sampleDistances.push(distance);
    }
    for (const record of records) {
      sampleDistances.push(record.obstacle.distance);
    }
    const uniqueSamples = Array.from(new Set(sampleDistances.map((value) => Math.round(value / 10) * 10))).sort((a, b) => a - b);
    let routeFailures = 0;
    let minorOnlyOpenLaneEvents = 0;
    let timingRouteFailures = 0;
    let worstSlice = null;

    for (const sampleDistance of uniqueSamples) {
      const hardLanes = new Set();
      const minorLanes = new Set();
      const blockers = [];
      for (const record of records) {
        if (Math.abs(record.obstacle.distance - sampleDistance) > band * 0.5) continue;
        if (HARD_VEHICLE_TYPES.has(record.obstacle.type)) {
          for (const lane of record.lanes) {
            if (!objectIsSolvedByRamp(lane, record.obstacle.distance, record.obstacle.type)) {
              hardLanes.add(lane);
            }
          }
          blockers.push({
            type: record.obstacle.type,
            lane: record.obstacle.lane,
            distance: Math.round(record.obstacle.distance),
            hard: true,
            wave: record.obstacle.waveType || "unknown"
          });
        } else if (MINOR_HAZARD_TYPES.has(record.obstacle.type)) {
          for (const lane of record.lanes) {
            if (!objectIsSolvedByRamp(lane, record.obstacle.distance, record.obstacle.type)) {
              minorLanes.add(lane);
            }
          }
          blockers.push({
            type: record.obstacle.type,
            lane: record.obstacle.lane,
            distance: Math.round(record.obstacle.distance),
            hard: false,
            wave: record.obstacle.waveType || "unknown"
          });
        }
      }
      const openLanes = [];
      const clearLanes = [];
      for (let lane = 0; lane < LANES; lane += 1) {
        if (!hardLanes.has(lane)) {
          openLanes.push(lane);
          if (!minorLanes.has(lane)) clearLanes.push(lane);
        }
      }
      const timeToPlayerZone = (sampleDistance - runDistance - playerAhead) / currentSpeed;
      const reachableClearLanes = clearLanes.filter((lane) => {
        const laneSteps = Math.abs(lane - currentLane);
        const neededSeconds = laneSteps * INPUT_CONFIG.laneChangeDurationSeconds + ROAD_READABILITY_CONFIG.routeTimingBufferSeconds;
        return timeToPlayerZone >= neededSeconds;
      });
      const onlyOpenLaneCluttered = openLanes.length > 0
        && openLanes.length <= 1
        && openLanes.every((lane) => minorLanes.has(lane));
      const denseEscapeCluttered = hardLanes.size >= 3
        && openLanes.length <= 2
        && openLanes.length > 0
        && openLanes.every((lane) => minorLanes.has(lane));
      const noReadableRoute = hardLanes.size >= 3 && clearLanes.length === 0;
      const noReachableTimedRoute = hardLanes.size >= 3
        && clearLanes.length > 0
        && timeToPlayerZone > 0
        && timeToPlayerZone <= ROAD_READABILITY_CONFIG.routeTimingLookaheadSeconds
        && reachableClearLanes.length === 0;
      const earlyTurboLaunchPinch = turboLaunchRoute
        && hardLanes.size >= 2
        && timeToPlayerZone > 0
        && timeToPlayerZone <= 3.2
        && hardLanes.has(currentLane)
        && (hardLanes.has(currentLane - 1) || hardLanes.has(currentLane + 1))
        && reachableClearLanes.length <= 1;
      if (onlyOpenLaneCluttered || denseEscapeCluttered) {
        minorOnlyOpenLaneEvents += 1;
      }
      if (noReachableTimedRoute || earlyTurboLaunchPinch) {
        timingRouteFailures += 1;
      }
      if (noReadableRoute || denseEscapeCluttered || noReachableTimedRoute || earlyTurboLaunchPinch) {
        routeFailures += 1;
        worstSlice = {
          source: "route",
          distance: sampleDistance,
          ahead: sampleDistance - runDistance,
          hardLanes: Array.from(hardLanes).sort((a, b) => a - b),
          minorLanes: Array.from(minorLanes).sort((a, b) => a - b),
          openLanes,
          clearLanes,
          reachableClearLanes,
          currentLane,
          timeToPlayerZone,
          blockers
        };
        break;
      }
    }

    return {
      invalid: routeFailures > 0,
      routeFailures,
      minorOnlyOpenLaneEvents,
      timingRouteFailures,
      worstSlice
    };
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

  validateCompleteSafetyPattern(obstacles, runDistance = this.game.run.distance) {
    const allObjects = this.getDangerZoneLaneOccupancy(obstacles, runDistance);
    const hardBlockers = this.getHardBlockerLaneOccupancy(obstacles, runDistance);
    const hardRows = this.getHardBlockerRowOccupancy(obstacles, { runDistance });
    const route = this.getRouteReadability(obstacles, runDistance);
    const activeField = this.validateActiveFieldBudget(obstacles, runDistance);
    return {
      ...allObjects,
      invalid: allObjects.invalid || hardBlockers.invalid || hardRows.invalid || route.invalid || activeField.invalid,
      allObjectInvalid: allObjects.invalid,
      hardBlockerInvalid: hardBlockers.invalid,
      flatHardRowInvalid: hardRows.invalid,
      routeInvalid: route.invalid,
      activeFieldInvalid: activeField.invalid,
      activeFieldRouteInvalid: activeField.activeFieldRouteInvalid,
      maxHardBlocked: hardBlockers.maxBlocked,
      maxSameRowHardBlockers: hardRows.maxBlocked,
      maxActiveVisibleHardBlockers: activeField.density?.visibleHardBlockers || 0,
      maxActiveTacticalHardBlockers: activeField.density?.tacticalHardBlockers || 0,
      maxActiveHardBlockersNext3Seconds: activeField.density?.hardBlockersNext3Seconds || 0,
      maxActiveWaveOverlap: activeField.density?.visibleHardWaveOverlap || 0,
      worstHardBlockerSlice: hardBlockers.worstSlice,
      worstHardRow: hardRows.worstRow,
      worstActiveField: activeField.invalid ? activeField : null,
      routeFailures: route.routeFailures,
      minorOnlyOpenLaneEvents: route.minorOnlyOpenLaneEvents,
      worstRouteSlice: route.worstSlice,
      hardBlockers,
      hardRows,
      route,
      activeField
    };
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
      if (this.shouldSuppressSupportForDensity(candidateObstacle, existingObstacles)) {
        return {
          canSpawn: false,
          invalid: false,
          maxBlocked: 0,
          supportSuppressedByDensity: true,
          reason: `${candidateObstacle.type} suppressed by active-field density`
        };
      }
      return { canSpawn: true, maxBlocked: 0, invalid: false, reason: "non-blocker" };
    }
    const scan = this.scanCandidateSafety(candidateObstacle, existingObstacles);
    if (scan.invalid) {
      const reason = scan.activeFieldInvalid
        ? (scan.activeFieldRouteInvalid ? "combined active-field route prevented" : "active visible hard-blocker budget prevented")
        : (scan.flatHardRowInvalid
          ? "flat hard-blocker row prevented"
          : (scan.routeInvalid
            ? "unreadable route prevented"
            : (scan.hardBlockerInvalid ? "hard-blocker five-lane wall prevented" : "five-lane wall prevented")));
      return { ...scan, canSpawn: false, reason };
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
    let start = Math.max(this.getSafetyRunDistance(minDistance), minDistance - aheadTop - 180);
    let end = maxDistance - aheadBottom + 180;
    const sampleStep = clamp(VIEW_DISTANCE * (4 / renderer.road.h), 22, 48);
    const pattern = existingObstacles.concat(candidateObstacles);
    const shouldScanHardBlockers = candidateObstacles.some((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type))
      && pattern.filter((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type) && !obstacle.hit && !obstacle.remove).length >= LANES;
    const shouldScanHardRows = candidateObstacles.some((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type))
      && pattern.filter((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type) && !obstacle.hit && !obstacle.remove).length >= 2;
    const shouldScanRoute = candidateObstacles.some((obstacle) => this.isFairnessBlocker(obstacle))
      && pattern.filter((obstacle) => this.isFairnessBlocker(obstacle)).length >= 3;
    const shouldScanActiveField = candidateObstacles.some((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type) || this.isFairnessBlocker(obstacle))
      && pattern.filter((obstacle) => HARD_VEHICLE_TYPES.has(obstacle.type) && !obstacle.hit && !obstacle.remove).length >= 3;
    if (shouldScanActiveField) {
      start = Math.min(start, Math.max(this.getSafetyRunDistance(minDistance), minDistance - VIEW_DISTANCE - 180));
      end = Math.max(end, maxDistance + 260);
    }
    let maxBlocked = 0;
    let maxHardBlocked = 0;
    let maxSameRowHardBlockers = 0;
    let worst = null;
    let worstHardBlocker = null;
    let worstHardRow = null;
    let worstRoute = null;
    let invalid = false;
    let allObjectInvalid = false;
    let hardBlockerInvalid = false;
    let flatHardRowInvalid = false;
    let routeInvalid = false;
    let activeFieldInvalid = false;
    let activeFieldRouteInvalid = false;
    let routeFailures = 0;
    let minorOnlyOpenLaneEvents = 0;
    let routeScannedAcrossSlices = false;
    let maxActiveVisibleHardBlockers = 0;
    let maxActiveTacticalHardBlockers = 0;
    let maxActiveHardBlockersNext3Seconds = 0;
    let maxActiveWaveOverlap = 0;
    let worstActiveField = null;

    for (let runDistance = start; runDistance <= end; runDistance += sampleStep) {
      const result = this.validateObstaclePattern(pattern, runDistance);
      const hardBlockers = shouldScanHardBlockers
        ? this.getHardBlockerLaneOccupancy(pattern, runDistance)
        : { invalid: false, maxBlocked: 0, worstSlice: null };
      const activeField = shouldScanActiveField
        ? this.validateActiveFieldBudget(pattern, runDistance)
        : { invalid: false, activeFieldRouteInvalid: false, density: null, route: null, reason: "" };
      const hardRows = { invalid: false, maxBlocked: 0, worstRow: null };
      const route = shouldScanRoute
        ? this.getRouteReadability(pattern, runDistance)
        : { invalid: false, routeFailures: 0, minorOnlyOpenLaneEvents: 0, worstSlice: null };
      if (shouldScanRoute) {
        routeScannedAcrossSlices = true;
        routeFailures += route.routeFailures || 0;
        minorOnlyOpenLaneEvents += route.minorOnlyOpenLaneEvents || 0;
        if (route.worstSlice) {
          worstRoute = {
            runDistance,
            slice: route.worstSlice
          };
        }
      }
      if (result.maxBlocked > maxBlocked) {
        maxBlocked = result.maxBlocked;
        worst = {
          runDistance,
          slice: result.worstSlice
        };
      }
      if (hardBlockers.maxBlocked > maxHardBlocked) {
        maxHardBlocked = hardBlockers.maxBlocked;
        worstHardBlocker = {
          runDistance,
          slice: hardBlockers.worstSlice
        };
      }
      if (activeField.density) {
        maxActiveVisibleHardBlockers = Math.max(maxActiveVisibleHardBlockers, activeField.density.visibleHardBlockers || 0);
        maxActiveTacticalHardBlockers = Math.max(maxActiveTacticalHardBlockers, activeField.density.tacticalHardBlockers || 0);
        maxActiveHardBlockersNext3Seconds = Math.max(maxActiveHardBlockersNext3Seconds, activeField.density.hardBlockersNext3Seconds || 0);
        maxActiveWaveOverlap = Math.max(maxActiveWaveOverlap, activeField.density.visibleHardWaveOverlap || 0);
      }
      if (result.invalid) {
        invalid = true;
        allObjectInvalid = true;
        worst = {
          runDistance,
          slice: result.worstSlice
        };
      }
      if (hardBlockers.invalid) {
        invalid = true;
        hardBlockerInvalid = true;
        worstHardBlocker = {
          runDistance,
          slice: hardBlockers.worstSlice
        };
      }
      if (route.invalid) {
        invalid = true;
        routeInvalid = true;
      }
      if (activeField.invalid) {
        invalid = true;
        activeFieldInvalid = true;
        activeFieldRouteInvalid = Boolean(activeField.activeFieldRouteInvalid);
        worstActiveField = {
          runDistance,
          reason: activeField.reason,
          density: activeField.density,
          route: activeField.route
        };
      }
      if (invalid) {
        break;
      }
    }

    const readabilityRunDistance = Math.max(
      this.getSafetyRunDistance(minDistance),
      minDistance - VIEW_DISTANCE * 0.52
    );

    if (!invalid && shouldScanHardRows) {
      const hardRows = this.getHardBlockerRowOccupancy(pattern, { runDistance: readabilityRunDistance });
      if (hardRows.maxBlocked > maxSameRowHardBlockers) {
        maxSameRowHardBlockers = hardRows.maxBlocked;
        worstHardRow = {
          runDistance: readabilityRunDistance,
          row: hardRows.worstRow
        };
      }
      if (hardRows.invalid) {
        invalid = true;
        flatHardRowInvalid = true;
        worstHardRow = {
          runDistance: readabilityRunDistance,
          row: hardRows.worstRow
        };
      }
    }

    if (!invalid && shouldScanRoute && !routeScannedAcrossSlices) {
      const route = this.getRouteReadability(pattern, readabilityRunDistance);
      routeFailures += route.routeFailures || 0;
      minorOnlyOpenLaneEvents += route.minorOnlyOpenLaneEvents || 0;
      if (route.worstSlice) {
        worstRoute = {
          runDistance: readabilityRunDistance,
          slice: route.worstSlice
        };
      }
      if (route.invalid) {
        invalid = true;
        routeInvalid = true;
      }
    }

    return {
      invalid,
      allObjectInvalid,
      hardBlockerInvalid,
      flatHardRowInvalid,
      routeInvalid,
      activeFieldInvalid,
      activeFieldRouteInvalid,
      maxBlocked,
      maxHardBlocked,
      maxSameRowHardBlockers,
      maxActiveVisibleHardBlockers,
      maxActiveTacticalHardBlockers,
      maxActiveHardBlockersNext3Seconds,
      maxActiveWaveOverlap,
      routeFailures,
      minorOnlyOpenLaneEvents,
      worst,
      worstHardBlocker,
      worstHardRow,
      worstRoute,
      worstActiveField
    };
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
        if (result === "airborne-pass") {
          this.resolveAirbornePass(obstacle, info);
          continue;
        }
        if (obstacle.type === "gasCan") {
          this.game.collectGasCan(obstacle);
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

  shouldAirborneClear(obstacle) {
    return Boolean(this.game.run.airborne && RAMP_CLEARABLE_TYPES.has(obstacle.type));
  }

  getCollisionResult(obstacle, info) {
    if (this.shouldAirborneClear(obstacle, info)) return "airborne-pass";
    if (info.crash) return "crash";
    if (obstacle.type === "gasCan") return "collect";
    if (obstacle.type === "oil") return "oil";
    if (obstacle.type === "ramp") return "ramp";
    if (obstacle.type === "boostPad") return "boost";
    return "slowdown";
  }

  resolveAirbornePass(obstacle, info) {
    obstacle.hit = true;
    obstacle.remove = true;
    this.game.recordRampAirbornePass(obstacle, info);
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
      this.game.queueCrashImpact(info.label);
      return;
    }

    if (obstacle.type === "ramp") {
      run.rampsUsed += 1;
      this.game.launchJump(obstacle);
      this.game.addScoreEvent("ramp", 80);
      this.game.audio.playSfx("ramp", {
        cooldownMs: 0,
        maxInstances: 1,
        volume: this.game.audio.sfxVolume * 0.92
      });
      return;
    }

    if (obstacle.type === "boostPad") {
      run.boostPadsCollected += 1;
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
    const roadWidth = Math.min(this.width * CAMERA_CONFIG.roadWidthRatio, CAMERA_CONFIG.roadMaxWidth);
    const minTop = this.height < 620 ? CAMERA_CONFIG.compactRoadTopMargin : CAMERA_CONFIG.roadTopMargin;
    this.road = {
      x: (this.width - roadWidth) / 2,
      y: minTop,
      w: roadWidth,
      h: Math.max(1, this.height - minTop - CAMERA_CONFIG.roadBottomMargin),
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
    const t = this.getProjectedRoadTForAhead(ahead);
    return this.road.y + this.road.h * t;
  }

  aheadForY(y) {
    const projectedT = clamp((y - this.road.y) / this.road.h, 0, 1);
    const linearT = Math.pow(projectedT, 1 / this.getGameplayProjectionStrength());
    return (1 - linearT) * VIEW_DISTANCE;
  }

  getProjectedRoadTForAhead(ahead) {
    const linearT = 1 - clamp(ahead / VIEW_DISTANCE, 0, 1);
    return Math.pow(linearT, this.getGameplayProjectionStrength());
  }

  getGameplayProjectionStrength() {
    return Math.max(0.01, CAMERA_CONFIG.gameplayProjectionStrength || 1);
  }

  scaleForY(y) {
    const t = clamp((y - this.road.y) / this.road.h, 0, 1);
    const perspective = Math.pow(t, Math.max(0.01, CAMERA_CONFIG.scalePerspectiveStrength || CAMERA_CONFIG.perspectiveStrength || 1));
    return lerp(CAMERA_CONFIG.farScale, CAMERA_CONFIG.nearScale, perspective);
  }

  projectionPixelsPerWorldAtY(y) {
    const projectedT = clamp((y - this.road.y) / this.road.h, 0, 1);
    const strength = this.getGameplayProjectionStrength();
    const linearT = Math.max(0.0001, Math.pow(projectedT, 1 / strength));
    return (this.road.h * strength * Math.pow(linearT, strength - 1)) / VIEW_DISTANCE;
  }

  getMotionZoneForY(y) {
    const t = clamp((y - this.road.y) / Math.max(1, this.road.h), 0, 1);
    if (t < 0.34) return "top";
    if (t < 0.72) return "middle";
    return "player zone";
  }

  getProjectionMotionSamples(speed) {
    const sampleYs = [
      this.road.y + this.road.h * 0.18,
      this.road.y + this.road.h * 0.5,
      this.getPlayerScreenY()
    ];
    return sampleYs.map((y) => ({
      zone: this.getMotionZoneForY(y),
      y,
      ahead: this.aheadForY(y),
      scale: this.scaleForY(y),
      pixelsPerSecond: Math.max(0, speed) * this.projectionPixelsPerWorldAtY(y)
    }));
  }

  getSampleObstacleMotionDebug(run = this.game.run) {
    if (!run) return null;
    const previousRunDistance = Math.max(0, (run.distance || 0) - (run.lastDistanceDelta || 0));
    const candidates = this.game.obstacles.obstacles
      .filter((obstacle) => this.game.obstacles.isGameplaySpawnObject(obstacle))
      .map((obstacle) => ({
        obstacle,
        ahead: obstacle.distance - run.distance
      }))
      .filter((item) => item.ahead > -120 && item.ahead < VIEW_DISTANCE + 220)
      .sort((a, b) => Math.abs(a.ahead - this.aheadForY(this.getPlayerScreenY())) - Math.abs(b.ahead - this.aheadForY(this.getPlayerScreenY())));
    if (!candidates.length) return null;
    const obstacle = candidates[0].obstacle;
    const current = this.getObstacleScreenPositionAt(obstacle, run.distance);
    const previous = this.getObstacleScreenPositionAt(obstacle, previousRunDistance);
    const dt = Math.max(0.001, this.game.lastDt || 0.001);
    return {
      type: obstacle.type,
      lane: Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1)),
      ahead: obstacle.distance - run.distance,
      y: current.y,
      previousY: previous.y,
      pixelsPerSecond: (current.y - previous.y) / dt,
      zone: this.getMotionZoneForY(current.y),
      scale: current.scale,
      wave: obstacle.waveType || "unknown"
    };
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
    const baseWidth = config ? getConfiguredVehicleWidth(config, this.road.laneW, getCameraVehicleScaleMultiplier()) : info.w;
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
      const drawScale = scale * getCameraHazardScaleMultiplier(type);
      return {
        w: info.w * drawScale,
        h: info.h * drawScale,
        drawScale
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
    const theme = this.getCurrentTrackVisualTheme();
    const glowStrength = clamp(TRACK_VISUALS.horizonGlowStrength * clamp(visualIntensity, 0.78, 1.28), 0.45, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.skyTop || "#100c2b");
    sky.addColorStop(0.26, theme.skyMid || "#2c0d46");
    sky.addColorStop(0.44, theme.skyHorizon || "#5a1943");
    sky.addColorStop(0.58, theme.skyBottom || "#171224");
    sky.addColorStop(1, "#05050a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const horizonY = Math.max(235, Math.min(h * 0.46, this.road.y + this.road.h * 0.42));
    const sunY = Math.min(horizonY - 72, h * 0.27);
    const sunR = Math.min(132, w * 0.17);
    const sunAlpha = clampNumber(theme.sunAlpha, 0, 1, 1);
    if (sunAlpha > 0.01) {
      const sun = ctx.createRadialGradient(w * 0.5, sunY, 10, w * 0.5, sunY, sunR);
      sun.addColorStop(0, `rgba(255, 228, 94, ${0.95 * glowStrength * sunAlpha})`);
      sun.addColorStop(0.42, `rgba(255, 130, 75, ${0.66 * glowStrength * sunAlpha})`);
      sun.addColorStop(1, "rgba(255, 63, 209, 0)");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(w * 0.5, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();
    }

    const horizonGlow = ctx.createRadialGradient(w * 0.5, horizonY, 4, w * 0.5, horizonY, Math.max(w * 0.28, 320));
    horizonGlow.addColorStop(0, `rgba(255, 148, 72, ${0.42 * glowStrength})`);
    horizonGlow.addColorStop(0.38, `rgba(255, 63, 209, ${0.17 * glowStrength})`);
    horizonGlow.addColorStop(1, "rgba(40, 246, 255, 0)");
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - 180, w, 360);
    if (theme.horizonGlow) {
      ctx.globalAlpha = glowStrength;
      ctx.fillStyle = theme.horizonGlow;
      ctx.fillRect(0, horizonY - 132, w, 264);
      ctx.globalAlpha = 1;
    }

    this.drawHorizonSilhouettes(horizonY);
    if (theme.citySkyline) this.drawTrackCitySkyline(horizonY, theme);

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

  drawTrackCitySkyline(horizonY, theme) {
    const ctx = this.ctx;
    const w = this.width;
    const baseY = horizonY + 38;
    ctx.save();
    ctx.fillStyle = theme.skylineColor || "rgba(4, 5, 12, 0.92)";
    for (let i = 0; i < 34; i += 1) {
      const segment = w / 34;
      const x = i * segment - 4 + deterministicNoise(i, 41) * 8;
      const buildingW = segment * lerp(0.52, 1.1, deterministicNoise(i, 42));
      const height = lerp(36, 132, deterministicNoise(i, 43));
      ctx.fillRect(x, baseY - height, buildingW, height);
      if (deterministicNoise(i, 44) > 0.72) {
        ctx.fillRect(x + buildingW * 0.45, baseY - height - 18, Math.max(2, buildingW * 0.1), 18);
      }
      if (deterministicNoise(i, 45) > 0.55) {
        ctx.fillStyle = theme.cityWindowColor || "rgba(255, 45, 85, 0.42)";
        const windowCount = Math.floor(2 + deterministicNoise(i, 46) * 5);
        for (let j = 0; j < windowCount; j += 1) {
          const wy = baseY - height + 14 + j * 16;
          if (wy < baseY - 5) ctx.fillRect(x + buildingW * 0.36, wy, Math.max(2, buildingW * 0.08), 3);
        }
        ctx.fillStyle = theme.skylineColor || "rgba(4, 5, 12, 0.92)";
      }
    }
    ctx.globalAlpha = 0.48;
    ctx.strokeStyle = theme.edgeColor || "#ff2d55";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      const y = baseY - 18 - i * 28;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + Math.sin(i) * 8);
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

  getCurrentTrackVisualTheme() {
    const run = this.game.run;
    const track = (this.game.screen === "game" || this.game.screen === "score")
      ? run?.track
      : getTrackById(this.game.pendingTrackId || DEFAULT_TRACK_ID);
    return getTrackVisualTheme(track || TRACKS[0]);
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
    const theme = this.getCurrentTrackVisualTheme();
    const sceneryDensity = (TRACK_VISUALS.sceneryDensity || 1) * clampNumber(theme.sceneryDensity, 0.3, 1.4, 1);
    const spacing = TRACK_VISUALS.scenerySpacing / Math.max(0.55, sceneryDensity);
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

      if (theme.urbanScenery) {
        if (typeRoll < 0.34) {
          this.drawRedlineChevronSign(x, y, scale, side, signRoll);
        } else if (typeRoll < 0.62) {
          this.drawRoadsideBillboard(x, y, scale, side, signRoll < TRACK_VISUALS.roadsideSignFrequency * 1.8 ? (theme.roadsidePrimaryLabel || "REDLINE") : "");
        } else if (typeRoll < 0.82) {
          const secondary = Array.isArray(theme.roadsideSecondaryLabels) && theme.roadsideSecondaryLabels.length
            ? theme.roadsideSecondaryLabels
            : ["GATE", "FAST"];
          this.drawNeonMileSign(x, y, scale, side, secondary[signRoll < 0.5 ? 0 : Math.min(1, secondary.length - 1)]);
        } else {
          this.drawUrbanBarrierBlock(x, y, scale, side, theme);
        }
      } else if (typeRoll < 0.42) {
        this.drawPalmSilhouette(x, y, scale, side);
      } else if (typeRoll < 0.68) {
        this.drawRoadsideBillboard(x, y, scale, side, signRoll < TRACK_VISUALS.roadsideSignFrequency ? (theme.roadsidePrimaryLabel || "SUNSET") : "");
      } else if (typeRoll < 0.82) {
        const secondary = Array.isArray(theme.roadsideSecondaryLabels) && theme.roadsideSecondaryLabels.length
          ? theme.roadsideSecondaryLabels
          : ["GAS", "EAT"];
        this.drawNeonMileSign(x, y, scale, side, secondary[signRoll < 0.5 ? 0 : Math.min(1, secondary.length - 1)]);
      } else {
        this.drawLowDesertRock(x, y, scale, warmth);
      }
    }

    const parallaxScroll = (scrollSource * (0.12 + speedRatio * 0.07)) % 120;
    ctx.globalAlpha = alpha * 0.16;
    ctx.strokeStyle = theme.guardrailColor || "#28f6ff";
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

  drawRedlineChevronSign(x, y, scale, side, roll = 0) {
    const ctx = this.ctx;
    const w = 72 * scale;
    const h = 32 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(3, 4, 12, 0.86)";
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = roll > 0.42 ? "#ff2d55" : "#ff7a2d";
    ctx.shadowBlur = 14 * scale;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.strokeRect(-w / 2, -h, w, h);
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const cx = -w * 0.28 + i * w * 0.25;
      ctx.moveTo(cx - side * 7 * scale, -h * 0.72);
      ctx.lineTo(cx + side * 7 * scale, -h * 0.5);
      ctx.lineTo(cx - side * 7 * scale, -h * 0.28);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (roll > 0.72) {
      ctx.fillStyle = "#f6fbff";
      ctx.font = `800 ${Math.max(7, 8 * scale)}px Trebuchet MS, Verdana, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("REDLINE", 0, -h * 0.5);
    }
    ctx.restore();
  }

  drawUrbanBarrierBlock(x, y, scale, side, theme = {}) {
    const ctx = this.ctx;
    const w = 64 * scale;
    const h = 34 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(4, 5, 12, 0.9)";
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, 0);
    ctx.lineTo(-w * 0.42, -h * 0.72);
    ctx.lineTo(w * 0.36, -h);
    ctx.lineTo(w * 0.5, -h * 0.18);
    ctx.lineTo(w * 0.42, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.74;
    ctx.strokeStyle = theme.guardrailColor || "#ff2d55";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.42);
    ctx.lineTo(w * 0.24, -h * 0.64);
    ctx.moveTo(-w * 0.22, -h * 0.16);
    ctx.lineTo(w * 0.34, -h * 0.32);
    ctx.stroke();
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
    const shake = Math.max(run.crashFlash || 0, run.screenShake || 0) * ARCADE_FEEL.screenShakeIntensity;
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
    this.drawRampLaunchPulse();
    this.drawRampClearSpark();
    this.drawRampLandingSpark();
    this.drawNearMissSpark();
    this.drawPlayer();
    this.drawCrashSparks();
    this.drawBumpFlash();
    if (this.game.debugMode) this.drawHitboxOverlay();
    ctx.restore();
    this.drawBoostFlash();
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
    const theme = this.getCurrentTrackVisualTheme();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.roadOuter || "#161722";
    ctx.fillRect(road.x, road.y, road.w, road.h);
    ctx.fillStyle = theme.roadInner || "#10111a";
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
    ctx.shadowColor = theme.edgeColor || "#28f6ff";
    ctx.strokeStyle = theme.edgeColor || "#28f6ff";
    ctx.lineWidth = 4 + Math.max(0, visualIntensity - 1) * 1.5;
    ctx.beginPath();
    ctx.moveTo(road.x, road.y);
    ctx.lineTo(road.x, road.y + road.h);
    ctx.moveTo(road.x + road.w, road.y);
    ctx.lineTo(road.x + road.w, road.y + road.h);
    ctx.stroke();
    this.drawRoadEdgeDetails(scrollSource, alpha);
    if (theme.tunnelPanels) this.drawTrackTunnelPanels(scrollSource, alpha, theme);

    const dashHeight = 56;
    const gap = 46;
    const scroll = (scrollSource * SPEED_TUNING.roadStripeScrollScale) % (dashHeight + gap);
    const lanePulse = 0.94 + Math.sin(scrollSource * 0.018) * 0.06 * clamp((visualIntensity - 0.8) / 0.55, 0, 1);
    ctx.globalAlpha = alpha * clamp(visualIntensity * lanePulse, 0.78, 1.24);
    for (let lane = 1; lane < LANES; lane += 1) {
      const x = road.x + lane * road.laneW;
      ctx.shadowColor = lane % 2 ? (theme.laneSecondary || "#ff3fd1") : (theme.lanePrimary || "#ffe45e");
      ctx.strokeStyle = lane % 2 ? (theme.laneSecondary || "#ff3fd1") : (theme.lanePrimary || "#ffe45e");
      ctx.lineWidth = theme.sharpLaneMarkers ? 3.8 : 3;
      for (let y = road.y - dashHeight + scroll; y < road.y + road.h + dashHeight; y += dashHeight + gap) {
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
    const theme = this.getCurrentTrackVisualTheme();
    const intensity = TRACK_VISUALS.roadDetailIntensity * clampNumber(theme.roadDetailIntensity, 0.2, 1.4, 1) * alpha * clamp(visualIntensity, 0.78, 1.18);
    const bandSpacing = TRACK_VISUALS.asphaltBandSpacing;
    const seamSpacing = TRACK_VISUALS.roadSeamSpacing;
    const bandScroll = (scrollSource * 0.28) % bandSpacing;
    const seamScroll = (scrollSource * 0.62) % seamSpacing;
    const speedRatio = this.getVisualSpeedRatio();

    ctx.save();
    ctx.globalAlpha = intensity;
    for (let y = road.y - bandSpacing + bandScroll; y < road.y + road.h + bandSpacing; y += bandSpacing) {
      const shade = ctx.createLinearGradient(0, y, 0, y + 22);
      shade.addColorStop(0, "rgba(255, 255, 255, 0.035)");
      shade.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = shade;
      ctx.fillRect(road.x + 14, y, road.w - 28, 22);
    }

    ctx.globalAlpha = intensity * 0.42;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    for (let y = road.y - seamSpacing + seamScroll; y < road.y + road.h + seamSpacing; y += seamSpacing) {
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
      laneGlow.addColorStop(0.5, lane % 2 ? (theme.laneSecondary || "rgba(255, 63, 209, 0.035)") : (theme.lanePrimary || "rgba(255, 228, 94, 0.025)"));
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
    const theme = this.getCurrentTrackVisualTheme();
    const lightSpacing = TRACK_VISUALS.edgeLightSpacing;
    const reflectorSpacing = TRACK_VISUALS.reflectorSpacing;
    const lightScroll = (scrollSource * (0.72 + speedRatio * 0.42) * clamp(visualIntensity, 0.92, 1.12)) % lightSpacing;
    const reflectorScroll = (scrollSource * 0.58) % reflectorSpacing;

    ctx.save();
    ctx.globalAlpha = alpha * 0.85 * clamp(visualIntensity, 0.78, 1.18);
    for (let y = road.y - lightSpacing + lightScroll; y < road.y + road.h + lightSpacing; y += lightSpacing) {
      const t = clamp((y - road.y) / Math.max(1, road.h), 0, 1);
      const size = lerp(3, 7, t);
      const color = Math.floor(y / lightSpacing) % 2 ? (theme.edgeAltColor || "#ff3fd1") : (theme.edgeColor || "#28f6ff");
      ctx.shadowBlur = 12 * visualIntensity;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(road.x - 14, y, size, size * 2.3);
      ctx.fillRect(road.x + road.w + 14 - size, y, size, size * 2.3);
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.42;
    ctx.fillStyle = theme.reflectorColor || "#ffe45e";
    for (let y = road.y - reflectorSpacing + reflectorScroll; y < road.y + road.h + reflectorSpacing; y += reflectorSpacing) {
      ctx.fillRect(road.x + 10, y, 5, 16);
      ctx.fillRect(road.x + road.w - 15, y, 5, 16);
    }
    ctx.restore();
  }

  drawTrackTunnelPanels(scrollSource, alpha, theme = {}) {
    const ctx = this.ctx;
    const road = this.road;
    const speedRatio = this.getVisualSpeedRatio();
    const visualIntensity = this.getRaceVisualIntensity();
    const panelSpacing = 118;
    const scroll = (scrollSource * (0.82 + speedRatio * 0.58)) % panelSpacing;
    const chevronColor = theme.chevronColor || "#ff2d55";
    ctx.save();
    ctx.globalAlpha = alpha * clamp(0.42 + speedRatio * 0.32, 0.42, 0.84);
    ctx.strokeStyle = theme.guardrailColor || chevronColor;
    ctx.shadowBlur = 14 * visualIntensity;
    ctx.shadowColor = chevronColor;
    ctx.lineWidth = 2;
    for (let y = road.y - panelSpacing + scroll; y < road.y + road.h + panelSpacing; y += panelSpacing) {
      const t = clamp((y - road.y) / Math.max(1, road.h), 0, 1);
      const inset = lerp(44, 18, t);
      const panelH = lerp(38, 70, t);
      ctx.beginPath();
      ctx.moveTo(road.x - inset, y);
      ctx.lineTo(road.x - inset - 28, y + panelH * 0.5);
      ctx.lineTo(road.x - inset, y + panelH);
      ctx.moveTo(road.x + road.w + inset, y);
      ctx.lineTo(road.x + road.w + inset + 28, y + panelH * 0.5);
      ctx.lineTo(road.x + road.w + inset, y + panelH);
      ctx.stroke();
      if (theme.redlineChevrons) {
        ctx.fillStyle = chevronColor;
        ctx.globalAlpha = alpha * lerp(0.28, 0.7, t);
        ctx.fillRect(road.x - inset - 5, y + panelH * 0.24, 5, panelH * 0.5);
        ctx.fillRect(road.x + road.w + inset, y + panelH * 0.24, 5, panelH * 0.5);
        ctx.globalAlpha = alpha * clamp(0.42 + speedRatio * 0.32, 0.42, 0.84);
      }
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
    const theme = this.getCurrentTrackVisualTheme();
    ctx.save();
    ctx.globalAlpha = alpha * glowIntensity * 0.22;
    const glow = ctx.createLinearGradient(0, road.y, 0, road.y + road.h);
    glow.addColorStop(0, "rgba(255, 228, 94, 0)");
    glow.addColorStop(0.6, theme.speedStreakColor || "rgba(255, 95, 68, 0.24)");
    glow.addColorStop(1, theme.edgeAltColor || "rgba(255, 63, 209, 0.12)");
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
    const theme = this.getCurrentTrackVisualTheme();
    const postH = 104 * scale;
    const topY = y - postH;
    const leftX = road.x - 38 * scale;
    const rightX = road.x + road.w + 38 * scale;
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.shadowBlur = 22;
    ctx.shadowColor = theme.edgeColor || "#ffe45e";
    ctx.strokeStyle = theme.edgeColor || "#ffe45e";
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
    ctx.strokeStyle = theme.edgeAltColor || "#28f6ff";
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeRect(leftX + 12 * scale, topY - 20 * scale, rightX - leftX - 24 * scale, 36 * scale);
    ctx.fillStyle = "#f6fbff";
    ctx.font = `900 ${Math.max(12, 18 * scale)}px Trebuchet MS, Verdana, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(theme.finishLabel || "SUNSET", road.x + road.w / 2, topY - 2 * scale);
    for (let i = 0; i < 6; i += 1) {
      const x = lerp(leftX + 38 * scale, rightX - 38 * scale, i / 5);
      ctx.fillStyle = i % 2 ? (theme.edgeAltColor || "#ff3fd1") : (theme.reflectorColor || "#44ff99");
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
      drawDeer(ctx, x, y, obstacle.direction, drawScale);
    } else if (obstacle.type === "cone") {
      drawCone(ctx, x, y, drawScale);
    } else if (obstacle.type === "oil") {
      drawOilSlick(ctx, x, y, drawScale);
    } else if (obstacle.type === "ramp") {
      drawRamp(ctx, x, y, drawScale);
    } else if (obstacle.type === "boostPad") {
      drawBoostPad(ctx, x, y, drawScale);
    } else if (obstacle.type === "gasCan") {
      drawGasCan(ctx, x, y, drawScale);
    } else if (obstacle.type === "barrier") {
      drawBarrier(ctx, x, y, drawScale);
    } else if (obstacle.type === "branch") {
      drawBranch(ctx, x, y, drawScale);
    } else if (obstacle.type === "warning") {
      drawRoadSign(ctx, x, y, obstacle.warningType || "work", drawScale);
    }
  }

  drawPlayer() {
    const run = this.game.run;
    const x = this.laneCenter(run.renderLaneFloat);
    const y = this.getPlayerScreenY();
    const landingDuration = ARCADE_FEEL.rampLandingPulseMs / 1000;
    const boostTrailDuration = ARCADE_FEEL.boostTrailPunchMs / 1000;
    const landingPulse = landingDuration > 0 ? clamp((run.rampLandingPulseTimer || 0) / landingDuration, 0, 1) : 0;
    const boostTrailPunch = boostTrailDuration > 0 ? clamp((run.boostTrailPunchTimer || 0) / boostTrailDuration, 0, 1) : 0;
    drawPlayerCar(this.ctx, x, y, run.player.car, {
      boosting: run.boostTimer > 0 || run.padBoostTimer > 0,
      airborne: run.airborne,
      airborneLift: run.jumpOffset || 0,
      landingPulse,
      boostTrailIntensity: run.boostTimer > 0 ? 0.74 + boostTrailPunch * 0.38 : (run.padBoostTimer > 0 ? 0.58 : 0),
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
    const hardBlockers = this.game.obstacles.getHardBlockerLaneOccupancy(this.game.obstacles.obstacles, this.game.run.distance);
    const hardRows = this.game.obstacles.getHardBlockerRowOccupancy(this.game.obstacles.obstacles, { runDistance: this.game.run.distance });
    const route = this.game.obstacles.getRouteReadability(this.game.obstacles.obstacles, this.game.run.distance);
    const alert = occupancy.maxBlocked >= 5 || hardBlockers.maxBlocked >= 5 || hardRows.invalid || route.invalid;
    const warning = occupancy.maxBlocked >= 4 || hardBlockers.maxBlocked >= 4 || hardRows.maxBlocked >= 3 || route.minorOnlyOpenLaneEvents > 0;
    const run = this.game.run;
    if (hardBlockers.invalid && run) {
      const lastLog = run.lastHardBlockerWallLogDistance ?? -Infinity;
      if (Math.abs(run.distance - lastLog) >= HARD_BLOCKER_WALL_CONFIG.debugLogDistanceGap) {
        run.lastHardBlockerWallLogDistance = run.distance;
        console.warn("Neon Road Rally debug hard-blocker wall", {
          seed: run.roadSeed,
          raceType: run.raceTypeId,
          speedClass: run.speedClassId,
          distance: Math.round(run.distance),
          slice: hardBlockers.worstSlice
        });
      }
    }

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
    ctx.fillStyle = hardBlockers.maxBlocked >= 5 ? "#ff3b58" : (hardBlockers.maxBlocked >= 4 ? "#ffe45e" : "#44ff99");
    ctx.fillText(`HARD BLOCKERS max ${hardBlockers.maxBlocked}`, this.road.x + 8, top + 30);
    ctx.fillStyle = hardRows.invalid ? "#ff3b58" : (hardRows.maxBlocked >= 3 ? "#ffe45e" : "#44ff99");
    ctx.fillText(`HARD ROW max ${hardRows.maxBlocked}`, this.road.x + 8, top + 46);
    ctx.fillStyle = route.invalid ? "#ff3b58" : (route.minorOnlyOpenLaneEvents > 0 ? "#ffe45e" : "#44ff99");
    ctx.fillText(`ROUTE fail ${route.routeFailures}`, this.road.x + 8, top + 62);

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
    for (const slice of hardBlockers.slices) {
      if (slice.count < 4) continue;
      const sliceColor = slice.count >= 5 ? "#ff3b58" : "#ffe45e";
      ctx.strokeStyle = sliceColor;
      ctx.globalAlpha = slice.count >= 5 ? 1 : 0.78;
      ctx.lineWidth = slice.source === "world" ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(this.road.x, slice.y);
      ctx.lineTo(this.road.x + this.road.w, slice.y);
      ctx.stroke();
      for (const lane of slice.lanes) {
        ctx.fillStyle = sliceColor;
        ctx.globalAlpha = slice.count >= 5 ? 0.48 : 0.3;
        ctx.fillRect(this.road.x + lane * this.road.laneW + 8, slice.y - 7, this.road.laneW - 16, 14);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = sliceColor;
      ctx.fillText(`H${slice.count}`, this.road.x + this.road.w + 28, slice.y);
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
    const theme = this.getCurrentTrackVisualTheme();
    const boostPunchDuration = ARCADE_FEEL.boostStreakPunchMs / 1000;
    const boostPunch = boostPunchDuration > 0 ? clamp((run.boostStreakPunchTimer || 0) / boostPunchDuration, 0, 1) : 0;
    const intensity = (run.boostTimer > 0 ? 0.42 : (run.padBoostTimer > 0 ? 0.32 : (sectionEnergy ? 0.14 : 0.18)))
      * TRACK_VISUALS.speedStreakIntensity
      * clampNumber(theme.speedStreakIntensity, 0.4, 1.8, 1)
      * (1 + finalStretch * 0.25)
      * clamp(visualIntensity, 0.8, 1.35)
      * (1 + boostPunch * 0.55);
    const lineCount = Math.round((run.boostTimer > 0 ? 34 : (run.padBoostTimer > 0 ? 24 : (sectionEnergy ? 18 : 16))) * (0.85 + speedRatio * 0.35) * clamp(visualIntensity, 0.92, 1.18) * (1 + boostPunch * 0.38));
    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.strokeStyle = boosting ? (theme.boostStreakColor || "#28f6ff") : (theme.speedStreakColor || "#f6fbff");
    ctx.lineWidth = boosting ? 2.5 + boostPunch * 1.2 : 1.5;
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
    const burstColor = getCarBoostTrailColor(run.player.car);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 24;
    ctx.shadowColor = burstColor;
    ctx.strokeStyle = burstColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, rearY, burstW, burstH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.45;
    ctx.fillStyle = shade(burstColor, 54);
    ctx.beginPath();
    ctx.moveTo(x - burstW * 0.34, rearY);
    ctx.lineTo(x, rearY + size.h * 0.36);
    ctx.lineTo(x + burstW * 0.34, rearY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawBoostFlash() {
    const run = this.game.run;
    const duration = ARCADE_FEEL.boostFlashMs / 1000;
    if (!ARCADE_FEEL.enabled || duration <= 0 || run.boostFlashTimer <= 0) return;
    const progress = 1 - run.boostFlashTimer / duration;
    const alpha = (1 - progress) * 0.2;
    const { x, y } = this.getPlayerFloatingAnchor();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#28f6ff";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#28f6ff";
    ctx.beginPath();
    ctx.ellipse(x, y, this.road.laneW * lerp(0.48, 1.05, progress), 44 + progress * 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.42;
    ctx.fillStyle = "#28f6ff";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  drawRampClearSpark() {
    const run = this.game.run;
    const duration = ARCADE_FEEL.rampClearSparkMs / 1000;
    if (!ARCADE_FEEL.enabled || duration <= 0 || run.rampClearSparkTimer <= 0) return;
    const progress = 1 - run.rampClearSparkTimer / duration;
    const alpha = (1 - progress) * 0.76;
    const { x, y } = this.getPlayerFloatingAnchor();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#f6fbff";
    ctx.fillStyle = "#ffe45e";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffe45e";
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + progress * 0.7;
      const radius = 24 + progress * 36;
      const sx = x + Math.cos(angle) * radius;
      const sy = y - 18 + Math.sin(angle) * radius * 0.55;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2 + (i % 2) * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawRampLaunchPulse() {
    const run = this.game.run;
    const duration = ARCADE_FEEL.rampLaunchPulseMs / 1000;
    if (!ARCADE_FEEL.enabled || duration <= 0 || run.rampLaunchPulseTimer <= 0) return;
    const progress = 1 - run.rampLaunchPulseTimer / duration;
    const alpha = (1 - progress) * 0.52;
    const { x, y } = this.getPlayerFloatingAnchor();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ffe45e";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffe45e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 26, this.road.laneW * lerp(0.18, 0.48, progress), lerp(8, 24, progress), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawRampLandingSpark() {
    const run = this.game.run;
    const duration = ARCADE_FEEL.rampLandingPulseMs / 1000;
    if (!ARCADE_FEEL.enabled || duration <= 0 || run.rampLandingPulseTimer <= 0) return;
    const progress = 1 - run.rampLandingPulseTimer / duration;
    const alpha = (1 - progress) * 0.58;
    const { x, y } = this.getPlayerFloatingAnchor();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ffe45e";
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ffe45e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 34, this.road.laneW * lerp(0.26, 0.58, progress), lerp(8, 18, progress), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f6fbff";
    for (let i = 0; i < 5; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const sx = x + side * (18 + i * 5) + (Math.random() - 0.5) * 5;
      const sy = y + 36 + Math.random() * 9;
      ctx.fillRect(sx, sy, 3, 3);
    }
    ctx.restore();
  }

  drawNearMissSpark() {
    const run = this.game.run;
    const duration = ARCADE_FEEL.nearMissSparkMs / 1000;
    if (!ARCADE_FEEL.enabled || duration <= 0 || run.nearMissSparkTimer <= 0) return;
    const progress = 1 - run.nearMissSparkTimer / duration;
    const alpha = (1 - progress) * 0.62;
    const { x, y } = this.getPlayerFloatingAnchor();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#28f6ff";
    ctx.shadowBlur = 13;
    ctx.shadowColor = "#28f6ff";
    ctx.lineWidth = 2;
    const side = Math.sin((run.nearMisses || 1) * 2.4) >= 0 ? 1 : -1;
    for (let i = 0; i < 4; i += 1) {
      const sx = x + side * (this.road.laneW * 0.38 + i * 7);
      const sy = y - 42 + i * 18 + progress * 18;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + side * (20 + progress * 12), sy - 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCrashSparks() {
    const run = this.game.run;
    const duration = ARCADE_FEEL.crashSparkMs / 1000;
    if (!ARCADE_FEEL.enabled || duration <= 0 || run.crashSparkTimer <= 0) return;
    const progress = 1 - run.crashSparkTimer / duration;
    const alpha = (1 - progress) * 0.88;
    const { x, y } = this.getPlayerFloatingAnchor();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ff3b58";
    ctx.fillStyle = "#ffe45e";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ff3b58";
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      const start = 18 + (i % 3) * 5;
      const end = start + 24 + progress * 34;
      const sx = x + Math.cos(angle) * start;
      const sy = y + Math.sin(angle) * start * 0.65;
      const ex = x + Math.cos(angle) * end;
      const ey = y + Math.sin(angle) * end * 0.65;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (i % 2 === 0) ctx.fillRect(ex - 2, ey - 2, 4, 4);
    }
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
    if (!ARCADE_FEEL.enabled || (run.finishFlashTimer <= 0 && run.finishStripeTimer <= 0)) return;
    const progress = 1 - run.finishFlashTimer / ARCADE_FEEL.finishFlashSeconds;
    const alpha = (1 - progress) * 0.34;
    const ctx = this.ctx;
    ctx.save();
    if (run.finishFlashTimer > 0) {
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
    }
    if (run.finishStripeTimer > 0) {
      const stripeDuration = ARCADE_FEEL.finishStripeMs / 1000;
      const stripeProgress = stripeDuration > 0 ? 1 - run.finishStripeTimer / stripeDuration : 1;
      const bandY = lerp(this.height * 0.18, this.height * 0.82, stripeProgress);
      const cell = Math.max(18, this.width / 34);
      ctx.globalAlpha = (1 - stripeProgress) * 0.54;
      for (let i = -1; i < this.width / cell + 2; i += 1) {
        ctx.fillStyle = i % 2 ? "#f6fbff" : "#08080d";
        ctx.fillRect(i * cell + (stripeProgress * cell * 3) % (cell * 2), bandY - 12, cell, 24);
      }
    }
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
    const hudHeight = CAMERA_CONFIG.hudHeight;
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
    ctx.fillRect(0, 0, w, hudHeight);
    ctx.strokeStyle = "rgba(40, 246, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hudHeight);
    ctx.lineTo(w, hudHeight);
    ctx.stroke();

    ctx.font = "700 14px Trebuchet MS, Verdana, sans-serif";
    ctx.fillStyle = "#f6fbff";
    ctx.textBaseline = "top";
    const left = 16;
    const col = (w - left * 2) / hudItems.length;
    hudItems.forEach(([label, value], index) => {
      drawHudLabel(ctx, label, value, left + col * index, 6, Math.max(54, col - 10));
    });

    const barX = 16;
    const barY = 40;
    const fuelGaugeW = fuelRun ? (w >= 760 ? 168 : 124) : 0;
    const barW = Math.min(w - 32 - (fuelRun && w >= 620 ? fuelGaugeW + 22 : 0), w >= 760 ? 460 : 320);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.fillRect(barX, barY, barW, 8);
    ctx.fillStyle = "#44ff99";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#44ff99";
    ctx.fillRect(barX, barY, barW * progress, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#b8c6d9";
    ctx.font = "700 11px Trebuchet MS, Verdana, sans-serif";
    const sectionLabel = String(run.currentSectionLabel || getTrackSection(run.track, progress).label || "").toUpperCase();
    const contextParts = [`${Math.round(progress * 100)}%`, sectionLabel];
    contextParts.push(raceTypeLabel.toUpperCase());
    if (run.challengeMode) contextParts.push(`CHALLENGE ${run.challengeName}`);
    if (run.partyMode) contextParts.push(`PARTY ${run.partyTurnNumber}/${run.partyTotalPlayers}`);
    if (w >= 840) contextParts.push(`SEED ${formatRoadSeed(run.roadSeed)}`);
    const drawFuelInline = fuelRun && w >= 620;
    if (drawFuelInline) {
      this.drawFuelGauge(ctx, w - fuelGaugeW - 16, 38, fuelGaugeW, 14);
    }
    const statusX = w >= 760 ? barX + barW + 18 : barX;
    const statusY = w >= 760 ? 38 : 50;
    const statusMaxWidth = w >= 760
      ? Math.max(80, w - statusX - (drawFuelInline ? fuelGaugeW + 30 : 12))
      : (fuelRun && !drawFuelInline ? Math.max(80, w - fuelGaugeW - 54) : w - 32);
    drawFittedText(ctx, contextParts.join("  "), statusX, statusY, statusMaxWidth);
    if (fuelRun && !drawFuelInline) {
      this.drawFuelGauge(ctx, Math.max(16, w - fuelGaugeW - 16), 46, fuelGaugeW, 11);
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
    const warningPulse = ARCADE_FEEL.fuelWarningPulseMs > 0
      ? clamp((run.fuelWarningPulseTimer || 0) / (ARCADE_FEEL.fuelWarningPulseMs / 1000), 0, 1)
      : 0;
    const savedPulse = ARCADE_FEEL.fuelSavedPulseMs > 0
      ? clamp((run.fuelSavedPulseTimer || 0) / (ARCADE_FEEL.fuelSavedPulseMs / 1000), 0, 1)
      : 0;
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 18, 0.92)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + warningPulse * 1.2;
    ctx.shadowBlur = (critical || low ? 14 : 8) + warningPulse * 8;
    ctx.shadowColor = color;
    ctx.strokeRect(x, y, width, height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.globalAlpha = critical || low ? clamp(pulse + 0.45, 0.45, 1) : 0.9;
    ctx.fillRect(x + 3, y + 3, Math.max(0, (width - 6) * percent), Math.max(1, height - 6));
    if (savedPulse > 0) {
      const shimmerX = x + 3 + (width - 6) * clamp(1 - savedPulse, 0, 1);
      const shimmerW = Math.max(7, width * 0.16);
      ctx.globalAlpha = savedPulse * 0.68;
      ctx.fillStyle = "#f6fbff";
      ctx.fillRect(Math.min(x + width - 4, shimmerX), y + 3, shimmerW, Math.max(1, height - 6));
      ctx.globalAlpha = savedPulse * 0.5;
      ctx.strokeStyle = "#44ff99";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    }
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
    const playerScreenY = this.getPlayerScreenY();
    const playerProjectionPxPerWorld = this.projectionPixelsPerWorldAtY(playerScreenY);
    const obstacleDeltaPerFrame = run.currentSpeed * actualDt * playerProjectionPxPerWorld;
    const obstaclePxPerSecondAtPlayer = run.currentSpeed * playerProjectionPxPerWorld;
    const roadMarkerDeltaPerFrame = run.currentSpeed * actualDt * SPEED_TUNING.roadStripeScrollScale;
    const roadMarkerPxPerSecond = run.currentSpeed * SPEED_TUNING.roadStripeScrollScale;
    const eta = run.currentSpeed > 0 ? (run.track.distanceToFinish - run.distance) / run.currentSpeed : 0;
    const spawnLeadDistance = this.game.obstacles.getSpawnLeadDistance(run);
    const spawnRevealBuffer = this.game.obstacles.getSpawnRevealBuffer(run);
    const spawnPlan = this.game.obstacles.getSpawnSchedulePlan(run, run.track);
    const visibleLookaheadSeconds = run.currentSpeed > 0 ? VIEW_DISTANCE / run.currentSpeed : 0;
    const playerZoneScale = this.scaleForY(playerScreenY);
    const playerZoneTraffic = this.getObstacleVisualSize("slowCar", playerZoneScale);
    const playerZonePlayer = this.getPlayerVisualSize();
    const effectiveVehicleScale = getCameraVehicleScaleMultiplier();
    const effectiveHazardScale = getCameraHazardScaleMultiplier("gasCan");
    const projectionSamples = this.getProjectionMotionSamples(run.currentSpeed);
    const sampleMotion = this.getSampleObstacleMotionDebug(run);
    const startClear = this.game.obstacles.getStartClearStatus(run);
    const roadBottom = this.road.y + this.road.h;
    const topWorldDistance = this.aheadForY(this.road.y);
    const bottomWorldDistance = this.aheadForY(roadBottom);
    const directorDebug = this.game.obstacles.director.getDebugInfo();
    const partyDebug = this.game.getPartyDebugInfo();
    const challengeDebug = this.game.getChallengeDebugInfo();
    const partyLines = partyDebug.active ? [
      "party mode: active",
      `party player: ${partyDebug.currentPlayer}`,
      `party turn: ${partyDebug.currentTurn}/${partyDebug.totalPlayers}`,
      `party round: ${partyDebug.round}/${partyDebug.totalRounds}`,
      `party seed: ${partyDebug.sharedSeed}`,
      `party current seed: ${partyDebug.currentSeed}`,
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
    const visibleHardBlockers = this.game.obstacles.getHardBlockerLaneOccupancy(this.game.obstacles.obstacles, run.distance);
    const visibleHardRows = this.game.obstacles.getHardBlockerRowOccupancy(this.game.obstacles.obstacles, { runDistance: run.distance });
    const visibleRoute = this.game.obstacles.getRouteReadability(this.game.obstacles.obstacles, run.distance);
    const visibleRamps = this.game.obstacles.getRampUsefulness(this.game.obstacles.obstacles, run.distance);
    const activeDensity = this.game.obstacles.getActiveFieldDensity(this.game.obstacles.obstacles, run.distance);
    const activeBudget = this.game.obstacles.getActiveFieldBudget(run);
    const currentResultStatus = run.ended
      ? getRunStatusLabel(run.finished ? "finished" : (run.endReason === "Out of Fuel" ? "outOfFuel" : "crashed"), run.endReason)
      : (run.raceActive ? "Running" : "Countdown");
    const lines = [
      "DEBUG `",
      `playtest result: ${currentResultStatus}`,
      `playtest lanes: changes ${run.laneMoves || 0} center ${(run.centerLaneTime || 0).toFixed(1)}s streak ${(run.currentCenterLaneStreak || 0).toFixed(1)}s max ${(run.longestCenterLaneStreak || 0).toFixed(1)}s`,
      `playtest fuel: gas ${run.gasCansCollected || 0}/${run.gasCansSpawned || 0} saved ${(run.fuelSavedByBoost || 0).toFixed(1)} pause ${(run.fuelDrainPausedTime || 0).toFixed(1)}s low ${(run.lowFuelSeconds || 0).toFixed(1)}s critical ${(run.criticalFuelSeconds || 0).toFixed(1)}s`,
      `playtest boost: manual ${run.manualBoostsUsed || 0} fuel ${run.boostsUsedInFuelRun || 0} pads ${run.boostPadsCollected || 0} ramps ${run.rampsUsed || 0} targets ${run.rampTargetsCleared || 0}/${run.rampTargetsAssigned || 0}`,
      `playtest director: waves ${directorDebug.waveCount || 0} meaningful ${directorDebug.meaningfulWaveCount || 0} support ${directorDebug.supportWaveCount || 0}`,
      `playtest launch: first10 ${directorDebug.wavesFirst10Seconds || 0} launch ${directorDebug.launchWaveCount || 0}/${directorDebug.launchMeaningfulWaveCount || 0} hardest ${directorDebug.hardestPressureObserved || 0}`,
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
      `obstacle px/sec @player: ${obstaclePxPerSecondAtPlayer.toFixed(0)}`,
      `road marker px/sec: ${roadMarkerPxPerSecond.toFixed(0)}`,
      `distance/sec: ${run.currentSpeed.toFixed(1)}`,
      `camera scale: vehicle ${effectiveVehicleScale.toFixed(2)} hazard ${effectiveHazardScale.toFixed(2)} projection ${CAMERA_CONFIG.gameplayProjectionMode} ${CAMERA_CONFIG.gameplayProjectionStrength.toFixed(2)}`,
      `view distance: ${VIEW_DISTANCE} (${(VIEW_DISTANCE / CAMERA_CONFIG.previousViewDistance).toFixed(2)}x prior ${CAMERA_CONFIG.previousViewDistance}, ${(VIEW_DISTANCE / CAMERA_CONFIG.originalViewDistance).toFixed(2)}x original ${CAMERA_CONFIG.originalViewDistance})`,
      `lookahead: ${visibleLookaheadSeconds.toFixed(2)}s spawn lead ${spawnLeadDistance.toFixed(0)}`,
      `spawn rule: top ${VIEW_DISTANCE} + buffer ${spawnRevealBuffer.toFixed(0)} = ahead ${spawnPlan.minimumSpawnAhead.toFixed(0)}`,
      `spawn state: last ahead ${(run.lastWaveSpawnAhead || 0).toFixed(0)} section ${run.lastWaveSpawnSection || "none"} delayed ${run.lastWaveDelayedForVisibleSafety ? "yes" : "no"} frame ${run.wavesSpawnedThisFrame || 0} max/frame ${run.maxWavesSpawnedInSingleFrame || 0}`,
      `spawn safety: pop-in prevented ${run.popInPreventedCount || 0} visible violations ${run.wavesSpawnedInsideVisibleCount || 0} catch-up blocked ${run.catchUpSpawnsBlockedCount || 0} transition bursts ${run.sectionTransitionWaveBurstCount || 0}`,
      `active field: visible ${activeDensity.visibleHardBlockers}/${activeBudget.maxVisibleHardBlockers} tactical ${activeDensity.tacticalHardBlockers}/${activeBudget.maxTacticalHardBlockers} next3 ${activeDensity.hardBlockersNext3Seconds}/${activeBudget.maxHardBlockersNext3Seconds}`,
      `active overlap: waves ${activeDensity.visibleHardWaveOverlap}/${activeBudget.maxVisibleHardWaveOverlap} 2s ${activeDensity.maxHardBlockersInTwoSeconds}/${activeBudget.maxHardBlockersInTwoSeconds} 3-lane ${activeDensity.maxHardBlockersInThreeLaneNeighborhood}/${activeBudget.maxHardBlockersInThreeLaneNeighborhood}`,
      `active budget: delays ${run.activeFieldBudgetDelays || 0} rejected ${run.activeFieldRejectedSpawns || 0} route ${run.combinedRouteFailures || 0} support suppressed ${run.supportObjectsSuppressedByDensity || 0} reason ${run.lastActiveFieldBudgetReason || "none"}`,
      `motion px/sec: top ${projectionSamples[0].pixelsPerSecond.toFixed(0)} mid ${projectionSamples[1].pixelsPerSecond.toFixed(0)} player ${projectionSamples[2].pixelsPerSecond.toFixed(0)}`,
      `sample obstacle: ${sampleMotion ? `${sampleMotion.type} L${sampleMotion.lane + 1} ahead ${sampleMotion.ahead.toFixed(0)} y ${sampleMotion.y.toFixed(0)} prev ${sampleMotion.previousY.toFixed(0)} ${sampleMotion.pixelsPerSecond.toFixed(0)}px/s ${sampleMotion.zone} scale ${sampleMotion.scale.toFixed(2)}` : "none"}`,
      `start clear: ${startClear.active ? "active" : "done"} ${startClear.clearAheadDistance.toFixed(0)} first hard ${startClear.firstHardAhead === null ? "none" : `${startClear.firstHardAhead.toFixed(0)} (${startClear.firstHardSeconds.toFixed(2)}s)`} rejected ${startClear.rejected}`,
      `road bounds: top ${this.road.y.toFixed(0)} bottom ${roadBottom.toFixed(0)} lane ${this.road.laneW.toFixed(0)}`,
      `road world: top ${topWorldDistance.toFixed(0)} bottom ${bottomWorldDistance.toFixed(0)}`,
      `projection scale: player zone ${playerZoneScale.toFixed(2)}`,
      `zone render: player ${playerZonePlayer.w.toFixed(0)}x${playerZonePlayer.h.toFixed(0)} slow ${playerZoneTraffic.w.toFixed(0)}x${playerZoneTraffic.h.toFixed(0)}`,
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
      `airborne: ${run.airborne} remaining ${(run.jumpTimer || 0).toFixed(2)}s clear ${(run.rampClearDistance || 0).toFixed(0)} landing ${(run.rampLandingSafetyDistance || 0).toFixed(0)}`,
      `collision: ${run.collisionState}`,
      `last hit: ${run.lastCollision}`,
      `danger max: ${this.game.obstacles.lastSafetySummary?.maxBlocked ?? 0}`,
      `hard blockers visible: max ${visibleHardBlockers.maxBlocked} ${visibleHardBlockers.invalid ? "WALL" : (visibleHardBlockers.maxBlocked >= 4 ? "warning" : "ok")}`,
      `hard rows: max ${visibleHardRows.maxBlocked} flat3+ ${visibleHardRows.flatRows} flat4 ${visibleHardRows.fourLaneRows}`,
      `route: failures ${visibleRoute.routeFailures} timing ${visibleRoute.timingRouteFailures || 0} minor-only-open ${visibleRoute.minorOnlyOpenLaneEvents}`,
      `ramps visible: useful ${visibleRamps.useful}/${visibleRamps.total} unsafe ${visibleRamps.unsafeLanding} path-conflict ${visibleRamps.pathCollectibleConflict || 0}`,
      `ramp target: ${run.lastRampTargetStatus || "none"} rejected ${run.rampLandingRejected || 0} failed ${run.rampFailedToClearTarget || 0}`,
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
      `paint: ${spriteDebug.paint?.status || "unknown"} cache ${spriteDebug.paint?.cacheSize || 0}`,
      `paint px: body ${formatPaintDebugRatio(spriteDebug.paint?.bodyRatio)} accent ${formatPaintDebugRatio(spriteDebug.paint?.accentRatio)} protected ${formatPaintDebugRatio(spriteDebug.paint?.protectedRatio)}`,
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
  ctx.font = "700 9px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#f6fbff";
  ctx.font = "700 14px Trebuchet MS, Verdana, sans-serif";
  drawFittedText(ctx, value, x, y + 13, maxWidth);
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

function rgbFromHex(hex, fallback = { r: 255, g: 255, b: 255 }) {
  const clean = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbaFromHex(hex, alpha = 1) {
  const rgb = rgbFromHex(hex, rgbFromHex(DEFAULT_CAR.stripeColor));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampNumber(alpha, 0, 1, 1)})`;
}

function rgbToHsl(r, g, b) {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) {
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
    } else if (max === gn) {
      h = (bn - rn) / d + 2;
    } else {
      h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const hue = ((h % 1) + 1) % 1;
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);
  if (sat === 0) {
    const value = Math.round(light * 255);
    return { r: value, g: value, b: value };
  }
  const hueToRgb = (p, q, t) => {
    let next = t;
    if (next < 0) next += 1;
    if (next > 1) next -= 1;
    if (next < 1 / 6) return p + (q - p) * 6 * next;
    if (next < 1 / 2) return q;
    if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
    return p;
  };
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255)
  };
}

function getPixelPaintStats(r, g, b) {
  const hsl = rgbToHsl(r, g, b);
  return {
    ...hsl,
    luminance: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
    value: Math.max(r, g, b) / 255
  };
}

function hueDistance(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1 - diff);
}

function isLikelyProtectedPlayerCarPixel(stats, x, y, bounds) {
  const localX = bounds.width > 0 ? (x - bounds.x) / bounds.width : 0.5;
  const localY = bounds.height > 0 ? (y - bounds.y) / bounds.height : 0.5;
  const edgeLightZone = (localX < 0.28 || localX > 0.72) && (localY < 0.23 || localY > 0.8);
  const redAmberHue = stats.h <= 0.18 || stats.h >= 0.94;

  if (stats.luminance < 0.11) return true;
  if (stats.luminance < 0.24 && stats.s < 0.58) return true;
  if (stats.s < 0.16 && stats.luminance < 0.76) return true;
  if (stats.luminance > 0.88 && stats.s < 0.34) return true;
  if (edgeLightZone && redAmberHue && stats.s > 0.45 && stats.value > 0.72) return true;
  return false;
}

function recolorPlayerCarSprite(image, carStyle, styleId = DEFAULT_CAR.bodyStyle) {
  const bodyHex = getCarPaintHex(CAR_BODY_COLOR_OPTIONS, carStyle.bodyColor, DEFAULT_CAR_STYLE.bodyColor);
  const accentHex = getCarPaintHex(CAR_ACCENT_COLOR_OPTIONS, carStyle.accentColor, DEFAULT_CAR_STYLE.accentColor);
  const debugBase = {
    status: "original",
    styleId,
    protectedRatio: null,
    paintRatio: null,
    bodyRatio: null,
    accentRatio: null,
    fallbackReason: ""
  };

  if (!bodyHex && !accentHex) {
    return { sprite: null, debug: debugBase };
  }

  const imageW = image.naturalWidth || image.width || 0;
  const imageH = image.naturalHeight || image.height || 0;
  if (!imageW || !imageH || typeof document === "undefined") {
    return {
      sprite: null,
      debug: { ...debugBase, status: "fallback", fallbackReason: "canvas unavailable" }
    };
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = imageW;
    canvas.height = imageH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return {
        sprite: null,
        debug: { ...debugBase, status: "fallback", fallbackReason: "2d context unavailable" }
      };
    }

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, imageW, imageH);
    const pixels = imageData.data;
    const bounds = getSpriteSourceBounds(image);
    const candidates = [];
    const hueBins = new Array(36).fill(0);
    let opaquePixels = 0;
    let protectedPixels = 0;

    for (let y = 0; y < imageH; y += 1) {
      for (let x = 0; x < imageW; x += 1) {
        const offset = (y * imageW + x) * 4;
        const alpha = pixels[offset + 3];
        if (alpha <= SPRITE_OPAQUE_ALPHA_THRESHOLD) continue;
        opaquePixels += 1;
        const stats = getPixelPaintStats(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
        if (isLikelyProtectedPlayerCarPixel(stats, x, y, bounds)) {
          protectedPixels += 1;
          continue;
        }
        const paintCandidate = stats.s >= 0.28 && stats.value >= 0.18 && stats.luminance >= 0.12 && stats.luminance <= 0.88;
        if (!paintCandidate) {
          protectedPixels += 1;
          continue;
        }
        candidates.push({ offset, stats });
        const bin = clamp(Math.floor(stats.h * hueBins.length), 0, hueBins.length - 1);
        hueBins[bin] += stats.s * (0.55 + stats.value * 0.45) * (alpha / 255);
      }
    }

    const paintRatio = opaquePixels ? candidates.length / opaquePixels : 0;
    const protectedRatio = opaquePixels ? protectedPixels / opaquePixels : 0;
    if (!opaquePixels || candidates.length < 40 || paintRatio < 0.02) {
      return {
        sprite: null,
        debug: {
          ...debugBase,
          status: "fallback",
          protectedRatio,
          paintRatio,
          fallbackReason: "not enough paint pixels"
        }
      };
    }

    const primaryBin = hueBins.reduce((best, value, index) => value > hueBins[best] ? index : best, 0);
    const primaryHue = (primaryBin + 0.5) / hueBins.length;
    const bodyRgb = bodyHex ? rgbFromHex(bodyHex) : null;
    const accentRgb = accentHex ? rgbFromHex(accentHex) : null;
    const bodyTarget = bodyRgb ? { hsl: rgbToHsl(bodyRgb.r, bodyRgb.g, bodyRgb.b) } : null;
    const accentTarget = accentRgb ? { hsl: rgbToHsl(accentRgb.r, accentRgb.g, accentRgb.b) } : null;

    let bodyPixels = 0;
    let accentPixels = 0;
    let recoloredPixels = 0;

    candidates.forEach((candidate) => {
      const hueGap = hueDistance(candidate.stats.h, primaryHue);
      const bodyPixel = hueGap <= 0.14;
      const accentPixel = !bodyPixel && hueGap >= 0.18 && candidate.stats.s >= 0.35 && candidate.stats.value >= 0.24;
      let nextRgb = null;
      if (bodyPixel) {
        bodyPixels += 1;
        if (bodyTarget) nextRgb = mapPaintPixelToTarget(candidate.stats, bodyTarget);
      } else if (accentPixel) {
        accentPixels += 1;
        if (accentTarget) nextRgb = mapPaintPixelToTarget(candidate.stats, accentTarget);
      }
      if (!nextRgb) return;
      pixels[candidate.offset] = nextRgb.r;
      pixels[candidate.offset + 1] = nextRgb.g;
      pixels[candidate.offset + 2] = nextRgb.b;
      recoloredPixels += 1;
    });

    const needsBody = Boolean(bodyTarget);
    const needsAccent = Boolean(accentTarget);
    const enoughBodyPaint = !needsBody || bodyPixels >= 40;
    const enoughAccentPaint = !needsAccent || accentPixels >= 12;
    if (!recoloredPixels || !enoughBodyPaint || !enoughAccentPaint) {
      return {
        sprite: null,
        debug: {
          ...debugBase,
          status: "fallback",
          protectedRatio,
          paintRatio,
          bodyRatio: opaquePixels ? bodyPixels / opaquePixels : 0,
          accentRatio: opaquePixels ? accentPixels / opaquePixels : 0,
          fallbackReason: !enoughBodyPaint ? "body paint not isolated" : "accent paint not isolated"
        }
      };
    }

    ctx.putImageData(imageData, 0, 0);
    canvas.neonOpaqueBounds = image.neonOpaqueBounds || bounds;
    canvas.neonPaintDebug = {
      ...debugBase,
      status: "recolored",
      protectedRatio,
      paintRatio,
      bodyRatio: opaquePixels ? bodyPixels / opaquePixels : 0,
      accentRatio: opaquePixels ? accentPixels / opaquePixels : 0,
      fallbackReason: ""
    };
    return {
      sprite: canvas,
      debug: canvas.neonPaintDebug
    };
  } catch (error) {
    return {
      sprite: null,
      debug: {
        ...debugBase,
        status: "fallback",
        fallbackReason: "canvas read failed"
      }
    };
  }
}

function mapPaintPixelToTarget(stats, target) {
  const lightness = clamp(target.hsl.l * 0.58 + stats.l * 0.5, target.hsl.l < 0.18 ? 0.045 : 0.08, target.hsl.l > 0.82 ? 0.98 : 0.92);
  const saturation = target.hsl.s < 0.08
    ? target.hsl.s
    : clamp(target.hsl.s * (0.72 + stats.s * 0.32), 0.08, 1);
  return hslToRgb(target.hsl.h, saturation, lightness);
}

function getVehicleLaneWidth(state = {}) {
  return Number.isFinite(state.laneWidth) && state.laneWidth > 0
    ? state.laneWidth
    : 760 / LANES;
}

function getCameraVehicleScaleMultiplier(state = {}) {
  if (state.preview) return 1;
  return CAMERA_CONFIG.vehicleScale;
}

function getCameraHazardScaleMultiplier(type) {
  if (!CAMERA_HAZARD_SCALE_TYPES.has(type)) return 1;
  return CAMERA_CONFIG.hazardScale;
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
  let width = getConfiguredVehicleWidth(config, getVehicleLaneWidth(state), getCameraVehicleScaleMultiplier(state));
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
  let width = getConfiguredVehicleWidth(config, getVehicleLaneWidth(state), styleScale * getCameraVehicleScaleMultiplier(state));
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
    const sprite = spriteManager.getSprite(getCarStyleId(carConfig), carConfig);
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
    render: `${canvasSize.w.toFixed(0)}x${canvasSize.h.toFixed(0)}`,
    paint: {
      status: carConfig.useSprite === false ? "canvas" : "fallback",
      cacheSize: spriteManager?.getPaintCacheSize?.() || 0,
      protectedRatio: null,
      paintRatio: null,
      bodyRatio: null,
      accentRatio: null
    }
  };
  if (carConfig.useSprite === false || !spriteManager) return fallback;

  const style = getCarStyleId(carConfig);
  const sprite = spriteManager.getSprite(style, carConfig);
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
    render: `${box.w.toFixed(0)}x${box.h.toFixed(0)}`,
    paint: spriteManager.getPaintDebugInfo(style, carConfig.carStyle)
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
    const sprite = spriteManager.getSprite(getCarStyleId(carConfig), carConfig);
    if (sprite) {
      drawSpritePlayerCar(ctx, x, y, carConfig, state, sprite);
      return;
    }
  }
  drawCanvasPlayerCar(ctx, x, y, carConfig, state);
}

function drawSpritePlayerCar(ctx, x, y, carConfig, state, sprite) {
  const stripe = getCarAccentColor(carConfig);
  const boostTrail = getCarBoostTrailColor(carConfig);
  const targetWidth = getPlayerSpriteTargetWidth(carConfig, state);
  const spriteBox = getScaledSpriteBox(sprite, targetWidth);
  const laneTilt = clamp(state.laneDelta || 0, -1, 1) * 0.06;
  const landingPulse = clampNumber(state.landingPulse, 0, 1, 0);
  const airborneLift = Math.max(0, state.airborneLift || 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(laneTilt);

  if (state.airborne) {
    const shadowOffset = spriteBox.h * 0.32 + Math.min(spriteBox.h * 0.72, airborneLift * 0.82);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, shadowOffset, spriteBox.w * 0.3, spriteBox.h * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (landingPulse > 0) {
    ctx.scale(1 + landingPulse * 0.035, 1 - landingPulse * 0.045);
  }

  if (state.boosting) {
    drawSpriteBoostTrail(ctx, spriteBox.w, spriteBox.h, boostTrail, state.boostTrailIntensity || 0.7);
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

function drawSpriteBoostTrail(ctx, w, h, stripe, intensity = 1) {
  const strength = clampNumber(intensity, 0.45, 1.2, 1);
  ctx.save();
  ctx.globalAlpha = 0.52 + strength * 0.34;
  ctx.shadowBlur = 18 + strength * 10;
  ctx.shadowColor = stripe;
  ctx.fillStyle = rgbaFromHex(stripe, 0.82);
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, h * 0.48);
  ctx.lineTo(-w * 0.08, h * (0.74 + strength * 0.16) + Math.random() * (10 + strength * 10));
  ctx.lineTo(w * 0.02, h * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(stripe, 54);
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.48);
  ctx.lineTo(w * 0.2, h * (0.72 + strength * 0.13) + Math.random() * (8 + strength * 9));
  ctx.lineTo(w * 0.3, h * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = stripe;
  ctx.beginPath();
  ctx.moveTo(-w * 0.06, h * 0.5);
  ctx.lineTo(w * 0.06, h * (0.82 + strength * 0.14) + Math.random() * (7 + strength * 8));
  ctx.lineTo(w * 0.16, h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCanvasPlayerCar(ctx, x, y, carConfig, state) {
  const body = carConfig.bodyColor || DEFAULT_CAR.bodyColor;
  const stripe = carConfig.stripeColor || DEFAULT_CAR.stripeColor;
  const boostTrail = getCarBoostTrailColor(carConfig);
  const glass = carConfig.windowColor || DEFAULT_CAR.windowColor;
  const style = CAR_BODY_STYLES.some((item) => item.id === carConfig.bodyStyle) ? carConfig.bodyStyle : DEFAULT_CAR.bodyStyle;
  const { scale, w, h } = getCanvasPlayerCarRenderSize(state);
  const laneTilt = clamp(state.laneDelta || 0, -1, 1) * 0.06;
  const landingPulse = clampNumber(state.landingPulse, 0, 1, 0);
  const airborneLift = Math.max(0, state.airborneLift || 0);
  const boostTrailStrength = clampNumber(state.boostTrailIntensity, 0.45, 1.2, 0.72);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(laneTilt);

  if (state.airborne) {
    const shadowOffset = h * 0.3 + Math.min(h * 0.72, airborneLift * 0.82);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, shadowOffset, w * 0.32, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (landingPulse > 0) {
    ctx.scale(1 + landingPulse * 0.035, 1 - landingPulse * 0.045);
  }

  if (state.boosting) {
    ctx.save();
    ctx.globalAlpha = 0.52 + boostTrailStrength * 0.34;
    ctx.shadowBlur = 18 + boostTrailStrength * 10;
    ctx.shadowColor = boostTrail;
    ctx.fillStyle = rgbaFromHex(boostTrail, 0.82);
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, h * 0.42);
    ctx.lineTo(-w * 0.08, h * (0.68 + boostTrailStrength * 0.12) + Math.random() * (10 + boostTrailStrength * 10));
    ctx.lineTo(w * 0.02, h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(boostTrail, 54);
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.42);
    ctx.lineTo(w * 0.2, h * (0.64 + boostTrailStrength * 0.12) + Math.random() * (8 + boostTrailStrength * 9));
    ctx.lineTo(w * 0.3, h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = boostTrail;
    ctx.beginPath();
    ctx.moveTo(-w * 0.06, h * 0.44);
    ctx.lineTo(w * 0.06, h * (0.78 + boostTrailStrength * 0.12) + Math.random() * (7 + boostTrailStrength * 8));
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
    this.playtestReports = new PlaytestReportStore(PLAYTEST_REPORT_STORAGE_KEY);
    this.audio = new AudioManager(this.profiles.data.audio, (settings) => this.profiles.updateAudioSettings(settings));
    this.carSprites = new CarSpriteManager(CAR_BODY_STYLES, () => {
      if (this.screen === "customize") this.renderCarPreview();
      if (this.screen === "partyTurn") this.renderPartyCarPreview(this.partySession?.currentPlayer);
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
    this.pendingTrackId = DEFAULT_TRACK_ID;
    this.partySetup = null;
    this.partySession = null;
    this.guideTab = "basics";
    this.guideReturnScreen = "title";
    this.badgeFilter = "all";
    this.playtestReportFilter = "all";
    this.playtestReportCopyText = "";
    this.roadDirectorReportCopyText = "";
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
    const speedClass = getSpeedClassConfig(this.profiles?.data?.speedClassId);
    const track = createRaceTrackForSpeedClass(TRACKS[0], speedClass.id);
    const section = getTrackSection(track, 0);
    return {
      runId: uid(),
      gameVersion: GAME_VERSION,
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
      fuelSavedByBoost: 0,
      fuelDrainPausedTime: 0,
      boostsUsedInFuelRun: 0,
      lowestFuelReached: 0,
      fuelAt25Percent: null,
      fuelAt50Percent: null,
      fuelAt75Percent: null,
      lowFuelSeconds: 0,
      criticalFuelSeconds: 0,
      fuelOpportunitiesBySection: {},
      gasCansSpawnedBySection: {},
      gasCansCollectedBySection: {},
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
      partySessionId: "",
      partySeedLocked: false,
      partyRoundType: PARTY_ROUND_TYPE_ONE_RUN,
      partySeedMode: PARTY_SEED_MODE_SAME_ROUND,
      partyRoundNumber: 0,
      partyRoundIndex: 0,
      partyTotalRounds: 0,
      partySeed: "",
      partyTurnNumber: 0,
      partyTotalPlayers: 0,
      partyLeaderChanges: 0,
      challengeMode: false,
      challengeId: "",
      challengeName: "",
      challengeObjective: "",
      challengeFixedSeed: "",
      lastDistanceDelta: 0,
      boostMultiplier: 1,
      manualBoosts: 3,
      manualBoostsUsed: 0,
      boostPadsCollected: 0,
      rampsUsed: 0,
      boostTimer: 0,
      padBoostTimer: 0,
      oilTimer: 0,
      slowdownTimer: 0,
      slowdownFactor: 1,
      jumpTimer: 0,
      jumpDuration: ROAD_READABILITY_CONFIG.rampMinAirborneDuration + ROAD_READABILITY_CONFIG.rampLandingGraceSeconds,
      jumpOffset: 0,
      airborne: false,
      rampAirborneDuration: 0,
      rampClearDistance: ROAD_READABILITY_CONFIG.rampClearDistance,
      rampLandingSafetyDistance: ROAD_READABILITY_CONFIG.rampLandingSafetyDistance,
      rampTargetsAssigned: 0,
      rampTargetsCleared: 0,
      rampLandingRejected: 0,
      rampFailedToClearTarget: 0,
      activeRampTarget: null,
      lastRampTargetStatus: "none",
      cleanTimer: 0,
      cleanBonusCount: 0,
      nearMisses: 0,
      penalties: 0,
      slowdownHits: 0,
      laneMoves: 0,
      verticalMovementAmount: 0,
      centerLaneTime: 0,
      currentCenterLaneStreak: 0,
      longestCenterLaneStreak: 0,
      speedSampleSeconds: 0,
      speedWeightedSum: 0,
      maxSpeedObserved: getTrackCruiseSpeed(track, 0, speedClass.id),
      hardestPressureObserved: 0,
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
      crashCollisionType: "",
      collisionState: "clear",
      lastHardBlockerWallLogDistance: -Infinity,
      startClearSeconds: 0,
      startClearAheadDistance: 0,
      startClearUntilDistance: 0,
      startClearApplied: false,
      startClearRejectedObjects: 0,
      popInPreventedCount: 0,
      wavesSpawnedInsideVisibleCount: 0,
      maxWavesSpawnedInSingleFrame: 0,
      sectionTransitionWaveBurstCount: 0,
      catchUpSpawnsBlockedCount: 0,
      maxVisibleHardBlockers: 0,
      maxUpperRoadHardBlockers: 0,
      maxMidRoadHardBlockers: 0,
      maxTacticalHardBlockers: 0,
      maxHardBlockersNext3Seconds: 0,
      maxHardBlockersInTwoSeconds: 0,
      maxHardBlockersInThreeLaneNeighborhood: 0,
      visibleWaveOverlapMax: 0,
      activeFieldBudgetDelays: 0,
      activeFieldRejectedSpawns: 0,
      combinedRouteFailures: 0,
      barrierCount: 0,
      supportObjectsSuppressedByDensity: 0,
      recentRoadDirectorRejections: [],
      deadScreenTime: 0,
      longestDeadScreenSeconds: 0,
      timeSinceLastMeaningfulDecisionMax: 0,
      visibleMeaningfulMin: Infinity,
      visibleMeaningfulSampleSum: 0,
      visibleMeaningfulSampleCount: 0,
      upcomingDecisionGapMax: 0,
      underActivityCorrections: 0,
      lastUnderActivityCorrectionElapsed: -Infinity,
      lastUnderActivityCorrectionReason: "",
      overActivityDelays: 0,
      forceRoadDirectorIntent: "",
      forceRoadDirectorIntentReason: "",
      lastVisibleHardBlockers: 0,
      lastTacticalHardBlockers: 0,
      lastHardBlockersNext3Seconds: 0,
      lastVisibleWaveOverlap: 0,
      lastVisibleMeaningfulObjects: 0,
      lastUpcomingMeaningfulObjects: 0,
      lastVisibleMeaningfulTarget: 0,
      lastRoadActivityFloorStatus: "",
      lastDeadScreenRisk: false,
      lastUpcomingDecisionSeconds: null,
      lastActiveFieldBudgetReason: "",
      wavesSpawnedThisFrame: 0,
      lastWaveSpawnDistance: 0,
      lastWaveSpawnAhead: 0,
      lastWaveSpawnSection: "",
      lastSpawnVisibleAhead: VIEW_DISTANCE,
      lastSpawnRevealBuffer: 0,
      lastWaveDelayedForVisibleSafety: false,
      lastSectionTransitionElapsed: 0,
      lastSectionTransitionId: section.id,
      hitPauseTimer: 0,
      pendingEndStatus: "",
      pendingEndReason: "",
      crashSfxPlayed: false,
      crashFlash: 0,
      screenShake: 0,
      bumpFlashTimer: 0,
      boostBurstTimer: 0,
      boostFlashTimer: 0,
      boostStreakPunchTimer: 0,
      boostTrailPunchTimer: 0,
      finishFlashTimer: 0,
      finishStripeTimer: 0,
      crashBeatTimer: 0,
      crashSparkTimer: 0,
      fuelOutBeatTimer: 0,
      rampLaunchPulseTimer: 0,
      rampLandingPulseTimer: 0,
      rampClearSparkTimer: 0,
      nearMissSparkTimer: 0,
      nearMissPopupCooldown: 0,
      fuelWarningPulseTimer: 0,
      fuelSavedPulseTimer: 0,
      fuelSavedPopupCooldown: 0,
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
      if (!this.run.pendingEndStatus) this.input.update(dt);
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
    run.boostFlashTimer = Math.max(0, (run.boostFlashTimer || 0) - dt);
    run.boostStreakPunchTimer = Math.max(0, (run.boostStreakPunchTimer || 0) - dt);
    run.boostTrailPunchTimer = Math.max(0, (run.boostTrailPunchTimer || 0) - dt);
    run.finishFlashTimer = Math.max(0, (run.finishFlashTimer || 0) - dt);
    run.finishStripeTimer = Math.max(0, (run.finishStripeTimer || 0) - dt);
    run.crashBeatTimer = Math.max(0, (run.crashBeatTimer || 0) - dt);
    run.crashSparkTimer = Math.max(0, (run.crashSparkTimer || 0) - dt);
    run.fuelOutBeatTimer = Math.max(0, (run.fuelOutBeatTimer || 0) - dt);
    run.rampLaunchPulseTimer = Math.max(0, (run.rampLaunchPulseTimer || 0) - dt);
    run.rampLandingPulseTimer = Math.max(0, (run.rampLandingPulseTimer || 0) - dt);
    run.rampClearSparkTimer = Math.max(0, (run.rampClearSparkTimer || 0) - dt);
    run.nearMissSparkTimer = Math.max(0, (run.nearMissSparkTimer || 0) - dt);
    run.nearMissPopupCooldown = Math.max(0, (run.nearMissPopupCooldown || 0) - dt);
    run.fuelWarningPulseTimer = Math.max(0, (run.fuelWarningPulseTimer || 0) - dt);
    run.fuelSavedPulseTimer = Math.max(0, (run.fuelSavedPulseTimer || 0) - dt);
    run.fuelSavedPopupCooldown = Math.max(0, (run.fuelSavedPopupCooldown || 0) - dt);
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
    if (sectionChanged) {
      run.lastSectionTransitionElapsed = Number.isFinite(run.elapsed) ? run.elapsed : 0;
      run.lastSectionTransitionId = section.id;
    }
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
    run.fuelSavedByBoost = 0;
    run.fuelDrainPausedTime = 0;
    run.boostsUsedInFuelRun = 0;
    run.lowestFuelReached = fuelRun ? tuning.fuelMax : 0;
    run.fuelAt25Percent = null;
    run.fuelAt50Percent = null;
    run.fuelAt75Percent = null;
    run.lowFuelSeconds = 0;
    run.criticalFuelSeconds = 0;
    run.fuelOpportunitiesBySection = {};
    run.gasCansSpawnedBySection = {};
    run.gasCansCollectedBySection = {};
    run.simulatedFuelRestored = 0;
  }

  updateRunTelemetry(dt) {
    const run = this.run;
    if (!run || !run.raceActive || dt <= 0) return;
    const speed = Number.isFinite(run.currentSpeed) ? run.currentSpeed : 0;
    run.maxSpeedObserved = Math.max(run.maxSpeedObserved || 0, speed);
    run.speedSampleSeconds = Math.max(0, (run.speedSampleSeconds || 0) + dt);
    run.speedWeightedSum = Math.max(0, (run.speedWeightedSum || 0) + speed * dt);
    const laneValue = Number.isFinite(run.renderLaneFloat) ? run.renderLaneFloat : run.targetLane;
    const lane = Math.round(clamp(laneValue, 0, LANES - 1));
    if (lane === TRACK_DIRECTOR.centerLane) {
      run.centerLaneTime = Math.max(0, (run.centerLaneTime || 0) + dt);
      run.currentCenterLaneStreak = Math.max(0, (run.currentCenterLaneStreak || 0) + dt);
      run.longestCenterLaneStreak = Math.max(run.longestCenterLaneStreak || 0, run.currentCenterLaneStreak);
    } else {
      run.currentCenterLaneStreak = 0;
    }
  }

  updateFuelRunTelemetry(dt) {
    const run = this.run;
    if (!run || !isFuelRunRaceType(run.raceTypeId) || dt <= 0) return;
    const progress = clamp(run.distance / Math.max(1, run.track?.distanceToFinish || 1), 0, 1);
    if (progress >= 0.25 && run.fuelAt25Percent === null) run.fuelAt25Percent = run.fuel;
    if (progress >= 0.5 && run.fuelAt50Percent === null) run.fuelAt50Percent = run.fuel;
    if (progress >= 0.75 && run.fuelAt75Percent === null) run.fuelAt75Percent = run.fuel;
    run.lowestFuelReached = Math.min(
      Number.isFinite(run.lowestFuelReached) ? run.lowestFuelReached : run.fuelMax,
      Number.isFinite(run.fuel) ? run.fuel : run.fuelMax
    );
    if (run.lowFuelActive) {
      run.lowFuelSeconds = Math.max(0, (run.lowFuelSeconds || 0) + dt);
    }
    if (run.criticalFuelActive) {
      run.criticalFuelSeconds = Math.max(0, (run.criticalFuelSeconds || 0) + dt);
    }
  }

  updateFuelRun(dt) {
    const run = this.run;
    if (!run || !isFuelRunRaceType(run.raceTypeId) || run.ended || !run.raceActive) return;
    run.timeSinceLastGasCan = Math.max(0, (run.timeSinceLastGasCan || 0) + dt);
    run.longestNoFuelStretchSeconds = Math.max(run.longestNoFuelStretchSeconds || 0, run.timeSinceLastGasCan);
    run.fuelWarningCooldown = Math.max(0, (run.fuelWarningCooldown || 0) - dt);
    const baseDrainThisFrame = Math.max(0, (run.fuelDrainPerSecond || 0) * dt);
    const manualBoostSavingFuel = run.boostTimer > 0 && baseDrainThisFrame > 0;
    const drainMultiplier = manualBoostSavingFuel
      ? clampNumber(FUEL_RUN_CONFIG.fuelDrainMultiplierDuringManualBoost, 0, 1, 0)
      : 1;
    const drainThisFrame = baseDrainThisFrame * drainMultiplier;
    if (manualBoostSavingFuel && drainThisFrame < baseDrainThisFrame) {
      run.fuelSavedByBoost = Math.max(0, (run.fuelSavedByBoost || 0) + (baseDrainThisFrame - drainThisFrame));
      run.fuelDrainPausedTime = Math.max(0, (run.fuelDrainPausedTime || 0) + dt);
      run.fuelSavedPulseTimer = Math.max(run.fuelSavedPulseTimer || 0, ARCADE_FEEL.fuelSavedPulseMs / 1000);
    }
    run.fuel = clamp(run.fuel - drainThisFrame, 0, run.fuelMax);
    run.lowFuelActive = run.fuel <= run.lowFuelThreshold;
    run.criticalFuelActive = run.fuel <= run.criticalFuelThreshold;
    this.updateFuelRunTelemetry(dt);
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
      run.fuelWarningPulseTimer = Math.max(run.fuelWarningPulseTimer || 0, ARCADE_FEEL.fuelWarningPulseMs / 1000);
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
    run.lowestFuelReached = Math.min(Number.isFinite(run.lowestFuelReached) ? run.lowestFuelReached : before, before);
    run.fuel = clamp(run.fuel + restore, 0, run.fuelMax);
    run.gasCansCollected += 1;
    run.fuelCollected += 1;
    if (run.gasCansCollectedBySection) {
      const sectionId = obstacle.sectionId || run.currentSectionId || "";
      if (sectionId) run.gasCansCollectedBySection[sectionId] = (run.gasCansCollectedBySection[sectionId] || 0) + 1;
    }
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

  updatePendingEnd(dt) {
    const run = this.run;
    if (!run?.pendingEndStatus) return false;
    run.hitPauseTimer = Math.max(0, (run.hitPauseTimer || 0) - dt);
    if (run.hitPauseTimer <= 0) {
      const status = run.pendingEndStatus;
      const reason = run.pendingEndReason;
      run.pendingEndStatus = "";
      run.pendingEndReason = "";
      this.endRace(status, reason);
    }
    return true;
  }

  queueCrashImpact(reason) {
    const run = this.run;
    if (!run || run.ended || run.pendingEndStatus) return;
    run.pendingEndStatus = "crashed";
    run.pendingEndReason = reason || run.lastCollision || "Crash";
    run.hitPauseTimer = ARCADE_FEEL.crashPauseMs / 1000;
    run.crashCollisionType = sanitizeName(run.pendingEndReason, "Unknown", DISPLAY_TEXT_MAX_LENGTH);
    run.crashFlash = Math.max(run.crashFlash || 0, 1);
    run.crashBeatTimer = Math.max(run.crashBeatTimer || 0, 0.72);
    run.crashSparkTimer = Math.max(run.crashSparkTimer || 0, ARCADE_FEEL.crashSparkMs / 1000);
    run.screenShake = Math.max(run.screenShake || 0, ARCADE_FEEL.crashShake);
    run.crashSfxPlayed = this.audio.playSfx("crash", {
      cooldownMs: 0,
      maxInstances: 1,
      volume: this.audio.sfxVolume
    });
  }

  updateRun(dt) {
    const run = this.run;
    if (this.updatePendingEnd(dt)) return;
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
      const nextYRatio = clamp(
        run.targetYRatio + run.verticalInput * verticalSpeed * dt,
        PLAYER_MIN_Y_RATIO,
        PLAYER_MAX_Y_RATIO
      );
      run.verticalMovementAmount += Math.abs(nextYRatio - run.playerYRatio) * 100;
      run.targetYRatio = nextYRatio;
      run.playerYRatio = run.targetYRatio;
    }

    if (run.jumpTimer > 0) {
      const wasAirborne = run.airborne;
      run.jumpTimer = Math.max(0, run.jumpTimer - dt);
      const progress = 1 - run.jumpTimer / run.jumpDuration;
      run.jumpOffset = Math.sin(progress * Math.PI) * 56;
      run.airborne = run.jumpTimer > ROAD_READABILITY_CONFIG.rampLandingGraceSeconds;
      if (wasAirborne && !run.airborne) {
        this.finishRampLanding();
        this.triggerRampLandingEffect();
      }
    } else {
      if (run.airborne) {
        this.finishRampLanding();
        this.triggerRampLandingEffect();
      }
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
    this.updateRunTelemetry(dt);
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
    this.audio.setRaceMusicTrack(run.track || TRACKS[0]);
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
    const badgeProgress = player ? this.profiles.getPlayerBadgeProgress(player) : null;
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel challenge-panel">
        <div class="challenge-header">
          <div>
            <span class="eyebrow">Challenge Mode</span>
            <h2>Challenge Pack</h2>
            <p class="hint">Curated solo runs with fixed seeds, race types, race modes, and music-shaped Road Director sections.</p>
          </div>
          <div class="challenge-player-card">
            <strong>${player ? escapeHtml(player.name) : "No Player"}</strong>
            <span>${player ? `Driving ${escapeHtml(player.car.name)} - Badges ${badgeProgress.earnedCount}/${badgeProgress.totalCount}` : "Create a local player first"}</span>
          </div>
        </div>
        <div class="challenge-track-list">
          ${this.renderChallengeTrackGroups()}
        </div>
        <div class="row" style="margin-top:16px">
          <button class="small-button" data-action="title">Back to Title</button>
          <button class="small-button" data-action="howToPlay">How To Play</button>
          <button class="small-button" data-action="leaderboard">Top 20 Scores</button>
        </div>
        <p class="status-line">${escapeHtml(message)}</p>
      </section>
    `;
    this.bindLayerButtons();
  }

  renderChallengeTrackGroups() {
    const groups = [];
    const byTrack = new Map();
    CHALLENGES.forEach((challenge) => {
      const track = getTrackById(challenge.trackId);
      if (!byTrack.has(track.id)) {
        const group = { track, challenges: [] };
        byTrack.set(track.id, group);
        groups.push(group);
      }
      byTrack.get(track.id).challenges.push(challenge);
    });

    return groups.map((group) => `
      <section class="challenge-track-group">
        <div class="challenge-track-heading">
          <div>
            <span class="eyebrow">${escapeHtml(group.track.name)}</span>
            <h3>${escapeHtml(group.track.name)} Challenges</h3>
          </div>
          <span>${group.challenges.length} run${group.challenges.length === 1 ? "" : "s"}</span>
        </div>
        <div class="challenge-card-grid">
          ${group.challenges.map((challenge) => this.renderChallengeCard(challenge)).join("")}
        </div>
      </section>
    `).join("");
  }

  renderChallengeCard(challenge) {
    const progress = this.profiles.getChallengeProgress(challenge.id);
    const track = getTrackById(challenge.trackId);
    const completed = Boolean(progress?.completed);
    const bestScore = progress?.bestScore ? formatScore(progress.bestScore) : "No score yet";
    const bestProgressPercent = progress?.bestProgressPercent || (completed ? 100 : 0);
    const bestProgress = bestProgressPercent > 0 ? formatChallengeProgressPercent(bestProgressPercent) : "No progress yet";
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
          <span><strong>Difficulty</strong>${escapeHtml(getChallengeDifficultyLabel(challenge))}</span>
          <span><strong>Fixed Seed</strong>${escapeHtml(normalizeRoadSeed(challenge.seed, DEFAULT_ROAD_SEED))}</span>
          <span><strong>Status</strong>${escapeHtml(statusText)}</span>
          <span><strong>Best Score</strong>${escapeHtml(bestScore)}</span>
          <span><strong>Best Progress</strong>${escapeHtml(bestProgress)}</span>
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
    const speedClass = getSpeedClassConfig(challenge ? challenge.raceMode : (options.speedClassId ?? this.profiles.data.speedClassId));
    const baseTrack = challenge ? getTrackById(challenge.trackId) : getTrackById(options.track?.id || options.trackId || this.pendingTrackId || DEFAULT_TRACK_ID);
    const track = createRaceTrackForSpeedClass(baseTrack, speedClass.id);
    const requestedRaceTypeId = challenge
      ? (challenge.raceType || DEFAULT_RACE_TYPE_ID)
      : (partyMode ? DEFAULT_RACE_TYPE_ID : (options.raceTypeId || options.raceType || this.pendingRaceTypeId || DEFAULT_RACE_TYPE_ID));
    const safeRaceTypeId = trackSupportsRaceType(baseTrack, requestedRaceTypeId) ? requestedRaceTypeId : DEFAULT_RACE_TYPE_ID;
    const raceType = getRaceTypeConfig(safeRaceTypeId);
    if (this.scoreTallyFrame) {
      cancelAnimationFrame(this.scoreTallyFrame);
      this.scoreTallyFrame = null;
    }
    this.run = this.createEmptyRun();
    this.lastSummary = null;
    this.run.player = {
      ...player,
      car: normalizeCarConfig(player.car)
    };
    this.run.track = track;
    this.run.speedClassId = speedClass.id;
    this.run.speedClass = speedClass;
    this.run.scoreMultiplier = speedClass.scoreMultiplier;
    this.run.raceTypeId = raceType.id;
    this.run.raceType = raceType;
    this.run.partyMode = partyMode;
    this.run.partySessionId = partyMode ? (this.partySession?.sessionId || "") : "";
    this.run.partySeedLocked = Boolean(options.partySeedLocked ?? partyMode);
    this.run.partyRoundType = partyMode ? (this.partySession?.roundType || PARTY_ROUND_TYPE_ONE_RUN) : PARTY_ROUND_TYPE_ONE_RUN;
    this.run.partySeedMode = partyMode ? (this.partySession?.seedMode || PARTY_SEED_MODE_SAME_ROUND) : PARTY_SEED_MODE_SAME_ROUND;
    this.run.partyRoundNumber = partyMode ? (this.partySession?.roundNumber || 1) : 0;
    this.run.partyRoundIndex = this.run.partyRoundNumber;
    this.run.partyTotalRounds = partyMode ? (this.partySession?.totalRounds || 1) : 0;
    this.run.partySeed = partyMode ? (this.partySession?.currentSeed || "") : "";
    this.run.partyTurnNumber = partyMode ? (this.partySession?.currentTurnNumber || 1) : 0;
    this.run.partyTotalPlayers = partyMode ? (this.partySession?.totalPlayers || 0) : 0;
    this.run.partyLeaderChanges = partyMode ? (this.partySession?.leaderChanges || 0) : 0;
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
    const configuredSeed = this.configureRunSeed(challenge ? challenge.seed : (options.seed ?? this.pendingRoadSeed), track, speedClass.id, raceType.id);
    if (partyMode) this.run.partySeed = configuredSeed;
    this.pendingRaceTypeId = raceType.id;
    this.pendingTrackId = baseTrack.id;
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
    if (isFuelRunRaceType(run.raceTypeId)) run.boostsUsedInFuelRun = Math.max(0, (run.boostsUsedInFuelRun || 0) + 1);
    run.boostTimer = Math.max(run.boostTimer, SPEED_TUNING.manualBoostDuration);
    run.boostBurstTimer = Math.max(run.boostBurstTimer || 0, ARCADE_FEEL.boostBurstSeconds);
    run.boostFlashTimer = Math.max(run.boostFlashTimer || 0, ARCADE_FEEL.boostFlashMs / 1000);
    run.boostStreakPunchTimer = Math.max(run.boostStreakPunchTimer || 0, ARCADE_FEEL.boostStreakPunchMs / 1000);
    run.boostTrailPunchTimer = Math.max(run.boostTrailPunchTimer || 0, ARCADE_FEEL.boostTrailPunchMs / 1000);
    run.screenShake = Math.max(run.screenShake || 0, 0.24);
    this.addFloatingScoreText("BOOST!", {
      color: "#28f6ff",
      size: 21,
      life: 0.58,
      yOffset: -96,
      vy: -42
    });
    if (isFuelRunRaceType(run.raceTypeId)) {
      run.fuelSavedPulseTimer = Math.max(run.fuelSavedPulseTimer || 0, ARCADE_FEEL.fuelSavedPulseMs / 1000);
      if ((run.fuelSavedPopupCooldown || 0) <= 0) {
        this.addFloatingScoreText("FUEL SAVED", {
          color: "#44ff99",
          size: 17,
          life: 0.74,
          yOffset: -118,
          vy: -38
        });
        run.fuelSavedPopupCooldown = ARCADE_FEEL.fuelSavedPopupCooldown;
      }
    }
    this.audio.playSfx("boost", {
      cooldownMs: 0,
      maxInstances: 2,
      volume: this.audio.sfxVolume * 0.96
    });
  }

  launchJump(obstacle = null) {
    const run = this.run;
    const speed = Math.max(1, Number.isFinite(run.currentSpeed) ? run.currentSpeed : run.baseCruiseSpeed || 1);
    const targetGap = getRampTargetGap(obstacle);
    const airborneDuration = getRampAirborneDurationForSpeed(speed, targetGap);
    const clearDistance = getRampClearDistanceForSpeed(speed, targetGap);
    run.rampAirborneDuration = airborneDuration;
    run.rampClearDistance = clearDistance;
    run.rampLandingSafetyDistance = ROAD_READABILITY_CONFIG.rampLandingSafetyDistance;
    run.jumpDuration = airborneDuration + ROAD_READABILITY_CONFIG.rampLandingGraceSeconds;
    run.jumpTimer = run.jumpDuration;
    run.airborne = true;
    run.rampLaunchPulseTimer = Math.max(run.rampLaunchPulseTimer || 0, ARCADE_FEEL.rampLaunchPulseMs / 1000);
    run.screenShake = Math.max(run.screenShake || 0, 0.12);
    if (obstacle?.solutionTargetDistance) {
      run.activeRampTarget = {
        id: obstacle.solutionTargetId || "",
        type: obstacle.solutionTargetType || "",
        lane: Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1)),
        rampDistance: obstacle.distance,
        targetDistance: obstacle.solutionTargetDistance,
        targetRunDistance: run.distance + targetGap,
        clearDistance,
        landingSafetyDistance: ROAD_READABILITY_CONFIG.rampLandingSafetyDistance,
        cleared: false
      };
      run.lastRampTargetStatus = `airborne toward ${obstacle.solutionTargetType || "target"}`;
    } else {
      run.activeRampTarget = null;
      run.lastRampTargetStatus = "free jump";
    }
  }

  recordRampAirbornePass(obstacle, info = OBSTACLE_INFO[obstacle?.type] || {}) {
    const run = this.run;
    if (!run) return;
    const label = info.label || obstacle?.type || "object";
    run.lastCollision = `jumped ${label}`;
    run.collisionState = `airborne over ${label}`;
    const target = run.activeRampTarget;
    if (!target || target.cleared || !obstacle) return;
    const obstacleLane = Math.round(clamp(Number.isFinite(obstacle.laneFloat) ? obstacle.laneFloat : obstacle.lane, 0, LANES - 1));
    const sameTarget = target.id
      ? obstacle.id === target.id
      : (obstacle.type === target.type && obstacleLane === target.lane && Math.abs(obstacle.distance - target.targetDistance) <= 180);
    if (!sameTarget) return;
    target.cleared = true;
    run.rampTargetsCleared = (run.rampTargetsCleared || 0) + 1;
    run.lastRampTargetStatus = `cleared ${label}`;
    run.rampClearSparkTimer = Math.max(run.rampClearSparkTimer || 0, ARCADE_FEEL.rampClearSparkMs / 1000);
    this.addFloatingScoreText("CLEAR!", {
      color: "#f6fbff",
      size: 18,
      life: 0.58,
      yOffset: -108,
      vy: -46
    });
  }

  finishRampLanding() {
    const run = this.run;
    const target = run?.activeRampTarget;
    if (!target) return;
    if (!target.cleared) {
      if (run.distance >= target.targetRunDistance) {
        target.cleared = true;
        run.rampTargetsCleared = (run.rampTargetsCleared || 0) + 1;
        run.lastRampTargetStatus = target.type ? `cleared ${target.type}` : "cleared ramp target";
      } else {
        run.rampFailedToClearTarget = (run.rampFailedToClearTarget || 0) + 1;
        run.lastRampTargetStatus = target.type ? `landed before ${target.type}` : "landed before target";
      }
    }
    run.activeRampTarget = null;
  }

  triggerRampLandingEffect() {
    const run = this.run;
    if (!run) return;
    run.rampLandingPulseTimer = Math.max(run.rampLandingPulseTimer || 0, ARCADE_FEEL.rampLandingPulseMs / 1000);
    run.screenShake = Math.max(run.screenShake || 0, 0.11);
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
    let showPopup = true;
    if (type === "nearMiss") {
      showPopup = (run.nearMissPopupCooldown || 0) <= 0;
      if (showPopup) run.nearMissPopupCooldown = ARCADE_FEEL.nearMissPopupCooldown;
      run.nearMissSparkTimer = Math.max(run.nearMissSparkTimer || 0, ARCADE_FEEL.nearMissSparkMs / 1000);
    }
    if (!showPopup) return;
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
        newBestProgress: false,
        newlyCompleted: false,
        bestProgressPercent: progress?.bestProgressPercent || 0,
        bestDate: progress?.bestDate || "",
        bestRunSummary: progress?.bestRunSummary || null
      };
    }
    return this.profiles.recordChallengeResult(challenge, summary, evaluation);
  }

  getPartyStandingForSummary(summary) {
    if (!summary?.partyMode || !this.partySession?.isPartyMode) return null;
    const result = summary.partyResult;
    const standings = this.partySession.standings();
    return standings.find((standing) => (
      standing.resultId && standing.resultId === result?.resultId
    )) || standings.find((standing) => standing.playerId === summary.playerId) || null;
  }

  awardCompletedPartySessionBadges(session, summary) {
    if (!session?.isPartyMode || !session.completed || session.partyStarterBadgesAwarded) return [];
    session.partyStarterBadgesAwarded = true;
    const earnedForSummary = [];
    const completedAt = new Date().toISOString();
    const standings = session.standings();
    const winner = standings[0] || null;
    session.selectedPlayers.forEach((player) => {
      const playerStats = normalizePlayerBadgeStats(this.profiles.getPlayerById(player.id)?.badgeStats);
      const badgeIds = ["party_starter"];
      if (playerStats.partyRuns >= 5) badgeIds.push("party_regular");
      if (winner?.playerId === player.id) {
        this.profiles.recordPartySessionWin(player.id, session.roundType);
        badgeIds.push("party_winner");
        if (session.roundType === PARTY_ROUND_TYPE_BEST_OF_3) badgeIds.push("best_of_3_winner");
        const cameBack = session.results.some((result) => (
          result.playerId === player.id && (result.partyComebackPlaces || 0) > 0
        ));
        if (cameBack) badgeIds.push("comeback_driver");
      }
      const earned = this.profiles.awardBadges(player.id, badgeIds, completedAt);
      if (player.id === summary?.playerId) earnedForSummary.push(...earned);
    });
    return earnedForSummary;
  }

  buildPlaytestRunSummary(summary) {
    const run = this.run || {};
    const directorStats = this.obstacles?.director?.getSimulationStats
      ? this.obstacles.director.getSimulationStats()
      : {};
    const partyStanding = this.getPartyStandingForSummary(summary);
    const challengeResult = summary.challengeResult || {};
    const averageSpeed = run.speedSampleSeconds > 0
      ? run.speedWeightedSum / run.speedSampleSeconds
      : (summary.time > 0 ? summary.distance / summary.time : 0);
    const visibleMeaningfulAverage = run.visibleMeaningfulSampleCount > 0
      ? run.visibleMeaningfulSampleSum / run.visibleMeaningfulSampleCount
      : (directorStats.visibleMeaningfulAverage || 0);
    const visibleMeaningfulMin = Number.isFinite(run.visibleMeaningfulMin)
      ? run.visibleMeaningfulMin
      : (directorStats.visibleMeaningfulMin || 0);
    const rewardLaneDistribution = normalizeCountMap(directorStats.rewardLaneCounts || {}, 8);
    return {
      runId: run.runId,
      timestamp: new Date().toISOString(),
      gameVersion: run.gameVersion || GAME_VERSION,
      playerDisplayName: summary.playerName,
      trackId: run.track?.id || TRACKS[0].id,
      trackName: summary.trackName,
      raceTypeId: summary.raceTypeId,
      raceTypeLabel: summary.raceTypeLabel,
      raceModeId: summary.speedClass,
      raceModeLabel: summary.speedClassLabel,
      challengeId: summary.challengeMode ? summary.challengeId : "",
      challengeName: summary.challengeMode ? summary.challengeName : "",
      challengeObjective: summary.challengeMode ? summary.challengeObjective : "",
      challengeCompleted: Boolean(challengeResult.completed),
      challengePreviousBest: challengeResult.previousBestScore || 0,
      challengeNewBest: Boolean(challengeResult.newBest || challengeResult.newlyCompleted),
      newlyEarnedBadges: Array.isArray(summary.newlyEarnedBadges)
        ? summary.newlyEarnedBadges.map((badge) => badge.id).filter(Boolean)
        : [],
      totalBadgesEarned: summary.totalBadgesEarned || 0,
      partyMode: Boolean(summary.partyMode),
      partySessionId: summary.partyMode ? (run.partySessionId || this.partySession?.sessionId || "") : "",
      partyRoundType: summary.partyMode ? (summary.partyRoundType || run.partyRoundType || PARTY_ROUND_TYPE_ONE_RUN) : PARTY_ROUND_TYPE_ONE_RUN,
      partyRoundIndex: summary.partyMode ? (summary.partyRoundIndex || run.partyRoundNumber || 0) : 0,
      partyTotalRounds: summary.partyMode ? (summary.partyTotalRounds || run.partyTotalRounds || 0) : 0,
      partySeedMode: summary.partyMode ? (summary.partySeedMode || run.partySeedMode || PARTY_SEED_MODE_SAME_ROUND) : PARTY_SEED_MODE_SAME_ROUND,
      partySeed: summary.partyMode ? (summary.partySeed || run.partySeed || run.roadSeed || "") : "",
      partyTotalScore: summary.partyMode ? (summary.partyTotalScore || 0) : 0,
      partyBestScore: summary.partyMode ? (summary.partyBestScore || 0) : 0,
      partyLeaderChanges: summary.partyMode ? (summary.partyLeaderChanges || run.partyLeaderChanges || 0) : 0,
      partyTurnIndex: summary.partyMode ? (run.partyTurnNumber || 0) : 0,
      partyPlayerCount: summary.partyMode ? (run.partyTotalPlayers || 0) : 0,
      partySharedSeed: summary.partyMode ? (this.partySession?.sharedSeed || run.roadSeed || "") : "",
      partyRankAfterRun: partyStanding?.rank || 0,
      partyStandingGap: partyStanding?.leaderMargin || 0,
      roadSeed: summary.seed,
      status: summary.status,
      finalScore: summary.finalScore,
      elapsedTime: summary.time,
      distanceCompleted: summary.distance,
      finishProgressPercent: summary.progress * 100,
      endReason: summary.reason,
      boostsUsed: summary.manualBoostsUsed,
      boostPadsCollected: run.boostPadsCollected || 0,
      rampsUsed: run.rampsUsed || 0,
      nearMisses: summary.nearMisses,
      slowdownHits: summary.slowdownHits,
      collisionType: summary.status === "crashed" ? (run.crashCollisionType || summary.reason || "") : "",
      laneChanges: summary.laneMoves,
      verticalMovementAmount: run.verticalMovementAmount || 0,
      centerLaneTime: run.centerLaneTime || 0,
      longestCenterLaneStreak: run.longestCenterLaneStreak || 0,
      averageSpeed,
      maxSpeed: run.maxSpeedObserved || run.currentSpeed || 0,
      finalSectionId: run.currentSectionId || "",
      finalSectionName: run.currentSectionLabel || "",
      roadDirectorWaveCount: directorStats.totalWaves || 0,
      wavesFirst10Seconds: directorStats.wavesFirst10Seconds || 0,
      launchWaveCount: directorStats.launchWaveCount || 0,
      meaningfulWaveCount: directorStats.meaningfulWaveCount || 0,
      supportWaveCount: directorStats.supportWaveCount || 0,
      popInPreventedCount: run.popInPreventedCount || 0,
      wavesSpawnedInsideVisibleCount: run.wavesSpawnedInsideVisibleCount || 0,
      maxWavesSpawnedInSingleFrame: run.maxWavesSpawnedInSingleFrame || 0,
      sectionTransitionWaveBurstCount: run.sectionTransitionWaveBurstCount || 0,
      catchUpSpawnsBlockedCount: run.catchUpSpawnsBlockedCount || 0,
      maxVisibleHardBlockers: run.maxVisibleHardBlockers || 0,
      maxTacticalHardBlockers: run.maxTacticalHardBlockers || 0,
      maxHardBlockersNext3Seconds: run.maxHardBlockersNext3Seconds || 0,
      maxHardBlockersInTwoSeconds: run.maxHardBlockersInTwoSeconds || 0,
      maxHardBlockersInThreeLaneNeighborhood: run.maxHardBlockersInThreeLaneNeighborhood || 0,
      visibleWaveOverlapMax: run.visibleWaveOverlapMax || 0,
      activeFieldBudgetDelays: run.activeFieldBudgetDelays || 0,
      activeFieldRejectedSpawns: run.activeFieldRejectedSpawns || 0,
      combinedRouteFailures: run.combinedRouteFailures || 0,
      barrierCount: run.barrierCount || 0,
      supportObjectsSuppressedByDensity: run.supportObjectsSuppressedByDensity || 0,
      deadScreenTime: run.deadScreenTime || directorStats.deadScreenTime || 0,
      longestDeadScreenSeconds: run.longestDeadScreenSeconds || directorStats.longestDeadScreenSeconds || 0,
      timeSinceLastMeaningfulDecisionMax: run.timeSinceLastMeaningfulDecisionMax || directorStats.timeSinceLastMeaningfulDecisionMax || 0,
      visibleMeaningfulMin,
      visibleMeaningfulAverage,
      upcomingDecisionGapMax: run.upcomingDecisionGapMax || directorStats.upcomingDecisionGapMax || 0,
      underActivityCorrections: run.underActivityCorrections || directorStats.underActivityCorrections || 0,
      overActivityDelays: run.overActivityDelays || directorStats.overActivityDelays || 0,
      directorIntentCounts: normalizeCountMap(directorStats.directorIntentCounts || {}),
      waveFamilyCounts: normalizeCountMap(directorStats.waveFamilyCounts || {}),
      rewardLaneDistribution,
      rampUseRate: directorStats.rampUseRate || 0,
      rampsSpawned: directorStats.rampsSpawned || 0,
      rampAirborneDuration: run.rampAirborneDuration || 0,
      rampClearDistance: run.rampClearDistance || 0,
      rampLandingSafetyDistance: run.rampLandingSafetyDistance || ROAD_READABILITY_CONFIG.rampLandingSafetyDistance,
      rampTargetsAssigned: run.rampTargetsAssigned || directorStats.rampTargetsAssigned || 0,
      rampTargetsCleared: run.rampTargetsCleared || directorStats.rampTargetsCleared || 0,
      rampLandingRejected: run.rampLandingRejected || directorStats.rampLandingRejected || 0,
      rampFailedToClearTarget: run.rampFailedToClearTarget || directorStats.rampFailedToClearTarget || 0,
      hardestPressureObserved: run.hardestPressureObserved || 0,
      gasCansSpawned: summary.gasCansSpawned,
      gasCansCollected: summary.gasCansCollected,
      fuelRemaining: summary.fuelRemaining,
      fuelSavedByBoost: isFuelRunRaceType(summary.raceTypeId) ? (run.fuelSavedByBoost || 0) : 0,
      fuelDrainPausedTime: isFuelRunRaceType(summary.raceTypeId) ? (run.fuelDrainPausedTime || 0) : 0,
      boostsUsedInFuelRun: isFuelRunRaceType(summary.raceTypeId) ? (run.boostsUsedInFuelRun || 0) : 0,
      lowestFuelReached: isFuelRunRaceType(summary.raceTypeId) ? (run.lowestFuelReached || 0) : 0,
      fuelAt25Percent: isFuelRunRaceType(summary.raceTypeId) ? run.fuelAt25Percent : null,
      fuelAt50Percent: isFuelRunRaceType(summary.raceTypeId) ? run.fuelAt50Percent : null,
      fuelAt75Percent: isFuelRunRaceType(summary.raceTypeId) ? run.fuelAt75Percent : null,
      gasCansSpawnedBySection: isFuelRunRaceType(summary.raceTypeId) ? normalizeSectionCountMap(run.gasCansSpawnedBySection) : {},
      gasCansCollectedBySection: isFuelRunRaceType(summary.raceTypeId) ? normalizeSectionCountMap(run.gasCansCollectedBySection) : {},
      longestNoFuelStretch: isFuelRunRaceType(summary.raceTypeId) ? (run.longestNoFuelStretchSeconds || 0) : 0,
      lowFuelTime: isFuelRunRaceType(summary.raceTypeId) ? (run.lowFuelSeconds || 0) : 0,
      criticalFuelTime: isFuelRunRaceType(summary.raceTypeId) ? (run.criticalFuelSeconds || 0) : 0,
      outOfFuelOccurred: summary.status === "outOfFuel"
    };
  }

  recordPlaytestRunSummary(summary) {
    if (!summary || !this.playtestReports) return null;
    const playtestRun = this.playtestReports.addRun(this.buildPlaytestRunSummary(summary));
    if (playtestRun) {
      summary.playtestRunId = playtestRun.runId;
    }
    return playtestRun;
  }

  endRace(status, reason) {
    const run = this.run;
    if (run.ended) return;
    status = normalizeRunStatus(status);
    run.pendingEndStatus = "";
    run.pendingEndReason = "";
    run.hitPauseTimer = 0;
    run.ended = true;
    run.finished = status === "finished";
    run.endReason = reason;
    run.crashCollisionType = status === "crashed"
      ? sanitizeName(reason || run.lastCollision, "Unknown", DISPLAY_TEXT_MAX_LENGTH)
      : "";
    run.crashFlash = status === "crashed" ? Math.max(run.crashFlash || 0, 1) : 0;
    run.screenShake = status === "crashed" ? Math.max(run.screenShake || 0, ARCADE_FEEL.crashShake) : run.screenShake;
    run.crashBeatTimer = status === "crashed" ? Math.max(run.crashBeatTimer || 0, 0.72) : 0;
    run.crashSparkTimer = status === "crashed" ? Math.max(run.crashSparkTimer || 0, ARCADE_FEEL.crashSparkMs / 1000) : run.crashSparkTimer;
    run.fuelOutBeatTimer = status === "outOfFuel" ? 0.78 : 0;

    if (status === "finished") {
      run.finishFlashTimer = ARCADE_FEEL.finishFlashSeconds;
      run.finishStripeTimer = ARCADE_FEEL.finishStripeMs / 1000;
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
      if (!run.crashSfxPlayed) {
        this.audio.playSfx("crash", {
          cooldownMs: 0,
          maxInstances: 1,
          volume: this.audio.sfxVolume
        });
      }
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
    const previousTitleBoard = this.profiles.getTitleBoard();
    const entry = debugSpeedScaleActive ? null : this.profiles.recordScore({
      runId: run.runId,
      playerId: player.id,
      playerName: player.name,
      carName: player.car.name,
      trackId: run.track.id,
      trackName: run.track.name,
      seed: run.roadSeed,
      speedClass: run.speedClassId,
      raceMode: run.speedClassId,
      raceType: run.raceTypeId,
      score: run.score,
      status,
      time: run.elapsed,
      slowdownHits: run.slowdownHits || 0,
      cleanRun: status === "finished" && (run.slowdownHits || 0) === 0,
      fuelCollected: run.gasCansCollected || 0,
      fuelRemaining: isFuelRunRaceType(run.raceTypeId) ? Math.max(0, Math.round(run.fuel || 0)) : 0,
      fuelBonus: run.bonuses.fuelBonus || 0,
      partyMode: Boolean(run.partyMode),
      partySessionId: run.partyMode ? run.partySessionId : "",
      partyRoundType: run.partyMode ? run.partyRoundType : PARTY_ROUND_TYPE_ONE_RUN,
      partyRoundIndex: run.partyMode ? run.partyRoundNumber : 0,
      partySeed: run.partyMode ? (run.partySeed || run.roadSeed) : "",
      challengeId: run.challengeMode ? run.challengeId : "",
      challengeName: run.challengeMode ? run.challengeName : "",
      challengeCompleted: false
    });
    const updatedProfilePlayer = this.profiles.getPlayerById(player.id) || profilePlayer;
    const topTwentyRank = entry ? this.profiles.data.leaderboard.indexOf(entry) + 1 : null;
    const topTwentyGap = !debugSpeedScaleActive && !entersTopTwenty && topTwentyCutoff >= 0
      ? Math.max(1, Math.round(topTwentyCutoff - run.score + 1))
      : 0;
    const scoreBreakdown = this.buildRunScoreBreakdown(run);
    const averageSpeed = run.speedSampleSeconds > 0
      ? run.speedWeightedSum / run.speedSampleSeconds
      : (run.elapsed > 0 ? Math.min(run.distance, run.track.distanceToFinish) / run.elapsed : 0);

    const summary = {
      scoreEntry: entry,
      runId: run.runId,
      player: snapshotPartyPlayer(player),
      playerId: player.id,
      playerName: player.name,
      carName: player.car.name,
      trackId: run.track.id,
      trackName: run.track.name,
      partyMode: Boolean(run.partyMode),
      partySessionId: run.partyMode ? run.partySessionId : "",
      partyRoundType: run.partyMode ? run.partyRoundType : PARTY_ROUND_TYPE_ONE_RUN,
      partyRoundTypeLabel: run.partyMode ? getPartyRoundTypeLabel(run.partyRoundType) : "",
      partyRoundIndex: run.partyMode ? run.partyRoundNumber : 0,
      partyTotalRounds: run.partyMode ? run.partyTotalRounds : 0,
      partySeedMode: run.partyMode ? run.partySeedMode : PARTY_SEED_MODE_SAME_ROUND,
      partySeedModeLabel: run.partyMode ? getPartySeedModeLabel(run.partySeedMode) : "",
      partySeed: run.partyMode ? (run.partySeed || run.roadSeed) : "",
      partyTurnIndex: run.partyMode ? run.partyTurnNumber : 0,
      partyTotalPlayers: run.partyMode ? run.partyTotalPlayers : 0,
      partyLeaderChanges: run.partyMode ? run.partyLeaderChanges : 0,
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
      averageSpeed,
      maxSpeed: run.maxSpeedObserved || run.currentSpeed || 0,
      bonuses: { ...run.bonuses },
      penalties: run.penalties,
      slowdownHits: run.slowdownHits || 0,
      nearMisses: run.nearMisses || 0,
      manualBoostsUsed: run.manualBoostsUsed || 0,
      boostPadsCollected: run.boostPadsCollected || 0,
      rampsUsed: run.rampsUsed || 0,
      rampTargetsCleared: run.rampTargetsCleared || 0,
      laneMoves: run.laneMoves || 0,
      gasCansSpawned: run.gasCansSpawned || 0,
      gasCansCollected: run.gasCansCollected || 0,
      fuelCollected: run.gasCansCollected || 0,
      fuelRemaining: isFuelRunRaceType(run.raceTypeId) ? Math.max(0, Math.round(run.fuel || 0)) : 0,
      lowestFuelReached: isFuelRunRaceType(run.raceTypeId) ? (run.lowestFuelReached || 0) : 0,
      fuelSavedByBoost: isFuelRunRaceType(run.raceTypeId) ? (run.fuelSavedByBoost || 0) : 0,
      fuelDrainPausedTime: isFuelRunRaceType(run.raceTypeId) ? (run.fuelDrainPausedTime || 0) : 0,
      boostsUsedInFuelRun: isFuelRunRaceType(run.raceTypeId) ? (run.boostsUsedInFuelRun || 0) : 0,
      fuelAt25Percent: isFuelRunRaceType(run.raceTypeId) ? run.fuelAt25Percent : null,
      fuelAt50Percent: isFuelRunRaceType(run.raceTypeId) ? run.fuelAt50Percent : null,
      fuelAt75Percent: isFuelRunRaceType(run.raceTypeId) ? run.fuelAt75Percent : null,
      gasCansSpawnedBySection: isFuelRunRaceType(run.raceTypeId) ? normalizeSectionCountMap(run.gasCansSpawnedBySection) : {},
      gasCansCollectedBySection: isFuelRunRaceType(run.raceTypeId) ? normalizeSectionCountMap(run.gasCansCollectedBySection) : {},
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
      if (summary.scoreEntry) {
        summary.scoreEntry.challengeCompleted = Boolean(summary.challengeResult?.completed && summary.challengeResult?.saved !== false);
        summary.scoreEntry.challengeName = summary.challengeName || summary.scoreEntry.challengeName;
        this.profiles.save();
      }
      if (summary.challengeResult?.completed) {
        summary.medals = [{
          title: "Challenge Complete",
          detail: summary.challengeName,
          tone: "hot"
        }].concat(summary.medals).slice(0, 3);
      }
    }
    this.profiles.recordBadgeRunStats(summary);
    summary.newlyEarnedBadges = this.profiles.evaluateRunBadges(summary);
    summary.totalBadgesEarned = this.profiles.getPlayerBadgeProgress(summary.playerId).earnedCount;
    summary.totalBadgesAvailable = getVisibleBadgeDefinitions().length;
    summary.titleChanges = this.profiles.evaluateRunTitles(summary, previousTitleBoard);
    this.lastSummary = summary;
    if (run.partyMode && this.partySession?.isPartyMode) {
      this.lastSummary.partyResult = this.partySession.addResult(this.lastSummary);
      const partyBadges = this.awardCompletedPartySessionBadges(this.partySession, this.lastSummary);
      if (partyBadges.length) {
        this.lastSummary.newlyEarnedBadges = this.lastSummary.newlyEarnedBadges.concat(partyBadges);
      }
      const partyStanding = this.getPartyStandingForSummary(this.lastSummary);
      if (partyStanding && this.lastSummary.partyResult) {
        this.lastSummary.partyResult.rank = partyStanding.rank;
        this.lastSummary.partyResult.leaderMargin = partyStanding.leaderMargin;
        this.lastSummary.partyRankAfterRun = partyStanding.rank;
        this.lastSummary.partyStandingGap = partyStanding.leaderMargin;
        this.lastSummary.partyLatestScore = partyStanding.latestScore;
        this.lastSummary.partyBestScore = partyStanding.bestScore;
        this.lastSummary.partyTotalScore = partyStanding.totalScore;
        this.lastSummary.partyCompletedRuns = partyStanding.completedRuns;
      }
      this.lastSummary.partyLeaderChanges = this.partySession.leaderChanges || 0;
      this.lastSummary.totalBadgesEarned = this.profiles.getPlayerBadgeProgress(this.lastSummary.playerId).earnedCount;
      this.lastSummary.totalBadgesAvailable = getVisibleBadgeDefinitions().length;
    }
    this.recordPlaytestRunSummary(this.lastSummary);

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
        currentSeed: "none",
        round: 0,
        totalRounds: 0,
        resultsCount: 0
      };
    }
    return {
      active: true,
      currentPlayer: session?.currentPlayer?.name || run?.player?.name || "none",
      currentTurn: run?.partyMode ? (run.partyTurnNumber || session?.currentTurnNumber || 1) : (session?.currentTurnNumber || 0),
      totalPlayers: run?.partyMode ? (run.partyTotalPlayers || session?.totalPlayers || 0) : (session?.totalPlayers || 0),
      sharedSeed: session?.sharedSeed || run?.roadSeed || "none",
      currentSeed: session?.currentSeed || run?.partySeed || run?.roadSeed || "none",
      round: run?.partyMode ? (run.partyRoundNumber || session?.roundNumber || 1) : (session?.roundNumber || 0),
      totalRounds: run?.partyMode ? (run.partyTotalRounds || session?.totalRounds || 0) : (session?.totalRounds || 0),
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

  async runTargetedDirectorChecks() {
    if (this.simulationRunning) return;
    this.simulationRunning = true;
    this.showSimulationRunning();
    const targets = [
      { trackId: "sunset-highway", raceTypeId: DEFAULT_RACE_TYPE_ID, speedClassId: "arcade" },
      { trackId: "sunset-highway", raceTypeId: DEFAULT_RACE_TYPE_ID, speedClassId: "turbo" },
      { trackId: "redline-run", raceTypeId: DEFAULT_RACE_TYPE_ID, speedClassId: "arcade" },
      { trackId: "redline-run", raceTypeId: DEFAULT_RACE_TYPE_ID, speedClassId: "turbo" },
      { trackId: "sunset-highway", raceTypeId: FUEL_RUN_RACE_TYPE_ID, speedClassId: "arcade" },
      { trackId: "sunset-highway", raceTypeId: FUEL_RUN_RACE_TYPE_ID, speedClassId: "turbo" }
    ];
    const results = [];
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      this.updateSimulationProgress(index, targets.length);
      const track = getTrackById(target.trackId);
      const summary = await this.runSpawnSafetySimulationCore({
        seed: `targeted-director-${target.trackId}-${target.raceTypeId}-${target.speedClassId}`,
        runs: 1,
        speedClassIds: [target.speedClassId],
        raceTypeId: target.raceTypeId,
        trackId: target.trackId,
        dt: 0.4
      });
      const budget = {
        ...ACTIVE_FIELD_BUDGET_CONFIG.default,
        ...(ACTIVE_FIELD_BUDGET_CONFIG[target.speedClassId] || {}),
        ...(isFuelRunRaceType(target.raceTypeId) ? ACTIVE_FIELD_BUDGET_CONFIG.fuelRun : {})
      };
      const passDetails = {
        noVisibleSpawnViolations: summary.visibleSpawnViolations === 0,
        maxWavesPerFrameOne: summary.maxWavesSpawnedInSingleFrame <= 1,
        activeFieldCapsRespected: summary.activeFieldCapsRespected,
        noEightCarClusters: summary.maxVisibleHardBlockers < 8,
        noDeadScreenLongerThanMode: summary.longestDeadScreenSeconds <= (budget.deadScreenLimitSeconds || 2) + 0.8,
        meaningfulActivityReported: (summary.visibleMeaningfulAverage || 0) > 0,
        noCheapStart: (summary.director?.sectionStats?.launch?.totalWaves || 0) > 0
          && (summary.director?.sectionStats?.launch?.meaningfulWavePercent || 0) > 0,
        routeReadable: summary.routeReadabilityFailures === 0 && summary.minorOnlyOpenLaneEvents === 0,
        noConsoleOnly: true
      };
      const pass = Object.values(passDetails).every(Boolean);
      results.push({
        ...target,
        trackName: track.name,
        raceTypeLabel: getRaceTypeLabel(target.raceTypeId),
        raceModeLabel: getSpeedClassLabel(target.speedClassId),
        pass,
        passDetails,
        metrics: {
          visibleSpawnViolations: summary.visibleSpawnViolations,
          maxWavesSpawnedInSingleFrame: summary.maxWavesSpawnedInSingleFrame,
          maxVisibleHardBlockers: summary.maxVisibleHardBlockers,
          maxTacticalHardBlockers: summary.maxTacticalHardBlockers,
          maxHardBlockersNext3Seconds: summary.maxHardBlockersNext3Seconds,
          maxVisibleWaveOverlap: summary.maxVisibleWaveOverlap,
          longestDeadScreenSeconds: summary.longestDeadScreenSeconds,
          visibleMeaningfulMin: summary.visibleMeaningfulMin,
          visibleMeaningfulAverage: summary.visibleMeaningfulAverage,
          upcomingDecisionGapMax: summary.upcomingDecisionGapMax,
          underActivityCorrections: summary.underActivityCorrections,
          overActivityDelays: summary.overActivityDelays,
          routeReadabilityFailures: summary.routeReadabilityFailures,
          minorOnlyOpenLaneEvents: summary.minorOnlyOpenLaneEvents,
          sameLaneOverlaps: summary.sameLaneOverlaps,
          boostObjectOverlaps: summary.boostObjectOverlaps,
          rampObjectOverlaps: summary.rampObjectOverlaps,
          gasCanOverlaps: summary.gasCanOverlaps
        },
        director: {
          intentCounts: summary.director?.directorIntentCounts || {},
          familyCounts: summary.director?.waveFamilyCounts || {},
          rewardLaneCounts: summary.director?.rewardLaneCounts || {}
        }
      });
    }
    this.updateSimulationProgress(targets.length, targets.length);
    const report = {
      generatedAt: new Date().toISOString(),
      totalRuns: targets.length,
      pass: results.every((result) => result.pass),
      results
    };
    this.targetedDirectorCheckStatus = report;
    this.simulationRunning = false;
    this.showTargetedDirectorCheckReport(report);
  }

  showTargetedDirectorCheckReport(report) {
    this.setScreen("targetedDirectorChecks");
    this.audio.playMusic("title", false);
    const row = (item) => {
      const checks = Object.entries(item.passDetails || {})
        .map(([key, value]) => `${key}: ${value ? "yes" : "no"}`)
        .join(" - ");
      return `
        <li class="leaderboard-item playtest-report-row">
          <span class="leaderboard-rank">${escapeHtml(item.pass ? "PASS" : "FAIL")}</span>
          <span class="meta">${escapeHtml(`${item.trackName} - ${item.raceTypeLabel} - ${item.raceModeLabel} - dead ${item.metrics.longestDeadScreenSeconds.toFixed(1)}s - visible avg ${item.metrics.visibleMeaningfulAverage.toFixed(2)} - max hard ${item.metrics.maxVisibleHardBlockers} - ${checks}`)}</span>
        </li>
      `;
    };
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel playtest-report-panel">
        <div class="playtest-report-header">
          <div>
            <span class="eyebrow">Local Development Only</span>
            <h2>Targeted Director Checks</h2>
            <p class="hint">${report.totalRuns} deterministic targeted runs. No broad simulation.</p>
          </div>
          <div class="playtest-report-status">
            <strong>${report.pass ? "PASS" : "FAIL"}</strong>
            <span>targeted matrix</span>
          </div>
        </div>
        <ol class="leaderboard-list playtest-report-list">
          ${(report.results || []).map(row).join("")}
        </ol>
        <div class="row playtest-action-row">
          <button class="small-button" data-action="title">Back to Title</button>
          <button class="small-button" data-action="roadDirectorLab">Road Director Lab</button>
        </div>
      </section>
    `;
    this.bindLayerButtons();
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
    const speedClassId = normalizeSpeedClassId(options.speedClassId, DEFAULT_SPEED_CLASS_ID);
    const baseTrack = getTrackById(options.track?.id || options.trackId || DEFAULT_TRACK_ID);
    const track = createRaceTrackForSpeedClass(baseTrack, speedClassId);
    const speedClass = getSpeedClassConfig(speedClassId);
    const requestedRaceTypeId = normalizeRaceTypeId(options.raceTypeId || options.raceType, DEFAULT_RACE_TYPE_ID);
    const raceTypeId = trackSupportsRaceType(baseTrack, requestedRaceTypeId) ? requestedRaceTypeId : DEFAULT_RACE_TYPE_ID;
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
    const track = getTrackById(options.track?.id || options.trackId || this.pendingTrackId || DEFAULT_TRACK_ID);
    const requestedRaceTypeId = normalizeRaceTypeId(options.raceTypeId || options.raceType, DEFAULT_RACE_TYPE_ID);
    const raceTypeId = trackSupportsRaceType(track, requestedRaceTypeId) ? requestedRaceTypeId : DEFAULT_RACE_TYPE_ID;
    const alternateSeed = normalizeRoadSeed(options.alternateSeed, seed === "TEST-456" ? "TEST-789" : "TEST-456");
    const alternateMode = speedClassId === "turbo" ? "arcade" : "turbo";
    const alternateRaceType = raceTypeId === FUEL_RUN_RACE_TYPE_ID ? DEFAULT_RACE_TYPE_ID : FUEL_RUN_RACE_TYPE_ID;
    const alternateTrack = getTrackById(options.alternateTrack?.id || options.alternateTrackId || TRACKS.find((item) => item.id !== track.id)?.id || track.id);
    const waveLimit = options.waveLimit || 10;
    const first = this.captureRoadDirectorSequence({ seed, speedClassId, raceTypeId, track, waveLimit });
    const repeat = this.captureRoadDirectorSequence({ seed, speedClassId, raceTypeId, track, waveLimit });
    const changedSeed = this.captureRoadDirectorSequence({ seed: alternateSeed, speedClassId, raceTypeId, track, waveLimit });
    const changedMode = this.captureRoadDirectorSequence({ seed, speedClassId: alternateMode, raceTypeId, track, waveLimit });
    const changedRaceType = this.captureRoadDirectorSequence({ seed, speedClassId, raceTypeId: alternateRaceType, track, waveLimit });
    const changedTrack = this.captureRoadDirectorSequence({ seed, speedClassId, raceTypeId, track: alternateTrack, waveLimit });
    const firstFingerprint = this.getRoadDirectorSequenceFingerprint(first.sequence);
    const repeatFingerprint = this.getRoadDirectorSequenceFingerprint(repeat.sequence);
    const changedSeedFingerprint = this.getRoadDirectorSequenceFingerprint(changedSeed.sequence);
    const changedModeFingerprint = this.getRoadDirectorSequenceFingerprint(changedMode.sequence);
    const changedRaceTypeFingerprint = this.getRoadDirectorSequenceFingerprint(changedRaceType.sequence);
    const changedTrackFingerprint = this.getRoadDirectorSequenceFingerprint(changedTrack.sequence);
    const differentTrackChanges = alternateTrack.id === track.id || firstFingerprint !== changedTrackFingerprint;
    const summary = {
      seed,
      alternateSeed,
      trackId: track.id,
      trackName: track.name,
      alternateTrackId: alternateTrack.id,
      alternateTrackName: alternateTrack.name,
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
      differentTrackChanges,
      first,
      repeat,
      changedSeed,
      changedMode,
      changedRaceType,
      changedTrack,
      pass: firstFingerprint === repeatFingerprint
        && firstFingerprint !== changedSeedFingerprint
        && firstFingerprint !== changedModeFingerprint
        && firstFingerprint !== changedRaceTypeFingerprint
        && differentTrackChanges
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
    const track = getTrackById(options.track?.id || options.trackId || DEFAULT_TRACK_ID);
    const dt = options.dt || 0.4;
    const pressureCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const hardBlockerPressureCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let pressureSamples = 0;
    let totalSamples = 0;
    let invalidWalls = 0;
    let hardBlockerWalls = 0;
    let hardBlockerFourLanePressure = 0;
    let flatHardBlockerRows = 0;
    let flatHardBlockerFourRows = 0;
    let flatHardBlockerFiveRows = 0;
    let maxSameRowHardBlockers = 0;
    let routeReadabilityFailures = 0;
    let minorOnlyOpenLaneEvents = 0;
    let rampUsefulnessSamples = 0;
    let rampsWithUsefulTarget = 0;
    let rampsWithoutUsefulTarget = 0;
    let unsafeRampLandings = 0;
    let maxBlocked = 0;
    let maxHardBlocked = 0;
    let worstPressure = null;
    let worstHardBlockerPressure = null;
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
    let visibleSpawnViolations = 0;
    let maxWavesSpawnedInSingleFrame = 0;
    let maxVisibleHardBlockers = 0;
    let maxTacticalHardBlockers = 0;
    let maxHardBlockersNext3Seconds = 0;
    let maxVisibleWaveOverlap = 0;
    let underActivityCorrections = 0;
    let overActivityDelays = 0;
    let longestDeadScreenSeconds = 0;
    let visibleMeaningfulMin = Infinity;
    let visibleMeaningfulAverageSum = 0;
    let visibleMeaningfulAverageSamples = 0;
    let upcomingDecisionGapMax = 0;
    const fuelOpportunitiesBySection = {};
    const invalidExamples = [];
    const hardBlockerExamples = [];
    const hardRowExamples = [];
    const routeExamples = [];
    const rampSafetyExamples = [];
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
        rampSolutionCount: 0,
        minorHazardCount: 0,
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
        waveFamilyCounts: {},
        directorIntentCounts: {},
        rewardLaneCounts: {
          center: 0,
          side: 0,
          left: 0,
          right: 0
        },
        sideLaneRewardCount: 0,
        centerRewardCount: 0,
        visibleMeaningfulMin: Infinity,
        visibleMeaningfulSampleSum: 0,
        visibleMeaningfulSampleCount: 0,
        upcomingDecisionGapMax: 0,
        deadScreenTime: 0,
        longestDeadScreenSeconds: 0,
        timeSinceLastMeaningfulDecisionMax: 0,
        underActivityCorrections: 0,
        overActivityDelays: 0,
        rampUseRateSum: 0,
        rampUseRateCount: 0,
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
        rampSolutionCount: 0,
        minorHazardCount: 0,
        fuelPatternCounts: {},
        pressureCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        waveCounts: {},
        waveFamilyCounts: {},
        directorIntentCounts: {}
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
      target.rampSolutionCount += source.rampSolutionCount || 0;
      target.minorHazardCount += source.minorHazardCount || 0;
      mergeCountMap(target.pressureCounts, source.pressureCounts);
      mergeCountMap(target.waveCounts, source.waveCounts);
      mergeCountMap(target.waveFamilyCounts, source.waveFamilyCounts);
      mergeCountMap(target.directorIntentCounts, source.directorIntentCounts);
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
          rampSolutionCount: stats.rampSolutionCount || 0,
          minorHazardCount: stats.minorHazardCount || 0,
          averageMinorHazardsPerWave: stats.totalWaves ? (stats.minorHazardCount || 0) / stats.totalWaves : 0,
          fuelPatternCounts: { ...(stats.fuelPatternCounts || {}) },
          longestActiveEmptySeconds: stats.longestActiveEmptySeconds,
          averageWaveGapSeconds: stats.waveGapCount ? stats.waveGapSum / stats.waveGapCount : null,
          averageMeaningfulWaveGapSeconds: stats.meaningfulWaveGapCount ? stats.meaningfulWaveGapSum / stats.meaningfulWaveGapCount : null,
          pressureCounts: { ...stats.pressureCounts },
          waveCounts: { ...stats.waveCounts },
          waveFamilyCounts: { ...(stats.waveFamilyCounts || {}) },
          directorIntentCounts: { ...(stats.directorIntentCounts || {}) },
          topWaveCounts: topCountList(stats.waveCounts, 5)
        }];
      }));
    }

    function createSectionSafetyStats(section = FALLBACK_TRACK_SECTION) {
      return {
        id: section.id || FALLBACK_TRACK_SECTION.id,
        label: section.label || section.id || FALLBACK_TRACK_SECTION.label,
        invalidWalls: 0,
        hardBlockerWalls: 0,
        hardBlockerFourLanePressure: 0,
        flatHardBlockerRows: 0,
        flatHardBlockerFourRows: 0,
        flatHardBlockerFiveRows: 0,
        routeReadabilityFailures: 0,
        minorOnlyOpenLaneEvents: 0,
        unsafeRampLandings: 0,
        sameLaneOverlaps: 0,
        boostObjectOverlaps: 0,
        rampObjectOverlaps: 0,
        gasCanOverlaps: 0,
        maxBlocked: 0,
        maxHardBlocked: 0,
        maxSameRowHardBlockers: 0
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
      target.rampSolutionCount += stats.rampSolutionCount || 0;
      target.minorHazardCount += stats.minorHazardCount || 0;
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
      mergeCountMap(target.waveFamilyCounts, stats.waveFamilyCounts);
      mergeCountMap(target.directorIntentCounts, stats.directorIntentCounts);
      mergeCountMap(target.rewardLaneCounts, stats.rewardLaneCounts);
      mergeCountMap(target.obstacleTypeCounts, stats.obstacleTypeCounts);
      mergeCountMap(target.fuelPatternCounts, stats.fuelPatternCounts);
      target.sideLaneRewardCount += stats.sideLaneRewardCount || 0;
      target.centerRewardCount += stats.centerRewardCount || 0;
      target.visibleMeaningfulMin = Math.min(target.visibleMeaningfulMin, Number.isFinite(stats.visibleMeaningfulMin) ? stats.visibleMeaningfulMin : Infinity);
      target.visibleMeaningfulSampleSum += (stats.visibleMeaningfulAverage || 0) * (stats.visibleMeaningfulSampleCount || 0);
      target.visibleMeaningfulSampleCount += stats.visibleMeaningfulSampleCount || 0;
      target.upcomingDecisionGapMax = Math.max(target.upcomingDecisionGapMax, stats.upcomingDecisionGapMax || 0);
      target.deadScreenTime += stats.deadScreenTime || 0;
      target.longestDeadScreenSeconds = Math.max(target.longestDeadScreenSeconds, stats.longestDeadScreenSeconds || 0);
      target.timeSinceLastMeaningfulDecisionMax = Math.max(target.timeSinceLastMeaningfulDecisionMax, stats.timeSinceLastMeaningfulDecisionMax || 0);
      target.underActivityCorrections += stats.underActivityCorrections || 0;
      target.overActivityDelays += stats.overActivityDelays || 0;
      if (Number.isFinite(stats.rampUseRate)) {
        target.rampUseRateSum += stats.rampUseRate;
        target.rampUseRateCount += 1;
      }
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
        rampSolutionCount: aggregate.rampSolutionCount || 0,
        minorHazardCount: aggregate.minorHazardCount || 0,
        averageMinorHazardsPerWave: aggregate.totalWaves ? (aggregate.minorHazardCount || 0) / aggregate.totalWaves : 0,
        fairnessFailures: aggregate.fairnessFailures,
        pressureBudgetFailures: aggregate.pressureBudgetFailures,
        pressureCounts: { ...aggregate.pressureCounts },
        waveCounts: { ...aggregate.waveCounts },
        waveFamilyCounts: { ...aggregate.waveFamilyCounts },
        directorIntentCounts: { ...aggregate.directorIntentCounts },
        rewardLaneCounts: { ...aggregate.rewardLaneCounts },
        sideLaneRewardCount: aggregate.sideLaneRewardCount || 0,
        centerRewardCount: aggregate.centerRewardCount || 0,
        visibleMeaningfulMin: Number.isFinite(aggregate.visibleMeaningfulMin) ? aggregate.visibleMeaningfulMin : 0,
        visibleMeaningfulAverage: aggregate.visibleMeaningfulSampleCount ? aggregate.visibleMeaningfulSampleSum / aggregate.visibleMeaningfulSampleCount : 0,
        upcomingDecisionGapMax: aggregate.upcomingDecisionGapMax || 0,
        deadScreenTime: aggregate.deadScreenTime || 0,
        longestDeadScreenSeconds: aggregate.longestDeadScreenSeconds || 0,
        timeSinceLastMeaningfulDecisionMax: aggregate.timeSinceLastMeaningfulDecisionMax || 0,
        underActivityCorrections: aggregate.underActivityCorrections || 0,
        overActivityDelays: aggregate.overActivityDelays || 0,
        rampUseRate: aggregate.rampUseRateCount ? aggregate.rampUseRateSum / aggregate.rampUseRateCount : 0,
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
      const runTrack = createRaceTrackForSpeedClass(track, speedClassId);
      perSpeedClass[speedClassId] = {
        label: speedClass.label,
        invalidWalls: 0,
        hardBlockerWalls: 0,
        hardBlockerFourLanePressure: 0,
        flatHardBlockerRows: 0,
        flatHardBlockerFourRows: 0,
        flatHardBlockerFiveRows: 0,
        maxSameRowHardBlockers: 0,
        routeReadabilityFailures: 0,
        minorOnlyOpenLaneEvents: 0,
        rampUsefulnessSamples: 0,
        rampsWithUsefulTarget: 0,
        rampsWithoutUsefulTarget: 0,
        unsafeRampLandings: 0,
        maxBlocked: 0,
        maxHardBlocked: 0,
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
        hardBlockerPressureCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        sectionSafety: {},
        director: createDirectorAggregate()
      };

      for (let runIndex = 0; runIndex < runsPerSpeedClass; runIndex += 1) {
        const seed = `${baseSeed}:${raceTypeId}:${speedClassId}:${runIndex}`;
        const rng = createSeededRandom(seed);
        const simRun = {
          track: runTrack,
          speedClassId,
          speedClass,
          raceTypeId,
          raceType: getRaceTypeConfig(raceTypeId),
          distance: 0,
          elapsed: 0,
          currentSpeed: getTrackCruiseSpeed(runTrack, 0, speedClassId)
        };
        this.configureFuelForRun(simRun);
        simRun.simulateFuelPickups = fuelRun;
        const simGame = {
          run: simRun,
          renderer: this.renderer,
          randomFloat: rng
        };
        const manager = new ObstacleManager(simGame);
        manager.reset(runTrack);
        const countedRampIds = new Set();
        let tacticalSampleIndex = 0;

        while (simRun.distance < runTrack.distanceToFinish) {
          const progress = clamp(simRun.distance / runTrack.distanceToFinish, 0, 1);
          const section = getTrackSection(runTrack, progress);
          const sectionSafety = ensureSectionSafety(perSpeedClass[speedClassId].sectionSafety, section);
          simRun.currentSpeed = getTrackCruiseSpeed(runTrack, progress, speedClassId);
          if (fuelRun) {
            this.updateFuelRunSimulationState(simRun, dt);
          }
          simRun.distance += simRun.currentSpeed * dt;
          simRun.elapsed += dt;
          manager.update(dt);

          const occupancy = manager.getDangerZoneLaneOccupancy(manager.obstacles, simRun.distance);
          const hardBlockers = manager.getHardBlockerLaneOccupancy(manager.obstacles, simRun.distance);
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
          const hardBlocked = clamp(hardBlockers.maxBlocked, 0, 5);
          if (hardBlocked > 0) {
            hardBlockerPressureCounts[hardBlocked] += 1;
            perSpeedClass[speedClassId].hardBlockerPressureCounts[hardBlocked] += 1;
          }
          if (hardBlocked === 4) {
            hardBlockerFourLanePressure += 1;
            perSpeedClass[speedClassId].hardBlockerFourLanePressure += 1;
            sectionSafety.hardBlockerFourLanePressure += 1;
          }
          if (hardBlocked > maxHardBlocked) {
            maxHardBlocked = hardBlocked;
            worstHardBlockerPressure = this.captureHardBlockerExample(runIndex, seed, simRun, hardBlockers);
          }
          if (hardBlocked > perSpeedClass[speedClassId].maxHardBlocked) {
            perSpeedClass[speedClassId].maxHardBlocked = hardBlocked;
          }
          sectionSafety.maxHardBlocked = Math.max(sectionSafety.maxHardBlocked, hardBlocked);
          if (hardBlockers.invalid) {
            hardBlockerWalls += 1;
            perSpeedClass[speedClassId].hardBlockerWalls += 1;
            sectionSafety.hardBlockerWalls += 1;
            const example = this.captureHardBlockerExample(runIndex, seed, simRun, hardBlockers);
            if (hardBlockerExamples.length < 8) hardBlockerExamples.push(example);
            if (hardBlockerWalls <= 8) {
              console.warn("Neon Road Rally hard-blocker wall", example);
            }
          }

          tacticalSampleIndex += 1;
          if (tacticalSampleIndex % 3 === 0) {
            const hardRows = manager.getHardBlockerRowOccupancy(manager.obstacles, { runDistance: simRun.distance });
            flatHardBlockerRows += hardRows.flatRows;
            flatHardBlockerFourRows += hardRows.fourLaneRows;
            flatHardBlockerFiveRows += hardRows.fiveLaneRows;
            perSpeedClass[speedClassId].flatHardBlockerRows += hardRows.flatRows;
            perSpeedClass[speedClassId].flatHardBlockerFourRows += hardRows.fourLaneRows;
            perSpeedClass[speedClassId].flatHardBlockerFiveRows += hardRows.fiveLaneRows;
            sectionSafety.flatHardBlockerRows += hardRows.flatRows;
            sectionSafety.flatHardBlockerFourRows += hardRows.fourLaneRows;
            sectionSafety.flatHardBlockerFiveRows += hardRows.fiveLaneRows;
            if (hardRows.maxBlocked > maxSameRowHardBlockers) {
              maxSameRowHardBlockers = hardRows.maxBlocked;
              if (hardRows.worstRow) {
                const example = this.captureHardRowExample(runIndex, seed, simRun, hardRows);
                if (hardRowExamples.length < 8) hardRowExamples.push(example);
              }
            }
            perSpeedClass[speedClassId].maxSameRowHardBlockers = Math.max(perSpeedClass[speedClassId].maxSameRowHardBlockers, hardRows.maxBlocked);
            sectionSafety.maxSameRowHardBlockers = Math.max(sectionSafety.maxSameRowHardBlockers, hardRows.maxBlocked);

            const route = manager.getRouteReadability(manager.obstacles, simRun.distance);
            if (route.routeFailures > 0) {
              routeReadabilityFailures += route.routeFailures;
              perSpeedClass[speedClassId].routeReadabilityFailures += route.routeFailures;
              sectionSafety.routeReadabilityFailures += route.routeFailures;
              if (routeExamples.length < 8) routeExamples.push(this.captureRouteExample(runIndex, seed, simRun, route));
            }
            if (route.minorOnlyOpenLaneEvents > 0) {
              minorOnlyOpenLaneEvents += route.minorOnlyOpenLaneEvents;
              perSpeedClass[speedClassId].minorOnlyOpenLaneEvents += route.minorOnlyOpenLaneEvents;
              sectionSafety.minorOnlyOpenLaneEvents += route.minorOnlyOpenLaneEvents;
            }

            const rampSafety = manager.getRampUsefulness(manager.obstacles, simRun.distance);
            for (const ramp of rampSafety.ramps) {
              if (countedRampIds.has(ramp.id)) continue;
              countedRampIds.add(ramp.id);
              rampUsefulnessSamples += 1;
              perSpeedClass[speedClassId].rampUsefulnessSamples += 1;
              if (ramp.useful) {
                rampsWithUsefulTarget += 1;
                perSpeedClass[speedClassId].rampsWithUsefulTarget += 1;
              } else {
                rampsWithoutUsefulTarget += 1;
                perSpeedClass[speedClassId].rampsWithoutUsefulTarget += 1;
                if (rampSafetyExamples.length < 8) rampSafetyExamples.push(this.captureRampSafetyExample(runIndex, seed, simRun, ramp));
              }
              if (ramp.unsafeLanding) {
                unsafeRampLandings += 1;
                perSpeedClass[speedClassId].unsafeRampLandings += 1;
                sectionSafety.unsafeRampLandings += 1;
              }
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
        visibleSpawnViolations += simRun.wavesSpawnedInsideVisibleCount || 0;
        maxWavesSpawnedInSingleFrame = Math.max(maxWavesSpawnedInSingleFrame, simRun.maxWavesSpawnedInSingleFrame || 0);
        maxVisibleHardBlockers = Math.max(maxVisibleHardBlockers, simRun.maxVisibleHardBlockers || 0);
        maxTacticalHardBlockers = Math.max(maxTacticalHardBlockers, simRun.maxTacticalHardBlockers || 0);
        maxHardBlockersNext3Seconds = Math.max(maxHardBlockersNext3Seconds, simRun.maxHardBlockersNext3Seconds || 0);
        maxVisibleWaveOverlap = Math.max(maxVisibleWaveOverlap, simRun.visibleWaveOverlapMax || 0);
        underActivityCorrections += simRun.underActivityCorrections || 0;
        overActivityDelays += simRun.overActivityDelays || 0;
        longestDeadScreenSeconds = Math.max(longestDeadScreenSeconds, simRun.longestDeadScreenSeconds || 0);
        if (Number.isFinite(simRun.visibleMeaningfulMin)) {
          visibleMeaningfulMin = Math.min(visibleMeaningfulMin, simRun.visibleMeaningfulMin);
        }
        if (simRun.visibleMeaningfulSampleCount > 0) {
          visibleMeaningfulAverageSum += simRun.visibleMeaningfulSampleSum / simRun.visibleMeaningfulSampleCount;
          visibleMeaningfulAverageSamples += 1;
        }
        upcomingDecisionGapMax = Math.max(upcomingDecisionGapMax, simRun.upcomingDecisionGapMax || 0);
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
    const hardBlockerFourLaneSamplePercent = totalSamples ? hardBlockerFourLanePressure / totalSamples : 0;
    const hardBlockerFourLaneRare = totalSamples ? hardBlockerFourLaneSamplePercent < 0.08 : true;
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
          && stats.longestActiveEmptySeconds <= 4.8
          && stats.longestDeadScreenSeconds <= ACTIVE_FIELD_BUDGET_CONFIG.arcade.deadScreenLimitSeconds + 0.5;
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
    const rampUsefulTargetPercent = rampUsefulnessSamples ? rampsWithUsefulTarget / rampUsefulnessSamples : 1;
    const rampUsefulnessPassed = rampUsefulnessSamples === 0 || rampUsefulTargetPercent >= 0.78;
    const flatHardRowsControlled = flatHardBlockerFiveRows === 0
      && flatHardBlockerFourRows === 0
      && maxSameRowHardBlockers <= ROAD_READABILITY_CONFIG.sameRowHardLimit;
    const routeReadabilityPassed = routeReadabilityFailures === 0 && minorOnlyOpenLaneEvents === 0;
    const unsafeRampLandingsPassed = unsafeRampLandings === 0;
    const fuelMinorHazardsNearZero = !fuelRun || director.averageMinorHazardsPerWave <= 0.05;
    const seedDeterminism = this.runSeedDeterminismTest({
      seed: "SECTION-TEST",
      speedClassId: DEFAULT_SPEED_CLASS_ID,
      trackId: track.id,
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
      && hardBlockerWalls === 0
      && maxBlocked <= 4
      && maxHardBlocked <= 4
      && flatHardRowsControlled
      && routeReadabilityPassed
      && rampUsefulnessPassed
      && unsafeRampLandingsPassed
      && hardBlockerFourLaneRare
      && sameLaneOverlaps === 0
      && boostObjectOverlaps === 0
      && rampObjectOverlaps === 0
      && gasCanOverlaps === 0
      && (!fuelRun || fuelOpportunitiesSufficient)
      && (!fuelRun || fuelNotFreeCenter)
      && (!fuelRun || fuelObjectMixPassed)
      && fuelMinorHazardsNearZero
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
    const activeBudgetForSummary = {
      ...ACTIVE_FIELD_BUDGET_CONFIG.default,
      ...(ACTIVE_FIELD_BUDGET_CONFIG[speedClassIds[0]] || {}),
      ...(fuelRun ? ACTIVE_FIELD_BUDGET_CONFIG.fuelRun : {})
    };
    const activeFieldCapsRespected = speedClassIds.length > 1 || (
      maxVisibleHardBlockers <= activeBudgetForSummary.maxVisibleHardBlockers
      && maxTacticalHardBlockers <= activeBudgetForSummary.maxTacticalHardBlockers
      && maxHardBlockersNext3Seconds <= activeBudgetForSummary.maxHardBlockersNext3Seconds
      && maxVisibleWaveOverlap <= activeBudgetForSummary.maxVisibleHardWaveOverlap
    );
    const deadScreenWithinModeLimit = speedClassIds.length > 1
      || longestDeadScreenSeconds <= (activeBudgetForSummary.deadScreenLimitSeconds || ACTIVE_FIELD_BUDGET_CONFIG.default.deadScreenLimitSeconds) + 0.8;

    return {
      runs,
      seed: baseSeed,
      raceTypeId,
      raceTypeLabel: getRaceTypeLabel(raceTypeId),
      invalidWalls,
      hardBlockerWalls,
      hardBlockerFourLanePressure,
      hardBlockerFourLaneSamplePercent,
      flatHardBlockerRows,
      flatHardBlockerFourRows,
      flatHardBlockerFiveRows,
      maxSameRowHardBlockers,
      routeReadabilityFailures,
      minorOnlyOpenLaneEvents,
      rampUsefulnessSamples,
      rampsWithUsefulTarget,
      rampsWithoutUsefulTarget,
      rampUsefulTargetPercent,
      unsafeRampLandings,
      trafficRelativeSpeedCompressionEvents: 0,
      sameLaneOverlaps,
      boostObjectOverlaps,
      rampObjectOverlaps,
      gasCanOverlaps,
      maxBlocked,
      maxHardBlocked,
      pressureCounts,
      hardBlockerPressureCounts,
      pressureSamples,
      totalSamples,
      frequencies,
      worstPressure,
      worstHardBlockerPressure,
      invalidExamples,
      hardBlockerExamples,
      hardRowExamples,
      routeExamples,
      rampSafetyExamples,
	      overlapExamples,
      preventedUnsafeSpawns,
      visibleSpawnViolations,
      maxWavesSpawnedInSingleFrame,
      maxVisibleHardBlockers,
      maxTacticalHardBlockers,
      maxHardBlockersNext3Seconds,
      maxVisibleWaveOverlap,
      activeFieldCapsRespected,
      underActivityCorrections,
      overActivityDelays,
      longestDeadScreenSeconds,
      visibleMeaningfulMin: Number.isFinite(visibleMeaningfulMin) ? visibleMeaningfulMin : 0,
      visibleMeaningfulAverage: visibleMeaningfulAverageSamples ? visibleMeaningfulAverageSum / visibleMeaningfulAverageSamples : 0,
      upcomingDecisionGapMax,
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
        zeroHardBlockerFiveLaneWalls: hardBlockerWalls === 0,
        zeroSameLaneOverlaps: sameLaneOverlaps === 0,
        zeroBoostOverlaps: boostObjectOverlaps === 0,
        zeroRampOverlaps: rampObjectOverlaps === 0,
        zeroGasCanOverlaps: gasCanOverlaps === 0,
        zeroVisibleSpawnViolations: visibleSpawnViolations === 0,
        maxWavesPerFrameOne: maxWavesSpawnedInSingleFrame <= 1,
        activeFieldCapsRespected,
        deadScreenWithinModeLimit,
        meaningfulActivityReported: director.visibleMeaningfulAverage > 0 || visibleMeaningfulAverage > 0,
        underActivityCorrectionsReported: underActivityCorrections >= 0,
        maxAtMostFour: maxBlocked <= 4,
        hardBlockerMaxAtMostFour: maxHardBlocked <= 4,
        hardBlockerFourLaneRare,
        flatHardRowsControlled,
        routeReadabilityPassed,
        rampUsefulnessPassed,
        unsafeRampLandingsPassed,
        fuelMinorHazardsNearZero,
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
        gasCanOverlap: overlap.gasCanOverlap,
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

  captureHardBlockerExample(runIndex, seed, simRun, occupancy) {
    const slice = occupancy.worstSlice || { y: 0, lanes: [], blockers: [], source: "none" };
    return {
      runIndex,
      seed,
      speedClass: simRun.speedClassId || DEFAULT_SPEED_CLASS_ID,
      raceType: simRun.raceTypeId || DEFAULT_RACE_TYPE_ID,
      progress: Number(clamp(simRun.distance / Math.max(1, simRun.track?.distanceToFinish || 1), 0, 1).toFixed(3)),
      distance: Math.round(simRun.distance),
      time: Number(simRun.elapsed.toFixed(1)),
      maxHardBlocked: occupancy.maxBlocked,
      source: slice.source || "unknown",
      sliceY: Math.round(slice.y || 0),
      ahead: Math.round(slice.ahead || 0),
      wallDistance: Math.round(slice.distance || simRun.distance),
      lanes: slice.lanes || [],
      blockers: (slice.blockers || []).slice(0, 12)
    };
  }

  captureHardRowExample(runIndex, seed, simRun, occupancy) {
    const row = occupancy.worstRow || { lanes: [], blockers: [], source: "world-row" };
    return {
      runIndex,
      seed,
      speedClass: simRun.speedClassId || DEFAULT_SPEED_CLASS_ID,
      raceType: simRun.raceTypeId || DEFAULT_RACE_TYPE_ID,
      progress: Number(clamp(simRun.distance / Math.max(1, simRun.track?.distanceToFinish || 1), 0, 1).toFixed(3)),
      distance: Math.round(simRun.distance),
      time: Number(simRun.elapsed.toFixed(1)),
      maxSameRowHardBlockers: occupancy.maxBlocked || 0,
      rowDistance: Math.round(row.distance || 0),
      ahead: Math.round(row.ahead || 0),
      lanes: row.lanes || [],
      limit: row.limit || ROAD_READABILITY_CONFIG.sameRowHardLimit,
      blockers: (row.blockers || []).slice(0, 12)
    };
  }

  captureRouteExample(runIndex, seed, simRun, route) {
    const slice = route.worstSlice || { hardLanes: [], minorLanes: [], openLanes: [], clearLanes: [], blockers: [] };
    return {
      runIndex,
      seed,
      speedClass: simRun.speedClassId || DEFAULT_SPEED_CLASS_ID,
      raceType: simRun.raceTypeId || DEFAULT_RACE_TYPE_ID,
      distance: Math.round(simRun.distance),
      time: Number(simRun.elapsed.toFixed(1)),
      routeFailures: route.routeFailures || 0,
      minorOnlyOpenLaneEvents: route.minorOnlyOpenLaneEvents || 0,
      sampleDistance: Math.round(slice.distance || 0),
      hardLanes: slice.hardLanes || [],
      minorLanes: slice.minorLanes || [],
      openLanes: slice.openLanes || [],
      clearLanes: slice.clearLanes || [],
      blockers: (slice.blockers || []).slice(0, 12)
    };
  }

  captureRampSafetyExample(runIndex, seed, simRun, ramp) {
    return {
      runIndex,
      seed,
      speedClass: simRun.speedClassId || DEFAULT_SPEED_CLASS_ID,
      raceType: simRun.raceTypeId || DEFAULT_RACE_TYPE_ID,
      distance: Math.round(simRun.distance),
      time: Number(simRun.elapsed.toFixed(1)),
      ramp
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
          <div class="score-card"><strong>Track</strong><span>${escapeHtml(summary.trackName || getTrackById(summary.trackId).name)}</span></div>
          <div class="score-card"><strong>Race Type</strong><span>${escapeHtml(getRaceTypeLabel(summary.raceTypeId))}</span></div>
          <div class="score-card"><strong>Race Mode</strong><span>${escapeHtml(getSpeedClassLabel(summary.speedClassId))}</span></div>
          <div class="score-card"><strong>Seed Hash</strong><span>${summary.seedHash >>> 0}</span></div>
          <div class="score-card"><strong>Same Seed</strong><span>${summary.sameSeedMatches ? "MATCH" : "DIFF"}</span></div>
          <div class="score-card"><strong>Different Seed</strong><span>${summary.differentSeedChanges ? "CHANGED" : "SAME"}</span></div>
          <div class="score-card"><strong>Different Mode</strong><span>${summary.differentModeChanges ? "CHANGED" : "SAME"}</span></div>
          <div class="score-card"><strong>Different Type</strong><span>${summary.differentRaceTypeChanges ? "CHANGED" : "SAME"}</span></div>
          <div class="score-card"><strong>Different Track</strong><span>${summary.differentTrackChanges ? "CHANGED" : "SAME"}</span></div>
          <div class="score-card"><strong>Waves Checked</strong><span>${summary.waveLimit}</span></div>
        </div>
        <p class="hint">First sequence: ${escapeHtml(summary.first.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
        <p class="hint">Changed-seed sequence: ${escapeHtml(summary.changedSeed.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
        <p class="hint">Changed-mode sequence: ${escapeHtml(summary.changedMode.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
        <p class="hint">Changed-type sequence: ${escapeHtml(summary.changedRaceType.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
        <p class="hint">Changed-track sequence: ${escapeHtml(summary.changedTrack.sequence.slice(0, 8).map(sequenceLine).join(" | "))}</p>
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
        <p id="simProgress" class="status-line">Checking danger-zone occupancy, hard-blocker tactical walls, and obstacle hitboxes.</p>
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
      const rampText = item.rampUsefulnessSamples
        ? `, ramps ${item.rampsWithUsefulTarget}/${item.rampUsefulnessSamples} useful`
        : "";
      return `${item.label}: ${item.invalidWalls} walls, ${item.hardBlockerWalls || 0} hard walls, max ${item.maxBlocked}, hard max ${item.maxHardBlocked || 0}, hard4 ${(item.hardBlockerFourLanePressure || 0).toLocaleString()}, row max ${item.maxSameRowHardBlockers || 0}, flat4 ${item.flatHardBlockerFourRows || 0}, route ${item.routeReadabilityFailures || 0}, minor-open ${item.minorOnlyOpenLaneEvents || 0}, ${item.sameLaneOverlaps} overlaps, min gap ${minSpacing}, ${centerPercent}, ${fmtSeconds(gap)} meaningful, ${fmtSeconds(empty)} longest empty, ${highPressure}, budget misses ${budgetFailures}${rampText}${fuelText}`;
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
        return `${section.label} ${stats.totalWaves || 0}w p${Number.isFinite(stats.averagePressure) ? stats.averagePressure.toFixed(2) : "0.00"} minor/w ${Number.isFinite(stats.averageMinorHazardsPerWave) ? stats.averageMinorHazardsPerWave.toFixed(2) : "0.00"} empty ${fmtSeconds(stats.longestActiveEmptySeconds)} center ${fmtPercent(stats.centerBlockedPercent)} walls ${safety.invalidWalls || 0} hard ${safety.hardBlockerWalls || 0}/${safety.maxHardBlocked || 0} row ${safety.maxSameRowHardBlockers || 0} route ${safety.routeReadabilityFailures || 0} overlaps ${overlaps}`;
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
    const hardWorst = summary.worstHardBlockerPressure;
    const hardBlockerPressure = [1, 2, 3, 4, 5].map((blocked) => {
      const count = summary.hardBlockerPressureCounts?.[blocked] || 0;
      return `${blocked}-hard ${count.toLocaleString()}`;
    }).join(" · ");
    const hardBlockerSummary = (summary.hardBlockerExamples || []).length
      ? (summary.hardBlockerExamples || []).slice(0, 4).map((example) => {
        const blockers = example.blockers.map((blocker) => `${blocker.type} L${blocker.obstacleLane + 1}@${blocker.distance} ${blocker.wave || ""}`).join("; ");
        return `run ${example.runIndex} ${example.speedClass} ${example.raceType} p${example.progress} d${example.distance}: ${example.maxHardBlocked} hard lanes ${example.lanes.join(", ")} via ${example.source}; ${blockers}`;
      }).join(" | ")
      : "none";
    const hardRowSummary = (summary.hardRowExamples || []).length
      ? (summary.hardRowExamples || []).slice(0, 4).map((example) => {
        const blockers = example.blockers.map((blocker) => `${blocker.type} L${blocker.obstacleLane + 1}@${blocker.distance} ${blocker.wave || ""}`).join("; ");
        return `run ${example.runIndex} ${example.speedClass} d${example.distance}: ${example.maxSameRowHardBlockers} same-row hard lanes ${example.lanes.join(", ")} limit ${example.limit}; ${blockers}`;
      }).join(" | ")
      : "none";
    const routeSummary = (summary.routeExamples || []).length
      ? (summary.routeExamples || []).slice(0, 4).map((example) => `run ${example.runIndex} ${example.speedClass} d${example.distance}: hard ${example.hardLanes.join(",")} minor ${example.minorLanes.join(",")} clear ${example.clearLanes.join(",")}`)
        .join(" | ")
      : "none";
    const rampSummary = (summary.rampSafetyExamples || []).length
      ? (summary.rampSafetyExamples || []).slice(0, 4).map((example) => `run ${example.runIndex} ${example.speedClass} d${example.distance}: ramp L${example.ramp.lane + 1}@${example.ramp.distance} ${example.ramp.wave} useful ${example.ramp.useful ? "yes" : "no"} unsafe ${example.ramp.unsafeLanding ? "yes" : "no"} target ${example.ramp.targetType || "none"}@${example.ramp.targetDistance || "n/a"}`)
        .join(" | ")
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
          <div class="score-card"><strong>Hard 5-Lane Walls</strong><span>${(summary.hardBlockerWalls || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Hard 4-Lane Pressure</strong><span>${(summary.hardBlockerFourLanePressure || 0).toLocaleString()} · ${fmtPercent(summary.hardBlockerFourLaneSamplePercent || 0)}</span></div>
          <div class="score-card"><strong>Flat Hard Rows</strong><span>${(summary.flatHardBlockerRows || 0).toLocaleString()} · 4-row ${(summary.flatHardBlockerFourRows || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Max Same-Row Hard</strong><span>${summary.maxSameRowHardBlockers || 0}</span></div>
          <div class="score-card"><strong>Route Failures</strong><span>${(summary.routeReadabilityFailures || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Minor Only Open Lane</strong><span>${(summary.minorOnlyOpenLaneEvents || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Ramp Targets</strong><span>${(summary.rampsWithUsefulTarget || 0).toLocaleString()} / ${(summary.rampUsefulnessSamples || 0).toLocaleString()} · ${fmtPercent(summary.rampUsefulTargetPercent)}</span></div>
          <div class="score-card"><strong>Unsafe Ramp Landings</strong><span>${(summary.unsafeRampLandings || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Traffic Compression</strong><span>${(summary.trafficRelativeSpeedCompressionEvents || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Object Overlaps</strong><span>${summary.sameLaneOverlaps.toLocaleString()}</span></div>
          <div class="score-card"><strong>Boost Overlaps</strong><span>${summary.boostObjectOverlaps.toLocaleString()}</span></div>
          <div class="score-card"><strong>Ramp Overlaps</strong><span>${summary.rampObjectOverlaps.toLocaleString()}</span></div>
          <div class="score-card"><strong>Gas Can Overlaps</strong><span>${(summary.gasCanOverlaps || 0).toLocaleString()}</span></div>
          <div class="score-card"><strong>Max Blocked</strong><span>${summary.maxBlocked}</span></div>
          <div class="score-card"><strong>Max Hard Blocked</strong><span>${summary.maxHardBlocked || 0}</span></div>
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
          <div class="score-card"><strong>Minor / Wave</strong><span>${Number.isFinite(director.averageMinorHazardsPerWave) ? director.averageMinorHazardsPerWave.toFixed(2) : "n/a"}</span></div>
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
        <p class="hint">
          Worst hard blockers: ${hardWorst ? `${hardWorst.maxHardBlocked} lanes at run ${hardWorst.runIndex}, ${hardWorst.raceType} ${hardWorst.speedClass}, progress ${hardWorst.progress}, distance ${hardWorst.distance}, ${hardWorst.source} y ${hardWorst.sliceY}, lanes ${hardWorst.lanes.join(", ")}` : "none"}.
        </p>
        <p class="hint">${escapeHtml(speedClassSummary)}</p>
        <p class="hint">Director pressure: ${escapeHtml(directorPressure)}.</p>
        <p class="hint">Hard-blocker pressure: ${escapeHtml(hardBlockerPressure)}.</p>
        <p class="hint">Hard-row examples: ${escapeHtml(hardRowSummary)}</p>
        <p class="hint">Route examples: ${escapeHtml(routeSummary)}</p>
        <p class="hint">Ramp safety examples: ${escapeHtml(rampSummary)}</p>
        <p class="hint">Section checks: ${escapeHtml(sectionChecks)}.</p>
        <p class="hint">Section distribution: ${escapeHtml(sectionSummary)}</p>
        <p class="hint">Boost lanes: ${escapeHtml(laneDistribution(director.boostLaneCounts, director.boostLaneDistribution))}</p>
        <p class="hint">Ramp lanes: ${escapeHtml(laneDistribution(director.rampLaneCounts, director.rampLaneDistribution))}</p>
        ${summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID ? `<p class="hint">Gas lanes: ${escapeHtml(laneDistribution(director.gasCanLaneCounts, director.gasCanLaneDistribution))}</p>` : ""}
        <p class="hint">Top waves: ${escapeHtml(topList(director.topWaveCounts))}</p>
        ${summary.raceTypeId === FUEL_RUN_RACE_TYPE_ID ? `<p class="hint">Fuel patterns: ${escapeHtml(topList(director.topFuelPatterns))}</p>` : ""}
        <p class="hint">Obstacle mix: ${escapeHtml(topList(director.topObstacleTypes))}</p>
        <p class="hint">Overlap examples: ${escapeHtml(overlapSummary)}</p>
        <p class="hint">Hard-blocker wall examples: ${escapeHtml(hardBlockerSummary)}</p>
        <p class="hint">
          Checks: zero 5-lane walls ${summary.passDetails.zeroFiveLaneWalls ? "yes" : "no"} · zero hard-blocker 5-lane walls ${summary.passDetails.zeroHardBlockerFiveLaneWalls ? "yes" : "no"} · hard max <= 4 ${summary.passDetails.hardBlockerMaxAtMostFour ? "yes" : "no"} · flat rows controlled ${summary.passDetails.flatHardRowsControlled ? "yes" : "no"} · route readable ${summary.passDetails.routeReadabilityPassed ? "yes" : "no"} · ramp targets ${summary.passDetails.rampUsefulnessPassed ? "yes" : "no"} · safe ramp landings ${summary.passDetails.unsafeRampLandingsPassed ? "yes" : "no"} · hard 4-lane rare ${summary.passDetails.hardBlockerFourLaneRare ? "yes" : "no"} · zero overlaps ${summary.passDetails.zeroSameLaneOverlaps ? "yes" : "no"} · zero boost overlaps ${summary.passDetails.zeroBoostOverlaps ? "yes" : "no"} · zero ramp overlaps ${summary.passDetails.zeroRampOverlaps ? "yes" : "no"} · zero gas overlaps ${summary.passDetails.zeroGasCanOverlaps ? "yes" : "no"} · fuel opportunities ${summary.passDetails.fuelOpportunitiesSufficient ? "yes" : "n/a"} · fuel mix ${summary.passDetails.fuelObjectMixPassed ? "yes" : "n/a"} · fuel minor near zero ${summary.passDetails.fuelMinorHazardsNearZero ? "yes" : "n/a"} · gas not center-free ${summary.passDetails.fuelNotFreeCenter ? "yes" : "n/a"} · 4-lane rare ${summary.passDetails.fourLaneRare ? "yes" : "no"} · 2/3 common ${summary.passDetails.directorTwoThreeCommon ? "yes" : "no"} · center challenged ${summary.passDetails.centerChallengedRegularly ? "yes" : "no"} · budget respected ${summary.passDetails.directorPressureBudgetPassed ? "yes" : "no"} · boosts distributed ${summary.passDetails.boostNotMostlyCenter ? "yes" : "no"} · no Arcade dead air ${summary.passDetails.arcadeNoDeadAir ? "yes" : "no"} · Pro/Turbo pressure ${summary.passDetails.proTurboThreeLaneFrequent ? "yes" : "no"} · section shape ${summary.passDetails.finalPushMoreIntenseThanGroove && summary.passDetails.breatherCalmerThanPressure && summary.passDetails.breatherNotEmpty ? "yes" : "no"} · seeded deterministic ${summary.passDetails.seededDeterminismPassed ? "yes" : "no"} · pattern repeats controlled ${summary.passDetails.repeatedPatternsControlled ? "yes" : "no"}.
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

  shouldShowNewDriverHint() {
    const player = this.profiles.getCurrentPlayer();
    const leaderboardHasRuns = Array.isArray(this.profiles.data.leaderboard) && this.profiles.data.leaderboard.length > 0;
    return !player || (!leaderboardHasRuns && (player.bestScore || 0) <= 0);
  }

  renderNewDriverHint() {
    if (!this.shouldShowNewDriverHint()) return "";
    return `
      <p class="new-driver-hint">
        <strong>New?</strong>
        Start with Arcade on Sunset Highway. Rookie and Sunday Drive live under Training if needed.
      </p>
    `;
  }

  getWeekendPlaytestPick(id) {
    return WEEKEND_PLAYTEST_PICKS.find((pick) => pick.id === id) || null;
  }

  renderWeekendPlaytestPicks({
    context = "default",
    heading = "Playtest Picks",
    hint = "Use these to pick a weekend test without changing game rules.",
    filter = "all",
    includeActions = true
  } = {}) {
    const picks = WEEKEND_PLAYTEST_PICKS.filter((pick) => {
      const isPartyPick = Boolean(pick.partyRoundType);
      if (filter === "party") return isPartyPick;
      if (filter === "solo") return !isPartyPick;
      return true;
    });
    if (!picks.length) return "";
    return `
      <section class="weekend-prep-panel is-${escapeAttr(context)}">
        <div class="weekend-prep-header">
          <div>
            <span class="eyebrow">Weekend Prep</span>
            <h3>${escapeHtml(heading)}</h3>
          </div>
          ${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ""}
        </div>
        <div class="playtest-pick-grid">
          ${picks.map((pick) => this.renderWeekendPlaytestPickCard(pick, includeActions)).join("")}
        </div>
      </section>
    `;
  }

  renderWeekendPlaytestPickCard(pick, includeActions = true) {
    const isPartyPick = Boolean(pick.partyRoundType);
    const raceTypeLabel = getRaceTypeLabel(pick.raceTypeId);
    const speedLabel = getSpeedClassLabel(pick.speedClassId);
    const partyRoundLabel = isPartyPick ? getPartyRoundTypeLabel(pick.partyRoundType) : "";
    const partySeedLabel = isPartyPick ? getPartySeedModeLabel(pick.partySeedMode) : "";
    return `
      <article class="playtest-pick-card ${isPartyPick ? "is-party" : "is-solo"}">
        <div>
          <h4>${escapeHtml(pick.title)}</h4>
          <p>${escapeHtml(pick.suggestedUse)}</p>
        </div>
        <div class="playtest-pick-lines">
          <span><strong>Track</strong>${escapeHtml(pick.trackLabel)}</span>
          <span><strong>Race Type</strong>${escapeHtml(raceTypeLabel)}</span>
          <span><strong>Race Mode</strong>${escapeHtml(speedLabel)}</span>
          ${isPartyPick ? `<span><strong>Party Type</strong>${escapeHtml(partyRoundLabel)}</span>` : ""}
          ${isPartyPick ? `<span><strong>Seed</strong>${escapeHtml(partySeedLabel)}</span>` : ""}
        </div>
        ${pick.note ? `<p class="playtest-pick-note">${escapeHtml(pick.note)}</p>` : ""}
        ${includeActions ? `
          <button class="small-button ${isPartyPick ? "" : "primary"}" data-action="applyPlaytestPick" data-id="${escapeAttr(pick.id)}">
            ${isPartyPick ? "Apply Party Setup" : "Apply Solo Setup"}
          </button>
        ` : ""}
      </article>
    `;
  }

  renderWeekendPlaytestChecklist({ compact = false } = {}) {
    return `
      <section class="weekend-checklist-card ${compact ? "is-compact" : ""}">
        <div>
          <span class="eyebrow">Weekend Test Route</span>
          <h3>Weekend Playtest Checklist</h3>
        </div>
        <ul class="weekend-checklist">
          ${WEEKEND_PLAYTEST_CHECKLIST.map((item) => `
            <li><span aria-hidden="true"></span>${escapeHtml(item)}</li>
          `).join("")}
        </ul>
      </section>
    `;
  }

  renderPartySetupHelp() {
    return `
      <div class="party-help-grid" aria-label="Party setup help">
        ${PARTY_SETUP_HELP_ITEMS.map((item) => `
          <div class="party-help-card">
            <strong>${escapeHtml(item.title)}:</strong>
            <span>${escapeHtml(item.text)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  renderResetCleanupReminder() {
    return `
      <div class="reset-cleanup-reminder">
        <strong>Reset / cleanup reminder</strong>
        <span>Clear Playtest Reports only clears tuning reports.</span>
        <span>Reset Local Data clears profiles, scores, badges, titles, settings, and car choices.</span>
        <span>Use carefully before a real play session.</span>
      </div>
    `;
  }

  getHowToPlayTabs() {
    return [
      { id: "basics", label: "Basics" },
      { id: "modes", label: "Modes" },
      { id: "party", label: "Party" },
      { id: "rewards", label: "Rewards" },
      { id: "playtest", label: "Playtest" }
    ];
  }

  getHowToPlaySections() {
    return {
      basics: [
        {
          title: "Basic Controls",
          chips: ["Arrows / WASD", "Space Boost", "Enter", "F Fullscreen"],
          points: [
            "Arrow keys or WASD move the car.",
            "Left/Right: tap once to change one lane.",
            "Holding left/right does not sweep lanes. Each lane change needs a fresh tap.",
            "Up/Down: hold to move forward or back on screen.",
            "Space uses manual boost. Enter selects or continues. F toggles fullscreen if supported."
          ]
        },
        {
          title: "Main Goal",
          chips: ["Avoid", "Survive", "Score", "Finish"],
          points: [
            "Avoid traffic and survive the road.",
            "Chase score and finish the run if possible.",
            "Near misses, boosts, ramps, and clean driving improve score."
          ]
        },
        {
          title: "Tracks",
          chips: ["Sunset Highway", "Redline Run"],
          points: [
            "Sunset Highway is the balanced arcade road with mixed hazards and is the best starting track.",
            "Redline Run is a faster neon expressway: cleaner, more intense, and backed by dedicated Redline music."
          ]
        },
        {
          title: "Ramps",
          chips: ["Jump", "Clear", "Land"],
          points: [
            "Ramps jump over road objects.",
            "A good ramp can clear cars, trucks, barriers, and smaller hazards.",
            "Landing still matters, so be ready for the next lane choice."
          ]
        }
      ],
      modes: [
        {
          title: "Race Types",
          chips: ["Classic", "Fuel Run"],
          points: [
            "Classic: survive, score, and finish.",
            "Fuel Run: fuel drains over time, gas cans refill it, manual boost saves fuel, and running out ends the run."
          ]
        },
        {
          title: "Race Modes",
          chips: ["Arcade", "Pro", "Turbo", "Overdrive", "Redline"],
          points: [
            "Arcade is the default family-speed race.",
            "Pro adds serious traffic pressure.",
            "Turbo is fast, dangerous, and fair.",
            "Overdrive is a short high-speed dare run.",
            "Redline is maximum-speed local bragging rights."
          ]
        },
        {
          title: "Challenge Mode",
          chips: ["Fixed Seeds", "Objectives", "Practice"],
          points: [
            "Challenge Mode uses fixed seeds and specific objectives.",
            "It is good for replay, practice, and learning a track without changing the setup every run."
          ]
        }
      ],
      party: [
        {
          title: "Party Mode",
          chips: ["Local", "Pass Keyboard", "Same Seed"],
          points: [
            "Party Mode is local pass-the-keyboard competition on one computer.",
            "Players use the same seed for fair comparison.",
            "One Run Each, Best of 3, and Total Score decide the winner by highest score."
          ]
        }
      ],
      rewards: [
        {
          title: "Badges and Titles",
          chips: ["Badges", "Titles", "Fair"],
          points: [
            "Badges are permanent local achievements.",
            "Titles are local crowns that can be taken by another player.",
            "Rewards do not give stat upgrades, so fairness stays intact."
          ]
        },
        {
          title: "Local Saves",
          chips: ["Browser Save", "Local Only", "No Online Board"],
          points: [
            "Profiles, scores, badges, and titles save locally in this browser or computer.",
            "Clearing browser data can remove progress.",
            "There is no online leaderboard yet."
          ]
        }
      ],
      playtest: [
        {
          title: "Weekend Flow",
          chips: ["Picks", "Checklist", "Report"],
          points: [
            "Start with First Arcade Race or Family Arcade before jumping to Redline Dare.",
            "Use Party Starter when the room wants pass-the-keyboard competition.",
            "After the session, open Playtest Report, copy it, and paste it into ChatGPT for tuning notes."
          ]
        }
      ]
    };
  }

  renderGuideCard(section) {
    return `
      <article class="how-to-card">
        <div class="how-to-card-header">
          <h3>${escapeHtml(section.title)}</h3>
          <div class="how-to-chip-row">
            ${section.chips.map((chip) => `<span class="how-to-chip">${escapeHtml(chip)}</span>`).join("")}
          </div>
        </div>
        <ul>
          ${section.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
        </ul>
      </article>
    `;
  }

  getGuideReturnLabel() {
    if (this.guideReturnScreen === "settings") return "Settings";
    if (this.guideReturnScreen === "partySetup") return "Party Setup";
    if (this.guideReturnScreen === "challenges") return "Challenge Mode";
    if (this.guideReturnScreen === "preRace") return "Race Setup";
    return "Title";
  }

  openHowToPlayFromCurrentScreen() {
    if (this.screen === "partySetup") this.readPartySetupForm();
    this.guideReturnScreen = ["settings", "partySetup", "challenges", "preRace"].includes(this.screen)
      ? this.screen
      : "title";
    this.showHowToPlayScreen("basics");
  }

  showHowToPlayScreen(tabId = "basics") {
    const tabs = this.getHowToPlayTabs();
    const sectionsByTab = this.getHowToPlaySections();
    const safeTab = tabs.some((tab) => tab.id === tabId) ? tabId : "basics";
    this.guideTab = safeTab;
    this.setScreen("howToPlay");
    this.audio.playMusic("title", false);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel how-to-panel">
        <div class="how-to-header">
          <div>
            <span class="eyebrow">Driver Guide</span>
            <h2>How To Play</h2>
            <p class="hint">Fast rules for new drivers, kids, party guests, and website visitors.</p>
          </div>
          <div class="how-to-tab-row" role="tablist" aria-label="How To Play sections">
            ${tabs.map((tab) => `
              <button class="small-button how-to-tab ${tab.id === safeTab ? "primary" : ""}" data-action="guideTab" data-tab="${escapeAttr(tab.id)}" role="tab" aria-selected="${tab.id === safeTab ? "true" : "false"}">
                ${escapeHtml(tab.label)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="how-to-grid">
          ${sectionsByTab[safeTab].map((section) => this.renderGuideCard(section)).join("")}
        </div>
        ${safeTab === "playtest" ? `
          ${this.renderWeekendPlaytestPicks({ context: "guide", heading: "Recommended Setups", hint: "Apply one, then review the setup before starting." })}
          ${this.renderWeekendPlaytestChecklist()}
        ` : ""}
        <div class="row how-to-actions">
          <button class="small-button primary" data-action="guideBack">Back to ${escapeHtml(this.getGuideReturnLabel())}</button>
          <button class="small-button" data-action="title">Title</button>
        </div>
      </section>
    `;
    this.bindLayerButtons();
  }

  handleGuideBack() {
    const target = this.guideReturnScreen || "title";
    if (target === "settings") this.showSettingsScreen();
    else if (target === "partySetup") this.showPartySetupScreen();
    else if (target === "challenges") this.showChallengeScreen();
    else if (target === "preRace") this.showPreRaceScreen();
    else this.showTitle();
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
    const badgeProgress = player ? this.profiles.getPlayerBadgeProgress(player) : null;
    const playerDetail = player
      ? `Driving ${escapeHtml(player.car.name)} - Badges ${badgeProgress.earnedCount}/${badgeProgress.totalCount}`
      : "Create or choose a local driver";
    const audioStatus = `Music ${this.audio.musicMuted ? "Muted" : "On"} / SFX ${this.audio.sfxMuted ? "Muted" : "On"}`;
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel title-panel show-title-panel">
        <div class="title-block">
          <div class="eyebrow">Track Select Show Build</div>
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
          ${this.renderNewDriverHint()}
          ${this.renderWeekendPlaytestPicks({ context: "title", heading: "Recommended Setups", hint: "Pick one setup for quick weekend testing." })}
        </div>
        <div class="title-menu-card">
          <div class="menu-stack main-menu">
            <button class="menu-button primary" data-action="start"><strong>Solo / Seeded Run</strong><span>Set a road seed and chase the finish.</span></button>
            <button class="menu-button" data-action="howToPlay"><strong>How To Play</strong><span>Controls, race types, party rules, rewards, and local saves.</span></button>
            <button class="menu-button" data-action="challengeMode"><strong>Challenge Mode</strong><span>Fixed seeds, clear objectives, saved bests.</span></button>
            <button class="menu-button" data-action="partyMode"><strong>Party Mode</strong><span>Pass the keyboard with one-run, best-of-3, or total-score rounds.</span></button>
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
              <button class="small-button" data-action="runTargetedDirectorChecks">Targeted Director Checks</button>
              <button class="small-button" data-action="showPlaytestReport">Playtest Report</button>
              <button class="small-button" data-action="roadDirectorLab">Road Director Lab</button>
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
              ${getNormalVisibleSpeedClasses().concat(getTrainingSpeedClasses()).map((speedClass) => `
                <button class="speed-class-button ${speedClass.training ? "is-training" : ""} ${speedClass.id === selectedSpeedClass.id ? "is-selected" : ""}" data-action="setSpeedClass" data-id="${escapeAttr(speedClass.id)}">
                  <strong>${escapeHtml(speedClass.label)}</strong>
                  <span>${Math.round(getSpeedClassStartSpeed(speedClass.id))}-${Math.round(getSpeedClassEndSpeed(speedClass.id, TRACKS[0]))} MPH · x${speedClass.scoreMultiplier.toFixed(2)}</span>
                  <small>${escapeHtml(speedClass.description || "")}</small>
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
          ${this.renderResetCleanupReminder()}
          <div class="row">
            <button class="small-button" data-action="toggleMusic">Music: ${this.audio.musicMuted ? "Muted" : "On"}</button>
            <button class="small-button" data-action="toggleSfx">SFX: ${this.audio.sfxMuted ? "Muted" : "On"}</button>
            <button class="small-button" data-action="fullscreen">Fullscreen</button>
            <button class="small-button" data-action="howToPlay">How To Play</button>
            <button class="small-button" data-action="showPlaytestReport">Playtest Report</button>
            ${this.debugMode ? `<button class="small-button" data-action="roadDirectorLab">Road Director Lab</button>` : ""}
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

  filterPlaytestRuns(runs, filterValue = "all") {
    const filter = normalizePlaytestReportFilter(filterValue);
    if (filter === "classic") return runs.filter((run) => run.raceTypeId === DEFAULT_RACE_TYPE_ID);
    if (filter === "fuelRun") return runs.filter((run) => run.raceTypeId === FUEL_RUN_RACE_TYPE_ID);
    if (filter === "challenge") return runs.filter((run) => Boolean(run.challengeId));
    if (filter === "party") return runs.filter((run) => Boolean(run.partyMode));
    if (filter === "turbo") return runs.filter((run) => run.raceModeId === "turbo");
    return runs;
  }

  averagePlaytestField(runs, field) {
    if (!runs.length) return 0;
    return runs.reduce((sum, run) => sum + (Number(run[field]) || 0), 0) / runs.length;
  }

  completionRate(runs) {
    if (!runs.length) return 0;
    return runs.filter((run) => run.status === "finished").length / runs.length;
  }

  groupPlaytestRuns(runs, keyField, labelField) {
    const groups = new Map();
    runs.forEach((run) => {
      const key = String(run[keyField] || "unknown");
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          label: sanitizeName(run[labelField] || key, key, DISPLAY_TEXT_MAX_LENGTH),
          runs: []
        });
      }
      groups.get(key).runs.push(run);
    });
    return Array.from(groups.values())
      .map((group) => ({
        id: group.id,
        label: group.label,
        count: group.runs.length,
        completionRate: this.completionRate(group.runs),
        averageScore: this.averagePlaytestField(group.runs, "finalScore"),
        averageDuration: this.averagePlaytestField(group.runs, "elapsedTime")
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  countPlaytestRuns(runs, keyFn) {
    const counts = new Map();
    runs.forEach((run) => {
      const key = sanitizeName(keyFn(run), "Unknown", DISPLAY_TEXT_MAX_LENGTH);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  buildPlaytestReportAggregate(filterValue = "all") {
    const filter = normalizePlaytestReportFilter(filterValue);
    const allRuns = this.playtestReports.getRuns();
    const runs = this.filterPlaytestRuns(allRuns, filter);
    const fuelRuns = runs.filter((run) => run.raceTypeId === FUEL_RUN_RACE_TYPE_ID);
    const fuelFinishes = fuelRuns.filter((run) => run.status === "finished");
    const totalFuelSavedByBoost = fuelRuns.reduce((sum, run) => sum + (Number(run.fuelSavedByBoost) || 0), 0);
    const totalFuelDrainPausedTime = fuelRuns.reduce((sum, run) => sum + (Number(run.fuelDrainPausedTime) || 0), 0);
    const totalBoostsUsedInFuelRun = fuelRuns.reduce((sum, run) => sum + (Number(run.boostsUsedInFuelRun) || 0), 0);
    const challengeRuns = runs.filter((run) => Boolean(run.challengeId));
    const partyRuns = runs.filter((run) => Boolean(run.partyMode));
    const partySessionIds = new Set(partyRuns.map((run) => run.partySessionId).filter(Boolean));
    const challengeGroups = this.countPlaytestRuns(challengeRuns, (run) => run.challengeName || run.challengeId);
    const challengeRows = challengeGroups.map((group) => {
      const groupRuns = challengeRuns.filter((run) => (run.challengeName || run.challengeId) === group.label);
      return {
        ...group,
        completed: groupRuns.filter((run) => run.challengeCompleted).length,
        newBest: groupRuns.filter((run) => run.challengeNewBest).length
      };
    });
    const crashRows = this.countPlaytestRuns(
      runs.filter((run) => run.status === "crashed"),
      (run) => run.collisionType || run.endReason || "Unknown"
    );

    return {
      filter,
      totalStored: allRuns.length,
      filteredCount: runs.length,
      runs,
      completionRate: this.completionRate(runs),
      averageScore: this.averagePlaytestField(runs, "finalScore"),
      averageDuration: this.averagePlaytestField(runs, "elapsedTime"),
      averageBoostsUsed: this.averagePlaytestField(runs, "boostsUsed"),
      averageLaneChanges: this.averagePlaytestField(runs, "laneChanges"),
      averageCenterLaneTime: this.averagePlaytestField(runs, "centerLaneTime"),
      totalNewBadges: runs.reduce((sum, run) => sum + (Array.isArray(run.newlyEarnedBadges) ? run.newlyEarnedBadges.length : 0), 0),
      maxTotalBadgesEarned: runs.reduce((max, run) => Math.max(max, Number(run.totalBadgesEarned) || 0), 0),
      averageWavesFirst10Seconds: this.averagePlaytestField(runs, "wavesFirst10Seconds"),
      averageLaunchWaveCount: this.averagePlaytestField(runs, "launchWaveCount"),
      averageMeaningfulWaveCount: this.averagePlaytestField(runs, "meaningfulWaveCount"),
      averageSupportWaveCount: this.averagePlaytestField(runs, "supportWaveCount"),
      averagePopInPreventedCount: this.averagePlaytestField(runs, "popInPreventedCount"),
      totalVisibleSpawnViolations: runs.reduce((sum, run) => sum + (Number(run.wavesSpawnedInsideVisibleCount) || 0), 0),
      maxWavesSpawnedInSingleFrame: runs.reduce((max, run) => Math.max(max, Number(run.maxWavesSpawnedInSingleFrame) || 0), 0),
      totalSectionTransitionWaveBursts: runs.reduce((sum, run) => sum + (Number(run.sectionTransitionWaveBurstCount) || 0), 0),
      totalCatchUpSpawnsBlocked: runs.reduce((sum, run) => sum + (Number(run.catchUpSpawnsBlockedCount) || 0), 0),
      maxVisibleHardBlockers: runs.reduce((max, run) => Math.max(max, Number(run.maxVisibleHardBlockers) || 0), 0),
      maxTacticalHardBlockers: runs.reduce((max, run) => Math.max(max, Number(run.maxTacticalHardBlockers) || 0), 0),
      maxHardBlockersNext3Seconds: runs.reduce((max, run) => Math.max(max, Number(run.maxHardBlockersNext3Seconds) || 0), 0),
      maxHardBlockersInTwoSeconds: runs.reduce((max, run) => Math.max(max, Number(run.maxHardBlockersInTwoSeconds) || 0), 0),
      maxHardBlockersInThreeLaneNeighborhood: runs.reduce((max, run) => Math.max(max, Number(run.maxHardBlockersInThreeLaneNeighborhood) || 0), 0),
      maxVisibleWaveOverlap: runs.reduce((max, run) => Math.max(max, Number(run.visibleWaveOverlapMax) || 0), 0),
      totalActiveFieldBudgetDelays: runs.reduce((sum, run) => sum + (Number(run.activeFieldBudgetDelays) || 0), 0),
      totalActiveFieldRejectedSpawns: runs.reduce((sum, run) => sum + (Number(run.activeFieldRejectedSpawns) || 0), 0),
      totalCombinedRouteFailures: runs.reduce((sum, run) => sum + (Number(run.combinedRouteFailures) || 0), 0),
      totalBarrierCount: runs.reduce((sum, run) => sum + (Number(run.barrierCount) || 0), 0),
      totalSupportObjectsSuppressedByDensity: runs.reduce((sum, run) => sum + (Number(run.supportObjectsSuppressedByDensity) || 0), 0),
      totalDeadScreenTime: runs.reduce((sum, run) => sum + (Number(run.deadScreenTime) || 0), 0),
      longestDeadScreenSeconds: runs.reduce((max, run) => Math.max(max, Number(run.longestDeadScreenSeconds) || 0), 0),
      maxTimeSinceLastMeaningfulDecision: runs.reduce((max, run) => Math.max(max, Number(run.timeSinceLastMeaningfulDecisionMax) || 0), 0),
      visibleMeaningfulMin: runs.length ? runs.reduce((min, run) => Math.min(min, Number(run.visibleMeaningfulMin) || 0), Infinity) : 0,
      averageVisibleMeaningful: this.averagePlaytestField(runs, "visibleMeaningfulAverage"),
      upcomingDecisionGapMax: runs.reduce((max, run) => Math.max(max, Number(run.upcomingDecisionGapMax) || 0), 0),
      totalUnderActivityCorrections: runs.reduce((sum, run) => sum + (Number(run.underActivityCorrections) || 0), 0),
      totalOverActivityDelays: runs.reduce((sum, run) => sum + (Number(run.overActivityDelays) || 0), 0),
      trackRows: this.groupPlaytestRuns(runs, "trackId", "trackName"),
      modeRows: this.groupPlaytestRuns(runs, "raceModeId", "raceModeLabel"),
      typeRows: this.groupPlaytestRuns(runs, "raceTypeId", "raceTypeLabel"),
      crashRows,
      outOfFuelCount: runs.filter((run) => run.status === "outOfFuel").length,
      fuelSummary: {
        runs: fuelRuns.length,
        averageGasCansCollected: this.averagePlaytestField(fuelRuns, "gasCansCollected"),
        averageGasCansSpawned: this.averagePlaytestField(fuelRuns, "gasCansSpawned"),
        averageFuelRemainingOnFinishes: this.averagePlaytestField(fuelFinishes, "fuelRemaining"),
        averageFuelSavedByBoost: this.averagePlaytestField(fuelRuns, "fuelSavedByBoost"),
        totalFuelSavedByBoost,
        totalFuelDrainPausedTime,
        totalBoostsUsedInFuelRun,
        averageLowestFuelReached: this.averagePlaytestField(fuelRuns, "lowestFuelReached"),
        averageLowFuelTime: this.averagePlaytestField(fuelRuns, "lowFuelTime"),
        averageCriticalFuelTime: this.averagePlaytestField(fuelRuns, "criticalFuelTime"),
        outOfFuelCount: fuelRuns.filter((run) => run.outOfFuelOccurred).length
      },
      challengeSummary: {
        runs: challengeRuns.length,
        completed: challengeRuns.filter((run) => run.challengeCompleted).length,
        newBest: challengeRuns.filter((run) => run.challengeNewBest).length,
        rows: challengeRows
      },
      partySummary: {
        runs: partyRuns.length,
        sessions: partySessionIds.size,
        averageRank: this.averagePlaytestField(partyRuns.filter((run) => run.partyRankAfterRun > 0), "partyRankAfterRun"),
        averageLeaderGap: this.averagePlaytestField(partyRuns, "partyStandingGap"),
        playerCountAverage: this.averagePlaytestField(partyRuns, "partyPlayerCount"),
        averageBestScore: this.averagePlaytestField(partyRuns, "partyBestScore"),
        averageTotalScore: this.averagePlaytestField(partyRuns, "partyTotalScore"),
        leaderChanges: partyRuns.reduce((max, run) => Math.max(max, Number(run.partyLeaderChanges) || 0), 0),
        roundTypes: this.countPlaytestRuns(partyRuns, (run) => getPartyRoundTypeLabel(run.partyRoundType)),
        seedModes: this.countPlaytestRuns(partyRuns, (run) => getPartySeedModeLabel(run.partySeedMode))
      }
    };
  }

  formatPlaytestPercent(value) {
    return `${Math.round(clampNumber(value, 0, 1, 0) * 100)}%`;
  }

  formatPlaytestDecimal(value, digits = 1) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(digits) : "0.0";
  }

  renderPlaytestSummaryList(rows, emptyText, renderRow) {
    return `
      <ol class="leaderboard-list playtest-report-list">
        ${rows.length ? rows.map((row) => renderRow(row)).join("") : `<li class="leaderboard-item"><span class="meta">${escapeHtml(emptyText)}</span></li>`}
      </ol>
    `;
  }

  buildPlaytestReportExportText(filterValue = this.playtestReportFilter) {
    const aggregate = this.buildPlaytestReportAggregate(filterValue);
    const payload = {
      generatedAt: new Date().toISOString(),
      storageKey: PLAYTEST_REPORT_STORAGE_KEY,
      localOnly: true,
      maxRunsStored: PLAYTEST_REPORT_MAX_RUNS,
      filter: aggregate.filter,
      totals: {
        totalRunsStored: aggregate.totalStored,
        filteredRuns: aggregate.filteredCount,
        completionRate: aggregate.completionRate,
        averageScore: Math.round(aggregate.averageScore),
        averageDurationSeconds: Number(aggregate.averageDuration.toFixed(2)),
        outOfFuelCount: aggregate.outOfFuelCount,
        averageBoostsUsed: Number(aggregate.averageBoostsUsed.toFixed(2)),
        averageLaneChanges: Number(aggregate.averageLaneChanges.toFixed(2)),
        averageCenterLaneTimeSeconds: Number(aggregate.averageCenterLaneTime.toFixed(2)),
        totalNewBadges: aggregate.totalNewBadges,
        maxTotalBadgesEarned: aggregate.maxTotalBadgesEarned,
        averageWavesFirst10Seconds: Number(aggregate.averageWavesFirst10Seconds.toFixed(2)),
        averageLaunchWaveCount: Number(aggregate.averageLaunchWaveCount.toFixed(2)),
        averageMeaningfulWaveCount: Number(aggregate.averageMeaningfulWaveCount.toFixed(2)),
        averageSupportWaveCount: Number(aggregate.averageSupportWaveCount.toFixed(2)),
        averagePopInPreventedCount: Number(aggregate.averagePopInPreventedCount.toFixed(2)),
        totalVisibleSpawnViolations: aggregate.totalVisibleSpawnViolations,
        maxWavesSpawnedInSingleFrame: aggregate.maxWavesSpawnedInSingleFrame,
        totalSectionTransitionWaveBursts: aggregate.totalSectionTransitionWaveBursts,
        totalCatchUpSpawnsBlocked: aggregate.totalCatchUpSpawnsBlocked,
        maxVisibleHardBlockers: aggregate.maxVisibleHardBlockers,
        maxTacticalHardBlockers: aggregate.maxTacticalHardBlockers,
        maxHardBlockersNext3Seconds: aggregate.maxHardBlockersNext3Seconds,
        maxHardBlockersInTwoSeconds: aggregate.maxHardBlockersInTwoSeconds,
        maxHardBlockersInThreeLaneNeighborhood: aggregate.maxHardBlockersInThreeLaneNeighborhood,
        maxVisibleWaveOverlap: aggregate.maxVisibleWaveOverlap,
        totalActiveFieldBudgetDelays: aggregate.totalActiveFieldBudgetDelays,
        totalCombinedRouteFailures: aggregate.totalCombinedRouteFailures,
        totalBarrierCount: aggregate.totalBarrierCount,
        totalSupportObjectsSuppressedByDensity: aggregate.totalSupportObjectsSuppressedByDensity,
        totalDeadScreenTime: Number(aggregate.totalDeadScreenTime.toFixed(2)),
        longestDeadScreenSeconds: Number(aggregate.longestDeadScreenSeconds.toFixed(2)),
        maxTimeSinceLastMeaningfulDecision: Number(aggregate.maxTimeSinceLastMeaningfulDecision.toFixed(2)),
        visibleMeaningfulMin: Number.isFinite(aggregate.visibleMeaningfulMin) ? aggregate.visibleMeaningfulMin : 0,
        averageVisibleMeaningful: Number(aggregate.averageVisibleMeaningful.toFixed(2)),
        upcomingDecisionGapMax: Number(aggregate.upcomingDecisionGapMax.toFixed(2)),
        totalUnderActivityCorrections: aggregate.totalUnderActivityCorrections,
        totalOverActivityDelays: aggregate.totalOverActivityDelays
      },
      completionByTrack: aggregate.trackRows,
      completionByRaceMode: aggregate.modeRows,
      completionByRaceType: aggregate.typeRows,
      crashCountByObstacleType: aggregate.crashRows,
      fuelRun: aggregate.fuelSummary,
      challengeCompletionSummary: aggregate.challengeSummary,
      partyModeSummary: aggregate.partySummary,
      runSummaries: aggregate.runs
    };
    return JSON.stringify(payload, null, 2);
  }

  hasRoadDirectorRunState(run = this.run) {
    return Boolean(run && (
      this.screen === "game"
      || (run.elapsed || 0) > 0
      || (run.roadDirectorSequence || []).length
      || run.ended
    ));
  }

  getRoadDirectorSnapshotSource() {
    const run = this.run;
    if (this.hasRoadDirectorRunState(run)) {
      return { run, source: this.screen === "game" && !run.ended ? "active run" : "last run" };
    }
    const speedClass = getSpeedClassConfig(this.profiles.data.speedClassId);
    const baseTrack = getTrackById(this.pendingTrackId || DEFAULT_TRACK_ID);
    const track = createRaceTrackForSpeedClass(baseTrack, speedClass.id);
    const requestedRaceTypeId = normalizeRaceTypeId(this.pendingRaceTypeId || DEFAULT_RACE_TYPE_ID, DEFAULT_RACE_TYPE_ID);
    const raceTypeId = trackSupportsRaceType(baseTrack, requestedRaceTypeId) ? requestedRaceTypeId : DEFAULT_RACE_TYPE_ID;
    const pendingSeed = normalizeRoadSeed(this.pendingRoadSeed, DEFAULT_ROAD_SEED);
    return {
      source: "pending solo setup",
      run: {
        track,
        speedClassId: speedClass.id,
        speedClass,
        raceTypeId,
        raceType: getRaceTypeConfig(raceTypeId),
        roadSeed: pendingSeed,
        roadSeedHash: hashSeed(getRunRandomSeedSource(pendingSeed, track, speedClass.id, raceTypeId)) >>> 0,
        roadDirectorSequence: [],
        recentRoadDirectorRejections: [],
        distance: 0,
        elapsed: 0,
        currentSpeed: getTrackCruiseSpeed(track, 0, speedClass.id),
        ended: false,
        raceActive: false
      }
    };
  }

  formatDirectorNumber(value, digits = 0, fallback = "not tracked yet") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(digits) : fallback;
  }

  formatDirectorSeconds(value, fallback = "not tracked yet") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${numeric.toFixed(1)}s` : fallback;
  }

  getVisibleDirectorObjects(run = this.run) {
    const runDistance = Number.isFinite(run?.distance) ? run.distance : 0;
    return (this.obstacles?.obstacles || [])
      .filter((obstacle) => this.obstacles.isGameplaySpawnObject(obstacle))
      .map((obstacle) => ({
        obstacle,
        ahead: obstacle.distance - runDistance
      }))
      .filter((item) => item.ahead > -120 && item.ahead <= VIEW_DISTANCE);
  }

  getRoadDirectorTimingSnapshot(run, track, section) {
    const director = this.obstacles?.director;
    if (!director || !this.obstacles?.track || !run) {
      return {
        timeSinceLastMeaningfulDecisionSeconds: null,
        estimatedTimeUntilNextMeaningfulDecisionSeconds: null,
        deadScreenSeconds: null,
        underActivityWarning: "not tracked yet"
      };
    }
    const distance = Number.isFinite(run.distance) ? run.distance : 0;
    const context = director.getContext(distance);
    const forceMeaningfulThreshold = (context.cadence?.forceMeaningful ?? 3)
      * getSectionNumber(section, "forceMeaningfulMultiplier", 1, 0.45, 1.8)
      * (context.launchPacing?.forceMeaningfulMultiplier ?? 1);
    const timeSinceMeaningful = Number.isFinite(director.timeSinceMeaningfulWaveSeconds)
      ? director.timeSinceMeaningfulWaveSeconds
      : null;
    const activeEmptySeconds = Number.isFinite(director.activeEmptySeconds)
      ? director.activeEmptySeconds
      : null;
    const deadScreenSeconds = Number.isFinite(director.deadScreenSeconds)
      ? director.deadScreenSeconds
      : null;
    const activity = this.obstacles?.getRoadActivitySnapshot
      ? this.obstacles.getRoadActivitySnapshot(run, this.obstacles.obstacles, distance)
      : null;
    const timeUntilMeaningful = Number.isFinite(timeSinceMeaningful)
      ? Math.max(0, forceMeaningfulThreshold - timeSinceMeaningful)
      : null;
    const underActivityWarning = activity?.underActivity
      ? (activity.status || "below activity floor")
      : (Number.isFinite(timeSinceMeaningful) && timeSinceMeaningful >= forceMeaningfulThreshold
      ? "meaningful wave overdue"
      : (Number.isFinite(activeEmptySeconds) && activeEmptySeconds >= forceMeaningfulThreshold
        ? "active field has been empty"
        : "none"));
    return {
      timeSinceLastMeaningfulDecisionSeconds: timeSinceMeaningful,
      estimatedTimeUntilNextMeaningfulDecisionSeconds: Number.isFinite(activity?.nextMeaningfulDecisionSeconds)
        ? activity.nextMeaningfulDecisionSeconds
        : timeUntilMeaningful,
      deadScreenSeconds,
      activeEmptySeconds,
      forceMeaningfulThresholdSeconds: forceMeaningfulThreshold,
      underActivityWarning
    };
  }

  getRoadDirectorScheduleSnapshot(run, track) {
    if (!run || !track || !this.obstacles) {
      return {
        nextScheduledWaveDistance: null,
        nextScheduledWaveAhead: null,
        nextScheduledWaveSeconds: null,
        spawnHorizonAhead: null
      };
    }
    const nextDistance = Number.isFinite(this.obstacles.nextSpawnDistance) ? this.obstacles.nextSpawnDistance : null;
    const distance = Number.isFinite(run.distance) ? run.distance : 0;
    const speed = Math.max(1, Number.isFinite(run.currentSpeed) ? run.currentSpeed : getTrackCruiseSpeed(track, 0, run.speedClassId));
    const plan = this.obstacles.getSpawnSchedulePlan(run, this.obstacles.track || track);
    const nextAhead = Number.isFinite(nextDistance) ? nextDistance - distance : null;
    return {
      nextScheduledWaveDistance: Number.isFinite(nextDistance) ? Math.round(nextDistance) : null,
      nextScheduledWaveAhead: Number.isFinite(nextAhead) ? Math.round(nextAhead) : null,
      nextScheduledWaveSeconds: Number.isFinite(nextAhead) ? Math.max(0, nextAhead / speed) : null,
      spawnHorizonAhead: Number.isFinite(plan.spawnHorizon) ? Math.round(plan.spawnHorizon - distance) : null,
      delayedForVisibility: Boolean(run.lastWaveDelayedForVisibleSafety),
      transitionGuardActive: Boolean(plan.transitionGuardActive),
      maxWavesPerFrame: plan.maxWavesPerFrame
    };
  }

  buildRoadDirectorLabSnapshot() {
    const { run, source } = this.getRoadDirectorSnapshotSource();
    const track = run.track || getTrackById(DEFAULT_TRACK_ID);
    const distance = Number.isFinite(run.distance) ? run.distance : 0;
    const progress = clamp(distance / Math.max(1, track.distanceToFinish), 0, 1);
    const section = getTrackSection(track, progress);
    const sectionProgress = getTrackSectionProgress(section, progress);
    const director = this.obstacles?.director;
    const currentWave = director?.currentWave || null;
    const visibleObjects = this.getVisibleDirectorObjects(run);
    const density = this.obstacles?.getActiveFieldDensity(this.obstacles.obstacles, distance) || {};
    const activeField = this.obstacles?.validateActiveFieldBudget(this.obstacles.obstacles, distance) || {};
    const route = this.obstacles?.getRouteReadability(this.obstacles.obstacles, distance) || null;
    const activity = this.obstacles?.getRoadActivitySnapshot
      ? this.obstacles.getRoadActivitySnapshot(run, this.obstacles.obstacles, distance)
      : {};
    const budget = activeField.budget || this.obstacles?.getActivityFloorBudget(run, section) || this.obstacles?.getActiveFieldBudget(run) || {};
    const activityBudget = this.obstacles?.getActivityFloorBudget(run, section) || budget || {};
    const routeStatus = route
      ? (route.invalid ? "blocked" : "readable")
      : "not tracked yet";
    const activeFieldStatus = activeField.invalid
      ? `over budget: ${activeField.reason || "active-field budget prevented"}`
      : "within budget";
    const overDensityWarning = activeField.invalid
      ? (activeField.reason || "active-field budget exceeded")
      : ((density.visibleHardBlockers || 0) >= (budget.spawnDelayVisibleHardBlockers || Infinity)
        ? "near spawn-delay threshold"
        : "none");
    const timing = this.getRoadDirectorTimingSnapshot(run, track, section);
    const schedule = this.getRoadDirectorScheduleSnapshot(run, track);
    const currentPressureBudget = Number.isFinite(currentWave?.pressureBudget)
      ? currentWave.pressureBudget
      : (this.obstacles?.track && director ? director.getContext(distance).pressureBudget : null);
    const currentPressureAllowance = this.obstacles?.track && director
      ? director.getContext(distance).pressureBudgetAllowance
      : null;
    const currentPressure = Number.isFinite(currentWave?.pressure) ? currentWave.pressure : null;
    const recentWaveHistory = (run.roadDirectorSequence || [])
      .slice(-12)
      .map((wave) => ({
        index: wave.index,
        type: wave.type,
        label: wave.label,
        family: wave.family || "unknown",
        intent: wave.intent || "unknown",
        requiredAction: wave.requiredAction || "",
        routeType: wave.routeType || "",
        rewardType: wave.rewardType || "",
        directorIntentLabel: wave.directorIntentLabel || "",
        directorIntentReason: wave.directorIntentReason || "",
        sectionId: wave.sectionId,
        sectionLabel: wave.sectionLabel,
        distance: wave.distance,
        blockedLanes: wave.blockedLanes || [],
        boostLanes: wave.boostLanes || [],
        rampLanes: wave.rampLanes || [],
        gasCanLanes: wave.gasCanLanes || [],
        routeLanes: wave.routeLanes || [],
        rewardLanes: wave.rewardLanes || [],
        obstacleCount: (wave.obstacles || []).length,
        obstacles: (wave.obstacles || []).map((obstacle) => ({
          type: obstacle.type,
          lane: obstacle.lane,
          distance: obstacle.distance
        }))
      }));
    const recentRejectedWaves = (run.recentRoadDirectorRejections || []).slice(-12);

    return {
      generatedAt: new Date().toISOString(),
      debugMode: Boolean(this.debugMode),
      source,
      state: {
        screen: this.screen,
        source,
        debugMode: Boolean(this.debugMode),
        activeRace: this.screen === "game" && !run.ended,
        raceActive: Boolean(run.raceActive),
        ended: Boolean(run.ended),
        paused: Boolean(run.paused),
        elapsedSeconds: Number.isFinite(run.elapsed) ? Number(run.elapsed.toFixed(2)) : 0,
        distance: Math.round(distance),
        progress: Number(progress.toFixed(4))
      },
      activeRace: this.screen === "game" && !run.ended,
      track: {
        id: track.id,
        name: track.name
      },
      raceType: {
        id: normalizeRaceTypeId(run.raceTypeId, DEFAULT_RACE_TYPE_ID),
        label: getRaceTypeLabel(run.raceTypeId)
      },
      raceMode: {
        id: normalizeSpeedClassId(run.speedClassId, DEFAULT_SPEED_CLASS_ID),
        label: getSpeedClassLabel(run.speedClassId)
      },
      seed: formatRoadSeed(run.roadSeed),
      seedHash: Number.isFinite(run.roadSeedHash) ? run.roadSeedHash >>> 0 : hashSeed(getRunRandomSeedSource(run.roadSeed, track, run.speedClassId, run.raceTypeId)) >>> 0,
      distance: Math.round(distance),
      elapsedSeconds: Number.isFinite(run.elapsed) ? Number(run.elapsed.toFixed(2)) : 0,
      progress,
      section: {
        id: section.id,
        label: section.label,
        progress: sectionProgress,
        pressureMultiplier: getSectionNumber(section, "pressureMultiplier", 1, 0.25, 2.4)
      },
      currentWave: {
        name: currentWave?.label || "none",
        type: currentWave?.type || "none",
        family: currentWave?.family || "none",
        intent: currentWave?.intent || "none",
        directorIntent: currentWave?.directorIntentLabel || director?.currentDirectorIntent?.label || "none",
        directorIntentReason: currentWave?.directorIntentReason || director?.currentDirectorIntent?.reason || "",
        requiredAction: currentWave?.requiredAction || "none",
        routeType: currentWave?.routeType || "none",
        rewardType: currentWave?.rewardType || "none",
        pressureRating: currentWave?.pressureRating ?? null,
        meaningful: currentWave ? Boolean(currentWave.meaningfulWave) : null,
        support: currentWave ? Boolean(currentWave.supportWave) : null,
        pressure: currentPressure,
        pressureBudget: currentPressureBudget,
        pressureBudgetAllowance: currentPressureAllowance,
        pressureBudgetPassed: currentWave ? currentWave.pressureBudgetPassed !== false : null,
        fairnessPassed: currentWave ? currentWave.fairnessPassed !== false : null
      },
      recentWaveHistory,
      recentRejectedWaves,
      activeField: {
        status: activeFieldStatus,
        reason: activeField.reason || "none",
        visibleHardBlockers: density.visibleHardBlockers || 0,
        visibleMeaningfulObjects: activity.visibleMeaningfulObjects || 0,
        upcomingMeaningfulObjects: activity.upcomingMeaningfulObjects || 0,
        targetMeaningfulObjects: activity.targetVisibleMeaningful ?? activityBudget.targetVisibleMeaningful ?? null,
        minMeaningfulObjects: activity.minVisibleMeaningful ?? activityBudget.minVisibleMeaningful ?? null,
        activityFloorStatus: activity.status || "not tracked yet",
        activityWeight: Number.isFinite(activity.activityWeight) ? Number(activity.activityWeight.toFixed(2)) : null,
        visibleRewards: activity.visibleRewards || 0,
        upcomingRewards: activity.upcomingRewards || 0,
        visibleFreeCenterGas: activity.visibleFreeCenterGas || 0,
        visibleGameplayObjects: visibleObjects.length,
        activeVisibleWaveOverlap: density.visibleHardWaveOverlap || 0,
        tacticalHardBlockers: density.tacticalHardBlockers || 0,
        hardBlockersNext3Seconds: density.hardBlockersNext3Seconds || 0,
        hardBlockersNext5Seconds: density.hardBlockersNext5Seconds || 0,
        maxHardBlockersInTwoSeconds: density.maxHardBlockersInTwoSeconds || 0,
        maxHardBlockersInThreeLaneNeighborhood: density.maxHardBlockersInThreeLaneNeighborhood || 0,
        budget: {
          maxVisibleHardBlockers: budget.maxVisibleHardBlockers ?? null,
          spikeVisibleHardBlockers: budget.spikeVisibleHardBlockers ?? null,
          spawnDelayVisibleHardBlockers: budget.spawnDelayVisibleHardBlockers ?? null,
          maxTacticalHardBlockers: budget.maxTacticalHardBlockers ?? null,
          maxHardBlockersNext3Seconds: budget.maxHardBlockersNext3Seconds ?? null,
          maxVisibleHardWaveOverlap: budget.maxVisibleHardWaveOverlap ?? null,
          minVisibleMeaningful: activityBudget.minVisibleMeaningful ?? null,
          targetVisibleMeaningful: activityBudget.targetVisibleMeaningful ?? null,
          maxUpcomingDecisionGapSeconds: activityBudget.maxUpcomingDecisionGapSeconds ?? null,
          deadScreenLimitSeconds: activityBudget.deadScreenLimitSeconds ?? null
        }
      },
      routeValidation: route ? {
        status: routeStatus,
        routeFailures: route.routeFailures || 0,
        minorOnlyOpenLaneEvents: route.minorOnlyOpenLaneEvents || 0,
        timingRouteFailures: route.timingRouteFailures || 0,
        worstSlice: route.worstSlice ? {
          ahead: Math.round(route.worstSlice.ahead || 0),
          hardLanes: route.worstSlice.hardLanes || [],
          minorLanes: route.worstSlice.minorLanes || [],
          openLanes: route.worstSlice.openLanes || [],
          clearLanes: route.worstSlice.clearLanes || [],
          reachableClearLanes: route.worstSlice.reachableClearLanes || [],
          timeToPlayerZone: Number.isFinite(route.worstSlice.timeToPlayerZone) ? Number(route.worstSlice.timeToPlayerZone.toFixed(2)) : null
        } : null
      } : {
        status: "not tracked yet"
      },
      schedule,
      timing: {
        ...timing,
        timeSinceLastWaveSeconds: director && Number.isFinite(director.timeSinceWaveSeconds) ? director.timeSinceWaveSeconds : null,
        timeSinceMovementDecisionSeconds: director && Number.isFinite(director.decisionSafeSeconds) ? director.decisionSafeSeconds : null
      },
      warnings: {
        underActivity: timing.underActivityWarning,
        overDensity: overDensityWarning
      },
      recentFamilyIntentHistory: recentWaveHistory.map((wave) => ({
        index: wave.index,
        family: wave.family,
        intent: wave.intent,
        directorIntent: wave.directorIntentLabel
      })),
      rewardLaneDistribution: {
        currentActiveField: activity.rewardLaneCounts || {},
        runTotals: director?.stats?.rewardLaneCounts || {},
        sideLaneRewards: director?.stats?.sideLaneRewardCount || 0,
        centerRewards: director?.stats?.centerRewardCount || 0,
        rampsSpawned: director?.stats?.rampLaneCounts?.reduce((sum, count) => sum + count, 0) || 0,
        rampsUsed: run.rampsUsed || 0,
        rampAirborneDuration: Number.isFinite(run.rampAirborneDuration) ? Number(run.rampAirborneDuration.toFixed(2)) : 0,
        rampClearDistance: Math.round(run.rampClearDistance || ROAD_READABILITY_CONFIG.rampClearDistance),
        rampTargetsAssigned: run.rampTargetsAssigned || director?.stats?.rampTargetsAssigned || 0,
        rampTargetsCleared: run.rampTargetsCleared || 0,
        rampLandingRejected: run.rampLandingRejected || director?.stats?.rampLandingRejected || 0,
        rampFailedToClearTarget: run.rampFailedToClearTarget || director?.stats?.rampFailedToClearTarget || 0,
        boostPadsSpawned: director?.stats?.boostLaneCounts?.reduce((sum, count) => sum + count, 0) || 0,
        boostPadsCollected: run.boostPadsCollected || 0,
        gasCansSpawned: run.gasCansSpawned || 0,
        gasCansCollected: run.gasCansCollected || 0
      },
      counters: {
        activeFieldBudgetDelays: run.activeFieldBudgetDelays || 0,
        activeFieldRejectedSpawns: run.activeFieldRejectedSpawns || 0,
        underActivityCorrections: run.underActivityCorrections || 0,
        overActivityDelays: run.overActivityDelays || 0,
        combinedRouteFailures: run.combinedRouteFailures || 0,
        supportObjectsSuppressedByDensity: run.supportObjectsSuppressedByDensity || 0,
        popInPreventedCount: run.popInPreventedCount || 0,
        wavesSpawnedInsideVisibleCount: run.wavesSpawnedInsideVisibleCount || 0,
        wavesSpawnedThisFrame: run.wavesSpawnedThisFrame || 0,
        maxWavesSpawnedInSingleFrame: run.maxWavesSpawnedInSingleFrame || 0
      },
      notTrackedYet: []
    };
  }

  renderRoadDirectorList(rows, emptyText, renderRow) {
    return `
      <ol class="leaderboard-list playtest-report-list director-lab-list">
        ${rows.length ? rows.map((row) => renderRow(row)).join("") : `<li class="leaderboard-item"><span class="meta">${escapeHtml(emptyText)}</span></li>`}
      </ol>
    `;
  }

  buildRoadDirectorReportExportText() {
    return JSON.stringify(this.buildRoadDirectorLabSnapshot(), null, 2);
  }

  showRoadDirectorLabScreen(message = "") {
    if (!this.debugMode) {
      this.showSettingsScreen("Enable debug mode to open Road Director Lab.");
      return;
    }
    this.setScreen("roadDirectorLab");
    this.audio.playMusic("title", false);
    const snapshot = this.buildRoadDirectorLabSnapshot();
    const card = (title, value, detail = "") => `
      <div class="score-card"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(value)}</span>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div>
    `;
    const waveHistoryList = this.renderRoadDirectorList(snapshot.recentWaveHistory, "No waves recorded yet.", (wave) => {
      const obstacleText = wave.obstacles.length
        ? wave.obstacles.map((obstacle) => `${obstacle.type} L${Number(obstacle.lane) + 1}@${obstacle.distance}`).join("; ")
        : "gap";
      const lanes = wave.blockedLanes.length ? `blocked ${wave.blockedLanes.map((lane) => Number(lane) + 1).join(",")}` : "no hard lane block";
      const familyIntent = `${wave.family || "unknown"} / ${wave.intent || "unknown"}`;
      return `
        <li class="leaderboard-item playtest-report-row">
          <span class="leaderboard-rank">${escapeHtml(`${wave.index || "-"} ${wave.label || wave.type}`)}</span>
          <span class="meta">${escapeHtml(`${familyIntent} - ${wave.sectionLabel || wave.sectionId || "Section"} d${wave.distance} - ${lanes} - route ${wave.routeLanes.map((lane) => Number(lane) + 1).join(",") || "n/a"} - ${obstacleText}`)}</span>
        </li>
      `;
    });
    const rejectionList = this.renderRoadDirectorList(snapshot.recentRejectedWaves, "No rejected waves or spawn attempts tracked yet.", (item) => `
      <li class="leaderboard-item playtest-report-row">
        <span class="leaderboard-rank">${escapeHtml(item.waveLabel || item.waveType || item.type || "unknown")}</span>
        <span class="meta">${escapeHtml(`${item.reason || "rejected"} - ${item.type || "unknown"} L${Number.isFinite(item.lane) ? item.lane + 1 : "?"} d${item.distance || 0} t${this.formatDirectorSeconds(item.elapsed, "0.0s")}`)}</span>
      </li>
    `);
    const notTrackedText = snapshot.notTrackedYet.length ? snapshot.notTrackedYet.join(", ") : "none";
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel playtest-report-panel road-director-lab-panel">
        <div class="playtest-report-header">
          <div>
            <span class="eyebrow">Local Development Only</span>
            <h2>Road Director Lab</h2>
            <p class="hint">${escapeHtml(snapshot.source)} - ${snapshot.activeRace ? "race is active" : "race is not active"}</p>
          </div>
          <div class="playtest-report-status">
            <strong>${escapeHtml(snapshot.currentWave.name)}</strong>
            <span>current wave</span>
          </div>
        </div>
        <div class="score-grid playtest-summary-grid director-lab-summary-grid">
          ${card("Track", snapshot.track.name, snapshot.track.id)}
          ${card("Race Type", snapshot.raceType.label, snapshot.raceType.id)}
          ${card("Race Mode", snapshot.raceMode.label, snapshot.raceMode.id)}
          ${card("Seed", snapshot.seed, `hash ${snapshot.seedHash}`)}
          ${card("Section", snapshot.section.label, `${snapshot.section.id} - ${Math.round(snapshot.section.progress * 100)}%`)}
          ${card("Wave", snapshot.currentWave.name, snapshot.currentWave.type)}
          ${card("Wave Family", snapshot.currentWave.family)}
          ${card("Wave Intent", snapshot.currentWave.intent)}
          ${card("Director Intent", snapshot.currentWave.directorIntent, snapshot.currentWave.directorIntentReason || snapshot.currentWave.requiredAction)}
          ${card("Required Action", snapshot.currentWave.requiredAction, snapshot.currentWave.routeType)}
          ${card("Visible Hard", String(snapshot.activeField.visibleHardBlockers), `budget ${snapshot.activeField.budget.maxVisibleHardBlockers ?? "unknown"}`)}
          ${card("Meaningful Objects", String(snapshot.activeField.visibleMeaningfulObjects), `${snapshot.activeField.upcomingMeaningfulObjects} upcoming - ${snapshot.activeField.visibleGameplayObjects} gameplay visible`)}
          ${card("Activity Floor", snapshot.activeField.activityFloorStatus, `target ${snapshot.activeField.targetMeaningfulObjects ?? "unknown"} min ${snapshot.activeField.minMeaningfulObjects ?? "unknown"}`)}
          ${card("Rewards Visible", `${snapshot.activeField.visibleRewards} visible`, `${snapshot.activeField.upcomingRewards} upcoming - free center gas ${snapshot.activeField.visibleFreeCenterGas}`)}
          ${card("Wave Overlap", String(snapshot.activeField.activeVisibleWaveOverlap), `budget ${snapshot.activeField.budget.maxVisibleHardWaveOverlap ?? "unknown"}`)}
          ${card("Active Field", snapshot.activeField.status, snapshot.activeField.reason)}
          ${card("Route", snapshot.routeValidation.status, `${snapshot.routeValidation.routeFailures || 0} failures`)}
          ${card("Next Wave", this.formatDirectorSeconds(snapshot.schedule.nextScheduledWaveSeconds), `${snapshot.schedule.nextScheduledWaveAhead ?? "unknown"} world ahead`)}
          ${card("Last Meaningful", this.formatDirectorSeconds(snapshot.timing.timeSinceLastMeaningfulDecisionSeconds), `next in ${this.formatDirectorSeconds(snapshot.timing.estimatedTimeUntilNextMeaningfulDecisionSeconds)}`)}
          ${card("Dead Screen", this.formatDirectorSeconds(snapshot.timing.deadScreenSeconds), snapshot.warnings.underActivity)}
          ${card("Pressure Budget", this.formatDirectorNumber(snapshot.currentWave.pressureBudget, 2), `pressure ${this.formatDirectorNumber(snapshot.currentWave.pressure, 2)} allowance ${this.formatDirectorNumber(snapshot.currentWave.pressureBudgetAllowance, 2)}`)}
          ${card("Section Pressure", this.formatDirectorNumber(snapshot.section.pressureMultiplier, 2), `over-density ${snapshot.warnings.overDensity}`)}
        </div>
        <div class="score-grid playtest-detail-grid director-lab-detail-grid">
          ${card("Route Detail", `${snapshot.routeValidation.minorOnlyOpenLaneEvents || 0} minor-only events`, `${snapshot.routeValidation.timingRouteFailures || 0} timing failures`)}
          ${card("Active Budget Counts", `${snapshot.activeField.tacticalHardBlockers} tactical hard`, `${snapshot.activeField.hardBlockersNext3Seconds} next 3s - ${snapshot.activeField.maxHardBlockersInTwoSeconds} in 2s`)}
          ${card("Floor Budget", `min ${snapshot.activeField.budget.minVisibleMeaningful ?? "unknown"} target ${snapshot.activeField.budget.targetVisibleMeaningful ?? "unknown"}`, `decision gap ${this.formatDirectorSeconds(snapshot.activeField.budget.maxUpcomingDecisionGapSeconds)}`)}
          ${card("Schedule Detail", `${snapshot.schedule.nextScheduledWaveDistance ?? "unknown"} world`, `horizon ${snapshot.schedule.spawnHorizonAhead ?? "unknown"} - max/frame ${snapshot.schedule.maxWavesPerFrame ?? "unknown"}`)}
          ${card("Corrections", `${snapshot.counters.underActivityCorrections} underactivity`, `${snapshot.counters.overActivityDelays} over-density delays`)}
          ${card("Reward Counts", `${snapshot.rewardLaneDistribution.boostPadsCollected}/${snapshot.rewardLaneDistribution.boostPadsSpawned} boosts`, `${snapshot.rewardLaneDistribution.rampsUsed}/${snapshot.rewardLaneDistribution.rampsSpawned} ramps - ${snapshot.rewardLaneDistribution.gasCansCollected}/${snapshot.rewardLaneDistribution.gasCansSpawned} gas`)}
          ${card("Ramp Trust", `${snapshot.rewardLaneDistribution.rampTargetsCleared}/${snapshot.rewardLaneDistribution.rampTargetsAssigned} targets`, `${snapshot.rewardLaneDistribution.rampAirborneDuration}s air - ${snapshot.rewardLaneDistribution.rampClearDistance} clear - ${snapshot.rewardLaneDistribution.rampLandingRejected} rejects - ${snapshot.rewardLaneDistribution.rampFailedToClearTarget} failed`)}
          ${card("Counters", `${snapshot.counters.activeFieldBudgetDelays} active-field delays`, `${snapshot.counters.activeFieldRejectedSpawns} active rejects - ${snapshot.counters.combinedRouteFailures} route blocks`)}
        </div>
        <div class="playtest-report-columns director-lab-columns">
          <section>
            <h3>Recent Wave History</h3>
            ${waveHistoryList}
          </section>
          <section>
            <h3>Recent Rejections</h3>
            ${rejectionList}
          </section>
        </div>
        <div class="score-grid playtest-detail-grid">
          <div class="score-card"><strong>Route Worst Slice</strong><span class="is-compact">${escapeHtml(snapshot.routeValidation.worstSlice ? `hard ${snapshot.routeValidation.worstSlice.hardLanes.join(",") || "none"} clear ${snapshot.routeValidation.worstSlice.clearLanes.join(",") || "none"} reachable ${snapshot.routeValidation.worstSlice.reachableClearLanes.join(",") || "none"}` : "none")}</span></div>
          <div class="score-card"><strong>Family / Intent History</strong><span class="is-compact">${escapeHtml(snapshot.recentFamilyIntentHistory.map((item) => `${item.family}/${item.directorIntent || item.intent}`).slice(-6).join(" > ") || "none")}</span></div>
          <div class="score-card"><strong>Reward Lanes</strong><span class="is-compact">${escapeHtml(`side ${snapshot.rewardLaneDistribution.sideLaneRewards || 0} center ${snapshot.rewardLaneDistribution.centerRewards || 0}`)}</span></div>
          <div class="score-card"><strong>Not Tracked Yet</strong><span class="is-compact">${escapeHtml(notTrackedText)}</span></div>
        </div>
        <div class="row playtest-action-row">
          <button class="small-button primary" data-action="copyRoadDirectorReport">Copy Director Report</button>
          <button class="small-button" data-action="roadDirectorLab">Refresh</button>
          <button class="small-button" data-action="settings">Back to Settings</button>
          <button class="small-button" data-action="title">Back to Title</button>
        </div>
        ${this.roadDirectorReportCopyText ? `
          <div class="field playtest-copy-field">
            <label for="roadDirectorReportCopyText">Manual Copy</label>
            <textarea id="roadDirectorReportCopyText" readonly>${escapeHtml(this.roadDirectorReportCopyText)}</textarea>
          </div>
        ` : ""}
        <p class="status-line">${escapeHtml(message)}</p>
      </section>
    `;
    this.bindLayerButtons();
    const copyText = document.getElementById("roadDirectorReportCopyText");
    if (copyText) {
      copyText.focus();
      copyText.select();
    }
  }

  showPlaytestReportScreen(message = "") {
    this.setScreen("playtestReport");
    this.audio.playMusic("title", false);
    const filter = normalizePlaytestReportFilter(this.playtestReportFilter);
    const aggregate = this.buildPlaytestReportAggregate(filter);
    const filterButtons = PLAYTEST_REPORT_FILTERS.map((item) => `
      <button class="small-button ${item.id === filter ? "primary" : ""}" data-action="showPlaytestReport" data-filter="${escapeAttr(item.id)}">${escapeHtml(item.label)}</button>
    `).join("");
    const trackList = this.renderPlaytestSummaryList(aggregate.trackRows, "No track data yet.", (row) => `
      <li class="leaderboard-item playtest-report-row">
        <span class="leaderboard-rank">${escapeHtml(row.label)}</span>
        <span class="meta">${row.count} runs · ${this.formatPlaytestPercent(row.completionRate)} finished · Avg ${formatScore(row.averageScore)} · ${formatTime(row.averageDuration)}</span>
      </li>
    `);
    const modeList = this.renderPlaytestSummaryList(aggregate.modeRows, "No mode data yet.", (row) => `
      <li class="leaderboard-item playtest-report-row">
        <span class="leaderboard-rank">${escapeHtml(row.label)}</span>
        <span class="meta">${row.count} runs · ${this.formatPlaytestPercent(row.completionRate)} finished · Avg ${formatScore(row.averageScore)} · ${formatTime(row.averageDuration)}</span>
      </li>
    `);
    const typeList = this.renderPlaytestSummaryList(aggregate.typeRows, "No race type data yet.", (row) => `
      <li class="leaderboard-item playtest-report-row">
        <span class="leaderboard-rank">${escapeHtml(row.label)}</span>
        <span class="meta">${row.count} runs · ${this.formatPlaytestPercent(row.completionRate)} finished · Avg ${formatScore(row.averageScore)} · ${formatTime(row.averageDuration)}</span>
      </li>
    `);
    const crashList = this.renderPlaytestSummaryList(aggregate.crashRows, "No crashes recorded in this filter.", (row) => `
      <li class="leaderboard-item playtest-report-row">
        <span class="leaderboard-rank">${escapeHtml(row.label)}</span>
        <span class="leaderboard-score">${row.count}</span>
      </li>
    `);
    const challengeList = this.renderPlaytestSummaryList(aggregate.challengeSummary.rows, "No challenge runs recorded in this filter.", (row) => `
      <li class="leaderboard-item playtest-report-row">
        <span class="leaderboard-rank">${escapeHtml(row.label)}</span>
        <span class="meta">${row.completed}/${row.count} complete · ${row.newBest} new best${row.newBest === 1 ? "" : "s"}</span>
      </li>
    `);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel playtest-report-panel">
        <div class="playtest-report-header">
          <div>
            <span class="eyebrow">Local Development Only</span>
            <h2>Playtest Report</h2>
            <p class="hint">Run summaries are stored only in this browser under ${escapeHtml(PLAYTEST_REPORT_STORAGE_KEY)}.</p>
          </div>
          <div class="playtest-report-status">
            <strong>${aggregate.totalStored}</strong>
            <span>total stored</span>
          </div>
        </div>
        <div class="playtest-session-cta">
          <strong>After a family play session</strong>
          <span>Tap Copy Playtest Report and paste it into ChatGPT for tuning.</span>
          <small>Local only: the report is generated from runs saved in this browser.</small>
        </div>
        ${this.renderWeekendPlaytestChecklist({ compact: true })}
        ${this.renderResetCleanupReminder()}
        <div class="row playtest-filter-row">${filterButtons}</div>
        <div class="score-grid playtest-summary-grid">
          <div class="score-card"><strong>Filtered Runs</strong><span>${aggregate.filteredCount}</span></div>
          <div class="score-card"><strong>Completion Rate</strong><span>${this.formatPlaytestPercent(aggregate.completionRate)}</span></div>
          <div class="score-card"><strong>Average Score</strong><span>${formatScore(aggregate.averageScore)}</span></div>
          <div class="score-card"><strong>Average Duration</strong><span>${formatTime(aggregate.averageDuration)}</span></div>
          <div class="score-card"><strong>Out Of Fuel</strong><span>${aggregate.outOfFuelCount}</span></div>
          <div class="score-card"><strong>Avg Boosts Used</strong><span>${this.formatPlaytestDecimal(aggregate.averageBoostsUsed)}</span></div>
          <div class="score-card"><strong>Avg Lane Changes</strong><span>${this.formatPlaytestDecimal(aggregate.averageLaneChanges)}</span></div>
          <div class="score-card"><strong>Avg Center-Lane Time</strong><span>${formatTime(aggregate.averageCenterLaneTime)}</span></div>
          <div class="score-card"><strong>New Badges</strong><span>${aggregate.totalNewBadges}</span></div>
          <div class="score-card"><strong>Badge High Water</strong><span>${aggregate.maxTotalBadgesEarned}/${getVisibleBadgeDefinitions().length}</span></div>
          <div class="score-card"><strong>Avg Waves First 10s</strong><span>${this.formatPlaytestDecimal(aggregate.averageWavesFirst10Seconds)}</span></div>
          <div class="score-card"><strong>Avg Launch Waves</strong><span>${this.formatPlaytestDecimal(aggregate.averageLaunchWaveCount)}</span></div>
          <div class="score-card"><strong>Avg Meaningful Waves</strong><span>${this.formatPlaytestDecimal(aggregate.averageMeaningfulWaveCount)}</span></div>
          <div class="score-card"><strong>Visible Spawn Violations</strong><span>${aggregate.totalVisibleSpawnViolations}</span></div>
          <div class="score-card"><strong>Max Waves/Frame</strong><span>${aggregate.maxWavesSpawnedInSingleFrame}</span></div>
          <div class="score-card"><strong>Catch-Up Blocks</strong><span>${aggregate.totalCatchUpSpawnsBlocked}</span></div>
          <div class="score-card"><strong>Max Visible Hard</strong><span>${aggregate.maxVisibleHardBlockers}</span></div>
          <div class="score-card"><strong>Max Tactical Hard</strong><span>${aggregate.maxTacticalHardBlockers}</span></div>
          <div class="score-card"><strong>Max Next 3s Hard</strong><span>${aggregate.maxHardBlockersNext3Seconds}</span></div>
          <div class="score-card"><strong>Max Wave Overlap</strong><span>${aggregate.maxVisibleWaveOverlap}</span></div>
          <div class="score-card"><strong>Active Field Delays</strong><span>${aggregate.totalActiveFieldBudgetDelays}</span></div>
          <div class="score-card"><strong>Combined Route Blocks</strong><span>${aggregate.totalCombinedRouteFailures}</span></div>
          <div class="score-card"><strong>Support Suppressed</strong><span>${aggregate.totalSupportObjectsSuppressedByDensity}</span></div>
          <div class="score-card"><strong>Dead Screen Time</strong><span>${formatTime(aggregate.totalDeadScreenTime)}</span></div>
          <div class="score-card"><strong>Longest Dead Screen</strong><span>${this.formatPlaytestDecimal(aggregate.longestDeadScreenSeconds, 1)}s</span></div>
          <div class="score-card"><strong>Visible Meaningful Min</strong><span>${Number.isFinite(aggregate.visibleMeaningfulMin) ? aggregate.visibleMeaningfulMin : 0}</span></div>
          <div class="score-card"><strong>Avg Visible Meaningful</strong><span>${this.formatPlaytestDecimal(aggregate.averageVisibleMeaningful, 2)}</span></div>
          <div class="score-card"><strong>Upcoming Gap Max</strong><span>${this.formatPlaytestDecimal(aggregate.upcomingDecisionGapMax, 1)}s</span></div>
          <div class="score-card"><strong>Underactivity Fixes</strong><span>${aggregate.totalUnderActivityCorrections}</span></div>
          <div class="score-card"><strong>Over-Density Delays</strong><span>${aggregate.totalOverActivityDelays}</span></div>
          <div class="score-card"><strong>Fuel Gas Collected</strong><span>${this.formatPlaytestDecimal(aggregate.fuelSummary.averageGasCansCollected)}</span></div>
          <div class="score-card"><strong>Fuel Left On Finishes</strong><span>${this.formatPlaytestDecimal(aggregate.fuelSummary.averageFuelRemainingOnFinishes)}</span></div>
          <div class="score-card"><strong>Fuel Saved By Boost</strong><span>${this.formatPlaytestDecimal(aggregate.fuelSummary.totalFuelSavedByBoost)} fuel</span></div>
          <div class="score-card"><strong>Fuel Pause Time</strong><span>${this.formatPlaytestDecimal(aggregate.fuelSummary.totalFuelDrainPausedTime)}s</span></div>
          <div class="score-card"><strong>Fuel Boost Uses</strong><span>${aggregate.fuelSummary.totalBoostsUsedInFuelRun}</span></div>
          <div class="score-card"><strong>Challenge Runs</strong><span>${aggregate.challengeSummary.completed}/${aggregate.challengeSummary.runs}</span></div>
          <div class="score-card"><strong>Party Runs</strong><span>${aggregate.partySummary.runs}</span></div>
        </div>
        <div class="playtest-report-columns">
          <section>
            <h3>Tracks</h3>
            ${trackList}
          </section>
          <section>
            <h3>Race Modes</h3>
            ${modeList}
          </section>
          <section>
            <h3>Race Types</h3>
            ${typeList}
          </section>
          <section>
            <h3>Crash Types</h3>
            ${crashList}
          </section>
          <section>
            <h3>Challenges</h3>
            ${challengeList}
          </section>
        </div>
        <div class="score-grid playtest-detail-grid">
          <div class="score-card"><strong>Fuel Runs</strong><span class="is-compact">${aggregate.fuelSummary.runs} runs · ${this.formatPlaytestDecimal(aggregate.fuelSummary.averageGasCansSpawned)} gas spawned · ${formatTime(aggregate.fuelSummary.averageLowFuelTime)} low fuel · ${formatTime(aggregate.fuelSummary.averageCriticalFuelTime)} critical</span></div>
          <div class="score-card"><strong>Party Summary</strong><span class="is-compact">${aggregate.partySummary.sessions} sessions · avg rank ${this.formatPlaytestDecimal(aggregate.partySummary.averageRank)} · avg gap ${formatScore(aggregate.partySummary.averageLeaderGap)} · avg players ${this.formatPlaytestDecimal(aggregate.partySummary.playerCountAverage)} · leader changes ${aggregate.partySummary.leaderChanges}</span></div>
        </div>
        <div class="row playtest-action-row">
          <button class="small-button primary" data-action="copyPlaytestReport">Copy Playtest Report</button>
          <button class="danger-button" data-action="clearPlaytestReports">Clear Playtest Reports</button>
          <button class="small-button" data-action="settings">Back to Settings</button>
          <button class="small-button" data-action="title">Back to Title</button>
        </div>
        ${this.playtestReportCopyText ? `
          <div class="field playtest-copy-field">
            <label for="playtestReportCopyText">Manual Copy</label>
            <textarea id="playtestReportCopyText" readonly>${escapeHtml(this.playtestReportCopyText)}</textarea>
          </div>
        ` : ""}
        <p class="status-line">${escapeHtml(message || this.playtestReports.status)}</p>
      </section>
    `;
    this.bindLayerButtons();
    const copyText = document.getElementById("playtestReportCopyText");
    if (copyText) {
      copyText.focus();
      copyText.select();
    }
  }

  formatSpeedClassOptionForTrack(track, speedClass, options = {}) {
    const raceTrack = createRaceTrackForSpeedClass(track, speedClass.id);
    const startSpeed = Math.round(getTrackCruiseSpeed(raceTrack, 0, speedClass.id));
    const endSpeed = Math.round(getTrackCruiseSpeed(raceTrack, 1, speedClass.id));
    const ladderNumber = getSpeedClassLadderNumber(speedClass.id);
    const prefix = ladderNumber ? `${ladderNumber}. ` : "";
    const copy = options.withDescription !== false && speedClass.description
      ? ` - ${speedClass.description}`
      : "";
    return `${prefix}${speedClass.label} · ${startSpeed}-${endSpeed} MPH · x${speedClass.scoreMultiplier.toFixed(2)}${copy}`;
  }

  renderSpeedClassOptionsForTrack(track, selectedSpeedClassId) {
    const selectedId = normalizeSpeedClassId(selectedSpeedClassId, DEFAULT_SPEED_CLASS_ID);
    const optionFor = (speedClass) => `<option value="${escapeAttr(speedClass.id)}" ${speedClass.id === selectedId ? "selected" : ""}>${escapeHtml(this.formatSpeedClassOptionForTrack(track, speedClass))}</option>`;
    const normalOptions = getNormalVisibleSpeedClasses().map(optionFor).join("");
    const trainingOptions = getTrainingSpeedClasses().map(optionFor).join("");
    return `
      <optgroup label="Main Race Ladder">
        ${normalOptions}
      </optgroup>
      <optgroup label="Training / Easy Modes">
        ${trainingOptions}
      </optgroup>
    `;
  }

  renderSpeedClassLadder(track, selectedSpeedClassId) {
    const selectedId = normalizeSpeedClassId(selectedSpeedClassId, DEFAULT_SPEED_CLASS_ID);
    return `
      <div class="mode-ladder" aria-label="Main race mode ladder">
        ${getNormalVisibleSpeedClasses().map((speedClass, index) => {
          const raceTrack = createRaceTrackForSpeedClass(track, speedClass.id);
          const startSpeed = Math.round(getTrackCruiseSpeed(raceTrack, 0, speedClass.id));
          const endSpeed = Math.round(getTrackCruiseSpeed(raceTrack, 1, speedClass.id));
          return `
            <button class="mode-ladder-card ${speedClass.id === selectedId ? "is-selected" : ""}" type="button" data-action="setModePickerSpeed" data-id="${escapeAttr(speedClass.id)}">
              <span>${index + 1}</span>
              <strong>${escapeHtml(speedClass.label)}</strong>
              <small>${escapeHtml(speedClass.description || "")}</small>
              <em>${startSpeed}-${endSpeed} MPH</em>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  renderRaceTypeOptionsForTrack(track, selectedRaceTypeId) {
    const supported = getRaceTypesForTrack(track);
    const selectedId = supported.some((item) => item.id === selectedRaceTypeId)
      ? selectedRaceTypeId
      : DEFAULT_RACE_TYPE_ID;
    return supported.map((item) => (
      `<option value="${escapeAttr(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.label)} - ${escapeHtml(item.description)}</option>`
    )).join("");
  }

  renderTrackSelect(name, selectedTrackId) {
    const selectedId = normalizeTrackId(selectedTrackId, DEFAULT_TRACK_ID);
    return `
      <div class="track-select-grid" role="radiogroup" aria-label="Track Select">
        ${TRACKS.map((track) => {
          const selected = track.id === selectedId;
          const modes = Array.isArray(track.recommendedModes) ? track.recommendedModes.join(" | ") : "Solo / Seeded Run";
          const fuelLabel = trackSupportsRaceType(track, FUEL_RUN_RACE_TYPE_ID) ? "Fuel Run ready" : "Classic only";
          return `
            <label class="track-option ${selected ? "selected" : ""}" data-track-card="${escapeAttr(track.id)}">
              <input type="radio" name="${escapeAttr(name)}" value="${escapeAttr(track.id)}" ${selected ? "checked" : ""}>
              <span class="track-option-title">
                <strong>${escapeHtml(track.name)}</strong>
                <em>${escapeHtml(fuelLabel)}</em>
              </span>
              <span>${escapeHtml(track.cardIdentity || track.description)}</span>
              <small>Recommended: ${escapeHtml(modes)}</small>
              <small>${escapeHtml(getTrackMusicStatus(track))}</small>
            </label>
          `;
        }).join("")}
      </div>
    `;
  }

  getSelectedTrackFromInputs(name, fallback = this.pendingTrackId || DEFAULT_TRACK_ID) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return getTrackById(checked?.value || fallback);
  }

  syncTrackSelectCards(name, selectedTrackId) {
    const selectedId = normalizeTrackId(selectedTrackId, DEFAULT_TRACK_ID);
    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      const card = input.closest(".track-option");
      if (card) card.classList.toggle("selected", input.value === selectedId);
    });
  }

  syncRaceTypeSelectForTrack(select, track) {
    if (!select) return DEFAULT_RACE_TYPE_ID;
    const selectedId = normalizeRaceTypeId(select.value || this.pendingRaceTypeId, DEFAULT_RACE_TYPE_ID);
    const supported = getRaceTypesForTrack(track);
    const safeId = supported.some((item) => item.id === selectedId) ? selectedId : DEFAULT_RACE_TYPE_ID;
    select.innerHTML = this.renderRaceTypeOptionsForTrack(track, safeId);
    select.value = safeId;
    return safeId;
  }

  syncSpeedClassSelectForTrack(select, track) {
    if (!select) return;
    const selectedId = normalizeSpeedClassId(select.value, DEFAULT_SPEED_CLASS_ID);
    select.innerHTML = this.renderSpeedClassOptionsForTrack(track, selectedId);
    select.value = selectedId;
  }

  syncModeLadderSelection(selectedSpeedClassId) {
    const selectedId = normalizeSpeedClassId(selectedSpeedClassId, DEFAULT_SPEED_CLASS_ID);
    document.querySelectorAll(".mode-ladder-card").forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.id === selectedId);
    });
  }

  syncModeLadderMetrics(track) {
    const safeTrack = track || TRACKS[0];
    document.querySelectorAll(".mode-ladder-card").forEach((card) => {
      const speedClass = getSpeedClassConfig(card.dataset.id);
      const raceTrack = createRaceTrackForSpeedClass(safeTrack, speedClass.id);
      const startSpeed = Math.round(getTrackCruiseSpeed(raceTrack, 0, speedClass.id));
      const endSpeed = Math.round(getTrackCruiseSpeed(raceTrack, 1, speedClass.id));
      const readout = card.querySelector("em");
      if (readout) readout.textContent = `${startSpeed}-${endSpeed} MPH`;
    });
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
    const track = getTrackById(this.pendingTrackId || DEFAULT_TRACK_ID);
    const requestedRaceTypeId = normalizeRaceTypeId(this.pendingRaceTypeId || DEFAULT_RACE_TYPE_ID, DEFAULT_RACE_TYPE_ID);
    const raceType = getRaceTypeConfig(trackSupportsRaceType(track, requestedRaceTypeId) ? requestedRaceTypeId : DEFAULT_RACE_TYPE_ID);
    const seed = this.resolveRoadSeed(this.pendingRoadSeed);
    this.pendingRoadSeed = seed;
    this.pendingTrackId = track.id;
    this.pendingRaceTypeId = raceType.id;
    const seedSource = getRunRandomSeedSource(seed, track, speedClass.id, raceType.id);
    const seedHash = hashSeed(seedSource) >>> 0;
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel compact pre-race-panel">
        <div class="form-stack">
          <div>
            <span class="eyebrow">Solo / Seeded Run</span>
            <h2>Track Select</h2>
            <p class="hint">One driver, one seed, one clean run through the selected track.</p>
          </div>
          <div class="score-grid mode-context-grid">
            <div class="score-card"><strong>Driver</strong><span>${escapeHtml(player.name)}</span></div>
            <div class="score-card"><strong>Race Type</strong><span id="preRaceTypeSummary">${escapeHtml(raceType.label)}</span></div>
            <div class="score-card"><strong>Race Mode</strong><span id="preRaceModeSummary">${escapeHtml(speedClass.label)} · x${speedClass.scoreMultiplier.toFixed(2)}</span></div>
            <div class="score-card"><strong>Track</strong><span id="preRaceTrackSummary">${escapeHtml(track.name)}</span></div>
            <div class="score-card"><strong>Music</strong><span id="preRaceMusicSummary">${escapeHtml(getTrackMusicStatus(track))}</span></div>
            <div class="score-card"><strong>Seed Hash</strong><span id="roadSeedHashValue">${seedHash}</span></div>
          </div>
          <div class="field">
            <label>Track</label>
            ${this.renderTrackSelect("preRaceTrack", track.id)}
          </div>
          <div class="field">
            <label for="preRaceType">Race Type</label>
            <select id="preRaceType">
              ${this.renderRaceTypeOptionsForTrack(track, raceType.id)}
            </select>
          </div>
          <div class="field">
            <label for="preRaceSpeedClass">Race Mode</label>
            ${this.renderSpeedClassLadder(track, speedClass.id)}
            <select id="preRaceSpeedClass">
              ${this.renderSpeedClassOptionsForTrack(track, speedClass.id)}
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
          <p id="fuelRunBoostHint" class="hint" ${raceType.id === FUEL_RUN_RACE_TYPE_ID ? "" : "hidden"}>Fuel Run: Boost saves fuel.</p>
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
    const fuelRunBoostHint = document.getElementById("fuelRunBoostHint");
    const modeSelect = document.getElementById("preRaceSpeedClass");
    const modeSummary = document.getElementById("preRaceModeSummary");
    const trackSummary = document.getElementById("preRaceTrackSummary");
    const musicSummary = document.getElementById("preRaceMusicSummary");
    if (!input || !display) return;
    const updateDisplay = () => {
      const normalized = normalizeRoadSeed(input.value, "");
      if (input.value !== normalized) input.value = normalized;
      const track = this.getSelectedTrackFromInputs("preRaceTrack", this.pendingTrackId || DEFAULT_TRACK_ID);
      const speedClass = getSpeedClassConfig(modeSelect?.value || this.profiles.data.speedClassId);
      const raceTypeId = normalizeRaceTypeId(raceTypeSelect?.value || this.pendingRaceTypeId || DEFAULT_RACE_TYPE_ID, DEFAULT_RACE_TYPE_ID);
      const raceType = getRaceTypeConfig(trackSupportsRaceType(track, raceTypeId) ? raceTypeId : DEFAULT_RACE_TYPE_ID);
      const hash = normalized ? (hashSeed(getRunRandomSeedSource(normalized, track, speedClass.id, raceType.id)) >>> 0) : "pending";
      this.syncModeLadderMetrics(track);
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
      this.syncModeLadderSelection(speedClass.id);
      if (raceTypeSummary) {
        raceTypeSummary.textContent = raceType.label;
      }
      if (fuelRunBoostHint) {
        fuelRunBoostHint.hidden = raceType.id !== FUEL_RUN_RACE_TYPE_ID;
      }
      if (trackSummary) {
        trackSummary.textContent = track.name;
      }
      if (musicSummary) {
        musicSummary.textContent = getTrackMusicStatus(track);
      }
    };
    const syncTrackDependentControls = () => {
      const track = this.getSelectedTrackFromInputs("preRaceTrack", this.pendingTrackId || DEFAULT_TRACK_ID);
      this.pendingTrackId = track.id;
      this.audio.setRaceMusicTrack(track);
      this.syncTrackSelectCards("preRaceTrack", track.id);
      const safeRaceTypeId = this.syncRaceTypeSelectForTrack(raceTypeSelect, track);
      this.pendingRaceTypeId = safeRaceTypeId;
      this.syncSpeedClassSelectForTrack(modeSelect, track);
      updateDisplay();
    };
    document.querySelectorAll('input[name="preRaceTrack"]').forEach((inputEl) => {
      inputEl.addEventListener("change", syncTrackDependentControls);
    });
    document.querySelectorAll('[data-track-card]').forEach((card) => {
      const inputEl = card.querySelector('input[name="preRaceTrack"]');
      if (!inputEl) return;
      card.addEventListener("click", () => {
        if (inputEl.checked) return;
        inputEl.checked = true;
        inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
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
    syncTrackDependentControls();
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
    const track = this.getSelectedTrackFromInputs("preRaceTrack", this.pendingTrackId || DEFAULT_TRACK_ID);
    const seed = this.resolveRoadSeed(input?.value ?? this.pendingRoadSeed);
    const speedClassId = normalizeSpeedClassId(modeSelect?.value, this.profiles.data.speedClassId);
    const requestedRaceTypeId = normalizeRaceTypeId(raceTypeSelect?.value, DEFAULT_RACE_TYPE_ID);
    const raceTypeId = trackSupportsRaceType(track, requestedRaceTypeId) ? requestedRaceTypeId : DEFAULT_RACE_TYPE_ID;
    this.profiles.updateSpeedClass(speedClassId);
    this.pendingRoadSeed = seed;
    this.pendingRaceTypeId = raceTypeId;
    this.pendingTrackId = track.id;
    if (input) input.value = seed;
    this.startRace({ seed, speedClassId, raceTypeId, track });
  }

  createDefaultPartySetup() {
    const players = this.profiles.data.players;
    const currentId = this.profiles.data.currentPlayerId;
    const orderedPlayers = currentId
      ? players.filter((player) => player.id === currentId).concat(players.filter((player) => player.id !== currentId))
      : players.slice();
    return {
      selectedPlayerIds: orderedPlayers.slice(0, Math.min(PARTY_MIN_PLAYERS, orderedPlayers.length)).map((player) => player.id),
      trackId: DEFAULT_TRACK_ID,
      raceMode: normalizeSpeedClassId(this.profiles.data.speedClassId, DEFAULT_SPEED_CLASS_ID),
      raceType: DEFAULT_RACE_TYPE_ID,
      sharedSeed: generateReadableRoadSeed(),
      roundType: PARTY_ROUND_TYPE_ONE_RUN,
      seedMode: PARTY_SEED_MODE_SAME_ROUND
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
    this.partySetup.trackId = normalizeTrackId(this.partySetup.trackId, DEFAULT_TRACK_ID);
    this.partySetup.roundType = normalizePartyRoundType(this.partySetup.roundType, PARTY_ROUND_TYPE_ONE_RUN);
    this.partySetup.seedMode = normalizePartySeedMode(this.partySetup.seedMode, PARTY_SEED_MODE_SAME_ROUND);
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
    const roundType = document.getElementById("partyRoundType");
    const seedMode = document.getElementById("partySeedMode");
    const seedInput = document.getElementById("partySeedInput");
    const track = this.getSelectedTrackFromInputs("partyTrack", setup.trackId || DEFAULT_TRACK_ID);
    setup.trackId = track.id;
    if (raceMode) setup.raceMode = normalizeSpeedClassId(raceMode.value, setup.raceMode);
    if (roundType) setup.roundType = normalizePartyRoundType(roundType.value, setup.roundType);
    if (seedMode) setup.seedMode = normalizePartySeedMode(seedMode.value, setup.seedMode);
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
            <button class="small-button" data-action="howToPlay">How To Play</button>
            <button class="small-button" data-action="title">Return to Title</button>
          </div>
          <p class="status-line">${escapeHtml(message || "Party Mode needs 2-8 local players.")}</p>
        </section>
      `;
      this.bindLayerButtons();
      return;
    }

    const setup = this.getPartySetup();
    const track = getTrackById(setup.trackId);
    const selectedPlayers = this.getPartySetupSelectedPlayers();
    const selectedIds = new Set(setup.selectedPlayerIds);
    const seed = setup.sharedSeed || "Random seed on start";
    const seedHash = setup.sharedSeed ? (hashSeed(getRunRandomSeedSource(setup.sharedSeed, track, setup.raceMode, DEFAULT_RACE_TYPE_ID)) >>> 0) : "pending";
    const roundTypeConfig = getPartyRoundTypeConfig(setup.roundType);
    const seedModeLabel = getPartySeedModeLabel(setup.seedMode);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel party-panel">
        <h2>Party Mode</h2>
        <p class="hint">Pass the keyboard on one local machine. Best of 3 and Total Score use three runs per player. Party Mode stays Classic for this pass.</p>
        ${this.renderPartySetupHelp()}
        ${this.renderWeekendPlaytestPicks({ context: "party", heading: "Party Playtest Pick", hint: "Use this for the first room-friendly pass.", filter: "party" })}
        <div class="party-summary-strip">
          <div class="score-card"><strong>Selected Players</strong><span>${selectedPlayers.length}/${PARTY_MAX_PLAYERS}</span></div>
          <div class="score-card"><strong>Track</strong><span id="partyTrackSummary">${escapeHtml(track.name)}</span></div>
          <div class="score-card"><strong>Race Type</strong><span>Classic</span></div>
          <div class="score-card"><strong>Race Mode</strong><span>${escapeHtml(getSpeedClassLabel(setup.raceMode))}</span></div>
          <div class="score-card"><strong>Music</strong><span id="partyMusicSummary">${escapeHtml(getTrackMusicStatus(track))}</span></div>
          <div class="score-card"><strong>Shared Seed</strong><span class="is-compact">${escapeHtml(seed)}</span></div>
          <div class="score-card"><strong>Round Type</strong><span id="partyRoundSummary">${escapeHtml(roundTypeConfig.label)}</span></div>
          <div class="score-card"><strong>Seed Behavior</strong><span id="partySeedModeSummary">${escapeHtml(seedModeLabel)}</span></div>
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
              <label>Track</label>
              ${this.renderTrackSelect("partyTrack", track.id)}
            </div>
            <div class="field">
              <label for="partyRaceMode">Race Mode</label>
              ${this.renderSpeedClassLadder(track, setup.raceMode)}
              <select id="partyRaceMode">
                ${this.renderSpeedClassOptionsForTrack(track, setup.raceMode)}
              </select>
            </div>
            <div class="field">
              <label for="partyRoundType">Round Type</label>
              <select id="partyRoundType">
                ${PARTY_ROUND_TYPES.map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === setup.roundType ? "selected" : ""}>${escapeHtml(item.label)}${item.totalRounds > 1 ? ` - ${item.totalRounds} runs each` : ""}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="partySeedMode">Seed Behavior</label>
              <select id="partySeedMode">
                ${PARTY_SEED_MODES.map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === setup.seedMode ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
              </select>
            </div>
            <div class="seed-display" aria-live="polite">
              <span>Round 1 Party Seed</span>
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
              <button class="small-button" data-action="howToPlay">How To Play</button>
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
    const roundType = document.getElementById("partyRoundType");
    const seedMode = document.getElementById("partySeedMode");
    const trackSummary = document.getElementById("partyTrackSummary");
    const musicSummary = document.getElementById("partyMusicSummary");
    const roundSummary = document.getElementById("partyRoundSummary");
    const seedModeSummary = document.getElementById("partySeedModeSummary");
    const updateSeedDisplay = () => {
      if (!input || !display) return;
      const normalized = normalizeRoadSeed(input.value, "");
      if (input.value !== normalized) input.value = normalized;
      const track = this.getSelectedTrackFromInputs("partyTrack", this.getPartySetup().trackId || DEFAULT_TRACK_ID);
      const mode = normalizeSpeedClassId(raceMode?.value, DEFAULT_SPEED_CLASS_ID);
      this.syncModeLadderMetrics(track);
      this.syncModeLadderSelection(mode);
      display.textContent = normalized || "Random seed on start";
      if (seedHash) {
        seedHash.textContent = normalized
          ? `Seed hash: ${hashSeed(getRunRandomSeedSource(normalized, track, mode, DEFAULT_RACE_TYPE_ID)) >>> 0}`
          : "Seed hash: pending";
      }
      if (trackSummary) trackSummary.textContent = track.name;
      if (musicSummary) musicSummary.textContent = getTrackMusicStatus(track);
      if (roundSummary) roundSummary.textContent = getPartyRoundTypeLabel(roundType?.value || this.getPartySetup().roundType);
      if (seedModeSummary) seedModeSummary.textContent = getPartySeedModeLabel(seedMode?.value || this.getPartySetup().seedMode);
    };
    const syncTrackDependentControls = () => {
      const setup = this.readPartySetupForm();
      const track = getTrackById(setup.trackId);
      this.syncTrackSelectCards("partyTrack", track.id);
      this.syncSpeedClassSelectForTrack(raceMode, track);
      this.audio.setRaceMusicTrack(track);
      updateSeedDisplay();
    };
    document.querySelectorAll('input[name="partyTrack"]').forEach((inputEl) => {
      inputEl.addEventListener("change", syncTrackDependentControls);
    });
    document.querySelectorAll('[data-track-card]').forEach((card) => {
      const inputEl = card.querySelector('input[name="partyTrack"]');
      if (!inputEl) return;
      card.addEventListener("click", () => {
        if (inputEl.checked) return;
        inputEl.checked = true;
        inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
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
    if (roundType) {
      roundType.addEventListener("change", () => {
        this.readPartySetupForm();
        updateSeedDisplay();
      });
    }
    if (seedMode) {
      seedMode.addEventListener("change", () => {
        this.readPartySetupForm();
        updateSeedDisplay();
      });
    }
    syncTrackDependentControls();
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
    const track = getTrackById(setup.trackId);
    setup.sharedSeed = sharedSeed;
    setup.selectedPlayerIds = selectedPlayers.map((player) => player.id);
    setup.trackId = track.id;
    this.partySession = new PartySession({
      players: selectedPlayers,
      sharedSeed,
      track,
      raceMode: setup.raceMode,
      raceType: DEFAULT_RACE_TYPE_ID,
      roundType: setup.roundType,
      seedMode: setup.seedMode
    });
    this.pendingRoadSeed = sharedSeed;
    this.pendingTrackId = track.id;
    this.showPartyTurnScreen(`${getPartyRoundTypeLabel(setup.roundType)} ready.`);
  }

  renderPartyCallouts(session, standings, recentResult, final = false) {
    const leader = standings[0] || null;
    const runnerUp = standings[1] || null;
    const callouts = [];
    if (recentResult?.partyLeaderChanged) {
      callouts.push(`<span class="score-callout is-hot">New Leader</span>`);
    }
    if ((recentResult?.partyComebackPlaces || 0) > 0) {
      callouts.push(`<span class="score-callout is-hot">Comeback Run +${recentResult.partyComebackPlaces}</span>`);
    }
    if (leader && runnerUp && isPartyCloseRaceMargin(leader.rankScore, runnerUp.leaderMargin)) {
      callouts.push(`<span class="score-callout is-hot">Close Race</span>`);
    }
    if (final && leader) {
      callouts.push(`<span class="score-callout is-hot">Winner by ${formatScore(session.marginOfVictory() || 0)} points</span>`);
    }
    if (!final && recentResult?.roundCompleted && session.totalRounds > 1) {
      callouts.push(`<span class="score-callout">Round ${recentResult.roundNumber} Complete</span>`);
    }
    if (!callouts.length) return "";
    return `<div class="score-callout-row party-callout-row">${callouts.join("")}</div>`;
  }

  renderPartyStandingsList(session, standings, recentResult = null, final = false) {
    const metricLabel = session.scoringLabel;
    return `
      <ol class="leaderboard-list party-standings-list">
        ${standings.length ? standings.map((result, index) => {
          const recent = recentResult && result.playerId === recentResult.playerId && result.resultId === recentResult.resultId;
          const latestMeta = result.completedRuns > 0
            ? `${escapeHtml(getRunStatusLabel(result.latestStatus, result.latestReason))} · ${formatTime(result.latestTime)} · Round ${result.latestRoundNumber}`
            : "Waiting for first run";
          return `
            <li class="leaderboard-item party-standing-row ${final && index === 0 ? "is-winner" : ""} ${recent ? "is-recent" : ""}">
              <span class="leaderboard-rank">#${result.rank}</span>
              <span>
                <strong>${escapeHtml(result.playerName)}</strong>
                <span class="meta">${escapeHtml(result.carName)} · ${escapeHtml(latestMeta)}${result.leaderboardRank ? ` · Top 20 #${result.leaderboardRank}` : ""}</span>
                <span class="party-stat-grid">
                  <span><strong>Latest</strong><em>${formatScore(result.latestScore)}</em></span>
                  <span><strong>Best</strong><em>${formatScore(result.bestScore)}</em></span>
                  <span><strong>Total</strong><em>${formatScore(result.totalScore)}</em></span>
                  <span><strong>Runs</strong><em>${result.completedRuns}/${session.totalRounds}</em></span>
                </span>
                ${this.renderMedalChips(result.medals, true)}
              </span>
              <span class="party-score-stack">
                <small>${escapeHtml(metricLabel)}</small>
                <span class="leaderboard-score">${formatScore(result.rankScore)}</span>
                <span class="party-margin">${result.leaderMargin === 0 ? "Leader" : `${formatScore(result.leaderMargin)} back`}</span>
              </span>
            </li>
          `;
        }).join("") : `<li class="leaderboard-item"><span class="meta">No party players selected.</span></li>`}
      </ol>
    `;
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
    const roundSeed = session.currentSeed;
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel split party-turn-panel">
        <div class="form-stack">
          <div>
            <span class="eyebrow">Round ${session.roundNumber} of ${session.totalRounds} · Player ${session.currentTurnNumber} of ${session.totalPlayers}</span>
            <h2>${escapeHtml(player.name)}'s Run</h2>
          </div>
          <div class="score-grid">
            <div class="score-card"><strong>Driver</strong><span>${escapeHtml(player.name)}</span></div>
            <div class="score-card"><strong>Turn</strong><span>Run ${session.completedRuns + 1} of ${session.totalRuns}</span></div>
            <div class="score-card"><strong>Round</strong><span>${session.roundNumber} of ${session.totalRounds}</span></div>
            <div class="score-card"><strong>Track</strong><span>${escapeHtml(session.track.name)}</span></div>
            <div class="score-card"><strong>Race Type</strong><span>${escapeHtml(getRaceTypeLabel(session.raceType))}</span></div>
            <div class="score-card"><strong>Race Mode</strong><span>${escapeHtml(getSpeedClassLabel(session.raceMode))}</span></div>
            <div class="score-card"><strong>Current Seed</strong><span>${escapeHtml(roundSeed)}</span></div>
            <div class="score-card"><strong>Round Type</strong><span>${escapeHtml(getPartyRoundTypeLabel(session.roundType))}</span></div>
            <div class="score-card"><strong>Seed Behavior</strong><span>${escapeHtml(getPartySeedModeLabel(session.seedMode))}</span></div>
          </div>
          <p class="hint">Press Enter or Start Run when this player is at the keyboard.</p>
          <div class="row">
            <button class="small-button primary" data-action="partyStartRun">Start Run</button>
            <button class="small-button" data-action="partyChangeSetup">Change Players/Mode</button>
            <button class="small-button" data-action="title">Return to Title</button>
          </div>
          <p class="status-line">${escapeHtml(message)}</p>
          ${standings.some((result) => result.completedRuns > 0) ? `
            <h2>Current Standings</h2>
            ${this.renderPartyStandingsList(session, standings)}
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
      seed: session.currentSeed,
      partyMode: true,
      partySeedLocked: true
    });
  }

  renderTitleCallouts(summary) {
    const changes = summary?.titleChanges || {};
    const items = []
      .concat((Array.isArray(changes.claimed) ? changes.claimed : []).map((title) => ({ ...title, state: "claimed" })))
      .concat((Array.isArray(changes.defended) ? changes.defended : []).map((title) => ({ ...title, state: "defended" })));
    if (!items.length) return "";
    const visible = items.slice(0, 3);
    const overflow = Math.max(0, items.length - visible.length);
    return visible.map((title) => `
      <span class="score-callout is-title">${title.state === "claimed" ? "Title Claimed" : "Title Defended"}: ${escapeHtml(title.name)}</span>
    `).join("") + (overflow ? `<span class="score-callout is-title">+${overflow} more titles</span>` : "");
  }

  renderNewBadgeCallouts(summary) {
    const badges = Array.isArray(summary?.newlyEarnedBadges) ? summary.newlyEarnedBadges : [];
    if (!badges.length) return "";
    const label = badges.length === 1
      ? `Badge Earned: ${badges[0].name}`
      : `${badges.length} Badges Earned`;
    return `
      <span class="score-callout is-hot is-badge">${escapeHtml(label)}</span>
    `;
  }

  renderBadgeEarnedPanel(summary, compact = false) {
    const allBadges = Array.isArray(summary?.newlyEarnedBadges) ? summary.newlyEarnedBadges : [];
    const badges = allBadges.slice(0, 4);
    if (!allBadges.length) return "";
    const playerName = sanitizePlayerName(summary?.playerName, "Driver");
    const overflowCount = Math.max(0, allBadges.length - badges.length);
    return `
      <div class="badge-earned-panel ${compact ? "is-compact" : ""}">
        <div class="badge-earned-header">
          <span class="eyebrow">${allBadges.length === 1 ? "Badge Earned" : "Badges Earned"}</span>
          <strong>${allBadges.length === 1 ? escapeHtml(allBadges[0].name) : `${allBadges.length} new badges`}</strong>
          ${compact ? "" : `<small>Saved to ${escapeHtml(playerName)}'s driver profile.</small>`}
        </div>
        <div class="badge-chip-row">
          ${badges.map((badge) => `
            <span class="badge-chip is-earned">
              <strong>${escapeHtml(badge.icon || "BDG")}</strong>
              <span>
                <b>${escapeHtml(badge.name)}</b>
                ${compact ? "" : `<small>${escapeHtml(getBadgeCategoryLabel(badge.category))} - ${escapeHtml(badge.description)}</small>`}
              </span>
            </span>
          `).join("")}
          ${overflowCount ? `<span class="badge-chip is-earned"><strong>+${overflowCount}</strong><span><b>More saved</b></span></span>` : ""}
        </div>
      </div>
    `;
  }

  renderPlayerTitlePanel(player) {
    if (!player) return "";
    const titles = this.profiles.getPlayerTitles(player);
    return `
      <div class="title-profile-panel">
        <div class="badge-profile-header">
          <div>
            <span class="eyebrow">Current Titles</span>
            <strong>${titles.length}/${TITLE_DEFINITIONS.length} held</strong>
          </div>
          <span>Can be lost</span>
        </div>
        ${titles.length ? `
          <div class="title-grid">
            ${titles.map((title) => `
              <span class="title-card is-held">
                <strong>${escapeHtml(title.icon || "TTL")}</strong>
                <span>
                  <b>${escapeHtml(title.name)}</b>
                  <small>${escapeHtml(title.context)}</small>
                </span>
                <small>${escapeHtml(title.description)} ${escapeHtml(title.statText)}${title.recordDate ? ` · ${escapeHtml(formatTitleDate(title.recordDate))}` : ""}</small>
              </span>
            `).join("")}
          </div>
        ` : `<p class="hint title-empty-state">No titles yet. Take a local record to claim one.</p>`}
      </div>
    `;
  }

  renderLocalTitleBoard() {
    const titles = this.profiles.getTitleBoard();
    return `
      <div class="title-board-panel">
        <div class="badge-profile-header">
          <div>
            <span class="eyebrow">Local Titles</span>
            <strong>${titles.filter((title) => title.held).length}/${TITLE_DEFINITIONS.length} claimed</strong>
          </div>
          <span>Local only</span>
        </div>
        <ol class="leaderboard-list title-board-list">
          ${titles.map((title) => `
            <li class="leaderboard-item title-board-item ${title.held ? "is-held" : "is-unclaimed"}">
              <span class="leaderboard-rank">${escapeHtml(title.icon || "TTL")}</span>
              <span>
                <strong>${escapeHtml(title.name)}</strong>
                <span class="meta">${escapeHtml(title.context)} · ${escapeHtml(title.description)}</span>
              </span>
              <span class="leaderboard-score">${title.held ? `${escapeHtml(title.playerName)} · ${escapeHtml(title.statText)}` : "No holder"}</span>
            </li>
          `).join("")}
        </ol>
      </div>
    `;
  }

  renderPlayerBadgePanel(player) {
    if (!player) return "";
    const progress = this.profiles.getPlayerBadgeProgress(player);
    const activeFilter = normalizeBadgeFilter(this.badgeFilter);
    const badgeModels = this.profiles.getBadgeViewModels(player).filter(isVisibleBadgeDefinition);
    const badges = activeFilter === "all"
      ? badgeModels
      : badgeModels.filter((badge) => badge.category === activeFilter);
    const recentBadges = getRecentlyEarnedBadges(player, 3);
    const filteredEarned = badges.filter((badge) => badge.earned).length;
    const filteredLabel = activeFilter === "all"
      ? `${progress.totalCount - progress.earnedCount} left`
      : `${filteredEarned}/${badges.length} shown`;
    return `
      <div class="badge-profile-panel">
        <div class="badge-profile-header">
          <div>
            <span class="eyebrow">Driver Badges</span>
            <strong>${progress.earnedCount}/${progress.totalCount} earned</strong>
          </div>
          <span>${escapeHtml(filteredLabel)}</span>
        </div>
        ${recentBadges.length ? `
          <div class="recent-badge-row">
            <span class="eyebrow">Recently Earned</span>
            ${recentBadges.map((badge) => `
              <span class="recent-badge-chip">
                <strong>${escapeHtml(badge.icon || "BDG")}</strong>
                <span>${escapeHtml(badge.name)}</span>
              </span>
            `).join("")}
          </div>
        ` : ""}
        <div class="badge-filter-row" aria-label="Badge categories">
          ${BADGE_CATEGORY_FILTERS.map((filter) => `
            <button class="badge-filter-button ${activeFilter === filter.id ? "is-active" : ""}" type="button" data-action="setBadgeFilter" data-filter="${escapeHtml(filter.id)}">
              ${escapeHtml(filter.label)}
            </button>
          `).join("")}
        </div>
        <div class="badge-grid">
          ${badges.map((badge) => `
            <span class="badge-card ${badge.earned ? "is-earned" : "is-locked"}">
              <strong>${escapeHtml(badge.icon || "BDG")}</strong>
              <span>
                <b>${escapeHtml(badge.name)}</b>
                <small>${escapeHtml(badge.categoryLabel)} - ${escapeHtml(badge.difficulty)}</small>
              </span>
              <small>${badge.earned ? `Earned ${escapeHtml(formatBadgeEarnedDate({ earnedAt: badge.earnedAt }))}` : `Locked: ${escapeHtml(badge.description)}`}</small>
            </span>
          `).join("")}
        </div>
      </div>
    `;
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
    if (!result.completed && result.bestProgressPercent > 0) {
      callouts.push(`<span class="score-callout">Best Progress ${formatChallengeProgressPercent(result.bestProgressPercent)}</span>`);
    }
    return callouts.join("");
  }

  renderChallengeResultPanel(summary) {
    if (!summary.challengeMode) return "";
    const result = summary.challengeResult || {};
    const bestText = result.bestScore ? formatScore(result.bestScore) : "No saved best";
    const bestProgress = formatChallengeProgressPercent(result.bestProgressPercent || result.progressPercent || 0);
    const completionText = result.bestCompletionStatus ? "Completed" : `Best Progress ${bestProgress}`;
    const saveText = !result.saved && summary.debugSpeedScaleActive
      ? "Not saved in debug speed"
      : (result.newlyCompleted ? "First completion" : (result.newBest ? "New challenge best" : (result.newBestProgress ? "New best progress" : "Saved locally")));
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
    const roundSeed = session.currentSeed;
    const partyCallouts = this.renderPartyCallouts(session, standings, recentResult, final);
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
            ${final && leader ? `<div class="party-winner-banner"><strong>${escapeHtml(leader.playerName)}</strong><span>${escapeHtml(session.scoringLabel)} ${formatScore(leader.rankScore)}</span></div>` : ""}
            <p class="hint">${escapeHtml(getPartyRoundTypeLabel(session.roundType))} · ${escapeHtml(session.track.name)} · ${escapeHtml(getRaceTypeLabel(session.raceType))} · ${escapeHtml(getSpeedClassLabel(session.raceMode))} · ${final ? "Final seed" : `Round ${session.roundNumber} seed`} ${escapeHtml(roundSeed)}</p>
            <p class="hint">${escapeHtml(getPartySeedModeLabel(session.seedMode))} · ${session.completedRuns}/${session.totalRuns} runs complete</p>
            ${partyCallouts}
            ${this.renderTitleCallouts(summary) || summary?.newlyEarnedBadges?.length ? `<div class="score-callout-row">${this.renderTitleCallouts(summary)}${this.renderNewBadgeCallouts(summary)}</div>` : ""}
          </div>
          <div class="party-leader-card ${final ? "is-final" : ""}">
            <span>${final ? "Winner" : "Leader"}</span>
            <strong>${leader ? escapeHtml(leader.playerName) : "No runs yet"}</strong>
            <em>${leader ? formatScore(leader.rankScore) : "0"}</em>
            ${leader ? `<small>${escapeHtml(session.scoringLabel)}</small>` : ""}
            ${leader && final ? `<small>Victory margin ${formatScore(margin || 0)}</small>` : ""}
            ${leader && !final ? `<small>${session.completedRuns}/${session.totalRuns} runs complete</small>` : ""}
          </div>
        </div>
        ${summary?.partyMode ? `
          <div class="party-last-run-card">
            <div>
              <span class="eyebrow">Latest Run</span>
              <strong>${escapeHtml(summary.playerName)}</strong>
              <span class="meta">${escapeHtml(summary.carName)} · Round ${summary.partyRoundIndex || recentResult?.roundNumber || 1} · Seed ${escapeHtml(summary.partySeed || summary.seed)} · ${escapeHtml(getRunStatusLabel(summary.status, summary.reason))} · ${formatTime(summary.time)}</span>
            </div>
            <div class="party-last-score">
              <span data-tally-value="${escapeAttr(summary.finalScore)}">${formatScore(summary.finalScore)}</span>
              ${summary.topTwentyRank ? `<small>Top 20 #${summary.topTwentyRank}</small>` : `<small>${summary.newPersonalBest ? "Personal Best" : "Run Score"}</small>`}
            </div>
            ${this.renderMedalChips(summary.medals, true)}
            ${this.renderBadgeEarnedPanel(summary, true)}
          </div>
        ` : ""}
        ${this.renderPartyStandingsList(session, standings, recentResult, final)}
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
        ${!final && nextPlayer ? `<p class="hint next-player-hint">Next up: ${escapeHtml(nextPlayer.name)} · Round ${session.roundNumber} seed ${escapeHtml(roundSeed)}. Press Enter to continue.</p>` : `<p class="hint next-player-hint">Press Enter for a same-seed rematch.</p>`}
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
    this.partySession = session.createRematch(seed, { reuseRoundSeeds: useSameSeed });
    this.partySetup = {
      selectedPlayerIds: this.partySession.selectedPlayers.map((player) => player.id),
      trackId: this.partySession.track.id,
      raceMode: this.partySession.raceMode,
      raceType: DEFAULT_RACE_TYPE_ID,
      sharedSeed: this.partySession.sharedSeed,
      roundType: this.partySession.roundType,
      seedMode: this.partySession.seedMode
    };
    this.pendingRoadSeed = this.partySession.sharedSeed;
    this.showPartyTurnScreen(useSameSeed ? "Rematch with the same settings and seed set." : "Rematch with the same settings and new seed.");
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
        roundType: session.roundType,
        seedMode: session.seedMode
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
      raceTypeId: summary?.raceTypeId || this.run?.raceTypeId || this.pendingRaceTypeId,
      track: getTrackById(summary?.trackId || this.run?.track?.id || this.pendingTrackId || DEFAULT_TRACK_ID)
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
          ${this.renderPlayerTitlePanel(current)}
          ${this.renderPlayerBadgePanel(current)}
          <p class="status-line">${escapeHtml(message)}</p>
        </div>
        <div>
          <h2>Local Players</h2>
          <ul class="profile-list">
            ${players.length ? players.map((player) => {
              const badgeProgress = this.profiles.getPlayerBadgeProgress(player);
              const titleCount = this.profiles.getPlayerTitles(player).length;
              return `
                <li class="profile-item ${current && current.id === player.id ? "is-current" : ""}">
                  <strong>${escapeHtml(player.name)}</strong>
                  <span class="meta">${escapeHtml(player.car.name)} · Best ${formatScore(player.bestScore)} · Titles ${titleCount} · Badges ${badgeProgress.earnedCount}/${badgeProgress.totalCount}</span>
                  <button class="small-button" data-action="selectPlayer" data-id="${escapeAttr(player.id)}">${current && current.id === player.id ? "Selected" : "Select"}</button>
                </li>
              `;
            }).join("") : `<li class="profile-item"><span class="meta">No profiles yet.</span></li>`}
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
    const car = normalizeCarConfig(player.car);
    const carStyle = normalizeCarStyle(car.carStyle);
    this.audio.playMusic("title", false);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel split customize-panel">
        <div class="form-stack">
          <h2>Customize Car</h2>
          <p class="hint">Dynamic paint recolors likely body pixels while preserving sprite windows, tires, lights, trim, and transparent pixels.</p>
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
          <p id="spriteStatus" class="hint">Paint cache waiting for a loaded sprite.</p>
          <div class="field">
            <label>Body Color</label>
            ${renderPaintOptionGroup("carBodyColor", CAR_BODY_COLOR_OPTIONS, carStyle.bodyColor, DEFAULT_CAR_STYLE.bodyColor, "Body Color")}
          </div>
          <div class="field">
            <label>Accent Color</label>
            ${renderPaintOptionGroup("carAccentColor", CAR_ACCENT_COLOR_OPTIONS, carStyle.accentColor, DEFAULT_CAR_STYLE.accentColor, "Accent Color")}
          </div>
          <div class="field">
            <label>Boost Trail Color</label>
            ${renderPaintOptionGroup("carBoostTrail", CAR_BOOST_TRAIL_OPTIONS, carStyle.boostTrail, DEFAULT_CAR_STYLE.boostTrail, "Boost Trail Color")}
          </div>
          <div class="row">
            <button class="small-button primary" data-action="saveCar">Save Car</button>
            <button class="small-button" data-action="resetCarStyle">Reset Visual Style</button>
            <button class="small-button" data-action="title">Back</button>
          </div>
          <p class="status-line">${escapeHtml(message)}</p>
        </div>
        <canvas id="carPreview" class="car-preview" width="360" height="280" aria-label="Car preview"></canvas>
      </section>
    `;
    this.bindLayerButtons();
    const updatePreview = () => this.renderCarPreview();
    ["carName", "bodyStyle", "useSprite"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", updatePreview);
    });
    document.querySelectorAll("input[name='carBodyColor'], input[name='carAccentColor'], input[name='carBoostTrail']").forEach((input) => {
      input.addEventListener("change", () => {
        this.audio.activate();
        this.audio.playSfx("menu");
        updatePreview();
      });
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
    this.syncPaintSwatchSelection();
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
      const paintInfo = this.carSprites.getPaintDebugInfo(car.bodyStyle, car.carStyle);
      const paintDetail = paintInfo.status === "recolored"
        ? `Paint recolored. Body ${formatPaintDebugRatio(paintInfo.bodyRatio)}, accent ${formatPaintDebugRatio(paintInfo.accentRatio)}, protected ${formatPaintDebugRatio(paintInfo.protectedRatio)}. Cache ${paintInfo.cacheSize}.`
        : (paintInfo.status === "fallback"
          ? `Paint fallback: ${paintInfo.fallbackReason || "sprite was not cleanly recolorable"}. Cache ${paintInfo.cacheSize}.`
          : `Original sprite paint. Cache ${paintInfo.cacheSize}.`);
      if (car.useSprite === false) {
        spriteStatus.textContent = "Sprite car mode is off. Preset colors are shown with the classic canvas car.";
      } else if (status === "loaded") {
        spriteStatus.textContent = `Using sprite asset: ${path}. ${paintDetail}`;
      } else if (status === "loading") {
        spriteStatus.textContent = `Looking for sprite asset: ${path}. Falling back to canvas until it loads.`;
      } else {
        spriteStatus.textContent = `Sprite asset not loaded: ${path}. Showing classic canvas fallback with selected colors.`;
      }
    }
  }

  syncPaintSwatchSelection() {
    document.querySelectorAll(".paint-swatch").forEach((label) => {
      const input = label.querySelector("input[type='radio']");
      label.classList.toggle("is-selected", Boolean(input?.checked));
    });
  }

  showVehicleScaleDebugScreen() {
    this.setScreen("vehicleScaleDebug");
    const trafficDebug = this.trafficSprites.getDebugInfo();
    const arcadeStart = VIEW_DISTANCE / getSpeedClassStartSpeed("arcade");
    const arcadeEnd = VIEW_DISTANCE / getSpeedClassEndSpeed("arcade", TRACKS[0]);
    const turboStart = VIEW_DISTANCE / getSpeedClassStartSpeed("turbo");
    const turboEnd = VIEW_DISTANCE / getSpeedClassEndSpeed("turbo", TRACKS[0]);
    this.layer.classList.remove("is-empty");
    this.layer.innerHTML = `
      <section class="panel compact">
        <h2>Camera / Vehicle Scale Check</h2>
        <p class="hint">Debug-only camera bounds, gameplay lane scale, and collision hitboxes.</p>
        <div class="score-grid">
          <div class="score-card"><strong>Traffic Sprites</strong><span>${trafficDebug.loaded}/${trafficDebug.total} loaded</span></div>
          <div class="score-card"><strong>Missing</strong><span>${escapeHtml(trafficDebug.missing)}</span></div>
          <div class="score-card"><strong>Lookahead</strong><span>${VIEW_DISTANCE.toLocaleString()} road units</span></div>
          <div class="score-card"><strong>Visible Road</strong><span>${(VIEW_DISTANCE / CAMERA_CONFIG.previousViewDistance).toFixed(2)}x prior</span></div>
          <div class="score-card"><strong>Arcade Seconds</strong><span>${arcadeStart.toFixed(1)} -> ${arcadeEnd.toFixed(1)}s</span></div>
          <div class="score-card"><strong>Turbo Seconds</strong><span>${turboStart.toFixed(1)} -> ${turboEnd.toFixed(1)}s</span></div>
          <div class="score-card"><strong>Vehicle Scale</strong><span>${getCameraVehicleScaleMultiplier().toFixed(2)}x effective</span></div>
          <div class="score-card"><strong>Hazard Scale</strong><span>${getCameraHazardScaleMultiplier("gasCan").toFixed(2)}x effective</span></div>
          <div class="score-card"><strong>Road Bounds</strong><span>${CAMERA_CONFIG.roadTopMargin}px top / ${CAMERA_CONFIG.roadBottomMargin}px bottom</span></div>
          <div class="score-card"><strong>Projection</strong><span>${escapeHtml(CAMERA_CONFIG.gameplayProjectionMode)} ${CAMERA_CONFIG.gameplayProjectionStrength.toFixed(2)}</span></div>
        </div>
        <canvas id="vehicleScaleDebugCanvas" class="car-preview" width="440" height="660" aria-label="Vehicle scale debug"></canvas>
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
      { type: "player", label: "player", y: 76 },
      { type: "slowCar", label: "slow", y: 158 },
      { type: "fastCar", label: "fast", y: 240 },
      { type: "truck", label: "truck", y: 334 },
      { type: "gasCan", label: "gas can", y: 432 },
      { type: "boostPad", label: "boost pad", y: 512 },
      { type: "barrier", label: "barrier", y: 596 }
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
      } else if (row.type === "gasCan") {
        drawGasCan(ctx, centerX, row.y, visual.drawScale);
      } else if (row.type === "boostPad") {
        drawBoostPad(ctx, centerX, row.y, visual.drawScale);
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

  readPaintRadio(name, options, fallbackId) {
    const input = document.querySelector(`input[name="${name}"]:checked`);
    return normalizeCarPaintOptionId(input?.value, options, fallbackId);
  }

  readCarForm() {
    const carStyle = normalizeCarStyle({
      bodyColor: this.readPaintRadio("carBodyColor", CAR_BODY_COLOR_OPTIONS, DEFAULT_CAR_STYLE.bodyColor),
      accentColor: this.readPaintRadio("carAccentColor", CAR_ACCENT_COLOR_OPTIONS, DEFAULT_CAR_STYLE.accentColor),
      boostTrail: this.readPaintRadio("carBoostTrail", CAR_BOOST_TRAIL_OPTIONS, DEFAULT_CAR_STYLE.boostTrail)
    });
    return {
      name: sanitizeCarName(document.getElementById("carName")?.value, DEFAULT_CAR.name),
      bodyColor: getCanvasBodyColorForCarStyle(carStyle),
      stripeColor: getCanvasStripeColorForCarStyle(carStyle),
      windowColor: DEFAULT_CAR.windowColor,
      bodyStyle: document.getElementById("bodyStyle")?.value || DEFAULT_CAR.bodyStyle,
      useSprite: document.getElementById("useSprite")?.checked !== false,
      carStyle
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
        ${this.renderLocalTitleBoard()}
        <ol class="leaderboard-list">
          ${entries.length ? entries.map((entry, index) => `
            <li class="leaderboard-item">
              <span class="leaderboard-rank">#${index + 1}</span>
              <span>
                <strong>${escapeHtml(entry.playerName)}</strong>
                <span class="meta">${entry.challengeId ? `Challenge: ${escapeHtml(entry.challengeName || entry.challengeId)} · ` : ""}${entry.partyMode ? `Party ${escapeHtml(getPartyRoundTypeLabel(entry.partyRoundType))} R${entry.partyRoundIndex || 1} · ` : ""}${escapeHtml(entry.carName)} · ${escapeHtml(entry.trackName)} · ${escapeHtml(getRaceTypeLabel(entry.raceType))} · ${escapeHtml(getSpeedClassLabel(entry.raceMode || entry.speedClass))} · Seed ${escapeHtml(formatRoadSeed(entry.seed))} · ${escapeHtml(getRunStatusLabel(entry.status))} · ${formatTime(entry.time)}${entry.raceType === FUEL_RUN_RACE_TYPE_ID ? ` · Fuel ${Math.max(0, entry.fuelRemaining || 0)}` : ""}${formatShortDate(entry.date) ? ` · ${escapeHtml(formatShortDate(entry.date))}` : ""}</span>
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
            <div class="score-callout-row">${this.renderTitleCallouts(summary)}${this.renderNewBadgeCallouts(summary)}${this.renderChallengeCallouts(summary)}${this.renderLeaderboardContext(summary)}</div>
          </div>
          <div class="final-score-card">
            <span>Final Score</span>
            <strong id="finalScoreValue" class="tally-score" data-tally-value="${escapeAttr(summary.finalScore)}">0</strong>
            <small>${escapeHtml(outcomeText)}</small>
          </div>
        </div>
        ${this.renderBadgeEarnedPanel(summary)}
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
            <div class="score-card"><strong>Boost Fuel Saved</strong><span>${this.formatPlaytestDecimal(summary.fuelSavedByBoost || 0)} fuel · ${this.formatPlaytestDecimal(summary.fuelDrainPausedTime || 0)}s</span></div>
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
                <span class="meta">${entry.challengeId ? `Challenge: ${escapeHtml(entry.challengeName || entry.challengeId)} · ` : ""}${entry.partyMode ? `Party ${escapeHtml(getPartyRoundTypeLabel(entry.partyRoundType))} R${entry.partyRoundIndex || 1} · ` : ""}${escapeHtml(entry.carName)} · ${escapeHtml(entry.trackName)} · ${escapeHtml(getRaceTypeLabel(entry.raceType))} · ${escapeHtml(getSpeedClassLabel(entry.raceMode || entry.speedClass))} · Seed ${escapeHtml(formatRoadSeed(entry.seed))} · ${escapeHtml(getRunStatusLabel(entry.status))} · ${formatTime(entry.time)}</span>
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
        else if (action === "howToPlay") this.openHowToPlayFromCurrentScreen();
        else if (action === "guideTab") this.showHowToPlayScreen(button.dataset.tab);
        else if (action === "guideBack") this.handleGuideBack();
        else if (action === "applyPlaytestPick") this.handleApplyPlaytestPick(button.dataset.id);
        else if (action === "players") this.showPlayerScreen();
        else if (action === "customize") this.showCustomizeScreen();
        else if (action === "leaderboard") this.showLeaderboard();
        else if (action === "settings") this.showSettingsScreen();
        else if (action === "showPlaytestReport") {
          this.playtestReportFilter = normalizePlaytestReportFilter(button.dataset.filter || this.playtestReportFilter);
          this.playtestReportCopyText = "";
          this.showPlaytestReportScreen();
        }
        else if (action === "fullscreen") this.toggleFullscreen();
        else if (action === "setSpeedClass") this.handleSetSpeedClass(button.dataset.id);
        else if (action === "setModePickerSpeed") this.handleModePickerSpeed(button.dataset.id);
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
        else if (action === "runTargetedDirectorChecks") this.runTargetedDirectorChecks();
        else if (action === "runSeedTest") this.runSeedDeterminismTest();
        else if (action === "roadDirectorLab") {
          this.roadDirectorReportCopyText = "";
          this.showRoadDirectorLabScreen();
        }
        else if (action === "vehicleScaleDebug") this.showVehicleScaleDebugScreen();
        else if (action === "title") this.showTitle();
        else if (action === "restart") this.handleRestartRun();
        else if (action === "resume") this.togglePause();
        else if (action === "createPlayer") this.handleCreatePlayer();
        else if (action === "selectPlayer") this.handleSelectPlayer(button.dataset.id);
        else if (action === "setBadgeFilter") this.handleSetBadgeFilter(button.dataset.filter);
        else if (action === "saveCar") this.handleSaveCar();
        else if (action === "resetCarStyle") this.handleResetCarStyle();
        else if (action === "resetData") this.handleResetData();
        else if (action === "copyPlaytestReport") this.handleCopyPlaytestReport();
        else if (action === "copyRoadDirectorReport") this.handleCopyRoadDirectorReport();
        else if (action === "clearPlaytestReports") this.handleClearPlaytestReports();
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

  handleSetBadgeFilter(filter) {
    this.badgeFilter = normalizeBadgeFilter(filter);
    this.showPlayerScreen();
  }

  handleSaveCar() {
    this.profiles.updateCurrentCar(this.readCarForm());
    const player = this.profiles.getCurrentPlayer();
    this.showCustomizeScreen(`${player?.car.name || "Car"} saved.`);
  }

  handleResetCarStyle() {
    const current = this.profiles.getCurrentPlayer();
    if (!current) {
      this.showPlayerScreen("Create or choose a player before customizing a car.");
      return;
    }
    const currentCar = normalizeCarConfig(current.car);
    this.profiles.updateCurrentCar({
      ...currentCar,
      bodyColor: DEFAULT_CAR.bodyColor,
      stripeColor: DEFAULT_CAR.stripeColor,
      windowColor: DEFAULT_CAR.windowColor,
      carStyle: { ...DEFAULT_CAR_STYLE }
    });
    const player = this.profiles.getCurrentPlayer();
    this.showCustomizeScreen(`${player?.car.name || "Car"} reset to original paint.`);
  }

  handleApplyPlaytestPick(id) {
    const pick = this.getWeekendPlaytestPick(id);
    if (!pick) {
      this.showTitle();
      return;
    }
    if (pick.partyRoundType) {
      const setup = this.getPartySetup();
      setup.trackId = normalizeTrackId(pick.trackId, DEFAULT_TRACK_ID);
      setup.raceMode = normalizeSpeedClassId(pick.speedClassId, DEFAULT_SPEED_CLASS_ID);
      setup.raceType = DEFAULT_RACE_TYPE_ID;
      setup.roundType = normalizePartyRoundType(pick.partyRoundType, PARTY_ROUND_TYPE_BEST_OF_3);
      setup.seedMode = normalizePartySeedMode(pick.partySeedMode, PARTY_SEED_MODE_SAME_ROUND);
      if (!setup.sharedSeed) setup.sharedSeed = generateReadableRoadSeed();
      this.showPartySetupScreen(`${pick.title} applied. Review players, then start the party round.`);
      return;
    }

    const track = getTrackById(pick.trackId);
    const speedClassId = normalizeSpeedClassId(pick.speedClassId, DEFAULT_SPEED_CLASS_ID);
    const raceTypeId = trackSupportsRaceType(track, pick.raceTypeId)
      ? normalizeRaceTypeId(pick.raceTypeId, DEFAULT_RACE_TYPE_ID)
      : DEFAULT_RACE_TYPE_ID;
    this.profiles.updateSpeedClass(speedClassId);
    this.pendingTrackId = track.id;
    this.pendingRaceTypeId = raceTypeId;
    this.pendingRoadSeed = this.resolveRoadSeed(this.pendingRoadSeed);
    this.showPreRaceScreen(`${pick.title} applied. Review the seed, then start the run.`);
  }

  handleSetSpeedClass(id) {
    this.profiles.updateSpeedClass(id);
    if (this.screen === "settings") {
      this.showSettingsScreen("Default Solo race mode updated.");
    } else {
      this.showTitle();
    }
  }

  handleModePickerSpeed(id) {
    const selectedId = normalizeSpeedClassId(id, DEFAULT_SPEED_CLASS_ID);
    const select = this.screen === "partySetup"
      ? document.getElementById("partyRaceMode")
      : document.getElementById("preRaceSpeedClass");
    if (!select) return;
    select.value = selectedId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    this.syncModeLadderSelection(selectedId);
  }

  handleResetData() {
    const confirmed = window.confirm("Reset Neon Road Rally local data in this browser? This deletes only the neonRoadRally.v1 key: local players, badges, car settings, scores, challenge progress, and audio/default race settings.");
    if (!confirmed) return;
    this.profiles.resetAll();
    this.audio.setMusicMuted(false);
    this.audio.setSfxMuted(false);
    this.showTitle();
  }

  async handleCopyPlaytestReport() {
    const text = this.buildPlaytestReportExportText(this.playtestReportFilter);
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      this.playtestReportCopyText = "";
      this.showPlaytestReportScreen("Playtest report copied to clipboard.");
    } catch (error) {
      this.playtestReportCopyText = text;
      this.showPlaytestReportScreen("Clipboard copy failed. Use the manual copy box below.");
    }
  }

  async handleCopyRoadDirectorReport() {
    const text = this.buildRoadDirectorReportExportText();
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      this.roadDirectorReportCopyText = "";
      this.showRoadDirectorLabScreen("Director report copied to clipboard.");
    } catch (error) {
      this.roadDirectorReportCopyText = text;
      this.showRoadDirectorLabScreen("Clipboard copy failed. Use the manual copy box below.");
    }
  }

  handleClearPlaytestReports() {
    const confirmed = window.confirm("Clear only local Playtest Report run summaries? This does not delete players, badges, leaderboard, settings, challenge progress, or car data.");
    if (!confirmed) return;
    this.playtestReports.clear();
    this.playtestReportCopyText = "";
    this.showPlaytestReportScreen("Playtest reports cleared.");
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
