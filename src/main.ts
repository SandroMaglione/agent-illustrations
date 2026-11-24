import { alive, blend, POSES } from "./acting.ts"
import { CAST, draw } from "./cast.ts"
import type { Acting } from "./figure.ts"
import { breakfast } from "./scene.ts"
import { render } from "./cel/engine.ts"
import { PASSES, render as renderPasses } from "./passes/engine.ts"
import type { View } from "./passes/engine.ts"
import { PASSES as SPASSES, render as renderSplash } from "./splash/engine.ts"
import { TWIN } from "./splash/twin.ts"
import { BELL } from "./splash/bell.ts"
import { TAPE } from "./splash/tape.ts"
import { ONI2 } from "./passes/oni.ts"
import { renderArt } from "./clean/engine.ts"
import type { Pass } from "./clean/engine.ts"
import { ramp } from "./clean/ramp.ts"
import { ONI } from "./clean/oni.ts"
import { renderSketch } from "./lineart/render.ts"
import { regionsView } from "./lineart/main.ts"
import { adapt } from "./cel/adapt.ts"
import { courier } from "./cel/courier.ts"
import { STEPS, STYLES } from "./cel/style.ts"
import { SKINS, skin } from "./skins/index.ts"

const q = new URLSearchParams(location.search)
const flag = window as unknown as { __ready?: boolean; __reel?: (n: number) => string; __frames?: number }
const FPS = 8

type Shot = { who: string; act: Acting; skin: string; frame: number; reveal?: number }
const paint = (ctx: CanvasRenderingContext2D, s: Shot, w: number, h: number): void => {
  const sk = skin(s.skin)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, h)
  sk.ground(ctx)
  const S = Math.min(w / 2.9, h / 2.75)
  sk.render(ctx, draw(CAST[s.who]!, s.act, { at: [w / 2, h * 0.85], S }), { frame: s.frame, reveal: s.reveal ?? 1 })
}
const mk = (w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } => {
  const c = document.createElement("canvas")
  c.width = Math.round(w)
  c.height = Math.round(h)
  return { c, g: c.getContext("2d")! }
}

