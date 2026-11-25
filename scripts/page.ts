/** A browser page on the dev server, shared by the scripts. PORT picks the server. */
import { chromium } from "playwright"
import type { Browser, Page } from "playwright"

export const base = `http://localhost:${process.env.PORT ?? "5440"}/`
export const open = async (): Promise<{ b: Browser; p: Page }> => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 400, height: 400 } })
  p.setDefaultTimeout(300000)
  p.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) console.log(m.text()) })
  p.on("pageerror", (e) => console.log("page:", e.stack))
  return { b, p }
}
export const bytes = (url: string): Buffer => Buffer.from(url.split(",")[1]!, "base64")
export const dataUrl = (file: string, data: Buffer): string => `data:image/${file.endsWith("jpg") ? "jpeg" : "png"};base64,${data.toString("base64")}`
