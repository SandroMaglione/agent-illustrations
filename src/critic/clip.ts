/**
 * The preview CLIP STUDIO PAINT stores in every `.clip`, read without touching the file.
 *
 * A `.clip` is a chunk container (`CSFCHUNK`) with a SQLite database inside (`CHNKSQLi`); the table `CanvasPreview` holds a
 * PNG of the flattened canvas as CSP last saved it, and `Canvas` its size. The caller hands us the bytes (read with flag
 * "r"); the database bytes are copied to a private temp directory, opened read-only, and the copy is removed. The original
 * file is never opened for writing, locked, or renamed, so it is safe to run on a file CSP has open.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { parse } from "../layers/clip.ts"
import { decodeAnyPng, type Img } from "./image.ts"

export const readClipPreview = (raw: Buffer): { img: Img; canvas: { w: number; h: number } } => {
  const sqlite = parse(raw).sqlite
  const dir = mkdtempSync(join(tmpdir(), "critic-clip-"))
  try {
    writeFileSync(join(dir, "db"), sqlite)
    const db = new DatabaseSync(join(dir, "db"), { readOnly: true })
    try {
      const c = db.prepare("SELECT CanvasWidth w, CanvasHeight h FROM Canvas").get() as { w: number; h: number } | undefined
      const p = db.prepare("SELECT ImageData d FROM CanvasPreview ORDER BY ImageWidth * ImageHeight DESC LIMIT 1").get() as { d: Uint8Array } | undefined
      if (!p?.d) throw new Error("this .clip has no stored preview (CanvasPreview is empty): save it once in CSP, or export a PNG")
      const img = decodeAnyPng(p.d)
      return { img, canvas: c ? { w: Number(c.w), h: Number(c.h) } : { w: img.w, h: img.h } }
    } finally { db.close() }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