/* ---------- stills for scripts/shots.ts ---------- */
const still = (v: string): void => {
  const W = innerWidth, H = innerHeight
  document.body.innerHTML = ""
  const { c, g } = mk(W, H)
  document.body.append(c)
  const cell = (who: string, pose: string, sk: string, x: number, y: number, w: number, h: number): void => {
    const t = mk(w, h)
    paint(t.g, { who, act: POSES[pose]!, skin: sk, frame: 0, reveal: Number(q.get("reveal") ?? 1) }, t.c.width, t.c.height)
    g.drawImage(t.c, Math.round(x), Math.round(y))
  }
  const who = q.get("who") ?? "kettle", pose = q.get("pose") ?? "hello", sk = q.get("skin") ?? "pencil"
  const sheet = (n: number, cols: number, f: (i: number, x: number, y: number, w: number, h: number) => void): void => {
    const rows = Math.ceil(n / cols)
    for (let i = 0; i < n; i++) f(i, ((i % cols) * W) / cols, (Math.floor(i / cols) * H) / rows, W / cols, H / rows)
  }
  const names = Object.keys(POSES), cast = Object.keys(CAST)
  if (v === "one") cell(who, pose, sk, 0, 0, W, H)
  if (v === "cast") sheet(3, 3, (i, ...r) => cell(cast[i]!, (q.get("poses") ?? `${pose},${pose},${pose}`).split(",")[i]!, sk, ...r))
  if (v === "poses") sheet(12, 4, (i, ...r) => cell(q.get("who") === "all" ? cast[i % 3]! : who, names[i]!, sk, ...r))
  if (v === "styles") sheet(12, 4, (i, ...r) => cell(q.get("who") === "all" ? cast[i % 3]! : who, pose, SKINS.filter((s) => s.id !== "rough")[i]!.id, ...r))
  if (v === "four") { const l = (q.get("skins") ?? "").split(","); sheet(l.length, 2, (i, ...r) => cell(who, pose, l[i]!, ...r)) }
  if (v === "scene") { const s = skin(sk); s.ground(g); s.render(g, breakfast(W / 1920), { frame: 0, reveal: Number(q.get("reveal") ?? 1) }) }
  if (v === "cel") {
    const k = Math.min(W / 1400, H / 1560) * Number(q.get("zoom") ?? 1)
    const t = mk(1400 * k, 1560 * k)
    render(t.g, courier(), STYLES.find((s) => s.id === (q.get("style") ?? "splash"))!, k)
    g.drawImage(t.c, -Number(q.get("x") ?? 0) * k, -Number(q.get("y") ?? 0) * k)
  }
  if (v === "celscene") { const st = STYLES.find((s) => s.id === (q.get("style") ?? "splash"))!; render(g, adapt(breakfast(1), 1920, 1080), { ...st, ground: st.id === "splash" ? "#f6f1e8" : st.ground }, W / 1920) }
  if (v === "celsteps") sheet(STEPS.length, 3, (i, x, y, w, h) => {
    const k = w / 900
    const t = mk(1400 * k, 1560 * k)
    render(t.g, courier(), STEPS[i]!, k)
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
    g.drawImage(t.c, x - 330 * k, y - 60 * k)
    g.restore()
    g.fillStyle = "#ffffff"
    g.fillRect(x, y + h - 56, w, 56)
    g.fillStyle = "#15141a"
    g.font = `600 ${Math.round(w / 26)}px "Avenir Next", sans-serif`
    g.fillText(STEPS[i]!.label, x + 18, y + h - 20)
  })
  if (v === "twin" || v === "tape" || v === "bell") {
    const art = v === "bell" ? BELL : v === "tape" ? TAPE : TWIN
    const k = Number(q.get("k") ?? 2)
    void renderSplash(art, k, Number(q.get("upto") ?? SPASSES.length - 1), (q.get("view") ?? "normal") as View).then(({ canvas, stats }) => {
      const z = Number(q.get("zoom") ?? W / art.w)
      g.imageSmoothingQuality = "high"
      g.drawImage(canvas, Number(q.get("x") ?? 0) * k, Number(q.get("y") ?? 0) * k, (W / z) * k, (H / z) * k, 0, 0, W, H)
      if (q.has("stats")) console.error(JSON.stringify(stats))
      flag.__ready = true
    })
    return
  }
  if (v === "oni2") {
    const k = Number(q.get("k") ?? 2)
    void renderPasses(ONI2, k, Number(q.get("upto") ?? PASSES.length - 1), (q.get("view") ?? "normal") as View).then(({ canvas, stats }) => {
      const z = Number(q.get("zoom") ?? W / ONI2.w)
      g.imageSmoothingQuality = "high"
      g.drawImage(canvas, Number(q.get("x") ?? 0) * k, Number(q.get("y") ?? 0) * k, (W / z) * k, (H / z) * k, 0, 0, W, H)
      if (q.has("stats")) console.error(JSON.stringify(stats))
      flag.__ready = true
    })
    return
  }
  if (v === "ramps") {
    g.fillStyle = "#f4f2ee"; g.fillRect(0, 0, W, H)
    const rows = [["Skin", "skin"], ["Hair", "hairF"], ["Jacket", "arm"], ["Hood", "hood"], ["Horns", "hornL"], ["Denim", "shorts"]] as const
    const cols = ["hi", "light", "base", "s1", "s2", "s3"] as const
    const x0 = 120, cw = (W - x0 - 20) / 6, ch = (H - 60) / rows.length
    g.font = "600 18px 'Avenir Next', sans-serif"; g.fillStyle = "#15141a"
    ;["Highlight", "Light", "Base", "Shadow 1", "Shadow 2", "Shadow 3"].forEach((t, i) => g.fillText(t, x0 + i * cw + 4, 32))
    rows.forEach(([name, id], j) => {
      const r = ramp(ONI.defs[id]!.color, ONI.defs[id]!.kind)
      g.fillStyle = "#15141a"; g.fillText(name, 20, 50 + j * ch + ch / 2 + 6)
      cols.forEach((c, i) => { g.fillStyle = `rgb(${r[c].map(Math.round).join(",")})`; g.fillRect(x0 + i * cw, 46 + j * ch, cw - 4, ch - 6) })
    })
  }
  if (v === "oni") {
    const k = Number(q.get("k") ?? 2)
    void renderArt(ONI, k, (q.get("pass") ?? "final") as Pass).then((art) => {
      const z = Number(q.get("zoom") ?? W / ONI.w)
      g.imageSmoothingQuality = "high"
      g.drawImage(art, Number(q.get("x") ?? 0) * k, Number(q.get("y") ?? 0) * k, (W / z) * k, (H / z) * k, 0, 0, W, H)
      flag.__ready = true
    }, (e) => { throw e })
    return
  }
  if (v === "sketch") {
    const k = Number(q.get("k") ?? 2)
    const t = mk(972 * k, 2000 * k)
    void renderSketch(t.g, { k, step: Number(q.get("step") ?? 9) }).then(() => {
      const z = Number(q.get("zoom") ?? W / 972)
      g.imageSmoothingQuality = "high"
      g.drawImage(t.c, Number(q.get("x") ?? 0) * k, Number(q.get("y") ?? 0) * k, (W / z) * k, (H / z) * k, 0, 0, W, H)
      flag.__ready = true
    })
    return
  }
  if (v === "regions") { void regionsView(g, W, H).then(() => { flag.__ready = true }); return }
  if (v === "celsheet") sheet(STYLES.length, 3, (i, x, y, w, h) => {
    const k = Math.min(w / 1400, h / 1560)
    const t = mk(1400 * k, 1560 * k)
    render(t.g, courier(), STYLES[i]!, k)
    g.fillStyle = STYLES[i]!.ground
    g.fillRect(x, y, w, h)
    g.drawImage(t.c, x + (w - t.c.width) / 2, y)
  })
  if (v === "reel") reel(g, W, H)
  flag.__ready = true
}

