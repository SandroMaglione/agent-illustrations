import type { P2 } from "../geo.ts"
export const curveless = (s: string): Array<P2> => s.trim().split(/\s+/).map((t) => t.split(",").map(Number) as unknown as P2)
