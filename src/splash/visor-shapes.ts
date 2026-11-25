import type { Level, Shape } from "./engine.ts"

/** Folds: the line art leaves the large cloth open, so these are cut by hand. Two or three runs, pointed ends. */
const sh = (lv: Level, on: string, a: number, ...d: ReadonlyArray<string>): Array<Shape> => d.map((x) => ({ lv, on: on.split(" "), d: x, a }))
export const SHAPES: ReadonlyArray<Shape> = [
]
