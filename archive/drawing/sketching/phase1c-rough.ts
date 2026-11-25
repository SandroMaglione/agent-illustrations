/**
 * Phase 1C (Round 2): Brutal Iterative Overhaul of "Kestrel" after Round 1 Visual Critique!
 *
 * 6 Surgical Fixes applied from Round 1 crops & reference lineup (vs visor & tape):
 *  1. ANIME HANDS: Replace cartoon mittens with long, slender, angular, bone-structured fingers (finger len ≈ palm len),
 *     crisp knuckle bends, tapered tips, and clean negative-space gaps between fingers!
 *  2. ANIME FACE & EYES: Sharper sculpted V-jaw + delicate cheekbone S-curve (no chubby bowl chin!),
 *     locked eye gaze, sleek modern game-art eye blades, refined confident grin, curved 3D-wrapped forehead goggles!
 *  3. BROKEN HAIR SILHOUETTE: Ditch the smooth plastic helmet! Carve the crown & sides with sharp overlapping
 *     angular wolf-cut locks, V-notches, secondary sub-strands, and tapered flyaway wisps!
 *  4. ANGULAR STRAIGHT-VS-CURVE CLOTHING (CSI!): Replace balloon-rounded Catmull sleeves/lanyard with
 *     crisp angular cloth silhouettes (sharp fold corners, straight tension edges vs curved gravity bulges, wrapped cuffs!).
 *  5. NATURAL ATHLETIC MIDRIFF & WRAPPED TOP HEM: Less rubber-hourglass pinch, real cylindrical hem wrap + tension folds!
 *  6. SHARP HARDWARE & PROP CRAFT: Wrapped grip bands on wrench-baton, hinged forehead goggles, crisp belt buckle & pouch depth!
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
  const INK = "#14161e";
  const PAPER = "#ffffff";

  /**
   * Corner-aware smooth path! Points ending with a 3rd truthy flag [x, y, 1] are SHARP CORNERS!
   * This is the #1 secret to anime cloth & hair: mixing razor-sharp fold corners with sweeping smooth curves!
   */
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
        const s = r.length > 2 ? catmull(r, per, false) : catmull(r, Math.max(4, per >> 1), false);
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

  function drawKestrelR2(g, mode) {
    srand(1212);
    const isSil = mode === "sil";
    g.save();
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, W, H);
    if (mode === "flip") { g.translate(W, 0); g.scale(-1, 1); }

    const colFill = isSil ? INK : PAPER;

    // Corner-aware masked shape (mixes crisp cloth/hair corners with sweeping smooth curves!)
    const form = (knots, w = 4.6, o = {}) => {
      const poly = mixedPath(knots, o.per ?? 10, true);
      fillPoly(g, poly, isSil ? INK : (o.fill ?? colFill), { smooth: false });
      if (!isSil) taperStroke(g, poly, w, { closed: true, smooth: false, color: INK, lightMod: o.lightMod ?? 0.38 });
    };
    const stroke = (knots, w = 2.4, o = {}) => {
      if (isSil) return;
      const poly = o.smooth === false ? knots.map(k => [k[0], k[1]]) : mixedPath(knots, o.per ?? 10, false);
      taperStroke(g, poly, w, { smooth: false, color: INK, ...o });
    };
    const wedge = (pts) => fillPoly(g, pts, INK, { smooth: false });

    // Sharp sweeping anime hair lock (S-curve with razor tip + optional forked sub-notch!)
    const hairLock = (ctrl, wOut = 4.0, inner = 1) => {
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
        taperStroke(g, Ls, wOut, { smooth: false, taper: [0.05, 0.48], minTip: 1.4, lightMod: 0.38 });
        taperStroke(g, Rs, wOut * 0.9, { smooth: false, taper: [0.05, 0.48], minTip: 1.4, lightMod: 0.38 });
        if (inner > 0) {
          const st = Array.from({ length: n }, (_, i) => lerp2(cPts[i], Ls[i], 0.36));
          taperStroke(g, st.slice(Math.floor(n * 0.14), Math.floor(n * 0.86)), 1.4, { smooth: false, taper: [0.42, 0.50], minTip: 0.1, lightMod: 0.1 });
        }
      }
    };

    // =========================================================================
    // LAYER 1: BACK HAIR (MULTI-TIER HIGH PONYTAIL + ANGULAR WOLF-CUT FLIPS!)
    // Big -> Medium -> Small rhythm + crisp flyaways!
    // =========================================================================
    // Lower streaming ponytail tail
    hairLock([[436, 206, 82], [330, 198, 90], [220, 248, 62], [148, 308, 1]], 4.8, 1);
    // Hero high ponytail arch (sweeps boldly left-up to balance wrench high-right!)
    hairLock([[448, 184, 96], [344, 108, 114], [212, 120, 86], [116, 186, 1]], 5.4, 1);
    // Medium split sub-lock carving sharp negative-space V-notch!
    hairLock([[372, 154, 52], [262, 168, 54], [178, 222, 28], [136, 258, 1]], 3.6, 1);
    // Fine energetic flyaway strands above & below ponytail!
    hairLock([[410, 148, 20], [322, 86, 18], [234, 84, 9], [176, 110, 1]], 2.5, 0);
    hairLock([[338, 222, 24], [264, 266, 18], [216, 314, 8], [192, 344, 1]], 2.4, 0);
    // Ponytail hair tie / mechanical clip behind upper-left crown!
    form([[424, 166, 1], [452, 152, 1], [468, 194, 1], [438, 210, 1]], 3.6);
    // Choppy nape wolf-cut flips behind neck (asymmetric!)
    hairLock([[444, 342, 58], [392, 396, 48], [344, 424, 20], [312, 418, 1]], 3.8, 1);
    hairLock([[456, 368, 36], [418, 426, 26], [386, 456, 10], [368, 464, 1]], 3.0, 0);
    hairLock([[552, 354, 54], [596, 408, 44], [634, 434, 18], [658, 424, 1]], 3.6, 1);

    // =========================================================================
    // LAYER 2: HARD-SURFACE ANTENNA-WRENCH BATON (CRISP STRAIGHT RULER!)
    // =========================================================================
    const batonLow = [142, 720], batonHi = [894, 288];
    const bDir = unit(sub(batonHi, batonLow)), bN = perp(bDir);
    const bPt = (s, n) => add(batonLow, add(mul(bDir, s), mul(bN, n)));
    const bLen = dist(batonLow, batonHi);

    form([bPt(0, 14, 1), bPt(bLen, 16, 1), bPt(bLen, -16, 1), bPt(0, -14, 1)].map(p => [p[0], p[1], 1]), 4.6);
    stroke([bPt(34, -5), bPt(bLen - 34, -6)], 1.5, { smooth: false });
    // Diagonal grip tape wraps near both grip zones!
    for (const s0 of [68, 86, 104, 122, 650, 668, 686]) {
      stroke([bPt(s0, 14), bPt(s0 + 12, -14)], 1.8, { smooth: false });
    }
    // Reinforced collar clamps along shaft
    for (const s0 of [140, 614, 742]) {
      form([bPt(s0, 20), bPt(s0 + 34, 20), bPt(s0 + 34, -20), bPt(s0, -20)].map(p => [p[0], p[1], 1]), 3.4);
      stroke([bPt(s0 + 11, 19), bPt(s0 + 11, -19)], 1.7, { smooth: false });
    }
    // Industrial Wrench Head at high-right end
    const wJaw = [
      bPt(bLen - 16, 26), bPt(bLen + 14, 44), bPt(bLen + 76, 48), bPt(bLen + 94, 20),
      bPt(bLen + 44, 14), bPt(bLen + 36, 0), bPt(bLen + 44, -15), bPt(bLen + 90, -22),
      bPt(bLen + 68, -50), bPt(bLen + 10, -44), bPt(bLen - 16, -26),
    ].map(p => [p[0], p[1], 1]);
    form(wJaw, 4.8);
    stroke([bPt(bLen + 10, 34), bPt(bLen + 68, 38)], 1.8, { smooth: false });
    stroke([bPt(bLen + 8, -34), bPt(bLen + 62, -38)], 1.8, { smooth: false });
    if (!isSil) {
      const bolt = bPt(bLen + 6, 0);
      g.beginPath(); g.arc(bolt[0], bolt[1], 9, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill(); g.lineWidth = 2.6; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(bolt[0], bolt[1], 4, 0, Math.PI * 2); g.lineWidth = 1.6; g.stroke();
    }
    // Low-left antenna pommel + hanging mechanic tag!
    form([bPt(22, 16), bPt(-56, 28), bPt(-72, 12), bPt(-42, -32), bPt(34, -15)].map(p => [p[0], p[1], 1]), 4.4);
    stroke([bPt(-48, 18), bPt(18, 6)], 1.8, { smooth: false });
    form([bPt(-50, 26), bPt(-38, 26), bPt(-30, 78), bPt(-58, 76)].map(p => [p[0], p[1], 1]), 3.0);

    // =========================================================================
    // LAYER 3: ANGULAR BILLOWING WINDBREAKER BACK + CRISP FOLDED BELT SASH!
    // (Sharp cloth corners instead of soft balloon curves!)
    // =========================================================================
    form([
      [584, 520, 1], [654, 566], [718, 646, 1], [758, 728, 1],
      [702, 766, 1], [662, 742, 1], [622, 756, 1], [568, 722, 1], [562, 620]
    ], 5.6);
    // Bold dark inner lining shadow wedge inside jacket opening!
    wedge([[570, 720], [622, 752], [662, 738], [700, 762], [674, 700], [574, 678]]);
    stroke([[654, 568], [672, 654], [662, 738]], 2.4, { taper: [0.2, 0.1] });

    // Angular folded tactical lanyard tail (crisp Z-bend wind flutter, NOT a banana!)
    form([
      [612, 902, 1], [704, 922, 1], [756, 976, 1], [824, 1022, 1],
      [798, 1054, 1], [728, 1004, 1], [688, 968, 1], [606, 948, 1]
    ], 4.2);
    stroke([[628, 922], [702, 944, 1], [744, 988], [798, 1028]], 1.8, { taper: [0.1, 0.5] });

    // =========================================================================
    // LAYER 4: STREETWEAR CARGO TROUSERS (ANGULAR BREAK FOLDS + CLEAN WHITE SPACE!)
    // =========================================================================
    // Back leg R (tapered streetwear silhouette with crisp knee fold break!)
    form([
      [518, 954, 1], [620, 916, 1], [658, 1028], [692, 1184, 1], [706, 1236, 1],
      [728, 1384], [766, 1554, 1], [608, 1554, 1], [586, 1368], [552, 1184], [498, 1026, 1]
    ], 5.8);
    stroke([[514, 1046], [596, 1086], [656, 1144]], 2.4, { taper: [0.15, 0.7] });
    stroke([[698, 1228], [634, 1264], [592, 1304]], 2.4, { taper: [0.15, 0.72] });

    // Front weight-bearing leg L (crisp outer hip curve -> taut thigh -> angular knee break!)
    form([
      [388, 844, 1], [344, 916], [320, 1042], [332, 1168, 1], [318, 1226, 1],
      [338, 1378], [298, 1554, 1], [456, 1554, 1], [468, 1368], [486, 1236, 1],
      [510, 1162], [504, 1026, 1], [614, 982, 1], [626, 914, 1], [594, 842, 1]
    ], 6.0);
    // Crisp fly placket & V-tension drapery folds!
    stroke([[506, 898], [502, 1022]], 2.8, { taper: [0.1, 0.2] });
    stroke([[480, 914], [478, 994, 1], [498, 1022]], 2.0, { taper: [0.15, 0.3] });
    stroke([[498, 1026], [422, 1086], [362, 1148]], 3.2, { taper: [0.06, 0.72] });
    stroke([[492, 1002], [404, 1042], [346, 1072]], 2.2, { taper: [0.2, 0.74] });
    stroke([[322, 1224], [386, 1238], [434, 1264]], 2.4, { taper: [0.15, 0.7] });
    stroke([[484, 1236], [432, 1256], [394, 1282]], 2.0, { taper: [0.2, 0.75] });
    wedge([[498, 1026], [492, 1054], [508, 1056], [512, 1034]]);

    // Cylindrical thigh strap wrapping front leg L (curved to follow thigh volume!)
    form([
      [320, 1164, 1], [410, 1184], [506, 1162, 1],
      [500, 1198, 1], [406, 1220], [322, 1200, 1]
    ], 3.6);
    form([[350, 1160, 1], [396, 1168, 1], [392, 1212, 1], [346, 1204, 1]], 3.0);
    // Cargo pocket on back leg R (clean beveled flap + snap rivet!)
    form([[612, 1164, 1], [686, 1146, 1], [716, 1296, 1], [642, 1316, 1]], 3.4);
    form([[606, 1154, 1], [690, 1134, 1], [698, 1184, 1], [614, 1204, 1]], 3.2);
    if (!isSil) {
      g.beginPath(); g.arc(654, 1172, 5.5, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill(); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
    }

    // =========================================================================
    // LAYER 5: RAISED FAR ARM R + ANGULAR FOLDED SLEEVE R + SLENDER ANIME HAND R!
    // =========================================================================
    // Slim forearm R rising cleanly behind baton
    form([[786, 488, 1], [794, 434], [776, 384, 1], [744, 386, 1], [740, 436], [746, 486, 1]], 3.8);
    // Angular billowing cropped jacket sleeve R (sharp elbow fold corners + gravity hang!)
    form([
      [584, 484, 1], [662, 464], [746, 472, 1], [818, 496, 1],
      [838, 548, 1], [816, 594, 1], [774, 616, 1], [728, 600, 1],
      [684, 614, 1], [628, 584], [578, 566, 1]
    ], 5.8);
    // Curved cylindrical elastic cuff wrapping around forearm R!
    form([[732, 484, 1], [768, 474], [806, 478, 1], [814, 514, 1], [774, 510], [738, 520, 1]], 3.8);
    // Crisp sleeve ribbing & tension/compression folds!
    stroke([[752, 478], [758, 514]], 1.6); stroke([[778, 476], [784, 512]], 1.6);
    stroke([[742, 518], [728, 564, 1], [684, 612]], 3.0, { taper: [0.08, 0.55] });
    stroke([[778, 514], [776, 566, 1], [772, 612]], 2.6, { taper: [0.1, 0.5] });
    stroke([[644, 578], [678, 534, 1], [722, 506]], 2.6, { taper: [0.15, 0.65] });
    stroke([[606, 550], [652, 512], [704, 494]], 2.0, { taper: [0.25, 0.7] });

    // --- SLENDER, ANGULAR, BONE-STRUCTURED ANIME HAND R (NO cartoon mittens!) ---
    // Draping lazily over front of diagonal baton shaft with graceful 1-2-1 finger rhythm!
    const drawCrispHand = (palmKnots, fingerList, wOut = 3.8) => {
      // Back-to-front unified pass so outer silhouette is seamless while fingers stay crisp & angular!
      const allPolys = [mixedPath(palmKnots, 6, true), ...fingerList.map(f => mixedPath(f.knots, 5, true))];
      if (isSil) {
        for (const poly of allPolys) fillPoly(g, poly, INK, { smooth: false });
        return;
      }
      // Pass 1: Crisp dark silhouette
      g.save(); g.lineJoin = "miter"; g.miterLimit = 3; g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = wOut * 1.65;
      for (const poly of allPolys) {
        g.beginPath(); g.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
        g.closePath(); g.stroke(); fillPoly(g, poly, INK, { smooth: false });
      }
      // Pass 2: Clean white fill union (merges palm cleanly into finger bases!)
      for (const poly of allPolys) fillPoly(g, poly, PAPER, { smooth: false });
      g.restore();
      // Pass 3: Re-ink crisp slender finger overlap edges & delicate knuckle angles!
      for (const f of fingerList) {
        if (f.edge) stroke(f.edge, 2.2, { taper: [0.22, 0.15], minTip: 0.7 });
        if (f.knuckle) stroke(f.knuckle, 1.3, { taper: [0.4, 0.4] });
      }
    };

    // Raised Hand R: long slender angular fingers curling cleanly over baton!
    drawCrispHand(
      [[778, 382, 1], [744, 372, 1], [712, 392, 1], [706, 424, 1], [752, 434, 1], [774, 412, 1]],
      [
        // Pinky (kicked slightly out-right for anime grace!)
        { knots: [[754, 420, 1], [768, 426, 1], [780, 454, 1], [782, 480, 1], [772, 482, 1], [764, 458, 1], [748, 436, 1]],
          edge: [[756, 428], [766, 456, 1], [774, 480]], knuckle: [[765, 454], [776, 452]] },
        // Ring finger (long slender tapered, paired near middle!)
        { knots: [[738, 422, 1], [754, 426, 1], [758, 464, 1], [752, 498, 1], [741, 499, 1], [740, 464, 1], [732, 434, 1]],
          edge: [[740, 428], [742, 464, 1], [744, 496]], knuckle: [[742, 462], [755, 463]] },
        // Middle finger (longest finger, crisp distal bend!)
        { knots: [[720, 416, 1], [738, 420, 1], [736, 466, 1], [728, 506, 1], [717, 504, 1], [718, 464, 1], [714, 428, 1]],
          edge: [[720, 424], [720, 464, 1], [720, 502]], knuckle: [[721, 462], [734, 464]] },
        // Index finger (slender, separated with crisp negative space sliver!)
        { knots: [[706, 404, 1], [720, 412, 1], [712, 454, 1], [698, 488, 1], [689, 484, 1], [696, 448, 1], [698, 420, 1]],
          edge: [[706, 414], [700, 448, 1], [692, 484]], knuckle: [[699, 448], [710, 452]] },
      ], 3.4
    );
    // Fingerless glove back opening + wrist strap on Hand R!
    stroke([[736, 396], [774, 404]], 2.6, { taper: [0.08, 0.08] });
    stroke([[716, 424], [766, 434]], 2.0, { taper: [0.1, 0.1] });

    // =========================================================================
    // LAYER 6: SLENDER NECK, ATHLETIC TORSO & WRAPPED CROPPED TOP!
    // =========================================================================
    // Slightly fuller, natural athletic waist (less cartoon rubber-pinch!)
    form([
      [458, 398, 1], [452, 468], [386, 506], [356, 550], [412, 622],
      [420, 706], [428, 782], [398, 854, 1], [598, 858, 1], [578, 770],
      [598, 686], [626, 616], [616, 542], [598, 490, 1], [540, 464], [530, 392, 1]
    ], 4.8);
    // Sharp chin-on-neck occlusion wedge!
    wedge([[446, 400], [456, 414], [512, 398], [532, 416], [492, 448], [452, 432]]);
    // Delicate sternocleidomastoid & clavicle lines
    stroke([[462, 426], [496, 500]], 1.6, { taper: [0.45, 0.55] });
    stroke([[504, 506], [436, 512], [392, 520]], 2.1, { taper: [0.45, 0.5] });
    stroke([[522, 502], [570, 494], [598, 490]], 1.9, { taper: [0.45, 0.5] });
    // Subtle athletic oblique & navel hint
    stroke([[504, 748], [500, 782]], 1.4, { taper: [0.5, 0.5] });
    stroke([[494, 816], [498, 826]], 1.8, { taper: [0.4, 0.4] });

    // Fitted Cropped Sleeveless Athletic Top (hem wraps cylindrically around ribcage!)
    form([
      [450, 488, 1], [548, 478, 1], [564, 526], [608, 546, 1], [628, 616],
      [598, 686], [588, 728, 1], [504, 744], [416, 722, 1], [414, 626], [442, 540]
    ], 4.6);
    stroke([[448, 504], [504, 516], [554, 496]], 2.4, { taper: [0.1, 0.1] });
    // Double hem band & crisp under-bust tension wrinkles!
    stroke([[418, 708], [504, 728], [590, 714]], 1.8, { taper: [0.1, 0.1] });
    stroke([[452, 654], [526, 678], [596, 674]], 2.6, { taper: [0.4, 0.3] });
    stroke([[424, 680], [478, 694], [534, 688]], 1.8, { taper: [0.35, 0.6] });

    // =========================================================================
    // LAYER 7: ANGULAR CROPPED WINDBREAKER FRONT + STRUCTURED HIGH COLLAR!
    // =========================================================================
    form([
      [392, 496, 1], [440, 474, 1], [472, 518, 1], [450, 622], [430, 714, 1],
      [392, 724, 1], [346, 706, 1], [334, 612], [352, 534, 1]
    ], 5.4);
    // Structured angular collar flap (with folded trim line & snap stud!)
    form([[436, 474, 1], [386, 442, 1], [348, 494, 1], [394, 526, 1], [446, 502, 1]], 4.4);
    stroke([[362, 490], [394, 512, 1], [438, 494]], 1.8);
    // Right-front jacket lapel peeking behind bust!
    form([[552, 474, 1], [610, 454, 1], [646, 502, 1], [622, 562, 1], [588, 532, 1]], 4.4);
    // Front zipper track & chest pocket on left jacket panel
    stroke([[458, 520], [438, 622], [418, 710]], 2.2, { taper: [0.1, 0.1] });
    form([[364, 618, 1], [418, 624, 1], [412, 684, 1], [358, 678, 1]], 2.6);
    stroke([[362, 636], [416, 642]], 1.8, { smooth: false });

    // =========================================================================
    // LAYER 8: DIAGONAL UTILITY BELT + SCULPTED BUCKLE + HIP POUCH!
    // =========================================================================
    form([[374, 830, 1], [504, 862], [624, 876, 1], [630, 932, 1], [500, 916], [356, 886, 1]], 4.8);
    for (const [x0, y0, x1, y1] of [[422, 838, 416, 902], [576, 864, 576, 932]]) {
      form([[x0 - 11, y0, 1], [x0 + 13, y0 + 2, 1], [x1 + 13, y1, 1], [x1 - 11, y1 - 2, 1]], 3.0);
    }
    const bk = [504, 888];
    form([
      [bk[0] - 48, bk[1] - 30, 1], [bk[0] + 12, bk[1] - 24, 1], [bk[0] + 24, bk[1] - 32, 1], [bk[0] + 54, bk[1] - 18, 1],
      [bk[0] + 50, bk[1] + 34, 1], [bk[0] + 18, bk[1] + 40, 1], [bk[0] + 8, bk[1] + 28, 1], [bk[0] - 52, bk[1] + 22, 1]
    ], 3.8);
    form([[bk[0] - 30, bk[1] - 16, 1], [bk[0] + 4, bk[1] - 13, 1], [bk[0] + 2, bk[1] + 16, 1], [bk[0] - 32, bk[1] + 13, 1]], 2.4);
    form([[582, 910, 1], [648, 916, 1], [662, 1022, 1], [590, 1016, 1]], 3.6);
    form([[576, 902, 1], [652, 908, 1], [656, 954, 1], [580, 948, 1]], 3.4);

    // =========================================================================
    // LAYER 9: NEAR ARM L (ANGULAR PUSHED-UP SLEEVE + SLIM FOREARM + CRISP HAND L!)
    // =========================================================================
    form([
      [278, 704, 1], [234, 738, 1], [268, 818], [322, 878, 1], [356, 854, 1], [312, 782], [296, 732, 1]
    ], 4.4);
    // Angular pushed-up jacket sleeve L (straight outer tension + sharp fold corners above cuff!)
    form([
      [392, 502, 1], [326, 518, 1], [278, 596], [236, 654, 1], [224, 696, 1],
      [246, 734, 1], [304, 728, 1], [336, 672, 1], [358, 646, 1], [394, 598, 1]
    ], 5.6);
    // Cylindrical wrapped elastic cuff L!
    form([[234, 690, 1], [274, 704], [308, 706, 1], [298, 740, 1], [262, 736], [224, 724, 1]], 3.8);
    stroke([[266, 696], [296, 646, 1], [344, 608]], 2.8, { taper: [0.08, 0.65] });
    stroke([[298, 702], [328, 654, 1], [364, 622]], 2.2, { taper: [0.15, 0.7] });
    stroke([[322, 566], [300, 616], [278, 652]], 2.0, { taper: [0.3, 0.7] });

    // --- SLENDER, ANGULAR, GRACEFUL HIP HAND L (thumb tucked forward into belt!) ---
    drawCrispHand(
      [[320, 874, 1], [356, 852, 1], [390, 874, 1], [386, 912, 1], [348, 918, 1], [324, 898, 1]],
      [
        // Slender thumb hooking confidently over diagonal belt!
        { knots: [[364, 858, 1], [396, 868, 1], [428, 888, 1], [426, 902, 1], [394, 892, 1], [372, 882, 1]],
          edge: [[376, 876], [406, 890, 1], [426, 900]], knuckle: [[396, 872], [392, 886]] },
        // Index finger (slender angular reach down hip!)
        { knots: [[372, 896, 1], [388, 904, 1], [404, 944, 1], [406, 976, 1], [395, 978, 1], [386, 946, 1], [368, 918, 1]],
          edge: [[376, 906], [388, 944, 1], [396, 976]], knuckle: [[388, 944], [400, 942]] },
        // Middle finger (longest, tapered tip!)
        { knots: [[352, 906, 1], [372, 908, 1], [382, 952, 1], [380, 988, 1], [369, 988, 1], [364, 952, 1], [348, 922, 1]],
          edge: [[356, 914], [366, 952, 1], [372, 986]], knuckle: [[365, 950], [379, 950]] },
        // Ring + pinky tucked neatly behind!
        { knots: [[336, 904, 1], [352, 910, 1], [356, 948, 1], [350, 974, 1], [340, 972, 1], [338, 944, 1], [330, 918, 1]],
          edge: [[338, 912], [340, 946, 1], [342, 970]], knuckle: null },
      ], 3.4
    );
    stroke([[324, 882], [362, 862]], 2.6, { taper: [0.08, 0.08] });

    // =========================================================================
    // LAYER 10: FOCAL POINT — SCULPTED SHARP ANIME FACE, LOCKED GAZE & GRIN!
    // =========================================================================
    // Visible right ear + sleek hoop/cuff earring!
    form([[574, 294, 1], [606, 300], [600, 344], [570, 352, 1]], 3.4);
    stroke([[582, 308], [594, 316], [586, 336]], 1.6, { taper: [0.35, 0.45] });
    form([[584, 346, 1], [596, 344, 1], [598, 372, 1], [586, 374, 1]], 2.6); // bar ear cuff!

    // SHARP SCULPTED ANIME JAWLINE (delicate far cheek S-curve -> crisp V-chin -> clean right jaw!)
    form([
      [506, 152], [582, 186], [596, 266], [576, 336], [552, 366, 1],
      [508, 396], [456, 414, 1], [418, 386], [398, 346], [394, 320],
      [390, 286], [406, 206], [448, 162]
    ], 4.0, { lightMod: 0.44 });

    // --- MODERN GAME-ART ANIME EYES (Locked gaze directly at viewer, crisp upper lash blades!) ---
    const drawEye = (cfg) => {
      if (isSil) return;
      const { eIn, eOut, ctr, eyeW, isFar, dir } = cfg;
      const ax = unit(sub(eOut, eIn));
      const up = mul(perp(ax), dir);
      const wing = add(eOut, add(mul(ax, eyeW * 0.28), mul(up, eyeW * 0.16)));

      const uOut = bezier(
        add(eIn, add(mul(ax, -eyeW * 0.02), mul(up, eyeW * 0.04))),
        add(eIn, add(mul(ax, eyeW * 0.28), mul(up, eyeW * 0.34))),
        add(eOut, add(mul(ax, -eyeW * 0.10), mul(up, eyeW * 0.28))),
        wing, 26
      );
      const uIn = bezier(
        add(eIn, mul(up, 0)),
        add(eIn, add(mul(ax, eyeW * 0.30), mul(up, eyeW * 0.16))),
        add(eOut, add(mul(ax, -eyeW * 0.18), mul(up, eyeW * 0.12))),
        add(eOut, mul(up, -eyeW * 0.02)), 26
      );
      const lCur = bezier(
        add(eOut, mul(up, -eyeW * 0.04)),
        add(eOut, add(mul(ax, -eyeW * 0.25), mul(up, -eyeW * 0.18))),
        add(eIn, add(mul(ax, eyeW * 0.25), mul(up, -eyeW * 0.16))),
        eIn, 22
      );
      const ap = [...uIn, ...lCur];
      g.save();
      g.beginPath(); g.moveTo(ap[0][0], ap[0][1]);
      for (let i = 1; i < ap.length; i++) g.lineTo(ap[i][0], ap[i][1]);
      g.closePath(); g.fillStyle = PAPER; g.fill(); g.clip();

      const rx = eyeW * (isFar ? 0.30 : 0.29), ry = eyeW * (isFar ? 0.35 : 0.32);
      const ang = Math.atan2(ax[1], ax[0]);
      g.save(); g.translate(ctr[0], ctr[1]); g.rotate(ang);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.ellipse(0, -ry * 0.34, rx * 0.96, ry * 0.62, 0, 0, Math.PI * 2); g.fillStyle = "rgba(20,22,30,0.22)"; g.fill();
      g.beginPath(); g.ellipse(0, ry * 0.02, rx * 0.36, ry * 0.40, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      g.beginPath(); g.ellipse(0, ry * 0.06, rx * 0.66, ry * 0.64, 0, 0.25, Math.PI - 0.25); g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.ellipse(-rx * 0.34, -ry * 0.26, rx * 0.26, ry * 0.20, -0.25, 0, Math.PI * 2); g.fillStyle = PAPER; g.fill();
      g.beginPath(); g.arc(rx * 0.32, ry * 0.24, rx * 0.11, 0, Math.PI * 2); g.fill();
      g.restore(); g.restore();

      fillPoly(g, [...uOut, add(eOut, add(mul(ax, eyeW * 0.08), mul(up, -eyeW * 0.04))), ...uIn.slice().reverse()], INK, { smooth: false });
      const tb = uOut[Math.floor(uOut.length * 0.76)];
      stroke([tb, add(tb, add(mul(ax, eyeW * 0.22), mul(up, eyeW * 0.15)))], 2.1, { taper: [0.1, 0.9] });
      stroke(lCur.slice(0, Math.floor(lCur.length * 0.76)), 1.9, { smooth: false, taper: [0.2, 0.65] });
      const cr = bezier(
        add(eIn, add(mul(ax, eyeW * 0.08), mul(up, eyeW * 0.22))),
        add(eIn, add(mul(ax, eyeW * 0.35), mul(up, eyeW * 0.42))),
        add(eOut, add(mul(ax, -eyeW * 0.14), mul(up, eyeW * 0.36))),
        add(eOut, add(mul(ax, -eyeW * 0.02), mul(up, eyeW * 0.18))), 20
      );
      stroke(cr, 1.4, { smooth: false, taper: [0.45, 0.55] });
    };
    // Aligned eye height & locked iris convergence (slightly lower on skull -> cooler anime proportions!)
    drawEye({ eIn: [436, 306], eOut: [394, 300], ctr: [418, 307], eyeW: 44, isFar: true, dir: 1 });
    drawEye({ eIn: [480, 310], eOut: [544, 298], ctr: [510, 309], eyeW: 66, isFar: false, dir: -1 });

    const drawBrows = (alpha = 1) => {
      if (isSil) return;
      stroke([[436, 282], [412, 274], [392, 280]], 3.0, { taper: [0.3, 0.6], alpha });
      stroke([[482, 284], [516, 272], [552, 278]], 3.4, { taper: [0.3, 0.6], alpha });
    };
    drawBrows(1);

    // Minimal sharp anime nose & sleek confident smirk (NO banana cartoon grin!)
    stroke([[448, 336], [442, 347], [450, 350]], 2.0, { taper: [0.4, 0.65] });
    if (!isSil) fillPoly(g, [[453, 349], [458, 351], [454, 354]], INK, { smooth: false });
    // Sleek anime smirk with crisp center break & tiny fang corner!
    stroke([[432, 370], [452, 372]], 2.2, { taper: [0.25, 0.7] });
    stroke([[460, 371], [478, 367], [496, 357]], 2.5, { taper: [0.7, 0.2] });
    stroke([[452, 382], [468, 383], [480, 379]], 1.4, { taper: [0.45, 0.45] });
    // Small angled bandage on cheek
    form([[528, 338, 1], [548, 331, 1], [553, 341, 1], [533, 348, 1]], 1.7);

    // =========================================================================
    // LAYER 11: BROKEN ANGULAR WOLF-CUT HAIR SILHOUETTE + CURVED 3D GOGGLES!
    // (ZERO smooth plastic dome — every outer edge broken by overlapping locks!)
    // =========================================================================
    // Irregular sculpted crown volume with notched hair peaks
    form([
      [382, 272, 1], [386, 214], [414, 162, 1], [456, 134], [496, 138, 1],
      [538, 132], [588, 164, 1], [616, 224], [618, 286, 1], [500, 226, 1]
    ], 4.8);
    // Energetic hair tufts breaking the upper crown silhouette!
    hairLock([[498, 142, 26], [468, 96, 22], [418, 92, 12], [384, 114, 1]], 3.2, 0);
    hairLock([[548, 152, 36], [596, 146, 30], [634, 166, 14], [656, 194, 1]], 3.4, 0);
    // Choppy side locks with layered outer flips breaking the cheek/ear silhouette!
    hairLock([[424, 174, 58], [374, 242, 58], [358, 326, 42], [382, 396, 18], [408, 426, 1]], 4.0, 1);
    hairLock([[384, 246, 36], [344, 304, 30], [326, 356, 14], [312, 384, 1]], 3.2, 0); // spiky side flip L!
    hairLock([[568, 182, 66], [606, 256, 62], [606, 344, 44], [572, 408, 20], [536, 440, 1]], 4.2, 1);
    hairLock([[602, 252, 38], [638, 314, 32], [652, 368, 14], [666, 394, 1]], 3.4, 0); // spiky side flip R!
    // Layered choppy bangs parted cleanly around BOTH eyes (varied widths & lengths!)
    hairLock([[464, 162, 48], [428, 214, 46], [400, 262, 24], [384, 290, 1]], 3.4, 1);
    hairLock([[528, 166, 50], [560, 220, 48], [578, 272, 24], [564, 302, 1]], 3.4, 1);
    // Hero center bang lock sweeping cleanly between eyes
    hairLock([[492, 158, 52], [470, 218, 50], [456, 282, 26], [464, 326, 1]], 3.8, 1);
    hairLock([[512, 170, 24], [506, 226, 20], [520, 272, 10], [532, 294, 1]], 2.5, 0);
    drawBrows(0.5);

    // --- CURVED 3D-WRAPPED AVIATOR/MECHANIC GOGGLES ON FOREHEAD (like rig.png!) ---
    // Elastic head strap wrapping around both sides of crown!
    form([[390, 202, 1], [424, 174], [428, 198], [386, 226, 1]], 3.2);
    form([[572, 180, 1], [610, 206, 1], [614, 232, 1], [568, 204, 1]], 3.2);
    // Rounded-bezel curved goggle frames following forehead arc!
    // Left lens frame (foreshortened along far forehead curve!)
    form([[418, 174], [434, 150], [480, 144], [492, 162], [486, 190], [438, 196], [416, 188]], 4.0);
    form([[428, 174], [440, 158], [474, 154], [482, 166], [478, 182], [442, 188], [426, 182]], 2.4);
    // Center nose bridge hinge!
    form([[488, 158, 1], [512, 160, 1], [510, 178, 1], [486, 176, 1]], 3.0);
    // Right lens frame (larger, closer to viewer!)
    form([[508, 162], [524, 146], [576, 158], [588, 182], [574, 208], [522, 198], [504, 182]], 4.2);
    form([[518, 166], [530, 156], [568, 166], [576, 182], [566, 198], [528, 190], [514, 178]], 2.4);

    g.restore();
  }

  // ---- Render High-Res 2x -> 1x + 4-Panel Review + 300% Crops ----
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const renderHi = (mode) => {
    const hi = mk(W * 2, H * 2), hg = hi.getContext("2d");
    hg.scale(2, 2); drawKestrelR2(hg, mode);
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
    "1. Phase 1C (R2): Kestrel Sculpted",
    "2. Pure Silhouette (Readability)",
    "3. Horizontal Flip (Balance)",
    "4. Direct Lineup: visor / tape / Kestrel",
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
  const im1 = new Image(), im2 = new Image();
  await Promise.all([
    new Promise(r => { im1.onload = r; im1.src = "${visorUrl}"; }),
    new Promise(r => { im2.onload = r; im2.src = "${tapeUrl}"; }),
  ]);
  rg.drawImage(im1, x4, hdr, pw / 2, ph / 2);
  rg.drawImage(im2, x4 + pw / 2, hdr, pw / 2, ph / 2);
  rg.drawImage(fullC, x4 + pw * 0.25, hdr + ph / 2, pw / 2, ph / 2);

  // 300% Crops: Face+Goggles | Raised Hand+Wrench | Hip Hand+Belt+Folds
  const cw = 480, ch = 480;
  const cr = mk(cw * 3 + 12, ch), cg = cr.getContext("2d");
  cg.fillStyle = "#dfe3ea"; cg.fillRect(0, 0, cr.width, cr.height);
  const crop = (dx, cx, cy, box) => cg.drawImage(fullC, cx - box/2, cy - box/2, box, box, dx, 0, cw, ch);
  crop(0, 485, 285, 340);
  crop(cw + 6, 745, 435, 300);
  crop((cw + 6) * 2, 455, 905, 420);

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
  save("exp/sketch/out/phase1c-r2-full.png", res.full)
  save("exp/sketch/out/phase1c-r2-review.png", res.review)
  save("exp/sketch/out/phase1c-r2-crops.png", res.crops)
  console.log("Wrote phase1c-r2-full.png, phase1c-r2-review.png, phase1c-r2-crops.png")
}
run()