/* ---------- reel: rendered frame by frame by the script ---------- */
const reel = (g: CanvasRenderingContext2D, W: number, H: number): void => {
  const beats: Array<(n: number) => void> = []
  const hold = (frames: number, f: (i: number, n: number) => void): void => { for (let i = 0; i < frames; i++) beats.push((n) => f(i, n)) }
  const acts: ReadonlyArray<readonly [string, string, string]> = [
    ["kettle", "hello", "pencil"], ["kettle", "dunno", "pencil"], ["kettle", "furious", "pencil"], ["kettle", "laughing", "pencil"],
    ["radio", "groove", "pencil"], ["radio", "shock", "pencil"], ["cactus", "bored", "pencil"], ["cactus", "approve", "pencil"],
  ]
  hold(26, (i, n) => paint(g, { who: "kettle", act: alive(POSES["at ease"]!, 0.2), skin: "pencil", frame: n, reveal: Math.min(1, i / 23) }, W, H))
  acts.forEach(([who, pose, sk], k) => hold(9, (i, n) => {
    const prev = acts[k - 1]
    const from = prev && prev[0] === who ? POSES[prev[1]]! : POSES["at ease"]!
    const t = Math.min(1, (i + 1) / 3)
    paint(g, { who, act: alive(blend(from, POSES[pose]!, t < 1 ? t * t : 1.0), n / FPS), skin: sk, frame: n }, W, H)
  }))
  const flips = ["rough", "ballpoint", "felt", "bleed", "chalk", "riso", "manga", "gig", "punch", "lino", "neon", "hologram"]
  flips.forEach((sk, k) => hold(4, (_, n) => paint(g, { who: ["kettle", "radio", "cactus"][Math.floor(k / 4)]!, act: alive(POSES[["hello", "groove", "approve"][Math.floor(k / 4)]!]!, n / FPS), skin: sk, frame: n }, W, H)))
  const scene = (sk: string, n: number, reveal = 1): void => {
    const s = skin(sk)
    g.setTransform(1, 0, 0, 1, 0, 0)
    s.ground(g)
    s.render(g, breakfast(W / 1920, (a, i) => alive(a, n / FPS, i * 2)), { frame: n, reveal })
  }
  hold(30, (i, n) => scene("pencil", n, Math.min(1, i / 23)))
  for (const sk of ["felt", "lino", "manga", "bleed", "punch", "neon"]) hold(7, (_, n) => scene(sk, n))
  hold(8, (_, n) => scene("pencil", n))
  flag.__frames = beats.length
  flag.__reel = (n) => { beats[n]!(n); return g.canvas.toDataURL("image/png") }
}

