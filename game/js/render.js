// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the
// margin filled with the backdrop colour. Everything is drawn with the
// canvas: a sunset farmyard that turns into barn lane and then the kitchen,
// a turkey with a fanned tail and a running cycle, the farmer closing in
// from behind with his pitchfork, and a HUD built to read at a glance when
// the screenshot is shrunk — big score, distance bar, feather lives and a
// farmer meter. Text that holds a number is rebuilt only when it changes,
// so a frame allocates nothing.

import { FARMER, FIELD, FONT, LIVES, PALETTE, PX_PER_M, RUN, STAGES, TURKEY } from './config.js';
import {
  OB_BRANCH, OB_CRATE, OB_FENCE, OB_HAY, OB_KNIFE, OB_PIN, OB_PUDDLE, OB_VENT,
  PK_ACORN, PK_CORN, PK_FEATHER, PK_PUMPKIN,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 660, top: 150, line: 36, bottom: 76 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function font(size, bold) {
    const key = `${bold ? 'b' : ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    return fonts.get(key);
  }
  function text(value, x, y, size, color, align, bold) {
    context.font = font(size, bold);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }
  function shadowText(value, x, y, size, color, align, bold) {
    context.save();
    context.font = font(size, bold);
    context.textAlign = align || 'left';
    context.lineWidth = 5;
    context.strokeStyle = 'rgba(20,8,10,0.85)';
    context.strokeText(value, x, y);
    context.fillStyle = color;
    context.fillText(value, x, y);
    context.restore();
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  // ---- background -------------------------------------------------------

  function drawSky(state) {
    const kitchen = state.stage === 2;
    if (state.stage >= 3) {
      // The woods: a night forest, moonlit pines, fireflies — the escape.
      const night = context.createLinearGradient(0, 0, 0, FIELD.groundY);
      night.addColorStop(0, '#16283a');
      night.addColorStop(0.6, '#1d3a2a');
      night.addColorStop(1, '#0f2418');
      context.fillStyle = night;
      context.fillRect(0, 0, FIELD.width, FIELD.groundY);
      context.fillStyle = '#f2ead0';
      context.beginPath();
      context.arc(1050, 130, 44, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(242,234,208,0.2)';
      context.beginPath();
      context.arc(1050, 130, 66, 0, Math.PI * 2);
      context.fill();
      // Pine silhouettes, two depths.
      for (let i = 0; i < 10; i += 1) {
        const px = i * 150 + 40;
        const ph = 150 + (i % 3) * 40;
        context.fillStyle = '#0d1f14';
        context.beginPath();
        context.moveTo(px - 42, FIELD.groundY);
        context.lineTo(px, FIELD.groundY - ph);
        context.lineTo(px + 42, FIELD.groundY);
        context.closePath();
        context.fill();
        context.fillStyle = '#14301f';
        context.beginPath();
        context.moveTo(px + 30, FIELD.groundY);
        context.lineTo(px + 72, FIELD.groundY - ph * 0.7);
        context.lineTo(px + 114, FIELD.groundY);
        context.closePath();
        context.fill();
      }
      // Fireflies.
      context.fillStyle = 'rgba(255,240,150,0.85)';
      for (let i = 0; i < 8; i += 1) {
        const fx = (i * 173 + state.elapsed * 12) % FIELD.width;
        const fy = 200 + ((i * 97) % 260) + Math.sin(state.elapsed * 2 + i) * 14;
        context.beginPath();
        context.arc(fx, fy, 3, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }
    if (kitchen) {
      // The kitchen: a warm wall, a window on the sunset, hanging pans,
      // and the big oven the turkey is running past.
      const wall = context.createLinearGradient(0, 0, 0, FIELD.height);
      wall.addColorStop(0, '#6b352a');
      wall.addColorStop(1, '#452019');
      context.fillStyle = wall;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      // Tile backsplash band.
      context.fillStyle = '#7d4a38';
      context.fillRect(0, 330, FIELD.width, 90);
      context.strokeStyle = 'rgba(255,255,255,0.12)';
      context.lineWidth = 2;
      for (let x = 0; x < FIELD.width; x += 60) {
        context.beginPath();
        context.moveTo(x, 330);
        context.lineTo(x, 420);
        context.stroke();
      }
      context.beginPath();
      context.moveTo(0, 375);
      context.lineTo(FIELD.width, 375);
      context.stroke();
      // The big oven, static at the left: a black iron box, a glowing door.
      context.fillStyle = '#241d22';
      roundRect(56, 400, 300, 200, 12);
      context.fill();
      context.fillStyle = '#171217';
      context.fillRect(56, 400, 300, 44);
      const glow = context.createLinearGradient(0, 470, 0, 580);
      glow.addColorStop(0, '#ffb03a');
      glow.addColorStop(1, '#c93a12');
      context.fillStyle = glow;
      roundRect(96, 470, 220, 100, 8);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.25)';
      context.fillRect(96, 470, 220, 12);
      context.fillStyle = '#3a3238';
      for (let i = 0; i < 3; i += 1) {
        context.beginPath();
        context.arc(130 + i * 76, 424, 12, 0, Math.PI * 2);
        context.fill();
      }
      // Window with the sunset outside.
      const wx = 880;
      context.fillStyle = '#241019';
      roundRect(wx, 70, 300, 210, 10);
      context.fill();
      const win = context.createLinearGradient(0, 80, 0, 270);
      win.addColorStop(0, PALETTE.skyTop);
      win.addColorStop(1, PALETTE.skyBot);
      context.fillStyle = win;
      context.fillRect(wx + 10, 80, 280, 190);
      context.fillStyle = PALETTE.sun;
      context.beginPath();
      context.arc(wx + 220, 220, 42, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#241019';
      context.fillRect(wx + 148, 80, 8, 190);
      context.fillRect(wx + 10, 168, 280, 8);
      // Hanging pans, steel against the warm wall.
      context.strokeStyle = '#1c1210';
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(430, 96);
      context.lineTo(790, 96);
      context.stroke();
      for (let i = 0; i < 3; i += 1) {
        const px = 480 + i * 120;
        context.fillStyle = '#8a8a94';
        context.beginPath();
        context.arc(px, 132, 26, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#b9b9c2';
        context.beginPath();
        context.arc(px - 7, 125, 10, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#6b5a4a';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(px, 106);
        context.lineTo(px, 78);
        context.stroke();
      }
      return;
    }
    const sky = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyBot);
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // Low sun, big and warm.
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(1010, 470, 64, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,217,122,0.25)';
    context.beginPath();
    context.arc(1010, 470, 96, 0, Math.PI * 2);
    context.fill();
    // Clouds drift with distance.
    context.fillStyle = 'rgba(255,240,220,0.75)';
    const scroll = state.distance * PX_PER_M;
    for (let i = 0; i < 4; i += 1) {
      const cx = ((i * 430 - scroll * 0.12) % 1500 + 1500) % 1500 - 110;
      const cy = 70 + i * 46;
      context.beginPath();
      context.ellipse(cx, cy, 74, 20, 0, 0, Math.PI * 2);
      context.ellipse(cx + 44, cy + 8, 52, 16, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Two hill lines, far and near, in parallax.
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      const hx = x - ((scroll * 0.25) % 320);
      context.lineTo(hx, FIELD.groundY - 120 - Math.sin((x + scroll * 0.25) * 0.006) * 46);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.hillNear;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, FIELD.groundY - 58 - Math.sin((x + scroll * 0.5) * 0.009 + 2) * 26);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
  }

  function drawBarn(state) {
    if (state.stage !== 0) return;
    // The red barn the turkey is running away from, scrolling slowly by.
    const scroll = state.distance * PX_PER_M;
    const bx = 900 - ((scroll * 0.55) % 2400);
    if (bx < -320 || bx > FIELD.width + 40) return;
    const by = FIELD.groundY - 210;
    context.fillStyle = PALETTE.barnRed;
    context.fillRect(bx, by, 260, 210);
    context.fillStyle = PALETTE.barnRoof;
    context.beginPath();
    context.moveTo(bx - 16, by);
    context.lineTo(bx + 130, by - 74);
    context.lineTo(bx + 276, by);
    context.closePath();
    context.fill();
    context.fillStyle = '#241019';
    context.fillRect(bx + 100, by + 110, 60, 100);
    context.strokeStyle = '#e8dcc8';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(bx + 100, by + 110);
    context.lineTo(bx + 160, by + 210);
    context.moveTo(bx + 160, by + 110);
    context.lineTo(bx + 100, by + 210);
    context.stroke();
    // Hay bales stacked by the barn door.
    context.fillStyle = PALETTE.hay;
    context.beginPath();
    context.ellipse(bx + 40, FIELD.groundY - 18, 44, 20, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(bx + 230, FIELD.groundY - 14, 36, 16, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawGround(state) {
    const kitchen = state.stage === 2;
    const woods = state.stage >= 3;
    const base = kitchen ? PALETTE.groundKitchen : woods ? '#1d2f1a' : state.stage === 1 ? PALETTE.groundBarn : PALETTE.groundFarm;
    context.fillStyle = base;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = kitchen ? '#5a3428' : woods ? '#16241a' : PALETTE.groundFarmDark;
    context.fillRect(0, FIELD.groundY, FIELD.width, 6);
    if (kitchen) {
      // Checkerboard kitchen tiles.
      context.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x < FIELD.width; x += 80) {
        context.fillRect(x + ((Math.floor(state.distance * 2) % 2) * 40), FIELD.groundY + 40, 40, 40);
      }
      return;
    }
    if (woods) {
      // Forest floor: dark pine needles and the odd mushroom.
      const scroll = state.distance * PX_PER_M;
      context.fillStyle = '#2e4a26';
      for (let i = 0; i < 20; i += 1) {
        const gx = ((i * 211 - scroll) % 1400 + 1400) % 1400 - 60;
        context.beginPath();
        context.moveTo(gx - 8, FIELD.groundY + 100);
        context.lineTo(gx, FIELD.groundY + 76);
        context.lineTo(gx + 8, FIELD.groundY + 100);
        context.closePath();
        context.fill();
      }
      context.fillStyle = '#d9d9d9';
      context.beginPath();
      context.arc(980, FIELD.groundY + 66, 12, Math.PI, 0);
      context.fill();
      context.fillStyle = '#8a5a30';
      context.fillRect(976, FIELD.groundY + 66, 8, 16);
      return;
    }
    // Grass tufts scrolling past.
    const scroll = state.distance * PX_PER_M;
    context.fillStyle = PALETTE.grass;
    for (let i = 0; i < 26; i += 1) {
      const gx = ((i * 173 - scroll) % 1400 + 1400) % 1400 - 60;
      context.beginPath();
      context.moveTo(gx - 7, FIELD.groundY + 96);
      context.lineTo(gx, FIELD.groundY + 76);
      context.lineTo(gx + 7, FIELD.groundY + 96);
      context.closePath();
      context.fill();
    }
    context.fillStyle = PALETTE.fence;
    for (let i = 0; i < 9; i += 1) {
      const fx = ((i * 190 - scroll * 0.85) % 1600 + 1600) % 1600 - 80;
      context.fillRect(fx, FIELD.groundY - 52, 10, 52);
    }
    context.fillRect(0, FIELD.groundY - 46, FIELD.width, 7);
    context.fillRect(0, FIELD.groundY - 22, FIELD.width, 7);
  }

  // ---- actors -----------------------------------------------------------

  function drawTurkey(state, xOverride) {
    const t = state.turkey;
    const drawX = xOverride === undefined ? TURKEY.x : xOverride;
    const cx = drawX + TURKEY.width / 2;
    const base = t.y + TURKEY.height;
    const phase = t.runPhase;
    const blink = t.invuln > 0 && Math.floor(t.invuln * 10) % 2 === 0;
    if (blink) return;
    context.save();
    if (state.dashT > 0) {
      context.shadowColor = '#ffd94a';
      context.shadowBlur = 26;
    }
    const bob = t.grounded && !t.sliding ? Math.sin(phase * 2) * 2 : 0;
    const slide = t.sliding;
    // Fanned tail: five feathers, swaying with the run.
    for (let i = 0; i < 5; i += 1) {
      const spread = (i - 2) * 0.42;
      const sway = Math.sin(phase * 2 + i) * 0.05;
      const len = 52 - Math.abs(i - 2) * 7;
      context.fillStyle = PALETTE.tail[i];
      context.beginPath();
      context.ellipse(
        cx - 26 + Math.sin(spread + sway) * -len * 0.4,
        base - 34 + bob - Math.abs(Math.sin(spread)) * 8,
        13, len / 2, spread + sway - Math.PI / 2, 0, Math.PI * 2,
      );
      context.fill();
    }
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    if (slide) context.ellipse(cx, base - 16 + bob, 36, 15, 0, 0, Math.PI * 2);
    else context.ellipse(cx, base - 30 + bob, 26, 30, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyDark;
    context.beginPath();
    context.ellipse(cx, base - 16 + bob, 18, 10, 0, 0, Math.PI);
    context.fill();
    // Wing: tucked while running, spread on a flap.
    const airborne = !t.grounded;
    context.fillStyle = PALETTE.turkeyDark;
    context.beginPath();
    if (airborne) context.ellipse(cx - 6, base - 44 + bob, 20, 9, -0.7, 0, Math.PI * 2);
    else context.ellipse(cx - 4, base - 30 + bob, 16, 11, -0.3, 0, Math.PI * 2);
    context.fill();
    // Head, beak, wattle, eye — always looking where it runs: right.
    const hx = cx + (slide ? 26 : 20);
    const hy = slide ? base - 22 + bob : base - 62 + bob;
    context.fillStyle = PALETTE.head;
    context.beginPath();
    context.arc(hx, hy, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(hx + 10, hy - 3);
    context.lineTo(hx + 26, hy + 2);
    context.lineTo(hx + 10, hy + 7);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(hx + 8, hy + 12, 5, 8, 0.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#241019';
    context.beginPath();
    context.arc(hx + 5, hy - 3, 2.6, 0, Math.PI * 2);
    context.fill();
    // Legs: two strokes alternating with the run cycle; tucked when sliding.
    context.strokeStyle = '#e8a33c';
    context.lineWidth = 4;
    context.lineCap = 'round';
    if (slide) {
      context.beginPath();
      context.moveTo(cx - 8, base - 8);
      context.lineTo(cx - 30, base - 2);
      context.moveTo(cx + 6, base - 8);
      context.lineTo(cx - 14, base - 2);
      context.stroke();
    } else if (t.grounded) {
      const swing = Math.sin(phase * 2) * 12;
      context.beginPath();
      context.moveTo(cx - 6, base - 8);
      context.lineTo(cx - 6 + swing, base + 2);
      context.moveTo(cx + 8, base - 8);
      context.lineTo(cx + 8 - swing, base + 2);
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(cx - 6, base - 8);
      context.lineTo(cx - 14, base + 4);
      context.moveTo(cx + 8, base - 8);
      context.lineTo(cx + 16, base + 2);
      context.stroke();
    }
    context.restore();
  }

  function drawFarmer(state) {
    // The farmer runs behind the turkey; his screen x is the gap in metres.
    const gapM = state.farmerGap;
    const fx = TURKEY.x - gapM * PX_PER_M - 40;
    // Far behind, he is off the screen entirely: the meter tells the story.
    if (fx < -30) return;
    const phase = state.turkey.runPhase * 1.15;
    const base = FIELD.groundY;
    const close = gapM < FARMER.warnGap;
    context.save();
    if (close) {
      context.shadowColor = '#ff5a4a';
      context.shadowBlur = 18;
    }
    // Legs: overalls, running.
    const swing = Math.sin(phase * 2) * 16;
    context.strokeStyle = PALETTE.farmerOveralls;
    context.lineWidth = 11;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(fx + 44, base - 58);
    context.lineTo(fx + 44 + swing, base);
    context.moveTo(fx + 62, base - 58);
    context.lineTo(fx + 62 - swing, base);
    context.stroke();
    // Body: shirt and overalls.
    context.fillStyle = PALETTE.farmerShirt;
    roundRect(fx + 28, base - 108, 52, 54, 10);
    context.fill();
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(fx + 32, base - 62, 44, 10);
    // Arms pumping; one hand grips the pitchfork.
    context.strokeStyle = PALETTE.farmerSkin;
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(fx + 32, base - 96);
    context.lineTo(fx + 12, base - 78 + Math.sin(phase * 2) * 8);
    context.moveTo(fx + 76, base - 96);
    context.lineTo(fx + 96, base - 84 - Math.sin(phase * 2) * 8);
    context.stroke();
    // Head: red-faced, angry brows, straw hat.
    context.fillStyle = close ? '#e87a5a' : PALETTE.farmerSkin;
    context.beginPath();
    context.arc(fx + 54, base - 128, 20, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(fx + 54, base - 142, 32, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(fx + 38, base - 162, 32, 22);
    context.fillStyle = '#241019';
    context.beginPath();
    context.arc(fx + 60, base - 130, 2.8, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#241019';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(fx + 54, base - 138);
    context.lineTo(fx + 66, base - 134);
    context.moveTo(fx + 50, base - 118);
    context.lineTo(fx + 64, base - 118);
    context.stroke();
    // Pitchfork, raised and glinting.
    context.strokeStyle = '#8a6a3a';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(fx + 96, base - 84);
    context.lineTo(fx + 122, base - 176);
    context.stroke();
    context.strokeStyle = PALETTE.knife;
    context.lineWidth = 3;
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath();
      context.moveTo(fx + 122 + i * 7, base - 176);
      context.lineTo(fx + 122 + i * 7, base - 196);
      context.stroke();
    }
    if (close) {
      shadowText('!', fx + 54, base - 196, 44, '#ff5a4a', 'center', true);
    }
    context.restore();
  }

  // ---- hazards and pickups ----------------------------------------------

  function drawObstacle(o, state) {
    const gy = FIELD.groundY;
    if (o.type === OB_FENCE) {
      context.fillStyle = PALETTE.fence;
      context.fillRect(o.x, gy - o.h, 8, o.h);
      context.fillRect(o.x + o.w - 8, gy - o.h, 8, o.h);
      context.fillRect(o.x - 6, gy - o.h + 6, o.w + 12, 8);
      context.fillRect(o.x - 6, gy - o.h + 34, o.w + 12, 8);
    } else if (o.type === OB_HAY) {
      context.fillStyle = PALETTE.hay;
      context.beginPath();
      context.ellipse(o.x + o.w / 2, gy - o.h / 2, o.w / 2 + 4, o.h / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.hayDark;
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(o.x + o.w / 2, gy - o.h / 2, o.w / 2 - 8, o.h / 2 - 8, 0, 0, Math.PI * 2);
      context.stroke();
      // Straw hatch lines, so it reads as a bale and not a coin.
      context.lineWidth = 2;
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.moveTo(o.x + 6, gy - o.h / 2 + i * 12);
        context.lineTo(o.x + o.w - 6, gy - o.h / 2 + i * 12);
        context.stroke();
      }
    } else if (o.type === OB_CRATE) {
      context.fillStyle = '#a87a3a';
      context.fillRect(o.x, gy - o.h, o.w, o.h);
      context.strokeStyle = '#6e4a22';
      context.lineWidth = 3;
      context.strokeRect(o.x + 3, gy - o.h + 3, o.w - 6, o.h - 6);
      context.beginPath();
      context.moveTo(o.x, gy - o.h);
      context.lineTo(o.x + o.w, gy);
      context.moveTo(o.x + o.w, gy - o.h);
      context.lineTo(o.x, gy);
      context.stroke();
      context.fillStyle = '#8a5a30';
      context.fillRect(o.x + 6, gy - 24, o.w - 12, 6);
    } else if (o.type === OB_PUDDLE) {
      context.fillStyle = '#5a8ac9';
      context.beginPath();
      context.ellipse(o.x + o.w / 2, gy - 4, o.w / 2, 8, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.beginPath();
      context.ellipse(o.x + o.w / 2 - 18, gy - 6, 22, 3, 0, 0, Math.PI * 2);
      context.fill();
    } else if (o.type === OB_BRANCH) {
      // A low clothesline strung with washing: slide under it.
      context.strokeStyle = '#3a2a1a';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(o.x - 30, gy - 150);
      context.lineTo(o.x + o.w + 30, gy - 150);
      context.stroke();
      context.fillStyle = '#e8e2d4';
      context.fillRect(o.x - 8, gy - 148, 20, 34);
      context.fillStyle = '#e5534b';
      context.fillRect(o.x + 12, gy - 148, 18, 30);
      context.fillStyle = '#4a6b8a';
      context.fillRect(o.x - 2, gy - 148, 6, 6);
      context.fillStyle = '#d9b64a';
      context.beginPath();
      context.arc(o.x + o.w / 2, gy - 138, 10, 0, Math.PI * 2);
      context.fill();
      shadowText('SLIDE!', o.x + o.w / 2, gy - 168, 20, '#ffd94a', 'center', true);
    } else if (o.type === OB_VENT) {
      // The oven vent: a squat iron box. It glows before it fires.
      const burning = o.phase === 1;
      const warning = o.phase === 0;
      context.fillStyle = '#2e2a33';
      context.fillRect(o.x, gy - o.h, o.w, o.h);
      context.fillStyle = warning ? '#ff7a2a' : '#4a3a30';
      context.fillRect(o.x + 8, gy - o.h + 8, o.w - 16, 10);
      if (warning) {
        context.fillStyle = 'rgba(255,122,42,0.35)';
        context.beginPath();
        context.ellipse(o.x + o.w / 2, gy - o.h - 6, 40, 14, 0, 0, Math.PI * 2);
        context.fill();
      }
      if (burning) {
        const flick = Math.sin(state.elapsed * 30) * 8;
        const grad = context.createLinearGradient(0, gy - 120, 0, gy);
        grad.addColorStop(0, '#ffd94a');
        grad.addColorStop(0.5, PALETTE.flame);
        grad.addColorStop(1, PALETTE.ovenFire);
        context.fillStyle = grad;
        context.beginPath();
        context.moveTo(o.x - 4, gy);
        context.quadraticCurveTo(o.x + o.w / 2, gy - 128 - flick, o.x + o.w + 4, gy);
        context.closePath();
        context.fill();
      }
    } else if (o.type === OB_PIN) {
      // A rolling pin spinning toward the turkey.
      context.save();
      context.translate(o.x + o.w / 2, gy - 13);
      context.rotate(state.elapsed * 9);
      context.fillStyle = '#c9a86a';
      roundRect(-o.w / 2, -11, o.w, 22, 10);
      context.fill();
      context.fillStyle = '#8a6a3a';
      context.fillRect(-o.w / 2 - 8, -5, 8, 10);
      context.fillRect(o.w / 2, -5, 8, 10);
      context.restore();
    } else if (o.type === OB_KNIFE) {
      if (o.phase === 0) {
        // Telegraph: a shadow and a glint where the knife will land.
        context.fillStyle = 'rgba(20,8,10,0.55)';
        context.beginPath();
        context.ellipse(o.x + o.w / 2, gy - 2, 26, 6, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#ffd94a';
        context.beginPath();
        context.arc(o.x + o.w / 2, gy - 130 - Math.sin(state.elapsed * 12) * 8, 5, 0, Math.PI * 2);
        context.fill();
        shadowText('!', o.x + o.w / 2, gy - 96, 30, '#ffd94a', 'center', true);
      } else {
        // The carving knife itself: steel blade, dark handle.
        const ky = o.phase === 1 ? o.y : gy - 120;
        context.fillStyle = PALETTE.knife;
        context.beginPath();
        context.moveTo(o.x, ky);
        context.lineTo(o.x + o.w, ky);
        context.lineTo(o.x + o.w / 2, ky + 84);
        context.closePath();
        context.fill();
        context.fillStyle = PALETTE.knifeHandle;
        context.fillRect(o.x + 8, ky - 34, o.w - 16, 36);
        if (o.phase === 2) {
          context.fillStyle = 'rgba(20,8,10,0.4)';
          context.beginPath();
          context.ellipse(o.x + o.w / 2, gy - 2, 24, 5, 0, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }

  function drawPickup(p) {
    const bobY = p.y + Math.sin(p.bob) * 4;
    if (p.kind === PK_CORN) {
      context.fillStyle = PALETTE.corn;
      context.beginPath();
      context.ellipse(p.x, bobY, 12, 18, 0.3, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#c98f2e';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(p.x - 6, bobY - 12);
      context.lineTo(p.x - 6, bobY + 12);
      context.moveTo(p.x + 2, bobY - 14);
      context.lineTo(p.x + 2, bobY + 14);
      context.stroke();
      context.fillStyle = '#7ddc7d';
      context.beginPath();
      context.ellipse(p.x - 8, bobY - 18, 8, 5, -0.5, 0, Math.PI * 2);
      context.fill();
    } else if (p.kind === PK_ACORN) {
      context.fillStyle = '#a86828';
      context.beginPath();
      context.ellipse(p.x, bobY + 4, 11, 13, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#6e4a22';
      context.beginPath();
      context.ellipse(p.x, bobY - 8, 12, 7, 0, Math.PI, 0);
      context.fill();
    } else if (p.kind === PK_PUMPKIN) {
      context.fillStyle = PALETTE.pumpkin;
      context.beginPath();
      context.ellipse(p.x, bobY, 17, 15, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#b34a12';
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(p.x - 6, bobY, 6, 12, 0, 0, Math.PI * 2);
      context.ellipse(p.x + 6, bobY, 6, 12, 0, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = '#7ddc7d';
      context.fillRect(p.x - 2, bobY - 20, 4, 8);
    } else if (p.kind === PK_FEATHER) {
      context.save();
      context.shadowColor = '#ffd94a';
      context.shadowBlur = 18;
      context.fillStyle = PALETTE.featherGold;
      context.beginPath();
      context.ellipse(p.x, bobY, 10, 20, 0.4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff3c9';
      context.beginPath();
      context.ellipse(p.x - 2, bobY - 4, 4, 12, 0.4, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      const a = Math.max(0, p.life / p.max);
      if (p.kind === 0) {
        // Falling autumn leaf.
        context.fillStyle = `rgba(224,168,60,${a})`;
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.life * 3);
        context.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        context.restore();
      } else if (p.kind === 1) {
        context.fillStyle = `rgba(255,217,74,${a})`;
        context.beginPath();
        context.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        context.fill();
      } else if (p.kind === 2) {
        context.fillStyle = `rgba(232,163,60,${a})`;
        context.beginPath();
        context.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        context.fill();
      } else if (p.kind === 3) {
        context.fillStyle = `rgba(232,226,212,${a * 0.8})`;
        context.beginPath();
        context.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = `rgba(125,184,255,${a})`;
        context.beginPath();
        context.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.textBaseline = 'alphabetic';
    for (const p of state.popups) {
      if (!p.active) continue;
      shadowText(p.text, p.x, p.y, 22, p.color, 'center', true);
    }
  }

  // ---- HUD and panels -----------------------------------------------------

  function drawHud(state, screen, muted) {
    // Top strip: score left, distance bar centre, feather lives right.
    context.fillStyle = 'rgba(20,8,10,0.55)';
    context.fillRect(0, 0, FIELD.width, 64);
    shadowText(scoreLabel(Math.floor(state.score)), 24, 44, 34, PALETTE.text, 'left', true);
    const barW = 380;
    const barX = (FIELD.width - barW) / 2;
    const frac = Math.min(1, state.distance / RUN.escapeDistance);
    context.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(barX, 18, barW, 26, 13);
    context.fill();
    context.fillStyle = PALETTE.corn;
    if (frac > 0) {
      roundRect(barX, 18, Math.max(26, barW * frac), 26, 13);
      context.fill();
    }
    // The distance text, outlined so it reads over the yellow fill too.
    shadowText(`${Math.floor(state.distance)} m  /  ${RUN.escapeDistance} m`, FIELD.width / 2, 38, 20, PALETTE.text, 'center', true);
    // Little turkey marker riding UNDER the bar, a pine at the gate end.
    const tx = barX + 8 + frac * (barW - 16);
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.moveTo(tx, 56);
    context.lineTo(tx - 8, 46);
    context.lineTo(tx + 8, 46);
    context.closePath();
    context.fill();
    const gx = barX + barW + 16;
    context.fillStyle = '#2e6b34';
    context.beginPath();
    context.moveTo(gx, 12);
    context.lineTo(gx + 11, 32);
    context.lineTo(gx - 11, 32);
    context.closePath();
    context.fill();
    context.fillStyle = '#6e4a22';
    context.fillRect(gx - 3, 32, 6, 10);
    // Lives as golden feathers.
    const firstX = FIELD.width - 24 - LIVES * 34;
    text('LIVES', firstX - 14, 42, 22, PALETTE.text, 'right', true);
    for (let life = 0; life < LIVES; life += 1) {
      const lx = firstX + life * 34;
      context.fillStyle = life < state.lives ? PALETTE.featherGold : 'rgba(255,255,255,0.18)';
      context.beginPath();
      context.ellipse(lx + 10, 30, 7, 14, 0.4, 0, Math.PI * 2);
      context.fill();
    }
    // Stage name, small, under the strip.
    shadowText(STAGES[state.stage].name, 24, 96, 22, PALETTE.muted, 'left', true);
    if (muted) text('MUTED (M)', FIELD.width - 24, 96, 20, PALETTE.muted, 'right');
    // The farmer meter, bottom left: how far behind he is.
    const gap = Math.max(0, state.farmerGap);
    const warn = gap < FARMER.warnGap;
    const mw = 300;
    const mx = 24;
    const my = FIELD.height - 52;
    context.fillStyle = 'rgba(20,8,10,0.6)';
    roundRect(mx - 8, my - 26, mw + 16, 46, 10);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(mx, my - 6, mw, 12, 6);
    context.fill();
    context.fillStyle = warn ? PALETTE.danger : PALETTE.ok;
    roundRect(mx, my - 6, Math.max(12, (mw * gap) / FARMER.maxGap), 12, 6);
    context.fill();
    const gapText = warn && Math.floor(state.elapsed * 4) % 2 === 0
      ? `FARMER ${gap.toFixed(0)}m BEHIND — RUN!`
      : `FARMER ${gap.toFixed(0)}m BEHIND`;
    text(gapText, mx, my - 12, 20, warn ? PALETTE.danger : PALETTE.text, 'left', true);
    if (state.dashT > 0) {
      shadowText('GOLDEN FEATHER DASH!', FIELD.width / 2, 120, 30, '#ffd94a', 'center', true);
    }
    // Stage banner on a stage change, while playing only: on an end screen
    // the panel covers this spot.
    if (screen === SCREEN_PLAY && state.bannerT > 0) {
      const a = Math.min(1, state.bannerT);
      context.save();
      context.globalAlpha = a;
      shadowText(STAGES[state.stage].name, FIELD.width / 2, 210, 54, PALETTE.text, 'center', true);
      shadowText(STAGES[state.stage].sub, FIELD.width / 2, 248, 24, PALETTE.muted, 'center');
      context.restore();
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20,8,10,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(x, y, PANEL.width, height, 16);
    context.stroke();
    context.textBaseline = 'alphabetic';
    shadowText(title, FIELD.width / 2, y + 82, 52, PALETTE.text, 'center', true);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    const pulse = 0.75 + Math.sin(Date.now() / 280) * 0.25;
    context.save();
    context.globalAlpha = pulse;
    text(prompt, FIELD.width / 2, y + height - 36, 24, PALETTE.corn, 'center', true);
    context.restore();
  }

  function drawField(state, screen) {
    drawSky(state);
    drawBarn(state);
    drawGround(state);
    for (const o of state.obstacles) if (o.active) drawObstacle(o, state);
    for (const p of state.pickups) if (p.active) drawPickup(p);
    drawFarmer(state);
    // On the title screen the turkey poses clear of the panel, left of it.
    drawTurkey(state, screen === SCREEN_TITLE ? 170 : undefined);
    drawParticles(state);
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shake = state.shakeT > 0 ? (Math.random() - 0.5) * 10 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shake * view.scale, view.y + shake * view.scale);
    context.textBaseline = 'alphabetic';
    drawField(state, screen);
    if (screen === SCREEN_TITLE) {
      const lines = [
        'Thanksgiving is coming. You are the dinner.',
        'Outrun the farmer — 1000 m to the forest gate.',
        'Jump the fences, slide the washing line, dodge the oven',
        'and the carving knives. Corn is points. Feathers are speed.',
        'SPACE / W / ↑ jump — twice for a wing flap',
        'S / ↓ slide · P pause · M sound',
        best > 0 ? bestLabel(Math.floor(best)) + ' m — best escape' : 'No escape yet. The oven is already warm.',
      ];
      drawPanel('GOBBLE DASH', lines, 'Press SPACE or click to run', PALETTE.panelEdge);
      return;
    }
    drawHud(state, screen, muted);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The farmer waits. The oven stays hot.'], 'Press P to keep running');
    } else if (screen === SCREEN_OVER) {
      const d = Math.floor(state.distance);
      const s = Math.floor(state.score);
      if (state.over === 'escaped') {
        drawPanel('ESCAPED!', [
          `You made it to the woods — ${d} m, ${s} points.`,
          `Corn ${state.stats.corn} · pumpkins ${state.stats.pumpkins} · near misses ${state.stats.nearMisses}`,
          `Best escape ${Math.floor(Math.max(best, d))} m. The farmer is still looking.`,
          '',
        ], 'Press SPACE or click to run again', PALETTE.ok);
      } else {
        const why = state.lives <= 0 ? 'Three stumbles — and the farmer was waiting.' : 'The farmer caught up with you.';
        drawPanel('CAUGHT FOR DINNER!', [
          why,
          `You ran ${d} m and scored ${s} points.`,
          `Corn ${state.stats.corn} · pumpkins ${state.stats.pumpkins} · near misses ${state.stats.nearMisses}`,
          `Best escape ${Math.floor(Math.max(best, d))} m. The oven is still warm.`,
        ], 'Press SPACE or click to run again', PALETTE.danger);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
