/**
 * Female Hunter ("Sylva") — Round 2: Sculpted Iterative Overhaul after Round 1 Critique!
 *
 * 6 Targeted Fixes from Round 1 300% crops & reference comparison:
 *  1. FACE, EYES, HAIR & BRAID: Bigger, sharper determined anime eyes (visor/tape polish!), crisp nose bridge/tip,
 *     clean jawline, organic flowing hair locks (ZERO helmet border cut, ZERO spider-leg wisps!),
 *     plump overlapping S-curve braid links instead of flat stacked trapezoids!
 *  2. SLIM-BUT-STRONG BOW ARM R: Real anatomical bone angles (sculpted deltoid -> taut upper arm -> crisp elbow ->
 *     angled forearm -> straight strong wrist), ZERO rubber-hose noodle bend!
 *  3. GLOVED QUIVER HAND L: Angled 3/4 leather archery glove resting organically on the hip quiver rim,
 *     rounded tapered curling fingers (studied directly from ref-hands.png right!).
 *  4. 3-LAYER CASCADING WOOL MANTLE: Built as 3 genuinely overlapping volumetric cloth layers rolling from
 *     the brass collarbone clasp (instead of 1 flat sheet with scratch lines!).
 *  5. SCULPTED BOOTS & ATHLETIC LEGS: Real arched instep, heel notch, lug sole, and 3/4 perspective on both boots!
 *  6. CLEANER COMPOSITION & WHITE SPACE: Single purposeful hip quiver (dropping redundant shoulder quiver) so the
 *     head, bare athletic bow-shoulder, and tall recurve bow breathe with crisp negative space!
 */
import { readFileSync, writeFileSync } from "node:fs"
import { chromium } from "playwright"
import { SKETCHER_LIB } from "../sketch/sketcher.ts"

const toUrl = (p: string, mime = "image/png") => `data:${mime};base64,${readFileSync(p).toString("base64")}`
const refPoseUrl = toUrl("exp/hunter/refs/ref-pose.png")
const refHandsUrl = toUrl("exp/hunter/refs/ref-hands.png")
const refOutfitUrl = toUrl("exp/hunter/refs/ref-outfit-face.png")
const visorUrl = toUrl("gallery/visor.jpg", "image/jpeg")

