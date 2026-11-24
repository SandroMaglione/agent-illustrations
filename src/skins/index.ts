import { blueRough, pencil } from "./pencil.ts"
import { ballpoint, bleed, chalk, felt } from "./drawn.ts"
import { gig, lino, manga, punch, riso } from "./print.ts"
import { hologram, neon } from "./light.ts"
import type { Skin } from "./common.ts"

export const SKINS: ReadonlyArray<Skin> = [pencil, blueRough, ballpoint, felt, bleed, chalk, riso, manga, gig, punch, lino, neon, hologram]
export const skin = (id: string): Skin => SKINS.find((s) => s.id === id) ?? pencil
