/**
 * The display list. A figure never draws anything: it only says "here is a
 * shape", "here is a plane in shade", "here is a line and what it is for".
 * Skins decide what that looks like. This split is the whole trick.
 */
import type { P2 } from "./geo.ts"

export type Mat = "body" | "body2" | "accent" | "glove" | "limb" | "white" | "dark" | "eye" | "mouth" | "tongue" | "cheek" | "none"
export type Role = "outline" | "inner" | "detail" | "fine"

export type Item =
  /** Opaque area. Painter's order gives overlap for free. `shade` is the plane's darkness. */
  | { k: "shape"; id: string; poly: ReadonlyArray<P2>; mat: Mat; shade?: number; clip?: ReadonlyArray<P2>; pal?: Palette }
  /** An area in shade, to hatch, dot or wash. */
  | { k: "tone"; id: string; poly: ReadonlyArray<P2>; clip: ReadonlyArray<P2>; level: number; angle: number; mat: Mat; pal?: Palette }
  /** A drawn line. `side` says which way is outside (0 = no outside), so lines can be heavier in shade. */
  | { k: "line"; id: string; pts: ReadonlyArray<P2>; role: Role; closed?: boolean; side?: -1 | 0 | 1; clip?: ReadonlyArray<P2>; w?: number; dashed?: boolean }
  /** Under-drawing: axes, boxes, joints. */
  | { k: "guide"; id: string; pts: ReadonlyArray<P2> }

export type Drawing = {
  readonly items: ReadonlyArray<Item>
  /** Soft contact shadows on the ground. */
  readonly shadows: ReadonlyArray<{ c: P2; rx: number; ry: number; a: number }>
  /** Pixels per world unit: the size every brush is measured in. */
  readonly S: number
  readonly palette: Palette
}
export type Palette = Readonly<Record<Mat, string>>
