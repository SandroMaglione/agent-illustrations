/** One light per drawing. Everything that has to know where the light is asks here. */
import type { P2 } from "../geo.ts"

/** `fall`: where shadows fall in the picture (right and down positive). `up`: 0 the light lies in the picture plane, 1 it stands straight in front. */
export type Light = { fall: P2; up: number }
export const UPPER_LEFT: Light = { fall: [0.5, 0.866], up: 0.62 }
export const aim = (l: Light): { x: number; y: number; flat: number; z: number } => { const n = Math.hypot(...l.fall), z = l.up, flat = Math.sqrt(1 - z * z); return { x: l.fall[0] / n, y: l.fall[1] / n, flat, z } }
/** Where a round thing turns into shade, -1 to 1 across it: the light comes from the -1 side with strength `side`. */
export const terminator = (side: number, z: number, t: number): number => {
  if (side <= 0.05) return 1
  for (let u = -1; u <= 1; u += 0.01) if (-side * u + z * Math.sqrt(1 - u * u) < t && u > -0.98) return u
  return 1
}
