// Interactive schematic for the "For the data geeks" panel. Looking straight
// down on a summit: each compass direction is won by the nearest higher peak
// (doubled-bisector reach, matching the pipeline), so a peak becomes a vertex
// when it wins at least one direction. Locked to the app's dark palette.

const DIST_MAX = 62; // degrees mapped to the board rim
const N = 720;       // sampled bearings
const PALETTE = ['#48b8ff', '#4bd4c0', '#c58cf0', '#ff8fa3', '#8ec36b', '#f0b24b', '#7aa7ff', '#e07a5f'];
const COLORS = {
  ink: '#e8eef5', muted: '#9fb3c8', hair: 'rgba(255,255,255,0.12)',
  accent: '#48b8ff', amber: '#ffd166', shadow: '#6b7a8d', ringlbl: '#6b7f92', ground: '#07111f',
};

const PRESETS = {
  reset: [
    { name: 'Alba', bearing: 20, dist: 22 },
    { name: 'Brant', bearing: 95, dist: 30 },
    { name: 'Corrie', bearing: 158, dist: 18 },
    { name: 'Drum', bearing: 232, dist: 40 },
    { name: 'Esk', bearing: 300, dist: 26 },
    { name: 'You', bearing: 55, dist: 28 },
  ],
  shadow: [
    { name: 'Alba', bearing: 20, dist: 22 },
    { name: 'Brant', bearing: 95, dist: 30 },
    { name: 'Corrie', bearing: 158, dist: 18 },
    { name: 'Drum', bearing: 232, dist: 40 },
    { name: 'Esk', bearing: 300, dist: 26 },
    { name: 'You', bearing: 22, dist: 46 }, // parked directly behind Alba
  ],
  spread: [
    { name: 'Alba', bearing: 15, dist: 30 },
    { name: 'Brant', bearing: 80, dist: 30 },
    { name: 'Corrie', bearing: 145, dist: 30 },
    { name: 'Drum', bearing: 210, dist: 30 },
    { name: 'Esk', bearing: 275, dist: 30 },
    { name: 'You', bearing: 340, dist: 30 },
  ],
};

