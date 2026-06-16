/**
 * Interactive ASCII fluid background.
 *
 * A monospace grid of glyphs (ramp "  · _ - > ○") driven by a compact Jos
 * Stam "stable fluids" solver running at the glyph resolution. The cursor
 * continuously stamps a SHAPE (default: a cat head, see BRUSH_SHAPE) as the
 * fluid's density source: while still it stays a crisp cat; while moving the
 * cursor injects velocity, so the ink flows/swirls into a trail that settles
 * back to the cat shape when you stop.
 *
 * A safe-zone mask keeps the effect off text/content, and it only renders
 * above the "About Me" section. No external libraries; the glyph colour comes
 * from the --bg-glyph CSS variable. To change the shape, edit BRUSH_SHAPE.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- Tunables -------------------------------------------------------
  const CELL_PX = 8;           // size of one ASCII cell on screen (smaller = finer)
  const RAMP = [' ', '·', '_', '-', '>', '○']; // dark -> bright
  const CONTRAST = 1.9;
  const GAMMA = 0.6;
  const THRESHOLD = 0.12;      // below this a cell draws nothing (keeps it clean)
  const ALPHA_MAX = 0.45;      // overall opacity cap (lower = more transparent/subtle)
  const ALPHA_BASE = 0.05;     // faint floor for the dimmest visible glyphs
  const ALPHA_GAIN = 0.40;     // how much brighter glyphs get near the ink

  // ---- Pointer brush shape --------------------------------------------
  // The ink that follows the cursor takes THIS shape (crisp, not a square).
  // '#' = ink, ' ' = empty. Swap the bitmap for any shape (heart, star, …).
  const BRUSH_SHAPE = [
    '##   ##',
    '### ###',
    '#######',
    '# ### #',   // eyes
    ' ##### ',
  ];

  // const BRUSH_SHAPE = [
  //   '##       ##',
  //   '###     ###',
  //   '####   ####',
  //   '###########',
  //   '###########',
  //   '###########',   // eyes
  //   '###########',
  //   ' ######### ',
  //   '  #######  ',
  // ];
  const BRUSH_SCALE = 2;       // ASCII cells per bitmap pixel (bigger = larger)
  const STAMP_VALUE = 0.9;     // density the cat source asserts each step

  // Fluid solver (runs at glyph resolution). Tune the feel here.
  const FLUID = {
    flow: 0.7,        // advection strength: cells the ink moves per unit velocity
    iter: 4,          // pressure-solve iterations (more = smoother swirls)
    densDecay: 0.9,  // trail fade per step (lower = shorter trail)
    velDecay: 0.95,   // how fast flow settles when the cursor stops
    force: 0.6,       // cursor speed -> injected velocity (more = wilder flow)
    velStop: 0.0,    // velocities below this snap to 0 (keeps the still cat crisp)
  };

  // Precompute filled-cell offsets, centred on the cursor (bitmap units).
  const BRUSH = (function () {
    const rows = BRUSH_SHAPE.length;
    const cols = BRUSH_SHAPE.reduce((m, l) => Math.max(m, l.length), 0);
    const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
    const cells = [];
    for (let j = 0; j < rows; j++) {
      const line = BRUSH_SHAPE[j];
      for (let i = 0; i < line.length; i++) {
        if (line.charCodeAt(i) !== 32) cells.push([i - cx, j - cy]);
      }
    }
    return cells;
  })();
  const AMBIENT_AMP = 0.3;    // faint resting field amplitude (mostly empty)

  // Content elements the effect must NOT draw over (keeps text readable).
  // Their on-screen rectangles become "safe zones" with a soft feathered edge.
  const SAFE_SELECTOR =
    'h1,h2,h3,h4,h5,h6,p,li,a,button,img,svg,' +
    '.btn,.pub-card,.timeline-item,.top-nav,.theme-toggle,canvas:not(#bg-canvas)';
  const SAFE_PAD = 6;      // px: grow each content box before masking
  const SAFE_FEATHER = 16; // px: soft fade band outside the box
  const SAFE_REBUILD_MS = 140; // how often the mask is refreshed

  // Limit the effect to the top of the page: nothing renders below the bottom
  // of this element ("About Me"). Updated as the page scrolls.
  const CUTOFF_SELECTOR = '#about';
  const CUTOFF_FEATHER = 70; // px: soft fade-out band just above the cutoff

  // ----- State ----------------------------------------------------------
  let width = 0, height = 0, dpr = 1;
  let asciiCols = 0, asciiRows = 0, fontPx = CELL_PX;
  let glyph = '70, 84, 150';
  let lastTime = 0, accum = 0, ambientT = 0;
  const STEP_MS = 1000 / 45;

  // Fluid fields at glyph resolution. `dens` is what the renderer reads.
  let dens = null, dens0 = null;
  let velX = null, velY = null, velX0 = null, velY0 = null, p = null, div = null;

  const pointer = { x: -1, y: -1, px: -1, py: -1, active: false };

  // Safe-zone coverage mask (one float per ASCII cell, 0 = free, 1 = blocked).
  let safeMask = null, maskBuiltAt = -1e9, maskDirty = true;
  // Viewport Y below which the effect is hidden (bottom of the "About Me" block).
  let effectMaxY = Infinity;

  function markMaskDirty() { maskDirty = true; }

  // Build the coverage mask from the bounding boxes of content elements.
  function buildSafeMask() {
    const cols = asciiCols, rows = asciiRows;
    if (!safeMask || safeMask.length !== cols * rows) safeMask = new Float32Array(cols * rows);
    else safeMask.fill(0);

    const cutoff = document.querySelector(CUTOFF_SELECTOR);
    effectMaxY = cutoff ? cutoff.getBoundingClientRect().bottom : height;

    const els = document.querySelectorAll(SAFE_SELECTOR);
    for (let n = 0; n < els.length; n++) {
      const r = els[n].getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.bottom < 0 || r.top > height || r.right < 0 || r.left > width) continue;

      const x0 = r.left - SAFE_PAD, y0 = r.top - SAFE_PAD;
      const x1 = r.right + SAFE_PAD, y1 = r.bottom + SAFE_PAD;
      const c0 = Math.max(0, ((x0 - SAFE_FEATHER) / CELL_PX) | 0);
      const c1 = Math.min(cols - 1, Math.ceil((x1 + SAFE_FEATHER) / CELL_PX));
      const r0 = Math.max(0, ((y0 - SAFE_FEATHER) / CELL_PX) | 0);
      const r1 = Math.min(rows - 1, Math.ceil((y1 + SAFE_FEATHER) / CELL_PX));

      for (let rr = r0; rr <= r1; rr++) {
        const cy = rr * CELL_PX + CELL_PX / 2;
        const dy = cy < y0 ? y0 - cy : (cy > y1 ? cy - y1 : 0);
        for (let cc = c0; cc <= c1; cc++) {
          const cx = cc * CELL_PX + CELL_PX / 2;
          const dx = cx < x0 ? x0 - cx : (cx > x1 ? cx - x1 : 0);
          const dist = dx === 0 && dy === 0 ? 0 : Math.sqrt(dx * dx + dy * dy);
          const cov = dist <= 0 ? 1 : (dist >= SAFE_FEATHER ? 0 : 1 - dist / SAFE_FEATHER);
          if (cov > 0) {
            const idx = rr * cols + cc;
            if (cov > safeMask[idx]) safeMask[idx] = cov;
          }
        }
      }
    }
  }

  function maybeBuildMask(now) {
    if (maskDirty || now - maskBuiltAt >= SAFE_REBUILD_MS) {
      buildSafeMask();
      maskBuiltAt = now;
      maskDirty = false;
    }
  }

  function readGlyphColor() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--bg-glyph').trim();
    if (raw) glyph = raw;
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    asciiCols = Math.ceil(width / CELL_PX);
    asciiRows = Math.ceil(height / CELL_PX);
    fontPx = CELL_PX;

    const n = asciiCols * asciiRows;
    dens = new Float32Array(n); dens0 = new Float32Array(n);
    velX = new Float32Array(n); velY = new Float32Array(n);
    velX0 = new Float32Array(n); velY0 = new Float32Array(n);
    p = new Float32Array(n); div = new Float32Array(n);

    ctx.font = fontPx + 'px ' + (getComputedStyle(document.documentElement)
      .getPropertyValue('--font-mono').trim() || 'monospace');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  // ----- Fluid solver (stable fluids @ glyph resolution) ---------------
  function setBnd(b, x) {
    const w = asciiCols, h = asciiRows;
    for (let i = 1; i < w - 1; i++) {
      x[i] = b === 2 ? -x[i + w] : x[i + w];
      x[i + (h - 1) * w] = b === 2 ? -x[i + (h - 2) * w] : x[i + (h - 2) * w];
    }
    for (let j = 1; j < h - 1; j++) {
      x[j * w] = b === 1 ? -x[1 + j * w] : x[1 + j * w];
      x[w - 1 + j * w] = b === 1 ? -x[w - 2 + j * w] : x[w - 2 + j * w];
    }
    x[0] = 0.5 * (x[1] + x[w]);
    x[(h - 1) * w] = 0.5 * (x[1 + (h - 1) * w] + x[(h - 2) * w]);
    x[w - 1] = 0.5 * (x[w - 2] + x[w - 1 + w]);
    x[w - 1 + (h - 1) * w] = 0.5 * (x[w - 2 + (h - 1) * w] + x[w - 1 + (h - 2) * w]);
  }

  function linSolve(b, x, x0, a, c) {
    const w = asciiCols, h = asciiRows, cRecip = 1 / c;
    for (let k = 0; k < FLUID.iter; k++) {
      for (let j = 1; j < h - 1; j++) {
        for (let i = 1; i < w - 1; i++) {
          const idx = i + j * w;
          x[idx] = (x0[idx] + a * (x[idx - 1] + x[idx + 1] + x[idx - w] + x[idx + w])) * cRecip;
        }
      }
      setBnd(b, x);
    }
  }

  function project(vx, vy) {
    const w = asciiCols, h = asciiRows, N = w;
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const idx = i + j * w;
        div[idx] = -0.5 * (vx[idx + 1] - vx[idx - 1] + vy[idx + w] - vy[idx - w]) / N;
        p[idx] = 0;
      }
    }
    setBnd(0, div); setBnd(0, p);
    linSolve(0, p, div, 1, 4);
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const idx = i + j * w;
        vx[idx] -= 0.5 * (p[idx + 1] - p[idx - 1]) * N;
        vy[idx] -= 0.5 * (p[idx + w] - p[idx - w]) * N;
      }
    }
    setBnd(1, vx); setBnd(2, vy);
  }

  function advect(b, d, d0, vx, vy) {
    const w = asciiCols, h = asciiRows;
    const dtx = FLUID.flow, dty = FLUID.flow;
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const idx = i + j * w;
        let x = i - dtx * vx[idx];
        let y = j - dty * vy[idx];
        if (x < 0.5) x = 0.5; else if (x > w - 1.5) x = w - 1.5;
        if (y < 0.5) y = 0.5; else if (y > h - 1.5) y = h - 1.5;
        const i0 = x | 0, i1 = i0 + 1, j0 = y | 0, j1 = j0 + 1;
        const s1 = x - i0, s0 = 1 - s1, t1 = y - j0, t0 = 1 - t1;
        d[idx] = s0 * (t0 * d0[i0 + j0 * w] + t1 * d0[i0 + j1 * w]) +
                 s1 * (t0 * d0[i1 + j0 * w] + t1 * d0[i1 + j1 * w]);
      }
    }
    setBnd(b, d);
  }

  // ----- Cursor source (cat shape) + fluid step ------------------------
  // Inject velocity from cursor motion (drives the flow when moving).
  function injectVelocity() {
    if (!pointer.active || pointer.x < 0) return;
    const w = asciiCols, h = asciiRows;
    const cc = Math.round(pointer.x / CELL_PX);
    const cr = Math.round(pointer.y / CELL_PX);
    const fx = (pointer.x - pointer.px) / CELL_PX * FLUID.force;
    const fy = (pointer.y - pointer.py) / CELL_PX * FLUID.force;

    for (let k = 0; k < BRUSH.length; k++) {
      const baseI = cc + Math.round(BRUSH[k][0] * BRUSH_SCALE);
      const baseJ = cr + Math.round(BRUSH[k][1] * BRUSH_SCALE);
      for (let sj = 0; sj < BRUSH_SCALE; sj++) {
        const j = baseJ + sj;
        if (j < 1 || j >= h - 1) continue;
        for (let si = 0; si < BRUSH_SCALE; si++) {
          const i = baseI + si;
          if (i < 1 || i >= w - 1) continue;
          const idx = i + j * w;
          velX[idx] += fx; velY[idx] += fy;
        }
      }
    }
    pointer.px = pointer.x;
    pointer.py = pointer.y;
  }

  // Stamp the cat shape as a crisp density source (after advection, so the
  // cursor always shows a sharp cat while the trail behind it flows).
  function stampCat() {
    if (!pointer.active || pointer.x < 0) return;
    const w = asciiCols, h = asciiRows;
    const cc = Math.round(pointer.x / CELL_PX);
    const cr = Math.round(pointer.y / CELL_PX);

    for (let k = 0; k < BRUSH.length; k++) {
      const baseI = cc + Math.round(BRUSH[k][0] * BRUSH_SCALE);
      const baseJ = cr + Math.round(BRUSH[k][1] * BRUSH_SCALE);
      for (let sj = 0; sj < BRUSH_SCALE; sj++) {
        const j = baseJ + sj;
        if (j < 0 || j >= h) continue;
        for (let si = 0; si < BRUSH_SCALE; si++) {
          const i = baseI + si;
          if (i < 0 || i >= w) continue;
          const idx = i + j * w;
          if (STAMP_VALUE > dens[idx]) dens[idx] = STAMP_VALUE;
        }
      }
    }
  }

  function fluidStep() {
    project(velX, velY);
    velX0.set(velX); velY0.set(velY);
    advect(1, velX, velX0, velX0, velY0);
    advect(2, velY, velY0, velX0, velY0);
    project(velX, velY);

    dens0.set(dens);
    advect(0, dens, dens0, velX, velY);

    const dD = FLUID.densDecay, vD = FLUID.velDecay, vStop = FLUID.velStop;
    for (let k = 0; k < dens.length; k++) {
      dens[k] *= dD;
      if (dens[k] < 0.004) dens[k] = 0;
      let vx = velX[k] * vD, vy = velY[k] * vD;
      if (vx < vStop && vx > -vStop) vx = 0;
      if (vy < vStop && vy > -vStop) vy = 0;
      velX[k] = vx; velY[k] = vy;
    }
  }

  function onMove(clientX, clientY) {
    if (!pointer.active) { pointer.px = clientX; pointer.py = clientY; }
    pointer.x = clientX;
    pointer.y = clientY;
    pointer.active = true;
  }

  // ----- Render ---------------------------------------------------------
  const RAMP_MAX = RAMP.length - 1;

  // Drifting low-frequency, irregular resting texture — mostly empty, with
  // occasional soft clusters (avoids the mechanical-lattice look).
  function ambientAt(col, row, t) {
    const a = Math.sin(col * 0.08 + t * 1.1) * Math.cos(row * 0.10 - t * 0.7);
    const b = Math.sin((col + row) * 0.05 - t * 0.9);
    const c = Math.sin(col * 0.021 + row * 0.033 + t * 0.5);
    let n = a * 0.5 + b * 0.3 + c * 0.2; // [-1, 1]
    n = n * 0.5 + 0.5;                   // [0, 1]
    return AMBIENT_AMP * n * n * n;      // cubic bias -> sparse
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    const t = ambientT;

    const mask = safeMask, field = dens;
    for (let row = 0; row < asciiRows; row++) {
      const cy = row * CELL_PX + CELL_PX / 2;
      if (cy >= effectMaxY) break; // below the "About Me" cutoff -> stop
      const vfade = cy > effectMaxY - CUTOFF_FEATHER
        ? (effectMaxY - cy) / CUTOFF_FEATHER : 1;

      const rowOff = row * asciiCols;
      for (let col = 0; col < asciiCols; col++) {
        const free = mask ? 1 - mask[rowOff + col] : 1;
        if (free <= 0.02) continue; // fully inside a content box -> skip

        // fluid cat ink + faint resting texture
        let d = field[rowOff + col] + ambientAt(col, row, t);

        // contrast + gamma shaping (mirrors Codex's luma mapping)
        let v = d * CONTRAST;
        if (v <= 0) continue;
        v = Math.pow(v > 1 ? 1 : v, GAMMA);
        if (v < THRESHOLD) continue;

        const ramp = v > 1 ? 1 : v;
        const ch = RAMP[Math.min(RAMP_MAX, 1 + (ramp * RAMP_MAX) | 0)];
        if (ch === ' ') continue;

        const alpha = Math.min(ALPHA_MAX, ALPHA_BASE + ramp * ALPHA_GAIN) * free * vfade;
        if (alpha < 0.02) continue;
        ctx.fillStyle = 'rgba(' + glyph + ',' + alpha.toFixed(3) + ')';
        ctx.fillText(ch, col * CELL_PX + CELL_PX / 2, cy);
      }
    }
  }

  function frame(now) {
    if (!lastTime) lastTime = now;
    const elapsed = now - lastTime;
    lastTime = now;
    accum += elapsed;
    ambientT += elapsed * 0.00018;

    maybeBuildMask(now);

    let steps = 0;
    while (accum >= STEP_MS && steps < 3) {
      injectVelocity();
      fluidStep();
      stampCat();       // crisp cat re-asserted on top of the flowing trail
      accum -= STEP_MS;
      steps++;
    }
    render();
    requestAnimationFrame(frame);
  }

  // ----- Static fallback (reduced motion) ------------------------------
  function renderStatic() {
    buildSafeMask();
    ctx.clearRect(0, 0, width, height);
    const mask = safeMask;
    for (let row = 0; row < asciiRows; row++) {
      const cy = row * CELL_PX + CELL_PX / 2;
      if (cy >= effectMaxY) break;
      const vfade = cy > effectMaxY - CUTOFF_FEATHER
        ? (effectMaxY - cy) / CUTOFF_FEATHER : 1;
      const rowOff = row * asciiCols;
      for (let col = 0; col < asciiCols; col++) {
        const free = mask ? 1 - mask[rowOff + col] : 1;
        if (free <= 0.02) continue;
        const v = ambientAt(col, row, 0);
        const ramp = Math.pow(Math.min(1, v * CONTRAST), GAMMA);
        if (ramp < THRESHOLD) continue;
        const ch = RAMP[Math.min(RAMP_MAX, 1 + (ramp * RAMP_MAX) | 0)];
        if (ch === ' ') continue;
        ctx.fillStyle = 'rgba(' + glyph + ',' + (Math.min(ALPHA_MAX, ALPHA_BASE + ramp * ALPHA_GAIN) * free * vfade).toFixed(3) + ')';
        ctx.fillText(ch, col * CELL_PX + CELL_PX / 2, cy);
      }
    }
  }

  // ----- Init -----------------------------------------------------------
  function init() {
    readGlyphColor();
    resize();

    window.addEventListener('resize', function () {
      resize();
      markMaskDirty();
      if (reduceMotion) renderStatic();
    });

    // Content moves under the fixed canvas while scrolling -> refresh mask.
    window.addEventListener('scroll', markMaskDirty, { passive: true });
    // Late reflows (web fonts, images, entrance animations) shift boxes.
    window.addEventListener('load', markMaskDirty);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(markMaskDirty);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        setTimeout(function () { readGlyphColor(); if (reduceMotion) renderStatic(); }, 0);
      });
    }

    if (reduceMotion) { renderStatic(); return; }

    window.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('mouseleave', function () { pointer.active = false; });
    window.addEventListener('touchmove', function (e) {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
