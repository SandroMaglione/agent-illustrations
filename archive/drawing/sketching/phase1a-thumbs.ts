/**
 * Phase 1A: 4 Original Gesture, Silhouette & Composition Thumbnails for "Kestrel"
 * (rooftop signal-runner / parkour mechanic with oversized windbreaker capelet & antenna-wrench baton).
 *
 * ZERO 3D rigging, ZERO pose copying! Pure 2D figure drawing principles:
 *  - Line of Action (sweeping C/S curve)
 *  - Robo-Bean tilted ribcage & pelvis (stretch side vs pinch side!)
 *  - Visual flow arrows pulling straight into the focal point (face)
 *  - 120px pure black Silhouette + Horizontal Flip for instant readability & negative-space critique!
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { chromium } from "playwright"
import { SKETCHER_LIB } from "./sketcher.ts"

const run = async () => {
  mkdirSync("exp/sketch/out", { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage()

  const html = `<!doctype html><html><body><script>
  ${SKETCHER_LIB}

  // Draw one thumbnail in a 400x600 coordinate space:
  // mode = "gesture" (blue masses + red line of action + yellow flow + rough charcoal silhouette)
  //      | "sil"     (pure black silhouette for readability & negative-space test!)
  //      | "flip"    (horizontally flipped silhouette to spot awkward balance/lean!)
  function drawThumb(g, spec, mode) {
    const W = 400, H = 600;
    srand(spec.seed);
    g.save();
    g.fillStyle = "#fafbfc";
    g.fillRect(0, 0, W, H);

    if (mode === "flip") {
      g.translate(W, 0);
      g.scale(-1, 1);
    }

    const isSil = mode === "sil" || mode === "flip";
    const fillCol = isSil ? "#14161c" : "rgba(32, 36, 48, 0.14)";
    const strokeCol = isSil ? "#14161c" : "rgba(28, 32, 42, 0.85)";

    // 1. Silhouette / Big-Medium shapes (hair, capelet/jacket, torso, legs, arms, baton!)
    for (const s of spec.shapes) {
      fillPoly(g, s.pts, isSil ? "#14161c" : (s.tint ?? fillCol), { smooth: s.smooth !== false });
      if (!isSil) pencil(g, s.pts, { closed: true, color: strokeCol, w: s.w ?? 2.2, smooth: s.smooth !== false, passes: 2, jitter: 1.0 });
    }
    // 2. Hero prop (antenna-wrench baton — crisp straight line contrasting organic curves!)
    for (const pr of spec.props) {
      fillPoly(g, pr.pts, isSil ? "#14161c" : "rgba(35, 42, 58, 0.25)", { smooth: false });
      if (!isSil) pencil(g, pr.pts, { closed: true, smooth: false, color: "#151822", w: 2.4, passes: 1, jitter: 0.4 });
    }

    // 3. In gesture mode ONLY: show construction (Robo-Bean ribcage/pelvis, head cross, red Line of Action, yellow visual flow!)
    if (!isSil) {
      // Blue Robo-Bean masses (tilted ribcage & pelvis boxes showing contrapposto!)
      for (const box of spec.masses) {
        pencil(g, box, { closed: true, smooth: false, color: "rgba(45, 115, 230, 0.65)", w: 2.0, passes: 1, jitter: 0.6 });
      }
      // Head egg + gaze cross
      const [hx, hy, rx, ry, rot, gx, gy] = spec.head;
      g.save(); g.translate(hx, hy); g.rotate(rot);
      g.strokeStyle = "rgba(45, 115, 230, 0.78)"; g.lineWidth = 2.0;
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI*2); g.stroke();
      // Eye line & centerline
      g.beginPath(); g.moveTo(-rx*0.9, ry*0.08 + gy); g.quadraticCurveTo(gx, ry*0.18 + gy, rx*0.9, ry*0.08 + gy); g.stroke();
      g.beginPath(); g.moveTo(gx*0.3, -ry*0.95); g.quadraticCurveTo(gx, 0, gx*0.4, ry*0.98); g.stroke();
      g.restore();

      // Bold RED Line of Action (the soul of the pose!)
      pencil(g, spec.action, { color: "rgba(225, 48, 62, 0.85)", w: 4.0, passes: 1, jitter: 0.5, overshoot: 8 });

      // Focal point halo (head/eyes) + YELLOW visual flow arrows leading directly into it!
      g.save();
      g.strokeStyle = "rgba(235, 145, 20, 0.85)"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(hx, hy, rx * 1.25, 0, Math.PI * 2); g.stroke();
      g.restore();
      for (const fl of spec.flows) flowArrow(g, fl);
    }

    g.restore();
  }

  // =========================================================================
  // 4 GENUINELY DIFFERENT ORIGINAL POSES FOR "KESTREL"
  // =========================================================================
  const THUMBS = [
    {
      name: "A: Baton-on-Shoulders Swagger (3/4 stride, Z-flow)",
      seed: 101,
      head: [192, 128, 34, 42, -0.14, -10, 4],
      action: [[182, 85], [218, 205], [174, 340], [132, 545]],
      masses: [
        [[154, 184], [250, 174], [234, 266], [156, 272]], // ribcage tilted up-right
        [[154, 294], [238, 312], [232, 372], [136, 356]], // pelvis counter-tilted down-right!
      ],
      flows: [
        [[55, 210], [118, 178], [160, 148]],  // baton sweeps straight into face!
        [[335, 285], [285, 215], [230, 152]], // windbreaker & arm sweep up into face!
        [[145, 515], [168, 385], [185, 225]], // stride leg drives up S-curve!
      ],
      props: [
        // Antenna-wrench baton resting diagonally across shoulders!
        { pts: [[48, 224], [356, 124], [360, 138], [52, 238]] },
        // Chunky wrench fork at left end!
        { pts: [[26, 216], [56, 208], [62, 246], [30, 254], [36, 236], [48, 232], [46, 224], [32, 228]] },
        // Signal antenna fin at right end!
        { pts: [[346, 114], [386, 102], [374, 134], [352, 136]] },
      ],
      shapes: [
        // High sweeping ponytail flying right-up to balance baton left-down!
        { pts: [[212, 104], [272, 76], [334, 98], [368, 142], [320, 130], [288, 154], [250, 124], [220, 132]], tint: "rgba(40, 50, 72, 0.24)" },
        // Head + choppy wolf-cut silhouette
        { pts: [[160, 108], [188, 80], [228, 92], [238, 134], [218, 168], [190, 174], [158, 154], [148, 130]] },
        // Oversized cropped windbreaker billowing diagonally right!
        { pts: [[148, 184], [254, 172], [312, 214], [352, 282], [292, 294], [252, 260], [146, 274], [112, 246]] },
        // Raised right arm hooking casually over the baton!
        { pts: [[154, 188], [110, 226], [84, 228], [86, 204], [116, 198], [148, 174]] },
        // Left arm hooked high over far end of baton (big clean negative-space triangle!)
        { pts: [[246, 178], [300, 196], [316, 158], [302, 140], [284, 168], [244, 162]] },
        // Fitted torso / midriff pinch!
        { pts: [[164, 258], [234, 264], [228, 314], [158, 302]] },
        // Dynamic striding legs (front leg stepping forward-left, back leg trailing right!)
        { pts: [[146, 306], [234, 316], [262, 438], [296, 568], [252, 574], [212, 444], [184, 386], [154, 466], [118, 574], [76, 566], [114, 438], [134, 356]] },
        // Trailing belt lanyard / sash flying right with wind!
        { pts: [[232, 324], [298, 344], [344, 386], [308, 382], [266, 356], [228, 344]] },
      ],
    },
    {
      name: "B: Low-Angle Rooftop Crouch / Lean-In (Dynamic Perspective)",
      seed: 202,
      head: [216, 158, 38, 44, 0.14, -12, 6],
      action: [[214, 118], [166, 246], [222, 372], [174, 520]],
      masses: [
        [[154, 212], [252, 226], [232, 312], [140, 292]],
        [[148, 326], [246, 312], [260, 386], [154, 394]],
      ],
      flows: [
        [[84, 486], [140, 312], [192, 185]],
        [[336, 164], [288, 166], [248, 162]],
        [[286, 466], [256, 310], [228, 200]],
      ],
      props: [
        // Baton planted upright-diagonal like a polearm anchor on left!
        { pts: [[94, 128], [110, 128], [142, 548], [126, 548]] },
        { pts: [[76, 102], [124, 98], [126, 136], [78, 140], [88, 118], [110, 116]] },
      ],
      shapes: [
        // Dramatic hair flying wide right!
        { pts: [[232, 130], [312, 118], [364, 158], [338, 190], [298, 178], [260, 210], [234, 172]], tint: "rgba(40, 50, 72, 0.24)" },
        { pts: [[180, 136], [218, 110], [256, 134], [252, 184], [214, 206], [180, 182]] },
        // Cropped jacket leaning forward with flared collar & back hem!
        { pts: [[148, 214], [266, 224], [322, 286], [286, 328], [240, 304], [136, 294]] },
        // Left hand gripping planted baton firmly
        { pts: [[156, 226], [112, 244], [104, 268], [134, 272], [160, 254]] },
        // Right hand resting forward on bent knee!
        { pts: [[254, 236], [300, 302], [286, 392], [264, 386], [272, 314], [238, 266]] },
        // Asymmetric crouched legs (one knee high forward, back leg extended!)
        { pts: [[154, 330], [252, 324], [296, 412], [268, 558], [226, 556], [238, 434], [198, 398], [156, 466], [96, 554], [60, 536], [120, 424], [142, 366]] },
      ],
    },
    {
      name: "C: Over-Shoulder Glance & Wind Sweep (Upper 3/4 Portrait)",
      seed: 303,
      head: [212, 148, 44, 52, -0.18, -14, 4],
      action: [[224, 96], [176, 246], [202, 410], [236, 578]],
      masses: [
        [[134, 226], [254, 244], [238, 362], [128, 344]],
        [[146, 396], [264, 380], [274, 476], [142, 492]],
      ],
      flows: [
        [[64, 152], [126, 148], [176, 150]],
        [[338, 356], [286, 266], [244, 188]],
        [[110, 502], [158, 354], [196, 212]],
      ],
      props: [
        // Baton slung diagonally across back behind shoulder, wrench peeking past head!
        { pts: [[72, 74], [96, 68], [292, 474], [272, 484]] },
        { pts: [[48, 46], [108, 36], [116, 86], [56, 94], [68, 66], [96, 62]] },
      ],
      shapes: [
        // Big dramatic ponytail & loose bangs blowing LEFT across frame!
        { pts: [[182, 114], [112, 92], [44, 134], [82, 162], [48, 206], [114, 192], [164, 174]], tint: "rgba(40, 50, 72, 0.24)" },
        { pts: [[172, 120], [216, 92], [258, 120], [256, 176], [212, 204], [174, 178]] },
        // Off-shoulder tech windbreaker pulled back on near shoulder, billowing sleeve!
        { pts: [[124, 232], [268, 244], [326, 326], [344, 428], [276, 434], [246, 346], [124, 354], [78, 310]] },
        // Near hand tugging collar/goggles strap near chin!
        { pts: [[134, 248], [94, 322], [134, 350], [170, 270], [196, 244], [178, 224], [146, 268], [134, 304], [156, 256]] },
        // Waist & wide cargo pants
        { pts: [[138, 346], [254, 356], [296, 588], [114, 588]] },
      ],
    },
    {
      name: "D: Mid-Air Parkour Vault / Diagonal Launch (Full Action S-Curve)",
      seed: 404,
      head: [248, 128, 32, 38, 0.18, -10, 6],
      action: [[254, 94], [218, 212], [158, 336], [92, 514]],
      masses: [
        [[198, 178], [278, 200], [244, 280], [166, 254]],
        [[154, 286], [234, 308], [210, 366], [132, 344]],
      ],
      flows: [
        [[72, 290], [156, 208], [220, 148]],
        [[354, 236], [308, 176], [276, 144]],
        [[92, 502], [156, 356], [224, 186]],
      ],
      props: [
        // Baton held trailing diagonally behind left hand (extends the diagonal thrust!)
        { pts: [[38, 338], [320, 214], [326, 228], [44, 352]] },
        { pts: [[20, 330], [52, 318], [60, 356], [26, 366]] },
      ],
      shapes: [
        // Hair streaming sharply behind motion!
        { pts: [[268, 108], [336, 98], [374, 142], [330, 152], [358, 186], [300, 172], [268, 148]], tint: "rgba(40, 50, 72, 0.24)" },
        { pts: [[220, 108], [252, 88], [282, 110], [278, 154], [244, 168], [218, 146]] },
        // Windbreaker wings flying back!
        { pts: [[182, 186], [284, 202], [344, 266], [296, 294], [244, 268], [160, 256]] },
        // Forward reaching hand (foreshortened toward viewer-left!)
        { pts: [[204, 192], [134, 224], [98, 264], [116, 282], [154, 246], [202, 222]] },
        // Trailing arm holding baton back-right
        { pts: [[274, 208], [324, 242], [342, 218], [320, 200], [284, 192]] },
        // Asymmetric airborne legs (one tucked sharply up, one extended diagonally back-left!)
        { pts: [[148, 300], [234, 314], [288, 384], [248, 466], [216, 456], [240, 390], [184, 370], [138, 454], [82, 546], [52, 528], [108, 424], [132, 344]] },
      ],
    },
  ];

  // Build composite contact sheet: 4 columns x 3 rows (Gesture+Flow | 120px Silhouette scaled | Flipped Silhouette)
  const PW = 400, PH = 600, GAP = 10, HDR = 36;
  const CW = THUMBS.length * PW + (THUMBS.length - 1) * GAP;
  const CH = HDR + PH + 260 + 260 + GAP * 2;
  const c = document.createElement("canvas");
  c.width = CW; c.height = CH;
  const g = c.getContext("2d");
  g.fillStyle = "#dde1e8"; g.fillRect(0, 0, CW, CH);

  for (let i = 0; i < THUMBS.length; i++) {
    const t = THUMBS[i];
    const x = i * (PW + GAP);
    g.fillStyle = "#181a22"; g.fillRect(x, 0, PW, HDR);
    g.fillStyle = "#ffffff"; g.font = "600 13px -apple-system, sans-serif"; g.textAlign = "center";
    g.fillText(t.name, x + PW / 2, 23);

    // Row 1: Full Gesture + Masses + Visual Flow
    const c1 = document.createElement("canvas"); c1.width = PW; c1.height = PH;
    drawThumb(c1.getContext("2d"), t, "gesture");
    g.drawImage(c1, x, HDR);

    // Row 2: Pure Black Silhouette (rendered at thumbnail scale to test instant read!)
    const c2 = document.createElement("canvas"); c2.width = PW; c2.height = PH;
    drawThumb(c2.getContext("2d"), t, "sil");
    g.fillStyle = "#ffffff"; g.fillRect(x, HDR + PH + GAP, PW, 260);
    g.drawImage(c2, x + (PW - 170)/2, HDR + PH + GAP + 4, 170, 252);
    g.fillStyle = "#666"; g.font = "500 11px -apple-system, sans-serif"; g.textAlign = "left";
    g.fillText("Silhouette (thumbnail read)", x + 10, HDR + PH + GAP + 18);

    // Row 3: Horizontally Flipped Silhouette (balance & lean check!)
    const c3 = document.createElement("canvas"); c3.width = PW; c3.height = PH;
    drawThumb(c3.getContext("2d"), t, "flip");
    g.fillStyle = "#ffffff"; g.fillRect(x, HDR + PH + 260 + GAP * 2, PW, 260);
    g.drawImage(c3, x + (PW - 170)/2, HDR + PH + 260 + GAP * 2 + 4, 170, 252);
    g.fillStyle = "#666"; g.fillText("Flipped silhouette (balance)", x + 10, HDR + PH + 260 + GAP * 2 + 18);
  }
  window.__out = c.toDataURL("image/png");
  </script></body></html>`

  await p.setContent(html)
  const url = await p.evaluate(() => (window as unknown as { __out: string }).__out)
  await b.close()
  writeFileSync("exp/sketch/out/phase1a-thumbs.png", Buffer.from(url.split(",")[1]!, "base64"))
  console.log("Wrote exp/sketch/out/phase1a-thumbs.png")
}
run()
