/**
 * Phase 1B (Round 2): Asymmetric 3/4 Contrapposto Figure Rough for "Kestrel"!
 *
 * Fixes from Round 1 critique:
 *  1. Break T-bar arm symmetry -> Steep diagonal baton over far shoulder (far arm hooked lazily over it),
 *     near arm dropped down with hand cocked on pushed-out hip (carves TWO totally different negative-space triangles!).
 *  2. True 3/4 turned ribcage & bust profile (no flat front-facing hourglass!).
 *  3. Continuous organic anatomical contours (neck->deltoid->arm, waist->hip->thigh, ZERO blocky rectangle seams!).
 *  4. Fuller modern anime cranium + sharp 3/4 cheekbone-to-chin jaw plane.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { chromium } from "playwright"
import { SKETCHER_LIB } from "./sketcher.ts"

const visorUrl = `data:image/jpeg;base64,${readFileSync("gallery/visor.jpg").toString("base64")}`
const tapeUrl = `data:image/png;base64,${readFileSync("public/tape.png").toString("base64")}`

const run = async () => {
  const b = await chromium.launch()
  const p = await b.newPage()

  const html = `<!doctype html><html><body><script>(async () => {
  ${SKETCHER_LIB}

  const W = 1024, H = 1536;

  // =========================================================================
  // PHASE 1B (ROUND 2) — NAMED ANATOMICAL ANCHORS (3/4 Contrapposto!)
  // =========================================================================
  const A = {
    // Head: 3/4 turned slightly viewer-left, tilted playfully right-down, looking directly at viewer!
    headC:    [485, 290],
    crown:    [515, 152],
    chin:     [460, 412],
    cheekL:   [396, 336],
    jawR:     [558, 366],
    neckL:    [452, 466],
    neckR:    [536, 456],

    // 3/4 Ribcage: near shoulder (left) forward & slightly lower; far shoulder (right) raised toward baton!
    shL:      [378, 522], // near shoulder (viewer-left, forward!)
    shR:      [602, 488], // far shoulder (viewer-right, narrower in 3/4 perspective!)
    pitL:     [424, 608],
    bustPeak: [626, 616], // 3/4 bust silhouette projecting cleanly on viewer-right!
    underBust:[592, 682],
    waistL:   [438, 772], // stretch side (long sweeping S-curve from ribcage to hip!)
    waistR:   [566, 764], // crisp pinched waist!

    // Counter-tilted 3/4 Pelvis: pushed OUT viewer-left (weight-bearing!)
    hipL:     [346, 916], // strong weight-bearing hip push!
    hipR:     [624, 922],
    crotch:   [498, 1026],

    // Asymmetric Stride Legs (front leg L steps down-left; back leg R steps behind-right!)
    kneeL:    [392, 1375],
    kneeR:    [656, 1360],

    // Near Arm L: elbow bent back-out-left, forearm angled forward-in, hand cocked on pushed-out hip!
    elbowL:   [236, 742],
    wristL:   [342, 872],

    // Far Arm R: raised out-right & bent UP lazily over the steep diagonal baton!
    elbowR:   [788, 540],
    wristR:   [756, 392],

    // Steep Diagonal Antenna-Wrench Baton resting on far shoulder!
    // Wrench head high-right (balances low-left hip push!), antenna handle angled down-left behind back!
    batonLow: [152, 718],
    batonHi:  [884, 296],
  };

  function drawPhase1B(g, mode) {
    srand(808);
    const isSil = mode === "sil";
    g.save();
    g.fillStyle = "#fafbfc";
    g.fillRect(0, 0, W, H);
    if (mode === "flip") { g.translate(W, 0); g.scale(-1, 1); }

    const BLUE = "rgba(42, 118, 232, 0.56)";
    const BLUE_LIGHT = "rgba(42, 118, 232, 0.28)";
    const RED = "rgba(225, 45, 62, 0.72)";
    const GRAPH = isSil ? "#14161c" : "rgba(24, 26, 34, 0.90)";
    const FILL = isSil ? "#14161c" : "#ffffff";

    const shape = (pts, o = {}) => {
      const sm = o.smooth !== false;
      fillPoly(g, pts, isSil ? "#14161c" : (o.fill ?? FILL), { smooth: sm });
      if (!isSil) pencil(g, pts, { closed: true, smooth: sm, color: GRAPH, w: o.w ?? 3.2, passes: 2, jitter: 0.85 });
    };

    // ---- 1. STEEP DIAGONAL WRENCH-BATON BEHIND SHOULDERS & BACK ----
    const bDir = unit(sub(A.batonHi, A.batonLow)), bN = perp(bDir);
    const shaft = [
      add(A.batonLow, mul(bN, 13)), add(A.batonHi, mul(bN, 15)),
      add(A.batonHi, mul(bN, -15)), add(A.batonLow, mul(bN, -13)),
    ];
    // Chunky stylized wrench jaw at HIGH-RIGHT end (strong silhouette hook!)
    const h0 = A.batonHi;
    const wrench = [
      add(h0, add(mul(bDir, -14), mul(bN, 26))),
      add(h0, add(mul(bDir, 62), mul(bN, 48))),
      add(h0, add(mul(bDir, 80), mul(bN, 18))),
      add(h0, add(mul(bDir, 36), mul(bN, 12))),
      add(h0, add(mul(bDir, 36), mul(bN, -14))),
      add(h0, add(mul(bDir, 76), mul(bN, -22))),
      add(h0, add(mul(bDir, 54), mul(bN, -48))),
      add(h0, add(mul(bDir, -14), mul(bN, -26))),
    ];
    // Signal antenna fin + grip cap at LOW-LEFT end (peeks cleanly past elbowL!)
    const l0 = A.batonLow;
    const fin = [
      add(l0, add(mul(bDir, 28), mul(bN, 15))),
      add(l0, add(mul(bDir, -48), mul(bN, 24))),
      add(l0, add(mul(bDir, -34), mul(bN, -28))),
      add(l0, add(mul(bDir, 36), mul(bN, -14))),
    ];
    shape(shaft, { smooth: false, fill: "#edf0f5", w: 3.0 });
    shape(wrench, { smooth: false, fill: "#e4e8f0", w: 3.2 });
    shape(fin, { smooth: false, fill: "#e4e8f0", w: 3.0 });

    // ---- 2. BACK HAIR PONYTAIL MASS (sweeping high-left to counter-balance wrench high-right!) ----
    const ponySil = [
      [442, 186], [346, 118], [218, 134], [146, 208],
      [234, 198], [186, 264], [286, 246], [358, 224], [430, 232]
    ];
    shape(ponySil, { fill: "rgba(38, 46, 64, 0.08)", w: 3.2 });

    // ---- 3. FAR ARM R (continuous sweeping curve: shoulderR -> elbowR -> forearm hooking OVER baton!) ----
    const armRBack = [
      [576, 488], [672, 482], [774, 502], [814, 536], [806, 578],
      [744, 588], [662, 560], [584, 558]
    ];
    shape(armRBack, { w: 3.2 });
    // Raised forearm R wrapping UP and hooking casually over the baton shaft!
    const foreR = [
      [756, 564], [798, 556], [818, 524], [802, 444], [776, 384],
      [738, 384], [740, 446], [734, 514]
    ];
    shape(foreR, { w: 3.2 });
    // Relaxed draped hand R hanging loosely over front of baton!
    const handR = [
      [772, 382], [738, 370], [704, 396], [696, 448], [722, 474], [752, 456], [766, 418]
    ];
    shape(handR, { w: 3.0 });

    // ---- 4. CONTINUOUS 3/4 BODY + LEGS (ZERO shelf/notch between waist, hip, and thigh!) ----
    // Back leg R (receding cleanly behind front weight-bearing leg L!)
    const backLeg = [
      [518, 956], [616, 916], [644, 1020], [674, 1190], [696, 1365], [738, 1546],
      [620, 1546], [596, 1360], [556, 1170], [504, 1024]
    ];
    shape(backLeg, { w: 3.4 });

    // Unified continuous 3/4 Torso + Neck + Weight-Bearing Front Leg L!
    // Look at the rhythm: long sweeping stretch curve on left (rib->waist->pushed hip->outer thigh),
    // contrasting crisp 3/4 bust profile & pinched waist on right!
    const bodyUnified = [
      [458, 398], // left neck top
      [452, 466], // slender neck base
      [388, 504], // near trapezius/shoulder slope
      [352, 548], // near deltoid front
      [414, 622], // armpit tuck
      [418, 696], // stretch ribcage side
      A.waistL,   // slim waist
      [386, 842], // smooth hip flare (NO step!)
      A.hipL,     // weight-bearing hip peak!
      [338, 1038],// sweeping outer thigh curve!
      [354, 1218],// tapered lower thigh
      [360, 1375],// knee outer
      [318, 1546],// shin exit
      [442, 1546],// inner shin
      [458, 1365],// inner knee
      [496, 1170],// taut inner thigh
      A.crotch,   // crisp crotch overlap
      [598, 996], // lower far hip
      A.hipR,     // far hip curve
      [602, 838], // far waist->hip transition
      A.waistR,   // pinched right waist!
      A.underBust,// crisp under-bust tuck!
      A.bustPeak, // confident 3/4 bust silhouette!
      [618, 548], // upper chest slope
      A.shR,      // far shoulder
      [540, 464], // right neck base
      [530, 392], // right neck top
    ];
    shape(bodyUnified, { w: 3.6 });

    // ---- 5. NEAR ARM L (continuous organic deltoid -> elbow -> forearm -> hand cocked on hip!) ----
    // Carves a super crisp negative-space triangle between torso waistL and forearm!
    const armL = [
      [392, 502], // shoulder top
      [334, 524], // rounded deltoid cap
      [296, 598], // outer bicep curve
      [234, 712], // outer elbow bend!
      [226, 756], // sharp elbow point
      [268, 822], // outer forearm taper
      [322, 882], // wrist outer
      [356, 856], // wrist inner
      [316, 790], // inner forearm
      [288, 732], // inner elbow crease!
      [354, 636], // inner upper arm
      [412, 588], // armpit join
    ];
    shape(armL, { w: 3.4 });
    // Cocked hip hand L (gestural mitten wrapping naturally over hipL!)
    const handL = [
      [322, 876], [358, 854], [396, 882], [412, 926], [386, 964], [354, 956], [332, 916]
    ];
    shape(handL, { w: 3.0 });

    // ---- 6. SCULPTED MODERN ANIME HEAD (fuller cranium, delicate far cheek S-curve, sharp chin!) ----
    const headPoly = [
      [506, 152], [584, 184], [602, 266], [584, 342], A.jawR,
      [518, 402], A.chin, [414, 386], [392, 344], A.cheekL,
      [386, 286], [404, 206], [448, 162]
    ];
    shape(headPoly, { w: 3.6 });

    // ---- 7. BLUE CONSTRUCTION & FLOW OVERLAY ----
    if (!isSil) {
      // Sweeping S-curve Line of Action (crown -> spine -> weight-bearing hip -> front leg!)
      pencil(g, [[518, 146], [504, 340], [526, 610], [478, 885], [398, 1250], [362, 1525]], { color: RED, w: 3.4, passes: 1, jitter: 0.4 });

      // Tilted 3/4 Robo-Bean Ribcage & Pelvis
      pencil(g, [[418, 520], [596, 492], [574, 704], [430, 722]], { closed: true, smooth: false, color: BLUE, w: 2.0, passes: 1 });
      pencil(g, [[532, 502], [552, 612], [522, 712]], { color: BLUE, w: 2.0, passes: 1 }); // 3/4 shifted sternum centerline!
      wrapArc(g, [422, 628], [622, 608], 32, BLUE, 1.8);

      pencil(g, [[424, 804], [584, 828], [608, 996], [356, 974]], { closed: true, smooth: false, color: BLUE, w: 2.0, passes: 1 });
      pencil(g, [[514, 816], A.crotch], { color: BLUE, w: 2.0, passes: 1 });
      wrapArc(g, [348, 922], [620, 932], 32, BLUE, 1.8);

      // Cross-contours on limbs to feel 3D tilt
      wrapArc(g, [342, 1140], [492, 1154], 24, BLUE_LIGHT, 1.6);
      wrapArc(g, [554, 1164], [670, 1152], -18, BLUE_LIGHT, 1.6);
      wrapArc(g, [282, 636], [350, 654], 16, BLUE_LIGHT, 1.6);
      wrapArc(g, [676, 488], [686, 566], -14, BLUE_LIGHT, 1.6);

      // Clavicles & sternocleidomastoid tendons
      pencil(g, [[458, 422], [504, 504]], { color: BLUE_LIGHT, w: 1.6, passes: 1 });
      pencil(g, [[508, 508], [434, 514], [386, 520]], { color: GRAPH, w: 2.2, passes: 1 });
      pencil(g, [[526, 504], [572, 496], [602, 492]], { color: GRAPH, w: 2.0, passes: 1 });

      // 3/4 Head gaze cross & quick confident anime expression!
      pencil(g, [[488, 156], [448, 294], A.chin], { color: BLUE, w: 2.2, passes: 1 });
      pencil(g, [[388, 288], [450, 314], [584, 298]], { color: BLUE, w: 2.2, passes: 1 });
      taperStroke(g, [[396, 290], [416, 282], [436, 292]], 4.4, { color: GRAPH, taper: [0.2, 0.3] });
      taperStroke(g, [[478, 298], [516, 290], [548, 300]], 5.4, { color: GRAPH, taper: [0.2, 0.3] });
      pencil(g, [[444, 334], [438, 344], [446, 347]], { color: GRAPH, w: 1.8, passes: 1 });
      pencil(g, [[432, 364], [462, 370], [496, 356]], { color: GRAPH, w: 2.2, passes: 1 });
    }

    g.restore();
  }

  // ---- 4-Panel Review Sheet ----
  const pw = 420, ph = 630, gap = 8, hdr = 32;
  const c = document.createElement("canvas");
  c.width = pw * 4 + gap * 3; c.height = ph + hdr;
  const g = c.getContext("2d");
  g.fillStyle = "#dfe3ea"; g.fillRect(0, 0, c.width, c.height);

  const panels = [
    ["1. Phase 1B (R2): 3/4 Contrapposto Rough", "rough"],
    ["2. Pure Silhouette (Asymmetry & Gaps)", "sil"],
    ["3. Horizontal Flip (Balance Check)", "flip"],
    ["4. Style Ref Lineup (visor / tape)", "ref"],
  ];

  for (let i = 0; i < 4; i++) {
    const x = i * (pw + gap);
    g.fillStyle = "#181a22"; g.fillRect(x, 0, pw, hdr);
    g.fillStyle = "#ffffff"; g.font = "600 13px -apple-system, sans-serif"; g.textAlign = "center";
    g.fillText(panels[i][0], x + pw / 2, 21);
    if (i < 3) {
      const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
      drawPhase1B(tmp.getContext("2d"), panels[i][1]);
      g.drawImage(tmp, x, hdr, pw, ph);
    } else {
      g.fillStyle = "#ffffff"; g.fillRect(x, hdr, pw, ph);
      const im1 = new Image(), im2 = new Image();
      await Promise.all([
        new Promise(r => { im1.onload = r; im1.src = "${visorUrl}"; }),
        new Promise(r => { im2.onload = r; im2.src = "${tapeUrl}"; }),
      ]);
      g.drawImage(im1, x, hdr, pw / 2, ph / 2);
      g.drawImage(im2, x + pw / 2, hdr, pw / 2, ph / 2);
      const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
      drawPhase1B(tmp.getContext("2d"), "rough");
      g.drawImage(tmp, x + pw * 0.25, hdr + ph / 2, pw / 2, ph / 2);
    }
  }
  window.__out = c.toDataURL("image/png");
  })();</script></body></html>`

  await p.setContent(html)
  await p.waitForFunction(() => Boolean((window as unknown as { __out?: string }).__out))
  const url = await p.evaluate(() => (window as unknown as { __out: string }).__out)
  await b.close()
  writeFileSync("exp/sketch/out/phase1b-r2-review.png", Buffer.from(url.split(",")[1]!, "base64"))
  console.log("Wrote exp/sketch/out/phase1b-r2-review.png")
}
run()