export function initDominanceExplainer() {
  const canvas = document.querySelector('#dominance-explainer');
  if (!canvas) return { draw() {} };
  const ctx = canvas.getContext('2d');
  if (!ctx) return { draw() {} };
  const readout = document.querySelector('#de-readout');

  let peaks = clone(PRESETS.reset);
  let showBisectors = true;
  let cx = 0, cy = 0, R = 0;

  function clone(preset) { return preset.map((q, i) => ({ ...q, color: PALETTE[i % PALETTE.length] })); }
  const rad = (d) => (d * Math.PI) / 180;

  function reach(distDeg, bearingDeg, thetaDeg) {
    const d = rad(distDeg), a = rad(bearingDeg), t = rad(thetaDeg);
    let rho = Math.atan2(Math.tan(d / 2), Math.cos(t - a));
    rho = ((rho % Math.PI) + Math.PI) % Math.PI;
    return Math.min(2 * rho, rad(179));
  }

  function computeWinners() {
    const owned = peaks.map(() => []);
    for (let k = 0; k < N; k++) {
      const theta = (k / N) * 360;
      let best = Infinity, bi = -1;
      for (let i = 0; i < peaks.length; i++) {
        const r = reach(peaks[i].dist, peaks[i].bearing, theta);
        if (r < best) { best = r; bi = i; }
      }
      owned[bi].push(k);
    }
    return owned;
  }

  function toArcs(idx) {
    if (!idx.length) return [];
    const runs = [];
    let start = idx[0], prev = idx[0];
    for (let m = 1; m < idx.length; m++) {
      if (idx[m] !== prev + 1) { runs.push([start, prev]); start = idx[m]; }
      prev = idx[m];
    }
    runs.push([start, prev]);
    if (runs.length > 1 && runs[0][0] === 0 && runs[runs.length - 1][1] === N - 1) {
      const last = runs.pop();
      runs[0][0] = last[0] - N;
    }
    return runs;
  }

  function polar(bearingDeg, distDeg) {
    const rr = (Math.min(distDeg, DIST_MAX) / DIST_MAX) * R;
    const ang = rad(bearingDeg - 90);
    return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)];
  }
  function polarRim(bearingDeg, r) {
    const ang = rad(bearingDeg - 90);
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  }
  function hexA(hex, a) {
    const n = hex.replace('#', '');
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function draw() {
    const size = canvas.clientWidth;
    if (!size) return; // dialog still display:none — redraw on open / resize
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = size / 2; cy = size / 2; R = size / 2 - 34;
    ctx.clearRect(0, 0, size, size);

    const owned = computeWinners();
    const arcs = owned.map(toArcs);
    const winners = peaks.map((_, i) => owned[i].length > 0);
    let nhn = -1, nd = Infinity;
    peaks.forEach((p, i) => { if (winners[i] && p.dist < nd) { nd = p.dist; nhn = i; } });

    // owned wedges to the rim
    peaks.forEach((p, i) => {
      arcs[i].forEach(([a0, a1]) => {
        const s = rad((a0 / N) * 360 - 90), e = rad(((a1 + 1) / N) * 360 - 90);
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, s, e); ctx.closePath();
        ctx.fillStyle = hexA(p.color, 0.14); ctx.fill();
      });
    });

    // distance rings + labels
    ctx.font = '11px Inter, system-ui, sans-serif';
    [15, 30, 45, 60].forEach((dg) => {
      const rr = (dg / DIST_MAX) * R;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 2 * Math.PI);
      ctx.strokeStyle = COLORS.hair; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = COLORS.ringlbl; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${dg}° · ${(dg * 111).toLocaleString()} km`, cx + 4, cy - rr);
    });
    // bearing ticks
    ctx.fillStyle = COLORS.muted; ctx.textAlign = 'center';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([lbl, b]) => {
      const [x, y] = polarRim(b, R + 16);
      ctx.textBaseline = 'middle'; ctx.fillText(lbl, x, y);
    });

    // perpendicular bisectors (half distance, perpendicular to each spoke)
    if (showBisectors) {
      peaks.forEach((p, i) => {
        const rr = (Math.min(p.dist, DIST_MAX) / DIST_MAX) * R;
        const half = rr / 2;
        const ang = rad(p.bearing - 90);
        const mx = cx + half * Math.cos(ang), my = cy + half * Math.sin(ang);
        const px = -Math.sin(ang), py = Math.cos(ang);
        const chord = Math.sqrt(Math.max(0, R * R - half * half));
        const hl = Math.min(chord, R * 0.45);
        ctx.beginPath();
        ctx.moveTo(mx - px * hl, my - py * hl);
        ctx.lineTo(mx + px * hl, my + py * hl);
        ctx.strokeStyle = winners[i] ? hexA(p.color, 0.45) : hexA(COLORS.shadow, 0.4);
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      });
    }

    // dominance polygon through survivors in bearing order
    const surv = peaks.map((p, i) => ({ p, i })).filter((o) => winners[o.i]).sort((a, b) => a.p.bearing - b.p.bearing);
    if (surv.length >= 3) {
      ctx.beginPath();
      surv.forEach((o, j) => { const [x, y] = polar(o.p.bearing, o.p.dist); j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.closePath();
      ctx.strokeStyle = hexA(COLORS.accent, 0.9); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = hexA(COLORS.accent, 0.05); ctx.fill();
    }

    // spokes + peaks
    peaks.forEach((p, i) => {
      const [x, y] = polar(p.bearing, p.dist);
      const on = winners[i];
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
      ctx.setLineDash(on ? [] : [4, 4]);
      ctx.strokeStyle = on ? hexA(p.color, 0.75) : hexA(COLORS.shadow, 0.7);
      ctx.lineWidth = i === nhn ? 2.4 : 1.2; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, on ? 7 : 6, 0, 2 * Math.PI);
      ctx.fillStyle = on ? p.color : COLORS.shadow; ctx.fill();
      if (i === nhn) { ctx.lineWidth = 2.5; ctx.strokeStyle = COLORS.amber; ctx.stroke(); }
      ctx.fillStyle = on ? COLORS.ink : COLORS.shadow; ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(p.name + (i === nhn ? ' (nearest)' : ''), x, y - 10);
    });

    // target summit
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fillStyle = COLORS.amber; ctx.fill();
    ctx.strokeStyle = COLORS.ground; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COLORS.ink; ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('This summit', cx, cy + 12);

    renderReadout(arcs, winners, nhn);
  }

  function renderReadout(arcs, winners, nhn) {
    if (!readout) return;
    readout.innerHTML = '';
    peaks.map((p, i) => ({ p, i })).sort((a, b) => a.p.bearing - b.p.bearing).forEach(({ p, i }) => {
      const degOwned = (arcs[i].reduce((s, [a0, a1]) => s + (a1 - a0 + 1), 0) / N) * 360;
      const dt = document.createElement('dt');
      dt.innerHTML = `<span class="de-swatch" style="background:${winners[i] ? p.color : '#8899aa'}"></span>${p.name}${i === nhn ? ' ★' : ''}`;
      const dd = document.createElement('dd');
      const stem = `${p.bearing.toFixed(0)}° bearing · ${p.dist.toFixed(0)}° (${(p.dist * 111).toLocaleString()} km) · `;
      dd.textContent = winners[i] ? `${stem}owns ${degOwned.toFixed(0)}°` : `${stem}in shadow`;
      if (!winners[i]) { dt.classList.add('de-shadowed'); dd.classList.add('de-shadowed'); }
      readout.appendChild(dt); readout.appendChild(dd);
    });
  }

  // dragging
  let dragging = -1;
  function pointerPos(ev) { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }
  function pick(pxv, pyv) {
    for (let i = 0; i < peaks.length; i++) {
      const [x, y] = polar(peaks[i].bearing, peaks[i].dist);
      if (Math.hypot(pxv - x, pyv - y) < 16) return i;
    }
    return -1;
  }
  canvas.addEventListener('pointerdown', (ev) => {
    const [pxv, pyv] = pointerPos(ev);
    dragging = pick(pxv, pyv);
    if (dragging >= 0) canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (dragging < 0) return;
    const [pxv, pyv] = pointerPos(ev);
    const dx = pxv - cx, dy = pyv - cy;
    const bearing = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const dist = (Math.hypot(dx, dy) / R) * DIST_MAX;
    peaks[dragging].bearing = bearing;
    peaks[dragging].dist = Math.max(6, Math.min(DIST_MAX, dist));
    draw();
  });
  canvas.addEventListener('pointerup', () => { dragging = -1; });
  canvas.addEventListener('pointercancel', () => { dragging = -1; });

  // presets + toggle
  document.querySelector('#de-reset')?.addEventListener('click', () => { peaks = clone(PRESETS.reset); draw(); });
  document.querySelector('#de-shadow')?.addEventListener('click', () => { peaks = clone(PRESETS.shadow); draw(); });
  document.querySelector('#de-spread')?.addEventListener('click', () => { peaks = clone(PRESETS.spread); draw(); });
  const bis = document.querySelector('#de-bisectors');
  bis?.addEventListener('click', () => {
    showBisectors = !showBisectors;
    bis.textContent = `Perpendicular bisectors: ${showBisectors ? 'on' : 'off'}`;
    bis.setAttribute('aria-pressed', String(showBisectors));
    draw();
  });

  const ro = new ResizeObserver(() => draw());
  ro.observe(canvas);
  window.addEventListener('resize', draw);

  draw();
  return { draw };
}
