// The game's rules and state, with no drawing and no browser in it: the
// turkey, the chasing farmer, the hazards and pickups of three stages,
// spawning, collisions, score, lives and the escape at 1000 m. step()
// advances one fixed step and returns what happened as bit flags, so the
// caller can react (sound, announcements) without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.

import { FARMER, FIELD, LIVES, POINTS, PX_PER_M, RUN, SPAWN, STAGES, TURKEY } from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_HIT = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_STAGE = 16;
export const EVENT_NEARMISS = 32;
export const EVENT_FEATHER = 64;

export const OB_FENCE = 'fence';
export const OB_HAY = 'hay';
export const OB_CRATE = 'crate';
export const OB_PUDDLE = 'puddle';
export const OB_BRANCH = 'branch';
export const OB_VENT = 'vent';
export const OB_PIN = 'pin';
export const OB_KNIFE = 'knife';

export const PK_CORN = 'corn';
export const PK_ACORN = 'acorn';
export const PK_PUMPKIN = 'pumpkin';
export const PK_FEATHER = 'feather';

const POOL_OBSTACLES = 24;
const POOL_PICKUPS = 32;
const POOL_PARTICLES = 120;
const POOL_POPUPS = 12;

function turkeyBox(state) {
  const t = state.turkey;
  const height = t.sliding ? TURKEY.slideHeight : TURKEY.height;
  // A sliding turkey is low to the ground: the box sits on the ground, not
  // on the standing turkey's shoulders, or the washing line still clips it.
  const y = t.sliding ? FIELD.groundY - TURKEY.slideHeight : t.y;
  const inset = (TURKEY.width - TURKEY.hitWidth) / 2;
  return { x: TURKEY.x + inset, y, width: TURKEY.hitWidth, height };
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const turkey = {
    y: FIELD.groundY - TURKEY.height,
    vy: 0,
    grounded: true,
    sliding: false,
    slideT: 0,
    flaps: 0,
    invuln: 0,
    runPhase: 0,
  };
  const obstacles = [];
  for (let i = 0; i < POOL_OBSTACLES; i += 1) {
    obstacles.push({ active: false, type: OB_FENCE, x: 0, y: 0, w: 0, h: 0, t: 0, phase: 0, scored: false, closest: 999 });
  }
  const pickups = [];
  for (let i = 0; i < POOL_PICKUPS; i += 1) {
    pickups.push({ active: false, kind: PK_CORN, x: 0, y: 0, taken: false, bob: 0 });
  }
  const particles = [];
  for (let i = 0; i < POOL_PARTICLES; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, kind: 0, size: 0 });
  }
  const popups = [];
  for (let i = 0; i < POOL_POPUPS; i += 1) {
    popups.push({ active: false, x: 0, y: 0, text: '', life: 0, color: '#fff' });
  }

  const state = {
    turkey,
    obstacles,
    pickups,
    particles,
    popups,
    distance: 0,
    score: 0,
    lives: LIVES,
    speed: RUN.startSpeed,
    elapsed: 0,
    farmerGap: FARMER.startGap,
    dashT: 0,
    slowT: 0,
    stage: 0,
    bannerT: 0,
    shakeT: 0,
    over: null,
    stats: { corn: 0, acorns: 0, pumpkins: 0, feathers: 0, nearMisses: 0, jumps: 0, hits: 0 },
    spawnT: 14,
    pickupT: 6,
    leafT: 0.4,
  };

  function freeObstacle() {
    for (let i = 0; i < obstacles.length; i += 1) if (!obstacles[i].active) return obstacles[i];
    return null;
  }
  function freePickup() {
    for (let i = 0; i < pickups.length; i += 1) if (!pickups[i].active) return pickups[i];
    return null;
  }
  function freeParticle() {
    for (let i = 0; i < particles.length; i += 1) if (!particles[i].active) return particles[i];
    return null;
  }
  function freePopup() {
    for (let i = 0; i < popups.length; i += 1) if (!popups[i].active) return popups[i];
    return null;
  }

  function addParticle(x, y, vx, vy, life, kind, size) {
    const p = freeParticle();
    if (p === null) return;
    p.active = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.kind = kind; p.size = size;
  }
  function addPopup(x, y, text, color) {
    const p = freePopup();
    if (p === null) return;
    p.active = true; p.x = x; p.y = y; p.text = text; p.life = 1.1; p.color = color;
  }
  function burst(x, y, kind, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      addParticle(x, y, Math.cos(a) * v, Math.sin(a) * v - 60, 0.5 + random() * 0.5, kind, 3 + random() * 4);
    }
  }

  function stageAt(distance) {
    for (let i = 0; i < STAGES.length; i += 1) if (distance < STAGES[i].until) return i;
    return STAGES.length - 1;
  }

  /** Hazard table per stage: [type, weight]. The kitchen adds the oven vent, the rolling pin and the falling knife. */
  function hazardTable(stage) {
    if (stage === 0) return [[OB_FENCE, 5], [OB_HAY, 4], [OB_PUDDLE, 3]];
    if (stage === 1) return [[OB_FENCE, 4], [OB_HAY, 3], [OB_CRATE, 3], [OB_PUDDLE, 3], [OB_BRANCH, 3]];
    return [[OB_CRATE, 3], [OB_VENT, 4], [OB_PIN, 3], [OB_KNIFE, 3], [OB_BRANCH, 2], [OB_FENCE, 2]];
  }

  function spawnHazard() {
    const table = hazardTable(state.stage);
    let total = 0;
    for (const [, w] of table) total += w;
    let roll = random() * total;
    let type = OB_FENCE;
    for (const [t, w] of table) { roll -= w; if (roll <= 0) { type = t; break; } }
    const o = freeObstacle();
    if (o === null) return;
    o.active = true; o.type = type; o.scored = false; o.closest = 999; o.t = 0; o.phase = 0;
    const x = FIELD.width + 60 + random() * 120;
    o.x = x;
    if (type === OB_FENCE) { o.w = 20; o.h = 78; }
    else if (type === OB_HAY) { o.w = 48; o.h = 56; }
    else if (type === OB_CRATE) { o.w = 46; o.h = 80; }
    else if (type === OB_PUDDLE) { o.w = 100; o.h = 14; }
    else if (type === OB_BRANCH) { o.w = 30; o.h = 150; }
    else if (type === OB_VENT) { o.w = 64; o.h = 42; o.phase = 0; o.t = 0.5 + random() * 0.4; }
    else if (type === OB_PIN) { o.w = 48; o.h = 26; }
    else if (type === OB_KNIFE) { o.w = 30; o.h = 120; o.t = 0.55; o.phase = 0; o.y = -160; }
    // A pumpkin rides above a tall hazard sometimes: the greedy line.
    if ((type === OB_CRATE || type === OB_HAY) && random() < 0.45) {
      const pk = freePickup();
      if (pk !== null) {
        pk.active = true; pk.kind = PK_PUMPKIN; pk.taken = false;
        pk.x = x + o.w / 2; pk.y = FIELD.groundY - 185; pk.bob = random() * 6;
      }
    }
  }

  function spawnPickups() {
    const roll = random();
    if (roll < 0.5) {
      // A corn arc: three cobs over a jump's arc — the safe line pays.
      const baseX = FIELD.width + 80;
      for (let i = 0; i < 3; i += 1) {
        const pk = freePickup();
        if (pk === null) return;
        pk.active = true; pk.kind = PK_CORN; pk.taken = false;
        pk.x = baseX + i * 52; pk.y = FIELD.groundY - (i === 1 ? 165 : 110); pk.bob = random() * 6;
      }
    } else if (roll < 0.75) {
      const pk = freePickup();
      if (pk === null) return;
      pk.active = true; pk.kind = PK_ACORN; pk.taken = false;
      pk.x = FIELD.width + 80; pk.y = FIELD.groundY - 44; pk.bob = random() * 6;
    } else if (roll < 0.9) {
      const pk = freePickup();
      if (pk === null) return;
      pk.active = true; pk.kind = PK_PUMPKIN; pk.taken = false;
      pk.x = FIELD.width + 80; pk.y = FIELD.groundY - 170; pk.bob = random() * 6;
    } else {
      const pk = freePickup();
      if (pk === null) return;
      pk.active = true; pk.kind = PK_FEATHER; pk.taken = false;
      pk.x = FIELD.width + 80; pk.y = FIELD.groundY - 120; pk.bob = random() * 6;
    }
  }

  function reset() {
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vy = 0; turkey.grounded = true; turkey.sliding = false; turkey.slideT = 0;
    turkey.flaps = 0; turkey.invuln = 0; turkey.runPhase = 0;
    for (const o of obstacles) o.active = false;
    for (const p of pickups) p.active = false;
    for (const p of particles) p.active = false;
    for (const p of popups) p.active = false;
    state.distance = 0; state.score = 0; state.lives = LIVES;
    state.speed = RUN.startSpeed; state.elapsed = 0;
    state.farmerGap = FARMER.startGap; state.dashT = 0; state.slowT = 0;
    state.stage = 0; state.bannerT = 2.4; state.shakeT = 0; state.over = null;
    state.stats = { corn: 0, acorns: 0, pumpkins: 0, feathers: 0, nearMisses: 0, jumps: 0, hits: 0 };
    state.spawnT = 14; state.pickupT = 6; state.leafT = 0.4;
    state.lastHitType = null;
  }

  function hitTurkey(events) {
    if (turkey.invuln > 0 || state.dashT > 0) return events;
    state.lives -= 1;
    state.stats.hits += 1;
    state.farmerGap -= FARMER.hitCloses;
    turkey.invuln = TURKEY.invulnerable;
    state.shakeT = 0.35;
    burst(TURKEY.x + 32, turkey.y + 20, 2, 14, 260);
    addPopup(TURKEY.x + 70, turkey.y - 10, 'OUCH!', '#ff5a4a');
    events |= EVENT_HIT;
    if (state.lives <= 0 || state.farmerGap <= 0) {
      state.over = 'caught';
      events |= EVENT_CAUGHT;
    }
    return events;
  }

  /**
   * One fixed step. `input` is { jump: edge-triggered, slide: held }.
   * With `harmless` set (the title screen's backdrop) the world scrolls and
   * hazards tumble past, but nothing touches the turkey and nothing scores.
   */
  function step(dt, input, harmless) {
    let events = 0;
    if (state.over !== null) return events;
    state.elapsed += dt;

    // Speed grows with distance; a puddle splash or a stumble slows the run.
    const target = Math.min(RUN.maxSpeed, RUN.startSpeed + (state.distance / 100) * RUN.speedPer100m);
    state.speed = target * (state.slowT > 0 ? 0.55 : 1) * (state.dashT > 0 ? 1.35 : 1);
    if (state.slowT > 0) state.slowT -= dt;
    if (state.dashT > 0) state.dashT -= dt;
    if (state.shakeT > 0) state.shakeT -= dt;
    if (state.bannerT > 0) state.bannerT -= dt;

    const dx = state.speed * PX_PER_M * dt;
    state.distance += state.speed * dt;
    if (!harmless) state.score += state.speed * dt;
    turkey.runPhase += dt * state.speed * 1.6;

    // The farmer: clean running opens the gap again, slowly; speed eats it.
    const recover = Math.max(0.2, FARMER.recoverPerSecond - state.speed * 0.012);
    state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + recover * dt);
    if (state.farmerGap <= 0) {
      state.over = 'caught';
      return events | EVENT_CAUGHT;
    }

    // Jump / double-jump (wing flap) / slide / fast-fall.
    if (input.jump) {
      if (turkey.grounded) {
        turkey.vy = -TURKEY.jumpVelocity;
        turkey.grounded = false;
        turkey.flaps = 0;
        turkey.sliding = false;
        state.stats.jumps += 1;
        burst(TURKEY.x + 32, FIELD.groundY, 3, 6, 120);
      } else if (turkey.flaps < 1) {
        turkey.vy = -TURKEY.jumpVelocity * 0.92;
        turkey.flaps += 1;
        state.stats.jumps += 1;
        burst(TURKEY.x + 32, turkey.y + 40, 3, 8, 140);
      }
    }
    if (input.slide && turkey.grounded) {
      if (!turkey.sliding) turkey.slideT = TURKEY.slideTime;
      turkey.sliding = true;
    }
    if (input.slide && !turkey.grounded) turkey.vy += TURKEY.gravity * 1.6 * dt; // slam down
    if (turkey.sliding) {
      turkey.slideT -= dt;
      if (turkey.slideT <= 0 || !input.slide) turkey.sliding = false;
    }

    // Vertical physics.
    turkey.vy = Math.min(TURKEY.maxFall, turkey.vy + TURKEY.gravity * dt);
    turkey.y += turkey.vy * dt;
    if (turkey.y >= FIELD.groundY - TURKEY.height) {
      turkey.y = FIELD.groundY - TURKEY.height;
      turkey.vy = 0;
      turkey.grounded = true;
      turkey.flaps = 0;
    } else if (turkey.vy !== 0) {
      turkey.grounded = false;
    }
    if (turkey.invuln > 0) turkey.invuln -= dt;

    // Stage changes.
    const stage = stageAt(state.distance);
    if (stage !== state.stage) {
      state.stage = stage;
      state.bannerT = 2.4;
      events |= EVENT_STAGE;
    }
    if (state.distance >= RUN.escapeDistance) {
      state.over = 'escaped';
      return events | EVENT_ESCAPED;
    }

    // Spawning, in metres of scroll.
    state.spawnT -= state.speed * dt;
    if (state.spawnT <= 0) {
      spawnHazard();
      state.spawnT = Math.max(SPAWN.minGap, SPAWN.baseGap - state.speed * 0.6) + random() * SPAWN.gapJitter;
    }
    state.pickupT -= state.speed * dt;
    if (state.pickupT <= 0) {
      spawnPickups();
      state.pickupT = SPAWN.pickupGap + random() * 8;
    }

    // Ambient falling leaves.
    state.leafT -= dt;
    if (state.leafT <= 0) {
      state.leafT = 0.25 + random() * 0.5;
      addParticle(FIELD.width + 10, 40 + random() * 200, -(60 + random() * 80), 30 + random() * 40, 4 + random() * 2, 0, 4 + random() * 4);
    }

    const box = turkeyBox(state);

    // Hazards scroll, animate and collide.
    for (const o of obstacles) {
      if (!o.active) continue;
      if (o.type === OB_PIN) o.x -= (state.speed + 4.5) * PX_PER_M * dt;
      else o.x -= dx;
      if (o.type === OB_VENT) {
        // Vent cycle: warn (glow) -> flame up -> off. Flame is the danger.
        o.t -= dt;
        if (o.phase === 0 && o.t <= 0) { o.phase = 1; o.t = 0.9; }
        else if (o.phase === 1 && o.t <= 0) { o.phase = 2; o.t = 0.9; }
        else if (o.phase === 2 && o.t <= 0) { o.phase = 0; o.t = 0.6 + random() * 0.5; }
      }
      if (o.type === OB_KNIFE) {
        o.t -= dt;
        if (o.phase === 0 && o.t <= 0) { o.phase = 1; o.y = -160; } // falling
        else if (o.phase === 1) {
          // The blade itself falls: it is only dangerous where it actually is.
          o.y += 2600 * dt;
          if (o.y >= FIELD.groundY - 120) { o.y = FIELD.groundY - 120; o.phase = 2; o.t = 1.4; }
        } else if (o.phase === 2 && o.t <= 0) { o.active = false; continue; }
      }
      if (o.x + o.w < -80) { o.active = false; continue; }

      if (harmless) continue;

      // The hazard's danger box: a branch is only dangerous up high (slide
      // under it); a vent's flame only while it burns; a knife only while it
      // falls or sticks in the ground.
      let danger = null;
      if (o.type === OB_BRANCH) danger = { x: o.x, y: FIELD.groundY - o.h, width: o.w, height: o.h - 46 };
      else if (o.type === OB_VENT) danger = o.phase === 1
        ? { x: o.x - 6, y: FIELD.groundY - 120, width: o.w + 12, height: 120 }
        : { x: o.x, y: FIELD.groundY - o.h, width: o.w, height: o.h };
      else if (o.type === OB_KNIFE) danger = o.phase === 0
        ? null
        : o.phase === 1
          ? { x: o.x, y: o.y, width: o.w, height: 120 }
          : { x: o.x, y: FIELD.groundY - 55, width: o.w, height: 55 };
      else if (o.type === OB_PUDDLE) danger = { x: o.x, y: FIELD.groundY - o.h, width: o.w, height: o.h };
      else danger = { x: o.x, y: FIELD.groundY - o.h, width: o.w, height: o.h };

      if (danger === null) continue;
      const gap = Math.min(
        Math.abs(box.x + box.width - danger.x),
        Math.abs(danger.x + danger.width - box.x),
      );
      if (gap < o.closest) o.closest = gap;

      if (overlaps(box, danger)) {
        if (o.type === OB_PUDDLE) {
          // A splash costs speed and lets the farmer close in — once per puddle.
          if (!o.scored) {
            o.scored = true;
            state.slowT = 1.1;
            state.farmerGap -= FARMER.puddleCloses;
            addPopup(TURKEY.x + 70, turkey.y - 10, 'SPLASH!', '#7db8ff');
            burst(TURKEY.x + 32, FIELD.groundY, 4, 8, 160);
          }
          continue;
        }
        if (state.dashT > 0) {
          o.active = false;
          state.score += POINTS.nearMiss;
          addPopup(o.x, FIELD.groundY - 120, 'SMASH! +5', '#ffd94a');
          burst(o.x + o.w / 2, FIELD.groundY - 40, 1, 12, 220);
          continue;
        }
        o.active = false;
        state.lastHitType = o.type;
        events = hitTurkey(events);
        if (state.over !== null) return events;
        continue;
      }

      // Near miss: it slipped past within a whisker, untouched.
      if (!o.scored && o.x + o.w < box.x && o.closest < 46 && o.type !== OB_PUDDLE) {
        o.scored = true;
        state.score += POINTS.nearMiss;
        state.stats.nearMisses += 1;
        addPopup(box.x + box.width + 6, box.y - 8, `CLOSE! +${POINTS.nearMiss}`, '#7ddc7d');
        events |= EVENT_NEARMISS;
      }
    }

    // Pickups scroll and collect.
    for (const p of pickups) {
      if (!p.active) continue;
      p.x -= dx;
      p.bob += dt * 3;
      if (p.x < -40) { p.active = false; continue; }
      if (harmless) continue;
      const px = p.x - 18;
      const py = p.y - 18 + Math.sin(p.bob) * 4;
      if (box.x < px + 36 && box.x + box.width > px && box.y < py + 36 && box.y + box.height > py) {
        p.active = false;
        if (p.kind === PK_CORN) { state.score += POINTS.corn; state.stats.corn += 1; }
        else if (p.kind === PK_ACORN) { state.score += POINTS.acorn; state.stats.acorns += 1; }
        else if (p.kind === PK_PUMPKIN) { state.score += POINTS.pumpkin; state.stats.pumpkins += 1; }
        else if (p.kind === PK_FEATHER) {
          state.stats.feathers += 1;
          state.dashT = 3;
          state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + FARMER.featherPushes);
          addPopup(TURKEY.x + 70, turkey.y - 30, 'GOLDEN FEATHER — DASH!', '#ffd94a');
          events |= EVENT_FEATHER;
        }
        if (p.kind !== PK_FEATHER) addPopup(p.x, p.y - 26, `+${p.kind === PK_CORN ? POINTS.corn : p.kind === PK_ACORN ? POINTS.acorn : POINTS.pumpkin}`, '#f2c94c');
        burst(p.x, p.y, 1, 6, 120);
        events |= EVENT_PICKUP;
      }
    }

    // Particles and popups age.
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 0) p.x += Math.sin(state.elapsed * 2 + p.y * 0.02) * 20 * dt;
      else p.vy += 300 * dt;
    }
    for (const p of popups) {
      if (!p.active) continue;
      p.life -= dt;
      p.y -= 34 * dt;
      if (p.life <= 0) p.active = false;
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
