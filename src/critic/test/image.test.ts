import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync, statSync } from "node:fs"
import { test } from "node:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { decodeAnyPng, decodeJpeg, encodeJpeg, fit, flipH, loadSource, resize, toPng } from "../image.ts"
import { figure, makeClip, px, writePng } from "./util.ts"

test("PNG: 8-bit grey", () => {
  const img = decodeAnyPng(writePng(3, 2, 0, 8, (x, y) => [x * 100 + y]))
  assert.deepEqual(px(img, 2, 1), [201, 201, 201, 255])
})

test("PNG: 1-bit grey scales to 0/255", () => {
  const img = decodeAnyPng(writePng(10, 1, 0, 1, (x) => [x % 2]))
  assert.deepEqual(px(img, 0, 0), [0, 0, 0, 255])
  assert.deepEqual(px(img, 9, 0), [255, 255, 255, 255])
})

test("PNG: palette with transparency", () => {
  const img = decodeAnyPng(writePng(4, 1, 3, 2, (x) => [x], { palette: [[255, 0, 0], [0, 255, 0], [0, 0, 255], [9, 9, 9]], trns: [0, 128] }))
  assert.deepEqual(px(img, 0, 0), [255, 0, 0, 0])
  assert.deepEqual(px(img, 1, 0), [0, 255, 0, 128])
  assert.deepEqual(px(img, 3, 0), [9, 9, 9, 255])
})

test("PNG: 16-bit RGB keeps the high byte", () => {
  const img = decodeAnyPng(writePng(2, 1, 2, 16, () => [0xabcd, 0x1234, 0xff00]))
  assert.deepEqual(px(img, 1, 0), [0xab, 0x12, 0xff, 255])
})

test("PNG: grey + alpha", () => {
  const img = decodeAnyPng(writePng(1, 1, 4, 8, () => [77, 33]))
  assert.deepEqual(px(img, 0, 0), [77, 77, 77, 33])
})

test("PNG: Adam7 interlaced RGBA decodes to the same pixels as non-interlaced", () => {
  const f = (x: number, y: number): Array<number> => [(x * 31) & 255, (y * 17) & 255, (x * y) & 255, 200 + ((x + y) % 50)]
  const a = decodeAnyPng(writePng(13, 11, 6, 8, f)), b = decodeAnyPng(writePng(13, 11, 6, 8, f, { interlace: true }))
  assert.deepEqual(Array.from(b.rgba), Array.from(a.rgba))
})

test("JPEG round trip stays close", () => {
  const src = figure({ w: 64, h: 64 }), back = decodeJpeg(encodeJpeg(src, 95))
  assert.equal(back.w, 64)
  const [r, g, b] = px(back, 32, 32)
  assert.ok(Math.abs(r! - 90) < 12 && Math.abs(g! - 120) < 12 && Math.abs(b! - 200) < 12)
})

test("resize area-averages, flip mirrors, fit keeps the aspect", () => {
  const img = figure({ w: 200, h: 100 }), small = resize(img, 20, 10)
  assert.equal(small.w, 20)
  assert.deepEqual(px(flipH(img), 0, 50), px(img, 199, 50))
  const f = fit(img, 50)
  assert.deepEqual([f.img.w, f.img.h, f.scale], [50, 25, 0.25])
})

test(".clip: the preview is read and the file is left byte-for-byte untouched", () => {
  const path = "examples/layers/rig.clip", before = createHash("sha256").update(readFileSync(path)).digest("hex"), st = statSync(path)
  const src = loadSource(path)
  assert.equal(src.kind, "clip")
  assert.deepEqual([src.img.w, src.img.h], [1086, 1448])
  assert.deepEqual(src.canvas, { w: 1086, h: 1448 })
  assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), before)
  const after = statSync(path)
  assert.equal(after.mtimeMs, st.mtimeMs)
  assert.equal(after.size, st.size)
})

test(".clip: a file that is not a .clip is refused", () => {
  assert.throws(() => loadSource("examples/layers/stack.json"), /unsupported/)
})

test(".clip: a synthetic file is read, with a canvas larger than its preview noted", () => {
  const dir = mkdtempSync(join(tmpdir(), "critic-clip-")), path = join(dir, "small.clip")
  writeFileSync(path, makeClip({ w: 600, h: 840 }, toPng(figure({ w: 300, h: 420 }))))
  const src = loadSource(path)
  assert.deepEqual([src.img.w, src.img.h, src.canvas.w, src.canvas.h], [300, 420, 600, 840])
  assert.ok(src.notes.some((n) => /smaller than the canvas/.test(n)))
})

test(".clip errors: no preview, not a .clip, truncated, a corrupt preview: each a clear error, the file untouched", () => {
  const dir = mkdtempSync(join(tmpdir(), "critic-clip-")), file = (name: string, b: Buffer): string => { const p = join(dir, name); writeFileSync(p, b); return p }
  const hashOf = (p: string): string => createHash("sha256").update(readFileSync(p)).digest("hex")
  const cases: Array<[string, Buffer, RegExp]> = [
    ["empty.clip", makeClip({ w: 10, h: 10 }, null), /no stored preview/],
    ["fake.clip", Buffer.from("this is not a clip studio file at all"), /not a \.clip file/],
    ["cut.clip", makeClip({ w: 10, h: 10 }, toPng(figure({ w: 10, h: 10 }))).subarray(0, 200), /could not be (read|opened).*truncated/],
    ["badpng.clip", makeClip({ w: 10, h: 10 }, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(40)])), /preview stored in this \.clip is not a readable PNG/],
  ]
  for (const [name, bytes, re] of cases) {
    const p = file(name, bytes), before = hashOf(p)
    assert.throws(() => loadSource(p), re, name)
    assert.equal(hashOf(p), before, `${name} must not be modified`)
  }
})
