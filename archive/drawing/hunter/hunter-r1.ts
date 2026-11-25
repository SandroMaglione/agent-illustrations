/**
 * Female Hunter ("Sylva") — Round 1: Reference-Grounded Anime Character Drawing.
 *
 * Synthesizes 4 studio references gathered via Astra High into ONE original anime/game-art illustration:
 *  - ref-pose.png        -> Relaxed contrapposto (weight over planted left boot, bent right knee w/ lifted heel,
 *                           strong bare bow-arm extended right holding vertical recurve bow, head turned 3/4 right!)
 *  - ref-hands.png       -> TRUE 3D-interlocking bow grip (wrapped fingers + opposing thumb over leather riser!)
 *                           & gloved hip hand draping organically over quiver rim & strap!
 *  - ref-gear.png        -> Sculpted recurve bow, feathered arrows, laced leather bracer, buckled quiver, pouch & knife!
 *  - ref-outfit-face.png -> Asymmetric wool shoulder mantle gathered at brass collarbone ring clasp (radiating waterfall folds!),
 *                           fitted split-hem hunting tunic, messy wind-swept braid, sharp determined 3/4 expression!
 *
 * Canvas: 1024 x 1536 (full-body anime framing matching gallery/visor.jpg, head ~195px, ~7.2 heads tall!).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { chromium } from "playwright"
import { SKETCHER_LIB } from "../sketch/sketcher.ts"

const toUrl = (p: string, mime = "image/png") => `data:${mime};base64,${readFileSync(p).toString("base64")}`
const refPoseUrl = toUrl("exp/hunter/refs/ref-pose.png")
const refHandsUrl = toUrl("exp/hunter/refs/ref-hands.png")
const refOutfitUrl = toUrl("exp/hunter/refs/ref-outfit-face.png")
const visorUrl = toUrl("gallery/visor.jpg", "image/jpeg")

const run = async () => {
  mkdirSync("exp/hunter/out", { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage()

  const html = `<!doctype html><html><body><script>(async () => {
  ${SKETCHER_LIB}

  const W = 1024, H = 1536;
  const INK = "#12131a";
  const PAPER = "#ffffff";

  // Corner-aware smooth spline: [x, y, 1] = sharp corner, [x, y] = smooth curve!
  const mixedPath = (knots, per = 10, closed = true) => {
    const n = knots.length;
    const pts = knots.map(k => [k[0], k[1]]);
    const sharp = knots.map(k => Boolean(k[2]));
    if (!closed) {
      const runs = [[]];
      for (let i = 0; i < n; i++) {
        runs[runs.length - 1].push(pts[i]);
        if (sharp[i] && i > 0 && i < n - 1) runs.push([pts[i]]);
      }
      return runs.flatMap((r, i) => {
        const s = catmull(r, r.length > 2 ? per : Math.max(4, per >> 1), false);
        return i < runs.length - 1 ? s.slice(0, -1) : s;
      });
    }
    const first = sharp.findIndex(Boolean);
    if (first < 0) return catmull(pts, per, true);
    const rotP = [...pts.slice(first), ...pts.slice(0, first), pts[first]];
    const rotS = [...sharp.slice(first), ...sharp.slice(0, first), sharp[first]];
    const runs = [[]];
    for (let i = 0; i < rotP.length; i++) {
      runs[runs.length - 1].push(rotP[i]);
      if (rotS[i] && i > 0 && i < rotP.length - 1) runs.push([rotP[i]]);
    }
    return runs.flatMap(r => catmull(r, per, false).slice(0, -1));
  };

  function drawHunter(g, mode) {
    srand(2026);
    const isSil = mode === "sil";
    g.save();
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
    if (mode === "flip") { g.translate(W, 0); g.scale(-1, 1); }

    const colFill = isSil ? INK : PAPER;

    const form = (knots, w = 3.8, o = {}) => {
      const poly = mixedPath(knots, o.per ?? 10, true);
      fillPoly(g, poly, isSil ? INK : (o.fill ?? colFill), { smooth: false });
      if (!isSil) taperStroke(g, poly, w, { closed: true, smooth: false, color: INK, lightMod: o.lightMod ?? 0.36 });
    };
    const openInk = (knots, w = 2.0, o = {}) => {
      if (isSil) return;
      const poly = o.smooth === false ? knots.map(k => [k[0], k[1]]) : mixedPath(knots, o.per ?? 10, false);
      taperStroke(g, poly, w, { smooth: false, color: INK, ...o });
    };
    const wedge = (pts) => fillPoly(g, pts, INK, { smooth: false });

    const hairLock = (ctrl, wOut = 3.2, inner = 1) => {
      const cPts = catmull(ctrl.map(p => [p[0], p[1]]), 10, false);
      const n = cPts.length;
      const ws = Array.from({ length: n }, (_, i) => {
        const f = (i / (n - 1)) * (ctrl.length - 1);
        const j = Math.min(ctrl.length - 2, Math.floor(f)), t = f - j;
        return ctrl[j][2] * (1 - t) + ctrl[j + 1][2] * t;
      });
      const Ls = [], Rs = [];
      for (let i = 0; i < n; i++) {
        const prev = cPts[Math.max(0, i - 1)], next = cPts[Math.min(n - 1, i + 1)];
        const nr = perp(unit(sub(next, prev)));
        const hw = i === n - 1 ? 0 : ws[i] * 0.5;
        Ls.push(add(cPts[i], mul(nr, hw)));
        Rs.push(add(cPts[i], mul(nr, -hw)));
      }
      fillPoly(g, [...Ls, ...Rs.slice(0, -1).reverse()], colFill, { smooth: false });
      if (!isSil) {
        taperStroke(g, Ls, wOut, { smooth: false, taper: [0.05, 0.48], minTip: 1.1, lightMod: 0.35 });
        taperStroke(g, Rs, wOut * 0.9, { smooth: false, taper: [0.05, 0.48], minTip: 1.1, lightMod: 0.35 });
        if (inner > 0) {
          const st = Array.from({ length: n }, (_, i) => lerp2(cPts[i], Ls[i], 0.36));
          taperStroke(g, st.slice(Math.floor(n * 0.14), Math.floor(n * 0.85)), 1.2, { smooth: false, taper: [0.42, 0.48], minTip: 0.1, lightMod: 0.1 });
        }
      }
    };

    // =========================================================================
    // LAYER 1: BACK QUIVER + FEATHERED ARROWS (behind viewer-right shoulder, like ref-outfit-face!)
    // + BACK CAPE TAIL (flowing subtly behind legs!)
    // =========================================================================
    // Back cape hem peeking behind viewer-left hip & thigh (adds depth!)
    form([
      [348, 412, 1], [292, 624], [258, 868, 1], [294, 962, 1], [352, 926, 1], [392, 760], [412, 540, 1]
    ], 4.2);
    wedge([[286, 866], [306, 948], [348, 922], [356, 844]]);

    // Feathered Arrows fanning cleanly behind her right shoulder (from ref-outfit-face + ref-gear!)
    const drawArrow = (x0, y0, x1, y1) => {
      const d = unit([x1 - x0, y1 - y0]), nr = perp(d);
      // Shaft
      form([add([x0, y0], mul(nr, 3.2)), add([x1, y1], mul(nr, 3.2)), add([x1, y1], mul(nr, -3.2)), add([x0, y0], mul(nr, -3.2))].map(q => [q[0], q[1], 1]), 2.0);
      // Feathered fletching vanes near tip (x1, y1)
      const fA = add([x1, y1], mul(d, -10)), fB = add([x1, y1], mul(d, -64));
      form([fA, add(fA, add(mul(d, -12), mul(nr, 13))), add(fB, mul(nr, 10)), fB].map(q => [q[0], q[1], 1]), 1.8);
      form([fA, add(fA, add(mul(d, -12), mul(nr, -13))), add(fB, mul(nr, -10)), fB].map(q => [q[0], q[1], 1]), 1.8);
      // Feather barbs
      openInk([add(fA, mul(d, -22)), add(fA, add(mul(d, -28), mul(nr, 11)))], 1.0, { smooth: false });
      openInk([add(fA, mul(d, -42)), add(fA, add(mul(d, -48), mul(nr, 10)))], 1.0, { smooth: false });
    };
    drawArrow(548, 360, 616, 178);
    drawArrow(558, 366, 646, 192);
    drawArrow(566, 374, 672, 214);
    drawArrow(572, 384, 688, 244);
    // Leather quiver mouth peeking over shoulder!
    form([[532, 314, 1], [596, 356, 1], [574, 412, 1], [514, 370, 1]], 3.4);
    wedge([[538, 322], [588, 356], [580, 372], [530, 336]]); // dark quiver interior!

    // =========================================================================
    // LAYER 2: SLIM-STRONG CONTRAPPOSTO LEGS & LACED HUNTING BOOTS (from ref-pose.png!)
    // Weight stacked directly over planted viewer-left boot (x≈418);
    // Viewer-right leg relaxed, knee bent outward-right, boot toe touching ground & heel lifted!
    // =========================================================================
    // --- Relaxed Bent Leg R (viewer-right, bent knee + lifted heel boot!) ---
    form([
      [482, 728, 1], [552, 718, 1], [612, 858], [662, 982, 1], [674, 1024], // sleek outer thigh -> bent knee!
      [642, 1118], [584, 1218], [546, 1272, 1], [496, 1244, 1],             // tapered calf -> ankle!
      [536, 1138], [584, 1022, 1], [532, 916], [468, 796, 1]                // inner knee crease & inner thigh!
    ], 4.2);
    // Crisp knee cap & inner-knee cloth folds on bent leg R!
    openInk([[584, 1022], [622, 1012], [652, 1020]], 2.2, { taper: [0.15, 0.7] });
    openInk([[584, 1022], [614, 1038], [640, 1054]], 1.8, { taper: [0.15, 0.72] });
    openInk([[656, 986], [626, 996], [608, 992]], 1.5, { taper: [0.4, 0.5] });

    // Lifted Hunting Boot R (heel raised, toe planted cleanly near planted ankle — directly from ref-pose!)
    form([
      [496, 1228, 1], [554, 1260, 1], [528, 1344, 1], [504, 1414, 1], // back heel & shaft!
      [486, 1422, 1], [454, 1368, 1], [430, 1316, 1], [436, 1288, 1], // lug sole & angled toe!
      [472, 1266]                                                      // vamp -> instep!
    ], 4.0);
    // Boot sole tread & lacing detail R!
    form([[430, 1316, 1], [458, 1372, 1], [490, 1426, 1], [504, 1414, 1], [472, 1362, 1], [442, 1308, 1]], 3.0);
    openInk([[474, 1266], [492, 1302], [516, 1326]], 1.8, { taper: [0.2, 0.4] });
    for (const t of [0.22, 0.42, 0.62, 0.80]) {
      const p0 = lerp2([496, 1236], [448, 1296], t);
      openInk([add(p0, [-8, -6]), add(p0, [14, 6])], 1.5, { smooth: false });
    }

    // --- Planted Weight-Bearing Leg L (viewer-left, strong athletic thigh -> sleek shin -> planted boot!) ---
    form([
      [364, 712, 1], [344, 816], [352, 956], [362, 1034, 1], // strong outer hip & athletic quad sweep!
      [366, 1164], [376, 1278, 1], [432, 1278, 1],           // tapered shin -> ankle!
      [444, 1146], [440, 1028, 1], [462, 894], [476, 782, 1], [488, 728, 1]
    ], 4.4);
    // Subtle knee & trouser seam + thigh strap from ref-pose.png!
    openInk([[366, 1028], [398, 1042], [432, 1032]], 1.8, { taper: [0.35, 0.45] });
    openInk([[382, 1006], [412, 1012]], 1.4, { taper: [0.45, 0.45] });
    // Thigh leather strap with small brass buckle (curved around thigh cylinder!)
    form([[344, 868, 1], [404, 882], [464, 868, 1], [462, 888, 1], [404, 902], [346, 888, 1]], 2.8);
    form([[376, 872, 1], [402, 874, 1], [400, 898, 1], [374, 896, 1]], 2.2);

    // Planted Hunting Boot L (solid ground anchor directly under center of gravity!)
    form([
      [374, 1266, 1], [434, 1266, 1], [440, 1344], [448, 1412, 1],
      [442, 1446, 1], [364, 1446, 1], [358, 1412, 1], [368, 1344]
    ], 4.0);
    // Heavy tread sole + toe cap + laced tongue!
    form([[360, 1424, 1], [446, 1424, 1], [442, 1448, 1], [364, 1448, 1]], 3.2);
    openInk([[364, 1396], [404, 1388], [442, 1396]], 2.0);
    openInk([[390, 1272], [388, 1386]], 1.6); openInk([[418, 1272], [420, 1386]], 1.6);
    for (const y of [1292, 1314, 1336, 1358, 1378]) openInk([[388, y], [420, y]], 1.6, { smooth: false });

    // =========================================================================
    // LAYER 3: HIP QUIVER (angled cleanly along outer left hip/thigh, like ref-pose!)
    // =========================================================================
    form([[300, 698, 1], [350, 692, 1], [376, 956, 1], [336, 964, 1]], 3.8);
    // Leather lacing & reinforced rim on hip quiver!
    form([[296, 692, 1], [354, 686, 1], [358, 714, 1], [300, 720, 1]], 3.2);
    openInk([[318, 722], [348, 952]], 1.6, { taper: [0.1, 0.1] });
    // Two arrows peeking cleanly out of hip quiver!
    drawArrow(322, 704, 286, 590);
    drawArrow(336, 700, 314, 586);

    // =========================================================================
    // LAYER 4: SLIM-STRONG TORSO, NECK & FITTED SPLIT-HEM HUNTING TUNIC (ref-outfit-face!)
    // =========================================================================
    // Bare neck, strong athletic bow-shoulder R, deltoid, bicep & forearm extending right to bow!
    form([
      [446, 266, 1], [442, 344], [384, 384, 1], [362, 466], [392, 628],
      [544, 626], [568, 492], [584, 412], // torso base under tunic
      [602, 410], [648, 476], [708, 538], [786, 560, 1], // bare strong bow-arm R underside!
      [796, 526, 1], [728, 496], [674, 434], [634, 378], // bare strong deltoid & upper arm top!
      [576, 358, 1], [516, 336], [508, 262, 1]
    ], 4.2);
    // Deep black occlusion wedge right under sculpted jaw on neck!
    wedge([[444, 272], [496, 288], [520, 274], [512, 314], [468, 326], [444, 304]]);
    // Subtle athletic anatomy lines (sternocleidomastoid, clavicle, deltoid & forearm tendon — slim & strong!)
    openInk([[456, 294], [488, 362]], 1.6, { taper: [0.4, 0.55] });
    openInk([[494, 364], [546, 358], [588, 366]], 1.9, { taper: [0.4, 0.5] });
    openInk([[608, 396], [646, 424], [662, 456]], 1.5, { taper: [0.45, 0.55] }); // crisp deltoid cut!
    openInk([[688, 488], [734, 514]], 1.3, { taper: [0.45, 0.55] }); // forearm brachioradialis!

    // Laced Leather Archery Bracer on bow-forearm R (from ref-gear & ref-hands!)
    form([
      [698, 486, 1], [774, 520, 1], [762, 558, 1], [684, 528, 1]
    ], 3.4);
    // Bracer decorative tooling seam & tiny buckles!
    openInk([[704, 498], [766, 528]], 1.5, { smooth: false });
    openInk([[696, 518], [758, 546]], 1.5, { smooth: false });
    for (const [bx, by] of [[712, 536], [740, 548]]) {
      form([[bx - 6, by - 5, 1], [bx + 6, by - 2, 1], [bx + 4, by + 7, 1], [bx - 8, by + 4, 1]], 1.8);
    }

    // Fitted Sleeveless Leather-Trimmed Split-Hem Hunting Tunic (directly from ref-outfit-face right!)
    form([
      [428, 362, 1], [546, 354, 1], [576, 408], [584, 488], [556, 588],
      [554, 654, 1], [588, 782, 1], [526, 796, 1], [504, 704, 1], // right split flap!
      [488, 804, 1], [412, 796, 1], [416, 696, 1],                // center split flap!
      [388, 784, 1], [342, 766, 1], [378, 636], [398, 554], [386, 444] // left split flap!
    ], 4.2);
    // Tunic leather trim edging, side lacing & subtle bust/waist tension folds!
    openInk([[438, 376], [492, 412], [544, 368]], 2.2); // neckline trim
    openInk([[418, 788], [482, 794]], 1.6); // hem trim border
    openInk([[530, 784], [580, 774]], 1.6);
    openInk([[424, 496], [482, 522], [556, 512]], 2.2, { taper: [0.4, 0.35] }); // subtle under-bust fold
    openInk([[406, 566], [472, 578], [546, 564]], 1.8, { taper: [0.3, 0.55] }); // waist tension fold
    openInk([[410, 594], [484, 604], [544, 592]], 1.6, { taper: [0.3, 0.6] });
    // Cross-laced side bodice eyelets!
    for (const y of [474, 502, 530, 558]) {
      openInk([[542, y], [558, y + 12]], 1.4, { smooth: false });
      openInk([[558, y], [542, y + 12]], 1.4, { smooth: false });
    }

    // Crossbody Leather Quiver Strap (wraps cleanly over bust from collarbone clasp -> left hip!)
    form([
      [524, 376, 1], [546, 384, 1], [476, 534], [392, 646, 1], [372, 634, 1], [456, 520]
    ], 3.4);
    // Brass adjuster buckle on chest strap!
    form([[476, 464, 1], [506, 478, 1], [494, 502, 1], [464, 488, 1]], 2.8);

    // Sculpted Utility Belt + Brass Buckle + Leather Pouch + Antler Hunting Knife (from ref-gear!)
    form([
      [372, 622, 1], [466, 638], [558, 626, 1], [562, 660, 1], [466, 672], [368, 656, 1]
    ], 3.8);
    // Belt buckle (center-right) + dangling leather belt tongue!
    form([[468, 632, 1], [508, 632, 1], [508, 672, 1], [468, 672, 1]], 3.2);
    form([[478, 642, 1], [498, 642, 1], [498, 662, 1], [478, 662, 1]], 1.8);
    form([[450, 666, 1], [466, 666, 1], [458, 766, 1], [442, 756, 1]], 2.8);
    // Sheathed Antler-Handle Hunting Knife on right hip!
    form([[528, 628, 1], [546, 626, 1], [550, 666, 1], [532, 668, 1]], 2.6); // handle
    form([[522, 666, 1], [554, 664, 1], [550, 774, 1], [536, 796, 1], [520, 768, 1]], 3.0); // leather sheath!
    // Leather hip pouch on viewer-left front belt!
    form([[364, 658, 1], [428, 664, 1], [424, 744, 1], [358, 738, 1]], 3.2);
    form([[360, 652, 1], [432, 658, 1], [428, 702, 1], [394, 712], [356, 698, 1]], 3.0);
    form([[386, 698, 1], [402, 700, 1], [400, 724, 1], [384, 722, 1]], 2.2); // tiny pouch strap buckle

    // =========================================================================
    // LAYER 5: RECURVE HUNTING BOW + TRUE 3D-INTERLOCKING BOW GRIP (from ref-pose & ref-hands!)
    // CRITICAL: Drawn in TRUE 3D occlusion order so the bow passes THROUGH her gripping hand!
    // =========================================================================
    // 5A. Taut vertical bowstring (crisp thin straight line behind grip!)
    openInk([[822, 72], [790, 1114]], 1.7, { smooth: false, taper: [0, 0] });

    // 5B. Sculpted Recurve Bow (upper & lower laminated S-curve limbs + ergonomic riser from ref-gear!)
    const bowOuter = [
      [822, 72, 1], [810, 112], [848, 224], [872, 344], [866, 444, 1], // upper recurve limb!
      [842, 496, 1], [842, 594, 1],                                     // grip riser!
      [866, 658, 1], [870, 776], [834, 938], [786, 1068], [790, 1114, 1] // lower recurve limb!
    ];
    const bowInner = [
      [822, 72, 1], [802, 114], [836, 226], [854, 344], [844, 444, 1],
      [818, 498, 1], [818, 594, 1],
      [842, 658, 1], [850, 776], [818, 938], [774, 1068], [790, 1114, 1]
    ];
    form([...bowOuter, ...bowInner.slice().reverse()], 3.6);
    // Leather grip wrap diagonal bands on riser above & below fist!
    for (const y of [498, 512, 578, 592]) openInk([[818, y], [842, y - 6]], 1.8, { smooth: false });
    // Laminated wood belly line along recurve limbs!
    openInk([[812, 126], [844, 226], [862, 344], [856, 442]], 1.4, { taper: [0.3, 0.2] });
    openInk([[854, 660], [860, 776], [826, 938], [782, 1060]], 1.4, { taper: [0.2, 0.3] });

    // 5C. TRUE 3D-INTERLOCKING BOW GRIP HAND (studied directly from ref-pose & ref-hands!)
    // Wrist enters from viewer-left -> palm wraps BEHIND riser -> 4 fingers curl AROUND front of riser ->
    // opposing thumb wraps OVER top-front of leather grip!
    // Back palm heel bridging wrist to riser:
    form([[776, 524, 1], [818, 516], [824, 574], [782, 566, 1]], 3.4);
    // 4 Stacked Curled Fingers wrapping around the FRONT of the leather riser (each is a 3D bent joint!)
    const gripFinger = (y0, y1, xRight, xLeft) => {
      form([
        [xLeft, y0 + 2, 1], [xRight - 4, y0, 1], [xRight, (y0 + y1) * 0.5],
        [xRight - 3, y1, 1], [xLeft, y1 - 1, 1], [xLeft - 4, (y0 + y1) * 0.5]
      ], 2.8);
      // Proximal knuckle plane crease!
      openInk([[xRight - 14, y0 + 2], [xRight - 13, y1 - 2]], 1.4, { taper: [0.3, 0.3] });
    };
    gripFinger(518, 534, 856, 816); // index finger wrapping tightly!
    gripFinger(533, 549, 858, 816); // middle finger!
    gripFinger(548, 563, 855, 816); // ring finger!
    gripFinger(562, 575, 849, 818); // pinky tucked cleanly underneath!
    // Deep occlusion crevices between curled fingers & riser!
    wedge([[812, 533], [822, 534], [818, 538]]);
    wedge([[812, 548], [822, 549], [818, 553]]);
    // Opposing Thumb wrapping OVER the top-front of the grip & index knuckle!
    form([
      [784, 526, 1], [806, 502], [834, 500, 1], [850, 510], [846, 524, 1], [822, 524], [802, 538, 1]
    ], 3.2);
    // Thumb joint crease & subtle nail hint!
    openInk([[822, 504], [824, 520]], 1.3, { taper: [0.35, 0.35] });

    // =========================================================================
    // LAYER 6: ASYMMETRIC WOOL SHOULDER MANTLE (studied DIRECTLY from ref-outfit-face right!)
    // Gathers tightly into ONE brass ring clasp at viewer-right collarbone ->
    // sweeps in 5 radiating cascading waterfall folds over viewer-left shoulder & arm!
    // =========================================================================
    // Main cascading mantle silhouette (angular layered hem tiers + rich gravity hang!)
    form([
      [536, 356, 1], [488, 344], [412, 344], [352, 378, 1], // wraps over shoulder cap!
      [304, 444], [274, 542], [254, 646, 1],                 // cascading outer mantle edge!
      [288, 672, 1], [312, 622, 1], [344, 652, 1],           // crisp layered angular hem breaks!
      [388, 578, 1], [406, 514], [464, 434], [528, 384, 1]   // diagonal sweep straight back to ring clasp!
    ], 4.6);
    // Deep dark occlusion shadows tucked under the cascading cape overhangs!
    wedge([[278, 650], [292, 668], [312, 620], [302, 594]]);
    wedge([[314, 624], [344, 648], [362, 602], [336, 578]]);
    // Radiating Waterfall Drapery Folds — EVERY fold originates from the brass collarbone clasp [528, 372]!
    openInk([[522, 368], [442, 366], [356, 404], [296, 512], [268, 636]], 3.0, { taper: [0.06, 0.55] });
    openInk([[524, 374], [450, 388], [372, 446], [322, 558], [308, 620]], 2.8, { taper: [0.06, 0.45] });
    openInk([[526, 378], [462, 412], [398, 486], [356, 588], [344, 646]], 2.6, { taper: [0.06, 0.4] });
    openInk([[478, 354], [396, 372], [336, 434], [292, 544]], 2.0, { taper: [0.25, 0.65] });
    openInk([[438, 412], [384, 464], [344, 534]], 1.8, { taper: [0.3, 0.7] });

    // Brass Ring Clasp anchoring the mantle right at the right collarbone (from ref-outfit-face!)
    if (!isSil) {
      g.save();
      g.beginPath(); g.arc(532, 372, 16, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill(); g.lineWidth = 3.6; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(532, 372, 9.5, 0, Math.PI * 2); g.lineWidth = 2.4; g.stroke();
      g.restore();
    }
    // Mantle fabric knot tucked cleanly over top of the brass ring!
    form([[522, 354, 1], [552, 352, 1], [554, 374, 1], [526, 376, 1]], 2.8);

    // =========================================================================
    // LAYER 7: VIEWER-LEFT FOREARM & GLOVED HAND RESTING ON QUIVER RIM (from ref-hands right!)
    // Emerges naturally from under the cascading wool mantle!
    // =========================================================================
    form([[304, 594, 1], [338, 608, 1], [348, 672, 1], [312, 668, 1]], 3.6); // forearm under mantle
    // Fingerless Leather Archery Glove + Wrist Strap with Brass Snap (studied from ref-hands right!)
    form([
      [310, 664, 1], [350, 668, 1], [362, 714, 1], [348, 730, 1],
      [316, 728, 1], [304, 710, 1]
    ], 3.4);
    // Wrist strap & brass snap button!
    form([[308, 660, 1], [354, 666, 1], [352, 682, 1], [306, 676, 1]], 2.6);
    if (!isSil) {
      g.beginPath(); g.arc(342, 674, 3.8, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    }
    // Glove leather seam lines on back of hand!
    openInk([[318, 682], [336, 706], [352, 718]], 1.4);
    // 4 Organically Cascading Bare Fingers emerging from the fingerless glove & curling over quiver strap!
    const drapeFinger = (pts) => {
      form(pts, 2.5);
      const mid = pts[1];
      openInk([add(mid, [-5, 1]), add(mid, [5, 0])], 1.1, { taper: [0.4, 0.4] });
    };
    // Pinky -> Ring -> Middle -> Index (natural length cascade & gentle curl — NO straight spikes!)
    drapeFinger([[306, 712, 1], [300, 742], [304, 764, 1], [313, 762], [314, 738], [316, 718, 1]]);
    drapeFinger([[316, 718, 1], [312, 754], [318, 782, 1], [328, 780], [326, 750], [328, 722, 1]]);
    drapeFinger([[328, 720, 1], [326, 760], [334, 792, 1], [344, 788], [340, 756], [342, 722, 1]]);
    drapeFinger([[342, 718, 1], [346, 752], [354, 778, 1], [362, 772], [356, 746], [354, 714, 1]]);

    // =========================================================================
    // LAYER 8: FOCAL POINT — DETERMINED 3/4 ANIME FACE (LOOKING RIGHT TOWARD BOW!)
    // + MESSY WIND-SWEPT BRAID OVER MANTLE (from ref-outfit-face left!)
    // =========================================================================
    // Loose thick rustic braid spilling forward over her viewer-left shoulder & mantle!
    const braidNodes = [[416, 294], [398, 336], [380, 382], [364, 430], [352, 476]];
    for (let i = 0; i < braidNodes.length - 1; i++) {
      const a = braidNodes[i], b = braidNodes[i + 1];
      const d = unit(sub(b, a)), nr = perp(d), w = 22 - i * 2.5;
      form([add(a, mul(nr, w)), add(b, mul(nr, w * 0.7)), add(b, mul(nr, -w * 0.3)), add(a, mul(nr, -w * 0.6))].map(q => [q[0], q[1], 1]), 2.6);
      form([add(a, mul(nr, -w)), add(b, mul(nr, -w * 0.7)), add(b, mul(nr, w * 0.3)), add(a, mul(nr, w * 0.6))].map(q => [q[0], q[1], 1]), 2.6);
    }
    // Leather cord wrap & tapered hair brush tip at end of braid!
    form([[342, 466, 1], [364, 472, 1], [360, 488, 1], [338, 482, 1]], 2.4);
    hairLock([[350, 484, 28], [338, 524, 24], [322, 560, 10], [312, 582, 1]], 2.8, 1);

    // Visible viewer-left ear!
    form([[416, 206, 1], [398, 214], [402, 248], [422, 254, 1]], 2.8);
    openInk([[412, 218], [404, 226], [412, 240]], 1.3, { taper: [0.35, 0.45] });

    // Sculpted 3/4 Anime Head turned sharply viewer-right (looking toward her bow & the hunt!)
    form([
      [476, 104], [526, 126], [546, 178], [552, 216], // forehead -> far right cheek!
      [548, 244], [534, 272], [506, 294, 1],          // delicate cheek -> sharp V-chin!
      [456, 280], [426, 254, 1], [418, 206], [428, 140]
    ], 3.4, { lightMod: 0.44 });

    // --- DETERMINED, CALM, READY-TO-HUNT ANIME EYES (Looking right toward bow!) ---
    const drawEye = (cfg) => {
      if (isSil) return;
      const { eIn, eOut, ctr, eyeW, isFar, dir } = cfg;
      const ax = unit(sub(eOut, eIn)), up = mul(perp(ax), dir);
      const wing = add(eOut, add(mul(ax, eyeW * 0.24), mul(up, eyeW * 0.10)));

      // Sleek sharp determined upper lid (slightly lower/flatter arch -> calm focused intensity!)
      const uOut = bezier(
        add(eIn, add(mul(ax, -eyeW * 0.02), mul(up, eyeW * 0.02))),
        add(eIn, add(mul(ax, eyeW * 0.30), mul(up, eyeW * 0.28))),
        add(eOut, add(mul(ax, -eyeW * 0.12), mul(up, eyeW * 0.24))),
        wing, 24
      );
      const uIn = bezier(
        add(eIn, mul(up, -eyeW * 0.02)),
        add(eIn, add(mul(ax, eyeW * 0.30), mul(up, eyeW * 0.12))),
        add(eOut, add(mul(ax, -eyeW * 0.18), mul(up, eyeW * 0.10))),
        add(eOut, mul(up, -eyeW * 0.02)), 24
      );
      const lCur = bezier(
        add(eOut, mul(up, -eyeW * 0.03)),
        add(eOut, add(mul(ax, -eyeW * 0.26), mul(up, -eyeW * 0.15))),
        add(eIn, add(mul(ax, eyeW * 0.26), mul(up, -eyeW * 0.14))),
        eIn, 20
      );
      const ap = [...uIn, ...lCur];
      g.save();
      g.beginPath(); g.moveTo(ap[0][0], ap[0][1]);
      for (let i = 1; i < ap.length; i++) g.lineTo(ap[i][0], ap[i][1]);
      g.closePath(); g.fillStyle = PAPER; g.fill(); g.clip();

      const rx = eyeW * (isFar ? 0.32 : 0.29), ry = eyeW * (isFar ? 0.36 : 0.33);
      const ang = Math.atan2(ax[1], ax[0]);
      g.save(); g.translate(ctr[0], ctr[1]); g.rotate(ang);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.lineWidth = 2.1; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.ellipse(0, -ry * 0.32, rx * 0.96, ry * 0.62, 0, 0, Math.PI * 2); g.fillStyle = "rgba(18,20,28,0.25)"; g.fill();
      g.beginPath(); g.ellipse(0, ry * 0.02, rx * 0.36, ry * 0.40, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      g.beginPath(); g.ellipse(-rx * 0.30, -ry * 0.26, rx * 0.24, ry * 0.18, -0.2, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill();
      g.restore(); g.restore();

      fillPoly(g, [...uOut, add(eOut, add(mul(ax, eyeW * 0.06), mul(up, -eyeW * 0.03))), ...uIn.slice().reverse()], INK, { smooth: false });
      openInk(lCur.slice(0, Math.floor(lCur.length * 0.78)), 1.6, { smooth: false, taper: [0.2, 0.65] });
      const cr = bezier(
        add(eIn, add(mul(ax, eyeW * 0.08), mul(up, eyeW * 0.20))),
        add(eIn, add(mul(ax, eyeW * 0.35), mul(up, eyeW * 0.36))),
        add(eOut, add(mul(ax, -eyeW * 0.14), mul(up, eyeW * 0.32))),
        add(eOut, add(mul(ax, -eyeW * 0.02), mul(up, eyeW * 0.16))), 18
      );
      openInk(cr, 1.2, { smooth: false, taper: [0.45, 0.55] });
    };
    // Near eye (viewer-left, wider, looking right!) & Far eye (viewer-right, foreshortened along face curve!)
    drawEye({ eIn: [498, 210], eOut: [452, 204], ctr: [478, 210], eyeW: 46, isFar: false, dir: 1 });
    drawEye({ eIn: [524, 208], eOut: [550, 202], ctr: [539, 207], eyeW: 28, isFar: true, dir: -1 });

    // Focused, slightly knitted determined eyebrows (from ref-outfit-face left!)
    const drawBrows = (alpha = 1) => {
      if (isSil) return;
      openInk([[450, 188], [478, 186], [502, 194]], 2.8, { taper: [0.4, 0.2], alpha });
      openInk([[522, 194], [538, 186], [552, 188]], 2.4, { taper: [0.2, 0.45], alpha });
    };
    drawBrows(1);

    // Sculpted anime nose & firm calm determined mouth (NO goofy smile!)
    openInk([[518, 224], [528, 240, 1], [520, 244]], 1.8, { taper: [0.45, 0.55] });
    openInk([[494, 262], [516, 263], [532, 259]], 2.0, { taper: [0.25, 0.3] });
    openInk([[506, 272], [518, 273]], 1.3, { taper: [0.45, 0.45] });

    // --- MESSY WIND-SWEPT PRACTICAL HAIR (sweeping back-left into low braid + loose strands!) ---
    // Back upper bun/gather & windswept side strands
    hairLock([[432, 140, 44], [394, 118, 34], [362, 134, 14], [344, 162, 1]], 3.0, 0);
    // Sculpted tousled crown volume (broken silhouette!)
    form([
      [406, 206, 1], [400, 152], [430, 108, 1], [472, 92], [514, 98, 1],
      [548, 124], [562, 168, 1], [548, 194, 1], [496, 154, 1], [432, 168, 1]
    ], 3.8);
    // Sweeping face-framing locks (natural windswept movement, parting around eyes!)
    hairLock([[464, 114, 42], [428, 164, 42], [414, 226, 30], [434, 282, 12], [452, 310, 1]], 3.2, 1);
    hairLock([[486, 110, 38], [462, 158, 34], [442, 204, 18], [430, 232, 1]], 2.8, 1);
    hairLock([[504, 112, 32], [512, 156, 28], [506, 196, 12], [498, 214, 1]], 2.6, 0);
    hairLock([[528, 122, 34], [552, 162, 28], [564, 204, 12], [554, 236, 1]], 2.8, 0);
    // Fine energetic wind-blown stray wisps streaming left!
    hairLock([[412, 156, 14], [372, 154, 10], [336, 174, 5], [314, 198, 1]], 2.0, 0);
    hairLock([[404, 192, 14], [366, 216, 10], [342, 250, 5], [334, 276, 1]], 1.9, 0);
    drawBrows(0.5);

    g.restore();
  }

  // ---- High-res 2x -> 1x Master + 4-Panel Review + 300% Reference-vs-Drawing Crops! ----
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const renderHi = (mode) => {
    const hi = mk(W * 2, H * 2), hg = hi.getContext("2d");
    hg.scale(2, 2); drawHunter(hg, mode);
    const lo = mk(W, H), lg = lo.getContext("2d");
    lg.imageSmoothingQuality = "high"; lg.drawImage(hi, 0, 0, W, H);
    return lo;
  };

  const fullC = renderHi("rough");
  const silC  = renderHi("sil");
  const flipC = renderHi("flip");

  const pw = 420, ph = 630, gap = 8, hdr = 32;
  const rev = mk(pw * 4 + gap * 3, ph + hdr), rg = rev.getContext("2d");
  rg.fillStyle = "#dfe3ea"; rg.fillRect(0, 0, rev.width, rev.height);
  const titles = [
    "1. Hunter R1 (Reference-Grounded)",
    "2. Pure Silhouette (Readability)",
    "3. Horizontal Flip (Balance)",
    "4. Ref Pose (Astra) vs Target (visor)",
  ];
  for (let i = 0; i < 4; i++) {
    const x = i * (pw + gap);
    rg.fillStyle = "#181a22"; rg.fillRect(x, 0, pw, hdr);
    rg.fillStyle = "#ffffff"; rg.font = "600 13px -apple-system, sans-serif"; rg.textAlign = "center";
    rg.fillText(titles[i], x + pw / 2, 21);
  }
  rg.drawImage(fullC, 0, hdr, pw, ph);
  rg.drawImage(silC, pw + gap, hdr, pw, ph);
  rg.drawImage(flipC, (pw + gap) * 2, hdr, pw, ph);

  const x4 = (pw + gap) * 3;
  rg.fillStyle = "#ffffff"; rg.fillRect(x4, hdr, pw, ph);
  const imPose = new Image(), imVisor = new Image(), imHands = new Image(), imOutfit = new Image();
  await Promise.all([
    new Promise(r => { imPose.onload = r; imPose.src = "${refPoseUrl}"; }),
    new Promise(r => { imVisor.onload = r; imVisor.src = "${visorUrl}"; }),
    new Promise(r => { imHands.onload = r; imHands.src = "${refHandsUrl}"; }),
    new Promise(r => { imOutfit.onload = r; imOutfit.src = "${refOutfitUrl}"; }),
  ]);
  rg.drawImage(imPose, x4, hdr, pw / 2, ph / 2);
  rg.drawImage(imVisor, x4 + pw / 2, hdr, pw / 2, ph / 2);
  rg.drawImage(fullC, x4 + pw * 0.25, hdr + ph / 2, pw / 2, ph / 2);

  // 300% Close-Up Comparison Sheet: Face | Bow Grip Hand | Gloved Quiver Hand | Mantle & Clasp!
  const cw = 420, ch = 420;
  const cr = mk(cw * 4 + 18, ch), cg = cr.getContext("2d");
  cg.fillStyle = "#dfe3ea"; cg.fillRect(0, 0, cr.width, cr.height);
  const crop = (dx, cx, cy, box) => cg.drawImage(fullC, cx - box/2, cy - box/2, box, box, dx, 0, cw, ch);
  crop(0, 480, 200, 260);
  crop(cw + 6, 822, 540, 200);
  crop((cw + 6) * 2, 336, 725, 220);
  crop((cw + 6) * 3, 430, 500, 360);

  window.__res = {
    full: fullC.toDataURL("image/png"),
    review: rev.toDataURL("image/png"),
    crops: cr.toDataURL("image/png"),
  };
  })();</script></body></html>`

  await p.setContent(html)
  await p.waitForFunction(() => Boolean((window as unknown as { __res?: unknown }).__res))
  const res = await p.evaluate(() => (window as unknown as { __res: { full: string; review: string; crops: string } }).__res)
  await b.close()
  const save = (f: string, u: string) => writeFileSync(f, Buffer.from(u.split(",")[1]!, "base64"))
  save("exp/hunter/out/hunter-r1-full.png", res.full)
  save("exp/hunter/out/hunter-r1-review.png", res.review)
  save("exp/hunter/out/hunter-r1-crops.png", res.crops)
  console.log("Wrote hunter-r1-full.png, hunter-r1-review.png, hunter-r1-crops.png")
}
run()
