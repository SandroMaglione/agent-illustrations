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
  if (raw.toString("latin1", 0, 8) !== "CSFCHUNK") throw new Error("not a .clip file (no CSFCHUNK header)")
  let sqlite: Buffer
  try { sqlite = parse(raw).sqlite } catch (e) { throw new Error(`this .clip could not be read, it may be truncated or still being saved (${(e as Error).message})`) }
  const dir = mkdtempSync(join(tmpdir(), "critic-clip-"))
  try {
    writeFileSync(join(dir, "db"), sqlite)
    let db: DatabaseSync
    try { db = new DatabaseSync(join(dir, "db"), { readOnly: true }); db.prepare("SELECT 1 FROM Canvas LIMIT 1").get() } catch (e) { throw new Error(`the database inside this .clip could not be opened, it may be truncated or still being saved (${(e as Error).message})`) }
    try {
      const c = db.prepare("SELECT CanvasWidth w, CanvasHeight h FROM Canvas").get() as { w: number; h: number } | undefined
      const p = db.prepare("SELECT ImageData d FROM CanvasPreview ORDER BY ImageWidth * ImageHeight DESC LIMIT 1").get() as { d: Uint8Array } | undefined
      if (!p?.d) throw new Error("this .clip has no stored preview (CanvasPreview is empty): save it once in CSP, or export a PNG")
      let img: Img
      try { img = decodeAnyPng(p.d) } catch (e) { throw new Error(`the preview stored in this .clip is not a readable PNG (${(e as Error).message})`) }
      return { img, canvas: c ? { w: Number(c.w), h: Number(c.h) } : { w: img.w, h: img.h } }
    } finally { db.close() }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
