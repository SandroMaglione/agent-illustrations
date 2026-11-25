/**
 * 2D Human-Style Rough Sketching & Sculpting Engine (Playwright Canvas 2D).
 *
 * Principles encoded directly into primitives:
 *  - Loose multi-pass pencil/charcoal rendering (blue construction + graphite rough)
 *  - CSI curves & asymmetric limb forms (straight/taut side vs rhythmic curved side)
 *  - Non-destructive sculpting transforms & radial Liquify warps on named groups
 *  - Built-in visual gates: 120px pure silhouette, horizontal flip, flow arrows, numbered handles
 */
export const SKETCHER_LIB = `
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const unit = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
  const perp = (a) => [-a[1], a[0]];
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

  // Deterministic pseudo-random for natural organic pencil grain
  let _seed = 1337;
  const srand = (s) => { _seed = s >>> 0; };
  const rand = () => { _seed = (1664525 * _seed + 1013904223) >>> 0; return _seed / 4294967296; };

  const bezier = (p0, c1, c2, p3, steps = 28) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps, u = 1 - t;
      return [
        u*u*u*p0[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t*t*t*p3[0],
        u*u*u*p0[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t*t*t*p3[1],
      ];
    });

  const catmull = (pts, per = 12, closed = false) => {
    const n = pts.length;
    if (n < 2) return [...pts];
    if (n === 2) return Array.from({ length: per + 1 }, (_, i) => lerp2(pts[0], pts[1], i / per));
    const out = [];
    const get = (i) => {
      if (closed) return pts[((i % n) + n) % n];
      if (i < 0) return sub(mul(pts[0], 2), pts[1]);
      if (i >= n) return sub(mul(pts[n - 1], 2), pts[n - 2]);
      return pts[i];
    };
    const count = closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const dt = (a, b) => Math.max(1e-3, dist(a, b) ** 0.5);
      const t0 = 0, t1 = dt(p0, p1), t2 = t1 + dt(p1, p2), t3 = t2 + dt(p2, p3);
      for (let k = 0; k < per; k++) {
        const t = t1 + (t2 - t1) * (k / per);
        const mix = (a, b, u, v) => [((v - t)*a[0] + (t - u)*b[0])/(v - u), ((v - t)*a[1] + (t - u)*b[1])/(v - u)];
        const A1 = mix(p0, p1, t0, t1), A2 = mix(p1, p2, t1, t2), A3 = mix(p2, p3, t2, t3);
        out.push(mix(mix(A1, A2, t0, t2), mix(A2, A3, t1, t3), t1, t2));
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  };

  // Non-destructive sculpting transforms (Lasso Scale/Rotate/Move + Radial Liquify Warp!)
  const makeTransform = (cx, cy, dx = 0, dy = 0, scale = 1, rotDeg = 0) => {
    const a = rotDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return (p) => {
      const x = (p[0] - cx) * scale, y = (p[1] - cy) * scale;
      return [cx + x*c - y*s + dx, cy + x*s + y*c + dy];
    };
  };
  const makeLiquify = (warps) => (p) => {
    let x = p[0], y = p[1];
    for (const [wx, wy, rad, dx, dy] of warps) {
      const d = Math.hypot(x - wx, y - wy);
      if (d < rad) {
        const t = 1 - d / rad;
        const w = t * t * (3 - 2 * t);
        x += dx * w; y += dy * w;
      }
    }
    return [x, y];
  };

  // Loose organic pencil stroke (slight overshoot + multi-pass graphite feel!)
  const pencil = (g, raw, o = {}) => {
    const closed = o.closed ?? false;
    const pts = o.smooth === false ? [...raw] : catmull(raw, o.per ?? 10, closed);
    if (pts.length < 2) return;
    const col = o.color ?? "rgba(28, 30, 38, 0.88)";
    const w0 = o.w ?? 2.4;
    const passes = o.passes ?? 2;
    const jitter = o.jitter ?? 1.1;
    const over = o.overshoot ?? 0;

    let work = pts;
    if (!closed && over > 0 && pts.length >= 2) {
      const d0 = unit(sub(pts[0], pts[1]));
      const d1 = unit(sub(pts[pts.length - 1], pts[pts.length - 2]));
      work = [add(pts[0], mul(d0, over)), ...pts, add(pts[pts.length - 1], mul(d1, over))];
    }

    g.save();
    g.lineCap = "round"; g.lineJoin = "round";
    for (let pass = 0; pass < passes; pass++) {
      g.beginPath();
      const alpha = pass === 0 ? 1.0 : 0.42;
      g.globalAlpha = (o.alpha ?? 1) * alpha;
      g.strokeStyle = col;
      g.lineWidth = w0 * (pass === 0 ? 1.0 : 0.65);
      for (let i = 0; i < work.length; i++) {
        const jx = (rand() - 0.5) * jitter * (pass + 0.5);
        const jy = (rand() - 0.5) * jitter * (pass + 0.5);
        const p = [work[i][0] + jx, work[i][1] + jy];
        if (i === 0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]);
      }
      if (closed) g.closePath();
      g.stroke();
    }
    g.restore();
  };

  // Variable-width tapered charcoal/graphite stroke (for confident anime roughs!)
  const taperStroke = (g, raw, w0, o = {}) => {
    const closed = o.closed ?? false;
    const pts = o.smooth === false ? [...raw] : catmull(raw, o.per ?? 10, closed);
    if (pts.length < 2) return;
    const n = pts.length;
    const [ts, te] = o.taper ?? (closed ? [0, 0] : [0.28, 0.36]);
    const minTip = o.minTip ?? 0.25;
    const light = unit([-0.6, -0.8]);
    const lm = o.lightMod ?? 0.3;
    const left = [], right = [];
    const arc = [0];
    for (let i = 1; i < n; i++) arc.push(arc[i - 1] + dist(pts[i - 1], pts[i]));
    const tot = arc[n - 1] || 1;
    for (let i = 0; i < n; i++) {
      const t = arc[i] / tot;
      const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const nr = perp(unit(sub(next, prev)));
      let w = w0;
      if (lm > 0) {
        const away = -(nr[0]*light[0] + nr[1]*light[1]);
        w *= 1 + lm * clamp(away, -0.4, 0.8);
      }
      if (!closed) {
        const m = Math.min(ts > 0 ? clamp(t / ts) : 1, te > 0 ? clamp((1 - t) / te) : 1);
        w = minTip + (w - minTip) * (m * m * (3 - 2 * m));
      }
      const hw = Math.max(0.15, w * 0.5);
      left.push(add(pts[i], mul(nr, hw)));
      right.push(add(pts[i], mul(nr, -hw)));
    }
    if (closed) { left.push(left[0]); right.push(right[0]); }
    const poly = [...left, ...right.reverse()];
    g.save();
    g.globalAlpha = o.alpha ?? 1;
    g.beginPath();
    g.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
    g.closePath();
    g.fillStyle = o.color ?? "#1a1c24";
    g.fill();
    g.restore();
  };

  const fillPoly = (g, raw, col, o = {}) => {
    const pts = o.smooth === false ? [...raw] : catmull(raw, o.per ?? 10, true);
    if (pts.length < 3) return;
    g.save();
    g.globalAlpha = o.alpha ?? 1;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.restore();
  };

  /**
   * Asymmetric CSI limb/mass builder!
   * Instead of symmetric sausages, takes a gesture centerline + INDEPENDENT left (sideA) and right (sideB)
   * width profiles so one side can stay taut/straight while the opposite carries muscular/cloth curve!
   */
  const csiForm = (centerPts, wLeft, wRight, per = 10) => {
    const c = catmull(centerPts, per, false);
    const n = c.length;
    const interp = (arr, t) => {
      const f = t * (arr.length - 1);
      const j = Math.min(arr.length - 2, Math.floor(f));
      const u = f - j;
      return arr[j] * (1 - u) + arr[j + 1] * u;
    };
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const prev = c[Math.max(0, i - 1)], next = c[Math.min(n - 1, i + 1)];
      const nr = perp(unit(sub(next, prev)));
      L.push(add(c[i], mul(nr, interp(wLeft, t))));
      R.push(add(c[i], mul(nr, -interp(wRight, t))));
    }
    return { L, R, poly: [...L, ...R.slice().reverse()], center: c };
  };

  /** Draw a directional flow arrow (for visual-flow & focal-point checks!) */
  const flowArrow = (g, pts, col = "rgba(235, 140, 20, 0.72)", w = 4) => {
    const c = catmull(pts, 10, false);
    g.save();
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round";
    g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(c[0][0], c[0][1]);
    for (let i = 1; i < c.length; i++) g.lineTo(c[i][0], c[i][1]);
    g.stroke();
    g.setLineDash([]);
    const tip = c[c.length - 1], prev = c[Math.max(0, c.length - 4)];
    const d = unit(sub(tip, prev)), nr = perp(d);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(tip[0] + d[0]*8, tip[1] + d[1]*8);
    g.lineTo(tip[0] - d[0]*12 + nr[0]*10, tip[1] - d[1]*12 + nr[1]*10);
    g.lineTo(tip[0] - d[0]*12 - nr[0]*10, tip[1] - d[1]*12 - nr[1]*10);
    g.closePath(); g.fill();
    g.restore();
  };

  /** Draw an elliptical cross-contour wrap arc on a 2D form to envision 3D tilt! */
  const wrapArc = (g, leftPt, rightPt, bendPx, col = "rgba(55, 125, 235, 0.55)", w = 1.6) => {
    const mid = lerp2(leftPt, rightPt, 0.5);
    const nr = perp(unit(sub(rightPt, leftPt)));
    const ctrl = add(mid, mul(nr, bendPx));
    pencil(g, [leftPt, ctrl, rightPt], { color: col, w, passes: 1, jitter: 0.4 });
  };
`;
