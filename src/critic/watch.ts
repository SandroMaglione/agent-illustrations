/**
 * Watch a folder and review every picture when it is saved or exported. CSP writes a `.clip` in several steps and exports
 * can take a moment, so a file is reviewed only once its size and modification time have stopped changing; the same
 * content is never reviewed twice in a row, and reviews run one at a time.
 */
import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, statSync, watch, type FSWatcher } from "node:fs"
import { join, resolve, sep } from "node:path"
import { isSupported } from "./image.ts"

export type WatchOptions = { settleMs?: number; pollMs?: number; ignore?: Array<string>; initial?: boolean; onError?: (file: string, e: Error) => void }

export const watchFolder = (dir: string, run: (file: string) => Promise<void>, o: WatchOptions = {}): { close: () => void; idle: () => Promise<void> } => {
  const root = resolve(dir), settle = o.settleMs ?? 700, ignore = (o.ignore ?? []).map((p) => resolve(p))
  const last = new Map<string, string>(), timers = new Map<string, NodeJS.Timeout>(), queue: Array<string> = []
  let busy: Promise<void> = Promise.resolve(), pending = 0
  const skip = (f: string): boolean => !isSupported(f) || ignore.some((p) => f === p || f.startsWith(p + sep)) || /(^|[\\/])\.|~$|\.tmp$/i.test(f.slice(root.length))
  const stamp = (f: string): string | null => { try { const s = statSync(f); return s.isFile() ? `${s.size}:${s.mtimeMs}` : null } catch { return null } }
  const hash = (f: string): string => createHash("sha1").update(readFileSync(f)).digest("hex")
  const enqueue = (f: string): void => {
    if (queue.includes(f)) return
    queue.push(f); pending++
    busy = busy.then(async () => {
      queue.splice(queue.indexOf(f), 1)
      try {
        if (!existsSync(f)) return
        const h = hash(f)
        if (last.get(f) === h) return
        last.set(f, h)
        await run(f)
      } catch (e) { o.onError?.(f, e as Error) } finally { pending-- }
    })
  }
  // wait until the file stops changing, then queue it
  const touch = (f: string): void => {
    if (skip(f)) return
    clearTimeout(timers.get(f))
    const before = stamp(f)
    timers.set(f, setTimeout(() => { timers.delete(f); const now = stamp(f); if (!now) return; if (now !== before) touch(f); else enqueue(f) }, settle))
  }
  const watchers: Array<FSWatcher> = []
  try { watchers.push(watch(root, { recursive: true }, (_e, name) => { if (name) touch(join(root, name.toString())) })) }
  catch { watchers.push(watch(root, (_e, name) => { if (name) touch(join(root, name.toString())) })) }
  // a slow poll as well: some file systems (network drives, some sync folders) drop change events
  const seen = new Map<string, string>()
  const walk = (d: string, out: Array<string>): Array<string> => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) { if (!e.name.startsWith(".") && !ignore.some((i) => p === i || p.startsWith(i + sep))) walk(p, out) } else out.push(p) } return out }
  for (const f of walk(root, [])) { const s = stamp(f); if (s) seen.set(f, s); if (o.initial && !skip(f)) enqueue(f) }
  const poll = setInterval(() => { for (const f of walk(root, [])) { const s = stamp(f); if (s && seen.get(f) !== s) { seen.set(f, s); touch(f) } } }, o.pollMs ?? 2000)
  return {
    close: () => { for (const w of watchers) w.close(); clearInterval(poll); for (const t of timers.values()) clearTimeout(t) },
    idle: async () => { while (pending || timers.size) { await busy; await new Promise((r) => setTimeout(r, 50)) } },
  }
}
