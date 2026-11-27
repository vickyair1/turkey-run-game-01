// GOBBLE DASH — The Great Thanksgiving Escape. Every tuning number and
// colour in one place. The playfield is a fixed 1280x720 logical area; the
// renderer scales it to the window, so no rule below depends on the screen
// size. The turkey runs at a fixed screen x while the world scrolls left;
// distance is measured in metres and the run ends at the forest gate, 1000 m
// out. The farmer chases from behind: his gap in metres is a second fail
// state beside the three lives.

export const FIELD = { width: 1280, height: 720, groundY: 600 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Pixels per metre of world scroll (distance <-> screen position). */
export const PX_PER_M = 14;

export const TURKEY = {
  x: 300,
  width: 64,
  height: 64,
  /** The collision box is narrower than the drawing: feathers don't count. */
  hitWidth: 44,
  slideHeight: 30,
  jumpVelocity: 1000,
  gravity: 1900,
  maxFall: 1200,
  invulnerable: 1.6,
  slideTime: 1.1,
};

export const RUN = {
  startSpeed: 9, // metres per second
  speedPer100m: 0.55,
  maxSpeed: 16.5,
  escapeDistance: 1000,
};

export const FARMER = {
  startGap: 18, // metres behind the turkey
  maxGap: 24, // clean running never opens the gap past this
  recoverPerSecond: 0.55, // metres the gap re-opens while running clean
  hitCloses: 6, // metres he gains when the turkey stumbles
  puddleCloses: 1.5, // metres he gains when the turkey splashes through
  featherPushes: 9, // metres the golden feather drives him back
  warnGap: 9, // below this the HUD flashes and he is on screen
};

export const LIVES = 3;

/** Spawn spacing in metres of scroll between hazards; shrinks as speed rises. */
export const SPAWN = {
  baseGap: 26,
  minGap: 18,
  gapJitter: 10,
  pickupGap: 9,
};

/** Points. Distance itself scores 1 point a metre. */
export const POINTS = { corn: 10, acorn: 5, pumpkin: 25, nearMiss: 5 };

/** Stage boundaries in metres, and the world each stage shows. */
export const STAGES = [
  { until: 350, name: 'THE FARMYARD', sub: 'fences, hay and the farmer on your tail' },
  { until: 700, name: 'BARN LANE', sub: 'crates, puddles and low branches' },
  { until: 1000, name: 'THE KITCHEN', sub: 'ovens, rolling pins and falling knives' },
  { until: Infinity, name: 'THE WOODS', sub: 'the forest gate — run for it!' },
];

export const PALETTE = {
  backdrop: '#1c0f14',
  skyTop: '#f7a94b',
  skyMid: '#e96f4e',
  skyBot: '#7e3b5e',
  sun: '#ffd97a',
  hillFar: '#8a4a3c',
  hillNear: '#5e2f2a',
  groundFarm: '#7a5a2e',
  groundFarmDark: '#5d4423',
  groundBarn: '#6e4a26',
  groundKitchen: '#4a2c22',
  grass: '#c98f2e',
  barnRed: '#a03d2d',
  barnRoof: '#6e2a20',
  fence: '#8a5a30',
  hay: '#e0a83c',
  hayDark: '#b57f22',
  turkeyBody: '#8a5230',
  turkeyDark: '#6b3d22',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#c96a2e', '#f2c94c'],
  head: '#e8e2d4',
  beak: '#e8a33c',
  wattle: '#e5534b',
  farmerShirt: '#4a6b8a',
  farmerOveralls: '#3a4a6b',
  farmerSkin: '#e8b88a',
  farmerHat: '#d9b64a',
  knife: '#d7dce4',
  knifeHandle: '#3a2a1a',
  oven: '#2e2a33',
  ovenFire: '#ff7a2a',
  flame: '#ffb03a',
  corn: '#f2c94c',
  pumpkin: '#e86a1e',
  featherGold: '#ffd94a',
  panel: '#241019',
  panelEdge: '#e8a33c',
  text: '#fff3e0',
  muted: '#d9b48a',
  danger: '#ff5a4a',
  ok: '#7ddc7d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best distance is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
