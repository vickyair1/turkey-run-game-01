// The screenshot scenes behind ?shot=start|farm|kitchen|escaped|caught.
// Each one plays the real rules forward from a fresh world for a fixed
// time or distance, steered by a simple autopilot (jump the fences, slide
// the washing line, time the oven vents and the falling knives), so the
// frame is what a real game looks like and the same seed always gives the
// same frame. The autopilot is also the playability proof: it escapes on
// the seeds the shots use.

import { FIELD, PX_PER_M, STEP, TURKEY } from './config.js';
import {
  OB_BRANCH, OB_CRATE, OB_KNIFE, OB_PIN, OB_PUDDLE, OB_VENT,
} from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const FARM_SECONDS = 30;
const KITCHEN_DISTANCE = 780;
const LIMIT_SECONDS = 600;

/** The turkey's hitbox edges: the autopilot times jumps to the box, not the feathers. */
const BOX_RIGHT = TURKEY.x + (TURKEY.width + TURKEY.hitWidth) / 2;
const BOX_LEFT = TURKEY.x + (TURKEY.width - TURKEY.hitWidth) / 2;

/**
 * What a competent player does about the nearest hazard: jump the fences,
 * hay, crates, pins and stuck knives; slide under the washing line; splash
 * through a puddle only when a jump cannot clear it; time the oven vent so
 * the jump crosses while the flame is down, or clear the flame at its top.
 */
export function autopilot(state) {
  const t = state.turkey;
  const speedPx = state.speed * PX_PER_M;
  let nearest = null;
  let nearestT = Infinity;
  for (const o of state.obstacles) {
    if (!o.active) continue;
    // A rolling pin rolls TOWARD the turkey, so it closes faster than the scroll.
    const approach = o.type === OB_PIN ? (state.speed + 4.5) * PX_PER_M : speedPx;
    // A hazard counts until its RIGHT edge has passed the turkey's LEFT
    // edge: releasing the slide the moment its left edge passes still
    // leaves it overlapping the turkey.
    const passedAt = (o.x + o.w - BOX_LEFT) / approach;
    if (passedAt < -0.05) continue;
    const arrival = (o.x - BOX_RIGHT) / approach;
    if (arrival > 1.2) continue;
    if (arrival < nearestT) { nearestT = arrival; nearest = o; }
  }
  if (nearest === null) return { jump: false, slide: false };

  if (nearest.type === OB_BRANCH) {
    return { jump: false, slide: nearestT < 0.55 };
  }
  if (nearest.type === OB_PUDDLE) {
    return { jump: t.grounded && nearestT < 0.3, slide: false };
  }
  if (nearest.type === OB_VENT) {
    if (nearest.phase === 1) return { jump: t.grounded && nearestT < 0.16, slide: false };
    return { jump: t.grounded && nearestT < 0.22, slide: false };
  }
  if (nearest.type === OB_KNIFE) {
    if (nearest.phase === 0) return { jump: false, slide: false };
    return { jump: t.grounded && nearestT < 0.2, slide: false };
  }
  if (nearest.type === OB_PIN) {
    return { jump: t.grounded && nearestT < 0.2, slide: false };
  }
  // Fence, hay, crate: jump late, so the descent lands past the hazard;
  // a tall crate while airborne gets the wing flap as a safety net.
  if (t.grounded) return { jump: nearestT < 0.2, slide: false };
  if (nearest.type === OB_CRATE && t.vy > -150 && nearestT < 0.35) return { jump: true, slide: false };
  return { jump: false, slide: false };
}

/** Run the world forward with the autopilot until `stop` says so. */
function playForward(world, stop) {
  let prevJump = false;
  for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
    const decision = autopilot(world.state);
    const jump = decision.jump && !prevJump;
    prevJump = decision.jump;
    const events = world.step(STEP, { jump, slide: decision.slide }, false);
    if (world.state.over !== null) break;
    if (stop(world.state)) break;
    void events;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best distance to show. Unknown names stage the title screen.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'farm') {
    playForward(world, (s) => s.elapsed >= FARM_SECONDS);
    return { screen: world.state.over === null ? SCREEN_PLAY : SCREEN_OVER, best: Math.floor(world.state.distance) };
  }
  if (name === 'kitchen') {
    playForward(world, (s) => s.distance >= KITCHEN_DISTANCE);
    return { screen: world.state.over === null ? SCREEN_PLAY : SCREEN_OVER, best: Math.floor(world.state.distance) };
  }
  if (name === 'escaped') {
    playForward(world, () => false);
    return { screen: SCREEN_OVER, best: Math.floor(world.state.distance) };
  }
  if (name === 'caught') {
    // Stand still and let the farm do its worst: the farmer catches up.
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      world.step(STEP, { jump: false, slide: false }, false);
      if (world.state.over !== null) break;
    }
    return { screen: SCREEN_OVER, best: Math.floor(world.state.distance) };
  }
  for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { jump: false, slide: false }, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