/* ---------- the studio ---------- */
const studio = (): void => {
  const stage = document.querySelector<HTMLDivElement>("#stage")!
  const view = stage.querySelector("canvas")!
  const ctx = view.getContext("2d")!
  const bar = document.querySelector<HTMLDivElement>("#bar")!
  const panel = document.querySelector<HTMLDivElement>("#panel")!
  const st = { who: "kettle", pose: "hello", skin: "pencil", mode: "figure" as "figure" | "scene", boil: true, yaw: 0, pitch: 0, drawFrom: -1, from: POSES["at ease"]!, changed: 0 }
  let dirty = true
  const now = (): number => performance.now() / 1000
  const current = (): Acting => {
    const t = Math.min(1, (now() - st.changed) / 0.36)
    const a = blend(st.from, POSES[st.pose]!, t * t * (3 - 2 * t))
    return { ...a, stance: { ...a.stance, yaw: a.stance.yaw + st.yaw, pitch: a.stance.pitch + st.pitch } }
  }
  const groups: Array<() => void> = []
  const press = (b: HTMLElement, on: () => boolean): void => { groups.push(() => b.setAttribute("aria-pressed", String(on()))) }
  const touch = (): void => { dirty = true; groups.forEach((f) => f()) }

  const button = (label: string, on: () => void, pressed?: () => boolean): void => {
    const b = document.createElement("button")
    b.textContent = label
    b.onclick = () => { on(); touch() }
    if (pressed) press(b, pressed)
    bar.append(b)
  }
  button("Draw it on", () => { st.skin = "pencil"; st.drawFrom = now() })
  button("Line boil", () => { st.boil = !st.boil }, () => st.boil)
  button("Figure", () => { st.mode = "figure" }, () => st.mode === "figure")
  button("Whole scene", () => { st.mode = "scene" }, () => st.mode === "scene")

  const jobs: Array<() => void> = []
  const section = (title: string, list: ReadonlyArray<{ id: string; label: string; thumb: Shot }>, pick: (id: string) => void, on: (id: string) => boolean): void => {
    const h = document.createElement("h2")
    h.textContent = title
    const g = document.createElement("div")
    g.className = "grid"
    for (const it of list) {
      const b = document.createElement("button")
      b.className = "t"
      const t = mk(200, 200)
      b.append(t.c, Object.assign(document.createElement("span"), { textContent: it.label }))
      b.onclick = () => { pick(it.id); touch() }
      press(b, () => on(it.id))
      g.append(b)
      jobs.push(() => paint(t.g, it.thumb, 200, 200))
    }
    panel.append(h, g)
  }
  const hello = POSES.hello!
  section("Cast", Object.entries(CAST).map(([id, c]) => ({ id, label: c.name, thumb: { who: id, act: hello, skin: "pencil", frame: 0 } })), (id) => { st.who = id; st.mode = "figure" }, (id) => st.who === id)
  for (const gr of ["House", "Drawn", "Print", "Light"]) section(gr === "House" ? "Style" : gr, SKINS.filter((s) => s.group === gr).map((s) => ({ id: s.id, label: s.label, thumb: { who: "kettle", act: hello, skin: s.id, frame: 0 } })), (id) => { st.skin = id; st.drawFrom = -1 }, (id) => st.skin === id)
  section("Pose", Object.entries(POSES).map(([id, act]) => ({ id, label: id, thumb: { who: "kettle", act, skin: "pencil", frame: 0 } })), (id) => { st.from = current(); st.from = { ...st.from, stance: { ...st.from.stance, yaw: st.from.stance.yaw - st.yaw, pitch: st.from.stance.pitch - st.pitch } }; st.pose = id; st.changed = now(); st.mode = "figure" }, (id) => st.pose === id)

  let drag: { x: number; y: number; yaw: number; pitch: number } | null = null
  view.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; view.setPointerCapture(e.pointerId) }
  view.onpointermove = (e) => {
    if (!drag) return
    st.yaw = Math.max(-0.7, Math.min(1.1, drag.yaw + (e.clientX - drag.x) * 0.005))
    st.pitch = Math.max(-0.25, Math.min(0.5, drag.pitch + (e.clientY - drag.y) * 0.004))
    dirty = true
  }
  view.onpointerup = () => { drag = null }

  const size = (): void => {
    const r = stage.getBoundingClientRect()
    const k = Math.min(devicePixelRatio, 1500 / Math.max(r.width, 1), 1.5)
    view.width = Math.max(2, Math.round(r.width * k))
    view.height = Math.max(2, Math.round(r.height * k))
    dirty = true
  }
  new ResizeObserver(size).observe(stage)
  size()
  touch()
  let next = 0
  let held = 0
  const tick = (): void => {
    const t = now()
    if (t >= next && (dirty || st.boil || st.drawFrom >= 0 || t - st.changed < 0.5)) {
      const t0 = performance.now()
      const frame = st.boil ? held++ : held
      const reveal = st.drawFrom < 0 ? 1 : Math.min(1, (t - st.drawFrom) / 3.2)
      if (reveal >= 1) st.drawFrom = -1
      const W = view.width, H = view.height
      if (st.mode === "scene") {
        const s = skin(st.skin)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        s.ground(ctx)
        const k = Math.min(W / 1920, H / 1080)
        const b = mk(1920 * k, 1080 * k)
        s.ground(b.g)
        s.render(b.g, breakfast(k, (a, i) => (st.boil ? alive(a, t, i * 2) : a)), { frame, reveal })
        ctx.drawImage(b.c, (W - b.c.width) / 2, (H - b.c.height) / 2)
      } else paint(ctx, { who: st.who, act: st.boil ? alive(current(), t) : current(), skin: st.skin, frame, reveal }, W, H)
      dirty = false
      const cost = (performance.now() - t0) / 1000
      next = t + Math.max(drag || reveal < 1 || t - st.changed < 0.5 ? 1 / 16 : 1 / FPS, cost * 1.8)
    } else if (jobs.length && t < next - 0.02) jobs.shift()!()
    else if (jobs.length && !st.boil) jobs.shift()!()
    requestAnimationFrame(tick)
  }
  tick()
  flag.__ready = true
}

const v = q.get("v")
if (v) still(v)
else studio()
