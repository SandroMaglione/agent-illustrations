import { tone } from "../../src/splash/tones.ts"
const hx = (c: readonly number[]): string => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
const s = (c: readonly number[]): string => ((Math.max(...c) - Math.min(...c)) / Math.max(...c)).toFixed(2)
for (const [n, h, k] of [["ref-c blue", "#637ba8", "cloth"], ["opus coat", "#7d5a64", "cloth"], ["opus gold", "#cfae6f", "metal"], ["opus braid", "#cbb58a", "cloth"], ["neon coat", "#43495c", "cloth"], ["neon wine", "#8e4a5b", "cloth"], ["neon lining", "#783c4e", "cloth"]] as const) { const t = tone(h, k); console.log(n.padEnd(12), "base", h, s(t.base), "s1", hx(t.s1), s(t.s1), "s2", hx(t.s2), s(t.s2), "s3", hx(t.s3), s(t.s3)) }
console.log("ref-c measured: #637ba8 0.41, #3b4a69 0.44, #27354e 0.50")