const run = async () => {
  const b = await chromium.launch()
  const p = await b.newPage()

  const html = `<!doctype html><html><body><script>(async () => {
  ${SKETCHER_LIB}

  const W = 1024, H = 1536;
  const INK = "#12131a";
  const PAPER = "#ffffff";

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

  function drawHunterR2(g, mode) {
    srand(2027);
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

    const hairLock = (ctrl, wOut = 3.0, inner = 1) => {
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

    const drawArrow = (x0, y0, x1, y1) => {
      const d = unit([x1 - x0, y1 - y0]), nr = perp(d);
      form([add([x0, y0], mul(nr, 3.0)), add([x1, y1], mul(nr, 3.0)), add([x1, y1], mul(nr, -3.0)), add([x0, y0], mul(nr, -3.0))].map(q => [q[0], q[1], 1]), 2.0);
      const fA = add([x1, y1], mul(d, -8)), fB = add([x1, y1], mul(d, -62));
      form([fA, add(fA, add(mul(d, -12), mul(nr, 12))), add(fB, mul(nr, 9)), fB].map(q => [q[0], q[1], 1]), 1.7);
      form([fA, add(fA, add(mul(d, -12), mul(nr, -12))), add(fB, mul(nr, -9)), fB].map(q => [q[0], q[1], 1]), 1.7);
      openInk([add(fA, mul(d, -22)), add(fA, add(mul(d, -28), mul(nr, 10)))], 0.9, { smooth: false });
      openInk([add(fA, mul(d, -40)), add(fA, add(mul(d, -46), mul(nr, 9)))], 0.9, { smooth: false });
    };

    // =========================================================================
    // LAYER 1: BACK CAPE UNDER-DRAPE (subtle trailing tail behind left leg!)
    // + WIND-SWEPT BACK HAIR TAIL (clean negative space behind right shoulder!)
    // =========================================================================
    form([
      [348, 412, 1], [292, 624], [254, 874, 1], [292, 974, 1], [356, 932, 1], [394, 760], [412, 540, 1]
    ], 4.2);
    wedge([[284, 872], [304, 960], [350, 926], [358, 846]]);
    // Subtle soft wind-swept hair mass behind upper-left head (replaces stiff spider wisps!)
    hairLock([[428, 166, 56], [368, 178, 52], [312, 224, 34], [274, 272, 1]], 3.2, 1);
    hairLock([[418, 212, 42], [362, 244, 36], [322, 294, 18], [300, 330, 1]], 2.8, 0);

    // =========================================================================
    // LAYER 2: SLIM-BUT-STRONG ATHLETIC LEGS & SCULPTED HUNTING BOOTS (from ref-pose!)
    // =========================================================================
    // --- Relaxed Bent Leg R (viewer-right, bent knee + lifted heel combat boot!) ---
    form([
      [482, 728, 1], [552, 718, 1], [614, 856], [662, 974], [674, 1022, 1],
      [648, 1112], [588, 1214], [546, 1268, 1], [496, 1242, 1],
      [536, 1138], [584, 1020, 1], [534, 916], [468, 796, 1]
    ], 4.4);
    // Crisp knee cap, thigh seam & inner-knee cloth compression folds!
    openInk([[584, 1020], [622, 1008], [652, 1018]], 2.2, { taper: [0.1, 0.7] });
    openInk([[584, 1020], [614, 1036], [642, 1054]], 1.8, { taper: [0.15, 0.72] });
    openInk([[656, 982], [626, 992], [608, 988]], 1.4, { taper: [0.4, 0.5] });
    openInk([[556, 760], [606, 876], [648, 972]], 1.3, { taper: [0.3, 0.35] }); // subtle trouser seam!

    // Sculpted Lifted Combat Boot R (distinct ankle cuff -> arched instep -> flexed toe -> notched heel!)
    form([
      [496, 1222, 1], [552, 1256, 1], [534, 1326], [516, 1364, 1], // ankle shaft & heel counter!
      [530, 1384, 1], [512, 1418, 1], [490, 1424, 1],              // distinct notched boot heel!
      [482, 1396, 1], [462, 1368],                                  // arched midfoot sole gap!
      [436, 1352, 1], [428, 1316], [442, 1286], [472, 1264]        // flexed rounded toe box & vamp!
    ], 4.0);
    // Thick lugged rubber sole following heel -> arch -> flexed toe!
    form([
      [434, 1344, 1], [462, 1368], [486, 1394, 1], [496, 1424, 1],
      [514, 1416, 1], [500, 1382, 1], [472, 1354], [444, 1330, 1]
    ], 3.0);
    // Boot ankle cuff strap, heel counter seam & laces!
    form([[494, 1222, 1], [554, 1256, 1], [546, 1274, 1], [486, 1240, 1]], 2.8);
    openInk([[472, 1264], [490, 1304], [520, 1336]], 1.8, { taper: [0.15, 0.4] });
    for (const t of [0.22, 0.44, 0.66, 0.86]) {
      const p0 = lerp2([492, 1244], [452, 1296], t);
      openInk([add(p0, [-7, -5]), add(p0, [13, 6])], 1.5, { smooth: false });
    }

    // --- Planted Weight-Bearing Leg L (strong athletic thigh -> sleek shin -> 3/4 planted boot!) ---
    form([
      [364, 712, 1], [344, 816], [350, 956], [362, 1034],
      [364, 1164], [374, 1272, 1], [430, 1272, 1],
      [444, 1146], [440, 1028], [462, 894], [476, 782, 1], [488, 728, 1]
    ], 4.4);
    openInk([[366, 1028], [398, 1042], [432, 1030]], 1.8, { taper: [0.35, 0.45] });
    openInk([[382, 1004], [412, 1010]], 1.4, { taper: [0.45, 0.45] });
    openInk([[376, 1228], [404, 1240], [428, 1230]], 1.8, { taper: [0.3, 0.35] }); // trouser cuff bunch over boot!
    // Thigh leather strap with brass buckle
    form([[344, 868, 1], [404, 882], [464, 868, 1], [462, 888, 1], [404, 902], [346, 888, 1]], 2.8);
    form([[376, 872, 1], [402, 874, 1], [400, 898, 1], [374, 896, 1]], 2.2);

    // Sculpted 3/4 Planted Combat Boot L (contoured toe box, outer heel profile, lug sole, laced tongue!)
    form([
      [372, 1258, 1], [432, 1258, 1], [436, 1334], [448, 1396],
      [448, 1438, 1], [426, 1454], [374, 1452], [358, 1434, 1],
      [360, 1396], [368, 1336]
    ], 4.0);
    // Lugged tread sole + reinforced leather toe cap + boot cuff!
    form([[358, 1424, 1], [398, 1432], [448, 1422, 1], [446, 1444, 1], [398, 1456], [360, 1442, 1]], 3.2);
    form([[370, 1256, 1], [434, 1256, 1], [434, 1276, 1], [370, 1276, 1]], 2.8);
    openInk([[364, 1394], [402, 1384], [442, 1394]], 2.0); // stitched toe cap seam!
    openInk([[388, 1276], [386, 1384]], 1.6); openInk([[418, 1276], [420, 1384]], 1.6);
    for (const y of [1294, 1314, 1334, 1354, 1374]) openInk([[388, y], [418, y]], 1.5, { smooth: false });

    // =========================================================================
    // LAYER 3: HIP QUIVER + FEATHERED ARROWS (single purposeful quiver on left hip!)
    // =========================================================================
    // Arrows fanning cleanly behind her left hip/mantle edge!
    drawArrow(316, 706, 258, 578);
    drawArrow(328, 700, 286, 566);
    drawArrow(340, 698, 314, 564);
    drawArrow(348, 700, 338, 574);
    // Angled leather hip quiver body & stitched cuff rim!
    form([[298, 696, 1], [354, 688, 1], [378, 956, 1], [336, 964, 1]], 3.8);
    form([[294, 690, 1], [358, 682, 1], [362, 712, 1], [298, 720, 1]], 3.2);
    openInk([[318, 722], [348, 952]], 1.6, { taper: [0.1, 0.1] });
    // Quiver strap looping diagonally across hip!
    form([[302, 744, 1], [358, 736, 1], [362, 758, 1], [306, 766, 1]], 2.6);

    // =========================================================================
    // LAYER 4: SLIM-STRONG TORSO, ANATOMICAL BOW-ARM R & SPLIT-HEM TUNIC
    // =========================================================================
    // Neck + sculpted deltoid + CRISP ANATOMICAL BOW-ARM R (straight bone angles, NOT a wet noodle!)
    form([
      [446, 266, 1], [442, 344], [384, 384, 1], [362, 466], [392, 628],
      [544, 626], [568, 492], [584, 412, 1],
      // Underside of bow-arm R: crisp bicep-to-elbow corner -> strong tapered forearm!
      [604, 424], [656, 502, 1], [678, 524, 1], [744, 548], [790, 558, 1],
      // Top of bow-arm R: strong rounded deltoid cap -> taut tricep/bicep -> crisp forearm extensor!
      [796, 524, 1], [742, 504], [692, 476, 1], [652, 414], [626, 372], [576, 356, 1],
      [516, 336], [508, 262, 1]
    ], 4.2);
    // Deep occlusion wedge right under sculpted anime jawline!
    wedge([[444, 270], [496, 290], [520, 274], [512, 314], [468, 326], [444, 302]]);
    // Slim-strong anatomical muscle hints (sternocleidomastoid, clavicle, deltoid insertion, elbow fossa!)
    openInk([[456, 294], [488, 362]], 1.6, { taper: [0.4, 0.55] });
    openInk([[494, 364], [546, 358], [586, 366]], 1.9, { taper: [0.4, 0.5] });
    openInk([[602, 392], [638, 422], [654, 456]], 1.6, { taper: [0.45, 0.55] }); // crisp deltoid cut!
    openInk([[666, 488], [688, 496]], 1.4, { taper: [0.4, 0.4] });               // inner elbow crease!
    openInk([[692, 494], [736, 514]], 1.3, { taper: [0.45, 0.55] });             // strong forearm ridge!

    // Laced Leather Archery Bracer on forearm R (sculpted taper following forearm bones!)
    form([[696, 482, 1], [774, 516, 1], [764, 558, 1], [682, 526, 1]], 3.4);
    openInk([[702, 494], [768, 524]], 1.4, { smooth: false });
    openInk([[694, 516], [760, 546]], 1.4, { smooth: false });
    for (const [bx, by] of [[708, 536], [738, 548]]) {
      form([[bx - 6, by - 5, 1], [bx + 6, by - 2, 1], [bx + 4, by + 7, 1], [bx - 8, by + 4, 1]], 1.8);
    }

    // Fitted Sleeveless Split-Hem Hunting Tunic (from ref-outfit-face right!)
    form([
      [428, 362, 1], [546, 354, 1], [576, 408], [584, 488], [556, 588],
      [554, 654, 1], [588, 782, 1], [526, 796, 1], [504, 704, 1],
      [488, 804, 1], [412, 796, 1], [416, 696, 1],
      [388, 784, 1], [342, 766, 1], [378, 636], [398, 554], [386, 444]
    ], 4.2);
    openInk([[438, 376], [492, 412], [544, 368]], 2.2);
    openInk([[418, 786], [482, 792]], 1.6);
    openInk([[530, 784], [580, 774]], 1.6);
    openInk([[424, 496], [482, 522], [556, 512]], 2.2, { taper: [0.4, 0.35] });
    openInk([[406, 566], [472, 578], [546, 564]], 1.8, { taper: [0.3, 0.55] });
    openInk([[410, 594], [484, 604], [544, 592]], 1.6, { taper: [0.3, 0.6] });
    for (const y of [474, 502, 530, 558]) {
      openInk([[542, y], [558, y + 12]], 1.4, { smooth: false });
      openInk([[558, y], [542, y + 12]], 1.4, { smooth: false });
    }

    // Crossbody Leather Quiver Strap (wraps over bust from collarbone clasp -> left hip!)
    form([[524, 376, 1], [546, 384, 1], [476, 534], [392, 646, 1], [372, 634, 1], [456, 520]], 3.4);
    form([[476, 464, 1], [506, 478, 1], [494, 502, 1], [464, 488, 1]], 2.8);

    // Sculpted Utility Belt + Brass Buckle + Leather Pouch + Antler Knife!
    form([[372, 622, 1], [466, 638], [558, 626, 1], [562, 660, 1], [466, 672], [368, 656, 1]], 3.8);
    form([[468, 632, 1], [508, 632, 1], [508, 672, 1], [468, 672, 1]], 3.2);
    form([[478, 642, 1], [498, 642, 1], [498, 662, 1], [478, 662, 1]], 1.8);
    form([[450, 666, 1], [466, 666, 1], [458, 766, 1], [442, 756, 1]], 2.8);
    form([[528, 628, 1], [546, 626, 1], [550, 666, 1], [532, 668, 1]], 2.6);
    form([[522, 666, 1], [554, 664, 1], [550, 774, 1], [536, 796, 1], [520, 768, 1]], 3.0);
    form([[372, 658, 1], [434, 664, 1], [430, 742, 1], [366, 736, 1]], 3.2);
    form([[368, 652, 1], [438, 658, 1], [434, 702, 1], [402, 712], [364, 698, 1]], 3.0);
    form([[394, 698, 1], [410, 700, 1], [408, 724, 1], [392, 722, 1]], 2.2);

    // =========================================================================
    // LAYER 5: SCULPTED RECURVE BOW + TRUE 3D-INTERLOCKING BOW GRIP!
    // =========================================================================
    openInk([[822, 72], [790, 1114]], 1.7, { smooth: false, taper: [0, 0] });
    const bowOuter = [
      [822, 72, 1], [810, 112], [848, 224], [872, 344], [866, 444, 1],
      [842, 496, 1], [842, 594, 1],
      [866, 658, 1], [870, 776], [834, 938], [786, 1068], [790, 1114, 1]
    ];
    const bowInner = [
      [822, 72, 1], [802, 114], [836, 226], [854, 344], [844, 444, 1],
      [818, 498, 1], [818, 594, 1],
      [842, 658, 1], [850, 776], [818, 938], [774, 1068], [790, 1114, 1]
    ];
    form([...bowOuter, ...bowInner.slice().reverse()], 3.6);
    for (const y of [498, 512, 578, 592]) openInk([[818, y], [842, y - 6]], 1.8, { smooth: false });
    openInk([[812, 126], [844, 226], [862, 344], [856, 442]], 1.4, { taper: [0.3, 0.2] });
    openInk([[854, 660], [860, 776], [826, 938], [782, 1060]], 1.4, { taper: [0.2, 0.3] });

    // 3D-Interlocking Bow Grip Hand (refined knuckle planes + curved opposing thumb!)
    form([[776, 522, 1], [818, 514], [824, 574], [782, 566, 1]], 3.4);
    const gripFinger = (y0, y1, xRight, xLeft) => {
      form([
        [xLeft, y0 + 2], [xRight - 6, y0], [xRight, (y0 + y1) * 0.5],
        [xRight - 5, y1], [xLeft, y1 - 1], [xLeft - 4, (y0 + y1) * 0.5]
      ], 2.8);
      openInk([[xRight - 14, y0 + 2], [xRight - 13, y1 - 2]], 1.3, { taper: [0.3, 0.3] });
    };
    gripFinger(518, 534, 856, 816);
    gripFinger(533, 549, 858, 816);
    gripFinger(548, 563, 855, 816);
    gripFinger(562, 575, 849, 818);
    wedge([[812, 533], [822, 534], [818, 538]]);
    wedge([[812, 548], [822, 549], [818, 553]]);
    form([[784, 524, 1], [806, 502], [834, 500], [850, 510], [846, 524], [822, 524], [802, 538, 1]], 3.2);
    openInk([[822, 504], [824, 520]], 1.3, { taper: [0.35, 0.35] });

    // =========================================================================
    // LAYER 6: 3-LAYER VOLUMETRIC WOOL MANTLE (studied directly from ref-outfit-face right!)
    // Built as 3 genuinely overlapping 3D fabric rolls radiating from the brass collarbone clasp!
    // =========================================================================
    // Mantle Layer A (lowest hanging outer cape hem!)
    form([
      [446, 368, 1], [352, 382], [298, 456], [268, 554], [250, 654, 1],
      [292, 682, 1], [322, 626, 1], [362, 646, 1], [398, 564], [434, 464, 1]
    ], 4.4);
    wedge([[280, 654], [294, 676], [322, 624], [308, 594]]);
    openInk([[378, 418], [312, 516], [274, 648]], 2.4, { taper: [0.15, 0.55] });

    // Mantle Layer B (mid cascading diagonal drape sweeping OVER Layer A!)
    form([
      [526, 366, 1], [442, 360], [364, 396], [318, 488], [298, 588, 1],
      [338, 616, 1], [374, 556, 1], [418, 476], [478, 416], [528, 386, 1]
    ], 4.2);
    wedge([[304, 586], [336, 612], [358, 572], [334, 548]]);
    openInk([[518, 376], [446, 392], [376, 458], [334, 568]], 2.4, { taper: [0.08, 0.5] });

    // Mantle Layer C (thick plush shoulder-roll collar wrapping OVER top into the brass ring clasp!)
    form([
      [536, 352, 1], [474, 336], [406, 342], [356, 374], [332, 424, 1],
      [374, 416], [438, 392], [526, 378, 1]
    ], 4.0);
    openInk([[522, 364], [452, 358], [386, 376], [348, 408]], 2.0, { taper: [0.1, 0.6] });

    // Brass Ring Clasp anchoring all 3 mantle folds right at the collarbone!
    if (!isSil) {
      g.save();
      g.beginPath(); g.arc(532, 372, 16, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill(); g.lineWidth = 3.6; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(532, 372, 9.5, 0, Math.PI * 2); g.lineWidth = 2.4; g.stroke();
      g.restore();
    }
    form([[522, 352, 1], [552, 350, 1], [554, 372, 1], [526, 374, 1]], 2.8);

    // =========================================================================
    // LAYER 7: VIEWER-LEFT FOREARM & ORGANIC 3/4 GLOVED QUIVER HAND (from ref-hands right!)
    // =========================================================================
    form([[296, 594, 1], [334, 608, 1], [344, 668, 1], [306, 664, 1]], 3.6);
    // Angled 3/4 Fingerless Leather Archery Glove resting cleanly on quiver rim!
    form([
      [304, 662, 1], [346, 666, 1], [362, 706], [352, 728, 1],
      [314, 728, 1], [298, 706]
    ], 3.4);
    form([[302, 658, 1], [348, 664, 1], [346, 680, 1], [300, 674, 1]], 2.6);
    if (!isSil) {
      g.beginPath(); g.arc(338, 672, 3.8, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    }
    openInk([[312, 682], [334, 702], [352, 714]], 1.4);
    // 4 Organically Curved, Tapered Bare Fingers emerging from glove & curling gently over quiver!
    const organicFinger = (pts) => {
      form(pts, 2.4);
      const mid = pts[1];
      openInk([add(mid, [-4, 1]), add(mid, [4, 0])], 1.1, { taper: [0.4, 0.4] });
    };
    // Pinky -> Ring -> Middle -> Index (rounded organic fingertips, subtle inward curl!)
    organicFinger([[302, 710, 1], [298, 738], [304, 758], [312, 756], [312, 734], [314, 718, 1]]);
    organicFinger([[314, 718, 1], [312, 752], [320, 778], [329, 774], [326, 748], [326, 722, 1]]);
    organicFinger([[326, 720, 1], [326, 758], [336, 786], [346, 782], [342, 752], [340, 722, 1]]);
    organicFinger([[340, 716, 1], [346, 748], [356, 770], [364, 764], [358, 740], [354, 712, 1]]);

    // =========================================================================
    // LAYER 8: FOCAL POINT — EXPRESSIVE ANIME FACE, CLEAN HAIR & ORGANIC BRAID!
    // =========================================================================
    // Plump, rounded overlapping S-curve braid links spilling over her left shoulder!
    const braidCenters = [[416, 294], [398, 336], [382, 378], [366, 422], [354, 464]];
    for (let i = 0; i < braidCenters.length - 1; i++) {
      const a = braidCenters[i], b = braidCenters[i + 1];
      const mid = lerp2(a, b, 0.5), d = unit(sub(b, a)), nr = perp(d), r = 20 - i * 2.2;
      // Left plump woven braid pillow
      form([add(a, mul(nr, r * 0.2)), add(mid, mul(nr, r * 1.1)), add(b, mul(nr, r * 0.6)), add(b, mul(nr, -r * 0.3)), add(mid, mul(nr, -r * 0.2))], 2.6);
      // Right overlapping woven braid pillow
      form([add(a, mul(nr, -r * 0.3)), add(mid, mul(nr, -r * 1.05)), add(b, mul(nr, -r * 0.5)), add(b, mul(nr, r * 0.3)), add(mid, mul(nr, r * 0.2))], 2.6);
    }
    form([[344, 456, 1], [366, 462, 1], [362, 478, 1], [340, 472, 1]], 2.4);
    hairLock([[352, 474, 28], [338, 518, 24], [322, 558, 10], [310, 582, 1]], 2.8, 1);

    // Viewer-left ear
    form([[416, 206, 1], [398, 214], [402, 248], [422, 254, 1]], 2.8);
    openInk([[412, 218], [404, 226], [412, 240]], 1.3, { taper: [0.35, 0.45] });

    // Sculpted 3/4 Anime Head (sleeker jaw, refined far cheekbone inflection, crisp pointed chin!)
    form([
      [476, 102], [528, 124], [548, 178], [552, 214],
      [548, 242], [532, 272], [504, 296, 1],
      [454, 282], [424, 254, 1], [416, 206], [428, 138]
    ], 3.4, { lightMod: 0.44 });

    // --- SHARP, EXPRESSIVE, DETERMINED MODERN ANIME EYES (visor/tape quality!) ---
    const drawEye = (cfg) => {
      if (isSil) return;
      const { eIn, eOut, ctr, eyeW, isFar, dir } = cfg;
      const ax = unit(sub(eOut, eIn)), up = mul(perp(ax), dir);
      const wing = add(eOut, add(mul(ax, eyeW * 0.28), mul(up, eyeW * 0.14)));

      const uOut = bezier(
        add(eIn, add(mul(ax, -eyeW * 0.02), mul(up, eyeW * 0.04))),
        add(eIn, add(mul(ax, eyeW * 0.28), mul(up, eyeW * 0.36))),
        add(eOut, add(mul(ax, -eyeW * 0.10), mul(up, eyeW * 0.30))),
        wing, 26
      );
      const uIn = bezier(
        add(eIn, mul(up, -eyeW * 0.01)),
        add(eIn, add(mul(ax, eyeW * 0.30), mul(up, eyeW * 0.18))),
        add(eOut, add(mul(ax, -eyeW * 0.18), mul(up, eyeW * 0.14))),
        add(eOut, mul(up, -eyeW * 0.02)), 26
      );
      const lCur = bezier(
        add(eOut, mul(up, -eyeW * 0.04)),
        add(eOut, add(mul(ax, -eyeW * 0.26), mul(up, -eyeW * 0.20))),
        add(eIn, add(mul(ax, eyeW * 0.26), mul(up, -eyeW * 0.18))),
        eIn, 22
      );
      const ap = [...uIn, ...lCur];
      g.save();
      g.beginPath(); g.moveTo(ap[0][0], ap[0][1]);
      for (let i = 1; i < ap.length; i++) g.lineTo(ap[i][0], ap[i][1]);
      g.closePath(); g.fillStyle = PAPER; g.fill(); g.clip();

      const rx = eyeW * (isFar ? 0.32 : 0.30), ry = eyeW * (isFar ? 0.38 : 0.36);
      const ang = Math.atan2(ax[1], ax[0]);
      g.save(); g.translate(ctr[0], ctr[1]); g.rotate(ang);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.ellipse(0, -ry * 0.34, rx * 0.96, ry * 0.62, 0, 0, Math.PI * 2); g.fillStyle = "rgba(18,20,28,0.24)"; g.fill();
      g.beginPath(); g.ellipse(0, ry * 0.02, rx * 0.36, ry * 0.40, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      g.beginPath(); g.ellipse(0, ry * 0.06, rx * 0.66, ry * 0.64, 0, 0.25, Math.PI - 0.25); g.lineWidth = 1.3; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.ellipse(-rx * 0.30, -ry * 0.26, rx * 0.26, ry * 0.20, -0.2, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill();
      g.beginPath(); g.arc(rx * 0.30, ry * 0.26, rx * 0.11, 0, Math.PI * 2); g.fill();
      g.restore(); g.restore();

      fillPoly(g, [...uOut, add(eOut, add(mul(ax, eyeW * 0.08), mul(up, -eyeW * 0.04))), ...uIn.slice().reverse()], INK, { smooth: false });
      const tb = uOut[Math.floor(uOut.length * 0.76)];
      openInk([tb, add(tb, add(mul(ax, eyeW * 0.22), mul(up, eyeW * 0.14)))], 1.8, { taper: [0.1, 0.9] });
      openInk(lCur.slice(0, Math.floor(lCur.length * 0.78)), 1.7, { smooth: false, taper: [0.2, 0.65] });
      const cr = bezier(
        add(eIn, add(mul(ax, eyeW * 0.08), mul(up, eyeW * 0.24))),
        add(eIn, add(mul(ax, eyeW * 0.35), mul(up, eyeW * 0.42))),
        add(eOut, add(mul(ax, -eyeW * 0.14), mul(up, eyeW * 0.36))),
        add(eOut, add(mul(ax, -eyeW * 0.02), mul(up, eyeW * 0.18))), 18
      );
      openInk(cr, 1.3, { smooth: false, taper: [0.45, 0.55] });
    };
    drawEye({ eIn: [498, 210], eOut: [448, 203], ctr: [477, 210], eyeW: 50, isFar: false, dir: 1 });
    drawEye({ eIn: [522, 208], eOut: [552, 201], ctr: [539, 207], eyeW: 31, isFar: true, dir: -1 });

    // Focused determined brows!
    const drawBrows = (alpha = 1) => {
      if (isSil) return;
      openInk([[446, 184], [478, 182], [502, 192]], 2.9, { taper: [0.4, 0.2], alpha });
      openInk([[522, 192], [538, 182], [554, 184]], 2.5, { taper: [0.2, 0.45], alpha });
    };
    drawBrows(1);

    // Crisp anime nose bridge + sharp tip + calm determined lips!
    openInk([[518, 218], [527, 238, 1], [518, 244]], 2.0, { taper: [0.5, 0.55] });
    openInk([[494, 262], [516, 264], [532, 259]], 2.1, { taper: [0.25, 0.3] });
    openInk([[506, 273], [519, 274]], 1.3, { taper: [0.45, 0.45] });

    // --- ORGANIC LAYERED HAIR (NO black crown cut line across forehead!) ---
    // White-filled crown base + outer crown silhouette ONLY (open bottom so bangs flow seamlessly out of scalp!)
    const crownPoly = mixedPath([
      [404, 208], [398, 148], [430, 102], [476, 86], [524, 96], [556, 128], [566, 174], [548, 200], [496, 166], [426, 184]
    ], 10, true);
    fillPoly(g, crownPoly, colFill, { smooth: false });
    if (!isSil) openInk([[404, 208], [398, 148], [430, 102], [476, 86], [524, 96], [556, 128], [566, 174]], 3.8, { taper: [0.15, 0.15] });
    // Sweeping overlapping hair locks radiating seamlessly from parting!
    hairLock([[466, 112, 46], [426, 164, 46], [412, 228, 32], [432, 286, 14], [452, 316, 1]], 3.2, 1);
    hairLock([[486, 106, 40], [460, 158, 36], [438, 204, 18], [426, 234, 1]], 2.8, 1);
    hairLock([[504, 108, 34], [514, 156, 28], [508, 198, 12], [500, 220, 1]], 2.6, 0);
    hairLock([[530, 118, 36], [554, 160, 28], [566, 204, 12], [556, 238, 1]], 2.8, 0);
    // Subtle soft flyaway curls around cheek & crown (NO rigid spider legs!)
    hairLock([[474, 94, 16], [444, 72, 12], [414, 76, 6], [394, 92, 1]], 2.2, 0);
    hairLock([[552, 196, 12], [568, 228, 8], [562, 256, 4], [550, 272, 1]], 1.8, 0);
    drawBrows(0.5);

    g.restore();
  }

  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const renderHi = (mode) => {
    const hi = mk(W * 2, H * 2), hg = hi.getContext("2d");
    hg.scale(2, 2); drawHunterR2(hg, mode);
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
    "1. Hunter R2 (Refined From Refs)",
    "2. Pure Silhouette (Clean Negative Space)",
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
  const imPose = new Image(), imVisor = new Image();
  await Promise.all([
    new Promise(r => { imPose.onload = r; imPose.src = "${refPoseUrl}"; }),
    new Promise(r => { imVisor.onload = r; imVisor.src = "${visorUrl}"; }),
  ]);
  rg.drawImage(imPose, x4, hdr, pw / 2, ph / 2);
  rg.drawImage(imVisor, x4 + pw / 2, hdr, pw / 2, ph / 2);
  rg.drawImage(fullC, x4 + pw * 0.25, hdr + ph / 2, pw / 2, ph / 2);

  // 300% Close-Up Sheet: Face | Bow Grip Hand | Gloved Quiver Hand | 3-Layer Mantle & Braid!
  const cw = 420, ch = 420;
  const cr = mk(cw * 4 + 18, ch), cg = cr.getContext("2d");
  cg.fillStyle = "#dfe3ea"; cg.fillRect(0, 0, cr.width, cr.height);
  const crop = (dx, cx, cy, box) => cg.drawImage(fullC, cx - box/2, cy - box/2, box, box, dx, 0, cw, ch);
  crop(0, 480, 198, 250);
  crop(cw + 6, 822, 540, 200);
  crop((cw + 6) * 2, 336, 725, 220);
  crop((cw + 6) * 3, 415, 495, 360);

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
  save("exp/hunter/out/hunter-r2-full.png", res.full)
  save("exp/hunter/out/hunter-r2-review.png", res.review)
  save("exp/hunter/out/hunter-r2-crops.png", res.crops)
  console.log("Wrote hunter-r2-full.png, hunter-r2-review.png, hunter-r2-crops.png")
}
run()
