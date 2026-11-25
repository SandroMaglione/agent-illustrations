import type { Art } from "./engine.ts"

const files = import.meta.glob("./*.ts")
/** A drawing is any file here that exports an object with `defs` and `shapes`: src/splash/<name>.ts. */
export const artOf = async (name: string): Promise<Art | null> => {
  const load = files[`./${name}.ts`]
  if (!load) return null
  const found = Object.values((await load()) as Record<string, unknown>).find((v) => typeof v === "object" && v !== null && "defs" in v && "shapes" in v)
  return (found as Art | undefined) ?? null
}
